import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { initDatabase, createInitialSystemAdmin, getUserByEmail, getCompanyBySlug } from '@/lib/db'
import { hashPassword } from '@/lib/password'

// 既存企業にwebhook_tokenがない場合に生成
async function generateWebhookTokensForExistingCompanies(): Promise<number> {
  // webhook_tokenがNULLの企業を取得
  const result = await sql`
    SELECT id FROM companies WHERE webhook_token IS NULL
  `

  let count = 0
  for (const row of result.rows) {
    const token = crypto.randomUUID()
    await sql`
      UPDATE companies SET webhook_token = ${token} WHERE id = ${row.id}
    `
    count++
  }

  return count
}

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

    // 既存企業にwebhook_tokenを付与
    const webhookTokensGenerated = await generateWebhookTokensForExistingCompanies()

    return NextResponse.json({
      message: 'Database initialized successfully',
      adminCreated,
      dataMigrated,
      webhookTokensGenerated,
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
