import { KeyRound, Download, Link2, ShieldCheck, Star } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { BuyForm } from '@/components/shop/buy-form'
import { ProductGallery } from '@/components/shop/product-gallery'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getAvailableProviders } from '@/lib/payments'
import { getProductBySlug } from '@/lib/services/product.service'
import { formatDate, formatPrice } from '@/lib/utils'

export const revalidate = 60

const TYPE_LABEL = {
  KEY: { label: 'Цифровой ключ', icon: KeyRound },
  FILE: { label: 'Файл для скачивания', icon: Download },
  LINK: { label: 'Ссылка или инструкция', icon: Link2 },
} as const

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)

  if (!product) return { title: 'Товар не найден' }

  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.shortDescription || undefined,
    openGraph: {
      title: product.name,
      description: product.shortDescription || undefined,
      images: product.images.length > 0 ? product.images.map((url) => ({ url })) : undefined,
    },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug)

  if (!product) notFound()

  const providers = await getAvailableProviders()
  const meta = TYPE_LABEL[product.type]
  const Icon = meta.icon

  return (
    <div className="container space-y-10 py-10">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Главная
        </Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-foreground">
          Каталог
        </Link>
        {product.category ? (
          <>
            <span>/</span>
            <Link href={`/catalog?category=${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <ProductGallery images={product.images} alt={product.name} />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Icon className="h-3 w-3" />
                {meta.label}
              </Badge>
              {product.stock !== null ? (
                product.stock > 0 ? (
                  <Badge variant="success">В наличии: {product.stock}</Badge>
                ) : (
                  <Badge variant="destructive">Нет в наличии</Badge>
                )
              ) : (
                <Badge variant="success">Всегда в наличии</Badge>
              )}
              {product.reviewCount > 0 ? (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {product.rating.toFixed(1)} · {product.reviewCount} отзывов
                </span>
              ) : null}
            </div>

            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>

            {product.shortDescription ? (
              <p className="text-muted-foreground">{product.shortDescription}</p>
            ) : null}
          </div>

          {product.description ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{product.description}</ReactMarkdown>
            </div>
          ) : null}

          {/* Отзывы */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Отзывы</h2>

            {product.reviews.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Отзывов пока нет. Ваш может стать первым после покупки.
              </p>
            ) : (
              <div className="space-y-3">
                {product.reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="space-y-2 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.authorName}</span>
                          <Badge variant="outline" className="gap-1 text-xs">
                            <ShieldCheck className="h-3 w-3" />
                            Купил
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={
                              value <= review.rating
                                ? 'h-4 w-4 fill-amber-400 text-amber-400'
                                : 'h-4 w-4 text-muted-foreground'
                            }
                          />
                        ))}
                      </div>

                      <p className="text-sm">{review.comment}</p>

                      {review.adminReply ? (
                        <div className="rounded-lg bg-muted p-3 text-sm">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Ответ магазина</p>
                          {review.adminReply}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Блок покупки */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">{formatPrice(product.price, product.currency)}</span>
              {product.oldPrice && product.oldPrice > product.price ? (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.oldPrice, product.currency)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Продано: {product.salesCount}</p>
          </div>

          <BuyForm
            productId={product.id}
            price={product.price}
            currency={product.currency}
            maxPerOrder={product.maxPerOrder}
            stock={product.stock}
            providers={providers}
          />
        </aside>
      </div>
    </div>
  )
}
