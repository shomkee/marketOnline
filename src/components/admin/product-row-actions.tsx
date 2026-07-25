'use client'

import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { deleteProductAction, toggleProductActiveAction } from '@/actions/product.actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Меню действий в строке таблицы товаров. */
export function ProductRowActions({
  productId,
  slug,
  isActive,
}: {
  productId: string
  slug: string
  isActive: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function toggle() {
    startTransition(async () => {
      const result = await toggleProductActiveAction(productId, !isActive)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function remove() {
    if (!window.confirm('Удалить товар вместе со складом ключей?')) return

    startTransition(async () => {
      const result = await deleteProductAction(productId)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label="Действия">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/products/${productId}`}>
            <Pencil className="h-4 w-4" />
            Редактировать
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={`/product/${slug}`} target="_blank">
            <Eye className="h-4 w-4" />
            Открыть на сайте
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={toggle}>
          {isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isActive ? 'Скрыть' : 'Опубликовать'}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={remove} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4" />
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
