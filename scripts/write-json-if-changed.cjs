'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

async function writeJsonIfChanged(filePath, value) {
  const next = JSON.stringify(value, null, 2) + '\n';
  const current = await fs.readFile(filePath, 'utf8').catch(() => null);
  if (current === next) return false;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, next, 'utf8');
  return true;
}

module.exports = { writeJsonIfChanged };
