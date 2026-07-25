import { NextResponse } from 'next/server'

import { handleWebhook } from '@/lib/services/webhook.service'
import { getClientIp } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/cryptobot
 *
 * Важно: читаем ИМЕННО сырое тело — подпись считается по нему байт-в-байт.
 * JSON.parse + JSON.stringify сломает проверку подписи.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()

  const result = await handleWebhook({
    provider: 'CRYPTOBOT',
    rawBody,
    headers: request.headers,
    ipAddress: getClientIp(request.headers),
  })

  return NextResponse.json(result.body, { status: result.status })
}
