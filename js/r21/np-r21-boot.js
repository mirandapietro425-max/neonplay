/**
 * NeonPlay R21 — np-r21-boot.js
 * Orquestrador de inicialização dos módulos R21.
 *
 * ORDEM DE INICIALIZAÇÃO:
 * 1. ZapEventContract (já carregado pelo HTML — apenas valida)
 * 2. ZapEventBus      (já carregado)
 * 3. NPBus            (já carregado)
 * 4. np-r21-progression-bridge (wrap ZapProgressionSystem)
 * 5. NPGameplay       (sem deps de XP)
 * 6. NPProfile        (deps: ZapProgressionSystem, ZapEconomy)
 * 7. NPMissions       (deps: NPBus, ZapEventBus)
 * 8. NPAchievements   (deps: NPBus, ZapEventBus, ZapEconomy)
 * 9. NPCompanionEvolution (deps: NPBus, ZapEventBus, DOM)
 *
 * REGRAS:
 * - Guard double-init
 * - Aguarda NP:progression-ready ou timeout para iniciar
 * - Respeita cadeia de init existente (não interfere com np-r20-11-init-coordinator)
 * - Cada módulo tem seu próprio guard — boot apenas coordena
 */
;(function(window) {
  'use strict';

  if (window.__NP_R21_BOOT__) return;
  window.__NP_R21_BOOT__ = true;

  var _booted = false;

  function _initAll() {
    if (_booted) return;
    _booted = true;

    if (window.NP_DEBUG) console.log('[R21:Boot] Iniciando módulos R21...');

    /* Ordem respeita dependências */
    var modules = [
      { name: 'NPGameplay',           obj: window.NPGameplay           },
      { name: 'NPProfile',            obj: window.NPProfile            },
      { name: 'NPMissions',           obj: window.NPMissions           },
      { name: 'NPAchievements',       obj: window.NPAchievements       },
      { name: 'NPCompanionEvolution', obj: window.NPCompanionEvolution }
    ];

    modules.forEach(function(m) {
      if (m.obj && typeof m.obj.init === 'function') {
        try {
          m.obj.init();
          if (window.NP_DEBUG) console.log('[R21:Boot] ' + m.name + ' init OK');
        } catch(e) {
          console.warn('[R21:Boot] Falha ao iniciar ' + m.name + ':', e);
        }
      } else {
        if (window.NP_DEBUG) console.warn('[R21:Boot] Módulo não encontrado:', m.name);
      }
    });

    /* Injetar CSS de animações R21 */
    _injectStyles();

    /* Expor estado global de debug */
    window._NP_R21 = {
      profile:     window.NPProfile,
      gameplay:    window.NPGameplay,
      missions:    window.NPMissions,
      achievements: window.NPAchievements,
      companion:   window.NPCompanionEvolution
    };

    if (window.NP_DEBUG) console.log('[R21:Boot] Todos os módulos iniciados.');
  }

  function _injectStyles() {
    if (document.getElementById('np-r21-styles')) return;
    var style = document.createElement('style');
    style.id = 'np-r21-styles';
    style.textContent = [
      /* Animações de toast/conquista */
      '@keyframes np-mission-in {',
      '  from { opacity:0; transform:translateY(12px); }',
      '  to   { opacity:1; transform:translateY(0);    }',
      '}',
      '@keyframes np-ach-in {',
      '  from { opacity:0; transform:scale(.85) translateX(20px); }',
      '  to   { opacity:1; transform:scale(1)   translateX(0);    }',
      '}',
      '@keyframes np-evo-in {',
      '  from { opacity:0; transform:scale(.8); }',
      '  to   { opacity:1; transform:scale(1);  }',
      '}',

      /* Companion Evolution formas */
      '.np-evo--nova      { transition: box-shadow .6s, border .6s !important; }',
      '.np-evo--nebula    { transition: box-shadow .6s, border .6s !important; }',
      '.np-evo--singularity { transition: box-shadow .6s, border .6s !important; }',

      /* Profile HUD */
      '.np-profile-hud { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }',
      '.np-ph-name  { font-weight:700; color:#e2e8f0; font-size:13px; }',
      '.np-ph-level { background:#a855f7; color:#fff; border-radius:6px; padding:2px 8px; font-size:12px; font-weight:700; }',
      '.np-ph-bar   { flex:1; min-width:60px; height:6px; background:#1a0a2e; border-radius:3px; overflow:hidden; }',
      '.np-ph-fill  { height:100%; background:linear-gradient(90deg,#06b6d4,#a855f7); border-radius:3px; transition:width .4s; }',
      '.np-ph-coins { font-size:12px; color:#fbbf24; }',

      /* Missions panel */
      '.np-missions-list { display:flex; flex-direction:column; gap:10px; padding:8px; }',
      '.np-mission-item  { display:flex; align-items:center; gap:10px; padding:12px; background:#0d1b2a; border-radius:12px; border:1px solid #06b6d422; transition:border-color .2s; }',
      '.np-mission-item.np-mi--done { border-color:#06b6d4; opacity:.7; }',
      '.np-mi-icon  { font-size:24px; flex-shrink:0; }',
      '.np-mi-body  { flex:1; display:flex; flex-direction:column; gap:4px; }',
      '.np-mi-title { color:#e2e8f0; font-size:14px; font-weight:700; }',
      '.np-mi-desc  { color:#94a3b8; font-size:12px; }',
      '.np-mi-bar   { height:5px; background:#1e293b; border-radius:3px; overflow:hidden; }',
      '.np-mi-fill  { height:100%; background:linear-gradient(90deg,#06b6d4,#a855f7); transition:width .4s; }',
      '.np-mi-reward{ color:#fbbf24; font-size:11px; margin-top:2px; }',
      '.np-mi-check { color:#06b6d4; font-size:20px; font-weight:700; }',

      /* Reduced motion overrides */
      '@media (prefers-reduced-motion: reduce) {',
      '  .np-evo--nova, .np-evo--nebula, .np-evo--singularity { transition: none !important; }',
      '  .np-ph-fill, .np-mi-fill { transition: none !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ── Timing de boot ─────────────────────────────────────────── */
  /* Aguardar NP:progression-ready (emitido por ZapProgressionSystem.init) */
  document.addEventListener('NP:progression-ready', function() {
    /* Pequeno delay para garantir que bridge já aplicou o wrap */
    setTimeout(_initAll, 200);
  });

  /* Fallback: se NP:progression-ready já foi emitido ou nunca for,
     iniciar após 3s de qualquer forma */
  var _fallbackTries = 0;
  var _fallbackMax   = 12; /* 6s total */
  var _fallbackPoll  = setInterval(function() {
    _fallbackTries++;

    /* Verificar se ZapProgressionSystem está pronto */
    if ((window.ZapProgressionSystem && window.ZapProgressionSystem._ready) || _fallbackTries >= _fallbackMax) {
      clearInterval(_fallbackPoll);
      if (!_booted) _initAll();
    }
  }, 500);

  /* Cleanup do poll */
  if (window.NP && window.NP.lifecycle && NP.lifecycle.registerCleanup) {
    NP.lifecycle.registerCleanup(function() {
      clearInterval(_fallbackPoll);
    });
  }

})(window);
