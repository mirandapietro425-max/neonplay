;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R14 — ZapIdle.js
   Idle state manager — 4 states: idle, sleepy, dreaming, awake
   Delegates mood changes to ZapMoodSystem.
   ═══════════════════════════════════════════════════════════════ */

var _idleTimer  = null;
var _dreamTimer = null;
var _IDLE_MS    = 120000; /* 2 min → sleepy */
var _DREAM_MS   = 300000; /* 5 min → dreaming */
var _EVENTS     = ['mousemove','click','keydown','touchstart','scroll'];

function _goSleepy() {
  if (window.ZapMoodSystem) ZapMoodSystem.setMood('sleepy');
  _dreamTimer = setTimeout(_goDreaming, _DREAM_MS - _IDLE_MS);
}

function _goDreaming() {
  if (window.ZapMoodSystem) ZapMoodSystem.setMood('dreaming');
}

function _resetIdle() {
  clearTimeout(_idleTimer);
  clearTimeout(_dreamTimer);
  /* Wake up if sleepy/dreaming */
  if (window.ZapMoodSystem) {
    var m = ZapMoodSystem.getMood();
    if (m === 'sleepy' || m === 'dreaming') {
      ZapMoodSystem.setMood('idle');
    }
  }
  _idleTimer = setTimeout(_goSleepy, _IDLE_MS);
}

function init() {
  _EVENTS.forEach(function(ev) {
    window.addEventListener(ev, _resetIdle, { passive: true });
  });
  _resetIdle();
}

window.ZapIdle = { init: init, reset: _resetIdle };

}(window));
