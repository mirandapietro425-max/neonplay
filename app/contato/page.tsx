import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contato — Zap Game',
  description: 'Canal de contato do Zap Game para dúvidas, correções, privacidade e direitos autorais.',
  alternates: { canonical: '/contato' },
}

export default function ContactPage() {
  return (
    <main className="zg-shell">
      <div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
        <a href="/" style={{ color: '#f05a47' }}>← Voltar ao Zap Game</a>
        <article style={{ marginTop: '2rem', lineHeight: 1.75 }}>
          <p className="zg-kicker">FALE COM O ZAP GAME</p>
          <h1>Contato</h1>
          <p>Use este canal para enviar dúvidas sobre o site, correções de informações, solicitações relacionadas à privacidade e pedidos de remoção de conteúdo.</p>

          <h2>Canal de atendimento</h2>
          <p><strong>E-mail:</strong> <a href="mailto:siteparanegocios02@gmail.com">siteparanegocios02@gmail.com</a></p>
          <p>Ao escrever, informe o assunto com clareza e inclua a URL da página quando a mensagem se referir a um jogo ou conteúdo específico. As mensagens são analisadas pelo administrador do site.</p>

          <h2>Pedidos de direitos autorais</h2>
          <p>Para solicitar a revisão ou remoção de uma ficha, informe o título, a URL, o material contestado, a justificativa e uma forma de comprovar a titularidade ou representação. Consulte também a <a href="/direitos-autorais">política de direitos autorais</a>.</p>

          <h2>Privacidade</h2>
          <p>Para dúvidas sobre dados técnicos, cookies ou publicidade, consulte a <a href="/privacidade">Política de privacidade</a> e envie a solicitação pelo e-mail acima.</p>

          <p>O Zap Game não promete prazo fixo de resposta, mas procura analisar solicitações completas em tempo razoável.</p>
        </article>
      </div>
    </main>
  )
}
