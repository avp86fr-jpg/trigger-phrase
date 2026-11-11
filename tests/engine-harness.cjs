const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildAliases, output } = require('../scripts/build-asset-aliases.cjs');
const root = path.resolve(__dirname, '..');

// Execute the real engine against deterministic browser primitives. Disable only
// automatic boot; tests explicitly drive the existing loader/stage entry points.
function engine({ aliases = true, fail = () => false, decodeFails = false, save = null } = {}) {
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
  let seed = 0x12345678;
  const math = Object.create(Math);
  math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const context = { Math: math,
    console: { warn: noop, error: noop }, performance, Image, FontFace,
    navigator: { userAgent: 'Test', maxTouchPoints: 0 },
    localStorage: { getItem: () => save ? JSON.stringify(save) : null, setItem: noop },
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
  for (const file of ['asset-aliases', 'feel', 'motion', 'audio', 'stages', 'campaign', 'comic']) {
    if (file === 'asset-aliases' && !aliases) continue;
    vm.runInContext(fs.readFileSync(path.join(root, 'src', file + '.js'), 'utf8'), context);
  }
  let source = fs.readFileSync(path.join(root, 'src/game.js'), 'utf8');
  assert.ok(source.includes('  boot().catch((e) => {'));
  source = source.replace('  boot().catch((e) => {',
    '  window.loaderTest = { ensureKey, fillCatalog, keysForStage, prewarmStage, outlineCache, boot, render, canTelegraph, fireEnemy, spawnShot, updateShot, updateWave, updateEntities, damageEntity, gradeStage, stageClear, tapContinue, tapSelect, selectNodes, drawSelect, drawStageCard, drawSeedStrip, drawWeakPoint, drawEntity };\n  false && boot().catch((e) => {');
  vm.runInContext(source, context);
  context.loaderTest.fillCatalog();
  return { ...context.loaderTest, ...context.__LG, context, requests, canvases, fonts, fontResolvers, nodes };
}


module.exports = { engine };
