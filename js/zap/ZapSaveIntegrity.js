;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R17 — ZapSaveIntegrity.js
   Lightweight save integrity layer.
   Wraps localStorage access with checksum validation,
   corruption detection, partial recovery, and auto-backup.

   Does NOT alter existing save keys or formats.
   Only adds integrity metadata alongside existing saves.

   Integrity key: 'zap_integrity_r17'  → { checksums, backups, version }

   API:
     ZapSaveIntegrity.verify(key)               → { ok, reason }
     ZapSaveIntegrity.snapshot(key)             → void (saves a backup copy)
     ZapSaveIntegrity.restore(key)              → bool (restores from backup if available)
     ZapSaveIntegrity.runBootCheck()            → void (checks all known save keys)
     ZapSaveIntegrity.init()
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_SAVE_INTEGRITY__) return;
window.__ZAP_SAVE_INTEGRITY__ = true;

var META_KEY = 'zap_integrity_r17';

/* Known save keys to protect */
var GUARDED_KEYS = [
  'zap_prog_v1',
  'zap_quests_v1',
  'zap_wallet_v1',
  'zap_store_v1',
  'zap_memory_graph_r15',
  'zap_presence_r17',
  'zap_personality_r15',
  'zap_affinity_r15'
];

/* ── Simple checksum (djb2) ─────────────────────────────────── */
function _checksum(str) {
  if (!str) return '0';
  var h = 5381;
  for (var i = 0; i < Math.min(str.length, 4096); i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/* ── Load/save metadata ─────────────────────────────────────── */
var _meta = { checksums: {}, backups: {}, _version: 1 };

function _loadMeta() {
  try {
    var raw = localStorage.getItem(META_KEY);
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d && d._version === 1) {
      _meta.checksums = d.checksums || {};
      _meta.backups   = d.backups   || {};
    }
  } catch(e) {}
}

function _saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(_meta)); } catch(e) {}
}

/* ── verify(key) → { ok, reason } ───────────────────────────── */
function verify(key) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null) return { ok: true, reason: 'empty' }; /* missing = fresh, not corrupt */

    /* Parse check */
    JSON.parse(raw);

    /* Checksum check */
    var stored = _meta.checksums[key];
    if (stored) {
      var actual = _checksum(raw);
      if (actual !== stored) return { ok: false, reason: 'checksum_mismatch' };
    }

    return { ok: true, reason: 'ok' };
  } catch(e) {
    return { ok: false, reason: 'parse_error' };
  }
}

/* ── snapshot(key) ───────────────────────────────────────────── */
function snapshot(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return;
    _meta.backups[key]   = raw;
    _meta.checksums[key] = _checksum(raw);
    _saveMeta();
  } catch(e) {}
}

/* ── restore(key) → bool ─────────────────────────────────────── */
function restore(key) {
  var backup = _meta.backups[key];
  if (!backup) return false;
  try {
    JSON.parse(backup); /* validate backup is itself valid */
    localStorage.setItem(key, backup);
    _meta.checksums[key] = _checksum(backup);
    _saveMeta();
    if (window.NP_DEBUG) console.info('[ZapSaveIntegrity] restored', key, 'from backup');
    return true;
  } catch(e) {
    return false;
  }
}

/* ── updateChecksum — call after any intentional write ──────── */
function updateChecksum(key) {
  try {
    var raw = localStorage.getItem(key);
    if (raw) _meta.checksums[key] = _checksum(raw);
    _saveMeta();
  } catch(e) {}
}

/* ── runBootCheck — verify all guarded keys on startup ──────── */
function runBootCheck() {
  var issues = 0;
  GUARDED_KEYS.forEach(function(key) {
    var result = verify(key);
    if (!result.ok) {
      issues++;
      if (window.NP_DEBUG) console.warn('[ZapSaveIntegrity] corruption detected:', key, result.reason);
      /* Attempt restore */
      var restored = restore(key);
      if (!restored) {
        /* Can't restore — remove corrupted key so system starts fresh */
        try { localStorage.removeItem(key); } catch(e) {}
        if (window.NP_DEBUG) console.warn('[ZapSaveIntegrity] cleared corrupted key:', key);
      }
    }
  });
  if (window.NP_DEBUG && issues === 0) console.info('[ZapSaveIntegrity] all saves OK');
}

/* ── Auto-snapshot on visibility hide ───────────────────────── */
function _autoSnapshot() {
  GUARDED_KEYS.forEach(snapshot);
}

function init() {
  _loadMeta();
  runBootCheck();

  /* Take initial snapshots (safe baseline) */
  setTimeout(_autoSnapshot, 2000);

  /* Re-snapshot before user leaves (or hides tab) */
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) _autoSnapshot();
  });

  window.addEventListener('beforeunload', _autoSnapshot);

  if (window.NP_DEBUG) console.info('[ZapSaveIntegrity] ready, guarding', GUARDED_KEYS.length, 'keys');
}

window.ZapSaveIntegrity = {
  verify:          verify,
  snapshot:        snapshot,
  restore:         restore,
  updateChecksum:  updateChecksum,
  runBootCheck:    runBootCheck,
  init:            init
};

}(window));