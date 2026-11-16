import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { Perfil } from '@prisma/client'

export type SessaoUsuario = { id: string; nome: string; email: string; perfil: Perfil }

export { PERFIS, PERFIL_LABEL, podeGerenciarMateriais, podeAdministrar } from '@/lib/perfis'

export class ErroAutorizacao extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Obtém a sessão atual ou lança 401. Opcionalmente exige um dos perfis (403). */
export async function exigirSessao(perfisPermitidos?: Perfil[]): Promise<SessaoUsuario> {
  const session = await auth()
  const u = session?.user
  if (!u?.id) throw new ErroAutorizacao('Não autenticado. Faça login para continuar.', 401)
  const perfil = (u?.perfil ?? 'CONSULTA') as Perfil
  if (perfisPermitidos?.length && !perfisPermitidos.includes(perfil)) {
    throw new ErroAutorizacao('Você não tem permissão para executar esta ação.', 403)
  }
  return { id: u.id, nome: u.name ?? '', email: u.email ?? '', perfil }
}

/** Converte erros em respostas JSON padronizadas (pt-BR). */
export function respostaErro(err: unknown): NextResponse {
  if (err instanceof ErroAutorizacao) {
    return NextResponse.json({ erro: err.message }, { status: err.status })
  }
  if (err && typeof err === 'object' && 'issues' in (err as Record<string, unknown>)) {
    const issues = ((err as { issues?: Array<{ path?: Array<string | number>; message?: string }> })?.issues ?? [])
    const campos: Record<string, string> = {}
    for (const i of issues) {
      const k = String(i?.path?.[0] ?? 'geral')
      if (!campos[k]) campos[k] = i?.message ?? 'Valor inválido'
    }
    return NextResponse.json({ erro: 'Dados inválidos. Verifique os campos destacados.', campos }, { status: 400 })
  }
  console.error('[API]', err)
  return NextResponse.json({ erro: 'Erro interno. Tente novamente mais tarde.' }, { status: 500 })
}
