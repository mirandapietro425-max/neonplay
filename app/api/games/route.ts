import { NextResponse } from 'next/server'
import { catalogGames } from '@/lib/game-catalog'
import { getGamePixGames } from '@/lib/gamepix-catalog'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim().toLocaleLowerCase('pt-BR') ?? ''
  const category = searchParams.get('category') ?? 'todos'
  const requestedSource = searchParams.get('source') ?? 'todos'

  const archiveAndBrowserGames = catalogGames.map((game) => ({
    ...game,
    route: `/jogos/${game.slug}`,
    status: game.source === 'browser-games' ? 'online' : 'catalogado',
  }))
  const gamePixGames = await getGamePixGames()
  const allGames = [...archiveAndBrowserGames, ...gamePixGames]
  const sourceGames = requestedSource === 'gamepix'
    ? gamePixGames
    : requestedSource === 'todos'
      ? allGames
      : allGames.filter((game) => game.source === requestedSource)
  const games = sourceGames
    .filter((game) => category === 'todos' || game.category === category)
    .filter((game) => !query || game.title.toLocaleLowerCase('pt-BR').includes(query))

  return NextResponse.json(
    { games, total: games.length, sources: ['GamePix'] },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } },
  )
}
