/**
 * NeonPlay — script.js
 * Portal de Jogos HTML5
 * Usa GAMES_DB e CATEGORIES_DATA de games-data.js
 */

// ============================================================
// 1. UTILITÁRIOS
// ============================================================

/** Formata número de jogadas: 1820000 → "1.8M" */
function formatPlays(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

/** Retorna nome legível da categoria */
function getCatName(id) {
  return getCategoryData(id).name;
}

/** Retorna emoji da categoria */
function getCatEmoji(id) {
  return getCategoryData(id).emoji;
}

/** Retorna CSS do gradiente de fundo da categoria */
function getCatBg(id) {
  return `linear-gradient(${getCategoryData(id).gradient})`;
}

/** Obtém parâmetro da URL */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Mostra uma notificação toast */
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

/** Randomiza número entre min e max */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ============================================================
// 2. SISTEMA DE FAVORITOS (localStorage)
// ============================================================
const FAV_KEY = "neonplay_favorites_v2";

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
  catch { return []; }
}

function saveFavorites(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function isFavorite(gameId) {
  return getFavorites().includes(gameId);
}

function toggleFavorite(gameId) {
  let favs = getFavorites();
  const idx = favs.indexOf(gameId);
  if (idx === -1) {
    favs.push(gameId);
    showToast("❤️ Adicionado aos favoritos!");
  } else {
    favs.splice(idx, 1);
    showToast("💔 Removido dos favoritos.");
  }
  saveFavorites(favs);
  updateFavCount();
  renderFavPanel();
}

function updateFavCount() {
  const count = getFavorites().length;
  document.querySelectorAll("#favCount").forEach(el => el.textContent = count);
}

function renderFavPanel() {
  const body = document.getElementById("favPanelBody");
  if (!body) return;
  const favs = getFavorites();
  const favGames = GAMES_DB.filter(g => favs.includes(g.id));
  if (favGames.length === 0) {
    body.innerHTML = `<div class="fav-empty"><span class="fav-empty-icon">💔</span>Você ainda não tem favoritos.<br><br>Clique em ♡ em qualquer jogo para salvar!</div>`;
    return;
  }
  body.innerHTML = favGames.map(g => `
    <a href="game.html?id=${g.id}" class="fav-game-item">
      <div class="fav-game-thumb" style="background:${getCatBg(g.cat)}">${getCatEmoji(g.cat)}</div>
      <div class="fav-game-info">
        <div class="fg-name">${g.namePT}</div>
        <div class="fg-cat">${getCatEmoji(g.cat)} ${getCatName(g.cat)}</div>
      </div>
      <button class="fav-remove" onclick="event.preventDefault();toggleFavorite('${g.id}')" title="Remover">✕</button>
    </a>
  `).join("");
}

// ============================================================
// 3. CRIAR CARD DE JOGO (HTML)
// ============================================================
// Max plays para normalizar a barra de popularidade
const MAX_PLAYS = Math.max(...GAMES_DB.map(g => g.plays));

function createGameCard(game) {
  const isFav = isFavorite(game.id);
  const badge = game.badge
    ? `<span class="card-badge card-badge--${game.badge}">${game.badge === 'hot' ? '🔥 Hot' : game.badge === 'new' ? '✨ Novo' : '⭐ Top'}</span>`
    : "";
  const popularity = Math.min(100, Math.round((game.plays / MAX_PLAYS) * 100));
  const bg = getCatBg(game.cat);
  const emoji = getCatEmoji(game.cat);

  // Usa thumbnail real se disponível, senão usa gradiente + emoji
  const thumbContent = game.thumb
    ? `<img src="${game.thumb}" alt="${game.namePT}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-thumb-emoji\\' style=\\'background:${bg}\\'>${emoji}</div>'">`
    : `<div class="card-thumb-emoji" style="background:${bg}">${emoji}</div>`;

  return `
    <article class="game-card${game.featured ? " game-card--featured" : ""}"
             onclick="location.href='game.html?id=${game.id}'"
             role="article"
             aria-label="${game.namePT}">
      <div class="card-thumb">
        ${thumbContent}
        ${badge}
        <button class="card-fav${isFav ? " active" : ""}"
                onclick="event.stopPropagation();toggleFavorite('${game.id}');this.classList.toggle('active')"
                aria-label="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
          ${isFav ? "❤️" : "🤍"}
        </button>
        <div class="card-overlay">
          <div class="card-play-btn">▶</div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-name" title="${game.namePT}">${game.namePT}</div>
        <div class="card-meta">
          <span class="card-cat">${emoji} ${getCatName(game.cat)}</span>
          <span class="card-rating">⭐ ${game.rating}</span>
        </div>
        <div class="card-popularity">👾 ${formatPlays(game.plays)} jogadas</div>
        <div class="pop-bar"><div class="pop-fill" style="width:${popularity}%"></div></div>
      </div>
    </article>
  `;
}

// ============================================================
// 4. BARRA DE BUSCA
// ============================================================
function initSearch() {
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  if (!input || !results) return;

  let debounceTimer;

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => performSearch(input.value.trim()), 200);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length > 0) results.classList.add("active");
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".search-wrapper")) {
      results.classList.remove("active");
    }
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && input.value.trim()) {
      const q = input.value.trim().toLowerCase();
      const match = GAMES_DB.find(g =>
        g.namePT.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)
      );
      if (match) location.href = `game.html?id=${match.id}`;
    }
  });
}

