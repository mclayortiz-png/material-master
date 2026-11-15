import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await exigirSessao()
    const unidades = await prisma.unidadeMedida.findMany({ where: { ativo: true }, orderBy: { sigla: 'asc' } })
    return NextResponse.json({ unidades: unidades ?? [] })
  } catch (e) {
    return respostaErro(e)
  }
}
