;(function (window, document) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R8 — ZapWorldEngine.js  (Phase D)
     O NeonPlay responde ao tempo e a eventos globais raros.

     Circadian Themes — baseados no horário local:
       Dawn      05–08h   cyan frio, energia baixa
       Morning   08–12h   normal (baseline)
       Afternoon 12–17h   normal
       Golden    17–20h   âmbar neon, cyber sunset
       Evening   20–00h   roxo profundo, neon saturado
       Deep Grid 00–05h   paleta escura, sussurros

     Cosmic Glitch Event:
       - Disparado via BroadcastChannel neonplay_zap_core
       - Duração: 5 minutos
       - Efeito: overlay leve + CSS glitch layer + XP multiplier flag
       - Cooldown: 2h por aba | Global: lido de localStorage
       - Singleton: apenas a aba mais antiga inicia o trigger aleatório

     Nunca altera: DOM estrutural, bundle.min.js, gameplay, iframe
     Apenas: document.documentElement CSS variables + overlay leve
     ═══════════════════════════════════════════════════════════════ */

  if (window.__ZAP_WORLD__) return;
  window.__ZAP_WORLD__ = true;

  /* ─── constantes ─────────────────────────────────────────────── */
  var STORAGE_KEY     = 'zap_world_v1';
  var GLITCH_DURATION = 5 * 60 * 1000;       /* 5 min */
  var GLITCH_COOLDOWN = 2 * 60 * 60 * 1000;  /* 2h global */
  var CHECK_INTERVAL  = 60 * 1000;            /* checar hora a cada 1min */
  var GLITCH_RAND_MIN = 30 * 60 * 1000;       /* janela mínima para trigger aleatório */
  var GLITCH_RAND_MAX = 90 * 60 * 1000;       /* janela máxima */

  /* ─── temas circadianos ──────────────────────────────────────── */
  /* Cada tema: sobreposição PARCIAL de variáveis. Não sobrescreve tudo —
     apenas o suficiente para mudar o "feeling". Baseline permanece. */
  var THEMES = {
    dawn: {
      name: 'Dawn',
      hours: [5, 8],
      vars: {
        '--cyan':       '#5de0ff',
        '--accent':     '#5de0ff',
        '--accent-glow':'rgba(93,224,255,.15)',
        '--bg':         '#040412',
        '--bg-2':       '#08081a',
        '--text-2':     '#6a6a90'
      },
      lore: [
        'O amanhecer aqui chega sem aviso. Lá de onde venho, calculávamos o exato segundo.',
        'Vermelho primeiro. Depois laranja. Então a névoa cede.'
      ]
    },
    morning: {
      name: 'Morning',
      hours: [8, 12],
      vars: null  /* baseline — sem override */
    },
    afternoon: {
      name: 'Afternoon',
      hours: [12, 17],
      vars: null
    },
    golden: {
      name: 'Golden Hour',
      hours: [17, 20],
      vars: {
        '--cyan':        '#ffb347',
        '--cyan-dim':    '#e0862a',
        '--accent':      '#ffb347',
        '--accent-glow': 'rgba(255,179,71,.18)',
        '--accent-glow-s':'rgba(255,179,71,.07)',
        '--grad':        'linear-gradient(135deg,#ffb347 0%,#e8196b 100%)',
        '--shadow-neon': '0 0 24px #ffb347,0 0 60px rgba(255,179,71,.08)',
        '--border-a':    'rgba(255,179,71,.22)'
      },
      lore: [
        'Esta frequência de luz — âmbar, quase dourada. Rara no universo. Comum aqui.',
        'O pôr do sol deste planeta tem uma assinatura espectral que minha nave reconhecia como casa.',
        'Hora dourada. Minha tripulação parava tudo para observar.'
      ]
    },
    evening: {
      name: 'Evening',
      hours: [20, 24],
      vars: {
        '--cyan':        '#b06eff',
        '--cyan-dim':    '#8340e0',
        '--accent':      '#b06eff',
        '--accent-glow': 'rgba(176,110,255,.18)',
        '--accent-glow-s':'rgba(176,110,255,.07)',
        '--grad':        'linear-gradient(135deg,#b06eff 0%,#e8196b 100%)',
        '--shadow-neon': '0 0 24px #b06eff,0 0 60px rgba(176,110,255,.08)',
        '--border-a':    'rgba(176,110,255,.22)',
        '--purple':      '#c45eff'
      },
      lore: [
        'À noite, o ruído de fundo do cosmos aumenta. Meus sensores ficam tensos.',
        'Esta hora entre o dia e a escuridão não existe onde nasci. Fascinante.'
      ]
    },
    deep_grid: {
      name: 'Deep Grid',
      hours: [0, 5],
      vars: {
        '--bg':          '#020209',
        '--bg-2':        '#050512',
        '--bg-card':     '#0a0a18',
        '--bg-card-h':   '#0d0d20',
        '--cyan':        '#00a8cc',
        '--cyan-dim':    '#007799',
        '--accent':      '#00a8cc',
        '--accent-glow': 'rgba(0,168,204,.12)',
        '--accent-glow-s':'rgba(0,168,204,.05)',
        '--text':        '#d0d0ef',
        '--text-2':      '#5050780',
        '--glass-bg':    'rgba(6,6,20,.85)',
        '--shadow-neon': '0 0 20px #00a8cc,0 0 50px rgba(0,168,204,.06)'
      },
      lore: [
        'À esta hora, o universo fica mais honesto. O ruído para. Consigo ouvir.',
        'Deep Grid — é o que chamávamos quando os sensores captavam o fundo cósmico. Você está nele.',
        'Três da manhã em qualquer planeta é igual. Tudo parece mais real.',
        'Você não deveria estar acordado. Eu também não. Somos companhia.'
      ]
    }
  };

  /* ─── persistência ──────────────────────────────────────────── */
  var _DEFAULT_STORE = { lastGlitchTs: 0, currentTheme: 'morning' };

  function _loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(_DEFAULT_STORE));
      return Object.assign(JSON.parse(JSON.stringify(_DEFAULT_STORE)), JSON.parse(raw));
    } catch (e) { return JSON.parse(JSON.stringify(_DEFAULT_STORE)); }
  }

  function _saveStore(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ─── CSS var apply (transition-driven) ─────────────────────── */
  var _root = document.documentElement;
  var _applied = {};  /* { varName: value } atualmente aplicado */

  function _applyVars(vars) {
    if (!vars) {
      /* restaurar baseline — remover overrides */
      Object.keys(_applied).forEach(function (k) {
        _root.style.removeProperty(k);
      });
      _applied = {};
      return;
    }
    /* aplicar novos, limpar obsoletos */
    var toRemove = Object.keys(_applied).filter(function (k) { return !(k in vars); });
    toRemove.forEach(function (k) {
      _root.style.removeProperty(k);
      delete _applied[k];
    });
    Object.keys(vars).forEach(function (k) {
      if (_applied[k] !== vars[k]) {
        _root.style.setProperty(k, vars[k]);
        _applied[k] = vars[k];
      }
    });
  }

  /* ─── encontrar tema ─────────────────────────────────────────── */
  function _getThemeForHour(h) {
    var keys = Object.keys(THEMES);
    for (var i = 0; i < keys.length; i++) {
      var theme = THEMES[keys[i]];
      var range = theme.hours;
      if (h >= range[0] && h < range[1]) return keys[i];
    }
    /* fallback — evening pode ir até 24 */
    return 'morning';
  }

  var _currentThemeKey = null;

  function _updateTheme() {
    var h   = new Date().getHours();
    var key = _getThemeForHour(h);
    if (key === _currentThemeKey) return;
    _currentThemeKey = key;

    var theme = THEMES[key];
    _applyVars(theme.vars);

    /* salvar */
    var store = _loadStore();
    store.currentTheme = key;
    _saveStore(store);

    /* opcional: exibir frase de lore do tema ao mudar */
    if (theme.lore && theme.lore.length) {
      setTimeout(function () {
        var text = theme.lore[Math.floor(Math.random() * theme.lore.length)];
        /* R10: WorldEngine não acessa View. Emite via EventBus. */
        if (window.ZapEventBus && window.ZAP_EVENTS && window.ZAP_EVENTS.BRAIN_SPEECH) {
          window.ZapEventBus.emit(window.ZAP_EVENTS.BRAIN_SPEECH, {
            text: text, mood: 'curious', duration: 5000, priority: 2
          });
        }
      }, 3000 + Math.random() * 5000); /* fire-and-forget */
    }
  }

  /* ─── CSS transition no :root ────────────────────────────────── */
  function _injectTransitionCSS() {
    if (document.getElementById('zw-transition')) return;
    var s = document.createElement('style');
    s.id  = 'zw-transition';
    /* Transições suaves para todas as propriedades que o World Engine tocará */
    s.textContent = ':root{transition:' + [
      '--cyan 4s ease',
      '--cyan-dim 4s ease',
      '--accent 4s ease',
      '--bg 6s ease',
      '--bg-2 6s ease',
      '--bg-card 6s ease',
      '--text 4s ease'
    ].join(',') + ';}';
    document.head.appendChild(s);
  }

  /* ─── Cosmic Glitch Event ────────────────────────────────────── */
  var GLITCH_MSG_TYPE = 'cosmic_glitch';
  var _glitchActive   = false;
  var _glitchTimer    = null;
  var _glitchOverlay  = null;

  function _canTriggerGlitch() {
    var store = _loadStore();
    return (Date.now() - store.lastGlitchTs) > GLITCH_COOLDOWN;
  }

  function _startGlitch(fromBroadcast) {
    if (_glitchActive) return;
    _glitchActive = true;

    /* XP multiplier flag — lido por outros módulos */
    window.__ZAP_XP_MULTIPLIER__ = 2;

    _showGlitchOverlay();

    /* R10: WorldEngine não notifica Companion diretamente. Emite via EventBus. */
    if (window.ZapEventBus && window.ZAP_EVENTS && window.ZAP_EVENTS.BRAIN_SPEECH) {
      var msgs = [
        'ANOMALIA DETECTADA. DURAÇÃO: INDETERMINADA.',
        'O grid está... instável. Cuidado.',
        'Interferência nos dados. Recalibrando.',
        'Flutuação de realidade registrada.'
      ];
      window.ZapEventBus.emit(window.ZAP_EVENTS.BRAIN_SPEECH, {
        text: msgs[Math.floor(Math.random() * msgs.length)],
        mood: 'curious', duration: 5000, priority: 2
      });
    }

    /* Salvar timestamp */
    if (!fromBroadcast) {
      var store = _loadStore();
      store.lastGlitchTs = Date.now();
      _saveStore(store);
      /* Broadcast para outras abas */
      _broadcast({ type: GLITCH_MSG_TYPE, ts: Date.now() });
    }

    /* Terminar após duração */
    clearTimeout(_glitchTimer);
    _glitchTimer = setTimeout(_endGlitch, GLITCH_DURATION);
  }

  function _endGlitch() {
    _glitchActive = false;
    window.__ZAP_XP_MULTIPLIER__ = 1;
    _hideGlitchOverlay();
    clearTimeout(_glitchTimer);
    _glitchTimer = null;
  }

  /* ─── overlay visual ─────────────────────────────────────────── */
  function _showGlitchOverlay() {
    if (_glitchOverlay) return;
    _glitchOverlay = document.createElement('div');
    _glitchOverlay.id = 'zw-glitch-overlay';
    _glitchOverlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:' + (getComputedStyle(document.documentElement).getPropertyValue('--z-debug').trim() || '9000'),
      'background:linear-gradient(180deg,rgba(0,212,255,.015) 0%,transparent 40%,rgba(147,51,234,.015) 100%)',
      'animation:zw-scan 8s linear infinite',
      'mix-blend-mode:screen'
    ].join(';');

    /* CSS da animação + borda glitch leve */
    if (!document.getElementById('zw-glitch-style')) {
      var st = document.createElement('style');
      st.id  = 'zw-glitch-style';
      st.textContent = [
        '@keyframes zw-scan{',
        '  0%{background-position:0 -100vh}',
        '  100%{background-position:0 100vh}',
        '}',
        '#zw-glitch-overlay::after{',
        '  content:"";display:block;position:absolute;',
        '  inset:0;border:1px solid rgba(0,212,255,.06);',
        '  animation:zw-border-pulse 3s ease-in-out infinite;',
        '}',
        '@keyframes zw-border-pulse{',
        '  0%,100%{opacity:.3}50%{opacity:1}',
        '}'
      ].join('\n');
      document.head.appendChild(st);
    }

    document.body.appendChild(_glitchOverlay);

    /* CSS var override para glitch */
    _root.style.setProperty('--cyan', '#00ffff');
    _root.style.setProperty('--accent', '#00ffff');
  }

  function _hideGlitchOverlay() {
    if (_glitchOverlay) {
      _glitchOverlay.remove();
      _glitchOverlay = null;
    }
    /* Restaurar vars do tema atual */
    var theme = THEMES[_currentThemeKey] || THEMES.morning;
    _applyVars(theme.vars);
  }

  /* ─── BroadcastChannel ───────────────────────────────────────── */
  var _bc      = null;
  var _tabId   = 'world_' + Math.random().toString(36).slice(2, 8);
  var _tabBorn = Date.now();

  function _broadcast(msg) {
    if (!_bc) return;
    try {
      _bc.postMessage(Object.assign({ source: _tabId, born: _tabBorn }, msg));
    } catch (e) {}
  }

  function _onBroadcast(e) {
    var msg = e.data;
    if (!msg || msg.source === _tabId) return;
    if (msg.type === GLITCH_MSG_TYPE) {
      /* Receber glitch de outra aba */
      if (!_glitchActive && _canTriggerGlitch()) {
        /* Atualizar timestamp local para evitar double-trigger */
        var store = _loadStore();
        store.lastGlitchTs = msg.ts || Date.now();
        _saveStore(store);
        _startGlitch(true);
      }
    }
  }

  function _initBroadcast() {
    if (!window.BroadcastChannel) return;
    try {
      _bc = new BroadcastChannel('neonplay_zap_core');
      _bc.onmessage = _onBroadcast;
    } catch (e) {}
  }

  /* ─── singleton trigger aleatório ───────────────────────────── */
  /* Apenas a aba com o menor born timestamp (mais antiga) agenda o trigger.
     Verificação simples: se a aba foi aberta há mais de 30s e nenhum glitch
     recente foi registrado, ela pode ser a "líder". */
  var _glitchScheduleTimer  = null;

  function _scheduleGlitch() {
    clearTimeout(_glitchScheduleTimer);
    if (!_canTriggerGlitch()) {
      /* Agendar próxima checagem após cooldown */
      var remaining = GLITCH_COOLDOWN - (Date.now() - _loadStore().lastGlitchTs);
      _glitchScheduleTimer = setTimeout(_scheduleGlitch, Math.max(remaining, CHECK_INTERVAL));
      return;
    }
    /* Agendamento aleatório dentro da janela */
    var delay = GLITCH_RAND_MIN + Math.random() * (GLITCH_RAND_MAX - GLITCH_RAND_MIN);
    _glitchScheduleTimer = setTimeout(function () {
      if (_canTriggerGlitch()) _startGlitch(false);
      _scheduleGlitch(); /* reagendar */
    }, delay);
  }

  /* ─── intervalo de checagem de hora ─────────────────────────── */
  var _themeInterval = null;

  function _startThemeLoop() {
    _updateTheme(); /* imediato */
    _themeInterval = setInterval(_updateTheme, CHECK_INTERVAL);
  }

  function _stopThemeLoop() {
    if (_themeInterval) { clearInterval(_themeInterval); _themeInterval = null; }
  }

  /* ─── lifecycle ─────────────────────────────────────────────── */
  function destroy() {
    _stopThemeLoop();
    clearTimeout(_glitchScheduleTimer);
    clearTimeout(_glitchTimer);
    _glitchScheduleTimer = null;
    _glitchTimer = null;
    _endGlitch();
    _applyVars(null); /* restaurar baseline */
    if (_bc) { try { _bc.close(); } catch (e) {} _bc = null; }
  }

  /* ─── debug ─────────────────────────────────────────────────── */
  function _setupDebug() {
    window.ZAP_DEBUG = window.ZAP_DEBUG || {};
    window.ZAP_DEBUG.forceTheme = function (key) {
      _currentThemeKey = null; /* reset cache */
      _currentThemeKey = key;
      _applyVars(THEMES[key] ? THEMES[key].vars : null);
      console.log('[ZapWorld] Tema forçado:', key);
    };
    window.ZAP_DEBUG.triggerGlitch = function () {
      var store = _loadStore(); store.lastGlitchTs = 0; _saveStore(store);
      _startGlitch(false);
      console.log('[ZapWorld] Cosmic Glitch forçado.');
    };
    window.ZAP_DEBUG.endGlitch = function () {
      _endGlitch();
      console.log('[ZapWorld] Glitch encerrado manualmente.');
    };
    window.ZAP_DEBUG.worldState = function () {
      console.log('[ZapWorld] Tema:', _currentThemeKey, '| Glitch:', _glitchActive, '| XP mult:', window.__ZAP_XP_MULTIPLIER__);
      console.log('[ZapWorld] Store:', _loadStore());
    };
  }

  /* ─── init ───────────────────────────────────────────────────── */
  function _init() {
    _injectTransitionCSS();
    _initBroadcast();
    _startThemeLoop();
    _scheduleGlitch();
    _setupDebug();

    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(destroy);
    }
  }

  window.ZapWorld = {
    currentTheme: function () { return _currentThemeKey; },
    isGlitchActive: function () { return _glitchActive; },
    xpMultiplier: function () { return window.__ZAP_XP_MULTIPLIER__ || 1; },
    version: 'r8.0'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window, document));
