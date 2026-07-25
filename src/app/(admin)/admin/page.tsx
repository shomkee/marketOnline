import { AlertTriangle, Clock, MessageSquare, Package, Receipt, Wallet } from 'lucide-react'
import Link from 'next/link'

import { RevenueChart } from '@/components/admin/revenue-chart'
import { StatCard } from '@/components/admin/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSettings } from '@/lib/services/settings.service'
import { getDashboardStats } from '@/lib/services/stats.service'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [stats, settings] = await Promise.all([getDashboardStats(), getSettings()])
  const currency = settings.currency

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Общая картина по магазину</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Выручка за день"
          value={formatPrice(stats.revenue.day, currency)}
          hint={`За неделю: ${formatPrice(stats.revenue.week, currency)}`}
          icon={Wallet}
        />
        <StatCard
          title="Выручка за месяц"
          value={formatPrice(stats.revenue.month, currency)}
          hint={`За всё время: ${formatPrice(stats.revenue.total, currency)}`}
          icon={Receipt}
        />
        <StatCard
          title="Заказов за день"
          value={String(stats.orders.day)}
          hint={`За месяц: ${stats.orders.month}`}
          icon={Package}
        />
        <StatCard
          title="Ждут оплаты"
          value={String(stats.orders.pending)}
          hint="Бронь снимается автоматически"
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Выручка за 30 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={stats.chart} currency={currency} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Топ товаров</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Продаж пока нет.</p>
            ) : (
              stats.topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/products/${product.id}`} className="truncate hover:text-primary">
                    {product.name}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">
                    {product.quantity} шт · {formatPrice(product.revenue, currency)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Мало ключей на складе
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Все остатки в норме.</p>
            ) : (
              stats.lowStock.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/products/${product.id}`} className="truncate hover:text-primary">
                    {product.name}
                  </Link>
                  <Badge variant={product.available === 0 ? 'destructive' : 'warning'}>
                    {product.available} шт
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {stats.pendingReviews > 0 ? (
        <Card className="border-primary/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Отзывов на модерации: <strong>{stats.pendingReviews}</strong>
            </p>
            <Button size="sm" asChild>
              <Link href="/admin/reviews">Перейти к модерации</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
