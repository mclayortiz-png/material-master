import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { MATERIAL_INCLUDE } from '@/lib/materiais'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SafeDate } from '@/components/safe-format'
import { StatusMaterial } from '@/components/materiais/status-material'
import { podeGerenciarMateriais } from '@/lib/authz'
import { ACAO_LABEL, CAMPO_LABEL } from '@/lib/tipos-cliente'
import { ArrowLeft, Pencil, History } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await prisma.material.findUnique({ where: { id: id ?? '' }, select: { codigo: true } })
  return { title: m?.codigo ?? 'Material' }
}

function Campo({ label, valor, mono }: { label: string; valor?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-sm ${mono ? 'font-mono' : ''}`}>{valor || '—'}</dd>
    </div>
  )
}

export default async function DetalheMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const podeEditar = podeGerenciarMateriais(session?.user?.perfil)
  const { id } = await params
  const material = await prisma.material.findUnique({ where: { id: id ?? '' }, include: MATERIAL_INCLUDE })
  if (!material) notFound()
  const historico = await prisma.auditLog.findMany({
    where: { entidade: 'Material', entidadeId: id },
    include: { usuario: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const ativo = material.status === 'ATIVO'

  return (
    <div className="space-y-6">
      <PageHeader
        title={material.codigo}
        description={material.descricaoCurta}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/materiais"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link></Button>
            {podeEditar && (
              <>
                <Button asChild variant="secondary"><Link href={`/materiais/${material.id}/editar`}><Pencil className="mr-2 h-4 w-4" /> Editar</Link></Button>
                <StatusMaterial id={material.id} codigo={material.codigo} status={material.status} />
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Dados do material</CardTitle>
              <Badge variant={ativo ? 'default' : 'destructive'}>{ativo ? 'Ativo' : 'Inativo'}</Badge>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Campo label="Código" valor={material.codigo} mono />
                <Campo label="Unidade de medida" valor={`${material.unidadeMedida?.sigla ?? ''} - ${material.unidadeMedida?.nome ?? ''}`} />
                <div className="sm:col-span-2"><Campo label="Descrição curta" valor={material.descricaoCurta} /></div>
                <div className="sm:col-span-2"><Campo label="Descrição longa / técnica" valor={material.descricaoLonga} /></div>
                <Campo label="Fabricante" valor={material.fabricante} />
                <Campo label="Part number / referência" valor={material.partNumber} mono />
                <Campo label="NCM" valor={material.ncm} mono />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Classificação</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Campo label="Família" valor={`${material.familia?.codigo ?? ''} - ${material.familia?.nome ?? ''}`} />
                <Campo label="Grupo" valor={`${material.grupo?.codigo ?? ''} - ${material.grupo?.nome ?? ''}`} />
                <Campo label="Subgrupo" valor={`${material.subgrupo?.codigo ?? ''} - ${material.subgrupo?.nome ?? ''}`} />
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Controle</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Criado por</dt>
                  <dd className="mt-0.5 text-sm">{material.criadoPor?.name ?? '—'}</dd>
                  <dd className="text-xs text-muted-foreground"><SafeDate date={material.createdAt} locale="pt-BR" options={{ dateStyle: 'short', timeStyle: 'short' }} /></dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Última atualização</dt>
                  <dd className="mt-0.5 text-sm">{material.atualizadoPor?.name ?? material.criadoPor?.name ?? '—'}</dd>
                  <dd className="text-xs text-muted-foreground"><SafeDate date={material.updatedAt} locale="pt-BR" options={{ dateStyle: 'short', timeStyle: 'short' }} /></dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-primary" /> Histórico</CardTitle></CardHeader>
            <CardContent>
              {(historico?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Sem registros.</p>
              ) : (
                <ol className="relative space-y-4 border-l pl-4">
                  {historico.map((h) => {
                    const det = (h?.detalhes ?? {}) as Record<string, unknown>
                    const alteracoes = (det?.alteracoes ?? null) as Record<string, { de: unknown; para: unknown }> | null
                    const motivo = det?.motivo as string | undefined
                    return (
                      <li key={h.id} className="text-sm">
                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={h.acao === 'INATIVACAO' ? 'destructive' : h.acao === 'CRIACAO' ? 'default' : 'secondary'}>{ACAO_LABEL?.[h.acao] ?? h.acao}</Badge>
                          <span className="text-muted-foreground">{h.usuario?.name ?? '—'}</span>
                        </div>
                        <SafeDate date={h.createdAt} locale="pt-BR" options={{ dateStyle: 'short', timeStyle: 'short' }} className="text-xs text-muted-foreground" />
                        {motivo && <p className="mt-1 text-xs">Motivo: {motivo}</p>}
                        {alteracoes && Object.keys(alteracoes).length > 0 && (
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {Object.entries(alteracoes).map(([k, v]) => (
                              <li key={k}>{CAMPO_LABEL?.[k] ?? k}: {String(v?.de ?? '—')} → {String(v?.para ?? '—')}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
