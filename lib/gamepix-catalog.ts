import { gamePixEditorial, type GamePixEditorial } from '@/lib/gamepix-editorial'

const GAMEPIX_CATALOG_LIMIT = 300

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

const GAMEPIX_CATEGORY_IDS: Record<string, string> = {
  'a46f6ba4-0fe9-419e-945c-12d4ab0cf582': 'puzzle',
  '5690a2a7-24a5-4ad5-80d0-289a7e53fd37': 'estrategia',
  '1f9c4256-9f5c-4463-b072-c4d2f266719e': 'esporte',
  'e6e804fa-d074-4418-9b1c-a8db99364e3a': 'arcade',
  '13faf451-da07-432b-b7da-73bdbbe03a8b': 'aventura',
}

function normalizeGamePixCategory(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function gamePixValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(gamePixValues)
  return typeof value === 'string' && value.trim() ? [value.trim()] : []
}

function categoryFromValue(value: string): string | null {
  const raw = value.trim().toLocaleLowerCase('en-US')
  if (GAMEPIX_CATEGORY_IDS[raw]) return GAMEPIX_CATEGORY_IDS[raw]
  const normalized = normalizeGamePixCategory(value)
  if (/\b(?:puzzles?|quebra cabeca|logic|mahjong|match|jigsaw|sudoku|solitaire|word search|brain teaser|block puzzle)\b/.test(normalized)) return 'puzzle'
  if (/\b(?:adventure|aventura|rpg)\b/.test(normalized)) return 'aventura'
  if (/\b(?:racing|race|corrida|driving)\b/.test(normalized)) return 'corrida'
  if (/\b(?:sports?|esporte|football|soccer|basketball|tennis)\b/.test(normalized)) return 'esporte'
  if (/\b(?:strategy|estrategia|tower defense)\b/.test(normalized)) return 'estrategia'
  if (/\b(?:action|acao|shooter|fighting)\b/.test(normalized)) return 'acao'
  if (/\b(?:platform|platformer|plataforma)\b/.test(normalized)) return 'plataforma'
  if (/\b(?:arcade|io|clicker)\b/.test(normalized)) return 'arcade'
  if (/\b(?:casual|hypercasual|hyper casual)\b/.test(normalized)) return 'casual'
  if (/\b(?:quiz|trivia|wordle)\b/.test(normalized)) return 'quiz'
  return null
}

function gamePixCategory(game: Record<string, unknown>) {
  const primaryValues = [...gamePixValues(game.category), ...gamePixValues(game.genre)]
  for (const value of primaryValues) {
    const category = categoryFromValue(value)
    if (category) return category
  }

  const secondaryValues = [...gamePixValues(game.categories), ...gamePixValues(game.genres), ...gamePixValues(game.tags)]
  for (const value of secondaryValues) {
    const category = categoryFromValue(value)
    if (category) return category
  }

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
    const candidates = records.flatMap((game) => {
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
    }).sort((a, b) => b.quality - a.quality)

    const seenProviderIds = new Set<string>()
    const seenSlugs = new Set<string>()
    const ranked = candidates.filter((game) => {
      if (seenProviderIds.has(game.providerId) || seenSlugs.has(game.slug)) return false
      seenProviderIds.add(game.providerId)
      seenSlugs.add(game.slug)
      return true
    }).slice(0, GAMEPIX_CATALOG_LIMIT)

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
