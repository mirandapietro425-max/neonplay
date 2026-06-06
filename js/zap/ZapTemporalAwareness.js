;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R18 — ZapTemporalAwareness.js
   Detects temporal context and generates mood tags based on
   time-of-day, session duration, weekly cadence, and absence.

   Temporal moods (one active at a time):
     calm_night        — 0h–6h
     quiet_morning     — 6h–9h
     active_day        — 9h–18h
     golden_hour       — 18h–21h
     night_session     — 21h–24h
     exhausted_session — session > 90 min
     hyper_session     — >4 visits today
     nostalgic_return  — absent 7–30 days
     ghost_return      — absent >30 days
     regular_habit     — visited 5+ of last 7 days

   Integrates tags into ZapContextEngine and EmotionModel.
   ═══════════════════════════════════════════════════════════════ */

if (window.__ZAP_TEMPORAL_AWARENESS__) return;
window.__ZAP_TEMPORAL_AWARENESS__ = true;

var SK = 'zap_temporal_r18';

var _data = {
  todayVisits: 0,
  lastSeen:    0,
  weekVisits:  [],    /* timestamps of last 14 visits */
  _version:    1
};

var _sessionStart = Date.now();
var _temporalMood = 'active_day';
var _tags = [];

/* ── Persistence ───────────────────────────────────────────────*/
function _load() {
  try {
    var raw = localStorage.getItem(SK);
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d && d._version === 1) {
      _data.lastSeen    = d.lastSeen    || 0;
      _data.todayVisits = d.todayVisits || 0;
      _data.weekVisits  = d.weekVisits  || [];
      /* Reset todayVisits if day changed */
      var today = new Date().toDateString();
      var last  = _data.lastSeen ? new Date(_data.lastSeen).toDateString() : '';
      if (today !== last) _data.todayVisits = 0;
    }
  } catch(e) {}
}

function _save() {
  try { localStorage.setItem(SK, JSON.stringify(_data)); } catch(e) {}
}

/* ── Time-of-day detection ─────────────────────────────────────*/
function _timeOfDay() {
  var h = new Date().getHours();
  if      (h >= 0  && h < 6)  return 'calm_night';
  else if (h >= 6  && h < 9)  return 'quiet_morning';
  else if (h >= 9  && h < 18) return 'active_day';
  else if (h >= 18 && h < 21) return 'golden_hour';
  else                          return 'night_session';
}

/* ── Session duration ──────────────────────────────────────────*/
function getSessionMinutes() {
  return Math.round((Date.now() - _sessionStart) / 60000);
}

/* ── Weekly frequency ──────────────────────────────────────────*/
function _daysActiveLastWeek() {
  var weekAgo  = Date.now() - 7 * 86400000;
  var days     = new Set();
  _data.weekVisits.forEach(function(ts) {
    if (ts > weekAgo) days.add(new Date(ts).toDateString());
  });
  return days.size;
}

/* ── Days since last visit ─────────────────────────────────────*/
function _daysSinceLast() {
  if (!_data.lastSeen) return 0;
  return (Date.now() - _data.lastSeen) / 86400000;
}

/* ── Compute tags ──────────────────────────────────────────────*/
function _compute() {
  var tags  = [];
  var h     = new Date().getHours();
  var tod   = _timeOfDay();
  var mins  = getSessionMinutes();
  var dsl   = _daysSinceLast();
  var daw   = _daysActiveLastWeek();

  /* Time of day */
  tags.push(tod);
  if (h >= 0 && h < 4) tags.push('deep_night');

  /* Session length */
  if (mins > 90)  tags.push('exhausted_session');
  if (mins > 40)  tags.push('long_session');
  if (mins > 5)   tags.push('settled_session');

  /* Frequency */
  if (_data.todayVisits >= 4) tags.push('hyper_session');
  if (daw >= 5)               tags.push('regular_habit');

  /* Absence */
  if (dsl > 30)   tags.push('ghost_return');
  else if (dsl > 7)  tags.push('nostalgic_return');
  else if (dsl > 2)  tags.push('returning');
  else if (dsl < 0.5 && _data.todayVisits > 1) tags.push('frequent_today');

  _tags = tags;

  /* Derive primary temporal mood */
  if (tags.indexOf('ghost_return') >= 0)      _temporalMood = 'ghost_return';
  else if (tags.indexOf('nostalgic_return') >= 0) _temporalMood = 'nostalgic_return';
  else if (tags.indexOf('exhausted_session') >= 0) _temporalMood = 'exhausted_session';
  else if (tags.indexOf('hyper_session') >= 0) _temporalMood = 'hyper_session';
  else if (tags.indexOf('regular_habit') >= 0) _temporalMood = 'regular_habit';
  else _temporalMood = tod;

  if (window.NPMetrics) NPMetrics.set('temporalMood', _temporalMood);

  /* Push emotional hint to EmotionModel */
  if (window.ZapEmotionModel) {
    if (_temporalMood === 'calm_night' || _temporalMood === 'exhausted_session') {
      ZapEmotionModel.push('sleepy', 0.2);
    } else if (_temporalMood === 'nostalgic_return' || _temporalMood === 'ghost_return') {
      ZapEmotionModel.push('curious', 0.3);
    }
  }
}

/* ── Public API ────────────────────────────────────────────────*/
function getTags()         { return _tags.slice(); }
function getTemporalMood() { return _temporalMood; }
function hasTag(tag)       { return _tags.indexOf(tag) >= 0; }

/* ── Init ──────────────────────────────────────────────────────*/
function init() {
  _load();
  _data.todayVisits++;
  _data.weekVisits.push(Date.now());
  if (_data.weekVisits.length > 28) _data.weekVisits.shift();
  _data.lastSeen = Date.now();
  _save();

  _compute();

  /* Refresh every 5 min */
  if (window.NPClock) {
    NPClock.registerTask(function() { _compute(); _save(); }, 300000, { label: 'temporal_awareness' });
  } else {
    setInterval(function() { _compute(); _save(); }, 300000);
  }

  /* Feed tags into ZapContextEngine if available */
  if (window.ZapContextEngine && ZapContextEngine.injectTags) {
    ZapContextEngine.injectTags(_tags);
  }

  if (window.NP_DEBUG) console.info('[ZapTemporalAwareness] mood:', _temporalMood, 'tags:', _tags);
}

window.ZapTemporalAwareness = { init: init, getTags: getTags, getTemporalMood: getTemporalMood, hasTag: hasTag, getSessionMinutes: getSessionMinutes };

}(window));
