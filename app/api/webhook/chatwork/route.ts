import { NextResponse } from 'next/server'
import { getSettings, getActiveRooms, createTask } from '@/lib/db'
import { verifyWebhookSignature, createChatworkClient, type WebhookPayload } from '@/lib/chatwork'
import { analyzeMessage } from '@/lib/gemini'

export async function POST(request: Request) {
  try {
    // リクエストボディを取得
    const rawBody = await request.text()
    const signature = request.headers.get('X-ChatWorkWebhookSignature') || ''

    // 設定を取得
    const settings = await getSettings()
    if (!settings?.webhook_token) {
      console.error('Webhook token not configured')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 400 }
      )
    }

    // 署名検証
    if (!verifyWebhookSignature(rawBody, signature, settings.webhook_token)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // ペイロードをパース
    const payload: WebhookPayload = JSON.parse(rawBody)

    // メッセージイベント以外は無視
    if (payload.webhook_event_type !== 'message_created') {
      return NextResponse.json({ success: true })
    }

    const event = payload.webhook_event

    // 監視対象のルームかチェック
    const activeRooms = await getActiveRooms()
    const isActiveRoom = activeRooms.some(
      room => room.room_id === String(event.room_id)
    )

    if (!isActiveRoom) {
      return NextResponse.json({ success: true, message: 'Room not monitored' })
    }

    // Chatwork APIでメッセージ詳細を取得（送信者名を取得するため）
    let senderName = `User ${event.account_id}`
    if (settings.chatwork_api_token) {
      try {
        const client = createChatworkClient(settings.chatwork_api_token)
        const message = await client.getMessage(
          String(event.room_id),
          event.message_id
        )
        senderName = message.account?.name || senderName
      } catch (e) {
        console.error('Failed to get message details:', e)
      }
    }

    // Gemini APIでメッセージを分析
    const analysis = await analyzeMessage(event.body)

    // タスクでない場合は終了
    if (!analysis.isTask) {
      return NextResponse.json({
        success: true,
        message: 'Message is not a task',
      })
    }

    // タスクとして保存
    const task = await createTask({
      roomId: String(event.room_id),
      messageId: event.message_id,
      content: analysis.taskContent,
      originalMessage: event.body,
      senderName,
      priority: analysis.priority,
    })

    console.log('Task created:', task.id)

    return NextResponse.json({
      success: true,
      taskId: task.id,
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
