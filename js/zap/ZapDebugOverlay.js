;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R14 — ZapDebugOverlay.js
   Debug panel — only renders when window.NP_DEBUG === true

   Shows: mood, idle state, queue size, active timers, last event
   Activation: window.NP_DEBUG = true; (or URL: ?npdebug=1)
═══════════════════════════════════════════════════════════════ */

if(window.__ZAP_DEBUG_OVERLAY__) return;
window.__ZAP_DEBUG_OVERLAY__ = true;

/* Auto-enable from URL param */
if(/[?&]npdebug=1/.test(location.search)) window.NP_DEBUG = true;

if(!window.NP_DEBUG) return; /* Only load overlay in debug mode */

var _el = null;
var _raf = null;

function _build(){
  var div = document.createElement('div');
  div.id = 'np-debug-overlay';
  div.style.cssText = [
    'position:fixed',
    'bottom:8px',
    'left:8px',
    'background:rgba(6,6,20,.92)',
    'border:1px solid rgba(0,212,255,.3)',
    'border-radius:8px',
    'padding:8px 12px',
    'font:11px/1.6 monospace',
    'color:#00d4ff',
    'z-index:' + (getComputedStyle(document.documentElement).getPropertyValue('--z-debug-hud').trim() || '99999'),
    'pointer-events:none',
    'min-width:190px',
    'max-width:260px',
    'white-space:pre',
    'box-shadow:0 4px 20px rgba(0,0,0,.7)'
  ].join(';');
  document.body.appendChild(div);
  return div;
}

function _tick(){
  if(!_el) _el = _build();

  var mood    = window.ZapMoodSystem ? ZapMoodSystem.getMood() : '?';
  var idle    = window.ZapIdle       ? ZapIdle.getState()      : '?';
  var queue   = window.ZapSpeech     ? ZapSpeech._queue().length : '?';
  var timers  = window.NPUtils       ? NPUtils.timer._snapshot() : { intervals:[], timeouts:[] };
  var lastEv  = window._npBusLastEvent;

  /* R17 extras */
  var st    = window.ZapStateCoordinator ? ZapStateCoordinator.getState().current : '?';
  var em    = window.ZapEmotionModel     ? ZapEmotionModel.get() : null;
  var ctx   = window.ZapContextEngine   ? ZapContextEngine.getTags().slice(0,4).join(',') : '?';
  var perf  = window.NPPerformanceBudget ? NPPerformanceBudget.get() : null;
  var trace = window.NPBus ? NPBus._trace(3).map(function(e){return e.ev.split(':').pop();}).join(',') : '?';
  _el.textContent = [
    '⚡ NP_DEBUG R17',
    'mood:   ' + mood + '  st:' + st,
    'idle:   ' + idle,
    'queue:  ' + queue + ' msg(s)',
    em ? 'emot:  ' + em.current + '→' + em.target + ' m:' + (em.momentum||0).toFixed(2) : '',
    'ctx:    ' + ctx,
    perf ? 'fps:   ' + perf.fps + (perf.reducedFX?' [fx-]':'') + (perf.reducedAmbient?' [amb-]':'') + (perf.degraded?' [DEGRADED]':'') : '',
    'clocks: ' + (window.NPClock ? NPClock.getTaskCount() : '?'),
    eco ? 'eco:   ' + eco.mode + ' (' + eco.health + ')' : '',
    att ? 'att:   ' + att.current + '/' + att.max : '',
    dens ? 'dens:  ' + dens.score + (dens.isDense ? ' [DENSE]' : '') : '',
    fat ? 'fat:   ' + fat.fatigue + (fat.isExhausted ? ' [EXHAUSTED]' : fat.isReduced ? ' [reduced]' : '') : '',
    'intent: ' + intent + '  sil:' + silent,
    'tmood:  ' + tmood,
    'trace:  ' + trace,
    lastEv ? 'last:   ' + lastEv.ev.substring(0,22) : 'last:   –',
    /* ── R19 Observability panel ── */
    window.NPBehaviorStability ? 'stab:  ' + NPBehaviorStability.getScore() + '/100' : '',
    window.NPIntentVisualizer  ? NPIntentVisualizer.getSummary() : '',
    window.ZapSilenceModel && ZapSilenceModel.getAnalytics
      ? (function(){ var a=ZapSilenceModel.getAnalytics(); return 'sil-q: ' + a.quality + ' ratio:' + a.ratio; })()
      : '',
    window.NPRuntimeDrift && NPRuntimeDrift.hasDriftedRecently(60000) ? '⚠ drift detected' : '',
    window.NPEmotionTimeline && NPEmotionTimeline.getStability
      ? (function(){ var s=NPEmotionTimeline.getStability(); return 'emo-osc:' + s.oscillations + ' jumps:' + s.abruptJumps; })()
      : '',
    /* ── R20 Governance panel ── */
    window.NPRuntimeGovernor
      ? (function(){ var g=NPRuntimeGovernor.get(); return 'gov:   ' + g.mode + ' reg=' + g.regulation + ' p=' + g.pressure; })()
      : '',
    window.NPSystemHealth
      ? (function(){ var h=NPSystemHealth.get(); return 'health:' + h.score + '/100 (' + h.status + ')'; })()
      : '',
    window.NPBehaviorPolicy
      ? 'policy:' + NPBehaviorPolicy.summary()
      : '',
    window.NPStabilityForecast
      ? (function(){ var f=NPStabilityForecast.get(); return 'fcast: ' + f.forecast + ' (' + (f.confidence*100|0) + '%)'; })()
      : '',
    window.NPSessionPersonality
      ? 'spers: ' + NPSessionPersonality.getProfile()
      : ''
  ].filter(Boolean).join('\n');

  _raf = requestAnimationFrame(function(){
    setTimeout(_tick, 500); /* update 2x/sec */
  });
}

/* Start after DOM ready */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _tick);
} else {
  setTimeout(_tick, 200);
}

})(window);