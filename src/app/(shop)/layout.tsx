import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

/** Общий каркас публичной части. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
