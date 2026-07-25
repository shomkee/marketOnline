'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

/** Toast-уведомления, синхронизированные с темой сайта. */
export function Toaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as 'light' | 'dark') ?? 'system'}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border border-border',
        },
      }}
    />
  )
}
