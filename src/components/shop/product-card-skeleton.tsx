import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton карточки товара для состояний загрузки. */
export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-24" />
      </div>
    </Card>
  )
}

/** Сетка skeleton-карточек. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
