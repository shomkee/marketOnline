import { NextResponse } from 'next/server'

import { toPublicError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { enforce, RATE_LIMITS } from '@/lib/rate-limit'
import { checkPromocode } from '@/lib/services/promocode.service'
import { getClientIp, normalizeEmail } from '@/lib/utils'
import { validatePromocodeSchema } from '@/lib/validations/promocode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/promocode/validate — предпросмотр скидки без создания заказа. */
export async function POST(request: Request) {
  const ip = getClientIp(request.headers)

  try {
    enforce(`promo:${ip}`, RATE_LIMITS.validatePromocode)

    const input = validatePromocodeSchema.parse(await request.json())

    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { price: true, isActive: true },
    })

    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    const subtotal = product.price * input.quantity

    const result = await checkPromocode({
      code: input.code,
      productId: input.productId,
      subtotal,
      email: input.email ? normalizeEmail(input.email) : undefined,
    })

    return NextResponse.json({
      code: result.code,
      discountAmount: result.discountAmount,
      discountLabel: result.discountLabel,
      subtotal,
      total: subtotal - result.discountAmount,
    })
  } catch (error) {
    const publicError = toPublicError(error)
    return NextResponse.json({ error: publicError.message }, { status: publicError.status })
  }
}
