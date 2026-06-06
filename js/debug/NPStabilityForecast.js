/**
 * NPStabilityForecast — R20 Heuristic Stability Forecast
 *
 * Estimates near-future stability from current trends.
 * No ML — pure heuristics on buffered signals.
 *
 * Outputs: stable | warning | collapse_risk
 *
 * @module NPStabilityForecast
 */
;(function (w) {
  'use strict';

  /* ── Snapshot buffer ────────────────────────────────────────────────────── */
  var _snapshots  = []; // [ { ts, health, stability, pressure, fatigue } ]
  var _SNAP_MAX   = 10; // 10 snapshots × 15s tick ≈ 2.5 min window
  var _forecast   = 'stable';
  var _confidence = 0;  // 0–1
  var _interval   = null;
  var _initialized= false;

  var TICK_MS = 15000;

  /* ── Snapshot ───────────────────────────────────────────────────────────── */
  function _snap() {
    var health    = w.NPSystemHealth      ? NPSystemHealth.getScore()        : 100;
    var stability = w.NPBehaviorStability ? NPBehaviorStability.getScore()   : 100;
    var pressure  = w.NPRuntimeGovernor  ? NPRuntimeGovernor.getPressure()  : 0;
    var fatigue   = w.NPRuntimeEcology   ? NPRuntimeEcology.get().fatigue   : 0;
    var driftMs   = w.NPRuntimeDrift     ? (NPRuntimeDrift.getStats().lastDriftMs || 0) : 0;
    var silQ      = w.ZapSilenceModel    ? (ZapSilenceModel.getAnalytics().quality || 1) : 1;

    var s = { ts: Date.now(), health, stability, pressure, fatigue, driftMs, silQ };
    _snapshots.push(s);
    if (_snapshots.length > _SNAP_MAX) _snapshots.shift();
  }

  /* ── Trend helpers ──────────────────────────────────────────────────────── */
  function _trend(field) {
    /* returns positive = improving, negative = degrading */
    if (_snapshots.length < 2) return 0;
    var n    = _snapshots.length;
    var last = _snapshots[n - 1][field];
    var prev = _snapshots[Math.max(0, n - 4)][field]; // compare with ~1min ago
    return last - prev;
  }

  /* ── Forecast computation ───────────────────────────────────────────────── */
  function _computeForecast() {
    if (_snapshots.length < 2) return { forecast: 'stable', confidence: 0 };

    var latest    = _snapshots[_snapshots.length - 1];
    var healthT   = _trend('health');
    var stabilityT= _trend('stability');
    var pressureT = _trend('pressure');

    var risk = 0;

    /* Current bad state */
    if (latest.health < 35)    risk += 35;
    else if (latest.health < 55) risk += 15;

    if (latest.stability < 35) risk += 30;
    else if (latest.stability < 55) risk += 12;

    if (latest.fatigue > 0.8)  risk += 15;
    if (latest.pressure > 70)  risk += 10;

    /* Degrading trends amplify risk */
    if (healthT    < -10) risk += 20;
    else if (healthT < -5) risk += 8;

    if (stabilityT < -10) risk += 18;
    else if (stabilityT < -5) risk += 7;

    if (pressureT  > 15)  risk += 12;

    /* Drift */
    if (latest.driftMs > 30000) risk += 15;

    /* Silence quality degrading */
    if (latest.silQ < 0.3)      risk += 8;

    risk = Math.min(100, Math.round(risk));

    var forecast   = risk >= 65 ? 'collapse_risk'
                   : risk >= 35 ? 'warning'
                   :              'stable';
    var confidence = Math.min(1, _snapshots.length / _SNAP_MAX);

    return { forecast, confidence, risk };
  }

  /* ── Tick ───────────────────────────────────────────────────────────────── */
  function _tick() {
    _snap();
    var result  = _computeForecast();
    var prev    = _forecast;
    _forecast   = result.forecast;
    _confidence = result.confidence;

    if (_forecast !== prev && w.NPBus) {
      NPBus.emit('forecast:changed', {
        forecast:   _forecast,
        confidence: _confidence,
        risk:       result.risk
      });
    }
    if (w.NP_DEBUG) console.info('[NPStabilityForecast]', _forecast,
      '(risk=' + result.risk + ' conf=' + (_confidence * 100 | 0) + '%)');
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  function init() {
    if (_initialized) return;
    _initialized = true;
    _interval = setInterval(_tick, TICK_MS);
    setTimeout(_tick, 5000);
    if (w.NP_DEBUG) console.info('[NPStabilityForecast] init');
  }

  function getForecast()   { return _forecast; }
  function getConfidence() { return _confidence; }

  function get() {
    var result = _computeForecast();
    return {
      forecast:   _forecast,
      confidence: _confidence,
      risk:       result.risk,
      snapshots:  _snapshots.length
    };
  }

  function explain() {
    var r = _computeForecast();
    var lines = ['Forecast: ' + _forecast + ' (risk=' + r.risk + ')'];
    var latest = _snapshots[_snapshots.length - 1] || {};
    if (latest.health    < 55)    lines.push('  ↓ health=' + latest.health);
    if (latest.stability < 55)    lines.push('  ↓ stability=' + latest.stability);
    if (latest.pressure  > 55)    lines.push('  ↑ pressure=' + latest.pressure);
    if (latest.fatigue   > 0.6)   lines.push('  ↑ fatigue=' + (latest.fatigue * 100 | 0) + '%');
    if (_trend('health') < -5)    lines.push('  ↓ health degrading');
    if (_trend('stability') < -5) lines.push('  ↓ stability degrading');
    if (_trend('pressure') > 10)  lines.push('  ↑ pressure rising');
    return lines.join('\n');
  }

  w.NPStabilityForecast = {
    init:          init,
    get:           get,
    getForecast:   getForecast,
    getConfidence: getConfidence,
    explain:       explain
  };

}(window));
