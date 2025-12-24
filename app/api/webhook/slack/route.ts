import { NextResponse } from 'next/server'
import { getActiveSlackWorkspaces, getActiveRoomsByWorkspace, createTask, getTaskByMessageId } from '@/lib/db'
import {
  isUrlVerification,
  createChallengeResponse,
  verifySlackSignature,
  isMessageEvent,
  parseSlackMessage,
  type SlackEventPayload,
} from '@/lib/slack'
import { analyzeMessage } from '@/lib/extractor'
import { sendTaskNotification } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const timestamp = request.headers.get('X-Slack-Request-Timestamp') || ''
    const signature = request.headers.get('X-Slack-Signature') || ''

    console.log('[Slack Webhook] Received request')

    const payload: SlackEventPayload = JSON.parse(rawBody)

    // URL検証チャレンジへの応答（最優先）
    if (isUrlVerification(payload)) {
      console.log('[Slack Webhook] URL verification challenge, responding')
      return NextResponse.json(createChallengeResponse(payload.challenge!))
    }

    // team_idからワークスペースを特定
    const teamId = payload.team_id
    if (!teamId) {
      console.error('[Slack Webhook] No team_id in payload')
      return NextResponse.json({ error: 'No team_id' }, { status: 400 })
    }

    // アクティブなワークスペースを取得
    const workspaces = await getActiveSlackWorkspaces()
    const workspace = workspaces.find(w => w.workspace_id === teamId)

    if (!workspace) {
      console.log('[Slack Webhook] Workspace not registered:', teamId)
      return NextResponse.json({ ok: true })
    }

    // 署名検証
    if (!verifySlackSignature(workspace.signing_secret, signature, timestamp, rawBody)) {
      console.error('[Slack Webhook] Invalid signature for workspace:', teamId)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // メッセージイベント以外はスキップ
    if (!isMessageEvent(payload)) {
      console.log('[Slack Webhook] Not a message event, skip')
      return NextResponse.json({ ok: true })
    }

    // メッセージ解析
    const message = parseSlackMessage(payload)
    if (!message) {
      console.log('[Slack Webhook] Could not parse message')
      return NextResponse.json({ ok: true })
    }

    console.log('[Slack Webhook] Channel:', message.channelId, 'Text:', message.text)

    // アクティブなチャンネルを確認
    const activeRooms = await getActiveRoomsByWorkspace(teamId)
    console.log('[Slack Webhook] Active channels:', activeRooms.map(r => r.room_id))

    const isActiveRoom = activeRooms.some(room => room.room_id === message.channelId)

    if (!isActiveRoom) {
      console.log('[Slack Webhook] Channel not monitored:', message.channelId)
      return NextResponse.json({ ok: true })
    }

    // タスク分析
    console.log('[Slack Webhook] Analyzing message:', message.text)
    const analysis = analyzeMessage(message.text)
    console.log('[Slack Webhook] Analysis:', JSON.stringify(analysis))

    if (!analysis.isTask) {
      console.log('[Slack Webhook] Not a task')
      return NextResponse.json({ ok: true })
    }

    // 重複チェック
    const existingTask = await getTaskByMessageId(message.messageId, 'slack')
    if (existingTask) {
      console.log('[Slack Webhook] Duplicate message, skipping:', message.messageId)
      return NextResponse.json({ ok: true })
    }

    // タスク作成
    console.log('[Slack Webhook] Creating task...')
    const task = await createTask({
      roomId: message.channelId,
      messageId: message.messageId,
      content: analysis.taskContent,
      originalMessage: message.text,
      senderName: message.userId, // TODO: APIでユーザー名を取得
      priority: analysis.priority,
      source: 'slack',
    })

    console.log('[Slack Webhook] Task created:', task.id)

    // 作成通知を送信（非同期）
    sendTaskNotification({
      id: task.id,
      content: task.content,
      sender_name: task.sender_name,
      source: 'slack',
      priority: task.priority,
    }, 'create').catch(err => {
      console.error('[Email] Failed to send create notification:', err)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Slack Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
