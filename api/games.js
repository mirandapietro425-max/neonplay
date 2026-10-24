'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CACHE_MS = 10 * 60 * 1000;
const SAUSI_REGISTRY_URL = 'https://raw.githubusercontent.com/sausi-7/games/main/games/registry.json';
const GAMEPIX_FEED_URL = 'https://games.gamepix.com/games';
const cache = new Map();

// Jogos de um dos repositórios indicados na pesquisa do projeto; os destinos são GitHub Pages.
const BROWSER_GAMES = [
  ['snake','Snake','arcade','Coma, cresça e evite colidir consigo mesmo.'],
  ['pong','Pong','arcade','Partida de Pong contra a CPU.'],
  ['2048','2048','puzzle','Deslize e combine peças até chegar a 2048.'],
  ['tetris','Tetris','puzzle','Empilhe peças e complete linhas.'],
  ['breakout','Breakout','arcade','Rebata a bola e quebre os blocos.'],
  ['minesweeper','Minesweeper','puzzle','Descubra as casas seguras e marque as minas.'],
  ['wordle','Wordle','quiz','Descubra a palavra em tentativas limitadas.'],
  ['flappy-bird','Flappy Bird','arcade','Toque para voar entre os obstáculos.'],
  ['dino-dash','Dino Dash','arcade','Corra, pule e desvie dos obstáculos.']
];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function safeText(value, max = 500) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : '';
  } catch (_) {
    return '';
  }
}

function normalizeCategory(value) {
  const source = safeText(value, 50).toLowerCase();
  const aliases = {
    racing: 'corrida', shooter: 'acao', sports: 'esporte', platformer: 'plataforma',
    board: 'tabuleiro', 'word-quiz': 'quiz', '3d': '3d', casual: 'casual',
    puzzle: 'puzzle', arcade: 'arcade', aventura: 'aventura', acao: 'acao'
  };
  return aliases[source] || source || 'arcade';
}

function readLocalGames() {
  try {
    const file = path.join(process.cwd(), 'games-imported.json');
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return (Array.isArray(raw.games) ? raw.games : []).filter(g => g && g.id && g.title && g.route).map(g => {
      const thumbCandidate = safeHttpUrl(g.thumbnail) || (typeof g.thumbnail === 'string' && g.thumbnail.startsWith('/') ? g.thumbnail : '');
      // Favicon/icon rasters são pequenos demais para uma capa de catálogo: usa a arte SVG nesse caso.
      const thumbnail = /(?:favicon(?:-[0-9]+)?\.png$|\/icon\.png$|pc32@?2x?\.png$)/i.test(thumbCandidate) ? '' : thumbCandidate;
      return {
      id: safeText(g.id, 100), source: 'local', sourceLabel: g.mode === 'server' ? 'Servidor externo' : 'No NeonPlay',
      title: safeText(g.title, 140), category: normalizeCategory(g.category || g.label),
      label: safeText(g.label || 'HTML5', 80), description: safeText(g.description, 700),
      thumbnail,
      icon: safeText(g.icon || '🎮', 12), accent: /^#[0-9a-f]{6}$/i.test(g.accent || '') ? g.accent : '#705bdb',
      route: safeText(g.route, 300), launchUrl: safeText(g.localPath || g.launchUrl, 400),
      mode: g.mode === 'server' ? 'server' : 'local', license: safeText(g.license || '', 80),
      sourceRepo: safeText(g.sourceRepo || '', 150)
    }; });
  } catch (_) {
    return [];
  }
}

async function fetchJson(url, timeoutMs = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'NeonPlay/1.0 (game catalog)' },
      cache: 'no-store', signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function cachedJson(key, url) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < CACHE_MS) return entry.value;
  const value = await fetchJson(url);
  cache.set(key, { at: Date.now(), value });
  return value;
}

