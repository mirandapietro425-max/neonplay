import type { Metadata } from 'next'
import Link from 'next/link'
import { getGamePixGames } from '@/lib/gamepix-catalog'
import { GuideRecommendationGrid } from '@/components/guide-recommendations'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Como escolher um jogo de navegador | Zap Game',
  description: 'Critérios práticos para escolher jogos de navegador por categoria, proposta, origem e compatibilidade.',
  path: '/guias/como-escolher-jogos-de-navegador',
  image: '/brand/guide-how-to-choose.webp',
  imageAlt: 'Guia para escolher jogos de navegador no Zap Game',
  type: 'article',
})

export default async function ChoosingGuide() {
  const games = await getGamePixGames()
  const recommendations = ['gamepix-basketball-stars-35lbe', 'gamepix-amaze-escape-am511', 'gamepix-babel-tower-45tbr'].map((slug) => { const game = games.find((item) => item.slug === slug); return { title: game?.title ?? slug, href: `/jogos/${slug}`, reason: game?.editorial?.description ?? 'Uma opção para comparar por proposta e categoria.', imageUrl: game?.imageUrl } })
  return <main className="zg-shell"><div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
    <Link href="/guias">← Voltar aos guias</Link>
    <section className="zg-guide-article-hero" style={{ backgroundImage: "url('/brand/guide-how-to-choose.webp')" }}><div><p className="zg-eyebrow">GUIA DE MÉTODO</p><h1>Como escolher um jogo de navegador</h1><p>Critérios práticos para comparar proposta, categoria, origem e compatibilidade.</p></div></section>
    <article className="zg-guide-article" style={{ lineHeight: 1.8 }}>
      <p className="zg-kicker">GUIA DE CURADORIA</p>
      <p>Escolher um jogo fica mais fácil quando o visitante sabe o que quer fazer. Em vez de olhar apenas para uma capa, comece pela intenção: passar alguns minutos, competir, resolver um problema, administrar recursos ou acompanhar uma aventura.</p>
      <GuideRecommendationGrid guide="como-escolher-jogos-de-navegador" items={recommendations} />
      <h2>1. Comece pela categoria</h2>
      <p><Link href="/jogos/categoria/arcade">Arcade</Link> e <Link href="/jogos/categoria/casual">casual</Link> costumam ser boas portas de entrada para sessões diretas. <Link href="/jogos/categoria/esporte">Esporte</Link> e <Link href="/jogos/categoria/acao">ação</Link> atendem quem quer disputa e ritmo. <Link href="/jogos/categoria/estrategia">Estratégia</Link> e <Link href="/jogos/categoria/aventura">aventura</Link> podem oferecer mais decisões ou progressão. <Link href="/jogos/categoria/puzzle">Puzzle</Link> é uma escolha natural para quem prefere resolver desafios.</p>
      <h2>2. Leia a proposta</h2>
      <p>Uma descrição útil deve explicar o objetivo, não apenas repetir palavras promocionais. No Zap Game, as fichas com curadoria própria acrescentam contexto e informam quando uma característica vem da descrição do parceiro.</p>
      <h2>3. Confira a origem</h2>
      <p>O catálogo público atual usa o feed GamePix como parceiro identificado. A ficha não significa que o Zap Game seja titular do jogo. A disponibilidade e as regras do serviço externo podem mudar.</p>
      <h2>4. Proteja sua experiência</h2>
      <p>Use um navegador atualizado, não forneça dados pessoais em telas que não sejam necessárias e observe a publicidade do serviço externo. Para crianças, responsáveis devem acompanhar a navegação e conferir os links apresentados.</p>
      <p><Link href="/sobre">Leia os critérios editoriais do Zap Game</Link> ou <Link href="/contato">envie uma sugestão de melhoria</Link>.</p>
    </article>
  </div></main>
}
