;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R18 — ZapBehaviorDirector.js
   Top-level behavioral decision layer. Arbitrates whether the
   Zap should speak, act, observe, or deliberately stay silent.

   Other systems must request permission through this Director
   before emitting speech or ambient behaviors. The Director
   considers: silence windows, attention budget, emotional
   cooldowns, presence density, intent, and runtime ecology.

   API:
     ZapBehaviorDirector.init()
     ZapBehaviorDirector.shouldSpeak(ctx?)    → bool
     ZapBehaviorDirector.shouldActAmbient()   → bool
     ZapBehaviorDirector.requestSpeak(msg, opts?) → bool  (enqueue if allowed)
     ZapBehaviorDirector.observe()            → void  (record silent observation)
     ZapBehaviorDirector.getIntent()          → string
     ZapBehaviorDirector.getMetrics()         → object
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_BEHAVIOR_DIRECTOR__) return;
window.__ZAP_BEHAVIOR_DIRECTOR__ = true;

/* ── Intent states ─────────────────────────────────────────────
   The Director cycles through intents organically.
   Intent shapes how decisions are made.
   ─────────────────────────────────────────────────────────────── */
var INTENTS = ['observe', 'accompany', 'comment', 'celebrate', 'rest', 'wait'];
var _intent       = 'observe';
var _intentUntil  = 0;  /* ms timestamp when intent expires */

/* ── Silence window ────────────────────────────────────────────*/
var _silenceUntil = 0;

/* ── Cooldown tracking ─────────────────────────────────────────*/
var _lastSpoke    = 0;
var _lastAmbient  = 0;
var _speechCount  = 0;  /* in current window */
var _windowStart  = Date.now();
var _WINDOW_MS    = 300000; /* 5-min rolling window */
var _MAX_SPEECH   = 6;     /* max speeches per window */

/* ── Metrics ───────────────────────────────────────────────────*/
var _metrics = {
  silenceDecisions: 0,
  speakDecisions:   0,
  ambientBlocked:   0,
  observeCount:     0
};

/* ── Helpers ───────────────────────────────────────────────────*/
function _now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
function _ts()  { return Date.now(); }

function _windowReset() {
  var now = _ts();
  if (now - _windowStart > _WINDOW_MS) {
    _speechCount = 0;
    _windowStart = now;
  }
}

/* ── Silence API ───────────────────────────────────────────────*/
function enterSilence(ms) {
  _silenceUntil = _now() + (ms || 15000);
}

function isSilent() {
  return _now() < _silenceUntil;
}

/* ── Intent management ─────────────────────────────────────────*/
function _pickIntent() {
  var now = _now();
  if (now < _intentUntil) return; /* current intent still active */

  /* Weight intent selection by context */
  var em   = window.ZapEmotionModel ? ZapEmotionModel.get() : null;
  var perf = window.NPPerformanceBudget ? NPPerformanceBudget.get() : null;

  _windowReset();

  if (perf && perf.reducedAmbient) {
    _intent = 'rest';
  } else if (_speechCount >= _MAX_SPEECH) {
    _intent = 'observe';
  } else if (em && (em.current === 'levelup' || em.current === 'happy')) {
    _intent = 'celebrate';
  } else if (em && (em.current === 'sleepy' || em.current === 'dreaming')) {
    _intent = 'rest';
  } else {
    /* Weighted random pick — observe + accompany most common */
    var roll = Math.random();
    if      (roll < 0.35) _intent = 'observe';
    else if (roll < 0.60) _intent = 'accompany';
    else if (roll < 0.75) _intent = 'comment';
    else if (roll < 0.85) _intent = 'celebrate';
    else if (roll < 0.93) _intent = 'wait';
    else                   _intent = 'rest';
  }

  /* Intent duration: 2–8 minutes */
  var dur = 120000 + Math.random() * 360000;
  _intentUntil = _now() + dur;
  if (window.NP_DEBUG) console.info('[BehaviorDirector] intent →', _intent);

  /* R19: emit intent change for NPIntentVisualizer + NPRuntimeReplay */
  if (window.NPBus) NPBus.emit('zap:intent_change', { intent: _intent, previous: _intent, durationMs: dur });
  if (window.NPIntentVisualizer) NPIntentVisualizer.recordIntent(_intent, dur);
  if (window.NPRuntimeReplay)    NPRuntimeReplay.recordIntent(_intent);
}

/* ── Core decision: shouldSpeak ────────────────────────────────*/
function shouldSpeak(ctx) {
  ctx = ctx || {};
  var _reasons = [];

  /* Hard gates — these always block */
  if (isSilent())                   { _metrics.silenceDecisions++; _reasons.push('silence_window'); _traceDecision('speak', false, _reasons, ctx); return false; }
  if (ctx.silenceRequired)          { _metrics.silenceDecisions++; _reasons.push('silence_required'); _traceDecision('speak', false, _reasons, ctx); return false; }

  /* Attention gate */
  if (window.ZapAttentionSystem && !ZapAttentionSystem.consume(ctx.attentionCost || 15)) {
    _metrics.silenceDecisions++;
    _reasons.push('attention_low');
    _traceDecision('speak', false, _reasons, ctx);
    return false;
  }

  /* Emotional fatigue gate */
  if (window.ZapEmotionalFatigue && ZapEmotionalFatigue.isExhausted()) {
    _metrics.silenceDecisions++;
    _reasons.push('fatigue_exhausted');
    _traceDecision('speak', false, _reasons, ctx);
    return false;
  }

  /* Runtime guard gate */
  if (window.NPRuntimeGuard && !NPRuntimeGuard.isSpeechAllowed()) {
    _metrics.silenceDecisions++;
    _reasons.push('flood_guard');
    _traceDecision('speak', false, _reasons, ctx);
    return false;
  }

  /* Rolling window cap */
  _windowReset();
  if (_speechCount >= _MAX_SPEECH && !ctx.important) {
    _metrics.silenceDecisions++;
    _reasons.push('window_cap');
    _traceDecision('speak', false, _reasons, ctx);
    return false;
  }

  /* Intent gate */
  _pickIntent();
  if (_intent === 'rest')    { _metrics.silenceDecisions++; _reasons.push('intent_rest'); _traceDecision('speak', false, _reasons, ctx); return false; }
  if (_intent === 'observe' && !ctx.important) {
    /* observe intent: only speak if priority high */
    if (!ctx.priority || ctx.priority < 5) {
      _metrics.silenceDecisions++;
      _reasons.push('intent_observe');
      _traceDecision('speak', false, _reasons, ctx);
      return false;
    }
  }

  /* Min gap since last speech (soft) */
  var gap = ctx.minGap || 12000;
  if ((_ts() - _lastSpoke) < gap && !ctx.important) {
    _metrics.silenceDecisions++;
    _reasons.push('min_gap');
    _traceDecision('speak', false, _reasons, ctx);
    return false;
  }

  _metrics.speakDecisions++;
  _traceDecision('speak', true, [], ctx);
  return true;
}

