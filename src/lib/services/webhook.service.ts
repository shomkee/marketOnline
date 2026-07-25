import { PaymentProviderCode, WebhookStatus } from '@prisma/client'

import { logger } from '../logger'
import { getProvider } from '../payments'
import { prisma } from '../prisma'
import { fulfillOrder } from './fulfillment.service'

/**
 * Единый обработчик входящих webhook'ов.
 *
 * Порядок шагов принципиален:
 *   1. Запись в журнал ДО любой логики — ни одно событие не теряется
 *   2. Проверка подписи
 *   3. Проверка идемпотентности по eventId
 *   4. Транзакционная выдача товара
 *
 * Всегда возвращает HTTP 200 при валидной подписи — иначе провайдер будет
 * бесконечно ретрайть событие, которое мы уже приняли.
 */
export async function handleWebhook(params: {
  provider: PaymentProviderCode
  rawBody: string
  headers: Headers
  ipAddress: string
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const startedAt = Date.now()
  const provider = getProvider(params.provider)

  let payload: unknown
  try {
    payload = JSON.parse(params.rawBody)
  } catch {
    payload = { _unparsed: params.rawBody.slice(0, 2000) }
  }

  // ─── Шаг 1: журналируем сырое событие ───
  const safeHeaders: Record<string, string> = {}
  params.headers.forEach((value, key) => {
    // Не сохраняем секреты в журнале
    if (['authorization', 'cookie'].includes(key.toLowerCase())) return
    safeHeaders[key] = value
  })

  const parsed = provider.parseWebhook(payload)

  const log = await prisma.webhookLog.create({
    data: {
      provider: params.provider,
      status: WebhookStatus.RECEIVED,
      eventId: parsed?.eventId ?? null,
      eventType: parsed?.eventType ?? null,
      externalId: parsed?.externalId ?? null,
      payload: payload as never,
      headers: safeHeaders as never,
      ipAddress: params.ipAddress,
    },
  })

  const finish = async (
    status: WebhookStatus,
    extra: { error?: string; orderId?: string; signatureValid?: boolean } = {},
  ) => {
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        status,
        error: extra.error,
        orderId: extra.orderId,
        signatureValid: extra.signatureValid,
        processedAt: new Date(),
        processingMs: Date.now() - startedAt,
      },
    })
  }

  // ─── Шаг 2: проверка подписи ───
  const signatureValid = await provider.verifyWebhook(params.rawBody, params.headers)

  if (!signatureValid) {
    await finish(WebhookStatus.INVALID_SIGN, { signatureValid: false })
    logger.warn('Webhook с неверной подписью', {
      provider: params.provider,
      ip: params.ipAddress,
    })
    return { status: 401, body: { error: 'invalid signature' } }
  }

  if (!parsed) {
    await finish(WebhookStatus.FAILED, {
      signatureValid: true,
      error: 'Не удалось разобрать тело события',
    })
    return { status: 200, body: { ok: true, ignored: true } }
  }

  // ─── Шаг 3: идемпотентность по eventId ───
  const duplicate = await prisma.webhookLog.findFirst({
    where: {
      provider: params.provider,
      eventId: parsed.eventId,
      status: WebhookStatus.PROCESSED,
      id: { not: log.id },
    },
    select: { id: true, orderId: true },
  })

  if (duplicate) {
    await finish(WebhookStatus.DUPLICATE, {
      signatureValid: true,
      orderId: duplicate.orderId ?? undefined,
    })
    return { status: 200, body: { ok: true, duplicate: true } }
  }

  // Находим платёж по externalId
  const payment = await prisma.payment.findUnique({
    where: {
      provider_externalId: {
        provider: params.provider,
        externalId: parsed.externalId,
      },
    },
    select: { id: true, orderId: true, amount: true },
  })

  if (!payment) {
    await finish(WebhookStatus.FAILED, {
      signatureValid: true,
      error: `Платёж ${parsed.externalId} не найден`,
    })
    logger.warn('Webhook для неизвестного платежа', { externalId: parsed.externalId })
    return { status: 200, body: { ok: true, unknownPayment: true } }
  }

  // ─── Шаг 4: реакция на статус ───
  try {
    if (parsed.status === 'succeeded') {
      const result = await fulfillOrder({
        orderId: payment.orderId,
        payment: {
          id: payment.id,
          paidAmount: parsed.paidAmount,
          paidCurrency: parsed.paidCurrency,
          rawPayload: payload,
        },
      })

      await finish(
        result.alreadyDelivered ? WebhookStatus.DUPLICATE : WebhookStatus.PROCESSED,
        { signatureValid: true, orderId: payment.orderId },
      )

      return { status: 200, body: { ok: true, delivered: result.delivered } }
    }

    if (parsed.status === 'failed' || parsed.status === 'expired') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: parsed.status === 'failed' ? 'FAILED' : 'EXPIRED',
          rawWebhookPayload: payload as never,
        },
      })
    }

    if (parsed.status === 'refunded') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      })
    }

    await finish(WebhookStatus.PROCESSED, { signatureValid: true, orderId: payment.orderId })
    return { status: 200, body: { ok: true } }
  } catch (error) {
    await finish(WebhookStatus.FAILED, {
      signatureValid: true,
      orderId: payment.orderId,
      error: error instanceof Error ? error.message : String(error),
    })

    logger.error('Ошибка обработки webhook', { error, orderId: payment.orderId })

    // 500 — чтобы провайдер повторил попытку позже
    return { status: 500, body: { error: 'processing failed' } }
  }
}
