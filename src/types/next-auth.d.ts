import 'next-auth'
import 'next-auth/jwt'

/** Расширяем типы NextAuth полями id и role. */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: 'ADMIN' | 'MANAGER'
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role: 'ADMIN' | 'MANAGER'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'ADMIN' | 'MANAGER'
  }
}