function unwrapList(payload, candidates) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.result)) return payload.result;
  for (const key of candidates) if (payload && Array.isArray(payload[key])) return payload[key];
  if (payload && payload.data && Array.isArray(payload.data.games)) return payload.data.games;
  if (payload && payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  return [];
}

async function getSausiGames() {
  try {
    const payload = await cachedJson('sausi-registry', SAUSI_REGISTRY_URL);
    const rows = unwrapList(payload, ['games', 'items']);
    return rows.filter(g => g && g.slug && g.name && g.path && /^games\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/i.test(g.path))
      .map(g => {
        const slug = safeText(g.slug, 100);
        const filePath = g.path.split('/').map(encodeURIComponent).join('/');
        const category = normalizeCategory(g.category);
        return {
          id: slug, source: 'sausi', sourceLabel: 'Indie · Sausi Games',
          title: safeText(g.name, 140), category, label: categoryLabel(category),
          description: safeText(g.description || 'Jogo HTML5 para navegador.', 700),
          thumbnail: '', icon: categoryIcon(category), accent: categoryColor(category),
          route: '/api-game.html?source=sausi&id=' + encodeURIComponent(slug),
          launchUrl: 'https://sausi-7.github.io/games/' + filePath,
          sourceRepo: 'https://github.com/sausi-7/games',
          sourceRegistry: 'https://github.com/sausi-7/games/blob/main/games/registry.json',
          license: 'MIT', tags: Array.isArray(g.tags) ? g.tags.map(t => safeText(t, 50)).slice(0, 12) : [],
          tech: safeText(g.tech || 'HTML5', 30), mode: 'external'
        };
      });
  } catch (_) {
    return [];
  }
}

function getBrowserGames() {
  return BROWSER_GAMES.map(([id, title, cat, description]) => ({
    id, source: 'browser-games', sourceLabel: 'Open source · Browser Games', title,
    category: normalizeCategory(cat), label: categoryLabel(normalizeCategory(cat)), description,
    thumbnail: '', icon: categoryIcon(normalizeCategory(cat)), accent: categoryColor(normalizeCategory(cat)),
    route: '/api-game.html?source=browser-games&id=' + encodeURIComponent(id),
    launchUrl: 'https://emjay045.github.io/browser-games/' + encodeURIComponent(id) + '/',
    sourceRepo: 'https://github.com/emjay045/browser-games', sourceRegistry: 'https://github.com/emjay045/browser-games',
    license: 'Verificar no repositório', mode: 'external'
  }));
}

function categoryLabel(category) {
  return ({ corrida: 'Corrida', esporte: 'Esporte', acao: 'Ação', plataforma: 'Plataforma',
    tabuleiro: 'Tabuleiro', quiz: 'Palavras e quiz', '3d': '3D', puzzle: 'Puzzle',
    arcade: 'Arcade', casual: 'Casual', aventura: 'Aventura' })[category] || 'Arcade';
}
function categoryIcon(category) {
  return ({ corrida: '🏎️', esporte: '⚽', acao: '✨', plataforma: '🏃', tabuleiro: '♟️',
    quiz: '🧠', '3d': '🌐', puzzle: '🧩', arcade: '🕹️', casual: '🎈', aventura: '🗺️' })[category] || '🎮';
}
function categoryColor(category) {
  return ({ corrida: '#f59e0b', esporte: '#10b981', acao: '#ef4444', plataforma: '#06b6d4',
    tabuleiro: '#64748b', quiz: '#3b82f6', '3d': '#8b5cf6', puzzle: '#7c3aed',
    arcade: '#ec4899', casual: '#f472b6', aventura: '#14b8a6' })[category] || '#705bdb';
}

function withSid(urlValue, sid) {
  const candidate = safeHttpUrl(urlValue);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    if (!/(^|\.)gamepix\.com$/i.test(url.hostname)) return '';
    url.searchParams.set('sid', sid);
    return url.href;
  } catch (_) { return ''; }
}

