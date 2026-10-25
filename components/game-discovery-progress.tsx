'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { trackGameEvent } from '@/components/analytics-events'

type Props = { gameSlug: string; gameTitle: string; category: string; categoryHref?: string }
type Milestone = { count: number; title: string; detail: string }

const STORAGE_KEY = 'zapgame-discovered-games'
const milestones: Milestone[] = [
  { count: 1, title: 'Primeiro play', detail: 'Você abriu sua primeira ficha.' },
  { count: 3, title: 'Caçador de arcades', detail: 'Você comparou três experiências.' },
  { count: 5, title: 'Explorador do acervo', detail: 'Você já conhece cinco fichas.' },
  { count: 10, title: 'Mapa completo', detail: 'Você chegou a dez descobertas.' },
]

function readVisited() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && !item.startsWith('milestone:'))
  } catch {
    return []
  }
}

function writeVisited(visited: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visited))
  } catch {
    // A jornada continua visualmente funcional mesmo quando o navegador bloqueia storage.
  }
}

export function GameDiscoveryProgress({ gameSlug, gameTitle, category, categoryHref }: Props) {
  const [visited, setVisited] = useState<string[]>([])
  const [justUnlocked, setJustUnlocked] = useState<Milestone | null>(null)

  useEffect(() => {
    const current = readVisited()
    const next = Array.from(new Set([...current, gameSlug]))
    writeVisited(next)
    setVisited(next)
    const unlocked = milestones.find((milestone) => next.length >= milestone.count && current.length < milestone.count)
    if (unlocked) {
      setJustUnlocked(unlocked)
      trackGameEvent('game_discovery_milestone', { game_slug: gameSlug, game_title: gameTitle, milestone: unlocked.title, count: unlocked.count })
    }
    trackGameEvent('game_detail_view', { game_slug: gameSlug, game_title: gameTitle, game_category: category, discovery_count: next.length })
  }, [category, gameSlug, gameTitle])

  const count = visited.length
  const completed = count >= milestones[milestones.length - 1].count
  const nextMilestone = milestones.find((milestone) => milestone.count > count) ?? milestones[milestones.length - 1]
  const previousMilestone = milestones.filter((milestone) => milestone.count <= count).pop() ?? milestones[0]
  const progress = completed ? 100 : Math.min(100, Math.round((count / nextMilestone.count) * 100))
  const currentTitle = completed ? milestones[milestones.length - 1].title : previousMilestone.title
  const remaining = completed ? 0 : Math.max(0, nextMilestone.count - count)

  return <section className="zg-discovery-progress" aria-labelledby="discovery-progress-title">
    <div className="zg-discovery-progress-main"><div className="zg-discovery-emblem" aria-hidden="true">✦</div><div><p className="zg-kicker">JORNADA LOCAL</p><h2 id="discovery-progress-title">{currentTitle}</h2><p>Você explorou <strong>{count}</strong> {count === 1 ? 'ficha' : 'fichas'} neste dispositivo.</p></div></div>
    <div className="zg-discovery-progress-side"><div className="zg-discovery-progress-label"><span>{completed ? 'Jornada concluída' : 'Próxima conquista'}</span><b>{completed ? 'Mapa completo' : nextMilestone.title}</b></div><div className="zg-discovery-progress-track" role="progressbar" aria-label="Progresso da jornada de descoberta" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><small>{completed ? 'Você completou todas as conquistas locais.' : `${remaining} ${remaining === 1 ? 'ficha' : 'fichas'} para avançar`}</small></div>
    {justUnlocked && <div className="zg-discovery-toast" role="status"><span>CONQUISTA DESBLOQUEADA</span><b>{justUnlocked.title}</b><small>{justUnlocked.detail}</small></div>}
    <Link className="zg-discovery-next" href={categoryHref ?? '/'}>Explorar mais {category} <span aria-hidden="true">↗</span></Link>
  </section>
}
