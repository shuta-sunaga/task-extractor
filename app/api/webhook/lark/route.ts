import { NextResponse } from 'next/server'
import { getSettings, getActiveRoomsBySource, createTask, getTaskByMessageId } from '@/lib/db'
import {
  isChallenge,
  createChallengeResponse,
  verifyToken,
  verifySignature,
  decryptAES,
  parseLarkPayload,
  isMessageReceiveEvent,
  type LarkEventPayload,
} from '@/lib/lark'
import { analyzeMessage } from '@/lib/extractor'
import { sendTaskNotification } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const timestamp = request.headers.get('X-Lark-Request-Timestamp') || ''
    const nonce = request.headers.get('X-Lark-Request-Nonce') || ''
    const signature = request.headers.get('X-Lark-Signature') || ''

    console.log('[Lark Webhook] Received request')
    console.log('[Lark Webhook] Raw body:', rawBody)

    let payload: LarkEventPayload = JSON.parse(rawBody)

    // 設定取得
    const settings = await getSettings()

    // 設定から企業IDを取得
    const companyId = settings?.company_id as number | undefined

    // 暗号化されている場合は復号
    if (payload.encrypt && settings?.lark_encrypt_key) {
      console.log('[Lark Webhook] Decrypting payload')
      const decrypted = decryptAES(payload.encrypt, settings.lark_encrypt_key)
      payload = JSON.parse(decrypted)
      console.log('[Lark Webhook] Decrypted payload:', JSON.stringify(payload))
    }

    // URL検証チャレンジへの応答（最優先で処理）
    if (isChallenge(payload)) {
      console.log('[Lark Webhook] Challenge request, responding with:', payload.challenge)
      return NextResponse.json(createChallengeResponse(payload.challenge!))
    }

    // 以降のイベント処理にはVerification Tokenが必要
    if (!settings?.lark_verification_token) {
      console.error('[Lark Webhook] Verification token not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
    }

    // 署名検証（暗号化キーがある場合）
    if (settings.lark_encrypt_key && signature) {
      if (!verifySignature(timestamp, nonce, rawBody, signature, settings.lark_encrypt_key)) {
        console.error('[Lark Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // トークン検証
    if (!verifyToken(payload, settings.lark_verification_token)) {
      console.error('[Lark Webhook] Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // メッセージ受信イベント以外はスキップ
    if (!isMessageReceiveEvent(payload)) {
      console.log('[Lark Webhook] Not a message receive event, skip')
      return NextResponse.json({ success: true })
    }

    // メッセージ解析
    const message = parseLarkPayload(payload)
    if (!message) {
      console.log('[Lark Webhook] Could not parse message')
      return NextResponse.json({ success: true })
    }

    console.log('[Lark Webhook] Chat:', message.chatId, 'Text:', message.text, 'Company:', companyId)

    // 企業のアクティブなLarkチャットを確認
    const activeRooms = await getActiveRoomsBySource('lark', companyId)
    console.log('[Lark Webhook] Active chats:', activeRooms.map(r => r.room_id))

    const isActiveRoom = activeRooms.some(room => room.room_id === message.chatId)

    if (!isActiveRoom) {
      console.log('[Lark Webhook] Chat not monitored')
      return NextResponse.json({ success: true })
    }

    // タスク分析
    console.log('[Lark Webhook] Analyzing message:', message.text)
    const analysis = analyzeMessage(message.text)
    console.log('[Lark Webhook] Analysis:', JSON.stringify(analysis))

    if (!analysis.isTask) {
      console.log('[Lark Webhook] Not a task')
      return NextResponse.json({ success: true })
    }

    // 重複チェック
    const existingTask = await getTaskByMessageId(message.messageId, 'lark')
    if (existingTask) {
      console.log('[Lark Webhook] Duplicate message, skipping:', message.messageId)
      return NextResponse.json({ success: true })
    }

    // タスク作成
    console.log('[Lark Webhook] Creating task for company:', companyId)
    const task = await createTask({
      roomId: message.chatId,
      messageId: message.messageId,
      content: analysis.taskContent,
      originalMessage: message.text,
      senderName: message.senderOpenId, // TODO: APIでユーザー名を取得
      priority: analysis.priority,
      source: 'lark',
      companyId,
    })

    console.log('[Lark Webhook] Task created:', task.id)

    // 作成通知を送信（非同期）
    sendTaskNotification({
      id: task.id,
      content: task.content,
      sender_name: task.sender_name,
      source: 'lark',
      priority: task.priority,
    }, 'create').catch(err => {
      console.error('[Email] Failed to send create notification:', err)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Lark Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
