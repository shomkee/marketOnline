import { EMPTY_PRODUCT, ProductForm } from '@/components/admin/product-form'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Новый товар</h1>
        <p className="text-muted-foreground">Заполните карточку и опубликуйте</p>
      </div>

      <ProductForm initialValues={EMPTY_PRODUCT} categories={categories} />
    </div>
  )
}
