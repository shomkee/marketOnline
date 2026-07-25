'use client'

import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { saveSettingsAction } from '@/actions/settings.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ShopSettings } from '@/lib/services/settings.service'

/** Форма настроек магазина. Секреты никогда не отдаются клиенту. */
export function SettingsForm({
  settings,
  hasCryptobotToken,
  hasYookassaSecret,
}: {
  settings: ShopSettings
  hasCryptobotToken: boolean
  hasYookassaSecret: boolean
}) {
  const router = useRouter()

  const [values, setValues] = React.useState({
    shopName: settings.shopName,
    shopDescription: settings.shopDescription ?? '',
    contactEmail: settings.contactEmail ?? '',
    telegramUsername: settings.telegramUsername ?? '',
    supportUrl: settings.supportUrl ?? '',
    currency: settings.currency,
    metaTitle: settings.metaTitle ?? '',
    metaDescription: settings.metaDescription ?? '',
    ogImageUrl: settings.ogImageUrl ?? '',
    reservationMinutes: settings.reservationMinutes,
    downloadTtlSeconds: settings.downloadTtlSeconds,
    maxEmailResends: settings.maxEmailResends,
    reviewsModerated: settings.reviewsModerated,
    maintenanceMode: settings.maintenanceMode,
    lowStockNotifyEmail: settings.lowStockNotifyEmail ?? '',
    emailFrom: settings.emailFrom ?? '',
    cryptobotEnabled: settings.cryptobotEnabled,
    cryptobotToken: '',
    yookassaEnabled: settings.yookassaEnabled,
    yookassaShopId: settings.yookassaShopId ?? '',
    yookassaSecretKey: '',
  })

  const [saving, setSaving] = React.useState(false)

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const result = await saveSettingsAction(values)
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success(result.message)
    setValues((prev) => ({ ...prev, cryptobotToken: '', yookassaSecretKey: '' }))
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Магазин</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shopName">Название</Label>
            <Input id="shopName" value={values.shopName} onChange={(e) => set('shopName', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Валюта</Label>
            <Input id="currency" value={values.currency} onChange={(e) => set('currency', e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="shopDescription">Описание</Label>
            <Textarea
              id="shopDescription"
              rows={2}
              value={values.shopDescription}
              onChange={(e) => set('shopDescription', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email поддержки</Label>
            <Input
              id="contactEmail"
              type="email"
              value={values.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telegramUsername">Telegram</Label>
            <Input
              id="telegramUsername"
              value={values.telegramUsername}
              onChange={(e) => set('telegramUsername', e.target.value)}
              placeholder="@support"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supportUrl">Ссылка на поддержку</Label>
            <Input
              id="supportUrl"
              value={values.supportUrl}
              onChange={(e) => set('supportUrl', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emailFrom">Отправитель писем</Label>
            <Input
              id="emailFrom"
              value={values.emailFrom}
              onChange={(e) => set('emailFrom', e.target.value)}
              placeholder="Shop &lt;shop@example.com&gt;"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Выдача и бронирование</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="reservationMinutes">Бронь ключа, минут</Label>
            <Input
              id="reservationMinutes"
              inputMode="numeric"
              value={values.reservationMinutes}
              onChange={(e) => set('reservationMinutes', Number(e.target.value.replace(/\D/g, '')) || 1)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="downloadTtlSeconds">TTL ссылки, секунд</Label>
            <Input
              id="downloadTtlSeconds"
              inputMode="numeric"
              value={values.downloadTtlSeconds}
              onChange={(e) => set('downloadTtlSeconds', Number(e.target.value.replace(/\D/g, '')) || 60)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxEmailResends">Макс. повторных писем</Label>
            <Input
              id="maxEmailResends"
              inputMode="numeric"
              value={values.maxEmailResends}
              onChange={(e) => set('maxEmailResends', Number(e.target.value.replace(/\D/g, '')) || 0)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lowStockNotifyEmail">Email для уведомлений об остатках</Label>
            <Input
              id="lowStockNotifyEmail"
              type="email"
              value={values.lowStockNotifyEmail}
              onChange={(e) => set('lowStockNotifyEmail', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={values.reviewsModerated}
              onChange={(e) => set('reviewsModerated', e.target.checked)}
            />
            Модерировать отзывы
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={values.maintenanceMode}
              onChange={(e) => set('maintenanceMode', e.target.checked)}
            />
            Режим обслуживания
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Платёжные системы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={values.cryptobotEnabled}
              onChange={(e) => set('cryptobotEnabled', e.target.checked)}
            />
            CryptoBot включён
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="cryptobotToken">CryptoBot API token</Label>
            <Input
              id="cryptobotToken"
              type="password"
              autoComplete="new-password"
              value={values.cryptobotToken}
              onChange={(e) => set('cryptobotToken', e.target.value)}
              placeholder={hasCryptobotToken ? 'Сохранён — оставьте пустым' : 'Не задан'}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={values.yookassaEnabled}
              onChange={(e) => set('yookassaEnabled', e.target.checked)}
            />
            ЮKassa включена
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="yookassaShopId">ЮKassa shopId</Label>
              <Input
                id="yookassaShopId"
                value={values.yookassaShopId}
                onChange={(e) => set('yookassaShopId', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yookassaSecretKey">ЮKassa secret key</Label>
              <Input
                id="yookassaSecretKey"
                type="password"
                autoComplete="new-password"
                value={values.yookassaSecretKey}
                onChange={(e) => set('yookassaSecretKey', e.target.value)}
                placeholder={hasYookassaSecret ? 'Сохранён — оставьте пустым' : 'Не задан'}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Секреты шифруются AES-256-GCM и никогда не попадают в клиентский код.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="metaTitle">Meta title</Label>
            <Input id="metaTitle" value={values.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ogImageUrl">OG image URL</Label>
            <Input
              id="ogImageUrl"
              value={values.ogImageUrl}
              onChange={(e) => set('ogImageUrl', e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="metaDescription">Meta description</Label>
            <Textarea
              id="metaDescription"
              rows={2}
              value={values.metaDescription}
              onChange={(e) => set('metaDescription', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" loading={saving}>
        <Save className="h-4 w-4" />
        Сохранить настройки
      </Button>
    </form>
  )
}
