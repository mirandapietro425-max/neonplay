;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R17 — NPRuntimeGuard.js
   Runtime stability layer. Detects floods/spam, provides soft
   recovery strategies, wraps risky calls safely.

   NEVER touches UX visibly — only logs in NP_DEBUG mode.

   API:
     NPRuntimeGuard.safe(fn, fallbackFn?)     → result | undefined
     NPRuntimeGuard.registerEvent()           → void (flood check)
     NPRuntimeGuard.registerSpeech()          → bool (true = allowed)
     NPRuntimeGuard.getCounters()             → counters snapshot
     NPRuntimeGuard.withFallback(fn, fb)      → result (alias)
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_RUNTIME_GUARD__) return;
window.__NP_RUNTIME_GUARD__ = true;

var WINDOW_MS   = 5000;  /* rolling window for counter reset  */
var MAX_EVENTS  = 250;   /* event threshold per window        */
var MAX_SPEECH  = 40;    /* speech threshold per window       */
var MAX_AMBIENT = 8;     /* ambient event threshold per window */

var _counters = {
  events:  0,
  speech:  0,
  ambient: 0,
  errors:  0,
  recoveries: 0
};

var _lastReset = (typeof performance !== 'undefined') ? performance.now() : Date.now();
var _speechSuppressed = false;
var _ambientSuppressed = false;

/* ── Rolling window reset ───────────────────────────────────── */
function _tick() {
  var now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  if (now - _lastReset > WINDOW_MS) {
    _counters.events  = 0;
    _counters.speech  = 0;
    _counters.ambient = 0;
    _lastReset        = now;
    /* Lift suppressions when counters clear */
    _speechSuppressed  = false;
    _ambientSuppressed = false;
  }
}

/* ── Event flood check ─────────────────────────────────────── */
function registerEvent() {
  _tick();
  _counters.events++;
  if (_counters.events > MAX_EVENTS) {
    if (window.NP_DEBUG) console.warn('[NPRuntimeGuard] event flood detected', _counters.events);
  }
}

/* ── Speech flood check ────────────────────────────────────── */
/* Returns false when speech should be suppressed */
function registerSpeech() {
  _tick();
  _counters.speech++;
  if (_counters.speech > MAX_SPEECH) {
    _speechSuppressed = true;
    if (window.NP_DEBUG) console.warn('[NPRuntimeGuard] speech flood — suppressing', _counters.speech);
    return false;
  }
  return true;
}

/* ── Ambient event gate ─────────────────────────────────────── */
function registerAmbient() {
  _tick();
  _counters.ambient++;
  if (_counters.ambient > MAX_AMBIENT) {
    _ambientSuppressed = true;
    if (window.NP_DEBUG) console.warn('[NPRuntimeGuard] ambient flood — suppressing');
    return false;
  }
  return true;
}

/* ── Safe wrapper — swallows errors silently ────────────────── */
function safe(fn, fallbackFn) {
  try {
    return fn();
  } catch(err) {
    _counters.errors++;
    if (window.NP_DEBUG) console.error('[NPRuntimeGuard] caught error:', err);
    if (typeof fallbackFn === 'function') {
      try { return fallbackFn(); } catch(e2) {}
    }
  }
}

/* Alias */
var withFallback = safe;

/* ── Soft recovery strategies ───────────────────────────────── */
/* Called by NPClock or boot guard on wake/resume events        */
function recoverAfterSleep() {
  _counters.recoveries++;

  /* Clear stale speech queue overflow */
  if (window.ZapSpeech) {
    try {
      var q = ZapSpeech._queue();
      if (q.length > 2) {
        ZapSpeech.cancel();
        if (window.NP_DEBUG) console.info('[NPRuntimeGuard] cleared speech queue overflow after sleep');
      }
    } catch(e) {}
  }

  /* Reset StateCoordinator lock if it was stuck */
  if (window.ZapStateCoordinator) {
    try {
      var st = ZapStateCoordinator.getState();
      /* If locked for more than 15s, something went wrong — release */
      var now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      if (st.lockedUntil && (st.lockedUntil - now) > 15000) {
        ZapStateCoordinator.forceState('idle');
        if (window.NP_DEBUG) console.info('[NPRuntimeGuard] released stale state lock after sleep');
      }
    } catch(e) {}
  }

  /* Reset flood counters after wake so we don't suppress normal activity */
  _counters.events  = 0;
  _counters.speech  = 0;
  _counters.ambient = 0;
  _lastReset = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  _speechSuppressed  = false;
  _ambientSuppressed = false;
}

/* ── isSpeechAllowed / isAmbientAllowed ─────────────────────── */
function isSpeechAllowed()  { _tick(); return !_speechSuppressed; }
function isAmbientAllowed() { _tick(); return !_ambientSuppressed; }

function getCounters() { return Object.assign({}, _counters); }

window.NPRuntimeGuard = {
  safe:              safe,
  withFallback:      withFallback,
  registerEvent:     registerEvent,
  registerSpeech:    registerSpeech,
  registerAmbient:   registerAmbient,
  isSpeechAllowed:   isSpeechAllowed,
  isAmbientAllowed:  isAmbientAllowed,
  recoverAfterSleep: recoverAfterSleep,
  getCounters:       getCounters
};

}(window));