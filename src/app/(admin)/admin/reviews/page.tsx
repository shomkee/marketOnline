import { ReviewsModeration } from '@/components/admin/reviews-moderation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: { product: { select: { name: true } } },
  })

  const rows = reviews.map((review) => ({
    id: review.id,
    productName: review.product.name,
    authorName: review.authorName,
    rating: review.rating,
    comment: review.comment,
    adminReply: review.adminReply ?? '',
    status: review.status,
    createdAt: review.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Отзывы</h1>
        <p className="text-muted-foreground">Модерация и ответы покупателям</p>
      </div>

      <ReviewsModeration reviews={rows} />
    </div>
  )
}
