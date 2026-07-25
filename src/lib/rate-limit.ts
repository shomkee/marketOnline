import { AppError } from './errors'

type Bucket = {
  count: number
  resetAt: number
}

/**
 * In-memory rate limiter на скользящих окнах.
 *
 * Для одного инстанса этого достаточно. При горизонтальном масштабировании
 * замените реализацию consume() на Redis (Upstash) — интерфейс останется тем же.
 */
const globalForRateLimit = globalThis as unknown as {
  rateLimitStore: Map<string, Bucket> | undefined
}

const store: Map<string, Bucket> = globalForRateLimit.rateLimitStore ?? new Map()
globalForRateLimit.rateLimitStore = store

/** Периодическая очистка протухших бакетов, чтобы Map не росла бесконечно. */
function sweep(now: number) {
  if (store.size < 5000) return
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}

export type RateLimitResult = {
  success: boolean
  remaining: number
  retryAfterSec: number
}

/**
 * Забирает один токен из бакета.
 *
 * @param key Уникальный ключ: "create-order:1.2.3.4"
 * @param limit Сколько запросов разрешено в окне
 * @param windowSec Длина окна в секундах
 */
export function consume(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    return { success: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  if (existing.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1
  return { success: true, remaining: limit - existing.count, retryAfterSec: 0 }
}

/** Как consume(), но бросает AppError при превышении лимита. */
export function enforce(key: string, limit: number, windowSec: number): void {
  const result = consume(key, limit, windowSec)
  if (!result.success) {
    throw new AppError(
      'RATE_LIMITED',
      `Слишком много запросов. Попробуйте через ${result.retryAfterSec} сек.`,
    )
  }
}

/** Пресеты лимитов для конкретных действий. */
export const RATE_LIMITS = {
  createOrder: { limit: 5, windowSec: 60 },
  validatePromocode: { limit: 15, windowSec: 60 },
  createReview: { limit: 3, windowSec: 600 },
  resendEmail: { limit: 3, windowSec: 600 },
  download: { limit: 30, windowSec: 60 },
  login: { limit: 10, windowSec: 300 },
} as const
