import { z } from 'zod'

/** Email с нормализацией — общая схема для клиента и сервера. */
export const emailSchema = z
  .string()
  .min(1, 'Укажите email')
  .email('Некорректный email')
  .max(254, 'Email слишком длинный')
  .transform((value) => value.trim().toLowerCase())

/** Создание заказа. */
export const createOrderSchema = z.object({
  productId: z.string().min(1, 'Товар не выбран'),
  quantity: z
    .number({ invalid_type_error: 'Количество должно быть числом' })
    .int('Количество должно быть целым')
    .min(1, 'Минимальное количество — 1')
    .max(100, 'Слишком большое количество')
    .default(1),
  email: emailSchema,
  promocode: z
    .string()
    .trim()
    .max(64, 'Слишком длинный промокод')
    .optional()
    .transform((value) => (value ? value.toUpperCase() : undefined)),
  provider: z.enum(['CRYPTOBOT', 'YOOKASSA'], {
    errorMap: () => ({ message: 'Выберите способ оплаты' }),
  }),
  /** Согласие с условиями — обязательно для оферты */
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Нужно принять условия покупки' }),
  }),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

/** Повторная отправка письма. */
export const resendEmailSchema = z.object({
  token: z.string().min(16, 'Некорректный токен заказа'),
})

/** Фильтры списка заказов в админке. */
export const orderFiltersSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  email: z.string().trim().max(254).optional(),
  productId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
})

export type OrderFilters = z.infer<typeof orderFiltersSchema>
