;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPIntentVisualizer.js
   Tracks intents produced by ZapBehaviorDirector, showing:
   - current intent + time remaining
   - history of last 20 intents
   - suppression reasons for each decision
   - a formatted summary string for the debug overlay

   Only active when NP_DEBUG is true (zero prod overhead).
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_INTENT_VISUALIZER__) return;
window.__NP_INTENT_VISUALIZER__ = true;

var _current   = { intent: 'none', since: 0, expiresAt: 0 };
var _history   = [];            /* last 20 */
var _HIST_MAX  = 20;

var _suppressed = [];           /* rolling 10 suppression reasons */
var _SUPP_MAX   = 10;

/* ── Record intent change ──────────────────────────────────────*/
function recordIntent(intent, durationMs, reason) {
  var now = Date.now();

  /* Archive previous */
  if (_current.intent !== 'none') {
    _history.push({
      intent:    _current.intent,
      since:     _current.since,
      until:     now,
      durationMs: now - _current.since
    });
    if (_history.length > _HIST_MAX) _history.shift();
  }

  _current = { intent: intent, since: now, expiresAt: now + (durationMs || 0), reason: reason || '' };
}

/* ── Record a suppressed speech/action ─────────────────────────*/
function recordSuppression(action, reasons) {
  var entry = {
    ts:     Date.now(),
    action: action,
    why:    Array.isArray(reasons) ? reasons : [reasons]
  };
  _suppressed.push(entry);
  if (_suppressed.length > _SUPP_MAX) _suppressed.shift();
}

/* ── Current intent snapshot ───────────────────────────────────*/
function getCurrent() {
  var now = Date.now();
  return {
    intent:      _current.intent,
    sinceMs:     now - _current.since,
    remainingMs: Math.max(0, _current.expiresAt - now),
    reason:      _current.reason
  };
}

/* ── Summary string for debug overlay ─────────────────────────*/
function getSummary() {
  var cur   = getCurrent();
  var remS  = Math.round(cur.remainingMs / 1000);
  var lines = [];

  lines.push('intent: ' + cur.intent + (remS > 0 ? ' (' + remS + 's)' : ''));

  /* Last 3 suppressions */
  var recent = _suppressed.slice(-3);
  recent.forEach(function(s) {
    lines.push('  ↳ ' + s.action + ' suppressed: ' + s.why.join(' + '));
  });

  /* Previous intent */
  if (_history.length) {
    var prev = _history[_history.length - 1];
    lines.push('prev: ' + prev.intent + ' (' + Math.round(prev.durationMs / 1000) + 's)');
  }

  return lines.join('\n');
}

/* ── Full report ───────────────────────────────────────────────*/
function getReport() {
  return {
    current:    getCurrent(),
    history:    _history.slice(),
    suppressed: _suppressed.slice()
  };
}

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;
  var B = window.NPBus;

  B.on('zap:intent_change', function(d) {
    if (d && d.intent) recordIntent(d.intent, d.durationMs, d.reason);
  });

  B.on('zap:speech_suppressed', function(d) {
    if (d) recordSuppression(d.action || 'speech', d.reasons || ['unknown']);
  });
}

function init() {
  _wireEvents();
  if (window.NP_DEBUG) console.info('[NPIntentVisualizer] ready');
}

window.NPIntentVisualizer = {
  init:              init,
  recordIntent:      recordIntent,
  recordSuppression: recordSuppression,
  getCurrent:        getCurrent,
  getSummary:        getSummary,
  getReport:         getReport
};

}(window));
