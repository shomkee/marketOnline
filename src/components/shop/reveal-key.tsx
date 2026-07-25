'use client'

import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

/** Показ выданных ключей с копированием. По умолчанию ключи скрыты. */
export function RevealKeys({ keys }: { keys: string[] }) {
  const [visible, setVisible] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(keys.join('\n'))
      setCopied(true)
      toast.success('Скопировано в буфер обмена')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Браузер запретил доступ к буферу обмена')
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {keys.map((key, index) => (
          <div
            key={index}
            className="break-all rounded-lg bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100"
          >
            {visible ? key : '•'.repeat(Math.min(key.length, 32))}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setVisible((value) => !value)}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {visible ? 'Скрыть' : 'Показать ключ'}
        </Button>
        <Button variant="outline" size="sm" onClick={copyAll}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Скопировать
        </Button>
      </div>
    </div>
  )
}
