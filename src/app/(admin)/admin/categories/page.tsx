import { CategoriesManager } from '@/components/admin/categories-manager'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  })

  const rows = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    icon: category.icon ?? '',
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: category._count.products,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Категории</h1>
        <p className="text-muted-foreground">Группировка товаров в каталоге</p>
      </div>

      <CategoriesManager categories={rows} />
    </div>
  )
}
