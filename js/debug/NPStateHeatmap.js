;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPStateHeatmap.js
   Lightweight frequency monitor for companion states.
   Tracks: hits, time-in-state, transitions, blocked attempts.

   Provides a compact ASCII heatmap for the debug overlay
   and structured data for NPBehaviorStability scoring.
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_STATE_HEATMAP__) return;
window.__NP_STATE_HEATMAP__ = true;

var _states      = {};          /* { stateName: { hits, totalMs, lastEnter } } */
var _transitions = {};          /* 'A→B': count */
var _blocked     = {};          /* 'A→B': count of invalid attempts */
var _current     = null;
var _enterAt     = 0;

/* ── Touch a state (increment hit counter) ─────────────────────*/
function touchState(name) {
  if (!_states[name]) _states[name] = { hits: 0, totalMs: 0, lastEnter: 0 };
  _states[name].hits++;
  _states[name].lastEnter = Date.now();
}

/* ── Record entering a state (for time tracking) ───────────────*/
function enterState(name) {
  /* Close previous */
  if (_current && _enterAt) {
    var elapsed = Date.now() - _enterAt;
    if (_states[_current]) _states[_current].totalMs += elapsed;
  }

  touchState(name);
  _current = name;
  _enterAt = Date.now();
}

/* ── Record a transition ───────────────────────────────────────*/
function recordTransition(from, to) {
  var key = (from || '?') + '→' + to;
  _transitions[key] = (_transitions[key] || 0) + 1;
}

/* ── Record a blocked/invalid transition attempt ───────────────*/
function recordBlocked(from, to, reason) {
  var key = (from || '?') + '→' + to;
  _blocked[key] = (_blocked[key] || 0) + 1;
  if (window.NP_DEBUG) console.info('[NPStateHeatmap] blocked:', key, reason || '');
}

/* ── Get top N states by hits ─────────────────────────────────*/
function getTopStates(n) {
  return Object.keys(_states)
    .map(function(k) {
      var s = _states[k];
      return { name: k, hits: s.hits, totalMs: s.totalMs };
    })
    .sort(function(a, b) { return b.hits - a.hits; })
    .slice(0, n || 8);
}

/* ── ASCII heatmap (max 6 states) ──────────────────────────────*/
function getHeatmapText() {
  var top  = getTopStates(6);
  if (!top.length) return '(no state data)';

  var maxHits = top[0].hits || 1;
  var BAR = '████████████████████';
  var lines = top.map(function(s) {
    var pct   = s.hits / maxHits;
    var bLen  = Math.round(pct * 10);
    var bar   = BAR.substring(0, bLen * 2);          /* 2 chars per block (emoji width) */
    var tSec  = Math.round(s.totalMs / 1000);
    return (s.name + '          ').substring(0, 12) + bar + ' ' + s.hits + 'x / ' + tSec + 's';
  });

  return lines.join('\n');
}

/* ── Stats object ──────────────────────────────────────────────*/
function getStats() {
  var blockedTotal = Object.values(_blocked).reduce(function(a, b) { return a + b; }, 0);
  var transTotal   = Object.values(_transitions).reduce(function(a, b) { return a + b; }, 0);
  return {
    states:       _states,
    transitions:  _transitions,
    blocked:      _blocked,
    blockedTotal: blockedTotal,
    transTotal:   transTotal,
    current:      _current
  };
}

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;
  var B = window.NPBus;

  B.on('zap:state_change', function(d) {
    if (!d) return;
    enterState(d.current);
    if (d.previous) recordTransition(d.previous, d.current);
  });

  B.on('zap:state_blocked', function(d) {
    if (d) recordBlocked(d.from, d.to, d.reason);
  });
}

function init() {
  _wireEvents();
  if (window.NP_DEBUG) console.info('[NPStateHeatmap] ready');
}

window.NPStateHeatmap = {
  init:              init,
  touchState:        touchState,
  enterState:        enterState,
  recordTransition:  recordTransition,
  recordBlocked:     recordBlocked,
  getTopStates:      getTopStates,
  getHeatmapText:    getHeatmapText,
  getStats:          getStats
};

}(window));
