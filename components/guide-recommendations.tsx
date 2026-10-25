'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { trackGameEvent } from '@/components/analytics-events'

export type GuideRecommendationItem = {
  title: string
  href: string
  reason: string
  imageUrl?: string
  label?: string
}

export function GuideRecommendationGrid({ guide, items }: { guide: string; items: GuideRecommendationItem[] }) {
  return <section className="zg-cro-recommendations" aria-labelledby={`${guide}-recommendations`}>
    <div className="zg-cro-heading"><div><p className="zg-kicker">COMECE POR AQUI</p><h2 id={`${guide}-recommendations`}>Nossa seleção para você</h2></div><span>{items.length} opções editoriais</span></div>
    <div className="zg-cro-grid">{items.map((item, index) => <GuideRecommendationCard guide={guide} item={item} position={index + 1} key={item.href} />)}</div>
  </section>
}

function GuideRecommendationCard({ guide, item, position }: { guide: string; item: GuideRecommendationItem; position: number }) {
  useEffect(() => {
    trackGameEvent('guide_recommendation_impression', { guide, game_title: item.title, position })
  }, [guide, item.title, position])

  return <Link className={`zg-cro-card${position === 1 ? ' zg-cro-card-primary' : ''}`} href={item.href} onClick={() => trackGameEvent('guide_recommendation_click', { guide, game_title: item.title, position })}>
    <div className="zg-cro-card-media">{item.imageUrl ? <img src={item.imageUrl} alt={`Capa de ${item.title}`} loading="lazy" /> : <span aria-hidden="true">✦</span>}<span className="zg-cro-card-rank">0{position}</span></div>
    <div className="zg-cro-card-body"><span className="zg-cro-card-label">{item.label ?? 'CURADORIA PRÓPRIA'}</span><h3>{item.title}</h3><p>{item.reason}</p><span className="zg-cro-card-cta">Ver ficha do jogo <b>↗</b></span></div>
  </Link>
}
