import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { toPublicError } from '@/lib/errors'
import { buildObjectKey, getPublicUrl, uploadObject } from '@/lib/s3'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 МБ
const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200 МБ
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

/**
 * POST /api/upload — загрузка изображений и файлов товаров. Только для админа.
 *
 * kind=products — публичное изображение
 * kind=files    — приватный файл товара (выдаётся только по подписанной ссылке)
 */
export async function POST(request: Request) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const file = formData.get('file')
    const kind = formData.get('kind') === 'files' ? 'files' : 'products'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })
    }

    const maxSize = kind === 'products' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Файл слишком большой. Максимум ${Math.round(maxSize / 1024 / 1024)} МБ.` },
        { status: 413 },
      )
    }

    if (kind === 'products' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Допустимы только изображения JPEG, PNG, WebP, GIF, AVIF' },
        { status: 415 },
      )
    }

    const key = buildObjectKey(kind, file.name)
    const body = Buffer.from(await file.arrayBuffer())

    await uploadObject({
      key,
      body,
      contentType: file.type || 'application/octet-stream',
      publicRead: kind === 'products',
    })

    return NextResponse.json({
      key,
      // Публичный URL возвращаем только для изображений
      url: kind === 'products' ? getPublicUrl(key) : null,
      fileName: file.name,
      size: file.size,
    })
  } catch (error) {
    const publicError = toPublicError(error)
    return NextResponse.json({ error: publicError.message }, { status: publicError.status })
  }
}
