'use client'

import { Loader2, ShoppingCart, Ticket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPrice } from '@/lib/utils'
import { createOrderSchema, emailSchema } from '@/lib/validations/order'

type ProviderOption = { code: 'CRYPTOBOT' | 'YOOKASSA'; title: string; description: string }

type BuyFormProps = {
  productId: string
  price: number
  currency: string
  maxPerOrder: number
  stock: number | null
  providers: ProviderOption[]
}

/** Форма оформления: email → количество → промокод → способ оплаты → редирект на платёжку. */
export function BuyForm({ productId, price, currency, maxPerOrder, stock, providers }: BuyFormProps) {
  const router = useRouter()

  const [email, setEmail] = React.useState('')
  const [quantity, setQuantity] = React.useState(1)
  const [promocode, setPromocode] = React.useState('')
  const [provider, setProvider] = React.useState<ProviderOption['code'] | null>(
    providers[0]?.code ?? null,
  )
  const [accepted, setAccepted] = React.useState(true)

  const [discount, setDiscount] = React.useState<{ amount: number; label: string } | null>(null)
  const [checkingPromo, setCheckingPromo] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const soldOut = stock !== null && stock <= 0
  const maxQuantity = Math.min(maxPerOrder, stock ?? maxPerOrder)
  const subtotal = price * quantity
  const total = Math.max(subtotal - (discount?.amount ?? 0), 0)

  // При изменении количества ранее применённая скидка больше не актуальна
  React.useEffect(() => {
    setDiscount(null)
  }, [quantity])

  async function applyPromocode() {
    if (!promocode.trim()) {
      toast.error('Введите промокод')
      return
    }

    setCheckingPromo(true)
    try {
      const response = await fetch('/api/promocode/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promocode.trim(),
          productId,
          quantity,
          email: email || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscount(null)
        toast.error(data.error ?? 'Промокод не применён')
        return
      }

      setDiscount({ amount: data.discountAmount, label: data.discountLabel })
      toast.success(`Промокод применён: ${data.discountLabel}`)
    } catch {
      toast.error('Не удалось проверить промокод')
    } finally {
      setCheckingPromo(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setErrors({})

    if (!provider) {
      toast.error('Выберите способ оплаты')
      return
    }

    // Клиентская валидация той же Zod-схемой, что и на сервере
    const parsed = createOrderSchema.safeParse({
      productId,
      quantity,
      email,
      promocode: promocode.trim() || undefined,
      provider,
      acceptTerms: accepted,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? 'Не удалось создать заказ')
        setSubmitting(false)
        return
      }

      toast.success('Заказ создан, переходим к оплате…')

      // Запоминаем токен, чтобы покупатель не потерял заказ после редиректа
      try {
        window.localStorage.setItem('lastOrderToken', data.publicToken)
      } catch {
        // localStorage может быть недоступен — это не критично
      }

      window.location.href = data.payUrl
    } catch {
      toast.error('Сетевая ошибка. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  if (soldOut) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <Badge variant="destructive">Нет в наличии</Badge>
        <p className="text-sm text-muted-foreground">
          Товар закончился. Загляните позже — склад пополняется.
        </p>
        <Button className="w-full" disabled>
          Купить
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email для получения товара</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => {
            const result = emailSchema.safeParse(email)
            setErrors((prev) => ({
              ...prev,
              email: result.success ? '' : result.error.issues[0].message,
            }))
          }}
          placeholder="you@example.com"
          required
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
      </div>

      {maxQuantity > 1 ? (
        <div className="space-y-1.5">
          <Label htmlFor="quantity">Количество</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              aria-label="Уменьшить"
            >
              &minus;
            </Button>
            <Input
              id="quantity"
              className="w-20 text-center"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => {
                const value = Number(event.target.value.replace(/\D/g, '')) || 1
                setQuantity(Math.min(Math.max(1, value), maxQuantity))
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
              aria-label="Увеличить"
            >
              +
            </Button>
            <span className="text-xs text-muted-foreground">макс. {maxQuantity}</span>
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="promocode">Промокод</Label>
        <div className="flex gap-2">
          <Input
            id="promocode"
            value={promocode}
            onChange={(event) => setPromocode(event.target.value.toUpperCase())}
            placeholder="WELCOME10"
          />
          <Button type="button" variant="outline" onClick={applyPromocode} disabled={checkingPromo}>
            {checkingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
            Применить
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Способ оплаты</Label>
        {providers.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Оплата временно недоступна. Напишите в поддержку.
          </p>
        ) : (
          <div className="grid gap-2">
            {providers.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => setProvider(option.code)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  provider === option.code
                    ? 'border-primary bg-accent'
                    : 'border-border hover:bg-accent/50'
                }`}
              >
                <p className="text-sm font-medium">{option.title}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-lg bg-muted/60 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Стоимость</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        {discount ? (
          <div className="flex justify-between text-success">
            <span>Скидка {discount.label}</span>
            <span>&minus;{formatPrice(discount.amount, currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span>К оплате</span>
          <span>{formatPrice(total, currency)}</span>
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        Я соглашаюсь с условиями продажи и понимаю, что цифровой товар возврату не подлежит
      </label>
      {errors.acceptTerms ? <p className="text-xs text-destructive">{errors.acceptTerms}</p> : null}

      <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={providers.length === 0}>
        <ShoppingCart className="h-4 w-4" />
        Купить за {formatPrice(total, currency)}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        После оплаты товар выдаётся автоматически и приходит на почту
      </p>
    </form>
  )
}
