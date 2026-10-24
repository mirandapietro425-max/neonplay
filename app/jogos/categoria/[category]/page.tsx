import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { catalogGames, categoryLabels, compareCatalogPopularity } from '@/lib/game-catalog'
import { getGamePixGames, type GamePixCatalogGame } from '@/lib/gamepix-catalog'

const siteOrigin = 'https://www.zapgame.com.br'
const categoryIds = Object.keys(categoryLabels)
type Props = { params: Promise<{ category: string }> }
type CategoryGame = (typeof catalogGames)[number] | GamePixCatalogGame

const categoryIntros: Record<string, string> = {
  acao: 'Reviva combates, desafios e aventuras de ação preservados em diferentes gerações de jogos de navegador.',
  arcade: 'Partidas rápidas, reflexos e clássicos de arcade para explorar direto pelo navegador.',
  aventura: 'Explore histórias, escolhas e mundos de aventura que marcaram a memória dos jogos online.',
  casual: 'Jogos casuais para uma pausa rápida, com experiências simples e clássicos do acervo Flash.',
  corrida: 'Acelere por pistas e desafios de corrida preservados no acervo de jogos de navegador.',
  esporte: 'Reviva jogos de esporte e partidas clássicas disponíveis no acervo do Zap Game.',
  estrategia: 'Planeje cada movimento em jogos de estratégia, defesa e gestão de recursos.',
  plataforma: 'Salte, desvie de obstáculos e explore aventuras de plataforma do acervo histórico.',
  puzzle: 'Quebra-cabeças, lógica e desafios para resolver jogada por jogada.',
  quiz: 'Teste sua memória e conhecimento com jogos de perguntas e desafios de quiz.',
}

function imageFor(game: CategoryGame) {
  return 'imagePath' in game ? game.imagePath : game.imageUrl
}

function compareCategoryGames(a: CategoryGame, b: CategoryGame) {
  if (a.source === 'gamepix' && b.source === 'gamepix') return a.providerRank - b.providerRank
  if (a.source === 'gamepix') return -1
  if (b.source === 'gamepix') return 1
  return compareCatalogPopularity(a, b)
}

async function gamesForCategory(category: string): Promise<CategoryGame[]> {
  const staticGames = catalogGames.filter((game) => game.category === category)
  const gamePixGames = (await getGamePixGames()).filter((game) => game.category === category)
  return [...staticGames, ...gamePixGames].sort(compareCategoryGames)
}

export const dynamicParams = false
export const revalidate = 600

export function generateStaticParams() {
  return categoryIds.map((category) => ({ category }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const label = categoryLabels[category]
  if (!label) return { title: 'Categoria não encontrada | Zap Game', robots: { index: false, follow: true } }
  const games = await gamesForCategory(category)
  const title = `Jogos de ${label} online | Zap Game`
  const description = `${categoryIntros[category]} Explore ${games.length} ${games.length === 1 ? 'jogo' : 'jogos'} de ${label.toLocaleLowerCase('pt-BR')} no Zap Game.`
  const canonical = `/jogos/categoria/${category}`
  const image = `/brand/category-${category}.webp`
  return {
    title,
    description: description.length > 158 ? `${description.slice(0, 155).trimEnd()}…` : description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Zap Game', url: canonical, title, description, images: [{ url: image, alt: `Jogos de ${label} no Zap Game` }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const label = categoryLabels[category]
  if (!label) notFound()
  const games = await gamesForCategory(category)
  const description = categoryIntros[category]
  const canonical = `${siteOrigin}/jogos/categoria/${category}`
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Jogos de ${label} online | Zap Game`,
      description,
      url: canonical,
      inLanguage: 'pt-BR',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: games.map((game, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: game.title,
          url: `${siteOrigin}/jogos/${game.slug}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${siteOrigin}/` },
        { '@type': 'ListItem', position: 2, name: `Jogos de ${label}`, item: canonical },
      ],
    },
  ]
  const safeJsonLd = JSON.stringify(schema).replace(/</g, '\\u003c')

  return <main className="zg-shell zg-category-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
    <div className="zg-wrap">
      <header className="zg-topbar">
        <Link href="/" aria-label="Zap Game início"><img className="zg-logo" src="/brand/zapgame-logo.svg" alt="Zap Game" /></Link>
        <nav className="zg-nav" aria-label="Navegação principal"><Link href="/#catalogo">Jogos</Link><Link href="/#categorias">Categorias</Link><Link href="/#sobre">Sobre</Link></nav>
        <Link className="zg-top-cta zg-top-link" href="/">Voltar ao acervo</Link>
      </header>

      <section className="zg-category-hero">
        <nav className="zg-breadcrumbs" aria-label="Navegação estrutural"><Link href="/">Início</Link><span aria-hidden="true">/</span><span aria-current="page">{label}</span></nav>
        <p className="zg-kicker">Explore por estilo</p>
        <h1>Jogos de {label}</h1>
        <p>{description}</p>
        <span className="zg-category-count">{games.length} {games.length === 1 ? 'jogo nesta categoria' : 'jogos nesta categoria'}</span>
      </section>

      {games.length > 0 ? <div className="zg-game-grid zg-category-grid">{games.map((game) => <Link className="zg-game-card" key={game.id} href={`/jogos/${game.slug}`}>
        {game.source === 'browser-games' && <b className="zg-browser-tag">Jogue agora</b>}
        {game.source === 'gamepix' && <b className="zg-gamepix-tag">GamePix</b>}
        <div className="zg-game-thumb"><img src={imageFor(game)} alt={`Capa de ${game.title}`} loading="lazy" /><span className="zg-play-mark"><span aria-hidden="true">↗</span></span></div>
        <div className="zg-game-info"><strong>{game.title}</strong><small>{label}</small></div>
      </Link>)}</div> : <div className="zg-empty"><h2>Esta categoria ainda não tem jogos publicados.</h2><p>Volte ao catálogo para descobrir outros clássicos.</p></div>}

      <div className="zg-detail-back"><Link href="/">← Voltar para todos os jogos</Link><Link href="/#categorias">Explorar outras categorias →</Link></div>
      <footer className="zg-footer"><img src="/brand/zapgame-logo.svg" alt="Zap Game" /><span>Um memorial vivo dos jogos que marcaram época. © Zap Game · <Link href="/sobre">Sobre</Link> · <Link href="/privacidade">Privacidade</Link></span></footer>
    </div>
  </main>
}
