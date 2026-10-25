import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { intentGuideBySlug, intentGuides } from '@/lib/intent-guides'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return intentGuides.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = intentGuideBySlug.get(slug)
  if (!guide) return { title: 'Guia não encontrado | Zap Game', robots: { index: false, follow: true } }
  return { title: `${guide.title} | Zap Game`, description: guide.description, alternates: { canonical: `/guias/tema/${guide.slug}` } }
}

export default async function IntentGuidePage({ params }: Props) {
  const { slug } = await params
  const guide = intentGuideBySlug.get(slug)
  if (!guide) notFound()

  return <main className="zg-shell"><div className="zg-wrap" style={{ maxWidth: 900, paddingBlock: '3rem' }}>
    <nav aria-label="Navegação estrutural"><Link href="/">Início</Link><span aria-hidden="true"> / </span><Link href="/guias">Guias</Link><span aria-hidden="true"> / </span><span>{guide.title}</span></nav>
    <article style={{ marginTop: '2rem', lineHeight: 1.8 }}>
      <p className="zg-kicker">{guide.kicker}</p>
      <h1>{guide.title}</h1>
      <p style={{ fontSize: '1.12rem', maxWidth: 760 }}>{guide.intro}</p>
      {guide.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
      <h2>Jogos relacionados no Zap Game</h2>
      <div className="zg-related-grid">{guide.games.map((game) => <Link className="zg-related-card" key={game.href} href={game.href}><span>{game.title}</span><small>{game.reason}</small></Link>)}</div>
      <p style={{ marginTop: '2rem' }}><Link href="/contato">Encontrou uma informação desatualizada? Fale com o Zap Game.</Link></p>
    </article>
  </div></main>
}
