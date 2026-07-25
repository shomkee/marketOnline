import { KeyStatus, OrderStatus, ProductType } from '@prisma/client'

import { decrypt } from '../crypto'
import { logger } from '../logger'
import { sendLowStockEmail, sendOrderDeliveredEmail } from '../mail/resend'
import { prisma } from '../prisma'
import { markKeysSold } from './stock.service'

export type FulfillResult = {
  /** true — выдача была выполнена именно сейчас */
  delivered: boolean
  /** true — заказ уже был выдан ранее (идемпотентный повтор) */
  alreadyDelivered: boolean
  orderId: string
}

/**
 * СЕРДЦЕ АВТОВЫДАЧИ.
 *
 * Идемпотентная функция выдачи товара. Сюда ведут три пути:
 *   1. Webhook платёжного провайдера
 *   2. Ручная выдача админом
 *   3. Повторная попытка после сбоя
 *
 * Гарантии:
 *   - Всё изменение состояния — внутри одной транзакции БД
 *   - Строка заказа блокируется через SELECT ... FOR UPDATE
 *   - Повторный вызов на уже выданном заказе НЕ выдаёт товар второй раз
 *   - Письмо и уведомления отправляются ПОСЛЕ commit
 */
export async function fulfillOrder(params: {
  orderId: string
  /** id админа при ручной выдаче */
  deliveredById?: string
  /** Сумма и валюта фактической оплаты для отметки в Payment */
  payment?: { id: string; paidAmount?: number; paidCurrency?: string; rawPayload?: unknown }
}): Promise<FulfillResult> {
  const outcome = await prisma.$transaction(
    async (tx) => {
      // Блокируем строку заказа: параллельные webhook'и выстроятся в очередь
      const locked = await tx.$queryRaw<Array<{ id: string; status: OrderStatus }>>`
        SELECT id, status FROM orders WHERE id = ${params.orderId} FOR UPDATE
      `

      if (locked.length === 0) {
        return { delivered: false, alreadyDelivered: false, notFound: true } as const
      }

      // ГЛАВНАЯ ПРОВЕРКА ИДЕМПОТЕНТНОСТИ
      if (locked[0].status === OrderStatus.DELIVERED) {
        return { delivered: false, alreadyDelivered: true, notFound: false } as const
      }

      if (locked[0].status === OrderStatus.CANCELLED || locked[0].status === OrderStatus.REFUNDED) {
        return { delivered: false, alreadyDelivered: false, notFound: false } as const
      }

      const order = await tx.order.findUniqueOrThrow({
        where: { id: params.orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  fileKey: true,
                  fileName: true,
                  linkContent: true,
                  lowStockThreshold: true,
                },
              },
              keys: { select: { id: true, value: true } },
            },
          },
        },
      })

      const emailItems: Array<{
        productName: string
        quantity: number
        keys?: string[]
        content?: string | null
        isFile: boolean
      }> = []

      const lowStockChecks: Array<{ productId: string; productName: string; threshold: number }> = []

      for (const item of order.items) {
        if (item.productType === ProductType.KEY) {
          // Ключи уже зарезервированы на этапе создания заказа — переводим их в SOLD
          await markKeysSold(tx, item.id)

          emailItems.push({
            productName: item.productName,
            quantity: item.quantity,
            keys: item.keys.map((key) => decrypt(key.value)),
            isFile: false,
          })

          if (item.product) {
            lowStockChecks.push({
              productId: item.product.id,
              productName: item.product.name,
              threshold: item.product.lowStockThreshold,
            })
          }
        } else if (item.productType === ProductType.FILE) {
          // Фиксируем ключ файла на момент выдачи: если админ потом заменит файл,
          // покупатель продолжит получать то, за что заплатил
          await tx.orderItem.update({
            where: { id: item.id },
            data: { deliveredFileKey: item.product?.fileKey ?? item.deliveredFileKey },
          })

          emailItems.push({
            productName: item.productName,
            quantity: item.quantity,
            isFile: true,
          })
        } else {
          const content = item.product?.linkContent ?? item.deliveredContent

          await tx.orderItem.update({
            where: { id: item.id },
            data: { deliveredContent: content },
          })

          emailItems.push({
            productName: item.productName,
            quantity: item.quantity,
            content,
            isFile: false,
          })
        }

        // Счётчик продаж товара — денормализация для сортировки «по популярности»
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { salesCount: { increment: item.quantity } },
          })
        }
      }

      const now = new Date()

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DELIVERED,
          paidAt: order.paidAt ?? now,
          deliveredAt: now,
          deliveredById: params.deliveredById ?? null,
        },
      })

      if (params.payment) {
        await tx.payment.update({
          where: { id: params.payment.id },
          data: {
            status: 'SUCCEEDED',
            paidAt: now,
            paidAmount: params.payment.paidAmount ?? null,
            paidCurrency: params.payment.paidCurrency ?? null,
            rawWebhookPayload: (params.payment.rawPayload ?? undefined) as never,
          },
        })
      }

      return {
        delivered: true,
        alreadyDelivered: false,
        notFound: false,
        email: order.email,
        orderNumber: order.orderNumber,
        publicToken: order.publicToken,
        emailItems,
        lowStockChecks,
      } as const
    },
    { timeout: 20_000, maxWait: 10_000 },
  )

  if (outcome.notFound) {
    logger.error('Заказ для выдачи не найден', { orderId: params.orderId })
    return { delivered: false, alreadyDelivered: false, orderId: params.orderId }
  }

  if (!outcome.delivered) {
    return {
      delivered: false,
      alreadyDelivered: outcome.alreadyDelivered,
      orderId: params.orderId,
    }
  }

  // ─── Побочные эффекты ПОСЛЕ commit ───
  const sent = await sendOrderDeliveredEmail({
    to: outcome.email,
    orderNumber: outcome.orderNumber,
    publicToken: outcome.publicToken,
    items: outcome.emailItems,
  })

  if (sent) {
    await prisma.order.update({
      where: { id: params.orderId },
      data: { emailSentAt: new Date() },
    })
  }

  // Проверка низкого остатка после продажи
  for (const check of outcome.lowStockChecks) {
    const remaining = await prisma.productKey.count({
      where: { productId: check.productId, status: KeyStatus.AVAILABLE },
    })

    if (remaining <= check.threshold) {
      await sendLowStockEmail({
        productId: check.productId,
        productName: check.productName,
        remaining,
      })
    }
  }

  logger.info('Заказ выдан', {
    orderId: params.orderId,
    orderNumber: outcome.orderNumber,
    manual: Boolean(params.deliveredById),
  })

  return { delivered: true, alreadyDelivered: false, orderId: params.orderId }
}
