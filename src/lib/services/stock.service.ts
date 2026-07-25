import { KeyStatus, ProductType } from '@prisma/client'

import { encrypt, sha256 } from '../crypto'
import { AppError } from '../errors'
import { logger } from '../logger'
import { prisma, type PrismaTx } from '../prisma'

/**
 * Считает доступный остаток товара.
 * Для FILE и LINK остаток бесконечен — возвращается null.
 */
export async function getAvailableStock(productId: string, type: ProductType): Promise<number | null> {
  if (type !== ProductType.KEY) return null

  return prisma.productKey.count({
    where: { productId, status: KeyStatus.AVAILABLE },
  })
}

/** Остатки сразу по множеству товаров — одним запросом, без N+1. */
export async function getStockMap(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map()

  const grouped = await prisma.productKey.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds }, status: KeyStatus.AVAILABLE },
    _count: { _all: true },
  })

  return new Map(grouped.map((row) => [row.productId, row._count._all]))
}

/**
 * Атомарно захватывает нужное количество ключей под заказ.
 *
 * Гонки исключаются двумя механизмами:
 * 1. SELECT ... FOR UPDATE SKIP LOCKED — два параллельных заказа никогда не возьмут один ключ.
 * 2. updateMany с проверкой status = AVAILABLE — второй рубеж защиты.
 *
 * @returns список id забронированных ключей
 */
export async function reserveKeys(
  tx: PrismaTx,
  params: { productId: string; quantity: number; reservedUntil: Date },
): Promise<string[]> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM product_keys
    WHERE "productId" = ${params.productId}
      AND status = 'AVAILABLE'
    ORDER BY "createdAt" ASC
    LIMIT ${params.quantity}
    FOR UPDATE SKIP LOCKED
  `

  if (rows.length < params.quantity) {
    throw new AppError(
      'OUT_OF_STOCK',
      rows.length === 0
        ? 'Товар закончился'
        : `Доступно только ${rows.length} шт. Измените количество.`,
    )
  }

  const ids = rows.map((row) => row.id)

  const updated = await tx.productKey.updateMany({
    where: { id: { in: ids }, status: KeyStatus.AVAILABLE },
    data: { status: KeyStatus.RESERVED, reservedUntil: params.reservedUntil },
  })

  if (updated.count !== params.quantity) {
    // Недостижимо при корректной блокировке, но транзакцию откатываем в любом случае
    throw new AppError('OUT_OF_STOCK', 'Ключи были забронированы другим покупателем. Попробуйте ещё раз.')
  }

  return ids
}

/** Привязывает забронированные ключи к позиции заказа. */
export async function attachKeysToOrderItem(
  tx: PrismaTx,
  params: { keyIds: string[]; orderItemId: string },
): Promise<void> {
  await tx.productKey.updateMany({
    where: { id: { in: params.keyIds } },
    data: { orderItemId: params.orderItemId },
  })
}

/** Переводит ключи в SOLD после подтверждённой оплаты. */
export async function markKeysSold(tx: PrismaTx, orderItemId: string): Promise<void> {
  await tx.productKey.updateMany({
    where: { orderItemId, status: { in: [KeyStatus.RESERVED, KeyStatus.AVAILABLE] } },
    data: { status: KeyStatus.SOLD, soldAt: new Date(), reservedUntil: null },
  })
}

/** Возвращает ключи заказа в свободный пул (отмена или таймаут). */
export async function releaseKeysOfOrder(tx: PrismaTx, orderId: string): Promise<number> {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { id: true } })
  if (items.length === 0) return 0

  const result = await tx.productKey.updateMany({
    where: {
      orderItemId: { in: items.map((item) => item.id) },
      status: KeyStatus.RESERVED,
    },
    data: { status: KeyStatus.AVAILABLE, reservedUntil: null, orderItemId: null },
  })

  return result.count
}

/**
 * Cron-задача: возвращает в продажу ключи с истёкшим резервом.
 * Отрабатывает по индексу [status, reservedUntil].
 */
export async function releaseExpiredReservations(): Promise<number> {
  const result = await prisma.productKey.updateMany({
    where: {
      status: KeyStatus.RESERVED,
      reservedUntil: { lt: new Date() },
    },
    data: { status: KeyStatus.AVAILABLE, reservedUntil: null, orderItemId: null },
  })

  if (result.count > 0) {
    logger.info('Освобождены протухшие резервы ключей', { count: result.count })
  }

  return result.count
}

/**
 * Массовый импорт ключей из текста.
 * Дубли отсеиваются дважды: внутри пачки и по уникальному индексу БД.
 */
export async function bulkImportKeys(params: {
  productId: string
  rawKeys: string
  note?: string
  importedById: string
}): Promise<{ imported: number; skipped: number; total: number }> {
  const lines = params.rawKeys
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Не найдено ни одного ключа')
  }

  if (lines.length > 10_000) {
    throw new AppError('VALIDATION_ERROR', 'За один раз можно загрузить не более 10 000 ключей')
  }

  // Дедупликация внутри загружаемой пачки
  const seen = new Set<string>()
  const unique: Array<{ value: string; valueHash: string }> = []

  for (const line of lines) {
    const hash = sha256(line)
    if (seen.has(hash)) continue
    seen.add(hash)
    unique.push({ value: line, valueHash: hash })
  }

  const result = await prisma.productKey.createMany({
    data: unique.map((item) => ({
      productId: params.productId,
      value: encrypt(item.value),
      valueHash: item.valueHash,
      note: params.note || null,
      importedById: params.importedById,
    })),
    // Дубли по уникальному индексу [productId, valueHash] просто пропускаются
    skipDuplicates: true,
  })

  logger.info('Импорт ключей', {
    productId: params.productId,
    imported: result.count,
    total: lines.length,
  })

  return {
    imported: result.count,
    skipped: lines.length - result.count,
    total: lines.length,
  }
}
