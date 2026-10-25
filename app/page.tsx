import HomeClient from '@/app/home-client'
import { catalogGames, compareCatalogPopularity } from '@/lib/game-catalog'
import { getGamePixGames } from '@/lib/gamepix-catalog'

const INITIAL_CARD_COUNT = 24

export const revalidate = 3600

export default async function Page() {
  const gamePixGames = await getGamePixGames()
  const localGames = [...catalogGames].sort(compareCatalogPopularity).slice(0, INITIAL_CARD_COUNT)
  const remainingCount = Math.max(0, INITIAL_CARD_COUNT - localGames.length)
  const initialGamePixGames = gamePixGames.slice(0, remainingCount).map((game) => ({
    id: game.id,
    title: game.title,
    category: game.category,
    imageUrl: game.imageUrl,
    slug: game.slug,
    source: game.source,
    providerRank: game.providerRank,
  }))

  return <HomeClient initialGames={[...localGames, ...initialGamePixGames]} />
}
