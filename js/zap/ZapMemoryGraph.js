;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — ZapMemoryGraph.js
   Semantic memory of real user patterns. Stores game opens,
   genre frequency, session hours, visit timestamps.
   Generates contextual observations with cooldowns to avoid spam.

   Storage: 'zap_memory_graph_r15'

   API:
     ZapMemoryGraph.init()
     ZapMemoryGraph.recordGameOpen(slug, genre)
     ZapMemoryGraph.recordSessionTime(minutes)
     ZapMemoryGraph.getObservation()    → string | null (with cooldown)
     ZapMemoryGraph.getTopGenre()       → string | null
     ZapMemoryGraph.getSummary()        → plain object (debug)
   ═══════════════════════════════════════════════════════════════ */

var SK       = 'zap_memory_graph_r15';
var COOLDOWN = 120000; /* 2 min between observations */

var _g = {
  genres:       {},   /* genre → count */
  games:        {},   /* slug  → count */
  sessionMins:  0,
  totalSessions:0,
  visitTs:      [],   /* last 14 visit timestamps */
  lastObsTs:    0,
  _version:     1
};

/* ── Persistence ── */
function _load() {
  try {
    var raw = localStorage.getItem(SK);
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d && d._version === 1) {
      _g.genres        = d.genres        || {};
      _g.games         = d.games         || {};
      _g.sessionMins   = d.sessionMins   || 0;
      _g.totalSessions = d.totalSessions || 0;
      _g.visitTs       = d.visitTs       || [];
      _g.lastObsTs     = d.lastObsTs     || 0;
    }
  } catch(e) {}
}

function _save() {
  try { localStorage.setItem(SK, JSON.stringify(_g)); } catch(e) {}
}

/* ── Data recording ── */
function recordGameOpen(slug, genre) {
  if (slug) { _g.games[slug]  = (_g.games[slug]  || 0) + 1; }
  if (genre) {
    var key = (genre || '').toLowerCase().trim();
    if (key) { _g.genres[key] = (_g.genres[key] || 0) + 1; }
    /* Nudge curiosity for first time in genre */
    if (_g.genres[key] === 1 && window.ZapPersonalityEngine) {
      ZapPersonalityEngine.nudge('curiosity', 0.02, 'new_genre');
    }
  }
  if (window.ZapAffinity) ZapAffinity.recordGameOpen();
  clearTimeout(recordGameOpen._t);
  recordGameOpen._t = setTimeout(_save, 4000);
}

function recordSessionTime(minutes) {
  _g.sessionMins   += minutes;
  _g.totalSessions++;
  if (minutes >= 10 && window.ZapAffinity) ZapAffinity.recordLongSession();
  if (window.ZapPersonalityEngine) {
    ZapPersonalityEngine.nudge('calmness', minutes > 15 ? 0.02 : 0.01, 'session_time');
  }
  _save();
}

/* ── Observation generation ── */
function getTopGenre() {
  var top = null, max = 0;
  Object.keys(_g.genres).forEach(function(g) {
    if (_g.genres[g] > max) { max = _g.genres[g]; top = g; }
  });
  return top;
}

function _daysSinceLastVisit() {
  if (!_g.visitTs.length) return null;
  return (Date.now() - _g.visitTs[_g.visitTs.length - 1]) / 86400000;
}

function _getHourPattern() {
  var h = new Date().getHours();
  if (h >= 22 || h < 5)  return 'late_night';
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 18) return 'daytime';
  return 'evening';
}

/* Returns an observation string, or null if on cooldown / nothing notable */
function getObservation() {
  var now = Date.now();
  if (now - _g.lastObsTs < COOLDOWN) return null;

  var obs = _buildObservation();
  if (!obs) return null;

  _g.lastObsTs = now;
  clearTimeout(getObservation._t);
  getObservation._t = setTimeout(_save, 2000);
  return obs;
}

function _buildObservation() {
  var h            = new Date().getHours();
  var topGenre     = getTopGenre();
  var daysSince    = _daysSinceLastVisit();
  var totalGames   = Object.values(_g.games).reduce(function(a,b){return a+b;},0);
  var ctx          = _g;

  var candidates   = [];

  /* Absence observation */
  if (daysSince !== null && daysSince > 3) {
    candidates.push({ w: 8, m: 'Faz ' + Math.floor(daysSince) + ' dias. Fui analisar asteroides. Bem-vindo de volta.' });
  }

  /* Genre pattern */
  if (topGenre && ctx.genres[topGenre] >= 5) {
    var label = topGenre.charAt(0).toUpperCase() + topGenre.slice(1);
    candidates.push({ w: 6, m: 'Percebi que você abre muito ' + label + '. Tendência catalogada. 🛸' });
    candidates.push({ w: 4, m: label + ' hein. Seu gênero favorito está registrado nos arquivos Zap.' });
  }

  /* Time pattern */
  if (h >= 23 || h < 4) {
    candidates.push({ w: 7, m: 'Tarde assim? No Planeta Zap é manhã cedo. Tem folga hoje?' });
    candidates.push({ w: 5, m: 'Madrugada de jogos. Padrão humano interessante.' });
  }
  if (h >= 5 && h < 9) {
    candidates.push({ w: 5, m: 'Cedo hoje. Energia matinal detectada.' });
  }

  /* Total play observation */
  if (totalGames >= 20) {
    candidates.push({ w: 3, m: totalGames + ' aberturas registradas. Você está bem catalogado. ✅' });
  }

  /* Long session */
  if (ctx.sessionMins >= 60) {
    candidates.push({ w: 4, m: 'Sessão longa hoje. Cuidado com os olhos. E com os humanos ao redor.' });
  }

  if (!candidates.length) return null;

  /* Weighted random pick */
  var total = candidates.reduce(function(a,c){return a+c.w;},0);
  var r     = Math.random() * total;
  var acc   = 0;
  for (var i = 0; i < candidates.length; i++) {
    acc += candidates[i].w;
    if (r <= acc) return candidates[i].m;
  }
  return candidates[candidates.length-1].m;
}

function getSummary() {
  return {
    topGenre:     getTopGenre(),
    genreCounts:  JSON.parse(JSON.stringify(_g.genres)),
    totalSessions:_g.totalSessions,
    sessionMins:  _g.sessionMins,
    daysSinceLast:_daysSinceLastVisit()
  };
}

function init() {
  _load();
  /* Record today's visit timestamp */
  _g.visitTs.push(Date.now());
  if (_g.visitTs.length > 14) _g.visitTs.shift();
  _save();
}

window.ZapMemoryGraph = {
  init:             init,
  recordGameOpen:   recordGameOpen,
  recordSessionTime:recordSessionTime,
  getObservation:   getObservation,
  getTopGenre:      getTopGenre,
  getSummary:       getSummary
};

}(window));