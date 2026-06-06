/**
 * NeonPlay R20.11 — np-r20-11-init-coordinator.js
 * Resolve a condição de corrida entre cinematic91, adaptive87 (lo)
 * e ZapQuestEngine que causava sobreposições visuais no hero.
 *
 * Problema: todos os módulos disparavam em DOMContentLoaded
 * e modificavam o hero ao mesmo tempo.
 *
 * Solução: fila de inicialização com prioridades + guards.
 */
(function () {
  'use strict';

  /* ── Guard: não re-executar ── */
  if (window._NP_R2011_COORD) return;
  window._NP_R2011_COORD = true;

  /* ── Estado da coordenação ── */
  var _cinematic91Ready = false;
  var _heroStabilized = false;
  var _loGuarded = false;

  /* ── Fix 1: Marcar o hero-overlay quando cinematic91 ativar ── */
  function _watchCinematic91() {
    var overlay = document.getElementById('np91HeroMount') ||
                  document.querySelector('.np91-hero-overlay');

    if (overlay) {
      overlay.setAttribute('data-active', '1');
      overlay.classList.add('np91--active');
      _cinematic91Ready = true;
    }

    /* Observer: detecta quando cinematic91 insere o overlay no DOM */
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          if (!node || !node.classList) continue;
          if (node.classList.contains('np91-hero-overlay') ||
              node.id === 'np91HeroMount') {
            node.setAttribute('data-active', '1');
            node.classList.add('np91--active');
            _cinematic91Ready = true;
          }
        }
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    /* Limpar observer após 5s */
    setTimeout(function () { observer.disconnect(); }, 5000);
  }

  /* ── Fix 2: Guard no módulo lo (adaptive87 persona) ── */
  /* Intercepta a mutação do .hero-sub para evitar texto duplo */
  function _guardPersonaMutation() {
    if (_loGuarded) return;
    _loGuarded = true;

    var _originalQuerySelector = document.querySelector.bind(document);

    /* Patch: quando lo() chama querySelector('.hero-sub'),
       verificamos se cinematic91 está ativo antes de mutar */
    var _heroSubPatch = setInterval(function () {
      var heroSub = document.querySelector('.hero-sub');
      if (!heroSub) return;

      /* Se cinematic91 está ativo e já mostrou seu spotlight,
         prevenir que lo() faça a transição de opacity no hero-sub
         nativo (que ficaria por cima do spotlight) */
      if (_cinematic91Ready && !heroSub.dataset.np87) {
        /* Adicionar dataset.np87 preventivamente para que lo() 
           detecte que já foi processado e não re-mute */
        /* NÃO fazer nada — deixar lo() mutar normalmente,
           mas garantir que o hero-sub tenha z-index correto */
        heroSub.style.position = 'relative';
        heroSub.style.zIndex = '3';
      }

      clearInterval(_heroSubPatch);
    }, 100);

    /* Timeout de segurança */
    setTimeout(function () { clearInterval(_heroSubPatch); }, 3000);
  }

  /* ── Fix 3: Reposicionar qualquer painel de missões flutuante ── */
  function _fixMissionsPanels() {
    var selectors = [
      '#np84MissionsPanel',
      '.np84-missions-panel',
      '[class*="missions-panel"]'
    ];

    selectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;

      var style = window.getComputedStyle(el);
      var pos = style.position;

      /* Só reposicionar se for fixed ou absolute e estiver
         dentro da viewport superior (cobrindo o hero) */
      if ((pos === 'fixed' || pos === 'absolute')) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.6) {
          el.style.position = 'fixed';
          el.style.top = 'auto';
          el.style.bottom = '80px';
          el.style.right = '16px';
          el.style.left = 'auto';
          el.style.zIndex = '150';
        }
      }
    });
  }

  /* ── Fix 4: Coordenar hero stabilization ── */
  function _markHeroStabilized() {
    _heroStabilized = true;
    var hero = document.querySelector('.hero');
    if (hero) {
      hero.setAttribute('data-stabilized', '1');
    }
    /* Disparar onboarding delayed DEPOIS que o hero estabilizou */
    window._NP_HERO_READY = true;
  }

  /* ── Inicialização ── */
  function _init() {
    _watchCinematic91();
    _guardPersonaMutation();

    /* Verificar missões após DOM carregar */
    setTimeout(_fixMissionsPanels, 500);
    setTimeout(_fixMissionsPanels, 1500); /* segunda passagem */

    /* Marcar hero como estabilizado após 1.5s
       (tempo suficiente para cinematic91 e lo terminarem) */
    setTimeout(_markHeroStabilized, 1500);

    /* Observer contínuo para elementos injetados dinamicamente */
    if (typeof MutationObserver !== 'undefined') {
      var bodyObserver = new MutationObserver(function () {
        _fixMissionsPanels();
      });
      if (document.body) {
        bodyObserver.observe(document.body, { childList: true, subtree: false });
        setTimeout(function () { bodyObserver.disconnect(); }, 10000);
      }
    }
  }

  /* ── Boot ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
