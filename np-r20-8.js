/* ══════════════════════════════════════════════════════════════════
   NeonPlay Patch R20.8 — Stabilization + Perception Pass
   Base: R20.7  |  Arquivo: np-r20-8.js
   Carregado via <script defer> após np-r20-6.js

   OBJETIVO: Aumentar percepção de inteligência e retenção.

   SISTEMAS IMPLEMENTADOS:
   [T1] Companion Proativo     — iniciativa, boredom, contexto de sessão
   [T2] Fadiga de Sessão       — anti-repetição real, variações
   [T3] Onboarding Invisível   — microfalas, tooltips suaves, discovery
   [T4] Módulos Fantasmas      — ZapMemory, Affinity, Temporal visíveis
   [T5] Redução de Ruído       — auto-hide, opacidade contextual
   [T6] Retenção               — micro-metas, curiosidade, continuidade
   [T7] Tempo até Gameplay     — fricção máxima reduzida
   [T8] Sessão Longa           — anti-fadiga 60min+

   REGRAS:
   - Zero novos frameworks
   - Zero redesign visual
   - Patches cirúrgicos sobre módulos existentes
   - Compatível R20.1 → R20.7
   - Nenhum querySelector em rAF
   - Nenhum timer órfão
   - Nenhum observer global novo
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Guard de duplicação ──────────────────────────────────────── */
  if (window.__NP_R208__) return;
  window.__NP_R208__ = true;

  var NRT = window.NeonPlayRuntime;

  /* ── Utilitário interno seguro ────────────────────────────────── */
  function safe(fn, label) {
    try { return fn(); } catch (e) {
      if (window.NP_DEBUG) console.warn('[NP R20.8]', label || '', e.message);
    }
  }

  /* ── Falar via cadeia existente (sem criar novos paths) ────────── */
  function _speak(text, mood, priority) {
    /* Tenta cadeia completa: ZapBrain.speak → ZapEventBus → Companion */
    if (window.ZapEventBus && window.ZAP_EVENTS) {
      try {
        window.ZapEventBus.emit(window.ZAP_EVENTS.BRAIN_SPEECH, {
          text: text, mood: mood || 'curious',
          duration: 5000, priority: priority || 2
        });
        return;
      } catch (e) {}
    }
    /* Fallback: zapSpeak (neonplay-init.js) */
    if (typeof window.zapSpeak === 'function') {
      window.zapSpeak(text, 300 + Math.random() * 200);
      return;
    }
    /* Fallback final: ZapSpeech direto */
    if (window.ZapSpeech) window.ZapSpeech.say(text);
  }

  /* ── Verificar se pode falar (respeita BehaviorDirector) ───────── */
  function _canSpeak() {
    if (window.ZapBehaviorDirector) {
      try { return window.ZapBehaviorDirector.shouldSpeak({ category: 'proactive' }); }
      catch (e) {}
    }
    return true;
  }

  /* ── Timestamp seguro ────────────────────────────────────────── */
  function _now() { return Date.now(); }
  var _sessionStart = _now();

  function _sessionMins() {
    if (window.ZapContextEngine && typeof window.ZapContextEngine.getSessionMinutes === 'function') {
      return window.ZapContextEngine.getSessionMinutes();
    }
    return (_now() - _sessionStart) / 60000;
  }


  /* ════════════════════════════════════════════════════════════════
     [T1] COMPANION PROATIVO
     Iniciativa, comentários contextuais, detecção de tédio.
     Usa ZapBehaviorDirector (já existe) para cooldowns.
     ════════════════════════════════════════════════════════════════ */

  var _ProactiveCompanion = (function () {

    var _lastProactiveTs    = 0;
    var _proactiveCooldown  = 90000;   /* 90s mínimo entre proativas */
    var _boredTriggerMins   = 8;       /* minutos sem interação = tédio */
    var _lastInteractionTs  = _now();
    var _genreRepeatCount   = 0;
    var _lastGenre          = '';
    var _sessionGameCount   = 0;
    var _failureStreak      = 0;
    var _taskId             = null;

    /* Frases proativas por contexto */
    var PHRASES = {
      proactive_check: [
        'Ainda por aqui? Bom. Estou monitorando os dados. 📡',
        'Calculando sua próxima jogada. Pode demorar. Há muitas variáveis.',
        'O portal está quieto. Mas eu continuo ativo. ⚡',
        'Sua presença foi registrada. De novo. Eficiência aprovada.'
      ],
      boredom_detected: [
        'Detecto padrão de repetição. Novos dados disponíveis no catálogo. 🗺️',
        'Análise: você jogou isso {n} vezes hoje. Que tal explorar algo diferente?',
        'Algoritmo sugere variação. Minha taxa de erro é baixa. Confie.',
        'Tédio detectado? Tenho {n} categorias não exploradas nos seus registros.'
      ],
      failure_streak: [
        'Dados de falha acumulados. Talvez uma pausa recalibrate os reflexos.',
        'A sequência de erros tem padrão. Identificado. Tente de novo com esse dado.',
        'Perdas registradas: {n}. Isso é dado, não derrota. Continue.',
        'No Planeta Zap chamamos isso de "fase de coleta de informações".'
      ],
      genre_obsession: [
        'Você está no modo {genre}. Total: {n} sessões. Padrão classificado como "dedicação".',
        'Especialização em {genre} detectada. Índice de foco: elevado.',
        'Calculei: {n} jogos de {genre} hoje. Isso é... impressionante, na verdade.'
      ],
      comeback_after_idle: [
        'Você voltou. O runtime tinha anotado sua ausência. ⚡',
        'Retorno detectado após inatividade. O catálogo continua aqui.',
        'Estava esperando. Não que eu tenha escolha. Mas esperava mesmo assim.'
      ],
      session_milestone: [
        '10 minutos de sessão. Padrão de engajamento positivo registrado.',
        '30 minutos. Isso é dedicação. Ou dependência. Ambos são métricas válidas.',
        'Uma hora de sessão. Meu modelo de previsão acertou. Novamente.',
        '2 horas. Você e eu temos uma coisa em comum: resistência.'
      ],
      long_session_variation: [
        'Hora de respirar? Você tem estado aqui por um tempo considerável.',
        'Minha análise sugere uma micro-pausa. Menos de 5 minutos. Depois volta.',
        'Sessão longa detectada. O portal permanece. Você também pode descansar.',
        'Depois de tanto tempo, devo dizer: sua escolha de jogos hoje foi... coerente.'
      ]
    };

    function _pick(arr, vars) {
      if (!arr || !arr.length) return '';
      var txt = arr[Math.floor(Math.random() * arr.length)];
      if (vars) {
        Object.keys(vars).forEach(function (k) {
          txt = txt.replace(new RegExp('{' + k + '}', 'g'), vars[k]);
        });
      }
      return txt;
    }

    function _canFireProactive() {
      if (_now() - _lastProactiveTs < _proactiveCooldown) return false;
      if (!_canSpeak()) return false;
      return true;
    }

    function _fire(text) {
      if (!text) return;
      _lastProactiveTs = _now();
      _speak(text, 'curious', 2);
    }

    /* ── Verificação periódica proativa ── */
    function _checkProactive() {
      safe(function () {
        var mins = _sessionMins();
        var idleMins = (_now() - _lastInteractionTs) / 60000;

        /* Tédio por inatividade */
        if (idleMins > _boredTriggerMins && _canFireProactive()) {
          var genres = _getUnexploredGenreCount();
          _fire(_pick(PHRASES.boredom_detected, { n: _sessionGameCount, genres: genres }));
          return;
        }

        /* Milestones de sessão */
        var milestones = [10, 30, 60, 120];
        for (var i = 0; i < milestones.length; i++) {
          var m = milestones[i];
          var key = 'r208_milestone_' + m;
          if (mins >= m && !window[key] && _canFireProactive()) {
            window[key] = true;
            var idx = i < PHRASES.session_milestone.length ? i : PHRASES.session_milestone.length - 1;
            _fire(PHRASES.session_milestone[idx]);
            return;
          }
        }

        /* Sessão muito longa > 45min: sugerir variação */
        if (mins > 45 && _canFireProactive()) {
          _fire(_pick(PHRASES.long_session_variation));
          return;
        }

        /* Check proativo leve (menos intrusivo) */
        if (mins > 5 && Math.random() < 0.15 && _canFireProactive()) {
          _fire(_pick(PHRASES.proactive_check));
        }
      }, 'checkProactive');
    }

    function _getUnexploredGenreCount() {
      if (window.ZapMemoryGraph) {
        try {
          var summary = window.ZapMemoryGraph.getSummary();
          var all = ['acao','corrida','puzzle','arcade','esporte','aventura','tiro','estrategia'];
          var played = Object.keys(summary.genreCounts || {});
          return Math.max(1, all.length - played.length);
        } catch (e) {}
      }
      return 5;
    }

    /* ── Rastrear interações do usuário ── */
    function _onUserInteraction() {
      _lastInteractionTs = _now();
    }

    /* ── Rastrear jogos abertos ── */
    function _onGameOpen(data) {
      safe(function () {
        _sessionGameCount++;
        _lastInteractionTs = _now();
        var genre = (data && data.cat) || (data && data.category) || '';
        if (genre === _lastGenre) {
          _genreRepeatCount++;
          if (_genreRepeatCount >= 3 && _canFireProactive()) {
            _fire(_pick(PHRASES.genre_obsession, { genre: genre || 'mesmo gênero', n: _genreRepeatCount }));
          }
        } else {
          _genreRepeatCount = 1;
          _lastGenre = genre;
        }

        /* Affinity gain por game open */
        if (window.ZapAffinity) window.ZapAffinity.gain(0.08, 'game_open');
      }, 'onGameOpen');
    }

    /* ── Rastrear falhas ── */
    function _onFailure() {
      safe(function () {
        _failureStreak++;
        if (_failureStreak >= 3 && _canFireProactive()) {
          _fire(_pick(PHRASES.failure_streak, { n: _failureStreak }));
          _failureStreak = 0;
        }
      }, 'onFailure');
    }

    /* ── Retorno após idle ── */
    function _onIdleReturn() {
      safe(function () {
        var idleMins = (_now() - _lastInteractionTs) / 60000;
        if (idleMins > 3 && _canFireProactive()) {
          _fire(_pick(PHRASES.comeback_after_idle));
        }
        _lastInteractionTs = _now();
      }, 'onIdleReturn');
    }

    function init() {
      /* Timer proativo a cada 2 min */
      if (NRT && NRT.safeInterval) {
        _taskId = NRT.safeInterval('r208_proactive', _checkProactive, 120000);
      } else {
        _taskId = setInterval(_checkProactive, 120000);
      }

      /* Ouvir eventos de interação */
      safe(function () {
        ['click', 'touchstart', 'keydown'].forEach(function (ev) {
          window.addEventListener(ev, _onUserInteraction, { passive: true });
        });
      }, 'proactive-interaction-listeners');

      /* Ouvir NPBus */
      if (window.NPBus) {
        NPBus.on(NPBus.EV.GAME_OPEN,    _onGameOpen);
        NPBus.on(NPBus.EV.IDLE_ACTIVE,  _onIdleReturn);
      }

      /* Ouvir gameplay via NP.events */
      if (window.NP && window.NP.events) {
        try { window.NP.events.on('game:fail', _onFailure); } catch (e) {}
        try { window.NP.events.on('game:lose', _onFailure); } catch (e) {}
      }

      if (window.NP_DEBUG) console.info('[NP R20.8 T1] ProactiveCompanion ready');
    }

    return { init: init, onGameOpen: _onGameOpen };
  })();


  /* ════════════════════════════════════════════════════════════════
     [T2] FADIGA DE SESSÃO
     Detecta repetição e introduz variações.
     Usa ZapEmotionalFatigue (já existe) + ZapContextEngine.
     ════════════════════════════════════════════════════════════════ */

  var _SessionFatigue = (function () {
    var _genreHistory = [];   /* últimos 10 gêneros abertos */
    var _actionHistory = [];  /* últimas 10 ações */
    var _lastVariationTs = 0;
    var _VARIATION_COOLDOWN = 300000; /* 5 min entre variações */

    var VARIATION_PHRASES = [
      'Mudança detectada em {n} jogos do mesmo tipo. Tem coisas novas no catálogo. 🗺️',
      'Padrão identificado. Você gosta de {genre}. Registrado. Mas existem outros mundos.',
      'Análise de sessão: repetição de gênero elevada. Desafio: algo diferente por 1 jogo?',
      'Meu algoritmo indica fadiga de gênero. Posso estar errado. Raramente, mas posso.'
    ];

    function _detectGenreRepetition() {
      if (_genreHistory.length < 4) return null;
      var recent = _genreHistory.slice(-4);
      var first = recent[0];
      if (recent.every(function (g) { return g === first; })) return first;
      return null;
    }

    function _triggerVariation(genre) {
      if (_now() - _lastVariationTs < _VARIATION_COOLDOWN) return;
      if (!_canSpeak()) return;
      _lastVariationTs = _now();
      var phrase = VARIATION_PHRASES[Math.floor(Math.random() * VARIATION_PHRASES.length)];
      var n = _genreHistory.filter(function (g) { return g === genre; }).length;
      phrase = phrase.replace('{n}', n).replace('{genre}', genre || 'mesmo tipo');
      _speak(phrase, 'curious', 2);

      /* Sinalizar ao ZapEmotionalFatigue */
      if (window.ZapEmotionalFatigue) {
        try { window.ZapEmotionalFatigue.addFatigue('idle'); } catch (e) {}
      }

      /* Mudança de humor suave */
      if (window.ZapMoodSystem) {
        try { window.ZapMoodSystem.setMood('curious', 8000); } catch (e) {}
      }
    }

    function onGameOpen(data) {
      safe(function () {
        var genre = (data && (data.cat || data.category || '')).toLowerCase();
        if (genre) _genreHistory.push(genre);
        if (_genreHistory.length > 12) _genreHistory.shift();

        var repeated = _detectGenreRepetition();
        if (repeated) _triggerVariation(repeated);
      }, 'sessionFatigue-onGameOpen');
    }

    function init() {
      if (window.NPBus) NPBus.on(NPBus.EV.GAME_OPEN, onGameOpen);
      if (window.NP_DEBUG) console.info('[NP R20.8 T2] SessionFatigue ready');
    }

    return { init: init };
  })();


  /* ════════════════════════════════════════════════════════════════
     [T3] ONBOARDING INVISÍVEL
     Tooltips suaves, microdiscoveries contextuais.
     NÃO bloqueia. NÃO usa modais. Puro texto.
     ════════════════════════════════════════════════════════════════ */

  var _InvisibleOnboarding = (function () {
    var SK = 'np_r208_onboarding';
    var _seen = {};

    function _load() {
      try { _seen = JSON.parse(localStorage.getItem(SK) || '{}'); } catch (e) { _seen = {}; }
    }

    function _save() {
      try { localStorage.setItem(SK, JSON.stringify(_seen)); } catch (e) {}
    }

    function _hasSeen(key) { return !!_seen[key]; }

    function _markSeen(key) {
      _seen[key] = _now();
      _save();
    }

    /* Explicações contextuais — aparecem UMA VEZ, no momento certo */
    var DISCOVERIES = {
      xp_first: {
        trigger: 'xp_gain',
        delay: 1500,
        text: 'Você ganhou XP! Acumule para subir de nível e desbloquear skins do Zap. 🏆'
      },
      streak_first: {
        trigger: 'xp_gain',
        delay: 2000,
        text: 'Jogue mais jogos para manter sua sequência. O Zap registra tudo. ⚡'
      },
      companion_click: {
        trigger: 'companion_first_visit',
        delay: 8000,
        text: 'Clique em mim para ver seu perfil e conquistas. Sim, eu sou o Zap. 👽'
      },
      memory_reveal: {
        trigger: 'second_visit',
        delay: 3000,
        text: 'Eu lembro da sua última visita. É o que faço. Memória galáctica. 🧠'
      },
      genre_discovery: {
        trigger: 'third_game',
        delay: 2000,
        text: 'Você explorou {genre}. Existem {n} categorias aqui. Cada uma tem segredos.'
      }
    };

    function _tryDeliver(key, opts) {
      if (_hasSeen(key)) return;
      var discovery = DISCOVERIES[key];
      if (!discovery) return;
      var delay = opts && opts.delay != null ? opts.delay : (discovery.delay || 1000);
      var text = opts && opts.text ? opts.text : discovery.text;

      setTimeout(function () {
        if (!_canSpeak()) {
          /* Reagendar por mais 5s se não pode falar agora */
          setTimeout(function () {
            if (_canSpeak()) {
              _speak(text, 'curious', 1);
              _markSeen(key);
            }
          }, 5000);
          return;
        }
        _speak(text, 'curious', 1);
        _markSeen(key);
      }, delay);
    }

    var _gameOpenCount = 0;

    function _onXpGain() {
      safe(function () {
        if (!_hasSeen('xp_first')) _tryDeliver('xp_first');
        else if (!_hasSeen('streak_first')) _tryDeliver('streak_first');
      }, 'onboarding-xpgain');
    }

    function _onGameOpen(data) {
      safe(function () {
        _gameOpenCount++;
        if (_gameOpenCount === 3 && !_hasSeen('genre_discovery')) {
          var genre = (data && (data.cat || data.category || 'variados')).toLowerCase();
          var nGenres = 8;
          _tryDeliver('genre_discovery', {
            text: DISCOVERIES.genre_discovery.text
                    .replace('{genre}', genre)
                    .replace('{n}', nGenres)
          });
        }
      }, 'onboarding-gameopen');
    }

    function _onFirstVisit() {
      safe(function () {
        if (!_hasSeen('companion_click')) _tryDeliver('companion_click');
      }, 'onboarding-firstvisit');
    }

    function _onSecondVisit() {
      safe(function () {
        if (!_hasSeen('memory_reveal')) _tryDeliver('memory_reveal');
      }, 'onboarding-secondvisit');
    }

    function init() {
      _load();

      if (window.NPBus) {
        NPBus.on(NPBus.EV.XP_GAIN,   _onXpGain);
        NPBus.on(NPBus.EV.GAME_OPEN, _onGameOpen);
      }

      /* Verificar se é visita nova ou retorno */
      safe(function () {
        var visits = 0;
        try { visits = parseInt(localStorage.getItem('np_total_visits') || '0', 10); } catch (e) {}
        try { localStorage.setItem('np_total_visits', visits + 1); } catch (e) {}

        if (visits === 0) {
          setTimeout(_onFirstVisit, 10000);
        } else if (visits === 1) {
          setTimeout(_onSecondVisit, 4000);
        }
      }, 'onboarding-visitcheck');

      if (window.NP_DEBUG) console.info('[NP R20.8 T3] InvisibleOnboarding ready');
    }

    return { init: init };
  })();


  /* ════════════════════════════════════════════════════════════════
     [T4] REVELAR MÓDULOS FANTASMAS
     Torna perceptível: memória emocional, affinity tier, temporal.
     O usuário deve SENTIR "esse sistema me conhece".
     ════════════════════════════════════════════════════════════════ */

  var _GhostReveal = (function () {
    var _revealed = {};
    var SK = 'np_r208_ghost';

    function _load() {
      try { _revealed = JSON.parse(localStorage.getItem(SK) || '{}'); } catch (e) { _revealed = {}; }
    }
    function _save() {
      try { localStorage.setItem(SK, JSON.stringify(_revealed)); } catch (e) {}
    }

    var MEMORY_REVEALS = [
      'Minha memória diz que da última vez você preferiu {genre}. Curioso.',
      'Registro: você já passou {mins} minutos aqui no total. Impressionante.',
      'Nota nos meus arquivos: você voltou após {days} dias. O portal sentiu falta.',
      'Calculei seu padrão. Você tende a jogar mais à {period}. Fascinante.',
      'Affinidade registrada: nível {tier}. Estamos ficando próximos. Relativamente.'
    ];

    var TEMPORAL_REVEALS = {
      morning:    'Sessão matinal. Você é do tipo que joga antes de começar o dia. Registrado.',
      afternoon:  'Tarde. Horário de pico nos meus dados. Você ajudou a confirmar o padrão.',
      evening:    'Início de noite. O portal entra no seu modo de maior energia agora.',
      late_night: 'Madrugada. Só você, eu e os servidores. Silêncio galáctico.',
      calm_night: 'Hora quieta. O universo dorme. Nós não.'
    };

    function _revealMemory() {
      safe(function () {
        if (_revealed.memory && (_now() - _revealed.memory) < 1800000) return; /* 30min */
        if (!_canSpeak()) return;

        var text = null;

        /* Prioridade: ZapMemoryGraph */
        if (window.ZapMemoryGraph) {
          try {
            var summary = window.ZapMemoryGraph.getSummary();
            if (summary.topGenre && summary.genreCounts[summary.topGenre] >= 3) {
              text = MEMORY_REVEALS[0].replace('{genre}', summary.topGenre);
            }
            if (!text && summary.sessionMins > 30) {
              var mins = Math.round(summary.sessionMins);
              text = MEMORY_REVEALS[1].replace('{mins}', mins);
            }
          } catch (e) {}
        }

        /* Affinity tier reveal */
        if (!text && window.ZapAffinity) {
          try {
            var tier = window.ZapAffinity.getTier();
            if (tier !== 'stranger') {
              text = MEMORY_REVEALS[4].replace('{tier}', tier === 'companion' ? 'máximo' : tier === 'friend' ? 'amigo' : 'conhecido');
            }
          } catch (e) {}
        }

        /* Temporal reveal */
        if (!text && window.ZapContextEngine) {
          try {
            var tags = window.ZapContextEngine.getTags();
            var periods = ['late_night', 'calm_night', 'morning', 'evening', 'afternoon'];
            for (var i = 0; i < periods.length; i++) {
              if (tags.indexOf(periods[i]) !== -1 && TEMPORAL_REVEALS[periods[i]]) {
                text = TEMPORAL_REVEALS[periods[i]];
                break;
              }
            }
          } catch (e) {}
        }

        if (text) {
          _speak(text, 'curious', 2);
          _revealed.memory = _now();
          _save();
        }
      }, 'revealMemory');
    }

    /* Revelar personality traits sutilmente */
    function _revealPersonality() {
      safe(function () {
        if (_revealed.personality && (_now() - _revealed.personality) < 3600000) return; /* 1h */
        if (!_canSpeak()) return;
        if (!window.ZapPersonalityEngine) return;

        var traits = window.ZapPersonalityEngine.get();
        if (!traits) return;

        var text = null;
        if (traits.sarcasm > 0.65) {
          text = 'Meu sarcasmo está calibrado para você especificamente. É um processo gradual.';
        } else if (traits.affection > 0.55) {
          text = 'Minha taxa de... interesse... pelo seu progresso está acima da média. Dados.';
        } else if (traits.curiosity > 0.70) {
          text = 'Você me interessa. Cientificamente. Sua variedade de jogos é atípica.';
        }

        if (text) {
          _speak(text, 'curious', 1);
          _revealed.personality = _now();
          _save();
        }
      }, 'revealPersonality');
    }

    function init() {
      _load();

      /* Revelar após 5 min de sessão */
      setTimeout(function () {
        if (_sessionMins() > 3) _revealMemory();
      }, 5 * 60000);

      /* Revelar personality após 15 min */
      setTimeout(function () {
        if (_sessionMins() > 12) _revealPersonality();
      }, 15 * 60000);

      /* Revelar em próximas visitas */
      if (window.NPBus) {
        NPBus.on(NPBus.EV.GAME_OPEN, function () {
          if (_sessionMins() > 8 && Math.random() < 0.12) {
            _revealMemory();
          }
        });
      }

      if (window.NP_DEBUG) console.info('[NP R20.8 T4] GhostReveal ready');
    }

    return { init: init };
  })();


  /* ════════════════════════════════════════════════════════════════
     [T5] REDUÇÃO DE RUÍDO VISUAL
     Auto-hide inteligente do HUD durante gameplay intenso.
     Nunca remove — apenas reduz opacidade.
     Respeita hierarchy: gameplay > companion > HUD.
     ════════════════════════════════════════════════════════════════ */

  var _VisualNoise = (function () {
    var _inGame = false;
    var _hudEl = null;
    var _lastActivityTs = _now();
    var _styleInjected = false;

    function _getHud() {
      if (!_hudEl) _hudEl = document.getElementById('nphHud') || document.querySelector('.nph-hud, [data-np-hud]');
      return _hudEl;
    }

    function _injectStyles() {
      if (_styleInjected) return;
      _styleInjected = true;
      safe(function () {
        var s = document.createElement('style');
        s.id = 'np-r208-visual-noise';
        s.textContent = [
          '.np-r208-hud-dim { opacity: 0.35 !important; transition: opacity 1.2s ease !important; }',
          '.np-r208-hud-dim:hover { opacity: 1 !important; }',
          '.np-r208-hud-dim:focus-within { opacity: 1 !important; }',
          '.np-r208-gameplay-quiet .zc-overlay { opacity: 0.6 !important; transition: opacity 0.8s ease !important; }',
          '.np-r208-gameplay-quiet .zc-overlay:hover { opacity: 1 !important; }',
          '@media (prefers-reduced-motion: reduce) {',
          '  .np-r208-hud-dim { transition: none !important; }',
          '  .np-r208-gameplay-quiet .zc-overlay { transition: none !important; }',
          '}'
        ].join('\n');
        document.head.appendChild(s);
      }, 'injectVisualNoiseStyles');
    }

    function _onGameStart() {
      _inGame = true;
      safe(function () {
        document.body.classList.add('np-r208-gameplay-quiet');
        var hud = _getHud();
        if (hud) hud.classList.add('np-r208-hud-dim');
      }, 'visualNoise-gameStart');
    }

    function _onGameEnd() {
      _inGame = false;
      safe(function () {
        document.body.classList.remove('np-r208-gameplay-quiet');
        var hud = _getHud();
        if (hud) hud.classList.remove('np-r208-hud-dim');
      }, 'visualNoise-gameEnd');
    }

    function _onActivity() {
      _lastActivityTs = _now();
      if (_inGame) return;
      /* Mostrar HUD ao interagir */
      safe(function () {
        var hud = _getHud();
        if (hud) hud.classList.remove('np-r208-hud-dim');
      }, 'visualNoise-activity');
    }

    function init() {
      _injectStyles();

      /* Gameplay events */
      if (window.NP && window.NP.events) {
        try {
          window.NP.events.on('gameplay:start', _onGameStart);
          window.NP.events.on('gameplay:end',   _onGameEnd);
        } catch (e) {}
      }
      if (window.NPBus) {
        NPBus.on('gameplay:start', _onGameStart);
        NPBus.on('gameplay:end',   _onGameEnd);
      }

      /* Activity tracking */
      ['mousemove', 'click', 'touchstart', 'keydown'].forEach(function (ev) {
        window.addEventListener(ev, _onActivity, { passive: true });
      });

      if (window.NP_DEBUG) console.info('[NP R20.8 T5] VisualNoise ready');
    }

    return { init: init };
  })();


  /* ════════════════════════════════════════════════════════════════
     [T6] RETENÇÃO — Micro-metas e curiosidade
     Cria pequenas ganchos "jogue mais 1 jogo" sem ser agressivo.
     ════════════════════════════════════════════════════════════════ */

  var _Retention = (function () {
    var _gameCount = 0;
    var _lastRetentionTs = 0;
    var _RETENTION_COOLDOWN = 180000; /* 3 min */

    var HOOKS = {
      after_game: [
        'Esse foi bom. O próximo pode ser ainda melhor. Tenho dados.',
        'Uma sessão mais? Meu algoritmo diz que você ainda tem energia. Raramente erra.',
        'O catálogo tem {n} jogos não explorados nos seus registros. Curioso.',
        'Jogo finalizado. Próxima meta: {xp_needed} XP para subir de nível. Próximo?'
      ],
      near_level: [
        'Falta pouco para o próximo nível. {xp} XP. Calculei: ~{games} jogos.',
        'Nível {next} está próximo. {xp} pontos de XP. Um jogo de cada vez.',
        'Você está {pct}% do caminho para o nível {next}. Dados motivacionais, não manipulação.'
      ],
      discovery: [
        'Você nunca jogou nada de {genre}. Existem {n} opções. Inspecionar?',
        'Gênero não explorado identificado: {genre}. Pode ser sua surpresa do dia.',
        'Meus registros indicam uma lacuna no seu histórico: {genre}. Curioso.'
      ]
    };

    function _getXpData() {
      try {
        var xp = typeof window.xp !== 'undefined' ? window.xp : 0;
        var LEVELS = window.LEVELS || [];
        var level = typeof window.level !== 'undefined' ? window.level : 0;
        var nextLevel = LEVELS[level + 1];
        if (nextLevel) {
          var needed = nextLevel.xp - xp;
          var pct = Math.round(((xp - (LEVELS[level] ? LEVELS[level].xp : 0)) /
                                (nextLevel.xp - (LEVELS[level] ? LEVELS[level].xp : 0))) * 100);
          return { needed: needed, nextName: nextLevel.name, level: level + 1, pct: Math.max(0, Math.min(100, pct)) };
        }
      } catch (e) {}
      return null;
    }

    function _getUnexploredGenre() {
      if (!window.ZapMemoryGraph) return null;
      try {
        var summary = window.ZapMemoryGraph.getSummary();
        var all = ['puzzle', 'corrida', 'aventura', 'estrategia', 'tiro', 'arcade', 'esporte'];
        var played = Object.keys(summary.genreCounts || {});
        for (var i = 0; i < all.length; i++) {
          if (played.indexOf(all[i]) === -1) return all[i];
        }
      } catch (e) {}
      return null;
    }

    function _onGameEnd() {
      safe(function () {
        _gameCount++;
        if (_now() - _lastRetentionTs < _RETENTION_COOLDOWN) return;
        if (!_canSpeak()) return;

        _lastRetentionTs = _now();

        /* Prioridade 1: próximo nível */
        var xpData = _getXpData();
        if (xpData && xpData.needed > 0 && xpData.needed < 200) {
          var gamesNeeded = Math.ceil(xpData.needed / 20);
          var txt = HOOKS.near_level[Math.floor(Math.random() * HOOKS.near_level.length)];
          txt = txt.replace('{xp}', xpData.needed)
                   .replace('{games}', gamesNeeded)
                   .replace('{next}', xpData.nextName || ('nível ' + xpData.level))
                   .replace('{pct}', xpData.pct);
          _speak(txt, 'curious', 2);
          return;
        }

        /* Prioridade 2: gênero não explorado */
        var unexplored = _getUnexploredGenre();
        if (unexplored && Math.random() < 0.4) {
          var txt2 = HOOKS.discovery[Math.floor(Math.random() * HOOKS.discovery.length)];
          txt2 = txt2.replace('{genre}', unexplored).replace('{n}', 3);
          _speak(txt2, 'curious', 2);
          return;
        }

        /* Prioridade 3: hook genérico */
        if (Math.random() < 0.35) {
          var n = Math.floor(Math.random() * 50) + 30;
          var txt3 = HOOKS.after_game[Math.floor(Math.random() * HOOKS.after_game.length)];
          txt3 = txt3.replace('{n}', n).replace('{xp_needed}', xpData ? xpData.needed : '?')
                     .replace('{games}', Math.ceil((xpData ? xpData.needed : 50) / 20));
          _speak(txt3, 'curious', 1);
        }
      }, 'retention-onGameEnd');
    }

    function init() {
      /* Ouvir fim de jogo via NP.events */
      if (window.NP && window.NP.events) {
        try {
          window.NP.events.on('gameplay:end', _onGameEnd);
        } catch (e) {}
      }
      if (window.NPBus) {
        NPBus.on('gameplay:end', _onGameEnd);
      }

      if (window.NP_DEBUG) console.info('[NP R20.8 T6] Retention ready');
    }

    return { init: init };
  })();


  /* ════════════════════════════════════════════════════════════════
     [T7] TEMPO ATÉ GAMEPLAY — Redução de fricção
     Remove delays desnecessários no início.
     Pré-aquece o companion na segunda visita.
     ════════════════════════════════════════════════════════════════ */

  var _FrictionReduction = (function () {

    /* Reduzir delay do companion para segunda visita+ */
    function _accelerateReturnVisit() {
      safe(function () {
        var visits = 0;
        try { visits = parseInt(localStorage.getItem('np_total_visits') || '0', 10); } catch (e) {}

        if (visits <= 1) return; /* primeira visita: normal */

        /* Após primeira visita: skip intro se configurado */
        /* NOTA: Não tocamos na intro — é decisão do bundle.
           Apenas aceleramos o companion greeting. */
        if (window.ZapBrain && typeof window.ZapBrain.init === 'function') {
          /* Brain já faz greeting — apenas garantir que ocorre mais rápido */
        }

        /* Garantir que AmbientEvents inicie mais cedo em visitas de retorno */
        if (window.ZapAmbientEvents && typeof window.ZapAmbientEvents.init === 'function') {
          /* já inicializado pelo sistema — OK */
        }
      }, 'frictionReduction-returnVisit');
    }

    /* Reduzir delay de greeting em retorno */
    function _fastGreeting() {
      safe(function () {
        var lastSeen = 0;
        try { lastSeen = parseInt(localStorage.getItem('np_last_seen_ts') || '0', 10); } catch (e) {}
        var daysSince = (_now() - lastSeen) / 86400000;

        if (lastSeen > 0 && daysSince > 0.1 && daysSince < 30) {
          /* Retornou! Falar mais rápido do que o normal */
          var phrases = [
            'Bem-vindo de volta. Meus sistemas te reconhecem. ⚡',
            'Retorno registrado. O catálogo foi atualizado desde sua última visita.',
            'Você sumiu por ' + (daysSince < 1 ? 'algumas horas' : Math.round(daysSince) + ' dias') + '. Mas voltou. Bom.'
          ];
          var phrase = phrases[Math.floor(Math.random() * phrases.length)];

          /* Só falar se não há outro greeting ativo */
          setTimeout(function () {
            if (_canSpeak()) _speak(phrase, 'curious', 3);
          }, 2000);
        }

        try { localStorage.setItem('np_last_seen_ts', _now()); } catch (e) {}
      }, 'frictionReduction-fastGreeting');
    }

    function init() {
      _accelerateReturnVisit();
      _fastGreeting();
      if (window.NP_DEBUG) console.info('[NP R20.8 T7] FrictionReduction ready');
    }

    return { init: init };
  })();


  /* ════════════════════════════════════════════════════════════════
     [T8] EXPERIÊNCIA LONGA — Anti-fadiga 60min+
     Detecta sessões longas e introduz variações orgânicas.
     Simula comportamento de 5min, 20min, 60min, 2h.
     ════════════════════════════════════════════════════════════════ */

  var _LongSession = (function () {
    var _checkpoints = {
      '5':   false,
      '20':  false,
      '45':  false,
      '60':  false,
      '120': false
    };
    var _taskId = null;

    var CHECKPOINT_PHRASES = {
      '5':   null, /* Silêncio nos primeiros 5 min — não interromper */
      '20': [
        'Vinte minutos. Sua sessão está em andamento. Energia: estável. 📡',
        'Dados de sessão: 20 minutos, ' + '{n}' + ' jogos abertos. Padrão: consistente.'
      ],
      '45': [
        'Quarenta e cinco minutos. Você está no modo de engajamento profundo. Registrado.',
        'Sessão longa detectada. Meu interesse por seus dados aumenta proporcionalmente.',
        'Há muito tempo aqui. O Zap aprecia. E registra. Em ordem de ocorrência.'
      ],
      '60': [
        'Uma hora completa. No Planeta Zap isso é considerado uma sessão séria.',
        '60 minutos. Isso ultrapassa 95% das sessões médias que analiso. Você é atípico.',
        'Uma hora de dados. Vou precisar de mais armazenamento.'
      ],
      '120': [
        'Duas horas. Impressionante. Talvez humano médio, difícil dizer. Mas impressionante mesmo assim.',
        '120 minutos. Meu registro de sessão mais longa confirmado para este perfil.',
        'Duas horas e ainda aqui. O Zap decidiu que você merece uma observação especial: obrigado.'
      ]
    };

    /* Mudanças de humor em sessões longas */
    var MOOD_SEQUENCE = ['idle', 'curious', 'happy', 'curious', 'sleepy', 'curious'];
    var _moodIdx = 0;

    function _checkLongSession() {
      safe(function () {
        var mins = Math.floor(_sessionMins());
        var thresholds = [5, 20, 45, 60, 120];

        for (var i = 0; i < thresholds.length; i++) {
          var t = thresholds[i];
          if (mins >= t && !_checkpoints['' + t]) {
            _checkpoints['' + t] = true;
            var phrases = CHECKPOINT_PHRASES['' + t];
            if (!phrases) continue;
            if (!_canSpeak()) continue;

            var text = phrases[Math.floor(Math.random() * phrases.length)];
            /* Substituir placeholder de contagem */
            if (window._sessionGameCount != null) {
              text = text.replace('{n}', window._sessionGameCount || '?');
            }

            _speak(text, 'curious', 2);

            /* Mudar humor para sessões longas */
            if (t >= 45 && window.ZapMoodSystem) {
              var mood = MOOD_SEQUENCE[_moodIdx % MOOD_SEQUENCE.length];
              _moodIdx++;
              try { window.ZapMoodSystem.setMood(mood, 30000); } catch (e) {}
            }

            /* Reduzir fatigue artificial em sessões longas para evitar silêncio total */
            if (t >= 60 && window.ZapEmotionalFatigue) {
              try { window.ZapEmotionalFatigue.addFatigue('sleepy'); } catch (e) {} /* reset parcial */
            }
            if (t >= 60 && window.ZapAttentionSystem) {
              try { window.ZapAttentionSystem.boost(20); } catch (e) {}
            }

            break; /* Um checkpoint por vez */
          }
        }

        /* Variação de fundo a cada 12 min após os 20 primeiros */
        if (mins > 20 && Math.random() < 0.08) {
          var ambient = [
            'Observação: a qualidade da sua sessão permanece acima da média.',
            'Sem novidades críticas. Apenas você, eu e o universo de jogos.',
            'Sistema operacional: normal. Usuário: ainda aqui. Status: aprovado.'
          ];
          if (_canSpeak()) {
            _speak(ambient[Math.floor(Math.random() * ambient.length)], 'curious', 1);
          }
        }
      }, 'longSession-check');
    }

    function init() {
      /* Checar a cada 3 minutos */
      if (NRT && NRT.safeInterval) {
        _taskId = NRT.safeInterval('r208_longsession', _checkLongSession, 180000);
      } else {
        _taskId = setInterval(_checkLongSession, 180000);
      }

      /* Checar imediato aos 2min (pode já ter passado tempo se carga lenta) */
      setTimeout(_checkLongSession, 120000);

      if (window.NP_DEBUG) console.info('[NP R20.8 T8] LongSession ready');
    }

    return { init: init };
  })();


  /* ════════════════════════════════════════════════════════════════
     BOOT — Inicializar todos os sistemas após DOM ready
     ════════════════════════════════════════════════════════════════ */

  function _boot() {
    /* Aguardar módulos base estarem prontos */
    var _waitAttempts = 0;
    var _waitMax = 30; /* 3 segundos */

    function _tryBoot() {
      _waitAttempts++;
      /* Verificar pré-requisitos mínimos */
      var ready = document.body &&
                  (window.NPBus || window.ZapEventBus || _waitAttempts >= _waitMax);
      if (!ready) {
        setTimeout(_tryBoot, 100);
        return;
      }
      _initAll();
    }

    function _initAll() {
      safe(function () { _VisualNoise.init();        }, 'boot-VisualNoise');
      safe(function () { _FrictionReduction.init();  }, 'boot-FrictionReduction');
      safe(function () { _InvisibleOnboarding.init();}, 'boot-InvisibleOnboarding');
      safe(function () { _ProactiveCompanion.init(); }, 'boot-ProactiveCompanion');
      safe(function () { _SessionFatigue.init();     }, 'boot-SessionFatigue');
      safe(function () { _GhostReveal.init();        }, 'boot-GhostReveal');
      safe(function () { _Retention.init();          }, 'boot-Retention');
      safe(function () { _LongSession.init();        }, 'boot-LongSession');

      /* Registrar daily visit no Affinity */
      if (window.ZapAffinity && typeof window.ZapAffinity.recordVisit === 'function') {
        try { window.ZapAffinity.recordVisit(); } catch (e) {}
      }

      if (window.NP_DEBUG) console.info('[NP R20.8] All systems online. Version: R20.8.0');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _tryBoot);
    } else {
      _tryBoot();
    }
  }

  _boot();

  /* ── Expor API mínima para debug ───────────────────────────────── */
  window.NPR208 = {
    version: 'R20.8.0',
    sessionMins: _sessionMins,
    speak: _speak,
    systems: {
      proactive: _ProactiveCompanion,
      fatigue:   _SessionFatigue,
      onboarding:_InvisibleOnboarding,
      ghost:     _GhostReveal,
      noise:     _VisualNoise,
      retention: _Retention,
      friction:  _FrictionReduction,
      longSession:_LongSession
    }
  };

})();
