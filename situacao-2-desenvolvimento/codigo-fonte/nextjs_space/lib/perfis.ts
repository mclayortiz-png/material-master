import type { Perfil } from '@prisma/client'

export const PERFIS: Perfil[] = ['ADMINISTRADOR', 'GESTOR_CADASTRO', 'CONSULTA']

export const PERFIL_LABEL: Record<Perfil, string> = {
  ADMINISTRADOR: 'Administrador',
  GESTOR_CADASTRO: 'Gestor de Cadastro',
  CONSULTA: 'Consulta',
}

/** Regras de permissão centralizadas (puras — podem ser usadas no cliente e no servidor). */
export const podeGerenciarMateriais = (perfil?: Perfil | null): boolean =>
  perfil === 'ADMINISTRADOR' || perfil === 'GESTOR_CADASTRO'

export const podeAdministrar = (perfil?: Perfil | null): boolean => perfil === 'ADMINISTRADOR'
