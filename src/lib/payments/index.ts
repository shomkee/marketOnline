import { PaymentProviderCode } from '@prisma/client'

import { AppError } from '../errors'
import { cryptobotProvider } from './cryptobot'
import type { PaymentProvider } from './types'
import { yookassaProvider } from './yookassa'

/**
 * Реестр платёжных провайдеров.
 * Добавление нового способа оплаты = одна строка здесь.
 */
const registry: Record<PaymentProviderCode, PaymentProvider> = {
  [PaymentProviderCode.CRYPTOBOT]: cryptobotProvider,
  [PaymentProviderCode.YOOKASSA]: yookassaProvider,
}

/** Возвращает провайдера по коду. */
export function getProvider(code: PaymentProviderCode): PaymentProvider {
  const provider = registry[code]
  if (!provider) {
    throw new AppError('PROVIDER_DISABLED', 'Неизвестный способ оплаты')
  }
  return provider
}

/** Список всех зарегистрированных провайдеров. */
export function getAllProviders(): PaymentProvider[] {
  return Object.values(registry)
}

/** Список провайдеров, готовых принимать оплату прямо сейчас. */
export async function getAvailableProviders(): Promise<
  Array<{ code: PaymentProviderCode; title: string; description: string }>
> {
  const providers = getAllProviders()
  const checks = await Promise.all(providers.map((provider) => provider.isConfigured()))

  return providers
    .filter((_, index) => checks[index])
    .map((provider) => ({
      code: provider.code,
      title: provider.title,
      description: provider.description,
    }))
}

export type { PaymentProvider, CreateInvoiceInput, CreateInvoiceResult, ParsedWebhookEvent } from './types'
