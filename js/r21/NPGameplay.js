/**
 * NeonPlay R21 — NPGameplay.js
 * Rastreamento de sessões de gameplay via gameplay:start / gameplay:end.
 *
 * REGRAS:
 * - NUNCA injeta scripts em iframes de jogos existentes
 * - Leitura passiva via NP.events (gameplay:start / gameplay:end)
 * - window._currentGame para obter gameId e category
 * - Sessão válida: duração > 30s (conforme Blueprint)
 * - postMessage API opcional (np:score) sem modificar jogos
 * - Guard double-init
 * - Sem new setInterval sem _maxTries
 */
;(function(window) {
  'use strict';

  if (window.__NP_GAMEPLAY__) return;
  window.__NP_GAMEPLAY__ = true;

  /* ── Estado da sessão ────────────────────────────────────────── */
  var _session = {
    active:    false,
    gameId:    null,
    category:  null,
    startTs:   0,
    score:     null   /* via postMessage np:score, opcional */
  };

  var STORAGE_KEY     = 'np_gameplay_v1';
  var MIN_SESSION_MS  = 30 * 1000; /* 30s para sessão válida */

  /* ── Persistência leve (histórico de partidas) ─────────────── */
  function _loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') ||
             { sessions: 0, totalMs: 0, lastGameId: null };
    } catch(e) {
      return { sessions: 0, totalMs: 0, lastGameId: null };
    }
  }

  function _saveHistory(h) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch(e) {}
  }

  /* ── Início de sessão ────────────────────────────────────────── */
  function _onGameStart(data) {
    _session.active   = true;
    _session.startTs  = Date.now();
    _session.score    = null;
    /* Ler gameId do objeto global (conforme Blueprint) */
    var cg = window._currentGame || {};
    _session.gameId   = (data && data.gameId) || cg.gameId || cg.slug || 'unknown';
    _session.category = (data && data.category) || cg.category || 'unknown';
    if (window.NP_DEBUG) console.log('[NPGameplay] Session start:', _session.gameId);
  }

  /* ── Fim de sessão ───────────────────────────────────────────── */
  function _onGameEnd() {
    if (!_session.active) return;
    var durationMs = Date.now() - _session.startTs;
    var isValid    = durationMs >= MIN_SESSION_MS;

    _session.active = false;

    if (window.NP_DEBUG) {
      console.log('[NPGameplay] Session end. Duration:', durationMs, 'Valid:', isValid);
    }

    /* Atualizar histórico */
    var h = _loadHistory();
    if (isValid) {
      h.sessions    = (h.sessions || 0) + 1;
      h.totalMs     = (h.totalMs  || 0) + durationMs;
      h.lastGameId  = _session.gameId;
      _saveHistory(h);
    }

    /* Emitir evento de sessão via NPBus */
    if (window.NPBus) {
      try {
        NPBus.emit(NPBus.EV.GAMEPLAY_SESSION, {
          gameId:     _session.gameId,
          category:   _session.category,
          durationMs: durationMs,
          isValid:    isValid,
          score:      _session.score
        });
      } catch(e) {}
    }

    /* Emitir via ZapEventBus */
    if (window.ZapEventBus && window.ZAP_EVENTS) {
      try {
        ZapEventBus.emit(ZAP_EVENTS.GAMEPLAY_SESSION_COMPLETE, {
          gameId:     _session.gameId,
          durationMs: durationMs,
          isValid:    isValid
        });
      } catch(e) {}
    }

    /* Reset */
    _session.gameId   = null;
    _session.category = null;
    _session.startTs  = 0;
    _session.score    = null;
  }

  /* ── postMessage handler (np:score — opcional) ─────────────── */
  function _onMessage(e) {
    if (!e || !e.data || typeof e.data !== 'object') return;
    if (e.data.type !== 'np:score') return;
    if (!_session.active) return;
    _session.score = e.data.score || null;
  }

  /* ── API pública ─────────────────────────────────────────────── */
  var NPGameplay = {
    getSession: function() {
      return Object.assign({}, _session);
    },

    getHistory: function() {
      return _loadHistory();
    },

    init: function() {
      /* Subscribe via NP.events */
      if (window.NP && NP.events) {
        NP.events.on('gameplay:start', _onGameStart);
        NP.events.on('gameplay:end',   _onGameEnd);
      }

      /* Subscribe via NPBus (caso NP.events não esteja disponível) */
      if (window.NPBus) {
        NPBus.on(NPBus.EV.GAME_OPEN, function(data) {
          /* GAME_OPEN ≈ gameplay:start em contextos sem iframe direto */
          if (!_session.active) _onGameStart(data);
        });
      }

      /* postMessage para np:score opcional */
      window.addEventListener('message', _onMessage);

      /* Cleanup */
      if (window.NP && window.NP.lifecycle && NP.lifecycle.registerCleanup) {
        NP.lifecycle.registerCleanup(function() {
          if (window.NP && NP.events) {
            NP.events.off('gameplay:start', _onGameStart);
            NP.events.off('gameplay:end',   _onGameEnd);
          }
          window.removeEventListener('message', _onMessage);
          if (_session.active) _onGameEnd(); /* flush sessão aberta */
        });
      }

      if (window.NP_DEBUG) console.log('[NPGameplay] init OK.');
    }
  };

  window.NPGameplay = NPGameplay;

})(window);
