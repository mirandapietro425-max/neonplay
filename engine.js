/**
 * NeonPlay v14 — engine.js | SEO REAL + ADS + SID SEGURO + LANDING PAGES
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

/**
 * GAMEPIX_SID — seu Publisher ID do GamePix.
 * Obtenha em: https://partners.gamepix.com → Publisher → Dashboard
 * NUNCA exponha via sessionStorage, localStorage ou input de usuário.
 * Este valor é compilado no bundle — use variável de ambiente no CI se possível.
 */
const GAMEPIX_SID = 'SEU_SID_AQUI'; // ← ÚNICA linha que você edita

const NP_CONFIG = {
  // ─── PROVIDERS — lidos em runtime via GAMEPIX_SID ────────────
  providers: {
    gamepix: {
      // sid lido de GAMEPIX_SID — nunca sobrescrever aqui
      get sid() { return GAMEPIX_SID && GAMEPIX_SID !== 'SEU_SID_AQUI' ? GAMEPIX_SID : ''; },
      enabled: true,
      baseUrl: 'https://www.gamepix.com/play/',
      thumbUrl: 'https://img.gamepix.com/games/{slug}/cover/{slug}.png?w=512&ar=4:3',
    },
    gamemonetize: {
      enabled: false,    // ativar quando tiver IDs GameMonetize reais
      baseUrl: 'https://html5.gamemonetize.co/',
      thumbUrl: 'https://img.gamemonetize.com/{id}/512x384.jpg',
    },
    gamedistribution: {
      enabled: false,
      baseUrl: 'https://html5.gamedistribution.com/',
    },
  },

  // ─── ADSENSE ─────────────────────────────────────────────────
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
  const ids   = Recent.get().slice(0, 6);
  const games = ids.map(id => GAMES_DB.find(g => g.id === id)).filter(Boolean);
  const section = document.getElementById('continueSection');

  // M5: injeta último jogo jogado no topo se não estiver nos recentes
  const lastGame = typeof getLastGame === 'function' ? getLastGame() : null;
  if (lastGame && !ids.includes(lastGame.id)) games.unshift(lastGame);

  if (!games.length) { if (section) section.style.display = 'none'; return; }
  if (section) section.style.display = '';
  el.innerHTML = games.slice(0, 6).map(g => createCard(g, { badge: 'continue' })).join('');
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
        if (wrap)  { wrap.style.display = 'block'; launchGameResilient(game); }
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

  // M2/M7: Para rastreamento de engagement ao sair da página
  window.addEventListener('beforeunload', () => EngagementSystem.stop(), { once: true });

  document.getElementById('restartBtn')?.addEventListener('click', () => launchGameResilient(window._currentGame || game));
  document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    const iframe = document.getElementById('gameFrame');
    if (iframe?.requestFullscreen)       iframe.requestFullscreen();
    else if (iframe?.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
  });

  // S9 — Internal links (SEO-optimized: related, tags, top, newest)
  renderGameInternalLinks(game);

  const nextGameEl = document.getElementById('nextGamePanel');
  if (nextGameEl) {
    // M5: usa getRecommendedGames (v4 — baseado em engagement + histórico)
    const candidates = getRecommendedGames(game, 4);
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

// ═══════════════════════════════════════════════════════════════
// PLAYER ROBUSTO — v9 com diagnóstico, SID, fallback e retry
// ═══════════════════════════════════════════════════════════════

const GAME_LOAD_TIMEOUT_MS = 14000; // 14s — GamePix pode demorar em mobile

// ═══════════════════════════════════════════════════════════════
// PLAYER — buildGameUrl() CENTRAL
// Sempre lê NP_CONFIG.providers em runtime — nunca hardcoded
// ═══════════════════════════════════════════════════════════════

/**
 * buildGameUrl(game)
 * Constrói a URL final do jogo a partir do objeto game ou de um slug+provider.
 * Lê o SID em runtime de NP_CONFIG — mudando a config atualiza todos os jogos.
 */
function buildGameUrl(game) {
  if (!game) return '';
  const provider = game.provider || 'gamepix';
  const cfg = NP_CONFIG.providers?.[provider];

  if (provider === 'gamepix') {
    const slug = game.slug || game.id;
    const sid  = cfg?.sid || '';
    return sid
      ? `https://www.gamepix.com/play/${slug}/?sdk=1&sid=${sid}`
      : `https://www.gamepix.com/play/${slug}/?sdk=1`;
  }

  if (provider === 'gamemonetize') {
    const id = game.gmId || game.id;
    return `https://html5.gamemonetize.co/${id}/`;
  }

  if (provider === 'gamedistribution') {
    const id = game.gdId || game.id;
    return `https://html5.gamedistribution.com/${id}/`;
  }

  // Fallback: usa a src que já está no objeto
  return game.src || '';
}

/**
 * buildThumbUrl(game)
 * Constrói a URL do thumbnail a partir do provider.
 */
function buildThumbUrl(game) {
  if (game.thumb) return game.thumb; // já definido no data
  const provider = game.provider || 'gamepix';
  const slug = game.slug || game.id;
  if (provider === 'gamepix') {
    return `https://img.gamepix.com/games/${slug}/cover/${slug}.png?w=512&ar=4:3`;
  }
  if (provider === 'gamemonetize') {
    return `https://img.gamemonetize.com/${game.gmId || game.id}/512x384.jpg`;
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════
// NP_Diagnostics — validação e relatório do catálogo
// ═══════════════════════════════════════════════════════════════

const NP_Diagnostics = {

  /**
   * validateAll(download?)
   * Cole no console do browser para ver relatório completo.
   * validateAll(true) → gera download JSON do relatório.
   * Retorna { ok, broken, noSid, report }
   */
  validateAll(download = false) {
    const gpSid    = NP_CONFIG.providers?.gamepix?.sid;
    const results  = { ok: [], broken: [], noSid: [], unknownProvider: [] };

    GAMES_DB.forEach(g => {
      const url = buildGameUrl(g);
      if (!url) { results.broken.push({ id: g.id, name: g.namePT, reason: 'sem URL' }); return; }

      try { new URL(url); } catch {
        results.broken.push({ id: g.id, name: g.namePT, url, reason: 'URL malformada' });
        return;
      }

      if ((g.provider === 'gamepix' || !g.provider) && !gpSid) {
        results.noSid.push({ id: g.id, slug: g.slug || g.id, name: g.namePT });
        return;
      }

      const p = g.provider || 'gamepix';
      if (!NP_CONFIG.providers?.[p]) {
        results.unknownProvider.push({ id: g.id, provider: p });
        return;
      }

      results.ok.push(g.id);
    });

    const total = GAMES_DB.length;
    const report = {
      ts: new Date().toISOString(),
      version: 'NeonPlay v13',
      sid_configured: !!gpSid,
      total,
      ok:        results.ok.length,
      no_sid:    results.noSid.length,
      broken:    results.broken.length,
      unknown_provider: results.unknownProvider.length,
      details: results,
    };

    console.group('%c🎮 NeonPlay v13 — Diagnóstico de Jogos', 'color:#00eeff;font-weight:bold;font-size:14px');
    console.log(`📊 Total: ${total} | ✅ OK: ${results.ok.length} | ⚠️  Sem SID: ${results.noSid.length} | ❌ Quebrado: ${results.broken.length}`);
    if (!gpSid) {
      console.error('%c⚠️  SID não configurado!', 'color:#ff4444;font-size:13px;font-weight:bold');
      console.error('→ NP_CONFIG.providers.gamepix.sid = "seu-sid"');
      console.error('→ Cadastro: https://partners.gamepix.com');
    } else {
      console.log('🔑 SID ativo:', gpSid.slice(0,4) + '***' + gpSid.slice(-3));
    }
    if (results.broken.length) console.error('❌ URLs quebradas:', results.broken);
    if (results.noSid.length)  console.warn('⚠️  Sem SID:', results.noSid.map(g=>g.slug));
    if (results.unknownProvider.length) console.warn('❓ Provider desconhecido:', results.unknownProvider);
    console.groupEnd();

    if (download) {
      try {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `neonplay-diagnostics-${Date.now()}.json`;
        a.click();
        console.log('📥 Relatório baixado!');
      } catch (e) { console.warn('Download falhou:', e); }
    }

    return report;
  },

  /**
   * testGame(idOrSlug)
   * Testa um jogo específico e imprime tudo sobre ele.
   */
  testGame(idOrSlug) {
    const game = GAMES_DB.find(g => g.id === idOrSlug || g.slug === idOrSlug);
    if (!game) { console.error('Jogo não encontrado:', idOrSlug); return; }
    const url = buildGameUrl(game);
    console.group(`%c🎮 Diagnóstico: ${game.namePT}`, 'color:#00eeff;font-weight:bold');
    console.log('ID:',       game.id);
    console.log('Slug:',     game.slug || game.id);
    console.log('Provider:', game.provider || 'gamepix (padrão)');
    console.log('URL final:', url);
    console.log('Thumb:',     buildThumbUrl(game));
    const ccEntry = ConfidenceCache.get(game.id);
    console.log('Confidence:', ccEntry
      ? `${ccEntry.confidence} (${ccEntry.level}) — ✅${ccEntry.successCount} ❌${ccEntry.failCount}`
      : '(sem entrada)');
    console.log('Score:',     scoreGame(game));
    console.log('SID ativo:', NP_CONFIG.providers?.gamepix?.sid || '❌ vazio');
    console.groupEnd();
    const _cc = ConfidenceCache.get(game.id);
    return { game, url, score: scoreGame(game), confidence: _cc?.confidence ?? null, level: _cc?.level ?? null };
  },

  /**
   * listByProvider()
   * Mostra quantos jogos há por provider.
   */
  listByProvider() {
    const count = {};
    GAMES_DB.forEach(g => {
      const p = g.provider || 'gamepix';
      count[p] = (count[p] || 0) + 1;
    });
    console.table(count);
    return count;
  },

  /**
   * probeAll(limit)
   * Testa jogos reais via iframe e popula o cache de verificação.
   * Use APÓS configurar o SID.
   * Ex: NP_Diagnostics.probeAll(20)
   */
  /**
   * probeAll(n) — testa N jogos via iframe e popula o cache.
   * Retorna { good, maybe, bad } após concluir.
   * Ex: NP_Diagnostics.probeAll(20)
   */
  async probeAll(limit = 20) {
    const games = GAMES_DB
      .filter(g => ConfidenceCache.getConfidence(g.id) === null)
      .slice(0, limit);
    if (!games.length) {
      console.log('✅ Todos os jogos já têm entrada no cache. Use NP_Diagnostics.clearCache() para re-testar.');
      return { high: 0, medium: 0, low: 0 };
    }
    console.group(
      `%c🔍 Probe de ${games.length} jogos (≈${Math.ceil(games.length * 10 / 60)}min)`,
      'color:#00eeff;font-weight:bold'
    );
    const res = { high: [], medium: [], low: [] };
    for (const g of games) {
      const url = buildGameUrl(g);
      if (!url) { res.low.push(g.id); ConfidenceCache.record(g.id, 0, ['no-url']); continue; }
      const { confidence, loadMs, signals } = await ProbeSystem.probe(url, { hardMs: 9000 });
      ConfidenceCache.record(g.id, confidence, signals);
      const lvl = ProbeSystem.classify(confidence);
      if (lvl === 'HIGH')   { res.high.push(g.id);   console.log(`%c✅ HIGH   (${confidence}) ${g.namePT} [${loadMs}ms]`, 'color:#00ff88'); }
      if (lvl === 'MEDIUM') { res.medium.push(g.id); console.warn(`⚠️ MEDIUM (${confidence}) ${g.namePT} [${loadMs}ms]`); }
      if (lvl === 'LOW')    { res.low.push(g.id);    console.error(`❌ LOW    (${confidence}) ${g.namePT} [${signals.join(',')}]`); }
      await new Promise(r => setTimeout(r, 1200 + Math.round(Math.random() * 800)));
    }
    console.log(`\n📊 HIGH: ${res.high.length} | MEDIUM: ${res.medium.length} | LOW: ${res.low.length}`);
    console.groupEnd();
    return res;
  },

  /** Stats do ConfidenceCache (high/medium/low/total) */
  cacheStats() { return ConfidenceCache.stats(); },
  /** Health report: taxa de sucesso, fallback, jogos problemáticos */
  health() {
    ResilienceTelemetry.getSystemHealth();
    const engaging = ResilienceTelemetry.getTopEngagingGames(5);
    const worst    = ResilienceTelemetry.getWorstGames(5);
    if (engaging.length) { console.log('🏆 Top Engaging Games:'); console.table(engaging.map(v=>({id:v.id,name:v.game?.namePT,avgSecs:v.avgSecs,sessions:v.sessions}))); }
    if (worst.length)    { console.log('⚠️  Worst Bounce Games:'); console.table(worst.map(v=>({id:v.id,name:v.game?.namePT,bounceRate:v.bounceRate,sessions:v.sessions}))); }
    return { engaging, worst };
  },

  // v4: engagement + recommendations
  topEngaging(n = 10) { return ResilienceTelemetry.getTopEngagingGames(n); },
  worstBounce(n = 10) { return ResilienceTelemetry.getWorstGames(n); },
  engagement(id)      { return ConfidenceCache.getEngagementScore(id); },
  recommend(gameId, n = 8) {
    const game = GAMES_DB.find(g => g.id === gameId);
    if (!game) { console.error('Game not found:', gameId); return []; }
    return getRecommendedGames(game, n).map(g => ({ id: g.id, name: g.namePT, score: scoreGame(g) }));
  },
  globalLayer()       { return GlobalConfidenceLayer.prepareForBackend(); },
  /** Exporta telemetria para backend futuro (M6) */
  exportTelemetry() { return ResilienceTelemetry.exportForBackend(); },
  /** Exporta ConfidenceCache para sync CDN futuro (M6) */
  exportCache() { return ConfidenceCache.exportForSync(); },

  /** Limpa ConfidenceCache — força re-probe no próximo carregamento */
  clearCache() { ConfidenceCache.clear(); },
  /** Limpa telemetria local */
  clearTelemetry() { ResilienceTelemetry.clear(); },
};

// Expõe globalmente para uso fácil no console do browser
if (typeof window !== 'undefined') {
  window.NP_Diagnostics = NP_Diagnostics;
  window.buildGameUrl   = buildGameUrl;
  window.buildThumbUrl  = buildThumbUrl;
}


// ═══════════════════════════════════════════════════════════════════
// RESILIENCE MODULE v4 — NeonPlay v12
//
// M1: GlobalConfidenceLayer + mergeConfidence (hybrid 60/40)
// M2: EngagementSystem — playTime real, bounce penalty, engagementScore
// M3: scoreGame v4 — data-driven com confidence + engagement + telemetria
// M4: shouldSkipGame — sistema preditivo (evita load inútil)
// M5: getRecommendedGames — recomendação dinâmica por histórico
// M6: Telemetria avançada — getTopEngagingGames, getWorstGames
// M7: Zero memory leaks — timers limpos, listeners removidos
// ═══════════════════════════════════════════════════════════════════

// ── M1: ProbeSystem v3 — confidenceScore 0-100 ───────────────────

const ProbeSystem = (() => {

  function _msToConfidence(ms, base) {
    if (ms < 1500) return base + 30;
    if (ms < 3000) return base + 20;
    if (ms < 5000) return base + 10;
    return base;
  }

  function probe(url, opts = {}) {
    const hardMs = opts.hardMs || 9000;
    return new Promise(resolve => {
      if (!url) { resolve({ confidence: 0, loadMs: null, signals: ['no-url'] }); return; }

      const t0     = Date.now();
      const iframe = document.createElement('iframe');
      iframe.style.cssText =
        'position:fixed;width:2px;height:2px;opacity:0.001;' +
        'pointer-events:none;top:-9999px;left:-9999px;border:none;z-index:-1';
      iframe.setAttribute('sandbox',
        'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-orientation-lock');

      let done = false;
      const signals = [];

      function finish(confidence) {
        if (done) return;
        done = true;
        clearTimeout(hardTimer);
        window.removeEventListener('message', msgHandler);
        try { document.body.removeChild(iframe); } catch {}
        resolve({ confidence: Math.max(0, Math.min(100, confidence)), loadMs: Date.now() - t0, signals });
      }

      const hardTimer = setTimeout(() => { signals.push('hard-timeout'); finish(0); }, hardMs);

      const msgHandler = (e) => {
        if (e.source !== iframe.contentWindow) return;
        window.removeEventListener('message', msgHandler);
        signals.push('postmessage');
        finish(_msToConfidence(Date.now() - t0, 65));
      };
      window.addEventListener('message', msgHandler);

      iframe.onload = () => {
        const ms = Date.now() - t0;
        signals.push(`onload@${ms}ms`);
        let hasContent = false;
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          hasContent = (doc?.body?.innerHTML?.length || 0) > 100 || (doc?.title || '').length > 0;
          if (hasContent) signals.push('content-detected');
        } catch { signals.push('cross-origin-ok'); hasContent = true; }
        if (!hasContent) { signals.push('empty-body'); setTimeout(() => { if (!done) finish(25); }, 1500); return; }
        const conf = _msToConfidence(ms, 45);
        setTimeout(() => { if (!done) finish(conf); }, 800);
      };

      iframe.onerror = () => { signals.push('onerror'); finish(0); };
      iframe.src = url;
      document.body.appendChild(iframe);
    });
  }

  function classify(score) {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  return { probe, classify };
})();

// ── M1: ConfidenceCache v4 — histórico rico + engagementScore ─────

const ConfidenceCache = (() => {
  const KEY      = 'np_cc_v1';
  const MAX_SIZE = 200;

  function _ttl(confidence) {
    if (confidence >= 70) return 7 * 24 * 3600 * 1000;
    if (confidence >= 40) return 1 * 24 * 3600 * 1000;
    return 6 * 3600 * 1000;
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }

  function save(data) {
    try {
      const entries = Object.entries(data);
      if (entries.length > MAX_SIZE) {
        entries.sort((a, b) => (a[1].lastCheck || 0) - (b[1].lastCheck || 0));
        data = Object.fromEntries(entries.slice(entries.length - MAX_SIZE));
      }
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch { try { localStorage.removeItem(KEY); } catch {} }
  }

  return {
    record(id, confidence, signals = []) {
      const data = load();
      const prev = data[id] || { successCount: 0, failCount: 0, confidence: null, totalPlayTime: 0, sessions: 0 };
      const isSuccess = confidence >= 40;
      data[id] = {
        confidence,
        level:         ProbeSystem.classify(confidence),
        lastCheck:     Date.now(),
        successCount:  prev.successCount + (isSuccess ? 1 : 0),
        failCount:     prev.failCount    + (isSuccess ? 0 : 1),
        signals:       signals.slice(-3),
        totalPlayTime: prev.totalPlayTime || 0,
        sessions:      prev.sessions || 0,
        avgPlayTime:   prev.avgPlayTime || 0,
      };
      save(data);
      return data[id];
    },

    // M2: Registra sessão de jogo com tempo real
    recordSession(id, playTimeMs) {
      const data = load();
      const prev = data[id];
      const secs = Math.round(playTimeMs / 1000);

      if (!prev) { this.record(id, 75, ['user-played']); return; }

      const sessions      = (prev.sessions || 0) + 1;
      const totalPlayTime = (prev.totalPlayTime || 0) + secs;
      const avgPlayTime   = Math.round(totalPlayTime / sessions);

      let confidenceDelta = 0;
      if (secs < 5)        confidenceDelta = -10;
      else if (secs < 30)  confidenceDelta = 0;
      else if (secs < 60)  confidenceDelta = 5;
      else if (secs < 180) confidenceDelta = 12;
      else                 confidenceDelta = 18;

      const boosted = Math.min(100, Math.max(0, (prev.confidence || 50) + confidenceDelta));

      data[id] = {
        ...prev,
        confidence:    boosted,
        level:         ProbeSystem.classify(boosted),
        sessions,
        totalPlayTime,
        avgPlayTime,
        lastCheck:     Date.now(),
        successCount:  (prev.successCount || 0) + (secs >= 5 ? 1 : 0),
      };
      save(data);
    },

    recordPlay(id) {
      const data = load();
      const prev = data[id];
      if (!prev) { this.record(id, 75, ['user-played']); return; }
      const boosted = Math.min(100, (prev.confidence || 50) + 15);
      data[id] = { ...prev, confidence: boosted, level: ProbeSystem.classify(boosted),
                   successCount: (prev.successCount || 0) + 1, lastCheck: Date.now() };
      save(data);
    },

    get(id) {
      const data  = load();
      const entry = data[id];
      if (!entry) return null;
      if (Date.now() - entry.lastCheck > _ttl(entry.confidence || 0)) {
        delete data[id]; save(data); return null;
      }
      return entry;
    },

    getConfidence(id) { return this.get(id)?.confidence ?? null; },
    getLevel(id)      { return this.get(id)?.level ?? null; },
    isUsable(id)      { const c = this.getConfidence(id); return c !== null && c >= 40; },
    isHigh(id)        { return (this.getConfidence(id) || 0) >= 70; },
    isLow(id)         { const c = this.getConfidence(id); return c !== null && c < 40; },

    // M2: engagementScore 0-100 baseado em avgPlayTime + sessions
    getEngagementScore(id) {
      const e = this.get(id);
      if (!e) return 0;
      const avg  = e.avgPlayTime || 0;
      const sess = e.sessions    || 0;
      const timePts = Math.min(60, Math.round(Math.sqrt(avg) * 5.5));
      const sessPts = Math.min(30, Math.round(Math.log2(sess + 1) * 10));
      const total   = (e.successCount || 0) + (e.failCount || 0);
      const ratePts = total ? Math.round((e.successCount / total) * 10) : 5;
      return Math.min(100, timePts + sessPts + ratePts);
    },

    stats() {
      const data  = load();
      const items = Object.values(data);
      const high   = items.filter(v => (v.confidence || 0) >= 70).length;
      const medium = items.filter(v => (v.confidence || 0) >= 40 && (v.confidence || 0) < 70).length;
      const low    = items.filter(v => (v.confidence || 0) < 40).length;
      console.log(`📦 ConfidenceCache v4 (${items.length}/${MAX_SIZE}):\n  🟢 HIGH   (≥70): ${high}\n  🟡 MEDIUM (40-69): ${medium}\n  🔴 LOW    (<40): ${low}`);
      return { high, medium, low, total: items.length, max: MAX_SIZE };
    },

    clear()    { localStorage.removeItem(KEY); console.log('🗑️ ConfidenceCache limpo.'); },
    listHigh() {
      const data = load();
      return Object.entries(data)
        .filter(([,v]) => (v.confidence || 0) >= 70)
        .sort((a, b) => (b[1].confidence || 0) - (a[1].confidence || 0))
        .map(([id]) => id);
    },

    exportForSync() {
      const data = load();
      return { version: 'np_cc_v1', exportedAt: Date.now(), entries: data,
               _meta: { note: 'ready for Cloudflare KV or backend sync' } };
    }
  };
})();

// ── M1: GlobalConfidenceLayer — cache global simulado localmente ──

const GlobalConfidenceLayer = (() => {
  const KEY = 'np_gcl_v1';

  function _loadGlobal() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function _saveGlobal(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  return {
    syncFromLocal() {
      const local  = ConfidenceCache.exportForSync().entries;
      const global = _loadGlobal();
      Object.entries(local).forEach(([id, entry]) => {
        const prev    = global[id] || { successRate: 0.5, avgPlayTime: 0, fallbackRate: 0, samples: 0 };
        const total   = (entry.successCount || 0) + (entry.failCount || 0);
        const sRate   = total ? (entry.successCount || 0) / total : 0.5;
        const samples = prev.samples + 1;
        global[id] = {
          globalConfidence: Math.round(((prev.globalConfidence || 50) * prev.samples + (entry.confidence || 50)) / samples),
          successRate:      +((prev.successRate * prev.samples + sRate) / samples).toFixed(3),
          avgPlayTime:      Math.round(((prev.avgPlayTime || 0) * prev.samples + (entry.avgPlayTime || 0)) / samples),
          fallbackRate:     prev.fallbackRate || 0,
          lastSync:         Date.now(),
          samples,
        };
      });
      _saveGlobal(global);
    },

    get(id) { return _loadGlobal()[id] || null; },

    // M1: mergeConfidence — 60% local, 40% global
    mergeConfidence(id) {
      const local  = ConfidenceCache.getConfidence(id);
      const global = this.get(id);
      if (local === null && !global) return null;
      const lc = local ?? 50;
      const gc = global ? global.globalConfidence : lc;
      return Math.round(lc * 0.6 + gc * 0.4);
    },

    getFinal(id) { return this.mergeConfidence(id); },

    prepareForBackend() {
      const local = ConfidenceCache.exportForSync();
      const tel   = ResilienceTelemetry.exportForBackend();
      return {
        schema:      'neonplay_v12',
        portal:      'neonplay.com.br',
        exportedAt:  Date.now(),
        confidence:  local.entries,
        telemetry:   tel.summary,
        globalLayer: _loadGlobal(),
        _endpoint:   null,
        _meta: { note: 'ready for Cloudflare KV, Supabase, or custom backend' }
      };
    },

    clear() { localStorage.removeItem(KEY); }
  };
})();

// Backward-compat aliases
const GameVerificationCache = {
  mark(id, status) {
    const conf = status === 'good' ? 80 : status === 'maybe' ? 50 : 10;
    ConfidenceCache.record(id, conf, [status]);
  },
  get(id)      { const lvl = ConfidenceCache.getLevel(id); if (!lvl) return null; return lvl === 'HIGH' ? 'good' : lvl === 'MEDIUM' ? 'maybe' : 'bad'; },
  isGood(id)   { return ConfidenceCache.isHigh(id); },
  isMaybe(id)  { return ConfidenceCache.getLevel(id) === 'MEDIUM'; },
  isBad(id)    { return ConfidenceCache.isLow(id); },
  isUsable(id) { return ConfidenceCache.isUsable(id); },
  stats()      { return ConfidenceCache.stats(); },
  clear()      { ConfidenceCache.clear(); },
  listGood()   { return ConfidenceCache.listHigh(); },
};

// ── M2: EngagementSystem — timer de play real ─────────────────────

const EngagementSystem = (() => {
  let _currentId   = null;
  let _startTs     = null;
  let _idleTimer   = null;
  let _idleHandler = null;
  const IDLE_THRESHOLD_MS = 90000;

  function _clearIdle() {
    if (_idleTimer)   { clearTimeout(_idleTimer); _idleTimer = null; }
    if (_idleHandler) { document.removeEventListener('visibilitychange', _idleHandler); _idleHandler = null; }
  }

  return {
    start(gameId) {
      this.stop();
      _currentId = gameId;
      _startTs   = Date.now();

      _idleHandler = () => { if (document.visibilityState === 'hidden') this.stop(); };
      document.addEventListener('visibilitychange', _idleHandler);

      _idleTimer = setTimeout(() => {
        if (_currentId === gameId) {
          ResilienceTelemetry.idleDetected(gameId);
          this._suggestNext(gameId);
        }
      }, IDLE_THRESHOLD_MS);
    },

    stop() {
      _clearIdle();
      if (!_currentId || !_startTs) return;
      const playTimeMs = Date.now() - _startTs;
      const id = _currentId;
      _currentId = null;
      _startTs   = null;
      ConfidenceCache.recordSession(id, playTimeMs);
      ResilienceTelemetry.playSession(id, Math.round(playTimeMs / 1000));
      try { GlobalConfidenceLayer.syncFromLocal(); } catch {}
    },

    _suggestNext(gameId) {
      const el = document.getElementById('nextGamePanel');
      if (!el || el.dataset.shown) return;
      const game  = GAMES_DB.find(g => g.id === gameId);
      const nexts = getRecommendedGames(game, 1);
      if (!nexts.length) return;
      el.dataset.shown = '1';
      el.innerHTML = createNextGameCard(nexts[0]);
      el.style.display = 'block';
    },

    getCurrent()          { return _currentId; },
    getCurrentPlaySecs()  { return _startTs ? Math.round((Date.now() - _startTs) / 1000) : 0; }
  };
})();

// ── M4: ResilienceTelemetry v4 ────────────────────────────────────

const ResilienceTelemetry = (() => {
  const KEY        = 'np_tel_v1';
  const MAX_EVENTS = 500;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { events: [], summary: {} }; }
    catch { return { events: [], summary: {} }; }
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }

  function record(type, data = {}) {
    const d = load();
    d.events.push({ type, ts: Date.now(), ...data });
    if (d.events.length > MAX_EVENTS) d.events = d.events.slice(-MAX_EVENTS);
    d.summary[type] = (d.summary[type] || 0) + 1;
    save(d);
  }

  return {
    loadAttempt(gameId)           { record('load_attempt',  { gameId }); },
    loadSuccess(gameId, ms)       { record('load_success',  { gameId, ms }); },
    loadFail(gameId, reason)      { record('load_fail',     { gameId, reason }); },
    fallbackUsed(from, to)        { record('fallback',      { from, to }); },
    userInteraction(gameId, type) { record('interaction',   { gameId, type }); },
    warmupDone(checked, ok)       { record('warmup',        { checked, ok }); },
    playSession(gameId, secs)     { record('play_session',  { gameId, secs }); },
    idleDetected(gameId)          { record('idle_detected', { gameId }); },

    getSystemHealth() {
      const d         = load();
      const evts      = d.events;
      const attempts  = evts.filter(e => e.type === 'load_attempt');
      const successes = evts.filter(e => e.type === 'load_success');
      const fails     = evts.filter(e => e.type === 'load_fail');
      const fallbacks = evts.filter(e => e.type === 'fallback');
      const successRate  = attempts.length ? (successes.length / attempts.length * 100).toFixed(1) : 'N/A';
      const fallbackRate = attempts.length ? (fallbacks.length / attempts.length * 100).toFixed(1) : 'N/A';
      const failCount = {};
      fails.forEach(e => { if (e.gameId) failCount[e.gameId] = (failCount[e.gameId] || 0) + 1; });
      const problematic = Object.entries(failCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,n])=>({id,fails:n}));
      const loadTimes = successes.filter(e => e.ms).map(e => e.ms);
      const avgLoad   = loadTimes.length ? Math.round(loadTimes.reduce((a,b)=>a+b,0)/loadTimes.length) : null;
      const health = {
        successRate: `${successRate}%`, fallbackRate: `${fallbackRate}%`,
        totalAttempts: attempts.length, avgLoadMs: avgLoad, problematic,
        summary: d.summary, events: evts.length, maxEvents: MAX_EVENTS, _syncReady: true, _endpoint: null,
      };
      console.group('%c🩺 NeonPlay v12 — System Health', 'color:#00eeff;font-weight:bold;font-size:13px');
      console.log(`✅ Taxa de sucesso:  ${health.successRate}`);
      console.log(`🔄 Taxa de fallback: ${health.fallbackRate}`);
      console.log(`📊 Total tentativas: ${health.totalAttempts}`);
      if (avgLoad) console.log(`⚡ Tempo médio load: ${avgLoad}ms`);
      if (problematic.length) { console.warn('⚠️ Jogos problemáticos:'); console.table(problematic); }
      console.groupEnd();
      return health;
    },

    // M6: ranking por retenção real
    getTopEngagingGames(n = 10) {
      const d        = load();
      const sessions = d.events.filter(e => e.type === 'play_session');
      const acc = {};
      sessions.forEach(e => {
        if (!e.gameId) return;
        if (!acc[e.gameId]) acc[e.gameId] = { totalSecs: 0, count: 0 };
        acc[e.gameId].totalSecs += (e.secs || 0);
        acc[e.gameId].count++;
      });
      return Object.entries(acc)
        .map(([id, v]) => ({ id, avgSecs: Math.round(v.totalSecs / v.count), sessions: v.count, game: GAMES_DB.find(g => g.id === id) }))
        .filter(v => v.game)
        .sort((a, b) => b.avgSecs - a.avgSecs)
        .slice(0, n);
    },

    // M6: jogos com maior bounce
    getWorstGames(n = 10) {
      const d        = load();
      const sessions = d.events.filter(e => e.type === 'play_session');
      const acc = {};
      sessions.forEach(e => {
        if (!e.gameId) return;
        if (!acc[e.gameId]) acc[e.gameId] = { bounces: 0, total: 0 };
        acc[e.gameId].total++;
        if ((e.secs || 0) < 5) acc[e.gameId].bounces++;
      });
      return Object.entries(acc)
        .filter(([, v]) => v.total >= 2)
        .map(([id, v]) => ({ id, bounceRate: +(v.bounces / v.total).toFixed(2), sessions: v.total, game: GAMES_DB.find(g => g.id === id) }))
        .filter(v => v.game)
        .sort((a, b) => b.bounceRate - a.bounceRate)
        .slice(0, n);
    },

    exportForBackend() {
      const d = load();
      return { portal: 'neonplay', version: 'np_tel_v1', exportedAt: Date.now(), ...d,
               _meta: { note: 'ready for /v1/telemetry endpoint or Cloudflare KV' } };
    },

    clear() { localStorage.removeItem(KEY); console.log('🗑️ Telemetria limpa.'); }
  };
})();

// ── M4: probeUrl (compat wrapper) ─────────────────────────────────

async function probeUrl(url, opts = {}) {
  const result = await ProbeSystem.probe(url, { hardMs: opts.timeoutMs || opts.hardMs || 9000 });
  const lvl = ProbeSystem.classify(result.confidence);
  return lvl === 'HIGH' ? 'good' : lvl === 'MEDIUM' ? 'maybe' : 'bad';
}

// ── M3: scoreGame v4 — data-driven ───────────────────────────────

function scoreGame(game) {
  if (!game) return 0;

  const entry           = ConfidenceCache.get(game.id);
  const finalConfidence = GlobalConfidenceLayer.getFinal(game.id) ?? (entry?.confidence ?? null);
  const engagementScore = ConfidenceCache.getEngagementScore(game.id);

  // M4: eliminação preditiva
  if (finalConfidence !== null && finalConfidence < 30) {
    if ((entry?.failCount || 0) >= 2) return 0;
  }

  let base = 0;

  // finalConfidence 0–45pts
  if (finalConfidence !== null) {
    base += Math.round((finalConfidence / 100) * 45);
    if (entry) {
      const total = (entry.successCount || 0) + (entry.failCount || 0);
      if (total > 0) base += Math.round((entry.successCount / total) * 8);
    }
  } else {
    base += 22; // desconhecido → neutro
  }

  // engagementScore 0–20pts
  base += Math.round((engagementScore / 100) * 20);

  // Popularidade log — 0–18pts
  const plays = game.plays || 0;
  base += plays > 0 ? Math.min(18, Math.round(Math.log10(plays + 1) * 3)) : 0;

  // Rating 0–8pts
  base += Math.round(((game.rating || 3) / 5) * 8);

  // Thumb +2
  if (game.thumb) base += 2;

  // Badge
  if (game.badge === 'new') base += 7;
  else if (game.badge === 'hot') base += 5;
  else if (game.badge === 'top') base += 4;

  // Fallbacks configurados +2
  if (game.fallbacks?.length) base += 2;

  // explorationBoost determinístico por jogo/dia
  const dayKey             = Math.floor(Date.now() / 86400000);
  const idHash             = [...(game.id || '')].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, dayKey);
  const randFactor         = (Math.abs(idHash) % 1000) / 1000;
  const explorationCeiling = plays < 100000 ? 16 : plays < 1000000 ? 8 : 4;
  base += Math.round(randFactor * explorationCeiling);

  return Math.min(100, base);
}

