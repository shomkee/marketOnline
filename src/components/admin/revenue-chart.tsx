'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatPrice } from '@/lib/utils'

type ChartPoint = { date: string; revenue: number; orders: number }

/** График выручки за последние 30 дней. */
export function RevenueChart({ data, currency }: { data: ChartPoint[]; currency: string }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value: string) => value.slice(5)}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value: number) => String(Math.round(value / 100))}
          />

          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              fontSize: 13,
            }}
            labelFormatter={(label: string) => `Дата: ${label}`}
            formatter={(value: number, name: string) =>
              name === 'revenue'
                ? [formatPrice(value, currency), 'Выручка']
                : [String(value), 'Заказы']
            }
          />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
