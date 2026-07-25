import { PaymentProviderCode } from '@prisma/client'

import { AppError } from '../errors'
import { logger } from '../logger'
import { getSettings, getProviderSecret, getYookassaShopId } from '../services/settings.service'
import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  ParsedWebhookEvent,
  PaymentProvider,
} from './types'

const API_URL = 'https://api.yookassa.ru/v3'

/**
 * Диапазоны IP ЮKassa. Вебхуки ЮKassa не подписываются, поэтому подлинность
 * подтверждается двумя способами: проверкой IP и обратным запросом статуса платежа.
 */
const ALLOWED_IP_PREFIXES = [
  '185.71.76.',
  '185.71.77.',
  '77.75.153.',
  '77.75.156.',
  '77.75.154.',
  '77.75.155.',
  '2a02:5180:',
]

type YooKassaPayment = {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  paid: boolean
  amount: { value: string; currency: string }
  confirmation?: { type: string; confirmation_url?: string }
  metadata?: Record<string, string>
  expires_at?: string
}

class YooKassaProvider implements PaymentProvider {
  readonly code = PaymentProviderCode.YOOKASSA
  readonly title = 'ЮKassa'
  readonly description = 'Карты, SBP, ЮMoney'

  private async getAuthHeader(): Promise<string> {
    const shopId = await getYookassaShopId()
    const secret = await getProviderSecret('YOOKASSA')

    if (!shopId || !secret) {
      throw new AppError('PROVIDER_DISABLED', 'Оплата картой временно недоступна')
    }

    return `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`
  }

  async isConfigured(): Promise<boolean> {
    const settings = await getSettings()
    const shopId = await getYookassaShopId()
    const secret = await getProviderSecret('YOOKASSA')
    return Boolean(shopId && secret) && settings.yookassaEnabled
  }

  async createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    const authorization = await this.getAuthHeader()

    const response = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        // Ключ идемпотентности: повторный запрос по тому же заказу
        // не создаст второй платёж на стороне ЮKassa
        'Idempotence-Key': `order-${input.orderId}-${Math.floor(Date.now() / 60000)}`,
      },
      body: JSON.stringify({
        amount: {
          value: (input.amount / 100).toFixed(2),
          currency: input.currency,
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: input.returnUrl,
        },
        description: input.description.slice(0, 128),
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          publicToken: input.publicToken,
        },
        receipt: {
          customer: { email: input.email },
          items: [
            {
              description: input.description.slice(0, 128),
              quantity: '1.00',
              amount: {
                value: (input.amount / 100).toFixed(2),
                currency: input.currency,
              },
              vat_code: 1, // без НДС
              payment_mode: 'full_payment',
              payment_subject: 'service',
            },
          ],
        },
      }),
      cache: 'no-store',
    })

    const json = (await response.json()) as YooKassaPayment & { description?: string }

    if (!response.ok || !json.id) {
      logger.error('ЮKassa вернула ошибку', { status: response.status, body: json })
      throw new AppError('PAYMENT_ERROR', 'Не удалось создать платёж. Попробуйте ещё раз.')
    }

    const payUrl = json.confirmation?.confirmation_url
    if (!payUrl) {
      throw new AppError('PAYMENT_ERROR', 'Провайдер не вернул ссылку на оплату')
    }

    return {
      externalId: json.id,
      payUrl,
      raw: json as unknown,
      expiresAt: json.expires_at ? new Date(json.expires_at) : undefined,
    }
  }

  /**
   * Проверка подлинности: IP из диапазона ЮKassa + обратный запрос статуса.
   * Обратный запрос — главная гарантия: даже если IP подделан,
   * выдача произойдёт только при реальном статусе succeeded в API.
   */
  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    const forwarded = headers.get('x-forwarded-for') ?? ''
    const ip = forwarded.split(',')[0].trim()

    const ipAllowed = ALLOWED_IP_PREFIXES.some((prefix) => ip.startsWith(prefix))
    if (!ipAllowed && process.env.NODE_ENV === 'production') {
      logger.warn('Webhook ЮKassa с недоверенного IP', { ip })
      return false
    }

    try {
      const parsed = JSON.parse(rawBody) as { object?: { id?: string; status?: string } }
      const paymentId = parsed.object?.id
      if (!paymentId) return false

      // Обратный запрос: спрашиваем у ЮKassa реальный статус платежа
      const authorization = await this.getAuthHeader()
      const response = await fetch(`${API_URL}/payments/${paymentId}`, {
        headers: { Authorization: authorization },
        cache: 'no-store',
      })

      if (!response.ok) return false

      const actual = (await response.json()) as YooKassaPayment
      return actual.status === parsed.object?.status
    } catch (error) {
      logger.error('Ошибка проверки webhook ЮKassa', { error })
      return false
    }
  }

  parseWebhook(payload: unknown): ParsedWebhookEvent | null {
    const body = payload as {
      type?: string
      event?: string
      object?: YooKassaPayment
    }

    const payment = body?.object
    if (!payment?.id) return null

    const statusMap: Record<string, ParsedWebhookEvent['status']> = {
      'payment.succeeded': 'succeeded',
      'payment.canceled': 'failed',
      'payment.waiting_for_capture': 'pending',
      'refund.succeeded': 'refunded',
    }

    return {
      // ЮKassa не присылает отдельный event_id, поэтому собираем его из id + события
      eventId: `${payment.id}:${body.event ?? 'unknown'}`,
      eventType: body.event ?? 'unknown',
      externalId: payment.id,
      status: statusMap[body.event ?? ''] ?? 'pending',
      paidAmount: payment.amount ? Math.round(parseFloat(payment.amount.value) * 100) : undefined,
      paidCurrency: payment.amount?.currency,
    }
  }
}

export const yookassaProvider = new YooKassaProvider()
