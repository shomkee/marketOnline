import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { prisma } from '@/lib/prisma'
import { formatDateTime, formatPrice, maskEmail } from '@/lib/utils'
import { orderFiltersSchema } from '@/lib/validations/order'

export const dynamic = 'force-dynamic'

const STATUS_META = {
  PENDING: { label: 'Ожидает', variant: 'warning' as const },
  PAID: { label: 'Оплачен', variant: 'secondary' as const },
  DELIVERED: { label: 'Выдан', variant: 'success' as const },
  CANCELLED: { label: 'Отменён', variant: 'destructive' as const },
  REFUNDED: { label: 'Возврат', variant: 'destructive' as const },
}

const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'PENDING', label: 'Ожидают оплаты' },
  { value: 'PAID', label: 'Оплачены' },
  { value: 'DELIVERED', label: 'Выданы' },
  { value: 'CANCELLED', label: 'Отменены' },
  { value: 'REFUNDED', label: 'Возвраты' },
]

const PAGE_SIZE = 30

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const filters = orderFiltersSchema.parse(searchParams)

  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? {
          OR: [
            { orderNumber: { contains: filters.q, mode: 'insensitive' as const } },
            { email: { contains: filters.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: { select: { productName: true, quantity: true } } },
    }),
    prisma.order.count({ where }),
  ])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Заказы</h1>
        <p className="text-muted-foreground">Всего: {total}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.value || 'all'}
            size="sm"
            variant={(filters.status ?? '') === item.value ? 'default' : 'outline'}
            asChild
          >
            <Link href={item.value ? `/admin/orders?status=${item.value}` : '/admin/orders'}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>

      <form action="/admin/orders" className="flex gap-2">
        {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
        <input
          name="q"
          defaultValue={filters.q ?? ''}
          placeholder="Номер заказа или email"
          className="h-10 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" variant="outline">
          Найти
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Товары</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Создан</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Заказов не найдено.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-primary">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{maskEmail(order.email)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {order.items.map((item) => `${item.productName} ×${item.quantity}`).join(', ')}
                    </TableCell>
                    <TableCell>{formatPrice(order.total, order.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_META[order.status].variant}>
                        {STATUS_META[order.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pageCount > 1 ? (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => {
            const params = new URLSearchParams()
            if (filters.status) params.set('status', filters.status)
            if (filters.q) params.set('q', filters.q)
            if (page > 1) params.set('page', String(page))
            const query = params.toString()

            return (
              <Button
                key={page}
                size="sm"
                variant={page === filters.page ? 'default' : 'outline'}
                asChild
              >
                <Link href={query ? `/admin/orders?${query}` : '/admin/orders'}>{page}</Link>
              </Button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
