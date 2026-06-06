;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — NPClock.js
   Central task scheduler. Replaces scattered setInterval/setTimeout.
   All Zap ambient/idle timers register here for unified lifecycle.

   API:
     var id = NPClock.registerTask(fn, intervalMs, opts?)
     NPClock.pauseTask(id)
     NPClock.resumeTask(id)
     NPClock.cancelTask(id)
     NPClock.getTaskCount()          → number of active tasks
     NPClock.getTask(id)             → task descriptor (debug)
   ═══════════════════════════════════════════════════════════════ */

var _tasks  = {};
var _uid    = 0;
var _paused = false; /* global pause for page hidden */

function registerTask(fn, intervalMs, opts) {
  opts = opts || {};
  var id   = 'npc_' + (++_uid);
  var task = {
    id:        id,
    fn:        fn,
    interval:  Math.max(intervalMs || 1000, 100), /* floor at 100ms */
    label:     opts.label || id,
    paused:    false,
    _timer:    null,
    _destroyed:false,
    _runs:     0
  };

  function _run() {
    if (task._destroyed) return;
    if (!task.paused && !_paused) {
      try { task.fn(); task._runs++; }
      catch(e) { console.warn('[NPClock] task error:', task.label, e); }
    }
    task._timer = setTimeout(_run, task.interval);
  }

  if (opts.immediate && !_paused) {
    try { task.fn(); task._runs++; } catch(e) {}
  }
  task._timer = setTimeout(_run, task.interval);
  _tasks[id]  = task;
  return id;
}

function pauseTask(id) {
  if (_tasks[id]) _tasks[id].paused = true;
}

function resumeTask(id) {
  if (_tasks[id]) _tasks[id].paused = false;
}

function cancelTask(id) {
  if (!_tasks[id]) return;
  clearTimeout(_tasks[id]._timer);
  _tasks[id]._destroyed = true;
  delete _tasks[id];
}

function getTaskCount() {
  return Object.keys(_tasks).length;
}

function getTask(id) {
  return _tasks[id] || null;
}

/* ── Page visibility: pause all when hidden ── */
document.addEventListener('visibilitychange', function() {
  var wasHidden = _paused;
  _paused = document.hidden;
  if (window.NPBus) {
    if (document.hidden) {
      NPBus.emit('runtime:sleep', { ts: Date.now() });
    } else if (wasHidden) {
      NPBus.emit('runtime:resume', { ts: Date.now() });
      if (window.NPRuntimeGuard) setTimeout(function(){ NPRuntimeGuard.recoverAfterSleep(); }, 200);
    }
  }
});

window.NPClock = {
  registerTask: registerTask,
  pauseTask:    pauseTask,
  resumeTask:   resumeTask,
  cancelTask:   cancelTask,
  getTaskCount: getTaskCount,
  getTask:      getTask
};

}(window));