import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminOrderActions } from '@/components/admin/order-actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { prisma } from '@/lib/prisma'
import { formatDateTime, formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_LABEL = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  DELIVERED: 'Выдан',
  CANCELLED: 'Отменён',
  REFUNDED: 'Возврат',
}

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { keys: { select: { id: true } } } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!order) notFound()

  const webhookLogs = await prisma.webhookLog.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Заказ {order.orderNumber}</h1>
          <p className="text-muted-foreground">
            {order.email} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{STATUS_LABEL[order.status]}</Badge>
          <Link
            href={`/order/${order.publicToken}`}
            target="_blank"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Страница покупателя
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Состав заказа</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Кол-во</TableHead>
                    <TableHead>Ключей</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.productType}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.keys.length}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(item.totalPrice, order.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Платежи</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Провайдер</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead>Оплачен</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Платежей нет.
                      </TableCell>
                    </TableRow>
                  ) : (
                    order.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.provider}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'SUCCEEDED' ? 'success' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{payment.externalId}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.paidAt ? formatDateTime(payment.paidAt) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Журнал webhook&apos;ов</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Событие</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Подпись</TableHead>
                    <TableHead>Время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Записей нет.
                      </TableCell>
                    </TableRow>
                  ) : (
                    webhookLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{log.eventType ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'PROCESSED' ? 'success' : 'secondary'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.signatureValid ? '✓' : '✗'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Итоги</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Стоимость</span>
                <span>{formatPrice(order.subtotal, order.currency)}</span>
              </div>
              {order.discountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <span>Скидка {order.promocodeCode ?? ''}</span>
                  <span>&minus;{formatPrice(order.discountAmount, order.currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Итого</span>
                <span>{formatPrice(order.total, order.currency)}</span>
              </div>
              <div className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                <p>IP: {order.ipAddress ?? '—'}</p>
                <p>Писем отправлено: {order.emailResendCount}</p>
                {order.deliveredAt ? <p>Выдан: {formatDateTime(order.deliveredAt)}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Действия</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminOrderActions
                orderId={order.id}
                status={order.status}
                initialNote={order.adminNote ?? ''}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