function performSearch(query) {
  const results = document.getElementById("searchResults");
  if (!results) return;

  if (query.length < 2) {
    results.classList.remove("active");
    return;
  }

  const matches = searchGames(query).slice(0, 6);

  if (matches.length === 0) {
    results.innerHTML = `<div class="search-result-item"><div class="search-result-info"><div class="sr-name" style="color:var(--text-muted)">Nenhum jogo encontrado</div></div></div>`;
  } else {
    results.innerHTML = matches.map(g => `
      <div class="search-result-item" onclick="location.href='game.html?id=${g.id}'" role="option">
        <div class="search-result-thumb" style="background:${getCatBg(g.cat)}">${getCatEmoji(g.cat)}</div>
        <div class="search-result-info">
          <div class="sr-name">${g.namePT}</div>
          <div class="sr-cat">${getCatEmoji(g.cat)} ${getCatName(g.cat)} · ⭐ ${g.rating}</div>
        </div>
      </div>
    `).join("");
  }
  results.classList.add("active");
}

// ============================================================
// 5. HAMBURGER MENU
// ============================================================
function initHamburger() {
  const btn = document.getElementById("hamburger");
  const nav = document.getElementById("mobileNav");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    nav.classList.toggle("active");
  });
}

// ============================================================
// 6. PAINEL DE FAVORITOS
// ============================================================
function initFavPanel() {
  const openBtn = document.getElementById("favBtn");
  const panel = document.getElementById("favPanel");
  const closeBtn = document.getElementById("favClose");
  const overlay = document.getElementById("overlay");
  if (!openBtn || !panel) return;

  function openPanel() {
    panel.classList.add("open");
    if (overlay) overlay.classList.add("active");
    renderFavPanel();
  }
  function closePanel() {
    panel.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
  }

  openBtn.addEventListener("click", openPanel);
  if (closeBtn) closeBtn.addEventListener("click", closePanel);
  if (overlay) overlay.addEventListener("click", closePanel);
}

// ============================================================
// 7. HOME PAGE — renderiza seções
// ============================================================
function initHomePage() {
  if (!document.getElementById("featuredGrid")) return;

  // Featured grid — jogos com featured=true ordenados por plays
  const featuredGames = getFeaturedGames();
  document.getElementById("featuredGrid").innerHTML =
    featuredGames.map(g => createGameCard(g)).join("");

  // Grid principal (todos os jogos, paginado por plays)
  const sorted = [...GAMES_DB].sort((a, b) => b.plays - a.plays);
  let page = 0;
  const perPage = 8;

  function renderPage() {
    const slice = sorted.slice(0, (page + 1) * perPage);
    document.getElementById("gamesGrid").innerHTML =
      slice.map(g => createGameCard(g)).join("");
    const btn = document.getElementById("loadMoreBtn");
    if (btn) btn.style.display = slice.length >= sorted.length ? "none" : "flex";
  }

  renderPage();

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      const spinner = loadMoreBtn.querySelector(".load-more-spinner");
      const text = loadMoreBtn.querySelector(".load-more-text");
      text.style.display = "none";
      spinner.style.display = "inline";
      setTimeout(() => {
        page++;
        renderPage();
        text.style.display = "inline";
        spinner.style.display = "none";
      }, 800);
    });
  }

  // Top 5 sidebar
  const top5 = getTopGames(5);
  const top5El = document.getElementById("top5List");
  if (top5El) {
    top5El.innerHTML = top5.map((g, i) => `
      <a href="game.html?id=${g.id}" class="top5-item">
        <div class="top5-rank">${i + 1}</div>
        <div class="top5-thumb" style="background:${getCatBg(g.cat)}">${getCatEmoji(g.cat)}</div>
        <div class="top5-info">
          <div class="t5-name">${g.namePT}</div>
          <div class="t5-plays">👾 ${formatPlays(g.plays)}</div>
        </div>
      </a>
    `).join("");
  }

  // Grid de categorias
  const catsGrid = document.getElementById("categoriesGrid");
  if (catsGrid) {
    catsGrid.innerHTML = CATEGORIES_DATA.map(cat => `
      <a href="category.html?cat=${cat.id}" class="cat-card"
         style="--cat-color:${cat.color}; border-color: ${cat.color}22;">
        <span class="cat-card-icon">${cat.emoji}</span>
        <div class="cat-card-name" style="color:${cat.color}">${cat.name}</div>
        <div class="cat-card-count">${getGameCount(cat.id)} jogos</div>
      </a>
    `).join("");
  }

  // Animação de partículas no hero
  initHeroParticles();
}

