'use client'

import { Search, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounce } from '@/hooks/use-debounce'

type CategoryOption = { slug: string; name: string; productCount: number }

const SORT_OPTIONS = [
  { value: 'popular', label: 'По популярности' },
  { value: 'new', label: 'Сначала новые' },
  { value: 'price-asc', label: 'Цена: по возрастанию' },
  { value: 'price-desc', label: 'Цена: по убыванию' },
  { value: 'rating', label: 'По рейтингу' },
]

/** Панель фильтров каталога. Всё состояние живёт в URL — ссылками можно делиться. */
export function CatalogFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = React.useState(searchParams.get('q') ?? '')
  const [minPrice, setMinPrice] = React.useState(searchParams.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = React.useState(searchParams.get('maxPrice') ?? '')

  const debouncedQuery = useDebounce(query, 450)
  const debouncedMin = useDebounce(minPrice, 600)
  const debouncedMax = useDebounce(maxPrice, 600)

  const currentCategory = searchParams.get('category') ?? 'all'
  const currentSort = searchParams.get('sort') ?? 'popular'

  const pushParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      }

      // Любое изменение фильтра сбрасывает пагинацию
      params.delete('page')

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  // Синхронизация debounce-полей с URL
  React.useEffect(() => {
    if ((searchParams.get('q') ?? '') !== debouncedQuery) {
      pushParams({ q: debouncedQuery || null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  React.useEffect(() => {
    if ((searchParams.get('minPrice') ?? '') !== debouncedMin) {
      pushParams({ minPrice: debouncedMin || null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin])

  React.useEffect(() => {
    if ((searchParams.get('maxPrice') ?? '') !== debouncedMax) {
      pushParams({ maxPrice: debouncedMax || null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMax])

  const hasFilters = Boolean(
    searchParams.get('q') ||
      searchParams.get('category') ||
      searchParams.get('minPrice') ||
      searchParams.get('maxPrice'),
  )

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по товарам…"
          className="pl-9"
          aria-label="Поиск по товарам"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Категория</Label>
          <Select
            value={currentCategory}
            onValueChange={(value) => pushParams({ category: value === 'all' ? null : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.slug} value={category.slug}>
                  {category.name} ({category.productCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Сортировка</Label>
          <Select value={currentSort} onValueChange={(value) => pushParams({ sort: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="minPrice">Цена от, ₽</Label>
          <Input
            id="minPrice"
            inputMode="numeric"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ''))}
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maxPrice">Цена до, ₽</Label>
          <Input
            id="maxPrice"
            inputMode="numeric"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ''))}
            placeholder="100000"
          />
        </div>
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery('')
            setMinPrice('')
            setMaxPrice('')
            router.replace(pathname, { scroll: false })
          }}
        >
          <X className="h-4 w-4" />
          Сбросить фильтры
        </Button>
      ) : null}
    </div>
  )
}
