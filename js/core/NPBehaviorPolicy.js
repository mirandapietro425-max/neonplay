/**
 * NPBehaviorPolicy — R20 Centralized Behavior Policy
 *
 * Single source of truth for social/behavioural policy values.
 * Systems read from here instead of hard-coding thresholds.
 *
 * Values are 0.0–1.0 normalized unless noted.
 *
 * @module NPBehaviorPolicy
 */
;(function (w) {
  'use strict';

  /* ── Defaults ───────────────────────────────────────────────────────────── */
  var DEFAULTS = {
    speechAggressiveness:   0.7,   // how readily Zap initiates speech
    socialDensity:          0.6,   // ambient presence density target
    emotionIntensity:       0.75,  // emotional expression amplitude
    attentionThreshold:     0.3,   // min attention fraction to allow speech
    silencePreference:      0.35,  // 0=never silent, 1=always prefer silence
    companionExpressiveness:0.8,   // glow/ambient expressiveness
    cooldownMultiplier:     1.0,   // multiplies all cooldown durations
    ambientFrequency:       0.6    // ambient event rate target
  };

  /* ── State ──────────────────────────────────────────────────────────────── */
  var _base      = Object.assign({}, DEFAULTS);   // editable baseline
  var _override  = null;                          // governor override (transient)
  var _packs     = {};                            // named policy packs
  var _activePack= null;

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  function _clamp(v) {
    return Math.max(0, Math.min(1, v));
  }

  function _merge(base, over) {
    if (!over) return base;
    var result = Object.assign({}, base);
    Object.keys(over).forEach(function (k) {
      if (k in result) result[k] = _clamp(over[k]);
    });
    return result;
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  /**
   * resolve() — returns the effective policy after applying pack + override.
   * Systems should call this, not store the result.
   */
  function resolve() {
    var base  = _activePack ? _merge(_base, _packs[_activePack]) : _base;
    return _override ? _merge(base, _override) : Object.assign({}, base);
  }

  /**
   * get(key) — single value lookup
   */
  function get(key) {
    if (key === undefined) return resolve();
    return resolve()[key];
  }

  /**
   * set(key, value) — update baseline policy
   */
  function set(key, value) {
    if (!(key in _base)) {
      if (w.NP_DEBUG) console.warn('[NPBehaviorPolicy] unknown key:', key);
      return;
    }
    _base[key] = _clamp(value);
    if (w.NPBus) NPBus.emit('policy:changed', { key: key, value: _base[key] });
    if (w.NP_DEBUG) console.info('[NPBehaviorPolicy] set', key, '=', _base[key]);
  }

  /**
   * applyGovernorOverride(overrides|null)
   * Called by NPRuntimeGovernor — transient, does not persist.
   */
  function applyGovernorOverride(overrides) {
    _override = overrides;
  }

  /**
   * registerPack(id, overrides) — register a named policy pack
   */
  function registerPack(id, overrides) {
    _packs[id] = overrides;
    if (w.NP_DEBUG) console.info('[NPBehaviorPolicy] pack registered:', id);
  }

  /**
   * usePack(id|null) — activate a pack (null to deactivate)
   */
  function usePack(id) {
    if (id && !_packs[id]) {
      if (w.NP_DEBUG) console.warn('[NPBehaviorPolicy] pack not found:', id);
      return;
    }
    _activePack = id;
    if (w.NPBus) NPBus.emit('policy:pack_changed', { pack: id });
  }

  /**
   * reset() — restore defaults
   */
  function reset() {
    _base     = Object.assign({}, DEFAULTS);
    _override = null;
    _activePack = null;
  }

  /**
   * summary() — human-readable snapshot
   */
  function summary() {
    var p = resolve();
    return 'speech=' + (p.speechAggressiveness * 100 | 0) + '%'
      + ' density=' + (p.socialDensity * 100 | 0) + '%'
      + ' emotion=' + (p.emotionIntensity * 100 | 0) + '%'
      + ' silence=' + (p.silencePreference * 100 | 0) + '%'
      + (w.NPRuntimeGovernor ? ' mode=' + NPRuntimeGovernor.getMode() : '');
  }

  w.NPBehaviorPolicy = {
    resolve:              resolve,
    get:                  get,
    set:                  set,
    applyGovernorOverride: applyGovernorOverride,
    registerPack:         registerPack,
    usePack:              usePack,
    reset:                reset,
    summary:              summary,
    DEFAULTS:             DEFAULTS
  };

}(window));
