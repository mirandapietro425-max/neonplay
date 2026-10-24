#!/usr/bin/env node
'use strict';
/* Importa jogos reais que precisam de backend; cada um fica isolado em seu próprio serviço. */
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { downloadAndExtract } = require('./download-github-archive.cjs');
const { writeJsonIfChanged } = require('./write-json-if-changed.cjs');
const ROOT = path.resolve(__dirname, '..');
const SERVICES = path.join(ROOT, 'services');
const CATALOG = path.join(ROOT, 'games-imported.json');
const MAX_ARCHIVE_BYTES = 96 * 1024 * 1024;
// Bump when patch transformations change so existing services are safely refreshed once.
const IMPORTER_REVISION = 2;
const MANIFEST = path.join(ROOT, 'server-games-manifest.json');
let SOURCE_GAMES = [];
function log(s) { console.log(`[neonplay-server-games] ${s}`); }
async function download(repo, commit, id, temp) {
  log(`Baixando ${id} de ${repo}@${commit}`);
  const result = await downloadAndExtract({
    repo, commit, id, temp,
    maxArchiveBytes: MAX_ARCHIVE_BYTES,
    maxExpandedBytes: 384 * 1024 * 1024,
    maxEntries: 40000,
    timeoutMs: 180000
  });
  log(`Archive validado: ${result.entries} entradas, ${(result.expandedBytes / 1024 / 1024).toFixed(1)} MiB expandidos`);
  return result.extract;
}
async function copyTree(src, dest, rel = '') {
  await fs.mkdir(dest, { recursive: true });
  for (const ent of await fs.readdir(src, { withFileTypes: true })) {
    const name = ent.name;
    if (['.git', '.github', 'node_modules', '.next', 'coverage', 'playwright-report', 'test-results'].includes(name)) continue;
    if (name.startsWith('.DS_Store')) continue;
    const s = path.join(src, name), d = path.join(dest, name);
    if (ent.isDirectory()) await copyTree(s, d, rel ? `${rel}/${name}` : name);
    else if (ent.isFile()) await fs.copyFile(s, d);
  }
}
async function ensureTextReplace(file, from, to, label) {
  let text = await fs.readFile(file, 'utf8');
  if (text.includes(to)) return;
  if (!text.includes(from)) throw new Error(`Não encontrei o ponto de integração '${label}' em ${file}`);
  text = text.replace(from, to);
  await fs.writeFile(file, text, 'utf8');
}
async function replaceDirectorySafely(next, destination) {
  const backup = `${destination}.previous`;
  await fs.rm(backup, { recursive: true, force: true });
  const existing = await fs.stat(destination).catch(() => null);
  if (existing) await fs.rename(destination, backup);
  try {
    await fs.rename(next, destination);
    await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    const current = await fs.stat(destination).catch(() => null);
    const previous = await fs.stat(backup).catch(() => null);
    if (!current && previous) await fs.rename(backup, destination).catch(() => {});
    throw error;
  }
}
async function patchTwoPlayerGames(dir) {
  const server = path.join(dir, 'server.js');
  let text = await fs.readFile(server, 'utf8');
  const targetFrame = `  "frame-ancestors 'self'",`;
  const replacementFrame = `  "frame-ancestors 'self' https://zapgame.com.br https://www.zapgame.com.br https://neonplay-nu.vercel.app",`;
  if (text.includes(targetFrame)) text = text.replace(targetFrame, replacementFrame);
  else if (!text.includes(replacementFrame)) throw new Error('CSP frame-ancestors inesperado no TwoPlayerGames');
  text = text.replace(/\s*"X-Frame-Options": "SAMEORIGIN",\r?\n/, '\n');
  const healthAnchor = '  if (urlPath === "/health") {';
  const healthCors = `  if (urlPath === "/health") {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
`;
  if (text.includes(healthAnchor) && !text.includes('ALLOWED_ORIGINS.includes(origin)')) text = text.replace(healthAnchor, healthCors);
  else if (!text.includes('ALLOWED_ORIGINS.includes(origin)')) throw new Error('Ponto de health/CORS inesperado no TwoPlayerGames');
  await fs.writeFile(server, text, 'utf8');
  const index = path.join(dir, 'index.html');
  let html = await fs.readFile(index, 'utf8');
  if (!html.includes('neonplay-embed-mode')) {
    // O servidor define script-src 'self', portanto JS inline não executa. Use arquivo externo.
    const injection = `\n  <script id="neonplay-embed-mode" src="/js/neonplay-embed.js"></script>\n  <style id="neonplay-embed-style">html.neonplay-embed body{margin:0!important;padding-top:0!important}html.neonplay-embed .app-header{display:none!important}html.neonplay-embed #app{max-width:none!important;margin:0!important;padding:12px!important}</style>\n`;
    html = html.replace('</head>', injection + '</head>');
    await fs.mkdir(path.join(dir, 'js'), { recursive: true });
    await fs.writeFile(path.join(dir, 'js', 'neonplay-embed.js'), `(function(){try{if(new URLSearchParams(window.location.search).get('embed')==='1'){document.documentElement.classList.add('neonplay-embed');}}catch(e){}})();\n`, 'utf8');
    await fs.writeFile(index, html, 'utf8');
  }
}
async function patchOpenIO(dir) {
  const server = path.join(dir, 'server.js');
  let text = await fs.readFile(server, 'utf8');
  text = text.replace("var io = require('socket.io').listen(server);", "var io = new (require('socket.io').Server)(server);");
  text = text.replace('server.listen(8081, function () {', 'server.listen(Number(process.env.PORT || 8081), function () {');
  if (!text.includes("app.get('/health'")) {
    const anchor = "app.use(express.static(__dirname + '/public'));";
    if (!text.includes(anchor)) throw new Error('Ponto do health check não encontrado no Open IO');
    text = text.replace(anchor, "app.get('/health', function (req, res) { var origin = req.get('origin'); var allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(function(x){return x.trim()}).filter(Boolean); if (origin && allowed.indexOf(origin) !== -1) { res.set('Access-Control-Allow-Origin', origin); res.set('Vary', 'Origin'); } res.status(200).json({ ok: true, service: 'open-io' }); });\n" + anchor);
  }
  await fs.writeFile(server, text, 'utf8');
  // O projeto original não declara as dependências usadas por server.js e contém um lockfile legado.
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({
    name: 'neonplay-open-io', version: '1.0.0', private: true,
    description: 'Open IO multiplayer protótipo integrado ao NeonPlay; fonte original em MIT.',
    scripts: { start: 'node server.js' },
    engines: { node: '>=18' },
    dependencies: { express: '4.21.2', 'socket.io': '4.8.1' }
  }, null, 2) + '\n', 'utf8');
  await fs.rm(path.join(dir, 'package-lock.json'), { force: true });

  // O repositório original entrega o jogo em /public/proto_index.html, não em /index.html.
  // Corrigimos a página realmente servida pela rota /; antes esse erro impediria toda importação.
  const page = path.join(dir, 'public', 'proto_index.html');
  let html = await fs.readFile(page, 'utf8');
  html = html.replace('<title>Open IO: Front-End Prototype (Pre-React)</title>', '<title>Open IO — NeonPlay</title>');
  if (!html.includes('name="viewport"')) html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
  if (!html.includes('neonplay-embed.css')) html = html.replace('</head>', '  <link rel="stylesheet" href="css/neonplay-embed.css">\n</head>');
  await fs.writeFile(page, html, 'utf8');
  const css = `html,body{margin:0;min-height:100%;background:#070711;color:#e9f6ff;overflow-x:hidden;font-family:system-ui,sans-serif}body{box-sizing:border-box;display:grid;grid-template-columns:minmax(0,640px) 200px;gap:12px;justify-content:center;align-content:start;padding:16px}#canvas{grid-column:1;grid-row:1;position:relative;left:auto;width:min(640px,calc(100vw - 260px));height:auto;aspect-ratio:1;margin:0;background:#fff;border:1px solid rgba(91,228,255,.45);box-shadow:0 0 35px rgba(27,193,255,.12)}#scoreboard{grid-column:2;grid-row:1;position:relative;left:auto;width:200px;height:400px;margin:0;background:#111a2e;border:1px solid rgba(91,228,255,.3);border-radius:12px}#game_barrier{position:fixed;inset:0;margin:0;z-index:100;width:100%;height:100vh;height:100dvh;box-sizing:border-box;background:rgba(3,5,16,.78);backdrop-filter:blur(8px);display:block}#name_box,#game_over_box{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);box-sizing:border-box;width:min(360px,calc(100vw - 32px));height:150px;margin:0;padding:22px;border:1px solid rgba(91,228,255,.35);border-radius:18px;background:#111a2e;color:#e9f6ff;box-shadow:0 18px 60px rgba(0,0,0,.4)}#game_over_box{height:160px}#player_name{position:static;display:block;box-sizing:border-box;width:100%;margin:6px 0 12px;padding:10px;border:1px solid #3b5475;border-radius:8px;background:#070e1d;color:#fff}#play_button,#restart_button{position:static;display:block;width:100%;height:40px;margin:0;border:0;border-radius:8px;background:linear-gradient(90deg,#29bdf4,#7e65ff);color:#050817;font-weight:800;cursor:pointer}#play_button:focus-visible,#restart_button:focus-visible,#player_name:focus-visible{outline:3px solid #fff;outline-offset:3px}#spriteSheet{display:none!important}@media(max-width:760px){body{grid-template-columns:minmax(0,1fr);gap:8px;padding:8px}#canvas{grid-column:1;grid-row:1;width:min(640px,calc(100vw - 16px));margin:0 auto}#scoreboard{grid-column:1;grid-row:2;width:min(200px,calc(100vw - 16px));height:300px;margin:0 auto}#game_barrier{position:fixed;inset:0;width:100%;height:100vh;height:100dvh}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}\n`;
  await fs.writeFile(path.join(dir, 'public', 'css', 'neonplay-embed.css'), css, 'utf8');
}

