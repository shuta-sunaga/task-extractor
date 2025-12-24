import { NextRequest, NextResponse } from 'next/server'
import { getCompanies, createCompany, getUsers } from '@/lib/db'
import { requireSystemAdmin } from '@/lib/session'

// 企業一覧取得
export async function GET() {
  const result = await requireSystemAdmin()
  if ('error' in result) return result.error

  try {
    const companies = await getCompanies()

    // 各企業のユーザー数を追加
    const companiesWithStats = await Promise.all(
      companies.map(async company => {
        const users = await getUsers(company.id)
        return {
          ...company,
          user_count: users.length,
        }
      })
    )

    return NextResponse.json(companiesWithStats)
  } catch (error) {
    console.error('Failed to get companies:', error)
    return NextResponse.json({ error: 'Failed to get companies' }, { status: 500 })
  }
}

// 企業作成
export async function POST(request: NextRequest) {
  const result = await requireSystemAdmin()
  if ('error' in result) return result.error

  try {
    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // slugのバリデーション（英小文字、数字、ハイフンのみ）
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slugは英小文字、数字、ハイフンのみ使用できます' },
        { status: 400 }
      )
    }

    const company = await createCompany(name, slug)
    return NextResponse.json(company)
  } catch (error) {
    console.error('Failed to create company:', error)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'このSlugは既に使用されています' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
