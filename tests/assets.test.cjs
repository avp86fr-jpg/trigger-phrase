const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildAliases, output } = require('../scripts/build-asset-aliases.cjs');
const root = path.resolve(__dirname, '..');

const { engine } = require('./engine-harness.cjs');

test('generated aliases match current art, and every alias is byte-identical', () => {
  const aliases = buildAliases();
  assert.equal(fs.readFileSync(path.join(root, 'src/asset-aliases.js'), 'utf8'), output(aliases));
  assert.ok(Object.keys(aliases).length > 0);
  for (const [alias, canonical] of Object.entries(aliases)) {
    assert.deepEqual(fs.readFileSync(path.join(root, alias)), fs.readFileSync(path.join(root, canonical)));
    assert.equal(aliases[canonical], undefined, 'aliases must be direct, not chains');
  }
});

test('identical pose keys share one request and one decoded raster, including later calls', async () => {
  const e = engine();
  const a = await Promise.all([e.ensureKey('enemy_woods'), e.ensureKey('enemy_woods_pidle')]);
  assert.ok(a[0]);
  assert.equal(a[0], a[1]);
  assert.equal(e.requests.length, 1);
  await e.ensureKey('enemy_woods');
  assert.equal(e.requests.length, 1);
});

test('a synchronous failed image settles and a later visit retries successfully', async () => {
  let failing = true;
  const e = engine({ fail: () => failing });
  assert.equal(await e.ensureKey('enemy_woods'), null);
  failing = false;
  assert.ok(await e.ensureKey('enemy_woods'));
  assert.equal(e.requests.length, 2);
});

test('decode rejection retains an already loaded image', async () => {
  const e = engine({ decodeFails: true });
  assert.ok(await e.ensureKey('enemy_woods'));
});

test('reduced and full quality loads do not share a raster cache entry', async () => {
  const e = engine();
  const full = await e.ensureKey('enemy_woods');
  e.G.loFi = true;
  const reduced = await e.ensureKey('enemy_woods_pidle');
  assert.notEqual(full, reduced);
  assert.equal(e.requests.length, 2);
});

test('all 25 stages keep their pose keys and only reduce unique asset URLs', () => {
  const before = engine({ aliases: false }), after = engine();
  let savedBytes = 0, removedRequests = 0;
  const campaignBefore = new Set(), campaignAfter = new Set();
  const bytes = urls => [...urls].reduce((n, url) => n + (fs.existsSync(path.join(root, url)) ? fs.statSync(path.join(root, url)).size : 0), 0);
  for (let i = 0; i < 25; i++) {
    const keys = before.keysForStage(i);
    assert.deepEqual(Array.from(after.keysForStage(i)), Array.from(keys));
    const oldURLs = new Set(keys.map(k => before.ASSET_PATHS[k]));
    const newURLs = new Set(keys.map(k => after.ASSET_PATHS[k]));
    for (const url of oldURLs) campaignBefore.add(url);
    for (const url of newURLs) campaignAfter.add(url);
    if (i === 0) console.log('Stage 1 asset budget:', { beforeBytes: bytes(oldURLs), afterBytes: bytes(newURLs), beforeURLs: oldURLs.size, afterURLs: newURLs.size });
    assert.ok(newURLs.size <= oldURLs.size);
    assert.ok(bytes(newURLs) <= bytes(oldURLs));
    savedBytes += bytes(oldURLs) - bytes(newURLs);
    removedRequests += oldURLs.size - newURLs.size;
  }
  assert.ok(savedBytes > 0 && removedRequests > 0);
  console.log('Sum of per-stage cold-load savings:', { savedBytes, removedRequests });
  console.log('Full campaign unique asset budget:', { beforeBytes: bytes(campaignBefore), afterBytes: bytes(campaignAfter), beforeURLs: campaignBefore.size, afterURLs: campaignAfter.size });
});

test('stage prewarming creates character outlines only, sharing identical poses', async () => {
  const e = engine();
  const keys = ['bg_woods', 'cover_woods', 'p_hockey_mask', 'enemy_woods', 'enemy_woods_pidle'];
  await Promise.all(keys.map(k => e.ensureKey(k)));
  e.prewarmStage(keys);
  assert.equal(Object.keys(e.outlineCache).length, 1);
  const n = e.canvases.length;
  e.G.loFi = true;
  e.prewarmStage(keys);
  assert.equal(e.canvases.length, n);
});

test('boot starts all fonts and core art together, but waits for fonts before READY', async () => {
  const e = engine();
  const boot = e.boot();
  assert.equal(e.fonts.length, 5);
  assert.ok(e.requests.includes('assets/ui/cover.jpg'));
  assert.notEqual(e.nodes.get('bootMsg').textContent, 'READY');
  for (const resolve of e.fontResolvers) resolve();
  await boot;
  assert.equal(e.nodes.get('bootMsg').textContent, 'READY');
  assert.equal(e.nodes.get('bootFill').style.width, '100%');
  assert.equal(e.G.mode, 'intro');
});


test('all stages load, enter gameplay and render waves and bosses with shared art', async () => {
  const e = engine();
  const boot = e.boot();
  for (const resolve of e.fontResolvers) resolve();
  await boot;
  for (let i = 0; i < 25; i++) {
    e.beginStage(i, { quick: true });
    await e.G._assetsP;
    assert.equal(e.G.assetReady, true);
    assert.equal(e.G.stageIndex, i);
    for (let n = 0; n < 20; n++) e.stepSim(0.05);
    e.render();
    e.forceBoss();
    e.render();
    assert.ok(e.G.boss);
  }
});
