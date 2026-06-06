;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R17 — ZapPresencePersistence.js
   Long-term emotional continuity for the Zap companion.
   Stores emotional milestones, rare persistent events,
   and generates subtle historical callbacks.

   The goal is "the companion evolves with you", not surveillance.
   All data stays in localStorage. No tracking. No PII.

   Storage key: 'zap_presence_r17'

   What it tracks:
     - Total sessions
     - First-ever visit timestamp
     - Milestone XP snapshots (first 100, first 500, first 1000...)
     - Rare "memory seeds" — one-time observations stored permanently
     - Last greeted context (so we don't repeat the same greeting)

   API:
     ZapPresencePersistence.recordMilestone(type, value)
     ZapPresencePersistence.getMilestones()             → array
     ZapPresencePersistence.seedMemory(id, data)        → bool (false if already seeded)
     ZapPresencePersistence.getMemory(id)               → data | null
     ZapPresencePersistence.generateCallback()          → string | null (subtle reference)
     ZapPresencePersistence.init()
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_PRESENCE_PERSIST__) return;
window.__ZAP_PRESENCE_PERSIST__ = true;

var SK = 'zap_presence_r17';

var _data = {
  firstVisit:   null,   /* ISO timestamp of first ever visit */
  sessions:     0,
  milestones:   [],     /* [{ type, value, ts }] */
  memories:     {},     /* { id: { ts, data } } */
  lastCallback: 0,      /* ts of last historical callback */
  _version:     1
};

/* ── Persistence ─────────────────────────────────────────────── */
function _load() {
  try {
    var raw = localStorage.getItem(SK);
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d && d._version === 1) {
      _data.firstVisit   = d.firstVisit   || null;
      _data.sessions     = d.sessions     || 0;
      _data.milestones   = d.milestones   || [];
      _data.memories     = d.memories     || {};
      _data.lastCallback = d.lastCallback || 0;
    }
  } catch(e) {}
}

function _save() {
  try { localStorage.setItem(SK, JSON.stringify(_data)); } catch(e) {}
}

/* ── Milestones ──────────────────────────────────────────────── */
function recordMilestone(type, value) {
  /* Deduplicate: one entry per (type, value) pair */
  var exists = _data.milestones.some(function(m){ return m.type === type && m.value === value; });
  if (exists) return;
  _data.milestones.push({ type: type, value: value, ts: Date.now() });
  if (_data.milestones.length > 50) _data.milestones.shift(); /* cap */
  _save();
}

function getMilestones() { return _data.milestones.slice(); }

/* ── Memory seeds — one-time persistent observations ─────────── */
function seedMemory(id, data) {
  if (_data.memories[id]) return false; /* already seeded */
  _data.memories[id] = { ts: Date.now(), data: data };
  _save();
  return true;
}

function getMemory(id) {
  return _data.memories[id] || null;
}

/* ── Historical callbacks — subtle references to past ─────────── */
var _CALLBACKS = [
  {
    cond: function() { return _data.sessions >= 10 && !_data.memories['cb_10sessions']; },
    msg:  'Décima sessão registrada. Você está se tornando um dado confiável.',
    seed: 'cb_10sessions'
  },
  {
    cond: function() { return _data.sessions >= 30 && !_data.memories['cb_30sessions']; },
    msg:  'Trinta sessões. No Planeta Zap isso já seria suficiente para uma classificação oficial.',
    seed: 'cb_30sessions'
  },
  {
    cond: function() {
      if (!_data.firstVisit) return false;
      var days = (Date.now() - new Date(_data.firstVisit).getTime()) / 86400000;
      return days >= 30 && !_data.memories['cb_30days'];
    },
    msg:  'Você usa o NeonPlay há mais de um mês. Minha análise inicial estava certa.',
    seed: 'cb_30days'
  },
  {
    cond: function() {
      var ms = _data.milestones.find(function(m){ return m.type==='xp' && m.value>=1000; });
      return ms && !_data.memories['cb_xp1000'];
    },
    msg:  'Mil pontos de XP. Registrado. Você joga mais do que aparenta.',
    seed: 'cb_xp1000'
  }
];

/* generateCallback returns a one-time message, max once per 10 min */
function generateCallback() {
  var now = Date.now();
  if (now - _data.lastCallback < 600000) return null; /* 10 min cooldown */

  for (var i = 0; i < _CALLBACKS.length; i++) {
    var cb = _CALLBACKS[i];
    try {
      if (cb.cond()) {
        seedMemory(cb.seed, { ts: now });
        _data.lastCallback = now;
        _save();
        return cb.msg;
      }
    } catch(e) {}
  }
  return null;
}

/* ── XP milestone watcher ────────────────────────────────────── */
var _xpMilestones = [100, 500, 1000, 2500, 5000, 10000];

function _watchXP() {
  if (!window.ZapProgressionSystem) return;
  try {
    var prog = ZapProgressionSystem.getProgress ? ZapProgressionSystem.getProgress() : null;
    if (!prog) return;
    var xp = prog.xp || 0;
    _xpMilestones.forEach(function(m) {
      if (xp >= m) recordMilestone('xp', m);
    });
  } catch(e) {}
}

function init() {
  _load();

  /* First ever visit */
  if (!_data.firstVisit) {
    _data.firstVisit = new Date().toISOString();
  }
  _data.sessions++;
  _save();

  /* XP milestone check — once per session */
  setTimeout(_watchXP, 3000);

  /* Historical callback — check after user settles (20s) */
  setTimeout(function() {
    var msg = generateCallback();
    if (msg && window.ZapSpeechQueue) {
      ZapSpeechQueue.enqueue(msg, { category: 'emotional', id: 'hist_cb_' + Date.now(), cooldown: 0 });
    } else if (msg && window.zapSpeakDirect) {
      window.zapSpeakDirect(msg);
    }
  }, 20000);

  /* Wire XP gain to check milestones */
  if (window.NPBus) {
    NPBus.on(NPBus.EV.XP_GAIN, _watchXP);
  }

  if (window.NP_DEBUG) console.info('[ZapPresencePersistence] sessions=', _data.sessions, 'milestones=', _data.milestones.length);
}

window.ZapPresencePersistence = {
  init:             init,
  recordMilestone:  recordMilestone,
  getMilestones:    getMilestones,
  seedMemory:       seedMemory,
  getMemory:        getMemory,
  generateCallback: generateCallback
};

}(window));