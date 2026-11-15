import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import type { Perfil } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credenciais',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.ativo) return null
        const ok = await bcrypt.compare(password, user.password ?? '')
        if (!ok) return null
        try {
          await prisma.auditLog.create({
            data: { entidade: 'User', entidadeId: user.id, acao: 'LOGIN', usuarioId: user.id },
          })
        } catch {
          // auditoria de login não deve impedir o acesso
        }
        return { id: user.id, email: user.email, name: user.name, perfil: user.perfil }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string })?.id ?? token.sub
      }

      // Revalida o usuário em toda consulta de sessão para aplicar mudanças de perfil.
      // Conta inativa ou removida invalida o JWT; não reutilizar permissões antigas.
      const id = typeof token.id === 'string' && token.id ? token.id : token.sub
      if (!id) return null

      const atual = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, perfil: true, ativo: true },
      })
      if (!atual?.ativo) return null

      token.id = atual.id
      token.perfil = atual.perfil
      token.name = atual.name
      token.email = atual.email
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = (token?.id as string) ?? (token?.sub as string) ?? ''
        session.user.perfil = (token?.perfil as Perfil) ?? 'CONSULTA'
      }
      return session
    },
  },
})
