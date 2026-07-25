import { OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { toPublicError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { enforce, RATE_LIMITS } from '@/lib/rate-limit'
import { getSettings } from '@/lib/services/settings.service'
import { recalcProductRating } from '@/lib/services/stats.service'
import { getClientIp } from '@/lib/utils'
import { createReviewSchema } from '@/lib/validations/review'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/reviews — отзыв можно оставить только по выданному заказу. */
export async function POST(request: Request) {
  const ip = getClientIp(request.headers)

  try {
    enforce(`review:${ip}`, RATE_LIMITS.createReview)

    const input = createReviewSchema.parse(await request.json())
    const settings = await getSettings()

    const order = await prisma.order.findUnique({
      where: { publicToken: input.orderToken },
      select: {
        id: true,
        status: true,
        email: true,
        items: { select: { productId: true } },
      },
    })

    if (!order || order.status !== OrderStatus.DELIVERED) {
      return NextResponse.json(
        { error: 'Отзыв можно оставить только после получения товара' },
        { status: 403 },
      )
    }

    const bought = order.items.some((item) => item.productId === input.productId)
    if (!bought) {
      return NextResponse.json({ error: 'Этого товара нет в заказе' }, { status: 403 })
    }

    const existing = await prisma.review.findUnique({
      where: { orderId_productId: { orderId: order.id, productId: input.productId } },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: 'Вы уже оставили отзыв о этом товаре' }, { status: 409 })
    }

    const status = settings.reviewsModerated ? 'PENDING' : 'APPROVED'

    await prisma.review.create({
      data: {
        productId: input.productId,
        orderId: order.id,
        rating: input.rating,
        authorName: input.authorName,
        email: order.email,
        comment: input.comment,
        status,
        isVerified: true,
      },
    })

    if (status === 'APPROVED') {
      await recalcProductRating(input.productId)
      revalidatePath('/catalog')
    }

    return NextResponse.json({
      ok: true,
      moderated: settings.reviewsModerated,
      message: settings.reviewsModerated
        ? 'Спасибо! Отзыв появится после модерации.'
        : 'Спасибо за отзыв!',
    })
  } catch (error) {
    const publicError = toPublicError(error)
    return NextResponse.json({ error: publicError.message }, { status: publicError.status })
  }
}
