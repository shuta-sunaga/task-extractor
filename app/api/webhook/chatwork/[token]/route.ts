import { NextResponse } from 'next/server'
import { getCompanyByWebhookToken, getSettings, getActiveRooms, createTask } from '@/lib/db'
import { verifyWebhookSignature, createChatworkClient, type WebhookPayload } from '@/lib/chatwork'
import { analyzeMessage } from '@/lib/extractor'
import { sendTaskNotification } from '@/lib/email'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const rawBody = await request.text()
    const signature = request.headers.get('X-ChatWorkWebhookSignature') || ''

    console.log('[Chatwork Webhook] Received request for token:', token.substring(0, 8) + '...')

    // トークンから企業を特定
    const company = await getCompanyByWebhookToken(token)
    if (!company) {
      console.error('[Chatwork Webhook] Invalid webhook token')
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 404 })
    }

    const companyId = company.id
    console.log('[Chatwork Webhook] Company identified:', company.name, 'ID:', companyId)

    // 企業の設定を取得
    const settings = await getSettings(companyId)
    if (!settings?.webhook_token) {
      console.error('[Chatwork Webhook] Webhook secret not configured for company:', companyId)
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
    }

    // 署名検証
    if (!verifyWebhookSignature(rawBody, signature, settings.webhook_token)) {
      console.error('[Chatwork Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload: WebhookPayload = JSON.parse(rawBody)
    console.log('[Chatwork Webhook] Event:', payload.webhook_event_type, 'Room:', payload.webhook_event?.room_id)

    if (payload.webhook_event_type !== 'message_created') {
      console.log('[Chatwork Webhook] Not message_created, skip')
      return NextResponse.json({ success: true })
    }

    const event = payload.webhook_event

    // 企業のアクティブルームを取得
    const activeRooms = await getActiveRooms(companyId)
    console.log('[Chatwork Webhook] Active rooms:', activeRooms.map(r => r.room_id))

    const isActiveRoom = activeRooms.some(
      room => room.room_id === String(event.room_id)
    )

    if (!isActiveRoom) {
      console.log('[Chatwork Webhook] Room not monitored')
      return NextResponse.json({ success: true, message: 'Room not monitored' })
    }

    let senderName = `User ${event.account_id}`
    if (settings.chatwork_api_token) {
      try {
        const client = createChatworkClient(settings.chatwork_api_token)
        const message = await client.getMessage(String(event.room_id), event.message_id)
        senderName = message.account?.name || senderName
      } catch (e) {
        console.error('[Chatwork Webhook] Failed to get sender:', e)
      }
    }

    console.log('[Chatwork Webhook] Message:', event.body)
    const analysis = analyzeMessage(event.body)
    console.log('[Chatwork Webhook] Analysis:', JSON.stringify(analysis))

    if (!analysis.isTask) {
      console.log('[Chatwork Webhook] Not a task')
      return NextResponse.json({ success: true, message: 'Message is not a task' })
    }

    console.log('[Chatwork Webhook] Creating task for company:', companyId)
    const task = await createTask({
      roomId: String(event.room_id),
      messageId: event.message_id,
      content: analysis.taskContent,
      originalMessage: event.body,
      senderName,
      priority: analysis.priority,
      companyId,
    })

    console.log('[Chatwork Webhook] Task created:', task.id)

    // 作成通知を送信（非同期）
    sendTaskNotification({
      id: task.id,
      content: task.content,
      sender_name: task.sender_name,
      source: 'chatwork',
      priority: task.priority,
    }, 'create').catch(err => {
      console.error('[Email] Failed to send create notification:', err)
    })

    return NextResponse.json({ success: true, taskId: task.id })
  } catch (error) {
    console.error('[Chatwork Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
