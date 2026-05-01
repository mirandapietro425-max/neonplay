/**
 * NeonPlay v7 — engine.js  |  REVENUE MACHINE EDITION
 * ──────────────────────────────────────────────────────────────
 *  R1  · AdSense config centralizada — troque 1 linha, atualiza tudo
 *  R2  · Intersticial pré-jogo (5s countdown) → +RPM mobile
 *  R3  · SEO: BreadcrumbList + FAQPage Schema automático
 *  R4  · Session depth: nudge "jogue mais" após 2 jogos
 *  R5  · Analytics: scroll depth + time-on-page + exit-intent
 *  R6  · Mobile: sticky anchor ad (bottom banner)
 *  R7  · Push opt-in nativo após 3 páginas na sessão
 *  R8  · Perf: resource hints, CSS containment, lazy ad load
 * ──────────────────────────────────────────────────────────────
 */
'use strict';

// ═══════════════════════════════════════════════════
// 0. CONFIG CENTRAL — edite apenas aqui
// ═══════════════════════════════════════════════════

const NP_CONFIG = {
  adsense: {
    publisher:  'ca-pub-XXXXXXXXXXXXXXXX', // ← substitua pelo seu ID real
    slots: {
      leaderboard_top:     '1234567890',
      leaderboard_mid:     '2345678901',
      leaderboard_bottom:  '4567890123',
      rectangle_sidebar1:  '5678901234',
      rectangle_sidebar2:  '6789012345',
      rectangle_mobile:    '3456789012',
      anchor_mobile:       '7890123456', // sticky bottom
      pre_game:            '8901234567', // intersticial
    }
  },
  ga4: {
    id: 'G-R1H1F6D67P' // ← substitua pelo seu ID real
  },
  site: {
    url:  'https://neonplay.com.br',
    name: 'NeonPlay'
  }
};

// ═══════════════════════════════════════════════════
// 0. ANALYTICS — G1 (gargalo fatal corrigido)
// ═══════════════════════════════════════════════════

const NP_Analytics = {
  // Dispara evento para GA4 / gtag se disponível, e armazena local
  track(event, params = {}) {
    // Google Analytics 4
    if (typeof gtag === 'function') {
      gtag('event', event, { ...params, portal: 'neonplay' });
    }
    // Fallback: armazena localmente para análise manual
    try {
      const log = JSON.parse(localStorage.getItem('np_analytics_log') || '[]');
      log.push({ event, params, ts: Date.now() });
      if (log.length > 200) log.splice(0, log.length - 200); // keep last 200
      localStorage.setItem('np_analytics_log', JSON.stringify(log));
    } catch(e) {}
  },

  // Helpers semânticos
  gameClick(gameId, gameName, section) {
    this.track('game_click', { game_id: gameId, game_name: gameName, section });
  },
  gamePlay(gameId, gameName, cat) {
    this.track('game_play_start', { game_id: gameId, game_name: gameName, category: cat });
  },
  favToggle(gameId, action) {
    this.track('favorite_toggle', { game_id: gameId, action });
  },
  searchQuery(q, resultCount) {
    this.track('search', { search_term: q, result_count: resultCount });
  },
  sectionView(sectionName) {
    this.track('section_view', { section_name: sectionName });
  },
  pageView(pageType) {
    this.track('page_view_custom', { page_type: pageType });
  },
  adImpression(slot) {
    this.track('ad_impression', { ad_slot: slot });
  }
};

// R5 — Scroll Depth tracking
const NP_ScrollTracker = {
  marks: [25, 50, 75, 90],
  fired: new Set(),
  init() {
    window.addEventListener('scroll', () => {
      const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      this.marks.forEach(m => {
        if (pct >= m && !this.fired.has(m)) {
          this.fired.add(m);
          NP_Analytics.track('scroll_depth', { depth: m, page: location.pathname });
        }
      });
    }, { passive: true });
  }
};

// R5 — Time on Page tracking
const NP_TimeTracker = {
  start: Date.now(),
  marks: [30, 60, 120, 300], // segundos
  fired: new Set(),
  init() {
    setInterval(() => {
      const elapsed = Math.round((Date.now() - this.start) / 1000);
      this.marks.forEach(m => {
        if (elapsed >= m && !this.fired.has(m)) {
          this.fired.add(m);
          NP_Analytics.track('time_on_page', { seconds: m, page: location.pathname });
        }
      });
    }, 5000);
  }
};

// R5 — Exit Intent (desktop)
const NP_ExitIntent = {
  fired: false,
  init() {
    document.addEventListener('mouseleave', e => {
      if (e.clientY <= 5 && !this.fired) {
        this.fired = true;
        NP_Analytics.track('exit_intent', { page: location.pathname });
      }
    });
  }
};

// R4 — Session pages counter (para push opt-in e nudge)
const SESSION_PAGES_KEY = 'np_sess_pages_v7';
const SessionPages = {
  count() {
    try {
      const n = (parseInt(sessionStorage.getItem(SESSION_PAGES_KEY)) || 0) + 1;
      sessionStorage.setItem(SESSION_PAGES_KEY, n);
      return n;
    } catch { return 1; }
  },
  get() {
    try { return parseInt(sessionStorage.getItem(SESSION_PAGES_KEY)) || 0; } catch { return 0; }
  }
};


// ═══════════════════════════════════════════════════
// 1. UTILITÁRIOS
// ═══════════════════════════════════════════════════

function formatPlays(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}
function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function debounce(fn, ms) {
  let t;
  return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}
function shuffle(arr) { return [...arr].sort(() => Math.random() - .5); }
function today() { return new Date().toDateString(); }
function weekKey() {
  const d = new Date();
  const week = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 604800000);
  return `${d.getFullYear()}-W${week}`;
}

// ═══════════════════════════════════════════════════
// 2. FAVORITOS
// ═══════════════════════════════════════════════════

const FAV_KEY = 'neonplay_favs_v4';
const Favs = {
  get() { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; } },
  save(a) { localStorage.setItem(FAV_KEY, JSON.stringify(a)); },
  has(id) { return this.get().includes(id); },
  toggle(id) {
    const a = this.get();
    const i = a.indexOf(id);
    const action = i === -1 ? 'add' : 'remove';
    if (i === -1) {
      a.push(id);
      showToast('❤️ Favorito salvo!');
      if (a.length === 1) setTimeout(() => showDopamine('🎯 Primeiro favorito salvo!'), 1200);
    } else {
      a.splice(i, 1);
      showToast('💔 Removido dos favoritos.');
    }
    this.save(a);
    updateFavCount();
    renderFavPanel();
    NP_Analytics.favToggle(id, action);
  }
};

function updateFavCount() {
  const n = Favs.get().length;
  document.querySelectorAll('#favCount').forEach(el => el.textContent = n);
}

