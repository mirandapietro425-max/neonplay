;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — ZapAffinity.js
   Relationship level 0–100. Grows VERY slowly. Persists across
   sessions. Changes Zap's tone at thresholds.

   Thresholds:
     0–19   → stranger     (neutral, slightly curious)
     20–49  → acquaintance (warmer, occasional humor)
     50–79  → friend       (familiar, uses memory)
     80–100 → companion    (personal, confiding)

   Gain rates (per event, slow by design):
     visit/day      +0.5   (once per calendar day)
     game opened    +0.08
     interaction    +0.3   (clicking Zap)
     long session   +0.2   (>10 min)
     streak         +0.5/day

   Decay: none (affinity is earned, not lost)

   Storage: 'zap_affinity_r15'
   ═══════════════════════════════════════════════════════════════ */

var SK = 'zap_affinity_r15';
var _aff  = 0;
var _meta = { lastVisitDay: '', totalVisits: 0 };

function _load() {
  try {
    var raw = localStorage.getItem(SK);
    if (!raw) return;
    var d = JSON.parse(raw);
    _aff  = Math.min(100, Math.max(0, d.aff || 0));
    _meta = d.meta || _meta;
  } catch(e) {}
}

function _save() {
  try { localStorage.setItem(SK, JSON.stringify({ aff: _aff, meta: _meta })); }
  catch(e) {}
}

function _todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

/* ── Public API ── */
function gain(amount, reason) {
  var before = _aff;
  _aff = Math.min(100, _aff + Math.max(0, amount));
  if (_aff !== before) {
    clearTimeout(gain._t);
    gain._t = setTimeout(_save, 2000);
    if (window.NPBus) NPBus.emit('affinity:change', { level: _aff, reason: reason });
    if (window.NPMetrics) NPMetrics.set('affinityLevel', Math.round(_aff));
  }
}

function getLevel() { return _aff; }

function getTier() {
  if (_aff < 20) return 'stranger';
  if (_aff < 50) return 'acquaintance';
  if (_aff < 80) return 'friend';
  return 'companion';
}

/* Daily visit bonus — called once per calendar day */
function recordVisit() {
  var today = _todayKey();
  if (_meta.lastVisitDay === today) return false;
  _meta.lastVisitDay = today;
  _meta.totalVisits++;
  gain(0.5, 'daily_visit');
  /* Boost personality affection */
  if (window.ZapPersonalityEngine) ZapPersonalityEngine.nudge('affection', 0.015, 'daily_visit');
  return true;
}

function recordGameOpen() {
  gain(0.08, 'game_open');
}

function recordInteraction() {
  gain(0.3, 'interaction');
  if (window.ZapPersonalityEngine) ZapPersonalityEngine.nudge('affection', 0.01, 'interaction');
}

function recordLongSession() {
  gain(0.2, 'long_session');
  if (window.ZapPersonalityEngine) ZapPersonalityEngine.nudge('calmness', 0.01, 'long_session');
}

function init() {
  _load();
  recordVisit();
  if (window.NPMetrics) NPMetrics.set('affinityLevel', Math.round(_aff));
}

window.ZapAffinity = {
  init:              init,
  gain:              gain,
  getLevel:          getLevel,
  getTier:           getTier,
  recordVisit:       recordVisit,
  recordGameOpen:    recordGameOpen,
  recordInteraction: recordInteraction,
  recordLongSession: recordLongSession
};

}(window));