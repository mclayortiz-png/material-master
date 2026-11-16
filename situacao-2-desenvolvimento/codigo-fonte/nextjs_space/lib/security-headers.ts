/** Only exact origins may embed the app. Shared-hosting wildcards trust other tenants. */
export function previewFrameOrigins(value = ''): string[] {
  return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const url = new URL(entry)
    if (url.protocol !== 'https:' || url.username || url.password || url.hostname.includes('*') ||
        url.pathname !== '/' || url.search || url.hash) {
      throw new Error('CSP_FRAME_ANCESTORS must contain comma-separated, exact HTTPS origins.')
    }
    return url.origin
  }))]
}

export function contentSecurityPolicy(nonce: string, development: boolean, frameOrigins: string[]): string {
  return [
    "default-src 'self'",
    // Next's bootstrap and next-themes receive this per-response nonce. No inline-script exemption.
    `script-src 'self' 'nonce-${nonce}' https://apps.abacus.ai/chatllm/appllm-lib.js${development ? " 'unsafe-eval'" : ''}`,
    // Radix, next-themes and visualization components use style elements / style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors 'self'${frameOrigins.length ? ` ${frameOrigins.join(' ')}` : ''}`,
  ].join('; ')
}

/** Browser cookies must not authorize cross-origin JSON mutations on our own API. */
export function apiMutationError(request: Request, pathname: string, expectedOrigin: string): { status: number; erro: string } | null {
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth/') ||
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return null

  if (request.headers.get('origin') !== expectedOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return { status: 403, erro: 'Origem da solicitação não autorizada.' }
  }
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  // DELETE has no JSON body in the existing client; its Origin is still checked.
  if (request.method !== 'DELETE' && contentType !== 'application/json') {
    return { status: 415, erro: 'Envie os dados como application/json.' }
  }
  return null
}
