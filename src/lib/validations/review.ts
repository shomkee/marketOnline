import { z } from 'zod'

/** Отзыв покупателя. Оставить можно только по выданному заказу. */
export const createReviewSchema = z.object({
  orderToken: z.string().min(16, 'Некорректный токен заказа'),
  productId: z.string().min(1),
  rating: z.coerce
    .number()
    .int('Оценка должна быть целым числом')
    .min(1, 'Минимальная оценка — 1')
    .max(5, 'Максимальная оценка — 5'),
  authorName: z.string().trim().min(2, 'Имя от 2 символов').max(60, 'Имя до 60 символов'),
  comment: z
    .string()
    .trim()
    .min(10, 'Отзыв от 10 символов')
    .max(2000, 'Отзыв до 2000 символов'),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>

/** Модерация отзыва админом. */
export const moderateReviewSchema = z.object({
  reviewId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING']),
  adminReply: z.string().trim().max(1000).optional().or(z.literal('')),
})

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>
