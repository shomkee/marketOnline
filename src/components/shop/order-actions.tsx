'use client'

import { Download, Mail, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

/** Кнопка скачивания файла через подписанную ссылку. */
export function DownloadButton({ token, itemId }: { token: string; itemId: string }) {
  return (
    <Button asChild>
      <a href={`/api/download/${token}?item=${itemId}`} rel="noreferrer">
        <Download className="h-4 w-4" />
        Скачать файл
      </a>
    </Button>
  )
}

/** Повторная отправка товара на почту. */
export function ResendButton({ token }: { token: string }) {
  const [loading, setLoading] = React.useState(false)

  async function resend() {
    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${token}/resend`, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? 'Не удалось отправить письмо')
        return
      }

      toast.success(`Письмо отправлено на ${data.email}`)
    } catch {
      toast.error('Сетевая ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={resend} loading={loading}>
      <Mail className="h-4 w-4" />
      Отправить на почту
    </Button>
  )
}

/**
 * Автообновление страницы пока заказ в статусе PENDING:
 * webhook может прийти в любой момент, покупатель не должен жать F5.
 */
export function OrderAutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()

  React.useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(timer)
  }, [router, intervalMs])

  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      Страница обновляется автоматически
    </p>
  )
}
