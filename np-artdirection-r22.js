/**
 * NeonPlay — Direção de Arte R22
 * Portal do Infinito · Neural Particles · Plasma Ripple
 * Warp Speed · XP Crystals · Scroll Progress · Card Tilt
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────
     1. SCROLL PROGRESS BAR
  ───────────────────────────────────────── */
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'npScrollProgress';
    document.body.appendChild(bar);

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const doc = document.documentElement;
          const total = doc.scrollHeight - doc.clientHeight;
          const progress = total > 0 ? window.scrollY / total : 0;
          bar.style.transform = `scaleX(${progress})`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ─────────────────────────────────────────
     2. PORTAL DO INFINITO — Canvas
  ───────────────────────────────────────── */
  function initPortal() {
    const heroVisual = document.querySelector('.hero-visual');
    if (!heroVisual) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'npPortalCanvas';
    canvas.width = 480;
    canvas.height = 480;
    heroVisual.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let t = 0;

    const islands = [
      { angle: 0.3,  radius: 160, size: 28, color: '#9333ea', emoji: '⚔️' },
      { angle: 1.2,  radius: 155, size: 24, color: '#00d4ff', emoji: '🏎️' },
      { angle: 2.4,  radius: 165, size: 26, color: '#e8196b', emoji: '🧩' },
      { angle: 3.8,  radius: 152, size: 22, color: '#00e87a', emoji: '🕹️' },
      { angle: 5.0,  radius: 158, size: 25, color: '#f5c518', emoji: '⚽' },
    ];

    function drawPortal() {
      ctx.clearRect(0, 0, 480, 480);
      const cx = 240, cy = 240;

      // Nebula background
      const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 230);
      nebGrad.addColorStop(0, 'rgba(0,0,0,0)');
      nebGrad.addColorStop(0.6, 'rgba(147,51,234,0.07)');
      nebGrad.addColorStop(1, 'rgba(0,212,255,0.04)');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, 480, 480);

      // Outer ring glow
      const outerGlow = ctx.createRadialGradient(cx, cy, 95, cx, cy, 135);
      outerGlow.addColorStop(0, 'rgba(0,255,255,0.0)');
      outerGlow.addColorStop(0.5, 'rgba(0,255,255,0.18)');
      outerGlow.addColorStop(1, 'rgba(0,255,255,0.0)');
      ctx.beginPath();
      ctx.arc(cx, cy, 115, 0, Math.PI * 2);
      ctx.strokeStyle = outerGlow;
      ctx.lineWidth = 32;
      ctx.stroke();

      // Portal ring segments
      const segments = 12;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2 + t * 0.4;
        const a2 = a1 + (Math.PI * 2 / segments) * 0.75;
        const pulse = 0.6 + 0.4 * Math.sin(t * 2 + i * 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, 112, a1, a2);
        ctx.strokeStyle = i % 2 === 0
          ? `rgba(0,255,255,${0.65 * pulse})`
          : `rgba(255,0,255,${0.55 * pulse})`;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Inner ring
      const innerRingPulse = 0.7 + 0.3 * Math.sin(t * 1.5);
      ctx.beginPath();
      ctx.arc(cx, cy, 88, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(147,51,234,${0.45 * innerRingPulse})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Portal core
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 86);
      const ci = 0.5 + 0.15 * Math.sin(t * 0.8);
      coreGrad.addColorStop(0, `rgba(0,20,40,${ci})`);
      coreGrad.addColorStop(0.4, `rgba(0,8,20,${ci * 0.9})`);
      coreGrad.addColorStop(0.8, `rgba(147,51,234,0.15)`);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, 86, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Stars inside portal
      for (let s = 0; s < 35; s++) {
        const sa = (s / 35) * Math.PI * 2 + t * 0.1;
        const sr = 15 + 65 * Math.pow((s * 7.3) % 1, 0.5);
        const sx = cx + Math.cos(sa) * sr;
        const sy = cy + Math.sin(sa) * sr;
        const alpha = 0.3 + 0.5 * Math.sin(t * 3 + s);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      // Energy rays
      for (let r = 0; r < 8; r++) {
        const ra = (r / 8) * Math.PI * 2 + t * 0.2;
        const rPulse = 0.3 + 0.2 * Math.sin(t * 2 + r);
        const x1 = cx + Math.cos(ra) * 92;
        const y1 = cy + Math.sin(ra) * 92;
        const x2 = cx + Math.cos(ra) * (114 + 22 * rPulse);
        const y2 = cy + Math.sin(ra) * (114 + 22 * rPulse);
        const rayGrad = ctx.createLinearGradient(x1, y1, x2, y2);
        rayGrad.addColorStop(0, `rgba(0,212,255,${rPulse})`);
        rayGrad.addColorStop(1, 'rgba(0,212,255,0)');
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = rayGrad;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Floating islands
      islands.forEach((island, i) => {
        const floatT = t * 0.3 + island.angle;
        const ix = cx + Math.cos(floatT) * island.radius;
        const iy = cy + Math.sin(floatT) * island.radius + Math.sin(t * 0.8 + i) * 8;

        // Glow
        const igGrad = ctx.createRadialGradient(ix, iy, 0, ix, iy, island.size * 2.2);
        igGrad.addColorStop(0, island.color + '44');
        igGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(ix, iy, island.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = igGrad;
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.arc(ix, iy, island.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,8,20,0.92)';
        ctx.fill();
        ctx.strokeStyle = island.color + 'aa';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Emoji
        ctx.save();
        ctx.font = `${island.size * 0.9}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(island.emoji, ix, iy);
        ctx.restore();

        // Connection to portal
        const la = 0.07 + 0.05 * Math.sin(t + i);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ix, iy);
        ctx.strokeStyle = `rgba(0,212,255,${la})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      t += 0.01;
      requestAnimationFrame(drawPortal);
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawPortal();
    }
  }

  /* ─────────────────────────────────────────
     3. PLASMA RIPPLE — Botões
  ───────────────────────────────────────── */
  function initPlasmaRipple() {
    document.querySelectorAll('.btn-primary').forEach(btn => {
      btn.style.overflow = 'hidden';
      btn.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'np-ripple';
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top  = (e.clientY - rect.top) + 'px';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 750);
      });
    });
  }

  /* ─────────────────────────────────────────
     4. WARP SPEED — Transição de clique em jogo
  ───────────────────────────────────────── */
  function initWarpSpeed() {
    const overlay = document.createElement('div');
    overlay.className = 'np-warp-overlay';
    document.body.appendChild(overlay);

    document.addEventListener('click', (e) => {
      const gameCard = e.target.closest('.game-card[data-id],.game-card[data-url],.hv-thumb[data-id]');
      if (!gameCard) return;
      overlay.classList.add('active');
      setTimeout(() => overlay.classList.remove('active'), 600);
    });
  }

  /* ─────────────────────────────────────────
     5. NEURAL BACKGROUND PARTICLES
  ───────────────────────────────────────── */
  function initNeuralBg() {
    const canvas = document.createElement('canvas');
    canvas.id = 'npNeuralBg';
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    let mouseX = W / 2, mouseY = H / 2;

    const nodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));

    window.addEventListener('resize', () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function drawNeural() {
      ctx.clearRect(0, 0, W, H);

      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;

        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          n.vx += (dx / dist) * 0.06;
          n.vy += (dy / dist) * 0.06;
        }

        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;

        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 0.9) { n.vx /= speed * 1.1; n.vy /= speed * 1.1; }
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 170) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(0,212,255,${0.13 * (1 - d / 170)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,212,255,0.4)';
        ctx.fill();
      });

      requestAnimationFrame(drawNeural);
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawNeural();
    }
  }

  /* ─────────────────────────────────────────
     6. HOLOGRAPHIC CARD TILT
  ───────────────────────────────────────── */
  function initCardTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.game-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = ((e.clientY - cy) / (rect.height / 2)) * 5;
      const ry = -((e.clientX - cx) / (rect.width / 2)) * 5;
      card.style.transform = `translateY(-8px) scale(1.02) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });

    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s ease, box-shadow 0.35s ease, border-color 0.35s ease';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
    });
  }

  /* ─────────────────────────────────────────
     7. FAVORITE HEART ANIMATION
  ───────────────────────────────────────── */
  function initHeartAnim() {
    document.addEventListener('click', (e) => {
      const fav = e.target.closest('.card-fav');
      if (!fav) return;
      const float = document.createElement('div');
      float.className = 'np-xp-float';
      float.textContent = fav.classList.contains('cf-active') ? '' : '+5 ❤️';
      float.style.left = (e.clientX - 20) + 'px';
      float.style.top  = (e.clientY - 20) + 'px';
      document.body.appendChild(float);
      setTimeout(() => float.remove(), 1400);
    });
  }

  /* ─────────────────────────────────────────
     8. SECTION TITLE GLOW HOVER
  ───────────────────────────────────────── */
  function initSectionGlow() {
    document.querySelectorAll('.section-title').forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.style.textShadow = '0 0 24px rgba(0,212,255,0.35)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.textShadow = '';
      });
    });
  }

  /* ─────────────────────────────────────────
     9. CATEGORY CHIP HOVER ENERGY
  ───────────────────────────────────────── */
  function initChipEnergy() {
    document.querySelectorAll('.cat-chip').forEach(chip => {
      chip.addEventListener('mouseenter', () => {
        chip.style.boxShadow = '0 0 20px rgba(0,212,255,0.18), 0 4px 16px rgba(0,0,0,0.45)';
      });
      chip.addEventListener('mouseleave', () => {
        chip.style.boxShadow = '';
      });
    });
  }

  /* ─────────────────────────────────────────
     10. BOOT — Section reveal observer
  ───────────────────────────────────────── */
  function initBootSequence() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section.reveal').forEach(s => observer.observe(s));
  }

  /* ─────────────────────────────────────────
     11. LOGO NEON CLICK EFFECT
  ───────────────────────────────────────── */
  function initLogoEffect() {
    const logo = document.querySelector('.logo');
    if (!logo) return;

    logo.addEventListener('click', (e) => {
      const flash = document.createElement('div');
      flash.style.cssText = `
        position:fixed;inset:0;
        background:radial-gradient(circle at ${e.clientX}px ${e.clientY}px,
          rgba(0,212,255,0.18) 0%, transparent 55%);
        pointer-events:none;z-index:9999;
        animation:r22FadeOut 0.45s ease forwards;
      `;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 500);
    });
  }

  /* ─────────────────────────────────────────
     12. ONDA DE ENERGIA — card wake on scroll
  ───────────────────────────────────────── */
  function initCardWave() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const cards = entry.target.querySelectorAll('.game-card');
          cards.forEach((card, i) => {
            card.style.animation = `none`;
            card.style.opacity = '0';
            setTimeout(() => {
              card.style.animation = `r22CardWake 0.45s cubic-bezier(.34,1.56,.64,1) ${i * 0.05}s both`;
            }, 10);
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05 });

    document.querySelectorAll('.games-grid, .carousel-scroll').forEach(grid => {
      observer.observe(grid);
    });
  }

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  function init() {
    initScrollProgress();
    initPortal();
    initPlasmaRipple();
    initWarpSpeed();
    initNeuralBg();
    initCardTilt();
    initHeartAnim();
    initSectionGlow();
    initChipEnergy();
    initBootSequence();
    initLogoEffect();
    initCardWave();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
