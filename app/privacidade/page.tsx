import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Política de privacidade — Zap Game',
  description: 'Como o Zap Game trata dados técnicos, analytics, armazenamento local e publicidade.',
  path: '/privacidade',
  imageAlt: 'Política de privacidade do Zap Game',
})

export default function PrivacyPage() {
  return (
    <main className="zg-shell">
      <div className="zg-wrap" style={{ maxWidth: 860, paddingBlock: '3rem' }}>
        <a href="/" style={{ color: '#f05a47' }}>← Voltar ao Zap Game</a>
        <article style={{ marginTop: '2rem', lineHeight: 1.75 }}>
          <p className="zg-kicker">TRANSPARÊNCIA</p>
          <h1>Política de privacidade</h1>
          <p>Última atualização: outubro de 2026.</p>
          <p>Esta política explica, em linguagem simples, quais dados podem ser tratados quando você acessa o Zap Game, um catálogo brasileiro de jogos de navegador, e como entrar em contato com o responsável pelo site.</p>

          <h2>1. Quem administra o site</h2>
          <p>O Zap Game é administrado pelo responsável pelo projeto e mantém o e-mail <a href="mailto:siteparanegocios02@gmail.com">siteparanegocios02@gmail.com</a> para dúvidas, solicitações de privacidade, correções e direitos autorais. O site não exige cadastro para navegar pelo catálogo.</p>

          <h2>2. Dados técnicos e hospedagem</h2>
          <p>A hospedagem e a entrega do site podem tratar dados técnicos necessários ao funcionamento e à segurança, como endereço IP, navegador, sistema, dispositivo, data e hora, páginas acessadas e informações de erro. Esses dados podem ser processados pela infraestrutura da Vercel e por provedores necessários para entregar o site.</p>
          <p>O Zap Game não usa esses dados para criar uma conta de usuário e não solicita nome, senha, telefone ou dados bancários para permitir a navegação.</p>

          <h2>3. Vercel Analytics</h2>
          <p>Em produção, o Zap Game utiliza o Vercel Analytics para obter métricas agregadas de uso e entender quais páginas e recursos precisam de melhoria. O serviço pode receber informações técnicas relacionadas à visita, conforme a documentação e as políticas da Vercel.</p>
          <p>Os eventos próprios do site podem registrar ações como abertura de uma ficha, clique para jogar, conclusão do quiz, clique em uma recomendação e progresso da Jornada local. Os parâmetros enviados são voltados à análise do produto, como slug, título, categoria, posição ou nome do recurso. O Zap Game não deve enviar senhas, mensagens, dados bancários ou outros dados diretamente identificáveis nesses eventos.</p>

          <h2>4. Google Analytics, quando ativado</h2>
          <p>O Google Analytics só é carregado quando existe uma configuração técnica específica do projeto para essa finalidade. Quando ativado, ele é carregado depois da interação inicial da página e configura a anonimização de IP prevista na integração atual. A disponibilidade desse recurso pode variar conforme o ambiente e as configurações aplicáveis ao site.</p>
          <p>Para informações sobre o tratamento realizado pelo Google, consulte a <a href="https://policies.google.com/privacy" rel="noreferrer">Política de Privacidade do Google</a>. Você também pode controlar recursos de medição e publicidade por meio das configurações do navegador e das ferramentas oferecidas pelo próprio Google.</p>

          <h2>5. Armazenamento local da Jornada</h2>
          <p>A Jornada local do Zap Game usa o armazenamento local do navegador (<code>localStorage</code>) para lembrar quais fichas de jogos foram abertas naquele dispositivo e mostrar um progresso de descoberta. Atualmente, a chave usada para essa finalidade é <code>zapgame-discovered-games</code>.</p>
          <p>Esse registro fica no navegador do visitante, não exige login e não é usado para identificar uma pessoa. Ele pode desaparecer quando os dados do site forem apagados, quando o navegador for trocado ou quando o visitante usar outro dispositivo. O recurso pode não funcionar se o navegador bloquear o armazenamento local, sem impedir a navegação básica pelo site.</p>
          <p>Para apagar esse registro, limpe os dados do site nas configurações do navegador. Isso também pode remover outras preferências armazenadas localmente por esse domínio.</p>

          <h2>6. Publicidade e serviços externos</h2>
          <p>O Zap Game pode exibir publicidade, inclusive por meio do Google AdSense, quando essa integração estiver habilitada e aprovada para o site. O Google e seus parceiros podem usar cookies ou tecnologias semelhantes para exibir, limitar, medir ou proteger anúncios, de acordo com as configurações e consentimentos aplicáveis ao visitante.</p>
          <p>Você pode consultar as <a href="https://adssettings.google.com" rel="noreferrer">Configurações de anúncios do Google</a> e a <a href="https://policies.google.com/technologies/ads" rel="noreferrer">política de publicidade do Google</a>. O bloqueio de cookies ou de scripts pode alterar algumas funcionalidades e preferências, mas não deve impedir o acesso básico às páginas públicas.</p>

          <h2>7. Jogos e links de parceiros</h2>
          <p>As fichas identificam o GamePix ou outra fonte quando aplicável. Ao clicar em “Jogar”, você pode ser encaminhado para um serviço externo, que pode tratar dados, usar publicidade e aplicar regras próprias. Leia a política de privacidade e os termos do serviço externo antes de fornecer qualquer informação por lá.</p>

          <h2>8. Direitos e solicitações</h2>
          <p>Conforme a legislação aplicável, você pode solicitar informações sobre o tratamento relacionado ao site, pedir correção de dados fornecidos por você ou enviar dúvidas sobre privacidade. Como a Jornada local fica no seu próprio navegador, a limpeza desse registro normalmente pode ser feita diretamente nas configurações do dispositivo.</p>
          <p>Envie solicitações para <a href="mailto:siteparanegocios02@gmail.com">siteparanegocios02@gmail.com</a>. Para remoção ou contestação relacionada a conteúdo, consulte também a <a href="/direitos-autorais">Política de direitos autorais</a>.</p>

          <h2>9. Alterações nesta política</h2>
          <p>Esta política pode ser atualizada quando novos recursos, parceiros, ferramentas de medição, publicidade ou requisitos legais forem incorporados ao serviço. A data no início desta página será atualizada quando houver uma mudança relevante.</p>

          <p><a href="/contato">Consulte a página de Contato</a> e leia também os <a href="/termos">Termos de uso do Zap Game</a>.</p>
        </article>
      </div>
    </main>
  )
}
