import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { classificacaoSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await exigirSessao()
    const sp = new URL(req.url).searchParams
    const somenteAtivos = sp.get('ativos') === '1'
    const familias = await prisma.familia.findMany({
      where: somenteAtivos ? { ativo: true } : {},
      orderBy: { codigo: 'asc' },
      include: { _count: { select: { grupos: true, materiais: true } } },
    })
    return NextResponse.json({ familias: familias ?? [] })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function POST(req: Request) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const dados = classificacaoSchema.parse((await req.json().catch(() => ({}))) ?? {})
    const existe = await prisma.familia.findUnique({ where: { codigo: dados.codigo } })
    if (existe) return NextResponse.json({ erro: `Já existe uma família com o código ${dados.codigo}.`, campos: { codigo: 'Código já utilizado.' } }, { status: 409 })
    const familia = await prisma.$transaction(async (tx) => {
      const f = await tx.familia.create({ data: { codigo: dados.codigo, nome: dados.nome } })
      await registrarAuditoria(tx, { entidade: 'Familia', entidadeId: f.id, acao: 'CRIACAO', usuarioId: sessao.id, detalhes: { codigo: f.codigo, nome: f.nome } })
      return f
    })
    return NextResponse.json({ familia }, { status: 201 })
  } catch (e) {
    return respostaErro(e)
  }
}
