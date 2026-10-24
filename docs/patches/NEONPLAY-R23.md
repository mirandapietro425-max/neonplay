# NeonPlay R23 — corrigir o clique e modernizar a experiência de jogo

## O problema concreto encontrado

O `np-r20-8-gamepix-health.js` anterior testava uma única imagem de capa do GamePix. Se aquela imagem retornasse erro, o script interceptava `Jogar Agora` em fase de captura, chamava `stopImmediatePropagation()` e mostrava “Jogo em breve”. Isso bloqueava a tentativa de iniciar qualquer jogo, mesmo que o problema fosse só daquela capa. Uma imagem falhar não comprova que o player esteja indisponível.

O R23 mantém essa sonda apenas como diagnóstico. Ela **não bloqueia o clique** nem substitui a lógica nativa do `game.html`. A referência ganha `?v=r23` para evitar que o browser reutilize a versão antiga em cache.

## O que este patch muda

- Moderniza cartões e estados vazios da homepage sem substituir o catálogo, a busca, os favoritos ou os scripts originais.
- Melhora a página `game.html`: painel de informações, área do jogo, barra de controles, tela cheia, recomendações e layout mobile.
- Oculta placeholders de anúncio que só exibem “PUBLICIDADE” sem unidade de anúncio real.
- Esconde rating/contador enquanto o conteúdo é só o emoji de placeholder; se o provedor preencher dado real, o campo volta a aparecer.
- Remove tags estáticas como “Top”, “Novo” e “Em alta” das fichas, pois não estavam verificadas por dados atuais.
- Não redireciona `game.html?id=...` para um player dentro de outro player. Os links GamePix permanecem diretos.
- Faz backup dos 3 arquivos que serão alterados (`.r23-backup`) e é idempotente — pode executar novamente sem duplicar links/scripts.

## Aplicação segura no repositório

1. Baixe o ZIP e extraia a pasta `NEONPLAY_R23_PATCH` na raiz do repositório `neonplay`.
2. No terminal, a partir da raiz do repositório, execute:

   ```bash
   node NEONPLAY_R23_PATCH/scripts/test-neonplay-r23.cjs
   node NEONPLAY_R23_PATCH/scripts/apply-neonplay-r23.cjs . --clean
   ```

3. Revise as alterações antes de publicar:

   ```bash
   git diff --check
   git diff -- index.html game.html np-r20-8-gamepix-health.js
   ```

4. Para validar a correção, abra no ambiente de teste a homepage e clique em três jogos GamePix de categorias diferentes. Critérios: o clique não pode ser bloqueado pela sonda da imagem; se o provedor falhar de verdade, o player original deve mostrar seu estado de erro, não uma mensagem global de “em breve”. Teste desktop e viewport de 390 px.
5. O `--clean` remove somente a pasta do kit depois de instalar os arquivos; deixa os backups `.r23-backup` intactos. Depois da revisão, envie os arquivos alterados e os novos assets `np-r23-*` e `np-r20-8-gamepix-health.js` pelo fluxo normal de deploy do projeto.

   ```bash
   git add index.html game.html np-r20-8-gamepix-health.js np-r23-portal.css np-r23-player.css np-r23-portal.js
   git diff --cached --check
   git commit -m "fix: unblock GamePix launch and refresh player UX"
   git push origin main
   ```

## Caminhos preservados

O patch não muda os IDs dos jogos nem a forma `game.html?id=...`. Não substitui `bundle.min.js`, `style.css`, `Zap*`, `neonplay-init.js`, `np-boot-guard.js` ou o catálogo original. Isso é intencional: primeiro eliminamos o bloqueio global e arrumamos a experiência, sem reescrever à força o runtime de produção.

## Testes e limites

O teste incluído verifica sintaxe JavaScript, balanceamento básico de CSS, ausência do bloqueio de clique, criação de backups e aplicação repetida sem duplicar links. Ainda é necessário um teste de navegador no ambiente implantado para certificar que o provedor GamePix aceita cada jogo e domínio. O patch não muda a autorização do provedor nem consegue fazer funcionar um jogo cujo serviço externo esteja indisponível.
