import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Админ-панель',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/** Каркас админки с проверкой сессии (второй слой после middleware). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session?.user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar userName={session.user.email ?? 'Администратор'} />
      <main className="flex-1 overflow-x-hidden p-4 lg:p-8">{children}</main>
    </div>
  )
}
