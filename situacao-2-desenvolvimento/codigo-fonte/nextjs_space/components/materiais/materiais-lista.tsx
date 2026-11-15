'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SelectNativo } from '@/components/ui/select-nativo'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiFetch } from '@/lib/api-client'
import type { FamiliaDto, GrupoDto, SubgrupoDto, MaterialDto } from '@/lib/tipos-cliente'
import { Search, X, ChevronLeft, ChevronRight, Eye, Pencil, Loader2 } from 'lucide-react'

type Lista = { itens: MaterialDto[]; total: number; page: number; pageSize: number; totalPaginas: number }

export function MateriaisLista({ podeEditar }: { podeEditar: boolean }) {
  const router = useRouter()
  const sp = useSearchParams()

  const [q, setQ] = useState(sp?.get('q') ?? '')
  const [familiaId, setFamiliaId] = useState(sp?.get('familiaId') ?? '')
  const [grupoId, setGrupoId] = useState(sp?.get('grupoId') ?? '')
  const [subgrupoId, setSubgrupoId] = useState(sp?.get('subgrupoId') ?? '')
  const [status, setStatus] = useState(sp?.get('status') ?? '')
  const [page, setPage] = useState(Number(sp?.get('page') ?? 1) || 1)

  const [familias, setFamilias] = useState<FamiliaDto[]>([])
  const [grupos, setGrupos] = useState<GrupoDto[]>([])
  const [subgrupos, setSubgrupos] = useState<SubgrupoDto[]>([])
  const [dados, setDados] = useState<Lista | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const [f, g, s] = await Promise.all([
        apiFetch<{ familias: FamiliaDto[] }>('/api/familias'),
        apiFetch<{ grupos: GrupoDto[] }>('/api/grupos'),
        apiFetch<{ subgrupos: SubgrupoDto[] }>('/api/subgrupos'),
      ])
      if (!ativo) return
      setFamilias(f?.data?.familias ?? [])
      setGrupos(g?.data?.grupos ?? [])
      setSubgrupos(s?.data?.subgrupos ?? [])
    })()
    return () => {
      ativo = false
    }
  }, [])

  const gruposFiltrados = useMemo(() => (grupos ?? []).filter((g) => !familiaId || g?.familiaId === familiaId), [grupos, familiaId])
  const subgruposFiltrados = useMemo(() => (subgrupos ?? []).filter((s) => !grupoId || s?.grupoId === grupoId), [subgrupos, grupoId])

  const buscar = useCallback(async (params: { q: string; familiaId: string; grupoId: string; subgrupoId: string; status: string; page: number }) => {
    setCarregando(true)
    setErro(null)
    const usp = new URLSearchParams()
    if (params.q) usp.set('q', params.q)
    if (params.familiaId) usp.set('familiaId', params.familiaId)
    if (params.grupoId) usp.set('grupoId', params.grupoId)
    if (params.subgrupoId) usp.set('subgrupoId', params.subgrupoId)
    if (params.status) usp.set('status', params.status)
    usp.set('page', String(params.page))
    usp.set('pageSize', '10')
    router.replace(`/materiais?${usp.toString()}`, { scroll: false })
    const res = await apiFetch<Lista>(`/api/materiais?${usp.toString()}`)
    if (!res.ok) setErro(res.erro ?? 'Erro ao carregar materiais.')
    setDados(res.data ?? { itens: [], total: 0, page: 1, pageSize: 10, totalPaginas: 1 })
    setCarregando(false)
  }, [router])

  // Busca inicial e sempre que filtros/página mudam (texto é aplicado com debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      buscar({ q, familiaId, grupoId, subgrupoId, status, page })
    }, q ? 350 : 0)
    return () => clearTimeout(t)
  }, [q, familiaId, grupoId, subgrupoId, status, page, buscar])

  const limpar = () => {
    setQ('')
    setFamiliaId('')
    setGrupoId('')
    setSubgrupoId('')
    setStatus('')
    setPage(1)
  }

  const temFiltro = Boolean(q || familiaId || grupoId || subgrupoId || status)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Buscar" placeholder="Buscar por código, descrição, fabricante ou part number" className="pl-10" value={q} onChange={(e) => { setQ(e?.target?.value ?? ''); setPage(1) }} />
          </div>
          <SelectNativo aria-label="Família" value={familiaId} onChange={(e) => { setFamiliaId(e?.target?.value ?? ''); setGrupoId(''); setSubgrupoId(''); setPage(1) }}>
            <option value="">Todas as famílias</option>
            {(familias ?? []).map((f) => <option key={f.id} value={f.id}>{f.codigo} - {f.nome}</option>)}
          </SelectNativo>
          <SelectNativo aria-label="Grupo" value={grupoId} disabled={!familiaId} onChange={(e) => { setGrupoId(e?.target?.value ?? ''); setSubgrupoId(''); setPage(1) }}>
            <option value="">Todos os grupos</option>
            {gruposFiltrados.map((g) => <option key={g.id} value={g.id}>{g.codigo} - {g.nome}</option>)}
          </SelectNativo>
          <SelectNativo aria-label="Subgrupo" value={subgrupoId} disabled={!grupoId} onChange={(e) => { setSubgrupoId(e?.target?.value ?? ''); setPage(1) }}>
            <option value="">Todos os subgrupos</option>
            {subgruposFiltrados.map((s) => <option key={s.id} value={s.id}>{s.codigo} - {s.nome}</option>)}
          </SelectNativo>
          <div className="flex gap-2">
            <SelectNativo aria-label="Status" value={status} onChange={(e) => { setStatus(e?.target?.value ?? ''); setPage(1) }}>
              <option value="">Todos os status</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </SelectNativo>
            {temFiltro && (
              <Button variant="ghost" size="icon" onClick={limpar} aria-label="Limpar filtros" title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
            <span>{carregando ? 'Carregando...' : `${dados?.total ?? 0} material(is) encontrado(s)`}</span>
            {carregando && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {erro && <p className="px-4 pb-3 text-sm text-destructive">{erro}</p>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Classificação</TableHead>
                  <TableHead className="hidden sm:table-cell">UM</TableHead>
                  <TableHead className="hidden lg:table-cell">Fabricante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dados?.itens?.length ?? 0) === 0 && !carregando ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum material encontrado com os filtros informados.</TableCell>
                  </TableRow>
                ) : (
                  (dados?.itens ?? []).map((m) => (
                    <TableRow key={m.id} className={m.status === 'INATIVO' ? 'opacity-70' : ''}>
                      <TableCell className="font-mono text-xs font-medium">
                        <Link href={`/materiais/${m.id}`} className="text-primary hover:underline">{m.codigo}</Link>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[320px] truncate font-medium" title={m.descricaoCurta}>{m.descricaoCurta}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{m?.familia?.nome} / {m?.grupo?.nome}</div>
                      </TableCell>
                      <TableCell className="hidden text-xs md:table-cell">
                        <div>{m?.familia?.nome} › {m?.grupo?.nome}</div>
                        <div className="text-muted-foreground">{m?.subgrupo?.nome}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{m?.unidadeMedida?.sigla}</TableCell>
                      <TableCell className="hidden lg:table-cell">{m?.fabricante ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'ATIVO' ? 'default' : 'destructive'}>{m.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon-sm" title="Ver detalhes">
                            <Link href={`/materiais/${m.id}`} aria-label={`Ver ${m.codigo}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          {podeEditar && (
                            <Button asChild variant="ghost" size="icon-sm" title="Editar">
                              <Link href={`/materiais/${m.id}/editar`} aria-label={`Editar ${m.codigo}`}><Pencil className="h-4 w-4" /></Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">Página {dados?.page ?? 1} de {dados?.totalPaginas ?? 1}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={(dados?.page ?? 1) <= 1 || carregando} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={(dados?.page ?? 1) >= (dados?.totalPaginas ?? 1) || carregando} onClick={() => setPage((p) => p + 1)}>
                Próxima <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
