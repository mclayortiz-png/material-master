import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export const metadata = { title: 'Acesso negado' }

export default function SemPermissaoPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Acesso negado</h1>
      <p className="text-sm text-muted-foreground">O seu perfil não possui permissão para acessar esta área. Solicite a um Administrador caso precise de acesso.</p>
      <Button asChild><Link href="/inicio">Voltar ao início</Link></Button>
    </div>
  )
}
