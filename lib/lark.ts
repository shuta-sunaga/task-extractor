import crypto from 'crypto'

// Lark イベントペイロード型定義
export type LarkEventPayload = {
  schema?: string
  header?: {
    event_id: string
    event_type: string
    create_time: string
    token: string
    app_id: string
    tenant_key: string
  }
  event?: {
    sender?: {
      sender_id?: {
        open_id?: string
        user_id?: string
        union_id?: string
      }
      sender_type?: string
      tenant_key?: string
    }
    message?: {
      message_id: string
      root_id?: string
      parent_id?: string
      create_time: string
      chat_id: string
      chat_type: string
      message_type: string
      content: string
      mentions?: Array<{
        key: string
        id: {
          open_id?: string
          user_id?: string
          union_id?: string
        }
        name: string
        tenant_key?: string
      }>
    }
  }
  // Challenge用
  type?: string
  token?: string
  challenge?: string
  // 暗号化された場合
  encrypt?: string
}

// 正規化されたメッセージ型
export type LarkMessage = {
  messageId: string
  chatId: string
  chatType: string
  text: string
  senderOpenId: string
  senderType: string
  createTime: string
}

/**
 * URL検証チャレンジかどうかを判定
 */
export function isChallenge(payload: LarkEventPayload): boolean {
  return payload.type === 'url_verification' && !!payload.challenge
}

/**
 * チャレンジレスポンスを生成
 */
export function createChallengeResponse(challenge: string): object {
  return { challenge }
}

/**
 * Verification Token を検証
 */
export function verifyToken(payload: LarkEventPayload, verificationToken: string): boolean {
  // ヘッダーにトークンがある場合（イベントコールバック）
  if (payload.header?.token) {
    return payload.header.token === verificationToken
  }
  // チャレンジリクエストの場合
  if (payload.token) {
    return payload.token === verificationToken
  }
  return false
}

/**
 * 署名を検証
 * signature = sha256(timestamp + nonce + encryptKey + body)
 */
export function verifySignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  encryptKey: string
): boolean {
  try {
    const content = timestamp + nonce + encryptKey + body
    const expectedSignature = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
    return signature === expectedSignature
  } catch (error) {
    console.error('[Lark] Signature verification error:', error)
    return false
  }
}

/**
 * AES-256-CBC で暗号化されたデータを復号
 */
export function decryptAES(encryptedData: string, encryptKey: string): string {
  try {
    // キーをSHA256でハッシュ化して32バイトにする
    const key = crypto.createHash('sha256').update(encryptKey).digest()

    // Base64デコード
    const encrypted = Buffer.from(encryptedData, 'base64')

    // 最初の16バイトがIV
    const iv = encrypted.subarray(0, 16)
    const data = encrypted.subarray(16)

    // 復号
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(data)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    console.error('[Lark] AES decryption error:', error)
    throw error
  }
}

/**
 * メッセージコンテンツをパース
 * Larkのメッセージコンテンツは JSON 文字列
 */
export function parseMessageContent(content: string, messageType: string): string {
  try {
    const parsed = JSON.parse(content)

    switch (messageType) {
      case 'text':
        return parsed.text || ''
      case 'post':
        // リッチテキストの場合、タイトルと本文を結合
        if (parsed.title) {
          return parsed.title
        }
        // contentの中のテキスト要素を抽出
        if (parsed.content && Array.isArray(parsed.content)) {
          return parsed.content
            .flat()
            .filter((item: { tag: string }) => item.tag === 'text')
            .map((item: { text: string }) => item.text)
            .join('')
        }
        return ''
      default:
        return ''
    }
  } catch {
    return content
  }
}

/**
 * @mention を除去してプレーンテキストを取得
 */
export function stripMentions(text: string, mentions?: Array<{
  key: string
  id: {
    open_id?: string
    user_id?: string
    union_id?: string
  }
  name: string
  tenant_key?: string
}>): string {
  if (!mentions || mentions.length === 0) {
    return text.trim()
  }

  let result = text
  for (const mention of mentions) {
    // @_user_N 形式のメンションを除去
    result = result.replace(new RegExp(mention.key, 'g'), '')
  }

  return result.trim()
}

/**
 * Lark ペイロードを正規化されたメッセージ形式に変換
 */
export function parseLarkPayload(payload: LarkEventPayload): LarkMessage | null {
  const event = payload.event
  if (!event?.message) {
    return null
  }

  const message = event.message
  const rawContent = parseMessageContent(message.content, message.message_type)
  const text = stripMentions(rawContent, message.mentions)

  return {
    messageId: message.message_id,
    chatId: message.chat_id,
    chatType: message.chat_type,
    text,
    senderOpenId: event.sender?.sender_id?.open_id || '',
    senderType: event.sender?.sender_type || '',
    createTime: message.create_time,
  }
}

/**
 * イベントがメッセージ受信かどうかを判定
 */
export function isMessageReceiveEvent(payload: LarkEventPayload): boolean {
  return payload.header?.event_type === 'im.message.receive_v1'
}
