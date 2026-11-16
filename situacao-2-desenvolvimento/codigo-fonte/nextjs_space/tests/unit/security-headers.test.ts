import { describe, expect, it } from 'vitest'
import { apiMutationError, contentSecurityPolicy, previewFrameOrigins } from '@/lib/security-headers'

const ORIGEM = 'https://app.exemplo.com.br'

function requisicao(metodo: string, cabecalhos: Record<string, string> = {}): Request {
  return new Request(`${ORIGEM}/api/materiais`, { method: metodo, headers: cabecalhos })
}

describe('apiMutationError — verificação de origem em mutações da API', () => {
  it('ignora leituras, rotas fora de /api e rotas de autenticação', () => {
    expect(apiMutationError(requisicao('GET'), '/api/materiais', ORIGEM)).toBeNull()
    expect(apiMutationError(requisicao('POST', { origin: 'https://evil.exemplo' }), '/materiais', ORIGEM)).toBeNull()
    expect(apiMutationError(requisicao('POST', { origin: 'https://evil.exemplo' }), '/api/auth/callback/credentials', ORIGEM)).toBeNull()
  })

  it('aceita requisição legítima do navegador (mesma origem + JSON)', () => {
    const req = requisicao('POST', { origin: ORIGEM, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json; charset=utf-8' })
    expect(apiMutationError(req, '/api/materiais', ORIGEM)).toBeNull()
  })

  it('rejeita Origin divergente com 403', () => {
    const req = requisicao('POST', { origin: 'https://evil.exemplo', 'content-type': 'application/json' })
    expect(apiMutationError(req, '/api/materiais', ORIGEM)?.status).toBe(403)
  })

  it('rejeita Origin literal "null" com 403', () => {
    const req = requisicao('POST', { origin: 'null', 'content-type': 'application/json' })
    expect(apiMutationError(req, '/api/materiais', ORIGEM)?.status).toBe(403)
  })

  it('rejeita Sec-Fetch-Site cross-site mesmo com Origin correto', () => {
    const req = requisicao('DELETE', { origin: ORIGEM, 'sec-fetch-site': 'cross-site' })
    expect(apiMutationError(req, '/api/materiais/1', ORIGEM)?.status).toBe(403)
  })

  it('rejeita text/plain (e ausência de content-type) com 415 em POST/PUT/PATCH', () => {
    const base = { origin: ORIGEM, 'sec-fetch-site': 'same-origin' }
    expect(apiMutationError(requisicao('POST', { ...base, 'content-type': 'text/plain' }), '/api/materiais', ORIGEM)?.status).toBe(415)
    expect(apiMutationError(requisicao('PUT', base), '/api/materiais/1', ORIGEM)?.status).toBe(415)
    expect(apiMutationError(requisicao('PATCH', { ...base, 'content-type': 'application/x-www-form-urlencoded' }), '/api/familias/1', ORIGEM)?.status).toBe(415)
  })

  it('cliente não-navegador: só quando Origin, Sec-Fetch-Site e Referer estão TODOS ausentes', () => {
    // sem nenhum cabeçalho de navegador: passa pela verificação de origem (a autorização da rota continua obrigatória)
    expect(apiMutationError(requisicao('POST', { 'content-type': 'application/json' }), '/api/materiais', ORIGEM)).toBeNull()
    // continua exigindo JSON
    expect(apiMutationError(requisicao('POST', { 'content-type': 'text/plain' }), '/api/materiais', ORIGEM)?.status).toBe(415)
    // qualquer um dos três presente volta a exigir a origem exata
    expect(apiMutationError(requisicao('POST', { referer: 'https://evil.exemplo/x', 'content-type': 'application/json' }), '/api/materiais', ORIGEM)?.status).toBe(403)
    expect(apiMutationError(requisicao('POST', { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }), '/api/materiais', ORIGEM)?.status).toBe(403)
    expect(apiMutationError(requisicao('POST', { 'sec-fetch-site': 'none', 'content-type': 'application/json' }), '/api/materiais', ORIGEM)?.status).toBe(403)
  })
})

describe('previewFrameOrigins / contentSecurityPolicy', () => {
  it('aceita apenas origens HTTPS exatas, sem curingas ou caminhos', () => {
    expect(previewFrameOrigins('https://apps.abacus.ai, https://apps.abacus.ai')).toEqual(['https://apps.abacus.ai'])
    expect(() => previewFrameOrigins('https://*.abacus.ai')).toThrow()
    expect(() => previewFrameOrigins('http://apps.abacus.ai')).toThrow()
    expect(() => previewFrameOrigins('https://apps.abacus.ai/painel')).toThrow()
    expect(previewFrameOrigins('')).toEqual([])
  })

  it('gera CSP com nonce, sem unsafe-eval fora de desenvolvimento e com frame-ancestors exatos', () => {
    const csp = contentSecurityPolicy('abc123', false, ['https://apps.abacus.ai'])
    expect(csp).toContain("script-src 'self' 'nonce-abc123'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("frame-ancestors 'self' https://apps.abacus.ai")
    expect(csp).toContain("object-src 'none'")
    expect(contentSecurityPolicy('n', true, [])).toMatch(/frame-ancestors 'self'$/)
  })
})
