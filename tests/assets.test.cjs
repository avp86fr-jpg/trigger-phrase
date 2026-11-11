const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildAliases, output } = require('../scripts/build-asset-aliases.cjs');
const root = path.resolve(__dirname, '..');

// Execute the real engine against deterministic browser primitives. Disable only
// automatic boot; tests explicitly drive the existing loader/stage entry points.
function engine({ aliases = true, fail = () => false, decodeFails = false } = {}) {
  const requests = [];
  const canvases = [];
  const fonts = [];
  const fontResolvers = [];
  const nodes = new Map();
  const noop = () => {};
  function node(canvas = false) {
    const n = {
      width: 1920, height: 1080, style: { setProperty: noop }, dataset: {},
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, addEventListener: noop,
      getBoundingClientRect: () => ({ x: 0, y: 0, left: 0, top: 0, width: 1920, height: 1080 }),
      setAttribute: noop, querySelector: () => null,
      getContext: () => new Proxy({}, { get: (obj, k) => {
        if (k === 'measureText') return text => ({ width: String(text).length * 12 });
        if (k === 'getImageData' || k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(1920 * 1080 * 4) });
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
        return obj[k] || noop;
      } })
    };
    if (canvas) canvases.push(n);
    return n;
  }
  class Image {
    constructor() { this.width = this.height = this.naturalWidth = 64; }
    set src(src) {
      this._url = src;
      requests.push(src);
      // Intentionally synchronous: handlers must exist before assigning src.
      if (fail(src) || !fs.existsSync(path.join(root, src))) {
        this.naturalWidth = 0;
        this.onerror && this.onerror();
      } else this.onload && this.onload();
    }
    get src() { return this._url; }
    decode() { return decodeFails ? Promise.reject(new Error('decode')) : Promise.resolve(); }
  }
  class FontFace {
    constructor(family) { this.family = family; }
    load() { fonts.push(this.family); return new Promise(r => fontResolvers.push(() => r(this))); }
  }
  const context = {
    console: { warn: noop, error: noop }, performance, Image, FontFace,
    navigator: { userAgent: 'Test', maxTouchPoints: 0 },
    localStorage: { getItem: () => null, setItem: noop },
    document: { getElementById: id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); },
      createElement: tag => node(tag === 'canvas'), addEventListener: noop,
      body: node(), documentElement: node(), fonts: { add: noop } },
    innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1,
    addEventListener: noop, matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ getPropertyValue: () => '0' }),
    requestAnimationFrame: noop, requestIdleCallback: fn => fn(),
    setTimeout: fn => { queueMicrotask(fn); return 1; }, clearTimeout: noop,
    setInterval: noop, clearInterval: noop
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['asset-aliases', 'feel', 'motion', 'audio', 'stages', 'comic']) {
    if (file === 'asset-aliases' && !aliases) continue;
    vm.runInContext(fs.readFileSync(path.join(root, 'src', file + '.js'), 'utf8'), context);
  }
  let source = fs.readFileSync(path.join(root, 'src/game.js'), 'utf8');
  assert.ok(source.includes('  boot().catch((e) => {'));
  source = source.replace('  boot().catch((e) => {',
    '  window.loaderTest = { ensureKey, fillCatalog, keysForStage, prewarmStage, outlineCache, boot, render };\n  false && boot().catch((e) => {');
  vm.runInContext(source, context);
  context.loaderTest.fillCatalog();
  return { ...context.loaderTest, ...context.__LG, context, requests, canvases, fonts, fontResolvers, nodes };
}

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
