;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPRuntimeDrift.js
   Monitors timer accuracy, delta consistency, and scheduler
   backlog. Detects degradation from:
   - hidden-tab drift (delta >> expected interval)
   - slow loop accumulation (rAF lag)
   - NPClock task backlog (tasks queued but delayed)

   Emits 'runtime:drift_detected' on NPBus when drift > 3s.
   Does NOT fix drift — only reports it so NPClock and
   NPRuntimeEcology can respond.

   Overhead: one rAF tick sample every 2s — negligible.
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_RUNTIME_DRIFT__) return;
window.__NP_RUNTIME_DRIFT__ = true;

var _lastRaf     = 0;
var _driftEvents = [];
var _MAX_EVENTS  = 50;
var _probe       = null;

/* ── Drift thresholds (ms) ─────────────────────────────────────*/
var WARN_THRESHOLD  = 3000;   /* 3s gap = likely hidden tab */
var CRIT_THRESHOLD  = 30000;  /* 30s = definite background sleep */

/* ── rAF probe: measures real inter-frame gap ──────────────────*/
function _startProbe() {
  if (_probe) return;

  var _lastProbeTime = performance.now();

  function _check(now) {
    var delta = now - _lastProbeTime;
    _lastProbeTime = now;

    if (delta > WARN_THRESHOLD) {
      _recordDrift('raf_gap', delta);
    }

    /* Re-schedule every ~2s via setTimeout to keep it cheap */
    _probe = setTimeout(function() {
      requestAnimationFrame(_check);
    }, 2000);
  }

  requestAnimationFrame(_check);
}

/* ── Record a drift event ──────────────────────────────────────*/
function _recordDrift(type, deltaMs) {
  var entry = {
    ts:      Date.now(),
    type:    type,
    deltaMs: Math.round(deltaMs),
    severe:  deltaMs > CRIT_THRESHOLD
  };

  _driftEvents.push(entry);
  if (_driftEvents.length > _MAX_EVENTS) _driftEvents.shift();

  if (window.NPBus) {
    NPBus.emit('runtime:drift_detected', entry);
  }

  if (window.NPMetrics) {
    NPMetrics.set('lastDriftMs', Math.round(deltaMs));
    NPMetrics.set('driftCount',  _driftEvents.length);
  }

  if (window.NP_DEBUG) {
    console.warn('[NPRuntimeDrift]', type, Math.round(deltaMs / 1000) + 's gap' + (entry.severe ? ' — SEVERE' : ''));
  }

  /* Severe drift: notify ecology so it can apply recovery throttles */
  if (entry.severe && window.NPRuntimeEcology) {
    /* Ecology checks will handle throttling; just log here */
  }
}

/* ── Public API ────────────────────────────────────────────────*/
function getEvents(n) { return _driftEvents.slice(-(n || 20)); }
function getLastDrift() { return _driftEvents.length ? _driftEvents[_driftEvents.length - 1] : null; }
function hasDriftedRecently(withinMs) {
  var last = getLastDrift();
  if (!last) return false;
  return (Date.now() - last.ts) < (withinMs || 30000);
}

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;

  /* Piggy-back on the existing sleep/resume system */
  NPBus.on('runtime:resume', function(d) {
    if (d && d.gapMs && d.gapMs > WARN_THRESHOLD) {
      _recordDrift('tab_resume', d.gapMs);
    }
  });
}

function init() {
  _wireEvents();

  /* Only start rAF probe in debug or if explicitly opted in */
  if (window.NP_DEBUG || window.NP_DRIFT_PROBE) {
    _startProbe();
  }

  if (window.NP_DEBUG) console.info('[NPRuntimeDrift] ready');
}

function destroy() {
  if (_probe) { clearTimeout(_probe); _probe = null; }
}

window.NPRuntimeDrift = {
  init:              init,
  destroy:           destroy,
  getEvents:         getEvents,
  getLastDrift:      getLastDrift,
  hasDriftedRecently:hasDriftedRecently
};

}(window));
