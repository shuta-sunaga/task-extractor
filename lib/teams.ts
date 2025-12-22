import crypto from 'crypto'

// Teams Outgoing Webhook ペイロード型定義
export type TeamsWebhookPayload = {
  type: string
  id: string
  timestamp: string
  localTimestamp?: string
  serviceUrl?: string
  channelId?: string
  from: {
    id: string
    name: string
    aadObjectId?: string
  }
  conversation: {
    id: string
    conversationType?: string
    tenantId?: string
    isGroup?: boolean
    name?: string
  }
  recipient?: {
    id: string
    name: string
  }
  text: string
  textFormat?: string
  attachments?: Array<{
    contentType: string
    content: string
  }>
  entities?: Array<{
    type: string
    mentioned?: {
      id: string
      name: string
    }
    text?: string
  }>
  channelData?: {
    teamsChannelId?: string
    teamsTeamId?: string
    channel?: { id: string; name?: string }
    team?: { id: string; name?: string }
    tenant?: { id: string }
  }
}

// 正規化されたメッセージ型
export type TeamsMessage = {
  activityId: string
  conversationId: string
  text: string
  senderName: string
  teamId?: string
  channelId?: string
  channelName?: string
  teamName?: string
}

/**
 * Teams Outgoing Webhook の署名を検証
 * Authorization ヘッダー形式: "HMAC <base64_signature>"
 */
export function verifyTeamsSignature(
  payload: string,
  authHeader: string,
  secret: string
): boolean {
  try {
    // "HMAC <signature>" からシグネチャ部分を抽出
    const match = authHeader.match(/^HMAC\s+(.+)$/i)
    if (!match) {
      console.log('[Teams] Invalid Authorization header format')
      return false
    }

    const receivedSignature = match[1]

    // HMAC-SHA256 で期待される署名を計算
    const keyBuffer = Buffer.from(secret, 'base64')
    const hmac = crypto.createHmac('sha256', keyBuffer)
    hmac.update(payload, 'utf8')
    const expectedSignature = hmac.digest('base64')

    // タイミング攻撃を防ぐための安全な比較
    const receivedBuffer = Buffer.from(receivedSignature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch (error) {
    console.error('[Teams] Signature verification error:', error)
    return false
  }
}

/**
 * @mention タグを除去してメッセージ本文を取得
 */
export function stripMention(text: string): string {
  // <at>BotName</at> パターンを除去
  let cleaned = text.replace(/<at>.*?<\/at>/gi, '')
  // 前後の空白・改行を除去
  cleaned = cleaned.trim()
  return cleaned
}

/**
 * Teams ペイロードを正規化されたメッセージ形式に変換
 */
export function parseTeamsPayload(payload: TeamsWebhookPayload): TeamsMessage {
  return {
    activityId: payload.id,
    conversationId: payload.conversation.id,
    text: stripMention(payload.text || ''),
    senderName: payload.from?.name || 'Unknown',
    teamId: payload.channelData?.teamsTeamId,
    channelId: payload.channelData?.teamsChannelId,
    channelName: payload.channelData?.channel?.name,
    teamName: payload.channelData?.team?.name,
  }
}

/**
 * Teams Webhook レスポンスを生成
 */
export function createTeamsResponse(text: string): object {
  return {
    type: 'message',
    text: text,
  }
}

/**
 * 空のレスポンス（タスク登録のみ、返信不要の場合）
 */
export function createEmptyResponse(): object {
  return {
    type: 'message',
    text: '',
  }
}
