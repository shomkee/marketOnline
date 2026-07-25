import { NextResponse } from 'next/server'

import { toPublicError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { enforce, RATE_LIMITS } from '@/lib/rate-limit'
import { createOrder } from '@/lib/services/order.service'
import { getSettings } from '@/lib/services/settings.service'
import { getClientIp, normalizeEmail } from '@/lib/utils'
import { createOrderSchema } from '@/lib/validations/order'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/orders — создание заказа и инвойса. */
export async function POST(request: Request) {
  const ip = getClientIp(request.headers)

  try {
    const settings = await getSettings()
    if (settings.maintenanceMode) {
      return NextResponse.json(
        { error: settings.maintenanceMessage || 'Магазин временно на техническом обслуживании' },
        { status: 503 },
      )
    }

    // Рейт-лимит по IP: защита от спама заказами и вычерпывания склада резервами
    enforce(`order:${ip}`, RATE_LIMITS.createOrder)

    const json = await request.json()
    const input = createOrderSchema.parse(json)

    const result = await createOrder({
      productId: input.productId,
      quantity: input.quantity,
      email: normalizeEmail(input.email),
      promocode: input.promocode,
      provider: input.provider,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({
      orderNumber: result.orderNumber,
      publicToken: result.publicToken,
      payUrl: result.payUrl,
      total: result.total,
    })
  } catch (error) {
    const publicError = toPublicError(error)
    if (publicError.status >= 500) {
      logger.error('Ошибка создания заказа', { error, ip })
    }
    return NextResponse.json({ error: publicError.message }, { status: publicError.status })
  }
}
