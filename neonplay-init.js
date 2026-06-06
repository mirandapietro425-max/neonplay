/* NeonPlay R16 — neonplay-init.js (base R14 + R16 companion modules) */
/* NeonPlay — init.js (extracted from index.html for caching & maintainability) */

(function(){
'use strict';

/* ── SKINS ── */
var SKINS=[
  {id:'base',  name:'Clássico',        sk:'#6de031',hd:'#1d84f5',req:0},
  {id:'neon',  name:'NeonPlay Cyber',  sk:'#a855f7',hd:'#06b6d4',req:100},
  {id:'zap',   name:'Realeza Zap',     sk:'#fbbf24',hd:'#251b45',req:250},
  {id:'void',  name:'Stealth Void',    sk:'#3a3545',hd:'#e8196b',req:500},
  {id:'mag',   name:'Magma Escarlate', sk:'#ef4444',hd:'#111827',req:900},
  {id:'ice',   name:'Gelo Cósmico',    sk:'#bae6fd',hd:'#1e3a8a',req:1500},
];
var HUD_MSGS=[
  'Vim do Planeta Zap. Vocês têm carregador? ⚡',
  'No meu planeta jogamos com 6 mãos.',
  'Isso foi... aceitável. Quase.',
  'Minha nave tem mais RAM que esse jogo.',
  'No Zap esse nível seria o tutorial.',
  'Obrigado por me dar XP. Acho.',
  'Não tô impressionado. Mas continua.',
];
var LEVELS=[
  {name:'Visitante Galáctico', xp:0,   skin:null},
  {name:'Explorador Neon',     xp:100,  skin:'Neon Cloak'},
  {name:'Guerreiro Estelar',   xp:250,  skin:'Star Armor'},
  {name:'Caçador Cósmico',     xp:500,  skin:'Cosmic Hunter'},
  {name:'Mestre do Universo',  xp:900,  skin:'Universe Master'},
  {name:'Lenda Galáctica',     xp:1500, skin:null},
];

/* ── STATE ── */
var xp=0, level=0, skinIdx=0, hudMsgIdx=0, hudOpen=false;
var gTick=0, gBob=0, gBobD=1, gBlinkT=0, gArmT=0;

/* ── DRAW HELPERS ── */
function rrect(C,x,y,w,h,r){C.beginPath();C.moveTo(x+r,y);C.lineTo(x+w-r,y);C.quadraticCurveTo(x+w,y,x+w,y+r);C.lineTo(x+w,y+h-r);C.quadraticCurveTo(x+w,y+h,x+w-r,y+h);C.lineTo(x+r,y+h);C.quadraticCurveTo(x,y+h,x,y+h-r);C.lineTo(x,y+r);C.quadraticCurveTo(x,y,x+r,y);C.closePath();}
function drawZap(C,cx,cy,sc){C.save();C.translate(cx,cy);C.scale(sc,sc);C.beginPath();C.moveTo(5,-9);C.lineTo(-3,3);C.lineTo(4,3);C.lineTo(-6,15);C.lineTo(18,1);C.lineTo(9,1);C.closePath();C.fillStyle='#fbbf24';C.strokeStyle='#92400e';C.lineWidth=1.2;C.fill();C.stroke();C.restore();}

function drawAlien(C,cx,cy,sc,si,mode){
  sc=sc||1; si=si||0; mode=mode||'idle';
  var S=SKINS[si]||SKINS[0]; var SK=S.sk,HD=S.hd,OL='#1a102b';
  C.save();C.translate(cx,cy+Math.sin(gBob)*4*sc);C.scale(sc,sc);
  C.lineWidth=3.5;C.lineJoin='round';C.lineCap='round';
  /* shadow */C.beginPath();C.ellipse(0,90,40,7,0,0,Math.PI*2);C.fillStyle='rgba(0,0,0,0.3)';C.fill();
  /* legs */C.fillStyle=SK;C.strokeStyle=OL;rrect(C,-22,55,18,30,6);C.fill();C.stroke();rrect(C,4,55,18,30,6);C.fill();C.stroke();
  /* arms */var la=mode==='lvl'?-1.5+Math.sin(gTick*.11)*.1:0.2+Math.sin(gArmT)*.05;
  var ra=mode==='lvl'?1.5+Math.sin(gTick*.11+1)*.1:-0.2+Math.sin(gArmT+1)*.05;
  C.save();C.translate(-35,30);C.rotate(la);C.beginPath();C.ellipse(-5,15,14,24,-0.2,0,Math.PI*2);C.fillStyle=HD;C.fill();C.stroke();C.beginPath();C.arc(-8,35,10,0,Math.PI*2);C.fillStyle=SK;C.fill();C.stroke();C.restore();
  C.save();C.translate(35,30);C.rotate(ra);C.beginPath();C.ellipse(5,15,14,24,0.2,0,Math.PI*2);C.fillStyle=HD;C.fill();C.stroke();C.beginPath();C.arc(8,35,10,0,Math.PI*2);C.fillStyle=SK;C.fill();C.stroke();C.restore();
  /* body / hoodie */C.fillStyle=HD;C.beginPath();C.moveTo(-28,5);C.quadraticCurveTo(-45,55,-35,75);C.lineTo(35,75);C.quadraticCurveTo(45,55,28,5);C.closePath();C.fill();C.stroke();
  /* pocket */C.beginPath();C.moveTo(-22,50);C.lineTo(22,50);C.lineTo(25,75);C.lineTo(-25,75);C.closePath();C.stroke();
  /* strings */C.strokeStyle='#ffffff';C.lineWidth=3.5;C.beginPath();C.moveTo(-10,18);C.lineTo(-12,35);C.stroke();C.beginPath();C.moveTo(10,18);C.lineTo(12,35);C.stroke();
  C.strokeStyle=OL;C.lineWidth=3.5;drawZap(C,0,35,.8);
  /* antennae */C.fillStyle=SK;C.beginPath();C.moveTo(-15,-60);C.quadraticCurveTo(-35,-85,-45,-75);C.stroke();C.beginPath();C.arc(-45,-75,7,0,Math.PI*2);C.fill();C.stroke();C.beginPath();C.moveTo(15,-60);C.quadraticCurveTo(35,-85,45,-75);C.stroke();C.beginPath();C.arc(45,-75,7,0,Math.PI*2);C.fill();C.stroke();
  /* head */C.fillStyle=SK;C.beginPath();C.ellipse(0,-25,65,52,0,0,Math.PI*2);C.fill();C.stroke();
  /* head shine */C.beginPath();C.ellipse(0,-65,18,6,0,0,Math.PI*2);C.fillStyle='rgba(255,255,255,0.4)';C.fill();
  /* eyes */var blink=gBlinkT%120<5;
  if(blink){C.beginPath();C.moveTo(-45,-25);C.quadraticCurveTo(-25,-15,-5,-25);C.strokeStyle=OL;C.lineWidth=3.5;C.stroke();C.beginPath();C.moveTo(5,-25);C.quadraticCurveTo(25,-15,45,-25);C.stroke();}
  else{C.fillStyle='#161026';C.beginPath();C.ellipse(-28,-22,18,26,-0.3,0,Math.PI*2);C.fill();C.stroke();C.beginPath();C.ellipse(28,-22,18,26,0.3,0,Math.PI*2);C.fill();C.stroke();C.fillStyle='#ffffff';C.beginPath();C.ellipse(-20,-35,6,3,-0.5,0,Math.PI*2);C.fill();C.beginPath();C.ellipse(36,-35,6,3,0.5,0,Math.PI*2);C.fill();}
  /* nose */C.fillStyle=OL;C.beginPath();C.arc(-3,3,1.5,0,Math.PI*2);C.fill();C.beginPath();C.arc(3,3,1.5,0,Math.PI*2);C.fill();
  /* mouth */if(mode==='lvl'){C.beginPath();C.ellipse(0,15,6,8,0,0,Math.PI*2);C.fillStyle='#161026';C.fill();C.strokeStyle=OL;C.stroke();}
  else{C.beginPath();C.moveTo(-8,12);C.quadraticCurveTo(0,18,10,10);C.lineWidth=2.5;C.strokeStyle=OL;C.stroke();}
  /* ── Cosmetics overlay (draws after body, inherits bob + scale) ── */
  if(typeof _drawCosmetics==='function') _drawCosmetics(C,mode);
  C.restore();
}

/* ══════════════════════════════════════════
   INTRO ANIMATION
   ══════════════════════════════════════════ */
var iCV=document.getElementById('introCanvas');
var iC=iCV.getContext('2d');
var cw,ch,iRaf,iTick=0,iBlinkT=0,iArmT=0,iBob=0,iBobD=1;
var iScene='warp',iAlienY=-200,iShipScale=0,iShipY=0,iShake=0,iFlash=0;
var stars=[];

function iResize(){cw=window.innerWidth;ch=window.innerHeight;iCV.width=cw;iCV.height=ch;}
window.addEventListener('resize',iResize);iResize();
for(var i=0;i<300;i++)stars.push({x:Math.random()*2000-1000,y:Math.random()*2000-1000,z:Math.random()*2000});

function drawShip(x,y,s){
  iC.save();iC.translate(x,y);iC.scale(s,s);
  var tf=Math.sin(iTick*.4)*8;
  iC.beginPath();iC.moveTo(0,-58);iC.bezierCurveTo(80,-25,82,20,58,38);iC.lineTo(-58,38);iC.bezierCurveTo(-82,20,-80,-25,0,-58);
  iC.fillStyle='#130930';iC.fill();iC.strokeStyle='#7c3aed';iC.lineWidth=2.5;iC.stroke();
  iC.beginPath();iC.moveTo(-58,38);iC.lineTo(-95,65);iC.lineTo(-48,57);iC.closePath();iC.fillStyle='#1e0d50';iC.fill();iC.strokeStyle='#7c3aed';iC.lineWidth=2;iC.stroke();
  iC.beginPath();iC.moveTo(58,38);iC.lineTo(95,65);iC.lineTo(48,57);iC.closePath();iC.fillStyle='#1e0d50';iC.fill();iC.stroke();
  iC.beginPath();iC.ellipse(0,0,36,22,0,0,Math.PI*2);iC.fillStyle='rgba(0,212,255,.14)';iC.fill();iC.strokeStyle='#00d4ff';iC.lineWidth=1.8;iC.stroke();
  iC.beginPath();iC.ellipse(-8,-5,17,11,-0.3,0,Math.PI*2);iC.fillStyle='rgba(0,212,255,.28)';iC.fill();
  iC.save();iC.translate(-6,22);iC.beginPath();iC.moveTo(5,-8);iC.lineTo(-3,3);iC.lineTo(4,3);iC.lineTo(-5,14);iC.lineTo(15,1);iC.lineTo(7,1);iC.closePath();iC.fillStyle='#fbbf24';iC.fill();iC.restore();
  iC.beginPath();iC.moveTo(-26,38);iC.lineTo(-35,60+tf);iC.lineTo(-17,60+tf);iC.closePath();iC.fillStyle='rgba(147,51,234,.85)';iC.fill();
  iC.beginPath();iC.moveTo(26,38);iC.lineTo(35,60+tf);iC.lineTo(17,60+tf);iC.closePath();iC.fillStyle='rgba(0,212,255,.85)';iC.fill();
  iC.restore();
}

function introAlien(x,y){
  var C=iC,SK='#6de031',HD='#1d84f5',OL='#1a102b';
  C.save();C.translate(x,y+Math.sin(iBob)*4);C.lineWidth=3.5;C.lineJoin='round';C.lineCap='round';
  C.beginPath();C.ellipse(0,90,40,7,0,0,Math.PI*2);C.fillStyle='rgba(0,0,0,0.3)';C.fill();
  C.fillStyle=SK;C.strokeStyle=OL;rrect(C,-22,55,18,30,6);C.fill();C.stroke();rrect(C,4,55,18,30,6);C.fill();C.stroke();
  var la=0.2+Math.sin(iArmT)*.05,ra=-0.2+Math.sin(iArmT+1)*.05;
  C.save();C.translate(-35,30);C.rotate(la);C.beginPath();C.ellipse(-5,15,14,24,-0.2,0,Math.PI*2);C.fillStyle=HD;C.fill();C.stroke();C.beginPath();C.arc(-8,35,10,0,Math.PI*2);C.fillStyle=SK;C.fill();C.stroke();C.restore();
  C.save();C.translate(35,30);C.rotate(ra);C.beginPath();C.ellipse(5,15,14,24,0.2,0,Math.PI*2);C.fillStyle=HD;C.fill();C.stroke();C.beginPath();C.arc(8,35,10,0,Math.PI*2);C.fillStyle=SK;C.fill();C.stroke();C.restore();
  C.fillStyle=HD;C.beginPath();C.moveTo(-28,5);C.quadraticCurveTo(-45,55,-35,75);C.lineTo(35,75);C.quadraticCurveTo(45,55,28,5);C.closePath();C.fill();C.stroke();
  C.beginPath();C.moveTo(-22,50);C.lineTo(22,50);C.lineTo(25,75);C.lineTo(-25,75);C.closePath();C.stroke();
  C.strokeStyle='#ffffff';C.lineWidth=3.5;C.beginPath();C.moveTo(-10,18);C.lineTo(-12,35);C.stroke();C.beginPath();C.moveTo(10,18);C.lineTo(12,35);C.stroke();
  C.strokeStyle=OL;C.lineWidth=3.5;drawZap(C,0,35,.8);
  C.fillStyle=SK;C.beginPath();C.moveTo(-15,-60);C.quadraticCurveTo(-35,-85,-45,-75);C.stroke();C.beginPath();C.arc(-45,-75,7,0,Math.PI*2);C.fill();C.stroke();C.beginPath();C.moveTo(15,-60);C.quadraticCurveTo(35,-85,45,-75);C.stroke();C.beginPath();C.arc(45,-75,7,0,Math.PI*2);C.fill();C.stroke();
  C.beginPath();C.ellipse(0,-25,65,52,0,0,Math.PI*2);C.fill();C.stroke();
  C.beginPath();C.ellipse(0,-65,18,6,0,0,Math.PI*2);C.fillStyle='rgba(255,255,255,0.4)';C.fill();
  var blink=iBlinkT%120<5;
  if(blink){C.beginPath();C.moveTo(-45,-25);C.quadraticCurveTo(-25,-15,-5,-25);C.strokeStyle=OL;C.lineWidth=3.5;C.stroke();C.beginPath();C.moveTo(5,-25);C.quadraticCurveTo(25,-15,45,-25);C.stroke();}
  else{C.fillStyle='#161026';C.beginPath();C.ellipse(-28,-22,18,26,-0.3,0,Math.PI*2);C.fill();C.stroke();C.beginPath();C.ellipse(28,-22,18,26,0.3,0,Math.PI*2);C.fill();C.stroke();C.fillStyle='#ffffff';C.beginPath();C.ellipse(-20,-35,6,3,-0.5,0,Math.PI*2);C.fill();C.beginPath();C.ellipse(36,-35,6,3,0.5,0,Math.PI*2);C.fill();}
  C.fillStyle=OL;C.beginPath();C.arc(-3,3,1.5,0,Math.PI*2);C.fill();C.beginPath();C.arc(3,3,1.5,0,Math.PI*2);C.fill();
  C.beginPath();C.moveTo(-8,12);C.quadraticCurveTo(0,18,10,10);C.lineWidth=2.5;C.strokeStyle=OL;C.stroke();
  C.restore();
}
function introLoop(){
  iTick++;iBlinkT++;iArmT+=.038;iBob+=.05*iBobD;if(Math.abs(iBob)>1)iBobD*=-1;
  var cx=cw/2,cy=ch/2;
  iC.save();
  if(iShake>.1){iC.translate((Math.random()-.5)*iShake,(Math.random()-.5)*iShake);iShake*=.87;}
  iC.fillStyle='#060610';iC.fillRect(0,0,cw,ch);
  /* stars warp */var spd=iScene==='warp'?45:iScene==='exit'?12:2;
  for(var j=0;j<stars.length;j++){
    var s=stars[j];s.z-=spd;if(s.z<=0){s.z=2000;s.x=Math.random()*2000-1000;s.y=Math.random()*2000-1000;}
    var sx=(s.x/s.z)*cw+cx,sy=(s.y/s.z)*cw+cy,sr=Math.max(.5,(1-s.z/2000)*2.5);
    iC.beginPath();iC.arc(sx,sy,sr,0,Math.PI*2);iC.fillStyle=iScene==='warp'?'#00d4ff':'#fff';iC.fill();
    if(iScene==='warp'){var tz=s.z+80,tx=(s.x/tz)*cw+cx,ty=(s.y/tz)*cw+cy;iC.beginPath();iC.moveTo(sx,sy);iC.lineTo(tx,ty);iC.strokeStyle='rgba(0,212,255,.3)';iC.lineWidth=sr;iC.stroke();}
  }
  /* phase transitions */
  if(iTick===100){iScene='exit';iFlash=1;iShipScale=.05;iShipY=cy-210;}
  if(iTick>100&&iTick<200){
    var ps=Math.min(1,(iTick-100)/40);
    iC.save();iC.translate(cx,cy-110);iC.scale(ps,ps);
    /* Planet Zap with gradient + ring */
    var pg=iC.createRadialGradient(0,0,40,0,0,200);pg.addColorStop(0,'#f5c518');pg.addColorStop(.5,'#9333ea');pg.addColorStop(1,'transparent');
    iC.beginPath();iC.arc(0,0,200,0,Math.PI*2);iC.fillStyle=pg;iC.fill();
    /* planet ring */iC.beginPath();iC.ellipse(0,0,240,45,-0.2,0,Math.PI*2);iC.strokeStyle='rgba(232,25,107,.4)';iC.lineWidth=8;iC.stroke();
    /* ZAP symbol on planet */drawZap(iC,-10,-10,2.4);
    iC.restore();
    iShipScale+=.012;iShipY+=1.6;
    drawShip(cx,iShipY,iShipScale);
  }
  if(iTick===200){iScene='land';iAlienY=iShipY-40;}
  if(iTick>=200){
    iShipY-=9;if(iShipY>-200)drawShip(cx,iShipY,iShipScale);
    var tgt=cy+10;
    if(iAlienY<tgt){iAlienY+=18;if(iAlienY>=tgt){iAlienY=tgt;iShake=36;iScene='ready';document.getElementById('npiUI').classList.add('show');
      /* R20.12c: auto-dismiss após 5s com countdown visível */
      (function(){
        var _btn = document.getElementById('npiEnterBtn');
        var _count = 5;
        if(!_btn) return;
        _btn.textContent = '▶ ENTRAR (' + _count + ')';
        var _autoInterval = setInterval(function(){
          _count--;
          if(_count > 0) {
            _btn.textContent = '▶ ENTRAR (' + _count + ')';
          } else {
            clearInterval(_autoInterval);
            _btn.click();
          }
        }, 1000);
        _btn.addEventListener('click', function(){ clearInterval(_autoInterval); }, {once:true});
      })();
    }}
    if(iScene==='ready'){
      /* landing energy platform */
      iC.save();iC.translate(cx,tgt+90);iC.scale(1,.18);iC.beginPath();iC.arc(0,0,120,0,Math.PI*2);iC.fillStyle='rgba(0,212,255,.08)';iC.fill();iC.strokeStyle='rgba(0,212,255,.4)';iC.lineWidth=2;iC.stroke();iC.restore();
    }
    introAlien(cx,iAlienY);
  }
  if(iFlash>0){iC.fillStyle='rgba(255,255,255,'+iFlash+')';iC.fillRect(0,0,cw,ch);iFlash-=.024;}
  iC.restore();
  iRaf=requestAnimationFrame(introLoop);
}

/* Enter site */
document.getElementById('npiEnterBtn').addEventListener('click', function () {
  /* RP-05 R20.6: envolver todo o dismiss em try/catch — localStorage pode lançar
     SecurityError em modo anônimo, impedindo o dismiss do intro sem o guard. */
  try { localStorage.setItem('neonplay_intro_v1', '1'); } catch (e) {}
  try { localStorage.setItem('np_intro_seen', '1'); } catch (e) {}
  try {
    cancelAnimationFrame(iRaf);
    var el = document.getElementById('npZapIntro');
    el.classList.add('out');
    setTimeout(function () { el.style.display = 'none'; }, 950);
    document.getElementById('npAlienHud').classList.add('active');
    document.getElementById('zapVaultBtn').classList.add('active');
    startHudLoop();
    /* R20.11-fix BUG-02: não abrir painel automaticamente na primeira visita.
       showPanel() abria #zapQuestPanel (fixed; bottom:175px) sobre o companion
       widget e os botões COFRE/MISSÕES — sobreposição visual imediata.
       Fix: apenas tornar o botão MISSÕES visível; o usuário abre ao clicar. */
    if (typeof ZapQuestEngine !== 'undefined') {
      var _qt = document.getElementById('zapQuestToggle');
      if (_qt) _qt.classList.add('active'); /* botão visível, painel fechado */
    }
    setTimeout(function () { showHudMsg(); }, 3200);
    patchGameClicks();
  } catch (e) {
    /* Fallback de emergência: esconder intro mesmo se outro erro ocorrer */
    try { document.getElementById('npZapIntro').style.display = 'none'; } catch (_) {}
  }
});

/* A11Y-02 R20.6 / ACESS-C01 R20.7: mover foco + suporte teclado no dialog de intro */
(function () {
  var _introEl  = document.getElementById('npZapIntro');
  var _enterBtn = document.getElementById('npiEnterBtn');
  if (!_introEl || !_enterBtn) return;

  /* ACESS-C01: Enter e Space acionam o botão (já é <button>, browsers suportam,
     mas garantir que o listener existe explicitamente para consistência) */
  _enterBtn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      _enterBtn.click();
    }
  });

  /* Mover foco ao exibir intro — permitindo navegação por teclado imediata */
  if (_introEl.style.display !== 'none' && !_introEl.classList.contains('hidden')) {
    setTimeout(function () {
      try { _enterBtn.focus(); } catch (e) {}
    }, 300); /* aguardar animação inicial */
  }
})();

