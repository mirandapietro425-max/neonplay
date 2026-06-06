/**
 * NPDependencyGraph — R20 Runtime Influence Map
 *
 * Records which systems influence which, how often, and at what intensity.
 * Detects cycles and hot dependency paths.
 *
 * Zero cost in prod (NP_DEBUG guard on record calls).
 * In debug: lightweight event-driven accumulation.
 *
 * Usage:
 *   NPDependencyGraph.record('ZapEmotionModel', 'ZapAttentionSystem', 0.7)
 *   NPDependencyGraph.getHot(5)
 *   NPDependencyGraph.getCycles()
 *   zapGraph()   ← console shortcut
 *
 * @module NPDependencyGraph
 */
;(function (w) {
  'use strict';

  /* ── State ──────────────────────────────────────────────────────────────── */
  /* edges: { "A→B": { from, to, count, totalIntensity, lastTs } } */
  var _edges  = {};
  var _MAX    = 200; // max distinct edges tracked

  /* ── Core ───────────────────────────────────────────────────────────────── */
  function _key(from, to) { return from + '→' + to; }

  /**
   * record(from, to, intensity)
   * intensity: 0.0–1.0 (optional, default 0.5)
   */
  function record(from, to, intensity) {
    if (!w.NP_DEBUG) return; // zero cost in prod
    var k = _key(from, to);
    if (!_edges[k]) {
      if (Object.keys(_edges).length >= _MAX) return; // cap
      _edges[k] = { from: from, to: to, count: 0, totalIntensity: 0, lastTs: 0 };
    }
    var e = _edges[k];
    e.count++;
    e.totalIntensity += (intensity !== undefined ? intensity : 0.5);
    e.lastTs = Date.now();
  }

  /* ── Analysis ───────────────────────────────────────────────────────────── */
  function _allEdges() {
    return Object.values(_edges);
  }

  function getHot(n) {
    n = n || 5;
    return _allEdges()
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, n)
      .map(function (e) {
        return {
          from:     e.from,
          to:       e.to,
          count:    e.count,
          avgIntensity: Math.round(e.totalIntensity / e.count * 100) / 100,
          lastTs:   e.lastTs
        };
      });
  }

  function getCycles() {
    /* Simple cycle detection: find A→B and B→A pairs */
    var cycles = [];
    var keys   = Object.keys(_edges);
    keys.forEach(function (k) {
      var e    = _edges[k];
      var back = _key(e.to, e.from);
      if (_edges[back] && e.from < e.to) { /* deduplicate */
        cycles.push({
          a: e.from,
          b: e.to,
          countAB: e.count,
          countBA: _edges[back].count
        });
      }
    });
    return cycles;
  }

  function getEdgesFrom(node) {
    return _allEdges().filter(function (e) { return e.from === node; });
  }

  function getEdgesTo(node) {
    return _allEdges().filter(function (e) { return e.to === node; });
  }

  function getSummary() {
    var hot    = getHot(3);
    var cycles = getCycles();
    var lines  = ['=== Dependency Graph ==='];
    lines.push('Edges tracked: ' + Object.keys(_edges).length);
    lines.push('Hot paths:');
    hot.forEach(function (e) {
      lines.push('  ' + e.from + ' → ' + e.to +
        ' (' + e.count + 'x avg intensity ' + e.avgIntensity + ')');
    });
    if (cycles.length) {
      lines.push('Cycles:');
      cycles.forEach(function (c) {
        lines.push('  ' + c.a + ' ↔ ' + c.b +
          ' (' + c.countAB + '/' + c.countBA + ')');
      });
    } else {
      lines.push('Cycles: none detected');
    }
    return lines.join('\n');
  }

  function reset() { _edges = {}; }

  /* Console shortcut */
  w.zapGraph = function () {
    var msg = getSummary();
    if (w.NP_DEBUG) console.log(msg);
    return msg;
  };

  /* ── Pre-wired listeners (if NPBus available) ───────────────────────────── */
  function _wireListeners() {
    if (!w.NPBus || !w.NP_DEBUG) return;

    NPBus.on('zap:emotion_changed', function () {
      record('ZapEmotionModel', 'ZapAttentionSystem', 0.6);
      record('ZapEmotionModel', 'ZapBehaviorDirector', 0.5);
    });
    NPBus.on('zap:speech_suppressed', function () {
      record('ZapBehaviorDirector', 'ZapSpeechQueue', 0.7);
    });
    NPBus.on('zap:silence_enter', function () {
      record('ZapSilenceModel', 'ZapBehaviorDirector', 0.8);
    });
    NPBus.on('governor:mode_changed', function () {
      record('NPRuntimeGovernor', 'NPBehaviorPolicy', 0.9);
      record('NPSystemHealth', 'NPRuntimeGovernor', 0.8);
    });
    NPBus.on('stability:critical', function () {
      record('NPBehaviorStability', 'NPRuntimeGovernor', 1.0);
    });
    NPBus.on('zap:state_blocked', function (d) {
      record(d && d.from || 'ZapStateCoordinator', 'NPStateHeatmap', 0.4);
    });
  }

  function init() {
    _wireListeners();
    if (w.NP_DEBUG) console.info('[NPDependencyGraph] init');
  }

  w.NPDependencyGraph = {
    init:         init,
    record:       record,
    getHot:       getHot,
    getCycles:    getCycles,
    getEdgesFrom: getEdgesFrom,
    getEdgesTo:   getEdgesTo,
    getSummary:   getSummary,
    reset:        reset
  };

}(window));
