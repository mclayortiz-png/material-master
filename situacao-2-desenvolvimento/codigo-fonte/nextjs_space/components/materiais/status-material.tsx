'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { apiFetch } from '@/lib/api-client'
import { PowerOff, Power } from 'lucide-react'

export function StatusMaterial({ id, codigo, status }: { id: string; codigo: string; status: 'ATIVO' | 'INATIVO' }) {
  const router = useRouter()
  const [motivo, setMotivo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const inativar = status === 'ATIVO'

  async function confirmar() {
    if (inativar && motivo.trim().length < 3) {
      toast.error('Informe o motivo da inativação (mínimo 3 caracteres).')
      return
    }
    setCarregando(true)
    const res = await apiFetch(`/api/materiais/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: inativar ? 'INATIVO' : 'ATIVO', motivo: motivo.trim() }),
    })
    setCarregando(false)
    if (!res.ok) {
      toast.error(res.erro ?? 'Não foi possível alterar o status.')
      return
    }
    toast.success(inativar ? `Material ${codigo} inativado.` : `Material ${codigo} reativado.`)
    setAberto(false)
    setMotivo('')
    router.refresh()
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        <Button variant={inativar ? 'destructive' : 'default'}>
          {inativar ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
          {inativar ? 'Inativar' : 'Reativar'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{inativar ? `Inativar material ${codigo}?` : `Reativar material ${codigo}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {inativar
              ? 'O material deixará de estar disponível para uso, mas o registro e o seu histórico serão preservados. Não há exclusão física.'
              : 'O material voltará a ficar disponível para uso.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {inativar && (
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da inativação *</Label>
            <Textarea id="motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e?.target?.value ?? '')} placeholder="Ex.: Item descontinuado pelo fabricante" />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmar() }} disabled={carregando} className={inativar ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
            {carregando ? 'Processando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
