import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const CATALOG_LIMIT = 300
const CATEGORY_IDS = {
  'a46f6ba4-0fe9-419e-945c-12d4ab0cf582': 'puzzle',
  '5690a2a7-24a5-4ad5-80d0-289a7e53fd37': 'estrategia',
  '1f9c4256-9f5c-4463-b072-c4d2f266719e': 'esporte',
  'e6e804fa-d074-4418-9b1c-a8db99364e3a': 'arcade',
  '13faf451-da07-432b-b7da-73bdbbe03a8b': 'aventura',
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function values(value) {
  if (Array.isArray(value)) return value.flatMap(values)
  return typeof value === 'string' && value.trim() ? [value.trim()] : []
}

function normalize(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeSlug(title, providerId) {
  return `gamepix-${slugify(title)}-${slugify(providerId)}`
}

function httpUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function firstString(valuesList) {
  return valuesList.find((value) => typeof value === 'string' && value.trim())?.trim() ?? ''
}

function sourceLaunchValue(game) {
  return firstString([game.url, game.game_url])
}

function launchUrl(game, providerId) {
  const supplied = httpUrl(sourceLaunchValue(game))
  if (supplied) return supplied
  return providerId ? `https://games.gamepix.com/games/${encodeURIComponent(providerId)}/index.html` : ''
}

function imageUrl(game, providerId) {
  const supplied = httpUrl(firstString([
    game.thumbnailUrl, game.thumbnailUrl100, game.image, game.thumbnail,
    game.thumb, game.banner, game.image_url,
  ]))
  if (supplied) return supplied
  return providerId ? `https://img.gamepix.com/games/${encodeURIComponent(providerId)}/cover.jpg?w=640` : ''
}

function categoryFromValue(value) {
  const normalized = normalize(value)
  if (!normalized) return null
  if (CATEGORY_IDS[normalized]) return CATEGORY_IDS[normalized]
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

function category(game) {
  for (const value of [...values(game.category), ...values(game.genre)]) {
    const result = categoryFromValue(value)
    if (result) return result
  }
  for (const value of [...values(game.categories), ...values(game.genres), ...values(game.tags)]) {
    const result = categoryFromValue(value)
    if (result) return result
  }
  return 'gamepix'
}

function quality(game) {
  const score = typeof game.rkScore === 'number' ? game.rkScore : typeof game.rks === 'number' ? game.rks : 0
  return (game.featured === true ? 100 : 0) + score * 10 + (game.orientation === 'landscape' ? 1 : 0)
}

function plainText(value) {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000)
    : ''
}

function groupDuplicates(items, keyOf) {
  const groups = new Map()
  for (const item of items) {
    const key = keyOf(item)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, count: group.length, titles: group.map((item) => item.title), providerIds: group.map((item) => item.providerId) }))
}

function categoryCounts(items) {
  return Object.fromEntries([...items.reduce((counts, game) => counts.set(game.category, (counts.get(game.category) ?? 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)))
}

function editorialIdsFrom(source) {
  return new Set([...source.matchAll(/^\s*['"]([^'"]+)['"]\s*:\s*\{/gm)].map((match) => match[1]))
}

async function mapConcurrent(items, limit, worker) {
  const output = new Array(items.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      output[index] = await worker(items[index])
    }
  }))
  return output
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) })
    const status = response.status
    return {
      url,
      status,
      result: [404, 410].includes(status) ? 'broken-confirmed' : response.ok ? 'reachable' : 'inconclusive',
    }
  } catch (error) {
    return { url, status: null, result: 'inconclusive', error: error instanceof Error ? error.name : 'UnknownError' }
  }
}

