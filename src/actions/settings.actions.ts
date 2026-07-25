'use server'

import { revalidatePath } from 'next/cache'

import { requireOwner } from '@/lib/auth'
import { encryptNullable } from '@/lib/crypto'
import { toPublicError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { invalidateSettings } from '@/lib/services/settings.service'
import { settingsSchema } from '@/lib/validations/settings'

import type { ActionResult } from './product.actions'

/**
 * Сохранение настроек магазина.
 * Ключи платёжек шифруются; пустое значение означает «оставить как было».
 */
export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    await requireOwner()

    const parsed = settingsSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message
      return { ok: false, error: 'Проверьте поля формы', fieldErrors }
    }

    const data = parsed.data

    await prisma.settings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        shopName: data.shopName,
        shopDescription: data.shopDescription || null,
        contactEmail: data.contactEmail || null,
        telegramUsername: data.telegramUsername || null,
        supportUrl: data.supportUrl || null,
        currency: data.currency,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        ogImageUrl: data.ogImageUrl || null,
        reservationMinutes: data.reservationMinutes,
        downloadTtlSeconds: data.downloadTtlSeconds,
        maxEmailResends: data.maxEmailResends,
        reviewsModerated: data.reviewsModerated,
        maintenanceMode: data.maintenanceMode,
        lowStockNotifyEmail: data.lowStockNotifyEmail || null,
        emailFrom: data.emailFrom || null,
        cryptobotToken: encryptNullable(data.cryptobotToken || null),
        cryptobotEnabled: data.cryptobotEnabled,
        yookassaShopId: data.yookassaShopId || null,
        yookassaSecretKey: encryptNullable(data.yookassaSecretKey || null),
        yookassaEnabled: data.yookassaEnabled,
      },
      update: {
        shopName: data.shopName,
        shopDescription: data.shopDescription || null,
        contactEmail: data.contactEmail || null,
        telegramUsername: data.telegramUsername || null,
        supportUrl: data.supportUrl || null,
        currency: data.currency,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        ogImageUrl: data.ogImageUrl || null,
        reservationMinutes: data.reservationMinutes,
        downloadTtlSeconds: data.downloadTtlSeconds,
        maxEmailResends: data.maxEmailResends,
        reviewsModerated: data.reviewsModerated,
        maintenanceMode: data.maintenanceMode,
        lowStockNotifyEmail: data.lowStockNotifyEmail || null,
        emailFrom: data.emailFrom || null,
        cryptobotEnabled: data.cryptobotEnabled,
        yookassaShopId: data.yookassaShopId || null,
        yookassaEnabled: data.yookassaEnabled,
        // Пустое поле не затирает ранее сохранённый секрет
        ...(data.cryptobotToken ? { cryptobotToken: encryptNullable(data.cryptobotToken) } : {}),
        ...(data.yookassaSecretKey ? { yookassaSecretKey: encryptNullable(data.yookassaSecretKey) } : {}),
      },
    })

    invalidateSettings()

    revalidatePath('/admin/settings')
    revalidatePath('/', 'layout')

    return { ok: true, message: 'Настройки сохранены' }
  } catch (error) {
    logger.error('saveSettingsAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}
