import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

/** Карточка метрики на дашборде. */
export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string
  hint?: string
  icon: LucideIcon
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="rounded-lg bg-accent p-2 text-accent-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  )
}
