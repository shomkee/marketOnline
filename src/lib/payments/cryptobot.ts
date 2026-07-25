import { PaymentProviderCode } from '@prisma/client'

import { hmacSha256, safeEqual } from '../crypto'
import { getEnv } from '../env'
import { AppError } from '../errors'
import { logger } from '../logger'
import { getSettings, getProviderSecret } from '../services/settings.service'
import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  ParsedWebhookEvent,
  PaymentProvider,
} from './types'

type CryptoBotInvoice = {
  invoice_id: number
  status: string
  hash: string
  asset?: string
  amount: string
  bot_invoice_url?: string
  pay_url?: string
  expiration_date?: string
  paid_at?: string
}

type CryptoBotResponse<T> = {
  ok: boolean
  result?: T
  error?: { code: number; name: string }
}

/**
 * Провайдер CryptoBot (Crypto Pay API).
 *
 * Сумма заказа хранится в рублёвых копейках, а инвойс выставляется в криптоактиве,
 * поэтому применяется курс из CRYPTOBOT_RUB_RATE.
 */
class CryptoBotProvider implements PaymentProvider {
  readonly code = PaymentProviderCode.CRYPTOBOT
  readonly title = 'CryptoBot'
  readonly description = 'Оплата криптовалютой через Telegram'

  private async getToken(): Promise<string> {
    const token = await getProviderSecret('CRYPTOBOT')
    if (!token) {
      throw new AppError('PROVIDER_DISABLED', 'Оплата криптовалютой временно недоступна')
    }
    return token
  }

  async isConfigured(): Promise<boolean> {
    const settings = await getSettings()
    const token = await getProviderSecret('CRYPTOBOT')
    return Boolean(token) && settings.cryptobotEnabled
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const env = getEnv()
    const token = await this.getToken()

    const response = await fetch(`${env.CRYPTOBOT_API_URL}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Crypto-Pay-API-Token': token,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const json = (await response.json()) as CryptoBotResponse<T>

    if (!response.ok || !json.ok || !json.result) {
      logger.error('CryptoBot вернул ошибку', { method, status: response.status, error: json.error })
      throw new AppError('PAYMENT_ERROR', 'Не удалось создать счёт на оплату. Попробуйте другой способ.')
    }

    return json.result
  }

  async createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    const env = getEnv()

    // Переводим копейки -> рубли -> криптоактив
    const rubles = input.amount / 100
    const cryptoAmount = (rubles / env.CRYPTOBOT_RUB_RATE).toFixed(6)

    const invoice = await this.request<CryptoBotInvoice>('createInvoice', {
      asset: env.CRYPTOBOT_ASSET,
      amount: cryptoAmount,
      description: input.description.slice(0, 1024),
      hidden_message: `Заказ ${input.orderNumber}`,
      paid_btn_name: 'callback',
      paid_btn_url: input.returnUrl,
      payload: JSON.stringify({ orderId: input.orderId, token: input.publicToken }),
      allow_comments: false,
      allow_anonymous: true,
      expires_in: 900, // 15 минут, совпадает с окном резерва ключей
    })

    const payUrl = invoice.bot_invoice_url ?? invoice.pay_url
    if (!payUrl) {
      throw new AppError('PAYMENT_ERROR', 'Провайдер не вернул ссылку на оплату')
    }

    return {
      externalId: String(invoice.invoice_id),
      payUrl,
      raw: invoice as unknown,
      expiresAt: invoice.expiration_date ? new Date(invoice.expiration_date) : undefined,
    }
  }

  /**
   * Подпись CryptoBot: HMAC-SHA256 от сырого тела,
   * где ключ = SHA256(токен приложения). Передаётся в crypto-pay-api-signature.
   */
  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    const signature = headers.get('crypto-pay-api-signature')
    if (!signature) return false

    const token = await this.getToken()
    const crypto = await import('crypto')
    const secret = crypto.createHash('sha256').update(token).digest()
    const expected = hmacSha256(secret, rawBody)

    return safeEqual(signature, expected)
  }

  parseWebhook(payload: unknown): ParsedWebhookEvent | null {
    const body = payload as {
      update_id?: number
      update_type?: string
      payload?: CryptoBotInvoice
    }

    if (!body?.payload?.invoice_id) return null

    const invoice = body.payload
    const isPaid = body.update_type === 'invoice_paid' || invoice.status === 'paid'

    return {
      eventId: String(body.update_id ?? `${invoice.invoice_id}-${invoice.status}`),
      eventType: body.update_type ?? 'unknown',
      externalId: String(invoice.invoice_id),
      status: isPaid ? 'succeeded' : invoice.status === 'expired' ? 'expired' : 'pending',
      paidCurrency: invoice.asset,
    }
  }
}

export const cryptobotProvider = new CryptoBotProvider()
