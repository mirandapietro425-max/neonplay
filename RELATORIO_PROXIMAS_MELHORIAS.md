# NeonPlay — o que falta melhorar no último pacote

Revisão do pacote `NEONPLAY_IMPORTAR_JOGOS_COM_BACKENDS` e da auditoria do produto de 23/10/2026. Este relatório separa o que o código está preparado para fazer daquilo que ainda precisa ser executado no GitHub/Vercel/Render.

## Corrigido nesta revisão do pacote

1. **Modo embutido de TwoPlayerGames:** o app define `script-src 'self'`; o primeiro patch usava JavaScript inline para esconder o cabeçalho. Isso seria bloqueado pela Content Security Policy. O importador agora cria `js/neonplay-embed.js` e o carrega como arquivo externo autorizado.
2. **Atualização segura:** os importadores passam a substituir pastas com backup/rollback. Se o download de uma versão nova falhar, a instalação anterior fica no catálogo em vez de sumir só porque uma atualização falhou.
3. **Status do iframe:** a tela não afirma mais que o jogo está funcional apenas porque o evento `load` do iframe disparou; agora indica que a página/arquivo abriu. Isso não substitui uma checagem real de saúde do servidor.
4. **Checagem anterior ao download:** o workflow valida o formato, as licenças declaradas, os commits fixados, IDs, tipos de servidor e ligações homepage/player antes de baixar arquivos.

## P0 — bloqueadores para dizer que está no ar

- Executar o workflow no repositório principal e conferir os logs. O pacote sozinho não tem os tarballs dos jogos; o workflow é que os baixa e os grava no repositório.
- Garantir que GitHub Actions está habilitado e pode escrever em `contents`; se o push do bot for bloqueado, os jogos não chegarão ao commit e a Vercel não os servirá.
- Criar e testar os serviços do `render.yaml` **depois** de o workflow importar as pastas `services/`. Confirmar os domínios atribuídos pelo Render e atualizar as URLs do manifesto se forem diferentes.
- Testar cada jogo no domínio público. Um HTTP 200 ou o evento `iframe.onload` não comprova que os controles, áudio, WebGL ou multiplayer funcionam.

## P1 — problemas de produto identificados pela auditoria

- **Player GamePix:** garantir que há apenas um shell por jogo; não carregar a página de catálogo completa dentro de outro player. Esta correção preserva a rota antiga, mas os 127 títulos devem ser smoke-testados no próprio domínio em desktop e celular.
- **Domínio e SEO:** unificar canonical, Open Graph, JSON-LD, `robots.txt`, sitemap e URLs de jogo no domínio canônico (`zapgame.com.br` ou a decisão final do proprietário). A correção dos jogos não unifica automaticamente todas as páginas herdadas.
- **Capa real para cada título novo:** o primeiro lote usa ícones e gradientes no cartão. Substituir por screenshots/capas dos projetos só depois de verificar licença, atribuição, tamanho e fallback.
- **Multiplayer:** configurar domínios e `ALLOWED_ORIGINS`, confirmar WebSocket/WSS, CSP/iframe e endpoint `/health` em produção. `TwoPlayerGames` tem integração de iframe; `Open IO` é um projeto protótipo e precisa de teste real de fluxo de entrada, movimento e sincronização antes de promovê-lo como jogo recomendado.
- **Licenças:** conservar os arquivos originais. Missile Game tem observação de licença diferente para parte da pasta `lib`; fazer uma revisão de distribuição, não só confiar no campo geral do repositório.

## P1 — próximos servidores do PDF, não descartados

A fila `server-games-backlog.json` mantém os candidatos restantes e suas pendências: WorldGuessr, Swordbattle.io, AirMash, Blobl.io, BrowserQuest, Kaetram Open, Freeciv-web, TOSIOS, Raging Gardens, Phasocketonline, Taro/Moddio, LAN Games, Chessmata, Lichess/Lila e Zombies Multiplayer. Eles não estão no primeiro deploy, mas não foram excluídos por exigirem backend. Cada um demanda auditoria de licença, stack, build, banco/cache, configurações de origem e dimensionamento. WorldGuessr/Kaetram/Freeciv-web têm repositórios muito grandes; AirMash e Blobl.io exigem componentes relacionados; BrowserQuest usa Redis e dependências antigas; o endereço atual de TOSIOS retornou 404 na verificação.

## P2 — medição e acabamento depois que os jogos estiverem online

- Fazer teste visual manual em 1440 px e 390 px; este ambiente não permite concluir browser test confiável do site público.
- Medir tempo até o primeiro input, erro de carregamento por jogo, busca sem resultados, favoritos e retorno, sem inventar popularidade ou avaliações.
- Auditar capa duplicada, controles por teclado/toque, foco acessível, fullscreen, reiniciar e fallback para jogos bloqueados pelo navegador.
- Revisar os placeholders de anúncio, métricas, chat e “jogando agora” da página original, como recomenda a auditoria; não mostrar atividade fictícia.

## Estado honesto atual

O pacote foi validado estaticamente e os importadores foram endurecidos. **Nenhum dos jogos novos deve ser descrito como publicado ou confirmado funcional até a execução do workflow, deploy dos serviços e testes no domínio público.** A integração GitHub usada nesta sessão não autorizou gravação direta no repositório, então não houve publicação feita por mim nesta etapa.


