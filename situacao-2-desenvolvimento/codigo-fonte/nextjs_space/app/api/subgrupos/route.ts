import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { subgrupoSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await exigirSessao()
    const sp = new URL(req.url).searchParams
    const grupoId = sp.get('grupoId') ?? ''
    const somenteAtivos = sp.get('ativos') === '1'
    const subgrupos = await prisma.subgrupo.findMany({
      where: { ...(grupoId ? { grupoId } : {}), ...(somenteAtivos ? { ativo: true } : {}) },
      orderBy: [{ grupo: { familia: { codigo: 'asc' } } }, { grupo: { codigo: 'asc' } }, { codigo: 'asc' }],
      include: {
        grupo: { select: { id: true, codigo: true, nome: true, familia: { select: { id: true, codigo: true, nome: true } } } },
        _count: { select: { materiais: true } },
      },
    })
    return NextResponse.json({ subgrupos: subgrupos ?? [] })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function POST(req: Request) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const dados = subgrupoSchema.parse((await req.json().catch(() => ({}))) ?? {})
    const grupo = await prisma.grupo.findUnique({ where: { id: dados.grupoId } })
    if (!grupo) return NextResponse.json({ erro: 'Grupo não encontrado.' }, { status: 400 })
    const existe = await prisma.subgrupo.findUnique({ where: { grupoId_codigo: { grupoId: dados.grupoId, codigo: dados.codigo } } })
    if (existe) return NextResponse.json({ erro: `Já existe um subgrupo com o código ${dados.codigo} neste grupo.`, campos: { codigo: 'Código já utilizado neste grupo.' } }, { status: 409 })
    const subgrupo = await prisma.$transaction(async (tx) => {
      const s = await tx.subgrupo.create({ data: { codigo: dados.codigo, nome: dados.nome, grupoId: dados.grupoId } })
      await registrarAuditoria(tx, { entidade: 'Subgrupo', entidadeId: s.id, acao: 'CRIACAO', usuarioId: sessao.id, detalhes: { codigo: s.codigo, nome: s.nome, grupoId: s.grupoId } })
      return s
    })
    return NextResponse.json({ subgrupo }, { status: 201 })
  } catch (e) {
    return respostaErro(e)
  }
}
