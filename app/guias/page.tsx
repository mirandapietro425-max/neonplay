import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Guias de jogos de navegador | Zap Game',
  description: 'Guias e critérios editoriais do Zap Game para escolher jogos de navegador com mais facilidade.',
  alternates: { canonical: '/guias' },
}

const guides = [
  { href: '/guias/jogos-para-partidas-curtas', title: 'Jogos para partidas curtas', text: 'Como escolher experiências que você consegue começar rapidamente, sem depender de uma campanha longa.' },
  { href: '/guias/jogos-para-jogar-com-amigos', title: 'Jogos para jogar com amigos', text: 'Um guia para identificar jogos competitivos e multiplayer a partir das informações disponíveis.' },
  { href: '/guias/como-escolher-jogos-de-navegador', title: 'Como escolher um jogo de navegador', text: 'Critérios simples para comparar categoria, proposta, compatibilidade e origem antes de jogar.' },
  { href: '/guias/tema/jogos-de-navegador-no-celular', title: 'Jogos para jogar no celular', text: 'O que observar na proposta e na compatibilidade antes de abrir um jogo no celular.' },
  { href: '/guias/tema/jogos-leves-para-pc-fraco', title: 'Jogos para PC fraco', text: 'Critérios para testar jogos de navegador em computadores com recursos limitados.' },
  { href: '/guias/tema/jogos-multiplayer-para-amigos', title: 'Multiplayer para amigos', text: 'Como diferenciar disputa local, conexão online e recursos informados pelo parceiro.' },
  { href: '/guias/tema/jogos-de-esporte-no-navegador', title: 'Esportes no navegador', text: 'Basquete, campeonatos e critérios para escolher uma partida esportiva.' },
]

export default function GuidesPage() {
  return <main className="zg-shell"><div className="zg-wrap" style={{ maxWidth: 980, paddingBlock: '3rem' }}>
    <Link href="/">← Voltar ao Zap Game</Link>
    <p className="zg-kicker" style={{ marginTop: '2rem' }}>CURADORIA ZAP GAME</p>
    <h1>Guias de jogos de navegador</h1>
    <p style={{ maxWidth: 720, lineHeight: 1.75 }}>Os guias do Zap Game ajudam você a escolher uma experiência sem depender apenas do título ou da imagem. Organizamos os jogos por intenção de uso e explicamos os critérios da curadoria, sem inventar avaliações ou recursos que não estejam confirmados.</p>
    <div className="zg-related-grid" style={{ marginTop: '2rem' }}>{guides.map((guide) => <Link className="zg-related-card" key={guide.href} href={guide.href}><span>{guide.title}</span><small>{guide.text}</small></Link>)}</div>
  </div></main>
}
