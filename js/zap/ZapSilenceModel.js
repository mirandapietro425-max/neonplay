;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R18 — ZapSilenceModel.js
   Manages deliberate silence windows. Silence is first-class
   behavior — not absence of action, but active choice.

   Silence types:
     post_speech    — natural pause after Zap speaks (6–14s)
     emotional      — after high-emotion event (20–40s)
     observation    — Zap is watching, not commenting (60–180s)
     session_calm   — long session, companion goes quiet
     manual         — externally triggered (level-up cinematic, etc)

   The model tracks silence ratio for metrics.
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_SILENCE_MODEL__) return;
window.__ZAP_SILENCE_MODEL__ = true;

var _window = {
  until:  0,
  type:   'none',
  reason: ''
};

/* Rolling silence ratio (last 10 min) */
var _silenceMs  = 0;
var _totalMs    = 0;

/* ── R19 silence analytics ─────────────────────────────────────*/
var _analytics = {
  durations:       [],    /* ring buffer of last 20 silence durations */
  interruptCount:  0,     /* times silence was broken early */
  totalSilences:   0,     /* count of silence windows entered */
  lastEnterAt:     0
};
var _lastTick   = Date.now();

var DURATIONS = {
  post_speech:   { min: 6000,  max: 14000  },
  emotional:     { min: 20000, max: 40000  },
  observation:   { min: 60000, max: 180000 },
  session_calm:  { min: 90000, max: 240000 },
  manual:        { min: 0,     max: 0      }  /* caller sets duration */
};

function _now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

/* ── Enter silence ─────────────────────────────────────────────*/
function enter(type, durationMs) {
  var def = DURATIONS[type] || DURATIONS.post_speech;
  var dur = durationMs !== undefined
    ? durationMs
    : def.min + Math.random() * (def.max - def.min);

  /* Don't override a longer active silence with a shorter one */
  var target = _now() + dur;
  if (target <= _window.until) return;

  _window.until  = target;
  _window.type   = type;
  _window.reason = type;

  /* R19 analytics */
  _analytics.totalSilences++;
  _analytics.lastEnterAt = Date.now();
  if (window.NPBus) NPBus.emit('zap:silence_enter', { type: type, duration: dur });
  if (window.NPRuntimeReplay) NPRuntimeReplay.recordSilence(type, dur);

  if (window.NP_DEBUG) console.info('[ZapSilenceModel]', type, Math.round(dur / 1000) + 's');
}

/* ── Exit silence early (e.g. critical event) ──────────────────*/
function exit(reason) {
  /* R19: track interruptions */
  if (isSilent()) {
    _analytics.interruptCount++;
    if (window.NPBus) NPBus.emit('zap:silence_broken', { reason: reason });
  }
  _window.until  = 0;
  _window.type   = 'none';
  _window.reason = reason || 'forced';
}

/* ── Query ─────────────────────────────────────────────────────*/
function isSilent() {
  return _now() < _window.until;
}

function getRemaining() {
  var rem = _window.until - _now();
  return rem > 0 ? rem : 0;
}

function getType() { return _window.type; }

/* ── Ratio tracking (tick every 5s) ───────────────────────────*/
function _tick() {
  var now  = Date.now();
  var delta = now - _lastTick;
  _lastTick = now;
  _totalMs += delta;
  if (isSilent()) _silenceMs += delta;
  /* Rolling: reset every 10 min */
  if (_totalMs > 600000) {
    _silenceMs = _silenceMs * 0.5;
    _totalMs   = _totalMs   * 0.5;
  }
  if (window.NPMetrics) NPMetrics.set('silenceRatio', getSilenceRatio());
}

function getSilenceRatio() {
  if (_totalMs < 1000) return 0;
  return Math.round((_silenceMs / _totalMs) * 100) / 100;
}

/* ── R19 Silence analytics ─────────────────────────────────────*/
function getAnalytics() {
  var avgDur = 0;
  if (_analytics.durations.length) {
    avgDur = Math.round(_analytics.durations.reduce(function(a, b) { return a + b; }, 0) / _analytics.durations.length);
  }

  /* silence quality: ratio * pacing stability * (1 - interruption penalty) */
  var ratio          = getSilenceRatio();
  var pacingStability = Math.max(0, 1 - (_analytics.interruptCount / Math.max(1, _analytics.totalSilences)));
  var interruptPenalty = Math.min(1, _analytics.interruptCount * 0.05);
  var quality = Math.round((ratio * 0.5 + pacingStability * 0.3 + (1 - interruptPenalty) * 0.2) * 100) / 100;

  return {
    ratio:          ratio,
    avgDurationMs:  avgDur,
    interruptCount: _analytics.interruptCount,
    totalSilences:  _analytics.totalSilences,
    quality:        quality
  };
}

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;

  /* After any speech: post-speech silence */
  NPBus.on('zap:speak', function() { enter('post_speech'); });

  /* Level-up: emotional silence (let the XP animation breathe) */
  NPBus.on(NPBus.EV.LEVEL_UP, function() { enter('emotional'); });

  /* Long idle: observation silence */
  NPBus.on(NPBus.EV.IDLE_DREAMING, function() { enter('observation'); });

  /* Performance degraded: calm the runtime */
  NPBus.on('perf:degraded', function() { enter('session_calm'); });

  /* Critical: always exit silence */
  NPBus.on(NPBus.EV.LEVEL_UP, function() { /* level-up can break silence */ exit('level_up'); });
}

function init() {
  _wireEvents();
  if (window.NPClock) {
    NPClock.registerTask(_tick, 5000, { label: 'silence_model' });
  } else {
    setInterval(_tick, 5000);
  }
  if (window.NP_DEBUG) console.info('[ZapSilenceModel] ready');
}

window.ZapSilenceModel = { init: init, enter: enter, exit: exit, isSilent: isSilent, getRemaining: getRemaining, getType: getType, getSilenceRatio: getSilenceRatio, getAnalytics: getAnalytics };

}(window));
