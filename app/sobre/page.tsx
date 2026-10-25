import type { Metadata } from 'next'

const siteOrigin = 'https://www.zapgame.com.br'
const description = 'Conheça o catálogo Zap Game, como as fichas de jogos são organizadas, quais serviços externos são usados e como os direitos dos jogos são atribuídos.'

export const metadata: Metadata = {
  title: 'Sobre o Zap Game — catálogo e fontes',
  description,
  alternates: { canonical: '/sobre' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Zap Game',
    url: '/sobre',
    title: 'Sobre o Zap Game — catálogo e fontes',
    description,
    images: [{ url: '/brand/zapgame-og.webp', alt: 'Zap Game: catálogo de jogos clássicos e de navegador' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sobre o Zap Game — catálogo e fontes',
    description,
    images: ['/brand/zapgame-og.webp'],
  },
}

export default function AboutPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${siteOrigin}/` },
      { '@type': 'ListItem', position: 2, name: 'Sobre o Zap Game', item: `${siteOrigin}/sobre` },
    ],
  }

  return (
    <main className="zg-shell">
      <div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }}
        />
        <a href="/" style={{ color: '#f05a47' }}>← Voltar ao Zap Game</a>
        <article style={{ marginTop: '2rem', lineHeight: 1.75 }}>
          <p className="zg-kicker">TRANSPARÊNCIA</p>
          <h1>Sobre o Zap Game</h1>
          <p>O Zap Game organiza um catálogo de jogos clássicos e experiências de navegador. As fichas ajudam a encontrar títulos por nome e categoria, mostram as informações disponíveis e indicam onde abrir cada jogo.</p>

          <h2>Como o catálogo funciona</h2>
          <p>Uma ficha pode apresentar uma descrição, uma capa, dados do registro de origem e links para serviços externos. A disponibilidade, os requisitos e a compatibilidade do jogo dependem do serviço indicado na própria ficha; o Zap Game não controla plataformas de terceiros.</p>
          <p>O catálogo atual prioriza jogos próprios do Zap Game e jogos disponibilizados por parceiro identificado, como o GamePix. Registros arquivados de terceiros não são publicados enquanto a autorização de distribuição e uso comercial não estiver documentada.</p>

          <h2>Fontes, créditos e direitos</h2>
          <p>Os jogos, personagens, marcas e materiais de terceiros pertencem aos respectivos titulares. Uma ficha ou um link para um registro externo não significa que o Zap Game seja proprietário do jogo, que tenha uma licença de distribuição ou que exista aprovação oficial do titular.</p>
          <p>As fontes apresentadas servem para identificar a origem conhecida de cada item. A presença de um arquivo em um catálogo público, serviço de preservação ou plataforma de jogos, por si só, não comprova autorização para reutilização ou monetização. A disponibilidade e as permissões podem variar conforme o título e o provedor.</p>

          <h2>Como fazemos a curadoria</h2>
          <p>O catálogo é organizado por categoria, origem e disponibilidade. Antes de manter uma ficha, procuramos preservar o nome correto, indicar a fonte, remover descrições sem informação útil e evitar apresentar como próprio aquilo que pertence a outra plataforma. Registros antigos ficam fora da publicação até passar por revisão de direitos; fichas podem ser corrigidas, desindexadas ou removidas quando a fonte mudar ou quando houver dúvida legítima sobre autorização.</p>

          <h2>Publicidade e privacidade</h2>
          <p>O site pode exibir publicidade. Para saber como o site trata dados técnicos, cookies e preferências de anúncios, consulte a <a href="/privacidade">Política de privacidade</a>. Os serviços externos acessados a partir das fichas podem ter regras próprias.</p>

          <h2>Políticas do site</h2>
          <p>Leia os <a href="/termos">Termos de uso</a> e a <a href="/direitos-autorais">política de direitos autorais e remoção de conteúdo</a> para entender os limites do catálogo.</p>

          <h2>Explore o catálogo</h2>
          <p>Use a <a href="/#catalogo">página inicial</a> para buscar títulos ou navegue pelas <a href="/#categorias">categorias de jogos</a>. Cada ficha contém um link para a fonte ou para a versão disponível no serviço indicado.</p>
        </article>
      </div>
    </main>
  )
}
