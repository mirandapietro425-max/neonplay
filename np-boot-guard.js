/* NeonPlay Boot Guard — congela NP_BOOT antes dos modules */
/* NP-BOOT-GUARD: runtime-freeze.js congela window.NP_BOOT antes de games-data.js
   chamar NP_SET_PHASE(). Se NP_BOOT está frozen, substitui por cópia mutável. */
(function() {
  if (window.NP_BOOT && Object.isFrozen(window.NP_BOOT)) {
    var prev = window.NP_BOOT;
    window.NP_BOOT = { phase: prev.phase, history: Array.isArray(prev.history) ? prev.history.slice() : [] };
  }
  if (!window.NP_SET_PHASE) {
    window.NP_SET_PHASE = function(p) {
      if (window.NP_BOOT && !Object.isFrozen(window.NP_BOOT)) { window.NP_BOOT.phase = p; }
    };
  }
  if (!window.NP_BOOT_PHASES) {
    window.NP_BOOT_PHASES = { PRE_BOOT:'pre_boot', CORE_READY:'core_ready', DATA_READY:'data_ready', ENGINE_READY:'engine_ready', APP_READY:'app_ready', MODULES_READY:'modules_ready' };
  }
})();