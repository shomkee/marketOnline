import { CheckCircle2, Clock, CreditCard, KeyRound, XCircle } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DownloadButton, OrderAutoRefresh, ResendButton } from '@/components/shop/order-actions'
import { RevealKeys } from '@/components/shop/reveal-key'
import { ReviewForm } from '@/components/shop/review-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { decrypt } from '@/lib/crypto'
import { getOrderByToken } from '@/lib/services/order.service'
import { formatDateTime, formatPrice, maskEmail } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Заказ',
  robots: { index: false, follow: false },
}

const STATUS_META = {
  PENDING: { label: 'Ожидает оплаты', variant: 'warning' as const, icon: Clock },
  PAID: { label: 'Оплачен, выдаём…', variant: 'secondary' as const, icon: CreditCard },
  DELIVERED: { label: 'Выдан', variant: 'success' as const, icon: CheckCircle2 },
  CANCELLED: { label: 'Отменён', variant: 'destructive' as const, icon: XCircle },
  REFUNDED: { label: 'Возврат', variant: 'destructive' as const, icon: XCircle },
}

export default async function OrderPage({ params }: { params: { token: string } }) {
  const order = await getOrderByToken(params.token)

  if (!order) notFound()

  const status = STATUS_META[order.status]
  const StatusIcon = status.icon
  const pendingPayment = order.payments.find((payment) => payment.status === 'PENDING')
  const reviewedProductIds = new Set(order.reviews.map((review) => review.productId))

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Заказ {order.orderNumber}</h1>
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Создан {formatDateTime(order.createdAt)} · {maskEmail(order.email)}
        </p>
      </div>

      {/* Ожидание оплаты */}
      {order.status === 'PENDING' ? (
        <Card className="border-amber-500/40">
          <CardContent className="space-y-3 p-5">
            <p className="font-medium">Ждём подтверждение оплаты</p>
            <p className="text-sm text-muted-foreground">
              Как только платёж пройдёт, товар появится на этой странице и придёт на почту.
              {order.expiresAt
                ? ` Бронь действует до ${formatDateTime(order.expiresAt)}.`
                : ''}
            </p>

            {pendingPayment?.payUrl ? (
              <Button asChild>
                <a href={pendingPayment.payUrl} rel="noreferrer">
                  <CreditCard className="h-4 w-4" />
                  Перейти к оплате
                </a>
              </Button>
            ) : null}

            <OrderAutoRefresh />
          </CardContent>
        </Card>
      ) : null}

      {order.status === 'CANCELLED' ? (
        <Card className="border-destructive/40">
          <CardContent className="space-y-2 p-5">
            <p className="font-medium">Заказ отменён</p>
            <p className="text-sm text-muted-foreground">
              {order.adminNote || 'Время на оплату истекло, бронь снята.'} Можно оформить новый заказ.
            </p>
            <Button variant="outline" asChild>
              <Link href="/catalog">В каталог</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Состав заказа и выданный товар */}
      <div className="space-y-4">
        {order.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {item.product ? (
                      <Link href={`/product/${item.product.slug}`} className="hover:text-primary">
                        {item.productName}
                      </Link>
                    ) : (
                      item.productName
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} × {formatPrice(item.unitPrice, order.currency)}
                  </p>
                </div>
                <span className="font-semibold">{formatPrice(item.totalPrice, order.currency)}</span>
              </div>

              {order.status === 'DELIVERED' ? (
                <div className="space-y-3 border-t border-border pt-4">
                  {item.productType === 'KEY' && item.keys.length > 0 ? (
                    <>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <KeyRound className="h-4 w-4" />
                        Ваши ключи
                      </p>
                      <RevealKeys keys={item.keys.map((key) => decrypt(key.value))} />
                    </>
                  ) : null}

                  {item.productType === 'FILE' ? (
                    <DownloadButton token={order.publicToken} itemId={item.id} />
                  ) : null}

                  {item.productType === 'LINK' && item.deliveredContent ? (
                    <div className="markdown-body whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm text-foreground">
                      {item.deliveredContent}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Итоги */}
      <Card>
        <CardContent className="space-y-2 p-5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Стоимость</span>
            <span>{formatPrice(order.subtotal, order.currency)}</span>
          </div>
          {order.discountAmount > 0 ? (
            <div className="flex justify-between text-success">
              <span>Скидка {order.promocodeCode ? `(${order.promocodeCode})` : ''}</span>
              <span>&minus;{formatPrice(order.discountAmount, order.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Итого</span>
            <span>{formatPrice(order.total, order.currency)}</span>
          </div>
        </CardContent>
      </Card>

      {order.status === 'DELIVERED' ? (
        <div className="flex flex-wrap gap-2">
          <ResendButton token={order.publicToken} />
          <Button variant="ghost" asChild>
            <Link href="/catalog">Купить ещё</Link>
          </Button>
        </div>
      ) : null}

      {/* Отзывы по выданным товарам */}
      {order.status === 'DELIVERED'
        ? order.items
            .filter((item) => item.productId && !reviewedProductIds.has(item.productId))
            .map((item) => (
              <ReviewForm
                key={item.id}
                orderToken={order.publicToken}
                productId={item.productId as string}
                productName={item.productName}
              />
            ))
        : null}
    </div>
  )
}
