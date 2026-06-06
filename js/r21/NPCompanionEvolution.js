/**
 * NeonPlay R21 — NPCompanionEvolution.js
 * Evolução visual do Companion (Zap) baseada em progressão do jogador.
 *
 * REGRAS:
 * - NÃO modifica ZapCompanion, ZapBioreactive, ZapBrain, ZapSentience
 * - Opera via CSS custom properties no .zc-widget (camada adicional)
 * - Subscribe CORE:LEVEL_UP — apenas leitura
 * - Emite companion:form_change via ZapEventBus (graceful, non-breaking)
 * - Não injeta nada durante Gameplay Sanctuary
 * - Guard double-init
 * - prefers-reduced-motion: animações completamente desabilitadas
 * - Mobile-safe: testado para viewport 375px
 * - localStorage: np_companion_evo_v1
 */
;(function(window, document) {
  'use strict';

  if (window.__NP_COMPANION_EVOLUTION__) return;
  window.__NP_COMPANION_EVOLUTION__ = true;

  var STORAGE_KEY = 'np_companion_evo_v1';

  /* ── Formas de evolução ─────────────────────────────────────── */
  /* Cada forma aplica CSS custom properties no .zc-widget
     sem modificar o canvas pipeline interno do Companion */
  var EVOLUTION_FORMS = [
    {
      id:        'spark',
      name:      'Faísca Galáctica',
      minLevel:  1,
      maxLevel:  4,
      /* CSS vars aplicados ao .zc-widget */
      css: {
        '--zap-evo-glow':   '0 0 8px #06b6d4, 0 0 16px #06b6d422',
        '--zap-evo-scale':  '1',
        '--zap-evo-border': '2px solid #06b6d444'
      },
      /* Classe CSS adicional (sem remover classes do Companion) */
      class: 'np-evo--spark'
    },
    {
      id:        'nova',
      name:      'Nova Estelar',
      minLevel:  5,
      maxLevel:  14,
      css: {
        '--zap-evo-glow':   '0 0 12px #a855f7, 0 0 28px #a855f733',
        '--zap-evo-scale':  '1.04',
        '--zap-evo-border': '2px solid #a855f766'
      },
      class: 'np-evo--nova'
    },
    {
      id:        'nebula',
      name:      'Nebulosa Cósmica',
      minLevel:  15,
      maxLevel:  24,
      css: {
        '--zap-evo-glow':   '0 0 18px #e8196b, 0 0 40px #e8196b33',
        '--zap-evo-scale':  '1.08',
        '--zap-evo-border': '2px solid #e8196b88'
      },
      class: 'np-evo--nebula'
    },
    {
      id:        'singularity',
      name:      'Singularidade',
      minLevel:  25,
      maxLevel:  Infinity,
      css: {
        '--zap-evo-glow':   '0 0 24px #fbbf24, 0 0 60px #fbbf2444, 0 0 80px #fbbf2411',
        '--zap-evo-scale':  '1.12',
        '--zap-evo-border': '2px solid #fbbf24'
      },
      class: 'np-evo--singularity'
    }
  ];

  /* ── Estado ─────────────────────────────────────────────────── */
  function _loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') ||
             { currentForm: 'spark', lastLevel: 1 };
    } catch(e) {
      return { currentForm: 'spark', lastLevel: 1 };
    }
  }

  function _saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  var _state = _loadState();

  /* ── Obter forma para nível ────────────────────────────────── */
  function _getFormForLevel(level) {
    for (var i = EVOLUTION_FORMS.length - 1; i >= 0; i--) {
      if (level >= EVOLUTION_FORMS[i].minLevel) {
        return EVOLUTION_FORMS[i];
      }
    }
    return EVOLUTION_FORMS[0];
  }

  /* ── Aplicar evolução no DOM ──────────────────────────────── */
  function _applyEvolution(form, isTransition) {
    /* Não aplicar durante gameplay sanctuary */
    var NRT = window.NRT || {};
    if (NRT.gameSession && NRT.gameSession.active) return;

    /* Respeitar prefers-reduced-motion */
    var reducedMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var widget = document.querySelector('.zc-widget');
    if (!widget) return;

    /* Remover classes de evolução anteriores */
    EVOLUTION_FORMS.forEach(function(f) {
      widget.classList.remove(f.class);
    });

    /* Aplicar nova classe */
    widget.classList.add(form.class);

    /* Aplicar CSS custom properties */
    Object.keys(form.css).forEach(function(prop) {
      widget.style.setProperty(prop, form.css[prop]);
    });

    /* Aplicar box-shadow via CSS var se suportado */
    widget.style.boxShadow = form.css['--zap-evo-glow'] || '';
    widget.style.transform = 'scale(' + (form.css['--zap-evo-scale'] || '1') + ')';
    widget.style.border    = form.css['--zap-evo-border'] || '';

    /* Transição de evolução (se não reduced motion) */
    if (isTransition && !reducedMotion) {
      _playEvolutionEffect(widget, form);
    }
  }

  /* ── Efeito de evolução ──────────────────────────────────── */
  function _playEvolutionEffect(widget, form) {
    /* Pulse rápido de luz */
    var prevTransition = widget.style.transition;
    widget.style.transition = 'transform .2s, box-shadow .3s, border-color .3s';

    var scaleBase = parseFloat(form.css['--zap-evo-scale'] || '1');
    widget.style.transform = 'scale(' + (scaleBase + 0.15) + ')';
    setTimeout(function() {
      widget.style.transform = 'scale(' + scaleBase + ')';
      setTimeout(function() {
        widget.style.transition = prevTransition;
      }, 300);
    }, 200);

    /* Partículas de evolução */
    _spawnEvolutionParticles(widget);
  }

  function _spawnEvolutionParticles(widget) {
    var rect = widget.getBoundingClientRect();
    if (!rect.width) return;

    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    for (var i = 0; i < 8; i++) {
      (function(idx) {
        setTimeout(function() {
          var p = document.createElement('div');
          p.style.cssText = [
            'position:fixed',
            'width:6px',
            'height:6px',
            'border-radius:50%',
            'background:#a855f7',
            'left:' + (cx - 3) + 'px',
            'top:' + (cy - 3) + 'px',
            'pointer-events:none',
            'z-index:9900',
            'opacity:1',
            'transition:transform .6s ease-out, opacity .6s ease-out'
          ].join(';');
          document.body.appendChild(p);

          var angle  = (idx / 8) * Math.PI * 2;
          var dist   = 40 + Math.random() * 30;
          var tx     = Math.cos(angle) * dist;
          var ty     = Math.sin(angle) * dist;

          requestAnimationFrame(function() {
            p.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
            p.style.opacity   = '0';
          });

          setTimeout(function() {
            if (p.parentNode) p.parentNode.removeChild(p);
          }, 700);
        }, idx * 30);
      })(i);
    }
  }

  /* ── Handler de level up ───────────────────────────────────── */
  function _onLevelUp(data) {
    var newLevel = (data && data.newLevel) || 0;
    if (!newLevel) return;

    var currentForm = _getFormForLevel(_state.lastLevel);
    var newForm     = _getFormForLevel(newLevel);
    var evolved     = newForm.id !== currentForm.id;

    _state.lastLevel    = newLevel;
    _state.currentForm  = newForm.id;
    _saveState(_state);

    /* Sempre atualizar CSS (pode ter subido de nível dentro da mesma forma) */
    _applyEvolution(newForm, evolved);

    if (evolved) {
      /* Emitir companion:form_change via ZapEventBus */
      if (window.ZapEventBus && window.ZAP_EVENTS) {
        try {
          ZapEventBus.emit(ZAP_EVENTS.COMPANION_FORM_CHANGE, {
            fromForm: currentForm.id,
            toForm:   newForm.id,
            trigger:  'level_up_' + newLevel
          });
        } catch(e) {}
      }

      /* ZapBioreactive graceful: tenta ativar high arousal por 3s */
      try {
        if (window.ZapSentience && window.ZapSentience._state) {
          /* Boost temporário de arousal para celebração */
          var s = ZapSentience._state;
          if (typeof s.arousal !== 'undefined') {
            s.arousal = Math.min(1, (s.arousal || 0) + 0.4);
            setTimeout(function() {
              s.arousal = Math.max(0, (s.arousal || 0) - 0.4);
            }, 3000);
          }
        }
      } catch(e) {}

      /* Mostrar notificação de evolução */
      _showEvolutionNotification(newForm);

      if (window.NP_DEBUG) {
        console.log('[NPCompanionEvolution] Form change:', currentForm.id, '→', newForm.id);
      }
    }
  }

  function _showEvolutionNotification(form) {
    var NRT = window.NRT || {};
    if (NRT.gameSession && NRT.gameSession.active) return;

    var notif = document.createElement('div');
    notif.className = 'np-evo-notif';
    notif.setAttribute('role', 'status');
    notif.setAttribute('aria-live', 'polite');
    notif.innerHTML =
      '<div class="np-evo-notif-inner">' +
        '<span class="np-evo-notif-icon">✨</span>' +
        '<div>' +
          '<strong>Zap Evoluiu!</strong><br>' +
          '<span>' + form.name + '</span>' +
        '</div>' +
      '</div>';
    notif.style.cssText = [
      'position:fixed',
      'bottom:120px',
      'right:16px',
      'background:linear-gradient(135deg,#1a0a2e,#251b45)',
      'border:1px solid #fbbf24',
      'border-radius:16px',
      'padding:14px 20px',
      'color:#fff',
      'font-family:system-ui,sans-serif',
      'font-size:14px',
      'box-shadow:0 0 40px #fbbf2433',
      'z-index:9998',
      'max-width:240px',
      'animation:np-evo-in .5s cubic-bezier(.175,.885,.32,1.275)'
    ].join(';');
    document.body.appendChild(notif);
    setTimeout(function() {
      notif.style.transition = 'opacity .5s';
      notif.style.opacity = '0';
      setTimeout(function() {
        if (notif.parentNode) notif.parentNode.removeChild(notif);
      }, 500);
    }, 4000);
  }

  /* ── API pública ─────────────────────────────────────────────── */
  var NPCompanionEvolution = {
    getCurrentForm: function() {
      return _getFormForLevel(_state.lastLevel);
    },

    getAllForms: function() {
      return EVOLUTION_FORMS.map(function(f) {
        return {
          id:        f.id,
          name:      f.name,
          minLevel:  f.minLevel,
          unlocked:  _state.lastLevel >= f.minLevel
        };
      });
    },

    init: function() {
      /* ZapEventBus: CORE:LEVEL_UP */
      if (window.ZapEventBus && window.ZAP_EVENTS) {
        ZapEventBus.on(ZAP_EVENTS.CORE_LEVEL_UP, _onLevelUp);
      }

      /* NPBus: LEVEL_UP */
      if (window.NPBus) {
        NPBus.on(NPBus.EV.LEVEL_UP, function(data) { _onLevelUp(data); });
      }

      /* Aplicar forma atual sem transição (carregamento inicial) */
      setTimeout(function() {
        var ZPS = window.ZapProgressionSystem;
        if (ZPS && ZPS._ready) {
          var prog = ZPS.getProgress();
          _state.lastLevel = prog.level || 1;
          _saveState(_state);
        }
        var form = _getFormForLevel(_state.lastLevel);
        _state.currentForm = form.id;
        _applyEvolution(form, false);
      }, 1200);

      /* Cleanup */
      if (window.NP && window.NP.lifecycle && NP.lifecycle.registerCleanup) {
        NP.lifecycle.registerCleanup(function() {
          if (window.ZapEventBus && window.ZAP_EVENTS) {
            ZapEventBus.off(ZAP_EVENTS.CORE_LEVEL_UP, _onLevelUp);
          }
        });
      }

      if (window.NP_DEBUG) console.log('[NPCompanionEvolution] init OK. Form:', _state.currentForm);
    }
  };

  window.NPCompanionEvolution = NPCompanionEvolution;

})(window, document);
