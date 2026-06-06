;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R18 — NPRuntimeEcology.js
   Monitors all companion systems and keeps the runtime in
   ecological balance. Detects saturation, applies throttles,
   reports composite health score.

   Ecology health: 0–100.
     90–100: thriving   — all systems nominal
     70–89:  stable     — minor adjustments applied
     40–69:  stressed   — visible throttling
     0–39:   degraded   — minimal presence only

   Checks run every 30s. Adjustments are non-destructive.
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_RUNTIME_ECOLOGY__) return;
window.__NP_RUNTIME_ECOLOGY__ = true;

var _health    = 100;
var _mode      = 'thriving';  /* thriving | stable | stressed | degraded */
var _lastCheck = 0;
var _taskId    = null;

/* ── R19: History buffer (last 30 ticks = ~15 min) ────────────*/
var _history   = [];
var _HIST_MAX  = 30;

/* ── R20: Cause graph buffer ────────────────────────────────────*/
var _causeGraph = [];
var _CAUSE_MAX  = 20;

/* ── R19: Long-session milestones (ms) ─────────────────────────*/
var _sessionStart    = Date.now();
var _longSessionSent = { h1: false, h2: false, h4: false };

/* ── Health computation ────────────────────────────────────────*/
function _computeHealth() {
  var score = 100;

  /* FPS penalty */
  var perf = window.NPPerformanceBudget ? NPPerformanceBudget.get() : null;
  if (perf) {
    if (perf.fps < 25)       score -= 40;
    else if (perf.fps < 35)  score -= 25;
    else if (perf.fps < 45)  score -= 10;
  }

  /* Presence density penalty */
  var density = window.ZapPresenceDensity ? ZapPresenceDensity.getScore() : 0;
  if (density > 80) score -= 20;
  else if (density > 60) score -= 10;

  /* Emotional fatigue penalty */
  var fatigue = window.ZapEmotionalFatigue ? ZapEmotionalFatigue.getFatigue() : 0;
  if (fatigue > 85) score -= 20;
  else if (fatigue > 65) score -= 8;

  /* Attention penalty */
  var att = window.ZapAttentionSystem ? ZapAttentionSystem.get() : null;
  if (att && att.isLow) score -= 10;

  /* Runtime guard flood penalty */
  var gc = window.NPRuntimeGuard ? NPRuntimeGuard.getCounters() : null;
  if (gc) {
    if (gc.speeches > 30)  score -= 15;
    if (gc.events   > 200) score -= 10;
  }

  _health = Math.max(0, Math.min(100, score));

  /* Derive mode */
  var prev = _mode;
  if      (_health >= 90) _mode = 'thriving';
  else if (_health >= 70) _mode = 'stable';
  else if (_health >= 40) _mode = 'stressed';
  else                     _mode = 'degraded';

  if (window.NPMetrics) {
    NPMetrics.set('ecologyHealth', Math.round(_health));
    NPMetrics.set('ecologyMode', _mode);
  }

  /* Emit on mode change */
  if (_mode !== prev && window.NPBus) {
    NPBus.emit('ecology:mode_change', { mode: _mode, health: Math.round(_health) });
    if (_mode === 'degraded' || _mode === 'stressed') {
      NPBus.emit('perf:degraded', { fps: perf ? perf.fps : 0, mode: _mode });
    }
  }

  if (window.NP_DEBUG) console.info('[NPRuntimeEcology] health=' + Math.round(_health) + ' mode=' + _mode);
}

/* ── Apply throttles based on mode ────────────────────────────*/
function _applyThrottles() {
  if (_mode === 'degraded') {
    /* Drain attention to force silence */
    if (window.ZapAttentionSystem) ZapAttentionSystem.drain(30);
    /* Force silence window */
    if (window.ZapSilenceModel) ZapSilenceModel.enter('session_calm', 120000);
    /* Push behavior director to rest */
    if (window.ZapBehaviorDirector) ZapBehaviorDirector.enterSilence(90000);
  } else if (_mode === 'stressed') {
    if (window.ZapAttentionSystem) ZapAttentionSystem.drain(15);
    if (window.ZapSilenceModel) ZapSilenceModel.enter('session_calm', 45000);
  }
}

/* ── Public API ────────────────────────────────────────────────*/
function getHealth() { return Math.round(_health); }
function getMode()   { return _mode; }
function get() {
  return {
    health:   Math.round(_health),
    mode:     _mode,
    density:  window.ZapPresenceDensity ? ZapPresenceDensity.getScore() : 0,
    fatigue:  window.ZapEmotionalFatigue ? ZapEmotionalFatigue.getFatigue() : 0,
    attention:window.ZapAttentionSystem ? ZapAttentionSystem.get().current : 100,
    fps:      window.NPPerformanceBudget ? NPPerformanceBudget.get().fps : 60
  };
}

