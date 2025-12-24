import { NextResponse } from 'next/server'
import { initDatabase, createInitialSystemAdmin, getUserByEmail } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export async function GET() {
  try {
    // DBスキーマの初期化
    await initDatabase()

    // 初期システム管理者の作成（環境変数が設定されている場合）
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD

    let adminCreated = false
    if (adminEmail && adminPassword) {
      const existingAdmin = await getUserByEmail(adminEmail)
      if (!existingAdmin) {
        const passwordHash = await hashPassword(adminPassword)
        await createInitialSystemAdmin(adminEmail, passwordHash, 'System Admin')
        adminCreated = true
      }
    }

    return NextResponse.json({
      message: 'Database initialized successfully',
      adminCreated,
      note: adminCreated
        ? `初期管理者を作成しました: ${adminEmail}`
        : '既存のデータベース構造を確認しました',
    })
  } catch (error) {
    console.error('Database init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    )
  }
}
