import { NextResponse } from 'next/server'
import { getCompanyByWebhookToken, getSettings, getActiveRoomsBySource, createTask, getTaskByMessageId, createRoom } from '@/lib/db'
import {
  verifyLineSignature,
  isMessageEvent,
  isJoinEvent,
  isGroupEvent,
  parseLineEvent,
  getGroupMemberProfile,
  getGroupSummary,
  type LineWebhookPayload,
} from '@/lib/line'
import { analyzeMessage } from '@/lib/extractor'
import { sendTaskNotification } from '@/lib/email'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const rawBody = await request.text()
    const signature = request.headers.get('X-Line-Signature') || ''

    console.log('[LINE Webhook] Received request for token:', token.substring(0, 8) + '...')

    // トークンから企業を特定
    const company = await getCompanyByWebhookToken(token)
    if (!company) {
      console.error('[LINE Webhook] Invalid webhook token')
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 404 })
    }

    const companyId = company.id
    console.log('[LINE Webhook] Company identified:', company.name, 'ID:', companyId)

    // 企業の設定を取得
    const settings = await getSettings(companyId)
    if (!settings?.line_channel_secret) {
      console.error('[LINE Webhook] Channel secret not configured for company:', companyId)
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
    }

    // 署名検証
    if (!verifyLineSignature(rawBody, signature, settings.line_channel_secret)) {
      console.error('[LINE Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload: LineWebhookPayload = JSON.parse(rawBody)
    console.log('[LINE Webhook] Events count:', payload.events?.length || 0)

    // 各イベントを処理
    for (const event of payload.events || []) {
      console.log('[LINE Webhook] Event type:', event.type, 'Source type:', event.source.type)

      // グループ参加イベント - グループを未承認で登録
      if (isJoinEvent(event) && isGroupEvent(event)) {
        const groupId = event.source.groupId!
        console.log('[LINE Webhook] Bot joined group:', groupId)

        // グループ名を取得（可能であれば）
        let groupName = groupId
        if (settings.line_access_token) {
          const groupInfo = await getGroupSummary(groupId, settings.line_access_token)
          if (groupInfo?.groupName) {
            groupName = groupInfo.groupName
          }
        }

        // 未承認（is_active=false）で登録
        await createRoom({
          roomId: groupId,
          roomName: groupName,
          source: 'line',
          isActive: false, // 手動承認が必要
          companyId,
        })
        console.log('[LINE Webhook] Group registered (pending approval):', groupId)
        continue
      }

      // メッセージイベント
      if (isMessageEvent(event) && isGroupEvent(event)) {
        const message = parseLineEvent(event)
        if (!message) {
          console.log('[LINE Webhook] Could not parse message')
          continue
        }

        console.log('[LINE Webhook] Group:', message.groupId, 'Text:', message.text)

        // 企業のアクティブなLINEグループを確認
        const activeRooms = await getActiveRoomsBySource('line', companyId)
        console.log('[LINE Webhook] Active groups:', activeRooms.map(r => r.room_id))

        const isActiveRoom = activeRooms.some(room => room.room_id === message.groupId)

        if (!isActiveRoom) {
          console.log('[LINE Webhook] Group not monitored or not approved')
          continue
        }

        // タスク分析
        console.log('[LINE Webhook] Analyzing message:', message.text)
        const analysis = analyzeMessage(message.text)
        console.log('[LINE Webhook] Analysis:', JSON.stringify(analysis))

        if (!analysis.isTask) {
          console.log('[LINE Webhook] Not a task')
          continue
        }

        // 重複チェック
        const existingTask = await getTaskByMessageId(message.messageId, 'line')
        if (existingTask) {
          console.log('[LINE Webhook] Duplicate message, skipping:', message.messageId)
          continue
        }

        // 送信者名を取得（可能であれば）
        let senderName = message.userId
        if (settings.line_access_token && message.userId !== 'unknown') {
          const profile = await getGroupMemberProfile(message.groupId, message.userId, settings.line_access_token)
          if (profile?.displayName) {
            senderName = profile.displayName
          }
        }

        // タスク作成
        console.log('[LINE Webhook] Creating task for company:', companyId)
        const task = await createTask({
          roomId: message.groupId,
          messageId: message.messageId,
          content: analysis.taskContent,
          originalMessage: message.text,
          senderName,
          priority: analysis.priority,
          source: 'line',
          companyId,
        })

        console.log('[LINE Webhook] Task created:', task.id)

        // 作成通知を送信（非同期）
        sendTaskNotification({
          id: task.id,
          content: task.content,
          sender_name: task.sender_name,
          source: 'line',
          priority: task.priority,
        }, 'create').catch(err => {
          console.error('[Email] Failed to send create notification:', err)
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[LINE Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
