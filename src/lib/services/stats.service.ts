import { KeyStatus, OrderStatus } from '@prisma/client'

import { prisma } from '../prisma'

export type DashboardStats = {
  revenue: { day: number; week: number; month: number; total: number }
  orders: { day: number; week: number; month: number; pending: number }
  topProducts: Array<{ id: string; name: string; sales: number; revenue: number }>
  chart: Array<{ date: string; revenue: number; orders: number }>
  lowStock: Array<{ id: string; name: string; remaining: number; threshold: number }>
  pendingReviews: number
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Считает выручку за период по выданным и оплаченным заказам. */
async function sumRevenue(from: Date): Promise<number> {
  const result = await prisma.order.aggregate({
    where: {
      status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
      paidAt: { gte: from },
    },
    _sum: { total: true },
  })

  return result._sum.total ?? 0
}

async function countOrders(from: Date): Promise<number> {
  return prisma.order.count({
    where: {
      status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
      paidAt: { gte: from },
    },
  })
}

/** Собирает все метрики дашборда одним набором параллельных запросов. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date()
  const dayStart = startOfDay(now)
  const weekStart = new Date(dayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(dayStart.getTime() - 29 * 24 * 60 * 60 * 1000)

  const [
    revenueDay,
    revenueWeek,
    revenueMonth,
    revenueTotal,
    ordersDay,
    ordersWeek,
    ordersMonth,
    ordersPending,
    topItems,
    chartRows,
    lowStockRows,
    pendingReviews,
  ] = await Promise.all([
    sumRevenue(dayStart),
    sumRevenue(weekStart),
    sumRevenue(monthStart),
    sumRevenue(new Date(0)),
    countOrders(dayStart),
    countOrders(weekStart),
    countOrders(monthStart),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),

    // Топ товаров за 30 дней
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
          paidAt: { gte: monthStart },
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 5,
    }),

    // График выручки по дням за 30 дней
    prisma.$queryRaw<Array<{ day: Date; revenue: bigint; orders: bigint }>>`
      SELECT date_trunc('day', "paidAt") AS day,
             SUM(total)::bigint AS revenue,
             COUNT(*)::bigint AS orders
      FROM orders
      WHERE status IN ('PAID', 'DELIVERED')
        AND "paidAt" >= ${monthStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `,

    // Товары с низким остатком
    prisma.$queryRaw<Array<{ id: string; name: string; remaining: bigint; threshold: number }>>`
      SELECT p.id,
             p.name,
             COUNT(k.id) FILTER (WHERE k.status = 'AVAILABLE')::bigint AS remaining,
             p."lowStockThreshold" AS threshold
      FROM products p
      LEFT JOIN product_keys k ON k."productId" = p.id
      WHERE p.type = 'KEY' AND p."isActive" = true
      GROUP BY p.id, p.name, p."lowStockThreshold"
      HAVING COUNT(k.id) FILTER (WHERE k.status = 'AVAILABLE') <= p."lowStockThreshold"
      ORDER BY remaining ASC
      LIMIT 10
    `,

    prisma.review.count({ where: { status: 'PENDING' } }),
  ])

  // Заполняем пропуски в графике нулями — иначе линия рвётся
  const revenueByDay = new Map(
    chartRows.map((row) => [
      row.day.toISOString().slice(0, 10),
      { revenue: Number(row.revenue), orders: Number(row.orders) },
    ]),
  )

  const chart: DashboardStats['chart'] = []
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(dayStart.getTime() - i * 24 * 60 * 60 * 1000)
    const key = date.toISOString().slice(0, 10)
    const entry = revenueByDay.get(key)
    chart.push({
      date: key,
      revenue: entry ? entry.revenue / 100 : 0,
      orders: entry ? entry.orders : 0,
    })
  }

  return {
    revenue: { day: revenueDay, week: revenueWeek, month: revenueMonth, total: revenueTotal },
    orders: { day: ordersDay, week: ordersWeek, month: ordersMonth, pending: ordersPending },
    topProducts: topItems.map((item) => ({
      id: item.productId ?? item.productName,
      name: item.productName,
      sales: item._sum.quantity ?? 0,
      revenue: item._sum.totalPrice ?? 0,
    })),
    chart,
    lowStock: lowStockRows.map((row) => ({
      id: row.id,
      name: row.name,
      remaining: Number(row.remaining),
      threshold: row.threshold,
    })),
    pendingReviews,
  }
}

/** Пересчитывает денормализованный рейтинг товара по одобренным отзывам. */
export async function recalcProductRating(productId: string): Promise<void> {
  const stats = await prisma.review.aggregate({
    where: { productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  })

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
      reviewCount: stats._count._all,
    },
  })
}

/** Остатки ключей по статусам для карточки товара в админке. */
export async function getKeyStats(productId: string) {
  const grouped = await prisma.productKey.groupBy({
    by: ['status'],
    where: { productId },
    _count: { _all: true },
  })

  const map = new Map(grouped.map((row) => [row.status, row._count._all]))

  return {
    available: map.get(KeyStatus.AVAILABLE) ?? 0,
    reserved: map.get(KeyStatus.RESERVED) ?? 0,
    sold: map.get(KeyStatus.SOLD) ?? 0,
    disabled: map.get(KeyStatus.DISABLED) ?? 0,
  }
}