function renderFavPanel() {
  const body = document.getElementById('favBody');
  if (!body) return;
  const favs = Favs.get();
  const games = GAMES_DB.filter(g => favs.includes(g.id));
  if (!games.length) {
    body.innerHTML = '<div class="fav-empty"><span>💔</span><p>Nenhum favorito ainda.<br>Clique em ♡ para salvar jogos!</p></div>';
    return;
  }
  body.innerHTML = games.map(g => {
    const cd = getCategoryData(g.cat);
    return `<a href="game.html?id=${g.id}" class="fav-item">
      <div class="fav-thumb" style="background:linear-gradient(${cd.gradient})">${g.thumb ? `<img src="${g.thumb}" alt="${g.namePT}" loading="lazy" onerror="this.parentElement.innerHTML='${cd.emoji}'">` : `${cd.emoji}`}</div>
      <div class="fav-info">
        <div class="fav-name">${g.namePT}</div>
        <div class="fav-cat">${cd.emoji} ${cd.name}</div>
      </div>
      <button class="fav-rm" onclick="event.preventDefault();Favs.toggle('${g.id}')" aria-label="Remover">✕</button>
    </a>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
// 3. RETENÇÃO REAL — G3 (gargalo corrigido)
// ═══════════════════════════════════════════════════

const RECENT_KEY  = 'neonplay_recent_v4';
const PLAYTIME_KEY = 'neonplay_playtime_v6';  // tempo por jogo
const TOPUSER_KEY  = 'neonplay_topuser_v6';   // mais jogados pelo usuário

const Recent = {
  get() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } },
  add(id) {
    let arr = this.get().filter(x => x !== id);
    arr.unshift(id);
    arr = arr.slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
  }
};

// Rastreia quantas vezes cada jogo foi aberto pelo usuário
const UserPlays = {
  get() { try { return JSON.parse(localStorage.getItem(TOPUSER_KEY)) || {}; } catch { return {}; } },
  increment(id) {
    const data = this.get();
    data[id] = (data[id] || 0) + 1;
    localStorage.setItem(TOPUSER_KEY, JSON.stringify(data));
  },
  getTop(n = 6) {
    const data = this.get();
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([id]) => GAMES_DB.find(g => g.id === id))
      .filter(Boolean);
  }
};

function renderRecentBar() {
  const bar   = document.getElementById('recentBar');
  const chips = document.getElementById('recentChips');
  if (!bar || !chips) return;
  const ids   = Recent.get();
  const games = ids.map(id => GAMES_DB.find(g => g.id === id)).filter(Boolean);
  if (!games.length) { bar.style.display = 'none'; return; }
  bar.style.display = '';
  chips.innerHTML = games.slice(0, 10).map(g => {
    const cd = getCategoryData(g.cat);
    return `<a href="game.html?id=${g.id}" class="recent-chip" title="${g.namePT}">
      <span>${cd.emoji}</span>${g.namePT}
    </a>`;
  }).join('');
}

// Seção "Continue Jogando" — mostra os 6 mais recentes com card visual
function renderContinuePlaying() {
  const el = document.getElementById('continueGrid');
  if (!el) return;
  const ids = Recent.get().slice(0, 6);
  const games = ids.map(id => GAMES_DB.find(g => g.id === id)).filter(Boolean);
  const section = document.getElementById('continueSection');
  if (!games.length) { if (section) section.style.display = 'none'; return; }
  if (section) section.style.display = '';
  el.innerHTML = games.map(g => createCard(g, { badge: 'continue' })).join('');
}

// Seção "Seus Mais Jogados" — jogos que o usuário abre repetidamente
function renderUserTopGames() {
  const el = document.getElementById('userTopGrid');
  const section = document.getElementById('userTopSection');
  if (!el) return;
  const top = UserPlays.getTop(6);
  if (top.length < 2) { if (section) section.style.display = 'none'; return; }
  if (section) section.style.display = '';
  el.innerHTML = top.map(g => createCard(g)).join('');
}

// ═══════════════════════════════════════════════════
// 4. SISTEMA DOPAMINA & STREAK
// ═══════════════════════════════════════════════════

const STREAK_KEY  = 'neonplay_streak_v5';
const SESSION_KEY = 'neonplay_session_v5';

const DopamineSystem = {
  getStreak() {
    try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || { days: 0, lastDate: '', explored: 0 }; }
    catch { return { days: 0, lastDate: '', explored: 0 }; }
  },
  saveStreak(s) { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); },
  getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || { gamesOpened: 0 }; }
    catch { return { gamesOpened: 0 }; }
  },
  saveSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); },

  onVisit() {
    const td = today();
    const s = this.getStreak();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (s.lastDate === td) return;
    s.days = (s.lastDate === yesterday) ? s.days + 1 : 1;
    s.lastDate = td;
    this.saveStreak(s);
    if (s.days >= 2) setTimeout(() => showDopamine(`🔥 ${s.days} dias seguidos no NeonPlay!`), 2000);
    if (s.days >= 7) setTimeout(() => showDopamine('🏆 7 dias consecutivos! Você é lendário!'), 4000);
  },

  onGameOpened() {
    const sess = this.getSession();
    sess.gamesOpened = (sess.gamesOpened || 0) + 1;
    this.saveSession(sess);
    const n = sess.gamesOpened;
    if (n === 3)  setTimeout(() => showDopamine('⭐ 3 jogos explorados hoje!'), 1000);
    if (n === 5)  setTimeout(() => showDopamine('🎮 5 jogos! Você está no ritmo!'), 1000);
    if (n === 10) setTimeout(() => showDopamine('🏆 10 jogos hoje! Campeão do NeonPlay!'), 1000);
  }
};

function showDopamine(msg) {
  const el = document.getElementById('dopamineToast') || createDopamineEl();
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

function createDopamineEl() {
  const el = document.createElement('div');
  el.id = 'dopamineToast';
  el.className = 'dopamine-toast';
  document.body.appendChild(el);
  return el;
}

// ═══════════════════════════════════════════════════
// 5. HOME DINÂMICA — G2 (gargalo corrigido)
// Seções rotativas: a home nunca parece igual
// ═══════════════════════════════════════════════════

const HOME_ROTATION_KEY = 'np_home_rotation_v6';

function getHomeRotation() {
  try {
    const saved = JSON.parse(localStorage.getItem(HOME_ROTATION_KEY));
    if (saved && saved.date === today()) return saved.variant;
  } catch(e) {}
  // Nova rotação diária: variante 0, 1 ou 2
  const variant = randInt(0, 2);
  localStorage.setItem(HOME_ROTATION_KEY, JSON.stringify({ date: today(), variant }));
  return variant;
}

// Seções rotativas — cada variante tem um hero-section diferente
const HOME_VARIANTS = {
  // Variante 0: Destaque + Em Alta Hoje + Top Semana
  0: {
    heroLabel: '🔥 Em Alta Hoje',
    heroSub:   'Os jogos que todo mundo está abrindo agora',
    getGames:  () => [...GAMES_DB].sort((a, b) => b.plays - a.plays).slice(0, 8)
  },
  // Variante 1: Escolha do Editor + Lançamentos
  1: {
    heroLabel: '🏆 Top da Semana',
    heroSub:   'Os mais jogados nos últimos 7 dias',
    getGames:  () => shuffle(GAMES_DB.filter(g => g.badge === 'top' || g.badge === 'hot')).slice(0, 8)
  },
  // Variante 2: Surpreenda-me + Aleatório
  2: {
    heroLabel: '🎲 Descubra Novos Jogos',
    heroSub:   'Seleção especial de hoje — mude amanhã',
    getGames:  () => shuffle(GAMES_DB).slice(0, 8)
  }
};

function applyHomeVariant(variant) {
  const v = HOME_VARIANTS[variant] || HOME_VARIANTS[0];
  // Atualiza título da seção "Bombando"
  const lbl = document.getElementById('bombandoLabel');
  const sub  = document.getElementById('bombandoSub');
  if (lbl) lbl.textContent = v.heroLabel;
  if (sub) sub.textContent = v.heroSub;
  // Renderiza os jogos da variante
  const el = document.getElementById('bombandoGrid');
  if (el) el.innerHTML = v.getGames().map(g => createCard(g)).join('');
}

// ═══════════════════════════════════════════════════
// 6. CARD DE JOGO — CTR MÁXIMO
// ═══════════════════════════════════════════════════

const MAX_PLAYS = Math.max(...GAMES_DB.map(g => g.plays));

const HOT_CAPTIONS = ['Em alta agora', 'Bombando hoje', 'Todo mundo abrindo', 'Tendência da semana', 'Impossível parar'];
const NEW_CAPTIONS = ['Acabou de chegar', 'Lançamento', 'Novidade imperdível'];
const TOP_CAPTIONS = ['Top da semana', 'Mais jogado', 'Nota máxima'];

function badgeHTML(badge, plays) {
  if (!badge && plays <= 1000000) return '';
  const isHot = badge === 'hot' || plays > 1000000;
  if (badge === 'continue') return `<span class="card-badge cb-new">▶ Continue</span>`;
  if (isHot || badge === 'hot') return `<span class="card-badge cb-hot pulse-badge">🔥 Popular</span>`;
  if (badge === 'new')  return `<span class="card-badge cb-new">✨ Novo</span>`;
  if (badge === 'top')  return `<span class="card-badge cb-top">⭐ Top</span>`;
  return `<span class="card-badge cb-hot pulse-badge">🔥 Popular</span>`;
}

function socialProofHTML(game) {
  if (game.plays > 1000000) return `<div class="card-social">🔥 ${HOT_CAPTIONS[game.namePT.length % HOT_CAPTIONS.length]}</div>`;
  if (game.badge === 'new') return `<div class="card-social">✨ ${NEW_CAPTIONS[game.namePT.length % NEW_CAPTIONS.length]}</div>`;
  if (game.badge === 'top') return `<div class="card-social">⭐ ${TOP_CAPTIONS[game.namePT.length % TOP_CAPTIONS.length]}</div>`;
  return '';
}

function createCard(game, opts = {}) {
  const cd = getCategoryData(game.cat);
  const isFav = Favs.has(game.id);
  const pop = Math.min(100, Math.round((game.plays / MAX_PLAYS) * 100));
  const bg = `linear-gradient(${cd.gradient})`;
  const thumb = game.thumb
    ? `<img src="${game.thumb}" alt="${game.namePT}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'ce\\'style=\\'background:${bg}\\'>${cd.emoji}</div>'">`
    : `<div class="ce" style="background:${bg}">${cd.emoji}</div>`;
  const social = opts.noSocial ? '' : socialProofHTML(game);

  return `<article class="game-card${game.featured ? ' gc-featured' : ''}"
    onclick="NP_Analytics.gameClick('${game.id}','${game.namePT.replace(/'/g,"\\'")}','${opts.section||'grid'}');location.href='game.html?id=${game.id}'"
    role="article" aria-label="${game.namePT}">
    <div class="card-thumb">
      ${thumb}
      ${badgeHTML(opts.badge || game.badge, game.plays)}
      <button class="card-fav${isFav ? ' cf-active' : ''}"
        onclick="event.stopPropagation();Favs.toggle('${game.id}');this.classList.toggle('cf-active');this.textContent=this.classList.contains('cf-active')?'❤️':'🤍'"
        aria-label="${isFav ? 'Remover' : 'Adicionar'} favorito">${isFav ? '❤️' : '🤍'}</button>
      <div class="card-overlay"><div class="card-play">▶ Jogar</div></div>
    </div>
    <div class="card-body">
      ${social}
      <div class="card-name" title="${game.namePT}">${game.namePT}</div>
      <div class="card-meta">
        <span class="card-cat">${cd.emoji} ${cd.name}</span>
        <span class="card-rating">⭐ ${game.rating}</span>
      </div>
      <div class="card-plays">👾 ${formatPlays(game.plays)}</div>
      <div class="card-bar"><div class="card-bar-fill" style="width:${pop}%"></div></div>
    </div>
  </article>`;
}

function createMiniCard(game) {
  const cd = getCategoryData(game.cat);
  const bg = `linear-gradient(${cd.gradient})`;
  return `<a href="game.html?id=${game.id}" class="fav-item" style="text-decoration:none;color:inherit">
    <div class="fav-thumb" style="background:${bg};font-size:1.5rem;display:flex;align-items:center;justify-content:center">${cd.emoji}</div>
    <div class="fav-info">
      <div class="fav-name">${game.namePT}</div>
      <div class="fav-cat">⭐ ${game.rating} · ${formatPlays(game.plays)}</div>
    </div>
  </a>`;
}

function createNextGameCard(game) {
  const cd = getCategoryData(game.cat);
  const bg = game.thumb ? `url('${game.thumb}') center/cover` : `linear-gradient(${cd.gradient})`;
  return `<a href="game.html?id=${game.id}" class="next-game-card">
    <div class="ngc-bg" style="background:${bg}"></div>
    <div class="ngc-content">
      <div class="ngc-label">🎮 Jogue este a seguir</div>
      <div class="ngc-name">${game.namePT}</div>
      <div class="ngc-meta">⭐ ${game.rating} · ${getCategoryData(game.cat).name}</div>
      <div class="ngc-btn">▶ Jogar Agora</div>
    </div>
  </a>`;
}

// ═══════════════════════════════════════════════════
// 7. SEO AVANÇADO — G4 (gargalo corrigido)
// ═══════════════════════════════════════════════════

function injectGameSchema(game) {
  const cd = getCategoryData(game.cat);
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": game.namePT,
    "description": game.descLong || game.desc,
    "url": `https://neonplay.com.br/game.html?id=${game.id}`,
    "genre": cd.name,
    "gamePlatform": "HTML5",
    "operatingSystem": "Browser",
    "applicationCategory": "Game",
    "inLanguage": "pt-BR",
    "datePublished": `${game.year}-01-01`,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": game.rating,
      "bestRating": 5,
      "ratingCount": Math.floor(game.plays / 100)
    },
    "publisher": {
      "@type": "Organization",
      "name": "NeonPlay",
      "url": "https://neonplay.com.br"
    }
  };
  if (game.thumb) schema.image = game.thumb;
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(schema);
  document.head.appendChild(el);
}

