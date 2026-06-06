;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R18 — ZapPresenceDensity.js
   Tracks companion activity density over time and signals when
   the companion is "too present". Other systems check isDense()
   before adding more presence.

   Presence events: speech, ambient action, animation, observation.
   Presence score decays every minute.
   isDense() → true when score > threshold (blocks new actions).

   Thresholds:
     comfortable: 0–60  → normal presence OK
     dense:       61–80 → reduce ambient; allow reactive
     saturated:   81+   → only critical allowed
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_PRESENCE_DENSITY__) return;
window.__ZAP_PRESENCE_DENSITY__ = true;

var _score     = 0;
var _MAX       = 100;
var _DECAY_PER_MIN = 8;   /* per 60s tick */

/* Costs */
var COSTS = {
  speech:      20,
  ambient:     10,
  animation:   5,
  observation: 2
};

var _metrics = { totalEvents: 0, denseBlocks: 0 };

/* ── Decay tick ────────────────────────────────────────────────*/
function _decay() {
  _score = Math.max(0, _score - _DECAY_PER_MIN);
  if (window.NPMetrics) NPMetrics.set('presenceDensity', Math.round(_score));
}

/* ── Record presence ───────────────────────────────────────────*/
function record(type) {
  var cost = COSTS[type] || 5;
  _score   = Math.min(_MAX, _score + cost);
  _metrics.totalEvents++;
}

function recordObservation() { record('observation'); }
function recordSpeech()      { record('speech'); }
function recordAmbient()     { record('ambient'); }

/* ── Query ─────────────────────────────────────────────────────*/
function isDense() {
  if (_score > 80) { _metrics.denseBlocks++; return true; }
  return false;
}

function isComfortable() { return _score <= 60; }
function getScore()      { return Math.round(_score); }

function get() {
  return {
    score:         Math.round(_score),
    isDense:       isDense(),
    isComfortable: isComfortable(),
    metrics:       Object.assign({}, _metrics)
  };
}

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;
  NPBus.on('zap:speak',        recordSpeech);
  NPBus.on(NPBus.EV.LEVEL_UP,  function() { _score = Math.max(0, _score - 15); }); /* level-up naturally clears some pressure */
  NPBus.on('runtime:resume',   function() { _score = Math.max(0, _score - 20); }); /* tab return: reset some density */
}

function init() {
  _wireEvents();
  if (window.NPClock) {
    NPClock.registerTask(_decay, 60000, { label: 'presence_density' });
  } else {
    setInterval(_decay, 60000);
  }
  if (window.NP_DEBUG) console.info('[ZapPresenceDensity] ready');
}

window.ZapPresenceDensity = { init: init, record: record, recordObservation: recordObservation, recordSpeech: recordSpeech, recordAmbient: recordAmbient, isDense: isDense, isComfortable: isComfortable, getScore: getScore, get: get };

}(window));
