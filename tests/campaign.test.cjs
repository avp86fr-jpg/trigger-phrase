const { test } = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./engine-harness.cjs');

async function ready(options) {
  const e = engine(options);
  const boot = e.boot();
  for (const resolve of e.fontResolvers) resolve();
  await boot;
  return e;
}

test('25 coherent routes preserve IDs and words and provide distinct encounter orders', () => {
  const e = engine();
  const stages = e.context.TPStages.STAGES;
  assert.equal(stages.length, 25);
  assert.equal(new Set(stages.map(s => s.waves.map(w => w.name).join('/'))).size, 25);
  assert.equal(new Set(stages.map(s => s.bossPattern)).size, 6);
  stages.forEach((st, index) => {
    assert.equal(st.id, index + 1);
    assert.equal(st.word, e.context.TPStages.WORDS[index]);
    assert.equal(st.chapter.id, Math.floor(index / 5) + 1);
    assert.ok(st.objective && st.bossCounter);
    assert.ok(st.waves.length >= 3 && st.waves.length <= 4);
    for (const wave of st.waves) {
      assert.ok(wave.name && wave.hint);
      let last = -1;
      for (const spawn of wave.spawns) {
        assert.ok(spawn.t >= last); last = spawn.t;
        assert.ok(spawn.x > 0 && spawn.x < 1 && spawn.y > 0 && spawn.y < 1);
        if (spawn.type === 'civilian') assert.equal(spawn.kind, st.civ);
        if (spawn.type === 'enemy') assert.ok(spawn.tel >= 0.78);
      }
    }
  });
  assert.equal(stages[7].motion, null);
  assert.equal(stages[14].motion, null);
});

test('old saves recover repeated words by stage and retain final-stage completion', () => {
  const e = engine({ save: { unlocked: 25, grades: { 25: 'A' }, words: ['NOT', 'YOUR', 'KEYS'] } });
  assert.equal(e.G.save.recovered.length, 25);
  assert.equal(e.G.save.words.length, 25);
  assert.equal(e.G.save.words[0], 'NOT');
  assert.equal(e.G.save.words[3], 'NOT');
  assert.equal(e.G.save.words[4], 'YOUR');
  assert.equal(e.G.save.words[24], 'CHAOS');
});

test('attack slots stay bounded on Easy, Normal and Hard', async () => {
  const e = await ready();
  e.beginStage(0); await e.G._assetsP;
  for (const [difficulty, limit] of [['easy', 1], ['normal', 2], ['hard', 3]]) {
    e.G.save.difficulty = difficulty;
    e.G.entities = [];
    // Different kinds and distant lanes exercise the global gate rather than proximity.
    const foes = [0.23, 0.75, 0.5, 0.28].map((x, i) => {
      const foe = e.spawnEntity({ type: 'enemy', kind: 'test' + i, x, y: 0.75, role: 'gun', tel: 1 });
      foe.state = 'idle'; return foe;
    });
    for (const foe of foes) if (e.canTelegraph(foe)) foe.state = 'tel';
    assert.equal(foes.filter(foe => foe.state === 'tel').length, limit);
  }
});

test('boss attack families produce different readable patterns, and throwers need a telegraph', async () => {
  const e = await ready();
  e.beginStage(0); await e.G._assetsP;
  e.go('play'); e.forceBoss();
  const boss = e.G.boss;
  e.G.bossPhase = 3;
  for (const [pattern, kind, count] of [['duel', 'blade', 2], ['precision', 'blade', 1], ['barrage', 'blade', 3], ['pulse', 'orb', 2]]) {
    e.G.stage.bossPattern = pattern;
    e.G.entities = [boss]; e.fireEnemy(boss);
    const shots = e.G.entities.filter(x => x.type === 'shot');
    assert.equal(shots.length, count);
    assert.ok(shots.every(x => x.kind === kind));
  }
  e.G.stage.bossPattern = 'echo'; boss.atkN = 0; e.G.entities = [boss];
  e.fireEnemy(boss); assert.equal(e.G.entities[1].kind, 'bolt');
  e.G.entities = [boss]; e.fireEnemy(boss);
  assert.equal(e.G.entities.length, 4);
  assert.ok(e.G.entities.slice(1).every(x => x.kind === 'orb'));
  const thrower = e.spawnEntity({ type: 'enemy', kind: 'woods', role: 'thrower', x: 0.28, y: 0.75 });
  e.G.entities = [thrower]; thrower.state = 'idle';
  for (let i = 0; i < 6; i++) e.updateEntities(0.05);
  assert.equal(e.G.entities.filter(x => x.type === 'shot').length, 0);
});

test('boss guards demand a recovery window or a cyan-core hit', async () => {
  const e = await ready(); e.beginStage(0); await e.G._assetsP;
  e.go('play'); e.forceBoss();
  const boss = e.G.boss, hp = boss.hp;
  boss.state = 'tel';
  e.damageEntity(boss, boss.x, boss.y - 150, false, { dmg: 1 });
  assert.equal(boss.hp, hp);
  e.damageEntity(boss, boss.x, boss.y - 150, false, { dmg: 1, weak: true });
  assert.equal(boss.hp, hp - 2);
  boss.state = 'idle';
  e.damageEntity(boss, boss.x, boss.y - 150, false, { dmg: 1 });
  assert.equal(boss.hp, hp - 3);
});

