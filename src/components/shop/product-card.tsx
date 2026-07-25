import { Download, KeyRound, Link2, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { CatalogProduct } from '@/lib/services/product.service'
import { cn, formatPrice } from '@/lib/utils'

const TYPE_META = {
  KEY: { label: 'Ключ', icon: KeyRound },
  FILE: { label: 'Файл', icon: Download },
  LINK: { label: 'Ссылка', icon: Link2 },
} as const

/** Карточка товара в сетке каталога. */
export function ProductCard({ product }: { product: CatalogProduct }) {
  const meta = TYPE_META[product.type]
  const Icon = meta.icon
  const soldOut = product.stock !== null && product.stock <= 0
  const cover = product.images[0]

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className={cn(
              'object-cover transition-transform duration-300 group-hover:scale-105',
              soldOut && 'opacity-50 grayscale',
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Icon className="h-10 w-10" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="secondary" className="gap-1">
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
          {product.oldPrice && product.oldPrice > product.price ? (
            <Badge variant="destructive">
              -{Math.round((1 - product.price / product.oldPrice) * 100)}%
            </Badge>
          ) : null}
        </div>

        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Badge variant="destructive" className="text-sm">Нет в наличии</Badge>
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1 space-y-1">
          {product.categoryName ? (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.categoryName}</p>
          ) : null}
          <Link href={`/product/${product.slug}`} className="line-clamp-2 font-medium hover:text-primary">
            {product.name}
          </Link>
          {product.shortDescription ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {product.reviewCount > 0 ? (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          ) : null}
          {product.stock !== null && product.stock > 0 ? <span>В наличии: {product.stock}</span> : null}
          {product.stock === null ? <span>Безлимит</span> : null}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">{formatPrice(product.price, product.currency)}</span>
          {product.oldPrice && product.oldPrice > product.price ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.oldPrice, product.currency)}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
