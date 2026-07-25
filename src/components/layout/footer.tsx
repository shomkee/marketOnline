import { Mail, MessageCircle } from 'lucide-react'
import Link from 'next/link'

import { getCategoriesWithCounts } from '@/lib/services/product.service'
import { getSettings } from '@/lib/services/settings.service'

/** Строит ссылку на Telegram из username. */
function telegramLink(username: string): string {
  return 'https://t.me/' + username.replace('@', '')
}

/** Подвал витрины с контактами и категориями. */
export async function Footer() {
  const [settings, categories] = await Promise.all([getSettings(), getCategoriesWithCounts()])
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-semibold">{settings.shopName}</p>
          <p className="text-sm text-muted-foreground">
            {settings.shopDescription || 'Цифровые товары с мгновенной автоматической выдачей после оплаты.'}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Каталог</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/catalog" className="hover:text-foreground">
                Все товары
              </Link>
            </li>
            {categories.slice(0, 5).map((category) => (
              <li key={category.id}>
                <Link href={`/catalog?category=${category.slug}`} className="hover:text-foreground">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Покупателям</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/order" className="hover:text-foreground">
                Найти заказ
              </Link>
            </li>
            <li>
              <Link href="/catalog?sort=new" className="hover:text-foreground">
                Новинки
              </Link>
            </li>
            <li>
              <Link href="/catalog?sort=popular" className="hover:text-foreground">
                Популярное
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Контакты</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {settings.contactEmail ? (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-foreground">
                  {settings.contactEmail}
                </a>
              </li>
            ) : null}
            {settings.telegramUsername ? (
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <a
                  href={telegramLink(settings.telegramUsername)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  {settings.telegramUsername}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-6">
        <p className="container text-center text-xs text-muted-foreground">
          &copy; {year} {settings.shopName}. Все права защищены.
        </p>
      </div>
    </footer>
  )
}
