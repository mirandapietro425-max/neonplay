# NeonPlay R25 — catálogo externo integrado à home R24

Esta integração foi adaptada à estrutura atual de `mirandapietro425-max/neonplay`. Ela acrescenta uma seção de jogos externos à home, sem substituir a biblioteca local R24. O catálogo instalado, os destaques, a pesquisa, os filtros por categoria e os favoritos continuam sendo servidos por `np-r24-local-catalog.js`.

## O que foi integrado

- `GET /api/games`: combina `games-imported.json`, nove jogos do repositório Browser Games, o registry público Sausi e, opcionalmente, o feed oficial GamePix.
- `GET /api/cover`: gera capas SVG personalizadas como fallback quando uma fonte externa não fornece thumbnail.
- `api-game.html`: página unificada de jogo externo.
- `np-r25-catalog.js` e `np-r25-api.css`: carregam e apresentam as fontes externas em uma seção separada. Jogos locais são excluídos desse painel para não duplicar entradas nem interferir nos favoritos e filtros da biblioteca R24.
- A home mantém os IDs e carregadores R24 (`#grid`, `#local-filters`, `#np-r24-featured`, `np-r24-local-catalog.js`) e adiciona a nova seção `#np-local-games` com sua grade `#np-local-grid`.

O instalador `apply-r25-api.cjs` do pacote original não é usado: ele foi escrito para outro estado do `index.html` e interrompe a execução corretamente ao detectar que a estrutura esperada não existe. Também não são substituídos os arquivos visuais R24 atuais.

## Verificação local

Na raiz do repositório:

```bash
node tests/test-r25-api.cjs
node tests/test-r25-install.cjs
node --check api/games.js
node --check api/cover.js
node --check np-r25-catalog.js
```

Os testes da API usam respostas mockadas para validar o manifesto local, as nove entradas Browser Games, o registry Sausi, a inclusão condicional de GamePix, a preservação do SID, as capas SVG e métodos HTTP. O teste de integração confirma que a home e os recursos locais R24 permanecem presentes e que a nova grade externa está separada. A validação final de apresentação deve ser feita em preview do Vercel.

## GamePix (opcional)

A fonte oficial GamePix só é consultada quando `GAMEPIX_SID` está definido. Configure nas variáveis de ambiente do projeto Vercel o SID real fornecido ao publisher NeonPlay; não use um valor inventado. Se o projeto ainda não tiver autorização de publisher, solicite-a antes de ativar essa fonte. Sem o SID, o catálogo local, os nove jogos Browser Games e o feed Sausi continuam disponíveis, conforme a resposta de cada origem.

Depois de adicionar ou alterar `GAMEPIX_SID`, faça um novo deploy. O valor não deve ser commitado no repositório.

## Fontes

- [GamePix Publisher API](https://games.gamepix.com/gameinfo/) — API de publisher, thumbnails e exigência de preservar o `sid`.
- [Sausi Games](https://github.com/sausi-7/games) e [registry](https://github.com/sausi-7/games/blob/main/games/registry.json) — registry dinâmico; jogos adicionais dependem da disponibilidade da origem.
- [Browser Games](https://github.com/emjay045/browser-games) — nove URLs de demonstração externas.

Jogos hospedados por terceiros continuam sujeitos à disponibilidade, às condições de licença/origem e às restrições de iframe desses sites. O fallback SVG é arte de marca com o título/categoria, não uma captura real do jogo.
