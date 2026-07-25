'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth'
import { toPublicError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { promocodeSchema } from '@/lib/validations/promocode'

import type { ActionResult } from './product.actions'

/** Создание промокода. */
export async function createPromocodeAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = promocodeSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message
      return { ok: false, error: 'Проверьте поля формы', fieldErrors }
    }

    const data = parsed.data

    await prisma.promocode.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? null,
        perEmailLimit: data.perEmailLimit ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        isActive: data.isActive,
        products: data.productIds.length > 0 ? { connect: data.productIds.map((id) => ({ id })) } : undefined,
      },
    })

    revalidatePath('/admin/promocodes')

    return { ok: true, message: 'Промокод создан' }
  } catch (error) {
    logger.error('createPromocodeAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Обновление промокода. */
export async function updatePromocodeAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = promocodeSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message
      return { ok: false, error: 'Проверьте поля формы', fieldErrors }
    }

    const data = parsed.data

    await prisma.promocode.update({
      where: { id },
      data: {
        code: data.code.toUpperCase(),
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? null,
        perEmailLimit: data.perEmailLimit ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        isActive: data.isActive,
        products: { set: data.productIds.map((productId) => ({ id: productId })) },
      },
    })

    revalidatePath('/admin/promocodes')

    return { ok: true, message: 'Промокод обновлён' }
  } catch (error) {
    logger.error('updatePromocodeAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Удаление промокода. */
export async function deletePromocodeAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    await prisma.promocode.delete({ where: { id } })

    revalidatePath('/admin/promocodes')

    return { ok: true, message: 'Промокод удалён' }
  } catch (error) {
    logger.error('deletePromocodeAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}
