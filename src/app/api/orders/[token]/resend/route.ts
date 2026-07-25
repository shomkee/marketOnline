import { OrderStatus, ProductType } from '@prisma/client'
import { NextResponse } from 'next/server'

import { decrypt } from '@/lib/crypto'
import { toPublicError } from '@/lib/errors'
import { sendOrderDeliveredEmail } from '@/lib/mail/resend'
import { prisma } from '@/lib/prisma'
import { enforce, RATE_LIMITS } from '@/lib/rate-limit'
import { getSettings } from '@/lib/services/settings.service'
import { getClientIp } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/orders/[token]/resend — повторная отправка товара на почту. */
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const ip = getClientIp(request.headers)

  try {
    enforce(`resend:${params.token}:${ip}`, RATE_LIMITS.resendEmail)

    const settings = await getSettings()

    const order = await prisma.order.findUnique({
      where: { publicToken: params.token },
      include: {
        items: {
          include: { keys: { select: { value: true } } },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }

    if (order.status !== OrderStatus.DELIVERED) {
      return NextResponse.json({ error: 'Товар ещё не выдан' }, { status: 409 })
    }

    if (order.emailResendCount >= settings.maxEmailResends) {
      return NextResponse.json(
        { error: 'Достигнут лимит повторных отправок. Напишите в поддержку.' },
        { status: 429 },
      )
    }

    const sent = await sendOrderDeliveredEmail({
      to: order.email,
      orderNumber: order.orderNumber,
      publicToken: order.publicToken,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        keys:
          item.productType === ProductType.KEY
            ? item.keys.map((key) => decrypt(key.value))
            : undefined,
        content: item.deliveredContent,
        isFile: item.productType === ProductType.FILE,
      })),
    })

    if (!sent) {
      return NextResponse.json(
        { error: 'Почтовый сервис недоступен. Попробуйте позже.' },
        { status: 502 },
      )
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { emailSentAt: new Date(), emailResendCount: { increment: 1 } },
    })

    return NextResponse.json({ ok: true, email: order.email })
  } catch (error) {
    const publicError = toPublicError(error)
    return NextResponse.json({ error: publicError.message }, { status: publicError.status })
  }
}
