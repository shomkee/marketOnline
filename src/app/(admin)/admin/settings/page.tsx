import { SettingsForm } from '@/components/admin/settings-form'
import { getSettings } from '@/lib/services/settings.service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const [settings, raw] = await Promise.all([
    getSettings(),
    prisma.settings.findUnique({ where: { id: 'singleton' } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">Контакты, выдача, платёжные ключи</p>
      </div>

      <SettingsForm
        settings={settings}
        hasCryptobotToken={Boolean(raw?.cryptobotToken)}
        hasYookassaSecret={Boolean(raw?.yookassaSecretKey)}
      />
    </div>
  )
}
