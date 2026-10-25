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
import { hasDistinctiveGameSummary } from '@/lib/game-seo'
import { TrackedPlayLink } from '@/components/tracked-play-link'
import { GameDiscoveryProgress } from '@/components/game-discovery-progress'

const siteOrigin = 'https://www.zapgame.com.br'
type Props = { params: Promise<{ slug: string }> }
type DetailGame = CatalogGame | GamePixCatalogGame

export const dynamicParams = true
export const revalidate = 3600

function gameImage(game: DetailGame) {
  return 'imagePath' in game ? game.imagePath : game.imageUrl
}

function gameCategory(game: DetailGame) {
  return categoryLabels[game.category] ?? 'Jogos online'
}

function gameSummary(game: DetailGame) {
  if ('editorial' in game && game.editorial?.description) return game.editorial.description
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
  if (!game) return {
    title: 'Jogo não encontrado | Zap Game',
    description: 'Esta ficha não existe ou não está publicada no Zap Game. Volte ao catálogo para explorar outros jogos.',
    robots: { index: false, follow: true },
    alternates: null,
    openGraph: null,
    twitter: null,
  }

  const baseTitle = `${game.title} | Zap Game`
  const descriptiveTitle = `${game.title}: jogo de ${gameCategory(game)} | Zap Game`
  const title = baseTitle.length < 30 && descriptiveTitle.length <= 60 ? descriptiveTitle : baseTitle
  const description = metaDescription(game)
  const canonical = `/jogos/${game.slug}`
  const image = gameImage(game)
  const indexable = 'editorial' in game ? Boolean(game.editorial) : hasDistinctiveGameSummary(game.summary)

  return {
    title,
    description,
    applicationName: 'Zap Game',
    alternates: { canonical },
    robots: { index: indexable, follow: true, googleBot: { index: indexable, follow: true, 'max-image-preview': 'large' } },
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
  const gamePixGames = game.source === 'gamepix' ? await getGamePixGames() : []
  const sourceName = game.source === 'internet-archive' ? 'Internet Archive' : game.source === 'gamepix' ? 'GamePix' : 'GitHub Pages'
  const playHint = game.source === 'internet-archive' ? 'A versão arquivada abre em uma nova aba.' : game.source === 'gamepix' ? 'A versão disponível pelo GamePix abre em uma nova aba.' : 'A versão do navegador abre em uma nova aba.'
  const hasDistinctSource = game.sourceUrl !== game.launchUrl
  const summaryAttribution = 'editorial' in game && game.editorial
    ? 'Texto editorial do Zap Game, baseado na proposta informada pelo parceiro'
    : game.source === 'internet-archive'
    ? game.summaryOrigin === 'internet-archive-translation'
      ? 'Descrição traduzida do registro do Internet Archive'
      : game.summaryOrigin === 'archive-placeholder'
        ? 'Descrição específica ainda não disponível no registro consultado'
        : 'Descrição do registro do Internet Archive'
    : game.source === 'gamepix' ? 'Descrição fornecida pelo GamePix' : 'Descrição editorial do Zap Game'
  const relatedGames = [...catalogGames.filter((item) => item.category === game.category && item.slug !== game.slug), ...gamePixGames.filter((item) => item.category === game.category && item.slug !== game.slug)]
    .sort((a, b) => {
      const aEditorial = 'editorial' in a && a.editorial ? 1 : 0
      const bEditorial = 'editorial' in b && b.editorial ? 1 : 0
      if (aEditorial !== bEditorial) return bEditorial - aEditorial
      if ('providerRank' in a && 'providerRank' in b) return a.providerRank - b.providerRank
      if ('providerRank' in a) return -1
      if ('providerRank' in b) return 1
      return compareCatalogPopularity(a, b)
    })
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
    ...(hasDistinctSource ? { sameAs: game.sourceUrl } : {}),
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
            <div className="zg-detail-badges"><span>{'editorial' in game && game.editorial ? 'TEXTO EDITORIAL ZAP GAME' : 'FICHA DO CATÁLOGO'}</span><span>{category}</span><span>FONTE {sourceName.toUpperCase()}</span></div>
            <p className="zg-kicker">Memorial de jogos · {category}</p>
            <h1>{game.title}</h1>
            <p className="zg-detail-summary">{description}</p>
            <p className="zg-kicker">{summaryAttribution}</p>
            <div className="zg-detail-tags">{categoryHref ? <Link href={categoryHref}>{category}</Link> : <span>{category}</span>}<span>Fonte: {sourceName}</span></div>
            <div className="zg-detail-actions">
              <TrackedPlayLink className="zg-primary-btn zg-detail-primary" href={game.launchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Jogar agora: ${game.title}. Abre em uma nova aba no ${sourceName}.`} gameSlug={game.slug} gameSource={game.source} gameTitle={game.title}>Jogar agora<span aria-hidden="true">↗</span></TrackedPlayLink>
              {hasDistinctSource ? <a className="zg-secondary-btn" href={game.sourceUrl} target="_blank" rel="noopener noreferrer">Ver registro da fonte</a> : <span className="zg-secondary-btn" aria-label={`Fonte: ${sourceName}`}>Fonte: {sourceName}</span>}
            </div>
            <p className="zg-play-reassurance"><span aria-hidden="true">↗</span>{playHint}</p>
          </div>
          <figure className="zg-detail-cover"><img src={image} alt={`Capa de ${game.title}`} width="640" height="432" fetchPriority="high" decoding="async" /><figcaption>Imagem de referência de {game.title}</figcaption></figure>
        </section>

        <section className="zg-detail-information">
          <div>
            <p className="zg-kicker">Sobre o jogo</p>
            <h2>{game.title} no acervo Zap Game</h2>
            <p>Esta ficha reúne a descrição e os dados que estão disponíveis na fonte indicada. Crédito, data e assuntos abaixo reproduzem o que informa o serviço de origem; não confirmam, por si só, autoria ou data de lançamento.</p>
            <p>O botão abre a versão disponível em {sourceName}. A disponibilidade e a compatibilidade dependem do serviço externo.</p>
          </div>
          <dl className="zg-game-facts">
            <div><dt>Categoria</dt><dd>{categoryHref ? <Link href={categoryHref}>{category}</Link> : category}</dd></div>
            <div><dt>Fonte</dt><dd>{sourceName}</dd></div>
            {'creator' in game && game.creator && <div><dt>Crédito informado na fonte</dt><dd>{game.creator}</dd></div>}
            {'archiveDate' in game && game.archiveDate && <div><dt>Data informada na fonte</dt><dd>{game.archiveDate}</dd></div>}
            {'archiveSubjects' in game && game.archiveSubjects.length > 0 && <div><dt>Assuntos do registro</dt><dd>{game.archiveSubjects.join(' · ')}</dd></div>}
          </dl>
        </section>

        <GameDiscoveryProgress gameSlug={game.slug} gameTitle={game.title} category={category} categoryHref={categoryHref ?? '/'} />

        {'editorial' in game && game.editorial && <section className="zg-detail-information">
          <div>
            <p className="zg-kicker">Curadoria Zap Game</p>
            <h2>Por que conhecer {game.title}?</h2>
            {game.editorial.headline && <p className="zg-kicker">{game.editorial.headline}</p>}
            <p>{game.editorial.whyPlay}</p>
            <p>{game.editorial.editorialNote}</p>
          </div>
          <dl className="zg-game-facts">
            <div><dt>Indicado para</dt><dd>{game.editorial.audience}</dd></div>
            {game.editorial.session && <div><dt>Sessão</dt><dd>{game.editorial.session}</dd></div>}
            {game.editorial.controls && <div><dt>Controles</dt><dd>{game.editorial.controls}</dd></div>}
            {game.editorial.tags && <div><dt>Temas</dt><dd>{game.editorial.tags.join(' · ')}</dd></div>}
            <div><dt>Tipo de conteúdo</dt><dd>Comentário editorial baseado na descrição informada pelo parceiro</dd></div>
          </dl>
        </section>}

        {relatedGames.length > 0 && <section className="zg-related-section">
          <div className="zg-section-head"><div><p className="zg-kicker">Continue explorando</p><h2>Jogos relacionados</h2></div><Link className="zg-related-all" href={`/jogos/categoria/${game.category}`}>Ver {category.toLocaleLowerCase('pt-BR')} <span aria-hidden="true">↗</span></Link></div>
          <div className="zg-related-grid">{relatedGames.map((related) => <Link className="zg-related-card" key={related.id} href={`/jogos/${related.slug}`}><img src={gameImage(related)} alt={`Capa de ${related.title}`} loading="lazy" /><span>{related.title}</span><small>{categoryLabels[related.category] ?? related.category}</small></Link>)}</div>
        </section>}

        <section className="zg-detail-information">
          <div><p className="zg-kicker">Continue a descoberta</p><h2>Escolha o próximo jogo</h2><p>Use o <Link href="/guias/qual-jogo-escolher">quiz de recomendação</Link> ou consulte o <Link href="/guias/comparativo-jogos-de-navegador">comparativo editorial</Link> para encontrar outra experiência.</p></div>
          <dl className="zg-game-facts"><div><dt>Mais guias</dt><dd><Link href="/guias">Ver a central de guias</Link></dd></div><div><dt>Correções</dt><dd><Link href="/contato">Falar com o Zap Game</Link></dd></div></dl>
        </section>

        <div className="zg-mobile-playbar" aria-label="Ação principal do jogo">
          <div><strong>Pronto para jogar?</strong><small>{game.title}</small></div>
          <TrackedPlayLink className="zg-primary-btn" href={game.launchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Jogar agora: ${game.title}. Abre em uma nova aba no ${sourceName}.`} gameSlug={game.slug} gameSource={game.source} gameTitle={game.title} ctaPosition="mobile_sticky">Jogar agora<span aria-hidden="true">↗</span></TrackedPlayLink>
        </div>

        <div className="zg-detail-back"><Link href="/">← Voltar para todos os jogos</Link>{categoryHref && <Link href={categoryHref}>Explorar categoria {category} →</Link>}</div>
      </article>

      <footer className="zg-footer"><img src="/brand/zapgame-logo.svg" alt="Zap Game" /><span>Um memorial vivo dos jogos que marcaram época. © Zap Game · <Link href="/sobre">Sobre</Link> · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos</Link> · <Link href="/direitos-autorais">Direitos autorais</Link> · <Link href="/contato">Contato</Link></span></footer>
    </div>
  </main>
}
