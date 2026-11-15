import { prisma } from '@/lib/db'

/** Verifica consistência Família -> Grupo -> Subgrupo e existência da unidade. Retorna mensagem de erro ou null. */
export async function validarHierarquia(familiaId: string, grupoId: string, subgrupoId: string, unidadeMedidaId: string): Promise<string | null> {
  const [familia, grupo, subgrupo, unidade] = await Promise.all([
    prisma.familia.findUnique({ where: { id: familiaId ?? '' } }),
    prisma.grupo.findUnique({ where: { id: grupoId ?? '' } }),
    prisma.subgrupo.findUnique({ where: { id: subgrupoId ?? '' } }),
    prisma.unidadeMedida.findUnique({ where: { id: unidadeMedidaId ?? '' } }),
  ])
  if (!familia) return 'Família não encontrada.'
  if (!familia.ativo) return 'A família selecionada está inativa.'
  if (!grupo) return 'Grupo não encontrado.'
  if (grupo.familiaId !== familia.id) return 'O grupo selecionado não pertence à família informada.'
  if (!grupo.ativo) return 'O grupo selecionado está inativo.'
  if (!subgrupo) return 'Subgrupo não encontrado.'
  if (subgrupo.grupoId !== grupo.id) return 'O subgrupo selecionado não pertence ao grupo informado.'
  if (!subgrupo.ativo) return 'O subgrupo selecionado está inativo.'
  if (!unidade || !unidade.ativo) return 'Unidade de medida inválida.'
  return null
}
