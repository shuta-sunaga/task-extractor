import { NextRequest, NextResponse } from 'next/server'
import { getRoleById, updateRole, deleteRole, getRolePermissions } from '@/lib/db'
import { requireAdmin, isSystemAdmin } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

// ロール取得
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

    const permissions = await getRolePermissions(role.id)
    return NextResponse.json({ ...role, permissions })
  } catch (error) {
    console.error('Failed to get role:', error)
    return NextResponse.json({ error: 'Failed to get role' }, { status: 500 })
  }
}

// ロール更新
export async function PATCH(request: NextRequest, { params }: Params) {
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
    const { name, description } = body

    const updatedRole = await updateRole(parseInt(id), { name, description })
    if (!updatedRole) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    const permissions = await getRolePermissions(updatedRole.id)
    return NextResponse.json({ ...updatedRole, permissions })
  } catch (error) {
    console.error('Failed to update role:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

// ロール削除
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

    await deleteRole(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete role:', error)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
