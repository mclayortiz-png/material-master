import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { materialSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'
import { validarHierarquia } from '@/lib/hierarquia'
import { MATERIAL_INCLUDE } from '@/lib/materiais'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await exigirSessao()
    const { id } = await ctx.params
    const material = await prisma.material.findUnique({ where: { id: id ?? '' }, include: MATERIAL_INCLUDE })
    if (!material) return NextResponse.json({ erro: 'Material não encontrado.' }, { status: 404 })
    const historico = await prisma.auditLog.findMany({
      where: { entidade: 'Material', entidadeId: id },
      include: { usuario: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ material, historico: historico ?? [] })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR', 'GESTOR_CADASTRO'])
    const { id } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const atual = await prisma.material.findUnique({ where: { id: id ?? '' } })
    if (!atual) return NextResponse.json({ erro: 'Material não encontrado.' }, { status: 404 })
    if (typeof body?.codigo === 'string' && body.codigo !== atual.codigo) {
      return NextResponse.json({ erro: 'O código do material é imutável e não pode ser alterado.' }, { status: 400 })
    }
    const dados = materialSchema.parse(body ?? {})
    const erroHier = await validarHierarquia(dados.familiaId, dados.grupoId, dados.subgrupoId, dados.unidadeMedidaId)
    if (erroHier) return NextResponse.json({ erro: erroHier }, { status: 400 })

    const alteracoes: Record<string, { de: unknown; para: unknown }> = {}
    for (const k of Object.keys(dados) as Array<keyof typeof dados>) {
      const antes = (atual as Record<string, unknown>)?.[k] ?? null
      const depois = (dados as Record<string, unknown>)?.[k] ?? null
      if (antes !== depois) alteracoes[k] = { de: antes, para: depois }
    }

    const material = await prisma.$transaction(async (tx) => {
      const m = await tx.material.update({
        where: { id },
        data: { ...dados, atualizadoPorId: sessao.id },
        include: MATERIAL_INCLUDE,
      })
      await registrarAuditoria(tx, { entidade: 'Material', entidadeId: id, acao: 'EDICAO', usuarioId: sessao.id, detalhes: { alteracoes } as never })
      return m
    })
    return NextResponse.json({ material })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function DELETE() {
  // Exclusão física não é permitida: use PATCH /api/materiais/[id]/status para inativar.
  return NextResponse.json({ erro: 'Exclusão física não é permitida. Utilize a inativação lógica.' }, { status: 405 })
}
