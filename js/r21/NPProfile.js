/**
 * NeonPlay R21 — NPProfile.js
 * Snapshot de perfil do jogador: agrega dados de XP, coins, jogos, missões.
 *
 * REGRAS:
 * - Guard de double-init
 * - NUNCA chama grantXP/addXP — apenas lê via getProgress()
 * - Subscribe xp:gain (NPBus) e CORE:XP_CHANGED (ZapEventBus) — SOMENTE leitura
 * - localStorage: prefixo np_profile_ + _v1
 * - Cleanup via NP.lifecycle.registerCleanup
 * - Gameplay Sanctuary: sem ação visual durante gameSession.active
 * - Mobile-safe: sem DOM manipulation pesada
 */
;(function(window) {
  'use strict';

  if (window.__NP_PROFILE__) return;
  window.__NP_PROFILE__ = true;

  var STORAGE_KEY = 'np_profile_v1';

  /* ── Snapshot padrão ─────────────────────────────────────────── */
  var _DEFAULT = {
    level:          1,
    xp:             0,
    coins:          0,
    gamesPlayed:    0,
    missionsCompleted: 0,
    achievementsUnlocked: 0,
    totalPlaytimeMs: 0,
    lastUpdated:    0,
    displayName:    'Explorador Neon',
    joinDate:       0
  };

  /* ── Persistência ─────────────────────────────────────────────── */
  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, _DEFAULT, { joinDate: Date.now() });
      return Object.assign({}, _DEFAULT, JSON.parse(raw));
    } catch(e) {
      return Object.assign({}, _DEFAULT, { joinDate: Date.now() });
    }
  }

  function _save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  /* ── Estado ──────────────────────────────────────────────────── */
  var _profile = _load();
  var _unsubNPBus = null;
  var _unsubZapBus = null;

  /* ── Sincronizar com ZapProgressionSystem ────────────────────── */
  function _syncFromProgression() {
    var ZPS = window.ZapProgressionSystem;
    if (!ZPS || !ZPS._ready) return;
    try {
      var prog = ZPS.getProgress();
      _profile.level = prog.level || 1;
      _profile.xp    = prog.xpCur || 0;
    } catch(e) {}
  }

  function _syncFromEconomy() {
    if (window.ZapEconomy) {
      try {
        _profile.coins = ZapEconomy.getCoins();
      } catch(e) {}
    }
  }

  /* ── Update e emissão ─────────────────────────────────────────── */
  function _updateSnapshot(extra) {
    _syncFromProgression();
    _syncFromEconomy();
    if (extra) Object.assign(_profile, extra);
    _profile.lastUpdated = Date.now();
    _save(_profile);

    /* Emitir snapshot via ZapEventBus */
    if (window.ZapEventBus && window.ZAP_EVENTS) {
      try {
        ZapEventBus.emit(ZAP_EVENTS.PROFILE_SNAPSHOT_UPDATE, {
          level:       _profile.level,
          xp:          _profile.xp,
          coins:       _profile.coins,
          gamesPlayed: _profile.gamesPlayed
        });
      } catch(e) {}
    }

    /* Emitir via NPBus */
    if (window.NPBus) {
      try {
        NPBus.emit(NPBus.EV.PROFILE_UPDATE, _profile);
      } catch(e) {}
    }
  }

  /* ── Subscriptions (somente leitura de outros eventos) ────────── */
  function _subscribe() {
    /* NPBus: xp:gain → atualizar snapshot */
    if (window.NPBus) {
      _unsubNPBus = NPBus.on(NPBus.EV.XP_GAIN, function(data) {
        /* Não processar durante gameplay sanctuary */
        var NRT = window.NRT || (window.NP && window.NP.runtime) || {};
        if (NRT.gameSession && NRT.gameSession.active) return;
        _updateSnapshot();
      });
    }

    /* ZapEventBus: CORE:XP_CHANGED */
    if (window.ZapEventBus && window.ZAP_EVENTS) {
      _unsubZapBus = function(data) {
        var NRT = window.NRT || {};
        if (NRT.gameSession && NRT.gameSession.active) return;
        _updateSnapshot();
      };
      ZapEventBus.on(ZAP_EVENTS.CORE_XP_CHANGED, _unsubZapBus);
    }

    /* ZapEconomy.onChange → coins */
    if (window.ZapEconomy) {
      ZapEconomy.onChange(function(ev) {
        _profile.coins = ev.total || 0;
        _save(_profile);
      });
    }

    /* gameplay:session_complete → gamesPlayed++ */
    if (window.NPBus) {
      NPBus.on(NPBus.EV.GAMEPLAY_SESSION, function(data) {
        if (data && data.isValid) {
          _profile.gamesPlayed = (_profile.gamesPlayed || 0) + 1;
          _profile.totalPlaytimeMs = (_profile.totalPlaytimeMs || 0) + (data.durationMs || 0);
          _updateSnapshot();
        }
      });
    }

    /* mission:complete → missionsCompleted++ */
    if (window.NPBus) {
      NPBus.on(NPBus.EV.MISSION_DONE, function() {
        _profile.missionsCompleted = (_profile.missionsCompleted || 0) + 1;
        _save(_profile);
      });
    }

    /* ACHIEVEMENT:UNLOCK → achievementsUnlocked++ */
    if (window.ZapEventBus && window.ZAP_EVENTS) {
      ZapEventBus.on(ZAP_EVENTS.ACHIEVEMENT_UNLOCK, function() {
        _profile.achievementsUnlocked = (_profile.achievementsUnlocked || 0) + 1;
        _save(_profile);
      });
    }
  }

  /* ── API pública ──────────────────────────────────────────────── */
  var NPProfile = {
    /** Retorna snapshot atual (leitura rápida — do cache) */
    getSnapshot: function() {
      return Object.assign({}, _profile);
    },

    /** Força sincronização e retorna snapshot atualizado */
    refresh: function() {
      _updateSnapshot();
      return this.getSnapshot();
    },

    /** Define display name */
    setDisplayName: function(name) {
      if (typeof name !== 'string' || !name.trim()) return;
      _profile.displayName = name.trim().substring(0, 32);
      _save(_profile);
    },

    /** Renderiza HUD de perfil se elemento existir */
    renderProfileHUD: function() {
      var el = document.getElementById('npProfileHUD');
      if (!el) return;
      /* Não renderizar durante gameplay sanctuary */
      var NRT = window.NRT || {};
      if (NRT.gameSession && NRT.gameSession.active) return;

      var prog = window.ZapProgressionSystem && window.ZapProgressionSystem._ready
        ? window.ZapProgressionSystem.getProgress()
        : { level: _profile.level, xpCur: _profile.xp, xpNext: 100, pct: 0 };

      el.innerHTML =
        '<div class="np-profile-hud" aria-label="Perfil do jogador">' +
          '<span class="np-ph-name">' + _escapeHtml(_profile.displayName) + '</span>' +
          '<span class="np-ph-level">Nv. ' + (prog.level || 1) + '</span>' +
          '<div class="np-ph-bar" role="progressbar" aria-valuenow="' + (prog.pct || 0) + '" aria-valuemin="0" aria-valuemax="100">' +
            '<div class="np-ph-fill" style="width:' + (prog.pct || 0) + '%"></div>' +
          '</div>' +
          '<span class="np-ph-coins">⚡ ' + _profile.coins + ' Z-Coins</span>' +
        '</div>';
    },

    init: function() {
      _syncFromProgression();
      _syncFromEconomy();
      _subscribe();
      _save(_profile);
      /* Snapshot inicial */
      setTimeout(function() { _updateSnapshot(); }, 800);
      if (window.NP && window.NP.lifecycle && NP.lifecycle.registerCleanup) {
        NP.lifecycle.registerCleanup(function() {
          if (_unsubNPBus) _unsubNPBus();
          if (_unsubZapBus && window.ZapEventBus) {
            ZapEventBus.off(ZAP_EVENTS.CORE_XP_CHANGED, _unsubZapBus);
          }
        });
      }
      if (window.NP_DEBUG) console.log('[NPProfile] init OK. Snapshot:', _profile);
    }
  };

  function _escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  window.NPProfile = NPProfile;

})(window);
