import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

import { AppError } from './errors'
import { logger } from './logger'
import { prisma } from './prisma'
import { consume, RATE_LIMITS } from './rate-limit'

/** Конфигурация NextAuth: только credentials, только администраторы магазина. */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const email = credentials.email.trim().toLowerCase()

        // Защита от перебора паролей по конкретному email
        const limit = consume(`login:${email}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowSec)
        if (!limit.success) {
          logger.warn('Превышен лимит попыток входа', { email })
          throw new Error('Слишком много попыток входа. Попробуйте позже.')
        }

        const user = await prisma.user.findUnique({ where: { email } })

        // Одинаковое сообщение для несуществующего пользователя и неверного пароля
        if (!user || !user.isActive) {
          // Выполняем фиктивное сравнение, чтобы время ответа не выдавало наличие аккаунта
          await bcrypt.compare(credentials.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva')
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'ADMIN'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'ADMIN' | 'MANAGER'
      }
      return session
    },
  },
}

/** Возвращает текущую сессию или null. */
export async function getSession() {
  return getServerSession(authOptions)
}

/** Гарантирует наличие авторизованного админа. Бросает AppError, если его нет. */
export async function requireAdmin() {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new AppError('UNAUTHORIZED', 'Требуется авторизация')
  }
  return session.user
}

/** Требует роль ADMIN (не MANAGER) — для настроек и удаления товаров. */
export async function requireOwner() {
  const user = await requireAdmin()
  if (user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Недостаточно прав для этого действия')
  }
  return user
}

/** Хеширует пароль с cost = 12. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}
