import type { Metadata } from 'next'

export const SEO_SITE_ORIGIN = 'https://www.zapgame.com.br'
export const SEO_SITE_URL = `${SEO_SITE_ORIGIN}/`
export const DEFAULT_SOCIAL_IMAGE = '/brand/zapgame-og.webp'

type PageSeoOptions = {
  title: string
  description: string
  path: string
  image?: string
  imageAlt?: string
  type?: 'website' | 'article'
}

export function createPageMetadata({
  title,
  description,
  path,
  image = DEFAULT_SOCIAL_IMAGE,
  imageAlt = `${title} — Zap Game`,
  type = 'website',
}: PageSeoOptions): Metadata {
  const canonical = path === '/' ? SEO_SITE_ORIGIN : new URL(path, SEO_SITE_URL).href
  const socialImage = new URL(image, SEO_SITE_URL).href

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type,
      locale: 'pt_BR',
      siteName: 'Zap Game',
      url: canonical,
      title,
      description,
      images: [{ url: socialImage, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [socialImage],
    },
  }
}
