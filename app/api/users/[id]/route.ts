import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser, deleteUser, UserType } from '@/lib/db'
import { hashPassword, validatePasswordStrength } from '@/lib/password'
import { requireAdmin, isSystemAdmin } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

// ユーザー取得
export async function GET(request: NextRequest, { params }: Params) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user: currentUser } = result
  const { id } = await params

  try {
    const user = await getUserById(parseInt(id))
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 権限チェック：自社ユーザーのみ参照可能（システム管理者は全て）
    if (!isSystemAdmin(currentUser) && user.company_id !== currentUser.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      id: user.id,
      company_id: user.company_id,
      email: user.email,
      name: user.name,
      user_type: user.user_type,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    })
  } catch (error) {
    console.error('Failed to get user:', error)
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 })
  }
}

// ユーザー更新
export async function PATCH(request: NextRequest, { params }: Params) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user: currentUser } = result
  const { id } = await params

  try {
    const user = await getUserById(parseInt(id))
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 権限チェック：自社ユーザーのみ更新可能（システム管理者は全て）
    if (!isSystemAdmin(currentUser) && user.company_id !== currentUser.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // システム管理者の変更は本人またはシステム管理者のみ
    if (user.user_type === 'system_admin' && !isSystemAdmin(currentUser)) {
      return NextResponse.json({ error: 'Cannot modify system admin' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, name, userType, isActive, companyId } = body

    // パスワードが指定された場合は強度チェック
    let passwordHash: string | undefined
    if (password) {
      const passwordCheck = validatePasswordStrength(password)
      if (!passwordCheck.valid) {
        return NextResponse.json({ error: passwordCheck.message }, { status: 400 })
      }
      passwordHash = await hashPassword(password)
    }

    // システム管理者への昇格はシステム管理者のみ
    if (userType === 'system_admin' && !isSystemAdmin(currentUser)) {
      return NextResponse.json({ error: 'Cannot promote to system admin' }, { status: 403 })
    }

    // 企業変更はシステム管理者のみ
    const newCompanyId = isSystemAdmin(currentUser) && companyId !== undefined
      ? (companyId === null || companyId === '' ? null : companyId)
      : undefined

    const updatedUser = await updateUser(parseInt(id), {
      email,
      passwordHash,
      name,
      userType: userType as UserType | undefined,
      isActive,
      companyId: newCompanyId,
    })

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({
      id: updatedUser.id,
      company_id: updatedUser.company_id,
      email: updatedUser.email,
      name: updatedUser.name,
      user_type: updatedUser.user_type,
      is_active: updatedUser.is_active,
      created_at: updatedUser.created_at,
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// ユーザー削除
export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user: currentUser } = result
  const { id } = await params

  try {
    const user = await getUserById(parseInt(id))
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 自分自身は削除不可
    if (user.id === parseInt(currentUser.id)) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    // 権限チェック：自社ユーザーのみ削除可能（システム管理者は全て）
    if (!isSystemAdmin(currentUser) && user.company_id !== currentUser.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // システム管理者の削除はシステム管理者のみ
    if (user.user_type === 'system_admin' && !isSystemAdmin(currentUser)) {
      return NextResponse.json({ error: 'Cannot delete system admin' }, { status: 403 })
    }

    await deleteUser(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
