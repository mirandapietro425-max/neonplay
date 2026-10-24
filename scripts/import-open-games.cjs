#!/usr/bin/env node
'use strict';
/* Downloads pinned, license-checked HTML5 game projects from the repos listed in the user's PDF.
   This runs during integration, so actual game files are committed into games/imported/ before deploy. */
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { downloadAndExtract } = require('./download-github-archive.cjs');
const { writeJsonIfChanged } = require('./write-json-if-changed.cjs');
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'import-games-manifest.json');
const OUTPUT = path.join(ROOT, 'games', 'imported');
const CATALOG = path.join(ROOT, 'games-imported.json');
const FORCE = process.argv.includes('--force');
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
// Bump this only when importer-side transformations require re-extracting unchanged source commits.
const IMPORTER_REVISION = 2;
const ASSISTANT_DEMO_IDS = ['snake','2048','tetris','memory','pong','breakout','tic-tac-toe','connect-four','simon','word-guess','fifteen-puzzle','typing-test'];

function log(message) { process.stdout.write(`[neonplay-import] ${message}\n`); }
async function downloadRepo(game, temp) {
  log(`Baixando arquivos-fonte: ${game.title} (${game.repo})`);
  const result = await downloadAndExtract({
    repo: game.repo, commit: game.commit, id: game.id, temp,
    maxArchiveBytes: MAX_ARCHIVE_BYTES,
    maxExpandedBytes: 256 * 1024 * 1024,
    maxEntries: 25000,
    timeoutMs: 120000
  });
  log(`Archive validado: ${result.entries} entradas, ${(result.expandedBytes / 1024 / 1024).toFixed(1)} MiB expandidos`);
  const entryPath = path.join(result.extract, game.entry);
  const st = await fs.stat(entryPath).catch(() => null);
  if (!st || !st.isFile()) throw new Error(`Entrada principal ausente: ${game.entry}`);
  const licensePath = path.join(result.extract, game.licenseFile);
  const licenseStat = await fs.stat(licensePath).catch(() => null);
  if (!licenseStat || !licenseStat.isFile()) throw new Error(`Arquivo de licença declarado ausente: ${game.licenseFile}`);
  return result;
}
async function copyTree(source, target, excluded, rel='') {
  await fs.mkdir(target, { recursive: true });
  for (const item of await fs.readdir(source, { withFileTypes: true })) {
    const relative = rel ? `${rel}/${item.name}` : item.name;
    const normalized = relative.replace(/\\/g, '/');
    if (item.name === '.git' || item.name === '.github' || excluded.some(x => normalized === x || normalized.startsWith(x + '/'))) continue;
    const from = path.join(source, item.name), to = path.join(target, item.name);
    if (item.isDirectory()) await copyTree(from, to, excluded, relative);
    else if (item.isFile()) await fs.copyFile(from, to);
  }
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
async function main() {
  const games = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  if (!Array.isArray(games) || !games.length) throw new Error('Manifesto de jogos HTML5 vazio ou inválido');
  const uniqueIds = new Set();
  for (const game of games) {
    if (!/^[a-z0-9-]+$/.test(game.id) || uniqueIds.has(game.id)) throw new Error(`ID inválido ou duplicado no manifesto: ${game.id}`);
    uniqueIds.add(game.id);
    if (!/^[\w.-]+\/[\w.-]+$/.test(game.repo) || !/^[a-f0-9]{40}$/.test(game.commit)) throw new Error(`Repositório/commit inválido: ${game.id}`);
    if (!game.license || game.license === 'NOASSERTION') throw new Error(`Licença não confirmada: ${game.id}`);
    if (typeof game.entry !== 'string' || game.entry.includes('..') || path.isAbsolute(game.entry)) throw new Error(`Entrada insegura: ${game.id}`);
    if (typeof game.licenseFile !== 'string' || game.licenseFile.includes('..') || path.isAbsolute(game.licenseFile)) throw new Error(`Caminho de licença inseguro: ${game.id}`);
    if (game.thumbnail && (typeof game.thumbnail !== 'string' || game.thumbnail.includes('..') || path.isAbsolute(game.thumbnail))) throw new Error(`Caminho de capa inseguro: ${game.id}`);
  }
  // Preserve existing multiplayer services before changing the static-game catalog.
  const previousCatalog = await fs.readFile(CATALOG, 'utf8').then(JSON.parse).catch(() => ({ games: [] }));
  const preservedServices = (Array.isArray(previousCatalog.games) ? previousCatalog.games : []).filter(g => g && g.mode === 'server' && !uniqueIds.has(g.id));
  // Do not remove old demo files until every replacement has installed successfully.
  // If the network fails halfway, the currently deployed site must remain recoverable.
  await fs.mkdir(OUTPUT, { recursive: true });
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'neonplay-games-'));
  const installed = [];
  const failed = [];
  try {
    for (const game of games) {
      const destination = path.join(OUTPUT, game.id);
      if (!FORCE) {
        const existing = await fs.stat(path.join(destination, game.entry)).catch(() => null);
        const license = await fs.stat(path.join(destination, game.licenseFile)).catch(() => null);
        const marker = await fs.readFile(path.join(destination, 'NEONPLAY-SOURCE.md'), 'utf8').catch(() => '');
        const current = marker.includes(`Commit importado: ${game.commit}`) && marker.includes(`Revisão do importador: ${IMPORTER_REVISION}`);
        if (existing && existing.isFile() && license && license.isFile() && current) {
          installed.push(await toCatalog(game));
          log(`Mantendo instalação verificada: ${game.title}`);
          continue;
        }
      }
      try {
        if (!/^[a-z0-9-]+$/.test(game.id) || !/^[\w.-]+\/[\w.-]+$/.test(game.repo) || !/^[a-f0-9]{40}$/.test(game.commit)) throw new Error('Identificador do manifesto inválido');
        const { extract } = await downloadRepo(game, temp);
        const next = `${destination}.next`;
        await fs.rm(next, { recursive: true, force: true });
        await copyTree(extract, next, game.exclude || []);
        if (game.id === 'arashi') {
          const entryFile = path.join(next, game.entry);
          let html = await fs.readFile(entryFile, 'utf8');
          html = html.replace('http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.js', 'https://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.js');
          if (/http:\/\/ajax\.googleapis\.com\/ajax\/libs\/jquery\/1\.4\/jquery\.js/i.test(html)) throw new Error('Não foi possível corrigir a dependência HTTP do Arashi');
          await fs.writeFile(entryFile, html, 'utf8');
        }
        await fs.writeFile(path.join(next, 'NEONPLAY-SOURCE.md'), `# ${game.title}\n\nFonte: https://github.com/${game.repo}\nCommit importado: ${game.commit}\nRevisão do importador: ${IMPORTER_REVISION}\nLicença declarada no GitHub: ${game.license}\n\nOs arquivos deste diretório foram importados do repositório original. Consulte o arquivo de licença incluído no repositório para os termos completos e respeite eventuais avisos de terceiros.\n`, 'utf8');
        await replaceDirectorySafely(next, destination);
        installed.push(await toCatalog(game));
        log(`Instalado no servidor: ${game.title}`);
      } catch (error) {
        await fs.rm(`${destination}.next`, { recursive: true, force: true });
        failed.push({ id: game.id, title: game.title, error: String(error.message || error) });
        const previousEntry = await fs.stat(path.join(destination, game.entry)).catch(() => null);
        if (previousEntry && previousEntry.isFile()) {
          installed.push(await toCatalog(game));
          log(`Mantendo versão anterior que já existia: ${game.title}`);
        }
        log(`FALHA em atualização de ${game.title}: ${String(error.message || error)}`);
      }
    }
    if (!installed.length) throw new Error('Nenhum jogo foi importado. Confira o acesso de rede do ambiente de instalação.');
    const catalog = { version: 1, games: [...installed, ...preservedServices] };
    await writeJsonIfChanged(CATALOG, catalog);
    if (failed.length) await writeJsonIfChanged(path.join(ROOT, 'games-import-failures.json'), failed);
    else await fs.rm(path.join(ROOT, 'games-import-failures.json'), { force: true });
    const removedDemos = await cleanupAssistantDemos(ROOT, failed);
    if (!removedDemos && failed.length) log('Jogos de demonstração antigos foram mantidos temporariamente porque a importação foi parcial; serão removidos quando o lote inteiro instalar sem falhas.');
    log(`Concluído: ${installed.length}/${games.length} jogos HTML5 locais instalados; ${preservedServices.length} serviços multiplayer preservados.`);
    if (failed.length) log(`${failed.length} repositório(s) falharam; ver games-import-failures.json.`);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
async function toCatalog(game) {
  const localPath = `/games/imported/${game.id}/${game.entry}`;
  const thumbnailExists = game.thumbnail && await fs.stat(path.join(OUTPUT, game.id, game.thumbnail)).then(s => s.isFile()).catch(() => false);
  return { id: game.id, title: game.title, category: game.category, label: game.label, icon: game.icon, accent: game.accent, description: game.description, entry: game.entry, thumbnail: thumbnailExists ? `/games/imported/${game.id}/${game.thumbnail.split(path.sep).join('/')}` : null, route: `local-game.html?game=${encodeURIComponent(game.id)}`, localPath };
}
async function cleanupAssistantDemos(root, failed = []) {
  if (failed.length) return false;
  const demoRoot = path.join(root, 'games');
  // These are only the 12 IDs used by the earlier assistant-made demo pack.
  // The replacement games live under games/imported/<id> and are never touched here.
  for (const id of ASSISTANT_DEMO_IDS) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`ID de demonstração inseguro: ${id}`);
    await fs.rm(path.join(demoRoot, id), { recursive: true, force: true });
  }
  await fs.rm(path.join(root, 'games.json'), { force: true });
  return true;
}

if (require.main === module) main().catch(error => { console.error(`[neonplay-import] ERRO: ${error.message || error}`); process.exitCode = 1; });
module.exports = { cleanupAssistantDemos };
