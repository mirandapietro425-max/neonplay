'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { trackGameEvent } from '@/components/analytics-events'

type Props = { gameSlug: string; gameTitle: string; category: string; categoryHref?: string }

type Milestone = { count: number; title: string; detail: string }

const milestones: Milestone[] = [
  { count: 1, title: 'Primeiro play', detail: 'Você abriu sua primeira ficha.' },
  { count: 3, title: 'Caçador de arcades', detail: 'Você comparou três experiências.' },
  { count: 5, title: 'Explorador do acervo', detail: 'Você já conhece cinco fichas.' },
  { count: 10, title: 'Mapa completo', detail: 'Você chegou a dez descobertas.' },
]

export function GameDiscoveryProgress({ gameSlug, gameTitle, category, categoryHref }: Props) {
  const [visited, setVisited] = useState<string[]>([])
  const [justUnlocked, setJustUnlocked] = useState<Milestone | null>(null)

  useEffect(() => {
    const key = 'zapgame-discovered-games'
    const current = JSON.parse(window.localStorage.getItem(key) ?? '[]') as string[]
    const next = Array.from(new Set([...current, gameSlug]))
    window.localStorage.setItem(key, JSON.stringify(next))
    setVisited(next)
    const unlocked = milestones.find((milestone) => next.length >= milestone.count && !current.includes(`milestone:${milestone.count}`))
    if (unlocked) {
      window.localStorage.setItem(key, JSON.stringify([...next, `milestone:${unlocked.count}`]))
      setJustUnlocked(unlocked)
      trackGameEvent('game_discovery_milestone', { game_slug: gameSlug, game_title: gameTitle, milestone: unlocked.title, count: unlocked.count })
    }
    trackGameEvent('game_detail_view', { game_slug: gameSlug, game_title: gameTitle, game_category: category, discovery_count: next.length })
  }, [category, gameSlug, gameTitle])

  const count = visited.filter((item) => !item.startsWith('milestone:')).length
  const nextMilestone = milestones.find((milestone) => milestone.count > count) ?? milestones[milestones.length - 1]
  const previousMilestone = milestones.filter((milestone) => milestone.count <= count).pop() ?? milestones[0]
  const progress = count >= nextMilestone.count ? 100 : Math.min(100, Math.round((count / nextMilestone.count) * 100))
  const currentTitle = count >= nextMilestone.count ? nextMilestone.title : previousMilestone.title

  return <section className="zg-discovery-progress" aria-labelledby="discovery-progress-title">
    <div className="zg-discovery-progress-main"><div className="zg-discovery-emblem" aria-hidden="true">✦</div><div><p className="zg-kicker">JORNADA LOCAL</p><h2 id="discovery-progress-title">{currentTitle}</h2><p>Você explorou <strong>{count}</strong> {count === 1 ? 'ficha' : 'fichas'} neste dispositivo.</p></div></div>
    <div className="zg-discovery-progress-side"><div className="zg-discovery-progress-label"><span>Próxima conquista</span><b>{nextMilestone.title}</b></div><div className="zg-discovery-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><small>{Math.max(0, nextMilestone.count - count)} {Math.max(0, nextMilestone.count - count) === 1 ? 'ficha' : 'fichas'} para avançar</small></div>
    {justUnlocked && <div className="zg-discovery-toast" role="status"><span>CONQUISTA DESBLOQUEADA</span><b>{justUnlocked.title}</b><small>{justUnlocked.detail}</small></div>}
    <Link className="zg-discovery-next" href={categoryHref ?? '/'}>Explorar mais {category} <span aria-hidden="true">↗</span></Link>
  </section>
}
