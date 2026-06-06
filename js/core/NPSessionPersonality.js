/**
 * NPSessionPersonality — R20 Session Pacing Drift
 *
 * Long sessions gradually shift Zap's pacing:
 *   - Less hyperactivity
 *   - More contemplation
 *   - More silence
 *   - Less glow churn
 *   - More companion comfort
 *
 * Does NOT change personality — only pacing profile.
 * Integrates with NPBehaviorPolicy.
 *
 * @module NPSessionPersonality
 */
;(function (w) {
  'use strict';

  /* ── Pacing profiles ────────────────────────────────────────────────────── */
  var PROFILES = {
    fresh: {
      label:                  'fresh',
      speechAggressiveness:   null,   // null = use policy default
      emotionIntensity:       null,
      silencePreference:      null,
      companionExpressiveness:null,
      ambientFrequency:       null,
      cooldownMultiplier:     null
    },
    settled: {
      label:                  'settled',
      speechAggressiveness:   0.60,
      emotionIntensity:       0.65,
      silencePreference:      0.45,
      companionExpressiveness:0.70,
      ambientFrequency:       0.55,
      cooldownMultiplier:     1.15
    },
    contemplative: {
      label:                  'contemplative',
      speechAggressiveness:   0.45,
      emotionIntensity:       0.55,
      silencePreference:      0.55,
      companionExpressiveness:0.55,
      ambientFrequency:       0.40,
      cooldownMultiplier:     1.30
    },
    restful: {
      label:                  'restful',
      speechAggressiveness:   0.30,
      emotionIntensity:       0.45,
      silencePreference:      0.65,
      companionExpressiveness:0.40,
      ambientFrequency:       0.28,
      cooldownMultiplier:     1.50
    }
  };

  /* Milestones: [ sessionMs, profile ] */
  var MILESTONES = [
    [0,          'fresh'],
    [30 * 60000, 'settled'],       // 30m
    [90 * 60000, 'contemplative'], // 1h30m
    [240 * 60000,'restful']        // 4h
  ];

  /* ── State ──────────────────────────────────────────────────────────────── */
  var _profile     = 'fresh';
  var _prevProfile = null;
  var _initialized = false;
  var _interval    = null;

  var TICK_MS = 60000; // check every minute

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  function _resolveProfile(sessionMs) {
    var label = 'fresh';
    for (var i = 0; i < MILESTONES.length; i++) {
      if (sessionMs >= MILESTONES[i][0]) label = MILESTONES[i][1];
    }
    return label;
  }

  function _applyProfile(profileLabel) {
    var p = PROFILES[profileLabel];
    if (!p || !w.NPBehaviorPolicy) return;

    /* Register as a named pack and activate it */
    var pack = {};
    Object.keys(p).forEach(function (k) {
      if (k !== 'label' && p[k] !== null) pack[k] = p[k];
    });
    NPBehaviorPolicy.registerPack('session-personality', pack);
    NPBehaviorPolicy.usePack('session-personality');
  }

  /* ── Tick ───────────────────────────────────────────────────────────────── */
  function _tick() {
    var sessionMs = w.NPRuntimeEcology
      ? NPRuntimeEcology.getSessionMs() : 0;
    var newProfile = _resolveProfile(sessionMs);

    if (newProfile !== _profile) {
      _prevProfile = _profile;
      _profile     = newProfile;
      _applyProfile(newProfile);

      if (w.NPBus) NPBus.emit('session:personality_drift', {
        profile:  newProfile,
        prev:     _prevProfile,
        sessionMs:sessionMs
      });
      if (w.NP_DEBUG) console.info('[NPSessionPersonality] drift →',
        newProfile, '(' + Math.round(sessionMs / 60000) + 'min)');
    }
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  function init() {
    if (_initialized) return;
    _initialized = true;
    _interval = setInterval(_tick, TICK_MS);
    setTimeout(_tick, 3000);
    if (w.NP_DEBUG) console.info('[NPSessionPersonality] init');
  }

  function getProfile() { return _profile; }
  function getProfiles() { return Object.keys(PROFILES); }
  function getMilestones() { return MILESTONES.slice(); }

  w.NPSessionPersonality = {
    init:          init,
    getProfile:    getProfile,
    getProfiles:   getProfiles,
    getMilestones: getMilestones
  };

}(window));
