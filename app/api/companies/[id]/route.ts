import { NextRequest, NextResponse } from 'next/server'
import { getCompanyById, updateCompany, deleteCompany, getUsers } from '@/lib/db'
import { requireSystemAdmin } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

// 企業取得
export async function GET(request: NextRequest, { params }: Params) {
  const result = await requireSystemAdmin()
  if ('error' in result) return result.error

  const { id } = await params

  try {
    const company = await getCompanyById(parseInt(id))
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const users = await getUsers(company.id)
    return NextResponse.json({
      ...company,
      user_count: users.length,
    })
  } catch (error) {
    console.error('Failed to get company:', error)
    return NextResponse.json({ error: 'Failed to get company' }, { status: 500 })
  }
}

// 企業更新
export async function PATCH(request: NextRequest, { params }: Params) {
  const result = await requireSystemAdmin()
  if ('error' in result) return result.error

  const { id } = await params

  try {
    const company = await getCompanyById(parseInt(id))
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, slug, is_active } = body

    // slugのバリデーション
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slugは英小文字、数字、ハイフンのみ使用できます' },
        { status: 400 }
      )
    }

    const updatedCompany = await updateCompany(parseInt(id), { name, slug, is_active })
    if (!updatedCompany) {
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }

    return NextResponse.json(updatedCompany)
  } catch (error) {
    console.error('Failed to update company:', error)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'このSlugは既に使用されています' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

// 企業削除
export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requireSystemAdmin()
  if ('error' in result) return result.error

  const { id } = await params

  try {
    const company = await getCompanyById(parseInt(id))
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // 企業に所属するユーザーがいる場合は警告
    const users = await getUsers(parseInt(id))
    if (users.length > 0) {
      return NextResponse.json(
        { error: `この企業には${users.length}人のユーザーが所属しています。先にユーザーを削除してください。` },
        { status: 400 }
      )
    }

    await deleteCompany(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete company:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
