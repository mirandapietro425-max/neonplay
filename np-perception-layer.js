/**
 * NeonPlay Perception Layer — np-perception-layer.js
 * R10.3 "PERCEPTION LAYER"
 *
 * Evolução sobre Soul Layer R10.2 + R20.9.1.
 * Carregamento: <script defer src="np-perception-layer.js">
 *               após np-r20-9.js e np-soul.js
 *
 * Implementa:
 *   [PL-1] Memory Fix         — _prevVisit persistência confiável
 *   [PL-2] Cinematic Cards    — thumbnail system procedural
 *   [PL-3] Env Life Repacing  — 6–12min (down from 15–30min)
 *   [PL-4] Perceptual Rarity  — raros percebidos como raros
 *   [PL-5] Atmospheric Depth  — universo contínuo no fundo
 *   [PL-6] Silence Polish     — quietude visível e sentida
 *   [PL-7] Companion Alive    — micro-hesitação, reconhecimento
 *   [PL-8] Experience Cohesion — DNA visual unificado
 *
 * Proteções absolutas:
 *   ZERO iframe interruption     ZERO focus stealing
 *   ZERO input blocking          ZERO overlay full-screen
 *   ZERO gameplay lag            ZERO sanctuary regression
 *   append-only storage          RAF-safe, cleanup-safe
 *   mobile-safe                  reduced-motion respeitado
 */

