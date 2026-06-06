;(function(window){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   NeonPlay R14 — ZapMemory.js
   Light persistent memory — last game, session context

   Depends on: NPUtils
   Exports: window.ZapMemory
═══════════════════════════════════════════════════════════════ */

if(window.__ZAP_MEMORY__) return;
window.__ZAP_MEMORY__ = true;

var KEY_LAST_GAME = 'np_last_game';

function saveLastGame(slug){
  if(!slug || typeof slug !== 'string') return;
  /* trim to 80 chars max */
  var s = slug.trim().substring(0, 80);
  if(window.NPUtils) NPUtils.storage.set(KEY_LAST_GAME, s);
  else try{ localStorage.setItem(KEY_LAST_GAME, s); }catch(e){}
}

function getLastGame(){
  if(window.NPUtils) return NPUtils.storage.get(KEY_LAST_GAME, '');
  try{ return localStorage.getItem(KEY_LAST_GAME) || ''; }catch(e){ return ''; }
}

/* ── Genre context messages ──────────────── */
var _GENRE_MSGS = {
  puzzle:    ['Puzzle? Vou testar o nível de matéria cinzenta humano. 🧠', 'No Planeta Zap, puzzle é uma disciplina olímpica.'],
  horror:    ['Esse parece... perigoso. 👀', 'Sistema de medo ativado. Não é pra mim.'],
  corrida:   ['Velocidade máxima ativada. 🏎️', 'No Zap nossas naves fazem isso em hiperdrive.'],
  acao:      ['Modo combate detectado. Tô de olho. ⚔️', 'Analisando sua estratégia. Por curiosidade científica.'],
  aventura:  ['Exploração detectada. É o meu forte. 🗺️', 'Explorei 47 galáxias. Boa sorte com essa fase.'],
  esporte:   ['Esporte? Os humanos e sua gravitação. ⚽', 'No Zap jogamos em gravidade zero.'],
  tiro:      ['Mira calibrada? Processo 900 balas/s no simulador. 🎯', 'Precisão é tudo — no meu planeta e no seu.'],
  estrategia:['Estratégia. Finalmente algo da minha frequência. ♟️', 'Pense antes de agir. Dica do além.'],
  arcade:    ['Arcade clássico. Registrei como patrimônio galáctico. 🕹️', 'Simples, direto, vicioso. Clássico humano.'],
  stickman:  ['Stickman. Entidade bidimensional. Fascinante. 🥷', 'Geometria básica. Eficiência máxima.']
};

function getGenreMsg(genre){
  if(!genre) return null;
  var key = genre.toLowerCase().replace(/\s+/g,'').replace(/[^a-z]/g,'');
  var keys = Object.keys(_GENRE_MSGS);
  var match = keys.find(function(k){ return key.indexOf(k) !== -1 || k.indexOf(key) !== -1; });
  if(!match) return null;
  var arr = _GENRE_MSGS[match];
  return arr[Math.floor(Math.random() * arr.length)];
}

window.ZapMemory = {
  saveLastGame: saveLastGame,
  getLastGame:  getLastGame,
  getGenreMsg:  getGenreMsg,
  init: function(){
    /* Backwards compat: expose functions used in init.js */
    window._saveLastGame = saveLastGame;
    window._getLastGame  = getLastGame;
    window._getGenreMsg  = getGenreMsg;
    if(window.NP_DEBUG) NPUtils.log.info('ZapMemory ready, lastGame:', getLastGame());
  }
};

})(window);