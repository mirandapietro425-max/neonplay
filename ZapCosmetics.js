;(function (window) {
  'use strict';

  /* ── Guard de double-init ───────────────────────────────────── */
  if (window.__ZAP_COSMETICS__) return;
  window.__ZAP_COSMETICS__ = true;

  /* ── Constantes ─────────────────────────────────────────────── */
  var STORAGE_KEY = 'np_r7_cosmetics';

  /* ── Catálogo de cosméticos ─────────────────────────────────── */
  var CATALOG = {
    skins: [
      { id: 'default',  name: 'Padrão',    color: '#7C3AED', unlocked: true  },
      { id: 'neon',     name: 'Neon',       color: '#06B6D4', unlocked: false },
      { id: 'fire',     name: 'Fogo',       color: '#F97316', unlocked: false },
      { id: 'gold',     name: 'Ouro',       color: '#EAB308', unlocked: false },
      { id: 'ghost',    name: 'Fantasma',   color: '#94A3B8', unlocked: false }
    ],
    hats: [
      { id: 'none',     name: 'Nenhum',     emoji: '',    unlocked: true  },
      { id: 'top',      name: 'Cartola',    emoji: '🎩',  unlocked: false },
      { id: 'crown',    name: 'Coroa',      emoji: '👑',  unlocked: false },
      { id: 'cap',      name: 'Boné',       emoji: '🧢',  unlocked: false }
    ],
    glasses: [
      { id: 'none',     name: 'Nenhum',     emoji: '',    unlocked: true  },
      { id: 'cool',     name: 'Legal',      emoji: '😎',  unlocked: false },
      { id: 'nerd',     name: 'Nerd',       emoji: '🤓',  unlocked: false }
    ],
    particles: [
      { id: 'none',     name: 'Nenhuma',    unlocked: true  },
      { id: 'stars',    name: 'Estrelas',   unlocked: false },
      { id: 'coins',    name: 'Moedas',     unlocked: false },
      { id: 'flames',   name: 'Chamas',     unlocked: false }
    ]
  };

  /* ── Estado padrão ──────────────────────────────────────────── */
  var DEFAULT_STATE = {
    equippedSkin:      'default',
    equippedHat:       'none',
    equippedGlasses:   'none',
    equippedParticles: 'none',
    unlockedSkins:     ['default'],
    unlockedHats:      ['none'],
    unlockedGlasses:   ['none'],
    unlockedParticles: ['none']
  };

  /* ── Listeners ──────────────────────────────────────────────── */
  var _listeners = [];

  /* ── Persistência ───────────────────────────────────────────── */
  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      return Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), JSON.parse(raw));
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function _save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function _notify(state) {
    _listeners.forEach(function (fn) {
      try { fn(state); } catch (e) {}
    });
  }

  /* ── Helpers ────────────────────────────────────────────────── */
  function _findItem(category, id) {
    return (CATALOG[category] || []).find(function (item) { return item.id === id; }) || null;
  }

  /* ── API pública ────────────────────────────────────────────── */
  var ZapCosmetics = {
    /** Catálogo completo de itens disponíveis */
    catalog: CATALOG,

    /** Retorna o estado atual de equipamentos */
    getEquipped: function () {
      return _load();
    },

    /** Retorna dados do item equipado em uma categoria */
    getEquippedItem: function (category) {
      var state = _load();
      var equippedId = state['equipped' + category.charAt(0).toUpperCase() + category.slice(1)] || 'none';
      return _findItem(category, equippedId);
    },

    /** Equipa um item (deve estar desbloqueado) */
    equip: function (category, id) {
      var state = _load();
      var key = 'equipped' + category.charAt(0).toUpperCase() + category.slice(1);
      var unlockKey = 'unlocked' + category.charAt(0).toUpperCase() + category.slice(1);

      if (!state[unlockKey] || state[unlockKey].indexOf(id) === -1) return false;
      if (!_findItem(category, id)) return false;

      state[key] = id;
      _save(state);
      _notify(state);
      return true;
    },

    /** Desbloqueia um item pelo ID */
    unlock: function (category, id) {
      var state = _load();
      var unlockKey = 'unlocked' + category.charAt(0).toUpperCase() + category.slice(1);
      if (!state[unlockKey]) state[unlockKey] = [];
      if (state[unlockKey].indexOf(id) === -1) {
        state[unlockKey].push(id);
        _save(state);
        _notify(state);
      }
      return true;
    },

    /** Verifica se item está desbloqueado */
    isUnlocked: function (category, id) {
      var state = _load();
      var unlockKey = 'unlocked' + category.charAt(0).toUpperCase() + category.slice(1);
      return state[unlockKey] && state[unlockKey].indexOf(id) !== -1;
    },

    /**
     * Registra listener de mudança de cosméticos.
     * Retorna função de unsubscribe.
     */
    onChange: function (fn) {
      if (typeof fn !== 'function') return function () {};
      _listeners.push(fn);
      return function () {
        _listeners = _listeners.filter(function (f) { return f !== fn; });
      };
    }
  };

  window.ZapCosmetics = ZapCosmetics;

}(window));
