import { z } from 'zod'

/**
 * Схема переменных окружения.
 * Проверяется один раз при старте — лучше упасть на билде, чем в рантайме на бою.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL обязателен'),
  DIRECT_URL: z.string().optional(),

  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET должен быть не короче 16 символов'),
  NEXTAUTH_URL: z.string().url().optional(),

  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY должен быть 64 hex-символа (32 байта)'),

  CRYPTOBOT_TOKEN: z.string().optional().default(''),
  CRYPTOBOT_API_URL: z.string().url().optional().default('https://pay.crypt.bot/api'),
  CRYPTOBOT_ASSET: z.string().optional().default('USDT'),
  CRYPTOBOT_RUB_RATE: z.coerce.number().positive().optional().default(95),

  YOOKASSA_SHOP_ID: z.string().optional().default(''),
  YOOKASSA_SECRET_KEY: z.string().optional().default(''),

  S3_ENDPOINT: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('us-east-1'),
  S3_BUCKET: z.string().optional().default(''),
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_PUBLIC_URL: z.string().optional().default(''),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),

  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('Digital Store <noreply@example.com>'),

  CRON_SECRET: z.string().optional().default(''),

  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

/** Ленивый доступ к провалидированному окружению. */
export function getEnv(): ServerEnv {
  if (cached) return cached

  const parsed = serverSchema.safeParse(process.env)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Некорректные переменные окружения:\n${details}`)
  }

  cached = parsed.data
  return cached
}

/** Базовый URL приложения без слэша в конце. */
export function getAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000')
  return raw.replace(/\/+$/, '')
}
