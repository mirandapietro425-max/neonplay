# Fontes, licenças e decisões de hospedagem — NeonPlay

## O que está incluído

O pacote contém 19 minijogos próprios em HTML/CSS/JavaScript: Snake Neon, 2048 Neon, Blocos Orbitais, Memória Cósmica, Pong Pulse, Prisma Breaker, Três em Linha, Quatro em Linha, Eco de Luz, Palavra Secreta, Puzzle Deslizante, Ritmo de Teclas, Campo de Lógica, Sudoku Relâmpago, Órbita de Luz, Código Secreto, Caixas no Lugar, Caça-palavras e Reversi Neon. Estas implementações foram criadas para o pacote e não copiam os arquivos de código ou artes dos repositórios citados no PDF.

## Pesquisa de repositórios do PDF

- `gabrielecirulli/2048`: projeto de código aberto com licença MIT, explicitada no README e no arquivo de licença. Foi consultado como referência de jogo/licenciamento, mas o minijogo 2048 incluído neste pacote foi escrito novamente; o código original não foi copiado. Fontes: https://github.com/gabrielecirulli/2048 e https://github.com/gabrielecirulli/2048/blob/master/LICENSE.txt
- `wangzifan396-wzf/mini-browser-games`: repositório descreve uma coleção de HTMLs independentes e publica uma licença MIT. É um candidato para curadoria adicional; seus arquivos não foram copiados para esta entrega. A existência de uma licença permissiva não substitui a análise de conteúdo, idioma, qualidade, dependências e adequação de cada jogo. Fontes: https://github.com/wangzifan396-wzf/mini-browser-games e https://github.com/wangzifan396-wzf/mini-browser-games/blob/main/LICENSE
- `attogram/games`: o repositório do instalador possui licença MIT, mas isso não torna automaticamente todas as obras de terceiros que o instalador reúne licenciadas sob MIT. Cada jogo e cada asset precisam ser avaliados separadamente. Fonte: https://github.com/attogram/games
- `emjay045/browser-games`: o README descreve minijogos HTML autocontidos; a página examinada não apresentou uma licença explícita. Por precaução, seu código não foi redistribuído. Fonte: https://github.com/emjay045/browser-games
- `KoRifCan/Classic-Games`: o README descreve um conjunto de jogos HTML5; a página examinada não apresentou uma licença explícita. Por precaução, seu código não foi redistribuído. Fonte: https://github.com/KoRifCan/Classic-Games

## Por que não foram copiados indiscriminadamente todos os links do PDF

O PDF não é um pacote único pronto para instalar. Ele combina catálogos de links, projetos completos, motores e bases multiplayer, clones de franquias conhecidas e repositórios com licenças diferentes ou não identificadas. Copiar todos os repositórios sem revisar licenças de código, fontes, áudio, imagens, marcas, dependências e regras de distribuição pode infringir direitos de terceiros.

O próprio PDF alerta que personagens/franquias como Disney, Marvel e Nintendo normalmente não podem ser re-hospedados sem autorização. Alguns projetos multiplayer também dependem de backend, salas ou serviços complementares; servir apenas o HTML não faz o multiplayer funcionar.

A integração mantém o catálogo legado do NeonPlay sem alegar que os 127 títulos existentes agora estão armazenados localmente. Os 19 jogos locais listados acima são os que de fato estão fisicamente incluídos na pasta `games/`. Para acrescentar outros jogos, selecione apenas projetos que permitam redistribuição, inclua a licença e os avisos de copyright exigidos, revise os arquivos de mídia e teste cada jogo dentro do mesmo domínio.

## Avisos de licença

- Para software sob MIT, mantenha o aviso de copyright e o texto integral da licença em todas as cópias ou partes substanciais do material redistribuído.
- A licença do código não necessariamente cobre marcas ou personagens de terceiros, nem arquivos de assets adicionados ao repositório.
- Os arquivos de integração e os 19 minijogos escritos para este pacote são fornecidos para uso e modificação no projeto NeonPlay. Não há promessa de autorização para re-hospedar obras externas não incluídas aqui.


## Decisão de integração para os tipos de fonte do PDF

| Tipo de fonte | Decisão nesta versão | Motivo |
|---|---|---|
| Jogos originais feitos para este pacote | Incluídos: 19 | HTML/CSS/JS local, sem baixar recursos de terceiros. |
| `gabrielecirulli/2048` | Referência; não copiado | A fonte publica licença MIT; o 2048 daqui é uma implementação independente. |
| `wangzifan396-wzf/mini-browser-games` | Candidato à próxima curadoria | O README do upstream informa coleção de HTML independentes e MIT. Ainda seria necessário selecionar cada jogo, confirmar assets e testar a integração; nenhum arquivo desse repo foi copiado. |
| `Hextris` | Não integrado nesta versão | O projeto declara GPL-3.0; distribuição exige preservar os avisos e cumprir as condições da licença. Não foi copiado. |
| `attogram/games` | Ferramenta de instalação, não um pacote universal de jogos sob uma só licença | O próprio README diferencia a licença do construtor das licenças individuais dos jogos. Verificar jogo por jogo. |
| Catálogos (`osgameclones`, `leereilly/games`, tópicos e coleções do GitHub) | Usados como índices de pesquisa, não como jogos | Um catálogo de links não contém necessariamente os artefatos, dependências ou licenças necessárias para execução no site. |
| Jogos multiplayer e MMO | Não integrados sem backend próprio | Servir HTML sozinho não ativa salas, autenticação, matchmaking ou estado compartilhado. Cada backend precisaria de auditoria e configuração própria. |
| Emuladores e bibliotecas DOS | Não incluídos nesta versão | A biblioteca do emulador não fornece automaticamente direitos sobre ROMs, BIOS, mídia ou jogos comerciais. A integração requer fontes autorizadas e licenças compatíveis. |
| Jogos baseados em franquias comerciais | Não redistribuídos | Nome, marca, personagens, áudio e imagens podem ter direitos próprios mesmo quando existe um clone de código aberto. |

### Fontes verificadas na pesquisa

- README e licença MIT do 2048: https://github.com/gabrielecirulli/2048/blob/master/README.md e https://github.com/gabrielecirulli/2048/blob/master/LICENSE.txt
- README do pacote Mini Browser Games, que descreve 124 HTMLs independentes no repositório (115 ativos e 9 históricos): https://github.com/wangzifan396-wzf/mini-browser-games
- Página do Hextris e sua declaração GPL-3.0: https://github.com/Hextris/hextris
- README do construtor Attogram, que alerta que cada jogo incluído tem sua própria licença: https://github.com/attogram/games
- Catálogo Open Source Game Clones: https://github.com/opengaming/osgameclones

Esta versão não afirma que todos os 135 links do PDF foram baixados ou testados. Eles foram tratados como fontes candidatas, e a entrega mantém apenas os 19 jogos originais no servidor local. Isso evita apresentar um link como se fosse um jogo instalado e evita redistribuir material sem verificação suficiente.
