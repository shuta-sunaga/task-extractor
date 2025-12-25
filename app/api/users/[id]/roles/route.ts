import { NextRequest, NextResponse } from 'next/server'
import { getUserRoles, getUserById } from '@/lib/db'
import { requireAdmin, isSystemAdmin } from '@/lib/session'

type RouteParams = {
  params: Promise<{ id: string }>
}

// ユーザーのロール一覧を取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user } = result
  const { id } = await params
  const userId = parseInt(id)

  try {
    // 対象ユーザーを取得
    const targetUser = await getUserById(userId)
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // システム管理者でない場合、自社のユーザーのみ
    if (!isSystemAdmin(user) && targetUser.company_id !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const roles = await getUserRoles(userId)
    return NextResponse.json({ roles })
  } catch (error) {
    console.error('Failed to get user roles:', error)
    return NextResponse.json({ error: 'Failed to get user roles' }, { status: 500 })
  }
}
