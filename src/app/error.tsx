'use client'

import { RotateCcw } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'

/** Глобальный обработчик ошибок: пользователю — понятное сообщение, детали — в консоль. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[app] Необработанная ошибка:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
      <p className="max-w-md text-muted-foreground">
        Мы уже записали ошибку в логи. Попробуйте обновить страницу.
        {error.digest ? ` Код: ${error.digest}` : ''}
      </p>
      <Button onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        Попробовать снова
      </Button>
    </div>
  )
}