// ============================================================
// 8. PARTÍCULAS DO HERO
// ============================================================
function initHeroParticles() {
  const container = document.getElementById("particles");
  if (!container) return;
  const colors = ["#00f0ff", "#b24bff", "#ff2d78", "#00ff88", "#ffe600"];
  for (let i = 0; i < 25; i++) {
    const p = document.createElement("div");
    p.className = "hero-particle";
    const size = randInt(3, 8);
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${randInt(0, 100)}%;
      background: ${colors[randInt(0, colors.length - 1)]};
      animation-duration: ${randInt(8, 18)}s;
      animation-delay: ${-randInt(0, 15)}s;
      box-shadow: 0 0 ${size * 2}px currentColor;
    `;
    container.appendChild(p);
  }
}

// ============================================================
// 9. GAME PAGE
// ============================================================
function initGamePage() {
  if (!document.getElementById("gameTitle")) return;

  // ID agora é string (slug)
  const id = getQueryParam("id");
  const game = GAMES_DB.find(g => g.id === id);

  if (!game) {
    document.getElementById("gameTitle").textContent = "Jogo não encontrado";
    return;
  }

  // SEO dinâmico
  document.title = `${game.namePT} — Jogar Online Grátis | NeonPlay`;
  setMeta("pageDesc",  `Jogue ${game.namePT} online grátis no NeonPlay! ${game.desc}`);
  setMeta("ogTitle",   `${game.namePT} — NeonPlay`);
  setMeta("ogDesc",    game.desc);
  setMeta("twTitle",   `${game.namePT} — NeonPlay`);

  // Schema.org
  const schema = document.getElementById("gameSchema");
  if (schema) {
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": game.namePT,
      "description": game.desc,
      "url": window.location.href,
      "applicationCategory": "Game",
      "genre": getCatName(game.cat),
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": game.rating,
        "bestRating": 5,
        "ratingCount": Math.round(game.plays / 10)
      }
    });
  }

  // Breadcrumb
  const bcCat = document.getElementById("bcCategory");
  if (bcCat) {
    bcCat.textContent = getCatName(game.cat);
    bcCat.href = `category.html?cat=${game.cat}`;
  }
  const bcGame = document.getElementById("bcGame");
  if (bcGame) bcGame.textContent = game.namePT;

  // Preenche splash
  document.getElementById("gameTitle").textContent = game.namePT;
  const iframeTitle = document.getElementById("iframeTitle");
  if (iframeTitle) iframeTitle.textContent = game.namePT;

  // Thumb: usa imagem real ou gradiente com emoji
  const thumb = document.getElementById("splashThumb");
  if (thumb) {
    if (game.thumb) {
      thumb.innerHTML = `<img src="${game.thumb}" alt="${game.namePT}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" onerror="this.parentElement.style.background='${getCatBg(game.cat)}';this.remove()">`;
    } else {
      thumb.style.background = getCatBg(game.cat);
      thumb.textContent = getCatEmoji(game.cat);
      thumb.style.fontSize = "5rem";
      thumb.style.display = "flex";
      thumb.style.alignItems = "center";
      thumb.style.justifyContent = "center";
    }
  }

  const gameCat = document.getElementById("gameCat");
  if (gameCat) gameCat.textContent = `${getCatEmoji(game.cat)} ${getCatName(game.cat)}`;

  const gameRating = document.getElementById("gameRating");
  if (gameRating) gameRating.textContent = `⭐ ${game.rating}`;

  const gamePlays = document.getElementById("gamePlays");
  if (gamePlays) gamePlays.textContent = `👾 ${formatPlays(game.plays)} jogadas`;

  const gameDesc = document.getElementById("gameDesc");
  if (gameDesc) gameDesc.textContent = game.desc;

  // Info card
  const gameInfoTitle = document.getElementById("gameInfoTitle");
  if (gameInfoTitle) gameInfoTitle.textContent = `Sobre ${game.namePT}`;

  const gameInfoDesc = document.getElementById("gameInfoDesc");
  if (gameInfoDesc) gameInfoDesc.textContent = game.descLong || game.desc;

  const gameTags = document.getElementById("gameTags");
  if (gameTags) {
    gameTags.innerHTML = game.tags.map(t => `<span class="game-tag">#${t}</span>`).join("");
  }

  // Botão favoritar
  function updateFavBtn() {
    const btn = document.getElementById("favGameBtn");
    const btnI = document.getElementById("favIframeBtn");
    const fav = isFavorite(game.id);
    if (btn) { btn.textContent = fav ? "❤️ Favoritado" : "♡ Favoritar"; btn.classList.toggle("active", fav); }
    if (btnI) btnI.textContent = fav ? "❤️" : "♡";
  }
  updateFavBtn();

  const favGameBtn = document.getElementById("favGameBtn");
  if (favGameBtn) favGameBtn.addEventListener("click", () => { toggleFavorite(game.id); updateFavBtn(); });

  const favIframeBtn = document.getElementById("favIframeBtn");
  if (favIframeBtn) favIframeBtn.addEventListener("click", () => { toggleFavorite(game.id); updateFavBtn(); });

  // Botão Jogar Agora
  const playNowBtn = document.getElementById("playNowBtn");
  if (playNowBtn) playNowBtn.addEventListener("click", () => launchGame(game));

  // Reiniciar
  const restartBtn = document.getElementById("restartBtn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      const frame = document.getElementById("gameFrame");
      if (frame) frame.src = frame.src;
    });
  }

  // Tela cheia
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      const wrapper = document.getElementById("iframeWrapper");
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (wrapper) {
        wrapper.requestFullscreen().catch(() => {});
      }
    });
  }

  // Jogos relacionados
  const related = getRelatedGames(game, 6);
  const relFallback = related.length < 4
    ? [...related, ...GAMES_DB.filter(g => g.id !== game.id).slice(0, 6 - related.length)]
    : related;
  const relatedEl = document.getElementById("relatedGames");
  if (relatedEl) relatedEl.innerHTML = relFallback.map(g => createGameCard(g)).join("");

  // Sidebar hot games
  const sidebarHot = document.getElementById("sidebarHot");
  if (sidebarHot) {
    const hot = getTopGames(5);
    sidebarHot.innerHTML = hot.map((g, i) => `
      <a href="game.html?id=${g.id}" class="top5-item">
        <div class="top5-rank">${i + 1}</div>
        <div class="top5-thumb" style="background:${getCatBg(g.cat)}">${getCatEmoji(g.cat)}</div>
        <div class="top5-info">
          <div class="t5-name">${g.namePT}</div>
          <div class="t5-plays">👾 ${formatPlays(g.plays)}</div>
        </div>
      </a>
    `).join("");
  }
}

