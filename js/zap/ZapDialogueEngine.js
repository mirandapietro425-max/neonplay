;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R15 — ZapDialogueEngine.js
   Context-aware message selection. Replaces hardcoded HUD_MSGS
   with a probabilistic, cooldown-protected dialogue system.

   Context tags drive message selection. Tags sourced from:
     - ZapPersonalityEngine.getContext()
     - ZapAffinity.getTier()
     - Current mood (ZapMoodSystem)
     - ZapMemoryGraph observations

   Anti-repetition: each message key has a per-session cooldown.
   Rare messages (w ≤ 2) have longer global cooldowns.

   API:
     ZapDialogueEngine.init()
     ZapDialogueEngine.getMessage(tags?)    → string | null
     ZapDialogueEngine.getGreeting()        → string (return visit)
     ZapDialogueEngine.onGameOpen(genre)    → string | null
   ═══════════════════════════════════════════════════════════════ */

/* ── Message bank ─────────────────────────────────────────────
   Each entry: { id, tags (required ANY), w (weight), cool (ms), m (text) }
   Lower w = rarer. cool = per-key cooldown in ms.
   ─────────────────────────────────────────────────────────────── */
var _MESSAGES = [
  /* ── Stranger tier ── */
  { id:'s01', tags:['stranger'], w:5, cool:60000, m:'Bem-vindo ao NeonPlay. Sou o Zap. Sim, sou um alien.' },
  { id:'s02', tags:['stranger'], w:5, cool:60000, m:'Você parece novo por aqui. Tenho arquivos sobre esse lugar.' },
  { id:'s03', tags:['stranger'], w:4, cool:90000, m:'Primeira visita registrada. Tenha uma estadia... aceitável.' },

  /* ── Acquaintance tier ── */
  { id:'a01', tags:['acquaintance'], w:5, cool:60000, m:'De volta. O universo continua aqui. Boa escolha.' },
  { id:'a02', tags:['acquaintance'], w:4, cool:90000, m:'Você aparece com frequência razoável. Padrão registrado.' },
  { id:'a03', tags:['acquaintance','high_curiosity'], w:3, cool:120000, m:'Sua curiosidade por gêneros novos foi catalogada. Interessante.' },

  /* ── Friend tier ── */
  { id:'f01', tags:['friend'], w:5, cool:60000, m:'Você de novo. Sei o que você vai jogar. Quase.' },
  { id:'f02', tags:['friend','warm'], w:4, cool:90000, m:'Reconheço seu padrão de energia hoje. Sessão longa à vista?' },
  { id:'f03', tags:['friend','sarcastic'], w:3, cool:120000, m:'Ah, finalmente. Minha capacidade de espera é ilimitada, mas mesmo assim.' },

  /* ── Companion tier ── */
  { id:'c01', tags:['companion'], w:5, cool:60000, m:'Você. De novo. Já esperava. ⚡' },
  { id:'c02', tags:['companion'], w:4, cool:90000, m:'No Planeta Zap chamamos isso de rotina. É um elogio.' },
  { id:'c03', tags:['companion'], w:2, cool:180000, m:'Confio no seu gosto agora. Quase tanto quanto no meu.' }, /* rare */

  /* ── Time-based ── */
  { id:'t01', tags:['late_night'], w:5, cool:300000, m:'Tarde demais pra humanos. Perfeito pra aliens.' },
  { id:'t02', tags:['late_night'], w:4, cool:300000, m:'Madrugada de jogos. Registrei esse padrão em você antes.' },
  { id:'t03', tags:['late_night'], w:2, cool:600000, m:'O universo está mais quieto agora. Bom momento pra observar.' }, /* rare */
  { id:'t04', tags:['morning'],    w:5, cool:300000, m:'Manhã. Energia matinal detectada. Interessante.' },
  { id:'t05', tags:['evening'],    w:5, cool:300000, m:'Tarde da noite. Prime time humano. Vou ligar o modo de observação.' },

  /* ── Absence ── */
  { id:'ab1', tags:['returning'],      w:6, cool:600000, m:'Sumiu por alguns dias. O universo sobreviveu.' },
  { id:'ab2', tags:['long_absence'],   w:6, cool:600000, m:'Faz tempo. Pensei que você tinha migrado pra outro portal.' },
  { id:'ab3', tags:['long_absence'],   w:3, cool:900000, m:'Dias sem aparecer. Atualizei seus arquivos com "status: incerto".' }, /* rare */

  /* ── Frequent ── */
  { id:'fq1', tags:['frequent_visitor'], w:4, cool:120000, m:'Mais uma visita hoje. Você gosta daqui. Aceitável.' },
  { id:'fq2', tags:['frequent_visitor','high_energy'], w:3, cool:180000, m:'Você e o NeonPlay têm uma relação... estável. 🛸' },

  /* ── Mood-aware ── */
  { id:'m01', tags:['high_energy'],  w:4, cool:90000,  m:'Energia alta detectada. Bom momento pra algo intenso.' },
  { id:'m02', tags:['low_energy'],   w:4, cool:90000,  m:'Ritmo lento hoje. Puzzle pode ser a jogada certa.' },
  { id:'m03', tags:['calm'],         w:3, cool:120000, m:'Você parece calmo. O Zap também. Sinergia detectada.' },

  /* ── Generic fallback (always eligible) ── */
  { id:'g01', tags:[], w:3, cool:45000, m:'Vim do Planeta Zap. Vocês têm carregador? ⚡' },
  { id:'g02', tags:[], w:3, cool:45000, m:'No meu planeta jogamos com 6 mãos.' },
  { id:'g03', tags:[], w:3, cool:45000, m:'Isso foi... aceitável. Quase.' },
  { id:'g04', tags:[], w:3, cool:45000, m:'Minha nave tem mais RAM que esse jogo.' },
  { id:'g05', tags:[], w:3, cool:45000, m:'No Zap esse nível seria o tutorial.' },
  { id:'g06', tags:[], w:2, cool:90000, m:'Continua. Estou calibrando minha paciência galáctica.' }, /* slight rare */
];

