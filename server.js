/* NeonPlay local server — Node.js built-ins only. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8',
  '.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'
};
function send(res, status, body, type='text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}
function safePath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const full = path.resolve(ROOT, relative);
  return full === ROOT || full.startsWith(ROOT + path.sep) ? full : null;
}
const server = http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method || '')) return send(res,405,'Method not allowed');
  let url;
  try { url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`); }
  catch { return send(res,400,'Bad request'); }
  if (url.pathname === '/api/health') return send(res,200,JSON.stringify({ok:true,service:'neonplay-local-arcade',time:new Date().toISOString()}),'application/json; charset=utf-8');
  if (url.pathname === '/api/games') {
    const catalogs = ['games-imported.json', 'games.json'];
    const readCatalog = (index) => fs.readFile(path.join(ROOT, catalogs[index]), (err,data) => {
      if (err && index + 1 < catalogs.length) return readCatalog(index + 1);
      if (err) return send(res,500,'Game catalog unavailable');
      send(res,200,data.toString('utf8'),'application/json; charset=utf-8');
    });
    readCatalog(0);
    return;
  }
  const file = safePath(url.pathname);
  if (!file) return send(res,400,'Bad path');
  fs.stat(file,(err,stat) => {
    /* Standalone package fallback. When merged into the original NeonPlay repo,
       the real game.html exists and is served normally below. */
    if ((err || !stat || !stat.isFile()) && url.pathname === '/game.html' && url.searchParams.has('id')) {
      const fallback = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Player original do NeonPlay</title><body style="font:16px/1.5 system-ui;background:#070711;color:#f4f3ff;max-width:680px;margin:12vh auto;padding:24px"><h1>Este jogo depende do player original</h1><p>O pacote inclui 12 jogos HTML5 totalmente locais. Para abrir os jogos antigos do catálogo, una estes arquivos ao repositório completo do NeonPlay, preservando game.html e seus módulos.</p><p><a style="color:#00d4ff" href="/play.html?game=snake">Jogar Snake Neon localmente →</a></p><p><a style="color:#00d4ff" href="/">Voltar ao catálogo</a></p></body></html>';
      return send(res,200,fallback,'text/html; charset=utf-8');
    }
    if (err || !stat || !stat.isFile() || path.basename(file).startsWith('.')) return send(res,404,'Not found');
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const cache = type.startsWith('text/html') || type.includes('json') ? 'no-cache' : 'public, max-age=3600, stale-while-revalidate=86400';
    const headers = {
      'Content-Type':type,'Content-Length':stat.size,
      'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
      'X-Frame-Options':'SAMEORIGIN','Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Opener-Policy':'same-origin','Cache-Control':cache
    };
    res.writeHead(200,headers);
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file);
    stream.on('error',()=>{ if (!res.headersSent) send(res,500,'Read error'); else res.destroy(); });
    stream.pipe(res);
  });
});
server.listen(PORT,'0.0.0.0',()=>console.log(`NeonPlay server running on http://0.0.0.0:${PORT}`));
for (const sig of ['SIGINT','SIGTERM']) process.on(sig,()=>server.close(()=>process.exit(0)));
