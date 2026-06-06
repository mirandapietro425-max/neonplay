;(function (window) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R10 — ZapDevTools.js
     Console de debug e tuning comportamental do ecossistema Zap.
     ─────────────────────────────────────────────────────────────
     REGRAS: debug only — não incluir em produção.
     Sem acesso a DOM/canvas. Usa EventBus e APIs públicas.
     Versão: R10.0
  ═══════════════════════════════════════════════════════════════ */

  if (window.ZAP_DEV) return;

  var _log = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[ZapDevTools]');
    console.log.apply(console, args);
  };

  var _emit = function (eventKey, payload) {
    if (!window.ZapEventBus || !window.ZAP_EVENTS) {
      console.warn('[ZapDevTools] ZapEventBus não disponível.');
      return false;
    }
    var type = window.ZAP_EVENTS[eventKey];
    if (!type) { console.warn('[ZapDevTools] Evento desconhecido: ' + eventKey); return false; }
    window.ZapEventBus.emit(type, payload);
    return true;
  };

  var _dev = {

    getBrain: function () {
      if (!window.ZapBrain) { _log('ZapBrain não carregado.'); return null; }
      var s = window.ZapBrain.getState();
      console.table ? console.table(s) : console.log(s);
      return s;
    },

    getSentience: function () {
      if (!window.ZapSentience) { _log('ZapSentience não carregado.'); return null; }
      var s = window.ZapSentience.getState();
      var m = window.ZapSentience.getModifiers ? window.ZapSentience.getModifiers() : null;
      _log('Sentience:', s.moodLabel, '| PAD: p=' + s.pleasure.toFixed(2) + ' a=' + s.arousal.toFixed(2) + ' d=' + s.dominance.toFixed(2));
      if (m) _log('Modifiers:', JSON.stringify(m));
      return { state: s, modifiers: m };
    },

    setMood: function (mood) {
      var valid = ['excited','curious','sad','tired','obsessed','neutral'];
      if (valid.indexOf(mood) === -1) { console.warn('[ZapDevTools] Mood inválido: ' + valid.join(', ')); return; }
      _emit('BRAIN_MOOD_CHANGED', { mood: mood, pad: { pleasure: 0, arousal: 0, dominance: 0 }, reason: 'devtools_force' });
      _log('Mood forçado →', mood);
    },

    say: function (text, mood) {
      if (!text) { console.warn('[ZapDevTools] Texto obrigatório.'); return; }
      _emit('BRAIN_SPEECH', { text: text, mood: mood || 'curious', duration: 5000, priority: 5 });
      _log('Speech forçado: "' + text + '"');
    },

    forceLore: function (fragmentId) {
      _emit('BRAIN_LORE_TRIGGER', { fragmentId: fragmentId || 'devtools_force', context: 'devtools' });
      _log('Lore trigger forçado:', fragmentId || 'devtools_force');
    },

    simulateFailure: function () {
      _emit('QUEST_PROGRESS', { questId: 'dev_test', progress: 'failed', isCompleted: false });
      _log('Failure simulado via QUEST:PROGRESS');
    },

    simulateAbsence: function () {
      try {
        var SENTIENCE_KEY = 'zap_sentience_v1';
        var s = JSON.parse(localStorage.getItem(SENTIENCE_KEY) || '{}');
        s.lastSessionTs = Date.now() - (72 * 60 * 60 * 1000);
        localStorage.setItem(SENTIENCE_KEY, JSON.stringify(s));

        var BRAIN_KEY = 'zap_brain_v1';
        var b = JSON.parse(localStorage.getItem(BRAIN_KEY) || '{}');
        b.lastReturnComment = 0;
        localStorage.setItem(BRAIN_KEY, JSON.stringify(b));

        _log('Ausência simulada: lastSessionTs = 72h atrás. Recarregue para ver reação.');
      } catch (e) { console.error('[ZapDevTools] Erro:', e); }
    },

    resetBrain: function () {
      try { localStorage.removeItem('zap_brain_v1'); _log('Brain resetado. Recarregue.'); }
      catch (e) { console.error('[ZapDevTools] Erro:', e); }
    },

    listEvents: function () {
      if (!window.ZAP_EVENTS) { _log('ZAP_EVENTS não disponível.'); return; }
      console.table ? console.table(window.ZAP_EVENTS) : console.log(window.ZAP_EVENTS);
    },

    getLore: function () {
      if (!window.ZapLore) { _log('ZapLore não carregado.'); return null; }
      var s = window.ZapLore.getState();
      _log('Lore: ' + s.unlocked.length + '/' + window.ZapLore.fragments.length + ' desbloqueados');
      return s;
    },

    triggerGlitch: function () {
      if (window.ZapWorldEngine && typeof window.ZapWorldEngine.triggerGlitch === 'function') {
        window.ZapWorldEngine.triggerGlitch();
        _log('Cosmic Glitch forçado.');
      } else { _log('ZapWorldEngine.triggerGlitch não disponível.'); }
    },

    status: function () {
      var modules = ['ZapBrain','ZapSentience','ZapLore','ZapEventBus',
                     'ZapCompanion','ZapEconomy','ZapCosmetics','ZapConnect',
                     'ZapBadges','ZapBioreactive','ZapWorldEngine','ZapAudioEngine','ZapCompanionController'];
      _log('=== ZAP ECOSYSTEM STATUS ===');
      modules.forEach(function (m) {
        var loaded = !!window[m] || (m === 'ZapLore' && !!window.ZapLore);
        console.log('  ' + (loaded ? '✓' : '✗') + ' ' + m);
      });
      console.log('  ' + (window.ZAP_EVENTS ? '✓' : '✗') + ' ZapEventContract (ZAP_EVENTS)');
      if (window.ZapBrain) {
        var b = window.ZapBrain.getState();
        _log('Brain mood:', b.currentMood, '| PAD p=' + b.pad.pleasure.toFixed(2));
      }
      if (window.ZapEconomy) _log('Coins:', window.ZapEconomy.getCoins());
    }
  };

  window.ZAP_DEV = Object.freeze(_dev);
  _log('DevTools R10 carregado. Use ZAP_DEV.status() para ver o ecossistema.');

}(window));