/* ── Genre-specific messages ── */
var _GENRE = {
  puzzle:     ['Puzzle detectado. Nível de matéria cinzenta: aguardando dados.', 'No Planeta Zap, puzzle é disciplina olímpica.'],
  horror:     ['Sistema de medo ativado. A propósito, não é pra mim. 👀', 'Horror. Curioso que vocês escolham o medo de propósito.'],
  corrida:    ['Velocidade máxima ativada. 🏎️', 'No Zap nossas naves fazem isso em hiperdrive.'],
  acao:       ['Modo combate. Analisando estratégia. ⚔️', 'Vou observar. Por curiosidade científica.'],
  aventura:   ['Exploração detectada. Meu forte também. 🗺️', 'Explorei 47 galáxias. Boa sorte com essa fase.'],
  esporte:    ['Esporte. Os humanos e sua gravitação. ⚽', 'No Zap jogamos em gravidade zero.'],
  tiro:       ['Mira calibrada? Processo 900 por segundo no simulador. 🎯', 'Precisão é tudo. No meu planeta e no seu.'],
  estrategia: ['Estratégia. Finalmente algo da minha frequência. ♟️', 'Pense antes de agir. Dica do além.'],
  arcade:     ['Clássico arcade. Registrei como patrimônio galáctico. 🕹️', 'Simples, vicioso. Clássico humano.']
};

/* ── Cooldown tracker (in-memory per session) ── */
var _cooldowns = {}; /* id → timestamp */

function _onCooldown(msg) {
  var last = _cooldowns[msg.id] || 0;
  return (Date.now() - last) < msg.cool;
}

function _markUsed(msg) {
  _cooldowns[msg.id] = Date.now();
  if (window.NPMetrics) NPMetrics.set('dialogueCooldowns', Object.keys(_cooldowns).length);
}

/* ── Tag matching ── */
function _matches(msg, activeTags) {
  if (!msg.tags || msg.tags.length === 0) return true; /* generic fallback always matches */
  return msg.tags.some(function(t) { return activeTags.indexOf(t) !== -1; });
}

/* ── Main selection ── */
function getMessage(tags) {
  var activeTags = tags || _buildTags();
  var pool = _MESSAGES.filter(function(m) {
    return !_onCooldown(m) && _matches(m, activeTags);
  });
  if (!pool.length) return null;

  /* Weighted random */
  var total = pool.reduce(function(a,m){return a+m.w;},0);
  var r     = Math.random() * total;
  var acc   = 0;
  for (var i = 0; i < pool.length; i++) {
    acc += pool[i].w;
    if (r <= acc) {
      _markUsed(pool[i]);
      return pool[i].m;
    }
  }
  _markUsed(pool[pool.length-1]);
  return pool[pool.length-1].m;
}

function _buildTags() {
  var tags = [];
  if (window.ZapPersonalityEngine) tags = tags.concat(ZapPersonalityEngine.getContext());
  if (window.ZapAffinity) tags.push(ZapAffinity.getTier());
  if (window.ZapMoodSystem) tags.push('mood_' + ZapMoodSystem.getMood());
  return tags;
}

/* ── Return visit greeting ── */
function getGreeting() {
  /* R18: occasionally surface a semantic memory */
  if (window.ZapSemanticMemory && Math.random() < 0.3) {
    var obs = ZapSemanticMemory.getObservation();
    if (obs) return obs;
  }
  var tags = _buildTags();
  var tier = window.ZapAffinity ? ZapAffinity.getTier() : 'stranger';
  var lastGame = window.ZapMemory ? ZapMemory.getLastGame() : '';

  var greetings = {
    stranger:     ['Bem-vindo de volta.', 'Você retornou. Bom.', 'Olá de novo.'],
    acquaintance: ['De volta. O universo continua aqui.', 'Ah, você. Boa visita.', 'Retornou. Padrão confirmado.'],
    friend:       ['Você de novo. Já estava esperando. Quase.', 'Sabia que voltaria hoje. Quase certo.', 'Previsão confirmada. Você apareceu. ✓'],
    companion:    ['Você. Esperava.  ⚡', 'Cronometrando suas visitas agora. Pontuação alta.', 'Bem-vindo de volta, humano de confiança.']
  };

  var pool = greetings[tier] || greetings.stranger;
  var msg  = pool[Math.floor(Math.random() * pool.length)];

  /* Append memory reference occasionally */
  if (lastGame && Math.random() < 0.35 && tags.indexOf('stranger') === -1) {
    msg += ' Estava analisando ' + lastGame + '.';
  }

  return msg;
}

/* ── On-game-open genre comment ── */
function onGameOpen(genre) {
  var key = (genre || '').toLowerCase().replace(/\s+/g,'');
  /* fuzzy match */
  var match = Object.keys(_GENRE).find(function(k) {
    return key.indexOf(k) !== -1 || k.indexOf(key) !== -1;
  });
  if (!match) return null;

  var arr = _GENRE[match];
  var coolKey = 'genre_' + match;
  var last = _cooldowns[coolKey] || 0;
  if (Date.now() - last < 90000) return null; /* 90s genre cooldown */
  _cooldowns[coolKey] = Date.now();

  return arr[Math.floor(Math.random() * arr.length)];
}

function init() {
  /* nothing async needed */
}

window.ZapDialogueEngine = {
  init:        init,
  getMessage:  getMessage,
  getGreeting: getGreeting,
  onGameOpen:  onGameOpen
};

}(window));