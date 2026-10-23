# NeonPlay — servidor Node.js + jogos locais

Este pacote adiciona um servidor Node.js, uma página unificada para jogar, 19 minijogos HTML5 próprios e uma integração para encaminhar os 138 links de jogos da homepage pelo novo player.

> **É um pacote de integração, não uma cópia completa do repositório original.** A homepage usa jogos locais e mantém referências ao catálogo antigo. Para que os jogos antigos continuem funcionando, aplique os arquivos sobre o repositório completo `mirandapietro425-max/neonplay` e preserve o `game.html`, `bundle.min.js`, `style.css`, os módulos `js/`, imagens e demais arquivos originais. O pacote inclui uma mensagem de fallback caso seja executado isoladamente sem o player original.

## O que fica no servidor

Os 19 jogos em `games/` são servidos pelo mesmo domínio do site e não precisam de uma API ou de um provedor de jogos externo para executar: Snake Neon, 2048 Neon, Blocos Orbitais, Memória Cósmica, Pong Pulse, Prisma Breaker, Três em Linha, Quatro em Linha, Eco de Luz, Palavra Secreta, Puzzle Deslizante e Ritmo de Teclas, Campo de Lógica, Sudoku Relâmpago, Órbita de Luz, Código Secreto, Caixas no Lugar, Caça-palavras e Reversi Neon.

O arquivo `play.html` entrega uma página de jogo com controles, reinício, tela cheia, histórico local e recomendações. Para os títulos antigos, ele encaminha para o player original do NeonPlay, que deve permanecer no repositório integrado.

Os 19 minijogos locais foram escritos para este pacote; não são cópias de código dos repositórios do PDF. Nem todos os projetos da lista foram re-hospedados. O PDF mistura código com licenças diferentes, clones de propriedades intelectuais e projetos multiplayer que exigem servidores adicionais. Leia `SOURCES_AND_LICENSES.md` antes de importar outros códigos ou assets.

## Teste local

Requer Node.js 18 ou mais recente. Na raiz do projeto:

```bash
npm start
```

Abra `http://localhost:3000`. A coleção local agora tem 19 jogos, incluindo lógica, palavras e estratégia. Endpoints de diagnóstico:

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/games`

Ao executar apenas este pacote, os 19 jogos locais funcionam. Para testar os títulos antigos também, mescle os arquivos na raiz do repositório completo para manter o `game.html` original e suas dependências.

## Como integrar ao repositório existente

1. Faça backup/commit do estado atual antes de copiar arquivos.
2. Copie `index.html`, `play.html`, `server.js`, `games.json`, `package.json`, `render.yaml`, `games/`, `README.md` e `SOURCES_AND_LICENSES.md` para a raiz do repositório completo.
3. **Não exclua nem substitua** o `game.html`, `bundle.min.js`, `style.css`, arquivos de `js/`, imagens, manifest, ícones, páginas de categoria ou outros arquivos originais necessários ao catálogo existente.
4. Execute `npm start` e valide `/`, `/play.html?game=snake`, `/play.html?legacy=moto-x3m-spooky`, `/api/health` e `/api/games`.
5. Faça o deploy em preview antes de publicar no domínio principal.

## Hospedagem

`server.js` é um servidor Node tradicional que escuta `0.0.0.0` e respeita a variável `PORT`. O `render.yaml` configura um Web Service com comando `npm start` e health check em `/api/health`.

Para publicar no Render, coloque os arquivos integrados no branch do repositório que você controla, conecte esse repositório ao Render e use o serviço definido em `render.yaml`. Depois do primeiro deploy, associe seu domínio próprio pelo painel do host e atualize canonicals/sitemaps de forma consistente com o domínio escolhido. **Este pacote não cria uma conta de hospedagem nem publica automaticamente o site.**

Se o projeto permanecer somente como site estático na Vercel, os arquivos HTML/CSS/JS podem continuar como assets estáticos; o processo Node persistente não será executado como servidor tradicional nesse modelo. Neste caso, mantenha seu fluxo atual de deploy estático ou migre deliberadamente para um Web Service.

## Testes executados

- `node --check server.js`: passou.
- Sintaxe dos scripts inline (player + 19 jogos): validada após geração.
- Smoke test HTTP em servidor local: homepage, player local, player legado, três páginas de jogos, catálogo JSON, health check e fallback de player responderam com os códigos esperados.
- Não foi possível concluir o teste visual automatizado neste ambiente porque o navegador de teste bloqueou a navegação local; faça também o teste visual no preview do host antes de publicar.
