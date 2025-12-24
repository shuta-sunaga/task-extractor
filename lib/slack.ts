import crypto from 'crypto'

// Slack イベントペイロード型定義
export type SlackEventPayload = {
  token?: string
  team_id?: string
  api_app_id?: string
  type: string
  event?: {
    type: string
    user?: string
    text?: string
    ts?: string
    channel?: string
    channel_type?: string
    subtype?: string
    bot_id?: string
  }
  event_id?: string
  event_time?: number
  // URL検証チャレンジ用
  challenge?: string
}

// 正規化されたメッセージ型
export type SlackMessage = {
  messageId: string
  channelId: string
  channelType: string
  text: string
  userId: string
  teamId: string
  timestamp: string
}

/**
 * URL検証チャレンジかどうかを判定
 */
export function isUrlVerification(payload: SlackEventPayload): boolean {
  return payload.type === 'url_verification' && !!payload.challenge
}

/**
 * チャレンジレスポンスを生成
 */
export function createChallengeResponse(challenge: string): { challenge: string } {
  return { challenge }
}

/**
 * Slackリクエストの署名を検証
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  try {
    // タイムスタンプ検証（5分以内）
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
    if (parseInt(timestamp) < fiveMinutesAgo) {
      console.error('[Slack] Request timestamp is too old')
      return false
    }

    // 署名計算
    const baseString = `v0:${timestamp}:${body}`
    const hmac = crypto.createHmac('sha256', signingSecret)
    hmac.update(baseString)
    const expectedSignature = `v0=${hmac.digest('hex')}`

    // タイミングセーフ比較
    if (signature.length !== expectedSignature.length) {
      return false
    }
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('[Slack] Signature verification error:', error)
    return false
  }
}

/**
 * メッセージイベントかどうかを判定
 */
export function isMessageEvent(payload: SlackEventPayload): boolean {
  return (
    payload.type === 'event_callback' &&
    payload.event?.type === 'message' &&
    !payload.event?.subtype && // サブタイプがないもの（通常のメッセージ）
    !payload.event?.bot_id // ボットのメッセージは除外
  )
}

/**
 * Slack ペイロードを正規化されたメッセージ形式に変換
 */
export function parseSlackMessage(payload: SlackEventPayload): SlackMessage | null {
  const event = payload.event
  if (!event || !event.text || !event.channel || !event.ts) {
    return null
  }

  return {
    messageId: event.ts,
    channelId: event.channel,
    channelType: event.channel_type || 'channel',
    text: stripSlackMentions(event.text),
    userId: event.user || '',
    teamId: payload.team_id || '',
    timestamp: event.ts,
  }
}

/**
 * Slack形式の@mentionを除去
 * 形式: <@U123ABC> または <@U123ABC|username>
 */
export function stripSlackMentions(text: string): string {
  // <@U123ABC> または <@U123ABC|username> 形式のメンションを除去
  return text
    .replace(/<@[A-Z0-9]+(\|[^>]+)?>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Slackチャンネルタイプの判定
 */
export function getChannelType(channelType?: string): string {
  switch (channelType) {
    case 'channel':
      return 'パブリックチャンネル'
    case 'group':
      return 'プライベートチャンネル'
    case 'im':
      return 'ダイレクトメッセージ'
    case 'mpim':
      return 'グループDM'
    default:
      return 'チャンネル'
  }
}

/**
 * member_joined_channel イベントかどうかを判定
 */
export function isMemberJoinedChannelEvent(payload: SlackEventPayload): boolean {
  return (
    payload.type === 'event_callback' &&
    payload.event?.type === 'member_joined_channel'
  )
}

/**
 * member_joined_channel イベントからデータを抽出
 */
export function parseMemberJoinedEvent(payload: SlackEventPayload): {
  userId: string
  channelId: string
  channelType: string
  teamId: string
} | null {
  const event = payload.event
  if (!event || event.type !== 'member_joined_channel' || !event.user || !event.channel) {
    return null
  }

  return {
    userId: event.user,
    channelId: event.channel,
    channelType: event.channel_type || 'channel',
    teamId: payload.team_id || '',
  }
}

/**
 * Slack auth.test APIでボット情報を取得
 */
export async function getSlackBotInfo(botToken: string): Promise<{
  ok: boolean
  userId?: string
  teamId?: string
  error?: string
}> {
  try {
    const res = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const data = await res.json()

    if (data.ok) {
      return {
        ok: true,
        userId: data.user_id,
        teamId: data.team_id,
      }
    } else {
      return {
        ok: false,
        error: data.error || 'Unknown error',
      }
    }
  } catch (error) {
    console.error('[Slack] auth.test API error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Slack conversations.info APIでチャンネル情報を取得
 */
export async function getSlackChannelInfo(botToken: string, channelId: string): Promise<{
  ok: boolean
  channelName?: string
  error?: string
}> {
  try {
    const res = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    })

    const data = await res.json()

    if (data.ok && data.channel) {
      return {
        ok: true,
        channelName: data.channel.name || channelId,
      }
    } else {
      return {
        ok: false,
        error: data.error || 'Unknown error',
      }
    }
  } catch (error) {
    console.error('[Slack] conversations.info API error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
