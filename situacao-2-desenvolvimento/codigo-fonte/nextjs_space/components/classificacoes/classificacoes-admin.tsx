'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SelectNativo } from '@/components/ui/select-nativo'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiFetch } from '@/lib/api-client'
import type { FamiliaDto, GrupoDto, SubgrupoDto } from '@/lib/tipos-cliente'
import { Plus, Pencil, Power, PowerOff, Loader2 } from 'lucide-react'

type Nivel = 'familia' | 'grupo' | 'subgrupo'
const ROTA: Record<Nivel, string> = { familia: '/api/familias', grupo: '/api/grupos', subgrupo: '/api/subgrupos' }
const NOME: Record<Nivel, string> = { familia: 'Família', grupo: 'Grupo', subgrupo: 'Subgrupo' }

type Item = { id: string; codigo: string; nome: string; ativo: boolean; familiaId?: string; grupoId?: string }
type FormState = { id?: string; codigo: string; nome: string; familiaId: string; grupoId: string }

export function ClassificacoesAdmin() {
  const [familias, setFamilias] = useState<FamiliaDto[]>([])
  const [grupos, setGrupos] = useState<GrupoDto[]>([])
  const [subgrupos, setSubgrupos] = useState<SubgrupoDto[]>([])
  const [carregando, setCarregando] = useState(true)

  const [nivel, setNivel] = useState<Nivel>('familia')
  const [dialogo, setDialogo] = useState<{ aberto: boolean; nivel: Nivel; form: FormState }>({ aberto: false, nivel: 'familia', form: { codigo: '', nome: '', familiaId: '', grupoId: '' } })
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [confirmacao, setConfirmacao] = useState<{ aberto: boolean; nivel: Nivel; item: Item | null; mensagem: string }>({ aberto: false, nivel: 'familia', item: null, mensagem: '' })

  const carregar = useCallback(async () => {
    const [f, g, s] = await Promise.all([
      apiFetch<{ familias: FamiliaDto[] }>('/api/familias'),
      apiFetch<{ grupos: GrupoDto[] }>('/api/grupos'),
      apiFetch<{ subgrupos: SubgrupoDto[] }>('/api/subgrupos'),
    ])
    setFamilias(f?.data?.familias ?? [])
    setGrupos(g?.data?.grupos ?? [])
    setSubgrupos(s?.data?.subgrupos ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => carregar())
  }, [carregar])

  const gruposDoForm = useMemo(() => (grupos ?? []).filter((g) => g?.familiaId === dialogo.form.familiaId), [grupos, dialogo.form.familiaId])

  function abrirNovo(n: Nivel) {
    setCampos({})
    setDialogo({ aberto: true, nivel: n, form: { codigo: '', nome: '', familiaId: '', grupoId: '' } })
  }
  function abrirEdicao(n: Nivel, item: Item) {
    setCampos({})
    let familiaId = item?.familiaId ?? ''
    if (n === 'subgrupo') {
      const g = (grupos ?? []).find((x) => x.id === item?.grupoId)
      familiaId = g?.familiaId ?? ''
    }
    setDialogo({ aberto: true, nivel: n, form: { id: item.id, codigo: item.codigo, nome: item.nome, familiaId, grupoId: item?.grupoId ?? '' } })
  }
  const setForm = (k: keyof FormState, v: string) => setDialogo((d) => ({ ...d, form: { ...(d?.form ?? {}), [k]: v } as FormState }))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setCampos({})
    const { nivel: n, form } = dialogo
    const locais: Record<string, string> = {}
    if (!form.codigo.trim()) locais.codigo = 'Código é obrigatório.'
    if (form.nome.trim().length < 2) locais.nome = 'Nome deve ter pelo menos 2 caracteres.'
    if (n !== 'familia' && !form.familiaId) locais.familiaId = 'Família é obrigatória.'
    if (n === 'subgrupo' && !form.grupoId) locais.grupoId = 'Grupo é obrigatório.'
    if (Object.keys(locais).length) {
      setCampos(locais)
      return
    }
    setSalvando(true)
    const body: Record<string, string> = { codigo: form.codigo, nome: form.nome }
    if (n === 'grupo') body.familiaId = form.familiaId
    if (n === 'subgrupo') body.grupoId = form.grupoId
    const res = await apiFetch(form.id ? `${ROTA[n]}/${form.id}` : ROTA[n], { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(body) })
    setSalvando(false)
    if (!res.ok) {
      setCampos(res.campos ?? {})
      toast.error(res.erro ?? 'Não foi possível salvar.')
      return
    }
    toast.success(`${NOME[n]} ${form.id ? 'atualizado(a)' : 'criado(a)'} com sucesso.`)
    setDialogo((d) => ({ ...d, aberto: false }))
    carregar()
  }

  async function alternarStatus(n: Nivel, item: Item, confirmar = false) {
    const res = await apiFetch(`${ROTA[n]}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !item.ativo, confirmar }) })
    if (!res.ok) {
      if (res.status === 409 && res.requerConfirmacao) {
        setConfirmacao({ aberto: true, nivel: n, item, mensagem: res.erro ?? 'Item em uso. Deseja continuar?' })
        return
      }
      toast.error(res.erro ?? 'Não foi possível alterar o status.')
      return
    }
    toast.success(`${NOME[n]} ${item.ativo ? 'inativado(a)' : 'reativado(a)'}.`)
    setConfirmacao((c) => ({ ...c, aberto: false }))
    carregar()
  }

  const renderTabela = (n: Nivel, itens: Item[], colunasExtras: (i: Item) => React.ReactNode) => (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">{carregando ? 'Carregando...' : `${itens?.length ?? 0} registro(s)`}</span>
          <Button size="sm" onClick={() => abrirNovo(n)}><Plus className="mr-1 h-4 w-4" /> Nova {NOME[n].toLowerCase()}{n === 'familia' ? '' : ''}</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                {n !== 'familia' && <TableHead className="hidden md:table-cell">Vinculado a</TableHead>}
                <TableHead className="hidden sm:table-cell">Uso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(itens?.length ?? 0) === 0 && !carregando ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              ) : (
                (itens ?? []).map((i) => (
                  <TableRow key={i.id} className={i.ativo ? '' : 'opacity-70'}>
                    <TableCell className="font-mono text-xs font-medium">{i.codigo}</TableCell>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    {colunasExtras(i)}
                    <TableCell><Badge variant={i.ativo ? 'default' : 'destructive'}>{i.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" title="Editar" aria-label={`Editar ${i.codigo}`} onClick={() => abrirEdicao(n, i)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" title={i.ativo ? 'Inativar' : 'Reativar'} aria-label={`${i.ativo ? 'Inativar' : 'Reativar'} ${i.codigo}`} onClick={() => alternarStatus(n, i)}>
                          {i.ativo ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-primary" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      <Tabs value={nivel} onValueChange={(v) => setNivel(v as Nivel)}>
        <TabsList>
          <TabsTrigger value="familia">Famílias ({familias?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="grupo">Grupos ({grupos?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="subgrupo">Subgrupos ({subgrupos?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="familia" className="mt-4">
          {renderTabela('familia', familias, (i) => {
            const f = i as FamiliaDto
            return <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{f?._count?.grupos ?? 0} grupos · {f?._count?.materiais ?? 0} materiais</TableCell>
          })}
        </TabsContent>
        <TabsContent value="grupo" className="mt-4">
          {renderTabela('grupo', grupos, (i) => {
            const g = i as GrupoDto
            return (
              <>
                <TableCell className="hidden text-xs md:table-cell">{g?.familia?.codigo} - {g?.familia?.nome}</TableCell>
                <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{g?._count?.subgrupos ?? 0} subgrupos · {g?._count?.materiais ?? 0} materiais</TableCell>
              </>
            )
          })}
        </TabsContent>
        <TabsContent value="subgrupo" className="mt-4">
          {renderTabela('subgrupo', subgrupos, (i) => {
            const s = i as SubgrupoDto
            return (
              <>
                <TableCell className="hidden text-xs md:table-cell">{s?.grupo?.familia?.codigo} › {s?.grupo?.codigo} - {s?.grupo?.nome}</TableCell>
                <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{s?._count?.materiais ?? 0} materiais</TableCell>
              </>
            )
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogo.aberto} onOpenChange={(o) => setDialogo((d) => ({ ...d, aberto: o }))}>
        <DialogContent>
          <form onSubmit={salvar} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>{dialogo.form.id ? 'Editar' : 'Nova'} {NOME[dialogo.nivel].toLowerCase()}</DialogTitle>
              <DialogDescription>Código curto (letras/números, até 10 caracteres) e nome descritivo.</DialogDescription>
            </DialogHeader>
            {dialogo.nivel !== 'familia' && (
              <div className="space-y-2">
                <Label htmlFor="c-familia">Família *</Label>
                <SelectNativo id="c-familia" value={dialogo.form.familiaId} erro={Boolean(campos?.familiaId)} onChange={(e) => { setForm('familiaId', e?.target?.value ?? ''); setForm('grupoId', '') }}>
                  <option value="">Selecione...</option>
                  {(familias ?? []).filter((f) => f.ativo || f.id === dialogo.form.familiaId).map((f) => <option key={f.id} value={f.id}>{f.codigo} - {f.nome}</option>)}
                </SelectNativo>
                {campos?.familiaId && <p className="text-xs text-destructive">{campos.familiaId}</p>}
              </div>
            )}
            {dialogo.nivel === 'subgrupo' && (
              <div className="space-y-2">
                <Label htmlFor="c-grupo">Grupo *</Label>
                <SelectNativo id="c-grupo" value={dialogo.form.grupoId} disabled={!dialogo.form.familiaId} erro={Boolean(campos?.grupoId)} onChange={(e) => setForm('grupoId', e?.target?.value ?? '')}>
                  <option value="">{dialogo.form.familiaId ? 'Selecione...' : 'Selecione a família primeiro'}</option>
                  {gruposDoForm.filter((g) => g.ativo || g.id === dialogo.form.grupoId).map((g) => <option key={g.id} value={g.id}>{g.codigo} - {g.nome}</option>)}
                </SelectNativo>
                {campos?.grupoId && <p className="text-xs text-destructive">{campos.grupoId}</p>}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="c-codigo">Código *</Label>
                <Input id="c-codigo" maxLength={10} value={dialogo.form.codigo} variant={campos?.codigo ? 'error' : 'default'} className="font-mono uppercase" onChange={(e) => setForm('codigo', (e?.target?.value ?? '').toUpperCase())} />
                {campos?.codigo && <p className="text-xs text-destructive">{campos.codigo}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-nome">Nome *</Label>
                <Input id="c-nome" maxLength={80} value={dialogo.form.nome} variant={campos?.nome ? 'error' : 'default'} onChange={(e) => setForm('nome', e?.target?.value ?? '')} />
                {campos?.nome && <p className="text-xs text-destructive">{campos.nome}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogo((d) => ({ ...d, aberto: false }))}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmacao.aberto} onOpenChange={(o) => setConfirmacao((c) => ({ ...c, aberto: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Item em uso</AlertDialogTitle>
            <AlertDialogDescription>{confirmacao.mensagem}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); if (confirmacao.item) alternarStatus(confirmacao.nivel, confirmacao.item, true) }}>
              Inativar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
