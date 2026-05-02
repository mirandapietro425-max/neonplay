# NeonPlay v8 — Documentação Completa do Projeto

## Visão Geral

**Site:** Portal de jogos HTML5 gratuitos voltado para o Brasil
**URL atual:** https://neonplay-nu.vercel.app/
**Objetivo:** 100+ visitas orgânicas em 30 dias, crescer até 100K/mês em 12 meses
**Status:** v9 — Player robusto, SID pendente


---

## 🔴 DIAGNÓSTICO CRÍTICO — Por Que os Jogos Não Carregam

### Causa Raiz: GamePix exige Publisher SID

O GamePix **bloqueia iframes em domínios não cadastrados** com erro 403.
A URL `/play/slug/?sdk=1` sem SID = **sempre falha**.

### Solução — 3 passos

| Passo | Ação | Onde |
|---|---|---|
| 1 | Criar conta de publisher | https://partners.gamepix.com |
| 2 | Cadastrar seu domínio | Dashboard → My Sites |
| 3 | Copiar o SID | Dashboard → SDK → SID |

### Após obter o SID

Abra `games-data.js` linha 1 e altere:
```javascript
const GP_SID = '';  // ← trocar pelo seu SID
// Exemplo:
const GP_SID = 'abc123xyz789';
```

Fazer redeploy no Vercel. Os jogos vão carregar.

### Ferramenta de Teste

Após o deploy, acesse:
`https://neonplay-nu.vercel.app/test-iframes.html`

Cole o SID e clique "Iniciar Teste" — verifica todos os 129 jogos automaticamente.

### Alternativas se GamePix demorar aprovação

| Provider | Aprovação | Qualidade | Como |
|---|---|---|---|
| **GameMonetize** | ~24-48h | Alta | gamemonetize.com → Cadastro |
| **GameDistribution** | ~72h | Muito alta | gamedistribution.com |
| **itch.io** (jogos gratuitos) | Imediato | Variável | Jogos com embed liberado |

---

---

## Stack Técnica

| Item | Detalhe |
|---|---|
| Hospedagem | Vercel (plano gratuito) |
| Domínio atual | neonplay-nu.vercel.app |
| Domínio ideal | neonplay.com.br (R$40/ano no registro.br — ainda não comprado) |
| HTTPS | Ativo via Vercel automaticamente |
| CDN | Cloudflare (conta existente, domínio ruim — não usar por enquanto) |

---

## Arquivos do Projeto

| Arquivo | Função |
|---|---|
| index.html | Homepage principal (464 linhas) |
| game.html | Página individual de cada jogo |
| category.html | Listagem por categoria |
| jogos-friv.html | Landing page SEO para buscas "friv" |
| jogos-para-celular.html | Landing page SEO para mobile |
| melhores-jogos-online.html | Landing page SEO geral |
| 404.html | Página de erro |
| style.css | CSS completo tema neon/dark (1490 linhas) |
| engine.js | Motor principal do site (2048 linhas) |
| games-data.js | Banco de dados com 95 jogos |
| sitemap.xml | Sitemap índice |
| sitemap-games.xml | Sitemap de todos os jogos |
| sitemap-pages.xml | Sitemap das páginas institucionais |
| robots.txt | Configuração de rastreamento |

---

## Banco de Jogos

- **95 jogos** cadastrados
- **8 categorias:** Ação, Corrida, Puzzle, Arcade, Esporte, Aventura, Tiro, Estratégia
- **Fontes dos jogos:** GameMonetize e GamePix (iframes externos)
- Cada jogo tem: id, categoria, nome PT-BR, emoji, rating, plays, thumbnail, src do iframe, descrição curta, descrição longa, tags

---

## IDs e Credenciais Configuradas

| Serviço | ID / Dado |
|---|---|
| Google Analytics 4 | G-R1H1F6D67P |
| Google Search Console | Verificado via meta tag |
| Bing Webmaster Tools | Verificado via meta tag |
| AdSense | ca-pub-XXXXXXXXXXXXXXXX (ainda não configurado — aguarda aprovação) |

### Meta tags de verificação no index.html:
```html
<meta name="google-site-verification" content="arAz27AfgFWqSiNcL-avyWWvUXv6FvShI2kpHjHwkqg" />
<meta name="msvalidate.01" content="EBA3392D90640CF0B74BFE12BF03E956" />
```

---

## O Que Já Foi Feito (Dia 1)

- [x] Site publicado no Vercel com HTTPS
- [x] robots.txt configurado
- [x] sitemap.xml e sitemap-games.xml corrigidos com URL do Vercel
- [x] GA4 ID real inserido em index.html e engine.js
- [x] Google Search Console verificado
- [x] Sitemaps enviados no GSC
- [x] Bing Webmaster Tools verificado
- [x] Sitemaps enviados no Bing com sucesso

