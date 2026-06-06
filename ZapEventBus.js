;(function (window) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R9 — ZapEventBus.js
     Bus local governado — todo tráfego inter-módulo passa aqui.
     ─────────────────────────────────────────────────────────────
     Depende de: ZapEventContract.js (ZAP_EVENTS, ZAP_SCHEMAS, ZAP_EVENT_VALID)
     ─────────────────────────────────────────────────────────────
     API pública (congelada):
       ZapEventBus.emit(type, data)
       ZapEventBus.on(type, fn)
       ZapEventBus.off(type, fn)
     ─────────────────────────────────────────────────────────────
     Versão: R9.0
  ═══════════════════════════════════════════════════════════════ */

  if (window.ZapEventBus) return;

  var _listeners = {}; /* { eventType: [fn, ...] } */
  var _LOG_PREFIX = '[ZapEventBus]';

  /* ── Validação de payload contra schema ───────────────────── */
  function _validatePayload(type, data) {
    /* R21: check R21 schemas extension if not found in frozen base schemas */
    var schema = (window.ZAP_SCHEMAS && window.ZAP_SCHEMAS[type]) ||
                 (window.ZAP_SCHEMAS_R21 && window.ZAP_SCHEMAS_R21[type]);
    if (!schema || !schema.required || schema.required.length === 0) return true;
    for (var i = 0; i < schema.required.length; i++) {
      var field = schema.required[i];
      if (data === null || data === undefined || !(field in data)) {
        console.warn(_LOG_PREFIX + ' payload inválido para "' + type + '": campo obrigatório ausente → "' + field + '"');
        return false;
      }
    }
    return true;
  }

  /* ── API ──────────────────────────────────────────────────── */
  var _bus = {

    /**
     * Emitir evento governado.
     * Cancela silenciosamente (com warn) se tipo não está no registry.
     */
    emit: function (type, data) {
      if (!window.ZAP_EVENT_VALID || !window.ZAP_EVENT_VALID(type)) {
        console.warn(_LOG_PREFIX + ' evento não registrado ignorado: "' + type + '"');
        return;
      }
      if (!_validatePayload(type, data)) return;

      var fns = _listeners[type];
      if (!fns || fns.length === 0) return;

      /* Cópia para evitar mutation durante iteração */
      var snapshot = fns.slice();
      var payload  = data || {};
      for (var i = 0; i < snapshot.length; i++) {
        try { snapshot[i](payload); } catch (e) {
          console.warn(_LOG_PREFIX + ' listener error em "' + type + '":', e);
        }
      }
    },

    /**
     * Registrar listener.
     */
    on: function (type, fn) {
      if (typeof fn !== 'function') return;
      if (!_listeners[type]) _listeners[type] = [];
      if (_listeners[type].indexOf(fn) === -1) {
        _listeners[type].push(fn);
      }
    },

    /**
     * Remover listener.
     */
    off: function (type, fn) {
      if (!_listeners[type]) return;
      _listeners[type] = _listeners[type].filter(function (f) { return f !== fn; });
    },

    /**
     * Remover todos os listeners de um tipo (usado em destroy).
     */
    offAll: function (type) {
      delete _listeners[type];
    },

    /**
     * Remover todos os listeners de todos os tipos (nuclear — apenas lifecycle).
     */
    destroy: function () {
      _listeners = {};
    }

  };

  window.ZapEventBus = Object.freeze(_bus);

}(window));
