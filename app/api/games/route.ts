import { NextResponse } from 'next/server'
import { catalogGames } from '@/lib/game-catalog'
import { getGamePixGames } from '@/lib/gamepix-catalog'

async function getNebulaGames() {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/gh/GoatTech-42/NEBULACDN@main/games.json', { next: { revalidate: 3600 } })
    if (!response.ok) return []
    const payload = await response.json() as { games?: { id?: string; name?: string; slug?: string; file?: string; category?: string }[] }
    const categories: Record<string, string> = { Action: 'acao', Adventure: 'aventura', Arcade: 'arcade', Casual: 'casual', Racing: 'corrida', Sports: 'esporte', Strategy: 'estrategia', Puzzle: 'puzzle', Platformer: 'plataforma', Shooter: 'acao', Other: 'arcade' }
    return (payload.games ?? []).flatMap((game) => {
      const id = game.slug || game.id || ''
      const title = game.name?.trim() || ''
      if (!id || !title || !game.file) return []
      return [{ id: `nebula-${id}`, title, category: categories[game.category || ''] ?? 'arcade', kind: 'game' as const, launchUrl: `/api/nebula/${encodeURIComponent(id)}`, route: `/jogos/nebula-${encodeURIComponent(id)}`, status: 'online', source: 'nebula' as const }]
    })
  } catch { return [] }
}

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
  const [nebulaGames, gamePixGames] = await Promise.all([getNebulaGames(), getGamePixGames()])
  const allGames = [...archiveAndBrowserGames, ...nebulaGames, ...gamePixGames]
  const sourceGames = requestedSource === 'gamepix'
    ? gamePixGames
    : requestedSource === 'todos'
      ? allGames
      : allGames.filter((game) => game.source === requestedSource)
  const games = sourceGames
    .filter((game) => category === 'todos' || game.category === category)
    .filter((game) => !query || game.title.toLocaleLowerCase('pt-BR').includes(query))

  return NextResponse.json(
    { games, total: games.length, sources: ['Zap Game', 'Internet Archive', 'GamePix', 'NEBULA'] },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } },
  )
}
