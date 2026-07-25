import NextAuth from 'next-auth'

import { authOptions } from '@/lib/auth'

// Единственная точка входа NextAuth (credentials-провайдер для админа)
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
