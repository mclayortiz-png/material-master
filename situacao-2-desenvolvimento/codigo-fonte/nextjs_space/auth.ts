import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import type { Perfil } from '@prisma/client'
import { AuthRateLimitError, enforceAuthRateLimit } from '@/lib/auth-rate-limit'

class TooManyAttempts extends CredentialsSignin {
  code = 'too_many_attempts'
}

// Mesmo custo de bcrypt para contas inexistentes/inativas, sem revelar qual conta existe.
const DUMMY_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

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
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? '').trim().toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || email.length > 254 || !password || password.length > 100) return null
        try {
          await enforceAuthRateLimit('login', email, request.headers)
        } catch (error) {
          if (error instanceof AuthRateLimitError) throw new TooManyAttempts()
          throw error
        }
        const user = await prisma.user.findUnique({ where: { email } })
        const ok = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH)
        if (!ok || !user?.ativo) return null
        try {
          await prisma.auditLog.create({
            data: { entidade: 'User', entidadeId: user.id, acao: 'LOGIN', usuarioId: user.id },
          })
        } catch {
          // auditoria de login não deve impedir o acesso
        }
        return { id: user.id, email: user.email, name: user.name, perfil: user.perfil, sessionVersion: user.sessionVersion }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string })?.id ?? token.sub
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion
      }

      // Revalida o usuário em toda consulta de sessão para aplicar mudanças de perfil.
      // Conta inativa ou removida invalida o JWT; não reutilizar permissões antigas.
      const id = typeof token.id === 'string' && token.id ? token.id : token.sub
      if (!id) return null

      const atual = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, perfil: true, ativo: true, sessionVersion: true },
      })
      if (!atual?.ativo || token.sessionVersion !== atual.sessionVersion) return null

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
