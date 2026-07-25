import { notFound } from 'next/navigation'

import { KeysManager } from '@/components/admin/keys-manager'
import { ProductForm, type ProductFormValues } from '@/components/admin/product-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { decrypt } from '@/lib/crypto'
import { prisma } from '@/lib/prisma'
import { getKeyStats } from '@/lib/services/stats.service'

export const dynamic = 'force-dynamic'

/** Маскирует ключ: в админке видны только крайние символы. */
function maskKey(value: string): string {
  if (value.length <= 8) return `${value.slice(0, 2)}••••`
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        keys: { orderBy: { createdAt: 'desc' }, take: 300 },
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ])

  if (!product) notFound()

  const stats = await getKeyStats(product.id)

  const initialValues: ProductFormValues = {
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    price: product.price,
    oldPrice: product.oldPrice,
    currency: product.currency,
    images: product.images,
    type: product.type,
    fileKey: product.fileKey ?? '',
    fileName: product.fileName ?? '',
    linkContent: product.linkContent ?? '',
    categoryId: product.categoryId ?? '',
    maxPerOrder: product.maxPerOrder,
    lowStockThreshold: product.lowStockThreshold,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    metaTitle: product.metaTitle ?? '',
    metaDescription: product.metaDescription ?? '',
  }

  const keyRows = product.keys.map((key) => ({
    id: key.id,
    masked: maskKey(decrypt(key.value)),
    status: key.status,
    note: key.note,
    createdAt: key.createdAt.toISOString(),
    soldAt: key.soldAt ? key.soldAt.toISOString() : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
        <p className="text-muted-foreground">Карточка товара и управление складом</p>
      </div>

      <Tabs defaultValue="product">
        <TabsList>
          <TabsTrigger value="product">Карточка</TabsTrigger>
          <TabsTrigger value="keys" disabled={product.type !== 'KEY'}>
            Склад ключей
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product">
          <ProductForm productId={product.id} initialValues={initialValues} categories={categories} />
        </TabsContent>

        <TabsContent value="keys">
          <KeysManager productId={product.id} keys={keyRows} stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
