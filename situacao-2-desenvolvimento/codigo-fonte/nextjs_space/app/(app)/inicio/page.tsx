import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/layouts/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SafeDate } from '@/components/safe-format'
import { PERFIL_LABEL, podeAdministrar, podeGerenciarMateriais } from '@/lib/authz'
import type { Perfil } from '@prisma/client'
import { Package, PackageCheck, PackageX, Layers, Plus, Search, Users, History } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Início' }

const ACAO_LABEL: Record<string, string> = { CRIACAO: 'Criação', EDICAO: 'Edição', INATIVACAO: 'Inativação', REATIVACAO: 'Reativação', LOGIN: 'Login' }

export default async function InicioPage() {
  const session = await auth()
  const perfil = (session?.user?.perfil ?? 'CONSULTA') as Perfil
  const [ativos, inativos, familias, grupos, subgrupos, recentes] = await Promise.all([
    prisma.material.count({ where: { status: 'ATIVO' } }),
    prisma.material.count({ where: { status: 'INATIVO' } }),
    prisma.familia.count({ where: { ativo: true } }),
    prisma.grupo.count({ where: { ativo: true } }),
    prisma.subgrupo.count({ where: { ativo: true } }),
    prisma.auditLog.findMany({
      where: { entidade: 'Material' },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { usuario: { select: { name: true } } },
    }),
  ])

  const cards = [
    { titulo: 'Materiais ativos', valor: ativos ?? 0, icon: PackageCheck, href: '/materiais?status=ATIVO', sub: undefined as string | undefined },
    { titulo: 'Materiais inativos', valor: inativos ?? 0, icon: PackageX, href: '/materiais?status=INATIVO', sub: undefined },
    { titulo: 'Total de materiais', valor: (ativos ?? 0) + (inativos ?? 0), icon: Package, href: '/materiais', sub: undefined },
    { titulo: 'Classificações ativas', valor: (familias ?? 0) + (grupos ?? 0) + (subgrupos ?? 0), icon: Layers, href: podeAdministrar(perfil) ? '/classificacoes' : '/materiais', sub: `${familias} famílias · ${grupos} grupos · ${subgrupos} subgrupos` },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Bem-vindo(a), ${session?.user?.name?.split(' ')?.[0] ?? ''}`}
        description={`Você está conectado(a) com o perfil ${PERFIL_LABEL?.[perfil] ?? perfil}. Centralize e padronize o cadastro de materiais da organização.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link key={c.titulo} href={c.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{c.titulo}</CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl font-bold tracking-tight">{c.valor}</div>
                  {c.sub && <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
            <CardDescription>Atalhos conforme o seu perfil</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/materiais"><Search className="mr-2 h-4 w-4" /> Consultar materiais</Link>
            </Button>
            {podeGerenciarMateriais(perfil) && (
              <Button asChild className="justify-start">
                <Link href="/materiais/novo"><Plus className="mr-2 h-4 w-4" /> Cadastrar material</Link>
              </Button>
            )}
            {podeAdministrar(perfil) && (
              <>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/classificacoes"><Layers className="mr-2 h-4 w-4" /> Gerenciar classificações</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/usuarios"><Users className="mr-2 h-4 w-4" /> Gerenciar usuários</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-primary" /> Atividade recente em materiais</CardTitle>
            <CardDescription>Últimas ações registradas na trilha de auditoria</CardDescription>
          </CardHeader>
          <CardContent>
            {(recentes?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            ) : (
              <ul className="divide-y">
                {recentes.map((r) => {
                  const det = (r?.detalhes ?? {}) as Record<string, unknown>
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={r.acao === 'INATIVACAO' ? 'destructive' : r.acao === 'CRIACAO' ? 'default' : 'secondary'}>{ACAO_LABEL?.[r.acao] ?? r.acao}</Badge>
                        <Link href={`/materiais/${r.entidadeId}`} className="font-mono text-xs text-primary hover:underline">{String(det?.codigo ?? 'material')}</Link>
                        <span className="text-muted-foreground">por {r?.usuario?.name ?? '—'}</span>
                      </div>
                      <SafeDate date={r.createdAt} locale="pt-BR" options={{ dateStyle: 'short', timeStyle: 'short' }} className="text-xs text-muted-foreground" />
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
