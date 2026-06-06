;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R17 — NPPerformanceBudget.js
   FPS monitor + runtime self-regulation.
   When FPS drops, ambient frequency and FX density auto-reduce.
   Degradation is invisible — UX never breaks.

   Thresholds:
     fps < 45 → reducedFX    (glow updates throttled, animations minimal)
     fps < 35 → reducedAmbient (ambient events paused, pulse disabled)
     fps < 25 → degraded     (only critical speech + idle state)

   API:
     NPPerformanceBudget.get()         → { fps, reducedFX, reducedAmbient, degraded }
     NPPerformanceBudget.safeDelta()   → number ms (long-session safe delta)
     NPPerformanceBudget.isReduced()   → bool (any degradation active)
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_PERF_BUDGET__) return;
window.__NP_PERF_BUDGET__ = true;

var _budget = {
  fps:            60,
  fpsSmoothed:    60,
  reducedFX:      false,
  reducedAmbient: false,
  degraded:       false
};

var _frames  = 0;
var _last    = (typeof performance !== 'undefined') ? performance.now() : Date.now();
var _running = false;

/* ── Long-session delta protection (snippet #9) ─────────────── */
var _lastTick = (typeof performance !== 'undefined') ? performance.now() : Date.now();

function safeDelta() {
  var n   = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  var d   = n - _lastTick;
  _lastTick = n;
  /* Cap delta to 16ms equivalent if gap > 5s (tab was backgrounded) */
  return d > 5000 ? 16 : d;
}

/* ── rAF loop ───────────────────────────────────────────────── */
function _loop() {
  _frames++;
  var now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  if (now - _last >= 1000) {
    _budget.fps = _frames;
    /* EMA smoothing — avoids single-frame spikes causing thrash */
    _budget.fpsSmoothed = Math.round(_budget.fpsSmoothed * 0.7 + _frames * 0.3);
    _frames = 0;
    _last   = now;

    var fps = _budget.fpsSmoothed;
    _budget.reducedFX      = fps < 45;
    _budget.reducedAmbient = fps < 35;
    _budget.degraded       = fps < 25;

    /* Push to NPMetrics if available */
    if (window.NPMetrics) NPMetrics.set('fps', fps);

    /* Notify NPBus on mode change */
    if (window.NPBus && (_budget.reducedAmbient || _budget.degraded)) {
      NPBus.emit('perf:degraded', { fps: fps, reducedAmbient: _budget.reducedAmbient, degraded: _budget.degraded });
    }
  }

  requestAnimationFrame(_loop);
}

function get() {
  return {
    fps:            _budget.fps,
    fpsSmoothed:    _budget.fpsSmoothed,
    reducedFX:      _budget.reducedFX,
    reducedAmbient: _budget.reducedAmbient,
    degraded:       _budget.degraded
  };
}

function isReduced() {
  return _budget.reducedFX || _budget.reducedAmbient || _budget.degraded;
}

function init() {
  if (_running) return;
  _running = true;
  requestAnimationFrame(_loop);

  /* Wire perf:degraded → throttle ambient events */
  if (window.NPBus) {
    NPBus.on('perf:degraded', function(d) {
      if (window.NP_DEBUG) console.info('[NPPerformanceBudget] degraded mode fps=' + d.fps);
    });
  }
}

window.NPPerformanceBudget = { get: get, safeDelta: safeDelta, isReduced: isReduced, init: init };

}(window));