function injectCategorySchema(cat) {
  const cd = getCategoryData(cat);
  const count = getGameCount(cat);
  const url = cat === 'all'
    ? 'https://neonplay.com.br/category.html'
    : `https://neonplay.com.br/category.html?cat=${cat}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${cd.nameSEO || cd.name} Grátis Online — NeonPlay`,
    "description": cd.desc || `${count} jogos de ${cd.name} grátis no NeonPlay.`,
    "url": url,
    "numberOfItems": count,
    "publisher": { "@type": "Organization", "name": "NeonPlay" }
  };
  const existing = document.getElementById('catSchema');
  if (existing) existing.textContent = JSON.stringify(schema);
}

// Canonical dinâmico para game page
function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = url;
}

// Sitemap gerado como JSON (use para gerar XML via server-side ou script)
function generateSitemapData() {
  const base = 'https://neonplay.com.br';
  const pages = [
    { url: `${base}/`, priority: 1.0, changefreq: 'daily' },
    { url: `${base}/category.html`, priority: 0.9, changefreq: 'daily' },
    ...CATEGORIES_DATA.map(c => ({
      url: `${base}/category.html?cat=${c.id}`, priority: 0.8, changefreq: 'weekly'
    })),
    ...GAMES_DB.map(g => ({
      url: `${base}/game.html?id=${g.id}`, priority: 0.7, changefreq: 'monthly'
    }))
  ];
  return pages;
}

// Expõe para debug/geração externa
window.NP_generateSitemap = generateSitemapData;


// ═══════════════════════════════════════════════════
// S1 — URL SLUGS LIMPOS
// Mapeia game.html?id=X → /jogo/nome-do-jogo (via htaccess)
// e category.html?cat=X → /jogos-de-categoria (virtual)
// ═══════════════════════════════════════════════════

const CAT_SLUGS = {
  acao:       'jogos-de-acao',
  corrida:    'jogos-de-corrida',
  puzzle:     'jogos-de-puzzle',
  arcade:     'jogos-arcade',
  esporte:    'jogos-de-esporte',
  aventura:   'jogos-de-aventura',
  tiro:       'jogos-de-tiro',
  estrategia: 'jogos-de-estrategia',
  all:        'jogos-online-gratis',
};

const CAT_LONG_TAIL = {
  acao:       ['jogos de ação grátis', 'jogos de luta online', 'jogos de batalha online grátis'],
  corrida:    ['jogos de corrida grátis', 'jogos de carro online', 'jogos de drift online'],
  puzzle:     ['jogos de puzzle grátis', 'jogos de raciocínio online', 'jogos de lógica grátis'],
  arcade:     ['jogos arcade grátis', 'jogos friv', 'jogos retrô online grátis'],
  esporte:    ['jogos de esporte online', 'jogos de futebol grátis', 'jogos de basquete online'],
  aventura:   ['jogos de aventura grátis', 'jogos rpg online', 'jogos de exploração online'],
  tiro:       ['jogos de tiro grátis', 'jogos fps online', 'jogos de tiro sem download'],
  estrategia: ['jogos de estratégia grátis', 'jogos de construção online', 'jogos tower defense'],
};

function getCatSlug(catId) {
  return CAT_SLUGS[catId] || `jogos-de-${catId}`;
}

function getCatCanonical(catId) {
  if (!catId || catId === 'all') return `${NP_CONFIG.site.url}/category.html`;
  return `${NP_CONFIG.site.url}/category.html?cat=${catId}`;
}

function getGameCanonical(gameId) {
  return `${NP_CONFIG.site.url}/game.html?id=${gameId}`;
}

// ═══════════════════════════════════════════════════
// S2 — TÍTULOS E META DESCRIPTIONS OTIMIZADOS PARA CTR
// Fórmulas testadas que dominam SERP de jogos
// ═══════════════════════════════════════════════════

const TITLE_TEMPLATES_GAME = [
  g => `${g.namePT} — Jogo Grátis Online | NeonPlay`,
  g => `Jogar ${g.namePT} Online Grátis | NeonPlay`,
  g => `${g.namePT} — Sem Download, Sem Cadastro | NeonPlay`,
];

const DESC_TEMPLATES_GAME = [
  g => `Jogue ${g.namePT} grátis no celular ou PC. ${g.desc} Sem download. Sem cadastro. Abra e jogue agora!`,
  g => `▶ ${g.namePT} online grátis! ${g.desc} Funciona no celular, tablet e PC. Nota ${g.rating}/5 — ${Math.round(g.plays/1000)}K jogadas!`,
  g => `Jogue ${g.namePT} agora! ${g.desc} HTML5, sem instalar nada. ${Math.round(g.plays/1000)}K jogadores. Nota ⭐${g.rating}.`,
];

const TITLE_TEMPLATES_CAT = {
  acao:       c => `Jogos de Ação Grátis Online — ${c.count}+ Jogos | NeonPlay`,
  corrida:    c => `Jogos de Corrida Grátis — Sem Download | NeonPlay`,
  puzzle:     c => `Jogos de Puzzle Grátis Online — Desafie Seu Cérebro | NeonPlay`,
  arcade:     c => `Jogos Arcade Grátis | Jogos Friv Online | NeonPlay`,
  esporte:    c => `Jogos de Esporte Grátis — Futebol, Basquete e Mais | NeonPlay`,
  aventura:   c => `Jogos de Aventura Grátis Online | NeonPlay`,
  tiro:       c => `Jogos de Tiro Grátis Online — FPS no Navegador | NeonPlay`,
  estrategia: c => `Jogos de Estratégia Grátis Online | NeonPlay`,
  all:        c => `${c.count}+ Jogos Online Grátis — Sem Download | NeonPlay`,
};

const DESC_TEMPLATES_CAT = {
  acao:       c => `${c.count} jogos de ação grátis no NeonPlay! Lute, destrua e vença inimigos direto no navegador. Sem download, sem cadastro. Jogue agora no celular ou PC!`,
  corrida:    c => `${c.count} jogos de corrida grátis! Drift, rally, moto e muito mais. Sem download. Funciona no celular. Jogue agora!`,
  puzzle:     c => `${c.count} jogos de puzzle grátis para desafiar seu cérebro! Lógica, raciocínio e diversão. Sem download. Abra e jogue!`,
  arcade:     c => `${c.count} jogos arcade grátis online — o melhor dos jogos friv! Clássicos modernizados no navegador. Sem download. Jogue agora!`,
  esporte:    c => `${c.count} jogos de esporte grátis — futebol, basquete, tênis e mais! Sem download, sem cadastro. Jogue no celular ou PC!`,
  aventura:   c => `${c.count} jogos de aventura grátis! Explore mundos, enfrente desafios e viva aventuras épicas. HTML5, sem download.`,
  tiro:       c => `${c.count} jogos de tiro grátis online! FPS, top-down e mais no navegador. Sem download. Jogue agora no celular!`,
  estrategia: c => `${c.count} jogos de estratégia grátis! Planeje, construa e conquiste. Tower defense, RTS e mais. Sem download.`,
  all:        c => `${c.count}+ jogos HTML5 grátis no NeonPlay! Ação, corrida, puzzle, arcade, esporte e mais. Sem download, sem cadastro. O maior portal de jogos do Brasil!`,
};

function getSEOTitle(game) {
  // Rotaciona template baseado no hash do ID (determinístico)
  const idx = game.id.charCodeAt(0) % TITLE_TEMPLATES_GAME.length;
  return TITLE_TEMPLATES_GAME[idx](game);
}

function getSEODescription(game) {
  const idx = (game.id.charCodeAt(0) + game.id.charCodeAt(1)) % DESC_TEMPLATES_GAME.length;
  let desc = DESC_TEMPLATES_GAME[idx](game);
  return desc.slice(0, 160); // Google trunca em ~160 chars
}

function getCatSEOTitle(catId) {
  const cd = getCategoryData(catId);
  const count = getGameCount(catId);
  const fn = TITLE_TEMPLATES_CAT[catId] || (c => `${cd.nameSEO} Grátis Online | NeonPlay`);
  return fn({ ...cd, count });
}

function getCatSEODescription(catId) {
  const cd = getCategoryData(catId);
  const count = getGameCount(catId);
  const fn = DESC_TEMPLATES_CAT[catId] || (c => `${c.count} ${cd.name} grátis online. Sem download. NeonPlay.`);
  return fn({ ...cd, count }).slice(0, 160);
}

// ═══════════════════════════════════════════════════
// S3 — LINKING INTERNO AGRESSIVO
// Cada página tem 4 seções de links internos para maximizar
// crawl depth, PageRank flow e tempo no site
// ═══════════════════════════════════════════════════

function renderInternalLinks(game) {
  const cd = getCategoryData(game.cat);

  // 1. Jogos similares (mesma categoria, mais populares)
  const sameCat = GAMES_DB
    .filter(g => g.cat === game.cat && g.id !== game.id)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 6);

  // 2. Jogos por tags compartilhadas
  const sharedTags = GAMES_DB
    .filter(g => g.id !== game.id && g.cat !== game.cat &&
      (g.tags || []).some(t => (game.tags || []).includes(t)))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 4);

  // 3. Top geral
  const topAll = GAMES_DB
    .filter(g => g.id !== game.id)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 4);

  // 4. Novos
  const newest = GAMES_DB
    .filter(g => g.id !== game.id)
    .sort((a, b) => b.year - a.year || b.plays - a.plays)
    .slice(0, 4);

  return { sameCat, sharedTags, topAll, newest };
}

