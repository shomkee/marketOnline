'use client'

import { Save, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { createProductAction, updateProductAction } from '@/actions/product.actions'
import { ImageUploader } from '@/components/admin/image-uploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export type ProductFormValues = {
  name: string
  slug: string
  shortDescription: string
  description: string
  price: number
  oldPrice: number | null
  currency: string
  images: string[]
  type: 'KEY' | 'FILE' | 'LINK'
  fileKey: string
  fileName: string
  linkContent: string
  categoryId: string
  maxPerOrder: number
  lowStockThreshold: number
  isActive: boolean
  isFeatured: boolean
  metaTitle: string
  metaDescription: string
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  price: 0,
  oldPrice: null,
  currency: 'RUB',
  images: [],
  type: 'KEY',
  fileKey: '',
  fileName: '',
  linkContent: '',
  categoryId: '',
  maxPerOrder: 10,
  lowStockThreshold: 5,
  isActive: true,
  isFeatured: false,
  metaTitle: '',
  metaDescription: '',
}

/** Форма создания/редактирования товара. Цены в форме — в рублях, в БД — в копейках. */
export function ProductForm({
  productId,
  initialValues,
  categories,
}: {
  productId?: string
  initialValues: ProductFormValues
  categories: Array<{ id: string; name: string }>
}) {
  const router = useRouter()

  const [values, setValues] = React.useState<ProductFormValues>(initialValues)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [uploadingFile, setUploadingFile] = React.useState(false)

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function uploadProductFile(file: File | undefined) {
    if (!file) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', 'files')

      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? 'Не удалось загрузить файл')
        return
      }

      setValues((prev) => ({ ...prev, fileKey: data.key, fileName: data.fileName }))
      toast.success('Файл товара загружен')
    } finally {
      setUploadingFile(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setErrors({})
    setSaving(true)

    const payload = {
      ...values,
      slug: values.slug || undefined,
      categoryId: values.categoryId || undefined,
      oldPrice: values.oldPrice ?? undefined,
    }

    const result = productId
      ? await updateProductAction(productId, payload)
      : await createProductAction(payload)

    setSaving(false)

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {})
      toast.error(result.error)
      return
    }

    toast.success(result.message)
    router.push('/admin/products')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Основное</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Название</Label>
                <Input id="name" value={values.name} onChange={(e) => set('name', e.target.value)} required />
                {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">URL (slug)</Label>
                <Input
                  id="slug"
                  value={values.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="Сгенерируется автоматически"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shortDescription">Краткое описание</Label>
                <Textarea
                  id="shortDescription"
                  rows={2}
                  value={values.shortDescription}
                  onChange={(e) => set('shortDescription', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Полное описание (markdown)</Label>
                <Textarea
                  id="description"
                  rows={10}
                  className="font-mono text-xs"
                  value={values.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Изображения</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader images={values.images} onChange={(images) => set('images', images)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Тип выдачи</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Тип товара</Label>
                <Select
                  value={values.type}
                  onValueChange={(value) => set('type', value as ProductFormValues['type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEY">KEY — ключи со склада</SelectItem>
                    <SelectItem value="FILE">FILE — файл из S3</SelectItem>
                    <SelectItem value="LINK">LINK — ссылка или инструкция</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {values.type === 'FILE' ? (
                <div className="space-y-2">
                  <Label htmlFor="file">Файл товара</Label>
                  <input
                    id="file"
                    type="file"
                    className="block w-full text-sm"
                    onChange={(e) => uploadProductFile(e.target.files?.[0])}
                  />
                  {uploadingFile ? <p className="text-xs text-muted-foreground">Загрузка файла…</p> : null}
                  {values.fileKey ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Upload className="h-3.5 w-3.5" />
                      {values.fileName || values.fileKey}
                    </p>
                  ) : null}
                  {errors.fileKey ? <p className="text-xs text-destructive">{errors.fileKey}</p> : null}
                </div>
              ) : null}

              {values.type === 'LINK' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="linkContent">Содержимое выдачи</Label>
                  <Textarea
                    id="linkContent"
                    rows={5}
                    value={values.linkContent}
                    onChange={(e) => set('linkContent', e.target.value)}
                    placeholder="Ссылка и инструкция для покупателя"
                  />
                  {errors.linkContent ? (
                    <p className="text-xs text-destructive">{errors.linkContent}</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="metaTitle">Meta title</Label>
                <Input id="metaTitle" value={values.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metaDescription">Meta description</Label>
                <Textarea
                  id="metaDescription"
                  rows={2}
                  value={values.metaDescription}
                  onChange={(e) => set('metaDescription', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Цена и склад</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Цена, копейки</Label>
                <Input
                  id="price"
                  inputMode="numeric"
                  value={values.price}
                  onChange={(e) => set('price', Number(e.target.value.replace(/\D/g, '')) || 0)}
                />
                <p className="text-xs text-muted-foreground">= {(values.price / 100).toFixed(2)} ₽</p>
                {errors.price ? <p className="text-xs text-destructive">{errors.price}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="oldPrice">Старая цена, копейки</Label>
                <Input
                  id="oldPrice"
                  inputMode="numeric"
                  value={values.oldPrice ?? ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    set('oldPrice', digits ? Number(digits) : null)
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxPerOrder">Максимум в одном заказе</Label>
                <Input
                  id="maxPerOrder"
                  inputMode="numeric"
                  value={values.maxPerOrder}
                  onChange={(e) => set('maxPerOrder', Number(e.target.value.replace(/\D/g, '')) || 1)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lowStockThreshold">Порог уведомления об остатке</Label>
                <Input
                  id="lowStockThreshold"
                  inputMode="numeric"
                  value={values.lowStockThreshold}
                  onChange={(e) => set('lowStockThreshold', Number(e.target.value.replace(/\D/g, '')) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Публикация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Категория</Label>
                <Select
                  value={values.categoryId || 'none'}
                  onValueChange={(value) => set('categoryId', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Без категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без категории</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={values.isActive}
                  onChange={(e) => set('isActive', e.target.checked)}
                />
                Товар активен
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={values.isFeatured}
                  onChange={(e) => set('isFeatured', e.target.checked)}
                />
                Показывать на главной
              </label>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" loading={saving}>
            <Save className="h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </div>
    </form>
  )
}