---

## O Que Falta Fazer — Por Fase

### Fase 1 — Dias 1-3 (quase completo)
- [ ] Indexação manual das 5 páginas principais no GSC (limite diário atingido — fazer amanhã)
- [ ] Confirmar GA4 recebendo dados em tempo real
- [ ] Verificar PageSpeed Insights — meta: >70 no mobile

URLs para indexar manualmente no GSC:
```
https://neonplay-nu.vercel.app/
https://neonplay-nu.vercel.app/category.html
https://neonplay-nu.vercel.app/jogos-friv.html
https://neonplay-nu.vercel.app/jogos-para-celular.html
https://neonplay-nu.vercel.app/melhores-jogos-online.html
```

### Fase 2 — Dias 4-7 (catálogo)
- [ ] Auditar os 95 jogos — remover iframes quebrados
- [ ] Adicionar 10+ jogos nas categorias fracas (meninas, casual, multiplayer)
- [ ] Garantir que cada jogo tem descLong de 80+ palavras e 5+ tags
- [ ] Criar página /jogos-de-meninas
- [ ] Testar 10 jogos no mobile

### Fase 3 — Dias 8-12 (SEO massivo)
- [ ] Verificar meta descriptions de todas as páginas (150-160 chars)
- [ ] Garantir H1 único por página
- [ ] Testar Schema Markup com Google Rich Results Test
- [ ] Escrever intro de 200 palavras em cada categoria
- [ ] Verificar canonical em todas as páginas
- [ ] Open Graph correto em todas as páginas

### Fase 4 — Dias 13-17 (indexação)
- [ ] Confirmar sitemaps com status "Sucesso" no GSC
- [ ] Solicitar indexação das 20 páginas de jogos mais populares
- [ ] Verificar relatório de cobertura no GSC
- [ ] Checar Core Web Vitals — LCP < 2.5s, CLS < 0.1

### Fase 5 — Dias 18-22 (CTR boost)
- [ ] Reescrever titles: "Jogos de [X] Online Grátis — Sem Baixar | NeonPlay"
- [ ] Reescrever titles de jogos: "Jogar [Nome] Online Grátis | NeonPlay"
- [ ] Meta descriptions com CTA e números ("100+ jogos", "Sem cadastro")
- [ ] Analisar no GSC quais queries têm impressões mas CTR < 2%

### Fase 6 — Dias 23-26 (retenção)
- [ ] Validar "jogos relacionados" em 100% das páginas de jogo
- [ ] Testar fluxo de favoritos
- [ ] Adicionar seção "mais populares da semana" na homepage
- [ ] Medir bounce rate por categoria no GA4

### Fase 7 — Dias 27-30 (sinais externos)
- [ ] Criar perfil no Pinterest com 20 pins linkando para categorias
- [ ] Postar 3 clips no TikTok com gameplay + link na bio
- [ ] Post no Reddit r/jogos e r/brdev
- [ ] Criar página no Facebook "NeonPlay — Jogos Online"
- [ ] Submeter no AlternativeTo

---

## Roadmap Pós-30 Dias

| Período | Meta | Ações |
|---|---|---|
| Mês 1-2 | 10K/mês | Indexar tudo, GA4 ativo, primeiros rankings long-tail |
| Mês 3-4 | 30K/mês | 150+ jogos, 5 posts de blog, TikTok gameplay |
| Mês 5-7 | 60K/mês | Páginas de tags, parcerias YouTube, backlinks |
| Mês 8-12 | 100K/mês | 300+ jogos, blog com IA, lista "melhores portais BR" |

---

## Como Fazer Redeploy no Vercel

1. Extrair a pasta NeonPlay_v8 do zip
2. Acessar vercel.com e fazer login
3. Entrar no projeto neonplay-nu
4. Arrastar a pasta extraída para o painel do Vercel
5. Aguardar o deploy concluir (1-2 minutos)

---

## Como Adicionar Novos Jogos

Abrir o arquivo `games-data.js` e adicionar um novo objeto no array `GAMES_DB`:

```javascript
{
  id: 'nome-do-jogo',          // URL amigável, sem espaços
  cat: 'acao',                  // categoria: acao, corrida, puzzle, arcade, esporte, aventura, tiro, estrategia
  badge: 'new',                 // opcional: 'new', 'hot', 'top'
  featured: true,               // opcional: aparece no destaque da homepage
  name: 'Nome em Inglês',
  namePT: 'Nome em Português',
  emoji: '🎮',
  rating: 4.5,                  // de 0 a 5
  plays: 100000,                // número de plays (pode ser estimado)
  year: 2024,
  developer: 'GameMonetize',
  thumb: 'URL_DA_THUMBNAIL',    // imagem 512x384
  src: 'URL_DO_IFRAME',         // URL do jogo para embed
  desc: 'Descrição curta.',
  descLong: 'Descrição longa com 80+ palavras.',
  tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
}
```

