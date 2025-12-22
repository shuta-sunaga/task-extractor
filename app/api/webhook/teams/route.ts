import { NextResponse } from 'next/server'
import { getSettings, getActiveRoomsBySource, createTask } from '@/lib/db'
import { verifyTeamsSignature, parseTeamsPayload, createEmptyResponse, type TeamsWebhookPayload } from '@/lib/teams'
import { analyzeMessage } from '@/lib/extractor'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const authHeader = request.headers.get('Authorization') || ''

    console.log('[Teams Webhook] Received request')

    // 設定取得
    const settings = await getSettings()
    if (!settings?.teams_webhook_secret) {
      console.error('[Teams Webhook] Secret not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
    }

    // 署名検証
    if (!verifyTeamsSignature(rawBody, authHeader, settings.teams_webhook_secret)) {
      console.error('[Teams Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // ペイロード解析
    const payload: TeamsWebhookPayload = JSON.parse(rawBody)
    console.log('[Teams Webhook] Type:', payload.type, 'Conversation:', payload.conversation?.id)

    // メッセージタイプの確認
    if (payload.type !== 'message') {
      console.log('[Teams Webhook] Not a message, skip')
      return NextResponse.json(createEmptyResponse())
    }

    // 正規化されたメッセージを取得
    const message = parseTeamsPayload(payload)
    console.log('[Teams Webhook] Sender:', message.senderName, 'Text:', message.text)

    // アクティブなTeamsチャネルを確認
    const activeRooms = await getActiveRoomsBySource('teams')
    console.log('[Teams Webhook] Active channels:', activeRooms.map(r => r.room_id))

    const isActiveRoom = activeRooms.some(
      room => room.room_id === message.conversationId
    )

    if (!isActiveRoom) {
      console.log('[Teams Webhook] Channel not monitored')
      return NextResponse.json(createEmptyResponse())
    }

    // タスク分析
    console.log('[Teams Webhook] Analyzing message:', message.text)
    const analysis = analyzeMessage(message.text)
    console.log('[Teams Webhook] Analysis:', JSON.stringify(analysis))

    if (!analysis.isTask) {
      console.log('[Teams Webhook] Not a task')
      return NextResponse.json(createEmptyResponse())
    }

    // タスク作成
    console.log('[Teams Webhook] Creating task...')
    const task = await createTask({
      roomId: message.conversationId,
      messageId: message.activityId,
      content: analysis.taskContent,
      originalMessage: payload.text,
      senderName: message.senderName,
      priority: analysis.priority,
      source: 'teams',
    })

    console.log('[Teams Webhook] Task created:', task.id)

    // レスポンス（5秒以内に返す必要がある）
    return NextResponse.json(createEmptyResponse())
  } catch (error) {
    console.error('[Teams Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
