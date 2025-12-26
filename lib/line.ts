import crypto from 'crypto'

// LINE Webhook イベント型定義
export type LineWebhookEvent = {
  type: string
  replyToken?: string
  timestamp: number
  source: {
    type: 'user' | 'group' | 'room'
    userId?: string
    groupId?: string
    roomId?: string
  }
  message?: {
    id: string
    type: string
    text?: string
  }
}

export type LineWebhookPayload = {
  destination: string
  events: LineWebhookEvent[]
}

// 正規化されたメッセージ型
export type LineMessage = {
  messageId: string
  groupId: string
  text: string
  userId: string
  replyToken?: string
}

/**
 * LINE Webhook の署名を検証
 * X-Line-Signature ヘッダーを使用
 */
export function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', channelSecret)
    hmac.update(body)
    const expectedSignature = hmac.digest('base64')

    // タイミング攻撃を防ぐための安全な比較
    const receivedBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch (error) {
    console.error('[LINE] Signature verification error:', error)
    return false
  }
}

/**
 * メッセージイベントかどうかを判定
 */
export function isMessageEvent(event: LineWebhookEvent): boolean {
  return event.type === 'message' && event.message?.type === 'text'
}

/**
 * グループ参加イベントかどうかを判定
 */
export function isJoinEvent(event: LineWebhookEvent): boolean {
  return event.type === 'join'
}

/**
 * グループ退出イベントかどうかを判定
 */
export function isLeaveEvent(event: LineWebhookEvent): boolean {
  return event.type === 'leave'
}

/**
 * グループからのイベントかどうかを判定
 */
export function isGroupEvent(event: LineWebhookEvent): boolean {
  return event.source.type === 'group' && !!event.source.groupId
}

/**
 * LINE イベントを正規化されたメッセージ形式に変換
 */
export function parseLineEvent(event: LineWebhookEvent): LineMessage | null {
  if (!isMessageEvent(event) || !isGroupEvent(event)) {
    return null
  }

  if (!event.message?.text || !event.source.groupId) {
    return null
  }

  return {
    messageId: event.message.id,
    groupId: event.source.groupId,
    text: event.message.text,
    userId: event.source.userId || 'unknown',
    replyToken: event.replyToken,
  }
}

/**
 * LINE APIでユーザープロフィールを取得
 */
export async function getGroupMemberProfile(
  groupId: string,
  userId: string,
  accessToken: string
): Promise<{ displayName: string } | null> {
  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      console.log('[LINE] Failed to get member profile:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[LINE] Error getting member profile:', error)
    return null
  }
}

/**
 * LINE APIでグループ情報を取得
 */
export async function getGroupSummary(
  groupId: string,
  accessToken: string
): Promise<{ groupId: string; groupName: string } | null> {
  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/summary`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      console.log('[LINE] Failed to get group summary:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[LINE] Error getting group summary:', error)
    return null
  }
}

/**
 * LINEにリプライメッセージを送信
 */
export async function replyMessage(
  replyToken: string,
  text: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    })

    return response.ok
  } catch (error) {
    console.error('[LINE] Error sending reply:', error)
    return false
  }
}