Fontes de jogos gratuitos para embed:
- gamemonetize.com — cadastro gratuito, 1000+ jogos
- gamepix.com — cadastro gratuito, 500+ jogos

---

## Métricas Para Monitorar Todo Dia

| Métrica | Onde ver | Meta 30 dias |
|---|---|---|
| Páginas indexadas | GSC → Indexação → Páginas | 100+ |
| Impressões orgânicas | GSC → Desempenho | Crescendo |
| CTR orgânico | GSC → Desempenho | > 2% |
| Visitas diárias | GA4 → Relatórios em tempo real | 5-20/dia |
| Bounce rate | GA4 → Engajamento | < 70% |
| Top páginas | GA4 → Páginas e telas | — |

---

## Domínio Ideal (Pendente)

Quando tiver R$ 40 disponíveis:
1. Acessar registro.br
2. Buscar neonplay.com.br
3. Registrar e pagar
4. No Vercel → Settings → Domains → adicionar neonplay.com.br
5. Vercel mostra os registros DNS
6. Configurar os registros DNS no registro.br
7. Aguardar propagação (até 24h)

---

## Contato dos Serviços

- Vercel: vercel.com
- Google Search Console: search.google.com/search-console
- Google Analytics: analytics.google.com
- Bing Webmaster: bing.com/webmasters
- Registro.br: registro.br
- GameMonetize: gamemonetize.com
- GamePix: gamepix.com


---

## 🛡️ Resilience Module — v10.2

Atualizado em: 2026-05-02

### Arquitetura Completa

```
launchGameResilient(game, chain=[])
  ├── Anti-loop: Set global _sessionAttempted + MAX_FALLBACK_DEPTH=4
  ├── Cache check: isBad? → skip imediato
  ├── buildGameUrl() → URL com SID runtime
  ├── _showLoader(depth) — feedback visual escalonado
  ├── iframe handlers ANTES do src (sem race condition)
  ├── Timeout escalonado: 8s (1ª tent.) / 6s (seguintes)
  ├── _settle(status):
  │     'good'  → loader some, marca cache, analytics
  │     'maybe' → loader some + aviso SID se necessário
  │     'bad'   → marca cache + _tryFallback()
  └── _tryFallback()
        ├── game.fallbacks[] → provider alternativo
        ├── SmartFallback.getNext() → jogo pontuado por scoreGame()
        └── _showResilientError() → sempre mostra 4 sugestões
```

### probeUrl — 3 estados

| Status | Condição | TTL no cache |
|--------|----------|-------------|
| `good`  | postMessage recebido OU onload < 4s | 7 dias |
| `maybe` | onload disparou mas sem confirmação | 1 dia |
| `bad`   | timeout 8s ou onerror | 6 horas |

### scoreGame(game) — critérios

| Critério | Pontos |
|----------|--------|
| Cache `good` | +50 |
| Cache `maybe` | +20 |
| Cache `bad` | =0 (eliminado) |
| Popularidade (plays) | 0-20 |
| Rating (0-5★) | 0-15 |
| Tem thumbnail | +5 |
| Badge `hot` | +7 |
| Badge `top` | +5 |
| Tem fallbacks[] | +3 |

### Warmup Automático

```js
// Inicia 90s após carregar a home/category (não roda em game.html)
GameWarmup.start(12, 90000)  // 12 jogos, 90s de delay

// Forçar warmup imediato (console):
GameWarmup.start(20, 0)
GameWarmup.stop()
```

### Comandos no Console

```js
// Diagnóstico
NP_Diagnostics.validateAll()
NP_Diagnostics.testGame('moto-x3m-spooky-land')  // inclui score e cache
NP_Diagnostics.probeAll(20)      // testa apenas jogos SEM cache
NP_Diagnostics.cacheStats()
NP_Diagnostics.clearCache()

// Cache direto
GameVerificationCache.stats()
GameVerificationCache.mark('game-id', 'good')  // forçar como bom
GameVerificationCache.clear()
GameVerificationCache.listGood()               // array de IDs bons

// Score e fallback
scoreGame(GAMES_DB[0])
SmartFallback.getNext(GAMES_DB[0], [])
SmartFallback.topScored(5, 'acao')

// Warmup manual
GameWarmup.start(10, 0)  // imediato
```

### Multi-provider — Como Configurar Fallbacks

```js
// Em games-data.js, adicione fallbacks ao jogo:
{ ...gp('moto-x3m-spooky-land'),
  fallbacks: [
    { provider: 'gamemonetize', gmId: 'ID_REAL_AQUI' },
    { provider: 'gamedistribution', gdId: 'ID_REAL_AQUI' }
  ]
}
```

---
