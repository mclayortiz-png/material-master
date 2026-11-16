import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { SessionProvider } from 'next-auth/react'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: 'MATERIAL MASTER', template: '%s | MATERIAL MASTER' },
  description: 'Sistema de Gestão, Padronização e Governança de Cadastros de Materiais',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'MATERIAL MASTER' },
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/icon-192.png' },
  openGraph: {
    title: 'MATERIAL MASTER',
    description: 'Gestão e Padronização de Cadastros de Materiais',
    images: ['/og-image.png'],
    locale: 'pt_BR',
    type: 'website',
  },
}

export const viewport = { themeColor: '#0F766E' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script nonce={nonce} src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider nonce={nonce} attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SessionProvider>{children}</SessionProvider>
          <Toaster richColors position="top-right" />
          {/* IMPORTANT: Do not remove — handles chunk loading race conditions in the dev server */}
          <ChunkLoadErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
