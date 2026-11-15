'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { AppShell } from '@/components/layouts/app-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PERFIL_LABEL, podeAdministrar } from '@/lib/perfis'
import type { Perfil } from '@prisma/client'
import { Boxes, Home, Package, Layers, Users, LogOut, type LucideIcon } from 'lucide-react'

type Usuario = { nome: string; email: string; perfil: Perfil }

type ItemNav = { href: string; label: string; icon: LucideIcon; somenteAdmin?: boolean }

const ITENS: ItemNav[] = [
  { href: '/inicio', label: 'Início', icon: Home },
  { href: '/materiais', label: 'Materiais', icon: Package },
  { href: '/classificacoes', label: 'Classificações', icon: Layers, somenteAdmin: true },
  { href: '/usuarios', label: 'Usuários', icon: Users, somenteAdmin: true },
]

export function Shell({ usuario, children }: { usuario: Usuario; children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const admin = podeAdministrar(usuario?.perfil)
  const itens = ITENS.filter((i) => !i.somenteAdmin || admin)

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/inicio" className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-sm font-bold tracking-tight">MATERIAL MASTER</div>
          <div className="text-[11px] text-muted-foreground">Governança de cadastros</div>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação principal">
        {itens.map((item) => {
          const Icon = item.icon
          const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                ativo ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-4 rounded-md bg-muted p-3">
        <div className="truncate text-sm font-medium">{usuario?.nome || 'Usuário'}</div>
        <div className="truncate text-xs text-muted-foreground">{usuario?.email}</div>
        <Badge variant="secondary" className="mt-2">{PERFIL_LABEL?.[usuario?.perfil] ?? usuario?.perfil}</Badge>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => signOut({ redirectTo: '/login' })}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  )

  const header = (
    <div className="flex w-full items-center justify-between">
      <span className="font-display text-sm font-semibold tracking-tight lg:hidden">MATERIAL MASTER</span>
      <span className="hidden text-sm text-muted-foreground lg:inline">Sistema de Gestão, Padronização e Governança de Cadastros de Materiais</span>
      <span className="text-xs text-muted-foreground">{PERFIL_LABEL?.[usuario?.perfil] ?? ''}</span>
    </div>
  )

  return (
    <AppShell sidebar={sidebar} header={header}>
      <div className="mx-auto w-full max-w-[1200px]">{children}</div>
    </AppShell>
  )
}
