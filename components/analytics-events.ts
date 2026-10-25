import { track } from '@vercel/analytics'

type EventParams = Record<string, string | number | boolean | null>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function trackGameEvent(name: string, params: EventParams) {
  track(name, params)

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params)
  }
}
