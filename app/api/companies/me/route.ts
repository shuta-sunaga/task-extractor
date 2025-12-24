import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompanyById } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Not authenticated or no company' }, { status: 401 })
    }

    const company = await getCompanyById(session.user.companyId)

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: company.id,
      name: company.name,
      slug: company.slug,
      webhook_token: company.webhook_token,
    })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json({ error: 'Failed to get company' }, { status: 500 })
  }
}
