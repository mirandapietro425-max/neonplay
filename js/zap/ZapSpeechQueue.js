;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R17 — ZapSpeechQueue.js
   Priority speech queue with categories, anti-repetition memory,
   and context-aware pacing. Integrates with ZapSpeech.say().

   Does NOT replace ZapSpeech — it wraps and enriches it.
   All calls still go through zapSpeak / ZapSpeech.say().

   Speech categories (priority order):
     ambient    (1) — background observations
     reactive   (3) — game click, genre comment
     emotional  (5) — mood-driven
     important  (8) — quest complete, level-up flavour
     system     (10)— critical UI messages

   Anti-repetition: each message id has a per-category cooldown.
   Messages without an id get a hash cooldown (no exact repeats).

   API:
     ZapSpeechQueue.enqueue(msg, opts)   → void
       opts: { category, id, cooldown, force }
     ZapSpeechQueue.canSpeak(id, cool)   → bool
     ZapSpeechQueue.clearOverflow()      → void  (called on wake)
     ZapSpeechQueue.isSuppressed()       → bool
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_SPEECH_QUEUE__) return;
window.__ZAP_SPEECH_QUEUE__ = true;

/* ── Priority map ───────────────────────────────────────────── */
var PRIORITY = {
  ambient:   1,
  reactive:  3,
  emotional: 5,
  important: 8,
  system:    10
};

/* Default cooldowns per category (ms) */
var COOLDOWN = {
  ambient:   180000,  /* 3 min */
  reactive:  45000,   /* 45s   */
  emotional: 30000,   /* 30s   */
  important: 20000,   /* 20s   */
  system:    5000     /* 5s    */
};

/* ── Anti-repetition memory (snippet #7) ────────────────────── */
var _recentMessages = {};   /* id/hash → timestamp */

function _hash(str) {
  /* Simple djb2 hash for msgs without an explicit id */
  var h = 5381;
  for (var i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return 'h' + (h >>> 0).toString(36);
}

function canSpeak(id, cooldownMs) {
  var now = Date.now();
  var last = _recentMessages[id] || 0;
  if (now - last < (cooldownMs || 30000)) return false;
  _recentMessages[id] = now;
  return true;
}

/* ── Internal queue ─────────────────────────────────────────── */
var _q = [];   /* [{ msg, priority, category, id, force }] */

function _sortQueue() {
  _q.sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); });
}

/* ── enqueue ────────────────────────────────────────────────── */
function enqueue(msg, opts) {
  if (!msg) return;
  opts = opts || {};

  var cat      = opts.category || 'reactive';
  var priority = PRIORITY[cat] || 3;
  var id       = opts.id || _hash(msg);
  var cool     = opts.cooldown !== undefined ? opts.cooldown : (COOLDOWN[cat] || 30000);

  /* Force bypasses cooldown and queue limits */
  if (!opts.force) {
    /* Cooldown check */
    var now = Date.now();
    var last = _recentMessages[id] || 0;
    if (now - last < cool) return;

    /* NPRuntimeGuard speech gate */
    if (window.NPRuntimeGuard && !NPRuntimeGuard.isSpeechAllowed()) return;

    /* Performance degraded — allow only important/system */
    if (window.NPPerformanceBudget && NPPerformanceBudget.get().degraded) {
      if (priority < PRIORITY.important) return;
    }
  }

  /* Mark used */
  _recentMessages[id] = Date.now();

  /* Push into priority queue */
  _q.push({ msg: msg, priority: priority, category: cat, id: id });
  _sortQueue();

  /* Limit queue depth per category */
  var catCount = _q.filter(function(i){ return i.category === cat; }).length;
  if (catCount > 2 && cat !== 'system' && cat !== 'important') {
    /* Drop lowest priority item in that category */
    for (var i = _q.length - 1; i >= 0; i--) {
      if (_q[i].category === cat) { _q.splice(i, 1); break; }
    }
  }

  /* Flush to ZapSpeech */
  _flush();
}

/* ── Flush: send top item to ZapSpeech if not speaking ──────── */
function _flush() {
  /* R18: silence model gate (non-critical) */
  if (window.ZapSilenceModel && ZapSilenceModel.isSilent()) {
    var top = _q[0];
    if (!top || top.category !== 'critical') return;
  }
  if (window.ZapPresenceDensity) ZapPresenceDensity.recordSpeech();
  if (!_q.length) return;
  if (window.ZapSpeech && ZapSpeech.isSpeaking()) return; /* let ZapSpeech drain naturally */

  var item = _q.shift();
  if (window.ZapSpeech) {
    ZapSpeech.say(item.msg, { force: item.priority >= PRIORITY.system });
  } else if (window.zapSpeak) {
    window.zapSpeak(item.msg);
  }

  if (window.NPRuntimeGuard) NPRuntimeGuard.registerSpeech();
  if (window.NPMetrics) NPMetrics.set('speechBacklog', _q.length);
}

/* ── clearOverflow — called on runtime:resume ───────────────── */
function clearOverflow() {
  /* Drop ambient items accumulated while page was hidden */
  var before = _q.length;
  _q = _q.filter(function(i){ return i.priority >= PRIORITY.emotional; });
  if (window.NP_DEBUG && before !== _q.length) {
    console.info('[ZapSpeechQueue] cleared', before - _q.length, 'ambient items after wake');
  }
  if (window.NPMetrics) NPMetrics.set('speechBacklog', _q.length);
}

function isSuppressed() {
  return window.NPRuntimeGuard ? !NPRuntimeGuard.isSpeechAllowed() : false;
}

/* ── Drain timer: if ZapSpeech finishes, check our queue ────── */
function _startDrainWatch() {
  if (window.NPClock) {
    NPClock.registerTask(function() {
      if (_q.length && window.ZapSpeech && !ZapSpeech.isSpeaking()) _flush();
    }, 600, { label: 'speech_queue_drain' });
  } else {
    setInterval(function() {
      if (_q.length && window.ZapSpeech && !ZapSpeech.isSpeaking()) _flush();
    }, 600);
  }
}

/* ── Wire runtime:resume ─────────────────────────────────────── */
function init() {
  _startDrainWatch();
  if (window.NPBus) {
    NPBus.on('runtime:resume', clearOverflow);
  }
  if (window.NP_DEBUG) console.info('[ZapSpeechQueue] ready');
}

window.ZapSpeechQueue = {
  enqueue:        enqueue,
  canSpeak:       canSpeak,
  clearOverflow:  clearOverflow,
  isSuppressed:   isSuppressed,
  PRIORITY:       PRIORITY,
  init:           init,
  getQueueLength: function() { return _q.length; }
};

/* ── Patch zapSpeak global to route through ZapSpeechQueue ──── */
/* Preserves backwards compat — init.js uses zapSpeak() directly */
/* We only patch AFTER init so the original ZapSpeech.say is ready */
function _patchZapSpeak() {
  var _origZapSpeak = window.zapSpeak;
  window.zapSpeak = function(msg, delay) {
    /* Route non-critical through queue; urgent (delay<0) bypass */
    if (delay === -1) {
      if (_origZapSpeak) _origZapSpeak(msg);
      return;
    }
    enqueue(msg, { category: 'reactive', cooldown: 8000 });
  };
  /* Provide escape hatch for direct delivery */
  window.zapSpeakDirect = _origZapSpeak || function(m){ if(window.ZapSpeech) ZapSpeech.say(m); };
}

/* Patch after DOM is fully loaded so ZapSpeech.say is defined */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _patchZapSpeak);
} else {
  setTimeout(_patchZapSpeak, 100);
}

}(window));