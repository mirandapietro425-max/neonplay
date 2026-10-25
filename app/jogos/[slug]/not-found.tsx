import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Jogo não encontrado | Zap Game',
  description: 'Esta ficha não existe ou não está publicada no Zap Game. Volte ao catálogo para explorar outros jogos.',
  robots: { index: false, follow: true },
  alternates: null,
  openGraph: null,
  twitter: null,
}

export default function GameNotFound() {
  return (
    <main className="zg-shell zg-detail-shell">
      <div className="zg-wrap">
        <section className="zg-category-hero" aria-labelledby="game-not-found-title">
          <p className="zg-kicker">Zap Game</p>
          <h1 id="game-not-found-title">Jogo não encontrado</h1>
          <p>Esta ficha não existe ou não está mais publicada. Volte ao catálogo para descobrir outro jogo.</p>
          <Link className="zg-primary-btn zg-top-link" href="/">Voltar ao catálogo</Link>
        </section>
      </div>
    </main>
  )
}
