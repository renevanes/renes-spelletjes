  /* ================= art: colours, symbols, glass, liquid ================= */
  // rich, clearly different liquids; [base, light, dark]
  const PAL = [
    ['#ec3448', '#ff7a86', '#a3142a'],   // rood
    ['#ff8c1a', '#ffbc6b', '#c25600'],   // oranje
    ['#ffd02e', '#fff08a', '#d69a00'],   // geel
    ['#8bd63a', '#c6f57e', '#4f9a12'],   // limoen
    ['#16a35f', '#5fd99a', '#0a6a3c'],   // groen
    ['#25c8d2', '#86f0f4', '#0d8a95'],   // turkoois
    ['#3d82ff', '#8fb9ff', '#1a4fc4'],   // blauw
    ['#5a3fd0', '#9a86f5', '#33208f'],   // indigo
    ['#b04de6', '#dc9cff', '#7420a8'],   // paars
    ['#ff5fae', '#ffa6d4', '#c42777'],   // roze
    ['#9b5b2d', '#d0915e', '#623512'],   // bruin
    ['#e6e9f0', '#ffffff', '#a9b1c2'],   // wit
  ];
  const CNAME = ['rood', 'oranje', 'geel', 'limoen', 'groen', 'turkoois', 'blauw', 'indigo', 'paars', 'roze', 'bruin', 'wit'];
  const THEMES = {
    avond: { name: 'Avond', top: '#2a1f5c', mid: '#3b2a78', bot: '#120d2e', bokeh: ['#ff7ac8', '#7a8cff', '#ffcf6b', '#6be4ff'], shelf: 'rgba(190,200,255,.16)', bar: '#231a4f' },
    lagune: { name: 'Lagune', top: '#0f5f73', mid: '#11788a', bot: '#07283a', bokeh: ['#7affd9', '#6bc8ff', '#fff3a8', '#b4ffb0'], shelf: 'rgba(190,255,245,.16)', bar: '#0c4a5b' },
    perzik: { name: 'Perzik', top: '#f08a7a', mid: '#c95d7c', bot: '#4a2252', bokeh: ['#ffe2a8', '#ffffff', '#ffb0c8', '#ffd27a'], shelf: 'rgba(255,235,230,.2)', bar: '#8a3b62' },
  };
  // colour-blind help: a symbol per colour, drawn as paths around (0,0) with radius 1
  function symbol(g, k) {
    g.beginPath();
    const P = pts => { pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
    const star = (n, r1, r2, a0 = -Math.PI / 2) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = a0 + i * Math.PI / n, r = i % 2 ? r2 : r1; p.push([Math.cos(a) * r, Math.sin(a) * r]); } P(p); };
    switch (k % 12) {
      case 0: g.arc(0, 0, .82, 0, 7); break;                                   // rondje
      case 1: P([[0, -.95], [.92, .7], [-.92, .7]]); break;                    // driehoek
      case 2: star(5, 1, .44); break;                                          // ster
      case 3: P([[-.3, -.95], [.3, -.95], [.3, -.3], [.95, -.3], [.95, .3], [.3, .3], [.3, .95], [-.3, .95], [-.3, .3], [-.95, .3], [-.95, -.3], [-.3, -.3]]); break;   // plus
      case 4: P([[0, -1], [.75, 0], [0, 1], [-.75, 0]]); break;                // ruit
      case 5: P([[-.75, -.75], [.75, -.75], [.75, .75], [-.75, .75]]); break;  // vierkant
      case 6: g.arc(0, 0, .9, 0, 7); g.arc(0, 0, .45, 0, 7, true); break;      // ring
      case 7: P([[-.95, -.6], [-.6, -.95], [0, -.35], [.6, -.95], [.95, -.6], [.35, 0], [.95, .6], [.6, .95], [0, .35], [-.6, .95], [-.95, .6], [-.35, 0]]); break;   // kruis
      case 8: g.moveTo(0, .9); g.bezierCurveTo(-1.3, 0, -.7, -1.15, 0, -.45); g.bezierCurveTo(.7, -1.15, 1.3, 0, 0, .9); g.closePath(); break;   // hart
      case 9: g.arc(0, 0, .9, Math.PI * .3, Math.PI * 1.7); g.arc(.35, 0, .62, Math.PI * 1.55, Math.PI * .45, true); g.closePath(); break;    // maan
      case 10: P([[0, .95], [.92, -.7], [-.92, -.7]]); break;                  // driehoek omlaag
      case 11: star(6, 1, .55, 0); break;                                      // zesster
    }
  }

  /* tube geometry in CSS px, local to the tube element (origin top-left of the element box) */
  function tubeGeom(gw, lh, cap, U) {
    const wall = Math.max(1.6, gw * .055), iw = gw - 2 * wall, r = iw / 2, rimH = Math.max(4, gw * .13), head = lh * .38;
    const pad = Math.ceil(Math.max(4, gw * .1));
    const ix0 = pad + wall, ix1 = ix0 + iw, iy0 = pad + rimH;
    const iyb = iy0 + head + cap * lh + r * (1 - Math.PI / 4);   // interior bottom (the round bottom keeps every layer about lh high)
    const gh = (iyb - pad) + wall, W = gw + 2 * pad, H = Math.ceil(gh + 2 * pad);
    // the interior polygon (open mouth along the top) for volume sums
    const poly = [[ix0, iy0], [ix1, iy0], [ix1, iyb - r]];
    for (let k = 1; k < 16; k++) { const a = k / 16 * Math.PI; poly.push([ix0 + r + Math.cos(a) * r, iyb - r + Math.sin(a) * r]); }
    poly.push([ix0, iyb - r]);
    const g = { gw, lh, cap, U, wall, iw, r, rimH, head, pad, ix0, ix1, iy0, iyb, gh, W, H, poly, cx: ix0 + r };
    g.unit = areaBelow(g, 0, iy0 + head) / cap;            // one layer of liquid
    g.room = areaBelow(g, 0, iy0);                          // everything up to the rim
    return g;
  }
  // area of the interior below the world-horizontal line at height h, with the tube turned by angle a (clockwise)
  function areaBelow(g, a, h) {
    const s = Math.sin(a), c = Math.cos(a), P = g.poly, n = P.length; let A = 0, prev = null, first = null;
    const W = p => p[0] * s + p[1] * c;                      // world "down" coordinate of a local point
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = P[i], q = P[(i + 1) % n], wp = W(p) - h, wq = W(q) - h;
      if (wp >= 0) out.push(p);
      if ((wp >= 0) !== (wq >= 0)) { const t = wp / (wp - wq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    for (let i = 0; i < out.length; i++) { const p = out[i], q = out[(i + 1) % out.length]; A += p[0] * q[1] - q[0] * p[1]; }
    void prev; void first;
    return Math.abs(A) / 2;
  }
  // the height h (world-down coordinate) at which the liquid volume v (in layers) stands with the tube at angle a
  function levelFor(g, a, v) {
    const s = Math.sin(a), c = Math.cos(a); let lo = Infinity, hi = -Infinity;
    for (const p of g.poly) { const w = p[0] * s + p[1] * c; if (w < lo) lo = w; if (w > hi) hi = w; }
    const A = v * g.unit; if (A <= 0) return hi; if (A >= areaBelow(g, a, lo)) return lo;
    for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (areaBelow(g, a, m) > A) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  // the angle at which the volume v just reaches the lip (top-right inner corner, pouring to the right)
  function spillAngle(g, v) {
    const lip = [g.ix1, g.iy0]; let lo = 0, hi = Math.PI * .62;
    const at = a => areaBelow(g, a, lip[0] * Math.sin(a) + lip[1] * Math.cos(a)) / g.unit;
    if (at(0) <= v) return 0;
    for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (at(m) > v) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function tubePath(g2, G) {
    const { ix0, ix1, iy0, iyb, r } = G;
    g2.beginPath(); g2.moveTo(ix0, iy0 - 1); g2.lineTo(ix1, iy0 - 1); g2.lineTo(ix1, iyb - r); g2.arc(ix0 + r, iyb - r, r, 0, Math.PI); g2.closePath();
  }
  // static glass: back (behind the liquid) and front (highlights over it), drawn once per tube size
  function drawGlassBack(g, G, small) {
    const { pad, gw, gh, wall, ix0, ix1, iy0, iyb, r } = G, x0 = pad, x1 = pad + gw, y0 = pad, R = gw / 2;
    g.save();
    // glass body: a faint cool tint, darker at the edges like a real cylinder
    g.beginPath(); g.moveTo(x0, y0 + G.rimH * .5); g.lineTo(x0, y0 + gh - R); g.arc(x0 + R, y0 + gh - R, R, Math.PI, 0, true); g.lineTo(x1, y0 + G.rimH * .5); g.closePath();
    const bg = g.createLinearGradient(x0, 0, x1, 0);
    bg.addColorStop(0, 'rgba(210,230,255,.22)'); bg.addColorStop(.18, 'rgba(210,230,255,.06)'); bg.addColorStop(.75, 'rgba(210,230,255,.05)'); bg.addColorStop(1, 'rgba(210,230,255,.2)');
    g.fillStyle = bg; g.fill();
    // inside: a touch darker so the empty tube reads as glass, not as a hole
    tubePath(g, G); const ig = g.createLinearGradient(ix0, 0, ix1, 0); ig.addColorStop(0, 'rgba(10,15,40,.18)'); ig.addColorStop(.5, 'rgba(10,15,40,.05)'); ig.addColorStop(1, 'rgba(10,15,40,.16)'); g.fillStyle = ig; g.fill();
    // the back of the rim
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(pad + R, iy0 - 1, G.iw / 2, Math.max(1.5, G.rimH * .28), 0, Math.PI, 0); g.fill();
    if (small) { g.strokeStyle = 'rgba(255,214,120,.55)'; g.setLineDash([3, 3]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(ix0 + 2, iy0 + G.head * .5); g.lineTo(ix1 - 2, iy0 + G.head * .5); g.stroke(); g.setLineDash([]); }
    void wall; void iyb; void r;
    g.restore();
  }
  function drawGlassFront(g, G) {
    const { pad, gw, gh, rimH } = G, x0 = pad, x1 = pad + gw, y0 = pad, R = gw / 2;
    g.save();
    const body = () => { g.beginPath(); g.moveTo(x0, y0 + rimH * .55); g.lineTo(x0, y0 + gh - R); g.arc(x0 + R, y0 + gh - R, R, Math.PI, 0, true); g.lineTo(x1, y0 + rimH * .55); };
    // outline
    body(); g.lineWidth = Math.max(1.4, gw * .045); g.strokeStyle = 'rgba(235,245,255,.62)'; g.stroke();
    body(); g.lineWidth = Math.max(.8, gw * .018); g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
    // long highlight on the left, thin one on the right
    const hx = x0 + gw * .2, hw = gw * .13;
    let hg = g.createLinearGradient(0, y0 + rimH, 0, y0 + gh - R * .6); hg.addColorStop(0, 'rgba(255,255,255,.62)'); hg.addColorStop(.6, 'rgba(255,255,255,.3)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hg; g.beginPath(); g.moveTo(hx, y0 + rimH + 3); g.lineTo(hx + hw, y0 + rimH + 3); g.lineTo(hx + hw * .8, y0 + gh - R * .9); g.quadraticCurveTo(hx + hw * .3, y0 + gh - R * .5, hx, y0 + gh - R * 1.1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x1 - gw * .2, y0 + rimH + 6, Math.max(1, gw * .05), gh - rimH - R - 6);
    // a soft reflection in the round bottom
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, gw * .04); g.beginPath(); g.arc(x0 + R, y0 + gh - R, R * .7, Math.PI * .62, Math.PI * .88); g.stroke();
    // the rim: a slightly wider glass lip
    const lip = g.createLinearGradient(x0 - 2, 0, x1 + 2, 0); lip.addColorStop(0, 'rgba(255,255,255,.75)'); lip.addColorStop(.35, 'rgba(255,255,255,.35)'); lip.addColorStop(1, 'rgba(255,255,255,.6)');
    g.fillStyle = lip; rrect(g, x0 - gw * .07, y0, gw * 1.14, rimH * .62, rimH * .3); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; rrect(g, x0 - gw * .07, y0, gw * 1.14, rimH * .62, rimH * .3); g.stroke();
    g.restore();
  }
  function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* the liquid of one tube: segs = [[colour, amount, hidden], ...] bottom -> top; a = angle; drawn in local coordinates
     (the canvas covers the interior box; ox/oy = its offset in the element). The tube's own clip keeps it inside. */
  const gradCache = new WeakMap();
  function liquidGrad(g, G, c, hid) {
    let m = gradCache.get(g); if (!m) { m = new Map(); gradCache.set(g, m); }
    const key = (hid ? 'h' : c) + '|' + G.ix0; let gr = m.get(key); if (gr) return gr;
    const p = hid ? ['#4a5068', '#6b7290', '#2c3044'] : PAL[c];
    gr = g.createLinearGradient(G.ix0, 0, G.ix1, 0);
    gr.addColorStop(0, p[2]); gr.addColorStop(.16, p[0]); gr.addColorStop(.34, p[1]); gr.addColorStop(.5, p[0]); gr.addColorStop(.86, p[0]); gr.addColorStop(1, p[2]);
    m.set(key, gr); return gr;
  }
  function drawLiquid(g, G, segs, a, o) {
    // o: { wob: amplitude px, ph: phase, cb: colour-blind symbols, bub: [[x, y, r, alpha], ...] (local), flash: [[segIndex, alpha]] }
    const s = Math.sin(a), c = Math.cos(a), L = G.H * 2, dx = c, dy = -s, a0 = G.cx * c - (G.iy0 + G.iyb) / 2 * s;   // a0: where the tube's middle is along a level line
    g.save(); tubePath(g, G); g.clip();
    let vol = 0; const tops = [];
    for (const sg of segs) { vol += sg[1]; tops.push(levelFor(G, a, vol)); }
    let hLo = -1e9;                                          // world-down coordinate of the band's lower edge (start: far below)
    for (let i = 0; i < segs.length; i++) {
      const [col, amt, hid] = segs[i]; if (amt <= 1e-4) continue;
      const hHi = tops[i], top = i === segs.length - 1 || segs.slice(i + 1).every(x => x[1] <= 1e-4);
      g.beginPath();
      // lower edge (far below for the first band)
      const lo = i === 0 ? G.H * 3 : hLo;
      g.moveTo(s * lo + dx * (a0 - L), c * lo + dy * (a0 - L)); g.lineTo(s * lo + dx * (a0 + L), c * lo + dy * (a0 + L));
      if (top && o.wob > .05) {
        const N = 14; for (let k = N; k >= 0; k--) { const u = (k / N - .5) * 2, along = a0 + u * G.iw * .8, w = Math.sin(u * 3.1 + o.ph) * o.wob * (1 - Math.abs(u) * .3), hh = hHi + w;
          g.lineTo(s * hh + dx * along, c * hh + dy * along); }
        g.lineTo(s * hHi + dx * (a0 - L), c * hHi + dy * (a0 - L));
      } else { g.lineTo(s * hHi + dx * (a0 + L), c * hHi + dy * (a0 + L)); g.lineTo(s * hHi + dx * (a0 - L), c * hHi + dy * (a0 - L)); }
      g.closePath(); g.fillStyle = liquidGrad(g, G, col, hid); g.fill();
      const fl = o.flash && o.flash.find(f => f[0] === i);
      if (fl && fl[1] > 0) { g.fillStyle = `rgba(255,255,255,${(fl[1] * .7).toFixed(3)})`; g.fill(); }
      // a bright meniscus on the top
      if (top) {
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1.2, G.gw * .04); g.beginPath();
        const N = o.wob > .05 ? 10 : 1;
        for (let k = 0; k <= N; k++) { const u = N === 1 ? (k ? 1 : -1) : (k / N - .5) * 2, along = a0 + u * G.iw * .8, w = N === 1 ? 0 : Math.sin(u * 3.1 + o.ph) * o.wob * (1 - Math.abs(u) * .3), hh = hHi + w; const x = s * hh + dx * along, y = c * hh + dy * along; k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      } else {                                               // a faint line between two layers
        g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(s * hHi + dx * (a0 - G.iw), c * hHi + dy * (a0 - G.iw)); g.lineTo(s * hHi + dx * (a0 + G.iw), c * hHi + dy * (a0 + G.iw)); g.stroke();
      }
      const bandTop = hHi, bandLo = i === 0 ? null : hLo;
      // symbols / question marks in the middle of the band (only while the tube is fairly upright)
      if ((hid || o.cb) && Math.abs(a) < .9) {
        const yTop = (bandTop - G.cx * s) / c, yLo = bandLo === null ? G.iyb : (bandLo - G.cx * s) / c, ym = (yTop + yLo) / 2, hgt = yLo - yTop;
        if (hgt > G.lh * .45) {
          g.save(); g.translate(G.cx, ym);
          if (hid) { g.fillStyle = 'rgba(255,255,255,.82)'; g.font = `800 ${Math.round(G.iw * .62)}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, G.iw * .03); }
          else { const k = Math.min(G.iw * .3, hgt * .3); g.scale(k, k); symbol(g, col); g.fillStyle = col === 11 || col === 2 || col === 3 ? 'rgba(40,40,60,.62)' : 'rgba(255,255,255,.8)'; g.fill(); }
          g.restore();
        }
      }
      hLo = hHi;
    }
    // bubbles while pouring
    if (o.bub) for (const [x, y, r, al] of o.bub) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = `rgba(255,255,255,${(al * .5).toFixed(3)})`; g.fill(); g.lineWidth = .8; g.strokeStyle = `rgba(255,255,255,${(al * .8).toFixed(3)})`; g.stroke(); }
    g.restore();
    return tops;
  }
