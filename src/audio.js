/* Original synthesized arcade soundtrack and SFX. No sampled commercial music. */
(function (global) {
  const A = {
    ctx: null,
    muted: false,
    master: null,
    sfxG: null,
    musG: null,
    musicTimer: 0,
    theme: 'woods',
    playing: false,
    _beat: 0,
    _t0: 0,
    unlocked: false,
  };

  function ctx() {
    if (!A.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      A.ctx = new C();
      A.master = A.ctx.createGain(); A.master.gain.value = 0.9; A.master.connect(A.ctx.destination);
      A.sfxG = A.ctx.createGain(); A.sfxG.gain.value = 0.85; A.sfxG.connect(A.master);
      A.musG = A.ctx.createGain(); A.musG.gain.value = 0.28; A.musG.connect(A.master);
    }
    return A.ctx;
  }

  function applyMute() {
    A.applyMuteGain ? A.applyMuteGain() : (A.master && (A.master.gain.value = A.muted ? 0 : 0.9));
  }

  A.unlock = function () {
    const c = ctx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    A.unlocked = true;
  };

  A.toggleMute = function () {
    A.muted = !A.muted;
    applyMute();
    try { localStorage.setItem('mw_tp_mute', A.muted ? '1' : '0'); } catch (e) {}
    return A.muted;
  };

  A.setMuted = function (m) {
    A.muted = !!m;
    applyMute();
  };

  function envGain(t, a, h, d, vol) {
    const c = ctx();
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + a + h);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + d);
    return g;
  }

  function osc(type, freq, t, a, h, d, vol, dest, slide) {
    const c = ctx();
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + a + h + d);
    const g = envGain(t, a, h, d, vol);
    o.connect(g); g.connect(dest || A.sfxG);
    o.start(t); o.stop(t + a + h + d + 0.02);
    return o;
  }

  function noise(t, a, h, d, vol, dest, bp, q) {
    const c = ctx();
    const n = c.createBufferSource();
    const len = Math.max(1, Math.floor(c.sampleRate * (a + h + d + 0.05)));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    let node = n;
    if (bp) {
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = q || 1.2;
      n.connect(f); node = f;
    }
    const g = envGain(t, a, h, d, vol);
    node.connect(g); g.connect(dest || A.sfxG);
    n.start(t); n.stop(t + a + h + d + 0.02);
  }

  A.shot = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    noise(t, 0.001, 0.02, 0.14, 0.7, A.sfxG, 1800, 0.7);
    osc('sawtooth', 280, t, 0.001, 0.01, 0.12, 0.25, A.sfxG, 60);
    osc('square', 880, t, 0.001, 0.005, 0.04, 0.12, A.sfxG, 200);
  };
  A.dry = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    osc('square', 90, t, 0.001, 0.01, 0.06, 0.2, A.sfxG, 40);
    noise(t, 0.001, 0.01, 0.05, 0.15, A.sfxG, 2000, 0.5);
  };
  A.reload = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    osc('square', 420, t, 0.001, 0.01, 0.04, 0.12, A.sfxG, 180);
    osc('triangle', 240, t + 0.06, 0.001, 0.02, 0.05, 0.1, A.sfxG, 140);
  };
  A.hit = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    noise(t, 0.001, 0.02, 0.1, 0.4, A.sfxG, 900, 0.8);
    osc('sawtooth', 220, t, 0.001, 0.01, 0.08, 0.18, A.sfxG, 70);
  };
  A.bossHit = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    noise(t, 0.002, 0.04, 0.18, 0.5, A.sfxG, 500, 0.7);
    osc('sawtooth', 140, t, 0.002, 0.03, 0.2, 0.28, A.sfxG, 50);
  };
  A.death = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    osc('sawtooth', 300, t, 0.01, 0.05, 0.28, 0.2, A.sfxG, 50);
    noise(t, 0.005, 0.05, 0.25, 0.35, A.sfxG, 700, 0.6);
  };
  A.civilian = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    osc('square', 520, t, 0.01, 0.04, 0.25, 0.18, A.sfxG, 180);
    osc('square', 390, t + 0.08, 0.01, 0.04, 0.28, 0.16, A.sfxG, 120);
  };
  A.hurt = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    osc('sawtooth', 180, t, 0.002, 0.04, 0.3, 0.3, A.sfxG, 50);
    noise(t, 0.002, 0.05, 0.25, 0.4, A.sfxG, 300, 0.5);
  };
  A.hide = function () {
    const c = ctx(); if (!c || A.muted) return;
    osc('triangle', 140, c.currentTime, 0.005, 0.02, 0.1, 0.1, A.sfxG, 80);
  };
  A.ui = function () {
    const c = ctx(); if (!c || A.muted) return;
    osc('triangle', 660, c.currentTime, 0.001, 0.02, 0.08, 0.16, A.sfxG, 880);
  };
  A.sting = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t0 = c.currentTime;
    osc('sawtooth', 98, t0, 0.002, 0.04, 0.18, 0.22, A.sfxG, 55);
    noise(t0, 0.001, 0.04, 0.2, 0.35, A.sfxG, 400, 0.6);
    [392, 523, 784, 1046].forEach((f, i) => {
      osc('triangle', f, t0 + 0.04 + i * 0.07, 0.005, 0.08, 0.28, 0.2 - i * 0.03, A.sfxG);
    });
  };
  A.combo = function (n) {
    const c = ctx(); if (!c || A.muted) return;
    const t0 = c.currentTime;
    const f = 440 + Math.min(8, n) * 80;
    osc('square', f, t0, 0.002, 0.04, 0.12, 0.18, A.sfxG, f * 1.5);
    osc('triangle', f * 2, t0 + 0.04, 0.002, 0.05, 0.16, 0.12, A.sfxG);
  };
  A.fanfare = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    [0, 0.12, 0.24, 0.42].forEach((dt, i) => {
      const f = [392, 494, 587, 784][i];
      osc('square', f, t + dt, 0.01, 0.08, 0.18, 0.16, A.sfxG);
      osc('triangle', f * 2, t + dt, 0.01, 0.06, 0.16, 0.08, A.sfxG);
    });
  };
  A.word = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    osc('triangle', 523, t, 0.01, 0.1, 0.35, 0.2, A.sfxG);
    osc('triangle', 784, t + 0.12, 0.01, 0.12, 0.4, 0.18, A.sfxG);
  };
  A.enemyShot = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    noise(t, 0.001, 0.02, 0.1, 0.28, A.sfxG, 1400, 0.8);
    osc('square', 420, t, 0.001, 0.01, 0.08, 0.1, A.sfxG, 90);
  };
  A.pickup = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    osc('sine', 880, t, 0.001, 0.04, 0.1, 0.16, A.sfxG, 1320);
    osc('sine', 1320, t + 0.07, 0.001, 0.05, 0.12, 0.14, A.sfxG, 1760);
  };

  const SCALES = {
    woods: [110, 130.8, 146.8, 164.8, 196, 207.6, 246.9],
    west: [130.8, 146.8, 164.8, 196, 220, 246.9, 293.7],
    rome: [98, 116.5, 130.8, 146.8, 196, 233.1, 261.6],
    boss: [82.4, 98, 103.8, 123.5, 146.8, 155.6, 196],
    title: [130.8, 155.6, 174.6, 196, 233.1, 261.6, 311.1],
    yacht: [123.5, 146.8, 164.8, 185, 220, 246.9, 277.2],
    casino: [110, 138.6, 164.8, 174.6, 220, 246.9, 329.6],
    egypt: [98, 110, 130.8, 146.8, 174.6, 196, 233.1],
    ice: [123.5, 138.6, 164.8, 196, 207.6, 246.9, 311.1],
    neon: [146.8, 164.8, 185, 220, 246.9, 277.2, 329.6],
    industrial: [92.5, 110, 123.5, 146.8, 164.8, 185, 220],
    future: [130.8, 155.6, 185, 196, 233.1, 277.2, 370],
    default: [110, 130.8, 146.8, 164.8, 196, 220, 261.6],
  };

  function tickMusic() {
    if (!A.playing || !A.ctx) return;
    const c = A.ctx;
    const now = c.currentTime;
    const BPM = { boss:132, title:88, rome:100, west:96, yacht:104, casino:118, egypt:90, ice:86, neon:126, industrial:112, future:120 };
    const bpm = BPM[A.theme] || 108;
    const beat = 60 / bpm;
    if (A.musicTimer < now + 0.08) A.musicTimer = now;
    const scale = SCALES[A.theme] || SCALES.default;
    // schedule ~1s ahead
    while (A.musicTimer < now + 0.9) {
      const t = A.musicTimer;
      const n = A._beat;
      // kick
      if (n % 2 === 0) osc('sine', 80, t, 0.001, 0.03, 0.12, 0.55, A.musG, 36);
      // hat
      noise(t, 0.001, 0.01, 0.04, n % 2 ? 0.07 : 0.12, A.musG, 8000, 0.6);
      // bass
      if (n % 4 === 0) {
        const f = scale[0] * (A.theme === 'boss' && (n % 8 === 4) ? 0.75 : 1);
        osc('sawtooth', f, t, 0.01, 0.08, 0.28, 0.22, A.musG);
      }
      // melody
      if (n % 2 === 1) {
        const note = scale[(n * 3 + (A.theme === 'west' ? 2 : 1)) % scale.length] * (n % 16 === 7 ? 2 : 1);
        osc('triangle', note, t, 0.01, 0.06, 0.18, A.theme === 'title' ? 0.16 : 0.11, A.musG);
      }
      if (A.theme === 'rome' && n % 8 === 0) osc('square', scale[4], t, 0.01, 0.05, 0.2, 0.08, A.musG);
      if (A.theme === 'yacht' && n % 8 === 2) osc('sine', scale[5], t, 0.02, 0.08, 0.22, 0.07, A.musG);
      if (A.theme === 'casino' && n % 4 === 0) osc('triangle', scale[3]*2, t, 0.001, 0.03, 0.08, 0.07, A.musG);
      if (A.theme === 'egypt' && n % 8 === 0) osc('sawtooth', scale[2], t, 0.02, 0.1, 0.3, 0.07, A.musG);
      if (A.theme === 'ice' && n % 8 === 4) osc('sine', scale[6], t, 0.04, 0.12, 0.4, 0.06, A.musG);
      if (A.theme === 'neon' && n % 2 === 0) osc('square', scale[(n*2)%scale.length], t, 0.001, 0.02, 0.08, 0.05, A.musG);
      if (A.theme === 'industrial' && n % 4 === 2) noise(t, 0.001, 0.02, 0.06, 0.08, A.musG, 400, 0.8);
      if (A.theme === 'future' && n % 8 === 0) osc('sawtooth', scale[4]*2, t, 0.01, 0.05, 0.18, 0.06, A.musG, scale[1]);
      A._beat++;
      A.musicTimer += beat;
    }
    A._raf = requestAnimationFrame(tickMusic);
  }

  A.playMusic = function (theme) {
    ctx();
    A.theme = theme || 'woods';
    A.playing = true;
    A._beat = 0;
    if (A.ctx) A.musicTimer = A.ctx.currentTime;
    if (A._raf) cancelAnimationFrame(A._raf);
    tickMusic();
  };
  A.stopMusic = function () {
    A.playing = false;
    if (A._raf) cancelAnimationFrame(A._raf);
  };

  A.impactMetal = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    noise(t, 0.001, 0.02, 0.08, 0.22, A.sfxG, 2800, 0.7);
    osc('square', 720, t, 0.001, 0.01, 0.06, 0.08, A.sfxG, 140);
  };
  A.impactGlass = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    noise(t, 0.001, 0.01, 0.12, 0.2, A.sfxG, 5000, 0.9);
    osc('sine', 1800, t, 0.001, 0.02, 0.14, 0.08, A.sfxG, 900);
  };
  A.impactWood = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    noise(t, 0.001, 0.02, 0.1, 0.2, A.sfxG, 700, 0.8);
    osc('triangle', 180, t, 0.001, 0.02, 0.1, 0.1, A.sfxG, 70);
  };
  A.impactWater = function () {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    noise(t, 0.01, 0.04, 0.16, 0.16, A.sfxG, 900, 0.5);
    osc('sine', 320, t, 0.01, 0.04, 0.18, 0.06, A.sfxG, 80);
  };
  A.bark = function (who) {
    const c = ctx(); if (!c || A.muted) return;
    const t = c.currentTime;
    const vera = who === 'vera';
    const f0 = vera ? 260 : 140;
    osc('sawtooth', f0, t, 0.01, 0.04, 0.1, 0.09, A.sfxG, f0 * 1.3);
    osc('sawtooth', f0 * 1.5, t + 0.07, 0.01, 0.05, 0.11, 0.07, A.sfxG, f0 * 0.8);
    noise(t, 0.01, 0.04, 0.08, 0.05, A.sfxG, vera ? 1800 : 700, 0.7);
  };
  A.volMaster = 1; A.volSfx = 1; A.volMus = 1;
  A.setVolumes = function (master, sfx, mus) {
    if (master != null) A.volMaster = Math.max(0, Math.min(1, master));
    if (sfx != null) A.volSfx = Math.max(0, Math.min(1, sfx));
    if (mus != null) A.volMus = Math.max(0, Math.min(1, mus));
    if (A.master && !A.muted) A.master.gain.value = 0.9 * A.volMaster;
    else if (A.master && A.muted) A.master.gain.value = 0;
    if (A.sfxG) A.sfxG.gain.value = 0.85 * A.volSfx;
    if (A.musG) A.musG.gain.value = 0.28 * A.volMus;
  };
  A.applyMuteGain = function () {
    if (A.master) A.master.gain.value = A.muted ? 0 : 0.9 * (A.volMaster || 1);
  };

  try { if (localStorage.getItem('mw_tp_mute') === '1') A.muted = true; } catch (e) {}

  global.TPAudio = A;
})(window);
