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
  const guideArt: Record<string, { label: string; image: string }> = {
    'jogos-de-navegador-no-celular': { label: 'GUIA PARA CELULAR', image: '/brand/guide-mobile.webp' },
    'jogos-leves-para-pc-fraco': { label: 'GUIA DE DESEMPENHO', image: '/brand/guide-low-pc.webp' },
    'jogos-multiplayer-para-amigos': { label: 'GUIA MULTIPLAYER', image: '/brand/guide-multiplayer.webp' },
    'jogos-de-esporte-no-navegador': { label: 'GUIA DE ESPORTES', image: '/brand/guide-sports.webp' },
  }
  const art = guideArt[guide.slug]
  const canonical = `https://www.zapgame.com.br/guias/tema/${guide.slug}`
  const schema = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://www.zapgame.com.br/' },
      { '@type': 'ListItem', position: 2, name: 'Guias', item: 'https://www.zapgame.com.br/guias' },
      { '@type': 'ListItem', position: 3, name: guide.title, item: canonical },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: guide.faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) },
  ]

  return <main className="zg-shell"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /><div className="zg-wrap" style={{ maxWidth: 900, paddingBlock: '3rem' }}>
    <nav aria-label="Navegação estrutural"><Link href="/">Início</Link><span aria-hidden="true"> / </span><Link href="/guias">Guias</Link><span aria-hidden="true"> / </span><span>{guide.title}</span></nav>
    <section className="zg-guide-article-hero" style={{ backgroundImage: `url('${art.image}')` }}><div><p className="zg-eyebrow">{art.label}</p><h1>{guide.title}</h1><p>{guide.description}</p></div></section>
    <article className="zg-guide-article" style={{ lineHeight: 1.8 }}>
      <p className="zg-kicker">{guide.kicker}</p>
      <p style={{ fontSize: '1.12rem', maxWidth: 760 }}>{guide.intro}</p>
      {guide.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
      <h2>Jogos relacionados no Zap Game</h2>
      <div className="zg-related-grid">{guide.games.map((game) => <Link className="zg-related-card" key={game.href} href={game.href}><span>{game.title}</span><small>{game.reason}</small></Link>)}</div>
      <section><h2>Perguntas frequentes</h2>{guide.faqs.map((faq) => <div key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></div>)}</section>
      <p style={{ marginTop: '2rem' }}><Link href="/contato">Encontrou uma informação desatualizada? Fale com o Zap Game.</Link></p>
    </article>
  </div></main>
}
