import { DiscountType, OrderStatus } from '@prisma/client'

import { AppError } from '../errors'
import { prisma, type PrismaTx } from '../prisma'

export type PromocodeCheckResult = {
  promocodeId: string
  code: string
  discountAmount: number
  discountLabel: string
}

/**
 * Проверяет промокод и считает размер скидки в копейках.
 * Ничего не меняет в БД — используется и для предпросмотра на витрине, и внутри транзакции заказа.
 */
export async function checkPromocode(params: {
  code: string
  productId: string
  subtotal: number
  email?: string
  client?: PrismaTx
}): Promise<PromocodeCheckResult> {
  const db = params.client ?? prisma
  const code = params.code.trim().toUpperCase()

  const promocode = await db.promocode.findUnique({
    where: { code },
    include: { products: { select: { id: true } } },
  })

  if (!promocode || !promocode.isActive) {
    throw new AppError('PROMOCODE_INVALID', 'Промокод не найден')
  }

  const now = new Date()

  if (promocode.validFrom > now) {
    throw new AppError('PROMOCODE_EXPIRED', 'Промокод ещё не активен')
  }

  if (promocode.validUntil && promocode.validUntil < now) {
    throw new AppError('PROMOCODE_EXPIRED', 'Срок действия промокода истёк')
  }

  if (promocode.usageLimit !== null && promocode.usedCount >= promocode.usageLimit) {
    throw new AppError('PROMOCODE_LIMIT', 'Лимит использований промокода исчерпан')
  }

  // Ограничение по товарам
  if (promocode.products.length > 0) {
    const allowed = promocode.products.some((product) => product.id === params.productId)
    if (!allowed) {
      throw new AppError('PROMOCODE_INVALID', 'Промокод не действует на этот товар')
    }
  }

  // Минимальная сумма заказа
  if (promocode.minOrderAmount && params.subtotal < promocode.minOrderAmount) {
    const minRubles = (promocode.minOrderAmount / 100).toFixed(0)
    throw new AppError('PROMOCODE_INVALID', `Промокод действует от ${minRubles} ₽`)
  }

  // Лимит на один email
  if (params.email && promocode.perEmailLimit) {
    const usedByEmail = await db.order.count({
      where: {
        promocodeId: promocode.id,
        email: params.email,
        status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.PENDING] },
      },
    })

    if (usedByEmail >= promocode.perEmailLimit) {
      throw new AppError('PROMOCODE_LIMIT', 'Вы уже использовали этот промокод')
    }
  }

  // Расчёт скидки
  let discountAmount: number
  let discountLabel: string

  if (promocode.discountType === DiscountType.PERCENT) {
    discountAmount = Math.floor((params.subtotal * promocode.discountValue) / 100)
    if (promocode.maxDiscount) {
      discountAmount = Math.min(discountAmount, promocode.maxDiscount)
    }
    discountLabel = `-${promocode.discountValue}%`
  } else {
    discountAmount = promocode.discountValue
    discountLabel = `-${(promocode.discountValue / 100).toFixed(0)} ₽`
  }

  // Скидка не может превышать сумму заказа минус 1 рубль:
  // бесплатные заказы нельзя провести через платёжный шлюз
  discountAmount = Math.min(discountAmount, params.subtotal - 100)
  discountAmount = Math.max(discountAmount, 0)

  return {
    promocodeId: promocode.id,
    code: promocode.code,
    discountAmount,
    discountLabel,
  }
}

/**
 * Атомарно инкрементирует счётчик использований с проверкой лимита.
 * Вызывается только внутри транзакции создания заказа.
 */
export async function consumePromocode(tx: PrismaTx, promocodeId: string): Promise<void> {
  // updateMany с условием — единственный способ проверить лимит без гонки
  const promocode = await tx.promocode.findUnique({
    where: { id: promocodeId },
    select: { usageLimit: true },
  })

  if (!promocode) {
    throw new AppError('PROMOCODE_INVALID', 'Промокод больше недоступен')
  }

  const result = await tx.promocode.updateMany({
    where:
      promocode.usageLimit === null
        ? { id: promocodeId }
        : { id: promocodeId, usedCount: { lt: promocode.usageLimit } },
    data: { usedCount: { increment: 1 } },
  })

  if (result.count === 0) {
    throw new AppError('PROMOCODE_LIMIT', 'Лимит использований промокода исчерпан')
  }
}

/** Возвращает использование промокода при отмене заказа. */
export async function refundPromocodeUsage(tx: PrismaTx, promocodeId: string): Promise<void> {
  await tx.promocode.updateMany({
    where: { id: promocodeId, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  })
}
