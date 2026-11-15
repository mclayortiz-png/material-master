import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { grupoSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const { id } = await ctx.params
    const atual = await prisma.grupo.findUnique({ where: { id: id ?? '' } })
    if (!atual) return NextResponse.json({ erro: 'Grupo não encontrado.' }, { status: 404 })
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const dados = grupoSchema.parse({ ...(body ?? {}), familiaId: body?.familiaId ?? atual.familiaId })
    if (dados.familiaId !== atual.familiaId) {
      const emUso = await prisma.material.count({ where: { grupoId: id } })
      if (emUso > 0) return NextResponse.json({ erro: 'Não é possível mover um grupo com materiais vinculados para outra família.' }, { status: 409 })
      const fam = await prisma.familia.findUnique({ where: { id: dados.familiaId } })
      if (!fam) return NextResponse.json({ erro: 'Família não encontrada.' }, { status: 400 })
    }
    if (dados.codigo !== atual.codigo || dados.familiaId !== atual.familiaId) {
      const dup = await prisma.grupo.findUnique({ where: { familiaId_codigo: { familiaId: dados.familiaId, codigo: dados.codigo } } })
      if (dup && dup.id !== id) return NextResponse.json({ erro: `Já existe um grupo com o código ${dados.codigo} nesta família.`, campos: { codigo: 'Código já utilizado nesta família.' } }, { status: 409 })
    }
    const grupo = await prisma.$transaction(async (tx) => {
      const g = await tx.grupo.update({ where: { id }, data: { codigo: dados.codigo, nome: dados.nome, familiaId: dados.familiaId } })
      await registrarAuditoria(tx, { entidade: 'Grupo', entidadeId: id, acao: 'EDICAO', usuarioId: sessao.id, detalhes: { de: { codigo: atual.codigo, nome: atual.nome }, para: { codigo: g.codigo, nome: g.nome } } })
      return g
    })
    return NextResponse.json({ grupo })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const { id } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as { ativo?: boolean; confirmar?: boolean }
    if (typeof body?.ativo !== 'boolean') return NextResponse.json({ erro: 'Informe o campo ativo (true/false).' }, { status: 400 })
    const atual = await prisma.grupo.findUnique({ where: { id: id ?? '' }, include: { familia: true } })
    if (!atual) return NextResponse.json({ erro: 'Grupo não encontrado.' }, { status: 404 })
    if (body.ativo && !atual.familia?.ativo) {
      return NextResponse.json({ erro: 'Não é possível reativar o grupo: a família pai está inativa.' }, { status: 409 })
    }
    if (!body.ativo) {
      const [subgrupos, materiais] = await Promise.all([
        prisma.subgrupo.count({ where: { grupoId: id, ativo: true } }),
        prisma.material.count({ where: { grupoId: id, status: 'ATIVO' } }),
      ])
      if ((subgrupos > 0 || materiais > 0) && body?.confirmar !== true) {
        return NextResponse.json({
          erro: `Este grupo está em uso: ${subgrupos} subgrupo(s) ativo(s) e ${materiais} material(is) ativo(s). Confirme para inativar mesmo assim.`,
          emUso: { subgrupos, materiais },
          requerConfirmacao: true,
        }, { status: 409 })
      }
    }
    const grupo = await prisma.$transaction(async (tx) => {
      const g = await tx.grupo.update({ where: { id }, data: { ativo: body.ativo } })
      await registrarAuditoria(tx, { entidade: 'Grupo', entidadeId: id, acao: body.ativo ? 'REATIVACAO' : 'INATIVACAO', usuarioId: sessao.id })
      return g
    })
    return NextResponse.json({ grupo })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function DELETE() {
  return NextResponse.json({ erro: 'Exclusão física não é permitida. Utilize a inativação.' }, { status: 405 })
}
