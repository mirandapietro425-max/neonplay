'use strict';

const ICONS = {
  corrida: '🏎️', racing: '🏎️', esporte: '⚽', sports: '⚽', puzzle: '🧩', arcade: '🕹️',
  acao: '✨', shooter: '✨', plataforma: '🏃', platformer: '🏃', aventura: '🗺️',
  casual: '🎈', tabuleiro: '♟️', board: '♟️', quiz: '🧠', '3d': '🌐', multiplayer: '👥'
};
const COLORS = {
  corrida: ['#ff8a28', '#4120b9'], racing: ['#ff8a28', '#4120b9'], esporte: ['#1acb92', '#124c96'],
  sports: ['#1acb92', '#124c96'], puzzle: ['#9b78ff', '#28206f'], arcade: ['#f052a7', '#34156f'],
  acao: ['#ff725c', '#3d1c91'], shooter: ['#ff725c', '#3d1c91'], plataforma: ['#66dcff', '#1e357d'],
  platformer: ['#66dcff', '#1e357d'], aventura: ['#43e0b0', '#124856'], casual: ['#ff8ac8', '#492076'],
  tabuleiro: ['#c1ccf1', '#29345d'], board: ['#c1ccf1', '#29345d'], quiz: ['#5ad8ff', '#203e89'],
  '3d': ['#8fbdff', '#3b208d'], multiplayer: ['#61e5ef', '#252c8c']
};
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}
function clean(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max); }
function validColor(s) { return /^#[0-9a-f]{6}$/i.test(s || '') ? s : ''; }
function vectorArt(category, accent) {
  const common = 'stroke="#f8fbff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
  if (category === 'corrida' || category === 'racing') return `<g ${common} fill="${accent}"><path d="M420 170 437 141Q440 135 449 135H490L514 160 531 168V190H410V175Z"/><path d="M447 141 442 158H500L486 141Z" fill="#0b1425"/><circle cx="438" cy="191" r="11" fill="#0b1425"/><circle cx="507" cy="191" r="11" fill="#0b1425"/></g>`;
  if (category === 'esporte' || category === 'sports') return `<g ${common} fill="${accent}"><circle cx="474" cy="164" r="49"/><path d="M474 145 493 158 486 180H462L455 158Z" fill="#0b1425"/><path d="M474 115 493 123 500 139M521 150 512 171 530 184M492 207 475 194 456 207M427 181 441 162 430 144M455 123 456 140 438 151M510 134 493 158M438 191 462 180M486 180 512 195" fill="none"/></g>`;
  if (category === 'puzzle') return `<g ${common} fill="${accent}"><rect x="419" y="116" width="47" height="47" rx="8"/><rect x="480" y="116" width="47" height="47" rx="8" fill="#0b1425"/><rect x="419" y="177" width="47" height="47" rx="8" fill="#0b1425"/><rect x="480" y="177" width="47" height="47" rx="8"/><path d="M442 127V151M430 139H454M503 189V213M491 201H515" fill="none"/></g>`;
  if (category === 'arcade') return `<g ${common} fill="${accent}"><path d="M420 150Q422 132 440 132H507Q525 132 530 151L541 192Q545 208 529 208Q521 208 511 196L497 184H450L435 198Q417 211 411 195Z"/><path d="M438 153V178M425 165H451" fill="none"/><circle cx="502" cy="156" r="5" fill="#0b1425"/><circle cx="516" cy="170" r="5" fill="#0b1425"/></g>`;
  if (category === 'plataforma' || category === 'platformer') return `<g ${common} fill="${accent}"><circle cx="482" cy="128" r="15"/><path d="M477 147 456 171 474 184 497 164 515 177M470 160 494 177 492 204M459 171 444 202M492 204 514 215" fill="none" stroke-width="11"/><path d="M424 218H530" fill="none" stroke="#f8fbff" stroke-opacity=".5"/></g>`;
  if (category === 'tabuleiro' || category === 'board') return `<g ${common} fill="${accent}"><path d="M436 204H514L505 188V148H490V128H460V148H445V188Z"/><path d="M459 148H491M446 188H504M430 218H520" fill="none"/><circle cx="475" cy="120" r="8"/></g>`;
  if (category === 'quiz' || category === 'word-quiz') return `<g ${common} fill="${accent}"><path d="M442 159A34 34 0 1 1 508 159Q508 176 493 186L491 202H459L457 186Q442 175 442 159Z"/><path d="M460 217H490M463 228H487" fill="none"/><path d="M468 153Q468 143 478 143Q488 143 488 152Q488 159 478 165V171" fill="none"/><circle cx="478" cy="181" r="2.5" fill="#0b1425" stroke="none"/></g>`;
  if (category === 'multiplayer') return `<g ${common} fill="${accent}"><circle cx="454" cy="137" r="22"/><circle cx="501" cy="137" r="22"/><path d="M414 207Q414 167 454 167Q483 167 487 192Q498 167 520 170Q539 173 539 207Z"/><path d="M463 128 454 139 463 150" fill="none"/><path d="M493 128 502 139 493 150" fill="none"/></g>`;
  if (category === '3d') return `<g ${common} fill="${accent}"><path d="M474 111 522 138V191L474 219 426 191V138Z"/><path d="M426 138 474 166 522 138M474 166V219" fill="none"/></g>`;
  if (category === 'casual') return `<g ${common} fill="${accent}"><circle cx="448" cy="148" r="25"/><circle cx="493" cy="171" r="35"/><circle cx="456" cy="205" r="13" fill="#0b1425"/><circle cx="520" cy="124" r="10"/></g>`;
  return `<g ${common} fill="${accent}"><path d="M475 111 493 149 535 154 504 182 512 222 475 201 438 222 446 182 415 154 457 149Z"/><circle cx="475" cy="166" r="16" fill="#0b1425"/></g>`;
}
module.exports = function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); return res.end('Método não permitido');
  }
  const query = new URL(req.url || '/api/cover', 'https://neonplay.invalid').searchParams;
  const title = clean(query.get('title') || 'NeonPlay', 72);
  const category = clean(query.get('category') || 'arcade', 32).toLowerCase();
  const icon = clean(query.get('icon') || ICONS[category] || '🎮', 12);
  const gradient = COLORS[category] || ['#80eaff', '#6b3bcc'];
  const accent = validColor(query.get('accent')) || gradient[0];
  const escapedTitle = esc(title);
  const escapedCategory = esc(category.toUpperCase().replace(/-/g, ' ').slice(0, 25));
  const escapedIcon = esc(icon);
  const art = vectorArt(category, accent);
  const words = title.split(/\s+/);
  let titleLines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 22 && line) { titleLines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) titleLines.push(line);
  if (titleLines.length > 2) {
    titleLines = titleLines.slice(0, 2);
    if (titleLines[1].length > 19) titleLines[1] = titleLines[1].slice(0, 18).trimEnd() + '…';
    else titleLines[1] += '…';
  }
  const titleSvg = titleLines.map((s, i) => `<text x="44" y="${278 + i * 48}" class="title" fill="#ffffff" stroke="#08101c" stroke-opacity=".35" stroke-width="1" paint-order="stroke" font-family="system-ui, sans-serif" font-size="36" font-weight="900">${esc(s)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" role="img" aria-label="${escapedTitle}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${gradient[0]}"/><stop offset="1" stop-color="${gradient[1]}"/></linearGradient><radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".65"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs>
<rect width="600" height="400" rx="24" fill="#0a0d17"/><rect x="8" y="8" width="584" height="384" rx="20" fill="url(#bg)" opacity=".9"/>
<circle cx="465" cy="93" r="185" fill="url(#glow)"/><path d="M0 332 255 100l115 80 230-145v365H0Z" fill="#050812" opacity=".43"/><path d="M-40 304 198 64M57 382 300 138M235 422 492 165M409 420 659 172" stroke="#fff" stroke-opacity=".11" stroke-width="3"/>
<circle cx="477" cy="157" r="86" fill="#080b15" fill-opacity=".25" stroke="#fff" stroke-opacity=".32" stroke-width="2"/>${art}
<rect x="31" y="31" width="188" height="31" rx="15" fill="#070b14" fill-opacity=".68" stroke="#fff" stroke-opacity=".22"/><text x="47" y="51" fill="#f5f8ff" font-size="11" letter-spacing="2.2" font-weight="800" font-family="system-ui, sans-serif">NEONPLAY · ${escapedCategory}</text>
${titleSvg}<rect x="44" y="350" width="142" height="4" rx="2" fill="${accent}"/><text x="556" y="365" text-anchor="end" fill="#fff" fill-opacity=".66" font-family="system-ui, sans-serif" font-size="10" letter-spacing="2.5">PLAY NOW ↗</text></svg>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  res.end(req.method === 'HEAD' ? '' : svg);
};
