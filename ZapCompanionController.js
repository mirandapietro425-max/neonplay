;(function (window, document) {
  'use strict';

  if (window.ZapCompanionController) return;

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R9 — ZapCompanionController.js
     Orquestra os sub-módulos do Companion e gerencia lifecycle.
     ─────────────────────────────────────────────────────────────
     Depende de (carregar antes):
       ZapEventContract.js
       ZapEventBus.js
       ZapCompanion.js      ← preservado intacto
       ZapBioreactive.js
       ZapWorldEngine.js

     NÃO modifica ZapCompanion internamente.
     Preserva window.ZapCompanion API pública 100%.
     ─────────────────────────────────────────────────────────────
     Responsabilidades:
       Physics   → drag / bounds (delegado ao Companion existente)
       Renderer  → canvas tick   (delegado ao Companion existente)
       LootEngine→ drop cycle    (delegado ao Companion existente)
       SpeechBubble → say()/clear() com wrapper governado
     ─────────────────────────────────────────────────────────────
     Sub-módulos neste arquivo (inline, não quebrar em arquivos
     extras para manter um patch mínimo):
       ZapCompanion.Physics       — API de dragging
       ZapCompanion.Renderer      — API de canvas
       ZapCompanion.LootEngine    — API de drops
       ZapCompanion.SpeechBubble  — API de balão
     ─────────────────────────────────────────────────────────────
     Versão: R9.0
  ═══════════════════════════════════════════════════════════════ */

  if (!window.ZapCompanion) {
    console.warn('[ZapCompanionController] ZapCompanion não encontrado. Abortando.');
    return;
  }

  /* ── Registro de cleanups ──────────────────────────────────── */
  var _cleanups = [];

  function _registerCleanup(fn) {
    if (typeof fn === 'function') _cleanups.push(fn);
  }

  /* ── SpeechBubble sub-módulo ───────────────────────────────── */
  var _SpeechBubble = {
    /**
     * Exibir texto no balão do Zap.
     * Delega para ZapCompanion.showBubble — mantém retrocompatibilidade.
     * @param {string} text
     * @param {number} [duration] ms (ignorado por ora — Companion controla)
     */
    say: function (text, duration) {
      if (!text || typeof text !== 'string') return;
      if (window.ZapCompanion && typeof window.ZapCompanion.showBubble === 'function') {
        window.ZapCompanion.showBubble(text);
      }
    },

    clear: function () {
      /* ZapCompanion não expõe clearBubble diretamente;
         dizer string vazia fecha o balão se o módulo tratar */
    },

    destroy: function () { /* sem recursos próprios */ }
  };

  /* ── Physics sub-módulo ────────────────────────────────────── */
  var _Physics = {
    /**
     * Drag, bounds e inércia são gerenciados internamente pelo ZapCompanion.
     * Este sub-módulo expõe a API esperada para futuras extensões.
     */
    initDraggable: function () {
      /* já inicializado pelo ZapCompanion.mount() */
    },

    updateBounds: function () {
      /* ZapCompanion clamp interno — sem ação necessária */
    },

    destroy: function () { /* sem recursos próprios */ }
  };

  /* ── Renderer sub-módulo ───────────────────────────────────── */
  var _Renderer = {
    /**
     * O canvas rAF loop é gerenciado pelo ZapCompanion internamente.
     * Este sub-módulo expõe a API pública esperada.
     */
    draw: function () {
      /* delegado ao rAF interno do ZapCompanion */
    },

    applyCosmetics: function (state) {
      if (window.ZapCompanion && typeof window.ZapCompanion._syncCosmetics === 'function') {
        window.ZapCompanion._syncCosmetics(state);
      }
    },

    setMood: function (mood) {
      /* ZapBioreactive mapeia mood → modificadores canvas */
      if (window.ZapBioreactive && typeof window.ZapBioreactive._applyMood === 'function') {
        window.ZapBioreactive._applyMood(mood);
      }
    },

    destroy: function () { /* rAF cleanup é do Companion */ }
  };

  /* ── LootEngine sub-módulo ─────────────────────────────────── */
  var _LootEngine = {
    /**
     * Ciclo de drops gerenciado pelo ZapCompanion.
     * API exposta para extensão futura.
     */
    spawnCoinDrop: function () {
      /* ZapCompanion spawna drops automaticamente — sem ação direta necessária */
    },

    clearExpiredDrops: function () {
      /* gerenciado internamente pelo ZapCompanion */
    },

    destroy: function () { /* sem recursos próprios */ }
  };

  /* ── EventBus listeners ────────────────────────────────────── */
  function _setupEventListeners() {
    if (!window.ZapEventBus || !window.ZAP_EVENTS) return;

    /* COMPANION:SPEECH → SpeechBubble.say */
    var _onSpeech = function (data) {
      _SpeechBubble.say(data.text, data.duration);
    };
    window.ZapEventBus.on(window.ZAP_EVENTS.COMPANION_SPEECH, _onSpeech);
    _registerCleanup(function () {
      window.ZapEventBus.off(window.ZAP_EVENTS.COMPANION_SPEECH, _onSpeech);
    });

    /* COMPANION:MOOD → Renderer.setMood */
    var _onMood = function (data) {
      _Renderer.setMood(data.mood);
    };
    window.ZapEventBus.on(window.ZAP_EVENTS.COMPANION_MOOD, _onMood);
    _registerCleanup(function () {
      window.ZapEventBus.off(window.ZAP_EVENTS.COMPANION_MOOD, _onMood);
    });

    /* ECONOMY:COINS_CHANGED → atualizar display do Companion */
    var _onCoins = function (data) {
      if (window.ZapCompanion && typeof window.ZapCompanion._syncCoins === 'function') {
        window.ZapCompanion._syncCoins(data.currentBalance);
      }
    };
    window.ZapEventBus.on(window.ZAP_EVENTS.ECONOMY_COINS_CHANGED, _onCoins);
    _registerCleanup(function () {
      window.ZapEventBus.off(window.ZAP_EVENTS.ECONOMY_COINS_CHANGED, _onCoins);
    });

    /* LIFECYCLE:DESTROY → destroy controller */
    var _onDestroy = function () { _controller.destroy(); };
    window.ZapEventBus.on(window.ZAP_EVENTS.LIFECYCLE_DESTROY, _onDestroy);
    _registerCleanup(function () {
      window.ZapEventBus.off(window.ZAP_EVENTS.LIFECYCLE_DESTROY, _onDestroy);
    });
  }

  /* ── Destroy rigoroso ──────────────────────────────────────── */
  function _destroy() {
    /* 1. Sub-módulos */
    _Renderer.destroy();
    _LootEngine.destroy();
    _SpeechBubble.destroy();
    _Physics.destroy();

    /* 2. EventBus listeners deste controller */
    for (var i = 0; i < _cleanups.length; i++) {
      try { _cleanups[i](); } catch (e) {}
    }
    _cleanups.length = 0;

    /* 3. Companion principal */
    if (window.ZapCompanion && typeof window.ZapCompanion.destroy === 'function') {
      window.ZapCompanion.destroy();
    }
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function _init() {
    _setupEventListeners();

    /* Registrar cleanup no lifecycle NeonPlay */
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(_destroy);
    } else {
      /* Fallback seguro */
      window.addEventListener('beforeunload', _destroy);
      _registerCleanup(function () {
        window.removeEventListener('beforeunload', _destroy);
      });
    }
  }

  /* ── API pública do Controller ─────────────────────────────── */
  var _controller = {
    Physics:      _Physics,
    Renderer:     _Renderer,
    LootEngine:   _LootEngine,
    SpeechBubble: _SpeechBubble,
    destroy:      _destroy
  };

  window.ZapCompanionController = Object.freeze(_controller);

  /* ── Manter compatibilidade total com window.ZapCompanion ─── */
  /* Expor sub-módulos como propriedades do ZapCompanion existente
     sem sobrescrever a API pública (mount/unmount/destroy/showBubble) */
  try {
    if (!window.ZapCompanion.Physics)      window.ZapCompanion.Physics      = _Physics;
    if (!window.ZapCompanion.Renderer)     window.ZapCompanion.Renderer     = _Renderer;
    if (!window.ZapCompanion.LootEngine)   window.ZapCompanion.LootEngine   = _LootEngine;
    if (!window.ZapCompanion.SpeechBubble) window.ZapCompanion.SpeechBubble = _SpeechBubble;
  } catch (e) {
    /* ZapCompanion pode ser frozen em versões futuras — ignorar silenciosamente */
  }

  _init();

}(window, document));
