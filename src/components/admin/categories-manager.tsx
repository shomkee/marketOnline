'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from '@/actions/product.actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  sortOrder: number
  isActive: boolean
  productCount: number
}

const EMPTY = { name: '', slug: '', description: '', icon: '', sortOrder: 0, isActive: true }

/** CRUD категорий в одном экране с модалкой. */
export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter()

  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [values, setValues] = React.useState(EMPTY)
  const [saving, setSaving] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function openCreate() {
    setEditingId(null)
    setValues(EMPTY)
    setOpen(true)
  }

  function openEdit(category: CategoryRow) {
    setEditingId(category.id)
    setValues({
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    })
    setOpen(true)
  }

  async function save() {
    setSaving(true)

    const payload = {
      ...values,
      slug: values.slug || undefined,
      description: values.description || undefined,
      icon: values.icon || undefined,
    }

    const result = editingId
      ? await updateCategoryAction(editingId, payload)
      : await createCategoryAction(payload)

    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success(result.message)
    setOpen(false)
    router.refresh()
  }

  function remove(id: string) {
    if (!window.confirm('Удалить категорию? Товары останутся без категории.')) return

    startTransition(async () => {
      const result = await deleteCategoryAction(id)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <Button onClick={openCreate}>
        <Plus className="h-4 w-4" />
        Добавить категорию
      </Button>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Товаров</TableHead>
                <TableHead>Порядок</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Категорий пока нет.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.icon ? `${category.icon} ` : ''}
                      {category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">/{category.slug}</TableCell>
                    <TableCell>{category.productCount}</TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? 'success' : 'secondary'}>
                        {category.isActive ? 'Активна' : 'Скрыта'}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button variant="ghost" size="icon" aria-label="Изменить" onClick={() => openEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Удалить"
                        className="text-destructive"
                        disabled={pending}
                        onClick={() => remove(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Изменить категорию' : 'Новая категория'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Название</Label>
              <Input
                id="cat-name"
                value={values.name}
                onChange={(event) => setValues({ ...values, name: event.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  value={values.slug}
                  onChange={(event) => setValues({ ...values, slug: event.target.value })}
                  placeholder="Автоматически"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-icon">Иконка (emoji)</Label>
                <Input
                  id="cat-icon"
                  value={values.icon}
                  onChange={(event) => setValues({ ...values, icon: event.target.value })}
                  placeholder="🎮"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-description">Описание</Label>
              <Textarea
                id="cat-description"
                rows={3}
                value={values.description}
                onChange={(event) => setValues({ ...values, description: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-sort">Порядок сортировки</Label>
              <Input
                id="cat-sort"
                inputMode="numeric"
                value={values.sortOrder}
                onChange={(event) =>
                  setValues({ ...values, sortOrder: Number(event.target.value.replace(/\D/g, '')) || 0 })
                }
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.isActive}
                onChange={(event) => setValues({ ...values, isActive: event.target.checked })}
              />
              Категория активна
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
