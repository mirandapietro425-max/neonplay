;(function(window){
'use strict';
 
/* ═══════════════════════════════════════════════════════════════
   NeonPlay R14 — ZapMoodSystem.js
   Mood state machine + drawAlien glow injection
 
   Depends on: NPBus, NPUtils (loaded before this)
   Exports: window.ZapMoodSystem
 
   Moods:
     idle · happy · excited · sleepy · curious · dreaming
═══════════════════════════════════════════════════════════════ */
 
if(window.__ZAP_MOOD__) return;
window.__ZAP_MOOD__ = true;
 
var _MOODS = {
  idle:     'idle',
  happy:    'happy',
  excited:  'excited',
  sleepy:   'sleepy',
  curious:  'curious',
  dreaming: 'dreaming'
};
 
var _current  = _MOODS.idle;
var _moodTimerName = 'mood_reset';
 
var _GLOW = {
  idle:     'drop-shadow(0 0 14px rgba(0,212,255,.5))',
  happy:    'drop-shadow(0 0 20px rgba(109,224,49,.7))',
  excited:  'drop-shadow(0 0 28px rgba(245,197,24,.9))',
  sleepy:   'drop-shadow(0 0 8px rgba(0,212,255,.2))',
  curious:  'drop-shadow(0 0 22px rgba(147,51,234,.75))',
  dreaming: 'drop-shadow(0 0 6px rgba(147,51,234,.3))'
};
 
function _applyGlow(){
  try{
    var wrap = document.getElementById('nphAlienWrap');
    if(wrap) wrap.style.filter = _GLOW[_current] || _GLOW.idle;
  }catch(e){}
}
 
function setMood(mood, durationMs){
  if(!_MOODS[mood]) mood = _MOODS.idle;
  var prev = _current;
  _current = mood;
  _applyGlow();
 
  if(window.NPUtils) NPUtils.timer.clearSafeTimeout(_moodTimerName);
  else clearTimeout(window._zapMoodTimer);
 
  /* Auto-reset transient moods */
  if(mood !== _MOODS.idle && mood !== _MOODS.sleepy && mood !== _MOODS.dreaming){
    var dur = durationMs || 4000;
    if(window.NPUtils){
      NPUtils.timer.safeTimeout(_moodTimerName, function(){ setMood(_MOODS.idle); }, dur);
    } else {
      window._zapMoodTimer = setTimeout(function(){ setMood(_MOODS.idle); }, dur);
    }
  }
 
  if(prev !== mood && window.NPBus) NPBus.emit(NPBus.EV.MOOD_CHANGE, { mood: mood, prev: prev });
  if(window.NP_DEBUG) NPUtils.log.info('Mood:', prev, '->', mood);
}
 
function getMood(){ return _current; }
 
/* ── Hook drawAlien (called from neonplay-init.js after it defines it) ── */
function hookDrawAlien(){
  if(typeof drawAlien !== 'function' || drawAlien._moodHooked) return;
  var _orig = drawAlien;
  drawAlien = function(C, cx, cy, sc, si, mode){
    _applyGlow();
    if(_current === _MOODS.sleepy || _current === _MOODS.dreaming){
      var alpha = _current === _MOODS.dreaming ? 0.5 : 0.7;
      C.save();
      C.globalAlpha = alpha;
      _orig(C, cx, cy, sc, si, mode);
      C.restore();
    } else {
      _orig(C, cx, cy, sc, si, mode);
    }
  };
  drawAlien._moodHooked = true;
  if(window.NP_DEBUG) NPUtils.log.info('ZapMoodSystem: drawAlien hooked');
}
 
/* ── Wire NPBus events ─────────────────── */
function _wireEvents(){
  if(!window.NPBus) return;
  NPBus.on(NPBus.EV.XP_GAIN,    function(){ setMood('happy',   3500); });
  NPBus.on(NPBus.EV.LEVEL_UP,   function(){ setMood('excited', 6000); });
  NPBus.on(NPBus.EV.GAME_OPEN,  function(){ setMood('curious', 5000); });
  NPBus.on(NPBus.EV.IDLE_SLEEPY,  function(){ setMood('sleepy'); });
  NPBus.on(NPBus.EV.IDLE_DREAMING,function(){ setMood('dreaming'); });
  NPBus.on(NPBus.EV.IDLE_ACTIVE,  function(){ if(_current === 'sleepy' || _current === 'dreaming') setMood('idle'); });
}
 
window.ZapMoodSystem = {
  MOODS:    _MOODS,
  setMood:  setMood,
  getMood:  getMood,
  hookDrawAlien: hookDrawAlien,
  init: function(){
    hookDrawAlien();
    _wireEvents();
    if(window.NP_DEBUG) NPUtils.log.info('ZapMoodSystem ready');
  }
};
 
/* Backwards-compat aliases used directly in neonplay-init.js */
window.ZAP_MOODS = _MOODS;
window.setZapMood = setMood;
 
})(window);
 