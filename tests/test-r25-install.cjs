'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const localCatalog = read('np-r24-local-catalog.js');
const externalCatalog = read('np-r25-catalog.js');
const externalCss = read('np-r25-api.css');
const imported = JSON.parse(read('games-imported.json'));

assert.match(html, /id="grid"/, 'the current local catalog grid remains in place');
assert.match(html, /id="local-filters"/, 'the current local category filters remain in place');
assert.match(html, /id="np-r24-featured"/, 'the current featured-games container remains in place');
assert.match(html, /np-r24-local-catalog\.js\?v=r24/, 'the original R24 catalog loader remains active');
assert.match(html, /np-r24-local-catalog\.css\?v=r24/, 'the original R24 styles remain active');
assert.match(html, /id="np-local-games"/, 'the separate external catalog section is installed');
assert.match(html, /id="np-local-grid"/, 'the external catalog has its own grid');
assert.match(html, /id="np-local-status"/, 'the external source status is announced');
assert.match(html, /np-r25-catalog\.js\?v=r25/, 'the external catalog loader is installed');
assert.match(html, /np-r25-api\.css\?v=r25/, 'the external catalog styles are installed');
assert.doesNotMatch(html, /class="[^"]*\bnp-local-games\b/, 'the external section avoids the old R24 hide rule');

assert.match(localCatalog, /function updateFavoriteButtons\(/, 'R24 favorites remain implemented');
assert.match(localCatalog, /function buildFilters\(/, 'R24 category filtering remains implemented');
assert.match(localCatalog, /function render\(gamesList\)/, 'R24 local rendering remains implemented');
assert.match(externalCatalog, /game\.source !== 'local'/, 'the API panel excludes local games to prevent duplication');
assert.match(externalCatalog, /API indisponível|Fontes externas indisponíveis/, 'external API failures do not replace the local catalog');
assert.doesNotMatch(externalCatalog, /repairLegacyCovers\([^)]*\);/, 'the R25 panel does not rewrite local R24 covers');
assert.match(read('api/games.js'), /api-game\.html\?source=/, 'external games use the unified game page');
assert.match(externalCss, /#np-local-grid/, 'the external grid has isolated responsive styling');

assert.ok(Array.isArray(imported.games) && imported.games.length > 0, 'the current installed-game manifest remains available');
for (const file of ['api/games.js', 'api/cover.js', 'api-game.html']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} is included`);
}
console.log(`OK test-r25-install: R24 local catalog, featured games, filters and favorites stay intact; R25 external panel is isolated (${imported.games.length} local games in manifest).`);
