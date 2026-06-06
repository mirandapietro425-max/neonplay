/* ══════════════════════════════════════════════════════════════════
   NeonPlay Patch R20.4 — Deterministic Runtime + Integration Hardening
   Base: R20.3 (audit-corrected R20.2)  |  Arquivo: np-r20-4.js
   Carregado após bundle.min.js via <script defer>

   OBJETIVO:
   - Reduzir comportamento implícito (typeof guessing, globals implícitos,
     listeners invisíveis, retry chains duplicadas, side-effects silenciosos)
   - Criar contratos explícitos de módulo via NeonPlayRuntime.modules
   - Lifecycle determinístico via eventos NP:progression-ready / NP:modules-ready
     (disparados por neonplay-init.js R20.4)
   - Diagnostics leve: NeonPlayRuntime.diagnostics.{intervals, observers, listeners}
   - WarnOnce: NeonPlayRuntime.debug.warnOnce(key, msg)
   - XP pipeline: NP:progression-ready → flush queue sem polling
   - Substituir setInterval de polling por listeners de eventos

   REGRAS:
   - Zero novos frameworks, zero redesign, zero rewrite de bundle.min.js
   - Compatível 100% com R20.2 e R20.3
   - Máximo 8 arquivos alterados (este patch toca: np-r20-4.js NEW,
     neonplay-init.js 2 cirúrgicos, index.html +1 script tag, game.html +1 script tag)

   INTEGRAÇÃO REAL VALIDADA:
   §2  XP QUEUE  — grantXP é IIFE-local em neonplay-init.js (não window.grantXP).
                   O hook real é em ZapProgressionSystem.addXP que NÃO é IIFE-local
                   (acessível via window.ZapProgressionSystem após neonplay-init.js
                   adicionar a exposição em R20.4). Evento NP:progression-ready
                   (novo, disparado por neonplay-init.js após _ready = true) elimina
                   o polling setInterval do R20.2.

   §3  VISIBILITY — NPClock.js já emite NPBus 'runtime:sleep'/'runtime:resume' via
                    visibilitychange. O patch R20.2 adicionou um 5º listener redundante.
                    R20.4 remove o listener próprio e subscreve NPBus em vez disso.

   §4  GAME LOADER — Observer do R20.2 mantido. Registrado em diagnostics.
   §5  ORPHAN FIXES — setInterval de polling do R20.2 substituído por evento.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
     0. NEONPLAY RUNTIME REGISTRY
     Ponto central de integração. Módulos anunciam-se aqui após init.
     Código consumidor verifica NeonPlayRuntime.modules.X.ready
     em vez de typeof X !== 'undefined'.

     CONTRATO:
       NeonPlayRuntime.modules.<nome> = {
         ready: true,
         version: 'R20.4',
         ...métodos públicos relevantes
       };

     NÃO é DI container, NÃO é plugin system.
     É somente um registro leve.
  ────────────────────────────────────────────────────────────────── */
  if (!window.NeonPlayRuntime) {
    window.NeonPlayRuntime = {

      /* ── Module contracts — preenchidos por neonplay-init.js após tryInit ── */
      modules: {},

      /* ── Diagnostics — registry de recursos persistentes ── */
      diagnostics: {
        intervals: [],   /* { id, source, createdAt } */
        observers: [],   /* { source, observer, target } */
        listeners: []    /* { source, event, element } */
      },

      /* ── Debug utilities ── */
      debug: {
        _warned: {},

        warnOnce: function (key, message) {
          if (this._warned[key]) return;
          this._warned[key] = true;
          if (window.NP_DEBUG) {
            console.warn('[NeonPlay R20.4]', message);
          }
        },

        clearWarnings: function () {
          this._warned = {};
        }
      },

      /* ── XP queue — público para módulos externos ── */
      _xpQueue: [],
      _xpReady: false,

      queueXp: function (amt, reason) {
        if (this._xpReady && window.ZapProgressionSystem && window.ZapProgressionSystem._ready) {
          window.ZapProgressionSystem.addXP(amt, reason);
        } else {
          this._xpQueue.push({ amt: amt, reason: reason || '' });
          if (window.NP_DEBUG) {
            console.info('[NP RUNTIME] XP queued (progression not ready):', amt, reason);
          }
          /* Soft cap: 200 events — protege contra spam pré-init */
          if (this._xpQueue.length > 200) {
            this._xpQueue.shift();
            this.debug.warnOnce('xp-queue-cap', 'XP queue soft cap (200) reached — dropping oldest event');
          }
        }
      },

      /* ── Overlay ownership map (referência, não runtime) ──
         HUD:            window.NeonPlayRuntime (npAlienHud, nphXpFill)
         Reward FX:      ZapProgressionSystem (level-up overlay)
         Cinematics:     zapCinematics (fullscreen cinematic layer)
         Companion:      ZapCompanion (widget + bubble)
         Store:          ZapStore (vault modal)
         System alerts:  NeonPlayRuntime.overlayManager (futuro)
      ── */

      /* ── Helpers para registro de diagnóstico ── */
      _trackInterval: function (id, source) {
        this.diagnostics.intervals.push({ id: id, source: source, createdAt: Date.now() });
        return id;
      },

      _trackObserver: function (observer, source, target) {
        this.diagnostics.observers.push({ observer: observer, source: source, target: target });
        return observer;
      },

      _trackListener: function (element, event, source) {
        this.diagnostics.listeners.push({ element: element, event: event, source: source });
      }
    };
  }

  var NRT = window.NeonPlayRuntime;


  /* ──────────────────────────────────────────────────────────────
     1. NP:PROGRESSION-READY → XP FLUSH
     Substitui o setInterval de polling de R20.2 (que tentava hookar
     window.grantXP — inexistente, pois grantXP é IIFE-local).

     CONTRATO REAL:
     - neonplay-init.js R20.4 adiciona:
         document.dispatchEvent(new CustomEvent('NP:progression-ready'));
       logo após: this._ready = true; (linha 653)
     - Isso elimina o polling e cria um contrato explícito.

     FLUSH: todos os XP enfileirados via NeonPlayRuntime.queueXp()
     são entregues ao ZapProgressionSystem.addXP imediatamente.
  ────────────────────────────────────────────────────────────────── */
  document.addEventListener('NP:progression-ready', function () {
    NRT._xpReady = true;

    /* Flush queue */
    var queue = NRT._xpQueue.splice(0);
    if (queue.length && window.ZapProgressionSystem && window.ZapProgressionSystem._ready) {
      queue.forEach(function (ev) {
        window.ZapProgressionSystem.addXP(ev.amt, ev.reason);
      });
      if (window.NP_DEBUG) {
        console.info('[NP RUNTIME] XP queue flushed:', queue.length, 'events');
      }
    }

    /* Registrar contrato de módulo */
    if (window.ZapProgressionSystem) {
      NRT.modules.progression = {
        ready:      true,
        version:    'R20.4',
        addXP:      window.ZapProgressionSystem.addXP.bind(window.ZapProgressionSystem),
        getProgress: window.ZapProgressionSystem.getProgress.bind(window.ZapProgressionSystem)
      };
    }
  }, { once: true });


  /* ──────────────────────────────────────────────────────────────
     2. NP:MODULES-READY → REGISTRAR CONTRATOS
     Disparado por neonplay-init.js após o tryInit chain completo.
     Registra os contratos de módulo restantes.

     Módulos verificados no runtime real (neonplay-init.js linha 1721+):
     ZapProgressionSystem, ZapQuestEngine, ZapLifecycleManager,
     ZapEconomy, ZapStore, zapCinematics.
  ────────────────────────────────────────────────────────────────── */
  document.addEventListener('NP:modules-ready', function () {

    if (window.ZapQuestEngine) {
      NRT.modules.quests = {
        ready:    true,
        version:  'R20.4',
        getState: window.ZapQuestEngine.getState.bind(window.ZapQuestEngine)
      };
    }

    if (window.ZapEconomy) {
      NRT.modules.economy = {
        ready:     true,
        version:   'R20.4',
        getCoins:  window.ZapEconomy.getCoins.bind(window.ZapEconomy),
        addCoins:  window.ZapEconomy.addCoins.bind(window.ZapEconomy)
      };
    }

    if (window.zapCinematics) {
      NRT.modules.cinematics = {
        ready:    true,
        version:  'R20.4',
        play:     window.zapCinematics.play.bind(window.zapCinematics),
        isPlaying: window.zapCinematics.isPlaying.bind(window.zapCinematics)
        /* pause/resume: NÃO EXISTEM na API pública (validado em R20.2 audit) */
      };
    }

    /* Dispatch runtime-ready: todos os módulos core estão prontos */
    try {
      document.dispatchEvent(new CustomEvent('NP:runtime-ready', {
        detail: { modules: Object.keys(NRT.modules), ts: Date.now() }
      }));
    } catch (e) { /* IE fallback — silencioso */ }

    if (window.NP_DEBUG) {
      console.info('[NP RUNTIME] NP:runtime-ready — modules:', Object.keys(NRT.modules));
    }
  }, { once: true });


  /* ──────────────────────────────────────────────────────────────
     3. VISIBILITY VIA NPBUS
     R20.2 adicionou um 5º visibilitychange listener próprio.
     NPClock.js (carregado em index.html e game.html) já emite
     NPBus 'runtime:sleep'/'runtime:resume' — é o canal correto.

     R20.4: subscreve NPBus em vez de adicionar listener direto.
     Emite NP:visibility para backward compat com qualquer módulo
     que tenha adotado o evento do R20.2.

     GUARDA: NPBus pode não existir em páginas sem os módulos Zap
     (ex: category.html, buscar.html). Verificamos antes de usar.
  ────────────────────────────────────────────────────────────────── */
  document.addEventListener('NP:runtime-ready', function () {
    if (!window.NPBus) return;

    NPBus.on('runtime:sleep', function () {
      try {
        document.dispatchEvent(new CustomEvent('NP:visibility', { detail: { hidden: true } }));
      } catch (e) {}
    });

    NPBus.on('runtime:resume', function () {
      try {
        document.dispatchEvent(new CustomEvent('NP:visibility', { detail: { hidden: false } }));
      } catch (e) {}
    });

    NRT._trackListener(document, 'NPBus:runtime:sleep/resume → NP:visibility', 'R20.4-visibility');
  }, { once: true });


  /* ──────────────────────────────────────────────────────────────
     4. GAME LOADER FAILSAFE (mantido do R20.2, hardened)
     - Registrado em diagnostics.observers
     - Sentinel de colisão com bundle.min.js (12 s) mantido
     - Patch usa 15 s (3 s de margem) como segundo nível

     AUDITORIA R20.2: bundle tem seu próprio MutationObserver em
     gameFrameWrap.style.display com timeout 12 s.
     O patch observa iframe[src] — triggers diferentes.
     Colisão resolvida via sentinel #np-bj-retry.
  ────────────────────────────────────────────────────────────────── */
  var GAME_LOAD_TIMEOUT = 15000;

  document.addEventListener('DOMContentLoaded', function () {
    var iframe = document.getElementById('gameFrame');
    var loader = document.getElementById('iframeLoader');
    if (!iframe || !loader) return;

    var _settled = false;
    var _timeoutHandle = null;

    function _showGameError() {
      if (_settled) return;
      _settled = true;

      /* Bundle já atuou? Recuar silenciosamente. */
      if (loader.querySelector('#np-bj-retry') || loader.dataset.npPatchTimeout) {
        NRT.debug.warnOnce('game-loader-bundle-handled', 'Game loader: bundle failsafe já atuou, patch recuando');
        return;
      }

      loader.dataset.npPatchTimeout = '1';
      loader.innerHTML =
        '<div class="np-load-error" role="alert" aria-live="assertive">' +
        '<p>⚠️ O jogo demorou para carregar.</p>' +
        '<button onclick="location.reload()" class="np-retry-btn">🔄 Tentar novamente</button>' +
        '</div>';

      NRT.debug.warnOnce('game-loader-timeout', 'Game load timeout (' + GAME_LOAD_TIMEOUT + 'ms) — patch fallback ativado');
    }

    iframe.addEventListener('load', function _onLoad() {
      if (_settled) return;
      _settled = true;
      clearTimeout(_timeoutHandle);
      iframe.removeEventListener('load', _onLoad);
    });

    var _srcObs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === 'src') {
          var src = iframe.getAttribute('src');
          if (src && src !== 'about:blank') {
            _srcObs.disconnect();
            clearTimeout(_timeoutHandle);
            _timeoutHandle = setTimeout(_showGameError, GAME_LOAD_TIMEOUT);
          }
        }
      });
    });

    _srcObs.observe(iframe, { attributes: true, attributeFilter: ['src'] });

    NRT._trackObserver(_srcObs, 'GameLoader-R20.4', iframe);
    NRT._trackListener(iframe, 'load', 'GameLoader-R20.4');
  });


  /* ──────────────────────────────────────────────────────────────
     5. SAFE STORAGE WRAPPER (herdado de R20.2)
     Mantido sem alteração. NP_STORAGE existe para uso em código novo.
     Módulos existentes (ZapCompanion, ZapPersonalityEngine) JÁ TÊM
     try/catch próprio — não precisam migrar (validado em R20.4 audit).
  ────────────────────────────────────────────────────────────────── */
  if (!window.NP_STORAGE) {
    var _mem = {};

    window.NP_STORAGE = {
      set: function (key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (e) {
          NRT.debug.warnOnce('storage-write-blocked', 'NP_STORAGE: localStorage bloqueado — usando fallback de memória');
          _mem[key] = value;
          return false;
        }
      },

      get: function (key) {
        try {
          var raw = localStorage.getItem(key);
          if (raw !== null) return JSON.parse(raw);
        } catch (e) {
          NRT.debug.warnOnce('storage-read-blocked', 'NP_STORAGE: localStorage bloqueado — usando fallback de memória');
        }
        return _mem[key] !== undefined ? _mem[key] : null;
      },

      remove: function (key) {
        try { localStorage.removeItem(key); } catch (e) { /* silent */ }
        delete _mem[key];
      }
    };
  }


  /* ──────────────────────────────────────────────────────────────
     6. BOOT GUARD — localStorage em Safari Private Mode (R20.2)
     Mantido sem alteração. Protege o tryInit chain de abortar
     se localStorage lançar SecurityError.
  ────────────────────────────────────────────────────────────────── */
  (function _bootGuard() {
    var _blocked = false;
    try { localStorage.getItem('_np_probe'); } catch (e) { _blocked = true; }
    if (!_blocked) return;

    try {
      var _proxy = {
        getItem: function () { return null; },
        setItem: function () {},
        removeItem: function () {},
        clear: function () {},
        key: function () { return null; },
        length: 0
      };
      Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { return _proxy; } });
      NRT.debug.warnOnce('storage-proxy-active', 'localStorage bloqueado — proxy de memória ativo (boot guard)');
    } catch (e) {
      NRT.debug.warnOnce('storage-proxy-failed', 'Boot guard: defineProperty falhou');
    }
  })();


  /* ──────────────────────────────────────────────────────────────
     7. VIEWPORT CLAMP — API pública mantida para uso futuro
     AUDITORIA: ZapCompanion posiciona a bubble via CSS puro.
     NP_clampBubble é utility genérico para futuros elementos flutuantes.
  ────────────────────────────────────────────────────────────────── */
  window.NP_clampBubble = function (x, y, bubbleEl) {
    var pad = 12;
    var w = bubbleEl ? bubbleEl.offsetWidth  : 0;
    var h = bubbleEl ? bubbleEl.offsetHeight : 0;
    return {
      x: Math.max(pad, Math.min(x, window.innerWidth  - w - pad)),
      y: Math.max(pad, Math.min(y, window.innerHeight - h - pad))
    };
  };


  /* ──────────────────────────────────────────────────────────────
     8. SEARCH EMPTY STATE — API pública mantida como fallback
     AUDITORIA: bundle.min.js já resolve em buscar.html com lógica
     contextual. Esta função é fallback para páginas sem bundle avançado.
  ────────────────────────────────────────────────────────────────── */
  window.NP_showSearchEmpty = function (containerEl, message) {
    if (!containerEl) return;
    if (containerEl.querySelector('[data-bundle-rendered]')) return;
    containerEl.innerHTML =
      '<div class="np-search-empty" role="status" aria-live="polite">' +
      '<p>' + (message || 'Nenhum jogo encontrado. Tente outra busca.') + '</p>' +
      '</div>';
  };


  /* ──────────────────────────────────────────────────────────────
     9. DIAGNOSTICS SNAPSHOT — acessível via console em NP_DEBUG
     NeonPlayRuntime.diagnostics.snapshot() → resumo de recursos vivos.
  ────────────────────────────────────────────────────────────────── */
  NRT.diagnostics.snapshot = function () {
    var d = window.NeonPlayRuntime.diagnostics;
    var result = {
      intervals: d.intervals.length,
      observers: d.observers.length,
      listeners: d.listeners.length,
      modules:   Object.keys(NRT.modules),
      xpQueue:   NRT._xpQueue.length,
      xpReady:   NRT._xpReady
    };
    if (window.NP_DEBUG) { console.table(result); }
    return result;
  };


  /* ──────────────────────────────────────────────────────────────
     10. STACKING CHECK (NP_DEBUG only)
  ────────────────────────────────────────────────────────────────── */
  if (window.NP_DEBUG) {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        document.querySelectorAll('[style*="z-index"]').forEach(function (el) {
          var z = parseInt(el.style.zIndex, 10);
          if (!isNaN(z) && z > 1000) {
            NRT.debug.warnOnce('zindex-' + z, 'Magic z-index detectado: ' + z);
          }
        });
      }, 2000);
    });
  }


  /* ──────────────────────────────────────────────────────────────
     11. RUNTIME LOG
  ────────────────────────────────────────────────────────────────── */
  if (window.NP_DEBUG) {
    console.info(
      '[NP R20.4] Patch loaded — NeonPlayRuntime registry, deterministic lifecycle ' +
      '(NP:progression-ready, NP:modules-ready, NP:runtime-ready), ' +
      'diagnostics, warnOnce, XP queue via eventos (sem polling), ' +
      'visibility via NPBus, game loader hardened'
    );
  }

})();
