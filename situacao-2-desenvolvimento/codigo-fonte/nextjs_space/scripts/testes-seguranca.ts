/** Testes destrutivos: exclusivamente PostgreSQL descartável em localhost e opt-in explícito. */
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { createHmac } from 'node:crypto'
import { usuarioSchema } from '../lib/validacoes'
import { enforceAuthRateLimit, AuthRateLimitError } from '../lib/auth-rate-limit'

const BASE = process.env.TEST_BASE || 'http://localhost:3000'
const origin = new URL(BASE).origin
const database = new URL(process.env.DATABASE_URL || '')
if (process.env.SECURITY_TEST_DISPOSABLE !== 'true' ||
    !['localhost', '127.0.0.1'].includes(database.hostname) ||
    !['localhost', '127.0.0.1'].includes(new URL(BASE).hostname) ||
    !/_(qa|ci)$/.test(database.pathname)) {
  throw new Error('Use SECURITY_TEST_DISPOSABLE=true e banco local com nome terminado em _qa ou _ci.')
}
const prisma = new PrismaClient()
const suffix = Date.now()
let passed = 0
async function test(name: string, fn: () => Promise<void> | void) {
  await fn()
  passed++
  console.log(`✓ ${name}`)
}

async function login(email: string, password: string) {
  const jar: Record<string, string> = {}
  const cookies = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
  const save = (response: Response) => {
    for (const value of response.headers.getSetCookie()) {
      const [kv] = value.split(';')
      const i = kv.indexOf('=')
      jar[kv.slice(0, i)] = kv.slice(i + 1)
    }
  }
  const csrf = await fetch(`${BASE}/api/auth/csrf`)
  save(csrf)
  const { csrfToken } = await csrf.json()
  const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST', redirect: 'manual',
    headers: { cookie: cookies(), origin, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password, csrfToken }),
  })
  save(response)
  const session = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: cookies() } })
  return { cookie: cookies(), session: (await session.json()) || {}, location: response.headers.get('location') || '' }
}

async function api(path: string, method: string, body?: unknown, cookie = '', extra: Record<string, string> = {}) {
  return fetch(`${BASE}${path}`, {
    method, headers: { origin, 'content-type': 'application/json', cookie, ...extra },
    body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
  })
}

