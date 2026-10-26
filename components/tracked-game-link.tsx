'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { trackGameEvent } from '@/components/analytics-events'

type Props = {
  href: string
  className: string
  gameSlug: string
  gameTitle: string
  gameSource: string
  gameCategory: string
  sourceCategory: string
  placement: 'category_featured' | 'category_grid'
  ariaLabel?: string
  children: ReactNode
}

export function TrackedGameLink({
  href,
  className,
  gameSlug,
  gameTitle,
  gameSource,
  gameCategory,
  sourceCategory,
  placement,
  ariaLabel,
  children,
}: Props) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => trackGameEvent('game_open', {
        game_slug: gameSlug,
        game_title: gameTitle,
        game_source: gameSource,
        game_category: gameCategory,
        source_page_type: 'category',
        source_category: sourceCategory,
        placement,
      })}
    >
      {children}
    </Link>
  )
}
