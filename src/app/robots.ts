import type { MetadataRoute } from 'next'

import { getAppUrl } from '@/lib/env'

/** robots.txt: закрываем админку, API и приватные страницы заказов. */
export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/order/', '/login'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
