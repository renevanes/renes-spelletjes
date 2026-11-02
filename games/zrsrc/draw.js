  /* ================= draw.js: camera, terrain layer, sprites, effects, fog of war, the minimap ================= */
  // Two canvases: the terrain layer (redrawn only when needed; panned and zoomed with a CSS transform in between) and the
  // main layer (units, buildings, effects, fog, overlays) drawn every frame in device pixels with sprites pre-scaled to the zoom.
  const Draw = (() => {
    const PX = Art.PX, PXT = Art.PXT, CH = Art.CH, DIRS = Art.DIRS, STEP_A = Math.PI * 2 / DIRS, BGM = 180;
    const lerpA = (a, b, t) => a + wrapA(b - a) * t;
    function create(cv, bgCv, fogCv, ovCv) {
      const g0 = cv.getContext('2d'), ov = ovCv.getContext('2d'), bgc = bgCv.getContext('2d', { alpha: false }); let g = g0, ovDrawn = false;
      const R = { dbg: {}, W: 0, H: 0, dpr: 1, cam: { x: 0, y: 0, z: 36 }, q: 0, S: null, chunks: [], cx: 0, cy: 0, sheets: {}, blds: {}, wrecks: {}, P: [], D: [], Z: [], stampQ: [], bgDirty: true, lastStamp: 0, fogV: -1, t: 0, zoomT: 0, lastZ: 0, bgT: 0 };
      const FX = Art.fx(), CRY = Art.crystals(), BGV = { x0: 0, y0: 0, z: 0, ok: false, tf: '' };
      let fog = null, fogc = null, fogImg = null;
      R.resize = (w, h, dpr) => { R.W = w; R.H = h; R.dpr = dpr; cv.width = ovCv.width = Math.round(w * dpr); cv.height = ovCv.height = Math.round(h * dpr); BGV.ok = false; ovDrawn = true; clamp(); };
      R.setQuality = q => { R.q = q; BGV.ok = false; };
      /* ----- a new match: chunks, sprites for the factions in it, fog ----- */
      R.setGame = (S, prepare) => {
        R.S = S; R.P.length = 0; R.D.length = 0; R.Z.length = 0; R.stampQ.length = 0;
        R.cx = Math.ceil(S.W / CH); R.cy = Math.ceil(S.H / CH); R.chunks = new Array(R.cx * R.cy).fill(null); R.sv = S.sv || 0; cryShadow = null;
        for (const P of S.P) { if (!R.sheets[P.fac]) R.sheets[P.fac] = Art.sheet(P.fac); if (!R.blds[P.fac]) { R.blds[P.fac] = Art.buildings(P.fac); R.blds[P.fac].wreck0 = Art.wreck(P.fac, 0); R.blds[P.fac].wreck1 = Art.wreck(P.fac, 1); } }
        fog = fogCv; fog.width = S.W + 2; fog.height = S.H + 2; fog.style.width = (S.W + 2) + 'px'; fog.style.height = (S.H + 2) + 'px'; fog.style.display = S.human >= 0 ? '' : 'none'; fogc = fog.getContext('2d'); fogImg = fogc.createImageData(S.W + 2, S.H + 2); R.fogV = -1; R.fogTf = '';
        mini0 = null; BGV.ok = false; SC.k = 0;
        if (prepare) for (let i = 0; i < R.chunks.length; i++) R.chunks[i] = Art.chunk(S, i % R.cx, (i / R.cx) | 0);
      };
      const chunkAt = i => R.chunks[i] || (R.chunks[i] = Art.chunk(R.S, i % R.cx, (i / R.cx) | 0));
      function redoSlabs() {                                  // slabs changed: redraw the affected chunks
        const S = R.S; if ((S.sv || 0) === R.sv) return; R.sv = S.sv || 0;
        for (let i = 0; i < R.chunks.length; i++) { const cx = i % R.cx, cy = (i / R.cx) | 0; let has = false; for (let y = cy * CH; y < Math.min(S.H, cy * CH + CH) && !has; y++) for (let x = cx * CH; x < Math.min(S.W, cx * CH + CH); x++) if (S.slab[y * S.W + x]) { has = true; break; } if (has) R.chunks[i] = null; }
        BGV.ok = false;
      }
      /* ----- camera ----- */
      function clamp() {
        const S = R.S; if (!S) return; const c = R.cam, vw = R.W / c.z, vh = R.H / c.z, m = 1.5;
        c.x = vw > S.W + m * 2 ? (S.W - vw) / 2 : Math.max(-m, Math.min(S.W + m - vw, c.x));
        c.y = vh > S.H + m * 2 ? (S.H - vh) / 2 : Math.max(-m, Math.min(S.H + m - vh, c.y));
      }
      R.clamp = clamp;
      R.zoomLimits = () => { const S = R.S, mn = S ? Math.max(14, Math.min(R.W / (S.W + 3), R.H / (S.H + 3))) : 14; return [mn, 72]; };
      R.center = (x, y) => { R.cam.x = x - R.W / R.cam.z / 2; R.cam.y = y - R.H / R.cam.z / 2; clamp(); };
      R.toWorld = (sx, sy) => ({ x: R.cam.x + sx / R.cam.z, y: R.cam.y + sy / R.cam.z });
      R.toScreen = (x, y) => ({ x: (x - R.cam.x) * R.cam.z, y: (y - R.cam.y) * R.cam.z });
      R.view = () => ({ x0: R.cam.x, y0: R.cam.y, x1: R.cam.x + R.W / R.cam.z, y1: R.cam.y + R.H / R.cam.z });
      /* ----- the terrain layer: chunks + crystal fields with a margin around the view ----- */
      function renderBg() {
        const S = R.S, c = R.cam, z = c.z, d = R.dpr, mt = BGM / z;
        const W = R.W + BGM * 2, H = R.H + BGM * 2, dw = Math.round(W * d), dh = Math.round(H * d);
        if (bgCv.width !== dw || bgCv.height !== dh) { bgCv.width = dw; bgCv.height = dh; bgCv.style.width = W + 'px'; bgCv.style.height = H + 'px'; }
        BGV.x0 = c.x - mt; BGV.y0 = c.y - mt; BGV.z = z; BGV.ok = true; BGV.tf = ''; R.bgT = performance.now(); R.bgDirty = false;
        bgc.setTransform(1, 0, 0, 1, 0, 0); bgc.fillStyle = '#1a120a'; bgc.fillRect(0, 0, dw, dh); bgc.imageSmoothingEnabled = true;
        const zz = z * d, x0w = BGV.x0, y0w = BGV.y0, x1w = x0w + W / z, y1w = y0w + H / z;
        const cx0 = Math.max(0, Math.floor(x0w / CH)), cx1 = Math.min(R.cx - 1, Math.floor(x1w / CH)), cy0 = Math.max(0, Math.floor(y0w / CH)), cy1 = Math.min(R.cy - 1, Math.floor(y1w / CH));
        for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const ch = chunkAt(cy * R.cx + cx), px = Math.floor((cx * CH - x0w) * zz), py = Math.floor((cy * CH - y0w) * zz); bgc.drawImage(ch, px, py, Math.ceil((cx * CH + ch.width / PXT - x0w) * zz) - px, Math.ceil((cy * CH + ch.height / PXT - y0w) * zz) - py); }
        const tx0 = Math.max(0, Math.floor(x0w - 1)), tx1 = Math.min(S.W - 1, Math.ceil(x1w)), ty0 = Math.max(0, Math.floor(y0w - 1)), ty1 = Math.min(S.H - 1, Math.ceil(y1w)), cs = CRY.size / PX * zz;
        for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
          const k = S.cry[y * S.W + x]; if (!k) continue;
          const lv = k > 180 ? 3 : k > 110 ? 2 : k > 50 ? 1 : 0, vv = (x * 7 + y * 13) & 3;
          bgc.drawImage(CRY.list[lv * 4 + vv], (x + .5 - x0w) * zz - cs / 2, (y + .5 - y0w) * zz - cs / 2, cs, cs);
        }
      }
      function placeBg() {                                    // CSS transform of the terrain layer for the current camera
        const c = R.cam, s = c.z / BGV.z, tx = (BGV.x0 - c.x) * c.z, ty = (BGV.y0 - c.y) * c.z;
        const tf = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`;
        if (tf !== BGV.tf) { BGV.tf = tf; bgCv.style.transform = tf; }
      }
      function needBg() {
        if (!BGV.ok) return true;
        const c = R.cam, now = performance.now(), s = c.z / BGV.z;
        if (Math.abs(s - 1) > .004 && (now - R.zoomT > 160 || Math.abs(s - 1) > .45)) return true;
        const v = R.view(), x1 = BGV.x0 + (R.W + BGM * 2) / BGV.z, y1 = BGV.y0 + (R.H + BGM * 2) / BGV.z;
        if (v.x0 < BGV.x0 || v.y0 < BGV.y0 || v.x1 > x1 || v.y1 > y1) return true;
        return R.bgDirty && now - R.bgT > 1200;
      }
      // crystal changes: only redraw when a tile in view changed its size class
      const lvOf = k => !k ? -1 : k > 180 ? 3 : k > 110 ? 2 : k > 50 ? 1 : 0;
      let cryShadow = null;
      function checkCrystals(S) {
        if (!cryShadow || cryShadow.length !== S.N) { cryShadow = new Int8Array(S.N); for (let i = 0; i < S.N; i++) cryShadow[i] = lvOf(S.cry[i]); }
        if (S.cdAll) { S.cdAll = 0; for (let i = 0; i < S.N; i++) cryShadow[i] = lvOf(S.cry[i]); R.bgDirty = true; mini0 = null; S.cd.length = 0; return; }
        if (!S.cd.length) return;
        const v = R.view();
        for (const i of S.cd) { const l = lvOf(S.cry[i]); if (l !== cryShadow[i]) { cryShadow[i] = l; const x = i % S.W, y = (i / S.W) | 0; if (x >= v.x0 - 3 && x <= v.x1 + 3 && y >= v.y0 - 3 && y <= v.y1 + 3) R.bgDirty = true; } }
        S.cd.length = 0;
      }
      /* ----- sprites pre-scaled to the zoom: every draw is a 1:1 copy at whole pixels ----- */
      const SC = { k: 0, sheets: {}, blds: {} };
      function scaleSprites(k) {
        SC.k = k; SC.sheets = {}; SC.blds = {};
        for (const f in R.sheets) {
          const sh = R.sheets[f], rows = Object.entries(sh.map); let W = 0, Hh = 0;
          const lay = rows.map(([key, m]) => { const sb = Math.max(2, Math.round(m.box * k)); const r = { key, m, sb, y: Hh }; Hh += sb; W = Math.max(W, sb * DIRS); return r; });
          const c = Art.mk(W, Hh), cg = c.getContext('2d'), map = {}; cg.imageSmoothingQuality = 'high';
          for (const r of lay) { cg.drawImage(sh.c, 0, r.m.y, r.m.box * DIRS, r.m.box, 0, r.y, r.sb * DIRS, r.sb); map[r.key] = { y: r.y, box: r.sb }; }
          SC.sheets[f] = { c, map };
          const B = R.blds[f], o = {};
          for (const t in B) {
            const s = B[t];
            if (s.c) { const sb = Math.max(2, Math.round(s.box * k)), c2 = Art.mk(sb * DIRS, sb); c2.getContext('2d').drawImage(s.c, 0, 0, s.box * DIRS, s.box, 0, 0, sb * DIRS, sb); o[t] = { c: c2, box: sb }; }
            else { const c2 = Art.mk(Math.max(2, Math.round(s.width * k)), Math.max(2, Math.round(s.height * k))); const g2 = c2.getContext('2d'); g2.imageSmoothingQuality = 'high'; g2.drawImage(s, 0, 0, c2.width, c2.height); o[t] = c2; }
          }
          SC.blds[f] = o;
        }
      }
      function ensureScaled() {
        const k = R.cam.z * R.dpr / PX;
        if (SC.k && Math.abs(k / SC.k - 1) < .02) return;
        if (SC.k && performance.now() - R.zoomT < 160) return;
        scaleSprites(k);
      }
      /* ----- fog of war: one pixel per tile, smoothed when drawn ----- */
      function updateFog(S) {
        if (S.fogV === R.fogV) return; R.fogV = S.fogV;
        const W2 = S.W + 2, D = fogImg.data;
        for (let y = 0; y < S.H + 2; y++) for (let x = 0; x < W2; x++) {
          const o = (y * W2 + x) * 4; let a = 255;
          if (x > 0 && y > 0 && x <= S.W && y <= S.H) { const i = (y - 1) * S.W + x - 1; a = S.vis[i] ? 0 : S.exp[i] ? 120 : 255; }
          D[o] = 24; D[o + 1] = 20; D[o + 2] = 30; D[o + 3] = a;
        }
        fogc.putImageData(fogImg, 0, 0);
      }
      const visAt = (S, x, y) => { if (S.human < 0) return true; const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < S.W && ty < S.H && S.vis[ty * S.W + tx] === 1; };
      const expAt = (S, x, y, w, h) => { if (S.human < 0) return true; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (S.exp[j * S.W + i]) return true; return false; };
      R.visAt = (x, y) => R.S && visAt(R.S, x, y);
      /* ----- particles ----- */
      const CAP = [400, 300, 200, 100, 60];
      function add(p) { if (R.P.length >= CAP[R.q]) { if (p.low) return; R.P.shift(); } p.t = 0; R.P.push(p); }
      const rnd2 = () => Math.random();
      function boom(x, y, s, dark) {
        add({ k: 'fire', x, y, s: s * 1.4, s1: s * 2.4, a: 1, life: .35, add: 1 });
        if (R.q < 3) add({ k: 'flash', x, y, s: s * 2.4, s1: s * 3, a: .6, life: .16, add: 1 });
        const n = Math.max(R.q > 3 ? 1 : 2, Math.round((R.q > 2 ? 2 : 5) * s));
        for (let k = 0; k < n; k++) { const a = rnd2() * 6.28, v = (.4 + rnd2() * .9) * s; add({ k: dark ? 'dark' : 'smoke', x: x + Math.cos(a) * .15 * s, y: y + Math.sin(a) * .15 * s, vx: Math.cos(a) * v * .6, vy: Math.sin(a) * v * .6 - .25, s: s * (.5 + rnd2() * .4), s1: s * (1.4 + rnd2()), a: .8, life: 1.1 + rnd2() * 1.1, drag: 1.8, low: 1 }); }
        for (let k = 0; k < (R.q > 2 ? 0 : 5); k++) { const a = rnd2() * 6.28, v = 1.5 + rnd2() * 2.5; add({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: .12, s1: .05, a: 1, life: .3 + rnd2() * .3, add: 1, drag: 2, low: 1 }); }
      }
      function dust(x, y, s, n = 4) { if (R.q > 2) n = Math.ceil(n / 2); for (let k = 0; k < n; k++) { const a = rnd2() * 6.28, v = (.3 + rnd2() * .7) * s; add({ k: 'dust', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: s * .5, s1: s * 1.3, a: .7, life: .7 + rnd2() * .6, drag: 2.5, low: 1 }); } }
      R.event = (e, S) => {
        const v = R.view(), near = (x, y, m = 3) => x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m;
        switch (e.t) {
          case 'fire': {
            if (!near(e.x, e.y) || !visAt(S, e.x, e.y)) return;
            if (e.wt === 'kogel') { R.Z.push({ k: 'tr', x: e.x, y: e.y, tx: e.tx, ty: e.ty, t: 0, life: .09 }); if (R.q < 3) add({ k: 'flash', x: e.x, y: e.y, s: e.inf ? .28 : .36, s1: .2, a: .9, life: .07, add: 1, low: 1 }); }
            else { const m = { x: e.x + Math.cos(e.a) * (e.r || .4) * 1.5, y: e.y + Math.sin(e.a) * (e.r || .4) * 1.5 }; add({ k: e.wt === 'raket' ? 'fire' : 'flash', x: m.x, y: m.y, s: e.wt === 'granaat' ? .7 : .55, s1: .3, a: 1, life: .1, add: 1 }); if (R.q < 3) add({ k: 'smoke', x: m.x, y: m.y, vx: Math.cos(e.a) * .5, vy: Math.sin(e.a) * .5 - .1, s: .25, s1: .7, a: .5, life: .8, drag: 2, low: 1 }); }
            return;
          }
          case 'imp': if (!near(e.x, e.y)) return; if (e.wt === 'granaat') { boom(e.x, e.y, .9); dust(e.x, e.y, 1.1, 6); } else if (e.wt === 'raket') boom(e.x, e.y, .55); else boom(e.x, e.y, .38); return;
          case 'die': if (!near(e.x, e.y)) return; if (e.inf) { dust(e.x, e.y, .6, 5); add({ k: 'smoke', x: e.x, y: e.y, vy: -.3, s: .3, s1: .9, a: .7, life: 1.1 }); } else { boom(e.x, e.y, UT[e.u].r * 2.2, true); R.D.push({ f: S.P[e.o].fac, big: UT[e.u].r > .5 ? 1 : 0, x: e.x, y: e.y, t: 0, life: R.q > 2 ? 8 : 16, smoke: R.q > 2 ? 0 : 5 }); if (R.D.length > 26) R.D.splice(0, R.D.length - 26); } return;
          case 'bdie': {
            if (!near(e.x, e.y, 6)) return; const n = Math.round(e.w * e.h / 2) + 2;
            for (let k = 0; k < n; k++) { const x = e.x + (rnd2() - .5) * e.w * .8, y = e.y + (rnd2() - .5) * e.h * .8; setTimeout(() => boom(x, y, 1 + rnd2() * .6, true), k * 90); }
            for (let k = 0; k < Math.min(4, n); k++) R.D.push({ f: S.P[e.o].fac, big: 1, x: e.x + (rnd2() - .5) * e.w * .6, y: e.y + (rnd2() - .5) * e.h * .6, t: 0, life: 50, smoke: 10 });
            stampScorch(e.x, e.y, Math.max(e.w, e.h) * .8); return;
          }
          case 'sold': case 'placed': if (near(e.x, e.y)) dust(e.x, e.y, 1.4, 10); return;
          case 'zap': R.Z.push({ k: 'zap', pts: e.pts, t: 0, life: .22 }); for (const p of e.pts.slice(1)) add({ k: 'blue', x: p.x, y: p.y, s: .7, s1: .3, a: 1, life: .2, add: 1 }); return;
          case 'swallow': case 'krrise': case 'krdive': {
            if (!near(e.x, e.y, 4)) return; const big = e.t === 'swallow', n = big ? 18 : 10;
            for (let k = 0; k < n; k++) { const a = k / n * 6.28, v2 = big ? 2.2 : 1.4; add({ k: 'dust', x: e.x, y: e.y, vx: Math.cos(a) * v2, vy: Math.sin(a) * v2, s: .6, s1: 1.6, a: .85, life: 1.3, drag: 2 }); }
            if (big) R.Z.push({ k: 'ring', x: e.x, y: e.y, t: 0, life: .9 });
            return;
          }
          case 'unload': if (near(e.x, e.y)) for (let k = 0; k < 6; k++) add({ k: k % 2 ? 'gold' : 'blue', x: e.x + (rnd2() - .5), y: e.y - .3 + (rnd2() - .5) * .6, vy: -.6, s: .25, s1: .1, a: 1, life: .7, add: 1, low: 1 }); return;
        }
      };
      function stampScorch(x, y, s) { const ci = Math.floor(y / CH) * R.cx + Math.floor(x / CH), ch = R.chunks[ci]; if (!ch) return; Art.stamp(ch, 'scorch', (x - (ci % R.cx) * CH) * PXT, (y - Math.floor(ci / R.cx) * CH) * PXT, 0, s); R.bgDirty = true; R.bgT = 0; }
      function stampTrack(u) {
        const ci = Math.floor(u.y / CH) * R.cx + Math.floor(u.x / CH), ch = R.chunks[ci]; if (!ch) return;
        R.stampQ.push([ch, UT[u.t].cat === 'inf' ? 'foot' : 'track', (u.x - (ci % R.cx) * CH) * PXT, (u.y - Math.floor(ci / R.cx) * CH) * PXT, u.d, UT[u.t].r * 2]);
      }
      /* ----- drawing helpers (device pixels) ----- */
      const d2r = (img, x, y, w, h) => g.drawImage(img, x - w / 2, y - h / 2, w, h);
      let KK = 1;                                             // extra scale while zooming (sprites not re-scaled yet)
      function sprite(sh, key, dirA, sx, sy, rot) {
        const m = sh.map[key]; if (!m) return;
        let a = dirA % (Math.PI * 2); if (a < 0) a += Math.PI * 2;
        const di = Math.round(a / STEP_A) % DIRS, box = m.box;
        if (rot && R.q === 0) { const res = a - di * STEP_A, c = Math.cos(res) * KK, sn = Math.sin(res) * KK; g.setTransform(c, sn, -sn, c, sx, sy); g.drawImage(sh.c, di * box, m.y, box, box, -box / 2, -box / 2, box, box); g.setTransform(1, 0, 0, 1, 0, 0); }
        else if (KK === 1) g.drawImage(sh.c, di * box, m.y, box, box, Math.round(sx - box / 2), Math.round(sy - box / 2), box, box);
        else { const s = box * KK; g.drawImage(sh.c, di * box, m.y, box, box, sx - s / 2, sy - s / 2, s, s); }
      }
      const BARS = [], BCOL = ['#5ee06a', '#f2c14e', '#ff5a4a', '#ff6a5a'];
      const bar = (x, y, w, f, enemy) => BARS.push(x, y, w, Math.max(0, f), enemy ? 3 : f > .6 ? 0 : f > .3 ? 1 : 2);
      function flushBars(d) {
        if (!BARS.length) return;
        g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); for (let i = 0; i < BARS.length; i += 5) g.rect(Math.round(BARS[i] - BARS[i + 2] / 2 - d), Math.round(BARS[i + 1] - d), Math.round(BARS[i + 2] + 2 * d), Math.round(5 * d)); g.fill();
        for (let c = 0; c < 4; c++) { let any = false; g.beginPath(); for (let i = 0; i < BARS.length; i += 5) if (BARS[i + 4] === c) { any = true; g.rect(Math.round(BARS[i] - BARS[i + 2] / 2), Math.round(BARS[i + 1]), Math.max(1, Math.round(BARS[i + 2] * BARS[i + 3])), Math.round(3 * d)); } if (any) { g.fillStyle = BCOL[c]; g.fill(); } }
        BARS.length = 0;
      }
      /* ----- one frame ----- */
      R.frame = (S, al, o) => {
        if (!S || !R.W) return;
        const now = performance.now(), dt = Math.min(.1, R.lt ? (now - R.lt) / 1000 : 0) * (o.speed || 1); R.lt = now; if (!o.still) R.t += dt;
        if (R.cam.z !== R.lastZ) { R.lastZ = R.cam.z; R.zoomT = now; }
        const c = R.cam, d = R.dpr, z = c.z, zz = z * d, A = al, h = S.human;
        redoSlabs(); checkCrystals(S);
        // tracks in the sand: batched into the chunks every second
        if (!o.still && R.q < 3 && S.t % 2 === 0 && R.lastTr !== S.t) { R.lastTr = S.t; for (const u of S.U) if (u.mv && (UT[u.t].cat === 'veh' || (S.t % 4 === 0 && R.q < 2)) && S.ter[tileOf(S, u.x, u.y)] === T_SAND && (h < 0 || u.o === h || visAt(S, u.x, u.y))) stampTrack(u); }
        if (R.stampQ.length && now - R.lastStamp > 1000) { R.lastStamp = now; for (const s of R.stampQ) Art.stamp(s[0], s[1], s[2], s[3], s[4], s[5]); R.stampQ.length = 0; R.bgDirty = true; }
        if (!R.dbg.bg && needBg()) renderBg();
        placeBg();
        ensureScaled(); KK = SC.k ? zz / PX / SC.k : 1; if (Math.abs(KK - 1) < .02) KK = 1;
        g = g0; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        const v = R.view(), inV = (x, y, m = 1.5) => x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m, X = x => (x - c.x) * zz, Y = y => (y - c.y) * zz;
        // wrecks
        for (let i = R.D.length - 1; i >= 0; i--) {
          const w = R.D[i]; if (!o.still) w.t += dt; if (w.t > w.life) { R.D.splice(i, 1); continue; } if (!inV(w.x, w.y)) continue;
          const img = SC.blds[w.f] && SC.blds[w.f]['wreck' + w.big]; if (!img) continue; const s = img.width * KK;
          g.globalAlpha = Math.min(1, (w.life - w.t) / 4); g.drawImage(img, Math.round(X(w.x) - s / 2), Math.round(Y(w.y) - s / 2), s, s); g.globalAlpha = 1;
          if (!o.still && w.t < w.smoke && Math.random() < dt * 3 && R.q < 3) add({ k: 'dark', x: w.x + (Math.random() - .5) * .3, y: w.y, vy: -.5, vx: .15, s: .3, s1: 1.1, a: .45, life: 1.6, low: 1 });
        }
        // the sand creeper: a moving ripple in the sand
        const K = S.kr;
        if (K && K.st !== 'gone' && inV(K.x, K.y, 3) && visAt(S, K.x, K.y)) {
          const kx = X(K.px + (K.x - K.px) * A), ky = Y(K.py + (K.y - K.py) * A), hunt = K.st === 'hunt', tt = R.t;
          g.save(); g.translate(kx, ky); g.rotate(K.d);
          const L = zz * (hunt ? 1.5 : 1.25), Wd = zz * (hunt ? .85 : .7), wob = Math.sin(tt * 6) * .04;
          // the wake: V-shaped ripples behind it
          for (let r = 0; r < 5; r++) { const ph = (tt * (hunt ? 1.8 : 1.1) + r * .2) % 1, bx = -L * (.6 + ph * 2.2), sp = Wd * (.7 + ph * 1.6); g.strokeStyle = `rgba(110,72,36,${.42 * (1 - ph)})`; g.lineWidth = Math.max(1.5 * d, zz * .07); g.beginPath(); g.moveTo(bx - L * .5, -sp); g.quadraticCurveTo(bx + L * .3, 0, bx - L * .5, sp); g.stroke(); }
          // the mound: shadow, body, light
          g.fillStyle = 'rgba(80,50,24,.35)'; g.beginPath(); g.ellipse(zz * .1, zz * .14, L, Wd, 0, 0, 7); g.fill();
          const gr = g.createRadialGradient(-L * .25, -Wd * .35, 0, 0, 0, L); gr.addColorStop(0, '#fbe2b0'); gr.addColorStop(.55, '#e2b874'); gr.addColorStop(1, '#b88446'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, L * (1 + wob), Wd * (1 - wob), 0, 0, 7); g.fill();
          g.strokeStyle = 'rgba(120,80,40,.45)'; g.lineWidth = Math.max(1, zz * .04); for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(-L * .15 * k, 0, L * (.75 - k * .18), Wd * (.7 - k * .16), 0, -1.3, 1.3); g.stroke(); }
          g.fillStyle = 'rgba(250,230,190,.75)'; for (let s2 = 0; s2 < 6; s2++) { const a = s2 * 1.05 + tt * 2.5; g.beginPath(); g.arc(Math.cos(a) * L * .55, Math.sin(a) * Wd * .55, zz * .045, 0, 7); g.fill(); }
          if (hunt) { g.fillStyle = '#5a3a20'; for (const sd of [-1, 1]) { g.save(); g.translate(L * .92, sd * Wd * .32); g.rotate(sd * (.45 + Math.sin(tt * 9) * .3)); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(zz * .38, sd * zz * .05, zz * .48, -sd * zz * .12); g.quadraticCurveTo(zz * .3, sd * zz * .1, 0, sd * zz * .12); g.fill(); g.restore(); } }
          g.restore();
          if (!o.still && Math.random() < dt * (hunt ? 14 : 5) && R.q < 3) add({ k: 'dust', x: K.x - Math.cos(K.d) * .6 + (Math.random() - .5) * .8, y: K.y - Math.sin(K.d) * .6 + (Math.random() - .5) * .8, vx: -Math.cos(K.d) * .4, vy: -Math.sin(K.d) * .4 - .2, s: .4, s1: 1.1, a: .55, life: .9, low: 1 });
        }
        // buildings
        const sel = o.sel || new Set(), tt = R.t;
        for (const b of R.dbg.b ? [] : S.B) {
          if (!inV(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
          if (b.o !== h && h >= 0 && !expAt(S, b.x, b.y, b.w, b.h)) continue;
          const F = S.P[b.o].fac, SB = SC.blds[F], img = SB[b.t], x0 = Math.round(X(b.x - .1)), y0 = Math.round(Y(b.y - .1)), sw = img.width * KK, shh = img.height * KK;
          if (b.bp < 1) {                                   // rising out of its scaffolding
            const f = b.bp, hh = img.height * f; g.drawImage(img, 0, img.height - hh, img.width, hh, x0, y0 + shh - hh * KK, sw, hh * KK);
            g.strokeStyle = 'rgba(240,192,64,.9)'; g.lineWidth = Math.max(d, zz * .04); g.strokeRect(X(b.x) + 2 * d, Y(b.y) + 2 * d, b.w * zz - 4 * d, b.h * zz - 4 * d);
            g.beginPath(); for (let i = 1; i < b.w * 2; i++) { g.moveTo(X(b.x + i / 2), Y(b.y + b.h)); g.lineTo(X(b.x + i / 2), Y(b.y + b.h * (1 - f))); } g.stroke();
            if (!o.still && Math.random() < dt * 8) add({ k: 'spark', x: b.x + Math.random() * b.w, y: b.y + b.h * (1 - f), vy: -1, vx: (Math.random() - .5) * 2, s: .12, s1: .04, a: 1, life: .35, add: 1, low: 1 });
          } else g.drawImage(img, x0, y0, sw, shh);
          const P = S.P[b.o], on = !P.low || BT[b.t].pw > 0;
          if (b.t === 'cent' && b.bp >= 1 && R.q < 4) { const f = SB.fan, s = f.width * KK; g.save(); g.translate(X(b.x + 1.42), Y(b.y + .98)); g.rotate(tt * 6); g.drawImage(f, -s / 2, -s / 2, s, s); g.restore(); }
          if (b.t === 'radar' && b.bp >= 1) { const f = SB.dish, s = f.width * KK; g.save(); g.translate(X(b.x + 1), Y(b.y + .9)); g.rotate(on ? tt * 1.4 : .6); g.drawImage(f, -s / 2, -s / 2, s, s); g.restore(); }
          if ((b.t === 'toren' || b.t === 'rpaal') && b.bp >= 1) { const Hd = SB[b.t + 'H'], a = lerpA(b.pt ?? b.tu, b.tu, A); let aa = a % 6.2832; if (aa < 0) aa += 6.2832; const di = Math.round(aa / STEP_A) % DIRS, s = Hd.box * KK; g.drawImage(Hd.c, di * Hd.box, 0, Hd.box, Hd.box, Math.round(X(b.x + .5) - s / 2), Math.round(Y(b.y + .45) - s / 2), s, s); if (b.fl === 3) add({ k: 'flash', x: b.x + .5 + Math.cos(a) * .55, y: b.y + .45 + Math.sin(a) * .55, s: .5, s1: .2, a: 1, life: .07, add: 1 }); }
          if (b.t === 'raff' && b.bp >= 1 && R.q < 3) { g.globalAlpha = .25 + .2 * Math.sin(tt * 2.2 + b.id); d2r(FX.blue, X(b.x + 2.3), Y(b.y + .8), zz * 1.1, zz * 1.1); g.globalAlpha = 1; }
          if (b.hp < b.mhp * .5 && !o.still && Math.random() < dt * (b.hp < b.mhp * .25 ? 6 : 2.5) && R.q < 4) add({ k: 'dark', x: b.x + .3 + Math.random() * (b.w - .6), y: b.y + .3 + Math.random() * (b.h - .6), vy: -.6, vx: .2, s: .4, s1: 1.4, a: .55, life: 1.8, low: 1 });
          if (b.hp < b.mhp * .25) { g.globalAlpha = .5 + .3 * Math.sin(tt * 13 + b.id); d2r(FX.fire, X(b.x + b.w * .4), Y(b.y + b.h * .45), zz * .9, zz * .9); g.globalAlpha = 1; }
          if (b.id === o.selB) {
            g.strokeStyle = '#fff'; g.lineWidth = 2 * d; g.setLineDash([6 * d, 4 * d]); g.strokeRect(X(b.x) + d, Y(b.y) + d, b.w * zz - 2 * d, b.h * zz - 2 * d); g.setLineDash([]);
            if (b.rally) { const rx = X(b.rally.x), ry = Y(b.rally.y); g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([4 * d, 5 * d]); g.beginPath(); g.moveTo(X(b.x + b.w / 2), Y(b.y + b.h)); g.lineTo(rx, ry); g.stroke(); g.setLineDash([]); g.fillStyle = FACTIONS[F].col; g.beginPath(); g.moveTo(rx, ry - zz * .75); g.lineTo(rx + zz * .45, ry - zz * .58); g.lineTo(rx, ry - zz * .4); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx, ry - zz * .78); g.stroke(); }
          }
          if (b.id === o.selB || (b.hp < b.mhp && S.t - b.hit < TPS * 4) || (b.o === h && b.hp < b.mhp * .5)) bar(X(b.x + b.w / 2), Y(b.y) - 6 * d, Math.min(b.w * zz * .9, 90 * d), b.hp / b.mhp, false);
          if (b.rep) { const s = zz * .55, cx = X(b.x + b.w / 2), cy = Y(b.y + b.h / 2); g.fillStyle = 'rgba(40,160,80,.85)'; g.beginPath(); g.arc(cx, cy, s * .6, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(cx - s * .3, cy); g.lineTo(cx + s * .3, cy); g.moveTo(cx, cy - s * .3); g.lineTo(cx, cy + s * .3); g.stroke(); }
          if (b.o === h && P.low && BT[b.t].pw < 0 && Math.sin(tt * 5) > 0) { const cx = X(b.x + b.w - .3), cy = Y(b.y + .3), s = Math.max(5 * d, zz * .22); g.fillStyle = '#ffd23a'; g.strokeStyle = '#a03020'; g.lineWidth = 1.5 * d; g.beginPath(); g.moveTo(cx + s * .2, cy - s); g.lineTo(cx - s * .5, cy + s * .1); g.lineTo(cx, cy + s * .1); g.lineTo(cx - s * .2, cy + s); g.lineTo(cx + s * .5, cy - s * .1); g.lineTo(cx, cy - s * .1); g.closePath(); g.fill(); g.stroke(); }
        }
        // units: infantry first, vehicles on top
        const selPath = [];
        for (let pass = 0; pass < 2; pass++) for (const u of R.dbg.u ? [] : S.U) {
          const T = UT[u.t]; if ((T.cat === 'inf') !== (pass === 0)) continue;
          const x = u.px + (u.x - u.px) * A, y = u.py + (u.y - u.py) * A; if (!inV(x, y)) continue;
          if (u.o !== h && h >= 0 && !visAt(S, x, y)) continue;
          const sh = SC.sheets[S.P[u.o].fac], sx = X(x), sy = Y(y), dA = lerpA(u.pd, u.d, A);
          if (T.cat === 'inf') { const f = u.mv ? 1 + (((S.t >> 1) + u.id) & 1) : 0; sprite(sh, u.t + 'b' + f, dA, sx, sy, false); }
          else {
            const tA = T.tur ? lerpA(u.pt, u.tu, A) : 0, same = T.tur && R.q > 0 && Math.round(((dA % 6.2832) + 6.2832) % 6.2832 / STEP_A) % DIRS === Math.round(((tA % 6.2832) + 6.2832) % 6.2832 / STEP_A) % DIRS;
            sprite(sh, u.t + (same ? 'k0' : 'b0'), dA, sx, sy, true);
            if (T.harv && u.car > 30) { g.globalAlpha = Math.min(1, u.car / 700); sprite(sh, 'oogc0', dA, sx, sy, true); g.globalAlpha = 1; if (u.mining > 0 && !o.still && Math.random() < dt * 10 && R.q < 4) add({ k: 'dust', x: x + Math.cos(u.d) * .6, y: y + Math.sin(u.d) * .6, vy: -.3, s: .35, s1: .9, a: .6, life: .7, low: 1 }); }
            if (T.tur && !same) sprite(sh, u.t + 't0', tA, sx, sy, true);
            if (u.mv && !o.still && R.q < 3 && S.ter[tileOf(S, x, y)] === T_SAND && Math.random() < dt * T.spd * 2) add({ k: 'dust', x: x - Math.cos(u.d) * T.r, y: y - Math.sin(u.d) * T.r, vx: -Math.cos(u.d) * .3, vy: -Math.sin(u.d) * .3 - .1, s: T.r * .7, s1: T.r * 1.8, a: .45, life: .8, low: 1 });
          }
          if (T.wt === 'straal' && u.bm > 0) {
            const m = { x: x + Math.cos(u.tu) * .45, y: y + Math.sin(u.tu) * .45 };
            g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,190,60,.5)'; g.lineWidth = Math.max(3 * d, zz * .22); g.beginPath(); g.moveTo(X(m.x), Y(m.y)); g.lineTo(X(u.bx), Y(u.by)); g.stroke();
            g.strokeStyle = 'rgba(255,250,220,.95)'; g.lineWidth = Math.max(1.5 * d, zz * .06); g.stroke(); g.globalCompositeOperation = 'source-over';
            d2r(FX.gold, X(u.bx), Y(u.by), zz * .8, zz * .8); d2r(FX.gold, X(m.x), Y(m.y), zz * .5, zz * .5);
          }
          if (u.rpg > 0) { u.rpg--; if (!o.still && Math.random() < .3) add({ k: 'spark', x: x + (Math.random() - .5) * .6, y: y + (Math.random() - .5) * .6, vy: -.8, s: .1, s1: .05, a: 1, life: .3, add: 1, low: 1 }); }
          if (sel.has(u.id)) selPath.push(sx, sy, T.r * zz * 1.25, u.hp / T.hp);
          else if (u.hp < T.hp && (S.t - u.hit < TPS * 4 || u.hp < T.hp * .5) && (u.o === h || visAt(S, x, y))) bar(sx, sy - T.r * zz - 7 * d, Math.max(16 * d, T.r * zz * 1.7), u.hp / T.hp, u.o !== h);
        }
        if (selPath.length) {
          g.strokeStyle = 'rgba(140,255,150,.95)'; g.lineWidth = 2 * d; g.beginPath();
          for (let i = 0; i < selPath.length; i += 4) { const x = selPath[i], y = selPath[i + 1], r = selPath[i + 2], q = r * .45; for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(x + dx * r, y + dy * (r - q)); g.lineTo(x + dx * r, y + dy * r); g.lineTo(x + dx * (r - q), y + dy * r); } }
          g.stroke(); for (let i = 0; i < selPath.length; i += 4) bar(selPath[i], selPath[i + 1] - selPath[i + 2] - 7 * d, Math.max(16 * d, selPath[i + 2] * 1.4), selPath[i + 3], false);
        }
        flushBars(d);
        // projectiles
        for (const p of S.PJ) {
          const x = p.px + (p.x - p.px) * A, y = p.py + (p.y - p.py) * A; if (!inV(x, y)) continue; if (h >= 0 && !visAt(S, x, y) && !visAt(S, p.tx, p.ty)) continue;
          if (p.wt === 'granaat') { const hz = (p.pz + (p.z - p.pz) * A) * zz * .9; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X(x), Y(y), zz * .12, zz * .07, 0, 0, 7); g.fill(); d2r(FX.shell, X(x), Y(y) - hz, zz * .45, zz * .45); if (!o.still && R.q < 3 && Math.random() < .5) add({ k: 'smoke', x, y: y - hz / zz, vy: -.1, s: .12, s1: .4, a: .4, life: .6, low: 1 }); }
          else if (p.wt === 'raket' && R.q > 2) d2r(FX.fire, X(x), Y(y), zz * .45, zz * .45);
          else if (p.wt === 'raket') { const a = p.ang || 0, s = zz * .55; g.setTransform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), X(x), Y(y)); g.drawImage(FX.rocket, -s / 2, -s * .21, s, s * .42); g.setTransform(1, 0, 0, 1, 0, 0); d2r(FX.fire, X(x - Math.cos(a) * .25), Y(y - Math.sin(a) * .25), zz * .4, zz * .4); if (!o.still && R.q < 4) add({ k: 'smoke', x: x - Math.cos(a) * .3, y: y - Math.sin(a) * .3, s: .16, s1: .55, a: .5, life: .7, low: 1 }); }
          else d2r(FX.shell, X(x), Y(y), zz * .32, zz * .32);
        }
        // particles and short lines
        if (!R.dbg.p) stepParticles(o.still ? 0 : dt, zz);
        let trN = 0; g.beginPath();
        for (let i = R.Z.length - 1; i >= 0; i--) {
          const L = R.Z[i]; if (!o.still) L.t += dt; if (L.t > L.life) { R.Z.splice(i, 1); continue; }
          if (L.k === 'tr') { g.moveTo(X(L.x), Y(L.y)); g.lineTo(X(L.tx), Y(L.ty)); trN++; }
        }
        if (trN) { g.strokeStyle = 'rgba(255,236,170,.85)'; g.lineWidth = Math.max(d, zz * .035); g.stroke(); }
        for (const L of R.Z) {
          const f = 1 - L.t / L.life;
          if (L.k === 'zap') { g.globalCompositeOperation = 'lighter'; for (const [w, col] of [[Math.max(4 * d, zz * .2), 'rgba(90,170,255,.35)'], [Math.max(1.5 * d, zz * .05), 'rgba(235,248,255,.95)']]) { g.strokeStyle = col; g.lineWidth = w; g.globalAlpha = f; g.beginPath(); for (let j = 0; j < L.pts.length - 1; j++) { const a = L.pts[j], b = L.pts[j + 1]; g.moveTo(X(a.x), Y(a.y)); for (let s = 1; s <= 5; s++) { const t2 = s / 5, jx = s < 5 ? Math.sin(L.t * 90 + s * 7 + j) * .2 : 0; g.lineTo(X(a.x + (b.x - a.x) * t2 + jx), Y(a.y + (b.y - a.y) * t2 - jx)); } } g.stroke(); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          else if (L.k === 'ring') { g.strokeStyle = `rgba(120,80,40,${f * .7})`; g.lineWidth = Math.max(2 * d, zz * .12); g.beginPath(); g.ellipse(X(L.x), Y(L.y), zz * (.5 + (1 - f) * 2), zz * (.35 + (1 - f) * 1.4), 0, 0, 7); g.stroke(); }
        }
        // fog of war: its own tiny canvas, scaled up smoothly by the compositor
        if (h >= 0) { updateFog(S); const tf = `translate3d(${((-1 - c.x) * z).toFixed(2)}px,${((-1 - c.y) * z).toFixed(2)}px,0) scale(${z.toFixed(4)})`; if (tf !== R.fogTf) { R.fogTf = tf; fog.style.transform = tf; } }
        // overlays above the fog: move markers, selection box, building ghost (a separate layer, only touched when needed)
        const anyOv = (o.marks && o.marks.length) || o.box || o.ghost;
        if (anyOv || ovDrawn) { ov.setTransform(1, 0, 0, 1, 0, 0); ov.clearRect(0, 0, ovCv.width, ovCv.height); ovDrawn = !!anyOv; }
        g = ov;
        for (const m of o.marks || []) { const f = 1 - m.t / .7; if (f <= 0) continue; g.strokeStyle = m.atk ? `rgba(255,90,70,${f})` : `rgba(140,255,150,${f})`; g.lineWidth = 2.5 * d; g.beginPath(); g.ellipse(X(m.x), Y(m.y), zz * (.25 + (1 - f) * .4), zz * (.16 + (1 - f) * .26), 0, 0, 7); g.stroke(); }
        if (o.box) { const b = o.box; g.fillStyle = 'rgba(140,255,150,.12)'; g.strokeStyle = 'rgba(140,255,150,.9)'; g.lineWidth = 1.5 * d; const x = Math.min(b.x0, b.x1) * d, y = Math.min(b.y0, b.y1) * d, w = Math.abs(b.x1 - b.x0) * d, hh = Math.abs(b.y1 - b.y0) * d; g.fillRect(x, y, w, hh); g.strokeRect(x, y, w, hh); }
        if (o.ghost) {
          const G = o.ghost, T = BT[G.t]; let i = 0;
          for (let j = 0; j < T.h; j++) for (let ii = 0; ii < T.w; ii++) { const okT = G.tiles[i++]; g.fillStyle = okT && G.near ? 'rgba(90,230,110,.42)' : 'rgba(255,80,60,.45)'; g.fillRect(X(G.x + ii) + d, Y(G.y + j) + d, zz - 2 * d, zz - 2 * d); }
          if (!T.slab) { const img = SC.blds[S.P[h].fac][G.t]; if (img) { g.globalAlpha = .55; g.drawImage(img, X(G.x - .1), Y(G.y - .1), img.width * KK, img.height * KK); g.globalAlpha = 1; } }
          g.strokeStyle = G.ok ? '#8cff96' : '#ff6a5a'; g.lineWidth = 2 * d; g.strokeRect(X(G.x), Y(G.y), T.w * zz, T.h * zz);
        }
        g = g0;
      };
      function stepParticles(dt, zz) {
        const c = R.cam, v = R.view(), P = R.P; let n = 0;
        for (let i = 0; i < P.length; i++) {
          const p = P[i]; p.t += dt; if (p.t >= p.life) continue; P[n++] = p;
          if (dt) { const dr = p.drag ? Math.exp(-p.drag * dt) : 1; if (p.vx) { p.x += p.vx * dt; p.vx *= dr; } if (p.vy) { p.y += p.vy * dt; p.vy *= dr; } }
        }
        P.length = n;
        for (let pass = 0; pass < 2; pass++) {               // normal blending first, then the glowing ones in one go
          if (pass) g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < n; i++) {
            const p = P[i]; if (!p.add !== !pass) continue;
            if (p.x < v.x0 - 2 || p.x > v.x1 + 2 || p.y < v.y0 - 2 || p.y > v.y1 + 2) continue;
            const f = p.t / p.life, s = (p.s + (p.s1 - p.s) * f) * zz, a = p.a * (p.add ? 1 - f : f < .15 ? f / .15 : (1 - f) / .85);
            g.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a; g.drawImage(FX[p.k], (p.x - c.x) * zz - s / 2, (p.y - c.y) * zz - s / 2, s, s);
          }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      R.idle = () => R.P.length === 0 && R.Z.length === 0;
      // a snapshot of both layers (for the menu backdrop)
      R.snapshot = () => { const c = Art.mk(cv.width, cv.height), sg = c.getContext('2d'), s = R.cam.z / BGV.z * R.dpr / R.dpr; sg.drawImage(bgCv, (BGV.x0 - R.cam.x) * R.cam.z * R.dpr, (BGV.y0 - R.cam.y) * R.cam.z * R.dpr, bgCv.width * s, bgCv.height * s); sg.drawImage(cv, 0, 0); return c; };
      /* ----- the minimap ----- */
      let mini0 = null;
      R.mini = (mc, S, on, sel) => {
        const mg = mc.getContext('2d'), W = S.W, H = S.H, w = mc.width, hh = mc.height;
        if (!mini0) {
          mini0 = Art.mk(W, H); const mx = mini0.getContext('2d'), im = mx.createImageData(W, H), D = im.data;
          for (let i = 0; i < W * H; i++) { const t = S.ter[i], col = S.cry[i] ? [240, 140, 50] : t === T_ROCK ? (S.slab[i] ? [176, 172, 160] : [150, 128, 108]) : t === T_CLIFF ? [96, 74, 60] : t === T_DUNE ? [204, 160, 100] : [228, 192, 128]; D[i * 4] = col[0]; D[i * 4 + 1] = col[1]; D[i * 4 + 2] = col[2]; D[i * 4 + 3] = 255; }
          mx.putImageData(im, 0, 0); R.miniT = 0;
        }
        if (++R.miniT % 20 === 0) { const mx = mini0.getContext('2d'); for (const i of S.ft) { mx.fillStyle = S.cry[i] ? '#f08c32' : '#e4c080'; mx.fillRect(i % W, (i / W) | 0, 1, 1); } }
        mg.imageSmoothingEnabled = false; mg.fillStyle = '#1a120a'; mg.fillRect(0, 0, w, hh);
        if (!on) return;
        const s = Math.min(w / W, hh / H), ox = (w - W * s) / 2, oy = (hh - H * s) / 2; R.miniS = { s, ox, oy };
        mg.drawImage(mini0, ox, oy, W * s, H * s);
        if (S.human >= 0) { updateFog(S); mg.imageSmoothingEnabled = true; mg.drawImage(fog, ox - s, oy - s, (W + 2) * s, (H + 2) * s); }
        const h = S.human;
        for (const b of S.B) { if (b.o !== h && h >= 0 && !expAt(S, b.x, b.y, b.w, b.h)) continue; mg.fillStyle = b.o === h ? '#7dff8a' : FACTIONS[S.P[b.o].fac].col; mg.fillRect(ox + b.x * s, oy + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s)); }
        const q = Math.max(2, s * 1.2);
        for (const u of S.U) { if (u.o !== h && h >= 0 && !visAt(S, u.x, u.y)) continue; mg.fillStyle = u.o === h ? (sel && sel.has(u.id) ? '#ffffff' : '#c8ffd0') : FACTIONS[S.P[u.o].fac].c2; mg.fillRect(ox + u.x * s - q / 2, oy + u.y * s - q / 2, q, q); }
        if (S.kr && S.kr.st !== 'gone' && visAt(S, S.kr.x, S.kr.y)) { mg.fillStyle = '#8a5a2a'; mg.beginPath(); mg.arc(ox + S.kr.x * s, oy + S.kr.y * s, Math.max(2.5, s * 1.5), 0, 7); mg.fill(); }
        const V = R.view(); mg.strokeStyle = '#fff'; mg.lineWidth = 1.5; mg.strokeRect(ox + V.x0 * s, oy + V.y0 * s, (V.x1 - V.x0) * s, (V.y1 - V.y0) * s);
      };
      R.miniWorld = (mx, my) => { const m = R.miniS; if (!m) return null; return { x: (mx - m.ox) / m.s, y: (my - m.oy) / m.s }; };
      R.resetMini = () => { mini0 = null; };
      return R;
    }
    return { create };
  })();
