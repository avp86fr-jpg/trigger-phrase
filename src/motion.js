/* Motion, wipes, painted cover, skeletal-style deformation. No brand logos. */
(function (global) {
  const M = {};

  M.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  M.lerp = function (a, b, t) { return a + (b - a) * t; };
  M.easeOutCubic = function (t) { t = M.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  M.easeInCubic = function (t) { t = M.clamp(t, 0, 1); return t * t * t; };
  M.easeInOut = function (t) { t = M.clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  M.easeOutBack = function (t, s) {
    t = M.clamp(t, 0, 1);
    s = s == null ? 1.55 : s;
    return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  };
  M.easeOutQuart = function (t) { t = M.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 4); };

  M.wipeKindFor = function (st) {
    const s = String((st && (st.bg + ' ' + st.kit + ' ' + st.enemy)) || '');
    if (/arcade|garage|lab|hive|mind|nexus|mars|web|foundry|neon|future|suit/.test(s)) return 'glitch';
    if (/rome|egypt|sparta|medusa|keep|nave|ancient|medieval|temple|colosseum/.test(s)) return 'turn';
    return 'tear';
  };

  M.startWipe = function (G, kind, era) {
    G.wipe = { kind: kind || 'tear', t: 0, dur: 0.64, era: era || '' };
    G.transT = 0;
  };

  M.tickWipe = function (G, dt) {
    if (!G.wipe) return;
    G.wipe.t += dt;
    if (G.wipe.t >= G.wipe.dur) G.wipe = null;
  };

  M.drawWipe = function (c, G, W, H) {
    const w = G.wipe;
    if (!w) return;
    const u = M.clamp(w.t / w.dur, 0, 1);
    const amt = u < 0.5 ? u / 0.5 : 1 - (u - 0.5) / 0.5;
    c.save();
    if (w.kind === 'glitch') drawGlitch(c, W, H, u, amt);
    else if (w.kind === 'turn') drawTurn(c, W, H, u, amt);
    else drawTear(c, W, H, u, amt);
    c.restore();
  };

  function drawTear(c, W, H, u, amt) {
    const cx = W * (0.28 + 0.44 * u);
    c.save();
    // soft void slit — no scanline slabs
    const grd = c.createLinearGradient(cx - 200, 0, cx + 200, 0);
    grd.addColorStop(0, 'rgba(4,8,20,0)');
    grd.addColorStop(0.42, 'rgba(6,10,24,' + (0.72 * amt) + ')');
    grd.addColorStop(0.5, 'rgba(8,14,28,' + (0.88 * amt) + ')');
    grd.addColorStop(0.58, 'rgba(6,10,24,' + (0.72 * amt) + ')');
    grd.addColorStop(1, 'rgba(4,8,20,0)');
    c.fillStyle = grd;
    c.fillRect(cx - 220, 0, 440, H);
    // ripple rings
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const ry = ((u * 1.15 + i * 0.16) % 1) * H;
      c.globalAlpha = (0.18 + 0.16 * amt) * (1 - i * 0.08);
      c.strokeStyle = 'rgba(180,230,255,0.9)';
      c.lineWidth = 1.6 + (i === 0 ? 1.2 : 0);
      c.beginPath();
      c.ellipse(cx, ry, 70 + i * 36, 9 + i * 3, 0, 0, Math.PI * 2);
      c.stroke();
    }
    // light streaks
    for (let i = 0; i < 16; i++) {
      const y = ((i / 16 + u * 0.4) % 1) * H;
      const len = 130 + Math.sin(u * 18 + i) * 90;
      const ox = Math.sin(u * 14 + i * 0.9) * 55;
      c.globalAlpha = 0.28 + 0.35 * amt;
      c.strokeStyle = i % 2 ? 'rgba(200,240,255,0.95)' : 'rgba(255,220,130,0.8)';
      c.lineWidth = i % 3 === 0 ? 2.2 : 1.15;
      c.beginPath();
      c.moveTo(cx + ox - len, y);
      c.lineTo(cx + ox + len, y + Math.sin(i + u * 8) * 8);
      c.stroke();
    }
    // jagged cyan/gold edges (no pink)
    c.globalAlpha = Math.min(1, amt * 1.05);
    c.strokeStyle = 'rgba(120,230,255,' + (0.5 + 0.45 * amt) + ')';
    c.lineWidth = 2.4;
    c.beginPath();
    for (let y = 0; y <= H; y += 14) {
      const j = Math.sin(y * 0.05 + u * 14) * 70 * amt + Math.sin(y * 0.19) * 12;
      if (y === 0) c.moveTo(cx + j, y); else c.lineTo(cx + j, y);
    }
    c.stroke();
    c.strokeStyle = 'rgba(255,208,86,' + (0.28 * amt) + ')';
    c.lineWidth = 1.3;
    c.stroke();
    c.restore();
  }

  function drawGlitch(c, W, H, u, amt) {
    // Former pink scanline slab read as a glitch; use the same clean time-tear.
    drawTear(c, W, H, u, amt);
  }

  function drawTurn(c, W, H, u, amt) {
    const x = u < 0.5 ? (u / 0.5) * W : (1 - (u - 0.5) / 0.5) * W;
    c.save();
    // cream page
    const grd = c.createLinearGradient(W - x, 0, W, 0);
    grd.addColorStop(0, 'rgba(255,236,200,0.96)');
    grd.addColorStop(0.85, 'rgba(232,210,170,0.96)');
    grd.addColorStop(1, 'rgba(120,80,50,0.5)');
    c.fillStyle = grd;
    if (u < 0.5) {
      c.fillRect(W - x, 0, x + 4, H);
      // curl lip
      c.fillStyle = 'rgba(255,250,230,0.9)';
      c.beginPath();
      c.moveTo(W - x, 0);
      c.quadraticCurveTo(W - x - 40 * amt, H * 0.5, W - x, H);
      c.lineTo(W - x + 18, H);
      c.lineTo(W - x + 18, 0);
      c.fill();
    } else {
      c.fillRect(0, 0, x, H);
    }
    // halftone dots
    c.globalAlpha = 0.12 * amt;
    c.fillStyle = '#3a2010';
    for (let y = 20; y < H; y += 18) {
      for (let i = 20; i < x; i += 18) {
        c.beginPath();
        c.arc(u < 0.5 ? W - i : i, y, 2.2, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  }

  /* ---- cover hide spring + dip ---- */
  M.hideStep = function (G, dt) {
    const target = G.hiding ? 1 : 0;
    G.hideVel = G.hideVel || 0;
    const k = 16.5, damp = 0.78;
    const acc = (target - (G.hideAmt || 0)) * k - G.hideVel * (2 * Math.sqrt(k) * damp);
    G.hideVel += acc * dt;
    G.hideAmt = (G.hideAmt || 0) + G.hideVel * dt;
    if (!G.hiding && G.hideAmt < 0.012 && Math.abs(G.hideVel) < 0.08) {
      G.hideAmt = 0; G.hideVel = 0;
    }
    G.hideAmt = M.clamp(G.hideAmt, -0.06, 1.14);
    // one-shot dust when taking cover
    if (G.hiding && !G._coverPuffed && G.hideVel > 0.6) {
      G._coverPuffed = true;
      G._coverPuffT = 0.001;
    }
    if (!G.hiding) G._coverPuffed = false;
    if (G._coverPuffT > 0) G._coverPuffT += dt;
  };

  M.coverDip = function (G) {
    const h = Math.max(0, G.hideAmt || 0);
    const wob = Math.sin((G.t || 0) * 14) * Math.min(0.006, Math.abs(G.hideVel || 0) * 0.01);
    return h * 0.034 + wob;
  };

  M.coverKeyFor = function (st) {
    if (!st) return 'woods';
    const bg = String(st.bg || ''), kit = String(st.kit || ''), en = String(st.enemy || '');
    const s = bg + ' ' + kit + ' ' + en;
    const pairs = [
      ['nexus', 'nexus'], ['mars', 'mars'], ['mind', 'mind'], ['hive', 'hive'],
      ['foundry', 'foundry'], ['web', 'energy'], ['nave', 'nave'], ['lab', 'lab'],
      ['garage', 'garage'], ['arcade', 'arcade'], ['stadium', 'stadium'],
      ['casino', 'casino'], ['speakeasy', 'casino'], ['jungle', 'jungle'], ['grove', 'jungle'],
      ['glacier', 'glacier'], ['yacht', 'yacht'], ['brass', 'industrial'],
      ['industrial', 'industrial'], ['keep', 'medieval'], ['medieval', 'medieval'],
      ['medusa', 'temple'], ['temple', 'temple'], ['sparta', 'sparta'],
      ['egypt', 'egypt'], ['bone', 'bone'], ['prehistoric', 'bone'],
      ['rome', 'rome'], ['west', 'west'], ['woods', 'woods']
    ];
    for (let i = 0; i < pairs.length; i++) {
      if (s.indexOf(pairs[i][0]) >= 0) return pairs[i][1];
    }
    if (kit === 'future' || en === 'future') return 'energy';
    return 'woods';
  };

  /* ---- skeletal-style mesh warp ---- */
  M.deformFor = function (e, G) {
    const t = (G && G.t) || 0;
    const bob = e.bob || t * 2;
    const kind = e.kind || '';
    const st = e.state || 'idle';
    const p = {
      breathe: Math.sin(bob * 1.15) * 0.55,
      sway: Math.sin(bob * 0.55) * 0.35,
      weight: Math.sin(bob * 0.4) * 0.28,
      arm: 0,
      armR: 0,
      head: Math.sin(bob * 0.8) * 0.35,
      squat: 0,
      cols: 8,
      rows: 10
    };
    if (st === 'tel' || st === 'shoot') {
      const u = Math.min(1, (e.stateT || 0) / 0.4);
      p.arm = st === 'tel' ? M.easeOutBack(u) * 0.7 : 0.7 - Math.min(1, (e.stateT || 0) / 0.28) * 0.25;
      p.weight = st === 'tel' ? -0.6 : 0.8;
      p.squat = st === 'tel' ? 0.4 * (1 - u) : 0.25;
      p.head = (st === 'tel' ? -0.3 : 0.5) + p.head * 0.4;
    }
    if (st === 'hit') {
      p.squat = 0.7;
      p.weight = -0.8;
      p.head = 0.8;
    }
    if (kind === 'chaos' || kind === 'echo') {
      p.arm += 0.15 + Math.sin(bob * 1.6) * 0.35; // scroll bob
    }
    if (kind === 'hockey_mask') {
      p.armR = p.arm;
      p.arm = Math.sin(bob * 0.9) * 0.2;
    }
    return p;
  };

  M.drawWarped = function (c, img, dx, dy, dw, dh, p) {
    if (!img) return;
    p = p || {};
    const loFi = p.loFi;
    if (loFi) {
      c.drawImage(img, dx, dy, dw, dh);
      return;
    }
    const cols = p.cols || 8, rows = p.rows || 10;
    const srcW = img.width, srcH = img.height;
    const cw = srcW / cols, ch = srcH / rows;
    const dwc = dw / cols, dhc = dh / rows;
    const breathe = p.breathe || 0, sway = p.sway || 0, weight = p.weight || 0;
    const arm = p.arm || 0, armR = p.armR || 0, head = p.head || 0, squat = p.squat || 0;
    for (let j = 0; j < rows; j++) {
      const v = rows <= 1 ? 0 : j / (rows - 1);
      for (let i = 0; i < cols; i++) {
        const u = cols <= 1 ? 0 : i / (cols - 1);
        let ox = 0, oy = 0;
        const torso = Math.max(0, 1 - Math.abs(v - 0.42) / 0.36);
        oy += breathe * torso * -5;
        const upper = 1 - v;
        ox += (sway + weight) * upper * 6;
        if (v < 0.28) { ox += head * 3; oy += head * -2; }
        if (v > 0.22 && v < 0.64 && u < 0.46) { oy += arm * -8; ox += arm * -3; }
        if (v > 0.22 && v < 0.64 && u > 0.54) { oy += armR * -7; ox += armR * 3; }
        oy += squat * (v > 0.45 ? (v - 0.45) * 7 : -v * 3);
        if (v > 0.78) oy += Math.abs(weight) * -3; // plant
        c.drawImage(img, i * cw, j * ch, cw + 1.2, ch + 1.2,
          dx + i * dwc + ox, dy + j * dhc + oy, dwc + 1.8, dhc + 1.8);
      }
    }
  };

  /* Layered cut for continuous limb/scroll motion on top of the warp. */
  M.drawLayered = function (c, img, dx, dy, dw, dh, p) {
    if (!img) return;
    p = p || {};
    const headR = (p.head || 0) * 0.08;
    const armR = (p.arm || 0) * 0.12;
    const sway = ((p.sway || 0) + (p.weight || 0)) * 0.05;
    const breath = (p.breathe || 0) * 8;
    // legs
    c.save();
    c.beginPath();
    c.rect(dx - 8, dy + dh * 0.55, dw + 16, dh * 0.5);
    c.clip();
    c.drawImage(img, dx, dy, dw, dh);
    c.restore();
    // torso
    c.save();
    c.translate(dx + dw * 0.5, dy + dh * 0.55);
    c.rotate(sway);
    c.translate(-dw * 0.5, -dh * 0.55 - breath * 0.4);
    c.beginPath();
    c.rect(dx, dy + dh * 0.22, dw, dh * 0.42);
    c.clip();
    c.drawImage(img, dx, dy + breath * 0.15, dw, dh);
    c.restore();
    // head
    c.save();
    c.translate(dx + dw * 0.5, dy + dh * 0.22);
    c.rotate(headR + sway * 0.5);
    c.translate(-dw * 0.5, -dh * 0.22);
    c.beginPath();
    c.rect(dx, dy - 8, dw, dh * 0.32);
    c.clip();
    c.drawImage(img, dx + (p.head || 0) * 3, dy + breath * 0.5, dw, dh);
    c.restore();
    // weapon / scroll arm (left half, mid)
    c.save();
    c.translate(dx + dw * 0.28, dy + dh * 0.38);
    c.rotate(-armR);
    c.translate(-(dx + dw * 0.28), -(dy + dh * 0.38));
    c.beginPath();
    c.rect(dx - 10, dy + dh * 0.18, dw * 0.55, dh * 0.5);
    c.clip();
    c.drawImage(img, dx, dy + (p.arm || 0) * -8, dw, dh);
    c.restore();
  };

  M.locoTick = function (e, dt, dx) {
    const movingWalk = e.state === 'enter' && (e.enterKind === 'walk' || e.enterKind === 'vehicle' || e.enterKind === 'rail');
    const runner = e.role === 'runner' && e.state !== 'dead' && e.state !== 'enter';
    const sliding = Math.abs(dx || 0) > 0.8 && e.state !== 'dead' && e.state !== 'hit' && e.enterKind !== 'pop' && e.enterKind !== 'drop';
    const dist = Math.abs(dx || 0);
    if (movingWalk || runner || (sliding && e.type !== 'boss')) {
      e.walkDist = (e.walkDist || 0) + dist;
      const stride = 110;
      e.walkPhase = e.walkDist / stride * Math.PI;
      e.loco = M.lerp(e.loco || 0, 1, 1 - Math.pow(0.0008, dt));
    } else {
      // decelerate to a planted phase (nearest k * PI)
      const target = Math.round((e.walkPhase || 0) / Math.PI) * Math.PI;
      const k = 1 - Math.pow(0.0004, dt);
      e.walkPhase = M.lerp(e.walkPhase || 0, target, k);
      e.loco = M.lerp(e.loco || 0, 0, 1 - Math.pow(0.0003, dt));
      if (e.loco < 0.02) e.loco = 0;
    }
    return e.loco || 0;
  };

  M.poseRate = function (e, key) {
    const k = String(key || '');
    if (e && e.type === 'boss') {
      if (k.indexOf('idle') === 0) return 3.2;
      return 3.6;
    }
    if (k.indexOf('walk') === 0) return 80; // snap — no 100ms morph between strides
    if (k === 'aim' || k === 'fire' || k === 'idle' || k === 'hit') return 24;
    if (k.indexOf('death') === 0) return 80;
    return 7;
  };

  M.bossIntroZoom = function (t) {
    // short punch-in, then settle
    if (t < 0.16) return 1.02 + 0.40 * (t / 0.16);
    const u = M.clamp((t - 0.16) / 0.55, 0, 1);
    return M.lerp(1.42, 1.16, M.easeOutCubic(u));
  };

  global.TPMotion = M;
})(window);
