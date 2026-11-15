import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { exigirSessao, respostaErro } from '@/lib/authz'
import { usuarioSchema } from '@/lib/validacoes'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const USER_SELECT = { id: true, name: true, email: true, perfil: true, ativo: true, createdAt: true, updatedAt: true }

export async function GET() {
  try {
    await exigirSessao(['ADMINISTRADOR'])
    const usuarios = await prisma.user.findMany({ select: USER_SELECT, orderBy: { name: 'asc' } })
    return NextResponse.json({ usuarios: usuarios ?? [] })
  } catch (e) {
    return respostaErro(e)
  }
}

export async function POST(req: Request) {
  try {
    const sessao = await exigirSessao(['ADMINISTRADOR'])
    const dados = usuarioSchema.parse((await req.json().catch(() => ({}))) ?? {})
    const existe = await prisma.user.findUnique({ where: { email: dados.email } })
    if (existe) return NextResponse.json({ erro: 'Já existe um usuário com este e-mail.', campos: { email: 'E-mail já cadastrado.' } }, { status: 409 })
    const hash = await bcrypt.hash(dados.password, 10)
    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { name: dados.name, email: dados.email, password: hash, perfil: dados.perfil }, select: USER_SELECT })
      await registrarAuditoria(tx, { entidade: 'User', entidadeId: u.id, acao: 'CRIACAO', usuarioId: sessao.id, detalhes: { email: u.email, perfil: u.perfil } })
      return u
    })
    return NextResponse.json({ usuario }, { status: 201 })
  } catch (e) {
    return respostaErro(e)
  }
}
