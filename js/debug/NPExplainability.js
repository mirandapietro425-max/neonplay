/**
 * NPExplainability — R20 Causal Chain Explainability Engine
 *
 * R19 explains individual decisions.
 * R20 explains WHY those decisions happened — the causal chain upstream.
 *
 * Usage (console / debug):
 *   NPExplainability.explain('speech_suppressed')
 *   NPExplainability.explain('silence_active')
 *   NPExplainability.whyNow()
 *   zapExplain()   ← shortcut installed on window
 *
 * @module NPExplainability
 */
;(function (w) {
  'use strict';

  /* ── Causal graph definition ────────────────────────────────────────────── */
  /* Each node: { label, getValue, causes: [ { node, threshold, description } ] } */

  function _getSources() {
    var eco  = w.NPRuntimeEcology     ? NPRuntimeEcology.get()          : {};
    var atA  = w.ZapAttentionSystem   ? ZapAttentionSystem.getAnalytics(): {};
    var silA = w.ZapSilenceModel      ? ZapSilenceModel.getAnalytics()  : {};
    var emT  = w.NPEmotionTimeline    ? NPEmotionTimeline.getStats()    : {};
    var stab = w.NPBehaviorStability  ? NPBehaviorStability.get()       : {};
    var gov  = w.NPRuntimeGovernor    ? NPRuntimeGovernor.get()         : {};
    var hlth = w.NPSystemHealth       ? NPSystemHealth.get()            : {};
    var drift= w.NPRuntimeDrift       ? NPRuntimeDrift.getStats()       : {};

    return { eco, atA, silA, emT, stab, gov, hlth, drift };
  }

  /* ── Cause chain resolvers ──────────────────────────────────────────────── */
  var _resolvers = {

    speech_suppressed: function (s) {
      var causes = [];
      if (s.eco.attention < 40)
        causes.push({ factor: 'attention_low',
          detail: 'attention=' + (s.eco.attention | 0),
          upstream: ['attention_deficit'] });
      if (s.silA.active)
        causes.push({ factor: 'silence_active',
          detail: 'silence model enforcing quiet',
          upstream: ['silence_policy'] });
      if (s.gov.mode === 'recovery' || s.gov.mode === 'stressed')
        causes.push({ factor: 'governor_mode',
          detail: 'governor in ' + s.gov.mode + ' mode',
          upstream: ['health_pressure'] });
      if (s.stab.score < 50)
        causes.push({ factor: 'stability_low',
          detail: 'score=' + s.stab.score,
          upstream: ['oscillation', 'congestion'] });
      if (s.eco.fatigue > 0.6)
        causes.push({ factor: 'emotional_fatigue',
          detail: 'fatigue=' + (s.eco.fatigue * 100 | 0) + '%',
          upstream: ['sustained_activity'] });
      return causes;
    },

    silence_active: function (s) {
      var causes = [];
      if (s.silA.active) {
        causes.push({ factor: 'silence_policy',
          detail: 'ZapSilenceModel active since ' +
            (s.silA.durationMs ? Math.round(s.silA.durationMs / 1000) + 's' : 'unknown'),
          upstream: ['recovery_policy'] });
      }
      if (s.gov.regulation > 60)
        causes.push({ factor: 'high_regulation',
          detail: 'regulation=' + s.gov.regulation,
          upstream: ['health_pressure'] });
      return causes;
    },

    attention_deficit: function (s) {
      var causes = [];
      if (s.eco.fatigue > 0.5)
        causes.push({ factor: 'fatigue_draining_attention',
          detail: 'fatigue=' + (s.eco.fatigue * 100 | 0) + '%',
          upstream: ['sustained_activity'] });
      if (s.atA.starvationMs > 30000)
        causes.push({ factor: 'attention_starvation',
          detail: 'starved for ' + Math.round(s.atA.starvationMs / 1000) + 's',
          upstream: [] });
      if (s.atA.regenEfficiency < 0.4)
        causes.push({ factor: 'low_regen_efficiency',
          detail: 'regen efficiency=' + (s.atA.regenEfficiency * 100 | 0) + '%',
          upstream: ['density_spike'] });
      return causes;
    },

    health_pressure: function (s) {
      var causes = [];
      if (s.hlth.score < 60)
        causes.push({ factor: 'system_health_low',
          detail: 'health=' + s.hlth.score,
          upstream: Object.keys(s.hlth.components || {})
            .filter(function (k) {
              var v = s.hlth.components[k];
              return (typeof v === 'number' && v > 0.5) ||
                     (k === 'attention' && v < 50);
            })
        });
      if (s.drift.severity && s.drift.severity !== 'none')
        causes.push({ factor: 'timer_drift',
          detail: 'severity=' + s.drift.severity + ' last=' +
            Math.round((s.drift.lastDriftMs || 0) / 1000) + 's',
          upstream: ['tab_hidden'] });
      return causes;
    },

    ecology_stressed: function (s) {
      var causes = [];
      var mode = s.eco.mode || (w.NPRuntimeEcology ? NPRuntimeEcology.getMode() : '?');
      if (mode === 'overloaded' || mode === 'stressed')
        causes.push({ factor: 'ecology_overloaded',
          detail: 'mode=' + mode,
          upstream: ['density_spike', 'fatigue'] });
      if (s.eco.density > 0.8)
        causes.push({ factor: 'density_spike',
          detail: 'density=' + (s.eco.density * 100 | 0) + '%',
          upstream: [] });
      return causes;
    },

    emotion_oscillation: function (s) {
      var causes = [];
      if (s.emT.oscillations > 2)
        causes.push({ factor: 'rapid_emotion_shifts',
          detail: 'oscillations in 5min: ' + s.emT.oscillations,
          upstream: ['conflicting_stimuli'] });
      if (s.emT.abruptJumps > 0)
        causes.push({ factor: 'abrupt_emotion_jumps',
          detail: 'jumps: ' + s.emT.abruptJumps,
          upstream: [] });
      return causes;
    }
  };

  /* ── Format helpers ─────────────────────────────────────────────────────── */
  function _formatChain(node, causes, depth) {
    depth = depth || 0;
    var indent = '  '.repeat(depth);
    var lines  = [];
    lines.push(indent + (depth === 0 ? '📍 ' : '→ ') + node);

    causes.forEach(function (c) {
      lines.push(indent + '  because: ' + c.factor + ' (' + c.detail + ')');
      if (c.upstream && c.upstream.length) {
        c.upstream.forEach(function (u) {
          lines.push(indent + '    ← ' + u);
        });
      }
    });

    return lines.join('\n');
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  function explain(node) {
    var resolver = _resolvers[node];
    if (!resolver) {
      var available = Object.keys(_resolvers).join(', ');
      return 'Unknown node: "' + node + '"\nAvailable: ' + available;
    }
    var s      = _getSources();
    var causes = resolver(s);
    if (!causes.length) {
      return '📍 ' + node + '\n  ✓ No active causes detected';
    }
    return _formatChain(node, causes, 0);
  }

  function whyNow() {
    var s    = _getSources();
    var lines = ['=== Runtime Causal State ==='];

    /* Governor */
    lines.push('Governor: ' + s.gov.mode +
      ' | regulation=' + s.gov.regulation +
      ' | pressure=' + s.gov.pressure);

    /* Health */
    lines.push('Health: ' + (s.hlth.score || '?') +
      ' (' + (s.hlth.status || '?') + ')');

    /* Key suppressions */
    var suppr = [];
    if (s.eco.attention < 40) suppr.push('attention_low');
    if (s.silA.active)        suppr.push('silence_active');
    if (s.eco.fatigue > 0.5)  suppr.push('fatigue_high');
    if (s.emT.oscillations > 2) suppr.push('emotion_oscillating');
    if (suppr.length)
      lines.push('Active suppressors: ' + suppr.join(', '));
    else
      lines.push('Active suppressors: none');

    /* Session */
    var profile = w.NPSessionPersonality ? NPSessionPersonality.getProfile() : '?';
    lines.push('Session profile: ' + profile);

    return lines.join('\n');
  }

  function getResolvers() { return Object.keys(_resolvers); }

  /* Console shortcut */
  w.zapExplain = function (node) {
    var msg = node ? explain(node) : whyNow();
    if (w.NP_DEBUG) console.log(msg);
    return msg;
  };

  w.NPExplainability = {
    explain:      explain,
    whyNow:       whyNow,
    getResolvers: getResolvers
  };

}(window));
