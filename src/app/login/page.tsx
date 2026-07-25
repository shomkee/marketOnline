import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/admin/login-form'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Вход в админ-панель',
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  const session = await getSession()

  // Авторизованного сразу отправляем в админку
  if (session?.user) redirect('/admin')

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <LoginForm />
    </div>
  )
}
