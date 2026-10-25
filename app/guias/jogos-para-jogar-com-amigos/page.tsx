import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Jogos para jogar com amigos | Zap Game',
  description: 'Como encontrar jogos de navegador com competição, cooperação ou recursos multiplayer indicados na fonte.',
  alternates: { canonical: '/guias/jogos-para-jogar-com-amigos' },
}

export default function FriendsGuide() {
  return <main className="zg-shell"><div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
    <Link href="/guias">← Voltar aos guias</Link>
    <section className="zg-guide-article-hero" style={{ backgroundImage: "url('/brand/guide-friends.webp')" }}><div><p className="zg-eyebrow">GUIA SOCIAL</p><h1>Jogos para jogar com amigos</h1><p>Como encontrar experiências de competição ou cooperação para compartilhar uma partida.</p></div></section>
    <article className="zg-guide-article" style={{ lineHeight: 1.8 }}>
      <p className="zg-kicker">GUIA DE CURADORIA</p>
      <p>Jogos para amigos podem funcionar de formas diferentes: alguns têm disputa direta, outros dependem de cooperação e alguns oferecem multiplayer apenas quando o próprio parceiro informa esse recurso. A primeira regra é conferir a descrição e a tela inicial antes de combinar uma partida.</p>
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
