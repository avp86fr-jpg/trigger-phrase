/* METAWINNERS: TRIGGER PHRASE — HD 2D light-gun engine */
(function () {
  const W = 1920, H = 1080;
  const SAVE_KEY = 'mw_trigger_phrase_v1';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const $boot = document.getElementById('boot');
  const $fill = document.getElementById('bootFill');
  const $msg = document.getElementById('bootMsg');
  const $coverBtn = document.getElementById('btnCover');
  const $mute = document.getElementById('btnMute');
  const $pause = document.getElementById('btnPause');
  const $right = document.getElementById('rightBtns');
  const $fs = document.getElementById('btnFs');
  const $iosHint = document.getElementById('iosHint');
  const $iosHintDismiss = document.getElementById('iosHintDismiss');

  const IM = {};
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d');
  const procCache = {};
  let halftone = null;

  const G = {
    mode: 'boot',
    next: null,
    t: 0,
    dt: 0,
    now: 0,
    last: 0,
    fade: 0,
    fadeDir: 0,
    cam: { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 },
    shake: 0,
    pointer: { x: W / 2, y: H / 2, on: false, down: false },
    hiding: false,
    hideAmt: 0,
    player: null,
    stage: null,
    stageIndex: 0,
    wave: 0,
    waveT: 0,
    entities: [],
    particles: [],
    callout: null,
    hint: null,
    hintT: 0,
    comic: null,
    result: null,
    paused: false,
    selectPage: 0,
    titleT: 0,
    hover: null,
    quick: false,
    flash: 0,
    introDone: false,
    letters: [],
    railX: 0,
    gunKick: 0,
    slowMo: 0,
    loFi: false,
    bossIntro: 0,
    stageT: 0,
    bump: 0,
    bumpT: 0,
    whip: [],
    stingPlayed: false,
  };

  function defaultSave() {
    return {
      unlocked: 1, grades: {}, words: [], best: {}, totalBest: 0, intro: false,
      difficulty: 'normal', volMaster: 1, volSfx: 1, volMus: 1,
      lefty: false, reduced: false, tutorialDone: false, checkpoint: 0,
    };
  }
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      return s && typeof s === 'object' ? Object.assign(defaultSave(), s) : defaultSave();
    } catch (e) { return defaultSave(); }
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) {}
  }
  G.save = loadSave();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const ch = (n) => n[Math.floor(Math.random() * n.length)];

  function makeHalftone() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    for (let y = 0; y < 64; y += 8)
      for (let x = 0; x < 64; x += 8) {
        g.beginPath();
        g.arc(x + 3, y + 3, 1.3, 0, Math.PI * 2);
        g.fill();
      }
    halftone = ctx.createPattern(c, 'repeat');
  }

  const ASSET_PATHS = Object.create(null);
  const inflight = Object.create(null);
  const partPool = [];
  const _hitList = [];
  const _drawList = [];

  function catalog(k, src) { if (k && src) ASSET_PATHS[k] = src; }

  function capFor(src) {
    if (!(G.loFi || (G.save && G.save.reduced))) return 0;
    if (/\/(bg|ui|fg)\//.test(src) || /cover/.test(src)) return 1280;
    return 768;
  }

  async function loadImage(src) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    const cap = capFor(src);
    if (cap && Math.max(img.width, img.height) > cap) {
      const sc = cap / Math.max(img.width, img.height);
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * sc));
      cv.height = Math.max(1, Math.round(img.height * sc));
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, cv.width, cv.height);
      cv._src = src;
      return cv;
    }
    return img;
  }

  async function ensureKey(k) {
    if (IM[k]) return IM[k];
    const src = ASSET_PATHS[k];
    if (!src) return null;
    if (!inflight[k]) {
      inflight[k] = loadImage(src).then((img) => {
        IM[k] = img;
        delete inflight[k];
        return img;
      }).catch((e) => {
        console.warn('missing', k, src);
        delete inflight[k];
        return null;
      });
    }
    return inflight[k];
  }

  function fillCatalog() {
    catalog('cover', 'assets/ui/cover.jpg');
    catalog('rift', 'assets/bg/cover_rift.jpg');
    catalog('bg_woods', 'assets/bg/bg_woods.jpg');
    catalog('bg_west', 'assets/bg/bg_west.jpg');
    catalog('bg_rome', 'assets/bg/bg_rome.jpg');
    catalog('enemy_woods', 'assets/chars/enemy_woods.png');
    catalog('enemy_west', 'assets/chars/enemy_west.png');
    catalog('enemy_rome', 'assets/chars/enemy_rome.png');
    catalog('civ_woods', 'assets/chars/civ_woods.png');
    catalog('civ_west', 'assets/chars/civ_west.png');
    catalog('chaos', 'assets/chars/chaos_idle.png');
    catalog('fire_idle', 'assets/chars/fire_idle.png');
    catalog('hunter_idle', 'assets/chars/hunter_idle.png');
    catalog('goldmage_idle', 'assets/chars/goldmage_idle.png');
    catalog('mask_idle', 'assets/chars/mask_idle.png');
    catalog('vera_mic', 'assets/vera/vera_mic.png');
    catalog('vera_point', 'assets/vera/vera_point.png');
    catalog('vera_cross', 'assets/vera/vera_cross.png');
    catalog('boss_hockey_mask', 'assets/chars/boss_hockey_mask.png');
    catalog('boss_cowboy', 'assets/chars/boss_cowboy.png');
    catalog('boss_gladiator', 'assets/chars/boss_gladiator.png');
    catalog('boss_chief', 'assets/chars/boss_chief.png');
    catalog('boss_medusa', 'assets/chars/boss_medusa.png');
    catalog('boss_steampunk', 'assets/chars/boss_steampunk.png');
    catalog('boss_sheikh', 'assets/chars/boss_sheikh.png');
    catalog('civ_rome', 'assets/chars/civ_rome.png');
    const plates = [
      '04_bone','05_egypt','06_sparta','07_medusa','08_keep','09_brass',
      '10_majlis','10_yacht','11_glacier','12_jungle','13_speakeasy','13_casino','14_stadium','15_arcade',
      '16_manga','16_garage','17_lab','18_nave','19_web','20_foundry','21_hive',
      '22_mind','23_grove','24_mars','25_nexus'
    ];
    plates.forEach((k) => { catalog('bg_' + k, 'assets/bg/bg_' + k + '.jpg'); });
    ['woods','west','10_yacht','13_casino','16_garage','25_nexus'].forEach((k) => {
      catalog('bg_' + k + '_b', 'assets/bg/bg_' + k + '_b.jpg');
    });
    ['woods','west','rome','bone','medieval','casino','garage','yacht','nexus','egypt','brass','stadium','glacier','arcade','lab','foundry'].forEach((k) => {
      catalog('fg_' + k, 'assets/fg/fg_' + k + '.png');
    });
    catalog('boss_hunter', 'assets/chars/hunter_idle.png');
    catalog('boss_fire', 'assets/chars/fire_idle.png');
    catalog('boss_gold_mage', 'assets/chars/goldmage_idle.png');
    catalog('boss_mask', 'assets/chars/mask_idle.png');
    catalog('boss_chaos', 'assets/chars/boss_chaos.png');
    catalog('bg_chaos_study', 'assets/bg/bg_chaos_study.jpg');
    ['comic_loss','comic_echo','comic_pocket','comic_tab','comic_news',
     'comic_era_woods','comic_era_west','comic_era_ancient','comic_era_pre','comic_era_medieval',
     'comic_era_industrial','comic_era_yacht','comic_era_stadium','comic_era_neon','comic_era_lab','comic_era_future'
    ].forEach((k) => catalog('bg_' + k, 'assets/bg/bg_' + k + '.jpg'));
    catalog('veh_train_west', 'assets/veh/train_west.png');
    catalog('veh_train_steam', 'assets/veh/train_steam.png');
    catalog('veh_speedboat', 'assets/veh/speedboat.png');
    catalog('veh_neon_car', 'assets/veh/neon_car.png');
    catalog('veh_neon_car_b', 'assets/veh/neon_car_b.png');
    ['woods','west','rome','bone','egypt','sparta','temple','medieval','industrial','yacht','glacier','jungle',
     'casino','stadium','arcade','garage','lab','nave','energy','foundry','hive','mind','mars','nexus',
     'grove','web','speakeasy','brass','keep','prehistoric'].forEach((k) => {
      catalog('cover_' + k, 'assets/cover/cover_' + k + '.png');
    });
    catalog('veh_maglev', 'assets/veh/maglev.png');
    catalog('veh_nile_barge', 'assets/veh/nile_barge.png');
    catalog('veh_mars_rover', 'assets/veh/mars_rover.png');
    [
      'ice','blue','quarterback','digital_punk','manga','poison','bloodbath',
      'arachnia','optimus','assimilator','neural','elemental','alien'
    ].forEach((id) => {
      catalog('boss_' + id, 'assets/chars/boss_' + id + '.png');
    });
    ['hockey_mask','cowboy','gladiator','hunter','fire','chief','medusa',
     'ice','blue','quarterback','digital_punk','manga','poison','bloodbath',
     'arachnia','optimus','assimilator','neural','elemental','alien'].forEach((id) => {
      catalog('boss_' + id + '_atk', 'assets/chars/boss_' + id + '_atk.png');
    });
    ['prehistoric','medieval','industrial','modern','future'].forEach((k) => {
      catalog('enemy_' + k, 'assets/chars/enemy_' + k + '.png');
      catalog('civ_' + k, 'assets/chars/civ_' + k + '.png');
    });
    const ANIM_KITS = { woods:1, west:1, mobster:1, modern:1, suit:1, rome:1, prehistoric:1, egypt:1, sparta:1, temple:1, medieval:1, industrial:1, yacht_guard:1, future:1 };
    ['woods','west','rome','prehistoric','industrial','modern','medieval','future','mobster','yacht_guard','suit','egypt','sparta','temple'].forEach((k) => {
      catalog('enemy_' + k, 'assets/chars/enemy_' + k + '.png');
      ['aim','hit','death'].forEach((pose) => {
        catalog('enemy_' + k + '_' + pose, 'assets/chars/enemy_' + k + '_' + pose + '.png');
      });
      if (OPTIONAL_IDLE2['enemy_' + k + '_idle2']) catalog('enemy_' + k + '_idle2', 'assets/chars/enemy_' + k + '_idle2.png');
      if (ANIM_KITS[k]) {
        ['walk0','walk1','walk2','fire','death0','death1','death2','pidle'].forEach((pose) => {
          catalog('enemy_' + k + '_' + pose, 'assets/chars/enemy_' + k + '_' + pose + '.png');
        });
      }
    });
    const DRESS_KITS = ['glacier','jungle','grove','stadium','arcade','lab','nave','web','foundry','hive','mind','mars','nexus'];
    DRESS_KITS.forEach((k) => {
      catalog('enemy_' + k, 'assets/chars/enemy_' + k + '.png');
      ['walk0','walk1','walk2','pidle'].forEach((pose) => {
        catalog('enemy_' + k + '_' + pose, 'assets/chars/enemy_' + k + '_' + pose + '.png');
      });
    });
    ['chaos','hockey_mask','digital_punk'].forEach((id) => {
      catalog('boss_' + id + '_atk2', 'assets/chars/boss_' + id + '_atk2.png');
      catalog('boss_' + id + '_atk3', 'assets/chars/boss_' + id + '_atk3.png');
    });
    ['idle0','idle1','raise','raise2','cast','stagger','stepL','stepR'].forEach((p) => {
      catalog('boss_chaos_' + p, 'assets/chars/boss_chaos_' + p + '.png');
    });
    ['antic','wind','throw','follow','recover'].forEach((p) => {
      catalog('boss_hockey_mask_' + p, 'assets/chars/boss_hockey_mask_' + p + '.png');
    });
    ['tuxedo','yacht_crew','suit','egypt','sparta','temple'].forEach((k) => {
      catalog('civ_' + k, 'assets/chars/civ_' + k + '.png');
    });
    for (const st of TPStages.STAGES) {
      catalog('p_' + st.boss.id, 'assets/portraits/' + st.boss.id + '_1024.jpg');
      catalog('t_' + st.boss.id, 'assets/portraits/' + st.boss.id + '_256.jpg');
    }
  }

  const VEH_KIND = {
    west_ride: 'veh_train_west', steamtrain: 'veh_train_steam', barge: 'veh_nile_barge',
    yacht: 'veh_speedboat', highway: 'veh_neon_car', maglev: 'veh_maglev', rover: 'veh_mars_rover'
  };

  function fgCatalogKeys(st) {
    const bg = String((st && st.bg) || '');
    const keys = [];
    const pairs = [
      ['woods','woods'],['west','west'],['rome','rome'],['bone','bone'],
      ['egypt','egypt'],['brass','brass'],['stadium','stadium'],['glacier','glacier'],
      ['casino','casino'],['garage','garage'],['yacht','yacht'],['nexus','nexus'],
      ['keep','medieval'],['nave','medieval'],['arcade','arcade'],['lab','lab'],['foundry','foundry']
    ];
    for (let i = 0; i < pairs.length; i++) {
      if (bg.indexOf(pairs[i][0]) >= 0) keys.push('fg_' + pairs[i][1]);
    }
    return keys;
  }

  function keysForStage(index) {
    const st = TPStages.STAGES[index];
    if (!st) return [];
    const keys = ['bg_' + st.bg, 'bg_' + st.bg + '_b', 'enemy_' + st.enemy, 'civ_' + st.civ,
      'boss_' + st.boss.id, 'boss_' + st.boss.id + '_atk', 'boss_' + st.boss.id + '_atk2', 'boss_' + st.boss.id + '_atk3',
      'p_' + st.boss.id, 't_' + st.boss.id];
    ['', '_aim', '_hit', '_death', '_idle2', '_walk0', '_walk1', '_walk2', '_fire', '_death0', '_death1', '_death2', '_pidle'].forEach((p) => keys.push('enemy_' + st.enemy + p));
    const dress = dressKeyFor(st);
    if (dress && dress !== st.enemy) {
      ['', '_walk0', '_walk1', '_walk2', '_pidle'].forEach((p) => keys.push('enemy_' + dress + p));
    }
    fgCatalogKeys(st).forEach((k) => keys.push(k));
    if (st.motion && VEH_KIND[st.motion.kind]) keys.push(VEH_KIND[st.motion.kind]);
    if (st.motion && (st.motion.kind === 'highway' || st.motion.kind === 'street')) keys.push('veh_neon_car_b');
    if (window.TPMotion) keys.push('cover_' + TPMotion.coverKeyFor(st));
    if (st.boss && st.boss.id === 'chaos') {
      ['idle0','idle1','raise','raise2','cast','stagger','stepL','stepR'].forEach((p) => keys.push('boss_chaos_' + p));
    }
    if (st.boss && st.boss.id === 'hockey_mask') {
      ['antic','wind','throw','follow','recover'].forEach((p) => keys.push('boss_hockey_mask_' + p));
    }
    return keys.filter((k) => ASSET_PATHS[k]);
  }

  async function ensureStageAssets(index) {
    const keys = keysForStage(index);
    const optional = /_idle2$/;
    await Promise.all(keys.map(async (k) => {
      if (optional.test(k)) {
        // Only fetch idle2 when we know it exists; missing files 404. Presence is recorded at fill time via OPTIONAL_IDLE2.
        if (!(window.OPTIONAL_IDLE2 && OPTIONAL_IDLE2[k])) return;
      }
      return ensureKey(k);
    }));
    G.assetReady = true;
    prewarmStage(keys);
  }

  function prefetchStage(index) {
    if (index < 0 || index >= TPStages.STAGES.length) return;
    keysForStage(index).forEach((k) => {
      if (/_idle2$/.test(k) && !(window.OPTIONAL_IDLE2 && OPTIONAL_IDLE2[k])) return;
      ensureKey(k);
    });
  }

  async function ensureThumbs() {
    await Promise.all(TPStages.STAGES.map((st) => ensureKey('t_' + st.boss.id)));
  }

  const CORE_KEYS = ['cover','rift','chaos','vera_mic','vera_point','vera_cross','bg_chaos_study'];
  const OPTIONAL_IDLE2 = {'enemy_woods_idle2':true,'enemy_west_idle2':true,'enemy_mobster_idle2':true,'enemy_suit_idle2':true,'enemy_egypt_idle2':true,'enemy_future_idle2':true,'enemy_industrial_idle2':true,'enemy_medieval_idle2':true,'enemy_modern_idle2':true,'enemy_prehistoric_idle2':true,'enemy_rome_idle2':true,'enemy_sparta_idle2':true,'enemy_temple_idle2':true,'enemy_yacht_guard_idle2':true};
  window.OPTIONAL_IDLE2 = OPTIONAL_IDLE2;

  function allocP(init) {
    const p = partPool.pop() || {};
    p.k = p.x = p.y = p.x2 = p.y2 = p.vx = p.vy = p.life = p.t = p.c = p.s = p.rot = p.vr = p.text = undefined;
    for (const key in init) p[key] = init[key];
    if (p.t == null) p.t = 0;
    G.particles[G.particles.length] = p;
    return p;
  }

  function compactArr(arr, pred, pool) {
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (pred(it)) arr[w++] = it;
      else if (pool) pool.push(it);
    }
    arr.length = w;
    return arr;
  }

  async function boot() {
    $msg.textContent = 'LOADING FONTS';
    const fontList = [
      { family: 'Anton', url: 'assets/fonts/Anton-Regular.ttf' },
      { family: 'Bebas Neue', url: 'assets/fonts/BebasNeue-Regular.ttf' },
      { family: 'Archivo Black', url: 'assets/fonts/ArchivoBlack-Regular.ttf' },
      { family: 'Oswald', url: 'assets/fonts/Oswald-Variable.ttf' },
      { family: 'Orbitron', url: 'assets/fonts/Orbitron-Variable.ttf' },
    ];
    let done = 0;
    const totalHint = 40;
    for (const f of fontList) {
      try {
        const face = new FontFace(f.family, `url(${f.url})`);
        await face.load();
        document.fonts.add(face);
      } catch (e) { console.warn('font', f.family, e); }
      done++;
      $fill.style.width = (10 * done / fontList.length) + '%';
    }
    $msg.textContent = 'LOADING ART';
    fillCatalog();
    layout();
    const keys = CORE_KEYS.filter((k) => ASSET_PATHS[k]);
    let n = 0;
    await Promise.all(keys.map(async (k) => {
      try { IM[k] = await loadImage(ASSET_PATHS[k]); }
      catch (e) { console.warn('missing', k, ASSET_PATHS[k]); }
      n++;
      $fill.style.width = (10 + 90 * n / Math.max(1, keys.length)) + '%';
    }));
    // Warm the first stage in the background so Story/Continue feels instant.
    prefetchStage(0);
        makeHalftone();
    layout();
    $msg.textContent = 'READY';
    $fill.style.width = '100%';
    await new Promise((r) => setTimeout(r, 250));
    $boot.classList.add('hide');
    go('intro');
    requestAnimationFrame(frame);
  }

  function viewW() { return canvas.width || W; }
  function viewH() { return canvas.height || H; }
  function layout() {
    const r = document.getElementById('wrap').getBoundingClientRect();
    // Portrait comics: use a tall 9:16 canvas so a single panel fills the phone, not a letterboxed 16:9 strip.
    const comicPortrait = (G.mode === 'comic') && r.height > r.width * 1.15;
    const cw = comicPortrait ? 1080 : W;
    const ch = comicPortrait ? 1920 : H;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const scale = Math.min(r.width / cw, r.height / ch);
    canvas.style.width = (cw * scale) + 'px';
    canvas.style.height = (ch * scale) + 'px';
    G.scale = scale;
    G.css = canvas.getBoundingClientRect();
    G.loFi = scale < 0.42 || (r.width < 700);
    G.portraitComic = comicPortrait;
    document.body.classList.toggle('comic-portrait', !!comicPortrait);
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', layout);
    visualViewport.addEventListener('scroll', layout);
  }
  document.addEventListener('fullscreenchange', layout);
  document.addEventListener('webkitfullscreenchange', layout);

  function applySettingsChrome() {
    const s = G.save || defaultSave();
    $coverBtn.classList.toggle('lefty', !!s.lefty);
    $right.classList.toggle('lefty', !!s.lefty);
    if (window.TPAudio && TPAudio.setVolumes) TPAudio.setVolumes(s.volMaster, s.volSfx, s.volMus);
    G.reduced = !!s.reduced;
  }
  function diffCfg() {
    const d = (G.save && G.save.difficulty) || 'normal';
    const cfg = {
      easy:   { hp: 8, lives: 5, telMul: 1.4, assist: 70, bossHpMul: 0.75, name: 'EASY' },
      normal: { hp: 5, lives: 3, telMul: 1.0, assist: 44, bossHpMul: 1.00, name: 'NORMAL' },
      hard:   { hp: 4, lives: 3, telMul: 0.70, assist: 0,  bossHpMul: 1.15, name: 'HARD' },
    }[d] || { hp: 5, lives: 3, telMul: 1, assist: 38, bossHpMul: 1, name: 'NORMAL' };
    const out = Object.assign({}, cfg);
    // Hard-touch lost a lot of lives after the pop/cover wave pass; give the finger a fairer window.
    if (G.pointer && G.pointer.touch && d === 'hard') {
      out.hp = 4;
      out.assist = 8;
    }
    return out;
  }
  function isTouch() {
    return !!(G.pointer && G.pointer.touch);
  }
  function isHardTouch() {
    return isTouch() && ((G.save && G.save.difficulty) || 'normal') === 'hard';
  }
  function isTouchRail() {
    return isTouch() && !!(G.stage && G.stage.motion);
  }
  function touchWindow() {
    // Rail already had a wider window; extend a milder version to all hard-touch so the curve isn't spikier on cover stages.
    return isTouchRail() || isHardTouch();
  }
  function telScale() {
    let m = diffCfg().telMul;
    if (isTouch()) m *= 1.36;
    if (isTouchRail()) m *= 1.28;
    if (isHardTouch() && !isTouchRail()) m *= 1.0;
    return m;
  }
  function depthFromY(y) {
    const tt = clamp((y / H - 0.62) / 0.28, 0, 1);
    return lerp(0.72, 1.06, tt);
  }
  // Authored spawn Y is mid-frame; most plates have the ground plane lower.
  function plantNorm(yNorm, type) {
    if (type === 'pickup') return Math.max(yNorm, 0.72);
    if (type === 'secret' || type === 'bonus') return yNorm;
    const st = G.stage;
    const mot = st && st.motion && st.motion.kind;
    const t = clamp((yNorm - 0.52) / 0.24, 0, 1);
    if (mot === 'steamtrain' || mot === 'west_ride') return lerp(0.52, 0.58, t); // carriage roof / running board
    if (mot === 'yacht' || mot === 'barge') return lerp(0.60, 0.70, t); // on the deck / boat
    if (mot === 'highway' || mot === 'street' || mot === 'maglev' || mot === 'rover') return lerp(0.68, 0.80, t);
    if (mot === 'airship') return lerp(0.62, 0.74, t);
    // cover plates: dirt, marble, ice, garage floor
    return lerp(0.76, 0.88, t);
  }
  applySettingsChrome();

  // World is drawn with camera zoom/pan (worldTransform). Hits and the
  // reticle must use the inverse of that transform, or a tap on a zoomed
  // grunt (stage 1 is zoom 1.08–1.16) lands beside the hitbox.
  function viewXform() {
    const z = Math.max(0.001, (G.cam && G.cam.z) || 1);
    const cx = ((G.cam && G.cam.x) || 0) * W;
    const cy = ((G.cam && G.cam.y) || 0) * H + (G.hideAmt || 0) * 70;
    return { z: z, cx: cx, cy: cy };
  }
  function canvasToWorld(sx, sy) {
    if (G.mode !== 'play' && G.mode !== 'paused' && G.mode !== 'continue') return { x: sx, y: sy };
    const v = viewXform();
    return {
      x: (sx - W / 2) / v.z + W / 2 + v.cx,
      y: (sy - H / 2) / v.z + H / 2 + v.cy
    };
  }
  function worldToCanvas(wx, wy) {
    if (G.mode !== 'play' && G.mode !== 'paused' && G.mode !== 'continue') return { x: wx, y: wy };
    const v = viewXform();
    return {
      x: v.z * (wx - W / 2 - v.cx) + W / 2,
      y: v.z * (wy - H / 2 - v.cy) + H / 2
    };
  }
  function toWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    G.css = r;
    const vw = viewW(), vh = viewH();
    const sx = clamp((clientX - r.left) / Math.max(1e-6, r.width) * vw, 0, vw);
    const sy = (clientY - r.top) / Math.max(1e-6, r.height) * vh;
    const syC = clamp(sy, 0, vh);
    return canvasToWorld(sx, syC);
  }

  function isCoverTarget(el) {
    return el === $coverBtn || $coverBtn.contains(el);
  }
  function isUiTarget(el) {
    return el === $mute || el === $pause || el === $fs || el === $iosHint || el === $iosHintDismiss
      || ($mute && $mute.contains(el)) || ($pause && $pause.contains(el))
      || ($fs && $fs.contains(el)) || ($iosHint && $iosHint.contains(el));
  }

  function isAppleTouch() {
    return /iP(hone|ad|od)/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function fsApiEnabled() {
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  }
  function isFs() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.documentElement.classList.contains('pseudo-fs'));
  }
  function isMobilePlay() {
    return window.matchMedia('(pointer: coarse)').matches
      || window.matchMedia('(hover: none) and (max-width: 1024px)').matches
      || !!(G.pointer && G.pointer.touch);
  }
  function tryLockLandscape() {
    try {
      const o = screen.orientation;
      if (o && o.lock) o.lock('landscape').catch(function () {});
    } catch (err) {}
  }
  function showA2hs(on) {
    if (!$iosHint) return;
    if (on && isAppleTouch()) $iosHint.hidden = false;
    else $iosHint.hidden = true;
  }
  function syncFsBtn() {
    const on = isFs();
    document.body.classList.toggle('fs-on', on);
    if ($fs) {
      $fs.setAttribute('aria-pressed', on ? 'true' : 'false');
      $fs.textContent = on ? 'EXIT' : (document.body.classList.contains('mode-title') ? 'FULL SCREEN' : 'FULL');
      $fs.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
    }
    layout();
  }
  async function tryEnterFullscreen() {
    const el = document.documentElement;
    try {
      if (fsApiEnabled()) {
        if (el.requestFullscreen) await el.requestFullscreen.call(el);
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        el.classList.add('pseudo-fs');
        document.body.classList.add('pseudo-fs');
        showA2hs(true);
      }
    } catch (err) {
      el.classList.add('pseudo-fs');
      document.body.classList.add('pseudo-fs');
      if (isAppleTouch()) showA2hs(true);
    }
    tryLockLandscape();
    syncFsBtn();
  }
  async function exitFullscreen() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (err) {}
    document.documentElement.classList.remove('pseudo-fs');
    document.body.classList.remove('pseudo-fs');
    showA2hs(false);
    syncFsBtn();
  }
  function toggleFullscreen() {
    if (isFs()) exitFullscreen();
    else tryEnterFullscreen();
  }
  function maybeOfferFullscreen() {
    if (isFs()) return;
    if (isMobilePlay() || isAppleTouch()) tryEnterFullscreen();
  }

  function setHiding(v) {
    if (v && !G.hiding) haptic(12);
    if (G.mode !== 'play' || G.paused) {
      G.hiding = !!v;
      $coverBtn.classList.toggle('held', !!v);
      return;
    }
    if (v && !G.hiding) TPAudio.hide();
    G.hiding = !!v;
    $coverBtn.classList.toggle('held', !!v);
  }

  window.addEventListener('pointermove', (e) => {
    const p = toWorld(e.clientX, e.clientY);
    G.pointer.x = p.x; G.pointer.y = p.y; G.pointer.on = true;
  });
  window.addEventListener('pointerdown', (e) => {
    TPAudio.unlock();
    if (isCoverTarget(e.target)) { setHiding(true); return; }
    if (isUiTarget(e.target)) return;
    const p = toWorld(e.clientX, e.clientY);
    G.pointer.x = p.x; G.pointer.y = p.y; G.pointer.on = true; G.pointer.down = true;
    G.pointer.touch = (e.pointerType === 'touch' || e.pointerType === 'pen');
    if (e.button === 2) { setHiding(true); e.preventDefault(); return; }
    if (e.button === 0 || e.pointerType === 'touch' || e.pointerType === 'pen') onTap(p.x, p.y);
  });
  window.addEventListener('pointerup', (e) => {
    G.pointer.down = false;
    if (e.button === 2 || isCoverTarget(e.target)) setHiding(false);
  });
  window.addEventListener('pointercancel', () => { G.pointer.down = false; setHiding(false); });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    TPAudio.unlock();
    if (e.code === 'Space' || e.code === 'KeyC' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      setHiding(true); e.preventDefault();
    }
    if (e.code === 'KeyM') { TPAudio.toggleMute(); syncMute(); }
    if (e.code === 'KeyF') { toggleFullscreen(); e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
    if (e.code === 'Enter' && (G.mode === 'title' || G.mode === 'comic' || G.mode === 'result' || G.mode === 'intro' || G.mode === 'stagecard' || G.mode === 'credits' || G.mode === 'settings')) onTap(W / 2, H / 2);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'KeyC' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') setHiding(false);
  });
  $coverBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); setHiding(true); });
  $coverBtn.addEventListener('pointerup', (e) => { e.preventDefault(); e.stopPropagation(); setHiding(false); });
  $coverBtn.addEventListener('pointerleave', () => setHiding(false));
  if ($fs) $fs.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); });
  if ($iosHintDismiss) $iosHintDismiss.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); showA2hs(false); });
  document.addEventListener('fullscreenchange', () => { if (isFs()) tryLockLandscape(); syncFsBtn(); });
  document.addEventListener('webkitfullscreenchange', () => { if (isFs()) tryLockLandscape(); syncFsBtn(); });
  $mute.addEventListener('click', (e) => { e.stopPropagation(); TPAudio.unlock(); TPAudio.toggleMute(); syncMute(); });
  $pause.addEventListener('click', (e) => { e.stopPropagation(); togglePause(); });

  function syncMute() { $mute.textContent = TPAudio.muted ? 'MUTED' : 'BGM'; }
  function showHud(on) {
    $coverBtn.classList.toggle('vis', on);
    $right.classList.toggle('vis', on);
  }

  function tickBossIntro(dt) {
    if (G.bossIntro <= 0) return;
    G.bossIntro += dt;
    const k = Math.min(1, G.bossIntro / 0.7);
    G.cam.tz = (window.TPMotion && TPMotion.bossIntroZoom(G.bossIntro)) || (1.34 - 0.16 * k);
    if (G.bossIntro > 2.05) {
      G.bossIntro = 0;
      if (G.mode === 'play' || G.mode === 'paused' || G.mode === 'continue') showHud(true);
    }
  }

  function haptic(ms) { if (window.TPFeel) TPFeel.haptic(ms); }

  function go(mode, data) {
    const prev = G.mode;
    G.mode = mode;
    G.modeT = 0;
    if (prev !== mode) {
      G.transT = 0;
      if (window.TPMotion) {
        const kind = (mode === 'comic' || mode === 'stagecard') ? 'turn' : TPMotion.wipeKindFor(G.stage);
        TPMotion.startWipe(G, kind, G.stage && G.stage.era);
      } else G.transT = 0.32;
      layout();
    }
    document.body.classList.toggle('mode-title', mode === 'title');
    document.body.dataset.mode = mode;
    syncFsBtn();
    if (mode === 'title') { showHud(false); TPAudio.playMusic('title'); if (!G.stingPlayed) { G.stingPlayed = true; try { TPAudio.sting(); } catch (e) {} } }
    if (mode === 'intro' || mode === 'comic' || mode === 'select' || mode === 'result' || mode === 'stagecard' || mode === 'credits' || mode === 'settings') showHud(false);
    if (mode === 'play') showHud(true);
    if (mode === 'select') ensureThumbs();
    if (data) G.modeData = data;
  }

  function onTap(x, y) {
    if (G.mode === 'intro') return finishIntro();
    if (G.mode === 'stagecard') return enterPlay();
    if (G.mode === 'credits') { if (G.modeT > 0.4) go('title'); return; }
    if (G.mode === 'title') return tapTitle(x, y);
    if (G.mode === 'settings') return tapSettings(x, y);
    if (G.mode === 'comic') return tapComic();
    if (G.mode === 'select') return tapSelect(x, y);
    if (G.mode === 'result') return tapResult(x, y);
    if (G.mode === 'paused') return tapPause(x, y);
    if (G.mode === 'continue') return tapContinue(x, y);
    if (G.mode === 'play' && !G.paused) {
      if (G.hiding || G.hideAmt > 0.55) return tryRhythmReload();
      return shoot(x, y);
    }
  }

  function tapTitle(x, y) {
    if (hitBox(x, y, 960, 820, 300, 74)) { startStory(); return; }
    if (hitBox(x, y, 960, 910, 300, 60)) { TPAudio.ui(); go('select'); return; }
    if (G.save.checkpoint > 0 && hitBox(x, y, 700, 990, 240, 48)) { TPAudio.ui(); beginStage(Math.min(24, G.save.checkpoint), {}); return; }
    const settingsAt = (G.save.checkpoint > 0) ? [1220, 990] : [960, 990];
    if (hitBox(x, y, settingsAt[0], settingsAt[1], 240, 48) || hitBox(x, y, 1740, 80, 220, 50)) { TPAudio.ui(); G.settingsFrom = 'title'; go('settings'); return; }
  }
  function hitBox(x, y, cx, cy, w, h) {
    return x > cx - w / 2 && x < cx + w / 2 && y > cy - h / 2 && y < cy + h / 2;
  }

  function startStory() {
    TPAudio.ui();
    TPAudio.unlock();
    maybeOfferFullscreen();
    if (!G.save.intro) {
      openComic(TPStages.COMICS.intro, () => { G.save.intro = true; writeSave(); beginStage(0); });
    } else {
      beginStage(Math.max(0, Math.min(G.save.unlocked - 1, TPStages.STAGES.length - 1)));
    }
  }

  function comicKeys(pages) {
    const keys = ['vera_mic','vera_point','vera_cross','chaos','bg_chaos_study','rift'];
    (pages || []).forEach((page) => {
      (page.panels || []).forEach((p) => {
        if (p.bg && p.bg !== 'paper' && p.bg !== 'dark' && p.bg !== 'studio') {
          keys.push('bg_' + p.bg);
          if (p.bg === 'chaos_study') keys.push('bg_chaos_study');
        }
        if (p.char) keys.push(p.char);
      });
    });
    return keys.filter((k, i, a) => a.indexOf(k) === i && ASSET_PATHS[k]);
  }
  async function ensureComicAssets(pages) {
    await Promise.all(comicKeys(pages).map((k) => ensureKey(k)));
  }
  function openComic(pages, done) {
    G.comic = { pages, i: 0, t: 0, done, panel: 1, ready: false };
    go('comic');
    ensureComicAssets(pages).then(() => { if (G.comic) G.comic.ready = true; });
  }
  function tapComic() {
    if (!G.comic || !G.comic.ready) return;
    const page = G.comic.pages[G.comic.i];
    const n = (window.TPComic && TPComic.panelCount(page)) || (page.panels ? page.panels.length : 1);
    if (G.comic.t < 0.18) { G.comic.t = 10; return; }
    TPAudio.ui();
    if ((G.comic.panel || 1) < n) {
      G.comic.panel = (G.comic.panel || 1) + 1;
      G.comic.t = 0;
      return;
    }
    G.comic.i++;
    G.comic.t = 0;
    G.comic.panel = 1;
    if (G.comic.i >= G.comic.pages.length) {
      const d = G.comic.done;
      G.comic = null;
      d && d();
    }
  }

  function beginStage(index, opts) {
    const st = TPStages.STAGES[index];
    if (!st) return;
    G.stageIndex = index;
    G.stage = st;
    G.coverDecals = [];
    G.hideVel = 0;
    try {
      const prevBg = (typeof bgImageFor === 'function' && G.stage) ? bgImageFor(G.stage) : null;
      if (prevBg) G._holdBg = prevBg;
    } catch (err) {}
    if (window.TPMotion) TPMotion.startWipe(G, TPMotion.wipeKindFor(st), st.era);
    G.quick = !!(opts && opts.quick);
    G.clearing = false;
    G.clearWait = null;
    G.result = null;
    for (const w of st.waves) for (const sp of w.spawns) sp._done = false;
    G.wave = 0;
    G.waveT = 0;
    G.entities = [];
    G.particles = [];
    G.callout = null;
    G.cam = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1.06 };
    G.plateBlend = 0; G.plateT = 0; G.usePlateB = false;
    G.shake = 0;
    G.screenCrack = 0;
    G.hideAmt = 0;
    G.hiding = false;
    G.flash = 0;
    G.phase = 'waves';
    G.boss = null;
    G.spawnedForWave = false;
    G.secretGot = false;
    const D = diffCfg();
    G.player = {
      hp: D.hp, maxHp: D.hp, ammo: 6, maxAmmo: 6,
      reloadT: 0, score: 0, combo: 0, comboT: 0,
      shots: 0, hits: 0, civHits: 0, maxCombo: 0,
      lives: D.lives, inv: 0, weapon: 'pistol',
      kills: 0, headshots: 0, timeBonus: 0, killScore: 0, civPenalty: 0, deaths: 0,
      secrets: 0, perfectReloads: 0, rhythmLock: 0,
    };
    G.reloadBeat = 0; G.reloadSweet = 0;
    G.secretGot = false;
    G.hint = null; G.hintT = 0;
    if (!G.save.tutorialDone) {
      G.tutorial = true; G.tutorialT = 8.5;
      G.hint = 'CLICK / TAP TO SHOOT   ·   HOLD COVER TO RELOAD';
      G.hintT = 8.5;
    }
    G.railX = 0; G.gunKick = 0; G.slowMo = 0; G.bossIntro = 0; G.stageT = 0;
    G.bump = 0; G.bumpT = 0.8; G.whip = [];
    G.assetReady = false;
    const w0 = st.waves[0];
    if (w0 && w0.hint) { G.hint = w0.hint; G.hintT = 2.4; }
    const assetsP = ensureStageAssets(index).then(() => { G.assetReady = true; prefetchStage(index + 1); });
    G._assetsP = assetsP;
    if (G.quick) {
      TPAudio.playMusic((window.TPFeel && TPFeel.eraTheme(st)) || st.music || 'woods');
      go('play');
    } else {
      go('stagecard');
    }
    if (G.quick) {
      G.stage = Object.assign({}, st, {
        waves: [{ camera: { x: 0, zoom: 1.08 }, spawns: [
          { t: 0.25, type: 'enemy', kind: st.enemy, x: 0.55, y: 0.68, scale: 0.92, tel: 1.2 }
        ] }]
      });
    }
  }

  function announce(text, kind) {
    G.callout = { text, kind: kind || 'info', t: 0, life: 0.7 };
  }

  /* ---------- shooting & entities ---------- */

  const WEAPONS = {
    pistol:  { name: 'PISTOL',  ammo: 6,  pellets: 1, spread: 0,    dmg: 1, pierce: 0, rate: 0,    color: '#ffd056' },
    shotgun: { name: 'SHOTGUN', ammo: 5,  pellets: 5, spread: 0.14, dmg: 1, pierce: 0, rate: 0,    color: '#ff8a3a' },
    smg:     { name: 'SMG',     ammo: 16, pellets: 1, spread: 0.03, dmg: 1, pierce: 0, rate: 0.07, color: '#c0e8ff' },
    rail:    { name: 'RAIL',    ammo: 3,  pellets: 1, spread: 0,    dmg: 2, pierce: 1, rate: 0.28, color: '#80f0ff' }
  };
  function weaponCfg() {
    const p = G.player;
    return WEAPONS[(p && p.weapon) || 'pistol'] || WEAPONS.pistol;
  }
  function setWeapon(kind) {
    const p = G.player; if (!p) return;
    const w = WEAPONS[kind] || WEAPONS.pistol;
    p.weapon = kind;
    p.maxAmmo = w.ammo;
    p.ammo = w.ammo;
    p.fireCd = 0;
    announce(w.name, 'good');
  }
  function revertPistol() {
    const p = G.player; if (!p) return;
    p.weapon = 'pistol';
    p.maxAmmo = 6;
    p.ammo = 6;
    announce('PISTOL', 'info');
  }
  function tryRhythmReload() {
    const p = G.player; if (!p) return;
    if (p.ammo >= p.maxAmmo) return;
    if ((p.rhythmLock || 0) > 0) return;
    const beat = (G.reloadBeat || 0) % 1;
    const sweet = beat > 0.38 && beat < 0.62;
    p.rhythmLock = 0.18;
    if (sweet) {
      p.ammo = p.maxAmmo;
      p.reloadT = 0;
      p.perfectReloads = (p.perfectReloads || 0) + 1;
      const add = 150 * Math.min(8, Math.max(1, p.combo + 1));
      p.score += add; p.combo++; p.comboT = 2.4;
      p.maxCombo = Math.max(p.maxCombo, p.combo);
      announce('PERFECT RELOAD', 'good');
      popText(W / 2, H - 240, 'PERFECT +' + add, '#9cffb0');
      TPAudio.reload(); TPAudio.combo && TPAudio.combo(3);
      G.shellFlash = 0.35;
    } else {
      // early/late: still chamber one if the auto tick is close, else a miss click
      if (p.ammo < p.maxAmmo) { p.ammo++; p.reloadT = 0; TPAudio.reload(); }
      popText(W / 2, H - 240, 'EARLY', '#ffd056');
    }
  }

  function shoot(x, y) {
    if (G.hideAmt > 0.55) return;
    const p = G.player;
    if (!p) return;
    if (p.ammo <= 0) { TPAudio.dry(); announce('RELOAD!', 'warn'); flashShells(); return; }
    const w = weaponCfg();
    p.ammo--;
    p.shots++;
    p.comboT = Math.max(p.comboT, 0);
    p.fireCd = w.rate || 0;
    TPAudio.shot();
    haptic(18);
    G.shake = Math.max(G.shake, w.pierce ? 10 : 7);
    G.gunKick = w.pierce ? 1.35 : 1;
    const aim = assistAim(x, y);
    x = aim.x; y = aim.y;
    muzzle(x, y);
    if (w.pierce) {
      allocP({ k: 'tracer', x: W / 2, y: H * 0.78, x2: x, y2: y, life: 0.16, t: 0, c: w.color });
    }
    const pellets = w.pellets || 1;
    let any = false;
    for (let i = 0; i < pellets; i++) {
      const ang = (i - (pellets - 1) / 2) * (w.spread || 0);
      const px = x + Math.sin(ang) * 220;
      const py = y - Math.cos(ang) * 40 * (w.spread ? 1 : 0);
      _hitList.length = 0;
      for (let hi = 0; hi < G.entities.length; hi++) {
        const ent = G.entities[hi];
        if (ent.alive && ent.hit) _hitList.push(ent);
      }
      _hitList.sort((a, b) => (b.scale + b.y) - (a.scale + a.y));
      const hits = _hitList;
      const struck = [];
      if (inCoverApron(px, py)) {
        if (i === 0) materialImpact(px, py);
        continue;
      }
      for (const e of hits) {
        if (hitTest(e, px, py)) {
          struck.push(e);
          if (!w.pierce) break;
        }
      }
      if (!struck.length) {
        if (i === 0) materialImpact(px, py);
        continue;
      }
      any = true;
      for (const e of struck) {
        const head = isHeadshot(e, px, py);
        const weak = isWeakPoint(e, px, py);
        damageEntity(e, px, py, head, { weak: weak, dmg: w.dmg || 1 });
      }
    }
    if (!any) { p.combo = 0; p.comboT = 0; }
    if (p.ammo <= 0 && p.weapon !== 'pistol') revertPistol();
  }

  function assistAim(x, y) {
    const D = diffCfg();
    const touch = !!(G.pointer && G.pointer.touch);
    let rad = 0;
    if (D.name === 'EASY') rad = D.assist;
    else if (D.name === 'NORMAL' && touch) rad = D.assist;
    if (!rad) return { x, y };
    let best = null, bestD = rad;
    for (const e of G.entities) {
      if (!e.alive || !e.hit || e.type === 'civilian' || e.type === 'pickup') continue;
      const b = e.box; if (!b) continue;
      const dist = Math.hypot(x - b.x, y - b.y);
      if (dist < bestD) { bestD = dist; best = e; }
    }
    if (!best || !best.box) return { x, y };
    const b = best.box;
    // mild snap toward the torso, keep some of the player's aim
    return { x: x * 0.35 + b.x * 0.65, y: y * 0.35 + b.y * 0.65 };
  }
  function isHeadshot(e, x, y) {
    const b = e.box;
    if (!b) return false;
    return y < (b.y - b.hh * 0.32);
  }
  function hitTest(e, x, y) {
    const b = e.box;
    if (!b) return false;
    const dx = (x - b.x) / b.hw, dy = (y - b.y) / b.hh;
    return dx * dx + dy * dy <= 1;
  }

  function isWeakPoint(e, x, y) {
    if (!e || e.type !== 'boss' || !e.weak) return false;
    const w = e.weak;
    return Math.hypot(x - w.x, y - w.y) < (w.r || 36);
  }
  function damageEntity(e, x, y, head, extra) {
    extra = extra || {};
    if (e.type === 'shot') {
      e.alive = false; e.state = 'dead'; e.stateT = 0;
      const orb = e.kind === 'orb';
      const add = (orb ? 150 : 75) * Math.min(8, Math.max(1, G.player.combo + 1));
      G.player.hits++; G.player.combo++; G.player.maxCombo = Math.max(G.player.maxCombo, G.player.combo);
      G.player.comboT = 2.4; G.player.score += add; G.player.killScore += add;
      TPAudio.hit(); haptic(10);
      burst(x, y, orb ? '#80f0ff' : '#ffe8a0', orb ? 18 : 10);
      popText(x, y - 30, (orb ? 'ORB ' : 'DENY ') + add, '#9cf0ff');
      try { TPAudio.bark && TPAudio.bark('chaos'); } catch (err) {}
      return;
    }
    if (e.type === 'civilian') {
      e.alive = false; e.state = 'dead'; e.stateT = 0;
      G.player.civHits++;
      G.player.combo = 0;
      G.player.comboT = 0;
      const pen = e.hostage ? 800 : 500;
      G.player.civPenalty += pen;
      G.player.score = Math.max(0, G.player.score - pen);
      TPAudio.civilian();
      announce((e.hostage ? 'HOSTAGE' : 'CIVILIAN') + '  −' + pen, 'bad');
      G.shake = 14; G.flash = 0.35;
      burst(x, y, '#ff4060', 18);
      popText(x, y - 40, '−' + pen, '#ff6b7d');
      return;
    }
    if (e.type === 'pickup') {
      takePickup(e);
      e.alive = false;
      return;
    }
    if (e.type === 'bonus' || e.type === 'secret') {
      collectBonus(e, x, y);
      return;
    }
    // Shield goons shrug body shots; head, rail, or broken shield get through
    if (e.role === 'shield' && e.shieldHp > 0 && !head && !extra.weak && !(extra.dmg > 1)) {
      e.shieldHp--;
      e.flash = 0.6;
      e.recoil = 0.5;
      TPAudio.hit();
      popText(x, y - 40, 'SHIELD', '#c0e8ff');
      burst(x, y, '#9ad0ff', 8);
      if (e.shieldHp <= 0) announce('SHIELD BREAK', 'info');
      return;
    }
    const dealt = Math.max(1, extra.dmg || 1) + (extra.weak ? 1 : 0);
    e.hp -= dealt;
    e.flash = 1;
    e.recoil = 1.15;
    e.squash = 1.15;
    G.flash = Math.max(G.flash || 0, head ? 0.16 : 0.10);
    G.shake = Math.max(G.shake || 0, head ? 11 : 7);
    if (e.state !== 'tel' && e.state !== 'dead') {
      e.state = 'hit'; e.stateT = 0;
      e.hitVx = (e.x < W / 2 ? -1 : 1) * (e.type === 'boss' ? 70 : 140);
      e.squash = Math.max(e.squash || 0, 0.7);
    }
    G.player.hits++;
    G.player.combo++;
    G.player.maxCombo = Math.max(G.player.maxCombo, G.player.combo);
    G.player.comboT = 2.4;
    const mult = Math.min(8, G.player.combo);
    const base = e.type === 'boss' ? 100 : 100;
    const hs = head ? 50 : 0;
    if (head) G.player.headshots++;
    const add = (base + hs) * mult;
    G.player.score += add;
    G.player.killScore += add;
    if (e.type === 'boss') TPAudio.bossHit(); else TPAudio.hit();
    burst(x, y, head ? '#fff4c0' : '#ffe8a0', head ? 20 : 14);
    const label = (mult > 1 ? mult + 'x ' : '') + (head ? 'HEAD ' : '') + add;
    popText(x, y - 50, label, head ? '#fff1a0' : '#ffe07a');
    if (head) popText(x, y - 86, 'HEADSHOT', '#ffd056');
    if (extra.weak) popText(x, y - 110, 'WEAK POINT', '#80f0ff');
    if (G.player.combo === 5 || G.player.combo === 8 || G.player.combo === 12) {
      announce(G.player.combo + 'x COMBO', 'good');
      try { TPAudio.combo(G.player.combo); } catch (err) {}
    }
    if (e.hp <= 0) kill(e, head);
  }

  function kill(e, head) {
    e.alive = false; e.state = 'dead'; e.stateT = 0;
    const paintedDeath = e.type === 'enemy' && (IM['enemy_' + e.kind + '_death0'] || IM['enemy_' + e.kind + '_death']);
    e.vx = (e.x < W / 2 ? -160 : 160) + rand(-40, 40);
    if (paintedDeath) { e.vx *= 0.55; e.vy = -240; e.vr = e.x < W / 2 ? -0.35 : 0.35; e.paintedDeath = true; e.squash = 0.85; }
    else { e.vy = -340; e.vr = e.x < W / 2 ? -1.7 : 1.7; e.squash = 1.1; }
    e.dissolved = false;
    TPAudio.death();
    haptic(e.type === 'boss' ? 40 : 20);
    G.player.kills++;
    G.shake = Math.max(G.shake, e.type === 'boss' ? 18 : 8);
    burst(e.x, e.y - 80, '#ffd0a0', e.type === 'boss' ? 36 : 16);
    timeSparks(e.x, e.y - 80, e.type === 'boss' ? 28 : 14);
    if (e.type === 'boss') {
      const post = TPStages.BANTER && TPStages.BANTER[G.stageIndex] && TPStages.BANTER[G.stageIndex].post;
      const bonus = 500;
      G.player.score += bonus;
      G.player.killScore += bonus;
      popText(e.x, e.y - 140, 'BOSS +' + bonus, '#ffd056');
      if (post) { announce(post, 'good'); if (G.callout) G.callout.life = 2.0; }
      else announce('DOWN', 'good');
      G.slowMo = 1.15;
      try { TPAudio.bark && TPAudio.bark('vera'); } catch (err) {}
    }
  }

  function takePickup(e) {
    TPAudio.pickup();
    if (e.kind === 'health') {
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + 1);
      announce('HEALTH', 'good'); popText(e.x, e.y, '+HP', '#7dff9a');
    } else if (e.kind === 'shotgun' || e.kind === 'smg' || e.kind === 'rail') {
      setWeapon(e.kind);
      popText(e.x, e.y, (WEAPONS[e.kind] || {}).name || e.kind, '#c0e8ff');
    } else {
      G.player.ammo = G.player.maxAmmo;
      announce('FULL MAG', 'good'); popText(e.x, e.y, 'AMMO', '#ffd56a');
    }
  }
  function collectBonus(e, x, y) {
    e.alive = false; e.state = 'dead'; e.stateT = 0;
    const p = G.player;
    p.combo++; p.comboT = 2.4; p.maxCombo = Math.max(p.maxCombo, p.combo);
    const mult = Math.min(8, p.combo);
    if (e.type === 'secret') {
      p.secrets = (p.secrets || 0) + 1;
      G.secretGot = true;
      const add = 400 * mult;
      p.score += add; p.killScore += add;
      announce('SECRET', 'good');
      popText(x, y - 40, 'SECRET +' + add, '#ffe07a');
      burst(x, y, '#ffe07a', 18);
    } else if (e.kind === 'crystal') {
      const add = 200 * mult;
      p.score += add;
      G.slowMo = Math.max(G.slowMo, 0.55);
      announce('TIME CRYSTAL', 'good');
      popText(x, y - 40, 'TIME +' + add, '#80f0ff');
      burst(x, y, '#80f0ff', 16);
    } else {
      const add = 125 * mult;
      p.score += add;
      popText(x, y - 40, 'COIN +' + add, '#ffd056');
      burst(x, y, '#ffd056', 12);
    }
    TPAudio.pickup();
  }

  function flashShells() { G.shellFlash = 0.4; }

  function hurtPlayer(amount) {
    haptic(30);
    const p = G.player;
    if (p.inv > 0) return;
    p.hp -= amount || 1;
    p.inv = 1.05;
    p.combo = 0;
    p.comboT = 0;
    TPAudio.hurt();
    G.shake = 16;
    G.flash = 0.45;
    announce('STRUCK!', 'bad');
    if (p.hp <= 0) onPlayerDown();
  }

  function onPlayerDown() {
    G.player.lives--;
    G.player.deaths = (G.player.deaths || 0) + 1;
    if (G.player.lives >= 0) {
      go('continue');
    } else {
      G.result = gradeStage(false);
      go('result');
    }
  }
  function tapContinue(x, y) {
    if (hitBox(x, y, 960, 700, 260, 70) || y > 640) {
      G.player.hp = G.player.maxHp;
      G.player.ammo = G.player.maxAmmo;
      G.player.inv = 1.5;
      // clear bullets, keep wave
      compactArr(G.entities, (e) => e.type !== 'shot');
      go('play');
      announce('CONTINUE');
    } else if (hitBox(x, y, 960, 800, 260, 60)) {
      G.result = gradeStage(false);
      go('result');
    }
  }

  const DRESS_BY_BG = {
    '11_glacier': 'glacier', '12_jungle': 'jungle', '23_grove': 'grove',
    '14_stadium': 'stadium', '15_arcade': 'arcade', '17_lab': 'lab',
    '18_nave': 'nave', '19_web': 'web', '20_foundry': 'foundry',
    '21_hive': 'hive', '22_mind': 'mind', '24_mars': 'mars', '25_nexus': 'nexus'
  };
  const DRESS_TINT = {
    glacier:  { fx: 'hue-rotate(175deg) saturate(0.9) brightness(1.14) contrast(1.06)', over: 'rgba(80,180,230,0.40)' },
    jungle:   { fx: 'hue-rotate(55deg) saturate(1.28) brightness(1.04)', over: 'rgba(40,120,40,0.36)' },
    grove:    { fx: 'hue-rotate(95deg) saturate(1.15) brightness(1.10)', over: 'rgba(30,150,120,0.38)' },
    stadium:  { fx: 'sepia(0.35) hue-rotate(-18deg) saturate(1.45) brightness(1.10)', over: 'rgba(200,80,20,0.36)' },
    arcade:   { fx: 'hue-rotate(260deg) saturate(1.45) brightness(1.06)', over: 'rgba(200,40,180,0.38)' },
    lab:      { fx: 'hue-rotate(100deg) saturate(1.25) brightness(1.08)', over: 'rgba(30,180,80,0.36)' },
    nave:     { fx: 'hue-rotate(-15deg) saturate(1.35) brightness(0.88) contrast(1.10)', over: 'rgba(150,20,40,0.42)' },
    web:      { fx: 'hue-rotate(-30deg) saturate(1.30) brightness(1.02)', over: 'rgba(160,20,70,0.36)' },
    foundry:  { fx: 'sepia(0.45) saturate(1.20) brightness(0.96) contrast(1.12)', over: 'rgba(180,90,30,0.40)' },
    hive:     { fx: 'hue-rotate(165deg) saturate(1.20) brightness(1.08)', over: 'rgba(20,140,180,0.38)' },
    mind:     { fx: 'hue-rotate(230deg) saturate(1.35) brightness(1.06)', over: 'rgba(140,40,200,0.38)' },
    mars:     { fx: 'hue-rotate(-28deg) saturate(1.40) brightness(1.04)', over: 'rgba(180,50,20,0.40)' },
    nexus:    { fx: 'hue-rotate(170deg) saturate(1.18) brightness(1.12)', over: 'rgba(20,200,220,0.34)' }
  };
  function dressKeyFor(st) {
    st = st || G.stage;
    if (!st) return null;
    return DRESS_BY_BG[st.bg] || null;
  }

  // Shared cover geometry. Gapped props (casino table legs, etc.) get a solid
  // apron so enemies are neither seen nor shot through interior holes.
  const COVER_APRON = {
    casino: { top: 0.34, insetL: 0.08, insetR: 0.08, fill: ['#3a2218', '#1a100c'] },
    foundry: { top: 0.50, insetL: 0.16, insetR: 0.16, fill: ['#2a2018', '#0c0a08'] },
    nexus: { top: 0.42, insetL: 0.14, insetR: 0.14, fill: ['#102028', '#06080c'] },
    bone: { top: 0.52, insetL: 0.12, insetR: 0.12, fill: ['#2a2418', '#12100c'] }
  };
  function coverLayout() {
    const hidden = Math.max(0, G.hideAmt || 0);
    const pal = (G.stage && G.stage.palette) || ['#1a120c', '#3a2a18', '#c8a070'];
    const key = (window.TPMotion && TPMotion.coverKeyFor(G.stage)) || 'woods';
    const img = IM['cover_' + key];
    const wob = Math.sin((G.t || 0) * 16) * Math.min(10, Math.abs(G.hideVel || 0) * 7);
    const riseK = hidden < 0 ? 0 : (window.TPMotion ? TPMotion.easeOutBack(Math.min(1, hidden), 0.7) : hidden);
    const peek = 118;
    const full = 520;
    const rise = (peek + (full - peek) * Math.max(0, Math.min(1.08, riseK)));
    const ox = -(G.cam.x || 0) * 150;
    const oy = -(G.cam.y || 0) * 22;
    const lipY = 1080 - (70 + (210 - 70) * Math.max(0, Math.min(1, hidden))) + oy + wob * 0.15;
    // W,H used below from closure
    const L = { hidden, riseK, key, pal, wob, rise, ox, oy, lipY, img: img || null, x: 0, destY: 0, dw: 0, dh: 0, apron: null };
    if (img) {
      const aspect = img.width / Math.max(1, img.height);
      let dw, dh;
      if (aspect >= 1.45) { dw = W * 1.06; dh = dw / aspect; }
      else if (aspect <= 1.05) { dh = Math.min(H * 0.72, rise * 1.15); dw = dh * aspect; }
      else {
        dw = W * 0.92; dh = dw / aspect;
        if (dh > rise * 1.25) { dh = rise * 1.25; dw = dh * aspect; }
      }
      L.dw = dw; L.dh = dh;
      L.x = (W - dw) / 2 + ox + wob * 0.4;
      L.destY = H - dh * (0.22 + 0.78 * Math.max(0, Math.min(1, riseK))) + oy + wob;
      const spec = COVER_APRON[key];
      if (spec && hidden > 0.15) {
        const y = L.destY + L.dh * spec.top;
        L.apron = {
          x: L.x + L.dw * spec.insetL,
          y: y,
          w: L.dw * (1 - spec.insetL - spec.insetR),
          h: Math.max(8, H + 20 - y),
          fill: spec.fill
        };
      }
    }
    return L;
  }
  function inCoverApron(px, py) {
    if ((G.hideAmt || 0) < 0.18) return false;
    const L = coverLayout();
    const a = L && L.apron;
    if (!a) return false;
    return px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h;
  }

  function spawnEntity(s) {
    const groundY = plantNorm(s.y, s.type) * H;
    const e = {
      type: s.type, kind: s.kind, name: s.name,
      x: (function () {
        let x = s.x * W;
        // Keep character sprites inside the frame (stadium right-lane was clipping).
        if (s.type === 'enemy' || s.type === 'civilian' || s.type === 'boss') {
          const margin = 0.22 * W; // keep feet and silhouette inside the frame, even with camera zoom
          x = clamp(x, margin, W - margin);
        }
        return x;
      })(), y: groundY, authScale: s.scale || 1,
      scale: (s.scale || 1) * (s.type === 'pickup' ? 1 : depthFromY(groundY)),
      hp: s.type === 'enemy' ? (s.hp || 1) : s.type === 'boss' ? s.hp : 1,
      maxHp: s.type === 'boss' ? s.hp : 1,
      alive: true, state: 'enter', stateT: 0,
      tel: s.tel || 0.9, flash: 0, bob: rand(0, Math.PI * 2),
      from: s.from || 'ground', hit: true, box: null,
      vx: 0, vy: 0, rot: 0, vr: 0, walkPhase: 0,
    };
    if (e.type === 'civilian') { e.leaveIn = rand(3.4, 5.2); e.hostage = !!s.hostage; }
    if (e.type === 'pickup' || e.type === 'bonus' || e.type === 'secret') e.hit = true;
    if (e.type === 'enemy') {
      e.role = s.role || 'gun';
      if (e.role === 'shield') { e.hp = Math.max(e.hp, 2); e.maxHp = e.hp; e.shieldHp = 2; e.tel = (e.tel || 0.9) + 0.12; }
      if (e.role === 'runner') { e.tel = Math.max(0.42, (e.tel || 0.9) - 0.18); e.runDir = s.x < 0.5 ? 1 : -1; }
      if (e.role === 'thrower') { e.throwCd = rand(0.6, 1.2); }
      if (e.role === 'sniper') { e.tel = (e.tel || 0.9) + 0.28; e.authScale = (e.authScale || 1) * (s.scaleBias || 0.82); }
      if (e.role === 'drone') { e.hp = Math.max(e.hp, 2); e.maxHp = e.hp; e.fly = true; e.y0 = e.y; }
    }
    e.baseScale = e.scale;
    e.plantX = e.x; e.plantY = e.y;
    if (e.type === 'boss') {
      e.enterKind = 'drop'; e.enterDur = 0.85;
      e.y = e.plantY - 420;
    } else if (e.type === 'enemy' || e.type === 'civilian') {
      const from = e.from || 'path';
      if (from === 'cover' || from === 'crate' || from === 'log' || from === 'tree') {
        e.enterKind = 'pop';
        e.enterDur = 0.44;
      } else if (from === 'door' || from === 'porch') {
        e.enterKind = 'walk';
        e.enterDur = 1.25;
        e.x0 = e.plantX < W / 2 ? W * 0.05 : W * 0.95;
        e.x = e.x0;
      } else if (from === 'drop') {
        e.enterKind = 'drop';
        e.enterDur = 0.78;
        e.y = e.plantY - 420;
      } else if (from === 'vehicle') {
        e.enterKind = 'vehicle';
        e.enterDur = 1.15;
        e.x0 = e.plantX < W / 2 ? -200 : W + 200;
        e.y0 = e.plantY - 28;
        e.x = e.x0; e.y = e.y0;
      } else if (from === 'rail') {
        e.enterKind = 'rail';
        e.enterDur = 1.10;
        e.x0 = e.plantX < W / 2 ? -220 : W + 220;
        e.y0 = e.plantY - 6;
        e.x = e.x0; e.y = e.y0;
      } else {
        // path / anything else: walk in from off-screen — never a generic pop
        e.enterKind = 'walk';
        e.enterDur = 1.20;
        e.x0 = e.plantX < W / 2 ? -180 : W + 180;
        e.x = e.x0;
      }
      if (e.type === 'enemy') e.dress = dressKeyFor(G.stage);
    } else {
      e.enterKind = 'pop'; e.enterDur = 0.3;
    }
    if (((G.save && G.save.difficulty) || 'normal') === 'hard' && e.enterDur) {
      e.enterDur *= 0.80;
    }
    if (e.type === 'enemy') assignVariant(e);
    G.entities.push(e);
    return e;
  }

  function neighbors(e, span) {
    const r = (span == null ? 0.36 : span) * W;
    return G.entities.filter((o) => o && o !== e && o.alive && o.type === 'enemy' && o.kind === e.kind && Math.abs(o.x - e.x) < r);
  }
  function assignVariant(e) {
    const near = neighbors(e, 0.36);
    const used = {};
    near.forEach((o) => { used[(o.varTint || 0) + ':' + (o.varFlip ? 1 : 0)] = true; });
    const opts = [];
    for (let t = 0; t < 3; t++) for (let f = 0; f < 2; f++) {
      if (!used[t + ':' + f]) opts.push({ t: t, f: f });
    }
    // Prefer a different tint over a pure mirror of the same costume
    opts.sort((a, b) => {
      const close = near[0];
      const da = close ? (a.t === (close.varTint || 0) ? 1 : 0) + (a.f === !!close.varFlip ? 0.2 : 0) : 0;
      const db = close ? (b.t === (close.varTint || 0) ? 1 : 0) + (b.f === !!close.varFlip ? 0.2 : 0) : 0;
      return da - db;
    });
    let pick;
    if (opts.length) pick = opts[0];
    else {
      const close = near.slice().sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
      pick = { t: ((((close && close.varTint) || 0) + 1) % 3), f: close ? !close.varFlip : false };
    }
    e.varTint = pick.t;
    e.varFlip = !!pick.f;
    desyncNear(e, near);
  }
  function desyncNear(e, near) {
    near = near || neighbors(e, 0.4);
    e.bob = (e.bob || 0) + rand(0, Math.PI * 2);
    e.walkPhase = rand(0, Math.PI * 2);
    e.stateT = (e.stateT || 0) + rand(0, 0.28);
    e.telBias = rand(0, 0.4);
    if (near[0]) {
      e.bob = (near[0].bob || 0) + 1.85 + rand(-0.2, 0.2);
      e.walkPhase = (near[0].walkPhase || 0) + 1.4 + rand(0, 0.8);
      e.stateT = (near[0].stateT || 0) + 0.32 + rand(0, 0.25);
      e.telBias = (near[0].telBias || 0) + 0.38 + rand(0, 0.2);
    }
  }
  function neighborBusy(e) {
    return neighbors(e, 0.36).some((o) => o.state === 'tel' || o.state === 'shoot');
  }

  function startBoss() {
    const st = G.stage;
    G.phase = 'boss';
    G.bossPhase = 1;
    G.bossIntro = 0.001;
    showHud(false);
    TPAudio.playMusic('boss');
    G.cam.tz = 1.34; G.cam.tx = 0;
    try { TPAudio.sting(); } catch (e) {}
    const D = diffCfg();
    const hp = Math.max(3, Math.round((G.quick ? 4 : st.bossHp) * D.bossHpMul));
    G.boss = spawnEntity({
      type: 'boss', kind: st.boss.id, name: st.boss.name,
      x: 0.5, y: 0.82, scale: 0.98, hp: hp, tel: 1.05 * telScale()
    });
  }

  function updateWave(dt) {
    G.waveT += dt;
    const waves = G.stage.waves;
    const wave = waves[G.wave];
    if (!wave) return;
    if (wave.camera) {
      G.cam.tx = wave.camera.x || 0;
      G.cam.tz = wave.camera.zoom || 1;
    }
    if (!G.spawnedForWave) {
      G.spawnedForWave = true;
      if (wave.hint) { G.hint = wave.hint; G.hintT = 3.0; }
      if (G.wave === 0 && G.stage && G.stage.secret && !G.secretGot) {
        const sec = G.stage.secret;
        spawnEntity({ t: 0, type: 'secret', kind: sec.kind || 'glyph', x: sec.x, y: sec.y, scale: 0.7 });
      }
    }
    for (const s of wave.spawns) {
      if (!s._done && G.waveT >= s.t) { s._done = true; spawnEntity(s); }
    }
    const pending = wave.spawns.some((s) => !s._done);
    const liveThreat = G.entities.some((e) => e.alive && (e.type === 'enemy' || e.type === 'boss' || e.type === 'shot'));
    if (!pending && !liveThreat && G.waveT > 0.6) {
      wave.spawns.forEach((s) => { s._done = false; });
      G.wave++;
      G.waveT = 0;
      G.spawnedForWave = false;
      if (G.wave >= waves.length) startBoss();
      else startDolly();
    }
  }

  function bgImageB(st) {
    if (!st) return null;
    const k = st.bg;
    return IM['bg_' + k + '_b'] || (k === 'woods' ? IM.bg_woods_b : null) || null;
  }

  function startDolly() {
    const hasB = !!(G.stage && bgImageB(G.stage));
    if (!(G.quick || G.reduced || (G.save && G.save.reduced))) {
      const dir = (G.wave % 2 ? 1 : -1);
      G.dolly = { t: 0, life: hasB ? 1.15 : 0.95, x0: G.cam.x, z0: G.cam.z, x1: dir * 0.08, z1: hasB ? 1.14 : 1.10 };
      G.cam.tx = G.dolly.x1; G.cam.tz = G.dolly.z1;
    }
    // Mid-stage camera cut / dolly onto the second painted plate when one exists
    if (hasB && !G.usePlateB) {
      G.usePlateB = true;
      G.plateT = 0.001;
    }
  }

  function updateEntities(dt) {
    for (const e of G.entities) {
      e.stateT += dt;
      e.bob += dt * 2.2;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 6);
      if (e.recoilHold > 0) e.recoilHold = Math.max(0, e.recoilHold - dt);
      else if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - dt * 5.5);
      if (e.squash > 0) e.squash = Math.max(0, e.squash - dt * 8);
      if (e.type === 'shot') { updateShot(e, dt); continue; }
      if (e.state === 'dead') {
        e.deadFade = (e.deadFade || 0) + dt;
        if (e.paintedDeath) {
          e.vy = (e.vy || 0) + 820 * dt;
          e.x += (e.vx || 0) * dt;
          e.y += e.vy * dt;
          e.rot += (e.vr || 0) * dt;
          if (e.plantY && e.y > e.plantY + 10 && e.vy > 0) {
            e.y = e.plantY + 10; e.vy = 0; e.vx *= 0.2; e.vr *= 0.25;
            if (!e.deathLanded) {
              e.deathLanded = true; e.squash = 1.2;
              for (let i = 0; i < 10; i++) {
                allocP({ k: 'dust', x: e.x + rand(-50, 50), y: e.y - 4, vx: rand(-80, 80), vy: rand(-70, -10), life: rand(0.28, 0.55), t: 0, s: rand(10, 22), rot: rand(0, 6), c: 'rgba(170,150,120,0.85)' });
              }
            }
          }
        } else {
          e.vy = (e.vy || 200) + 1080 * dt;
          e.x += (e.vx || 0) * dt;
          e.y += e.vy * dt;
          e.rot += (e.vr || 1.4) * dt;
          if (e.plantY && e.y > e.plantY + 44 && e.vy > 0) {
            e.y = e.plantY + 44; e.vy *= -0.22; e.vr = (e.vr || 1) * 0.4;
            if (!e.deathLanded) { e.deathLanded = true; e.squash = 1.05; }
          }
        }
        if (!e.dissolved && e.deadFade > (e.paintedDeath ? 1.05 : 0.7)) {
          e.dissolved = true;
          timeSparks(e.x, e.y - 40, e.type === 'boss' ? 22 : 12);
        }
        continue;
      }
      if (!e.alive) continue;
      if (e.type === 'enemy' || e.type === 'civilian' || e.type === 'boss') {
        const px = e._px != null ? e._px : e.x;
        const dxLoco = e.x - px;
        e.vx = dt > 0.0001 ? dxLoco / dt : (e.vx || 0);
        e._px = e.x;
        if (window.TPMotion) TPMotion.locoTick(e, dt, dxLoco);
        else {
          const spd = Math.abs(e.vx || 0);
          if (!(e.state === 'enter' && (e.enterKind === 'walk' || e.enterKind === 'vehicle' || e.enterKind === 'rail'))) {
            e.walkPhase = (e.walkPhase || 0) + dt * (4.6 + Math.min(14, spd * 0.05));
          }
        }
      }
      if (e.type === 'pickup' || e.type === 'bonus' || e.type === 'secret') {
        if (e.type === 'bonus') {
          e.x += Math.sin(e.bob * 1.3) * 50 * dt;
          e.y += Math.cos(e.bob * 0.9) * 28 * dt;
        } else {
          e.y += Math.sin(e.bob) * 8 * dt;
        }
        continue;
      }
      if (e.state === 'enter') {
        const d = e.enterDur || 0.32;
        const k = Math.min(1, e.stateT / d);
        // Linear for ground approaches so stride cadence stays even (ease-out was
        // 800px/s off-screen then a crawl on one frozen walk frame).
        const easeWalk = k;
        const ease = 1 - Math.pow(1 - k, 3);
        if (e.enterKind === 'walk' || e.enterKind === 'vehicle' || e.enterKind === 'rail') {
          const x0 = e.x0 != null ? e.x0 : (e.plantX < W / 2 ? -180 : W + 180);
          e.x = x0 + (e.plantX - x0) * easeWalk;
          if (e.enterKind === 'vehicle') {
            const hop = Math.sin(Math.PI * k) * 36;
            e.y = (e.plantY || e.y) - hop;
            e.squash = -0.18 * Math.sin(Math.PI * k);
          } else if (e.enterKind === 'rail') {
            e.y = (e.plantY || e.y);
            e.rot = (1 - ease) * (e.plantX < W / 2 ? -0.08 : 0.08);
          }
        } else if (e.enterKind === 'drop') {
          e.y = (e.plantY - 420) + 420 * ease;
          e.squash = k < 0.82 ? 0.35 * (1 - k) : 0.9 * ((k - 0.82) / 0.18);
          if (k > 0.88 && !e.landed) { e.landed = true; G.shake = Math.max(G.shake, 16); burst(e.x, e.y, '#ffe7b0', 18); dustPuff(e.x, e.y, 1.15); }
        } else if (e.enterKind === 'pop') {
          const hid = 170 * (e.authScale || e.scale || 1);
          const rise = 1 - Math.pow(1 - k, 3);
          e.y = (e.plantY || e.y) + hid * (1 - rise);
          // stretch on the way up, squat on the landing
          e.squash = k < 0.78 ? -0.45 * (1 - k) : 0.95 * ((k - 0.78) / 0.22);
        }
        if (e.stateT >= d) {
          const duckNext = e.enterKind === 'pop' && e.type === 'enemy' && Math.random() < 0.22;
          if ((e.enterKind === 'pop' || e.enterKind === 'drop' || e.enterKind === 'walk' || e.enterKind === 'vehicle' || e.enterKind === 'rail') && !e.landedPuff) {
            e.landedPuff = true; dustPuff(e.x, e.plantY || e.y, (e.enterKind === 'walk' || e.enterKind === 'rail') ? 0.7 : 1);
          }
          e.state = duckNext ? 'duck' : 'idle';
          e.stateT = 0;
          e.x = e.plantX || e.x;
          e.y = e.plantY || e.y;
          e.squash = (e.enterKind === 'pop' || e.enterKind === 'drop') ? 0.65 : 0;
        }
      } else if (e.type === 'civilian') {
        e.leaveIn -= dt;
        if (e.leaveIn <= 0) { e.alive = false; e.state = 'leave'; e.stateT = 0; }
      } else if (e.type === 'enemy' || e.type === 'boss') {
        if (e.type === 'boss' && G.bossIntro > 0) {
          // hold fire during dramatic entrance
        } else if (e.state === 'idle') {
          // Echo idles long enough that the redesign is visible; other foes keep their cadence.
          const wait = (e.kind === 'chaos' ? 2.25 : (e.type === 'boss' ? 0.45 : 0.55) * telScale()) + (e.telBias || 0);
          if (e.stateT > wait) {
            if (e.type === 'enemy' && neighborBusy(e)) {
              e.telBias = (e.telBias || 0) + 0.26;
            } else {
              e.state = 'tel'; e.stateT = 0; e.y = e.plantY || e.y;
            }
          }
        } else if (e.state === 'duck') {
          const dk = Math.min(1, e.stateT / 0.34);
          const dip = Math.sin(Math.min(1, dk) * Math.PI) * 78;
          e.y = (e.plantY || e.y) + dip;
          e.squash = 0.55 * Math.sin(Math.min(1, dk) * Math.PI);
          if (e.stateT > 0.36) { e.state = 'idle'; e.stateT = 0; e.y = e.plantY || e.y; e.squash = 0.2; }
        } else if (e.state === 'tel') {
          if (e.stateT >= Math.max(touchWindow() ? 0.52 : 0.44, e.tel * telScale())) fireEnemy(e);
        } else if (e.state === 'shoot') {
          if (e.stateT > 0.42) {
            const duckBack = e.type === 'enemy' && e.role === 'gun' && Math.random() < 0.18;
            e.state = duckBack ? 'duck' : 'idle'; e.stateT = 0;
          }
        } else if (e.state === 'hit') {
          e.x += (e.hitVx || 0) * dt;
          e.hitVx = (e.hitVx || 0) * Math.max(0, 1 - dt * 8);
          if (e.stateT > 0.32) { e.state = 'idle'; e.stateT = 0; e.hitVx = 0; e.x = e.plantX || e.x; e.y = e.plantY || e.y; }
        }
        if (e.type === 'boss') updateBoss(e, dt);
        if (e.type === 'enemy' && e.alive && e.state !== 'enter') updateRole(e, dt);
      }
    }
    compactArr(G.entities, (e) => {
      if (e.type === 'shot' && (e.state === 'dead' || !e.alive)) return false;
      if (e.state === 'dead' && e.deadFade > 1.45) return false;
      if (e.state === 'leave' && e.stateT > 0.5) return false;
      return true;
    });
    if (G.phase === 'boss' && G.boss && !G.boss.alive && G.boss.state === 'dead' && (G.boss.deadFade || 0) > 0.4) {
      // wait until fully acknowledged
    }
    if (G.phase === 'boss' && G.boss && !G.entities.some((e) => e.type === 'boss' && (e.alive || (e.deadFade || 0) < 0.7))) {
      if (!G.clearing) {
        G.clearing = true;
        G.clearWait = 0.6;
      }
    }
  }

  function updateRole(e, dt) {
    if (e.role === 'runner' && (e.state === 'idle' || e.state === 'tel')) {
      e.x += (e.runDir || 1) * 160 * dt;
      if (e.x < 80 || e.x > W - 80) e.runDir = -(e.runDir || 1);
    }
    if (e.role === 'drone') {
      const y0 = e.y0 || e.plantY || e.y;
      e.x += Math.sin(e.bob * 1.6) * 90 * dt;
      e.y = y0 + Math.sin(e.bob * 2.1) * 36;
    }
    if (e.role === 'thrower' && e.state === 'idle') {
      e.throwCd = (e.throwCd || 0) - dt;
      if (e.throwCd <= 0) {
        e.throwCd = 1.6;
        spawnShot(e.x, e.y - 140 * (e.scale || 1), W / 2, H * 0.62, 'bolt', 380, rand(-0.5, 0.5));
      }
    }
    if (e.role === 'sniper' && e.state === 'tel') {
      e.laser = true;
    } else e.laser = false;
  }

  function updateBoss(e, dt) {
    e.baseScale = e.baseScale || e.scale;
    const pulse = 0.012;
    e.scale = e.baseScale + Math.sin(G.t * 1.45) * pulse;
    e.stepT = (e.stepT || 0) + dt;
    if (e.kind === 'chaos' && e.state === 'idle') {
      if (!e.stepPose && e.stepT > 1.55) { e.stepPose = e.stepFlip ? 'L' : 'R'; e.stepFlip = !e.stepFlip; e.stepT = 0; }
      else if (e.stepPose && e.stepT > 0.4) { e.stepPose = null; e.stepT = 0; }
    } else if (e.state !== 'idle') e.stepPose = null;
    const lost = 1 - e.hp / e.maxHp;
    if (lost > 0.66 && G.bossPhase < 3) {
      G.bossPhase = 3; e.tel = Math.max(0.42, e.tel - 0.25); e.flash = 1;
      e.scale = (e.baseScale || e.scale) * 1.12; G.shake = 14;
      announce('PHASE 3 — WEAK POINT + ORBS', 'info');
      try { TPAudio.bark && TPAudio.bark('vera'); } catch (err) {}
    } else if (lost > 0.33 && G.bossPhase < 2) {
      G.bossPhase = 2; e.tel = Math.max(0.55, e.tel - 0.15); e.flash = 1; G.shake = 12;
      announce('PHASE 2 — AIM THE WEAK POINT', 'info');
      if (!G.quick) {
        spawnEntity({ t: 0, type: 'enemy', kind: G.stage.enemy, x: 0.22, y: 0.64, scale: 0.85, tel: 0.7 });
        spawnEntity({ t: 0, type: 'enemy', kind: G.stage.enemy, x: 0.80, y: 0.64, scale: 0.85, tel: 0.7 });
      }
    }
  }

  function fireEnemy(e) {
    e.state = 'shoot'; e.stateT = 0; e.recoil = 1.7; e.recoilHold = 0.07; if (e.type === 'boss') e.atkN = (e.atkN || 0) + 1;
    TPAudio.enemyShot();
    haptic(8);
    // Muzzle sits on the weapon, aimed at the player/camera — not off to the side.
    const originX = e.x;
    const originY = e.y - 250 * (e.scale || 1);
    allocP({ k: 'emuzzle', x: originX, y: originY, life: 0.14, t: 0, s: 2.4, star: 1 });
    burst(originX, originY, '#fff3a0', 14);
    burst(originX, originY, '#ff8020', 8);
    const phase = e.type === 'boss' ? (G.bossPhase || 1) : 1;
    const bolts = e.type === 'boss' ? (phase === 3 ? 3 : phase === 2 ? 2 : 1) : 1;
    for (let i = 0; i < bolts; i++) {
      const spread = (i - (bolts - 1) / 2) * 0.16;
      spawnShot(originX, originY, W / 2 + Math.sin(spread) * 90, H * 0.94, 'bolt', 680 + phase * 40, spread);
    }
    if (e.type === 'boss' && phase >= 2) {
      spawnShot(originX, originY - 16, W / 2 + rand(-40, 40), H * 0.90, 'orb', 280, 0);
    }
  }

  function spawnShot(x, y, tx, ty, kind, speed, spread) {
    const ang = Math.atan2(ty - y, tx - x) + (spread || 0) * 0.12;
    const spd = (speed || 620) * (isTouchRail() ? 0.84 : (isHardTouch() ? 0.96 : 1));
    const life = 0.85;
    G.entities.push({
      type: 'shot', kind: kind || 'bolt', x: x, y: y,
      x0: x, y0: y, tx: tx, ty: ty,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      alive: true, hit: true, state: 'fly', stateT: 0,
      scale: kind === 'orb' ? 0.7 : 0.45, life: life, maxLife: life, rot: ang,
      box: { x: x, y: y, hw: kind === 'orb' ? 28 : 14, hh: kind === 'orb' ? 28 : 14 }
    });
  }

  function updateShot(e, dt) {
    if (!e.alive) return;
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.life -= dt;
    e.stateT = (e.stateT || 0) + dt;
    const maxL = e.maxLife || 0.85;
    const u = clamp(1 - e.life / maxL, 0, 1);
    // Grow as the shot comes at the camera.
    e.scale = (e.kind === 'orb' ? 0.7 : 0.45) * (1 + u * 2.4);
    const hw = (e.kind === 'orb' ? 28 : 16) * (1 + u * 1.8);
    e.box = { x: e.x, y: e.y, hw: hw, hh: hw };
    const coverY = touchWindow() ? H * 0.66 : H * 0.78;
    const coverHide = touchWindow() ? 0.4 : 0.6;
    const hitCover = (G.hiding || G.hideAmt > coverHide) && e.y > coverY;
    const nearLens = u > 0.72 && Math.hypot(e.x - W / 2, e.y - H * 0.94) < 220;
    const hitPlayer = !G.hiding && G.hideAmt < 0.55 && (nearLens || (e.y > H * 0.86 && Math.abs(e.x - W / 2) < 340));
    if (hitCover) {
      e.alive = false; e.state = 'dead';
      materialImpact(e.x, H - 70);
      addCoverDecal(e.x, H - 90);
      G.shake = Math.max(G.shake, 4);
    } else if (hitPlayer || e.life <= 0 || e.y > H + 40) {
      e.alive = false; e.state = 'dead';
      if (hitPlayer) {
        G.screenCrack = 1;
        G.flash = Math.max(G.flash || 0, 0.55);
        G.shake = Math.max(G.shake || 0, 14);
        impact(W / 2, H * 0.62, '#ff6040');
        hurtPlayer(1);
      } else if (e.life <= 0) {
        materialImpact(e.x, e.y);
      }
    }
  }

  function stageClear() {
    G.clearing = false;
    const p = G.player;
    p.timeBonus = Math.max(0, Math.floor((90 - G.stageT) * 40));
    p.score += p.timeBonus;
    const res = gradeStage(true);
    const id = G.stage.id;
    G.save.unlocked = Math.max(G.save.unlocked, Math.min(25, id + 1));
    G.save.grades[id] = res.grade;
    if (!G.save.words.includes(G.stage.word)) G.save.words.push(G.stage.word);
    const prev = G.save.best[id] || 0;
    res.best = Math.max(prev, res.score);
    res.newBest = res.score > prev;
    if (res.score > prev) G.save.best[id] = res.score;
    G.save.totalBest = Object.keys(G.save.best).reduce((s, k) => s + (G.save.best[k] || 0), 0);
    res.totalBest = G.save.totalBest;
    res.kills = p.kills; res.headshots = p.headshots;
    res.timeBonus = p.timeBonus; res.civPenalty = p.civPenalty;
    G.result = res;
    writeSave();
    TPAudio.fanfare();
    const pages = TPStages.afterComic(G.stageIndex, G.stage.word);
    openComic(pages, () => go('result'));
  }

  function gradeStage(cleared) {
    const p = G.player;
    const acc = p.shots ? p.hits / p.shots : 0;
    let grade = 'D';
    if (cleared && acc >= 0.95 && p.civHits === 0) grade = 'S';
    else if (cleared && acc >= 0.85 && p.civHits <= 1) grade = 'A';
    else if (cleared && acc >= 0.7) grade = 'B';
    else if (cleared && acc >= 0.5) grade = 'C';
    else if (cleared) grade = 'C';
    return {
      cleared, grade, score: p.score, acc, civ: p.civHits,
      combo: p.maxCombo, word: G.stage.word, stage: G.stage,
      kills: p.kills, headshots: p.headshots, deaths: p.deaths || 0,
      timeBonus: p.timeBonus || 0, civPenalty: p.civPenalty || 0,
      best: (G.save.best[G.stage.id] || 0), totalBest: G.save.totalBest || 0,
    };
  }

  function tapResult(x, y) {
    // next / select / replay
    if (hitBox(x, y, 960, 820, 280, 70) && G.result.cleared) {
      TPAudio.ui();
      const n = G.stageIndex + 1;
      if (n < TPStages.STAGES.length) beginStage(n);
      else go('credits');
    } else if (hitBox(x, y, 700, 920, 240, 60)) {
      TPAudio.ui(); beginStage(G.stageIndex);
    } else if (hitBox(x, y, 1220, 920, 240, 60) || hitBox(x, y, 960, 920, 240, 60)) {
      TPAudio.ui(); go('select');
    } else if (G.result.cleared && y > 780) {
      const n = G.stageIndex + 1;
      if (n < TPStages.STAGES.length) beginStage(n);
      else go('credits');
    }
  }

  function selectNodes() {
    const nodes = [];
    const cols = 9, cw = 176, ch = 168, gapX = 22, gapY = 36;
    const gridX = 86, gridY = 200;
    for (let i = 0; i < TPStages.STAGES.length; i++) {
      const row = Math.floor(i / cols);
      let col = i % cols;
      if (row === 1) col = cols - 1 - col; // snake the rail
      if (row === 2) col = col;
      const x = gridX + col * (cw + gapX);
      const y = gridY + row * (ch + gapY);
      nodes.push({ i, x, y, w: cw, h: ch });
    }
    return nodes;
  }

  function tapSelect(x, y) {
    if (hitBox(x, y, 140, 120, 180, 60)) { TPAudio.ui(); go('title'); return; }
    const nodes = selectNodes();
    for (const n of nodes) {
      if (x > n.x && x < n.x + n.w && y > n.y && y < n.y + n.h) {
        const unlocked = n.i < G.save.unlocked;
        if (!unlocked) { TPAudio.dry(); announce && (G.hint = 'LOCKED'); return; }
        TPAudio.ui();
        beginStage(n.i);
        return;
      }
    }
  }

  function togglePause() {
    if (G.mode === 'play') {
      G.paused = true; G.mode = 'paused'; showHud(true);
    } else if (G.mode === 'paused') {
      G.paused = false; G.mode = 'play';
    }
  }

  /* ---------- particles ---------- */
  function dustPuff(x, y, scale) {
    const s = scale == null ? 1 : scale;
    const pal = (G.stage && G.stage.palette) || ['#3a3428', '#6a5a40'];
    const cols = [pal[1] || '#6a5a40', '#c4a574', '#8a7a60', '#d8c4a0'];
    for (let i = 0; i < 11; i++) {
      allocP({
        k: 'dust', x: x + rand(-18, 18) * s, y: y + rand(-4, 6),
        vx: rand(-90, 90) * s, vy: rand(-70, -10) * s,
        life: rand(0.32, 0.62), t: 0,
        c: cols[i % cols.length],
        s: rand(10, 22) * s, vr: rand(-1.2, 1.2), rot: rand(0, 6)
      });
    }
  }
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      allocP({
        k: 'spark', x, y, vx: rand(-360, 360), vy: rand(-420, 80),
        life: rand(0.25, 0.6), t: 0, c: color, s: rand(2, 6),
      });
    }
  }
  function impact(x, y, color) {
    allocP({ k: 'ring', x, y, life: 0.28, t: 0, c: color, s: 8 });
    burst(x, y, color, 8);
  }
  function materialImpact(x, y) {
    const mat = (window.TPFeel && TPFeel.material(G.stage)) || 'stone';
    const info = (window.TPFeel && TPFeel.impactColors(mat)) || { c: '#ffd090', n: 10 };
    allocP({ k: 'ring', x, y, life: 0.28, t: 0, c: info.c, s: 8 });
    if (mat === 'glass') {
      for (let i = 0; i < info.n; i++) allocP({ k: 'shard', x, y, vx: rand(-280, 280), vy: rand(-380, 40), life: rand(0.3, 0.7), t: 0, c: info.c, s: rand(3, 8), rot: rand(0, 6), vr: rand(-8, 8) });
      try { TPAudio.impactGlass && TPAudio.impactGlass(); } catch (e) {}
    } else if (mat === 'water') {
      for (let i = 0; i < info.n; i++) allocP({ k: 'splash', x, y, vx: rand(-160, 160), vy: rand(-300, -80), life: rand(0.25, 0.55), t: 0, c: info.c, s: rand(3, 7) });
      try { TPAudio.impactWater && TPAudio.impactWater(); } catch (e) {}
    } else if (mat === 'wood') {
      for (let i = 0; i < info.n; i++) allocP({ k: 'splinter', x, y, vx: rand(-240, 240), vy: rand(-320, 40), life: rand(0.3, 0.6), t: 0, c: info.c, s: rand(4, 10), rot: rand(0, 6), vr: rand(-6, 6) });
      try { TPAudio.impactWood && TPAudio.impactWood(); } catch (e) {}
    } else if (mat === 'ice') {
      for (let i = 0; i < info.n; i++) allocP({ k: 'shard', x, y, vx: rand(-260, 260), vy: rand(-360, 20), life: rand(0.3, 0.65), t: 0, c: info.c, s: rand(3, 7), rot: rand(0, 6), vr: rand(-8, 8) });
      try { TPAudio.impactGlass && TPAudio.impactGlass(); } catch (e) {}
    } else {
      burst(x, y, info.c, info.n);
      try { TPAudio.impactMetal && TPAudio.impactMetal(); } catch (e) {}
    }
  }
  function timeSparks(x, y, n) {
    for (let i = 0; i < n; i++) {
      allocP({
        k: 'timespark', x: x + rand(-20, 20), y: y + rand(-30, 20),
        vx: rand(-80, 80), vy: rand(-160, -20),
        life: rand(0.45, 0.95), t: 0, c: i % 2 ? '#7ef0ff' : '#ffd056', s: rand(2, 5)
      });
    }
  }
  function muzzle(tx, ty) {
    // Flash at the aim/impact point. Optional subtle tracer from the screen edge — no hand/gun.
    allocP({ k: 'muzzle', x: tx, y: ty, life: 0.09, t: 0 });
    allocP({ k: 'tracer', x: W / 2, y: H + 8, x2: tx, y2: ty, life: 0.05, t: 0, c: 'rgba(255,240,200,0.35)' });
  }
  function popText(x, y, text, c) {
    allocP({ k: 'text', x, y, vy: -80, text, c, life: 0.7, t: 0 });
  }
  function updateParts(dt) {
    for (const p of G.particles) {
      p.t += dt;
      if (p.k === 'spark' || p.k === 'casing' || p.k === 'shard' || p.k === 'splinter' || p.k === 'splash' || p.k === 'dust') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 'dust') { p.vy += 240 * dt; p.vx *= (1 - 2.8 * dt); p.s = (p.s || 12) + 28 * dt; }
        else p.vy += (p.k === 'splash' ? 700 : 900) * dt;
        if (p.rot != null) p.rot += (p.vr || 0) * dt;
      }
      if (p.k === 'timespark') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 40 * dt;
      }
      if (p.k === 'text') p.y += (p.vy || -80) * dt;
    }
    compactArr(G.particles, (p) => p.t < p.life, partPool);
  }

  /* ---------- main loop ---------- */
  function frame(ts) {
    if (!G.last) G.last = ts;
    let dt = (ts - G.last) / 1000;
    G.last = ts;
    dt = clamp(dt, 0, 0.05);
    if (G.slowMo > 0) { G.slowMo -= dt; dt *= 0.38; }
    G.dt = dt; G.t += dt; G.modeT = (G.modeT || 0) + dt;
    if (G.transT > 0) G.transT = Math.max(0, G.transT - dt);
    if (window.TPMotion) TPMotion.tickWipe(G, dt);
    if (G.mode === 'play' && !G.paused) updatePlay(dt);
    else if (G.mode === 'comic' && G.comic && G.comic.ready) G.comic.t += dt;
    else if (G.mode === 'title') G.titleT += dt;
    else if (G.mode === 'intro' && G.modeT > 6.4) finishIntro();
    else if (G.mode === 'stagecard' && G.modeT > 2.5 && G.assetReady !== false) enterPlay();
    tickBossIntro(dt);
    const tDraw = performance.now();
    render();
    G.perfLast = performance.now() - tDraw;
    requestAnimationFrame(frame);
  }

  function updatePlay(dt) {
    if (G.assetReady === false) return;
    const p = G.player;
    if (window.TPMotion) TPMotion.hideStep(G, dt);
    else G.hideAmt = lerp(G.hideAmt, G.hiding ? 1 : 0, 1 - Math.pow(touchWindow() ? 0.0002 : 0.0008, dt));
    if (G.hiding) {
      p.reloadT += dt;
      G.reloadBeat = (G.reloadBeat || 0) + dt / 0.55;
      if (p.rhythmLock > 0) p.rhythmLock -= dt;
      if (p.ammo < p.maxAmmo && p.reloadT > 0.18) {
        p.ammo++; p.reloadT = 0; TPAudio.reload();
      }
    } else { p.reloadT = 0; G.reloadBeat = 0; p.rhythmLock = 0; }
    if (p.fireCd > 0) p.fireCd -= dt;
    if (!G.hiding && G.hideAmt < 0.4 && G.pointer && G.pointer.down && (weaponCfg().rate > 0) && (p.fireCd || 0) <= 0 && p.ammo > 0) {
      shoot(G.pointer.x, G.pointer.y);
    }
    if (p.inv > 0) p.inv -= dt;
    if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
    if (G.hintT > 0) G.hintT -= dt;
    if (G.tutorial) {
      G.tutorialT = (G.tutorialT || 0) - dt;
      if (G.tutorialT <= 0) { G.tutorial = false; G.save.tutorialDone = true; writeSave(); }
    }
    if (G.callout) { G.callout.t += dt; if (G.callout.t > G.callout.life) G.callout = null; }
    if (G.shellFlash > 0) G.shellFlash -= dt;
    if (G.flash > 0) G.flash -= dt;
    if (G.gunKick > 0) G.gunKick = Math.max(0, G.gunKick - dt * 8);
    if (G.clearing && G.clearWait != null) {
      G.clearWait -= dt;
      if (G.clearWait <= 0) { G.clearWait = null; stageClear(); }
    }
    G.stageT += dt;
    G.shake *= Math.pow(0.04, dt);
    if (G.screenCrack > 0) G.screenCrack = Math.max(0, G.screenCrack - dt * 1.35);
    const mot = G.stage && G.stage.motion;
    const coverDip = (window.TPMotion && TPMotion.coverDip(G)) || 0;
    if (mot) {
      G.railX += (mot.speed || 180) * dt;
      G.bumpT -= dt;
      if (G.bumpT <= 0) {
        G.bump = 0.016;
        G.shake = Math.max(G.shake, 3.5);
        G.bumpT = 0.65 + Math.random() * 0.9;
        if (!G.loFi) spawnWhip(mot.kind);
      }
      G.bump *= Math.pow(0.05, dt);
      G.cam.ty = Math.sin(G.t * 2.15) * (mot.kind === 'airship' ? 0.02 : 0.01) + (G.bump || 0) + coverDip;
    } else {
      G.cam.ty = lerp(G.cam.ty, coverDip, 1 - Math.pow(0.04, dt));
    }
    if (G.usePlateB && G.plateBlend < 1) {
      G.plateT = (G.plateT || 0) + dt;
      G.plateBlend = Math.min(1, G.plateT / 1.05);
    }
    if (G.dolly) {
      G.dolly.t += dt;
      if (G.dolly.t >= G.dolly.life) {
        G.dolly = null;
        const wave = G.stage && G.stage.waves && G.stage.waves[G.wave];
        if (wave && wave.camera) { G.cam.tx = wave.camera.x || 0; G.cam.tz = wave.camera.zoom || 1; }
        else { G.cam.tx = 0; G.cam.tz = 1; }
      }
    }
    G.cam.x = lerp(G.cam.x, G.cam.tx, 1 - Math.pow(0.04, dt));
    G.cam.y = lerp(G.cam.y, G.cam.ty, 1 - Math.pow(0.04, dt));
    G.cam.z = lerp(G.cam.z, G.cam.tz, 1 - Math.pow(0.06, dt));
    if (G.phase === 'waves') updateWave(dt);
    updateEntities(dt);
    updateParts(dt);
    if (G.particles.length > (G.loFi ? 40 : 160)) G.particles.splice(0, G.particles.length - (G.loFi ? 40 : 160));
  }

  /* ---------- render ---------- */
  function render() {
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, viewW(), viewH());
    if (G.mode === 'intro') drawIntro(c);
    else if (G.mode === 'title') drawTitle(c);
    else if (G.mode === 'settings') drawSettings(c);
    else if (G.mode === 'comic') drawComic(c);
    else if (G.mode === 'select') drawSelect(c);
    else if (G.mode === 'stagecard') drawStageCard(c);
    else if (G.mode === 'credits') drawCredits(c);
    else if (G.mode === 'play' || G.mode === 'paused' || G.mode === 'continue') {
      drawWorld(c);
      drawScreenCrack(c);
      if (!(G.bossIntro > 0)) drawHud(c);
      if (G.bossIntro > 0) drawBossSplash(c);
      if (G.mode === 'paused') drawPause(c);
      if (G.mode === 'continue') drawContinue(c);
    } else if (G.mode === 'result') drawResult(c);
    if (G.wipe && window.TPMotion) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      TPMotion.drawWipe(c, G, viewW(), viewH());
    } else if (G.transT > 0) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      const a = G.transT / 0.32;
      c.fillStyle = 'rgba(0,0,0,' + (a * 0.85) + ')';
      c.fillRect(0, 0, viewW(), viewH());
    }
    drawCursor(c);
  }

  function worldTransform(c) {
    const kick = (G.gunKick || 0);
    const shx = (Math.random() - 0.5) * G.shake + kick * 5;
    const shy = (Math.random() - 0.5) * G.shake + kick * 9;
    const z = G.cam.z * (1 + kick * 0.012), cx = G.cam.x * W, cy = G.cam.y * H + G.hideAmt * 70;
    c.setTransform(z, 0, 0, z, W / 2 - (W / 2 + cx) * z + shx, H / 2 - (H / 2 + cy) * z + shy);
  }

  function drawWorld(c) {
    worldTransform(c);
    drawBackdrop(c, G.stage);
    // entities back to front (shots draw last among them)
    _drawList.length = 0;
    for (let di = 0; di < G.entities.length; di++) _drawList.push(G.entities[di]);
    _drawList.sort((a, b) => (a.y + a.scale * 10) - (b.y + b.scale * 10));
    const list = _drawList;
    for (const e of list) if (e.type !== 'pickup' && e.type !== 'shot') drawEntity(c, e);
    for (const e of list) if (e.type === 'pickup' || e.type === 'bonus' || e.type === 'secret') drawPickup(c, e);
    for (const e of list) if (e.type === 'shot') drawShot(c, e);
    drawParts(c);
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawWhip(c);
    if (!drawFgPlate(c, G.stage) && window.TPFeel) TPFeel.drawFgProps(c, G.stage, W, H, G.t, G.cam.x);
    drawForegroundCover(c);
    // no first-person gun/hand overlay
    if (G.flash > 0) {
      c.fillStyle = 'rgba(180,20,20,' + (G.flash * 0.4) + ')';
      c.fillRect(0, 0, W, H);
    }
  }

  function bgImageFor(st) {
    if (!st) return null;
    if (st.bg === 'woods') return IM.bg_woods;
    if (st.bg === 'west') return IM.bg_west;
    if (st.bg === 'rome') return IM.bg_rome;
    if (st.bg === 'rift') return IM.rift;
    if (IM['bg_' + st.bg]) return IM['bg_' + st.bg];
    return IM[st.bg] || null;
  }

  function drawScrolling(c, img, xOff, y, h, over) {
    if (!img) return;
    const dw = (img.width / img.height) * h;
    const o = over || 0;
    let x = -(((xOff % dw) + dw) % dw) - o;
    while (x < W + o + 80) {
      c.drawImage(img, x, y, dw, h);
      x += dw;
    }
  }
  function drawPlatePair(c, img, imgB, drawFn) {
    drawFn(img, 1);
    const blend = imgB ? (G.plateBlend || 0) : 0;
    if (imgB && blend > 0.01) {
      c.save();
      c.globalAlpha = blend;
      drawFn(imgB, blend);
      c.restore();
    }
  }

  function drawBackdrop(c, st) {
    const img = bgImageFor(st);
    const imgB = bgImageB(st);
    const mot = st && st.motion;
    if (img && mot) {
      // One full-bleed scrolling plate — no far/mid slice of the same art (those left hard horizontal seams).
      const scroll = G.railX * 0.55, near = G.railX * 1.15;
      const src = (G.plateBlend || 0) > 0.5 && imgB ? imgB : img;
      drawScrolling(c, src, scroll, -90, H + 180, 40);
      if (imgB && (G.plateBlend || 0) > 0.02 && (G.plateBlend || 0) < 0.98) {
        c.save();
        c.globalAlpha = G.plateBlend;
        drawScrolling(c, imgB, scroll, -90, H + 180, 40);
        c.restore();
      }
      drawDeck(c, mot.kind, near, st);
    } else if (img) {
      const px = -(G.cam.x || 0) * 70;
      const py = -(G.cam.y || 0) * 28;
      // Single overscanned plate. A second, differently scaled copy at 0.85 alpha caused brightness bands.
      c.drawImage(img, -80 + px, -60 + py, W + 160, H + 120);
      if (imgB && (G.plateBlend || 0) > 0.01) {
        c.save();
        c.globalAlpha = G.plateBlend;
        c.drawImage(imgB, -80 + px, -60 + py, W + 160, H + 120);
        c.restore();
      }
      G._holdBg = null;
    } else if (G._holdBg) {
      c.drawImage(G._holdBg, -80, -60, W + 160, H + 120);
    } else {
      drawProcBg(c, st);
    }
    const pal = st.palette || ['#000', '#333', '#fff'];
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal[0] + '00');
    g.addColorStop(1, 'rgba(0,0,0,0.18)');
    c.fillStyle = g;
    c.fillRect(-80, -60, W + 160, H + 120);
    if (window.TPFeel) TPFeel.drawLighting(c, st, W, H);
    if (!G.loFi) {
      drawAtmos(c, st);
      if (window.TPFeel) TPFeel.drawAtmosRich(c, st, W, H, G.t, G.loFi);
    }
  }
  function drawDeck(c, kind, xOff, st) {
    const pal = st.palette || ['#1a120c', '#3a2a18', '#c8a070'];
    const y0 = kind === 'airship' || kind === 'rift' ? H * 0.58 : H * 0.70;
    c.fillStyle = pal[0];
    c.globalAlpha = 0.72;
    if (kind === 'barge' || kind === 'yacht') {
      c.fillStyle = pal[1];
      c.fillRect(-80, y0 + 40, W + 160, H);
      c.globalAlpha = 0.35;
      c.fillStyle = pal[2];
      for (let i = 0; i < 8; i++) {
        const wx = ((-xOff * 0.4 + i * 280) % (W + 300)) - 80;
        c.beginPath(); c.ellipse(wx, y0 + 70, 90, 10, 0, 0, Math.PI * 2); c.fill();
      }
    } else if (kind === 'highway' || kind === 'street' || kind === 'maglev' || kind === 'rover' || kind === 'steamtrain' || kind === 'west_ride') {
      c.fillRect(-80, y0 + 20, W + 160, H);
      c.fillStyle = pal[2];
      c.globalAlpha = 0.45;
      const gap = kind === 'maglev' ? 220 : 160;
      for (let i = -2; i < 16; i++) {
        const lx = ((-xOff + i * gap) % (W + gap * 2)) - 40;
        c.fillRect(lx, y0 + 48, kind === 'maglev' ? 140 : 70, 8);
      }
    } else if (kind === 'airship') {
      c.fillStyle = pal[1];
      c.fillRect(-80, y0 + 50, W + 160, 28);
    }
    c.globalAlpha = 1;
    drawVehicles(c, kind, y0);
  }
  function drawVehicles(c, kind, y0) {
    const map = {
      west_ride: 'veh_train_west', steamtrain: 'veh_train_steam',
      yacht: 'veh_speedboat', barge: 'veh_nile_barge',
      highway: 'veh_neon_car', street: 'veh_neon_car',
      maglev: 'veh_maglev', rover: 'veh_mars_rover'
    };
    const img = IM[map[kind]];
    if (!img) return;
    const bob = Math.sin(G.t * 3.2) * 6;
    const big = (kind === 'west_ride' || kind === 'steamtrain' || kind === 'maglev');
    const h = big ? 420 : (kind === 'highway' || kind === 'street' ? 280 : 300);
    const w = h * (img.width / img.height);
    const xA = 30 + Math.sin(G.t * 0.4) * 16;
    const xB = W - w * 0.85 + Math.cos(G.t * 0.35) * 20;
    function smear(x, y, ww, hh, dir, flip) {
      c.save();
      const draw = (dx, dy) => {
        if (flip) {
          c.save();
          c.translate(dx + ww, dy);
          c.scale(-1, 1);
          c.drawImage(img, 0, 0, ww, hh);
          c.restore();
        } else {
          c.drawImage(img, dx, dy, ww, hh);
        }
      };
      for (let i = 7; i >= 1; i--) {
        c.globalAlpha = 0.06 * i;
        draw(x - dir * i * 16, y);
      }
      c.globalAlpha = 1;
      draw(x, y);
      // speed ticks travel with the car's facing
      c.globalAlpha = 0.35;
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const sx = x - dir * (40 + i * 28);
        const sy = y + hh * (0.3 + (i % 3) * 0.15);
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - dir * 36, sy); c.stroke();
      }
      c.restore();
    }
    if (kind === 'barge') {
      c.drawImage(img, xA, y0 - h * 0.72 + bob, w, h);
    } else {
      smear(xA, y0 - h * 0.72 + bob, w, h, 1, false);
      if (kind !== 'yacht') {
        const flip = (kind === 'highway' || kind === 'street');
        const imgB = (kind === 'highway' || kind === 'street') && IM.veh_neon_car_b;
        if (imgB) {
          const imgA = img;
          // temporarily draw the unique second car
          const w2 = h * 0.82 * (imgB.width / imgB.height);
          const h2 = h * 0.82;
          c.save();
          if (flip) { c.translate(xB + w2, y0 - h * 0.64 + bob * 0.6); c.scale(-1, 1); c.drawImage(imgB, 0, 0, w2, h2); }
          else c.drawImage(imgB, xB, y0 - h * 0.64 + bob * 0.6, w2, h2);
          c.restore();
        } else {
          smear(xB, y0 - h * 0.64 + bob * 0.6, w * 0.82, h * 0.82, flip ? -1 : 1, flip);
        }
      }
    }
  }
  function drawAtmos(c, st) {
    const kind = (st.motion && st.motion.kind) || (st.bg || '');
    const n = 12;
    c.save();
    // Painted plates already carry mist; extra mid-screen fog ovals read as brightness bands.
    if (kind === 'highway' || kind === 'steamtrain' || kind === 'foundry' || st.bg === '18_nave') {
      c.fillStyle = 'rgba(255,160,60,0.45)';
      for (let i = 0; i < 10; i++) {
        const x = (Math.sin(G.t * 0.7 + i) * 0.5 + 0.5) * W;
        const y = H * 0.35 + ((-G.t * 70 + i * 90) % (H * 0.5));
        c.fillRect(x, y, 2, 6);
      }
    } else if (kind === 'rift' || st.bg === '25_nexus' || st.bg === '22_mind') {
      c.strokeStyle = 'rgba(80,220,255,0.25)';
      c.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const r = 40 + (G.t * 40 + i * 80) % 420;
        c.beginPath(); c.arc(W / 2, H * 0.42, r, 0, Math.PI * 2); c.stroke();
      }
    }
    c.restore();
  }
  function spawnWhip(kind) {
    G.whip.push({
      k: kind, x: W + 80,
      y: kind === 'airship' ? rand(120, 400) : rand(H * 0.55, H * 0.82),
      s: rand(0.7, 1.3), life: 2.2, t: 0,
    });
    if (G.whip.length > 8) G.whip.shift();
  }
  function drawWhip(c) {
    if (!G.whip || !G.whip.length) return;
    const spd = (G.stage && G.stage.motion && G.stage.motion.speed) || 200;
    c.save();
    for (const w of G.whip) {
      w.t += G.dt; w.x -= spd * 1.7 * G.dt;
      c.globalAlpha = 0.55;
      c.fillStyle = '#0a0806';
      if (w.k === 'highway' || w.k === 'street') {
        c.fillRect(w.x, w.y, 10 * w.s, 90 * w.s);
      } else if (w.k === 'barge' || w.k === 'yacht') {
        c.beginPath(); c.ellipse(w.x, w.y, 50 * w.s, 8, 0, 0, Math.PI * 2); c.fill();
      } else if (w.k === 'west_ride' || w.k === 'steamtrain') {
        c.fillRect(w.x, w.y - 80, 16, 120);
      } else {
        c.fillRect(w.x, w.y, 18 * w.s, 60 * w.s);
      }
    }
    c.restore();
    compactArr(G.whip, (w) => w.x > -120 && w.t < w.life);
  }
  function drawGun(c) { /* first-person gun/hand removed */ }

  function drawProcBg(c, st) {
    const key = st.id;
    if (!procCache[key]) {
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      const pal = st.palette || ['#101018', '#406080', '#d0e0ff'];
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, pal[1]);
      sky.addColorStop(0.45, pal[0]);
      sky.addColorStop(1, '#050508');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      // soft painted hills / architecture blocks
      g.globalAlpha = 0.55;
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? pal[0] : pal[2];
        g.globalAlpha = 0.12 + i * 0.03;
        g.beginPath();
        const y = 380 + i * 70;
        g.moveTo(0, H);
        for (let x = 0; x <= W; x += 80) {
          g.lineTo(x, y - Math.sin(x * 0.01 + i) * 50 - i * 8);
        }
        g.lineTo(W, H); g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
      // Soft fallback shafts (painted plates use TPFeel.drawLighting)
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const x = 260 + i * 520;
        const grd = g.createLinearGradient(x, 0, x + 70, 0);
        grd.addColorStop(0, 'rgba(255,236,200,0)');
        grd.addColorStop(0.5, 'rgba(255,236,200,0.07)');
        grd.addColorStop(1, 'rgba(255,236,200,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x + 160, H); g.lineTo(x - 40, H);
        g.fill();
      }
      g.restore();
      // grain
      const id = g.getImageData(0, 0, W, H);
      const d = id.data;
      for (let i = 0; i < d.length; i += 16) {
        const n = (Math.random() - 0.5) * 14;
        d[i] = clamp(d[i] + n, 0, 255);
        d[i + 1] = clamp(d[i + 1] + n, 0, 255);
        d[i + 2] = clamp(d[i + 2] + n, 0, 255);
      }
      g.putImageData(id, 0, 0);
      procCache[key] = cv;
    }
    c.drawImage(procCache[key], -80, -60, W + 160, H + 120);
  }

  const outlineCache = {};
  function rimColorFor(state) {
    if (state === 'dead') return '#3a3020';
    return '#16110c';
  }
  const telGlowCache = {};
  function telGlowSheet(src) {
    if (!src) return null;
    const key = (src.src || src._src || 'x') + ':telglow';
    if (telGlowCache[key]) return telGlowCache[key];
    const sw = src.width || 64, sh = src.height || 64;
    const pad = 24;
    const sil = document.createElement('canvas');
    sil.width = sw; sil.height = sh;
    const sg = sil.getContext('2d');
    sg.drawImage(src, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = '#ff4a32';
    sg.fillRect(0, 0, sw, sh);
    // Close internal holes (Echo glitch shards, cape cuts) so the glow is an outer rim only,
    // never a pink web through the body.
    const cl = document.createElement('canvas');
    cl.width = sw; cl.height = sh;
    const cg = cl.getContext('2d');
    cg.filter = 'blur(5px)';
    cg.drawImage(sil, 0, 0);
    cg.filter = 'none';
    try {
      const img = cg.getImageData(0, 0, sw, sh);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 28) { d[i] = 255; d[i + 1] = 74; d[i + 2] = 50; d[i + 3] = 255; }
        else d[i + 3] = 0;
      }
      cg.putImageData(img, 0, 0);
    } catch (err) { cg.drawImage(sil, 0, 0); }
    const out = document.createElement('canvas');
    out.width = sw + pad * 2; out.height = sh + pad * 2;
    const o = out.getContext('2d');
    o.shadowColor = 'rgba(255, 80, 55, 0.95)';
    o.shadowBlur = 20;
    o.drawImage(cl, pad, pad);
    o.shadowBlur = 0;
    o.shadowColor = 'transparent';
    o.globalCompositeOperation = 'destination-out';
    o.drawImage(cl, pad, pad);
    out._pad = pad;
    out._sw = sw;
    out._sh = sh;
    out._src = key;
    telGlowCache[key] = out;
    return out;
  }
  function drawSoftTelRim(c, src, dx, dy, dw, dh, stateT) {
    if (!src) return;
    const sheet = telGlowSheet(src);
    if (!sheet) return;
    const pulse = 0.55 + 0.45 * Math.sin((stateT || 0) * 8);
    const padX = (sheet._pad / sheet._sw) * dw;
    const padY = (sheet._pad / sheet._sh) * dh;
    c.save();
    c.globalAlpha = 0.40 + 0.22 * pulse;
    c.drawImage(sheet, dx - padX, dy - padY, dw + padX * 2, dh + padY * 2);
    c.restore();
  }
  function outlined(img, color) {
    if (!img) return null;
    if (G.loFi || (G.save && G.save.reduced)) return img;
    const MAX = 640;
    const scale = img.height > MAX ? MAX / img.height : 1;
    const iw = Math.max(1, Math.round(img.width * scale));
    const ih = Math.max(1, Math.round(img.height * scale));
    const key = (img.src || img._src || 'x') + (color || 'rim') + '@' + iw + 'x' + ih;
    if (outlineCache[key]) return outlineCache[key];
    const pad = 3;
    const cv = document.createElement('canvas');
    cv.width = iw + pad * 2;
    cv.height = ih + pad * 2;
    const g = cv.getContext('2d');
    g.drawImage(img, pad, pad, iw, ih);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color || '#16110c';
    g.fillRect(0, 0, cv.width, cv.height);
    const out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    const o = out.getContext('2d');
    const r = 1.0;
    for (let a = 0; a < 8; a++) {
      const ang = (Math.PI * 2 * a) / 8;
      o.drawImage(cv, Math.cos(ang) * r, Math.sin(ang) * r);
    }
    o.drawImage(img, pad, pad, iw, ih);
    out._src = key;
    outlineCache[key] = out;
    return out;
  }
  const TINT_FX = {
    1: 'sepia(0.28) hue-rotate(-16deg) saturate(1.4) brightness(1.16) contrast(1.08)',
    2: 'hue-rotate(50deg) saturate(1.18) brightness(0.78) contrast(1.16)'
  };
  const TINT_OVER = { 1: 'rgba(170,80,28,0.42)', 2: 'rgba(24,64,120,0.46)' };
  function tinted(img, tint, dress, hasDressSheet) {
    if (!img) return img;
    const dressFx = (!hasDressSheet && dress && DRESS_TINT[dress]) ? DRESS_TINT[dress] : null;
    if (!tint && !dressFx) return img;
    const MAX = 640;
    const scale = img.height > MAX ? MAX / img.height : 1;
    const iw = Math.max(1, Math.round(img.width * scale));
    const ih = Math.max(1, Math.round(img.height * scale));
    const key = (img.src || img._src || 'x') + ':t' + (tint || 0) + ':d' + (dressFx ? dress : '') + 'v3@' + iw + 'x' + ih;
    if (outlineCache[key]) return outlineCache[key];
    const cv = document.createElement('canvas');
    cv.width = iw; cv.height = ih;
    const g = cv.getContext('2d');
    g.filter = dressFx ? dressFx.fx : 'none';
    g.drawImage(img, 0, 0, iw, ih);
    g.filter = 'none';
    if (dressFx) {
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = 0.42;
      g.fillStyle = dressFx.over;
      g.fillRect(0, 0, iw, ih);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    if (tint) {
      const tmp = document.createElement('canvas');
      tmp.width = iw; tmp.height = ih;
      const tg = tmp.getContext('2d');
      tg.filter = TINT_FX[tint] || 'none';
      tg.drawImage(cv, 0, 0);
      tg.filter = 'none';
      tg.globalCompositeOperation = 'source-atop';
      tg.globalAlpha = 0.36;
      tg.fillStyle = TINT_OVER[tint] || 'transparent';
      tg.fillRect(0, 0, iw, ih);
      g.globalCompositeOperation = 'copy';
      g.drawImage(tmp, 0, 0);
      g.globalCompositeOperation = 'source-over';
    }
    cv._src = key;
    outlineCache[key] = cv;
    return cv;
  }
  function flashSprite(c, src, dx, dy, dw, dh, amt) {
    if (!src || !amt) return;
    const key = (src.src || src._src || 'x') + ':flashw';
    let mask = outlineCache[key];
    if (!mask) {
      const cv = document.createElement('canvas');
      cv.width = src.width; cv.height = src.height;
      const g = cv.getContext('2d');
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#fff4c8';
      g.fillRect(0, 0, cv.width, cv.height);
      cv._src = key;
      outlineCache[key] = mask = cv;
    }
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, amt * 0.8);
    c.drawImage(mask, dx, dy, dw, dh);
    c.restore();
  }
  function prewarmStage(keys) {
    const list = (keys || []).map((k) => IM[k]).filter(Boolean);
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < list.length && performance.now() - t0 < 6) {
        outlined(list[i++], '#16110c');
      }
      if (i < list.length) {
        if (typeof requestIdleCallback === 'function') requestIdleCallback(step, { timeout: 50 });
        else requestAnimationFrame(step);
      }
    };
    step();
  }
  function spriteFor(e) {
    const pose = poseFor(e);
    return pose && pose.img;
  }
  function telU(e) {
    const dur = Math.max(touchWindow() ? 0.52 : 0.44, (e.tel || 0.9) * telScale());
    return clamp((e.stateT || 0) / dur, 0, 1);
  }
  function poseChaos(e) {
    const idle0 = IM.boss_chaos_idle0 || IM.boss_chaos;
    const idle1 = IM.boss_chaos_idle1 || idle0;
    const raise = IM.boss_chaos_raise || idle0;
    const raise2 = IM.boss_chaos_raise2 || IM.boss_chaos_atk || raise;
    const cast = IM.boss_chaos_cast || IM.boss_chaos_atk2 || raise2;
    const stagger = IM.boss_chaos_stagger || IM.boss_chaos_atk3 || idle0;
    const stepL = IM.boss_chaos_stepL || idle0;
    const stepR = IM.boss_chaos_stepR || idle1;
    if (e.state === 'dead' || e.state === 'hit') return { img: stagger, key: 'stagger' };
    if (e.state === 'tel') return { img: telU(e) < 0.42 ? raise : raise2, key: telU(e) < 0.42 ? 'raise' : 'raise2' };
    if (e.state === 'shoot') return { img: (e.stateT || 0) < 0.2 ? cast : raise2, key: (e.stateT || 0) < 0.2 ? 'cast' : 'raise2' };
    if (e.stepPose === 'L') return { img: stepL, key: 'stepL' };
    if (e.stepPose === 'R') return { img: stepR, key: 'stepR' };
    const a = Math.sin((e.bob || 0) * 0.65) > 0.15;
    return { img: a ? idle1 : idle0, key: a ? 'idle1' : 'idle0' };
  }
  function poseHockey(e) {
    const idle = IM.boss_hockey_mask;
    const antic = IM.boss_hockey_mask_antic || IM.boss_hockey_mask_atk || idle;
    const wind = IM.boss_hockey_mask_wind || IM.boss_hockey_mask_atk || antic;
    const thr = IM.boss_hockey_mask_throw || IM.boss_hockey_mask_atk2 || wind;
    const follow = IM.boss_hockey_mask_follow || IM.boss_hockey_mask_atk3 || thr;
    const rec = IM.boss_hockey_mask_recover || idle;
    if (e.state === 'hit' || e.state === 'dead') return { img: rec, key: 'recover' };
    if (e.state === 'tel') {
      const u = telU(e);
      if (u < 0.22) return { img: antic, key: 'antic' };
      return { img: wind, key: 'wind' };
    }
    if (e.state === 'shoot') {
      const t = e.stateT || 0;
      if (t < 0.11) return { img: thr, key: 'throw' };
      if (t < 0.22) return { img: follow, key: 'follow' };
      return { img: rec, key: 'recover' };
    }
    return { img: idle, key: 'idle' };
  }
  function poseFor(e) {
    if (e.type === 'enemy') {
      const k = e.kind;
      const d = e.dress;
      const spr = (pose) => {
        const suf = pose ? ('_' + pose) : '';
        if (d && IM['enemy_' + d + suf]) return IM['enemy_' + d + suf];
        return IM['enemy_' + k + suf];
      };
      const base = spr('') || IM['enemy_' + k] || IM.enemy_woods;
      if (e.state === 'dead') {
        const u = clamp((e.deadFade || 0) / 1.25, 0, 1);
        const d0 = spr('death0'), d1 = spr('death1'), d2 = spr('death2');
        if (d0 && d1 && d2) {
          const t = e.deadFade || 0;
          // Hold each pose ~6 frames at 30fps; stay on death1 until landing so death2 meets the dust puff.
          if (t < 0.20) return { img: d0, key: 'death0', dressSheet: !!(d && IM['enemy_' + d + '_death0']) };
          if (t < 0.40 || !e.deathLanded) return { img: d1, key: 'death1', dressSheet: !!(d && IM['enemy_' + d + '_death1']) };
          return { img: d2, key: 'death2', dressSheet: !!(d && IM['enemy_' + d + '_death2']) };
        }
        return { img: spr('death') || base, key: 'death', dressSheet: !!(d && IM['enemy_' + d + '_death']) };
      }
      if (e.state === 'hit') return { img: spr('hit') || (d && IM['enemy_' + d + '_pidle']) || base, key: 'hit', dressSheet: !!(d && (IM['enemy_' + d + '_hit'] || IM['enemy_' + d + '_pidle'])) };
      if (e.state === 'shoot') return { img: spr('fire') || spr('aim') || (d && IM['enemy_' + d + '_pidle']) || base, key: 'fire', dressSheet: !!(d && (IM['enemy_' + d + '_fire'] || IM['enemy_' + d + '_aim'] || IM['enemy_' + d + '_pidle'])) };
      if (e.state === 'tel') return { img: spr('aim') || (d && IM['enemy_' + d + '_pidle']) || base, key: 'aim', dressSheet: !!(d && (IM['enemy_' + d + '_aim'] || IM['enemy_' + d + '_pidle'])) };
      const walking = (e.state === 'enter' && (e.enterKind === 'walk' || e.enterKind === 'vehicle' || e.enterKind === 'rail')) || (e.loco || 0) > 0.16 || ((e.role === 'runner') && Math.abs(e.vx || 0) > 40);
      const w0 = spr('walk0'), w1 = spr('walk1'), w2 = spr('walk2');
      if (walking && w0 && w1 && w2) {
        const frames = [w0, w1, w2, w1];
        const i = Math.floor(((e.walkPhase || 0) / (Math.PI * 0.5)) % 4 + 4) % 4;
        const pose = ['walk0','walk1','walk2','walk1'][i];
        return { img: frames[i], key: 'walk' + i, dressSheet: !!(d && IM['enemy_' + d + '_' + pose]) };
      }
      const painted = spr('pidle') || spr('walk0');
      if (painted) return { img: painted, key: 'idle', dressSheet: !!(d && (IM['enemy_' + d + '_pidle'] || IM['enemy_' + d + '_walk0'])) };
      const idle2 = spr('idle2');
      if (idle2 && Math.sin((e.bob || 0) * 0.85) > 0.12) return { img: idle2, key: 'idle2', dressSheet: !!(d && IM['enemy_' + d + '_idle2']) };
      return { img: base, key: 'idle', dressSheet: !!(d && IM['enemy_' + d]) };
    }
    if (e.type === 'civilian') return { img: IM['civ_' + e.kind] || IM.civ_woods, key: 'civ' };
    if (e.type === 'boss') {
      if (e.kind === 'chaos') return poseChaos(e);
      if (e.kind === 'hockey_mask') return poseHockey(e);
      const id = e.kind;
      const idle = IM['boss_' + id] || IM['boss_' + String(id || '').replace(/ /g, '_')] || null;
      const atks = [IM['boss_' + id + '_atk'], IM['boss_' + id + '_atk2'], IM['boss_' + id + '_atk3']].filter(Boolean);
      if (atks.length && (e.state === 'tel' || e.state === 'shoot')) {
        const i = e.state === 'shoot' ? Math.min(atks.length - 1, 1 + (G.bossPhase >= 3 ? 1 : 0)) : 0;
        const j = atks.length > 1 ? (e.state === 'tel' ? 0 : i) : 0;
        // cycle extra attack poses on later shots
        const n = (e.atkN || 0) % atks.length;
        const img = e.state === 'shoot' ? atks[n] : atks[0];
        return { img: img, key: 'atk' + (e.state === 'shoot' ? n : 0) };
      }
      return { img: idle, key: 'idle' };
    }
    return { img: null, key: 'none' };
  }
  function tickPoseBlend(e, pose) {
    if (!pose || !pose.img) return 1;
    if (e.animKey !== pose.key) {
      e.prevImg = e.animImg || pose.img;
      e.animImg = pose.img;
      e.animKey = pose.key;
      e.poseBlend = 0;
    } else e.animImg = pose.img;
    const k = pose.key || '';
    if (/^walk/.test(k) || /^death/.test(k) || k === 'fire' || k === 'hit' || k === 'throw' || k === 'wind' || k === 'antic' || k === 'follow') {
      e.poseBlend = 1;
      return 1;
    }
    const rate = (window.TPMotion && TPMotion.poseRate(e, pose.key)) || 9;
    e.poseBlend = Math.min(1, (e.poseBlend == null ? 1 : e.poseBlend) + (G.dt || 0.016) * rate);
    return e.poseBlend;
  }

  function parseHex(hex) {
    const h = String(hex || '#1a1814').replace('#','');
    const n = h.length === 3
      ? h.split('').map((ch) => parseInt(ch + ch, 16))
      : [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    return { r: n[0]||26, g: n[1]||24, b: n[2]||20 };
  }
  function plateTint() {
    const pal = (G.stage && G.stage.palette) || ['#1a1814', '#3a3428', '#c8b080'];
    return parseHex(pal[0] || '#1a1814');
  }
  function drawContactShadow(c, halfW, appear) {
    const t = plateTint();
    const a = (appear == null ? 1 : appear);
    c.save();
    c.globalAlpha = a;
    c.scale(1, 0.16);
    c.fillStyle = 'rgba(' + Math.round(t.r * 0.08) + ',' + Math.round(t.g * 0.07) + ',' + Math.round(t.b * 0.06) + ',0.62)';
    c.beginPath(); c.ellipse(0, 14, halfW * 1.38, 130, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.72)';
    c.beginPath(); c.ellipse(0, 10, halfW * 0.82, 78, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.88)';
    c.beginPath(); c.ellipse(0, 8, halfW * 0.42, 44, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function gradeToPlate(c, halfW, appear, spriteH) {
    if (!spriteH) return;
    const t = plateTint();
    const a = (appear == null ? 1 : appear);
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = 0.42 * a;
    const grd = c.createRadialGradient(0, -spriteH * 0.06, 6, 0, -spriteH * 0.02, halfW * 1.15);
    grd.addColorStop(0, 'rgb(' + t.r + ',' + t.g + ',' + t.b + ')');
    grd.addColorStop(1, 'rgb(255,255,255)');
    c.fillStyle = grd;
    c.beginPath();
    c.ellipse(0, -spriteH * 0.05, halfW * 0.72, spriteH * 0.22, 0, 0, Math.PI * 2);
    c.fill();
    const pal = (G.stage && G.stage.palette) || ['#1a1814', '#3a3428', '#c8b080'];
    const wcol = parseHex(pal[2] || pal[1] || '#c8b080');
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = 0.18 * a;
    const wrap = c.createRadialGradient(halfW * 0.15, -spriteH * 0.08, 2, 0, -spriteH * 0.04, halfW * 1.1);
    wrap.addColorStop(0, 'rgb(' + wcol.r + ',' + wcol.g + ',' + wcol.b + ')');
    wrap.addColorStop(1, 'rgb(0,0,0)');
    c.fillStyle = wrap;
    c.beginPath();
    c.ellipse(0, -spriteH * 0.04, halfW * 0.8, spriteH * 0.18, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  // Plant feet on e.y and size every pose by its opaque body, so padded
  // walk sheets (glacier, web, foundry, etc.) do not shrink versus tight aim art.
  const opaqueFitCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  const opaqueFitMemo = {};
  function opaqueBox(img) {
    if (!img) return null;
    if (opaqueFitCache && opaqueFitCache.has(img)) return opaqueFitCache.get(img);
    const key = img.src || img._src || null;
    if (key && opaqueFitMemo[key]) return opaqueFitMemo[key];
    const w = img.width, h = img.height;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 16) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX) { minX = 0; minY = 0; maxX = w - 1; maxY = h - 1; }
    const box = { minX: minX, minY: minY, maxX: maxX, maxY: maxY, bw: maxX - minX + 1, bh: maxY - minY + 1, w: w, h: h };
    if (opaqueFitCache) opaqueFitCache.set(img, box);
    if (key) opaqueFitMemo[key] = box;
    return box;
  }
  function spriteFit(img, bodyH, lying) {
    const box = opaqueBox(img);
    if (!box) return null;
    if (lying) {
      const s = 560 / Math.max(1, box.bw);
      const cy = (box.minY + box.maxY + 1) / 2;
      return {
        dx: -box.maxX * s,
        dy: -cy * s,
        dw: box.w * s,
        dh: box.h * s,
        bodyW: 560,
        bodyH: box.bh * s
      };
    }
    const s = bodyH / Math.max(1, box.bh);
    const cx = (box.minX + box.maxX + 1) / 2;
    return {
      dx: -cx * s,
      dy: -(box.maxY + 1) * s,
      dw: box.w * s,
      dh: box.h * s,
      bodyW: box.bw * s,
      bodyH: bodyH
    };
  }
  function drawEntity(c, e) {

    const enter = e.state === 'enter' ? clamp(e.stateT / (e.enterDur || 0.32), 0, 1) : 1;
    const leave = e.state === 'leave' ? clamp(1 - e.stateT / 0.5, 0, 1) : 1;
    const deathHold = e.paintedDeath ? 1.05 : 0.7, deathFade = 0.28;
    const dead = e.state === 'dead' ? ((e.deadFade || 0) < deathHold ? 1 : clamp(1 - ((e.deadFade || 0) - deathHold) / deathFade, 0, 1)) : 1;
    const appear = (e.state === 'dead' || e.state === 'leave') ? leave * dead : 1;
    if (appear <= 0.02) return;
    // Feet stay planted on e.y; pop/duck rise and sink the planted y itself.
    const yOff = (e.state === 'dead' ? 0 : 0) - (e.recoil || 0) * 4;
    const loco = e.loco != null ? e.loco : (((e.state === 'enter' && (e.enterKind === 'walk' || e.enterKind === 'vehicle' || e.enterKind === 'rail')) || Math.abs(e.vx || 0) > 55) ? 1 : 0);
    const moving = loco > 0.12;
    const step = moving ? Math.abs(Math.sin(e.walkPhase || 0)) * loco : 0;
    const aimLive = (e.state === 'tel' || e.state === 'shoot' || e.state === 'idle');
    const breath = 1 + Math.sin(e.bob) * (aimLive ? 0.042 : 0.016);
    const sq = 1 - (e.squash || 0) * 0.14 - step * 0.06;
    const stt = 1 + (e.squash || 0) * 0.12 + step * 0.08;
    const lean = (e.state === 'tel' || e.state === 'shoot') ? 1.03 : 1;
    const pop = (e.state === 'enter' && e.enterKind === 'pop') ? (0.82 + 0.18 * enter) : (e.state === 'enter' ? (0.90 + 0.10 * enter) : 1);
    const walkRot = moving ? Math.sin(e.walkPhase || 0) * 0.08 * loco : 0;
    const weaponSway = Math.sin((e.bob || 0) * 0.95) * (aimLive ? 0.05 : 0.02) + (moving ? Math.sin((e.walkPhase || 0) * 0.5) * 0.04 * loco : 0);
    const kick = e.recoil || 0;
    const shootRot = e.state === 'shoot' ? -0.10 : (e.state === 'hit' ? 0.08 : (e.state === 'duck' ? 0.04 : 0));
    const shoulder = kick * 0.11 * (e.x < W / 2 ? -1 : 1);
    c.save();
    // 6–10px kick plus a shoulder jerk; feet stay planted on e.y.
    c.translate(e.x + kick * (e.x < W / 2 ? -9 : 9), e.y + yOff);
    c.rotate(e.state === 'dead' ? e.rot : (shootRot + walkRot + weaponSway + shoulder));
    if (e.varFlip && e.state !== 'dead') c.scale(-1, 1);
    c.globalAlpha = appear;
    c.scale(e.scale * sq * lean * pop, e.scale * breath * stt * pop);
    if (e.type === 'boss') drawBoss(c, e);
    else {
      const img = spriteFor(e);
      if (img) {
        const poseLie = poseFor(e);
        const lying = e.state === 'dead' && poseLie && poseLie.key === 'death2';
        const fit0 = spriteFit(img, 500, lying);
        const bodyW = fit0 ? fit0.bodyW : 220;
        const bodyH = fit0 ? fit0.bodyH : 500;
        drawContactShadow(c, bodyW * (lying ? 0.48 : 0.42), appear);
        const pose = poseFor(e);
        const blend = tickPoseBlend(e, pose);
        const drawOne = (src, alphaMul) => {
          if (!src) return;
          const poseMeta = poseFor(e);
          const srcT = tinted(src, e.varTint, e.dress, !!(poseMeta && poseMeta.dressSheet));
          const fit = spriteFit(srcT, 500, lying) || fit0;
          if (!fit) return;
          const rim = outlined(srcT, rimColorFor(e.state));
          const draw = rim || srcT;
          const pad = rim ? 3 * (fit.bodyH / srcT.height) : 0;
          const dx = fit.dx - pad, dy = fit.dy - pad, dw = fit.dw + pad * 2, dh = fit.dh + pad * 2;
          c.save();
          c.globalAlpha = appear * alphaMul;
          const canWarp = window.TPMotion && !lying && e.state !== 'dead' && e.state !== 'enter' && !G.loFi && e.type !== 'boss';
          if (e.state === 'tel') drawSoftTelRim(c, draw, dx, dy, dw, dh, e.stateT);
          if (canWarp) {
            const def = TPMotion.deformFor(e, G);
            def.loFi = false;
            TPMotion.drawWarped(c, draw, dx, dy, dw, dh, def);
          } else {
            c.drawImage(draw, dx, dy, dw, dh);
          }
          if (e.flash > 0) flashSprite(c, draw, dx, dy, dw, dh, e.flash * alphaMul);
          c.restore();
        };
        if (e.prevImg && blend < 1 && e.prevImg !== img) drawOne(e.prevImg, 1 - blend);
        drawOne(img, (e.prevImg && blend < 1 && e.prevImg !== img) ? blend : 1);
        c.filter = 'none';
        gradeToPlate(c, bodyW * 0.42, appear, bodyH);
        const visH = bodyH * e.scale * pop;
        e.box = { x: e.x, y: e.y + yOff - visH * (lying ? 0.35 : 0.50), hw: bodyW * e.scale * pop * (lying ? 0.42 : 0.28), hh: visH * (lying ? 0.36 : 0.42) };
      } else {
        c.fillStyle = '#c00'; c.fillRect(-40, -160, 80, 160);
        e.box = { x: e.x, y: e.y - 80, hw: 40, hh: 80 };
      }
    }
    // Hit flash is sprite-masked in drawOne / drawBoss — never a rectangle.
    c.restore();
    // telegraph glyph + remaining-time ring (visual only; duration unchanged)
    if (e.alive && e.state === 'tel') {
      c.save();
      c.globalAlpha = 0.85 + 0.15 * Math.sin(e.stateT * 20);
      const tx = e.x, ty = (e.box ? e.box.y - e.box.hh - 24 : e.y - 360);
      c.fillStyle = '#ff2a2a';
      rounded(c, tx - 20, ty - 28, 40, 40, 8);
      c.fill();
      const telDur = Math.max(touchWindow() ? 0.52 : 0.44, (e.tel || 0.9) * telScale());
      const frac = 1 - clamp(e.stateT / telDur, 0, 1);
      c.beginPath();
      c.strokeStyle = '#fff4a0';
      c.lineWidth = 3;
      c.arc(tx, ty - 8, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      c.stroke();
      c.fillStyle = '#fff';
      c.font = '800 30px Oswald, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('!', tx, ty - 6);
      c.restore();
    }
    if (e.alive && e.type === 'boss' && (e.state === 'tel' || G.bossPhase >= 2)) {
      const hx = e.x, hy = (e.box ? e.box.y - e.box.hh * 0.72 : e.y - 360);
      c.save();
      c.translate(hx, hy);
      c.rotate(Math.PI / 4);
      c.globalAlpha = 0.45 + 0.45 * Math.sin(G.t * 10);
      c.strokeStyle = '#ffd056'; c.lineWidth = 2;
      c.strokeRect(-9, -9, 18, 18);
      c.restore();
    }
    if (e.alive && e.type === 'civilian') {
      const tx = e.x, ty = (e.box ? e.box.y - e.box.hh - 20 : e.y - 340);
      c.fillStyle = e.hostage ? 'rgba(160,40,40,0.88)' : 'rgba(40,90,180,0.85)';
      rounded(c, tx - 74, ty - 22, 148, 32, 8); c.fill();
      c.fillStyle = '#e8f0ff';
      c.font = '700 16px Oswald, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(e.hostage ? 'HOSTAGE' : "DON'T SHOOT", tx, ty - 5);
    }
    if (e.alive && e.role === 'shield') {
      const b = e.box;
      if (b) {
        c.save();
        c.globalAlpha = e.shieldHp > 0 ? 0.8 : 0.25;
        c.strokeStyle = '#c8e8ff';
        c.lineWidth = 5;
        c.beginPath();
        c.ellipse(e.x - 10, b.y, b.hw * 0.95, b.hh * 0.85, -0.2, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = 'rgba(160,210,255,' + (e.shieldHp > 0 ? 0.16 : 0.04) + ')';
        c.fill();
        c.restore();
      }
    }
    if (e.alive && e.laser && e.state === 'tel') {
      c.save();
      c.strokeStyle = 'rgba(255,40,40,0.55)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(e.x, e.y - 180 * (e.scale || 1));
      c.lineTo(W / 2, H * 0.78);
      c.stroke();
      c.restore();
    }
    if (e.alive && e.type === 'enemy' && e.role && e.role !== 'gun') {
      const tx = e.x, ty = (e.box ? e.box.y + e.box.hh + 16 : e.y + 12);
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.font = '700 11px Oswald, sans-serif';
      c.textAlign = 'center';
      c.fillText(String(e.role).toUpperCase(), tx, ty);
    }
  }

  function drawBoss(c, e) {
    const img = spriteFor(e) || IM['p_' + e.kind];
    const h = 600;
    drawContactShadow(c, 230, 1);
    if (e.state === 'tel') {
      const glow = c.createRadialGradient(0, 0, 16, 0, 0, 240);
      glow.addColorStop(0, 'rgba(255, 90, 50, 0.16)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = glow;
      c.beginPath(); c.ellipse(0, 8, 240, 44, 0, 0, Math.PI * 2); c.fill();
    }
    if (img && img !== IM['p_' + e.kind]) {
      const pose = poseFor(e);
      const blend = tickPoseBlend(e, pose);
      const fit0 = spriteFit(img, h, false);
      const bodyW = fit0 ? fit0.bodyW : (h * (img.width / img.height));
      const paint = (src, a) => {
        if (!src) return;
        const fit = spriteFit(src, h, false) || fit0;
        if (!fit) return;
        const rim = outlined(src, rimColorFor(e.state));
        const draw = rim || src;
        const pad = rim ? 3 * (h / src.height) : 0;
        const dx = fit.dx - pad, dy = fit.dy - pad, dw = fit.dw + pad * 2, dh = fit.dh + pad * 2;
        c.save();
        c.globalAlpha = a;
        if (e.state === 'tel') drawSoftTelRim(c, draw, dx, dy, dw, dh, e.stateT);
        if (window.TPMotion && !G.loFi && e.type !== 'boss' && e.state !== 'enter' && e.state !== 'dead') {
          const def = TPMotion.deformFor(e, G);
          TPMotion.drawWarped(c, draw, dx, dy, dw, dh, def);
        } else {
          c.drawImage(draw, dx, dy, dw, dh);
        }
        if (e.flash > 0) flashSprite(c, draw, dx, dy, dw, dh, e.flash);
        c.restore();
      };
      if (e.prevImg && blend < 1 && e.prevImg !== img) paint(e.prevImg, 1 - blend);
      paint(img, (e.prevImg && blend < 1 && e.prevImg !== img) ? blend : 1);
      gradeToPlate(c, bodyW * 0.38, 1, h);
      const visH = h * e.scale;
      e.box = { x: e.x, y: e.y - visH * 0.50, hw: bodyW * e.scale * 0.28, hh: visH * 0.42 };
    } else if (img) {
      const w = 520, hh = 520;
      c.fillStyle = '#0c0a08';
      c.fillRect(-w / 2, -hh, w, hh);
      c.drawImage(img, -w / 2, -hh, w, hh);
      e.box = { x: e.x, y: e.y - hh * e.scale * 0.50, hw: w * e.scale * 0.38, hh: hh * e.scale * 0.42 };
    }
    // Weak-point phases 2–3: a pulsing core the player can see and snipe
    if (G.bossPhase >= 2 && e.box) {
      const side = Math.sin((G.t || 0) * 0.7) > 0 ? -0.28 : 0.28;
      const wx = e.box.x + e.box.hw * side * 0.2;
      const wy = e.box.y - e.box.hh * (G.bossPhase >= 3 ? 0.45 : 0.15);
      const wr = 26 + Math.sin((G.t || 0) * 8) * 5;
      e.weak = { x: wx, y: wy, r: wr + 8 };
      c.save();
      c.globalCompositeOperation = 'lighter';
      const grd = c.createRadialGradient(wx - e.x, wy - e.y, 2, wx - e.x, wy - e.y, wr);
      grd.addColorStop(0, 'rgba(255,255,240,0.95)');
      grd.addColorStop(0.4, 'rgba(80,240,255,0.7)');
      grd.addColorStop(1, 'rgba(80,240,255,0)');
      c.fillStyle = grd;
      c.beginPath(); c.arc(wx - e.x, wy - e.y, wr, 0, Math.PI * 2); c.fill();
      c.restore();
    } else e.weak = null;
  }

  function drawShot(c, e) {
    c.save();
    c.translate(e.x, e.y);
    c.rotate(e.rot || 0);
    if (e.kind === 'orb') {
      const r = 22 + Math.sin(G.t * 10) * 3;
      const g = c.createRadialGradient(0, 0, 2, 0, 0, r + 8);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.35, '#7ef0ff');
      g.addColorStop(1, 'rgba(40,180,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, r + 8, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,208,86,0.85)'; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    } else {
      const r = 10 * (e.scale || 1);
      const g = c.createRadialGradient(0, 0, 1, 0, 0, r * 2.2);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.35, '#ffe08a');
      g.addColorStop(0.7, 'rgba(255,80,20,0.7)');
      g.addColorStop(1, 'rgba(255,40,0,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, r * 2.2, 0, Math.PI * 2); c.fill();
    }
    const hw = (e.box && e.box.hw) || (e.kind === 'orb' ? 38 : 18);
    e.box = { x: e.x, y: e.y, hw: hw, hh: hw };
    c.restore();
  }

  function drawPickup(c, e) {
    c.save();
    c.translate(e.x, e.y);
    const pulse = 1 + Math.sin(G.t * 6) * 0.08;
    c.scale(pulse, pulse);
    if (e.type === 'bonus' || e.type === 'secret') {
      drawBonus(c, e);
      c.restore();
      return;
    }
    const wpn = WEAPONS[e.kind];
    const col = e.kind === 'health' ? 'rgba(40,200,90,0.9)' : (wpn ? (wpn.color || '#c0e8ff') : 'rgba(240,190,50,0.9)');
    c.fillStyle = col;
    c.beginPath(); c.arc(0, 0, 28, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#111';
    c.font = '800 16px Oswald, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const label = e.kind === 'health' ? '+' : (e.kind === 'shotgun' ? 'SG' : e.kind === 'smg' ? 'SMG' : e.kind === 'rail' ? 'RAIL' : 'A');
    c.fillText(label, 0, 1);
    e.box = { x: e.x, y: e.y, hw: 32, hh: 32 };
    c.restore();
  }
  function drawBonus(c, e) {
    const secret = e.type === 'secret';
    if (secret) c.globalAlpha = 0.55 + 0.25 * Math.sin((G.t || 0) * 3);
    if (e.kind === 'crystal' || (secret && e.kind === 'crystal')) {
      c.fillStyle = '#80f0ff';
      c.beginPath();
      c.moveTo(0, -18); c.lineTo(12, 0); c.lineTo(0, 18); c.lineTo(-12, 0);
      c.closePath(); c.fill();
      c.strokeStyle = '#e8ffff'; c.lineWidth = 2; c.stroke();
    } else if (secret) {
      c.fillStyle = '#ffe07a';
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 - Math.PI / 8;
        const r = i % 2 ? 7 : 16;
        const fn = i ? c.lineTo : c.moveTo;
        fn.call(c, Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill();
    } else {
      c.fillStyle = '#ffd056';
      c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#7a5a10'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#7a5a10';
      c.font = '700 12px Oswald, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('¢', 0, 1);
    }
    e.box = { x: e.x, y: e.y, hw: secret ? 22 : 26, hh: secret ? 22 : 26 };
  }

  function drawParts(c) {
    for (const p of G.particles) {
      const a = 1 - p.t / p.life;
      c.save();
      c.globalAlpha = a;
      if (p.k === 'spark') {
        c.fillStyle = p.c || '#fff';
        c.fillRect(p.x, p.y, p.s, p.s * 0.4);
      } else if (p.k === 'ring') {
        c.strokeStyle = p.c || '#fff';
        c.lineWidth = 3;
        c.beginPath(); c.arc(p.x, p.y, 10 + p.t * 90, 0, Math.PI * 2); c.stroke();
      } else if (p.k === 'tracer') {
        const g = c.createLinearGradient(p.x, p.y, p.x2, p.y2);
        g.addColorStop(0, 'rgba(255,230,160,0)');
        g.addColorStop(1, p.c || 'rgba(255,240,200,0.35)');
        c.strokeStyle = g; c.lineWidth = 1.25;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x2, p.y2); c.stroke();
      } else if (p.k === 'muzzle') {
        c.fillStyle = '#fff3c0';
        c.beginPath(); c.arc(p.x, p.y, 28, 0, Math.PI * 2); c.fill();
      } else if (p.k === 'casing') {
        c.translate(p.x, p.y); c.rotate(p.rot || 0);
        c.fillStyle = '#d8a030'; c.fillRect(-5, -2, 10, 4);
      } else if (p.k === 'text') {
        c.fillStyle = p.c || '#fff';
        c.font = '800 28px Oswald, sans-serif';
        c.textAlign = 'center';
        c.fillText(p.text, p.x, p.y);
      } else if (p.k === 'groundpop') {
        const sc = p.s || 1;
        c.globalCompositeOperation = 'lighter';
        const r = (70 + (1 - a) * 40) * sc;
        const g = c.createRadialGradient(p.x, p.y, 4, p.x, p.y, r);
        g.addColorStop(0, 'rgba(255,240,180,' + (0.85 * a) + ')');
        g.addColorStop(0.45, 'rgba(255,160,50,' + (0.35 * a) + ')');
        g.addColorStop(1, 'rgba(255,120,20,0)');
        c.fillStyle = g;
        c.beginPath(); c.ellipse(p.x, p.y, r * 1.35, r * 0.42, 0, 0, Math.PI * 2); c.fill();
      } else if (p.k === 'emuzzle') {
        const sc = p.s || 1;
        c.globalCompositeOperation = 'lighter';
        const R = (42 + (1 - a) * 18) * sc;
        c.fillStyle = 'rgba(255,250,210,' + (0.9 * a) + ')';
        c.beginPath(); c.arc(p.x, p.y, R, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,170,40,' + (0.95 * a) + ')';
        c.beginPath(); c.arc(p.x, p.y, R * 0.48, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(p.x, p.y, 11 * sc, 0, Math.PI * 2); c.fill();
        // 2-frame star spikes
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.t * 2);
        c.fillStyle = 'rgba(255,255,230,' + (0.95 * a) + ')';
        for (let i = 0; i < 8; i++) {
          c.rotate(Math.PI / 4);
          c.beginPath();
          c.moveTo(0, -R * 1.55);
          c.lineTo(6 * sc, 0);
          c.lineTo(-6 * sc, 0);
          c.closePath();
          c.fill();
        }
        c.restore();
      } else if (p.k === 'shard' || p.k === 'splinter') {
        c.translate(p.x, p.y); c.rotate(p.rot || 0);
        c.fillStyle = p.c || '#fff';
        c.fillRect(-(p.s || 4), -1.5, (p.s || 4) * 2, 3);
      } else if (p.k === 'splash') {
        c.fillStyle = p.c || '#8ad4ff';
        c.beginPath(); c.ellipse(p.x, p.y, (p.s || 4) * 1.4, (p.s || 4) * 0.6, 0, 0, Math.PI * 2); c.fill();
      } else if (p.k === 'timespark') {
        c.fillStyle = p.c || '#7ef0ff';
        c.globalCompositeOperation = 'lighter';
        c.beginPath(); c.arc(p.x, p.y, p.s || 3, 0, Math.PI * 2); c.fill();
      } else if (p.k === 'dust') {
        c.fillStyle = p.c || 'rgba(160,140,110,0.8)';
        c.beginPath(); c.ellipse(p.x, p.y, (p.s || 12) * 1.15, (p.s || 12) * 0.42, p.rot || 0, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
  }

  function fgKeyFor(st) {
    if (!st) return null;
    const bg = String(st.bg || '');
    if (bg === 'woods' || bg.indexOf('jungle') >= 0 || bg.indexOf('grove') >= 0) return 'woods';
    if (bg === 'west') return 'west';
    if (bg.indexOf('egypt') >= 0 && IM.fg_egypt) return 'egypt';
    if (bg.indexOf('brass') >= 0 && IM.fg_brass) return 'brass';
    if (bg.indexOf('stadium') >= 0 && IM.fg_stadium) return 'stadium';
    if (bg.indexOf('glacier') >= 0 && IM.fg_glacier) return 'glacier';
    if (bg === 'rome' || bg.indexOf('egypt') >= 0 || bg.indexOf('sparta') >= 0 || bg.indexOf('medusa') >= 0) return 'rome';
    if (bg.indexOf('bone') >= 0 || bg.indexOf('glacier') >= 0) return 'bone';
    if (bg.indexOf('keep') >= 0 || bg.indexOf('nave') >= 0) return 'medieval';
    if (bg.indexOf('casino') >= 0 || bg.indexOf('speakeasy') >= 0 || bg.indexOf('brass') >= 0) return 'casino';
    if (bg.indexOf('arcade') >= 0 && IM.fg_arcade) return 'arcade';
    if (bg.indexOf('lab') >= 0 && IM.fg_lab) return 'lab';
    if (bg.indexOf('foundry') >= 0 && IM.fg_foundry) return 'foundry';
    if (bg.indexOf('garage') >= 0) return 'garage';
    if (bg.indexOf('yacht') >= 0) return 'yacht';
    if (bg.indexOf('nexus') >= 0 || bg.indexOf('hive') >= 0 || bg.indexOf('mind') >= 0 || bg.indexOf('mars') >= 0 || bg.indexOf('web') >= 0) return 'nexus';
    if (st.kit === 'future') return 'nexus';
    if (st.kit === 'industrial') return 'casino';
    if (st.kit === 'modern' && bg.indexOf('garage') >= 0) return 'garage';
    if (st.kit === 'west') return 'west';
    if (st.kit === 'ancient') return 'rome';
    if (st.kit === 'prehistoric') return 'bone';
    if (st.kit === 'medieval') return 'medieval';
    return null;
  }

  function drawFgPlate(c, st) {
    const key = fgKeyFor(st);
    const img = key && IM['fg_' + key];
    if (!img) return false;
    const ox = -(G.cam.x || 0) * 120;
    const oy = -(G.cam.y || 0) * 30 + (G.hideAmt || 0) * 20;
    c.save();
    // Stadium seats/ball/wall sat under the HOLD COVER HUD; lift and
    // slightly enlarge so that cover dressing clears the bottom berm.
    if (key === 'stadium') {
      const sc = 1.1;
      const lift = 168;
      const dw = (W + 80) * sc, dh = (H + 40) * sc;
      c.drawImage(img, -40 + ox - (dw - (W + 80)) / 2, -20 + oy - lift, dw, dh);
    } else if (key === 'arcade') {
      // drop the chrome rail onto the cover berm so it doesn't bisect the playfield
      c.drawImage(img, -40 + ox, 70 + oy, W + 80, H + 40);
    } else if (key === 'lab' || key === 'foundry') {
      c.drawImage(img, -40 + ox, 36 + oy, W + 80, H + 40);
    } else {
      c.drawImage(img, -40 + ox, -20 + oy, W + 80, H + 40);
    }
    c.restore();
    return true;
  }

  function addCoverDecal(x, y) {
    G.coverDecals = G.coverDecals || [];
    G.coverDecals.push({
      x: x + rand(-28, 28), y: y + rand(-36, 18),
      rot: rand(0, 6.2), s: rand(12, 24), t: 0, life: 8,
      k: Math.random() < 0.55 ? 'chip' : 'scorch'
    });
    if (G.coverDecals.length > 28) G.coverDecals.shift();
    if (typeof dustPuff === 'function') dustPuff(x, y + 10, 0.4);
  }
  function drawCoverDecals(c, yTop, yBot) {
    const list = G.coverDecals || [];
    for (const d of list) {
      c.save();
      c.translate(d.x, Math.min(d.y, yBot - 20));
      c.rotate(d.rot);
      c.globalAlpha = 0.75;
      if (d.k === 'scorch') {
        c.fillStyle = 'rgba(20,10,6,0.7)';
        c.beginPath(); c.ellipse(0, 0, d.s * 1.1, d.s * 0.55, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,160,60,0.22)';
        c.beginPath(); c.ellipse(0, 0, d.s * 0.45, d.s * 0.22, 0, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = 'rgba(30,22,16,0.85)';
        c.beginPath();
        c.moveTo(-d.s * 0.5, 0); c.lineTo(0, -d.s * 0.7); c.lineTo(d.s * 0.4, d.s * 0.15);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,230,180,0.35)'; c.lineWidth = 1;
        c.stroke();
      }
      c.restore();
    }
  }
  function drawForegroundCover(c) {
    const L = coverLayout();
    const hidden = L.hidden;
    const pal = L.pal;
    const key = L.key;
    const img = L.img;
    const wob = L.wob;
    const riseK = L.riseK;
    const rise = L.rise;
    const y = H - rise + wob * 0.35;
    const ox = L.ox;
    const oy = L.oy;
    if (hidden > 0.05) {
      c.fillStyle = 'rgba(0,0,0,' + (Math.min(1, hidden) * 0.38) + ')';
      c.fillRect(0, 0, W, H);
    }
    // Safety lip — full-width era berm so gaps still read as cover, hitboxes unchanged.
    c.save();
    const lipY = L.lipY;
    const grd = c.createLinearGradient(0, lipY, 0, H);
    grd.addColorStop(0, pal[2] || '#c8a070');
    grd.addColorStop(0.2, pal[1] || '#3a2a18');
    grd.addColorStop(1, pal[0] || '#1a120c');
    c.globalAlpha = 0.72;
    c.fillStyle = grd;
    c.beginPath();
    c.moveTo(-40, H + 20);
    c.lineTo(-40, lipY + 40);
    c.bezierCurveTo(W * 0.2, lipY - 8, W * 0.5, lipY + 22, W * 0.75, lipY + 6);
    c.bezierCurveTo(W * 0.9, lipY - 2, W, lipY + 28, W + 40, lipY + 16);
    c.lineTo(W + 40, H + 20);
    c.closePath();
    c.fill();
    c.restore();

    if (img) {
      const x = L.x, destY = L.destY, dw = L.dw, dh = L.dh;
      if (L.apron) {
        const a = L.apron;
        c.save();
        const ag = c.createLinearGradient(0, a.y, 0, a.y + a.h);
        ag.addColorStop(0, (a.fill && a.fill[0]) || pal[1] || '#3a2a18');
        ag.addColorStop(1, (a.fill && a.fill[1]) || pal[0] || '#1a120c');
        c.fillStyle = ag;
        c.globalAlpha = Math.min(1, 0.55 + hidden * 0.45);
        c.fillRect(a.x, a.y, a.w, a.h);
        c.restore();
      }
      c.save();
      c.drawImage(img, x, destY, dw, dh);
      c.restore();
    } else {
      // fallback painted berm (legacy)
      const yy = y + oy;
      c.save();
      const g2 = c.createLinearGradient(0, yy, 0, H);
      g2.addColorStop(0, pal[2] || '#c8a070');
      g2.addColorStop(0.18, pal[1] || '#3a2a18');
      g2.addColorStop(1, pal[0] || '#1a120c');
      c.fillStyle = g2;
      c.beginPath();
      c.moveTo(-30, H + 20);
      c.lineTo(-30, yy + 70);
      c.bezierCurveTo(W * 0.18, yy - 10, W * 0.38, yy + 36, W * 0.52, yy + 18);
      c.bezierCurveTo(W * 0.7, yy + 4, W * 0.86, yy + 48, W + 30, yy + 16);
      c.lineTo(W + 30, H + 20);
      c.closePath();
      c.fill();
      c.restore();
    }

    // rise dust / sparks
    if ((G._coverPuffT || 0) > 0 && G._coverPuffT < 0.45) {
      const u = G._coverPuffT / 0.45;
      c.save();
      c.globalAlpha = (1 - u) * 0.55;
      for (let i = 0; i < 10; i++) {
        const px = W * (0.08 + i * 0.09) + Math.sin((G.t || 0) * 8 + i) * 12;
        const py = H - rise + 40 + u * 50 + (i % 3) * 8;
        c.fillStyle = (i % 2) ? 'rgba(255,220,150,0.7)' : 'rgba(160,140,110,0.8)';
        c.beginPath(); c.ellipse(px, py, 14 - u * 8, 6, 0, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    drawCoverDecals(c, H - rise, H);
    if (hidden > 0.5) {
      c.save();
      c.globalAlpha = (hidden - 0.5) * 2;
      c.fillStyle = '#ffe7b0';
      c.font = '700 34px Anton, sans-serif';
      c.textAlign = 'center';
      c.fillText('RELOADING', W / 2, H - 96);
      c.restore();
    }
  }
  function shade(hex, a) {
    // hex like #c8a070 or fallback
    return hex && hex[0] === '#' ? hex : 'rgba(200,160,100,' + a + ')';
  }
  // Canvas font size that reads as `px` CSS pixels on the letterboxed stage.
  function cssPx(px) {
    const s = Math.max(0.2, G.scale || 1);
    return Math.max(14, Math.round(px / s));
  }

  function drawHud(c) {
    const p = G.player, st = G.stage;
    if (!p || !st) return;
    // top bar
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(0, 0, W, 86);
    // chaos inset
    if (IM.chaos) {
      c.save();
      roundedPath(c, 22, 12, 62, 62, 10); c.clip();
      c.drawImage(IM.chaos, 22, 12, 62, 74);
      c.restore();
      c.strokeStyle = 'rgba(255,220,140,0.6)'; c.lineWidth = 2;
      roundedPath(c, 22, 12, 62, 62, 10); c.stroke();
    }
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = '#ffe7b0';
    c.font = '700 28px Anton, sans-serif';
    c.fillText('STAGE ' + st.id + '  ' + st.era.toUpperCase(), 100, 32);
    c.font = '600 16px Oswald, sans-serif';
    c.fillStyle = '#b8c0cc';
    c.fillText(st.year + '  ·  SEEK WORD:  “' + st.word + '”', 100, 62);

    c.textAlign = 'right';
    c.fillStyle = '#fff';
    c.font = '700 36px Anton, sans-serif';
    c.fillText(String(p.score).padStart(6, '0'), W - 150, 34);
    if (p.combo > 1) {
      c.fillStyle = '#ffd056';
      c.font = '700 20px Oswald, sans-serif';
      c.fillText(p.combo + 'x COMBO', W - 150, 66);
    }

    // HP under title
    for (let i = 0; i < p.maxHp; i++) {
      c.fillStyle = i < p.hp ? '#e23b3b' : 'rgba(255,255,255,0.15)';
      rounded(c, 100 + i * 30, 86, 24, 10, 3); c.fill();
    }

    // ammo above the berm
    const ax = W / 2 - (p.maxAmmo * 26) / 2;
    const ay = H - 168;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    rounded(c, ax - 16, ay - 10, p.maxAmmo * 26 + 20, 48, 10); c.fill();
    for (let i = 0; i < p.maxAmmo; i++) {
      c.fillStyle = i < p.ammo ? (G.shellFlash > 0 ? '#ff6b6b' : '#ffd056') : 'rgba(255,255,255,0.14)';
      rounded(c, ax + i * 26, ay, 16, 30, 3); c.fill();
    }
    if (p.weapon && p.weapon !== 'pistol') {
      c.fillStyle = (weaponCfg().color || '#ffd056');
      c.font = '700 14px Oswald, sans-serif';
      c.textAlign = 'center';
      c.fillText(weaponCfg().name, W / 2, ay - 18);
    }
    if (G.hiding && p.ammo < p.maxAmmo) {
      const beat = (G.reloadBeat || 0) % 1;
      const bx = W / 2 - 110, by = H - 214, bw = 220, bh = 10;
      c.fillStyle = 'rgba(0,0,0,0.45)';
      rounded(c, bx, by, bw, bh, 4); c.fill();
      c.fillStyle = 'rgba(80,255,140,0.35)';
      c.fillRect(bx + bw * 0.38, by, bw * 0.24, bh);
      c.fillStyle = '#ffe7b0';
      c.fillRect(bx + beat * bw - 2, by - 3, 4, bh + 6);
      c.fillStyle = '#b8ffd0';
      c.font = '700 13px Oswald, sans-serif';
      c.textAlign = 'center';
      c.fillText('TAP THE BEAT', W / 2, by - 8);
    }
    if (p.ammo === 0 && !G.hiding) {
      c.fillStyle = 'rgba(255,80,80,' + (0.6 + 0.4 * Math.sin(G.t * 8)) + ')';
      c.font = '700 ' + cssPx(16) + 'px Anton, sans-serif';
      c.textAlign = 'center';
      c.fillText('EMPTY  —  HOLD COVER TO RELOAD', W / 2, H - 200);
    }

    // boss bar
    if (G.phase === 'boss' && G.boss && G.boss.alive) {
      const frac = clamp(G.boss.hp / G.boss.maxHp, 0, 1);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      rounded(c, 460, 100, 1000, 28, 8); c.fill();
      c.fillStyle = '#c01828';
      rounded(c, 464, 104, 992 * frac, 20, 6); c.fill();
      c.fillStyle = '#ffe7b0';
      c.font = '700 16px Oswald, sans-serif';
      c.textAlign = 'center';
      c.fillText(G.stage.boss.name + '  —  PHASE ' + G.bossPhase, 960, 114);
    }

    if (G.hint && G.hintT > 0) {
      c.save();
      c.globalAlpha = clamp(G.hintT, 0, 1);
      const fs = cssPx(G.tutorial ? 20 : 17);
      let lines = String(G.hint).split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
      if (lines.length === 1 && lines[0].length > 28) {
        const mid = Math.floor(lines[0].length / 2);
        const cut = lines[0].lastIndexOf(' ', mid);
        if (cut > 8) lines = [lines[0].slice(0, cut), lines[0].slice(cut + 1)];
      }
      c.font = '700 ' + fs + 'px Oswald, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      let tw = 0;
      lines.forEach((ln) => { tw = Math.max(tw, c.measureText(ln).width); });
      const padX = cssPx(18), padY = cssPx(10), lh = fs + cssPx(6);
      const bw = Math.min(W - cssPx(24), tw + padX * 2);
      const bh = lh * lines.length + padY * 2;
      // Sit just under the top bar; on a short phone letterbox keep it in the safe band.
      const bx = (W - bw) / 2;
      const by = 88;
      c.fillStyle = 'rgba(0,0,0,0.78)';
      rounded(c, bx, by, bw, bh, 12); c.fill();
      c.strokeStyle = 'rgba(255,224,160,0.7)';
      c.lineWidth = Math.max(2, cssPx(1.5));
      rounded(c, bx, by, bw, bh, 12); c.stroke();
      c.fillStyle = '#ffe7b0';
      lines.forEach((ln, i) => c.fillText(ln, W / 2, by + padY + lh * i + lh * 0.48));
      c.restore();
    }
    if (G.callout) {
      const k = G.callout.kind;
      const col = k === 'bad' ? '#ff6b7d' : k === 'good' ? '#7dff9a' : k === 'boss' ? '#ffd056' : k === 'warn' ? '#ffb347' : '#fff';
      c.save();
      const s = G.callout.t < 0.1 ? G.callout.t / 0.1 : 1;
      // slim toast under the score, never over faces
      c.translate(W - 170, 96); c.scale(s, s);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      rounded(c, -110, -16, 220, 32, 8); c.fill();
      c.fillStyle = col;
      c.font = '700 18px Anton, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(G.callout.text, 0, 1);
      c.restore();
    }

    // seed phrase lives on result / select screens, not over the berm
  }

  function drawSeedStrip(c, x, y, sc) {
    c.save();
    c.translate(x, y); c.scale(sc, sc);
    const words = TPStages.WORDS;
    const got = new Set(G.save.words);
    c.font = '700 28px Oswald, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let xx = 0, yy = 0;
    for (let i = 0; i < words.length; i++) {
      const on = got.has(words[i]) && /* allow duplicates by count */ true;
      // count occurrences collected vs needed: simpler — highlight if this index < collected length in order
      const collected = G.save.words;
      const known = collected.length > i && collected[i] === words[i] || collected.includes(words[i]) && i < collected.length;
      // Use index-based: words recovered in stage order
      const lit = G.save.unlocked > i + 1 || (G.save.words.length > i);
      const w = 86;
      c.fillStyle = lit ? 'rgba(255,208,86,0.9)' : 'rgba(0,0,0,0.45)';
      rounded(c, xx, yy, w, 36, 6); c.fill();
      c.fillStyle = lit ? '#1a1208' : '#6a7380';
      c.fillText(lit ? words[i] : '—', xx + w / 2, yy + 18);
      xx += w + 6;
      if ((i + 1) % 13 === 0) { xx = 0; yy += 44; }
    }
    c.restore();
  }

  function drawTitle(c) {
    const z = 1.04 + Math.sin(G.titleT * 0.35) * 0.02;
    c.save();
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    if (IM.cover) c.drawImage(IM.cover, 0, 0, W, H);
    else c.fillRect(0, 0, W, H);
    c.restore();
    c.fillStyle = 'rgba(0,0,0,' + (0.08 + Math.sin(G.titleT * 1.2) * 0.03) + ')';
    c.fillRect(0, 0, W, H);
    // light sweep
    const sweep = ((G.titleT * 0.35) % 2);
    if (sweep < 1) {
      c.save();
      c.globalCompositeOperation = 'screen';
      const gx = -200 + sweep * (W + 400);
      const lg = c.createLinearGradient(gx, 0, gx + 260, H);
      lg.addColorStop(0, 'rgba(255,220,140,0)');
      lg.addColorStop(0.5, 'rgba(255,220,140,0.14)');
      lg.addColorStop(1, 'rgba(255,220,140,0)');
      c.fillStyle = lg; c.fillRect(0, 0, W, H);
      c.restore();
    }
    const appear = clamp(G.titleT / 0.6, 0, 1);
    c.globalAlpha = appear;
    const pulse = 0.85 + 0.15 * Math.sin(G.titleT * 3);
    button(c, 960, 820, 300, 74, 'START', true, pulse);
    button(c, 960, 910, 300, 60, 'STAGE SELECT', false, 1);
    if (G.save.checkpoint > 0) {
      button(c, 700, 990, 240, 48, 'CONTINUE', false, 1);
      button(c, 1220, 990, 240, 48, 'SETTINGS', false, 1);
    } else {
      button(c, 960, 990, 240, 48, 'SETTINGS', false, 1);
    }
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = '500 14px Oswald, sans-serif';
    c.textAlign = 'center';
    c.fillText('FAN-MADE TRIBUTE  ·  NOT AFFILIATED  ·  PLAY ONLY', 960, 1058);
  }

  function button(c, x, y, w, h, label, primary, pulse) {
    c.save();
    c.globalAlpha = pulse || 1;
    c.fillStyle = primary ? 'rgba(255,208,86,0.92)' : 'rgba(0,0,0,0.55)';
    c.strokeStyle = primary ? '#fff3c0' : 'rgba(255,255,255,0.35)';
    c.lineWidth = 2;
    rounded(c, x - w / 2, y - h / 2, w, h, 12); c.fill(); c.stroke();
    c.fillStyle = primary ? '#1a1208' : '#ffe7b0';
    c.font = '700 32px Anton, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, x, y + 2);
    c.restore();
  }

  function drawComic(c) {
    const com = G.comic;
    if (!com || !window.TPComic) return;
    const vw = viewW(), vh = viewH();
    if (!com.ready) {
      c.fillStyle = '#1a1410';
      c.fillRect(0, 0, vw, vh);
      c.fillStyle = '#ffe7b0';
      c.font = '700 28px Oswald, sans-serif';
      c.textAlign = 'center';
      c.fillText('TURNING THE PAGE…', vw / 2, vh / 2);
      return;
    }
    const page = com.pages[com.i];
    if (!page) return;
    TPComic.drawPage(c, vw, vh, page, com.panel || 1, com.t, IM, halftone);
    if (!G.portraitComic) {
      c.fillStyle = 'rgba(40,30,20,0.8)';
      c.font = '600 16px Oswald, sans-serif';
      c.textAlign = 'center';
      c.fillText((com.i + 1) + ' / ' + com.pages.length, vw - 80, vh - 28);
    }
  }

  function balloon(c, x, y, w, speaker, lines) {
    const linesA = lines || [];
    const h = 80 + linesA.length * 42;
    c.fillStyle = 'rgba(255,248,235,0.95)';
    rounded(c, x, y, w, h, 20); c.fill();
    // tail
    c.beginPath();
    c.moveTo(x + 80, y + h);
    c.lineTo(x + 60, y + h + 28);
    c.lineTo(x + 120, y + h);
    c.fill();
    c.fillStyle = '#8a1020';
    c.font = '700 18px Oswald, sans-serif';
    c.textAlign = 'left';
    c.fillText((speaker || '').toUpperCase(), x + 28, y + 32);
    c.fillStyle = '#1a120c';
    c.font = '600 28px Oswald, sans-serif';
    linesA.forEach((ln, i) => c.fillText(ln, x + 28, y + 74 + i * 42));
  }

  function drawSelect(c) {
    const pal = c.createLinearGradient(0, 0, 0, H);
    pal.addColorStop(0, '#0c0e14'); pal.addColorStop(1, '#06070a');
    c.fillStyle = pal; c.fillRect(0, 0, W, H);
    // gold time-rail under the nodes
    const nodes = selectNodes();
    c.strokeStyle = 'rgba(255,208,86,0.35)';
    c.lineWidth = 4;
    c.beginPath();
    nodes.forEach((n, i) => {
      const cx = n.x + n.w / 2, cy = n.y + 36;
      if (i === 0) c.moveTo(cx, cy); else c.lineTo(cx, cy);
    });
    c.stroke();
    c.fillStyle = '#c9d0da';
    c.font = '700 16px Anton, sans-serif';
    c.textAlign = 'left';
    c.fillText('METAWINNERS', 80, 40);
    c.fillStyle = '#ffe7b0';
    c.font = '700 44px Anton, sans-serif';
    c.textAlign = 'center';
    c.fillText('TIME RAIL', 960, 56);
    c.fillStyle = 'rgba(255,231,176,0.7)';
    c.font = '600 16px Oswald, sans-serif';
    c.fillText('STAGE SELECT  ·  25 ERAS', 960, 86);
    button(c, 140, 120, 160, 48, 'BACK', false, 1);
    for (const n of nodes) {
      const i = n.i, st = TPStages.STAGES[i];
      const x = n.x, y = n.y, cw = n.w, ch = n.h;
      const unlocked = i < G.save.unlocked;
      c.fillStyle = unlocked ? 'rgba(20,16,12,0.92)' : 'rgba(8,8,10,0.8)';
      rounded(c, x, y, cw, ch, 12); c.fill();
      c.strokeStyle = unlocked ? 'rgba(255,208,86,0.35)' : 'rgba(255,255,255,0.08)';
      c.lineWidth = 2; rounded(c, x, y, cw, ch, 12); c.stroke();
      const thumb = IM['t_' + st.boss.id];
      if (thumb) {
        c.save();
        roundedPath(c, x + 8, y + 8, 58, 58, 8); c.clip();
        c.drawImage(thumb, x + 8, y + 8, 58, 58);
        c.restore();
        if (!unlocked) {
          c.fillStyle = 'rgba(0,0,0,0.55)';
          rounded(c, x + 8, y + 8, 58, 58, 8); c.fill();
        }
      }
      c.fillStyle = unlocked ? '#ffe7b0' : '#667';
      c.font = '700 15px Anton, sans-serif';
      c.textAlign = 'left';
      c.fillText((i + 1) + '. ' + st.boss.name, x + 74, y + 28);
      c.font = '600 12px Oswald, sans-serif';
      c.fillStyle = unlocked ? '#b8c0cc' : '#555';
      c.fillText(st.year, x + 74, y + 48);
      c.fillText(st.era, x + 10, y + 82);
      const g = G.save.grades[st.id];
      if (g) {
        c.fillStyle = '#ffd056';
        c.font = '700 26px Anton, sans-serif';
        c.textAlign = 'right';
        c.fillText(g, x + cw - 10, y + 36);
      }
      c.textAlign = 'left';
      c.font = '600 11px Oswald, sans-serif';
      c.fillStyle = unlocked ? '#7dff9a' : '#8aa';
      c.fillText(unlocked ? 'OPEN' : 'LOCKED', x + 12, y + ch - 14);
      if (!unlocked) {
        c.fillStyle = 'rgba(0,0,0,0.25)';
        rounded(c, x, y, cw, ch, 12); c.fill();
      }
    }
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.font = '500 14px Oswald, sans-serif';
    c.textAlign = 'center';
    c.fillText('Ride the rail from 1987 to the Time Nexus. Recover every word.', 960, 1048);
  }

  function drawResult(c) {
    const r = G.result; if (!r) return;
    const t = G.modeT;
    if (IM.cover) { c.drawImage(IM.cover, 0, 0, W, H); c.fillStyle = 'rgba(0,0,0,0.66)'; c.fillRect(0, 0, W, H); }
    else { c.fillStyle = '#08080c'; c.fillRect(0, 0, W, H); }
    c.fillStyle = r.cleared ? '#ffd056' : '#ff6b7d';
    c.font = '800 64px Anton, sans-serif';
    c.textAlign = 'center';
    c.fillText(r.cleared ? 'WORD RECOVERED' : 'RUN OVER', 960, 130);
    if (r.cleared) {
      const word = String(r.word || '');
      const shown = word.slice(0, Math.max(1, Math.floor(clamp((t - 0.08) / 0.06, 0, word.length))));
      c.fillStyle = '#fff';
      c.font = '800 96px Anton, sans-serif';
      c.fillText(shown, 960, 230);
    }
    // score card
    c.fillStyle = 'rgba(8,8,12,0.55)';
    rounded(c, 480, 430, 960, 220, 16); c.fill();
    c.strokeStyle = 'rgba(255,208,86,0.25)'; c.lineWidth = 2;
    rounded(c, 480, 430, 960, 220, 16); c.stroke();
    // grade slam
    const gs = t < 0.35 ? (t / 0.35) * (t / 0.35) : 1;
    c.save();
    c.translate(960, 360); c.scale(2.2 - gs * 1.2, 2.2 - gs * 1.2);
    c.globalAlpha = clamp(t / 0.15, 0, 1);
    c.fillStyle = '#ffd056';
    c.font = '800 150px Anton, sans-serif';
    c.fillText(r.grade, 0, 20);
    c.restore();
    const acc = Math.round(r.acc * 100);
    c.fillStyle = '#d8dee8';
    c.font = '600 22px Oswald, sans-serif';
    c.fillText('ACCURACY  ' + acc + '%', 960, 470);
    // simple breakdown
    const lines = [
      'KILLS  ' + (r.kills || 0) + '    ·    HEADSHOTS  ' + (r.headshots || 0),
      'COMBO  x' + r.combo + '    ·    TIME BONUS  +' + (r.timeBonus || 0),
      'CIVILIAN PENALTY  −' + (r.civPenalty || (r.civ * 500) || 0),
      'SCORE  ' + r.score + (r.newBest ? '    ·    NEW STAGE BEST' : ('    ·    STAGE BEST  ' + (r.best || r.score))),
      'ALL-TIME TOTAL  ' + (r.totalBest || 0),
    ];
    c.font = '600 20px Oswald, sans-serif';
    c.fillStyle = '#c8d0da';
    lines.forEach((ln, i) => { if (t > 0.4 + i * 0.08) c.fillText(ln, 960, 510 + i * 28); });
    // seed board fills in
    if (t > 0.6) {
      c.save();
      c.globalAlpha = clamp((t - 0.6) / 0.3, 0, 1);
      drawSeedStrip(c, 400, 660, 1);
      c.restore();
    }
    if (r.cleared) button(c, 960, 820, 300, 74, G.stageIndex < 24 ? 'NEXT STAGE' : 'CREDITS', true, 1);
    button(c, 700, 920, 240, 60, 'REPLAY', false, 1);
    button(c, 1220, 920, 240, 60, 'STAGE SELECT', false, 1);
  }

  function drawPause(c) {
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffe7b0';
    c.font = '800 72px Anton, sans-serif';
    c.textAlign = 'center';
    c.fillText('PAUSED', 960, 360);
    c.font = '600 22px Oswald, sans-serif';
    c.fillStyle = '#ccc';
    c.fillText('DIFFICULTY  ·  ' + diffCfg().name, 960, 430);
    c.fillText('M MUTES  ·  HOLD COVER TO RELOAD', 960, 470);
    button(c, 960, 600, 300, 70, 'RESUME', true, 1);
    button(c, 960, 690, 300, 60, 'SETTINGS', false, 1);
    button(c, 960, 770, 300, 54, 'QUIT TO TITLE', false, 1);
  }
  function tapPause(x, y) {
    if (hitBox(x, y, 960, 600, 300, 70) || y > 900) { togglePause(); return; }
    if (hitBox(x, y, 960, 690, 300, 60)) { TPAudio.ui(); G.settingsFrom = 'paused'; G.pausedReturn = true; go('settings'); return; }
    if (hitBox(x, y, 960, 770, 300, 54)) { TPAudio.ui(); G.paused = false; go('title'); return; }
  }
  function drawContinue(c) {
    c.fillStyle = 'rgba(0,0,0,0.62)'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffd056';
    c.font = '800 72px Anton, sans-serif';
    c.textAlign = 'center';
    c.fillText('CONTINUE?', 960, 360);
    c.fillStyle = '#fff';
    c.font = '600 26px Oswald, sans-serif';
    c.fillText((G.player.lives) + ' CREDIT' + (G.player.lives === 1 ? '' : 'S') + ' REMAINING', 960, 450);
    button(c, 960, 700, 280, 74, 'CONTINUE', true, 1);
    button(c, 960, 800, 280, 60, 'END RUN', false, 1);
  }

  function finishIntroDraw() {}
  function drawIntro(c) {
    const t = G.modeT;
    c.fillStyle = '#04040a'; c.fillRect(0, 0, W, H);
    const rift = IM.rift || IM.cover;
    if (rift) {
      const z = 1.05 + t * 0.12;
      c.save();
      c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
      c.globalAlpha = 0.85;
      c.drawImage(rift, -40, -40, W + 80, H + 80);
      c.restore();
    }
    // rift rings
    c.save();
    c.strokeStyle = 'rgba(80,220,255,' + (0.35 + 0.2 * Math.sin(t * 6)) + ')';
    c.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const r = 30 + (t * 220 + i * 90) % 700;
      c.beginPath(); c.arc(W / 2, H * 0.46, r, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    if (t < 2.4) {
      c.globalAlpha = clamp(t / 0.4, 0, 1) * clamp((2.4 - t) / 0.4, 0, 1);
      c.fillStyle = '#e8f6ff';
      c.font = '700 28px Oswald, sans-serif';
      c.textAlign = 'center';
      c.fillText('COLD OPEN', 960, 280);
      c.fillStyle = '#ffd056';
      c.font = '800 64px Anton, sans-serif';
      c.fillText('THE TIMELINE JUST RUGGED', 960, 400);
      c.fillStyle = '#c8d0da';
      c.font = '600 26px Oswald, sans-serif';
      c.fillText('Twenty-five words scattered across every era.', 960, 480);
    } else if (t < 4.2) {
      c.globalAlpha = clamp((t - 2.4) / 0.3, 0, 1);
      if (IM.chaos) {
        const h = 720, w = h * (IM.chaos.width / IM.chaos.height);
        c.drawImage(IM.chaos, 120, 200, w, h);
      }
      c.fillStyle = '#ffe7b0';
      c.font = '800 52px Anton, sans-serif';
      c.textAlign = 'left';
      c.fillText('CHAOS WANTS HIS', 700, 420);
      c.fillText('SEED PHRASE BACK.', 700, 490);
    }
    if (t >= 4.0) {
      const slam = clamp((t - 4.0) / 0.28, 0, 1);
      const s = 1.8 - slam * 0.8;
      if (t > 4.0 && t < 4.08 && !G._introSting) { G._introSting = true; try { TPAudio.sting(); } catch (e) {} }
      c.save();
      c.translate(960, 520); c.scale(s, s);
      c.globalAlpha = slam;
      c.fillStyle = '#ffe7b0';
      c.font = '800 42px Anton, sans-serif';
      c.textAlign = 'center';
      c.fillText('METAWINNERS', 0, -36);
      c.fillStyle = '#ffd056';
      c.font = '800 90px Anton, sans-serif';
      c.fillText('TRIGGER PHRASE', 0, 50);
      c.restore();
      c.globalAlpha = clamp((t - 5.2) / 0.4, 0, 1);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.font = '600 20px Oswald, sans-serif';
      c.textAlign = 'center';
      c.fillText('CLICK TO SKIP', 960, 1000);
    }
    // fade out
    if (t > 5.8) {
      c.fillStyle = 'rgba(0,0,0,' + clamp((t - 5.8) / 0.6, 0, 1) + ')';
      c.fillRect(0, 0, W, H);
    }
  }
  function drawStageCard(c) {
    const st = G.stage; if (!st) return;
    const t = G.modeT;
    const img = bgImageFor(st);
    if (img) { c.drawImage(img, 0, 0, W, H); c.fillStyle = 'rgba(0,0,0,0.62)'; c.fillRect(0, 0, W, H); }
    else { c.fillStyle = '#08080c'; c.fillRect(0, 0, W, H); }
    const slide = Math.min(1, t / 0.35);
    c.save();
    c.translate((1 - slide) * -200, 0);
    c.fillStyle = '#ffe7b0';
    c.font = '700 22px Oswald, sans-serif';
    c.textAlign = 'left';
    c.fillText('STAGE  ' + st.id + '  ·  ' + st.year, 160, 260);
    c.font = '800 84px Anton, sans-serif';
    c.fillText(st.era.toUpperCase(), 160, 360);
    c.fillStyle = '#c8d0da';
    c.font = '600 28px Oswald, sans-serif';
    c.fillText(st.place, 160, 420);
    if (st.motion && st.motion.label) {
      c.fillStyle = '#ffd056';
      c.font = '700 20px Oswald, sans-serif';
      c.fillText('RAIL CHASE  ·  ' + st.motion.label.toUpperCase(), 160, 470);
    }
    c.fillStyle = '#fff';
    c.font = '700 24px Oswald, sans-serif';
    c.fillText('RECOVER', 160, 560);
    c.fillStyle = '#ffd056';
    c.font = '800 96px Anton, sans-serif';
    c.fillText(st.word, 160, 660);
    const pre = TPStages.BANTER && TPStages.BANTER[G.stageIndex] && TPStages.BANTER[G.stageIndex].pre;
    if (pre) {
      c.fillStyle = 'rgba(10,6,8,0.78)';
      c.fillRect(150, 690, Math.min(980, 80 + pre.length * 22), 86);
      c.fillStyle = '#8e1020';
      c.fillRect(150, 690, 10, 86);
      c.fillStyle = '#ffd056';
      c.font = '800 22px Anton, sans-serif';
      c.fillText('CHAOS', 178, 722);
      c.fillStyle = '#ffe7b0';
      c.font = '700 32px Oswald, sans-serif';
      c.fillText(pre, 178, 760);
    }
    c.restore();
    // VS card slide-in from the right
    const ps = Math.min(1, t / 0.45);
    const ease = 1 - Math.pow(1 - ps, 3);
    const boss = IM['boss_' + st.boss.id] || IM['p_' + st.boss.id];
    if (boss) {
      const h = 820, w = h * (boss.width / boss.height);
      const bx = W - w + (1 - ease) * 460;
      const by = H - h + 20;
      c.save();
      c.fillStyle = 'rgba(8,6,10,0.78)';
      c.fillRect(bx - 28, by - 16, w + 48, h + 20);
      c.strokeStyle = '#ffd056';
      c.lineWidth = 4;
      c.strokeRect(bx - 28, by - 16, w + 48, h + 20);
      c.fillStyle = '#ffd056';
      c.font = '800 28px Anton, sans-serif';
      c.textAlign = 'left';
      c.fillText('VS', bx - 12, by + 28);
      c.drawImage(boss, bx, by, w, h);
      c.restore();
    }
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = '600 18px Oswald, sans-serif';
    c.textAlign = 'center';
    c.fillText('CLICK TO CONTINUE', 960, 1020);
  }
  function drawBossSplash(c) {
    const st = G.stage; if (!st) return;
    const t = G.bossIntro;
    const a = t < 0.18 ? t / 0.18 : (t > 1.65 ? clamp((2.05 - t) / 0.4, 0, 1) : 1);
    c.save();
    const slide = Math.min(1, t / 0.22);
    c.globalAlpha = a;
    // diagonal light sweep
    const sw = t / 0.85;
    if (sw < 1.05) {
      const x = -500 + sw * (W + 1000);
      const g = c.createLinearGradient(x, 0, x + 460, H * 0.2);
      g.addColorStop(0, 'rgba(255,230,150,0)');
      g.addColorStop(0.5, 'rgba(255,236,180,0.28)');
      g.addColorStop(1, 'rgba(255,230,150,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    c.fillStyle = 'rgba(10,6,8,0.86)';
    c.fillRect(0, (1 - slide) * -90, W, 110);
    c.fillStyle = '#8e1020';
    c.fillRect(0, 102 + (1 - slide) * -90, W, 7);
    c.fillStyle = '#ffe7b0';
    c.font = '800 30px Anton, sans-serif';
    c.textAlign = 'left';
    c.fillText('CHAOS', 48, 62);
    const vsSlam = t < 0.28 ? (2.2 - 1.2 * Math.min(1, t / 0.2)) : 1;
    c.save();
    c.translate(960, 68);
    c.scale(vsSlam, vsSlam);
    c.font = '800 64px Anton, sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#ffd056';
    c.fillText('VS', 0, 0);
    c.restore();
    const nameSlam = t < 0.36 ? (2.0 - 1.0 * Math.min(1, Math.max(0, (t - 0.06) / 0.22))) : 1;
    c.save();
    c.translate(W - 200, 68);
    c.scale(nameSlam, nameSlam);
    c.fillStyle = '#fff';
    c.font = '800 52px Anton, sans-serif';
    c.textAlign = 'right';
    c.fillText(st.boss.name, 0, 0);
    c.restore();
    c.fillStyle = 'rgba(10,6,8,0.86)';
    c.fillRect(0, H - 88 + (1 - slide) * 80, W, 88);
    c.fillStyle = '#8e1020';
    c.fillRect(0, H - 88 + (1 - slide) * 80, W, 7);
    const pre = TPStages.BANTER && TPStages.BANTER[G.stageIndex] && TPStages.BANTER[G.stageIndex].pre;
    c.fillStyle = '#ffd056';
    c.font = '800 20px Anton, sans-serif';
    c.textAlign = 'center';
    c.fillText('CHAOS', 960, H - 52);
    c.fillStyle = '#ffe7b0';
    c.font = '700 32px Oswald, sans-serif';
    c.fillText(pre || ((st.era || '').toUpperCase() + '  ·  RECOVER  “' + st.word + '”'), 960, H - 20);
    c.restore();
  }
  function drawCredits(c) {
    const t = G.modeT;
    c.fillStyle = '#07070c'; c.fillRect(0, 0, W, H);
    if (IM.rift) {
      c.globalAlpha = 0.28;
      c.drawImage(IM.rift, 0, 0, W, H);
      c.globalAlpha = 1;
    }
    const lines = [
      'METAWINNERS: TRIGGER PHRASE',
      '',
      'A fan-made light-gun tribute',
      'Not affiliated with MetaWinners or any studio',
      '',
      'Hero  ·  Chaos',
      'Twenty-five words  ·  twenty-five one-of-ones',
      'Hide. Reload. Never type the phrase on a website.',
      '',
      'The Echo tried to phish Chaos with his own face.',
      'The twenty-five words stay off-chain.',
      '',
      'Original soundtrack and SFX  ·  synthesized',
      'Characters painted from official 1/1 likenesses',
      '',
      'Thanks for playing.',
      '',
      'CLICK TO RETURN',
    ];
    const y0 = H - t * 48;
    c.textAlign = 'center';
    lines.forEach((ln, i) => {
      const y = y0 + i * 54;
      if (y < 40 || y > H - 20) return;
      c.fillStyle = i === 0 ? '#ffd056' : '#e8eef6';
      c.font = (i === 0 ? '800 48px Anton, sans-serif' : '600 26px Oswald, sans-serif');
      c.fillText(ln, 960, y);
    });
  }
  function drawScreenCrack(c) {
    const k = G.screenCrack || 0;
    if (k <= 0.02) return;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = Math.min(1, k);
    c.fillStyle = 'rgba(180,10,10,' + (0.28 * k) + ')';
    c.fillRect(0, 0, viewW(), viewH());
    c.strokeStyle = 'rgba(255,255,255,' + (0.82 * k) + ')';
    c.lineWidth = 2.5;
    const cx = W * 0.5, cy = H * 0.46;
    c.beginPath();
    const rays = [
      [cx, cy, cx - 420, cy - 260], [cx, cy, cx + 380, cy - 200],
      [cx, cy, cx + 460, cy + 80], [cx, cy, cx - 500, cy + 40],
      [cx, cy, cx - 160, cy + 360], [cx, cy, cx + 220, cy + 390],
      [cx - 80, cy - 40, cx - 260, cy - 420], [cx + 60, cy + 20, cx + 340, cy + 300]
    ];
    rays.forEach((r) => { c.moveTo(r[0], r[1]); c.lineTo(r[2], r[3]); });
    c.stroke();
    c.strokeStyle = 'rgba(20,0,0,' + (0.55 * k) + ')';
    c.lineWidth = 6;
    c.stroke();
    c.restore();
  }
  function drawCursor(c) {
    if (G.mode !== 'play' && G.mode !== 'paused') return;
    if (!G.pointer.on && G.mode === 'title') return;
    const aim = (G.mode === 'play' || G.mode === 'paused' || G.mode === 'continue') ? worldToCanvas(G.pointer.x, G.pointer.y) : { x: G.pointer.x, y: G.pointer.y };
    const x = aim.x, y = aim.y;
    const hidden = G.hideAmt > 0.55 && G.mode === 'play';
    c.save();
    c.translate(x, y);
    c.strokeStyle = hidden ? 'rgba(255,255,255,0.25)' : '#ffe7b0';
    c.lineWidth = 2;
    const r = 22;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(-r - 8, 0); c.lineTo(-6, 0); c.moveTo(6, 0); c.lineTo(r + 8, 0);
    c.moveTo(0, -r - 8); c.lineTo(0, -6); c.moveTo(0, 6); c.lineTo(0, r + 8); c.stroke();
    c.fillStyle = '#ff3a3a';
    c.beginPath(); c.arc(0, 0, 2.5, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function rounded(c, x, y, w, h, r) {
    roundedPath(c, x, y, w, h, r); c.fill();
  }
  function roundedPath(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function drawSettings(c) {
    c.fillStyle = '#07070c'; c.fillRect(0, 0, W, H);
    if (IM.rift) { c.globalAlpha = 0.28; c.drawImage(IM.rift, 0, 0, W, H); c.globalAlpha = 1; }
    c.fillStyle = '#ffe7b0';
    c.font = '800 72px Anton, sans-serif';
    c.textAlign = 'center';
    c.fillText('SETTINGS', 960, 140);
    const s = G.save;
    const diffs = ['easy','normal','hard'];
    c.font = '700 22px Oswald, sans-serif';
    c.fillStyle = '#c8d0da';
    c.fillText('DIFFICULTY', 960, 230);
    diffs.forEach((d, i) => {
      button(c, 700 + i * 260, 290, 220, 56, d.toUpperCase(), s.difficulty === d, 1);
    });
    function slider(label, y, val, key) {
      c.fillStyle = '#c8d0da';
      c.font = '700 20px Oswald, sans-serif';
      c.textAlign = 'left';
      c.fillText(label, 560, y + 8);
      c.fillStyle = 'rgba(255,255,255,0.15)';
      rounded(c, 820, y - 12, 520, 16, 8); c.fill();
      c.fillStyle = '#ffd056';
      rounded(c, 820, y - 12, 520 * val, 16, 8); c.fill();
      c.beginPath(); c.arc(820 + 520 * val, y - 4, 14, 0, Math.PI * 2); c.fill();
    }
    slider('MUSIC', 400, s.volMus, 'volMus');
    slider('SFX', 470, s.volSfx, 'volSfx');
    slider('MASTER', 540, s.volMaster, 'volMaster');
    button(c, 780, 650, 340, 58, s.lefty ? 'COVER BUTTON  ·  RIGHT' : 'COVER BUTTON  ·  LEFT', false, 1);
    button(c, 1140, 650, 340, 58, s.reduced ? 'EFFECTS  ·  REDUCED' : 'EFFECTS  ·  FULL', false, 1);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = '600 18px Oswald, sans-serif';
    c.textAlign = 'center';
    c.fillText('Easy adds aim assist. Normal assists only on touch. Hard has no assist and a shorter telegraph.', 960, 740);
    button(c, 960, 860, 280, 64, 'BACK', true, 1);
  }
  function tapSettings(x, y) {
    const s = G.save;
    const diffs = ['easy','normal','hard'];
    diffs.forEach((d, i) => {
      if (hitBox(x, y, 700 + i * 260, 290, 220, 56)) { s.difficulty = d; TPAudio.ui(); writeSave(); }
    });
    function hitSlider(y0, key) {
      if (y > y0 - 28 && y < y0 + 24 && x >= 800 && x <= 1360) {
        s[key] = clamp((x - 820) / 520, 0, 1);
        applySettingsChrome(); writeSave();
      }
    }
    hitSlider(400, 'volMus'); hitSlider(470, 'volSfx'); hitSlider(540, 'volMaster');
    if (hitBox(x, y, 780, 650, 340, 58)) { s.lefty = !s.lefty; TPAudio.ui(); applySettingsChrome(); writeSave(); }
    if (hitBox(x, y, 1140, 650, 340, 58)) { s.reduced = !s.reduced; TPAudio.ui(); applySettingsChrome(); layout(); writeSave(); }
    if (hitBox(x, y, 960, 860, 280, 64)) {
      TPAudio.ui();
      if (G.settingsFrom === 'paused' || G.pausedReturn) { G.pausedReturn = false; G.paused = true; go('paused'); showHud(true); }
      else go('title');
    }
  }

  /* debug / e2e */
  function skipComic() {
    if (!G.comic) return;
    const d = G.comic.done;
    G.comic = null;
    d && d();
  }
  function revealComicPage() {
    if (!G.comic) return;
    const page = G.comic.pages[G.comic.i];
    G.comic.panel = (page && page.panels) ? page.panels.length : 1;
    G.comic.t = 10;
  }
  function forceBoss() {
    if (G.mode !== 'play') return;
    G.stage.waves.forEach(w => w.spawns.forEach(s => { s._done = true; }));
    compactArr(G.entities, (e) => e.type === 'boss');
    G.wave = G.stage.waves.length;
    G.waveT = 2;
    G.hint = null; G.hintT = 0;
    if (!G.boss || !G.entities.some(e => e.type === 'boss')) startBoss();
  }
  function finishIntro() {
    if (G.mode !== 'intro') return;
    go('title');
  }
  function enterPlay() {
    if (G.mode !== 'stagecard' && G.mode !== 'play') {
      // allow forced entry
    }
    if (!G.stage) return;
    const start = () => {
      maybeOfferFullscreen();
      TPAudio.playMusic((window.TPFeel && TPFeel.eraTheme(G.stage)) || G.stage.music || 'woods');
      go('play');
    };
    if (G.assetReady === false) {
      (G._assetsP || ensureStageAssets(G.stageIndex)).then(start);
      return;
    }
    start();
  }
  function skipIntro() { if (G.mode === 'intro') finishIntro(); }
  function skipStageCard() { if (G.mode === 'stagecard') enterPlay(); }
  function ensureBox(e) {
    if (!e || e.type === 'pickup' || e.type === 'shot') return e && e.box;
    const img = spriteFor(e);
    const h0 = e.type === 'boss' ? 600 : 500;
    const w0 = img && img.height ? h0 * (img.width / img.height) : h0 * 0.55;
    const visH = h0 * (e.scale || 1);
    e.box = { x: e.x, y: e.y - visH * 0.50, hw: w0 * (e.scale || 1) * 0.28, hh: visH * 0.42 };
    return e.box;
  }
  function stepSim(dt) {
    dt = clamp(dt, 0, 0.05);
    if (G.slowMo > 0) { G.slowMo -= dt; dt *= 0.38; }
    G.dt = dt; G.t += dt; G.modeT = (G.modeT || 0) + dt;
    if (G.transT > 0) G.transT = Math.max(0, G.transT - dt);
    if (window.TPMotion) TPMotion.tickWipe(G, dt);
    if (G.mode === 'play' && !G.paused) updatePlay(dt);
    else if (G.mode === 'comic' && G.comic && G.comic.ready) G.comic.t += dt;
    else if (G.mode === 'title') G.titleT += dt;
    else if (G.mode === 'intro' && G.modeT > 6.4) finishIntro();
    else if (G.mode === 'stagecard' && G.modeT > 2.5 && G.assetReady !== false) enterPlay();
    tickBossIntro(dt);
  }
  function skipPresentation() {
    if (G.mode === 'intro') skipIntro();
    if (G.mode === 'stagecard') skipStageCard();
    if (G.mode === 'comic') skipComic();
  }

  window.__LG = {
    G, IM, beginStage, go, openComic, skipComic, revealComicPage, forceBoss,
    shoot, setHiding, startStory, skipIntro, skipStageCard, finishIntro, enterPlay,
    applySettingsChrome, diffCfg, ensureBox, stepSim, skipPresentation,
    spawnEntity, setWeapon, tryRhythmReload, startBoss, ensureStageAssets, prefetchStage,
    viewXform, canvasToWorld, worldToCanvas, toWorld,
    toggleFullscreen, tryEnterFullscreen, exitFullscreen, isFs,
    get mode() { return G.mode; },
    get player() { return G.player; },
    get entities() { return G.entities; },
    ASSET_PATHS,
    screenshotState() {
      return {
        mode: G.mode, stage: G.stage && G.stage.id, wave: G.wave, phase: G.phase,
        score: G.player && G.player.score, ammo: G.player && G.player.ammo,
        hiding: G.hiding, n: G.entities.length,
      };
    }
  };

  boot().catch((e) => {
    console.error(e);
    $msg.textContent = 'LOAD ERROR';
  });
})();
