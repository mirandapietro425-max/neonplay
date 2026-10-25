import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de uso — Zap Game',
  description: 'Termos de uso do catálogo e dos links externos do Zap Game.',
  alternates: { canonical: '/termos' },
}

export default function TermsPage() {
  return (
    <main className="zg-shell">
      <div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
        <a href="/" style={{ color: '#f05a47' }}>← Voltar ao Zap Game</a>
        <article style={{ marginTop: '2rem', lineHeight: 1.75 }}>
          <p className="zg-kicker">TRANSPARÊNCIA</p>
          <h1>Termos de uso</h1>
          <p>Última atualização: outubro de 2026.</p>

          <h2>1. Finalidade do site</h2>
          <p>O Zap Game é um catálogo editorial de jogos e experiências de navegador. O site organiza informações de descoberta, como título, categoria, imagem, descrição e origem indicada, e pode direcionar o visitante para serviços externos.</p>

          <h2>2. Serviços externos</h2>
          <p>Quando uma ficha aponta para uma plataforma parceira, o jogo é carregado ou aberto de acordo com as regras dessa plataforma. O Zap Game não controla a disponibilidade, a publicidade, os requisitos técnicos, a conta do usuário ou o conteúdo exibido pelo serviço externo.</p>

          <h2>3. Uso responsável</h2>
          <p>Use o site de forma lícita e respeitosa. Não tente burlar anúncios, explorar falhas, prejudicar a infraestrutura, automatizar acessos abusivos ou usar o catálogo para infringir direitos de terceiros.</p>

          <h2>4. Conteúdo e disponibilidade</h2>
          <p>Informações de catálogo podem ser corrigidas, atualizadas ou removidas quando a fonte mudar, o conteúdo deixar de estar disponível ou surgir uma dúvida legítima sobre autorização. Nenhuma ficha garante que um jogo continuará acessível.</p>

          <h2>5. Publicidade</h2>
          <p>O site pode exibir publicidade de terceiros. Os anúncios devem ser usados de acordo com as políticas do provedor. O Zap Game não pede que visitantes cliquem em anúncios nem oferece recompensa por impressões ou cliques.</p>

          <h2>6. Alterações</h2>
          <p>Estes termos podem ser atualizados quando o catálogo, os parceiros ou os requisitos legais mudarem. A versão publicada nesta página é a versão vigente.</p>

          <p><a href="/direitos-autorais">Consulte também a política de direitos autorais e remoção de conteúdo.</a></p>
        </article>
      </div>
    </main>
  )
}
