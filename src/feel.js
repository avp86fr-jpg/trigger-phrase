/* Premium feel: materials, atmos, haptics, camera helpers. No brand logos. */
(function (global) {
  const F = {};

  F.haptic = function (ms) {
    try {
      const G = global.__LG && global.__LG.G;
      if (G && G.save && G.save.reduced) return;
      if (navigator.vibrate) navigator.vibrate(ms | 0);
    } catch (e) {}
  };

  F.material = function (st) {
    if (!st) return 'stone';
    const bg = String(st.bg || '');
    const kind = (st.motion && st.motion.kind) || '';
    if (bg.indexOf('garage') >= 0 || bg.indexOf('casino') >= 0 || bg.indexOf('arcade') >= 0) return 'glass';
    if (kind === 'yacht' || kind === 'barge' || bg.indexOf('yacht') >= 0) return 'water';
    if (bg === 'woods' || bg === 'west' || bg.indexOf('bone') >= 0 || bg.indexOf('jungle') >= 0 || bg.indexOf('grove') >= 0 || bg.indexOf('keep') >= 0) return 'wood';
    if (bg.indexOf('foundry') >= 0 || bg.indexOf('hive') >= 0 || bg.indexOf('web') >= 0 || kind === 'maglev' || kind === 'steamtrain' || kind === 'rover') return 'metal';
    if (bg.indexOf('glacier') >= 0 || bg.indexOf('ice') >= 0) return 'ice';
    return 'stone';
  };

  F.impactColors = function (mat) {
    return {
      glass: { c: '#c8f0ff', n: 16 },
      water: { c: '#8ad4ff', n: 14 },
      wood: { c: '#d2a06a', n: 12 },
      metal: { c: '#ffe8a0', n: 16 },
      ice: { c: '#d8f4ff', n: 14 },
      stone: { c: '#d8c8a8', n: 10 }
    }[mat] || { c: '#ffd090', n: 10 };
  };

  F.eraTheme = function (st) {
    if (!st) return 'woods';
    if (st.music && st.music !== 'woods' && st.music !== 'west' && st.music !== 'rome' && st.music !== 'title' && st.music !== 'boss') return st.music;
    const bg = String(st.bg || '');
    if (bg.indexOf('yacht') >= 0) return 'yacht';
    if (bg.indexOf('casino') >= 0) return 'casino';
    if (bg.indexOf('egypt') >= 0) return 'egypt';
    if (bg.indexOf('glacier') >= 0) return 'ice';
    if (bg.indexOf('arcade') >= 0 || bg.indexOf('garage') >= 0) return 'neon';
    if (bg.indexOf('brass') >= 0 || bg.indexOf('foundry') >= 0) return 'industrial';
    if (st.kit === 'future' || bg.indexOf('nexus') >= 0 || bg.indexOf('mars') >= 0 || bg.indexOf('hive') >= 0 || bg.indexOf('mind') >= 0) return 'future';
    return st.music || 'woods';
  };

  F.cssFont = function (px, G) {
    const s = Math.max(0.2, (G && G.scale) || 1);
    return Math.max(16, Math.round(px / s));
  };

  F.wrapText = function (c, text, maxW, font) {
    c.font = font;
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let cur = '';
    for (let i = 0; i < words.length; i++) {
      const t = cur ? cur + ' ' + words[i] : words[i];
      if (cur && c.measureText(t).width > maxW) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  function parseHex(hex) {
    if (!hex || hex[0] !== '#' || hex.length < 7) return { r: 240, g: 220, b: 180 };
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    };
  }
  function lumaRgb(c) { return (c.r * 0.3 + c.g * 0.59 + c.b * 0.11) / 255; }
  function satRgb(c) {
    const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
    return max ? (max - min) / max : 0;
  }
  function mixRgb(a, b, t) {
    return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
  }
  function rgbCss(c, a) {
    return 'rgba(' + (c.r|0) + ',' + (c.g|0) + ',' + (c.b|0) + ',' + a + ')';
  }
  // Scene light for shafts: a lifted, desaturated tint. Never a dark or neon accent (e.g. garage red).
  F.shaftTint = function (st) {
    const pal = (st && st.palette) || ['#000', '#333', '#efe4c8'];
    const bg = String((st && st.bg) || '');
    let hi = parseHex(pal[2] || pal[1] || '#efe4c8');
    const mid = parseHex(pal[1] || '#d8d0c0');
    const warm = { r: 242, g: 220, b: 176 };
    const cool = { r: 200, g: 220, b: 240 };
    // Prefer the lighter of pal[1]/pal[2], then wash toward warm/cool white if the accent is punchy.
    let key = lumaRgb(hi) >= lumaRgb(mid) ? hi : mid;
    if (satRgb(key) > 0.42 || lumaRgb(key) < 0.48) {
      const toward = (key.b > key.r + 20) ? cool : warm;
      key = mixRgb(key, toward, 0.78);
    } else {
      key = mixRgb(key, { r: 255, g: 255, b: 255 }, 0.35);
    }
    if (bg.indexOf('garage') >= 0) key = { r: 245, g: 214, b: 160 }; // warm LED strips, not pal[2] red
    if (bg.indexOf('casino') >= 0) key = mixRgb(hi, warm, 0.55);
    if (bg.indexOf('nave') >= 0) key = mixRgb(hi, warm, 0.5);
    if (bg.indexOf('glacier') >= 0 || bg.indexOf('nexus') >= 0 || bg.indexOf('ice') >= 0) key = mixRgb(key, cool, 0.25);
    return key;
  };

  const _beamCache = {};
  function beamTexture(tint) {
    const key = (tint.r|0) + ',' + (tint.g|0) + ',' + (tint.b|0);
    if (_beamCache[key]) return _beamCache[key];
    const cv = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (!cv) return null;
    cv.width = 64; cv.height = 256;
    const g = cv.getContext('2d');
    const across = g.createLinearGradient(0, 0, 64, 0);
    const col = function (a) { return rgbCss(tint, a); };
    across.addColorStop(0, col(0));
    across.addColorStop(0.22, col(0.10));
    across.addColorStop(0.5, col(0.55));
    across.addColorStop(0.78, col(0.10));
    across.addColorStop(1, col(0));
    g.fillStyle = across;
    g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';
    const along = g.createLinearGradient(0, 0, 0, 256);
    along.addColorStop(0, 'rgba(255,255,255,0.85)');
    along.addColorStop(0.35, 'rgba(255,255,255,0.40)');
    along.addColorStop(0.75, 'rgba(255,255,255,0.10)');
    along.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = along;
    g.fillRect(0, 0, 64, 256);
    // cheap grain so stretched shafts don't band
    g.globalCompositeOperation = 'source-over';
    try {
      const img = g.getImageData(0, 0, 64, 256);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 6) continue;
        const n = ((i * 17 + d[i] * 11) % 11) - 5;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      g.putImageData(img, 0, 0);
    } catch (err) {}
    _beamCache[key] = cv;
    return cv;
  }

  F.drawLighting = function (c, st, W, H) {
    const pal = (st && st.palette) || ['#000', '#333', '#fff'];
    c.save();
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, shade(pal[0], 0.22));
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, shade(pal[1] || pal[0], 0.28));
    c.fillStyle = g;
    c.fillRect(-120, -80, W + 240, H + 160);
    const v = c.createRadialGradient(W / 2, H * 0.55, H * 0.2, W / 2, H * 0.55, H * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.22)');
    c.fillStyle = v;
    c.fillRect(-120, -80, W + 240, H + 160);

    const tint = F.shaftTint(st);
    const tnow = (global.__LG && global.__LG.G && global.__LG.G.t) || 0;
    const tex = beamTexture(tint);
    const reduced = !!(global.__LG && global.__LG.G && (global.__LG.G.loFi || (global.__LG.G.save && global.__LG.G.save.reduced)));
    const bg = String((st && st.bg) || '');
    const isGarage = bg.indexOf('garage') >= 0;
    const n = reduced ? (isGarage ? 4 : 3) : (isGarage ? 7 : 5);
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const srcX = (isGarage ? 90 : 140) + i * (W / n) + Math.sin(tnow * 0.12 + i * 1.3) * (isGarage ? 22 : 36);
      const ang = (isGarage ? 0.10 : 0.18) + i * (isGarage ? 0.028 : 0.035) + Math.sin(tnow * 0.08 + i) * 0.03;
      const len = H * (isGarage ? 1.25 : 1.15);
      const wid = (isGarage ? 150 : 90) + (i % 3) * (isGarage ? 40 : 28);
      c.save();
      c.translate(srcX, isGarage ? -50 : -30);
      c.rotate(ang);
      if (tex) {
        c.globalCompositeOperation = 'lighter';
        c.save();
        c.globalAlpha = (isGarage ? 0.32 : 0.10) + (i % 2) * (isGarage ? 0.08 : 0.03);
        c.drawImage(tex, -wid / 2, 0, wid, len);
        c.globalAlpha = isGarage ? 0.18 : 0.05;
        c.drawImage(tex, -wid * 0.22, 0, wid * 0.44, len);
        if (isGarage) {
          c.globalAlpha = 0.16;
          c.drawImage(tex, -wid * 0.10, 0, wid * 0.20, len * 0.9);
        }
        c.restore();
      }
      if (isGarage) {
        // soft ceiling bloom at the beam origin
        const bloom = c.createRadialGradient(0, 0, 4, 0, 0, 90);
        bloom.addColorStop(0, rgbCss(tint, 0.45));
        bloom.addColorStop(0.4, rgbCss(tint, 0.14));
        bloom.addColorStop(1, rgbCss(tint, 0));
        c.fillStyle = bloom;
        c.beginPath(); c.arc(0, 0, 90, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    c.globalCompositeOperation = 'lighter';
    const dustN = reduced ? (isGarage ? 16 : 8) : (isGarage ? 38 : 22);
    for (let i = 0; i < dustN; i++) {
      const mx = (i * 197 + tnow * (isGarage ? 16 : 10)) % (W + 80) - 40;
      const my = ((i * 89 + tnow * (isGarage ? 22 : 14)) % (H * 0.82));
      const a = (isGarage ? 0.10 : 0.04) + 0.07 * (0.5 + 0.5 * Math.sin(tnow * 1.4 + i));
      c.fillStyle = rgbCss(tint, a);
      c.beginPath(); c.arc(mx, my, (isGarage ? 1.4 : 1.1) + (i % 3) * 0.6, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    c.restore();
  };

  function shade(hex, a) {
    if (!hex || hex[0] !== '#' || hex.length < 7) return 'rgba(0,0,0,' + a + ')';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  F.drawFgProps = function (c, st, W, H, t, camX) {
    if (!st) return;
    const kind = (st.motion && st.motion.kind) || st.bg || '';
    const pal = st.palette || ['#0a0a0a', '#333', '#aaa'];
    const xOff = (camX || 0) * 90;
    c.save();
    c.globalAlpha = 0.82;
    // silhouetted foreground cover — crates, rail, reeds, tables
    if (kind === 'woods' || String(st.bg).indexOf('jungle') >= 0 || String(st.bg).indexOf('grove') >= 0) {
      c.fillStyle = pal[0];
      for (let i = 0; i < 5; i++) {
        const x = -40 - xOff + i * 460 + Math.sin(t * 0.4 + i) * 8;
        c.beginPath();
        c.moveTo(x, H);
        c.quadraticCurveTo(x + 40, H - 160, x + 20, H - 240);
        c.quadraticCurveTo(x + 70, H - 120, x + 90, H);
        c.fill();
      }
    } else if (kind === 'yacht' || kind === 'barge') {
      c.fillStyle = pal[1];
      c.fillRect(-20, H - 70, W + 40, 80);
      c.fillStyle = pal[2];
      c.globalAlpha = 0.35;
      c.fillRect(0, H - 78, W, 8);
    } else if (kind === 'west_ride' || kind === 'steamtrain' || kind === 'maglev' || kind === 'highway' || kind === 'street' || kind === 'rover') {
      c.fillStyle = pal[0];
      c.fillRect(-40, H - 64, W + 80, 80);
      c.fillStyle = pal[2];
      c.globalAlpha = 0.4;
      for (let i = 0; i < 10; i++) c.fillRect(i * 220 - xOff * 1.4, H - 52, 80, 8);
    } else if (String(st.bg).indexOf('casino') >= 0) {
      // table edges
      c.fillStyle = '#1a0c10';
      c.fillRect(-20, H - 90, W + 40, 100);
      c.strokeStyle = pal[2];
      c.globalAlpha = 0.45; c.lineWidth = 3;
      c.beginPath(); c.moveTo(40, H - 88); c.lineTo(W - 40, H - 88); c.stroke();
    } else if (String(st.bg).indexOf('garage') >= 0) {
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, H - 54, W, 60);
      c.fillStyle = 'rgba(220,40,40,0.5)';
      c.fillRect(0, H - 58, W, 4);
    } else {
      c.fillStyle = pal[0];
      c.globalAlpha = 0.55;
      c.fillRect(-20, H - 48, W + 40, 60);
    }
    c.restore();
  };

  F.drawAtmosRich = function (c, st, W, H, t, loFi) {
    if (loFi || !st) return;
    const bg = String(st.bg || '');
    const kind = (st.motion && st.motion.kind) || bg;
    c.save();
    // birds
    if (kind === 'woods' || bg.indexOf('jungle') >= 0 || bg === 'rome' || bg.indexOf('sparta') >= 0 || bg.indexOf('keep') >= 0) {
      c.strokeStyle = 'rgba(20,20,20,0.55)';
      c.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const x = ((t * 40 + i * 380) % (W + 200)) - 80;
        const y = 80 + (i * 53) % 180 + Math.sin(t * 2 + i) * 8;
        const flap = Math.sin(t * 8 + i) * 7;
        c.beginPath();
        c.moveTo(x - 10, y + flap);
        c.lineTo(x, y);
        c.lineTo(x + 10, y + flap);
        c.stroke();
      }
    }
    // rain / ice crystals
    if (bg.indexOf('glacier') >= 0 || bg.indexOf('nave') >= 0) {
      c.strokeStyle = bg.indexOf('nave') >= 0 ? 'rgba(255,180,180,0.28)' : 'rgba(200,230,255,0.4)';
      c.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const x = ((t * 180 + i * 97) % (W + 40));
        const y = ((t * 420 + i * 53) % (H + 20));
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (bg.indexOf('nave') >= 0 ? 0 : 6), y + 16); c.stroke();
      }
    }
    // casino chips + flicker
    if (bg.indexOf('casino') >= 0) {
      const flick = 0.55 + 0.45 * Math.abs(Math.sin(t * 9));
      c.fillStyle = 'rgba(255,220,140,' + (0.08 * flick) + ')';
      c.fillRect(0, 0, W, H * 0.4);
      for (let i = 0; i < 10; i++) {
        const x = ((t * 30 + i * 190) % (W + 40));
        const y = 120 + ((t * 40 + i * 70) % 200);
        c.fillStyle = i % 2 ? 'rgba(200,40,40,0.55)' : 'rgba(240,220,140,0.55)';
        c.beginPath(); c.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2); c.fill();
      }
    }
    // garage / foundry sparks already partly in drawAtmos; add flicker lamps
    if (bg.indexOf('garage') >= 0 || bg.indexOf('foundry') >= 0 || bg.indexOf('lab') >= 0) {
      const flick = 0.4 + 0.6 * (Math.sin(t * 17) > 0.7 ? 1 : Math.abs(Math.sin(t * 3)));
      c.fillStyle = 'rgba(255,180,80,' + (0.05 * flick) + ')';
      c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,160,60,0.7)';
      for (let i = 0; i < 8; i++) {
        const x = (Math.sin(t * 1.2 + i) * 0.5 + 0.5) * W;
        const y = H * 0.3 + ((-t * 90 + i * 80) % (H * 0.5));
        c.fillRect(x, y, 2, 7);
      }
    }
    // yacht / barge waves already in deck; extra sparkle
    if (kind === 'yacht' || kind === 'barge') {
      c.fillStyle = 'rgba(220,240,255,0.25)';
      for (let i = 0; i < 12; i++) {
        const x = ((t * 80 + i * 160) % (W + 60));
        const y = H * 0.72 + Math.sin(t * 2 + i) * 10;
        c.beginPath(); c.ellipse(x, y, 50 + (i % 3) * 12, 6, 0, 0, Math.PI * 2); c.fill();
      }
    }
    // stadium / casino / rome crowds as bobbing ovals
    if (bg.indexOf('stadium') >= 0 || bg === 'rome' || bg.indexOf('sparta') >= 0) {
      c.fillStyle = 'rgba(0,0,0,0.28)';
      for (let i = 0; i < 16; i++) {
        const x = 40 + i * 120;
        const y = H * 0.22 + Math.sin(t * 3 + i) * 4;
        c.beginPath(); c.ellipse(x, y, 16, 20, 0, 0, Math.PI * 2); c.fill();
      }
    }
    // drifting smoke for west / brass / woods
    if (kind === 'west_ride' || kind === 'steamtrain' || kind === 'woods' || bg.indexOf('brass') >= 0) {
      for (let i = 0; i < 5; i++) {
        const x = ((t * 22 + i * 400) % (W + 300)) - 120;
        const y = H * 0.28 + ((i * 70) % 180);
        const r = 80 + (i % 3) * 40;
        const fg = c.createRadialGradient(x, y, 6, x, y, r);
        fg.addColorStop(0, 'rgba(200,200,200,0.10)');
        fg.addColorStop(1, 'rgba(200,200,200,0)');
        c.fillStyle = fg;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  };

  global.TPFeel = F;
})(window);
