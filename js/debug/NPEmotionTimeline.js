;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPEmotionTimeline.js
   Circular buffer of emotion transitions. Detects instability:
   oscillation (same pair flipping rapidly), loops (A→B→A→B),
   abrupt jumps (momentum too low for transition speed).

   Max 200 entries. Oscillation detection window: last 6 transitions.
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_EMOTION_TIMELINE__) return;
window.__NP_EMOTION_TIMELINE__ = true;

var _TIMELINE = [];
var _MAX      = 200;
var _last     = null;

var _stability = {
  oscillations: 0,
  abruptJumps:  0,
  longestRun:   0,
  currentRun:   0,
  currentEmo:   null
};

/* ── Record a transition ───────────────────────────────────────*/
function record(from, to, momentum, cause) {
  if (from === to) return; /* not a real transition */

  var entry = {
    ts:       typeof performance !== 'undefined' ? Math.round(performance.now()) : Date.now(),
    from:     from,
    to:       to,
    momentum: momentum || 0,
    cause:    cause || 'decay',
    fatigue:  window.ZapEmotionalFatigue ? ZapEmotionalFatigue.getFatigue() : 0
  };

  _TIMELINE.push(entry);
  if (_TIMELINE.length > _MAX) _TIMELINE.shift();

  /* Run tracking */
  if (to === _stability.currentEmo) {
    _stability.currentRun++;
  } else {
    if (_stability.currentRun > _stability.longestRun) _stability.longestRun = _stability.currentRun;
    _stability.currentRun = 1;
    _stability.currentEmo = to;
  }

  /* Oscillation detection: last 6 transitions */
  var tail = _TIMELINE.slice(-6);
  if (tail.length >= 4) {
    var pairs = tail.map(function(e) { return e.from + '→' + e.to; });
    var first  = pairs[0];
    var osc = pairs.filter(function(p) { return p === first; }).length;
    if (osc >= 3) {
      _stability.oscillations++;
      if (window.NP_DEBUG) console.warn('[EmotionTimeline] oscillation detected:', first);
      if (window.NPDecisionTrace) {
        NPDecisionTrace.record({ source: 'EmotionTimeline', action: 'oscillation_detected', accepted: false, reasons: [first] });
      }
    }
  }

  /* Abrupt jump: low momentum, big change */
  if (momentum < 0.1 && from !== 'idle' && to !== 'idle') {
    _stability.abruptJumps++;
  }

  _last = entry;
}

/* ── Get oscillation score 0–100 (higher = more unstable) ─────*/
function getOscillationScore() {
  if (_TIMELINE.length < 10) return 0;
  /* Count pairs in last 20 transitions */
  var tail   = _TIMELINE.slice(-20);
  var counts = {};
  tail.forEach(function(e) {
    var k = e.from + '→' + e.to;
    counts[k] = (counts[k] || 0) + 1;
  });
  var maxRepeat = Object.keys(counts).reduce(function(m, k) { return Math.max(m, counts[k]); }, 0);
  return Math.min(100, maxRepeat * 15);
}

function getLast(n)   { return _TIMELINE.slice(-(n || 10)); }
function getStability(){ return Object.assign({}, _stability, { oscillationScore: getOscillationScore() }); }

/* ── Hook ZapEmotionModel ──────────────────────────────────────*/
function _hookEmotionModel() {
  if (!window.ZapEmotionModel) return;
  var _origPush = ZapEmotionModel.push;
  ZapEmotionModel.push = function(emo, force) {
    var before = ZapEmotionModel.get().current;
    _origPush.call(this, emo, force);
    /* Record if current changed after push */
    setTimeout(function() {
      var after = ZapEmotionModel.get().current;
      if (after !== before) record(before, after, force, 'push');
    }, 130); /* after decay tick */
  };
}

function init() {
  _hookEmotionModel();
  if (window.NP_DEBUG) console.info('[NPEmotionTimeline] ready');
}

window.NPEmotionTimeline = { init: init, record: record, getLast: getLast, getStability: getStability, getOscillationScore: getOscillationScore };

}(window));