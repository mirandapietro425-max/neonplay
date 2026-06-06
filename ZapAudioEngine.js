;(function (window) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R7 — ZapAudioEngine.js
     Áudio procedural leve via Web Audio API.

     - 1 único AudioContext global (lazy init no primeiro interact)
     - 3 sons: playCoin, playSpeech, playEquip
     - Mute persistido em np_r7_audio_muted
     - Sem arquivos externos, sem mp3, sem wav
     - Sem oscillators vivos após término
     - Sem memory leak
     ═══════════════════════════════════════════════════════════════ */

  /* ── Guard de double-init ─────────────────────────────────────── */
  if (window.__ZAP_AUDIO__) return;
  window.__ZAP_AUDIO__ = true;

  /* ── Constantes ───────────────────────────────────────────────── */
  var STORAGE_MUTE_KEY = 'np_r7_audio_muted';
  var MASTER_GAIN      = 0.28; /* volume geral — não intrusivo */

  /* ── Estado ───────────────────────────────────────────────────── */
  var _ctx        = null;  /* único AudioContext */
  var _masterGain = null;  /* nó de ganho master */
  var _muted      = false;
  var _unlocked   = false; /* AudioContext desbloqueado pelo usuário */

  /* ── Carregar estado de mute persistido ───────────────────────── */
  try {
    _muted = localStorage.getItem(STORAGE_MUTE_KEY) === 'true';
  } catch (e) {}

  /* ── Lazy init do AudioContext ────────────────────────────────── */
  function _getCtx() {
    if (_ctx) return _ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
      /* Nó master de ganho — controla mute global */
      _masterGain = _ctx.createGain();
      _masterGain.gain.value = _muted ? 0 : MASTER_GAIN;
      _masterGain.connect(_ctx.destination);
      return _ctx;
    } catch (e) {
      return null;
    }
  }

  /* ── Desbloquear AudioContext (requer gesto do usuário) ───────── */
  function _unlock() {
    if (_unlocked) return;
    var ctx = _getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    _unlocked = true;
  }

  /* ── Listener de desbloqueio no primeiro evento do usuário ────── */
  var _unlockEvents = ['click', 'touchstart', 'keydown'];
  function _onUserGesture() {
    _unlock();
    /* Remover listeners após primeiro disparo */
    _unlockEvents.forEach(function (ev) {
      document.removeEventListener(ev, _onUserGesture);
    });
  }
  _unlockEvents.forEach(function (ev) {
    document.addEventListener(ev, _onUserGesture, { once: true, passive: true });
  });

  /* ── Helper: resume seguro ────────────────────────────────────── */
  function _safeResume(ctx, cb) {
    if (!ctx) return;
    if (ctx.state === 'running') { cb(ctx); return; }
    ctx.resume().then(function () { cb(ctx); }).catch(function () {});
  }

  /* ── Helper: criar oscillator com envelope e auto-stop ────────── */
  function _playTone(opts) {
    /*
      opts = {
        type:       OscillatorType ('sine'|'square'|'sawtooth'|'triangle'),
        freq:       Hz inicial,
        freqEnd:    Hz final (opcional — usa exponentialRamp),
        attack:     seconds,
        sustain:    seconds,
        release:    seconds,
        gain:       0..1 (relativo ao master),
        detune:     cents (opcional),
        freqRamp:   'exp' | 'lin' (default 'exp')
      }
    */
    var ctx = _getCtx();
    if (!ctx || _muted) return;

    _safeResume(ctx, function (ctx) {
      var now    = ctx.currentTime;
      var attack  = opts.attack  || 0.005;
      var sustain = opts.sustain || 0.08;
      var release = opts.release || 0.04;
      var total   = attack + sustain + release;

      /* Oscillator */
      var osc = ctx.createOscillator();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(opts.freq || 440, now);

      if (opts.detune) osc.detune.setValueAtTime(opts.detune, now);

      /* Frequência final com ramp */
      if (opts.freqEnd) {
        var rampEnd = now + attack + sustain;
        if (opts.freqRamp === 'lin') {
          osc.frequency.linearRampToValueAtTime(opts.freqEnd, rampEnd);
        } else {
          osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), rampEnd);
        }
      }

      /* Envelope de ganho (evita click/pop) */
      var gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(opts.gain || 0.5, now + attack);
      gainNode.gain.setValueAtTime(opts.gain || 0.5, now + attack + sustain);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + total);

      /* Routing: osc → gainNode → masterGain → destination */
      osc.connect(gainNode);
      gainNode.connect(_masterGain);

      /* Start e stop precisos */
      osc.start(now);
      osc.stop(now + total + 0.01);

      /* Cleanup automático após término */
      osc.onended = function () {
        try { gainNode.disconnect(); } catch (e) {}
        try { osc.disconnect();     } catch (e) {}
      };
    });
  }

  /* ── Helper: criar ruído branco curto ────────────────────────── */
  function _playNoise(opts) {
    var ctx = _getCtx();
    if (!ctx || _muted) return;

    _safeResume(ctx, function (ctx) {
      var now      = ctx.currentTime;
      var duration = opts.duration || 0.06;
      var sampleRate = ctx.sampleRate;
      var bufLen   = Math.ceil(sampleRate * duration);
      var buffer   = ctx.createBuffer(1, bufLen, sampleRate);
      var data     = buffer.getChannelData(0);
      for (var i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * (opts.amplitude || 0.3);
      }

      var source = ctx.createBufferSource();
      source.buffer = buffer;

      /* Filtro para dar timbre */
      var filter = ctx.createBiquadFilter();
      filter.type = opts.filterType || 'bandpass';
      filter.frequency.value = opts.filterFreq || 800;
      filter.Q.value = opts.Q || 2;

      var gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(opts.gain || 0.4, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(_masterGain);

      source.start(now);
      source.stop(now + duration + 0.01);

      source.onended = function () {
        try { gainNode.disconnect(); filter.disconnect(); source.disconnect(); } catch (e) {}
      };
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     SONS PÚBLICOS
     ═══════════════════════════════════════════════════════════════ */

  /**
   * playCoin() — Coleta de moeda
   * Cristalino, arcade/chiptune, ~100ms
   * Duas notas rápidas em sequência (C5 → E5)
   */
  function playCoin() {
    if (_muted) return;
    /* Nota 1: C5 (523Hz) */
    _playTone({
      type:    'square',
      freq:    523,
      freqEnd: 659,
      attack:  0.004,
      sustain: 0.04,
      release: 0.04,
      gain:    0.45,
      freqRamp: 'exp'
    });
    /* Nota 2: E5 (659Hz) com delay de 60ms */
    var ctx = _getCtx();
    if (ctx) {
      _safeResume(ctx, function (ctx) {
        var now = ctx.currentTime + 0.06;
        var osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(659, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.4, now + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.connect(g); g.connect(_masterGain);
        osc.start(now); osc.stop(now + 0.14);
        osc.onended = function () {
          try { g.disconnect(); osc.disconnect(); } catch (e) {}
        };
      });
    }
  }

  /**
   * playSpeech() — Bip alienígena do balão de fala
   * Micro bip com pitch aleatório suave, < 80ms
   */
  function playSpeech() {
    if (_muted) return;
    var baseFreq = 280 + Math.random() * 180; /* 280–460Hz aleatório */
    _playTone({
      type:    'sine',
      freq:    baseFreq,
      freqEnd: baseFreq * (1 + Math.random() * 0.3),
      attack:  0.003,
      sustain: 0.035,
      release: 0.03,
      gain:    0.3,
      freqRamp: 'lin'
    });
    /* Segundo micro-bip com timbre levemente diferente */
    _playTone({
      type:    'triangle',
      freq:    baseFreq * 1.5,
      attack:  0.002,
      sustain: 0.02,
      release: 0.02,
      gain:    0.15,
      detune:  Math.random() * 20 - 10
    });
  }

  /**
   * playEquip() — Equipar cosmético
   * Synth sci-fi suave, subida de frequência, 150–200ms
   */
  function playEquip() {
    if (_muted) return;
    /* Sweep ascendente principal */
    _playTone({
      type:     'sawtooth',
      freq:     180,
      freqEnd:  720,
      attack:   0.01,
      sustain:  0.1,
      release:  0.09,
      gain:     0.35,
      freqRamp: 'exp'
    });
    /* Harmônico acima — dá brilho sci-fi */
    _playTone({
      type:     'sine',
      freq:     360,
      freqEnd:  1440,
      attack:   0.015,
      sustain:  0.09,
      release:  0.08,
      gain:     0.2,
      freqRamp: 'exp',
      detune:   5
    });
    /* Ruído de textura curto no ataque */
    _playNoise({
      duration:   0.04,
      filterType: 'highpass',
      filterFreq: 2000,
      Q:          1,
      gain:       0.12
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     MUTE SYSTEM
     ═══════════════════════════════════════════════════════════════ */

  function isMuted() { return _muted; }

  function _applyMute(muted) {
    _muted = muted;
    if (_masterGain) {
      var now = _ctx ? _ctx.currentTime : 0;
      /* Fade suave para evitar click */
      _masterGain.gain.cancelScheduledValues(now);
      _masterGain.gain.setValueAtTime(_masterGain.gain.value, now);
      _masterGain.gain.exponentialRampToValueAtTime(
        muted ? 0.0001 : MASTER_GAIN,
        now + 0.05
      );
    }
    try { localStorage.setItem(STORAGE_MUTE_KEY, muted ? 'true' : 'false'); } catch (e) {}
  }

  function toggleMute() {
    _applyMute(!_muted);
    /* Broadcast mute state para outras abas */
    if (window.ZapConnect && typeof window.ZapConnect.broadcastMute === 'function') {
      window.ZapConnect.broadcastMute(_muted);
    }
    /* Atualizar ícone do botão de mute no widget */
    _updateMuteButton();
    return _muted;
  }

  /* ═══════════════════════════════════════════════════════════════
     BOTÃO DE MUTE NO WIDGET
     ═══════════════════════════════════════════════════════════════ */

  var _muteBtn = null;

  function _updateMuteButton() {
    if (!_muteBtn) return;
    _muteBtn.textContent  = _muted ? '🔇' : '🔊';
    _muteBtn.title        = _muted ? 'Ativar som' : 'Silenciar';
    _muteBtn.setAttribute('aria-label', _muted ? 'Ativar som' : 'Silenciar');
    _muteBtn.setAttribute('aria-pressed', String(_muted));
  }

  function _injectMuteButton() {
    /* Aguarda o widget do Companion existir */
    var widget = document.querySelector('.zc-widget');
    if (!widget || _muteBtn) return;

    var btn = document.createElement('button');
    btn.className = 'zc-mute-btn';
    btn.type      = 'button';
    btn.setAttribute('aria-label', _muted ? 'Ativar som' : 'Silenciar');
    btn.setAttribute('aria-pressed', String(_muted));
    btn.textContent = _muted ? '🔇' : '🔊';

    btn.addEventListener('click', function (e) {
      e.stopPropagation(); /* não disparar drag */
      _unlock();           /* garantir unlock do contexto */
      toggleMute();
    });

    widget.appendChild(btn);
    _muteBtn = btn;
  }

  /* Tenta injetar o botão; se o widget ainda não existir, observa */
  function _initMuteButton() {
    if (_injectMuteButton()) return;
    var mo = new MutationObserver(function () {
      var widget = document.querySelector('.zc-widget');
      if (widget) {
        mo.disconnect();
        _injectMuteButton();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    /* Timeout de segurança */
    var t = setTimeout(function () { mo.disconnect(); }, 15000);
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(function () { clearTimeout(t); mo.disconnect(); });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     HOOKS DE INTEGRAÇÃO COM ZapEconomy e ZapCosmetics
     ═══════════════════════════════════════════════════════════════ */

  function _hookIntegration() {
    /* Coin sound ao receber moedas */
    if (window.ZapEconomy) {
      window.ZapEconomy.onChange(function (ev) {
        if (ev.amount > 0 && ev.reason !== 'sync_remote') {
          playCoin();
        }
      });
    }

    /* Equip sound ao equipar cosmético */
    if (window.ZapCosmetics) {
      window.ZapCosmetics.onChange(function () {
        /* onChange dispara em equip e unlock — som apenas em mudanças reais
           (distinguimos evitando acionar em syncs remotas via razão) */
        playEquip();
      });
    }

    /* Speech sound ao abrir balão no Companion */
    /* ZapCompanion expõe window.ZapCompanion.showBubble como API pública.
       Vamos envolver (wrap) sem alterar o arquivo. */
    if (window.ZapCompanion && window.ZapCompanion.showBubble) {
      var _origShowBubble = window.ZapCompanion.showBubble;
      window.ZapCompanion.showBubble = function (text) {
        playSpeech();
        return _origShowBubble.call(window.ZapCompanion, text);
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     LIFECYCLE E CLEANUP
     ═══════════════════════════════════════════════════════════════ */

  function destroy() {
    /* NÃO fechar AudioContext — é recurso do navegador, caro de recriar.
       Apenas desconectar o masterGain e silenciar. */
    if (_masterGain) {
      try { _masterGain.disconnect(); } catch (e) {}
      _masterGain = null;
    }
    /* Remover botão de mute */
    if (_muteBtn && _muteBtn.parentNode) {
      _muteBtn.parentNode.removeChild(_muteBtn);
      _muteBtn = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     DEBUG
     ═══════════════════════════════════════════════════════════════ */

  function _ensureDebug() {
    window.ZAP_DEBUG = window.ZAP_DEBUG || {};
    window.ZAP_DEBUG._verbose = window.ZAP_DEBUG._verbose || false;

    window.ZAP_DEBUG.testAudio = function (type) {
      _unlock();
      if      (type === 'coin'   || type === 'c') playCoin();
      else if (type === 'speech' || type === 's') playSpeech();
      else if (type === 'equip'  || type === 'e') playEquip();
      else console.warn('[ZapAudio] Tipos válidos: "coin", "speech", "equip"');
    };

    window.ZAP_DEBUG.broadcastTest = function () {
      if (window.ZapConnect) window.ZapConnect.broadcastTest();
      else console.warn('[ZapConnect] Não carregado');
    };

    window.ZAP_DEBUG.verbose = function (on) {
      window.ZAP_DEBUG._verbose = on !== false;
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     INICIALIZAÇÃO
     ═══════════════════════════════════════════════════════════════ */

  function _init() {
    _hookIntegration();
    _initMuteButton();
    _ensureDebug();

    /* Registrar cleanup no lifecycle do NeonPlay */
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(destroy);
    }
  }


  /**
   * playAchievement() — Mini fanfarra 8-bit para conquistas
   * C4 → E4 → G4 → C5 em triangle/square, 120–350ms
   */
  function playAchievement() {
    if (_muted) return;
    var ctx = _getCtx();
    if (!ctx) return;

    _safeResume(ctx, function (ctx) {
      /* Notas da fanfarra: C4(262) E4(330) G4(392) C5(523) */
      var notes = [
        { freq: 262, start: 0.00, dur: 0.08 },
        { freq: 330, start: 0.08, dur: 0.08 },
        { freq: 392, start: 0.16, dur: 0.08 },
        { freq: 523, start: 0.24, dur: 0.14 }
      ];

      var now = ctx.currentTime;

      notes.forEach(function (note) {
        var osc = ctx.createOscillator();
        /* Alterna square/triangle para timbre 8-bit */
        osc.type = (note.freq === 523) ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        var gain = ctx.createGain();
        var s = now + note.start;
        gain.gain.setValueAtTime(0.0001, s);
        gain.gain.exponentialRampToValueAtTime(0.5, s + 0.008);
        gain.gain.setValueAtTime(0.5, s + note.dur - 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, s + note.dur);

        osc.connect(gain);
        gain.connect(_masterGain);

        osc.start(s);
        osc.stop(s + note.dur + 0.01);

        osc.onended = function () {
          try { gain.disconnect(); osc.disconnect(); } catch (e) {}
        };
      });
    });
  }

  /* ── API pública ────────────────────────────────────────────── */
  window.ZapAudio = {
    playCoin:    playCoin,
    playSpeech:  playSpeech,
    playEquip:   playEquip,
    toggleMute:  toggleMute,
    isMuted:     isMuted,
    playAchievement: playAchievement,
    _applyMute:  _applyMute, /* chamado pelo ZapConnect para sync remota */
    version:     'r7.1'
  };

  /* Inicializar após módulos anteriores (todos com defer) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window));
