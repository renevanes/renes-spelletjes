  /* ---------- core: physics world, level builder, rules and a solver bot (no DOM, runs headless too) ---------- */
  const KP = (() => {
    const { World, Vec2, Box, Circle, Polygon, Edge, Settings } = PL;
    Settings.linearSleepTolerance = .03; Settings.angularSleepTolerance = .05; Settings.timeToSleep = .4;
    const DT = 1 / 60, GRAV = 10, VMAX = 20, MAXPULL = 2.2, REST = { x: 0, y: -2.65 }, XMIN = -22;
    // materials: density, friction, restitution, toughness (hp per kg), minimum hp, points when broken
    const MAT = {
      w: { d: .7, f: .7, e: .08, tough: 14, min: 3, pts: 500 },
      g: { d: .55, f: .4, e: .05, tough: 7, min: 1.5, pts: 300 },
      s: { d: 2.2, f: .85, e: .02, tough: 22, min: 13, pts: 800 },
      p: { d: .5, f: .8, e: .05, tough: 0, min: 1e9, pts: 0 },
    };
    // de Bollen: radius, density, restitution, and against which material they are extra strong
    const CRIT = {
      b: { r: .38, d: 3, e: .3, strong: {} },
      s: { r: .3, d: 3, e: .3, strong: { g: 2.6 } },
      f: { r: .34, d: 2.6, e: .25, strong: { w: 2.4 } },
      k: { r: .5, d: 8, e: .1, strong: { s: 2.2 } },
      n: { r: .43, d: 3.2, e: .2, strong: {} },
    };
    // raccoons: 1 = klein, 2 = met halsdoek, 3 = de baas
    const RAC = [null, { r: .4, tough: 9, min: 3 }, { r: .55, tough: 9, min: 5.5 }, { r: .72, tough: 10, min: 12 }];
    const RACM = { d: 1, f: .7, e: .1 };

    /* level builder: x = centre, y = height of the bottom above the ground (metres, y up while authoring) */
    function builder() {
      const items = [];
      const L = {
        items,
        box(m, x, y, w, h, a = 0) { items.push({ t: 'box', m, x, y: -(y + h / 2), w, h, a }); return y + h; },
        tri(m, x, y, w, h, dir = 0) { items.push({ t: 'tri', m, x, y: -y, w, h, dir }); return y + h; },
        circ(m, x, y, r) { items.push({ t: 'circ', m, x, y: -(y + r), r }); return y + 2 * r; },
        rac(x, y, s = 1) { items.push({ t: 'rac', x, y: -(y + RAC[s].r + .005), s, r: RAC[s].r }); },
        prop(x, y) { items.push({ t: 'prop', m: 'p', x, y: -(y + .3), w: 1, h: .6 }); return y + .6; },
        ter(x, y, w, h) { items.push({ t: 'ter', x, y: -(y + h / 2), w, h }); return y + h; },
        // a mound of earth: bottom width w, top width tw, height h (static)
        hill(x, w, tw, h) { items.push({ t: 'hill', x, y: 0, w, tw, h, pts: [[-w / 2, 0], [w / 2, 0], [tw / 2, -h], [-tw / 2, -h]] }); return h; },
        // two posts with a plank on top
        frame(m, x, y, w, h, pm = m, t = .25) { const d = w / 2 - t / 2; L.box(pm, x - d, y, t, h); L.box(pm, x + d, y, t, h); return L.box(m, x, y + h, w, t); },
        // stack of frames, materials per floor
        tower(ms, x, y, w, h) { for (const m of ms) y = L.frame(m, x, y, w, h); return y; },
      };
      return L;
    }
    const triPts = it => it.dir === 0 ? [[-it.w / 2, 0], [it.w / 2, 0], [0, -it.h]] : it.dir > 0 ? [[-it.w / 2, 0], [it.w / 2, 0], [-it.w / 2, -it.h]] : [[-it.w / 2, 0], [it.w / 2, 0], [it.w / 2, -it.h]];

    /* the 20 levels: n name, th theme (0 park, 1 haven, 2 kasteel), c critters in order, st [2 stars, 3 stars] */
    const LEVELS = [
      { n: 'Picknickveld', th: 0, c: 'bbb', b(L) {
        L.frame('w', 18, 0, 2.2, 1.1); L.rac(18, 0, 1); L.rac(18, 1.35, 1);
        L.box('g', 20.2, 0, .8, .8); L.box('g', 20.2, .8, .8, .8);
      } },
      { n: 'Twee torentjes', th: 0, c: 'bbb', b(L) {
        let y = L.tower(['w', 'g'], 17, 0, 1.7, 1.05); L.rac(17, 0, 1); L.rac(17, 1.3, 1); L.tri('w', 17, y, 1.4, .8);
        y = L.tower(['w', 'g'], 22, 0, 1.7, 1.05); L.rac(22, 1.3, 1); L.rac(22, y, 1);
        L.box('w', 19.5, 0, .25, 1.6); L.box('w', 19.5, 1.6, 1.3, .25);
      } },
      { n: 'Glazen kas', th: 0, c: 'sss', b(L) {
        for (const x of [17, 19.1, 21.2]) { L.frame('g', x, 0, 1.9, 1.05, 'g'); L.rac(x, 0, 1); }
        const y = L.frame('g', 19.1, 1.3, 1.9, 1, 'g'); L.rac(19.1, 1.3, 1);
        L.tri('g', 17, 1.3, 1.6, .8); L.tri('g', 21.2, 1.3, 1.6, .8); L.tri('w', 19.1, y, 1.6, .7);
      } },
      { n: 'Op de heuvel', th: 0, c: 'bsbs', b(L) {
        const h = L.hill(21, 9, 4.2, 2);
        L.frame('w', 21, h, 2.6, 1.15); L.rac(20.4, h, 1); L.rac(21.6, h, 1);
        const y = L.frame('g', 21, h + 1.4, 2.6, 1); L.rac(21, h + 1.4, 1); L.tri('w', 21, y, 2, .9);
        L.box('w', 26, 0, .25, 1.4); L.rac(27, 0, 1); L.box('w', 28, 0, .25, 1.4); L.box('w', 27, 1.4, 2.3, .25);
      } },
      { n: 'Houten schutting', th: 0, c: 'fffb', b(L) {
        for (const x of [16.2, 16.8]) L.box('w', x, 0, .25, 1.7);
        L.box('w', 16.5, 1.7, 1.2, .25);
        L.frame('w', 20, 0, 2.2, 1.15); L.rac(20, 0, 2);
        const y = L.frame('w', 20, 1.4, 2.2, 1.1); L.rac(20, 1.4, 1); L.box('w', 20, y, .8, .8);
        L.frame('w', 23.2, 0, 1.6, 1.1); L.rac(23.2, 0, 1); L.rac(23.2, 1.35, 1);
      } },
      { n: 'Boomhut', th: 0, c: 'bsfb', b(L) {
        let y = L.frame('w', 21, 0, 1.9, 1.2); y = L.tower(['g', 'w', 'g'], 21, y, 1.9, 1.05);
        L.rac(21, 0, 2); L.rac(21, 2.75, 1); L.rac(21, y, 1);
        L.box('w', 18.3, 0, .5, .5); L.box('w', 18.3, .5, .5, .5); L.rac(18.3, 1, 1);
        L.box('g', 23.8, 0, 1, 1); L.box('g', 23.8, 1, 1, 1); L.rac(23.8, 2, 1);
      } },
      { n: 'Picknicktafel', th: 0, c: 'bsfb', b(L) {
        L.frame('w', 18.5, 0, 2.2, 1.2); L.rac(18.5, 0, 1); L.frame('g', 18.5, 1.45, 2.2, .9); L.rac(18.5, 1.45, 1);
        L.frame('w', 23.5, 0, 2.2, 1.2); L.rac(23.5, 0, 1); L.frame('g', 23.5, 1.45, 2.2, .9); L.rac(23.5, 1.45, 1);
        L.box('w', 21, 0, .5, 2.6); L.box('w', 21, 2.6, 7.6, .3);
        const y = L.frame('w', 21, 2.9, 3.2, 1.55); L.rac(20.5, 2.9, 3); L.prop(21.75, 2.9); L.tri('g', 21, y, 2.2, .9);
      } },
      { n: 'Strandhuisjes', th: 1, c: 'kkbk', b(L) {
        for (const [x, r] of [[17, 1], [20, 2], [23, 1]]) {
          const y = L.frame('s', x, 0, 2, 1.3, 'w'); L.rac(x, 0, r); L.tri('s', x, y, 2, .9);
        }
      } },
      { n: 'De steiger', th: 1, c: 'bkfs', b(L) {
        const h = L.ter(23, 0, 9, 1.6);
        L.box('w', 17.9, 0, .4, 1.6);
        let y = L.frame('w', 20.5, h, 2, 1.1, 'w'); L.rac(20.5, h, 1); L.box('g', 20.5, y, .9, .9);
        y = L.frame('s', 23.2, h, 2.2, 1.2, 'w'); L.rac(23.2, h, 2); L.frame('g', 23.2, y, 1.6, 1); L.rac(23.2, y, 1);
        L.frame('w', 26, h, 1.8, 1.1, 'g'); L.rac(26, h, 1);
      } },
      { n: 'Vuurtoren', th: 1, c: 'fksb', b(L) {
        let y = L.tower(['s', 'w', 'g', 'w', 'g'], 22, 0, 1.6, 1.05);
        L.rac(22, 0, 1); L.rac(22, 2.6, 1); L.rac(22, 5.2, 1); L.tri('w', 22, y, 1.6, .9);
        L.box('w', 19, 0, .25, 1.3); L.box('w', 19.8, 0, .25, 1.3); L.box('s', 19.4, 1.3, 1.3, .3); L.rac(19.4, 1.6, 1);
      } },
      { n: 'Zandkasteel', th: 1, c: 'skbs', b(L) {
        L.frame('s', 18.4, 0, 2, 1.15, 'g'); L.rac(18.4, 0, 1);
        L.frame('s', 20.6, 0, 2, 1.15, 'g'); L.rac(20.6, 0, 2);
        L.frame('s', 22.8, 0, 2, 1.15, 'g'); L.rac(22.8, 0, 1);
        L.frame('g', 19.5, 1.4, 2, 1, 's'); L.rac(19.5, 1.4, 1);
        L.frame('g', 21.7, 1.4, 2, 1, 's'); L.rac(21.7, 1.4, 1);
        L.frame('s', 20.6, 2.65, 1.8, 1, 'g'); L.rac(20.6, 2.65, 1); L.tri('s', 20.6, 3.9, 1.6, .8);
      } },
      { n: 'Containers', th: 1, c: 'nnb', b(L) {
        L.box('s', 18, 0, 1, 1); L.box('s', 18, 1, 1, 1); L.box('s', 21, 0, 1, 1); L.box('s', 21, 1, 1, 1);
        L.rac(19.5, 0, 2); L.box('s', 19.5, 2, 4.2, .35);
        L.box('s', 18.6, 2.35, 1, 1); L.box('s', 20.4, 2.35, 1, 1); L.rac(19.5, 2.35, 1);
        L.box('w', 19.5, 3.35, 2.8, .3); L.rac(19.5, 3.65, 1);
        L.box('s', 23.8, 0, 1, 1); L.box('s', 25.8, 0, 1, 1); L.box('s', 24.8, 1, 3, .3); L.rac(24.8, 0, 1); L.rac(24.8, 1.3, 1);
      } },
      { n: 'Achter de duinen', th: 1, c: 'sknf', b(L) {
        L.hill(17, 6, 1.6, 3.2);
        L.frame('w', 21, 0, 2, 1.1); L.rac(21, 0, 1); L.frame('g', 21, 1.35, 2, 1); L.rac(21, 1.35, 1);
        L.frame('s', 24, 0, 2, 1.15, 'w'); L.rac(24, 0, 2); L.box('g', 24, 1.4, .9, .9); L.rac(24, 2.3, 1);
        L.hill(28, 4, 1.2, 1.4); L.rac(28, 1.4, 1);
      } },
      { n: 'Havenhoofd', th: 1, c: 'knfsb', b(L) {
        const h = L.ter(24, 0, 10, 1);
        L.box('s', 19.6, h, .5, .5); L.rac(19.6, h + .5, 1);
        let y = L.tower(['s', 'w'], 22, h, 2.2, 1.15); L.rac(22, h, 2); L.rac(22, h + 1.4, 1); L.frame('g', 22, y, 2.2, 1, 'g'); L.rac(22, y, 1);
        y = L.tower(['w', 's'], 25.4, h, 2.2, 1.15); L.rac(25.4, h, 1); L.rac(25.4, h + 1.4, 2); L.tri('s', 25.4, y, 2.2, 1);
        L.box('w', 27.8, h, .4, 2.2); L.rac(28.6, h, 1);
      } },
      { n: 'Poortgebouw', th: 2, c: 'knk', b(L) {
        L.box('s', 18, 0, .9, 2.2); L.box('s', 21.6, 0, .9, 2.2); L.box('s', 19.8, 2.2, 4.5, .4);
        L.rac(19.8, 0, 2); L.box('w', 19.1, 0, .25, 1.2); L.box('w', 20.5, 0, .25, 1.2);
        L.box('s', 18, 2.6, .6, .6); L.box('s', 21.6, 2.6, .6, .6); L.rac(19.8, 2.6, 1);
        L.frame('s', 25, 0, 2, 1.3, 'w'); L.rac(25, 0, 1); L.rac(25, 1.6, 1);
      } },
      { n: 'Wachttorens', th: 2, c: 'fnsk', b(L) {
        let y = L.tower(['s', 'w', 'g'], 18.5, 0, 1.7, 1.05); L.rac(18.5, 0, 1); L.rac(18.5, 1.3, 1); L.rac(18.3, y, 1);
        y = L.tower(['s', 'w', 'g'], 24.5, 0, 1.7, 1.05); L.rac(24.5, 0, 1); L.rac(24.5, 2.6, 1); L.tri('s', 24.7, y, 1.2, .8);
        L.box('w', 21.5, 3.9, 5, .25);
        L.box('s', 21.5, 0, .6, .6); L.rac(21.5, .6, 2);
      } },
      { n: 'De kerker', th: 2, c: 'nkk', b(L) {
        L.ter(17.5, 0, 1.4, 1.2);
        L.box('s', 19.3, 0, .5, 1.2); L.box('s', 23.7, 0, .5, 1.2); L.box('s', 21.5, 1.2, 4.9, .45);
        L.rac(20.4, 0, 1); L.rac(21.5, 0, 2); L.rac(22.6, 0, 1);
        L.frame('w', 21.5, 1.65, 2.6, 1.1, 's'); L.rac(21.5, 1.65, 1); L.tri('s', 21.5, 3, 2.4, 1);
        L.ter(25.5, 0, 1.4, 1.2);
      } },
      { n: 'Ophaalbrug', th: 2, c: 'snfkb', b(L) {
        const h = L.ter(25, 0, 7, 2.2);
        L.box('w', 19.8, 0, .3, 2.2); L.rac(19, 0, 1);
        let y = L.frame('s', 23.2, h, 2, 1.2, 'w'); L.rac(23.2, h, 1); L.frame('g', 23.2, y, 2, 1); L.rac(23.2, y, 1);
        y = L.tower(['w', 's'], 26.6, h, 2, 1.2); L.rac(26.6, h, 2); L.rac(26.6, h + 1.45, 1); L.tri('w', 26.6, y, 1.8, .9);
      } },
      { n: 'Troonzaal', th: 2, c: 'knsfk', b(L) {
        L.frame('s', 18.5, 0, 2, 1.2, 'w'); L.rac(18.5, 0, 1); L.frame('g', 18.5, 1.45, 2, 1); L.rac(18.5, 1.45, 1);
        L.box('s', 21, 0, .6, 3.6); L.box('s', 26, 0, .6, 3.6); L.box('s', 23.5, 3.6, 5.8, .4);
        L.frame('w', 23.5, 0, 3.2, 1.6, 'g'); L.rac(24, 0, 3); L.prop(22.7, 0);
        L.rac(23.5, 1.85, 1);
        const y = L.frame('g', 23.5, 4, 2.2, 1.2, 's'); L.rac(23.5, 4, 2); L.tri('s', 23.5, y, 2, .9);
        L.frame('s', 28.5, 0, 2, 1.2, 'w'); L.rac(28.5, 0, 1);
      } },
      { n: 'De grote picknickmand', th: 2, c: 'bsfknk', b(L) {
        L.box('w', 17, 0, .25, 1.6); L.box('w', 17.8, 0, .25, 1.6); L.box('w', 17.4, 1.6, 1.3, .25); L.rac(17.4, 1.85, 1);
        let y = L.tower(['s', 'g', 'w'], 20.5, 0, 2, 1.1); L.rac(20.5, 0, 1); L.rac(20.5, 1.35, 1); L.rac(20.5, 2.7, 1); L.tri('g', 20.5, y, 1.8, .8);
        L.box('s', 23.5, 0, .7, 2.6); L.box('s', 28.5, 0, .7, 2.6); L.box('s', 26, 2.6, 5.9, .4);
        L.frame('w', 26, 0, 4, 1.5, 'g'); L.rac(26.1, 0, 3); L.prop(24.8, 0); L.rac(27.3, 0, 1);
        y = L.tower(['w', 'g'], 26, 3, 2.4, 1.15); L.rac(26, 3, 2); L.rac(26, 4.4, 1); L.tri('s', 26, y, 2.2, .9);
        L.frame('s', 31.2, 0, 1.8, 1.2, 'w'); L.rac(31.2, 0, 1); L.rac(31.2, 1.45, 1);
      } },
    ];

    // star thresholds [2 stars, 3 stars], derived from the solver bot's best score per level (60 and 85 percent)
    const ST = [[19000,  27000],  [18000,  25000],  [22000,  31000],  [28000,  40000],  [30000,  42000],  [32000,  46000],  [40000,  56000],  [31000,  44000],  [30000,  42000],  [37000,  53000],  [42000,  60000],  [44000,  62000],  [31000,  44000],  [40000,  57000],  [33000,  47000],  [31000,  44000],  [35000,  49000],  [42000,  59000],  [55000,  78000],  [63000,  90000]];
    LEVELS.forEach((L, i) => { L.st = ST[i]; });

    function Sim(li, ev = () => {}) {
      const LV = LEVELS[li], world = new World({ gravity: Vec2(0, GRAV) });
      const objs = [], kill = [];
      let n = 0, dmgOn = false;
      const S = { li, LV, world, objs, score: 0, crits: [], queue: [...LV.c], rac: 0, racs: 0, fired: 0, ko: 0, broke: 0, active: null, ev, n: 0 };
      const gnd = world.createBody(); gnd.createFixture(Edge(Vec2(-80, 0), Vec2(240, 0)), { friction: .9, restitution: .05 }); gnd.setUserData({ k: 'gnd' });
      function make(it) {
        const o = Object.assign({}, it, { id: objs.length, dead: false, hit: false });
        let b;
        if (it.t === 'ter' || it.t === 'hill') {
          b = world.createBody({ position: Vec2(it.x, it.y) });
          b.createFixture(it.t === 'ter' ? Box(it.w / 2, it.h / 2) : Polygon(it.pts.map(([x, y]) => Vec2(x, y))), { friction: .9, restitution: .05 });
          o.k = 'ter';
        } else {
          const crit = it.t === 'crit', rac = it.t === 'rac';
          b = world.createDynamicBody({ position: Vec2(it.x, it.y), angle: it.a || 0, angularDamping: rac ? 1.2 : crit ? .6 : .05, bullet: crit });
          const M = crit ? CRIT[it.type] : rac ? RACM : MAT[it.m];
          const fd = { density: M.d, friction: crit ? .6 : M.f, restitution: M.e };
          if (it.t === 'box' || it.t === 'prop') b.createFixture(Box(it.w / 2, it.h / 2), fd);
          else if (it.t === 'tri') b.createFixture(Polygon(triPts(it).map(([x, y]) => Vec2(x, y))), fd);
          else b.createFixture(Circle(it.r), fd);
          o.k = crit ? 'crit' : rac ? 'rac' : it.t === 'prop' ? 'prop' : 'blk';
          if (!crit) { const mass = b.getMass(); o.max = o.hp = rac ? Math.max(RAC[it.s].min, mass * RAC[it.s].tough) : Math.max(M.min, mass * M.tough); }
          if (rac) { S.rac++; S.racs++; }
        }
        b.setUserData(o); o.body = b; objs.push(o); return o;
      }
      const L = builder(); LV.b(L); L.items.forEach(make);
      let right = 10, top = 0;
      for (const o of objs) { const e = o.w ? o.w / 2 : o.r || 1; right = Math.max(right, o.x + e); top = Math.min(top, o.y - (o.h || o.r * 2 || 1)); }
      S.right = right; S.top = top; S.xmax = right + 26;
      let cx0 = 1e9, cx1 = -1e9; for (const o of objs) if (o.k !== 'ter') { cx0 = Math.min(cx0, o.x); cx1 = Math.max(cx1, o.x); }
      S.mid = (cx0 + cx1) / 2;
      // let everything find its rest, then freeze it: nothing moves before the first shot
      for (let i = 0; i < 180; i++) world.step(DT, 8, 3);
      for (const o of objs) if (o.k !== 'ter') { o.body.setLinearVelocity(Vec2(0, 0)); o.body.setAngularVelocity(0); o.body.setAwake(false); }
      dmgOn = true;

      world.on('begin-contact', c => {
        c.__s = n;
        const A = c.getFixtureA().getBody().getUserData(), B = c.getFixtureB().getBody().getUserData();
        if (A.k === 'crit' && !A.hit) critHit(A, B); if (B.k === 'crit' && !B.hit) critHit(B, A);
      });
      world.on('post-solve', (c, imp) => {
        if (!dmgOn || !(n - c.__s <= 3)) return;
        const ni = imp.normalImpulses, pc = c.getManifold().pointCount; let p = 0;
        for (let i = 0; i < pc; i++) p += ni[i];
        if (p < .35) return;
        const A = c.getFixtureA().getBody().getUserData(), B = c.getFixtureB().getBody().getUserData();
        hurt(A, B, p, c); hurt(B, A, p, c);
      });
      function critHit(o, by) { o.hit = true; o.hitN = n; if (o.type !== 'n') o.used = true; o.body.setAngularDamping(2.5); o.body.setLinearDamping(.25); ev('chit', o, by); }
      function hurt(o, by, p, c) {
        if (o.dead || o.dying) return;
        if (o.k !== 'blk' && o.k !== 'rac') { if (o.k === 'crit' || o.k === 'prop') ev('thump', o, by, p, c); return; }
        let d = p - .3;
        if (by.k === 'crit') d *= (o.k === 'rac' ? 1.4 : CRIT[by.type].strong[o.m] || 1) * (by.heavy ? 1.5 : 1);
        o.hp -= d; o.hurtN = n;
        S.score += Math.round(Math.min(d, o.max) * 4) * 10;
        ev('hit', o, by, p, c);
        if (o.hp <= 0) { o.dying = true; kill.push(o); }
      }
      function reap() {
        for (const o of kill) {
          if (o.dead) continue;
          ev(o.k === 'rac' ? 'ko' : o.k === 'blk' ? 'break' : 'poof', o);
          o.dead = true; world.destroyBody(o.body);
          if (o.k === 'rac') { S.rac--; S.ko++; S.score += 5000; }
          else if (o.k === 'blk') { S.broke++; S.score += MAT[o.m].pts; }
        }
        kill.length = 0;
      }
      function explode(o) {
        if (o.boomed) return; o.boomed = o.used = true;
        const p = o.body.getWorldCenter(), px = p.x, py = p.y, R = 3.4;
        ev('boom', o, px, py);
        for (const q of objs) {
          if (q.dead || q.dying || q === o || q.k === 'ter') continue;
          const b = q.body, c = b.getWorldCenter(), dx = c.x - px, dy = c.y - py, l = Math.hypot(dx, dy) || .01;
          const d = Math.max(0, l - (q.r || Math.min(q.w, q.h) / 2 || .3));
          if (d > R) continue;
          const f = 1 - d / R, J = Math.min(b.getMass() * 15, 34) * f;
          b.applyLinearImpulse(Vec2(dx / l * J, dy / l * J - J * .3), c, true);
          if (q.k === 'blk' || q.k === 'rac') {
            const dm = f * 26 * (q.k === 'rac' ? 1.2 : { g: 1.6, w: 1.2, s: .75 }[q.m]);
            q.hp -= dm; S.score += Math.round(Math.min(dm, q.max) * 4) * 10; q.hurtN = n;
            if (q.hp <= 0) { q.dying = true; kill.push(q); }
          }
        }
        o.dying = true; kill.push(o);
      }
      // where the critter sits for a given pull (pull = offset from the rest point, clamped)
      S.clampPull = (x, y, r) => {
        let l = Math.hypot(x, y); if (l > MAXPULL) { x *= MAXPULL / l; y *= MAXPULL / l; l = MAXPULL; }
        const maxY = -r - .06 - REST.y; if (y > maxY) y = maxY;
        return [x, y];
      };
      S.velFor = (x, y) => [-x / MAXPULL * VMAX, -y / MAXPULL * VMAX];
      S.launch = (pullx, pully) => {
        const t = S.queue.shift(); if (!t) return null;
        const [x, y] = S.clampPull(pullx, pully, CRIT[t].r), [vx, vy] = S.velFor(x, y);
        const o = make({ t: 'crit', type: t, x: REST.x + x, y: REST.y + y, r: CRIT[t].r });
        o.body.setLinearVelocity(Vec2(vx, vy)); o.t0 = n; o.used = t === 'b'; o.rest = 0;
        S.crits.push(o); S.fired++; S.active = o; S.tt = 0; S.ct = 0;
        return o;
      };
      S.canAbility = () => { const o = S.active; return !!o && !o.dead && !o.dying && !o.used; };
      S.ability = () => {
        const o = S.active; if (!S.canAbility()) return false;
        const b = o.body, p = b.getPosition(), v = b.getLinearVelocity(), sp = Math.hypot(v.x, v.y) || 1;
        o.used = true;
        if (o.type === 's') {
          const nx = -v.y / sp, ny = v.x / sp;
          for (const s of [-1, 1]) {
            const a = .2 * s, cs = Math.cos(a), sn = Math.sin(a);
            const k = make({ t: 'crit', type: 's', x: p.x + nx * s * .72, y: p.y + ny * s * .72, r: CRIT.s.r });
            k.body.setLinearVelocity(Vec2(v.x * cs - v.y * sn, v.x * sn + v.y * cs)); k.used = true; k.clone = true; k.t0 = n; k.rest = 0; k.hit = o.hit;
            S.crits.push(k);
          }
          ev('split', o);
        } else if (o.type === 'f') {
          const ns = Math.min(40, sp * 1.6 + 9); b.setLinearVelocity(Vec2(v.x / sp * ns, v.y / sp * ns)); o.boost = n; ev('boost', o);
        } else if (o.type === 'k') {
          b.setLinearVelocity(Vec2(v.x * .2, Math.max(v.y, 0) + 24)); o.heavy = true;
          const f = b.getFixtureList(); f.setDensity(CRIT.k.d * 2); b.resetMassData(); o.dive = n; ev('dive', o);
        } else if (o.type === 'n') explode(o);
        else { o.used = true; return false; }
        return true;
      };
      S.step = () => {
        n++; S.n = n;
        world.step(DT, 8, 3);
        for (const o of S.crits) {
          if (o.dead || o.dying) continue;
          const b = o.body, p = b.getPosition(), v = b.getLinearVelocity(), age = (n - o.t0) * DT;
          if (o.type === 'n' && o.hit && !o.boomed && n - o.hitN > 105) { explode(o); continue; }
          o.rest = Math.hypot(v.x, v.y) < .45 ? o.rest + DT : 0;
          if ((o.rest > .9 && o.hit) || age > 8 || p.x < XMIN || p.x > S.xmax || p.y > 3) { if (o.type === 'n' && !o.boomed && o.hit) explode(o); else { o.dying = true; kill.push(o); } }
        }
        if (n % 15 === 0) for (const o of objs) {
          if (o.dead || o.dying || o.k === 'ter' || o.k === 'crit') continue;
          const p = o.body.getPosition();
          if (p.x < XMIN || p.x > S.xmax || p.y > 3) { o.dying = true; o.out = true; kill.push(o); }
        }
        reap();
      };
      S.calm = () => {
        for (const o of objs) {
          if (o.dead || o.k === 'ter') continue;
          const b = o.body; if (!b.isAwake()) continue;
          const v = b.getLinearVelocity(); if (v.x * v.x + v.y * v.y > .05 || Math.abs(b.getAngularVelocity()) > .35) return false;
        }
        return true;
      };
      S.live = () => S.crits.some(o => !o.dead);
      // call once per step after a launch; true when the shot is completely over
      S.turnTick = () => {
        S.tt++;
        if (!S.live() && S.calm()) S.ct++; else S.ct = 0;
        if (S.tt > 14 * 60) { for (const o of S.crits) if (!o.dead && !o.dying) { o.dying = true; kill.push(o); } reap(); return true; }
        return S.ct > (S.rac ? 24 : 40);
      };
      S.bonus = () => S.queue.length * 10000;
      S.stars = total => { const st = LV.st || [S.racs * 5000 + 10000, S.racs * 5000 + 25000]; return total >= st[1] ? 3 : total >= st[0] ? 2 : 1; };
      // snapshot of the level objects between shots (used by the solver bot)
      S.snap = () => ({ n, score: S.score, queue: [...S.queue], fired: S.fired, o: objs.filter(o => o.k !== 'crit').map(o => {
        if (o.dead) return null; const b = o.body, p = b.getPosition(), v = b.getLinearVelocity();
        return [o.hp, p.x, p.y, b.getAngle(), v.x, v.y, b.getAngularVelocity(), b.isAwake()];
      }) });
      S.restore = sn => {
        dmgOn = false;
        sn.o.forEach((r, i) => {
          const o = objs[i]; if (!o || o.k === 'ter') return;
          if (!r) { o.dead = true; world.destroyBody(o.body); if (o.k === 'rac') { S.rac--; S.ko++; } return; }
          const b = o.body; o.hp = r[0]; b.setTransform(Vec2(r[1], r[2]), r[3]); b.setLinearVelocity(Vec2(r[4], r[5])); b.setAngularVelocity(r[6]); b.setAwake(r[7]);
        });
        n = sn.n; S.n = n; S.score = sn.score; S.queue = [...sn.queue]; S.fired = sn.fired; dmgOn = true;
      };
      return S;
    }

    /* solver bot: greedy search over angle / power / ability moment, one critter at a time */
    function pullFor(ang, pow) { const a = ang * Math.PI / 180; return [-Math.cos(a) * pow * MAXPULL, Math.sin(a) * pow * MAXPULL]; }
    function playShot(S, shot, onStep) {
      const [px, py] = pullFor(shot.a, shot.p);
      const o = S.launch(px, py); if (!o) return;
      for (let i = 0; i < 15 * 60; i++) {
        if (shot.ax != null && S.canAbility()) {
          const b = S.active.body, p = b.getPosition();
          if (shot.ax === 'hit' ? S.active.hit : shot.ax < 0 ? (i * DT >= -shot.ax) : p.x >= shot.ax) S.ability();
        }
        S.step(); if (onStep) onStep(S);
        if (S.turnTick()) break;
      }
    }
    function candidates(S, type) {
      const out = [], racX = S.objs.filter(o => o.k === 'rac' && !o.dead).map(o => +o.body.getPosition().x.toFixed(1));
      const ab = type === 's' ? [null, S.mid - 9, S.mid - 6] : type === 'f' ? [null, S.mid - 11, S.mid - 7] : type === 'k' ? [null, ...racX.slice(0, 5)] : type === 'n' ? [null, 'hit'] : [null];
      for (let a = -10; a <= 72; a += 6) for (const p of [.62, .76, .88, 1]) for (const ax of ab) out.push({ a, p, ax });
      return out;
    }
    function solve(li, opt = {}) {
      const shots = [], replay = () => { const T = Sim(li); for (const sh of shots) playShot(T, sh); return T; };
      let S = Sim(li);
      while (S.queue.length && S.rac > 0) {
        const type = S.queue[0];
        let best = null, bv = -1;
        const tryShot = sh => { const T = replay(); playShot(T, sh); const v = (T.racs - T.rac) * 1e6 + T.score + (T.rac === 0 ? 1e9 + T.queue.length * 1e7 : 0); if (v > bv) { bv = v; best = sh; } };
        for (const sh of candidates(S, type)) tryShot(sh);
        for (const da of [-3, -1.5, 1.5, 3]) for (const dp of [-.05, 0, .05]) tryShot({ a: best.a + da, p: Math.min(1, best.p + dp), ax: best.ax });
        shots.push(best); S = replay();
        if (opt.log) opt.log(li, type, best, S.rac, S.score);
      }
      const total = S.score + (S.rac === 0 ? S.bonus() : 0);
      return { level: li + 1, win: S.rac === 0, used: S.fired, of: LEVELS[li].c.length, score: total, shots, left: S.rac };
    }
    return { DT, VMAX, MAXPULL, REST, MAT, CRIT, RAC, LEVELS, Sim, solve, playShot, pullFor, triPts, Vec2 };
  })();
