import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ prisma: {} }))
import { chavesLogin, LIMITES_LOGIN } from '@/lib/login-rate-limit'

const secret = 'segredo-de-teste-para-hmac-mais-de-32-caracteres'
const originalSecret = process.env.AUTH_SECRET
const originalTrust = process.env.AUTH_TRUST_PROXY_HEADERS

beforeEach(() => {
  process.env.AUTH_SECRET = secret
  delete process.env.AUTH_TRUST_PROXY_HEADERS
})
afterEach(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET
  else process.env.AUTH_SECRET = originalSecret
  if (originalTrust === undefined) delete process.env.AUTH_TRUST_PROXY_HEADERS
  else process.env.AUTH_TRUST_PROXY_HEADERS = originalTrust
})

describe('Protecao de tentativas de login', () => {
  it('sempre limita por conta, sem depender de cabecalhos de IP nao confiaveis', () => {
    const r = new Request('https://example.test/api/auth/callback/credentials', {
      headers: { 'x-real-ip': '198.51.100.22', 'x-forwarded-for': '198.51.100.90' },
    })
    const chaves = chavesLogin('  TESTE@EXAMPLE.COM ', r)
    expect(chaves).toHaveLength(1)
    expect(chaves[0].limite).toBe(LIMITES_LOGIN.porConta)
    expect(chaves[0].key).not.toContain('@')
    expect(chaves[0].key).not.toContain('198.51.100')
  })

  it('normaliza a conta e gera chaves estaveis, sem revelar emails', () => {
    const r = new Request('https://example.test/')
    const a = chavesLogin(' TESTE@example.COM ', r)
    const b = chavesLogin('teste@example.com', r)
    expect(a).toEqual(b)
    expect(a[0].key).toMatch(/^a:[a-f0-9]{64}$/)
  })

  it('quando o proxy e confiavel, aplica limites por conta+IP e por IP', () => {
    process.env.AUTH_TRUST_PROXY_HEADERS = 'true'
    const a = chavesLogin('a@example.com', new Request('https://example.test/', { headers: { 'x-real-ip': '198.51.100.1' } }))
    const b = chavesLogin('b@example.com', new Request('https://example.test/', { headers: { 'x-real-ip': '198.51.100.1' } }))
    expect(a).toHaveLength(3)
    expect(a[1].limite).toBe(5)
    expect(a[2].limite).toBe(60)
    expect(a[0].key).not.toBe(b[0].key)
    expect(a[2].key).toBe(b[2].key)
  })

  it('ignora cabecalho de IP invalido mesmo se o proxy foi habilitado', () => {
    process.env.AUTH_TRUST_PROXY_HEADERS = 'true'
    const r = new Request('https://example.test/', { headers: { 'x-real-ip': 'usuario-falso' } })
    expect(chavesLogin('a@example.com', r)).toHaveLength(1)
  })

  it('nao opera sem segredo de autenticacao adequado', () => {
    process.env.AUTH_SECRET = 'curto'
    const otherSecret = process.env.NEXTAUTH_SECRET
    delete process.env.NEXTAUTH_SECRET
    try {
      expect(() => chavesLogin('a@example.com', new Request('https://example.test/'))).toThrow(/curto/)
    } finally {
      if (otherSecret !== undefined) process.env.NEXTAUTH_SECRET = otherSecret
    }
  })
})
