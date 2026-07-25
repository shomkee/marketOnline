'use client'

import { Ban, PackageCheck, Save, Undo2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import {
  cancelOrderAction,
  fulfillOrderAction,
  refundOrderAction,
  saveOrderNoteAction,
} from '@/actions/order.actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/** Кнопки управления заказом в админке. */
export function AdminOrderActions({
  orderId,
  status,
  initialNote,
}: {
  orderId: string
  status: 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  initialNote: string
}) {
  const router = useRouter()

  const [note, setNote] = React.useState(initialNote)
  const [pending, startTransition] = React.useTransition()

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(result.message ?? 'Готово')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Ошибка')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {status !== 'DELIVERED' && status !== 'REFUNDED' ? (
          <Button disabled={pending} onClick={() => run(() => fulfillOrderAction(orderId))}>
            <PackageCheck className="h-4 w-4" />
            Выдать вручную
          </Button>
        ) : null}

        {status === 'PENDING' ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => cancelOrderAction(orderId, 'Отменён администратором'))}
          >
            <Ban className="h-4 w-4" />
            Отменить
          </Button>
        ) : null}

        {status === 'DELIVERED' || status === 'PAID' ? (
          <Button
            variant="outline"
            className="text-destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm('Отметить заказ как возврат?')) return
              run(() => refundOrderAction(orderId, note))
            }}
          >
            <Undo2 className="h-4 w-4" />
            Отметить возврат
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Textarea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Внутренняя заметка по заказу"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => saveOrderNoteAction(orderId, note))}
        >
          <Save className="h-4 w-4" />
          Сохранить заметку
        </Button>
      </div>
    </div>
  )
}
