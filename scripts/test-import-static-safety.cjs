#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { cleanupAssistantDemos } = require('./import-open-games.cjs');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'neonplay-import-safety-'));
  try {
    const games = path.join(temp, 'games');
    await fs.mkdir(path.join(games, 'snake'), { recursive: true });
    await fs.mkdir(path.join(games, '2048'), { recursive: true });
    await fs.mkdir(path.join(games, 'imported', '2048'), { recursive: true });
    await fs.writeFile(path.join(games, 'snake', 'index.html'), 'previous demo');
    await fs.writeFile(path.join(games, '2048', 'index.html'), 'previous demo');
    await fs.writeFile(path.join(games, 'imported', '2048', 'index.html'), 'real imported game');
    await fs.writeFile(path.join(temp, 'games.json'), '{"demo":true}\n');

    assert.equal(await cleanupAssistantDemos(temp, [{ id: 'hexgl', error: 'network unavailable' }]), false);
    assert.equal(await fs.readFile(path.join(games, 'snake', 'index.html'), 'utf8'), 'previous demo');
    assert.equal(await fs.readFile(path.join(temp, 'games.json'), 'utf8'), '{"demo":true}\n');

    assert.equal(await cleanupAssistantDemos(temp, []), true);
    await assert.rejects(fs.stat(path.join(games, 'snake')));
    await assert.rejects(fs.stat(path.join(games, '2048')));
    assert.equal(await fs.readFile(path.join(games, 'imported', '2048', 'index.html'), 'utf8'), 'real imported game');
    await assert.rejects(fs.stat(path.join(temp, 'games.json')));
    console.log('OK: a importação parcial preserva o site atual; lote completo remove só os demos identificados e mantém games/imported.');
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
})().catch(err => { console.error(`[test-import-static-safety] ${err.stack || err}`); process.exitCode = 1; });
