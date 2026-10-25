import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Qual jogo escolher? Quiz de recomendação | Zap Game',
  description: 'Responda três perguntas e encontre jogos de navegador que combinam com seu tempo, companhia e estilo de partida.',
  path: '/guias/qual-jogo-escolher',
  image: '/brand/quiz-hero.webp',
  imageAlt: 'Quiz de recomendação do Zap Game',
  type: 'article',
})

export default function QuizLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