// ═══════════════════════════════════════════════════
// S4 — SITEMAP DINÂMICO COMPLETO (XML)
// Gerado em JS, pode ser copiado via console
// ═══════════════════════════════════════════════════

function generateFullSitemap() {
  const base = NP_CONFIG.site.url;
  const today = new Date().toISOString().split('T')[0];
  const entries = [
    `<url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>`,
    `<url><loc>${base}/category.html</loc><changefreq>daily</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>`,
    // Categorias
    ...Object.entries(CAT_SLUGS).filter(([k]) => k !== 'all').map(([catId]) =>
      `<url><loc>${base}/category.html?cat=${catId}</loc><changefreq>weekly</changefreq><priority>0.85</priority><lastmod>${today}</lastmod></url>`
    ),
    // Jogos individuais (maior volume)
    ...GAMES_DB.map(g =>
      `<url><loc>${base}/game.html?id=${g.id}</loc><changefreq>monthly</changefreq><priority>0.75</priority></url>`
    ),
    // Blog pages (long-tail)
    `<url><loc>${base}/jogos-friv.html</loc><changefreq>weekly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>`,
    `<url><loc>${base}/jogos-para-celular.html</loc><changefreq>weekly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>`,
    `<url><loc>${base}/melhores-jogos-online.html</loc><changefreq>weekly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>`,
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

window.NP_generateFullSitemap = generateFullSitemap;

// ═══════════════════════════════════════════════════
// S5 — LONG TAIL KEYWORD TARGETING
// Páginas especiais para termos de alto volume
// ═══════════════════════════════════════════════════

// Aliases de URL que mapeiam long-tail para conteúdo existente
const LONG_TAIL_PAGES = {
  'jogos-friv':          { cat: 'arcade', title: 'Jogos Friv Online Grátis 2026 | NeonPlay', desc: 'Os melhores jogos Friv online! Arcade, puzzle, ação e muito mais. Grátis, sem download. O equivalente brasileiro do Friv!' },
  'jogos-para-celular':  { cat: 'all',    title: 'Jogos para Celular Grátis Online 2026 | NeonPlay', desc: 'Jogos grátis para celular Android e iPhone! Funciona no navegador, sem baixar nada. O melhor portal mobile do Brasil!' },
  'jogos-online-gratis': { cat: 'all',    title: 'Jogos Online Grátis Sem Download 2026 | NeonPlay', desc: '100+ jogos online grátis! Jogue direto no navegador, sem cadastro, sem download. Compatível com celular e PC!' },
  'jogos-de-acao':       { cat: 'acao',   title: 'Jogos de Ação Online Grátis | NeonPlay', desc: 'Os melhores jogos de ação HTML5 grátis! Lute, destrua e vença inimigos. Sem download. Jogue agora!' },
  'jogos-de-corrida':    { cat: 'corrida',title: 'Jogos de Corrida Online Grátis | NeonPlay', desc: 'Drift, rally, moto e mais! Jogos de corrida grátis no navegador. Sem download. Jogue no celular ou PC!' },
  'jogos-multiplayer':   { cat: 'all',    title: 'Jogos Online no Navegador | NeonPlay', desc: 'Jogos online grátis que funcionam direto no navegador! Sem precisar instalar nada. Abra e jogue agora!' },
};

function checkLongTailPage() {
  const path = location.pathname;
  for (const [slug, config] of Object.entries(LONG_TAIL_PAGES)) {
    if (path.includes(slug + '.html') || path.endsWith('/' + slug)) {
      document.title = config.title;
      setMeta('description', config.desc);
      setCanonical(`${NP_CONFIG.site.url}/${slug}.html`);
      // Redirect cat filter to show right content
      if (config.cat !== 'all' && !getParam('cat')) {
        const url = new URL(location.href);
        url.searchParams.set('cat', config.cat);
        history.replaceState(null, '', url.toString());
      }
      return config;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════
// S6 — 404 HANDLER INTELIGENTE
// Ao invés de página em branco, mostra jogos
// ═══════════════════════════════════════════════════

function handle404() {
  const el = document.getElementById('error404Content');
  if (!el) return;
  const popular = GAMES_DB.sort((a, b) => b.plays - a.plays).slice(0, 6);
  el.innerHTML = `
    <div style="text-align:center;padding:2rem 0">
      <div style="font-size:4rem">🎮</div>
      <h2 style="color:var(--text-1);margin:.5rem 0">Página não encontrada</h2>
      <p style="color:var(--text-3);margin-bottom:1.5rem">Mas temos muitos jogos esperando por você!</p>
      <a href="/" style="display:inline-block;background:var(--cyan);color:#000;padding:.7rem 1.4rem;border-radius:8px;font-weight:700;text-decoration:none;margin-bottom:2rem">🏠 Voltar ao Início</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem">
      ${popular.map(g => createCard(g)).join('')}
    </div>`;
  NP_Analytics.track('404_shown', { path: location.pathname });
}

// ═══════════════════════════════════════════════════
// S7 — BOUNCE RATE REDUCER
// Após 45s sem interação, mostra sugestão de próximo jogo
// com countdown de 10s → navega automaticamente
// ═══════════════════════════════════════════════════

function initBounceReducer() {
  // Só na game page
  if (!location.pathname.includes('game.html')) return;
  let idleTimer;
  let suggestionShown = false;

  const resetTimer = () => {
    clearTimeout(idleTimer);
    if (suggestionShown) return;
    idleTimer = setTimeout(showNextGameSuggestion, 45000);
  };

  ['mousemove', 'scroll', 'click', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, resetTimer, { passive: true })
  );
  resetTimer();
}

function showNextGameSuggestion() {
  const id = getParam('id');
  const game = getGameById(id);
  if (!game) return;
  const next = getRelatedGames(game, 4)[0] || GAMES_DB.sort((a,b) => b.plays - a.plays)[0];
  if (!next) return;

  const overlay = document.createElement('div');
  overlay.id = 'np-next-suggestion';
  overlay.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:9970;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(0,238,255,.3);border-radius:12px;padding:1rem;max-width:260px;box-shadow:0 8px 32px rgba(0,0,0,.6);animation:fadeInUp .4s ease';
  overlay.innerHTML = `
    <button onclick="document.getElementById('np-next-suggestion').remove()" style="position:absolute;top:6px;right:8px;background:none;border:none;color:var(--text-3);cursor:pointer;font-size:1rem">✕</button>
    <p style="margin:0 0 .5rem;font-size:.75rem;color:var(--text-3)">🎮 Próximo jogo em</p>
    <div style="font-size:2rem;font-weight:900;color:var(--cyan);font-family:var(--font-main)" id="np-ns-count">10</div>
    <div style="font-size:.85rem;color:var(--text-1);margin:.3rem 0 .6rem;font-weight:600">${next.namePT}</div>
    <a href="game.html?id=${next.id}" style="display:block;background:var(--cyan);color:#000;text-align:center;padding:.5rem;border-radius:6px;font-weight:700;text-decoration:none;font-size:.8rem">▶ Jogar Agora</a>
    <button onclick="document.getElementById('np-next-suggestion').remove()" style="display:block;width:100%;margin-top:.4rem;background:none;border:none;color:var(--text-3);cursor:pointer;font-size:.75rem">Ficar nesta página</button>`;
  document.body.appendChild(overlay);

  let sec = 10;
  const counter = document.getElementById('np-ns-count');
  const t = setInterval(() => {
    sec--;
    if (counter) counter.textContent = sec;
    if (sec <= 0) {
      clearInterval(t);
      location.href = `game.html?id=${next.id}`;
    }
  }, 1000);
  NP_Analytics.track('bounce_reducer_shown', { from: id, to: next.id });
}

// ═══════════════════════════════════════════════════
// S8 — SEO SCHEMA COMPLETO POR JOGO
// VideoGame schema + BreadcrumbList + Reviews simuladas
// ═══════════════════════════════════════════════════

function injectFullGameSchema(game) {
  const cd = getCategoryData(game.cat);
  const relatedGames = getRelatedGames(game, 4);

  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": game.namePT,
    "alternateName": game.name,
    "description": game.descLong || game.desc,
    "url": getGameCanonical(game.id),
    "image": game.thumb || '',
    "genre": cd.nameSEO || cd.name,
    "gamePlatform": ["HTML5", "WebBrowser"],
    "operatingSystem": ["Windows", "macOS", "Android", "iOS"],
    "applicationCategory": "Game",
    "applicationSubCategory": cd.name,
    "inLanguage": "pt-BR",
    "datePublished": `${game.year}-01-01`,
    "isAccessibleForFree": true,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "BRL",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": game.rating,
      "bestRating": 5,
      "worstRating": 1,
      "ratingCount": Math.max(100, Math.floor(game.plays / 80))
    },
    "publisher": {
      "@type": "Organization",
      "name": "NeonPlay",
      "url": NP_CONFIG.site.url
    },
    "keywords": (game.tags || []).join(', '),
  };

  if (relatedGames.length) {
    schema.isRelatedTo = relatedGames.map(g => ({
      "@type": "VideoGame",
      "name": g.namePT,
      "url": getGameCanonical(g.id)
    }));
  }

  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.id = 'schema-game';
  el.textContent = JSON.stringify(schema, null, 0);
  // Remove old schema if exists
  document.getElementById('schema-game')?.remove();
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════
// S9 — INTERNAL LINK RENDERER
// Injeta seções de links internos abaixo do jogo
// ═══════════════════════════════════════════════════

function renderGameInternalLinks(game) {
  const { sameCat, sharedTags, topAll, newest } = renderInternalLinks(game);
  const cd = getCategoryData(game.cat);

  // Render related by category
  const relGrid = document.getElementById('relatedGrid');
  if (relGrid) {
    relGrid.innerHTML = sameCat.map(g => createCard(g, { section: 'related_cat' })).join('');
  }

  // Render "Você também pode gostar" (tags compartilhadas)
  const alsoGrid = document.getElementById('alsoGrid');
  if (alsoGrid) {
    const pool = [...sharedTags, ...topAll.filter(g => !sharedTags.find(s => s.id === g.id))].slice(0, 8);
    alsoGrid.innerHTML = pool.map(g => createCard(g, { section: 'also_liked' })).join('');
  }

  // Render mais novos
  const recGrid = document.getElementById('recommendedGrid');
  if (recGrid) {
    recGrid.innerHTML = newest.map(g => createCard(g, { section: 'newest_rec' })).join('');
  }

  // Inject category link block (rich anchor text para SEO)
  const seo = document.getElementById('seoBlock');
  if (seo) {
    const altCats = Object.keys(CAT_SLUGS).filter(k => k !== 'all' && k !== game.cat).slice(0, 4);
    const catLinks = altCats.map(c => {
      const ccd = getCategoryData(c);
      return `<a href="category.html?cat=${c}">${ccd.nameSEO || ccd.name}</a>`;
    }).join(' · ');

    seo.innerHTML = `
      <h2>${game.namePT} — Jogo Online Grátis</h2>
      <p>Jogue <strong>${game.namePT}</strong> grátis no NeonPlay. ${game.descLong || game.desc}
      Sem download, sem cadastro. Funciona no celular Android, iPhone e PC.</p>
      <p><strong>Categoria:</strong> <a href="category.html?cat=${game.cat}">${cd.nameSEO || cd.name}</a> |
      <strong>Nota:</strong> ⭐ ${game.rating}/5 |
      <strong>Desenvolvedor:</strong> ${game.developer} | ${game.year}</p>
      <p><strong>Tags:</strong> ${(game.tags || []).map(t => `<a href="category.html?q=${encodeURIComponent(t)}">#${t}</a>`).join(' ')}</p>
      <p><strong>Mais categorias:</strong> ${catLinks}</p>`;
  }
}

// ═══════════════════════════════════════════════════
// S10 — OPEN GRAPH APRIMORADO
// Melhora sharing em WhatsApp, Twitter, Facebook
// ═══════════════════════════════════════════════════

function setFullOG(game) {
  const title = getSEOTitle(game);
  const desc  = getSEODescription(game);
  const url   = getGameCanonical(game.id);

  setMeta('og:title',       title);
  setMeta('og:description', desc);
  setMeta('og:url',         url);
  setMeta('og:type',        'website');
  setMeta('og:site_name',   'NeonPlay');
  setMeta('og:locale',      'pt_BR');
  if (game.thumb) {
    setMeta('og:image',       game.thumb);
    setMeta('og:image:width', '512');
    setMeta('og:image:height','384');
    setMeta('og:image:alt',   `${game.namePT} — Jogue grátis no NeonPlay`);
  }
  setMeta('twitter:card',        'summary_large_image');
  setMeta('twitter:title',       title);
  setMeta('twitter:description', desc);
  if (game.thumb) setMeta('twitter:image', game.thumb);
}


// R3 — BreadcrumbList Schema
function injectBreadcrumbSchema(items) {
  // items: [{name, url}]
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url
    }))
  };
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(schema);
  document.head.appendChild(el);
}

// R3 — FAQPage Schema para páginas de categoria
function injectCategoryFAQ(cat) {
  const cd = getCategoryData(cat);
  const count = getGameCount(cat);
  const faqs = [
    {
      q: `Jogos de ${cd.name} são realmente grátis?`,
      a: `Sim! Todos os ${count} jogos de ${cd.name} do NeonPlay são 100% gratuitos. Sem cadastro, sem download, sem mensalidade.`
    },
    {
      q: `Preciso instalar algo para jogar?`,
      a: `Não! Os jogos de ${cd.name} rodam direto no navegador em HTML5. Funciona no Chrome, Firefox, Safari e até no celular.`
    },
    {
      q: `Posso jogar ${cd.name} no celular?`,
      a: `Sim! O NeonPlay é 100% responsivo. Todos os jogos de ${cd.name} funcionam em smartphones e tablets Android e iOS.`
    }
  ];
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a }
    }))
  };
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(schema);
  document.head.appendChild(el);
}

// R8 — Resource hints para performance
function injectResourceHints() {
  const hints = [
    { rel: 'dns-prefetch', href: '//pagead2.googlesyndication.com' },
    { rel: 'dns-prefetch', href: '//www.googletagmanager.com' },
    { rel: 'dns-prefetch', href: '//img.gamemonetize.com' },
    { rel: 'dns-prefetch', href: '//html5.gamemonetize.co' },
    { rel: 'preconnect',   href: 'https://pagead2.googlesyndication.com' },
  ];
  hints.forEach(h => {
    if (!document.querySelector(`link[rel="${h.rel}"][href="${h.href}"]`)) {
      const el = document.createElement('link');
      el.rel = h.rel;
      el.href = h.href;
      if (h.rel === 'preconnect') el.crossOrigin = 'anonymous';
      document.head.appendChild(el);
    }
  });
}

// R8 — CSS containment para performance de scroll
function injectPerfStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .game-card { contain: layout style; }
    .carousel-scroll { contain: layout; }
    #np-anchor-ad { position:fixed;bottom:0;left:0;right:0;z-index:9990;background:#0a0a14;
      border-top:1px solid rgba(0,238,255,.15);padding:4px 0;text-align:center;
      display:none;transition:transform .3s ease; }
    #np-anchor-ad.visible { display:block; }
    #np-anchor-ad .anc-close { position:absolute;top:2px;right:8px;background:none;
      border:none;color:var(--text-3);cursor:pointer;font-size:1.1rem;padding:4px; }
    #np-interstitial { position:fixed;inset:0;z-index:99999;background:rgba(8,8,15,.97);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem; }
    #np-interstitial .int-title { font-size:1.1rem;color:var(--text-2);font-family:var(--font-main); }
    #np-interstitial .int-skip { background:none;border:1px solid rgba(0,238,255,.3);
      color:var(--cyan);padding:.6rem 1.4rem;border-radius:6px;cursor:pointer;font-size:.9rem;
      font-family:var(--font-main);transition:all .2s; }
    #np-interstitial .int-skip:hover { background:rgba(0,238,255,.1); }
    #np-interstitial .int-counter { font-size:2.5rem;font-weight:900;color:var(--cyan);
      font-family:var(--font-main); }
    #np-session-nudge { position:fixed;bottom:80px;right:16px;z-index:9980;
      background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(0,238,255,.25);
      border-radius:12px;padding:1rem 1.2rem;max-width:280px;box-shadow:0 8px 32px rgba(0,0,0,.5);
      display:none; }
    #np-session-nudge.visible { display:block;animation:fadeInUp .4s ease; }
    #np-session-nudge h4 { margin:0 0 .4rem;font-size:.9rem;color:var(--text-1); }
    #np-session-nudge p  { margin:0 0 .7rem;font-size:.78rem;color:var(--text-3); }
    #np-session-nudge .nudge-close { float:right;background:none;border:none;color:var(--text-3);
      cursor:pointer;font-size:1rem;margin-top:-1.8rem; }
    #np-session-nudge .nudge-grid { display:grid;grid-template-columns:1fr 1fr;gap:.4rem; }
    #np-session-nudge .nudge-game { display:flex;align-items:center;gap:.4rem;padding:.35rem .5rem;
      background:rgba(255,255,255,.05);border-radius:6px;cursor:pointer;font-size:.75rem;
      color:var(--text-2);text-decoration:none; }
    #np-session-nudge .nudge-game:hover { background:rgba(0,238,255,.1);color:var(--cyan); }
  `;
  document.head.appendChild(style);
}


// ═══════════════════════════════════════════════════
// 8. BUSCA
// ═══════════════════════════════════════════════════

function initSearch() {
  const input = document.getElementById('searchInput');
  const drop  = document.getElementById('searchDrop');
  if (!input || !drop) return;

  const doSearch = debounce(q => {
    q = q.trim();
    if (q.length < 2) { drop.hidden = true; return; }
    const res = searchGames(q).slice(0, 8);
    NP_Analytics.searchQuery(q, res.length);
    if (!res.length) { drop.hidden = true; return; }
    drop.innerHTML = res.map(g => `
      <a href="game.html?id=${g.id}" class="sdrop-item">
        <span class="sdrop-emoji">${getCategoryData(g.cat).emoji}</span>
        <span class="sdrop-name">${g.namePT}</span>
        <span class="sdrop-cat">${getCategoryData(g.cat).name}</span>
      </a>`).join('');
    drop.hidden = false;
  }, 200);

  input.addEventListener('input', e => doSearch(e.target.value));
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !drop.contains(e.target)) drop.hidden = true;
  });
  // Mobile: submit busca via enter → category page
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) location.href = `category.html?q=${encodeURIComponent(q)}`;
    }
  });
}

