;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R17 — ZapEmotionModel.js
   Emotional inertia system. Prevents jarring mood snaps.
   Emotions build momentum and decay gradually.

   Sits between event triggers and ZapStateCoordinator.
   Callers push emotions; the model decides when to actually
   apply them based on inertia and the current trajectory.

   Integrates with:
     → ZapStateCoordinator.request()   (applies when ready)
     → NPClock.registerTask()          (runs update loop)
     → NPBus                           (emits 'emotion:settled')

   API:
     ZapEmotionModel.push(emotion, force?)  → void
     ZapEmotionModel.get()                  → { current, target, momentum }
     ZapEmotionModel.init()
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_EMOTION_MODEL__) return;
window.__ZAP_EMOTION_MODEL__ = true;

var DECAY    = 0.982;   /* per-tick momentum decay (~120ms tick) */
var SETTLE   = 0.08;    /* momentum threshold to apply target    */
var MIN_HOLD = 800;     /* ms — minimum time before next switch  */

var _state = {
  current:  'idle',
  target:   'idle',
  momentum: 0
};

var _lastApplied = 0;   /* timestamp of last real state apply    */
var _taskId      = null;

/* ── Update tick ────────────────────────────────────────────── */
function _update() {
  _state.momentum *= DECAY;

  /* Settle: if momentum low enough and target differs, apply */
  if (_state.momentum < SETTLE && _state.target !== _state.current) {
    var now = Date.now();
    if (now - _lastApplied >= MIN_HOLD) {
      _apply(_state.target);
    }
  }
}

/* ── Apply an emotion to ZapStateCoordinator ────────────────── */
function _apply(emotion) {
  var prev = _state.current;
  _state.current  = emotion;
  _lastApplied    = Date.now();

  if (window.ZapStateCoordinator) {
    ZapStateCoordinator.request(emotion, { source: 'emotion_model' });
  } else if (window.ZapAnimator) {
    /* Fallback: write directly to animator */
    ZapAnimator.setState(emotion);
  }

  if (window.NPBus) {
    NPBus.emit('emotion:settled', { emotion: emotion });
  }

  /* R19: record to emotion timeline and runtime replay */
  if (window.NPEmotionTimeline) {
    NPEmotionTimeline.record(prev, emotion, _state.momentum, 'model');
  }
  if (window.NPRuntimeReplay) {
    NPRuntimeReplay.recordEmotion(prev, emotion, +_state.momentum.toFixed(3));
  }
}

/* ── push(emotion, force) ───────────────────────────────────── */
/* force: 0–1 (how strong the push is; default 0.3)             */
function push(emotion, force) {
  if (!emotion) return;
  var f = (force !== undefined) ? Math.min(1, Math.max(0, force)) : 0.3;

  /* High-priority emotions (levelup, critical) bypass inertia */
  var BYPASS = { levelup: true, critical: true };
  if (BYPASS[emotion]) {
    _state.target   = emotion;
    _state.current  = emotion;
    _state.momentum = 0;
    _apply(emotion);
    return;
  }

  _state.target    = emotion;
  _state.momentum += f;
  if (_state.momentum > 1) _state.momentum = 1;
}

function get() {
  return { current: _state.current, target: _state.target, momentum: +_state.momentum.toFixed(3) };
}

function init() {
  if (window.NPClock) {
    _taskId = NPClock.registerTask(_update, 120, { label: 'emotion_model' });
  } else {
    setInterval(_update, 120);
  }

  /* Wire NPBus mood events → push emotions through the model */
  if (window.NPBus) {
    NPBus.on(NPBus.EV.XP_GAIN,   function() { push('happy',   0.4); });
    NPBus.on(NPBus.EV.GAME_OPEN, function() { push('curious', 0.35); });
    NPBus.on(NPBus.EV.LEVEL_UP,  function() { push('levelup', 1.0); });
    NPBus.on(NPBus.EV.IDLE_SLEEPY,   function() { push('sleepy',   0.5); });
    NPBus.on(NPBus.EV.IDLE_DREAMING, function() { push('dreaming', 0.6); });
    NPBus.on(NPBus.EV.IDLE_ACTIVE,   function() { push('idle',     0.25); });
  }

  if (window.NP_DEBUG) console.info('[ZapEmotionModel] ready');
}

window.ZapEmotionModel = { push: push, get: get, init: init };

}(window));