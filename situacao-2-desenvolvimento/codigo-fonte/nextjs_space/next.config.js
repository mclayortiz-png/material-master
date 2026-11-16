/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  outputFileTracingRoot: process.env.NEXT_OUTPUT_MODE ? path.join(__dirname, '../') : '/',
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  // Controles de seguranca conservadores; nao incluir includeSubDomains nem preload no dominio da hospedagem.
  // CSP anti-clickjacking permite o console AbacusAI incorporar o preview em navegadores modernos.
  // A politica CSP de scripts e estilos sera endurecida apos validacao da interface.
  async headers() {
    const securityHeaders = [
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://apps.abacus.ai; object-src 'none'; base-uri 'self'" },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000' });
    }
    const entries = [{ source: '/:path*', headers: securityHeaders }];
    // Manter protecao contra cache de chunks apenas no ambiente de desenvolvimento.
    if (process.env.NODE_ENV === 'development') {
      entries.push({ source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }] });
    }
    return entries;
  },
  allowedDevOrigins: ['127.0.0.1'],
};

const fs = require('fs');
const userConfigPath = path.join(__dirname, 'next.config.user.json');
const userConfigAllowedKeys = { skipTrailingSlashRedirect: 'boolean', trailingSlash: 'boolean' };
if (fs.existsSync(userConfigPath)) {
  const userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
  for (const key of Object.keys(userConfig)) {
    if (typeof userConfig[key] !== userConfigAllowedKeys[key]) {
      throw new Error(`next.config.user.json: unsupported override "${key}". Supported boolean keys: skipTrailingSlashRedirect, trailingSlash.`);
    }
    nextConfig[key] = userConfig[key];
  }
}

module.exports = nextConfig;

