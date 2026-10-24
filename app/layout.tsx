import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeonPlay — Jogos Flash clássicos',
  description: 'Uma biblioteca de jogos Flash preservados para jogar direto no navegador.',
  generator: 'NeonPlay',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#070711',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
