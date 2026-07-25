'use client'

import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createReviewSchema } from '@/lib/validations/review'

/** Форма отзыва на странице заказа. */
export function ReviewForm({
  orderToken,
  productId,
  productName,
}: {
  orderToken: string
  productId: string
  productName: string
}) {
  const router = useRouter()

  const [rating, setRating] = React.useState(5)
  const [hovered, setHovered] = React.useState(0)
  const [authorName, setAuthorName] = React.useState('')
  const [comment, setComment] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setErrors({})

    const parsed = createReviewSchema.safeParse({
      orderToken,
      productId,
      rating,
      authorName,
      comment,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? 'Не удалось отправить отзыв')
        return
      }

      toast.success(data.message)
      router.refresh()
    } catch {
      toast.error('Сетевая ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <p className="font-medium">Оставить отзыв</p>
        <p className="text-sm text-muted-foreground">{productName}</p>
      </div>

      <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Оценка ${value}`}
            onMouseEnter={() => setHovered(value)}
            onClick={() => setRating(value)}
          >
            <Star
              className={cn(
                'h-7 w-7 transition-colors',
                value <= (hovered || rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground',
              )}
            />
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="authorName">Имя</Label>
        <Input
          id="authorName"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="Как вас подписать"
        />
        {errors.authorName ? <p className="text-xs text-destructive">{errors.authorName}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comment">Отзыв</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Что понравилось, что можно улучшить?"
          rows={4}
        />
        {errors.comment ? <p className="text-xs text-destructive">{errors.comment}</p> : null}
      </div>

      <Button type="submit" loading={loading}>
        Отправить отзыв
      </Button>
    </form>
  )
}
