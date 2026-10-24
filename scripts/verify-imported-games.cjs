#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const local = read('import-games-manifest.json');
const services = read('server-games-manifest.json');
const cat = read('games-imported.json');
const failures = fs.existsSync(path.join(root, 'games-import-failures.json')) ? read('games-import-failures.json') : [];
const serviceStatus = fs.existsSync(path.join(root, 'server-games-import-status.json')) ? read('server-games-import-status.json') : { failures: [] };
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(cat && Array.isArray(cat.games), 'games-imported.json precisa conter um array games.');
const ids = cat.games.map(g => g.id);
assert(new Set(ids).size === ids.length, 'O catálogo instalado contém IDs duplicados.');
for (const game of cat.games) {
  assert(typeof game.route === 'string' && game.route.startsWith('local-game.html?game='), `Rota inválida para ${game.id}`);
  if (game.mode === 'server') {
    const dir = path.join(root, 'services', game.id);
    assert(fs.existsSync(path.join(dir, 'server.js')), `Server.js ausente para o serviço ${game.id}`);
    assert(fs.existsSync(path.join(dir, 'package.json')), `package.json ausente para o serviço ${game.id}`);
    assert(fs.existsSync(path.join(dir, 'LICENSE')), `LICENSE ausente para o serviço ${game.id}`);
    assert(typeof game.launchUrl === 'string' && /^https:\/\//.test(game.launchUrl), `URL de lançamento inválida para ${game.id}`);
    assert(typeof game.healthUrl === 'string' && /^https:\/\//.test(game.healthUrl), `healthUrl ausente para ${game.id}`);
  } else {
    const manifest = local.find(g => g.id === game.id);
    assert(manifest, `Jogo local fora do manifesto: ${game.id}`);
    const dir = path.join(root, 'games', 'imported', game.id);
    assert(fs.existsSync(path.join(dir, manifest.entry)), `Entrada não encontrada: ${game.id}/${manifest.entry}`);
    assert(fs.existsSync(path.join(dir, manifest.licenseFile)), `Licença não encontrada: ${game.id}/${manifest.licenseFile}`);
    if (game.thumbnail) assert(fs.existsSync(path.join(root, game.thumbnail.replace(/^\//, ''))), `Capa declarada ausente: ${game.id}`);
  }
}
const failedServiceIds = new Set((serviceStatus.failures || []).map(f => f.id));
for (const game of services) {
  if (!ids.includes(game.id) && failedServiceIds.has(game.id)) {
    console.warn(`Aviso: backend ${game.id} não foi importado e está registrado como falha; os outros jogos poderão seguir.`);
    continue;
  }
  assert(ids.includes(game.id), `Backend obrigatório ausente sem falha registrada: ${game.id}`);
  const dir = path.join(root, 'services', game.id);
  assert(fs.existsSync(dir), `Pasta ausente para o backend ${game.id}`);
}
const missingStatic = local.filter(g => !ids.includes(g.id));
const failedIds = new Set(failures.map(f => f.id));
const undocumentedMissing = missingStatic.filter(g => !failedIds.has(g.id));
assert(!undocumentedMissing.length, `Jogos estáticos ausentes sem falha registrada: ${undocumentedMissing.map(g => g.id).join(', ')}`);
if ((serviceStatus.failures || []).length) console.warn(`Aviso: ${serviceStatus.failures.length} backend(s) não importado(s): ${serviceStatus.failures.map(f => `${f.id}: ${f.error}`).join('; ')}`);
console.log(`OK: ${cat.games.length} jogos no catálogo; ${ids.filter(id => services.some(s => s.id === id)).length}/${services.length} backends; ${local.length - missingStatic.length}/${local.length} jogos HTML5 instalados.`);
if (missingStatic.length) console.warn(`Aviso: falhas de importação estática registradas: ${missingStatic.map(g => g.id).join(', ')}`);
