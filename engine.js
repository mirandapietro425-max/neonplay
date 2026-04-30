/**
 * NeonPlay v3 — engine.js
 * Motor principal do portal de jogos HTML5
 */
'use strict';

// ═══════════════════════════════════════
// 1. UTILITÁRIOS
// ═══════════════════════════════════════

function formatPlays(n){
  if(n>=1000000) return (n/1000000).toFixed(1)+'M';
  if(n>=1000)    return (n/1000).toFixed(1)+'K';
  return String(n);
}

function getParam(name){
  return new URLSearchParams(location.search).get(name);
}

function showToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}

function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function debounce(fn,ms){
  let t;
  return function(...args){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,args),ms); };
}

// ═══════════════════════════════════════
// 2. FAVORITOS
// ═══════════════════════════════════════

const FAV_KEY='neonplay_favs_v3';

const Favs = {
  get(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY))||[]; }catch{ return []; } },
  save(a){ localStorage.setItem(FAV_KEY,JSON.stringify(a)); },
  has(id){ return this.get().includes(id); },
  toggle(id){
    const a=this.get();
    const i=a.indexOf(id);
    if(i===-1){ a.push(id); showToast('❤️ Adicionado aos favoritos!'); }
    else { a.splice(i,1); showToast('💔 Removido dos favoritos.'); }
    this.save(a);
    updateFavCount();
    renderFavPanel();
  }
};

function updateFavCount(){
  const n=Favs.get().length;
  document.querySelectorAll('#favCount').forEach(el=>el.textContent=n);
}

function renderFavPanel(){
  const body=document.getElementById('favBody');
  if(!body) return;
  const favs=Favs.get();
  const games=GAMES_DB.filter(g=>favs.includes(g.id));
  if(!games.length){
    body.innerHTML='<div class="fav-empty"><span>💔</span><p>Nenhum favorito ainda.<br>Clique em ♡ para salvar jogos!</p></div>';
    return;
  }
  body.innerHTML=games.map(g=>{
    const cd=getCategoryData(g.cat);
    return `<a href="game.html?id=${g.id}" class="fav-item">
      <div class="fav-thumb" style="background:linear-gradient(${cd.gradient})">${cd.emoji}</div>
      <div class="fav-info">
        <div class="fav-name">${g.namePT}</div>
        <div class="fav-cat">${cd.emoji} ${cd.name}</div>
      </div>
      <button class="fav-rm" onclick="event.preventDefault();Favs.toggle('${g.id}')">✕</button>
    </a>`;
  }).join('');
}

// ═══════════════════════════════════════
// 3. CARD DE JOGO
// ═══════════════════════════════════════

const MAX_PLAYS = Math.max(...GAMES_DB.map(g=>g.plays));

function badgeHTML(badge){
  if(!badge) return '';
  const map={hot:'🔥 Hot',new:'✨ Novo',top:'⭐ Top'};
  return `<span class="card-badge cb-${badge}">${map[badge]||badge}</span>`;
}

function createCard(game){
  const cd=getCategoryData(game.cat);
  const isFav=Favs.has(game.id);
  const pop=Math.min(100,Math.round((game.plays/MAX_PLAYS)*100));
  const bg=`linear-gradient(${cd.gradient})`;

  const thumb=game.thumb
    ? `<img src="${game.thumb}" alt="${game.namePT}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=\\'ce\\'style=\\'background:${bg}\\'>${cd.emoji}</div>'">`
    : `<div class="ce" style="background:${bg}">${cd.emoji}</div>`;

  return `<article class="game-card${game.featured?' gc-featured':''}"
    onclick="location.href='game.html?id=${game.id}'"
    role="article" aria-label="${game.namePT}">
    <div class="card-thumb">
      ${thumb}
      ${badgeHTML(game.badge)}
      <button class="card-fav${isFav?' cf-active':''}"
        onclick="event.stopPropagation();Favs.toggle('${game.id}');this.classList.toggle('cf-active');this.textContent=this.classList.contains('cf-active')?'❤️':'🤍'"
        aria-label="${isFav?'Remover':'Adicionar'} favorito">${isFav?'❤️':'🤍'}</button>
      <div class="card-overlay"><div class="card-play">▶</div></div>
    </div>
    <div class="card-body">
      <div class="card-name" title="${game.namePT}">${game.namePT}</div>
      <div class="card-meta">
        <span class="card-cat">${cd.emoji} ${cd.name}</span>
        <span class="card-rating">⭐ ${game.rating}</span>
      </div>
      <div class="card-plays">👾 ${formatPlays(game.plays)} jogadas</div>
      <div class="card-bar"><div class="card-bar-fill" style="width:${pop}%"></div></div>
    </div>
  </article>`;
}

