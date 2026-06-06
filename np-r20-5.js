/* ══════════════════════════════════════════════════════════════════
   NeonPlay Patch R20.5 — Runtime Governance + Execution Discipline
   Base: R20.4  |  Arquivo: np-r20-5.js
   Carregado via <script defer> após np-r20-4.js

   OBJETIVO: impedir regressão estrutural futura via:
   - Execution discipline (safeInterval, safeTimeout, NRT.once)
   - Duplicate protection (NRT.flags)
   - Overlay governance (NRT.overlays)
   - Ownership map operacional (NRT.ownership)
   - Audit helpers (NRT.audit)
   - XP flush hardening (_isFlushing guard)
   - Bridge NeonPlayRuntime cleanup → window.NP.lifecycle

   REGRAS:
   - Zero novos frameworks
   - Zero redesign visual
   - Zero rewrite de bundle.min.js
   - Compatível 100% com R20.4
   - bundle.min.js já define window.NP.lifecycle.registerCleanup —
     este patch augmenta NeonPlayRuntime e conecta os dois registries

   ARQUIVOS ALTERADOS: np-r20-5.js (NEW), index.html (+1), game.html (+1)

   AUDITORIA R20.5:
   §A  window.NP.lifecycle — já definido pelo bundle.min.js (v96+).
       Cleanup hooks do ZapAudioEngine, ZapBadges, ZapBioreactive,
       ZapBrain, ZapCompanion, ZapCompanionController, ZapConnect,
       ZapLoreEngine, ZapSentience, ZapWorldEngine JÁ FUNCIONAM.
       bundle.min.js chama lifecycle.runCleanup() em page:unload.
       NÃO precisam ser re-implementados.

   §B  window.NP.events — já definido pelo bundle.
       gameplay:start / gameplay:end: subscrito por ZapBadges,
       ZapCompanion, ZapLoreEngine, ZapSentience mas NUNCA emitido
       externamente. Dormant hooks — não introduzidos pelo patch.
       Documentado como risco residual; fora do escopo do R20.5.

   §C  np-r20-2.js setIntervals — dois intervals (linhas 120, 167)
       ainda rodam buscando window.grantXP (IIFE-local, inexistente)
       e ZapProgressionSystem (agora acessível via window em R20.4).
       O _scope_check (linha 120) encontra window.ZapProgressionSystem
       após init e instala o hook morto. O _hookInterval (linha 167)
       expira em 150 iterações (~30 s). Nenhum causa leak permanente.
       R20.5 os blinda via NRT.flags.xpBufferInstalled.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Aguardar NeonPlayRuntime (definido por np-r20-4.js, deve existir) ── */
  var NRT = window.NeonPlayRuntime;
  if (!NRT) {
    if (window.NP_DEBUG) {
      console.warn('[NP R20.5] NeonPlayRuntime não encontrado — np-r20-4.js não carregou?');
    }
    return;
  }


  /* ──────────────────────────────────────────────────────────────
     1. EXECUTION DISCIPLINE — helpers para runtime seguro

     NRT.safeInterval(source, fn, ms, maxTries?)
       Wraps setInterval com: tracking diagnóstico, maxTries implícito
       (padrão 300 = ~60 s a 200 ms), e cleanup automático.

     NRT.safeTimeout(source, fn, ms)
       Wraps setTimeout com tracking.

     NRT.once(target, event, fn, source?)
       addEventListener com { once: true } + tracking.

     Estes helpers NÃO interceptam APIs nativas globalmente.
     São wrappers opt-in para código novo do runtime patch.
  ────────────────────────────────────────────────────────────────── */
  NRT.safeInterval = function (source, fn, ms, maxTries) {
    var _tries = 0;
    var _max   = (maxTries && maxTries > 0) ? maxTries : 300; /* default ~60 s @ 200 ms */
    var _id    = setInterval(function () {
      _tries++;
      if (_tries > _max) {
        clearInterval(_id);
        NRT.debug.warnOnce('si-maxretries-' + source, 'safeInterval expirou: ' + source + ' (' + _max + ' iterações)');
        /* Remove do registry */
        NRT.diagnostics.intervals = NRT.diagnostics.intervals.filter(function (e) { return e.id !== _id; });
        return;
      }
      /* GP-W02 R20.7: guard — fn pode ser undefined se caller passou argumento errado */
      if (typeof fn !== 'function') { clearInterval(_id); return; }
      fn();
    }, ms);
    NRT._trackInterval(_id, source);
    return _id;
  };

  NRT.safeTimeout = function (source, fn, ms) {
    var _id = setTimeout(function () {
      /* GP-W02 R20.7: mesmo guard para safeTimeout */
      if (typeof fn !== 'function') { return; }
      fn();
      NRT.diagnostics.intervals = NRT.diagnostics.intervals.filter(function (e) { return e.id !== _id; });
    }, ms);
    NRT._trackInterval(_id, source + ':timeout');
    return _id;
  };

  NRT.once = function (target, event, fn, source) {
    if (!target || typeof target.addEventListener !== 'function') return;
    target.addEventListener(event, fn, { once: true });
    NRT._trackListener(target, event, source || 'NRT.once');
  };


  /* ──────────────────────────────────────────────────────────────
     2. FLAGS — duplicate protection
     Previne reintrodução silenciosa de listeners, observers e
     retries duplicados.

     Uso:
       if (NRT.flags.myFeatureBound) return;
       NRT.flags.myFeatureBound = true;
  ────────────────────────────────────────────────────────────────── */
  NRT.flags = NRT.flags || {
    visibilityBound:    false,  /* NPBus visibility → NP:visibility (np-r20-4.js) */
    gameLoaderBound:    false,  /* GameLoader MutationObserver (np-r20-4.js) */
    xpBufferInstalled:  false,  /* XP buffer hook (np-r20-2.js — now superseded by R20.4) */
    progressionReady:   false,  /* NP:progression-ready fired */
    modulesReady:       false,  /* NP:modules-ready fired */
    runtimeReady:       false   /* NP:runtime-ready fired */
  };

  /* Sincroniza flags com eventos já disparados (se R20.5 carrega tarde) */
  document.addEventListener('NP:progression-ready', function () {
    NRT.flags.progressionReady = true;
  }, { once: true });

  document.addEventListener('NP:modules-ready', function () {
    NRT.flags.modulesReady = true;
  }, { once: true });

  document.addEventListener('NP:runtime-ready', function () {
    NRT.flags.runtimeReady = true;
  }, { once: true });


  /* ──────────────────────────────────────────────────────────────
     3. XP FLUSH HARDENING
     Augmenta NRT.queueXp com:
     - _isFlushing guard: previne double-flush concorrente
     - _flushNow: método público para flush explícito
     - Proteção contra queue runaway (soft cap já em R20.4)

     NP:progression-ready já usa { once: true } em np-r20-4.js —
     não pode disparar duas vezes. O _isFlushing guard protege
     contra chamadas manuais e futuros caminhos de retry.
  ────────────────────────────────────────────────────────────────── */
  var _isFlushing = false;

  NRT._flushNow = function () {
    if (_isFlushing) {
      NRT.debug.warnOnce('xp-flush-concurrent', 'XP flush chamado durante flush ativo — ignorado');
      return 0;
    }
    if (!NRT._xpReady) return 0;
    if (!NRT._xpQueue.length) return 0;
    if (!window.ZapProgressionSystem || !window.ZapProgressionSystem._ready) return 0;

    _isFlushing = true;
    var flushed = 0;
    try {
      var queue = NRT._xpQueue.splice(0);
      flushed = queue.length;
      queue.forEach(function (ev) {
        window.ZapProgressionSystem.addXP(ev.amt, ev.reason);
      });
      if (window.NP_DEBUG && flushed) {
        console.info('[NP RUNTIME R20.5] XP explicit flush:', flushed, 'events');
      }
    } finally {
      _isFlushing = false;
    }
    return flushed;
  };

  /* Upgrade queueXp com flush-on-call quando já ready */
  var _origQueueXp = NRT.queueXp.bind(NRT);
  NRT.queueXp = function (amt, reason) {
    _origQueueXp.call(NRT, amt, reason);
    /* Se já ready mas queue tem pendências, flush imediato */
    if (NRT._xpReady && NRT._xpQueue.length && !_isFlushing) {
      NRT._flushNow();
    }
  };


  /* ──────────────────────────────────────────────────────────────
     4. OVERLAY GOVERNANCE
     Registry leve para overlays ativos.
     Detecta stacking inesperado e orphan overlays.

     INTEGRAÇÃO REAL: showLevelUp (neonplay-init.js:246) já tem
     guard de 2 s e checa #np84LevelUpPopup. NRT.overlays é
     infraestrutura para módulos futuros e para debugging.

     Uso:
       NRT.overlays.register('level-up');
       NRT.overlays.unregister('level-up');
  ────────────────────────────────────────────────────────────────── */
  NRT.overlays = {
    _active: [],

    register: function (name) {
      if (this._active.indexOf(name) !== -1) {
        NRT.debug.warnOnce('overlay-dup-' + name, 'Overlay duplicado detectado: ' + name);
        return false;
      }
      this._active.push(name);
      if (this._active.length > 5) {
        NRT.debug.warnOnce('overlay-stack-high', 'Stack de overlays atingiu ' + this._active.length + ': ' + this._active.join(', '));
      }
      return true;
    },

    unregister: function (name) {
      var idx = this._active.indexOf(name);
      if (idx !== -1) this._active.splice(idx, 1);
    },

    list: function () {
      return this._active.slice();
    },

    clear: function () {
      if (window.NP_DEBUG) {
        console.info('[NP RUNTIME R20.5] Overlay registry cleared:', this._active.join(', '));
      }
      this._active = [];
    }
  };


  /* ──────────────────────────────────────────────────────────────
     5. OWNERSHIP MAP — operacional
     Fonte única de verdade para ownership de sistemas principais.
     Usado por NRT.audit para detectar violações de ownership.

     IMPORTANTE: NÃO bloqueia runtime — somente observabilidade.
  ────────────────────────────────────────────────────────────────── */
  NRT.ownership = {
    xp:          'ZapProgressionSystem (via NRT.queueXp)',
    overlays:    'NRT.overlays (level-up: neonplay-init.js, cinematics: zapCinematics)',
    visibility:  'NPClock + NPBus (runtime:sleep / runtime:resume)',
    cinematics:  'zapCinematics (play, skip, isPlaying)',
    companion:   'ZapCompanion (widget, bubble, drag)',
    store:       'ZapStore (vault modal)',
    economy:     'ZapEconomy (coins, addCoins, spendCoins)',
    storage:     'NP_STORAGE + NP.storage (bundle)',
    lifecycle:   'NP.lifecycle (bundle v96 + NRT cleanup bridge)',
    events:      'NP.events (bundle — gameplay:start / gameplay:end / runtime:*)'
  };

  NRT.assertOwnership = function (system, caller) {
    var owner = NRT.ownership[system];
    if (!owner) {
      NRT.debug.warnOnce('ownership-unknown-' + system, 'Sistema sem ownership registrado: ' + system + ' (chamado por ' + caller + ')');
      return false;
    }
    if (owner.indexOf(caller) === -1) {
      NRT.debug.warnOnce('ownership-conflict-' + system + '-' + caller,
        'Ownership conflict: ' + caller + ' atuando em "' + system + '" (owner: ' + owner + ')');
    }
    return true;
  };


  /* ──────────────────────────────────────────────────────────────
     6. AUDIT HELPERS
     NRT.audit — snapshot dos recursos ativos do runtime patch.
     Não tenta auditar bundle.min.js.

     Uso em console:
       NeonPlayRuntime.audit.report()
  ────────────────────────────────────────────────────────────────── */
  NRT.audit = {
    activeIntervals: function () {
      return NRT.diagnostics.intervals.slice();
    },

    activeObservers: function () {
      return NRT.diagnostics.observers.map(function (o) {
        return { source: o.source, target: o.target ? (o.target.id || o.target.tagName || 'document') : 'n/a' };
      });
    },

    activeListeners: function () {
      return NRT.diagnostics.listeners.slice();
    },

    modules: function () {
      return Object.keys(NRT.modules).map(function (k) {
        return { name: k, ready: NRT.modules[k].ready, version: NRT.modules[k].version };
      });
    },

    flags: function () {
      return Object.assign({}, NRT.flags);
    },

    overlays: function () {
      return NRT.overlays.list();
    },

    xpQueue: function () {
      return { length: NRT._xpQueue.length, ready: NRT._xpReady, flushing: _isFlushing };
    },

    report: function () {
      var r = {
        intervals:  this.activeIntervals().length,
        observers:  this.activeObservers().length,
        listeners:  this.activeListeners().length,
        modules:    this.modules(),
        flags:      this.flags(),
        overlays:   this.overlays(),
        xpQueue:    this.xpQueue(),
        ownership:  NRT.ownership
      };
      if (window.NP_DEBUG) {
        console.group('[NP RUNTIME R20.5] Audit Report');
        console.table(r.modules);
        console.log('Flags:', r.flags);
        console.log('Overlays:', r.overlays);
        console.log('XP:', r.xpQueue);
        console.log('Diagnostics — intervals:', r.intervals, '| observers:', r.observers, '| listeners:', r.listeners);
        console.groupEnd();
      }
      return r;
    }
  };


  /* ──────────────────────────────────────────────────────────────
     7. CLEANUP BRIDGE
     Registra cleanup do NeonPlayRuntime no window.NP.lifecycle
     do bundle, de modo que NRT.diagnostics seja limpo em
     page:unload juntamente com os outros módulos.

     INTEGRAÇÃO REAL: bundle.min.js define NP.lifecycle com
     registerCleanup + runCleanup (chamado em page:unload).
     NRT.diagnostics não tem cleanup por si — este bridge fecha o gap.
  ────────────────────────────────────────────────────────────────── */
  (function _registerRuntimeCleanup() {
    if (window.NP && window.NP.lifecycle &&
        typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(function _nrtCleanup() {
        /* Limpar observers ativos registrados pelo runtime patch */
        NRT.diagnostics.observers.forEach(function (entry) {
          try { if (entry.observer) entry.observer.disconnect(); } catch (e) {}
        });
        NRT.diagnostics.observers = [];
        NRT.diagnostics.intervals = [];
        NRT.diagnostics.listeners = [];
        NRT._xpQueue = [];
        if (window.NP_DEBUG) {
          console.info('[NP RUNTIME R20.5] cleanup bridge executed');
        }
      });
    }
  })();


  /* ──────────────────────────────────────────────────────────────
     8. DOM QUERY CACHE leve
     Módulos do patch reutilizam referências ao invés de repetir
     querySelector. Cache por ID — invalidado em navegação.
     Somente para elementos que o patch usa diretamente.
  ────────────────────────────────────────────────────────────────── */
  NRT._dom = {};

  NRT.getElement = function (id) {
    if (!NRT._dom[id]) {
      NRT._dom[id] = document.getElementById(id);
    }
    return NRT._dom[id];
  };

  NRT.invalidateDomCache = function () {
    NRT._dom = {};
  };

  /* Invalida cache em BFCache restore */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) NRT.invalidateDomCache();
  });


  /* ──────────────────────────────────────────────────────────────
     9. RUNTIME LOG + SELF-AUDIT
  ────────────────────────────────────────────────────────────────── */
  if (window.NP_DEBUG) {
    console.info(
      '[NP R20.5] Governance patch loaded — ' +
      'safeInterval/safeTimeout/once, flags, overlays, ownership, ' +
      'audit, XP flush hardening (_isFlushing), cleanup bridge → NP.lifecycle'
    );
    /* Auto-audit após init completa */
    document.addEventListener('NP:runtime-ready', function () {
      setTimeout(function () { NRT.audit.report(); }, 500);
    }, { once: true });
  }

})();
