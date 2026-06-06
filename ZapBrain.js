;(function (window) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R10 — ZapBrain.js
     Cérebro cognitivo central do ecossistema Zap.
     ─────────────────────────────────────────────────────────────
     REGRAS ABSOLUTAS:
       ✗ Nunca acessa DOM / canvas / querySelector
       ✗ Nunca chama Companion, Renderer ou Audio diretamente
       ✗ Nunca usa setInterval ou polling contínuo
       ✗ Nunca modifica state de outros módulos
       ✓ Apenas interpreta → decide → emite via EventBus
     ─────────────────────────────────────────────────────────────
     Depende de (carregar antes):
       ZapEventContract.js
       ZapEventBus.js
     Leitura leve opcional (sem acoplamento duro):
       ZapSentience, ZapLoreEngine, ZapWorldEngine
     ─────────────────────────────────────────────────────────────
     Persistência: zap_brain_v1
     Versão: R10.0
  ═══════════════════════════════════════════════════════════════ */

  if (window.ZapBrain) return;

  var STORAGE_KEY = 'zap_brain_v1';

  var _DEFAULT = {
    currentMood:           'curious',
    pad: { pleasure: 0.1, arousal: 0.0, dominance: 0.2 },
    lastObsessionComment:  0,
    lastAbsenceComment:    0,
    lastFailureComment:    0,
    lastLevelComment:      0,
    lastLoreTs:            0,
    lastReturnComment:     0,
    consecutiveFailures:   0,
    sessionStartTs:        0
  };

  var PHRASES = {
    game: {
      acao:       ['Vai com tudo! 💥', 'Essa arena é sua! ⚔️', 'Mantém o combo! 🔥'],
      corrida:    ['Acelera! 🏎️', 'Primeiro lugar! 🏁', 'Ultrapassagem épica! 💨'],
      puzzle:     ['Pensa, pensa... 🧩', 'Quase lá! 💡', 'Solução na vista! ✨'],
      arcade:     ['Bate o recorde! 🕹️', 'Mais uma rodada! 🎯', 'Você tá voando! 🚀'],
      esporte:    ['Que gol! ⚽', 'Campeão! 🏆', 'Partida épica! 🎽'],
      aventura:   ['Explore tudo! 🗺️', 'Perigo à frente... 🌿', 'Herói em ação! 🗡️'],
      tiro:       ['Mira perfeita! 🎯', 'Sem baixar a guarda! 💣', 'Destruindo tudo! 💥'],
      estrategia: ['Estratégia definida! ♟️', 'Cada movimento conta... 🧠', 'Domínio total! 🏰'],
      default:    ['Você é fera! 🔥', 'Mantém o ritmo! ⚡', 'Jogo incrível! 🎮', 'Arrasando! 💜']
    },
    obsession: [
      'Ainda nesse simulador de vetores primitivos?',
      'Nota: você abriu isso {n} vezes. Registro feito.',
      'Esse padrão repetitivo é... curioso.',
      'Não estou julgando. Mas estou calculando.',
      'Você sabe que existem outros jogos, certo?'
    ],
    failure: [
      'Interessante. A mesma sequência de erros.',
      'Dados de falha: adquiridos. Novamente.',
      'A definição de insanidade é... não, deixa pra lá.',
      'Próxima tentativa. Com dados adicionais de derrota.',
      'Você está aprendendo. De forma não convencional.'
    ],
    absence: [
      'O vazio temporal era... irritantemente silencioso.',
      'Você retornou. O runtime registrou a ausência.',
      'Os fragmentos de dados ficaram esperando.',
      '48 ciclos. Suficientes para notar a falta.',
      'Bem-vindo de volta ao campo de mineração.'
    ],
    levelUp: [
      'Progressão detectada. Nível elevado.',
      'Os dados indicam evolução. Registrado.',
      'Nova tier desbloqueada. O runtime aprova.',
      'Avanço confirmado. Continue operando.',
      'Calibração completa. Você subiu de nível.'
    ],
    deepGrid: [
      'Você ainda está aqui. O grid também.',
      'Hora estranha para minerar. Gosto disso.',
      'Os sistemas dormem. Nós dois não.',
      'O relógio marcar isso é... irrelevante.',
      'Dados mais nítidos nesse horário. Ou parecem.',
      'Baixo ruído. Alta percepção. Cuidado.',
      'Esta sessão não vai constar no relatório diurno.'
    ],
    coinsGained: [
      'Recursos absorvidos.',
      'Combustível para os próximos ciclos.',
      'Economia local atualizada.',
      '+{n} unidades. Eficiente.'
    ]
  };

  /* ── Persistência ──────────────────────────────────────────── */
  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var d   = JSON.parse(JSON.stringify(_DEFAULT));
      if (!raw) return d;
      var p = JSON.parse(raw);
      d.currentMood          = p.currentMood          || d.currentMood;
      d.pad                  = p.pad                  || d.pad;
      d.lastObsessionComment = p.lastObsessionComment || 0;
      d.lastAbsenceComment   = p.lastAbsenceComment   || 0;
      d.lastFailureComment   = p.lastFailureComment   || 0;
      d.lastLevelComment     = p.lastLevelComment     || 0;
      d.lastLoreTs           = p.lastLoreTs           || 0;
      d.lastReturnComment    = p.lastReturnComment    || 0;
      d.consecutiveFailures  = p.consecutiveFailures  || 0;
      d.sessionStartTs       = p.sessionStartTs       || 0;
      return d;
    } catch (e) { return JSON.parse(JSON.stringify(_DEFAULT)); }
  }

  function _save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ── PAD ───────────────────────────────────────────────────── */
  function _clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function _shiftPAD(s, dp, da, dd) {
    s.pad.pleasure  = _clamp(s.pad.pleasure  + (dp || 0), -1, 1);
    s.pad.arousal   = _clamp(s.pad.arousal   + (da || 0), -1, 1);
    s.pad.dominance = _clamp(s.pad.dominance + (dd || 0), -1, 1);
  }

  function _deriveMood(pad, extra) {
    var p = pad.pleasure, a = pad.arousal;
    if (extra && extra.obsession) return 'obsessed';
    if (p > 0.4 && a > 0.3)      return 'excited';
    if (p > 0.2)                  return 'curious';
    if (p < -0.3 && a < -0.1)    return 'sad';
    if (p < -0.1 && a > 0.3)     return 'tired';
    return 'curious';
  }

  /* ── Phrase helpers ─────────────────────────────────────────── */
  function _pick(pool, subs) {
    var text = pool[Math.floor(Math.random() * pool.length)];
    if (subs) {
      Object.keys(subs).forEach(function (k) {
        text = text.replace('{' + k + '}', subs[k]);
      });
    }
    return text;
  }

  function _cooldownOk(ts, ms) { return Date.now() - ts >= ms; }

  /* ── Publish ─────────────────────────────────────────────────
     Brain NUNCA chama View diretamente. Somente EventBus.
  ──────────────────────────────────────────────────────────── */
  function _speak(text, mood, priority) {
    if (!window.ZapEventBus || !window.ZAP_EVENTS) return;
    window.ZapEventBus.emit(window.ZAP_EVENTS.BRAIN_SPEECH, {
      text:     text,
      mood:     mood     || 'curious',
      duration: 5000,
      priority: priority || 1
    });
  }

  function _publishMood(mood, pad, reason) {
    if (!window.ZapEventBus || !window.ZAP_EVENTS) return;
    window.ZapEventBus.emit(window.ZAP_EVENTS.BRAIN_MOOD_CHANGED, {
      mood: mood, pad: pad, reason: reason || 'synthesized'
    });
  }

  function _triggerLore(fragmentId, context) {
    if (!window.ZapEventBus || !window.ZAP_EVENTS) return;
    window.ZapEventBus.emit(window.ZAP_EVENTS.BRAIN_LORE_TRIGGER, {
      fragmentId: fragmentId || 'organic',
      context:    context   || 'brain'
    });
  }

  /* ── Synthesis ─────────────────────────────────────────────── */
  function _synthesize(state, reason) {
    var sentience = window.ZapSentience ? window.ZapSentience.getState() : null;
    var worldKey  = window.ZapWorldEngine ? window.ZapWorldEngine.currentTheme() : null;

    var extra = { obsession: sentience && sentience.obsessionCount >= 3 };

    if (sentience) {
      state.pad.pleasure  = state.pad.pleasure  * 0.7 + sentience.pleasure  * 0.3;
      state.pad.arousal   = state.pad.arousal   * 0.7 + sentience.arousal   * 0.3;
      state.pad.dominance = state.pad.dominance * 0.7 + sentience.dominance * 0.3;
    }

    var newMood = _deriveMood(state.pad, extra);
    if (newMood !== state.currentMood) {
      state.currentMood = newMood;
      _publishMood(newMood, { pleasure: state.pad.pleasure, arousal: state.pad.arousal, dominance: state.pad.dominance }, reason);
    }

    var hour = new Date().getHours();
    var isDeepGrid = worldKey === 'deep_grid' || (hour >= 0 && hour < 5);
    if (isDeepGrid && reason === 'session_start' && _cooldownOk(state.lastLoreTs, 20 * 60 * 1000)) {
      state.lastLoreTs = Date.now();
      _speak(_pick(PHRASES.deepGrid), 'curious', 2);
    }

    _save(state);
  }

  /* ── Cognitive Rules ─────────────────────────────────────────── */
  function _checkObsession(state) {
    var s = window.ZapSentience ? window.ZapSentience.getState() : null;
    if (!s || s.obsessionCount < 3) return;
    if (!_cooldownOk(state.lastObsessionComment, 24 * 60 * 60 * 1000)) return;
    state.lastObsessionComment = Date.now();
    _shiftPAD(state, -0.05, 0.1, 0.1);
    _speak(_pick(PHRASES.obsession, { n: s.obsessionCount }), 'obsessed', 2);
  }

  function _checkFailure(state) {
    if (state.consecutiveFailures < 2) return;
    if (!_cooldownOk(state.lastFailureComment, 5 * 60 * 1000)) return;
    state.lastFailureComment = Date.now();
    _shiftPAD(state, -0.1, 0.15, -0.1);
    _speak(_pick(PHRASES.failure), 'tired', 2);
  }

  function _checkAbsence(state) {
    var s = window.ZapSentience ? window.ZapSentience.getState() : null;
    var lastTs = s ? s.lastSessionTs : 0;
    if (!lastTs) return;
    if (Date.now() - lastTs < 48 * 60 * 60 * 1000) return;
    if (!_cooldownOk(state.lastReturnComment, 48 * 60 * 60 * 1000)) return;
    state.lastReturnComment = Date.now();
    _shiftPAD(state, 0.1, 0.05, 0.05);
    _speak(_pick(PHRASES.absence), 'curious', 3);
  }

  function _onLevelUp(data, state) {
    _shiftPAD(state, 0.3, 0.4, 0.3);
    _synthesize(state, 'level_up');
    if (!_cooldownOk(state.lastLevelComment, 60 * 1000)) return;
    state.lastLevelComment = Date.now();
    _speak(_pick(PHRASES.levelUp), 'excited', 3);
  }

  function _maybeTriggerLore(state) {
    if (!_cooldownOk(state.lastLoreTs, 15 * 60 * 1000)) return;
    var lore = window.ZapLore;
    if (!lore) return;
    var loreState = lore.getState();
    if (!loreState || !loreState.unlocked || loreState.unlocked.length === 0) return;
    state.lastLoreTs = Date.now();
    var pool = loreState.unlocked;
    _triggerLore(pool[Math.floor(Math.random() * pool.length)], 'organic_brain');
  }

  /* ── Event Handlers ─────────────────────────────────────────── */
  var _handlers = {};

  function _on(type, fn) {
    _handlers[type] = fn;
    if (window.ZapEventBus) window.ZapEventBus.on(type, fn);
  }

  function _initListeners() {
    var E = window.ZAP_EVENTS;
    if (!E) return;

    _on(E.ECONOMY_COINS_CHANGED, function (data) {
      if (data.delta <= 0) return;
      var state = _load();
      _shiftPAD(state, 0.05, 0.05, 0);
      if (data.delta >= 50 && _cooldownOk(state.lastLoreTs, 5 * 60 * 1000)) {
        state.lastLoreTs = Date.now();
        _speak(_pick(PHRASES.coinsGained, { n: data.delta }), 'curious', 1);
      }
      _synthesize(state, 'coins');
    });

    _on(E.CORE_LEVEL_UP, function (data) {
      var state = _load();
      _onLevelUp(data, state);
    });

    _on(E.CORE_XP_CHANGED, function () {
      var state = _load();
      _shiftPAD(state, 0.02, 0.03, 0.02);
      _synthesize(state, 'xp');
    });

    _on(E.ACHIEVEMENT_UNLOCK, function (data) {
      var state = _load();
      _shiftPAD(state, 0.2, 0.2, 0.15);
      _speak('Conquista registrada: ' + (data.title || ''), 'excited', 3);
      _synthesize(state, 'achievement');
    });

    _on(E.COMPANION_DROP, function () {
      var state = _load();
      _shiftPAD(state, 0.03, 0.05, 0);
      _synthesize(state, 'drop');
    });

    _on(E.QUEST_PROGRESS, function (data) {
      var state = _load();
      if (data.isCompleted) {
        _shiftPAD(state, 0.15, 0.1, 0.1);
        state.consecutiveFailures = 0;
      } else {
        state.consecutiveFailures = (state.consecutiveFailures || 0) + 1;
        _checkFailure(state);
        _shiftPAD(state, -0.05, 0.05, -0.05);
      }
      _synthesize(state, 'quest');
    });

    _on(E.BRAIN_LORE_TRIGGER, function (data) {
      /* Companion Controller / LoreEngine escuta e renderiza */
      if (window.ZapLore && typeof window.ZapLore.showLore === 'function') {
        window.ZapLore.showLore(data.fragmentId);
      }
    });
  }

  /* ── Session Start ──────────────────────────────────────────── */
  function _onSessionStart() {
    var state = _load();
    state.sessionStartTs      = Date.now();
    state.consecutiveFailures = 0;
    _checkAbsence(state);
    _checkObsession(state);
    _synthesize(state, 'session_start');
    _maybeTriggerLore(state);
  }

  /* ── Public phraser (View pode consultar pool) ─────────────── */
  function _getGamePhrase(category) {
    var pool = PHRASES.game[category] || PHRASES.game['default'];
    return _pick(pool);
  }

  /* ── Destroy ───────────────────────────────────────────────── */
  var _cleanups = [];

  function _destroy() {
    if (window.ZapEventBus) {
      Object.keys(_handlers).forEach(function (type) {
        window.ZapEventBus.off(type, _handlers[type]);
      });
    }
    _handlers = {};
    for (var i = 0; i < _cleanups.length; i++) {
      try { _cleanups[i](); } catch (e) {}
    }
    _cleanups = [];
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function _init() {
    if (!window.ZAP_EVENTS || !window.ZapEventBus) {
      var t = setTimeout(function () { _init(); }, 50);
      _cleanups.push(function () { clearTimeout(t); });
      return;
    }

    _initListeners();

    if (window.NP && window.NP.events) {
      window.NP.events.on('gameplay:start', _onSessionStart);
      _cleanups.push(function () {
        if (window.NP && window.NP.events && window.NP.events.off)
          window.NP.events.off('gameplay:start', _onSessionStart);
      });
    }

    var _onLifecycle = function () { _destroy(); };
    window.ZapEventBus.on(window.ZAP_EVENTS.LIFECYCLE_DESTROY, _onLifecycle);
    _cleanups.push(function () {
      window.ZapEventBus.off(window.ZAP_EVENTS.LIFECYCLE_DESTROY, _onLifecycle);
    });

    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(_destroy);
    }

    _onSessionStart();
  }

  window.ZapBrain = Object.freeze({
    getState:       _load,
    getGamePhrase:  _getGamePhrase,
    onSessionStart: _onSessionStart,
    destroy:        _destroy,
    version:        'r10.0'
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window));
