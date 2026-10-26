import type { MetadataRoute } from 'next'
import { catalogGames, categoryLabels } from '@/lib/game-catalog'
import { getGamePixGames } from '@/lib/gamepix-catalog'
import { hasDistinctiveGameSummary } from '@/lib/game-seo'
import { intentGuides } from '@/lib/intent-guides'

const siteOrigin = 'https://www.zapgame.com.br'
export const revalidate = 600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const gamePixGames = await getGamePixGames()
  const categoriesWithGames = new Set([...catalogGames, ...gamePixGames].map((game) => game.category))
  const categoryPages: MetadataRoute.Sitemap = Object.keys(categoryLabels)
    .filter((category) => categoriesWithGames.has(category))
    .map((category) => ({
      url: `${siteOrigin}/jogos/categoria/${category}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
  const staticGamePages: MetadataRoute.Sitemap = catalogGames.filter((game) => hasDistinctiveGameSummary(game.summary)).map((game) => ({
    url: `${siteOrigin}/jogos/${game.slug}`,
    changeFrequency: 'monthly',
    priority: 0.65,
    images: [`${siteOrigin}${game.imagePath}`],
  }))
  const gamePixPages: MetadataRoute.Sitemap = gamePixGames.filter((game) => Boolean(game.editorial)).map((game) => ({
    url: `${siteOrigin}/jogos/${game.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
    images: game.imageUrl ? [game.imageUrl] : undefined,
  }))

  return [
    { url: siteOrigin, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteOrigin}/sobre`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${siteOrigin}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteOrigin}/contato`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${siteOrigin}/guias`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteOrigin}/guias/comparativo-jogos-de-navegador`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteOrigin}/guias/qual-jogo-escolher`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteOrigin}/guias/jogos-para-partidas-curtas`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteOrigin}/guias/jogos-para-jogar-com-amigos`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteOrigin}/guias/como-escolher-jogos-de-navegador`, changeFrequency: 'monthly', priority: 0.6 },
    ...intentGuides.map((guide) => ({ url: `${siteOrigin}/guias/tema/${guide.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    { url: `${siteOrigin}/termos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteOrigin}/direitos-autorais`, changeFrequency: 'yearly', priority: 0.3 },
    ...categoryPages,
    ...staticGamePages,
    ...gamePixPages,
  ]
}