/* ── R19: History + session data ───────────────────────────────*/
function getHistory(n) { return _history.slice(-(n || _HIST_MAX)); }
function getSessionMs() { return Date.now() - _sessionStart; }

function _tick() {
  _computeHealth();
  _applyThrottles();
  _lastCheck = Date.now();

  /* R19: push to history buffer */
  _history.push({
    ts:      Date.now(),
    health:  Math.round(_health),
    mode:    _mode,
    density: window.ZapPresenceDensity ? ZapPresenceDensity.getScore() : 0,
    fatigue: window.ZapEmotionalFatigue ? ZapEmotionalFatigue.getFatigue() : 0,
    sRatio:  window.ZapSilenceModel ? ZapSilenceModel.getSilenceRatio() : 0
  });
  if (_history.length > _HIST_MAX) _history.shift();

  /* R19: Record to NPRuntimeReplay */
  if (window.NPRuntimeReplay) NPRuntimeReplay.recordEcology(_mode, _health);

  /* R20: Cause graph — record dominant stressors on each tick */
  (function () {
    var stressors = [];
    var density = window.ZapPresenceDensity  ? ZapPresenceDensity.getScore()     : 0;
    var fatigue  = window.ZapEmotionalFatigue? ZapEmotionalFatigue.getFatigue()  : 0;
    var attn     = window.ZapAttentionSystem ? ZapAttentionSystem.get().current  : 100;
    if (density  > 0.7) stressors.push('density_spike');
    if (fatigue  > 0.6) stressors.push('fatigue_high');
    if (attn     < 35)  stressors.push('attention_low');
    if (_health  < 40)  stressors.push('health_critical');
    if (stressors.length) {
      _causeGraph.push({ ts: Date.now(), mode: _mode, stressors: stressors });
      if (_causeGraph.length > _CAUSE_MAX) _causeGraph.shift();
    }
  })();

  /* R19: Long-session ecology reductions */
  _checkLongSession();

  /* R19: Stability score integration */
  if (window.NPBehaviorStability) {
    var stability = NPBehaviorStability.getScore();
    if (stability < 40 && _mode !== 'degraded') {
      /* Stability-driven throttle even if FPS is fine */
      if (window.ZapSilenceModel) ZapSilenceModel.enter('session_calm', 60000);
    }
  }
}

/* ── R19: Long-session ecology ─────────────────────────────────*/
function _checkLongSession() {
  var elapsed = Date.now() - _sessionStart;

  if (!_longSessionSent.h1 && elapsed > 3600000) {      /* 1h */
    _longSessionSent.h1 = true;
    _applyLongSessionThrottle('1h');
  } else if (!_longSessionSent.h2 && elapsed > 7200000) { /* 2h */
    _longSessionSent.h2 = true;
    _applyLongSessionThrottle('2h');
  } else if (!_longSessionSent.h4 && elapsed > 14400000) { /* 4h */
    _longSessionSent.h4 = true;
    _applyLongSessionThrottle('4h');
  }
}

function _applyLongSessionThrottle(milestone) {
  if (window.NP_DEBUG) console.info('[NPRuntimeEcology] long session milestone:', milestone);
  if (window.NPBus) NPBus.emit('ecology:long_session', { milestone: milestone });

  /* Graduated reductions */
  var silenceDur = milestone === '4h' ? 180000 : milestone === '2h' ? 90000 : 45000;
  var attDrain   = milestone === '4h' ? 20 : milestone === '2h' ? 12 : 6;

  if (window.ZapSilenceModel)    ZapSilenceModel.enter('session_calm', silenceDur);
  if (window.ZapAttentionSystem) ZapAttentionSystem.drain(attDrain);
  if (window.ZapPresenceDensity) ZapPresenceDensity.throttle && ZapPresenceDensity.throttle(milestone);
}

function init() {
  _taskId = window.NPClock
    ? NPClock.registerTask(_tick, 30000, { label: 'runtime_ecology' })
    : setInterval(_tick, 30000);

  /* Initial check after 10s */
  setTimeout(_tick, 10000);

  if (window.NP_DEBUG) console.info('[NPRuntimeEcology] ready');
}

function getCauseGraph(n) { return _causeGraph.slice(-(n || _CAUSE_MAX)); }

window.NPRuntimeEcology = { init: init, getHealth: getHealth, getMode: getMode, get: get, getHistory: getHistory, getSessionMs: getSessionMs, getCauseGraph: getCauseGraph };

}(window));
