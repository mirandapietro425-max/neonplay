import type { Metadata } from 'next'
import Link from 'next/link'
import { comparisonGames } from '@/lib/comparison-games'

const canonical = 'https://www.zapgame.com.br/guias/comparativo-jogos-de-navegador'
const lastReviewed = '24 de outubro de 2026'

export const metadata: Metadata = {
  title: 'Comparativo de jogos de navegador | Zap Game',
  description: 'Compare 12 jogos de navegador por categoria, proposta, sessão, multiplayer e origem, com curadoria editorial do Zap Game.',
  alternates: { canonical: '/guias/comparativo-jogos-de-navegador' },
}

export default function ComparisonPage() {
  const schema = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://www.zapgame.com.br/' },
      { '@type': 'ListItem', position: 2, name: 'Guias', item: 'https://www.zapgame.com.br/guias' },
      { '@type': 'ListItem', position: 3, name: 'Comparativo de jogos de navegador', item: canonical },
    ] },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Comparativo de jogos de navegador', numberOfItems: comparisonGames.length, itemListElement: comparisonGames.map((game, index) => ({ '@type': 'ListItem', position: index + 1, name: game.title, url: `https://www.zapgame.com.br${game.href}` })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: 'Qual é o melhor jogo de navegador para celular?', acceptedAnswer: { '@type': 'Answer', text: 'Não existe um melhor título universal. O comparativo indica propostas e mantém a compatibilidade móvel como a confirmar até que exista teste documentado.' } },
      { '@type': 'Question', name: 'Quais jogos de navegador são bons para partidas rápidas?', acceptedAnswer: { '@type': 'Answer', text: 'Basketball Stars, Bomber Friends, Body Drop 3D e Baby Hazel Bed Time aparecem no comparativo com proposta de sessão curta.' } },
      { '@type': 'Question', name: 'Quais jogos multiplayer de navegador posso jogar com amigos?', acceptedAnswer: { '@type': 'Answer', text: 'Basketball Stars, Among at Easter e Bomber Friends têm recursos indicados pelo parceiro; confirme o modo disponível ao abrir cada jogo.' } },
    ] },
  ]

  return <main className="zg-shell"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /><div className="zg-wrap" style={{ maxWidth: 1180, paddingBlock: '3rem' }}>
    <nav aria-label="Navegação estrutural"><Link href="/">Início</Link><span aria-hidden="true"> / </span><Link href="/guias">Guias</Link><span aria-hidden="true"> / </span><span>Comparativo</span></nav>
    <article style={{ marginTop: '2rem', lineHeight: 1.75 }}>
      <p className="zg-kicker">RECURSO EDITORIAL ZAP GAME</p>
      <h1>Comparativo de jogos de navegador</h1>
      <p style={{ maxWidth: 800, fontSize: '1.1rem' }}>Compare jogos de navegador por proposta, categoria, tipo de sessão, multiplayer e origem. Este recurso organiza 12 títulos com curadoria editorial própria e separa informações do parceiro de classificações feitas pelo Zap Game.</p>
      <p><strong>Última revisão:</strong> {lastReviewed}. A disponibilidade e os recursos podem mudar conforme a versão oferecida pelo GamePix.</p>

      <h2>Como este comparativo foi feito</h2>
      <p>Os títulos foram selecionados entre as fichas GamePix que receberam curadoria original do Zap Game. A categoria e a origem vêm do catálogo parceiro. “Melhor para” e “tipo de sessão” são classificações editoriais para ajudar na escolha, não avaliações oficiais. Multiplayer é marcado como “indicado pelo parceiro” quando essa característica aparece na descrição disponível. Celular e PC fraco permanecem “a confirmar” até existir um teste documentado.</p>

      <div style={{ overflowX: 'auto', marginBlock: '2rem' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 1120, width: '100%', fontSize: '0.92rem' }}>
          <caption style={{ textAlign: 'left', padding: '0.75rem 0', fontWeight: 700 }}>Tabela comparativa — revisão de {lastReviewed}</caption>
          <thead><tr>{['Jogo', 'Categoria', 'Melhor para', 'Sessão', 'Multiplayer', 'Celular', 'PC fraco', 'Curadoria', 'Origem'].map((heading) => <th key={heading} scope="col" style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '2px solid currentColor' }}>{heading}</th>)}</tr></thead>
          <tbody>{comparisonGames.map((game) => <tr key={game.title}>{[
            <Link href={game.href}>{game.title}</Link>, game.category, game.bestFor, game.session, game.multiplayer, game.mobile, game.lowEndPc, game.editorial, game.source,
          ].map((value, index) => <td key={index} style={{ padding: '0.8rem', borderBottom: '1px solid color-mix(in srgb, currentColor 20%, transparent)', verticalAlign: 'top' }}>{value}</td>)}</tr>)}</tbody>
        </table>
      </div>

      <h2>Como interpretar a tabela</h2>
      <p>“Indicado pelo parceiro” não significa que o Zap Game testou o modo multiplayer. “A confirmar” significa que ainda não publicamos uma afirmação de compatibilidade para evitar promessas que dependem do navegador, do aparelho, da conexão ou de atualizações do serviço externo.</p>
      <p>Use os guias para refinar a escolha: <Link href="/guias/tema/jogos-de-navegador-no-celular">jogos no celular</Link>, <Link href="/guias/tema/jogos-leves-para-pc-fraco">jogos para PC fraco</Link>, <Link href="/guias/tema/jogos-multiplayer-para-amigos">multiplayer para amigos</Link> e <Link href="/guias/tema/jogos-de-esporte-no-navegador">jogos de esporte</Link>.</p>

      <h2>Perguntas frequentes</h2>
      <h3>Qual é o melhor jogo de navegador para celular?</h3><p>Não existe um melhor título universal. O comparativo indica propostas e mantém a compatibilidade móvel como a confirmar até que exista teste documentado.</p>
      <h3>Quais jogos são bons para partidas rápidas?</h3><p>Basketball Stars, Bomber Friends, Body Drop 3D e Baby Hazel Bed Time aparecem no comparativo com proposta de sessão curta.</p>
      <h3>Quais jogos multiplayer posso jogar com amigos?</h3><p>Basketball Stars, Among at Easter e Bomber Friends têm recursos indicados pelo parceiro; confirme o modo disponível ao abrir cada jogo.</p>
      <p><Link href="/contato">Encontrou uma informação incorreta? Envie uma correção ao Zap Game.</Link></p>
    </article>
  </div></main>
}