async function main() {
  const admin = await login('admin@materialmaster.com.br', process.env.SEED_SENHA_ADMIN || 'Admin@123')
  assert.ok(admin.session.user, 'Administrador QA deve autenticar antes dos testes')

  await test('Produção envia headers, CSP sem script inline livre, nonce por resposta e HTML coerente', async () => {
    const first = await fetch(`${BASE}/login`)
    const second = await fetch(`${BASE}/login`)
    const csp = first.headers.get('content-security-policy') || ''
    assert.equal(first.headers.get('x-content-type-options'), 'nosniff')
    assert.match(first.headers.get('strict-transport-security') || '', /max-age=31536000/)
    assert.match(first.headers.get('cache-control') || '', /no-store/)
    const scriptPolicy = csp.split(';').find((p) => p.trim().startsWith('script-src')) || ''
    assert.ok(!scriptPolicy.includes('unsafe-inline') && !scriptPolicy.includes('unsafe-eval'))
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1]
    assert.ok(nonce)
    assert.notEqual(nonce, second.headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)?.[1])
    const html = await first.text()
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)]
    assert.ok(scripts.length > 1)
    assert.ok(scripts.every((s) => s[1].includes(`nonce="${nonce}"`)), 'Script sem nonce no HTML de login')
  })

  await test('Endpoint redundante não valida nem devolve perfil com senha válida', async () => {
    const response = await api('/api/auth/login', 'POST', { email: 'admin@materialmaster.com.br', password: process.env.SEED_SENHA_ADMIN || 'Admin@123' })
    assert.ok([400, 404].includes(response.status))
    const text = await response.text()
    assert.ok(!text.includes('"ok":true') && !text.includes('ADMINISTRADOR'))
  })

  await test('APIs rejeitam origem hostil, Origin ausente e text/plain mesmo com cookie admin', async () => {
    for (const headers of [{ origin: 'https://other-tenant.abacusai.app' }, { origin: '' }]) {
      const response = await api('/api/familias', 'POST', { codigo: `X${suffix}`, nome: 'CSRF deve falhar' }, admin.cookie, headers)
      assert.equal(response.status, 403)
    }
    const response = await api('/api/familias', 'POST', {}, admin.cookie, { 'content-type': 'text/plain' })
    assert.equal(response.status, 415)
  })

  await test('Novas senhas respeitam 72 bytes, incluindo UTF-8, sem truncar silenciosamente', () => {
    for (const password of ['a'.repeat(72), 'é'.repeat(36)]) {
      assert.equal(usuarioSchema.safeParse({ name: 'Teste', email: 'test@example.com', perfil: 'CONSULTA', password }).success, true)
    }
    for (const password of ['a'.repeat(73), 'é'.repeat(37)]) {
      assert.equal(usuarioSchema.safeParse({ name: 'Teste', email: 'test@example.com', perfil: 'CONSULTA', password }).success, false)
    }
  })

  await test('Reset de senha revoga JWT, senha anterior falha e nova senha autentica', async () => {
    const email = `security.reset.${suffix}@example.com`
    const response = await api('/api/usuarios', 'POST', { name: 'Segurança Reset', email, password: 'Old!12345', perfil: 'CONSULTA' }, admin.cookie)
    assert.equal(response.status, 201)
    const { usuario } = await response.json()
    const old = await login(email, 'Old!12345')
    assert.ok(old.session.user)
    assert.equal((await api(`/api/usuarios/${usuario.id}`, 'PUT', { password: 'New!12345' }, admin.cookie)).status, 200)
    assert.equal((await api('/api/materiais', 'GET', undefined, old.cookie)).status, 401)
    assert.ok(!(await login(email, 'Old!12345')).session.user)
    assert.ok((await login(email, 'New!12345')).session.user)
  })

  await test('Inativar e reativar não restaura autorização de cookie anterior', async () => {
    const email = `security.active.${suffix}@example.com`
    const response = await api('/api/usuarios', 'POST', { name: 'Segurança Ativo', email, password: 'Test!12345', perfil: 'CONSULTA' }, admin.cookie)
    const { usuario } = await response.json()
    const old = await login(email, 'Test!12345')
    assert.ok(old.session.user)
    assert.equal((await api(`/api/usuarios/${usuario.id}`, 'PUT', { ativo: false }, admin.cookie)).status, 200)
    assert.equal((await api(`/api/usuarios/${usuario.id}`, 'PUT', { ativo: true }, admin.cookie)).status, 200)
    assert.equal((await api('/api/materiais', 'GET', undefined, old.cookie)).status, 401)
    assert.ok((await login(email, 'Test!12345')).session.user)
  })

  await test('Login oficial limita conta normalizada e não libera com senha válida após dez tentativas', async () => {
    const email = `security.limit.${suffix}@example.com`
    assert.equal((await api('/api/signup', 'POST', { name: 'Segurança Limite', email, password: 'Test!12345' })).status, 201)
    for (let i = 0; i < 10; i++) {
      const result = await login(i % 2 ? email.toUpperCase() : email, 'wrong-password')
      assert.ok(!result.session.user)
      assert.ok(!result.location.includes('too_many_attempts'))
    }
    const blocked = await login(email, 'Test!12345')
    assert.ok(!blocked.session.user)
    assert.ok(blocked.location.includes('too_many_attempts'))
  })

  await test('Contador persistente admite só dez reservas concorrentes e reabre após expiração', async () => {
    const email = `security.concurrent.${suffix}@example.com`
    const attempts = await Promise.allSettled(Array.from({ length: 15 }, () => enforceAuthRateLimit('login', email, new Headers())))
    assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 10)
    assert.ok(attempts.filter((a) => a.status === 'rejected').every((a) => a.status === 'rejected' && a.reason instanceof AuthRateLimitError))
    // O outro processo (servidor HTTP) deve enxergar o bloqueio reservado por este script.
    assert.ok((await login(email, 'wrong-password')).location.includes('too_many_attempts'))
    const key = createHmac('sha256', process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '').update(JSON.stringify(['login', 'account', email])).digest('hex')
    await prisma.authRateLimit.update({ where: { key }, data: { expiresAt: new Date(Date.now() - 1000) } })
    await enforceAuthRateLimit('login', email, new Headers())
    assert.equal((await prisma.authRateLimit.findUniqueOrThrow({ where: { key } })).attempts, 1)
  })

  await test('IP confiável limita contas distintas; repetição bloqueada não drena a cota global', async () => {
    const previous = process.env.AUTH_TRUSTED_IP_HEADER
    process.env.AUTH_TRUSTED_IP_HEADER = 'x-qa-client-ip'
    try {
      const headers = new Headers({ 'x-qa-client-ip': '198.51.100.20' })
      for (let i = 0; i < 30; i++) await enforceAuthRateLimit('login', `ip.${suffix}.${i}@example.com`, headers)
      for (let batch = 0; batch < 21; batch++) {
        const blocked = await Promise.allSettled(Array.from({ length: 50 }, (_, i) => enforceAuthRateLimit('login', `blocked.${suffix}.${batch}.${i}@example.com`, headers)))
        assert.ok(blocked.every((r) => r.status === 'rejected' && r.reason instanceof AuthRateLimitError))
      }
      await enforceAuthRateLimit('login', `other.ip.${suffix}@example.com`, new Headers({ 'x-qa-client-ip': '198.51.100.21' }))
    } finally {
      if (previous === undefined) delete process.env.AUTH_TRUSTED_IP_HEADER
      else process.env.AUTH_TRUSTED_IP_HEADER = previous
    }
  })

  await test('Autocadastro limitado responde 429 com Retry-After', async () => {
    const email = `security.signup.${suffix}@example.com`
    const body = { name: 'Segurança Cadastro', email, password: 'Test!12345' }
    for (const expected of [201, 409, 409, 429]) {
      const response = await api('/api/signup', 'POST', body, '', { 'x-forwarded-for': `198.51.100.${expected}` })
      assert.equal(response.status, expected)
      if (expected === 429) assert.ok(Number(response.headers.get('retry-after')) > 0)
    }
  })
  console.log(`\nSegurança: ${passed}/${passed} verificações aprovadas.`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => {
  await prisma.$disconnect()
  // enforceAuthRateLimit utiliza o singleton da aplicação em um processo separado do servidor.
  const { prisma: shared } = await import('../lib/db')
  await shared.$disconnect()
})
