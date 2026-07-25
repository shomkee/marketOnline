import type { Metadata } from 'next'

import { OrderLookup } from '@/components/shop/order-lookup'

export const metadata: Metadata = {
  title: 'Мой заказ',
  description: 'Откройте страницу заказа по ссылке из письма.',
  robots: { index: false },
}

export default function OrderLookupPage() {
  return (
    <div className="container space-y-6 py-16">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Найти заказ</h1>
        <p className="text-muted-foreground">
          Ссылка на заказ приходит на почту сразу после оплаты.
        </p>
      </div>

      <OrderLookup />
    </div>
  )
}