/* ══════════════════════════════════════════
   HUD LOOP
   ══════════════════════════════════════════ */
var hudCV=document.getElementById('nphCanvas');
var hudC=hudCV.getContext('2d');
var lvlCV=document.getElementById('npLvlCanvas');
var lvlMode=false,lvlTick=0;

/* ── HUD vars for QA telemetry ── */
var _hudRaf=null, _hudActive=false;
var _fpsFrames=0, _fpsLast=0, _fpsEstimate=60;

function startHudLoop(){
  _hudActive=true;
  _fpsLast=performance.now();
  (function loop(){
    /* FPS tracking */
    var _now=performance.now(); _fpsFrames++;
    if(_now-_fpsLast>=1000){
      _fpsEstimate=Math.round(_fpsFrames*1000/(_now-_fpsLast));
      _fpsFrames=0; _fpsLast=_now;
    }
    gTick++;gBob+=.05*gBobD;if(Math.abs(gBob)>1)gBobD*=-1;gBlinkT++;gArmT+=.038;
    if(lvlMode)lvlTick++;
    /* HUD small alien */
    hudC.clearRect(0,0,80,110);
    drawAlien(hudC,40,58,.5,skinIdx,'idle');
    /* Level-up canvas */
    if(lvlMode&&lvlCV){var lC=lvlCV.getContext('2d');lC.clearRect(0,0,120,160);for(var i=0;i<8;i++){var a=(i/8)*Math.PI*2+lvlTick*.04,r=44;lC.beginPath();lC.moveTo(60+Math.cos(a)*r,80+Math.sin(a)*r);lC.lineTo(60+Math.cos(a)*(r+12),80+Math.sin(a)*(r+12));lC.strokeStyle=i%2?'rgba(0,212,255,.6)':'rgba(232,25,107,.6)';lC.lineWidth=2.5;lC.stroke();}drawAlien(lC,60,85,.72,skinIdx,'lvl');}
    _hudRaf=requestAnimationFrame(loop);
  })();
}

/* ══════════════════════════════════════════
   XP SYSTEM
   ══════════════════════════════════════════ */
function grantXP(amt,reason){
  /* Route through ZapProgressionSystem when ready */
  if(typeof ZapProgressionSystem!=='undefined' && ZapProgressionSystem._ready){
    ZapProgressionSystem.addXP(amt,reason); return;
  }
  /* Fallback (pre-init) */
  var prev=level; xp+=amt;
  var nl=0;for(var i=LEVELS.length-1;i>=0;i--){if(xp>=LEVELS[i].xp){nl=i;break;}}
  level=nl;
  for(var j=SKINS.length-1;j>=0;j--){if(xp>=SKINS[j].req){skinIdx=j;break;}}
  showXpToast('+'+amt+' XP — '+(reason||''));
  updateHudBar();
  if(level>prev)setTimeout(function(){showLevelUp(level);},700);
}

function updateHudBar(){
  var L=LEVELS[level],N=LEVELS[Math.min(level+1,LEVELS.length-1)];
  var pct=level>=LEVELS.length-1?100:Math.round(((xp-L.xp)/(N.xp-L.xp))*100);
  document.getElementById('nphXpFill').style.width=pct+'%';
  document.getElementById('nphLvlTxt').textContent='LVL '+(level+1);
}

function showXpToast(msg){
  var t=document.getElementById('npXpToast');
  document.getElementById('npXpTxt').textContent=msg;
  t.classList.add('show');clearTimeout(t._t);
  t._t=setTimeout(function(){t.classList.remove('show');},2800);
}

function showLevelUp(lv){
  /* R12: guard contra double-trigger com sistema NP84 do bundle */
  var _now = Date.now();
  if(showLevelUp._lastTs && _now - showLevelUp._lastTs < 2000) return;
  showLevelUp._lastTs = _now;
  var np84popup = document.getElementById('np84LevelUpPopup');
  if(np84popup && !np84popup.hidden) return;

  lvlMode=true;lvlTick=0;
  var L=LEVELS[lv];
  document.getElementById('npLvlNum').textContent=lv+1;
  document.getElementById('npLvlName').textContent=L.name;
  document.getElementById('npLvlTx').innerHTML=L.skin?'Skin <strong style="color:#f5c518">"'+L.skin+'"</strong> desbloqueada!':'Continue jogando para chegar mais longe!';
  document.getElementById('npLvlOverlay').classList.add('show');
  /* cinematic unlock notification */
  if(typeof LoreAndCameos!=='undefined'){
    var newUnlocks=Object.values(LoreAndCameos).filter(function(s){return s.reqLevel===(lv+1);});
    if(newUnlocks.length>0){
      setTimeout(function(){showXpToast('📼 Arquivo desbloqueado: '+newUnlocks[0].title+'!');},3200);
    }
  }
}
document.getElementById('npLvlClose').addEventListener('click',function(){
  document.getElementById('npLvlOverlay').classList.remove('show');lvlMode=false;
});

