import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { PageHeader } from '@/components/layouts/page-header'
import { UsuariosAdmin } from '@/components/usuarios/usuarios-admin'
import { podeAdministrar } from '@/lib/authz'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Usuários' }

export default async function UsuariosPage() {
  const session = await auth()
  if (!podeAdministrar(session?.user?.perfil)) redirect('/sem-permissao')
  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" description="Crie contas, atribua perfis de acesso e ative ou inative usuários." />
      <UsuariosAdmin meuId={session?.user?.id ?? ''} />
    </div>
  )
}