async function getGamePixGames() {
  const sid = safeText(process.env.GAMEPIX_SID, 160);
  if (!sid) return [];
  try {
    const query = new URLSearchParams({ sid, limit: '1000', offset: '0', order: 'q' });
    const payload = await cachedJson('gamepix:' + sid, GAMEPIX_FEED_URL + '?' + query.toString());
    const rows = unwrapList(payload, ['games', 'items', 'results']);
    return rows.filter(g => g && (g.id || g.gid) && g.title).map(g => {
      const id = safeText(g.id || g.gid, 160);
      const playUrl = withSid(g.url, sid) || 'https://games.gamepix.com/play/' + encodeURIComponent(id) + '?sid=' + encodeURIComponent(sid);
      const thumb = safeHttpUrl(g.thumbnailUrl) || safeHttpUrl(g.thumbnailUrl100);
      return {
        id, source: 'gamepix', sourceLabel: 'GamePix', title: safeText(g.title, 140),
        category: normalizeCategory(Array.isArray(g.categories) ? (g.categories[0] || g.category) : g.category),
        label: 'GamePix', description: safeText(g.description || g.desc_en || '', 700),
        thumbnail: thumb, icon: '🎮', accent: '#7c3aed',
        route: '/api-game.html?source=gamepix&id=' + encodeURIComponent(id),
        launchUrl: playUrl, sourceRepo: 'https://games.gamepix.com/gameinfo/',
        license: 'GamePix Publisher API', mode: 'external', rkScore: Number(g.rkScore) || 0,
        width: Number(g.width) || 0, height: Number(g.height) || 0,
        orientation: safeText(g.orientation || '', 20), responsive: Boolean(g.responsive)
      };
    });
  } catch (_) {
    return [];
  }
}

async function loadAll() {
  const local = readLocalGames();
  const [sausi, gamepix] = await Promise.all([getSausiGames(), getGamePixGames()]);
  const browserGames = getBrowserGames();
  const games = [...local, ...browserGames, ...sausi, ...gamepix];
  const sources = {
    local: local.length,
    browserGames: browserGames.length,
    sausi: sausi.length,
    gamepix: gamepix.length,
    gamepixConfigured: Boolean(safeText(process.env.GAMEPIX_SID, 160)),
    sausiAvailable: sausi.length > 0
  };
  return { version: 2, generatedAt: new Date().toISOString(), sources, games };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return send(res, 405, { error: 'Método não permitido.' });
  }
  const url = new URL(req.url || '/api/games', 'https://neonplay.invalid');
  const source = safeText(url.searchParams.get('source') || 'all', 40).toLowerCase();
  const id = safeText(url.searchParams.get('id') || '', 160);
  const query = safeText(url.searchParams.get('q') || '', 160).toLocaleLowerCase('pt-BR');
  try {
    const catalog = await loadAll();
    let games = catalog.games;
    if (source !== 'all') games = games.filter(g => g.source === source);
    if (id) games = games.filter(g => g.id === id);
    if (query) games = games.filter(g => (g.title + ' ' + g.description + ' ' + (g.tags || []).join(' ')).toLocaleLowerCase('pt-BR').includes(query));
    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.end();
    }
    return send(res, 200, { ...catalog, count: games.length, games });
  } catch (_) {
    return send(res, 200, {
      version: 2, generatedAt: new Date().toISOString(),
      sources: { local: readLocalGames().length, browserGames: getBrowserGames().length, sausi: 0, gamepix: 0, gamepixConfigured: Boolean(process.env.GAMEPIX_SID), sausiAvailable: false },
      count: 0, games: [], warning: 'Uma fonte externa não respondeu. Os links GamePix antigos do catálogo principal permanecem disponíveis.'
    });
  }
};

module.exports._test = { readLocalGames, getBrowserGames, getSausiGames, getGamePixGames, normalizeCategory, unwrapList };