test('cover reliably blocks incoming projectiles, including slower orbs and blades', async () => {
  const e = await ready();
  e.beginStage(0); await e.G._assetsP;
  for (const kind of ['bolt', 'orb', 'blade']) {
    e.G.entities = []; e.G.hiding = true; e.G.hideAmt = 1;
    const hp = e.G.player.hp;
    e.spawnShot(960, 500, 960, 1015, kind, 400);
    const shot = e.G.entities[0];
    for (let i = 0; i < 100 && shot.alive; i++) e.updateShot(shot, 0.05);
    assert.equal(shot.alive, false);
    assert.equal(e.G.player.hp, hp);
  }
});

test('rescue rewards are awarded once and shield headshots bypass armor', async () => {
  const e = await ready(); e.beginStage(2); await e.G._assetsP;
  e.G.entities = [];
  const civ = e.spawnEntity({ type: 'civilian', kind: 'rome', x: 0.5, y: 0.8 });
  civ.state = 'idle'; civ.leaveIn = 0.01;
  e.updateEntities(0.05); e.updateEntities(0.05);
  assert.equal(e.G.player.rescued, 1); assert.equal(e.G.player.score, 250);
  const guard = e.spawnEntity({ type: 'enemy', kind: 'rome', role: 'shield', x: 0.28, y: 0.75 });
  const hp = guard.hp;
  e.damageEntity(guard, guard.x, guard.y - 150, false, { dmg: 1 });
  assert.equal(guard.hp, hp); assert.equal(guard.shieldHp, 1);
  e.damageEntity(guard, guard.x, guard.y - 250, true, { dmg: 1 });
  assert.equal(guard.hp, hp - 1);
});

test('wave gaps stop the spawn clock, and best grades survive replay', async () => {
  const e = await ready(); e.beginStage(0); await e.G._assetsP;
  e.G.waveRest = 0.85; e.G.waveT = 0;
  e.updateWave(0.05); assert.equal(e.G.waveT, 0);
  e.G.player.shots = 1; e.G.player.hits = 5; e.G.player.accurateShots = 1;
  assert.equal(e.gradeStage(true).acc, 1);
  e.G.save.grades[1] = 'S'; e.G.player.accurateShots = 0;
  e.stageClear();
  assert.equal(e.G.save.grades[1], 'S');
  assert.equal(e.G.save.checkpoint, 1);
});

test('continue exit and all chapter map cards have working hit targets', async () => {
  const e = await ready(); e.beginStage(0); await e.G._assetsP;
  e.go('continue'); e.tapContinue(960, 800);
  assert.equal(e.G.mode, 'result');
  const nodes = e.selectNodes();
  assert.equal(nodes.length, 25);
  nodes.forEach(n => assert.ok(n.x >= 0 && n.x + n.w <= 1920 && n.y + n.h < 1080));
  e.G.save.unlocked = 25; e.go('select');
  e.drawSelect(e.context.document.getElementById('game').getContext('2d'));
  const last = nodes[24]; e.tapSelect(last.x + 20, last.y + 20);
  await e.G._assetsP;
  assert.equal(e.G.stageIndex, 24);
  assert.equal(e.G.mode, 'stagecard');
  e.drawStageCard(e.context.document.getElementById('game').getContext('2d'));
});

for (const difficulty of ['easy', 'normal', 'hard']) test('a scripted pistol run can complete all 25 ' + difficulty + ' stages without skipping waves', async () => {
  const e = await ready();
  e.G.save.difficulty = difficulty;
  let ticks = 0;
  for (let i = 0; i < 25; i++) {
    e.beginStage(i); await e.G._assetsP; e.enterPlay();
    for (let n = 0; n < 2400 && e.G.mode === 'play'; n++) {
      ticks++;
      const incoming = e.G.entities.some(x => x.type === 'shot' && x.alive && x.life < 0.5);
      e.setHiding(e.G.player.ammo === 0 || incoming);
      e.render();
      if (!e.G.hiding && e.G.hideAmt < 0.18) {
        const target = e.G.entities.find(x => x.alive && (x.type === 'enemy' || x.type === 'boss') && x.state !== 'enter' && !(x.type === 'boss' && x.state === 'tel') && x.box);
        if (target) e.shoot(target.box.x, target.box.y - target.box.hh * 0.65);
      }
      e.stepSim(0.05);
    }
    assert.equal(e.G.mode, 'comic', 'stage ' + (i + 1) + ' did not clear');
    assert.ok(e.G.player.hp > 0, 'stage ' + (i + 1) + ' exhausted HP');
    while (e.G.mode === 'comic') e.skipComic();
    assert.ok(e.G.save.recovered.includes(i + 1));
  }
  assert.equal(e.G.save.words.length, 25);
  console.log(difficulty, 'campaign cleared with real pistol cadence in', ticks, 'simulation ticks');
});


test('the drawn cyan core and its hit target use the same world coordinates', async () => {
  const e = await ready(); e.beginStage(5); await e.G._assetsP;
  e.go('play'); e.forceBoss(); e.G.bossPhase = 2;
  e.render();
  const arcs = [];
  const c = e.context.document.getElementById('game').getContext('2d');
  c.arc = (x, y, r) => arcs.push([x, y, r]);
  e.drawWeakPoint(c, e.G.boss);
  assert.equal(arcs.length, 1);
  assert.equal(arcs[0][0], e.G.boss.weak.x);
  assert.equal(arcs[0][1], e.G.boss.weak.y);
});
