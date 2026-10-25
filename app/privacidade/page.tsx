import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de privacidade — Zap Game',
  description: 'Política de privacidade e publicidade do Zap Game.',
  alternates: { canonical: '/privacidade' },
}

export default function PrivacyPage() {
  return (
    <main className="zg-shell">
      <div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
        <a href="/" style={{ color: '#f05a47' }}>← Voltar ao Zap Game</a>
        <article style={{ marginTop: '2rem', lineHeight: 1.75 }}>
          <p className="zg-kicker">TRANSPARÊNCIA</p>
          <h1>Política de privacidade</h1>
          <p>Última atualização: outubro de 2026.</p>

          <h2>1. Como o site funciona</h2>
          <p>O Zap Game é um catálogo de jogos clássicos e jogos de navegador. Algumas experiências podem carregar conteúdo de plataformas parceiras, que possuem suas próprias políticas de privacidade.</p>

          <h2>2. Publicidade e cookies</h2>
          <p>Utilizamos o Google AdSense para exibir publicidade. O Google e seus parceiros podem usar cookies e tecnologias semelhantes para personalizar anúncios, medir desempenho e evitar publicidade fraudulenta, de acordo com as configurações e consentimentos aplicáveis ao visitante.</p>
          <p>Você pode controlar a personalização de anúncios nas <a href="https://adssettings.google.com" rel="noreferrer">Configurações de anúncios do Google</a> e consultar a <a href="https://policies.google.com/technologies/ads" rel="noreferrer">política de publicidade do Google</a>.</p>

          <h2>3. Dados técnicos</h2>
          <p>A hospedagem e a entrega do site podem registrar dados técnicos, como endereço IP, navegador, dispositivo e páginas acessadas, para segurança, funcionamento e métricas agregadas. O Zap Game não solicita cadastro para navegar no catálogo.</p>

          <h2>4. Seus direitos</h2>
          <p>Você pode limpar dados locais do navegador e gerenciar preferências de anúncios pelos controles oferecidos pelo Google e pelo próprio navegador. Para dúvidas sobre privacidade, use o canal de contato disponibilizado pelo administrador do site ou o canal de remoção descrito na <a href="/direitos-autorais">política de direitos autorais</a>.</p>

          <h2>5. Atualizações</h2>
          <p>Esta política pode ser atualizada quando novos recursos, parceiros ou requisitos legais forem incorporados ao serviço.</p>

          <p><a href="/termos">Leia também os Termos de uso do Zap Game.</a></p>
        </article>
      </div>
    </main>
  )
}
