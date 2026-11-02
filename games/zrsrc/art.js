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
    function tracks(g, L, y, w, col = '#3a3530') { g.fillStyle = col; rr(g, -L / 2, y - w / 2, L, w, w * .4); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .02; for (let x = -L / 2 + .06; x < L / 2; x += .085) { g.beginPath(); g.moveTo(x, y - w / 2 + .01); g.lineTo(x, y + w / 2 - .01); g.stroke(); } }
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
      lt: (g, F) => { tracks(g, .86, -.25, .17); tracks(g, .86, .25, .17); g.fillStyle = F.col; rr(g, -.36, -.2, .74, .4, .07); g.fill(); g.fillStyle = F.dk; g.fillRect(.26, -.18, .1, .36); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-.3, -.17, .5, .05); },
      zt: (g, F) => { tracks(g, 1, -.31, .2); tracks(g, 1, .31, .2); g.fillStyle = F.col; rr(g, -.42, -.24, .86, .48, .08); g.fill(); g.fillStyle = F.dk; g.fillRect(.3, -.22, .12, .44); g.fillStyle = F.dk; g.fillRect(-.42, -.1, .08, .2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-.36, -.21, .6, .05); },
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
    const TURRET = {
      lt: (g, F) => { g.fillStyle = '#4b4743'; g.fillRect(.05, -.04, .46, .08); g.fillStyle = F.col; g.beginPath(); g.arc(0, 0, .2, 0, 7); g.fill(); g.fillStyle = F.dk; g.beginPath(); g.arc(-.05, 0, .07, 0, 7); g.fill(); },
      zt: (g, F) => { g.fillStyle = '#45413d'; g.fillRect(.08, -.055, .58, .11); g.fillRect(.58, -.075, .1, .15); g.fillStyle = F.col; rr(g, -.24, -.23, .46, .46, .1); g.fill(); g.fillStyle = F.dk; g.fillRect(-.2, -.06, .14, .12); },
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
            if (p.p !== 'c') shadeOn(tg, p.box / 2, p.box / 2, p.box * .45);
            g.drawImage(tmp, d * p.box, y);
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

    /* ---------- buildings (drawn at PX per tile; the front face shows towards the bottom) ---------- */
    function box3(g, x, y, w, h, z, top, side) {          // a block with height z (in tiles) seen slightly from the front
      g.fillStyle = side; g.fillRect(x, y + h - z * .1, w, z * .55); g.fillStyle = top; g.fillRect(x, y - z * .45, w, h);
    }
    const BDRAW = {
      bouw: (g, F) => {
        g.fillStyle = '#b8b2a6'; rr(g, .08, .1, 2.84, 2.8, .12); g.fill();
        g.fillStyle = '#9a948a'; g.fillRect(.2, 2.35, 2.6, .42);
        box3(g, .25, .55, 1.9, 1.45, .7, mix(F.col, '#ffffff', .15), F.dk);
        g.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 4; k++) g.fillRect(.32 + k * .46, .16, .3, 1.36);
        emblem(g, F.emb, 1.2, .8, .42, F.c2, F.dk);
        g.strokeStyle = '#d8b030'; g.lineWidth = .08; g.beginPath(); g.moveTo(2.55, 2.5); g.lineTo(2.55, .55); g.lineTo(1.6, .2); g.stroke();
        g.lineWidth = .03; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(2.47, 2.4 - k * .32); g.lineTo(2.63, 2.24 - k * .32); g.stroke(); }
        g.fillStyle = '#3c3a38'; g.fillRect(1.55, .2, .1, .5);
        g.fillStyle = '#f0c040'; for (let k = 0; k < 7; k++) g.fillRect(.3 + k * .36, 2.48, .18, .1);
      },
      cent: (g, F) => {
        g.fillStyle = '#aaa498'; rr(g, .06, .08, 1.88, 1.86, .1); g.fill();
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { g.fillStyle = '#28406a'; g.fillRect(.14 + i * .42, .18 + j * .5, .38, .44); g.fillStyle = 'rgba(160,210,255,.35)'; g.fillRect(.16 + i * .42, .2 + j * .5, .16, .04); g.strokeStyle = 'rgba(200,230,255,.25)'; g.lineWidth = .015; g.strokeRect(.14 + i * .42, .18 + j * .5, .38, .44); }
        g.fillStyle = F.dk; g.beginPath(); g.ellipse(1.42, 1.18, .44, .5, 0, 0, 7); g.fill();
        g.fillStyle = F.col; g.beginPath(); g.arc(1.42, .98, .44, 0, 7); g.fill();
        g.fillStyle = '#3a3836'; g.beginPath(); g.arc(1.42, .98, .34, 0, 7); g.fill();
        g.fillStyle = '#f0c040'; g.fillRect(1.05, 1.62, .74, .08);
      },
      raff: (g, F) => {
        g.fillStyle = '#aaa498'; rr(g, .06, .08, 2.88, 1.84, .1); g.fill();
        box3(g, .15, .45, 1.6, 1.1, .6, mix(F.col, '#ffffff', .1), F.dk);
        g.fillStyle = 'rgba(255,255,255,.2)'; for (let k = 0; k < 3; k++) g.fillRect(.22 + k * .52, .12, .38, .9);
        g.fillStyle = '#7a7268'; g.beginPath(); g.ellipse(2.3, .95, .55, .62, 0, 0, 7); g.fill();
        const gr = g.createRadialGradient(2.25, .8, .05, 2.3, .85, .5); gr.addColorStop(0, '#fff3c0'); gr.addColorStop(.4, '#ffa040'); gr.addColorStop(.75, '#4ab0ff'); gr.addColorStop(1, '#2a5a8a'); g.fillStyle = gr; g.beginPath(); g.arc(2.3, .8, .46, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .03; g.beginPath(); g.arc(2.3, .8, .46, 3.6, 5); g.stroke();
        g.fillStyle = '#6a6258'; g.fillRect(1.05, 1.55, .9, .4); g.fillStyle = '#f0c040'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(1.15 + k * .28, 1.62); g.lineTo(1.29 + k * .28, 1.78); g.lineTo(1.15 + k * .28, 1.92); g.lineTo(1.22 + k * .28, 1.92); g.lineTo(1.36 + k * .28, 1.78); g.lineTo(1.22 + k * .28, 1.62); g.fill(); }
        emblem(g, F.emb, .55, .65, .22, F.c2, F.dk);
      },
      silo: (g, F) => {
        g.fillStyle = '#aaa498'; rr(g, .06, .08, 1.88, 1.86, .1); g.fill();
        for (const [x, y] of [[.55, .6], [1.45, .6], [.55, 1.42], [1.45, 1.42]]) { g.fillStyle = '#6c665e'; g.beginPath(); g.ellipse(x, y + .1, .36, .36, 0, 0, 7); g.fill(); const gr = g.createRadialGradient(x - .12, y - .14, .03, x, y, .38); gr.addColorStop(0, '#f2efe8'); gr.addColorStop(1, '#a8a296'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, .34, 0, 7); g.fill(); g.strokeStyle = F.col; g.lineWidth = .07; g.beginPath(); g.arc(x, y, .26, 0, 7); g.stroke(); }
      },
      kaz: (g, F) => {
        g.fillStyle = '#aaa498'; rr(g, .06, .08, 1.88, 1.86, .1); g.fill();
        g.fillStyle = F.dk; g.fillRect(.18, .5, 1.64, .95);
        g.fillStyle = F.col; g.beginPath(); g.moveTo(.12, .55); g.lineTo(1.0, .12); g.lineTo(1.88, .55); g.lineTo(1.88, .98); g.lineTo(.12, .98); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(.12, .55); g.lineTo(1.0, .12); g.lineTo(1.0, .98); g.lineTo(.12, .98); g.fill();
        g.fillStyle = '#3c3228'; rr(g, .8, 1.05, .4, .4, .05); g.fill();
        g.fillStyle = '#c8b48a'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(.2 + k * .12, 1.68, .08, .06, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(1.32 + k * .12, 1.68, .08, .06, 0, 0, 7); g.fill(); }
        g.strokeStyle = '#5a554e'; g.lineWidth = .04; g.beginPath(); g.moveTo(1.7, 1.5); g.lineTo(1.7, .9); g.stroke();
      },
      fab: (g, F) => {
        g.fillStyle = '#aaa498'; rr(g, .06, .08, 2.88, 2.86, .12); g.fill();
        box3(g, .15, .55, 2.7, 1.9, .9, mix(F.col, '#ffffff', .1), F.dk);
        g.fillStyle = 'rgba(255,255,255,.22)'; for (let k = 0; k < 5; k++) g.fillRect(.25 + k * .52, .2, .3, 1.6);
        g.fillStyle = '#4c4842'; g.fillRect(.9, 2.1, 1.2, .78);
        g.fillStyle = '#f0c040'; for (let k = 0; k < 5; k++) { g.save(); g.beginPath(); g.rect(.9, 2.1, 1.2, .78); g.clip(); g.fillRect(.86 + k * .3, 2.1, .12, .9); g.restore(); }
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(.9, 2.1, 1.2, .78);
        emblem(g, F.emb, 2.3, .62, .3, F.c2, F.dk);
      },
      radar: (g, F) => {
        g.fillStyle = '#aaa498'; rr(g, .06, .08, 1.88, 1.86, .1); g.fill();
        box3(g, .35, .7, 1.3, 1.0, .5, mix(F.col, '#ffffff', .1), F.dk);
        g.fillStyle = '#5a5650'; g.beginPath(); g.arc(1, .95, .14, 0, 7); g.fill();
      },
      rep: (g, F) => {
        g.fillStyle = '#aaa498'; rr(g, .06, .08, 2.88, 1.84, .1); g.fill();
        g.fillStyle = '#6a665e'; g.fillRect(.95, .3, 1.1, 1.62);
        g.strokeStyle = '#f0c040'; g.lineWidth = .06; g.strokeRect(1.05, .4, .9, 1.4);
        g.save(); g.translate(1.5, 1.1); g.rotate(-.7); g.fillStyle = '#d8d4cc'; g.fillRect(-.06, -.36, .12, .56); g.beginPath(); g.arc(0, -.38, .16, 0, 7); g.fill(); g.fillStyle = '#6a665e'; g.fillRect(-.05, -.6, .1, .2); g.restore();
        box3(g, .12, .45, .7, 1.1, .5, F.col, F.dk); box3(g, 2.18, .45, .7, 1.1, .5, F.col, F.dk);
        g.strokeStyle = '#d8b030'; g.lineWidth = .06; g.beginPath(); g.moveTo(.47, .3); g.lineTo(1.3, .3); g.moveTo(2.53, .3); g.lineTo(1.7, .3); g.stroke();
      },
      toren: (g, F) => { g.fillStyle = '#8c867c'; g.beginPath(); g.arc(.5, .55, .46, 0, 7); g.fill(); g.fillStyle = '#b0aa9e'; g.beginPath(); g.arc(.5, .48, .42, 0, 7); g.fill(); g.strokeStyle = F.col; g.lineWidth = .07; g.beginPath(); g.arc(.5, .48, .36, 0, 7); g.stroke(); },
      rpaal: (g, F) => { g.fillStyle = '#7c766c'; rr(g, .1, .14, .8, .82, .12); g.fill(); g.fillStyle = '#aaa498'; rr(g, .14, .08, .72, .76, .12); g.fill(); g.fillStyle = F.col; g.fillRect(.14, .64, .72, .12); },
    };
    const BHEAD = {                                         // rotating heads of towers (facing +x)
      toren: (g, F) => { g.fillStyle = '#3c3936'; g.fillRect(.05, -.05, .42, .1); g.fillStyle = F.dk; g.beginPath(); g.arc(0, 0, .22, 0, 7); g.fill(); g.fillStyle = F.col; g.beginPath(); g.arc(-.02, -.02, .17, 0, 7); g.fill(); },
      rpaal: (g, F) => { g.fillStyle = '#56524c'; rr(g, -.2, -.24, .44, .48, .06); g.fill(); g.fillStyle = '#2a2826'; for (const y of [-.12, .12]) { g.beginPath(); g.arc(.16, y, .07, 0, 7); g.fill(); } g.fillStyle = '#e8e4dc'; for (const y of [-.12, .12]) { g.beginPath(); g.arc(.17, y, .04, 0, 7); g.fill(); } g.fillStyle = F.col; g.fillRect(-.2, -.24, .1, .48); },
    };
    function buildings(fi) {
      const F = FACTIONS[fi], out = {};
      for (const t in BDRAW) {
        const T = BT[t], c = mk(T.w * PX + PX * .2, T.h * PX + PX * .2), g = c.getContext('2d');
        g.save(); g.translate(PX * .1, PX * .1); g.scale(PX, PX);
        g.save(); g.translate(.06, .08); g.filter = 'blur(2px)'; g.globalAlpha = .35; g.fillStyle = '#000'; rr(g, .04, .04, T.w - .04, T.h - .02, .15); g.fill(); g.restore();
        BDRAW[t](g, F); g.restore();
        out[t] = c;
      }
      for (const t in BHEAD) {
        const box = Math.ceil(PX * 1.1), c = mk(box * DIRS, box), g = c.getContext('2d');
        for (let d = 0; d < DIRS; d++) { g.save(); g.translate(d * box + box / 2, box / 2); g.scale(PX, PX); g.rotate(d / DIRS * Math.PI * 2); BHEAD[t](g, F); g.restore(); }
        out[t + 'H'] = { c, box };
      }
      // radar dish (drawn rotating)
      { const box = Math.ceil(PX * 1.2), c = mk(box, box), g = c.getContext('2d'); g.translate(box / 2, box / 2); g.scale(PX, PX); g.fillStyle = '#e8e4da'; g.beginPath(); g.ellipse(0, 0, .16, .46, 0, 0, 7); g.fill(); g.strokeStyle = '#8a857c'; g.lineWidth = .03; g.stroke(); g.fillStyle = F.col; g.fillRect(-.04, -.04, .3, .08); g.beginPath(); g.arc(.28, 0, .05, 0, 7); g.fill(); out.dish = c; }
      // power plant fan
      { const box = Math.ceil(PX * .8), c = mk(box, box), g = c.getContext('2d'); g.translate(box / 2, box / 2); g.scale(PX, PX); g.fillStyle = '#c8c4bc'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.ellipse(.15, 0, .15, .06, .3, 0, 7); g.fill(); } g.fillStyle = '#6a665e'; g.beginPath(); g.arc(0, 0, .06, 0, 7); g.fill(); out.fan = c; }
      return out;
    }
    function buildingIcon(blds, t, size) {
      const c = mk(size, size), g = c.getContext('2d');
      if (t === 'plaat') { g.fillStyle = '#b0aca0'; rr(g, size * .14, size * .14, size * .72, size * .72, size * .06); g.fill(); g.strokeStyle = '#8a867c'; g.lineWidth = 2; g.beginPath(); g.moveTo(size / 2, size * .14); g.lineTo(size / 2, size * .86); g.moveTo(size * .14, size / 2); g.lineTo(size * .86, size / 2); g.stroke(); return c; }
      const src = blds[t]; const s = Math.min(size / src.width, size / src.height) * .96; g.drawImage(src, (size - src.width * s) / 2, (size - src.height * s) / 2, src.width * s, src.height * s);
      if (BHEAD[t]) { const H = blds[t + 'H']; g.drawImage(H.c, 2 * H.box, 0, H.box, H.box, size / 2 - H.box * s / 2, size / 2 - H.box * s / 2 - 1, H.box * s, H.box * s); }
      if (t === 'radar') { const d = blds.dish, q = d.width * s; g.drawImage(d, size / 2 - q / 2, size / 2 - q / 2 - 2, q, q); }
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
    return { PX, DIRS, CH, PXT, mk, hex, mix, rr, chunk, stamp, emblem, emblemCanvas, sheet, unitIcon, buildings, buildingIcon, crystals, wreck, fx, BOX };
  })();
