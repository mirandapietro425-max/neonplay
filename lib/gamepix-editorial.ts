export type GamePixEditorial = {
  description: string
  whyPlay: string
  audience: string
  editorialNote: string
  headline?: string
  session?: string
  controls?: string
  tags?: string[]
  objective?: string
  playerMode?: {
    label: string
    modes: Array<'CoOp' | 'MultiPlayer' | 'SinglePlayer'>
    source: 'zapgame-tested' | 'partner-stated'
  }
  compatibility?: Array<{
    device: 'desktop' | 'mobile' | 'tablet'
    source: 'zapgame-tested' | 'partner-stated'
  }>
  difficulty?: string
  verifiedAt?: string
}

export const gamePixEditorial: Record<string, GamePixEditorial> = {
  '36DO1': {
    description: 'Body Drop 3D usa física, movimento e impacto como centro da experiência. A graça está em observar como o personagem reage a cada situação e em descobrir o comportamento mais interessante de cada cenário.',
    whyPlay: 'É uma opção diferente para quem prefere experimentar movimentos e simulações rápidas em vez de seguir uma campanha longa.',
    audience: 'Indicado para quem gosta de física, simulação casual e partidas curtas.',
    editorialNote: 'Texto editorial do Zap Game baseado na proposta apresentada pelo parceiro GamePix; a disponibilidade pode mudar conforme a versão externa.',
  },
  '35LBE': {
    description: 'Basketball Stars leva o basquete para partidas diretas, com foco em arremessos, defesa e disputa entre equipes. A proposta é começar rapidamente e concentrar a atenção nos momentos decisivos de cada confronto.',
    whyPlay: 'Funciona bem para quem quer uma experiência esportiva objetiva, sem precisar aprender sistemas complexos antes de jogar.',
    audience: 'Indicado para fãs de basquete e para quem gosta de jogos competitivos de navegador.',
    editorialNote: 'A ficha descreve a proposta editorial; modos, equipes e recursos podem variar conforme a versão oferecida pelo GamePix.',
  },
  'NG7TT': {
    description: 'Among at Easter combina tarefas, cooperação e suspeita em uma aventura multiplayer com tema de Páscoa. O interesse vem de observar o grupo, cumprir objetivos e tentar perceber quem está agindo contra a equipe.',
    whyPlay: 'É uma escolha natural para grupos que gostam de dedução social e partidas em que cada decisão muda a confiança entre os participantes.',
    audience: 'Indicado para quem procura multiplayer, investigação e situações imprevisíveis.',
    editorialNote: 'A ficha não promete um modo específico de conexão; confirme os recursos disponíveis na tela inicial do jogo.',
    headline: 'Descubra o impostor antes da partida acabar',
    session: 'A duração das partidas não foi informada; a confirmar.',
    controls: 'Os controles não foram descritos; a confirmar.',
    tags: ['dedução social', 'impostor', 'sabotagem', 'votação'],
  },
  'O2NNU': {
    description: 'Battle Simulator - Counter Stickman transforma uma batalha de personagens-palito em um desafio de planejamento. O visual simples deixa o foco nas unidades, no confronto e na escolha de uma abordagem para cada situação.',
    whyPlay: 'A proposta agrada quem gosta de observar batalhas e testar decisões estratégicas sem uma interface pesada.',
    audience: 'Indicado para fãs de simuladores de batalha, estratégia rápida e jogos stickman.',
    editorialNote: 'A análise editorial trata da proposta geral do título e não substitui os detalhes exibidos pelo parceiro.',
    headline: 'Tática com stickmen em batalha 3D',
    session: 'Sessão curta ou variável, a confirmar conforme a quantidade de níveis e o ritmo das batalhas.',
    controls: 'A confirmar.',
    tags: ['stickman', 'simulação de batalha', 'tática', '3D'],
  },
  '40450': {
    description: 'Alpha Guns é um jogo de ação lateral com inspiração nos clássicos de tiro arcade. O jogador avança por fases, enfrenta ameaças e mantém o ritmo em uma experiência centrada em movimento e disparos.',
    whyPlay: 'É uma boa porta de entrada para quem procura ação direta e fases fáceis de entender.',
    audience: 'Indicado para fãs de tiro 2D, ação arcade e jogos com visual retrô.',
    editorialNote: 'A página do Zap Game acrescenta contexto ao título, enquanto a versão jogável e seus recursos pertencem ao parceiro GamePix.',
  },
  '40344': {
    description: 'Bomber Friends coloca os participantes em uma arena de obstáculos e explosões. O desafio está em usar o espaço com cuidado, encontrar oportunidades e evitar ficar preso pelas próprias decisões.',
    whyPlay: 'A combinação de posicionamento e partidas rápidas cria uma experiência fácil de entender, mas capaz de gerar reviravoltas.',
    audience: 'Indicado para quem gosta de arenas, competição direta e jogos para jogar em grupo.',
    editorialNote: 'A ficha evita afirmar um tipo de multiplayer que não foi verificado fora da descrição do parceiro.',
    headline: 'Explosões e sobrevivência entre amigos',
    session: 'A confirmar; a descrição não informa a duração das partidas.',
    controls: 'A confirmar; a descrição não informa os controles.',
    tags: ['bombas', 'sobrevivência', 'power-ups', 'explosões'],
  },
  '40263': {
    description: '1941 Frozen Front apresenta uma experiência de estratégia militar ambientada em um cenário histórico. O foco está em avançar, defender posições e escolher o momento certo para cada movimento.',
    whyPlay: 'É uma alternativa para quem prefere planejar a partida em vez de depender apenas de reflexos.',
    audience: 'Indicado para jogadores interessados em estratégia, campanhas militares e decisões por etapas.',
    editorialNote: 'O contexto histórico pertence à descrição do título; a ficha não pretende substituir material histórico ou educacional especializado.',
  },
  '45TBR': {
    description: 'Babel Tower é uma experiência de construção e gerenciamento baseada no crescimento de uma torre. A progressão depende de organizar trabalhadores e acompanhar a expansão do projeto ao longo da partida.',
    whyPlay: 'A proposta é interessante para quem gosta de ver um projeto crescer aos poucos e tomar decisões de administração.',
    audience: 'Indicado para fãs de construção, gerenciamento e evolução progressiva.',
    editorialNote: 'Os detalhes de recursos e progressão podem ser atualizados pelo parceiro sem aviso ao Zap Game.',
  },
  '40307': {
    description: 'Basket Champs leva o basquete para uma competição em formato de campeonato. A experiência combina partidas esportivas objetivas com a sensação de avançar por uma sequência de confrontos.',
    whyPlay: 'É uma escolha simples para quem gosta da ideia de representar uma equipe e buscar a vitória em um torneio.',
    audience: 'Indicado para fãs de esportes, basquete e competições rápidas de navegador.',
    editorialNote: 'A ficha apresenta a proposta geral e não atribui estatísticas ou resultados de usuários sem fonte identificada.',
  },
  '6B1I8': {
    description: 'Baby Hazel Bed Time acompanha uma rotina noturna em uma experiência casual de tarefas sequenciais. O jogo tem uma proposta simples e familiar, com foco em acompanhar cada etapa antes de dormir.',
    whyPlay: 'Pode ser uma alternativa tranquila para quem procura uma experiência infantil sem competição intensa.',
    audience: 'Indicado para público infantil acompanhado por responsáveis e para famílias que buscam jogos casuais.',
    editorialNote: 'Responsáveis devem observar a publicidade e os links externos oferecidos pela plataforma que hospeda o jogo.',
  },
  '27115': {
    description: 'Bois d’Arc: Bow Shooting combina defesa, arco e flecha e proteção de um castelo em uma aventura de ação. O jogador precisa acompanhar as ameaças e usar os disparos para impedir o avanço dos inimigos.',
    whyPlay: 'A proposta mistura pontaria e defesa em uma estrutura fácil de reconhecer, mas que pede atenção crescente conforme o cenário avança.',
    audience: 'Indicado para quem gosta de tiro com arco, defesa de bases e ação de navegador.',
    editorialNote: 'A descrição editorial não confirma controles ou dificuldade; esses detalhes dependem da versão jogável do parceiro.',
  },
  '1TOD6': {
    description: 'Wounded Winter: A Lakota Story apresenta uma aventura de ação com ambientação western e narrativa própria. O título se destaca pela tentativa de combinar exploração, confronto e identidade visual em uma experiência curta de navegador.',
    whyPlay: 'É uma opção para quem procura um jogo de ação com cenário menos comum do que os temas arcade tradicionais.',
    audience: 'Indicado para jogadores que gostam de aventura, ação e ambientações western.',
    editorialNote: 'A ficha trata a referência cultural com cuidado e não pretende falar em nome do povo Lakota ou substituir fontes históricas.',
    headline: 'Resgate e vingança no Velho Oeste',
    session: 'Duração e ritmo das sessões: a confirmar.',
    controls: 'A confirmar.',
    tags: ['ação', 'shooter', 'western', 'low-poly', 'história'],
  },
  '40442': {
    description: 'Angry Gran leva você às ruas para enfrentar vizinhos punk em uma aventura de ação. É o jogo que deu início à série Angry Gran, segundo a descrição fornecida pelo parceiro.',
    whyPlay: 'Pode interessar a quem procura uma experiência direta de ação com uma protagonista inusitada e uma premissa fácil de entender.',
    audience: 'Indicado, de forma conservadora, para quem gosta de ação urbana; público e faixa etária ficam a confirmar.',
    editorialNote: 'Ficha baseada na descrição disponível na GamePix. Recursos, funcionamento e controles podem variar conforme a versão externa.',
    headline: 'A avó contra a vizinhança',
    session: 'Duração e formato da sessão: a confirmar.',
    controls: 'A confirmar; a descrição não informa os controles.',
    tags: ['ação', 'ruas', 'Angry Gran'],
  },
  '4482P': {
    description: 'Call of Ops 2 apresenta gráficos de nova geração e um grande arsenal para enfrentar jogadores rivais em diferentes mapas. A descrição destaca o foco em confrontos com armas, mas não confirma outros detalhes da experiência.',
    whyPlay: 'Pode interessar a quem procura uma ação de tiro com variedade visual e de armamentos.',
    audience: 'Indicado, a confirmar, para quem busca uma experiência de tiro com mapas e armas variadas.',
    editorialNote: 'Fonte GamePix; modos, controles, requisitos e disponibilidade podem variar conforme a versão oferecida.',
    headline: 'Arsenal amplo, mapas variados',
    session: 'Duração da sessão: a confirmar.',
    controls: 'A confirmar.',
    tags: ['tiro', 'armas', 'mapas', 'ação'],
  },
  '0914B': {
    description: 'Biozombie Outbreak coloca você em ruas urbanas tomadas por zumbis, com foco em tiroteios intensos. A proposta é usar diferentes armas e resistir até o tempo acabar.',
    whyPlay: 'Pode interessar a quem busca uma ação direta contra zumbis em um cenário urbano e com pressão de tempo.',
    audience: 'Indicado, a confirmar, para quem procura tiro, zumbis e sobrevivência.',
    editorialNote: 'Fonte GamePix; recursos, apresentação e disponibilidade podem variar conforme a versão ou a plataforma.',
    headline: 'Sobreviva ao surto nas ruas',
    session: 'A descrição indica uma partida limitada pelo tempo disponível para sobreviver; duração exata a confirmar.',
    controls: 'A confirmar.',
    tags: ['zumbis', 'tiro', 'ação', 'sobrevivência'],
  },
  'S11I6': {
    description: 'Big Shark coloca você no controle de um tubarão em uma sequência de desafios no oceano. A proposta é comer peixes menores, evitar os maiores e avançar pelos níveis.',
    whyPlay: 'Pode interessar a quem gosta de desafios de sobrevivência baseados em tamanho e progressão por níveis.',
    audience: 'Indicado, de forma conservadora, para quem procura desafios com tubarão, crescimento e obstáculos no oceano.',
    editorialNote: 'Ficha baseada na descrição fornecida pela GamePix; controles, recursos e detalhes dos níveis ficam a confirmar.',
    headline: 'Cresça no oceano, evitando peixes maiores',
    session: 'A estrutura por níveis é informada, mas a duração da sessão está a confirmar.',
    controls: 'O método de controle do tubarão está a confirmar.',
    tags: ['tubarão', 'oceano', 'desafios', 'progressão'],
  },
  '9618T': {
    description: 'Catch Cats propõe uma tarefa direta: capturar todos os gatos para aumentar seu melhor placar. A ficha pode interessar a quem prefere jogos objetivos com foco em pontuação.',
    whyPlay: 'A meta é fácil de entender e relaciona a captura à melhora do recorde pessoal.',
    audience: 'Indicado para quem gosta de objetivos simples e busca de pontuação; outros perfis ficam a confirmar.',
    editorialNote: 'Informações baseadas na fonte GamePix. Compatibilidade, controles e demais recursos podem variar.',
    headline: 'Capture gatos e busque seu melhor placar',
    session: 'A confirmar; a descrição não informa a duração das sessões.',
    controls: 'A confirmar.',
    tags: ['pontuação', 'captura', 'gatos'],
  },
  'AO2ID': {
    description: 'A day in the countryside coloca você no papel de um fazendeiro em uma experiência relaxante no campo. Cultive terrenos, interaja com animais e cuide de situações como alimentar bichos, lidar com toupeiras e proteger bonecos de neve.',
    whyPlay: 'É uma opção para quem procura uma atividade rural simples, com cultivo e tarefas envolvendo animais.',
    audience: 'Indicado, de forma conservadora, para quem gosta de jogos rurais relaxantes com cultivo e interação com animais.',
    editorialNote: 'Ficha baseada na descrição fornecida pela GamePix; recursos e disponibilidade podem variar.',
    headline: 'Um dia tranquilo no campo',
    session: 'Duração da sessão: a confirmar; a proposta é relaxante e baseada em tarefas rurais.',
    controls: 'Setas do teclado e controles por clique ou toque.',
    tags: ['fazenda', 'campo', 'cultivo', 'animais'],
  },
  'O8O7P': {
    description: 'BloxdHop apresenta percursos de parkour em obbys com diferentes temas. A proposta é correr, saltar e evitar quedas até o fim, buscando pontuação alta e ouro.',
    whyPlay: 'Pode interessar a quem gosta de desafios de corrida e saltos com foco em chegar ao final sem cair.',
    audience: 'Indicado para quem procura parkour, obbys, corrida e tentativa de superar a própria pontuação.',
    editorialNote: 'Informações baseadas na ficha da GamePix; recursos e disponibilidade podem variar.',
    headline: 'Parkour em mundos temáticos',
    session: 'A duração das sessões não foi informada; a confirmar.',
    controls: 'WASD, Shift e C; a descrição também informa controle por toque em dispositivos móveis.',
    tags: ['parkour', 'obby', 'corrida', 'pontuação'],
  },
  'SMMM1': {
    description: 'Em 456 impostor, um astronauta tenta sobreviver no espaço saltando sobre inimigos de traje vermelho. A proposta inclui avançar por níveis e também encarar uma corrida infinita.',
    whyPlay: 'Pode interessar a quem busca uma experiência de ação baseada em saltos e progressão por níveis.',
    audience: 'Indicado para quem gosta de ação, espaço, saltos e sobrevivência; detalhes de público ficam a confirmar.',
    editorialNote: 'Ficha baseada na descrição fornecida pela GamePix; recursos, disponibilidade e demais detalhes podem variar.',
    headline: 'Salte para sobreviver no espaço',
    session: 'Há níveis e uma corrida infinita descritos, mas a duração das partidas está a confirmar.',
    controls: 'WASD e toque em dispositivos móveis.',
    tags: ['ação', 'espaço', 'saltos', 'sobrevivência'],
  },
  '6B1OB': {
    description: 'BigBoom propõe uma progressão baseada em alcançar objetivos sucessivos e ampliar as minas. A descrição é enxuta, então vale abrir a ficha para confirmar como essa evolução funciona na prática.',
    whyPlay: 'Pode interessar a quem gosta de acompanhar uma sequência de objetivos e expandir gradualmente um elemento do jogo.',
    audience: 'A confirmar; a indicação é provisória porque a descrição disponível é curta.',
    editorialNote: 'Ficha baseada na descrição disponível na fonte GamePix; controles, regras e outros recursos permanecem a confirmar.',
    headline: 'BigBoom: avance por mais objetivos',
    session: 'A confirmar; a descrição não informa a duração ou o formato das sessões.',
    controls: 'A confirmar.',
    tags: ['objetivos', 'progressão', 'minas'],
  },
  '214N5': {
    description: 'Bomb is in the air acompanha um aviador excêntrico em uma jornada para descobrir o mundo. A proposta também envolve entender como estacionar um avião.',
    whyPlay: 'Pode interessar a quem gosta de jogos com uma premissa de aviação e uma tarefa central curiosa.',
    audience: 'Indicado para quem quer conhecer uma aventura de aviação e exploração; demais características ficam a confirmar.',
    editorialNote: 'Ficha baseada na descrição fornecida pela GamePix; recursos e detalhes disponíveis podem variar.',
    headline: 'Aviador em busca do mundo',
    session: 'Duração e ritmo da sessão: a confirmar.',
    controls: 'A confirmar.',
    tags: ['aviação', 'aventura', 'exploração'],
  },
  'Y8OK3': {
    description: 'Adventure Joystick Winter propõe coletar minérios antes da chegada do inverno. O objetivo envolve conseguir a chave, alcançar a porta e evitar espinhos e rodas giratórias.',
    whyPlay: 'A combinação de coleta, objetivo de chegada e obstáculos dá uma ideia clara do que esperar ao abrir a ficha.',
    audience: 'Indicado para quem gosta de coletar itens, buscar uma chave e desviar de obstáculos; dificuldade e duração não foram informadas.',
    editorialNote: 'Informações baseadas na descrição fornecida pela GamePix; recursos e disponibilidade podem variar.',
    headline: 'Minere, encontre a chave e alcance a porta',
    session: 'Duração da sessão: a confirmar.',
    controls: 'WASD e controle por toque em dispositivos móveis.',
    tags: ['aventura', 'coleta', 'obstáculos', 'toque móvel'],
  },
}
