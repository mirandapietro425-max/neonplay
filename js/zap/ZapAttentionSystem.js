;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R18 — ZapAttentionSystem.js
   Simulates a finite attention budget. Systems that want the
   companion to act must consume attention. Attention regenerates
   gradually. Low attention = companion goes quiet naturally.

   Budget: 0–100. Costs per action type:
     ambient observation : 5
     generic speech      : 15
     reactive speech     : 20
     emotional highlight : 30
     critical (level-up) : 0  (bypass — always fires)

   Regen: 4 points/tick (every 8s) → full recovery ~200s (~3.3min)
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_ATTENTION_SYSTEM__) return;
window.__ZAP_ATTENTION_SYSTEM__ = true;

var _budget = {
  current: 100,
  max:     100,
  regen:   4       /* per tick */
};

/* Priority tiers that bypass attention check entirely */
var BYPASS_PRIORITY = 8; /* critical / level-up */

var _taskId = null;
var _metrics = { consumed: 0, denied: 0, regens: 0 };

/* ── R19 attention analytics ───────────────────────────────────*/
var _snapshots   = [];   /* rolling samples of attention level, every 10s */
var _SNAP_MAX    = 60;   /* 10 min of history */
var _overloadAt  = 0;    /* timestamp when attention first hit 0 */
var _starvation  = 0;    /* cumulative ms spent at 0 attention */

/* ── Regen tick ────────────────────────────────────────────────*/
function _regen() {
  if (_budget.current < _budget.max) {
    _budget.current = Math.min(_budget.max, _budget.current + _budget.regen);
    _metrics.regens++;
    if (window.NPMetrics) NPMetrics.set('attention', Math.round(_budget.current));
  }
}

/* ── consume: returns true if budget allows, deducts cost ──────*/
function consume(cost, opts) {
  cost = cost || 15;
  opts = opts || {};

  /* Critical actions bypass entirely */
  if (opts.priority >= BYPASS_PRIORITY) return true;

  if (_budget.current < cost) {
    _metrics.denied++;
    return false;
  }
  _budget.current -= cost;
  _metrics.consumed += cost;
  return true;
}

/* ── isLow: soft signal for intent system ──────────────────────*/
function isLow() {
  return _budget.current < 30;
}

/* ── drain: external fatigue trigger (long session, stress) ────*/
function drain(amount) {
  _budget.current = Math.max(0, _budget.current - (amount || 20));
}

/* ── boost: reward-based regen (e.g. after level-up pause) ────*/
function boost(amount) {
  _budget.current = Math.min(_budget.max, _budget.current + (amount || 15));
}

function get() {
  return {
    current:  Math.round(_budget.current),
    max:      _budget.max,
    ratio:    _budget.current / _budget.max,
    isLow:    isLow(),
    metrics:  Object.assign({}, _metrics)
  };
}

/* ── NPBus wiring ──────────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;

  /* After level-up: full attention boost (deserves engagement) */
  NPBus.on(NPBus.EV.LEVEL_UP, function() { boost(40); });

  /* Long session: gradually drain attention */
  NPBus.on('session:long', function() { drain(25); });

  /* Tab return: partial restore */
  NPBus.on('runtime:resume', function() { boost(20); });

  /* Performance degraded: drain to force quiet */
  NPBus.on('perf:degraded', function() { drain(35); });
}

/* ── R19: Attention analytics snapshot ─────────────────────────*/
function _snapAttention() {
  var cur = _budget.current;
  _snapshots.push({ ts: Date.now(), level: cur });
  if (_snapshots.length > _SNAP_MAX) _snapshots.shift();

  /* Track starvation */
  if (cur <= 0) {
    if (!_overloadAt) _overloadAt = Date.now();
  } else {
    if (_overloadAt) {
      _starvation += Date.now() - _overloadAt;
      _overloadAt = 0;
    }
  }
}

function getAnalytics() {
  var sum = _snapshots.reduce(function(a, s) { return a + s.level; }, 0);
  var avg = _snapshots.length ? Math.round(sum / _snapshots.length) : _budget.current;
  var regenEfficiency = _metrics.consumed > 0
    ? Math.round((_metrics.regens / (_metrics.consumed + _metrics.regens)) * 100)
    : 100;
  return {
    avgAttention:      avg,
    regenEfficiency:   regenEfficiency,
    starvationMs:      _starvation,
    isOverloaded:      !!_overloadAt,
    denials:           _metrics.denied,
    consumed:          _metrics.consumed
  };
}

function init() {
  /* Regen every 8s */
  if (window.NPClock) {
    _taskId = NPClock.registerTask(_regen, 8000, { label: 'attention_regen' });
    NPClock.registerTask(_snapAttention, 10000, { label: 'attention_snap' });
  } else {
    setInterval(_regen, 8000);
    setInterval(_snapAttention, 10000);
  }
  _wireEvents();
  if (window.NP_DEBUG) console.info('[ZapAttentionSystem] ready, budget:', _budget.current);
}

window.ZapAttentionSystem = { init: init, consume: consume, drain: drain, boost: boost, isLow: isLow, get: get, getAnalytics: getAnalytics };

}(window));
