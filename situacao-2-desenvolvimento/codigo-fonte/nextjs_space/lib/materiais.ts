import type { Prisma } from '@prisma/client'

export const MATERIAL_INCLUDE = {
  unidadeMedida: { select: { id: true, sigla: true, nome: true } },
  familia: { select: { id: true, codigo: true, nome: true } },
  grupo: { select: { id: true, codigo: true, nome: true } },
  subgrupo: { select: { id: true, codigo: true, nome: true } },
  criadoPor: { select: { id: true, name: true } },
  atualizadoPor: { select: { id: true, name: true } },
} satisfies Prisma.MaterialInclude

export type MaterialCompleto = Prisma.MaterialGetPayload<{ include: typeof MATERIAL_INCLUDE }>
