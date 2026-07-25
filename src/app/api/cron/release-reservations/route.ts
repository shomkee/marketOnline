import { NextResponse } from 'next/server'

import { getEnv } from '@/lib/env'
import { releaseExpiredReservations } from '@/lib/services/stock.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/cron/release-reservations — возвращает в продажу ключи с истёкшим резервом. */
export async function GET(request: Request) {
  const env = getEnv()
  const auth = request.headers.get('authorization')

  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const released = await releaseExpiredReservations()

  return NextResponse.json({ ok: true, released })
}
