'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SelectNativo } from '@/components/ui/select-nativo'
import { apiFetch } from '@/lib/api-client'
import type { FamiliaDto, GrupoDto, SubgrupoDto, UnidadeDto, MaterialDto } from '@/lib/tipos-cliente'
import { Save, ArrowLeft, AlertCircle, Lock } from 'lucide-react'

type FormState = {
  descricaoCurta: string
  descricaoLonga: string
  unidadeMedidaId: string
  familiaId: string
  grupoId: string
  subgrupoId: string
  fabricante: string
  partNumber: string
  ncm: string
}

const vazio: FormState = { descricaoCurta: '', descricaoLonga: '', unidadeMedidaId: '', familiaId: '', grupoId: '', subgrupoId: '', fabricante: '', partNumber: '', ncm: '' }

export function MaterialForm({ material }: { material?: MaterialDto | null }) {
  const router = useRouter()
  const edicao = Boolean(material?.id)
  const [form, setForm] = useState<FormState>(() =>
    material
      ? {
          descricaoCurta: material.descricaoCurta ?? '',
          descricaoLonga: material.descricaoLonga ?? '',
          unidadeMedidaId: material.unidadeMedidaId ?? '',
          familiaId: material.familiaId ?? '',
          grupoId: material.grupoId ?? '',
          subgrupoId: material.subgrupoId ?? '',
          fabricante: material.fabricante ?? '',
          partNumber: material.partNumber ?? '',
          ncm: material.ncm ?? '',
        }
      : vazio,
  )
  const [familias, setFamilias] = useState<FamiliaDto[]>([])
  const [grupos, setGrupos] = useState<GrupoDto[]>([])
  const [subgrupos, setSubgrupos] = useState<SubgrupoDto[]>([])
  const [unidades, setUnidades] = useState<UnidadeDto[]>([])
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const [f, g, s, u] = await Promise.all([
        apiFetch<{ familias: FamiliaDto[] }>('/api/familias'),
        apiFetch<{ grupos: GrupoDto[] }>('/api/grupos'),
        apiFetch<{ subgrupos: SubgrupoDto[] }>('/api/subgrupos'),
        apiFetch<{ unidades: UnidadeDto[] }>('/api/unidades'),
      ])
      if (!ativo) return
      setFamilias(f?.data?.familias ?? [])
      setGrupos(g?.data?.grupos ?? [])
      setSubgrupos(s?.data?.subgrupos ?? [])
      setUnidades(u?.data?.unidades ?? [])
    })()
    return () => {
      ativo = false
    }
  }, [])

  // Opções em cascata: apenas itens ativos (mantém o item atualmente selecionado mesmo se inativo, para edição)
  const familiasOpcoes = useMemo(() => (familias ?? []).filter((f) => f?.ativo || f?.id === form.familiaId), [familias, form.familiaId])
  const gruposOpcoes = useMemo(() => (grupos ?? []).filter((g) => g?.familiaId === form.familiaId && (g?.ativo || g?.id === form.grupoId)), [grupos, form.familiaId, form.grupoId])
  const subgruposOpcoes = useMemo(() => (subgrupos ?? []).filter((s) => s?.grupoId === form.grupoId && (s?.ativo || s?.id === form.subgrupoId)), [subgrupos, form.grupoId, form.subgrupoId])

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...(f ?? vazio), [k]: v }))
    setCampos((c) => {
      const n = { ...(c ?? {}) }
      delete n[k]
      return n
    })
  }

  function validarLocal(): Record<string, string> {
    const e: Record<string, string> = {}
    if ((form.descricaoCurta ?? '').trim().length < 3) e.descricaoCurta = 'Descrição curta deve ter pelo menos 3 caracteres.'
    if ((form.descricaoCurta ?? '').trim().length > 120) e.descricaoCurta = 'Descrição curta deve ter no máximo 120 caracteres.'
    if (!form.unidadeMedidaId) e.unidadeMedidaId = 'Unidade de medida é obrigatória.'
    if (!form.familiaId) e.familiaId = 'Família é obrigatória.'
    if (!form.grupoId) e.grupoId = 'Grupo é obrigatório.'
    if (!form.subgrupoId) e.subgrupoId = 'Subgrupo é obrigatório.'
    const ncm = (form.ncm ?? '').replace(/\D/g, '')
    if (ncm && ncm.length !== 8) e.ncm = 'NCM deve conter exatamente 8 dígitos.'
    return e
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErro(null)
    const locais = validarLocal()
    if (Object.keys(locais).length) {
      setCampos(locais)
      setErro('Verifique os campos destacados.')
      return
    }
    setSalvando(true)
    const res = await apiFetch<{ material: MaterialDto }>(edicao ? `/api/materiais/${material?.id}` : '/api/materiais', {
      method: edicao ? 'PUT' : 'POST',
      body: JSON.stringify(form),
    })
    setSalvando(false)
    if (!res.ok) {
      setErro(res.erro ?? 'Não foi possível salvar o material.')
      setCampos(res.campos ?? {})
      return
    }
    const salvo = res?.data?.material
    toast.success(edicao ? 'Material atualizado com sucesso.' : `Material ${salvo?.codigo ?? ''} cadastrado com sucesso.`)
    router.push(`/materiais/${salvo?.id ?? material?.id ?? ''}`)
    router.refresh()
  }

  const erroDe = (k: string) => (campos?.[k] ? <p className="text-xs text-destructive">{campos[k]}</p> : null)

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identificação</CardTitle>
          <CardDescription>{edicao ? 'O código é gerado pelo sistema e não pode ser alterado.' : 'O código será gerado automaticamente ao salvar.'}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="codigo" className="flex items-center gap-1"><Lock className="h-3 w-3" /> Código</Label>
            <Input id="codigo" value={edicao ? material?.codigo ?? '' : 'Gerado automaticamente (MAT-000000)'} readOnly disabled className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unidadeMedidaId">Unidade de medida *</Label>
            <SelectNativo id="unidadeMedidaId" value={form.unidadeMedidaId} erro={Boolean(campos?.unidadeMedidaId)} onChange={(e) => set('unidadeMedidaId', e?.target?.value ?? '')}>
              <option value="">Selecione...</option>
              {(unidades ?? []).map((u) => <option key={u.id} value={u.id}>{u.sigla} - {u.nome}</option>)}
            </SelectNativo>
            {erroDe('unidadeMedidaId')}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descricaoCurta">Descrição curta * <span className="text-xs text-muted-foreground">({form.descricaoCurta?.length ?? 0}/120)</span></Label>
            <Input id="descricaoCurta" maxLength={120} value={form.descricaoCurta} variant={campos?.descricaoCurta ? 'error' : 'default'} placeholder="Ex.: Rolamento rígido de esferas 6205-2RS" onChange={(e) => set('descricaoCurta', e?.target?.value ?? '')} />
            {erroDe('descricaoCurta')}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descricaoLonga">Descrição longa / técnica</Label>
            <Textarea id="descricaoLonga" rows={4} maxLength={2000} value={form.descricaoLonga} placeholder="Especificações técnicas, normas, dimensões, aplicação..." onChange={(e) => set('descricaoLonga', e?.target?.value ?? '')} />
            {erroDe('descricaoLonga')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classificação</CardTitle>
          <CardDescription>Selecione a família para liberar os grupos e, em seguida, os subgrupos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="familiaId">Família *</Label>
            <SelectNativo id="familiaId" value={form.familiaId} erro={Boolean(campos?.familiaId)} onChange={(e) => { set('familiaId', e?.target?.value ?? ''); set('grupoId', ''); set('subgrupoId', '') }}>
              <option value="">Selecione...</option>
              {familiasOpcoes.map((f) => <option key={f.id} value={f.id}>{f.codigo} - {f.nome}{f.ativo ? '' : ' (inativa)'}</option>)}
            </SelectNativo>
            {erroDe('familiaId')}
          </div>
          <div className="space-y-2">
            <Label htmlFor="grupoId">Grupo *</Label>
            <SelectNativo id="grupoId" value={form.grupoId} disabled={!form.familiaId} erro={Boolean(campos?.grupoId)} onChange={(e) => { set('grupoId', e?.target?.value ?? ''); set('subgrupoId', '') }}>
              <option value="">{form.familiaId ? 'Selecione...' : 'Selecione a família primeiro'}</option>
              {gruposOpcoes.map((g) => <option key={g.id} value={g.id}>{g.codigo} - {g.nome}{g.ativo ? '' : ' (inativo)'}</option>)}
            </SelectNativo>
            {erroDe('grupoId')}
          </div>
          <div className="space-y-2">
            <Label htmlFor="subgrupoId">Subgrupo *</Label>
            <SelectNativo id="subgrupoId" value={form.subgrupoId} disabled={!form.grupoId} erro={Boolean(campos?.subgrupoId)} onChange={(e) => set('subgrupoId', e?.target?.value ?? '')}>
              <option value="">{form.grupoId ? 'Selecione...' : 'Selecione o grupo primeiro'}</option>
              {subgruposOpcoes.map((s) => <option key={s.id} value={s.id}>{s.codigo} - {s.nome}{s.ativo ? '' : ' (inativo)'}</option>)}
            </SelectNativo>
            {erroDe('subgrupoId')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados complementares</CardTitle>
          <CardDescription>Informações do fabricante e fiscais (opcionais).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fabricante">Fabricante</Label>
            <Input id="fabricante" maxLength={120} value={form.fabricante} placeholder="Ex.: SKF" onChange={(e) => set('fabricante', e?.target?.value ?? '')} />
            {erroDe('fabricante')}
          </div>
          <div className="space-y-2">
            <Label htmlFor="partNumber">Part number / referência</Label>
            <Input id="partNumber" maxLength={80} value={form.partNumber} placeholder="Ex.: 6205-2RS1" onChange={(e) => set('partNumber', e?.target?.value ?? '')} />
            {erroDe('partNumber')}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ncm">NCM (8 dígitos)</Label>
            <Input id="ncm" inputMode="numeric" maxLength={10} value={form.ncm} variant={campos?.ncm ? 'error' : 'default'} placeholder="Ex.: 84821010" onChange={(e) => set('ncm', e?.target?.value ?? '')} />
            {erroDe('ncm')}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href={edicao ? `/materiais/${material?.id}` : '/materiais'}><ArrowLeft className="mr-2 h-4 w-4" /> Cancelar</Link>
        </Button>
        <Button type="submit" loading={salvando}>
          <Save className="mr-2 h-4 w-4" /> {edicao ? 'Salvar alterações' : 'Cadastrar material'}
        </Button>
      </div>
    </form>
  )
}
