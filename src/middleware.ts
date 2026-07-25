import { withAuth } from 'next-auth/middleware'

/**
 * Защита админ-панели на уровне middleware.
 * Серверные действия дополнительно проверяют роль через requireAdmin() — защита в два слоя.
 */
export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: ['/admin/:path*'],
}