// ═══════════════════════════════════════
// 4. BUSCA
// ═══════════════════════════════════════

function initSearch(){
  const input=document.getElementById('searchInput');
  const drop=document.getElementById('searchDrop');
  if(!input||!drop) return;

  const doSearch=debounce(q=>{
    q=q.trim();
    if(q.length<2){ drop.hidden=true; return; }
    const res=searchGames(q).slice(0,8);
    if(!res.length){ drop.hidden=true; return; }
    drop.innerHTML=res.map(g=>`
      <a href="game.html?id=${g.id}" class="sdrop-item">
        <span class="sdrop-emoji">${getCategoryData(g.cat).emoji}</span>
        <span class="sdrop-name">${g.namePT}</span>
        <span class="sdrop-cat">${getCategoryData(g.cat).name}</span>
      </a>`).join('');
    drop.hidden=false;
  },200);

  input.addEventListener('input',e=>doSearch(e.target.value));
  document.addEventListener('click',e=>{ if(!input.contains(e.target)&&!drop.contains(e.target)) drop.hidden=true; });
}

// ═══════════════════════════════════════
// 5. HAMBURGER + FAVORITOS PANEL
// ═══════════════════════════════════════

function initUI(){
  // Hamburger
  const hbg=document.getElementById('hbg');
  const mnav=document.getElementById('mobileNav');
  if(hbg&&mnav){
    hbg.addEventListener('click',()=>{
      const open=mnav.hidden;
      mnav.hidden=!open;
      hbg.setAttribute('aria-expanded',String(open));
    });
  }

  // Fav panel
  const favBtn=document.getElementById('favBtn');
  const panel=document.getElementById('favPanel');
  const overlay=document.getElementById('overlay');
  const close=document.getElementById('favClose');

  function openFav(){ if(panel){ panel.classList.add('open'); overlay?.classList.add('show'); renderFavPanel(); } }
  function closeFav(){ panel?.classList.remove('open'); overlay?.classList.remove('show'); }

  favBtn?.addEventListener('click',openFav);
  close?.addEventListener('click',closeFav);
  overlay?.addEventListener('click',closeFav);
}

// ═══════════════════════════════════════
// 6. TOP 5 WIDGET
// ═══════════════════════════════════════

function renderTop5(containerId){
  const el=document.getElementById(containerId);
  if(!el) return;
  const top=getTopGames(5);
  el.innerHTML=top.map((g,i)=>`
    <a href="game.html?id=${g.id}" class="top5-item">
      <span class="top5-rank">#${i+1}</span>
      <span class="top5-emoji">${getCategoryData(g.cat).emoji}</span>
      <div class="top5-info">
        <div class="top5-name">${g.namePT}</div>
        <div class="top5-plays">${formatPlays(g.plays)} jogadas</div>
      </div>
    </a>`).join('');
}

// ═══════════════════════════════════════
// 7. HOME PAGE
// ═══════════════════════════════════════

const PAGE_SIZE=12;
let homeOffset=0;
let homeGames=[];

function initHomePage(){
  renderFeatured();
  homeGames=[...GAMES_DB].sort((a,b)=>b.plays-a.plays);
  homeOffset=0;
  renderHomeGrid(true);
  renderCatsGrid();
  renderTop5('top5List');

  document.getElementById('loadMoreBtn')?.addEventListener('click',()=>{
    homeOffset+=PAGE_SIZE;
    renderHomeGrid(false);
  });

  initHeroParticles();
  initDynamicPlays();
}

function renderFeatured(){
  const grid=document.getElementById('featuredGrid');
  if(!grid) return;
  const featured=getFeaturedGames();
  grid.innerHTML=featured.map(createCard).join('');
}

