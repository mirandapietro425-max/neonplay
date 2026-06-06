/**
 * NeonPlay R21 — NPMissions.js
 * Sistema de missões diárias estendido — camada adicional sobre ZapQuestEngine.
 *
 * REGRAS:
 * - NÃO substitui ZapQuestEngine (R20.x) — opera em paralelo como camada adicional
 * - NUNCA chama grantXP/addXP diretamente — emite mission:complete para outros consumirem
 * - Subscribe xp:gain para missões baseadas em XP acumulado
 * - Subscribe gameplay:session_complete para missões de tempo de jogo
 * - localStorage: np_missions_v1 (não conflita com zap_quests_v1)
 * - Reset diário à meia-noite (mesmo mecanismo do ZapQuestEngine)
 * - Guard double-init, sem setInterval sem _maxTries
 */
;(function(window) {
  'use strict';

  if (window.__NP_MISSIONS__) return;
  window.__NP_MISSIONS__ = true;

  var STORAGE_KEY = 'np_missions_v1';

  /* ── Pool de missões R21 ─────────────────────────────────────── */
  /* Complementares ao pool do ZapQuestEngine — sem overlap de IDs */
  var MISSION_POOL = [
    {
      id:     'r21_session_15',
      icon:   '⏱️',
      title:  'Imersão Neon',
      desc:   'Jogue por 15 minutos contínuos.',
      type:   'playtime',
      goal:   15 * 60 * 1000, /* ms */
      xp:     200,
      coins:  30
    },
    {
      id:     'r21_games_2',
      icon:   '🕹️',
      title:  'Explorador de Mundos',
      desc:   'Jogue 2 jogos diferentes hoje.',
      type:   'games_played',
      goal:   2,
      xp:     150,
      coins:  20
    },
    {
      id:     'r21_xp_300',
      icon:   '⚡',
      title:  'Coletor de Energia',
      desc:   'Acumule 300 XP hoje.',
      type:   'xp_gained',
      goal:   300,
      xp:     180,
      coins:  25
    },
    {
      id:     'r21_return',
      icon:   '🔁',
      title:  'Retorno Galáctico',
      desc:   'Visite o NeonPlay 2 dias seguidos.',
      type:   'streak',
      goal:   2,
      xp:     250,
      coins:  40
    },
    {
      id:     'r21_session_3',
      icon:   '🚀',
      title:  'Trilogia Espacial',
      desc:   'Complete 3 sessões de jogo hoje.',
      type:   'sessions_complete',
      goal:   3,
      xp:     220,
      coins:  35
    }
  ];

  /* ── Persistência ─────────────────────────────────────────────── */
  function _todayKey() {
    return new Date().toISOString().slice(0, 10); /* YYYY-MM-DD */
  }

  function _load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || raw.day !== _todayKey()) {
        return _fresh();
      }
      return raw;
    } catch(e) {
      return _fresh();
    }
  }

  function _fresh() {
    /* Selecionar 3 missões aleatórias do pool */
    var pool = MISSION_POOL.slice();
    var selected = [];
    while (selected.length < 3 && pool.length > 0) {
      var idx = Math.floor(Math.random() * pool.length);
      selected.push(pool.splice(idx, 1)[0]);
    }
    var state = {
      day:      _todayKey(),
      missions: {},
      progress: {}
    };
    selected.forEach(function(m) {
      state.missions[m.id] = m;
      state.progress[m.id] = { current: 0, completed: false };
    });
    return state;
  }

  function _save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  /* ── Estado ─────────────────────────────────────────────────── */
  var _state = _load();
  var _dailyXP  = 0; /* XP acumulado hoje */
  var _dailySessions = 0;
  var _gamesPlayedToday = new Set ? new Set() : {};

  /* ── Progress update ─────────────────────────────────────────── */
  function _incrementProgress(missionId, delta) {
    if (!_state.progress[missionId]) return;
    if (_state.progress[missionId].completed) return;

    var mission  = _state.missions[missionId];
    var progress = _state.progress[missionId];

    progress.current = Math.min(
      (progress.current || 0) + (delta || 0),
      mission.goal
    );

    /* Emitir progresso */
    if (window.NPBus) {
      try {
        NPBus.emit(NPBus.EV.MISSION_PROGRESS, {
          missionId: missionId,
          current:   progress.current,
          goal:      mission.goal,
          isComplete: progress.current >= mission.goal
        });
      } catch(e) {}
    }

    if (window.ZapEventBus && window.ZAP_EVENTS) {
      try {
        ZapEventBus.emit(ZAP_EVENTS.MISSION_PROGRESS, {
          missionId: missionId,
          current:   progress.current,
          goal:      mission.goal,
          isComplete: progress.current >= mission.goal
        });
      } catch(e) {}
    }

    /* Checar conclusão */
    if (progress.current >= mission.goal && !progress.completed) {
      progress.completed = true;
      _onMissionComplete(mission);
    }

    _save(_state);
  }

  function _onMissionComplete(mission) {
    /* Emitir mission:complete — outros módulos (NPAchievements) consomem */
    if (window.NPBus) {
      try {
        NPBus.emit(NPBus.EV.MISSION_DONE, {
          missionId: mission.id,
          title:     mission.title,
          xpReward:  mission.xp
        });
      } catch(e) {}
    }

    if (window.ZapEventBus && window.ZAP_EVENTS) {
      try {
        ZapEventBus.emit(ZAP_EVENTS.MISSION_COMPLETE, {
          missionId: mission.id,
          title:     mission.title,
          xpReward:  mission.xp
        });
      } catch(e) {}
    }

    /* Dar recompensa via ZapEconomy (coins) */
    if (window.ZapEconomy && mission.coins) {
      try {
        ZapEconomy.addCoins(mission.coins, 'Missão: ' + mission.title);
      } catch(e) {}
    }

    /* XP via NPBus emit — ZapProgressionSystem vai receber via bridge */
    /* REGRA: NPMissions NÃO chama addXP diretamente.
       Emite mission:complete — NPProfile e NPAchievements consomem.
       O XP de missão é concedido pelo ZapQuestEngine original quando detecta
       o evento, ou via listener externo. */
    _showMissionToast(mission);
  }

  /* ── Toast de missão ─────────────────────────────────────────── */
  function _showMissionToast(mission) {
    /* Não mostrar durante gameplay sanctuary */
    var NRT = window.NRT || {};
    if (NRT.gameSession && NRT.gameSession.active) return;

    var container = document.getElementById('npMissionToasts');
    if (!container) {
      container = document.createElement('div');
      container.id = 'npMissionToasts';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('role', 'status');
      container.style.cssText = [
        'position:fixed',
        'bottom:100px',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:9001',
        'pointer-events:none',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'gap:8px'
      ].join(';');
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'np-mission-toast';
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
      '<span class="np-mt-icon">' + mission.icon + '</span>' +
      '<span class="np-mt-text">' +
        '<strong>Missão Completa!</strong><br>' +
        mission.title + ' +' + mission.xp + ' XP' +
      '</span>';
    toast.style.cssText = [
      'background:linear-gradient(135deg,#1a0a2e,#0d1b2a)',
      'border:1px solid #00ffff44',
      'border-radius:12px',
      'padding:10px 18px',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'color:#fff',
      'font-family:system-ui,sans-serif',
      'font-size:14px',
      'box-shadow:0 0 20px #00ffff22',
      'animation:np-mission-in .3s ease',
      'opacity:1'
    ].join(';');
    container.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .4s';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 4000);
  }

  /* ── Handlers de eventos ─────────────────────────────────────── */
  function _onXPGain(data) {
    var gained = (data && data.gained) || 0;
    _dailyXP += gained;
    /* Missões de XP acumulado */
    Object.keys(_state.missions).forEach(function(id) {
      var m = _state.missions[id];
      if (m.type === 'xp_gained' && !_state.progress[id].completed) {
        _incrementProgress(id, gained);
      }
    });
  }

  function _onGameplaySession(data) {
    if (!data || !data.isValid) return;
    _dailySessions++;

    /* Missões de sessões completadas */
    Object.keys(_state.missions).forEach(function(id) {
      var m = _state.missions[id];
      if (m.type === 'sessions_complete' && !_state.progress[id].completed) {
        _incrementProgress(id, 1);
      }
    });

    /* Missões de jogos únicos */
    var gameId = (data && data.gameId) || 'unknown';
    var alreadyCounted = typeof Set !== 'undefined'
      ? _gamesPlayedToday.has(gameId)
      : !!_gamesPlayedToday[gameId];

    if (!alreadyCounted) {
      if (typeof Set !== 'undefined') _gamesPlayedToday.add(gameId);
      else _gamesPlayedToday[gameId] = true;

      Object.keys(_state.missions).forEach(function(id) {
        var m = _state.missions[id];
        if (m.type === 'games_played' && !_state.progress[id].completed) {
          _incrementProgress(id, 1);
        }
      });
    }

    /* Missões de tempo de jogo */
    var durationMs = (data && data.durationMs) || 0;
    Object.keys(_state.missions).forEach(function(id) {
      var m = _state.missions[id];
      if (m.type === 'playtime' && !_state.progress[id].completed) {
        _incrementProgress(id, durationMs);
      }
    });
  }

  /* ── API pública ─────────────────────────────────────────────── */
  var NPMissions = {
    /** Retorna missões do dia com progresso */
    getDailyMissions: function() {
      var result = [];
      Object.keys(_state.missions).forEach(function(id) {
        var m = _state.missions[id];
        var p = _state.progress[id] || { current: 0, completed: false };
        result.push({
          id:        id,
          icon:      m.icon,
          title:     m.title,
          desc:      m.desc,
          goal:      m.goal,
          current:   p.current,
          completed: p.completed,
          pct:       Math.min(100, Math.round((p.current / m.goal) * 100)),
          xp:        m.xp,
          coins:     m.coins
        });
      });
      return result;
    },

    /** Renderiza painel de missões num elemento existente */
    renderPanel: function(containerId) {
      var el = document.getElementById(containerId || 'npMissionsPanel');
      if (!el) return;
      /* Não renderizar durante gameplay */
      var NRT = window.NRT || {};
      if (NRT.gameSession && NRT.gameSession.active) return;

      var missions = this.getDailyMissions();
      var html = '<div class="np-missions-list" role="list">';
      missions.forEach(function(m) {
        html +=
          '<div class="np-mission-item ' + (m.completed ? 'np-mi--done' : '') + '" role="listitem">' +
            '<span class="np-mi-icon" aria-hidden="true">' + m.icon + '</span>' +
            '<div class="np-mi-body">' +
              '<strong class="np-mi-title">' + m.title + '</strong>' +
              '<span class="np-mi-desc">' + m.desc + '</span>' +
              '<div class="np-mi-bar" role="progressbar" aria-valuenow="' + m.pct + '" aria-valuemin="0" aria-valuemax="100">' +
                '<div class="np-mi-fill" style="width:' + m.pct + '%"></div>' +
              '</div>' +
              '<span class="np-mi-reward">+' + m.xp + ' XP  ⚡' + m.coins + '</span>' +
            '</div>' +
            (m.completed ? '<span class="np-mi-check" aria-label="Completa">✓</span>' : '') +
          '</div>';
      });
      html += '</div>';
      el.innerHTML = html;
    },

    init: function() {
      /* Subscribe NPBus */
      if (window.NPBus) {
        NPBus.on(NPBus.EV.XP_GAIN, _onXPGain);
        NPBus.on(NPBus.EV.GAMEPLAY_SESSION, _onGameplaySession);
      }

      /* Subscribe ZapEventBus */
      if (window.ZapEventBus && window.ZAP_EVENTS) {
        ZapEventBus.on(ZAP_EVENTS.GAMEPLAY_SESSION_COMPLETE, _onGameplaySession);
      }

      /* Cleanup */
      if (window.NP && window.NP.lifecycle && NP.lifecycle.registerCleanup) {
        NP.lifecycle.registerCleanup(function() {
          if (window.NPBus) {
            NPBus.off(NPBus.EV.XP_GAIN, _onXPGain);
            NPBus.off(NPBus.EV.GAMEPLAY_SESSION, _onGameplaySession);
          }
        });
      }

      if (window.NP_DEBUG) console.log('[NPMissions] init OK. Missions:', Object.keys(_state.missions));
    }
  };

  window.NPMissions = NPMissions;

})(window);
