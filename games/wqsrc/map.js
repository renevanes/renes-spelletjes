  /* ================= the world map =================
     Natural Earth 1:10m outlines (simplified), packed as varint deltas of lon/lat in 1/100 degree. Every view (world or a
     continent) has its own Natural Earth projection centred on that region; rings are never cut (each ring is shifted as
     a whole). The map is drawn into a cached bitmap (a canvas with a margin around the screen) once; while panning /
     zooming that canvas and the overlay (highlights, markers, labels) are only moved and scaled with a CSS transform
     (done by the compositor, so it stays smooth on slow phones); sharp ones are drawn again right after the gesture. */
  let GEO = null;
  function decodeMap(u8) {
    let p = 0;
    const vu = () => { let v = 0, m = 1, b; do { b = u8[p++]; v += (b & 127) * m; m *= 128; } while (b & 128); return v; };
    const zz = () => { const v = vu(); return v % 2 ? -(v + 1) / 2 : v / 2; };
    const n = vu(), codes = MAPINFO.codes; if (n !== codes.length) throw new Error('map');
    const rings = {};
    for (const c of codes) {
      const nr = vu(), R = [];
      for (let k = 0; k < nr; k++) { const np = vu(), a = new Float32Array(np * 2); let x = 0, y = 0; for (let i = 0; i < np; i++) { x += zz(); y += zz(); a[2 * i] = x / 100; a[2 * i + 1] = y / 100; } R.push(a); }
      rings[c] = R;
    }
    return { codes, rings };
  }
  const D2R = Math.PI / 180, UNIT = 1000;
  const NE = (l, f) => { const f2 = f * f, f4 = f2 * f2; return [l * (.8707 - .131979 * f2 + f4 * (-.013791 + f4 * (.003971 * f2 - .001529 * f4))), f * (1.007226 + f2 * (.015085 + f4 * (-.044475 + .028874 * f2 - .005916 * f4)))]; };
  const wrap = l => ((l + 540) % 360) - 180;
  // the views: centre meridian (the cut lies in an ocean) and the region to show at first
  const VIEWS = {
    W: { l0: 10.5, box: [-169, -56, 191, 80] },
    EU: { l0: 15, box: [-24, 34.5, 44, 71] },
    AF: { l0: 17, box: [-25, -36, 55, 38] },
    AS: { l0: 88, box: [26, -11, 148, 62] },
    NA: { l0: -95, box: [-168, 7, -52, 72] },
    SA: { l0: -62, box: [-92, -56, -34, 13] },
    OC: { l0: 162, box: [112, -48, 205, 12] },
  };
  const VG = {};
  function projPt(v, lon, lat, off) { const p = NE((lon - v.l0 + off) * D2R, lat * D2R); return [p[0] * UNIT, -p[1] * UNIT]; }
  function viewGeo(vid) {
    if (VG[vid]) return VG[vid];
    const v = VIEWS[vid], P = {}, codes = GEO.codes;
    for (const c of codes) {
      const R = [], RB = []; let bb = [1e9, 1e9, -1e9, -1e9], area = 0;
      for (const r0 of GEO.rings[c]) {
        // rings that were joined across the date line: make the longitudes continuous first
        const r = Float32Array.from(r0); for (let i = 2; i < r.length; i += 2) { const d = r[i] - r[i - 2]; if (d > 180) r[i] -= 360 * Math.round(d / 360); else if (d < -180) r[i] += 360 * Math.round(-d / 360); }
        let m = 0; for (let i = 0; i < r.length; i += 2) m += r[i]; m /= r.length / 2;
        const off = wrap(m - v.l0) - (m - v.l0), a = new Float32Array(r.length); let rb = [1e9, 1e9, -1e9, -1e9];
        for (let i = 0; i < r.length; i += 2) { const q = projPt(v, r[i], r[i + 1], off); a[i] = q[0]; a[i + 1] = q[1]; if (q[0] < rb[0]) rb[0] = q[0]; if (q[1] < rb[1]) rb[1] = q[1]; if (q[0] > rb[2]) rb[2] = q[0]; if (q[1] > rb[3]) rb[3] = q[1]; }
        let ar = 0; for (let i = 0, j = a.length - 2; i < a.length; j = i, i += 2) ar += (a[j] + a[i]) * (a[j + 1] - a[i + 1]);
        area += Math.abs(ar / 2);
        R.push(a); RB.push(rb); bb = [Math.min(bb[0], rb[0]), Math.min(bb[1], rb[1]), Math.max(bb[2], rb[2]), Math.max(bb[3], rb[3])];
      }
      const meta = MAPINFO.meta[c] || {}, an = meta.a ? projPt(v, meta.a[0], meta.a[1], wrap(meta.a[0] - v.l0) - (meta.a[0] - v.l0)) : [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
      // the main body's box (for zooming to a country): from the lon/lat box of its main parts
      let mb = null;
      if (meta.b) { const [x0, y0, x1, y1] = meta.b, off = wrap((x0 + x1) / 2 - v.l0) - ((x0 + x1) / 2 - v.l0); mb = [1e9, 1e9, -1e9, -1e9]; for (let k = 0; k <= 8; k++) for (const [lo, la] of [[x0 + (x1 - x0) * k / 8, y0], [x0 + (x1 - x0) * k / 8, y1], [x0, y0 + (y1 - y0) * k / 8], [x1, y0 + (y1 - y0) * k / 8]]) { const q = projPt(v, lo, la, off); mb = [Math.min(mb[0], q[0]), Math.min(mb[1], q[1]), Math.max(mb[2], q[0]), Math.max(mb[3], q[1])]; } }
      P[c] = { r: R, rb: RB, bb, a: an, mb: mb || bb, size: Math.sqrt(Math.max(0, area)), k: meta.k || 0 };
    }
    const box = fitBox(v, v.box), full = fitBox(v, [v.l0 - 180, -60, v.l0 + 180, 84]);
    // graticule: every 15 degrees
    const grat = new Path2D();
    for (let lo = -180; lo <= 180; lo += 15) { for (let la = -75; la <= 80; la += 2.5) { const q = projPt(v, v.l0 + lo, la, 0); la === -75 ? grat.moveTo(q[0], q[1]) : grat.lineTo(q[0], q[1]); } }
    for (let la = -60; la <= 75; la += 15) { for (let lo = -180; lo <= 180; lo += 3) { const q = projPt(v, v.l0 + lo, la, 0); lo === -180 ? grat.moveTo(q[0], q[1]) : grat.lineTo(q[0], q[1]); } }
    return (VG[vid] = { id: vid, P, codes, box, full, grat, paths: {} });
  }
  function fitBox(v, [x0, y0, x1, y1]) {
    let b = [1e9, 1e9, -1e9, -1e9];
    for (let k = 0; k <= 16; k++) for (const [lo, la] of [[x0 + (x1 - x0) * k / 16, y0], [x0 + (x1 - x0) * k / 16, y1], [x0, y0 + (y1 - y0) * k / 16], [x1, y0 + (y1 - y0) * k / 16]]) {
      const q = projPt(v, lo, la, 0); b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[0]), Math.max(b[3], q[1])];
    }
    return b;
  }
  function inRing(a, x, y) {
    let c = false;
    for (let i = 0, j = a.length - 2; i < a.length; j = i, i += 2) { const yi = a[i + 1], yj = a[j + 1]; if ((yi > y) !== (yj > y) && x < (a[j] - a[i]) * (y - yi) / (yj - yi) + a[i]) c = !c; }
    return c;
  }
  function inCountry(g, x, y) {
    if (x < g.bb[0] || x > g.bb[2] || y < g.bb[1] || y > g.bb[3]) return false;
    let c = false; g.r.forEach((a, i) => { const b = g.rb[i]; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && inRing(a, x, y)) c = !c; });
    return c;
  }
  function segDist(g, x, y, lim) {                    // distance (units) from a point to the outline of a country, up to lim
    let best = lim;
    g.r.forEach((a, k) => {
      const b = g.rb[k]; if (x < b[0] - best || x > b[2] + best || y < b[1] - best || y > b[3] + best) return;
      for (let i = 0, j = a.length - 2; i < a.length; j = i, i += 2) {
        const ax = a[j], ay = a[j + 1], dx = a[i] - ax, dy = a[i + 1] - ay, L = dx * dx + dy * dy;
        let t = L ? ((x - ax) * dx + (y - ay) * dy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = ax + t * dx - x, ey = ay + t * dy - y, d = Math.sqrt(ex * ex + ey * ey); if (d < best) best = d;
      }
    });
    return best;
  }
  // a Path2D per country and zoom bucket: points closer together than about half a pixel are skipped
  function pathOf(vg, c, b) {
    const cache = vg.paths[b] || (vg.paths[b] = {});
    if (cache[c]) return cache[c];
    const g = vg.P[c], tol = .45 / Math.pow(2, b), t2 = tol * tol, p = new Path2D(), small = g.size < tol * 6;
    for (const a of g.r) {
      let lx = a[0], ly = a[1]; p.moveTo(lx, ly);
      for (let i = 2; i < a.length; i += 2) { const x = a[i], y = a[i + 1], dx = x - lx, dy = y - ly; if (!small && dx * dx + dy * dy < t2) continue; p.lineTo(x, y); lx = x; ly = y; }
      p.closePath();
    }
    return (cache[c] = p);
  }
  const PAL = ['#f4e1ac', '#c9e6ae', '#f6c9b4', '#b8dfd8', '#e3d2f0', '#f9d98c', '#cfe0f2'];
  const mixHex = (a, b, t) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const c = s => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1); };
  const PAL_DIM = PAL.map(c => mixHex(c, '#8fb0c4', .62));
  const NEUTRAL = '#d8d2c2', NEUTRAL_DIM = mixHex(NEUTRAL, '#8fb0c4', .6);
  const HL = { target: ['#ffb21e', '#fff3c4'], ok: ['#2fc46b', '#d6ffe6'], bad: ['#f0484a', '#ffe0e0'], sel: ['#5ab0ff', '#e3f2ff'], info: ['#ff8a3c', '#fff0dd'] };

  function makeMap(wrap, o = {}) {
    // three layers: the base map (moved by CSS while gesturing), the overlay (highlights; also gets the touches), the locator inset
    const baseCv = document.createElement('canvas'); baseCv.className = 'wq-base'; wrap.appendChild(baseCv);
    const cv = document.createElement('canvas'); cv.className = 'wq-cv'; wrap.appendChild(cv);
    const inCv = document.createElement('canvas'); inCv.className = 'wq-inset'; wrap.appendChild(inCv);
    const ctx = cv.getContext('2d'), ictx = inCv.getContext('2d');
    const M = { wrap, cv, vid: null, vg: null, cx: 0, cy: 0, s: 1, w: 0, h: 0, dpr: 1, hl: [], pin: null, pulse: null, focus: null, colorFn: null, markSet: null, hitSet: null,
      onTap: o.onTap || null, dblZoom: o.dblZoom !== false, interactive: true, inset: o.inset !== false, base: baseCv, bt: null, ot: null, raf: 0, anim: null, gest: false, rebaseT: 0, drawMs: 0, baseMs: 0, frames: [], lastTap: null, tapT: 0, labels: [] };
    let pinchS = null;
    // the first view of a region: all of it, but on a tall phone screen not tiny: then it fills more of the height
    const homeS = () => { const b = M.vg.box, ct = Math.min(M.w / (b[2] - b[0]), M.h / (b[3] - b[1])), cv2 = Math.max(M.w / (b[2] - b[0]), M.h / (b[3] - b[1])); return Math.min(cv2, Math.max(ct, cv2 * .6)); };
    const fullB = () => M.vg.full;
    M.minS = () => { const b = M.vg.box; return Math.min(homeS() * .75, Math.min(M.w / (b[2] - b[0]), M.h / (b[3] - b[1])), Math.min(M.w / (fullB()[2] - fullB()[0]), M.h / (fullB()[3] - fullB()[1])) * 1.05); };
    M.maxS = () => homeS() * 36;
    function clamp() {
      M.s = Math.max(M.minS(), Math.min(M.maxS(), M.s));
      const f = fullB(), hw = M.w / 2 / M.s, hh = M.h / 2 / M.s;
      // keep the map on screen: the centre may not go beyond the edge of the world
      M.cx = (f[2] - f[0]) < hw * 2 ? (f[0] + f[2]) / 2 : Math.max(f[0] + hw * .2, Math.min(f[2] - hw * .2, M.cx));
      M.cy = (f[3] - f[1]) < hh * 2 ? (f[1] + f[3]) / 2 : Math.max(f[1] + hh * .2, Math.min(f[3] - hh * .2, M.cy));
    }
    M.resize = () => {
      const r = wrap.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (w < 10 || h < 10) return false;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === M.w && h === M.h && dpr === M.dpr) return true;
      const keep = M.w ? { k: M.s / homeS() } : null;
      M.w = w; M.h = h; M.dpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; M.ot = null;
      if (M.vg && keep) { M.s = homeS() * keep.k; clamp(); }
      M.bt = null; M.insetImg = null; M.rebase(); return true;
    };
    M.setView = (vid, opt = {}) => {
      M.vid = vid; M.vg = viewGeo(vid); M.focus = opt.focus || null; M.colorFn = opt.colorFn || null; M.markSet = opt.markSet || null; M.hitSet = opt.hitSet || null;
      M.insetImg = null; M.bt = null; M.anim = null;
      if (!M.resize() && !M.w) return;
      if (opt.keep) { clamp(); } else M.home(false);
      M.rebase();
    };
    M.restyle = (opt = {}) => { Object.assign(M, opt); M.bt = null; M.rebase(); };
    M.home = anim => { const b = M.vg.box; M.go((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, homeS(), anim); };
    // show a box (units); pad = extra room around it (fraction)
    M.fit = (b, anim, pad = .12, minSpan = 0, padB = 0) => {
      let w = Math.max(b[2] - b[0], minSpan), h = Math.max(b[3] - b[1], minSpan * .6);
      w *= 1 + pad * 2; h *= 1 + pad * 2;
      const hh = Math.max(M.h * .4, M.h - padB), s = Math.min(M.w / w, hh / h), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2 + (M.h - hh) / 2 / s;
      M.go(cx, cy, s, anim);
    };
    M.go = (cx, cy, s, anim) => {
      if (anim && M.bt) { M.anim = { f: [M.cx, M.cy, M.s], t: [cx, cy, s], t0: performance.now(), d: 520 }; M.req(); return; }
      M.anim = null; M.cx = cx; M.cy = cy; M.s = s; clamp(); M.rebase();
    };
    M.zoomAt = (sx, sy, k, anim) => {
      const ux = (sx - M.w / 2) / M.s + M.cx, uy = (sy - M.h / 2) / M.s + M.cy;
      const s = Math.max(M.minS(), Math.min(M.maxS(), M.s * k));
      M.go(ux - (sx - M.w / 2) / s, uy - (sy - M.h / 2) / s, s, anim);
    };
    M.toScreen = (ux, uy) => [(ux - M.cx) * M.s + M.w / 2, (uy - M.cy) * M.s + M.h / 2];
    M.toUnit = (sx, sy) => [(sx - M.w / 2) / M.s + M.cx, (sy - M.h / 2) / M.s + M.cy];
    const bucket = s => Math.max(-8, Math.min(8, Math.floor(Math.log2(s * M.dpr))));
    const tiny = g => g.size * M.s < 6;
    // ---------- the cached base bitmap ----------
    M.rebase = () => { clearTimeout(M.rebaseT); M.rebaseT = 0; if (!M.vg || !M.w) return; renderBase(); M.req(); };
    const laterRebase = ms => { clearTimeout(M.rebaseT); M.rebaseT = setTimeout(() => { M.rebaseT = 0; if (!M.gest && !M.anim) M.rebase(); }, ms); };
    function fillFor(c) {
      if (c[0] === '_') return M.focus ? NEUTRAL_DIM : NEUTRAL;
      if (M.colorFn) { const f = M.colorFn(c); if (f) return f; }
      const g = M.vg.P[c]; return (M.focus && !M.focus.has(c) ? PAL_DIM : PAL)[g.k % PAL.length];
    }
    function renderBase() {
      const t0 = performance.now(), W = M.w, H = M.h, dpr = M.dpr, mg = Math.round(Math.max(W, H) * .3);
      const bw = Math.round((W + 2 * mg) * dpr), bh = Math.round((H + 2 * mg) * dpr);
      if (M.base.width !== bw || M.base.height !== bh) { M.base.width = bw; M.base.height = bh; M.base.style.width = (bw / dpr) + 'px'; M.base.style.height = (bh / dpr) + 'px'; }
      const g = M.base.getContext('2d'), s = M.s, vg = M.vg;
      M.bt = { cx: M.cx, cy: M.cy, s, mg, W, H };
      g.setTransform(1, 0, 0, 1, 0, 0);
      const og = g.createLinearGradient(0, 0, bw * .25, bh); og.addColorStop(0, '#3a95cf'); og.addColorStop(.55, '#2477b4'); og.addColorStop(1, '#17598f');
      g.fillStyle = og; g.fillRect(0, 0, bw, bh);
      const u0 = (-mg - W / 2) / s + M.cx, v0 = (-mg - H / 2) / s + M.cy, u1 = (W + mg - W / 2) / s + M.cx, v1 = (H + mg - H / 2) / s + M.cy;
      const T = [dpr * s, 0, 0, dpr * s, dpr * ((W / 2 + mg) - M.cx * s), dpr * ((H / 2 + mg) - M.cy * s)];
      g.setTransform(...T);
      g.lineWidth = 1 / s; g.strokeStyle = 'rgba(255,255,255,.09)'; g.stroke(vg.grat);
      const b = bucket(s), vis = vg.codes.filter(c => { const q = vg.P[c].bb; return q[2] >= u0 && q[0] <= u1 && q[3] >= v0 && q[1] <= v1; });
      // soft shadow along the coasts, then the land, then the borders
      g.setTransform(T[0], 0, 0, T[3], T[4], T[5] + dpr * 1.4); g.fillStyle = 'rgba(6,34,66,.32)';
      for (const c of vis) g.fill(pathOf(vg, c, b), 'evenodd');
      g.setTransform(...T);
      for (const c of vis) { g.fillStyle = fillFor(c); g.fill(pathOf(vg, c, b), 'evenodd'); }
      const ws = vis.includes('_WS') ? pathOf(vg, '_WS', b) : null;
      if (ws) { g.save(); g.clip(ws, 'evenodd'); g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = dpr; g.beginPath(); for (let x = -bh; x < bw; x += 6 * dpr) { g.moveTo(x, 0); g.lineTo(x + bh, bh); } g.stroke(); g.restore(); g.setTransform(...T); }
      g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = Math.min(1.3, .55 + s * .004) / s;
      for (const c of vis) g.stroke(pathOf(vg, c, b));
      M.baseMs = performance.now() - t0;
    }
    function baseCovers() {
      const bt = M.bt; if (!bt || bt.W !== M.w || bt.H !== M.h) return false;
      const k = M.s / bt.s; if (k > 1.6 || k < .62) return false;
      const [a, b] = [(-M.w / 2) / M.s + M.cx, (-M.h / 2) / M.s + M.cy], [c, d] = [(M.w / 2) / M.s + M.cx, (M.h / 2) / M.s + M.cy];
      const m = bt.mg / bt.s;
      return a >= bt.cx - (bt.W / 2) / bt.s - m && c <= bt.cx + (bt.W / 2) / bt.s + m && b >= bt.cy - (bt.H / 2) / bt.s - m && d <= bt.cy + (bt.H / 2) / bt.s + m;
    }
    // ---------- drawing (only when something changed) ----------
    M.req = () => { if (!M.raf) M.raf = requestAnimationFrame(frame); };
    function frame(t) {
      M.raf = 0; if (!M.w || !M.vg) return;
      let more = false;
      if (M.anim) {
        const A = M.anim, u = Math.min(1, (t - A.t0) / A.d), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        const ls = Math.log(A.f[2]) + (Math.log(A.t[2]) - Math.log(A.f[2])) * e;
        M.s = Math.exp(ls); M.cx = A.f[0] + (A.t[0] - A.f[0]) * e; M.cy = A.f[1] + (A.t[1] - A.f[1]) * e;
        if (u >= 1 || !Number.isFinite(u)) { M.anim = null; M.cx = A.t[0]; M.cy = A.t[1]; M.s = A.t[2]; clamp(); laterRebase(30); } else more = true;
      }
      if (!M.gest && !M.anim && !baseCovers()) renderBase();
      else if (!baseCovers() && !M.rebaseT) laterRebase(160);
      placeBase();
      if (M.gest || M.anim) { placeOverlay(); drawInset(); }      // cheap: the compositor moves the layers
      else { draw(t); placeOverlay(); drawInset(); if (M.pulse && t - M.pulse.t0 < M.pulse.d) more = true; }
      M.frames.push(t); if (M.frames.length > 240) M.frames.splice(0, 120);
      if (more) M.req();
    }
    function draw(t) {
      const t0 = performance.now(), W = M.w, H = M.h, dpr = M.dpr, bt = M.bt;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); void bt;
      M.ot = { cx: M.cx, cy: M.cy, s: M.s };
      const vg = M.vg, s = M.s, b = bucket(s), T = [dpr * s, 0, 0, dpr * s, dpr * (W / 2 - M.cx * s), dpr * (H / 2 - M.cy * s)];
      // highlights
      for (const h of M.hl) {
        const g = vg.P[h.id]; if (!g) continue;
        const [fc, lc] = HL[h.st] || HL.target, p = pathOf(vg, h.id, b);
        ctx.setTransform(...T); ctx.lineJoin = 'round';
        ctx.strokeStyle = fc; ctx.globalAlpha = .28; ctx.lineWidth = 11 / s; ctx.stroke(p); ctx.globalAlpha = .45; ctx.lineWidth = 5 / s; ctx.stroke(p); ctx.globalAlpha = 1;
        ctx.fillStyle = fc; ctx.fill(p, 'evenodd');
        ctx.strokeStyle = lc; ctx.lineWidth = 1.6 / s; ctx.stroke(p);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // markers for countries that are too small to see (or tap) at this zoom
      const hlOf = {}; M.hl.forEach(h => { hlOf[h.id] = h.st; });
      for (const c of vg.codes) {
        if (c[0] === '_' || (M.markSet && !M.markSet.has(c) && !hlOf[c])) continue;
        const g = vg.P[c]; if (!tiny(g)) continue;
        const [x, y] = M.toScreen(g.a[0], g.a[1]); if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
        const st = hlOf[c];
        if (st) {
          const [fc] = HL[st] || HL.target;
          ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = fc; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        } else {
          const dim = M.focus && !M.focus.has(c), col = M.colorFn && M.colorFn(c);
          ctx.beginPath(); ctx.arc(x, y, M.s < homeS() * 1.5 && M.vid === 'W' ? 3.4 : 4.4, 0, 7); ctx.fillStyle = col || (dim ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.88)'); ctx.fill();
          ctx.lineWidth = 1.4; ctx.strokeStyle = dim ? 'rgba(30,70,110,.45)' : 'rgba(25,70,115,.9)'; ctx.stroke();
        }
      }
      // pulsing ring around the target (finite)
      if (M.pulse) {
        const g = vg.P[M.pulse.id], u = (t - M.pulse.t0) / M.pulse.d;
        if (g && u < 1) {
          const [x, y] = M.toScreen(g.a[0], g.a[1]), r0 = Math.max(14, Math.min(60, g.size * s * .7));
          for (let k = 0; k < 2; k++) { const ph = ((u * 3 + k * .5) % 1); ctx.beginPath(); ctx.arc(x, y, r0 + ph * 26, 0, 7); ctx.strokeStyle = `rgba(255,196,60,${(1 - ph) * .85 * (1 - u * .5)})`; ctx.lineWidth = 3; ctx.stroke(); }
        }
      }
      // the pin where you tapped
      if (M.pin) {
        const [x, y] = M.toScreen(M.pin[0], M.pin[1]);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 6, 2.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = M.pin[2] || '#ffffff'; ctx.strokeStyle = '#1b3550'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - 4, y - 9, x - 10, y - 13, x - 10, y - 20); ctx.arc(x, y - 20, 10, Math.PI, 0); ctx.bezierCurveTo(x + 10, y - 13, x + 4, y - 9, x, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1b3550'; ctx.beginPath(); ctx.arc(x, y - 20, 3.6, 0, 7); ctx.fill();
      }
      // labels (after an answer): name tags
      for (const L of M.labels) {
        const g = vg.P[L.id]; if (!g) continue;
        let [x, y] = M.toScreen(g.a[0], g.a[1]); y -= tiny(g) ? 14 : 0;
        ctx.font = '700 13px system-ui,Roboto,sans-serif'; const tw = ctx.measureText(L.t).width + 14;
        x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, x)); y = Math.max(16, Math.min(H - 16, y - 16));
        ctx.fillStyle = (HL[L.st] || HL.info)[0]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - tw / 2, y - 11, tw, 22, 11) : ctx.rect(x - tw / 2, y - 11, tw, 22); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L.t, x, y + .5);
      }
      M.drawMs = performance.now() - t0;
    }
    // the layers' CSS transforms: where the cached base / the last drawn overlay sit for the current centre and scale
    let lastBT = '', lastOT = '';
    function placeBase() {
      const bt = M.bt; if (!bt) return;
      const k = M.s / bt.s, tx = (-bt.mg - bt.W / 2) * k + (bt.cx - M.cx) * M.s + M.w / 2, ty = (-bt.mg - bt.H / 2) * k + (bt.cy - M.cy) * M.s + M.h / 2;
      const tr = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${k.toFixed(5)})`;
      if (tr !== lastBT) { baseCv.style.transform = tr; lastBT = tr; }
    }
    function placeOverlay() {
      const o = M.ot; let tr = 'none';
      if (o && (o.s !== M.s || o.cx !== M.cx || o.cy !== M.cy)) { const k = M.s / o.s; tr = `translate(${(-k * M.w / 2 + (o.cx - M.cx) * M.s + M.w / 2).toFixed(2)}px,${(-k * M.h / 2 + (o.cy - M.cy) * M.s + M.h / 2).toFixed(2)}px) scale(${k.toFixed(5)})`; }
      if (tr !== lastOT) { cv.style.transform = tr; lastOT = tr; }
    }
    // locator inset when zoomed in far (a small canvas of its own, cheap to redraw every frame)
    function drawInset() {
      const hb = M.vg.box, W = M.w, H = M.h, dpr = M.dpr, show = M.inset && M.s > homeS() * 3.2;
      inCv.style.display = show ? 'block' : 'none'; if (!show) return;
      const iw = Math.round(Math.min(124, W * .3)), ih = Math.round(iw * Math.min(.8, (hb[3] - hb[1]) / (hb[2] - hb[0])));
      if (!M.insetImg || M.insetImg.w !== iw) { M.insetImg = insetBitmap(iw, ih); inCv.width = Math.round(iw * dpr); inCv.height = Math.round(ih * dpr); inCv.style.width = iw + 'px'; inCv.style.height = ih + 'px'; }
      const g = ictx; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(M.insetImg.c, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const k = Math.min(iw / (hb[2] - hb[0]), ih / (hb[3] - hb[1])), ox = (iw - (hb[2] - hb[0]) * k) / 2 - hb[0] * k, oy = (ih - (hb[3] - hb[1]) * k) / 2 - hb[1] * k;
      const rx = ox + ((-W / 2) / M.s + M.cx) * k, ry = oy + ((-H / 2) / M.s + M.cy) * k, rw = W / M.s * k, rh = H / M.s * k;
      g.strokeStyle = '#ff4d3a'; g.lineWidth = 2; if (rw < 6) { g.beginPath(); g.arc(rx + rw / 2, ry + rh / 2, 5, 0, 7); g.stroke(); } else g.strokeRect(rx, ry, rw, rh);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.5; g.strokeRect(.75, .75, iw - 1.5, ih - 1.5);
    }
    function insetBitmap(iw, ih) {
      const c = document.createElement('canvas'), dpr = M.dpr; c.width = Math.round(iw * dpr); c.height = Math.round(ih * dpr);
      const g = c.getContext('2d'), hb = M.vg.box, k = Math.min(iw / (hb[2] - hb[0]), ih / (hb[3] - hb[1]));
      g.fillStyle = '#2a7fbd'; g.fillRect(0, 0, c.width, c.height);
      g.setTransform(dpr * k, 0, 0, dpr * k, dpr * ((iw - (hb[2] - hb[0]) * k) / 2 - hb[0] * k), dpr * ((ih - (hb[3] - hb[1]) * k) / 2 - hb[1] * k));
      g.fillStyle = '#e9e1c6'; const b = bucket(k);
      for (const cd of M.vg.codes) g.fill(pathOf(M.vg, cd, b), 'evenodd');
      return { c, w: iw };
    }
    // ---------- hit testing: what is at a screen point? ----------
    M.hit = (sx, sy, tolPx = 14) => {
      const vg = M.vg; if (!vg) return null;
      const [x, y] = M.toUnit(sx, sy), ok = c => c[0] !== '_' && (!M.hitSet || M.hitSet.has(c));
      // tiny countries: their marker
      let best = null, bd = 1e9;
      for (const c of vg.codes) { if (!ok(c)) continue; const g = vg.P[c]; if (!tiny(g)) continue; const [mx, my] = M.toScreen(g.a[0], g.a[1]), d = Math.hypot(mx - sx, my - sy); if (d < 16 && d < bd) { bd = d; best = c; } }
      if (best) return { id: best, d: 0 };
      for (const c of vg.codes) { if (ok(c) && inCountry(vg.P[c], x, y)) return { id: c, d: 0 }; }
      if (vg.codes.some(c => c[0] === '_' && inCountry(vg.P[c], x, y))) return null;
      const lim = tolPx / M.s; best = null; bd = lim;
      for (const c of vg.codes) { if (!ok(c)) continue; const d = segDist(vg.P[c], x, y, bd); if (d < bd) { bd = d; best = c; } }
      return best ? { id: best, d: bd * M.s } : null;
    };
    // how far (screen px) a point is from a country: 0 inside; tiny countries count from their marker
    M.distTo = (id, sx, sy) => {
      const g = M.vg && M.vg.P[id]; if (!g) return 1e9;
      const [x, y] = M.toUnit(sx, sy);
      let d = inCountry(g, x, y) ? 0 : segDist(g, x, y, 60 / M.s) * M.s;
      if (tiny(g)) { const [mx, my] = M.toScreen(g.a[0], g.a[1]); d = Math.min(d, Math.max(0, Math.hypot(mx - sx, my - sy) - 6)); }
      return d;
    };
    M.screenOf = id => { const g = M.vg && M.vg.P[id]; if (!g) return null; const [x, y] = M.toScreen(g.a[0], g.a[1]); return { x, y, tiny: tiny(g), size: g.size * M.s }; };
    // a point inside the country (for tests and for the pin): the anchor if it is inside, otherwise a point of the largest ring
    M.insidePt = id => {
      const g = M.vg.P[id]; if (inCountry(g, g.a[0], g.a[1]) || tiny(g)) return M.toScreen(g.a[0], g.a[1]);
      let best = null, ba = -1; g.r.forEach((a, i) => { const b = g.rb[i], ar = (b[2] - b[0]) * (b[3] - b[1]); if (ar > ba) { ba = ar; best = i; } });
      const b = g.rb[best]; for (let k = 0; k < 400; k++) { const x = b[0] + (b[2] - b[0]) * ((k * .618) % 1), y = b[1] + (b[3] - b[1]) * ((k * .382 + .5) % 1); if (inCountry(g, x, y)) return M.toScreen(x, y); }
      return M.toScreen(g.a[0], g.a[1]);
    };
    // ---------- gestures: drag = pan, two fingers = pinch, double tap = zoom in, tap = onTap ----------
    const pts = new Map(); let st = null;
    const pos = e => { const r = wrap.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };   // the wrapper: the overlay itself may be moved by CSS
    wrap.addEventListener('pointerdown', e => {
      if (!M.vg) return; e.preventDefault(); try { wrap.setPointerCapture(e.pointerId); } catch (x) {}
      const p = pos(e); pts.set(e.pointerId, p); M.anim = null;
      if (pts.size === 1) st = { x: p[0], y: p[1], cx: M.cx, cy: M.cy, t: performance.now(), moved: false };
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinchS = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s: M.s, cx: M.cx, cy: M.cy }; if (st) st.moved = true; M.gest = true; }
    });
    wrap.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId) || !M.interactive) { if (pts.has(e.pointerId)) pts.set(e.pointerId, pos(e)); return; }
      const p = pos(e); pts.set(e.pointerId, p);
      if (pts.size >= 2 && pinchS) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const s = Math.max(M.minS(), Math.min(M.maxS(), pinchS.s * d / pinchS.d));
        const ux = (pinchS.m[0] - M.w / 2) / pinchS.s + pinchS.cx, uy = (pinchS.m[1] - M.h / 2) / pinchS.s + pinchS.cy;
        M.s = s; M.cx = ux - (m[0] - M.w / 2) / s; M.cy = uy - (m[1] - M.h / 2) / s; clamp(); M.req(); return;
      }
      if (st && pts.size === 1) {
        const dx = p[0] - st.x, dy = p[1] - st.y;
        if (!st.moved && Math.hypot(dx, dy) > 9) { st.moved = true; M.gest = true; }
        if (st.moved) { M.cx = st.cx - dx / M.s; M.cy = st.cy - dy / M.s; clamp(); M.req(); }
      }
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size === 1 && pinchS) { const [p] = [...pts.values()]; st = { x: p[0], y: p[1], cx: M.cx, cy: M.cy, t: performance.now(), moved: true }; pinchS = null; return; }
      if (pts.size) return;
      pinchS = null;
      const s0 = st; st = null;
      if (M.gest) { M.gest = false; laterRebase(140); M.req(); }
      if (!s0 || s0.moved || e.type === 'pointercancel') return;
      const p = pos(e), now = performance.now();
      if (now - s0.t > 600) return;
      const L = M.lastTap;
      if (M.dblZoom && M.interactive && L && now - L.t < 300 && Math.hypot(L.x - p[0], L.y - p[1]) < 36) {
        clearTimeout(M.tapT); M.tapT = 0; M.lastTap = null; if (L.undo) L.undo();
        M.zoomAt(p[0], p[1], 2.2, true); return;
      }
      M.lastTap = { t: now, x: p[0], y: p[1] };
      if (M.onTap) M.onTap(p[0], p[1], M.lastTap);
    };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    wrap.addEventListener('wheel', e => { if (!M.vg || !M.interactive) return; e.preventDefault(); const p = pos(e); M.zoomAt(p[0], p[1], e.deltaY < 0 ? 1.25 : .8, false); M.gest = true; M.req(); clearTimeout(M.wheelT); M.wheelT = setTimeout(() => { M.gest = false; laterRebase(60); }, 120); }, { passive: false });
    M.busy = () => !!(M.raf || M.anim || M.gest || M.rebaseT);
    return M;
  }
