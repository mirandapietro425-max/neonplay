#!/usr/bin/env node
'use strict';
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(err => err ? reject(err) : resolve(port)); });
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
(async () => {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  try {
    let healthy = false;
    for (let i = 0; i < 40; i++) {
      if (child.exitCode !== null) throw new Error(`Servidor encerrou prematuramente (${child.exitCode})`);
      try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok && (await r.json()).ok) { healthy = true; break; } } catch {}
      await sleep(150);
    }
    if (!healthy) throw new Error('Servidor não iniciou ou /api/health falhou.');
    const checks = [
      ['/', 200, 'text/html'], ['/index.html', 200, 'text/html'], ['/local-game.html', 200, 'text/html'],
      ['/games-imported.json', 200, 'application/json'], ['/api/games', 200, 'application/json'],
      ['/api/health', 200, 'application/json'], ['/definitely-not-here-neonplay', 404, null]
    ];
    for (const [url, expected, type] of checks) {
      const r = await fetch(`http://127.0.0.1:${port}${url}`);
      if (r.status !== expected) throw new Error(`${url}: esperado HTTP ${expected}, recebido ${r.status}`);
      if (type && !(r.headers.get('content-type') || '').includes(type)) throw new Error(`${url}: Content-Type inesperado ${r.headers.get('content-type')}`);
      if (url === '/api/games') { const data = await r.json(); if (!Array.isArray(data.games)) throw new Error('/api/games não devolveu games[].'); }
    }
    const post = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST' });
    if (post.status !== 405) throw new Error(`POST deve ser bloqueado com 405, recebido ${post.status}`);
    console.log(`OK: smoke HTTP (${checks.length} rotas, POST bloqueado) em porta ${port}.`);
  } finally { child.kill('SIGTERM'); }
})().catch(e => { console.error(`[smoke-server] ${e.message || e}`); process.exitCode = 1; });
