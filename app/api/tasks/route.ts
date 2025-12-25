import { NextResponse } from 'next/server'
import { getTasks, createTask, type Source } from '@/lib/db'
import { requireAuth, filterTasksByPermission, type SessionUser } from '@/lib/session'

type TaskRow = {
  id: number
  room_id: string
  message_id: string
  content: string
  original_message: string
  sender_name: string
  status: string
  priority: string
  source: Source
  company_id: number | null
  created_at: string
  updated_at: string
}

export async function GET() {
  try {
    const result = await requireAuth()
    if ('error' in result) {
      return result.error
    }
    const { user } = result

    // 企業ユーザーは自社のタスクのみ取得
    const companyId = user.companyId
    const allTasks = await getTasks(companyId ?? undefined) as TaskRow[]

    // ロール権限に基づいてフィルタリング
    const tasks = await filterTasksByPermission(user as SessionUser, allTasks)

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // 認証チェック（管理者のみタスク作成可能）
    const result = await requireAuth()
    if ('error' in result) {
      return result.error
    }
    const { user } = result

    // 管理者権限が必要（一般ユーザーはWebhook経由でのみタスク作成）
    if (user.userType === 'user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const task = await createTask({
      roomId: body.roomId,
      messageId: body.messageId,
      content: body.content,
      originalMessage: body.originalMessage,
      senderName: body.senderName,
      priority: body.priority || 'medium',
      companyId: user.companyId ?? undefined,
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
