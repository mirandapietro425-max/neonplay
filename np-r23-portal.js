/* NeonPlay R23 — UI polish + visual fallback. Does not change game destinations. */
(function () {
  'use strict';
  var CATEGORY_LABELS = {
    acao: 'AÇÃO', corrida: 'CORRIDA', puzzle: 'PUZZLE', arcade: 'ARCADE',
    esporte: 'ESPORTE', esportes: 'ESPORTE', aventura: 'AVENTURA', tiro: 'AÇÃO',
    estrategia: 'ESTRATÉGIA', '2jogadores': '2 JOGADORES', casual: 'CASUAL',
    meninas: 'CASUAL', plataforma: 'PLATAFORMA', simulacao: 'SIMULAÇÃO',
    cartas: 'CARTAS', tresd: '3D', '3d': '3D'
  };

  function hidePlaceholderAds() {
    document.querySelectorAll('.ad-wrap').forEach(function (wrap) {
      var block = wrap.querySelector('.ad-block');
      if (!block) return;
      if (wrap.querySelector('ins.adsbygoogle iframe, ins.adsbygoogle[data-ad-status="filled"], iframe[data-ad-loaded="true"]')) return;
      var text = (block.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
      var hasOnlyPlaceholder = /^PUBLICIDADE$/.test(text) && block.children.length <= 1;
      if (hasOnlyPlaceholder) {
        wrap.hidden = true;
        wrap.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function normalizeUnverifiedCardMetadata() {
    document.querySelectorAll('article.g').forEach(function (card) {
      var badge = card.querySelector('.bd');
      if (badge && /^(?:TOP|NOVO|🔥?\s*EM ALTA)$/i.test((badge.textContent || '').trim())) {
        badge.remove();
      }

      var small = card.querySelector('a > small');
      if (!small) return;
      var text = (small.textContent || '').trim();
      if (!/⭐|jogadas?|mil\s+jogadas|mi\s+jogadas/i.test(text)) return;

      var category = CATEGORY_LABELS[(card.getAttribute('data-c') || '').toLowerCase()] || 'JOGO';
      small.classList.add('np-card-meta');
      small.replaceChildren(document.createTextNode(category + ' · Jogue agora'));
    });
  }

  function addImageFallbacks() {
    document.querySelectorAll('article.g .im img').forEach(function (img) {
      var fail = function () {
        var parent = img.closest('.im');
        if (!parent) return;
        parent.classList.add('np-r23-cover-failed');
        img.alt = img.alt || 'Capa indisponível';
      };
      img.addEventListener('error', fail, { once: true });
      if (img.complete && img.naturalWidth === 0) fail();
    });
  }

  function monitorMetadataPlaceholders() {
    ['#gpTagRating', '#gpTagPlays'].forEach(function (selector) {
      var node = document.querySelector(selector);
      if (!node) return;
      var update = function () {
        var t = (node.textContent || '').trim();
        var placeholder = /^(?:⭐|👾|⭐\s*|👾\s*)$/.test(t);
        node.hidden = placeholder;
        if (placeholder) node.setAttribute('aria-hidden', 'true');
        else node.removeAttribute('aria-hidden');
      };
      update();
      if (window.MutationObserver) {
        var observer = new MutationObserver(update);
        observer.observe(node, { childList: true, characterData: true, subtree: true });
        window.setTimeout(function () { observer.disconnect(); }, 15000);
      }
    });
  }

  function boot() {
    var isPlayer = Boolean(document.getElementById('gameFrame') && document.getElementById('playNowBtn'));
    var isHome = Boolean(document.getElementById('grid') && document.querySelector('main.w'));

    if (isHome) {
      document.body.classList.add('np-r23-home');
      var catalogSection = document.getElementById('grid').closest('section');
      if (catalogSection) catalogSection.classList.add('np-r23-catalog');
      normalizeUnverifiedCardMetadata();
      addImageFallbacks();
    }

    if (isPlayer) {
      document.body.classList.add('np-r23-player');
      monitorMetadataPlaceholders();
      hidePlaceholderAds();
      // Não intercepta o clique do playNowBtn. A sonda GamePix agora é diagnóstica.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
