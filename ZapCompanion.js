;(function (window, document) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R7 — ZapCompanion.js
     Companion Mode: Overlay + Canvas Zap + Drag + Frases + Drops

     Depende de (carregados antes):
       - ZapEconomy.js  → window.ZapEconomy
       - ZapCosmetics.js → window.ZapCosmetics
       - bundle.min.js  → window.NP, window.NP84, window.NP.events

     Integração com game.html:
       - Detecta window._currentGame (setado por launchGameResilient)
       - Observa #gameFrameWrap para detectar quando o jogo começa
       - Usa NP.events para gameplay:start / gameplay:end
       - Registra cleanup via NP.lifecycle.registerCleanup
     ═══════════════════════════════════════════════════════════════ */

  /* ── Guard de double-init ─────────────────────────────────────── */
  if (window.__ZAP_COMPANION__) return;
  window.__ZAP_COMPANION__ = true;

  /* ── Constantes ───────────────────────────────────────────────── */
  var STORAGE_POS_KEY  = 'np_r7_companion';
  var DROP_CHANCE      = 0.6;   /* probabilidade de spawn por janela */
  var DROP_INTERVAL_MS = 18000; /* janela de spawn a cada 18s        */
  var DROP_LIFETIME_MS = 5000;  /* moeda desaparece após 5s          */
  var DROP_VALUE       = 5;     /* moedas por coleta                 */
  var BUBBLE_COOLDOWN  = 12000; /* cooldown entre frases (ms)        */
  var BUBBLE_DURATION  = 4500;  /* quanto tempo a frase fica visível */
  var SAFETY_TIMEOUT   = 300000;/* 5 min para parar o observer       */
  var WIDGET_SIZE      = 72;    /* px (desktop)                      */

  /* ── Frases por categoria ─────────────────────────────────────── */
  /* R10: pools migrados para ZapBrain — Companion é View puro.
     _pickPhrase() delega ao Brain; fallback local para robustez. */
  var _PHRASE_FALLBACK = ['Você é fera! 🔥', 'Mantém o ritmo! ⚡', 'Jogo incrível! 🎮'];

  /* ── Estado interno ───────────────────────────────────────────── */
  var _state = {
    mounted:             false,
    rafId:               null,
    dropIntervalId:      null,   /* setInterval do ciclo de drops    */
    activeDrop:          null,   /* { el, timeoutId, expiryTimeout } */
    bubbleTimeout:       null,
    bubbleScheduleTimeout: null,
    dropTimeout:         null,
    lastBubbleAt:        0,
    cosmetics:           null,
    unsubCosmetics:      null,
    unsubEconomy:        null,
    /* listeners para removeEventListener */
    _onMouseMove:        null,
    _onMouseUp:          null,
    _onTouchMove:        null,
    _onTouchEnd:         null,
    _onResize:           null,
    _onFullscreen:       null,
    _onVisibility:       null,
    /* drag */
    dragging:            false,
    dragStartX:          0,
    dragStartY:          0,
    dragElStartLeft:     0,
    dragElStartTop:      0,
    /* canvas */
    blinkTimer:          0,
    blinkOpen:           true,
    frameCount:          0
  };

  /* ── DOM refs ─────────────────────────────────────────────────── */
  var _dom = {
    overlay: null,
    widget:  null,
    canvas:  null,
    ctx:     null,
    bubble:  null,
    badge:   null
  };

  /* ═══════════════════════════════════════════════════════════════
     ETAPA A — INFRAESTRUTURA: Overlay, Canvas, Mount/Unmount
     ═══════════════════════════════════════════════════════════════ */

  function _buildDOM() {
    /* Overlay invisível a cliques */
    var overlay = document.createElement('div');
    overlay.className = 'zc-overlay zc-overlay--entering';
    overlay.setAttribute('aria-hidden', 'true');

    /* Widget draggável */
    var widget = document.createElement('div');
    widget.className = 'zc-widget';
    widget.setAttribute('role', 'img');
    widget.setAttribute('aria-label', 'Zap — mascote NeonPlay');

    /* Canvas 2D do Zap */
    var canvas = document.createElement('canvas');
    canvas.className = 'zc-canvas';
    var size = window.innerWidth < 600 ? 58 : WIDGET_SIZE;
    canvas.width  = size * (window.devicePixelRatio || 1);
    canvas.height = size * (window.devicePixelRatio || 1);
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';

    /* Balão de fala */
    var bubble = document.createElement('div');
    bubble.className = 'zc-bubble';
    /* COMP-02 / A11Y-01 R20.6: screen readers anunciam falas do companion */
    bubble.setAttribute('aria-live', 'polite');
    bubble.setAttribute('role', 'status');

    /* Badge de moedas */
    var badge = document.createElement('div');
    badge.className = 'zc-badge';
    badge.textContent = '0';

    /* Montagem */
    widget.appendChild(canvas);
    widget.appendChild(bubble);
    widget.appendChild(badge);
    overlay.appendChild(widget);

    _dom.overlay = overlay;
    _dom.widget  = widget;
    _dom.canvas  = canvas;
    _dom.ctx     = canvas.getContext('2d');
    _dom.bubble  = bubble;
    _dom.badge   = badge;
  }

  function _restorePosition() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_POS_KEY) || 'null');
      if (saved && typeof saved.bottom === 'number' && typeof saved.right === 'number') {
        /* Validar bounds antes de aplicar */
        var maxRight  = window.innerWidth  - WIDGET_SIZE - 8;
        var maxBottom = window.innerHeight - WIDGET_SIZE - 8;
        _dom.widget.style.right  = Math.min(Math.max(8, saved.right),  maxRight)  + 'px';
        _dom.widget.style.bottom = Math.min(Math.max(8, saved.bottom), maxBottom) + 'px';
      }
    } catch (e) {}
  }

  function _savePosition() {
    try {
      localStorage.setItem(STORAGE_POS_KEY, JSON.stringify({
        right:  parseInt(_dom.widget.style.right,  10) || 20,
        bottom: parseInt(_dom.widget.style.bottom, 10) || 80
      }));
    } catch (e) {}
  }

  function _updateCoinsDisplay(forcedTotal) {
    if (!_dom.badge) return;
    var coins = (typeof forcedTotal === 'number') ? forcedTotal : (window.ZapEconomy ? window.ZapEconomy.getCoins() : 0);
    _dom.badge.textContent = coins > 999 ? '999+' : String(coins);
    if (coins > 0) {
      _dom.badge.classList.add('zc-badge--visible');
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ETAPA B — DRAG SYSTEM (mouse + touch + bounds + persist)
     ═══════════════════════════════════════════════════════════════ */

  function _getWidgetPos() {
    var rect = _dom.widget.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function _clampPos(left, top) {
    var w = _dom.widget.offsetWidth  || WIDGET_SIZE;
    var h = _dom.widget.offsetHeight || WIDGET_SIZE;
    var maxLeft   = window.innerWidth  - w - 4;
    var maxTop    = window.innerHeight - h - 4;
    return {
      left: Math.min(Math.max(4, left), maxLeft),
      top:  Math.min(Math.max(4, top),  maxTop)
    };
  }

  /* Converter left/top → right/bottom (para salvar em estilo fixed) */
  function _applyPos(left, top) {
    var clamped = _clampPos(left, top);
    var right  = window.innerWidth  - clamped.left - (_dom.widget.offsetWidth  || WIDGET_SIZE);
    var bottom = window.innerHeight - clamped.top  - (_dom.widget.offsetHeight || WIDGET_SIZE);
    _dom.widget.style.right  = Math.max(4, right)  + 'px';
    _dom.widget.style.bottom = Math.max(4, bottom) + 'px';
    /* Remover left/top explícitos (usamos right/bottom) */
    _dom.widget.style.left = '';
    _dom.widget.style.top  = '';
  }

  function _onDragStart(clientX, clientY) {
    _state.dragging = true;
    var pos = _getWidgetPos();
    _state.dragStartX    = clientX;
    _state.dragStartY    = clientY;
    _state.dragElStartLeft = pos.left;
    _state.dragElStartTop  = pos.top;
    _dom.widget.classList.add('zc-widget--dragging');
  }

  function _onDragMove(clientX, clientY) {
    if (!_state.dragging) return;
    var dx   = clientX - _state.dragStartX;
    var dy   = clientY - _state.dragStartY;
    _applyPos(_state.dragElStartLeft + dx, _state.dragElStartTop + dy);
  }

  function _onDragEnd() {
    if (!_state.dragging) return;
    _state.dragging = false;
    _dom.widget.classList.remove('zc-widget--dragging');
    _savePosition();
  }

  /* Mouse */
  function _onMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    _onDragStart(e.clientX, e.clientY);
  }

  /* Touch */
  function _onTouchStart(e) {
    /* NÃO preventDefault aqui (passive) — só no move quando dragging */
    var t = e.touches[0];
    _onDragStart(t.clientX, t.clientY);
  }

  function _bindDragListeners() {
    /* Mouse move/up no document — com cleanup real */
    _state._onMouseMove = function (e) { _onDragMove(e.clientX, e.clientY); };
    _state._onMouseUp   = function ()  { _onDragEnd(); };
    document.addEventListener('mousemove', _state._onMouseMove);
    document.addEventListener('mouseup',   _state._onMouseUp);

    /* Touch move com passive:false APENAS para permitir preventDefault */
    _state._onTouchMove = function (e) {
      if (!_state.dragging) return;
      e.preventDefault(); /* evita scroll durante drag */
      var t = e.touches[0];
      _onDragMove(t.clientX, t.clientY);
    };
    _state._onTouchEnd = function () { _onDragEnd(); };
    document.addEventListener('touchmove', _state._onTouchMove, { passive: false });
    document.addEventListener('touchend',  _state._onTouchEnd,  { passive: true  });

    /* Bind no widget */
    _dom.widget.addEventListener('mousedown',  _onMouseDown,    { passive: false });
    _dom.widget.addEventListener('touchstart', _onTouchStart,   { passive: true  });

    /* Resize — revalidar bounds */
    _state._onResize = function () {
      var w = _dom.widget.offsetWidth  || WIDGET_SIZE;
      var h = _dom.widget.offsetHeight || WIDGET_SIZE;
      var right  = parseInt(_dom.widget.style.right,  10) || 20;
      var bottom = parseInt(_dom.widget.style.bottom, 10) || 80;
      var left = window.innerWidth  - w - right;
      var top  = window.innerHeight - h - bottom;
      _applyPos(left, top);
    };
    window.addEventListener('resize',            _state._onResize, { passive: true });
    window.addEventListener('orientationchange', _state._onResize, { passive: true });

    /* Fullscreen — reposicionar */
    _state._onFullscreen = _state._onResize;
    document.addEventListener('fullscreenchange',       _state._onFullscreen);
    document.addEventListener('webkitfullscreenchange', _state._onFullscreen);
  }

  function _unbindDragListeners() {
    if (_state._onMouseMove) {
      document.removeEventListener('mousemove', _state._onMouseMove);
      _state._onMouseMove = null;
    }
    if (_state._onMouseUp) {
      document.removeEventListener('mouseup', _state._onMouseUp);
      _state._onMouseUp = null;
    }
    if (_state._onTouchMove) {
      document.removeEventListener('touchmove', _state._onTouchMove);
      _state._onTouchMove = null;
    }
    if (_state._onTouchEnd) {
      document.removeEventListener('touchend', _state._onTouchEnd);
      _state._onTouchEnd = null;
    }
    if (_dom.widget) {
      _dom.widget.removeEventListener('mousedown',  _onMouseDown);
      _dom.widget.removeEventListener('touchstart', _onTouchStart);
    }
    if (_state._onResize) {
      window.removeEventListener('resize',            _state._onResize);
      window.removeEventListener('orientationchange', _state._onResize);
      _state._onResize = null;
    }
    if (_state._onFullscreen) {
      document.removeEventListener('fullscreenchange',       _state._onFullscreen);
      document.removeEventListener('webkitfullscreenchange', _state._onFullscreen);
      _state._onFullscreen = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ETAPA C — CANVAS RENDER DO ZAP (corpo, olhos, boca, skins)
     ═══════════════════════════════════════════════════════════════ */

  function _getColor() {
    try {
      if (window.ZapCosmetics) {
        var state = window.ZapCosmetics.getEquipped();
        var skin = (window.ZapCosmetics.catalog.skins || []).find(function (s) {
          return s.id === state.equippedSkin;
        });
        if (skin && skin.color) return skin.color;
      }
    } catch (e) {}
    return '#2a1040';
  }

  function _drawZap(ctx, w, h, frameCount) {
    /* ═══════════════════════════════════════════════════════════
       Renderiza o MESMO alien da homepage (drawAlien).
       Coordenadas escaladas para o canvas do widget.
       Preservado: blinkTimer, cosméticos, partículas.
    ═══════════════════════════════════════════════════════════ */
    var dpr  = window.devicePixelRatio || 1;
    var cw   = w * dpr;
    var ch   = h * dpr;
    var cx   = cw / 2;
    var cy   = ch / 2;
    var SK   = color = _getColor();   /* skin color — igual SKINS[x].sk */
    var OL   = '#0a0618';             /* outline — igual drawAlien */

    /* Fator de escala: drawAlien usa ellipse(0,-25,65,52)
       Queremos que a cabeça (65px) ocupe ~90% do canvas */
    var sc   = (Math.min(cw, ch) * 0.45) / 65;

    ctx.clearRect(0, 0, cw, ch);

    /* Translada para o centro do canvas, desloca Y para a cabeça
       ficar centrada (centro da cabeça está em y=-25 no espaço drawAlien) */
    ctx.save();
    ctx.translate(cx, cy + 25 * sc);
    ctx.scale(sc, sc);

    /* stroke padrão igual drawAlien */
    ctx.strokeStyle = OL;
    ctx.lineWidth   = 2.5;

    /* ── Antenas (igual drawAlien) ────────────────────────────── */
    ctx.fillStyle = SK;
    ctx.beginPath();
    ctx.moveTo(-15, -60);
    ctx.quadraticCurveTo(-35, -85, -45, -75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-45, -75, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(15, -60);
    ctx.quadraticCurveTo(35, -85, 45, -75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(45, -75, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    /* ── Cabeça (oval, mesma de drawAlien) ───────────────────── */
    ctx.fillStyle = SK;
    ctx.beginPath();
    ctx.ellipse(0, -25, 65, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    /* ── Brilho no topo (igual drawAlien) ────────────────────── */
    ctx.beginPath();
    ctx.ellipse(0, -65, 18, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    /* ── Olhos — piscar mantido via _state.blinkTimer ─────────── */
    _state.blinkTimer++;
    if (_state.blinkTimer > 90) {
      _state.blinkOpen = false;
      if (_state.blinkTimer > 95) {
        _state.blinkOpen = true;
        _state.blinkTimer = 0;
      }
    }
    var blink = !_state.blinkOpen;

    if (blink) {
      /* olhos fechados — igual drawAlien */
      ctx.beginPath();
      ctx.moveTo(-45, -25);
      ctx.quadraticCurveTo(-25, -15, -5, -25);
      ctx.strokeStyle = OL;
      ctx.lineWidth   = 3.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, -25);
      ctx.quadraticCurveTo(25, -15, 45, -25);
      ctx.stroke();
    } else {
      /* olhos abertos — igual drawAlien */
      ctx.fillStyle = '#161026';
      ctx.beginPath();
      ctx.ellipse(-28, -22, 18, 26, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(28, -22, 18, 26, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-20, -35, 6, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(36, -35, 6, 3, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    /* ── Nariz (igual drawAlien) ──────────────────────────────── */
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.arc(-3, 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    /* ── Boca (sorriso — igual drawAlien modo normal) ─────────── */
    ctx.beginPath();
    ctx.moveTo(-8, 12);
    ctx.quadraticCurveTo(0, 18, 10, 10);
    ctx.lineWidth   = 2.5;
    ctx.strokeStyle = OL;
    ctx.stroke();

    ctx.restore();

    /* ── Cosméticos (chapéu, óculos) — mantidos ─────────────── */
    var dpr2 = dpr;
    var cx2  = cx;
    var cy2  = cy + 25 * sc - 25 * sc; /* = cy */
    var r2   = 65 * sc * 0.8;
    _drawCosmetics(ctx, cx2, cy2 - 25 * sc, r2, dpr2);

    /* ── Partículas — mantidas ───────────────────────────────── */
    _drawParticles(ctx, cx, cy - 25 * sc, r2, frameCount, dpr, SK);
  }

  function _drawCosmetics(ctx, cx, cy, r, dpr) {
    if (!window.ZapCosmetics) return;
    var state = window.ZapCosmetics.getEquipped();

    /* Chapéu */
    if (state.equippedHat === 'top') {
      var hatW = r * 1.1;
      var hatH = r * 0.55;
      var hatY = cy - r - 2 * dpr;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - hatW / 2, hatY - hatH, hatW, hatH);
      ctx.fillStyle = '#2d2d4e';
      ctx.fillRect(cx - hatW * 0.65, hatY - 3 * dpr, hatW * 1.3, 5 * dpr);
    } else if (state.equippedHat === 'crown') {
      var crownY = cy - r - 4 * dpr;
      ctx.fillStyle = '#EAB308';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.55, crownY);
      ctx.lineTo(cx - r * 0.55, crownY - r * 0.45);
      ctx.lineTo(cx - r * 0.2,  crownY - r * 0.25);
      ctx.lineTo(cx,             crownY - r * 0.5);
      ctx.lineTo(cx + r * 0.2,  crownY - r * 0.25);
      ctx.lineTo(cx + r * 0.55, crownY - r * 0.45);
      ctx.lineTo(cx + r * 0.55, crownY);
      ctx.closePath();
      ctx.fill();
    } else if (state.equippedHat === 'cap') {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.ellipse(cx, cy - r + 2 * dpr, r * 0.75, r * 0.35, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - r * 0.1, cy - r - r * 0.1, r * 0.8, r * 0.25);
    }

    /* Óculos */
    if (state.equippedGlasses === 'cool') {
      var gY = cy - r * 0.1;
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 1.5 * dpr;
      [-0.28, 0.28].forEach(function (offset) {
        ctx.beginPath();
        ctx.arc(cx + r * offset, gY, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 200, 255, 0.35)';
        ctx.fill();
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.1, gY);
      ctx.lineTo(cx + r * 0.1, gY);
      ctx.stroke();
    } else if (state.equippedGlasses === 'nerd') {
      var ngY = cy - r * 0.1;
      ctx.strokeStyle = '#333';
      ctx.lineWidth   = 1.5 * dpr;
      [-0.28, 0.28].forEach(function (offset) {
        ctx.beginPath();
        ctx.arc(cx + r * offset, ngY, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.fill();
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.1, ngY);
      ctx.lineTo(cx + r * 0.1, ngY);
      ctx.stroke();
    }
  }

  function _drawParticles(ctx, cx, cy, r, frameCount, dpr, color) {
    if (!window.ZapCosmetics) return;
    var state = window.ZapCosmetics.getEquipped();
    if (state.equippedParticles === 'none') return;

    var t = frameCount * 0.04;

    if (state.equippedParticles === 'stars') {
      for (var i = 0; i < 3; i++) {
        var angle = t + i * (Math.PI * 2 / 3);
        var px = cx + Math.cos(angle) * (r + 10 * dpr);
        var py = cy + Math.sin(angle) * (r + 10 * dpr);
        ctx.beginPath();
        ctx.arc(px, py, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(253, 224, 71, ' + (0.5 + 0.5 * Math.sin(t + i)) + ')';
        ctx.fill();
      }
    } else if (state.equippedParticles === 'coins') {
      for (var j = 0; j < 2; j++) {
        var cAngle = t * 1.3 + j * Math.PI;
        var cpx = cx + Math.cos(cAngle) * (r + 8 * dpr);
        var cpy = cy + Math.sin(cAngle) * (r + 8 * dpr);
        ctx.beginPath();
        ctx.arc(cpx, cpy, 3 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
      }
    } else if (state.equippedParticles === 'flames') {
      for (var k = 0; k < 4; k++) {
        var fAngle = t * 0.8 + k * (Math.PI * 2 / 4);
        var fpx = cx + Math.cos(fAngle) * (r + 6 * dpr);
        var fpy = cy + Math.sin(fAngle) * (r + 6 * dpr);
        var fAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + k));
        ctx.beginPath();
        ctx.arc(fpx, fpy, 2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249, 115, 22, ' + fAlpha + ')';
        ctx.fill();
      }
    }
  }

  function _lighten(hex, amount) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ── rAF loop (único, com guard) ────────────────────────────── */
  function _tick() {
    if (!_state.mounted) return;
    _state.frameCount++;
    if (_dom.ctx && _dom.canvas) {
      var w = parseInt(_dom.canvas.style.width,  10) || WIDGET_SIZE;
      var h = parseInt(_dom.canvas.style.height, 10) || WIDGET_SIZE;
      _drawZap(_dom.ctx, w, h, _state.frameCount);
    }
    _state.rafId = requestAnimationFrame(_tick);
  }

  function _startRaf() {
    if (_state.rafId) return; /* guard de duplicação */
    _state.rafId = requestAnimationFrame(_tick);
  }

  function _stopRaf() {
    if (_state.rafId) {
      cancelAnimationFrame(_state.rafId);
      _state.rafId = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ETAPA D — GAME AWARENESS (frases por categoria, cooldown)
     ═══════════════════════════════════════════════════════════════ */

  function _getCurrentCategory() {
    try {
      var game = window._currentGame;
      if (game && game.cat) return game.cat;
    } catch (e) {}
    return 'default';
  }

  function _pickPhrase() {
    /* R10: delega ao Brain — Companion não decide frases */
    var cat = _getCurrentCategory();
    if (window.ZapBrain && typeof window.ZapBrain.getGamePhrase === 'function') {
      return window.ZapBrain.getGamePhrase(cat);
    }
    return _PHRASE_FALLBACK[Math.floor(Math.random() * _PHRASE_FALLBACK.length)];
  }

  function _showBubble(text) {
    if (!_dom.bubble) return;
    clearTimeout(_state.bubbleTimeout);

    _dom.bubble.textContent = text;

    /* HOTFIX R20.6 — Bubble overflow: detectar posição do widget e flipar
       a bubble para baixo quando o widget está na metade superior da tela.
       Sem jitter: a classe é aplicada antes de adicionar --visible.          */
    if (_dom.widget) {
      try {
        var rect = _dom.widget.getBoundingClientRect();
        var midScreen = window.innerHeight / 2;
        /* Widget acima da metade → bubble vai para baixo (classe --below) */
        if (rect.top < midScreen) {
          _dom.bubble.classList.add('zc-bubble--below');
        } else {
          _dom.bubble.classList.remove('zc-bubble--below');
        }
      } catch (e) {
        _dom.bubble.classList.remove('zc-bubble--below');
      }
    }

    _dom.bubble.classList.add('zc-bubble--visible');
    /* R20.1: suppress peripheral glow while speaking (CSS :has fallback) */
    if (_dom.widget) _dom.widget.classList.add('zc-speaking');

    _state.bubbleTimeout = setTimeout(function () {
      if (_dom.bubble) _dom.bubble.classList.remove('zc-bubble--visible');
      /* R20.1: restore peripheral glow after bubble closes */
      if (_dom.widget) _dom.widget.classList.remove('zc-speaking');
    }, BUBBLE_DURATION);

    _state.lastBubbleAt = Date.now();
  }

  function _scheduleBubble() {
    clearTimeout(_state.bubbleScheduleTimeout);
    /* Delay aleatório entre 8s e 20s */
    var delay = 8000 + Math.random() * 12000;
    _state.bubbleScheduleTimeout = setTimeout(function () {
      if (!_state.mounted) return;
      var now = Date.now();
      if (now - _state.lastBubbleAt >= BUBBLE_COOLDOWN) {
        _showBubble(_pickPhrase());
      }
      _scheduleBubble(); /* reagenda */
    }, delay);
  }

  /* ═══════════════════════════════════════════════════════════════
     ETAPA E — ACTIVE DROPS (moedas coletáveis)
     ═══════════════════════════════════════════════════════════════ */

  function _removeDrop() {
    if (!_state.activeDrop) return;
    var d = _state.activeDrop;
    clearTimeout(d.timeoutId);
    clearTimeout(d.expiryTimeout);
    if (d.el && d.el.parentNode) {
      d.el.parentNode.removeChild(d.el);
    }
    _state.activeDrop = null;
  }

  function _spawnDrop() {
    if (_state.activeDrop) return; /* só 1 por vez */

    /* Posição aleatória na área do iframe (evita cantos com UI) */
    var margin = 60;
    var x = margin + Math.random() * (window.innerWidth  - margin * 2 - 48);
    var y = margin + Math.random() * (window.innerHeight - margin * 2 - 48);

    var drop = document.createElement('div');
    drop.className = 'zc-drop';
    drop.style.left = x + 'px';
    drop.style.top  = y + 'px';
    drop.setAttribute('aria-label', 'Coletar moeda');
    drop.setAttribute('role', 'button');
    drop.setAttribute('tabindex', '0');

    drop.innerHTML = '🪙<div class="zc-drop-ring"></div>';

    /* Remover animação de entrada e marcar como "expirando" antes de sumir */
    var expiryTimeout = setTimeout(function () {
      if (drop.parentNode) drop.classList.add('zc-drop--expiring');
    }, DROP_LIFETIME_MS - 1500);

    /* Timeout de vida — remove após 5s */
    var timeoutId = setTimeout(function () {
      _removeDrop();
      /* Reagenda o próximo ciclo */
      _state.dropTimeout = setTimeout(_scheduleDrop, DROP_INTERVAL_MS * 0.5);
    }, DROP_LIFETIME_MS);

    _state.activeDrop = { el: drop, timeoutId: timeoutId, expiryTimeout: expiryTimeout };

    /* Coleta por clique */
    function _onCollect(e) {
      e.stopPropagation();
      _collectDrop(x, y);
    }
    drop.addEventListener('click',   _onCollect);
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') _onCollect(e);
    });

    document.body.appendChild(drop);
  }

  function _collectDrop(x, y) {
    if (!_state.activeDrop) return;
    var drop = _state.activeDrop;

    clearTimeout(drop.timeoutId);
    clearTimeout(drop.expiryTimeout);

    drop.el.classList.add('zc-drop--collected');

    /* Feedback visual "+5 🪙" */
    var fx = document.createElement('div');
    fx.className = 'zc-collect-fx';
    fx.textContent = '+' + DROP_VALUE + ' 🪙';
    fx.style.left = (x + 20) + 'px';
    fx.style.top  = (y - 10) + 'px';
    document.body.appendChild(fx);

    /* Adicionar ao ZapEconomy + XP do NP84 */
    if (window.ZapEconomy)  window.ZapEconomy.addCoins(DROP_VALUE, 'drop_collect');
    if (window.NP84 && window.NP84.XP && typeof window.NP84.XP.add === 'function') {
      window.NP84.XP.add(2, 'zap_companion_drop');
    }

    _updateCoinsDisplay();
    if (_dom.badge) {
      _dom.badge.style.transform = 'scale(1.4)';
      setTimeout(function () {
        if (_dom.badge) _dom.badge.style.transform = '';
      }, 200);
    }

    _state.activeDrop = null;

    /* Remove drop do DOM após animação */
    setTimeout(function () {
      if (drop.el && drop.el.parentNode) drop.el.parentNode.removeChild(drop.el);
    }, 350);

    /* Remove fx após animação */
    setTimeout(function () {
      if (fx.parentNode) fx.parentNode.removeChild(fx);
    }, 900);

    /* Reagenda próximo drop */
    _state.dropTimeout = setTimeout(_scheduleDrop, DROP_INTERVAL_MS);
  }

  function _scheduleDrop() {
    if (!_state.mounted) return;
    if (Math.random() < DROP_CHANCE) {
      _spawnDrop();
    } else {
      /* Não spawnou — reagenda */
      _state.dropTimeout = setTimeout(_scheduleDrop, DROP_INTERVAL_MS);
    }
  }

  function _startDropCycle() {
    clearTimeout(_state.dropTimeout);
    /* Primeiro drop após 20-30s para não ser agressivo */
    var firstDelay = 20000 + Math.random() * 10000;
    _state.dropTimeout = setTimeout(_scheduleDrop, firstDelay);
  }

  function _stopDropCycle() {
    clearTimeout(_state.dropTimeout);
    _state.dropTimeout = null;
    _removeDrop();
  }

  /* ═══════════════════════════════════════════════════════════════
     MOUNT / UNMOUNT / DESTROY
     ═══════════════════════════════════════════════════════════════ */

  function mount() {
    if (_state.mounted) return;
    /* R12: guard — não monta se o HUD legado (index.html) estiver ativo */
    var legacyHud = document.getElementById('npAlienHud');
    if (legacyHud && legacyHud.classList.contains('active')) return;
    _state.mounted = true;

    /* Carregar cosméticos */
    _state.cosmetics = window.ZapCosmetics ? window.ZapCosmetics.getEquipped() : null;

    /* Subscrever mudanças de cosméticos */
    if (window.ZapCosmetics) {
      _state.unsubCosmetics = window.ZapCosmetics.onChange(function (s) {
        _state.cosmetics = s;
      });
    }

    /* Subscrever mudanças de moedas */
    if (window.ZapEconomy) {
      _state.unsubEconomy = window.ZapEconomy.onChange(function () {
        _updateCoinsDisplay();
      });
    }

    /* Construir e injetar DOM */
    _buildDOM();
    document.body.appendChild(_dom.overlay);

    /* Restaurar posição salva */
    _restorePosition();

    /* Atualizar badge de moedas */
    _updateCoinsDisplay();

    /* Iniciar sistemas */
    _bindDragListeners();
    _startRaf();
    _scheduleBubble();
    _startDropCycle();

    /* Registrar cleanup no lifecycle do NeonPlay */
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(destroy);
    }
  }

  function unmount() {
    if (!_state.mounted) return;
    _state.mounted = false;

    _stopRaf();
    _stopDropCycle();

    clearTimeout(_state.bubbleTimeout);
    clearTimeout(_state.bubbleScheduleTimeout);
    _state.bubbleTimeout         = null;
    _state.bubbleScheduleTimeout = null;

    _unbindDragListeners();

    if (_state.unsubCosmetics) { _state.unsubCosmetics(); _state.unsubCosmetics = null; }
    if (_state.unsubEconomy)   { _state.unsubEconomy();   _state.unsubEconomy   = null; }

    if (_dom.overlay && _dom.overlay.parentNode) {
      _dom.overlay.style.opacity = '0';
      _dom.overlay.style.transition = 'opacity 0.3s';
      /* Remove após fade */
      setTimeout(function () {
        if (_dom.overlay && _dom.overlay.parentNode) {
          _dom.overlay.parentNode.removeChild(_dom.overlay);
        }
      }, 350);
    }
  }

  function destroy() {
    unmount();
    _dom.overlay = null;
    _dom.widget  = null;
    _dom.canvas  = null;
    _dom.ctx     = null;
    _dom.bubble  = null;
    _dom.badge   = null;
  }

  /* ═══════════════════════════════════════════════════════════════
     INICIALIZAÇÃO — observa gameFrameWrap + eventos NP
     ═══════════════════════════════════════════════════════════════ */

  function _init() {
    /* R10: escutar BRAIN:SPEECH — Companion é View puro, renderiza o que o Brain decide */
    if (window.ZapEventBus && window.ZAP_EVENTS) {
      var _onBrainSpeech = function (data) {
        if (data && data.text) _showBubble(data.text);
      };
      window.ZapEventBus.on(window.ZAP_EVENTS.BRAIN_SPEECH, _onBrainSpeech);
    }

    /* 1. Tentar via NP.events (gameplay:start / gameplay:end) */
    if (window.NP && window.NP.events) {
      window.NP.events.on('gameplay:start', mount);
      window.NP.events.on('gameplay:end',   unmount);
    }

    /* 2. MutationObserver no gameFrameWrap como fallback robusto */
    function _checkGameFrame() {
      var wrap = document.getElementById('gameFrameWrap');
      if (!wrap) return false;
      var visible = wrap.style.display !== 'none' && wrap.style.display !== '';
      if (visible && !_state.mounted) mount();
      if (!visible && _state.mounted) unmount();
      return true;
    }

    /* HOTFIX R20.6: observar o elemento gameFrameWrap diretamente em vez
       de document.body com subtree:true — reduz callbacks do observer
       drasticamente (apenas mudanças de style no elemento alvo).
       Fallback: se gameFrameWrap não existe ainda (SPA), observa body
       com debounce de 100ms mínimo conforme spec de auditoria.           */
    var _debounceTimer = null;
    var observer = new MutationObserver(function () {
      /* gameFrameWrap observer: atributo style mudou diretamente no alvo */
      _checkGameFrame();
    });

    var _bodyObserver   = null; /* fallback para SPA onde wrap não existe ainda */
    var _observerActive = false;

    function _attachObserver() {
      var wrap = document.getElementById('gameFrameWrap');
      if (wrap && !_observerActive) {
        _observerActive = true;
        /* Observar apenas o elemento, não o body inteiro */
        observer.observe(wrap, { attributes: true, attributeFilter: ['style'] });
        _checkGameFrame();
        /* Desconectar body observer se estava ativo */
        if (_bodyObserver) { _bodyObserver.disconnect(); _bodyObserver = null; }
      } else if (!wrap && !_bodyObserver) {
        /* gameFrameWrap ainda não existe — body fallback com debounce */
        _bodyObserver = new MutationObserver(function () {
          clearTimeout(_debounceTimer);
          _debounceTimer = setTimeout(function () {
            if (_attachObserver()) {
              /* wrap encontrado — body observer já desconectado em _attachObserver */
            }
          }, 100); /* 100ms mínimo per spec */
        });
        _bodyObserver.observe(document.body, { childList: true, subtree: false });
      }
      return !!wrap;
    }

    /* Safety timer — limpa os observers após SAFETY_TIMEOUT */
    var safetyTimer = setTimeout(function () {
      observer.disconnect();
      if (_bodyObserver) { _bodyObserver.disconnect(); _bodyObserver = null; }
      clearTimeout(_debounceTimer);
    }, SAFETY_TIMEOUT);

    /* Registrar cleanup do safetyTimer no lifecycle */
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(function () {
        clearTimeout(safetyTimer);
        clearTimeout(_debounceTimer);
        observer.disconnect();
        if (_bodyObserver) { _bodyObserver.disconnect(); _bodyObserver = null; }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        _attachObserver();
      });
    } else {
      _attachObserver();
    }
  }

  /* ── Aguardar bundle.min.js ─────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  /* ── API pública ────────────────────────────────────────────── */
  window.ZapCompanion = {
    mount:   mount,
    unmount: unmount,
    destroy: destroy,
    showBubble: function (text) { _showBubble(text); },
    /* Hooks para ZapConnect — atualizam UI sem re-broadcast */
    _syncCoins: function (total) { _updateCoinsDisplay(total); },
    _syncCosmetics: function (state) { _state.cosmetics = state; /* canvas lê fresco em _drawZap */ },
    version: 'r7.1'
  };

}(window, document));
