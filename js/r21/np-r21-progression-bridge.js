/**
 * NeonPlay R21 — np-r21-progression-bridge.js
 * Ponte entre ZapProgressionSystem e os buses de eventos.
 *
 * PROPÓSITO: ZapProgressionSystem.addXP() não emite eventos para NPBus
 * nem ZapEventBus — ele apenas atualiza estado interno e UI local.
 * Este bridge intercepta addXP() não-invasivamente (wrapper pattern)
 * e emite os eventos necessários para os módulos R21 consumirem.
 *
 * REGRAS:
 * - Não modifica ZapProgressionSystem diretamente (IIFE interno)
 * - Wrappa a função exposta em window.ZapProgressionSystem
 * - Guard double-init
 * - Aguarda NP:progression-ready antes de aplicar o wrap
 * - Emite via AMBOS os buses (backward compat)
 */
;(function(window) {
  'use strict';

  if (window.__NP_PROGRESSION_BRIDGE__) return;
  window.__NP_PROGRESSION_BRIDGE__ = true;

  function _applyBridge() {
    var ZPS = window.ZapProgressionSystem;
    if (!ZPS || !ZPS._ready) return false;

    /* Já foi wrapped? */
    if (ZPS.__bridged__) return true;
    ZPS.__bridged__ = true;

    var _originalAddXP = ZPS.addXP.bind(ZPS);

    ZPS.addXP = function(amount, reason) {
      /* 1. Chamar o original — estado e UI não mudam */
      _originalAddXP(amount, reason);

      /* 2. Ler estado atualizado */
      var prog = ZPS.getProgress ? ZPS.getProgress() : null;
      if (!prog) return;

      /* 3. Emitir xp:gain via NPBus (legado — nunca renomear) */
      if (window.NPBus) {
        try {
          NPBus.emit(NPBus.EV.XP_GAIN, {
            gained: amount,
            total:  prog.xpCur || 0,
            reason: reason || 'unknown'
          });
        } catch(e) {}
      }

      /* 4. Emitir CORE:XP_CHANGED via ZapEventBus (governado) */
      if (window.ZapEventBus && window.ZAP_EVENTS) {
        try {
          ZapEventBus.emit(ZAP_EVENTS.CORE_XP_CHANGED, {
            rawLevel:    prog.level || 1,
            currentXp:   prog.xpCur || 0,
            nextLevelXp: prog.xpNext || 100,
            gained:      amount
          });
        } catch(e) {}
      }
    };

    /* Wrap addXP para também detectar level up */
    var _prevLevel = ZPS.getProgress ? (ZPS.getProgress().level || 1) : 1;

    ZapProgressionSystem._checkLevelUp = function() {
      var prog = ZPS.getProgress ? ZPS.getProgress() : null;
      if (!prog) return;
      var curLevel = prog.level || 1;
      if (curLevel > _prevLevel) {
        _prevLevel = curLevel;

        /* NPBus LEVEL_UP */
        if (window.NPBus) {
          try {
            NPBus.emit(NPBus.EV.LEVEL_UP, { newLevel: curLevel });
          } catch(e) {}
        }

        /* ZapEventBus CORE:LEVEL_UP */
        if (window.ZapEventBus && window.ZAP_EVENTS) {
          try {
            ZapEventBus.emit(ZAP_EVENTS.CORE_LEVEL_UP, {
              newLevel: curLevel,
              unlockedScenes: []
            });
          } catch(e) {}
        }
      }
    };

    /* Hook no addXP original para checar level */
    var _addXPWithLevelCheck = ZPS.addXP;
    ZPS.addXP = function(amount, reason) {
      _addXPWithLevelCheck.call(ZPS, amount, reason);
      setTimeout(ZPS._checkLevelUp, 100); /* após UI update */
    };

    if (window.NP_DEBUG) console.log('[R21:Bridge] ZapProgressionSystem bridge ativado.');
    return true;
  }

  /* Aguardar NP:progression-ready */
  document.addEventListener('NP:progression-ready', function() {
    _applyBridge();
  });

  /* Fallback polling curto (caso evento já tenha disparado) */
  var _tries = 0;
  var _poll = setInterval(function() {
    _tries++;
    if (_applyBridge() || _tries >= 30) {
      clearInterval(_poll);
    }
  }, 500);

  /* Cleanup via lifecycle */
  if (window.NP && window.NP.lifecycle && window.NP.lifecycle.registerCleanup) {
    NP.lifecycle.registerCleanup(function() {
      clearInterval(_poll);
    });
  }

})(window);
