'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes/dist/types'

/** Обёртка next-themes: тёмная/светлая тема через класс на <html>. */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
