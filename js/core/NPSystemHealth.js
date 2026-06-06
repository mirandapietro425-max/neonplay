/**
 * NPSystemHealth — R20 Unified Runtime Health Model
 *
 * Aggregates pressure, drift, instability, congestion, starvation,
 * degradation into a single 0–100 health score.
 *
 * Emits: runtime:healthy | runtime:warning | runtime:critical
 *
 * @module NPSystemHealth
 */
;(function (w) {
  'use strict';

  /* ── State ──────────────────────────────────────────────────────────────── */
  var _score       = 100;
  var _prevScore   = 100;
  var _components  = {};
  var _history     = [];        // [ { ts, score, components } ] — last 20
  var _status      = 'healthy'; // healthy | warning | critical
  var _prevStatus  = 'healthy';
  var _initialized = false;
  var _interval    = null;

  var TICK_MS  = 12000;
  var HIST_MAX = 20;

  /* ── Score computation ──────────────────────────────────────────────────── */
  function _computeComponents() {
    var c = {};

    /* Pressure from ecology */
    var eco = w.NPRuntimeEcology ? NPRuntimeEcology.get() : {};
    c.fatigue    = eco.fatigue    || 0;   // 0–1
    c.attention  = eco.attention  || 100; // 0–100 → invert
    c.density    = eco.density    || 0;   // 0–1

    /* Stability */
    c.stability  = w.NPBehaviorStability
      ? NPBehaviorStability.getScore() : 100; // 0–100

    /* Drift */
    var drift = w.NPRuntimeDrift ? NPRuntimeDrift.getStats() : {};
    c.driftSeverity = drift.severity === 'severe' ? 1
                    : drift.severity === 'warn'   ? 0.4 : 0;

    /* Queue congestion */
    c.queueLen = w.ZapSpeechQueue ? ZapSpeechQueue.getQueueLength() : 0;

    /* Silence quality (starvation proxy) */
    var silA = w.ZapSilenceModel ? ZapSilenceModel.getAnalytics() : {};
    c.silenceQuality = silA.quality || 1; // 0–1

    /* Attention starvation */
    var atA = w.ZapAttentionSystem ? ZapAttentionSystem.getAnalytics() : {};
    c.starvationMs = atA.starvationMs || 0;

    return c;
  }

  function _computeScore(c) {
    var penalty = 0;

    /* fatigue: 0–30 pts penalty */
    penalty += Math.min(30, c.fatigue * 30);

    /* low attention: 0–20 pts */
    penalty += Math.min(20, Math.max(0, 100 - c.attention) * 0.2);

    /* stability: 0–25 pts */
    penalty += Math.min(25, Math.max(0, 100 - c.stability) * 0.25);

    /* drift: 0–10 pts */
    penalty += Math.min(10, c.driftSeverity * 10);

    /* queue congestion: each item over 2 costs 3pts, cap 15 */
    penalty += Math.min(15, Math.max(0, c.queueLen - 2) * 3);

    /* silence quality: low quality adds pressure */
    penalty += Math.min(10, (1 - c.silenceQuality) * 10);

    /* starvation: each 30s of zero-attention costs 5pts, cap 15 */
    penalty += Math.min(15, (c.starvationMs / 30000) * 5);

    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
  }

  function _resolveStatus(score) {
    if (score < 35) return 'critical';
    if (score < 60) return 'warning';
    return 'healthy';
  }

  /* ── Tick ───────────────────────────────────────────────────────────────── */
  function _tick() {
    _components = _computeComponents();
    _prevScore  = _score;
    _score      = _computeScore(_components);
    _prevStatus = _status;
    _status     = _resolveStatus(_score);

    /* Push history */
    _history.push({
      ts:         Date.now(),
      score:      _score,
      components: Object.assign({}, _components)
    });
    if (_history.length > HIST_MAX) _history.shift();

    /* Update NPMetrics */
    if (w.NPMetrics) NPMetrics.set('systemHealth', _score);

    /* Emit status transitions */
    if (_status !== _prevStatus) {
      var evtName = 'runtime:' + _status;
      if (w.NPBus) NPBus.emit(evtName, { score: _score, prev: _prevScore });
      if (w.NP_DEBUG) console.info('[NPSystemHealth]', evtName, _score);
    }

    if (w.NP_DEBUG) console.info('[NPSystemHealth] score=' + _score
      + ' status=' + _status);
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  function init() {
    if (_initialized) return;
    _initialized = true;
    _interval = setInterval(_tick, TICK_MS);
    setTimeout(_tick, 1500);
    if (w.NP_DEBUG) console.info('[NPSystemHealth] init');
  }

  function getScore()      { return _score; }
  function getStatus()     { return _status; }
  function getComponents() { return Object.assign({}, _components); }
  function getHistory(n)   { return _history.slice(-(n || HIST_MAX)); }

  function get() {
    return {
      score:      _score,
      status:     _status,
      components: Object.assign({}, _components)
    };
  }

  /**
   * explain() — human-readable health breakdown
   */
  function explain() {
    var c   = _components;
    var lines = [];
    lines.push('Health: ' + _score + '/100 (' + _status + ')');
    if (c.fatigue    > 0.5) lines.push('  ⚠ High fatigue (' + (c.fatigue * 100 | 0) + '%)');
    if (c.attention  < 50)  lines.push('  ⚠ Low attention (' + (c.attention | 0) + ')');
    if (c.stability  < 60)  lines.push('  ⚠ Low stability (' + (c.stability | 0) + ')');
    if (c.driftSeverity > 0) lines.push('  ⚠ Timer drift detected');
    if (c.queueLen   > 2)   lines.push('  ⚠ Speech queue congested (' + c.queueLen + ')');
    if (c.silenceQuality < 0.5) lines.push('  ⚠ Silence quality low');
    if (c.starvationMs > 60000) lines.push('  ⚠ Attention starvation (>' +
      (c.starvationMs / 60000 | 0) + 'min)');
    if (lines.length === 1) lines.push('  ✓ All systems nominal');
    return lines.join('\n');
  }

  w.NPSystemHealth = {
    init:          init,
    get:           get,
    getScore:      getScore,
    getStatus:     getStatus,
    getComponents: getComponents,
    getHistory:    getHistory,
    explain:       explain
  };

}(window));
