import { NextRequest, NextResponse } from 'next/server'
import { getRoles, createRole, getRolePermissions, getUserRoles, addUserRole, removeUserRole } from '@/lib/db'
import { requireAdmin, isSystemAdmin } from '@/lib/session'

// ロール一覧取得
export async function GET(request: NextRequest) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user } = result

  try {
    // システム管理者でない場合は自社のロールのみ
    if (!isSystemAdmin(user) && !user.companyId) {
      return NextResponse.json([])
    }

    const companyId = user.companyId
    if (!companyId && !isSystemAdmin(user)) {
      return NextResponse.json([])
    }

    // クエリパラメータでcompanyIdを取得（システム管理者用）
    const searchParams = request.nextUrl.searchParams
    const targetCompanyId = isSystemAdmin(user)
      ? parseInt(searchParams.get('companyId') || '') || companyId
      : companyId

    if (!targetCompanyId) {
      return NextResponse.json([])
    }

    const roles = await getRoles(targetCompanyId)

    // 各ロールに権限情報を追加
    const rolesWithPermissions = await Promise.all(
      roles.map(async role => {
        const permissions = await getRolePermissions(role.id)
        return { ...role, permissions }
      })
    )

    return NextResponse.json(rolesWithPermissions)
  } catch (error) {
    console.error('Failed to get roles:', error)
    return NextResponse.json({ error: 'Failed to get roles' }, { status: 500 })
  }
}

// ロール作成
export async function POST(request: NextRequest) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user } = result

  try {
    const body = await request.json()
    const { name, description, companyId } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // システム管理者でない場合は自社にのみ作成可能
    const targetCompanyId = isSystemAdmin(user) ? companyId : user.companyId
    if (!targetCompanyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const role = await createRole(targetCompanyId, name, description)
    return NextResponse.json(role)
  } catch (error) {
    console.error('Failed to create role:', error)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}

// ユーザーへのロール割り当て
export async function PATCH(request: NextRequest) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  try {
    const body = await request.json()
    const { userId, roleId, action } = body

    if (!userId || !roleId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action === 'add') {
      await addUserRole(userId, roleId)
    } else if (action === 'remove') {
      await removeUserRole(userId, roleId)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // 更新後のユーザーロールを取得
    const userRoles = await getUserRoles(userId)
    return NextResponse.json({ userRoles })
  } catch (error) {
    console.error('Failed to update user role:', error)
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }
}
