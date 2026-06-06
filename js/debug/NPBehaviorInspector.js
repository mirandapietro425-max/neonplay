;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPBehaviorInspector.js
   Human-readable introspection of the companion's decision
   process. Translates system states into plain causal explanations.

   Primary output:
     NPBehaviorInspector.explain()  → string
     NPBehaviorInspector.snapshot() → object with all signals
     NPBehaviorInspector.whyBlocked() → string | null

   Only loads when window.NP_DEBUG === true (zero prod cost).
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_BEHAVIOR_INSPECTOR__) return;
window.__NP_BEHAVIOR_INSPECTOR__ = true;

/* ── Collect current signals ───────────────────────────────────*/
function snapshot() {
  var em   = window.ZapEmotionModel     ? ZapEmotionModel.get()           : {};
  var sc   = window.ZapStateCoordinator ? ZapStateCoordinator.getState()   : {};
  var at   = window.ZapAttentionSystem  ? ZapAttentionSystem.get()         : {};
  var fat  = window.ZapEmotionalFatigue ? ZapEmotionalFatigue.get()        : {};
  var dens = window.ZapPresenceDensity  ? ZapPresenceDensity.get()         : {};
  var sil  = window.ZapSilenceModel     ? {
    active:    ZapSilenceModel.isSilent(),
    type:      ZapSilenceModel.getType(),
    remaining: Math.round(ZapSilenceModel.getRemaining() / 1000),
    ratio:     ZapSilenceModel.getSilenceRatio()
  } : {};
  var eco  = window.NPRuntimeEcology    ? NPRuntimeEcology.get()           : {};
  var bd   = window.ZapBehaviorDirector ? ZapBehaviorDirector.getMetrics() : {};
  var temp = window.ZapTemporalAwareness? ZapTemporalAwareness.getTags()   : [];
  var ctx  = window.ZapContextEngine   ? ZapContextEngine.getTags()        : [];
  var perf = window.NPPerformanceBudget ? NPPerformanceBudget.get()        : {};
  var stab = window.NPBehaviorStability ? NPBehaviorStability.getScore()   : null;
  var mem  = window.ZapSemanticMemory  ? ZapSemanticMemory.getSummary().slice(0,3) : [];

  return {
    emotion:    { current: em.current, target: em.target, momentum: em.momentum },
    state:      { current: sc.current, priority: sc.priority },
    attention:  { current: at.current, max: at.max, isLow: at.isLow },
    fatigue:    { value: fat.fatigue, isReduced: fat.isReduced, isExhausted: fat.isExhausted },
    density:    { score: dens.score, isDense: dens.isDense },
    silence:    sil,
    ecology:    { mode: eco.mode, health: eco.health },
    behavior:   { intent: bd.intent, speechCount: bd.speechCount, silenceDecisions: bd.silenceDecisions },
    temporal:   temp,
    context:    ctx,
    perf:       { fps: perf.fps, reducedFX: perf.reducedFX, reducedAmbient: perf.reducedAmbient },
    stability:  stab,
    topMemories:mem
  };
}

/* ── Explain why the companion is currently blocked ────────────*/
function whyBlocked() {
  var causes = [];

  if (window.ZapSilenceModel && ZapSilenceModel.isSilent()) {
    causes.push('silence:' + ZapSilenceModel.getType() + '(' + Math.round(ZapSilenceModel.getRemaining()/1000) + 's left)');
  }
  if (window.ZapAttentionSystem && ZapAttentionSystem.isLow()) {
    causes.push('attention:low(' + Math.round(ZapAttentionSystem.get().current) + '/100)');
  }
  if (window.ZapEmotionalFatigue && ZapEmotionalFatigue.isExhausted()) {
    causes.push('fatigue:exhausted(' + ZapEmotionalFatigue.getFatigue() + ')');
  }
  if (window.ZapPresenceDensity && ZapPresenceDensity.isDense()) {
    causes.push('density:saturated(' + ZapPresenceDensity.getScore() + ')');
  }
  if (window.NPRuntimeEcology && NPRuntimeEcology.getMode() === 'degraded') {
    causes.push('ecology:degraded(' + NPRuntimeEcology.getHealth() + '%)');
  }
  if (window.ZapBehaviorDirector) {
    var intent = ZapBehaviorDirector.getIntent();
    if (intent === 'rest' || intent === 'observe') causes.push('intent:' + intent);
  }

  if (!causes.length) return null;
  return 'BLOCKED: ' + causes.join(' + ');
}

/* ── Full human-readable explanation ──────────────────────────*/
function explain() {
  var s   = snapshot();
  var blk = whyBlocked();
  var dt  = window.NPDecisionTrace ? NPDecisionTrace.getLast(3).map(NPDecisionTrace.formatEntry) : [];

  var lines = [
    '══ Zap Behavior Inspector ══',
    'State    : ' + (s.state.current || '?') + ' (priority ' + (s.state.priority || 0) + ')',
    'Emotion  : ' + (s.emotion.current || '?') + ' → ' + (s.emotion.target || '?') + ' m=' + (s.emotion.momentum || 0),
    'Intent   : ' + (s.behavior.intent || '?') + '  speeches: ' + (s.behavior.speechCount || 0),
    'Attention: ' + (s.attention.current || 0) + '/100' + (s.attention.isLow ? ' [LOW]' : ''),
    'Fatigue  : ' + (s.fatigue.value || 0) + (s.fatigue.isExhausted ? ' [EXHAUSTED]' : s.fatigue.isReduced ? ' [reduced]' : ''),
    'Density  : ' + (s.density.score || 0) + (s.density.isDense ? ' [DENSE]' : ''),
    'Silence  : ' + (s.silence.active ? s.silence.type + ' ' + s.silence.remaining + 's left' : 'none'),
    'Ecology  : ' + (s.ecology.mode || '?') + ' health=' + (s.ecology.health || 0),
    'Perf     : ' + (s.perf.fps || 0) + 'fps' + (s.perf.reducedAmbient ? ' [amb-]' : '') + (s.perf.reducedFX ? ' [fx-]' : ''),
    'Temporal : ' + (s.temporal || []).slice(0,3).join(', '),
    'Stability: ' + (s.stability !== null ? s.stability : '?'),
    blk || 'STATUS: can speak',
    '── Recent decisions ──'
  ].concat(dt);

  return lines.join('\n');
}

/* ── Console shortcut ──────────────────────────────────────────*/
function print() {
  if (window.NP_DEBUG) console.log(explain());
}

function init() {
  /* Expose as global shortcut for quick console inspection */
  window.zapInspect = print;
  if (window.NP_DEBUG) {
    console.info('[NPBehaviorInspector] ready. Call zapInspect() in console.');
  }
}

window.NPBehaviorInspector = { init: init, snapshot: snapshot, explain: explain, whyBlocked: whyBlocked, print: print };

}(window));