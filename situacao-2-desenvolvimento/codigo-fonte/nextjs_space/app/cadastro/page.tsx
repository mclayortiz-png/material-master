import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { SignupForm } from '@/components/auth/signup-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Criar conta' }

export default async function CadastroPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/inicio')
  return (
    <AuthLayout title="Criar conta" description="Contas criadas aqui recebem o perfil Consulta (somente leitura). Um Administrador pode elevar o seu perfil.">
      <SignupForm />
    </AuthLayout>
  )
}
