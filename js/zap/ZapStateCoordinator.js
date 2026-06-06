;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R17 — ZapStateCoordinator.js
   Central authority for all Zap behavioral states.
   Modules request state changes here; coordinator arbitrates.

   States mirror ZapAnimator STATES + 'speaking' from ZapSpeech.
   Nothing sets ZapAnimator.setState() directly without going
   through here EXCEPT ZapAnimator's own internal NPBus hooks
   (those are low-risk reactive, not coordinator-driven).

   Priority (higher = wins):
     dreaming(1) idle(2) sleepy(2) curious(3) happy(4)
     speaking(5) excited(6) levelup(7) critical(10)

   Transition map: which states can follow which.
   Locks: a state can lock transitions for a duration (ms).

   API:
     ZapStateCoordinator.request(state, opts)  → bool
     ZapStateCoordinator.getState()            → { current, previous, lockedUntil, priority }
     ZapStateCoordinator.canTransition(next)   → bool
     ZapStateCoordinator.forceState(state)     → void   (bypasses all checks)
     ZapStateCoordinator.lock(ms)              → void   (lock current state)
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_STATE_COORDINATOR__) return;
window.__ZAP_STATE_COORDINATOR__ = true;

/* ── Priority table ─────────────────────────────────────────── */
var PRIORITY = {
  dreaming: 1,
  sleepy:   2,
  idle:     2,
  curious:  3,
  happy:    4,
  speaking: 5,
  excited:  6,
  levelup:  7,
  critical: 10
};

/* ── Valid transitions map ──────────────────────────────────── */
/* Key: current state → array of allowed next states           */
var TRANSITIONS = {
  dreaming: ['idle', 'speaking', 'levelup', 'critical'],
  sleepy:   ['idle', 'speaking', 'dreaming', 'levelup', 'critical'],
  idle:     ['curious', 'happy', 'sleepy', 'speaking', 'excited', 'levelup', 'critical'],
  curious:  ['idle', 'speaking', 'happy', 'excited', 'levelup', 'critical'],
  happy:    ['idle', 'speaking', 'excited', 'levelup', 'critical'],
  speaking: ['idle', 'happy', 'excited', 'levelup', 'critical'],
  excited:  ['idle', 'speaking', 'levelup', 'critical'],
  levelup:  ['idle', 'excited', 'critical'],
  critical: ['idle']
};

/* ── State ──────────────────────────────────────────────────── */
var _st = {
  current:     'idle',
  previous:    null,
  lockedUntil: 0,
  priority:    PRIORITY.idle
};

/* ── Lock timer handle ─────────────────────────────────────── */
var _lockTimer = null;

/* ── Helpers ────────────────────────────────────────────────── */
function _now() { return (typeof performance !== 'undefined') ? performance.now() : Date.now(); }

function canTransition(next) {
  if (_now() < _st.lockedUntil) return false;
  var allowed = TRANSITIONS[_st.current];
  if (!allowed) return true; /* unknown current state — allow */
  return allowed.indexOf(next) !== -1;
}

/* ── request(state, opts) ───────────────────────────────────── */
/* opts: { force, lockMs, duration, source }                    */
function request(state, opts) {
  if (!state) return false;
  opts = opts || {};

  var incoming = PRIORITY[state] || 0;

  /* Respect priority lock */
  if (!opts.force) {
    if (incoming < _st.priority && _st.current !== 'idle' && _st.current !== 'sleepy' && _st.current !== 'dreaming') {
      if (window.NPBus) NPBus.emit('zap:state_blocked', { from: _st.current, to: state, reason: 'priority_lock' });
      if (window.NPStateHeatmap) NPStateHeatmap.recordBlocked(_st.current, state, 'priority_lock');
      return false;
    }
    if (!canTransition(state)) {
      if (window.NPBus) NPBus.emit('zap:state_blocked', { from: _st.current, to: state, reason: 'invalid_transition' });
      if (window.NPStateHeatmap) NPStateHeatmap.recordBlocked(_st.current, state, 'invalid_transition');
      return false;
    }
  }

  var prev    = _st.current;
  _st.previous = prev;
  _st.current  = state;
  _st.priority = incoming;

  if (opts.lockMs && opts.lockMs > 0) {
    _st.lockedUntil = _now() + opts.lockMs;
    clearTimeout(_lockTimer);
    _lockTimer = setTimeout(function() { _st.lockedUntil = 0; }, opts.lockMs + 50);
  }

  /* Propagate to ZapAnimator if available */
  if (window.ZapAnimator) {
    ZapAnimator.setState(state, { force: !!opts.force, duration: opts.duration });
  }

  /* Emit on NPBus */
  if (window.NPBus) {
    NPBus.emit('zap:state_change', { current: state, previous: prev, source: opts.source || 'coordinator' });
  }

  if (window.NP_DEBUG) console.info('[ZapStateCoordinator]', prev, '->', state, opts.source || '');
  return true;
}

/* ── forceState — bypass all checks (system use only) ───────── */
function forceState(state) {
  return request(state, { force: true, source: 'force' });
}

/* ── lock current state for ms ──────────────────────────────── */
function lock(ms) {
  _st.lockedUntil = _now() + (ms || 1000);
  clearTimeout(_lockTimer);
  _lockTimer = setTimeout(function() { _st.lockedUntil = 0; }, (ms || 1000) + 50);
}

function getState() {
  return { current: _st.current, previous: _st.previous, lockedUntil: _st.lockedUntil, priority: _st.priority };
}

/* ── Wire critical NPBus events ─────────────────────────────── */
/* Only wire high-priority ones — ambient/mood use ZapAnimator directly */
function _wireEvents() {
  if (!window.NPBus) return;
  NPBus.on(NPBus.EV.LEVEL_UP, function() {
    request('levelup', { force: true, lockMs: 6000, duration: 6000, source: 'level_up' });
  });
  /* Speech start/end — mark speaking state */
  NPBus.on(NPBus.EV.SPEAK, function() {
    request('speaking', { lockMs: 4800, source: 'speech' });
  });
  /* Runtime resume after tab switch — safe fallback to idle */
  NPBus.on('runtime:resume', function() {
    if (_st.current === 'speaking') forceState('idle');
    _st.lockedUntil = 0;
  });
}

window.ZapStateCoordinator = {
  request:       request,
  forceState:    forceState,
  canTransition: canTransition,
  lock:          lock,
  getState:      getState,
  PRIORITY:      PRIORITY,
  init: function() { _wireEvents(); if (window.NP_DEBUG) console.info('[ZapStateCoordinator] ready'); }
};

}(window));