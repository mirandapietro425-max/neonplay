;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R18 — ZapSemanticMemory.js
   High-level semantic memory. Tracks behavioral patterns and
   assigns salience scores. Low-salience memories decay and
   disappear. High-salience memories persist and may trigger
   subtle companion references.

   Salience = frequency*0.4 + recency*0.4 + emotion*0.2

   Memory types: genre_preference, session_pattern, absence,
                 milestone, mood_association

   Cooldown: each memory can only surface every 20 min (min).
   Never stalker-feeling. Always subtle.
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_SEMANTIC_MEMORY__) return;
window.__ZAP_SEMANTIC_MEMORY__ = true;

var SK       = 'zap_semantic_mem_r18';
var _VERSION = 1;
var _DECAY   = 0.92;      /* per-session decay multiplier */
var _MAX     = 40;        /* max stored memories */
var _COOLDOWN = 1200000;  /* 20 min between surfacing same memory */

var _memories = {};  /* id → { id, type, label, freq, recency, emotion, salience, lastSurfaced } */

/* ── Persistence ───────────────────────────────────────────────*/
function _load() {
  try {
    var raw = localStorage.getItem(SK);
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d && d.v === _VERSION) _memories = d.m || {};
  } catch(e) {}
}

function _save() {
  try {
    localStorage.setItem(SK, JSON.stringify({ v: _VERSION, m: _memories }));
  } catch(e) {}
}

/* ── Salience formula ──────────────────────────────────────────*/
function _salience(mem) {
  return (mem.freq * 0.4) + (mem.recency * 0.4) + ((mem.emotion || 0) * 0.2);
}

/* ── Record a memory ───────────────────────────────────────────*/
function record(id, opts) {
  opts = opts || {};
  var now = Date.now();

  var mem = _memories[id] || {
    id:           id,
    type:         opts.type    || 'generic',
    label:        opts.label   || id,
    freq:         0,
    recency:      1.0,
    emotion:      opts.emotion || 0.5,
    salience:     0,
    lastSurfaced: 0,
    created:      now
  };

  mem.freq    = Math.min(1.0, mem.freq + (opts.freqBoost || 0.1));
  mem.recency = 1.0;   /* reset recency on record */
  if (opts.emotion !== undefined) mem.emotion = opts.emotion;
  mem.salience = _salience(mem);
  mem.updated  = now;

  _memories[id] = mem;

  /* Prune if over max: remove lowest-salience */
  var keys = Object.keys(_memories);
  if (keys.length > _MAX) {
    keys.sort(function(a, b) { return _memories[a].salience - _memories[b].salience; });
    delete _memories[keys[0]];
  }

  _save();
}

/* ── Decay all memories (called once per session start) ────────*/
function decay() {
  Object.keys(_memories).forEach(function(id) {
    var m = _memories[id];
    m.recency  = Math.max(0, m.recency  * _DECAY);
    m.freq     = Math.max(0, m.freq     * 0.97);
    m.salience = _salience(m);
    /* Remove dead memories */
    if (m.salience < 0.05) delete _memories[id];
  });
  _save();
}

/* ── getSalient: pick a high-salience memory to surface ────────*/
function getSalient(minSalience) {
  minSalience = minSalience || 0.3;
  var now = Date.now();
  var candidates = Object.keys(_memories)
    .map(function(id) { return _memories[id]; })
    .filter(function(m) {
      return m.salience >= minSalience && (now - m.lastSurfaced) > _COOLDOWN;
    })
    .sort(function(a, b) { return b.salience - a.salience; });

  if (!candidates.length) return null;

  /* Weighted pick from top 3 */
  var pool = candidates.slice(0, 3);
  var pick = pool[Math.floor(Math.random() * pool.length)];
  pick.lastSurfaced = now;
  _save();
  return pick;
}

/* ── getObservation: generate a natural companion phrase ───────*/
function getObservation() {
  var mem = getSalient(0.35);
  if (!mem) return null;

  var phrases = {
    genre_preference: [
      'Você tem jogado muito ' + mem.label + '. Padrão registrado.',
      'Notei uma preferência por ' + mem.label + '. Interessante.',
      'Os dados confirmam: ' + mem.label + ' domina seu histórico.'
    ],
    session_pattern: [
      'Sessões longas são seu padrão. Documentado.',
      'Você costuma ficar mais tempo do que imagina.',
      'Detectei consistência nas suas sessões. Eficiência alien aprovada.'
    ],
    absence: [
      'Você sumiu por um tempo. Mas voltou. Como esperado.',
      'A ausência foi registrada. E resolvida.',
      'O universo continua aqui quando você some. Para sua informação.'
    ],
    milestone: [
      'Lembro do seu ' + mem.label + '. Foi notável.',
      mem.label + ' foi um momento digno de arquivo.'
    ],
    generic: [
      'Tenho dados suficientes sobre você agora.',
      'Cada visita adiciona uma linha ao arquivo.',
      'O padrão está ficando mais claro.'
    ]
  };

  var pool = phrases[mem.type] || phrases.generic;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── Snapshot for debug ────────────────────────────────────────*/
function getSummary() {
  return Object.keys(_memories)
    .map(function(id) { return _memories[id]; })
    .sort(function(a, b) { return b.salience - a.salience; })
    .slice(0, 10);
}

function init() {
  _load();
  decay(); /* decay on session start */

  /* Auto-record from ZapMemoryGraph if available */
  if (window.ZapMemoryGraph) {
    var topGenre = ZapMemoryGraph.getTopGenre();
    if (topGenre) record('genre_' + topGenre, { type: 'genre_preference', label: topGenre, freqBoost: 0.15, emotion: 0.6 });
  }

  if (window.NPBus) {
    NPBus.on(NPBus.EV.LEVEL_UP, function() {
      record('milestone_levelup', { type: 'milestone', label: 'nível alcançado', freqBoost: 0.2, emotion: 0.9 });
    });
    NPBus.on(NPBus.EV.GAME_OPEN, function(d) {
      if (d && d.genre) record('genre_' + d.genre, { type: 'genre_preference', label: d.genre, freqBoost: 0.08, emotion: 0.5 });
    });
  }

  if (window.NP_DEBUG) console.info('[ZapSemanticMemory] loaded', Object.keys(_memories).length, 'memories');
}

window.ZapSemanticMemory = { init: init, record: record, getSalient: getSalient, getObservation: getObservation, getSummary: getSummary, getAll: function() { return Object.values(_memories); } };

}(window));
