import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { usuarioEdicaoSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const USER_SELECT = { id: true, name: true, email: true, perfil: true, ativo: true, createdAt: true, updatedAt: true }

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const { id } = await ctx.params
    const atual = await prisma.user.findUnique({ where: { id: id ?? '' } })
    if (!atual) return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 })
    const dados = usuarioEdicaoSchema.parse((await req.json().catch(() => ({}))) ?? {})

    if (atual.id === sessao.id) {
      if (dados.ativo === false) return NextResponse.json({ erro: 'Você não pode inativar a sua própria conta.' }, { status: 400 })
      if (dados.perfil && dados.perfil !== 'ADMINISTRADOR') return NextResponse.json({ erro: 'Você não pode remover o seu próprio perfil de Administrador.' }, { status: 400 })
    }
    if ((dados.ativo === false || (dados.perfil && dados.perfil !== 'ADMINISTRADOR')) && atual.perfil === 'ADMINISTRADOR' && atual.ativo) {
      const admins = await prisma.user.count({ where: { perfil: 'ADMINISTRADOR', ativo: true } })
      if (admins <= 1) return NextResponse.json({ erro: 'Deve existir ao menos um Administrador ativo no sistema.' }, { status: 400 })
    }

    const data: { name?: string; perfil?: typeof atual.perfil; ativo?: boolean; password?: string; sessionVersion?: { increment: number } } = {}
    if (dados.name) data.name = dados.name
    if (dados.perfil) data.perfil = dados.perfil
    if (typeof dados.ativo === 'boolean') data.ativo = dados.ativo
    if (dados.password) data.password = await bcrypt.hash(dados.password, 10)
    if (dados.password || dados.ativo === false) {
      data.sessionVersion = { increment: 1 }
    }

    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id }, data, select: USER_SELECT })
      const acao = typeof dados.ativo === 'boolean' && dados.ativo !== atual.ativo ? (dados.ativo ? 'REATIVACAO' : 'INATIVACAO') : 'EDICAO'
      await registrarAuditoria(tx, { entidade: 'User', entidadeId: id, acao, usuarioId: sessao.id, detalhes: { name: data.name, perfil: data.perfil, ativo: data.ativo, senhaAlterada: Boolean(data.password) } })
      return u
    })
    return NextResponse.json({ usuario })
  } catch (e) {
    return respostaErro(e)
  }
}
