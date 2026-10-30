  /* ================= levels.js: the worlds, the items and the 16 machine rooms (pure logic, also runs in Node) =================
     A room is 14 x 9 units, y grows downwards, floors are horizontal walkways (y = the floor surface).
     Every object: { id, k (drawing kind), x (centre), y (bottom, default: its floor), w, h, f (floor) } plus
       take: item      tapping picks it up              push: x        tapping pushes it to x
       say: text       Woef's remark when tapped        far: 1         a remark without walking there
       block: 1        Woef cannot walk through it      front: 1       Woef stands right in front of it
       sx/sf           explicit stand point             cu: 1          tapping opens a close-up (L.cu[id])
     Level hooks (all deterministic, S = state, A = action api from the core):
       tick(S, A)  hazard(S) -> [{ f, x0, x1, ph (0 rest, 1 wind-up, 2 active), p, kind, cx }]
       tap(S, A, id) / use(S, A, item, id) / comb(S, A, a, b) / bark(S, A) / pick(S, A, id, v) / pushed(S, A, id) -> true when handled
       ev: { name(S, A, arg) } for A.after(ticks, name, arg);  stage(S) -> index into hints;  sol: the scripted solution (tests) */
  const TAU = Math.PI * 2, TPS = 60;
  const F = (id, y, x0, x1) => ({ id, y, x0, x1 });
  const LAD = (x, a, b) => ({ x, a, b });
  const has = (S, it) => S.inv.includes(it);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // a repeating attack: rest, wind-up (the machine shows what it will do), active
  function cyc(t, per, wind, act, off = 0) {
    const k = (t + off) % per, rest = per - wind - act;
    if (k < rest) return { ph: 0, p: k / rest };
    if (k < rest + wind) return { ph: 1, p: (k - rest) / wind };
    return { ph: 2, p: (k - rest - wind) / act };
  }
  const WORLDS = [
    { nm: 'Garage', full: 'Karels Garage', emo: '🔧', need: 0, col: ['#ffb347', '#d8622a'] },
    { nm: 'Fabriek', full: 'De Fabriek', emo: '🏭', need: 7, col: ['#5ab4e8', '#2a5ca8'] },
    { nm: 'Luchtlab', full: 'Het Luchtlab', emo: '☁️', need: 16, col: ['#b48cf0', '#5a3ab0'] },
  ];
  const ITEMS = {                                       // with the article, as Woef says it
    cactus: 'de cactus', worst: 'de worst', wiel: 'het kraanwiel', batt: 'de turbo-batterij', recept: 'het peperrecept', peper: 'de zak peper',
    lijmpot: 'de dichte pot lijm', schroef: 'de schroevendraaier', lijm: 'de open pot lijm', magneet: 'de magneet', stok: 'de stok',
    hengel: 'de magneethengel', sleutel: 'de moersleutel', key: 'het sleuteltje', plank: 'de plank', bal: 'de bal',
  };
  // the colour buttons (each colour also has its own shape, for colour-blind players)
  const CODECOL = { r: ['rood', '#e8453c', '●'], y: ['geel', '#ffcf3a', '★'], b: ['blauw', '#3a7ce8', '■'], g: ['groen', '#3cb45a', '▲'] };
  const codeOpts = () => ['r', 'y', 'b', 'g'].map(v => ({ v, lab: CODECOL[v][2], sub: CODECOL[v][0], col: CODECOL[v][1] }));
  function codeKey(S, A, o, v, code, done) {             // a colour code on a panel: wrong = start again (no penalty)
    o.code = (o.code || '') + v; A.fx('beep', { v, n: o.code.length });
    if (code.slice(0, o.code.length) !== o.code) { A.fx('buzz'); A.say('w', 'Bzzzt! Fout. Opnieuw beginnen...'); o.code = ''; o.wrong = (o.wrong || 0) + 1; return; }
    if (o.code.length === code.length) { o.code = ''; o.ok = 1; S.cu = null; done(); }
  }

  const LEVELS = [
  /* ======================= WORLD 1: KARELS GARAGE ======================= */
  { id: 'vac', n: 'De Stofzuigbot', mk: 'vac', w: 0,
    intro: ['Hahaha! Mijn Stofzuigbot zuigt álles op!', 'Zelfs kleine blaffende hondjes!'],
    lose: 'Verstopt door vieze sokken?! Dat telt niet!',
    start: { x: 1.3, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6)], ladders: [],
    deco: [['door', 6.9, 8.2, 3.4, 4.6], ['peg', 1.2, 2.6, 3, 2.2], ['shelf', 11.6, 4.3, 3, 'cans'], ['win', 4.3, 2.3, 1.6, 1.5], ['sign', 10.4, 1.3, 'KARELS GARAGE'], ['lamp', 7, 0], ['stain', 9, 8.2]],
    objs: [
      { id: 'basket', k: 'basket', x: 3.4, f: 'g', w: 1.3, h: 1.1, push: 7.3, block: 1, say: 'Een wasmand vol vieze sokken. Bah!' },
      { id: 'mach', k: 'vac', x: 11, f: 'g', w: 2.3, h: 1.7, block: 1, far: 1, say: 'Hij zuigt me zo op! Ik moet iets slims verzinnen.' },
    ],
    init(S) { S.o.basket.socks = 5; },
    tick(S, A) {
      const m = S.o.mach, b = S.o.basket; if (S.m.st !== 'ok') return;
      if (!m.eat) { m.x = 11 + 1.2 * Math.sin(S.t * TAU / 420); return; }
      if (m.eat === 1) { m.x = Math.max(9.2, m.x - .025); if (m.x <= 9.2) { m.eat = 2; m.et = 0; A.fx('suck'); } return; }
      m.et++; b.socks = Math.max(0, 5 - Math.floor(m.et / 16)); if (m.et % 16 === 1) A.fx('sock');
      if (m.et === 70) A.say('k', 'Nee! Hij zit verstopt!');
      if (m.et === 110) A.win();
    },
    pushed(S, A, id) { if (id === 'basket') { S.o.mach.eat = 1; A.say('k', 'Nee, Stofzuigbot! Niet die vieze sokken!'); } return true; },
    hazard(S) { const m = S.o.mach; if (m.eat) return null; const c = cyc(S.t, 230, 50, 70); return [{ f: 'g', x0: m.x - 2.9, x1: m.x - 1.1, ph: c.ph, p: c.p, kind: 'suck', cx: m.x }]; },
    stage: () => 0,
    hints: [['Die robot zuigt alles op. Echt álles!', 'Wat als hij iets heel vies opzuigt? Kijk eens naar de wasmand.', { t: 'Tik op de wasmand. Dan duw je hem naar de robot!', at: 'basket' }]],
    sol: [['obj', 'basket']],
  },
  { id: 'bal', n: 'De Ballonbot', mk: 'bal', w: 0,
    intro: ['Mijn Ballonbot zweeft lekker hoog!', 'Daar kun jij nooit bij, Woef! Hihi!'],
    lose: 'Mijn ballonnen! Wie zet er nou een cactus in een garage?!',
    start: { x: 5.2, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6), F('up', 4.7, .4, 3.4), F('up2', 4.7, 10.6, 13.6)],
    ladders: [LAD(2.8, 'g', 'up'), LAD(12.9, 'g', 'up2')],
    deco: [['win', 5.2, 1.6, 2.2, 1.6], ['peg', 4.5, 4.3, 2.6, 1.6], ['crate', 6.6, 8.2, 1.2, 1], ['crate', 6.9, 7.2, .9, .8], ['shelf', 1.8, 2.8, 2.4, 'boxes'], ['sign', 11.9, 2.4, 'NIET AANKOMEN'], ['lamp', 8.5, 0]],
    objs: [
      { id: 'cactus', k: 'cactus', x: 1.2, f: 'up', w: .8, h: 1.05, take: 'cactus' },
      { id: 'pump', k: 'pump', x: 4.4, f: 'g', w: .7, h: 1.1, say: 'Een fietspomp. Nog méér lucht? Liever niet!' },
      { id: 'mach', k: 'bal', x: 8.2, y: 5.6, w: 2.4, h: 4.8, sx: 11.1, sf: 'up2', far: 1, say: 'Hij zweeft veel te hoog. En mijn pootjes zijn zacht.' },
    ],
    tick(S) { const m = S.o.mach; if (S.m.st === 'ok' && !m.pop) m.x = 8.2 + .9 * Math.sin(S.t * TAU / 500); },
    hazard(S) { const m = S.o.mach; if (m.pop) return null; const c = cyc(S.t, 240, 50, 45); return [{ f: 'g', x0: m.x - 1.25, x1: m.x + 1.25, ph: c.ph, p: c.p, kind: 'drop', cx: m.x }]; },
    use(S, A, it, id) {
      if (it === 'cactus' && id === 'mach') { A.drop('cactus'); S.o.mach.pop = 1; A.fx('throw', { it: 'cactus' }); A.say('w', 'Vang, ballonnen!'); A.after(26, 'pop', 0); return true; }
    },
    ev: {
      pop(S, A, n) { S.o.mach.np = n + 1; A.fx('pop', { n }); if (n < 2) A.after(16, 'pop', n + 1); else { A.say('k', 'Nee nee nee!'); A.after(24, 'fall'); } },
      fall(S, A) { A.win(); },
    },
    stage: S => has(S, 'cactus') ? 1 : 0,
    hints: [
      ['Ballonnen zijn niet zo sterk...', 'Wat prikt er in deze garage? Kijk eens boven.', { t: 'Klim de ladder op en pak de cactus!', at: 'cactus' }],
      ['Nu heb je iets prikkerigs!', 'Klim rechts omhoog, dicht bij de ballonnen.', { t: 'Tik op de cactus in je rugzak en dan op de ballonnen.', at: 'mach' }],
    ],
    sol: [['obj', 'cactus'], ['use', 'cactus', 'mach']],
  },
  { id: 'tik', n: 'De Kietelmachine', mk: 'tik', w: 0, bark: 1,
    intro: ['Mijn Kietelmachine kietelt je tot je omvalt!', 'Kietel kietel, Woef!'],
    lose: 'Hihihi... hou op... HIHI! Dat is niet eerlijk!',
    start: { x: 1.4, f: 'g' },
    floors: [F('g', 8.2, .4, 7.3), F('up', 4.7, 4.2, 13.6)], ladders: [LAD(4.8, 'g', 'up')],
    deco: [['win', 1.6, 1.8, 1.8, 1.5], ['peg', 1, 4.4, 2.4, 1.5], ['shelf', 12, 2.6, 2.6, 'cans'], ['sign', 8.8, 1.6, 'KIETEL-O-MAAT'], ['tiresd', 12.4, 8.2], ['lamp', 6, 0]],
    objs: [
      { id: 'wheel', k: 'none', x: 10.3, y: 7.0, w: 1.3, h: 1.4, far: 1, say: 'Een muisje rent in een rad. Zo geeft hij de machine kracht!' },
      { id: 'mach', k: 'tik', x: 9.4, f: 'g', y: 8.2, w: 3.2, h: 3.1, far: 1, say: 'Die veren kietelen zo! Ik moet iets slims bedenken.' },
      { id: 'cheese', k: 'cheesebox', x: 2.6, f: 'g', w: .9, h: .7, say: 'Een lege kaasdoos. Het muisje heeft alles al op!' },
    ],
    hazard(S) { const m = S.o.mach; if (m.rev) return null; const c = cyc(S.t, 220, 50, 60); return [{ f: 'g', x0: m.x - 3.6, x1: m.x - 1.5, ph: c.ph, p: c.p, kind: 'tickle', cx: m.x }]; },
    bark(S, A) {
      const w = S.w, d = Math.hypot(w.x - 10.3, (w.y - 1) - 6.3);
      if (S.o.mach.rev) return true;
      if (d > 3.2) { A.say('w', w.f === 'g' ? 'Het muisje hoorde me niet. Ik moet dichterbij!' : 'Nog iets dichterbij het muisje...'); return true; }
      S.o.mach.rev = 1; A.fx('squeak'); A.after(30, 'rev');
      return true;
    },
    ev: {
      rev(S, A) { S.o.mach.rev = 2; S.o.mach.rt = S.t; A.say('k', 'Nee! De muis rent achteruit!'); A.after(70, 'giggle'); },
      giggle(S, A) { S.o.mach.rev = 3; A.fx('giggle'); A.after(110, 'boom'); },
      boom(S, A) { A.win(); },
    },
    stage: () => 0,
    hints: [['Wat geeft de machine kracht? Kijk eens naar binnen.', 'Daar rent een muisje in een rad! Als het schrikt...', { t: 'Klim de ladder op en druk boven het muisje op Blaf!', at: 'wheel' }]],
    sol: [['walk', 9.8, 'up'], ['bark']],
  },
  { id: 'kraan', n: 'De Magneetkraan', mk: 'kraan', w: 0, bark: 1,
    intro: ['Mijn Magneetkraan pakt alles van ijzer!', 'Ook de gesp van jouw rugzak, Woef!'],
    lose: 'Op mijn eigen motor?! Wie heeft die knoppen aangeraakt?',
    start: { x: 1.2, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6)], ladders: [],
    deco: [['peg', .9, 2.4, 2.6, 1.8], ['win', 6.6, 2.2, 1.8, 1.4], ['sign', 10.2, 2.2, 'KRAAN'], ['crate', 2.2, 8.2, 1.1, .9], ['stain', 7.5, 8.2], ['stripe', 3.4, 12.2, 8.2]],
    objs: [
      { id: 'motor', k: 'motor', x: 4.6, f: 'g', w: 1.7, h: 1.4, far: 1, say: 'De motor van de kraan. Daar zit al zijn kracht in!' },
      { id: 'panel', k: 'panel', x: 12.9, y: 7.6, f: 'g', w: .9, h: 1.7, front: 1, cu: 1 },
      { id: 'mach', k: 'kraan', x: 9, y: 5.7, w: 2, h: 4.8, far: 1, say: 'Die magneet wil mijn rugzak pakken!' },
    ],
    init(S) { S.o.mach.slot = -1; },
    tick(S, A) {
      const m = S.o.mach; if (S.m.st !== 'ok') return;
      const SL = [2.6, 4.6, 6.6, 8.6, 10.6];
      if (m.slot < 0) { const tx = clamp(S.w.x, 2.6, 11.2); m.x += clamp(tx - m.x, -.022, .022); }
      else if (!m.drop) m.x += clamp(SL[m.slot] - m.x, -.05, .05);
      if (m.drop) {
        m.dt++;
        if (m.dt === 32) {
          if (Math.abs(m.x - S.o.motor.x) < .45) { S.o.motor.hit = 1; A.fx('crash'); A.say('k', 'NEEE! Niet op mijn motor!'); A.after(40, 'boom'); }
          else { A.fx('bonk'); A.say('w', 'Mis! Hij moet precies boven de motor hangen.'); A.after(110, 'lift'); }
        }
      }
    },
    hazard(S) { const m = S.o.mach; if (m.slot >= 0) return null; const c = cyc(S.t, 200, 50, 50); return [{ f: 'g', x0: m.x - .8, x1: m.x + .8, ph: c.ph, p: c.p, kind: 'mag', cx: m.x }]; },
    tap(S, A, id) {
      if (id !== 'panel') return false;
      const m = S.o.mach;
      if (m.slot < 0) { m.slot = 4; A.say('k', 'Hé! Afblijven van mijn bedieningspaneel!'); }
      A.cu('panel'); return true;
    },
    cu: { panel: S => ({ title: 'Bedieningspaneel', text: 'Stuur de kraan. Met de magneetknop laat hij los!', opts: [{ v: 'L', lab: '◀', sub: 'links' }, { v: 'R', lab: '▶', sub: 'rechts' }, { v: 'flip', lab: '🧲', sub: 'loslaten', col: '#e8453c' }] }) },
    pick(S, A, id, v) {
      const m = S.o.mach; if (m.drop) return true;
      if (v === 'L') { m.slot = Math.max(0, m.slot - 1); A.fx('click'); }
      else if (v === 'R') { m.slot = Math.min(4, m.slot + 1); A.fx('click'); }
      else if (v === 'flip') { m.drop = 1; m.dt = 0; m.dx = m.x; A.fx('clunk'); S.cu = null; }
      return true;
    },
    ev: { lift(S, A) { const m = S.o.mach; m.drop = 0; m.dt = 0; A.fx('clank'); }, boom(S, A) { A.win(); } },
    stage: S => S.o.mach.slot < 0 ? 0 : 1,
    hints: [
      ['Die kraan heeft een bedieningspaneel...', 'Met het paneel kun je de kraan zelf besturen!', { t: 'Loop naar het paneel.', at: 'panel' }],
      ['Waar zou dat zware gewicht het meeste kapot maken?', 'Zet de kraan precies boven zijn eigen motor ⚡.', { t: 'Stuur de kraan boven de motor en druk op 🧲.', at: 'motor' }],
    ],
    sol: [['obj', 'panel'], ['pick', 'panel', 'L'], ['pick', 'panel', 'L'], ['pick', 'panel', 'L'], ['wait', 150], ['pick', 'panel', 'flip']],
  },
  { id: 'worst', n: 'De Worstrobot', mk: 'worst', w: 0, bark: 1,
    intro: ['Mijn Worstrobot heeft altijd honger!', 'Hij snuffelt aan alles... ook aan jou!'],
    lose: 'Door het luik?! Voor één worstje?! Dom ding!',
    start: { x: 5, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6)], ladders: [],
    deco: [['win', 5.4, 2, 2, 1.5], ['shelf', 12, 3.4, 2.6, 'boxes'], ['peg', 7.8, 2.4, 2.4, 1.6], ['sign', 1.2, 4.2, 'LUIK'], ['lamp', 9, 0]],
    objs: [
      { id: 'lever', k: 'lever', x: 1.0, y: 7.4, f: 'g', w: .8, h: 1.5, front: 1 },
      { id: 'fridge', k: 'fridge', x: 3.3, f: 'g', w: 1.5, h: 2.5 },
      { id: 'trap', k: 'trap', x: 8.1, y: 8.45, f: 'g', w: 1.7, h: .55, sx: 6.6 },
      { id: 'mach', k: 'worst', x: 11.4, f: 'g', w: 1.6, h: 2.6, block: 1, far: 1, say: 'Hij snuffelt aan alles. Wat een honger!' },
    ],
    tick(S, A) {
      const m = S.o.mach; if (S.m.st !== 'ok' || m.fall) return;
      if (!m.eat) { m.x = 11.4 + 1.1 * Math.sin(S.t * TAU / 360); return; }
      if (m.eat === 1) { m.x = Math.max(8.1, m.x - .022); if (m.x <= 8.1) { m.eat = 2; A.fx('nom'); A.say('k', 'Nee, Worstrobot! Niet eten!'); } }
    },
    hazard(S) { const m = S.o.mach; if (m.eat) return null; const c = cyc(S.t, 180, 40, 50); return [{ f: 'g', x0: m.x - 1.4, x1: m.x + 1.4, ph: c.ph, p: c.p, kind: 'bump', cx: m.x }]; },
    tap(S, A, id) {
      const o = S.o[id];
      if (id === 'fridge') { if (o.empty) { A.say('w', 'De koelkast is leeg.'); return true; } if (A.give('worst')) { o.empty = 1; o.open = S.t; A.fx('door'); } return true; }
      if (id === 'trap') { A.say('w', S.o.trap.worst ? 'Daar ligt de worst. Kom maar, robot!' : 'Een luik in de vloer. Daar kun je zo doorheen vallen!'); return true; }
      if (id === 'lever') {
        o.pull = S.t; A.fx('lever'); S.o.trap.open = 1; A.after(70, 'close');
        if (S.o.mach.eat === 2) { S.o.mach.fall = 1; S.o.mach.ft = S.t; A.after(50, 'crash'); }
        else A.say('w', 'Het luik ging open... maar er stond niemand op.');
        return true;
      }
    },
    use(S, A, it, id) { if (it === 'worst' && id === 'trap') { A.drop('worst'); S.o.trap.worst = 1; S.o.mach.eat = 1; A.fx('place'); A.say('w', 'Kijk eens, robot. Een lekker worstje!'); return true; } },
    ev: { close(S) { if (!S.o.mach.fall) S.o.trap.open = 0; }, crash(S, A) { A.fx('crashbelow'); A.win(); } },
    stage: S => S.o.trap.worst ? 2 : has(S, 'worst') ? 1 : 0,
    hints: [
      ['Die robot heeft altijd honger...', 'Wat eet een Worstrobot het liefst? Kijk in de koelkast!', { t: 'Pak de worst uit de koelkast.', at: 'fridge' }],
      ['Waar zou de robot moeten gaan staan?', 'Leg de worst op het luik in de vloer.', { t: 'Tik op de worst en dan op het luik.', at: 'trap' }],
      ['Nu staat hij precies goed...', 'Met de hendel gaat het luik open!', { t: 'Trek aan de hendel!', at: 'lever' }],
    ],
    sol: [['obj', 'fridge'], ['use', 'worst', 'trap'], ['wait', 260], ['obj', 'lever']],
  },
  /* ======================= WORLD 2: DE FABRIEK ======================= */
  { id: 'water', n: 'Het Waterkanon', mk: 'water', w: 1, bark: 1,
    intro: ['Welkom in mijn fabriek, natte hond!', 'Mijn Waterkanon spuit je zo de deur uit!'],
    lose: 'Water op mijn stroomkast?! Pfff... kortsluiting!',
    start: { x: 1.2, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6), F('up', 4.7, 3.6, 9.6)], ladders: [LAD(4.2, 'g', 'up')],
    deco: [['win', 1.6, 1.2, 2, 1.6], ['gearbg', 13, 1.4, .8], ['stripe', 4.6, 10.2, 8.2], ['sign', 5.4, 1.6, 'FABRIEK']],
    objs: [
      { id: 'toolbox', k: 'toolbox', x: 1.9, f: 'g', w: 1.3, h: .8 },
      { id: 'valve', k: 'valve', x: 7.6, y: 4.15, f: 'up', w: 1.1, h: 1.0, front: 1 },
      { id: 'mach', k: 'water', x: 11.6, f: 'g', w: 2.6, h: 2.2, block: 1, far: 1, say: 'Wat een straal! Ik moet het water ergens anders heen sturen.' },
      { id: 'fuse', k: 'none', x: 11.9, y: 5.0, w: 1.2, h: 1.4, far: 1, say: 'Zijn stroomkast. Water en stroom gaan niet samen!' },
    ],
    hazard(S) { const m = S.o.mach; if (S.o.valve.dir) return null; const c = cyc(S.t, 230, 55, 60); return [{ f: 'g', x0: 4.7, x1: m.x - 1.2, ph: c.ph, p: c.p, kind: 'splash', cx: m.x }]; },
    tap(S, A, id) {
      const o = S.o[id];
      if (id === 'toolbox') { if (o.empty) { A.say('w', 'Alleen nog wat schroefjes.'); return true; } if (A.give('wiel')) { o.empty = 1; A.fx('door'); A.say('w', 'Een kraanwiel!'); } return true; }
      if (id === 'valve') {
        if (!o.wheel) { A.say('w', 'Er zit geen wiel op de kraan. Zo kan ik hem niet draaien.'); return true; }
        if (o.dir) return true;
        o.dir = 1; o.rt = S.t; A.fx('valve'); A.after(50, 'spray'); return true;
      }
    },
    use(S, A, it, id) { if (it === 'wiel' && id === 'valve') { A.drop('wiel'); S.o.valve.wheel = 1; A.fx('click'); A.say('w', 'Klik! Het wiel zit erop.'); return true; } },
    ev: {
      spray(S, A) { S.o.mach.wet = 1; A.fx('splashfuse'); A.say('k', 'Nee! Niet op de stroomkast!'); A.after(90, 'boom'); },
      boom(S, A) { A.win(); },
    },
    stage: S => S.o.valve.wheel ? 2 : has(S, 'wiel') ? 1 : 0,
    hints: [
      ['Waar komt al dat water vandaan?', 'Volg de buis. Bij de kraan kun je het water de andere kant op sturen. Maar eerst...', { t: 'Kijk in de gereedschapskist.', at: 'toolbox' }],
      ['Dat wiel past ergens op...', 'Zet het wiel op de kraan, boven.', { t: 'Tik op het wiel en dan op de kraan.', at: 'valve' }],
      ['Nu kun je de kraan draaien!', 'Draai de kraan. Waar spuit het water dan heen?', { t: 'Tik op de kraan.', at: 'valve' }],
    ],
    sol: [['obj', 'toolbox'], ['use', 'wiel', 'valve'], ['obj', 'valve']],
  },
  { id: 'fan', n: 'De Blaasbot', mk: 'fan', w: 1, bark: 1,
    intro: ['Mijn Blaasbot blaast je zo weg, Woef!', 'Woesj! Dag dag!'],
    lose: 'Teruggeblazen door zo\'n klein ventilatortje?! Grrr!',
    start: { x: 12.6, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6), F('up', 4.7, 9.6, 13.6)], ladders: [LAD(10.2, 'g', 'up')],
    deco: [['win', 6.4, 1.6, 2.2, 1.6], ['gearbg', 4.4, 2.2, .8], ['pipe', 0, 1, 7, 1, .2], ['stripe', 3.4, 9, 8.2], ['sign', 12, 2.2, 'PAS OP: WIND'], ['socket', 5.4, 7.6]],
    objs: [
      { id: 'cart', k: 'cart', x: 11.6, f: 'g', w: 1.3, h: 1.6, push: 5.1, block: 1 },
      { id: 'batt', k: 'batt', x: 12.6, f: 'up', w: .6, h: .8, take: 'batt' },
      { id: 'mach', k: 'fan', x: 2.0, f: 'g', w: 2.6, h: 3.6, block: 1, far: 1, say: 'Wat een wind! Tegen wind helpt... wind?' },
    ],
    tick(S, A) {
      const c = S.o.cart; if (S.m.st !== 'ok') return;
      if (c.on && c.turbo && !c.win) { c.win = 1; A.say('k', 'Nee! Mijn Blaasbot draait achteruit!'); A.fx('whirr'); A.after(120, 'boom'); }
    },
    pushed(S, A, id) { const c = S.o.cart; c.on = 1; A.fx('click'); if (!c.turbo) { A.say('k', 'Hahaha! Wat een zwak windje!'); A.after(70, 'weak'); } return true; },
    hazard(S) { const c = S.o.cart; if (c.on && c.turbo) return null; const k = cyc(S.t, 240, 50, 80), x1 = Math.min(9.2, c.x - .5); return [{ f: 'g', x0: 3.3, x1, ph: k.ph, p: k.p, kind: 'wind', cx: 2 }]; },
    tap(S, A, id) { if (id === 'cart') { const c = S.o.cart; A.say('w', c.turbo ? 'Hij blaast op volle kracht!' : 'Hij doet het, maar hij is te zwak.'); return true; } },
    use(S, A, it, id) { if (it === 'batt' && id === 'cart') { A.drop('batt'); S.o.cart.turbo = 1; A.fx('click'); A.say('w', 'Turbo-batterij erin!'); return true; } },
    ev: { weak(S, A) { if (!S.o.cart.turbo) A.say('w', 'Hij is te zwak. Hij heeft meer kracht nodig!'); }, boom(S, A) { A.win(); } },
    stage: S => { const c = S.o.cart; if (!c.pushed) return 0; if (c.turbo) return 0; return has(S, 'batt') ? 2 : 1; },
    hints: [
      ['Tegen wind helpt... wind!', 'Die kleine ventilator kan terugblazen.', { t: 'Tik op de kleine ventilator. Dan duw je hem naar de grote.', at: 'cart' }],
      ['Hij is nog te zwak...', 'Er ligt iets met extra kracht op de plank, boven.', { t: 'Pak de turbo-batterij.', at: 'batt' }],
      ['Nu heb je extra kracht!', 'Stop de batterij in de kleine ventilator.', { t: 'Tik op de batterij en dan op de kleine ventilator.', at: 'cart' }],
    ],
    sol: [['obj', 'cart'], ['obj', 'batt'], ['use', 'batt', 'cart']],
  },
  { id: 'kok', n: 'De Kookrobot', mk: 'kok', w: 1, bark: 1,
    intro: ['Mijn Kookrobot bakt pannenkoeken...', 'En gooit ze allemaal naar jou! Hap!'],
    lose: 'Peperpannenkoeken?! HATSJOE! Wie heeft mijn recept veranderd?',
    start: { x: 1.3, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6), F('up', 4.7, .4, 4.4)], ladders: [LAD(3.8, 'g', 'up')],
    deco: [['win', 6.2, 1.5, 2, 1.6], ['tiles', 8.6, 2.6, 5, 3.2], ['pipe', 13.8, 0, 13.8, 4, .2], ['sign', 6.8, 4.3, 'KEUKEN'], ['shelf', 11.3, 1.6, 2.6, 'pots']],
    objs: [
      { id: 'book', k: 'books', x: 1.4, f: 'up', w: 1.3, h: 1.2 },
      { id: 'cup', k: 'cupboard', x: 5.6, f: 'g', w: 1.4, h: 1.4 },
      { id: 'board', k: 'board', x: 9.1, y: 6.4, f: 'g', w: 1.1, h: 1.3, front: 1 },
      { id: 'pot', k: 'none', x: 10.3, y: 7.0, w: 1.1, h: .9, sx: 8.9, sf: 'g', far: 1, say: 'Zijn grote kookpan. Daar gaat alles in wat op het recept staat.' },
      { id: 'mach', k: 'kok', x: 11.6, f: 'g', w: 2.2, h: 3.2, block: 1, far: 1, say: 'Hij kookt precies wat er op zijn recept staat.' },
    ],
    tick(S, A) { const o = S.o.board, p = S.o.pot; if (S.m.st === 'ok' && o.rec && p.pep && !o.cook) { o.cook = 1; A.say('k', 'Nee! Geen peper in de pannenkoeken!'); A.fx('cook'); A.after(80, 'sniff'); } },
    hazard(S) { if (S.o.board.cook) return null; const c = cyc(S.t, 220, 45, 60); return [{ f: 'g', x0: 6.3, x1: 8.6, ph: c.ph, p: c.p, kind: 'pie', cx: 11.6 }]; },
    tap(S, A, id) {
      const o = S.o[id];
      if (id === 'book') { if (o.empty) { A.say('w', 'Alleen nog saaie recepten.'); return true; } if (A.give('recept')) { o.empty = 1; A.say('w', 'Een recept: PEPERPANNENKOEK. Met heel veel peper!'); } return true; }
      if (id === 'cup') { if (o.empty) { A.say('w', 'Het kastje is leeg.'); return true; } if (A.give('peper')) { o.empty = 1; o.open = S.t; A.fx('door'); A.say('w', 'Een grote zak peper!'); } return true; }
      if (id === 'board') { A.say('w', o.rec ? 'Peperpannenkoek! Hihi.' : 'Het recept: pannenkoeken. Om naar Woef te gooien!'); return true; }
    },
    use(S, A, it, id) {
      if (it === 'recept' && (id === 'board' || id === 'mach')) { A.drop('recept'); S.o.board.rec = 1; A.fx('place'); A.say('w', 'Nieuw recept!'); if (!S.o.pot.pep) A.after(40, 'nopep'); return true; }
      if (it === 'peper' && (id === 'pot' || id === 'mach')) { A.drop('peper'); S.o.pot.pep = 1; A.fx('place'); if (!S.o.board.rec) A.say('w', 'Peper in de pan! Maar hij bakt nog gewone pannenkoeken...'); return true; }
    },
    ev: {
      nopep(S, A) { if (!S.o.pot.pep) A.say('w', 'Hij heeft het nieuwe recept! Maar er is nog geen peper in de pan.'); },
      sniff(S, A) { S.o.mach.sneeze = 1; A.fx('sniff'); A.after(70, 'sneeze'); },
      sneeze(S, A) { S.o.mach.sneeze = 2; A.fx('sneeze'); A.after(30, 'boom'); },
      boom(S, A) { A.win(); },
    },
    stage: S => { const r = S.o.board.rec || has(S, 'recept') ? 1 : 0, p = S.o.pot.pep || has(S, 'peper') ? 1 : 0; if (!r) return 0; if (!S.o.board.rec) return 1; if (!p) return 2; return 3; },
    hints: [
      ['Die robot kookt precies wat er op zijn recept staat.', 'Misschien kun je hem iets anders laten koken. Boven staan kookboeken.', { t: 'Klim omhoog en pak het recept uit de boeken.', at: 'book' }],
      ['Je hebt een nieuw recept!', 'Hang het recept op het receptenbord.', { t: 'Tik op het recept en dan op het bord.', at: 'board' }],
      ['Voor peperpannenkoeken heb je... peper nodig!', 'Kijk eens in het kastje.', { t: 'Pak de peper uit het kastje.', at: 'cup' }],
      ['Nu nog de peper in de pan!', 'Gooi de zak peper in de grote kookpan.', { t: 'Tik op de peper en dan op de pan.', at: 'pot' }],
    ],
    sol: [['obj', 'book'], ['obj', 'cup'], ['use', 'recept', 'board'], ['use', 'peper', 'pot']],
  },
  { id: 'stempel', n: 'De Stempelmachine', mk: 'stempel', w: 1, bark: 1,
    intro: ['Mijn Stempelmachine stempelt alles met KAREL!', 'Straks staat het ook op jouw neus!'],
    lose: 'Je weet mijn geheime code?! Wie heeft er achter mijn gordijn gekeken?!',
    start: { x: 1.2, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6), F('up', 4.7, 10.0, 13.6)], ladders: [LAD(10.6, 'g', 'up')],
    deco: [['win', 5, 1.5, 2, 1.5], ['gearbg', 9.2, 1.4, .7], ['pipe', 0, .5, 14, .5, .18], ['crate', 13, 8.2, 1, .9], ['sign', 12, 2.6, 'GEHEIM']],
    objs: [
      { id: 'curtain', k: 'curtain', x: 2.6, y: 6.6, f: 'g', w: 1.9, h: 2.4, front: 1 },
      { id: 'panel', k: 'cpanel', x: 12.6, y: 4.2, f: 'up', w: 1.2, h: 1.3, front: 1 },
      { id: 'mach', k: 'stempel', x: 7.6, f: 'g', w: 3.0, h: 3.7, far: 1, say: 'BONK! Dat stempelt hard. Ik moet de knop vinden die hem uitzet.' },
    ],
    hazard(S) { if (S.o.panel.ok) return null; const c = cyc(S.t, 200, 40, 40); return [{ f: 'g', x0: 6.4, x1: 8.8, ph: c.ph, p: c.p, kind: 'stamp', cx: 7.6 }]; },
    tap(S, A, id) {
      const o = S.o[id];
      if (id === 'curtain') { if (!o.open) { o.open = 1; A.fx('curtain'); A.say('w', 'Een schilderij met ballonnen! Wat een rare volgorde...'); } else A.cu('curtain'); return true; }
      if (id === 'panel') { A.cu('panel'); return true; }
    },
    cu: {
      curtain: S => ({ title: 'Het schilderij', look: 'code', code: 'brgy' }),
      panel: S => ({ title: 'Geheime knoppen', text: 'Druk de kleuren in de goede volgorde.', opts: codeOpts(), code: S.o.panel.code || '', n: 4 }),
    },
    pick(S, A, id, v) { if (id === 'panel') codeKey(S, A, S.o.panel, v, 'brgy', () => { A.say('k', 'Nee! Niet de zelf-stempel-knop!'); A.fx('alarm'); A.after(100, 'boom'); }); return true; },
    ev: { boom(S, A) { S.o.mach.self = 1; A.win(); } },
    stage: S => S.o.curtain.open ? 1 : 0,
    hints: [
      ['Karel heeft een geheime code verstopt...', 'Achter het gordijn hangt iets!', { t: 'Doe het gordijn open.', at: 'curtain' }],
      ['Op het schilderij zie je ballonnen in een rij.', 'Druk de knoppen in dezelfde volgorde als de ballonnen. Van links naar rechts!', { t: 'Klim naar het paneel en druk de kleuren in.', at: 'panel' }],
    ],
    sol: [['obj', 'curtain'], ['obj', 'panel'], ['pick', 'panel', 'b'], ['pick', 'panel', 'r'], ['pick', 'panel', 'g'], ['pick', 'panel', 'y']],
  },
  { id: 'bubbel', n: 'De Bubbelbot', mk: 'bubbel', w: 1, bark: 1,
    intro: ['Mijn Bubbelbot blaast je in een zeepbel!', 'Dan zweef je weg, Woef. Doei!'],
    lose: 'Een plakbel?! Mijn Bubbelbot zit vast in zijn eigen bel!',
    start: { x: 1.2, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6), F('up', 4.7, 7.4, 10.0)], ladders: [LAD(7.9, 'g', 'up')],
    deco: [['win', 3.4, 1.5, 2.2, 1.6], ['pipe', 0, .6, 9, .6, .2], ['gearbg', 12.8, 1.3, .7], ['sign', 4.4, 4.3, 'ZEEP'], ['stripe', 4.2, 10, 8.2]],
    objs: [
      { id: 'glue', k: 'gluepot', x: 1.6, f: 'g', w: .8, h: .8, take: 'lijmpot' },
      { id: 'bench', k: 'bench', x: 5.0, f: 'g', w: 2, h: 1.3 },
      { id: 'tank', k: 'none', x: 10.6, y: 5.35, w: 1.0, h: 1.4, sx: 9.6, sf: 'up', far: 1, say: 'De zeeptank van de Bubbelbot. Vol zeep!' },
      { id: 'mach', k: 'bubbel', x: 11.6, f: 'g', w: 2.6, h: 3.6, block: 1, far: 1, say: 'Zeepbellen! Wat als die nou eens plakkerig waren?' },
    ],
    hazard(S) { if (S.o.tank.glue) return null; const c = cyc(S.t, 260, 60, 70); return [{ f: 'g', x0: 4.2, x1: 10.2, ph: c.ph, p: c.p, kind: 'bubble', cx: 11.6 }]; },
    tap(S, A, id) {
      const o = S.o[id];
      if (id === 'bench') { if (o.empty) { A.say('w', 'De la is leeg.'); return true; } if (A.give('schroef')) { o.empty = 1; o.open = S.t; A.fx('door'); A.say('w', 'Een schroevendraaier!'); } return true; }
    },
    comb(S, A, a, b) { if (a === 'lijmpot' && b === 'schroef' || a === 'schroef' && b === 'lijmpot') { A.drop('lijmpot'); A.drop('schroef'); A.give('lijm'); A.fx('pry'); A.say('w', 'Krak! Het deksel is eraf.'); return true; } },
    use(S, A, it, id) {
      if (id === 'tank' || id === 'mach') {
        if (it === 'lijmpot') { A.say('w', 'Het deksel zit muurvast. Ik moet het eerst openmaken.'); return true; }
        if (it === 'lijm') { A.drop('lijm'); S.o.tank.glue = 1; A.fx('pour'); A.say('k', 'Hé! Wat doe je in mijn zeep?!'); A.after(70, 'bubble'); return true; }
      }
      if (it === 'schroef' && id === 'glue') { A.say('w', 'Pak de pot eerst op.'); return true; }
    },
    ev: { bubble(S, A) { S.o.mach.bub = 1; S.o.mach.bt = S.t; A.fx('bigbubble'); A.after(150, 'boom'); }, boom(S, A) { A.win(); } },
    stage: S => { if (has(S, 'lijm')) return 3; const p = has(S, 'lijmpot'), s = has(S, 'schroef'); return p && s ? 2 : p ? 1 : 0; },
    hints: [
      ['Bellen zijn van zeep... wat als ze heel plakkerig worden?', 'Kijk eens naar die pot lijm.', { t: 'Pak de pot lijm.', at: 'glue' }],
      ['Het deksel van de lijmpot zit vast...', 'Met een schroevendraaier krijg je het deksel open.', { t: 'Pak de schroevendraaier uit de werkbank.', at: 'bench' }],
      ['Je hebt de lijm én de schroevendraaier!', 'Maak de pot open met de schroevendraaier.', { t: 'Tik op de schroevendraaier en dan op de lijmpot in je rugzak.', at: 'inv:lijmpot' }],
      ['Plakkerige lijm... en een zeeptank!', 'Giet de lijm in de zeeptank bovenop de machine.', { t: 'Klim omhoog. Tik op de lijm en dan op de zeeptank.', at: 'tank' }],
    ],
    sol: [['obj', 'glue'], ['obj', 'bench'], ['comb', 'schroef', 'lijmpot'], ['use', 'lijm', 'tank']],
  },
  /* ======================= WORLD 3: HET LUCHTLAB ======================= */
  { id: 'krimp', n: 'De Krimpstraal', mk: 'krimp', w: 2, bark: 1,
    intro: ['Welkom in mijn Luchtlab, hoog in de wolken!', 'Mijn Krimpstraal maakt je zo klein als een mier!'],
    lose: 'Ik ben gekrompen... nee, mijn MACHINE is gekrompen! Piep!',
    start: { x: 1.2, f: 'g1' },
    floors: [F('g1', 8.2, .4, 6.0), F('g2', 8.2, 7.0, 13.6), F('up', 4.7, .4, 5.6)], ladders: [LAD(1.0, 'g1', 'up')],
    deco: [['port', 7.6, 2.4, .9], ['port', 10, 2.0, .7], ['cloud', 3, 1.2, 1], ['sign', 9, 4.6, 'KRIMP'], ['lab', 7.4, 4.2]],
    objs: [
      { id: 'mA', k: 'mirror', x: 4.4, f: 'g1', w: .9, h: 1.7, sx: 3.6 },
      { id: 'mB', k: 'mirror', x: 4.4, y: 4.7, f: 'up', w: .9, h: 1.7, sx: 3.6 },
      { id: 'mach', k: 'krimp', x: 12.0, f: 'g2', w: 2.6, h: 3.6, block: 1, far: 1, say: 'Die straal kaatst tegen spiegels. Misschien kan hij terugkaatsen...' },
    ],
    init(S) { S.o.mA.r = 0; S.o.mB.r = 2; },              // r: 0 '/', 1 flat, 2 '\', 3 upright (a quarter of a half turn per tap)
    beam(S) {                                              // the path of the ray: from the nozzle to the left, over the mirrors
      const A = S.o.mA, B = S.o.mB, y1 = 7.0, y2 = 3.5;
      const p = [[9.6, y1], [A.x, y1]];
      if (A.r === 0) { p.push([A.x, 8.2]); return { p, hit: 0 }; }
      if (A.r !== 2) return { p, hit: 0 };
      p.push([B.x, y2]);
      if (B.r === 2) { p.push([.4, y2]); return { p, hit: 0 }; }
      if (B.r !== 0) return { p, hit: 0 };
      p.push([11.8, y2]); return { p, hit: 1 };
    },
    tick(S, A) {
      const m = S.o.mach; if (S.m.st !== 'ok') return;
      const c = cyc(S.t, 220, 50, 50);
      if (c.ph === 2 && !m.shr && this.beam(S).hit) { m.shr = 1; m.st0 = S.t; A.fx('zapself'); A.say('k', 'NEE! Niet naar mijn eigen machine!'); A.after(130, 'boom'); }
    },
    hazard(S) { if (S.o.mach.shr) return null; const c = cyc(S.t, 220, 50, 50); return [{ f: 'g1', x0: 4.9, x1: 6.2, ph: c.ph, p: c.p, kind: 'zap', cx: 12 }, { f: 'g2', x0: 6.8, x1: 9.6, ph: c.ph, p: c.p, kind: 'zap', cx: 12 }]; },
    tap(S, A, id) { if (id === 'mA' || id === 'mB') { const o = S.o[id]; o.r = (o.r + 1) % 4; A.fx('turn'); return true; } },
    ev: { boom(S, A) { A.win(); } },
    stage: S => S.o.mA.r === 2 ? 1 : 0,
    hints: [
      ['Die straal kaatst tegen spiegels...', 'Draai de onderste spiegel, zodat de straal omhoog gaat. Kijk goed waar de straal heen gaat!', { t: 'Tik op de spiegel. Blijf tikken tot hij zo staat: \\', at: 'mA' }],
      ['De straal gaat nu omhoog!', 'Draai de bovenste spiegel, zodat de straal terug naar de machine gaat.', { t: 'Klim omhoog en tik op de spiegel tot hij zo staat: /', at: 'mB' }],
    ],
    sol: [['obj', 'mA'], ['obj', 'mA'], ['obj', 'mB'], ['obj', 'mB'], ['wait', 240]],
  },
  { id: 'tand', n: 'De Tandwieltoren', mk: 'tand', w: 2, bark: 1,
    intro: ['Mijn Tandwieltoren draait en draait en draait!', 'Niemand kan hem stoppen. Haha!'],
    lose: 'Een moersleutel tussen mijn tandwielen?! Krrrk... kapot!',
    start: { x: 1.4, f: 'g1' },
    floors: [F('g1', 8.2, .4, 5.6), F('g2', 8.2, 6.6, 10.2), F('up', 4.7, 7.0, 10.1)], ladders: [LAD(7.3, 'g2', 'up')],
    deco: [['port', 3.6, 2.2, .9], ['cloud', 6.4, 1.4, 1.1], ['lab', 2.4, 4.4], ['sign', 6.4, 4.4, 'TOREN']],
    objs: [
      { id: 'magnet', k: 'magnet', x: 1.0, y: 6.4, f: 'g1', w: .9, h: .9, front: 1, take: 'magneet' },
      { id: 'drain', k: 'drain', x: 3.6, y: 8.35, f: 'g1', w: 1.2, h: .5, front: 1 },
      { id: 'stick', k: 'stick', x: 8.3, f: 'g2', w: 1.2, h: .35, take: 'stok' },
      { id: 'gears', k: 'none', x: 10.6, y: 4.6, w: 1.2, h: 1.6, sx: 9.7, sf: 'up', far: 1, say: 'Zijn tandwielen. Ze draaien heel hard rond!' },
      { id: 'mach', k: 'tand', x: 12.0, f: 'g2', y: 8.2, w: 2.8, h: 6.6, far: 1, say: 'Een toren vol tandwielen. Er moet iets tussen!' },
    ],
    hazard(S) { if (S.o.gears.jam) return null; const c = cyc(S.t, 170, 35, 40); return [{ f: 'g2', x0: 8.9, x1: 10.3, ph: c.ph, p: c.p, kind: 'bonk', cx: 12 }]; },
    tap(S, A, id) { if (id === 'drain') { A.say('w', S.o.drain.empty ? 'Het putje is leeg.' : 'Daar ligt een moersleutel! Maar mijn poot past niet door het rooster.'); return true; } },
    comb(S, A, a, b) { if ((a === 'magneet' && b === 'stok') || (a === 'stok' && b === 'magneet')) { A.drop('magneet'); A.drop('stok'); A.give('hengel'); A.fx('pry'); A.say('w', 'Een magneethengel!'); return true; } },
    use(S, A, it, id) {
      if (id === 'drain') {
        if (it === 'hengel') { if (S.o.drain.empty) return false; A.drop('hengel'); S.o.drain.empty = 1; A.give('sleutel'); A.fx('fish'); A.say('w', 'Hebbes! Een moersleutel.'); return true; }
        if (it === 'magneet') { A.say('w', 'De magneet kan er niet bij. Hij moet aan iets lang vast.'); return true; }
        if (it === 'stok') { A.say('w', 'De stok kan er wel bij, maar de sleutel blijft er niet aan plakken.'); return true; }
      }
      if (it === 'sleutel' && (id === 'gears' || id === 'mach')) { A.drop('sleutel'); S.o.gears.jam = 1; A.fx('jam'); A.say('k', 'Nee! Er zit iets tussen mijn tandwielen!'); A.after(110, 'boom'); return true; }
    },
    ev: { boom(S, A) { A.win(); } },
    stage: S => { if (has(S, 'sleutel')) return 4; if (has(S, 'hengel')) return 3; const m = has(S, 'magneet'), s = has(S, 'stok'); return m && s ? 2 : m || s ? 1 : 0; },
    hints: [
      ['Tandwielen houden niet van... ijzer ertussen!', 'In het putje ligt een moersleutel. Hoe vis je die eruit?', { t: 'Pak eerst de magneet.', at: 'magnet' }],
      ['Een magneet alleen is te kort...', 'Zoek iets lang om de magneet aan vast te maken.', { t: 'Pak de stok.', at: 'stick' }],
      ['Een magneet en een stok...', 'Maak er samen een magneethengel van!', { t: 'Tik op de magneet en dan op de stok in je rugzak.', at: 'inv:stok' }],
      ['Nu kun je vissen!', 'Vis de moersleutel uit het putje.', { t: 'Tik op de hengel en dan op het putje.', at: 'drain' }],
      ['Een moersleutel tussen de tandwielen...', 'Klim omhoog naar de tandwielen.', { t: 'Tik op de moersleutel en dan op de tandwielen.', at: 'gears' }],
    ],
    sol: [['obj', 'magnet'], ['obj', 'stick'], ['comb', 'magneet', 'stok'], ['use', 'hengel', 'drain'], ['use', 'sleutel', 'gears']],
  },
  { id: 'weer', n: 'De Weermachine', mk: 'weer', w: 2, bark: 1,
    intro: ['Mijn Weermachine laat het regenen. Op jou!', 'Natte hond! Natte hond!'],
    lose: 'Bevroren?! Mijn buizen zijn ijsklontjes! Brrr...',
    start: { x: 5.6, f: 'g' },
    floors: [F('g', 8.2, .4, 13.6), F('up', 4.7, .4, 3.6)], ladders: [LAD(3.0, 'g', 'up')],
    deco: [['port', 5.6, 2.2, .9], ['cloud', 9, 1, 1.2], ['lab', 2.6, 6.6], ['sign', 8.4, 4.5, 'WEER']],
    objs: [
      { id: 'nest', k: 'nest', x: 1.4, y: 3.5, f: 'up', w: 1.3, h: 1.0, front: 1 },
      { id: 'key', k: 'key', x: 2.2, f: 'up', w: .7, h: .4, take: 'key', hide: 1 },
      { id: 'case', k: 'case', x: 6.0, y: 7.1, f: 'g', w: 1.0, h: 1.4, front: 1 },
      { id: 'mach', k: 'weer', x: 11.2, f: 'g', w: 3, h: 3.6, block: 1, far: 1, say: 'Een regenmachine vol waterbuizen.' },
    ],
    init(S) { S.o.case.wt = 1; },                          // 0 sun, 1 rain, 2 snow
    hazard(S) { const o = S.o.case; if (o.wt !== 1) return null; const c = cyc(S.t, 240, 50, 90); return [{ f: 'g', x0: 6.7, x1: 9.5, ph: c.ph, p: c.p, kind: 'rain', cx: 11 }]; },
    bark(S, A) {
      const w = S.w, n = S.o.nest;
      if (n.gone) return false;
      if (Math.hypot(w.x - n.x, (w.y - 1) - 3) > 3) { A.say('w', 'Het vogeltje hoorde me niet. Ik moet dichterbij!'); return true; }
      n.gone = 1; n.gt = S.t; A.fx('flap'); A.after(40, 'drop'); return true;
    },
    tap(S, A, id) {
      const o = S.o[id];
      if (id === 'nest') { A.say('w', o.gone ? 'Het nest is leeg.' : 'Het vogeltje zit op iets glimmends... een sleutel!'); return true; }
      if (id === 'case') { if (!o.open) { A.say('w', 'Een glazen kastje op slot. Met een knop erin.'); return true; } A.cu('case'); return true; }
    },
    use(S, A, it, id) { if (it === 'key' && id === 'case') { A.drop('key'); S.o.case.open = 1; A.fx('unlock'); A.say('w', 'Open! Er zit een weerknop in.'); return true; } },
    cu: { case: S => ({ title: 'De weerknop', text: 'Wat voor weer wordt het?', opts: [{ v: 0, lab: '☀️', sub: 'zon' }, { v: 1, lab: '🌧️', sub: 'regen' }, { v: 2, lab: '❄️', sub: 'sneeuw' }], sel: S.o.case.wt }) },
    pick(S, A, id, v) {
      const o = S.o.case; if (o.wt === 2) return true; o.wt = v; A.fx('click');
      if (v === 0) { A.say('k', 'Hihi! Zon? Dan maakt hij gewoon een regenboog!'); S.cu = null; }
      if (v === 1) S.cu = null;
      if (v === 2) { S.cu = null; S.o.mach.ice = S.t; A.fx('freeze'); A.say('k', 'Brrr! Nee! Mijn waterbuizen bevriezen!'); A.after(120, 'boom'); }
      return true;
    },
    ev: { drop(S, A) { S.o.key.hide = 0; A.fx('keydrop'); A.say('w', 'Er viel iets uit het nest!'); }, boom(S, A) { A.win(); } },
    stage: S => S.o.case.open ? 3 : has(S, 'key') ? 2 : S.o.nest.gone ? 1 : 0,
    hints: [
      ['Het vogeltje zit op iets glimmends...', 'Laat het vogeltje schrikken! Maar wel van dichtbij.', { t: 'Klim omhoog en druk op Blaf!', at: 'nest' }],
      ['Er viel iets uit het nest!', 'Pak het sleuteltje.', { t: 'Tik op het sleuteltje.', at: 'key' }],
      ['Wat zit er op slot?', 'Het sleuteltje past op het glazen kastje.', { t: 'Tik op het sleuteltje en dan op het kastje.', at: 'case' }],
      ['Welk weer vindt een machine vol water niet fijn?', 'Als water heel koud wordt, wordt het ijs!', { t: 'Tik op het kastje en kies sneeuw ❄️.', at: 'case' }],
    ],
    sol: [['walk', 2.4, 'up'], ['bark'], ['wait', 60], ['obj', 'key'], ['use', 'key', 'case'], ['obj', 'case'], ['pick', 'case', 2]],
  },
  { id: 'wekker', n: 'De Wekkerbot', mk: 'wekker', w: 2, bark: 1,
    intro: ['TRING TRING! Mijn Wekkerbot is de luidste wekker ooit!', 'Hou je oren maar dicht, Woef!'],
    lose: 'Je hebt mijn Wekkerbot in slaap gezet?! En zijn sleutel gepakt?! Grrr!',
    start: { x: 1.4, f: 'g' },
    floors: [F('g', 8.2, .4, 9.2), F('up', 4.7, 4.8, 8.6)], ladders: [LAD(5.4, 'g', 'up')],
    deco: [['port', 3.4, 2.2, .9], ['cloud', 7.4, 1.2, 1], ['lab', 7, 6.4], ['sign', 6.6, 3.2, 'STIL!']],
    objs: [
      { id: 'note', k: 'note', x: 2.0, y: 6.8, f: 'g', w: 1.1, h: 1.1, front: 1 },
      { id: 'knob', k: 'knob', x: 9.0, y: 4.5, f: 'up', w: .8, h: .8, sx: 8.25 },
      { id: 'wkey', k: 'wkey', x: 9.3, y: 7.3, f: 'g', w: .8, h: .9, sx: 8.6 },
      { id: 'mach', k: 'wekker', x: 10.9, f: 'g', w: 3.0, h: 4.2, far: 1, say: 'Wat een herrie! Kon hij maar slapen...' },
    ],
    init(S) { S.o.knob.h = 3; },
    hazard(S) { if (S.o.mach.sleep) return null; const c = cyc(S.t, 240, 50, 70); return [{ f: 'g', x0: 6.4, x1: 9.3, ph: c.ph, p: c.p, kind: 'ring', cx: 11 }]; },
    tap(S, A, id) {
      if (id === 'note') { S.o.note.read = 1; A.cu('note'); return true; }
      if (id === 'knob') { A.cu('knob'); return true; }
      if (id === 'wkey') {
        if (!S.o.mach.sleep) { A.say('w', 'Hij is wakker. Dan draait hij zich om!'); return true; }
        S.o.wkey.out = 1; A.fx('unwind'); A.say('w', 'Zzzzt... de sleutel is eruit!'); A.after(110, 'boom'); return true;
      }
    },
    cu: {
      note: S => ({ title: 'Een briefje van Karel', look: 'note' }),
      knob: S => ({ title: 'De wekkerknop', text: 'Hoe laat moet de Wekkerbot gaan slapen?', opts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => ({ v, lab: String(v), sub: 'uur' })), sel: S.o.knob.h, clock: 1 }),
    },
    pick(S, A, id, v) {
      if (id !== 'knob' || S.o.mach.sleep) return true;
      S.o.knob.h = v; A.fx('tick');
      if (v === 8) { S.o.mach.sleep = 1; S.cu = null; A.fx('yawn'); A.say('k', 'Nee! Niet gaan slapen, Wekkerbot! Wakker blijven!'); }
      return true;
    },
    ev: { boom(S, A) { A.win(); } },
    stage: S => S.o.mach.sleep ? 2 : S.o.note.read ? 1 : 0,
    hints: [
      ['Karel heeft een briefje laten hangen...', 'Lees het briefje aan de muur.', { t: 'Tik op het briefje.', at: 'note' }],
      ['Hoe laat moet de Wekkerbot gaan slapen?', 'Zet de wekker op 8 uur met de knop bovenop.', { t: 'Klim omhoog en tik op de knop.', at: 'knob' }],
      ['Ssst! Hij slaapt...', 'Aan de zijkant zit een grote opwindsleutel.', { t: 'Trek de opwindsleutel eruit.', at: 'wkey' }],
    ],
    sol: [['obj', 'note'], ['cuX'], ['obj', 'knob'], ['pick', 'knob', 8], ['obj', 'wkey']],
  },
  { id: 'taart', n: 'De Taartenbot', mk: 'taart', w: 2, bark: 1,
    intro: ['Mijn Taartenbot gooit taarten! Over het hek!', 'Zijn UIT-knop? Daar kom jij nooit bij!'],
    lose: 'Met een balletje en een glijbaan?! Op mijn UIT-knop?! Bah!',
    start: { x: 1.2, f: 'g' },
    floors: [F('g', 8.2, .4, 8.8), F('up', 4.7, .4, 4.6)], ladders: [LAD(.9, 'g', 'up')],
    deco: [['port', 4.6, 2.0, .8], ['cloud', 2.4, 1.2, 1], ['fence', 9.3, 8.2], ['sign', 2.6, 6.3, 'SPEELGOED']],
    objs: [
      { id: 'toybox', k: 'toybox', x: 2.6, f: 'g', w: 1.4, h: 1.0 },
      { id: 'plank', k: 'plank', x: 6.2, f: 'g', w: 1.6, h: .3, take: 'plank' },
      { id: 'ramp', k: 'ramp', x: 6.6, y: 6.3, f: 'up', w: 3.6, h: 1.8, sx: 4.3, sf: 'up' },
      { id: 'mach', k: 'taart', x: 11.8, f: 'g', w: 2.6, h: 3.4, far: 1, say: 'Zijn UIT-knop zit achter het hek. Daar kan ik niet bij.' },
    ],
    hazard(S) { if (S.o.ramp.go === 2) return null; const c = cyc(S.t, 220, 50, 60); return [{ f: 'g', x0: 4.8, x1: 8.8, ph: c.ph, p: c.p, kind: 'pie', cx: 11.8 }]; },
    tap(S, A, id) {
      const o = S.o[id];
      if (id === 'toybox') { if (o.empty) { A.say('w', 'Alleen nog een knuffel. Die mag blijven.'); return true; } if (A.give('bal')) { o.empty = 1; A.fx('door'); A.say('w', 'Een bal!'); } return true; }
      if (id === 'ramp') { A.say('w', o.fix ? 'Een glijbaan naar het hek. En dan... de dominostenen!' : 'Een glijbaan. Maar er zit een gat in!'); return true; }
    },
    use(S, A, it, id) {
      if (id !== 'ramp' && id !== 'mach') return false;
      const r = S.o.ramp;
      if (it === 'plank' && id === 'ramp') { A.drop('plank'); r.fix = 1; A.fx('place'); A.say('w', 'Het gat is dicht!'); return true; }
      if (it === 'bal' && id === 'ramp') { if (r.go) return true; A.drop('bal'); r.go = 1; r.gt = S.t; A.fx('roll'); A.after(r.fix ? 70 : 40, r.fix ? 'dom' : 'fall'); return true; }
    },
    ev: {
      fall(S, A) { S.o.ramp.go = 0; S.o.toybox.empty = 0; A.fx('bonk'); A.say('w', 'Oeps! De bal viel door het gat. Hij rolde terug naar de speelgoedkist.'); },
      dom(S, A) { S.o.ramp.go = 2; S.o.ramp.dt = S.t; A.fx('domino'); A.after(70, 'press'); },
      press(S, A) { S.o.mach.off = 1; A.fx('button'); A.say('k', 'NEE! Mijn UIT-knop!'); A.after(70, 'boom'); },
      boom(S, A) { A.win(); },
    },
    stage: S => { const r = S.o.ramp; if (!r.fix) return has(S, 'plank') ? 1 : 0; return has(S, 'bal') ? 3 : 2; },
    hints: [
      ['De UIT-knop zit achter het hek...', 'Met een glijbaan kun je ver komen! Maar er zit een gat in.', { t: 'Pak de plank.', at: 'plank' }],
      ['Een plank... en een gat!', 'Leg de plank op het gat in de glijbaan.', { t: 'Klim omhoog. Tik op de plank en dan op de glijbaan.', at: 'ramp' }],
      ['Wat rolt er goed van een glijbaan?', 'Kijk in de speelgoedkist.', { t: 'Pak de bal uit de speelgoedkist.', at: 'toybox' }],
      ['Bal... glijbaan... dominostenen... UIT-knop!', 'Leg de bal bovenaan de glijbaan.', { t: 'Tik op de bal en dan op de glijbaan.', at: 'ramp' }],
    ],
    sol: [['obj', 'plank'], ['use', 'plank', 'ramp'], ['obj', 'toybox'], ['use', 'bal', 'ramp']],
  },
  /* ======================= THE FINALE ======================= */
  { id: 'mega', n: 'De Karel-o-Matic 3000', mk: 'mega', w: 2, bark: 1, final: 1,
    intro: ['Dit is mijn allergrootste machine: de Karel-o-Matic 3000!', 'Met ballonnen, wind én een stempelvuist! Mwahaha!'],
    lose: 'Pfff... Oké, oké. Het spijt me, Woef. Mag ik er nu uit?',
    start: { x: 1.2, f: 'g' },
    floors: [F('g', 8.2, .4, 8.4), F('up', 4.7, .4, 7.4)], ladders: [LAD(3.6, 'g', 'up')],
    deco: [['port', 2.2, 1.9, .8], ['cloud', 5.6, 1.0, 1.1], ['poster', 1.8, 6.4, 1.6, 1.3, 'code']],
    objs: [
      { id: 'cactus', k: 'cactus', x: 1.4, f: 'up', w: .8, h: 1.05, take: 'cactus' },
      { id: 'toolbox', k: 'toolbox', x: 5.4, f: 'g', w: 1.3, h: .8 },
      { id: 'poster', k: 'none', x: 1.8, y: 7.1, w: 1.7, h: 1.4, f: 'g', front: 1 },
      { id: 'shield', k: 'none', x: 9.1, y: 7.8, w: 1.4, h: 4.3, sx: 7.9, sf: 'g' },
      { id: 'fanarm', k: 'none', x: 9.0, y: 3.45, w: 1.4, h: 1.4, sx: 7.15, sf: 'up' },
      { id: 'panel', k: 'none', x: 8.9, y: 8.0, w: .9, h: 1.0, sx: 7.9, sf: 'g', hide: 1 },
      { id: 'mach', k: 'mega', x: 11.4, f: 'g', w: 4.4, h: 6.8, far: 1, say: 'Wat een reuzenmachine! Stap voor stap...' },
    ],
    init(S) { S.m.stage = 0; },
    hazard(S) {
      const s = S.m.stage;
      if (s === 0) { const c = cyc(S.t, 230, 50, 50); return [{ f: 'g', x0: 6.6, x1: 8.4, ph: c.ph, p: c.p, kind: 'drop', cx: 9 }]; }
      if (s === 1) { const c = cyc(S.t, 240, 50, 70); return [{ f: 'g', x0: 4.2, x1: 8.4, ph: c.ph, p: c.p, kind: 'wind', cx: 10 }]; }
      if (s === 2) { const c = cyc(S.t, 200, 40, 40); return [{ f: 'g', x0: 5.6, x1: 7.0, ph: c.ph, p: c.p, kind: 'stamp', cx: 10 }]; }
      return null;
    },
    tap(S, A, id) {
      const o = S.o[id], s = S.m.stage;
      if (id === 'toolbox') { if (o.empty) { A.say('w', 'Alleen nog wat schroefjes.'); return true; } if (A.give('sleutel')) { o.empty = 1; A.fx('door'); A.say('w', 'Een moersleutel!'); } return true; }
      if (id === 'poster') { S.o.poster.seen = 1; A.cu('poster'); return true; }
      if (id === 'shield') { A.say('w', s > 0 ? 'Het schild is weg!' : 'Een schild aan drie ballonnen. Wat prikt er hier?'); return true; }
      if (id === 'fanarm') { A.say('w', s > 1 ? 'Die blaast nu de andere kant op!' : s < 1 ? 'Een ventilator-arm. Eerst dat schild!' : 'De ventilator zit vast met een grote moer.'); return true; }
      if (id === 'panel') { if (s === 2) A.cu('panel'); return true; }
    },
    use(S, A, it, id) {
      const s = S.m.stage;
      if (it === 'cactus' && (id === 'shield' || id === 'mach') && s === 0) { A.drop('cactus'); A.fx('throw', { it: 'cactus' }); A.after(24, 'pop', 0); return true; }
      if (it === 'sleutel' && (id === 'fanarm' || id === 'mach')) {
        if (s < 1) { A.say('w', 'Eerst moet dat schild weg.'); return true; }
        if (s === 1) { A.drop('sleutel'); A.fx('jam'); A.say('w', 'Draaien... en omdraaien!'); A.after(40, 'turn'); return true; }
      }
    },
    cu: {
      poster: S => ({ title: 'Geheim! Niet kijken, Woef!', look: 'code', code: 'gybr' }),
      panel: S => ({ title: 'Zelf-uit-knoppen', text: 'Druk de geheime code in.', opts: codeOpts(), code: S.o.panel.code || '', n: 4 }),
    },
    pick(S, A, id, v) { if (id === 'panel' && S.m.stage === 2) codeKey(S, A, S.o.panel, v, 'gybr', () => { A.stage(); A.say('k', 'Nee! Mijn geheime code! Hoe weet jij die?!'); A.fx('alarm'); A.after(90, 'boom'); }); return true; },
    ev: {
      pop(S, A, n) { S.o.shield.np = n + 1; A.fx('pop', { n }); if (n < 2) A.after(14, 'pop', n + 1); else { S.o.shield.hide = 1; A.stage(); A.say('k', 'Mijn schild! Dan blaas ik je wel weg!'); } },
      turn(S, A) { S.o.fanarm.rev = 1; A.fx('whirr'); A.stage(); S.o.panel.hide = 0; A.say('k', 'Hé! Nu blaast hij in mijn gezicht! En mijn luik waait open!'); },
      boom(S, A) { A.win(); },
    },
    stage: S => { const s = S.m.stage; if (s === 0) return has(S, 'cactus') ? 1 : 0; if (s === 1) return has(S, 'sleutel') ? 3 : 2; return S.o.poster.seen ? 5 : 4; },
    hints: [
      ['Het schild hangt aan drie ballonnen...', 'Wat prikt er? Kijk eens boven.', { t: 'Klim omhoog en pak de cactus.', at: 'cactus' }],
      ['Prik de ballonnen!', 'Gooi de cactus naar de ballonnen van het schild.', { t: 'Tik op de cactus en dan op het schild.', at: 'shield' }],
      ['Die ventilator zit vast met een moer...', 'Met een moersleutel kun je hem omdraaien. Kijk in de gereedschapskist.', { t: 'Pak de moersleutel.', at: 'toolbox' }],
      ['Nu de ventilator omdraaien!', 'Klim omhoog, dicht bij de ventilator-arm.', { t: 'Tik op de moersleutel en dan op de ventilator.', at: 'fanarm' }],
      ['Er is een luik opengewaaid met knoppen...', 'Karel heeft zijn geheime code ergens opgehangen.', { t: 'Bekijk de poster aan de muur.', at: 'poster' }],
      ['Je weet de code!', 'Druk de kleuren in dezelfde volgorde als op de poster.', { t: 'Tik op het luik met knoppen.', at: 'panel' }],
    ],
    sol: [['obj', 'cactus'], ['use', 'cactus', 'shield'], ['wait', 80], ['obj', 'toolbox'], ['use', 'sleutel', 'fanarm'], ['wait', 60], ['obj', 'poster'], ['cuX'], ['obj', 'panel'], ['pick', 'panel', 'g'], ['pick', 'panel', 'y'], ['pick', 'panel', 'b'], ['pick', 'panel', 'r']],
  },
  ];
  const PER = 5, NL = LEVELS.length;
