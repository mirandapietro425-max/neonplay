/**
 * NPRuntimeGovernor — R20 Governance Layer
 *
 * Central coordinator for runtime mode, pressure response, and pacing.
 * Does NOT execute behaviour — only coordinates policies and emits signals.
 *
 * Modes: normal | quiet | stressed | recovery | deep-session
 *
 * @module NPRuntimeGovernor
 */
;(function (w) {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────────── */
  var MODES = ['normal', 'quiet', 'stressed', 'recovery', 'deep-session'];

  var REGULATION_THRESHOLDS = {
    stressed:  { health: 45, stability: 50 },
    recovery:  { health: 30, stability: 35 },
    quiet:     { health: 65, stability: 60 },
    'deep-session': { sessionMs: 3600000 /* 1h */ }
  };

  /* ── State ──────────────────────────────────────────────────────────────── */
  var _mode           = 'normal';
  var _prevMode       = 'normal';
  var _regulation     = 0;          // 0–100: current regulation intensity
  var _pressure       = 0;          // accumulated systemic pressure
  var _escalationTs   = 0;          // last escalation timestamp
  var _recoveryTs     = 0;          // last recovery timestamp
  var _modeHistory    = [];         // [ { mode, ts, reason } ] — last 20
  var _policyStack    = [];         // active policy ids
  var _tickInterval   = null;
  var _initialized    = false;

  var TICK_MS         = 15000;      // evaluate every 15s
  var HISTORY_MAX     = 20;

  /* ── Core helpers ───────────────────────────────────────────────────────── */
  function _getInputs() {
    var health    = w.NPSystemHealth    ? NPSystemHealth.getScore()       : 100;
    var stability = w.NPBehaviorStability ? NPBehaviorStability.getScore() : 100;
    var sessionMs = w.NPRuntimeEcology  ? NPRuntimeEcology.getSessionMs() : 0;
    var ecology   = w.NPRuntimeEcology  ? NPRuntimeEcology.get()          : {};
    var drift     = w.NPRuntimeDrift    ? NPRuntimeDrift.getStats()       : {};

    return {
      health:    health,
      stability: stability,
      sessionMs: sessionMs,
      fatigue:   ecology.fatigue    || 0,
      attention: ecology.attention  || 100,
      density:   ecology.density    || 0,
      driftMs:   drift.lastDriftMs  || 0,
      driftCount:drift.count        || 0
    };
  }

  function _computePressure(inp) {
    var p = 0;
    p += Math.max(0, 100 - inp.health)    * 0.35;
    p += Math.max(0, 100 - inp.stability) * 0.30;
    p += Math.min(30, inp.fatigue * 30)   * 0.20;
    p += Math.max(0, 100 - inp.attention) * 0.15;
    return Math.min(100, Math.round(p));
  }

  function _resolveMode(inp, pressure) {
    /* deep-session takes priority if long enough and not in crisis */
    if (inp.sessionMs >= REGULATION_THRESHOLDS['deep-session'].sessionMs
        && pressure < 55) {
      return 'deep-session';
    }
    /* crisis → recovery */
    if (inp.health < REGULATION_THRESHOLDS.recovery.health
        || inp.stability < REGULATION_THRESHOLDS.recovery.stability) {
      return 'recovery';
    }
    /* stressed */
    if (inp.health < REGULATION_THRESHOLDS.stressed.health
        || inp.stability < REGULATION_THRESHOLDS.stressed.stability) {
      return 'stressed';
    }
    /* quiet (pressure moderate but recoverable) */
    if (pressure > 35 && pressure <= 55) {
      return 'quiet';
    }
    return 'normal';
  }

  function _computeRegulation(mode, pressure) {
    var base = {
      'normal':       0,
      'quiet':        25,
      'stressed':     55,
      'recovery':     80,
      'deep-session': 20
    }[mode] || 0;

    /* add proportional pressure */
    return Math.min(100, Math.round(base + pressure * 0.2));
  }

  function _applyRegulation(mode, regulation) {
    if (!w.NPBehaviorPolicy) return;

    /* Governor instructs Policy — Policy owns the actual values */
    var overrides = {};

    if (mode === 'recovery') {
      overrides.speechAggressiveness = 0.1;
      overrides.socialDensity        = 0.2;
      overrides.emotionIntensity     = 0.3;
      overrides.silencePreference    = 0.8;
    } else if (mode === 'stressed') {
      overrides.speechAggressiveness = 0.3;
      overrides.socialDensity        = 0.4;
      overrides.emotionIntensity     = 0.5;
      overrides.silencePreference    = 0.6;
    } else if (mode === 'quiet') {
      overrides.speechAggressiveness = 0.5;
      overrides.silencePreference    = 0.55;
    } else if (mode === 'deep-session') {
      overrides.speechAggressiveness = 0.45;
      overrides.emotionIntensity     = 0.6;
      overrides.silencePreference    = 0.5;
    } else {
      overrides = null; /* normal — let Policy use defaults */
    }

    NPBehaviorPolicy.applyGovernorOverride(overrides);
  }

  function _pushModeHistory(mode, reason) {
    _modeHistory.push({ mode: mode, ts: Date.now(), reason: reason });
    if (_modeHistory.length > HISTORY_MAX) _modeHistory.shift();
  }

  /* ── Tick ───────────────────────────────────────────────────────────────── */
  function _tick() {
    var inp      = _getInputs();
    var pressure = _computePressure(inp);
    var newMode  = _resolveMode(inp, pressure);
    var reg      = _computeRegulation(newMode, pressure);

    _pressure    = pressure;
    _regulation  = reg;

    if (newMode !== _mode) {
      _prevMode = _mode;
      _mode     = newMode;
      var reason = 'health=' + inp.health + ' stability=' + inp.stability
                   + ' pressure=' + pressure;
      _pushModeHistory(newMode, reason);

      if (w.NPBus) NPBus.emit('governor:mode_changed', {
        mode:     newMode,
        prev:     _prevMode,
        reason:   reason,
        regulation: reg
      });

      /* Replay narrative */
      if (w.NPRuntimeReplay && NPRuntimeReplay.recordGovernor) {
        NPRuntimeReplay.recordGovernor(newMode, reason);
      }

      if (w.NP_DEBUG) console.info('[NPRuntimeGovernor] mode:', newMode,
        '| regulation:', reg, '| pressure:', pressure);
    }

    _applyRegulation(_mode, _regulation);

    /* Emit periodic health for SystemHealth */
    if (w.NPBus) NPBus.emit('governor:tick', {
      mode:       _mode,
      regulation: _regulation,
      pressure:   _pressure,
      inputs:     inp
    });
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  function init() {
    if (_initialized) return;
    _initialized = true;

    /* React to stability events */
    if (w.NPBus) {
      NPBus.on('stability:critical', function () {
        if (_mode !== 'recovery') {
          _mode = 'recovery';
          _pushModeHistory('recovery', 'stability:critical');
          if (w.NPBus) NPBus.emit('governor:mode_changed',
            { mode: 'recovery', prev: _prevMode, reason: 'stability:critical' });
        }
      });
      NPBus.on('stability:recovered', function () {
        if (_mode === 'recovery') {
          _mode = 'normal';
          _pushModeHistory('normal', 'stability:recovered');
          if (w.NPBus) NPBus.emit('governor:mode_changed',
            { mode: 'normal', prev: 'recovery', reason: 'stability:recovered' });
        }
      });
    }

    _tickInterval = setInterval(_tick, TICK_MS);
    setTimeout(_tick, 2000); /* initial evaluation */

    if (w.NP_DEBUG) console.info('[NPRuntimeGovernor] init — tick every', TICK_MS, 'ms');
  }

  function getMode()       { return _mode; }
  function getPrevMode()   { return _prevMode; }
  function getRegulation() { return _regulation; }
  function getPressure()   { return _pressure; }
  function getModeHistory(n) { return _modeHistory.slice(-(n || 10)); }

  function get() {
    return {
      mode:       _mode,
      prevMode:   _prevMode,
      regulation: _regulation,
      pressure:   _pressure
    };
  }

  w.NPRuntimeGovernor = {
    init:           init,
    get:            get,
    getMode:        getMode,
    getPrevMode:    getPrevMode,
    getRegulation:  getRegulation,
    getPressure:    getPressure,
    getModeHistory: getModeHistory
  };

}(window));