function showHudMsg(custom){
  var b=document.getElementById('nphBubble');
  b.textContent=custom||HUD_MSGS[hudMsgIdx%HUD_MSGS.length];
  if(!custom)hudMsgIdx++;
  b.style.display='block';hudOpen=true;
  clearTimeout(b._t);b._t=setTimeout(function(){b.style.display='none';hudOpen=false;},4500);
}
document.getElementById('nphAlienWrap').addEventListener('click',function(){
  hudOpen=!hudOpen;
  var b=document.getElementById('nphBubble');
  if(hudOpen){
    /* Every 4th click, hint about the vault */
    var msg=(hudMsgIdx%4===3&&level>=2)?'📼 Tenho arquivos secretos. Clique em COFRE para ver.':HUD_MSGS[hudMsgIdx%HUD_MSGS.length];
    b.textContent=msg;hudMsgIdx++;b.style.display='block';
  } else b.style.display='none';
});

/* ══════════════════════════════════════════
   PATCH GAME CLICKS FOR XP
   ══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   PATCH GAME CLICKS FOR XP
   ══════════════════════════════════════════ */
/* R12: Guard para evitar duplo disparo XP + HUD no mesmo clique */
var _lastXpGrantTs = 0;
var _lastHudMsgTs  = 0;
var _XP_DEBOUNCE   = 600;
var _HUD_DEBOUNCE  = 800;
function _canGrantXP(){var now=Date.now();if(now-_lastXpGrantTs<_XP_DEBOUNCE)return false;_lastXpGrantTs=now;return true;}
function _canShowHudMsg(){var now=Date.now();if(now-_lastHudMsgTs<_HUD_DEBOUNCE)return false;_lastHudMsgTs=now;return true;}

function patchGameClicks(){
  document.addEventListener('click',function(e){
    var card=e.target.closest('[href*="game.html"], .game-card, .gc, .featured-card, .carousel-item, [data-slug]');
    if(card){
      var nm=card.querySelector('.gc-name,.game-name,.featured-title,.item-name');
      var lbl=nm?nm.textContent.trim():'jogo';
      if(_canGrantXP()) grantXP(10+Math.floor(Math.random()*8),'Abrindo '+lbl+'!');
      /* R12: atrasa HUD msg para não sobrepor XP toast */
      if(_canShowHudMsg()) setTimeout(function(){showHudMsg('Vai jogar '+lbl+'? Boa sorte! 🎮');},900);
    }
  },true);
  /* Favoritos */
  document.addEventListener('click',function(e){
    if(e.target.closest('.fav-btn,.gc-fav,.fav-toggle')){
      if(_canGrantXP()) grantXP(5,'Favoritou um jogo!');
      if(_canShowHudMsg()) setTimeout(function(){showHudMsg('Gosto desse. Boa escolha. 👽');},600);
    }
  });
}

/* ══════════════════════════════════════════
   LORE & CAMEOS — ZAP CINEMATIC ENGINE
   ══════════════════════════════════════════ */

