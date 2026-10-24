import type { MetadataRoute } from 'next'
import { catalogGames, categoryLabels } from '@/lib/game-catalog'
import { getGamePixGames } from '@/lib/gamepix-catalog'

const siteOrigin = 'https://www.zapgame.com.br'
export const revalidate = 600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const gamePixGames = await getGamePixGames()
  const categoryPages: MetadataRoute.Sitemap = Object.keys(categoryLabels).map((category) => ({
    url: `${siteOrigin}/jogos/categoria/${category}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))
  const staticGamePages: MetadataRoute.Sitemap = catalogGames.map((game) => ({
    url: `${siteOrigin}/jogos/${game.slug}`,
    changeFrequency: 'monthly',
    priority: 0.65,
    images: [`${siteOrigin}${game.imagePath}`],
  }))
  const gamePixPages: MetadataRoute.Sitemap = gamePixGames.map((game) => ({
    url: `${siteOrigin}/jogos/${game.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
    images: game.imageUrl ? [game.imageUrl] : undefined,
  }))

  return [
    { url: `${siteOrigin}/`, changeFrequency: 'weekly', priority: 1 },
    ...categoryPages,
    ...staticGamePages,
    ...gamePixPages,
  ]
}
