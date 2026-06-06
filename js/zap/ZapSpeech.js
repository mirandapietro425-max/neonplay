/* ZapSpeech · JS */
;(function(window){
'use strict';
 
/* ═══════════════════════════════════════════════════════════════
   NeonPlay R14 — ZapSpeech.js
   Speech queue — typing indicator — race-condition-safe
 
   Depends on: NPBus, NPUtils
   Exports: window.ZapSpeech
 
   API:
     ZapSpeech.say(msg, options)
       options: { delay, force, priority }
     ZapSpeech.cancel()
     ZapSpeech.isSpeaking()
═══════════════════════════════════════════════════════════════ */
 
if(window.__ZAP_SPEECH__) return;
window.__ZAP_SPEECH__ = true;
 
var _queue    = [];
var _speaking = false;
var _locked   = false; /* true while typing "..." animation is live */
 
var T_NAME_TYPE   = 'speech_type';
var T_NAME_HIDE   = 'speech_hide';
var T_NAME_NEXT   = 'speech_next';
 
function _getBubble(){
  return document.getElementById('nphBubble');
}
 
function _showRaw(text){
  var b = _getBubble();
  if(!b) return;
  b.textContent = text;
  b.style.display = 'block';
  /* hudOpen is a global in neonplay-init.js — update safely */
  if(typeof hudOpen !== 'undefined') window.hudOpen = true;
}
 
function _hide(){
  var b = _getBubble();
  if(!b) return;
  b.style.display = 'none';
  if(typeof hudOpen !== 'undefined') window.hudOpen = false;
  _speaking = false;
  _locked   = false;
  /* drain queue */
  _drainQueue();
}
 
function _drainQueue(){
  if(_queue.length === 0) return;
  var next = _queue.shift();
  _deliver(next.msg, next.delay);
}
 
function _deliver(msg, delay){
  var d = (delay !== undefined && delay >= 0) ? delay : (420 + Math.random() * 200);
  _speaking = true;
  _locked   = true;
 
  /* Show typing indicator */
  _showRaw('...');
 
  var timer = window.NPUtils ? NPUtils.timer : null;
 
  /* After delay, show real message */
  if(timer){
    timer.clearSafeTimeout(T_NAME_TYPE);
    timer.safeTimeout(T_NAME_TYPE, function(){
      _locked = false;
      _showRaw(msg);
      /* Schedule auto-hide */
      timer.clearSafeTimeout(T_NAME_HIDE);
      timer.safeTimeout(T_NAME_HIDE, _hide, 4500);
    }, d);
  } else {
    /* Fallback without NPUtils */
    clearTimeout(window._zapTypingTimer);
    window._zapTypingTimer = setTimeout(function(){
      _locked = false;
      _showRaw(msg);
      clearTimeout(window._zapHideTimer);
      window._zapHideTimer = setTimeout(_hide, 4500);
    }, d);
  }
 
  if(window.NPBus) NPBus.emit(NPBus.EV.SPEAK, { msg: msg });
}
 
function say(msg, options){
  if(!msg) return;
  var opts = options || {};
 
  /* force=true: clear queue and interrupt current */
  if(opts.force){
    _queue = [];
    cancel();
    _deliver(msg, opts.delay);
    return;
  }
 
  /* If currently showing "..." (locked), queue */
  if(_locked || _speaking){
    /* Avoid exact duplicate queued messages */
    if(_queue.length > 0 && _queue[_queue.length-1].msg === msg) return;
    _queue.push({ msg: msg, delay: opts.delay });
    /* Limit queue depth to 3 */
    if(_queue.length > 3) _queue = _queue.slice(-3);
    return;
  }
 
  _deliver(msg, opts.delay);
}
 
function cancel(){
  _queue = [];
  _locked   = false;
  _speaking = false;
  if(window.NPUtils){
    NPUtils.timer.clearSafeTimeout(T_NAME_TYPE);
    NPUtils.timer.clearSafeTimeout(T_NAME_HIDE);
  } else {
    clearTimeout(window._zapTypingTimer);
    clearTimeout(window._zapHideTimer);
  }
  var b = _getBubble();
  if(b){ b.style.display = 'none'; }
  if(typeof hudOpen !== 'undefined') window.hudOpen = false;
}
 
window.ZapSpeech = {
  say:       say,
  cancel:    cancel,
  isSpeaking:function(){ return _speaking; },
  _queue:    function(){ return _queue.slice(); },
  init: function(){
    if(window.NP_DEBUG) NPUtils.log.info('ZapSpeech ready');
  }
};
 
/* Backwards-compat: zapSpeak used throughout init.js */
window.zapSpeak = function(msg, delay){
  say(msg, { delay: delay });
};
 
/* Wire NPBus SPEAK event for external callers */
if(window.NPBus){
  NPBus.on(NPBus.EV.SPEAK, function(data){
    if(data && data.msg && data._external) say(data.msg, data.opts);
  });
}
 
})(window);
 