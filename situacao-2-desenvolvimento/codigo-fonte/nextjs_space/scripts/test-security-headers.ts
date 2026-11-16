import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { apiMutationError, contentSecurityPolicy, previewFrameOrigins } from '../lib/security-headers'
import { proxy } from '../proxy'

const productionPolicy = contentSecurityPolicy('test-nonce', false, [])
assert.match(productionPolicy, /script-src 'self' 'nonce-test-nonce'/)
assert.ok(!productionPolicy.split(';').find((part) => part.trim().startsWith('script-src'))!.includes('unsafe-inline'))
assert.ok(!productionPolicy.includes('unsafe-eval'))
assert.match(productionPolicy, /frame-ancestors 'self'$/)
assert.deepEqual(previewFrameOrigins('https://preview.abacus.ai, https://preview.abacus.ai/'), ['https://preview.abacus.ai'])
for (const origin of ['https://*.abacus.ai', 'http://preview.abacus.ai', 'https://preview.abacus.ai/path', 'https://user:password@preview.abacus.ai', 'https://preview.abacus.ai/#hash']) {
  assert.throws(() => previewFrameOrigins(origin))
}

const origin = 'https://material-master.abacusai.app'
const mutation = (requestOrigin: string | null, contentType: string, method = 'POST') => new Request(`${origin}/api/materiais`, {
  method,
  headers: { ...(requestOrigin ? { origin: requestOrigin } : {}), 'content-type': contentType },
})
assert.equal(apiMutationError(mutation(origin, 'application/json; charset=utf-8'), '/api/materiais', origin), null)
assert.equal(apiMutationError(mutation('https://other-tenant.abacusai.app', 'application/json'), '/api/materiais', origin)?.status, 403)
assert.equal(apiMutationError(mutation(null, 'application/json'), '/api/materiais', origin)?.status, 403)
assert.equal(apiMutationError(mutation(origin, 'text/plain'), '/api/materiais', origin)?.status, 415)
assert.equal(apiMutationError(mutation(origin, '' , 'DELETE'), '/api/materiais/id', origin), null)
assert.equal(apiMutationError(mutation(null, 'application/x-www-form-urlencoded'), '/api/auth/callback/credentials', origin), null)

const response = proxy(new NextRequest('http://localhost:3000/login', { headers: { 'x-nonce': 'attacker-chosen', 'content-security-policy': "script-src 'unsafe-inline'" } }))
const firstNonce = response.headers.get('x-middleware-request-x-nonce')
assert.ok(firstNonce && firstNonce !== 'attacker-chosen')
assert.ok(response.headers.get('content-security-policy')!.includes(`'nonce-${firstNonce}'`))
const nextResponse = proxy(new NextRequest('http://localhost:3000/login'))
assert.notEqual(firstNonce, nextResponse.headers.get('x-middleware-request-x-nonce'))
assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
assert.equal(response.headers.get('cache-control'), 'private, no-store')
console.log('Security headers, nonces, exact preview origins and API mutation guards: passed.')
