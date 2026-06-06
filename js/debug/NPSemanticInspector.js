;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R19 — NPSemanticInspector.js
   Debug-only inspector for ZapSemanticMemory.
   Shows: active memories, salience, cooldown, decay, frequency,
          last-used timestamps.

   Only meaningful when NP_DEBUG === true.
   Provides getSummary() for the debug overlay and
   getMemories() for console inspection.
   ═══════════════════════════════════════════════════════════════ */

if (window.__NP_SEMANTIC_INSPECTOR__) return;
window.__NP_SEMANTIC_INSPECTOR__ = true;

/* ── Helper: format ms as human string ─────────────────────────*/
function _fmtMs(ms) {
  if (ms < 0)       return 'available';
  if (ms < 60000)   return Math.round(ms / 1000) + 's';
  return Math.floor(ms / 60000) + 'm';
}

/* ── getMemories: pull and annotate ZapSemanticMemory data ─────*/
function getMemories() {
  if (!window.ZapSemanticMemory) return [];
  var mems = ZapSemanticMemory.getAll ? ZapSemanticMemory.getAll() : [];
  var now  = Date.now();

  return mems.map(function(m) {
    return {
      key:       m.key,
      type:      m.type,
      salience:  Math.round((m.salience || 0) * 100) / 100,
      freq:      m.frequency || 0,
      lastUsed:  m.lastUsed ? _fmtMs(now - m.lastUsed) + ' ago' : 'never',
      cooldown:  m.nextAvailableAt ? _fmtMs(m.nextAvailableAt - now) : 'available',
      decayRate: m.decayRate || 0
    };
  }).sort(function(a, b) { return b.salience - a.salience; });
}

/* ── getSummary: top-5 memories + count ────────────────────────*/
function getSummary() {
  var mems = getMemories();
  if (!mems.length) return 'semantic memory: empty';

  var lines = ['semantic memory (' + mems.length + ' total):'];
  mems.slice(0, 5).forEach(function(m) {
    lines.push(
      '  ' + (m.key + '                ').substring(0, 16) +
      ' sal=' + m.salience +
      ' cd=' + m.cooldown +
      ' f=' + m.freq
    );
  });

  return lines.join('\n');
}

/* ── logToConsole: full dump ───────────────────────────────────*/
function logToConsole() {
  if (!window.NP_DEBUG) return;
  var mems = getMemories();
  console.group('[NPSemanticInspector] ' + mems.length + ' memories');
  mems.forEach(function(m) { console.info(m.key, m); });
  console.groupEnd();
}

/* ── init ──────────────────────────────────────────────────────*/
function init() {
  if (window.NP_DEBUG) console.info('[NPSemanticInspector] ready');
}

window.NPSemanticInspector = {
  init:         init,
  getMemories:  getMemories,
  getSummary:   getSummary,
  logToConsole: logToConsole
};

}(window));
