;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — ZapAnimator.js
   Animation state machine. Manages CSS state classes on
   #nphAlienWrap and mood glow via ZapMoodSystem.

   States (priority order, highest first):
     excited  (6) — XP/level up
     speaking (5) — bubble open
     curious  (4) — genre / observation
     active   (3) — user interaction
     idle     (2) — base alive state
     sleepy   (1) — low energy
     dreaming (0) — long idle

   Rules:
     - Higher priority states always win
     - States auto-expire (except idle/dreaming which are persistent)
     - Transitions are queued, not interrupted, for low-priority states
   ═══════════════════════════════════════════════════════════════ */

var STATES = {
  dreaming: { priority: 0, duration: 0,    cls: 'za-dreaming' },
  sleepy:   { priority: 1, duration: 0,    cls: 'za-sleepy'   },
  idle:     { priority: 2, duration: 0,    cls: 'za-idle'     },
  active:   { priority: 3, duration: 3000, cls: 'za-active'   },
  curious:  { priority: 4, duration: 5000, cls: 'za-curious'  },
  speaking: { priority: 5, duration: 0,    cls: 'za-speaking' },
  excited:  { priority: 6, duration: 2500, cls: 'za-excited'  }
};

var _current    = 'idle';
var _expireTimer= null;
var _wrap       = null;

/* ── Inject state CSS once ── */
function _injectStyles() {
  if (document.getElementById('zap-animator-styles')) return;
  var s = document.createElement('style');
  s.id  = 'zap-animator-styles';
  /* Only glow/filter diffs — ZapPresence handles movement animations */
  s.textContent = [
    '.za-idle     { }',
    '.za-sleepy   { opacity:.72!important }',
    '.za-dreaming { opacity:.58!important }',
    '.za-active   { }',
    '.za-curious  { }',
    '.za-speaking { }',
    '.za-excited  { }',
    '@media(prefers-reduced-motion:reduce){[class*="za-"]{transition:none!important}}'
  ].join('\n');
  document.head.appendChild(s);
}

function _applyClass(stateName) {
  if (!_wrap) return;
  /* Remove all za- classes */
  var toRemove = [];
  _wrap.classList.forEach(function(c){ if(c.indexOf('za-')===0) toRemove.push(c); });
  toRemove.forEach(function(c){ _wrap.classList.remove(c); });
  /* Add new */
  var state = STATES[stateName];
  if (state) _wrap.classList.add(state.cls);
}

/* ── Transition to a state ── */
function setState(name, opts) {
  if (!STATES[name]) return;
  opts = opts || {};

  var incoming = STATES[name];
  var current  = STATES[_current];

  /* Respect priority — don't downgrade an active higher-priority state */
  if (!opts.force && incoming.priority < current.priority && _current !== 'idle' && _current !== 'dreaming' && _current !== 'sleepy') {
    return;
  }

  clearTimeout(_expireTimer);
  _current = name;
  _applyClass(name);

  /* Sync mood system */
  if (window.ZapMoodSystem) {
    /* Map animator states to mood states */
    var moodMap = {
      excited: 'excited', curious: 'curious', speaking: 'idle',
      active: 'happy', idle: 'idle', sleepy: 'sleepy', dreaming: 'dreaming'
    };
    if (moodMap[name]) ZapMoodSystem.setMood(moodMap[name], incoming.duration || 4000);
  }

  /* ZapPresence sync */
  if (window.ZapPresence) {
    if (name === 'dreaming' || name === 'sleepy') ZapPresence.setDreaming(true);
    else if (name === 'excited') ZapPresence.setExcited();
    else if (_current !== 'dreaming') ZapPresence.setDreaming(false);
  }

  /* Auto-expire non-persistent states */
  var dur = opts.duration !== undefined ? opts.duration : incoming.duration;
  if (dur > 0) {
    _expireTimer = setTimeout(function(){ setState('idle', { force: true }); }, dur);
  }
}

function getState() { return _current; }

/* ── Hook NPBus events ── */
function _hookEvents() {
  if (!window.NPBus) return;
  NPBus.on(NPBus.EV.XP_GAIN,   function(){ setState('excited'); });
  NPBus.on(NPBus.EV.LEVEL_UP,  function(){ setState('excited', { duration: 5000 }); });
  NPBus.on(NPBus.EV.GAME_OPEN, function(){ setState('curious'); });
  NPBus.on('mood:change', function(d) {
    if (d.mood === 'sleepy')   setState('sleepy',   { force: true });
    if (d.mood === 'dreaming') setState('dreaming', { force: true });
    if (d.mood === 'idle')     setState('idle',     { force: true });
  });
}

function init() {
  _wrap = document.getElementById('nphAlienWrap');
  if (!_wrap) return;
  _injectStyles();
  setState('idle', { force: true });
  _hookEvents();
}

window.ZapAnimator = { init: init, setState: setState, getState: getState };

}(window));