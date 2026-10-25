import type { Metadata } from 'next'
import Link from 'next/link'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Guias de jogos de navegador | Zap Game',
  description: 'Guias e critérios editoriais do Zap Game para escolher jogos de navegador com mais facilidade.',
  path: '/guias',
  imageAlt: 'Guias de jogos de navegador do Zap Game',
})

const guides = [
  { href: '/guias/qual-jogo-escolher', title: 'Qual jogo combina com você?', type: 'INTERATIVO', text: 'Responda três perguntas e receba recomendações editoriais para o seu momento.', image: '/brand/guide-quiz.webp', featured: true },
  { href: '/guias/comparativo-jogos-de-navegador', title: 'Comparativo de jogos de navegador', type: 'REFERÊNCIA', text: 'Tabela editorial com 12 títulos, proposta, sessão, multiplayer e origem.', image: '/brand/guide-comparison.webp', featured: true },
  { href: '/guias/jogos-para-partidas-curtas', title: 'Jogos para partidas curtas', type: 'TEMPO', text: 'Como escolher experiências que você consegue começar rapidamente, sem depender de uma campanha longa.', image: '/brand/guide-quick-sessions.webp' },
  { href: '/guias/jogos-para-jogar-com-amigos', title: 'Jogos para jogar com amigos', type: 'SOCIAL', text: 'Um guia para identificar jogos competitivos e multiplayer a partir das informações disponíveis.', image: '/brand/guide-friends.webp' },
  { href: '/guias/como-escolher-jogos-de-navegador', title: 'Como escolher um jogo de navegador', type: 'MÉTODO', text: 'Critérios simples para comparar categoria, proposta, compatibilidade e origem antes de jogar.', image: '/brand/guide-how-to-choose.webp' },
  { href: '/guias/tema/jogos-de-navegador-no-celular', title: 'Jogos para jogar no celular', type: 'CELULAR', text: 'O que observar na proposta e na compatibilidade antes de abrir um jogo no celular.', image: '/brand/guide-mobile.webp' },
  { href: '/guias/tema/jogos-leves-para-pc-fraco', title: 'Jogos para PC fraco', type: 'DESEMPENHO', text: 'Critérios para testar jogos de navegador em computadores com recursos limitados.', image: '/brand/guide-low-pc.webp' },
  { href: '/guias/tema/jogos-multiplayer-para-amigos', title: 'Multiplayer para amigos', type: 'MULTIPLAYER', text: 'Como diferenciar disputa local, conexão online e recursos informados pelo parceiro.', image: '/brand/guide-multiplayer.webp' },
  { href: '/guias/tema/jogos-de-esporte-no-navegador', title: 'Esportes no navegador', type: 'ESPORTES', text: 'Basquete, campeonatos e critérios para escolher uma partida esportiva.', image: '/brand/guide-sports.webp' },
]

export default function GuidesPage() {
  return <main className="zg-shell zg-guides-page"><div className="zg-wrap" style={{ maxWidth: 1180, paddingBlock: '2rem 4rem' }}>
    <Link className="zg-guides-back" href="/">← Voltar ao Zap Game</Link>
    <section className="zg-guides-hero"><div className="zg-guides-hero-copy"><p className="zg-eyebrow">CURADORIA ZAP GAME</p><h1>Encontre seu próximo <span>jogo.</span></h1><p>Guias para escolher uma experiência de navegador sem depender apenas do título ou da imagem.</p><div className="zg-guides-hero-meta"><span><b>09</b> guias</span><span><b>12</b> jogos comparados</span><span><b>01</b> quiz interativo</span></div></div></section>
    <section className="zg-guides-intro"><div><p className="zg-kicker">MAPA DE DESCOBERTA</p><h2>Escolha um caminho.</h2></div><p>Organizamos os jogos por intenção de uso e explicamos os critérios da curadoria, sem inventar avaliações ou recursos que não estejam confirmados.</p></section>
    <div className="zg-guides-grid">{guides.map((guide, index) => <Link className={`zg-guide-card${guide.featured ? ' zg-guide-card-featured' : ''}`} style={{ backgroundImage: `linear-gradient(145deg, rgba(12,17,38,.78), rgba(17,21,37,.98) 78%), url('${guide.image}')` }} key={guide.href} href={guide.href}><div className="zg-guide-card-top"><span className="zg-guide-index">0{index + 1}</span><span className="zg-guide-type">{guide.type}</span><span className="zg-guide-arrow">↗</span></div><h3>{guide.title}</h3><p>{guide.text}</p><span className="zg-guide-read">Abrir guia</span></Link>)}</div>
  </div></main>
}
