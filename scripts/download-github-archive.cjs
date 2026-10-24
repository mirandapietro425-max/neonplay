#!/usr/bin/env node
'use strict';
/* Safe, size-bounded GitHub source archive downloader shared by both importers. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function assertSafeEntries(entries, { maxEntries = 25000 } = {}) {
  if (!Array.isArray(entries) || !entries.length) throw new Error('O archive não contém arquivos.');
  if (entries.length > maxEntries) throw new Error(`Archive excede o limite de ${maxEntries} entradas.`);
  const normalized = entries.map(raw => {
    const entry = String(raw).replace(/\\/g, '/');
    if (!entry || entry.startsWith('/') || /^[a-zA-Z]:/.test(entry) || /[\x00-\x1f\x7f]/.test(entry)) {
      throw new Error(`Caminho inválido no archive: ${JSON.stringify(raw)}`);
    }
    const parts = entry.split('/').filter((part, i) => !(i === entry.split('/').length - 1 && part === ''));
    if (!parts.length || parts.some(part => part === '.' || part === '..')) {
      throw new Error(`Caminho inseguro no archive: ${JSON.stringify(raw)}`);
    }
    return parts.join('/');
  });
  const root = normalized[0].split('/')[0];
  if (!root || normalized.some(p => p.split('/')[0] !== root)) {
    throw new Error('O archive precisa ter uma única pasta raiz.');
  }
  return normalized;
}

function inspectArchive(archivePath, { maxEntries = 25000, maxExpandedBytes = 256 * 1024 * 1024 } = {}) {
  const listing = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const entries = listing.split(/\r?\n/).filter(Boolean);
  assertSafeEntries(entries, { maxEntries });

  // Reject symbolic/hard links and special devices before extraction. These games only
  // need ordinary files and directories; rejecting links avoids tar path/link escapes.
  const verbose = execFileSync('tar', ['-tvzf', archivePath], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const lines = verbose.split(/\r?\n/).filter(Boolean);
  if (lines.length !== entries.length) throw new Error('Não foi possível validar todas as entradas do archive.');
  let expandedBytes = 0;
  for (const line of lines) {
    const mode = line[0];
    if (mode !== '-' && mode !== 'd') throw new Error(`Archive contém link ou tipo de arquivo não permitido: ${line.slice(0, 120)}`);
    // GNU tar: mode owner/group size date time path
    const match = line.match(/^[\-d]\S{9}\s+\S+\s+(\d+)\s+/);
    if (!match) throw new Error(`Metadados inesperados no archive: ${line.slice(0, 120)}`);
    expandedBytes += Number(match[1]);
    if (!Number.isSafeInteger(expandedBytes) || expandedBytes > maxExpandedBytes) {
      throw new Error(`Archive excede o limite de expansão de ${maxExpandedBytes} bytes.`);
    }
  }
  return { entries: entries.length, expandedBytes };
}

async function downloadToFile(url, destination, { maxArchiveBytes, timeoutMs = 120000, userAgent = 'NeonPlay-Game-Importer/1.0' }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow', signal: controller.signal,
      headers: { 'user-agent': userAgent, 'accept-encoding': 'identity' }
    });
    if (!response.ok) throw new Error(`Download falhou: HTTP ${response.status}`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxArchiveBytes) throw new Error(`Archive maior que o limite de ${maxArchiveBytes} bytes.`);
    if (!response.body) throw new Error('O servidor não forneceu um corpo de download.');
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      size += buffer.length;
      if (size > maxArchiveBytes) {
        controller.abort();
        throw new Error(`Download ultrapassou o limite de ${maxArchiveBytes} bytes.`);
      }
      chunks.push(buffer);
    }
    if (size < 128) throw new Error(`Archive pequeno demais ou inválido (${size} bytes).`);
    await fs.writeFile(destination, Buffer.concat(chunks, size), { flag: 'wx' });
    return size;
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadAndExtract({ repo, commit, id, temp, maxArchiveBytes, maxExpandedBytes = 256 * 1024 * 1024, maxEntries = 25000, timeoutMs = 120000 }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[a-f0-9]{40}$/.test(commit) || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error('Identificador de repositório inválido para download.');
  }
  const archive = path.join(temp, `${id}.tar.gz`);
  const url = `https://codeload.github.com/${repo}/tar.gz/${commit}`;
  const size = await downloadToFile(url, archive, { maxArchiveBytes, timeoutMs, userAgent: 'NeonPlay-Game-Importer/1.0' });
  const validation = inspectArchive(archive, { maxEntries, maxExpandedBytes });
  const extract = path.join(temp, id);
  await fs.mkdir(extract, { recursive: true });
  execFileSync('tar', ['-xzf', archive, '-C', extract, '--strip-components=1', '--no-same-owner', '--no-same-permissions', '--no-overwrite-dir'], { stdio: 'ignore', maxBuffer: 32 * 1024 * 1024 });
  return { archive, extract, size, ...validation };
}

module.exports = { assertSafeEntries, inspectArchive, downloadAndExtract };
