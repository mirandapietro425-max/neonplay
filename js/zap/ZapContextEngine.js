;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R17 — ZapContextEngine.js
   Detects session context and generates dynamic tags consumed
   by ZapDialogueEngine, ZapAmbientEvents, and ZapPersonalityEngine.

   Context sources:
     - Hour of day
     - Session duration
     - Visit frequency (from ZapMemoryGraph)
     - Days since last visit (from ZapPersonalityEngine / MemoryGraph)
     - Genre focus this session
     - Affinity tier (from ZapAffinity)
     - Performance budget state

   Generates tags like:
     late_night_session · long_session · binge_player
     returning_after_days · long_absence · morning · evening
     horror_focus · arcade_focus · high_energy · calm

   Context refreshes every 60s via NPClock.
   Tags are composable — multiple can be active at once.

   API:
     ZapContextEngine.getTags()              → string[]
     ZapContextEngine.hasTag(tag)            → bool
     ZapContextEngine.getSessionMinutes()    → number
     ZapContextEngine.init()
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_CONTEXT_ENGINE__) return;
window.__ZAP_CONTEXT_ENGINE__ = true;

var _sessionStart = Date.now();
var _tags         = [];
var _taskId       = null;

/* ── Tag computation ─────────────────────────────────────────── */
function _computeTags() {
  var tags = [];
  var now  = Date.now();
  var h    = new Date().getHours();

  /* ── Time of day ── */
  if      (h >= 0  && h < 6)  tags.push('late_night');
  else if (h >= 6  && h < 12) tags.push('morning');
  else if (h >= 12 && h < 18) tags.push('afternoon');
  else                         tags.push('evening');

  /* ── Session duration ── */
  var sessionMins = (now - _sessionStart) / 60000;
  if (sessionMins > 45)  tags.push('long_session');
  if (sessionMins > 120) tags.push('very_long_session');
  if (sessionMins < 5)   tags.push('quick_visit');

  /* ── Absence / frequency (ZapMemoryGraph) ── */
  if (window.ZapMemoryGraph) {
    var summary = ZapMemoryGraph.getSummary();
    var daysSince = summary.daysSinceLast;
    if (typeof daysSince === 'number') {
      if      (daysSince > 14) tags.push('long_absence');
      else if (daysSince > 3)  tags.push('returning');
      else if (daysSince < 1)  tags.push('frequent_visitor');
    }
    /* Binge: > 3 sessions in last 3 days */
    if (summary.totalSessions > 0) {
      var visitTs = (window.ZapMemoryGraph._getVisitTs && ZapMemoryGraph._getVisitTs()) || [];
      var recent = visitTs.filter(function(ts){ return now - ts < 259200000; }).length; /* 3 days */
      if (recent >= 4) tags.push('binge_player');
    }
    /* Genre focus */
    var genre = summary.topGenre;
    if (genre) tags.push(genre + '_focus');
  }

  /* ── Personality-derived energy ── */
  if (window.ZapPersonalityEngine) {
    var energy = ZapPersonalityEngine.getTrait('energy');
    if      (energy > 0.7) tags.push('high_energy');
    else if (energy < 0.35) tags.push('low_energy');

    var calmness = ZapPersonalityEngine.getTrait('calmness');
    if (calmness > 0.7) tags.push('calm');
  }

  /* ── Affinity tier ── */
  if (window.ZapAffinity) {
    tags.push(ZapAffinity.getTier()); /* stranger / acquaintance / friend / companion */
  }

  /* ── Performance ── */
  if (window.NPPerformanceBudget && NPPerformanceBudget.get().degraded) {
    tags.push('perf_degraded');
  }

  _tags = tags;
  if (window.NPMetrics) NPMetrics.set('contextTags', tags.length);
  return tags;
}

function getTags() { return _tags.concat(_injectedTags); }

function hasTag(tag) { return _tags.indexOf(tag) !== -1; }

function getSessionMinutes() { return (Date.now() - _sessionStart) / 60000; }

/* ── Expose visitTs for binge detection (minimal internal API) ─ */
/* ZapMemoryGraph doesn't expose visitTs directly — we access _g if possible */
/* Safer: ZapMemoryGraph can expose it. For now we skip if not available. */

function init() {
  _computeTags(); /* initial */

  /* Refresh every 60s */
  if (window.NPClock) {
    _taskId = NPClock.registerTask(_computeTags, 60000, { label: 'context_engine' });
  } else {
    setInterval(_computeTags, 60000);
  }

  /* Recompute on relevant events */
  if (window.NPBus) {
    NPBus.on(NPBus.EV.GAME_OPEN, _computeTags);
    NPBus.on('runtime:resume',   _computeTags);
  }

  if (window.NP_DEBUG) console.info('[ZapContextEngine] tags:', _tags);
}

var _injectedTags = [];

function injectTags(tags) {
  _injectedTags = tags || [];
}

window.ZapContextEngine = {
  injectTags: injectTags, getTags: getTags, hasTag: hasTag, getSessionMinutes: getSessionMinutes, init: init };

}(window));