export type IntentGuide = {
  slug: string
  title: string
  description: string
  kicker: string
  intro: string
  sections: Array<{ heading: string; paragraphs: string[] }>
  games: Array<{ title: string; href: string; reason: string }>
}

export const intentGuides: IntentGuide[] = [
  {
    slug: 'jogos-de-navegador-no-celular',
    title: 'Jogos de navegador para jogar no celular',
    description: 'Como escolher jogos de navegador para celular observando proposta, simplicidade e compatibilidade da versão disponível.',
    kicker: 'GUIA PARA CELULAR',
    intro: 'Jogar no celular exige mais do que encontrar um título interessante. A interface precisa ser compreensível, o carregamento precisa funcionar bem e os controles oferecidos pela versão externa precisam ser observados antes de começar.',
    sections: [
      { heading: 'O que observar antes de jogar', paragraphs: ['O Zap Game não promete compatibilidade universal porque cada jogo pode ser entregue pelo parceiro de uma forma diferente. Abra a ficha, confira a versão disponível e observe se a tela inicial oferece controles adequados ao seu dispositivo.', 'Para uma primeira tentativa, prefira propostas simples de entender, como esporte, puzzle, arcade e experiências casuais. Isso não garante desempenho, mas reduz o tempo necessário para descobrir como começar.'] },
      { heading: 'Escolhas para começar', paragraphs: ['Basketball Stars apresenta uma proposta esportiva direta. Baby Hazel Bed Time segue uma sequência casual de tarefas. Body Drop 3D aposta em física e observação. As três fichas possuem curadoria editorial própria no Zap Game, mas a compatibilidade final depende da plataforma que abre o jogo.'] },
    ],
    games: [
      { title: 'Basketball Stars', href: '/jogos/gamepix-basketball-stars-35lbe', reason: 'Esporte e confronto direto.' },
      { title: 'Baby Hazel Bed Time', href: '/jogos/gamepix-baby-hazel-bed-time-6b1i8', reason: 'Experiência casual de tarefas.' },
      { title: 'Body Drop 3D', href: '/jogos/gamepix-body-drop-3d-36do1', reason: 'Física e simulação casual.' },
    ],
  },
  {
    slug: 'jogos-leves-para-pc-fraco',
    title: 'Jogos de navegador para PC fraco',
    description: 'Critérios para encontrar jogos de navegador mais simples para computadores com recursos limitados.',
    kicker: 'GUIA DE DESEMPENHO',
    intro: 'Um computador mais antigo pode rodar experiências de navegador, mas o resultado depende do jogo, do navegador, da conexão e de outros programas abertos. Por isso, não existe uma lista universal de jogos “garantidos” para qualquer PC.',
    sections: [
      { heading: 'Como reduzir problemas', paragraphs: ['Feche abas que não estão sendo usadas, mantenha o navegador atualizado e teste primeiro jogos com proposta visual mais simples. Se houver travamentos, reduza outras atividades do computador antes de concluir que o jogo não funciona.', 'A ficha do Zap Game identifica a origem e a proposta, mas não substitui um teste no seu equipamento. Configurações do parceiro e atualizações podem alterar o desempenho.'] },
      { heading: 'Boas categorias para começar', paragraphs: ['Arcade, puzzle, esporte e gerenciamento costumam ser boas categorias para uma primeira tentativa porque têm objetivos claros. Ainda assim, a qualidade técnica varia entre títulos e deve ser observada caso a caso.'] },
    ],
    games: [
      { title: 'Babel Tower', href: '/jogos/gamepix-babel-tower-45tbr', reason: 'Construção e gerenciamento.' },
      { title: 'Basket Champs', href: '/jogos/gamepix-basket-champs-40307', reason: 'Esporte em formato de campeonato.' },
      { title: 'Amaze Escape', href: '/jogos/gamepix-amaze-escape-am511', reason: 'Puzzle e lógica.' },
    ],
  },
  {
    slug: 'jogos-multiplayer-para-amigos',
    title: 'Jogos multiplayer de navegador para amigos',
    description: 'Como escolher jogos de navegador para competir ou colaborar com amigos sem confundir multiplayer local e online.',
    kicker: 'GUIA MULTIPLAYER',
    intro: 'A palavra multiplayer pode significar experiências diferentes. Alguns jogos são feitos para dois jogadores, outros dependem de uma sala online e outros apenas usam competição contra personagens controlados pelo próprio jogo.',
    sections: [
      { heading: 'Confirme o modo antes de combinar', paragraphs: ['Leia a descrição e confira a tela inicial do jogo. Veja se cada participante precisa de um dispositivo, se existe uma opção local ou se a conexão depende do serviço parceiro. O Zap Game não transforma uma descrição de multiplayer em garantia de funcionamento.', 'Também combine quem vai abrir a partida e evite inserir dados pessoais em telas externas que não sejam necessárias para jogar.'] },
      { heading: 'Títulos para investigar', paragraphs: ['Basketball Stars é descrito pelo parceiro como uma experiência para dois jogadores. Among at Easter apresenta uma proposta de tarefas e dedução social. Bomber Friends aposta em arena e explosões. Confira os recursos disponíveis no momento do acesso.'] },
    ],
    games: [
      { title: 'Basketball Stars', href: '/jogos/gamepix-basketball-stars-35lbe', reason: 'Basquete e confronto direto.' },
      { title: 'Among at Easter', href: '/jogos/gamepix-among-at-easter-ng7tt', reason: 'Tarefas e dedução social.' },
      { title: 'Bomber Friends', href: '/jogos/gamepix-bomber-friends-40344', reason: 'Arena e decisões rápidas.' },
    ],
  },
  {
    slug: 'jogos-de-esporte-no-navegador',
    title: 'Jogos de esporte para jogar no navegador',
    description: 'Uma seleção editorial de jogos de esporte no navegador, com basquete e critérios para escolher uma partida.',
    kicker: 'GUIA DE ESPORTES',
    intro: 'Jogos esportivos de navegador podem oferecer partidas rápidas, campeonatos ou disputa direta. A melhor escolha depende de você querer uma sessão curta, uma competição por etapas ou uma experiência para dividir com outra pessoa.',
    sections: [
      { heading: 'Partidas rápidas ou campeonato', paragraphs: ['Basketball Stars concentra a proposta em confrontos de basquete. Basket Champs apresenta uma ideia de campeonato. Leia a ficha antes de jogar para entender qual formato combina mais com o tempo que você tem.', 'Os textos editoriais do Zap Game explicam a proposta sem atribuir notas ou estatísticas inventadas. Recursos e modos podem mudar conforme a versão GamePix.'] },
      { heading: 'Como escolher', paragraphs: ['Prefira uma partida rápida quando quiser testar o jogo sem compromisso. Escolha um formato de campeonato quando estiver procurando uma progressão em etapas. Para jogar com amigos, confirme se o modo multiplayer informado pelo parceiro está disponível.'] },
    ],
    games: [
      { title: 'Basketball Stars', href: '/jogos/gamepix-basketball-stars-35lbe', reason: 'Confronto de basquete.' },
      { title: 'Basket Champs', href: '/jogos/gamepix-basket-champs-40307', reason: 'Competição em formato de campeonato.' },
    ],
  },
]

export const intentGuideBySlug = new Map(intentGuides.map((guide) => [guide.slug, guide]))
