'use client'

import { Check, Star, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { deleteReviewAction, moderateReviewAction } from '@/actions/review.actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/utils'

type ReviewRow = {
  id: string
  productName: string
  authorName: string
  rating: number
  comment: string
  adminReply: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

const STATUS_META = {
  PENDING: { label: 'На модерации', variant: 'warning' as const },
  APPROVED: { label: 'Опубликован', variant: 'success' as const },
  REJECTED: { label: 'Отклонён', variant: 'destructive' as const },
}

/** Список отзывов с модерацией и ответом магазина. */
export function ReviewsModeration({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter()

  const [replies, setReplies] = React.useState<Record<string, string>>(
    Object.fromEntries(reviews.map((review) => [review.id, review.adminReply])),
  )
  const [pending, startTransition] = React.useTransition()

  function moderate(reviewId: string, status: 'APPROVED' | 'REJECTED') {
    startTransition(async () => {
      const result = await moderateReviewAction({
        reviewId,
        status,
        adminReply: replies[reviewId] || undefined,
      })

      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function remove(reviewId: string) {
    if (!window.confirm('Удалить отзыв?')) return

    startTransition(async () => {
      const result = await deleteReviewAction(reviewId)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
        Отзывов пока нет.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="font-medium">{review.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {review.authorName} · {formatDateTime(review.createdAt)}
                </p>
              </div>
              <Badge variant={STATUS_META[review.status].variant}>
                {STATUS_META[review.status].label}
              </Badge>
            </div>

            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={
                    value <= review.rating
                      ? 'h-4 w-4 fill-amber-400 text-amber-400'
                      : 'h-4 w-4 text-muted-foreground'
                  }
                />
              ))}
            </div>

            <p className="text-sm">{review.comment}</p>

            <Textarea
              rows={2}
              value={replies[review.id] ?? ''}
              onChange={(event) => setReplies({ ...replies, [review.id]: event.target.value })}
              placeholder="Ответ магазина (необязательно)"
            />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={pending} onClick={() => moderate(review.id, 'APPROVED')}>
                <Check className="h-4 w-4" />
                Опубликовать
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => moderate(review.id, 'REJECTED')}
              >
                <X className="h-4 w-4" />
                Отклонить
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => remove(review.id)}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
