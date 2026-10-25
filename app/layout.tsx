import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { GoogleAnalytics } from '@/components/google-analytics'
import './globals.css'

const siteOrigin = 'https://www.zapgame.com.br'
const siteDescription = 'Encontre jogos de navegador no Zap Game. Explore arcade, ação, aventura, esporte e puzzles em um catálogo curado com guias editoriais e fontes identificadas.'

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
      alt: 'Zap Game: catálogo curado de jogos de navegador e guias editoriais',
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
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9532843897939144"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <GoogleAnalytics />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
