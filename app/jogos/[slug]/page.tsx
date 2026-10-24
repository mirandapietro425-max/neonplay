import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  catalogGames,
  catalogGameBySlug,
  categoryLabels,
  compareCatalogPopularity,
  type CatalogGame,
} from '@/lib/game-catalog'
import { getGamePixGames, getGamePixGameBySlug, type GamePixCatalogGame } from '@/lib/gamepix-catalog'

const siteOrigin = 'https://www.zapgame.com.br'
type Props = { params: Promise<{ slug: string }> }
type DetailGame = CatalogGame | GamePixCatalogGame

export const dynamicParams = true
export const revalidate = 600

function gameImage(game: DetailGame) {
  return 'imagePath' in game ? game.imagePath : game.imageUrl
}

function gameCategory(game: DetailGame) {
  return categoryLabels[game.category] ?? 'Jogos online'
}

function gameSummary(game: DetailGame) {
  const summary = game.summary?.trim()
  return summary || `${game.title} é um jogo de ${gameCategory(game).toLocaleLowerCase('pt-BR')}. Consulte a ficha, explore jogos relacionados e abra a versão disponível no acervo do Zap Game.`
}

function metaDescription(game: DetailGame) {
  const summary = gameSummary(game).replace(/\s+/g, ' ').trim()
  return summary.length > 158 ? `${summary.slice(0, 155).trimEnd()}…` : summary
}

async function getGame(slug: string): Promise<DetailGame | null> {
  return catalogGameBySlug.get(slug) ?? getGamePixGameBySlug(slug)
}

