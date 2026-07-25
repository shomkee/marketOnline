import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { ThemeProvider } from '@/components/layout/theme-provider'
import { Toaster } from '@/components/layout/toaster'
import { getAppUrl } from '@/lib/env'
import { getSettings } from '@/lib/services/settings.service'

import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' })

/** Глобальные метатеги тянем из настроек магазина. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const appUrl = getAppUrl()

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: settings.metaTitle || settings.shopName,
      template: `%s — ${settings.shopName}`,
    },
    description:
      settings.metaDescription ||
      settings.shopDescription ||
      'Цифровые товары с мгновенной автоматической выдачей после оплаты.',
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      siteName: settings.shopName,
      url: appUrl,
      images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/favicon.ico' },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
