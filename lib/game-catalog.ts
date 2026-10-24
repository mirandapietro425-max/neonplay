import { archiveGameMetadata } from '@/lib/archive-game-metadata'
import { archiveGameTranslations } from '@/lib/archive-game-translations'
import { flashArchiveEntries } from '@/lib/flash-archive-games'
import { gameSearchSignals } from '@/lib/game-search-ranking'

export type CatalogSource = 'internet-archive' | 'browser-games'

export type CatalogGame = {
  id: string
  title: string
  category: string
  kind: 'game'
  source: CatalogSource
  launchUrl: string
  sourceUrl: string
  imagePath: string
  browser: boolean
  summary: string
  creator: string
  archiveDate: string
  archiveSubjects: string[]
  slug: string
  searchScore: number
  platformFeatured: boolean
}

export const categoryLabels: Record<string, string> = {
  acao: 'Ação',
  arcade: 'Arcade',
  aventura: 'Aventura',
  casual: 'Casual',
  corrida: 'Corrida',
  esporte: 'Esporte',
  estrategia: 'Estratégia',
  plataforma: 'Plataforma',
  puzzle: 'Quebra-cabeça',
  quiz: 'Quiz',
}

const browserArtwork: Record<string, string> = {
  snake: '/brand/games/snake.webp',
  pong: '/brand/games/pong.webp',
  '2048': '/brand/games/2048.webp',
  breakout: '/brand/games/breakout.webp',
  minesweeper: '/brand/games/minesweeper.webp',
  'flappy-bird': '/brand/games/flappy-bird.webp',
  tetris: '/brand/games/tetris.webp',
  wordle: '/brand/games/wordle.webp',
  'dino-dash': '/brand/games/dino-dash.webp',
}

const browserDescriptions: Record<string, string> = {
  snake: 'Uma versão de navegador do clássico Snake: conduza a serpente pela tela, recolha itens e evite colidir com as bordas ou com o próprio rastro.',
  pong: 'Uma versão de navegador de Pong, o duelo de arcade em que cada jogador rebate a bola com uma raquete e tenta marcar pontos no campo adversário.',
  '2048': 'Neste quebra-cabeça de números, deslize as peças, combine valores iguais e planeje os movimentos para alcançar o bloco 2048.',
  tetris: 'Organize as peças que caem, complete linhas e tente manter o tabuleiro livre neste clássico jogo de encaixe.',
  breakout: 'Rebata a bola com a plataforma para quebrar os blocos e limpar o campo neste clássico de arcade.',
  minesweeper: 'Use os números revelados no tabuleiro para deduzir onde estão as minas e abrir as casas seguras.',
  wordle: 'Adivinhe a palavra oculta em tentativas limitadas, usando as pistas de cada palpite para eliminar possibilidades.',
  'flappy-bird': 'Controle o voo do pássaro entre obstáculos e tente avançar o máximo possível sem tocar nos canos.',
  'dino-dash': 'Uma corrida arcade de dinossauro em versão de navegador, com uma capa original criada para representar o clima retrô e veloz do jogo.',
}

