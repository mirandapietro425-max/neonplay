import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Qual jogo escolher? Quiz de recomendação | Zap Game',
  description: 'Responda três perguntas e encontre jogos de navegador que combinam com seu tempo, companhia e estilo de partida.',
  alternates: { canonical: '/guias/qual-jogo-escolher' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Zap Game',
    url: 'https://www.zapgame.com.br/guias/qual-jogo-escolher',
    title: 'Qual jogo escolher? Quiz de recomendação | Zap Game',
    description: 'Responda três perguntas e encontre uma próxima partida no Zap Game.',
    images: [{ url: '/brand/quiz-hero.webp', alt: 'Quiz de recomendação do Zap Game' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qual jogo escolher? Quiz de recomendação | Zap Game',
    description: 'Encontre uma próxima partida respondendo três perguntas.',
    images: ['/brand/quiz-hero.webp'],
  },
}

export default function QuizLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
