import { NextResponse } from 'next/server'
import type { Prisma, StatusMaterial } from '@prisma/client'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { materialSchema } from '@/lib/validacoes'
import { gerarProximoCodigo } from '@/lib/codigo'
import { registrarAuditoria } from '@/lib/audit'
import { validarHierarquia } from '@/lib/hierarquia'
import { MATERIAL_INCLUDE } from '@/lib/materiais'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await exigirSessao()
    const sp = new URL(req.url).searchParams
    const q = (sp.get('q') ?? '').trim()
    const familiaId = sp.get('familiaId') ?? ''
    const grupoId = sp.get('grupoId') ?? ''
    const subgrupoId = sp.get('subgrupoId') ?? ''
    const status = sp.get('status') ?? ''
    const page = Math.max(1, Number(sp.get('page') ?? 1) || 1)
    const pageSize = Math.min(100, Math.max(5, Number(sp.get('pageSize') ?? 10) || 10))

    const where: Prisma.MaterialWhereInput = {}
    if (q) {
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { descricaoCurta: { contains: q, mode: 'insensitive' } },
        { descricaoLonga: { contains: q, mode: 'insensitive' } },
        { fabricante: { contains: q, mode: 'insensitive' } },
        { partNumber: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (familiaId) where.familiaId = familiaId
    if (grupoId) where.grupoId = grupoId
    if (subgrupoId) where.subgrupoId = subgrupoId
    if (status === 'ATIVO' || status === 'INATIVO') where.status = status as StatusMaterial

    const [total, itens] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        include: MATERIAL_INCLUDE,
        orderBy: { codigo: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    return NextResponse.json({ itens: itens ?? [], total: total ?? 0, page, pageSize, totalPaginas: Math.max(1, Math.ceil((total ?? 0) / pageSize)) })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function POST(req: Request) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR', 'GESTOR_CADASTRO'])
    const body = await req.json().catch(() => ({}))
    const dados = materialSchema.parse(body ?? {})
    const erroHier = await validarHierarquia(dados.familiaId, dados.grupoId, dados.subgrupoId, dados.unidadeMedidaId)
    if (erroHier) return NextResponse.json({ erro: erroHier }, { status: 400 })

    const material = await prisma.$transaction(async (tx) => {
      const codigo = await gerarProximoCodigo(tx)
      const m = await tx.material.create({
        data: { ...dados, codigo, criadoPorId: sessao.id, status: 'ATIVO' },
        include: MATERIAL_INCLUDE,
      })
      await registrarAuditoria(tx, { entidade: 'Material', entidadeId: m.id, acao: 'CRIACAO', usuarioId: sessao.id, detalhes: { codigo, descricaoCurta: m.descricaoCurta } })
      return m
    })
    return NextResponse.json({ material }, { status: 201 })
  } catch (e) {
    return respostaErro(e)
  }
}
