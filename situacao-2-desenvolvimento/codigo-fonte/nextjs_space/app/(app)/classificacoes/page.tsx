import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { PageHeader } from '@/components/layouts/page-header'
import { ClassificacoesAdmin } from '@/components/classificacoes/classificacoes-admin'
import { podeAdministrar } from '@/lib/authz'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Classificações' }

export default async function ClassificacoesPage() {
  const session = await auth()
  if (!podeAdministrar(session?.user?.perfil)) redirect('/sem-permissao')
  return (
    <div className="space-y-6">
      <PageHeader title="Classificações" description="Hierarquia Família › Grupo › Subgrupo utilizada no cadastro de materiais. Itens em uso não são excluídos, apenas inativados." />
      <ClassificacoesAdmin />
    </div>
  )
}
