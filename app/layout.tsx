import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteOrigin = 'https://www.zapgame.com.br'
const siteDescription = 'Reviva jogos clássicos de navegador no Zap Game. Explore arcade, ação, aventura e puzzles em um arquivo vivo de jogos Flash e memórias da web.'

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'Zap Game — jogos clássicos online e jogos retrô',
  description: siteDescription,
  applicationName: 'Zap Game',
  keywords: [
    'jogos clássicos',
    'jogos retrô',
    'jogos de navegador',
    'jogos Flash',
    'jogos online',
    'Zap Game',
  ],
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Zap Game',
    url: '/',
    title: 'Zap Game — jogos clássicos online e jogos retrô',
    description: siteDescription,
    images: [{
      url: '/brand/zapgame-og.webp',
      alt: 'Zap Game: um acervo vivo de jogos clássicos do navegador',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zap Game — jogos clássicos online e jogos retrô',
    description: siteDescription,
    images: ['/brand/zapgame-og.webp'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-dark-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0d18',
}

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Zap Game',
    alternateName: 'ZapGame',
    url: `${siteOrigin}/`,
    inLanguage: 'pt-BR',
    description: siteDescription,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Zap Game',
    url: `${siteOrigin}/`,
    inLanguage: 'pt-BR',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web browser',
    description: siteDescription,
  },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
