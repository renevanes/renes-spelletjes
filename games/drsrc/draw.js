  /* ================= draw.js: camera, parallax city, pre-rendered level chunks, objects, effects ================= */
  const THEME = [
    { sky: ['#5fb8f2', '#a8dcff', '#ffe5bd'], sun: '#fff4c8', far: ['#b4cce4', '#a2bcd8'], mid: ['#8aa2c2', '#7890b2'], near: ['#5f6f8e', '#4f5e7c'],
      fac: ['#f2dcb6', '#e8a272', '#d97a5c', '#f2c56c', '#cfd9a8', '#ecb6a2', '#bcd3e0'], win: ['#3d6690', '#26476b'], frame: '#fffaf0', shut: ['#3f8a5a', '#3a6aa8', '#a8463a'],
      coping: '#f7f0e2', edge: 'rgba(60,30,20,.22)', roof: ['#c9573c', '#93362a'], box: ['#b9c2c9', '#7c868f'], wall: ['#b8573f', '#8c3e2c'], pipe: ['#9aa6b0', '#5f6b75'], deco: 'rgba(60,50,60,.55)' },
    { sky: ['#ffa86a', '#ffcf8f', '#fff0c8'], sun: '#fff3c0', far: ['#e3b796', '#d6a585'], mid: ['#b98a74', '#a67a66'], near: ['#7a5a52', '#6a4c46'],
      fac: ['#b9b5ad', '#a9a49b', '#c4bfb4', '#9f9a92'], win: ['#2c2b33', '#1c1b22'], frame: '#8a857c', shut: ['#ff8a1f'], coping: '#d8d3c8', edge: 'rgba(30,25,20,.25)', roof: ['#b98a52', '#86602f'],
      box: ['#d9a35a', '#a8742e'], wall: ['#9a958c', '#6f6a62'], pipe: ['#e0782a', '#a8501a'], deco: 'rgba(70,45,35,.5)' },
    { sky: ['#4fb6ec', '#9fdcff', '#e6f8ff'], sun: '#ffffff', far: ['#9cc4dc', '#8cb6d2'], mid: ['#6f93b0', '#5f84a2'], near: ['#4a6680', '#3e5870'],
      fac: ['#d24a33', '#2a78c0', '#2f9a62', '#eaa23c', '#7d4cb3', '#d8d0bd', '#1f9aa8'], win: ['#1d3550', '#122436'], frame: '#c9d2da', shut: ['#fff'], coping: '#e0e6ea', edge: 'rgba(10,20,40,.28)', roof: ['#8a96a0', '#5d6870'],
      box: ['#e0a03a', '#a86f1c'], wall: ['#7d8a96', '#56626e'], pipe: ['#ffcc33', '#c89810'], deco: 'rgba(30,45,70,.5)' },
    { sky: ['#0a0a26', '#1e1450', '#4a2066'], sun: '#fff8e0', far: ['#2a2458', '#251f4e'], mid: ['#1c1840', '#171436'], near: ['#100e26', '#0c0a1e'],
      fac: ['#23264a', '#2a2150', '#1e2b4a', '#2e2446', '#252a52'], win: ['#141630', '#0d0f22'], frame: '#3a3f6a', shut: ['#5ef0ff', '#ff5ad8', '#ffd84a', '#9a7aff'],
      coping: '#4a5288', edge: 'rgba(0,0,0,.35)', roof: ['#3a3f6a', '#262a4a'], box: ['#5a6288', '#3a4064'], wall: ['#34395e', '#252946'], pipe: ['#6a72a0', '#454b72'], deco: 'rgba(5,5,20,.55)' },
  ];
  const NEON_WORDS = ['SNACKBAR', 'OPEN', 'PIZZA', 'HOTEL', 'BIOS', 'DISCO', 'FRIET', 'LEKKER', 'IJS', 'NACHT', 'SUPER', 'DANSEN'];
  const Draw = (() => {
    const TAU = Math.PI * 2, CW = 16, CH = 8, MG = .3;
    const hsh = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    function create(cv) {
      let g = cv.getContext('2d', { alpha: false });
      const R = { W: 0, H: 0, dpr: 1, cam: { x: 0, y: 0, vh: 12.5, sx: 0, sy: 0 }, L: null, th: THEME[0], wi: 0, chunks: new Map(), cu: 40, shake: 0, st: { paints: 0, paintMs: 0 }, optShake: true, t: 0, q: 1 };
      const rag = { R: null, J: {} };
      const J = {}, GJ = {};
      /* ---------- particles (pooled, no allocations per frame) ---------- */
      const NP = 260, P = { x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP), l: new Float32Array(NP), ml: new Float32Array(NP), s: new Float32Array(NP), k: new Uint8Array(NP), c: new Array(NP).fill('#fff'), g: new Float32Array(NP) };
      let pn = 0;
      function part(k, x, y, vx, vy, life, s, col, grav = 0) {
        let i = -1; for (let j = 0; j < NP; j++) { const q = (pn + j) % NP; if (P.l[q] <= 0) { i = q; break; } }
        if (i < 0) i = pn; pn = (i + 1) % NP;
        P.k[i] = k; P.x[i] = x; P.y[i] = y; P.vx[i] = vx; P.vy[i] = vy; P.l[i] = life; P.ml[i] = life; P.s[i] = s; P.c[i] = col; P.g[i] = grav;
      }
      let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const dust = (x, y, n, sp = 1, col = 'rgba(235,225,210,.85)') => { for (let i = 0; i < n; i++) part(0, x + (rnd() - .5) * .5, y - .05, (rnd() - .5) * 3 * sp, -rnd() * 1.4 * sp, .35 + rnd() * .3, .12 + rnd() * .12, col, -.3); };
      const sparks = (x, y, n, col = '#ffd27a') => { for (let i = 0; i < n; i++) { const a = rnd() * TAU, v = 2 + rnd() * 5; part(1, x, y, Math.cos(a) * v, Math.sin(a) * v - 1, .3 + rnd() * .3, .05, col, 1); } };
      const stars = (x, y, n, col = '#fff3a0') => { for (let i = 0; i < n; i++) { const a = rnd() * TAU, v = 1.5 + rnd() * 3; part(2, x, y, Math.cos(a) * v, Math.sin(a) * v, .5 + rnd() * .3, .13 + rnd() * .08, col, .2); } };
      const confetti = (x, y, n) => { const cols = ['#ff5a6a', '#ffd23a', '#5ad06a', '#4aa8ff', '#c46aff', '#fff']; for (let i = 0; i < n; i++) part(3, x + (rnd() - .5) * 3, y - rnd() * 2, (rnd() - .5) * 6, -4 - rnd() * 6, 1.6 + rnd() * .8, .12, cols[i % cols.length], .55); };
      const splash = (x, y) => { for (let i = 0; i < 26; i++) part(4, x + (rnd() - .5) * .8, y, (rnd() - .5) * 5, -3 - rnd() * 7, .8, .08 + rnd() * .06, i % 3 ? '#bfe9ff' : '#ffffff', 1.2); };
      const debris = (x, y, col) => { for (let i = 0; i < 7; i++) part(5, x + rnd(), y + rnd() * .3, (rnd() - .5) * 2, rnd() * 2, .9, .12 + rnd() * .1, col, 1.2); };

      /* ---------- sizing ---------- */
      R.resize = (w, h, dpr) => {
        R.W = w; R.H = h; R.dpr = dpr;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        R.lock = R.q >= 1;                                           // lower quality: fixed zoom, chunks blitted 1:1 on whole pixels
        R.cu = Math.max(16, Math.round(h / (R.lock ? 13 : 12) * dpr));  // chunk resolution: device px per tile (at the closest zoom)
        R.chunks.clear(); R.bg = null; R.sky = null; R.bb = null;
      };
      R.setLevel = (L, wi) => { R.L = L; R.wi = wi; R.th = THEME[wi]; R.chunks.clear(); R.bg = null; R.sky = null; neonCache = null; };
      R.setQuality = q => { R.q = q; };
      R.view = () => R.lock ? R.H / (R.cu / R.dpr) : 12.5;

      /* ---------- camera ---------- */
      R.reset = S => {
        rag.R = null; for (let i = 0; i < NP; i++) P.l[i] = 0;
        if (S) { R.cam.x = S.x + 3; R.cam.y = S.y - 2.5; R.cam.vh = 12.5; R.cam.lx = 3; }
      };
      function camera(S, dt) {
        const C = R.cam, L = R.L, sp = Math.hypot(S.vx, S.vy * .4);
        const want = R.lock ? R.H / (R.cu / R.dpr) : 12.2 + Math.min(3, Math.max(0, sp - 8) * .45);
        C.vh = R.lock ? want : C.vh + (want - C.vh) * Math.min(1, dt * 1.6);
        const aspect = R.W / Math.max(1, R.H), vw = C.vh * aspect;
        const look = S.st === 9 || S.st === 10 ? 0 : Math.max(-3, Math.min(vw * .22, S.vx * .32 + (S.face || 1) * 1.2));
        C.lx = C.lx == null ? look : C.lx + (look - C.lx) * Math.min(1, dt * 2.2);
        const tx = S.x + C.lx, ty = S.y - 1.2 - C.vh * .12;
        C.x += (tx - C.x) * Math.min(1, dt * 8); C.y += (ty - C.y) * Math.min(1, dt * (Math.abs(ty - C.y) > 2.5 ? 10 : 3.6));
        C.x = Math.max(vw / 2 - 1, Math.min(L.W - vw / 2 + 1, C.x));
        C.y = Math.min(L.H + .6 - C.vh / 2, Math.max(C.vh / 2 - 6, C.y));
      }

      /* ---------- sky and parallax layers ---------- */
      function makeSky() {
        const W = R.W, H = R.H, d = R.dpr, T = R.th, c = document.createElement('canvas'); const kk = R.q === 0 ? .6 : .5; c.width = Math.max(2, Math.round(W * d * kk)); c.height = Math.max(2, Math.round(H * d * kk));
        const x = c.getContext('2d'), sw = c.width, sh = c.height;
        const gr = x.createLinearGradient(0, 0, 0, sh); gr.addColorStop(0, T.sky[0]); gr.addColorStop(.6, T.sky[1]); gr.addColorStop(1, T.sky[2]); x.fillStyle = gr; x.fillRect(0, 0, sw, sh);
        if (R.wi === 3) {
          for (let i = 0; i < 90; i++) { const a = hsh(i, 7); x.fillStyle = `rgba(255,255,255,${.25 + hsh(i, 9) * .6})`; const s = hsh(i, 3) < .1 ? 2 : 1; x.fillRect(hsh(i, 1) * sw, hsh(i, 2) * sh * .7, s * d * .5 + .5, s * d * .5 + .5); }
          const mx = sw * .78, my = sh * .2, mr = sh * .09;
          const mg = x.createRadialGradient(mx, my, mr * .5, mx, my, mr * 3); mg.addColorStop(0, 'rgba(255,240,200,.35)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = mg; x.fillRect(0, 0, sw, sh);
          x.fillStyle = T.sun; x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fill(); x.fillStyle = 'rgba(30,20,60,.18)'; x.beginPath(); x.arc(mx - mr * .3, my - mr * .2, mr * .25, 0, TAU); x.arc(mx + mr * .35, my + mr * .3, mr * .18, 0, TAU); x.fill();
        } else {
          const mx = sw * (R.wi === 1 ? .2 : .82), my = sh * (R.wi === 1 ? .55 : .2), mr = sh * (R.wi === 1 ? .14 : .08);
          const mg = x.createRadialGradient(mx, my, mr * .4, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,250,220,.6)'); mg.addColorStop(1, 'rgba(255,250,220,0)'); x.fillStyle = mg; x.fillRect(0, 0, sw, sh);
          x.fillStyle = T.sun; x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fill();
        }
        R.sky = c;
      }
      // one horizontally repeating strip per layer, drawn once per level / size
      function makeBg() {
        const H = R.H, d = R.dpr * (R.q === 0 ? .6 : .5), SW = Math.round(Math.max(900, R.W * 1.2)), wi = R.wi, T = R.th;
        R.bg = [.1, .24, .45].map((f, li) => {
          const c = document.createElement('canvas'), hh = Math.round(H * (.62 + li * .1)); c.width = Math.round(SW * d); c.height = Math.round(hh * d);
          const x = c.getContext('2d'); x.scale(d, d);
          const col = li === 0 ? T.far : li === 1 ? T.mid : T.near, unit = H / 12 * (.45 + li * .2);
          let px = 0, k = li * 1000 + wi * 77;
          const hr = (a, b) => hsh(k++, a * 13 + b);
          while (px < SW) {
            const w = unit * (1.8 + hr(1, 2) * 2.6), h = unit * (2.5 + hr(3, 4) * (li === 0 ? 6 : 4.5)) * (wi === 3 ? 1.5 : 1), y = hh - h;
            x.fillStyle = hr(5, 6) < .5 ? col[0] : col[1];
            if (wi === 0) {                                          // Dutch gables, towers and a windmill
              const kind = hr(7, 8);
              if (kind < .12 && li === 0) { x.fillRect(px + w * .35, y - unit * 3, w * .3, h + unit * 3); x.beginPath(); x.moveTo(px + w * .3, y - unit * 3); x.lineTo(px + w * .5, y - unit * 6); x.lineTo(px + w * .7, y - unit * 3); x.fill(); }
              else if (kind < .2 && li === 1) { const mx = px + w / 2, my = y + unit * .5; x.beginPath(); x.moveTo(mx - unit * .8, hh); x.lineTo(mx - unit * .45, my); x.lineTo(mx + unit * .45, my); x.lineTo(mx + unit * .8, hh); x.fill(); x.save(); x.translate(mx, my); x.rotate(hr(9, 1)); x.fillRect(-unit * .12, -unit * 2.6, unit * .24, unit * 5.2); x.fillRect(-unit * 2.6, -unit * .12, unit * 5.2, unit * .24); x.restore(); }
              else { x.fillRect(px, y, w, h); const gs = hr(2, 9); x.beginPath(); if (gs < .4) { x.moveTo(px, y); x.lineTo(px + w / 2, y - w * .45); x.lineTo(px + w, y); } else if (gs < .75) { for (let s = 0; s < 3; s++) x.rect(px + w * (s * .17), y - unit * .5 * s, w * (1 - s * .34), unit * .5); } x.fill(); }
              if (li === 2) { x.fillStyle = 'rgba(255,240,200,.18)'; for (let wy = y + unit * .6; wy < hh - unit * .4; wy += unit) for (let wx = px + unit * .35; wx < px + w - unit * .5; wx += unit * .9) x.fillRect(wx, wy, unit * .4, unit * .55); }
            } else if (wi === 1) {                                   // cranes and half-built frames
              const kind = hr(7, 8);
              if (kind < .22 && li < 2) { const mx = px + w / 2, top = y - unit * 3; x.fillRect(mx - unit * .15, top, unit * .3, hh - top); x.fillRect(mx - unit * 4, top, unit * 7, unit * .25); x.fillRect(mx - unit * .5, top - unit * .8, unit * 1, unit * .8); x.fillRect(mx + unit * 2.5, top + unit * .25, unit * .04 + 1, unit * 2.2); x.fillRect(mx - unit * 3.8, top + unit * .25, unit * .9, unit * .6); }
              else { x.fillRect(px, y, w, h); x.fillStyle = 'rgba(0,0,0,.12)'; for (let fy = y + unit; fy < hh; fy += unit * 1.2) x.fillRect(px, fy, w, unit * .12); }
            } else if (wi === 2) {                                   // ships, gantry cranes, container stacks
              const kind = hr(7, 8);
              if (kind < .25 && li > 0) { const top = y - unit * 2; x.fillRect(px, top, unit * .35, hh - top); x.fillRect(px + w - unit * .35, top, unit * .35, hh - top); x.fillRect(px - unit, top, w + unit * 3, unit * .45); x.fillRect(px + w * .4, top + unit * .45, unit * .6, unit * .5); }
              else if (kind < .4 && li === 0) { x.beginPath(); x.moveTo(px, hh - unit * 1.2); x.lineTo(px + w * 1.6, hh - unit * 1.2); x.lineTo(px + w * 1.45, hh); x.lineTo(px + w * .1, hh); x.fill(); x.fillRect(px + w * .9, hh - unit * 3, w * .4, unit * 1.8); }
              else { const bh = unit * .9; for (let yy = hh - bh; yy > y; yy -= bh) { x.fillStyle = hr(yy | 0, 3) < .5 ? col[0] : col[1]; x.fillRect(px, yy, w, bh - 1); } }
            } else {                                                 // night towers with windows and neon
              x.fillRect(px, y, w, h);
              if (hr(9, 9) < .3) { x.fillRect(px + w * .45, y - unit * 1.5, unit * .08 + 1, unit * 1.5); }
              const lit = li === 0 ? .25 : li === 1 ? .35 : .45;
              for (let wy = y + unit * .4; wy < hh - unit * .3; wy += unit * .55) for (let wx = px + unit * .25; wx < px + w - unit * .3; wx += unit * .45) { const q = hsh(wx | 0, wy | 0); if (q < lit) { x.fillStyle = q < lit * .25 ? 'rgba(255,90,216,.55)' : q < lit * .5 ? 'rgba(94,240,255,.5)' : 'rgba(255,226,140,.45)'; x.fillRect(wx, wy, unit * .2, unit * .26); } }
              x.fillStyle = col[0];
            }
            px += w + unit * (li === 0 ? hr(4, 4) * 1.5 : hr(4, 4) * .8);
          }
          return { c, f, w: SW, h: hh };
        });
      }
      let clouds = null;
      function drawBack() {
        const W = R.W, H = R.H, C = R.cam, k = R.q === 0 ? .6 : R.q >= 3 ? .5 : .5, d = R.dpr * k;
        if (!R.bb) { R.bb = document.createElement('canvas'); R.bb.width = Math.max(2, Math.round(W * d)); R.bb.height = Math.max(2, Math.round(H * d)); R.bbg = R.bb.getContext('2d', { alpha: false }); }
        const g0 = g; g = R.bbg; const cvw = R.bb.width, cvh = R.bb.height;
        try { drawBackInto(W, H, C, d, cvw, cvh); } finally { g = g0; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(R.bb, 0, 0, cv.width, cv.height);
      }
      function drawBackInto(W, H, C, d, cvw, cvh) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (!R.sky) makeSky(); g.drawImage(R.sky, 0, 0, cvw, cvh);
        if (R.wi !== 3 && R.q < 3) {
          if (!clouds) clouds = Array.from({ length: 6 }, (_, i) => ({ x: hsh(i, 1), y: .08 + hsh(i, 2) * .3, s: .6 + hsh(i, 3) * .8 }));
          g.fillStyle = R.wi === 1 ? 'rgba(255,240,220,.7)' : 'rgba(255,255,255,.75)';
          for (const q of clouds) {
            const span = W + 300, x = (((q.x * span - C.x * H / 12 * .04 - R.t * 6 * q.s) % span) + span) % span - 150, y = q.y * H, s = q.s * H / 9;
            g.beginPath(); g.ellipse(x * d, y * d, s * 1.2 * d, s * .35 * d, 0, 0, TAU); g.ellipse((x + s * .5) * d, (y - s * .2) * d, s * .6 * d, s * .4 * d, 0, 0, TAU); g.ellipse((x - s * .4) * d, (y - s * .1) * d, s * .5 * d, s * .3 * d, 0, 0, TAU); g.fill();
          }
        }
        if (!R.bg) makeBg();
        const u = H / C.vh;
        for (const b of R.bg) {
          const off = ((C.x * u * b.f) % b.w + b.w) % b.w, y = H - b.h * (1 - b.f * .2) + (R.L.H * .62 - C.y) * u * b.f * .35 + H * .06;
          for (let x = -off; x < W; x += b.w) g.drawImage(b.c, Math.round(x * d), Math.round(y * d), Math.round(b.w * d), Math.round(b.h * d));
          if (y + b.h < H) { g.fillStyle = b.f === .45 ? R.th.near[1] : b.f === .24 ? R.th.mid[1] : R.th.far[1]; g.fillRect(0, Math.round((y + b.h) * d) - 1, cvw, cvh); }
        }
      }

      /* ---------- the level, pre-rendered in chunks ---------- */
      const tileAt = (c, r) => { const L = R.L; if (c < 0 || c >= L.W || r < 0 || r >= L.H) return 0; return L.t[r * L.W + c]; };
      const matAt = (c, r) => { const L = R.L; if (c < 0 || c >= L.W || r < 0 || r >= L.H) return 0; return L.mat[r * L.W + c]; };
      const bidAt = (c, r) => { const L = R.L; if (c < 0 || c >= L.W || r < 0 || r >= L.H) return 0; return L.bid[r * L.W + c]; };
      const solidT = v => v === 1 || v === 9 || v === 10;
      function facCol(b) { const f = R.th.fac; return f[Math.floor(hsh(b, R.wi + 3) * f.length)]; }
      // a chunk with nothing in it (open sky) is never painted or drawn
      const EMPTY = {};
      function chunkUsed(ci, cj) {
        const L = R.L, x0 = ci * CW - 3, x1 = (ci + 1) * CW + 3, y0 = cj * CH - 3, y1 = (cj + 1) * CH + 7;
        for (let c = Math.max(0, x0); c < Math.min(L.W, x1); c++) for (let r = Math.max(0, y0); r < Math.min(L.H, y1); r++) if (L.t[r * L.W + c]) return true;
        const near = (xa, xb, ya) => xb > x0 && xa < x1 && ya < y1;                // things that hang down to the bottom (poles)
        for (const q of L.deco) if (near(q.x - 2, q.x + 2, q.y + 1) && q.y - 4 < y1) return true;
        for (const Z of L.zips) if (near(Math.min(Z.x0, Z.x1), Math.max(Z.x0, Z.x1), Math.min(Z.y0, Z.y1) - 1)) return true;
        for (const B of L.bars) if (near(B.x - 1, B.x + 1, B.y - 1)) return true;
        for (const Z of L.lasers) if (near(Z.x - 1, Z.x + 1, Z.y0 - 3) && Z.y1 > y0) return true;
        for (const V of L.vents) if (near(V.x0, V.x1, V.y1 - 1) && V.y1 > y0) return true;
        for (const Pl of L.plats) if (Pl.look === 1 && near(Math.min(Pl.x, Pl.x + Pl.mx) - 2, Math.max(Pl.x, Pl.x + Pl.mx) + Pl.w + 2, Math.min(Pl.y, Pl.y + Pl.my) - 5) && Math.min(Pl.y, Pl.y + Pl.my) - 4 < y1) return true;
        for (let c = Math.max(0, x0); c < Math.min(L.W, x1); c++) for (let r = 0; r < Math.min(L.H, y1); r++) if (L.t[r * L.W + c] === 12) return true;   // scaffolding poles
        return false;
      }
      function chunk(ci, cj) {
        const key = ci * 1000 + cj; let c = R.chunks.get(key); if (c) return c;
        if (!chunkUsed(ci, cj)) { R.chunks.set(key, EMPTY); return EMPTY; }
        if (R.chunks.size > 64) R.chunks.delete(R.chunks.keys().next().value);
        const t0 = performance.now(); R.st.paints++;
        c = document.createElement('canvas'); const cu = R.cu; c.width = Math.ceil((CW + MG * 2) * cu); c.height = Math.ceil((CH + MG * 2) * cu);
        const x = c.getContext('2d'); x.setTransform(cu, 0, 0, cu, (-ci * CW + MG) * cu, (-cj * CH + MG) * cu);
        paintArea(x, ci * CW - 1, cj * CH - 1, (ci + 1) * CW + 1, (cj + 1) * CH + 1);
        R.chunks.set(key, c); R.st.paintMs += performance.now() - t0; return c;
      }
      function paintArea(x, c0, r0, c1, r1) {
        const L = R.L, T = R.th, wi = R.wi;
        c0 = Math.max(0, c0); c1 = Math.min(L.W, c1); r0 = Math.max(0, r0); r1 = Math.min(L.H, r1);
        x.lineCap = 'butt'; x.lineJoin = 'miter';
        // static decorations behind the buildings' front (antennas, chimneys, tanks)
        for (const q of L.deco) if (q.x > c0 - 4 && q.x < c1 + 4) decoItem(x, q);
        // poles under scaffolding planks, cables, bars, crane rails
        for (let c = c0; c < c1; c++) for (let r = r0 - 2; r < r1; r++) if (tileAt(c, r) === 12) { x.fillStyle = 'rgba(90,70,50,.7)'; const e = matAt(c, r) === 0 ? 0 : 1; if (bidAt(c, r) !== 0 || c % 3 === 0) x.fillRect(c + .45, r + .2, .1, L.H - r); }
        // the buildings: facade columns
        for (let c = c0; c < c1; c++) {
          for (let r = Math.max(0, r0 - 1); r < r1; r++) {
            const v = tileAt(c, r); if (!v) continue;
            const m = matAt(c, r);
            if ((v === 1) && m === 0) {
              let r2 = r; while (r2 + 1 < r1 + 1 && r2 + 1 < L.H && tileAt(c, r2 + 1) === 1 && matAt(c, r2 + 1) === 0 && bidAt(c, r2 + 1) === bidAt(c, r)) r2++;
              x.fillStyle = facCol(bidAt(c, r)); x.fillRect(c - .01, r - .01, 1.02, r2 - r + 1.02);
              r = r2;
            } else if (v >= 2 && v <= 7) slopeTile(x, c, r, v);
          }
        }
        // facade details per building
        for (const b of L.bld) { if (b.x1 < c0 - 1 || b.x0 > c1 + 1) continue; facade(x, b, c0, r0, c1, r1); }
        // exposed edges: coping on tops, shade on sides
        for (let c = c0; c < c1; c++) for (let r = r0; r < r1; r++) {
          const v = tileAt(c, r); if (v !== 1 || matAt(c, r) !== 0) continue;
          const up = tileAt(c, r - 1);
          if (!solidT(up) && !(up >= 2 && up <= 7)) {
            x.fillStyle = T.coping; const l = !solidT(tileAt(c - 1, r)) && !(tileAt(c - 1, r) >= 2 && tileAt(c - 1, r) <= 7) ? .12 : 0, rr = !solidT(tileAt(c + 1, r)) && !(tileAt(c + 1, r) >= 2 && tileAt(c + 1, r) <= 7) ? .12 : 0;
            x.fillRect(c - l, r - .02, 1 + l + rr, .2); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(c - l, r + .18, 1 + l + rr, .06);
            if (wi === 3) { x.fillStyle = 'rgba(94,240,255,.55)'; x.fillRect(c - l, r + .2, 1 + l + rr, .03); }
          }
          if (!solidT(tileAt(c - 1, r)) && !(tileAt(c - 1, r) >= 2 && tileAt(c - 1, r) <= 7)) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(c, r, .08, 1); }
          if (!solidT(tileAt(c + 1, r)) && !(tileAt(c + 1, r) >= 2 && tileAt(c + 1, r) <= 7)) { x.fillStyle = T.edge; x.fillRect(c + .88, r, .12, 1); }
        }
        // special tiles
        for (let c = c0; c < c1; c++) for (let r = r0; r < r1; r++) {
          const v = tileAt(c, r), m = matAt(c, r);
          if (v === 1 && m !== 0) solidItem(x, c, r, m, bidAt(c, r));
          else if (v === 9 || v === 10) beltTile(x, c, r, bidAt(c, r));
          else if (v === 11) spikeTile(x, c, r);
          else if (v === 12) plankTile(x, c, r, bidAt(c, r));
        }
        // static items: cables, bars, laser posts, vent grates, crane rails
        for (const Z of L.zips) if (Math.max(Z.x0, Z.x1) > c0 - 2 && Math.min(Z.x0, Z.x1) < c1 + 2) {
          x.strokeStyle = '#3a3a44'; x.lineWidth = .07; x.beginPath(); x.moveTo(Z.x0, Z.y0); x.lineTo(Z.x1, Z.y1); x.stroke();
          for (const [px, py] of [[Z.x0, Z.y0], [Z.x1, Z.y1]]) { x.fillStyle = '#5a5f6a'; x.fillRect(px - .1, py - .3, .2, L.H); x.fillStyle = '#7a808c'; x.fillRect(px - .25, py - .35, .5, .2); }
        }
        for (const B of L.bars) if (B.x > c0 - 3 && B.x < c1 + 3) {
          x.fillStyle = '#556070'; x.fillRect(B.x - .75, B.y - .05, .12, L.H); x.fillRect(B.x + .63, B.y - .05, .12, L.H);
          x.strokeStyle = '#c8ccd4'; x.lineWidth = .11; x.lineCap = 'round'; x.beginPath(); x.moveTo(B.x - .7, B.y); x.lineTo(B.x + .7, B.y); x.stroke(); x.lineCap = 'butt';
          x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(B.x - .6, B.y - .04, 1.2, .025);
        }
        for (const Z of L.lasers) if (Z.x > c0 - 2 && Z.x < c1 + 2) {
          x.fillStyle = '#3a3f50'; x.fillRect(Z.x - .22, Z.y0 - .35, .44, .4); x.fillRect(Z.x - .22, Z.y1 - .3, .44, .3);
          x.fillStyle = '#ff3a5a'; x.fillRect(Z.x - .08, Z.y0 - .02, .16, .06); x.fillRect(Z.x - .08, Z.y1 - .34, .16, .06);
          x.fillStyle = '#4a5064'; x.fillRect(Z.x - .05, Z.y0 - 2.5, .1, 2.2);
        }
        for (const V of L.vents) if (V.x1 > c0 - 1 && V.x0 < c1 + 1) {
          x.fillStyle = '#4a5260'; x.fillRect(V.x0 + .05, V.y1 - .18, V.x1 - V.x0 - .1, .2);
          x.fillStyle = '#20242c'; for (let q = V.x0 + .2; q < V.x1 - .1; q += .25) x.fillRect(q, V.y1 - .15, .1, .14);
        }
        for (const Pl of L.plats) { const x0 = Math.min(Pl.x, Pl.x + Pl.mx), x1 = Math.max(Pl.x, Pl.x + Pl.mx) + Pl.w; if (x1 < c0 - 2 || x0 > c1 + 2) continue;
          if (Pl.look === 1) { const ry = Math.min(Pl.y, Pl.y + Pl.my) - 4.5; x.fillStyle = '#e8b030'; x.fillRect(x0 - 1, ry, x1 - x0 + 2, .35); x.fillStyle = 'rgba(0,0,0,.2)'; for (let q = x0 - 1; q < x1 + 1; q += .5) x.fillRect(q, ry + .05, .25, .25); } }
      }
      function slopeTile(x, c, r, v) {
        const T = R.th, o = u => r + Core.slopeOff(v, u);
        x.fillStyle = facCol(bidAt(c, r));
        x.beginPath(); x.moveTo(c - .01, o(0)); x.lineTo(c + 1.01, o(1)); x.lineTo(c + 1.01, r + 1.02); x.lineTo(c - .01, r + 1.02); x.fill();
        // roof covering along the slope
        x.strokeStyle = T.roof[0]; x.lineWidth = .3; x.beginPath(); x.moveTo(c - .02, o(0) + .13); x.lineTo(c + 1.02, o(1) + .13); x.stroke();
        x.strokeStyle = T.roof[1]; x.lineWidth = .05; x.beginPath(); x.moveTo(c, o(0) + .26); x.lineTo(c + 1, o(1) + .26); x.stroke();
        if (R.wi === 0) { x.strokeStyle = 'rgba(90,20,10,.4)'; x.lineWidth = .03; for (let k = .25; k < 1; k += .25) { x.beginPath(); x.moveTo(c + k, o(k) - .02); x.lineTo(c + k, o(k) + .28); x.stroke(); } }
        else if (R.wi === 1 || R.wi === 2) { x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = .04; for (let k = .1; k < 1; k += .2) { x.beginPath(); x.moveTo(c + k, o(k) + .02); x.lineTo(c + k + .08, o(k + .08) + .02); x.stroke(); } }
        else { x.strokeStyle = 'rgba(94,240,255,.5)'; x.lineWidth = .03; x.beginPath(); x.moveTo(c, o(0) + .02); x.lineTo(c + 1, o(1) + .02); x.stroke(); }
      }
      function facade(x, b, c0, r0, c1, r1) {
        const T = R.th, wi = R.wi, w = b.x1 - b.x0, top = b.top;
        const inFac = (c, r) => tileAt(c, r) === 1 && matAt(c, r) === 0 && bidAt(c, r) === b.id;
        if (wi === 0) {
          const step = w >= 6 ? 1.7 : 1.5, n = Math.max(1, Math.floor((w - .6) / step)), off = (w - n * step) / 2;
          const shut = T.shut[Math.floor(hsh(b.id, 5) * T.shut.length)], hasSh = hsh(b.id, 6) < .5;
          x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(b.x0, top + .55, w, .1);
          for (let r = top + 1.1; r < R.L.H; r += 2.1) for (let i = 0; i < n; i++) {
            const wx = b.x0 + off + i * step + step / 2 - .3, wy = r;
            if (wx > c1 + 1 || wx < c0 - 2 || wy > r1 + 1 || wy < r0 - 2) continue;
            if (!inFac(Math.floor(wx + .3), Math.floor(wy + .5)) || !inFac(Math.floor(wx + .3), Math.floor(wy + 1.1))) continue;
            x.fillStyle = T.frame; x.fillRect(wx - .07, wy - .07, .74, 1.14);
            const lit = hsh(Math.floor(wx * 3), Math.floor(wy)) < .18;
            x.fillStyle = lit ? '#ffe7a0' : T.win[0]; x.fillRect(wx, wy, .6, 1);
            x.fillStyle = lit ? '#ffd270' : T.win[1]; x.fillRect(wx, wy + .55, .6, .45);
            x.fillStyle = T.frame; x.fillRect(wx + .27, wy, .06, 1); x.fillRect(wx, wy + .45, .6, .06);
            x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(wx + .05, wy + .05, .08, .35);
            if (hasSh) { x.fillStyle = shut; x.fillRect(wx - .3, wy - .05, .22, 1.1); x.fillRect(wx + .68, wy - .05, .22, 1.1); }
            x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(wx - .1, wy + 1.06, .8, .08);
          }
        } else if (wi === 1) {
          for (let r = top + 2.4; r < R.L.H; r += 2.4) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(b.x0, r, w, .3); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(b.x0, r - .05, w, .05); }
          for (let r = top + .6; r < R.L.H; r += 2.4) for (let cc = b.x0 + .5; cc < b.x1 - .9; cc += 2.2) {
            if (!inFac(Math.floor(cc + .7), Math.floor(r + .8)) || !inFac(Math.floor(cc + .7), Math.floor(r + 1.4))) continue;
            x.fillStyle = T.win[0]; x.fillRect(cc, r, 1.5, 1.5);
            x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(cc, r, 1.5, .1);
            if (hsh(Math.floor(cc), Math.floor(r)) < .3) { x.fillStyle = 'rgba(255,138,31,.55)'; x.fillRect(cc, r, 1.5, 1.5); x.strokeStyle = 'rgba(255,200,120,.5)'; x.lineWidth = .03; for (let q = .2; q < 1.5; q += .25) { x.beginPath(); x.moveTo(cc + q, r); x.lineTo(cc + q, r + 1.5); x.stroke(); } }
          }
          x.fillStyle = 'rgba(0,0,0,.12)'; for (let cc = b.x0 + 2.85; cc < b.x1 - .5; cc += 4.4) x.fillRect(cc, top, .25, R.L.H - top);
        } else if (wi === 2) {
          const bh = 2.6;
          for (let r = top, k = 0; r < R.L.H; r += bh, k++) {
            if (r > r1 + 1 || r + bh < r0 - 1) continue;
            const col = T.fac[Math.floor(hsh(b.id * 7 + k, 11) * T.fac.length)];
            for (let c = b.x0; c < b.x1; c++) { if (!inFac(c, Math.floor(r + .3))) continue; x.fillStyle = col; x.fillRect(c - .01, r, 1.02, bh); }
            x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(b.x0, r + bh - .12, w, .12); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(b.x0, r, w, .06);
            x.fillStyle = 'rgba(0,0,0,.12)'; for (let q = b.x0 + .3; q < b.x1 - .1; q += .3) x.fillRect(q, r + .15, .06, bh - .35);
            const segs = Math.max(1, Math.round(w / 6)), sw = w / segs;
            for (let s = 0; s <= segs; s++) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(b.x0 + s * sw - .08, r, .16, bh); }
            if (hsh(b.id, k) < .5) { x.fillStyle = 'rgba(255,255,255,.55)'; x.font = 'bold .5px sans-serif'; x.fillText(['HAVN', 'MAAS', 'ZEE', 'RTM', 'KADE'][Math.floor(hsh(k, b.id) * 5)], b.x0 + .5, r + .9); }
          }
        } else {
          for (let r = top + .6; r < R.L.H - .3; r += .9) for (let cc = b.x0 + .35; cc < b.x1 - .5; cc += .8) {
            if (r > r1 + 1 || r < r0 - 2 || cc > c1 + 1 || cc < c0 - 2) continue;
            if (!inFac(Math.floor(cc + .2), Math.floor(r + .3))) continue;
            const q = hsh(Math.floor(cc * 5), Math.floor(r * 3) + b.id);
            x.fillStyle = q < .06 ? '#d86ac8' : q < .14 ? '#6ad4e0' : q < .3 ? '#e8c47a' : T.win[(Math.floor(r) + Math.floor(cc)) % 2];
            x.fillRect(cc, r, .42, .55);
          }
          if (w >= 6 && hsh(b.id, 21) < .75) {                      // a neon sign on the facade
            const word = NEON_WORDS[Math.floor(hsh(b.id, 22) * NEON_WORDS.length)], sx = b.x0 + w / 2, sy = top + 1.6;
            if (inFac(Math.floor(sx), Math.floor(sy + .6))) {
              const col = ['#ff4fd8', '#5ef0ff', '#ffd84a', '#7aff8a'][Math.floor(hsh(b.id, 23) * 4)];
              x.fillStyle = 'rgba(10,8,25,.9)'; const tw = Math.min(w - 1.2, word.length * .62 + .6); x.fillRect(sx - tw / 2, sy - .1, tw, 1.2);
              x.save(); x.font = 'bold .8px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = col; x.shadowBlur = 8; x.fillStyle = col; x.fillText(word, sx, sy + .52, tw - .3); x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(word, sx, sy + .52, tw - .3); x.restore();
            }
          }
        }
      }
      function solidItem(x, c, r, m, look) {
        const T = R.th, wi = R.wi;
        if (m === 2) {                                             // a box on the roof: AC unit, crate, chimney, ...
          const kind = wi === 0 ? (look === 1 ? 'chim' : 'ac') : wi === 1 ? 'crate' : wi === 2 ? 'drum' : 'ac';
          if (kind === 'chim') { x.fillStyle = T.wall[0]; x.fillRect(c + .05, r, .9, 1); x.fillStyle = T.wall[1]; for (let k = 0; k < 4; k++) x.fillRect(c + .05, r + k * .25 + .22, .9, .04); x.fillStyle = '#5a5050'; x.fillRect(c - .02, r, 1.04, .16); }
          else if (kind === 'crate') { x.fillStyle = T.box[0]; x.fillRect(c + .03, r + .03, .94, .97); x.strokeStyle = T.box[1]; x.lineWidth = .08; x.strokeRect(c + .07, r + .07, .86, .89); x.beginPath(); x.moveTo(c + .1, r + .1); x.lineTo(c + .9, r + .92); x.stroke(); }
          else if (kind === 'drum') { x.fillStyle = T.box[0]; x.fillRect(c + .1, r + .02, .8, .98); x.fillStyle = T.box[1]; x.fillRect(c + .1, r + .3, .8, .07); x.fillRect(c + .1, r + .66, .8, .07); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(c + .2, r + .05, .08, .9); }
          else { x.fillStyle = T.box[0]; x.fillRect(c + .02, r + .05, .96, .95); x.fillStyle = T.box[1]; x.beginPath(); x.arc(c + .5, r + .52, .3, 0, TAU); x.fill(); x.strokeStyle = T.box[0]; x.lineWidth = .05; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(c + .5, r + .52); x.lineTo(c + .5 + Math.cos(k * 2.1) * .28, r + .52 + Math.sin(k * 2.1) * .28); x.stroke(); } x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(c + .02, r + .05, .96, .06); }
        } else if (m === 4) {                                      // walls and floating blocks
          x.fillStyle = T.wall[0]; x.fillRect(c - .01, r - .01, 1.02, 1.02);
          x.fillStyle = T.wall[1];
          if (wi === 0) { x.fillRect(c, r + .47, 1, .06); x.fillRect(c + (r % 2 ? .25 : .75), r, .06, .5); x.fillRect(c + (r % 2 ? .75 : .25), r + .5, .06, .5); }
          else if (wi === 1) { x.fillRect(c, r + .9, 1, .1); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(c, r, 1, .05); }
          else if (wi === 2) { for (let q = .15; q < 1; q += .3) x.fillRect(c + q, r, .06, 1); }
          else { x.fillRect(c, r + .9, 1, .1); x.fillStyle = 'rgba(94,240,255,.25)'; x.fillRect(c + .1, r + .2, .8, .05); }
          const up = tileAt(c, r - 1); if (!solidT(up)) { x.fillStyle = T.coping; x.fillRect(c - .04, r - .02, 1.08, .14); }
        } else if (m === 3) {                                      // pipe / beam to slide under
          const y0 = r, k = look;
          x.fillStyle = 'rgba(70,70,80,.6)'; if (k === 1 || k === 2) x.fillRect(c + .45, y0 - 6, .1, 6);
          const gr = x.createLinearGradient(0, y0, 0, y0 + 1); gr.addColorStop(0, T.pipe[0]); gr.addColorStop(.45, '#ffffff'); gr.addColorStop(.55, T.pipe[0]); gr.addColorStop(1, T.pipe[1]);
          x.fillStyle = gr; x.fillRect(c - .01, y0 + .1, 1.02, .8);
          if (k === 1 || k === 2) { x.fillStyle = T.pipe[1]; x.fillRect(c + (k === 1 ? .05 : .7), y0, .25, 1); }
          x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(c, y0 + .84, 1, .06);
          if ((c + r) % 3 === 0) { x.fillStyle = '#ffd23a'; x.fillRect(c + .3, y0 + .35, .4, .3); x.fillStyle = '#222'; x.fillRect(c + .38, y0 + .43, .24, .14); }
        } else if (m === 5) { x.fillStyle = '#e07a2a'; x.fillRect(c, r + .1, 1, .8); }
      }
      function beltTile(x, c, r, look) {
        x.fillStyle = '#3a3d46'; x.fillRect(c - .01, r, 1.02, 1); x.fillStyle = '#23252c'; x.fillRect(c, r, 1, .22);
        x.fillStyle = '#6a6f7c'; for (let q = .25; q < 1; q += .5) { x.beginPath(); x.arc(c + q, r + .55, .18, 0, TAU); x.fill(); }
        x.fillStyle = '#ffd23a'; x.fillRect(c, r + .9, 1, .1);
      }
      function spikeTile(x, c, r) {
        x.fillStyle = '#7a808c'; x.fillRect(c, r + .85, 1, .15);
        x.fillStyle = '#c8ced8'; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(c + k * .25, r + .88); x.lineTo(c + k * .25 + .125, r + .42); x.lineTo(c + k * .25 + .25, r + .88); x.fill(); }
        x.fillStyle = 'rgba(255,255,255,.6)'; for (let k = 0; k < 4; k++) x.fillRect(c + k * .25 + .11, r + .48, .03, .2);
      }
      function plankTile(x, c, r, look) {
        x.fillStyle = '#c08a4a'; x.fillRect(c - .01, r, 1.02, .25); x.fillStyle = '#8a5a2a'; x.fillRect(c, r + .2, 1, .06); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(c, r, 1, .04);
        x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(c + .48, r + .02, .03, .2);
      }
      function decoItem(x, q) {
        const T = R.th, wi = R.wi, k = q.kind === 'auto' ? Math.floor(q.s * 4) : q.kind;
        x.fillStyle = T.deco; x.strokeStyle = T.deco; const X = q.x, Y = q.y - .02;
        if (wi === 0) {
          if (k === 0) { x.fillRect(X - .3, Y - 1.5, .6, 1.5); x.fillRect(X - .38, Y - 1.62, .76, .18); }                             // chimney
          else if (k === 1) { x.lineWidth = .06; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y - 2.6); for (let i = 0; i < 3; i++) { x.moveTo(X - .6 + i * .15, Y - 2.4 + i * .35); x.lineTo(X + .6 - i * .15, Y - 2.4 + i * .35); } x.stroke(); }   // TV antenna
          else if (k === 2) { x.beginPath(); x.moveTo(X - .8, Y); x.lineTo(X, Y - .9); x.lineTo(X + .8, Y); x.fill(); x.fillRect(X - .25, Y - .55, .5, .4); }   // dormer
          else { x.fillRect(X - .7, Y - .5, 1.4, .5); x.fillRect(X - .5, Y - .7, 1, .2); }
        } else if (wi === 1) {
          if (k === 0) { x.beginPath(); x.moveTo(X - .35, Y); x.lineTo(X, Y - .8); x.lineTo(X + .35, Y); x.fill(); }                   // cone
          else if (k === 1) { x.fillRect(X - .8, Y - .7, 1.6, .7); }                                                                   // brick pallet
          else if (k === 2) { x.lineWidth = .08; x.beginPath(); x.moveTo(X - 1, Y); x.lineTo(X - 1, Y - 2.2); x.lineTo(X + 1, Y - 2.2); x.lineTo(X + 1, Y); x.moveTo(X - 1, Y - 1.1); x.lineTo(X + 1, Y - 1.1); x.stroke(); }   // scaffold frame
          else { x.fillRect(X - .5, Y - .9, 1, .9); }
        } else if (wi === 2) {
          if (k === 0) { x.fillRect(X - .2, Y - .45, .4, .45); x.fillRect(X - .28, Y - .55, .56, .12); }                               // bollard
          else if (k === 1) { x.lineWidth = .06; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y - 2); x.stroke(); x.beginPath(); x.arc(X, Y - 1.6, .3, 0, TAU); x.lineWidth = .1; x.stroke(); }   // life ring
          else if (k === 2) { x.fillRect(X - .6, Y - .9, .55, .9); x.fillRect(X + .05, Y - .9, .55, .9); }                            // drums
          else { x.lineWidth = .07; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y - 3); x.lineTo(X + .9, Y - 2.6); x.stroke(); }        // flag pole
        } else {
          if (k === 0) { x.fillRect(X - .5, Y - .8, 1, .8); }                                                                         // AC unit
          else if (k === 1) { x.lineWidth = .06; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y - 3); x.stroke(); }                       // antenna
          else if (k === 2) { x.beginPath(); x.arc(X, Y - .9, .55, Math.PI * .8, Math.PI * 1.9); x.fill(); x.fillRect(X - .05, Y - .9, .1, .9); }   // dish
          else { x.fillRect(X - 1.2, Y - 2.6, 2.4, 1.3); x.fillRect(X - 1, Y - 1.3, .1, 1.3); x.fillRect(X + .9, Y - 1.3, .1, 1.3); }   // billboard
        }
      }
      function drawLevel() {
        const paintedBefore = R.st.paints, C = R.cam, aspect = R.W / R.H, vw = C.vh * aspect, x0 = C.x - vw / 2, x1 = C.x + vw / 2, y0 = C.y - C.vh / 2, y1 = C.y + C.vh / 2;
        for (let cj = Math.max(0, Math.floor(y0 / CH)); cj <= Math.min(Math.floor((R.L.H - 1) / CH), Math.floor(y1 / CH)); cj++)
          for (let ci = Math.max(0, Math.floor(x0 / CW)); ci <= Math.floor(x1 / CW); ci++) {
            if (ci * CW > R.L.W) continue;
            const c = chunk(ci, cj); if (c === EMPTY) continue;
            if (R.lock) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, Math.round(R.ox + (ci * CW - MG) * R.cu), Math.round(R.oy + (cj * CH - MG) * R.cu)); }
            else g.drawImage(c, ci * CW - MG, cj * CH - MG, CW + MG * 2, CH + MG * 2);
          }
        if (R.lock) g.setTransform(R.cu, 0, 0, R.cu, R.ox, R.oy);
        // paint one chunk ahead per frame (never two in one frame), so running into new ground doesn't stutter
        if (R.st.paints === paintedBefore && R.lastDt < .021) {
          const dir = R.cam.lx >= 0 ? 1 : -1;
          outer: for (let k = 0; k < 3; k++) {
            const ci = Math.floor((dir > 0 ? x1 : x0) / CW) + dir * k;
            if (ci < 0 || ci * CW > R.L.W) break;
            for (let cj = Math.max(0, Math.floor(y0 / CH) - 1); cj <= Math.min(Math.floor((R.L.H - 1) / CH), Math.floor(y1 / CH) + 1); cj++) if (!R.chunks.has(ci * 1000 + cj)) { chunk(ci, cj); break outer; }
          }
        }
      }

      /* ---------- moving and living things ---------- */
      let neonCache = null;
      function drawObjects(S) {
        const L = R.L, C = R.cam, f = S.f, t = R.t, vw = C.vh * R.W / R.H, xa = C.x - vw / 2 - 2, xb = C.x + vw / 2 + 2;
        // crumbling tiles
        for (let i = 0; i < L.crum.length; i++) {
          const ti = L.crum[i], c = ti % L.W, r = (ti / L.W) | 0; if (c < xa || c > xb) continue;
          const v = S.cr[i]; if (v >= Core.C.CR_FALL) continue;
          const sh = v > 0 ? Math.sin(v * 1.7) * .05 * (v / Core.C.CR_FALL + .3) : 0;
          g.fillStyle = '#b58a5a'; g.fillRect(c + sh + .02, r, .96, .5); g.fillStyle = '#8a6038'; g.fillRect(c + sh + .02, r + .4, .96, .1);
          g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(c + sh + .02, r, .96, .06);
          g.strokeStyle = v > 0 ? '#3a2410' : 'rgba(60,36,16,.5)'; g.lineWidth = .04; g.beginPath(); g.moveTo(c + .3 + sh, r); g.lineTo(c + .45 + sh, r + .25); g.lineTo(c + .35 + sh, r + .5); if (v > 10) { g.moveTo(c + .7 + sh, r); g.lineTo(c + .62 + sh, r + .3); } g.stroke();
        }
        // conveyor arrows
        for (let c = Math.max(0, Math.floor(xa)); c < Math.min(L.W, xb); c++) for (let r = Math.max(0, Math.floor(C.y - C.vh / 2)); r < Math.min(L.H, C.y + C.vh / 2 + 1); r++) {
          const v = L.t[r * L.W + c]; if (v !== 9 && v !== 10) continue;
          const d = v === 9 ? 1 : -1, ph = ((t * 1.6 * d) % .5 + .5) % .5;
          g.fillStyle = '#ffd23a'; for (let q = ph; q < 1; q += .5) { const xx = c + q; g.beginPath(); g.moveTo(xx - .08 * d, r + .03); g.lineTo(xx + .08 * d, r + .11); g.lineTo(xx - .08 * d, r + .19); g.fill(); }
        }
        // springs
        for (const P of L.springs) {
          if (P.x < xa || P.x > xb) continue;
          const near = Math.abs(S.x - P.x) < .8 && S.y > P.y - .6 && S.vy < -10 ? 1 : 0, k = R.sp && R.sp.x === P.x ? Math.max(0, 1 - (t - R.sp.t) * 5) : 0;
          const h = .45 - k * .25 + near * .05;
          g.fillStyle = '#4a5060'; g.fillRect(P.x - .45, P.y - .12, .9, .12);
          g.strokeStyle = '#c8ccd4'; g.lineWidth = .06; g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(P.x + (i % 2 ? .25 : -.25), P.y - .12 - h * i / 6); g.stroke();
          g.fillStyle = P.dir ? '#5ad06a' : '#ff5a4a'; g.fillRect(P.x - .5, P.y - .2 - h, 1, .14); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(P.x - .5, P.y - .2 - h, 1, .04);
          if (P.dir) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(P.x - .12, P.y - .18 - h); g.lineTo(P.x + .15, P.y - .13 - h); g.lineTo(P.x - .12, P.y - .08 - h); g.fill(); }
        }
        // moving platforms / crane loads
        for (let i = 0; i < L.plats.length; i++) {
          const Pl = L.plats[i], [px, py] = Core.platPos(Pl, f); if (px + Pl.w < xa || px > xb) continue;
          if (Pl.look === 1) {
            const ry = Math.min(Pl.y, Pl.y + Pl.my) - 4.2;
            g.strokeStyle = '#2a2a30'; g.lineWidth = .05; g.beginPath(); g.moveTo(px + .3, ry); g.lineTo(px + Pl.w / 2, py - 1.3); g.lineTo(px + Pl.w - .3, ry); g.moveTo(px + Pl.w / 2, py - 1.3); g.lineTo(px + .15, py - .05); g.moveTo(px + Pl.w / 2, py - 1.3); g.lineTo(px + Pl.w - .15, py - .05); g.stroke();
            g.fillStyle = '#e8b030'; g.fillRect(px + .1, ry - .15, Pl.w - .2, .3);
            const col = ['#d24a33', '#2a78c0', '#2f9a62'][i % 3]; g.fillStyle = col; g.fillRect(px, py, Pl.w, .9); g.fillStyle = 'rgba(0,0,0,.18)'; for (let q = px + .25; q < px + Pl.w - .1; q += .3) g.fillRect(q, py + .1, .06, .7); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(px, py, Pl.w, .07);
          } else {
            g.fillStyle = '#7a8090'; g.fillRect(px, py, Pl.w, .35); g.fillStyle = '#ffd23a'; for (let q = 0; q < Pl.w; q += .5) g.fillRect(px + q, py + .22, .25, .13); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px, py, Pl.w, .06);
            g.strokeStyle = 'rgba(40,40,50,.6)'; g.lineWidth = .04; g.beginPath(); g.moveTo(px + .2, py); g.lineTo(px + .2, py - 6); g.moveTo(px + Pl.w - .2, py); g.lineTo(px + Pl.w - .2, py - 6); g.stroke();
          }
        }
        // saws
        for (const Q of L.saws) {
          const [sx, sy] = Core.sawPos(Q, f); if (sx < xa || sx > xb) continue;
          if (Q.x0 !== Q.x1 || Q.y0 !== Q.y1) { g.strokeStyle = 'rgba(40,40,50,.5)'; g.lineWidth = .08; g.beginPath(); g.moveTo(Q.x0, Q.y0); g.lineTo(Q.x1, Q.y1); g.stroke(); }
          g.save(); g.translate(sx, sy); g.rotate(f * .25);
          g.fillStyle = '#c8ced8'; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rr = k % 2 ? Q.r * .82 : Q.r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.fill();
          g.fillStyle = '#8a929e'; g.beginPath(); g.arc(0, 0, Q.r * .55, 0, TAU); g.fill(); g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(0, 0, Q.r * .2, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-Q.r * .5, -.03, Q.r, .06);
          g.restore();
        }
        // lasers
        for (const Z of L.lasers) {
          if (Z.x < xa || Z.x > xb) continue;
          const on = Core.laserOn(Z, f), soon = !on && ((f + Z.ph) % Z.per) > Z.per - 36;
          if (on) { g.fillStyle = 'rgba(255,60,90,.28)'; g.fillRect(Z.x - .18, Z.y0, .36, Z.y1 - Z.y0 - .3); g.fillStyle = '#ff3a5a'; g.fillRect(Z.x - .07, Z.y0, .14, Z.y1 - Z.y0 - .3); g.fillStyle = '#ffd0d8'; g.fillRect(Z.x - .025, Z.y0, .05, Z.y1 - Z.y0 - .3); }
          else if (soon && (f >> 2) % 2) { g.fillStyle = 'rgba(255,60,90,.35)'; g.fillRect(Z.x - .02, Z.y0, .04, Z.y1 - Z.y0 - .3); }
        }
        // vents: rising streaks
        for (const V of L.vents) {
          if (V.x1 < xa || V.x0 > xb) continue;
          g.fillStyle = 'rgba(255,255,255,.22)';
          for (let k = 0; k < 7; k++) { const q = ((t * 1.3 + k * .37) % 1), yy = V.y1 - q * (V.y1 - V.y0), xx = V.x0 + .2 + ((k * .618) % 1) * (V.x1 - V.x0 - .4); g.fillRect(xx, yy, .05, .6 * (1 - q) + .1); }
        }
        // crates
        for (let i = 0; i < L.crates.length; i++) {
          const K = L.crates[i]; if (K.x < xa || K.x > xb) continue; const st = S.cz[i * 3 + 2], y = st === 0 ? K.y0 : S.cz[i * 3];
          if (st >= 2 && st > 12) continue;
          g.strokeStyle = '#2a2a30'; g.lineWidth = .04; if (st < 1) { g.beginPath(); g.moveTo(K.x, y - 4); g.lineTo(K.x, y); g.stroke(); }
          const a = st >= 2 ? 1 - (st - 2) / 10 : 1; g.globalAlpha = a;
          g.fillStyle = '#c8873a'; g.fillRect(K.x - .45, y, .9, .95); g.strokeStyle = '#7a4a1a'; g.lineWidth = .07; g.strokeRect(K.x - .4, y + .05, .8, .85); g.beginPath(); g.moveTo(K.x - .38, y + .07); g.lineTo(K.x + .38, y + .88); g.stroke();
          g.globalAlpha = 1;
        }
        // golden shoes
        for (let i = 0; i < L.coins.length; i++) {
          if (S.coins & (1 << i)) continue; const Q = L.coins[i]; if (Q.x < xa || Q.x > xb) continue;
          const b = Math.sin(t * 3 + i) * .1, y = Q.y + b;
          g.fillStyle = 'rgba(255,220,80,.25)'; g.beginPath(); g.arc(Q.x, y, .5 + Math.sin(t * 5 + i) * .05, 0, TAU); g.fill();
          goldShoe(g, Q.x, y, .5, Math.sin(t * 2 + i) * .15);
        }
        // checkpoints and the finish
        for (let i = 0; i < L.cps.length; i++) { const P = L.cps[i]; if (P.x < xa || P.x > xb) continue; flag(P.x, P.y, i < S.cp, t + i); }
        const F = L.finish;
        if (F.x > xa - 4 && F.x < xb + 4) finish(F.x, F.y, t);
        // water in the harbour
        if (L.water) {
          const wy = L.H - 1.3, x0 = C.x - vw / 2 - 1, x1 = C.x + vw / 2 + 1;
          g.fillStyle = 'rgba(30,110,170,.88)'; g.beginPath(); g.moveTo(x0, L.H + 3);
          for (let xx = x0; xx <= x1 + .5; xx += .5) g.lineTo(xx, wy + Math.sin(xx * 1.3 + t * 2) * .08 + Math.sin(xx * .6 - t * 1.2) * .06);
          g.lineTo(x1, L.H + 3); g.fill();
          g.fillStyle = 'rgba(255,255,255,.45)'; for (let xx = Math.floor(x0); xx < x1; xx += 1.7) g.fillRect(xx + ((t * .4) % 1.7), wy + .08 + Math.sin(xx + t) * .05, .5, .05);
        }
      }
      function goldShoe(x, cx, cy, s, a) {
        x.save(); x.translate(cx, cy); x.rotate(a); x.scale(s, s);
        x.fillStyle = '#b87a10'; x.beginPath(); x.ellipse(.05, .3, .62, .16, 0, 0, TAU); x.fill();
        const gr = x.createLinearGradient(0, -.4, 0, .3); gr.addColorStop(0, '#fff2a0'); gr.addColorStop(1, '#f0a818');
        x.fillStyle = gr; x.beginPath(); x.moveTo(-.55, .25); x.lineTo(-.5, -.3); x.quadraticCurveTo(-.3, -.45, -.1, -.3); x.lineTo(.1, -.05); x.quadraticCurveTo(.6, .0, .62, .25); x.closePath(); x.fill();
        x.strokeStyle = '#fff'; x.lineWidth = .06; x.beginPath(); x.moveTo(-.25, -.2); x.lineTo(0, -.05); x.moveTo(-.2, -.05); x.lineTo(.08, .07); x.stroke();
        x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(-.38, -.15, .06, .14, .3, 0, TAU); x.fill();
        x.restore();
      }
      function flag(x, y, on, t) {
        g.fillStyle = '#e8e8ee'; g.fillRect(x - .05, y - 2.4, .1, 2.4); g.fillStyle = '#5a5f6a'; g.fillRect(x - .2, y - .12, .4, .12);
        g.fillStyle = on ? '#3ad06a' : '#9aa0aa';
        g.beginPath(); g.moveTo(x + .05, y - 2.35);
        for (let k = 0; k <= 4; k++) g.lineTo(x + .05 + k * .25, y - 2.35 + Math.sin(t * 6 + k) * .06 * k / 4 + k * .02);
        for (let k = 4; k >= 0; k--) g.lineTo(x + .05 + k * .25, y - 1.75 + Math.sin(t * 6 + k) * .06 * k / 4 - k * .02);
        g.fill();
        if (on) { g.fillStyle = '#fff'; g.font = 'bold .4px sans-serif'; g.fillText('✓', x + .38, y - 1.9); }
      }
      function finish(x, y, t) {
        g.fillStyle = '#e8e8ee'; g.fillRect(x - 2.2, y - 3.6, .18, 3.6); g.fillRect(x + 2.02, y - 3.6, .18, 3.6);
        g.fillStyle = '#1a1a22'; g.fillRect(x - 2.2, y - 3.9, 4.4, .9);
        for (let i = 0; i < 16; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) { g.fillStyle = '#ffffff'; g.fillRect(x - 2.2 + i * .275, y - 3.9 + j * .3, .275, .3); }
        g.fillStyle = '#ffd23a'; g.fillRect(x - 1.15, y - 4.15, 2.3, .45); g.fillStyle = '#3a2400'; g.font = 'bold .36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FINISH', x, y - 3.92); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        const cols = ['#ff5a6a', '#ffd23a', '#5ad06a', '#4aa8ff']; for (let k = 0; k < 9; k++) { g.fillStyle = cols[k % 4]; const xx = x - 2 + k * .5, yy = y - 2.9 + Math.sin(t * 3 + k) * .05; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + .4, yy); g.lineTo(xx + .2, yy + .4); g.fill(); }
      }

      /* ---------- the runner (and the ghost) ---------- */
      const A = { ph: 0, land: 0, lastX: 0, rot: 0 }, GA = { ph: 0, land: 0, lastX: 0, rot: 0 };
      function anim(S, An, dt) {
        const sp = S.st === 0 || S.st === 2 || S.st === 11 ? Math.abs(S.gs) : Math.abs(S.vx);
        An.ph += dt * (2.2 + sp * .95); if (An.ph > 1e4) An.ph -= 1e4;
        if (An.land > 0) An.land = Math.max(0, An.land - dt * 6);
        // the body angle shown eases in after a landing (the core snaps upright)
        const want = S.rot; let d = want - An.rot; if (S.st === 1 || S.st === 8) An.rot = want; else An.rot += d * Math.min(1, dt * 18);
      }
      function drawRunner(S, An, Jo, O, alpha, ghost) {
        if (S.st === 9 && !ghost) return;
        const P = Rig.pose(S, An, R.t), sl = S.st === 2 ? 0 : 0;
        Rig.joints(P, S.x, S.y + sl, S.face || 1, An.rot, Jo);
        Rig.draw(g, Jo, O, alpha, ghost, R.q >= 3);
      }
      function drawRag(O) {
        if (!rag.R) return;
        Rig.ragJoints(rag.R, rag.J); Rig.draw(g, rag.J, O, 1, false);
        if (rag.R.t > .35) {                                       // cartoon stars around the head
          const [hx, hy] = rag.J.head;
          for (let k = 0; k < 4; k++) { const a = R.t * 5 + k * TAU / 4; star(hx + Math.cos(a) * .42, hy - .32 + Math.sin(a) * .12, .11, '#ffe24a'); }
        }
      }
      function star(x, y, r, col) { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
      const solidW = (x, y) => { const L = R.L, c = Math.floor(x), r = Math.floor(y); if (c < 0 || c >= L.W || r < 0 || r >= L.H) return false; const v = L.t[r * L.W + c]; if (v === 1 || v === 9 || v === 10) return true; if (v >= 2 && v <= 7) return y - r >= Core.slopeOff(v, x - c); return false; };

      /* ---------- events from the simulation ---------- */
      R.event = (S, e) => {
        const a = e.a || {};
        switch (e.t) {
          case 'land': if ((a.v || 0) > 6) { A.land = Math.min(1, (a.v - 4) / 10); dust(S.x, S.y, 5 + Math.min(8, a.v / 2)); } break;
          case 'jump': dust(S.x, S.y, 4, .7); break;
          case 'slide': dust(S.x, S.y, 6, 1.2); break;
          case 'walljump': dust(S.x + (S.vx > 0 ? -.3 : .3), S.y - 1, 6, 1); break;
          case 'vault': dust(S.x, S.y, 4); break;
          case 'spring': R.sp = { x: a.x, t: R.t }; break;
          case 'coin': { const Q = R.L.coins[a.i]; stars(Q.x, Q.y, 14, '#ffe060'); break; }
          case 'cp': { const P = R.L.cps[a.i]; confetti(P.x, P.y - 2, 18); break; }
          case 'crumble': { const ti = R.L.crum[a.i]; debris(ti % R.L.W, (ti / R.L.W) | 0, '#a87a4a'); break; }
          case 'cratehit': { const K = R.L.crates[a.i]; dust(K.x, K.y1, 10, 1.6, 'rgba(200,150,90,.8)'); break; }
          case 'crash': {
            const P = Rig.pose(S, A, R.t); Rig.joints(P, S.x, S.y, S.face || 1, A.rot, J);
            rag.R = Rig.ragdoll(J, a.vx * .7, Math.min(a.vy, 4) - 3, (a.rv || 0) * .4 + (S.face || 1) * 4);
            stars(J.head[0], J.head[1], 10); if (R.optShake) R.shake = .5; break;
          }
          case 'fall': if (R.L.water) splash(S.x, R.L.H - 1.3); break;
          case 'respawn': rag.R = null; dust(S.x, S.y, 10, 1.2, 'rgba(255,255,255,.9)'); A.rot = 0; break;
          case 'finish': confetti(S.x + 2, S.y - 3, 60); break;
          case 'flipland': if (a.perfect) stars(S.x, S.y - .8, 12, '#ffffff'); break;
          case 'bump': if (R.optShake) R.shake = Math.max(R.shake, .2); dust(S.x + (S.face || 1) * .3, S.y - .6, 4); break;
        }
      };
      R.landPuff = (S, v) => { A.land = Math.min(1, v); };
      R.snap = S => { for (let i = 0; i < 90; i++) camera(S, 1 / 30); };

      /* ---------- a frame ---------- */
      let lastT = 0;
      R.frame = (S, o = {}) => {
        const now = performance.now() / 1000, dt = lastT ? Math.min(.05, Math.max(0, now - lastT)) : 1 / 60; lastT = now; R.lastDt = dt;
        if (!o.still) R.t += dt;
        if (!R.L || !R.W) return;
        if (!o.still) { camera(S, dt); anim(S, A, dt); if (o.ghost) anim(o.ghost, GA, dt); }
        if (rag.R && !o.still) Rig.ragStep(rag.R, solidW, dt);
        if (S.st === 7 && !o.still && rnd() < .6) sparks(S.x + (rnd() - .5) * .2, S.y - 1.78, 1, rnd() < .5 ? '#ffd27a' : '#fff4c0');
        const DB = R.dbg || {};
        if (!DB.back) drawBack(); else { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#88c'; g.fillRect(0, 0, cv.width, cv.height); }
        const C = R.cam, u = R.H / C.vh, d = R.dpr;
        let sx = 0, sy = 0; if (R.shake > 0) { R.shake = Math.max(0, R.shake - dt * 1.5); const k = R.shake * R.shake * .25; sx = Math.sin(R.t * 61) * k; sy = Math.cos(R.t * 53) * k; }
        R.ox = Math.round((R.W / 2 - (C.x + sx) * u) * d); R.oy = Math.round((R.H / 2 - (C.y + sy) * u) * d);
        g.setTransform(u * d, 0, 0, u * d, R.lock ? R.ox : (R.W / 2 - (C.x + sx) * u) * d, R.lock ? R.oy : (R.H / 2 - (C.y + sy) * u) * d);
        if (!DB.level) drawLevel();
        if (!DB.obj) drawObjects(S);
        if (o.ghost && !o.ghost.done) drawRunner(o.ghost, GA, GJ, OUTFITS[0], .38, true);
        // speed lines behind the runner
        const sp = Math.abs(S.vx);
        if (sp > 11 && S.st !== 9) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .04; g.beginPath(); for (let k = 0; k < 5; k++) { const yy = S.y - .3 - k * .32, len = (sp - 10) * .25 * (1 + ((k * 7 + Math.floor(R.t * 30)) % 3) * .3); const xx = S.x - Math.sign(S.vx) * (.5 + (k % 2) * .3); g.moveTo(xx, yy); g.lineTo(xx - Math.sign(S.vx) * len, yy); } g.stroke(); }
        if (!DB.runner) drawRunner(S, A, J, o.outfit || OUTFITS[0], 1, false);
        drawRag(o.outfit || OUTFITS[0]);
        // particles
        for (let i = 0; i < NP; i++) {
          if (P.l[i] <= 0) continue;
          if (!o.still) { P.l[i] -= dt; P.vy[i] += P.g[i] * 30 * dt; P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; }
          const k = P.k[i], a = Math.max(0, P.l[i] / P.ml[i]);
          g.globalAlpha = k === 3 ? Math.min(1, a * 2) : a; g.fillStyle = P.c[i];
          if (k === 0) { g.beginPath(); g.arc(P.x[i], P.y[i], P.s[i] * (1.6 - a * .6), 0, TAU); g.fill(); }
          else if (k === 1) g.fillRect(P.x[i] - P.s[i], P.y[i] - P.s[i], P.s[i] * 2, P.s[i] * 2);
          else if (k === 2) star(P.x[i], P.y[i], P.s[i], P.c[i]);
          else if (k === 3) { g.save(); g.translate(P.x[i], P.y[i]); g.rotate(P.l[i] * 8); g.fillRect(-P.s[i], -P.s[i] * .5, P.s[i] * 2, P.s[i]); g.restore(); }
          else g.fillRect(P.x[i] - P.s[i], P.y[i] - P.s[i], P.s[i] * 2, P.s[i] * 2);
        }
        g.globalAlpha = 1;
        if (o.fade > 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(10,8,20,${o.fade})`; g.fillRect(0, 0, cv.width, cv.height); }
      };
      R.idle = () => { if (R.shake > 0 || rag.R) return false; for (let i = 0; i < NP; i++) if (P.l[i] > 0) return false; return true; };
      R.ragOn = () => !!rag.R;
      R.drawRunnerAt = (x, cv2, O, pose, face = 1) => {          // a portrait of the runner for menus
        const gg = cv2.getContext('2d'), w = cv2.width, h = cv2.height, s = h / 2.2;
        gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, w, h); gg.setTransform(s, 0, 0, s, w / 2, h * .94);
        const Jx = Rig.joints(pose || Rig.base(), 0, 0, face, 0, {}); Rig.draw(gg, Jx, O, 1, false);
      };
      return R;
    }
    return { create };
  })();
