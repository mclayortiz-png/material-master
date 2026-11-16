import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * Limitacao persistente/atomica de tentativas de login (Auth.js).
 *
 * - 20 tentativas/15 min por conta, SEM depender da identificacao de IP.
 * - Quando AUTH_TRUST_PROXY_HEADERS=true e o ultimo proxy for confiavel:
 *   5 tentativas/15 min por conta+IP e 60 por IP.
 * - Chaves sao HMAC-SHA256; nem emails nem IPs sao armazenados em texto puro.
 * - Uma instrução INSERT .. ON CONFLICT atualiza cada contador atomicamente.
 * - Falhas de banco/segredo negam autenticação; nao ha fallback inseguro em memoria.
 *
 * IMPORTANTE: a aplicacao so deve confiar nos cabecalhos de IP se o proxy de
 * hospedagem os substituir/sanitizar. A protecao por conta continua ativa.
 */
const WINDOW_MINUTES = 15
const MAX_ACCOUNT = 20
const MAX_PAIR = 5
const MAX_IP = 60

function hash(value: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 24) {
    throw new Error('AUTH_SECRET/NEXTAUTH_SECRET ausente ou muito curto para limitacao de login')
  }
  return createHmac('sha256', secret).update(value).digest('hex')
}

function origemConfiavel(request: Request): string | null {
  if (process.env.AUTH_TRUST_PROXY_HEADERS !== 'true') return null
  const h = request.headers
  // Somente habilitar depois de confirmar que o proxy remove headers fornecidos pelo cliente.
  const value = h.get('cf-connecting-ip') || h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',').at(-1)?.trim() || ''
  const ip = value.trim()
  return isIP(ip) ? ip : null
}

export function chavesLogin(email: string, request: Request): Array<{ key: string; limite: number }> {
  const conta = email.trim().toLowerCase()
  const ip = origemConfiavel(request)
  const keys = [{ key: 'a:' + hash('account:' + conta), limite: MAX_ACCOUNT }]
  if (ip) {
    keys.push({ key: 'p:' + hash('pair:' + conta + ':' + ip), limite: MAX_PAIR })
    keys.push({ key: 'i:' + hash('ip:' + ip), limite: MAX_IP })
  }
  return keys
}

export async function reservarTentativaLogin(email: string, request: Request): Promise<boolean> {
  const chaves = chavesLogin(email, request)
  return prisma.$transaction(async (tx) => {
    let permitido = true
    for (const { key, limite } of chaves) {
      // Executado no PostgreSQL para manter a contagem correta sob concorrencia.
      const rows = await tx.$queryRaw<Array<{ attempts: number }>>(Prisma.sql`
        INSERT INTO "LoginRateLimit" ("key", "attempts", "windowStart", "updatedAt")
        VALUES (${key}, 1, NOW(), NOW())
        ON CONFLICT ("key") DO UPDATE
        SET "attempts" = CASE
              WHEN "LoginRateLimit"."windowStart" <= NOW() - INTERVAL '15 minutes'
                THEN 1
              ELSE "LoginRateLimit"."attempts" + 1
            END,
            "windowStart" = CASE
              WHEN "LoginRateLimit"."windowStart" <= NOW() - INTERVAL '15 minutes'
                THEN NOW()
              ELSE "LoginRateLimit"."windowStart"
            END,
            "updatedAt" = NOW()
        RETURNING "attempts"
      `)
      if (!rows[0] || rows[0].attempts > limite) permitido = false
    }
    return permitido
  })
}

export async function limparTentativasLogin(email: string, request: Request): Promise<void> {
  // Login bem-sucedido limpa penalidade da conta e da combinacao conta+IP.
  // Nao apaga o contador global de IP (evita que uma conta legitima zere ataques).
  const keys = chavesLogin(email, request).filter((item) => !item.key.startsWith('i:')).map((item) => item.key)
  await prisma.loginRateLimit.deleteMany({ where: { key: { in: keys } } })
}

export const LIMITES_LOGIN = { janelaMinutos: WINDOW_MINUTES, porConta: MAX_ACCOUNT, porContaIp: MAX_PAIR, porIp: MAX_IP } as const