// ── M4: shouldSkipGame — sistema preditivo ────────────────────────

function shouldSkipGame(game) {
  if (!game) return true;
  const entry = ConfidenceCache.get(game.id);
  if (!entry) return false;
  if (entry.confidence < 30 && (entry.failCount || 0) >= 2) return true;
  if ((entry.avgPlayTime || 0) < 3 && (entry.sessions || 0) >= 3) return true;
  return false;
}

// ── M5: SmartFallback v4 ──────────────────────────────────────────

const SmartFallback = {

  getNext(failedGame, exclude = []) {
    const excluded = new Set([...(exclude || []), failedGame?.id].filter(Boolean));
    const cat      = failedGame?.cat;

    let pool = GAMES_DB
      .filter(g => !excluded.has(g.id) && !ConfidenceCache.isLow(g.id) && !shouldSkipGame(g))
      .filter(g => g.cat === cat || !cat);

    if (!pool.length) pool = GAMES_DB.filter(g => !excluded.has(g.id) && !ConfidenceCache.isLow(g.id));
    if (!pool.length) return null;

    return pool
      .map(g => ({ g, score: scoreGame(g) }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.g || null;
  },

  buildFallbackUrl(game) {
    if (!game?.fallbacks?.length) return null;
    for (const fb of game.fallbacks) {
      const candidate = { ...game, provider: fb.provider };
      if (fb.gmId) candidate.gmId = fb.gmId;
      if (fb.gdId) candidate.gdId = fb.gdId;
      if (fb.slug) candidate.slug = fb.slug;
      const url = buildGameUrl(candidate);
      if (url && !ConfidenceCache.isLow(game.id + '_' + fb.provider)) return url;
    }
    return null;
  },

  topScored(n = 10, cat = null) {
    return GAMES_DB
      .filter(g => (!cat || g.cat === cat) && !shouldSkipGame(g))
      .map(g => ({ g, score: scoreGame(g) }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map(c => c.g);
  }
};

// ── M5: getRecommendedGames — recomendação dinâmica ───────────────

function getRecommendedGames(currentGame, n = 8) {
  const currentId  = currentGame?.id;
  const currentCat = currentGame?.cat;

  let recentIds = [];
  try { recentIds = JSON.parse(localStorage.getItem('neonplay_recent_v4') || '[]'); } catch {}

  const catCount = {};
  recentIds.forEach(id => {
    const g = GAMES_DB.find(x => x.id === id);
    if (g) catCount[g.cat] = (catCount[g.cat] || 0) + 1;
  });

  const pool = GAMES_DB.filter(g =>
    g.id !== currentId && !shouldSkipGame(g) && !ConfidenceCache.isLow(g.id)
  );

  return pool
    .map(g => {
      let s = scoreGame(g);
      if (g.cat === currentCat) s += 15;
      if (catCount[g.cat]) s += Math.min(10, catCount[g.cat] * 2);
      s += Math.round(ConfidenceCache.getEngagementScore(g.id) / 10);
      return { g, s };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(c => c.g);
}

// ── Loop Guard ─────────────────────────────────────────────────────

const _sessionAttempted = new Set();
function _guardReset() { _sessionAttempted.clear(); }

// ── M5: launchGameResilient v4 ────────────────────────────────────

const MAX_FALLBACK_DEPTH = 4;

async function launchGameResilient(game, _chain = []) {
  if (!game) return;

  // ── M1 v14: SID Gate — erro técnico, sem wizard de frontend ──
  const provider = game.provider || 'gamepix';
  if (provider === 'gamepix' && !NP_CONFIG.providers?.gamepix?.sid && _chain.length === 0) {
    const loader = document.getElementById('iframeLoader');
    const frame  = document.getElementById('gameFrame');
    if (frame) frame.src = 'about:blank';
    if (loader) {
      loader.style.display = 'flex';
      loader.innerHTML = `
        <div style="text-align:center;padding:2rem;max-width:400px">
          <div style="font-size:2rem;margin-bottom:.6rem">🔧</div>
          <p style="color:var(--text-2,#aaa);font-size:.85rem;line-height:1.6;margin:0">
            Portal em configuração.<br>
            <span style="font-size:.75rem;color:var(--text-3,#666)">Código: SID_NOT_SET</span>
          </p>
          ${game ? `<a href="category.html?cat=${game.cat}"
            style="display:inline-block;margin-top:1rem;background:rgba(0,238,255,.1);border:1px solid rgba(0,238,255,.25);color:var(--cyan,#00eeff);padding:.4rem .9rem;border-radius:8px;font-size:.78rem;text-decoration:none">
            Ver outros jogos
          </a>` : ''}
        </div>`;
    }
    console.error(
      '[NeonPlay v14] GAMEPIX_SID não configurado.\n' +
      'Edite engine.js → const GAMEPIX_SID = "seu-sid"\n' +
      'Obter SID: https://partners.gamepix.com'
    );
    return;
  }

  const depth = _chain.length;
  if (depth >= MAX_FALLBACK_DEPTH) { _showResilientError(game, _chain); return; }

  if (_sessionAttempted.has(game.id)) {
    const next = SmartFallback.getNext(game, [..._chain, game.id]);
    if (next) launchGameResilient(next, [..._chain, game.id]);
    else      _showResilientError(game, _chain);
    return;
  }

  const chain = [..._chain, game.id];
  _sessionAttempted.add(game.id);
  window._currentGame = game;

  // M2: para sessão anterior (M7: sem memory leak)
  EngagementSystem.stop();

  // M5: salva último jogo
  try { localStorage.setItem('np_last_game', JSON.stringify({ id: game.id, name: game.namePT, ts: Date.now() })); } catch {}

  const frame  = document.getElementById('gameFrame');
  const loader = document.getElementById('iframeLoader');
  if (!frame) { launchGame(game); return; }

  // M4: skip preditivo
  if (shouldSkipGame(game)) {
    ResilienceTelemetry.loadFail(game.id, 'predictive-skip');
    _tryFallback(game, chain, frame, loader);
    return;
  }

  if (ConfidenceCache.isLow(game.id)) {
    _tryFallback(game, chain, frame, loader);
    return;
  }

  const url = buildGameUrl(game);
  if (!url) {
    ConfidenceCache.record(game.id, 0, ['no-url']);
    ResilienceTelemetry.loadFail(game.id, 'no-url');
    _tryFallback(game, chain, frame, loader);
    return;
  }

  ResilienceTelemetry.loadAttempt(game.id);
  _showLoader(loader, game.namePT, depth);

  clearTimeout(frame._npTimeout);
  frame.onload  = null;
  frame.onerror = null;
  frame.src     = 'about:blank';
  await new Promise(r => setTimeout(r, 30));

  const t0 = Date.now();
  let _settled = false;

  function _settle(confidence, signals = []) {
    if (_settled) return;
    _settled = true;
    clearTimeout(frame._npTimeout);

    ConfidenceCache.record(game.id, confidence, signals);
    const level = ProbeSystem.classify(confidence);

    if (level === 'HIGH' || level === 'MEDIUM') {
      if (loader) loader.style.display = 'none';
      ResilienceTelemetry.loadSuccess(game.id, Date.now() - t0);
      NP_Analytics.gamePlay(game.id, game.namePT, game.cat);
      if (level === 'MEDIUM') _showMaybeWarning(game);

      // M2: inicia rastreamento de engagement
      EngagementSystem.start(game.id);

      const msgInteraction = () => {
        ConfidenceCache.recordPlay(game.id);
        ResilienceTelemetry.userInteraction(game.id, 'focus');
        window.removeEventListener('message', msgInteraction);
      };
      setTimeout(() => window.addEventListener('message', msgInteraction, { once: true }), 1000);

    } else {
      ResilienceTelemetry.loadFail(game.id, signals.join(','));
      _tryFallback(game, chain, frame, loader);
    }
  }

  const msgHandler = (e) => {
    if (frame.contentWindow && e.source === frame.contentWindow) {
      window.removeEventListener('message', msgHandler);
      _settle(85, ['postmessage', `${Date.now()-t0}ms`]);
    }
  };
  window.addEventListener('message', msgHandler);

  frame.onload = () => {
    const ms = Date.now() - t0;
    setTimeout(() => {
      if (!_settled) {
        window.removeEventListener('message', msgHandler);
        const conf = ms < 3000 ? 58 : ms < 6000 ? 45 : 42;
        _settle(conf, [`onload@${ms}ms`]);
      }
    }, 600);
  };

  frame.onerror = () => {
    window.removeEventListener('message', msgHandler);
    _settle(0, ['onerror']);
  };

  const timeoutMs = depth === 0 ? 9000 : 6500;
  frame._npTimeout = setTimeout(() => {
    window.removeEventListener('message', msgHandler);
    _settle(0, ['timeout']);
  }, timeoutMs);

  frame.src = url;
}

async function _tryFallback(failedGame, chain, frame, loader) {
  ResilienceTelemetry.fallbackUsed(failedGame.id, '?');

  const altUrl = SmartFallback.buildFallbackUrl(failedGame);
  if (altUrl) {
    const altGame = { ...failedGame, id: failedGame.id + '_alt', src: altUrl, provider: '_alt' };
    launchGameResilient(altGame, chain);
    return;
  }

  _showSearching(loader);
  await new Promise(r => setTimeout(r, 400));

  const next = SmartFallback.getNext(failedGame, chain);
  if (next) {
    ResilienceTelemetry.fallbackUsed(failedGame.id, next.id);
    if (chain.length > 1) showToast(`🔄 Carregando ${next.namePT}…`);
    launchGameResilient(next, chain);
  } else {
    _showResilientError(failedGame, chain);
  }
}

// ── UI helpers ────────────────────────────────────────────────────

function _showLoader(loader, name, depth) {
  if (!loader) return;
  const msgs = ['Carregando', 'Preparando', 'Abrindo', 'Um momento…'];
  loader.style.display = 'flex';
  loader.innerHTML = `
    <div style="text-align:center;padding:1rem">
      <div style="width:44px;height:44px;margin:0 auto 1rem;border:3px solid rgba(0,238,255,.2);
        border-top-color:var(--cyan,#00eeff);border-radius:50%;animation:spin 1s linear infinite"></div>
      <p style="color:var(--text-2,#aaa);font-size:.9rem;margin:0">
        ${msgs[Math.min(depth, msgs.length-1)]} <strong style="color:var(--cyan,#00eeff)">${name}</strong>…
      </p>
      ${depth > 0 ? `<p style="font-size:.72rem;color:var(--text-3,#666);margin:.25rem 0 0">opção ${depth + 1}</p>` : ''}
    </div>`;
}

function _showSearching(loader) {
  if (!loader) return;
  loader.style.display = 'flex';
  loader.innerHTML = `
    <div style="text-align:center;padding:1.5rem">
      <div style="font-size:1.8rem;margin-bottom:.4rem">🔍</div>
      <p style="color:var(--text-2,#aaa);font-size:.82rem;margin:0">Buscando outro jogo…</p>
    </div>`;
}

function _showMaybeWarning(game) {
  if (!NP_CONFIG.providers?.gamepix?.sid) {
    showToast('⚠️ SID não configurado — adicione em engine.js → NP_CONFIG.providers.gamepix.sid', 5000);
  }
}

// ── SID WIZARD — mostra tela de configuração se SID estiver vazio ─
// _showSidWizard removida na v14 — SID fixo em GAMEPIX_SID


// _applySidFromWizard removida na v14


// _restoreSessionSid removida na v14 — SID fixo em GAMEPIX_SID
;

if (typeof window !== 'undefined') {
  window._applySidFromWizard = _applySidFromWizard;
  window._showSidWizard      = _showSidWizard;
}

function _showResilientError(game, chain) {
  const suggestions = SmartFallback.topScored(5, game?.cat).filter(g => !chain.includes(g.id)).slice(0, 4);
  const suggestHTML = suggestions.length
    ? `<div style="margin-top:1.1rem">
        <p style="font-size:.78rem;color:var(--text-3,#666);margin-bottom:.5rem">Você pode gostar:</p>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center">
          ${suggestions.map(g => `<a href="game.html?id=${g.id}" onclick="_guardReset()"
            style="background:rgba(0,238,255,.07);border:1px solid rgba(0,238,255,.18);
                   color:var(--cyan,#00eeff);padding:.3rem .7rem;border-radius:18px;
                   font-size:.76rem;text-decoration:none;white-space:nowrap">
            ${getCategoryData(g.cat)?.emoji||'🎮'} ${g.namePT}</a>`).join('')}
        </div>
      </div>` : '';

  const catLink  = game ? `<a href="category.html?cat=${game.cat}"
    style="background:var(--cyan,#00eeff);color:#000;padding:.5rem 1.1rem;border-radius:6px;
           font-weight:700;text-decoration:none;font-size:.83rem">
    Ver jogos de ${getCategoryData(game.cat)?.name||'mesma categoria'}</a>` : '';
  const retryBtn = `<button onclick="_guardReset();launchGameResilient(window._currentGame,[])"
    style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);
           color:#fff;padding:.45rem .9rem;border-radius:6px;cursor:pointer;
           font-size:.8rem;margin-right:.4rem">🔄 Tentar novamente</button>`;

  const loader = document.getElementById('iframeLoader');
  const frame  = document.getElementById('gameFrame');
  if (frame) { clearTimeout(frame._npTimeout); frame.src = 'about:blank'; }
  if (!loader) return;
  loader.style.display = 'flex';
  loader.innerHTML = `
    <div style="text-align:center;padding:2rem;max-width:440px">
      <div style="font-size:2.6rem;margin-bottom:.7rem">😵</div>
      <p style="color:var(--text-2,#aaa);font-size:.88rem;line-height:1.5;margin-bottom:1.1rem">
        Jogo indisponível agora.
        <span style="display:block;font-size:.76rem;color:var(--text-3,#666);margin-top:.2rem">
          ${chain.length} opção(ões) testada(s).
        </span>
      </p>
      <div style="display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap">
        ${retryBtn}${catLink}
      </div>
      ${suggestHTML}
    </div>`;
}

// ── M3: GameWarmup v4 — randomizado, anti-bot ─────────────────────

const GameWarmup = {
  _running: false,
  _aborted: false,

  start(n = 12, delayMs = 90000) {
    if (this._running) return;
    this._aborted = false;
    const jitter      = Math.round((Math.random() - 0.5) * 30000);
    const actualDelay = Math.max(20000, delayMs + jitter);
    setTimeout(() => this._run(n), actualDelay);
  },

  async _run(n) {
    if (this._running || this._aborted) return;
    this._running = true;

    const noCachePriority = GAMES_DB.filter(g => ConfidenceCache.getConfidence(g.id) === null);
    const withCache       = GAMES_DB.filter(g => ConfidenceCache.getConfidence(g.id) !== null && !shouldSkipGame(g));

    const shuffled = [
      ..._shuffleArr(noCachePriority),
      ..._shuffleArr(withCache).slice(0, Math.max(0, n - noCachePriority.length))
    ].slice(0, n);

    if (!shuffled.length) { this._running = false; return; }

    let ok = 0;
    for (const game of shuffled) {
      if (this._aborted) break;
      const url = buildGameUrl(game);
      if (!url) { ConfidenceCache.record(game.id, 0, ['no-url']); continue; }
      const result = await ProbeSystem.probe(url, { hardMs: 8000 });
      ConfidenceCache.record(game.id, result.confidence, result.signals);
      if (result.confidence >= 40) ok++;
      await new Promise(r => setTimeout(r, 1000 + Math.round(Math.random() * 3000)));
    }

    this._running = false;
    ResilienceTelemetry.warmupDone(shuffled.length, ok);
    try { GlobalConfidenceLayer.syncFromLocal(); } catch {}
  },

  stop() { this._aborted = true; this._running = false; }
};

function _shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── M5: getLastGame — continuidade de sessão ─────────────────────

function getLastGame() {
  try {
    const raw = localStorage.getItem('np_last_game');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.ts > 48 * 3600 * 1000) return null;
    return GAMES_DB.find(g => g.id === data.id) || null;
  } catch { return null; }
}

// ── Expõe globalmente ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.launchGameResilient    = launchGameResilient;
  window.ConfidenceCache        = ConfidenceCache;
  window.ProbeSystem            = ProbeSystem;
  window.ResilienceTelemetry    = ResilienceTelemetry;
  window.GameWarmup             = GameWarmup;
  window.SmartFallback          = SmartFallback;
  window.scoreGame              = scoreGame;
  window.shouldSkipGame         = shouldSkipGame;
  window.getRecommendedGames    = getRecommendedGames;
  window.EngagementSystem       = EngagementSystem;
  window.GlobalConfidenceLayer  = GlobalConfidenceLayer;
  window._guardReset            = _guardReset;
  window.getLastGame            = getLastGame;
  window.GameVerificationCache  = GameVerificationCache;
  window.probeUrl               = probeUrl;
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
// GROWTH MODULE v13 — NeonPlay
//
// M1: SessionTracker + AutoPlaySystem (retenção máxima)
// M2: AdEngine inteligente (monetização por perfil)
// M3: SEO dinâmico baseado em dados reais
// M4: ShareSystem (viral loop + referral tracking)
// M5: getActiveGames (filtro automático de catálogo)
// M6: UserProfile local + getPersonalizedFeed
// M7: GamePreloader (troca instantânea)
// M8: getBusinessMetrics (métricas de negócio)
// ═══════════════════════════════════════════════════

// ── M1: SessionTracker ────────────────────────────────────────────

const SessionTracker = (() => {
  const KEY      = 'np_session_tracker_v1';
  const HIST_KEY = 'np_session_history_v1';

  function _load()     { try { return JSON.parse(sessionStorage.getItem(KEY))  || { games: [], startTs: Date.now(), totalPlayMs: 0, lastActivity: Date.now() }; } catch { return { games: [], startTs: Date.now(), totalPlayMs: 0, lastActivity: Date.now() }; } }
  function _save(d)    { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch {} }
  function _loadHist() { try { return JSON.parse(localStorage.getItem(HIST_KEY)) || { sessions: [], avgGames: 0, avgDurationMs: 0 }; } catch { return { sessions: [], avgGames: 0, avgDurationMs: 0 }; } }
  function _saveHist(d){ try { localStorage.setItem(HIST_KEY, JSON.stringify(d)); } catch {} }

  return {
    addGame(gameId) {
      const d = _load();
      if (!d.games.includes(gameId)) d.games.push(gameId);
      d.lastActivity = Date.now();
      _save(d);
      if (typeof UserProfile !== 'undefined') UserProfile.update(gameId);
    },
    addPlayTime(ms) {
      const d = _load(); d.totalPlayMs = (d.totalPlayMs||0)+ms; _save(d);
    },
    get() { return _load(); },
    getSessionStrength() {
      const d=_load(), games=d.games.length, mins=(Date.now()-d.startTs)/60000;
      if (games>=8||mins>=30) return 'heavy';
      if (games>=3||mins>=10) return 'engaged';
      return 'casual';
    },
    flush() {
      const d=_load(), hist=_loadHist(), dur=Date.now()-d.startTs;
      if (d.games.length<1) return;
      hist.sessions.push({ ts:Date.now(), games:d.games.length, durationMs:dur });
      if (hist.sessions.length>90) hist.sessions=hist.sessions.slice(-90);
      const n=hist.sessions.length;
      hist.avgGames=Math.round(hist.sessions.reduce((a,s)=>a+s.games,0)/n);
      hist.avgDurationMs=Math.round(hist.sessions.reduce((a,s)=>a+s.durationMs,0)/n);
      _saveHist(hist);
    },
    getHistory() { return _loadHist(); }
  };
})();

// ── M1: AutoPlaySystem ────────────────────────────────────────────

const AutoPlaySystem = (() => {
  let _timer=null, _countdown=null, _active=false;
  const DELAYS = { heavy:10000, engaged:15000, casual:20000 };

  function _clear() {
    if (_timer)     { clearTimeout(_timer);    _timer=null; }
    if (_countdown) { clearInterval(_countdown); _countdown=null; }
    _active=false; _removeUI();
  }
  function _removeUI() { document.getElementById('npAutoplayBanner')?.remove(); }
  function _getDelay() { return DELAYS[SessionTracker.getSessionStrength()]||15000; }

  function _showCountdown(nextGame, onConfirm, onCancel) {
    _removeUI();
    let secs=Math.round(_getDelay()/1000);
    const cd=getCategoryData(nextGame.cat);
    const banner=document.createElement('div');
    banner.id='npAutoplayBanner';
    banner.style.cssText='position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:9998;background:linear-gradient(135deg,#0d0d1a,#151530);border:1px solid rgba(0,238,255,.3);border-radius:14px;padding:.9rem 1.2rem;max-width:340px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.7);display:flex;align-items:center;gap:.8rem;';
    banner.innerHTML=`
      <div style="flex:0 0 42px;height:42px;border-radius:8px;overflow:hidden;background:linear-gradient(${cd.gradient});display:flex;align-items:center;justify-content:center;font-size:1.4rem">
        ${nextGame.thumb?`<img src="${nextGame.thumb}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='${cd.emoji}'">`:cd.emoji}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.7rem;color:#8888bb;margin-bottom:.15rem">A seguir em <span id="apCD" style="color:#00eeff;font-weight:700">${secs}s</span></div>
        <div style="font-size:.83rem;font-weight:700;color:#eeeeff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nextGame.namePT}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.3rem;flex-shrink:0">
        <button id="apPlay" style="background:linear-gradient(135deg,#00eeff,#a855f7);color:#000;border:none;border-radius:7px;padding:.3rem .7rem;font-size:.73rem;font-weight:700;cursor:pointer">▶ Jogar</button>
        <button id="apCancel" style="background:transparent;color:#666;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:.3rem .7rem;font-size:.7rem;cursor:pointer">Cancelar</button>
      </div>`;
    document.body.appendChild(banner);
    const cdEl=banner.querySelector('#apCD');
    _countdown=setInterval(()=>{secs--;if(cdEl)cdEl.textContent=`${secs}s`;if(secs<=0){clearInterval(_countdown);_countdown=null;onConfirm();}},1000);
    banner.querySelector('#apPlay').addEventListener('click',()=>{_clear();onConfirm();});
    banner.querySelector('#apCancel').addEventListener('click',()=>{_clear();onCancel?.();});
  }

  return {
    arm(currentGame) {
      _clear(); _active=true;
      _timer=setTimeout(()=>{
        if(!_active) return;
        const next=(typeof getRecommendedGames==='function'?getRecommendedGames(currentGame,6):[]).filter(g=>!_sessionAttempted?.has(g.id))[0]
          ||SmartFallback?.topScored(6,currentGame?.cat)?.filter(g=>g.id!==currentGame?.id)?.[0];
        if(!next) return;
        _showCountdown(next,
          ()=>{ NP_Analytics.track('autoplay_confirmed',{from:currentGame?.id,to:next.id}); launchGameResilient(next); },
          ()=>NP_Analytics.track('autoplay_cancelled',{game:currentGame?.id})
        );
      },_getDelay());
    },
    cancel() { _clear(); },
    isActive() { return _active; }
  };
})();

// ── M2: AdEngine ──────────────────────────────────────────────────

const AdEngine = (() => {
  const KEY='np_adengine_v1';
  function _load(){ try{return JSON.parse(localStorage.getItem(KEY))||{impressions:0,lastAdTs:0,gamesPlayed:0,totalSessions:0};}catch{return{impressions:0,lastAdTs:0,gamesPlayed:0,totalSessions:0};} }
  function _save(d){ try{localStorage.setItem(KEY,JSON.stringify(d));}catch{} }
  const RULES={casual:{minGapMs:180000,maxPerSession:1,gamesBeforeAd:3},engaged:{minGapMs:90000,maxPerSession:3,gamesBeforeAd:2},heavy:{minGapMs:60000,maxPerSession:5,gamesBeforeAd:2}};
  return {
    recordGame(){ const d=_load(); d.gamesPlayed=(d.gamesPlayed||0)+1; _save(d); },
    recordImpression(slot){ const d=_load(); d.impressions=(d.impressions||0)+1; d.lastAdTs=Date.now(); _save(d); NP_Analytics.track('ad_engine_impression',{slot}); },
    shouldShowAd(context='between_games'){
      const strength=SessionTracker.getSessionStrength(), rules=RULES[strength], d=_load(), sess=SessionTracker.get(), now=Date.now();
      if(now-(d.lastAdTs||0)<rules.minGapMs) return false;
      if((d._sessImpressions||0)>=rules.maxPerSession) return false;
      if(sess.games.length<rules.gamesBeforeAd) return false;
      if((d.totalSessions||0)===0&&strength==='casual') return false;
      return true;
    },
    markSessionAd(){ const d=_load(); d._sessImpressions=(d._sessImpressions||0)+1; _save(d); },
    newSession(){ const d=_load(); d.totalSessions=(d.totalSessions||0)+1; d._sessImpressions=0; _save(d); },
    maybeInjectAd(containerId, slot, context='between_games'){
      if(!this.shouldShowAd(context)) return false;
      const el=document.getElementById(containerId);
      if(!el||el.dataset.adLoaded) return false;
      const pub=NP_CONFIG.adsense?.publisher||'ca-pub-XXXXXXXXXXXXXXXX';
      el.dataset.adLoaded='1';
      el.innerHTML=`<ins class="adsbygoogle" style="display:block" data-ad-client="${pub}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      try{(adsbygoogle=window.adsbygoogle||[]).push({});}catch{}
      this.recordImpression(slot); this.markSessionAd(); return true;
    },
    getStats(){ return _load(); }
  };
})();

// ── M3: DynamicSEO ────────────────────────────────────────────────

const DynamicSEO = {
  getTopSEOKeywords(n=20){
    const topGames=getActiveGames().sort((a,b)=>b.plays-a.plays).slice(0,10);
    const catCounts={};
    GAMES_DB.forEach(g=>{catCounts[g.cat]=(catCounts[g.cat]||0)+g.plays;});
    const keywords=new Set(['jogos online grátis','jogos online grátis sem download','jogos friv','jogos html5',
      ...topGames.map(g=>g.namePT.toLowerCase()),...topGames.map(g=>`jogar ${g.namePT.toLowerCase()}`),
      ...Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).flatMap(([cat])=>{
        const cd=getCategoryData(cat); return [`jogos de ${cd.name.toLowerCase()}`,`${cd.name.toLowerCase()} grátis`];
      })]);
    return [...keywords].slice(0,n);
  },
  generateSEOPageData(catId){
    const cd=getCategoryData(catId), games=getActiveGames().filter(g=>catId==='all'||g.cat===catId), top5=[...games].sort((a,b)=>b.plays-a.plays).slice(0,5);
    const title=catId==='all'?`Jogos Online Grátis - ${GAMES_DB.length}+ Jogos sem Download | NeonPlay`:`${cd.name} Grátis Online - ${games.length} Jogos | NeonPlay`;
    const desc=catId==='all'?`Jogue ${GAMES_DB.length}+ jogos online grátis no NeonPlay. Ação, corrida, puzzle, arcade, esporte. Sem download, sem cadastro. ${top5.map(g=>g.namePT).join(', ')}.`:`${games.length} jogos de ${cd.name} grátis no NeonPlay. ${cd.desc||''} Destaque: ${top5.map(g=>g.namePT).join(', ')}. Sem download.`;
    return { title, description:desc, keywords:this.getTopSEOKeywords(10).join(', '), topGames:top5, totalGames:games.length, category:cd, canonical:catId==='all'?`${NP_CONFIG.site.url}/category.html`:`${NP_CONFIG.site.url}/category.html?cat=${catId}` };
  },
  applyToPage(catId='all'){
    const data=this.generateSEOPageData(catId);
    document.title=data.title;
    const setMeta=(n,v)=>{let el=document.querySelector(`meta[name="${n}"],meta[property="${n}"]`);if(!el){el=document.createElement('meta');el.setAttribute(n.includes(':')?'property':'name',n);document.head.appendChild(el);}el.content=v;};
    setMeta('description',data.description); setMeta('keywords',data.keywords); setMeta('og:title',data.title); setMeta('og:description',data.description);
    return data;
  }
};

// ── M4: ShareSystem ───────────────────────────────────────────────

const ShareSystem = (() => {
  const KEY='np_referral_v1';
  function _load(){ try{return JSON.parse(localStorage.getItem(KEY))||{sent:0,receivedVisits:0,refs:[]};}catch{return{sent:0,receivedVisits:0,refs:[]};} }
  function _save(d){ try{localStorage.setItem(KEY,JSON.stringify(d));}catch{} }
  return {
    buildShareUrl(game){ return game?`${NP_CONFIG.site.url}/game.html?id=${game.id}&ref=share`:`${NP_CONFIG.site.url}/?ref=share`; },
    async copyLink(game){
      const url=this.buildShareUrl(game);
      try{ await navigator.clipboard.writeText(url); showToast('🔗 Link copiado! Compartilhe com amigos.'); }
      catch{ const ta=document.createElement('textarea'); ta.value=url; ta.style.cssText='position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('🔗 Link copiado!'); }
      const d=_load(); d.sent=(d.sent||0)+1; d.refs.push({gameId:game?.id,ts:Date.now()}); if(d.refs.length>100) d.refs=d.refs.slice(-100); _save(d);
      NP_Analytics.track('share_copy',{game_id:game?.id});
    },
    async nativeShare(game){
      const url=this.buildShareUrl(game), title=game?`Jogue ${game.namePT} grátis!`:'Jogos grátis no NeonPlay', text=game?`Estou jogando ${game.namePT} no NeonPlay!`:'NeonPlay — jogos grátis!';
      if(navigator.share){ try{ await navigator.share({title,text,url}); NP_Analytics.track('share_native',{game_id:game?.id}); return true; } catch{} }
      return this.copyLink(game);
    },
    detectReferral(){
      const ref=new URLSearchParams(location.search).get('ref');
      if(ref==='share'){ const d=_load(); d.receivedVisits=(d.receivedVisits||0)+1; _save(d); NP_Analytics.track('referral_visit',{ref}); }
    },
    getReferralStats(){ return _load(); }
  };
})();

// ── M5: getActiveGames — filtro automático de catálogo ────────────

function getActiveGames(cat=null){
  return GAMES_DB.filter(g=>{
    if(cat&&g.cat!==cat) return false;
    const entry=ConfidenceCache.get(g.id);
    if(!entry) return true;
    if(entry.confidence<25&&(entry.failCount||0)>3&&ConfidenceCache.getEngagementScore(g.id)<10) return false;
    return true;
  });
}

// ── M6: UserProfile local ─────────────────────────────────────────

const UserProfile = (() => {
  const KEY='np_profile_v1';
  function _load(){ try{return JSON.parse(localStorage.getItem(KEY))||{cats:{},played:[],totalMs:0,visits:0,firstSeen:Date.now(),lastSeen:Date.now()};}catch{return{cats:{},played:[],totalMs:0,visits:0,firstSeen:Date.now(),lastSeen:Date.now()};} }
  function _save(d){ try{localStorage.setItem(KEY,JSON.stringify(d));}catch{} }
  return {
    init(){ const d=_load(); d.visits=(d.visits||0)+1; d.lastSeen=Date.now(); _save(d); AdEngine.newSession(); },
    update(gameId){ const game=GAMES_DB.find(g=>g.id===gameId); if(!game) return; const d=_load(); d.cats[game.cat]=(d.cats[game.cat]||0)+1; if(!d.played.includes(gameId)){d.played.unshift(gameId); if(d.played.length>50) d.played.pop();} _save(d); },
    addPlayTime(ms){ const d=_load(); d.totalMs=(d.totalMs||0)+ms; _save(d); },
    getFavCat(){ const d=_load(); return Object.entries(d.cats||{}).sort((a,b)=>b[1]-a[1])[0]?.[0]||null; },
    getPersonalizedFeed(n=12){
      const d=_load(), played=new Set(d.played), cats=d.cats, strength=SessionTracker.getSessionStrength();
      const pool=getActiveGames().filter(g=>!played.has(g.id));
      return pool.map(g=>{ let s=scoreGame(g); if(cats[g.cat]) s+=Math.min(20,cats[g.cat]*3); if(strength==='heavy') s+=ConfidenceCache.getEngagementScore(g.id)*0.3; return{g,s}; }).sort((a,b)=>b.s-a.s).slice(0,n).map(c=>c.g);
    },
    get(){ return _load(); },
    getStrength(){ return SessionTracker.getSessionStrength(); }
  };
})();

// ── M7: GamePreloader — troca instantânea ─────────────────────────

const GamePreloader = (() => {
  let _preloaded=null, _iframe=null;
  function _cleanup(){ if(_iframe){ try{document.body.removeChild(_iframe);}catch{} _iframe=null; } _preloaded=null; }
  return {
    preload(game){
      if(!game||shouldSkipGame(game)) return;
      if(_preloaded?.id===game.id) return;
      _cleanup();
      const url=buildGameUrl(game); if(!url) return;
      _preloaded=game;
      _iframe=document.createElement('iframe');
      _iframe.style.cssText='position:fixed;width:1px;height:1px;opacity:.001;pointer-events:none;top:-9999px;left:-9999px;border:none;z-index:-1';
      _iframe.setAttribute('sandbox','allow-scripts allow-same-origin');
      _iframe.src=url;
      _iframe.onload=()=>{ if(_preloaded?.id===game.id) ConfidenceCache.record(game.id,60,['preloaded']); };
      _iframe.onerror=()=>{ ConfidenceCache.record(game.id,5,['preload-error']); _cleanup(); };
      document.body.appendChild(_iframe);
      setTimeout(()=>{ if(_preloaded?.id===game.id) _cleanup(); },30000);
    },
    isPreloaded(gameId){ return _preloaded?.id===gameId; },
    getPreloaded(){ return _preloaded; },
    launchPreloaded(game,onReady){ if(!this.isPreloaded(game?.id)){onReady?.(); return false;} const frame=document.getElementById('gameFrame'); if(frame&&_iframe){frame.src=_iframe.src; EngagementSystem.start(game.id); NP_Analytics.track('preload_hit',{game_id:game.id}); _cleanup(); onReady?.(); return true;} onReady?.(); return false; },
    cancel(){ _cleanup(); }
  };
})();

// ── M8: getBusinessMetrics ────────────────────────────────────────

function getBusinessMetrics(){
  const hist=SessionTracker.getHistory(), profile=UserProfile.get(), adStats=AdEngine.getStats(), referral=ShareSystem.getReferralStats(), strength=SessionTracker.getSessionStrength();
  const retainedSessions=hist.sessions.filter(s=>s.games>=3).length;
  const retentionRate=hist.sessions.length?+(retainedSessions/hist.sessions.length*100).toFixed(1):0;
  const daysSince=Math.max(1,Math.round((Date.now()-(profile.firstSeen||Date.now()))/86400000));
  const returnRate=+((profile.visits||1)/daysSince).toFixed(2);
  const metrics={
    session:{ strength, gamesThisSession:SessionTracker.get().games.length, avgGamesPerSession:hist.avgGames, avgDurationMinutes:Math.round((hist.avgDurationMs||0)/60000), totalSessions:hist.sessions.length },
    retention:{ rate:`${retentionRate}%`, retainedSessions, totalSessions:hist.sessions.length },
    user:{ totalVisits:profile.visits||1, returnRate:`${returnRate}x/day`, favCategory:UserProfile.getFavCat(), totalPlayedGames:(profile.played||[]).length, totalPlayMinutes:Math.round((profile.totalMs||0)/60000) },
    monetization:{ adImpressions:adStats.impressions||0, totalSessions:adStats.totalSessions||0, adsPerSession:adStats.totalSessions?+((adStats.impressions||0)/adStats.totalSessions).toFixed(2):0 },
    viral:{ sharesSent:referral.sent||0, referralVisits:referral.receivedVisits||0, conversionRate:referral.sent?+((referral.receivedVisits||0)/referral.sent*100).toFixed(1)+'%':'N/A' },
    catalog:{ total:GAMES_DB.length, active:getActiveGames().length, filtered:GAMES_DB.length-getActiveGames().length },
    loadedAt:new Date().toISOString()
  };
  console.group('%c📊 NeonPlay v13 — Business Metrics','color:#00eeff;font-weight:bold;font-size:13px');
  console.log(`👤 ${strength.toUpperCase()} | Visitas: ${metrics.user.totalVisits} | Retorno: ${metrics.user.returnRate}`);
  console.log(`🎮 Sessão: ${metrics.session.gamesThisSession} jogos | Média: ${metrics.session.avgGamesPerSession} jogos/${metrics.session.avgDurationMinutes}min`);
  console.log(`📈 Retenção: ${metrics.retention.rate} | 💰 Ads: ${metrics.monetization.adImpressions} impressões | 📤 Viral: ${metrics.viral.sharesSent}→${metrics.viral.referralVisits} visitas`);
  console.log(`🗂️ Catálogo: ${metrics.catalog.active}/${metrics.catalog.total} ativos`);
  console.groupEnd();
  return metrics;
}


// ═══════════════════════════════════════════════════
// v14 MODULE — SEO REAL + LANDING PAGES + UTM + MÉTRICAS
// M2: generateSEOData + renderStaticGameContent
// M3: AdEngine_v14 (monetização inteligente por perfil)
// M4: generateLandingPage (landing pages automáticas)
// M5: getTopSEOContent (SEO baseado em dados reais)
// M6: UTMTracker — copyLinkWithUTM + trackTrafficSource
// M7: lazyLoadGames + lazyLoadThumbs + generateSitemapXML
// M8: getRevenueMetrics (métricas de receita)
// ═══════════════════════════════════════════════════

// ── M2: generateSEOData — dados SEO reais por jogo/categoria ─────

function generateSEOData(game) {
  if (!game) return {};
  const cd = getCategoryData(game.cat);
  const plays = typeof formatPlays === 'function' ? formatPlays(game.plays) : game.plays;

  const title = `${game.namePT} — Jogo Grátis Online | NeonPlay`;
  const description = [
    `Jogue ${game.namePT} grátis no NeonPlay.`,
    game.desc || '',
    `Categoria: ${cd.name}. Mais de ${plays} jogadas.`,
    'Sem download, sem cadastro. 100% no navegador.'
  ].filter(Boolean).join(' ').slice(0, 160);

  const keywords = [
    `${game.namePT.toLowerCase()} grátis`,
    `jogar ${game.namePT.toLowerCase()} online`,
    `${game.namePT.toLowerCase()} sem download`,
    `jogos de ${cd.name.toLowerCase()} grátis`,
    'jogos online grátis',
    'jogos html5',
    ...(game.tags || []).slice(0, 5)
  ].join(', ');

  const canonical = `${NP_CONFIG.site.url}/game.html?id=${game.id}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.namePT,
    description: description,
    url: canonical,
    image: game.thumb || '',
    genre: cd.name,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web Browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
    aggregateRating: game.rating ? {
      '@type': 'AggregateRating',
      ratingValue: game.rating,
      bestRating: '5',
      worstRating: '1',
      ratingCount: Math.max(100, Math.round(game.plays / 500))
    } : undefined,
    publisher: { '@type': 'Organization', name: NP_CONFIG.site.name, url: NP_CONFIG.site.url },
  };

  return { title, description, keywords, canonical, schema, game, category: cd };
}

/**
 * renderStaticGameContent(game, containerId?)
 * Injeta conteúdo indexável ANTES do JS carregar o iframe.
 * Garante que o Google veja texto real na página.
 */
function renderStaticGameContent(game, containerId = 'seoBlock') {
  if (!game) return;
  const cd  = getCategoryData(game.cat);
  const el  = document.getElementById(containerId);
  if (!el) return;

  const faqs = [
    { q: `Como jogar ${game.namePT}?`, a: `${game.namePT} é jogado diretamente no navegador, sem download. ${game.descLong || game.desc}` },
    { q: `${game.namePT} é grátis?`, a: `Sim! ${game.namePT} é 100% gratuito no NeonPlay. Não precisa de cadastro.` },
    { q: `Posso jogar ${game.namePT} no celular?`, a: `Sim, ${game.namePT} é compatível com dispositivos móveis e funciona em qualquer navegador atualizado.` },
    { q: `Qual é a categoria de ${game.namePT}?`, a: `${game.namePT} pertence à categoria ${cd.name}. Explore mais jogos de ${cd.name} no NeonPlay.` },
  ];

  el.innerHTML = `
    <h2>${game.namePT} — Jogo Grátis Online</h2>
    <p>${game.descLong || game.desc} Jogue <strong>${game.namePT}</strong> gratuitamente no NeonPlay, sem download e sem cadastro.</p>
    <p><strong>Categoria:</strong> <a href="category.html?cat=${game.cat}">${cd.name}</a> &nbsp;|&nbsp;
       <strong>Desenvolvedor:</strong> ${game.developer || 'GamePix'} &nbsp;|&nbsp;
       <strong>Ano:</strong> ${game.year || 2024}</p>
    ${game.tags?.length ? `<p><strong>Tags:</strong> ${game.tags.map(t => `<a href="category.html?q=${t}" style="margin-right:.4rem">${t}</a>`).join(' ')}</p>` : ''}
    <h3>Perguntas Frequentes sobre ${game.namePT}</h3>
    <dl>
      ${faqs.map(f => `<dt><strong>${f.q}</strong></dt><dd>${f.a}</dd>`).join('\n')}
    </dl>
    <p>Descubra mais jogos de <a href="category.html?cat=${game.cat}">${cd.name}</a> ou explore todas as <a href="category.html">categorias do NeonPlay</a>.</p>`;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(faqSchema);
  document.head.appendChild(s);
}

function applySEOToHead(game) {
  if (!game) return;
  const seo = generateSEOData(game);
  document.title = seo.title;
  const sm = (n, v) => {
    let el = document.querySelector(`meta[name="${n}"],meta[property="${n}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(n.includes(':') ? 'property' : 'name', n); document.head.appendChild(el); }
    el.content = v;
  };
  sm('description',    seo.description);
  sm('keywords',       seo.keywords);
  sm('og:title',       seo.title);
  sm('og:description', seo.description);
  sm('og:url',         seo.canonical);
  sm('og:image',       game.thumb || '');
  sm('twitter:title',  seo.title);
  sm('twitter:description', seo.description);
  const link = document.querySelector('link[rel="canonical"]') || (() => {
    const l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); return l;
  })();
  link.href = seo.canonical;
  const sc = document.createElement('script');
  sc.type = 'application/ld+json';
  sc.textContent = JSON.stringify(seo.schema);
  document.head.appendChild(sc);
}

// ── M3: AdEngine_v14 — monetização real por posição e perfil ─────

const AdEngine_v14 = (() => {
  const SLOTS = {
    top:           NP_CONFIG.adsense.slots.leaderboard_top,
    mid:           NP_CONFIG.adsense.slots.leaderboard_mid,
    bottom:        NP_CONFIG.adsense.slots.leaderboard_bottom,
    sidebar1:      NP_CONFIG.adsense.slots.rectangle_sidebar1,
    sidebar2:      NP_CONFIG.adsense.slots.rectangle_sidebar2,
    mobile:        NP_CONFIG.adsense.slots.rectangle_mobile,
    anchor:        NP_CONFIG.adsense.slots.anchor_mobile,
    pre_game:      NP_CONFIG.adsense.slots.pre_game,
    between_games: '8901234560',
  };

  // Limites por perfil de sessão
  const RULES = {
    new:     { maxAds: 1, minGapMs: 300000, preGame: false },
    casual:  { maxAds: 2, minGapMs: 120000, preGame: true  },
    engaged: { maxAds: 4, minGapMs:  60000, preGame: true  },
    heavy:   { maxAds: 8, minGapMs:  30000, preGame: true  },
  };

  function _getProfile() {
    const strength = (typeof SessionTracker !== 'undefined') ? SessionTracker.getSessionStrength() : 'casual';
    const visits   = (() => { try { const p = JSON.parse(localStorage.getItem('np_profile_v1')); return p?.visits || 1; } catch { return 1; } })();
    if (visits === 1) return 'new';
    return strength;
  }

  function _getAdState() {
    try { return JSON.parse(sessionStorage.getItem('np_adstate_v14')) || { count: 0, lastTs: 0 }; } catch { return { count: 0, lastTs: 0 }; }
  }
  function _saveAdState(s) { try { sessionStorage.setItem('np_adstate_v14', JSON.stringify(s)); } catch {} }

  function _push(containerId, slot, format = 'auto') {
    const el  = document.getElementById(containerId);
    if (!el || el.dataset.adLoaded) return false;
    const pub = NP_CONFIG.adsense.publisher;
    if (!pub || pub.includes('XXXX')) return false; // placeholder → não injeta

    el.dataset.adLoaded = '1';
    el.innerHTML = `<ins class="adsbygoogle" style="display:block"
      data-ad-client="${pub}"
      data-ad-slot="${slot}"
      data-ad-format="${format}"
      data-full-width-responsive="true"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    if (typeof NP_Analytics !== 'undefined') NP_Analytics.adImpression(slot);

    const state  = _getAdState();
    state.count++;
    state.lastTs = Date.now();
    _saveAdState(state);
    return true;
  }

  return {
    /**
     * showAd(position, containerId?)
     * position: 'top' | 'mid' | 'bottom' | 'sidebar1' | 'sidebar2'
     *           'mobile' | 'anchor' | 'pre_game' | 'between_games'
     * Respeita limites por perfil e intervalo mínimo.
     */
    showAd(position, containerId) {
      const slot  = SLOTS[position];
      if (!slot) { console.warn('[AdEngine_v14] Posição desconhecida:', position); return false; }

      const profile = _getProfile();
      const rules   = RULES[profile] || RULES.casual;
      const state   = _getAdState();
      const now     = Date.now();

      if (state.count >= rules.maxAds)          return false;
      if (now - state.lastTs < rules.minGapMs)  return false;
      if (position === 'pre_game' && !rules.preGame) return false;

      const id = containerId || `ad-${position}`;
      return _push(id, slot);
    },

    // Força injeção sem verificar regras (uso interno)
    forceAd(position, containerId) {
      const slot = SLOTS[position];
      if (!slot) return false;
      return _push(containerId || `ad-${position}`, slot);
    },

    // Inicializa todos os .ad-block[data-ad-pos] na página
    initAll() {
      document.querySelectorAll('.ad-block[data-ad-pos]:not([data-ad-loaded])').forEach(el => {
        const pos = el.dataset.adPos;
        if (!el.id) el.id = `ad-${pos}-${Math.random().toString(36).slice(2,6)}`;
        this.showAd(pos, el.id);
      });
    },

    getProfile() { return _getProfile(); },
    getState()   { return _getAdState(); },
    getRules()   { return RULES[_getProfile()] || RULES.casual; },
    slotFor(pos) { return SLOTS[pos] || null; },
  };
})();

// ── M4: Landing Pages automáticas ────────────────────────────────

const LandingPageTypes = {
  'tiro': {
    slug: 'melhores-jogos-de-tiro',
    cat: 'tiro',
    h1: 'Melhores Jogos de Tiro Online Grátis',
    desc: 'Os melhores jogos de tiro HTML5 grátis do Brasil. FPS, battle royale, sniper e muito mais. Jogue agora sem download.',
    keywords: 'jogos de tiro grátis, fps online, jogos de shooter, battle royale grátis, jogos de tiro sem download',
    intro: 'Prepare sua mira! Nossa coleção de jogos de tiro reúne os melhores FPS, sniper games e battle royale disponíveis no navegador. Sem instalação, sem cadastro — pura adrenalina direto no browser.',
  },
  'corrida': {
    slug: 'melhores-jogos-de-corrida',
    cat: 'corrida',
    h1: 'Melhores Jogos de Corrida Online Grátis',
    desc: 'Jogos de corrida grátis no NeonPlay. Carros, motos, drift e stunts incríveis. Sem download.',
    keywords: 'jogos de corrida grátis, jogos de carro online, drift games, jogos de moto, corrida sem download',
    intro: 'Acelere o motor! Nossa seleção de jogos de corrida reúne os melhores jogos de carro, moto e drift disponíveis direto no browser. Drift, stunt, corrida de rua — tudo grátis.',
  },
  'celular': {
    slug: 'jogos-para-celular',
    cat: null,
    h1: 'Jogos para Celular Grátis — Jogue no Smartphone',
    desc: 'Os melhores jogos para celular grátis no NeonPlay. Jogue no smartphone sem instalar nada. HTML5 mobile.',
    keywords: 'jogos para celular grátis, jogos mobile sem download, jogos html5 celular, jogar no smartphone, jogos android online',
    intro: 'Jogue no seu celular sem instalar nada! O NeonPlay é 100% otimizado para smartphones e tablets. Todos os jogos rodam diretamente no navegador mobile — iOS, Android, qualquer dispositivo.',
    filterFn: () => GAMES_DB.filter(g => g.mobile !== false).sort((a, b) => b.plays - a.plays).slice(0, 30),
  },
  'leves': {
    slug: 'jogos-leves',
    cat: null,
    h1: 'Jogos Leves e Rápidos — Carregam em Segundos',
    desc: 'Jogos leves grátis que carregam em segundos no NeonPlay. Perfeitos para conexões lentas e celulares mais antigos.',
    keywords: 'jogos leves online, jogos rápidos, jogos para pc fraco, jogos html5 leves, jogos sem lag',
    intro: 'Sem travar, sem lag. Os jogos mais leves do NeonPlay carregam em segundos mesmo em conexões lentas. Perfeitos para computadores mais antigos e smartphones de entrada.',
    filterFn: () => GAMES_DB.filter(g => ['casual', 'puzzle', 'arcade'].includes(g.cat)).sort((a, b) => b.plays - a.plays).slice(0, 30),
  },
  'acao': {
    slug: 'melhores-jogos-de-acao',
    cat: 'acao',
    h1: 'Melhores Jogos de Ação Online Grátis',
    desc: 'Jogos de ação grátis no NeonPlay. Luta, aventura, stickman e muito mais. Sem download, jogue agora.',
    keywords: 'jogos de ação grátis, jogos de luta online, stickman games, jogos de aventura grátis, ação sem download',
    intro: 'Adrenalina pura! Nossa coleção de jogos de ação inclui lutas épicas, stickman games, aventuras e muito mais. Todos grátis e sem download.',
  },
};

function generateLandingPage(type) {
  const cfg = LandingPageTypes[type];
  if (!cfg) { console.error('[NeonPlay] Tipo desconhecido:', type); return null; }

  const games   = cfg.filterFn
    ? cfg.filterFn()
    : GAMES_DB.filter(g => g.cat === cfg.cat).sort((a, b) => b.plays - a.plays).slice(0, 30);
  const topGame = games[0];
  const title   = `${cfg.h1} | NeonPlay`;

  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: cfg.h1, description: cfg.desc,
    url: `${NP_CONFIG.site.url}/${cfg.slug}.html`,
    numberOfItems: games.length,
    hasPart: games.slice(0, 8).map(g => ({
      '@type': 'VideoGame', name: g.namePT,
      url: `${NP_CONFIG.site.url}/game.html?id=${g.id}`,
      image: g.thumb || '', genre: getCategoryData(g.cat).name
    }))
  };

  const gameCards = games.map(g => {
    const cd = getCategoryData(g.cat);
    return `
    <article class="game-card" itemscope itemtype="https://schema.org/VideoGame">
      <a href="game.html?id=${g.id}" class="card-link">
        <div class="card-thumb">
          ${g.thumb ? `<img src="${g.thumb}" alt="${g.namePT}" loading="lazy" itemprop="image" onerror="this.style.display='none'">` : `<div class="card-emoji">${g.emoji||cd.emoji}</div>`}
          ${g.badge ? `<span class="card-badge badge-${g.badge}">${g.badge==='hot'?'🔥 HOT':g.badge==='new'?'✨ NOVO':'⭐ TOP'}</span>` : ''}
        </div>
        <div class="card-info">
          <h3 class="card-name" itemprop="name">${g.namePT}</h3>
          <p class="card-desc" itemprop="description">${g.desc}</p>
          <div class="card-meta">
            <span>⭐ ${g.rating}</span>
            <span>👾 ${typeof formatPlays === 'function' ? formatPlays(g.plays) : g.plays}</span>
            <span>${cd.emoji} ${cd.name}</span>
          </div>
        </div>
      </a>
    </article>`;
  }).join('\n');

  const seoText = `
    <section class="seo-block" aria-label="Sobre esses jogos">
      <h2>Por que jogar ${cfg.h1.replace(' | NeonPlay', '')} no NeonPlay?</h2>
      <p>${cfg.intro}</p>
      <p>Temos <strong>${games.length} jogos</strong> nesta categoria, todos testados e funcionando. Nosso mais popular é <strong>${topGame?.namePT || ''}</strong>, com mais de ${topGame ? (typeof formatPlays === 'function' ? formatPlays(topGame.plays) : topGame.plays) : '1M'} jogadas.</p>
      <h3>Como jogar no celular?</h3>
      <p>Abra o NeonPlay no navegador do seu smartphone. Todos os jogos são HTML5 e funcionam no Safari, Chrome e Firefox mobile sem instalar nada.</p>
      <h3>São todos gratuitos?</h3>
      <p>Sim! 100% dos jogos do NeonPlay são gratuitos, sem anúncios intrusivos e sem precisar criar conta.</p>
    </section>`;

  return {
    type, cfg, games, title, schema, gameCards, seoText,
    url: `${NP_CONFIG.site.url}/${cfg.slug}.html`,
    applyToPage() {
      document.title = title;
      const h1El = document.getElementById('landingH1');   if (h1El) h1El.textContent = cfg.h1;
      const descEl = document.getElementById('landingDesc'); if (descEl) descEl.textContent = cfg.desc;
      const gridEl = document.getElementById('landingGrid'); if (gridEl) gridEl.innerHTML = gameCards;
      const seoEl  = document.getElementById('landingSEO');  if (seoEl)  seoEl.innerHTML  = seoText;
      const sc = document.createElement('script');
      sc.type = 'application/ld+json';
      sc.textContent = JSON.stringify(schema);
      document.head.appendChild(sc);
      const sm = (n, v) => {
        let el = document.querySelector(`meta[name="${n}"],meta[property="${n}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute('name', n); document.head.appendChild(el); }
        el.content = v;
      };
      sm('description', cfg.desc);
      sm('keywords',    cfg.keywords);
    }
  };
}

// ── M5: getTopSEOContent — conteúdo baseado em dados reais ───────

function getTopSEOContent(n = 10) {
  const byPlays  = [...GAMES_DB].sort((a, b) => b.plays  - a.plays).slice(0, n);
  const byRating = [...GAMES_DB].sort((a, b) => b.rating - a.rating).slice(0, n);
  const byEngage = typeof ConfidenceCache !== 'undefined'
    ? [...GAMES_DB].sort((a, b) => ConfidenceCache.getEngagementScore(b.id) - ConfidenceCache.getEngagementScore(a.id)).slice(0, n)
    : byPlays;

  const catCounts = {};
  GAMES_DB.forEach(g => { catCounts[g.cat] = (catCounts[g.cat] || 0) + 1; });
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topKeywords = [
    ...byPlays.map(g => `jogar ${g.namePT.toLowerCase()} grátis`),
    ...topCats.flatMap(([cat]) => {
      const cd = getCategoryData(cat);
      return [`jogos de ${cd.name.toLowerCase()} grátis`, `${cd.name.toLowerCase()} online`];
    }),
    'jogos online grátis sem download', 'jogos html5 brasil', 'jogos friv 2026',
  ];

  const result = {
    topByPlays:      byPlays.map(g => ({ id: g.id, name: g.namePT, plays: g.plays })),
    topByRating:     byRating.map(g => ({ id: g.id, name: g.namePT, rating: g.rating })),
    topByEngagement: byEngage.map(g => ({ id: g.id, name: g.namePT, engagement: typeof ConfidenceCache !== 'undefined' ? ConfidenceCache.getEngagementScore(g.id) : 0 })),
    topCategories:   topCats.map(([cat, count]) => ({ cat, name: getCategoryData(cat).name, count })),
    recommendedKeywords: [...new Set(topKeywords)].slice(0, 20),
    totalGames: GAMES_DB.length,
    generatedAt: new Date().toISOString(),
  };

  console.group('%c📈 NeonPlay v14 — Top SEO Content', 'color:#00eeff;font-weight:bold');
  console.log('🏆 Top 5 por jogadas:',  result.topByPlays.slice(0,5).map(g=>`${g.name} (${g.plays})`).join(', '));
  console.log('⭐ Top 5 por rating:',   result.topByRating.slice(0,5).map(g=>`${g.name} (${g.rating})`).join(', '));
  console.log('🔑 Keywords sugeridas:', result.recommendedKeywords.slice(0,5).join(', '));
  console.groupEnd();
  return result;
}

// ── M6: UTMTracker — share com UTM + detecção de fonte ───────────

const UTMTracker = (() => {
  const KEY = 'np_utm_v14';

  const SOURCES = {
    facebook:  { utm_source: 'facebook',  utm_medium: 'social',  utm_campaign: 'share' },
    whatsapp:  { utm_source: 'whatsapp',  utm_medium: 'social',  utm_campaign: 'share' },
    twitter:   { utm_source: 'twitter',   utm_medium: 'social',  utm_campaign: 'share' },
    telegram:  { utm_source: 'telegram',  utm_medium: 'social',  utm_campaign: 'share' },
    email:     { utm_source: 'email',     utm_medium: 'email',   utm_campaign: 'share' },
    direct:    { utm_source: 'direct',    utm_medium: 'direct',  utm_campaign: 'none'  },
    organic:   { utm_source: 'google',    utm_medium: 'organic', utm_campaign: 'seo'   },
    referral:  { utm_source: 'referral',  utm_medium: 'referral',utm_campaign: 'share' },
  };

  function _buildUrl(baseUrl, utmParams) {
    const u = new URL(baseUrl);
    Object.entries(utmParams).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
  }

  function _save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
  function _load()     { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }

  return {
    buildUTMUrl(baseUrl, channel, extra = {}) {
      const params = { ...(SOURCES[channel] || SOURCES.referral), ...extra };
      return _buildUrl(baseUrl, params);
    },

    async copyLinkWithUTM(game, channel = 'direct') {
      const base = game
        ? `${NP_CONFIG.site.url}/game.html?id=${game.id}`
        : `${NP_CONFIG.site.url}/`;
      const url = this.buildUTMUrl(base, channel, { utm_content: game?.id || 'homepage' });

      try { await navigator.clipboard.writeText(url); }
      catch {
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
      }

      if (typeof showToast === 'function') showToast(`🔗 Link copiado para ${channel}!`);
      if (typeof NP_Analytics !== 'undefined') NP_Analytics.track('utm_link_copy', { channel, game_id: game?.id });

      const d = _load();
      d.sent = (d.sent || 0) + 1;
      d.byChannel = d.byChannel || {};
      d.byChannel[channel] = (d.byChannel[channel] || 0) + 1;
      _save(d);
    },

    async shareWithUTM(game, channel = 'whatsapp') {
      const base = game ? `${NP_CONFIG.site.url}/game.html?id=${game.id}` : `${NP_CONFIG.site.url}/`;
      const url  = this.buildUTMUrl(base, channel, { utm_content: game?.id || 'homepage' });
      const text = game ? `Jogue ${game.namePT} grátis!` : 'Conheça o NeonPlay — jogos grátis!';
      if (navigator.share) {
        try { await navigator.share({ title: text, url }); return true; } catch {}
      }
      return this.copyLinkWithUTM(game, channel);
    },

    trackTrafficSource() {
      const params   = new URLSearchParams(location.search);
      const source   = params.get('utm_source');
      const medium   = params.get('utm_medium');
      const campaign = params.get('utm_campaign');
      const ref      = params.get('ref') || document.referrer;

      let detected = 'direct';
      if (source)                                                    detected = source;
      else if (ref.includes('google'))                               detected = 'google';
      else if (ref.includes('facebook') || ref.includes('fb.com'))  detected = 'facebook';
      else if (ref.includes('whatsapp'))                             detected = 'whatsapp';
      else if (ref.includes('t.co') || ref.includes('twitter'))     detected = 'twitter';
      else if (ref.includes('t.me') || ref.includes('telegram'))    detected = 'telegram';
      else if (ref && !ref.includes(NP_CONFIG.site.url))            detected = 'referral';

      const data = { source: detected, medium: medium||'', campaign: campaign||'', ts: Date.now(), path: location.pathname };
      try { sessionStorage.setItem('np_traffic_source', JSON.stringify(data)); } catch {}
      if (typeof NP_Analytics !== 'undefined') NP_Analytics.track('traffic_source', data);

      const d = _load();
      d.sources = d.sources || {};
      d.sources[detected] = (d.sources[detected] || 0) + 1;
      _save(d);
      return data;
    },

    getStats()   { return _load(); },
    getSession() { try { return JSON.parse(sessionStorage.getItem('np_traffic_source')); } catch { return null; } },
  };
})();

// ── M7: lazyLoadGames + lazyLoadThumbs + generateSitemapXML ──────

function lazyLoadGames(containerSelector = '.games-grid', batchSize = 12) {
  const containers = document.querySelectorAll(containerSelector);
  if (!containers.length) return;
  containers.forEach(container => {
    const cards = Array.from(container.querySelectorAll('.game-card,[data-lazy]'));
    if (cards.length <= batchSize) return;
    cards.forEach((card, i) => { if (i >= batchSize) card.style.display = 'none'; });
    const sentinel = document.createElement('div');
    sentinel.className = 'lazy-sentinel';
    sentinel.style.height = '4px';
    container.appendChild(sentinel);
    let loaded = batchSize;
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      cards.slice(loaded, loaded + batchSize).forEach(c => { c.style.display = ''; });
      loaded += batchSize;
      if (loaded >= cards.length) obs.disconnect();
    }, { rootMargin: '200px' });
    obs.observe(sentinel);
  });
}

function lazyLoadThumbs() {
  const imgs = document.querySelectorAll('img[data-src]');
  if (!imgs.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      obs.unobserve(img);
    });
  }, { rootMargin: '300px' });
  imgs.forEach(img => obs.observe(img));
}

function generateSitemapXML() {
  const base  = NP_CONFIG.site.url;
  const today = new Date().toISOString().split('T')[0];
  const pages = [
    { url: `${base}/`,                               priority: '1.0', freq: 'daily' },
    { url: `${base}/category.html`,                  priority: '0.9', freq: 'daily' },
    { url: `${base}/melhores-jogos-de-acao.html`,    priority: '0.8', freq: 'weekly' },
    { url: `${base}/melhores-jogos-de-tiro.html`,    priority: '0.8', freq: 'weekly' },
    { url: `${base}/melhores-jogos-de-corrida.html`, priority: '0.8', freq: 'weekly' },
    { url: `${base}/jogos-para-celular.html`,        priority: '0.8', freq: 'weekly' },
    { url: `${base}/jogos-leves.html`,               priority: '0.7', freq: 'weekly' },
    { url: `${base}/jogos-friv.html`,                priority: '0.7', freq: 'weekly' },
    { url: `${base}/melhores-jogos-online.html`,     priority: '0.8', freq: 'weekly' },
    ...CATEGORIES_DATA.map(c => ({ url: `${base}/category.html?cat=${c.id}`, priority: '0.7', freq: 'weekly' })),
    ...GAMES_DB.map(g => ({ url: `${base}/game.html?id=${g.id}`, priority: '0.6', freq: 'monthly', lastmod: today })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    pages.map(p => `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${p.lastmod||today}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`).join('\n')
  }\n</urlset>`;
  console.log(`[Sitemap] ${pages.length} URLs geradas.`);
  return xml;
}

function downloadSitemap() {
  const xml  = generateSitemapXML();
  const blob = new Blob([xml], { type: 'application/xml' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'sitemap-games.xml';
  a.click();
}

// ── M8: getRevenueMetrics ─────────────────────────────────────────

function getRevenueMetrics() {
  const hist    = typeof SessionTracker !== 'undefined' ? SessionTracker.getHistory()  : { sessions: [], avgDurationMs: 0, avgGames: 0 };
  const profile = typeof UserProfile    !== 'undefined' ? UserProfile.get()             : { visits: 1, firstSeen: Date.now() };
  const adState = typeof AdEngine_v14   !== 'undefined' ? AdEngine_v14.getState()       : { count: 0 };
  const utmStats = UTMTracker.getStats();
  const strength = typeof SessionTracker !== 'undefined' ? SessionTracker.getSessionStrength() : 'casual';

  // Estimativas por benchmarks de portais de jogos HTML5 BR
  const RPM = { casual: 0.80, engaged: 1.40, heavy: 2.20 };
  const CTR = { casual: 0.012, engaged: 0.018, heavy: 0.025 };
  const rpm  = RPM[strength]  || 1.0;
  const ctr  = CTR[strength]  || 0.015;

  const totalSessions   = hist.sessions.length || 1;
  const avgDurMin       = Math.round((hist.avgDurationMs || 0) / 60000);
  const avgGames        = hist.avgGames || 1;
  const impressions     = adState.count || 0;
  const estimatedClicks = +(impressions * ctr).toFixed(1);
  const estimatedRevBRL = +((impressions / 1000) * rpm).toFixed(4);
  const daysSince       = Math.max(1, Math.round((Date.now() - (profile.firstSeen || Date.now())) / 86400000));
  const sessPerDay      = +(totalSessions / daysSince).toFixed(2);
  const projMonthly     = +((sessPerDay * 30 * avgGames * (rpm / 1000))).toFixed(2);

  const metrics = {
    profile:     { strength, visits: profile.visits || 1 },
    sessions:    { total: totalSessions, avgDurationMinutes: avgDurMin, avgGamesPerSession: avgGames, sessionsPerDay: sessPerDay },
    ads:         { impressions, estimatedClicks, estimatedRevenueBRL: estimatedRevBRL, rpm: `R$ ${rpm}`, ctr: `${(ctr*100).toFixed(1)}%` },
    projections: { monthlyRevenueBRL: `R$ ${projMonthly}`, monthlyImpressions: Math.round(sessPerDay * 30 * avgGames) },
    traffic:     { sharesSent: utmStats.sent || 0, byChannel: utmStats.byChannel || {}, sources: utmStats.sources || {} },
    generatedAt: new Date().toISOString(),
  };

  console.group('%c💰 NeonPlay v14 — Revenue Metrics', 'color:#00eeff;font-weight:bold;font-size:13px');
  console.log(`👤 Perfil: ${strength} | Sessões: ${totalSessions} | Média: ${avgDurMin}min / ${avgGames} jogos`);
  console.log(`📊 Impressões: ${impressions} | CTR est.: ${estimatedClicks} cliques | Receita est.: R$ ${estimatedRevBRL}`);
  console.log(`📈 Projeção mensal: R$ ${projMonthly} (${Math.round(sessPerDay * 30)} sessões/mês)`);
  console.log(`📤 Compartilhamentos: ${utmStats.sent || 0}`);
  console.groupEnd();
  return metrics;
}

// ── Expõe M2–M8 globalmente ───────────────────────────────────────

if (typeof window !== 'undefined') {
  window.generateSEOData         = generateSEOData;
  window.renderStaticGameContent = renderStaticGameContent;
  window.applySEOToHead          = applySEOToHead;
  window.generateLandingPage     = generateLandingPage;
  window.LandingPageTypes        = LandingPageTypes;
  window.getTopSEOContent        = getTopSEOContent;
  window.UTMTracker              = UTMTracker;
  window.lazyLoadGames           = lazyLoadGames;
  window.lazyLoadThumbs          = lazyLoadThumbs;
  window.generateSitemapXML      = generateSitemapXML;
  window.downloadSitemap         = downloadSitemap;
  window.getRevenueMetrics       = getRevenueMetrics;
  window.AdEngine_v14            = AdEngine_v14;
}


// Expõe Growth Module globalmente
if (typeof window !== 'undefined') {
  window.SessionTracker     = SessionTracker;
  window.AutoPlaySystem     = AutoPlaySystem;
  window.AdEngine           = AdEngine;
  window.DynamicSEO         = DynamicSEO;
  window.ShareSystem        = ShareSystem;
  window.getActiveGames     = getActiveGames;
  window.UserProfile        = UserProfile;
  window.GamePreloader      = GamePreloader;
  window.getBusinessMetrics = getBusinessMetrics;
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

  // ── Growth Module v14 Init ──────────────────────────────────────
  UserProfile.init();
  ShareSystem.detectReferral();
  UTMTracker.trackTrafficSource();     // M6 — detecta fonte de tráfego
  AdEngine_v14.initAll();              // M3 — inicializa slots .ad-block[data-ad-pos]
  lazyLoadThumbs();                    // M7 — lazy load de imagens
  window.addEventListener('beforeunload', () => SessionTracker.flush(), { once: true });

  const path = location.pathname;
  // S5 — Long-tail keyword pages
  checkLongTailPage();

  if      (path.includes('game.html'))     initGamePage();
  else if (path.includes('category.html')) initCategoryPage();
  else if (path.includes('404'))           handle404();
  else                                     initHomePage();

  // Warmup: pré-verifica os 12 jogos mais populares após 90s de idle
  // Só roda se o usuário não estiver numa página de jogo
  if (!path.includes('game.html')) {
    GameWarmup.start(12, 90000);
  }
});
