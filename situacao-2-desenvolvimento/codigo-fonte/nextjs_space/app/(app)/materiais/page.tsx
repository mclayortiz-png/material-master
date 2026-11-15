import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@/auth'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { MateriaisLista } from '@/components/materiais/materiais-lista'
import { podeGerenciarMateriais } from '@/lib/authz'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Materiais' }

export default async function MateriaisPage() {
  const session = await auth()
  const podeEditar = podeGerenciarMateriais(session?.user?.perfil)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiais"
        description="Consulte, filtre e gerencie o cadastro mestre de materiais."
        actions={podeEditar ? (
          <Button asChild>
            <Link href="/materiais/novo"><Plus className="mr-2 h-4 w-4" /> Novo material</Link>
          </Button>
        ) : undefined}
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
        <MateriaisLista podeEditar={podeEditar} />
      </Suspense>
    </div>
  )
}
