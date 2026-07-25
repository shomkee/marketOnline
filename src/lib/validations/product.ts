import { z } from 'zod'

/** Схема товара для формы админки. */
export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Название от 2 символов').max(200, 'Название до 200 символов'),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]*$/, 'Slug может содержать только латиницу, цифры и дефис')
      .max(80)
      .optional(),
    shortDescription: z.string().trim().max(300, 'До 300 символов').optional().or(z.literal('')),
    description: z.string().trim().min(10, 'Описание от 10 символов'),
    type: z.enum(['KEY', 'FILE', 'LINK']),

    /** Цена вводится в рублях, хранится в копейках */
    price: z.coerce.number().min(1, 'Цена должна быть больше нуля').max(10_000_000),
    oldPrice: z.coerce.number().min(0).max(10_000_000).optional(),

    images: z.array(z.string().url('Некорректный URL изображения')).max(10, 'Максимум 10 изображений').default([]),

    fileKey: z.string().optional().or(z.literal('')),
    fileName: z.string().optional().or(z.literal('')),
    fileSize: z.coerce.number().int().min(0).optional(),
    linkContent: z.string().trim().optional().or(z.literal('')),

    lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(5),
    maxPerOrder: z.coerce.number().int().min(1).max(100).default(10),

    categoryId: z.string().optional().or(z.literal('')),

    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),

    metaTitle: z.string().trim().max(120).optional().or(z.literal('')),
    metaDescription: z.string().trim().max(200).optional().or(z.literal('')),
  })
  // Перекрёстная валидация: товар типа FILE обязан иметь файл
  .refine((data) => data.type !== 'FILE' || Boolean(data.fileKey), {
    message: 'Для товара типа «Файл» нужно загрузить файл',
    path: ['fileKey'],
  })
  // Товар типа LINK обязан иметь содержимое
  .refine((data) => data.type !== 'LINK' || Boolean(data.linkContent), {
    message: 'Для товара типа «Ссылка» нужно указать содержимое',
    path: ['linkContent'],
  })
  // Старая цена должна быть выше текущей, иначе скидка выглядит странно
  .refine((data) => !data.oldPrice || data.oldPrice > data.price, {
    message: 'Старая цена должна быть больше текущей',
    path: ['oldPrice'],
  })

export type ProductInput = z.infer<typeof productSchema>

/** Схема категории. */
export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Название от 2 символов').max(100),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, 'Slug может содержать только латиницу, цифры и дефис')
    .max(80)
    .optional(),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  icon: z.string().trim().max(40).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  parentId: z.string().optional().or(z.literal('')),
})

export type CategoryInput = z.infer<typeof categorySchema>

/** Массовая загрузка ключей. */
export const bulkKeysSchema = z.object({
  productId: z.string().min(1),
  /** Ключи строками, по одному на строку */
  rawKeys: z.string().min(1, 'Вставьте ключи или загрузите .txt-файл'),
  note: z.string().trim().max(200).optional().or(z.literal('')),
})

export type BulkKeysInput = z.infer<typeof bulkKeysSchema>

/** Фильтры каталога на витрине. */
export const catalogFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['popular', 'new', 'price-asc', 'price-desc', 'rating']).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
})

export type CatalogFilters = z.infer<typeof catalogFiltersSchema>
