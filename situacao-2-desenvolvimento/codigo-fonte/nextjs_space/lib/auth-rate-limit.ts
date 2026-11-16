import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { prisma } from '@/lib/db'

const WINDOW_MS = 15 * 60 * 1000

export class AuthRateLimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
  }
}

function privateKey(action: string, scope: string, value: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET é obrigatório para proteger a autenticação.')
  return createHmac('sha256', secret).update(JSON.stringify([action, scope, value])).digest('hex')
}

/** Só usar um cabeçalho que o proxy de entrada SOBRESCREVA, nunca um valor livre do cliente. */
function trustedClientIp(headers: Headers): string | null {
  const header = process.env.AUTH_TRUSTED_IP_HEADER?.trim().toLowerCase()
  if (!header) return null
  const value = headers.get(header)?.trim() ?? ''
  // Uma lista X-Forwarded-For sem uma topologia confiável não identifica o cliente.
  return isIP(value) ? value : null
}

async function consume(key: string, limit: number) {
  // O UPSERT é atômico no PostgreSQL, inclusive com múltiplas instâncias do app.
  // Satura o contador para impedir overflow e não estende a janela em tentativas bloqueadas.
  const [row] = await prisma.$queryRaw<Array<{ attempts: number; retryAfter: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, timezone('UTC', CURRENT_TIMESTAMP) + (${WINDOW_MS} * INTERVAL '1 millisecond'))
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."expiresAt" <= timezone('UTC', CURRENT_TIMESTAMP) THEN 1
        ELSE LEAST("AuthRateLimit"."attempts" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= timezone('UTC', CURRENT_TIMESTAMP)
        THEN timezone('UTC', CURRENT_TIMESTAMP) + (${WINDOW_MS} * INTERVAL '1 millisecond')
        ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "attempts",
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - timezone('UTC', CURRENT_TIMESTAMP)))))::int AS "retryAfter"
  `
  if (row.attempts > limit) throw new AuthRateLimitError(row.retryAfter)
  return row.attempts
}

/** Reserva antes da consulta de usuário/bcrypt; falhas no armazenamento não liberam o acesso. */
export async function enforceAuthRateLimit(action: 'login' | 'signup', email: string, headers: Headers) {
  const login = action === 'login'
  const globalKey = privateKey(action, 'global', 'all')
  const globalLimit = login ? 1000 : 100
  // Se a cota global já acabou, não crie novas chaves arbitrárias no armazenamento.
  const global = await prisma.authRateLimit.findUnique({ where: { key: globalKey } })
  if (global && global.attempts > globalLimit && global.expiresAt.getTime() > Date.now()) {
    throw new AuthRateLimitError(Math.max(1, Math.ceil((global.expiresAt.getTime() - Date.now()) / 1000)))
  }
  const ip = trustedClientIp(headers)
  if (ip) await consume(privateKey(action, 'ip', ip), login ? 30 : 5)
  await consume(privateKey(action, 'account', email.trim().toLowerCase()), login ? 10 : 3)
  // Tentativas já recusadas por IP/conta não podem esgotar a cota dos demais usuários.
  const first = await consume(globalKey, globalLimit)
  if (first === 1) {
    await prisma.authRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
  }
}
