#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
function assert(ok, msg) { if (!ok) throw new Error(msg); }
function unique(items, label) {
  const seen = new Set();
  for (const item of items) { assert(!seen.has(item), `${label} duplicado: ${item}`); seen.add(item); }
}
const local = read('import-games-manifest.json');
const servers = read('server-games-manifest.json');
const backlog = read('server-games-backlog.json').games;
assert(Array.isArray(local) && local.length > 0, 'Manifesto de jogos HTML5 estático está vazio.');
assert(Array.isArray(servers) && servers.length > 0, 'Manifesto de serviços está vazio.');
assert(Array.isArray(backlog), 'Fila de serviços futuros inválida.');
for (const g of local) {
  assert(/^[a-z0-9-]+$/.test(g.id), `id inválido: ${g.id}`);
  assert(/^[\w.-]+\/[\w.-]+$/.test(g.repo), `repo inválido: ${g.repo}`);
  assert(/^[a-f0-9]{40}$/.test(g.commit), `commit não fixado: ${g.id}`);
  assert(g.license && g.license !== 'NOASSERTION', `licença precisa de revisão explícita: ${g.id}`);
  assert(typeof g.entry === 'string' && !g.entry.includes('..') && !path.isAbsolute(g.entry), `entry insegura: ${g.id}`);
  assert(typeof g.licenseFile === 'string' && !g.licenseFile.includes('..') && !path.isAbsolute(g.licenseFile), `licenseFile inseguro: ${g.id}`);
}
for (const g of servers) {
  assert(/^[a-z0-9-]+$/.test(g.id), `id de serviço inválido: ${g.id}`);
  assert(/^[\w.-]+\/[\w.-]+$/.test(g.repo), `repo de serviço inválido: ${g.repo}`);
  assert(/^[a-f0-9]{40}$/.test(g.commit), `commit de serviço não fixado: ${g.id}`);
  assert(g.license && g.license !== 'NOASSERTION', `licença de serviço precisa de revisão explícita: ${g.id}`);
  assert(['websocket','socket.io'].includes(g.kind), `tipo de serviço desconhecido: ${g.kind}`);
  assert(new URL(g.url).protocol === 'https:', `URL pública precisa ser HTTPS: ${g.id}`);
  assert(new URL(g.healthUrl).protocol === 'https:', `healthUrl precisa ser HTTPS: ${g.id}`);
}
unique(local.map(x => x.id), 'ID de jogo local');
unique(servers.map(x => x.id), 'ID de serviço');
unique([...local.map(x => x.id), ...servers.map(x => x.id)], 'ID combinado');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let homepageLoadsCatalog = homepage.includes("fetch('/games-imported.json'");
const externalCatalogScript = homepage.match(/<script\b[^>]*src=["']([^"']*np-r24-local-catalog\.js(?:\?[^"']*)?)["'][^>]*>/i);
if (!homepageLoadsCatalog && externalCatalogScript) {
  const scriptPath = path.join(root, externalCatalogScript[1].replace(/[?#].*$/, '').replace(/^\/+/, ''));
  homepageLoadsCatalog = fs.existsSync(scriptPath) && fs.readFileSync(scriptPath, 'utf8').includes("fetch('/games-imported.json'");
}
assert(homepageLoadsCatalog, 'Homepage não tem carregador do catálogo instalado.');
assert(fs.readFileSync(path.join(root, 'local-game.html'), 'utf8').includes("fetch('/games-imported.json'"), 'Player não carrega o catálogo instalado.');
assert(fs.existsSync(path.join(root, '.github/workflows/import-open-games.yml')), 'Workflow de importação ausente.');
assert(fs.existsSync(path.join(root, 'scripts/download-github-archive.cjs')), 'Validador seguro de archives ausente.');
assert(fs.existsSync(path.join(root, 'scripts/test-download-github-archive.cjs')), 'Teste do validador de archives ausente.');
assert(fs.existsSync(path.join(root, 'scripts/write-json-if-changed.cjs')), 'Escrita idempotente de JSON ausente.');
assert(fs.existsSync(path.join(root, 'scripts/test-write-json-if-changed.cjs')), 'Teste de idempotência de JSON ausente.');
const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
assert((render.match(/^  - type: web$/gm) || []).length === servers.length, 'Render precisa declarar exatamente um serviço por backend do manifesto; a homepage deve continuar na Vercel.');
for (const g of servers) assert(render.includes(`name: neonplay-${g.id}`), `Serviço Render ausente para ${g.id}`);
assert(local.some(g => g.id === 'custom-tetris'), 'Custom Tetris do PDF não está no lote estático.');
assert(local.some(g => g.id === 'arashi'), 'Arashi, com licença GPL-2.0, não está no lote estático.');
assert(backlog.some(g => g.id === 'raging-gardens'), 'Raging Gardens com dependência PHP não está na fila de backend.');
console.log(`OK: ${local.length} jogos HTML5, ${servers.length} backends no primeiro lote e ${backlog.length} itens na fila de integração. Render contém apenas os backends multiplayer.`);
