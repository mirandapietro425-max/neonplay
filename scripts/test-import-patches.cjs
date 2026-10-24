#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { patchOpenIO, patchTwoPlayerGames } = require('./import-server-games.cjs');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'neonplay-patches-test-'));
  try {
    const open = path.join(temp, 'open-io');
    await fs.mkdir(path.join(open, 'public', 'css'), { recursive: true });
    await fs.writeFile(path.join(open, 'server.js'), [
      "var express = require('express');", "var app = express();", "var server = require('http').Server(app);",
      "var io = require('socket.io').listen(server);", "app.use(express.static(__dirname + '/public'));",
      "server.listen(8081, function () {", "  console.log('Listening');", "});"
    ].join('\n'));
    await fs.writeFile(path.join(open, 'package-lock.json'), '{}');
    await fs.writeFile(path.join(open, 'public', 'proto_index.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Open IO: Front-End Prototype (Pre-React)</title><link rel="stylesheet" href="css/proto_style.css"></head><body><canvas id="canvas"></canvas><canvas id="scoreboard"></canvas><div id="game_barrier"><div id="name_box"><input id="player_name"><button id="play_button">Play</button></div><div id="game_over_box"><button id="restart_button">Restart</button></div></div></body></html>');
    await patchOpenIO(open);
    const osrc = await fs.readFile(path.join(open, 'server.js'), 'utf8');
    assert.match(osrc, /new \(require\('socket\.io'\)\.Server\)\(server\)/);
    assert.match(osrc, /server\.listen\(Number\(process\.env\.PORT \|\| 8081\), function/);
    assert.match(osrc, /app\.get\('\/health'/);
    assert.match(osrc, /Access-Control-Allow-Origin/);
    assert.match(osrc, /ALLOWED_ORIGINS/);
    const openSyntax = spawnSync(process.execPath, ['--check', path.join(open, 'server.js')], { encoding: 'utf8' });
    assert.equal(openSyntax.status, 0, `server.js Open IO inválido: ${openSyntax.stderr}`);
    const opkg = JSON.parse(await fs.readFile(path.join(open, 'package.json'), 'utf8'));
    assert.equal(opkg.dependencies.express, '4.21.2');
    assert.equal(opkg.dependencies['socket.io'], '4.8.1');
    await assert.rejects(fs.stat(path.join(open, 'package-lock.json')));
    const page = await fs.readFile(path.join(open, 'public', 'proto_index.html'), 'utf8');
    assert.match(page, /name="viewport"/);
    assert.match(page, /css\/neonplay-embed\.css/);
    assert.match(page, /<title>Open IO — NeonPlay<\/title>/);
    const css = await fs.readFile(path.join(open, 'public', 'css', 'neonplay-embed.css'), 'utf8');
    assert.match(css, /@media\(max-width:760px\)/);
    assert.match(css, /#game_barrier\{position:fixed/);

    const two = path.join(temp, 'two-player');
    await fs.mkdir(two, { recursive: true });
    await fs.writeFile(path.join(two, 'server.js'), `const ALLOWED_ORIGINS = ["https://zapgame.com.br"];\nconst urlPath = "/health";\nconst req = { headers: { origin: "https://zapgame.com.br" }, method: "GET" };\nconst res = { setHeader() {} };\nconst sendJson = () => {};\n  if (urlPath === "/health") {\n  if (req.method !== "GET") { return sendJson(res, 405, {}); }\n  return sendJson(res, 200, { ok: true });\n}\nconst CSP = [\n  "frame-ancestors 'self'",\n];\nconst headers = {\n      "X-Frame-Options": "SAMEORIGIN",\n};`);
    await fs.writeFile(path.join(two, 'index.html'), '<!doctype html><html><head></head><body><header class="app-header"></header><main id="app"></main></body></html>');
    await patchTwoPlayerGames(two);
    const tsrc = await fs.readFile(path.join(two, 'server.js'), 'utf8');
    assert.match(tsrc, /frame-ancestors 'self' https:\/\/zapgame\.com\.br/);
    assert.doesNotMatch(tsrc, /"X-Frame-Options": "SAMEORIGIN"/);
    assert.match(tsrc, /ALLOWED_ORIGINS\.includes\(origin\)/);
    assert.match(tsrc, /Access-Control-Allow-Origin/);
    const twoSyntax = spawnSync(process.execPath, ['--check', path.join(two, 'server.js')], { encoding: 'utf8' });
    assert.equal(twoSyntax.status, 0, `server.js TwoPlayerGames inválido: ${twoSyntax.stderr}`);
    const tpage = await fs.readFile(path.join(two, 'index.html'), 'utf8');
    assert.match(tpage, /neonplay-embed-mode/);
    assert.match(await fs.readFile(path.join(two, 'js', 'neonplay-embed.js'), 'utf8'), /URLSearchParams/);
    console.log('OK: patchers dos dois backends (PORT, health, package, HTML responsivo, CSP/iframe) passaram nos fixtures.');
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
})().catch(err => { console.error(`[test-import-patches] ${err.stack || err}`); process.exitCode = 1; });
