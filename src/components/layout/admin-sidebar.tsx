'use client'

import {
  BarChart3,
  FolderTree,
  LogOut,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Store,
  Ticket,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Дашборд', icon: BarChart3, exact: true },
  { href: '/admin/products', label: 'Товары', icon: Package },
  { href: '/admin/categories', label: 'Категории', icon: FolderTree },
  { href: '/admin/orders', label: 'Заказы', icon: Receipt },
  { href: '/admin/promocodes', label: 'Промокоды', icon: Ticket },
  { href: '/admin/reviews', label: 'Отзывы', icon: MessageSquare },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
]

/** Боковое меню админки. На мобильных превращается в горизонтальную ленту. */
export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex shrink-0 flex-col gap-4 border-b border-border bg-card p-4 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:sticky lg:top-0">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="font-semibold">
          Админ-панель
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex gap-1 overflow-x-auto lg:flex-1 lg:flex-col lg:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="truncate px-1 text-xs text-muted-foreground">{userName}</p>
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link href="/" target="_blank">
            <Store className="h-4 w-4" />
            Открыть витрину
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
      </div>
    </aside>
  )
}
