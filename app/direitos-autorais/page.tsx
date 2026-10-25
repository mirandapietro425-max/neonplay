import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Direitos autorais — Zap Game',
  description: 'Política de créditos, direitos autorais e remoção de conteúdo do Zap Game.',
  alternates: { canonical: '/direitos-autorais' },
}

export default function CopyrightPage() {
  return (
    <main className="zg-shell">
      <div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
        <a href="/" style={{ color: '#f05a47' }}>← Voltar ao Zap Game</a>
        <article style={{ marginTop: '2rem', lineHeight: 1.75 }}>
          <p className="zg-kicker">DIREITOS E CRÉDITOS</p>
          <h1>Direitos autorais e remoção de conteúdo</h1>
          <p>Última atualização: outubro de 2026.</p>

          <h2>Créditos e titularidade</h2>
          <p>Os jogos, personagens, marcas, capas, textos e demais materiais de terceiros pertencem aos respectivos titulares. A identificação de uma fonte ou a existência de um registro público não significa que o Zap Game seja titular ou que exista autorização automática para distribuição e monetização.</p>

          <h2>Curadoria e fontes</h2>
          <p>O Zap Game busca indicar a origem conhecida de cada item e diferenciar conteúdo próprio, jogos de parceiros e registros arquivados. Quando a autorização ou a titularidade não puder ser confirmada, o item poderá ser removido do catálogo ou deixar de ser indexado.</p>

          <h2>Pedido de remoção</h2>
          <p>O titular ou representante autorizado que identificar uma possível violação deve informar o título ou URL da ficha, explicar qual material está sendo contestado, comprovar a titularidade ou representação e indicar uma forma de retorno. O pedido será analisado e o acesso poderá ser suspenso enquanto os dados são verificados.</p>
          <p>Pedidos incompletos, sem identificação do material ou sem informação suficiente para localizar a ficha podem exigir esclarecimentos antes da análise.</p>
          <p>Envie a solicitação para <a href="mailto:siteparanegocios02@gmail.com">siteparanegocios02@gmail.com</a> ou use a <a href="/contato">página de Contato</a>.</p>

          <h2>Atualizações</h2>
          <p>Esta política pode ser atualizada quando forem definidos novos canais de atendimento, fontes, licenças ou procedimentos de revisão.</p>

          <p><a href="/sobre">Veja como o catálogo funciona</a> e consulte também os <a href="/termos">Termos de uso</a>.</p>
        </article>
      </div>
    </main>
  )
}
