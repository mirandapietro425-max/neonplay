;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — ZapPresence.js
   Presence simulation layer. Applies subtle CSS micro-animations
   to #nphAlienWrap so the Zap feels alive without touching canvas.

   Effects (all CSS, no canvas intervention):
     breathing    — subtle scale pulse (2.8s)
     floating     — gentle y-offset sine (4.5s)
     blink        — occasional filter flash (random 6–14s)
     dreaming     — slow glow pulse + particle hint
     speaking     — light jitter while bubble open

   Relies on NPClock for scheduling.
   Safe: no-op if #nphAlienWrap not found (game.html).
   ═══════════════════════════════════════════════════════════════ */

var _wrap       = null;
var _style      = null;
var _active     = false;
var _dreamMode  = false;
var _blinkTimer = null;

/* ── Inject keyframe styles once ── */
function _injectStyles() {
  if (document.getElementById('zap-presence-styles')) return;
  var s = document.createElement('style');
  s.id  = 'zap-presence-styles';
  s.textContent = [
    '@keyframes zp-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.028)}}',
    '@keyframes zp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '@keyframes zp-dream{0%,100%{filter:drop-shadow(0 0 12px rgba(0,212,255,.4))}50%{filter:drop-shadow(0 0 28px rgba(147,51,234,.65))}}',
    '@keyframes zp-speak{0%,100%{transform:translateY(0) scale(1)}25%{transform:translateY(-1px) scale(1.012)}75%{transform:translateY(1px) scale(.992)}}',
    /* Combined states */
    '.zp-idle   {animation:zp-breathe 2.8s ease-in-out infinite,zp-float 4.5s ease-in-out infinite}',
    '.zp-dream  {animation:zp-breathe 5s ease-in-out infinite,zp-float 7s ease-in-out infinite,zp-dream 3.5s ease-in-out infinite}',
    '.zp-speak  {animation:zp-speak .45s ease-in-out 3}',
    '.zp-excited{animation:zp-breathe 1.4s ease-in-out infinite,zp-float 2.2s ease-in-out infinite}',
    /* prefers-reduced-motion: disable all presence animations */
    '@media(prefers-reduced-motion:reduce){.zp-idle,.zp-dream,.zp-speak,.zp-excited{animation:none!important}}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── Apply an animation class (removes others first) ── */
var _ALL_CLASSES = ['zp-idle','zp-dream','zp-speak','zp-excited'];

function _setClass(cls) {
  if (!_wrap) return;
  _ALL_CLASSES.forEach(function(c){ _wrap.classList.remove(c); });
  if (cls) _wrap.classList.add(cls);
}

/* ── Random blink: brief brightness flash ── */
function _scheduleBlink() {
  clearTimeout(_blinkTimer);
  if (!_active) return;
  var delay = 6000 + Math.random() * 8000;
  _blinkTimer = setTimeout(function() {
    if (!_wrap || _dreamMode) return;
    var prev = _wrap.style.filter || '';
    _wrap.style.filter = 'brightness(1.35) ' + prev;
    setTimeout(function(){
      if (_wrap) _wrap.style.filter = prev;
    }, 80 + Math.random() * 60);
    _scheduleBlink();
  }, delay);
}

/* ── Dream mode ── */
function setDreaming(on) {
  _dreamMode = on;
  if (!_wrap) return;
  if (on) {
    _setClass('zp-dream');
    _wrap.style.opacity = '0.72';
  } else {
    _setClass('zp-idle');
    _wrap.style.opacity = '';
  }
}

/* ── Speaking animation ── */
function setSpeaking(on) {
  if (!_wrap || _dreamMode) return;
  if (on) {
    _setClass('zp-speak');
  } else {
    setTimeout(function(){ _setClass('zp-idle'); }, 1400);
  }
}

/* ── Excited animation ── */
function setExcited() {
  if (!_wrap) return;
  _setClass('zp-excited');
  setTimeout(function(){ _setClass('zp-idle'); }, 2000);
}

/* ── Connect to mood system ── */
function _hookMoodEvents() {
  if (!window.NPBus) return;
  NPBus.on('mood:change', function(data) {
    if (!_wrap) return;
    if (data.mood === 'dreaming' || data.mood === 'sleepy') setDreaming(true);
    else if (data.mood === 'excited')                        setExcited();
    else                                                     setDreaming(false);
  });

  NPBus.on(NPBus.EV.XP_GAIN,   function(){ setExcited(); });
  NPBus.on(NPBus.EV.LEVEL_UP,  function(){ setExcited(); });
}

/* ── Start presence system ── */
function init() {
  _wrap = document.getElementById('nphAlienWrap');
  if (!_wrap) return; /* not on index.html */

  _injectStyles();
  _active = true;

  /* Start idle animation */
  _setClass('zp-idle');
  _scheduleBlink();
  _hookMoodEvents();

  /* Session timer for long-session detection */
  var _sessionStart = Date.now();
  if (window.NPClock) {
    NPClock.registerTask(function() {
      var mins = (Date.now() - _sessionStart) / 60000;
      if (mins >= 10 && window.ZapMemoryGraph) {
        ZapMemoryGraph.recordSessionTime(Math.round(mins));
        _sessionStart = Date.now(); /* reset so we don't double-count */
      }
    }, 600000, { label: 'session_time_check' }); /* every 10 min */
  }

  /* Hook speech events via NPBus */
  if (window.NPBus) {
    NPBus.on(NPBus.EV.SPEAK, function() {
      setSpeaking(true);
      /* Auto-reset after bubble hide (matches ZapSpeech 4.5s) */
      clearTimeout(_wrap._speakEndTimer);
      _wrap._speakEndTimer = setTimeout(function(){ setSpeaking(false); }, 4900);
    });
  }
}

window.ZapPresence = {
  init:         init,
  setDreaming:  setDreaming,
  setSpeaking:  setSpeaking,
  setExcited:   setExcited
};

}(window));