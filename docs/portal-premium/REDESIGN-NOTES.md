# NeonPlay — notas da proposta visual

## Referências consultadas

- Poki — https://poki.com/ e https://poki.com/en/categories: foco em arte do jogo, descoberta por categorias e prateleiras para conteúdo novo/popular.
- CrazyGames — https://www.crazygames.com/: barra de busca visível, destaques, novidades e descoberta por gênero.

A proposta aproveita esses princípios de organização, mas mantém identidade NeonPlay: base azul-noite, verde-lima como cor de ação, cyan como acento, cantos consistentes e um destaque editorial com um jogo que já estava no catálogo.

## Alterações visíveis nesta cópia de homepage

- Hero com uma chamada principal, jogo destacado e ação de explorar catálogo.
- Barra de busca e navegação visualmente mais claras.
- Chips de categoria com contraste e estado selecionado mais evidentes.
- Prateleira horizontal para descoberta rápida e grade principal com 6/5/4/3/2 colunas conforme o viewport.
- Cartões uniformes, capas sem shimmer contínuo, hover sutil, foco por teclado e respeito à preferência de movimento reduzido.
- Os cards deixam de exibir estrelas/contadores de jogadas que não foram verificados contra uma fonte atual; mostram categoria e “Jogue agora”.

## Mantido

- 127 IDs únicos do catálogo nesta cópia.
- Rotas originais `game.html?id=...` para os jogos GamePix.
- Busca, filtros por categoria e favoritos locais.
- Sem jogos demonstrativos criados para substituir os jogos existentes.

## Próxima rodada recomendada

1. Integrar o CSS/hero ao `index.html` completo do runtime principal por diff, preservando scripts `Zap*`, guards e ordem de inicialização.
2. Substituir capas repetidas pelas capas corretas quando o asset do provedor estiver confirmado e autorizado.
3. Auditar a página `game.html` separadamente para evitar um player dentro de outro player, com responsividade e estados de falha.
4. Confirmar domínio canônico, metadados e sitemap antes de publicar.
5. Fazer teste visual a 1440 px, tablet e 390 px e teste funcional de busca, favoritos e abertura de jogos.

## Limite desta entrega

Esta é uma proposta aplicada à cópia de homepage disponível nesta sessão. Não foi publicada nem escrita no GitHub. Não substitua o `index.html` completo de produção sem comparar as diferenças com o runtime real.
