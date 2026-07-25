'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { toPublicError } from '@/lib/errors'
import { slugify } from '@/lib/utils'
import { categorySchema, productSchema } from '@/lib/validations/product'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

/** Превращает ZodError в карту ошибок полей. */
function fieldErrorsFromZod(issues: Array<{ path: (string | number)[]; message: string }>) {
  const result: Record<string, string> = {}
  for (const issue of issues) result[String(issue.path[0])] = issue.message
  return result
}

/** Генерация уникального slug для товара. */
async function uniqueProductSlug(name: string, currentId?: string): Promise<string> {
  const base = slugify(name) || 'product'
  let candidate = base
  let index = 2

  // Цикл завершается, как только найдён свободный slug
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing || existing.id === currentId) return candidate
    candidate = `${base}-${index}`
    index += 1
  }
}

/** Создание товара. */
export async function createProductAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const parsed = productSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: 'Проверьте заполненные поля', fieldErrors: fieldErrorsFromZod(parsed.error.issues) }
    }

    const data = parsed.data
    const slug = data.slug ? slugify(data.slug) : await uniqueProductSlug(data.name)

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        shortDescription: data.shortDescription || null,
        description: data.description || null,
        price: data.price,
        oldPrice: data.oldPrice ?? null,
        currency: data.currency,
        images: data.images,
        type: data.type,
        fileKey: data.fileKey || null,
        fileName: data.fileName || null,
        linkContent: data.linkContent || null,
        categoryId: data.categoryId || null,
        maxPerOrder: data.maxPerOrder,
        lowStockThreshold: data.lowStockThreshold,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
      },
      select: { id: true },
    })

    revalidatePath('/admin/products')
    revalidatePath('/catalog')
    revalidatePath('/')

    return { ok: true, data: product, message: 'Товар создан' }
  } catch (error) {
    logger.error('createProductAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Обновление товара. */
export async function updateProductAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = productSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: 'Проверьте заполненные поля', fieldErrors: fieldErrorsFromZod(parsed.error.issues) }
    }

    const data = parsed.data
    const slug = data.slug ? slugify(data.slug) : await uniqueProductSlug(data.name, id)

    await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        shortDescription: data.shortDescription || null,
        description: data.description || null,
        price: data.price,
        oldPrice: data.oldPrice ?? null,
        currency: data.currency,
        images: data.images,
        type: data.type,
        fileKey: data.fileKey || null,
        fileName: data.fileName || null,
        linkContent: data.linkContent || null,
        categoryId: data.categoryId || null,
        maxPerOrder: data.maxPerOrder,
        lowStockThreshold: data.lowStockThreshold,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
      },
    })

    revalidatePath('/admin/products')
    revalidatePath(`/product/${slug}`)
    revalidatePath('/catalog')
    revalidatePath('/')

    return { ok: true, message: 'Товар обновлён' }
  } catch (error) {
    logger.error('updateProductAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Удаление товара. */
export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    await prisma.product.delete({ where: { id } })

    revalidatePath('/admin/products')
    revalidatePath('/catalog')

    return { ok: true, message: 'Товар удалён' }
  } catch (error) {
    logger.error('deleteProductAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Быстрое переключение активности товара. */
export async function toggleProductActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requireAdmin()

    await prisma.product.update({ where: { id }, data: { isActive } })

    revalidatePath('/admin/products')
    revalidatePath('/catalog')

    return { ok: true, message: isActive ? 'Товар опубликован' : 'Товар скрыт' }
  } catch (error) {
    logger.error('toggleProductActiveAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Создание категории. */
export async function createCategoryAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: 'Проверьте заполненные поля', fieldErrors: fieldErrorsFromZod(parsed.error.issues) }
    }

    const data = parsed.data

    await prisma.category.create({
      data: {
        name: data.name,
        slug: slugify(data.slug || data.name),
        description: data.description || null,
        icon: data.icon || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    })

    revalidatePath('/admin/categories')
    revalidatePath('/catalog')

    return { ok: true, message: 'Категория создана' }
  } catch (error) {
    logger.error('createCategoryAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Обновление категории. */
export async function updateCategoryAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: 'Проверьте заполненные поля', fieldErrors: fieldErrorsFromZod(parsed.error.issues) }
    }

    const data = parsed.data

    await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: slugify(data.slug || data.name),
        description: data.description || null,
        icon: data.icon || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    })

    revalidatePath('/admin/categories')
    revalidatePath('/catalog')

    return { ok: true, message: 'Категория обновлена' }
  } catch (error) {
    logger.error('updateCategoryAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}

/** Удаление категории (товары остаются без категории). */
export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    await prisma.category.delete({ where: { id } })

    revalidatePath('/admin/categories')
    revalidatePath('/catalog')

    return { ok: true, message: 'Категория удалена' }
  } catch (error) {
    logger.error('deleteCategoryAction failed', { error })
    return { ok: false, error: toPublicError(error).message }
  }
}
