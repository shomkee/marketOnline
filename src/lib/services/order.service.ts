import { OrderStatus, PaymentProviderCode, ProductType } from '@prisma/client'

import { generateToken } from '../crypto'
import { getAppUrl } from '../env'
import { AppError } from '../errors'
import { logger } from '../logger'
import { getProvider } from '../payments'
import { prisma, type PrismaTx } from '../prisma'
import { checkPromocode, consumePromocode, refundPromocodeUsage } from './promocode.service'
import { getSettings } from './settings.service'
import { attachKeysToOrderItem, releaseKeysOfOrder, reserveKeys } from './stock.service'

/** Генерирует следующий номер заказа вида ORD-000123. */
async function generateOrderNumber(tx: PrismaTx): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ next: bigint }>>`
    SELECT COALESCE(MAX(CAST(SUBSTRING("orderNumber" FROM 5) AS BIGINT)), 0) + 1 AS next
    FROM orders
    WHERE "orderNumber" ~ '^ORD-[0-9]+$'
  `

  const next = Number(rows[0]?.next ?? 1n)
  return `ORD-${String(next).padStart(6, '0')}`
}

export type CreateOrderResult = {
  orderId: string
  orderNumber: string
  publicToken: string
  payUrl: string
  total: number
}

/**
 * Создаёт заказ и инвойс у платёжного провайдера.
 *
 * Порядок важен:
 *   1. Транзакция: проверка товара -> захват ключей -> промокод -> создание заказа
 *   2. После commit: внешний вызов к провайдеру (медленный HTTP не должен держать транзакцию)
 *   3. При ошибке провайдера — откат: заказ отменяется, ключи возвращаются в продажу
 */
export async function createOrder(params: {
  productId: string
  quantity: number
  email: string
  promocode?: string
  provider: PaymentProviderCode
  ipAddress?: string
  userAgent?: string
}): Promise<CreateOrderResult> {
  const settings = await getSettings()
  const provider = getProvider(params.provider)

  if (!(await provider.isConfigured())) {
    throw new AppError('PROVIDER_DISABLED', 'Этот способ оплаты временно недоступен')
  }

  const expiresAt = new Date(Date.now() + settings.reservationMinutes * 60 * 1000)

  // ─── Шаг 1: транзакция создания заказа ───
  const created = await prisma.$transaction(
    async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: params.productId },
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
          currency: true,
          isActive: true,
          maxPerOrder: true,
          fileKey: true,
          linkContent: true,
        },
      })

      if (!product) {
        throw new AppError('NOT_FOUND', 'Товар не найден')
      }

      if (!product.isActive) {
        throw new AppError('PRODUCT_INACTIVE', 'Товар больше не продаётся')
      }

      if (params.quantity > product.maxPerOrder) {
        throw new AppError(
          'VALIDATION_ERROR',
          `Максимум ${product.maxPerOrder} шт. в одном заказе`,
        )
      }

      const subtotal = product.price * params.quantity

      // Промокод
      let discountAmount = 0
      let promocodeId: string | null = null
      let promocodeCode: string | null = null

      if (params.promocode) {
        const check = await checkPromocode({
          code: params.promocode,
          productId: product.id,
          subtotal,
          email: params.email,
          client: tx,
        })

        await consumePromocode(tx, check.promocodeId)

        discountAmount = check.discountAmount
        promocodeId = check.promocodeId
        promocodeCode = check.code
      }

      const total = subtotal - discountAmount

      const order = await tx.order.create({
        data: {
          orderNumber: await generateOrderNumber(tx),
          publicToken: generateToken(32),
          email: params.email,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount,
          total,
          currency: product.currency,
          promocodeId,
          promocodeCode,
          expiresAt,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent?.slice(0, 500),
          items: {
            create: {
              quantity: params.quantity,
              unitPrice: product.price,
              totalPrice: subtotal,
              productName: product.name,
              productType: product.type,
              productId: product.id,
              deliveredFileKey: product.type === ProductType.FILE ? product.fileKey : null,
            },
          },
        },
        include: { items: true },
      })

      // Захват ключей только для товаров типа KEY
      if (product.type === ProductType.KEY) {
        const keyIds = await reserveKeys(tx, {
          productId: product.id,
          quantity: params.quantity,
          reservedUntil: expiresAt,
        })

        await attachKeysToOrderItem(tx, {
          keyIds,
          orderItemId: order.items[0].id,
        })
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        publicToken: order.publicToken,
        total: order.total,
        currency: order.currency,
        productName: product.name,
        promocodeId,
      }
    },
    { timeout: 15_000, maxWait: 8_000 },
  )

  // ─── Шаг 2: инвойс у провайдера (вне транзакции) ───
  try {
    const invoice = await provider.createInvoice({
      amount: created.total,
      currency: created.currency,
      orderId: created.id,
      orderNumber: created.orderNumber,
      publicToken: created.publicToken,
      email: params.email,
      description: `${created.productName} × ${params.quantity}`,
      returnUrl: `${getAppUrl()}/order/${created.publicToken}`,
    })

    await prisma.payment.create({
      data: {
        provider: params.provider,
        externalId: invoice.externalId,
        payUrl: invoice.payUrl,
        amount: created.total,
        currency: created.currency,
        orderId: created.id,
        expiresAt: invoice.expiresAt ?? expiresAt,
        rawCreateResponse: invoice.raw as never,
      },
    })

    logger.info('Заказ создан', {
      orderNumber: created.orderNumber,
      provider: params.provider,
      total: created.total,
    })

    return {
      orderId: created.id,
      orderNumber: created.orderNumber,
      publicToken: created.publicToken,
      payUrl: invoice.payUrl,
      total: created.total,
    }
  } catch (error) {
    // ─── Шаг 3: откат — возвращаем ключи и промокод в оборот ───
    logger.error('Не удалось создать инвойс, откат заказа', {
      orderId: created.id,
      error,
    })

    await cancelOrder({ orderId: created.id, reason: 'Ошибка создания платежа' })

    throw error instanceof AppError
      ? error
      : new AppError('PAYMENT_ERROR', 'Не удалось создать платёж. Попробуйте ещё раз.')
  }
}

