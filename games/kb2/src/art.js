  /* ---------- art: world palettes ---------- */
  const PAL = [
    { kind: 'soil', body: ['#7d5434', '#5f3e24'], blot: ['rgba(40,20,6,.20)', 'rgba(255,215,160,.10)'], peb: ['#a8957e', '#7b6a58', '#5a4b3d'],
      cap: ['#a6ec62', '#69bd38', '#3f8a24'], capKind: 'grass', edge: '#2a180b', stone: ['#a3aba3', '#7b847c', '#535b55'], acc: '#86c04e',
      back: ['#4b3524', '#3b2919'], plank: ['#e0ad6a', '#a06c34', '#6a431c'], ladder: ['#dcae6c', '#8a5a2a'], liq: ['#7fd0f5', '#2a74c0', '#e8faff'], spike: ['#d6dde2', '#7a858e'], crack: ['#c2b49b', '#857760'] },
    { kind: 'rock', body: ['#4c4469', '#352e4f'], blot: ['rgba(10,5,30,.25)', 'rgba(200,180,255,.10)'], peb: ['#7a70a0', '#56507a', '#2e2848'],
      cap: ['#7ff0dc', '#36b2a6', '#1d7272'], capKind: 'moss', edge: '#120e22', stone: ['#7a72a2', '#57507d', '#36305a'], acc: '#8ff6ff',
      back: ['#272040', '#1c1730'], plank: ['#b98d5a', '#7a5630', '#4e3519'], ladder: ['#c09060', '#7a5230'], liq: ['#5fc6f0', '#1a4f9a', '#cff6ff'], spike: ['#c9f6ff', '#5bb6d6'], crack: ['#9a90c4', '#615792'] },
    { kind: 'mine', body: ['#7c5b40', '#5a3f2a'], blot: ['rgba(30,15,5,.22)', 'rgba(255,200,140,.08)'], peb: ['#a88a6a', '#806446', '#4e3a26'],
      cap: ['#b79770', '#8c6c4a', '#5e452c'], capKind: 'rock', edge: '#21140a', stone: ['#9a7f66', '#76604a', '#4f3e2e'], acc: '#ffcf5a',
      back: ['#3e2c1f', '#2e2016'], plank: ['#d4a060', '#94632e', '#5e3c16'], ladder: ['#d2a265', '#86582a'], liq: ['#ffb43a', '#d0400c', '#fff0a0'], spike: ['#cfc8bf', '#776d62'], crack: ['#b89c7c', '#7a6046'] },
    { kind: 'snow', body: ['#d4e9f7', '#a3c9e4'], blot: ['rgba(60,110,160,.12)', 'rgba(255,255,255,.35)'], peb: ['#9cc4e2', '#7aa8cc', '#5a88b0'],
      cap: ['#ffffff', '#eaf5fc', '#bad7ec'], capKind: 'snow', edge: '#4f7598', stone: ['#c4ebfc', '#86c8ec', '#4f98cc'], acc: '#ffffff',
      back: ['#6c90b2', '#53769a'], plank: ['#d8b07a', '#9a7040', '#6a4a24'], ladder: ['#d8b07a', '#8a6236'], liq: ['#9fdcf6', '#2f78b8', '#ffffff'], spike: ['#e8fbff', '#8fd0f0'], crack: ['#e6f4fc', '#a6cde6'] },
    { kind: 'brick', body: ['#76718a', '#57536a'], blot: ['rgba(15,10,30,.18)', 'rgba(255,255,255,.07)'], peb: ['#9c97b0', '#77728c', '#4c485e'],
      cap: ['#b4afc6', '#8c87a0', '#5c5870'], capKind: 'brick', edge: '#16131f', stone: ['#625d78', '#4a465e', '#312e40'], acc: '#e0b04a',
      back: ['#34304a', '#28243a'], plank: ['#c8945a', '#8a5c2c', '#5a3a16'], ladder: ['#c8945a', '#80542a'], liq: ['#ffa030', '#c8300c', '#ffe890'], spike: ['#d2d6e0', '#727888'], crack: ['#a8a2bc', '#6c6782'] },
  ];
  const SKY = [
    ['#5fb6ee', '#a8dcf6', '#e6f6e4'], ['#15122a', '#1d1838', '#110e20'], ['#2a1a12', '#3b2416', '#1a100a'], ['#6aa6dc', '#b9d6f2', '#f6e8f2'], ['#1a1634', '#2e2450', '#141024'],
  ];
  let vrs = 1; const vr = () => (vrs = (vrs * 16807) % 2147483647) / 2147483647;
  const rnd2 = Math.random;
  const hash = (c, r, k = 0) => { let h = (c * 374761393 + r * 668265263 + k * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const mkCv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  /* ---------- seamless textures (4×4 tiles, wrap-around) ---------- */
  function wrapBlob(x, S, cx, cy, rx, ry, rot) { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.beginPath(); x.ellipse(cx + ox, cy + oy, rx, ry, rot, 0, 7); x.fill(); } }
  function texBody(P, Rt, back) {
    const S = 4, c = mkCv(S * Rt, S * Rt), x = c.getContext('2d'); x.scale(Rt, Rt); vrs = back ? 77 : 31;
    const col = back ? P.back : P.body;
    x.fillStyle = col[0]; x.fillRect(0, 0, S, S);
    // soft large variations
    for (let i = 0; i < 26; i++) { x.fillStyle = i % 2 ? P.blot[0] : P.blot[1]; wrapBlob(x, S, vr() * S, vr() * S, .25 + vr() * .45, .15 + vr() * .3, vr() * 3); }
    x.fillStyle = col[1]; x.globalAlpha = .45; for (let i = 0; i < 18; i++) wrapBlob(x, S, vr() * S, vr() * S, .3 + vr() * .5, .2 + vr() * .3, vr() * 3); x.globalAlpha = 1;
    if (P.kind === 'brick') {
      const bh = .5, bw = 1;
      for (let row = 0; row < S / bh; row++) for (let k = -1; k < S / bw + 1; k++) {
        const bx = k * bw + (row % 2 ? bw / 2 : 0), by = row * bh, v = vr();
        x.fillStyle = `rgba(${v < .5 ? '0,0,0' : '255,255,255'},${.04 + vr() * .07})`; x.fillRect(bx + .03, by + .03, bw - .06, bh - .06);
        x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(bx + .03, by + .03, bw - .06, .035);
        x.fillStyle = 'rgba(0,0,0,.30)'; x.fillRect(bx, by + bh - .03, bw, .03); x.fillRect(bx, by, .03, bh);
      }
    } else if (P.kind === 'mine' && !back) {
      x.strokeStyle = 'rgba(40,20,8,.22)'; x.lineWidth = .05;
      for (let i = 0; i < 6; i++) { const y0 = vr() * S; x.beginPath(); for (let k = 0; k <= 16; k++) { const xx = k / 16 * S, yy = y0 + Math.sin(k * .9 + i) * .08; k ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); }
      for (let i = 0; i < 14; i++) { const px = vr() * S, py = vr() * S; x.fillStyle = vr() < .5 ? '#d8b04a' : '#e8d8a8'; x.globalAlpha = .7; x.beginPath(); x.arc(px, py, .025 + vr() * .03, 0, 7); x.fill(); x.globalAlpha = 1; }
    }
    if (!back) {
      // pebbles / specks with a lit top edge
      for (let i = 0; i < (P.kind === 'snow' ? 10 : 22); i++) {
        const px = .1 + vr() * (S - .2), py = .1 + vr() * (S - .2), r = .04 + vr() * .07, pc = P.peb[Math.floor(vr() * 3)];
        x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(px + .015, py + .02, r * 1.2, r, 0, 0, 7); x.fill();
        x.fillStyle = pc; x.beginPath(); x.ellipse(px, py, r * 1.2, r, 0, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.ellipse(px - r * .3, py - r * .35, r * .5, r * .3, 0, 0, 7); x.fill();
      }
      if (P.kind === 'soil') { x.strokeStyle = 'rgba(60,35,15,.45)'; x.lineWidth = .025; for (let i = 0; i < 5; i++) { let px = vr() * S, py = vr() * S; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (vr() - .5) * .4; py += vr() * .25; x.lineTo(px, py); } x.stroke(); } }
      if (P.kind === 'rock') for (let i = 0; i < 9; i++) { const px = vr() * S, py = vr() * S, s = .05 + vr() * .06; x.fillStyle = vr() < .5 ? 'rgba(140,240,255,.55)' : 'rgba(210,160,255,.5)'; x.beginPath(); x.moveTo(px, py - s * 2); x.lineTo(px + s, py); x.lineTo(px, py + s * 1.4); x.lineTo(px - s, py); x.fill(); }
      if (P.kind === 'snow') for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,255,.8)'; const px = vr() * S, py = vr() * S; x.fillRect(px, py, .02, .02); }
    } else {
      // background wall: slightly bluish dark, sparse details
      for (let i = 0; i < 8; i++) { const px = vr() * S, py = vr() * S, r = .06 + vr() * .1; x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(px, py, r * 1.3, r, 0, 0, 7); x.fill(); }
    }
    return c;
  }
  function blockSprite(P, Rt, kind, v) {
    const c = mkCv(Rt, Rt), x = c.getContext('2d'); x.scale(Rt, Rt); vrs = 100 + v * 13 + kind.length;
    const rr = (a, b, w, h, r) => { x.beginPath(); x.roundRect ? x.roundRect(a, b, w, h, r) : x.rect(a, b, w, h); };
    if (kind === 'stone') {
      const sc = P.stone, split = P.kind === 'brick' ? 2 : 1;
      x.fillStyle = sc[2]; x.fillRect(0, 0, 1, 1);
      const cells = split === 2 ? [[0, 0, 1, .5], [0, .5, .5, .5], [.5, .5, .5, .5]] : P.kind === 'snow' ? [[0, 0, 1, 1]] : [[0, 0, .55, .45], [.55, 0, .45, .45], [0, .45, 1, .55]];
      if (v % 2 && split === 2) cells.splice(0, 3, [0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, 1, .5]);
      for (const [a, b, w, h] of cells) {
        const q = x.createLinearGradient(a, b, a + w * .4, b + h); q.addColorStop(0, sc[0]); q.addColorStop(1, sc[1]); x.fillStyle = q; rr(a + .035, b + .035, w - .07, h - .07, .06); x.fill();
        x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(a + .07, b + .05, w - .14, .035);
        x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(a + .07, b + h - .08, w - .14, .03);
      }
      if (P.kind === 'snow') { x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(.15, .15); x.lineTo(.4, .12); x.lineTo(.2, .35); x.fill(); x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = .025; x.beginPath(); x.moveTo(.6, .3); x.lineTo(.8, .7); x.stroke(); }
      if (P.kind === 'rock') { x.fillStyle = 'rgba(140,240,255,.6)'; x.beginPath(); x.moveTo(.7, .62); x.lineTo(.76, .75); x.lineTo(.7, .86); x.lineTo(.64, .75); x.fill(); }
      x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = .02; x.beginPath(); x.moveTo(.2 + v * .1, .55); x.lineTo(.35 + v * .05, .7); x.stroke();
    } else if (kind === 'crack') {
      const q = x.createRadialGradient(.35, .3, .05, .5, .5, .75); q.addColorStop(0, P.crack[0]); q.addColorStop(1, P.crack[1]); x.fillStyle = q; rr(.03, .03, .94, .94, .14); x.fill();
      x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.ellipse(.32, .22, .16, .06, -.3, 0, 7); x.fill();
      x.strokeStyle = 'rgba(30,20,10,.75)'; x.lineWidth = .05; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(.5 + v * .05, .04); x.lineTo(.42, .3); x.lineTo(.58, .48); x.lineTo(.4, .72); x.lineTo(.48, .97); x.moveTo(.58, .48); x.lineTo(.88, .56); x.moveTo(.42, .3); x.lineTo(.14, .24); x.moveTo(.4, .72); x.lineTo(.2, .82); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = .02; x.beginPath(); x.moveTo(.45, .32); x.lineTo(.6, .5); x.stroke();
    } else if (kind === 'boulder') {
      x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(.5, .93, .46, .07, 0, 0, 7); x.fill();
      const q = x.createRadialGradient(.36, .3, .04, .5, .55, .62); q.addColorStop(0, '#c4c0b6'); q.addColorStop(.6, '#8a867c'); q.addColorStop(1, '#55524c'); x.fillStyle = q;
      x.beginPath(); x.moveTo(.08, .62); x.quadraticCurveTo(.02, .2, .38, .06); x.quadraticCurveTo(.78, -.02, .94, .38); x.quadraticCurveTo(1.02, .8, .7, .96); x.lineTo(.26, .97); x.quadraticCurveTo(.06, .9, .08, .62); x.fill();
      x.strokeStyle = 'rgba(40,36,30,.55)'; x.lineWidth = .03; x.stroke();
      x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(.36, .22, .14, .06, -.4, 0, 7); x.fill();
      x.strokeStyle = 'rgba(40,36,30,.4)'; x.lineWidth = .025; x.beginPath(); x.moveTo(.55, .55); x.lineTo(.7, .7); x.moveTo(.3, .6); x.lineTo(.4, .75); x.stroke();
      if (P.kind === 'soil') { x.fillStyle = '#6fae42'; x.beginPath(); x.ellipse(.5, .1, .25, .07, 0, 0, 7); x.fill(); }
      if (P.kind === 'snow') { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(.52, .1, .3, .08, 0, 0, 7); x.fill(); }
    } else if (kind === 'hard') {
      const q = x.createLinearGradient(0, 0, 1, 1); q.addColorStop(0, '#9196a4'); q.addColorStop(1, '#585c69'); x.fillStyle = q; rr(.02, .02, .96, .96, .08); x.fill();
      x.fillStyle = '#3d404b'; x.fillRect(.02, .2, .96, .12); x.fillRect(.02, .68, .96, .12);
      x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(.02, .2, .96, .025); x.fillRect(.02, .68, .96, .025);
      x.fillStyle = '#c9ccd6'; for (const [a, b] of [[.12, .26], [.5, .26], [.88, .26], [.12, .74], [.5, .74], [.88, .74]]) { x.beginPath(); x.arc(a, b, .035, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(.02, .9, .96, .08);
    } else if (kind === 'ice') {
      const q = x.createLinearGradient(0, 0, 1, 1); q.addColorStop(0, '#e8fbff'); q.addColorStop(.5, '#a6e0fa'); q.addColorStop(1, '#5fb0e0'); x.fillStyle = q; x.fillRect(0, 0, 1, 1);
      x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.moveTo(.1, .12); x.lineTo(.45, .08); x.lineTo(.16, .4); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = .02; x.beginPath(); x.moveTo(.55, .4); x.lineTo(.85, .85); x.moveTo(.7, .62); x.lineTo(.9, .55); x.stroke();
      x.fillStyle = 'rgba(30,80,140,.25)'; x.fillRect(0, .94, 1, .06);
    } else if (kind === 'mach') {
      const q = x.createLinearGradient(0, 0, 0, 1); q.addColorStop(0, '#8d929e'); q.addColorStop(1, '#4b4f5a'); x.fillStyle = q; rr(.02, .02, .96, .96, .1); x.fill();
      x.strokeStyle = '#2c2f37'; x.lineWidth = .04; rr(.08, .08, .84, .84, .08); x.stroke();
      x.fillStyle = '#cfd3db'; for (const [a, b] of [[.15, .15], [.85, .15], [.15, .85], [.85, .85]]) { x.beginPath(); x.arc(a, b, .035, 0, 7); x.fill(); }
    } else if (kind === 'conv') {
      x.fillStyle = '#2d2f36'; rr(0, .08, 1, .84, .1); x.fill();
      const q = x.createLinearGradient(0, .2, 0, .8); q.addColorStop(0, '#6c7180'); q.addColorStop(1, '#3a3d47'); x.fillStyle = q; x.fillRect(0, .22, 1, .56);
      for (const px of [.25, .75]) { x.fillStyle = '#9aa0ad'; x.beginPath(); x.arc(px, .5, .17, 0, 7); x.fill(); x.fillStyle = '#4a4e58'; x.beginPath(); x.arc(px, .5, .06, 0, 7); x.fill(); }
    } else if (kind === 'crate') {
      x.fillStyle = '#5e3a1b'; rr(0, 0, 1, 1, .06); x.fill();
      const q = x.createLinearGradient(0, 0, 1, 1); q.addColorStop(0, '#e2ad66'); q.addColorStop(1, '#a06a32'); x.fillStyle = q; x.fillRect(.08, .08, .84, .84);
      x.strokeStyle = 'rgba(90,50,18,.5)'; x.lineWidth = .02; for (const py of [.3, .5, .7]) { x.beginPath(); x.moveTo(.08, py); x.lineTo(.92, py); x.stroke(); }
      x.strokeStyle = '#7a4a20'; x.lineWidth = .11; x.beginPath(); x.moveTo(.14, .14); x.lineTo(.86, .86); x.stroke();
      x.strokeStyle = '#c48a48'; x.lineWidth = .03; x.beginPath(); x.moveTo(.13, .1); x.lineTo(.9, .86); x.stroke();
      x.fillStyle = '#3e3e46'; for (const [a, b] of [[.1, .1], [.9, .1], [.1, .9], [.9, .9]]) { x.beginPath(); x.arc(a, b, .045, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(.08, .08, .84, .04);
    }
    return c;
  }
  function capSprite(P, Rt, v, lEnd, rEnd) {
    // a strip from y=-0.3 to y=+0.36 of the cell
    const c = mkCv(Rt, Rt * .66), x = c.getContext('2d'); x.scale(Rt, Rt); x.translate(0, .3); vrs = 300 + v * 7 + lEnd * 3 + rEnd;
    const [c0, c1, c2] = P.cap, k = P.capKind;
    const l = lEnd ? .02 : 0, r = rEnd ? .98 : 1;
    x.beginPath();
    if (k === 'grass' || k === 'moss') {
      const base = k === 'grass' ? .24 : .2;
      x.moveTo(l, base);
      for (let i = 0; i <= 10; i++) { const px = l + (r - l) * i / 10; x.lineTo(px, base + (i % 2 ? .05 : -.01) + vr() * .04); }
      x.lineTo(r, -.02); x.lineTo(l, -.02); x.closePath();
      const q = x.createLinearGradient(0, -.05, 0, base + .06); q.addColorStop(0, c0); q.addColorStop(.55, c1); q.addColorStop(1, c2); x.fillStyle = q; x.fill();
      x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(l, -.02, r - l, .03);
      if (k === 'grass') {
        x.strokeStyle = c1; x.lineWidth = .028; x.lineCap = 'round';
        for (let i = 0; i < 9; i++) { const gx = l + .04 + vr() * (r - l - .08), hgt = .06 + vr() * .12, lean = (vr() - .5) * .08; x.strokeStyle = vr() < .5 ? c0 : c1; x.beginPath(); x.moveTo(gx, .02); x.quadraticCurveTo(gx + lean * .3, -hgt * .5, gx + lean, -hgt); x.stroke(); }
      } else {
        for (let i = 0; i < 6; i++) { x.fillStyle = vr() < .5 ? 'rgba(200,255,240,.85)' : c0; x.beginPath(); x.arc(l + .05 + vr() * (r - l - .1), .01 - vr() * .04, .02 + vr() * .02, 0, 7); x.fill(); }
      }
      if (lEnd) { x.fillStyle = c2; x.beginPath(); x.ellipse(l + .02, base * .55, .05, base * .5, 0, 0, 7); x.fill(); }
      if (rEnd) { x.fillStyle = c2; x.beginPath(); x.ellipse(r - .02, base * .55, .05, base * .5, 0, 0, 7); x.fill(); }
    } else if (k === 'snow') {
      x.moveTo(l, .2);
      for (let i = 0; i <= 8; i++) { const px = l + (r - l) * i / 8; x.lineTo(px, .17 + Math.sin(i * 1.7 + v) * .04 + (i === 3 && v === 1 ? .1 : 0)); }
      x.lineTo(r, -.04); x.quadraticCurveTo(.5, -.13, l, -.04); x.closePath();
      const q = x.createLinearGradient(0, -.1, 0, .25); q.addColorStop(0, c0); q.addColorStop(1, c2); x.fillStyle = q; x.fill();
      x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(.5, -.05, .4, .04, 0, 0, 7); x.fill();
      if (lEnd) { x.fillStyle = c1; x.beginPath(); x.ellipse(l + .01, .1, .06, .12, 0, 0, 7); x.fill(); }
      if (rEnd) { x.fillStyle = c1; x.beginPath(); x.ellipse(r - .01, .1, .06, .12, 0, 0, 7); x.fill(); }
      for (let i = 0; i < 4; i++) { x.fillStyle = '#fff'; x.fillRect(l + vr() * (r - l), -.06 + vr() * .1, .02, .02); }
    } else if (k === 'rock') {
      x.moveTo(l, .14); for (let i = 0; i <= 6; i++) x.lineTo(l + (r - l) * i / 6, .12 + vr() * .05); x.lineTo(r, 0); x.lineTo(l, 0); x.closePath();
      const q = x.createLinearGradient(0, 0, 0, .18); q.addColorStop(0, c0); q.addColorStop(1, c2); x.fillStyle = q; x.fill();
      x.fillStyle = 'rgba(255,240,200,.25)'; x.fillRect(l, 0, r - l, .03);
      for (let i = 0; i < 3; i++) { const px = l + .1 + vr() * (r - l - .2); x.fillStyle = P.peb[Math.floor(vr() * 2)]; x.beginPath(); x.ellipse(px, -.01, .05 + vr() * .04, .035, 0, Math.PI, 0); x.fill(); }
    } else {
      x.rect(l, 0, r - l, .16); const q = x.createLinearGradient(0, 0, 0, .16); q.addColorStop(0, c0); q.addColorStop(1, c1); x.fillStyle = q; x.fill();
      x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(l, 0, r - l, .025);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l, .145, r - l, .03); for (const px of [.0, .5]) x.fillRect(px + (v % 2) * .25, 0, .025, .16);
    }
    return c;
  }

  /* ---------- per-level art cache ---------- */
  let ART = null, decor = [], lights = [];
  function buildArt(Rt) {
    const P = PAL[world], key = world + ':' + Rt;
    if (ART && ART.key === key) return ART;
    const A = { key, Rt, P };
    A.body = texBody(P, Rt, false); A.back = texBody(P, Rt, true);
    A.stone = [0, 1, 2].map(v => blockSprite(P, Rt, 'stone', v));
    A.crack = [0, 1].map(v => blockSprite(P, Rt, 'crack', v));
    A.hard = blockSprite(P, Rt, 'hard', 0); A.boulder = blockSprite(P, Rt, 'boulder', 0); A.ice = blockSprite(P, Rt, 'ice', 0); A.mach = blockSprite(P, Rt, 'mach', 0); A.conv = blockSprite(P, Rt, 'conv', 0); A.crate = blockSprite(P, Rt, 'crate', 0);
    A.cap = []; for (let v = 0; v < 3; v++) A.cap.push([0, 1, 2, 3].map(m => capSprite(P, Rt, v, m & 1, m >> 1 & 1)));
    ART = A; chunks.clear(); return A;
  }
  // static decoration for the level (deterministic): floor, ceiling and wall pieces + light sources
  function buildDecor() {
    decor = []; lights = [];
    const free = (c, r) => inb(c, r) && (L.m[r][c] || '.') === '.' && tile[r * Wd + c] === EM;
    const P = PAL[world];
    let lastWall = -9;
    for (let r = 0; r < Ht; r++) for (let c = 0; c < Wd; c++) {
      const t = tile[r * Wd + c], h = hash(c, r, lv);
      if (SOLID[t] && t !== MC && t !== CVL && t !== CVR && free(c, r - 1)) {
        if (h < [.42, .3, .2, .28, .1][world]) decor.push({ k: 'floor', c, r: r - 1, v: Math.floor(hash(c, r, 9) * 8) });
      }
      if (SOLID[t] && t !== MC && free(c, r + 1) && h > [.82, .6, .78, .55, .82][world]) decor.push({ k: 'ceil', c, r: r + 1, v: Math.floor(hash(c, r, 5) * 6) });
      if (free(c, r) && bdrop[r * Wd + c] && free(c, r + 1) && inb(c, r + 2) && SOLID[tile[(r + 2) * Wd + c]] && c - lastWall > 4 && h < (world === 4 ? .32 : world === 2 ? .22 : world === 1 ? .1 : .05)) {
        decor.push({ k: 'wall', c, r, v: Math.floor(hash(c, r, 3) * 4) }); lastWall = c;
        if (world === 4 || world === 2) lights.push({ x: c + .5, y: r + .35, r: 3.2, col: '255,180,90', fl: 1 });
        if (world === 1) lights.push({ x: c + .5, y: r + .6, r: 2.4, col: '120,220,255', fl: 0 });
      }
    }
    for (const d of decor) {
      if (world === 1 && d.k !== 'wall' && d.v < 3) lights.push({ x: d.c + .5, y: d.r + (d.k === 'floor' ? .75 : .25), r: 1.8, col: d.v % 2 ? '200,140,255' : '110,240,255', fl: 0 });
      if (world === 2 && d.k === 'floor' && d.v === 7) lights.push({ x: d.c + .5, y: d.r + .55, r: 2.6, col: '255,190,90', fl: 1 });
    }
    for (let r = 0; r < Ht; r++) for (let c = 0; c < Wd; c++) if (tile[r * Wd + c] === LQ && (world === 2 || world === 4) && tAt(c, r - 1) !== LQ && hash(c, r, 1) < .5) lights.push({ x: c + .5, y: r + .2, r: 2.2, col: '255,140,50', fl: 1 });
  }

  /* ---------- chunked static terrain ---------- */
  const CHK = 8, chunks = new Map();
  const terr = (c, r) => (c < 0 || c >= Wd || r >= Ht) ? true : r < 0 ? true : SOLID[tile[r * Wd + c]] === 1 && tile[r * Wd + c] !== MC && tile[r * Wd + c] !== BO && tile[r * Wd + c] !== CK;
  function invalidate(c, r) { for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) chunks.delete(Math.floor((c + dc) / CHK) + ',' + Math.floor((r + dr) / CHK)); }
  function getChunk(cx, cy) {
    const k = cx + ',' + cy; let ch = chunks.get(k);
    if (ch) { chunks.delete(k); chunks.set(k, ch); return ch; }
    ch = renderChunk(cx, cy); chunks.set(k, ch);
    while (chunks.size > 96) chunks.delete(chunks.keys().next().value);
    return ch;
  }
  // render every chunk of the level up front (and make the canvas rasterize it now), so scrolling never hitches
  function prerenderChunks() {
    if (!ART || !Wd) return;
    const sink = mkCv(1, 1).getContext('2d');
    for (let cy = 0; cy * CHK < Ht; cy++) for (let cx = 0; cx * CHK < Wd; cx++) { const k = cx + ',' + cy; if (!chunks.has(k)) chunks.set(k, renderChunk(cx, cy)); const c = chunks.get(k); if (c) sink.drawImage(c, 0, 0, 1, 1); }
    sink.getImageData(0, 0, 1, 1);
  }
  function renderChunk(cx, cy) {
    const A = ART, Rt = A.Rt, P = A.P, cv2 = mkCv(CHK * Rt, CHK * Rt), x = cv2.getContext('2d');
    x.scale(Rt, Rt); x.lineJoin = x.lineCap = 'round';
    const c0 = cx * CHK, r0 = cy * CHK;
    let any = false;
    const sub = (img, c, r) => x.drawImage(img, ((c % 4) + 4) % 4 * Rt, ((r % 4) + 4) % 4 * Rt, Rt, Rt, c - c0, r - r0, 1.002, 1.002);
    // 1) background walls with soft occlusion near terrain
    for (let r = r0; r < r0 + CHK; r++) for (let c = c0; c < c0 + CHK; c++) {
      if (!inb(c, r) || !bdrop[r * Wd + c] || terr(c, r)) continue;
      any = true; sub(A.back, c, r);
      const X = c - c0, Y = r - r0;
      const sh = (x0, y0, x1, y1, a) => { const q = x.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, `rgba(0,0,0,${a})`); q.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = q; x.fillRect(X, Y, 1, 1); };
      if (terr(c, r - 1)) sh(X, Y, X, Y + .6, .45); if (terr(c - 1, r)) sh(X, Y, X + .45, Y, .35); if (terr(c + 1, r)) sh(X + 1, Y, X + .55, Y, .35); if (terr(c, r + 1)) sh(X, Y + 1, X, Y + .7, .2);
    }
    // 2) wall decor (behind everything else)
    for (const d of decor) if (d.k === 'wall' && d.c >= c0 && d.c < c0 + CHK && d.r >= r0 && d.r < r0 + CHK) { drawWallDecor(x, d, d.c - c0, d.r - r0); any = true; }
    // 3) terrain
    for (let r = r0; r < r0 + CHK; r++) for (let c = c0; c < c0 + CHK; c++) {
      if (!inb(c, r)) continue;
      const t = tile[r * Wd + c]; if (t === EM || t === EX || t === LQ || t === FK) continue;
      any = true; const X = c - c0, Y = r - r0, h = hash(c, r, 2);
      if (t === GR) {
        const U = !terr(c, r - 1), D = !terr(c, r + 1), Lf = !terr(c - 1, r), Rg = !terr(c + 1, r), rad = .22;
        const tl = U && Lf ? rad : 0, tr = U && Rg ? rad : 0, br = D && Rg ? rad : 0, bl = D && Lf ? rad : 0;
        x.save(); x.beginPath(); if (x.roundRect && (tl || tr || br || bl)) x.roundRect(X, Y, 1.002, 1.002, [tl, tr, br, bl]); else x.rect(X, Y, 1.002, 1.002); x.clip();
        sub(A.body, c, r);
        const g2 = (x0, y0, x1, y1, a, col = '0,0,0') => { const q = x.createLinearGradient(X + x0, Y + y0, X + x1, Y + y1); q.addColorStop(0, `rgba(${col},${a})`); q.addColorStop(1, `rgba(${col},0)`); x.fillStyle = q; x.fillRect(X, Y, 1, 1); };
        let dep = 0; while (dep < 6 && terr(c, r - dep - 1) && r - dep - 1 >= 0) dep++;
        if (dep > 1) { x.fillStyle = `rgba(0,0,0,${Math.min(.3, (dep - 1) * .06)})`; x.fillRect(X, Y, 1.01, 1.01); }
        if (Lf) g2(0, 0, .3, 0, .35); if (Rg) g2(1, 0, .7, 0, .35); if (D) g2(0, 1, 0, .6, .5); if (U) g2(0, 0, 0, .5, .18, '255,240,210');
        x.strokeStyle = P.edge; x.lineWidth = .1; x.beginPath();
        if (Lf) { x.moveTo(X, Y + tl); x.lineTo(X, Y + 1 - bl); } if (Rg) { x.moveTo(X + 1, Y + tr); x.lineTo(X + 1, Y + 1 - br); }
        if (D) { x.moveTo(X + bl, Y + 1); x.lineTo(X + 1 - br, Y + 1); } if (U) { x.moveTo(X + tl, Y); x.lineTo(X + 1 - tr, Y); }
        x.stroke(); if (tl || tr || br || bl) { x.lineWidth = .1; x.beginPath(); if (tl) x.arc(X + tl, Y + tl, tl, Math.PI, Math.PI * 1.5); x.stroke(); x.beginPath(); if (tr) x.arc(X + 1 - tr, Y + tr, tr, -Math.PI / 2, 0); x.stroke(); x.beginPath(); if (br) x.arc(X + 1 - br, Y + 1 - br, br, 0, Math.PI / 2); x.stroke(); x.beginPath(); if (bl) x.arc(X + bl, Y + 1 - bl, bl, Math.PI / 2, Math.PI); x.stroke(); }
        x.restore();
        if (U) x.drawImage(A.cap[Math.floor(h * 3)][(Lf ? 1 : 0) | (Rg ? 2 : 0)], X, Y - .3, 1.002, .66);
        if (D && P.kind === 'soil' && h < .3) { x.strokeStyle = '#4a2e16'; x.lineWidth = .035; x.beginPath(); x.moveTo(X + .3 + h, Y + 1); x.quadraticCurveTo(X + .2 + h, Y + 1.2, X + .35 + h, Y + 1.32); x.stroke(); }
      } else if (t === ST) {
        x.drawImage(A.stone[Math.floor(h * 3)], X, Y, 1.002, 1.002);
        if (!terr(c, r - 1)) { if (P.kind === 'soil') { x.fillStyle = P.acc; x.beginPath(); x.moveTo(X, Y + .1); for (let i = 0; i <= 6; i++) x.lineTo(X + i / 6, Y + .06 + (i % 2) * .06); x.lineTo(X + 1, Y - .03); x.lineTo(X, Y - .03); x.fill(); } else if (P.kind === 'snow') x.drawImage(A.cap[Math.floor(h * 3)][(terr(c - 1, r) ? 0 : 1) | (terr(c + 1, r) ? 0 : 2)], X, Y - .3, 1.002, .66); }
      } else if (t === CK) x.drawImage(A.crack[Math.floor(h * 2)], X, Y, 1, 1);
      else if (t === HD) x.drawImage(A.hard, X, Y, 1, 1);
      else if (t === BO) x.drawImage(A.boulder, X, Y, 1, 1);
      else if (t === IC) { x.drawImage(A.ice, X, Y, 1.002, 1.002); if (!terr(c, r - 1)) { x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(X, Y, 1.002, .06); } }
      else if (t === MC) x.drawImage(A.mach, X, Y, 1, 1);
      else if (t === CVL || t === CVR) x.drawImage(A.conv, X, Y, 1.002, 1);
      else if (t === PL) drawPlank(x, X, Y, P, c, r);
      else if (t === LA) drawLadder(x, X, Y, P, 1);
      else if (t === SK) drawSpikes(x, X, Y, P, h);
    }
    // 4) floor / ceiling decor
    for (const d of decor) if (d.k !== 'wall' && d.c >= c0 && d.c < c0 + CHK && d.r >= r0 && d.r < r0 + CHK) { drawDecor(x, d, d.c - c0, d.r - r0); any = true; }
    return any ? cv2 : null;
  }
  function drawPlank(x, X, Y, P, c, r) {
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X + .02, Y + .24, .96, .06);
    const q = x.createLinearGradient(0, Y, 0, Y + .24); q.addColorStop(0, P.plank[0]); q.addColorStop(1, P.plank[1]); x.fillStyle = q; x.fillRect(X, Y, 1.002, .24);
    x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(X, Y, 1, .03);
    x.strokeStyle = 'rgba(70,40,15,.55)'; x.lineWidth = .02; x.beginPath(); x.moveTo(X + .5, Y); x.lineTo(X + .5, Y + .24); x.stroke();
    x.fillStyle = P.plank[2]; [.12, .38, .62, .88].forEach(px => { x.beginPath(); x.arc(X + px, Y + .12, .025, 0, 7); x.fill(); });
    if (tAt(c - 1, r) !== PL) { x.strokeStyle = P.plank[2]; x.lineWidth = .06; x.beginPath(); x.moveTo(X + .12, Y + .24); x.lineTo(X + .3, Y + .52); x.stroke(); }
    if (tAt(c + 1, r) !== PL) { x.strokeStyle = P.plank[2]; x.lineWidth = .06; x.beginPath(); x.moveTo(X + .88, Y + .24); x.lineTo(X + .7, Y + .52); x.stroke(); }
  }
  function drawLadder(x, X, Y, P, a) {
    x.globalAlpha = a;
    x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(X + .21, Y, .08, 1); x.fillRect(X + .77, Y, .08, 1);
    for (const rx of [.15, .71]) { const q = x.createLinearGradient(X + rx, 0, X + rx + .12, 0); q.addColorStop(0, P.ladder[0]); q.addColorStop(1, P.ladder[1]); x.fillStyle = q; x.fillRect(X + rx, Y, .12, 1.002); }
    for (const ry of [.16, .5, .84]) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(X + .2, Y + ry + .04, .6, .06); x.fillStyle = P.ladder[0]; x.fillRect(X + .2, Y + ry, .6, .07); }
    x.globalAlpha = 1;
  }
  function drawSpikes(x, X, Y, P, h) {
    x.fillStyle = '#3f3a44'; x.fillRect(X, Y + .86, 1, .14);
    for (let i = 0; i < 4; i++) { const bx = X + i * .25, q = x.createLinearGradient(bx, 0, bx + .25, 0); q.addColorStop(0, P.spike[0]); q.addColorStop(1, P.spike[1]); x.fillStyle = q; x.beginPath(); x.moveTo(bx + .02, Y + .88); x.lineTo(bx + .125, Y + .38 + (i % 2) * .08); x.lineTo(bx + .23, Y + .88); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.moveTo(bx + .1, Y + .6); x.lineTo(bx + .125, Y + .42 + (i % 2) * .08); x.lineTo(bx + .13, Y + .6); x.fill(); }
  }
  // floor (k=floor: object stands on the bottom of cell X,Y) and ceiling (hangs from top of cell) pieces per world
  function drawDecor(x, d, X, Y) {
    const v = d.v, w = world;
    if (d.k === 'floor') {
      const by = Y + 1;
      if (w === 0) {
        if (v < 3) { // grass tuft
          x.strokeStyle = v ? '#5fb236' : '#7fd04a'; x.lineWidth = .035; for (let i = 0; i < 6; i++) { const gx = X + .3 + i * .08, hg = .16 + ((i * 7 + v) % 5) * .04; x.beginPath(); x.moveTo(gx, by); x.quadraticCurveTo(gx + (i - 2.5) * .02, by - hg * .6, gx + (i - 2.5) * .05, by - hg); x.stroke(); }
        } else if (v < 5) { // flowers
          for (let i = 0; i < 2; i++) { const fx = X + .35 + i * .3, fy = by - .22 - i * .06; x.strokeStyle = '#4f9a2c'; x.lineWidth = .03; x.beginPath(); x.moveTo(fx, by); x.lineTo(fx, fy); x.stroke(); x.fillStyle = v === 3 ? '#ffe14a' : '#ff8ac8'; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(fx + Math.cos(k * 1.26) * .05, fy + Math.sin(k * 1.26) * .05, .04, 0, 7); x.fill(); } x.fillStyle = '#fff6c0'; x.beginPath(); x.arc(fx, fy, .03, 0, 7); x.fill(); }
        } else if (v < 6) { // mushroom pair
          mush(x, X + .35, by, .18, '#e8463a'); mush(x, X + .62, by, .12, '#f0a03a');
        } else if (v < 7) { // fern
          x.strokeStyle = '#3f8a26'; x.lineWidth = .03; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(X + .5, by); x.quadraticCurveTo(X + .5 + s * .1, by - .3, X + .5 + s * .35, by - .32); x.stroke(); for (let k = 1; k < 5; k++) { const px = X + .5 + s * k * .07, py = by - .08 - k * .055; x.beginPath(); x.moveTo(px, py); x.lineTo(px + s * .06, py - .08); x.stroke(); } }
        } else { x.fillStyle = '#8a8f8a'; x.beginPath(); x.ellipse(X + .5, by - .07, .2, .1, 0, Math.PI, 0); x.fill(); x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(X + .45, by - .12, .08, .03, 0, 0, 7); x.fill(); }
      } else if (w === 1) {
        if (v < 3) crystal(x, X + .5, by, .32 + v * .06, v % 2 ? ['#d8b0ff', '#8a50e0'] : ['#c8fbff', '#40b8e0']);
        else if (v < 5) { mush(x, X + .4, by, .16, '#40d8c8', true); mush(x, X + .66, by, .1, '#6af0ff', true); }
        else { x.fillStyle = '#5d557f'; x.beginPath(); x.ellipse(X + .5, by - .06, .22, .1, 0, Math.PI, 0); x.fill(); }
      } else if (w === 2) {
        if (v < 2) { x.fillStyle = '#6a5038'; x.beginPath(); x.moveTo(X + .2, by); x.lineTo(X + .35, by - .16); x.lineTo(X + .55, by - .12); x.lineTo(X + .7, by); x.fill(); x.fillStyle = '#e8c04a'; x.beginPath(); x.arc(X + .45, by - .1, .04, 0, 7); x.fill(); }
        else if (v < 4) { x.strokeStyle = '#7a5530'; x.lineWidth = .05; x.beginPath(); x.moveTo(X + .2, by - .02); x.lineTo(X + .8, by - .02); x.stroke(); x.strokeStyle = '#8f949e'; x.lineWidth = .03; x.beginPath(); x.moveTo(X, by - .08); x.lineTo(X + 1, by - .08); x.stroke(); }
        else if (v === 7) { lantern(x, X + .5, by - .02); }
        else { x.fillStyle = '#9a7f66'; x.beginPath(); x.ellipse(X + .5, by - .05, .16, .08, 0, Math.PI, 0); x.fill(); }
      } else if (w === 3) {
        if (v < 3) { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(X + .5, by, .4, .14, 0, Math.PI, 0); x.fill(); x.fillStyle = 'rgba(160,200,230,.5)'; x.beginPath(); x.ellipse(X + .55, by, .25, .05, 0, Math.PI, 0); x.fill(); }
        else if (v < 5) crystal(x, X + .5, by, .28, ['#ffffff', '#8fd0f0']);
        else { x.strokeStyle = '#6a5a4a'; x.lineWidth = .04; x.beginPath(); x.moveTo(X + .5, by); x.lineTo(X + .5, by - .3); x.moveTo(X + .5, by - .18); x.lineTo(X + .65, by - .28); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(X + .5, by - .32, .04, 0, 7); x.fill(); }
      } else {
        if (v < 3) { x.fillStyle = '#5c5870'; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(X + .3 + i * .2, by - .04, .08, .05, 0, 0, 7); x.fill(); } }
        else { x.fillStyle = '#4a3a2a'; x.fillRect(X + .3, by - .28, .4, .28); x.fillStyle = '#6a5038'; x.fillRect(X + .28, by - .3, .44, .06); }
      }
    } else {
      const ty = Y;
      if (w === 0) { x.strokeStyle = '#4f3216'; x.lineWidth = .035; x.beginPath(); x.moveTo(X + .3 + v * .05, ty); x.bezierCurveTo(X + .2, ty + .25, X + .5, ty + .3, X + .4, ty + .5); x.stroke(); x.strokeStyle = '#5fae3a'; x.lineWidth = .03; x.beginPath(); x.moveTo(X + .7, ty); x.quadraticCurveTo(X + .76, ty + .3, X + .66, ty + .55 + v * .04); x.stroke(); }
      else if (w === 1) { if (v < 3) { x.save(); x.translate(X + .5, ty); x.scale(1, -1); crystal(x, 0, 0, .3 + v * .05, ['#c8fbff', '#40b8e0']); x.restore(); } else stal(x, X + .5, ty, .4 + v * .05, '#3c3460'); }
      else if (w === 2) { x.fillStyle = '#6a4a2a'; x.fillRect(X, ty, 1.002, .12); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X, ty + .12, 1, .04); if (v < 2) { x.strokeStyle = '#8a8f99'; x.lineWidth = .03; x.beginPath(); x.moveTo(X + .5, ty + .12); x.lineTo(X + .5, ty + .5); x.stroke(); } }
      else if (w === 3) { for (let i = 0; i < 3; i++) icicle(x, X + .2 + i * .3, ty, .2 + ((v + i * 3) % 5) * .08); }
      else { if (v < 2) { x.strokeStyle = '#4a4656'; x.lineWidth = .05; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(X + .5, ty + .1 + i * .14, .04, .07, 0, 0, 7); x.stroke(); } } else if (v < 4) { x.strokeStyle = 'rgba(220,220,235,.35)'; x.lineWidth = .015; x.beginPath(); x.moveTo(X, ty); x.quadraticCurveTo(X + .3, ty + .3, X + .6, ty); x.moveTo(X + .05, ty + .15); x.lineTo(X + .45, ty + .05); x.stroke(); } }
    }
  }
  function drawWallDecor(x, d, X, Y) {
    const w = world;
    if (w === 4 || w === 2) { // torch / lantern bracket (flame is animated separately)
      if (w === 4) { x.fillStyle = '#3a3240'; x.fillRect(X + .44, Y + .45, .12, .45); x.fillStyle = '#5a4a3a'; x.beginPath(); x.moveTo(X + .34, Y + .38); x.lineTo(X + .66, Y + .38); x.lineTo(X + .58, Y + .55); x.lineTo(X + .42, Y + .55); x.fill(); }
      else lantern(x, X + .5, Y + .9, true);
      if (w === 4 && d.v === 0) { x.fillStyle = '#8a1e2e'; x.beginPath(); x.moveTo(X - .6, Y - 1.5); x.lineTo(X + .2, Y - 1.5); x.lineTo(X + .2, Y - .3); x.lineTo(X - .2, Y - .55); x.lineTo(X - .6, Y - .3); x.fill(); x.fillStyle = '#e0b04a'; x.beginPath(); x.arc(X - .2, Y - 1.05, .14, 0, 7); x.fill(); x.fillStyle = '#5a3a1a'; x.fillRect(X - .7, Y - 1.56, 1, .08); }
    } else if (w === 1) crystal(x, X + .5, Y + 1, .5, ['#c8fbff', '#40b8e0']);
    else if (w === 3) { x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(X + .5, Y + .5, .4, .25, .4, 0, 7); x.fill(); }
    else { x.fillStyle = '#3a6a2a'; x.beginPath(); x.arc(X + .5, Y + .6, .25, 0, 7); x.fill(); }
  }
  function mush(x, px, by, s, col, glow) {
    x.fillStyle = '#f4e8d0'; x.fillRect(px - s * .22, by - s * .9, s * .44, s * .9);
    if (glow) { x.fillStyle = col; x.globalAlpha = .25; x.beginPath(); x.arc(px, by - s, s * 1.2, 0, 7); x.fill(); x.globalAlpha = 1; }
    x.fillStyle = col; x.beginPath(); x.ellipse(px, by - s * .85, s * .7, s * .55, 0, Math.PI, 0); x.fill();
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(px - s * .25, by - s * 1.1, s * .12, 0, 7); x.fill(); x.beginPath(); x.arc(px + s * .2, by - s * 1.2, s * .09, 0, 7); x.fill();
  }
  function crystal(x, px, by, s, col) {
    for (const [dx, sc, rot] of [[-.12, .7, -.35], [.12, .6, .4], [0, 1, 0]]) {
      x.save(); x.translate(px + dx * s * 2, by); x.rotate(rot); const hh = s * sc, ww = s * .22 * (sc + .3);
      const q = x.createLinearGradient(-ww, 0, ww, 0); q.addColorStop(0, col[0]); q.addColorStop(1, col[1]); x.fillStyle = q;
      x.beginPath(); x.moveTo(-ww, 0); x.lineTo(-ww, -hh * .7); x.lineTo(0, -hh); x.lineTo(ww, -hh * .7); x.lineTo(ww, 0); x.fill();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(-ww * .6, -hh * .1); x.lineTo(-ww * .6, -hh * .65); x.lineTo(-ww * .1, -hh * .85); x.lineTo(-ww * .1, -hh * .1); x.fill(); x.restore();
    }
  }
  function stal(x, px, ty, s, col) { x.fillStyle = col; x.beginPath(); x.moveTo(px - s * .25, ty); x.lineTo(px, ty + s); x.lineTo(px + s * .25, ty); x.fill(); x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.moveTo(px - s * .15, ty); x.lineTo(px - s * .02, ty + s * .7); x.lineTo(px, ty); x.fill(); }
  function icicle(x, px, ty, s) { const q = x.createLinearGradient(px - .05, 0, px + .05, 0); q.addColorStop(0, '#ffffff'); q.addColorStop(1, '#9fd6f2'); x.fillStyle = q; x.beginPath(); x.moveTo(px - .07, ty); x.lineTo(px, ty + s); x.lineTo(px + .07, ty); x.fill(); }
  function lantern(x, px, by, hang) {
    if (hang) { x.strokeStyle = '#3a3a40'; x.lineWidth = .03; x.beginPath(); x.moveTo(px, by - .9); x.lineTo(px, by - .45); x.stroke(); }
    x.fillStyle = '#3a3a40'; x.fillRect(px - .12, by - .45, .24, .05); x.fillRect(px - .12, by - .05, .24, .05);
    x.fillStyle = '#ffd77a'; x.fillRect(px - .1, by - .4, .2, .35); x.fillStyle = '#fff4c8'; x.fillRect(px - .04, by - .34, .08, .22);
    x.strokeStyle = '#3a3a40'; x.lineWidth = .025; x.strokeRect(px - .1, by - .4, .2, .35);
  }

  /* ---------- parallax layers (DOM canvases at 1x, moved with CSS transforms) ---------- */
  let PX = null;
  function buildParallax(W2, H2) {
    const key = world + ':' + W2 + 'x' + H2 + ':' + rq; if (PX && PX.key === key) return;
    // two wrap-around layers at the game canvas resolution: they are copied 1:1 each frame (no scaling = cheap on phones)
    const LW = Math.max(480, Math.ceil(W2)), LH = Math.ceil(H2 + 90), s = rq;
    W2 = LW; H2 = LH;
    const sky = mkCv(LW * s, LH * s), far = mkCv(LW * s, LH * s), mid = mkCv(LW * s, LH * s);
    const a = sky.getContext('2d'), b = far.getContext('2d'), m = mid.getContext('2d');
    a.scale(s, s); b.scale(s, s); m.scale(s, s);
    vrs = 5 + world;
    const S = SKY[world]; let q = a.createLinearGradient(0, 0, 0, H2); q.addColorStop(0, S[0]); q.addColorStop(.6, S[1]); q.addColorStop(1, S[2]); a.fillStyle = q; a.fillRect(0, 0, W2, H2);
    const both = (x, fn) => { fn(x, 0); x.save(); x.translate(-LW, 0); fn(x, 1); x.restore(); };
    const ridge = (x, base, amps, col, top) => both(x, xx => { xx.fillStyle = col; xx.beginPath(); xx.moveTo(0, LH); for (let i = 0; i <= 80; i++) { const px = i / 80 * LW; let y = base; amps.forEach(([k, a2, p]) => y += Math.sin(i / 80 * Math.PI * 2 * k + p) * a2 * LH); xx.lineTo(px, y); } xx.lineTo(LW, LH); xx.fill(); if (top) { xx.strokeStyle = top; xx.lineWidth = 2; xx.stroke(); } });
    const pts = n => Array.from({ length: n }, () => [vr(), vr(), vr()]);
    if (world === 0) {
      const sx = W2 * .78, sy = H2 * .14, sr = Math.min(W2, H2) * .06; q = a.createRadialGradient(sx, sy, sr * .3, sx, sy, sr * 5); q.addColorStop(0, 'rgba(255,250,215,.95)'); q.addColorStop(.2, 'rgba(255,245,200,.35)'); q.addColorStop(1, 'rgba(255,245,200,0)'); a.fillStyle = q; a.fillRect(0, 0, W2, H2); a.fillStyle = '#fffbe8'; a.beginPath(); a.arc(sx, sy, sr, 0, 7); a.fill();
      for (const [px, py] of pts(5)) { const cx = px * W2, cy = H2 * (.06 + py * .22), r = H2 * .03; a.fillStyle = 'rgba(255,255,255,.8)'; for (let k = 0; k < 5; k++) { a.beginPath(); a.ellipse(cx + (k - 2) * r * .9, cy - Math.sin(k / 4 * Math.PI) * r * .7, r * 1.15, r * .8, 0, 0, 7); a.fill(); } }
      ridge(b, LH * .46, [[1, .05, 0], [3, .025, 1.3], [7, .01, .4]], '#b2dcc0'); ridge(b, LH * .55, [[2, .04, 2], [5, .015, .7]], '#93c9a5');
      const trees = pts(26); both(m, xx => { for (const [px, py, s0] of trees) { const tx = px * LW, ty = LH * (.6 + py * .08), s = LH * (.09 + s0 * .07); xx.fillStyle = '#4e3524'; xx.fillRect(tx - s * .05, ty - s * .1, s * .1, s * .55); for (let k = 0; k < 3; k++) { xx.fillStyle = ['#2f7a45', '#378a4f', '#43a05e'][k]; xx.beginPath(); xx.moveTo(tx - s * (.48 - k * .1), ty - k * s * .32); xx.lineTo(tx, ty - s * (.68 + k * .3)); xx.lineTo(tx + s * (.48 - k * .1), ty - k * s * .32); xx.fill(); } } });
      ridge(m, LH * .76, [[3, .012, 0], [9, .006, 1]], '#3d8a4c');
    } else if (world === 1) {
      for (const [px, py, s0] of pts(8)) { const cx = px * W2, cy = py * H2, r = H2 * (.15 + s0 * .2); q = a.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, `rgba(${s0 < .5 ? '70,170,220' : '150,90,220'},.16)`); q.addColorStop(1, 'rgba(0,0,0,0)'); a.fillStyle = q; a.fillRect(0, 0, W2, H2); }
      const st = pts(28); both(b, xx => { xx.fillStyle = '#251f3e'; for (const [px, py, s0] of st) { const x0 = px * LW, w = LW * (.02 + s0 * .035), l = LH * (.12 + py * .25); xx.beginPath(); xx.moveTo(x0 - w, 0); xx.lineTo(x0, l); xx.lineTo(x0 + w, 0); xx.fill(); xx.beginPath(); xx.moveTo(x0 - w * 1.3, LH); xx.lineTo(x0 + w * .2, LH - l * .8); xx.lineTo(x0 + w * 1.3, LH); xx.fill(); } });
      const cr = pts(16); both(m, xx => { for (const [px, py, s0] of cr) { const x0 = px * LW, y0 = LH * (.45 + py * .5), s = LH * (.03 + s0 * .03); const g2 = xx.createRadialGradient(x0, y0, 0, x0, y0, s * 4); g2.addColorStop(0, s0 < .5 ? 'rgba(90,220,255,.35)' : 'rgba(190,120,255,.35)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); xx.fillStyle = g2; xx.fillRect(x0 - s * 4, y0 - s * 4, s * 8, s * 8); xx.save(); xx.translate(x0, y0); xx.scale(s * 2.4, s * 2.4); crystal(xx, 0, 0, .5, s0 < .5 ? ['#bff6ff', '#2a8cc0'] : ['#e0c8ff', '#7040c0']); xx.restore(); } });
      ridge(m, LH * .86, [[2, .02, 0], [7, .01, 1]], '#1a1530');
    } else if (world === 2) {
      for (const [px, py] of pts(5)) { const cx = px * W2, cy = H2 * (.3 + py * .6), r = H2 * .3; q = a.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, 'rgba(255,140,60,.14)'); q.addColorStop(1, 'rgba(0,0,0,0)'); a.fillStyle = q; a.fillRect(0, 0, W2, H2); }
      ridge(b, LH * .2, [[2, .05, 0], [5, .03, 1]], '#3a2618'); b.save(); b.scale(1, -1); b.translate(0, -LH); ridge(b, LH * .78, [[3, .04, 2], [6, .02, 0]], '#33200f'); b.restore();
      const beams = pts(6); both(m, xx => { for (const [px] of beams) { const x0 = px * LW; xx.fillStyle = '#5a3c22'; xx.fillRect(x0 - 10, LH * .25, 20, LH * .75); xx.fillRect(x0 + 60, LH * .25, 20, LH * .75); xx.fillStyle = '#6e4a2a'; xx.fillRect(x0 - 18, LH * .22, 106, 22); xx.fillStyle = 'rgba(0,0,0,.25)'; xx.fillRect(x0 - 18, LH * .22 + 18, 106, 4); xx.strokeStyle = '#3e2a18'; xx.lineWidth = 4; xx.beginPath(); xx.moveTo(x0, LH * .3); xx.lineTo(x0 + 70, LH * .55); xx.stroke(); } });
      ridge(m, LH * .9, [[4, .015, 0]], '#24160c');
    } else if (world === 3) {
      q = a.createLinearGradient(0, H2 * .05, 0, H2 * .4); for (let i = 0; i < 3; i++) { a.save(); a.globalAlpha = .28; a.strokeStyle = ['#7affc8', '#8ab8ff', '#d78aff'][i]; a.lineWidth = H2 * .05; a.beginPath(); for (let k = 0; k <= 30; k++) { const px = k / 30 * W2, py = H2 * (.12 + i * .05) + Math.sin(k * .5 + i * 2) * H2 * .04; k ? a.lineTo(px, py) : a.moveTo(px, py); } a.stroke(); a.restore(); }
      for (const [px, py] of pts(30)) { a.fillStyle = 'rgba(255,255,255,.7)'; a.fillRect(px * W2, py * H2 * .4, 1.5, 1.5); }
      ridge(b, LH * .42, [[1, .08, 0], [3, .04, 1.3], [6, .02, .4]], '#dbe8f6', '#ffffff'); ridge(b, LH * .52, [[2, .05, 2], [5, .02, .7]], '#aecbe6');
      const sp = pts(14); both(m, xx => { for (const [px, py, s0] of sp) { const x0 = px * LW, s = LH * (.12 + s0 * .14), y0 = LH * (.72 + py * .1); const g2 = xx.createLinearGradient(x0 - s * .2, 0, x0 + s * .2, 0); g2.addColorStop(0, '#e6f6ff'); g2.addColorStop(1, '#7fb6dc'); xx.fillStyle = g2; xx.beginPath(); xx.moveTo(x0 - s * .22, y0); xx.lineTo(x0 - s * .05, y0 - s); xx.lineTo(x0 + s * .22, y0); xx.fill(); } });
      ridge(m, LH * .8, [[3, .015, 0]], '#c6dcef');
    } else {
      for (const [px, py] of pts(70)) { a.fillStyle = `rgba(255,255,255,${.3 + py * .5})`; a.fillRect(px * W2, py * H2 * .55, py < .2 ? 2 : 1, py < .2 ? 2 : 1); }
      const mx = W2 * .22, my = H2 * .15, mr = Math.min(W2, H2) * .055; q = a.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4); q.addColorStop(0, 'rgba(230,230,255,.35)'); q.addColorStop(1, 'rgba(230,230,255,0)'); a.fillStyle = q; a.fillRect(0, 0, W2, H2); a.fillStyle = '#eceaf8'; a.beginPath(); a.arc(mx, my, mr, 0, 7); a.fill(); a.fillStyle = 'rgba(180,175,210,.5)'; a.beginPath(); a.arc(mx - mr * .3, my - mr * .2, mr * .2, 0, 7); a.arc(mx + mr * .35, my + mr * .25, mr * .14, 0, 7); a.fill();
      const tw = pts(9); both(b, xx => { for (const [px, py] of tw) { const x0 = px * LW, w = LW * .05, top = LH * (.28 + py * .2); xx.fillStyle = '#262040'; xx.fillRect(x0, top, w, LH); xx.beginPath(); xx.moveTo(x0 - w * .2, top); xx.lineTo(x0 + w / 2, top - w * 1.2); xx.lineTo(x0 + w * 1.2, top); xx.fill(); for (let k = 0; k < 3; k++) if (hash(k, Math.floor(px * 100)) < .6) { xx.fillStyle = 'rgba(255,200,90,.75)'; xx.fillRect(x0 + w * .38, top + w * (.5 + k * .9), w * .24, w * .36); } } });
      both(m, xx => { xx.fillStyle = '#1c1730'; xx.fillRect(0, LH * .66, LW, LH); for (let i = 0; i < 16; i++) { xx.fillRect(i / 16 * LW, LH * .62, LW / 32, LH * .05); } });
    }
    a.setTransform(1, 0, 0, 1, 0, 0); a.drawImage(far, 0, 0);
    PX = { key, LW, LH, far: sky, mid };
  }
