;(function (window, document) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R7 — ZapBadges.js
     Achievements Engine + Trophy Room + Toast + Broadcast

     Depende de (carregados antes):
       ZapEconomy.js   → window.ZapEconomy
       ZapConnect.js   → window.ZapConnect  (broadcast)
       ZapAudioEngine.js → window.ZapAudio  (playAchievement)
       bundle.min.js   → window.NP.events, window._currentGame

     Integração:
       - NP.events.on('gameplay:start') → gamesOpened / Coruja
       - ZapEconomy.onChange            → totalSpent
       - ZapCosmetics.onChange          → equip tracking
       - BroadcastChannel existente     → achievement_unlock
       - Patch no ZapAudio              → playAchievement()
     ═══════════════════════════════════════════════════════════════ */

  /* ── Guard de double-init ─────────────────────────────────────── */
  if (window.__ZAP_BADGES__) return;
  window.__ZAP_BADGES__ = true;

  /* ── Constantes ───────────────────────────────────────────────── */
  var STORAGE_KEY   = 'zap_achievements_v1';
  var TOAST_DURATION = 4500; /* ms que o toast fica visível */

  /* ═══════════════════════════════════════════════════════════════
     DEFINIÇÕES DE CONQUISTAS
     ═══════════════════════════════════════════════════════════════ */
  var ACHIEVEMENT_DEFS = [
    {
      id:          'first_contact',
      emoji:       '👾',
      title:       'Primeiro Contato',
      description: 'Abriste teu primeiro jogo na galáxia NeonPlay.',
      metric:      'gamesOpened',
      threshold:   1,
      reward:      { coins: 50 }
    },
    {
      id:          'cosmic_spender',
      emoji:       '💸',
      title:       'Ostentação Cósmica',
      description: 'Gastou 500 Z-Coins. Olha esse luxo!',
      metric:      'totalSpent',
      threshold:   500,
      reward:      { coins: 100, cosmetic: { category: 'skins', id: 'gold' } }
    },
    {
      id:          'zeta_citizen',
      emoji:       '🪐',
      title:       'Cidadão de Zeta',
      description: 'Alcançou o Nível 10. Bem-vindo à elite.',
      metric:      'level',
      threshold:   10,
      reward:      { coins: 200 }
    },
    {
      id:          'grind_addict',
      emoji:       '⚡',
      title:       'Viciado no Grind',
      description: 'Completou 10 missões. O grinding é real.',
      metric:      'dailyMissionsCompleted',
      threshold:   10,
      reward:      { coins: 150 }
    },
    {
      id:          'speed_finger',
      emoji:       '🏎️',
      title:       'Dedo de Velocidade',
      description: '3 ativações do Navegador Veloz. Você voa.',
      metric:      'fastScrollCount',
      threshold:   3,
      reward:      { coins: 75 }
    },
    {
      id:          'night_owl',
      emoji:       '🦉',
      title:       'Coruja Espacial',
      description: 'Abriu um jogo entre 00h e 05h. Que noturno.',
      metric:      'nightSessions',
      threshold:   1,
      reward:      { coins: 100 }
    }
  ];

  /* ── Mapa de ids para acesso rápido ─────────────────────────── */
  var _defById = {};
  ACHIEVEMENT_DEFS.forEach(function (d) { _defById[d.id] = d; });

  /* ═══════════════════════════════════════════════════════════════
     PERSISTÊNCIA
     ═══════════════════════════════════════════════════════════════ */

  var _DEFAULT_STATE = {
    achievements: {}, /* { [id]: { unlocked, unlockedAt, rewardGiven } } */
    metrics: {
      gamesOpened:            0,
      totalSpent:             0,
      dailyMissionsCompleted: 0,
      fastScrollCount:        0,
      level:                  1,
      nightSessions:          0
    }
  };

  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(_DEFAULT_STATE));
      var parsed = JSON.parse(raw);
      /* Merge seguro — garante que métricas novas não somem undefined */
      var state = JSON.parse(JSON.stringify(_DEFAULT_STATE));
      if (parsed.achievements) Object.assign(state.achievements, parsed.achievements);
      if (parsed.metrics)      Object.assign(state.metrics,      parsed.metrics);
      return state;
    } catch (e) {
      return JSON.parse(JSON.stringify(_DEFAULT_STATE));
    }
  }

  function _save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════════
     MÉTRICAS — helpers
     ═══════════════════════════════════════════════════════════════ */

  function _incrementMetric(key, by) {
    var state = _load();
    state.metrics[key] = (state.metrics[key] || 0) + (by || 1);
    _save(state);
    return state.metrics[key];
  }

  function _setMetric(key, value) {
    var state = _load();
    state.metrics[key] = value;
    _save(state);
    return value;
  }

  /* Lê nível atual do NP84 via localStorage (np84_xp → calcular nível) */
  function _readCurrentLevel() {
    try {
      var xp = parseInt(localStorage.getItem('np84_xp'), 10) || 0;
      /* Tabela de nível: NP84 usa crescimento linear ~100xp/nível (estimado) */
      return Math.max(1, Math.floor(xp / 100) + 1);
    } catch (e) { return 1; }
  }

  /* Conta missões completas via np84_missions */
  function _readMissionsCompleted() {
    try {
      var raw = localStorage.getItem('np84_missions');
      if (!raw) return 0;
      var missions = JSON.parse(raw);
      if (!Array.isArray(missions)) return 0;
      return missions.filter(function (m) { return m && m.done; }).length;
    } catch (e) { return 0; }
  }

  /* ═══════════════════════════════════════════════════════════════
     ENGINE DE CONQUISTAS
     ═══════════════════════════════════════════════════════════════ */

  function _isUnlocked(id) {
    var state = _load();
    return !!(state.achievements[id] && state.achievements[id].unlocked);
  }

  function _grantReward(def) {
    if (def.reward.coins && window.ZapEconomy) {
      window.ZapEconomy.addCoins(def.reward.coins, 'achievement_' + def.id);
    }
    if (def.reward.cosmetic && window.ZapCosmetics) {
      window.ZapCosmetics.unlock(def.reward.cosmetic.category, def.reward.cosmetic.id);
    }
  }

  /**
   * Tenta desbloquear um achievement.
   * ONE-TIME ONLY — guard duplo: no estado e no rewardGiven.
   * Retorna true se desbloqueou agora, false se já estava desbloqueado.
   */
  function checkAchievement(id, opts) {
    var def = _defById[id];
    if (!def) return false;

    /* Guard primário — já desbloqueado */
    if (_isUnlocked(id)) return false;

    /* Verificar threshold */
    var state = _load();
    var metric = state.metrics[def.metric] || 0;
    if (metric < def.threshold) return false;

    /* Guard de recompensa duplicada (double-write safety) */
    if (state.achievements[id] && state.achievements[id].rewardGiven) return false;

    /* Desbloquear */
    state.achievements[id] = {
      unlocked:    true,
      unlockedAt:  Date.now(),
      rewardGiven: false          /* será true após grant para evitar replay */
    };
    _save(state);

    /* Conceder recompensa */
    _grantReward(def);

    /* Marcar recompensa como concedida */
    state = _load();
    state.achievements[id].rewardGiven = true;
    _save(state);

    /* Efeitos */
    _showToast(def, opts && opts.silent);
    if (!opts || !opts.silent) {
      if (window.ZapAudio && typeof window.ZapAudio.playAchievement === 'function') {
        window.ZapAudio.playAchievement();
      }
    }

    /* Broadcast */
    if (!opts || !opts.noBroadcast) {
      _broadcastUnlock(id);
    }

    /* Atualizar Trophy Room se visível */
    _refreshTrophyRoom();

    return true;
  }

  /** Avalia todas as conquistas pelo estado atual das métricas. */
  function evaluateAll() {
    ACHIEVEMENT_DEFS.forEach(function (def) {
      checkAchievement(def.id);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     BROADCAST — achievement_unlock
     ═══════════════════════════════════════════════════════════════ */

  /* Estendemos o BroadcastChannel existente via novo listener.
     Não modificamos ZapConnect — abrimos um segundo listener no mesmo canal. */
  var _bcChannel = null;
  var _tabId     = (window.ZapConnect && window.ZapConnect.tabId)
                   || ('bt_' + Math.random().toString(36).slice(2, 8));
  var _seenTs    = {};

  function _openBroadcast() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      _bcChannel = new BroadcastChannel('neonplay_zap_core');
      _bcChannel.onmessage = _onBroadcastMessage;
    } catch (e) {}
  }

  function _broadcastUnlock(id) {
    if (!_bcChannel) return;
    try {
      _bcChannel.postMessage({
        type:   'achievement_unlock',
        source: _tabId,
        ts:     Date.now(),
        data:   { id: id }
      });
    } catch (e) {}
  }

  function _onBroadcastMessage(event) {
    var msg = event.data;
    if (!msg || msg.type !== 'achievement_unlock') return;
    if (msg.source === _tabId) return; /* anti-echo */
    var key = msg.type + '|' + msg.source;
    if (_seenTs[key] && msg.ts <= _seenTs[key]) return; /* dedupe */
    _seenTs[key] = msg.ts;

    /* Aplicar achievement remotamente — sem audio, sem broadcast (evita loop) */
    var id    = msg.data && msg.data.id;
    var def   = _defById[id];
    if (!def || _isUnlocked(id)) return;

    /* Registrar localmente sem re-broadcast */
    var state = _load();
    state.achievements[id] = {
      unlocked:    true,
      unlockedAt:  Date.now(),
      rewardGiven: true   /* recompensa já foi dada na aba de origem */
    };
    _save(state);

    _showToast(def, false /* com toast — o jogador vê na outra aba */);
    _refreshTrophyRoom();
  }

  /* ═══════════════════════════════════════════════════════════════
     TOAST PREMIUM
     ═══════════════════════════════════════════════════════════════ */

  var _toastEl     = null;
  var _toastTimer  = null;
  var _toastQueue  = [];
  var _toastActive = false;

  function _ensureToastEl() {
    if (_toastEl) return;
    var el = document.createElement('div');
    el.id        = 'zb-toast';
    el.className = 'zb-toast';
    el.setAttribute('aria-live', 'assertive');
    el.setAttribute('aria-atomic', 'true');
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
    _toastEl = el;
  }

  function _showToast(def, silent) {
    if (silent) return;
    _toastQueue.push(def);
    if (!_toastActive) _processToastQueue();
  }

  function _processToastQueue() {
    if (!_toastQueue.length) { _toastActive = false; return; }
    _toastActive = true;
    var def = _toastQueue.shift();
    _ensureToastEl();

    _toastEl.innerHTML =
      '<div class="zb-toast__icon">' + def.emoji + '</div>' +
      '<div class="zb-toast__body">' +
        '<div class="zb-toast__label">🏆 CONQUISTA DESBLOQUEADA</div>' +
        '<div class="zb-toast__title">' + _escHtml(def.title) + '</div>' +
        '<div class="zb-toast__reward">' + _rewardText(def) + '</div>' +
      '</div>';

    _toastEl.classList.add('zb-toast--visible');

    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      _toastEl.classList.remove('zb-toast--visible');
      /* Aguardar transição antes do próximo */
      _toastTimer = setTimeout(function () {
        _processToastQueue();
      }, 350);
    }, TOAST_DURATION);
  }

  function _rewardText(def) {
    var parts = [];
    if (def.reward.coins) parts.push('+' + def.reward.coins + ' Z-Coins');
    if (def.reward.cosmetic) parts.push('Skin desbloqueada: ' + def.reward.cosmetic.id);
    return parts.join(' · ') || '';
  }

  function _escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     TROPHY ROOM — modal #zapGallery injetado
     ═══════════════════════════════════════════════════════════════ */

  var _galleryEl = null;

  function _ensureGallery() {
    if (document.getElementById('zapGallery')) return;

    var el = document.createElement('div');
    el.id            = 'zapGallery';
    el.className     = 'zb-gallery';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Trophy Room — Conquistas');
    el.hidden = true;

    el.innerHTML =
      '<div class="zb-gallery__inner">' +
        '<div class="zb-gallery__header">' +
          '<span class="zb-gallery__title">🏆 Conquistas</span>' +
          '<button class="zb-gallery__close" aria-label="Fechar" id="zbGalleryClose">✕</button>' +
        '</div>' +
        '<div class="zb-gallery__grid" id="zbGrid"></div>' +
      '</div>';

    document.body.appendChild(el);
    _galleryEl = el;

    /* Fechar */
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.id === 'zbGalleryClose') _closeGallery();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !el.hidden) _closeGallery();
    });
  }

  function _openGallery() {
    _ensureGallery();
    var el = document.getElementById('zapGallery');
    if (!el) return;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    _renderGrid();
    /* Focus trap mínimo */
    var close = document.getElementById('zbGalleryClose');
    if (close) close.focus();
  }

  function _closeGallery() {
    var el = document.getElementById('zapGallery');
    if (!el) return;
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    /* Devolver foco ao botão que abriu */
    var trigger = document.getElementById('zbTrophyBtn');
    if (trigger) trigger.focus();
  }

  function _renderGrid() {
    var grid = document.getElementById('zbGrid');
    if (!grid) return;
    var state = _load();
    grid.innerHTML = '';

    ACHIEVEMENT_DEFS.forEach(function (def) {
      var info      = state.achievements[def.id] || {};
      var unlocked  = !!info.unlocked;
      var card      = document.createElement('div');
      card.className = 'zb-card' + (unlocked ? ' zb-card--unlocked' : ' zb-card--locked');
      card.setAttribute('role', 'listitem');

      var dateStr = unlocked && info.unlockedAt
        ? new Date(info.unlockedAt).toLocaleDateString('pt-BR')
        : '';

      card.innerHTML =
        '<div class="zb-card__emoji">' + (unlocked ? def.emoji : '🔒') + '</div>' +
        '<div class="zb-card__title">' + _escHtml(def.title) + '</div>' +
        '<div class="zb-card__desc">' +
          (unlocked ? _escHtml(def.description) : 'Conquista bloqueada') +
        '</div>' +
        '<div class="zb-card__meta">' +
          (unlocked
            ? '<span class="zb-card__reward">' + _rewardText(def) + '</span>' +
              (dateStr ? '<span class="zb-card__date">' + dateStr + '</span>' : '')
            : '<span class="zb-card__hint">Continue jogando para desbloquear</span>') +
        '</div>';

      grid.appendChild(card);
    });
  }

  function _refreshTrophyRoom() {
    var el = document.getElementById('zapGallery');
    if (!el || el.hidden) return;
    _renderGrid();
  }

  /* Botão de acesso ao Trophy Room — injetado no companion widget */
  function _injectTrophyButton() {
    if (document.getElementById('zbTrophyBtn')) return;
    var widget = document.querySelector('.zc-widget');
    if (!widget) return;

    var btn = document.createElement('button');
    btn.id        = 'zbTrophyBtn';
    btn.className = 'zb-trophy-btn';
    btn.type      = 'button';
    btn.setAttribute('aria-label', 'Ver conquistas');
    btn.title     = 'Conquistas';
    btn.textContent = '🏆';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var el = document.getElementById('zapGallery');
      if (el && !el.hidden) { _closeGallery(); } else { _openGallery(); }
    });

    widget.appendChild(btn);
  }

  function _initTrophyButton() {
    if (_injectTrophyButton()) return;
    var mo = new MutationObserver(function () {
      if (document.querySelector('.zc-widget')) {
        mo.disconnect();
        clearTimeout(_moTimer);
        _injectTrophyButton();
      }
    });
    var _moTimer = setTimeout(function () { mo.disconnect(); }, 15000);
    mo.observe(document.body, { childList: true, subtree: true });
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(function () {
        clearTimeout(_moTimer);
        mo.disconnect();
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     HOOKS DE EVENTOS
     ═══════════════════════════════════════════════════════════════ */

  function _hookGameplayStart() {
    if (window.NP && window.NP.events) {
      window.NP.events.on('gameplay:start', function () {
        /* Métrica: jogos abertos */
        _incrementMetric('gamesOpened');
        checkAchievement('first_contact');

        /* Métrica: sessão noturna (00h–05h) */
        var hour = new Date().getHours();
        if (hour >= 0 && hour < 5) {
          _incrementMetric('nightSessions');
          checkAchievement('night_owl');
        }
      });
    }
  }

  function _hookEconomy() {
    if (!window.ZapEconomy) return;
    window.ZapEconomy.onChange(function (ev) {
      if (ev.amount < 0) {
        /* Gasto (amount negativo em spendCoins) */
        var spent = Math.abs(ev.amount);
        _incrementMetric('totalSpent', spent);
        checkAchievement('cosmic_spender');
      }
    });
  }

  function _hookLevel() {
    /* Verificar nível a cada gameplay:start — polling-free */
    if (window.NP && window.NP.events) {
      window.NP.events.on('gameplay:start', function () {
        var lvl = _readCurrentLevel();
        var state = _load();
        if (lvl > (state.metrics.level || 1)) {
          _setMetric('level', lvl);
          checkAchievement('zeta_citizen');
        }
      });
      /* Também ao terminar jogo */
      window.NP.events.on('gameplay:end', function () {
        var lvl = _readCurrentLevel();
        var state = _load();
        if (lvl > (state.metrics.level || 1)) {
          _setMetric('level', lvl);
          checkAchievement('zeta_citizen');
        }

        /* Atualizar missões ao fim do jogo */
        var completed = _readMissionsCompleted();
        _setMetric('dailyMissionsCompleted', completed);
        checkAchievement('grind_addict');
      });
    }
  }

  /* Dedo de Velocidade — scroll rápido detectado via evento nativo */
  var _lastScrollY   = 0;
  var _lastScrollTs  = 0;
  var _scrollHandler = null;

  function _hookFastScroll() {
    _scrollHandler = function () {
      var now = Date.now();
      var dy  = Math.abs(window.scrollY - _lastScrollY);
      var dt  = now - _lastScrollTs;

      if (dt > 0 && dy / dt > 3 && dt < 200) {
        /* Scroll rápido detectado: > 3px/ms em < 200ms */
        _incrementMetric('fastScrollCount');
        checkAchievement('speed_finger');
      }

      _lastScrollY  = window.scrollY;
      _lastScrollTs = now;
    };
    window.addEventListener('scroll', _scrollHandler, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════════
     DEBUG
     ═══════════════════════════════════════════════════════════════ */

  function _setupDebug() {
    window.ZAP_DEBUG = window.ZAP_DEBUG || {};

    window.ZAP_DEBUG.unlockAchievement = function (id) {
      var def = _defById[id];
      if (!def) {
        console.warn('[ZapBadges] ID inválido. Disponíveis:', Object.keys(_defById).join(', '));
        return;
      }
      /* Forçar threshold */
      var state = _load();
      state.metrics[def.metric] = Math.max(state.metrics[def.metric] || 0, def.threshold);
      _save(state);
      /* Limpar unlock anterior para permitir re-trigger no debug */
      if (state.achievements[id]) {
        state.achievements[id].unlocked = false;
        state.achievements[id].rewardGiven = false;
        _save(state);
      }
      var result = checkAchievement(id);
      console.log('[ZapBadges] unlockAchievement("' + id + '") →', result ? 'DESBLOQUEADO' : 'já desbloqueado');
    };

    window.ZAP_DEBUG.resetAchievements = function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      _refreshTrophyRoom();
      console.log('[ZapBadges] Conquistas resetadas.');
    };

    window.ZAP_DEBUG.listAchievements = function () {
      var state = _load();
      console.table(ACHIEVEMENT_DEFS.map(function (d) {
        var a = state.achievements[d.id] || {};
        return {
          id:        d.id,
          title:     d.title,
          unlocked:  !!a.unlocked,
          metric:    d.metric,
          progress:  (state.metrics[d.metric] || 0) + '/' + d.threshold
        };
      }));
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════ */

  function destroy() {
    clearTimeout(_toastTimer);
    if (_scrollHandler) {
      window.removeEventListener('scroll', _scrollHandler);
      _scrollHandler = null;
    }
    if (_bcChannel) {
      try { _bcChannel.close(); } catch (e) {}
      _bcChannel = null;
    }
    if (_toastEl && _toastEl.parentNode) {
      _toastEl.parentNode.removeChild(_toastEl);
      _toastEl = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     INICIALIZAÇÃO
     ═══════════════════════════════════════════════════════════════ */

  function _init() {
    _openBroadcast();
    _hookGameplayStart();
    _hookEconomy();
    _hookLevel();
    _hookFastScroll();
    _initTrophyButton();
    _setupDebug();

    /* Avaliar conquistas já possíveis no boot (missões/nível já acumulados) */
    var state = _load();
    state.metrics.level = _readCurrentLevel();
    state.metrics.dailyMissionsCompleted = _readMissionsCompleted();
    _save(state);
    evaluateAll();

    /* Registrar cleanup */
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(destroy);
    }
  }

  /* ── API pública ───────────────────────────────────────────── */
  window.ZapBadges = {
    checkAchievement: checkAchievement,
    evaluateAll:      evaluateAll,
    openTrophyRoom:   _openGallery,
    closeTrophyRoom:  _closeGallery,
    getState:         _load,
    version:          'r7.1'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window, document));
