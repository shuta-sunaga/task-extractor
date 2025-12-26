import { NextResponse } from 'next/server'
import { getCompanyByWebhookToken, getSettings, getActiveRoomsBySource, createTask, getTaskByMessageId } from '@/lib/db'
import { verifyTeamsSignature, parseTeamsPayload, type TeamsWebhookPayload } from '@/lib/teams'
import { analyzeMessage } from '@/lib/extractor'
import { sendTaskNotification } from '@/lib/email'

// シンプルな応答（Botの返信として表示される）
function simpleResponse(text: string = '✅') {
  return NextResponse.json({ type: 'message', text })
}

// 何も返さない（タスク対象外の場合）
function emptyResponse() {
  return new NextResponse(null, { status: 200 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const rawBody = await request.text()
    const authHeader = request.headers.get('Authorization') || ''

    console.log('[Teams Webhook] Received request for token:', token.substring(0, 8) + '...')

    // トークンから企業を特定
    const company = await getCompanyByWebhookToken(token)
    if (!company) {
      console.error('[Teams Webhook] Invalid webhook token')
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 404 })
    }

    const companyId = company.id
    console.log('[Teams Webhook] Company identified:', company.name, 'ID:', companyId)

    // 企業の設定を取得
    const settings = await getSettings(companyId)
    if (!settings?.teams_webhook_secret) {
      console.error('[Teams Webhook] Secret not configured for company:', companyId)
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
      return emptyResponse()
    }

    // 正規化されたメッセージを取得
    const message = parseTeamsPayload(payload)
    console.log('[Teams Webhook] Sender:', message.senderName, 'Text:', message.text)

    // 企業のアクティブなTeamsチャネルを確認
    const activeRooms = await getActiveRoomsBySource('teams', companyId)
    console.log('[Teams Webhook] Active channels:', activeRooms.map(r => r.room_id))

    const isActiveRoom = activeRooms.some(
      room => room.room_id === message.conversationId
    )

    if (!isActiveRoom) {
      console.log('[Teams Webhook] Channel not monitored')
      return emptyResponse()
    }

    // タスク分析
    console.log('[Teams Webhook] Analyzing message:', message.text)
    const analysis = analyzeMessage(message.text)
    console.log('[Teams Webhook] Analysis:', JSON.stringify(analysis))

    if (!analysis.isTask) {
      console.log('[Teams Webhook] Not a task')
      return emptyResponse()
    }

    // 重複チェック
    const existingTask = await getTaskByMessageId(message.activityId, 'teams')
    if (existingTask) {
      console.log('[Teams Webhook] Duplicate message, skipping:', message.activityId)
      return emptyResponse()
    }

    // タスク作成
    console.log('[Teams Webhook] Creating task for company:', companyId)
    const task = await createTask({
      roomId: message.conversationId,
      messageId: message.activityId,
      content: analysis.taskContent,
      originalMessage: payload.text,
      senderName: message.senderName,
      priority: analysis.priority,
      source: 'teams',
      companyId,
      serviceUrl: message.serviceUrl,
    })

    console.log('[Teams Webhook] Task created:', task.id)

    // 作成通知を送信（非同期）
    sendTaskNotification({
      id: task.id,
      content: task.content,
      sender_name: task.sender_name,
      source: 'teams',
      priority: task.priority,
    }, 'create').catch(err => {
      console.error('[Email] Failed to send create notification:', err)
    })

    // レスポンス（5秒以内に返す必要がある）
    return simpleResponse('タスクの登録が完了しました。\nhttps://task-extractor-ten.vercel.app/')
  } catch (error) {
    console.error('[Teams Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
