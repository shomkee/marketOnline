import { OrderStatus, ProductType } from '@prisma/client'
import { NextResponse } from 'next/server'

import { toPublicError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { enforce, RATE_LIMITS } from '@/lib/rate-limit'
import { getPresignedDownloadUrl } from '@/lib/s3'
import { getSettings } from '@/lib/services/settings.service'
import { getClientIp } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/download/[token]?item=<orderItemId>
 *
 * Файл НИКОГДА не отдаётся напрямую: генерируется подписанная ссылка с коротким TTL.
 * Ключ объекта в S3 никогда не попадает в клиентский код.
 */
export async function GET(request: Request, { params }: { params: { token: string } }) {
  const ip = getClientIp(request.headers)

  try {
    enforce(`download:${ip}`, RATE_LIMITS.download)

    const itemId = new URL(request.url).searchParams.get('item')
    const settings = await getSettings()

    const order = await prisma.order.findUnique({
      where: { publicToken: params.token },
      select: {
        id: true,
        status: true,
        items: {
          select: {
            id: true,
            productType: true,
            deliveredFileKey: true,
            productName: true,
            product: { select: { fileName: true, fileKey: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }

    if (order.status !== OrderStatus.DELIVERED) {
      return NextResponse.json({ error: 'Товар ещё не выдан' }, { status: 403 })
    }

    const item = itemId
      ? order.items.find((candidate) => candidate.id === itemId)
      : order.items.find((candidate) => candidate.productType === ProductType.FILE)

    if (!item || item.productType !== ProductType.FILE) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    const fileKey = item.deliveredFileKey ?? item.product?.fileKey

    if (!fileKey) {
      logger.error('У выданного товара нет файла', { orderId: order.id, itemId: item.id })
      return NextResponse.json({ error: 'Файл недоступен, напишите в поддержку' }, { status: 500 })
    }

    const url = await getPresignedDownloadUrl({
      key: fileKey,
      fileName: item.product?.fileName ?? `${item.productName}.zip`,
      ttlSeconds: settings.downloadTtlSeconds,
    })

    await prisma.orderItem.update({
      where: { id: item.id },
      data: { downloadCount: { increment: 1 } },
    })

    return NextResponse.redirect(url, 302)
  } catch (error) {
    const publicError = toPublicError(error)
    return NextResponse.json({ error: publicError.message }, { status: publicError.status })
  }
}
