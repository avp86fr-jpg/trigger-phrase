/* Multi-panel comic-strip renderer. No brand logos. */
(function (global) {
  const GUTTER = 14;
  const MARGIN = 56;
  const TOP = 48;
  const BOTTOM = 70;

  function paper(c, W, H) {
    c.fillStyle = '#0e0d11';
    c.fillRect(0, 0, W, H);
    // page
    c.fillStyle = '#1a1816';
    c.fillRect(28, 22, W - 56, H - 44);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f3e6cf');
    g.addColorStop(1, '#e4d3b4');
    c.fillStyle = g;
    c.fillRect(40, 32, W - 80, H - 64);
    // inner shadow
    c.strokeStyle = 'rgba(60,40,20,0.25)';
    c.lineWidth = 2;
    c.strokeRect(48, 40, W - 96, H - 80);
  }

  function halftone(c, x, y, w, h, pat) {
    if (!pat) return;
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.globalAlpha = 0.1;
    c.fillStyle = pat;
    c.fillRect(x, y, w, h);
    c.restore();
  }

  function viewScale() {
    const G = window.__LG && window.__LG.G;
    // CSS pixels per design pixel — never use the canvas backing store
    // (which now matches the full visualViewport, not 1920 or 1080).
    if (G && G.scale) return G.scale;
    const el = document.getElementById('game');
    const dw = (G && G.designW) || 1920;
    const w = el ? el.getBoundingClientRect().width : dw;
    const play = (G && G.playW && G.designW) ? (G.playW / (window.devicePixelRatio || 1)) / G.designW : (w / dw);
    return Math.max(0.2, play);
  }
  function portraitStack() {
    return !!(window.__LG && window.__LG.G && window.__LG.G.portraitComic);
  }
  function focusPanel() {
    // Phone portrait uses a stacked 9:16 canvas (one tall panel). Other tight scales still page one panel at a time.
    return portraitStack() || viewScale() < 0.42;
  }
  function typePx(px) {
    const s = viewScale();
    if (portraitStack()) {
      // Target ~22–26 CSS px on a ~390-wide phone (canvas is 1080 wide).
      return Math.max(36, Math.round((px < 18 ? 20 : px) / Math.max(0.34, s) * 0.85));
    }
    if (focusPanel()) return Math.max(28, Math.round(px / Math.max(0.28, s)));
    if (window.TPFeel && window.__LG && window.__LG.G) return TPFeel.cssFont(px, window.__LG.G);
    return Math.max(16, Math.round(px / s));
  }
  function wrap(c, text, maxW, font) {
    if (window.TPFeel) return TPFeel.wrapText(c, text, maxW, font);
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
  }

  function bgFor(key, IM) {
    if (!key) return null;
    if (key === 'woods') return IM.bg_woods;
    if (key === 'west') return IM.bg_west;
    if (key === 'rome') return IM.bg_rome;
    if (key === 'rift') return IM.rift;
    if (IM['bg_' + key]) return IM['bg_' + key];
    return IM[key] || null;
  }

  function charImg(key, IM) {
    if (!key) return null;
    if (key === 'vera_mic') return IM.vera_mic;
    if (key === 'vera_point') return IM.vera_point;
    if (key === 'vera_cross') return IM.vera_cross;
    if (key === 'chaos') return IM.chaos;
    if (IM[key]) return IM[key];
    if (key.indexOf('boss_') === 0 && IM[key]) return IM[key];
    // fallback portrait
    const id = key.replace(/^boss_/, '');
    return IM['p_' + id] || null;
  }

  function fillPanelBg(c, x, y, w, h, panel, IM) {
    if (panel.bg === 'paper') {
      const g = c.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#1a120c');
      g.addColorStop(1, '#0c0a08');
      c.fillStyle = g;
      c.fillRect(x, y, w, h);
      return;
    }
    if (panel.bg === 'dark' || panel.bg === 'studio') {
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#16141c');
      g.addColorStop(1, '#08070b');
      c.fillStyle = g;
      c.fillRect(x, y, w, h);
      return;
    }
    const img = bgFor(panel.bg, IM);
    if (img) {
      // cover-crop
      const s = Math.max(w / img.width, h / img.height) * (panel.bgScale || 1);
      const dw = img.width * s, dh = img.height * s;
      const ay = panel.bgAlign === 'top' ? 0 : panel.bgAlign === 'bottom' ? 1 : 0.5;
      const ax = panel.bgX === 'left' ? 0 : panel.bgX === 'right' ? 1 : 0.5;
      let ox = x + (w - dw) * ax, oy = y + (h - dh) * ay;
      if (panel.bgAlign === 'face') oy = y - dh * 0.16;
      c.drawImage(img, ox, oy, dw, dh);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(x, y, w, h);
    } else {
      c.fillStyle = '#16141c';
      c.fillRect(x, y, w, h);
    }
  }

  // Source-image face boxes (normalized 0–1). Helmets and masks count.
  const FACE_PLATES = {
    comic_news:   [{ x: 0.36, y: 0.00, w: 0.30, h: 0.44, cx: 0.50, cy: 0.20 }],
    comic_loss:   [{ x: 0.06, y: 0.02, w: 0.36, h: 0.52, cx: 0.22, cy: 0.22 }],
    comic_echo:   [{ x: 0.46, y: 0.00, w: 0.28, h: 0.52, cx: 0.60, cy: 0.22 }],
    comic_pocket: [{ x: 0.16, y: 0.00, w: 0.34, h: 0.52, cx: 0.32, cy: 0.20 }],
    comic_tab:    [{ x: 0.38, y: 0.70, w: 0.24, h: 0.28, cx: 0.48, cy: 0.86 }]
  };

  function bgCrop(panel, x, y, w, h, IM) {
    const img = bgFor(panel.bg, IM);
    if (!img) return null;
    const s = Math.max(w / img.width, h / img.height) * (panel.bgScale || 1);
    const dw = img.width * s, dh = img.height * s;
    const ay = panel.bgAlign === 'top' ? 0 : panel.bgAlign === 'bottom' ? 1 : 0.5;
    const ax = panel.bgX === 'left' ? 0 : panel.bgX === 'right' ? 1 : 0.5;
    let ox = x + (w - dw) * ax, oy = y + (h - dh) * ay;
    if (panel.bgAlign === 'face') oy = y - dh * 0.16;
    return { ox: ox, oy: oy, dw: dw, dh: dh, img: img };
  }

  function charBox(panel, x, y, w, h, IM) {
    const img = charImg(panel.char, IM);
    if (!img) return null;
    const align = panel.charAlign || 'right';
    const isPortrait = img.width > 200 && img.width === img.height;
    let ih, iw;
    if (isPortrait) { ih = h * 0.92; iw = ih; }
    else { ih = h * 1.08; iw = img.width * (ih / img.height); }
    let cx;
    if (align === 'left') cx = x + w * 0.02;
    else if (align === 'center') cx = x + (w - iw) / 2;
    else cx = x + w - iw - w * 0.02;
    const cy = y + h - ih * 0.92;
    return { cx: cx, cy: cy, iw: iw, ih: ih, img: img };
  }

  function clipRect(r, x, y, w, h) {
    const x0 = Math.max(x, r.x), y0 = Math.max(y, r.y);
    const x1 = Math.min(x + w, r.x + r.w), y1 = Math.min(y + h, r.y + r.h);
    if (x1 - x0 < 4 || y1 - y0 < 4) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: r.cx, cy: r.cy };
  }

  function faceRects(panel, x, y, w, h, IM) {
    const out = [];
    const crop = bgCrop(panel, x, y, w, h, IM);
    const src = FACE_PLATES[panel.bg];
    if (crop && src) {
      src.forEach((f) => {
        out.push({
          x: crop.ox + f.x * crop.dw,
          y: crop.oy + f.y * crop.dh,
          w: f.w * crop.dw,
          h: f.h * crop.dh,
          cx: crop.ox + (f.cx != null ? f.cx : f.x + f.w / 2) * crop.dw,
          cy: crop.oy + (f.cy != null ? f.cy : f.y + f.h / 2) * crop.dh
        });
      });
    }
    (panel.faces || []).forEach((f) => {
      out.push({ x: x + f[0] * w, y: y + f[1] * h, w: f[2] * w, h: f[3] * h, cx: x + (f[0] + f[2] / 2) * w, cy: y + (f[1] + f[3] / 2) * h });
    });
    const cb = panel.char ? charBox(panel, x, y, w, h, IM) : null;
    if (cb) {
      const hw = cb.iw * 0.58, hh = cb.ih * 0.34;
      const hx = cb.cx + (cb.iw - hw) / 2, hy = cb.cy + cb.ih * 0.02;
      out.push({ x: hx, y: hy, w: hw, h: hh, cx: hx + hw / 2, cy: hy + hh * 0.42 });
    }
    return out.map((r) => clipRect(r, x, y, w, h)).filter(Boolean);
  }

  function speakerAim(faces, panel, x, y, w, h) {
    if (faces && faces.length) {
      const f = faces[0];
      return { x: f.cx != null ? f.cx : f.x + f.w / 2, y: f.cy != null ? f.cy : f.y + f.h / 2 };
    }
    const align = panel.charAlign || 'right';
    return { x: align === 'left' ? x + w * 0.22 : (align === 'center' ? x + w / 2 : x + w * 0.78), y: y + h * 0.42 };
  }

  function overlapArea(a, b, pad) {
    pad = pad || 8;
    const x0 = Math.max(a.x, b.x - pad), y0 = Math.max(a.y, b.y - pad);
    const x1 = Math.min(a.x + a.w, b.x + b.w + pad), y1 = Math.min(a.y + a.h, b.y + b.h + pad);
    return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  }

  function placeBox(px, py, pw, ph, bw, bh, faces, prefer) {
    const pad = Math.max(8, Math.min(16, pw * 0.02));
    bw = Math.min(bw, pw - pad * 2);
    bh = Math.min(bh, ph - pad * 2);
    const tags = [
      ['tl', px + pad, py + pad],
      ['tr', px + pw - pad - bw, py + pad],
      ['tc', px + (pw - bw) / 2, py + pad],
      ['ml', px + pad, py + (ph - bh) / 2],
      ['mr', px + pw - pad - bw, py + (ph - bh) / 2],
      ['bl', px + pad, py + ph - pad - bh],
      ['br', px + pw - pad - bw, py + ph - pad - bh],
      ['bc', px + (pw - bw) / 2, py + ph - pad - bh]
    ];
    let best = null;
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i][0], bx = tags[i][1], by = tags[i][2];
      const box = { x: bx, y: by, w: bw, h: bh };
      let ov = 0;
      for (let j = 0; j < faces.length; j++) ov += overlapArea(box, faces[j], 10);
      if (bx < px + 2 || by < py + 2 || bx + bw > px + pw - 2 || by + bh > py + ph - 2) ov += 4000;
      if (prefer && tag === prefer) ov -= 40;
      if (!best || ov < best.ov) best = { bx: bx, by: by, bw: bw, bh: bh, ov: ov, tag: tag };
    }
    return best || { bx: px + pad, by: py + pad, bw: bw, bh: bh, ov: 0, tag: 'tl' };
  }

  function drawTail(c, bx, by, bw, bh, aimx, aimy) {
    const cx = bx + bw / 2, cy = by + bh / 2;
    const dx = aimx - cx, dy = aimy - cy;
    let fx, fy, wnx, wny;
    if (Math.abs(dx) * bh > Math.abs(dy) * bw) {
      fx = dx > 0 ? bx + bw : bx;
      fy = Math.max(by + 16, Math.min(by + bh - 16, aimy));
    } else {
      fy = dy > 0 ? by + bh : by;
      fx = Math.max(bx + 20, Math.min(bx + bw - 20, aimx));
    }
    const tipX = fx + (aimx - fx) * 0.32;
    const tipY = fy + (aimy - fy) * 0.32;
    const px = fy === by || fy === by + bh ? 16 : 0;
    const py = fx === bx || fx === bx + bw ? 16 : 0;
    c.beginPath();
    c.moveTo(fx - (py ? 0 : 16), fy - (px ? 0 : 12));
    c.lineTo(tipX, tipY);
    c.lineTo(fx + (py ? 0 : 16), fy + (px ? 0 : 12));
    c.closePath();
    c.fill();
  }

  function drawChar(c, x, y, w, h, panel, IM) {
    const b = charBox(panel, x, y, w, h, IM);
    if (!b) return;
    c.drawImage(b.img, b.cx, b.cy, b.iw, b.ih);
  }

  function balloon(c, x, y, w, h, panel, IM, extraAvoid) {
    const raw = panel.lines || [];
    if (!raw.length && !panel.speaker) return null;
    const faces = faceRects(panel, x, y, w, h, IM);
    const aim = speakerAim(faces, panel, x, y, w, h);
    const avoid = faces.concat(extraAvoid || []);
    const align = panel.charAlign || 'right';
    let prefer = align === 'right' ? 'tl' : (align === 'left' ? 'tr' : 'tl');
    const textLen = raw.join(' ').length;
    let fontSize = typePx(textLen > 80 ? 20 : 22);
    const cap = Math.max(16, Math.round(h * (portraitStack() ? 0.032 : (focusPanel() ? 0.042 : 0.038))));
    fontSize = Math.min(fontSize, cap, 40);
    let bw = Math.min(w * 0.86, Math.max(w * 0.42, Math.min(520, w - 28)));
    let font = '600 ' + fontSize + 'px Oswald, sans-serif';
    let lines = [];
    const fit = () => {
      lines = [];
      raw.forEach((ln) => { lines = lines.concat(wrap(c, ln, Math.max(40, bw - 36), font)); });
    };
    fit();
    const lhOf = (fs) => fs + Math.round(fs * 0.28);
    const speakerH0 = panel.speaker ? Math.max(14, fontSize * 0.7) + 8 : 0;
    let bh = 20 + speakerH0 + lines.length * lhOf(fontSize) + 16;
    let placed = placeBox(x, y, w, h, bw, bh, avoid, prefer);
    let guard = 0;
    while (placed.ov > 1 && guard < 6) {
      guard++;
      bw = Math.max(w * 0.36, bw * 0.86);
      fontSize = Math.max(14, Math.round(fontSize * 0.9));
      font = '600 ' + fontSize + 'px Oswald, sans-serif';
      fit();
      const sh = panel.speaker ? Math.max(14, fontSize * 0.7) + 8 : 0;
      bh = Math.min(h - 20, 18 + sh + lines.length * lhOf(fontSize) + 14);
      placed = placeBox(x, y, w, h, bw, bh, avoid, prefer);
    }
    const bx = placed.bx, by = placed.by;
    bw = placed.bw; bh = placed.bh;
    const speakerH = panel.speaker ? Math.max(14, fontSize * 0.7) + 8 : 0;
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = 'rgba(255,248,235,0.96)';
    round(c, bx, by, bw, bh, 16); c.fill();
    drawTail(c, bx, by, bw, bh, aim.x, aim.y);
    c.strokeStyle = '#1a120c';
    c.lineWidth = 3;
    roundPath(c, bx, by, bw, bh, 16); c.stroke();
    c.fillStyle = '#8a1020';
    c.font = '700 ' + Math.max(12, Math.round(fontSize * 0.7)) + 'px Oswald, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    if (panel.speaker) c.fillText(panel.speaker, bx + 16, by + Math.max(14, fontSize * 0.7) + 8);
    c.fillStyle = '#1a120c';
    c.font = font;
    const ty = by + 16 + speakerH + fontSize * 0.85;
    lines.forEach((ln, i) => c.fillText(ln, bx + 16, ty + i * lhOf(fontSize)));
    c.restore();
  }

  function chromePx(px) {
    if (focusPanel()) return Math.min(40, Math.max(22, Math.round(px * 1.4)));
    return typePx(px);
  }
  function caption(c, x, y, w, h, text, panel, IM, extraAvoid) {
    if (!text) return null;
    const faces = faceRects(panel || {}, x, y, w, h, IM).concat(extraAvoid || []);
    let fs = chromePx(14);
    fs = Math.min(fs, Math.max(13, Math.round(h * 0.055)));
    const maxInner = Math.max(80, w - 36);
    let font = '600 ' + fs + 'px Oswald, sans-serif';
    c.font = font;
    let lines = wrap(c, text, maxInner, font);
    // Shrink until the block fits the panel height budget (max 3 lines).
    let guard = 0;
    while ((lines.length > 3 || lines.length * (fs + 4) + 14 > h * 0.34) && fs > 12 && guard < 6) {
      guard++;
      fs = Math.max(12, fs - 2);
      font = '600 ' + fs + 'px Oswald, sans-serif';
      c.font = font;
      lines = wrap(c, text, maxInner, font);
    }
    if (lines.length > 3) lines = lines.slice(0, 3);
    let maxW = 0;
    lines.forEach((ln) => { maxW = Math.max(maxW, c.measureText(ln).width); });
    const tw = Math.min(w - 16, Math.ceil(maxW) + 28);
    const th = lines.length * (fs + 5) + 14;
    const placed = placeBox(x, y, w, h, tw, th, faces, 'bc');
    c.fillStyle = 'rgba(10,8,8,0.86)';
    round(c, placed.bx, placed.by, placed.bw, placed.bh, 4); c.fill();
    c.fillStyle = '#f4ead4';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const lh = fs + 5;
    const startY = placed.by + placed.bh / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => c.fillText(ln, placed.bx + placed.bw / 2, startY + i * lh));
    return { x: placed.bx, y: placed.by, w: placed.bw, h: placed.bh };
  }

  function wordStamp(c, x, y, w, h, word, cap) {
    c.fillStyle = '#ffd056';
    c.font = '800 ' + Math.min(160, w * 0.28) + 'px Anton, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(word || '', x + w / 2, y + h * 0.55);
    if (cap) {
      c.fillStyle = '#fff';
      c.font = '700 ' + Math.max(28, Math.min(44, w * 0.055)) + 'px Oswald, sans-serif';
      c.fillText(cap, x + w / 2, y + Math.max(36, h * 0.2));
    }
  }

  function kicker(c, x, y, w, h, text, panel, IM) {
    if (!text) return null;
    const fs = Math.min(typePx(12), Math.max(12, Math.round((h || 80) * 0.06)));
    c.font = '700 ' + fs + 'px Oswald, sans-serif';
    const tw = Math.min(Math.ceil(c.measureText(text).width) + 22, Math.max(96, w * 0.5));
    const th = fs + 12;
    const faces = (panel && IM) ? faceRects(panel, x, y, w, h || th + 8, IM) : [];
    const placed = placeBox(x, y, w, h || (th + 16), tw, th, faces, 'tl');
    c.fillStyle = '#8e1020';
    c.fillRect(placed.bx, placed.by, placed.bw, placed.bh);
    c.fillStyle = '#f4ead4';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(text, placed.bx + 10, placed.by + placed.bh / 2);
    return { x: placed.bx, y: placed.by, w: placed.bw, h: placed.bh };
  }

  function drawPanel(c, px, py, pw, ph, panel, IM, pat, alpha) {
    c.save();
    c.globalAlpha = alpha;
    // pop-in already applied by caller translate/scale
    c.fillStyle = '#0d0b0a';
    c.fillRect(px - 4, py - 4, pw + 8, ph + 8);
    c.beginPath(); c.rect(px, py, pw, ph); c.clip();
    fillPanelBg(c, px, py, pw, ph, panel, IM);
    halftone(c, px, py, pw, ph, pat);
    const reserved = [];
    if (panel.kicker) {
      const kb = kicker(c, px, py, pw, ph, panel.kicker, panel, IM);
      if (kb) reserved.push(kb);
    }
    if (panel.word) wordStamp(c, px, py, pw, ph, panel.word, panel.cap);
    else {
      drawChar(c, px, py, pw, ph, panel, IM);
      const cb = caption(c, px, py, pw, ph, panel.cap, panel, IM, reserved);
      if (cb) reserved.push(cb);
    }
    c.restore();
    c.save();
    c.globalAlpha = alpha;
    if (!panel.word) balloon(c, px, py, pw, ph, panel, IM, reserved);
    // border
    c.strokeStyle = '#140f0c';
    c.lineWidth = 5;
    c.strokeRect(px, py, pw, ph);
    c.restore();
  }

  function pageBox(W, H) {
    const top = portraitStack() ? 36 : TOP;
    const bottom = portraitStack() ? 100 : BOTTOM;
    return { x: MARGIN, y: top, w: W - MARGIN * 2, h: H - top - bottom };
  }

  function panelRect(page, panel) {
    const b = panel.box || [0, 0, 1, 1];
    const g = GUTTER;
    const x = page.x + b[0] * page.w + (b[0] > 0 ? g / 2 : 0);
    const y = page.y + b[1] * page.h + (b[1] > 0 ? g / 2 : 0);
    let w = b[2] * page.w - (b[0] > 0 ? g / 2 : 0) - (b[0] + b[2] < 0.999 ? g / 2 : 0);
    let h = b[3] * page.h - (b[1] > 0 ? g / 2 : 0) - (b[1] + b[3] < 0.999 ? g / 2 : 0);
    return { x, y, w, h };
  }

  function drawPage(c, W, H, page, revealed, animT, IM, pat) {
    paper(c, W, H);
    const area = pageBox(W, H);
    const panels = page.panels || [];
    const n = Math.min(revealed, panels.length);
    const focus = focusPanel();
    const start = focus ? Math.max(0, n - 1) : 0;
    for (let i = start; i < n; i++) {
      const p = panels[i];
      const r = focus ? { x: area.x, y: area.y, w: area.w, h: area.h } : panelRect(area, p);
      let a = 1, scale = 1;
      if (i === n - 1 && animT < 0.28) {
        const k = animT / 0.28;
        a = k;
        scale = 0.92 + 0.08 * k;
      }
      c.save();
      c.translate(r.x + r.w / 2, r.y + r.h / 2);
      c.scale(scale, scale);
      c.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      drawPanel(c, r.x, r.y, r.w, r.h, p, IM, pat, a);
      c.restore();
    }
    c.fillStyle = 'rgba(40,30,20,0.75)';
    c.font = '600 ' + chromePx(14) + 'px Oswald, sans-serif';
    c.textAlign = 'center';
    const more = revealed < panels.length;
    const hint = more ? (focus ? 'TAP FOR NEXT PANEL' : 'CLICK / TAP TO REVEAL THE NEXT PANEL') : (focus ? 'TAP TO CONTINUE' : 'CLICK / TAP TO CONTINUE');
    const label = focus ? (revealed + ' / ' + panels.length + '  ·  ' + hint) : hint;
    c.fillText(label, W / 2, H - (portraitStack() ? 44 : 28));
  }

  function round(c, x, y, w, h, r) { roundPath(c, x, y, w, h, r); c.fill(); }
  function roundPath(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  global.TPComic = { drawPage, panelCount: (page) => (page && page.panels ? page.panels.length : 0) };
})(window);
