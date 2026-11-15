import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { subgrupoSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const { id } = await ctx.params
    const atual = await prisma.subgrupo.findUnique({ where: { id: id ?? '' } })
    if (!atual) return NextResponse.json({ erro: 'Subgrupo não encontrado.' }, { status: 404 })
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const dados = subgrupoSchema.parse({ ...(body ?? {}), grupoId: body?.grupoId ?? atual.grupoId })
    if (dados.grupoId !== atual.grupoId) {
      const emUso = await prisma.material.count({ where: { subgrupoId: id } })
      if (emUso > 0) return NextResponse.json({ erro: 'Não é possível mover um subgrupo com materiais vinculados para outro grupo.' }, { status: 409 })
      const g = await prisma.grupo.findUnique({ where: { id: dados.grupoId } })
      if (!g) return NextResponse.json({ erro: 'Grupo não encontrado.' }, { status: 400 })
    }
    if (dados.codigo !== atual.codigo || dados.grupoId !== atual.grupoId) {
      const dup = await prisma.subgrupo.findUnique({ where: { grupoId_codigo: { grupoId: dados.grupoId, codigo: dados.codigo } } })
      if (dup && dup.id !== id) return NextResponse.json({ erro: `Já existe um subgrupo com o código ${dados.codigo} neste grupo.`, campos: { codigo: 'Código já utilizado neste grupo.' } }, { status: 409 })
    }
    const subgrupo = await prisma.$transaction(async (tx) => {
      const s = await tx.subgrupo.update({ where: { id }, data: { codigo: dados.codigo, nome: dados.nome, grupoId: dados.grupoId } })
      await registrarAuditoria(tx, { entidade: 'Subgrupo', entidadeId: id, acao: 'EDICAO', usuarioId: sessao.id, detalhes: { de: { codigo: atual.codigo, nome: atual.nome }, para: { codigo: s.codigo, nome: s.nome } } })
      return s
    })
    return NextResponse.json({ subgrupo })
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
    const atual = await prisma.subgrupo.findUnique({ where: { id: id ?? '' }, include: { grupo: true } })
    if (!atual) return NextResponse.json({ erro: 'Subgrupo não encontrado.' }, { status: 404 })
    if (body.ativo && !atual.grupo?.ativo) {
      return NextResponse.json({ erro: 'Não é possível reativar o subgrupo: o grupo pai está inativo.' }, { status: 409 })
    }
    if (!body.ativo) {
      const materiais = await prisma.material.count({ where: { subgrupoId: id, status: 'ATIVO' } })
      if (materiais > 0 && body?.confirmar !== true) {
        return NextResponse.json({
          erro: `Este subgrupo está em uso por ${materiais} material(is) ativo(s). Confirme para inativar mesmo assim.`,
          emUso: { materiais },
          requerConfirmacao: true,
        }, { status: 409 })
      }
    }
    const subgrupo = await prisma.$transaction(async (tx) => {
      const s = await tx.subgrupo.update({ where: { id }, data: { ativo: body.ativo } })
      await registrarAuditoria(tx, { entidade: 'Subgrupo', entidadeId: id, acao: body.ativo ? 'REATIVACAO' : 'INATIVACAO', usuarioId: sessao.id })
      return s
    })
    return NextResponse.json({ subgrupo })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function DELETE() {
  return NextResponse.json({ erro: 'Exclusão física não é permitida. Utilize a inativação.' }, { status: 405 })
}
