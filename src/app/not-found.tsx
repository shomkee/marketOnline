import Link from 'next/link'

import { Button } from '@/components/ui/button'

/** Страница 404. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="max-w-md text-muted-foreground">
        Возможно, товар был снят с продажи или ссылка устарела.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">На главную</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/catalog">В каталог</Link>
        </Button>
      </div>
    </div>
  )
}
