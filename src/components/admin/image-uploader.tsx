'use client'

import { ImagePlus, X } from 'lucide-react'
import Image from 'next/image'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

/** Загрузчик изображений товара в S3 через /api/upload. */
export function ImageUploader({
  images,
  onChange,
}: {
  images: string[]
  onChange: (images: string[]) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return

    setUploading(true)
    const uploaded: string[] = []

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('kind', 'products')

        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error ?? `Не удалось загрузить ${file.name}`)
          continue
        }

        uploaded.push(data.url)
      }

      if (uploaded.length > 0) {
        onChange([...images, ...uploaded])
        toast.success(`Загружено изображений: ${uploaded.length}`)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((url) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
            <Image src={url} alt="" fill sizes="160px" className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((item) => item !== url))}
              className="absolute right-1 top-1 rounded-md bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Удалить изображение"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-xs">Добавить</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => upload(event.target.files)}
      />

      {uploading ? <p className="text-xs text-muted-foreground">Загрузка…</p> : null}

      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
        Загрузить изображения
      </Button>
    </div>
  )
}