export async function generateStaticParams() {
  const gamePixGames = await getGamePixGames()
  return [
    ...catalogGames.map((game) => ({ slug: game.slug })),
    ...gamePixGames.map((game) => ({ slug: game.slug })),
  ]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const game = await getGame(slug)
  if (!game) return { title: 'Jogo não encontrado | Zap Game', robots: { index: false, follow: true } }

  const title = `${game.title} | Zap Game`
  const description = metaDescription(game)
  const canonical = `/jogos/${game.slug}`
  const image = gameImage(game)

  return {
    title,
    description,
    applicationName: 'Zap Game',
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: {
      type: 'article',
      locale: 'pt_BR',
      siteName: 'Zap Game',
      url: canonical,
      title,
      description,
      images: [{ url: image, alt: `Capa de ${game.title}` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params
  const game = await getGame(slug)
  if (!game) notFound()

  const category = gameCategory(game)
  const categoryHref = categoryLabels[game.category] ? `/jogos/categoria/${game.category}` : null
  const image = gameImage(game)
  const description = gameSummary(game)
  const canonical = `${siteOrigin}/jogos/${game.slug}`
  const sourceName = game.source === 'internet-archive' ? 'Internet Archive' : game.source === 'gamepix' ? 'GamePix' : 'GitHub Pages'
  const playLabel = game.source === 'internet-archive' ? 'Abrir versão arquivada' : game.source === 'gamepix' ? 'Jogar no GamePix' : 'Abrir jogo no navegador'
  const relatedGames = catalogGames
    .filter((item) => item.category === game.category && item.slug !== game.slug)
    .sort(compareCatalogPopularity)
    .slice(0, 6)
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${siteOrigin}/` },
      ...(categoryHref ? [{ '@type': 'ListItem', position: 2, name: category, item: `${siteOrigin}${categoryHref}` }] : []),
      { '@type': 'ListItem', position: categoryHref ? 3 : 2, name: game.title, item: canonical },
    ],
  }
  const gameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description,
    url: canonical,
    image: image.startsWith('http') ? image : `${siteOrigin}${image}`,
    genre: category,
    gamePlatform: 'Navegador web',
    applicationCategory: 'GameApplication',
    inLanguage: 'pt-BR',
    sameAs: game.sourceUrl,
  }
  const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

  return <main className="zg-shell zg-detail-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd([gameSchema, breadcrumbSchema]) }} />
    <div className="zg-wrap">
      <header className="zg-topbar">
        <Link href="/" aria-label="Zap Game início"><img className="zg-logo" src="/brand/zapgame-logo.svg" alt="Zap Game" /></Link>
        <nav className="zg-nav" aria-label="Navegação principal"><Link href="/#catalogo">Jogos</Link><Link href="/#categorias">Categorias</Link><Link href="/#sobre">Sobre</Link></nav>
        <Link className="zg-top-cta zg-top-link" href="/">Voltar ao acervo</Link>
      </header>

      <article className="zg-detail-article">
        <nav className="zg-breadcrumbs" aria-label="Navegação estrutural">
          <Link href="/">Início</Link><span aria-hidden="true">/</span>
          {categoryHref && <><Link href={categoryHref}>{category}</Link><span aria-hidden="true">/</span></>}
          <span aria-current="page">{game.title}</span>
        </nav>

        <section className="zg-detail-hero">
          <div className="zg-detail-copy">
            <p className="zg-kicker">Memorial de jogos · {category}</p>
            <h1>{game.title}</h1>
            <p className="zg-detail-summary">{description}</p>
            <div className="zg-detail-tags">{categoryHref ? <Link href={categoryHref}>{category}</Link> : <span>{category}</span>}<span>Fonte: {sourceName}</span></div>
            <div className="zg-detail-actions">
              <a className="zg-primary-btn zg-detail-primary" href={game.launchUrl} target="_blank" rel="noopener noreferrer">{playLabel}<span aria-hidden="true">↗</span></a>
              <a className="zg-secondary-btn" href={game.sourceUrl} target="_blank" rel="noopener noreferrer">Ver registro original</a>
            </div>
          </div>
          <figure className="zg-detail-cover"><img src={image} alt={`Capa de ${game.title}`} /><figcaption>Imagem de referência de {game.title}</figcaption></figure>
        </section>

        <section className="zg-detail-information">
          <div>
            <p className="zg-kicker">Sobre o jogo</p>
            <h2>{game.title} no acervo Zap Game</h2>
            <p>Esta ficha de referência organiza a capa, a categoria e os metadados públicos disponíveis para o título.</p>
            <p>O link de abertura direciona para {sourceName}. A disponibilidade e a compatibilidade dependem do serviço externo.</p>
          </div>
          <dl className="zg-game-facts">
            <div><dt>Categoria</dt><dd>{categoryHref ? <Link href={categoryHref}>{category}</Link> : category}</dd></div>
            <div><dt>Fonte</dt><dd>{sourceName}</dd></div>
            {'creator' in game && game.creator && <div><dt>Autor informado no arquivo</dt><dd>{game.creator}</dd></div>}
            {'archiveDate' in game && game.archiveDate && <div><dt>Data informada no arquivo</dt><dd>{game.archiveDate}</dd></div>}
            {'archiveSubjects' in game && game.archiveSubjects.length > 0 && <div><dt>Assuntos do registro</dt><dd>{game.archiveSubjects.join(' · ')}</dd></div>}
          </dl>
        </section>

        {relatedGames.length > 0 && <section className="zg-related-section">
          <div className="zg-section-head"><div><p className="zg-kicker">Continue explorando</p><h2>Jogos relacionados</h2></div><Link className="zg-related-all" href={`/jogos/categoria/${game.category}`}>Ver {category.toLocaleLowerCase('pt-BR')} <span aria-hidden="true">↗</span></Link></div>
          <div className="zg-related-grid">{relatedGames.map((related) => <Link className="zg-related-card" key={related.id} href={`/jogos/${related.slug}`}><img src={related.imagePath} alt={`Capa de ${related.title}`} loading="lazy" /><span>{related.title}</span><small>{categoryLabels[related.category] ?? related.category}</small></Link>)}</div>
        </section>}

        <div className="zg-detail-back"><Link href="/">← Voltar para todos os jogos</Link>{categoryHref && <Link href={categoryHref}>Explorar categoria {category} →</Link>}</div>
      </article>

      <footer className="zg-footer"><img src="/brand/zapgame-logo.svg" alt="Zap Game" /><span>Um memorial vivo dos jogos que marcaram época. © Zap Game</span></footer>
    </div>
  </main>
}
