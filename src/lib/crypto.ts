import crypto from 'crypto'

import { getEnv } from './env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const PREFIX = 'enc:v1:'

function getKey(): Buffer {
  return Buffer.from(getEnv().ENCRYPTION_KEY, 'hex')
}

/**
 * Шифрует строку AES-256-GCM.
 * Формат: enc:v1:<iv base64>:<authTag base64>:<ciphertext base64>
 */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

/**
 * Расшифровывает строку.
 * Если значение не имеет нашего префикса — возвращается как есть.
 * Это позволяет безболезненно мигрировать старые незашифрованные данные.
 */
export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value

  const [, , ivB64, tagB64, dataB64] = value.split(':')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Повреждённое зашифрованное значение')
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/** Шифрует значение, если оно непустое. */
export function encryptNullable(value: string | null | undefined): string | null {
  if (!value) return null
  return encrypt(value)
}

/** Расшифровывает значение, если оно непустое. */
export function decryptNullable(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decrypt(value)
  } catch {
    return null
  }
}

/** SHA-256 в hex — используется для поиска дублей ключей без расшифровки. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

/** HMAC-SHA256 в hex. */
export function hmacSha256(secret: string | Buffer, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
}

/** Сравнение строк за постоянное время — защита от timing-атак при проверке подписей. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/** Генерирует криптостойкий токен в url-safe алфавите. */
export function generateToken(length = 32): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i += 1) {
    result += alphabet[bytes[i] % alphabet.length]
  }
  return result
}
