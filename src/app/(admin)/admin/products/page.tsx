import { Plus } from 'lucide-react'
import Link from 'next/link'

import { ProductRowActions } from '@/components/admin/product-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const TYPE_LABEL = { KEY: 'Ключ', FILE: 'Файл', LINK: 'Ссылка' } as const

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true } },
      _count: { select: { keys: { where: { status: 'AVAILABLE' } } } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Товары</h1>
          <p className="text-muted-foreground">Всего позиций: {products.length}</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Добавить товар
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Остаток</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Товаров пока нет. Добавьте первый.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link href={`/admin/products/${product.id}`} className="font-medium hover:text-primary">
                        {product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">/{product.slug}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.category?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TYPE_LABEL[product.type]}</Badge>
                    </TableCell>
                    <TableCell>{formatPrice(product.price, product.currency)}</TableCell>
                    <TableCell>
                      {product.type === 'KEY' ? (
                        <Badge
                          variant={
                            product._count.keys === 0
                              ? 'destructive'
                              : product._count.keys <= product.lowStockThreshold
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {product._count.keys}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">∞</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? 'success' : 'secondary'}>
                        {product.isActive ? 'Активен' : 'Скрыт'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductRowActions
                        productId={product.id}
                        slug={product.slug}
                        isActive={product.isActive}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
