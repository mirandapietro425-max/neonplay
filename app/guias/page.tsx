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