// ═══════════════════════════════════════════════════
// 9. UI
// ═══════════════════════════════════════════════════

function initUI() {
  const hbg  = document.getElementById('hbg');
  const mnav = document.getElementById('mobileNav');
  if (hbg && mnav) {
    hbg.addEventListener('click', () => {
      const open = mnav.hidden;
      mnav.hidden = !open;
      hbg.setAttribute('aria-expanded', String(open));
      // Fecha ao clicar fora
      if (open) {
        setTimeout(() => {
          document.addEventListener('click', function close(e) {
            if (!mnav.contains(e.target) && e.target !== hbg) {
              mnav.hidden = true;
              hbg.setAttribute('aria-expanded', 'false');
              document.removeEventListener('click', close);
            }
          });
        }, 50);
      }
    });
  }
  const favBtn  = document.getElementById('favBtn');
  const panel   = document.getElementById('favPanel');
  const overlay = document.getElementById('overlay');
  const close   = document.getElementById('favClose');
  function openFav()  { if (panel) { panel.classList.add('open'); overlay?.classList.add('show'); renderFavPanel(); } }
  function closeFav() { panel?.classList.remove('open'); overlay?.classList.remove('show'); }
  favBtn?.addEventListener('click', openFav);
  close?.addEventListener('click', closeFav);
  overlay?.addEventListener('click', closeFav);

  // ESC fecha paineis
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeFav();
  });
}

// ═══════════════════════════════════════════════════
// 10. LIVE TICKER
// ═══════════════════════════════════════════════════

function initTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const top   = getTopGames(10);
  const items = top.map(g => {
    const cd = getCategoryData(g.cat);
    return `<span class="ticker-item"><span class="ticker-dot"></span>${cd.emoji} <strong>${g.namePT}</strong> — ${formatPlays(g.plays)} jogadas</span>`;
  });
  track.innerHTML = items.join('') + items.join('');
  const liveEl = document.getElementById('liveCount');
  if (liveEl) {
    let count = randInt(2000, 4500);
    liveEl.textContent = count.toLocaleString('pt-BR');
    setInterval(() => {
      count += randInt(-30, 50);
      count = Math.max(1200, Math.min(6000, count));
      liveEl.textContent = count.toLocaleString('pt-BR');
    }, 4000);
  }
}

// ═══════════════════════════════════════════════════
// 11. SCROLL REVEAL
// ═══════════════════════════════════════════════════

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        // Track section views
        const heading = e.target.querySelector('[id$="-heading"]');
        if (heading) NP_Analytics.sectionView(heading.id);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}

// ═══════════════════════════════════════════════════
// 12. TOP 5 WIDGET
// ═══════════════════════════════════════════════════

function renderTop5(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const top = getTopGames(5);
  el.innerHTML = top.map((g, i) => `
    <a href="game.html?id=${g.id}" class="top5-item">
      <span class="top5-rank">#${i + 1}</span>
      <span class="top5-emoji">${getCategoryData(g.cat).emoji}</span>
      <div class="top5-info">
        <div class="top5-name">${g.namePT}</div>
        <div class="top5-plays">${formatPlays(g.plays)} jogadas</div>
      </div>
    </a>`).join('');
}

// ═══════════════════════════════════════════════════
// 13. CARROSSEL — G7 Mobile First (touch support)
// ═══════════════════════════════════════════════════

function fillCarousel(id, games, opts) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = games.map(g => createCard(g, opts || {})).join('');
}

function bindCarouselNav(prevId, nextId, scrollId) {
  const prev   = document.getElementById(prevId);
  const next   = document.getElementById(nextId);
  const scroll = document.getElementById(scrollId);
  if (!prev || !next || !scroll) return;
  const STEP = scroll.offsetWidth * 0.75 || 280;
  prev.addEventListener('click', () => scroll.scrollBy({ left: -STEP, behavior: 'smooth' }));
  next.addEventListener('click', () => scroll.scrollBy({ left: STEP, behavior: 'smooth' }));
}

// Touch swipe para carrosséis — G7
function initCarouselTouch(id) {
  const el = document.getElementById(id);
  if (!el) return;
  let startX = 0;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) el.scrollBy({ left: diff * 2, behavior: 'smooth' });
  }, { passive: true });
}

// ═══════════════════════════════════════════════════
// 14. SEÇÕES HOME
// ═══════════════════════════════════════════════════

function renderEscolhidos() {
  const el = document.getElementById('escolhidosGrid');
  if (!el) return;
  const recentIds   = Recent.get();
  const recentGames = recentIds.map(id => GAMES_DB.find(g => g.id === id)).filter(Boolean);
  const likedCats   = [...new Set(recentGames.map(g => g.cat))];
  let pool = [];
  likedCats.forEach(cat => {
    const catGames = GAMES_DB.filter(g => g.cat === cat && !recentIds.includes(g.id));
    pool.push(...catGames.slice(0, 4));
  });
  if (pool.length < 8) {
    const fallback = [...GAMES_DB]
      .filter(g => !recentIds.includes(g.id) && !pool.find(p => p.id === g.id))
      .sort((a, b) => b.rating - a.rating);
    pool.push(...fallback);
  }
  el.innerHTML = pool.slice(0, 8).map(g => createCard(g)).join('');
}

function renderTop10() {
  const el = document.getElementById('top10Grid');
  if (!el) return;
  const games = getTopGames(10);
  el.innerHTML = games.map((g, i) => `
    <a href="game.html?id=${g.id}" class="top10-item">
      <span class="t10-rank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}</span>
      <div class="t10-thumb" style="background:linear-gradient(${getCategoryData(g.cat).gradient})">
        ${g.thumb ? `<img src="${g.thumb}" alt="${g.namePT}" loading="lazy" onerror="this.innerHTML='${getCategoryData(g.cat).emoji}'">` : `${getCategoryData(g.cat).emoji}`}
      </div>
      <div class="t10-info">
        <div class="t10-name">${g.namePT}</div>
        <div class="t10-plays">👾 ${formatPlays(g.plays)}</div>
      </div>
      <div class="t10-arrow">›</div>
    </a>`).join('');
}

function renderSurprise() {
  const el = document.getElementById('surpriseGame');
  if (!el) return;
  const game = shuffle(GAMES_DB)[0];
  el.innerHTML = createMiniCard(game);
}

// ═══════════════════════════════════════════════════

// R1 — AdSense script loader
function injectAdSenseScript() {
  if (document.getElementById('adsense-script')) return;
  const s = document.createElement('script');
  s.id  = 'adsense-script';
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${NP_CONFIG.adsense.publisher}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

// R1 — Push a single ad unit
function pushAd(el) {
  el.innerHTML = `<ins class="adsbygoogle" style="display:block"
    data-ad-client="${NP_CONFIG.adsense.publisher}"
    data-ad-slot="${el.dataset.adSlot}"
    data-ad-format="${el.dataset.adFormat || 'auto'}"
    data-full-width-responsive="true"></ins>`;
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  NP_Analytics.adImpression(el.dataset.adSlot);
}

// R6 — Mobile sticky anchor ad
function initMobileAnchorAd() {
  if (window.innerWidth > 768) return; // apenas mobile
  const wrap = document.createElement('div');
  wrap.id = 'np-anchor-ad';
  wrap.innerHTML = `
    <button class="anc-close" onclick="document.getElementById('np-anchor-ad').remove()" aria-label="Fechar">✕</button>
    <ins class="adsbygoogle" style="display:inline-block;width:320px;height:50px"
      data-ad-client="${NP_CONFIG.adsense.publisher}"
      data-ad-slot="${NP_CONFIG.adsense.slots.anchor_mobile}"></ins>`;
  document.body.appendChild(wrap);
  setTimeout(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
    wrap.classList.add('visible');
    NP_Analytics.adImpression('anchor_mobile');
  }, 3000);
}

// R2 — Intersticial pré-jogo (5s countdown, pulável)
function showInterstitial(onComplete) {
  // Não mostra em visitas frequentes (não atrapalha power users)
  const key = 'np_int_shown_v7';
  const last = parseInt(localStorage.getItem(key) || '0');
  const now  = Date.now();
  if (now - last < 30000) { onComplete(); return; } // min 30s entre intersticiais
  localStorage.setItem(key, now);

  const el = document.createElement('div');
  el.id = 'np-interstitial';
  el.innerHTML = `
    <div class="int-title">🎮 Preparando o jogo...</div>
    <div class="int-counter" id="np-int-count">5</div>
    <ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px"
      data-ad-client="${NP_CONFIG.adsense.publisher}"
      data-ad-slot="${NP_CONFIG.adsense.slots.pre_game}"></ins>
    <button class="int-skip" id="np-int-skip" disabled>Aguarde...</button>`;
  document.body.appendChild(el);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  NP_Analytics.adImpression('interstitial_pre_game');

  let sec = 5;
  const countEl = document.getElementById('np-int-count');
  const skipBtn = document.getElementById('np-int-skip');
  const timer = setInterval(() => {
    sec--;
    if (countEl) countEl.textContent = sec;
    if (sec <= 0) {
      clearInterval(timer);
      if (skipBtn) { skipBtn.disabled = false; skipBtn.textContent = '▶ Jogar Agora'; }
    }
  }, 1000);
  skipBtn?.addEventListener('click', () => {
    if (skipBtn.disabled) return;
    el.remove();
    onComplete();
    NP_Analytics.track('interstitial_skip', { after_seconds: 5 - sec });
  });
}

// 15. ADSENSE INTELIGENTE — G6 (gargalo corrigido)
// Injeta slots AdSense nas posições corretas,
// apenas quando o bloco está visível (lazy ad load)
// ═══════════════════════════════════════════════════

const AD_CLIENT = NP_CONFIG.adsense.publisher;

function initSmartAds() {
  if (typeof adsbygoogle === 'undefined') return; // Só age se AdSense carregou

  // Lazy load de anúncios: só injeta quando o container entra na viewport
  const adBlocks = document.querySelectorAll('.ad-block[data-ad-slot]');
  const adObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const block = e.target;
        const slot  = block.dataset.adSlot;
        const format = block.dataset.adFormat || 'auto';
        if (!block.dataset.adLoaded) {
          block.dataset.adLoaded = '1';
          block.innerHTML = `
            <ins class="adsbygoogle"
              style="display:block"
              data-ad-client="${AD_CLIENT}"
              data-ad-slot="${slot}"
              data-ad-format="${format}"
              data-full-width-responsive="true"></ins>`;
          try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
          NP_Analytics.adImpression(slot);
        }
        adObs.unobserve(block);
      }
    });
  }, { threshold: 0.1 });
  adBlocks.forEach(b => adObs.observe(b));
}

// ═══════════════════════════════════════════════════

