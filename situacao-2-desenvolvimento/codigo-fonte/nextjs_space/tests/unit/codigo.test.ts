import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ prisma: { $transaction: vi.fn() } }))

import { gerarProximoCodigo, gerarCodigoMaterial, PREFIXO_MATERIAL } from '@/lib/codigo'
import { prisma } from '@/lib/db'

/** Transação simulada: guarda a sequência em memória e registra as consultas executadas. */
function txSimulada(inicial: Record<string, number> = {}) {
  const seq: Record<string, number> = { ...inicial }
  const sqls: string[] = []
  const tx = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...valores: unknown[]) => {
      sqls.push(strings.join('?'))
      const prefixo = String(valores[0])
      if (!(prefixo in seq)) seq[prefixo] = 0 // ON CONFLICT DO NOTHING
      return 1
    }),
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...valores: unknown[]) => {
      sqls.push(strings.join('?'))
      const prefixo = String(valores[0])
      seq[prefixo] = (seq[prefixo] ?? 0) + 1
      return [{ ultimo: seq[prefixo] }]
    }),
  }
  return { tx: tx as never, seq, sqls }
}

beforeEach(() => vi.clearAllMocks())

describe('gerarProximoCodigo', () => {
  it('gera MAT-000001 na primeira chamada e incrementa sequencialmente', async () => {
    const { tx } = txSimulada()
    expect(await gerarProximoCodigo(tx)).toBe('MAT-000001')
    expect(await gerarProximoCodigo(tx)).toBe('MAT-000002')
    expect(await gerarProximoCodigo(tx)).toBe('MAT-000003')
  })

  it('preenche com zeros à esquerda até 6 dígitos', async () => {
    const { tx } = txSimulada({ MAT: 41 })
    expect(await gerarProximoCodigo(tx)).toBe('MAT-000042')
    const { tx: tx2 } = txSimulada({ MAT: 999998 })
    expect(await gerarProximoCodigo(tx2)).toBe('MAT-999999')
  })

  it('não trunca sequências acima de 6 dígitos', async () => {
    const { tx } = txSimulada({ MAT: 1_000_000 })
    expect(await gerarProximoCodigo(tx)).toBe('MAT-1000001')
  })

  it('usa o prefixo informado e mantém sequências independentes por prefixo', async () => {
    const { tx } = txSimulada()
    expect(await gerarProximoCodigo(tx, 'SRV')).toBe('SRV-000001')
    expect(await gerarProximoCodigo(tx)).toBe('MAT-000001')
    expect(await gerarProximoCodigo(tx, 'SRV')).toBe('SRV-000002')
    expect(PREFIXO_MATERIAL).toBe('MAT')
  })

  it('executa INSERT ... ON CONFLICT DO NOTHING seguido de UPDATE ... RETURNING (atomicidade por linha)', async () => {
    const { tx, sqls } = txSimulada()
    await gerarProximoCodigo(tx)
    expect(sqls).toHaveLength(2)
    expect(sqls[0]).toMatch(/INSERT INTO "CodigoSequencia".*ON CONFLICT \("prefixo"\) DO NOTHING/s)
    expect(sqls[1]).toMatch(/UPDATE "CodigoSequencia" SET "ultimo" = "ultimo" \+ 1 WHERE "prefixo" = \? RETURNING "ultimo"/s)
  })

  it('lança erro em pt-BR se a sequência não devolver um valor', async () => {
    const tx = { $executeRaw: vi.fn(async () => 1), $queryRaw: vi.fn(async () => []) } as never
    await expect(gerarProximoCodigo(tx)).rejects.toThrow('Falha ao gerar código do material.')
  })
})

describe('gerarCodigoMaterial', () => {
  it('abre uma transação própria e delega para gerarProximoCodigo', async () => {
    const { tx } = txSimulada({ MAT: 7 })
    vi.mocked(prisma.$transaction).mockImplementation((async (fn: (t: unknown) => Promise<string>) => fn(tx)) as never)
    await expect(gerarCodigoMaterial()).resolves.toBe('MAT-000008')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
