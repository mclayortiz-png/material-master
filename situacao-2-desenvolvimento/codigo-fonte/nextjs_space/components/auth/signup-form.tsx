'use client'

import { useState, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

export function SignupForm() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [erro, setErro] = useState<string | null>(null)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...(f ?? {}), [k]: e?.target?.value ?? '' }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCampos({})
    if (form.password !== form.confirmPassword) {
      setCampos({ confirmPassword: 'As senhas não coincidem.' })
      return
    }
    setCarregando(true)
    const res = await apiFetch('/api/signup', { method: 'POST', body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) })
    if (!res.ok) {
      setErro(res.erro ?? 'Não foi possível criar a conta.')
      setCampos(res.campos ?? {})
      setCarregando(false)
      return
    }
    const login = await signIn('credentials', { email: form.email.trim(), password: form.password, redirect: false })
    setCarregando(false)
    if (login?.error) {
      router.push('/login')
    } else {
      router.replace('/inicio')
    }
  }

  const campo = (id: string, label: string, k: keyof typeof form, type = 'text', autoComplete?: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} autoComplete={autoComplete} value={form?.[k] ?? ''} onChange={set(k)} variant={campos?.[k] ? 'error' : 'default'} />
      {campos?.[k] && <p className="text-xs text-destructive">{campos[k]}</p>}
    </div>
  )

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
      {campo('name', 'Nome completo', 'name', 'text', 'name')}
      {campo('email', 'E-mail', 'email', 'email', 'email')}
      {campo('password', 'Senha (mín. 6 caracteres)', 'password', 'password', 'new-password')}
      {campo('confirmPassword', 'Confirmar senha', 'confirmPassword', 'password', 'new-password')}
      <Button type="submit" className="w-full" loading={carregando}>
        <UserPlus className="mr-2 h-4 w-4" /> Criar conta
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">Entrar</Link>
      </p>
    </form>
  )
}
