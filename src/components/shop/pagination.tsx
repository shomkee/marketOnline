'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { cn } from '@/lib/utils'

/** Пагинация каталога на ссылках — работает и без JS, индексируется поисковиками. */
export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (pageCount <= 1) return null

  const buildHref = (target: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (target <= 1) params.delete('page')
    else params.set('page', String(target))
    const queryString = params.toString()
    return queryString ? `${pathname}?${queryString}` : pathname
  }

  // Окно из максимум 5 страниц вокруг текущей
  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index).filter(
    (value) => value >= 1 && value <= pageCount,
  )

  const linkClass = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border px-3 text-sm transition-colors hover:bg-accent'

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Пагинация">
      <Link
        href={buildHref(page - 1)}
        aria-disabled={page <= 1}
        className={cn(linkClass, page <= 1 && 'pointer-events-none opacity-40')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {pages.map((value) => (
        <Link
          key={value}
          href={buildHref(value)}
          aria-current={value === page ? 'page' : undefined}
          className={cn(linkClass, value === page && 'bg-primary text-primary-foreground hover:bg-primary')}
        >
          {value}
        </Link>
      ))}

      <Link
        href={buildHref(page + 1)}
        aria-disabled={page >= pageCount}
        className={cn(linkClass, page >= pageCount && 'pointer-events-none opacity-40')}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  )
}
