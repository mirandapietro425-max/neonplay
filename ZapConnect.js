;(function (window) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R7 — ZapConnect.js
     Sincronização inter-abas via BroadcastChannel.

     Canal: neonplay_zap_core
     Sincroniza: coins, equipped cosmetics, unlocks, mute state
     NÃO sincroniza: render state, RAF, posição do widget, UI

     Ordem de carregamento (game.html):
       ZapEconomy.js → ZapCosmetics.js → ZapCompanion.js
       → ZapConnect.js  ← este arquivo (hookeado por wrappers)
       → ZapAudioEngine.js
     ═══════════════════════════════════════════════════════════════ */

  /* ── Guard de double-init ─────────────────────────────────────── */
  if (window.__ZAP_CONNECT__) return;
  window.__ZAP_CONNECT__ = true;

  /* ── Constantes ───────────────────────────────────────────────── */
  var CHANNEL_NAME     = 'neonplay_zap_core';
  var SNAPSHOT_TIMEOUT = 1200; /* ms para aguardar snapshot de outra aba */
  var MSG_TYPES = {
    COINS_UPDATE:    'coins_update',
    COSMETIC_UPDATE: 'cosmetic_update',
    UNLOCK_UPDATE:   'unlock_update',
    MUTE_UPDATE:     'mute_update',
    SNAPSHOT_REQ:    'snapshot_req',
    SNAPSHOT_RES:    'snapshot_res'
  };

  /* ── tabId único por aba (não persiste entre reloads) ─────────── */
  var _tabId = 'tab_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();

  /* ── Estado interno ───────────────────────────────────────────── */
  var _channel       = null;
  var _lastSeenTs    = {}; /* deduplicação: { type+source: ts } */
  var _snapshotTimer = null;
  var _unsubEconomy  = null;
  var _unsubCosmetics = null;

  /* ── BroadcastChannel com fallback gracioso ───────────────────── */
  function _openChannel() {
    if (typeof BroadcastChannel === 'undefined') {
      /* BroadcastChannel não suportado (Safari < 15.4) — silently no-op */
      _log('BroadcastChannel não suportado — sync desativado');
      return false;
    }
    try {
      _channel = new BroadcastChannel(CHANNEL_NAME);
      _channel.onmessage = _onMessage;
      return true;
    } catch (e) {
      _log('Erro ao abrir canal: ' + e.message);
      return false;
    }
  }

  function _closeChannel() {
    if (_channel) {
      _channel.onmessage = null;
      try { _channel.close(); } catch (e) {}
      _channel = null;
    }
  }

  /* ── Broadcast (com guard anti-echo via tabId) ────────────────── */
  function _broadcast(type, payload) {
    if (!_channel) return;
    try {
      _channel.postMessage({
        type:   type,
        source: _tabId,
        ts:     Date.now(),
        data:   payload || {}
      });
    } catch (e) {
      _log('Broadcast error: ' + e.message);
    }
  }

  /* ── Deduplicação: ignora mensagem já processada ──────────────── */
  function _isDuplicate(msg) {
    var key = msg.type + '|' + msg.source;
    var last = _lastSeenTs[key] || 0;
    /* Aceita se ts > last (permite replay real, rejeita echo) */
    if (msg.ts <= last) return true;
    _lastSeenTs[key] = msg.ts;
    return false;
  }

  /* ── Receptor de mensagens ────────────────────────────────────── */
  function _onMessage(event) {
    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    /* Anti-echo: ignorar próprias mensagens */
    if (msg.source === _tabId) return;

    /* Deduplicação por timestamp */
    if (_isDuplicate(msg)) return;

    switch (msg.type) {

      case MSG_TYPES.COINS_UPDATE:
        /* Atualizar localStorage diretamente (ZapEconomy.onChange vai notificar UI) */
        if (window.ZapEconomy && typeof msg.data.value === 'number') {
          try {
            var _prevCoins = window.ZapEconomy.getCoins();
            localStorage.setItem('np_r7_coins', String(Math.max(0, msg.data.value)));
            /* R9: emitir via EventBus — ZapCompanionController escuta e atualiza UI.
               ZapConnect (CORE) não chama ZapCompanion (VIEW) diretamente. */
            _withoutBroadcast(function () {
              if (window.ZapEventBus && window.ZAP_EVENTS) {
                window.ZapEventBus.emit(window.ZAP_EVENTS.ECONOMY_COINS_CHANGED, {
                  currentBalance: msg.data.value,
                  delta:          msg.data.value - _prevCoins,
                  reason:         msg.data.reason || 'sync'
                });
              }
            });
          } catch (e) {}
        }
        break;

      case MSG_TYPES.COSMETIC_UPDATE:
      case MSG_TYPES.UNLOCK_UPDATE:
        /* Atualizar localStorage diretamente — ZapCosmetics lê sempre fresco */
        if (window.ZapCosmetics && msg.data.state) {
          try {
            localStorage.setItem('np_r7_cosmetics', JSON.stringify(msg.data.state));
            /* R9: Companion escuta ECONOMY:COINS_CHANGED via EventBus.
               Para cosméticos ainda delegamos ao _syncCosmetics mas via
               verificação defensiva — transitório até R10. */
            if (window.ZapCompanion && typeof window.ZapCompanion._syncCosmetics === 'function') {
              window.ZapCompanion._syncCosmetics(msg.data.state);
            }
          } catch (e) {}
        }
        break;

      case MSG_TYPES.MUTE_UPDATE:
        if (window.ZapAudio && typeof msg.data.muted === 'boolean') {
          _withoutBroadcast(function () {
            window.ZapAudio._applyMute(msg.data.muted);
          });
        }
        break;

      case MSG_TYPES.SNAPSHOT_REQ:
        /* Outra aba pediu snapshot — responder com estado atual */
        _broadcast(MSG_TYPES.SNAPSHOT_RES, _buildSnapshot());
        break;

      case MSG_TYPES.SNAPSHOT_RES:
        /* Recebemos snapshot de outra aba — aplicar se ainda aguardando */
        if (_snapshotTimer !== null) {
          clearTimeout(_snapshotTimer);
          _snapshotTimer = null;
          _applySnapshot(msg.data);
        }
        break;
    }
  }

  /* ── Flag para suprimir broadcast durante sync remota ────────── */
  var _suppressBroadcast = false;

  function _withoutBroadcast(fn) {
    _suppressBroadcast = true;
    try { fn(); } finally { _suppressBroadcast = false; }
  }

  /* ── Snapshot ─────────────────────────────────────────────────── */
  function _buildSnapshot() {
    return {
      coins:      window.ZapEconomy  ? window.ZapEconomy.getCoins()   : 0,
      cosmetics:  window.ZapCosmetics ? window.ZapCosmetics.getEquipped() : null,
      muted:      window.ZapAudio    ? window.ZapAudio.isMuted()       : false
    };
  }

  function _applySnapshot(data) {
    if (!data) return;
    _log('Aplicando snapshot de outra aba');

    if (typeof data.coins === 'number') {
      var _snapPrev = window.ZapEconomy ? window.ZapEconomy.getCoins() : 0;
      try { localStorage.setItem('np_r7_coins', String(Math.max(0, data.coins))); } catch (e) {}
      /* R9: EventBus em vez de chamada direta ao Companion */
      if (window.ZapEventBus && window.ZAP_EVENTS) {
        window.ZapEventBus.emit(window.ZAP_EVENTS.ECONOMY_COINS_CHANGED, {
          currentBalance: data.coins,
          delta:          data.coins - _snapPrev,
          reason:         'snapshot'
        });
      }
    }

    if (data.cosmetics) {
      try { localStorage.setItem('np_r7_cosmetics', JSON.stringify(data.cosmetics)); } catch (e) {}
      /* _syncCosmetics transitório — migrar para EventBus no R10 */
      if (window.ZapCompanion && typeof window.ZapCompanion._syncCosmetics === 'function') {
        window.ZapCompanion._syncCosmetics(data.cosmetics);
      }
    }

    if (typeof data.muted === 'boolean' && window.ZapAudio) {
      window.ZapAudio._applyMute(data.muted);
    }
  }

  /* ── Hooks nos módulos existentes (via onChange, sem modificar código interno) */
  function _hookEconomy() {
    if (!window.ZapEconomy) return;
    _unsubEconomy = window.ZapEconomy.onChange(function (ev) {
      if (_suppressBroadcast) return;
      _broadcast(MSG_TYPES.COINS_UPDATE, { value: ev.total, delta: ev.amount, reason: ev.reason });
    });
  }

  function _hookCosmetics() {
    if (!window.ZapCosmetics) return;
    _unsubCosmetics = window.ZapCosmetics.onChange(function (state) {
      if (_suppressBroadcast) return;
      _broadcast(MSG_TYPES.COSMETIC_UPDATE, { state: state });
    });
  }

  /* ── Sincronização inicial ────────────────────────────────────── */
  function _requestSnapshot() {
    _broadcast(MSG_TYPES.SNAPSHOT_REQ, {});
    /* Timeout: se nenhuma aba responder em 1200ms, usar localStorage como fallback */
    _snapshotTimer = setTimeout(function () {
      _snapshotTimer = null;
      _log('Sem resposta de snapshot — usando localStorage como fallback');
      /* localStorage já é a fonte de verdade; nenhuma ação necessária */
    }, SNAPSHOT_TIMEOUT);
  }

  /* ── Broadcast público de mute (chamado pelo ZapAudioEngine) ─── */
  function broadcastMute(muted) {
    _broadcast(MSG_TYPES.MUTE_UPDATE, { muted: muted });
  }

  /* ── Debug ────────────────────────────────────────────────────── */
  function broadcastTest() {
    _log('broadcastTest → enviando coins_update de teste');
    _broadcast(MSG_TYPES.COINS_UPDATE, { value: window.ZapEconomy ? window.ZapEconomy.getCoins() : 0, reason: 'debug' });
  }

  function _log(msg) {
    if (window.ZAP_DEBUG && window.ZAP_DEBUG._verbose) {
      console.log('[ZapConnect|' + _tabId + '] ' + msg);
    }
  }

  /* ── Cleanup ──────────────────────────────────────────────────── */
  function destroy() {
    if (_snapshotTimer) { clearTimeout(_snapshotTimer); _snapshotTimer = null; }
    if (_unsubEconomy)  { _unsubEconomy();  _unsubEconomy  = null; }
    if (_unsubCosmetics){ _unsubCosmetics(); _unsubCosmetics = null; }
    _closeChannel();
  }

  /* ── Inicialização ────────────────────────────────────────────── */
  function _init() {
    var ok = _openChannel();
    if (!ok) return; /* sem BroadcastChannel — módulo silencioso */

    _hookEconomy();
    _hookCosmetics();
    _requestSnapshot();

    /* Registrar cleanup no lifecycle do NeonPlay */
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(destroy);
    }

    _log('ZapConnect iniciado — tabId: ' + _tabId);
  }

  /* ── API pública ────────────────────────────────────────────── */
  window.ZapConnect = {
    tabId:         _tabId,
    broadcastMute: broadcastMute,
    broadcastTest: broadcastTest,
    destroy:       destroy
  };

  /* Inicializar após DOMContentLoaded (ZapEconomy e ZapCosmetics já carregados via defer) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window));
