'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Поиск заказа по токену или ссылке из письма. */
export function OrderLookup() {
  const router = useRouter()
  const [value, setValue] = React.useState('')
  const [saved, setSaved] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      setSaved(window.localStorage.getItem('lastOrderToken'))
    } catch {
      setSaved(null)
    }
  }, [])

  function open(token: string) {
    const clean = token.trim().split('/').filter(Boolean).pop()

    if (!clean || clean.length < 16) {
      toast.error('Похоже, токен заказа некорректен')
      return
    }

    router.push(`/order/${clean}`)
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="space-y-1.5">
        <Label htmlFor="token">Ссылка или токен заказа</Label>
        <Input
          id="token"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Вставьте ссылку из письма"
          onKeyDown={(event) => {
            if (event.key === 'Enter') open(value)
          }}
        />
      </div>

      <Button className="w-full" onClick={() => open(value)}>
        Открыть заказ
        <ArrowRight className="h-4 w-4" />
      </Button>

      {saved ? (
        <Button variant="ghost" className="w-full" onClick={() => open(saved)}>
          Открыть последний заказ с этого устройства
        </Button>
      ) : null}
    </div>
  )
}
