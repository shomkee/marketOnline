import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { getEnv } from './env'
import { AppError } from './errors'

let client: S3Client | null = null

function getClient(): S3Client {
  const env = getEnv()

  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new AppError('INTERNAL', 'Хранилище файлов не настроено')
  }

  if (!client) {
    client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    })
  }

  return client
}

/** Загружает буфер в S3 и возвращает ключ объекта. */
export async function uploadObject(params: {
  key: string
  body: Buffer | Uint8Array
  contentType: string
  /** true — объект будет читаем публично (только для картинок товаров) */
  publicRead?: boolean
}): Promise<string> {
  const env = getEnv()

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ACL: params.publicRead ? 'public-read' : undefined,
    }),
  )

  return params.key
}

/**
 * Генерирует временную подписанную ссылку на скачивание.
 * Клиент никогда не получает прямой доступ к бакету.
 */
export async function getPresignedDownloadUrl(params: {
  key: string
  fileName: string
  ttlSeconds: number
}): Promise<string> {
  const env = getEnv()

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: params.key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(params.fileName)}"`,
  })

  return getSignedUrl(getClient(), command, { expiresIn: params.ttlSeconds })
}

/** Удаляет объект из S3. Ошибки глотаются: удаление файла не должно ломать бизнес-операцию. */
export async function deleteObject(key: string): Promise<void> {
  const env = getEnv()
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
  } catch {
    // игнорируем — файл мог быть удалён ранее
  }
}

/** Публичный URL для картинок товаров. */
export function getPublicUrl(key: string): string {
  const env = getEnv()
  if (env.S3_PUBLIC_URL) {
    return `${env.S3_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
  }
  return `${env.S3_ENDPOINT.replace(/\/+$/, '')}/${env.S3_BUCKET}/${key}`
}

/** Генерирует уникальный ключ объекта с сохранением расширения. */
export function buildObjectKey(prefix: 'products' | 'files', originalName: string): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin'
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}/${unique}.${ext}`
}
