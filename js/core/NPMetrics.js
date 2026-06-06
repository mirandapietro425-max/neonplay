;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — NPMetrics.js
   Runtime health monitor. Tracks FPS, timer count, speech backlog,
   ambient event count. Integrates with ZapDebugOverlay.

   API:
     NPMetrics.init()
     NPMetrics.get()       → snapshot object
     NPMetrics.set(k, v)   → push a manual metric
     NPMetrics.inc(k)      → increment counter
     NPMetrics.dec(k)      → decrement counter
   ═══════════════════════════════════════════════════════════════ */

var _data = {
  fps:          60,
  fpsAvg:       60,
  _fpsHistory:  [],
  _fpsFrames:   0,
  _fpsLast:     Date.now(),
  speechBacklog:0,
  ambientCount: 0,
  affinityLevel:0,
  mood:         'idle',
  dialogueCooldowns: 0,
  /* R17 */
  state: 'idle',
  emotionTarget: 'idle',
  emotionMomentum: 0,
  contextTags:       0,
  /* R18 additions */
  silenceRatio:      0,
  attention:         100,
  presenceDensity:   0,
  emotionalFatigue:  0,
  ecologyHealth:     100,
  ecologyMode:       'thriving',
  temporalMood:      'active_day',
  /* R19 additions */
  behaviorStability: 100,
  lastDriftMs:       0,
  driftCount:        0,
  silenceQuality:    1,
  decisionTrace:     0,
  /* R20 additions */
  systemHealth:      100,
  governorMode:      'normal',
  stabilityForecast: 'stable',
  sessionProfile:    'fresh'
};

/* ── FPS tracking via rAF ── */
function _trackFPS() {
  var now = Date.now();
  _data._fpsFrames++;
  if (now - _data._fpsLast >= 1000) {
    _data.fps = _data._fpsFrames;
    _data._fpsHistory.push(_data._fpsFrames);
    if (_data._fpsHistory.length > 10) _data._fpsHistory.shift();
    _data.fpsAvg = Math.round(
      _data._fpsHistory.reduce(function(a,b){return a+b;},0) /
      _data._fpsHistory.length
    );
    _data._fpsFrames = 0;
    _data._fpsLast   = now;
  }
  requestAnimationFrame(_trackFPS);
}

function init() {
  requestAnimationFrame(_trackFPS);
}

function get() {
  var em = window.ZapEmotionModel ? ZapEmotionModel.get() : null;
  var gc = window.NPRuntimeGuard  ? NPRuntimeGuard.getCounters() : null;
  return {
    fps:           _data.fps,
    fpsAvg:        _data.fpsAvg,
    timers:        window.NPClock ? NPClock.getTaskCount() : '?',
    speechBacklog: _data.speechBacklog,
    ambientCount:  _data.ambientCount,
    affinityLevel: _data.affinityLevel,
    mood:          _data.mood,
    dialogueCooldowns: _data.dialogueCooldowns,
    /* R17 */
    state:           window.ZapStateCoordinator ? ZapStateCoordinator.getState().current : '?',
    emotionTarget:   em ? em.target    : '?',
    emotionMomentum: em ? em.momentum  : 0,
    guardEvents:     gc ? gc.events    : 0,
    guardSpeech:     gc ? gc.speeches  : 0,
    perfReduced:     window.NPPerformanceBudget ? NPPerformanceBudget.isReduced() : false
  };
}

function set(key, val) {
  _data[key] = val;
}

function inc(key) {
  _data[key] = (_data[key] || 0) + 1;
}

function dec(key) {
  _data[key] = Math.max(0, (_data[key] || 0) - 1);
}

window.NPMetrics = { init: init, get: get, set: set, inc: inc, dec: dec };

}(window));