import type { AcaoAuditoria, Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

export async function registrarAuditoria(
  tx: Tx,
  params: { entidade: string; entidadeId: string; acao: AcaoAuditoria; usuarioId: string; detalhes?: Prisma.InputJsonValue },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entidade: params?.entidade ?? '',
      entidadeId: params?.entidadeId ?? '',
      acao: params?.acao ?? 'EDICAO',
      usuarioId: params?.usuarioId ?? '',
      detalhes: params?.detalhes,
    },
  })
}
