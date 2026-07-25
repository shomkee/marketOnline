'use client'

import { useEffect, useState } from 'react'

/** Возвращает значение с задержкой — используется в поиске по каталогу. */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
