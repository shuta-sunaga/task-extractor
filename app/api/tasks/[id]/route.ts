import { NextResponse } from 'next/server'
import { updateTaskStatus, deleteTask, getTaskById } from '@/lib/db'
import { sendTaskNotification } from '@/lib/email'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const taskId = Number(id)

    // タスク情報を取得（通知用）
    const task = await getTaskById(taskId)

    await updateTaskStatus(taskId, body.status)

    // 完了時のみ通知
    if (body.status === 'completed' && task) {
      sendTaskNotification({
        id: task.id,
        content: task.content,
        sender_name: task.sender_name,
        source: task.source,
        priority: task.priority,
        status: 'completed',
      }, 'complete').catch(err => {
        console.error('[Email] Failed to send complete notification:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const taskId = Number(id)

    // タスク情報を取得（通知用）
    const task = await getTaskById(taskId)

    await deleteTask(taskId)

    // 削除通知を送信
    if (task) {
      sendTaskNotification({
        id: task.id,
        content: task.content,
        sender_name: task.sender_name,
        source: task.source,
        priority: task.priority,
      }, 'delete').catch(err => {
        console.error('[Email] Failed to send delete notification:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
