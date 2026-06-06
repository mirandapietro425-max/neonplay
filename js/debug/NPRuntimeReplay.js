;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPRuntimeReplay.js
   Textual timeline of the last ~5 minutes of runtime activity.
   Records: emotion transitions, speeches, silences, ambient
   events, state changes, fatigue spikes, ecology mode changes.

   Max 400 entries. Each entry is lightweight (<200 bytes).
   Zero allocation in prod when NP_DEBUG is false.
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_RUNTIME_REPLAY__) return;
window.__NP_RUNTIME_REPLAY__ = true;

var _BUF     = [];
var _MAX     = 400;
var _start   = typeof performance !== 'undefined' ? performance.now() : Date.now();

/* ── Entry types ───────────────────────────────────────────────*/
var TYPE = {
  EMOTION   : 'EMO',
  SPEECH    : 'SPK',
  SILENCE   : 'SIL',
  AMBIENT   : 'AMB',
  STATE     : 'ST',
  FATIGUE   : 'FAT',
  ECOLOGY   : 'ECO',
  ATTENTION : 'ATT',
  INTENT    : 'INT'
};

/* ── Core push ─────────────────────────────────────────────────*/
function _push(type, label, detail) {
  var now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  _BUF.push({ t: Math.round(now - _start), type: type, label: label, d: detail || null });
  if (_BUF.length > _MAX) _BUF.shift();
}

/* ── Public record API (called by other systems) ───────────────*/
function recordEmotion(from, to, momentum) {
  _push(TYPE.EMOTION, from + '→' + to, { momentum: momentum });
}

function recordSpeech(text, category) {
  /* Truncate text for compactness */
  var preview = typeof text === 'string' ? text.substring(0, 60) : '(?)';
  _push(TYPE.SPEECH, category || 'ambient', { text: preview });
}

function recordSilence(silenceType, durationMs) {
  _push(TYPE.SILENCE, silenceType, { durS: Math.round(durationMs / 1000) });
}

function recordAmbient(eventName) {
  _push(TYPE.AMBIENT, eventName);
}

function recordState(from, to, source) {
  _push(TYPE.STATE, from + '→' + to, { src: source || '?' });
}

function recordFatigue(level, trigger) {
  _push(TYPE.FATIGUE, trigger || 'tick', { level: Math.round(level) });
}

function recordEcology(mode, health) {
  _push(TYPE.ECOLOGY, mode, { health: Math.round(health) });
}

function recordIntent(intent, previous) {
  _push(TYPE.INTENT, (previous || '?') + '→' + intent);
}

/* R20: Governor narrative entry */
function recordGovernor(mode, reason) {
  _push('GOVERNOR', mode, { reason: (reason || '').slice(0, 60) });
}

/* ── Format helpers ────────────────────────────────────────────*/
function _fmtMs(ms) {
  if (ms < 60000) return Math.round(ms / 1000) + 's';
  return Math.floor(ms / 60000) + 'm' + Math.round((ms % 60000) / 1000) + 's';
}

/* ── getText: human-readable timeline ──────────────────────────*/
function getText(limitEntries) {
  var items = limitEntries ? _BUF.slice(-limitEntries) : _BUF;
  if (!items.length) return '(no events yet)';

  var lines = items.map(function(e) {
    var time = '[+' + _fmtMs(e.t) + ']';
    var detail = '';
    if (e.d) {
      if (e.type === TYPE.SPEECH)   detail = ' "' + e.d.text + '"';
      if (e.type === TYPE.SILENCE)  detail = ' (' + e.d.durS + 's)';
      if (e.type === TYPE.EMOTION)  detail = ' mom=' + e.d.momentum;
      if (e.type === TYPE.ECOLOGY)  detail = ' hp=' + e.d.health;
      if (e.type === TYPE.FATIGUE)  detail = ' lv=' + e.d.level;
    }
    return time + ' [' + e.type + '] ' + e.label + detail;
  });

  return lines.join('\n');
}

/* ── getSlice: last N entries as objects ───────────────────────*/
function getSlice(n) {
  return _BUF.slice(-(n || 50));
}

/* ── stats: summary counts ─────────────────────────────────────*/
function getStats() {
  var counts = {};
  _BUF.forEach(function(e) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  });
  return { total: _BUF.length, max: _MAX, byType: counts };
}

/* ── clear ─────────────────────────────────────────────────────*/
function clear() { _BUF.length = 0; }

/* ── NPBus auto-wiring ─────────────────────────────────────────*/
function _wireEvents() {
  if (!window.NPBus) return;
  var B = window.NPBus;

  B.on('zap:speak',            function(d) { recordSpeech(d && d.text, d && d.category); });
  B.on('zap:state_change',     function(d) { if (d) recordState(d.previous, d.current, d.source); });
  B.on('ecology:mode_change',  function(d) { if (d) recordEcology(d.mode, d.health); });
  B.on('zap:intent_change',    function(d) { if (d) recordIntent(d.intent, d.previous); });

  /* Silence events */
  B.on('zap:silence_enter',    function(d) { if (d) recordSilence(d.type, d.duration || 0); });
}

function init() {
  _wireEvents();
  if (window.NP_DEBUG) console.info('[NPRuntimeReplay] ready — max ' + _MAX + ' entries');
}

window.NPRuntimeReplay = {
  init:           init,
  recordEmotion:  recordEmotion,
  recordSpeech:   recordSpeech,
  recordSilence:  recordSilence,
  recordAmbient:  recordAmbient,
  recordState:    recordState,
  recordFatigue:  recordFatigue,
  recordEcology:  recordEcology,
  recordGovernor: recordGovernor,
  recordIntent:   recordIntent,
  getText:        getText,
  getSlice:       getSlice,
  getStats:       getStats,
  clear:          clear,
  TYPE:           TYPE
};

}(window));
