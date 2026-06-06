/* ══════════════════════════════════════════════════════════════════
   NeonPlay Patch R20.8 — Hardening Pass
   Arquivo: np-r20-8-hardening.js
   Carregado via <script defer> após np-r20-8.js

   CORRIGE:
   [BUG-07] Inline onclicks com timing frágil (openVault, ZapStore,
            zapCinematics, ZapQuestEngine) — substitui por addEventListener
            com guards de disponibilidade do global.
   [P1-01]  Focus traps ausentes nos 3 modais principais:
            #npZapIntro, #npLvlOverlay, #zapGallery

   REGRAS:
   - Zero alteração em HTML
   - Zero novos globals
   - Patches cirúrgicos via addEventListener após DOMContentLoaded
   - Compatível R20.1 → R20.8
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__NP_R208_HARDENING__) return;
  window.__NP_R208_HARDENING__ = true;

  /* ── Utilitário seguro ─────────────────────────────────────────── */
  function safe(fn, label) {
    try { return fn(); }
    catch (e) { if (window.NP_DEBUG) console.warn('[NP R20.8 Hardening]', label, e.message); }
  }

  /* ── Chamar global com retry até estar disponível ──────────────── */
  function _callWhenReady(globalPath, method, args, retries) {
    retries = retries || 0;
    if (retries > 20) return; /* desiste após 2s */

    safe(function () {
      var parts = globalPath.split('.');
      var obj = window;
      for (var i = 0; i < parts.length; i++) {
        obj = obj[parts[i]];
        if (!obj) break;
      }
      if (typeof obj === 'function') {
        obj.apply(null, args || []);
      } else if (method && obj && typeof obj[method] === 'function') {
        obj[method].apply(obj, args || []);
      } else {
        /* Tentar novamente em 100ms */
        setTimeout(function () { _callWhenReady(globalPath, method, args, retries + 1); }, 100);
      }
    }, 'callWhenReady:' + globalPath);
  }

  /* ════════════════════════════════════════════════════════════════
     [BUG-07] ONCLICK GUARDS
     Substitui chamadas inline por addEventListener com verificação
     de disponibilidade do global no momento do clique.
     ════════════════════════════════════════════════════════════════ */

  function _patchOnclicks() {
    /* ── zapVaultBtn ── */
    safe(function () {
      var btn = document.getElementById('zapVaultBtn');
      if (!btn) return;
      /* Remover onclick inline substituindo por listener seguro */
      btn.removeAttribute('onclick');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof window.openVault === 'function') {
          window.openVault();
        } else {
          /* Fallback: abrir zapGallery diretamente */
          var g = document.getElementById('zapGallery');
          if (g) g.classList.add('show');
          _callWhenReady('openVault', null, [], 0);
        }
      });
    }, 'patchOnclicks-zapVaultBtn');

    /* ── zgTabLore / zgTabStore (ZapStore.showTab) ── */
    safe(function () {
      var lore  = document.getElementById('zgTabLore');
      var store = document.getElementById('zgTabStore');
      if (lore) {
        lore.removeAttribute('onclick');
        lore.addEventListener('click', function () {
          if (window.ZapStore && typeof window.ZapStore.showTab === 'function') {
            window.ZapStore.showTab('lore');
          }
        });
      }
      if (store) {
        store.removeAttribute('onclick');
        store.addEventListener('click', function () {
          if (window.ZapStore && typeof window.ZapStore.showTab === 'function') {
            window.ZapStore.showTab('store');
          }
        });
      }
    }, 'patchOnclicks-ZapStore');

    /* ── zapCinematics.skip ── */
    safe(function () {
      var skipBtn = document.querySelector('.zce-skip');
      if (!skipBtn) return;
      skipBtn.removeAttribute('onclick');
      skipBtn.addEventListener('click', function () {
        if (window.zapCinematics && typeof window.zapCinematics.skip === 'function') {
          window.zapCinematics.skip();
        } else {
          /* Fallback: esconder overlay */
          var overlay = document.getElementById('zapCinematicOverlay');
          if (overlay) overlay.style.display = 'none';
        }
      });
    }, 'patchOnclicks-zapCinematics');

    /* ── zapQuestToggle ── */
    safe(function () {
      var toggle = document.getElementById('zapQuestToggle');
      if (!toggle) return;
      toggle.removeAttribute('onclick');
      toggle.addEventListener('click', function () {
        if (window.ZapQuestEngine && typeof window.ZapQuestEngine.togglePanel === 'function') {
          window.ZapQuestEngine.togglePanel();
        } else {
          /* Fallback: toggle classe collapsed no panel */
          var panel = document.getElementById('zapQuestPanel');
          if (panel) panel.classList.toggle('collapsed');
        }
      });
    }, 'patchOnclicks-zapQuestToggle');

    /* ── zqp-header (dentro do quest panel) ── */
    safe(function () {
      var header = document.querySelector('.zqp-header');
      if (!header) return;
      header.removeAttribute('onclick');
      header.addEventListener('click', function () {
        if (window.ZapQuestEngine && typeof window.ZapQuestEngine.togglePanel === 'function') {
          window.ZapQuestEngine.togglePanel();
        } else {
          var panel = document.getElementById('zapQuestPanel');
          if (panel) panel.classList.toggle('collapsed');
        }
      });
    }, 'patchOnclicks-zqpHeader');

    /* ── zapGallery close button ── */
    safe(function () {
      var closeBtn = document.querySelector('.zg-close');
      if (!closeBtn) return;
      closeBtn.removeAttribute('onclick');
      closeBtn.addEventListener('click', function () {
        var gallery = document.getElementById('zapGallery');
        if (gallery) gallery.classList.remove('show');
      });
    }, 'patchOnclicks-zgClose');

    if (window.NP_DEBUG) console.info('[NP R20.8 Hardening] BUG-07: onclick guards applied');
  }


  /* ════════════════════════════════════════════════════════════════
     [P1-01] FOCUS TRAPS
     Implementa focus trap WCAG 2.1 nos 3 modais:
     - #npZapIntro
     - #npLvlOverlay
     - #zapGallery
     ════════════════════════════════════════════════════════════════ */

  var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  /* Criar focus trap para um elemento modal */
  function _createFocusTrap(modalEl) {
    if (!modalEl) return null;

    var _active = false;
    var _handler = null;

    function _getFocusables() {
      return Array.prototype.slice.call(modalEl.querySelectorAll(FOCUSABLE))
        .filter(function (el) {
          return !el.closest('[aria-hidden="true"]') && el.offsetParent !== null;
        });
    }

    function _trapTab(e) {
      if (!_active) return;
      if (e.key !== 'Tab' && e.keyCode !== 9) return;

      var focusables = _getFocusables();
      if (!focusables.length) { e.preventDefault(); return; }

      var first = focusables[0];
      var last  = focusables[focusables.length - 1];

      if (e.shiftKey) {
        /* Shift+Tab: se no primeiro, vai para o último */
        if (document.activeElement === first || !modalEl.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        /* Tab: se no último, vai para o primeiro */
        if (document.activeElement === last || !modalEl.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function activate() {
      _active = true;
      /* Focar o primeiro elemento focalizável */
      setTimeout(function () {
        var focusables = _getFocusables();
        if (focusables.length) focusables[0].focus();
      }, 50);
      document.addEventListener('keydown', _trapTab);
    }

    function deactivate() {
      _active = false;
      document.removeEventListener('keydown', _trapTab);
    }

    return { activate: activate, deactivate: deactivate };
  }

  function _patchFocusTraps() {

    /* ── #npZapIntro ── */
    safe(function () {
      var intro = document.getElementById('npZapIntro');
      if (!intro) return;

      var trap = _createFocusTrap(intro);

      /* Ativar quando intro é mostrado (está visível por padrão no load) */
      /* Verificar visibilidade inicial */
      if (intro.offsetParent !== null && getComputedStyle(intro).opacity !== '0') {
        trap.activate();
      }

      /* Monitorar quando intro some (opacity → 0 via classe) */
      var _observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
            var style = getComputedStyle(intro);
            var hidden = style.opacity === '0' || style.display === 'none' || intro.hasAttribute('hidden');
            if (hidden) {
              trap.deactivate();
              _observer.disconnect();
            }
          }
        });
      });
      _observer.observe(intro, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });

      /* Tecla Escape no intro → focar o botão de entrar (se existir) */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          var enterBtn = document.getElementById('npiEnterBtn');
          if (enterBtn && intro.offsetParent !== null) enterBtn.focus();
        }
      });

      if (window.NP_DEBUG) console.info('[NP R20.8 Hardening] Focus trap: #npZapIntro');
    }, 'focusTrap-npZapIntro');

    /* ── #npLvlOverlay ── */
    safe(function () {
      var overlay = document.getElementById('npLvlOverlay');
      if (!overlay) return;

      var trap = _createFocusTrap(overlay);
      var _prevFocus = null;

      /* Monitorar classe .show */
      var _obs = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            if (overlay.classList.contains('show')) {
              _prevFocus = document.activeElement;
              trap.activate();
            } else {
              trap.deactivate();
              /* Restaurar foco anterior */
              if (_prevFocus && typeof _prevFocus.focus === 'function') {
                setTimeout(function () { _prevFocus.focus(); }, 50);
              }
            }
          }
        });
      });
      _obs.observe(overlay, { attributes: true, attributeFilter: ['class'] });

      /* Escape fecha o overlay */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('show')) {
          overlay.classList.remove('show');
        }
      });

      if (window.NP_DEBUG) console.info('[NP R20.8 Hardening] Focus trap: #npLvlOverlay');
    }, 'focusTrap-npLvlOverlay');

    /* ── #zapGallery ── */
    safe(function () {
      var gallery = document.getElementById('zapGallery');
      if (!gallery) return;

      var trap = _createFocusTrap(gallery);
      var _prevFocus = null;

      var _obs = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            if (gallery.classList.contains('show')) {
              _prevFocus = document.activeElement;
              trap.activate();
            } else {
              trap.deactivate();
              if (_prevFocus && typeof _prevFocus.focus === 'function') {
                setTimeout(function () { _prevFocus.focus(); }, 50);
              }
            }
          }
        });
      });
      _obs.observe(gallery, { attributes: true, attributeFilter: ['class'] });

      /* Escape fecha a gallery */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && gallery.classList.contains('show')) {
          gallery.classList.remove('show');
        }
      });

      if (window.NP_DEBUG) console.info('[NP R20.8 Hardening] Focus trap: #zapGallery');
    }, 'focusTrap-zapGallery');

    if (window.NP_DEBUG) console.info('[NP R20.8 Hardening] P1-01: Focus traps applied to 3 modals');
  }


  /* ════════════════════════════════════════════════════════════════
     [P2-06] COMPANION KEYBOARD ACCESS
     Torna o companion widget focalizável via teclado.
     Adiciona tabindex="0" e keydown handler para abrir bolha.
     ════════════════════════════════════════════════════════════════ */

  function _patchCompanionA11y() {
    safe(function () {
      /* HUD companion (index.html) */
      var hudAlien = document.getElementById('nphAlienWrap');
      if (hudAlien) {
        hudAlien.setAttribute('tabindex', '0');
        hudAlien.setAttribute('role', 'button');
        hudAlien.setAttribute('aria-label', 'Zap — companion intergaláctico. Clique para interagir.');
        hudAlien.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            hudAlien.click();
          }
        });
      }

      /* ZapCompanion widget (.zc-widget) */
      var zcWidget = document.querySelector('.zc-widget');
      if (zcWidget && !zcWidget.hasAttribute('tabindex')) {
        zcWidget.setAttribute('tabindex', '0');
        zcWidget.setAttribute('role', 'button');
        zcWidget.setAttribute('aria-label', 'Zap — companion intergaláctico.');
        zcWidget.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            zcWidget.click();
          }
        });
      }

      if (window.NP_DEBUG) console.info('[NP R20.8 Hardening] P2-06: Companion keyboard access applied');
    }, 'patchCompanionA11y');
  }


  /* ════════════════════════════════════════════════════════════════
     BOOT
     ════════════════════════════════════════════════════════════════ */

  function _boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _init);
    } else {
      _init();
    }
  }

  function _init() {
    safe(_patchOnclicks,     'boot-patchOnclicks');
    safe(_patchFocusTraps,   'boot-patchFocusTraps');
    safe(_patchCompanionA11y,'boot-patchCompanionA11y');

    if (window.NP_DEBUG) console.info('[NP R20.8 Hardening] All hardening patches applied');
  }

  _boot();

  /* ── API mínima para debug ───────────────────────────────────── */
  window.NPR208Hardening = {
    version: 'R20.8.0-hardening'
  };

})();
