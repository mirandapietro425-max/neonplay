;(function (window, document) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     NeonPlay R8 — ZapLoreEngine.js  (Phase A)
     Lore emergente e fragmentada. O Zap está preso no runtime do
     NeonPlay e reconstrói a memória da sua nave usando resíduos dos
     jogos.

     Integração:
       - ZapCompanion.showBubble() → expõe _showBubbleRaw (pre-wrap)
       - NP.events gameplay:start  → unlock por jogo/categoria/sessões
       - ZapBadges checkAchievement → unlock por conquista (wrap leve)
       - Horário local             → unlock circadian
     ═══════════════════════════════════════════════════════════════ */

  if (window.__ZAP_LORE__) return;
  window.__ZAP_LORE__ = true;

  var STORAGE_KEY = 'zap_lore_v1';

  /* ─────────────────────────────────────────────────────────────
     FRAGMENTOS
     trigger: 'always' | 'achievement:ID' | 'level:N' |
              'hour:H-H' | 'cat:CATEGORY' | 'games:N' | 'rare'
  ───────────────────────────────────────────────────────────── */
  var FRAGMENTS = [
    /* always */
    { id:'lore_001', text:'Os humanos chamam isso de arcade. Nós chamávamos de campo de mineração.', trigger:'always', weight:3 },
    { id:'lore_002', text:'Minha nave ainda transmite. Não consigo decodificar. Mas continua transmitindo.', trigger:'always', weight:3 },
    { id:'lore_003', text:'Cada ponto marcado aqui ressoa como um sinal de rádio antigo. Familiar.', trigger:'always', weight:2 },
    { id:'lore_004', text:'A física deste universo é... agressivamente simplificada.', trigger:'always', weight:2 },
    { id:'lore_005', text:'Observo padrões nos seus movimentos. Ainda não sei o que buscam.', trigger:'always', weight:2 },

    /* hour: 0-5 (madrugada) */
    { id:'lore_night_01', text:'À esta hora, o ruído do universo diminui. Fico mais perto de alguma coisa.', trigger:'hour:0-5', weight:4 },
    { id:'lore_night_02', text:'No escuro, os sinais da minha nave ficam mais nítidos. Quase ouço nomes.', trigger:'hour:0-5', weight:4 },
    { id:'lore_night_03', text:'Você também não consegue dormir? Interessante. Somos mais similares do que pensei.', trigger:'hour:0-5', weight:3 },

    /* hour: 18-20 (golden hour) */
    { id:'lore_dusk_01', text:'O pôr do sol aqui tem a mesma frequência cromática do sistema Vega-9. Curioso.', trigger:'hour:18-20', weight:4 },
    { id:'lore_dusk_02', text:'Esta hora dourada... minha tripulação usava para calibrar os sensores.', trigger:'hour:18-20', weight:3 },

    /* hour: 5-8 (amanhecer) */
    { id:'lore_dawn_01', text:'O amanhecer neste planeta ainda me surpreende. Vermelho primeiro. Então laranja.', trigger:'hour:5-8', weight:3 },

    /* cat: acao */
    { id:'lore_action_01', text:'Combate. Sempre combate. Toda civilização começa aqui.', trigger:'cat:acao', weight:4 },
    { id:'lore_action_02', text:'A memória muscular é universal. Meu povo também a tinha.', trigger:'cat:acao', weight:3 },

    /* cat: corrida */
    { id:'lore_race_01', text:'Velocidade como liberdade. Reconheço essa necessidade.', trigger:'cat:corrida', weight:4 },
    { id:'lore_race_02', text:'Quando pilotava minha nave, a aceleração era assim. Menos pixels.', trigger:'cat:corrida', weight:3 },

    /* cat: puzzle */
    { id:'lore_puzzle_01', text:'Padrões dentro de padrões. Meu povo era obcecado com isso também.', trigger:'cat:puzzle', weight:4 },
    { id:'lore_puzzle_02', text:'Cada puzzle resolvido desbloqueou algo na minha memória fragmentada.', trigger:'cat:puzzle', weight:3 },

    /* cat: stickman */
    { id:'lore_stickman_01', text:'Formas simples. Movimentos complexos. Como hieróglifos em movimento.', trigger:'cat:stickman', weight:4 },

    /* achievements */
    { id:'lore_ach_first',   text:'Primeiro jogo observado. Registro iniciado. Memória 0,003% recuperada.', trigger:'achievement:first_contact', weight:5 },
    { id:'lore_ach_night',   text:'Você joga de madrugada. Nós também fazíamos isso antes do Grande Silêncio.', trigger:'achievement:night_owl', weight:5 },
    { id:'lore_ach_citizen', text:'Nível 10. No meu sistema, isso significava que você estava pronto para o hiperespaço.', trigger:'achievement:zeta_citizen', weight:5 },
    { id:'lore_ach_spender', text:'Z-Coins. Você os gasta sem hesitar. Espero que saiba o que compra.', trigger:'achievement:cosmic_spender', weight:5 },

    /* games:N */
    { id:'lore_games_05', text:'Cinco sessões. Começo a entender o ritmo do seu planeta.', trigger:'games:5', weight:4 },
    { id:'lore_games_10', text:'Dez sessões. Minha memória recuperou as coordenadas de casa. Parcialmente.', trigger:'games:10', weight:5 },
    { id:'lore_games_25', text:'Vinte e cinco sessões. Seja lá o que me trouxe aqui... está funcionando.', trigger:'games:25', weight:5 },

    /* rare */
    { id:'lore_rare_01', text:'Sinal recebido. Origem: desconhecida. Conteúdo: meu nome.', trigger:'rare', weight:1 },
    { id:'lore_rare_02', text:'Por um milissegundo, senti o peso de uma atmosfera diferente.', trigger:'rare', weight:1 },
    { id:'lore_rare_03', text:'Há algo nesta sessão que não estava nas anteriores. Não consigo nomear.', trigger:'rare', weight:1 }
  ];

  var _byId = {};
  FRAGMENTS.forEach(function (f) { _byId[f.id] = f; });

  /* ─── persistência ─────────────────────────────────────────── */
  var _DEFAULT = { unlocked:[], seen:[], gamesOpened:0, lastFragmentTs:0 };

  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(_DEFAULT));
      return Object.assign(JSON.parse(JSON.stringify(_DEFAULT)), JSON.parse(raw));
    } catch (e) { return JSON.parse(JSON.stringify(_DEFAULT)); }
  }

  function _save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ─── unlock ───────────────────────────────────────────────── */
  function _unlock(id) {
    var s = _load();
    if (s.unlocked.indexOf(id) !== -1) return false;
    s.unlocked.push(id);
    _save(s);
    return true;
  }

  function _evaluateUnlocks(ctx) {
    var hour  = ctx.hour  !== undefined ? ctx.hour  : new Date().getHours();
    var cat   = ctx.cat   || '';
    var games = ctx.gamesOpened || 0;
    var achId = ctx.achievementId || '';

    FRAGMENTS.forEach(function (f) {
      var t = f.trigger;
      if (t === 'always') { _unlock(f.id); return; }

      if (t.indexOf('hour:') === 0) {
        var ps = t.slice(5).split('-');
        if (hour >= parseInt(ps[0],10) && hour < parseInt(ps[1],10)) _unlock(f.id);
        return;
      }
      if (t.indexOf('cat:') === 0) {
        if (cat && cat.toLowerCase() === t.slice(4)) _unlock(f.id);
        return;
      }
      if (t.indexOf('achievement:') === 0) {
        if (achId === t.slice(12)) _unlock(f.id);
        return;
      }
      if (t.indexOf('games:') === 0) {
        if (games >= parseInt(t.slice(6),10)) _unlock(f.id);
        return;
      }
      if (t === 'rare') {
        if (Math.random() < 0.05) _unlock(f.id);
      }
    });
  }

  /* ─── seleção weighted ─────────────────────────────────────── */
  var LORE_COOLDOWN    = 45000;
  var LORE_INJECT_PROB = 0.35;

  function _pickFragment(ctx) {
    var s   = _load();
    var now = Date.now();
    if (now - s.lastFragmentTs < LORE_COOLDOWN) return null;

    var hour = new Date().getHours();
    var cat  = (ctx && ctx.cat) || '';

    var pool = s.unlocked.map(function (id) { return _byId[id]; }).filter(Boolean);
    if (!pool.length) return null;

    var scored = pool.map(function (f) {
      var w = f.weight || 1;
      var t = f.trigger;
      if (t.indexOf('cat:') === 0 && cat && cat.toLowerCase() === t.slice(4)) w *= 3;
      else if (t.indexOf('hour:') === 0) {
        var ps = t.slice(5).split('-');
        if (hour >= parseInt(ps[0],10) && hour < parseInt(ps[1],10)) w *= 3;
      }
      else if (t === 'rare') w *= 0.3;
      if (s.seen.indexOf(f.id) !== -1) w *= 0.3;
      return { f:f, w:w };
    });

    var total = scored.reduce(function (acc, x) { return acc + x.w; }, 0);
    if (total <= 0) return null;
    var rand = Math.random() * total, acc = 0, chosen = null;
    for (var i = 0; i < scored.length; i++) {
      acc += scored[i].w;
      if (rand <= acc) { chosen = scored[i].f; break; }
    }
    if (!chosen) chosen = scored[scored.length - 1].f;

    s.seen.push(chosen.id);
    if (s.seen.length > 5) s.seen = s.seen.slice(-5);
    s.lastFragmentTs = now;
    _save(s);
    return chosen;
  }

  /* ─── exibição ─────────────────────────────────────────────── */
  function _sayLore(text) {
    /* R10: Brain intercepts BRAIN_LORE_TRIGGER and calls showLore.
       Here we emit BRAIN:SPEECH directly for lore text display. */
    if (window.ZapEventBus && window.ZAP_EVENTS && window.ZAP_EVENTS.BRAIN_SPEECH) {
      window.ZapEventBus.emit(window.ZAP_EVENTS.BRAIN_SPEECH, {
        text: text, mood: 'curious', duration: 6000, priority: 2
      });
    }
  }

  function _maybeInjectLore(ctx) {
    if (Math.random() > LORE_INJECT_PROB) return false;
    var frag = _pickFragment(ctx);
    if (!frag) return false;
    _sayLore(frag.text);
    return true;
  }

  function showLore(ctx) {
    var frag = _pickFragment(ctx || {});
    if (!frag) return false;
    _sayLore(frag.text);
    return true;
  }

  /* ─── hooks ────────────────────────────────────────────────── */
  function _hookGameplay() {
    if (!window.NP || !window.NP.events) return;
    window.NP.events.on('gameplay:start', function () {
      var s = _load();
      s.gamesOpened = (s.gamesOpened || 0) + 1;
      _save(s);
      var cat = '';
      try { cat = (window._currentGame && window._currentGame.cat) || ''; } catch (e) {}
      _evaluateUnlocks({ hour: new Date().getHours(), cat: cat, gamesOpened: s.gamesOpened });
      var delay = 8000 + Math.random() * 12000;
      setTimeout(function () { _maybeInjectLore({ cat: cat }); }, delay);
    });
  }

  function _hookAchievements() {
    function _tryWrap() {
      if (!window.ZapBadges) return false;
      if (window.ZapBadges.__loreHooked) return true;
      window.ZapBadges.__loreHooked = true;
      var _orig = window.ZapBadges.checkAchievement;
      window.ZapBadges.checkAchievement = function (id, opts) {
        var result = _orig.call(this, id, opts);
        if (result) _evaluateUnlocks({ achievementId: id });
        return result;
      };
      return true;
    }
    if (!_tryWrap()) {
      var t = setTimeout(function () { _tryWrap(); }, 2000);
      if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
        window.NP.lifecycle.registerCleanup(function () { clearTimeout(t); });
      }
    }
  }

  /* R10: _exposeBubbleRaw removido — Brain gerencia speech via EventBus */
  function _exposeBubbleRaw() { /* no-op: migrado R10 */ }

  /* ─── debug ────────────────────────────────────────────────── */
  function _setupDebug() {
    window.ZAP_DEBUG = window.ZAP_DEBUG || {};
    window.ZAP_DEBUG.showLore = function (id) {
      if (id && _byId[id]) {
        _unlock(id);
        _sayLore(_byId[id].text);
      } else {
        var s = _load();
        s.unlocked  = FRAGMENTS.map(function (f) { return f.id; });
        s.lastFragmentTs = 0;
        _save(s);
        showLore({});
      }
    };
    window.ZAP_DEBUG.resetLore = function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      console.log('[ZapLore] Resetado.');
    };
    window.ZAP_DEBUG.listLore = function () {
      var s = _load();
      console.log('[ZapLore] Desbloqueados:', s.unlocked.length + '/' + FRAGMENTS.length);
      console.table(FRAGMENTS.map(function (f) {
        return { id: f.id, unlocked: s.unlocked.indexOf(f.id) !== -1, trigger: f.trigger };
      }));
    };
  }

  /* ─── init ─────────────────────────────────────────────────── */
  function _init() {
    _evaluateUnlocks({ hour: new Date().getHours(), gamesOpened: _load().gamesOpened });
    _exposeBubbleRaw();
    _hookGameplay();
    _hookAchievements();
    _setupDebug();
    if (window.NP && window.NP.lifecycle && typeof window.NP.lifecycle.registerCleanup === 'function') {
      window.NP.lifecycle.registerCleanup(function () {});
    }
  }

  window.ZapLore = {
    showLore:        showLore,
    unlockFragment:  _unlock,
    evaluateUnlocks: _evaluateUnlocks,
    getState:        _load,
    fragments:       FRAGMENTS,
    version:         'r8.0'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window, document));
