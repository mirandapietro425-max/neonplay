;(function (window) {
  'use strict';

  /* ── Guard de double-init ───────────────────────────────────── */
  if (window.__ZAP_ECONOMY__) return;
  window.__ZAP_ECONOMY__ = true;

  /* ── Constantes ─────────────────────────────────────────────── */
  var STORAGE_KEY = 'np_r7_coins';
  var _listeners  = [];

  /* ── Persistência ───────────────────────────────────────────── */
  function _load() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v !== null ? Math.max(0, parseInt(v, 10) || 0) : 0;
    } catch (e) { return 0; }
  }

  function _save(n) {
    try { localStorage.setItem(STORAGE_KEY, String(n)); } catch (e) { /* quota */ }
  }

  /* ── Notificação de mudança ─────────────────────────────────── */
  function _notify(amount, total, reason) {
    _listeners.forEach(function (fn) {
      try { fn({ amount: amount, total: total, reason: reason }); } catch (e) {}
    });
  }

  /* ── API pública ────────────────────────────────────────────── */
  var ZapEconomy = {
    /** Lê saldo atual (sempre fresco do localStorage) */
    getCoins: function () {
      return _load();
    },

    /** Adiciona moedas. Retorna o novo total. */
    addCoins: function (amount, reason) {
      amount = Math.max(0, Math.floor(+amount || 0));
      if (!amount) return _load();
      var total = _load() + amount;
      _save(total);
      _notify(amount, total, reason || 'add');
      return total;
    },

    /** Gasta moedas. Retorna false se saldo insuficiente. */
    spendCoins: function (amount, reason) {
      amount = Math.max(0, Math.floor(+amount || 0));
      var current = _load();
      if (current < amount) return false;
      var total = current - amount;
      _save(total);
      _notify(-amount, total, reason || 'spend');
      return true;
    },

    /**
     * Registra listener de mudança de saldo.
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

  window.ZapEconomy = ZapEconomy;

}(window));
