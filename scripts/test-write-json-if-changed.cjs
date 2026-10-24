#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { writeJsonIfChanged } = require('./write-json-if-changed.cjs');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'neonplay-stable-json-'));
  try {
    const file = path.join(temp, 'nested', 'catalog.json');
    const data = { version: 1, games: [{ id: 'game-a' }] };
    assert.equal(await writeJsonIfChanged(file, data), true);
    const before = await fs.readFile(file, 'utf8');
    assert.equal(await writeJsonIfChanged(file, data), false);
    assert.equal(await fs.readFile(file, 'utf8'), before);
    console.log('OK: catálogos idênticos não são regravados; reruns não geram commits por timestamp volátil.');
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
})().catch(err => { console.error(`[test-write-json-if-changed] ${err.stack || err}`); process.exitCode = 1; });