/** Lança o jogo no iframe */
function launchGame(game) {
  const splash = document.getElementById("gameSplash");
  const container = document.getElementById("gameIframeContainer");
  const frame = document.getElementById("gameFrame");
  const loading = document.getElementById("iframeLoading");

  if (!splash || !container || !frame) return;

  splash.style.display = "none";
  container.style.display = "block";

  loading.style.display = "flex";
  frame.style.opacity = "0";

  frame.src = game.src;

  frame.onload = () => {
    loading.style.display = "none";
    frame.style.opacity = "1";
    frame.style.transition = "opacity 0.3s";
  };

  setTimeout(() => {
    if (loading.style.display !== "none") {
      loading.innerHTML = `<p style="color:var(--text-muted)">⚠️ O jogo está demorando para carregar.<br><small>Verifique sua conexão ou tente outro jogo.</small></p>`;
    }
  }, 10000);
}

/** Helper meta tags */
function setMeta(id, content) {
  const el = document.getElementById(id);
  if (el) el.setAttribute("content", content);
}

// ============================================================
// 10. CATEGORY PAGE
// ============================================================
function initCategoryPage() {
  if (!document.getElementById("categoryGrid")) return;

  const catParam = getQueryParam("cat");
  let currentCat = catParam || "all";
  let currentSort = "popular";
  let currentPage = 0;
  const perPage = 12;

  function updateCatHero(catId) {
    const cat = catId === "all"
      ? { emoji: "🎮", name: "Todos os Jogos", color: "#00f0ff" }
      : getCategoryData(catId);

    const icon = document.getElementById("catHeroIcon");
    const title = document.getElementById("catHeroTitle");
    const count = document.getElementById("catHeroCount");

    if (icon) icon.textContent = cat.emoji;
    if (title) title.textContent = cat.name;
    document.title = `${cat.name} — NeonPlay`;

    const filteredCount = getFiltered(catId).length;
    if (count) count.textContent = `${filteredCount} jogos disponíveis`;

    const bcCat = document.getElementById("bcCat");
    if (bcCat) bcCat.textContent = cat.name;
  }

  function getFiltered(catId) {
    let games = catId === "all" ? [...GAMES_DB] : GAMES_DB.filter(g => g.cat === catId);
    if (currentSort === "popular") games.sort((a, b) => b.plays - a.plays);
    else if (currentSort === "newest") games.sort((a, b) => b.year - a.year || b.id.localeCompare(a.id));
    else if (currentSort === "name") games.sort((a, b) => a.namePT.localeCompare(b.namePT));
    else if (currentSort === "rating") games.sort((a, b) => b.rating - a.rating);
    return games;
  }

  function renderGames(reset = true) {
    if (reset) currentPage = 0;
    const filtered = getFiltered(currentCat);
    const slice = filtered.slice(0, (currentPage + 1) * perPage);
    document.getElementById("categoryGrid").innerHTML =
      slice.map(g => createGameCard(g)).join("");

    const btn = document.getElementById("loadMoreBtn");
    if (btn) btn.style.display = slice.length >= filtered.length ? "none" : "flex";

    updateCatHero(currentCat);
  }

  renderGames();

  function setActiveChip(catId) {
    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.cat === catId);
    });
  }
  setActiveChip(currentCat);

  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      currentCat = chip.dataset.cat;
      setActiveChip(currentCat);
      renderGames();
      const url = new URL(window.location);
      if (currentCat === "all") url.searchParams.delete("cat");
      else url.searchParams.set("cat", currentCat);
      window.history.replaceState({}, "", url);
    });
  });

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      renderGames();
    });
  }

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      const text = loadMoreBtn.querySelector(".load-more-text");
      const spinner = loadMoreBtn.querySelector(".load-more-spinner");
      text.style.display = "none";
      spinner.style.display = "inline";
      setTimeout(() => {
        currentPage++;
        renderGames(false);
        text.style.display = "inline";
        spinner.style.display = "none";
      }, 700);
    });
  }

  // Sidebar top jogados
  const sidebarTop = document.getElementById("sidebarTop");
  if (sidebarTop) {
    const top5 = getTopGames(5);
    sidebarTop.innerHTML = top5.map((g, i) => `
      <a href="game.html?id=${g.id}" class="top5-item">
        <div class="top5-rank">${i + 1}</div>
        <div class="top5-thumb" style="background:${getCatBg(g.cat)}">${getCatEmoji(g.cat)}</div>
        <div class="top5-info">
          <div class="t5-name">${g.namePT}</div>
          <div class="t5-plays">👾 ${formatPlays(g.plays)}</div>
        </div>
      </a>
    `).join("");
  }
}

