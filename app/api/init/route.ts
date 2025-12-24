import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { initDatabase, createInitialSystemAdmin, getUserByEmail, getCompanyBySlug } from '@/lib/db'
import { hashPassword } from '@/lib/password'

// 既存データを指定企業に紐づけるマイグレーション
async function migrateDataToCompany(companyId: number) {
  // settings を紐づけ
  await sql`
    UPDATE settings SET company_id = ${companyId}
    WHERE company_id IS NULL
  `

  // rooms を紐づけ
  await sql`
    UPDATE rooms SET company_id = ${companyId}
    WHERE company_id IS NULL
  `

  // tasks を紐づけ
  await sql`
    UPDATE tasks SET company_id = ${companyId}
    WHERE company_id IS NULL
  `

  // slack_workspaces を紐づけ
  await sql`
    UPDATE slack_workspaces SET company_id = ${companyId}
    WHERE company_id IS NULL
  `
}

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

    // 既存データを株式会社Sei San Seiに紐づけ
    let dataMigrated = false
    const seiSanSei = await getCompanyBySlug('sei-san-sei')
    if (seiSanSei) {
      await migrateDataToCompany(seiSanSei.id)
      dataMigrated = true
    }

    return NextResponse.json({
      message: 'Database initialized successfully',
      adminCreated,
      dataMigrated,
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
