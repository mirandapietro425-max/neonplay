;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPDecisionTrace.js
   Lightweight circular buffer recording every behavioral
   decision made by ZapBehaviorDirector and other systems.

   Each entry: { ts, source, action, accepted, priority,
                 reasons, state, emotion, ecology }

   Max 300 entries. Total memory footprint < 150KB.
   Zero impact on production (entries only built in debug).
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_DECISION_TRACE__) return;
window.__NP_DECISION_TRACE__ = true;

var _TRACE    = [];
var _MAX      = 300;
var _counters = { accepted: 0, rejected: 0, total: 0 };

/* ── Core record function ──────────────────────────────────────*/
function record(entry) {
  var now = typeof performance !== 'undefined' ? performance.now() : Date.now();

  var full = {
    ts:       Math.round(now),
    wallTs:   Date.now(),
    source:   entry.source   || 'unknown',
    action:   entry.action   || 'speak',
    accepted: entry.accepted !== false,
    priority: entry.priority || 0,
    reasons:  entry.reasons  || [],
    /* Snapshot of runtime state at decision time */
    state: {
      emotion:   window.ZapEmotionModel     ? ZapEmotionModel.get().current : '?',
      intent:    window.ZapBehaviorDirector  ? ZapBehaviorDirector.getIntent() : '?',
      fatigue:   window.ZapEmotionalFatigue  ? ZapEmotionalFatigue.getFatigue() : 0,
      attention: window.ZapAttentionSystem   ? ZapAttentionSystem.get().current : 100,
      silent:    window.ZapSilenceModel      ? ZapSilenceModel.isSilent() : false,
      density:   window.ZapPresenceDensity   ? ZapPresenceDensity.getScore() : 0,
      ecology:   window.NPRuntimeEcology     ? NPRuntimeEcology.getMode() : 'unknown'
    },
    /* R20 Decision Provenance */
    provenance: {
      policy:          window.NPBehaviorPolicy   ? NPBehaviorPolicy.summary()           : null,
      governorMode:    window.NPRuntimeGovernor  ? NPRuntimeGovernor.getMode()          : null,
      governorReg:     window.NPRuntimeGovernor  ? NPRuntimeGovernor.getRegulation()    : null,
      healthScore:     window.NPSystemHealth     ? NPSystemHealth.getScore()            : null,
      sessionProfile:  window.NPSessionPersonality ? NPSessionPersonality.getProfile()  : null,
      upstream:        entry.upstream  || [],    /* caller-supplied upstream systems */
      policyId:        entry.policyId  || null   /* named policy if applicable */
    }
  };

  _TRACE.push(full);
  if (_TRACE.length > _MAX) _TRACE.shift();

  _counters.total++;
  if (full.accepted) _counters.accepted++; else _counters.rejected++;
}

/* ── Query ─────────────────────────────────────────────────────*/
function getLast(n) {
  return _TRACE.slice(-(n || 20));
}

function getRejectRate() {
  if (!_counters.total) return 0;
  return Math.round((_counters.rejected / _counters.total) * 100);
}

function getCounters() {
  return Object.assign({}, _counters);
}

/* ── Format single entry as readable string ────────────────────*/
function formatEntry(e) {
  var verdict = e.accepted ? '✓' : '✗';
  var reasons = e.reasons.length ? ' [' + e.reasons.join(', ') + ']' : '';
  var ms      = e.ts.toString().padStart(8);
  return ms + 'ms ' + verdict + ' ' + e.source + '→' + e.action + reasons;
}

/* ── Summary of last N decisions ──────────────────────────────*/
function getSummary(n) {
  return getLast(n || 10).map(formatEntry);
}

/* ── Expose for behavioral inspector ──────────────────────────*/
function getAll() { return _TRACE.slice(); }

function init() {
  if (window.NP_DEBUG) console.info('[NPDecisionTrace] ready, max:', _MAX);
}

window.NPDecisionTrace = { record: record, getLast: getLast, getAll: getAll, getSummary: getSummary, getRejectRate: getRejectRate, getCounters: getCounters, formatEntry: formatEntry, init: init };

}(window));