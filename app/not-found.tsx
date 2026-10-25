import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Página não encontrada | Zap Game',
  description: 'A página que você procurou não existe no Zap Game.',
  robots: { index: false, follow: true },
  alternates: null,
  openGraph: null,
  twitter: null,
}

export default function NotFound() {
  return (
    <main className="zg-shell">
      <div className="zg-wrap">
        <section className="zg-category-hero" aria-labelledby="not-found-title">
          <p className="zg-kicker">Zap Game</p>
          <h1 id="not-found-title">Jogo não encontrado</h1>
          <p>Esse endereço não corresponde a uma página publicada. Volte ao acervo para escolher outro jogo.</p>
          <Link className="zg-primary-btn zg-top-link" href="/">Voltar ao acervo</Link>
        </section>
      </div>
    </main>
  )
}
