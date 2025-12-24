import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

// 環境変数から暗号化キーを取得（64文字のHEX文字列 = 32バイト）
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

export type EncryptedData = {
  encrypted: string
  iv: string
  authTag: string
}

/**
 * 文字列をAES-256-GCMで暗号化
 */
export function encrypt(plainText: string): EncryptedData {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

/**
 * AES-256-GCMで暗号化されたデータを復号
 */
export function decrypt(data: EncryptedData): string {
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(data.iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'))

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * 暗号化キーが設定されているかチェック
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey()
    return true
  } catch {
    return false
  }
}

/**
 * 暗号化キーを生成（セットアップ用）
 * 実行例: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
