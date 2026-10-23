# NeonPlay — patch corretivo, preservando o catálogo GamePix

Este patch corrige a integração anterior: preserva a homepage de jogos existente (incluindo as rotas `game.html?id=...`), adiciona uma navegação para `jogos.html` e reúne os links presentes nos PDFs enviados.

## Conteúdo
- `index.html`: homepage original do NeonPlay com apenas um link extra, “Biblioteca de jogos”. Os 137 links existentes `game.html?id=...` continuam como estavam.
- `jogos.html`: catálogo com busca, filtros, tags e paginação.
- `sources-games.json`: 148 URLs únicas exclusivamente dos PDFs fornecidos; URLs repetidas foram consolidadas.
- `SOURCES_AND_LICENSES.md`: observações sobre verificação de licenças.

## Não incluído
Não há os minijogos criados pelo assistente, nem a pasta `games/`, nem o player `play.html` anterior, nem o `games.json` que enumerava esses minijogos. Não substitua o `game.html`, `bundle.min.js`, `style.css`, os módulos `np-*`, a configuração GamePix ou os assets originais do repositório.

## Aplicação
1. Faça backup do repositório.
2. Substitua `index.html` pelo incluído aqui (mantém os links antigos de jogos).
3. Adicione `jogos.html` e `sources-games.json` na raiz do site.
4. Preserve todo o runtime atual que abre os jogos GamePix em `game.html?id=...`.
5. Se os antigos `games.json` e a pasta `games/` forem exatamente os arquivos demonstrativos criados pelo assistente, remova-os manualmente após conferir que não guardam conteúdo seu.

**Limite:** isto não publica o site nem instala automaticamente os repositórios como jogos jogáveis. Os links estão reunidos; cada projeto da lista ainda precisa ser avaliado/importado individualmente. A tentativa de escrita automática no GitHub foi bloqueada.
