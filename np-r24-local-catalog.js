/* NeonPlay R24 — catálogo principal formado pelos jogos realmente instalados no repositório. */
(function () {
  'use strict';

  var STORE = 'neonplay_favs_v4';
  var CATEGORY_NAMES = {
    puzzle: 'Puzzle',
    arcade: 'Arcade',
    corrida: 'Corrida',
    aventura: 'Aventura',
    multiplayer: 'Multiplayer',
    casual: 'Casual',
    estrategia: 'Estratégia',
    esporte: 'Esporte'
  };
  var CATEGORY_ICONS = {
    puzzle: '🧩', arcade: '🕹️', corrida: '🏎️', aventura: '🗺️',
    multiplayer: '👥', casual: '✨', estrategia: '♟️', esporte: '🏅'
  };
  var activeCategory = 'all';
  var query = '';
  var games = [];
  var favorites = new Set();
  var cards = [];

  function $(selector, root) { return (root || document).querySelector(selector); }
  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function safeText(value) { return String(value == null ? '' : value); }
  function loadFavorites() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE) || '[]');
      if (!Array.isArray(saved)) return;
      saved.forEach(function (item) {
        var id = item && typeof item === 'object' ? item.id : item;
        if (typeof id === 'string' && id) favorites.add(id);
      });
    } catch (_) { /* armazenamento local indisponível */ }
  }
  function saveFavorites() {
    try { localStorage.setItem(STORE, JSON.stringify(Array.from(favorites))); }
    catch (_) { /* não impedir o jogo se o navegador bloquear localStorage */ }
  }
  function normalizeCategory(value) {
    value = safeText(value).toLowerCase();
    return Object.prototype.hasOwnProperty.call(CATEGORY_NAMES, value) ? value : 'arcade';
  }
  function routeFor(game) {
    // Os jogos locais usam a página local-game.html; servidores passam pela checagem de saúde dela.
    if (typeof game.route === 'string' && /^local-game\.html\?game=[a-z0-9-]+$/i.test(game.route)) return game.route;
    return 'local-game.html?game=' + encodeURIComponent(game.id);
  }
  function makeCard(game, featured) {
    var category = normalizeCategory(game.category);
    var article = element('article', 'g np-r24-game-card' + (featured ? ' np-r24-featured-card' : ''));
    article.dataset.c = category;
    article.dataset.id = game.id;
    article.dataset.n = [game.title, game.description, game.label, CATEGORY_NAMES[category]].join(' ').toLowerCase();

    var link = element('a', 'np-r24-card-link');
    link.href = routeFor(game);
    link.setAttribute('aria-label', 'Jogar ' + game.title);

    var art = element('span', 'im np-r24-art');
    art.style.setProperty('--np-r24-accent', safeText(game.accent || '#2b6574'));
    var icon = element('span', 'np-r24-glyph', game.icon || CATEGORY_ICONS[category] || '🎮');
    icon.setAttribute('aria-hidden', 'true');
    art.appendChild(icon);

    if (typeof game.thumbnail === 'string' && game.thumbnail.charAt(0) === '/' && !/^\/\//.test(game.thumbnail)) {
      var img = element('img');
      img.src = game.thumbnail;
      img.alt = '';
      img.loading = featured ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () {
        img.remove();
        art.classList.add('np-r24-art-fallback');
      }, { once: true });
      art.appendChild(img);
    } else {
      art.classList.add('np-r24-art-fallback');
    }

    var title = element('b', 'np-r24-title', game.title);
    var meta = element('small', 'np-r24-meta', (CATEGORY_NAMES[category] || 'Jogo') + ' · ' + (game.mode === 'server' ? 'Servidor de jogo' : 'Hospedado no NeonPlay'));
    link.appendChild(art);
    link.appendChild(title);
    link.appendChild(meta);

    var fav = element('button', 'fv np-r24-fav', favorites.has(game.id) ? '♥' : '♡');
    fav.type = 'button';
    fav.dataset.id = game.id;
    fav.setAttribute('aria-label', (favorites.has(game.id) ? 'Remover dos favoritos: ' : 'Favoritar ') + game.title);
    fav.setAttribute('aria-pressed', favorites.has(game.id) ? 'true' : 'false');
    article.appendChild(link);
    article.appendChild(fav);
    return article;
  }
  function updateFavoriteButtons() {
    document.querySelectorAll('.np-r24-fav').forEach(function (button) {
      var active = favorites.has(button.dataset.id);
      button.textContent = active ? '♥' : '♡';
      button.classList.toggle('on', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      var game = games.find(function (item) { return item.id === button.dataset.id; });
      button.setAttribute('aria-label', (active ? 'Remover dos favoritos: ' : 'Favoritar ') + (game ? game.title : 'jogo'));
    });
    var count = $('#fn');
    if (count) count.textContent = String(games.filter(function (game) { return favorites.has(game.id); }).length);
  }
  function buildFilters() {
    var nav = $('#local-filters');
    if (!nav) return;
    nav.replaceChildren();
    var all = element('button', 'ch on', '🎮 Todos');
    all.type = 'button'; all.dataset.cat = 'all'; nav.appendChild(all);

    var fav = element('button', 'ch', '♥ Favoritos ');
    fav.type = 'button'; fav.dataset.cat = 'fav';
    var count = element('span', '', '0'); count.id = 'fn'; fav.appendChild(count); nav.appendChild(fav);

    var categories = [];
    games.forEach(function (game) {
      var cat = normalizeCategory(game.category);
      if (categories.indexOf(cat) < 0) categories.push(cat);
    });
    categories.sort(function (a, b) { return (CATEGORY_NAMES[a] || a).localeCompare(CATEGORY_NAMES[b] || b, 'pt-BR'); });
    categories.forEach(function (cat) {
      var button = element('button', 'ch', (CATEGORY_ICONS[cat] || '🎮') + ' ' + CATEGORY_NAMES[cat]);
      button.type = 'button'; button.dataset.cat = cat; nav.appendChild(button);
    });
    nav.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-cat]');
      if (!button || !nav.contains(button)) return;
      activeCategory = button.dataset.cat;
      nav.querySelectorAll('button').forEach(function (item) { item.classList.toggle('on', item === button); });
      try {
        if (activeCategory === 'all') history.replaceState(null, '', location.pathname + location.search);
        else history.replaceState(null, '', '#' + activeCategory);
      } catch (_) {}
      applyFilters();
    });
  }
  function applyFilters() {
    var visible = 0;
    cards.forEach(function (card) {
      var categoryMatch = activeCategory === 'all' || (activeCategory === 'fav' ? favorites.has(card.dataset.id) : card.dataset.c === activeCategory);
      var queryMatch = !query || (card.dataset.n || '').indexOf(query) >= 0;
      var show = categoryMatch && queryMatch;
      card.hidden = !show;
      if (show) visible++;
    });
    var count = $('#cnt');
    if (count) count.textContent = String(visible);
    var empty = $('#empty');
    if (empty) empty.hidden = visible !== 0;
    var sectionTitle = $('#gt');
    if (sectionTitle) sectionTitle.textContent = activeCategory === 'fav' ? 'Seus favoritos' : 'Jogos instalados no NeonPlay';
    updateFavoriteButtons();
  }
  function render(gamesList) {
    var grid = $('#grid');
    var featured = $('#np-r24-featured');
    var counterLabel = $('#np-r24-count-label');
    if (!grid || !featured) throw new Error('A estrutura R24 da homepage não foi encontrada.');

    games = gamesList.filter(function (game) {
      return game && typeof game.id === 'string' && typeof game.title === 'string' && game.route;
    });
    var validIds = new Set(games.map(function (game) { return game.id; }));
    favorites = new Set(Array.from(favorites).filter(function (id) { return validIds.has(id); }));
    saveFavorites();

    grid.replaceChildren();
    featured.replaceChildren();
    var featuredIds = ['2048', 'hexgl', 'tap-tap-tap', 'clumsy-bird'];
    var featureGames = featuredIds.map(function (id) { return games.find(function (game) { return game.id === id; }); }).filter(Boolean);
    if (!featureGames.length) featureGames = games.slice(0, 4);
    featureGames.forEach(function (game) { featured.appendChild(makeCard(game, true)); });
    games.forEach(function (game) { grid.appendChild(makeCard(game, false)); });
    cards = Array.from(grid.children);
    if (counterLabel) counterLabel.textContent = 'experiências';
    buildFilters();
    updateFavoriteButtons();
    applyFilters();

    document.addEventListener('click', function (event) {
      var button = event.target.closest('.np-r24-fav');
      if (!button) return;
      event.preventDefault();
      var id = button.dataset.id;
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      saveFavorites();
      updateFavoriteButtons();
      if (activeCategory === 'fav') applyFilters();
    });

    var searchForm = $('form.sf');
    var searchInput = $('#q');
    if (searchInput) {
      searchInput.placeholder = 'Buscar nos jogos instalados…';
      searchInput.addEventListener('input', function () {
        query = safeText(searchInput.value).trim().toLocaleLowerCase('pt-BR');
        applyFilters();
      });
    }
    if (searchForm) searchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      query = searchInput ? safeText(searchInput.value).trim().toLocaleLowerCase('pt-BR') : '';
      applyFilters();
      var section = $('#grid');
      if (section && section.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var hash = location.hash.slice(1);
    if (hash) {
      var matchingFilter = $('#local-filters button[data-cat="' + hash + '"]');
      if (matchingFilter) matchingFilter.click();
    }
  }
  function showFailure(error) {
    var grid = $('#grid');
    var count = $('#cnt');
    var empty = $('#empty');
    var status = element('div', 'np-r24-load-error');
    status.appendChild(element('strong', '', 'Não foi possível carregar a biblioteca local.'));
    status.appendChild(element('p', '', 'O arquivo games-imported.json não respondeu. Os jogos antigos não serão mostrados como se fossem jogos instalados.'));
    status.appendChild(element('small', '', safeText(error && error.message ? error.message : 'Erro de leitura do catálogo.')));
    if (grid) grid.replaceChildren(status);
    if (count) count.textContent = '0';
    if (empty) empty.hidden = true;
    var label = $('#np-r24-count-label');
    if (label) label.textContent = 'experiências';
  }
  function boot() {
    var grid = $('#grid');
    if (!grid || !$('#local-filters') || !$('#np-r24-featured')) return;
    grid.replaceChildren(element('div', 'np-r24-loading', 'Carregando jogos instalados…'));
    loadFavorites();
    fetch('/games-imported.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status + ' ao ler games-imported.json');
        return response.json();
      })
      .then(function (payload) {
        if (!payload || !Array.isArray(payload.games)) throw new Error('O catálogo não contém uma lista games válida.');
        render(payload.games);
      })
      .catch(showFailure);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