// R4 — Session nudge: após 2 jogos, sugere mais 4
function maybeShowSessionNudge() {
  const gamesOpened = parseInt(sessionStorage.getItem('np_games_opened_v7') || '0');
  if (gamesOpened < 2) return;
  if (document.getElementById('np-session-nudge')) return;
  const suggestions = shuffle(GAMES_DB).slice(0, 4);
  const wrap = document.createElement('div');
  wrap.id = 'np-session-nudge';
  wrap.innerHTML = `
    <button class="nudge-close" onclick="document.getElementById('np-session-nudge').remove()">✕</button>
    <h4>🎮 Continue explorando!</h4>
    <p>Você já jogou ${gamesOpened} jogos hoje. Que tal estes?</p>
    <div class="nudge-grid">
      ${suggestions.map(g => `<a href="game.html?id=${g.id}" class="nudge-game">
        ${getCategoryData(g.cat).emoji} ${g.namePT}
      </a>`).join('')}
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => wrap.classList.add('visible'), 500);
  NP_Analytics.track('session_nudge_shown', { games_opened: gamesOpened });
}

// R7 — Push notification opt-in (depois de 3 páginas)
function maybeShowPushOptIn() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  if (SessionPages.get() < 3) return;
  if (localStorage.getItem('np_push_declined_v7')) return;

  setTimeout(() => {
    NP_Analytics.track('push_optin_shown', {});
    // Usamos confirm() para não interromper fluxo — ou pode ser um modal customizado
    // Por ora, mostramos toast convidando
    showToast('🔔 Quer receber novidades? Ative notificações nas config. do navegador!', 5000);
    localStorage.setItem('np_push_declined_v7', '1'); // só mostra 1x
  }, 8000);
}

// 16. HOME PAGE
// ═══════════════════════════════════════════════════

const PAGE_SIZE = 12;
let homeOffset = 0;
let homeGames  = [];

function initHomePage() {
  NP_Analytics.pageView('home');

  // Featured grid
  const feat     = getFeaturedGames();
  const featGrid = document.getElementById('featuredGrid');
  if (featGrid) featGrid.innerHTML = feat.map(g => createCard(g, { section: 'featured' })).join('');

  // Home Dinâmica — G2
  const variant = getHomeRotation();
  applyHomeVariant(variant);

  // Seções de Retenção — G3
  renderContinuePlaying();
  renderUserTopGames();

  // Top 10
  renderTop10();

  // Carrosséis
  const popular = [...GAMES_DB].sort((a, b) => b.plays - a.plays);
  fillCarousel('popularCarousel', popular.slice(0, 16), { section: 'popular' });
  bindCarouselNav('popPrev', 'popNext', 'popularCarousel');
  initCarouselTouch('popularCarousel');

  const newest = [...GAMES_DB].sort((a, b) => b.year - a.year || b.plays - a.plays);
  fillCarousel('newCarousel', newest.slice(0, 16), { section: 'novidades' });
  bindCarouselNav('newPrev', 'newNext', 'newCarousel');
  initCarouselTouch('newCarousel');

  renderEscolhidos();

  const acao    = GAMES_DB.filter(g => g.cat === 'acao').sort((a, b) => b.plays - a.plays);
  fillCarousel('acaoCarousel', acao.slice(0, 12), { section: 'acao' });
  initCarouselTouch('acaoCarousel');

  const corrida = GAMES_DB.filter(g => g.cat === 'corrida').sort((a, b) => b.plays - a.plays);
  fillCarousel('corridaCarousel', corrida.slice(0, 12), { section: 'corrida' });
  initCarouselTouch('corridaCarousel');

  const puzzle  = GAMES_DB.filter(g => g.cat === 'puzzle').sort((a, b) => b.plays - a.plays);
  fillCarousel('puzzleCarousel', puzzle.slice(0, 12), { section: 'puzzle' });
  initCarouselTouch('puzzleCarousel');

  // Grid geral
  homeGames  = [...GAMES_DB].sort((a, b) => b.plays - a.plays);
  homeOffset = 0;
  renderHomeGrid(true);

  // Categories
  const catsGrid = document.getElementById('catsGrid');
  if (catsGrid) {
    catsGrid.innerHTML = CATEGORIES_DATA.map(c => `
      <a href="category.html?cat=${c.id}" class="cat-card" style="border-color:${c.color}22">
        <div class="cat-card-icon">${c.emoji}</div>
        <div class="cat-card-name">${c.name}</div>
        <div class="cat-card-count">${getGameCount(c.id)} jogos</div>
      </a>`).join('');
  }

  renderTop5('top5List');
  renderRecentBar();
  renderSurprise();

  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    homeOffset += PAGE_SIZE;
    renderHomeGrid(false);
  });
  document.getElementById('surpriseBtn')?.addEventListener('click', renderSurprise);

  initHeroParticles();
  initDynamicPlays();
  initTicker();
  initScrollReveal();
  initSmartAds();
  DopamineSystem.onVisit();
}

function renderHomeGrid(reset) {
  const grid = document.getElementById('gamesGrid');
  const btn  = document.getElementById('loadMoreBtn');
  if (!grid) return;
  const slice = homeGames.slice(0, homeOffset + PAGE_SIZE);
  if (reset) {
    grid.innerHTML = slice.map(g => createCard(g, { section: 'all_games' })).join('');
  } else {
    const newItems = homeGames.slice(homeOffset, homeOffset + PAGE_SIZE);
    const frag = document.createDocumentFragment();
    newItems.forEach(g => {
      const div = document.createElement('div');
      div.innerHTML = createCard(g, { section: 'load_more' });
      const card = div.firstElementChild;
      if (card) { card.style.animation = 'fadeInUp .35s ease both'; frag.appendChild(card); }
    });
    grid.appendChild(frag);
  }
  if (btn) btn.style.display = slice.length >= homeGames.length ? 'none' : 'block';
}

// ═══════════════════════════════════════════════════
// 17. HERO PARTICLES
// ═══════════════════════════════════════════════════

function initHeroParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'hparticle';
    p.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;
      animation-delay:${Math.random() * 6}s;animation-duration:${4 + Math.random() * 5}s;
      width:${2 + Math.random() * 3}px;height:${2 + Math.random() * 3}px;
      opacity:${0.2 + Math.random() * 0.5}`;
    container.appendChild(p);
  }
}

// ═══════════════════════════════════════════════════
// 18. POPULARIDADE DINÂMICA
// ═══════════════════════════════════════════════════

function initDynamicPlays() {
  setInterval(() => {
    GAMES_DB.forEach(g => { if (Math.random() > .72) g.plays += randInt(1, 8); });
    document.querySelectorAll('.card-plays').forEach(el => {
      const card = el.closest('[onclick]');
      if (!card) return;
      const m = (card.getAttribute('onclick') || '').match(/id=([^']+)/);
      if (!m) return;
      const g = GAMES_DB.find(x => x.id === m[1]);
      if (g) el.textContent = `👾 ${formatPlays(g.plays)}`;
    });
  }, 18000);
}

// ═══════════════════════════════════════════════════
// 19. GAME PAGE — LOOP INFINITO
// ═══════════════════════════════════════════════════

function initGamePage() {
  NP_Analytics.pageView('game');

  const id   = getParam('id');
  const game = getGameById(id);

  if (!game) {
    const t = document.getElementById('gpTitle');
    if (t) t.textContent = 'Jogo não encontrado';
    return;
  }

  Recent.add(id);
  UserPlays.increment(id);
  DopamineSystem.onGameOpened();

  const cd = getCategoryData(game.cat);

  // S2 — SEO title + description otimizados para CTR
  document.title = getSEOTitle(game);
  setMeta('description', getSEODescription(game));
  setCanonical(getGameCanonical(game.id));

  // S10 — Full Open Graph
  setFullOG(game);

  // S8 — Schema VideoGame completo
  injectFullGameSchema(game);

  // Breadcrumb
  const bcCat  = document.getElementById('bcCat');
  const bcGame = document.getElementById('bcGame');
  if (bcCat)  { bcCat.textContent = `${cd.emoji} ${cd.name}`; bcCat.href = `category.html?cat=${game.cat}`; }
  if (bcGame)   bcGame.textContent = game.namePT;
  // R3 — BreadcrumbList schema
  injectBreadcrumbSchema([
    { name: 'NeonPlay', url: `${NP_CONFIG.site.url}/` },
    { name: cd.name, url: `${NP_CONFIG.site.url}/category.html?cat=${game.cat}` },
    { name: game.namePT, url: `${NP_CONFIG.site.url}/game.html?id=${game.id}` }
  ]);

  // Splash poster
  const poster = document.getElementById('splashPoster');
  if (poster) {
    if (game.thumb) {
      poster.innerHTML = `<img src="${game.thumb}" alt="${game.namePT}" onerror="this.parentElement.innerHTML='${cd.emoji}'" style="width:100%;height:100%;object-fit:cover;border-radius:var(--r)">`;
    } else {
      poster.textContent = cd.emoji;
      poster.style.background = `linear-gradient(${cd.gradient})`;
    }
  }

  const el = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
  el('gpTitle',    game.namePT);
  el('gpDesc',     game.desc);
  el('gpTagCat',   `${cd.emoji} ${cd.name}`);
  el('gpTagRating',`⭐ ${game.rating}/5`);
  el('gpTagPlays', `👾 ${formatPlays(game.plays)}`);
  el('gpTagYear',  `📅 ${game.year}`);
  el('gpTagDev',   `🏢 ${game.developer}`);
  el('ginfoCTitle',`Sobre ${game.namePT}`);
  el('ginfoDesc',  game.descLong || game.desc);

  const tagsEl = document.getElementById('gameTags');
  if (tagsEl && game.tags) tagsEl.innerHTML = game.tags.map(t => `<span class="gtag">#${t}</span>`).join('');

  const seo = document.getElementById('seoBlock');
  if (seo) seo.innerHTML = `<h2>${game.namePT} — Jogo Grátis Online</h2>
    <p>Jogue <strong>${game.namePT}</strong> gratuitamente no NeonPlay.
    ${game.descLong || game.desc} Sem download, sem cadastro.</p>
    <p>Categoria: <a href="category.html?cat=${game.cat}">${cd.name}</a> | ${game.developer} | ${game.year}</p>`;

  el('iframeTitle', `🎮 ${game.namePT}`);

  // Botão jogar
  const playBtn = document.getElementById('playNowBtn');
  const wrap    = document.getElementById('gameFrameWrap');
  const splash  = document.getElementById('gameSplash');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      // R2 — Intersticial pré-jogo
      showInterstitial(() => {
        if (splash) splash.style.display = 'none';
        if (wrap)  { wrap.style.display = 'block'; launchGame(game); }
        NP_Analytics.gamePlay(game.id, game.namePT, game.cat);
        // R4 — Track games opened for session nudge
        try {
          const n = (parseInt(sessionStorage.getItem('np_games_opened_v7') || '0')) + 1;
          sessionStorage.setItem('np_games_opened_v7', n);
          if (n >= 2) setTimeout(maybeShowSessionNudge, 12000);
        } catch(e) {}
      });
    }, { once: true });
  }

  ['favSplashBtn', 'favIframeBtn'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.dataset.id = game.id;
    updateFavBtn(btn, game.id);
    btn.addEventListener('click', () => { Favs.toggle(game.id); updateFavBtn(btn, game.id); });
  });

  document.getElementById('restartBtn')?.addEventListener('click', () => launchGame(game));
  document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    const iframe = document.getElementById('gameFrame');
    if (iframe?.requestFullscreen)       iframe.requestFullscreen();
    else if (iframe?.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
  });

  // S9 — Internal links (SEO-optimized: related, tags, top, newest)
  renderGameInternalLinks(game);

  const nextGameEl = document.getElementById('nextGamePanel');
  if (nextGameEl) {
    const candidates = getRelatedGames(game, 4);
    const nextGame   = candidates[0] || shuffle(GAMES_DB.filter(g => g.id !== game.id))[0];
    if (nextGame) nextGameEl.innerHTML = createNextGameCard(nextGame);
  }

  renderTop5('sidebarHot');
  initScrollReveal();
  initSmartAds();
  initBounceReducer(); // S7 — Bounce rate reducer
}

