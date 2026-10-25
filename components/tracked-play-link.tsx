'use client'

import { track } from '@vercel/analytics'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'

type TrackedPlayLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  gameSlug: string
  gameSource: string
  gameTitle: string
}

export function TrackedPlayLink({ gameSlug, gameSource, gameTitle, onClick, ...props }: TrackedPlayLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    track('game_play_click', {
      game_slug: gameSlug,
      game_source: gameSource,
      game_title: gameTitle,
    })
    onClick?.(event)
  }

  return <a {...props} onClick={handleClick} />
}
