import type { Perfil, StatusMaterial, AcaoAuditoria } from '@prisma/client'

export type FamiliaDto = { id: string; codigo: string; nome: string; ativo: boolean; _count?: { grupos: number; materiais: number } }
export type GrupoDto = { id: string; codigo: string; nome: string; ativo: boolean; familiaId: string; familia?: { id: string; codigo: string; nome: string }; _count?: { subgrupos: number; materiais: number } }
export type SubgrupoDto = { id: string; codigo: string; nome: string; ativo: boolean; grupoId: string; grupo?: { id: string; codigo: string; nome: string; familia?: { id: string; codigo: string; nome: string } }; _count?: { materiais: number } }
export type UnidadeDto = { id: string; sigla: string; nome: string }

export type MaterialDto = {
  id: string
  codigo: string
  descricaoCurta: string
  descricaoLonga: string | null
  unidadeMedidaId: string
  familiaId: string
  grupoId: string
  subgrupoId: string
  fabricante: string | null
  partNumber: string | null
  ncm: string | null
  status: StatusMaterial
  createdAt: string | Date
  updatedAt: string | Date
  unidadeMedida?: { id: string; sigla: string; nome: string }
  familia?: { id: string; codigo: string; nome: string }
  grupo?: { id: string; codigo: string; nome: string }
  subgrupo?: { id: string; codigo: string; nome: string }
  criadoPor?: { id: string; name: string } | null
  atualizadoPor?: { id: string; name: string } | null
}

export type HistoricoDto = { id: string; acao: AcaoAuditoria; detalhes: unknown; createdAt: string | Date; usuario?: { name: string } | null }

export type UsuarioDto = { id: string; name: string; email: string; perfil: Perfil; ativo: boolean; createdAt: string | Date }

export const ACAO_LABEL: Record<string, string> = { CRIACAO: 'Criação', EDICAO: 'Edição', INATIVACAO: 'Inativação', REATIVACAO: 'Reativação', LOGIN: 'Login' }

export const CAMPO_LABEL: Record<string, string> = {
  descricaoCurta: 'Descrição curta',
  descricaoLonga: 'Descrição longa',
  unidadeMedidaId: 'Unidade de medida',
  familiaId: 'Família',
  grupoId: 'Grupo',
  subgrupoId: 'Subgrupo',
  fabricante: 'Fabricante',
  partNumber: 'Part number',
  ncm: 'NCM',
}
