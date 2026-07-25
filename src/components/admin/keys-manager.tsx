'use client'

import { Ban, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { bulkImportKeysAction, deleteKeyAction, toggleKeyDisabledAction } from '@/actions/key.actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/utils'

type KeyRow = {
  id: string
  masked: string
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DISABLED'
  note: string | null
  createdAt: string
  soldAt: string | null
}

const STATUS_META = {
  AVAILABLE: { label: 'Свободен', variant: 'success' as const },
  RESERVED: { label: 'Забронирован', variant: 'warning' as const },
  SOLD: { label: 'Продан', variant: 'secondary' as const },
  DISABLED: { label: 'Отключён', variant: 'destructive' as const },
}

/** Управление складом ключей: массовая загрузка текстом или .txt-файлом. */
export function KeysManager({
  productId,
  keys,
  stats,
}: {
  productId: string
  keys: KeyRow[]
  stats: { available: number; reserved: number; sold: number; disabled: number }
}) {
  const router = useRouter()

  const [raw, setRaw] = React.useState('')
  const [note, setNote] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const fileRef = React.useRef<HTMLInputElement>(null)

  async function readTxtFile(file: File | undefined) {
    if (!file) return

    const text = await file.text()
    setRaw((prev) => (prev ? `${prev}\n${text}` : text))
    toast.success(`Файл ${file.name} загружен в поле`)

    if (fileRef.current) fileRef.current.value = ''
  }

  async function importKeys() {
    if (!raw.trim()) {
      toast.error('Вставьте ключи — по одному в строке')
      return
    }

    setSaving(true)
    const result = await bulkImportKeysAction({ productId, keys: raw, note: note || undefined })
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success(result.message)
    setRaw('')
    setNote('')
    router.refresh()
  }

  function removeKey(keyId: string) {
    startTransition(async () => {
      const result = await deleteKeyAction(keyId)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function toggleKey(keyId: string, disabled: boolean) {
    startTransition(async () => {
      const result = await toggleKeyDisabledAction(keyId, disabled)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Свободно</p>
            <p className="text-xl font-semibold text-success">{stats.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Забронировано</p>
            <p className="text-xl font-semibold">{stats.reserved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Продано</p>
            <p className="text-xl font-semibold">{stats.sold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Отключено</p>
            <p className="text-xl font-semibold">{stats.disabled}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Загрузка ключей</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="keys">Ключи (по одному в строке)</Label>
            <Textarea
              id="keys"
              rows={8}
              className="font-mono text-xs"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder={'XXXX-YYYY-ZZZZ\nlogin:password\n…'}
            />
            <p className="text-xs text-muted-foreground">
              Дубликаты отсеиваются автоматически. Ключи хранятся в шифрованном виде.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Заметка к партии</Label>
            <Input
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Например: закупка от 12.05"
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            hidden
            onChange={(event) => readTxtFile(event.target.files?.[0])}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={importKeys} loading={saving}>
              <Upload className="h-4 w-4" />
              Добавить на склад
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              Загрузить .txt
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Склад</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ключ</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Заметка</TableHead>
                <TableHead>Добавлен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Склад пуст.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono text-xs">{key.masked}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_META[key.status].variant}>{STATUS_META[key.status].label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{key.note ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(key.createdAt)}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      {key.status === 'AVAILABLE' || key.status === 'DISABLED' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pending}
                            aria-label="Переключить доступность"
                            onClick={() => toggleKey(key.id, key.status === 'AVAILABLE')}
                          >
                            {key.status === 'AVAILABLE' ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pending}
                            aria-label="Удалить ключ"
                            className="text-destructive"
                            onClick={() => removeKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {key.soldAt ? formatDateTime(key.soldAt) : '—'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
