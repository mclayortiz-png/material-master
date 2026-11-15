import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { grupoSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await exigirSessao()
    const sp = new URL(req.url).searchParams
    const familiaId = sp.get('familiaId') ?? ''
    const somenteAtivos = sp.get('ativos') === '1'
    const grupos = await prisma.grupo.findMany({
      where: { ...(familiaId ? { familiaId } : {}), ...(somenteAtivos ? { ativo: true } : {}) },
      orderBy: [{ familia: { codigo: 'asc' } }, { codigo: 'asc' }],
      include: { familia: { select: { id: true, codigo: true, nome: true } }, _count: { select: { subgrupos: true, materiais: true } } },
    })
    return NextResponse.json({ grupos: grupos ?? [] })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function POST(req: Request) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const dados = grupoSchema.parse((await req.json().catch(() => ({}))) ?? {})
    const familia = await prisma.familia.findUnique({ where: { id: dados.familiaId } })
    if (!familia) return NextResponse.json({ erro: 'Família não encontrada.' }, { status: 400 })
    const existe = await prisma.grupo.findUnique({ where: { familiaId_codigo: { familiaId: dados.familiaId, codigo: dados.codigo } } })
    if (existe) return NextResponse.json({ erro: `Já existe um grupo com o código ${dados.codigo} nesta família.`, campos: { codigo: 'Código já utilizado nesta família.' } }, { status: 409 })
    const grupo = await prisma.$transaction(async (tx) => {
      const g = await tx.grupo.create({ data: { codigo: dados.codigo, nome: dados.nome, familiaId: dados.familiaId } })
      await registrarAuditoria(tx, { entidade: 'Grupo', entidadeId: g.id, acao: 'CRIACAO', usuarioId: sessao.id, detalhes: { codigo: g.codigo, nome: g.nome, familiaId: g.familiaId } })
      return g
    })
    return NextResponse.json({ grupo }, { status: 201 })
  } catch (e) {
    return respostaErro(e)
  }
}