async function main() {
  const sid = text(process.env.GAMEPIX_API_KEY)
  if (!sid) {
    console.error('GAMEPIX_API_KEY não está definida. Configure a chave/SID localmente; não a envie no chat nem a grave no Git.')
    process.exitCode = 2
    return
  }

  const response = await fetch(`https://games.gamepix.com/games?sid=${encodeURIComponent(sid)}&limit=1000&offset=0`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`GamePix respondeu HTTP ${response.status}. A chave, a conta ou o endpoint precisam ser conferidos.`)

  const payload = await response.json()
  const rawRecords = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.games) ? payload.games : []
  if (rawRecords.length === 0) throw new Error('O feed GamePix retornou zero registros ou um formato inesperado; nenhum resultado foi inventado.')

  const invalidRecords = []
  const originalLaunchUrlMalformed = []
  const candidates = []

  rawRecords.forEach((raw, index) => {
    const game = raw && typeof raw === 'object' ? raw : {}
    const providerId = typeof game.id === 'string' ? game.id.trim() : typeof game.gid === 'string' ? game.gid.trim() : ''
    const title = firstString([game.title, game.name])
    if (!providerId || !title) {
      invalidRecords.push({ feedIndex: index, hasProviderId: Boolean(providerId), hasTitle: Boolean(title) })
      return
    }
    const suppliedLaunchUrl = sourceLaunchValue(game)
    if (suppliedLaunchUrl && !httpUrl(suppliedLaunchUrl)) originalLaunchUrlMalformed.push({ providerId, title, suppliedLaunchUrl })
    candidates.push({
      providerId,
      title,
      slug: makeSlug(title, providerId),
      category: category(game),
      summary: plainText(game.description ?? game.shortDescription ?? game.short_description),
      launchUrl: launchUrl(game, providerId),
      imageUrl: imageUrl(game, providerId),
      quality: quality(game),
      feedIndex: index,
    })
  })

  const rankedRaw = [...candidates].sort((a, b) => b.quality - a.quality || a.feedIndex - b.feedIndex)
  const seenIds = new Set()
  const seenSlugs = new Set()
  const selected = rankedRaw.filter((game) => {
    const normalizedId = game.providerId.toLocaleUpperCase('en-US')
    const normalizedSlug = game.slug.toLocaleLowerCase('en-US')
    if (seenIds.has(normalizedId) || seenSlugs.has(normalizedSlug)) return false
    seenIds.add(normalizedId)
    seenSlugs.add(normalizedSlug)
    return true
  }).slice(0, CATALOG_LIMIT).map((game, index) => ({ ...game, providerRank: index + 1 }))

  const editorialSource = await readFile(resolve(process.cwd(), 'lib/gamepix-editorial.ts'), 'utf8')
  const editorialIds = editorialIdsFrom(editorialSource)
  const allFeedIds = new Set(candidates.map((game) => game.providerId))
  const allFeedIdsUpper = new Set([...allFeedIds].map((id) => id.toLocaleUpperCase('en-US')))
  const duplicates = {
    providerIds: groupDuplicates(candidates, (game) => game.providerId.toLocaleUpperCase('en-US')),
    slugs: groupDuplicates(candidates, (game) => game.slug.toLocaleLowerCase('en-US')),
    titles: groupDuplicates(candidates, (game) => normalize(game.title)),
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'GamePix API feed; editorial text is not generated by this audit.',
    totals: {
      rawFeedRecords: rawRecords.length,
      validProviderIdAndTitle: candidates.length,
      invalidRecords: invalidRecords.length,
      selectedUniqueCatalogGames: selected.length,
      editorialProfilesInSource: editorialIds.size,
      selectedGamesWithEditorial: selected.filter((game) => editorialIds.has(game.providerId)).length,
      selectedGamesWithoutEditorial: selected.filter((game) => !editorialIds.has(game.providerId)).length,
      malformedSuppliedLaunchUrls: originalLaunchUrlMalformed.length,
    },
    categoryCounts: categoryCounts(selected),
    duplicateProviderIds: duplicates.providerIds,
    duplicateSlugs: duplicates.slugs,
    duplicateTitlesWarningOnly: duplicates.titles,
    invalidRecords,
    malformedSuppliedLaunchUrls: originalLaunchUrlMalformed,
    editorialIdsNotFoundInFeed: [...editorialIds].filter((id) => !allFeedIds.has(id) && !allFeedIdsUpper.has(id.toLocaleUpperCase('en-US'))),
    puzzleEditorialQueue: selected.filter((game) => game.category === 'puzzle' && !editorialIds.has(game.providerId)).slice(0, 15).map((game) => ({
      providerId: game.providerId,
      title: game.title,
      slug: game.slug,
      category: game.category,
      summary: game.summary,
      imageUrl: game.imageUrl,
      sourceUrl: game.launchUrl,
      providerRank: game.providerRank,
    })),
    linkChecks: [],
  }

  if (process.argv.includes('--check-links')) {
    const urls = selected.flatMap((game) => [
      { providerId: game.providerId, title: game.title, kind: 'launch', url: game.launchUrl },
      { providerId: game.providerId, title: game.title, kind: 'image', url: game.imageUrl },
    ])
    report.linkChecks = await mapConcurrent(urls, 8, async (item) => ({ ...item, ...(await checkUrl(item.url)) }))
  }

  console.log(`Registros recebidos: ${report.totals.rawFeedRecords}`)
  console.log(`Jogos únicos selecionados (limite ${CATALOG_LIMIT}): ${report.totals.selectedUniqueCatalogGames}`)
  console.log(`Duplicatas: ${duplicates.providerIds.length} grupo(s) de providerId; ${duplicates.slugs.length} de slug; ${duplicates.titles.length} de título (aviso, não remoção automática).`)
  console.log(`Fichas editoriais: ${report.totals.selectedGamesWithEditorial}/${report.totals.selectedUniqueCatalogGames} jogos selecionados.`)
  console.log('Categorias:', JSON.stringify(report.categoryCounts))
  console.log('\nPróxima fila de puzzle (máximo 15, sem ficha editorial):')
  for (const game of report.puzzleEditorialQueue) {
    console.log(`rank ${String(game.providerRank).padStart(3, ' ')} | ${game.providerId} | ${game.title} | ${game.slug}`)
  }
  if (process.argv.includes('--check-links')) {
    const broken = report.linkChecks.filter((item) => item.result === 'broken-confirmed')
    const inconclusive = report.linkChecks.filter((item) => item.result === 'inconclusive')
    console.log(`\nLinks: ${broken.length} confirmado(s) como 404/410; ${inconclusive.length} inconclusivo(s). 403/405/timeouts não são classificados como quebrados.`)
  }

  const outputArg = process.argv.find((arg) => arg.startsWith('--output='))
  if (outputArg) {
    const outputPath = resolve(outputArg.slice('--output='.length))
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`Relatório salvo em ${outputPath}`)
  }

  if (duplicates.providerIds.length || duplicates.slugs.length || invalidRecords.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(`[GamePix audit] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
