#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { assertSafeEntries, inspectArchive } = require('./download-github-archive.cjs');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'np-safe-archive-test-'));
  try {
    assert.throws(() => assertSafeEntries(['/etc/passwd']), /única pasta raiz|Caminho inválido/);
    assert.throws(() => assertSafeEntries(['repo/../../outside']), /Caminho inseguro/);
    assert.throws(() => assertSafeEntries(['repo/index.html', '../outside']), /Caminho inseguro/);
    assert.throws(() => assertSafeEntries(['repo/file\nname']), /Caminho inválido/);

    const safeRoot = path.join(temp, 'safe-repo');
    await fs.mkdir(safeRoot, { recursive: true });
    await fs.writeFile(path.join(safeRoot, 'index.html'), '<!doctype html><title>OK</title>');
    await fs.writeFile(path.join(safeRoot, 'LICENSE'), 'MIT');
    const safeArchive = path.join(temp, 'safe.tar.gz');
    execFileSync('tar', ['-czf', safeArchive, '-C', temp, 'safe-repo']);
    const validated = inspectArchive(safeArchive, { maxExpandedBytes: 1024 * 1024 });
    assert.ok(validated.entries >= 3);
    assert.ok(validated.expandedBytes > 0);
    assert.throws(() => inspectArchive(safeArchive, { maxExpandedBytes: 4 }), /limite de expansão/);

    const linkedRoot = path.join(temp, 'linked-repo');
    await fs.mkdir(linkedRoot, { recursive: true });
    await fs.writeFile(path.join(linkedRoot, 'index.html'), 'ok');
    await fs.symlink('/etc/passwd', path.join(linkedRoot, 'escape.txt'));
    const linkedArchive = path.join(temp, 'linked.tar.gz');
    execFileSync('tar', ['-czf', linkedArchive, '-C', temp, 'linked-repo']);
    assert.throws(() => inspectArchive(linkedArchive), /link ou tipo de arquivo não permitido/);
    console.log('OK: validador de archives bloqueia traversal, links/special files, excesso de entradas e expansão excessiva.');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(`[test-download-github-archive] ${error.stack || error}`); process.exitCode = 1; });
