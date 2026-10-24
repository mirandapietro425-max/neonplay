# NeonPlay — jogos reais locais + jogos multiplayer com backend

Esta correção importa arquivos de jogos reais dos repositórios enviados pelo usuário. Não cria minijogos de demonstração e não troca o player GamePix original.

## O que passa a ser instalado

### HTML5 estáticos (no repositório do NeonPlay)
1. 2048 — MIT
2. HTML5 Asteroids — MIT
3. Pac-Man Lite — GPL-3.0
4. Clumsy Bird — GPL-3.0
5. Missile Game — AGPL-3.0
6. HexGL — MIT
7. Particle Clicker — MIT
8. NS-Shaft — Apache-2.0
9. Tap Tap Tap — MIT
10. The House — MIT
11. Custom Tetris — BSD-3-Clause (o modo online original depende do Firebase; a parte local funciona sem criar um servidor do NeonPlay)
12. Arashi — GPL-2.0 (mantém o arquivo COPYING e ajusta a URL antiga de jQuery para HTTPS)

Cada jogo é colocado em `games/imported/<id>/` com os arquivos do próprio projeto e sua licença. O importador fixa commit, limita o tamanho comprimido e expandido, limita a quantidade de entradas e rejeita caminhos suspeitos, links simbólicos/hard links e arquivos especiais antes de extrair. O catálogo é escrito em `games-imported.json` depois da instalação. A revisão do importador é registrada para não baixar novamente a mesma versão em toda mudança visual do site.

### Jogos que precisam de servidor (não são descartados por usarem backend)

1. **Jogos para 2 pessoas** (`tridpt/TwoPlayerGames`, MIT): app completo com servidor Node.js/WebSocket e uma coleção de dezenas de jogos para dois jogadores, incluindo salas online. É instalado em `services/two-player-games/`.
2. **Open IO — Snake Multiplayer** (`gibboa/Open_IO`, MIT): jogo/estrutura multiplayer baseada em Node.js, Express e Socket.IO (atualizado para a API 4.x no patch). É instalado em `services/open-io/`; o importador completa as dependências ausentes no `package.json`, configura `PORT` e adiciona `/health`, usa Socket.IO 4.x e lê a porta de `PORT` para compatibilidade com Render.

Os dois aparecem no mesmo catálogo visual da homepage. O player abre o serviço real numa moldura integrada, sem mostrar uma página de repositório. O `render.yaml` contém somente os serviços multiplayer isolados; a homepage continua exclusivamente na Vercel.

## Fluxo de instalação

1. Faça backup do repositório.
2. Mescle estes arquivos à raiz do repositório NeonPlay. Preserve `game.html`, `bundle.min.js`, `style.css`, módulos `Zap*.js`, `np-*`, capas, imagens, conteúdo GamePix e rotas antigas.
3. Envie a atualização à branch `main`. O workflow `.github/workflows/import-open-games.yml` importa os 12 HTML5 e os dois serviços multiplayer e comita os arquivos baixados. Em GitHub, Actions precisa estar habilitado e ter permissão de escrita em `contents`.
4. Depois de o workflow terminar e os diretórios `services/` existirem no commit, no Render crie um Blueprint a partir do repositório NeonPlay. Ele lê `render.yaml` e cria `neonplay-two-player-games` e `neonplay-open-io`.
5. Confirme os domínios públicos gerados pelo Render. Por padrão, a página espera `https://neonplay-two-player-games.onrender.com/` e `https://neonplay-open-io.onrender.com/`. Se o Render atribuir nomes diferentes, altere `url` dos dois jogos em `scripts/import-server-games.cjs` e execute novamente `node scripts/import-server-games.cjs`.
6. Confirme que a integração Vercel do repositório publicou os arquivos estáticos importados. A homepage é estática; os dois backends precisam ser implantados no Render para partidas online funcionarem.

## Importação manual

Em Linux, com Node.js 22, `tar` e acesso de rede ao GitHub:

```bash
node scripts/import-open-games.cjs --force
node scripts/import-server-games.cjs
```

O importador estático apaga somente o antigo `games.json` de demonstrações do assistente e os diretórios de demonstração com IDs explicitamente listados no script. Ele não mexe em `game.html` nem nos 137 IDs GamePix. O segundo importador mantém os serviços separados dos arquivos estáticos. O workflow automatizado não usa `--force`: ele conserva as instalações cujo commit e revisão do importador já foram verificados, evitando commits e redeploys desnecessários.

## Backlog multiplayer mantido (não excluído por exigir servidor)

O arquivo `server-games-backlog.json` registra os candidatos restantes, incluindo engines e fontes de catálogo que ainda precisam de um projeto jogável específico e as pendências de cada um. Eles não são exibidos como jogáveis antes de serem importados, implantados e testados. Consulte `RELATORIO_PROXIMAS_MELHORIAS.md` para a lista priorizada do que falta.

Outros projetos da seção multiplayer foram mantidos como candidatos para lotes posteriores, mas não são descartados por dependerem de backend. Alguns são muito grandes (WorldGuessr, Swordbattle.io, Kaetram e Freeciv-web), outros têm arquitetura distribuída (Blobl.io) ou stacks legadas que pedem Redis e versões antigas de Node (BrowserQuest). Importá-los cegamente para o processo principal do NeonPlay poderia quebrar o site, expor componentes vulneráveis ou inflar o repositório. O primeiro lote instala dois servidores separados além dos doze jogos HTML5. Isso não exclui outras opções multiplayer; novos serviços podem ser adicionados isoladamente, respeitando seus requisitos reais.

## Testes e limites desta sessão

Antes da importação, execute `node scripts/check-import-manifests.cjs`; o workflow também faz essa validação automaticamente. Consulte `RELATORIO_PROXIMAS_MELHORIAS.md` para o estado e os critérios de conclusão.

Os scripts de integração passam na checagem de sintaxe; os testes de patch verificam os dois backends com fixtures isolados, e o smoke test HTTP confere sete rotas e bloqueio de POST. Os JSON dos manifestos validam. Esta sessão não consegue baixar archives do GitHub diretamente devido a uma restrição de rede e a integração do GitHub bloqueia escrita no repositório. Por isso, os archives reais serão baixados por GitHub Actions quando o patch for colocado no repositório com Actions habilitado. Os serviços ainda precisarão de deploy no Render; não afirmo que o domínio já esteja atualizado.

Raging Gardens também está no backlog: apesar de ser um jogo HTML5, o projeto usa PHP (`index.php` e `channel.php`). O README distingue o código MIT dos recursos de arte e áudio; por isso, a importação exige auditoria de assets, não a simples cópia do repositório inteiro.
