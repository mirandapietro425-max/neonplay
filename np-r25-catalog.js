/* NeonPlay R25 — biblioteca API-first. Mantém os links GamePix antigos intactos. */
(function () {
  'use strict';
  var API = '/api/games';
  var PAGE_SIZE = 24;
  var renderedCount = 0;
  var visibleGames = [];
  var allGames = [];
  var currentSource = 'all';
  var currentCategory = 'all';
  var queryText = '';
  var sorting = 'recommended';
  var API_READY = false;

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var normalize = function (value) {
    return String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  };
  var coverUrl = function (game) {
    var params = new URLSearchParams({ title: game.title || 'NeonPlay', category: game.category || 'arcade', icon: game.icon || '🎮', accent: game.accent || '' });
    return '/api/cover?' + params.toString();
  };
  var categoryLabels = {
    all: 'Todas as categorias', acao: 'Ação', corrida: 'Corrida', esporte: 'Esporte', puzzle: 'Puzzle',
    arcade: 'Arcade', plataforma: 'Plataforma', aventura: 'Aventura', casual: 'Casual',
    tabuleiro: 'Tabuleiro', quiz: 'Palavras e quiz', '3d': '3D', multiplayer: 'Multiplayer'
  };
  var iconMap = { corrida: '🏎️', esporte: '⚽', puzzle: '🧩', arcade: '🕹️', acao: '✨', shooter: '✨', plataforma: '🏃', aventura: '🗺️', casual: '🎈', tabuleiro: '♟️', quiz: '🧠', '3d': '🌐', multiplayer: '👥' };

  function setStatus(message) {
    var el = $('#np-local-status');
    if (el) el.textContent = message;
  }
  function category(value) { return categoryLabels[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Arcade'); }
  function safelyAddText(parent, tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value == null ? '' : String(value);
    parent.appendChild(node);
    return node;
  }
  function buildToolbar() {
    var section = $('#np-local-games'), grid = $('#np-local-grid');
    if (!section || !grid || $('#np-r25-toolbar')) return;
    var toolbar = document.createElement('div');
    toolbar.id = 'np-r25-toolbar'; toolbar.className = 'np-r25-toolbar';
    var searchWrap = document.createElement('label'); searchWrap.className = 'np-r25-search';
    safelyAddText(searchWrap, 'span', 'np-r25-search-icon', '⌕');
    var search = document.createElement('input'); search.id = 'np-r25-search'; search.type = 'search'; search.placeholder = 'Buscar na biblioteca…'; search.setAttribute('aria-label', 'Buscar jogos da biblioteca'); search.autocomplete = 'off'; searchWrap.appendChild(search);
    var categorySelect = document.createElement('select'); categorySelect.id = 'np-r25-category'; categorySelect.setAttribute('aria-label', 'Filtrar por categoria');
    Object.keys(categoryLabels).forEach(function (key) { var o = document.createElement('option'); o.value = key; o.textContent = categoryLabels[key]; categorySelect.appendChild(o); });
    var sourceSelect = document.createElement('select'); sourceSelect.id = 'np-r25-source'; sourceSelect.setAttribute('aria-label', 'Filtrar por origem');
    [['all','Todas as origens externas'],['browser-games','Browser Games · 9 jogos'],['sausi','Indie · Sausi Games'],['gamepix','GamePix API']].forEach(function (item) { var o=document.createElement('option');o.value=item[0];o.textContent=item[1];sourceSelect.appendChild(o); });
    var sortSelect = document.createElement('select'); sortSelect.id = 'np-r25-sort'; sortSelect.setAttribute('aria-label', 'Ordenar jogos');
    [['recommended','Recomendados'],['az','Nome A–Z'],['source','Origem']].forEach(function (item) { var o=document.createElement('option');o.value=item[0];o.textContent=item[1];sortSelect.appendChild(o); });
    [searchWrap, categorySelect, sourceSelect, sortSelect].forEach(function (el) { toolbar.appendChild(el); });
    section.insertBefore(toolbar, grid);
    search.addEventListener('input', function () { queryText = normalize(search.value); applyFilters(); });
    categorySelect.addEventListener('change', function () { currentCategory = categorySelect.value; applyFilters(); });
    sourceSelect.addEventListener('change', function () { currentSource = sourceSelect.value; applyFilters(); });
    sortSelect.addEventListener('change', function () { sorting = sortSelect.value; applyFilters(); });
  }
  function ensureMoreButton() {
    var section = $('#np-local-games'); if (!section || $('#np-r25-more')) return;
    var footer = document.createElement('div'); footer.className = 'np-r25-list-footer';
    var info = document.createElement('p'); info.id = 'np-r25-results'; info.className = 'np-r25-results';
    var more = document.createElement('button'); more.type = 'button'; more.id = 'np-r25-more'; more.className = 'np-r25-more'; more.textContent = 'Carregar mais jogos';
    more.addEventListener('click', function () { renderPage(); });
    footer.appendChild(info); footer.appendChild(more); section.appendChild(footer);
  }
  function dedupeGames(games) {
    var ids = new Set(), titles = new Set(), out = [];
    games.forEach(function (game) {
      if (!game || !game.id || !game.title || !game.source) return;
      var idKey = game.source + ':' + String(game.id), titleKey = normalize(game.title);
      if (ids.has(idKey)) return;
      // A biblioteca nova não deve repetir títulos idênticos entre os repositórios.
      if (titleKey && titles.has(titleKey)) return;
      ids.add(idKey); if (titleKey) titles.add(titleKey); out.push(game);
    });
    return out;
  }
  function applyFilters() {
    visibleGames = allGames.filter(function (game) {
      return (currentSource === 'all' || game.source === currentSource) &&
        (currentCategory === 'all' || game.category === currentCategory) &&
        (!queryText || normalize([game.title, game.description, game.label, (game.tags || []).join(' ')].join(' ')).indexOf(queryText) >= 0);
    });
    if (sorting === 'az') visibleGames.sort(function (a,b) { return a.title.localeCompare(b.title, 'pt-BR'); });
    else if (sorting === 'source') visibleGames.sort(function (a,b) { return String(a.sourceLabel).localeCompare(String(b.sourceLabel), 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR'); });
    else visibleGames.sort(function (a,b) { return (b.rkScore || 0) - (a.rkScore || 0); });
    renderedCount = 0;
    var grid = $('#np-local-grid'); if (grid) grid.textContent = '';
    renderPage();
  }
  function localFallback(game) { return game.thumbnail || coverUrl(game); }
  function renderCard(game) {
    var card = document.createElement('a'); card.className = 'np-game-card np-r25-card'; card.href = game.route || '#';
    card.setAttribute('aria-label', 'Jogar ' + game.title); card.dataset.source = game.source; card.dataset.id = game.id;
    var art = document.createElement('div'); art.className = 'np-game-art np-r25-art'; art.style.setProperty('--np-accent', /^#[0-9a-f]{6}$/i.test(game.accent || '') ? game.accent : '#6b4cc8');
    var image = document.createElement('img'); image.className = 'np-game-thumb np-r25-thumb'; image.src = localFallback(game); image.alt = game.title; image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', function () { if (!image.dataset.coverFallback) { image.dataset.coverFallback = '1'; image.src = coverUrl(game); } else { art.classList.add('np-r25-cover-error'); image.remove(); safelyAddText(art,'span','np-r25-cover-glyph',game.icon || iconMap[game.category] || '🎮'); } }, { once: false });
    art.appendChild(image);
    var info = document.createElement('div'); info.className = 'np-game-info np-r25-info';
    var label = game.sourceLabel || (game.source === 'local' ? 'No NeonPlay' : game.source === 'gamepix' ? 'GamePix' : 'Indie');
    safelyAddText(info,'small','np-r25-source',label);
    safelyAddText(info,'span','np-game-name',game.title);
    safelyAddText(info,'small','np-game-local-status',game.mode === 'server' ? 'Multiplayer · externo' : category(game.category));
    var meta = document.createElement('div'); meta.className = 'np-game-meta';
    safelyAddText(meta,'span','np-r25-source-repo', game.source === 'local' ? (game.mode === 'server' ? 'Servidor separado' : 'Hospedado aqui') : 'HTML5 · navegador');
    safelyAddText(meta,'span','np-game-play','JOGAR ↗'); info.appendChild(meta);
    card.appendChild(art); card.appendChild(info); return card;
  }
  function renderPage() {
    var grid = $('#np-local-grid'); if (!grid) return;
    var chunk = visibleGames.slice(renderedCount, renderedCount + PAGE_SIZE);
    chunk.forEach(function (game) { grid.appendChild(renderCard(game)); });
    renderedCount += chunk.length;
    var more = $('#np-r25-more'), results = $('#np-r25-results');
    if (results) results.textContent = visibleGames.length ? ('Mostrando ' + renderedCount + ' de ' + visibleGames.length + ' jogos') : 'Nenhum jogo corresponde a estes filtros.';
    if (more) { more.hidden = renderedCount >= visibleGames.length; more.disabled = !visibleGames.length; }
    var empty = $('#np-local-empty'); if (empty) empty.hidden = visibleGames.length > 0;
    var count = $('#np-local-count'); if (count) count.textContent = String(allGames.length);
  }

  /* Conserta capas via GamePix API quando há correspondência forte; nunca muda href. */
  var knownMisleadingCoverIds = new Set([
    'madalin-stunt','bloxd-io','bloxd-adventure','bloxd-strategy','territorial-io','territorial-strategy','territorial-adventure',
    'narrow-one','narrow-archer-tiro','narrow-2p','fortzone','narrow-adventure','fortzone-tiro','10x10','10x10-casual',
    'kopanito','kopanito-fun','kopanito-2p','kopanito-sport','bumpyball','bumpyball-casual','gang-shooter','brutal-defender',
    'archery-quest','stickwoman','dance-drop','happy-hen','what-the-hen','elephant-casual','elephant-garden','elephant-casual',
    'madalin-multiplayer','moon-city-stunt','territorial-shooter','battle-for-galaxy','galaxy-empire','superhero-girls','superhero-shooter','brutal-shooter','bumpyball-2p','crash-derby-2p','montezumba','dino-merge-race','doge-adventure','dogeminer2','doge-treasure','doge-clicker',
    'crypto-empire','ant-garden','ant-idle','ant-world','ant-conquest','soccer-managers','fortress-defense','superhero-city'
  ]);
  function repairLegacyCovers(gamepixGames) {
    var cards = $$('#grid article.g');
    if (!cards.length) return;
    var list = Array.isArray(gamepixGames) ? gamepixGames : [];
    var byId = new Map(); list.forEach(function (g) { if (g.id) byId.set(String(g.id), g); });
    cards.forEach(function (card) {
      var img = $('img', card), id = card.dataset.id || '', shownTitle = $('b', card), dataName = card.dataset.n || '';
      if (!img || img.dataset.npR25Fixed === '1') return;
      var match = byId.get(id) || null;
      var titleNorm = normalize(shownTitle ? shownTitle.textContent : img.alt), dataNorm = normalize(dataName);
      var best = match, bestScore = match ? 1000 : 0;
      if (!match && list.length) {
        list.forEach(function (game) {
          var candidate = normalize(game.title); if (!candidate || !game.thumbnail) return;
          var score = 0;
          if (candidate === titleNorm) score = 120;
          else if (candidate.length > 3 && dataNorm.indexOf(' ' + candidate + ' ') >= 0) score = 95;
          else if (candidate.length > 3 && dataNorm.startsWith(candidate + ' ')) score = 95;
          else {
            var a = candidate.split(' ').filter(function (t) { return t.length > 2; });
            var b = dataNorm.split(' ').filter(function (t) { return t.length > 2; });
            if (a.length && b.length) {
              var common = a.filter(function (t) { return b.indexOf(t) >= 0; }).length;
              score = 35 * common / Math.max(1, a.length);
              if (common >= 2) score += 18;
            }
          }
          if (score > bestScore) { bestScore = score; best = game; }
        });
      }
      if (best && best.thumbnail && bestScore >= 80) {
        img.src = best.thumbnail; img.dataset.npR25Fixed = '1'; img.dataset.npCoverSource = 'gamepix-api';
        img.style.objectFit = 'contain'; img.style.background = '#111722';
        img.addEventListener('error', function () { if (img.dataset.npCoverFallback !== '1') { img.dataset.npCoverFallback = '1'; img.src = coverUrl({title:shownTitle ? shownTitle.textContent : img.alt, category:card.dataset.c || 'arcade', accent:'#6d55c8'}); } }, {once:true});
      } else if (knownMisleadingCoverIds.has(id)) {
        // A capa atual identifica outro jogo; trocamos apenas a imagem, não o link antigo.
        img.dataset.npR25Fixed = '1'; img.dataset.npCoverSource = 'branded-fallback';
        img.src = coverUrl({title:shownTitle ? shownTitle.textContent : img.alt, category:card.dataset.c || 'arcade', accent:'#6d55c8'});
        img.style.objectFit = 'cover';
      } else {
        img.addEventListener('error', function () {
          if (img.dataset.npCoverFallback !== '1') {
            img.dataset.npCoverFallback = '1';
            img.src = coverUrl({title:shownTitle ? shownTitle.textContent : img.alt, category:card.dataset.c || 'arcade'});
          }
        }, {once:true});
      }
    });
  }

  function boot() {
    var section = $('#np-local-games'), grid = $('#np-local-grid');
    if (!section || !grid) return;
    document.body.classList.add('np-r24');
    buildToolbar(); ensureMoreButton();
    setStatus('Carregando catálogo por API…');
    fetch(API, { cache: 'no-store', headers: { Accept: 'application/json' } }).then(function (response) {
      if (!response.ok) throw new Error('API HTTP ' + response.status);
      return response.json();
    }).then(function (payload) {
      var games = Array.isArray(payload.games) ? payload.games : [];
      // O catálogo local R24 continua sendo renderizado pelo np-r24-local-catalog.js.
      // Esta seção apresenta apenas fontes externas, evitando duplicatas e conflitos de favoritos.
      allGames = dedupeGames(games.filter(function (game) { return game && game.source !== 'local'; }));
      API_READY = true;
      var browserCount = payload.sources && payload.sources.browserGames || 0;
      var sausiCount = payload.sources && payload.sources.sausi || 0;
      var gpCount = payload.sources && payload.sources.gamepix || 0;
      setStatus(allGames.length + ' jogos externos · ' + browserCount + ' Browser Games, ' + sausiCount + ' indie' + (gpCount ? ', ' + gpCount + ' GamePix API' : ''));
      var sourceSelect = $('#np-r25-source');
      if (sourceSelect) {
        var browserOption = $('option[value="browser-games"]', sourceSelect);
        if (browserOption) { browserOption.disabled = !(browserCount > 0); }
        var gpOption = $('option[value="gamepix"]', sourceSelect);
        if (gpOption) { gpOption.disabled = !gpCount; gpOption.textContent = gpCount ? 'GamePix API (' + gpCount + ')' : 'GamePix API · requer SID'; }
      }
      applyFilters();
      if (!sausiCount) setStatus(allGames.length + ' jogos externos · Sausi indisponível' + (gpCount ? ' · GamePix API ativa' : ''));
    }).catch(function () {
      allGames = [];
      applyFilters();
      setStatus('Fontes externas indisponíveis · biblioteca local continua disponível acima.');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
