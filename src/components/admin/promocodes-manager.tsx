'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import {
  createPromocodeAction,
  deletePromocodeAction,
  updatePromocodeAction,
} from '@/actions/promocode.actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPrice } from '@/lib/utils'

type PromocodeRow = {
  id: string
  code: string
  description: string
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  minOrderAmount: number
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  perEmailLimit: number | null
  validFrom: string
  validUntil: string
  isActive: boolean
}

type FormValues = {
  code: string
  description: string
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  minOrderAmount: number
  maxDiscount: number | null
  usageLimit: number | null
  perEmailLimit: number | null
  validFrom: string
  validUntil: string
  isActive: boolean
}

const EMPTY: FormValues = {
  code: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscount: null,
  usageLimit: null,
  perEmailLimit: null,
  validFrom: '',
  validUntil: '',
  isActive: true,
}

function numberOrNull(value: string): number | null {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) : null
}

/** CRUD промокодов. */
export function PromocodesManager({ promocodes }: { promocodes: PromocodeRow[] }) {
  const router = useRouter()

  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [values, setValues] = React.useState<FormValues>(EMPTY)
  const [saving, setSaving] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function openCreate() {
    setEditingId(null)
    setValues(EMPTY)
    setOpen(true)
  }

  function openEdit(promocode: PromocodeRow) {
    setEditingId(promocode.id)
    setValues({
      code: promocode.code,
      description: promocode.description,
      discountType: promocode.discountType,
      discountValue: promocode.discountValue,
      minOrderAmount: promocode.minOrderAmount,
      maxDiscount: promocode.maxDiscount,
      usageLimit: promocode.usageLimit,
      perEmailLimit: promocode.perEmailLimit,
      validFrom: promocode.validFrom,
      validUntil: promocode.validUntil,
      isActive: promocode.isActive,
    })
    setOpen(true)
  }

  async function save() {
    setSaving(true)

    const payload = {
      ...values,
      description: values.description || undefined,
      maxDiscount: values.maxDiscount ?? undefined,
      usageLimit: values.usageLimit ?? undefined,
      perEmailLimit: values.perEmailLimit ?? undefined,
      validFrom: values.validFrom || undefined,
      validUntil: values.validUntil || undefined,
    }

    const result = editingId
      ? await updatePromocodeAction(editingId, payload)
      : await createPromocodeAction(payload)

    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success(result.message)
    setOpen(false)
    router.refresh()
  }

  function remove(id: string) {
    if (!window.confirm('Удалить промокод?')) return

    startTransition(async () => {
      const result = await deletePromocodeAction(id)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <Button onClick={openCreate}>
        <Plus className="h-4 w-4" />
        Создать промокод
      </Button>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Скидка</TableHead>
                <TableHead>Мин. сумма</TableHead>
                <TableHead>Использований</TableHead>
                <TableHead>Срок</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {promocodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Промокодов пока нет.
                  </TableCell>
                </TableRow>
              ) : (
                promocodes.map((promocode) => (
                  <TableRow key={promocode.id}>
                    <TableCell className="font-mono font-medium">{promocode.code}</TableCell>
                    <TableCell>
                      {promocode.discountType === 'PERCENT'
                        ? `${promocode.discountValue}%`
                        : formatPrice(promocode.discountValue)}
                    </TableCell>
                    <TableCell>{formatPrice(promocode.minOrderAmount)}</TableCell>
                    <TableCell>
                      {promocode.usedCount}
                      {promocode.usageLimit ? ` / ${promocode.usageLimit}` : ''}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {promocode.validUntil ? `до ${promocode.validUntil}` : 'бессрочно'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={promocode.isActive ? 'success' : 'secondary'}>
                        {promocode.isActive ? 'Активен' : 'Выключен'}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button variant="ghost" size="icon" aria-label="Изменить" onClick={() => openEdit(promocode)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Удалить"
                        className="text-destructive"
                        disabled={pending}
                        onClick={() => remove(promocode.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Изменить промокод' : 'Новый промокод'}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="promo-code">Код</Label>
              <Input
                id="promo-code"
                value={values.code}
                onChange={(event) => setValues({ ...values, code: event.target.value.toUpperCase() })}
                placeholder="SALE10"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Тип скидки</Label>
                <Select
                  value={values.discountType}
                  onValueChange={(value) =>
                    setValues({ ...values, discountType: value as FormValues['discountType'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Процент</SelectItem>
                    <SelectItem value="FIXED">Фиксированная сумма</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promo-value">
                  {values.discountType === 'PERCENT' ? 'Процент' : 'Сумма, копейки'}
                </Label>
                <Input
                  id="promo-value"
                  inputMode="numeric"
                  value={values.discountValue}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      discountValue: Number(event.target.value.replace(/\D/g, '')) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="promo-min">Мин. сумма заказа, коп.</Label>
                <Input
                  id="promo-min"
                  inputMode="numeric"
                  value={values.minOrderAmount}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      minOrderAmount: Number(event.target.value.replace(/\D/g, '')) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promo-max">Макс. скидка, коп.</Label>
                <Input
                  id="promo-max"
                  inputMode="numeric"
                  value={values.maxDiscount ?? ''}
                  onChange={(event) =>
                    setValues({ ...values, maxDiscount: numberOrNull(event.target.value) })
                  }
                  placeholder="Без ограничений"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="promo-limit">Лимит использований</Label>
                <Input
                  id="promo-limit"
                  inputMode="numeric"
                  value={values.usageLimit ?? ''}
                  onChange={(event) =>
                    setValues({ ...values, usageLimit: numberOrNull(event.target.value) })
                  }
                  placeholder="Без лимита"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promo-per-email">Лимит на email</Label>
                <Input
                  id="promo-per-email"
                  inputMode="numeric"
                  value={values.perEmailLimit ?? ''}
                  onChange={(event) =>
                    setValues({ ...values, perEmailLimit: numberOrNull(event.target.value) })
                  }
                  placeholder="Без лимита"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="promo-from">Действует с</Label>
                <Input
                  id="promo-from"
                  type="date"
                  value={values.validFrom}
                  onChange={(event) => setValues({ ...values, validFrom: event.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promo-until">Действует до</Label>
                <Input
                  id="promo-until"
                  type="date"
                  value={values.validUntil}
                  onChange={(event) => setValues({ ...values, validUntil: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promo-description">Описание</Label>
              <Input
                id="promo-description"
                value={values.description}
                onChange={(event) => setValues({ ...values, description: event.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.isActive}
                onChange={(event) => setValues({ ...values, isActive: event.target.checked })}
              />
              Промокод активен
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
