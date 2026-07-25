import { PromocodesManager } from '@/components/admin/promocodes-manager'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminPromocodesPage() {
  const promocodes = await prisma.promocode.findMany({ orderBy: { createdAt: 'desc' } })

  const rows = promocodes.map((promocode) => ({
    id: promocode.id,
    code: promocode.code,
    description: promocode.description ?? '',
    discountType: promocode.discountType,
    discountValue: promocode.discountValue,
    minOrderAmount: promocode.minOrderAmount,
    maxDiscount: promocode.maxDiscount,
    usageLimit: promocode.usageLimit,
    usedCount: promocode.usedCount,
    perEmailLimit: promocode.perEmailLimit,
    validFrom: promocode.validFrom ? promocode.validFrom.toISOString().slice(0, 10) : '',
    validUntil: promocode.validUntil ? promocode.validUntil.toISOString().slice(0, 10) : '',
    isActive: promocode.isActive,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Промокоды</h1>
        <p className="text-muted-foreground">Скидки в процентах или фиксированной суммой</p>
      </div>

      <PromocodesManager promocodes={rows} />
    </div>
  )
}