function archiveSummary(id: string, title: string, categoryName: string) {
  const raw = archiveGameTranslations[id] ?? archiveGameMetadata[id]?.summary ?? ''
  const summary = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = summary.match(/[\p{L}\p{N}]+/gu) ?? []
  const personalNote = /\b(?:eu|meu|minha|meus|minhas|acho|espero|estou|estava|fiquei|tenho|tive|joguei|jogado|encontrei|não sei|não encontrei|posso estar|obrigado|flashpoint|assisti|gravei|baixei|gostei|i was|i am|i have|i think|i hope|i found|i played|my game|i'm)\b/i.test(summary)
  const lowQuality = summary.length < 48 || words.length < 8 || /^[\s\p{P}\p{S}\d]+$/u.test(summary) || personalNote
  if (!lowQuality) return summary
  return `${title} integra o acervo de jogos de ${categoryName.toLocaleLowerCase('pt-BR')} preservados para consulta e nostalgia. Esta ficha reúne a capa, os dados disponíveis e o link para a versão arquivada.`
}

const browserRecords = [
  { id: 'snake', title: 'Snake', category: 'arcade', launchUrl: 'https://emjay045.github.io/browser-games/snake/' },
  { id: 'pong', title: 'Pong', category: 'arcade', launchUrl: 'https://emjay045.github.io/browser-games/pong/' },
  { id: '2048', title: '2048', category: 'puzzle', launchUrl: 'https://emjay045.github.io/browser-games/2048/' },
  { id: 'tetris', title: 'Tetris', category: 'puzzle', launchUrl: 'https://emjay045.github.io/browser-games/tetris/' },
  { id: 'breakout', title: 'Breakout', category: 'arcade', launchUrl: 'https://emjay045.github.io/browser-games/breakout/' },
  { id: 'minesweeper', title: 'Campo Minado', category: 'puzzle', launchUrl: 'https://emjay045.github.io/browser-games/minesweeper/' },
  { id: 'wordle', title: 'Wordle', category: 'quiz', launchUrl: 'https://emjay045.github.io/browser-games/wordle/' },
  { id: 'flappy-bird', title: 'Flappy Bird', category: 'arcade', launchUrl: 'https://emjay045.github.io/browser-games/flappy-bird/' },
  { id: 'dino-dash', title: 'Dino Dash', category: 'arcade', launchUrl: 'https://emjay045.github.io/browser-games/dino-dash/' },
] as const

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function searchSignal(id: string) {
  return gameSearchSignals[id] ?? { searchScore: 0, platformFeatured: false }
}

const rawCatalog: Omit<CatalogGame, 'slug' | 'searchScore' | 'platformFeatured'>[] = [
  ...browserRecords.map((game) => ({
    ...game,
    kind: 'game' as const,
    source: 'browser-games' as const,
    sourceUrl: game.launchUrl,
    imagePath: browserArtwork[game.id] ?? '/brand/category-arcade.webp',
    browser: true,
    summary: browserDescriptions[game.id] ?? `${game.title} é um clássico de ${categoryLabels[game.category] ?? game.category} em versão de navegador. Esta ficha reúne sua capa, categoria e link para a versão hospedada.`,
    creator: '',
    archiveDate: '',
    archiveSubjects: [],
  })),
  ...flashArchiveEntries
    .filter((game) => game.kind === 'game')
    .map((game) => {
      const metadata = archiveGameMetadata[game.id]
      const categoryName = categoryLabels[game.category] ?? game.category
      return {
        id: game.id,
        title: game.title,
        category: game.category,
        kind: 'game' as const,
        source: 'internet-archive' as const,
        launchUrl: `https://archive.org/embed/${encodeURIComponent(game.id)}`,
        sourceUrl: `https://archive.org/details/${encodeURIComponent(game.id)}`,
        imagePath: `/brand/games/archive/${encodeURIComponent(game.id)}.webp`,
        browser: false,
        summary: archiveSummary(game.id, game.title, categoryName),
        creator: metadata?.creator ?? '',
        archiveDate: metadata?.date ?? '',
        archiveSubjects: metadata?.subject ? metadata.subject.split(';').map((tag) => tag.trim()).filter(Boolean).slice(0, 8) : [],
      }
    }),
]

const usedSlugs = new Set<string>()
export const catalogGames: CatalogGame[] = rawCatalog.map((game) => {
  const baseSlug = slugify(game.title) || slugify(game.id)
  let slug = baseSlug
  if (usedSlugs.has(slug)) slug = `${baseSlug}-${slugify(game.id)}`
  if (usedSlugs.has(slug)) throw new Error(`Slug duplicado no catálogo: ${slug}`)
  usedSlugs.add(slug)
  const signal = searchSignal(game.id)
  return { ...game, slug, ...signal }
})

export const catalogGameBySlug = new Map(catalogGames.map((game) => [game.slug, game]))

export function compareCatalogPopularity(a: CatalogGame, b: CatalogGame) {
  if (a.platformFeatured !== b.platformFeatured) return a.platformFeatured ? -1 : 1
  if (a.searchScore !== b.searchScore) return b.searchScore - a.searchScore
  return a.title.localeCompare(b.title, 'pt-BR')
}