async function main() {
  SOURCE_GAMES = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  if (!Array.isArray(SOURCE_GAMES) || !SOURCE_GAMES.length) throw new Error('Manifesto de jogos com servidor vazio ou inválido');
  const ids = new Set();
  for (const g of SOURCE_GAMES) {
    if (!/^[a-z0-9-]+$/.test(g.id) || ids.has(g.id)) throw new Error(`ID de serviço inválido/duplicado: ${g.id}`);
    ids.add(g.id);
    if (!/^[\w.-]+\/[\w.-]+$/.test(g.repo) || !/^[a-f0-9]{40}$/.test(g.commit)) throw new Error(`Repositório/commit inválido: ${g.id}`);
    if (!g.license || g.license === 'NOASSERTION') throw new Error(`Licença pendente de revisão: ${g.id}`);
    if (!['websocket','socket.io'].includes(g.kind) || !/^https:\/\//.test(g.url) || !/^https:\/\//.test(g.healthUrl || '')) throw new Error(`Tipo/URL/healthUrl inválido: ${g.id}`);
  }
  await fs.mkdir(SERVICES, { recursive: true });
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'neonplay-server-games-'));
  const catalogFile = path.join(ROOT, 'games-imported.json');
  try {
    const old = await fs.readFile(catalogFile, 'utf8').then(JSON.parse).catch(() => ({ version: 1, games: [] }));
    const oldById = new Map((old.games || []).map(g => [g.id, g]));
    const catalog = { version: 1, games: (old.games || []).filter(g => !SOURCE_GAMES.some(s => s.id === g.id)) };
    const failures = [];
    for (const game of SOURCE_GAMES) {
      const dest = path.join(SERVICES, game.id);
      try {
        const previousMarker = await fs.readFile(path.join(dest, 'NEONPLAY-INTEGRATION.md'), 'utf8').catch(() => '');
        const previousServer = await fs.stat(path.join(dest, 'server.js')).catch(() => null);
        const previousPackage = await fs.stat(path.join(dest, 'package.json')).catch(() => null);
        const previousLicense = await fs.stat(path.join(dest, 'LICENSE')).catch(() => null);
        const previousInstalled = previousMarker.includes(`Commit importado: ${game.commit}`) && previousMarker.includes(`Revisão do importador: ${IMPORTER_REVISION}`) && previousServer && previousServer.isFile() && previousPackage && previousPackage.isFile() && previousLicense && previousLicense.isFile();
        if (previousInstalled) {
          catalog.games.push({ id: game.id, title: game.title, mode: 'server', category: game.category, label: game.label, icon: game.icon, accent: game.accent, description: game.description, route: `local-game.html?game=${encodeURIComponent(game.id)}`, launchUrl: game.url, healthUrl: game.healthUrl, sourceRepo: game.repo, license: game.license });
          log(`Mantendo instalação verificada do serviço: ${game.title}`);
          continue;
        }
        const extracted = await download(game.repo, game.commit, game.id, temp);
        const next = `${dest}.next`;
        await fs.rm(next, { recursive: true, force: true });
        await copyTree(extracted, next);
        if (game.id === 'two-player-games') await patchTwoPlayerGames(next);
        if (game.id === 'open-io') await patchOpenIO(next);
        const licensePath = await fs.stat(path.join(next, 'LICENSE')).catch(() => null);
        if (!licensePath || !licensePath.isFile()) throw new Error('Arquivo LICENSE ausente');
        await fs.writeFile(path.join(next, 'NEONPLAY-INTEGRATION.md'), `# ${game.title}\n\nFonte: https://github.com/${game.repo}\nCommit importado: ${game.commit}\nRevisão do importador: ${IMPORTER_REVISION}\nLicença declarada: ${game.license}\nTipo: serviço de jogo com backend (${game.kind})\n\nEste serviço é isolado do runtime da homepage. Configuração de deploy em render.yaml na raiz do NeonPlay.\n`, 'utf8');
        await replaceDirectorySafely(next, dest);
        catalog.games.push({ id: game.id, title: game.title, mode: 'server', category: game.category, label: game.label, icon: game.icon, accent: game.accent, description: game.description, route: `local-game.html?game=${encodeURIComponent(game.id)}`, launchUrl: game.url, healthUrl: game.healthUrl, sourceRepo: game.repo, license: game.license });
        log(`Instalado servidor ${game.title}`);
      } catch (err) {
        await fs.rm(`${dest}.next`, { recursive: true, force: true });
        failures.push({ id: game.id, repo: game.repo, error: String(err.message || err) });
        const previous = oldById.get(game.id);
        const hasPreviousService = await fs.stat(path.join(dest, 'package.json')).catch(() => null);
        if (previous && hasPreviousService && hasPreviousService.isFile()) {
          catalog.games.push(previous);
          log(`Mantendo serviço anterior do catálogo: ${game.title}`);
        }
        log(`FALHA em atualização do serviço ${game.id}: ${String(err.message || err)}`);
      }
    }
    if (!catalog.games.length) throw new Error('Nenhum jogo importado para o catálogo');
    await writeJsonIfChanged(catalogFile, catalog);
    await writeJsonIfChanged(path.join(ROOT, 'server-games-import-status.json'), { installed: SOURCE_GAMES.filter(g => catalog.games.some(x => x.id === g.id)).map(g => g.id), failures });
    log(`Catálogo combinado: ${catalog.games.length} títulos; ${SOURCE_GAMES.length - failures.length}/${SOURCE_GAMES.length} servidores multiplayer instalados.`);
    if (failures.length) log('Importação parcial: os serviços com falha ficam registrados em server-games-import-status.json; os demais seguem para deploy.');
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}
if (require.main === module) main().catch(e => { console.error(`[neonplay-server-games] ERRO: ${e.message || e}`); process.exitCode = 1; });
module.exports = { patchTwoPlayerGames, patchOpenIO };
