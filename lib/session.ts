import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export type SessionUser = {
  id: string
  email: string
  name: string
  companyId: number | null
  userType: 'system_admin' | 'admin' | 'user'
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
