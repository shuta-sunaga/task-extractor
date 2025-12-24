import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

/**
 * パスワードをbcryptでハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * パスワードとハッシュを比較検証
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * パスワードの強度をチェック
 * 最低8文字、1つ以上の数字、1つ以上の英字を要求
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'パスワードは8文字以上必要です' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'パスワードには数字を含める必要があります' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'パスワードには英字を含める必要があります' }
  }
  return { valid: true }
}
