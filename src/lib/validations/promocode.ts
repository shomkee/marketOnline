import { z } from 'zod'

/** Схема промокода для формы админки. */
export const promocodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Код от 3 символов')
      .max(32, 'Код до 32 символов')
      .regex(/^[A-Za-z0-9_-]+$/, 'Допустимы латиница, цифры, дефис и подчёркивание')
      .transform((value) => value.toUpperCase()),
    discountType: z.enum(['PERCENT', 'FIXED']),
    /** Для PERCENT — процент, для FIXED — рубли (конвертируются в копейки при сохранении) */
    discountValue: z.coerce.number().min(1, 'Значение должно быть больше нуля'),
    minOrderAmount: z.coerce.number().min(0).optional(),
    maxDiscount: z.coerce.number().min(0).optional(),
    usageLimit: z.coerce.number().int().min(1).optional(),
    perEmailLimit: z.coerce.number().int().min(1).max(100).optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    isActive: z.boolean().default(true),
    description: z.string().trim().max(200).optional().or(z.literal('')),
    productIds: z.array(z.string()).default([]),
  })
  .refine((data) => data.discountType !== 'PERCENT' || data.discountValue <= 100, {
    message: 'Процент скидки не может быть больше 100',
    path: ['discountValue'],
  })
  .refine(
    (data) => !data.validFrom || !data.validUntil || new Date(data.validUntil) > new Date(data.validFrom),
    { message: 'Дата окончания должна быть позже даты начала', path: ['validUntil'] },
  )

export type PromocodeInput = z.infer<typeof promocodeSchema>

/** Проверка промокода на этапе оформления. */
export const validatePromocodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Введите промокод')
    .max(64)
    .transform((value) => value.toUpperCase()),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  email: z.string().email().optional(),
})

export type ValidatePromocodeInput = z.infer<typeof validatePromocodeSchema>
