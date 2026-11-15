import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { classificacaoSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const { id } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const atual = await prisma.familia.findUnique({ where: { id: id ?? '' } })
    if (!atual) return NextResponse.json({ erro: 'Família não encontrada.' }, { status: 404 })
    const dados = classificacaoSchema.parse(body ?? {})
    if (dados.codigo !== atual.codigo) {
      const dup = await prisma.familia.findUnique({ where: { codigo: dados.codigo } })
      if (dup) return NextResponse.json({ erro: `Já existe uma família com o código ${dados.codigo}.`, campos: { codigo: 'Código já utilizado.' } }, { status: 409 })
    }
    const familia = await prisma.$transaction(async (tx) => {
      const f = await tx.familia.update({ where: { id }, data: { codigo: dados.codigo, nome: dados.nome } })
      await registrarAuditoria(tx, { entidade: 'Familia', entidadeId: id, acao: 'EDICAO', usuarioId: sessao.id, detalhes: { de: { codigo: atual.codigo, nome: atual.nome }, para: { codigo: f.codigo, nome: f.nome } } })
      return f
    })
    return NextResponse.json({ familia })
  } catch (e) {
    return respostaErro(e)
  }
}

/** Altera status. Inativar uma família em uso exige confirmar=true (retorna 409 com aviso). */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const { id } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as { ativo?: boolean; confirmar?: boolean }
    if (typeof body?.ativo !== 'boolean') return NextResponse.json({ erro: 'Informe o campo ativo (true/false).' }, { status: 400 })
    const atual = await prisma.familia.findUnique({ where: { id: id ?? '' } })
    if (!atual) return NextResponse.json({ erro: 'Família não encontrada.' }, { status: 404 })
    if (!body.ativo) {
      const [grupos, materiais] = await Promise.all([
        prisma.grupo.count({ where: { familiaId: id, ativo: true } }),
        prisma.material.count({ where: { familiaId: id, status: 'ATIVO' } }),
      ])
      if ((grupos > 0 || materiais > 0) && body?.confirmar !== true) {
        return NextResponse.json({
          erro: `Esta família está em uso: ${grupos} grupo(s) ativo(s) e ${materiais} material(is) ativo(s). Confirme para inativar mesmo assim (os vínculos existentes serão preservados).`,
          emUso: { grupos, materiais },
          requerConfirmacao: true,
        }, { status: 409 })
      }
    }
    const familia = await prisma.$transaction(async (tx) => {
      const f = await tx.familia.update({ where: { id }, data: { ativo: body.ativo } })
      await registrarAuditoria(tx, { entidade: 'Familia', entidadeId: id, acao: body.ativo ? 'REATIVACAO' : 'INATIVACAO', usuarioId: sessao.id })
      return f
    })
    return NextResponse.json({ familia })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function DELETE() {
  return NextResponse.json({ erro: 'Exclusão física não é permitida. Utilize a inativação.' }, { status: 405 })
}
