import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Como escolher um jogo de navegador | Zap Game',
  description: 'Critérios práticos para escolher jogos de navegador por categoria, proposta, origem e compatibilidade.',
  alternates: { canonical: '/guias/como-escolher-jogos-de-navegador' },
}

export default function ChoosingGuide() {
  return <main className="zg-shell"><div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
    <Link href="/guias">← Voltar aos guias</Link>
    <article style={{ marginTop: '2rem', lineHeight: 1.8 }}>
      <p className="zg-kicker">GUIA DE CURADORIA</p>
      <h1>Como escolher um jogo de navegador</h1>
      <p>Escolher um jogo fica mais fácil quando o visitante sabe o que quer fazer. Em vez de olhar apenas para uma capa, comece pela intenção: passar alguns minutos, competir, resolver um problema, administrar recursos ou acompanhar uma aventura.</p>
      <h2>1. Comece pela categoria</h2>
      <p>Arcade e casual costumam ser boas portas de entrada para sessões diretas. Esporte e ação atendem quem quer disputa e ritmo. Estratégia e aventura podem oferecer mais decisões ou progressão. Puzzle é uma escolha natural para quem prefere resolver desafios.</p>
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
