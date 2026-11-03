  /* ================= art.js: everything drawn procedurally: terrain chunks, sprites per faction colour and direction, emblems ================= */
  const Art = (() => {
    const PX = 48, DIRS = 16, CH = 16, PXT = 32;                 // sprite px per tile, directions, terrain chunk size (tiles), terrain px per tile
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
    const hex = (h, a = 1) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    const mix = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const c = k => Math.round(((A >> k) & 255) * (1 - t) + ((B >> k) & 255) * t); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
    function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    /* ---------- tileable noise texture for the terrain ---------- */
    const NS = 256, NOISE = new Float32Array(NS * NS);
    (() => {
      const R = rng(4242);
      for (const [cell, amp] of [[32, .5], [16, .25], [8, .14], [4, .08], [2, .03]]) {
        const n = NS / cell, L = new Float32Array(n * n); for (let i = 0; i < L.length; i++) L[i] = R();
        for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
          const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, ux = tx * tx * (3 - 2 * tx), uy = ty * ty * (3 - 2 * ty);
          const a = L[(iy % n) * n + ix % n], b = L[(iy % n) * n + (ix + 1) % n], c = L[((iy + 1) % n) * n + ix % n], d = L[((iy + 1) % n) * n + (ix + 1) % n];
          NOISE[y * NS + x] += (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * amp;
        }
      }
    })();
    const nz = (x, y) => NOISE[((y & 255) << 8) | (x & 255)];

    /* ---------- terrain: a height field shaded by a light from the top left ---------- */
    const SAND = [236, 200, 134], SAND2 = [222, 176, 110], ROCK = [158, 134, 112], ROCK2 = [128, 106, 90], CLIFF = [112, 86, 70], SLAB = [176, 172, 160];
    function chunk(S, cx, cy) {
      const W = S.W, H = S.H, x0 = cx * CH, y0 = cy * CH, cw = Math.min(CH, W - x0), chh = Math.min(CH, H - y0);
      const pw = cw * PXT, ph = chh * PXT, c = mk(pw, ph), g = c.getContext('2d'), img = g.createImageData(pw, ph), D = img.data;
      const field = (k, tx, ty) => { tx = Math.max(0, Math.min(W - 1, tx)); ty = Math.max(0, Math.min(H - 1, ty)); const t = S.ter[ty * W + tx]; return k === 0 ? (t === T_ROCK || t === T_CLIFF ? 1 : 0) : k === 1 ? (t === T_CLIFF ? 1 : 0) : k === 2 ? (t === T_DUNE ? 1 : 0) : S.slab[ty * W + tx]; };
      // per tile corner samples, then bilinear per pixel
      const gw = cw + 3, gh = chh + 3, F = [0, 1, 2, 3].map(() => new Float32Array(gw * gh));
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) for (let k = 0; k < 4; k++) F[k][j * gw + i] = field(k, x0 + i - 1, y0 + j - 1);
      const hw = pw + 2, hh = ph + 2, Hm = new Float32Array(hw * hh), Mat = new Float32Array(hw * hh * 4);
      for (let py = -1; py <= ph; py++) for (let px = -1; px <= pw; px++) {
        const u = (px + .5) / PXT - .5 + 1, v = (py + .5) / PXT - .5 + 1, iu = Math.max(0, Math.min(gw - 2, Math.floor(u))), iv = Math.max(0, Math.min(gh - 2, Math.floor(v))), fu = u - iu, fv = v - iv;
        const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
        const bl = k => { const f = F[k]; const a = f[iv * gw + iu], b = f[iv * gw + iu + 1], cc = f[(iv + 1) * gw + iu], d = f[(iv + 1) * gw + iu + 1]; return a + (b - a) * su + (cc - a) * sv + (a - b - cc + d) * su * sv; };
        const wx = x0 * PXT + px, wy = y0 * PXT + py, n1 = nz(wx, wy), n2 = nz((wx >> 2) + 97, (wy >> 2) + 31), n3 = nz(wx * 3 + 11, wy * 3 + 7);
        const rk = bl(0), cl = bl(1), du = bl(2), sl = bl(3);
        const rm = Math.min(1, Math.max(0, (rk + (n1 - .5) * .55 - .42) / .14)), cm = Math.min(1, Math.max(0, (cl + (n1 - .5) * .4 - .38) / .2));
        const dm = du * du * (3 - 2 * du);
        const ripple = Math.sin(wx * .19 + wy * .06 + n2 * 9) * .012 * (1 - rm);
        const h = dm * .95 + rm * .32 + cm * .9 + n1 * .05 + n3 * rm * .05 + ripple;
        const k = (py + 1) * hw + px + 1; Hm[k] = h; Mat[k * 4] = rm; Mat[k * 4 + 1] = cm; Mat[k * 4 + 2] = dm; Mat[k * 4 + 3] = sl > .5 ? 1 : 0;
      }
      for (let py = 0; py < ph; py++) for (let px = 0; px < pw; px++) {
        const k = (py + 1) * hw + px + 1, dx = Hm[k + 1] - Hm[k - 1], dy = Hm[k + hw] - Hm[k - hw];
        let li = 1 - (dx + dy) * 9; li = Math.max(.55, Math.min(1.35, li));
        const rm = Mat[k * 4], cm = Mat[k * 4 + 1], dm = Mat[k * 4 + 2], sl = Mat[k * 4 + 3], wx = x0 * PXT + px, wy = y0 * PXT + py, n1 = nz(wx, wy), n4 = nz(wx * 2 + 50, wy * 2 + 3);
        let r = SAND[0] + (SAND2[0] - SAND[0]) * (n1 * .9 + dm * .4), gg = SAND[1] + (SAND2[1] - SAND[1]) * (n1 * .9 + dm * .4), b = SAND[2] + (SAND2[2] - SAND[2]) * (n1 * .9 + dm * .4);
        if (rm > 0) { const t = n4 * .8; const R0 = ROCK[0] + (ROCK2[0] - ROCK[0]) * t, G0 = ROCK[1] + (ROCK2[1] - ROCK[1]) * t, B0 = ROCK[2] + (ROCK2[2] - ROCK[2]) * t; r += (R0 - r) * rm; gg += (G0 - gg) * rm; b += (B0 - b) * rm; }
        if (cm > 0) { r += (CLIFF[0] - r) * cm; gg += (CLIFF[1] - gg) * cm; b += (CLIFF[2] - b) * cm; }
        if (sl) { const lx = (wx % (PXT * 2)), ly = (wy % (PXT * 2)), seam = lx < 2 || ly < 2 ? .78 : 1; r = SLAB[0] * seam + n4 * 10; gg = SLAB[1] * seam + n4 * 10; b = SLAB[2] * seam + n4 * 8; li = 1; }
        const o = (py * pw + px) * 4; D[o] = Math.min(255, r * li); D[o + 1] = Math.min(255, gg * li); D[o + 2] = Math.min(255, b * li); D[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      // pebbles on rock, a few dark specks in the sand
      const R = rng((cx * 73856093) ^ (cy * 19349663) ^ 77);
      for (let n = 0; n < cw * chh * .9; n++) {
        const tx = Math.floor(R() * cw), ty = Math.floor(R() * chh), t = S.ter[(y0 + ty) * W + x0 + tx];
        const px = (tx + R()) * PXT, py = (ty + R()) * PXT;
        if (t === T_ROCK && !S.slab[(y0 + ty) * W + x0 + tx]) { const s = 1.5 + R() * 2.5; g.fillStyle = 'rgba(70,52,40,.35)'; g.beginPath(); g.ellipse(px + 1, py + 1.2, s, s * .7, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(214,196,176,.55)'; g.beginPath(); g.ellipse(px, py, s, s * .7, 0, 0, 7); g.fill(); }
        else if (t === T_SAND && R() < .3) { g.fillStyle = 'rgba(150,110,60,.18)'; g.fillRect(px, py, 1.5, 1.5); }
      }
      return c;
    }
    // fine sand grain, laid over the terrain at screen resolution so the ground stays crisp when zoomed in
    function grain() {
      const N = 256, c = mk(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), D = img.data, R = rng(9091);
      for (let i = 0; i < N * N; i++) {
        const r = R(), o = i * 4;
        if (r < .07) { D[o] = 255; D[o + 1] = 244; D[o + 2] = 214; D[o + 3] = 26 + R() * 34; }
        else if (r < .15) { D[o] = 70; D[o + 1] = 48; D[o + 2] = 26; D[o + 3] = 20 + R() * 30; }
      }
      g.putImageData(img, 0, 0);
      for (let k = 0; k < 260; k++) { const x = R() * N, y = R() * N, s = .8 + R() * 1.2; g.fillStyle = R() < .5 ? 'rgba(255,240,205,.22)' : 'rgba(80,56,30,.2)'; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
      return c;
    }
    // stamp onto a chunk: track marks, scorch marks
    function stamp(c, kind, px, py, a, s = 1) {
      const g = c.getContext('2d');
      if (kind === 'track') { g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = 'rgba(110,78,40,.13)'; g.fillRect(-2, -PXT * .32 * s, 4, PXT * .14 * s); g.fillRect(-2, PXT * .18 * s, 4, PXT * .14 * s); g.restore(); }
      else if (kind === 'foot') { g.fillStyle = 'rgba(110,78,40,.12)'; g.beginPath(); g.arc(px, py, 1.6, 0, 7); g.fill(); }
      else if (kind === 'scorch') { const gr = g.createRadialGradient(px, py, 0, px, py, PXT * s); gr.addColorStop(0, 'rgba(40,28,20,.55)'); gr.addColorStop(.6, 'rgba(60,40,24,.25)'); gr.addColorStop(1, 'rgba(60,40,24,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px, py, PXT * s, 0, 7); g.fill(); }
    }

    /* ---------- emblems ---------- */
    function emblem(g, kind, x, y, r, fill, line) {
      g.save(); g.translate(x, y); g.fillStyle = fill; g.strokeStyle = line || 'rgba(0,0,0,.35)'; g.lineWidth = r * .12;
      if (kind === 'sun') {
        g.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, a2 = a + Math.PI / 12; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a2) * r * .62, Math.sin(a2) * r * .62); } g.closePath(); g.fill(); g.stroke();
        g.fillStyle = line || '#fff'; g.globalAlpha = .9; g.beginPath(); g.arc(0, 0, r * .42, 0, 7); g.fill(); g.globalAlpha = 1; g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r * .3, 0, 7); g.fill();
      } else if (kind === 'bolt') {
        g.beginPath(); g.moveTo(r * .2, -r); g.lineTo(-r * .55, r * .12); g.lineTo(-r * .02, r * .12); g.lineTo(-r * .3, r); g.lineTo(r * .6, -r * .2); g.lineTo(r * .05, -r * .2); g.lineTo(r * .35, -r); g.closePath(); g.fill(); g.stroke();
      } else {
        g.beginPath(); const n = 8; for (let k = 0; k < n * 2; k++) { const a = (k + .5) / (n * 2) * Math.PI * 2, rr2 = k % 2 ? r * .72 : r; g.lineTo(Math.cos(a - .12) * rr2, Math.sin(a - .12) * rr2); g.lineTo(Math.cos(a + .12) * rr2, Math.sin(a + .12) * rr2); } g.closePath(); g.fill(); g.stroke();
        g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, r * .32, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
        g.strokeStyle = line || 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(0, 0, r * .32, 0, 7); g.stroke();
      }
      g.restore();
    }
    function emblemCanvas(fi, size) { const F = FACTIONS[fi], c = mk(size, size), g = c.getContext('2d'); emblem(g, F.emb, size / 2, size / 2, size * .42, F.col, F.dk); return c; }

    /* ---------- unit drawings (local frame: facing +x, 1 = one tile) ---------- */
    function tracks(g, L, y, w, col = '#3a3530') { g.fillStyle = col; rr(g, -L / 2, y - w / 2, L, w, w * .4); g.fill(); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-L / 2 + .03, y - w / 2 + .015, L - .06, w * .22); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .02; for (let x = -L / 2 + .06; x < L / 2; x += .085) { g.beginPath(); g.moveTo(x, y - w / 2 + .01); g.lineTo(x, y + w / 2 - .01); g.stroke(); } }
    function wheel(g, x, y, l = .2, w = .11) { g.fillStyle = '#2b2622'; rr(g, x - l / 2, y - w / 2, l, w, .04); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x - l / 2 + .02, y - w / 2 + .015, l - .04, .02); }
    const BODY = {
      sol: (g, F, f) => infantry(g, F, f, false), raks: (g, F, f) => infantry(g, F, f, true),
      verk: (g, F) => {
        for (const [x, y] of [[.22, -.2], [.22, .2], [-.2, -.21], [-.2, .21]]) wheel(g, x, y, .2, .11);
        g.fillStyle = F.col; rr(g, -.3, -.15, .62, .3, .08); g.fill();
        g.fillStyle = F.c2; rr(g, .12, -.12, .18, .24, .05); g.fill();
        g.strokeStyle = '#3c3a38'; g.lineWidth = .035; g.beginPath(); g.moveTo(-.12, -.15); g.lineTo(.02, -.06); g.lineTo(.02, .06); g.lineTo(-.12, .15); g.stroke();
        g.fillStyle = '#4a4744'; g.fillRect(-.06, -.03, .32, .06); g.fillStyle = '#2b2826'; g.fillRect(.2, -.02, .14, .04);
      },
      lt: (g, F) => { tracks(g, .86, -.25, .17); tracks(g, .86, .25, .17); g.fillStyle = F.col; rr(g, -.36, -.2, .74, .4, .07); g.fill(); g.fillStyle = F.dk; g.fillRect(.26, -.18, .1, .36); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-.3, -.17, .5, .05); grille(g, -.34, -.12, .1, .24); g.fillStyle = '#fff6c8'; for (const y of [-.14, .14]) { g.beginPath(); g.arc(.37, y, .025, 0, 7); g.fill(); } },
      zt: (g, F) => { tracks(g, 1, -.31, .2); tracks(g, 1, .31, .2); g.fillStyle = F.col; rr(g, -.42, -.24, .86, .48, .08); g.fill(); g.fillStyle = F.dk; g.fillRect(.3, -.22, .12, .44); g.fillStyle = F.dk; g.fillRect(-.42, -.1, .08, .2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-.36, -.21, .6, .05); grille(g, -.38, -.16, .12, .32); g.fillStyle = '#fff6c8'; for (const y of [-.18, .18]) { g.beginPath(); g.arc(.43, y, .028, 0, 7); g.fill(); } },
      rw: (g, F) => { for (const x of [.25, 0, -.25]) { wheel(g, x, -.22, .17, .1); wheel(g, x, .22, .17, .1); } g.fillStyle = F.col; rr(g, -.38, -.18, .76, .36, .06); g.fill(); g.fillStyle = F.c2; rr(g, .2, -.16, .18, .32, .05); g.fill(); g.fillStyle = 'rgba(30,40,60,.6)'; g.fillRect(.31, -.12, .05, .24); },
      oog: (g, F) => {
        tracks(g, 1.1, -.36, .2, '#3d3730'); tracks(g, 1.1, .36, .2, '#3d3730');
        g.fillStyle = '#8f8a80'; g.beginPath(); g.moveTo(.5, -.4); g.lineTo(.66, -.32); g.lineTo(.66, .32); g.lineTo(.5, .4); g.closePath(); g.fill();
        g.strokeStyle = '#5c5850'; g.lineWidth = .03; for (let y = -.3; y <= .31; y += .1) { g.beginPath(); g.moveTo(.6, y); g.lineTo(.7, y); g.stroke(); }
        g.fillStyle = F.col; rr(g, -.52, -.3, 1.04, .6, .08); g.fill();
        g.fillStyle = '#5a5248'; rr(g, -.44, -.22, .58, .44, .05); g.fill();
        g.fillStyle = '#3a342e'; rr(g, -.4, -.18, .5, .36, .04); g.fill();
        g.fillStyle = F.c2; rr(g, .22, -.24, .24, .48, .06); g.fill(); g.fillStyle = 'rgba(30,40,60,.65)'; g.fillRect(.36, -.18, .06, .36);
        g.fillStyle = '#f0c040'; for (let k = 0; k < 4; k++) g.fillRect(-.5 + k * .1, .26, .05, .03);
      },
      stral: (g, F) => { tracks(g, .9, -.27, .18); tracks(g, .9, .27, .18); g.fillStyle = F.col; rr(g, -.38, -.21, .78, .42, .09); g.fill(); g.fillStyle = F.c2; g.fillRect(-.34, -.05, .2, .1); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-.3, -.18, .5, .05); },
      bliks: (g, F) => { for (const [x, y] of [[.24, -.22], [.24, .22], [-.22, -.23], [-.22, .23]]) wheel(g, x, y, .22, .12); g.fillStyle = F.col; rr(g, -.36, -.18, .74, .36, .1); g.fill(); g.fillStyle = F.c2; rr(g, .14, -.14, .2, .28, .06); g.fill(); g.strokeStyle = '#d8f0ff'; g.lineWidth = .025; g.beginPath(); g.moveTo(-.34, 0); g.lineTo(-.18, 0); g.stroke(); },
      kolos: (g, F) => {
        tracks(g, 1.26, -.42, .26); tracks(g, 1.26, .42, .26); g.fillStyle = F.col; rr(g, -.55, -.32, 1.1, .64, .1); g.fill();
        g.fillStyle = F.dk; g.fillRect(.4, -.3, .15, .6); g.fillStyle = '#9aa0a8'; for (const [x, y] of [[-.45, -.24], [-.45, .24], [.32, -.24], [.32, .24], [-.05, -.27], [-.05, .27]]) { g.beginPath(); g.arc(x, y, .03, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-.48, -.29, .8, .05);
      },
    };
    function grille(g, x, y, w, h) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = .012; for (let k = y + .03; k < y + h; k += .04) { g.beginPath(); g.moveTo(x + .01, k); g.lineTo(x + w - .01, k); g.stroke(); } }
    const TURRET = {
      lt: (g, F) => { g.fillStyle = '#4b4743'; g.fillRect(.05, -.04, .46, .08); g.fillStyle = '#2e2b28'; g.fillRect(.46, -.055, .07, .11); g.fillStyle = F.col; g.beginPath(); g.arc(0, 0, .2, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .02; g.stroke(); g.fillStyle = F.dk; g.beginPath(); g.arc(-.05, 0, .07, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-.07, -.02, .025, 0, 7); g.fill(); },
      zt: (g, F) => { g.fillStyle = '#45413d'; g.fillRect(.08, -.055, .58, .11); g.fillRect(.58, -.075, .1, .15); g.fillStyle = F.col; rr(g, -.24, -.23, .46, .46, .1); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .02; g.stroke(); g.fillStyle = F.dk; g.fillRect(-.2, -.06, .14, .12); g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(.06, .1, .05, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-.2, -.2, .36, .04); },
      rw: (g, F) => { g.fillStyle = '#5a5650'; rr(g, -.24, -.17, .44, .34, .05); g.fill(); g.fillStyle = '#2c2a28'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(.1 + j * .07, -.1 + i * .1, .035, 0, 7); g.fill(); } g.fillStyle = F.col; g.fillRect(-.24, -.17, .12, .34); },
      stral: (g, F) => { g.fillStyle = '#5a554c'; g.fillRect(-.05, -.04, .2, .08); const gr = g.createRadialGradient(.12, 0, .02, .1, 0, .28); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.5, '#ffd24a'); gr.addColorStop(1, '#b07010'); g.fillStyle = gr; g.beginPath(); g.ellipse(.1, 0, .12, .27, 0, 0, 7); g.fill(); g.strokeStyle = '#8a5a10'; g.lineWidth = .025; g.stroke(); g.strokeStyle = '#6a6458'; g.lineWidth = .03; g.beginPath(); g.moveTo(.12, -.2); g.lineTo(.42, 0); g.lineTo(.12, .2); g.stroke(); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(.42, 0, .04, 0, 7); g.fill(); },
      bliks: (g, F) => { g.fillStyle = '#4e5660'; g.beginPath(); g.arc(0, 0, .16, 0, 7); g.fill(); g.strokeStyle = '#c7d6e4'; g.lineWidth = .035; for (const r of [.13, .09]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); } const gr = g.createRadialGradient(0, 0, 0, 0, 0, .08); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#5ab8ff'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .065, 0, 7); g.fill(); g.fillStyle = '#9fb4c8'; g.fillRect(.12, -.025, .2, .05); },
      kolos: (g, F) => { g.fillStyle = '#403c38'; g.fillRect(.1, -.15, .62, .1); g.fillRect(.1, .05, .62, .1); g.fillStyle = F.col; rr(g, -.3, -.28, .56, .56, .14); g.fill(); emblem(g, 'gear', -.04, 0, .14, F.c2, F.dk); },
    };
    function infantry(g, F, f, rocket) {
      const st = f === 0 ? 0 : f === 1 ? .1 : -.1;
      g.fillStyle = '#4a3e30'; g.beginPath(); g.ellipse(st, -.07, .06, .04, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(-st, .07, .06, .04, 0, 0, 7); g.fill();
      g.fillStyle = F.col; g.beginPath(); g.ellipse(0, 0, .1, .15, 0, 0, 7); g.fill();
      g.fillStyle = '#6a5a44'; rr(g, -.13, -.07, .07, .14, .02); g.fill();
      if (rocket) { g.fillStyle = '#5c6a58'; g.fillRect(-.16, -.13, .42, .07); g.fillStyle = '#2f342e'; g.fillRect(.24, -.135, .04, .08); }
      else { g.strokeStyle = '#2e2b28'; g.lineWidth = .04; g.beginPath(); g.moveTo(.02, .06); g.lineTo(.28, .03); g.stroke(); g.fillStyle = '#e6b88c'; g.beginPath(); g.arc(.12, .07, .03, 0, 7); g.fill(); }
      g.fillStyle = '#f0c49a'; g.beginPath(); g.arc(.03, 0, .065, 0, 7); g.fill();
      g.fillStyle = F.dk; g.beginPath(); g.arc(.01, 0, .07, Math.PI * .55, Math.PI * 1.45 + Math.PI); g.fill(); g.beginPath(); g.arc(.0, 0, .062, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-.02, -.025, .022, 0, 7); g.fill();
    }
    // shading: light from the top left in world space, shadow down-right
    function shadeOn(g, cx, cy, s) { g.save(); g.globalCompositeOperation = 'source-atop'; const gr = g.createLinearGradient(cx - s, cy - s, cx + s, cy + s); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = gr; g.fillRect(cx - s, cy - s, s * 2, s * 2); g.restore(); }
    // a thin dark outline around a sprite, so units stand out against the sand
    function outlined(src) {
      const c = mk(src.width, src.height), g = c.getContext('2d');
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(src, dx, dy);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(28,20,12,.72)'; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over'; g.drawImage(src, 0, 0); return c;
    }
    // one sprite sheet (atlas) per faction: [type][part][dir][frame]
    const BOX = { sol: .7, raks: .8, verk: 1, lt: 1.2, zt: 1.5, rw: 1.15, oog: 1.6, stral: 1.25, bliks: 1.1, kolos: 1.9 };
    function sheet(fi) {
      const F = FACTIONS[fi], parts = [];
      for (const t in UT) {
        if (UT[t].fac && UT[t].fac !== F.id) continue;
        const box = Math.ceil(BOX[t] * PX), frames = UT[t].cat === 'inf' ? 3 : 1;
        parts.push({ t, p: 'b', box, frames, fn: BODY[t] });
        if (TURRET[t]) { parts.push({ t, p: 't', box, frames: 1, fn: TURRET[t] }); parts.push({ t, p: 'k', box, frames: 1, fn: (g, F, f) => { BODY[t](g, F, f); TURRET[t](g, F); } }); }
        if (t === 'oog') parts.push({ t, p: 'c', box, frames: 1, fn: g => { g.fillStyle = '#ff9a2a'; for (const [x, y, s] of [[-.32, -.1, .09], [-.18, .06, .1], [-.05, -.08, .08], [-.28, .1, .07], [-.08, .1, .07]]) { g.save(); g.translate(x, y); g.rotate(.6); g.fillRect(-s / 2, -s / 2, s, s); g.restore(); } g.fillStyle = '#7ad0ff'; for (const [x, y] of [[-.22, -.04], [-.1, .02], [-.35, .02]]) { g.beginPath(); g.arc(x, y, .035, 0, 7); g.fill(); } } });
      }
      let W = 0, Hh = 0; for (const p of parts) { W = Math.max(W, p.box * DIRS); Hh += p.box * p.frames; }
      const c = mk(W, Hh), g = c.getContext('2d'), map = {}; let y = 0;
      for (const p of parts) {
        for (let f = 0; f < p.frames; f++) {
          for (let d = 0; d < DIRS; d++) {
            const a = d / DIRS * Math.PI * 2, cx = d * p.box + p.box / 2, cy = y + p.box / 2;
            const draw = (gg, sh) => { gg.save(); gg.translate(cx + sh, cy + sh); gg.scale(PX, PX); gg.rotate(a); p.fn(gg, F, f); gg.restore(); };
            if (p.p !== 'c') { g.save(); g.beginPath(); g.rect(d * p.box, y, p.box, p.box); g.clip(); g.filter = 'blur(1.5px)'; g.globalAlpha = .3; g.globalCompositeOperation = 'source-over';
              const tmp = mk(p.box, p.box), tg = tmp.getContext('2d'); tg.save(); tg.translate(p.box / 2, p.box / 2); tg.scale(PX, PX); tg.rotate(a); p.fn(tg, F, f); tg.restore(); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#000'; tg.fillRect(0, 0, p.box, p.box);
              g.drawImage(tmp, d * p.box + PX * .06, y + PX * .08); g.restore(); }
            const tmp = mk(p.box, p.box), tg = tmp.getContext('2d'); tg.save(); tg.translate(p.box / 2, p.box / 2); tg.scale(PX, PX); tg.rotate(a); p.fn(tg, F, f); tg.restore();
            if (p.p !== 'c') { shadeOn(tg, p.box / 2, p.box / 2, p.box * .45); g.drawImage(outlined(tmp), d * p.box, y); }
            else g.drawImage(tmp, d * p.box, y);
          }
          map[p.t + p.p + f] = { y, box: p.box }; y += p.box;
        }
      }
      return { c, map };
    }
    // a still picture of a unit for the build buttons
    function unitIcon(fi, t, size) {
      const F = FACTIONS[fi], c = mk(size, size), g = c.getContext('2d'), s = size / (BOX[t] * .95);
      g.translate(size / 2, size / 2); g.scale(s, s); g.rotate(Math.PI * .75);
      g.save(); g.translate(.04, .05); g.globalAlpha = .3; g.filter = 'blur(1px)'; BODY[t](g, Object.assign({}, F, { col: '#000', c2: '#000', dk: '#000' }), 0); g.restore();
      BODY[t](g, F, 0); if (TURRET[t]) TURRET[t](g, F);
      return c;
    }

    /* ---------- buildings: a concrete pad, blocks with a lit roof and a front wall, drawn at BPX per tile (sharper when zoomed in) ---------- */
    const BPX = PX * 2;
    const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
    function pad(g, x, y, w, h, seed) {                     // concrete foundation with seams, specks and a bevelled edge
      const gr = g.createLinearGradient(x, y, x + w * .5, y + h); gr.addColorStop(0, '#c9c3b6'); gr.addColorStop(1, '#a39d90');
      g.fillStyle = gr; rr(g, x, y, w, h, .12); g.fill();
      g.save(); rr(g, x, y, w, h, .12); g.clip();
      g.strokeStyle = 'rgba(70,62,52,.16)'; g.lineWidth = .018;
      for (let i = 1; i < w; i++) line(g, [x + i, y, x + i, y + h]); for (let j = 1; j < h; j++) line(g, [x, y + j, x + w, y + j]);
      const R = rng(seed); for (let k = 0; k < w * h * 30; k++) { g.fillStyle = R() < .5 ? 'rgba(255,255,255,.12)' : 'rgba(60,50,40,.1)'; g.fillRect(x + R() * w, y + R() * h, .02 + R() * .02, .02 + R() * .02); }
      g.fillStyle = 'rgba(90,70,40,.08)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x + R() * w, y + R() * h, .2 + R() * .3, .12 + R() * .2, R() * 3, 0, 7); g.fill(); }
      g.restore();
      g.lineWidth = .04; g.strokeStyle = 'rgba(255,255,255,.4)'; line(g, [x + .1, y + .03, x + w - .1, y + .03]); line(g, [x + .03, y + .1, x + .03, y + h - .1]);
      g.strokeStyle = 'rgba(40,30,20,.35)'; line(g, [x + .1, y + h - .03, x + w - .1, y + h - .03]); line(g, [x + w - .03, y + .1, x + w - .03, y + h - .1]);
      g.strokeStyle = 'rgba(40,32,24,.6)'; g.lineWidth = .022; rr(g, x, y, w, h, .12); g.stroke();
    }
    function hazard(g, x, y, w, h, a = 1) {                 // yellow and black stripes
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = `rgba(240,192,52,${a})`; g.fillRect(x, y, w, h); g.fillStyle = `rgba(40,34,28,${a})`;
      for (let k = -h; k < w + h; k += .16) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + .08, y + h); g.lineTo(x + k + .08 + h, y); g.lineTo(x + k + h, y); g.fill(); }
      g.restore();
    }
    function lamp(g, x, y, col, r = .045) { const gr = g.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, col); gr.addColorStop(.3, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 3, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * .25, y - r * .25, r * .45, 0, 7); g.fill(); }
    // a block on footprint (x, y, w, h): the roof covers the top, the front wall (height z) shows at the bottom
    function block(g, x, y, w, h, z, F, o = {}) {
      const roof = o.roof || mix(F.col, '#e8e0d0', .12), wall = o.wall || mix(F.dk, '#3a3028', .35), rh = h - z;
      g.fillStyle = 'rgba(20,14,8,.3)'; g.fillRect(x - .02, y + h - .03, w + .04, .07);
      const wg = g.createLinearGradient(0, y + rh, 0, y + h); wg.addColorStop(0, mix(wall, '#ffffff', .1)); wg.addColorStop(1, mix(wall, '#000000', .3));
      g.fillStyle = wg; g.fillRect(x, y + rh, w, z);
      g.fillStyle = 'rgba(255,255,255,.08)'; for (let k = x + .2; k < x + w - .05; k += .3) g.fillRect(k, y + rh + .02, .015, z - .04);
      if (o.pitch) {                                            // a pitched roof: lit left half, shaded right half
        g.fillStyle = mix(roof, '#ffffff', .2); g.beginPath(); g.moveTo(x, y + rh); g.lineTo(x, y + rh * .35); g.lineTo(x + w / 2, y); g.lineTo(x + w / 2, y + rh); g.closePath(); g.fill();
        g.fillStyle = mix(roof, '#000000', .16); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w, y + rh * .35); g.lineTo(x + w, y + rh); g.lineTo(x + w / 2, y + rh); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = .02; for (let k = .12; k < 1; k += .12) { line(g, [x, y + rh * (.35 + .65 * k), x + w / 2, y + rh * k]); line(g, [x + w / 2, y + rh * k, x + w, y + rh * (.35 + .65 * k)]); }
        g.strokeStyle = mix(roof, '#ffffff', .5); g.lineWidth = .04; line(g, [x + w / 2, y + .01, x + w / 2, y + rh]);
        g.strokeStyle = 'rgba(30,20,12,.6)'; g.lineWidth = .025; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + rh * .35); g.lineTo(x + w / 2, y); g.lineTo(x + w, y + rh * .35); g.lineTo(x + w, y + h); g.closePath(); g.stroke();
      } else {
        const rg = g.createLinearGradient(x, y, x + w * .35, y + rh); rg.addColorStop(0, mix(roof, '#ffffff', .25)); rg.addColorStop(1, mix(roof, '#000000', .1));
        g.fillStyle = rg; g.fillRect(x, y, w, rh);
        if (o.ribs) { g.save(); g.beginPath(); g.rect(x, y, w, rh); g.clip(); for (let k = x + o.ribs * .3; k < x + w; k += o.ribs) { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(k, y, o.ribs * .3, rh); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(k + o.ribs * .3, y, o.ribs * .1, rh); } g.restore(); }
        if (o.saw) { g.save(); g.beginPath(); g.rect(x, y, w, rh); g.clip(); for (let j = y + .12; j < y + rh - .1; j += o.saw) { const sg = g.createLinearGradient(0, j, 0, j + o.saw * .45); sg.addColorStop(0, '#d8ecff'); sg.addColorStop(1, '#5a86b8'); g.fillStyle = sg; g.fillRect(x + .1, j, w - .2, o.saw * .4); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + .1, j + o.saw * .4, w - .2, o.saw * .12); g.strokeStyle = 'rgba(40,60,90,.5)'; g.lineWidth = .015; for (let k = x + .3; k < x + w - .1; k += .3) line(g, [k, j, k, j + o.saw * .4]); } g.restore(); }
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .035; line(g, [x + .02, y + .02, x + w - .02, y + .02]); line(g, [x + .02, y + .02, x + .02, y + rh - .02]);
        g.strokeStyle = 'rgba(30,20,12,.6)'; g.lineWidth = .025; g.strokeRect(x, y, w, h);
      }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y + rh, w, .035);
      return y + rh;                                            // top of the wall
    }
    function windows(g, x, y, w, h, n, R) { const s = w / n; for (let k = 0; k < n; k++) { const lit = R ? R() < .6 : k % 2 === 0, wx = x + k * s + s * .2; g.fillStyle = '#1e2430'; g.fillRect(wx, y, s * .6, h); if (lit) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff2b8'); gr.addColorStop(1, '#f0a040'); g.fillStyle = gr; g.fillRect(wx + .015, y + .015, s * .6 - .03, h - .03); } else { g.fillStyle = 'rgba(140,180,230,.35)'; g.fillRect(wx + .015, y + .015, s * .25, h * .35); } } }
    function cyl(g, cx, cy, r, z, col) {                        // an upright cylinder: (cx, cy) is the centre of its top
      const ry = r * .82, bg = g.createLinearGradient(cx - r, 0, cx + r, 0); bg.addColorStop(0, mix(col, '#ffffff', .3)); bg.addColorStop(.45, col); bg.addColorStop(1, mix(col, '#000000', .4));
      g.fillStyle = 'rgba(20,14,8,.28)'; g.beginPath(); g.ellipse(cx + .05, cy + z + .04, r * 1.02, ry, 0, 0, 7); g.fill();
      g.fillStyle = bg; g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx - r, cy + z); g.ellipse(cx, cy + z, r, ry, 0, Math.PI, 0, true); g.lineTo(cx + r, cy); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(30,20,12,.55)'; g.lineWidth = .022; g.stroke();
    }
    function cap(g, cx, cy, r, c1, c2) { const ry = r * .82, gr = g.createRadialGradient(cx - r * .35, cy - ry * .4, r * .05, cx, cy, r); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, r, ry, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(30,20,12,.5)'; g.lineWidth = .022; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .03; g.beginPath(); g.ellipse(cx, cy, r * .9, ry * .88, 0, 3.4, 4.8); g.stroke(); }
    function pipe(g, pts, w = .08, col = '#8e8a82') { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(20,14,8,.3)'; g.lineWidth = w; g.save(); g.translate(.03, .04); line(g, pts); g.restore(); g.strokeStyle = mix(col, '#000000', .3); g.lineWidth = w; line(g, pts); g.strokeStyle = col; g.lineWidth = w * .7; line(g, pts); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = w * .22; g.save(); g.translate(-w * .15, -w * .15); line(g, pts); g.restore(); g.lineCap = 'butt'; g.lineJoin = 'miter'; }
    function plate(g, F, x, y, r) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + .02, y + .03, r * 1.12, 0, 7); g.fill(); const gr = g.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r * 1.1); gr.addColorStop(0, mix(F.dk, '#ffffff', .25)); gr.addColorStop(1, F.dk); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 1.08, 0, 7); g.fill(); emblem(g, F.emb, x, y, r * .82, F.c2, F.dk); }
    function lattice(g, a, b, w) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L * w / 2, ny = dx / L * w / 2;
      g.strokeStyle = 'rgba(20,14,8,.3)'; g.lineWidth = w * .9; g.save(); g.translate(.05, .06); line(g, [a[0], a[1], b[0], b[1]]); g.restore();
      g.strokeStyle = '#a07818'; g.lineWidth = .03; line(g, [a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny]); line(g, [a[0] - nx, a[1] - ny, b[0] - nx, b[1] - ny]);
      g.strokeStyle = '#f0c040'; g.lineWidth = .022; const n = Math.max(2, Math.round(L / (w * 1.1))); g.beginPath(); for (let k = 0; k <= n; k++) { const t = k / n, s = k % 2 ? 1 : -1; g.lineTo(a[0] + dx * t + nx * s, a[1] + dy * t + ny * s); } g.stroke();
      g.strokeStyle = '#ffe27a'; g.lineWidth = .018; line(g, [a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny]); }
    const BDRAW = {
      bouw: (g, F) => {
        pad(g, .08, .1, 2.84, 2.8, 11);
        g.fillStyle = '#6e6a62'; rr(g, .2, 2.28, 2.6, .52, .06); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(.2, 2.28, 2.6, .05);
        g.fillStyle = '#f0c040'; for (let k = 0; k < 7; k++) g.fillRect(.32 + k * .36, 2.5, .18, .08);
        const wy = block(g, .22, .24, 2.06, 1.95, .44, F, { ribs: .34 });
        plate(g, F, 1.2, .82, .4);
        g.fillStyle = '#2a2622'; g.fillRect(.84, wy + .05, .8, .39); hazard(g, .84, wy + .05, .8, .06); g.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 1; k < 5; k++) g.fillRect(.84, wy + .1 + k * .065, .8, .015);
        windows(g, .3, wy + .12, .46, .16, 2); windows(g, 1.72, wy + .12, .5, .16, 2);
        cyl(g, 2.58, 2.0, .18, .1, '#8a857c'); cap(g, 2.58, 2.0, .18, '#c8c2b6', '#7a756c');
        lattice(g, [2.58, 1.98], [2.58, .42], .16); lattice(g, [2.58, .42], [1.5, .2], .14);
        g.strokeStyle = '#3c3a38'; g.lineWidth = .02; line(g, [1.62, .23, 1.62, .62]); g.fillStyle = '#3c3a38'; g.fillRect(1.56, .6, .12, .08);
        lamp(g, 2.58, .4, 'rgba(255,80,60,.9)'); lamp(g, .34, .34, 'rgba(120,255,140,.8)', .035);
      },
      cent: (g, F) => {
        pad(g, .06, .08, 1.88, 1.86, 22);
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
          const x = .14 + i * .42, y = .16 + j * .5;
          g.fillStyle = 'rgba(20,14,8,.3)'; g.fillRect(x + .04, y + .05, .38, .44);
          g.fillStyle = '#4a4e56'; g.fillRect(x, y, .38, .44);
          const gr = g.createLinearGradient(x, y, x + .3, y + .44); gr.addColorStop(0, '#4a7cc8'); gr.addColorStop(.5, '#1e3d78'); gr.addColorStop(1, '#16305e'); g.fillStyle = gr; g.fillRect(x + .025, y + .025, .33, .39);
          g.strokeStyle = 'rgba(170,210,255,.35)'; g.lineWidth = .012; for (let k = 1; k < 3; k++) line(g, [x + .025 + k * .11, y + .025, x + .025 + k * .11, y + .415]); for (let k = 1; k < 4; k++) line(g, [x + .025, y + .025 + k * .0975, x + .355, y + .025 + k * .0975]);
          g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(x + .03, y + .03); g.lineTo(x + .16, y + .03); g.lineTo(x + .03, y + .2); g.fill();
        }
        cyl(g, 1.42, .98, .45, .3, mix(F.col, '#a09a90', .25));
        g.fillStyle = F.c2; g.fillRect(.97, 1.02, .9, .07);
        cap(g, 1.42, .98, .45, mix(F.col, '#ffffff', .35), F.col);
        const gr = g.createRadialGradient(1.42, .98, .05, 1.42, .98, .36); gr.addColorStop(0, '#151412'); gr.addColorStop(1, '#3e3a36'); g.fillStyle = gr; g.beginPath(); g.ellipse(1.42, .98, .35, .3, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(200,196,188,.35)'; g.lineWidth = .015; for (const r of [.2, .28]) { g.beginPath(); g.ellipse(1.42, .98, r, r * .86, 0, 0, 7); g.stroke(); }
        block(g, 1.06, 1.46, .74, .4, .14, F, { roof: '#9a958c', wall: '#5a5650' });
        g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(1.45, 1.5); g.lineTo(1.37, 1.62); g.lineTo(1.43, 1.62); g.lineTo(1.39, 1.71); g.lineTo(1.49, 1.58); g.lineTo(1.43, 1.58); g.closePath(); g.fill();
        lamp(g, 1.72, 1.55, 'rgba(120,255,140,.9)', .03);
        pipe(g, [.98, 1.7, 1.06, 1.7], .05, '#6a665e');
      },
      raff: (g, F) => {
        pad(g, .06, .08, 2.88, 1.84, 33);
        pipe(g, [1.62, .95, 1.9, .95], .1); pipe(g, [1.62, .6, 1.85, .6], .07, '#a09a8e');
        const wy = block(g, .14, .16, 1.5, 1.3, .34, F, { ribs: .26 });
        plate(g, F, .55, .62, .22);
        windows(g, .22, wy + .1, .6, .14, 3); g.fillStyle = '#2a2622'; g.fillRect(1.0, wy + .04, .5, .3);
        cyl(g, 2.3, .86, .56, .22, '#8a847a'); cap(g, 2.3, .86, .56, '#c4beb2', '#7e786e');
        const cg = g.createRadialGradient(2.2, .66, .04, 2.3, .8, .48); cg.addColorStop(0, '#fff3c0'); cg.addColorStop(.35, '#ffa040'); cg.addColorStop(.72, '#4ab0ff'); cg.addColorStop(1, '#1e4a7a'); g.fillStyle = cg; g.beginPath(); g.arc(2.3, .8, .45, 0, 7); g.fill();
        g.strokeStyle = 'rgba(40,30,20,.6)'; g.lineWidth = .03; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(2.14, .62, .14, .07, -.6, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .02; for (const a of [0, 1.05, 2.1]) { g.beginPath(); g.ellipse(2.3, .8, .45, .45 * Math.abs(Math.cos(a)) + .02, Math.PI / 2, 0, 7); g.stroke(); }
        g.fillStyle = '#3a3530'; rr(g, 1.0, 1.5, 1.0, .4, .04); g.fill(); hazard(g, 1.0, 1.5, 1.0, .05); hazard(g, 1.0, 1.85, 1.0, .05);
        g.fillStyle = '#f0c040'; for (let k = 0; k < 3; k++) { const x = 1.14 + k * .28; g.beginPath(); g.moveTo(x, 1.58); g.lineTo(x + .13, 1.7); g.lineTo(x, 1.82); g.lineTo(x + .07, 1.82); g.lineTo(x + .2, 1.7); g.lineTo(x + .07, 1.58); g.fill(); }
        lamp(g, 2.82, 1.78, 'rgba(255,200,80,.9)', .035); lamp(g, .2, 1.78, 'rgba(255,200,80,.9)', .035);
      },
      silo: (g, F) => {
        pad(g, .06, .08, 1.88, 1.86, 44);
        pipe(g, [.55, .62, 1.45, .62], .07); pipe(g, [.55, 1.42, 1.45, 1.42], .07); pipe(g, [1, .62, 1, 1.42], .07);
        for (const [x, y] of [[.55, .48], [1.45, .48], [.55, 1.28], [1.45, 1.28]]) {
          cyl(g, x, y, .34, .2, '#b4aea2'); g.fillStyle = F.col; g.fillRect(x - .34, y + .1, .68, .07); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - .34, y + .16, .68, .015);
          cap(g, x, y, .34, '#f6f3ec', '#a8a296'); g.fillStyle = '#7a756c'; g.beginPath(); g.ellipse(x + .06, y - .02, .08, .065, 0, 0, 7); g.fill(); g.fillStyle = F.dk; g.beginPath(); g.ellipse(x + .06, y - .03, .05, .04, 0, 0, 7); g.fill();
        }
      },
      kaz: (g, F) => {
        pad(g, .06, .08, 1.88, 1.86, 55);
        const wy = block(g, .16, .18, 1.68, 1.22, .32, F, { pitch: 1 });
        g.fillStyle = '#2c2420'; rr(g, .82, wy + .06, .36, .26, .03); g.fill(); g.fillStyle = 'rgba(255,220,150,.25)'; g.fillRect(.86, wy + .1, .12, .2);
        windows(g, .26, wy + .08, .5, .13, 2); windows(g, 1.24, wy + .08, .5, .13, 2);
        for (const [x0, n] of [[.18, 5], [1.24, 5]]) for (let k = 0; k < n; k++) { const x = x0 + k * .12; g.fillStyle = 'rgba(20,14,8,.25)'; g.beginPath(); g.ellipse(x + .02, 1.72, .075, .055, 0, 0, 7); g.fill(); const gr = g.createLinearGradient(0, 1.62, 0, 1.74); gr.addColorStop(0, '#e2cfa2'); gr.addColorStop(1, '#a8925e'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, 1.68, .075, .055, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(80,60,30,.5)'; g.lineWidth = .012; g.stroke(); }
        g.strokeStyle = '#5a554e'; g.lineWidth = .035; line(g, [1.0, 1.56, 1.0, 1.84]); g.fillStyle = F.col; g.beginPath(); g.moveTo(1.02, 1.56); g.lineTo(1.3, 1.6); g.lineTo(1.02, 1.68); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = .012; g.stroke();
        plate(g, F, 1.0, .62, .17);
      },
      fab: (g, F) => {
        pad(g, .06, .08, 2.88, 2.86, 66);
        g.fillStyle = '#7a756c'; g.fillRect(.86, 2.15, 1.28, .76); hazard(g, .86, 2.15, .07, .76); hazard(g, 2.07, 2.15, .07, .76);
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 5; k++) g.fillRect(.95, 2.24 + k * .14, 1.1, .03);
        const wy = block(g, .14, .2, 2.72, 1.95, .45, F, { saw: .42 });
        g.fillStyle = '#26221e'; g.fillRect(.92, wy + .04, 1.16, .41);
        g.fillStyle = 'rgba(255,255,255,.1)'; for (let k = 0; k < 6; k++) g.fillRect(.92, wy + .07 + k * .065, 1.16, .02);
        hazard(g, .92, wy + .04, 1.16, .05);
        windows(g, .22, wy + .13, .6, .15, 2); windows(g, 2.16, wy + .13, .6, .15, 2);
        plate(g, F, 2.42, .52, .24);
        for (const x of [.42, .76]) { cyl(g, x, .44, .1, .06, '#77726a'); cap(g, x, .44, .1, '#b4aea4', '#5e5a54'); }
        lamp(g, .9, 2.12, 'rgba(255,190,60,.95)', .035); lamp(g, 2.1, 2.12, 'rgba(255,190,60,.95)', .035);
      },
      radar: (g, F) => {
        pad(g, .06, .08, 1.88, 1.86, 77);
        const wy = block(g, .3, .52, 1.4, 1.24, .3, F, { ribs: .23 });
        windows(g, .4, wy + .08, 1.2, .14, 4);
        cyl(g, 1, .9, .2, .12, '#6a665e'); cap(g, 1, .9, .2, '#a6a198', '#5a5650');
        g.strokeStyle = '#4a4744'; g.lineWidth = .03; line(g, [.42, .62, .42, .28]); line(g, [.34, .36, .5, .36]); lamp(g, .42, .26, 'rgba(255,80,60,.9)', .035);
        block(g, 1.5, .2, .34, .3, .1, F, { roof: '#9a958c', wall: '#5a5650' });
      },
      rep: (g, F) => {
        pad(g, .06, .08, 2.88, 1.84, 88);
        g.fillStyle = '#5c5850'; g.fillRect(.95, .26, 1.1, 1.64);
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = .02; for (let k = 0; k < 11; k++) line(g, [.95, .32 + k * .145, 2.05, .32 + k * .145]);
        g.strokeStyle = '#f0c040'; g.lineWidth = .06; g.strokeRect(1.04, .36, .92, 1.44);
        g.save(); g.translate(1.5, 1.1); g.rotate(-.7); g.globalAlpha = .7; g.fillStyle = '#dcd8d0'; g.fillRect(-.06, -.32, .12, .52); g.beginPath(); g.arc(0, -.36, .16, 0, 7); g.fill(); g.fillStyle = '#5c5850'; g.fillRect(-.05, -.58, .1, .2); g.restore();
        const w1 = block(g, .12, .28, .76, 1.3, .32, F, { ribs: .25 }), w2 = block(g, 2.12, .28, .76, 1.3, .32, F, { ribs: .25 });
        windows(g, .16, w1 + .09, .68, .13, 2); windows(g, 2.16, w2 + .09, .68, .13, 2);
        lattice(g, [.5, .3], [2.5, .3], .14);
        g.fillStyle = '#3c3a38'; g.fillRect(1.44, .34, .12, .1); g.strokeStyle = '#3c3a38'; g.lineWidth = .02; line(g, [1.5, .44, 1.5, .7]);
        pipe(g, [.88, 1.7, .98, 1.7, .98, 1.86], .05, '#4a8a4a'); lamp(g, 1.0, 1.84, 'rgba(120,255,140,.9)', .03);
      },
      toren: (g, F) => {
        g.fillStyle = 'rgba(20,14,8,.3)'; oct(g, .55, .6, .47); g.fill();
        const gr = g.createLinearGradient(.1, .1, .8, .9); gr.addColorStop(0, '#c4beb2'); gr.addColorStop(1, '#8a847a'); g.fillStyle = gr; oct(g, .5, .52, .46); g.fill(); g.strokeStyle = 'rgba(40,30,20,.6)'; g.lineWidth = .022; g.stroke();
        g.fillStyle = '#6a655c'; oct(g, .5, .6, .36); g.fill(); g.fillStyle = mix(F.col, '#808080', .2); oct(g, .5, .5, .35); g.fill();
        g.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; g.beginPath(); g.arc(.5 + Math.cos(a) * .4, .52 + Math.sin(a) * .4, .025, 0, 7); g.fill(); }
      },
      rpaal: (g, F) => {
        g.fillStyle = 'rgba(20,14,8,.3)'; rr(g, .14, .18, .82, .82, .12); g.fill();
        const wy = block(g, .1, .1, .8, .82, .16, F, { roof: '#aaa498', wall: '#6a665e' });
        g.fillStyle = F.col; g.fillRect(.1, wy - .1, .8, .08); hazard(g, .12, wy + .03, .76, .05, .8);
      },
    };
    function oct(g, cx, cy, r) { g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }
    const BHEAD = {                                         // rotating heads of towers (facing +x)
      toren: (g, F) => {
        g.fillStyle = '#2e2b28'; g.fillRect(.08, -.06, .46, .12); g.fillStyle = '#56524c'; g.fillRect(.08, -.04, .46, .04); g.fillStyle = '#1e1c1a'; g.fillRect(.5, -.075, .08, .15);
        const gr = g.createRadialGradient(-.07, -.07, .02, 0, 0, .25); gr.addColorStop(0, mix(F.col, '#ffffff', .45)); gr.addColorStop(1, F.dk); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .23, 0, 7); g.fill(); g.strokeStyle = 'rgba(20,14,8,.6)'; g.lineWidth = .022; g.stroke();
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(-.06, 0, .07, 0, 7); g.fill();
      },
      rpaal: (g, F) => {
        const gr = g.createLinearGradient(-.2, -.24, .2, .24); gr.addColorStop(0, '#8a857c'); gr.addColorStop(1, '#45413c'); g.fillStyle = gr; rr(g, -.22, -.25, .46, .5, .06); g.fill(); g.strokeStyle = 'rgba(20,14,8,.6)'; g.lineWidth = .022; g.stroke();
        for (const y of [-.12, .12]) { g.fillStyle = '#26241f'; g.beginPath(); g.arc(.15, y, .08, 0, 7); g.fill(); g.fillStyle = '#e8e4dc'; g.beginPath(); g.arc(.16, y, .045, 0, 7); g.fill(); g.fillStyle = '#c03a2a'; g.beginPath(); g.arc(.17, y, .02, 0, 7); g.fill(); }
        g.fillStyle = F.col; g.fillRect(-.22, -.25, .1, .5);
      },
    };
    function buildings(fi) {
      const F = FACTIONS[fi], out = {}, K = BPX;
      for (const t in BDRAW) {
        const T = BT[t], c = mk(T.w * K + K * .2, T.h * K + K * .2), g = c.getContext('2d'); c.res = K / PX;
        g.save(); g.translate(K * .1, K * .1); g.scale(K, K);
        g.save(); g.translate(.07, .09); g.filter = `blur(${K * .05}px)`; g.globalAlpha = .4; g.fillStyle = '#000'; rr(g, .04, .04, T.w - .06, T.h - .04, .15); g.fill(); g.restore();
        BDRAW[t](g, F); g.restore();
        out[t] = c;
      }
      for (const t in BHEAD) {
        const box = Math.ceil(K * 1.1), c = mk(box * DIRS, box), g = c.getContext('2d'); c.res = K / PX;
        for (let d = 0; d < DIRS; d++) {
          g.save(); g.translate(d * box + box / 2 + K * .04, box / 2 + K * .05); g.scale(K, K); g.rotate(d / DIRS * Math.PI * 2); g.globalAlpha = .3; BHEAD[t](g, Object.assign({}, F, { col: '#000', dk: '#000' })); g.restore();
          g.save(); g.translate(d * box + box / 2, box / 2); g.scale(K, K); g.rotate(d / DIRS * Math.PI * 2); BHEAD[t](g, F); g.restore();
        }
        out[t + 'H'] = { c, box };
      }
      // radar dish (drawn rotating)
      { const box = Math.ceil(K * 1.2), c = mk(box, box), g = c.getContext('2d'); c.res = K / PX; g.translate(box / 2, box / 2); g.scale(K, K);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(.04, .05, .17, .47, 0, 0, 7); g.fill();
        const gr = g.createLinearGradient(-.16, 0, .16, 0); gr.addColorStop(0, '#fbf8f0'); gr.addColorStop(1, '#a8a296'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, .16, .46, 0, 0, 7); g.fill(); g.strokeStyle = '#6a655c'; g.lineWidth = .025; g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = .015; for (const r of [.15, .3]) { g.beginPath(); g.ellipse(0, 0, r * .33, r, 0, 0, 7); g.stroke(); }
        g.strokeStyle = '#5a5650'; g.lineWidth = .025; line(g, [0, -.4, .28, 0, 0, .4]); g.fillStyle = F.col; g.fillRect(-.04, -.04, .3, .08); g.beginPath(); g.arc(.28, 0, .055, 0, 7); g.fill(); out.dish = c; }
      // power plant fan
      { const box = Math.ceil(K * .8), c = mk(box, box), g = c.getContext('2d'); c.res = K / PX; g.translate(box / 2, box / 2); g.scale(K, K);
        for (let k = 0; k < 5; k++) { g.rotate(Math.PI * 2 / 5); const gr = g.createLinearGradient(0, -.06, 0, .06); gr.addColorStop(0, '#e4e0d8'); gr.addColorStop(1, '#8e8a82'); g.fillStyle = gr; g.beginPath(); g.ellipse(.15, 0, .15, .055, .35, 0, 7); g.fill(); }
        g.fillStyle = '#4a4640'; g.beginPath(); g.arc(0, 0, .065, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(-.02, -.02, .025, 0, 7); g.fill(); out.fan = c; }
      return out;
    }
    function buildingIcon(blds, t, size) {
      const c = mk(size, size), g = c.getContext('2d');
      if (t === 'plaat') { const s = size * .72, x = size * .14; g.save(); g.translate(x, x); g.scale(s / 2, s / 2); pad(g, 0, 0, 2, 2, 5); g.restore(); return c; }
      const src = blds[t]; const s = Math.min(size / src.width, size / src.height) * .96; g.imageSmoothingQuality = 'high'; g.drawImage(src, (size - src.width * s) / 2, (size - src.height * s) / 2, src.width * s, src.height * s);
      const K = src.res ? BPX : PX, ox = (size - src.width * s) / 2, oy = (size - src.height * s) / 2, at = (x, y) => [ox + (x + .1) * K * s, oy + (y + .1) * K * s];
      if (BHEAD[t]) { const H = blds[t + 'H'], [x, y] = at(.5, .45); g.drawImage(H.c, 2 * H.box, 0, H.box, H.box, x - H.box * s / 2, y - H.box * s / 2, H.box * s, H.box * s); }
      if (t === 'radar') { const d = blds.dish, q = d.width * s, [x, y] = at(1, .9); g.drawImage(d, x - q / 2, y - q / 2, q, q); }
      if (t === 'cent') { const d = blds.fan, q = d.width * s, [x, y] = at(1.42, .98); g.drawImage(d, x - q / 2, y - q / 2, q, q); }
      return c;
    }

    /* ---------- crystal fields: glowing orange-blue clusters, four sizes, a few variants ---------- */
    function crystals() {
      const out = [], S1 = Math.ceil(PX * 1.3);
      for (let lv = 1; lv <= 4; lv++) for (let v = 0; v < 4; v++) {
        const c = mk(S1, S1), g = c.getContext('2d'), R = rng(lv * 31 + v * 7 + 3), n = [0, 3, 5, 7, 9][lv];
        g.translate(S1 / 2, S1 / 2);
        const gl = g.createRadialGradient(0, 0, 0, 0, 0, S1 * .5); gl.addColorStop(0, `rgba(255,160,60,${.2 + lv * .08})`); gl.addColorStop(.55, `rgba(90,170,255,${.08 + lv * .05})`); gl.addColorStop(1, 'rgba(90,170,255,0)'); g.fillStyle = gl; g.fillRect(-S1 / 2, -S1 / 2, S1, S1);
        const items = []; for (let k = 0; k < n; k++) items.push({ x: (R() - .5) * PX * .8, y: (R() - .5) * PX * .7 + PX * .12, h: PX * (.2 + R() * .2 + lv * .05), w: PX * (.08 + R() * .06 + lv * .01), a: (R() - .5) * .9 });
        items.sort((a, b) => a.y - b.y);
        for (const it of items) {
          g.save(); g.translate(it.x, it.y); g.rotate(it.a);
          g.fillStyle = 'rgba(60,40,20,.3)'; g.beginPath(); g.ellipse(it.w * .4, it.w * .5, it.w * 1.1, it.w * .5, 0, 0, 7); g.fill();
          const gr = g.createLinearGradient(0, -it.h, 0, 0); gr.addColorStop(0, '#d8f2ff'); gr.addColorStop(.3, '#58b4ff'); gr.addColorStop(.65, '#ff9a3a'); gr.addColorStop(1, '#c8561a');
          g.fillStyle = gr; g.beginPath(); g.moveTo(-it.w, 0); g.lineTo(-it.w, -it.h * .75); g.lineTo(0, -it.h); g.lineTo(it.w, -it.h * .75); g.lineTo(it.w, 0); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(-it.w * .6, -it.h * .1); g.lineTo(-it.w * .6, -it.h * .72); g.lineTo(-it.w * .1, -it.h * .9); g.lineTo(-it.w * .1, -it.h * .2); g.closePath(); g.fill();
          g.restore();
        }
        out.push(c);
      }
      return { list: out, size: S1 };
    }

    /* ---------- effect sprites ---------- */
    function glow(size, inner, outer) { const c = mk(size, size), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gr.addColorStop(0, inner); gr.addColorStop(.35, outer); gr.addColorStop(1, outer.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; }
    function puff(size, col) { const c = mk(size, size), g = c.getContext('2d'), R = rng(size * 13 + 1); for (let k = 0; k < 7; k++) { const x = size / 2 + (R() - .5) * size * .35, y = size / 2 + (R() - .5) * size * .35, r = size * (.18 + R() * .14); const gr = g.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } return c; }
    function wreck(fi, big) {
      const s = Math.ceil(PX * (big ? 1.5 : 1.1)), c = mk(s, s), g = c.getContext('2d'), R = rng(fi * 7 + (big ? 3 : 1));
      g.translate(s / 2, s / 2); const gr = g.createRadialGradient(0, 0, 0, 0, 0, s / 2); gr.addColorStop(0, 'rgba(40,30,24,.5)'); gr.addColorStop(1, 'rgba(40,30,24,0)'); g.fillStyle = gr; g.fillRect(-s / 2, -s / 2, s, s);
      for (let k = 0; k < (big ? 9 : 6); k++) { g.save(); g.translate((R() - .5) * s * .45, (R() - .5) * s * .45); g.rotate(R() * 6); g.fillStyle = k % 3 ? '#4a4540' : mix(FACTIONS[fi].dk, '#303030', .4); g.fillRect(-s * .08, -s * .04, s * (.1 + R() * .12), s * (.05 + R() * .06)); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-s * .08, -s * .04, s * .1, s * .015); g.restore(); }
      return c;
    }
    function fx() {
      return {
        flash: glow(48, 'rgba(255,250,220,1)', 'rgba(255,190,80,.55)'),
        fire: glow(64, 'rgba(255,240,180,1)', 'rgba(255,120,30,.6)'),
        blue: glow(48, 'rgba(240,250,255,1)', 'rgba(90,170,255,.55)'),
        gold: glow(48, 'rgba(255,255,230,1)', 'rgba(255,200,60,.55)'),
        smoke: puff(64, ['rgba(120,112,104,.75)', 'rgba(90,84,78,0)']),
        dark: puff(64, ['rgba(70,64,60,.8)', 'rgba(50,46,44,0)']),
        dust: puff(48, ['rgba(226,192,140,.8)', 'rgba(210,170,120,0)']),
        spark: glow(16, 'rgba(255,255,255,1)', 'rgba(255,220,120,.8)'),
        rocket: (() => { const c = mk(24, 10), g = c.getContext('2d'); g.fillStyle = '#e8e4da'; rr(g, 2, 3, 18, 4, 2); g.fill(); g.fillStyle = '#c03a2a'; g.fillRect(16, 3, 5, 4); g.fillStyle = '#6a665e'; g.fillRect(2, 1, 4, 8); return c; })(),
        shell: glow(16, 'rgba(255,255,230,1)', 'rgba(255,200,90,.8)'),
      };
    }
    return { PX, DIRS, CH, PXT, mk, hex, mix, rr, chunk, grain, stamp, emblem, emblemCanvas, sheet, unitIcon, buildings, buildingIcon, crystals, wreck, fx, BOX };
  })();
