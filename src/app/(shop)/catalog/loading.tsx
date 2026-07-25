import { ProductGridSkeleton } from '@/components/shop/product-card-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton каталога на время загрузки данных. */
export default function CatalogLoading() {
  return (
    <div className="container space-y-6 py-10">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <ProductGridSkeleton />
    </div>
  )
}
