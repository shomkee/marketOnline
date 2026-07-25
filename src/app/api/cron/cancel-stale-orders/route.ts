import { NextResponse } from 'next/server'

import { getEnv } from '@/lib/env'
import { cancelStaleOrders } from '@/lib/services/order.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/cron/cancel-stale-orders — отменяет неоплаченные заказы с истёкшим сроком. */
export async function GET(request: Request) {
  const env = getEnv()
  const auth = request.headers.get('authorization')

  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cancelled = await cancelStaleOrders()

  return NextResponse.json({ ok: true, cancelled })
}