// ============================================================
// 11. LAZY LOAD (anima cards ao entrar na viewport)
// ============================================================
function initLazyLoad() {
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
  document.querySelectorAll(".section").forEach(el => obs.observe(el));
}

// ============================================================
// 12. POPULARIDADE DINÂMICA SIMULADA
// ============================================================
function initDynamicPopularity() {
  setInterval(() => {
    GAMES_DB.forEach(g => {
      if (Math.random() > 0.7) g.plays += randInt(1, 15);
    });
    document.querySelectorAll(".card-popularity").forEach(el => {
      const card = el.closest("[onclick]");
      if (!card) return;
      const href = card.getAttribute("onclick") || "";
      const match = href.match(/id=([^']+)/);
      if (!match) return;
      const game = GAMES_DB.find(g => g.id === match[1]);
      if (game) el.textContent = `👾 ${formatPlays(game.plays)} jogadas`;
    });
  }, 12000);
}

// ============================================================
// 13. INICIALIZAÇÃO GLOBAL
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  updateFavCount();
  initSearch();
  initHamburger();
  initFavPanel();
  initLazyLoad();

  const path = window.location.pathname;
  if (path.includes("game.html")) {
    initGamePage();
  } else if (path.includes("category.html")) {
    initCategoryPage();
  } else {
    initHomePage();
    initDynamicPopularity();
  }
});
