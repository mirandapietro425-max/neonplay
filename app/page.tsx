'use client'

import useSWR from 'swr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Search } from 'lucide-react'
import { trackGameEvent } from '@/components/analytics-events'
import {
  catalogGames,
  categoryLabels,
  compareCatalogPopularity,
  type CatalogGame,
} from '@/lib/game-catalog'
import { gamePixEditorial } from '@/lib/gamepix-editorial'

type GamePixGame = {
  id: string
  title: string
  category: string
  kind: 'game'
  launchUrl: string
  imageUrl: string
  slug: string
  source: 'gamepix'
  providerRank: number
}
type Game = CatalogGame | GamePixGame
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json())
const names: Record<string, string> = { todos: 'Todos', gamepix: 'GamePix', ...categoryLabels }

function categoryArt(category: string) {
  return `/brand/category-${category === 'gamepix' ? 'arcade' : category}.webp`
}

function imageFor(game: Game) {
  return game.source === 'gamepix' ? game.imageUrl : game.imagePath
}

function isGamePix(game: Game): game is GamePixGame {
  return game.source === 'gamepix'
}

export default function Page() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('todos')
  const [source, setSource] = useState<'todos' | 'gamepix'>('todos')
  const [sort, setSort] = useState<'featured' | 'az'>('featured')
  const [visibleCount, setVisibleCount] = useState(90)
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setVisibleCount(90) }, [search, category, source, sort])
  const { data, isLoading, error, mutate } = useSWR<{ games?: Game[] }>('/api/games?source=gamepix', fetcher, { revalidateOnFocus: false })

  const allGames = useMemo(() => [
    ...catalogGames,
    ...(data?.games ?? []).filter(isGamePix),
  ], [data])
  const categories = useMemo(() => Array.from(new Set(allGames.map((game) => game.category)))
    .filter((id) => id !== 'gamepix')
    .map((id) => ({ id, count: allGames.filter((game) => game.category === id).length })), [allGames])
  const editorialCount = Object.keys(gamePixEditorial).length

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    const matching = allGames.filter((game) =>
      (category === 'todos' || game.category === category) &&
      (source === 'todos' || game.source === source) &&
      (!query || game.title.toLocaleLowerCase('pt-BR').includes(query)),
    )
    return [...matching].sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title, 'pt-BR')
      if (isGamePix(a) && isGamePix(b)) return a.providerRank - b.providerRank
      if (isGamePix(a)) return 1
      if (isGamePix(b)) return -1
      return compareCatalogPopularity(a, b)
    })
  }, [allGames, category, search, sort, source])

  const visibleGames = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const featuredGames = useMemo(() => filtered.filter(isGamePix).slice(0, 6), [filtered])

  const trackGameOpen = (game: Game, placement: string) => {
    trackGameEvent('game_open', {
      game_slug: game.slug,
      game_source: game.source,
      game_title: game.title,
      placement,
    })
  }

  return <main className="zg-shell"><div className="zg-wrap">
    <header className="zg-topbar">
      <a href="#top" aria-label="Zap Game início"><img className="zg-logo" src="/brand/zapgame-logo.svg" alt="Zap Game" /></a>
        <nav className="zg-nav" aria-label="Navegação principal"><a href="#catalogo">Jogos</a><a href="#categorias">Categorias</a><a href="/guias">Guias</a><a href="#sobre">Sobre</a></nav>
      <button className="zg-top-cta" onClick={() => searchRef.current?.focus()}><Search size={15} /> Buscar jogo</button>
    </header>

    <section id="top" className="zg-hero">
      <div className="zg-hero-art" aria-hidden="true" />
      <div className="zg-hero-copy">
        <div className="zg-eyebrow">Descoberta de jogos de navegador</div>
        <h1>Aperta o play.<br /><span>Volta no tempo.</span></h1>
        <p>Explore jogos de navegador por categoria, intenção e ritmo. Encontre uma experiência para sua próxima pausa e descubra algo novo para jogar.</p>
        <button className="zg-primary-btn" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>Explorar o acervo <ArrowDown size={16} /></button>
      </div>
      <div className="zg-hero-aside"><i /> Clássicos guardados. Diversão viva.</div>
    </section>

    <section className="zg-proof-strip" aria-label="Resumo do acervo Zap Game">
      <div><strong>{allGames.length || '300+'}</strong><span>jogos disponíveis</span></div>
      <div><strong>{categories.length || 6}</strong><span>categorias para explorar</span></div>
      <div><strong>{editorialCount}</strong><span>fichas com curadoria</span></div>
      <div className="zg-proof-note"><i /> Catálogo atualizado por parceiro GamePix</div>
    </section>

    <section className="zg-section" id="catalogo">
      <div className="zg-section-head">
        <div><p className="zg-kicker">Um passeio pela memória</p><h2>Jogos clássicos para jogar de novo.</h2></div>
        <label className="zg-searchbox"><Search size={17} /><input ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pelo nome do jogo" aria-label="Buscar jogo pelo título" /></label>
      </div>

      <div className="zg-category-row" id="categorias">
        <button className={`zg-filter ${category === 'todos' && source === 'todos' ? 'active' : ''}`} onClick={() => { setCategory('todos'); setSource('todos') }}>Todos <span>{allGames.length}</span></button>
        <button className={`zg-filter ${source === 'gamepix' ? 'active' : ''}`} onClick={() => { setSource('gamepix'); setCategory('todos') }}>GamePix <span>{allGames.filter((game) => game.source === 'gamepix').length}</span></button>
        {categories.map((item) => <button key={item.id} className={`zg-filter ${category === item.id && source === 'todos' ? 'active' : ''}`} onClick={() => setCategory(item.id)}>{names[item.id] ?? item.id} <span>{item.count}</span></button>)}
      </div>

      <nav className="zg-category-links" aria-label="Páginas de categorias de jogos">
        {categories.map((item) => <a key={`seo-${item.id}`} href={`/jogos/categoria/${item.id}`}>{names[item.id] ?? item.id}</a>)}
      </nav>

      {isLoading && <div className="zg-source-status">Carregando o catálogo GamePix…</div>}
      {error && <div className="zg-source-error">Não foi possível atualizar o GamePix. <button onClick={() => void mutate()}>Tentar novamente</button></div>}

      {!search && category === 'todos' && source === 'todos' && featuredGames.length > 0 && <div className="zg-discovery">
        <div className="zg-discovery-head"><div><p className="zg-kicker">Destaques do catálogo</p><h3>Escolhas para começar</h3></div><span>Seleção GamePix</span></div>
        <div className="zg-mini-grid">{featuredGames.map((game) => <a className="zg-mini-card" key={`featured-${game.id}`} href={`/jogos/${game.slug}`} onClick={() => trackGameOpen(game, 'featured')}><img src={imageFor(game)} alt={`Capa de ${game.title}`} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = categoryArt(game.category) }} /><span>{game.title}</span></a>)}</div>
      </div>}

      {!search && category === 'todos' && source === 'todos' && <div className="zg-discovery zg-discovery-secondary">
        <div className="zg-discovery-head"><div><p className="zg-kicker">Escolha melhor</p><h3>Guias para encontrar seu próximo jogo</h3></div><a href="/guias">Ver todos os guias ↗</a></div>
        <div className="zg-mini-grid"><a className="zg-mini-card" href="/guias/qual-jogo-escolher"><span>Qual jogo combina com você?</span><small>Quiz em 3 perguntas</small></a><a className="zg-mini-card" href="/guias/jogos-para-partidas-curtas"><span>Jogos para partidas curtas</span><small>Para pausas rápidas</small></a><a className="zg-mini-card" href="/guias/jogos-para-jogar-com-amigos"><span>Jogos para jogar com amigos</span><small>Competição e cooperação</small></a><a className="zg-mini-card" href="/guias/como-escolher-jogos-de-navegador"><span>Como escolher um jogo</span><small>Critérios da curadoria</small></a></div>
      </div>}

      <div className="zg-catalog-toolbar">
        <div className="zg-result-line"><span>{filtered.length} {filtered.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}</span><span>{names[category] ?? 'Todos'}</span></div>
        <label className="zg-sort">Ordenar por<select value={sort} onChange={(event) => setSort(event.target.value as 'featured' | 'az')} aria-label="Ordenar catálogo"><option value="featured">Sinais qualitativos (BR)</option><option value="az">Nome: A–Z</option></select></label>
      </div>

      {filtered.length ? <>
        <div className="zg-game-grid">{visibleGames.map((game) => <a className="zg-game-card" key={game.id} href={`/jogos/${game.slug}`} aria-label={`Ver ficha de ${game.title} e jogar agora`} onClick={() => trackGameOpen(game, 'catalog')}>
          {game.source === 'browser-games' && <b className="zg-browser-tag">Jogue agora</b>}
          {game.source === 'gamepix' && <b className="zg-gamepix-tag">GamePix</b>}
          <div className="zg-game-thumb"><img src={imageFor(game)} alt={`Capa de ${game.title}`} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = categoryArt(game.category) }} /><span className="zg-play-mark"><ArrowUpRight size={14} /></span></div>
          <div className="zg-game-info"><strong>{game.title}</strong><small>{names[game.category] ?? game.category}</small><span className="zg-card-cta">Ver ficha e jogar <span aria-hidden="true">↗</span></span></div>
        </a>)}</div>
        {visibleGames.length < filtered.length && <div className="zg-load-more"><button className="zg-load-more-btn" onClick={() => setVisibleCount((current) => Math.min(current + 24, filtered.length))}>Carregar mais jogos <span>({filtered.length - visibleGames.length} restantes)</span></button></div>}
      </> : <div className="zg-empty"><img src="/brand/brand-empty-library.svg" alt="" /><h3>Nenhum jogo por aqui.</h3><p>Tente outro título ou limpe os filtros.</p><button className="zg-reset" onClick={() => { setSearch(''); setCategory('todos'); setSource('todos') }}>Limpar filtros</button></div>}
    </section>

    <section className="zg-promo" id="sobre"><div><p className="zg-kicker">MEMÓRIA INTERATIVA · DESDE O PRIMEIRO CLIQUE</p><h2>Tem jogo que<br />fica pra sempre.</h2><p>Um espaço para celebrar os jogos que fizeram parte da infância — e deixar a próxima geração descobrir por que eles nunca saem de moda.</p><button className="zg-primary-btn" onClick={() => { setCategory('arcade'); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }) }}>Revisitar os arcades <ArrowUpRight size={16} /></button></div><div className="zg-promo-visual" /></section>

    <footer className="zg-footer"><img src="/brand/zapgame-logo.svg" alt="Zap Game" /><span>Um memorial vivo dos jogos que marcaram época. © Zap Game · <a href="/sobre">Sobre</a> · <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a> · <a href="/direitos-autorais">Direitos autorais</a> · <a href="/contato">Contato</a></span></footer>
  </div></main>
}
