import type { Metadata } from 'next'
import Link from 'next/link'
import { getGamePixGames } from '@/lib/gamepix-catalog'
import { GuideRecommendationGrid } from '@/components/guide-recommendations'

export const metadata: Metadata = {
  title: 'Jogos para partidas curtas | Zap Game',
  description: 'Como escolher jogos de navegador para pausas rápidas e partidas sem compromisso longo.',
  alternates: { canonical: '/guias/jogos-para-partidas-curtas' },
}

export default async function ShortSessionsGuide() {
  const games = await getGamePixGames()
  const recommendations = ['gamepix-basketball-stars-35lbe', 'gamepix-bomber-friends-40344', 'gamepix-alpha-guns-40450'].map((slug) => { const game = games.find((item) => item.slug === slug); return { title: game?.title ?? slug, href: `/jogos/${slug}`, reason: game?.editorial?.summary ?? 'Uma opção editorial para uma sessão direta.', imageUrl: game?.imageUrl } })
  return <main className="zg-shell"><div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
    <Link href="/guias">← Voltar aos guias</Link>
    <section className="zg-guide-article-hero" style={{ backgroundImage: "url('/brand/guide-quick-sessions.webp')" }}><div><p className="zg-eyebrow">GUIA DE RITMO</p><h1>Jogos para partidas curtas</h1><p>Escolhas para pausas rápidas, rodadas diretas e momentos em que você quer jogar sem compromisso longo.</p></div></section>
    <article className="zg-guide-article" style={{ lineHeight: 1.8 }}>
      <p className="zg-kicker">GUIA DE CURADORIA</p>
      <p>Nem todo momento de jogo precisa de uma campanha longa. Para uma pausa rápida, a melhor escolha costuma ser uma experiência com objetivo fácil de entender, início rápido e progresso que não dependa de muitas horas seguidas.</p>
      <GuideRecommendationGrid guide="jogos-para-partidas-curtas" items={recommendations} />
      <h2>O que observar</h2>
      <p>Procure categorias como arcade, esporte, ação e puzzle. Elas normalmente apresentam uma proposta mais direta, mas a categoria sozinha não garante a duração da partida. Por isso, o Zap Game também observa se a descrição indica rodadas, arenas, desafios individuais ou fases curtas.</p>
      <h2>Algumas opções do catálogo</h2>
      <p><Link href="/jogos/gamepix-basketball-stars-35lbe">Basketball Stars</Link> é uma opção esportiva de confronto direto. <Link href="/jogos/gamepix-bomber-friends-40344">Bomber Friends</Link> aposta em uma arena e em decisões rápidas. <Link href="/jogos/gamepix-alpha-guns-40450">Alpha Guns</Link> segue uma estrutura de ação lateral dividida em fases.</p>
      <h2>Antes de começar</h2>
      <p>A disponibilidade, o carregamento e os recursos podem mudar porque o jogo é aberto no serviço parceiro. Se a página não carregar corretamente, volte ao catálogo e tente outro título da mesma categoria.</p>
      <p><Link href="/contato">Encontrou uma informação desatualizada? Envie uma correção ao Zap Game.</Link></p>
    </article>
  </div></main>
}
