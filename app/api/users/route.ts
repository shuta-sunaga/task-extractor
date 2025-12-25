import { NextRequest, NextResponse } from 'next/server'
import { getUsers, createUser, UserType, getCompanies, getAllUserRolesMap } from '@/lib/db'
import { hashPassword, validatePasswordStrength } from '@/lib/password'
import { requireAdmin, isSystemAdmin } from '@/lib/session'

// ユーザー一覧取得
export async function GET() {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user } = result

  try {
    // システム管理者は全ユーザー、管理者は自社ユーザーのみ
    const companyId = isSystemAdmin(user) ? undefined : user.companyId ?? undefined
    const [users, companies, userRolesMap] = await Promise.all([
      getUsers(companyId),
      getCompanies(),
      getAllUserRolesMap(companyId),
    ])

    // 企業一覧をマッピング用に使用
    const companyMap = new Map(companies.map(c => [c.id, c.name]))

    // パスワードハッシュを除外、企業名とロールを追加
    const safeUsers = users.map(u => ({
      id: u.id,
      company_id: u.company_id,
      company_name: u.company_id ? companyMap.get(u.company_id) || null : null,
      email: u.email,
      name: u.name,
      user_type: u.user_type,
      is_active: u.is_active,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      roles: userRolesMap[u.id] || [],
    }))

    return NextResponse.json(safeUsers)
  } catch (error) {
    console.error('Failed to get users:', error)
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
  }
}

// ユーザー作成
export async function POST(request: NextRequest) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { user: currentUser } = result

  try {
    const body = await request.json()
    const { email, password, name, userType, companyId } = body

    // バリデーション
    if (!email || !password || !name || !userType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // パスワード強度チェック
    const passwordCheck = validatePasswordStrength(password)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.message }, { status: 400 })
    }

    // 権限チェック
    // システム管理者のみがシステム管理者を作成可能
    if (userType === 'system_admin' && !isSystemAdmin(currentUser)) {
      return NextResponse.json({ error: 'Cannot create system admin' }, { status: 403 })
    }

    // 管理者は自社にのみユーザーを作成可能
    const targetCompanyId = isSystemAdmin(currentUser) ? companyId : currentUser.companyId

    const passwordHash = await hashPassword(password)
    const newUser = await createUser({
      companyId: targetCompanyId,
      email,
      passwordHash,
      name,
      userType: userType as UserType,
    })

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      user_type: newUser.user_type,
      company_id: newUser.company_id,
      is_active: newUser.is_active,
      created_at: newUser.created_at,
    })
  } catch (error) {
    console.error('Failed to create user:', error)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
