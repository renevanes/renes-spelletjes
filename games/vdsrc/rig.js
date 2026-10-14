  /* ================= rig.js: the fighters' 2D skeleton, their looks, poses and animations =================
     A pose is a handful of angles (degrees; limbs: 0 = hanging down, + = towards where the fighter faces; torso and
     head: 0 = upright, + = leaning forward). Forward kinematics turns it into joint positions; grounded poses plant
     their feet with a little two-bone IK. Every body part is a Path2D built once per fighter and palette, drawn with a
     cached "cylinder" gradient through one setTransform: cheap enough for two fighters at 60 fps. */
  function RigFactory() {
    const DEG = Math.PI / 180, TAU96 = Math.PI * 2 / 96;
    const NF = 16;   // numeric pose fields
    const QA = { a: 4, x: 1.5, steps: 0 };   // sprite-cache quantisation (coarser on slow phones: fewer distinct poses to paint)
    const FI = { x: 0, y: 1, t: 2, n: 3, a1: 4, b1: 5, a2: 6, b2: 7, l1: 8, k1: 9, l2: 10, k2: 11, f1: 12, f2: 13, r: 14, lift: 15 };
    // ---------- colours ----------
    const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
    const shade = (h, k) => { const c = hex(h); return rgb(c.map(v => k >= 0 ? v + (255 - v) * k : v * (1 + k))); };
    const OUT = '#1d1424';

    /* ---------- the cast's looks (two palettes each: the second one is for mirror matches) ---------- */
    const LOOK = {
      dex: { th: 42, sh: 41, ua: 30, fa: 27, to: 56, hr: 19, nk: 7, thW: 11.5, shW: 8.5, uaW: 8.6, faW: 7.4, fist: 11, chest: 23, waist: 16.5, hipW: 18, foot: 23,
        skin: '#a86a45', hair: '#17110f', top: 'tank', bottom: 'shorts', hairStyle: 'fade', gloves: 1, headband: 1, wraps: 1, cheek: 0,
        pal: [{ top: '#17a39c', trim: '#ff7a1a', bot: '#222634', bot2: '#ff7a1a', glove: '#ff7a1a', band: '#ff7a1a', wrap: '#f1efe8' },
              { top: '#22252e', trim: '#2f86f6', bot: '#2f86f6', bot2: '#ffffff', glove: '#2f86f6', band: '#ffd23a', wrap: '#d9dde6' }] },
      truus: { th: 33, sh: 32, ua: 25, fa: 23, to: 49, hr: 21, nk: 5, thW: 11, shW: 8.5, uaW: 8, faW: 7, fist: 8.5, chest: 21, waist: 19, hipW: 19, foot: 20,
        skin: '#f4cdb0', hair: '#d4d4de', top: 'gi', bottom: 'gi', hairStyle: 'bun', glasses: 1, cheek: 1, wrinkles: 1,
        pal: [{ top: '#fbfaf6', trim: '#e9e6dd', bot: '#fbfaf6', belt: '#1b1b1f', glasses: '#7a3fb0' },
              { top: '#2e5fd0', trim: '#244c9e', bot: '#2e5fd0', belt: '#1b1b1f', glasses: '#d0283a' }] },
      moer: { th: 41, sh: 41, ua: 30, fa: 29, to: 58, hr: 19, nk: 8, thW: 12, shW: 10, uaW: 9.5, faW: 9, fist: 12.5, chest: 26, waist: 18, hipW: 20, foot: 26,
        skin: '#9fb2c6', hair: '#3d4a5c', top: 'robot', bottom: 'robot', hairStyle: 'robot', robot: 1, cheek: 0,
        pal: [{ top: '#a9bccf', trim: '#ff8a2a', bot: '#7d90a6', joint: '#3d4a5c', visor: '#0e2030', led: '#5ff6ff' },
              { top: '#e2b93c', trim: '#c4262f', bot: '#b38a22', joint: '#4a3a24', visor: '#2a0e10', led: '#ff6a5a' }] },
      sol: { th: 45, sh: 45, ua: 29, fa: 26, to: 55, hr: 18.5, nk: 7, thW: 11, shW: 8, uaW: 7.6, faW: 6.6, fist: 9, chest: 20, waist: 14.5, hipW: 17, foot: 22,
        skin: '#7a4a33', hair: '#2a1a12', top: 'crop', bottom: 'abada', hairStyle: 'puff', cheek: 0, fem: 1,
        pal: [{ top: '#ffd23a', trim: '#1f9a4a', bot: '#fbfaf6', cord: '#1f9a4a', band: '#1f9a4a' },
              { top: '#ff5fa2', trim: '#7a2fd0', bot: '#3a2a5a', cord: '#ffd23a', band: '#7a2fd0' }] },
      bram: { th: 38, sh: 36, ua: 30, fa: 27, to: 56, hr: 20, nk: 4, thW: 17, shW: 13, uaW: 11, faW: 9.5, fist: 12, chest: 32, waist: 34, hipW: 30, foot: 24,
        skin: '#f0c39a', hair: '#141016', top: 'bare', bottom: 'mawashi', hairStyle: 'topknot', cheek: 1, belly: 1,
        pal: [{ bot: '#26346a', bot2: '#3c4f96', tassel: '#26346a' }, { bot: '#b8242c', bot2: '#e0454c', tassel: '#b8242c' }] },
      kiki: { th: 40, sh: 39, ua: 27, fa: 25, to: 51, hr: 18, nk: 6, thW: 10, shW: 7.6, uaW: 7, faW: 6.4, fist: 8.5, chest: 18, waist: 14, hipW: 16, foot: 21,
        skin: '#f2c8a6', hair: '#141018', top: 'ninja', bottom: 'ninja', hairStyle: 'ponytail', mask: 1, scarf: 1, fem: 1,
        pal: [{ top: '#3d2d6a', trim: '#6a52b8', bot: '#33265a', scarf: '#ee3a44', wrap: '#d9d3ea', mask: '#3d2d6a' },
              { top: '#0f5e5a', trim: '#2cb3a4', bot: '#0c4a47', scarf: '#ffcf2e', wrap: '#d6efe9', mask: '#0f5e5a' }] },
      sjaak: { th: 40, sh: 39, ua: 31, fa: 29, to: 62, hr: 19, nk: 6, thW: 13, shW: 10, uaW: 13, faW: 11, fist: 12.5, chest: 32, waist: 19, hipW: 21, foot: 25,
        skin: '#f3c39e', hair: '#1c1412', top: 'singlet', bottom: 'tights', hairStyle: 'bald', mustache: 1, cheek: 1,
        pal: [{ top: '#e2262f', trim: '#fbfaf6', bot: '#1d1d24', band: '#7a4a24', shoe: '#6b4122' },
              { top: '#2f6fe0', trim: '#fbfaf6', bot: '#2a2a2a', band: '#3a3a3a', shoe: '#2a2a2a' }] },
      nevel: { th: 44, sh: 44, ua: 31, fa: 29, to: 60, hr: 18, nk: 7, thW: 11, shW: 8.6, uaW: 8.4, faW: 7.6, fist: 9.5, chest: 22, waist: 16, hipW: 18, foot: 24,
        skin: '#e9e4f2', hair: '#1a1024', top: 'coat', bottom: 'pants', hairStyle: 'hat', masked: 1, cape: 1,
        pal: [{ top: '#33204f', trim: '#e2b23a', bot: '#1d1430', glove: '#f4f1fa', cape: '#5a2a8a', capeIn: '#1a0f2a', eye: '#c46bff', hat: '#140c1e' },
              { top: '#5a1a24', trim: '#c9c9d6', bot: '#2a0e14', glove: '#1b1b1f', cape: '#a8202c', capeIn: '#2a0a0e', eye: '#ffb02e', hat: '#1b0a0e' }] },
    };

    /* ---------- poses ---------- */
    const BASE = { x: 0, y: 0, t: 6, n: 2, a1: 40, b1: 132, a2: 18, b2: 150, l1: 20, k1: 2, l2: -24, k2: -14, f1: 0, f2: -6, r: 0, lift: 0, e: 0, h1: 0, h2: 0, g: 1, hide: 0 };
    function P(o) { const p = new Float32Array(NF); for (const k in FI) p[FI[k]] = o[k] != null ? o[k] : BASE[k]; p.e = o.e || 0; p.h1 = o.h1 || 0; p.h2 = o.h2 || 0; p.g = o.g == null ? 1 : o.g; p.hide = o.hide || 0; return p; }
    const Q = o => P(Object.assign({}, BASE, o));
    const POSE = {
      guard: Q({}),
      crouch: Q({ t: 14, a1: 46, b1: 128, a2: 26, b2: 146, l1: 70, k1: -28, l2: 34, k2: -70, f2: -4, y: 0 }),
      cguard: Q({ t: 10, n: -2, a1: 70, b1: 150, a2: 50, b2: 165, l1: 70, k1: -28, l2: 34, k2: -70, f2: -4 }),
      sguard: Q({ t: -2, n: -6, a1: 62, b1: 158, a2: 44, b2: 170, l1: 16, k1: 4, l2: -22, k2: -16 }),
      jumpsq: Q({ t: 16, l1: 52, k1: -24, l2: 10, k2: -56, a1: 30, b1: 110, a2: 10, b2: 120 }),
      jumpUp: Q({ t: 4, l1: 30, k1: -30, l2: -6, k2: -60, a1: 60, b1: 150, a2: 40, b2: 160, f1: -20, f2: -30, g: 0 }),
      tuck: Q({ t: 30, n: 10, l1: 100, k1: -10, l2: 80, k2: -30, a1: 70, b1: 140, a2: 50, b2: 150, f1: -20, f2: -20, g: 0 }),
      fallJ: Q({ t: 2, l1: 24, k1: -6, l2: -14, k2: -40, a1: 50, b1: 140, a2: 28, b2: 150, f1: -10, f2: -20, g: 0 }),
      land: Q({ t: 18, l1: 48, k1: -22, l2: 8, k2: -52, a1: 44, b1: 120, a2: 20, b2: 130 }),
      dashF: Q({ t: 28, n: -6, l1: 50, k1: 10, l2: -40, k2: -60, a1: 30, b1: 110, a2: -10, b2: 100, f2: -30 }),
      dashB: Q({ t: -12, n: -4, l1: 30, k1: -20, l2: -36, k2: -10, a1: 56, b1: 150, a2: 36, b2: 160 }),
      // standing normals: wind-up and hit poses
      sLPw: Q({ t: 4, a1: 30, b1: 100, a2: 20, b2: 150 }),
      sLP: Q({ t: 12, a1: 86, b1: 90, a2: 14, b2: 150, l1: 24, l2: -26, e: 1 }),
      sHPw: Q({ t: -6, a1: 50, b1: 140, a2: -40, b2: 60, l2: -30 }),
      sHP: Q({ t: 22, n: -8, a1: 20, b1: 120, a2: 88, b2: 90, l1: 28, k1: 0, l2: -30, k2: -20, f2: -30, e: 1 }),
      sLKw: Q({ t: -4, l1: 70, k1: -40, a1: 50, b1: 140 }),
      sLK: Q({ t: -10, l1: 82, k1: 78, f1: 30, a1: 60, b1: 150, a2: 10, b2: 140, lift: 1, e: 1 }),
      sHKw: Q({ t: -6, l2: 50, k2: -70, l1: 16, k1: 2, a1: 60, b1: 150, a2: -20, b2: 90, lift: 2 }),
      sHK: Q({ t: -28, n: 12, l2: 118, k2: 112, f2: 30, l1: 8, k1: -4, a1: 30, b1: 120, a2: -30, b2: 60, lift: 2, e: 1 }),
      cLPw: Q({ t: 14, a1: 40, b1: 110, a2: 26, b2: 146, l1: 70, k1: -28, l2: 34, k2: -70 }),
      cLP: Q({ t: 18, a1: 84, b1: 88, a2: 26, b2: 146, l1: 70, k1: -28, l2: 34, k2: -70, e: 1 }),
      cHPw: Q({ t: 10, a1: 44, b1: 120, a2: -10, b2: 30, l1: 70, k1: -28, l2: 34, k2: -70 }),
      cHP: Q({ t: 4, n: -16, a1: 30, b1: 110, a2: 150, b2: 172, l1: 52, k1: -10, l2: 10, k2: -50, e: 1 }),
      cLKw: Q({ t: 12, l1: 60, k1: -10, l2: 34, k2: -70, a1: 46, b1: 128, a2: 26, b2: 146 }),
      cLK: Q({ t: 6, l1: 88, k1: 86, f1: 10, l2: 30, k2: -76, a1: 50, b1: 128, a2: 30, b2: 146, lift: 1, e: 1 }),
      cHKw: Q({ t: 20, l1: 70, k1: -28, l2: 40, k2: -80, a1: 40, b1: 120, a2: 20, b2: 120 }),
      cHK: Q({ t: 34, n: -10, l2: 84, k2: 92, f2: 10, l1: 64, k1: -50, a1: 20, b1: 60, a2: 50, b2: 30, lift: 2, y: -26, e: 1 }),
      jLP: Q({ t: 20, a1: 84, b1: 84, a2: 30, b2: 150, l1: 70, k1: -20, l2: 40, k2: -50, g: 0, e: 1 }),
      jHP: Q({ t: 34, n: -6, a1: 30, b1: 110, a2: 100, b2: 100, l1: 60, k1: -10, l2: 20, k2: -40, g: 0, e: 1 }),
      jLK: Q({ t: 4, l1: 96, k1: 60, f1: 30, l2: 30, k2: -40, a1: 60, b1: 150, a2: 30, b2: 150, g: 0, e: 1 }),
      jHK: Q({ t: -8, l1: 50, k1: -20, l2: 64, k2: 70, f2: 40, a1: 60, b1: 160, a2: -20, b2: 60, g: 0, e: 1 }),
      // getting hit, blocking
      hitHi: Q({ t: -24, n: -22, a1: 10, b1: 70, a2: -10, b2: 60, l1: 26, k1: 8, l2: -16, k2: -20, e: 2, x: -6 }),
      hitBody: Q({ t: 34, n: 18, a1: 30, b1: 90, a2: 10, b2: 80, l1: 22, k1: -4, l2: -20, k2: -18, e: 2, x: -8 }),
      hitLo: Q({ t: 30, n: 20, a1: 20, b1: 70, a2: 0, b2: 60, l1: 70, k1: -30, l2: 34, k2: -72, e: 2, x: -6 }),
      block: Q({ t: -4, n: -8, a1: 64, b1: 168, a2: 46, b2: 176, l1: 14, k1: 6, l2: -26, k2: -14, x: -3 }),
      cblock: Q({ t: 8, n: -6, a1: 72, b1: 168, a2: 54, b2: 176, l1: 70, k1: -28, l2: 34, k2: -70, x: -3 }),
      fall: Q({ t: -40, n: -30, a1: -60, b1: -20, a2: -80, b2: -40, l1: 50, k1: 30, l2: 20, k2: 10, e: 2, g: 0 }),
      down: Q({ r: -90, t: 0, n: -6, a1: 150, b1: 170, a2: 130, b2: 100, l1: 10, k1: -10, l2: 30, k2: 0, f1: 70, f2: 70, e: 3, g: 2 }),
      sit: Q({ t: -10, n: -14, a1: 20, b1: 40, a2: -20, b2: 20, l1: 90, k1: 30, l2: 80, k2: -20, f1: 50, f2: 10, e: 3, g: 2, y: 0 }),
      getup: Q({ t: 40, n: 0, a1: 80, b1: 60, a2: 40, b2: 30, l1: 80, k1: -40, l2: 20, k2: -80 }),
      dizzy: Q({ t: -10, n: -16, a1: 10, b1: 30, a2: -6, b2: 20, l1: 12, k1: 4, l2: -14, k2: -10, e: 3 }),
      tired: Q({ t: 40, n: 20, a1: 40, b1: 20, a2: 30, b2: 10, l1: 24, k1: -10, l2: -10, k2: -20, e: 2 }),
      held: Q({ t: -10, n: -20, a1: 120, b1: 160, a2: 100, b2: 140, l1: 30, k1: 10, l2: -10, k2: -20, e: 2, g: 0 }),
      // throws and specials
      grab: Q({ t: 22, a1: 80, b1: 92, a2: 70, b2: 96, h1: 1, h2: 1, l1: 30, k1: 0, l2: -30, k2: -20, e: 1 }),
      grabW: Q({ t: 10, a1: 60, b1: 120, a2: 50, b2: 120, h1: 1, h2: 1 }),
      toss: Q({ t: -24, n: -10, a1: 150, b1: 170, a2: 130, b2: 160, h1: 1, h2: 1, l1: 20, k1: 6, l2: -26, k2: -16, e: 1 }),
      pjPw: Q({ t: -10, a1: -20, b1: 60, a2: -40, b2: 50, l1: 26, l2: -30, k2: -20 }),
      pjP: Q({ t: 18, n: -4, a1: 88, b1: 88, a2: 84, b2: 86, h1: 1, h2: 1, l1: 34, k1: 4, l2: -30, k2: -22, e: 1 }),
      pjKw: Q({ t: 10, l1: 70, k1: -60, a1: 60, b1: 150, a2: 20, b2: 120, lift: 1 }),
      pjK: Q({ t: -16, l1: 96, k1: 96, f1: 20, a1: 50, b1: 120, a2: -20, b2: 60, lift: 1, e: 1 }),
      riseK: Q({ t: 4, n: -16, l1: 120, k1: 10, l2: -10, k2: -20, a1: 170, b1: 176, a2: 30, b2: 100, g: 0, e: 1 }),
      rushP: Q({ t: 30, n: -12, a1: 30, b1: 100, a2: 92, b2: 92, l1: 50, k1: 20, l2: -40, k2: -50, f2: -30, e: 1 }),
      spin: Q({ t: 70, n: 20, a1: 160, b1: 170, a2: 150, b2: 160, l1: 110, k1: 104, l2: -60, k2: -90, e: 1, lift: 3 }),
      flip: Q({ t: -20, n: -20, l1: 160, k1: 170, l2: 40, k2: 10, a1: -30, b1: -10, a2: -40, b2: -20, g: 0, e: 1 }),
      slide: Q({ t: -40, n: 10, l1: 86, k1: 88, l2: 60, k2: 0, a1: -40, b1: -10, a2: -50, b2: -20, y: -48, g: 0, f1: 30, e: 1 }),
      slapA: Q({ t: 16, a1: 92, b1: 96, a2: 30, b2: 120, h1: 1, h2: 1, l1: 34, k1: 0, l2: -34, k2: -20, e: 1 }),
      slapB: Q({ t: 16, a1: 40, b1: 120, a2: 94, b2: 98, h1: 1, h2: 1, l1: 34, k1: 0, l2: -34, k2: -20, e: 1 }),
      belly: Q({ r: -64, t: 0, n: -30, a1: 40, b1: 70, a2: 20, b2: 50, l1: -10, k1: -20, l2: -30, k2: -40, g: 0, e: 1 }),
      pound: Q({ t: 50, n: 10, a1: 70, b1: 10, a2: 60, b2: 4, l1: 46, k1: -18, l2: -10, k2: -50, e: 1 }),
      poundW: Q({ t: -14, n: -10, a1: 170, b1: 176, a2: 160, b2: 170, l1: 20, k1: 2, l2: -24, k2: -14 }),
      lariat: Q({ t: 14, a1: 90, b1: 92, a2: -60, b2: -40, h1: 1, l1: 30, k1: 0, l2: -30, k2: -20, e: 1 }),
      catch: Q({ t: -14, n: -24, a1: 160, b1: 170, a2: 150, b2: 168, h1: 2, h2: 2, l1: 22, k1: 4, l2: -24, k2: -14, e: 1 }),
      counter: Q({ t: -2, n: -4, a1: 70, b1: 120, a2: 60, b2: 110, h1: 1, h2: 1, l1: 30, k1: -12, l2: -30, k2: -30 }),
      tele: Q({ t: 30, a1: 30, b1: 150, a2: 20, b2: 160, l1: 70, k1: -28, l2: 34, k2: -70 }),
      dive: Q({ r: 40, t: 10, l1: 100, k1: 100, f1: 30, l2: 40, k2: -30, a1: -30, b1: 0, a2: -50, b2: -10, g: 0, e: 1 }),
      wheel: Q({ t: 0, a1: 170, b1: 180, a2: 160, b2: 180, h1: 1, h2: 1, l1: 60, k1: 60, l2: -60, k2: -60, g: 0, e: 1 }),
      dash: Q({ t: 40, n: -10, a1: -20, b1: 10, a2: -40, b2: 0, h1: 1, h2: 1, l1: 60, k1: 30, l2: -50, k2: -70, f2: -40, e: 1, y: -10 }),
      suA: Q({ t: -20, n: 6, l1: 112, k1: 108, f1: 20, l2: 4, k2: -6, a1: 40, b1: 140, a2: -20, b2: 70, lift: 1, e: 1 }),
      suB: Q({ t: -24, n: 10, l2: 120, k2: 116, f2: 24, l1: 10, k1: 0, a1: 20, b1: 110, a2: -30, b2: 50, lift: 2, e: 1 }),
      suUp: Q({ t: 6, n: -20, a1: 20, b1: 100, a2: 172, b2: 178, l1: 30, k1: 6, l2: -10, k2: -30, e: 1 }),
      flex: Q({ t: -4, n: -10, a1: 96, b1: 172, a2: 100, b2: 176, l1: 16, k1: 4, l2: -18, k2: -10, e: 4 }),
      bow: Q({ t: 44, n: 10, a1: -6, b1: -4, a2: -10, b2: -6, h1: 1, h2: 1, l1: 6, k1: 4, l2: -6, k2: -6, e: 4 }),
      armsUp: Q({ t: -6, n: -16, a1: 160, b1: 172, a2: 150, b2: 168, l1: 14, k1: 4, l2: -16, k2: -10, e: 4 }),
      fistUp: Q({ t: -2, n: -14, a1: 20, b1: 120, a2: 168, b2: 176, l1: 16, k1: 4, l2: -18, k2: -10, e: 4 }),
      shiko: Q({ t: 6, a1: 30, b1: 20, a2: 20, b2: 10, h1: 1, h2: 1, l1: 110, k1: 40, l2: -30, k2: -40, lift: 1, e: 4 }),
      crossed: Q({ t: -4, n: -8, a1: 74, b1: -84, a2: 64, b2: -80, h1: 1, h2: 1, l1: 12, k1: 4, l2: -14, k2: -8, e: 4 }),
      spread: Q({ t: -6, n: -10, a1: 110, b1: 120, a2: -70, b2: -60, h1: 1, h2: 1, l1: 18, k1: 4, l2: -20, k2: -10, e: 4 }),
      ginga: Q({ t: 10, a1: 70, b1: 120, a2: -30, b2: 40, l1: 24, k1: -10, l2: -46, k2: -50, f2: -10, e: 4 }),
      bootA: Q({ t: 30, n: 40, a1: -10, b1: -6, a2: -14, b2: -8, l1: 6, k1: 2, l2: -6, k2: -4, e: 3 }),
    };
    const pose = (k) => POSE[k] || POSE.guard;

    /* ---------- animations: which pose for which state at which frame ---------- */
    const ease = u => u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u), easeOut = u => u < 0 ? 0 : u > 1 ? 1 : 1 - (1 - u) * (1 - u);
    const OUTP = P({}), TMP = P({}), TMP2 = P({});
    function lerpInto(o, a, b, u) { for (let i = 0; i < NF; i++) o[i] = a[i] + (b[i] - a[i]) * u; const k = u < .5 ? a : b; o.e = k.e; o.h1 = k.h1; o.h2 = k.h2; o.g = u < .5 ? a.g : b.g; o.hide = k.hide; return o; }
    function copy(o, a) { for (let i = 0; i < NF; i++) o[i] = a[i]; o.e = a.e; o.h1 = a.h1; o.h2 = a.h2; o.g = a.g; o.hide = a.hide; return o; }
    // keyframe list [[frame, pose, easing?], ...] sampled at frame t
    function keys(o, list, t) {
      if (t <= list[0][0]) return copy(o, list[0][1]);
      for (let i = 1; i < list.length; i++) if (t <= list[i][0]) { const [f0, p0] = list[i - 1], [f1, p1, ez] = list[i]; let u = (ez || ease)((t - f0) / Math.max(1, f1 - f0)); if (QA.steps) u = Math.round(u * QA.steps) / QA.steps; return lerpInto(o, p0, p1, u); }
      return copy(o, list[list.length - 1][1]);
    }
    const ANIM_CACHE = new Map();
    // a normal / special timeline built from its frame data: rest -> wind-up -> hit (held while active) -> back to rest
    function strikeKeys(m, w, h, rest) {
      const k = m.id + ':' + (m.hits[0] ? m.hits[0].f : 0) + ':' + m.tot + ':' + w + h + rest;
      let L = ANIM_CACHE.get(k); if (L) return L;
      const h0 = m.hits[0] || { f: 6, n: 4 }, s = h0.f, end = m.hits.length ? m.hits[m.hits.length - 1].f + m.hits[m.hits.length - 1].n : s + 4;
      L = [[0, pose(rest)], [Math.max(1, Math.round(s * .55)), pose(w), easeOut], [s, pose(h), easeOut], [Math.max(s + 1, end), pose(h)], [Math.max(end + 2, m.tot), pose(rest)]];
      ANIM_CACHE.set(k, L); return L;
    }
    const NORM = { sLP: ['sLPw', 'sLP', 'guard'], sHP: ['sHPw', 'sHP', 'guard'], sLK: ['sLKw', 'sLK', 'guard'], sHK: ['sHKw', 'sHK', 'guard'],
      cLP: ['cLPw', 'cLP', 'crouch'], cHP: ['cHPw', 'cHP', 'crouch'], cLK: ['cLKw', 'cLK', 'crouch'], cHK: ['cHKw', 'cHK', 'crouch'] };
    const AIRN = { jLP: 'jLP', jHP: 'jHP', jLK: 'jLK', jHK: 'jHK' };
    // per-fighter flavour on top of the shared poses
    const STYLE = {
      truus: { guard: { t: 12, a1: 50, b1: 120, a2: 34, b2: 120, h1: 1, h2: 1 } },
      bram: { guard: { t: 10, l1: 30, k1: -6, l2: -34, k2: -22, a1: 50, b1: 110, a2: 36, b2: 120, h1: 1, h2: 1 } },
      moer: { guard: { t: 2, n: 0 } },
      sol: { guard: { t: 12, a1: 70, b1: 120, a2: -24, b2: 40, l2: -40, k2: -34 } },
      kiki: { guard: { t: 16, a1: 60, b1: 110, a2: 10, b2: 160, h1: 1, l1: 34, k1: -16, l2: -30, k2: -40 } },
      nevel: { guard: { t: 0, n: -4, a1: 70, b1: 110, a2: -10, b2: 20, h1: 1, h2: 1 } },
      sjaak: { guard: { t: 4, a1: 34, b1: 110, a2: 20, b2: 120 } },
    };
    const SPOSE = {};
    function stylePose(id, key) {
      const k = id + ':' + key; let p = SPOSE[k]; if (p) return p;
      const s = STYLE[id] && STYLE[id][key]; p = s ? Q(Object.assign({}, Object.fromEntries(Object.keys(FI).map(f => [f, POSE[key][FI[f]]])), { e: POSE[key].e }, s)) : POSE[key];
      SPOSE[k] = p; return p;
    }
    const WINP = { dex: ['fistUp', 'guard'], truus: ['bow', 'guard'], moer: ['armsUp', 'flex'], sol: ['ginga', 'armsUp'], bram: ['shiko', 'guard'], kiki: ['crossed', 'crossed'], sjaak: ['flex', 'flex'], nevel: ['spread', 'spread'] };
    const INTROP = { dex: ['sLP', 'guard'], truus: ['bow', 'guard'], moer: ['bootA', 'guard'], sol: ['ginga', 'guard'], bram: ['shiko', 'guard'], kiki: ['tele', 'guard'], sjaak: ['flex', 'guard'], nevel: ['spread', 'guard'] };
    // the pose for a (logic) fighter right now; also returns extras through o.fx (afterimage, alpha, swirl)
    function poseOf(F, M, o) {
      const id = F.C.id, t = F.t, G = stylePose(id, 'guard');
      o.alpha = 1; o.after = 0; o.stars = 0; o.walkPh = 0;
      switch (F.st) {
        case 'intro': { const [a, b] = INTROP[id]; return keys(OUTP, [[0, pose(a)], [50, pose(a)], [80, G]], t); }
        case 'win': { const [a, b] = WINP[id], u = .5 + .5 * Math.sin(t / 14); lerpInto(OUTP, pose(a), pose(b), id === 'kiki' || id === 'sjaak' || id === 'nevel' ? 0 : u * .35);
          if (id === 'sol') { OUTP[FI.x] = Math.sin(t / 10) * 8; OUTP[FI.t] += Math.sin(t / 10) * 8; }
          if (id === 'bram') { const v = (t % 80) / 80; lerpInto(OUTP, pose('shiko'), G, v < .5 ? 0 : ease((v - .5) * 2)); }
          if (id === 'sjaak' || id === 'moer') OUTP[FI.t] += Math.sin(t / 9) * 3;
          OUTP.e = 4; return OUTP; }
        case 'lose': return copy(OUTP, pose('tired'));
        case 'stand': case 'land': case 'jumpsq': case 'dash': {
          if (F.st === 'jumpsq') return lerpInto(OUTP, G, pose('jumpsq'), ease(t / 3));
          if (F.st === 'land') return lerpInto(OUTP, pose('land'), F.crouch ? pose('crouch') : G, ease(t / Math.max(1, F.lr)));
          if (F.st === 'dash') { o.after = F.jdir > 0 ? 1 : 0; return lerpInto(OUTP, pose(F.jdir > 0 ? 'dashF' : 'dashB'), G, ease(Math.max(0, t - 8) / 8)); }
          if (F.crouch) { copy(OUTP, F.guard ? pose('cguard') : pose('crouch')); OUTP[FI.t] += Math.sin(M.f / 16) * 1.5; return OUTP; }
          if (F.guard) return copy(OUTP, pose('sguard'));
          copy(OUTP, G);
          if (F.walk) {                                          // procedural walk: legs swing, a little bob
            const ph = (F.wph || 0) * DEG; o.walkPh = ph;
            const sw = Math.sin(ph) * 16 * F.walk;
            OUTP[FI.l1] += sw; OUTP[FI.l2] -= sw; OUTP[FI.k1] += sw - Math.max(0, Math.cos(ph)) * 16; OUTP[FI.k2] -= sw + Math.max(0, -Math.cos(ph)) * 16;
            OUTP[FI.t] += 3 * F.walk; OUTP[FI.y] = -Math.abs(Math.sin(ph)) * 2;
            OUTP[FI.a1] += Math.sin(ph) * 4; OUTP[FI.a2] -= Math.sin(ph) * 4;
          } else {                                               // breathing
            const b = Math.sin(M.f / 18 + F.side);
            OUTP[FI.t] += b * 1.6; OUTP[FI.a1] += b * 2; OUTP[FI.a2] += b * 2.5; OUTP[FI.b1] -= b * 2; OUTP[FI.y] = b * 1.2 - 1;
            if (id === 'sol') { const g = Math.sin(M.f / 14); OUTP[FI.x] = g * 10; OUTP[FI.t] += g * 5; OUTP[FI.l1] += g * 10; OUTP[FI.l2] += g * 10; OUTP[FI.a1] -= g * 12; OUTP[FI.a2] += g * 14; }
          }
          return OUTP;
        }
        case 'air': {
          const up = F.vy > 3, fw = F.jdir !== 0;
          if (fw && F.t > 4 && F.t < 34) { copy(OUTP, pose('tuck')); OUTP[FI.r] = -360 * F.jdir * ease((F.t - 5) / 26); return OUTP; }
          return lerpInto(OUTP, pose('jumpUp'), pose('fallJ'), ease((5 - F.vy) / 10));
        }
        case 'move': return movePose(F, M, o);
        case 'hit': {
          const p = F.crouch ? pose('hitLo') : (F.hl === 'b' ? pose('hitBody') : pose('hitHi'));
          const u = t / Math.max(1, F.hsT);
          return lerpInto(OUTP, p, F.crouch ? pose('crouch') : G, u < .55 ? 0 : ease((u - .55) / .45));
        }
        case 'block': { copy(OUTP, F.crouch ? pose('cblock') : pose('block')); OUTP[FI.x] -= Math.max(0, 4 - t) * 1.5; return OUTP; }
        case 'fall': {
          copy(OUTP, pose('fall'));
          if (F.kd) OUTP[FI.r] = Math.max(-80, -F.t * 3.2); else OUTP[FI.r] = -F.t * 14;
          if (!F.kd && F.vy < 0) lerpInto(OUTP, OUTP, pose('fallJ'), .6);
          return OUTP;
        }
        case 'down': { copy(OUTP, pose('down')); OUTP[FI.y] = t < 6 ? Math.sin(t / 6 * Math.PI) * 10 : 0; return OUTP; }
        case 'rise': return keys(OUTP, [[0, pose('down')], [8, pose('getup')], [22, G]], t);
        case 'ko': { const s = Math.min(1, t / 26); lerpInto(OUTP, pose('down'), pose('sit'), ease(s)); OUTP[FI.t] += Math.sin(M.f / 12) * 6 * s; OUTP[FI.n] += Math.sin(M.f / 9) * 8 * s; o.stars = s; return OUTP; }
        case 'dizzy': { copy(OUTP, pose('dizzy')); OUTP[FI.t] += Math.sin(t / 8) * 10; OUTP[FI.x] = Math.sin(t / 8) * 6; o.stars = 1; return OUTP; }
        case 'held': { copy(OUTP, pose('held')); const T = F.held && F.held.thr; if (T && T.sw) OUTP[FI.r] = -180 * Math.min(1, F.t / Math.max(1, T.n - 12)); if (T && T.su) OUTP[FI.r] = -F.t * 12; return OUTP; }
        case 'throw': { const T = F.thr, n = T ? T.n - 12 : 22; return keys(OUTP, [[0, pose('grabW')], [4, pose('grab')], [Math.round(n * .55), pose('grab')], [n, pose('toss')], [n + 10, G]], t); }
      }
      return copy(OUTP, G);
    }
    function movePose(F, M, o) {
      const m = F.mv, t = F.mt, an = m.an, id = F.C.id, G = stylePose(id, 'guard');
      if (NORM[an]) { const [w, h, rest] = NORM[an]; return keys(OUTP, strikeKeys(m, w, h, rest === 'guard' ? 'guard' : rest), t); }
      if (AIRN[an]) { const h0 = m.hits[0]; return keys(OUTP, [[0, pose('fallJ')], [h0.f, pose(AIRN[an]), easeOut], [h0.f + h0.n, pose(AIRN[an])], [h0.f + h0.n + 10, pose('fallJ')]], t); }
      const h0 = m.hits[0], s = h0 ? h0.f : (m.pj ? m.pj.f : m.gr ? m.gr.f : m.tp ? m.tp.f : 6);
      switch (an) {
        case 'pjK': return keys(OUTP, [[0, G], [s - 4, pose('pjKw')], [s, pose('pjK'), easeOut], [s + 10, pose('pjK')], [m.tot, G]], t);
        case 'pjP': case 'pjThrow': return keys(OUTP, [[0, G], [s - 4, pose('pjPw')], [s, pose('pjP'), easeOut], [s + 12, pose('pjP')], [m.tot, G]], t);
        case 'pjFist': { keys(OUTP, [[0, G], [s - 4, pose('sHPw')], [s, pose('sHP'), easeOut], [s + 14, pose('sHP')], [m.tot, G]], t); if (t >= s && t < m.tot - 6 && F.proj) OUTP.hide = 2; return OUTP; }
        case 'riseK': case 'flip': {
          const p = an === 'flip' ? pose('flip') : pose('riseK');
          keys(OUTP, [[0, pose('crouch')], [s, p, easeOut], [s + 12, p], [s + 22, pose('fallJ')]], t);
          if (an === 'flip') OUTP[FI.r] = t > s ? Math.min(360, (t - s) * 22) * 1 : 0;
          return OUTP;
        }
        case 'rushP': return keys(OUTP, [[0, G], [s - 3, pose('sHPw')], [s, pose('rushP'), easeOut], [h0.f + h0.n, pose('rushP')], [m.tot, G]], t);
        case 'spin': {
          keys(OUTP, [[0, G], [5, pose('spin')], [m.tot - 6, pose('spin')], [m.tot, G]], t);
          if (t > 5 && t < m.tot - 6) { const ph = (t - 5) * 26 * DEG; OUTP[FI.l1] = 100 + Math.sin(ph) * 50; OUTP[FI.l2] = -100 + Math.sin(ph) * 50; OUTP[FI.k1] = OUTP[FI.l1] + 4; OUTP[FI.k2] = OUTP[FI.l2] - 4; o.after = 1; }
          return OUTP;
        }
        case 'wheel': { keys(OUTP, [[0, G], [5, pose('wheel')], [26, pose('wheel')], [34, pose('jHK')]], t); if (t > 4) OUTP[FI.r] = -Math.min(360, (t - 4) * 16); return OUTP; }
        case 'slide': return keys(OUTP, [[0, pose('crouch')], [6, pose('slide'), easeOut], [m.tot - 12, pose('slide')], [m.tot, pose('crouch')]], t);
        case 'slaps': { if (t < 5 || t > m.tot - 6) return keys(OUTP, [[0, G], [5, pose('slapA')], [m.tot - 6, pose('slapB')], [m.tot, G]], t); return lerpInto(OUTP, pose('slapA'), pose('slapB'), .5 + .5 * Math.sin(t * 1.6)); }
        case 'belly': { keys(OUTP, [[0, G], [s - 2, pose('crouch')], [s + 2, pose('belly'), easeOut], [m.tot - 12, pose('belly')], [m.tot, G]], t); if (t > s && t < m.tot - 12) o.after = 1; return OUTP; }
        case 'pound': return keys(OUTP, [[0, G], [s - 5, pose('poundW')], [s, pose('pound'), easeOut], [s + 10, pose('pound')], [m.tot, G]], t);
        case 'lariat': { keys(OUTP, [[0, G], [8, pose('lariat')], [m.tot - 10, pose('lariat')], [m.tot, G]], t); if (t > 8 && t < m.tot - 10) { OUTP[FI.a1] = 90 + Math.sin(t * .5) * 30; OUTP[FI.t] = 14 + Math.sin(t * .5) * 10; } return OUTP; }
        case 'catch': return keys(OUTP, [[0, G], [s, pose('catch'), easeOut], [m.tot - 8, pose('catch')], [m.tot, G]], t);
        case 'grab': return keys(OUTP, [[0, G], [Math.max(1, s - 1), pose('grabW')], [s + 2, pose('grab'), easeOut], [s + 10, pose('grab')], [m.tot, G]], t);
        case 'counter': { keys(OUTP, [[0, G], [3, pose('counter')], [m.ct.f1, pose('counter')], [m.tot, G]], t); return OUTP; }
        case 'tele': { keys(OUTP, [[0, G], [5, pose('tele')], [m.tp.f + 4, pose('tele')], [m.tot, G]], t); o.alpha = t < 4 ? 1 - t / 5 : t < m.tp.f + 2 ? 0 : Math.min(1, (t - m.tp.f - 2) / 6); return OUTP; }
        case 'dive': return keys(OUTP, [[0, pose('jumpsq')], [4, pose('tuck')], [11, pose('tuck')], [13, pose('dive'), easeOut]], t);
        case 'dash': { keys(OUTP, [[0, G], [3, pose('dash')], [22, pose('dash')], [m.tot, G]], t); if (t > 2 && t < 24) o.after = 2; return OUTP; }
        case 'suDex': {
          if (t < 12) return keys(OUTP, [[0, G], [4, pose('dashF')], [12, pose('rushP')]], t);
          const k = Math.floor((t - 12) / 7) % 2, u = ((t - 12) % 7) / 7;
          if (t > m.tot - 16) return keys(OUTP, [[m.tot - 16, pose('suUp')], [m.tot, G]], t);
          lerpInto(OUTP, k ? pose('suA') : pose('suB'), k ? pose('suB') : pose('suA'), easeOut(u)); o.after = 1; return OUTP;
        }
      }
      return keys(OUTP, [[0, G], [s, pose('sHP')], [m.tot || s + 10, G]], t);
    }

    /* ---------- forward kinematics (+ IK foot planting) ---------- */
    const J = { hip: [0, 0], sh: [0, 0], shF: [0, 0], shN: [0, 0], neck: [0, 0], head: [0, 0], elF: [0, 0], wrF: [0, 0], elN: [0, 0], wrN: [0, 0],
      hipF: [0, 0], hipN: [0, 0], knF: [0, 0], anF: [0, 0], knN: [0, 0], anN: [0, 0] };
    const ANG = { t: 0, hd: 0, a1: 0, b1: 0, a2: 0, b2: 0, l1: 0, k1: 0, l2: 0, k2: 0, f1: 0, f2: 0, r: 0 };
    const dl = (θ, L, o, from) => { o[0] = from[0] + Math.sin(θ * DEG) * L; o[1] = from[1] - Math.cos(θ * DEG) * L; return o; };
    function ik(hip, tx, ty, L1, L2, out) {          // knee bends forward; returns [thigh, shin] angles
      let dx = tx - hip[0], dy = ty - hip[1], d = Math.hypot(dx, dy); const mx = L1 + L2 - .01;
      if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
      const base = Math.atan2(dx, -dy) / DEG, c = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))), off = Math.acos(c) / DEG;
      const th = base + off; const kx = hip[0] + Math.sin(th * DEG) * L1, ky = hip[1] - Math.cos(th * DEG) * L1;
      out[0] = th; out[1] = Math.atan2(tx - kx, -(ty - ky)) / DEG; return out;
    }
    const IKO = [0, 0];
    function fk(L, p) {
      const sz = L.sz;
      ANG.t = p[FI.t]; ANG.hd = p[FI.t] + p[FI.n]; ANG.a1 = p[FI.a1]; ANG.b1 = p[FI.b1]; ANG.a2 = p[FI.a2]; ANG.b2 = p[FI.b2];
      ANG.l1 = p[FI.l1]; ANG.k1 = p[FI.k1]; ANG.l2 = p[FI.l2]; ANG.k2 = p[FI.k2]; ANG.f1 = p[FI.f1]; ANG.f2 = p[FI.f2]; ANG.r = p[FI.r];
      const ank = 6 * sz;
      let hy;
      const d1 = L.th * Math.cos(ANG.l1 * DEG) + L.sh * Math.cos(ANG.k1 * DEG), d2 = L.th * Math.cos(ANG.l2 * DEG) + L.sh * Math.cos(ANG.k2 * DEG);
      const lift = p[FI.lift];
      if (p.g) hy = (lift === 1 ? d2 : lift === 2 ? d1 : Math.max(d1, d2)) + ank; else hy = L.th + L.sh + ank;
      J.hip[0] = p[FI.x]; J.hip[1] = hy + p[FI.y];
      const t = ANG.t * DEG, ct = Math.cos(t), st = Math.sin(t);
      J.sh[0] = J.hip[0] + st * L.to; J.sh[1] = J.hip[1] + ct * L.to;
      // shoulders sit a little apart (3/4 view): far one forward, near one back
      J.shF[0] = J.sh[0] + ct * 3 * sz - st * 4 * sz; J.shF[1] = J.sh[1] - st * 3 * sz - ct * 4 * sz;
      J.shN[0] = J.sh[0] - ct * 6 * sz - st * 5 * sz; J.shN[1] = J.sh[1] + st * 6 * sz - ct * 5 * sz;
      const h = ANG.hd * DEG; J.neck[0] = J.sh[0] + st * 2; J.neck[1] = J.sh[1] + ct * 2;
      J.head[0] = J.neck[0] + Math.sin(h) * (L.nk + L.hr * .9); J.head[1] = J.neck[1] + Math.cos(h) * (L.nk + L.hr * .9);
      dl(ANG.a1, L.ua, J.elF, J.shF); dl(ANG.b1, L.fa, J.wrF, J.elF); dl(ANG.a2, L.ua, J.elN, J.shN); dl(ANG.b2, L.fa, J.wrN, J.elN);
      J.hipF[0] = J.hip[0] + ct * 4 * sz; J.hipF[1] = J.hip[1] - st * 4 * sz; J.hipN[0] = J.hip[0] - ct * 5 * sz; J.hipN[1] = J.hip[1] + st * 5 * sz;
      dl(ANG.l1, L.th, J.knF, J.hipF); dl(ANG.k1, L.sh, J.anF, J.knF); dl(ANG.l2, L.th, J.knN, J.hipN); dl(ANG.k2, L.sh, J.anN, J.knN);
      if (p.g && ANG.r === 0) {                                  // plant feet that are (nearly) on the floor
        if (lift !== 1 && lift !== 3 && J.anF[1] < ank + 16) { ik(J.hipF, J.anF[0], ank, L.th, L.sh, IKO); ANG.l1 = IKO[0]; ANG.k1 = IKO[1]; dl(ANG.l1, L.th, J.knF, J.hipF); dl(ANG.k1, L.sh, J.anF, J.knF); if (Math.abs(ANG.f1) < 25) ANG.f1 = 0; }
        if (lift !== 2 && lift !== 3 && J.anN[1] < ank + 16) { ik(J.hipN, J.anN[0], ank, L.th, L.sh, IKO); ANG.l2 = IKO[0]; ANG.k2 = IKO[1]; dl(ANG.l2, L.th, J.knN, J.hipN); dl(ANG.k2, L.sh, J.anN, J.knN); if (Math.abs(ANG.f2) < 25) ANG.f2 = 0; }
      }
      if (ANG.r) {                                               // whole-body rotation around the middle of the body
        const cx = J.hip[0], cy = J.hip[1] + L.to * .3, a = -ANG.r * DEG, ca = Math.cos(a), sa = Math.sin(a);
        for (const k in J) { const v = J[k], x = v[0] - cx, y = v[1] - cy; v[0] = cx + x * ca - y * sa; v[1] = cy + x * sa + y * ca; }
      }
      if (p.g === 2) { let mn = 1e9; for (const k in J) if (k !== 'sh' && k !== 'neck') mn = Math.min(mn, J[k][1] - (k === 'head' ? L.hr * .9 : 7)); const dy = p[FI.y] - mn; for (const k in J) J[k][1] += dy; }
    }

    /* ---------- building a fighter's parts (once per look, palette and canvas) ---------- */
    function capsule(L, r0, r1) { const p = new Path2D(); p.moveTo(0, -r0); p.lineTo(L, -r1); p.arc(L, 0, r1, -Math.PI / 2, Math.PI / 2); p.lineTo(0, r0); p.arc(0, 0, r0, Math.PI / 2, Math.PI * 1.5); p.closePath(); return p; }
    function cyl(g, w, c) { const gr = g.createLinearGradient(0, w, 0, -w); gr.addColorStop(0, shade(c, .28)); gr.addColorStop(.45, c); gr.addColorStop(1, shade(c, -.32)); return gr; }
    const KITS = new WeakMap();
    function kit(g, C, pal) {
      let byCtx = KITS.get(g); if (!byCtx) { byCtx = new Map(); KITS.set(g, byCtx); }
      const key = C.id + pal; let K = byCtx.get(key); if (K) return K;
      const base = LOOK[C.id], pc = base.pal[pal] || base.pal[0], sz = C.H, wz = Math.sqrt(C.W);
      const L = { sz, th: base.th * sz, sh: base.sh * sz, ua: base.ua * sz, fa: base.fa * sz, to: base.to * sz, hr: base.hr, nk: base.nk * sz };
      const S = base.skin, top = pc.top || S, bot = pc.bot || S;
      const armC = base.top === 'gi' || base.top === 'coat' || base.top === 'robot' || base.top === 'ninja' ? top : S;
      const foreC = base.top === 'gi' || base.top === 'coat' ? top : base.top === 'robot' ? pc.top : S;
      const legC = base.bottom === 'shorts' || base.bottom === 'mawashi' ? S : bot;
      K = { L, base, pc, parts: {} };
      const part = (name, path, w, col, lw = 2.4) => { K.parts[name] = { p: path, f: cyl(g, w, col), ff: col, lw }; };
      const uaW = base.uaW * wz, faW = base.faW * wz, thW = base.thW * wz, shW = base.shW * wz;
      part('ua', capsule(L.ua, uaW, uaW * .82), uaW, armC);
      part('fa', capsule(L.fa, faW, faW * .82), faW, foreC);
      part('th', capsule(L.th, thW, thW * .8), thW, legC);
      part('sh', capsule(L.sh, shW, shW * .78), shW, base.bottom === 'abada' || base.bottom === 'gi' || base.bottom === 'pants' || base.bottom === 'robot' || base.bottom === 'ninja' || base.bottom === 'tights' && false ? bot : S);
      if (base.bottom === 'shorts') part('thO', capsule(L.th * .55, thW * 1.12, thW * 1.05), thW * 1.1, bot);
      if (base.bottom === 'tights') part('thO', capsule(L.th * .9, thW * 1.04, thW * .86), thW, bot);
      if (base.bottom === 'abada') { part('thO', capsule(L.th, thW * 1.25, thW * 1.15), thW * 1.2, bot); part('shO', capsule(L.sh * .92, shW * 1.5, shW * 1.25), shW * 1.4, bot); }
      if (base.bottom === 'gi' || base.bottom === 'pants') { part('thO', capsule(L.th, thW * 1.15, thW * 1.05), thW * 1.1, bot); part('shO', capsule(L.sh * .94, shW * 1.3, shW * 1.2), shW * 1.3, bot); }
      if (base.bottom === 'ninja') { part('thO', capsule(L.th, thW * 1.12, thW * 1.0), thW * 1.1, bot); part('shO', capsule(L.sh * .5, shW * 1.15, shW * 1.05), shW * 1.1, pc.wrap); }
      if (base.top === 'tank' || base.top === 'singlet' || base.top === 'crop' || base.top === 'bare') {}
      if (base.top === 'gi' || base.top === 'coat') part('uaO', capsule(L.ua, uaW * 1.25, uaW * 1.15), uaW * 1.2, top);
      if (base.top === 'gi' || base.top === 'coat') part('faO', capsule(L.fa * .85, faW * 1.35, faW * 1.45), faW * 1.4, top);
      if (base.wraps || base.top === 'ninja') part('faW', capsule(L.fa * .45, faW * 1.06, faW * .9), faW, pc.wrap || '#eee');
      // hands
      const fr = base.fist * Math.sqrt(sz);
      const fist = new Path2D(); if (base.gloves) { fist.ellipse(fr * .25, 0, fr * 1.15, fr, 0, 0, Math.PI * 2); } else if (base.robot) { fist.roundRect(-fr * .7, -fr * .85, fr * 1.9, fr * 1.7, fr * .45); } else fist.ellipse(fr * .2, 0, fr * .95, fr * .85, 0, 0, Math.PI * 2);
      const handC = base.gloves ? pc.glove : base.robot ? pc.top : pc.glove || S;
      part('fist', fist, fr, handC);
      const open = new Path2D(); open.moveTo(-fr * .5, -fr * .55); open.lineTo(fr * 1.5, -fr * .45); open.quadraticCurveTo(fr * 1.9, 0, fr * 1.5, fr * .45); open.lineTo(-fr * .5, fr * .6); open.closePath();
      part('open', open, fr * .7, handC);
      K.fr = fr; K.gloveCuff = base.gloves ? capsule(fr * .6, fr * .72, fr * .7) : null;
      // feet
      const fl = base.foot * sz, fh = 7 * sz, foot = new Path2D();
      foot.moveTo(-fl * .25, fh * .9); foot.quadraticCurveTo(-fl * .38, 0, -fl * .2, -fh * .9); foot.lineTo(fl * .82, -fh * .9); foot.quadraticCurveTo(fl * 1.02, -fh * .9, fl * .98, -fh * .1);
      foot.quadraticCurveTo(fl * .9, fh * .5, fl * .45, fh * .55); foot.lineTo(fl * .1, fh * 1.0); foot.closePath();
      const shoeC = base.robot ? pc.bot : base.top === 'ninja' ? pc.top : base.bottom === 'pants' ? '#120b18' : pc.shoe || S;
      K.parts.foot = { p: foot, f: shoeC, ff: shoeC, lw: 2.2, fh };
      K.footL = fl;
      // torso (local: x along the spine, -y = the front)
      const tw = base.chest * wz, ww = base.waist * wz, to = L.to, tor = new Path2D();
      if (base.robot) { tor.roundRect(-4, -tw, to + 6, tw * 2, 10); }
      else if (base.belly) {
        tor.moveTo(0, ww * .6); tor.bezierCurveTo(to * .1, ww * 1.15, to * .5, tw * 1.1, to * .95, tw * .8); tor.quadraticCurveTo(to * 1.1, 0, to * .95, -tw * .85);
        tor.bezierCurveTo(to * .75, -tw * 1.2, to * .45, -ww * 1.55, to * .1, -ww * 1.3); tor.quadraticCurveTo(-to * .12, -ww * .6, 0, ww * .6); tor.closePath();
      } else {
        tor.moveTo(-2, ww); tor.bezierCurveTo(to * .4, ww * 1.02, to * .62, tw * .95, to * .9, tw * .92); tor.quadraticCurveTo(to * 1.08, tw * .5, to * 1.04, 0);
        tor.quadraticCurveTo(to * 1.08, -tw * .7, to * .86, -tw * 1.0); tor.bezierCurveTo(to * .6, -tw * (base.fem ? 1.08 : 1.02), to * .4, -ww * 1.05, -2, -ww); tor.quadraticCurveTo(-6, 0, -2, ww); tor.closePath();
      }
      const torC = base.top === 'bare' ? S : base.top === 'tank' || base.top === 'singlet' || base.top === 'crop' ? S : top;
      K.parts.torso = { p: tor, f: cyl(g, tw, torC), ff: torC, lw: 2.6 };
      // clothing over the torso
      if (base.top === 'tank' || base.top === 'singlet' || base.top === 'crop') {
        const cl = new Path2D(), lo = base.top === 'crop' ? to * .45 : -3;
        cl.moveTo(lo, ww * 1.04); cl.bezierCurveTo(to * .4, ww * 1.05, to * .62, tw * .97, to * .84, tw * .94); cl.lineTo(to * .92, tw * .4); cl.quadraticCurveTo(to * .8, 0, to * .9, -tw * .45);
        cl.lineTo(to * .84, -tw * 1.02); cl.bezierCurveTo(to * .6, -tw * 1.06, to * .4, -ww * 1.07, lo, -ww * 1.04); cl.closePath();
        K.parts.shirt = { p: cl, f: cyl(g, tw, top), ff: top, lw: 2 };
      }
      if (base.top === 'gi' || base.top === 'coat') {           // lapels
        const lp = new Path2D(); lp.moveTo(to * .98, -tw * .5); lp.lineTo(to * .35, -ww * .2); lp.lineTo(to * .4, -ww * .55); lp.lineTo(to * .98, -tw * .9); lp.closePath(); K.lapel = lp;
      }
      // pelvis / shorts / belts
      const pel = new Path2D(), hw = base.hipW * wz;
      pel.ellipse(2 * sz, 0, hw * .95, hw * .75, 0, 0, Math.PI * 2);
      const pelC = base.bottom === 'shorts' || base.bottom === 'mawashi' || base.bottom === 'tights' ? bot : base.bottom === 'robot' ? pc.joint : bot;
      K.parts.pelvis = { p: pel, f: cyl(g, hw, pelC), ff: pelC, lw: 2.4 };
      // head
      const hr = base.hr * Math.sqrt(sz), head = new Path2D();
      if (base.robot) { head.roundRect(-hr * .95, -hr * .9, hr * 1.95, hr * 1.85, hr * .55); }
      else { head.arc(0, 0, hr, -Math.PI * .12, Math.PI * 1.28, false); head.quadraticCurveTo(-hr * .1, -hr * 1.12, hr * .5, -hr * 1.02); head.quadraticCurveTo(hr * 1.0, -hr * .86, hr * .99, -hr * .37); head.closePath(); }
      const hg = g.createRadialGradient(hr * .35, hr * .4, hr * .2, 0, 0, hr * 1.3); hg.addColorStop(0, shade(base.robot ? pc.top : S, .22)); hg.addColorStop(.6, base.robot ? pc.top : S); hg.addColorStop(1, shade(base.robot ? pc.top : S, -.3));
      K.parts.head = { p: head, f: hg, ff: base.robot ? pc.top : S, lw: 2.6 }; K.hr = hr;
      const neck = capsule(L.nk + hr * .4, 7 * wz * sz, 6.2 * wz * sz); K.parts.neck = { p: neck, f: cyl(g, 7, base.robot ? pc.joint : S), ff: S, lw: 2.2 };
      K.skinShade = shade(S, -.25); K.skinLight = shade(S, .3);
      buildHair(g, K, base, pc, hr);
      if (base.cape) { K.capeF = pc.cape; K.capeIn = pc.capeIn; }
      byCtx.set(key, K); return K;
    }
    function buildHair(g, K, base, pc, hr) {
      const H = new Path2D(), back = new Path2D(); let col = base.hair, front = true;
      switch (base.hairStyle) {
        case 'fade': H.moveTo(-hr * .95, hr * .1); H.quadraticCurveTo(-hr * 1.05, hr * .95, -hr * .1, hr * 1.08); H.quadraticCurveTo(hr * .7, hr * 1.12, hr * .98, hr * .45);
          H.lineTo(hr * .7, hr * .5); H.quadraticCurveTo(hr * .1, hr * .78, -hr * .5, hr * .2); H.lineTo(-hr * .62, -hr * .15); H.closePath(); break;
        case 'bun': H.moveTo(-hr * 1.0, -hr * .1); H.quadraticCurveTo(-hr * 1.1, hr * 1.0, hr * .1, hr * 1.06); H.quadraticCurveTo(hr * .9, hr * 1.0, hr * 1.0, hr * .3);
          H.quadraticCurveTo(hr * .5, hr * .62, -hr * .2, hr * .3); H.quadraticCurveTo(-hr * .5, 0, -hr * .7, -hr * .3); H.closePath();
          back.ellipse(-hr * .55, hr * 1.0, hr * .55, hr * .5, -.5, 0, Math.PI * 2); break;
        case 'puff': back.ellipse(-hr * .25, hr * .75, hr * 1.35, hr * 1.1, -.25, 0, Math.PI * 2);
          for (let i = 0; i < 9; i++) { const a = Math.PI * (.05 + i * .13), r = hr * 1.2; back.moveTo(-hr * .25 + Math.cos(a) * r + hr * .3, hr * .75 + Math.sin(a) * r * .9); back.arc(-hr * .25 + Math.cos(a) * r, hr * .75 + Math.sin(a) * r * .9, hr * .3, 0, Math.PI * 2); }
          H.moveTo(-hr * .9, -hr * .1); H.quadraticCurveTo(-hr * .6, hr * .9, hr * .2, hr * .95); H.quadraticCurveTo(hr * .8, hr * .8, hr * .95, hr * .45); H.quadraticCurveTo(hr * .3, hr * .55, -hr * .5, hr * 0); H.closePath(); break;
        case 'topknot': H.moveTo(-hr * .95, -hr * .1); H.quadraticCurveTo(-hr * 1.05, hr * .95, hr * .05, hr * 1.05); H.quadraticCurveTo(hr * .8, hr * 1.0, hr * .95, hr * .4);
          H.quadraticCurveTo(hr * .3, hr * .7, -hr * .4, hr * .25); H.lineTo(-hr * .6, -hr * .2); H.closePath();
          back.ellipse(-hr * .1, hr * 1.25, hr * .55, hr * .3, -.3, 0, Math.PI * 2); back.ellipse(hr * .3, hr * 1.35, hr * .3, hr * .2, .4, 0, Math.PI * 2); front = true; break;
        case 'ponytail': H.moveTo(-hr * .98, -hr * .05); H.quadraticCurveTo(-hr * 1.05, hr * 1.0, hr * .1, hr * 1.08); H.quadraticCurveTo(hr * .85, hr * 1.0, hr * 1.0, hr * .5);
          H.lineTo(hr * .6, hr * .62); H.lineTo(hr * .55, hr * .35); H.lineTo(hr * .25, hr * .6); H.quadraticCurveTo(-hr * .3, hr * .4, -hr * .6, -hr * .1); H.closePath();
          back.moveTo(-hr * .6, hr * .9); back.bezierCurveTo(-hr * 1.8, hr * 1.4, -hr * 2.2, hr * .2, -hr * 1.9, -hr * .8); back.bezierCurveTo(-hr * 1.6, 0, -hr * 1.3, hr * .5, -hr * .7, hr * .5); back.closePath(); break;
        case 'hat': col = pc.hat;
          H.moveTo(-hr * 1.35, hr * .62); H.lineTo(hr * 1.4, hr * .62); H.quadraticCurveTo(hr * 1.45, hr * .82, hr * 1.2, hr * .85); H.lineTo(hr * .78, hr * .85); H.lineTo(hr * .7, hr * 2.0);
          H.quadraticCurveTo(0, hr * 2.12, -hr * .72, hr * 2.0); H.lineTo(-hr * .78, hr * .85); H.lineTo(-hr * 1.2, hr * .85); H.quadraticCurveTo(-hr * 1.45, hr * .82, -hr * 1.35, hr * .62); H.closePath(); break;
        case 'robot': col = pc.joint; H.moveTo(-hr * .1, hr * .9); H.lineTo(-hr * .1, hr * 1.6); H.moveTo(hr * .1, hr * 1.6); H.lineTo(hr * .1, hr * .9); front = false; break;
        case 'bald': front = false; break;
      }
      K.hair = { p: H, f: col, front, back: base.hairStyle === 'bun' || base.hairStyle === 'puff' || base.hairStyle === 'topknot' || base.hairStyle === 'ponytail' ? back : null };
      if (base.hairStyle === 'hat') K.hatBand = pc.cape;
    }

    /* ---------- drawing ---------- */
    const MB = new Float64Array(6), ML = new Float64Array(6);
    function setT(g, B, x, y, ang) {                           // g.setTransform(B * translate(x, y) * rotate(ang))
      const c = Math.cos(ang), s = Math.sin(ang);
      g.setTransform(B[0] * c + B[2] * s, B[1] * c + B[3] * s, -B[0] * s + B[2] * c, -B[1] * s + B[3] * c, B[0] * x + B[2] * y + B[4], B[1] * x + B[3] * y + B[5]);
    }
    function limb(g, B, part, from, to, flash, alpha) {
      const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
      setT(g, B, from[0], from[1], ang); fillPart(g, part, flash);
    }
    function fillPart(g, part, flash) { g.fillStyle = flash ? '#ffffff' : part.f; g.fill(part.p); g.lineWidth = part.lw; g.strokeStyle = OUT; g.stroke(part.p); }
    const limbAng = θ => (θ - 90) * DEG;
    // draw fighter F-like {C, pal, x, y, face} with pose p into g using the base transform B (world -> screen, y up)
    function draw(g, B, C, pal, p, o) {
      const K = kit(g, C, pal), L = K.L, base = K.base, pc = K.pc, flash = o && o.flash, PT = K.parts;
      fk(L, p);
      g.lineJoin = 'round'; g.lineCap = 'round';
      const hideF = p.hide & 1, hideN = p.hide & 2;
      const ra = ANG.r;
      // cape / scarf / ponytail behind everything
      if (K.capeF) drawCape(g, B, K, o);
      if (base.scarf) drawScarf(g, B, K, o, true);
      // far arm
      armPart(g, B, K, J.shF, J.elF, J.wrF, ANG.a1 - ra, ANG.b1 - ra, p.h1, flash, true, hideF);
      // far leg
      legPart(g, B, K, J.hipF, J.knF, J.anF, ANG.f1 - ra, flash, true);
      // neck, torso, pelvis
      setT(g, B, J.sh[0], J.sh[1], limbAng(180 - ANG.hd - ANG.r)); fillPart(g, PT.neck, flash);
      const tAng = (90 - ANG.t + ra * 0) * DEG;
      setT(g, B, J.hip[0], J.hip[1], Math.atan2(J.sh[1] - J.hip[1], J.sh[0] - J.hip[0])); fillPart(g, PT.torso, flash);
      if (!flash) torsoDetails(g, K, L);
      setT(g, B, J.hip[0], J.hip[1], Math.atan2(J.sh[1] - J.hip[1], J.sh[0] - J.hip[0])); fillPart(g, PT.pelvis, flash);
      if (!flash) pelvisDetails(g, K);
      // near leg, head, near arm
      legPart(g, B, K, J.hipN, J.knN, J.anN, ANG.f2 - ra, flash, false);
      if (base.scarf) drawScarf(g, B, K, o, false);
      drawHead(g, B, K, p, flash, o);
      armPart(g, B, K, J.shN, J.elN, J.wrN, ANG.a2 - ra, ANG.b2 - ra, p.h2, flash, false, hideN);
    }
    function armPart(g, B, K, sh, el, wr, a, b, hand, flash, far, hide) {
      const PT = K.parts;
      limb(g, B, PT.ua, sh, el, flash); if (PT.uaO) limb(g, B, PT.uaO, sh, el, flash);
      if (hide) return;
      limb(g, B, PT.fa, el, wr, flash); if (PT.faW) limb(g, B, PT.faW, [el[0] + (wr[0] - el[0]) * .55, el[1] + (wr[1] - el[1]) * .55], wr, flash); if (PT.faO) limb(g, B, PT.faO, el, wr, flash);
      const ang = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
      setT(g, B, wr[0], wr[1], ang);
      if (hand === 0 || K.base.gloves) { fillPart(g, PT.fist, flash); if (!flash) { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(K.fr * .9, -K.fr * .45); g.lineTo(K.fr * .9, K.fr * .45); if (K.base.gloves) { g.moveTo(-K.fr * .2, K.fr * .2); g.quadraticCurveTo(K.fr * .5, K.fr * .5, K.fr * .2, -K.fr * .6); } g.stroke(); } }
      else { fillPart(g, PT.open, flash); if (!flash) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.1; g.beginPath(); for (let i = -1; i <= 1; i++) { g.moveTo(K.fr * .5, i * K.fr * .25); g.lineTo(K.fr * 1.4, i * K.fr * .22); } g.stroke(); } }
      if (K.gloveCuff && !flash) { setT(g, B, wr[0], wr[1], ang + Math.PI); g.fillStyle = '#f4f1ea'; g.fill(K.gloveCuff); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(K.gloveCuff); }
    }
    function legPart(g, B, K, hp, kn, an, fAng, flash, far) {
      const PT = K.parts;
      limb(g, B, PT.th, hp, kn, flash); if (PT.thO) limb(g, B, PT.thO, hp, kn, flash);
      limb(g, B, PT.sh, kn, an, flash); if (PT.shO) limb(g, B, PT.shO, kn, an, flash);
      setT(g, B, an[0], an[1], fAng * DEG); fillPart(g, PT.foot, flash);
      if (K.base.robot && !flash) { setT(g, B, kn[0], kn[1], 0); g.fillStyle = K.pc.joint; g.beginPath(); g.arc(0, 0, K.parts.sh.lw * 3.4, 0, Math.PI * 2); g.fill(); g.stroke(); }
    }
    function torsoDetails(g, K, L) {
      const base = K.base, pc = K.pc, to = L.to, tw = base.chest * Math.sqrt(1), PT = K.parts;
      if (PT.shirt) { g.fillStyle = PT.shirt.f; g.fill(PT.shirt.p); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(PT.shirt.p);
        if (base.top === 'singlet') { g.save(); g.clip(PT.shirt.p); g.fillStyle = pc.trim; for (let x = 0; x < to * 1.1; x += 12) g.fillRect(x, -60, 6, 120); g.restore(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(PT.shirt.p); }
        else if (pc.trim) { g.strokeStyle = pc.trim; g.lineWidth = 3; g.beginPath(); g.moveTo(to * .1, -base.waist * .9); g.lineTo(to * .8, -tw * .9); g.stroke(); }
      }
      if (base.top === 'bare' || base.belly) { g.strokeStyle = K.skinShade; g.lineWidth = 2; g.beginPath(); g.arc(to * .72, -tw * .3, tw * .32, -1.2, 1.4); g.stroke(); if (base.belly) { g.beginPath(); g.arc(to * .3, -base.waist * .6, 2.5, 0, Math.PI * 2); g.stroke(); } }
      if (K.lapel) { g.fillStyle = base.top === 'coat' ? pc.trim : shade(pc.top, -.12); g.fill(K.lapel); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke(K.lapel); }
      if (base.robot) { g.fillStyle = pc.trim; g.beginPath(); g.arc(to * .62, -tw * .35, 7, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(to * .62 + 2, -tw * .35 + 2, 2.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(to * .3, -tw); g.lineTo(to * .3, tw); g.moveTo(to * .9, -tw * .9); g.lineTo(to * .9, tw * .9); g.stroke(); }
      if (base.top === 'ninja') { g.strokeStyle = pc.trim; g.lineWidth = 3; g.beginPath(); g.moveTo(to * .95, -tw * .6); g.lineTo(to * .4, tw * .3); g.stroke(); }
      if (base.top === 'crop') { g.fillStyle = pc.trim; }
    }
    function pelvisDetails(g, K) {
      const base = K.base, pc = K.pc, hw = base.hipW;
      g.lineWidth = 2; g.strokeStyle = OUT;
      if (base.top === 'gi' || base.top === 'coat' || base.bottom === 'tights' || base.top === 'ninja' || base.bottom === 'abada') {   // belt
        const c = base.top === 'gi' ? pc.belt : base.bottom === 'abada' ? pc.cord : base.top === 'ninja' ? pc.trim : base.top === 'coat' ? pc.trim : pc.band;
        g.fillStyle = c; g.beginPath(); g.roundRect(hw * .45, -hw * 1.0, 7, hw * 2.0, 2); g.fill(); g.stroke();
        if (base.top === 'gi' || base.bottom === 'abada') { g.beginPath(); g.moveTo(hw * .7, -hw * .8); g.lineTo(-hw * .3, -hw * 1.25); g.lineTo(-hw * .2, -hw * .9); g.closePath(); g.fill(); g.stroke(); }
      }
      if (base.bottom === 'shorts') { g.fillStyle = pc.bot2; g.beginPath(); g.roundRect(hw * .5, -hw * .95, 6, hw * 1.9, 2); g.fill(); g.stroke(); }
      if (base.bottom === 'mawashi') { g.fillStyle = pc.bot2; g.beginPath(); g.roundRect(hw * .2, -hw * .95, 9, hw * 1.9, 3); g.fill(); g.stroke();
        g.strokeStyle = pc.tassel; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(hw * .2, -hw * .7 + i * 6); g.lineTo(-hw * .7, -hw * .8 + i * 6); } g.stroke(); }
    }
    const EYE = new Path2D(); EYE.ellipse(0, 0, 1, 1.25, 0, 0, Math.PI * 2);
    function drawHead(g, B, K, p, flash, o) {
      const base = K.base, pc = K.pc, hr = K.hr, PT = K.parts, e = p.e;
      const ang = (90 - ANG.hd) * DEG;                         // head local: x forward, y up
      const hx = J.head[0], hy = J.head[1];
      setT(g, B, hx, hy, -(ANG.hd + ANG.r) * DEG);
      if (K.hair.back) { g.fillStyle = flash ? '#fff' : K.hair.f; g.fill(K.hair.back); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke(K.hair.back); }
      fillPart(g, PT.head, flash);
      if (flash) return;
      if (!base.robot && !base.masked) { g.fillStyle = K.parts.head.ff; g.beginPath(); g.ellipse(-hr * .12, -hr * .08, hr * .16, hr * .21, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 1.5; g.strokeStyle = K.skinShade; g.stroke(); g.beginPath(); g.arc(-hr * .12, -hr * .08, hr * .08, -1.2, 1.6); g.stroke(); }
      // face
      if (base.robot) robotFace(g, K, e, hr);
      else if (base.masked) maskFace(g, K, e, hr, o);
      else humanFace(g, K, e, hr, o);
      if (K.hair.front && base.hairStyle !== 'robot') { g.fillStyle = K.hair.f; g.fill(K.hair.p); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke(K.hair.p);
        if (base.hairStyle !== 'hat') { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.arc(-hr * .1, hr * .2, hr * .7, 1.1, 1.9); g.stroke(); } }
      if (base.hairStyle === 'hat') { g.fillStyle = K.hatBand; g.fillRect(-hr * .76, hr * .9, hr * 1.5, hr * .26); g.strokeStyle = OUT; g.lineWidth = 1.6; g.strokeRect(-hr * .76, hr * .9, hr * 1.5, hr * .26); }
      if (base.hairStyle === 'robot') { g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.moveTo(-hr * .2, hr * .85); g.lineTo(-hr * .35, hr * 1.55); g.stroke(); g.fillStyle = pc.trim; g.beginPath(); g.arc(-hr * .37, hr * 1.62, hr * .2, 0, Math.PI * 2); g.fill(); g.lineWidth = 2; g.stroke(); }
      if (base.headband) { g.strokeStyle = OUT; g.lineWidth = 2; g.fillStyle = pc.band; g.beginPath(); g.moveTo(-hr * .98, hr * .25); g.quadraticCurveTo(0, hr * .62, hr * .98, hr * .42); g.lineTo(hr * .95, hr * .2); g.quadraticCurveTo(0, hr * .38, -hr * .99, 0); g.closePath(); g.fill(); g.stroke();
        const sw = Math.sin((o && o.time || 0) * TAU96 * 2) * 3; g.beginPath(); g.moveTo(-hr * .95, hr * .15); g.quadraticCurveTo(-hr * 1.5, hr * .3 + sw, -hr * 1.9, -hr * .1 + sw); g.lineTo(-hr * 1.7, -hr * .3 + sw); g.quadraticCurveTo(-hr * 1.35, 0, -hr * .95, 0); g.fill(); g.stroke(); }
      if (base.mustache) { g.fillStyle = '#1c1412'; g.beginPath(); g.moveTo(hr * .55, -hr * .25); g.bezierCurveTo(hr * .9, -hr * .1, hr * 1.25, -hr * .35, hr * 1.15, -hr * .62); g.bezierCurveTo(hr * 1.35, -hr * .5, hr * 1.3, -hr * .15, hr * 1.0, -hr * .2);
        g.moveTo(hr * .55, -hr * .25); g.bezierCurveTo(hr * .3, -hr * .15, hr * .05, -hr * .4, hr * .1, -hr * .62); g.bezierCurveTo(-hr * .05, -hr * .4, hr * .1, -hr * .1, hr * .4, -hr * .15); g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke(); }
    }
    function eyes(g, K, e, hr, ex, ey, s) {
      g.lineWidth = 1.8; g.strokeStyle = OUT; g.lineCap = 'round';
      const dz = e === 3, hurt = e === 2, happy = e === 4, shout = e === 1;
      for (const [x, k] of [[ex, 1], [ex - hr * .42, .82]]) {
        if (hurt || happy) { g.beginPath(); if (hurt) { g.moveTo(x - 3 * k * s, ey + 3 * s); g.lineTo(x + 2 * k * s, ey); g.lineTo(x - 3 * k * s, ey - 3 * s); } else { g.moveTo(x - 3.5 * k * s, ey - 1 * s); g.quadraticCurveTo(x, ey + 4 * s, x + 3.5 * k * s, ey - 1 * s); } g.stroke(); continue; }
        if (dz) { g.beginPath(); for (let a = 0; a < 9; a += .5) { const r = a * .55 * s * k; g.lineTo(x + Math.cos(a + (K.spin || 0)) * r, ey + Math.sin(a + (K.spin || 0)) * r); } g.stroke(); continue; }
        g.fillStyle = '#fff'; g.save(); g.translate(x, ey); g.scale(3.6 * k * s, (shout ? 2.4 : 3.6) * s); g.fill(EYE); g.restore();
        g.fillStyle = '#1b1220'; g.beginPath(); g.arc(x + 1.2 * s, ey - .2 * s, 2.1 * k * s, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 1.8 * s, ey + .8 * s, .7 * s, 0, Math.PI * 2); g.fill();
      }
      // brows
      if (!happy && !dz) { g.lineWidth = 2.6 * s; g.strokeStyle = K.base.hair === '#d4d4de' ? '#9a9aa8' : OUT; g.beginPath();
        for (const [x, k] of [[ex, 1], [ex - hr * .42, .82]]) { const tilt = hurt ? -2.5 : 2.6; g.moveTo(x - 4 * k * s, ey + 5.2 * s + tilt * .6); g.lineTo(x + 3.6 * k * s, ey + 5 * s - tilt * .6); } g.stroke(); g.lineWidth = 1.8; }
    }
    function humanFace(g, K, e, hr, o) {
      const s = hr / 19, ex = hr * .58, ey = hr * .08;
      eyes(g, K, e, hr, ex, ey, s);
      // nose and mouth
      g.strokeStyle = OUT; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hr * .98, -hr * .05); g.quadraticCurveTo(hr * 1.12, -hr * .22, hr * .94, -hr * .3); g.stroke();
      const mx = hr * .66, my = -hr * .52;
      if (K.base.mask) { g.fillStyle = K.pc.mask; g.beginPath(); g.moveTo(hr * 1.1, -hr * .12); g.quadraticCurveTo(hr * .2, -hr * .05, -hr * .55, -hr * .2); g.lineTo(-hr * .3, -hr * .95); g.quadraticCurveTo(hr * .6, -hr * 1.05, hr * .95, -hr * .65); g.closePath(); g.fill(); g.lineWidth = 2; g.stroke(); return; }
      if (e === 1 || e === 2) { g.fillStyle = '#4a1418'; g.beginPath(); g.ellipse(mx, my, hr * .17, e === 1 ? hr * .14 : hr * .1, 0, 0, Math.PI * 2); g.fill(); g.stroke(); if (e === 1) { g.fillStyle = '#fff'; g.fillRect(mx - hr * .13, my + hr * .03, hr * .26, hr * .05); } }
      else if (e === 4) { g.fillStyle = '#4a1418'; g.beginPath(); g.moveTo(mx - hr * .22, my + hr * .08); g.quadraticCurveTo(mx, my - hr * .25, mx + hr * .22, my + hr * .08); g.closePath(); g.fill(); g.stroke(); }
      else if (e === 3) { g.beginPath(); g.moveTo(mx - hr * .18, my); for (let i = 1; i <= 4; i++) g.lineTo(mx - hr * .18 + i * hr * .09, my + (i % 2 ? 2.5 : -2.5) * s); g.stroke(); }
      else { g.beginPath(); g.moveTo(mx - hr * .2, my + hr * .02); g.lineTo(mx + hr * .16, my - hr * .02); g.stroke(); }
      if (K.base.cheek) { g.fillStyle = 'rgba(255,90,90,.28)'; g.beginPath(); g.ellipse(hr * .45, -hr * .28, hr * .2, hr * .13, 0, 0, Math.PI * 2); g.fill(); }
      if (K.base.wrinkles) { g.strokeStyle = 'rgba(80,40,30,.35)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(hr * .9, hr * .1); g.lineTo(hr * 1.0, hr * .02); g.moveTo(hr * .3, -hr * .62); g.quadraticCurveTo(hr * .38, -hr * .5, hr * .3, -hr * .42); g.stroke(); }
      if (K.base.glasses) { g.strokeStyle = K.pc.glasses; g.lineWidth = 1.8; g.beginPath(); g.arc(ex, ey, hr * .3, 0, Math.PI * 2); g.moveTo(ex - hr * .42 + hr * .26, ey); g.arc(ex - hr * .42, ey, hr * .26, 0, Math.PI * 2); g.moveTo(ex - hr * .3, ey + hr * .06); g.lineTo(-hr * .2, ey + hr * .15); g.stroke(); }
    }
    function robotFace(g, K, e, hr) {
      const pc = K.pc; g.fillStyle = pc.visor; g.beginPath(); g.roundRect(-hr * .1, -hr * .45, hr * 1.0, hr * .8, hr * .25); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
      g.fillStyle = pc.led; g.strokeStyle = pc.led; g.lineWidth = 2.6; g.lineCap = 'round';
      const ey = -hr * .05;
      for (const x of [hr * .62, hr * .22]) {
        g.beginPath();
        if (e === 2) { g.moveTo(x - 4, ey + 3); g.lineTo(x + 3, ey); g.lineTo(x - 4, ey - 3); g.stroke(); }
        else if (e === 3) { g.arc(x, ey, 4, 0, Math.PI * 1.5); g.stroke(); }
        else if (e === 4) { g.moveTo(x - 4, ey - 1); g.quadraticCurveTo(x, ey + 5, x + 4, ey - 1); g.stroke(); }
        else if (e === 1) { g.fillRect(x - 4, ey - 1.5, 8, 3.5); }
        else { g.arc(x, ey, 3.4, 0, Math.PI * 2); g.fill(); }
      }
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-hr * .02, hr * .12, hr * .8, hr * .08);
    }
    function maskFace(g, K, e, hr, o) {
      const pc = K.pc; g.fillStyle = '#f6f2fa'; g.beginPath(); g.moveTo(hr * .2, hr * .75); g.quadraticCurveTo(hr * 1.05, hr * .6, hr * 1.08, -hr * .1); g.quadraticCurveTo(hr * 1.0, -hr * .85, hr * .45, -hr * .95);
      g.quadraticCurveTo(hr * .05, -hr * .7, -hr * .05, 0); g.closePath(); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
      g.strokeStyle = 'rgba(120,80,170,.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(hr * .35, -hr * .55); g.quadraticCurveTo(hr * .7, -hr * .7, hr * .95, -hr * .5); g.stroke();
      const glow = e === 2 ? '#ffffff' : pc.eye;
      g.fillStyle = '#16091f'; for (const x of [hr * .75, hr * .35]) { g.beginPath(); g.ellipse(x, hr * .1, hr * .16, hr * .1, -.2, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = glow; g.shadowColor = glow; g.shadowBlur = 0; for (const x of [hr * .75, hr * .35]) { g.beginPath(); g.ellipse(x, hr * .1, hr * .08, hr * .05, -.2, 0, Math.PI * 2); g.fill(); }
    }
    function drawCape(g, B, K, o) {
      const t = (o && o.time) || 0, sh = J.sh, hp = J.hip, w = Math.sin(t * TAU96) * 6;
      g.setTransform(B[0], B[1], B[2], B[3], B[4], B[5]);
      g.fillStyle = K.capeIn; g.strokeStyle = OUT; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(J.shN[0] - 4, J.shN[1] + 4); g.quadraticCurveTo(hp[0] - 40 + w, hp[1], hp[0] - 34 + w * 1.5, 6);
      g.lineTo(hp[0] - 4 + w, 10); g.quadraticCurveTo(hp[0] + 2, hp[1] * .6, J.shF[0], J.shF[1] + 2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = K.capeF; g.beginPath(); g.moveTo(J.shN[0] - 4, J.shN[1] + 6); g.quadraticCurveTo(hp[0] - 44 + w, hp[1] + 4, hp[0] - 40 + w * 1.5, 14);
      g.quadraticCurveTo(hp[0] - 30, 20 + w, hp[0] - 22 + w, 12); g.quadraticCurveTo(hp[0] - 20, hp[1] * .7, sh[0] - 2, sh[1] + 2); g.closePath(); g.fill(); g.stroke();
    }
    function drawScarf(g, B, K, o, back) {
      const t = (o && o.time) || 0, n = J.neck, pc = K.pc;
      g.setTransform(B[0], B[1], B[2], B[3], B[4], B[5]);
      g.fillStyle = pc.scarf; g.strokeStyle = OUT; g.lineWidth = 2.2;
      if (back) {                                               // two tails streaming backwards
        const v = (o && o.vx ? Math.min(1, Math.abs(o.vx) / 6) : 0) * 10;
        for (const [dy, ph] of [[0, 0], [-6, 1.7]]) {
          g.beginPath(); g.moveTo(n[0] - 6, n[1] - 4 + dy);
          const w1 = Math.sin(t * TAU96 * 2 + ph) * 7, w2 = Math.sin(t * TAU96 * 2 + ph + 1.5) * 9;
          g.bezierCurveTo(n[0] - 26 - v, n[1] - 2 + dy + w1, n[0] - 44 - v, n[1] - 14 + dy + w2, n[0] - 62 - v * 1.5, n[1] - 8 + dy + w2);
          g.lineTo(n[0] - 58 - v * 1.5, n[1] - 18 + dy + w2); g.bezierCurveTo(n[0] - 42 - v, n[1] - 22 + dy + w1, n[0] - 24, n[1] - 12 + dy, n[0] - 4, n[1] - 12 + dy); g.closePath(); g.fill(); g.stroke();
        }
      } else { g.beginPath(); g.ellipse(n[0] + 2, n[1] - 4, 13, 7, -.15, 0, Math.PI * 2); g.fill(); g.stroke(); }
    }
    // base transform for a fighter: world camera (z = px per unit, cx = world x at screen centre, gy = screen y of the floor)
    function baseT(B, z, sx, sy, face) { B[0] = z * face; B[1] = 0; B[2] = 0; B[3] = -z; B[4] = sx; B[5] = sy; return B; }
    // ---------- sprite cache support: quantised pose key and the box a pose needs ----------
    const QP = new Float32Array(NF);
    function quant(p, o) {                                       // angles to 3 degrees, offsets to 1 unit
      const qa = QA.a, qx = QA.x;
      for (let i = 0; i < NF; i++) QP[i] = i === FI.x || i === FI.y ? Math.round(p[i] / qx) * qx : i === FI.lift ? p[i] : Math.round(p[i] / qa) * qa;
      QP.e = p.e; QP.h1 = p.h1; QP.h2 = p.h2; QP.g = p.g; QP.hide = p.hide; return QP;
    }
    function keyOf(C, pal, q, ph, mv) { let k = C.id + pal + '|' + q.e + q.h1 + q.h2 + q.g + q.hide + '|' + ph + mv; for (let i = 0; i < NF; i++) k += ',' + q[i]; return k; }
    const cloth = C => { const L = LOOK[C.id]; return !!(L.cape || L.scarf || L.headband); };
    function bounds(C, pal, p, out) {
      const K = kitless(C); fk(K, p);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const k in J) { const v = J[k]; if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0]; if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1]; }
      const L = LOOK[C.id], m = 24 + (L.thW > 14 ? 8 : 0), back = L.scarf ? 72 : L.cape ? 46 : L.headband ? 32 : 0, top = L.hairStyle === 'hat' || L.hairStyle === 'robot' || L.hairStyle === 'puff' ? 30 : 14;
      out[0] = x0 - m - back; out[1] = y0 - m; out[2] = x1 + m + (L.foot || 24); out[3] = y1 + m + top; return out;
    }
    const KL = {};
    function kitless(C) { if (KL[C.id]) return KL[C.id]; const base = LOOK[C.id], sz = C.H; return (KL[C.id] = { sz, th: base.th * sz, sh: base.sh * sz, ua: base.ua * sz, fa: base.fa * sz, to: base.to * sz, hr: base.hr, nk: base.nk * sz }); }
    const headOf = (C, p) => { fk(kitless(C), p); return J.head; };
    return { LOOK, POSE, P, Q, FI, poseOf, draw, kit, baseT, J, fk, shade, hex, lerpInto, keys, copy, pose, quant, keyOf, bounds, cloth, headOf, QA };
  }
  const Rig = RigFactory();
