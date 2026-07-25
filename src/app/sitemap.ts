import type { MetadataRoute } from 'next'

import { getAppUrl } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export const revalidate = 3600

/** sitemap.xml: главная, каталог, категории и все активные товары. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl()

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ])

  return [
    { url: appUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${appUrl}/catalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...categories.map((category) => ({
      url: `${appUrl}/catalog?category=${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${appUrl}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
