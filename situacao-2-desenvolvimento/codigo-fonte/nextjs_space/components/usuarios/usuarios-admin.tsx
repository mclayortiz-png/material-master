'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SelectNativo } from '@/components/ui/select-nativo'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SafeDate } from '@/components/safe-format'
import { apiFetch } from '@/lib/api-client'
import { PERFIL_LABEL, PERFIS } from '@/lib/perfis'
import type { UsuarioDto } from '@/lib/tipos-cliente'
import type { Perfil } from '@prisma/client'
import { Plus, Pencil, Power, PowerOff, Loader2 } from 'lucide-react'

type FormState = { id?: string; name: string; email: string; password: string; perfil: Perfil }
const vazio: FormState = { name: '', email: '', password: '', perfil: 'CONSULTA' }

export function UsuariosAdmin({ meuId }: { meuId: string }) {
  const [usuarios, setUsuarios] = useState<UsuarioDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dialogo, setDialogo] = useState<{ aberto: boolean; form: FormState }>({ aberto: false, form: vazio })
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const res = await apiFetch<{ usuarios: UsuarioDto[] }>('/api/usuarios')
    if (!res.ok) toast.error(res.erro ?? 'Erro ao carregar usuários.')
    setUsuarios(res?.data?.usuarios ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => carregar())
  }, [carregar])

  const setForm = (k: keyof FormState, v: string) => setDialogo((d) => ({ ...d, form: { ...(d?.form ?? vazio), [k]: v } as FormState }))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setCampos({})
    const f = dialogo.form
    const locais: Record<string, string> = {}
    if (f.name.trim().length < 3) locais.name = 'Nome deve ter pelo menos 3 caracteres.'
    if (!f.id && !/^\S+@\S+\.\S+$/.test(f.email.trim())) locais.email = 'Informe um e-mail válido.'
    if (!f.id && f.password.length < 6) locais.password = 'A senha deve ter pelo menos 6 caracteres.'
    if (f.id && f.password && f.password.length < 6) locais.password = 'A senha deve ter pelo menos 6 caracteres.'
    if (Object.keys(locais).length) {
      setCampos(locais)
      return
    }
    setSalvando(true)
    const res = f.id
      ? await apiFetch(`/api/usuarios/${f.id}`, { method: 'PUT', body: JSON.stringify({ name: f.name, perfil: f.perfil, password: f.password || undefined }) })
      : await apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify({ name: f.name, email: f.email, password: f.password, perfil: f.perfil }) })
    setSalvando(false)
    if (!res.ok) {
      setCampos(res.campos ?? {})
      toast.error(res.erro ?? 'Não foi possível salvar o usuário.')
      return
    }
    toast.success(f.id ? 'Usuário atualizado.' : 'Usuário criado com sucesso.')
    setDialogo({ aberto: false, form: vazio })
    carregar()
  }

  async function alternar(u: UsuarioDto) {
    const res = await apiFetch(`/api/usuarios/${u.id}`, { method: 'PUT', body: JSON.stringify({ ativo: !u.ativo }) })
    if (!res.ok) {
      toast.error(res.erro ?? 'Não foi possível alterar o status.')
      return
    }
    toast.success(u.ativo ? 'Usuário inativado.' : 'Usuário reativado.')
    carregar()
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{carregando ? 'Carregando...' : `${usuarios?.length ?? 0} usuário(s)`}</span>
            <Button size="sm" onClick={() => { setCampos({}); setDialogo({ aberto: true, form: vazio }) }}><Plus className="mr-1 h-4 w-4" /> Novo usuário</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="hidden md:table-cell">Criado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usuarios ?? []).map((u) => (
                  <TableRow key={u.id} className={u.ativo ? '' : 'opacity-70'}>
                    <TableCell>
                      <div className="font-medium">{u.name}{u.id === meuId && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{u.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{u.email}</TableCell>
                    <TableCell><Badge variant="secondary">{PERFIL_LABEL?.[u.perfil] ?? u.perfil}</Badge></TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell"><SafeDate date={u.createdAt} locale="pt-BR" options={{ dateStyle: 'short' }} /></TableCell>
                    <TableCell><Badge variant={u.ativo ? 'default' : 'destructive'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" title="Editar" aria-label={`Editar ${u.name}`} onClick={() => { setCampos({}); setDialogo({ aberto: true, form: { id: u.id, name: u.name, email: u.email, password: '', perfil: u.perfil } }) }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" disabled={u.id === meuId} title={u.ativo ? 'Inativar' : 'Reativar'} aria-label={`${u.ativo ? 'Inativar' : 'Reativar'} ${u.name}`} onClick={() => alternar(u)}>
                          {u.ativo ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-primary" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogo.aberto} onOpenChange={(o) => setDialogo((d) => ({ ...d, aberto: o }))}>
        <DialogContent>
          <form onSubmit={salvar} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>{dialogo.form.id ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
              <DialogDescription>{dialogo.form.id ? 'Altere nome, perfil ou defina uma nova senha.' : 'Informe os dados de acesso e o perfil de permissões.'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="u-name">Nome *</Label>
              <Input id="u-name" value={dialogo.form.name} variant={campos?.name ? 'error' : 'default'} onChange={(e) => setForm('name', e?.target?.value ?? '')} />
              {campos?.name && <p className="text-xs text-destructive">{campos.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">E-mail *</Label>
              <Input id="u-email" type="email" value={dialogo.form.email} disabled={Boolean(dialogo.form.id)} variant={campos?.email ? 'error' : 'default'} onChange={(e) => setForm('email', e?.target?.value ?? '')} />
              {campos?.email && <p className="text-xs text-destructive">{campos.email}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u-password">{dialogo.form.id ? 'Nova senha (opcional)' : 'Senha *'}</Label>
                <Input id="u-password" type="password" autoComplete="new-password" value={dialogo.form.password} variant={campos?.password ? 'error' : 'default'} onChange={(e) => setForm('password', e?.target?.value ?? '')} />
                {campos?.password && <p className="text-xs text-destructive">{campos.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-perfil">Perfil *</Label>
                <SelectNativo id="u-perfil" value={dialogo.form.perfil} onChange={(e) => setForm('perfil', e?.target?.value ?? 'CONSULTA')}>
                  {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                </SelectNativo>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogo((d) => ({ ...d, aberto: false }))}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
