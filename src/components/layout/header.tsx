import { Search, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { getCategoriesWithCounts } from '@/lib/services/product.service'
import { getSettings } from '@/lib/services/settings.service'

/** Шапка витрины. Серверный компонент: название и категории тянем из БД. */
export async function Header() {
  const [settings, categories] = await Promise.all([getSettings(), getCategoriesWithCounts()])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">{settings.shopName}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/catalog">Каталог</Link>
          </Button>
          {categories.slice(0, 4).map((category) => (
            <Button key={category.id} variant="ghost" size="sm" asChild>
              <Link href={`/catalog?category=${category.slug}`}>{category.name}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild aria-label="Поиск">
            <Link href="/catalog">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/order">
              <ShieldCheck className="h-4 w-4" />
              Мой заказ
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
