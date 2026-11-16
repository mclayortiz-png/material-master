import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Verificador auxiliar de credenciais desativado por seguranca.
 * Antes aceitava senhas ilimitadas e devolvia dados de usuarios sem criar sessao.
 * O login da interface continua sendo processado pelo Auth.js.
 */
export async function POST() {
  return NextResponse.json(
    { erro: 'Endpoint auxiliar desativado. Utilize a pagina de login.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  )
}
