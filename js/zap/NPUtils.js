;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R14 — NPUtils.js
   Safe storage · Timer registry · Debug flag

   Exporta no window:
     NP_DEBUG         — boolean (default false)
     NPUtils.storage  — safeStorageGet / safeStorageSet / safeStorageRemove
     NPUtils.timer    — safeInterval / safeTimeout / clearSafeInterval / clearSafeTimeout
     NPUtils.log      — debug-only console helper
═══════════════════════════════════════════════════════════════ */

if(window.__NP_UTILS__) return;
window.__NP_UTILS__ = true;

/* ── Debug flag ──────────────────────────── */
window.NP_DEBUG = window.NP_DEBUG || false;

/* ── Memory fallback for localStorage ──── */
var _memCache = {};

/* ── Safe Storage ──────────────────────── */
var _storage = {

  get: function(key, defaultVal){
    try{
      var raw = localStorage.getItem(key);
      if(raw === null) return (_memCache[key] !== undefined) ? _memCache[key] : (defaultVal !== undefined ? defaultVal : null);
      /* JSON parse if looks like object/array/number/bool */
      if(raw[0] === '{' || raw[0] === '[' || raw === 'true' || raw === 'false' || /^-?\d/.test(raw)){
        try{ return JSON.parse(raw); }catch(e){}
      }
      return raw;
    }catch(e){
      if(window.NP_DEBUG) console.warn('[NPUtils.storage.get]', key, e);
      return (_memCache[key] !== undefined) ? _memCache[key] : (defaultVal !== undefined ? defaultVal : null);
    }
  },

  set: function(key, value){
    var serialized = (typeof value === 'string') ? value : JSON.stringify(value);
    _memCache[key] = value; /* always update memory */
    try{
      localStorage.setItem(key, serialized);
      return true;
    }catch(e){
      if(window.NP_DEBUG) console.warn('[NPUtils.storage.set]', key, e);
      return false; /* quota exceeded — memory cache still updated */
    }
  },

  remove: function(key){
    delete _memCache[key];
    try{ localStorage.removeItem(key); return true; }
    catch(e){ if(window.NP_DEBUG) console.warn('[NPUtils.storage.remove]', key, e); return false; }
  },

  getJSON: function(key, defaultVal){
    try{
      var raw = localStorage.getItem(key) || (_memCache[key] ? JSON.stringify(_memCache[key]) : null);
      if(raw === null) return defaultVal !== undefined ? defaultVal : null;
      return JSON.parse(raw);
    }catch(e){
      if(window.NP_DEBUG) console.warn('[NPUtils.storage.getJSON]', key, e);
      return defaultVal !== undefined ? defaultVal : null;
    }
  }
};

/* ── Timer Registry ────────────────────── */
/* Prevents duplicate intervals/timeouts after partial reload */
var _intervals = {};
var _timeouts  = {};
var _IID = 0;

var _timer = {

  /** Create a named interval — clears previous one with same name */
  safeInterval: function(name, fn, ms){
    if(_intervals[name]) clearInterval(_intervals[name]);
    _intervals[name] = setInterval(function(){
      try{ fn(); }catch(e){
        if(window.NP_DEBUG) console.warn('[NPUtils.timer interval]', name, e);
      }
    }, ms);
    if(window.NP_DEBUG) console.info('[NPUtils.timer] interval registered:', name, ms+'ms');
    return _intervals[name];
  },

  /** Create a named timeout — clears previous one with same name */
  safeTimeout: function(name, fn, ms){
    if(_timeouts[name]) clearTimeout(_timeouts[name]);
    _timeouts[name] = setTimeout(function(){
      delete _timeouts[name];
      try{ fn(); }catch(e){
        if(window.NP_DEBUG) console.warn('[NPUtils.timer timeout]', name, e);
      }
    }, ms);
    return _timeouts[name];
  },

  clearSafeInterval: function(name){
    if(_intervals[name]){ clearInterval(_intervals[name]); delete _intervals[name]; }
  },

  clearSafeTimeout: function(name){
    if(_timeouts[name]){ clearTimeout(_timeouts[name]); delete _timeouts[name]; }
  },

  /** Returns snapshot of active timers for debug overlay */
  _snapshot: function(){
    return {
      intervals: Object.keys(_intervals),
      timeouts:  Object.keys(_timeouts)
    };
  }
};

/* ── Debug logger ──────────────────────── */
var _log = {
  info:  function(){ if(window.NP_DEBUG) console.info.apply(console, ['[NP]'].concat([].slice.call(arguments))); },
  warn:  function(){ if(window.NP_DEBUG) console.warn.apply(console, ['[NP]'].concat([].slice.call(arguments))); },
  error: function(){ console.error.apply(console, ['[NP]'].concat([].slice.call(arguments))); }
};

window.NPUtils = { storage: _storage, timer: _timer, log: _log };

/* Convenience shorthands on window for inline use in init */
window.safeStorageGet    = _storage.get;
window.safeStorageSet    = _storage.set;
window.safeStorageGetJSON= _storage.getJSON;
window.safeInterval      = _timer.safeInterval;
window.safeTimeout       = _timer.safeTimeout;
window.clearSafeInterval = _timer.clearSafeInterval;
window.clearSafeTimeout  = _timer.clearSafeTimeout;

})(window);