/** Отменяет заказ и возвращает ресурсы в оборот. Идемпотентна. */
export async function cancelOrder(params: {
  orderId: string
  reason?: string
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string; status: OrderStatus }>>`
      SELECT id, status FROM orders WHERE id = ${params.orderId} FOR UPDATE
    `

    if (locked.length === 0) return false

    // Отменить можно только неоплаченный заказ
    if (locked[0].status !== OrderStatus.PENDING) return false

    await releaseKeysOfOrder(tx, params.orderId)

    const order = await tx.order.update({
      where: { id: params.orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        adminNote: params.reason,
      },
      select: { promocodeId: true },
    })

    if (order.promocodeId) {
      await refundPromocodeUsage(tx, order.promocodeId)
    }

    await tx.payment.updateMany({
      where: { orderId: params.orderId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    })

    return true
  })
}

/** Cron: отменяет протухшие неоплаченные заказы. */
export async function cancelStaleOrders(): Promise<number> {
  const stale = await prisma.order.findMany({
    where: { status: OrderStatus.PENDING, expiresAt: { lt: new Date() } },
    select: { id: true },
    take: 200,
  })

  let cancelled = 0
  for (const order of stale) {
    const done = await cancelOrder({ orderId: order.id, reason: 'Истекло время оплаты' })
    if (done) cancelled += 1
  }

  if (cancelled > 0) {
    logger.info('Отменены протухшие заказы', { count: cancelled })
  }

  return cancelled
}

/** Отмечает заказ возвращённым (ручное действие админа). */
export async function refundOrder(params: { orderId: string; note?: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: params.orderId },
      data: {
        status: OrderStatus.REFUNDED,
        refundedAt: new Date(),
        adminNote: params.note,
      },
    })

    await tx.payment.updateMany({
      where: { orderId: params.orderId, status: 'SUCCEEDED' },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    })
  })

  logger.info('Заказ отмечен как возврат', { orderId: params.orderId })
}

/** Загружает заказ по публичному токену со всеми данными для страницы заказа. */
export async function getOrderByToken(token: string) {
  return prisma.order.findUnique({
    where: { publicToken: token },
    include: {
      items: {
        include: {
          keys: { select: { id: true, value: true } },
          product: { select: { id: true, slug: true, name: true, images: true, fileName: true } },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, provider: true, status: true, payUrl: true, createdAt: true },
      },
      reviews: { select: { productId: true } },
    },
  })
}
