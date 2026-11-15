import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/layouts/page-header'
import { MaterialForm } from '@/components/materiais/material-form'
import { podeGerenciarMateriais } from '@/lib/authz'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Editar material' }

export default async function EditarMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!podeGerenciarMateriais(session?.user?.perfil)) redirect('/sem-permissao')
  const { id } = await params
  const material = await prisma.material.findUnique({ where: { id: id ?? '' } })
  if (!material) notFound()
  return (
    <div className="space-y-6">
      <PageHeader title={`Editar ${material.codigo}`} description={material.descricaoCurta} />
      <MaterialForm material={{ ...material, createdAt: material.createdAt.toISOString(), updatedAt: material.updatedAt.toISOString() }} />
    </div>
  )
}
