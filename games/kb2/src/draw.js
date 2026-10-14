  /* ---------- effects ---------- */
  function addShake(a) { if (opt.shake) shake = Math.min(1, Math.max(shake, a)); }
  function pushPart(p) { if (parts.length < 420) parts.push(p); }
  function spark(x, y, col, sp = 1) { pushPart({ x, y, vx: (rnd2() - .5) * 4 * sp, vy: -rnd2() * 3 * sp, life: .5, max: .5, col, s: .045, g: .4, gl: 1 }); }
  function sparkBurst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = rnd2() * 6.283, v = 1.5 + rnd2() * 3.5; pushPart({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: .45 + rnd2() * .35, max: .8, col, s: .04 + rnd2() * .04, g: .35, gl: 1, k: 'spark' }); } }
  function dust(x, y, n) { const col = ['rgba(225,205,170,.8)', 'rgba(190,170,220,.7)', 'rgba(205,170,130,.8)', 'rgba(255,255,255,.9)', 'rgba(200,195,215,.7)'][world]; for (let i = 0; i < n; i++) pushPart({ x: x + (rnd2() - .5) * .5, y: y - .05, vx: (rnd2() - .5) * 3, vy: -rnd2() * 1.2, life: .45 + rnd2() * .3, max: .75, col, s: .07 + rnd2() * .07, g: -.05, k: 'smoke' }); }
  function debris(x, y, cols, n) { for (let i = 0; i < n; i++) pushPart({ x: x + (rnd2() - .5) * .8, y: y + (rnd2() - .5) * .8, vx: (rnd2() - .5) * 7, vy: -rnd2() * 7, life: .8 + rnd2() * .5, max: 1.3, col: cols[i % cols.length], s: .05 + rnd2() * .08, g: 1.4, k: 'sq', rot: rnd2() * 6, vr: (rnd2() - .5) * 14 }); }
  function poof(x, y) { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; pushPart({ x, y, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, life: .55, max: .55, col: 'rgba(255,255,255,.85)', s: .12, g: 0, k: 'smoke' }); } }
  function splash(x, y) { const col = world === 2 || world === 4 ? '#ffb04a' : '#bfeaff'; for (let i = 0; i < 18; i++) pushPart({ x: x + (rnd2() - .5) * .6, y, vx: (rnd2() - .5) * 4, vy: -3 - rnd2() * 5, life: .7, max: .7, col, s: .05 + rnd2() * .05, g: 1.2, gl: world === 2 || world === 4 ? 1 : 0 }); }
  function explosionFx(x, y) {
    for (let i = 0; i < 26; i++) { const a = rnd2() * 6.283, v = 2 + rnd2() * 6; pushPart({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .5 + rnd2() * .4, max: .9, col: rnd2() < .5 ? '#ffd27a' : '#ff7a3a', s: .06 + rnd2() * .06, g: .2, gl: 1, k: 'spark' }); }
    for (let i = 0; i < 12; i++) pushPart({ x: x + (rnd2() - .5), y: y + (rnd2() - .5), vx: (rnd2() - .5) * 2, vy: -rnd2() * 2, life: 1 + rnd2() * .6, max: 1.6, col: 'rgba(90,85,95,.75)', s: .25 + rnd2() * .2, g: -.15, k: 'smoke' });
    pushPart({ x, y, vx: 0, vy: 0, life: .25, max: .25, col: 'rgba(255,240,200,1)', s: 2.2, g: 0, k: 'flash' });
  }
  function hurtFx(e) { sparkBurst(e.x + e.w / 2, e.y + .4, '#ff6a7a', 10); texts.push({ k: 'txt', t: '−♥', x: e.x + e.w / 2, y: e.y - .25, life: 1, col: '#ff7a8a' }); }
  function updParts(dt) {
    for (const p of parts) { p.life -= dt; p.vy += (p.g || 0) * 12 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot !== undefined) p.rot += p.vr * dt; }
    if (parts.length) parts = parts.filter(p => p.life > 0);
    for (const t of texts) t.life -= dt; if (texts.length) texts = texts.filter(t => t.life > 0);
    if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
  }

  /* ---------- characters ---------- */
  const GC = [
    { hat: ['#6fb8ff', '#2462c8'], band: '#173f88', tun: ['#5fd2e8', '#2a8fb4'], pants: '#344067', beard: ['#ffffff', '#d6dbe6'], boot: '#4a2c16', skin: ['#ffe0c4', '#f1b48c'] },
    { hat: ['#ff7058', '#b5261a'], band: '#6e140c', tun: ['#d47a3c', '#94491c'], pants: '#46372a', beard: ['#d08a52', '#94582c'], boot: '#33200f', skin: ['#ffd9bc', '#eaa982'] },
    { hat: ['#86e47a', '#2a9a44'], band: '#1a6a30', tun: ['#ff9cc6', '#cf5a92'], pants: '#5a3a5c', beard: ['#ffd65a', '#d99a18'], boot: '#5a2c3a', skin: ['#ffe2c8', '#f2b892'] },
  ];
  function limb(x, ax, ay, bx, by, w, col, bend = 0) { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(ax, ay); if (bend) x.quadraticCurveTo((ax + bx) / 2 + bend, (ay + by) / 2 + Math.abs(bend) * .5, bx, by); else x.lineTo(bx, by); x.stroke(); }
  function hand(x, hx, hy, C) { x.fillStyle = C.skin[1]; x.beginPath(); x.arc(hx, hy, .052, 0, 7); x.fill(); x.fillStyle = C.skin[0]; x.beginPath(); x.arc(hx - .01, hy - .012, .036, 0, 7); x.fill(); }
  function mushShield(x, cx, cy, rx, ry, upright) {
    x.save(); x.translate(cx, cy);
    if (upright) {           // held forward: cap seen from the side, standing up
      x.fillStyle = '#f2e6cc'; x.beginPath(); x.ellipse(-.03, 0, .045, ry * .85, 0, 0, 7); x.fill();
      const q = x.createLinearGradient(0, -ry, rx, ry); q.addColorStop(0, '#ff7a5a'); q.addColorStop(1, '#b8261a'); x.fillStyle = q;
      x.beginPath(); x.ellipse(0, 0, rx, ry, 0, -Math.PI / 2, Math.PI / 2); x.fill();
      x.strokeStyle = 'rgba(90,10,0,.5)'; x.lineWidth = .025; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, -Math.PI / 2, Math.PI / 2); x.stroke();
      x.fillStyle = '#fff'; [[.05, -.18, .045], [.08, .05, .05], [.04, .22, .035], [.1, -.04, .025]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a * rx / .14, b * ry / .34, r, 0, 7); x.fill(); });
    } else {                 // held up: a parasol / platform
      x.fillStyle = '#f2e6cc'; x.beginPath(); x.ellipse(0, .02, rx * .92, .055, 0, 0, 7); x.fill();
      x.strokeStyle = 'rgba(160,130,90,.6)'; x.lineWidth = .012; for (let i = -4; i <= 4; i++) { x.beginPath(); x.moveTo(i * rx * .2, .02); x.lineTo(0, .07); x.stroke(); }
      const q = x.createLinearGradient(0, -ry, 0, 0); q.addColorStop(0, '#ff7a5a'); q.addColorStop(1, '#c02c1c'); x.fillStyle = q;
      x.beginPath(); x.ellipse(0, 0, rx, ry, 0, Math.PI, 0); x.fill();
      x.strokeStyle = 'rgba(90,10,0,.55)'; x.lineWidth = .025; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, Math.PI, 0); x.stroke();
      x.fillStyle = '#fff'; [[-.32, -.07, .055], [-.08, -.15, .065], [.2, -.1, .055], [.38, -.04, .035], [.02, -.05, .03]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a * rx / .5, b * ry / .2, r, 0, 7); x.fill(); });
      x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(-rx * .3, -ry * .6, rx * .3, ry * .18, -.2, 0, 7); x.fill();
    }
    x.restore();
  }
  function drawGnome(x, e, alpha, still) {
    const C = GC[e.k], k = e.k, big = k === 1 ? 1.1 : 1, t = still ? 0 : clock;
    const climb = e.climb, air = !e.onGround && !climb, walk = !air && !climb && Math.abs(e.vx) > .4, spd = Math.abs(e.vx), run = walk && spd > 5;
    const ph = e.anim * (run ? 7.5 : 9.5), dash = e.dashT > 0, shieldUp = k === 2 && e.shieldUp, push = e.pushT > 0 && walk;
    const win = state === 'win' || state === 'done';
    let lean = walk ? (run ? .16 : .05) : 0, bob = walk ? Math.abs(Math.sin(ph)) * .035 : 0, sqx = 1, sqy = 1;
    if (dash) lean = .42; if (push) lean = .3; if (e.stun > 0) lean = -.15 + Math.sin(t * 9) * .08;
    if (e.land > 0) { const q = e.land / .16; sqy = 1 - .16 * q; sqx = 1 + .12 * q; }
    else if (!walk && !air && !climb) sqy = 1 + Math.sin(t * 2.6 + k * 2) * .013;
    x.save(); x.globalAlpha = alpha;
    if (win && !still) x.translate(0, -Math.abs(Math.sin(t * 7 + k * 1.3)) * .3);
    if (e.dead) { const d = Math.min(1, e.deadT * 2); x.translate(0, -d * .1); x.rotate(-e.face * d * 1.3); }
    x.scale(e.face || 1, 1); x.scale(sqx, sqy);
    if (e.hurtT > 0 && !still) x.translate(-Math.sin(e.hurtT * 40) * .04, 0);
    // legs
    const hipY = -.27 - bob;
    const legPos = s => {
      if (climb) { const a = Math.sin(e.anim * 9 + (s > 0 ? 0 : Math.PI)); return [s * .07, -.04 - Math.max(0, a) * .14]; }
      if (air) { if (shieldUp) return [s * .05 + Math.sin(t * 13 + s) * .04, .02]; return e.vy < 0 ? [s * .06 + .06, -.13] : [s * .07 + .02, -.02]; }
      if (push) return s > 0 ? [.12, -.03] : [-.2, -.01];
      if (dash) return s > 0 ? [.18, -.06] : [-.2, -.04];
      if (walk) { const a = ph + (s > 0 ? 0 : Math.PI), st = run ? .2 : .13; return [s * .03 + Math.sin(a) * st, -Math.max(0, Math.cos(a)) * (run ? .1 : .065)]; }
      return [s * .085, 0];
    };
    for (const s of [-1, 1]) { const [fx, fy] = legPos(s); limb(x, s * .06, hipY, fx, fy - .06, .11 * big, C.pants); x.fillStyle = C.boot; x.beginPath(); x.ellipse(fx + .045, fy - .035, .095 * big, .058, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(fx + .03, fy - .06, .05, .018, 0, 0, 7); x.fill(); }
    x.translate(0, -bob);
    x.save(); x.translate(0, hipY); x.rotate(lean); x.translate(0, -hipY);
    // arm targets [shoulder -> hand]
    const sh = [-.06, -.5], sf = [.08, -.5];
    let hb = [-.12, -.3], hf = [.15, -.31], bendB = 0, bendF = 0;
    if (walk) { hb = [-.06 + Math.sin(ph) * (run ? .16 : .1), run ? -.38 : -.3]; hf = [.1 - Math.sin(ph) * (run ? .16 : .1), run ? -.38 : -.31]; bendB = bendF = run ? -.06 : 0; }
    else if (climb) { const a = Math.sin(e.anim * 9); hb = [-.04, -.86 + a * .08]; hf = [.12, -.86 - a * .08]; }
    else if (air) { hb = [-.2, -.78]; hf = [.24, -.8]; if (e.vy > 3 && !shieldUp) { hb = [-.26, -.72 + Math.sin(t * 18) * .05]; hf = [.28, -.74 - Math.sin(t * 18) * .05]; } }
    if (push) { hb = [.24, -.38]; hf = [.3, -.42]; }
    if (dash) { hb = [-.28, -.34]; hf = [-.2, -.3]; }
    if (e.pullT > 0) hf = [.3, -.45 + e.pullT * .3];
    if (e.giveT > 0) hf = [.32, -.42];
    if (e.home && !win && !walk && !still && state === 'play') { hf = [.2, -.8 + Math.sin(t * 9) * .06]; }
    if (win && !still) { hb = [-.2, -.85]; hf = [.22, -.87]; }
    if (e.stun > 0) { hb = [-.24, -.42]; hf = [.24, -.42]; }
    if (still) { hb = [-.12, -.3]; hf = [.15, -.31]; }
    // back arm
    if (!shieldUp) { limb(x, sh[0], sh[1], hb[0], hb[1], .085, C.tun[1], bendB); hand(x, hb[0], hb[1], C); }
    // Sterk's hammer on his back
    if (k === 1 && e.hamT <= 0) { x.save(); x.translate(-.14, -.52); x.rotate(-.6); x.fillStyle = '#7a5530'; x.fillRect(-.025, -.05, .05, .5); x.fillStyle = '#8e95a2'; x.fillRect(-.09, -.12, .18, .13); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(-.09, -.12, .18, .03); x.restore(); }
    // Snel's scarf tails
    if (k === 0) { const fl = Math.min(1, spd / 6 + (air ? .4 : 0) + (dash ? 1 : 0)), wv = Math.sin(t * 16) * .04 * fl; x.fillStyle = '#ff7a3a'; x.beginPath(); x.moveTo(-.06, -.52); x.quadraticCurveTo(-.2 - fl * .1, -.5 + wv, -.3 - fl * .22, -.44 + wv * 2 - (1 - fl) * -.12); x.lineTo(-.28 - fl * .2, -.38 + wv * 2 + (1 - fl) * .12); x.quadraticCurveTo(-.18, -.44, -.05, -.46); x.fill(); }
    // braids (Schild)
    if (k === 2) { const sw = Math.sin(t * 3 + (walk ? ph : 0)) * .03 - spd * .01; for (const [bx, len] of [[-.13, .3], [.02, .26]]) { x.strokeStyle = C.beard[1]; x.lineWidth = .075; x.beginPath(); x.moveTo(bx, -.74); x.quadraticCurveTo(bx - .05 + sw, -.6, bx - .06 + sw * 2, -.74 + len + .2); x.stroke(); x.strokeStyle = C.beard[0]; x.lineWidth = .045; x.setLineDash([.035, .03]); x.stroke(); x.setLineDash([]); x.fillStyle = '#ff5a8a'; x.beginPath(); x.arc(bx - .06 + sw * 2, -.74 + len + .2, .035, 0, 7); x.fill(); } }
    // body / tunic
    const bw = (k === 1 ? 1.22 : 1) * (k === 2 ? 1.06 : 1), hem = k === 2 ? .25 : .2;
    let q = x.createLinearGradient(0, -.56, 0, -.16); q.addColorStop(0, C.tun[0]); q.addColorStop(1, C.tun[1]); x.fillStyle = q;
    x.beginPath(); x.moveTo(-hem * bw, -.17); x.quadraticCurveTo(-.21 * bw, -.5, -.02, -.57); x.quadraticCurveTo(.2 * bw, -.53, hem * bw, -.17); x.quadraticCurveTo(0, -.13, -hem * bw, -.17); x.fill();
    x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(-.06, -.46, .06, .08, -.3, 0, 7); x.fill();
    if (k === 1) { x.fillStyle = '#5c3a1e'; x.beginPath(); x.moveTo(-.2 * bw, -.2); x.quadraticCurveTo(-.2 * bw, -.48, -.06, -.54); x.lineTo(-.02, -.2); x.fill(); x.beginPath(); x.moveTo(.2 * bw, -.2); x.quadraticCurveTo(.19 * bw, -.46, .1, -.53); x.lineTo(.08, -.2); x.fill(); }
    if (k === 2) { x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = -2; i <= 2; i++) { x.beginPath(); x.arc(i * .09, -.2, .028, 0, 7); x.fill(); } }
    x.fillStyle = '#3a2412'; x.fillRect(-.2 * bw, -.31, .4 * bw, .055); x.fillStyle = '#ffd34a'; x.fillRect(.03, -.316, .07, .067); x.fillStyle = '#3a2412'; x.fillRect(.05, -.3, .03, .035);
    // head
    const hy = -.7, hr = k === 1 ? .18 : .172;
    q = x.createRadialGradient(.0, hy - .06, .02, .03, hy, hr); q.addColorStop(0, C.skin[0]); q.addColorStop(1, C.skin[1]); x.fillStyle = q; x.beginPath(); x.arc(.03, hy, hr, 0, 7); x.fill();
    x.fillStyle = C.skin[1]; x.beginPath(); x.ellipse(-.1, hy + .01, .035, .05, 0, 0, 7); x.fill();
    // beard (Snel, Sterk)
    if (k !== 2) {
      q = x.createLinearGradient(0, hy + .02, 0, hy + .36); q.addColorStop(0, C.beard[0]); q.addColorStop(1, C.beard[1]); x.fillStyle = q;
      const bl = k === 1 ? .38 : .31, bwid = k === 1 ? .23 : .19;
      x.beginPath(); x.moveTo(-.11, hy + .01); x.quadraticCurveTo(-.15, hy + bl * .7, .02, hy + bl); x.quadraticCurveTo(.09, hy + bl * .85, .12, hy + bl * .9); x.quadraticCurveTo(bwid, hy + bl * .5, .2, hy + .04); x.quadraticCurveTo(.08, hy + .1, -.11, hy + .01); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.08)'; x.lineWidth = .015; x.beginPath(); x.moveTo(.02, hy + .14); x.lineTo(.03, hy + bl * .8); x.moveTo(.1, hy + .14); x.lineTo(.1, hy + bl * .75); x.stroke();
      x.fillStyle = C.beard[0]; x.beginPath(); x.ellipse(.11, hy + .06, .1, .045, -.15, 0, 7); x.fill();
    } else { x.strokeStyle = '#b5485a'; x.lineWidth = .022; x.beginPath(); x.arc(.11, hy + .05, .045, .3, 2.2); x.stroke(); }
    // face
    x.fillStyle = 'rgba(255,110,110,.35)'; x.beginPath(); x.arc(.1, hy + .03, .042, 0, 7); x.fill();
    const ey = hy - .035, blink = e.blink < 0 && !still;
    if (e.stun > 0 && !still) { x.strokeStyle = '#2a1a12'; x.lineWidth = .016; for (const ex of [.075, .155]) { x.beginPath(); x.arc(ex, ey, .022, t * 12, t * 12 + 5); x.stroke(); } }
    else if (e.hurtT > 0 || e.dead) { x.strokeStyle = '#2a1a12'; x.lineWidth = .02; for (const ex of [.075, .155]) { x.beginPath(); x.moveTo(ex - .022, ey - .02); x.lineTo(ex + .022, ey); x.lineTo(ex - .022, ey + .02); x.stroke(); } }
    else if (blink || win) { x.strokeStyle = '#2a1a12'; x.lineWidth = .018; for (const ex of [.075, .155]) { x.beginPath(); if (win) x.arc(ex, ey + .01, .022, Math.PI * 1.1, Math.PI * 1.9); else { x.moveTo(ex - .022, ey); x.lineTo(ex + .022, ey); } x.stroke(); } }
    else for (const [ex, er] of [[.07, .03], [.155, .027]]) { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(ex, ey, er, er * 1.25, 0, 0, 7); x.fill(); x.fillStyle = '#2a1a12'; x.beginPath(); x.ellipse(ex + .008, ey + .004, er * .65, er * .85, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + .014, ey - .01, er * .28, 0, 7); x.fill(); }
    x.strokeStyle = k === 1 ? '#6a3a1a' : k === 2 ? '#a0701a' : '#c8c8d0'; x.lineWidth = k === 1 ? .03 : .02; x.beginPath(); x.moveTo(.045, ey - .055 - (k === 1 ? -.01 : 0)); x.lineTo(.1, ey - .06); x.moveTo(.135, ey - .06); x.lineTo(.185, ey - .052 - (k === 1 ? -.012 : 0)); x.stroke();
    q = x.createRadialGradient(.17, hy + .005, .01, .18, hy + .02, .07); q.addColorStop(0, '#ffb8a0'); q.addColorStop(1, '#e07a5e'); x.fillStyle = q; x.beginPath(); x.arc(.18, hy + .02, .062, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(.165, hy, .018, 0, 7); x.fill();
    // hat (squashed when the mushroom is held overhead)
    const sway = still ? 0 : clamp(-e.vx * .022 + (air ? e.vy * .008 : 0) + (walk ? Math.sin(ph * 2) * .02 : Math.sin(t * 1.7 + k) * .015), -.18, .18);
    const hatH = shieldUp ? .22 : k === 1 ? .48 : .44, hb0 = hy - .1;
    q = x.createLinearGradient(-.1, hb0 - hatH, .15, hb0); q.addColorStop(0, C.hat[0]); q.addColorStop(1, C.hat[1]); x.fillStyle = q;
    const tipX = -.12 + sway - (dash ? .2 : 0), tipY = hb0 - hatH;
    x.beginPath(); x.moveTo(-.19, hb0); x.quadraticCurveTo(-.17, hb0 - hatH * .5, tipX, tipY); x.quadraticCurveTo(tipX - .05, tipY + .06, tipX - .07 + sway * .5, tipY + .12); x.quadraticCurveTo(.06, hb0 - hatH * .55, .22, hb0); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.moveTo(-.12, hb0 - .02); x.quadraticCurveTo(-.11, hb0 - hatH * .45, tipX + .02, tipY + .05); x.quadraticCurveTo(-.06, hb0 - hatH * .4, -.06, hb0 - .02); x.fill();
    x.fillStyle = C.band; x.beginPath(); x.ellipse(.015, hb0, .215, .05, 0, 0, 7); x.fill();
    if (k === 0) { x.fillStyle = '#ffd34a'; x.beginPath(); x.ellipse(-.16, hb0 - .1, .04, .12, -.6, 0, 7); x.fill(); }
    if (k === 2) { x.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(.13 + Math.cos(i * 1.26) * .035, hb0 - .03 + Math.sin(i * 1.26) * .035, .025, 0, 7); x.fill(); } x.fillStyle = '#ffcf3a'; x.beginPath(); x.arc(.13, hb0 - .03, .022, 0, 7); x.fill(); }
    // front arm + tools
    if (k === 1 && e.hamT > 0) {
      const p = 1 - e.hamT / .34, a = p < .38 ? -1.7 - p / .38 * 1.0 : p < .62 ? -2.7 + (p - .38) / .24 * 3.6 : .9 - (p - .62) / .38 * 1.2;
      x.save(); x.translate(sf[0], sf[1]); x.rotate(a);
      limb(x, 0, 0, .22, 0, .09, C.tun[1]); hand(x, .22, 0, C);
      x.fillStyle = '#7a5530'; x.fillRect(.18, -.025, .42, .05);
      q = x.createLinearGradient(.52, -.15, .7, .15); q.addColorStop(0, '#e2e6ec'); q.addColorStop(1, '#68707e'); x.fillStyle = q; x.beginPath(); x.roundRect ? x.roundRect(.52, -.16, .18, .32, .04) : x.rect(.52, -.16, .18, .32); x.fill();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(.53, -.15, .04, .3);
      x.restore();
      if (p > .38 && p < .75) { x.strokeStyle = `rgba(255,255,255,${(.75 - p) * 1.8})`; x.lineWidth = .08; x.beginPath(); x.arc(sf[0], sf[1], .66, -1.9, Math.min(.9, -1.9 + (p - .38) / .24 * 2.8)); x.stroke(); }
    } else if (k === 1 && e.throwT > 0) {
      const p = 1 - e.throwT / .3;
      limb(x, sf[0], sf[1], .34, -.5, .085, C.tun[1]); hand(x, .34, -.5, C);
      x.strokeStyle = '#6a4422'; x.lineWidth = .035; x.beginPath(); x.moveTo(.34, -.46); x.lineTo(.36, -.6); x.moveTo(.36, -.6); x.lineTo(.31, -.68); x.moveTo(.36, -.6); x.lineTo(.42, -.67); x.stroke();
      const pull = p < .45 ? .2 : 0; x.strokeStyle = '#d8c0a0'; x.lineWidth = .015; x.beginPath(); x.moveTo(.31, -.68); x.lineTo(.3 - pull, -.6); x.lineTo(.42, -.67); x.stroke();
    } else if (k === 2 && shieldUp) {
      limb(x, sh[0], sh[1], -.08, -.98, .08, C.tun[1]); limb(x, sf[0], sf[1], .1, -.98, .08, C.tun[1]); hand(x, -.08, -.98, C); hand(x, .1, -.98, C);
      x.strokeStyle = '#efe2c4'; x.lineWidth = .06; x.beginPath(); x.moveTo(.01, -.96); x.lineTo(.01, -1.12); x.stroke();
      mushShield(x, .01, -1.15, .54, .19 + (e.glide && !still ? Math.sin(t * 10) * .015 : 0), false);
    } else if (k === 2 && !climb) {
      const hx = .2 + (walk ? Math.sin(ph) * .015 : 0); limb(x, sf[0], sf[1], hx, -.4, .085, C.tun[1]); hand(x, hx, -.4, C);
      mushShield(x, .28, -.44, .15, .36, true);
    } else {
      limb(x, sf[0], sf[1], hf[0], hf[1], .085, C.tun[1], bendF); hand(x, hf[0], hf[1], C);
      if (k === 2 && climb) mushShield(x, -.18, -.45, .1, .24, true);
    }
    x.restore();
    x.restore();
  }
  function drawStars(x, cx, cy) { for (let i = 0; i < 3; i++) { const a = clock * 6 + i * 2.09; x.fillStyle = '#ffe14a'; star(x, cx + Math.cos(a) * .3, cy + Math.sin(a) * .1, .07); } }
  function star(x, px, py, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } x.fill(); }

  /* ---------- enemies ---------- */
  function drawFoe(x, f) {
    x.save(); x.translate(f.x + f.w / 2, f.y + f.h);
    if (f.dead) { x.globalAlpha = Math.max(0, 1 - f.dead * 1.6); x.scale(1 + f.dead, Math.max(.1, 1 - f.dead * 1.5)); }
    else if (f.inv > 0 && Math.floor(clock * 20) % 2) x.globalAlpha = .55;
    const fc = f.face || 1, a = f.anim;
    if (f.t === 'walker') {
      x.scale(fc, 1);
      if (world === 0) { // beetle
        for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const lx = -.18 + i * .18, w = Math.sin(a * 16 + i * 2 + (s > 0 ? 0 : 1.5)) * .05; x.strokeStyle = '#22301a'; x.lineWidth = .035; x.beginPath(); x.moveTo(lx, -.18); x.lineTo(lx + w + s * .03, 0); x.stroke(); }
        let q = x.createRadialGradient(-.08, -.4, .02, 0, -.25, .4); q.addColorStop(0, '#9ef06a'); q.addColorStop(.5, '#3a9a3a'); q.addColorStop(1, '#1d4a2a'); x.fillStyle = q; x.beginPath(); x.ellipse(-.04, -.25, .36, .24, 0, Math.PI, 0); x.lineTo(.32, -.17); x.lineTo(-.4, -.17); x.fill();
        x.strokeStyle = 'rgba(0,30,0,.5)'; x.lineWidth = .02; x.beginPath(); x.moveTo(-.04, -.48); x.lineTo(-.04, -.17); x.stroke();
        x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.ellipse(-.16, -.38, .08, .04, -.4, 0, 7); x.fill();
        x.fillStyle = '#26301e'; x.beginPath(); x.arc(.3, -.22, .11, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(.34, -.25, .04, 0, 7); x.fill(); x.fillStyle = '#000'; x.beginPath(); x.arc(.355, -.25, .02, 0, 7); x.fill();
        x.strokeStyle = '#26301e'; x.lineWidth = .025; x.beginPath(); x.moveTo(.36, -.3); x.quadraticCurveTo(.45, -.45, .52, -.4); x.stroke();
      } else if (world === 1) { // spider
        for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const bx = -.1 + i * .07, w = Math.sin(a * 14 + i * 1.3 + (s > 0 ? 0 : 1.5)) * .05; x.strokeStyle = '#1e1530'; x.lineWidth = .035; x.beginPath(); x.moveTo(bx, -.3); x.lineTo(bx + s * (.16 + i * .02) + w, -.48); x.lineTo(bx + s * (.28 + i * .03) + w, 0); x.stroke(); }
        let q = x.createRadialGradient(-.12, -.36, .02, -.08, -.3, .25); q.addColorStop(0, '#8a6ab0'); q.addColorStop(1, '#2e2044'); x.fillStyle = q; x.beginPath(); x.ellipse(-.08, -.3, .24, .18, 0, 0, 7); x.fill();
        x.fillStyle = '#5affd8'; x.beginPath(); x.ellipse(-.12, -.36, .07, .03, -.3, 0, 7); x.fill();
        x.fillStyle = '#3a2a4e'; x.beginPath(); x.arc(.17, -.27, .11, 0, 7); x.fill();
        x.fillStyle = '#ff4a5a'; for (const [p, r] of [[.22, -.31], [.26, -.25], [.18, -.23]]) { x.beginPath(); x.arc(p, r, .024, 0, 7); x.fill(); }
      } else if (world === 2) { // rat
        x.strokeStyle = '#d88a9a'; x.lineWidth = .03; x.beginPath(); x.moveTo(-.3, -.15); x.quadraticCurveTo(-.55, -.1 + Math.sin(a * 8) * .05, -.6, -.3); x.stroke();
        for (const s of [-.15, .15]) { const w = Math.sin(a * 16 + s * 9) * .05; x.fillStyle = '#5a4e48'; x.beginPath(); x.ellipse(s + w, -.03, .06, .035, 0, 0, 7); x.fill(); }
        let q = x.createLinearGradient(0, -.45, 0, 0); q.addColorStop(0, '#9a8e88'); q.addColorStop(1, '#5e534e'); x.fillStyle = q; x.beginPath(); x.ellipse(-.03, -.2, .33, .19, 0, 0, 7); x.fill();
        x.beginPath(); x.moveTo(.18, -.32); x.quadraticCurveTo(.45, -.24, .44, -.15); x.quadraticCurveTo(.3, -.08, .15, -.1); x.fill();
        x.fillStyle = '#e8a0b0'; x.beginPath(); x.arc(.44, -.17, .035, 0, 7); x.fill(); x.beginPath(); x.ellipse(.16, -.37, .06, .08, 0, 0, 7); x.fill();
        x.fillStyle = '#000'; x.beginPath(); x.arc(.3, -.24, .025, 0, 7); x.fill(); x.fillStyle = '#ffe14a'; x.fillRect(-.12, -.42, .14, .06);
      } else if (world === 3) { // penguin
        const w = Math.sin(a * 12) * .08; x.rotate(w * .5);
        x.fillStyle = '#ffb02a'; x.beginPath(); x.ellipse(-.08, -.02, .09, .035, 0, 0, 7); x.ellipse(.12, -.02, .09, .035, 0, 0, 7); x.fill();
        x.fillStyle = '#1e2838'; x.beginPath(); x.ellipse(0, -.32, .24, .32, 0, 0, 7); x.fill();
        x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(.06, -.28, .15, .24, 0, 0, 7); x.fill();
        x.fillStyle = '#1e2838'; x.beginPath(); x.ellipse(-.18, -.3, .07, .18, .3 + w, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(.1, -.5, .045, 0, 7); x.fill(); x.fillStyle = '#000'; x.beginPath(); x.arc(.115, -.5, .022, 0, 7); x.fill();
        x.strokeStyle = '#000'; x.lineWidth = .02; x.beginPath(); x.moveTo(.05, -.57); x.lineTo(.15, -.55); x.stroke();
        x.fillStyle = '#ffb02a'; x.beginPath(); x.moveTo(.2, -.46); x.lineTo(.32, -.43); x.lineTo(.2, -.4); x.fill();
        x.fillStyle = '#e83a3a'; x.fillRect(-.16, -.62, .3, .06);
      } else { // slime
        const sq = 1 + Math.sin(a * 7) * .08; x.scale(1 / sq, sq);
        let q = x.createRadialGradient(-.08, -.32, .02, 0, -.2, .4); q.addColorStop(0, '#d6a8ff'); q.addColorStop(1, '#7a3ac0'); x.fillStyle = q;
        x.beginPath(); x.moveTo(-.36, 0); x.quadraticCurveTo(-.38, -.5, 0, -.5); x.quadraticCurveTo(.38, -.5, .36, 0); x.fill();
        x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(-.14, -.36, .07, .04, -.4, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(.08, -.28, .06, 0, 7); x.arc(.24, -.28, .05, 0, 7); x.fill(); x.fillStyle = '#2a1040'; x.beginPath(); x.arc(.1, -.28, .03, 0, 7); x.arc(.25, -.28, .025, 0, 7); x.fill();
      }
    } else if (f.t === 'knight') {
      x.scale(fc, 1); const w = Math.sin(a * 9) * .06;
      x.fillStyle = '#4a4656'; x.fillRect(-.14 + w, -.24, .1, .24); x.fillRect(.04 - w, -.24, .1, .24);
      let q = x.createLinearGradient(-.25, 0, .25, 0); q.addColorStop(0, '#e0e4ec'); q.addColorStop(1, '#7a8090'); x.fillStyle = q; x.beginPath(); x.roundRect ? x.roundRect(-.24, -.66, .48, .46, .1) : x.rect(-.24, -.66, .48, .46); x.fill();
      x.fillStyle = '#9a2a3a'; x.beginPath(); x.moveTo(-.2, -.6); x.lineTo(.2, -.6); x.lineTo(.16, -.26); x.lineTo(-.16, -.26); x.fill(); x.fillStyle = '#e0b04a'; x.beginPath(); x.arc(0, -.44, .06, 0, 7); x.fill();
      q = x.createLinearGradient(-.2, 0, .2, 0); q.addColorStop(0, '#f0f2f6'); q.addColorStop(1, '#868c9a'); x.fillStyle = q; x.beginPath(); x.arc(0, -.78, .2, Math.PI, 0); x.lineTo(.2, -.66); x.lineTo(-.2, -.66); x.fill();
      x.fillStyle = '#20202a'; x.fillRect(.02, -.8, .17, .04); x.fillRect(.08, -.8, .03, .12);
      x.fillStyle = '#d8333f'; x.beginPath(); x.moveTo(-.02, -.98); x.quadraticCurveTo(-.25, -1.05, -.3, -.85); x.quadraticCurveTo(-.15, -.95, -.02, -.94); x.fill();
      if (f.hp > 1) { x.fillStyle = '#7a8090'; x.beginPath(); x.ellipse(.28, -.42, .12, .2, 0, 0, 7); x.fill(); x.fillStyle = '#e0b04a'; x.beginPath(); x.arc(.28, -.42, .05, 0, 7); x.fill(); }
      x.strokeStyle = '#c8ccd6'; x.lineWidth = .04; x.beginPath(); x.moveTo(-.28, -.4); x.lineTo(-.28, -.95); x.stroke();
    } else if (f.t === 'archer') {
      x.scale(f.face, 1);
      if (world === 3) { // snowman
        x.fillStyle = '#fff'; x.beginPath(); x.arc(0, -.22, .24, 0, 7); x.fill(); x.beginPath(); x.arc(0, -.58, .18, 0, 7); x.fill();
        x.fillStyle = 'rgba(120,170,220,.35)'; x.beginPath(); x.arc(-.05, -.18, .2, 1.4, 3.5); x.fill();
        x.fillStyle = '#222'; x.beginPath(); x.arc(.06, -.62, .025, 0, 7); x.arc(.14, -.61, .022, 0, 7); x.fill();
        x.fillStyle = '#ff8a2a'; x.beginPath(); x.moveTo(.14, -.57); x.lineTo(.32, -.56); x.lineTo(.14, -.53); x.fill();
        x.fillStyle = '#2a3a6a'; x.fillRect(-.16, -.84, .32, .08); x.fillRect(-.1, -.98, .2, .16);
        const pull = f.wind > 0 ? (1 - f.wind / .55) : 0; x.strokeStyle = '#6a4a2a'; x.lineWidth = .035; x.beginPath(); x.moveTo(.15, -.4); x.lineTo(.3 - pull * .2, -.6 - pull * .1); x.stroke();
        if (f.wind > 0) { x.fillStyle = '#fff'; x.beginPath(); x.arc(.3 - pull * .2, -.62 - pull * .1, .07, 0, 7); x.fill(); }
      } else {
        x.fillStyle = '#3a2a1a'; x.beginPath(); x.ellipse(-.08, -.04, .08, .05, 0, 0, 7); x.ellipse(.1, -.04, .08, .05, 0, 0, 7); x.fill();
        const cl = ['#6a7a3a', '#5a3a7a', '#7a5a3a', '#4a6a8a', '#7a2a3a'][world];
        let q = x.createLinearGradient(0, -.6, 0, -.1); q.addColorStop(0, cl); q.addColorStop(1, '#2a2418'); x.fillStyle = q; x.beginPath(); x.moveTo(-.2, -.08); x.lineTo(-.15, -.5); x.lineTo(.15, -.5); x.lineTo(.2, -.08); x.fill();
        x.fillStyle = '#8fbf5a'; x.beginPath(); x.arc(0, -.62, .15, 0, 7); x.fill();
        x.beginPath(); x.moveTo(-.12, -.66); x.lineTo(-.34, -.8); x.lineTo(-.1, -.58); x.fill();
        x.fillStyle = cl; x.beginPath(); x.moveTo(-.19, -.6); x.quadraticCurveTo(-.1, -.96, .1, -.84); x.quadraticCurveTo(.2, -.72, .16, -.66); x.quadraticCurveTo(0, -.76, -.19, -.6); x.fill();
        x.fillStyle = '#ffe14a'; x.beginPath(); x.arc(.08, -.63, .03, 0, 7); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(.09, -.63, .013, 0, 7); x.fill();
        const pull = f.wind > 0 ? (1 - f.wind / .55) * .16 : 0;
        x.strokeStyle = '#8a5a2a'; x.lineWidth = .045; x.beginPath(); x.arc(.12, -.46, .32, -1.15, 1.15); x.stroke();
        const tx = .12 + Math.cos(1.15) * .32, ty = Math.sin(1.15) * .32;
        x.strokeStyle = '#ddd'; x.lineWidth = .012; x.beginPath(); x.moveTo(tx, -.46 - ty); x.lineTo(.2 - pull, -.46); x.lineTo(tx, -.46 + ty); x.stroke();
        x.strokeStyle = '#8fbf5a'; x.lineWidth = .07; x.beginPath(); x.moveTo(.05, -.44); x.lineTo(.4, -.46); x.stroke();
        if (f.wind > 0) { x.strokeStyle = '#6a4a22'; x.lineWidth = .025; x.beginPath(); x.moveTo(.2 - pull, -.46); x.lineTo(.62, -.46); x.stroke(); x.fillStyle = '#aab'; x.beginPath(); x.moveTo(.68, -.46); x.lineTo(.6, -.5); x.lineTo(.6, -.42); x.fill(); }
      }
    } else if (f.t === 'bat') {
      x.scale(f.face, 1); x.translate(0, -f.h / 2); const fl = Math.sin(clock * 18 + f.ph) * .9;
      if (world === 0) { // wasp
        x.fillStyle = 'rgba(220,240,255,.6)'; x.beginPath(); x.ellipse(-.05, -.18, .18, .08, -.6 + fl * .4, 0, 7); x.fill(); x.beginPath(); x.ellipse(.05, -.16, .16, .07, -.3 - fl * .3, 0, 7); x.fill();
        x.fillStyle = '#ffcc2a'; x.beginPath(); x.ellipse(-.1, 0, .2, .13, 0, 0, 7); x.fill(); x.fillStyle = '#2a2018'; x.fillRect(-.18, -.12, .05, .24); x.fillRect(-.06, -.13, .05, .26); x.beginPath(); x.moveTo(-.3, 0); x.lineTo(-.4, .04); x.lineTo(-.3, .05); x.fill();
        x.fillStyle = '#2a2018'; x.beginPath(); x.arc(.16, -.02, .1, 0, 7); x.fill(); x.fillStyle = '#ff4a3a'; x.beginPath(); x.arc(.2, -.05, .035, 0, 7); x.fill();
      } else {
        const col = world === 3 ? '#8a9ac8' : '#4a3a5e';
        x.fillStyle = col; for (const s of [-1, 1]) { x.save(); x.scale(s, 1); x.rotate(fl * .5); x.beginPath(); x.moveTo(.05, 0); x.quadraticCurveTo(.25, -.25, .45, -.1); x.quadraticCurveTo(.38, .0, .4, .08); x.quadraticCurveTo(.3, .02, .25, .1); x.quadraticCurveTo(.18, .04, .05, .08); x.fill(); x.restore(); }
        x.fillStyle = world === 3 ? '#b8c6e8' : '#5e4a76'; x.beginPath(); x.ellipse(0, .02, .12, .14, 0, 0, 7); x.fill();
        x.beginPath(); x.moveTo(-.08, -.08); x.lineTo(-.06, -.2); x.lineTo(-.01, -.1); x.moveTo(.08, -.08); x.lineTo(.06, -.2); x.lineTo(.01, -.1); x.fill();
        x.fillStyle = '#ffde4a'; x.beginPath(); x.arc(-.04, -.02, .025, 0, 7); x.arc(.05, -.02, .025, 0, 7); x.fill();
      }
    } else if (f.t === 'boss') {
      x.scale(f.face, 1);
      const w = Math.sin(f.anim * 6) * .08, wind = f.wind > 0 ? 1 - f.wind / .8 : 0;
      const rock = (px, py, rx, ry, c0, c1) => { const q = x.createRadialGradient(px - rx * .3, py - ry * .4, .02, px, py, Math.max(rx, ry)); q.addColorStop(0, c0); q.addColorStop(1, c1); x.fillStyle = q; x.beginPath(); x.ellipse(px, py, rx, ry, 0, 0, 7); x.fill(); };
      rock(-.35 + w, -.25, .26, .26, '#9a96a8', '#4e4a5c'); rock(.35 - w, -.25, .26, .26, '#9a96a8', '#4e4a5c');
      rock(0, -1.05, .78, .62, '#b4b0c2', '#5c586c');
      x.fillStyle = 'rgba(120,230,160,.6)'; for (const [p, r] of [[-.3, -1.2], [.25, -.85], [-.1, -.7]]) { x.beginPath(); x.ellipse(p, r, .12, .06, .3, 0, 7); x.fill(); }
      rock(.1, -1.75, .42, .36, '#c4c0d2', '#6a667a');
      x.fillStyle = f.inv > 0 ? '#ffffff' : '#ff6a2a'; x.beginPath(); x.ellipse(.22, -1.78, .07, .05, 0, 0, 7); x.ellipse(.42, -1.78, .06, .045, 0, 0, 7); x.fill();
      x.strokeStyle = '#3a3646'; x.lineWidth = .05; x.beginPath(); x.moveTo(.12, -1.88); x.lineTo(.3, -1.84); x.moveTo(.36, -1.84); x.lineTo(.5, -1.88); x.stroke();
      x.fillStyle = '#2a2636'; x.beginPath(); x.ellipse(.34, -1.6, .1, .04, 0, 0, 7); x.fill();
      const armA = wind > 0 ? -2.2 * wind : Math.sin(f.anim * 6) * .3;
      x.save(); x.translate(.55, -1.25); x.rotate(armA); rock(.2, .25, .2, .34, '#a8a4b6', '#58546a'); if (wind > 0) rock(.25, .65, .26, .24, '#8a7a6a', '#4a3e30'); x.restore();
      x.save(); x.translate(-.55, -1.25); x.rotate(-Math.sin(f.anim * 6) * .3); rock(-.15, .3, .2, .34, '#a8a4b6', '#58546a'); x.restore();
    }
    x.restore();
    if (f.stun > 0 && !f.dead && f.t !== 'bat') drawStars(x, f.x + f.w / 2, f.y - .15);
  }

  /* ---------- items & objects ---------- */
  function drawItem(x, it, px, py, s = 1) {
    x.save(); x.translate(px, py); x.scale(s, s);
    if (it === 'gem') {
      const q = x.createLinearGradient(-.2, -.2, .2, .2); q.addColorStop(0, '#c8fbff'); q.addColorStop(.5, '#4ad8f0'); q.addColorStop(1, '#2a7ad0'); x.fillStyle = q;
      x.beginPath(); x.moveTo(-.22, -.08); x.lineTo(-.12, -.22); x.lineTo(.12, -.22); x.lineTo(.22, -.08); x.lineTo(0, .24); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(20,60,120,.6)'; x.lineWidth = .025; x.stroke();
      x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.moveTo(-.12, -.08); x.lineTo(-.06, -.2); x.lineTo(.02, -.08); x.lineTo(-.02, .1); x.fill();
    } else if (it[0] === 'k' && it.length === 2) {
      const col = KEYCOL[it[1]]; x.rotate(-.5);
      x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = .05; x.fillStyle = col;
      x.beginPath(); x.arc(-.12, 0, .13, 0, 7); x.fill(); x.stroke(); x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(-.12, 0, .05, 0, 7); x.fill();
      x.fillStyle = col; x.fillRect(0, -.035, .3, .07); x.fillRect(.18, .03, .05, .1); x.fillRect(.26, .03, .045, .07);
      x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.arc(-.16, -.05, .04, 0, 7); x.fill();
    } else if (it === 'apple') {
      const q = x.createRadialGradient(-.06, -.06, .02, 0, 0, .22); q.addColorStop(0, '#ff8a7a'); q.addColorStop(1, '#c81e24'); x.fillStyle = q;
      x.beginPath(); x.arc(-.07, .02, .16, 0, 7); x.arc(.07, .02, .16, 0, 7); x.fill();
      x.strokeStyle = '#5a3a1a'; x.lineWidth = .035; x.beginPath(); x.moveTo(0, -.1); x.quadraticCurveTo(.02, -.2, .05, -.24); x.stroke();
      x.fillStyle = '#5fbf3a'; x.beginPath(); x.ellipse(.11, -.18, .08, .04, -.5, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(-.1, -.04, .04, .06, .3, 0, 7); x.fill();
    } else if (it === 'bomb') {
      const q = x.createRadialGradient(-.06, -.04, .02, 0, .04, .22); q.addColorStop(0, '#6a6e80'); q.addColorStop(1, '#16171e'); x.fillStyle = q; x.beginPath(); x.arc(0, .05, .19, 0, 7); x.fill();
      x.fillStyle = '#4a4c58'; x.fillRect(-.06, -.18, .12, .07);
      x.strokeStyle = '#c8a86a'; x.lineWidth = .03; x.beginPath(); x.moveTo(0, -.18); x.quadraticCurveTo(.08, -.28, .14, -.24); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-.07, -.03, .05, .03, -.5, 0, 7); x.fill();
    } else if (it === 'gear') { gearShape(x, 0, 0, .22, clock * .5, '#e0b04a', '#9a6a1a'); }
    x.restore();
  }
  function gearShape(x, px, py, r, rot, c0, c1) {
    x.save(); x.translate(px, py); x.rotate(rot);
    const q = x.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); q.addColorStop(0, c0); q.addColorStop(1, c1); x.fillStyle = q;
    x.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * .78 : r; x.lineTo(Math.cos(a - .1) * rr, Math.sin(a - .1) * rr); x.lineTo(Math.cos(a + .1) * rr, Math.sin(a + .1) * rr); } x.fill();
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(0, 0, r * .3, 0, 7); x.fill(); x.restore();
  }
  const lamp = (x, px, py, col, on, r = .08) => { if (on) { x.fillStyle = col; x.globalAlpha = .35; x.beginPath(); x.arc(px, py, r * 2.4, 0, 7); x.fill(); x.globalAlpha = 1; } x.fillStyle = on ? col : '#3a3a44'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(px - r * .3, py - r * .3, r * .35, 0, 7); x.fill(); };
  function drawObj(x, o) {
    const col = CHCOL[o.ch] || '#fff';
    if (o.t === 'gate') {
      const top = o.r, n = o.n, lift = (1 - Math.pow(1 - o.a, 2)) * n * .92;
      x.save(); x.beginPath(); x.rect(o.c - .1, top, 1.2, n); x.clip();
      for (let i = 0; i < 4; i++) { const bx = o.c + .1 + i * .24, q = x.createLinearGradient(bx, 0, bx + .1, 0); q.addColorStop(0, '#a7aebb'); q.addColorStop(1, '#4b525e'); x.fillStyle = q; x.fillRect(bx, top - lift, .09, n); x.fillStyle = '#3a3f48'; x.beginPath(); x.moveTo(bx - .02, top - lift + n); x.lineTo(bx + .045, top - lift + n + .12); x.lineTo(bx + .11, top - lift + n); x.fill(); }
      for (let k = 0; k < n * 2; k++) { x.fillStyle = '#5a606c'; x.fillRect(o.c + .05, top - lift + .3 + k * .5, .9, .07); }
      x.restore();
      x.fillStyle = '#2d2a33'; x.fillRect(o.c - .05, top - .12, 1.1, .14); lamp(x, o.c + .5, top - .05, col, o.open, .07);
    } else if (o.t === 'lock') {
      const n = o.n, lift = o.a * n;
      x.save(); x.beginPath(); x.rect(o.c, o.r, 1, n); x.clip(); x.translate(0, -lift);
      const q = x.createLinearGradient(o.c, 0, o.c + 1, 0); q.addColorStop(0, '#7a4a22'); q.addColorStop(.5, '#b47e42'); q.addColorStop(1, '#6a3c1a'); x.fillStyle = q; x.fillRect(o.c + .06, o.r, .88, n);
      x.strokeStyle = 'rgba(50,25,10,.55)'; x.lineWidth = .025; for (const px of [.3, .5, .7]) { x.beginPath(); x.moveTo(o.c + px, o.r); x.lineTo(o.c + px, o.r + n); x.stroke(); }
      x.fillStyle = '#3a3a44'; for (let k = 0; k < n; k++) { x.fillRect(o.c + .06, o.r + k + .12, .88, .07); x.fillRect(o.c + .06, o.r + k + .8, .88, .07); }
      const ly = o.r + n / 2; x.fillStyle = KEYCOL[o.col]; x.beginPath(); x.roundRect ? x.roundRect(o.c + .3, ly - .1, .4, .32, .05) : x.rect(o.c + .3, ly - .1, .4, .32); x.fill();
      x.strokeStyle = KEYCOL[o.col]; x.lineWidth = .06; x.beginPath(); x.arc(o.c + .5, ly - .1, .12, Math.PI, 0); x.stroke();
      x.fillStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.arc(o.c + .5, ly + .03, .04, 0, 7); x.fill(); x.fillRect(o.c + .485, ly + .03, .03, .1);
      x.restore();
    } else if (o.t === 'bridge') {
      for (let i = 0; i < o.n; i++) {
        const [c, r] = o.cells[i], k = clamp(o.a * o.n - i, 0, 1); if (k <= 0) { x.strokeStyle = `rgba(255,255,255,${.12 + .06 * Math.sin(clock * 4 + i)})`; x.setLineDash([.1, .1]); x.lineWidth = .03; x.strokeRect(c + .05, r, .9, .22); x.setLineDash([]); continue; }
        x.save(); x.globalAlpha = k; const q = x.createLinearGradient(0, r, 0, r + .26); q.addColorStop(0, '#d0a060'); q.addColorStop(1, '#7a5228'); x.fillStyle = q; x.fillRect(c, r, 1.01, .26);
        x.fillStyle = col; x.fillRect(c, r, 1.01, .04); x.strokeStyle = 'rgba(60,35,15,.6)'; x.lineWidth = .02; x.beginPath(); x.moveTo(c + .5, r); x.lineTo(c + .5, r + .26); x.stroke(); x.restore();
      }
    } else if (o.t === 'ladder') {
      for (const [c, r] of o.cells) { if (o.a > .02) drawLadder(x, c, r, PAL[world], o.a); else { x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = .03; x.setLineDash([.08, .08]); x.strokeRect(c + .16, r, .68, 1); x.setLineDash([]); } }
      if (o.a > .02 && o.a < .98) for (const [c, r] of o.cells) { x.fillStyle = col; x.globalAlpha = (1 - o.a) * .5; x.fillRect(c + .15, r, .7, 1); x.globalAlpha = 1; }
    } else if (o.t === 'beam') {
      const [c, r0] = o.cells[0], n = o.n;
      x.fillStyle = '#3a3646'; x.fillRect(c + .2, r0 - .14, .6, .16); x.fillRect(c + .2, r0 + n - .02, .6, .16); lamp(x, c + .5, r0 - .06, col, o.on, .06);
      if (o.on) {
        x.globalCompositeOperation = 'lighter';
        const q = x.createLinearGradient(c, 0, c + 1, 0); q.addColorStop(0, 'rgba(120,220,255,0)'); q.addColorStop(.5, `rgba(${world === 0 ? '120,255,140' : '150,200,255'},.55)`); q.addColorStop(1, 'rgba(120,220,255,0)'); x.fillStyle = q; x.fillRect(c, r0, 1, n);
        x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = .04; x.beginPath(); for (let i = 0; i <= n * 6; i++) { const yy = r0 + i / 6, xx = c + .5 + Math.sin(clock * 30 + i * 1.7) * .12 * Math.sin(i * .9 + clock * 7); i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke();
        x.globalCompositeOperation = 'source-over';
      }
    } else if (o.t === 'lever') {
      const c = o.c, r = o.r;
      x.fillStyle = '#4a4a56'; x.beginPath(); x.roundRect ? x.roundRect(c + .22, r + .78, .56, .22, .06) : x.rect(c + .22, r + .78, .56, .22); x.fill();
      const a = -.65 + o.a * 1.3; x.strokeStyle = '#9a9aa6'; x.lineWidth = .075; x.beginPath(); x.moveTo(c + .5, r + .84); x.lineTo(c + .5 + Math.sin(a) * .45, r + .84 - Math.cos(a) * .45); x.stroke();
      x.fillStyle = col; x.beginPath(); x.arc(c + .5 + Math.sin(a) * .48, r + .84 - Math.cos(a) * .48, .11, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(c + .47 + Math.sin(a) * .48, r + .8 - Math.cos(a) * .48, .04, 0, 7); x.fill();
      lamp(x, c + .5, r + .9, col, o.on, .045);
    } else if (o.t === 'button') {
      const c = o.c, r = o.r, wl = solid(c - 1, r) ? -1 : solid(c + 1, r) ? 1 : 0, cxp = c + .5 + wl * .38;
      x.fillStyle = '#4a4656'; if (wl) x.fillRect(c + .5 + wl * .42 - .06, r + .2, .12, .6); else x.fillRect(c + .44, r + .5, .12, .5);
      const p = o.flash > 0 ? .7 : 1; x.fillStyle = '#f4ecd8'; x.beginPath(); x.arc(cxp, r + .5, .3 * p, 0, 7); x.fill();
      x.fillStyle = col; x.beginPath(); x.arc(cxp, r + .5, .21 * p, 0, 7); x.fill(); x.fillStyle = '#f4ecd8'; x.beginPath(); x.arc(cxp, r + .5, .12 * p, 0, 7); x.fill(); x.fillStyle = o.on ? col : '#5a5466'; x.beginPath(); x.arc(cxp, r + .5, .06, 0, 7); x.fill();
    } else if (o.t === 'plate') {
      const c = o.c, r = o.r, d = o.on ? .05 : 0;
      x.fillStyle = '#3a3a44'; x.fillRect(c + .06, r + .9, .88, .1);
      x.fillStyle = col; x.fillRect(c + .12, r + .8 + d, .76, .12 - d); x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(c + .14, r + .8 + d, .72, .025);
      if (o.on) { x.globalCompositeOperation = 'lighter'; x.fillStyle = col; x.globalAlpha = .25; x.fillRect(c + .1, r + .55, .8, .4); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    } else if (o.t === 'socket') {
      const c = o.c, r = o.r;
      x.fillStyle = '#5a5e6a'; x.beginPath(); x.roundRect ? x.roundRect(c + .1, r + .1, .8, .8, .12) : x.rect(c + .1, r + .1, .8, .8); x.fill(); x.strokeStyle = '#2c2f37'; x.lineWidth = .04; x.stroke();
      x.fillStyle = '#23252c'; x.beginPath(); x.arc(c + .5, r + .5, .28, 0, 7); x.fill();
      if (o.on) gearShape(x, c + .5, r + .5, .26, clock * 2, '#ffd86a', '#a8701a'); else { x.strokeStyle = 'rgba(255,220,120,.5)'; x.setLineDash([.06, .06]); x.lineWidth = .03; x.beginPath(); x.arc(c + .5, r + .5, .24, 0, 7); x.stroke(); x.setLineDash([]); }
      lamp(x, c + .5, r + .12, col, o.on, .05);
    } else if (o.t === 'fan') {
      const c = o.c, r = o.r, on = !o.ch || chan[o.ch];
      x.fillStyle = '#23252c'; x.fillRect(c + .1, r + .05, .8, .3);
      x.save(); x.translate(c + .5, r + .2); x.scale(1, .3); const rot = on ? clock * 18 : 0;
      for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#b8bec8' : '#8a909c'; x.beginPath(); x.ellipse(Math.cos(rot + i * 1.57) * .2, Math.sin(rot + i * 1.57) * .2, .2, .08, rot + i * 1.57, 0, 7); x.fill(); }
      x.restore();
      x.strokeStyle = '#3a3d47'; x.lineWidth = .03; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(c + .12 + i * .19, r + .05); x.lineTo(c + .12 + i * .19, r + .35); x.stroke(); }
      if (o.ch) lamp(x, c + .9, r + .5, col, on, .05);
      if (on) { x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .03; const H2 = r - o.top; for (let i = 0; i < 6; i++) { const yy = r - ((clock * 3.2 + i * H2 / 6) % H2), xx = c + .2 + (i % 3) * .3 + Math.sin(clock * 3 + i) * .06; x.globalAlpha = .6 * Math.min(1, (yy - o.top) / 1.2); x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy - .45); x.stroke(); } x.globalAlpha = 1; }
    } else if (o.t === 'fire') {
      const c = o.c, r = o.r, [dx, dy] = DIRV[o.dir];
      x.fillStyle = '#2a2a30'; x.beginPath(); x.arc(c + .5 + dx * .45, r + .5 + dy * .45, .2, 0, 7); x.fill();
      if (o.warm && !o.on) { x.fillStyle = 'rgba(255,140,40,.6)'; x.beginPath(); x.arc(c + .5 + dx * .45, r + .5 + dy * .45, .12 + Math.sin(clock * 30) * .03, 0, 7); x.fill(); }
      if (o.ch) lamp(x, c + .5 - dx * .3 + dy * .3, r + .5 - dy * .3 + dx * .3, col, !chan[o.ch], .05);
      if (o.on && o.ext > 0) {
        x.save(); x.globalCompositeOperation = 'lighter';
        x.translate(c + .5 + dx * .45, r + .5 + dy * .45); x.rotate(Math.atan2(dy, dx));
        const LL0 = o.ext + .1, fl = Math.sin(clock * 31 + c) * .06;
        for (const [w, col, l] of [[.42, 'rgba(255,80,20,.5)', 1], [.3, 'rgba(255,150,40,.65)', .88], [.17, 'rgba(255,230,150,.85)', .62], [.07, 'rgba(255,255,230,.9)', .35]]) {
          const LL = LL0 * l, tip = Math.sin(clock * 23 + w * 9) * .1;
          x.fillStyle = col; x.beginPath(); x.moveTo(0, -w * .55);
          x.bezierCurveTo(LL * .3, -w * (1.25 + fl), LL * .75, -w * .7 + tip, LL, tip);
          x.bezierCurveTo(LL * .75, w * .7 + tip, LL * .3, w * (1.25 - fl), 0, w * .55); x.fill();
        }
        x.restore();
        if (rnd2() < .25) pushPart({ x: c + .5 + dx * (o.ext * rnd2() + .5), y: r + .5 + dy * (o.ext * rnd2() + .5), vx: (rnd2() - .5) * 1.5 + dx * 2, vy: (rnd2() - .5) * 1.5 + dy * 2 - 1, life: .4, max: .4, col: '#ffcf6a', s: .03, g: -.2, gl: 1 });
      }
    } else if (o.t === 'tele') {
      const c = o.c, r = o.r, ok = o.cd <= 0;
      x.fillStyle = '#3a3448'; x.beginPath(); x.ellipse(c + .5, r + .92, .46, .1, 0, 0, 7); x.fill();
      x.save(); x.globalCompositeOperation = 'lighter';
      const q = x.createLinearGradient(0, r + .9, 0, r - .2); q.addColorStop(0, ok ? 'rgba(190,140,255,.6)' : 'rgba(190,140,255,.2)'); q.addColorStop(1, 'rgba(190,140,255,0)'); x.fillStyle = q; x.fillRect(c + .1, r - .2, .8, 1.1);
      for (let i = 0; i < 4; i++) { const u = (clock * .8 + i / 4) % 1; x.fillStyle = `rgba(230,200,255,${.8 * (1 - u)})`; x.beginPath(); x.arc(c + .5 + Math.sin(clock * 3 + i * 1.6) * .3, r + .9 - u * 1, .04, 0, 7); x.fill(); }
      x.restore();
      x.strokeStyle = '#c8a8ff'; x.lineWidth = .04; x.beginPath(); x.ellipse(c + .5, r + .9, .38, .07, 0, 0, 7); x.stroke();
      x.fillStyle = '#e8d8ff'; x.font = 'bold .28px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.tag, c + .5, r + .5);
    } else if (o.t === 'sign') {
      const c = o.c, r = o.r;
      x.fillStyle = '#6a4422'; x.fillRect(c + .45, r + .35, .1, .65);
      x.fillStyle = '#d8b07a'; x.beginPath(); x.roundRect ? x.roundRect(c + .12, r + .08, .76, .42, .06) : x.rect(c + .12, r + .08, .76, .42); x.fill(); x.strokeStyle = '#6a4422'; x.lineWidth = .04; x.stroke();
      x.fillStyle = '#6a3a14'; x.font = 'bold .3px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', c + .5, r + .3);
    }
  }
  function drawPlat(x, p) {
    if (p.kind === 'elev') { // rails down to the lowest stop
      const yTop = Math.min(p.y0, p.y0 + p.ty), yBot = Math.max(p.y0, p.y0 + p.ty) + .4;
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(p.x + .08, yTop - .2, .08, yBot - yTop + .2); x.fillRect(p.x + p.w - .16, yTop - .2, .08, yBot - yTop + .2);
      x.strokeStyle = '#6a6e78'; x.lineWidth = .03; x.beginPath(); x.moveTo(p.x + .3, p.y); x.lineTo(p.x + p.w / 2, p.y - .5); x.lineTo(p.x + p.w - .3, p.y); x.stroke();
      x.fillStyle = '#4a4e58'; x.beginPath(); x.arc(p.x + p.w / 2, p.y - .52, .07, 0, 7); x.fill();
    }
    const q = x.createLinearGradient(0, p.y, 0, p.y + p.h); q.addColorStop(0, p.kind === 'elev' ? '#a8aebb' : '#c8945a'); q.addColorStop(1, p.kind === 'elev' ? '#4e535e' : '#7a5228'); x.fillStyle = q;
    x.beginPath(); x.roundRect ? x.roundRect(p.x, p.y, p.w, p.h, .08) : x.rect(p.x, p.y, p.w, p.h); x.fill();
    x.fillStyle = p.ch ? CHCOL[p.ch] : 'rgba(255,255,255,.35)'; x.fillRect(p.x + .05, p.y, p.w - .1, .045);
    x.fillStyle = '#2c2f37'; for (let i = 0; i < p.w * 2; i++) { x.beginPath(); x.arc(p.x + .25 + i * .5, p.y + .22, .035, 0, 7); x.fill(); }
  }
  function drawExit(x, ex) {
    const x0 = ex.c, x1 = ex.c + ex.n, yb = ex.r + 1, yt = ex.r - 1.05, mx = (x0 + x1) / 2, pulse = .5 + .5 * Math.sin(clock * 3);
    let q = x.createRadialGradient(mx, yb - .7, .1, mx, yb - .7, ex.n * .9); q.addColorStop(0, `rgba(190,255,180,${.32 + pulse * .15})`); q.addColorStop(1, 'rgba(190,255,180,0)'); x.fillStyle = q; x.fillRect(x0 - 1, yt - 1, ex.n + 2, 3.2);
    x.fillStyle = 'rgba(20,30,15,.55)'; x.beginPath(); x.moveTo(x0 + .15, yb); x.lineTo(x0 + .15, yt + .6); x.quadraticCurveTo(mx, yt - .35, x1 - .15, yt + .6); x.lineTo(x1 - .15, yb); x.fill();
    q = x.createLinearGradient(0, yt, 0, yb); q.addColorStop(0, 'rgba(255,255,220,.06)'); q.addColorStop(1, `rgba(200,255,190,${.3 + pulse * .12})`); x.fillStyle = q; x.fill();
    for (const px of [x0 + .02, x1 - .22]) { q = x.createLinearGradient(px, 0, px + .2, 0); q.addColorStop(0, '#b47e42'); q.addColorStop(1, '#6a4420'); x.fillStyle = q; x.fillRect(px, yt + .45, .2, yb - yt - .45); }
    x.strokeStyle = '#7a5028'; x.lineWidth = .18; x.beginPath(); x.moveTo(x0 + .12, yt + .6); x.quadraticCurveTo(mx, yt - .38, x1 - .12, yt + .6); x.stroke();
    x.fillStyle = '#f0dcae'; x.strokeStyle = '#6a4420'; x.lineWidth = .035; x.beginPath(); x.roundRect ? x.roundRect(mx - .46, yt - .4, .92, .34, .06) : x.rect(mx - .46, yt - .4, .92, .34); x.fill(); x.stroke();
    x.fillStyle = '#2f6a22'; x.font = 'bold .24px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('UIT', mx, yt - .22);
    for (const px of [x0 + .12, x1 - .12]) lamp(x, px, yt + .42, '#ffd86a', true, .07);
  }
  function drawLiquid(x, c, r) {
    const top = tAt(c, r - 1) !== LQ, P = PAL[world], hot = world === 2 || world === 4;
    if (!LQG) { LQG = {}; }
    if (top) {
      const q = x.createLinearGradient(0, r, 0, r + 1); q.addColorStop(0, P.liq[0]); q.addColorStop(1, P.liq[1]); x.fillStyle = q;
      x.beginPath(); x.moveTo(c, r + 1.01); for (let i = 0; i <= 4; i++) x.lineTo(c + i / 4, r + .14 + Math.sin(clock * 3 + (c + i / 4) * 2.6) * .05); x.lineTo(c + 1, r + 1.01); x.fill();
      x.strokeStyle = P.liq[2]; x.globalAlpha = .85; x.lineWidth = .05; x.beginPath(); for (let i = 0; i <= 4; i++) { const yy = r + .14 + Math.sin(clock * 3 + (c + i / 4) * 2.6) * .05; i ? x.lineTo(c + i / 4, yy) : x.moveTo(c, yy); } x.stroke(); x.globalAlpha = 1;
      if (hot && hash(c, r, Math.floor(clock * 1.5)) < .25) { const u = (clock * 1.5) % 1; x.fillStyle = `rgba(255,230,140,${1 - u})`; x.beginPath(); x.arc(c + .5, r + .2 - u * .3, .06 + u * .05, 0, 7); x.fill(); }
    } else { x.fillStyle = P.liq[1]; x.fillRect(c, r, 1.01, 1.01); }
  }
  let LQG = null;

  /* ---------- lighting (dark worlds) ---------- */
  let LC = null, LCX = null, LSPR = null, GSPR = null;
  function glowSprite() { if (GSPR) return GSPR; const c = mkCv(64, 64), x = c.getContext('2d'), q = x.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, 'rgba(255,190,90,.6)'); q.addColorStop(.35, 'rgba(255,150,60,.22)'); q.addColorStop(1, 'rgba(255,140,50,0)'); x.fillStyle = q; x.fillRect(0, 0, 64, 64); GSPR = c; return c; }
  function lightSprite() { if (LSPR) return LSPR; const c = mkCv(64, 64), x = c.getContext('2d'), q = x.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, 'rgba(0,0,0,1)'); q.addColorStop(.45, 'rgba(0,0,0,.75)'); q.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = q; x.fillRect(0, 0, 64, 64); LSPR = c; return c; }
  function drawLighting(camX, camY) {
    const dk = WORLDS[world].dark; if (!dk) return;
    const lw = Math.ceil(W / 4), lh = Math.ceil(H / 4);
    if (!LC || LC.width !== lw || LC.height !== lh) { LC = mkCv(lw, lh); LCX = LC.getContext('2d'); }
    const x = LCX, s = T / 4, spr = lightSprite();
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, lw, lh); x.fillStyle = `rgba(6,4,14,${dk})`; x.fillRect(0, 0, lw, lh);
    x.globalCompositeOperation = 'destination-out';
    const L1 = (wx, wy, r, a = 1) => { const px = (wx - camX) * s, py = (wy - camY) * s, rr = r * s; if (px + rr < 0 || py + rr < 0 || px - rr > lw || py - rr > lh) return; x.globalAlpha = a; x.drawImage(spr, px - rr, py - rr, rr * 2, rr * 2); };
    for (const l of lights) L1(l.x, l.y, l.r * (l.fl ? 1 + Math.sin(clock * 9 + l.x) * .05 : 1));
    gn.forEach((e, i) => { if (!e.dead) L1(e.x + e.w / 2, e.y + .3, i === cur ? 4.2 : 2.8); });
    for (const ex of exits) L1(ex.c + ex.n / 2, ex.r, 3.4);
    for (const o of fires) if (o.on) L1(o.c + .5 + DIRV[o.dir][0] * 1.5, o.r + .5 + DIRV[o.dir][1] * 1.5, 3);
    for (const o of objs) if (o.t === 'tele' || (o.t === 'beam' && o.on) || o.t === 'lever') L1(o.c + .5, o.r + .5, o.t === 'lever' ? 1.6 : 2.4, .8);
    for (const p of shots) L1(p.x, p.y, 1.2, .6);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(LC, 0, 0, cv.width, cv.height);
  }

  /* ---------- ambient particles ---------- */
  let amb = [];
  function ambient(dt, camX, camY) {
    const n = [26, 22, 20, 46, 18][world];
    while (amb.length < n) amb.push({ x: camX + rnd2() * vw, y: camY + rnd2() * vh, ph: rnd2() * 6, s: .5 + rnd2() * .8 });
    for (const a of amb) {
      a.ph += dt;
      if (world === 0) { a.x += (Math.sin(a.ph * 1.3) * .6 + .4) * dt; a.y += (.55 + a.s * .3) * dt; }
      else if (world === 1) { a.x += Math.sin(a.ph * .7) * .25 * dt; a.y += Math.cos(a.ph * .5) * .2 * dt; }
      else if (world === 2 || world === 4) { a.x += Math.sin(a.ph) * .2 * dt; a.y -= (.35 + a.s * .3) * dt; }
      else { a.x += (Math.sin(a.ph * 1.1) * .4 - .2) * dt; a.y += (.7 + a.s * .5) * dt; }
      if (a.y > camY + vh + 1) a.y -= vh + 2; if (a.y < camY - 1) a.y += vh + 2; if (a.x > camX + vw + 1) a.x -= vw + 2; if (a.x < camX - 1) a.x += vw + 2;
    }
  }
  function drawAmbient(x) {
    for (const a of amb) {
      if (world === 0) { x.save(); x.translate(a.x, a.y); x.rotate(a.ph * 2); x.fillStyle = a.s > .9 ? '#e8a23a' : '#8fcf4a'; x.beginPath(); x.ellipse(0, 0, .09 * a.s, .045 * a.s, 0, 0, 7); x.fill(); x.restore(); }
      else if (world === 3) { x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(a.x, a.y, .035 * a.s + .015, 0, 7); x.fill(); }
      else { const f = .5 + .5 * Math.sin(a.ph * 3); x.fillStyle = world === 1 ? `rgba(140,240,255,${.3 + f * .5})` : `rgba(255,${world === 2 ? 170 : 200},90,${.25 + f * .5})`; x.beginPath(); x.arc(a.x, a.y, .03 * a.s + .015, 0, 7); x.fill(); }
    }
  }

  /* ---------- frame ---------- */
  let exits = []; const DBG = {};
  function draw(dt = 0) {
    if (!L || !W) return;
    const q = rq, A = buildArt(Rt);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
    const sk = shake > 0 && opt.shake ? shake * shake * .35 : 0, camX = cam.x + (sk ? Math.sin(clock * 73) * sk : 0), camY = cam.y + (sk ? Math.cos(clock * 61) * sk : 0);
    const ox = Math.round(-camX * Rt), oy = Math.round(-camY * Rt);
    // parallax background
    if (PX && !DBG.noBg) {
      const FW = PX.far.width, fy = Math.round((-40 - clamp(camY * T * .05, -40, 40)) * rq), my = Math.round((-40 - clamp(camY * T * .12, -40, 40)) * rq);
      for (const [img, f, y] of [[PX.far, .18, fy], [PX.mid, .4, my]]) {
        let x0 = -Math.round(((camX * T * f * rq) % FW + FW) % FW);
        for (; x0 < cv.width; x0 += FW) ctx.drawImage(img, x0, y);
      }
    } else ctx.clearRect(0, 0, cv.width, cv.height);
    // terrain chunks
    const cpx = CHK * Rt, cx0 = Math.floor(camX / CHK), cx1 = Math.floor((camX + vw) / CHK), cy0 = Math.floor(camY / CHK), cy1 = Math.floor((camY + vh) / CHK);
    for (const [c, r] of dirtyChunks) invalidate(c, r); dirtyChunks.length = 0;
    for (let cy = Math.max(0, cy0); cy <= cy1; cy++) for (let cx = Math.max(0, cx0); cx <= cx1; cx++) { if (cx * CHK >= Wd || cy * CHK >= Ht || DBG.noChunks) continue; const img = getChunk(cx, cy); if (img) ctx.drawImage(img, ox + cx * cpx, oy + cy * cpx); }
    ctx.setTransform(Rt, 0, 0, Rt, ox, oy); ctx.lineJoin = ctx.lineCap = 'round';
    // below the map: continue the bottom row (ground texture / deep liquid) so the camera may look a little lower
    if (camY + vh > Ht) for (let c = Math.max(0, Math.floor(camX)); c <= Math.min(Wd - 1, Math.ceil(camX + vw)); c++) {
      const t = tile[(Ht - 1) * Wd + c];
      if (t === LQ) { ctx.fillStyle = PAL[world].liq[1]; ctx.fillRect(c, Ht, 1.01, camY + vh - Ht + 1); }
      else if (SOLID[t]) for (let r = Ht; r < camY + vh + 1; r++) ctx.drawImage(A.body, (c % 4) * Rt, (r % 4) * Rt, Rt, Rt, c, r, 1.01, 1.01);
    }
    const c0 = Math.floor(camX) - 1, c1 = Math.ceil(camX + vw) + 1, r0 = Math.max(0, Math.floor(camY) - 1), r1 = Math.min(Ht - 1, Math.ceil(camY + vh) + 1);
    const vis = (x0, y0, x1 = x0 + 1, y1 = y0 + 1) => x1 > c0 && x0 < c1 && y1 > r0 - 2 && y0 < r1 + 2;
    // torch flames & glow
    for (const d of decor) if (d.k === 'wall' && (world === 4 || world === 2) && vis(d.c, d.r)) {
      const fx = d.c + .5, fy = d.r + (world === 4 ? .32 : .45), fl = Math.sin(clock * 11 + d.c) * .03;
      ctx.globalCompositeOperation = 'lighter'; const gs = glowSprite(); ctx.globalAlpha = .55; ctx.drawImage(gs, fx - 1.1 - fl * 3, fy - 1.1 - fl * 3, 2.2 + fl * 6, 2.2 + fl * 6); ctx.globalAlpha = 1;
      if (world === 4) { ctx.fillStyle = 'rgba(255,190,80,.9)'; ctx.beginPath(); ctx.moveTo(fx - .1, fy + .06); ctx.quadraticCurveTo(fx - .12, fy - .12, fx + fl, fy - .26 - fl); ctx.quadraticCurveTo(fx + .12, fy - .1, fx + .1, fy + .06); ctx.fill(); ctx.fillStyle = 'rgba(255,250,200,.9)'; ctx.beginPath(); ctx.ellipse(fx, fy - .02, .04, .07, 0, 0, 7); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    // dynamic tiles
    for (let r = r0; r <= r1; r++) for (let c = Math.max(0, c0); c <= Math.min(Wd - 1, c1); c++) {
      const t = tile[r * Wd + c];
      if (t === LQ) drawLiquid(ctx, c, r);
      else if (t === CVL || t === CVR) { const d = t === CVL ? -1 : 1; ctx.fillStyle = '#2a2c33'; ctx.fillRect(c, r + .06, 1.01, .12); ctx.fillStyle = '#ffcf3a'; for (let i = 0; i < 3; i++) { const u = (((clock * 2.3 * d) % 1 + 1) % 1 + i / 3) % 1; const px = c + u; ctx.beginPath(); ctx.moveTo(px - .07 * d, r + .08); ctx.lineTo(px + .03 * d, r + .12); ctx.lineTo(px - .07 * d, r + .16); ctx.fill(); } }
      else if (t === FK) { let near = false; for (const e of gn) if (Math.abs(e.x + e.w / 2 - c - .5) < 1.6 && Math.abs(e.y + e.h / 2 - r - .5) < 1.6) near = true; const fk = A.body; ctx.globalAlpha = near ? .35 : 1; ctx.drawImage(fk, ((c % 4) + 4) % 4 * Rt, ((r % 4) + 4) % 4 * Rt, Rt, Rt, c, r, 1.01, 1.01); ctx.globalAlpha = 1; }
    }
    for (const ex of exits) if (vis(ex.c, ex.r - 2, ex.c + ex.n)) drawExit(ctx, ex);
    for (const o of objs) if (vis(o.c - 1, o.r - 1, o.c + 2, o.r + o.n + 1)) drawObj(ctx, o);
    for (const p of plats) if (vis(p.x, p.y - 1, p.x + p.w, Math.max(p.y0, p.y0 + (p.ty || 0)) + 1)) drawPlat(ctx, p);
    for (const it of items) if (vis(it.x - 1, it.y - 1)) {
      const b = Math.sin(clock * 3 + (it.ph || 0)) * .07;
      if (it.it === 'gem') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(80,220,255,.18)'; ctx.beginPath(); ctx.arc(it.x, it.y + b, .42, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      drawItem(ctx, it.it, it.x, it.y + b, 1.1);
      const gl = (clock * 1.2 + (it.ph || 0) * .37) % 2.4; if (gl < .25) { ctx.fillStyle = 'rgba(255,255,255,.9)'; star(ctx, it.x - .15 + gl, it.y - .1 + b, .06); }
    }
    for (const k of crates) if (vis(k.x, k.y)) { const bb = k.float ? Math.sin((k.bob || 0) * 2.2) * .04 : 0; ctx.drawImage(A.crate, k.x, k.y + bb, 1, 1); if (k.float) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(k.x - .05, k.y + .12 + bb, 1.1, .04); } }
    for (const b of bombs) { drawItem(ctx, 'bomb', b.x + .25, b.y + .28, 1.2); if (Math.floor(b.fuse * (b.fuse < .8 ? 12 : 5)) % 2) { ctx.fillStyle = 'rgba(255,80,60,.5)'; ctx.beginPath(); ctx.arc(b.x + .25, b.y + .3, .28, 0, 7); ctx.fill(); } }
    for (const f of foes) if (vis(f.x - 1, f.y - 1, f.x + 2, f.y + 2)) drawFoe(ctx, f);
    // gnomes: inactive first
    for (const i of [0, 1, 2].filter(i => i !== cur).concat([cur])) {
      const e = gn[i], cx = e.x + e.w / 2, by = e.y + e.h;
      if (e.dead && e.deadT > 1.6) continue;
      if (e.onGround) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, by - .01, .3 + (i === 1 ? .05 : 0), .065, 0, 0, 7); ctx.fill(); }
      if (i === cur && state === 'play') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,170,.13)'; ctx.beginPath(); ctx.ellipse(cx, by - .05, .55, .16, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      ctx.save(); ctx.translate(cx, by + .01);
      drawGnome(ctx, e, e.dead ? Math.max(0, 1 - e.deadT * .7) : (e.invul > 0 && Math.floor(clock * 14) % 2 ? .45 : 1));
      ctx.restore();
      if (e.stun > 0) drawStars(ctx, cx, e.y - .3);
    }
    for (const p of shots) {
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.kind === 'arrow') { const d = Math.sign(p.vx); ctx.strokeStyle = '#6a4a22'; ctx.lineWidth = .04; ctx.beginPath(); ctx.moveTo(-d * .5, 0); ctx.lineTo(0, 0); ctx.stroke(); ctx.fillStyle = '#c8d0dc'; ctx.beginPath(); ctx.moveTo(d * .1, 0); ctx.lineTo(-d * .02, -.05); ctx.lineTo(-d * .02, .05); ctx.fill(); ctx.fillStyle = '#e04a3a'; ctx.beginPath(); ctx.moveTo(-d * .5, 0); ctx.lineTo(-d * .42, -.07); ctx.lineTo(-d * .36, 0); ctx.lineTo(-d * .42, .07); ctx.fill(); }
      else if (p.kind === 'nut') { ctx.rotate(p.rot); ctx.fillStyle = '#9a5a26'; ctx.beginPath(); ctx.ellipse(0, .02, .1, .12, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6a4020'; ctx.beginPath(); ctx.ellipse(0, -.07, .12, .06, 0, 0, 7); ctx.fill(); }
      else if (p.kind === 'snow') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, .13, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(140,190,230,.5)'; ctx.beginPath(); ctx.arc(.03, .03, .08, 0, 7); ctx.fill(); }
      else { ctx.rotate(p.rot * .3); const g2 = ctx.createRadialGradient(-.08, -.08, .02, 0, 0, .3); g2.addColorStop(0, '#b8a890'); g2.addColorStop(1, '#5a4a3a'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(.3, 0); ctx.lineTo(.12, .26); ctx.lineTo(-.2, .24); ctx.lineTo(-.3, -.02); ctx.lineTo(-.12, -.26); ctx.lineTo(.18, -.22); ctx.fill(); }
      ctx.restore();
    }
    for (const p of parts) {
      const a = Math.min(1, p.life / (p.max || .5) * 1.6); ctx.globalAlpha = a; ctx.fillStyle = p.col; if (p.gl) ctx.globalCompositeOperation = 'lighter';
      if (p.k === 'sq') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s, -p.s, p.s * 2, p.s * 1.6); ctx.restore(); }
      else if (p.k === 'smoke') { ctx.globalAlpha = a * .7; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.8 - p.life / (p.max || 1)), 0, 7); ctx.fill(); }
      else if (p.k === 'spark' || p.k === 'line') { ctx.strokeStyle = p.col; ctx.lineWidth = p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .035, p.y - p.vy * .035); ctx.stroke(); }
      else if (p.k === 'flash') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .6; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.3 - p.life * 2), 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    ambient(dt, camX, camY); drawAmbient(ctx);
    if (!DBG.noLight) drawLighting(camX, camY);
    // screen-space overlay: texts, markers, off-screen arrows
    ctx.setTransform(q, 0, 0, q, 0, 0);
    const sp = (wx, wy) => [(wx - camX) * T, (wy - camY) * T];
    for (const t of texts) {
      const u = 1 - t.life / (t.max || 1.1);
      if (t.k === 'txt') { const [px, py] = sp(t.x, t.y - u * .9); ctx.globalAlpha = Math.min(1, t.life * 2); ctx.font = `800 ${Math.round(T * .42)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(t.t, px, py); ctx.fillStyle = t.col || '#fff'; ctx.fillText(t.t, px, py); }
      else if (t.k === 'icon') { const [px, py] = sp(t.x, t.y - u * 1.1); ctx.globalAlpha = Math.min(1, t.life * 2); ctx.save(); ctx.translate(px, py); ctx.scale(T, T); drawItem(ctx, t.it, 0, 0, 1 + u * .3); ctx.restore(); }
      else if (t.k === 'fly') { const v = 1 - t.life / t.max, wx = t.x + (t.tx - t.x) * v, wy = t.y + (t.ty - t.y) * v - Math.sin(v * Math.PI) * .8; const [px, py] = sp(wx, wy); ctx.save(); ctx.translate(px, py); ctx.scale(T, T); drawItem(ctx, t.it, 0, 0, 1); ctx.restore(); }
      else if (t.k === 'star') { const [px, py] = sp(t.x + Math.cos(t.a + clock * 6) * .35, t.y + Math.sin(t.a + clock * 6) * .12); ctx.globalAlpha = Math.min(1, t.life * 2); ctx.fillStyle = '#ffe14a'; star(ctx, px, py, T * .09); }
    }
    ctx.globalAlpha = 1;
    if (state === 'play') {
      const e = gn[cur], [px, py] = sp(e.x + e.w / 2, e.y - (e.k === 2 && e.shieldUp ? .62 : .38) - Math.abs(Math.sin(clock * 4)) * .1);
      ctx.fillStyle = '#fff4b0'; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px - T * .13, py - T * .16); ctx.lineTo(px + T * .13, py - T * .16); ctx.lineTo(px, py); ctx.closePath(); ctx.fill(); ctx.stroke();
      gn.forEach((g2, i) => {
        if (g2.dead) return;
        const [gx, gy] = sp(g2.x + g2.w / 2, g2.y + g2.h / 2), m = 18;
        if (gx > -6 && gx < W + 6 && gy > -6 && gy < H + 6) { if (g2.home) { ctx.font = `800 ${Math.round(T * .36)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#7fe08a'; const [hx, hy] = sp(g2.x + g2.w / 2, g2.y - .35); ctx.fillText('✓', hx, hy); } return; }
        const ax = clamp(gx, m, W - m), ay = clamp(gy, m, H - m - 6), ang = Math.atan2(gy - ay, gx - ax);
        ctx.save(); ctx.translate(ax, ay); ctx.fillStyle = 'rgba(10,15,10,.6)'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill();
        ctx.fillStyle = GC[i].hat[0]; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
        ctx.rotate(ang); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(11, -5); ctx.lineTo(11, 5); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = '800 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(NAMES[i].slice(0, 2), ax, ay + .5);
      });
    }
  }
