import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteCompletedTasks } from '@/lib/db'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 企業管理者のみ実行可能
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    if (!session.user.companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 })
    }

    const deletedCount = await deleteCompletedTasks(session.user.companyId)

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount}件の完了タスクを削除しました`,
    })
  } catch (error) {
    console.error('Delete completed tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to delete completed tasks' },
      { status: 500 }
    )
  }
}
