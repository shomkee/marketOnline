import { PrismaClient } from '@prisma/client'

/**
 * Синглтон PrismaClient.
 * В dev-режиме Next.js перезагружает модули на каждом изменении,
 * поэтому клиент кэшируется в globalThis — иначе пул соединений быстро исчерпается.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/** Тип транзакционного клиента для сервисов, работающих внутри $transaction. */
export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>
