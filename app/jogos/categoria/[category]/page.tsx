import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { catalogGames, categoryLabels, compareCatalogPopularity } from '@/lib/game-catalog'
import { getGamePixGames, type GamePixCatalogGame } from '@/lib/gamepix-catalog'
import { hasDistinctiveGameSummary } from '@/lib/game-seo'
import { TrackedGameLink } from '@/components/tracked-game-link'

const siteOrigin = 'https://www.zapgame.com.br'
const categoryIds = Object.keys(categoryLabels)
type Props = { params: Promise<{ category: string }> }
type CategoryGame = (typeof catalogGames)[number] | GamePixCatalogGame

const categoryIntros: Record<string, string> = {
  acao: 'Reviva combates, desafios e aventuras de ação preservados em diferentes gerações de jogos de navegador.',
  arcade: 'Partidas rápidas, reflexos e clássicos de arcade para explorar direto pelo navegador.',
  aventura: 'Explore histórias, escolhas e mundos de aventura que marcaram a memória dos jogos online.',
  casual: 'Jogos casuais para uma pausa rápida, com experiências simples e partidas fáceis de começar no navegador.',
  corrida: 'Acelere por pistas e desafios de corrida preservados no acervo de jogos de navegador.',
  esporte: 'Reviva jogos de esporte e partidas clássicas disponíveis no acervo do Zap Game.',
  estrategia: 'Planeje cada movimento em jogos de estratégia, defesa e gestão de recursos.',
  plataforma: 'Salte, desvie de obstáculos e explore aventuras de plataforma do acervo histórico.',
  puzzle: 'Quebra-cabeças, lógica e desafios para resolver jogada por jogada.',
  quiz: 'Teste sua memória e conhecimento com jogos de perguntas e desafios de quiz.',
}

type CategoryGuideLink = { href: string; title: string; description: string }
type FeaturedGame = GamePixCatalogGame & { editorial: NonNullable<GamePixCatalogGame['editorial']> }

const categoryGuideLinks: Partial<Record<string, CategoryGuideLink[]>> = {
  acao: [{ href: '/guias/jogos-para-partidas-curtas', title: 'Jogos de navegador para partidas curtas', description: 'O guia inclui ação entre as opções de ritmo direto e explica por que conferir a proposta de cada ficha.' }],
  arcade: [{ href: '/guias/jogos-para-partidas-curtas', title: 'Jogos de navegador para partidas curtas', description: 'Compare propostas de arcade e veja o que observar quando você tem pouco tempo para jogar.' }],
  aventura: [{ href: '/guias/como-escolher-jogos-de-navegador', title: 'Como escolher um jogo de navegador', description: 'Compare categorias e propostas para encontrar uma aventura que combine com seu momento.' }],
  casual: [{ href: '/guias/tema/jogos-de-navegador-no-celular', title: 'Jogos de navegador para jogar no celular', description: 'Veja critérios para avaliar experiências casuais e compatibilidade no dispositivo.' }],
  esporte: [
    { href: '/guias/tema/jogos-de-esporte-no-navegador', title: 'Jogos de esporte para jogar no navegador', description: 'Compare partidas rápidas, campeonatos e diferentes propostas esportivas.' },
    { href: '/guias/jogos-para-jogar-com-amigos', title: 'Jogos para jogar com amigos online', description: 'Entenda como conferir se a disputa é local, online ou para dois jogadores.' },
  ],
  estrategia: [{ href: '/guias/como-escolher-jogos-de-navegador', title: 'Como escolher um jogo de navegador', description: 'O guia compara proposta, progressão e categorias como estratégia e aventura.' }],
  puzzle: [{ href: '/guias/jogos-para-partidas-curtas', title: 'Jogos de navegador para partidas curtas', description: 'Veja como escolher desafios de lógica para uma pausa rápida, sem presumir a duração pela categoria.' }],
}