(function () {
  'use strict';

  /* ── GUARD DE DUPLA CARGA ─────────────────────────────────────── */
  if (window.__NP_PERCEPTION_LOADED__) return;
  window.__NP_PERCEPTION_LOADED__ = true;

  /* ── DEPENDÊNCIAS ──────────────────────────────────────────────── */
  const NRT = window.NeonPlayRuntime;
  if (!NRT) {
    if (window.NP_DEBUG) console.warn('[NP-PERC] NeonPlayRuntime ausente — abortando.');
    return;
  }

  /* ── LOG THROTTLED ─────────────────────────────────────────────── */
  const _logTs = Object.create(null);
  function log(msg) {
    if (!window.NP_DEBUG) return;
    const now = Date.now();
    if (_logTs[msg] && now - _logTs[msg] < 8000) return;
    _logTs[msg] = now;
    console.log('[NP-PERC]', msg);
  }
  function safe(fn, label) {
    try { return fn(); }
    catch (e) { if (window.NP_DEBUG) console.warn('[NP-PERC]', label || 'safe()', e.message); }
  }

  /* ── GUARDS (mesma lógica R20.9 / Soul) ──────────────────────── */
  function canAct() {
    if (!document.body) return false;
    if (document.hidden) return false;
    if (NRT.gameSession && NRT.gameSession.active) return false;
    if (document.body.classList.contains('np-gameplay-sanctuary')) return false;
    return true;
  }
  function isLowMotion() {
    if (!document.body) return true;
    return document.body.classList.contains('np-low-motion') ||
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function isMobile() {
    if (document.body && document.body.dataset.np9Mobile === '1') return true;
    return /Mobi|Android|iPhone/i.test(navigator.userAgent) ||
           (typeof navigator.maxTouchPoints === 'number' &&
            navigator.maxTouchPoints > 1 &&
            window.innerWidth < 768);
  }

  /* ── POOL DE TIMERS E NÓS ──────────────────────────────────────── */
  const _timers = new Set();
  const _nodes  = new Set();

  function _t(fn, ms) {
    const id = setTimeout(() => { _timers.delete(id); fn(); }, ms);
    _timers.add(id);
    return id;
  }
  function _trackNode(el) { _nodes.add(el); return el; }
  function _removeNode(el, fadeMs) {
    if (!el) return;
    const doRemove = () => {
      if (el.parentNode) el.parentNode.removeChild(el);
      _nodes.delete(el);
    };
    if (fadeMs && !isLowMotion()) {
      el.style.transition = `opacity ${fadeMs}ms ease`;
      el.style.opacity    = '0';
      _t(doRemove, fadeMs + 60);
    } else {
      doRemove();
    }
  }

  /* ── COMPANION SELECTOR CONSTANTE ─────────────────────────────── */
  const COMPANION_SEL = '[data-np-companion], .np-companion, .zc-widget, #zapCompanionWidget';

  /* ── CARD SELECTORS ────────────────────────────────────────────── */
  const CARD_SEL = '[data-np-card], .np-game-card, .game-card, [data-game-id]';


  /* ════════════════════════════════════════════════════════════════════
   * [PL-1] MEMORY FIX
   *
   * O bug: _prevVisit é setado em NRT.memory (in-memory) mas pode falhar
   * se storage de sessões antigas não inclui a propriedade, e se
   * np-soul.js consome NRT.memory antes de _prevVisit estar populado.
   *
   * Fix strategy:
   *   1. Chave dedicada np_prev_visit — isolada, append-only, não
   *      interfere com MEM_KEY do R20.9.
   *   2. Lida no load, escrita no pagehide.
   *   3. Injeta em NRT.memory._prevVisit ANTES que os echoes do soul
   *      layer consumam a prop — via evento DOMContentLoaded+microtask.
   *   4. Também patcha scheduleEntry do R20.9 companion whisper para
   *      usar _prevVisit correto em daysSince.
   *
   * IMPORTANTE: append-only — nunca sobrescreve dados existentes
   *             sem verificar primeiro.
   * ════════════════════════════════════════════════════════════════════ */
  safe(function installMemoryFix() {
    const PREV_KEY      = 'np_prev_visit';      // chave isolada
    const FRUST_KEY     = 'np_frustration_bk';  // backup de frustração

    /* Lê _prevVisit da chave dedicada — mais confiável que MEM_KEY */
    function _loadPrev() {
      try { return parseInt(localStorage.getItem(PREV_KEY), 10) || null; }
      catch (_) { return null; }
    }

    /* Salva _prevVisit e copia de frustration separadamente */
    function _savePrev(ts) {
      try {
        localStorage.setItem(PREV_KEY, String(ts));
      } catch (_) { /* silencioso — storage pode estar cheio */ }
    }

    /* Injeta em NRT.memory assim que ela estiver disponível */
    function _injectPrevVisit() {
      const mem = NRT.memory;
      if (!mem) { _t(_injectPrevVisit, 400); return; }

      const stored    = _loadPrev();
      const memPrev   = mem._prevVisit;

      /*
       * Prioridade:
       *  1. NRT.memory._prevVisit (R20.9 acabou de setar) — mais recente
       *  2. np_prev_visit (chave dedicada) — fallback para sessões antigas
       *  3. null — primeira sessão real
       */
      const resolved = memPrev || stored || null;

      if (resolved && !mem._prevVisit) {
        mem._prevVisit = resolved;
        log('Memory Fix: _prevVisit resolvido via chave dedicada → ' + resolved);
      }

      /* Atualiza a chave dedicada com o lastVisit DESTA sessão
         para que a PRÓXIMA sessão encontre o valor correto */
      if (mem.lastVisit) {
        _savePrev(mem.lastVisit);
      }

      /* Backup de frustration para diagnóstico */
      if (typeof mem.frustration === 'number') {
        try { localStorage.setItem(FRUST_KEY, String(mem.frustration)); } catch (_) {}
      }

      /* Dispara evento para que módulos que esperavam _prevVisit
         possam reagir retroativamente */
      document.dispatchEvent(new CustomEvent('NP:prevvisit-ready', {
        detail: {
          prevVisit:  resolved,
          daysSince:  resolved ? (Date.now() - resolved) / 86_400_000 : 0,
          sessions:   mem.sessions || 1,
        },
        bubbles: false,
      }));

      log('Memory Fix: NP:prevvisit-ready · daysSince=' +
        (resolved ? ((Date.now() - resolved) / 86_400_000).toFixed(1) : '0'));
    }

    /*
     * Timing crítico: Soul Layer installMemoryEchoes chama _waitCompanion
     * que espera NRT.companion.whisper — isso demora ~1.2s.
     * Nossa injeção precisa ocorrer ANTES desse callback disparar.
     * Rodamos imediatamente no DOMContentLoaded (ou agora, se já passou).
     */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _injectPrevVisit, { once: true });
    } else {
      _injectPrevVisit(); /* já passado — roda agora */
    }

    /*
     * Fix adicional: Soul Layer chama NRT.companion.whisper(ctx) E cria
     * DOM element — double-whisper bug.
     * Patchamos NRT.companion.whisper para retornar silenciosamente
     * quando o ctx não existe no banco do R20.9 (evita whisper fantasma).
     */
    function _patchWhisperBank() {
      if (!NRT.companion || !NRT.companion.whisper) {
        _t(_patchWhisperBank, 800);
        return;
      }
      const _origWhisper = NRT.companion.whisper;
      const SOUL_CONTEXTS = new Set([
        'returnWeeks', 'returnFrustrated', 'nightHabitual',
        'milestone', 'deepSession', 'observing', 'silence',
      ]);
      NRT.companion.whisper = function (ctx) {
        /* Contextos do Soul Layer não existem no banco do R20.9.
           Chamá-los gera whisper com texto do banco 'ambient' — incorreto.
           Retornamos sem fazer nada: o Soul Layer cria seu próprio DOM. */
        if (SOUL_CONTEXTS.has(ctx)) {
          log('Whisper patch: bloqueado double-whisper [' + ctx + ']');
          return;
        }
        return _origWhisper.call(this, ctx);
      };
      /* Preserva referência ao original para uso interno */
      NRT.companion._whisperOrig = _origWhisper;
      log('Memory Fix: whisper bank patch aplicado');
    }
    _patchWhisperBank();

    log('Memory Fix instalado');
  }, 'installMemoryFix');


  /* ════════════════════════════════════════════════════════════════════
   * [PL-2] CINEMATIC THUMBNAIL SYSTEM
   *
   * Detecta game cards no DOM (e mutações futuras) e injeta
   * a camada visual cinematic: gradiente, scanlines, shimmer,
   * glow, flicker, noise, signal, label.
   *
   * Leve: zero canvas, zero WebGL, apenas CSS + minimal DOM.
   * Append-only: verifica .np-thumb antes de reinjetar.
   * ════════════════════════════════════════════════════════════════════ */
  safe(function installCinematicThumbnails() {
    /* Categorias reconhecidas e seus tokens */
    const CAT_MAP = {
      arcade:  { label: '◈ ARCADE',  color: '#00d4ff' },
      horror:  { label: '▓ HORROR',  color: '#ff6060' },
      dream:   { label: '∿ DREAM',   color: '#a78bfa' },
      retro:   { label: '◻ RETRO',   color: '#fbbf24' },
      space:   { label: '○ SPACE',   color: '#93c5fd' },
      action:  { label: '▲ ACTION',  color: '#fb923c' },
      puzzle:  { label: '◇ PUZZLE',  color: '#86efac' },
      rpg:     { label: '◉ RPG',     color: '#d8b4fe' },
      casual:  { label: '◌ CASUAL',  color: '#7dd3fc' },
    };

    /* Detecta categoria de um card */
    function _resolveCategory(card) {
      /* 1. data-np-category explícito */
      const explicit = card.dataset.npCategory || card.dataset.category;
      if (explicit) return explicit.toLowerCase();

      /* 2. classe css que contenha o nome da categoria */
      const cls = card.className || '';
      for (const cat of Object.keys(CAT_MAP)) {
        if (cls.toLowerCase().includes(cat)) return cat;
      }

      /* 3. texto interno do card */
      const text = (card.textContent || '').toLowerCase();
      for (const cat of Object.keys(CAT_MAP)) {
        if (text.includes(cat)) return cat;
      }

      return 'default';
    }

    /* Cria e injeta a camada de thumbnail num card */
    function _injectThumb(card) {
      /* Guard: já tem thumb */
      if (card.querySelector('.np-thumb')) return;

      /* Guard: é iframe ou contém gameFrame */
      if (card.tagName === 'IFRAME') return;

      const cat   = _resolveCategory(card);
      const meta  = CAT_MAP[cat];

      /* Marca o card com a categoria para CSS */
      if (cat !== 'default') card.dataset.npCategory = cat;

      /* Wrapper */
      const thumb = document.createElement('div');
      thumb.className = 'np-thumb';
      thumb.setAttribute('aria-hidden', 'true');

      /* Gradiente de fundo */
      const grad = document.createElement('div');
      grad.className = 'np-thumb-gradient';
      thumb.appendChild(grad);

      /* Noise overlay */
      const noise = document.createElement('div');
      noise.className = 'np-thumb-noise';
      thumb.appendChild(noise);

      /* Holographic shimmer */
      if (!isLowMotion() && !isMobile()) {
        const shimmer = document.createElement('div');
        shimmer.className = 'np-thumb-shimmer';
        /* Delay aleatório para que cards não shimmer em sincronia */
        shimmer.style.animationDelay = (Math.random() * 6).toFixed(1) + 's';
        thumb.appendChild(shimmer);
      }

      /* Ambient glow borda */
      const glow = document.createElement('div');
      glow.className = 'np-thumb-glow';
      const glowColor = (meta ? meta.color : '#00d4ff').replace('#', '');
      const r = parseInt(glowColor.slice(0,2),16);
      const g = parseInt(glowColor.slice(2,4),16);
      const b = parseInt(glowColor.slice(4,6),16);
      glow.style.boxShadow = `inset 0 0 16px rgba(${r},${g},${b},.3), 0 0 12px rgba(${r},${g},${b},.15)`;
      thumb.appendChild(glow);

      /* Transmission flicker dot */
      const flicker = document.createElement('div');
      flicker.className = 'np-thumb-flicker';
      /* Fase aleatória para não pulsar em sincronia */
      flicker.style.animationDelay = (Math.random() * 3.2).toFixed(2) + 's';
      thumb.appendChild(flicker);

      /* Signal overlay (hover) */
      const signal = document.createElement('div');
      signal.className = 'np-card-signal';
      thumb.appendChild(signal);

      /* Category label */
      if (meta && meta.label) {
        const label = document.createElement('div');
        label.className = 'np-thumb-label';
        label.textContent = meta.label;
        thumb.appendChild(label);
      }

      /* Injeta como primeiro filho (abaixo do conteúdo existente) */
      card.insertBefore(thumb, card.firstChild);

      /* Light tracking no hover — atualiza --np-signal-x/Y com posição do cursor */
      if (!isMobile()) {
        card.addEventListener('mousemove', function (e) {
          const rect = card.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
          const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%';
          signal.style.setProperty('--np-signal-x', x);
          signal.style.setProperty('--np-signal-y', y);
        }, { passive: true });
      }

      log('Thumb: injetado [' + cat + '] → ' + (card.dataset.gameId || card.className));
    }

    /* Processa todos os cards atuais */
    function _processAll() {
      document.querySelectorAll(CARD_SEL).forEach(_injectThumb);
    }

    /* MutationObserver para cards adicionados dinamicamente */
    const _thumbObs = new MutationObserver(function (mutations) {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          /* O nó em si pode ser um card */
          if (node.matches && node.matches(CARD_SEL)) _injectThumb(node);
          /* Ou conter cards dentro */
          node.querySelectorAll && node.querySelectorAll(CARD_SEL).forEach(_injectThumb);
        }
      }
    });

    /* Inicia quando DOM estiver pronto */
    function _init() {
      _processAll();
      _thumbObs.observe(document.body, { childList: true, subtree: true });
      log('Cinematic Thumbnails ativo — ' +
        document.querySelectorAll(CARD_SEL).length + ' cards encontrados');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _init, { once: true });
    } else {
      _init();
    }

    NRT.cleanup && NRT.cleanup.register(function () {
      _thumbObs.disconnect();
    });

    log('Cinematic Thumbnail System instalado');
  }, 'installCinematicThumbnails');


  /* ════════════════════════════════════════════════════════════════════
   * [PL-3] ENVIRONMENTAL LIFE REPACING
   *
   * Audit fix: thresholds reduzidos conforme especificado.
   *   Shimmer:  15min → 6min
   *   Orbital:  20min → 8min
   *   Shadow:   30min → 12min
   *
   * Strategy: registrar novos eventos com Soul Layer's bridge —
   * não duplicar os existentes. Apenas reutiliza o engine visual
   * do np-soul.js com thresholds menores e Perceptual Rarity.
   * ════════════════════════════════════════════════════════════════════ */
  safe(function installEnvRepacing() {
    if (isMobile()) return;

    const _T0 = Date.now();

    /* ── PERCEPTUAL RARITY ENGINE
     * Eventos aparecem cedo mas parecem raros:
     * intensidade baixa, periferia, duração curta, contraste mínimo.
     * O usuário "acha que viu algo".
     */
    function _perceptualRarity(el, opts) {
      opts = opts || {};
      /* Intensidade baixa */
      el.style.opacity = opts.opacity || '0.35';
      /* Periferia da tela */
      if (opts.peripheral) {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        el.style[side] = (Math.random() * 12 + 2) + '%';
      }
      /* Duração curta */
      if (opts.shortDuration && el.style.animationDuration) {
        const orig = parseFloat(el.style.animationDuration) || 8;
        el.style.animationDuration = (orig * 0.65).toFixed(1) + 's';
      }
    }

    /* ── ORBITAL SIGNAL — novo threshold: 8min */
    function _earlyOrbital() {
      if (!canAct() || isLowMotion()) return;
      const min = (Date.now() - _T0) / 60_000;
      if (min < 8) return;
      if (Math.random() > 0.055) return; /* ~5.5% por check */

      const el = document.createElement('div');
      el.className = 'np-soul-orbital';
      el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, {
        height: '1px',
        width:  (80 + Math.random() * 60) + 'px',
        left:   (8  + Math.random() * 20) + '%',
        top:    (10 + Math.random() * 75) + '%',
        animationDuration: '7s',
      });
      _perceptualRarity(el, { opacity: '0.3', peripheral: true });
      document.body.appendChild(_trackNode(el));
      _t(function () { _removeNode(el, 0); }, 7500);
      log('Env (repaced): orbital signal perceptual');
    }

    /* ── FREQUENCY SHIMMER — novo threshold: 6min */
    function _earlyShimmer() {
      if (!canAct() || isLowMotion()) return;
      const min = (Date.now() - _T0) / 60_000;
      if (min < 6) return;
      if (Math.random() > 0.06) return;

      const wrap = document.createElement('div');
      wrap.className = 'np-soul-shimmer';
      wrap.setAttribute('aria-hidden', 'true');
      /* Periferia — extremo direito ou esquerdo */
      const isRight = Math.random() < 0.5;
      wrap.style[isRight ? 'right' : 'left'] = (8 + Math.random() * 12) + 'px';

      const BARS = 5;
      for (let i = 0; i < BARS; i++) {
        const bar = document.createElement('div');
        bar.className = 'np-soul-shimmer-bar';
        const h = 3 + Math.round(Math.random() * 8);
        bar.style.height = h + 'px';
        bar.style.opacity = '0.5'; /* contraste baixo */
        bar.style.animation = `npShimmerBar 1.2s ease ${i * 70}ms forwards`;
        wrap.appendChild(bar);
      }

      _perceptualRarity(wrap, { opacity: '0.4' });
      document.body.appendChild(_trackNode(wrap));
      _t(function () { _removeNode(wrap, 0); }, 1500);
      log('Env (repaced): frequency shimmer perceptual');
    }

    /* ── SHADOW TRACE — novo threshold: 12min */
    function _earlyShadow() {
      if (!canAct() || isLowMotion()) return;
      const min = (Date.now() - _T0) / 60_000;
      if (min < 12) return;
      if (Math.random() > 0.03) return;

      const el = document.createElement('div');
      el.className = 'np-soul-shadow';
      el.setAttribute('aria-hidden', 'true');
      el.style.left = Math.random() < 0.5 ? '6%' : '92%';
      el.style.background = 'rgba(147,51,234,.04)'; /* contraste mínimo */
      _perceptualRarity(el, { opacity: '0.25' });
      document.body.appendChild(_trackNode(el));
      _t(function () { _removeNode(el, 0); }, 12500);
      log('Env (repaced): shadow trace perceptual');
    }

    /* Scheduler repaced — check a cada 3–5min */
    let _envTid;
    function _envCheck() {
      safe(_earlyOrbital, 'earlyOrbital');
      safe(_earlyShimmer, 'earlyShimmer');
      safe(_earlyShadow,  'earlyShadow');

      const next = (3 + Math.random() * 2) * 60_000 + (Math.random() - 0.5) * 60_000;
      _envTid = setTimeout(_envCheck, next);
      _timers.add(_envTid);
    }

    /* Primeiro check: 6min */
    const _firstCheck = (6 + Math.random() * 2) * 60_000;
    _envTid = setTimeout(_envCheck, _firstCheck);
    _timers.add(_envTid);

    NRT.cleanup && NRT.cleanup.register(function () {
      clearTimeout(_envTid);
    });

    log('Env Repacing instalado — primeiro check em ~' +
      Math.round(_firstCheck / 60_000) + 'min');
  }, 'installEnvRepacing');


  /* ════════════════════════════════════════════════════════════════════
   * [PL-4] ATMOSPHERIC DEPTH
   *
   * Fundo como universo contínuo.
   * Estrelas ultra-distantes, névoa, silhuetas ocasionais.
   * Periferia, baixa opacidade, raridade percebida.
   * ════════════════════════════════════════════════════════════════════ */
  safe(function installAtmosphericDepth() {
    if (isMobile()) return;

    const _T0 = Date.now();

    /* ── STAR FIELD — aparece após 4min */
    let _starsFired = false;
    function _emitStars() {
      if (_starsFired || !canAct() || isLowMotion()) return;
      const min = (Date.now() - _T0) / 60_000;
      if (min < 4) return;
      if (Math.random() > 0.08) return;

      _starsFired = true;
      const el = document.createElement('div');
      el.className = 'np-atm-stars';
      el.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(_trackNode(el), document.body.firstChild);
      _t(function () { _removeNode(el, 800); _starsFired = false; }, 7400);
      log('Atm: star field');
    }

    /* ── FOG LAYER — névoa procedural por cor de fase */
    let _fogActive = false;
    function _emitFog() {
      if (_fogActive || !canAct() || isLowMotion()) return;
      const min = (Date.now() - _T0) / 60_000;
      if (min < 10) return;
      if (Math.random() > 0.04) return;

      _fogActive = true;
      const phase = document.documentElement.getAttribute('data-np-psych-phase') || 'active';
      const fogColors = {
        active:    'rgba(0,20,60,.12)',
        focused:   'rgba(0,30,80,.14)',
        immersive: 'rgba(0,40,90,.18)',
        trance:    'rgba(40,0,80,.20)',
      };

      const el = document.createElement('div');
      el.className = 'np-atm-fog';
      el.setAttribute('aria-hidden', 'true');
      const size = 280 + Math.random() * 200;
      Object.assign(el.style, {
        width:       size + 'px',
        height:      size + 'px',
        left:        (Math.random() * 80) + '%',
        top:         (Math.random() * 60) + '%',
        background:  fogColors[phase] || fogColors.active,
        animationDuration: (14 + Math.random() * 6).toFixed(0) + 's',
      });
      document.body.insertBefore(_trackNode(el), document.body.firstChild);
      _t(function () { _removeNode(el, 1200); _fogActive = false; }, 16000);
      log('Atm: fog layer');
    }

    /* ── DISTANT SILHOUETTE — estrutura abandonada ocasional */
    let _silhActive = false;
    function _emitSilhouette() {
      if (_silhActive || !canAct() || isLowMotion()) return;
      const min = (Date.now() - _T0) / 60_000;
      if (min < 18) return;
      if (Math.random() > 0.025) return;

      _silhActive = true;

      /* SVG minimalista — estrutura angular distante */
      const SHAPES = [
        /* torre de comunicação */
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="80" viewBox="0 0 48 80" fill="none">
          <line x1="24" y1="0"  x2="24" y2="80" stroke="rgba(0,212,255,.08)" stroke-width="1"/>
          <line x1="10" y1="30" x2="24" y2="0"  stroke="rgba(0,212,255,.06)" stroke-width="1"/>
          <line x1="38" y1="30" x2="24" y2="0"  stroke="rgba(0,212,255,.06)" stroke-width="1"/>
          <line x1="4"  y1="55" x2="44" y2="55" stroke="rgba(0,212,255,.05)" stroke-width="1"/>
          <circle cx="24" cy="2" r="2" fill="rgba(0,212,255,.12)"/>
        </svg>`,
        /* satélite */
        `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="30" viewBox="0 0 60 30" fill="none">
          <rect x="22" y="12" width="16" height="8" rx="1" fill="rgba(147,51,234,.08)" stroke="rgba(147,51,234,.10)" stroke-width="0.5"/>
          <rect x="0"  y="13" width="20" height="5"  rx="0.5" fill="rgba(147,51,234,.07)"/>
          <rect x="40" y="13" width="20" height="5"  rx="0.5" fill="rgba(147,51,234,.07)"/>
          <circle cx="30" cy="16" r="3" fill="rgba(147,51,234,.10)"/>
        </svg>`,
        /* ruínas angulares */
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="50" viewBox="0 0 80 50" fill="none">
          <polygon points="0,50 15,20 28,50" fill="rgba(0,212,255,.05)"/>
          <polygon points="25,50 38,10 52,50" fill="rgba(0,212,255,.04)"/>
          <polygon points="52,50 65,25 80,50" fill="rgba(0,212,255,.05)"/>
        </svg>`,
      ];

      const el = document.createElement('div');
      el.className = 'np-atm-silhouette';
      el.setAttribute('aria-hidden', 'true');
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      el.innerHTML = shape;
      Object.assign(el.style, {
        left:   (Math.random() * 85) + '%',
        bottom: '0',
        opacity: '0',
      });
      document.body.insertBefore(_trackNode(el), document.body.firstChild);
      _t(function () { _removeNode(el, 1500); _silhActive = false; }, 19000);
      log('Atm: distant silhouette');
    }

    /* Scheduler atmosférico */
    let _atmTid;
    function _atmCheck() {
      safe(_emitStars,      'emitStars');
      safe(_emitFog,        'emitFog');
      safe(_emitSilhouette, 'emitSilhouette');

      const next = (2 + Math.random() * 3) * 60_000;
      _atmTid = setTimeout(_atmCheck, next);
      _timers.add(_atmTid);
    }

    /* Primeiro check: 4min */
    const _firstAtm = (4 + Math.random() * 1.5) * 60_000;
    _atmTid = setTimeout(_atmCheck, _firstAtm);
    _timers.add(_atmTid);

    NRT.cleanup && NRT.cleanup.register(function () { clearTimeout(_atmTid); });
    log('Atmospheric Depth instalado');
  }, 'installAtmosphericDepth');


  /* ════════════════════════════════════════════════════════════════════
   * [PL-5] SILENCE POLISH
   *
   * Silêncio emocional precisa ser visível — sentido.
   * Complementa o Silence Engine do Soul Layer com:
   *   - UI particle decay durante silêncio profundo
   *   - Companion stillness (para completamente)
   *   - Ambient breathing mais lento
   *   - Visual cue de "contemplação" ativa
   * ════════════════════════════════════════════════════════════════════ */
  safe(function installSilencePolish() {
    let _inDeepSilence = false;

    function _onSilenceEnter(type) {
      if (type !== 'deep') return;
      if (_inDeepSilence) return;
      _inDeepSilence = true;

      /* Companion stillness — para todas as animações de movimento */
      const companion = document.querySelector(COMPANION_SEL);
      if (companion && !isLowMotion()) {
        companion.style.transition = 'transform 3s ease, filter 3s ease';
        companion.style.transform  = 'translateX(0) translateY(0)';
        companion.style.filter     = 'none';
      }

      /* Breathable elements → respira mais devagar */
      document.querySelectorAll('.np-breathable').forEach(function (el) {
        el.style.animationDuration = '60s';
      });

      log('Silence Polish: deep silence ativo');
    }

    function _onSilenceExit() {
      if (!_inDeepSilence) return;
      _inDeepSilence = false;

      /* Restaura breathing */
      _t(function () {
        document.querySelectorAll('.np-breathable').forEach(function (el) {
          el.style.animationDuration = '';
        });
      }, 3000);

      log('Silence Polish: saiu do deep silence');
    }

    /* Observa data-np-silence no body */
    const _silObs = new MutationObserver(function () {
      const val = document.body && document.body.dataset.npSilence;
      if (val === 'deep') _onSilenceEnter('deep');
      else                _onSilenceExit();
    });

    if (document.body) {
      _silObs.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-np-silence'],
      });
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        _silObs.observe(document.body, {
          attributes: true,
          attributeFilter: ['data-np-silence'],
        });
      }, { once: true });
    }

    NRT.cleanup && NRT.cleanup.register(function () { _silObs.disconnect(); });
    log('Silence Polish instalado');
  }, 'installSilencePolish');


  /* ════════════════════════════════════════════════════════════════════
   * [PL-6] COMPANION ALIVE
   *
   * Companion parece vivo — não apenas inteligente.
   * Implementa: micro-hesitação, recognition pixel (sessions>2),
   * delayed reaction, silence observation, contextual inactivity.
   * ════════════════════════════════════════════════════════════════════ */
  safe(function installCompanionAlive() {
    if (isMobile()) return;

    /* Recognition pixel — piscada de "eu te reconheço" no load */
    function _recognitionPixel() {
      const mem = NRT.memory;
      if (!mem || (mem.sessions || 0) < 2) return; /* só para visitantes recorrentes */

      const companion = document.querySelector(COMPANION_SEL);
      if (!companion || isLowMotion()) return;

      /* Aguarda 2.5–4s após load para parecer intencional */
      const delay = 2500 + Math.random() * 1500;
      _t(function () {
        if (!canAct()) return;
        companion.classList.add('np-companion-recognition');
        _t(function () {
          companion.classList.remove('np-companion-recognition');
        }, 500);
        log('Companion: recognition pixel');
      }, delay);
    }

    /* Micro-hesitação — tremor leve antes de qualquer drift */
    function _hesitate(companion, thenFn) {
      if (isLowMotion() || !companion) { if (thenFn) thenFn(); return; }
      companion.classList.add('np-companion-hesitate');
      _t(function () {
        companion.classList.remove('np-companion-hesitate');
        if (thenFn) _t(thenFn, 80); /* reação começa após hesitação */
      }, 340);
    }

    /* Silent observation — companion "olha" para onde o cursor está
       mas com delay de 1.2s (resposta orgânica, não mecânica) */
    let _lastObserve = 0;
    let _observeDebounce = null;

    function _silentObserve(e) {
      if (!canAct() || isLowMotion()) return;
      const now = Date.now();
      if (now - _lastObserve < 18_000) return; /* max 1x a cada 18s */

      clearTimeout(_observeDebounce);
      _observeDebounce = setTimeout(function () {
        if (!canAct()) return;
        if (Math.random() > 0.08) return; /* 8% de chance */

        _lastObserve = Date.now();
        const companion = document.querySelector(COMPANION_SEL);
        if (!companion) return;

        _hesitate(companion, function () {
          /* Movimento sutil — 2-4px em direção ao cursor */
          const rect = companion.getBoundingClientRect();
          const cx   = rect.left + rect.width / 2;
          const cy   = rect.top  + rect.height / 2;
          const vx   = Math.sign(e.clientX - cx) * (2 + Math.random() * 2);
          const vy   = Math.sign(e.clientY - cy) * (1 + Math.random() * 1.5);

          companion.classList.add('np-companion-drift');
          companion.style.transform = `translate(${vx.toFixed(1)}px,${vy.toFixed(1)}px)`;

          _t(function () {
            companion.style.transform = '';
            _t(function () {
              companion.classList.remove('np-companion-drift');
            }, 400);
          }, 5000 + Math.random() * 3000);
        });

        log('Companion: silent observation drift');
      }, 1200); /* delay orgânico de 1.2s */
      _timers.add(_observeDebounce);
    }

    /* Contextual inactivity — às vezes não faz nada propositalmente.
       Quando canAct() retorna false (gameplay), marca internamente
       para que o próximo evento seja suprimido com 40% de chance. */
    let _suppressNext = false;
    document.addEventListener('NP:game-session-end', function () {
      _suppressNext = Math.random() < 0.4;
      if (_suppressNext) log('Companion: contextual inactivity armada');
    });

    /* Wrap do companion whisper — adiciona hesitação antes do texto */
    function _wrapCompanionWithHesitation() {
      if (!NRT.companion) { _t(_wrapCompanionWithHesitation, 800); return; }

      /* Usa _whisperOrig se o patch de [PL-1] já rodou */
      const _baseWhisper = NRT.companion._whisperOrig || NRT.companion.whisper;
      if (!_baseWhisper) { _t(_wrapCompanionWithHesitation, 800); return; }

      NRT.companion.whisper = function (ctx) {
        /* Contextual inactivity — suprime ocasionalmente */
        if (_suppressNext) {
          _suppressNext = false;
          log('Companion: whisper suprimido por contextual inactivity [' + ctx + ']');
          return;
        }

        const companion = document.querySelector(COMPANION_SEL);
        if (companion && !isLowMotion() && Math.random() < 0.55) {
          _hesitate(companion, function () {
            _baseWhisper.call(NRT.companion, ctx);
          });
        } else {
          _baseWhisper.call(NRT.companion, ctx);
        }
      };

      /* Preserva acesso ao original */
      NRT.companion._whisperBase = _baseWhisper;
      log('Companion: whisper wrapped com hesitation');
    }

    /* Instala tudo após DOM ready */
    function _init() {
      _recognitionPixel();

      if (!isLowMotion()) {
        const _ctrl = new AbortController();
        window.addEventListener('mousemove', _silentObserve,
          { signal: _ctrl.signal, passive: true });
        NRT.cleanup && NRT.cleanup.register(function () { _ctrl.abort(); });
      }

      _wrapCompanionWithHesitation();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _init, { once: true });
    } else {
      _init();
    }

    log('Companion Alive instalado');
  }, 'installCompanionAlive');


  /* ════════════════════════════════════════════════════════════════════
   * [PL-7] EXPERIENCE COHESION AUDIT (runtime)
   *
   * Verificação ativa de que os sistemas parecem o mesmo universo.
   * Detecta e corrige inconsistências visuais em runtime.
   * ════════════════════════════════════════════════════════════════════ */
  safe(function installExperienceCohesion() {
    /* Sincroniza phase-aware CSS vars com o companion */
    function _syncDNA() {
      const phase = document.documentElement.getAttribute('data-np-psych-phase') || 'active';
      const companion = document.querySelector(COMPANION_SEL);

      if (companion) {
        companion.dataset.npPhase = phase;
      }

      /* Garante que cards thumbnails herdam a fase correta */
      document.querySelectorAll('.np-thumb').forEach(function (thumb) {
        thumb.dataset.npPhase = phase;
      });
    }

    /* Observa mudanças de fase psicológica */
    const _dnaObs = new MutationObserver(_syncDNA);
    document.addEventListener('DOMContentLoaded', function () {
      _dnaObs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-np-psych-phase'],
      });
      _syncDNA();
    }, { once: true });

    NRT.cleanup && NRT.cleanup.register(function () { _dnaObs.disconnect(); });
    log('Experience Cohesion ativo');
  }, 'installExperienceCohesion');


  /* ════════════════════════════════════════════════════════════════════
   * CSS DA PERCEPTION LAYER — injetado aqui como fallback
   * (caso np-perception-layer.css não esteja linkado no HTML)
   * ════════════════════════════════════════════════════════════════════ */
  safe(function _ensureCSS() {
    if (document.querySelector('link[href*="np-perception-layer"]')) return;
    if (document.getElementById('np-perception-layer-css')) return;
    /* CSS será linkado externamente — este módulo apenas registra a ausência */
    if (window.NP_DEBUG) {
      console.warn('[NP-PERC] np-perception-layer.css não detectado no HTML. ' +
        'Adicionar: <link rel="stylesheet" href="np-perception-layer.css">');
    }
  }, '_ensureCSS');


  /* ════════════════════════════════════════════════════════════════════
   * CLEANUP GLOBAL
   * ════════════════════════════════════════════════════════════════════ */
  NRT.cleanup && NRT.cleanup.register(function () {
    _timers.forEach(function (id) { clearTimeout(id); });
    _timers.clear();
    _nodes.forEach(function (el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    _nodes.clear();
    log('Cleanup Perception Layer concluído');
  });


  /* ════════════════════════════════════════════════════════════════════
   * MODULE REGISTRY
   * ════════════════════════════════════════════════════════════════════ */
  if (NRT.modules) {
    NRT.modules['np-perception'] = {
      ready:   true,
      version: 'R10.3',
      features: [
        'memory-fix-prevvisit',
        'whisper-bank-patch',
        'cinematic-thumbnails',
        'category-identities',
        'game-hover-signal',
        'env-life-repacing-6-12min',
        'perceptual-rarity-engine',
        'atmospheric-depth',
        'silence-polish',
        'companion-recognition-pixel',
        'companion-micro-hesitation',
        'companion-contextual-inactivity',
        'experience-cohesion-runtime',
      ],
    };
  }

  document.dispatchEvent(new CustomEvent('NP:perception-ready', {
    detail:  { version: 'R10.3', ts: Date.now() },
    bubbles: false,
  }));

  log('NeonPlay Perception Layer R10.3 — a alma chegou ao usuário ✓');

})();
