import type { PaymentProviderCode } from '@prisma/client'

/** Данные для создания инвойса у провайдера. */
export type CreateInvoiceInput = {
  /** Сумма в минорных единицах (копейках) */
  amount: number
  currency: string
  orderId: string
  orderNumber: string
  /** Публичный токен заказа — используется для return-url */
  publicToken: string
  email: string
  description: string
  /** Куда вернуть покупателя после оплаты */
  returnUrl: string
}

/** Результат создания инвойса. */
export type CreateInvoiceResult = {
  /** ID инвойса на стороне провайдера */
  externalId: string
  /** Ссылка, куда редиректить покупателя */
  payUrl: string
  /** Сырой ответ провайдера для аудита */
  raw: unknown
  expiresAt?: Date
}

/** Разобранное событие webhook'а, приведённое к единому виду. */
export type ParsedWebhookEvent = {
  /** ID события у провайдера — второй рубеж идемпотентности */
  eventId: string
  eventType: string
  /** ID инвойса, по которому ищем Payment */
  externalId: string
  /** Что произошло с платежом */
  status: 'succeeded' | 'failed' | 'expired' | 'refunded' | 'pending'
  /** Фактически оплаченная сумма в минорных единицах (если провайдер её сообщает) */
  paidAmount?: number
  paidCurrency?: string
}

/**
 * Единый интерфейс платёжного провайдера.
 *
 * Чтобы добавить новый способ оплаты, достаточно реализовать этот интерфейс
 * и зарегистрировать реализацию в lib/payments/index.ts. Остальной код менять не нужно.
 */
export interface PaymentProvider {
  readonly code: PaymentProviderCode
  readonly title: string
  readonly description: string

  /** Настроен ли провайдер (есть ли ключи). */
  isConfigured(): Promise<boolean>

  /** Создаёт инвойс и возвращает ссылку на оплату. */
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>

  /** Проверяет подпись входящего webhook'а. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>

  /** Приводит тело webhook'а к единому виду. */
  parseWebhook(payload: unknown): ParsedWebhookEvent | null
}
