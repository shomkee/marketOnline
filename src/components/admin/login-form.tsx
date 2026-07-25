'use client'

import { LogIn } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Форма входа администратора (NextAuth credentials). */
export function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })

    setLoading(false)

    if (!result || result.error) {
      toast.error('Неверный email или пароль')
      return
    }

    toast.success('Добро пожаловать!')
    router.push('/admin')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Админ-панель</CardTitle>
        <CardDescription>Войдите, чтобы управлять магазином</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            <LogIn className="h-4 w-4" />
            Войти
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
