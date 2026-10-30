  /* ================= rig.js: the runner – a procedural 2D skeleton, poses, animation and a cartoon ragdoll ================= */
  // Units are tiles (the runner is 1.6 tall). Limb angles: 0 = straight down, positive = towards the facing direction.
  const OUTFITS = [
    { nm: 'Straatrenner', need: 0, hood: ['#26c2b4', '#14877d'], trim: '#e9fffb', pants: '#2b3556', shoe: ['#ffffff', '#ff7a2a'], hat: 'beanie', hatc: ['#f4b43a', '#c98418'], pom: '#fff3d6', phones: '#e8453c', skin: ['#d9a07a', '#b97f5a'] },
    { nm: 'Zonsondergang', need: 10, hood: ['#ff7466', '#cc4a40'], trim: '#ffe0a0', pants: '#3a2f4a', shoe: ['#ffe066', '#7a3ad0'], hat: 'beanie', hatc: ['#8a5ae0', '#5a34a8'], pom: '#ffd0f0', phones: '#ffffff', skin: ['#d9a07a', '#b97f5a'] },
    { nm: 'Bouwvakker', need: 25, hood: ['#ff8f1f', '#d0650a'], trim: '#f4ffb0', pants: '#3b5f99', shoe: ['#8a5a32', '#4a2c16'], hat: 'helmet', hatc: ['#ffd23a', '#d8a010'], pom: '#fff', phones: '#3a3a3a', skin: ['#d9a07a', '#b97f5a'] },
    { nm: 'Matroos', need: 45, hood: ['#f4f6fb', '#c8d0e0'], trim: '#2a5ec8', pants: '#1f2a4a', shoe: ['#ffffff', '#2a5ec8'], hat: 'cap', hatc: ['#ffffff', '#1f2a4a'], pom: '#2a5ec8', phones: '#e8453c', skin: ['#d9a07a', '#b97f5a'], stripe: '#2a5ec8' },
    { nm: 'Neon', need: 65, hood: ['#2a2440', '#171326'], trim: '#ff4fd8', pants: '#14111f', shoe: ['#5ef0ff', '#ff4fd8'], hat: 'beanie', hatc: ['#2a2440', '#171326'], pom: '#5ef0ff', phones: '#5ef0ff', skin: ['#d9a07a', '#b97f5a'], glow: 1 },
    { nm: 'Goud', need: 90, hood: ['#ffd76a', '#d8a020'], trim: '#fff6c8', pants: '#f4efe2', shoe: ['#ffe9a0', '#d8a020'], hat: 'beanie', hatc: ['#ffcc3a', '#c89010'], pom: '#ffffff', phones: '#fff6c8', skin: ['#d9a07a', '#b97f5a'] },
  ];
  const Rig = (() => {
    const TAU = Math.PI * 2;
    const LEN = { th: .46, sh: .44, ua: .3, fa: .28, torso: .52, neck: .1, head: .21 };
    const base = () => ({ lean: 0, hip: .9, t1: .08, k1: .1, t2: -.08, k2: .1, a1: .15, e1: .3, a2: -.15, e2: .3, tilt: 0, f1: 0, f2: 0 });
    const mix = (a, b, k) => { const o = {}; for (const n in a) o[n] = a[n] + (b[n] - a[n]) * k; return o; };
    // the pose of the runner for a simulation state (+ a little animation state in A)
    function pose(S, A, t) {
      const sp = Math.abs(S.st === 0 || S.st === 2 || S.st === 11 ? S.gs : S.vx);
      let P = base();
      switch (S.st) {
        case 0: case 11: {                                         // run / idle / finish
          if (sp < .4) {
            const b = Math.sin(t * 2.4) * .015;
            P = Object.assign(base(), { hip: .9 + b, a1: .12 + b, a2: -.1 - b, e1: .35, e2: .35, tilt: -b });
            if (S.st === 11) { const j = Math.abs(Math.sin(t * 7)); P = Object.assign(base(), { hip: .9 + j * .08, a1: 2.7 + Math.sin(t * 7) * .15, e1: .2, a2: -2.7 - Math.sin(t * 7) * .15, e2: .2, t1: .05, t2: -.05, tilt: -.15 }); }
          } else {
            const ph = A.ph, k = Math.min(1, sp / 9.5), spr = Math.max(0, (sp - 10) / 5);
            const amp = .45 + .55 * k + spr * .15, s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
            P.lean = .08 + .2 * k + spr * .14 - S.ga * .4;
            P.hip = .9 - .035 * Math.abs(Math.cos(ph)) * k - .03 * k;
            P.t1 = s1 * amp * .95 + .15 * k; P.t2 = s2 * amp * .95 + .15 * k;
            P.k1 = .25 + (Math.cos(ph) > 0 ? 1.4 * k * Math.max(0, -s1 + .3) : .25 * k) ; P.k2 = .25 + (Math.cos(ph + Math.PI) > 0 ? 1.4 * k * Math.max(0, -s2 + .3) : .25 * k);
            P.a1 = -s1 * (.5 + .7 * k) + .1; P.a2 = -s2 * (.5 + .7 * k) + .1; P.e1 = 1.1 + .4 * k; P.e2 = 1.1 + .4 * k;
            P.tilt = -.05 * k;
            if (S.st === 11) P.a1 = 2.4, P.a2 = 2.6, P.e1 = .2, P.e2 = .2;
          }
          if (A.land > 0) { const q = A.land; P.hip -= .22 * q; P.k1 += 1.0 * q; P.k2 += 1.0 * q; P.t1 += .5 * q; P.t2 += .3 * q; P.lean += .3 * q; P.a1 = P.a1 * (1 - q) + .9 * q; P.a2 = P.a2 * (1 - q) - .4 * q; }
          break;
        }
        case 2: {                                                  // slide (or crawl when slow)
          if (sp > 3) P = Object.assign(base(), { lean: -1.05, hip: .34, t1: 1.45, k1: .12, t2: .95, k2: 1.7, a1: .8, e1: .4, a2: -1.15, e2: .15, tilt: .55 });
          else { const c = Math.sin(A.ph * 1.4) * .25; P = Object.assign(base(), { lean: .95, hip: .5, t1: .9 + c, k1: 1.9, t2: .9 - c, k2: 1.9, a1: 1.1 - c, e1: .5, a2: 1.1 + c, e2: .5, tilt: -.6 }); }
          break;
        }
        case 1: {                                                  // in the air: jump, fall, tuck while flipping
          const up = S.vy < 0, k = Math.max(-1, Math.min(1, S.vy / 12));
          if (up) P = Object.assign(base(), { lean: .12, hip: .9, t1: .75, k1: 1.25, t2: -.3, k2: .55, a1: 2.3, e1: .35, a2: -.9, e2: .6, tilt: -.1 });
          else P = Object.assign(base(), { lean: .05, hip: .9, t1: .35 + .2 * k, k1: .5, t2: -.15, k2: .35, a1: 1.6 + .5 * k, e1: .4, a2: -1.2 - .4 * k, e2: .4, tilt: .05 });
          const tuck = Math.min(1, Math.abs(S.rv) / 6);
          if (tuck > 0) P = mix(P, { lean: .62, hip: .8, t1: 2.15, k1: 2.35, t2: 1.95, k2: 2.25, a1: 1.55, e1: .75, a2: 1.35, e2: .85, tilt: .35, f1: 0, f2: 0 }, tuck);
          break;
        }
        case 3: {                                                  // wall: run up it or slide down
          if (S.wallT > 0) { const ph = A.ph * 1.3, s = Math.sin(ph); P = Object.assign(base(), { lean: -.15, hip: .9, t1: 1.35 + s * .5, k1: 1.2 - s * .5, t2: 1.35 - s * .5, k2: 1.2 + s * .5, a1: 2.6 + s * .3, e1: .4, a2: -1.2 - s * .3, e2: .6, tilt: -.3 }); }
          else P = Object.assign(base(), { lean: -.2, hip: .88, t1: 1.0, k1: 1.5, t2: .6, k2: 1.1, a1: 2.5, e1: .5, a2: 1.9, e2: .9, tilt: -.25 });
          break;
        }
        case 4: P = Object.assign(base(), { lean: .1, hip: .92, t1: .25, k1: .5, t2: .05, k2: .25, a1: 2.95, e1: .05, a2: 2.85, e2: .1, tilt: -.2 }); break;
        case 5: { const k = Math.min(1, S.stT / 17), h = { lean: .1, hip: .92, t1: .25, k1: .5, t2: .05, k2: .25, a1: 2.95, e1: .05, a2: 2.85, e2: .1, tilt: -.2 }, c = { lean: .9, hip: .55, t1: 1.6, k1: 2.3, t2: 1.0, k2: 1.6, a1: .7, e1: .3, a2: .4, e2: .3, tilt: -.2 };
          P = Object.assign(base(), k < .55 ? mix(h, c, k / .55) : mix(c, base(), (k - .55) / .45)); break; }
        case 6: { const k = Math.min(1, S.stT / 14); P = Object.assign(base(), { lean: .9 - k * .5, hip: .8, t1: 1.5, k1: 1.4, t2: 1.2, k2: 1.7, a1: .25, e1: .1, a2: 1.6, e2: .6, tilt: -.4 }); break; }
        case 7: P = Object.assign(base(), { lean: -.05, hip: .9, t1: .55, k1: .4, t2: .35, k2: .5, a1: 3.0, e1: .1, a2: 2.9, e2: .15, tilt: -.25 }); break;
        case 8: { const w = Math.max(-1, Math.min(1, S.om / 6)); P = Object.assign(base(), { lean: 0, hip: .9, t1: .15 + w * .5, k1: .2 + Math.max(0, -w) * .9, t2: .1 + w * .4, k2: .15 + Math.max(0, -w) * .8, a1: 3.05, e1: .05, a2: 3.0, e2: .05, tilt: .1 }); break; }
        default: break;
      }
      return P;
    }
    // joints in world units: J = { hip, neck, head, k1, f1, k2, f2, s, e1, h1, e2, h2 } (each [x, y])
    function joints(P, x, y, face, rot, J = {}) {
      const d = face, cx = x, cy = y - .85, cr = Math.cos(rot), sr = Math.sin(rot);
      const tf = (lx, ly) => { const X = lx * d, Y = ly - (-.85); /* relative to the centre */ const ry = ly + .85; return [cx + X * cr - (ly + .85) * sr, cy + X * sr + (ly + .85) * cr]; };
      const hip = [0, -P.hip];
      const neck = [hip[0] + Math.sin(P.lean) * LEN.torso, hip[1] - Math.cos(P.lean) * LEN.torso];
      const head = [neck[0] + Math.sin(P.lean + P.tilt) * (LEN.neck + LEN.head * .9), neck[1] - Math.cos(P.lean + P.tilt) * (LEN.neck + LEN.head * .9)];
      const sh = [neck[0] - Math.sin(P.lean) * .04, neck[1] + Math.cos(P.lean) * .04];
      const limb = (o, a, l) => [o[0] + Math.sin(a) * l, o[1] + Math.cos(a) * l];
      const k1 = limb(hip, P.t1, LEN.th), f1 = limb(k1, P.t1 - P.k1, LEN.sh), k2 = limb(hip, P.t2, LEN.th), f2 = limb(k2, P.t2 - P.k2, LEN.sh);
      const e1 = limb(sh, P.a1, LEN.ua), h1 = limb(e1, P.a1 + P.e1, LEN.fa), e2 = limb(sh, P.a2, LEN.ua), h2 = limb(e2, P.a2 + P.e2, LEN.fa);
      const all = { hip, neck, head, s: sh, k1, f1, k2, f2, e1, h1, e2, h2 };
      for (const k in all) J[k] = tf(all[k][0], all[k][1]);
      J.face = face; J.rot = rot; J.lean = P.lean * face + rot; J.tilt = (P.lean + P.tilt) * face + rot; J.ft1 = (P.t1 - P.k1) * face; J.ft2 = (P.t2 - P.k2) * face;
      return J;
    }
    /* ---------- drawing (g is scaled to world units) ---------- */
    function cap(g, a, b, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    function cap3(g, a, b, c, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.stroke(); }
    function shoe(g, f, k, face, O, dark) {
      const a = Math.atan2(f[1] - k[1], f[0] - k[0]) - Math.PI / 2;
      g.save(); g.translate(f[0], f[1]); g.rotate(a);
      g.fillStyle = dark ? O.shoe[1] : O.shoe[1]; g.beginPath(); g.ellipse(face * .06, .045, .15, .055, 0, 0, TAU); g.fill();
      g.fillStyle = dark ? shade(O.shoe[0], .8) : O.shoe[0]; g.beginPath(); g.ellipse(face * .05, 0, .13, .065, 0, 0, TAU); g.fill();
      g.restore();
    }
    const SH = {};
    function shade(c, k) { const key = c + k; if (SH[key]) return SH[key]; const n = parseInt(c.slice(1), 16); const r = Math.round(((n >> 16) & 255) * k), gg = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k); return (SH[key] = `rgb(${Math.min(255, r)},${Math.min(255, gg)},${Math.min(255, b)})`); }
    let LOW = false;
    function draw(g, J, O, alpha = 1, ghost = false, low = false) {
      LOW = low || ghost;
      g.save(); if (alpha < 1) g.globalAlpha = alpha;
      g.lineCap = 'round'; g.lineJoin = 'round';
      const f = J.face, gh = ghost;
      const C = gh ? { hood: ['#cfe6ff', '#9ec2ec'], trim: '#ffffff', pants: '#8aa6d0', shoe: ['#ffffff', '#cfe0ff'], hatc: ['#e6f2ff', '#b8d2f0'], pom: '#fff', phones: '#e6f2ff', skin: ['#e8f2ff', '#bcd2ee'], hat: O.hat } : O;
      // back limbs
      cap3(g, J.hip, J.k2, J.f2, .17, shade(C.pants, .78)); shoe(g, J.f2, J.k2, f, C, 1);
      cap3(g, J.s, J.e2, J.h2, .13, C.hood[1]);
      g.fillStyle = C.skin[1]; g.beginPath(); g.arc(J.h2[0], J.h2[1], .065, 0, TAU); g.fill();
      // torso (hoodie)
      const nx = J.neck[0] - J.hip[0], ny = J.neck[1] - J.hip[1], ln = Math.hypot(nx, ny) || 1, px = -ny / ln, py = nx / ln;
      g.fillStyle = C.hood[0];
      g.beginPath();
      g.moveTo(J.hip[0] + px * .15, J.hip[1] + py * .15);
      g.quadraticCurveTo(J.hip[0] + nx * .5 + px * .2, J.hip[1] + ny * .5 + py * .2, J.neck[0] + px * .14, J.neck[1] + py * .14);
      g.lineTo(J.neck[0] - px * .14, J.neck[1] - py * .14);
      g.quadraticCurveTo(J.hip[0] + nx * .5 - px * .2, J.hip[1] + ny * .5 - py * .2, J.hip[0] - px * .15, J.hip[1] - py * .15);
      g.closePath(); g.fill();
      // belly shade + hood on the back + a stripe
      const bx = -f * px, by = -f * py;
      if (!LOW) { g.fillStyle = C.hood[1]; g.beginPath(); g.ellipse(J.neck[0] - bx * .1 - nx * .08, J.neck[1] - by * .1 - ny * .08, .11, .08, Math.atan2(ny, nx), 0, TAU); g.fill(); }
      g.strokeStyle = C.trim; g.lineWidth = .045; g.beginPath(); g.moveTo(J.hip[0] + nx * .25 + bx * .15, J.hip[1] + ny * .25 + by * .15); g.lineTo(J.hip[0] + nx * .75 + bx * .15, J.hip[1] + ny * .75 + by * .15); g.stroke();
      if (C.stripe && !gh) { g.strokeStyle = C.stripe; g.lineWidth = .04; g.beginPath(); for (const k of [.3, .55, .8]) { g.moveTo(J.hip[0] + nx * k + px * .15, J.hip[1] + ny * k + py * .15); g.lineTo(J.hip[0] + nx * k - px * .15, J.hip[1] + ny * k - py * .15); } g.stroke(); }
      g.fillStyle = C.hood[1]; g.beginPath(); g.ellipse(J.hip[0], J.hip[1], .15, .07, Math.atan2(ny, nx) + Math.PI / 2, 0, TAU); g.fill();
      // front leg
      cap3(g, J.hip, J.k1, J.f1, .18, C.pants); shoe(g, J.f1, J.k1, f, C, 0);
      // head
      head(g, J, C, gh);
      // front arm
      cap3(g, J.s, J.e1, J.h1, .135, C.hood[0]);
      g.fillStyle = C.trim; g.beginPath(); g.arc(J.e1[0] + (J.h1[0] - J.e1[0]) * .72, J.e1[1] + (J.h1[1] - J.e1[1]) * .72, .07, 0, TAU); g.fill();
      g.fillStyle = C.skin[0]; g.beginPath(); g.arc(J.h1[0], J.h1[1], .07, 0, TAU); g.fill();
      g.restore();
    }
    function head(g, J, C, gh) {
      const [hx, hy] = J.head, f = J.face, r = LEN.head;
      g.save(); g.translate(hx, hy); g.rotate(J.tilt); g.scale(f, 1);
      // neck
      g.fillStyle = C.skin[1]; g.fillRect(-.05, .1, .1, .12);
      // face
      g.fillStyle = C.skin[0]; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(r * .92, r * .12, .045, .05, 0, 0, TAU); g.fill();                 // nose
      if (!gh) {
        g.fillStyle = '#2a1a14'; g.beginPath(); g.ellipse(r * .52, -r * .08, .028, .038, 0, 0, TAU); g.fill();
        if (!LOW) {
          g.fillStyle = '#fff'; g.beginPath(); g.arc(r * .55, -r * .13, .01, 0, TAU); g.fill();
          g.strokeStyle = '#7a3a2a'; g.lineWidth = .022; g.beginPath(); g.arc(r * .5, r * .3, .06, .2, 1.4); g.stroke();
          g.fillStyle = 'rgba(255,120,110,.35)'; g.beginPath(); g.arc(r * .35, r * .32, .045, 0, TAU); g.fill();
        }
      }
      // hat
      if (C.hat === 'helmet') {
        g.fillStyle = C.hatc[0]; g.beginPath(); g.ellipse(-r * .05, -r * .25, r * 1.08, r * .95, 0, Math.PI, 0); g.fill();
        g.fillRect(-r * 1.15, -r * .3, r * 2.45, r * .2);
        g.fillStyle = C.hatc[1]; g.fillRect(-r * .15, -r * 1.15, r * .25, r * .9);
      } else if (C.hat === 'cap') {
        g.fillStyle = C.hatc[0]; g.beginPath(); g.ellipse(-r * .05, -r * .3, r * 1.0, r * .82, 0, Math.PI, 0); g.fill();
        g.fillStyle = C.hatc[1]; g.beginPath(); g.ellipse(r * .75, -r * .32, r * .65, r * .14, -.05, 0, TAU); g.fill();
        g.fillRect(-r * 1.02, -r * .42, r * 1.9, r * .14);
      } else {
        g.fillStyle = C.hatc[0]; g.beginPath(); g.ellipse(-r * .1, -r * .32, r * 1.04, r * .98, 0, Math.PI * .98, Math.PI * 2.02); g.fill();
        g.fillStyle = C.hatc[1]; g.beginPath(); g.roundRect ? g.roundRect(-r * 1.12, -r * .5, r * 2.1, r * .34, r * .12) : g.rect(-r * 1.12, -r * .5, r * 2.1, r * .34); g.fill();
        if (!LOW) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = .015; g.beginPath(); for (let i = -3; i <= 3; i++) { g.moveTo(i * r * .25, -r * .52); g.lineTo(i * r * .25, -r * .2); } g.stroke(); }
        g.fillStyle = C.pom; g.beginPath(); g.arc(-r * .3, -r * 1.32, r * .3, 0, TAU); g.fill();
      }
      // headphones: band over the top and a cup on the ear
      g.strokeStyle = C.phones; g.lineWidth = .05; g.beginPath(); g.arc(-r * .05, -r * .1, r * 1.12, Math.PI * 1.08, Math.PI * 1.98); g.stroke();
      g.fillStyle = gh ? C.phones : shade(C.phones, .7); g.beginPath(); g.ellipse(-r * .2, r * .02, r * .36, r * .42, 0, 0, TAU); g.fill();
      g.fillStyle = C.phones; g.beginPath(); g.ellipse(-r * .14, r * .02, r * .27, r * .34, 0, 0, TAU); g.fill();
      if (C.glow && !gh) { g.strokeStyle = 'rgba(94,240,255,.8)'; g.lineWidth = .02; g.beginPath(); g.ellipse(-r * .14, r * .02, r * .2, r * .26, 0, 0, TAU); g.stroke(); }
      g.restore();
    }
    /* ---------- the ragdoll (visual only): verlet points + sticks, bumping into the level ---------- */
    const RD_P = ['hip', 'neck', 'head', 'k1', 'f1', 'k2', 'f2', 'e1', 'h1', 'e2', 'h2'];
    const RD_S = [['hip', 'neck'], ['neck', 'head'], ['hip', 'k1'], ['k1', 'f1'], ['hip', 'k2'], ['k2', 'f2'], ['neck', 'e1'], ['e1', 'h1'], ['neck', 'e2'], ['e2', 'h2'], ['head', 'hip', .9], ['k1', 'k2', .5], ['f1', 'neck', .4], ['f2', 'neck', .4], ['h1', 'hip', .3], ['h2', 'hip', .3]];
    function ragdoll(J, vx, vy, spin) {
      const R = { p: {}, s: [], t: 0 };
      for (const k of RD_P) { const [x, y] = J[k]; const ox = (y - J.hip[1]) * spin * (1 / 60), oy = -(x - J.hip[0]) * spin * (1 / 60); R.p[k] = { x, y, px: x - vx / 60 - ox, py: y - vy / 60 - oy }; }
      for (const [a, b, st] of RD_S) R.s.push([a, b, Math.hypot(R.p[a].x - R.p[b].x, R.p[a].y - R.p[b].y), st || 1]);
      R.face = J.face; return R;
    }
    function ragStep(R, solidAt, dt) {
      R.t += dt;
      for (const k in R.p) { const q = R.p[k], vx = (q.x - q.px) * .995, vy = (q.y - q.py) * .995; q.px = q.x; q.py = q.y; q.x += vx; q.y += vy + 34 * dt * dt; }
      for (let it = 0; it < 4; it++) {
        for (const [a, b, l, st] of R.s) { const A = R.p[a], B = R.p[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-6, k = (d - l) / d * .5 * st; A.x += dx * k; A.y += dy * k; B.x -= dx * k; B.y -= dy * k; }
        for (const k in R.p) {
          const q = R.p[k];
          if (solidAt(q.x, q.y)) {                                 // push out upwards (or sideways) and rub
            const ty = Math.floor(q.y);
            if (!solidAt(q.x, ty - .01)) { q.y = ty - .001; const vx = q.x - q.px; q.px = q.x - vx * .55; if (q.py < q.y) q.py = q.y + (q.y - q.py) * .3; }
            else if (!solidAt(q.px, q.y)) { q.x = q.px; }
            else { q.x = q.px; q.y = q.py; }
          }
        }
      }
    }
    function ragJoints(R, J = {}) {
      for (const k of RD_P) J[k] = [R.p[k].x, R.p[k].y];
      J.s = [J.neck[0] + (J.hip[0] - J.neck[0]) * .07, J.neck[1] + (J.hip[1] - J.neck[1]) * .07];
      J.face = R.face; const a = Math.atan2(J.neck[0] - J.hip[0], -(J.neck[1] - J.hip[1])); J.rot = a; J.lean = a; J.tilt = Math.atan2(J.head[0] - J.neck[0], -(J.head[1] - J.neck[1]));
      return J;
    }
    return { pose, joints, draw, ragdoll, ragStep, ragJoints, base, mix, shade };
  })();
