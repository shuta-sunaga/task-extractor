import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getUserRolePermissions, type RolePermission, type Source } from '@/lib/db'

export type SessionUser = {
  id: string
  email: string
  name: string
  companyId: number | null
  userType: 'system_admin' | 'admin' | 'user'
}

export type TaskPermission = {
  canView: boolean
  canEditStatus: boolean
  canDelete: boolean
}

/**
 * サーバーサイドでセッションを取得
 */
export async function getSession() {
  return await getServerSession(authOptions)
}

/**
 * 認証済みセッションを取得（未認証の場合はnull）
 */
export async function getAuthenticatedSession(): Promise<SessionUser | null> {
  const session = await getSession()
  if (!session?.user) {
    return null
  }
  return session.user as SessionUser
}

/**
 * 認証が必要なAPIで使用するヘルパー
 * 未認証の場合は401レスポンスを返す
 */
export async function requireAuth(): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await getAuthenticatedSession()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { user }
}

/**
 * 管理者権限が必要なAPIで使用するヘルパー
 * 未認証または権限不足の場合はエラーレスポンスを返す
 */
export async function requireAdmin(): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const result = await requireAuth()
  if ('error' in result) {
    return result
  }

  const { user } = result
  if (user.userType !== 'system_admin' && user.userType !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user }
}

/**
 * システム管理者権限が必要なAPIで使用するヘルパー
 */
export async function requireSystemAdmin(): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const result = await requireAuth()
  if ('error' in result) {
    return result
  }

  const { user } = result
  if (user.userType !== 'system_admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user }
}

/**
 * ユーザーがシステム管理者かどうか
 */
export function isSystemAdmin(user: SessionUser): boolean {
  return user.userType === 'system_admin'
}

/**
 * ユーザーが管理者（システム管理者含む）かどうか
 */
export function isAdmin(user: SessionUser): boolean {
  return user.userType === 'system_admin' || user.userType === 'admin'
}

/**
 * ユーザーのロール権限を取得
 * 管理者・システム管理者はすべての権限を持つ
 */
export async function getUserPermissions(user: SessionUser): Promise<RolePermission[]> {
  // 管理者・システム管理者は全権限を持つ
  if (isAdmin(user)) {
    return []
  }

  // 一般ユーザーはロールに基づく権限を取得
  const userId = parseInt(user.id)
  return await getUserRolePermissions(userId)
}

/**
 * 特定のタスクに対するユーザーの権限をチェック
 * @param user セッションユーザー
 * @param roomId タスクのルームID
 * @param source タスクのソース（chatwork, teams, lark, slack）
 * @returns 権限オブジェクト
 */
export async function checkTaskPermission(
  user: SessionUser,
  roomId: string,
  source: Source
): Promise<TaskPermission> {
  // 管理者・システム管理者は全権限を持つ
  if (isAdmin(user)) {
    return {
      canView: true,
      canEditStatus: true,
      canDelete: true,
    }
  }

  // 一般ユーザーはロール権限をチェック
  const permissions = await getUserPermissions(user)

  // 権限がない場合はすべて拒否
  if (permissions.length === 0) {
    return {
      canView: false,
      canEditStatus: false,
      canDelete: false,
    }
  }

  // 該当するルーム・ソースの権限を探す
  // 権限のマッチング優先順位:
  // 1. room_id と source の両方が一致
  // 2. room_id が一致し source が null（全ソース）
  // 3. room_id が null（全ルーム）で source が一致
  // 4. room_id と source の両方が null（全権限）

  let bestMatch: RolePermission | null = null
  let matchScore = 0

  for (const perm of permissions) {
    let score = 0

    // room_id のマッチング
    if (perm.room_id === roomId) {
      score += 2
    } else if (perm.room_id === null) {
      score += 1
    } else {
      continue // room_id が異なる場合はスキップ
    }

    // source のマッチング
    if (perm.source === source) {
      score += 2
    } else if (perm.source === null) {
      score += 1
    } else {
      continue // source が異なる場合はスキップ
    }

    // より高いスコアの権限を採用
    if (score > matchScore) {
      matchScore = score
      bestMatch = perm
    }
  }

  if (!bestMatch) {
    return {
      canView: false,
      canEditStatus: false,
      canDelete: false,
    }
  }

  return {
    canView: bestMatch.can_view,
    canEditStatus: bestMatch.can_edit_status,
    canDelete: bestMatch.can_delete,
  }
}

/**
 * ユーザーが閲覧可能なタスクをフィルタリング
 * @param user セッションユーザー
 * @param tasks タスク一覧
 * @returns 閲覧可能なタスク一覧
 */
export async function filterTasksByPermission<T extends { room_id: string; source: Source }>(
  user: SessionUser,
  tasks: T[]
): Promise<T[]> {
  // 管理者・システム管理者は全タスクを閲覧可能
  if (isAdmin(user)) {
    return tasks
  }

  // 一般ユーザーはロール権限に基づいてフィルタリング
  const permissions = await getUserPermissions(user)

  // 権限がない場合は空配列
  if (permissions.length === 0) {
    return []
  }

  // タスクごとに権限をチェック
  const filteredTasks: T[] = []
  for (const task of tasks) {
    const canView = checkPermissionSync(permissions, task.room_id, task.source, 'can_view')
    if (canView) {
      filteredTasks.push(task)
    }
  }

  return filteredTasks
}

/**
 * 権限を同期的にチェック（すでに取得済みの権限リストを使用）
 */
function checkPermissionSync(
  permissions: RolePermission[],
  roomId: string,
  source: Source,
  permissionType: 'can_view' | 'can_edit_status' | 'can_delete'
): boolean {
  for (const perm of permissions) {
    // room_id のマッチング
    const roomMatches = perm.room_id === null || perm.room_id === roomId
    // source のマッチング
    const sourceMatches = perm.source === null || perm.source === source

    if (roomMatches && sourceMatches && perm[permissionType]) {
      return true
    }
  }
  return false
}
