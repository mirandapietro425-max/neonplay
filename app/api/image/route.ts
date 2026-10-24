import { NextRequest } from 'next/server'

const allowedHosts = new Set(['img.gamepix.com', 'games.assets.gamepix.com', 'archive.org'])

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl) return new Response('Missing image URL', { status: 400 })

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return new Response('Invalid image URL', { status: 400 })
  }

  if (target.protocol !== 'https:' || !allowedHosts.has(target.hostname)) {
    return new Response('Image host not allowed', { status: 403 })
  }

  const response = await fetch(target, { next: { revalidate: 3600 } })
  if (!response.ok) return new Response('Image unavailable', { status: response.status })

  return new Response(response.body, {
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
