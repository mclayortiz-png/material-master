import type { Perfil } from '@prisma/client'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      perfil: Perfil
    } & DefaultSession['user']
  }
  interface User {
    perfil?: Perfil
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    perfil?: Perfil
  }
}
