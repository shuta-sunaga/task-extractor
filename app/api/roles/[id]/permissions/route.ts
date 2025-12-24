import { NextRequest, NextResponse } from 'next/server'
import { getRoleById, getRolePermissions, addRolePermission, deleteRolePermission, deleteRolePermissionsByRole, Source } from '@/lib/db'
import { requireAdmin, isSystemAdmin } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

// ロール権限取得
export async function GET(request: NextRequest, { params }: Params) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user } = result
  const { id } = await params

  try {
    const role = await getRoleById(parseInt(id))
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // 権限チェック
    if (!isSystemAdmin(user) && role.company_id !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const permissions = await getRolePermissions(parseInt(id))
    return NextResponse.json(permissions)
  } catch (error) {
    console.error('Failed to get role permissions:', error)
    return NextResponse.json({ error: 'Failed to get role permissions' }, { status: 500 })
  }
}

// ロール権限追加
export async function POST(request: NextRequest, { params }: Params) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user } = result
  const { id } = await params

  try {
    const role = await getRoleById(parseInt(id))
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // 権限チェック
    if (!isSystemAdmin(user) && role.company_id !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { roomId, source, canView, canEditStatus, canDelete } = body

    const permission = await addRolePermission({
      roleId: parseInt(id),
      roomId: roomId || null,
      source: (source || null) as Source | null,
      canView: canView ?? true,
      canEditStatus: canEditStatus ?? true,
      canDelete: canDelete ?? false,
    })

    return NextResponse.json(permission)
  } catch (error) {
    console.error('Failed to add role permission:', error)
    return NextResponse.json({ error: 'Failed to add role permission' }, { status: 500 })
  }
}

// ロール権限一括更新
export async function PUT(request: NextRequest, { params }: Params) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user } = result
  const { id } = await params

  try {
    const role = await getRoleById(parseInt(id))
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // 権限チェック
    if (!isSystemAdmin(user) && role.company_id !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { permissions } = body

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 })
    }

    // 既存権限を削除
    await deleteRolePermissionsByRole(parseInt(id))

    // 新しい権限を追加
    const newPermissions = await Promise.all(
      permissions.map(perm =>
        addRolePermission({
          roleId: parseInt(id),
          roomId: perm.roomId || null,
          source: (perm.source || null) as Source | null,
          canView: perm.canView ?? true,
          canEditStatus: perm.canEditStatus ?? true,
          canDelete: perm.canDelete ?? false,
        })
      )
    )

    return NextResponse.json(newPermissions)
  } catch (error) {
    console.error('Failed to update role permissions:', error)
    return NextResponse.json({ error: 'Failed to update role permissions' }, { status: 500 })
  }
}

// ロール権限削除
export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user } = result
  const { id } = await params

  try {
    const role = await getRoleById(parseInt(id))
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // 権限チェック
    if (!isSystemAdmin(user) && role.company_id !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const permissionId = searchParams.get('permissionId')

    if (!permissionId) {
      return NextResponse.json({ error: 'Permission ID is required' }, { status: 400 })
    }

    await deleteRolePermission(parseInt(permissionId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete role permission:', error)
    return NextResponse.json({ error: 'Failed to delete role permission' }, { status: 500 })
  }
}