function updateFavBtn(btn, id) {
  const f = Favs.has(id);
  btn.textContent = f ? '❤️ Favoritado' : '♡ Favoritar';
  btn.classList.toggle('faved', f);
}

function launchGame(game) {
  const frame  = document.getElementById('gameFrame');
  const loader = document.getElementById('iframeLoader');
  if (!frame) return;
  if (loader) loader.style.display = 'flex';
  frame.src = game.src;
  frame.onload = () => { if (loader) loader.style.display = 'none'; };
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"],meta[property="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(name.includes(':') ? 'property' : 'name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// ═══════════════════════════════════════════════════
// 20. CATEGORY PAGE
// ═══════════════════════════════════════════════════

const CAT_PAGE_SIZE = 12;
let catOffset   = 0;
let catFiltered = [];
let currentCat  = 'all';
let currentSort = 'popular';
let currentSearch = '';

function initCategoryPage() {
  NP_Analytics.pageView('category');

  currentCat    = getParam('cat') || 'all';
  currentSort   = getParam('sort') || 'popular';
  currentSearch = getParam('q') || '';

  updateCatHero(currentCat);

  // S2 — CTR-optimized title + description
  document.title = getCatSEOTitle(currentCat);
  setMeta('description', getCatSEODescription(currentCat));
  setCanonical(getCatCanonical(currentCat));
  injectCategorySchema(currentCat);
  // R3 — BreadcrumbList + FAQPage schemas
  injectBreadcrumbSchema([
    { name: 'NeonPlay', url: `${NP_CONFIG.site.url}/` },
    { name: getCategoryData(currentCat).nameSEO || getCategoryData(currentCat).name,
      url: currentCat === 'all' ? `${NP_CONFIG.site.url}/category.html` : `${NP_CONFIG.site.url}/category.html?cat=${currentCat}` }
  ]);
  if (currentCat !== 'all') injectCategoryFAQ(currentCat);
  buildFilterChips();
  buildSortSelect();

  // Se veio com ?q= (busca), filtra por termo
  if (currentSearch) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = currentSearch;
    catFiltered = searchGames(currentSearch);
    const heroTitle = document.getElementById('catHeroTitle');
    if (heroTitle) heroTitle.textContent = `Busca: "${currentSearch}"`;
    const heroCount = document.getElementById('catHeroCount');
    if (heroCount) heroCount.textContent = `${catFiltered.length} jogos encontrados`;
  } else {
    catFiltered = getFiltered();
  }

  catOffset = 0;
  renderCatGrid(true);
  renderTop5('sidebarTop');
  setActiveChip(currentCat);
  renderCatSeoBlock(currentCat);
  initTicker();
  initScrollReveal();
  initSmartAds();

  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    catOffset += CAT_PAGE_SIZE;
    renderCatGrid(false);
    NP_Analytics.track('load_more', { page: 'category', cat: currentCat });
  });
}

function renderCatSeoBlock(catId) {
  const el = document.getElementById('catSeoBlock');
  if (!el) return;
  const cd    = getCategoryData(catId);
  const count = getGameCount(catId);
  if (catId === 'all') {
    el.innerHTML = `<h2>Todos os Jogos Online Grátis — NeonPlay</h2>
      <p>Explore todos os <strong>${count} jogos HTML5 grátis</strong> disponíveis no NeonPlay. Ação, corrida, puzzle, arcade, esporte, aventura, tiro e estratégia. Sem download, sem cadastro.</p>`;
  } else {
    el.innerHTML = `<h2>${cd.nameSEO || cd.name} Grátis Online — NeonPlay</h2>
      <p>${cd.desc} Temos <strong>${count} jogos de ${cd.name}</strong> disponíveis para jogar agora, direto no navegador.</p>`;
  }
}

function updateCatHero(catId) {
  const cd = getCategoryData(catId);
  const el = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
  el('catHeroIcon',  cd.emoji);
  el('catHeroTitle', cd.nameSEO || cd.name);
  el('catHeroCount', `${getGameCount(catId)} jogos disponíveis`);
  el('catHeroDesc',  cd.desc || '');
  const bc = document.getElementById('bcCat');
  if (bc) { bc.textContent = catId === 'all' ? 'Todas as Categorias' : cd.name; bc.href = `category.html?cat=${catId}`; }
}

function updateActiveCatSEO(catId) {
  const cd = getCategoryData(catId);
  document.title = `${cd.nameSEO || cd.name} Grátis Online — NeonPlay`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = `${cd.desc || 'Jogos grátis no NeonPlay.'} Sem download, sem cadastro.`;
  setCanonical(catId === 'all'
    ? 'https://neonplay.com.br/category.html'
    : `https://neonplay.com.br/category.html?cat=${catId}`);
}

function buildFilterChips() {
  const chips = document.getElementById('catChips');
  if (!chips) return;
  const all = [{ id: 'all', name: 'Todos', emoji: '🎮' }, ...CATEGORIES_DATA];
  chips.innerHTML = all.map(c => `
    <button class="filter-chip${c.id === currentCat ? ' active' : ''}" data-cat="${c.id}">
      ${c.emoji} ${c.name}
    </button>`).join('');
  chips.addEventListener('click', e => {
    const btn = e.target.closest('.filter-chip');
    if (!btn) return;
    currentCat = btn.dataset.cat;
    history.replaceState(null, '', `?cat=${currentCat}`);
    updateCatHero(currentCat);
    updateActiveCatSEO(currentCat);
    setActiveChip(currentCat);
    catFiltered = getFiltered();
    catOffset   = 0;
    renderCatGrid(true);
    renderCatSeoBlock(currentCat);
    NP_Analytics.track('filter_category', { cat: currentCat });
  });
}

function buildSortSelect() {
  const sel = document.getElementById('sortSelect');
  if (!sel) return;
  sel.value = currentSort;
  sel.addEventListener('change', () => {
    currentSort = sel.value;
    catFiltered = getFiltered();
    catOffset   = 0;
    renderCatGrid(true);
    NP_Analytics.track('sort_change', { sort: currentSort });
  });
}

function getFiltered() {
  let games = currentCat === 'all' ? [...GAMES_DB] : GAMES_DB.filter(g => g.cat === currentCat);
  if (currentSort === 'popular') games.sort((a, b) => b.plays - a.plays);
  else if (currentSort === 'newest') games.sort((a, b) => b.year - a.year || b.plays - a.plays);
  else if (currentSort === 'name')   games.sort((a, b) => a.namePT.localeCompare(b.namePT));
  else if (currentSort === 'rating') games.sort((a, b) => b.rating - a.rating);
  return games;
}

function renderCatGrid(reset) {
  const grid = document.getElementById('categoryGrid');
  const btn  = document.getElementById('loadMoreBtn');
  if (!grid) return;
  const slice = catFiltered.slice(0, catOffset + CAT_PAGE_SIZE);
  grid.innerHTML = slice.map(g => createCard(g, { section: 'category_grid' })).join('');
  if (btn) btn.style.display = slice.length >= catFiltered.length ? 'none' : 'block';
}

function setActiveChip(catId) {
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === catId);
  });
}

// ═══════════════════════════════════════════════════
// 21. FAVICON SVG DINÂMICO — G5
// ═══════════════════════════════════════════════════

function injectFavicon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00eeff"/>
        <stop offset="100%" style="stop-color:#a855f7"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#g)"/>
    <text x="32" y="44" font-size="34" text-anchor="middle" fill="#fff">🎮</text>
  </svg>`;
  const encoded = 'data:image/svg+xml,' + encodeURIComponent(svg);
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = encoded;
}

// ═══════════════════════════════════════════════════
// 22. TRUST SIGNALS DINÂMICOS — G5 / G8
// ═══════════════════════════════════════════════════

function updateTrustSignals() {
  // Contador de jogos na hero
  const totalEl = document.querySelector('.stat-item strong');
  if (totalEl && GAMES_DB.length > 100) totalEl.textContent = GAMES_DB.length + '+';

  // Atualiza o ano no footer
  document.querySelectorAll('.footer-bot p').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/© \d{4}/, `© ${new Date().getFullYear()}`);
  });
}

// ═══════════════════════════════════════════════════
// 23. INIT GLOBAL
// ═══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // R8 — Performance & resource hints first
  injectResourceHints();
  injectPerfStyles();

  injectFavicon();
  updateFavCount();
  initSearch();
  initUI();
  updateTrustSignals();

  // R1 — Load AdSense script once
  injectAdSenseScript();

  // R5 — Analytics trackers
  NP_ScrollTracker.init();
  NP_TimeTracker.init();
  NP_ExitIntent.init();

  // R6 — Mobile anchor ad
  initMobileAnchorAd();

  // R4/R7 — Session depth
  const pageNum = SessionPages.count();
  if (pageNum >= 3) maybeShowPushOptIn();

  const path = location.pathname;
  // S5 — Long-tail keyword pages
  checkLongTailPage();

  if      (path.includes('game.html'))     initGamePage();
  else if (path.includes('category.html')) initCategoryPage();
  else if (path.includes('404'))           handle404();
  else                                     initHomePage();
});
