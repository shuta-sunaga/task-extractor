import { NextResponse } from 'next/server'
import { updateTaskStatus, updateTaskMemo, deleteTask, getTaskById } from '@/lib/db'
import { sendTaskNotification } from '@/lib/email'
import { requireAuth, checkTaskPermission, type SessionUser } from '@/lib/session'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // 認証チェック
    const authResult = await requireAuth()
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    const { id } = await params
    const body = await request.json()
    const taskId = Number(id)

    // タスク情報を取得
    const task = await getTaskById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 企業IDチェック（自社タスクのみ操作可能）
    if (user.companyId !== null && task.company_id !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ロール権限チェック
    const permission = await checkTaskPermission(user as SessionUser, task.room_id, task.source)

    // ステータス更新（権限チェック必要）
    if (body.status !== undefined) {
      if (!permission.canEditStatus) {
        return NextResponse.json({ error: 'Forbidden: No edit permission' }, { status: 403 })
      }
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
    }

    // メモ更新（閲覧権限があれば可能）
    if (body.memo !== undefined) {
      if (!permission.canView) {
        return NextResponse.json({ error: 'Forbidden: No view permission' }, { status: 403 })
      }
      await updateTaskMemo(taskId, body.memo || null)
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
    // 認証チェック
    const authResult = await requireAuth()
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    const { id } = await params
    const taskId = Number(id)

    // タスク情報を取得
    const task = await getTaskById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 企業IDチェック（自社タスクのみ操作可能）
    if (user.companyId !== null && task.company_id !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ロール権限チェック
    const permission = await checkTaskPermission(user as SessionUser, task.room_id, task.source)
    if (!permission.canDelete) {
      return NextResponse.json({ error: 'Forbidden: No delete permission' }, { status: 403 })
    }

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
