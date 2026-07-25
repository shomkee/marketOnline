'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth'
import { toPublicError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { fulfillOrder } from '@/lib/services/fulfillment.service'
import { cancelOrder, refundOrder } from '@/lib/services/order.service'

import type { ActionResult } from './product.actions'

/** Ручная выдача заказа админом (например, при оплате мимо платёжки). */
export async function fulfillOrderAction(orderId: string): Promise<ActionResult> {
  try {
    const session = await requireAdmin()

    const result = await fulfillOrder({ orderId, deliveredById: session.user.id })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return {
      ok: true,
      message: result.alreadyDelivered ? 'Заказ уже был выдан ранее' : 'Товар выдан и отправлен на почту',
    }
  } catch (error) {
    logger.error('fulfillOrderAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Отмена заказа с освобождением забронированных ключей. */
export async function cancelOrderAction(orderId: string, reason?: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    await cancelOrder({ orderId, reason })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return { ok: true, message: 'Заказ отменён' }
  } catch (error) {
    logger.error('cancelOrderAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Отметка возврата средств. */
export async function refundOrderAction(orderId: string, note?: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    await refundOrder({ orderId, note })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return { ok: true, message: 'Заказ отмечен как возврат' }
  } catch (error) {
    logger.error('refundOrderAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Сохранение внутренней заметки к заказу. */
export async function saveOrderNoteAction(orderId: string, note: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    await prisma.order.update({ where: { id: orderId }, data: { adminNote: note || null } })

    revalidatePath(`/admin/orders/${orderId}`)

    return { ok: true, message: 'Заметка сохранена' }
  } catch (error) {
    logger.error('saveOrderNoteAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}
