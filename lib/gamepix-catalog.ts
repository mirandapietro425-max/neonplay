import { gamePixEditorial, type GamePixEditorial } from '@/lib/gamepix-editorial'

export type GamePixCatalogGame = {
  id: string
  providerId: string
  title: string
  category: string
  kind: 'game'
  launchUrl: string
  sourceUrl: string
  imageUrl: string
  slug: string
  summary: string
  source: 'gamepix'
  status: 'online'
  providerRank: number
  editorial?: GamePixEditorial
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function gamePixSlug(title: string, providerId: string) {
  return `gamepix-${slugify(title)}-${slugify(providerId)}`
}

function gamePixUrl(game: Record<string, unknown>) {
  const url = typeof game.url === 'string' ? game.url : typeof game.game_url === 'string' ? game.game_url : ''
  return url
}

function gamePixImage(game: Record<string, unknown>, id: string) {
  const image = [game.thumbnailUrl, game.thumbnailUrl100, game.image, game.thumbnail, game.thumb, game.banner, game.image_url]
    .find((value) => typeof value === 'string' && value.length > 0)
  if (typeof image === 'string') return image
  return id ? `https://img.gamepix.com/games/${encodeURIComponent(id)}/cover.jpg?w=640` : ''
}

function gamePixLaunchUrl(game: Record<string, unknown>, id: string) {
  return gamePixUrl(game) || (id ? `https://games.gamepix.com/games/${encodeURIComponent(id)}/index.html` : '')
}

function gamePixCategory(game: Record<string, unknown>) {
  const values = [game.category, game.genre, game.genres, game.categories, game.tags]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map((value) => value.toLocaleLowerCase('pt-BR'))
  const value = values.join(' ')
  if (/action|acao|shooter|fighting/.test(value)) return 'acao'
  if (/adventure|aventura|rpg/.test(value)) return 'aventura'
  if (/racing|race|corrida|driving/.test(value)) return 'corrida'
  if (/sport|esporte|football|soccer/.test(value)) return 'esporte'
  if (/strategy|estrategia|tower defense/.test(value)) return 'estrategia'
  if (/puzzle|quebra|match|mahjong|junior/.test(value)) return 'puzzle'
  if (/platform|plataforma/.test(value)) return 'plataforma'
  if (/arcade|io|clicker/.test(value)) return 'arcade'
  if (/casual|hypercasual/.test(value)) return 'casual'
  return 'gamepix'
}

function gamePixQuality(game: Record<string, unknown>) {
  const score = typeof game.rkScore === 'number' ? game.rkScore : typeof game.rks === 'number' ? game.rks : 0
  const featured = game.featured === true ? 1 : 0
  const hasWideCover = game.orientation === 'landscape' ? 1 : 0
  return featured * 100 + score * 10 + hasWideCover
}

function plainText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000)
}

export async function getGamePixGames(): Promise<GamePixCatalogGame[]> {
  const sid = process.env.GAMEPIX_API_KEY
  if (!sid) return []

  try {
    const response = await fetch(`https://games.gamepix.com/games?sid=${encodeURIComponent(sid)}&limit=1000&offset=0`, {
      next: { revalidate: 600 },
    })
    if (!response.ok) return []
    const payload = await response.json() as { data?: Record<string, unknown>[]; games?: Record<string, unknown>[] } | Record<string, unknown>[]
    const records = Array.isArray(payload) ? payload : payload.data ?? payload.games ?? []
    const ranked = records.flatMap((game) => {
      const providerId = typeof game.id === 'string' ? game.id : typeof game.gid === 'string' ? game.gid : ''
      const title = (typeof game.title === 'string' ? game.title : typeof game.name === 'string' ? game.name : '').trim()
      const launchUrl = gamePixLaunchUrl(game, providerId)
      const imageUrl = gamePixImage(game, providerId)
      if (!providerId || !title || !launchUrl) return []
      const summary = plainText(game.description ?? game.shortDescription ?? game.short_description)
      return [{
        providerId,
        title,
        category: gamePixCategory(game),
        kind: 'game' as const,
        launchUrl,
        sourceUrl: launchUrl,
        imageUrl,
        slug: gamePixSlug(title, providerId),
        summary,
        source: 'gamepix' as const,
        status: 'online' as const,
        editorial: gamePixEditorial[providerId],
        quality: gamePixQuality(game),
      }]
    }).sort((a, b) => b.quality - a.quality).slice(0, 120)

    return ranked.map((game, index) => ({
      ...game,
      id: `gamepix-${game.providerId}`,
      providerRank: index + 1,
    }))
  } catch {
    return []
  }
}

export async function getGamePixGameBySlug(slug: string) {
  return (await getGamePixGames()).find((game) => game.slug === slug) ?? null
}
