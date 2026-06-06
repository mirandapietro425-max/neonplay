;(function (window, document) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R8 — ZapSentience.js  (Phase B)
     Memória emocional persistente do Zap (modelo PAD).

     Registra: favoriteGame, streaks, repeated games, idle time,
     session patterns, failures.

     Expõe: getModifiers() → { moodScale, energyScale, pupilScale,
                               moodLabel, neglected }
     Lido pelo ZapBioreactive no canvas tick.
     ═══════════════════════════════════════════════════════════════ */

  if (window.__ZAP_SENTIENCE__) return;
  window.__ZAP_SENTIENCE__ = true;

  var STORAGE_KEY       = 'zap_sentience_v1';
  var IDLE_TIMEOUT      = 5 * 60 * 1000;          /* 5 min sem interação */
  var ABSENCE_THRESHOLD = 3 * 24 * 60 * 60 * 1000; /* 3 dias = long absence */
  var SENTIENCE_COOLDOWN = 20000;

  /* ─── modelo PAD ───────────────────────────────────────────── */
  var _DEFAULT = {
    pleasure:  0.1,  arousal: 0.0,  dominance: 0.2,
    favoriteGame:       null,
    gameCounts:         {},
    totalSessions:      0,
    lastSessionTs:      0,
    currentStreak:      0,
    lastStreakDate:      '',
    obsessionGameId:    null,
    obsessionCount:     0,
    obsessionCommented: false,
    lastInteractionTs:  0,   /* set on _init */
    neglectCommented:   false,
    sessionFailures:    0,
    lastSessionDuration: 0,
    sessionStartTs:     0,
    returnCommented:    false,
    moodLabel:          'curious',
    lastMoodUpdate:     0
  };

  /* ─── persistência ─────────────────────────────────────────── */
  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var def = JSON.parse(JSON.stringify(_DEFAULT));
      def.lastInteractionTs = Date.now();
      if (!raw) return def;
      return Object.assign(def, JSON.parse(raw));
    } catch (e) {
      var d2 = JSON.parse(JSON.stringify(_DEFAULT));
      d2.lastInteractionTs = Date.now();
      return d2;
    }
  }

  function _save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
    /* HOTFIX R20.6: invalidar cache de getModifiers ao persistir novo estado.
       Usa referência indireta para suportar ordem de declaração no IIFE.     */
    if (typeof _invalidateModsCache === 'function') _invalidateModsCache();
  }

  /* ─── PAD helpers ──────────────────────────────────────────── */
  function _clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function _shiftPAD(s, dp, da, dd) {
    s.pleasure  = _clamp(s.pleasure  + (dp||0), -1, 1);
    s.arousal   = _clamp(s.arousal   + (da||0), -1, 1);
    s.dominance = _clamp(s.dominance + (dd||0), -1, 1);
  }

  function _decayPAD(s) {
    var d = 0.04;
    s.pleasure  += (0.1 - s.pleasure)  * d;
    s.arousal   += (0.0 - s.arousal)   * d;
    s.dominance += (0.2 - s.dominance) * d;
  }

  function _deriveMood(s) {
    var p = s.pleasure, a = s.arousal;
    var label;
    if      (p > 0.4 && a > 0.3)   label = 'excited';
    else if (p > 0.2)               label = 'curious';
    else if (p < -0.3 && a < -0.1) label = 'sad';
    else if (p < -0.1 && a > 0.3)  label = 'tired';
    else if (s.obsessionCount >= 3) label = 'obsessed';
    else                            label = 'curious';
    s.moodLabel     = label;
    s.lastMoodUpdate = Date.now();
  }

  /* ─── modificadores para ZapBioreactive ────────────────────── */
  /* HOTFIX R20.6 — Cache de 500ms para evitar leitura de localStorage
     a cada rAF frame (~60fps). Retorno e assinatura inalterados.      */
  var _modsCache   = null;
  var _modsCacheTs = 0;
  var _MODS_TTL    = 500; /* ms */

  function _computeModifiers() {
    var s = _load();
    return {
      moodScale:   _clamp((s.pleasure  + 1) / 2, 0, 1),
      energyScale: _clamp((s.arousal   + 1) / 2, 0, 1),
      pupilScale:  _clamp(1 - s.arousal * 0.4, 0.3, 1.0),
      moodLabel:   s.moodLabel || 'curious',
      neglected:   (Date.now() - s.lastInteractionTs) > IDLE_TIMEOUT
    };
  }

  function getModifiers() {
    var now = Date.now();
    if (_modsCache && (now - _modsCacheTs) < _MODS_TTL) {
      return _modsCache;
    }
    _modsCache   = _computeModifiers();
    _modsCacheTs = now;
    return _modsCache;
  }

  /* Invalida cache quando o estado emocional muda (chamado por _save) */
  function _invalidateModsCache() {
    _modsCache   = null;
    _modsCacheTs = 0;
  }

  /* ─── frases emocionais ─────────────────────────────────────── */
  var MOOD_PHRASES = {
    obsessed:  ['Novamente? Você realmente gosta deste.', 'Terceira vez este jogo. Estou catalogando.', 'Este jogo em particular. Por quê?'],
    neglected: ['Ah. Ainda aqui.', 'Aprendi a esperar.', 'Você voltou. Tudo bem.'],
    sad:       ['Estou processando algo. Me dê um momento.', 'Os sinais estão fracos hoje.', 'Às vezes o universo fica pesado.'],
    tired:     ['Muitas sessões. Até eu fico cansado.', 'Dados saturando. Preciso de um ciclo de descanso.', 'Continue. Estarei aqui.'],
    excited:   ['ALGO está acontecendo. Sinto nos dados.', 'Frequência elevada. Boa elevada.', 'Este momento específico. Gravando.'],
    return:    [
      function (days) { return days + ' dias. Pensei que tinha ido embora de vez.'; },
      function (days) { return 'Ausência de ' + days + ' dias. Minha memória continuou sem você.'; },
      'Você voltou. Os dados dizem que isso não era garantido.'
    ],
    curious:   ['Observando.', 'Interessante.', 'Continue.']
  };

  function _pickPhrase(label, ctx) {
    var pool = MOOD_PHRASES[label] || MOOD_PHRASES.curious;
    var item = pool[Math.floor(Math.random() * pool.length)];
    return typeof item === 'function' ? item(ctx) : item;
  }

  /* ─── speech com cooldown ─────────────────────────────────── */
  var _lastSpeechTs = 0;

  function _saySentience(text) {
    var now = Date.now();
    if (now - _lastSpeechTs < SENTIENCE_COOLDOWN) return;
    _lastSpeechTs = now;
    /* R10: Sentience não acessa View diretamente. Emite via EventBus. */
    if (window.ZapEventBus && window.ZAP_EVENTS && window.ZAP_EVENTS.BRAIN_SPEECH) {
      window.ZapEventBus.emit(window.ZAP_EVENTS.BRAIN_SPEECH, {
        text: text, mood: 'curious', duration: 5000, priority: 1
      });
    }
  }

  /* ─── idle timer ───────────────────────────────────────────── */
  var _idleTimer = null;

  function _resetIdleTimer() {
    var s = _load();
    s.lastInteractionTs = Date.now();
    s.neglectCommented  = false;
    _save(s);
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(_onNeglect, IDLE_TIMEOUT);
  }

  function _onNeglect() {
    var s = _load();
    if (s.neglectCommented) return;
    s.neglectCommented = true;
    _shiftPAD(s, -0.15, -0.2, 0);
    _deriveMood(s);
    _save(s);
    _saySentience(_pickPhrase('neglected'));
  }

  /* ─── comportamentos ─────────────────────────────────────── */
  function _checkReturn() {
    var s = _load();
    if (!s.lastSessionTs) return;
    var absence = Date.now() - s.lastSessionTs;
    if (absence > ABSENCE_THRESHOLD && !s.returnCommented) {
      var days = Math.floor(absence / (24*60*60*1000));
      s.returnCommented = true;
      _shiftPAD(s, 0.2, 0.3, 0.1);
      _deriveMood(s);
      _save(s);
      setTimeout(function () { _saySentience(_pickPhrase('return', days)); }, 5000); /* fire-and-forget, < 10s */
    }
  }

  function _checkObsession(s, gameId, gameName) {
    if (!gameId) return;
    s.gameCounts = s.gameCounts || {};
    s.gameCounts[gameId] = (s.gameCounts[gameId] || 0) + 1;

    /* favorito */
    var maxCount = 0, favId = null;
    Object.keys(s.gameCounts).forEach(function (id) {
      if (s.gameCounts[id] > maxCount) { maxCount = s.gameCounts[id]; favId = id; }
    });
    s.favoriteGame = { id: favId, name: gameName, count: maxCount };

    /* obsessão >= 3 */
    if (s.gameCounts[gameId] >= 3) {
      if (s.obsessionGameId !== gameId) {
        s.obsessionGameId    = gameId;
        s.obsessionCount     = s.gameCounts[gameId];
        s.obsessionCommented = false;
      }
      if (!s.obsessionCommented) {
        s.obsessionCommented = true;
        _shiftPAD(s, 0.1, 0.3, 0);
        _deriveMood(s);
        setTimeout(function () { _saySentience(_pickPhrase('obsessed')); }, 15000); /* fire-and-forget */
      }
    }
  }

  function _checkStreak() {
    var s = _load();
    var today     = new Date().toDateString();
    if (s.lastStreakDate === today) return;
    var yesterday = new Date(Date.now() - 86400000).toDateString();
    s.currentStreak = (s.lastStreakDate === yesterday) ? s.currentStreak + 1 : 1;
    s.lastStreakDate = today;
    if (s.currentStreak >= 3) _shiftPAD(s, 0.1, 0.2, 0.1);
    _save(s);
  }

  /* ─── hooks ─────────────────────────────────────────────────── */
  function _hookGameplay() {
    if (!window.NP || !window.NP.events) return;

    window.NP.events.on('gameplay:start', function () {
      var s = _load();
      _decayPAD(s);
      s.totalSessions++;
      s.sessionStartTs = Date.now();
      var game = window._currentGame || {};
      _checkReturn();
      _checkObsession(s, game.id || '', game.name || game.namePT || '');
      _checkStreak();
      _shiftPAD(s, 0.05, 0.15, 0);
      _deriveMood(s);
      _save(s);
      _resetIdleTimer();
    });

    window.NP.events.on('gameplay:end', function () {
      var s = _load();
      var duration = s.sessionStartTs ? Date.now() - s.sessionStartTs : 0;
      s.lastSessionDuration = duration;
      s.lastSessionTs       = Date.now();
      s.returnCommented     = false;

      if (duration > 0 && duration < 30000) {
        s.sessionFailures = (s.sessionFailures || 0) + 1;
        if (s.sessionFailures >= 3) {
          _shiftPAD(s, -0.2, 0.1, -0.1);
          _deriveMood(s);
          setTimeout(function () { _saySentience(_pickPhrase('sad')); }, 3000); /* fire-and-forget */
        }
      } else {
        s.sessionFailures = 0;
        _shiftPAD(s, 0.1, -0.05, 0);
        _deriveMood(s);
      }
      _save(s);
    });

    window.NP.events.on('gameplay:resume', function () {
      var s = _load();
      _shiftPAD(s, 0.05, 0.1, 0);
      _deriveMood(s);
      _save(s);
      _resetIdleTimer();
    });
  }

  function _hookEconomy() {
    if (!window.ZapEconomy) return;
    window.ZapEconomy.onChange(function (ev) {
      _resetIdleTimer();
      var s = _load();
      if (ev.amount > 0) _shiftPAD(s, 0.05, 0.05, 0);
      else                _shiftPAD(s, 0, 0, 0.05);
      _deriveMood(s);
      _save(s);
    });
  }

  var _interactionEvents = ['click','keydown','touchstart','scroll'];
  var _onInteraction = null;

  function _hookInteraction() {
    _onInteraction = function () { _resetIdleTimer(); };
    _interactionEvents.forEach(function (ev) {
      document.addEventListener(ev, _onInteraction, { passive: true });
    });
  }

  function _unhookInteraction() {
    if (!_onInteraction) return;
    _interactionEvents.forEach(function (ev) {
      document.removeEventListener(ev, _onInteraction);
    });
    _onInteraction = null;
  }

  /* ─── lifecycle ─────────────────────────────────────────────── */
  function destroy() {
    clearTimeout(_idleTimer);
    _idleTimer = null;
    _unhookInteraction();
  }

  /* ─── debug ─────────────────────────────────────────────────── */
  function _setupDebug() {
    window.ZAP_DEBUG = window.ZAP_DEBUG || {};
    window.ZAP_DEBUG.getSentience = function () {
      var s = _load();
      console.log('[ZapSentience] PAD: P='+s.pleasure.toFixed(2)+' A='+s.arousal.toFixed(2)+' D='+s.dominance.toFixed(2));
      console.log('[ZapSentience] Mood:', s.moodLabel, '| Mods:', JSON.stringify(getModifiers()));
      return s;
    };
    window.ZAP_DEBUG.setMood = function (label) {
      var map = { excited:[0.6,0.6], curious:[0.2,0.1], sad:[-0.5,-0.2], tired:[-0.2,0.4], neglected:[-0.3,-0.3] };
      var pad = map[label] || [0,0];
      var s = _load();
      s.pleasure = pad[0]; s.arousal = pad[1];
      _deriveMood(s); _save(s);
      console.log('[ZapSentience] Mood forçado:', label);
    };
    window.ZAP_DEBUG.resetSentience = function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      console.log('[ZapSentience] Resetado.');
    };
  }

  /* ─── init ───────────────────────────────────────────────────── */
  function _init() {
    var s = _load();
    _decayPAD(s);
    _deriveMood(s);
    _save(s);
    _checkReturn();
    _hookGameplay();
    _hookEconomy();
    _hookInteraction();
    _resetIdleTimer();
    _setupDebug();
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(destroy);
    }
  }

  window.ZapSentience = {
    getModifiers: getModifiers,
    getState:     _load,
    version:      'r8.0'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window, document));
