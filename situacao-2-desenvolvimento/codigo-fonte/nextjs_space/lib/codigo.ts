import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export const PREFIXO_MATERIAL = 'MAT'

type Tx = Prisma.TransactionClient

/**
 * Gera o próximo código de forma atômica usando uma linha de sequência por prefixo.
 * O UPDATE ... RETURNING bloqueia a linha e garante ausência de colisões mesmo com concorrência.
 * Formato: MAT-000001
 */
export async function gerarProximoCodigo(tx: Tx, prefixo: string = PREFIXO_MATERIAL): Promise<string> {
  const p = prefixo ?? PREFIXO_MATERIAL
  await tx.$executeRaw`INSERT INTO "CodigoSequencia" ("prefixo", "ultimo") VALUES (${p}, 0) ON CONFLICT ("prefixo") DO NOTHING`
  const rows = await tx.$queryRaw<Array<{ ultimo: number }>>`UPDATE "CodigoSequencia" SET "ultimo" = "ultimo" + 1 WHERE "prefixo" = ${p} RETURNING "ultimo"`
  const n = Number(rows?.[0]?.ultimo ?? 0)
  if (!n) throw new Error('Falha ao gerar código do material.')
  return `${p}-${String(n).padStart(6, '0')}`
}

/** Atalho para uso fora de transações (abre uma própria). */
export async function gerarCodigoMaterial(): Promise<string> {
  return prisma.$transaction((tx) => gerarProximoCodigo(tx))
}
