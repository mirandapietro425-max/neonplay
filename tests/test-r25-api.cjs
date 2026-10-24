'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const gamesHandler = require('../api/games.js');
const coverHandler = require('../api/cover.js');

function invoke(handler, url, method) {
  const headers = {};
  const res = {
    statusCode: 200, body: '', headers,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value) { if (value != null) this.body = String(value); }
  };
  return Promise.resolve(handler({ method: method || 'GET', url }, res)).then(() => res);
}
(async function () {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'neonplay-r25-api-'));
  const oldCwd = process.cwd();
  const oldEnv = process.env.GAMEPIX_SID;
  const oldFetch = global.fetch;
  fs.writeFileSync(path.join(root, 'games-imported.json'), JSON.stringify({ games: [
    { id: 'local-demo', title: 'Local Demo', category: 'arcade', label: 'Arcade', route: 'local-game.html?game=local-demo', localPath: '/games/imported/local-demo/index.html', icon: '🎮' }
  ] }));
  process.chdir(root);
  delete process.env.GAMEPIX_SID;
  global.fetch = async function (url) {
    const u = new URL(String(url));
    if (u.hostname === 'raw.githubusercontent.com') return { ok: true, status: 200, async json() { return { games: [
      { slug: 'snake-source', name: 'Snake Source', category: 'arcade', path: 'games/arcade/snake-source/index.html', description: 'Test game', tags: ['snake'] }
    ] }; } };
    if (u.hostname === 'games.gamepix.com') return { ok: true, status: 200, async json() { return { games: [
      { id: 'madalin-stunt', title: 'Madalin Stunt Cars 2', category: 'Racing', thumbnailUrl: 'https://cdn.gamepix.com/cover/madalin.png', url: 'https://games.gamepix.com/play/madalin-stunt' }
    ] }; } };
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const noSidResponse = await invoke(gamesHandler, '/api/games');
    const noSidPayload = JSON.parse(noSidResponse.body);
    assert.equal(noSidPayload.sources.gamepixConfigured, false);
    assert.equal(noSidPayload.sources.gamepix, 0, 'GamePix feed is not called with a fabricated SID');
    assert.equal(noSidPayload.sources.sausi, 1);
    assert.equal(noSidPayload.sources.browserGames, 9);
    process.env.GAMEPIX_SID = 'UNIT_TEST_SID';
    const response = await invoke(gamesHandler, '/api/games');
    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'], /application\/json/);
    const payload = JSON.parse(response.body);
    assert.equal(payload.sources.local, 1);
    assert.equal(payload.sources.browserGames, 9);
    assert.equal(payload.sources.sausi, 1);
    assert.equal(payload.sources.gamepix, 1);
    assert.equal(payload.sources.gamepixConfigured, true);
    assert.ok(payload.games.some(g => g.source === 'sausi' && g.route.includes('snake-source')));
    const pix = await invoke(gamesHandler, '/api/games?source=gamepix&id=madalin-stunt');
    const selected = JSON.parse(pix.body);
    assert.equal(selected.count, 1);
    assert.equal(selected.games[0].launchUrl, 'https://games.gamepix.com/play/madalin-stunt?sid=UNIT_TEST_SID');
    assert.equal(selected.games[0].thumbnail, 'https://cdn.gamepix.com/cover/madalin.png');
    const cover = await invoke(coverHandler, '/api/cover?title=%3Cscript%3Ealert%281%29%3C%2Fscript%3E&category=puzzle');
    assert.equal(cover.statusCode, 200);
    assert.match(cover.headers['content-type'], /image\/svg\+xml/);
    assert.doesNotMatch(cover.body, /<script>/i);
    assert.match(cover.body, /&lt;script&gt;/i);
    const method = await invoke(gamesHandler, '/api/games', 'POST');
    assert.equal(method.statusCode, 405);
    console.log('OK test-r25-api: local + 9 Browser Games + mocked Sausi + mocked GamePix, SID tracking, SVG escaping and method guard.');
  } finally {
    process.chdir(oldCwd);
    if (oldEnv == null) delete process.env.GAMEPIX_SID; else process.env.GAMEPIX_SID = oldEnv;
    global.fetch = oldFetch;
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(err => { console.error(err); process.exit(1); });
