/* ══════════════════════════════════════════════════════════════════
   NeonPlay Hotfix R20.6 — Gameplay Events + iframe Bridge
   Base: R20.5  |  Arquivo: np-r20-6.js
   Carregado via <script defer> após np-r20-5.js

   OBJETIVO: Correções cirúrgicas identificadas na auditoria Full Immersion.

   HOTFIX 1 — GAMEPLAY EVENTS DORMENTES
     Emite NP.events gameplay:start / gameplay:end monitorando
     gameFrameWrap via MutationObserver diretamente no elemento.
     Detecta slug/category de window._currentGame.
     Guard duplo: _gpStarted flag evita emissão duplicada.

   HOTFIX 2 — GAME IFRAME BRIDGE
     window.addEventListener('message') com whitelist de origem.
     Transforma game:start/end/score/win/lose → NPBus.

   REGRAS:
   - Zero novos frameworks
   - Zero redesign visual
   - Zero rewrite de bundle.min.js
   - Compatível com R20.1 → R20.5 + R10.3 Perception Layer
   - Guards window.NPBus e window.NP em todos os pontos de emissão
   - Try/catch em toda interação com iframe/postMessage
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Aguardar NeonPlayRuntime ─────────────────────────────── */
  var NRT = window.NeonPlayRuntime;
  if (NRT && NRT.flags && NRT.flags.r206Loaded) return; /* guard de duplicação */
  if (NRT && NRT.flags) NRT.flags.r206Loaded = true;

  /* ─────────────────────────────────────────────────────────────
     HOTFIX 1 — GAMEPLAY EVENTS DORMENTES
     Monitora gameFrameWrap diretamente (display: block ↔ none).
     Emite NP.events.emit('gameplay:start') e ('gameplay:end').
     Também emite NPBus para compatibilidade com módulos que
     escutam NPBus.EV ao invés de NP.events.
  ───────────────────────────────────────────────────────────── */
  (function _setupGameplayEvents() {
    /* RP-02: _gpStarted exposto via window para evitar emissão dupla
       quando MutationObserver E iframe bridge disparam simultaneamente. */
    window._np_r206_gpStarted = false;
    var _gpStarted  = false; /* referência local — sempre sincronizada via helpers abaixo */
    var _gpStartTs  = 0;     /* timestamp do último start */
    var _observer   = null;
    var _retryTimer = null;

    function _getGameInfo() {
      try {
        var g = window._currentGame;
        if (g && g.id) {
          return { slug: g.id, category: g.cat || g.category || '' };
        }
      } catch (e) {}
      /* fallback: ler slug da URL — SL-01: suporta ?slug= (bundle) e ?id= (sitemap) */
      try {
        var params = new URLSearchParams(window.location.search);
        return {
          slug:     params.get('slug') || params.get('id') || '',
          category: params.get('cat')  || params.get('category') || ''
        };
      } catch (e) {}
      return { slug: '', category: '' };
    }

    function _emitStart() {
      if (_gpStarted || window._np_r206_gpStarted) return; /* guard duplo — IIFE local + cross-IIFE */
      _gpStarted = true;
      window._np_r206_gpStarted = true;
      _gpStartTs = Date.now();
      var info = _getGameInfo();

      try {
        if (window.NP && window.NP.events && typeof window.NP.events.emit === 'function') {
          window.NP.events.emit('gameplay:start', {
            slug:      info.slug,
            category:  info.category,
            timestamp: _gpStartTs
          });
        }
      } catch (e) {}

      try {
        if (window.NPBus) {
          NPBus.emit('gameplay:start', {
            slug:      info.slug,
            category:  info.category,
            timestamp: _gpStartTs
          });
        }
      } catch (e) {}
    }

    function _emitEnd() {
      if (!_gpStarted && !window._np_r206_gpStarted) return; /* guard: só se houve start */
      _gpStarted = false;
      window._np_r206_gpStarted = false;
      var duration = _gpStartTs ? Date.now() - _gpStartTs : 0;
      var info = _getGameInfo();

      try {
        if (window.NP && window.NP.events && typeof window.NP.events.emit === 'function') {
          window.NP.events.emit('gameplay:end', {
            slug:      info.slug,
            duration:  duration,
            timestamp: Date.now()
          });
        }
      } catch (e) {}

      try {
        if (window.NPBus) {
          NPBus.emit('gameplay:end', {
            slug:      info.slug,
            duration:  duration,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }

    function _checkWrap(wrap) {
      if (!wrap) return;
      /* RP-01: display:'' (string vazia) = CSS default = provavelmente visível.
         Usar getComputedStyle para leitura confiável independente de inline vs CSS. */
      try {
        var cs = window.getComputedStyle(wrap);
        var visible = cs.display !== 'none' && cs.visibility !== 'hidden';
        if (visible) { _emitStart(); } else { _emitEnd(); }
      } catch (e) {
        /* Fallback seguro se getComputedStyle falhar (ex: elemento detached) */
        var d = wrap.style.display;
        if (d === 'none') { _emitEnd(); } else if (d) { _emitStart(); }
      }
    }

    function _attachObserver(wrap) {
      if (_observer) { try { _observer.disconnect(); } catch (e) {} }
      _observer = new MutationObserver(function () {
        _checkWrap(wrap);
      });
      _observer.observe(wrap, {
        attributes:      true,
        attributeFilter: ['style']
      });
      /* Verificação imediata */
      _checkWrap(wrap);
    }

    function _init() {
      var wrap = document.getElementById('gameFrameWrap');
      if (wrap) {
        _attachObserver(wrap);
        return;
      }

      /* Se não está disponível ainda, tentar novamente */
      if (_retryTimer) return;
      _retryTimer = setTimeout(function () {
        _retryTimer = null;
        var w = document.getElementById('gameFrameWrap');
        if (w) {
          _attachObserver(w);
        }
        /* Se ainda não existe, não é uma página de jogo — silencioso */
      }, 1500);
    }

    /* Emitir gameplay:end em unload/pagehide */
    window.addEventListener('pagehide', _emitEnd, { once: true });
    window.addEventListener('beforeunload', _emitEnd, { once: true });

    /* Cleanup via NP.lifecycle se disponível */
    function _cleanup() {
      if (_observer) { try { _observer.disconnect(); } catch (e) {} _observer = null; }
      if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
      _emitEnd();
    }

    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(_cleanup);
    }
    if (NRT && typeof NRT.cleanup === 'object' && typeof NRT.cleanup.register === 'function') {
      NRT.cleanup.register(_cleanup);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _init);
    } else {
      _init();
    }
  })();


  /* ─────────────────────────────────────────────────────────────
     HOTFIX 2 — GAME IFRAME BRIDGE
     Escuta postMessage do iframe do jogo e transforma em eventos
     internos do NPBus / NP.events.
     Whitelist: origem do iframe (gameFrame.src) ou same-origin.
     Try/catch obrigatório — compatibilidade retroativa garantida.
  ───────────────────────────────────────────────────────────── */
  (function _setupIframeBridge() {
  if (window._np_r206_bridge_active) return; /* guard de duplicação */
  /* RT-C01 R20.7: usar defineProperty para tornar o guard atômico e não-reescrevível,
     eliminando a race condition entre verificação e atribuição em fast navigations. */
  try {
    Object.defineProperty(window, '_np_r206_bridge_active', { value: true, writable: false, configurable: false });
  } catch (e) {
    window._np_r206_bridge_active = true; /* fallback se defineProperty falhar */
  }

    /* Whitelist de origens permitidas.
       Atualiza dinamicamente quando o iframe carregar. */
    var _allowedOrigins = new Set();
    _allowedOrigins.add(window.location.origin); /* same-origin sempre permitido */

    /* Rastrear origem do iframe ao carregar */
    function _trackIframeOrigin() {
      var frame = document.getElementById('gameFrame');
      if (!frame) return;
      frame.addEventListener('load', function () {
        try {
          var src = frame.src || frame.getAttribute('src') || '';
          if (src && src !== 'about:blank') {
            var url = new URL(src);
            _allowedOrigins.add(url.origin);
          }
        } catch (e) {}
      });
    }

    /* Mapa de eventos do jogo → eventos internos */
    var _EVENT_MAP = {
      'game:start':  function (payload) {
        try {
          /* RP-02: verificar guard compartilhado para evitar dupla emissão
             quando MutationObserver já disparou gameplay:start simultaneamente */
          if (window._np_r206_gpStarted) return;
          if (window.NP && window.NP.events && typeof window.NP.events.emit === 'function') {
            window.NP.events.emit('gameplay:start', { source: 'iframe', timestamp: Date.now() });
          }
          if (window.NPBus) NPBus.emit('gameplay:start', { source: 'iframe', timestamp: Date.now() });
          window._np_r206_gpStarted = true;
        } catch (e) {}
      },
      'game:end':    function (payload) {
        try {
          if (window.NP && window.NP.events && typeof window.NP.events.emit === 'function') {
            window.NP.events.emit('gameplay:end', { source: 'iframe', timestamp: Date.now() });
          }
          if (window.NPBus) NPBus.emit('gameplay:end', { source: 'iframe', timestamp: Date.now() });
        } catch (e) {}
      },
      'game:score':  function (payload) {
        try {
          if (window.NPBus) NPBus.emit('gameplay:score', { source: 'iframe', score: payload && payload.score, timestamp: Date.now() });
        } catch (e) {}
      },
      'game:win':    function (payload) {
        try {
          if (window.NPBus) NPBus.emit('gameplay:win', { source: 'iframe', timestamp: Date.now() });
        } catch (e) {}
      },
      'game:lose':   function (payload) {
        try {
          if (window.NPBus) NPBus.emit('gameplay:lose', { source: 'iframe', timestamp: Date.now() });
        } catch (e) {}
      }
    };

    function _onMessage(e) {
      try {
        var frame = document.getElementById('gameFrame');
        var fromKnownFrame = frame && frame.contentWindow && e.source === frame.contentWindow;

        /* SB-02: e.origin pode ser a string literal "null" em iframes sandboxed
           sem allow-same-origin. new URL("null") lança TypeError.
           Usar e.source como critério de confiança quando origin não é parseável. */
        if (!_allowedOrigins.has(e.origin)) {
          if (!fromKnownFrame) {
            return; /* origem desconhecida e não é o iframe do jogo — ignorar */
          }
          /* Veio do iframe correto — registrar origem se for URL válida */
          if (e.origin && e.origin !== 'null') {
            try {
              var url = new URL(e.origin);
              _allowedOrigins.add(url.origin);
            } catch (urlErr) { /* origin não parseável — ignorar, já confiamos via source */ }
          }
        }

        /* Validar estrutura da mensagem */
        var data = e.data;
        if (!data || typeof data !== 'object') return;
        if (typeof data.type !== 'string') return;

        /* game:start via bridge: guard contra dupla emissão com MutationObserver (RP-02) */
        var handler = _EVENT_MAP[data.type];
        if (!handler) return;

        handler(data);

      } catch (err) {
        /* Silencioso — não propagar erro de jogo para o host */
      }
    }

    /* SB-03: { passive: true } não tem efeito em eventos 'message' (só wheel/touch/scroll).
       Removido para evitar confusão em futuras revisões de código. */
    window.addEventListener('message', _onMessage);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _trackIframeOrigin);
    } else {
      _trackIframeOrigin();
    }

    /* Cleanup */
    function _cleanupBridge() {
      window.removeEventListener('message', _onMessage);
    }
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(_cleanupBridge);
    }
    window.addEventListener('pagehide', _cleanupBridge, { once: true });
  })();


  if (window.NP_DEBUG) {
    console.info('[NP R20.6] Hotfix loaded — gameplay:start/end monitor + iframe bridge');
  }

})();
