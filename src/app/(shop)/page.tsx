import { ArrowRight, Bolt, Lock, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { ProductCard } from '@/components/shop/product-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getCategoriesWithCounts, getFeaturedProducts } from '@/lib/services/product.service'
import { getSettings } from '@/lib/services/settings.service'

// Главная регенерируется раз в минуту: быстрая отдача и актуальные остатки
export const revalidate = 60

const ADVANTAGES = [
  { icon: Bolt, title: 'Мгновенная выдача', text: 'Товар приходит автоматически сразу после оплаты.' },
  { icon: Lock, title: 'Без регистрации', text: 'Достаточно email — никаких лишних анкет и паролей.' },
  { icon: Mail, title: 'Дубль на почту', text: 'Ключи и файлы продублируем письмом с постоянной ссылкой.' },
  { icon: ShieldCheck, title: 'Безопасная оплата', text: 'Крипта и карты через проверенные платёжные сервисы.' },
]

export default async function HomePage() {
  const [settings, products, categories] = await Promise.all([
    getSettings(),
    getFeaturedProducts(8),
    getCategoriesWithCounts(),
  ])

  return (
    <>
      {/* Hero */}
      <section className="hero-gradient border-b border-border">
        <div className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Автовыдача 24/7 — без ожидания продавца
          </span>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {settings.shopName}
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground">
            {settings.shopDescription ||
              'Ключи, аккаунты, файлы и подписки. Оплатите — и получите товар через несколько секунд.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/catalog">
                Перейти в каталог
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/order">Найти свой заказ</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="container grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {ADVANTAGES.map((item) => (
          <Card key={item.title}>
            <CardContent className="space-y-2 p-5">
              <item.icon className="h-6 w-6 text-primary" />
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Категории */}
      {categories.length > 0 ? (
        <section className="container space-y-5 py-8">
          <h2 className="text-2xl font-semibold tracking-tight">Категории</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link key={category.id} href={`/catalog?category=${category.slug}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardContent className="space-y-1 p-5">
                    <p className="text-2xl">{category.icon ?? '📦'}</p>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">{category.productCount} товаров</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Популярные товары */}
      <section className="container space-y-5 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Популярные товары</h2>
          <Button variant="ghost" asChild>
            <Link href="/catalog">
              Все товары
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Товары скоро появятся. Загляните позже.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
