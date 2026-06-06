/**
 * NeonPlay R20.11 — np-r20-8-gamepix-health.js
 * Corrige o "PNG sem nada": detecta bloqueio GamePix com img probe
 * e exibe mensagem amigavel imediatamente (sem esperar 9s de timeout).
 *
 * Mecanismo: img.onerror = 403 = dominio nao cadastrado no GamePix.
 * Resultado cacheado em sessionStorage por 15min.
 * Intercepta clique "Jogar Agora" em capture phase (antes do bundle).
 */
(function () {
  'use strict';
  if (window.__NP_GP_HEALTH__) return;
  Object.defineProperty(window, '__NP_GP_HEALTH__', { value: true, enumerable: false });

  var CACHE_KEY = 'np_gp_health_v1';
  var CACHE_TTL = 15 * 60 * 1000;

  function getCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return (Date.now() - obj.ts < CACHE_TTL) ? obj : null;
    } catch (_) { return null; }
  }

  function setCache(ok) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ok: ok, ts: Date.now() })); } catch (_) {}
  }

  function probe(cb) {
    var cached = getCache();
    if (cached !== null) { cb(cached.ok); return; }

    var img = new Image();
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      setCache(false);
      cb(false);
    }, 3500);

    img.onload = function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      setCache(true);
      cb(true);
    };

    img.onerror = function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      setCache(false);
      cb(false);
    };

    img.src = 'https://img.gamepix.com/games/funny-shooter-2/cover/funny-shooter-2.png'
      + '?w=32&ar=4:3&_np=' + Date.now();
  }

  function showBlockedUI(loaderEl, gameName) {
    if (!loaderEl) return;
    loaderEl.style.display = 'flex';

    var sugs = '';
    try {
      if (window.GAMES_DB && GAMES_DB.length) {
        var picks = GAMES_DB
          .filter(function (g) { return g.badge === 'hot' || g.badge === 'new'; })
          .slice(0, 4);
        if (picks.length) {
          sugs = '<p style="font-size:.72rem;color:var(--text-3,#666);margin:.9rem 0 .35rem">Outros jogos populares:</p>'
               + '<div style="display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center">';
          picks.forEach(function (g) {
            sugs += '<a href="game.html?id=' + g.id + '" '
                  + 'style="background:rgba(0,238,255,.07);border:1px solid rgba(0,238,255,.22);'
                  + 'color:var(--cyan,#00eeff);padding:.3rem .8rem;border-radius:20px;'
                  + 'font-size:.76rem;text-decoration:none">'
                  + (g.namePT || g.name) + '</a>';
          });
          sugs += '</div>';
        }
      }
    } catch (_) {}

    loaderEl.innerHTML =
      '<div style="text-align:center;padding:1.5rem 1rem;max-width:360px">'
    + '<div style="font-size:2.2rem;margin-bottom:.6rem">\uD83D\uDD27</div>'
    + '<p style="color:var(--text-1,#e8e8e8);font-size:.92rem;font-weight:500;margin:0 0 .4rem">'
    + (gameName ? gameName + ' \u2014 em breve!' : 'Jogo em breve!')
    + '</p>'
    + '<p style="color:var(--text-2,#aaa);font-size:.78rem;line-height:1.6;margin:0">'
    + 'Estamos finalizando a integra\u00E7\u00E3o com o provedor.<br>'
    + 'O cat\u00E1logo completo estar\u00E1 dispon\u00EDvel em breve.'
    + '</p>'
    + sugs
    + '</div>';
  }

  function hookPlayBtn(gpOk) {
    var playBtn = document.getElementById('playNowBtn');
    if (!playBtn || gpOk) return;

    playBtn.addEventListener('click', function (e) {
      var cached = getCache();
      if (cached && cached.ok) return;

      e.stopImmediatePropagation();

      var splashEl  = document.getElementById('gameSplash');
      var frameWrap = document.getElementById('gameFrameWrap');
      var loaderEl  = document.getElementById('iframeLoader');

      if (splashEl)  splashEl.style.display  = 'none';
      if (frameWrap) frameWrap.style.display = 'block';

      var gameName = '';
      try {
        var titleEl = document.getElementById('gpTitle');
        if (titleEl) gameName = titleEl.textContent.trim();
      } catch (_) {}

      showBlockedUI(loaderEl, gameName);
    }, true);
  }

  function init() {
    probe(function (ok) {
      window.__NP_GP_OK__ = ok;
      if (window.NP_DEBUG) console.info('[NP GP Health] GamePix acessivel:', ok);
      hookPlayBtn(ok);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