function renderHomeGrid(reset){
  const grid=document.getElementById('gamesGrid');
  const btn=document.getElementById('loadMoreBtn');
  if(!grid) return;
  const slice=homeGames.slice(0,homeOffset+PAGE_SIZE);
  if(reset) grid.innerHTML='';
  grid.innerHTML=slice.map(createCard).join('');
  if(btn) btn.style.display=slice.length>=homeGames.length?'none':'block';
}

function renderCatsGrid(){
  const grid=document.getElementById('catsGrid');
  if(!grid) return;
  grid.innerHTML=CATEGORIES_DATA.map(c=>`
    <a href="category.html?cat=${c.id}" class="cat-card" style="border-color:${c.color}20">
      <div class="cat-card-icon" style="background:linear-gradient(${c.gradient})">${c.emoji}</div>
      <div class="cat-card-info">
        <div class="cat-card-name">${c.name}</div>
        <div class="cat-card-count">${getGameCount(c.id)} jogos</div>
      </div>
    </a>`).join('');
}

// ═══════════════════════════════════════
// 8. HERO PARTICLES
// ═══════════════════════════════════════

function initHeroParticles(){
  const container=document.getElementById('heroParticles');
  if(!container) return;
  for(let i=0;i<20;i++){
    const p=document.createElement('div');
    p.className='hparticle';
    p.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;
      animation-delay:${Math.random()*4}s;animation-duration:${3+Math.random()*4}s;
      width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;opacity:${0.3+Math.random()*0.5}`;
    container.appendChild(p);
  }
}

// ═══════════════════════════════════════
// 9. POPULARIDADE DINÂMICA
// ═══════════════════════════════════════

function initDynamicPlays(){
  setInterval(()=>{
    GAMES_DB.forEach(g=>{ if(Math.random()>0.7) g.plays+=randInt(1,10); });
    document.querySelectorAll('.card-plays').forEach(el=>{
      const card=el.closest('[onclick]');
      if(!card) return;
      const m=(card.getAttribute('onclick')||'').match(/id=([^']+)/);
      if(!m) return;
      const g=GAMES_DB.find(x=>x.id===m[1]);
      if(g) el.textContent=`👾 ${formatPlays(g.plays)} jogadas`;
    });
  },15000);
}

// ═══════════════════════════════════════
// 10. GAME PAGE
// ═══════════════════════════════════════

function initGamePage(){
  const id=getParam('id');
  const game=getGameById(id);

  if(!game){
    document.getElementById('gpTitle')&&(document.getElementById('gpTitle').textContent='Jogo não encontrado');
    return;
  }

  const cd=getCategoryData(game.cat);

  // SEO dinâmico
  document.title=`${game.namePT} — Jogo Grátis Online | NeonPlay`;
  setMeta('description',`Jogue ${game.namePT} grátis online no NeonPlay! ${game.desc} Sem download, sem cadastro.`);
  setMeta('og:title',`${game.namePT} — NeonPlay`);
  setMeta('og:description',game.desc);
  if(game.thumb) setMeta('og:image',game.thumb);

  // Breadcrumb
  const bcCat=document.getElementById('bcCat');
  const bcGame=document.getElementById('bcGame');
  if(bcCat){ bcCat.textContent=`${cd.emoji} ${cd.name}`; bcCat.href=`category.html?cat=${game.cat}`; }
  if(bcGame) bcGame.textContent=game.namePT;

  // Splash poster
  const poster=document.getElementById('splashPoster');
  if(poster){
    if(game.thumb){
      poster.innerHTML=`<img src="${game.thumb}" alt="${game.namePT}" onerror="this.parentElement.innerHTML='${cd.emoji}'" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`;
    } else {
      poster.textContent=cd.emoji;
      poster.style.background=`linear-gradient(${cd.gradient})`;
    }
  }

  // Info
  const el=(id,txt)=>{ const e=document.getElementById(id); if(e) e.textContent=txt; };
  el('gpTitle',game.namePT);
  el('gpDesc',game.desc);
  el('gpTagCat',`${cd.emoji} ${cd.name}`);
  el('gpTagRating',`⭐ ${game.rating}/5`);
  el('gpTagPlays',`👾 ${formatPlays(game.plays)} jogadas`);
  el('gpTagYear',`📅 ${game.year}`);
  el('gpTagDev',`🏢 ${game.developer}`);

  // Info card
  el('ginfoCTitle',`Sobre ${game.namePT}`);
  el('ginfoDesc',game.descLong||game.desc);

  // Tags
  const tagsEl=document.getElementById('gameTags');
  if(tagsEl&&game.tags) tagsEl.innerHTML=game.tags.map(t=>`<span class="gtag">#${t}</span>`).join('');

  // SEO block
  const seo=document.getElementById('seoBlock');
  if(seo) seo.innerHTML=`<h2>${game.namePT} — Jogo Grátis Online</h2>
    <p>Jogue <strong>${game.namePT}</strong> gratuitamente no NeonPlay, o maior portal de jogos HTML5 do Brasil.
    ${game.descLong||game.desc} Não precisa de download nem cadastro — basta clicar em Jogar Agora!</p>
    <p>Categoria: <a href="category.html?cat=${game.cat}">${cd.name}</a> | Desenvolvido por ${game.developer} | ${game.year}</p>`;

  // Iframe title
  el('iframeTitle',`🎮 ${game.namePT}`);

  // Botão jogar
  const playBtn=document.getElementById('playNowBtn');
  const wrap=document.getElementById('gameFrameWrap');
  const splash=document.getElementById('gameSplash');
  if(playBtn){
    playBtn.addEventListener('click',()=>{
      if(splash) splash.style.display='none';
      if(wrap){ wrap.style.display='block'; launchGame(game); }
      document.getElementById('preGameAdWrap')&&(document.getElementById('preGameAdWrap').style.display='flex');
    },{once:true});
  }

  // Botões de fav
  ['favSplashBtn','favIframeBtn'].forEach(btnId=>{
    const btn=document.getElementById(btnId);
    if(!btn) return;
    btn.dataset.id=game.id;
    updateFavBtn(btn,game.id);
    btn.addEventListener('click',()=>{ Favs.toggle(game.id); updateFavBtn(btn,game.id); });
  });

  // Restart / fullscreen
  document.getElementById('restartBtn')?.addEventListener('click',()=>launchGame(game));
  document.getElementById('fullscreenBtn')?.addEventListener('click',()=>{
    const iframe=document.getElementById('gameFrame');
    if(iframe?.requestFullscreen) iframe.requestFullscreen();
    else if(iframe?.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
  });

  // Related + top
  const rel=document.getElementById('relatedGrid');
  if(rel){ rel.innerHTML=getRelatedGames(game,6).map(createCard).join(''); }
  renderTop5('sidebarHot');
}

function updateFavBtn(btn,id){
  const f=Favs.has(id);
  btn.textContent=f?'❤️ Favoritado':'♡ Favoritar';
  btn.classList.toggle('faved',f);
}

function launchGame(game){
  const frame=document.getElementById('gameFrame');
  const loader=document.getElementById('iframeLoader');
  if(!frame) return;
  if(loader) loader.style.display='flex';
  frame.src=game.src;
  frame.onload=()=>{ if(loader) loader.style.display='none'; };
}

function setMeta(name,content){
  let el=document.querySelector(`meta[name="${name}"],meta[property="${name}"]`);
  if(!el){ el=document.createElement('meta'); el.setAttribute(name.includes(':')&&!name.startsWith('og:')?'name':'property',name); document.head.appendChild(el); }
  el.setAttribute('content',content);
}

// ═══════════════════════════════════════
// 11. CATEGORY PAGE
// ═══════════════════════════════════════

const CAT_PAGE_SIZE=12;
let catOffset=0;
let catFiltered=[];
let currentCat='all';
let currentSort='popular';

function initCategoryPage(){
  currentCat=getParam('cat')||'all';
  updateCatHero(currentCat);
  updateActiveCatSEO(currentCat);
  buildFilterChips();
  buildSortSelect();
  catFiltered=getFiltered();
  catOffset=0;
  renderCatGrid(true);
  renderTop5('sidebarTop');
  setActiveChip(currentCat);

  document.getElementById('loadMoreBtn')?.addEventListener('click',()=>{
    catOffset+=CAT_PAGE_SIZE;
    renderCatGrid(false);
  });

  // SEO text block
  renderCatSeoBlock(currentCat);
}

function renderCatSeoBlock(catId){
  const el=document.getElementById('catSeoBlock');
  if(!el) return;
  const cd=getCategoryData(catId);
  const count=getGameCount(catId);
  if(catId==='all'){
    el.innerHTML=`<h2>Todos os Jogos Online Grátis — NeonPlay</h2>
      <p>Explore todos os <strong>${count} jogos HTML5 grátis</strong> disponíveis no NeonPlay. Jogue ação, corrida, puzzle, arcade, esporte, aventura, tiro e estratégia diretamente no navegador, sem download e sem cadastro.</p>`;
  } else {
    el.innerHTML=`<h2>${cd.nameSEO} Grátis Online — NeonPlay</h2>
      <p>${cd.desc} Temos <strong>${count} jogos de ${cd.name}</strong> disponíveis para jogar agora, sem download, sem cadastro — 100% grátis no navegador.</p>`;
  }
}

function updateCatHero(catId){
  const cd=getCategoryData(catId);
  const el=(id,txt)=>{ const e=document.getElementById(id); if(e) e.textContent=txt; };
  el('catHeroIcon',cd.emoji);
  el('catHeroTitle',cd.nameSEO||cd.name);
  el('catHeroCount',`${getGameCount(catId)} jogos disponíveis`);
  el('bcCat',catId==='all'?'Todas as Categorias':cd.name);
  el('catHeroDesc',cd.desc||'');
  // Breadcrumb link
  const bc=document.getElementById('bcCat');
  if(bc) bc.href=`category.html?cat=${catId}`;
}

function updateActiveCatSEO(catId){
  const cd=getCategoryData(catId);
  document.title=`${cd.nameSEO||cd.name} Grátis Online — NeonPlay`;
  const desc=document.querySelector('meta[name="description"]');
  if(desc) desc.content=`${cd.desc} Sem download, sem cadastro.`;
}

function buildFilterChips(){
  const chips=document.getElementById('catChips');
  if(!chips) return;
  const all=[{id:'all',name:'Todos',emoji:'🎮'},...CATEGORIES_DATA];
  chips.innerHTML=all.map(c=>`
    <button class="filter-chip${c.id===currentCat?' active':''}" data-cat="${c.id}">
      ${c.emoji} ${c.name}
    </button>`).join('');
  chips.addEventListener('click',e=>{
    const btn=e.target.closest('.filter-chip');
    if(!btn) return;
    currentCat=btn.dataset.cat;
    history.replaceState(null,'',`?cat=${currentCat}`);
    updateCatHero(currentCat);
    updateActiveCatSEO(currentCat);
    setActiveChip(currentCat);
    catFiltered=getFiltered();
    catOffset=0;
    renderCatGrid(true);
  });
}

function buildSortSelect(){
  const sel=document.getElementById('sortSelect');
  if(!sel) return;
  sel.value=currentSort;
  sel.addEventListener('change',()=>{
    currentSort=sel.value;
    catFiltered=getFiltered();
    catOffset=0;
    renderCatGrid(true);
  });
}

function getFiltered(){
  let games=currentCat==='all'?[...GAMES_DB]:GAMES_DB.filter(g=>g.cat===currentCat);
  if(currentSort==='popular') games.sort((a,b)=>b.plays-a.plays);
  else if(currentSort==='newest') games.sort((a,b)=>b.year-a.year||b.plays-a.plays);
  else if(currentSort==='name') games.sort((a,b)=>a.namePT.localeCompare(b.namePT));
  else if(currentSort==='rating') games.sort((a,b)=>b.rating-a.rating);
  return games;
}

function renderCatGrid(reset){
  const grid=document.getElementById('categoryGrid');
  const btn=document.getElementById('loadMoreBtn');
  if(!grid) return;
  const slice=catFiltered.slice(0,catOffset+CAT_PAGE_SIZE);
  grid.innerHTML=slice.map(createCard).join('');
  if(btn) btn.style.display=slice.length>=catFiltered.length?'none':'block';
}

function setActiveChip(catId){
  document.querySelectorAll('.filter-chip').forEach(c=>{
    c.classList.toggle('active',c.dataset.cat===catId);
  });
}

// ═══════════════════════════════════════
// 12. INIT GLOBAL
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded',()=>{
  updateFavCount();
  initSearch();
  initUI();

  const path=location.pathname;
  if(path.includes('game.html')) initGamePage();
  else if(path.includes('category.html')) initCategoryPage();
  else { initHomePage(); }
});
