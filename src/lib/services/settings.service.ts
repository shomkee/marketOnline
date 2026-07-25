import { unstable_cache, revalidateTag } from 'next/cache'

import { decryptNullable } from '../crypto'
import { getEnv } from '../env'
import { prisma } from '../prisma'

export const SETTINGS_TAG = 'settings'
const SINGLETON_ID = 'singleton'

export type ShopSettings = Awaited<ReturnType<typeof loadSettings>>

/** Читает настройки из БД, создавая строку при первом обращении. */
async function loadSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: SINGLETON_ID } })
  if (existing) return existing

  return prisma.settings.create({ data: { id: SINGLETON_ID } })
}

/**
 * Кэшированные настройки магазина.
 * Кэш сбрасывается через invalidateSettings() при сохранении в админке.
 */
export const getSettings = unstable_cache(loadSettings, ['shop-settings'], {
  tags: [SETTINGS_TAG],
  revalidate: 300,
})

/** Сбрасывает кэш настроек. */
export function invalidateSettings() {
  revalidateTag(SETTINGS_TAG)
}

/**
 * Возвращает секрет платёжного провайдера.
 * Переменная окружения имеет приоритет над значением из БД:
 * на проде секреты удобнее держать в Vercel, а не в базе.
 */
export async function getProviderSecret(provider: 'CRYPTOBOT' | 'YOOKASSA'): Promise<string | null> {
  const env = getEnv()

  if (provider === 'CRYPTOBOT') {
    if (env.CRYPTOBOT_TOKEN) return env.CRYPTOBOT_TOKEN
    const settings = await getSettings()
    return decryptNullable(settings.cryptobotToken)
  }

  if (env.YOOKASSA_SECRET_KEY) return env.YOOKASSA_SECRET_KEY
  const settings = await getSettings()
  return decryptNullable(settings.yookassaSecretKey)
}

/** shopId ЮKassa: сначала из окружения, потом из БД. */
export async function getYookassaShopId(): Promise<string | null> {
  const env = getEnv()
  if (env.YOOKASSA_SHOP_ID) return env.YOOKASSA_SHOP_ID
  const settings = await getSettings()
  return settings.yookassaShopId
}

/** Адрес отправителя писем. */
export async function getEmailFrom(): Promise<string> {
  const settings = await getSettings()
  return settings.emailFrom || getEnv().EMAIL_FROM
}
