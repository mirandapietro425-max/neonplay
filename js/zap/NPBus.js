;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R14 — NPBus.js
   Mini event bus para desacoplar mood, speech, quests, XP, idle.

   API:
     NPBus.on(event, handler)   → unsubscribe fn
     NPBus.off(event, handler)
     NPBus.emit(event, data)
     NPBus.once(event, handler)

   Eventos principais (constantes em NPBus.EV):
     XP_GAIN · LEVEL_UP · GAME_OPEN · QUEST_DONE · QUEST_ALL_DONE
     IDLE_ACTIVE · IDLE_IDLE · IDLE_SLEEPY · IDLE_DREAMING
     MOOD_CHANGE · SPEAK
═══════════════════════════════════════════════════════════════ */

if(window.__NP_BUS__) return;
window.__NP_BUS__ = true;

var _handlers = {};
/* R17: circular trace buffer */
var _TRACE = [];
var _TRACE_MAX = 120; /* { event: [fn, ...] } */

function _ensure(ev){ if(!_handlers[ev]) _handlers[ev] = []; }

var NPBus = {

  EV: {
    XP_GAIN:        'xp:gain',
    LEVEL_UP:       'xp:levelup',
    GAME_OPEN:      'game:open',
    QUEST_DONE:     'quest:done',
    QUEST_ALL_DONE: 'quest:alldone',
    IDLE_ACTIVE:    'idle:active',
    IDLE_IDLE:      'idle:idle',
    IDLE_SLEEPY:    'idle:sleepy',
    IDLE_DREAMING:  'idle:dreaming',
    MOOD_CHANGE:    'mood:change',
    SPEAK:          'zap:speak',
    NOTIFICATION:   'notify:update',
    /* R17 */
    STATE_CHANGE:   'zap:state_change',
    EMOTION_SETTLE: 'emotion:settled',
    RUNTIME_SLEEP:  'runtime:sleep',
    RUNTIME_RESUME: 'runtime:resume',
    PERF_DEGRADED:  'perf:degraded',
    /* R21 extensions */
    GAMEPLAY_SESSION: 'gameplay:session_complete',
    MISSION_DONE:     'mission:complete',
    MISSION_PROGRESS: 'mission:progress',
    PROFILE_UPDATE:   'profile:snapshot_update',
    ACHIEVEMENT_PROG: 'achievement:progress',
    COMPANION_EVOLVE: 'companion:form_change'
  },

  on: function(ev, fn){
    _ensure(ev);
    _handlers[ev].push(fn);
    return function(){ NPBus.off(ev, fn); };
  },

  once: function(ev, fn){
    var unsub = NPBus.on(ev, function(data){
      unsub();
      fn(data);
    });
    return unsub;
  },

  off: function(ev, fn){
    if(!_handlers[ev]) return;
    _handlers[ev] = _handlers[ev].filter(function(h){ return h !== fn; });
  },

  emit: function(ev, data){
    if(window.NP_DEBUG) console.info('[NPBus]', ev, data);
    var last_ev = ev; var last_data = data; // for debug overlay
    window._npBusLastEvent = { ev: ev, data: data, ts: Date.now() };
    _TRACE.push({ ev: ev, ts: (typeof performance!=='undefined'?performance.now():Date.now()) });
    if (_TRACE.length > _TRACE_MAX) _TRACE.shift();
    var list = _handlers[ev];
    if(!list) return;
    /* copy to avoid mutation during iteration */
    list.slice().forEach(function(fn){
      try{ fn(data); }catch(e){
        if(window.NP_DEBUG) console.warn('[NPBus] handler error on', ev, e);
      }
    });
  },

  /** Returns count of registered handlers for debug */
  _stats: function(){
    var out = {};
    Object.keys(_handlers).forEach(function(ev){
      out[ev] = _handlers[ev].length;
    });
    return out;
  }
};

window.NPBus = NPBus;

})(window);