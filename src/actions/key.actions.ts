'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth'
import { toPublicError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { bulkImportKeys } from '@/lib/services/stock.service'
import { bulkKeysSchema } from '@/lib/validations/product'

import type { ActionResult } from './product.actions'

/** Массовая загрузка ключей текстом или из .txt-файла. */
export async function bulkImportKeysAction(
  input: unknown,
): Promise<ActionResult<{ imported: number; duplicates: number; total: number }>> {
  try {
    const session = await requireAdmin()

    const parsed = bulkKeysSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }
    }

    const result = await bulkImportKeys({
      productId: parsed.data.productId,
      rawKeys: parsed.data.keys,
      note: parsed.data.note,
      importedById: session.user.id,
    })

    revalidatePath(`/admin/products/${parsed.data.productId}`)
    revalidatePath('/admin/products')
    revalidatePath('/catalog')

    return {
      ok: true,
      data: result,
      message: `Добавлено ключей: ${result.imported}, дубликатов пропущено: ${result.duplicates}`,
    }
  } catch (error) {
    logger.error('bulkImportKeysAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Удаление непроданного ключа. */
export async function deleteKeyAction(keyId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const key = await prisma.productKey.findUnique({
      where: { id: keyId },
      select: { id: true, status: true, productId: true },
    })

    if (!key) return { ok: false, error: 'Ключ не найден' }
    if (key.status === 'SOLD') return { ok: false, error: 'Проданный ключ удалить нельзя' }

    await prisma.productKey.delete({ where: { id: keyId } })

    revalidatePath(`/admin/products/${key.productId}`)

    return { ok: true, message: 'Ключ удалён' }
  } catch (error) {
    logger.error('deleteKeyAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Отключение / возврат ключа в продажу. */
export async function toggleKeyDisabledAction(keyId: string, disabled: boolean): Promise<ActionResult> {
  try {
    await requireAdmin()

    const key = await prisma.productKey.findUnique({
      where: { id: keyId },
      select: { id: true, status: true, productId: true },
    })

    if (!key) return { ok: false, error: 'Ключ не найден' }
    if (key.status === 'SOLD' || key.status === 'RESERVED') {
      return { ok: false, error: 'Ключ участвует в заказе' }
    }

    await prisma.productKey.update({
      where: { id: keyId },
      data: { status: disabled ? 'DISABLED' : 'AVAILABLE' },
    })

    revalidatePath(`/admin/products/${key.productId}`)
    revalidatePath('/catalog')

    return { ok: true, message: disabled ? 'Ключ отключён' : 'Ключ снова в продаже' }
  } catch (error) {
    logger.error('toggleKeyDisabledAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}
