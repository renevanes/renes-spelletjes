  /* ================= stages.js: eight original arenas, painted in code =================
     Each stage has three parallax layers (far .25, mid .55, floor 1) that are painted ONCE into canvases when a fight
     starts, plus a few animated bits drawn every frame (sails, boats, lights, petals...). Layer units = world units,
     y up, the floor at y = 0. */
  const Stages = (() => {
    const TAU = Math.PI * 2;
    const lg = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
    const rg = (g, x, y, r0, r1, stops) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
    const poly = (g, pts, fill, stroke, lw) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } };
    const rect = (g, x, y, w, h, fill) => { g.fillStyle = fill; g.fillRect(x, y, w, h); };
    const circ = (g, x, y, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
    const OUT = 'rgba(20,14,30,.55)';
    function sky(g, u0, u1, top, stops) { g.fillStyle = lg(g, 0, top, 0, -20, stops); g.fillRect(u0, -100, u1 - u0, top + 120); }
    function clouds(g, u0, u1, y0, y1, n, col, r) { for (let i = 0; i < n; i++) { const x = u0 + r() * (u1 - u0), y = y0 + r() * (y1 - y0), w = 40 + r() * 70; g.fillStyle = col; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + (k - 2) * w * .32, y + Math.sin(k * 1.7) * 6, w * .32, w * .2, 0, 0, TAU); g.fill(); } } }
    function windows(g, x, y, w, h, cols, rows, lit, dark, r, pLit = .5) { const cw = w / cols, rh = h / rows; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { g.fillStyle = r() < pLit ? lit : dark; g.fillRect(x + i * cw + cw * .22, y + j * rh + rh * .2, cw * .56, rh * .55); } }

    const S = {};
    /* ---------- 1. Rotterdamse haven at sunset ---------- */
    S.haven = {
      far(g, u0, u1) {
        sky(g, u0, u1, 520, [[0, '#3a2a6a'], [.45, '#c4547a'], [.75, '#ff9a52'], [1, '#ffd37a']]);
        circ(g, u0 + (u1 - u0) * .62, 120, 46, 'rgba(255,236,170,.95)'); circ(g, u0 + (u1 - u0) * .62, 120, 70, 'rgba(255,220,140,.25)');
        const r = rnd(4); g.fillStyle = '#5b3a6e';
        for (let x = u0; x < u1; x += 26 + r() * 40) { const h = 60 + r() * 150, w = 22 + r() * 34; g.fillRect(x, 40, w, h); }
        g.fillStyle = '#6e4a7e'; for (let x = u0 + 20; x < u1; x += 70 + r() * 90) { const h = 90 + r() * 110; g.fillRect(x, 40, 16, h); }
        // a cable-stayed bridge: one tall bent white pylon, cables and a deck
        const bx = u0 + (u1 - u0) * .3;
        g.strokeStyle = '#f1e9f4'; g.lineWidth = 9; g.beginPath(); g.moveTo(bx, 60); g.quadraticCurveTo(bx + 10, 180, bx - 14, 300); g.stroke();
        g.strokeStyle = 'rgba(241,233,244,.75)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 9; i++) { g.moveTo(bx - 6 - i * 1.4, 290 - i * 22); g.lineTo(bx + 30 + i * 26, 74); g.moveTo(bx - 6 - i * 1.4, 290 - i * 22); g.lineTo(bx - 40 - i * 22, 74); } g.stroke();
        rect(g, u0, 64, u1 - u0, 12, '#f1e9f4');
        g.fillStyle = lg(g, 0, 60, 0, -10, [[0, '#ff9a6a'], [1, '#4a3a7a']]); g.fillRect(u0, -10, u1 - u0, 70);
        g.strokeStyle = 'rgba(255,230,180,.35)'; g.lineWidth = 2; for (let i = 0; i < 30; i++) { const x = u0 + r() * (u1 - u0), y = 4 + r() * 50; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + r() * 30, y); g.stroke(); }
      },
      mid(g, u0, u1) {
        const r = rnd(7), cols = ['#d8433a', '#2f7cc4', '#f0b62a', '#3aa36a', '#8a4fc0', '#e8743a'];
        // container stacks
        for (let x = u0 + 10; x < u1; x += 150 + r() * 120) {
          const n = 2 + Math.floor(r() * 3);
          for (let j = 0; j < n; j++) for (let i = 0; i < 2; i++) { const c = cols[Math.floor(r() * cols.length)], cx = x + i * 64, cy = 4 + j * 30;
            g.fillStyle = c; g.fillRect(cx, cy, 62, 28); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.strokeRect(cx, cy, 62, 28);
            g.strokeStyle = 'rgba(0,0,0,.18)'; g.beginPath(); for (let k = 6; k < 62; k += 6) { g.moveTo(cx + k, cy + 3); g.lineTo(cx + k, cy + 25); } g.stroke(); }
        }
        // cranes (the trolley and its hanging container move: see anim)
        for (const [cx, col] of [[u0 + (u1 - u0) * .22, '#2f6fc4'], [u0 + (u1 - u0) * .7, '#d8433a']]) {
          g.fillStyle = col; g.strokeStyle = '#1a1424'; g.lineWidth = 2;
          for (const lx of [cx - 40, cx + 40]) { g.fillRect(lx - 5, 0, 10, 250); g.strokeRect(lx - 5, 0, 10, 250); }
          g.fillRect(cx - 120, 240, 300, 14); g.strokeRect(cx - 120, 240, 300, 14); g.fillRect(cx - 40, 120, 80, 10);
          g.beginPath(); g.moveTo(cx - 40, 254); g.lineTo(cx, 320); g.lineTo(cx + 40, 254); g.stroke();
          g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); for (let k = -110; k < 170; k += 20) { g.moveTo(cx + k, 240); g.lineTo(cx + k + 10, 254); } g.stroke();
          g.fillStyle = '#f4f1e8'; g.fillRect(cx - 30, 254, 26, 18); g.strokeStyle = '#1a1424'; g.lineWidth = 2; g.strokeRect(cx - 30, 254, 26, 18);
        }
      },
      floor(g, u0, u1) {
        g.fillStyle = lg(g, 0, 0, 0, -90, [[0, '#8c8a96'], [1, '#55525e']]); g.fillRect(u0, -100, u1 - u0, 100);
        g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let x = Math.floor(u0 / 90) * 90; x < u1; x += 90) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 40, -100); g.stroke(); }
        g.fillStyle = '#e8c23a'; g.fillRect(u0, -4, u1 - u0, 5);
        for (let x = Math.floor(u0 / 260) * 260 + 60; x < u1; x += 260) { g.fillStyle = '#2a2a34'; g.beginPath(); g.roundRect(x, -8, 22, 26, 6); g.fill(); g.fillStyle = '#4a4a56'; g.fillRect(x - 3, 14, 28, 6); }
      },
      // moving bits as small sprites (moved by CSS): crane trolleys with hanging containers, seagulls
      sprites(add, L) {
        const cranes = [[.22, '#f0b62a'], [.7, '#3aa36a']].map(([k, col]) => ({ k, cx: L.mid.u0 + (L.mid.u1 - L.mid.u0) * k,
          cab: add('mid', [-20, -101, 20, 1], g => { g.strokeStyle = '#1a1424'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-18, -100); g.moveTo(10, 0); g.lineTo(18, -100); g.stroke(); }),
          tro: add('mid', [-15, -1, 15, 9], g => { g.fillStyle = '#2a2430'; g.fillRect(-14, 0, 28, 8); }),
          box: add('mid', [-33, -2, 33, 28], g => { g.fillStyle = col; g.fillRect(-31, 0, 62, 26); g.strokeStyle = '#1a1424'; g.lineWidth = 1.5; g.strokeRect(-31, 0, 62, 26); g.strokeStyle = 'rgba(0,0,0,.2)'; g.beginPath(); for (let x = -25; x < 31; x += 6) { g.moveTo(x, 3); g.lineTo(x, 23); } g.stroke(); }) }));
        const gull = g => { g.strokeStyle = '#2a1a3a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-10, 2); g.quadraticCurveTo(-5, 6, 0, 0); g.quadraticCurveTo(5, 6, 10, 2); g.stroke(); };
        const gulls = [0, 1, 2, 3].map(() => add('far', [-12, -2, 12, 8], gull));
        return t => {
          for (const c of cranes) { const x = c.cx + Math.sin(t / 240 + c.k * 9) * 90, hy = 170 + Math.sin(t / 160 + c.k * 5) * 40;
            c.tro.set(x, 238); c.cab.set(x, 240, 0, 1, (240 - hy - 26) / 100); c.box.set(x, hy); }
          gulls.forEach((s, i) => { s.set(L.far.u0 + ((t * (.25 + i * .06) + i * 330) % (L.far.u1 - L.far.u0 + 200)) - 100, 300 + i * 34 + Math.sin(t / 30 + i) * 8, 0, 1, Math.sin(t / 8 + i * 2) * .9); });
        };
      },
    };
    /* ---------- 2. Amsterdamse gracht ---------- */
    S.gracht = {
      far(g, u0, u1) {
        sky(g, u0, u1, 520, [[0, '#5aa8ec'], [1, '#cfeaff']]);
        const r = rnd(11); clouds(g, u0, u1, 330, 470, 6, 'rgba(255,255,255,.85)', r);
        const cols = ['#7a3a2a', '#3a4a6a', '#5a2a2a', '#2a4a3a', '#8a5a3a', '#4a2a3a', '#6a6a7a'];
        for (let x = u0 - 20; x < u1; x += 74) {
          const h = 200 + r() * 90, w = 72, c = cols[Math.floor(r() * cols.length)], top = 60 + h, kind = Math.floor(r() * 3);
          g.fillStyle = c; g.fillRect(x, 60, w, h);
          g.beginPath(); if (kind === 0) { g.moveTo(x, top); g.lineTo(x + w / 2, top + 40); g.lineTo(x + w, top); }
          else if (kind === 1) { g.moveTo(x, top); g.lineTo(x + 10, top); g.lineTo(x + 10, top + 16); g.lineTo(x + 22, top + 16); g.lineTo(x + 22, top + 32); g.lineTo(x + 50, top + 32); g.lineTo(x + 50, top + 16); g.lineTo(x + 62, top + 16); g.lineTo(x + 62, top); g.lineTo(x + w, top); }
          else { g.moveTo(x, top); g.quadraticCurveTo(x + 6, top + 26, x + 20, top + 24); g.quadraticCurveTo(x + w / 2, top + 50, x + w - 20, top + 24); g.quadraticCurveTo(x + w - 6, top + 26, x + w, top); }
          g.closePath(); g.fill(); g.strokeStyle = '#f2ece0'; g.lineWidth = 3; g.stroke();
          windows(g, x + 6, 74, w - 12, h - 20, 3, Math.floor(h / 44), '#f6f0d8', '#2a3040', r, .75);
          g.fillStyle = '#f2ece0'; g.fillRect(x + 31, top + 4, 10, 10);
        }
        g.fillStyle = '#2f7a3a'; for (let x = u0; x < u1; x += 120) { g.beginPath(); g.ellipse(x + r() * 40, 120 + r() * 30, 50, 70, 0, 0, TAU); g.fill(); }
      },
      mid(g, u0, u1) {
        g.fillStyle = lg(g, 0, 60, 0, -10, [[0, '#3a7a8a'], [1, '#1e4a5a']]); g.fillRect(u0, -10, u1 - u0, 74);
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; const r = rnd(3); for (let i = 0; i < 40; i++) { const x = u0 + r() * (u1 - u0), y = r() * 56; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y); g.stroke(); }
        // a brick bridge with railing
        const bx = u0 + (u1 - u0) * .55; g.fillStyle = '#8a4a32'; g.beginPath(); g.moveTo(bx - 160, 60); g.lineTo(bx + 160, 60); g.lineTo(bx + 160, 100); g.lineTo(bx - 160, 100); g.fill();
        g.fillStyle = '#1e4a5a'; g.beginPath(); g.ellipse(bx, 60, 70, 34, 0, 0, Math.PI); g.fill();
        g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx - 160, 124); g.lineTo(bx + 160, 124); for (let x = bx - 160; x <= bx + 160; x += 20) { g.moveTo(x, 100); g.lineTo(x, 124); } g.stroke();
        // parked bikes along the canal
        for (let x = u0 + 30; x < u1; x += 140 + r() * 80) bike(g, x, 64, ['#d8433a', '#2a2a2a', '#3a6ac4', '#e8c23a'][Math.floor(r() * 4)]);
      },
      floor(g, u0, u1) {
        g.fillStyle = '#7a6a62'; g.fillRect(u0, -100, u1 - u0, 100);
        const r = rnd(5); for (let y = -6; y > -100; y -= 12) for (let x = u0 + ((y / 12) % 2) * 9; x < u1; x += 18) { g.fillStyle = `hsl(18,${10 + r() * 10}%,${36 + r() * 12}%)`; g.beginPath(); g.roundRect(x, y - 10, 16, 10, 3); g.fill(); }
        g.fillStyle = '#4a3e3a'; g.fillRect(u0, -6, u1 - u0, 7);
      },
      sprites(add, L) {
        const boat = add('mid', [-96, 10, 106, 56], g => {
          g.fillStyle = '#f4f1e8'; g.beginPath(); g.moveTo(-90, 30); g.lineTo(70, 30); g.quadraticCurveTo(100, 30, 96, 14); g.lineTo(-86, 14); g.closePath(); g.fill(); g.strokeStyle = '#1a2a3a'; g.lineWidth = 2; g.stroke();
          g.fillStyle = '#2a5a8a'; g.beginPath(); g.roundRect(-70, 30, 120, 22, 8); g.fill(); g.stroke(); g.fillStyle = '#bfe4ff'; for (let i = 0; i < 6; i++) g.fillRect(-62 + i * 19, 36, 13, 10); });
        const bk = add('mid', [-24, -2, 24, 32], g => bike(g, 0, 0, '#e8c23a'));
        const cl = [0, 1, 2].map(() => add('far', [-34, -20, 112, 28], cloudShape));
        return t => {
          const w = L.mid.u1 - L.mid.u0; boat.set(L.mid.u0 + ((t * .5) % (w + 400)) - 200, 0);
          const bx = L.mid.u0 + w * .55, k = ((t * .9) % 700) / 700; bk.set(bx - 170 + k * 340, 102);
          clouds3(cl, t, L.far);
        };
      },
    };
    function bike(g, x, y, c, t) {
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.beginPath(); g.arc(x - 13, y + 9, 9, 0, TAU); g.arc(x + 13, y + 9, 9, 0, TAU); g.stroke();
      g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 13, y + 9); g.lineTo(x - 2, y + 22); g.lineTo(x + 10, y + 22); g.lineTo(x + 13, y + 9); g.moveTo(x - 2, y + 22); g.lineTo(x, y + 9); g.lineTo(x - 13, y + 9); g.moveTo(x - 4, y + 26); g.lineTo(x - 1, y + 22); g.moveTo(x + 10, y + 22); g.lineTo(x + 12, y + 28); g.stroke();
    }
    function cloudShape(g) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(k * 26, (k % 2) * 8, 30, 16, 0, 0, TAU); g.fill(); } }
    function clouds3(list, t, Lf) { const w = Lf.u1 - Lf.u0; list.forEach((s, i) => s.set(Lf.u0 + ((t * (.08 + i * .03) + i * 400) % (w + 300)) - 150, 420 - i * 40)); }
    function clouds2(g, t, Lf) { const w = Lf.u1 - Lf.u0; g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 3; i++) { const x = Lf.u0 + ((t * (.08 + i * .03) + i * 400) % (w + 300)) - 150, y = 420 - i * 40; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 26, y + (k % 2) * 8, 30, 16, 0, 0, TAU); g.fill(); } } }
    /* ---------- 3. Molen in de polder ---------- */
    S.polder = {
      far(g, u0, u1) {
        sky(g, u0, u1, 520, [[0, '#4a9ae8'], [.7, '#bfe2ff'], [1, '#eaf6ff']]);
        const r = rnd(21); clouds(g, u0, u1, 300, 470, 7, 'rgba(255,255,255,.9)', r);
        g.fillStyle = '#7fbf5a'; g.fillRect(u0, -10, u1 - u0, 90);
        for (let i = 0; i < 4; i++) { const x = u0 + r() * (u1 - u0); millSil(g, x, 78, .35 + r() * .2, '#5a7a8a'); }
        g.strokeStyle = '#6aa8d0'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(u0, 20 + i * 14); g.lineTo(u1, 30 + i * 12); g.stroke(); }
      },
      mid(g, u0, u1) {
        const r = rnd(9); g.fillStyle = '#5aa84a'; g.beginPath(); g.moveTo(u0, -10); g.lineTo(u0, 50); for (let x = u0; x <= u1; x += 40) g.lineTo(x, 50 + Math.sin(x / 90) * 8); g.lineTo(u1, -10); g.fill();
        // the big windmill (sails turn in anim)
        const mx = u0 + (u1 - u0) * .68; g.fillStyle = '#3a3a44'; g.beginPath(); g.moveTo(mx - 46, 40); g.lineTo(mx - 26, 230); g.lineTo(mx + 26, 230); g.lineTo(mx + 46, 40); g.fill();
        g.fillStyle = '#5a3a2a'; g.beginPath(); g.moveTo(mx - 32, 228); g.quadraticCurveTo(mx, 280, mx + 32, 228); g.fill(); g.fillStyle = '#f4f1e8'; g.fillRect(mx - 52, 120, 104, 8); g.fillStyle = '#2a5a3a'; g.fillRect(mx - 10, 40, 20, 34);
        g.fillStyle = '#fff'; g.fillRect(mx - 8, 160, 14, 18);
        // cows
        for (const [x, s] of [[u0 + 120, 1], [u0 + (u1 - u0) * .35, .8], [u1 - 140, .9]]) cow(g, x, 46, s);
        g.fillStyle = '#2f7a3a'; for (let x = u0; x < u1; x += 70) { g.beginPath(); g.ellipse(x + r() * 30, 60, 26, 14, 0, 0, TAU); g.fill(); }
      },
      floor(g, u0, u1) {
        g.fillStyle = lg(g, 0, 0, 0, -100, [[0, '#8a6a4a'], [1, '#5a4430']]); g.fillRect(u0, -100, u1 - u0, 100);
        g.fillStyle = '#4a8a3a'; g.fillRect(u0, -100, u1 - u0, 34);
        const cols = ['#e8343c', '#ffcf2e', '#ff6ab0', '#f4f1e8', '#ff8a2a'];
        for (let row = 0; row < 3; row++) for (let x = u0 + row * 7; x < u1; x += 14) { const y = -78 + row * 9, c = cols[(Math.floor(x / 140) + row) % cols.length];
          g.strokeStyle = '#2f6a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x, y); g.stroke(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y + 3, 4, 5, 0, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(u0, -6, u1 - u0, 6);
      },
      sprites(add, L) {
        const mx = L.mid.u0 + (L.mid.u1 - L.mid.u0) * .68;
        const sails = add('mid', [-146, -146, 146, 146], g => {
          for (let k = 0; k < 4; k++) { g.rotate(TAU / 4); g.fillStyle = '#5a3a2a'; g.fillRect(-3, 0, 6, 140); g.fillStyle = 'rgba(244,240,230,.92)'; g.fillRect(4, 22, 26, 116); g.strokeStyle = '#5a3a2a'; g.lineWidth = 1.5; for (let y = 30; y < 138; y += 14) { g.beginPath(); g.moveTo(4, y); g.lineTo(30, y); g.stroke(); } }
          g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); });
        const cl = [0, 1, 2].map(() => add('far', [-34, -20, 112, 28], cloudShape));
        const birds = [0, 1, 2].map(() => add('far', [-10, -2, 10, 7], g => { g.strokeStyle = '#2a2a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, 2); g.quadraticCurveTo(-4, 5, 0, 0); g.quadraticCurveTo(4, 5, 8, 2); g.stroke(); }));
        return t => {
          sails.set(mx, 236, t / 70 * 180 / Math.PI);
          clouds3(cl, t, L.far);
          birds.forEach((s, i) => s.set(L.far.u0 + ((t * .3 + i * 200) % (L.far.u1 - L.far.u0)), 360 + i * 20 + Math.sin(t / 20 + i) * 10, 0, 1, Math.sin(t / 7 + i) * .9));
        };
      },
    };
    function millSil(g, x, y, s, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x - 30 * s, y); g.lineTo(x - 18 * s, y + 150 * s); g.lineTo(x + 18 * s, y + 150 * s); g.lineTo(x + 30 * s, y); g.fill(); g.strokeStyle = c; g.lineWidth = 6 * s; g.beginPath(); g.moveTo(x - 90 * s, y + 70 * s); g.lineTo(x + 90 * s, y + 230 * s); g.moveTo(x - 90 * s, y + 230 * s); g.lineTo(x + 90 * s, y + 70 * s); g.stroke(); }
    function cow(g, x, y, s) {
      g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#f6f4ee'; g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(-30, 14, 60, 30, 12); g.fill(); g.stroke(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.ellipse(-10, 32, 9, 7, 0, 0, TAU); g.ellipse(14, 22, 7, 6, 0, 0, TAU); g.fill();
      g.fillStyle = '#f6f4ee'; g.beginPath(); g.roundRect(26, 26, 18, 16, 6); g.fill(); g.stroke(); g.fillStyle = '#f2a0a8'; g.fillRect(38, 26, 7, 8);
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 4; g.beginPath(); for (const lx of [-22, -12, 12, 22]) { g.moveTo(lx, 14); g.lineTo(lx, 0); } g.stroke(); g.restore();
    }
    /* ---------- 4. Bergtempel ---------- */
    S.tempel = {
      far(g, u0, u1) {
        sky(g, u0, u1, 520, [[0, '#f7c6d0'], [.6, '#fde6d6'], [1, '#fff6ea']]);
        circ(g, u0 + (u1 - u0) * .2, 380, 40, 'rgba(255,240,230,.9)');
        const r = rnd(31);
        for (const [y0, col, amp] of [[160, '#c9a8c8', 140], [110, '#a986ac', 110], [60, '#86688e', 80]]) {
          g.fillStyle = col; g.beginPath(); g.moveTo(u0, -10); let x = u0; g.lineTo(u0, y0);
          while (x < u1) { const w = 60 + r() * 120; g.lineTo(x + w / 2, y0 + amp * (.4 + r() * .6)); x += w; g.lineTo(x, y0 + r() * 30); }
          g.lineTo(u1, -10); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(u0, y0 - 10, u1 - u0, 20);
        }
      },
      mid(g, u0, u1) {
        const px = u0 + (u1 - u0) * .55;
        for (let i = 0; i < 4; i++) { const y = 20 + i * 62, w = 150 - i * 26;
          g.fillStyle = '#b8322c'; g.fillRect(px - w * .4, y, w * .8, 46); g.fillStyle = '#2a2030'; g.beginPath(); g.moveTo(px - w, y + 46); g.quadraticCurveTo(px - w * .5, y + 52, px, y + 64); g.quadraticCurveTo(px + w * .5, y + 52, px + w, y + 46); g.lineTo(px + w * .8, y + 40); g.lineTo(px - w * .8, y + 40); g.closePath(); g.fill();
          g.fillStyle = '#f6d36a'; for (let k = -2; k <= 2; k++) g.fillRect(px + k * w * .16 - 4, y + 10, 8, 22); }
        g.fillStyle = '#2a2030'; g.fillRect(px - 2, 270, 4, 40);
        // cherry trees
        for (const x of [u0 + 90, u0 + (u1 - u0) * .25, u1 - 120]) { g.strokeStyle = '#4a2a2a'; g.lineWidth = 10; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 10, 60, x - 10, 120); g.moveTo(x + 2, 70); g.lineTo(x + 40, 110); g.stroke();
          const r = rnd(x | 0); for (let i = 0; i < 16; i++) circ(g, x - 50 + r() * 100, 100 + r() * 60, 18 + r() * 14, i % 3 ? '#f6a8c4' : '#fbc8da'); }
        // gate
        const gx = u0 + (u1 - u0) * .12; g.fillStyle = '#c4382c'; g.fillRect(gx - 50, 0, 10, 150); g.fillRect(gx + 40, 0, 10, 150); g.fillRect(gx - 64, 150, 128, 12); g.fillRect(gx - 56, 126, 112, 8);
      },
      floor(g, u0, u1) {
        g.fillStyle = '#9a8e88'; g.fillRect(u0, -100, u1 - u0, 100);
        g.strokeStyle = 'rgba(40,30,30,.3)'; g.lineWidth = 2; for (let y = -20; y > -100; y -= 22) { g.beginPath(); g.moveTo(u0, y); g.lineTo(u1, y); g.stroke(); for (let x = u0 + ((y / 22) % 2) * 30; x < u1; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } }
        g.fillStyle = '#b8aca6'; g.fillRect(u0, -6, u1 - u0, 6);
      },
      sprites(add, L) {
        const lan = [0, 1, 2, 3, 4, 5].map(i => ({ x: L.mid.u0 + (L.mid.u1 - L.mid.u0) * (.1 + i * .16), s: add('mid', [-12, -52, 12, 2], g => {
          g.strokeStyle = '#2a2030'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -24); g.stroke();
          g.fillStyle = '#ff6a3a'; g.beginPath(); g.ellipse(0, -36, 10, 13, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,220,120,.6)'; g.beginPath(); g.ellipse(0, -36, 5, 9, 0, 0, TAU); g.fill(); }) }));
        const pet = [];
        for (let i = 0; i < 22; i++) pet.push(add('floor', [-5, -4, 5, 4], g => { g.fillStyle = i % 2 ? '#f9b6cc' : '#fdd2e0'; g.beginPath(); g.ellipse(0, 0, 4, 2.5, 0, 0, TAU); g.fill(); }));
        return t => {
          lan.forEach((l, i) => l.s.set(l.x, 270, Math.sin(t / 40 + i) * 7));
          const f = L.floor;
          pet.forEach((s, i) => { const ph = i * 97.3, x = f.u0 + ((ph * 13 + t * (.4 + (i % 5) * .1)) % (f.u1 - f.u0)), y = 460 - ((t * (.6 + (i % 4) * .15) + ph * 7) % 520), w = Math.sin(t / 12 + i);
            s.set(x + w * 10, y, w * 57); });
        };
      },
    };
    /* ---------- 5. Ruimtestation ---------- */
    S.ruimte = {
      far(g, u0, u1) {
        g.fillStyle = '#060a1e'; g.fillRect(u0, -100, u1 - u0, 640);
        const r = rnd(41); for (let i = 0; i < 260; i++) { const a = r(); g.fillStyle = `rgba(255,255,255,${.3 + a * .7})`; g.fillRect(u0 + r() * (u1 - u0), r() * 520, a > .9 ? 2.5 : 1.5, a > .9 ? 2.5 : 1.5); }
        const ex = u0 + (u1 - u0) * .45; g.fillStyle = rg(g, ex - 60, 60, 40, 330, [[0, '#7ad0ff'], [.5, '#2a6ad0'], [1, '#0a1e4a']]); g.beginPath(); g.arc(ex, -120, 320, 0, TAU); g.fill();
        g.fillStyle = 'rgba(90,200,110,.85)'; for (const [dx, dy, w, h] of [[-160, 150, 90, 40], [-40, 180, 70, 22], [80, 140, 110, 46], [180, 90, 60, 50]]) { g.beginPath(); g.ellipse(ex + dx, dy, w, h, .3, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(ex - 250 + r() * 500, 60 + r() * 140, 40 + r() * 50, 6 + r() * 6, .2, 0, TAU); g.fill(); }
        g.strokeStyle = 'rgba(140,210,255,.5)'; g.lineWidth = 10; g.beginPath(); g.arc(ex, -120, 326, 0, TAU); g.stroke();
      },
      mid(g, u0, u1) {
        // window frames and struts of the station
        g.fillStyle = '#2a3346'; for (let x = Math.floor(u0 / 240) * 240; x < u1; x += 240) { g.fillRect(x - 16, -10, 32, 540); g.fillStyle = '#3a4560'; g.fillRect(x - 8, -10, 6, 540); g.fillStyle = '#2a3346'; }
        g.fillStyle = '#222a3c'; g.fillRect(u0, 420, u1 - u0, 120); g.fillRect(u0, -10, u1 - u0, 70);
        g.fillStyle = '#3a4560'; g.fillRect(u0, 412, u1 - u0, 10); g.fillRect(u0, 56, u1 - u0, 8);
        for (let x = Math.floor(u0 / 120) * 120 + 30; x < u1; x += 120) { g.fillStyle = '#323c52'; g.fillRect(x, 10, 70, 36); g.strokeStyle = '#4a5878'; g.lineWidth = 2; g.strokeRect(x, 10, 70, 36); }
      },
      floor(g, u0, u1) {
        g.fillStyle = lg(g, 0, 0, 0, -100, [[0, '#5a6680'], [1, '#2a3246']]); g.fillRect(u0, -100, u1 - u0, 100);
        g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; for (let x = Math.floor(u0 / 40) * 40; x < u1; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 30, -100); g.stroke(); }
        for (let y = -25; y > -100; y -= 25) { g.beginPath(); g.moveTo(u0, y); g.lineTo(u1, y); g.stroke(); }
        g.fillStyle = '#ffd23a'; for (let x = Math.floor(u0 / 60) * 60; x < u1; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, 0); g.lineTo(x + 20, -6); g.lineTo(x - 10, -6); g.fill(); }
      },
      sprites(add, L) {
        const cols = ['#5ff6ff', '#ff5a7a', '#7aff7a', '#ffd23a'], panels = [];
        for (let x = Math.floor(L.mid.u0 / 120) * 120 + 30, i = 0; x < L.mid.u1; x += 120, i++) for (let k = 0; k < 4; k++)
          panels.push({ i, k, s: add('mid', [-1, -1, 11, 11], g => { g.fillStyle = cols[k]; g.fillRect(0, 0, 10, 10); }), x: x + 8 + k * 16 });
        const sat = add('far', [-41, -9, 41, 9], g => { g.fillStyle = '#c9d2e0'; g.fillRect(-8, -8, 16, 16); g.fillStyle = '#2a5ad0'; g.fillRect(-40, -6, 28, 12); g.fillRect(12, -6, 28, 12); });
        return t => {
          for (const p of panels) p.s.set(p.x, 22, 0, 1, 1, ((t / 20 + p.i * 3 + p.k * 7) | 0) % 5 < 2 ? 1 : 0);
          sat.set(L.far.u0 + ((t * .15) % (L.far.u1 - L.far.u0 + 200)) - 100, 400 + Math.sin(t / 90) * 20, t / 200 * 180 / Math.PI);
        };
      },
    };
    /* ---------- 6. Kermis at night ---------- */
    S.kermis = {
      far(g, u0, u1) {
        sky(g, u0, u1, 520, [[0, '#0e1240'], [.7, '#3a2a6a'], [1, '#6a3a7a']]);
        const r = rnd(51); for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(u0 + r() * (u1 - u0), 200 + r() * 320, 1.5, 1.5); }
        g.fillStyle = '#1e1640'; for (let x = u0; x < u1; x += 40 + r() * 60) g.fillRect(x, 0, 30 + r() * 40, 60 + r() * 100);
      },
      mid(g, u0, u1) {
        const wx = u0 + (u1 - u0) * .3; g.strokeStyle = '#2a2050'; g.lineWidth = 8; g.beginPath(); g.moveTo(wx - 80, 0); g.lineTo(wx, 250); g.lineTo(wx + 80, 0); g.stroke();
        // tents with stripes
        const r = rnd(61);
        for (const [x, w, c1, c2] of [[u0 + (u1 - u0) * .62, 200, '#e8343c', '#f6f1e8'], [u0 + 60, 140, '#2f6fe0', '#ffd23a'], [u1 - 140, 160, '#1f9a4a', '#f6f1e8']]) {
          g.save(); g.beginPath(); g.moveTo(x - w / 2, 0); g.lineTo(x - w / 2, 90); g.lineTo(x, 170); g.lineTo(x + w / 2, 90); g.lineTo(x + w / 2, 0); g.closePath(); g.clip();
          for (let k = -w; k < w; k += 24) { g.fillStyle = (k / 24) % 2 ? c1 : c2; g.fillRect(x + k, 0, 12, 180); g.fillStyle = (k / 24) % 2 ? c2 : c1; g.fillRect(x + k + 12, 0, 12, 180); }
          g.restore(); g.fillStyle = '#2a1a1a'; g.fillRect(x - 20, 0, 40, 50); g.strokeStyle = '#ffd23a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 170); g.lineTo(x, 196); g.stroke(); g.fillStyle = c1; g.beginPath(); g.moveTo(x, 196); g.lineTo(x + 20, 190); g.lineTo(x, 184); g.fill();
        }
      },
      floor(g, u0, u1) {
        g.fillStyle = lg(g, 0, 0, 0, -100, [[0, '#3a3450'], [1, '#1e1a2c']]); g.fillRect(u0, -100, u1 - u0, 100);
        for (let x = Math.floor(u0 / 200) * 200; x < u1; x += 200) { g.fillStyle = rg(g, x + 100, -40, 4, 120, [[0, 'rgba(255,200,120,.28)'], [1, 'rgba(255,200,120,0)']]); g.fillRect(x, -100, 200, 100); }
      },
      sprites(add, L) {
        const wx = L.mid.u0 + (L.mid.u1 - L.mid.u0) * .3, cy = 250, R = 200;
        const wheel = add('mid', [-206, -206, 206, 206], g => {
          g.strokeStyle = '#e8e0ff'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R * .55, 0, TAU);
          for (let k = 0; k < 12; k++) { const b = k * TAU / 12; g.moveTo(0, 0); g.lineTo(Math.cos(b) * R, Math.sin(b) * R); } g.stroke();
          for (let k = 0; k < 36; k++) { const b = k * TAU / 36; g.fillStyle = k % 2 ? '#fff3a0' : '#7a6a40'; g.beginPath(); g.arc(Math.cos(b) * R, Math.sin(b) * R, 3, 0, TAU); g.fill(); }
          g.fillStyle = '#e8e0ff'; g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill(); });
        const bulbs = add('mid', [-206, -206, 206, 206], g => { for (let k = 0; k < 36; k += 2) { const b = (k + 1) * TAU / 36; g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(Math.cos(b) * R, Math.sin(b) * R, 3.2, 0, TAU); g.fill(); } });
        const cols = ['#e8343c', '#ffd23a', '#2f9ae0', '#1f9a4a'];
        const gond = [];
        for (let k = 0; k < 12; k++) gond.push(add('mid', [-15, -28, 15, 1], g => { g.fillStyle = cols[k % 4]; g.beginPath(); g.roundRect(-13, -26, 26, 22, 6); g.fill(); g.strokeStyle = '#2a2050'; g.lineWidth = 2; g.stroke(); }));
        const f = L.floor, str = flag => add('floor', [f.u0 - 1, 400, f.u1 + 1, 476], g => {
          for (let x = Math.floor(f.u0 / 160) * 160; x < f.u1; x += 160) { if (!flag) { g.strokeStyle = 'rgba(30,20,40,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, 470); g.quadraticCurveTo(x + 80, 420, x + 160, 470); g.stroke(); }
            for (let k = 1; k < 8; k++) { const u = k / 8, y = 470 - 100 * u * (1 - u); if (flag ? k % 2 : !(k % 2)) { g.fillStyle = ['#ff6a6a', '#ffd23a', '#7ae0ff', '#9aff7a'][k % 4]; g.beginPath(); g.arc(x + 160 * u, y - 4, 3.5, 0, TAU); g.fill(); } else if (!flag) { g.fillStyle = '#4a3a5a'; g.beginPath(); g.arc(x + 160 * u, y - 4, 3.5, 0, TAU); g.fill(); } } } });
        const sA = str(0), sB = str(1);
        return t => {
          const a = t / 260, deg = a * 180 / Math.PI;
          wheel.set(wx, cy, deg); bulbs.set(wx, cy, deg, 1, 1, ((t / 10) | 0) % 2);
          gond.forEach((s, k) => { const b = a + k * TAU / 12; s.set(wx + Math.cos(b) * R, cy + Math.sin(b) * R); });
          sA.set(0, 0); sB.set(0, 0, 0, 1, 1, ((t / 14) | 0) % 2);
        };
      },
    };
    /* ---------- 7. Strand van Scheveningen ---------- */
    S.strand = {
      far(g, u0, u1) {
        sky(g, u0, u1, 520, [[0, '#62b6f0'], [1, '#dff2ff']]);
        const r = rnd(71); clouds(g, u0, u1, 340, 480, 5, 'rgba(255,255,255,.9)', r);
        g.fillStyle = '#2a7ab8'; g.fillRect(u0, 40, u1 - u0, 70); g.fillStyle = '#3a9ad0'; g.fillRect(u0, 40, u1 - u0, 20);
        // a pier on legs with a round pavilion
        const px = u0 + (u1 - u0) * .7; g.fillStyle = '#d9d2c6'; g.fillRect(px - 260, 108, 400, 10); g.fillStyle = '#8a8270'; for (let x = px - 250; x < px + 140; x += 24) g.fillRect(x, 50, 4, 60);
        g.fillStyle = '#efe9de'; g.beginPath(); g.ellipse(px + 140, 118, 46, 14, 0, 0, TAU); g.fill(); g.fillRect(px + 100, 118, 80, 40); g.beginPath(); g.ellipse(px + 140, 158, 40, 26, 0, Math.PI, 0, true); g.fill(); g.fillStyle = '#c9c2b6'; g.fillRect(px + 138, 182, 4, 22);
      },
      mid(g, u0, u1) {
        g.fillStyle = '#e8d29a'; g.beginPath(); g.moveTo(u0, -10); g.lineTo(u0, 46); for (let x = u0; x <= u1; x += 60) g.lineTo(x, 46 + Math.sin(x / 130) * 6); g.lineTo(u1, -10); g.fill();
        const cols = ['#e8343c', '#2f7cf6', '#ffd23a', '#1f9a4a', '#ff8ac0'], r = rnd(73);
        for (let x = u0 + 40; x < u1; x += 70) { const c = cols[Math.floor(r() * cols.length)]; g.fillStyle = '#f6f1e8'; g.fillRect(x, 30, 54, 50); g.fillStyle = c; for (let k = 0; k < 54; k += 12) g.fillRect(x + k, 30, 6, 50);
          g.fillStyle = shadeC(c); g.beginPath(); g.moveTo(x - 4, 80); g.lineTo(x + 27, 100); g.lineTo(x + 58, 80); g.fill(); g.fillStyle = '#5a3a2a'; g.fillRect(x + 20, 30, 14, 26); }
      },
      floor(g, u0, u1) {
        g.fillStyle = lg(g, 0, 0, 0, -100, [[0, '#f0dca6'], [1, '#d8bc7a']]); g.fillRect(u0, -100, u1 - u0, 100);
        const r = rnd(75); for (let i = 0; i < (u1 - u0) / 8; i++) { g.fillStyle = 'rgba(160,120,60,.25)'; g.fillRect(u0 + r() * (u1 - u0), -r() * 100, 2, 2); }
        for (let x = Math.floor(u0 / 330) * 330 + 100; x < u1; x += 330) { g.fillStyle = '#f6f1e8'; g.beginPath(); g.ellipse(x, -60, 8, 5, .4, 0, TAU); g.fill(); }
      },
      sprites(add, L) {
        const f = L.far, wave = add('far', [f.u0 - 1, 40, f.u1 + 262, 72], g => { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { const y = 46 + i * 8; g.beginPath(); for (let x = f.u0; x <= f.u1 + 260; x += 10) g.lineTo(x, y + Math.sin(x / 40 + i) * 3); g.stroke(); } });
        const kites = [0, 1, 2].map(i => add('far', [-20, -380, 46, 28], g => { g.fillStyle = ['#e8343c', '#ffd23a', '#7a2fd0'][i]; g.beginPath(); g.moveTo(0, 26); g.lineTo(18, 0); g.lineTo(0, -26); g.lineTo(-18, 0); g.fill();
          g.strokeStyle = 'rgba(40,40,40,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(30, -120, 10, -380); g.stroke(); }));
        return t => {
          wave.set(-((t * .7) % (TAU * 40)), 0);
          kites.forEach((s, i) => s.set(f.u0 + (f.u1 - f.u0) * (.15 + i * .3) + Math.sin(t / 70 + i) * 30, 360 + Math.cos(t / 50 + i * 2) * 25, Math.sin(t / 40 + i) * 6));
        };
      },
    };
    function shadeC(c) { const n = parseInt(c.slice(1), 16); return `rgb(${(n >> 16) * .75 | 0},${(n >> 8 & 255) * .75 | 0},${(n & 255) * .75 | 0})`; }
    /* ---------- 8. Dak van de flat at night ---------- */
    S.dak = {
      far(g, u0, u1) {
        sky(g, u0, u1, 520, [[0, '#0a0c24'], [.6, '#1e1e4a'], [1, '#3a2a5a']]);
        circ(g, u0 + (u1 - u0) * .75, 400, 44, '#f6f1d8'); circ(g, u0 + (u1 - u0) * .75 + 12, 410, 10, 'rgba(200,190,160,.6)'); circ(g, u0 + (u1 - u0) * .75, 400, 80, 'rgba(246,241,216,.12)');
        const r = rnd(81); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(u0 + r() * (u1 - u0), 220 + r() * 300, 1.5, 1.5); }
        for (let x = u0 - 20; x < u1; x += 30 + r() * 50) { const h = 60 + r() * 200, w = 30 + r() * 50; g.fillStyle = '#16163a'; g.fillRect(x, -10, w, h); windows(g, x + 3, 0, w - 6, h - 16, Math.max(2, w / 12 | 0), Math.max(3, h / 16 | 0), '#ffd98a', '#1e1e48', r, .3); }
      },
      mid(g, u0, u1) {
        const r = rnd(83); for (let x = u0 - 20; x < u1; x += 80 + r() * 60) { const h = 100 + r() * 150, w = 60 + r() * 60; g.fillStyle = '#22224e'; g.fillRect(x, -10, w, h); windows(g, x + 4, 4, w - 8, h - 20, Math.max(2, w / 16 | 0), Math.max(3, h / 22 | 0), '#ffe6a0', '#2c2c5c', r, .35); }
        const ax = u0 + (u1 - u0) * .4; g.strokeStyle = '#3a3a6a'; g.lineWidth = 4; g.beginPath(); g.moveTo(ax, 0); g.lineTo(ax, 330); g.moveTo(ax - 30, 260); g.lineTo(ax + 30, 260); g.moveTo(ax - 20, 300); g.lineTo(ax + 20, 300); g.stroke();
      },
      floor(g, u0, u1) {
        g.fillStyle = lg(g, 0, 0, 0, -100, [[0, '#4a4658'], [1, '#2a2834']]); g.fillRect(u0, -100, u1 - u0, 100);
        const r = rnd(85); for (let i = 0; i < (u1 - u0) / 5; i++) { g.fillStyle = r() < .5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.08)'; g.fillRect(u0 + r() * (u1 - u0), -r() * 100, 3, 2); }
        for (let x = Math.floor(u0 / 380) * 380 + 50; x < u1; x += 380) { g.fillStyle = '#5a5668'; g.fillRect(x, 0, 60, 40); g.fillStyle = '#3a3646'; g.fillRect(x + 6, 8, 48, 6); g.fillRect(x + 6, 20, 48, 6); }
        g.strokeStyle = '#6a6678'; g.lineWidth = 3; g.beginPath(); g.moveTo(u0, 60); g.lineTo(u1, 60); for (let x = Math.floor(u0 / 50) * 50; x < u1; x += 50) { g.moveTo(x, 0); g.lineTo(x, 60); } g.stroke();
      },
      sprites(add, L) {
        const ax = L.mid.u0 + (L.mid.u1 - L.mid.u0) * .4;
        const lamp = add('mid', [-7, -7, 7, 7], g => { g.fillStyle = '#ff3a3a'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,60,60,.3)'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); });
        const mist = [0, 1, 2].map(() => add('far', [-92, -16, 92, 16], g => { g.fillStyle = 'rgba(160,150,200,.18)'; g.beginPath(); g.ellipse(0, 0, 90, 14, 0, 0, TAU); g.fill(); }));
        return t => {
          lamp.set(ax, 334, 0, 1, 1, ((t / 30) | 0) % 2);
          mist.forEach((s, i) => s.set(L.far.u0 + ((t * (.1 + i * .04) + i * 300) % (L.far.u1 - L.far.u0 + 300)) - 150, 380 + i * 30));
        };
      },
    };
    return { S, list: Object.keys(S) };
  })();
