'use client'

import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import * as React from 'react'

import { cn } from '@/lib/utils'

/** Галерея изображений товара с миниатюрами. */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = React.useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
        <ImageIcon className="h-12 w-12" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
        <Image
          src={images[active]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Изображение ${index + 1}`}
              className={cn(
                'relative aspect-square overflow-hidden rounded-lg border-2 bg-muted transition-colors',
                index === active ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              <Image src={image} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
