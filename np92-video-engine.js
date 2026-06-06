/* NeonPlay v92 — Video Experience Engine (extracted from game.html) */
/* ══ NeonPlay v92 — Video Experience Engine (game.html) ══
   Injeta intro cinemática antes do jogo carregar.
   Hooks no evento de click do playNowBtn via MutationObserver + patch.
   Não altera engine.js — totalmente isolado. */
(function NP92_VideoEngine() {
  'use strict';

  const INTRO_MAX = 4000; /* ms máx da intro antes de forçar skip */

  /* ── showIntroOverlay ────────────────────────────────────────── */
  function showIntroOverlay(src, onEnd) {
    const overlay = document.getElementById('np92IntroOverlay');
    const video   = document.getElementById('np92IntroVideo');
    const bar     = document.getElementById('np92IntroBar');
    const skipBtn = document.getElementById('np92IntroSkip');
    if (!overlay || !video) { onEnd(); return; }

    video.src = src;
    overlay.classList.remove('np92-intro--hidden');
    overlay.setAttribute('aria-hidden', 'false');

    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        bar.style.transition = `width ${INTRO_MAX}ms linear`;
        bar.style.width = '100%';
      });
    }

    /* v93 — teaser do próximo jogo aparece nos últimos 2s da intro */
    let _teaserTimer = null;
    function _showNextTeaser() {
      const id = new URLSearchParams(location.search).get('id');
      const curGame = (typeof GAMES_DB !== 'undefined' && id)
        ? GAMES_DB.find(g => g.id === id) : null;
      if (!curGame) return;
      const nextGame = typeof window.NP90?.getNextPreviewGame === 'function'
        ? window.NP90.getNextPreviewGame(curGame) : null;
      if (!nextGame) return;

      const teaser = document.createElement('div');
      teaser.className = 'np93-intro-teaser';
      teaser.innerHTML = `
        <span class="np93-teaser-lbl">A seguir</span>
        ${nextGame.thumb
          ? `<img src="${nextGame.thumb}" alt="${nextGame.namePT || nextGame.name || ''}">`
          : `<span class="np93-teaser-emoji">${nextGame.emoji || '🎮'}</span>`}
        <span class="np93-teaser-name">${nextGame.namePT || nextGame.name || ''}</span>`;
      overlay.appendChild(teaser);
      requestAnimationFrame(() => teaser.classList.add('np93-teaser--on'));
    }
    _teaserTimer = setTimeout(_showNextTeaser, Math.max(INTRO_MAX - 2000, 500));

    const finish = () => {
      clearTimeout(_teaserTimer);
      video.pause();
      video.currentTime = 0;
      video.src = '';
      overlay.classList.add('np92-intro--hidden');
      overlay.setAttribute('aria-hidden', 'true');
      if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
      /* limpa teaser */
      overlay.querySelectorAll('.np93-intro-teaser').forEach(el => el.remove());
      onEnd();
    };

    skipBtn && skipBtn.addEventListener('click', finish, { once: true });
    video.addEventListener('ended', finish, { once: true });
    const safetyTimer = setTimeout(finish, INTRO_MAX + 500);
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { clearTimeout(safetyTimer); finish(); });
    }
    video.addEventListener('ended', () => clearTimeout(safetyTimer), { once: true });
  }

  /* ── Hooking no playNowBtn ───────────────────────────────────── */
  /* engine.js usa { once: true } no playNowBtn, então precisamos
     interceptar *antes* dele. Usamos um MutationObserver para aguardar
     o botão existir e então envolvemos o click com capture. */
  function hookPlayBtn() {
    const playBtn = document.getElementById('playNowBtn');
    if (!playBtn) return false;

    /* Marca para não duplicar */
    if (playBtn.dataset.np92hooked) return true;
    playBtn.dataset.np92hooked = '1';

    playBtn.addEventListener('click', e => {
      /* Só ativa se houver introVideo no game atual */
      const game = window._currentGame ||
        (typeof GAMES_DB !== 'undefined' && (() => {
          const id = new URLSearchParams(location.search).get('id');
          return id ? GAMES_DB.find(g => g.id === id) : null;
        })());

      const introSrc = game?.introVideo || '';
      if (!introSrc) return; /* sem intro → fluxo normal do engine */

      /* Impede que o engine processe este click imediatamente */
      e.stopImmediatePropagation();

      /* Mostra a intro; ao terminar, dispara o click real */
      showIntroOverlay(introSrc, () => {
        /* Remove o hook para não interceptar novamente */
        playBtn.dataset.np92hooked = '';
        playBtn.click(); /* dispara o click original do engine */
      });
    }, true /* capture — executa antes do listener do engine */);

    return true;
  }

  /* Aguarda o botão existir (engine preenche depois do DOMContentLoaded) */
  function waitForPlayBtn() {
    if (hookPlayBtn()) return;
    const mo = new MutationObserver(() => {
      if (hookPlayBtn()) mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    /* timeout de segurança */
    setTimeout(() => mo.disconnect(), 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForPlayBtn);
  } else {
    waitForPlayBtn();
  }

  /* Expõe API pública */
  window.NP92 = {
    showIntroOverlay,
    version: 'v92+v93 Smart Video Loop Engine',
  };

})();