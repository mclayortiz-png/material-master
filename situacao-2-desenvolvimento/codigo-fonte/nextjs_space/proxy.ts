import { NextRequest, NextResponse } from 'next/server'
import { apiMutationError, contentSecurityPolicy, previewFrameOrigins } from '@/lib/security-headers'

export function proxy(request: NextRequest) {
  const development = process.env.NODE_ENV === 'development'
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
  const policy = contentSecurityPolicy(nonce, development, previewFrameOrigins(process.env.CSP_FRAME_ANCESTORS))
  const requestHeaders = new Headers(request.headers)
  // Always replace caller-supplied values before Next.js reads the CSP nonce.
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', policy)

  const configuredUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL
  const expectedOrigin = configuredUrl ? new URL(configuredUrl).origin : request.nextUrl.origin
  const mutationError = apiMutationError(request, request.nextUrl.pathname, expectedOrigin)
  const response = mutationError
    ? NextResponse.json({ erro: mutationError.erro }, { status: mutationError.status })
    : NextResponse.next({ request: { headers: requestHeaders } })

  response.headers.set('Content-Security-Policy', policy)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  if (!development) response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  // A document with a request-specific nonce must never be served from a shared cache.
  if (!request.nextUrl.pathname.startsWith('/_next/') && !/\.[a-z0-9]+$/i.test(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', 'private, no-store')
  }
  return response
}

export const config = { matcher: '/:path*' }
