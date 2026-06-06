;(function(window){
'use strict';
 
/* ═══════════════════════════════════════════════════════════════
   NeonPlay R14 — ZapNotifications.js
   Notification dot — fully defensive — never throws
 
   Depends on: NPBus, NPUtils
   Exports: window.ZapNotifications
═══════════════════════════════════════════════════════════════ */
 
if(window.__ZAP_NOTIFY__) return;
window.__ZAP_NOTIFY__ = true;
 
function _updateDot(){
  try{
    var wrap = document.getElementById('nphAlienWrap');
    if(!wrap) return; /* element not present (game.html) — silent */
 
    var hasQuest = false;
 
    /* Defensive access to ZapQuestEngine */
    if(typeof ZapQuestEngine !== 'undefined'){
      var st = null;
      try{ st = ZapQuestEngine.getState(); }catch(e){
        if(window.NP_DEBUG) NPUtils.log.warn('ZapNotifications: getState() threw', e);
      }
      if(st && Array.isArray(st.quests)){
        hasQuest = st.quests.some(function(q){
          return q && typeof q.done === 'boolean' && !q.done;
        });
      } else {
        if(window.NP_DEBUG) NPUtils.log.info('ZapNotifications: quest state not available yet');
      }
    }
 
    if(hasQuest){
      wrap.classList.add('has-notification');
    } else {
      wrap.classList.remove('has-notification');
    }
 
    if(window.NPBus) NPBus.emit(NPBus.EV.NOTIFICATION, { hasQuest: hasQuest });
 
  }catch(e){
    /* Absolute last-resort safety — log only in debug */
    if(window.NP_DEBUG) console.warn('[ZapNotifications] _updateDot error:', e);
  }
}
 
function init(){
  /* Refresh on quest events */
  if(window.NPBus){
    NPBus.on(NPBus.EV.QUEST_DONE,     _updateDot);
    NPBus.on(NPBus.EV.QUEST_ALL_DONE, _updateDot);
  }
 
  /* Periodic refresh every 30s */
  if(window.NPUtils){
    NPUtils.timer.safeInterval('notify_refresh', _updateDot, 30000);
  } else {
    setInterval(_updateDot, 30000);
  }
 
  /* Initial call deferred until quest engine likely ready */
  if(window.NPUtils){
    NPUtils.timer.safeTimeout('notify_init', _updateDot, 900);
  } else {
    setTimeout(_updateDot, 900);
  }
 
  if(window.NP_DEBUG) NPUtils.log.info('ZapNotifications ready');
}
 
window.ZapNotifications = {
  update: _updateDot,
  init:   init
};
 
})(window);