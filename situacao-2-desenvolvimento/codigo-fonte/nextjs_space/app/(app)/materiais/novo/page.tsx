import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { PageHeader } from '@/components/layouts/page-header'
import { MaterialForm } from '@/components/materiais/material-form'
import { podeGerenciarMateriais } from '@/lib/authz'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Novo material' }

export default async function NovoMaterialPage() {
  const session = await auth()
  if (!podeGerenciarMateriais(session?.user?.perfil)) redirect('/sem-permissao')
  return (
    <div className="space-y-6">
      <PageHeader title="Novo material" description="Preencha os dados abaixo. Campos marcados com * são obrigatórios." />
      <MaterialForm />
    </div>
  )
}
