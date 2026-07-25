'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth'
import { toPublicError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { recalcProductRating } from '@/lib/services/stats.service'
import { moderateReviewSchema } from '@/lib/validations/review'

import type { ActionResult } from './product.actions'

/** Модерация отзыва: одобрить / отклонить и ответить. */
export async function moderateReviewAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = moderateReviewSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }
    }

    const { reviewId, status, adminReply } = parsed.data

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { status, adminReply: adminReply || null },
      select: { productId: true, product: { select: { slug: true } } },
    })

    // Рейтинг считается только по одобренным отзывам
    await recalcProductRating(review.productId)

    revalidatePath('/admin/reviews')
    revalidatePath(`/product/${review.product.slug}`)

    return { ok: true, message: status === 'APPROVED' ? 'Отзыв опубликован' : 'Отзыв отклонён' }
  } catch (error) {
    logger.error('moderateReviewAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Удаление отзыва. */
export async function deleteReviewAction(reviewId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const review = await prisma.review.delete({
      where: { id: reviewId },
      select: { productId: true, product: { select: { slug: true } } },
    })

    await recalcProductRating(review.productId)

    revalidatePath('/admin/reviews')
    revalidatePath(`/product/${review.product.slug}`)

    return { ok: true, message: 'Отзыв удалён' }
  } catch (error) {
    logger.error('deleteReviewAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}
