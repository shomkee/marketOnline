import { z } from 'zod'

/** Настройки магазина. */
export const settingsSchema = z.object({
  shopName: z.string().trim().min(2, 'Название от 2 символов').max(80),
  shopDescription: z.string().trim().max(300).optional().or(z.literal('')),
  logoUrl: z.string().url('Некорректный URL').optional().or(z.literal('')),

  contactEmail: z.string().email('Некорректный email').optional().or(z.literal('')),
  telegramUsername: z
    .string()
    .trim()
    .max(40)
    .regex(/^@?[A-Za-z0-9_]*$/, 'Некорректный username')
    .optional()
    .or(z.literal('')),
  supportUrl: z.string().url('Некорректный URL').optional().or(z.literal('')),

  metaTitle: z.string().trim().max(120).optional().or(z.literal('')),
  metaDescription: z.string().trim().max(200).optional().or(z.literal('')),
  ogImageUrl: z.string().url('Некорректный URL').optional().or(z.literal('')),

  cryptobotEnabled: z.boolean().default(false),
  /** Пустая строка = не менять сохранённый токен */
  cryptobotToken: z.string().trim().max(200).optional().or(z.literal('')),

  yookassaEnabled: z.boolean().default(false),
  yookassaShopId: z.string().trim().max(50).optional().or(z.literal('')),
  yookassaSecretKey: z.string().trim().max(200).optional().or(z.literal('')),

  emailFrom: z.string().trim().max(120).optional().or(z.literal('')),
  adminNotifyEmail: z.string().email('Некорректный email').optional().or(z.literal('')),

  reservationMinutes: z.coerce.number().int().min(5, 'Минимум 5 минут').max(120, 'Максимум 120 минут').default(15),
  downloadTtlSeconds: z.coerce.number().int().min(60).max(3600).default(300),
  maxEmailResends: z.coerce.number().int().min(1).max(20).default(5),
  reviewsModerated: z.boolean().default(true),
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().trim().max(300).optional().or(z.literal('')),
})

export type SettingsInput = z.infer<typeof settingsSchema>
