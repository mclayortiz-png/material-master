import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { registrarAuditoria } from '@/lib/audit'
import { MATERIAL_INCLUDE } from '@/lib/materiais'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR', 'GESTOR_CADASTRO'])
    const { id } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as { status?: string; motivo?: string }
    const status = body?.status
    if (status !== 'ATIVO' && status !== 'INATIVO') {
      return NextResponse.json({ erro: 'Status inválido. Use ATIVO ou INATIVO.' }, { status: 400 })
    }
    const atual = await prisma.material.findUnique({ where: { id: id ?? '' } })
    if (!atual) return NextResponse.json({ erro: 'Material não encontrado.' }, { status: 404 })
    if (atual.status === status) {
      return NextResponse.json({ erro: status === 'ATIVO' ? 'O material já está ativo.' : 'O material já está inativo.' }, { status: 400 })
    }
    const motivo = String(body?.motivo ?? '').trim()
    if (status === 'INATIVO' && motivo.length < 3) {
      return NextResponse.json({ erro: 'Informe o motivo da inativação (mínimo 3 caracteres).' }, { status: 400 })
    }
    const material = await prisma.$transaction(async (tx) => {
      const m = await tx.material.update({ where: { id }, data: { status, atualizadoPorId: sessao.id }, include: MATERIAL_INCLUDE })
      await registrarAuditoria(tx, {
        entidade: 'Material',
        entidadeId: id,
        acao: status === 'INATIVO' ? 'INATIVACAO' : 'REATIVACAO',
        usuarioId: sessao.id,
        detalhes: { motivo: motivo || null },
      })
      return m
    })
    return NextResponse.json({ material })
  } catch (e) {
    return respostaErro(e)
  }
}
