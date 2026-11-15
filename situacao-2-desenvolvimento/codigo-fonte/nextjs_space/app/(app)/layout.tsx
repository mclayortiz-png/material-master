import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Shell } from '@/components/shell/shell'
import type { Perfil } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const usuario = {
    nome: session.user.name ?? '',
    email: session.user.email ?? '',
    perfil: (session.user.perfil ?? 'CONSULTA') as Perfil,
  }
  return <Shell usuario={usuario}>{children}</Shell>
}
