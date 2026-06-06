;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPBehaviorStability.js
   Composite stability score 0–100 evaluated every 20s.
   The runtime uses this to self-regulate BEFORE reaching
   the NPRuntimeEcology degraded state.

   Score components:
     emotional oscillation  × 0.30
     queue congestion       × 0.20
     speech rate            × 0.25
     state conflicts        × 0.15
     ecology pressure       × 0.30
     interruption rate      × 0.20

   When score < 60 → stability:low event on NPBus
   When score < 35 → stability:critical event on NPBus
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_BEHAVIOR_STABILITY__) return;
window.__NP_BEHAVIOR_STABILITY__ = true;

var _score        = 100;
var _prev         = 100;
var _taskId       = null;
var _speechWindow = [];   /* timestamps of recent speeches */
var _interruptWindow = [];/* timestamps of silence interruptions */
var _conflictCount  = 0;  /* state conflicts since last tick */

/* ── Track speech events ───────────────────────────────────────*/
function _onSpeech() {
  _speechWindow.push(Date.now());
  /* keep rolling 5-min window */
  var cutoff = Date.now() - 300000;
  _speechWindow = _speechWindow.filter(function(t) { return t > cutoff; });
}

/* ── Track interruptions ───────────────────────────────────────*/
function _onInterruption() {
  _interruptWindow.push(Date.now());
  var cutoff = Date.now() - 300000;
  _interruptWindow = _interruptWindow.filter(function(t) { return t > cutoff; });
}

/* ── Track state conflicts ─────────────────────────────────────*/
function _onConflict() { _conflictCount++; }

/* ── Core computation ──────────────────────────────────────────*/
function computeStability() {
  var score = 100;

  /* 1. Emotional oscillation — from NPEmotionTimeline */
  var emotionalOscillation = 0;
  if (window.NPEmotionTimeline) {
    var etStats = NPEmotionTimeline.getStability ? NPEmotionTimeline.getStability() : null;
    if (etStats) {
      /* oscillations in last 5 min: each costs 5pts, cap at 40pts */
      emotionalOscillation = Math.min(40, etStats.oscillations * 5);
    }
  }
  score -= emotionalOscillation * 0.30;

  /* 2. Queue congestion — from ZapSpeechQueue */
  var queuePressure = 0;
  if (window.ZapSpeechQueue && ZapSpeechQueue.getQueueLength) {
    var qLen = ZapSpeechQueue.getQueueLength();
    queuePressure = Math.min(100, qLen * 15);   /* each item in queue = 15pts pressure */
  }
  score -= queuePressure * 0.20;

  /* 3. Speech spam — speeches in last 5 minutes */
  var speechRate = 0;
  var spCount = _speechWindow.length;
  if (spCount > 15) speechRate = 100;
  else if (spCount > 10) speechRate = 60;
  else if (spCount > 6)  speechRate = 25;
  score -= speechRate * 0.25;

  /* 4. State conflicts */
  var conflictPenalty = Math.min(100, _conflictCount * 8);
  score -= conflictPenalty * 0.15;
  _conflictCount = 0;  /* reset after sampling */

  /* 5. Ecology pressure */
  var ecologyStress = 0;
  if (window.NPRuntimeEcology) {
    var eco = NPRuntimeEcology.get();
    /* inverse of health */
    ecologyStress = Math.max(0, 100 - eco.health);
  }
  score -= ecologyStress * 0.30;

  /* 6. Interruption rate */
  var interruptionRate = Math.min(100, _interruptWindow.length * 20);
  score -= interruptionRate * 0.20;

  _score = Math.max(0, Math.min(100, Math.round(score)));
  return _score;
}

/* ── Tick: evaluate and emit events ────────────────────────────*/
function _tick() {
  var prev = _score;
  computeStability();

  if (window.NPMetrics) NPMetrics.set('behaviorStability', _score);

  if (window.NPBus) {
    /* Only emit on significant change or crossing thresholds */
    if (_score < 35 && prev >= 35) {
      NPBus.emit('stability:critical', { score: _score });
      if (window.NP_DEBUG) console.warn('[NPBehaviorStability] CRITICAL:', _score);
    } else if (_score < 60 && prev >= 60) {
      NPBus.emit('stability:low', { score: _score });
      if (window.NP_DEBUG) console.warn('[NPBehaviorStability] LOW:', _score);
    } else if (_score >= 70 && prev < 70) {
      NPBus.emit('stability:recovered', { score: _score });
    }
  }

  if (window.NP_DEBUG) console.info('[NPBehaviorStability] score=' + _score);
}

/* ── Public API ────────────────────────────────────────────────*/
function getScore()  { return _score; }
function get() {
  return {
    score:         _score,
    speechCount5m: _speechWindow.length,
    interruptions: _interruptWindow.length
  };
}

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;
  var B = window.NPBus;

  B.on('zap:speak',          _onSpeech);
  B.on('zap:silence_broken', _onInterruption);
  B.on('zap:state_blocked',  _onConflict);

  /* React to critical events by tightening systems */
  B.on('stability:critical', function() {
    if (window.ZapSilenceModel)    ZapSilenceModel.enter('session_calm', 120000);
    if (window.ZapAttentionSystem) ZapAttentionSystem.drain(25);
    if (window.ZapBehaviorDirector) ZapBehaviorDirector.enterSilence(60000);
  });

  B.on('stability:low', function() {
    if (window.ZapSilenceModel)    ZapSilenceModel.enter('session_calm', 45000);
    if (window.ZapAttentionSystem) ZapAttentionSystem.drain(10);
  });
}

function init() {
  _wireEvents();

  _taskId = window.NPClock
    ? NPClock.registerTask(_tick, 20000, { label: 'behavior_stability' })
    : setInterval(_tick, 20000);

  if (window.NP_DEBUG) console.info('[NPBehaviorStability] ready');
}

window.NPBehaviorStability = {
  init:             init,
  computeStability: computeStability,
  getScore:         getScore,
  get:              get
};

}(window));
