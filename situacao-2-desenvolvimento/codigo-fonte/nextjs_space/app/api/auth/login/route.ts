import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Valida credenciais (usado para verificações/automação). O login da interface usa signIn() do Auth.js. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string }
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    if (!email || !password) return NextResponse.json({ erro: 'Informe e-mail e senha.' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.ativo || !(await bcrypt.compare(password, user.password ?? ''))) {
      return NextResponse.json({ erro: 'E-mail ou senha inválidos.' }, { status: 401 })
    }
    return NextResponse.json({ ok: true, usuario: { id: user.id, name: user.name, email: user.email, perfil: user.perfil } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ erro: 'Erro ao validar credenciais.' }, { status: 500 })
  }
}
