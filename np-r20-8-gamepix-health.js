/**
 * NeonPlay R23 — diagnóstico GamePix sem bloquear o início da partida.
 *
 * Uma única imagem de capa não é um teste confiável para a disponibilidade
 * de todos os jogos. Falha de URL, CDN, cache ou proteção contra hotlink não
 * pode cancelar o clique em "Jogar Agora".
 *
 * Este arquivo mantém o diagnóstico como informação auxiliar. A abertura real
 * continua sob responsabilidade do player original e de seus estados de erro.
 */
(function () {
  'use strict';

  if (window.__NP_GP_HEALTH_R23__) return;
  Object.defineProperty(window, '__NP_GP_HEALTH_R23__', {
    value: true,
    enumerable: false
  });

  var CACHE_KEY = 'np_gp_health_r23';
  var CACHE_TTL = 5 * 60 * 1000;
  var PROBE_URL = 'https://img.gamepix.com/games/funny-shooter-2/cover/funny-shooter-2.png?w=32&ar=4:3';

  function getCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var record = JSON.parse(raw);
      if (!record || typeof record.ok !== 'boolean' || Date.now() - record.ts > CACHE_TTL) return null;
      return record;
    } catch (_) {
      return null;
    }
  }

  function setCache(ok) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ok: Boolean(ok), ts: Date.now() }));
    } catch (_) {}
  }

  function probe(done) {
    var cached = getCache();
    if (cached) {
      done(cached.ok);
      return;
    }

    var image = new Image();
    var settled = false;
    var timer = setTimeout(function () { finish(false); }, 2500);

    function finish(ok) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      setCache(ok);
      done(ok);
    }

    image.onload = function () { finish(true); };
    image.onerror = function () { finish(false); };
    image.src = PROBE_URL + '&_np=' + Date.now();
  }

  function init() {
    probe(function (ok) {
      // Diagnóstico de uma imagem, não veredito sobre a partida.
      window.__NP_GP_OK__ = ok;
      window.__NP_GP_STATUS__ = ok ? 'image-reachable' : 'image-probe-failed';
      if (!ok && window.NP_DEBUG && window.console) {
        console.warn('[NeonPlay] A sonda da imagem GamePix falhou; o botão de jogar continua habilitado.');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
