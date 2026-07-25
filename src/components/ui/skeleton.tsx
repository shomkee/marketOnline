import { cn } from '@/lib/utils'

/** Базовый skeleton-блок для состояний загрузки. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
