/**
 * Коды ошибок приложения.
 * Клиент видит только code и message; технические детали остаются в логах.
 */
export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'PRODUCT_INACTIVE'
  | 'PROMOCODE_INVALID'
  | 'PROMOCODE_EXPIRED'
  | 'PROMOCODE_LIMIT'
  | 'PAYMENT_ERROR'
  | 'PROVIDER_DISABLED'
  | 'ORDER_EXPIRED'
  | 'ORDER_ALREADY_PAID'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL'

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  OUT_OF_STOCK: 409,
  PRODUCT_INACTIVE: 409,
  PROMOCODE_INVALID: 400,
  PROMOCODE_EXPIRED: 400,
  PROMOCODE_LIMIT: 409,
  PAYMENT_ERROR: 502,
  PROVIDER_DISABLED: 400,
  ORDER_EXPIRED: 410,
  ORDER_ALREADY_PAID: 409,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL: 500,
}

/** Ошибка с понятным пользователю сообщением на русском языке. */
export class AppError extends Error {
  public readonly code: AppErrorCode
  public readonly status: number
  public readonly details?: unknown

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS_BY_CODE[code]
    this.details = details
  }
}

/** Готовые фабрики часто встречающихся ошибок. */
export const errors = {
  notFound: (what = 'Ресурс') => new AppError('NOT_FOUND', `${what} не найден`),
  outOfStock: () => new AppError('OUT_OF_STOCK', 'Товар закончился или доступно меньше штук, чем вы выбрали'),
  unauthorized: () => new AppError('UNAUTHORIZED', 'Требуется авторизация'),
  forbidden: () => new AppError('FORBIDDEN', 'Доступ запрещён'),
  rateLimited: (retryAfterSec: number) =>
    new AppError('RATE_LIMITED', `Слишком много запросов. Попробуйте через ${retryAfterSec} сек.`),
  internal: () => new AppError('INTERNAL', 'Внутренняя ошибка. Попробуйте позже.'),
}

/** Приводит любую ошибку к безопасному для клиента виду. */
export function toPublicError(error: unknown): {
  code: AppErrorCode
  message: string
  status: number
} {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, status: error.status }
  }
  return {
    code: 'INTERNAL',
    message: 'Внутренняя ошибка. Попробуйте позже.',
    status: 500,
  }
}
