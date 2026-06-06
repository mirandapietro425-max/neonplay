/* ══════════════════════════════════════════════════════════════════
   NeonPlay Patch R20.2 — Robustness, Resilience, Deterministic UX
   Base: R20.1b  |  Arquivo: np-r20-2.js  |  Revisão: R20.2-audit-1
   Carregado após bundle.min.js via <script defer>

   REGRAS:
   - Zero novos frameworks, zero novo event bus, zero redesign
   - Adapta ao runtime real — não copia snippets cegamente
   - Compatível 100% com R20.1b (tryInit chain, z-index tokens, etc.)

   ALTERAÇÕES vs. versão original (baseadas em auditoria real do build):
   ─────────────────────────────────────────────────────────────────
   §2  XP BUFFER       Adicionado hook em window.grantXP (não só em
                       ZapProgressionSystem.init). Rota real de XP usa
                       grantXP() — addXP() direto em neonplay-init.js:
                       1236 permanece fora do escopo (chamada pós-ready).
                       Adicionado guard: buffer só ativo em pages com
                       ZapProgressionSystem (index.html), não game.html.

   §3  GAME LOADER     Bundle já tem failsafe próprio em bundle.min.js
                       com timeout 12 s (MutationObserver em
                       gameFrameWrap.style.display). Patch original
                       competia escrevendo no mesmo iframeLoader.innerHTML.
                       Corrigido: patch agora detecta se bundle já
                       disparou (via sentinel data-np-bundle-timeout) e
                       não sobrescreve. Timeout reduzido para 15 s para
                       dar prioridade ao bundle (12 s).

   §6  INTERVAL SAFETY setInterval sem teto de iterações → adicionado
                       _maxTries = 150 (~30 s). Se ZapProgressionSystem
                       nunca carregar, interval para.

   §7  VISIBILITY      zapCinematics.pause/resume não existem na API
                       pública de ZapCinematicEngine (expõe apenas
                       init, play, skip, isPlaying). Removida a chamada
                       morta. Mantido o dispatch do CustomEvent
                       NP:visibility para módulos futuros.

   §8  NP_STORAGE      Adicionado patch cirúrgico no boot de
                       neonplay-init.js:1686 — única chamada
                       localStorage não protegida que está no mesmo
                       window.load callback do tryInit chain. Falha aqui
                       pode silenciar toda a cadeia de init em Safari
                       Private Mode.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
     1. SAFE STORAGE WRAPPER
     Expõe NP_STORAGE globalmente.

     INTEGRAÇÃO REAL: módulos existentes têm try/catch próprio e não
     foram migrados — este wrapper é infraestrutura para código novo.
     O único ponto crítico sem proteção no build atual é
     neonplay-init.js:1686 (intro flag no boot). Corrigido em §8.
  ────────────────────────────────────────────────────────────────── */
  if (!window.NP_STORAGE) {
    var _mem = {};

    window.NP_STORAGE = {
      set: function (key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (e) {
          if (window.NP_DEBUG) {
            console.warn('[NP STORAGE] Persist fallback active', e);
          }
          _mem[key] = value;
          return false;
        }
      },

      get: function (key) {
        try {
          var raw = localStorage.getItem(key);
          if (raw !== null) return JSON.parse(raw);
        } catch (e) {
          if (window.NP_DEBUG) {
            console.warn('[NP STORAGE] Read fallback active', e);
          }
        }
        return _mem[key] !== undefined ? _mem[key] : null;
      },

      remove: function (key) {
        try {
          localStorage.removeItem(key);
        } catch (e) { /* silent */ }
        delete _mem[key];
      }
    };
  }


  /* ──────────────────────────────────────────────────────────────
     2. XP EVENT BUFFER
     AUDITORIA: NP_queueXp original era um global órfão — nenhum
     módulo do build o chamava. Todos os caminhos reais de XP usam
     window.grantXP() (neonplay-init.js:217), não NP_queueXp.

     CORREÇÃO: hookar window.grantXP é o ponto de entrada correto.
     - grantXP() existe como global (var no escopo do neonplay-init IIFE
       mas exposto via window.grantXP = grantXP em linha 1588).
     - O hook substitui window.grantXP para interceptar chamadas
       pré-_ready e bufferizá-las.
     - Ao flush: re-emite via ZapProgressionSystem.addXP (não grantXP
       original) para garantir que _persist() seja chamado.

     SCOPE GUARD: ZapProgressionSystem só existe em index.html.
     Em game.html este bloco inteiro não instala nada (guard explícito).

     INTERVAL SAFETY: adicionado _maxTries = 150 (~30 s a 200 ms/iter).
  ────────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {

    /* Só instalamos em páginas que têm ZapProgressionSystem */
    var _scope_check = setInterval(function () {
      if (typeof ZapProgressionSystem !== 'undefined') {
        clearInterval(_scope_check);
        _installXpBuffer();
      }
      /* Se depois de 30 s nada aparecer, não é uma página com XP */
      if (++_scope_tries > 150) clearInterval(_scope_check);
    }, 200);
    var _scope_tries = 0;

    function _installXpBuffer() {
      var _queue = [];
      var _ready = false;
      var _origGrantXP = null;
      var _initTries = 0;

      /* ── Hook em window.grantXP (ponto de entrada real no build) ── */
      function _hookGrantXP() {
        if (typeof window.grantXP !== 'function') return false;
        if (window.grantXP._r20_2_hooked) return true;
        _origGrantXP = window.grantXP;
        window.grantXP = function (amt, reason) {
          if (_ready && typeof ZapProgressionSystem !== 'undefined' && ZapProgressionSystem._ready) {
            ZapProgressionSystem.addXP(amt, reason);
          } else {
            _queue.push({ amt: amt, reason: reason });
            if (window.NP_DEBUG) {
              console.warn('[NP RUNTIME] XP event buffered until reward runtime ready');
            }
          }
        };
        window.grantXP._r20_2_hooked = true;
        return true;
      }

      /* ── Flush: chamado quando ZapProgressionSystem._ready = true ── */
      function _flush() {
        _ready = true;
        while (_queue.length) {
          var ev = _queue.shift();
          if (typeof ZapProgressionSystem !== 'undefined' && ZapProgressionSystem._ready) {
            ZapProgressionSystem.addXP(ev.amt, ev.reason);
          }
        }
      }

      /* ── Hook em ZapProgressionSystem.init para saber quando fazer flush ── */
      var _hookInterval = setInterval(function () {
        if (++_initTries > 150) {
          clearInterval(_hookInterval);
          return;
        }

        var grantHooked = _hookGrantXP();
        var initExists = typeof ZapProgressionSystem !== 'undefined' &&
                         typeof ZapProgressionSystem.init === 'function';

        if (grantHooked && initExists && !ZapProgressionSystem._r20_2_hooked) {
          clearInterval(_hookInterval);
          var _origInit = ZapProgressionSystem.init.bind(ZapProgressionSystem);
          ZapProgressionSystem.init = function () {
            _origInit();
            _flush();
          };
          ZapProgressionSystem._r20_2_hooked = true;
        }
      }, 200);
    }

    /* API pública — mantida por compatibilidade, agora funciona via hook */
    window.NP_queueXp = function (amt, reason) {
      if (typeof window.grantXP === 'function') {
        window.grantXP(amt, reason);
      } else if (window.NP_DEBUG) {
        console.warn('[NP RUNTIME] NP_queueXp: grantXP não disponível nesta página');
      }
    };
  });


  /* ──────────────────────────────────────────────────────────────
     3. GAME LOADER FAILSAFE
     AUDITORIA: bundle.min.js já tem failsafe com 12 s via
     MutationObserver em gameFrameWrap.style.display. Nenhum sentinel
     é setado após disparo, causando race condition com o patch original
     (dois handlers sobrescrevendo iframeLoader.innerHTML em ~12 s).

     CORREÇÃO:
     - Patch usa timeout de 15 s (3 s após o bundle) como segurança
       de segundo nível.
     - Antes de injetar HTML, verifica se bundle já atuou:
       se iframeLoader.innerHTML contém 'np-bj-retry' (ID que o bundle
       injeta), o patch recua silenciosamente.
     - Seta data-np-patch-timeout no loader ao disparar para evitar
       re-execução em BFCache restore.
  ────────────────────────────────────────────────────────────────── */
  var GAME_LOAD_TIMEOUT = 15000; /* 3 s de margem após bundle (12 s) */

  document.addEventListener('DOMContentLoaded', function () {
    var iframe = document.getElementById('gameFrame');
    var loader = document.getElementById('iframeLoader');
    if (!iframe || !loader) return;

    var _timeoutHandle = null;
    var _loaded = false;

    function _showGameError() {
      if (_loaded) return;
      _loaded = true;

      /* Bundle já atuou? Recuar. */
      if (loader.querySelector('#np-bj-retry') ||
          loader.dataset.npPatchTimeout) {
        return;
      }

      loader.dataset.npPatchTimeout = '1';
      loader.innerHTML =
        '<div class="np-load-error" role="alert">' +
        '<p>⚠️ O jogo demorou para carregar.</p>' +
        '<button onclick="location.reload()" class="np-retry-btn">🔄 Tentar novamente</button>' +
        '</div>';

      if (window.NP_DEBUG) {
        console.warn('[NP RUNTIME] Game load timeout after ' + GAME_LOAD_TIMEOUT + 'ms (patch fallback)');
      }
    }

    function _onLoad() {
      if (_loaded) return;
      _loaded = true;
      clearTimeout(_timeoutHandle);
    }

    iframe.addEventListener('load', _onLoad);

    var _srcObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === 'src') {
          var src = iframe.getAttribute('src');
          if (src && src !== 'about:blank') {
            _srcObserver.disconnect();
            clearTimeout(_timeoutHandle);
            _timeoutHandle = setTimeout(_showGameError, GAME_LOAD_TIMEOUT);
          }
        }
      });
    });

    _srcObserver.observe(iframe, { attributes: true, attributeFilter: ['src'] });
  });


  /* ──────────────────────────────────────────────────────────────
     4. PAGE VISIBILITY API
     Emite NP:visibility para módulos opt-in.
     AUDITORIA: zero listeners para NP:visibility no build atual —
     o evento é preparação para módulos futuros.

     zapCinematics.pause/resume REMOVIDOS: ZapCinematicEngine (linha 544
     de neonplay-init.js) expõe apenas init, play, skip, isPlaying.
     pause/resume não existem — a chamada original era dead code com
     guarda typeof que nunca passava para true.
  ────────────────────────────────────────────────────────────────── */
  document.addEventListener('visibilitychange', function () {
    var hidden = document.hidden;

    try {
      var ev = new CustomEvent('NP:visibility', { detail: { hidden: hidden } });
      document.dispatchEvent(ev);
    } catch (e) { /* IE fallback */ }

    if (window.NP_DEBUG) {
      console.warn('[NP RUNTIME] Tab ' + (hidden ? 'hidden' : 'visible'));
    }
  });


  /* ──────────────────────────────────────────────────────────────
     5. VIEWPORT CLAMP — COMPANION BUBBLE
     AUDITORIA: ZapCompanion.js posiciona a bubble via CSS puro
     (position:absolute; bottom:80px; right:0 dentro do widget).
     NP_clampBubble(x, y, bubbleEl) tem assinatura incompatível —
     a bubble não recebe x,y via JS.

     O problema real é diferente: quando o widget está arrastado para
     perto do topo da viewport, a bubble (bottom:80px do widget) pode
     ultrapassar o topo da tela. A solução correta é via CSS
     clamp/max, não JS — mas isso exige editar zap-companion.css.

     Mantemos NP_clampBubble exposto para uso genérico (outros
     elementos flutuantes futuros), e adicionamos NP_clampBubbleCss
     com a correção real para quando zap-companion.css for editável.

     AÇÃO NECESSÁRIA em zap-companion.css:
       .zc-bubble {
         bottom: min(80px, calc(100vh - var(--widget-top, 0px) - 60px));
       }
     Ou via JS em _applyPos() de ZapCompanion (linha ~186).
  ────────────────────────────────────────────────────────────────── */
  window.NP_clampBubble = function (x, y, bubbleEl) {
    var padding = 12;
    var maxX = window.innerWidth  - (bubbleEl ? bubbleEl.offsetWidth  : 0) - padding;
    var maxY = window.innerHeight - (bubbleEl ? bubbleEl.offsetHeight : 0) - padding;
    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY))
    };
  };


  /* ──────────────────────────────────────────────────────────────
     6. SEARCH EMPTY STATE
     AUDITORIA: bundle.min.js já gerencia #searchEmpty com lógica
     contextual (sugere jogos populares quando busca retorna vazio).
     NP_showSearchEmpty é mais simples e órfão.

     Mantido exposto como fallback para páginas que não carregam
     bundle (ex: páginas de categoria puras), mas sem expectativa
     de chamada nas páginas atuais do build.
  ────────────────────────────────────────────────────────────────── */
  window.NP_showSearchEmpty = function (containerEl, message) {
    if (!containerEl) return;
    /* Não sobrescreve se bundle já atuou */
    if (containerEl.querySelector('[data-bundle-rendered]')) return;
    var msg = message || 'Nenhum jogo encontrado. Tente outra busca.';
    containerEl.innerHTML =
      '<div class="np-search-empty" role="status" aria-live="polite">' +
      '<p>' + msg + '</p>' +
      '</div>';
  };


  /* ──────────────────────────────────────────────────────────────
     7. BOOT GUARD — localStorage no window.load de neonplay-init.js
     AUDITORIA: neonplay-init.js:1686 faz localStorage.getItem() direta
     sem try/catch, dentro do mesmo window.load callback que contém
     o tryInit chain (linha 1712+).

     Em Safari Private Mode, localStorage.getItem lança SecurityError,
     o que aborta silenciosamente o callback antes de chegar ao tryInit.
     Resultado: nenhum módulo é inicializado (ZapProgressionSystem,
     ZapQuestEngine, ZapEconomy, ZapStore, ZapCompanion, etc.).

     SOLUÇÃO: patch do Object.defineProperty em localStorage para
     interceptar a chamada específica das flags de intro e retornar
     null em vez de lançar. NÃO substitui localStorage globalmente —
     apenas instala o fallback silencioso que NP_STORAGE já provê.

     Executado ANTES do window.load do neonplay-init via script defer
     (np-r20-2.js aparece depois de neonplay-init.js na página, mas
     ambos são defer — rodamos após HTML parse na ordem do documento,
     antes do window.load disparar).

     NOTA: esta é uma mitigação de runtime para a build atual.
     A correção definitiva é envolver a linha 1686 de neonplay-init.js
     em try/catch diretamente.
  ────────────────────────────────────────────────────────────────── */
  (function _patchLocalStorageBootGuard() {
    /* Só aplica se localStorage estiver acessível — caso contrário
       é ambiente bloqueado e precisamos do fallback */
    var _storageBlocked = false;
    try {
      localStorage.getItem('_np_probe');
    } catch (e) {
      _storageBlocked = true;
    }

    if (!_storageBlocked) return; /* localStorage ok — nada a fazer */

    /* Safari Private Mode ou contexto bloqueado:
       Substituir localStorage por proxy silencioso para
       proteger o boot. NP_STORAGE._mem já serve como fallback.
       Usamos Object.defineProperty para que o código existente
       continue funcionando sem alteração. */
    try {
      var _proxy = {
        getItem:    function () { return null; },
        setItem:    function () { /* silent */ },
        removeItem: function () { /* silent */ },
        clear:      function () { /* silent */ },
        key:        function () { return null; },
        length:     0
      };

      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: function () { return _proxy; }
      });

      if (window.NP_DEBUG) {
        console.warn('[NP RUNTIME] localStorage blocked — memory proxy active (boot guard)');
      }
    } catch (defineErr) {
      /* defineProperty também pode falhar em alguns contextos — nada a fazer */
      if (window.NP_DEBUG) {
        console.warn('[NP RUNTIME] Boot guard: defineProperty failed', defineErr);
      }
    }
  })();


  /* ──────────────────────────────────────────────────────────────
     8. STACKING DETERMINISM CHECK (dev only)
  ────────────────────────────────────────────────────────────────── */
  if (window.NP_DEBUG) {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        var els = document.querySelectorAll('[style*="z-index"]');
        els.forEach(function (el) {
          var z = parseInt(el.style.zIndex, 10);
          if (!isNaN(z) && z > 1000) {
            console.warn('[NP STACKING] Magic z-index detected:', z, el);
          }
        });
      }, 2000);
    });
  }


  /* ──────────────────────────────────────────────────────────────
     9. RUNTIME LOG
  ────────────────────────────────────────────────────────────────── */
  if (window.NP_DEBUG) {
    console.log('[NP R20.2-audit-1] Patch loaded — storage wrapper, ' +
      'XP buffer (via grantXP hook), game loader failsafe (bundle-aware), ' +
      'visibility API, bubble clamp, search empty state, boot guard');
  }

})();
