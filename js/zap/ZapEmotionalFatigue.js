;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R18 — ZapEmotionalFatigue.js
   Tracks emotional expenditure and introduces natural exhaustion.
   High-intensity emotions (level-up, excitement) cost more.
   After repeated peaks, the companion enters reduced expressiveness.

   Fatigue: 0–100. Above 70 = reduced. Above 90 = exhausted.
   Recovery: 3 points/min naturally, faster during calm/silence.

   This makes emotional moments feel rarer and more meaningful.
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_EMOTIONAL_FATIGUE__) return;
window.__ZAP_EMOTIONAL_FATIGUE__ = true;

var _fatigue   = 0;
var _MAX       = 100;
var _REGEN     = 3;     /* per 60s tick */

/* Cost per emotion */
var COSTS = {
  levelup:  35,
  excited:  20,
  happy:    10,
  curious:   5,
  idle:      0,
  sleepy:   -5,   /* calm actually recovers fatigue */
  dreaming:-10
};

var _metrics = { peaks: 0, exhaustedPeriods: 0 };

/* ── Regen tick ────────────────────────────────────────────────*/
function _regen() {
  var delta = _REGEN;
  /* Faster recovery during silence */
  if (window.ZapSilenceModel && ZapSilenceModel.isSilent()) delta += 4;
  /* Faster if in calm state */
  if (window.ZapEmotionModel) {
    var em = ZapEmotionModel.get();
    if (em.current === 'dreaming' || em.current === 'sleepy') delta += 3;
  }
  _fatigue = Math.max(0, _fatigue - delta);
  if (window.NPMetrics) NPMetrics.set('emotionalFatigue', Math.round(_fatigue));
}

/* ── Add fatigue ───────────────────────────────────────────────*/
function addFatigue(emotion) {
  var cost = COSTS[emotion];
  if (cost === undefined) cost = 8;
  _fatigue = Math.min(_MAX, _fatigue + cost);
  if (cost > 15) _metrics.peaks++;
  if (_fatigue >= 90) _metrics.exhaustedPeriods++;
}

/* ── Query ─────────────────────────────────────────────────────*/
function isExhausted()  { return _fatigue >= 90; }
function isReduced()    { return _fatigue >= 70; }
function getFatigue()   { return Math.round(_fatigue); }

function get() {
  return {
    fatigue:     Math.round(_fatigue),
    isReduced:   isReduced(),
    isExhausted: isExhausted(),
    metrics:     Object.assign({}, _metrics)
  };
}

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;

  NPBus.on('emotion:change', function(d) {
    if (d && d.emotion) addFatigue(d.emotion);
  });
  NPBus.on(NPBus.EV.LEVEL_UP, function() { addFatigue('levelup'); });
  NPBus.on(NPBus.EV.XP_GAIN,  function() { addFatigue('excited'); });
}

function init() {
  _wireEvents();
  if (window.NPClock) {
    NPClock.registerTask(_regen, 60000, { label: 'emotional_fatigue' });
  } else {
    setInterval(_regen, 60000);
  }
  if (window.NP_DEBUG) console.info('[ZapEmotionalFatigue] ready');
}

window.ZapEmotionalFatigue = { init: init, addFatigue: addFatigue, isExhausted: isExhausted, isReduced: isReduced, getFatigue: getFatigue, get: get };

}(window));
