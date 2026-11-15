import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { LoginForm } from '@/components/auth/login-form'
import { Boxes } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Entrar' }

export default async function LoginPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/inicio')
  return (
    <AuthLayout title="MATERIAL MASTER" description="Gestão, padronização e governança de cadastros de materiais">
      <div className="-mt-2 mb-6 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Boxes className="h-6 w-6" />
        </div>
      </div>
      <LoginForm />
    </AuthLayout>
  )
}
