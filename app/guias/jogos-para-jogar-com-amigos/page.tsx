import type { Metadata } from 'next'
import Link from 'next/link'
import { getGamePixGames } from '@/lib/gamepix-catalog'
import { GuideRecommendationGrid } from '@/components/guide-recommendations'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Jogos para jogar com amigos online | Zap Game',
  description: 'Encontre jogos de navegador para jogar com amigos online. Compare competição, cooperação e recursos multiplayer informados pelo parceiro.',
  path: '/guias/jogos-para-jogar-com-amigos',
  image: '/brand/guide-friends.webp',
  imageAlt: 'Guia de jogos de navegador para jogar com amigos',
  type: 'article',
})

export default async function FriendsGuide() {
  const games = await getGamePixGames()
  const recommendations = ['gamepix-basketball-stars-35lbe', 'gamepix-among-at-easter-ng7tt', 'gamepix-bomber-friends-40344'].map((slug) => { const game = games.find((item) => item.slug === slug); return { title: game?.title ?? slug, href: `/jogos/${slug}`, reason: game?.editorial?.description ?? 'Uma opção para investigar com amigos.', imageUrl: game?.imageUrl } })
  return <main className="zg-shell"><div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
    <Link href="/guias">← Voltar aos guias</Link>
    <section className="zg-guide-article-hero" style={{ backgroundImage: "url('/brand/guide-friends.webp')" }}><div><p className="zg-eyebrow">GUIA SOCIAL</p><h1>Jogos para jogar com amigos online</h1><p>Compare jogos de navegador para jogar com amigos e verifique se cada opção é competitiva, cooperativa, local ou online.</p></div></section>
    <article className="zg-guide-article" style={{ lineHeight: 1.8 }}>
      <p className="zg-kicker">GUIA DE CURADORIA</p>
      <p>Ao procurar jogos para jogar com amigos online, confira o modo disponível: alguns títulos têm disputa direta, outros pedem cooperação e alguns só informam multiplayer na descrição do parceiro. Confirme os detalhes na ficha e na tela inicial antes de combinar a partida.</p>
      <GuideRecommendationGrid guide="jogos-para-jogar-com-amigos" items={recommendations} />
      <h2>O que procurar</h2>
      <p>Termos como “dois jogadores”, “multiplayer”, “local” ou “Wi-Fi” são sinais úteis, mas devem ser tratados como informações da fonte, não como garantia permanente. Também vale considerar se todos os participantes usarão o mesmo dispositivo ou se cada pessoa precisará abrir o jogo separadamente.</p>
      <h2>Opções destacadas</h2>
      <p><Link href="/jogos/gamepix-basketball-stars-35lbe">Basketball Stars</Link> é descrito como uma experiência de basquete para dois jogadores. <Link href="/jogos/gamepix-among-at-easter-ng7tt">Among at Easter</Link> apresenta uma proposta de tarefas e dedução social para grupos. <Link href="/jogos/gamepix-bomber-friends-40344">Bomber Friends</Link> usa uma arena com bombas e confronto direto.</p>
      <h2>Como evitar frustração</h2>
      <p>Abra a ficha antes de compartilhar o link, confirme se o botão de iniciar funciona e combine quem ficará responsável por hospedar a partida quando houver conexão entre jogadores. A publicidade e os links externos também podem variar conforme o serviço que entrega o jogo.</p>
      <p><Link href="/contato">Se a indicação de multiplayer estiver incorreta, avise o Zap Game.</Link></p>
    </article>
  </div></main>
}
