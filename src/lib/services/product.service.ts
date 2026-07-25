import { Prisma, ProductType } from '@prisma/client'

import { prisma } from '../prisma'
import type { CatalogFilters } from '../validations/product'
import { getStockMap } from './stock.service'

export const PAGE_SIZE = 12

export type CatalogProduct = {
  id: string
  slug: string
  name: string
  shortDescription: string | null
  price: number
  oldPrice: number | null
  currency: string
  images: string[]
  type: ProductType
  rating: number
  reviewCount: number
  salesCount: number
  categoryName: string | null
  /** null — бесконечный остаток (FILE / LINK) */
  stock: number | null
}

function buildOrderBy(sort: CatalogFilters['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'new':
      return [{ createdAt: 'desc' }]
    case 'price-asc':
      return [{ price: 'asc' }]
    case 'price-desc':
      return [{ price: 'desc' }]
    case 'rating':
      return [{ rating: 'desc' }, { reviewCount: 'desc' }]
    default:
      return [{ salesCount: 'desc' }, { createdAt: 'desc' }]
  }
}

/** Поиск товаров для каталога с фильтрами, сортировкой и пагинацией. */
export async function searchProducts(filters: CatalogFilters): Promise<{
  products: CatalogProduct[]
  total: number
  pageCount: number
}> {
  const where: Prisma.ProductWhereInput = { isActive: true }

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { shortDescription: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
    ]
  }

  if (filters.category) {
    where.category = { slug: filters.category }
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: Math.round(filters.minPrice * 100) } : {}),
      ...(filters.maxPrice !== undefined ? { lte: Math.round(filters.maxPrice * 100) } : {}),
    }
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        name: true,
        shortDescription: true,
        price: true,
        oldPrice: true,
        currency: true,
        images: true,
        type: true,
        rating: true,
        reviewCount: true,
        salesCount: true,
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  // Остатки одним запросом — без N+1
  const keyProductIds = rows.filter((row) => row.type === ProductType.KEY).map((row) => row.id)
  const stockMap = await getStockMap(keyProductIds)

  return {
    products: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      shortDescription: row.shortDescription,
      price: row.price,
      oldPrice: row.oldPrice,
      currency: row.currency,
      images: row.images,
      type: row.type,
      rating: row.rating,
      reviewCount: row.reviewCount,
      salesCount: row.salesCount,
      categoryName: row.category?.name ?? null,
      stock: row.type === ProductType.KEY ? (stockMap.get(row.id) ?? 0) : null,
    })),
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

/** Популярные товары для главной страницы. */
export async function getFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, OR: [{ isFeatured: true }, { salesCount: { gt: 0 } }] },
    orderBy: [{ isFeatured: 'desc' }, { salesCount: 'desc' }],
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      price: true,
      oldPrice: true,
      currency: true,
      images: true,
      type: true,
      rating: true,
      reviewCount: true,
      salesCount: true,
      category: { select: { name: true } },
    },
  })

  const stockMap = await getStockMap(
    rows.filter((row) => row.type === ProductType.KEY).map((row) => row.id),
  )

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    price: row.price,
    oldPrice: row.oldPrice,
    currency: row.currency,
    images: row.images,
    type: row.type,
    rating: row.rating,
    reviewCount: row.reviewCount,
    salesCount: row.salesCount,
    categoryName: row.category?.name ?? null,
    stock: row.type === ProductType.KEY ? (stockMap.get(row.id) ?? 0) : null,
  }))
}

/** Карточка товара по slug вместе с одобренными отзывами. */
export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          authorName: true,
          comment: true,
          adminReply: true,
          createdAt: true,
        },
      },
    },
  })

  if (!product || !product.isActive) return null

  const stock =
    product.type === ProductType.KEY
      ? await prisma.productKey.count({ where: { productId: product.id, status: 'AVAILABLE' } })
      : null

  return { ...product, stock }
}

/** Активные категории с количеством товаров. */
export async function getCategoriesWithCounts() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  })

  return categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    icon: category.icon,
    productCount: category._count.products,
  }))
}
