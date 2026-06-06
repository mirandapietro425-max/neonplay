/**
 * NeonPlay R21 — NPAchievements.js
 * Camada adicional de conquistas sobre ZapBadges (R7).
 *
 * REGRAS:
 * - NÃO substitui ZapBadges — bridge layer para backward compat
 * - Subscribe CORE:LEVEL_UP via ZapEventBus para marcos de nível
 * - Subscribe ACHIEVEMENT:UNLOCK (ZapBadges) para bridge
 * - Subscribe mission:complete para conquistas de missão
 * - localStorage: np_achievements_v1 (não conflita com zap_achievements_v1)
 * - Guard double-init
 */
;(function(window) {
  'use strict';

  if (window.__NP_ACHIEVEMENTS__) return;
  window.__NP_ACHIEVEMENTS__ = true;

  var STORAGE_KEY = 'np_achievements_v1';

  /* ── Conquistas R21 ──────────────────────────────────────────── */
  var ACHIEVEMENT_DEFS = [
    {
      id:        'r21_level_5',
      icon:      '🌟',
      title:     'Estrela Nascente',
      desc:      'Alcançou o Nível 5 no NeonPlay.',
      trigger:   'level',
      threshold: 5,
      xp:        300,
      coins:     50
    },
    {
      id:        'r21_level_10',
      icon:      '🏆',
      title:     'Cidadão Galáctico',
      desc:      'Alcançou o Nível 10.',
      trigger:   'level',
      threshold: 10,
      xp:        500,
      coins:     100
    },
    {
      id:        'r21_level_25',
      icon:      '👑',
      title:     'Lenda do Universo Neon',
      desc:      'Alcançou o Nível 25.',
      trigger:   'level',
      threshold: 25,
      xp:        1000,
      coins:     250
    },
    {
      id:        'r21_missions_5',
      icon:      '📋',
      title:     'Agente de Campo',
      desc:      'Completou 5 missões.',
      trigger:   'missions',
      threshold: 5,
      xp:        200,
      coins:     30
    },
    {
      id:        'r21_missions_20',
      icon:      '🎖️',
      title:     'Veterano do Grind',
      desc:      'Completou 20 missões.',
      trigger:   'missions',
      threshold: 20,
      xp:        500,
      coins:     100
    },
    {
      id:        'r21_games_10',
      icon:      '🕹️',
      title:     'Multiversal',
      desc:      'Jogou 10 sessões válidas.',
      trigger:   'sessions',
      threshold: 10,
      xp:        250,
      coins:     40
    }
  ];

  /* ── Persistência ─────────────────────────────────────────────── */
  var _DEFAULT_STATE = {
    unlocked:  {},   /* { [id]: { ts, rewardGiven } } */
    counters:  {
      missionsCompleted: 0,
      sessionsCompleted: 0
    }
  };

  function _load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return Object.assign({}, _DEFAULT_STATE, raw || {},
        { counters: Object.assign({}, _DEFAULT_STATE.counters, raw ? raw.counters : {}) }
      );
    } catch(e) {
      return JSON.parse(JSON.stringify(_DEFAULT_STATE));
    }
  }

  function _save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  var _state = _load();

  /* ── Check e unlock ──────────────────────────────────────────── */
  function _check(trigger, value) {
    ACHIEVEMENT_DEFS.forEach(function(def) {
      if (def.trigger !== trigger) return;
      if (_state.unlocked[def.id]) return; /* já desbloqueado */
      if (value >= def.threshold) {
        _unlock(def);
      }
    });
  }

  function _unlock(def) {
    if (_state.unlocked[def.id]) return;
    _state.unlocked[def.id] = { ts: Date.now(), rewardGiven: false };

    /* Recompensas */
    if (window.ZapEconomy && def.coins) {
      try { ZapEconomy.addCoins(def.coins, 'Conquista: ' + def.title); } catch(e) {}
    }
    _state.unlocked[def.id].rewardGiven = true;
    _save(_state);

    /* Emitir ACHIEVEMENT:UNLOCK via ZapEventBus (compatível com ZapBadges) */
    if (window.ZapEventBus && window.ZAP_EVENTS) {
      try {
        ZapEventBus.emit(ZAP_EVENTS.ACHIEVEMENT_UNLOCK, {
          badgeId:     def.id,
          title:       def.title,
          rewardCoins: def.coins || 0
        });
      } catch(e) {}
    }

    /* Toast visual */
    _showAchievementToast(def);

    if (window.NP_DEBUG) console.log('[NPAchievements] Unlocked:', def.id);
  }

  function _showAchievementToast(def) {
    /* Não mostrar durante gameplay sanctuary */
    var NRT = window.NRT || {};
    if (NRT.gameSession && NRT.gameSession.active) return;

    var container = document.getElementById('npAchievementToasts') || document.body;
    var toast = document.createElement('div');
    toast.className = 'np-achievement-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML =
      '<span class="np-at-icon">' + def.icon + '</span>' +
      '<div class="np-at-body">' +
        '<span class="np-at-label">🏅 Conquista Desbloqueada!</span>' +
        '<strong class="np-at-title">' + def.title + '</strong>' +
        '<span class="np-at-desc">' + def.desc + '</span>' +
      '</div>';
    toast.style.cssText = [
      'position:fixed',
      'top:80px',
      'right:16px',
      'background:linear-gradient(135deg,#1a0a2e 0%,#0d1b2a 100%)',
      'border:1px solid #a855f7',
      'border-radius:14px',
      'padding:12px 18px',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'color:#fff',
      'font-family:system-ui,sans-serif',
      'font-size:14px',
      'box-shadow:0 0 30px #a855f733',
      'z-index:9999',
      'max-width:280px',
      'animation:np-ach-in .4s cubic-bezier(.175,.885,.32,1.275)',
      'opacity:1'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.transition = 'opacity .5s, transform .5s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 500);
    }, 5000);
  }

  /* ── Handlers ─────────────────────────────────────────────────── */
  function _onLevelUp(data) {
    var level = (data && data.newLevel) || 0;
    if (level > 0) _check('level', level);
  }

  function _onMissionComplete() {
    _state.counters.missionsCompleted = (_state.counters.missionsCompleted || 0) + 1;
    _save(_state);
    _check('missions', _state.counters.missionsCompleted);
  }

  function _onGameplaySession(data) {
    if (!data || !data.isValid) return;
    _state.counters.sessionsCompleted = (_state.counters.sessionsCompleted || 0) + 1;
    _save(_state);
    _check('sessions', _state.counters.sessionsCompleted);
  }

  /* ── Bridge: ZapBadges → NPAchievements ─────────────────────── */
  /* Quando ZapBadges desbloqueia uma conquista legada,
     NPAchievements registra para consistência de histórico */
  function _onZapBadgeUnlock(data) {
    /* NOP: apenas log em debug — não duplicar reward */
    if (window.NP_DEBUG) console.log('[NPAchievements] Bridge: ZapBadges unlock:', data);
  }

  /* ── API pública ─────────────────────────────────────────────── */
  var NPAchievements = {
    getAll: function() {
      return ACHIEVEMENT_DEFS.map(function(def) {
        var u = _state.unlocked[def.id];
        return {
          id:        def.id,
          icon:      def.icon,
          title:     def.title,
          desc:      def.desc,
          unlocked:  !!u,
          unlockedAt: u ? u.ts : null
        };
      });
    },

    getUnlocked: function() {
      return this.getAll().filter(function(a) { return a.unlocked; });
    },

    init: function() {
      /* ZapEventBus: CORE:LEVEL_UP */
      if (window.ZapEventBus && window.ZAP_EVENTS) {
        ZapEventBus.on(ZAP_EVENTS.CORE_LEVEL_UP, _onLevelUp);
        /* Bridge para ZapBadges */
        ZapEventBus.on(ZAP_EVENTS.ACHIEVEMENT_UNLOCK, _onZapBadgeUnlock);
      }

      /* NPBus: LEVEL_UP */
      if (window.NPBus) {
        NPBus.on(NPBus.EV.LEVEL_UP, function(data) { _onLevelUp(data); });
        NPBus.on(NPBus.EV.MISSION_DONE, _onMissionComplete);
        NPBus.on(NPBus.EV.GAMEPLAY_SESSION, _onGameplaySession);
      }

      /* Check conquistas existentes na sessão atual (para jogadores que já progrediram) */
      setTimeout(function() {
        var ZPS = window.ZapProgressionSystem;
        if (ZPS && ZPS._ready) {
          var prog = ZPS.getProgress();
          if (prog && prog.level > 1) _check('level', prog.level);
        }
      }, 1500);

      /* Cleanup */
      if (window.NP && window.NP.lifecycle && NP.lifecycle.registerCleanup) {
        NP.lifecycle.registerCleanup(function() {
          if (window.ZapEventBus && window.ZAP_EVENTS) {
            ZapEventBus.off(ZAP_EVENTS.CORE_LEVEL_UP, _onLevelUp);
            ZapEventBus.off(ZAP_EVENTS.ACHIEVEMENT_UNLOCK, _onZapBadgeUnlock);
          }
        });
      }

      if (window.NP_DEBUG) console.log('[NPAchievements] init OK.');
    }
  };

  window.NPAchievements = NPAchievements;

})(window);