## Correções adicionais desta continuação

- Acrescentado Custom Tetris (BSD-3-Clause) ao lote de importação real. O modo online baseado no Firebase está identificado como dependência externa, sem prometer que o NeonPlay o hospeda.
- O importador estático valida todos os IDs/commits/licenças antes de remover a pasta exata dos demos antigos.
- O importador preserva os itens `mode: server` já existentes no `games-imported.json`, para uma falha de download estático não remover os cartões dos backends.
- O `render.yaml` agora só declara os dois serviços multiplayer; a homepage continua na Vercel e não é criada uma segunda instância redundante no Render.
- `/api/games` usa `games-imported.json`; deixa de depender do antigo catálogo de demonstração `games.json`.

O download real dos repositórios ainda depende de executar GitHub Actions num ambiente com acesso à internet. Nesta sessão, a rede do container bloqueou DNS, por isso os arquivos de terceiros não puderam ser materializados localmente.

- Acrescentei capas locais obtidas de repositórios específicos (2048, HexGL, Particle Clicker, NS-Shaft, Tap Tap Tap, The House e Custom Tetris); os outros cartões mantêm fallback visual quando o projeto não oferece capa apropriada.
- Adicionei verificação pós-importação para exigir arquivos de entrada/licenças dos jogos instalados e ambos os backends, além de smoke test HTTP do servidor.

- Acrescentado Arashi (GPL-2.0) ao lote local. O importador mantém `COPYING` e corrige a referência antiga `http://` a jQuery para `https://` antes de publicar.
- Adicionado Raging Gardens à fila de integração PHP, com alerta de licenciamento: o README declara MIT para código sem arte, mas imagens/áudio têm créditos separados e precisam ser auditados antes da cópia.


## Correções de continuidade executadas agora

- Corrigido o fixture de regressão do `TwoPlayerGames`, que não continha o endpoint `/health` usado pelo patch real; os testes agora verificam CORS de health nos dois backends, CSP/iframe e layout responsivo do Open IO.
- A homepage agora encerra a checagem de saúde dos serviços após 60 segundos e apresenta estado não confirmado caso o backend não responda; isso evita cartões presos em “verificando”.
- O player inicia com estado neutro “preparando jogo”, em vez de afirmar antecipadamente que está hospedado e pronto.
- Os importadores anotam a revisão de integração junto ao commit fixado. O workflow deixa de baixar os 12 jogos estáticos à força em toda mudança de CSS/HTML e mantém as instalações comprovadas; basta aumentar a revisão no script quando mudar a transformação de arquivos.
- A verificação pós-importação foi ajustada para uma importação parcial: uma falha de um serviço multiplayer registrado é reportada como aviso e não impede automaticamente a publicação dos jogos estáticos que foram baixados e testados. Um backend só aparece no catálogo se sua pasta e seus arquivos principais forem encontrados.
- O fluxo completo ainda exige que GitHub Actions execute o download real e que os backends sejam criados no Render. Nenhum serviço é considerado publicado por esta revisão local.


## Melhorias de segurança e descoberta acrescentadas nesta rodada

- **Importação segura de arquivos:** os dois importadores agora compartilham `scripts/download-github-archive.cjs`. O download é limitado enquanto os bytes chegam; antes de extrair, o arquivo é verificado por caminhos absolutos/traversal, quantidade de entradas, tipo de arquivo, links simbólicos/hard links e limite de bytes expandidos. O teste `scripts/test-download-github-archive.cjs` cobre traversal, links e limite de expansão.
- **GitHub Actions mais seguro:** `checkout` e `setup-node` estão fixados por SHA completo, e `contents: write` foi movido para o job que efetivamente precisa gravar o commit. Isso segue a recomendação do GitHub de pin de Actions por SHA e concessão mínima de permissões. [GitHub Docs](https://docs.github.com/en/actions/reference/security/secure-use).
- **Cartões mais transparentes:** jogos locais mostram “Hospedado no NeonPlay”; jogos com backend começam em “Verificando servidor”/“VERIFICAR” e só passam a “JOGAR” quando a verificação responde. Isso evita anunciar um backend frio ou não implantado como confirmado.
- **Backlog mais completo:** acrescentei Phasocketonline, Taro/Moddio, LAN Games, Chessmata (marcado como referência de catálogo, não repositório do jogo), Lichess/Lila e Zombies Multiplayer. Taro é uma engine, não um título pronto; a licença de Zombies Multiplayer precisa ser confirmada. Eles não foram convertidos em cards jogáveis.

## Limitação que permanece

Ainda é necessário que GitHub Actions execute a importação real com rede. O validador de archives foi exercitado com arquivos de teste locais; não foi possível baixar os tarballs reais neste ambiente, cuja resolução DNS está bloqueada. O estado publicado só pode ser confirmado depois do workflow e do deploy Render/Vercel.

- **Build idempotente:** removi timestamps voláteis dos catálogos e acrescentei `writeJsonIfChanged`; uma execução repetida com o mesmo resultado não muda o catálogo só por causa da hora, evitando commits/redeploys sem mudanças reais. O teste de idempotência está no workflow.
