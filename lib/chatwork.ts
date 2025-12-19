const CHATWORK_API_BASE = 'https://api.chatwork.com/v2'

export type ChatworkRoom = {
  room_id: number
  name: string
  type: string
  role: string
  sticky: boolean
  unread_num: number
  mention_num: number
  mytask_num: number
  message_num: number
  file_num: number
  task_num: number
  icon_path: string
  last_update_time: number
}

export type ChatworkMessage = {
  message_id: string
  account: {
    account_id: number
    name: string
    avatar_image_url: string
  }
  body: string
  send_time: number
  update_time: number
}

export type WebhookPayload = {
  webhook_setting_id: string
  webhook_event_type: string
  webhook_event_time: number
  webhook_event: {
    room_id: number
    message_id: string
    account_id: number
    body: string
    send_time: number
    update_time: number
  }
}

class ChatworkClient {
  private apiToken: string

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${CHATWORK_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'X-ChatWorkToken': this.apiToken,
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Chatwork API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getRooms(): Promise<ChatworkRoom[]> {
    return this.request<ChatworkRoom[]>('/rooms')
  }

  async getMessages(roomId: string, force?: boolean): Promise<ChatworkMessage[]> {
    const params = force ? '?force=1' : ''
    return this.request<ChatworkMessage[]>(`/rooms/${roomId}/messages${params}`)
  }

  async getMessage(roomId: string, messageId: string): Promise<ChatworkMessage> {
    return this.request<ChatworkMessage>(`/rooms/${roomId}/messages/${messageId}`)
  }

  async getAccountInfo(accountId: number): Promise<{ name: string }> {
    // Chatwork APIには直接アカウント情報を取得するエンドポイントがないため、
    // Webhook payloadから取得した情報を使う
    return { name: `User ${accountId}` }
  }
}

export function createChatworkClient(apiToken: string) {
  return new ChatworkClient(apiToken)
}

// Webhook署名検証
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  token: string
): boolean {
  // Chatwork Webhookの署名検証
  // トークンをBase64デコードして秘密鍵として使用
  // HMAC-SHA256で署名を検証

  try {
    const crypto = require('crypto')
    const secret = Buffer.from(token, 'base64')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('base64')

    return signature === expectedSignature
  } catch {
    return false
  }
}
