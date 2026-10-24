# NeonPlay — Portal Refresh

Este pacote é uma proposta visual aplicada à cópia da homepage com os 127 cartões GamePix já existentes. A proposta mantém os caminhos `game.html?id=...`, IDs dos cartões, categorias, busca, favoritos em `localStorage`, metadados e scripts existentes, e acrescenta um tema em `neonplay-portal.css` e um destaque editorial usando um jogo que já aparece no catálogo.

## O que muda

- Hero editorial responsivo com CTA para um jogo já existente e acesso ao catálogo.
- Busca e navegação de topo mais claras; navegação continua visível em celular.
- Categorias como chips com contraste mais forte.
- Cartões uniformes, proporções consistentes, estados de foco e hover mais discretos.
- Remove o shimmer infinito das capas, que podia continuar animando após o carregamento.
- Remove etiquetas e números de avaliação/jogadas que não foram verificados na fonte e os troca por categoria + “Jogue agora”.
- Mantém as 127 entradas, IDs, links de execução antigos e funções de filtro/favoritos.
- Respeita `prefers-reduced-motion` e adiciona foco visível.

## Integração segura

1. Faça backup do `index.html` atual.
2. Coloque o `neonplay-portal.css` ao lado do `index.html`.
3. Compare o `index.html` incluído aqui com o seu de produção. Este arquivo é uma cópia de trabalho da homepage presente na sessão, não deve ser usado para sobrescrever o repositório inteiro sem diff.
4. Teste filtros, favoritos, pesquisa, primeiro clique em jogo e viewport de 390 px antes de publicar.
5. Preserve os scripts/runtime originais. Não substitua `game.html`, `bundle.min.js`, os módulos `Zap*`, guards de inicialização ou as rotas de produção com este pacote.

O endereço canônico, os dados de jogo/estatísticas e as imagens do provedor não foram alterados neste patch de CSS/UX. Teste e confirme o domínio oficial antes de publicar.
