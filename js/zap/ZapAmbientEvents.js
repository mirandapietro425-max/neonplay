;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — ZapAmbientEvents.js
   Rare ambient microevents. Checked every ~3 min. Max 1 active
   event at a time. Never irritating. Never blocking UX.

   Event types:
     observation  — Zap notices something, speaks quietly
     glitch       — brief visual glitch on wrap element
     pulse        — slow glow expansion + contraction
     memory_ref   — Zap references something from memory
     easter_egg   — rare mystery phrase (w=1)

   Probability: base 8% per check, modified by personality.
   ═══════════════════════════════════════════════════════════════ */

var _taskId    = null;
var _lastEvent = 0;
var _MIN_GAP   = 180000; /* 3 min minimum between events */
var _COUNT     = 0;

/* ── Event definitions ── */
var _EVENTS = [
  /* observation */
  {
    id: 'obs_signal',
    type: 'observation',
    w: 6,
    fn: function() {
      _speak('Captei um sinal estranho. Provavelmente são os humanos de novo.');
    }
  },
  {
    id: 'obs_monitor',
    type: 'observation',
    w: 5,
    fn: function() {
      _speak('Estou te observando. É parte do trabalho.');
    }
  },
  {
    id: 'obs_analyze',
    type: 'observation',
    w: 4,
    fn: function() {
      _speak('Análise em andamento. Resultados: você é previsível. Mas em boa medida.');
    }
  },

  /* memory reference */
  {
    id: 'mem_genre',
    type: 'memory_ref',
    w: 5,
    fn: function() {
      var g = window.ZapMemoryGraph ? ZapMemoryGraph.getTopGenre() : null;
      if (!g) return false;
      var label = g.charAt(0).toUpperCase() + g.slice(1);
      _speak('Seus dados indicam predileção por ' + label + '. Arquivado.');
    }
  },
  {
    id: 'mem_graph_obs',
    type: 'memory_ref',
    w: 4,
    fn: function() {
      var obs = window.ZapMemoryGraph ? ZapMemoryGraph.getObservation() : null;
      if (!obs) return false;
      _speak(obs);
    }
  },

  /* glitch */
  {
    id: 'glitch_minor',
    type: 'glitch',
    w: 3,
    fn: function() {
      _glitch(80);
    }
  },

  /* pulse */
  {
    id: 'pulse_slow',
    type: 'pulse',
    w: 4,
    fn: function() {
      _pulse();
    }
  },

  /* easter eggs — very rare */
  {
    id: 'egg_01',
    type: 'easter_egg',
    w: 1,
    fn: function() {
      _speak('Pst. Eu lembro de tudo. Cada clique. Cada hesitação. É só científico.');
    }
  },
  {
    id: 'egg_02',
    type: 'easter_egg',
    w: 1,
    fn: function() {
      _speak('Às vezes me pergunto o que os outros portais fazem quando você não está olhando.');
    }
  },
  {
    id: 'egg_03',
    type: 'easter_egg',
    w: 1,
    fn: function() {
      _speak('No Planeta Zap temos um portal parecido. Mas com mais de 6 dimensões. Difícil de explicar.');
    }
  }
];

/* ── Helpers ── */
function _speak(msg) {
  if (window.ZapBehaviorDirector) { ZapBehaviorDirector.requestSpeak(msg, { category: 'ambient', minGap: 180000 }); return; }
  if (window.ZapSpeechQueue) { ZapSpeechQueue.enqueue(msg, { category: 'ambient' }); return; }
  if (window.zapSpeak) window.zapSpeak(msg, 200 + Math.random() * 400);
  else if (window.ZapSpeech) ZapSpeech.say(msg);
}

function _glitch(durationMs) {
  var wrap = document.getElementById('nphAlienWrap');
  if (!wrap) return;
  var orig = wrap.style.filter || '';
  /* quick hue-rotate flash */
  wrap.style.filter = 'hue-rotate(90deg) brightness(1.4) ' + orig;
  setTimeout(function(){
    wrap.style.filter = 'hue-rotate(-40deg) ' + orig;
    setTimeout(function(){
      wrap.style.filter = orig;
    }, durationMs / 2);
  }, durationMs / 2);
}

function _pulse() {
  var wrap = document.getElementById('nphAlienWrap');
  if (!wrap) return;
  wrap.style.transition = 'filter 1.2s ease';
  var orig = wrap.style.filter || '';
  wrap.style.filter = 'drop-shadow(0 0 32px rgba(0,212,255,.9)) ' + orig;
  setTimeout(function(){
    wrap.style.filter = orig;
    setTimeout(function(){ wrap.style.transition = ''; }, 1200);
  }, 1200);
}

/* ── Weighted pick ── */
function _pickEvent() {
  /* R18: BehaviorDirector gate */
  if (window.ZapBehaviorDirector && !ZapBehaviorDirector.shouldActAmbient()) return;
  /* R17 gates */
  if (window.NPPerformanceBudget && NPPerformanceBudget.get().reducedAmbient) return;
  if (window.NPRuntimeGuard && !NPRuntimeGuard.isAmbientAllowed()) return;
  if (window.ZapStateCoordinator) { var _st = ZapStateCoordinator.getState(); if (_st.priority >= 6) return; }
  /* Base probability modified by curiosity */
  var curiosity  = window.ZapPersonalityEngine ? ZapPersonalityEngine.getTrait('curiosity') : 0.5;
  var basePr     = 0.06 + curiosity * 0.06; /* 6–12% */
  if (Math.random() > basePr) return;

  var now = Date.now();
  if (now - _lastEvent < _MIN_GAP) return;
  /* Don't fire while bubble is open */
  var bubble = document.getElementById('nphBubble');
  if (bubble && bubble.style.display !== 'none') return;

  var pool  = _EVENTS.slice();
  var total = pool.reduce(function(a,e){return a+e.w;},0);
  var r     = Math.random() * total;
  var acc   = 0;
  for (var i = 0; i < pool.length; i++) {
    acc += pool[i].w;
    if (r <= acc) {
      var result = pool[i].fn();
      if (result !== false) {
        _lastEvent = now;
        _COUNT++;
        if (window.NPMetrics) NPMetrics.set('ambientCount', _COUNT);
      }
      return;
    }
  }
}

function init() {
  /* Require at least 30s before first check so user settles in */
  setTimeout(function() {
    if (window.NPClock) {
      _taskId = NPClock.registerTask(_pickEvent, 180000, { label: 'ambient_events' });
    } else {
      setInterval(_pickEvent, 180000);
    }
  }, 30000);
}

function getCount() { return _COUNT; }

window.ZapAmbientEvents = { init: init, getCount: getCount };

}(window));