'use client'

import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { trackGameEvent } from '@/components/analytics-events'

type TrackedPlayLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  gameSlug: string
  gameSource: string
  gameTitle: string
  ctaPosition?: string
}

export function TrackedPlayLink({ gameSlug, gameSource, gameTitle, ctaPosition = 'detail_primary', onClick, ...props }: TrackedPlayLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackGameEvent('game_play_click', {
      game_slug: gameSlug,
      game_source: gameSource,
      game_title: gameTitle,
      cta_position: ctaPosition,
    })
    onClick?.(event)
  }

  return <a {...props} onClick={handleClick} />
}
