import { NextResponse } from 'next/server'

import { handleWebhook } from '@/lib/services/webhook.service'
import { getClientIp } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/webhooks/yookassa — уведомления ЮКассы. */
export async function POST(request: Request) {
  const rawBody = await request.text()

  const result = await handleWebhook({
    provider: 'YOOKASSA',
    rawBody,
    headers: request.headers,
    ipAddress: getClientIp(request.headers),
  })

  return NextResponse.json(result.body, { status: result.status })
}
