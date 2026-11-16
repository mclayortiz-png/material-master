'use client'

import { useState, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!email.trim() || !password) {
      setErro('Informe e-mail e senha.')
      return
    }
    setCarregando(true)
    try {
      const res = await signIn('credentials', { email: email.trim(), password, redirect: false })
      if (res?.error) {
        setErro(res.code === 'too_many_attempts'
          ? 'Muitas tentativas. Aguarde 15 minutos e tente novamente.'
          : 'E-mail ou senha inválidos, ou usuário inativo.')
      } else {
        router.replace('/inicio')
      }
    } catch {
      setErro('Não foi possível entrar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" type="email" autoComplete="email" className="pl-10" placeholder="voce@empresa.com.br" value={email} onChange={(e) => setEmail(e?.target?.value ?? '')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" type="password" autoComplete="current-password" className="pl-10" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e?.target?.value ?? '')} />
        </div>
      </div>
      <Button type="submit" className="w-full" loading={carregando}>
        <LogIn className="mr-2 h-4 w-4" /> Entrar
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/cadastro" className="font-medium text-primary hover:underline">
          Criar conta de consulta
        </Link>
      </p>
    </form>
  )
}
