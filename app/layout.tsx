import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zap Game — Arquivo de jogos clássicos',
  description: 'Um memorial vivo dos jogos que marcaram época. Reviva clássicos do navegador no Zap Game.',
  generator: 'Zap Game',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0d18',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
