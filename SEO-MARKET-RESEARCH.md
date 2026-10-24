# Zap Game — SEO e descoberta de jogos

**Data da análise:** 24 de outubro de 2026  
**Domínio canônico planejado:** `https://www.zapgame.com.br/`

## O que foi pesquisado

A busca “Poke Free” apontou para a Poki Brasil. A página inicial e a ficha de [Drive Mad na Poki](https://poki.com/br/g/drive-mad) foram consultadas como referências de arquitetura: catálogo com destaques e categorias, fichas próprias por jogo, descrição, criador quando informado e navegação para categorias e jogos relacionados. A direção visual e os textos do Zap Game são próprios; não foram copiados.

Para obter um sinal comparável de interesse no Brasil, foi consultada uma sugestão do Google para cada um dos **88 títulos individuais não GamePix**: 79 itens do Internet Archive e nove jogos hospedados em navegador. A consulta foi padronizada como `"{título} jogo"` com `hl=pt-BR` e `gl=BR`. Os resultados e a ordem estão em [`research/google-autocomplete-br-2026-10-24.csv`](research/google-autocomplete-br-2026-10-24.csv) e [`research/google-search-order-br-2026-10-24.json`](research/google-search-order-br-2026-10-24.json).

## Como a ordem foi definida

O score é **qualitativo**, baseado na presença e variedade de sugestões adicionais e em termos de intenção de jogar, como “online”, “jogar”, “grátis”, “jogo de” e nomes de portais. Não representa volume mensal, partidas, impressões, cliques nem previsão de posição no Google. **43 títulos não geraram sugestões adicionais**; nomes ambíguos — por exemplo, “Run” — podem misturar intenções diferentes.

A amostra deixou em destaque Super Smash Flash, Bubble Shooter, Age of War, 2048, Wordle, Campo Minado, Bloons TD, Tetris, Super Smash Flash 2, Run, Jacksmith e Breakout. Retro Bowl aparece acima deles por um **sinal editorial separado**: a Poki Brasil o listava entre seus jogos originais populares na data da consulta. O score de autocomplete de Retro Bowl foi baixo; ele não é apresentado como líder de busca do Google.

O Google Trends Brasil também foi consultado, mas a comparação direta por título retornou HTTP 429. Por isso, nenhum valor de Trends foi estimado ou fabricado. Não há Search Console conectado nesta sessão nem histórico próprio de partidas do Zap Game.

## O que foi preparado no site

- Uma ficha indexável em `/jogos/{slug}` para cada título individual fora do GamePix, com conteúdo e metadados próprios, URL canônica, prévias Open Graph/Twitter, imagem com texto alternativo, dados estruturados `VideoGame` e breadcrumbs.
- Dez hubs em `/jogos/categoria/{categoria}`, com introdução própria, links rastreáveis para jogos, `CollectionPage`/`ItemList` e breadcrumbs.
- Cards do catálogo que levam a cada ficha, caminhos para categorias e jogos relacionados. O GamePix mantém a própria origem e suas capas não foram incluídas no trabalho de arte.
- `robots.txt` público permitindo o rastreamento das páginas e bloqueando apenas `/api/`, além de `sitemap.xml` com home, categorias, fichas estáticas e as imagens de capa. O sitemap, fichas e hubs são revalidados em intervalos de dez minutos; jogos GamePix dependem do feed e das variáveis já configuradas no projeto.
- Títulos e descrições globais em pt-BR, favicon e imagem social do Zap Game. As sinopses disponíveis do Internet Archive foram traduzidas para pt-BR; notas pessoais, placeholders e textos curtos sem utilidade são substituídos por uma descrição editorial neutra, sem inventar fatos.

O Google pode reescrever títulos e snippets e decide por conta própria se e quando indexa cada URL. Sitemap e metadados facilitam descoberta e entendimento, mas não garantem inclusão nem ranking.

## Próximo passo que depende do proprietário

A integração disponível nesta sessão não oferece acesso ao Google Search Console. Depois de publicar e confirmar a propriedade do domínio, o proprietário pode cadastrar `https://www.zapgame.com.br/` e enviar **`https://www.zapgame.com.br/sitemap.xml`** no Search Console. A verificação da propriedade e a submissão não foram feitas por esta alteração; não foi solicitado acesso a uma conta Google.

## Fontes

- [Google Search Central — construir e enviar um sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search Central — introdução ao robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Google Search Central — links de título](https://developers.google.com/search/docs/appearance/title-link)
- [Google Search Central — snippets e descrições](https://developers.google.com/search/docs/appearance/snippet)
- [Poki Brasil](https://poki.com/br) e [ficha de Drive Mad](https://poki.com/br/g/drive-mad), consultadas em 24/10/2026.
- [Fontes e notas de mercado](research/market-sources-2026-10-24.md); referências técnicas também em [`SEO-REFERENCES.md`](SEO-REFERENCES.md).
