# Pesquisa de mercado e arquitetura — fontes consultadas em 24/10/2026

## Concorrente mencionado

O resultado para “Poke Free” aponta para a Poki Brasil, então a análise abaixo trata `poki.com/br` como o concorrente pretendido.

- [Poki Brasil](https://poki.com/br): a página inicial apresenta jogos em destaque e categorias. No conteúdo consultado, a Poki chama Drive Mad, Level Devil, Subway Surfers, Retro Bowl e Vortella’s Dress Up de cinco jogos originais populares. Entre os 88 jogos individuais do catálogo estático atual do Zap Game, Retro Bowl é o único que coincide com essa lista. O catálogo GamePix de produção depende da chave da API e não foi auditado localmente.
- [Drive Mad na Poki Brasil](https://poki.com/br/g/drive-mad): a URL usa uma rota própria por título. A ficha inclui título e descrição próprios, seção “Sobre”, criador informado, links para categorias e jogos relacionados. Esse padrão sustenta a criação de páginas individuais e links internos no Zap Game; o conteúdo e o visual serão originais.

## Sinais de busca no Brasil

Em 24/10/2026, foi coletada uma sugestão padronizada por título — `"{título} jogo"` — no endpoint de sugestões do Google configurado para `hl=pt-BR` e `gl=BR`. Todas as 88 consultas (79 jogos do Internet Archive e nove jogos de navegador hospedados pelo projeto) responderam; os resultados estão em [google-autocomplete-br-2026-10-24.csv](google-autocomplete-br-2026-10-24.csv) e a ordem derivada em [google-search-order-br-2026-10-24.json](google-search-order-br-2026-10-24.json).

O sinal comparável é qualitativo: número de sugestões complementares, acrescido de peso para sugestões com intenção explícita de jogar (por exemplo “online”, “jogar”, “grátis”, “click jogos”, “jogos 360”, “Poki” ou “jogo de”). Isso não é volume mensal, contagem de partidas nem previsão de ranking. 43 títulos não produziram sugestões adicionais; títulos com nomes ambíguos também podem receber sugestões que não representam perfeitamente a intenção.

A página de exploração do [Google Trends Brasil](https://trends.google.com.br/trends/) foi consultada, mas o comparativo direto por título retornou HTTP 429. Por isso, nenhum número de Google Trends foi fabricado ou incluído no ranking. A lista editorial prioriza separadamente Retro Bowl porque a própria página atual da Poki o destaca entre seus jogos originais populares; os demais títulos são ordenados pelos sinais do autocomplete.

## Limites e próximos dados úteis

Não há Search Console conectado nesta sessão e o repositório não contém histórico próprio de partidas por jogo. Assim, não é possível afirmar quais títulos do Zap Game são “os mais jogados agora” com base em dados próprios. As páginas individuais, categorias, sitemap e links internos melhoram a descoberta técnica, mas não garantem indexação ou posição no Google. Search Console pode, depois da verificação do domínio pelo proprietário, fornecer impressões e cliques reais por URL; a Analytics já presente no projeto pode acompanhar visitas após o deploy.