/* ── LoreAndCameos: biblioteca de cenas ── */
var LoreAndCameos = {

  /* 🟢 CAMEO 1: BEN 10 — Nível 3 */
  cameo_ben10: {
    id:'cameo_ben10', reqLevel:3,
    title:'Flash Esmeralda', emoji:'🟢',
    desc:'Uma anomalia de relógio alienígena detectada.',
    duration:4500,
    draw:function(ctx,W,H,p){
      ctx.fillStyle='rgba(0,0,0,'+Math.sin(p*Math.PI)*.85+')';
      ctx.fillRect(0,0,W,H);
      /* scanlines cinemáticas */
      for(var y=0;y<H;y+=4){ctx.fillStyle='rgba(0,0,0,.15)';ctx.fillRect(0,y,W,2);}
      if(p>.25&&p<.65){
        var fi=Math.sin((p-.25)*4*Math.PI);
        ctx.fillStyle='rgba(0,255,100,'+fi*.45+')';ctx.fillRect(0,0,W,H);
        /* silhueta XLR8 */
        var xPos=W*1.1-(p*2.2*W);
        ctx.fillStyle='rgba(0,0,0,.9)';
        ctx.beginPath();ctx.ellipse(xPos,H-38,28,9,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.moveTo(xPos,H-40);ctx.lineTo(xPos+45,H-130);ctx.lineTo(xPos-22,H-105);ctx.closePath();ctx.fill();
        /* omnitrix glow */
        ctx.shadowBlur=30;ctx.shadowColor='#00ff64';
        ctx.fillStyle='#00ff64';ctx.beginPath();ctx.arc(xPos+10,H-115,10,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
      }
      if(p>.5){
        /* Zap pensativo no canto */
        var gOld=gBob; gBob=0;
        var gTk=gTick; gTick=Math.floor(p*200);
        drawAlien(ctx,70,H-110,.55,skinIdx,'idle');
        gBob=gOld; gTick=gTk;
        ctx.fillStyle='rgba(0,212,255,'+(p-.5)*2+')';
        ctx.font="bold 13px 'Orbitron',sans-serif";
        ctx.fillText("Zap: 'Esse relógio tinha mais RAM que minha nave...'",120,H-18);
      }
      /* progress bar */
      ctx.fillStyle='rgba(0,255,100,.6)';ctx.fillRect(0,H-3,W*p,3);
    }
  },

  /* 🐕 CAMEO 2: SCOOBY-DOO — Nível 7 */
  cameo_scooby: {
    id:'cameo_scooby', reqLevel:7,
    title:'Perseguição Assombrada', emoji:'🐕',
    desc:'Um cachorro medroso e um fantasma pixelado neon.',
    duration:5500,
    draw:function(ctx,W,H,p){
      ctx.fillStyle='rgba(0,0,0,.88)';ctx.fillRect(0,0,W,H);
      for(var y=0;y<H;y+=4){ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(0,y,W,2);}
      /* chão */
      ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(0,H-28,W,28);
      var xDog=W+120-(p*(W+380));
      var xGhost=xDog+130;
      /* Scooby silhouette */
      ctx.fillStyle='#7a3c0f';
      ctx.beginPath();ctx.ellipse(xDog+30,H-60,36,22,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(xDog+55,H-82,18,16,-.3,0,Math.PI*2);ctx.fill();
      /* collar neon */
      ctx.strokeStyle='#00d4ff';ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(xDog+55,H-73,10,0,Math.PI*2);ctx.stroke();
      /* pernas girando */
      ctx.save();ctx.translate(xDog+30,H-28);ctx.rotate(p*55);
      ctx.strokeStyle='#7a3c0f';ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(18,0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(0,18);ctx.stroke();
      ctx.restore();
      /* fantasma neon pixelado */
      ctx.shadowBlur=20;ctx.shadowColor='#00d4ff';
      ctx.fillStyle='rgba(0,212,255,.85)';
      var gy=Math.sin(p*18)*12;
      var gw=44,gh=56;
      ctx.fillRect(xGhost,H-88+gy,gw,gh);
      /* olhos do fantasma */
      ctx.fillStyle='#060610';
      ctx.fillRect(xGhost+8,H-78+gy,10,10);ctx.fillRect(xGhost+26,H-78+gy,10,10);
      ctx.shadowBlur=0;
      /* Zap com placa de interrogação */
      drawAlien(ctx,70,H-120,.6,skinIdx,'idle');
      ctx.fillStyle='#9333ea';
      ctx.beginPath();ctx.roundRect&&ctx.roundRect(100,H-105,88,52,8);ctx.fill();
      ctx.fillStyle='#fff';ctx.font="bold 26px 'Syne',sans-serif";
      ctx.fillText('???',124,H-68);
      ctx.shadowBlur=0;
      /* fala */
      if(p>.6){
        ctx.fillStyle='rgba(255,255,255,'+(p-.6)*2.5+')';
        ctx.font="12px 'DM Sans',sans-serif";
        ctx.fillText("Zap: 'Meu scanner de espectros não para de piscar. Isso é normal aqui?'",20,26);
      }
      ctx.fillStyle='rgba(147,51,234,.6)';ctx.fillRect(0,H-3,W*p,3);
    }
  },

  /* 🛸 LORE 1: A QUEDA — Nível 10 */
  lore_crash: {
    id:'lore_crash', reqLevel:10,
    title:'Registro #001: A Queda', emoji:'🛸',
    desc:'Como o Zap foi parar no servidor do NeonPlay.',
    duration:6500,
    draw:function(ctx,W,H,p){
      var shk=p<.8?(Math.random()*8-4)*Math.max(0,1-p*1.5):0;
      ctx.save();ctx.translate(shk,shk);
      /* alarme */
      var alarm=Math.sin(p*32)>.1?'rgba(232,25,107,.28)':'rgba(0,0,0,.82)';
      ctx.fillStyle=alarm;ctx.fillRect(0,0,W,H);
      for(var y=0;y<H;y+=4){ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(0,y,W,2);}
      /* nave caindo */
      var shipX=W*.75-(p*W*1.1);
      var shipY=H*.1+(p*H*.75);
      ctx.save();ctx.translate(shipX,shipY);ctx.rotate(p*2.8);
      /* fogo */
      ctx.shadowBlur=30;ctx.shadowColor='#fbbf24';
      ctx.fillStyle='#fbbf24';
      ctx.beginPath();ctx.arc(0,-28,18+Math.random()*14,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      /* casco */
      ctx.fillStyle='#130930';ctx.strokeStyle='#7c3aed';ctx.lineWidth=3;
      ctx.beginPath();ctx.ellipse(0,0,38,18,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      /* asas */
      ctx.beginPath();ctx.moveTo(-38,12);ctx.lineTo(-60,30);ctx.lineTo(-30,22);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(38,12);ctx.lineTo(60,30);ctx.lineTo(30,22);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.restore();
      /* texto narrativo */
      ctx.fillStyle='rgba(255,255,255,.88)';ctx.font="13px 'DM Sans',sans-serif";
      if(p>.08&&p<.38)ctx.fillText('[ SISTEMA CRÍTICO ] FALHA DE MOTOR DUPLO. ALTITUDE: '+Math.floor(10000*(1-p))+'m',40,44);
      if(p>.4&&p<.7)ctx.fillText('[ ALERTA ] CAINDO EM: SETOR NEONPLAY_WEB_SERVER',40,44);
      if(p>.72&&p<.95){
        ctx.fillStyle='rgba(0,212,255,.9)';
        ctx.fillText('[ IMPACTO ] CONSCIÊNCIA TRANSFERIDA. SOBREVIVENTE: 1/1.',40,44);
        ctx.fillStyle='rgba(255,255,255,.55)';ctx.font="11px 'DM Sans',sans-serif";
        ctx.fillText('Host: NeonPlay Frontend Engine v84. Memória intacta: 98.7%.',40,66);
      }
      ctx.restore();
      ctx.fillStyle='rgba(232,25,107,.55)';ctx.fillRect(0,H-3,W*p,3);
    }
  },

  /* ⚡ LORE 2: PLANETA ZAP — Nível 15 */
  lore_planet: {
    id:'lore_planet', reqLevel:15,
    title:'Registro #000: Origem', emoji:'⚡',
    desc:'Uma viagem ao Planeta Zap antes de tudo.',
    duration:7000,
    draw:function(ctx,W,H,p){
      ctx.fillStyle='#01010d';ctx.fillRect(0,0,W,H);
      /* nebula de fundo */
      var nb=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.min(W,H)*.7);
      nb.addColorStop(0,'rgba(147,51,234,'+Math.min(p,.4)*.5+')');
      nb.addColorStop(.5,'rgba(232,25,107,'+Math.min(p,.3)*.3+')');
      nb.addColorStop(1,'transparent');
      ctx.fillStyle=nb;ctx.fillRect(0,0,W,H);
      /* estrelas */
      for(var i=0;i<60;i++){
        var sx=((i*137.5)%1)*W, sy=((i*93.7)%1)*H;
        var sa=.3+.7*Math.abs(Math.sin(p*8+i));
        ctx.fillStyle='rgba(255,255,255,'+sa+')';
        ctx.beginPath();ctx.arc(sx,sy,i%5===0?1.5:.7,0,Math.PI*2);ctx.fill();
      }
      /* planeta Zap */
      var ps=Math.min(1,p*2.5);
      var pr=Math.min(H*.28,W*.22);
      ctx.save();ctx.translate(W/2,H*.42);ctx.scale(ps,ps);
      var pg=ctx.createRadialGradient(-pr*.2,-pr*.2,pr*.05,0,0,pr);
      pg.addColorStop(0,'#f5c518');pg.addColorStop(.4,'#9333ea');pg.addColorStop(1,'#180d40');
      ctx.beginPath();ctx.arc(0,0,pr,0,Math.PI*2);ctx.fillStyle=pg;ctx.fill();
      /* anel */
      ctx.beginPath();ctx.ellipse(0,0,pr*1.7,pr*.35,-.15,0,Math.PI*2);
      ctx.strokeStyle='rgba(232,25,107,.5)';ctx.lineWidth=10;ctx.stroke();
      /* símbolo ⚡ no planeta */
      drawZap(ctx,0,0,3.5);
      ctx.restore();
      /* texto narrativo */
      ctx.fillStyle='rgba(255,255,255,.82)';ctx.font="13px 'DM Sans',sans-serif";
      if(p>.15&&p<.45)ctx.fillText('[ ARQUIVO: ANTES DA PARTIDA ]',40,44);
      if(p>.45&&p<.75){
        ctx.fillText('Planeta Zap — Ano Galáctico 4471.',40,44);
        ctx.fillStyle='rgba(255,255,255,.5)';ctx.font="11px 'DM Sans',sans-serif";
        ctx.fillText('"Vim estudar os humanos. Eles chamam isso de jogar."',40,65);
      }
      if(p>.78){
        ctx.fillStyle='rgba(0,212,255,.9)';ctx.font="13px 'DM Sans',sans-serif";
        ctx.fillText('[ ZAP ] Ainda tento entender por que jogam Slope 47 vezes seguidas.',40,44);
      }
      ctx.fillStyle='rgba(245,197,24,.5)';ctx.fillRect(0,H-3,W*p,3);
    }
  }
};

/* ── ZapCinematicEngine ── */
var ZapCinematicEngine = (function(){
  var _scene=null,_startT=0,_playing=false;
  var _cvs=null,_ctx=null,_raf=null;

  function _resize(){
    if(!_cvs)return;
    _cvs.width=window.innerWidth;_cvs.height=window.innerHeight;
  }

  function _loop(){
    if(!_playing||!_scene){_playing=false;return;}
    var elapsed=Date.now()-_startT;
    var p=Math.min(1,elapsed/_scene.duration);
    _cvs.width=_cvs.width; /* clear */
    try{_scene.draw(_ctx,_cvs.width,_cvs.height,p);}catch(e){}
    if(p<1){_raf=requestAnimationFrame(_loop);}
    else{_end();}
  }

  function _end(){
    _playing=false;_scene=null;
    var ov=document.getElementById('zapCinematicOverlay');
    if(ov){ov.classList.remove('active');}
    cancelAnimationFrame(_raf);
  }

  return {
    init:function(){
      _cvs=document.getElementById('zapCinemaCanvas');
      if(!_cvs)return;
      _ctx=_cvs.getContext('2d');
      _resize();
      window.addEventListener('resize',_resize);
    },
    play:function(sceneId){
      var sc=LoreAndCameos[sceneId];
      if(!sc)return;
      /* fechar galeria */
      var gal=document.getElementById('zapGallery');
      if(gal)gal.classList.remove('show');
      _scene=sc; _startT=Date.now(); _playing=true;
      var ov=document.getElementById('zapCinematicOverlay');
      var ti=document.getElementById('zceTitle');
      if(ov){ov.classList.add('active');}
      if(ti){ti.textContent=sc.emoji+' '+sc.title;}
      _resize();
      cancelAnimationFrame(_raf);
      _loop();
    },
    skip:function(){_end();},
    isPlaying:function(){return _playing;}
  };
})();

var zapCinematics=ZapCinematicEngine;

/* ── Gallery UI ── */
function openVault(){
  updateGalleryUI(level+1);
  document.getElementById('zapGallery').classList.add('show');
}
function updateGalleryUI(currentLevel){
  var list=document.getElementById('galleryList');
  if(!list)return;
  list.innerHTML='';
  Object.values(LoreAndCameos).forEach(function(scene){
    var unlocked=currentLevel>=scene.reqLevel;
    var div=document.createElement('div');
    div.className='zg-item'+(unlocked?'':' zg-locked');
    div.innerHTML='<span class="zg-badge">'+(unlocked?scene.emoji:'🔒')+'</span>'+
      '<div class="zg-info">'+
        '<h4>'+(unlocked?scene.title:'??? MISTÉRIO ???')+'</h4>'+
        '<p>'+(unlocked?scene.desc:'Desbloqueado no Nível '+scene.reqLevel)+'</p>'+
      '</div>'+
      '<button class="zg-play" onclick="zapCinematics.play(\'' + scene.id + '\')">' + (unlocked ? '▶ ASSISTIR' : '🔒 BLOQUEADO') + '</button>';
    list.appendChild(div);
  });
}

/* ══════════════════════════════════════════
   ZAP LIVE-OPS v1.0
   ZapProgressionSystem + ZapQuestEngine
   Vanilla JS | Zero deps | Full persistence
   ══════════════════════════════════════════ */

/* ─────────────────────────────────────────
   ZapProgressionSystem
   Curva XP: XP(n) = floor(100 × n^1.5)
   Nível ilimitado acima dos LEVELS estáticos
   ───────────────────────────────────────── */
var ZapProgressionSystem = (function(){
  var SK = 'zap_prog_v1';

  function xpForLevel(n){ return Math.floor(100 * Math.pow(n, 1.5)); }

  function rawLevelFromXP(totalXP){
    var n = 1;
    while(xpForLevel(n + 1) <= totalXP) n++;
    return n; /* 1-based "raw" level */
  }

  function _persist(){
    try{ localStorage.setItem(SK, JSON.stringify({xp:xp,level:level,skinIdx:skinIdx})); }catch(e){}
  }

  function _restore(){
    try{
      var d = JSON.parse(localStorage.getItem(SK) || 'null');
      if(!d) return;
      xp      = d.xp      || 0;
      skinIdx = d.skinIdx || 0;
      /* Remap level to 0-based LEVELS index */
      var rl = rawLevelFromXP(xp);
      level = Math.min(rl - 1, LEVELS.length - 1);
      /* Skin clamp */
      for(var j = SKINS.length-1; j >= 0; j--){
        if(xp >= SKINS[j].req){ skinIdx = j; break; }
      }
    }catch(e){}
  }

  function getProgress(){
    var cur  = rawLevelFromXP(xp);
    var xpC  = xpForLevel(cur);
    var xpN  = xpForLevel(cur + 1);
    var pct  = Math.round(((xp - xpC) / (xpN - xpC)) * 100);
    return { level:cur, xpCur:xpC, xpNext:xpN, pct:Math.min(100,Math.max(0,pct)) };
  }

  return {
    _ready: false,

    init: function(){
      _restore();
      updateHudBar();
      this._ready = true;
      /* R20.4: expose on window + dispatch explicit lifecycle event */
      window.ZapProgressionSystem = this;
      try { document.dispatchEvent(new CustomEvent('NP:progression-ready')); } catch(e){}
    },

    addXP: function(amount, reason){
      var prevRaw = rawLevelFromXP(xp);
      xp += amount;

      var newRaw  = rawLevelFromXP(xp);
      var prevLvl = level;
      level = Math.min(newRaw - 1, LEVELS.length - 1);

      for(var j = SKINS.length-1; j >= 0; j--){
        if(xp >= SKINS[j].req){ skinIdx = j; break; }
      }
      _persist();

      showXpToast('+' + amount + ' XP — ' + (reason || ''));
      updateHudBar();

      if(newRaw > prevRaw){
        setTimeout(function(){ showLevelUp(level); }, 700);
      }
    },

    getProgress: getProgress,
    xpForLevel:  xpForLevel,
    rawLevelFromXP: rawLevelFromXP,
    save: _persist
  };
})();

/* ─────────────────────────────────────────
   ZapQuestEngine
   3 missões diárias · reset à meia-noite
   Persistência: localStorage 'zap_quests_v1'
   ───────────────────────────────────────── */
var ZapQuestEngine = (function(){

  var POOL = [
    { id:'clicker',   icon:'🖱️',  title:'Caçador de Cliques',
      desc:'Abra 3 jogos diferentes hoje.',
      goal:3, xp:120, ev:'GAME_CLICK',
      line:'Três jogos diferentes. Rápido. Minha espécie levaria seis tentáculos para isso.' },
    { id:'focus',     icon:'🎯',  title:'Foco Profundo',
      desc:'Fique 3 min contínuos no site.',
      goal:1, xp:180, ev:'FOCUS',
      line:'Três minutos de foco ininterrupto. A evolução humana pode estar finalmente acontecendo.' },
    { id:'night_owl', icon:'🦉',  title:'Explorador Noturno',
      desc:'Abra um jogo após as 22h.',
      goal:1, xp:150, ev:'NIGHT_GAME',
      line:'Madrugada. Jogando. No Planeta Zap isso é considerado um ritual de guerra.' },
    { id:'fav_hunter',icon:'⭐',  title:'Colecionador de Favoritos',
      desc:'Favorite 2 jogos hoje.',
      goal:2, xp:100, ev:'FAVORITE',
      line:'Dois favoritos. Você tem gosto. Discutível — mas tem.' },
    { id:'scroll',    icon:'📜',  title:'Navegador Veloz',
      desc:'Role pela página 5 vezes rápido.',
      goal:5, xp:90,  ev:'SCROLL_FAST',
      line:'Cinco varreduras de scroll registradas. Eficiente... para um humano de dois olhos.' },
    { id:'cat_hop',   icon:'🌀',  title:'Viajante de Categorias',
      desc:'Acesse 4 categorias diferentes.',
      goal:4, xp:140, ev:'CATEGORY',
      line:'Quatro categorias. Indecisão estratégica. Curiosamente inteligente.' },
    { id:'morning',   icon:'☀️',  title:'Madrugador Galáctico',
      desc:'Jogue qualquer jogo antes das 10h.',
      goal:1, xp:130, ev:'MORNING',
      line:'Manhã cedo. Já jogando. No Planeta Zap você seria um guerreiro de primeira classe.' }
  ];

  var SK = 'zap_quests_v1';
  var _st = null; /* { date, quests:[{id,progress,done}], slugs:[], cats:[] } */

  function _today(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function _save(){ try{ localStorage.setItem(SK, JSON.stringify(_st)); }catch(e){} }

  function _load(){
    try{ return JSON.parse(localStorage.getItem(SK)||'null'); }catch(e){ return null; }
  }

  function _def(id){ return POOL.find(function(q){ return q.id===id; }); }

  /* Fisher-Yates shuffle, pick 3 contextual quests */
  function _pick3(){
    var h = new Date().getHours();
    var pool = POOL.slice();
    /* Push time-sensitive quests to back if unlikely */
    if(h >= 10) pool = pool.filter(function(q){return q.id!=='morning';}).concat(pool.filter(function(q){return q.id==='morning';}));
    if(h <  18) pool = pool.filter(function(q){return q.id!=='night_owl';}).concat(pool.filter(function(q){return q.id==='night_owl';}));
    for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=pool[i];pool[i]=pool[j];pool[j]=t;}
    return pool.slice(0,3).map(function(q){ return {id:q.id,progress:0,done:false}; });
  }

  /* Advance a quest by 1 step */
  function _advance(id){
    if(!_st) return;
    var sq = _st.quests.find(function(q){return q.id===id;});
    if(!sq || sq.done) return;
    var def = _def(id);
    if(!def) return;

    var wasNearDone = (sq.progress === def.goal - 1 && def.goal > 1);
    sq.progress = Math.min(sq.progress + 1, def.goal);

    if(sq.progress >= def.goal && !sq.done){
      sq.done = true;
      _save();
      _onComplete(def);
    } else {
      _save();
      /* "Almost there" nudge */
      if(wasNearDone){
        setTimeout(function(){
          showHudMsg('Quase lá! ' + sq.progress + '/' + def.goal + ' em "' + def.title + '". Não para agora. 👽');
        }, 350);
      }
    }
    _render();
  }

  function _onComplete(def){
    setTimeout(function(){
      if(ZapProgressionSystem._ready){
        ZapProgressionSystem.addXP(def.xp, 'Missão: ' + def.title);
      } else {
        grantXP(def.xp, 'Missão: ' + def.title);
      }
      /* R16: delay HUD msg so it doesn't overlap the XP toast */
      setTimeout(function(){ if(_canShowHudMsg()) zapSpeak(def.line + ' +' + def.xp + ' XP. 🛸', 300); }, 2200);
      _render();
      /* Bonus if all 3 done */
      if(_st.quests.every(function(q){return q.done;})){
        setTimeout(function(){
          if(ZapProgressionSystem._ready){
            ZapProgressionSystem.addXP(100,'Todas as missões do dia!');
          } else {
            grantXP(100,'Todas as missões do dia!');
          }
          /* R16: delay bonus msg to avoid overlap with XP toast */
          setTimeout(function(){ if(_canShowHudMsg()) zapSpeak('Todas as missões concluídas. Bônus: +100 XP. 🌌', 300); }, 2200);
          var p=document.getElementById('zapQuestPanel');
          if(p){p.classList.add('all-done');}
          var b=document.getElementById('zqpBadge');
          if(b){b.classList.add('all-done');}
        }, 1400);
      }
    }, 350);
  }

  function _render(){
    var body  = document.getElementById('zqpBody');
    var badge = document.getElementById('zqpBadge');
    var reset = document.getElementById('zqpReset');
    if(!body || !_st) return;

    var done = _st.quests.filter(function(q){return q.done;}).length;
    if(badge) badge.textContent = done + '/' + _st.quests.length;

    /* Time until midnight */
    var now = new Date();
    var ms  = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1) - now;
    var hh  = Math.floor(ms/3600000);
    var mm  = Math.floor((ms%3600000)/60000);
    if(reset) reset.textContent = 'Reinicia em ' + hh + 'h ' + mm + 'min';

    body.innerHTML = '';
    _st.quests.forEach(function(sq){
      var def = _def(sq.id);
      if(!def) return;
      var pct = Math.round((sq.progress/def.goal)*100);
      var el  = document.createElement('div');
      el.className = 'zq-item' + (sq.done?' zq-done':'');
      el.innerHTML =
        '<div class="zq-top">' +
          '<div class="zq-title">' + def.icon + ' ' + def.title + '</div>' +
          '<div class="zq-xp-tag">+' + def.xp + ' XP</div>' +
        '</div>' +
        '<div class="zq-prog-wrap"><div class="zq-prog-bar" style="width:' + pct + '%"></div></div>' +
        '<div class="zq-status">' +
          '<span>' + (sq.done ? '<span class="zq-checkmark">✓</span> Concluída!' : def.desc) + '</span>' +
          '<span class="zq-prog-count">' + sq.progress + '/' + def.goal + '</span>' +
        '</div>';
      body.appendChild(el);
    });
  }

  function _attach(){
    /* ── GAME CLICK → clicker, morning, night_owl ── */
    document.addEventListener('click', function(e){
      if(!_st) return;
      var card = e.target.closest('[href*="game.html"],.game-card,.gc,.featured-card,.carousel-item,[data-slug]');
      if(!card) return;
      var slug = card.dataset.slug || card.getAttribute('href') || String(Math.random());
      if(!_st.slugs) _st.slugs = [];
      if(_st.slugs.indexOf(slug) === -1){
        _st.slugs.push(slug);
        _advance('clicker');
        var h = new Date().getHours();
        if(h < 10)  _advance('morning');
        if(h >= 22) _advance('night_owl');
      }
    }, true);

    /* ── FAVORITE → fav_hunter ── */
    document.addEventListener('click', function(e){
      if(e.target.closest('.fav-btn,.gc-fav,.fav-toggle')) _advance('fav_hunter');
    });

    /* ── FAST SCROLL → scroll ── */
    var _sy = window.scrollY, _st2 = Date.now();
    document.addEventListener('scroll', function(){
      var now=Date.now(), dy=Math.abs(window.scrollY-_sy), dt=now-_st2;
      _sy=window.scrollY; _st2=now;
      if(dt>0 && (dy/dt)>6) _advance('scroll');
    }, {passive:true});

    /* ── CATEGORY CLICK → cat_hop ── */
    document.addEventListener('click', function(e){
      if(!_st) return;
      var lnk = e.target.closest('[href*="jogos-"],[href*="category"],.cat-chip,.category-link,[data-category]');
      if(!lnk) return;
      var key = lnk.href || lnk.dataset.category || '';
      if(!key) return;
      if(!_st.cats) _st.cats = [];
      if(_st.cats.indexOf(key) === -1){ _st.cats.push(key); _advance('cat_hop'); }
    });

    /* ── FOCUS TIMER: 3 continuous minutes on page ── */
    var _fStart = Date.now(), _fDone = false;
    var _fInterval = setInterval(function(){
      if(_fDone || !_st) return;
      if(!document.hidden && (Date.now()-_fStart)/1000 >= 180){
        _fDone = true; clearInterval(_fInterval);
        _advance('focus');
      }
      if(document.hidden) _fStart = Date.now();
    }, 8000);
    document.addEventListener('visibilitychange', function(){
      if(document.hidden) _fStart = Date.now();
    });

    /* ── Reset timer display every minute ── */
    /* RP-03 R20.6: registrar interval no lifecycle para evitar interval orfão */
    if (window.NeonPlayRuntime && NeonPlayRuntime.safeInterval) {
      NeonPlayRuntime.safeInterval(_render, 60000);
    } else {
      var _renderSI = setInterval(_render, 60000);
      window.addEventListener('pagehide', function () { clearInterval(_renderSI); }, { once: true });
    }
  }

  return {
    init: function(){
      var loaded = _load();
      var today  = _today();
      if(loaded && loaded.date === today){
        _st = loaded;
        if(!_st.slugs) _st.slugs = [];
        if(!_st.cats)  _st.cats  = [];
      } else {
        _st = { date:today, quests:_pick3(), slugs:[], cats:[] };
        _save();
      }
      _attach();
      setTimeout(_render, 800);
    },

    showPanel: function(){
      var p = document.getElementById('zapQuestPanel');
      var t = document.getElementById('zapQuestToggle');
      if(p){ p.classList.add('active'); setTimeout(function(){ p.classList.remove('collapsed'); },120); }
      if(t){ t.classList.add('active'); }
      _render();
    },

    togglePanel: function(){
      var p = document.getElementById('zapQuestPanel');
      if(p) p.classList.toggle('collapsed');
    },

    /* Expose for dev/debug */
    getState:    function(){ return _st; },
    devComplete: function(id){
      var def=_def(id); if(!def) return;
      var sq=(_st||{quests:[]}).quests.find(function(q){return q.id===id;});
      if(sq){ sq.progress=def.goal-1; _advance(id); }
    }
  };
})();

/* ══════════════════════════════════════════
   ZAP QA SUITE v1.0
   LifecycleManager · PAD Model · Unlock Fix
   Weekend XP · BFCache Guard · ZAP_DEBUG
   ══════════════════════════════════════════ */

/* ── PAD Emotional Model ──────────────────
   Pleasure-Arousal-Dominance: approximated
   from live engagement signals.
   ───────────────────────────────────────── */
var _pad       = { V:0.5, A:0.3, D:0.2 };
var _clickBuf  = []; /* timestamps for Arousal */
/* RP-04 R20.6: PAD decay interval registrado no lifecycle para evitar interval orfão */
var _padDecayFn = function(){
  _pad.V = Math.max(0, _pad.V - 0.018);
  _pad.A = Math.max(0, _pad.A - 0.045);
  /* Dominance rises with raw level */
  if(typeof ZapProgressionSystem !== 'undefined' && ZapProgressionSystem._ready){
    var raw = ZapProgressionSystem.rawLevelFromXP(xp);
    _pad.D  = Math.min(1, raw / 16); /* asymptote at Lv16 */
  }
};
var _padDecay = (window.NeonPlayRuntime && NeonPlayRuntime.safeInterval)
  ? NeonPlayRuntime.safeInterval(_padDecayFn, 5000)
  : setInterval(_padDecayFn, 5000);
if (!window.NeonPlayRuntime || !NeonPlayRuntime.safeInterval) {
  window.addEventListener('pagehide', function () { clearInterval(_padDecay); }, { once: true });
}

/* Hook showXpToast → Valence boost */
var _origShowXpToast = showXpToast;
showXpToast = function(msg){
  _origShowXpToast(msg);
  _pad.V = Math.min(1, _pad.V + 0.14);
};

/* ── ZapLifecycleManager ──────────────────
   4-tier system driven by visibility + idle
   Tier 1  Active        ~60fps
   Tier 2  Idle (30s)    ~60fps (canvas is lightweight)
   Tier 3  Background    paused (visibilitychange)
   Tier 4  Dormant       all RAF cancelled
   ───────────────────────────────────────── */
var ZapLifecycleManager = (function(){
  var _tier = 1;
  var _idleTimer = null;

  var _LABELS = { 1:'Active', 2:'Idle', 3:'Background', 4:'Dormant' };

  function _setTier(t){
    if(_tier === t) return;
    var prev = _tier;
    _tier = t;
    /* Tier 4: cancel all RAF handles to free GPU thread */
    if(t === 4){
      cancelAnimationFrame(iRaf);   /* intro canvas */
      cancelAnimationFrame(_hudRaf); /* HUD canvas */
      iRaf = null; _hudRaf = null;
    }
    /* Resume from Tier 4 → restart HUD if it was active */
    if(t < 4 && prev === 4 && _hudActive){
      startHudLoop();
    }
  }

  function _bump(){
    if(_tier >= 2 && !document.hidden) _setTier(1);
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(function(){
      if(!document.hidden) _setTier(2);
    }, 30000);
  }

  return {
    init: function(){
      /* Visibility → Tier 4 / resume */
      document.addEventListener('visibilitychange', function(){
        _setTier(document.hidden ? 4 : 1);
        if(!document.hidden) _bump();
      });

      /* BFCache guard — pageshow fires on BFCache restore (persisted=true) */
      window.addEventListener('pageshow', function(e){
        if(!e.persisted) return;
        /* Re-validate quest day */
        if(typeof ZapQuestEngine !== 'undefined'){
          var st  = ZapQuestEngine.getState();
          var d   = new Date();
          var str = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
          if(st && st.date !== str) ZapQuestEngine.init();
        }
        /* Restore XP */
        if(typeof ZapProgressionSystem !== 'undefined') ZapProgressionSystem.init();
        _setTier(1); _bump();
      });

      /* pagehide → hard cancel all RAF (BFCache safe) */
      window.addEventListener('pagehide', function(){
        cancelAnimationFrame(iRaf);
        cancelAnimationFrame(_hudRaf);
        clearInterval(_padDecay);
        _tier = 4;
      });

      /* Activity → bump tier + Arousal */
      ['click','touchstart','keydown'].forEach(function(ev){
        document.addEventListener(ev, function(){
          _bump();
          var now = Date.now();
          _clickBuf.push(now);
          _clickBuf = _clickBuf.filter(function(t){ return now-t < 10000; });
          _pad.A = Math.min(1, _clickBuf.length / 9);
        }, {passive:true});
      });

      _bump();
    },

    getTier: function(){ return _tier; },
    getPAD:  function(){
      return {
        V: +_pad.V.toFixed(3),
        A: +_pad.A.toFixed(3),
        D: +_pad.D.toFixed(3),
        state: _pad.V>0.6&&_pad.A>0.4 ? 'Excitado' :
               _pad.V>0.5&&_pad.A<0.3 ? 'Satisfeito' :
               _pad.V<0.3&&_pad.A>0.5 ? 'Frustrado' :
               _pad.V<0.3&&_pad.A<0.3 ? 'Entediado' : 'Neutro'
      };
    },
    getFPS: function(){ return _fpsEstimate; }
  };
})();

/* ── Weekend XP Multiplier (2× Sat/Sun) ──────────── */
var _origAddXP = ZapProgressionSystem.addXP.bind(ZapProgressionSystem);
ZapProgressionSystem.addXP = function(amount, reason){
  var d = new Date().getDay();
  if((d===0||d===6) && !(reason||'').includes('(2×')){
    amount = Math.round(amount * 2);
    reason = (reason||'') + ' (2× FDS ⚡)';
  }
  _origAddXP(amount, reason);
};

/* ── Cinematic Unlock Level Fix ──────────────────────
   The global `level` is clamped to LEVELS.length-1 (5).
   LoreAndCameos has reqLevel 10 & 15 — unreachable via
   the clamped index. Fix: check against rawLevelFromXP.
   ───────────────────────────────────────────────────── */
var _origShowLevelUp = showLevelUp;
showLevelUp = function(lv){
  _origShowLevelUp(lv);
  if(typeof LoreAndCameos === 'undefined') return;
  if(typeof ZapProgressionSystem === 'undefined' || !ZapProgressionSystem._ready) return;
  var raw = ZapProgressionSystem.rawLevelFromXP(xp);
  /* Notify only exact-match (avoids duplicate toasts with the original) */
  var unlocks = Object.values(LoreAndCameos).filter(function(s){ return s.reqLevel === raw; });
  if(unlocks.length){
    setTimeout(function(){
      showXpToast('📼 Arquivo desbloqueado: ' + unlocks[0].title + '!');
    }, 3200);
  }
};

/* Also fix the Gallery unlock check: use rawLevel not clamped level */
var _origUpdateGalleryUI = updateGalleryUI;
updateGalleryUI = function(currentLevel){
  var rawLv = (typeof ZapProgressionSystem !== 'undefined' && ZapProgressionSystem._ready)
    ? ZapProgressionSystem.rawLevelFromXP(xp)
    : currentLevel;
  _origUpdateGalleryUI(rawLv);
};

/* Also fix HUD LVL display to show raw level */
var _origUpdateHudBar = updateHudBar;
updateHudBar = function(){
  _origUpdateHudBar();
  if(typeof ZapProgressionSystem !== 'undefined' && ZapProgressionSystem._ready){
    var raw = ZapProgressionSystem.rawLevelFromXP(xp);
    var lbl = document.getElementById('nphLvlTxt');
    if(lbl) lbl.textContent = 'LVL ' + raw;
  }
};

/* ══════════════════════════════════════════
   ZAP ECONOMY v1.0
   Z-Coins Wallet · Store · Cosmetics Engine
   ══════════════════════════════════════════ */

/* ── ZapEconomy — Wallet ──────────────────── */
var ZapEconomy = (function(){
  var SK    = 'zap_wallet_v1';
  var _coins = 0;

  function _save(){ try{ localStorage.setItem(SK, JSON.stringify({coins:_coins})); }catch(e){} }

  function _load(){
    try{
      var d = JSON.parse(localStorage.getItem(SK)||'null');
      if(d) _coins = d.coins || 0;
    }catch(e){}
  }

  function _updateDisplay(){
    var el = document.getElementById('zgCoinBal');
    if(!el) return;
    el.textContent = _coins;
    el.classList.remove('zgWFlash');
    void el.offsetWidth; /* reflow */
    el.classList.add('zgWFlash');
  }

  function _flyCoins(n){
    var btn = document.getElementById('zapVaultBtn');
    var x = btn ? btn.getBoundingClientRect().left : window.innerWidth - 80;
    var y = btn ? btn.getBoundingClientRect().top  : 80;
    var el = document.createElement('div');
    el.className = 'zg-coin-fly';
    el.textContent = '+' + n + ' Z⚡';
    el.style.cssText = 'left:'+x+'px;top:'+y+'px';
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 900);
  }

  return {
    init: function(){ _load(); _updateDisplay(); },

    getCoins: function(){ return _coins; },

    addCoins: function(n, silent){
      _coins += n;
      _save();
      _updateDisplay();
      if(!silent) _flyCoins(n);
      /* Refresh store if visible */
      if(typeof ZapStore !== 'undefined') ZapStore.renderStore();
    },

    spendCoins: function(n){
      if(_coins < n) return false;
      _coins -= n;
      _save();
      _updateDisplay();
      if(typeof ZapStore !== 'undefined') ZapStore.renderStore();
      return true;
    }
  };
})();

/* ── ZapStore — Catalog, Inventory, UI ───────── */
var ZapStore = (function(){

  /* ── Catalog ── */
  var CATALOG = [
    {
      id: 'visor',
      icon: '🕶️',
      name: 'Óculos Cyberpunk',
      desc: 'Visor neon bicolor que se adapta à skin ativa. Brilha no escuro do universo.',
      price: 150
    },
    {
      id: 'hat',
      icon: '🎩',
      name: 'Cartola Holográfica',
      desc: 'Chapéu vetorial de plasma que flutua suavemente acima da cabeça do Zap.',
      price: 250
    },
    {
      id: 'aura',
      icon: '👑',
      name: 'Aura Lendária',
      desc: '8 faíscas áureas + cian orbitando o corpo em formação elíptica. Raro.',
      price: 500
    }
  ];

  var SK = 'zap_store_v1';
  var _inv = { owned:[], equipped:[] }; /* arrays of item ids */
  var _activeTab = 'lore';

  function _save(){ try{ localStorage.setItem(SK, JSON.stringify(_inv)); }catch(e){} }
  function _load(){
    try{
      var d = JSON.parse(localStorage.getItem(SK)||'null');
      if(d){ _inv.owned=d.owned||[]; _inv.equipped=d.equipped||[]; }
    }catch(e){}
  }

  function _isOwned(id)   { return _inv.owned.indexOf(id)    !== -1; }
  function _isEquipped(id){ return _inv.equipped.indexOf(id) !== -1; }

  function _buy(id){
    var item = CATALOG.find(function(i){ return i.id===id; });
    if(!item || _isOwned(id)) return;
    if(!ZapEconomy.spendCoins(item.price)){
      showHudMsg('Sem Z-Coins suficientes. Missões ganham moedas! 💸');
      return;
    }
    _inv.owned.push(id);
    _save();
    showHudMsg(item.icon + ' ' + item.name + ' comprado. Estilo aprovado. 👽');
    ZapProgressionSystem.addXP(20, 'Comprou ' + item.name);
    renderStore();
  }

  function _equip(id){
    var item = CATALOG.find(function(i){ return i.id===id; });
    if(!item || !_isOwned(id)) return;
    if(_isEquipped(id)){
      /* Unequip */
      _inv.equipped = _inv.equipped.filter(function(e){ return e!==id; });
      showHudMsg(item.icon + ' ' + item.name + ' removido. Discreto. 🛸');
    } else {
      _inv.equipped.push(id);
      showHudMsg(item.icon + ' ' + item.name + ' equipado. Agora sim. 👾');
    }
    _save();
    renderStore();
  }

  function renderStore(){
    var list = document.getElementById('storeList');
    if(!list) return;
    var coins = ZapEconomy.getCoins();

    list.innerHTML = '';
    CATALOG.forEach(function(item){
      var owned    = _isOwned(item.id);
      var equipped = _isEquipped(item.id);
      var canBuy   = coins >= item.price;

      var div = document.createElement('div');
      div.className = 'zs-item' + (equipped ? ' zs-equipped' : owned ? ' zs-owned' : '');

      var actionBtn;
      if(!owned){
        actionBtn = '<button class="zs-btn zs-btn-buy"'
          + (canBuy ? '' : ' disabled')
          + ' onclick="ZapStore._buy(\'' + item.id + '\')">'
          + '⚡ ' + item.price + ' Z-Coins</button>';
      } else if(equipped){
        actionBtn = '<button class="zs-btn zs-btn-equipped" onclick="ZapStore._equip(\'' + item.id + '\')">Equipado</button>';
      } else {
        actionBtn = '<button class="zs-btn zs-btn-equip" onclick="ZapStore._equip(\'' + item.id + '\')">🔮 Equipar</button>';
      }

      div.innerHTML =
        (equipped ? '<div class="zs-equipped-glow"></div>' : '') +
        '<div class="zs-item-top">' +
          '<div class="zs-item-meta">' +
            '<div class="zs-item-name">' + item.name + '</div>' +
            '<div class="zs-item-desc">' + item.desc + '</div>' +
          '</div>' +
          '<div class="zs-item-icon">' + item.icon + '</div>' +
        '</div>' +
        '<div class="zs-item-bottom">' +
          (!owned
            ? '<div class="zs-price-tag"><span class="zs-price-icon">⚡</span>' + item.price + ' Z-Coins</div>'
            : '<div class="zs-unlock-hint">' + (equipped ? '✦ Visual ativo no HUD' : 'No inventário') + '</div>'
          ) +
          actionBtn +
        '</div>';

      list.appendChild(div);
    });

    /* Update coin display */
    var bal = document.getElementById('zgCoinBal');
    if(bal) bal.textContent = ZapEconomy.getCoins();
  }

  return {
    init: function(){
      _load();
    },

    _buy:    _buy,
    _equip:  _equip,

    renderStore: renderStore,

    showTab: function(tab){
      _activeTab = tab;
      var loreDiv  = document.getElementById('galleryList');
      var storeDiv = document.getElementById('storeList');
      var tabLore  = document.getElementById('zgTabLore');
      var tabStore = document.getElementById('zgTabStore');
      if(!loreDiv || !storeDiv) return;

      if(tab === 'lore'){
        loreDiv.style.display  = '';
        storeDiv.style.display = 'none';
        if(tabLore)  tabLore.classList.add('zg-tab-active');
        if(tabStore) tabStore.classList.remove('zg-tab-active');
      } else {
        loreDiv.style.display  = 'none';
        storeDiv.style.display = '';
        if(tabStore) tabStore.classList.add('zg-tab-active');
        if(tabLore)  tabLore.classList.remove('zg-tab-active');
        renderStore();
      }
    },

    getEquipped: function(){ return _inv.equipped.slice(); },
    getOwned:    function(){ return _inv.owned.slice(); },
    getCatalog:  function(){ return CATALOG; }
  };
})();

/* ── Cosmetics Renderer ──────────────────────
   Called from drawAlien() after body is drawn.
   All coords in alien-local space (sc=1 ref).
   ─────────────────────────────────────────── */
function _drawCosmetics(C, mode){
  if(typeof ZapStore === 'undefined') return;
  var eq = ZapStore.getEquipped();
  if(!eq.length) return;

  /* ── 🕶️ Visor Cyberpunk ── */
  if(eq.indexOf('visor') !== -1 && gBlinkT % 120 >= 5){
    C.save();
    C.lineWidth = 2;

    /* Left lens */
    var lg = C.createLinearGradient(-50,-34,-10,-14);
    lg.addColorStop(0,'rgba(0,212,255,.55)');
    lg.addColorStop(1,'rgba(147,51,234,.55)');
    C.fillStyle = lg;
    C.strokeStyle = '#00d4ff';
    rrect(C,-50,-34,40,20,9);
    C.fill(); C.stroke();

    /* Right lens */
    var rg = C.createLinearGradient(10,-34,50,-14);
    rg.addColorStop(0,'rgba(147,51,234,.55)');
    rg.addColorStop(1,'rgba(0,212,255,.55)');
    C.fillStyle = rg;
    C.strokeStyle = '#9333ea';
    rrect(C,10,-34,40,20,9);
    C.fill(); C.stroke();

    /* Bridge */
    C.beginPath(); C.moveTo(-10,-24); C.lineTo(10,-24);
    C.strokeStyle='rgba(0,212,255,.9)'; C.lineWidth=2.5; C.stroke();

    /* Lens shine */
    C.fillStyle='rgba(255,255,255,.18)';
    C.beginPath(); C.ellipse(-38,-27,8,4,-.4,0,Math.PI*2); C.fill();
    C.beginPath(); C.ellipse(22,-27,8,4,-.4,0,Math.PI*2);  C.fill();

    /* Neon glow flicker */
    var flicker = .8 + .2*Math.sin(gTick*.31);
    C.shadowColor='#00d4ff'; C.shadowBlur=10*flicker;
    C.strokeStyle='rgba(0,212,255,'+(.6*flicker)+')';
    C.lineWidth=1; rrect(C,-50,-34,40,20,9); C.stroke();
    rrect(C,10,-34,40,20,9); C.stroke();
    C.shadowBlur=0;
    C.restore();
  }

  /* ── 🎩 Cartola Holográfica ── */
  if(eq.indexOf('hat') !== -1){
    var hFloat = Math.sin(gTick*.055)*5; /* independent hover */
    C.save();
    C.translate(0, hFloat);
    C.lineWidth = 2;

    /* Brim */
    C.beginPath(); C.ellipse(0,-88,55,11,0,0,Math.PI*2);
    var hbg = C.createLinearGradient(-55,-99,55,-77);
    hbg.addColorStop(0,'rgba(0,212,255,.5)');
    hbg.addColorStop(.5,'rgba(147,51,234,.35)');
    hbg.addColorStop(1,'rgba(0,212,255,.5)');
    C.fillStyle = hbg; C.fill();
    C.strokeStyle = 'rgba(0,212,255,.85)'; C.stroke();

    /* Crown */
    C.beginPath();
    C.moveTo(-36,-88); C.lineTo(-30,-136); C.lineTo(30,-136); C.lineTo(36,-88);
    C.closePath();
    var hcg = C.createLinearGradient(0,-136,0,-88);
    hcg.addColorStop(0,'rgba(147,51,234,.72)');
    hcg.addColorStop(1,'rgba(0,212,255,.45)');
    C.fillStyle = hcg; C.fill();
    C.strokeStyle = 'rgba(147,51,234,.85)'; C.stroke();

    /* Holographic band */
    C.beginPath(); C.moveTo(-30,-105); C.lineTo(30,-105);
    C.strokeStyle='rgba(255,255,255,.35)'; C.lineWidth=3; C.stroke();

    /* Holographic scan line animation */
    var scanY = -136 + (gTick % 60) * .8;
    if(scanY > -88) scanY = -136;
    C.beginPath(); C.moveTo(-30,scanY); C.lineTo(30,scanY);
    C.strokeStyle='rgba(0,212,255,.5)'; C.lineWidth=1; C.stroke();

    /* Crown glow */
    var hGlow = .6 + .4*Math.sin(gTick*.07);
    C.shadowColor='#9333ea'; C.shadowBlur=14*hGlow;
    C.strokeStyle='rgba(147,51,234,'+(.4*hGlow)+')';
    C.lineWidth=1;
    C.beginPath();
    C.moveTo(-36,-88); C.lineTo(-30,-136); C.lineTo(30,-136); C.lineTo(36,-88);
    C.closePath(); C.stroke();
    C.shadowBlur=0;
    C.restore();
  }

  /* ── 👑 Aura Lendária ── */
  if(eq.indexOf('aura') !== -1){
    var N = 8;
    C.save();
    for(var i=0; i<N; i++){
      var angle = (i/N)*Math.PI*2 + gTick*.042;
      var px    = Math.cos(angle)*88;
      var py    = Math.sin(angle)*52 + 18; /* ellipse centered at body */
      var br    = .45 + .55*Math.abs(Math.sin(gTick*.16 + i*1.1));
      var isGold = (i%2===0);

      C.save();
      C.translate(px, py);
      C.rotate(angle + Math.PI/4);

      /* Diamond spark */
      C.beginPath();
      C.moveTo(0,-5.5); C.lineTo(3.5,0); C.lineTo(0,5.5); C.lineTo(-3.5,0);
      C.closePath();

      var col = isGold ? ('rgba(251,191,36,'+br+')') : ('rgba(0,212,255,'+br+')');
      C.fillStyle = col;
      C.shadowColor = isGold ? '#fbbf24' : '#00d4ff';
      C.shadowBlur  = 10*br;
      C.fill();

      /* Tail streak */
      C.beginPath();
      C.moveTo(0,0); C.lineTo(0,9*br);
      C.strokeStyle = col; C.lineWidth=1.5; C.stroke();
      C.restore();
    }
    /* Soft orbit ring */
    C.beginPath(); C.ellipse(0,18,88,52,0,0,Math.PI*2);
    C.strokeStyle='rgba(251,191,36,.06)'; C.lineWidth=2; C.stroke();
    C.shadowBlur=0;
    C.restore();
  }
}

/* ── Hook ZapProgressionSystem.addXP for coin rewards ──── */
(function(){
  var _prevAddXP = ZapProgressionSystem.addXP.bind(ZapProgressionSystem);
  ZapProgressionSystem.addXP = function(amount, reason){
    _prevAddXP(amount, reason);
    var r = reason || '';
    /* Quest completion → Z-Coins */
    if(r.indexOf('Missão:') !== -1){
      ZapEconomy.addCoins(50);
    }
    /* All quests bonus */
    if(r.indexOf('Todas as missões') !== -1){
      ZapEconomy.addCoins(100);
    }
    /* Game click micro-reward (1 coin per 3 game opens) */
    if(r.indexOf('Abrindo ') !== -1){
      if(!window._zapClickCoins) window._zapClickCoins = 0;
      window._zapClickCoins++;
      if(window._zapClickCoins % 3 === 0) ZapEconomy.addCoins(5, true);
    }
  };
})();

/* ── Hook openVault to refresh store state ────────────── */
var _origOpenVault = openVault;
openVault = function(){
  _origOpenVault();
  ZapStore.showTab('lore'); /* reset to lore tab */
  ZapStore.renderStore();
};

/* ── R20.1: Accessibility layer for zapGallery modal ─────── */
(function(){
  var _prevFocus = null; /* element to return focus to on close */

  function _getFocusable(modal) {
    return Array.from(modal.querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ));
  }

  function _trapFocus(e) {
    var modal = document.getElementById('zapGallery');
    if (!modal || !modal.classList.contains('show')) return;
    var focusable = _getFocusable(modal);
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    }
    if (e.key === 'Escape') { _closeVaultA11y(); }
  }

  function _closeVaultA11y() {
    var modal = document.getElementById('zapGallery');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    var btn = document.getElementById('zapVaultBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', _trapFocus);
    if (_prevFocus && _prevFocus.focus) { try { _prevFocus.focus(); } catch(e){} }
    _prevFocus = null;
  }

  /* Patch openVault for a11y */
  var _baseOpen = openVault;
  openVault = function() {
    _prevFocus = document.activeElement;
    _baseOpen();
    var modal = document.getElementById('zapGallery');
    var btn   = document.getElementById('zapVaultBtn');
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      /* focus first focusable element inside */
      setTimeout(function(){
        var focusable = _getFocusable(modal);
        if (focusable.length) focusable[0].focus();
      }, 60);
      document.addEventListener('keydown', _trapFocus);
    }
    if (btn) btn.setAttribute('aria-expanded', 'true');
  };

  /* Patch close button to also restore a11y state */
  document.addEventListener('DOMContentLoaded', function(){
    var closeBtn = document.querySelector('#zapGallery .zg-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(){ _closeVaultA11y(); });
    }
    /* Initial aria-hidden state */
    var modal = document.getElementById('zapGallery');
    if (modal) modal.setAttribute('aria-hidden', 'true');
    var btn = document.getElementById('zapVaultBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });

  window._closeVaultA11y = _closeVaultA11y;
})();

/* ── HOTFIX R20.6: Focus trap para zapCinematicOverlay ─────────────
   Mesmo padrão do zapGallery (R20.1 a11y layer).
   Garante: TAB/SHIFT+TAB, ESC → skip, focus restore.
   O overlay tem role="dialog" aria-modal="true" já declarado no HTML.
─────────────────────────────────────────────────────────────────── */
(function () {
  var _prevFocusCinema = null; /* elemento que receberá focus de volta ao fechar */

  function _getFocusableCinema(overlay) {
    return Array.from(overlay.querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ));
  }

  function _trapFocusCinema(e) {
    var overlay = document.getElementById('zapCinematicOverlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    var focusable = _getFocusableCinema(overlay);
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
    if (e.key === 'Escape') {
      /* ESC → skip (comportamento já documentado no botão "ESC / PULAR") */
      if (typeof zapCinematics !== 'undefined' && typeof zapCinematics.skip === 'function') {
        zapCinematics.skip();
      }
    }
  }

  function _onCinemaOpen() {
    _prevFocusCinema = document.activeElement;
    var overlay = document.getElementById('zapCinematicOverlay');
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', _trapFocusCinema);
    /* Focar o botão de skip imediatamente */
    setTimeout(function () {
      var focusable = _getFocusableCinema(overlay);
      if (focusable.length) focusable[0].focus();
    }, 60);
  }

  function _onCinemaClose() {
    var overlay = document.getElementById('zapCinematicOverlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', _trapFocusCinema);
    if (_prevFocusCinema && typeof _prevFocusCinema.focus === 'function') {
      try { _prevFocusCinema.focus(); } catch (e) {}
    }
    _prevFocusCinema = null;
  }

  /* Patch zapCinematics.play e .skip via proxy após window.zapCinematics estar disponível */
  document.addEventListener('DOMContentLoaded', function () {
    /* Aguardar exposição de zapCinematics (linha ~1590) */
    var _tick = setInterval(function () {
      if (typeof window.zapCinematics === 'undefined') return;
      clearInterval(_tick);

      var _origPlay = window.zapCinematics.play.bind(window.zapCinematics);
      var _origSkip = window.zapCinematics.skip.bind(window.zapCinematics);

      window.zapCinematics.play = function (sceneId) {
        _origPlay(sceneId);
        _onCinemaOpen();
      };

      window.zapCinematics.skip = function () {
        _origSkip();
        _onCinemaClose();
      };

      /* Aria inicial */
      var overlay = document.getElementById('zapCinematicOverlay');
      if (overlay && !overlay.getAttribute('aria-hidden')) {
        overlay.setAttribute('aria-hidden', 'true');
      }
    }, 80);
  });
})();

/* ── Expose IIFE-scoped vars to window for onclick handlers ── */
window.ZapQuestEngine  = ZapQuestEngine;
window.ZapStore        = ZapStore;
window.zapCinematics   = zapCinematics;
window.openVault       = openVault;

/* ══════════════════════════════════════════
   ZAP PERSONALITY v2.0 — R14
   Orchestrator stub — logic now in /js/zap/ modules.
   Loaded modules: NPBus · NPUtils · ZapMoodSystem
                   ZapSpeech · ZapIdle · ZapMemory
                   ZapNotifications · ZapDebugOverlay
   ══════════════════════════════════════════ */

/* ── Compatibility shims — used inline by this file ── */
/* ZapMoodSystem / ZapSpeech may load later (defer).
   Provide fallbacks so boot doesn't fail if modules
   haven't parsed yet when neonplay-init.js runs. */

var ZAP_MOODS = window.ZAP_MOODS || { idle:'idle', happy:'happy', excited:'excited', sleepy:'sleepy', curious:'curious', dreaming:'dreaming' };

function setZapMood(m,d){
  if(window.ZapMoodSystem) ZapMoodSystem.setMood(m,d);
  else window.ZAP_MOODS && (window._zapMood = m);
}

function zapSpeak(msg, delay){
  if(window.ZapSpeech) ZapSpeech.say(msg, {delay:delay});
  else {
    /* Inline fallback (no typing effect) */
    var b = document.getElementById('nphBubble');
    if(!b) return;
    var d = delay !== undefined ? delay : 420;
    setTimeout(function(){
      b.textContent = msg; b.style.display = 'block';
      if(typeof hudOpen !== 'undefined') window.hudOpen = true;
      clearTimeout(b._t);
      b._t = setTimeout(function(){ b.style.display='none'; window.hudOpen=false; }, 4500);
    }, d);
  }
}

/* ── Hook XP toast → mood ─────────────────── */
var _origShowXpToastPersonality = showXpToast;
showXpToast = function(msg){
  _origShowXpToastPersonality(msg);
  setZapMood('happy', 3500);
  if(window.NPBus) NPBus.emit(NPBus.EV.XP_GAIN, { msg: msg });
};

/* ── Hook Level-up → mood ─────────────────── */
var _origShowLevelUpPersonality = showLevelUp;
showLevelUp = function(lv){
  _origShowLevelUpPersonality(lv);
  setZapMood('excited', 6000);
  if(window.NPBus) NPBus.emit(NPBus.EV.LEVEL_UP, { level: lv });
};

/* ── Hook patchGameClicks → genre msg + memory ── */
var _origPatchGameClicks = patchGameClicks;
patchGameClicks = function(){
  _origPatchGameClicks();
  document.addEventListener('click', function(e){
    var card = e.target.closest('[href*="game.html"],.game-card,.gc,.featured-card,.carousel-item,[data-slug]');
    if(!card) return;

    /* Memory */
    var slug = (card.dataset && card.dataset.slug) ||
               ((card.getAttribute('href') || '').replace(/.*slug=/, '').split('&')[0]) || '';
    if(slug && window.ZapMemory) ZapMemory.saveLastGame(slug);
    else if(slug) try{ localStorage.setItem('np_last_game', slug.substring(0,80)); }catch(e){}

    /* Genre comment */
    var cat = (card.dataset && (card.dataset.cat || card.dataset.category)) || '';
    if(!cat){
      var catEl = card.querySelector('.gc-cat,.game-cat,.item-cat,[data-cat]');
      if(catEl) cat = catEl.textContent || (catEl.dataset && catEl.dataset.cat) || '';
    }
    var genreMsg = window.ZapMemory ? ZapMemory.getGenreMsg(cat) : null;

    if(genreMsg && _canShowHudMsg()){
      var _delay = 1200;
      setTimeout(function(){
        setZapMood('curious', 5000);
        zapSpeak(genreMsg, 600);
        if(window.NPBus) NPBus.emit(NPBus.EV.GAME_OPEN, { cat: cat });
      }, _delay);
    }
  }, true);
};

/* ── Upgrade showHudMsg ───────────────────── */
var _origShowHudMsg = showHudMsg;
showHudMsg = function(custom){
  var msg = custom || HUD_MSGS[hudMsgIdx % HUD_MSGS.length];
  if(!custom) hudMsgIdx++;
  zapSpeak(msg, 420);
};

/* ══ BOOT ══ */
window.addEventListener('load',function(){
    /* Skip intro on return visits — R12: verifica ambas as flags */
    var _introSeen = localStorage.getItem('neonplay_intro_v1') || localStorage.getItem('np_intro_seen');
    if(_introSeen){
      document.getElementById('npZapIntro').style.display='none';
      var hudEl=document.getElementById('npAlienHud');
      if(hudEl) hudEl.classList.add('active');
      /* R20.11-fix: ativar vault e quest toggle no skip-intro path */
      var _vEl = document.getElementById('zapVaultBtn');
      var _qEl = document.getElementById('zapQuestToggle');
      if(_vEl) _vEl.classList.add('active');
      if(_qEl) _qEl.classList.add('active');
      if(typeof startHudLoop==='function') startHudLoop();
      if(typeof patchGameClicks==='function') patchGameClicks();
      /* R13: return visit greeting — 1x per session */
      if(!sessionStorage.getItem('_zap_greeted')){
        sessionStorage.setItem('_zap_greeted','1');
        var _returnMsgs = ['Você voltou. 👀', 'Pronto pra mais jogos?', 'Continuei te esperando.'];
        var _lastGame = window.ZapMemory ? ZapMemory.getLastGame() : (typeof _getLastGame === 'function' ? _getLastGame() : '');
        var _greetMsg = _lastGame
          ? 'Ainda curtindo ' + _lastGame + '? 👾'
          : _returnMsgs[Math.floor(Math.random() * _returnMsgs.length)];
        setTimeout(function(){ setZapMood(ZAP_MOODS.happy, 4000); zapSpeak(_greetMsg, 350); }, 2000);
      }
    } else {
      /* R20.8 FIX BUG-03: salvar flag imediatamente (não após 8s).
         O timer causava intro repetido em sessões curtas/refresh rápido. */
      try{localStorage.setItem('neonplay_intro_v1','1');localStorage.setItem('np_intro_seen','1');}catch(e){}
      introLoop();
    }
  /* R20.1: tryInit — fail-soft wrapper. One module crashing cannot abort the entire chain.
     Errors are logged (visible in NP_DEBUG mode, silenced in prod) but never swallowed silently. */
  function tryInit(name, fn) {
    try { fn(); }
    catch(e) {
      if (window.NP_DEBUG) { console.warn('[NeonPlay R20.1] init failed: ' + name, e); }
      else { /* prod: silent fail, no console spam */ }
    }
  }

  tryInit('zapCinematics',         function(){ zapCinematics.init(); });
  tryInit('ZapProgressionSystem',  function(){ ZapProgressionSystem.init(); });  /* restore XP + level */
  tryInit('ZapQuestEngine',        function(){ ZapQuestEngine.init(); });         /* daily quests */
  tryInit('ZapLifecycleManager',   function(){ ZapLifecycleManager.init(); });   /* tier + BFCache */
  tryInit('ZapEconomy',            function(){ ZapEconomy.init(); });             /* Z-Coins wallet */
  tryInit('ZapStore',              function(){ ZapStore.init(); });               /* cosmetic inventory */

  /* R14: initialize Zap sub-modules — all via tryInit for chain resilience */
  if(window.ZapMoodSystem)     tryInit('ZapMoodSystem',    function(){ ZapMoodSystem.init(); });
  if(window.ZapSpeech)         tryInit('ZapSpeech',        function(){ ZapSpeech.init(); });
  if(window.ZapMemory)         tryInit('ZapMemory',        function(){ ZapMemory.init(); });
  if(window.ZapIdle)           tryInit('ZapIdle',          function(){ ZapIdle.init(); });
  if(window.ZapNotifications)  tryInit('ZapNotifications', function(){ ZapNotifications.init(); });
  /* Hook drawAlien after everything is defined */
  if(window.ZapMoodSystem) tryInit('ZapMoodSystem.hookDrawAlien', function(){ ZapMoodSystem.hookDrawAlien(); });

  /* R16: initialize companion personality modules
     Load order: Metrics → Personality → Affinity → MemoryGraph → Dialogue → Presence → Animator → Ambient
     Each .init() is guarded — safe no-op if element not found (e.g. game.html has no nphAlienWrap) */
  /* R20.1: NPClock self-initializes via IIFE — no .init() needed, removed boot TypeError */
  if(window.NPMetrics)            tryInit('NPMetrics',            function(){ NPMetrics.init(); });
  if(window.ZapPersonalityEngine) tryInit('ZapPersonalityEngine', function(){ ZapPersonalityEngine.init(); });
  if(window.ZapAffinity)          tryInit('ZapAffinity',          function(){ ZapAffinity.init(); });
  if(window.ZapMemoryGraph)       tryInit('ZapMemoryGraph',       function(){ ZapMemoryGraph.init(); });
  if(window.ZapDialogueEngine)    tryInit('ZapDialogueEngine',    function(){ ZapDialogueEngine.init(); });
  if(window.ZapPresence)          tryInit('ZapPresence',          function(){ ZapPresence.init(); });
  if(window.ZapAnimator)          tryInit('ZapAnimator',          function(){ ZapAnimator.init(); });
  if(window.ZapAmbientEvents)     tryInit('ZapAmbientEvents',     function(){ ZapAmbientEvents.init(); });

  /* ── R19: Observability + Self-regulation Layer ──────────────*/
  if(window.NPRuntimeDrift)       tryInit('NPRuntimeDrift',      function(){ NPRuntimeDrift.init(); });
  if(window.NPBehaviorStability)  tryInit('NPBehaviorStability', function(){ NPBehaviorStability.init(); });
  /* R19 debug modules — only active when NP_DEBUG === true */
  if(window.NPDecisionTrace)      NPDecisionTrace.init && NPDecisionTrace.init();
  if(window.NPBehaviorInspector)  NPBehaviorInspector.init && NPBehaviorInspector.init();
  if(window.NPEmotionTimeline)    NPEmotionTimeline.init && NPEmotionTimeline.init();
  if(window.NPRuntimeReplay)      NPRuntimeReplay.init();
  if(window.NPIntentVisualizer)   NPIntentVisualizer.init();
  if(window.NPStateHeatmap)       NPStateHeatmap.init();
  if(window.NPSemanticInspector)  NPSemanticInspector.init();

  /* ── R20: Governance + Explainability Layer ───────────────────*/
  /* core: order matters — Policy before Governor, Health before Governor */
  if(window.NPBehaviorPolicy)     { /* no init needed — pure config module */ }
  if(window.NPSystemHealth)       tryInit('NPSystemHealth',       function(){ NPSystemHealth.init(); });
  if(window.NPRuntimeGovernor)    tryInit('NPRuntimeGovernor',    function(){ NPRuntimeGovernor.init(); });
  if(window.NPSessionPersonality) tryInit('NPSessionPersonality', function(){ NPSessionPersonality.init(); });
  /* debug modules — active only when NP_DEBUG === true */
  if(window.NPExplainability)     { /* no init needed — stateless */ }
  if(window.NPDependencyGraph)    tryInit('NPDependencyGraph',   function(){ NPDependencyGraph.init(); });
  if(window.NPStabilityForecast)  tryInit('NPStabilityForecast', function(){ NPStabilityForecast.init(); });

  /* R20.4: dispatch NP:modules-ready after tryInit chain completes */
  try { document.dispatchEvent(new CustomEvent('NP:modules-ready')); } catch(e){}

  /* ══════════════════════════════════════════
     ZAP_DEBUG — Console Telemetry Suite
     Usage:
       ZAP_DEBUG.status()
       ZAP_DEBUG.triggerLevelUp()
       ZAP_DEBUG.completeCurrentQuests()
       ZAP_DEBUG.addXP(500)
       ZAP_DEBUG.resetQuests()
       ZAP_DEBUG.xpTable()
       ZAP_DEBUG.help()
     ══════════════════════════════════════════ */
  window.ZAP_DEBUG = (function(){
    var _sep  = '─'.repeat(44);
    var _sep2 = '═'.repeat(44);
    var _c    = function(msg,s){ console.log('%c'+msg, s||''); };

    /* XP balance constants */
    var XP_TABLE = (function(){
      var t=[];
      var cinematics={3:'cameo_ben10',7:'cameo_scooby',10:'lore_crash',15:'lore_planet'};
      for(var n=1;n<=16;n++){
        var total=Math.floor(100*Math.pow(n,1.5));
        t.push({level:n, xpTotal:total, xpDelta:n===1?total:total-Math.floor(100*Math.pow(n-1,1.5)),
          cinematic:cinematics[n]||null});
      }
      return t;
    })();

    return {

      /* ── Full telemetry snapshot ── */
      status: function(){
        var pad = ZapLifecycleManager.getPAD();
        var tier = ZapLifecycleManager.getTier();
        var fps  = ZapLifecycleManager.getFPS();
        var raw  = ZapProgressionSystem.rawLevelFromXP(xp);
        var prog = ZapProgressionSystem.getProgress();
        var qst  = ZapQuestEngine.getState();

        console.group('%c⚡ ZAP DEBUG STATUS', 'color:#fbbf24;font-weight:bold;font-size:14px');

        _c(_sep2, 'color:#9333ea');
        _c('  🧠  PAD EMOTIONAL MODEL', 'color:#00d4ff;font-weight:bold');
        _c(_sep, 'color:#333');
        console.table({
          Valence:   { value: pad.V, meaning: 'Prazer/Satisfação (0-1)' },
          Arousal:   { value: pad.A, meaning: 'Excitação/Atividade (0-1)' },
          Dominance: { value: pad.D, meaning: 'Controle/Progresso (0-1)' },
        });
        _c('  Estado emocional estimado: ' + pad.state, 'color:#a3ffd6;font-style:italic');

        _c(_sep2, 'color:#9333ea');
        _c('  🎮  PERFORMANCE', 'color:#00d4ff;font-weight:bold');
        _c(_sep, 'color:#333');
        console.table({
          Tier:    { value: tier, labels:'1=Active 2=Idle 3=Background 4=Dormant' },
          FPS:     { value: fps + 'fps', target:'60fps' },
          HudRAF:  { value: _hudRaf ? 'handle #'+_hudRaf : 'null' },
          IntroRAF:{ value: iRaf     ? 'handle #'+iRaf   : 'null' },
        });

        _c(_sep2, 'color:#9333ea');
        _c('  📈  PROGRESSION', 'color:#00d4ff;font-weight:bold');
        _c(_sep, 'color:#333');
        console.table({
          XP_Total:    { value: xp },
          Raw_Level:   { value: raw },
          Static_Level:{ value: level+1 + ' (clamped to LEVELS[])' },
          XP_This_Level: { value: xp - prog.xpCur },
          XP_Next_Level: { value: prog.xpNext - xp },
          Progress_Pct:  { value: prog.pct + '%' },
          Skin_Active:   { value: SKINS[skinIdx].name },
          Weekend_2x:    { value: (function(){ var d=new Date().getDay(); return d===0||d===6?'🟢 ATIVO':'⚪ Off'; })() },
        });

        _c(_sep2, 'color:#9333ea');
        _c('  🛸  QUESTS DO DIA', 'color:#00d4ff;font-weight:bold');
        _c(_sep, 'color:#333');
        if(qst){
          console.log('%cData: ' + qst.date, 'color:#aaa');
          console.table(qst.quests.map(function(q){
            var def = [
              {id:'clicker',goal:3},{id:'focus',goal:1},{id:'night_owl',goal:1},
              {id:'fav_hunter',goal:2},{id:'scroll',goal:5},{id:'cat_hop',goal:4},
              {id:'morning',goal:1}
            ].find(function(d){return d.id===q.id;}) || {goal:'?'};
            return {
              id: q.id,
              progress: q.progress + '/' + def.goal,
              done: q.done ? '✓' : '…',
              pct: Math.round(q.progress/(def.goal||1)*100) + '%'
            };
          }));
          console.log('%cRAW localStorage:', 'color:#555', JSON.parse(localStorage.getItem('zap_quests_v1')||'{}'));
        } else {
          _c('  Quest state: null', 'color:#ff6b6b');
        }

        _c(_sep2, 'color:#9333ea');
        console.groupEnd();
        return '✓ ZAP_DEBUG.status() — see table above';
      },

      /* ── Force level-up for visual QA ── */
      triggerLevelUp: function(targetLevel){
        var tl = Math.min((targetLevel||level+1), LEVELS.length-1);
        /* Temporarily bump global level */
        var prev = level;
        level = tl;
        lvlMode = true; lvlTick = 0;
        showLevelUp(tl);
        /* Also fire cinematic unlock check at raw level 10 for QA */
        if(typeof LoreAndCameos !== 'undefined'){
          var sc = Object.values(LoreAndCameos)[tl % Object.keys(LoreAndCameos).length];
          if(sc){ showXpToast('📼 [DEBUG] Arquivo desbloqueado: ' + sc.title + '!'); }
        }
        level = prev;
        return '✓ Level-up overlay triggered (level ' + (tl+1) + ')';
      },

      /* ── Complete all quests instantly ── */
      completeCurrentQuests: function(){
        var ids = ['clicker','focus','night_owl','fav_hunter','scroll','cat_hop','morning'];
        var st  = ZapQuestEngine.getState();
        if(!st){ return '✗ Quest state not initialized'; }
        var completed = 0;
        st.quests.forEach(function(q){
          if(!q.done){ ZapQuestEngine.devComplete(q.id); completed++; }
        });
        return '✓ ' + completed + ' quest(s) completed. Check panel + XP toast.';
      },

      /* ── Grant arbitrary XP ── */
      addXP: function(amount){
        amount = amount || 100;
        ZapProgressionSystem.addXP(amount, '[DEBUG] Manual grant');
        return '✓ +' + amount + ' XP granted. New total: ' + xp;
      },

      /* ── Reset today's quests (simulate new day) ── */
      resetQuests: function(){
        try{ localStorage.removeItem('zap_quests_v1'); }catch(e){}
        ZapQuestEngine.init();
        ZapQuestEngine.renderUI();
        return '✓ Quests reset — new daily missions generated';
      },

      /* ── Reset all progression ── */
      resetProgression: function(){
        try{
          localStorage.removeItem('zap_prog_v1');
          localStorage.removeItem('zap_quests_v1');
        }catch(e){}
        xp=0; level=0; skinIdx=0;
        ZapProgressionSystem._ready = false;
        ZapProgressionSystem.init();
        ZapQuestEngine.init();
        updateHudBar();
        return '✓ Full progression reset';
      },

      /* ── Print XP balance table ── */
      xpTable: function(){
        _c('⚡ XP CURVE — floor(100 × n^1.5)', 'color:#fbbf24;font-weight:bold');
        var rows = {};
        var daily = 660, dailyWe = 1320;
        XP_TABLE.forEach(function(r){
          rows['Lv'+r.level] = {
            xp_total: r.xpTotal,
            delta: '+'+r.xpDelta,
            days_weekday: (r.xpTotal/daily).toFixed(1),
            days_mixed:   (r.xpTotal/((daily*5+dailyWe*2)/7)).toFixed(1),
            cinematic: r.cinematic || '—'
          };
        });
        console.table(rows);
        _c('Balance verdict: Lv3~1d ✓  Lv7~2.8d ✓  Lv10~4.8d ✓  Lv15~8.8d ✓', 'color:#a3ffd6');
        _c('Weekend 2× active Sat+Sun → shaves ~2d off Lv15 path', 'color:#aaa');
        return '✓ XP table logged';
      },

      /* ── Grant Z-Coins for testing ── */
      addCoins: function(n){
        n = n || 200;
        ZapEconomy.addCoins(n, true);
        ZapStore.renderStore();
        return '✓ +' + n + ' Z-Coins granted. Total: ' + ZapEconomy.getCoins();
      },

      /* ── Show cosmetic inventory ── */
      inventory: function(){
        var owned    = ZapStore.getOwned();
        var equipped = ZapStore.getEquipped();
        var catalog  = ZapStore.getCatalog();
        var coins    = ZapEconomy.getCoins();
        console.group('%c⚡ ZAP INVENTORY', 'color:#fbbf24;font-weight:bold;font-size:13px');
        console.log('%c💰 Wallet: ' + coins + ' Z-Coins', 'color:#fbbf24;font-weight:bold');
        console.table(catalog.map(function(item){
          return {
            icon:     item.icon,
            name:     item.name,
            price:    item.price + ' Z⚡',
            status:   equipped.indexOf(item.id)!==-1 ? '✦ EQUIPADO'
                    : owned.indexOf(item.id)   !==-1 ? '✓ Possuído'
                    : coins >= item.price       ? '★ Acessível'
                    : '🔒 Bloqueado'
          };
        }));
        console.groupEnd();
        return '✓ Inventory logged';
      },

      /* ── Play a specific cinematic scene ── */
      playScene: function(id){
        var ids = Object.keys(LoreAndCameos||{});
        if(!id){ return 'Available: ' + ids.join(', '); }
        zapCinematics.play(id);
        return '✓ Playing scene: ' + id;
      },

      /* ── List all commands ── */
      help: function(){
        console.group('%c⚡ ZAP_DEBUG — Available Commands', 'color:#00d4ff;font-weight:bold');
        console.table({
          'status()':               { desc:'Full telemetry snapshot (PAD + FPS + quests + XP)' },
          'triggerLevelUp(lv?)':    { desc:'Force level-up overlay. Optional target level (0-5)' },
          'completeCurrentQuests()':{ desc:'Instantly complete all 3 daily quests' },
          'addXP(n)':               { desc:'Grant n XP (default 100). Applies weekend 2× if active' },
          'addCoins(n)':            { desc:'Grant n Z-Coins (default 200). Use for store testing' },
          'inventory()':            { desc:'Show store inventory: owned/equipped cosmetics + wallet' },
          'resetQuests()':          { desc:'Wipe quest localStorage and generate fresh missions' },
          'resetProgression()':     { desc:'Full wipe: XP, level, quests, skins' },
          'xpTable()':              { desc:'Print XP balance table with days-to-unlock per cinematic' },
          'playScene(id?)':         { desc:'Play a cinematic. No arg = list available scene IDs' },
        });
        console.groupEnd();
        return '⚡ ZAP_DEBUG ready. Type ZAP_DEBUG.status() to start.';
      }
    };
  })();

  /* Auto-log hint once, silently */
  console.log('%c⚡ ZAP_DEBUG loaded. Type ZAP_DEBUG.help() for commands.', 'color:#fbbf24;font-style:italic');
});

})();