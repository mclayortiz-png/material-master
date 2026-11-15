import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { respostaErro } from '@/lib/authz'
import { usuarioSchema } from '@/lib/validacoes'

export const dynamic = 'force-dynamic'

/** Autocadastro público: cria sempre uma conta com perfil CONSULTA (somente leitura). Perfis superiores são atribuídos por um Administrador. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const dados = usuarioSchema.omit({ perfil: true }).parse(body ?? {})
    const existe = await prisma.user.findUnique({ where: { email: dados.email } })
    if (existe) return NextResponse.json({ erro: 'Já existe uma conta com este e-mail.' }, { status: 409 })
    const hash = await bcrypt.hash(dados.password, 10)
    const user = await prisma.user.create({
      data: { name: dados.name, email: dados.email, password: hash, perfil: 'CONSULTA' },
    })
    await prisma.auditLog.create({ data: { entidade: 'User', entidadeId: user.id, acao: 'CRIACAO', usuarioId: user.id, detalhes: { origem: 'autocadastro' } } })
    return NextResponse.json({ ok: true, usuario: { id: user.id, name: user.name, email: user.email, perfil: user.perfil } }, { status: 201 })
  } catch (e) {
    return respostaErro(e)
  }
}
