import { describe, it, expect, vi, beforeEach } from 'vitest'

// Dublê do acesso a dados: nenhum banco é tocado nos testes unitários.
const db = vi.hoisted(() => ({
  familia: { findUnique: vi.fn() },
  grupo: { findUnique: vi.fn() },
  subgrupo: { findUnique: vi.fn() },
  unidadeMedida: { findUnique: vi.fn() },
}))
vi.mock('@/lib/db', () => ({ prisma: db }))

import { validarHierarquia } from '@/lib/hierarquia'

const familia = { id: 'F1', ativo: true }
const grupo = { id: 'G1', familiaId: 'F1', ativo: true }
const subgrupo = { id: 'S1', grupoId: 'G1', ativo: true }
const unidade = { id: 'U1', ativo: true }

function cenario(o: { familia?: unknown; grupo?: unknown; subgrupo?: unknown; unidade?: unknown }) {
  db.familia.findUnique.mockResolvedValue('familia' in o ? o.familia : familia)
  db.grupo.findUnique.mockResolvedValue('grupo' in o ? o.grupo : grupo)
  db.subgrupo.findUnique.mockResolvedValue('subgrupo' in o ? o.subgrupo : subgrupo)
  db.unidadeMedida.findUnique.mockResolvedValue('unidade' in o ? o.unidade : unidade)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('validarHierarquia', () => {
  it('retorna null quando Família → Grupo → Subgrupo são coerentes e ativos', async () => {
    cenario({})
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBeNull()
  })

  it('família inexistente ou inativa', async () => {
    cenario({ familia: null })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('Família não encontrada.')
    cenario({ familia: { ...familia, ativo: false } })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('A família selecionada está inativa.')
  })

  it('grupo inexistente, de outra família ou inativo', async () => {
    cenario({ grupo: null })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('Grupo não encontrado.')
    cenario({ grupo: { ...grupo, familiaId: 'F2' } })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('O grupo selecionado não pertence à família informada.')
    cenario({ grupo: { ...grupo, ativo: false } })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('O grupo selecionado está inativo.')
  })

  it('subgrupo inexistente, de outro grupo ou inativo', async () => {
    cenario({ subgrupo: null })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('Subgrupo não encontrado.')
    cenario({ subgrupo: { ...subgrupo, grupoId: 'G2' } })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('O subgrupo selecionado não pertence ao grupo informado.')
    cenario({ subgrupo: { ...subgrupo, ativo: false } })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('O subgrupo selecionado está inativo.')
  })

  it('unidade de medida inexistente ou inativa', async () => {
    cenario({ unidade: null })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('Unidade de medida inválida.')
    cenario({ unidade: { ...unidade, ativo: false } })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('Unidade de medida inválida.')
  })

  it('ordem de precedência: problema na família é reportado antes do grupo e do subgrupo', async () => {
    cenario({ familia: { ...familia, ativo: false }, grupo: null, subgrupo: null })
    await expect(validarHierarquia('F1', 'G1', 'S1', 'U1')).resolves.toBe('A família selecionada está inativa.')
  })

  it('ids ausentes são consultados como string vazia (não lança exceção)', async () => {
    cenario({ familia: null })
    // @ts-expect-error cenário defensivo: chamada com valores indefinidos
    await expect(validarHierarquia(undefined, undefined, undefined, undefined)).resolves.toBe('Família não encontrada.')
    expect(db.familia.findUnique).toHaveBeenCalledWith({ where: { id: '' } })
  })
})
