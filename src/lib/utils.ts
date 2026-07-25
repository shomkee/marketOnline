import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Объединяет классы Tailwind без конфликтов. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует цену из минорных единиц (копеек) в читаемую строку.
 * 129900 -> "1 299 ₽"
 */
export function formatPrice(minorUnits: number, currency = 'RUB'): string {
  const major = minorUnits / 100
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major)
}

/** Форматирует дату в виде "26 июля 2026, 01:12". */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const value = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

/** Форматирует только дату. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const value = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value)
}

/** Размер файла в читаемом виде. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

/** Генерирует ЧПУ-slug из русского или английского названия. */
export function slugify(input: string): string {
  const translit: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }

  return input
    .toLowerCase()
    .split('')
    .map((char) => (char in translit ? translit[char] : char))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Обрезает текст до указанной длины. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

/** Возвращает IP клиента из заголовков запроса. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? '0.0.0.0'
}

/** Нормализует email: обрезает пробелы и приводит к нижнему регистру. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Маскирует email для публичного показа: ivan@mail.ru -> iv**@mail.ru */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return email
  const visible = name.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`
}

/** Обратный отсчёт в виде "14:59". */
export function formatCountdown(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
