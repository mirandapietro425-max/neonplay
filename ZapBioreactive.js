;(function (window, document) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R8 — ZapBioreactive.js  (Phase C)
     O canvas do Zap reage ao contexto (cursor, neglect, arousal)
     sem alterar gameplay, iframe ou input.

     Técnica: rAF próprio leve aplica CSS transforms no .zc-canvas
     e .zc-widget. Nunca modifica posição real (right/bottom) nem
     o pipeline de _drawZap.

     Modificadores (lidos de ZapSentience.getModifiers()):
       pupilScale   → contração da pupila (cursor rápido)
       breathScale  → escala senoidal lenta (neglect)
       retractionX  → translate leve horizontal (fear)
       glowColor    → drop-shadow por humor
       jitter       → micro-tremor em high arousal
     ═══════════════════════════════════════════════════════════════ */

  if (window.__ZAP_BIOREACTIVE__) return;
  window.__ZAP_BIOREACTIVE__ = true;

  /* ─── constantes ───────────────────────────────────────────── */
  var VELOCITY_FEAR_THRESHOLD  = 18;   /* px/frame para ativar fear */
  var PROXIMITY_FEAR_THRESHOLD = 80;   /* px de proximidade */
  var LERP_SPEED               = 0.12;

  /* ─── estado (por sessão, sem persistência) ─────────────────── */
  var _s = {
    mouseX: -1, mouseY: -1, mouseTs: 0, mouseVelocity: 0,
    proximity:     999,
    fearActive:    false,
    pupilScale:    1.0, pupilScaleCur: 1.0,
    retractionX:   0.0, retractionXCur: 0.0,
    breathPhase:   0.0,
    jitterAmp:     0.0, jitterAmpCur: 0.0,
    glowColor:     null,
    neglectActive: false,
    _onMouseMove:  null,
    /* HOTFIX R20.6 — cache de referências DOM (evita querySelector por frame) */
    _domWidget:    null,
    _domCanvas:    null
  };

  /* ─── mouse tracking ─────────────────────────────────────────── */
  function _onMouseMove(e) {
    var now = Date.now();
    var dt  = Math.max(1, now - _s.mouseTs);
    if (_s.mouseX >= 0) {
      var dx = e.clientX - _s.mouseX;
      var dy = e.clientY - _s.mouseY;
      _s.mouseVelocity = Math.sqrt(dx*dx + dy*dy) * (16 / dt);
    }
    _s.mouseX = e.clientX;
    _s.mouseY = e.clientY;
    _s.mouseTs = now;

    var widget = _s._domWidget || (_s._domWidget = document.querySelector('.zc-widget'));
    if (widget) {
      var rect = widget.getBoundingClientRect();
      var ddx  = e.clientX - (rect.left + rect.width  / 2);
      var ddy  = e.clientY - (rect.top  + rect.height / 2);
      _s.proximity = Math.sqrt(ddx*ddx + ddy*ddy);
    }
  }

  /* ─── lerp ───────────────────────────────────────────────────── */
  function _lerp(cur, target, t) { return cur + (target - cur) * t; }

  /* ─── tick ───────────────────────────────────────────────────── */
  function _tick() {
    var mods   = window.ZapSentience ? window.ZapSentience.getModifiers() : null;
    var energy = mods ? mods.energyScale : 0.5;
    var mood   = mods ? mods.moodLabel  : 'curious';

    /* fear */
    var fastCursor = _s.mouseVelocity > VELOCITY_FEAR_THRESHOLD;
    var tooClose   = _s.proximity < PROXIMITY_FEAR_THRESHOLD;
    _s.fearActive  = fastCursor || tooClose;

    if (_s.fearActive) {
      var ff = Math.min(1, _s.mouseVelocity / (VELOCITY_FEAR_THRESHOLD * 2));
      _s.pupilScale  = 1 - ff * 0.55;
      var dir = (_s.mouseX > window.innerWidth / 2) ? 1 : -1;
      _s.retractionX = dir * ff * 6;
    } else {
      _s.pupilScale  = mods ? mods.pupilScale : 1.0;
      _s.retractionX = 0;
    }

    /* neglect / breath */
    _s.neglectActive = mods ? mods.neglected : false;
    _s.breathPhase  += _s.neglectActive ? 0.018 : (0.04 + energy * 0.02);

    /* jitter */
    _s.jitterAmp = energy > 0.75 ? 1.5 : 0;

    /* glow por humor */
    var glowMap = {
      excited:  'rgba(245,158,11,0.6)',
      curious:  'rgba(124,58,237,0.45)',
      sad:      'rgba(96,165,250,0.3)',
      tired:    'rgba(148,163,184,0.3)',
      obsessed: 'rgba(239,68,68,0.4)',
      neglected:'rgba(30,41,59,0.5)'
    };
    _s.glowColor = glowMap[mood] || null;

    /* lerp */
    _s.pupilScaleCur  = _lerp(_s.pupilScaleCur,  _s.pupilScale,  LERP_SPEED);
    _s.retractionXCur = _lerp(_s.retractionXCur, _s.retractionX, LERP_SPEED * 0.7);
    _s.jitterAmpCur   = _lerp(_s.jitterAmpCur,   _s.jitterAmp,   LERP_SPEED * 0.5);

    /* velocity decay */
    _s.mouseVelocity *= 0.85;
  }

  /* ─── rAF loop ───────────────────────────────────────────────── */
  var _rafId = null;

  function _loop() {
    _tick();

    /* HOTFIX R20.6: usar cache DOM — evita querySelector a cada frame (~60fps).
       Se o elemento foi removido e recriado (improvável mas possível), o cache
       se atualiza automaticamente ao falhar a condição if(canvas && widget).   */
    var canvas = _s._domCanvas || (_s._domCanvas = document.querySelector('.zc-canvas'));
    var widget = _s._domWidget || (_s._domWidget = document.querySelector('.zc-widget'));

    if (canvas && widget) {
      /* breath scale — apenas no canvas */
      var breathScale = 1 + Math.sin(_s.breathPhase) * (_s.neglectActive ? 0.025 : 0.008);
      canvas.style.transform = 'scale(' + breathScale.toFixed(4) + ')';

      /* retração horizontal — CSS custom prop no widget */
      var jitter = _s.jitterAmpCur > 0.1 ? (Math.random() - 0.5) * _s.jitterAmpCur : 0;
      var tx = (_s.retractionXCur + jitter).toFixed(2);
      widget.style.setProperty('--zb-retract', tx + 'px');

      /* glow por humor */
      widget.style.filter = _s.glowColor
        ? 'drop-shadow(0 4px 12px ' + _s.glowColor + ')'
        : '';
    }

    _rafId = requestAnimationFrame(_loop);
  }

  function _startLoop() {
    if (_rafId) return;
    _rafId = requestAnimationFrame(_loop);
  }

  function _stopLoop() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  }

  /* ─── CSS inject ─────────────────────────────────────────────── */
  function _injectCSS() {
    if (document.getElementById('zb-style')) return;
    var style = document.createElement('style');
    style.id = 'zb-style';
    style.textContent =
      '.zc-canvas{transform-origin:center;will-change:transform;}' +
      '.zc-widget{--zb-retract:0px;translate:var(--zb-retract) 0;will-change:filter,translate;}';
    document.head.appendChild(style);
  }

  /* ─── lifecycle ─────────────────────────────────────────────── */
  function destroy() {
    _stopLoop();
    if (_s._onMouseMove) {
      document.removeEventListener('mousemove', _s._onMouseMove);
      _s._onMouseMove = null;
    }
    /* HOTFIX R20.6: usar cache; limpar referências ao destruir */
    var canvas = _s._domCanvas || document.querySelector('.zc-canvas');
    var widget = _s._domWidget || document.querySelector('.zc-widget');
    if (canvas) canvas.style.transform = '';
    if (widget) { widget.style.filter = ''; widget.style.removeProperty('--zb-retract'); }
    _s._domCanvas = null;
    _s._domWidget = null;
  }

  function _mount() {
    _injectCSS();
    _s._onMouseMove = _onMouseMove;
    document.addEventListener('mousemove', _s._onMouseMove, { passive: true });

    /* HOTFIX R20.6: prime cache ao montar */
    var _existing = document.querySelector('.zc-widget');
    if (_existing) {
      _s._domWidget = _existing;
      _s._domCanvas = document.querySelector('.zc-canvas');
      _startLoop();
    } else {
      var _moTimer = setTimeout(function () { mo.disconnect(); }, 20000);
      var mo = new MutationObserver(function () {
        var w = document.querySelector('.zc-widget');
        if (w) {
          _s._domWidget = w;
          _s._domCanvas = document.querySelector('.zc-canvas');
          mo.disconnect();
          clearTimeout(_moTimer);
          _startLoop();
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
        window.NP.lifecycle.registerCleanup(function () { clearTimeout(_moTimer); mo.disconnect(); });
      }
    }

    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(destroy);
    }

    /* debug */
    window.ZAP_DEBUG = window.ZAP_DEBUG || {};
    window.ZAP_DEBUG.bioreactive = function () {
      console.log('[ZapBioreactive]', {
        velocity: _s.mouseVelocity.toFixed(1),
        proximity: _s.proximity.toFixed(0),
        fearActive: _s.fearActive,
        neglectActive: _s.neglectActive,
        breathPhase: _s.breathPhase.toFixed(2),
        jitterAmpCur: _s.jitterAmpCur.toFixed(2)
      });
    };
  }

  window.ZapBioreactive = { version: 'r8.0' };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _mount);
  } else {
    _mount();
  }

}(window, document));
