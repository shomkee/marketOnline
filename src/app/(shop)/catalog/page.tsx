import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CatalogFilters } from '@/components/shop/catalog-filters'
import { Pagination } from '@/components/shop/pagination'
import { ProductCard } from '@/components/shop/product-card'
import { ProductGridSkeleton } from '@/components/shop/product-card-skeleton'
import { getCategoriesWithCounts, searchProducts } from '@/lib/services/product.service'
import { catalogFiltersSchema } from '@/lib/validations/product'

export const metadata: Metadata = {
  title: 'Каталог',
  description: 'Все цифровые товары: ключи, аккаунты, файлы и подписки.',
}

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

async function ProductGrid({ searchParams }: { searchParams: SearchParams }) {
  // Фильтры из URL валидируются той же Zod-схемой, что и на клиенте
  const filters = catalogFiltersSchema.parse(searchParams)
  const { products, total, pageCount } = await searchProducts(filters)

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="font-medium">Ничего не найдено</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Попробуйте изменить запрос или сбросить фильтры.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Найдено товаров: {total}</p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <Pagination page={filters.page} pageCount={pageCount} />
    </div>
  )
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const categories = await getCategoriesWithCounts()

  return (
    <div className="container space-y-6 py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Каталог</h1>
        <p className="text-muted-foreground">Выберите товар — выдача произойдёт автоматически.</p>
      </div>

      <Suspense fallback={null}>
        <CatalogFilters categories={categories} />
      </Suspense>

      <Suspense key={JSON.stringify(searchParams)} fallback={<ProductGridSkeleton />}>
        <ProductGrid searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