const relatedCategorySlugs: Record<string, string[]> = {
  acao: ['arcade', 'aventura', 'esporte'],
  arcade: ['acao', 'casual', 'corrida'],
  aventura: ['plataforma', 'acao'],
  casual: ['arcade', 'puzzle', 'quiz'],
  corrida: ['esporte', 'arcade'],
  esporte: ['corrida', 'acao'],
  estrategia: ['puzzle', 'aventura', 'quiz'],
  plataforma: ['aventura', 'arcade'],
  puzzle: ['quiz', 'casual', 'estrategia'],
  quiz: ['puzzle', 'estrategia', 'casual'],
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

function isIndexableEditorialGame(game: CategoryGame): game is FeaturedGame {
  return game.source === 'gamepix' && game.editorial !== undefined && hasDistinctiveGameSummary(game.editorial.description)
}

function hasUsefulEditorialText(value?: string) {
  const normalized = value?.replace(/\s+/g, ' ').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  if (!normalized) return false
  return !/\b(?:a confirmar|nao (?:(?:foi|foram) )?informad[oa]s?|nao (?:foi )?descrit[oa]s?|desconhecid[oa]s?|indisponivel)\b/.test(normalized)
}

function hasValidVerificationDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function editorialCompletenessScore(game: FeaturedGame) {
  const editorial = game.editorial
  const textFields: Array<[string | undefined, number]> = [
    [editorial.description, 3],
    [editorial.whyPlay, 3],
    [editorial.audience, 1],
    [editorial.headline, 1],
    [editorial.objective, 2],
    [editorial.controls, 1],
    [editorial.session, 1],
    [editorial.difficulty, 1],
  ]
  let score = textFields.reduce((total, [value, weight]) => total + (hasUsefulEditorialText(value) ? weight : 0), 0)
  if (editorial.playerMode && editorial.playerMode.modes.length > 0 && hasUsefulEditorialText(editorial.playerMode.label)) score += 2
  if (editorial.compatibility?.length) score += 2
  if (editorial.tags?.some(hasUsefulEditorialText)) score += 1
  if (hasValidVerificationDate(editorial.verifiedAt)) score += 2
  return score
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
  const description = games.length > 0
    ? `${categoryIntros[category]} Explore ${games.length} ${games.length === 1 ? 'jogo' : 'jogos'} de ${label.toLocaleLowerCase('pt-BR')} no Zap Game.`
    : 'Esta categoria ainda não tem jogos publicados no Zap Game. Explore as opções disponíveis no catálogo de jogos de navegador.'
  const canonical = `/jogos/categoria/${category}`
  const image = `/brand/category-${category}.webp`
  return {
    title,
    description: description.length > 158 ? `${description.slice(0, 155).trimEnd()}…` : description,
    alternates: { canonical },
    robots: { index: games.length > 0, follow: true },
    openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Zap Game', url: canonical, title, description, images: [{ url: image, alt: `Jogos de ${label} no Zap Game` }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const label = categoryLabels[category]
  if (!label) notFound()
  const gamePixGames = await getGamePixGames()
  const allGames: CategoryGame[] = [...catalogGames, ...gamePixGames]
  const games = allGames.filter((game) => game.category === category).sort(compareCategoryGames)
  const description = categoryIntros[category]
  const editorialGames = games.filter(isIndexableEditorialGame)
    .sort((a, b) => editorialCompletenessScore(b) - editorialCompletenessScore(a) || compareCategoryGames(a, b))
    .slice(0, 3)
  const categoryCounts = new Map<string, number>()
  for (const game of allGames) categoryCounts.set(game.category, (categoryCounts.get(game.category) ?? 0) + 1)
  const relatedCategoryLinks = (relatedCategorySlugs[category] ?? []).flatMap((slug) => {
    const relatedLabel = categoryLabels[slug]
    const count = categoryCounts.get(slug) ?? 0
    return relatedLabel && count > 0 ? [{ slug, label: relatedLabel, count }] : []
  })
  const contextualGuides = categoryGuideLinks[category] ?? []
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

      {editorialGames.length > 0 && <section className="zg-category-editorial" aria-labelledby="category-editorial-title">
        <div className="zg-category-editorial-head"><div><p className="zg-kicker">Seleção do Zap Game</p><h2 id="category-editorial-title">Comece por estas fichas</h2></div><span>Curadoria original</span></div>
        <div className="zg-category-editorial-grid">{editorialGames.map((game) => (
          <TrackedGameLink key={`editorial-${game.id}`} href={`/jogos/${game.slug}`} className="zg-category-editorial-card" gameSlug={game.slug} gameTitle={game.title} gameSource={game.source} gameCategory={game.category} sourceCategory={category} placement="category_featured">
            <div><b>{game.title}</b><p>{game.editorial.description}</p></div><span aria-hidden="true">↗</span>
          </TrackedGameLink>
        ))}</div>
      </section>}

      {games.length > 0 ? (
        <div className="zg-game-grid zg-category-grid">{games.map((game) => (
          <TrackedGameLink key={game.id} className="zg-game-card" href={`/jogos/${game.slug}`} ariaLabel={`Ver ficha de ${game.title} e jogar agora`} gameSlug={game.slug} gameTitle={game.title} gameSource={game.source} gameCategory={game.category} sourceCategory={category} placement="category_grid">
            {game.source === 'browser-games' && <b className="zg-browser-tag">Jogue agora</b>}
            {game.source === 'gamepix' && <b className="zg-gamepix-tag">GamePix</b>}
            <div className="zg-game-thumb"><img src={imageFor(game)} alt={`Capa de ${game.title}`} loading="lazy" /><span className="zg-play-mark"><span aria-hidden="true">↗</span></span></div>
            <div className="zg-game-info"><strong>{game.title}</strong><small>{label}</small></div>
          </TrackedGameLink>
        ))}</div>
      ) : <div className="zg-empty"><h2>Esta categoria ainda não tem jogos publicados.</h2><p>Volte ao catálogo para descobrir outros clássicos.</p></div>}

      {(contextualGuides.length > 0 || relatedCategoryLinks.length > 0) && <section className="zg-category-discovery" aria-labelledby="category-discovery-title">
        <div className="zg-category-discovery-head"><div><p className="zg-kicker">PRÓXIMOS PASSOS</p><h2 id="category-discovery-title">Continue explorando</h2></div><span>Guias e categorias relacionadas</span></div>
        <div className="zg-category-discovery-grid">
          {contextualGuides.map((guide) => <Link key={guide.href} className="zg-category-discovery-card" href={guide.href}>
            <span>Guia relacionado</span><strong>{guide.title}</strong><p>{guide.description}</p><small>Leia o guia <span aria-hidden="true">→</span></small>
          </Link>)}
          {relatedCategoryLinks.map((related) => <Link key={related.slug} className="zg-category-discovery-card" href={`/jogos/categoria/${related.slug}`}>
            <span>Categoria relacionada</span><strong>Jogos de {related.label}</strong><p>Explore {related.count} {related.count === 1 ? 'jogo' : 'jogos'} desta categoria.</p><small>Abrir categoria <span aria-hidden="true">→</span></small>
          </Link>)}
        </div>
      </section>}

      <div className="zg-detail-back"><Link href="/">← Voltar para todos os jogos</Link><Link href="/#categorias">Explorar outras categorias →</Link></div>
      <footer className="zg-footer"><img src="/brand/zapgame-logo.svg" alt="Zap Game" /><span>Um memorial vivo dos jogos que marcaram época. © Zap Game · <Link href="/sobre">Sobre</Link> · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos</Link> · <Link href="/direitos-autorais">Direitos autorais</Link> · <Link href="/contato">Contato</Link></span></footer>
    </div>
  </main>
}
