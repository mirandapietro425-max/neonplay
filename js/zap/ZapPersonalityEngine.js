;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — ZapPersonalityEngine.js
   Persistent personality trait system. Traits evolve slowly based
   on user behavior, time of day, genres played, visit frequency.

   Traits (all 0.0–1.0):
     curiosity  — reacts to genre variety, questions
     energy     — time-of-day + session pace
     affection  — grows with return visits + interactions
     sarcasm    — rises with absence, high XP, veteran behavior
     calmness   — long sessions, slow play, puzzle genre

   Storage key: 'zap_personality_r15'

   API:
     ZapPersonalityEngine.init()
     ZapPersonalityEngine.get()            → trait snapshot
     ZapPersonalityEngine.getTrait(name)   → 0.0–1.0
     ZapPersonalityEngine.nudge(name, delta, reason?)  → safe small push
     ZapPersonalityEngine.getContext()     → context tag array
   ═══════════════════════════════════════════════════════════════ */

var SK = 'zap_personality_r15';

var _DEFAULTS = {
  curiosity: 0.55,
  energy:    0.55,
  affection: 0.30,
  sarcasm:   0.40,
  calmness:  0.50,
  _savedAt:  0,
  _version:  1
};

var _traits = null;

/* ── Persistence ── */
function _load() {
  try {
    var raw = localStorage.getItem(SK);
    if (!raw) return null;
    var d = JSON.parse(raw);
    if (!d || d._version !== 1) return null;
    return d;
  } catch(e) { return null; }
}

function _save() {
  try {
    _traits._savedAt = Date.now();
    localStorage.setItem(SK, JSON.stringify(_traits));
  } catch(e) {}
}

/* ── Clamp helper ── */
function _clamp(v) { return Math.max(0, Math.min(1, v)); }

/* ── Time-of-day energy modifier ── */
function _timeEnergyModifier() {
  var h = new Date().getHours();
  if (h >= 22 || h < 5)  return -0.15; /* late night → low energy */
  if (h >= 5  && h < 9)  return -0.05; /* early morning */
  if (h >= 9  && h < 12) return  0.10; /* morning peak */
  if (h >= 12 && h < 14) return  0.05; /* midday */
  if (h >= 14 && h < 17) return  0.08; /* afternoon */
  if (h >= 17 && h < 20) return  0.12; /* evening prime */
  if (h >= 20 && h < 22) return  0.05; /* night wind-down */
  return 0;
}

/* ── Apply time-of-day effects on init ── */
function _applySessionContext() {
  var h = new Date().getHours();

  /* energy follows time of day — small nudge only */
  nudge('energy', _timeEnergyModifier() * 0.3, 'time_of_day');

  /* late night slightly raises sarcasm, lowers calmness */
  if (h >= 23 || h < 4) {
    nudge('sarcasm',  0.02, 'late_night');
    nudge('calmness', -0.01, 'late_night');
  }
}

/* ── Apply days-since-last-visit effects ── */
function _applyAbsenceEffect() {
  var lastSeen = parseInt(localStorage.getItem('np_last_seen_ts') || '0', 10);
  if (!lastSeen) return;
  var daysSince = (Date.now() - lastSeen) / 86400000;

  if (daysSince > 7) {
    nudge('sarcasm',  0.05, 'long_absence');
    nudge('affection', -0.03, 'long_absence');
  } else if (daysSince > 2) {
    nudge('sarcasm',  0.02, 'short_absence');
  } else if (daysSince < 0.5) {
    nudge('affection', 0.02, 'same_day');
    nudge('energy',    0.02, 'same_day');
  }
}

/* ── Public: nudge a trait by delta (max ±0.05 per call for safety) ── */
function nudge(name, delta, reason) {
  if (!_traits || !(name in _traits)) return;
  var safe = Math.max(-0.05, Math.min(0.05, delta));
  _traits[name] = _clamp(_traits[name] + safe);
  /* debounced save */
  clearTimeout(nudge._saveTimer);
  nudge._saveTimer = setTimeout(_save, 3000);
}

/* ── Get context tags based on current state ── */
function getContext() {
  if (!_traits) return [];
  var tags = [];
  var h = new Date().getHours();

  /* Time tags */
  if (h >= 22 || h < 5)  tags.push('late_night');
  else if (h >= 5 && h < 10) tags.push('morning');
  else if (h >= 10 && h < 18) tags.push('daytime');
  else tags.push('evening');

  /* Trait-derived tags */
  if (_traits.curiosity > 0.7) tags.push('high_curiosity');
  if (_traits.energy    > 0.7) tags.push('high_energy');
  if (_traits.energy    < 0.35) tags.push('low_energy');
  if (_traits.affection > 0.6) tags.push('warm');
  if (_traits.affection > 0.8) tags.push('close_friend');
  if (_traits.sarcasm   > 0.65) tags.push('sarcastic');
  if (_traits.calmness  > 0.7) tags.push('calm');

  /* Absence */
  var lastSeen = parseInt(localStorage.getItem('np_last_seen_ts') || '0', 10);
  if (lastSeen) {
    var daysSince = (Date.now() - lastSeen) / 86400000;
    if (daysSince > 7)  tags.push('long_absence');
    else if (daysSince > 2) tags.push('returning');
    else if (daysSince < 0.5) tags.push('frequent_visitor');
  } else {
    tags.push('new_user');
  }

  /* Affinity level tag */
  var aff = window.ZapAffinity ? ZapAffinity.getLevel() : 0;
  if      (aff < 20)  tags.push('stranger');
  else if (aff < 50)  tags.push('acquaintance');
  else if (aff < 80)  tags.push('friend');
  else                tags.push('companion');

  return tags;
}

function get() {
  return _traits ? JSON.parse(JSON.stringify(_traits)) : JSON.parse(JSON.stringify(_DEFAULTS));
}

function getTrait(name) {
  return _traits ? (_traits[name] || 0) : (_DEFAULTS[name] || 0);
}

function init() {
  _traits = _load() || JSON.parse(JSON.stringify(_DEFAULTS));
  _applyAbsenceEffect();
  _applySessionContext();

  /* Mark today as seen */
  try { localStorage.setItem('np_last_seen_ts', String(Date.now())); } catch(e) {}

  /* Slow trait decay toward 0.5 — 1× per session, max ±0.01 */
  var NEUTRAL = 0.5;
  ['curiosity','energy','affection','sarcasm','calmness'].forEach(function(t) {
    var diff = NEUTRAL - _traits[t];
    if (Math.abs(diff) > 0.02) nudge(t, diff * 0.04, 'homeostasis');
  });

  _save();
}

window.ZapPersonalityEngine = {
  init:       init,
  get:        get,
  getTrait:   getTrait,
  nudge:      nudge,
  getContext: getContext
};

}(window));