/* ── R19: Trace helper ─────────────────────────────────────────*/
function _traceDecision(action, accepted, reasons, ctx) {
  if (window.NPDecisionTrace) {
    NPDecisionTrace.record({
      source:   'BehaviorDirector',
      action:   action,
      accepted: accepted,
      priority: ctx && ctx.priority || 0,
      reasons:  reasons
    });
  }
  if (!accepted && reasons.length && window.NPIntentVisualizer) {
    NPIntentVisualizer.recordSuppression(action, reasons);
  }
  if (!accepted && reasons.length && window.NPBus) {
    NPBus.emit('zap:speech_suppressed', { action: action, reasons: reasons });
  }
}

/* ── Ambient action gate ───────────────────────────────────────*/
function shouldActAmbient() {
  if (isSilent()) { _metrics.ambientBlocked++; return false; }
  if (_intent === 'rest' || _intent === 'wait') { _metrics.ambientBlocked++; return false; }
  if (window.ZapPresenceDensity && ZapPresenceDensity.isDense()) { _metrics.ambientBlocked++; return false; }
  if (window.NPRuntimeGuard && !NPRuntimeGuard.isAmbientAllowed()) { _metrics.ambientBlocked++; return false; }
  return true;
}

/* ── requestSpeak: combined check + enqueue ────────────────────*/
function requestSpeak(msg, opts) {
  opts = opts || {};
  var ctx = {
    important:    opts.important    || false,
    priority:     opts.priority     || 3,
    attentionCost:opts.attentionCost|| 15,
    minGap:       opts.minGap       || 12000,
    silenceRequired: false
  };

  if (!shouldSpeak(ctx)) return false;

  /* Commit */
  _lastSpoke = _ts();
  _speechCount++;
  if (window.NPRuntimeGuard) NPRuntimeGuard.registerSpeech();

  /* Post-speech silence window */
  var silenceAfter = opts.silenceAfter || (8000 + Math.random() * 7000);
  enterSilence(silenceAfter);

  /* Delivery */
  var cat = opts.category || (_intent === 'celebrate' ? 'emotional' : 'ambient');
  if (window.ZapSpeechQueue) {
    ZapSpeechQueue.enqueue(msg, { category: cat, cooldown: opts.cooldown || 30000 });
  } else if (window.zapSpeak) {
    window.zapSpeak(msg);
  }

  return true;
}

/* ── observe: silent awareness ─────────────────────────────────*/
function observe() {
  _metrics.observeCount++;
  /* Record in presenceDensity so density knows we were active */
  if (window.ZapPresenceDensity) ZapPresenceDensity.recordObservation();
}

/* ── Getters ───────────────────────────────────────────────────*/
function getIntent()  { _pickIntent(); return _intent; }
function getMetrics() { return Object.assign({}, _metrics, { speechCount: _speechCount, intent: _intent }); }

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;

  /* Level-up: enter celebration intent, short silence after */
  NPBus.on(NPBus.EV.LEVEL_UP, function() {
    _intent      = 'celebrate';
    _intentUntil = _now() + 12000;
    enterSilence(500); /* brief pause before the speech fires */
  });

  /* After any speech from ZapSpeech, log and enter micro-silence */
  NPBus.on('zap:speak', function() {
    _lastSpoke   = _ts();
    _speechCount++;
    enterSilence(6000 + Math.random() * 6000);
  });

  /* Tab return: clear dense state, pick fresh intent */
  NPBus.on('runtime:resume', function() {
    _intentUntil = 0; /* force re-pick */
    _pickIntent();
  });

  /* Perf degraded: push rest intent */
  NPBus.on('perf:degraded', function() {
    _intent      = 'rest';
    _intentUntil = _now() + 180000; /* rest 3 min */
  });
}

function init() {
  _pickIntent();
  _wireEvents();

  /* Organic intent refresh every 3 min */
  if (window.NPClock) {
    NPClock.registerTask(_pickIntent, 180000, { label: 'behavior_director' });
  } else {
    setInterval(_pickIntent, 180000);
  }

  if (window.NP_DEBUG) console.info('[ZapBehaviorDirector] ready, intent:', _intent);
}

window.ZapBehaviorDirector = {
  init:            init,
  shouldSpeak:     shouldSpeak,
  shouldActAmbient:shouldActAmbient,
  requestSpeak:    requestSpeak,
  observe:         observe,
  enterSilence:    enterSilence,
  isSilent:        isSilent,
  getIntent:       getIntent,
  getMetrics:      getMetrics
};

}(window));
