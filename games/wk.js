/* ================================================================
   WOEF TEGEN KAREL – a puzzle adventure for young players: Woef the dog detective beats the machines of the
   grumpy inventor raccoon Karel by working out how each one breaks (push, pick up, combine, bark). 15 machines in
   three worlds plus a finale, hints in three steps, stars, save/resume of the exact room state.
   ================================================================ */
const WoefKarel = (() => {
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

  /* ================= core.js: deterministic room logic at 60 steps per second (no DOM, no randomness) =================
     Core.newState(i)              a fresh state for level i (plain JSON: it is saved as it is)
     Core.cmd(L, S, c)             a player command: {t:'tap',x,y,item} | {t:'obj',id,item} | {t:'walk',x,f} | {t:'bark'}
                                   | {t:'comb',a,b} | {t:'pick',id,v} | {t:'cuX'}
     Core.step(L, S)               one step; S.ev holds what happened (for sound and pictures)
     Core.hint(L, S)  Core.stars(S)  Core.sanitize(L, S)  Core.pick(L, S, x, y)  Core.zones(L, S) */
  const CORE_V = 1, MAXINV = 3;
  const Core = (() => {
    const WALK = 4.2 / TPS, CLIMB = 3.4 / TPS, PUSHV = 2.3 / TPS, HOP = 24, ACT = 20, ACTX = 9, BARK = 42, BARKX = 12, DIZZY = 80, KBT = 22, INVUL = 50;
    const NO = ['Hmm, dat werkt niet.', 'Nee, dat helpt niet.', 'Dat past daar niet.', 'Iets anders proberen...'];
    const fin = v => typeof v === 'number' && isFinite(v);
    function prep(L) {
      if (L._p) return L;
      L._fl = {}; for (const f of L.floors) L._fl[f.id] = f;
      L._od = {}; for (const d of L.objs) L._od[d.id] = d;
      L.ladders = L.ladders || []; L._edges = [];
      for (const l of L.ladders) L._edges.push({ a: l.a, b: l.b, xa: l.x, xb: l.x, t: 'climb' }, { a: l.b, b: l.a, xa: l.x, xb: l.x, t: 'climb' });
      for (const a of L.floors) for (const b of L.floors)
        if (a !== b && Math.abs(a.y - b.y) < .01 && b.x0 >= a.x1 - .01 && b.x0 - a.x1 <= 1.7)
          L._edges.push({ a: a.id, b: b.id, xa: a.x1 - .2, xb: b.x0 + .2, t: 'hop' }, { a: b.id, b: a.id, xa: b.x0 + .2, xb: a.x1 - .2, t: 'hop' });
      L._p = 1; return L;
    }
    const objY = (L, d) => d.y != null ? d.y : L._fl[d.f].y;
    function newState(li) {
      const L = prep(LEVELS[li]);
      const S = { v: CORE_V, lv: li, t: 0, acts: 0, hits: 0, hints: 0, hl: {}, arrow: null, inv: [], o: {}, m: { st: 'ok', bt: 0, stage: 0 }, seq: [], cu: null, done: 0, ev: [] };
      for (const d of L.objs) S.o[d.id] = { x: d.x, y: objY(L, d), hide: d.hide ? 1 : 0 };
      const f = L._fl[L.start.f];
      S.w = { x: L.start.x, f: f.id, y: f.y, face: 1, m: 'idle', mt: 0, q: [], goal: null, kb: null, inv: 0, pend: null, hx: 0 };
      if (L.init) L.init(S);
      return S;
    }
    const ev = (S, t, a) => S.ev.push({ t, a: a || {} });
    function api(L, S) {
      return {
        say(who, text) { ev(S, 'say', { who, text }); },
        fx(t, a) { ev(S, 'fx', Object.assign({ k: t }, a || {})); },
        give(it) { if (S.inv.length >= MAXINV) { ev(S, 'say', { who: 'w', text: 'Mijn rugzak zit vol! Gebruik eerst iets.' }); return false; } S.inv.push(it); ev(S, 'take', { it }); return true; },
        drop(it) { const i = S.inv.indexOf(it); if (i >= 0) S.inv.splice(i, 1); ev(S, 'inv', {}); },
        has: it => S.inv.includes(it),
        after(n, name, arg) { S.seq.push({ at: S.t + Math.max(1, n | 0), n: name, a: arg === undefined ? null : arg }); },
        win() { if (S.m.st !== 'ok') return; S.m.st = 'break'; S.m.bt = 0; S.cu = null; ev(S, 'break', {}); },
        stage() { S.m.stage++; ev(S, 'stage', { n: S.m.stage }); },
        cu(id) { S.cu = id; ev(S, 'cu', { id }); },
        no() { ev(S, 'no', {}); ev(S, 'say', { who: 'w', text: NO[S.acts % NO.length] }); },
      };
    }
    // the walkable part of floor f around x (objects that block are walls)
    function range(L, S, f, x, skip) {
      const F = L._fl[f]; let lo = F.x0 + .25, hi = F.x1 - .25;
      for (const d of L.objs) {
        if (!d.block || d.f !== f || d.id === skip) continue;
        const o = S.o[d.id]; if (o.hide || o.nob) continue;
        const a = o.x - d.w / 2 - .35, b = o.x + d.w / 2 + .35;
        if (b <= x + .001) lo = Math.max(lo, b); else if (a >= x - .001) hi = Math.min(hi, a);
      }
      return [lo, hi];
    }
    function route(L, from, to) {
      if (from === to) return [];
      const prev = { [from]: null }, Q = [from];
      while (Q.length) { const f = Q.shift(); if (f === to) break; for (const e of L._edges) if (e.a === f && !(e.b in prev)) { prev[e.b] = e; Q.push(e.b); } }
      if (!(to in prev)) return null;
      const path = []; let f = to; while (prev[f]) { path.unshift(prev[f]); f = prev[f].a; }
      return path;
    }
    function plan(L, S, f, x) {
      const r = route(L, S.w.f, f); if (!r) return null;
      const q = []; for (const e of r) { q.push({ t: 'walk', x: e.xa }); q.push({ t: e.t, x: e.xb, f: e.b }); }
      q.push({ t: 'walk', x }); return q;
    }
    function stand(L, S, d, o) {
      const f = d.sf || d.f, F = L._fl[f], lo = F.x0 + .25, hi = F.x1 - .25;
      if (d.sx != null) return { f, x: clamp(d.sx, lo, hi) };
      if (d.push != null && !o.pushed) { const dir = Math.sign(d.push - o.x) || 1; return { f, x: clamp(o.x - dir * (d.w / 2 + .45), lo, hi) }; }
      if (d.front) return { f, x: clamp(o.x, lo, hi) };
      const side = S.w.x <= o.x ? -1 : 1; let x = o.x + side * (d.w / 2 + .45);
      if (x < lo || x > hi) x = o.x - side * (d.w / 2 + .45);
      return { f, x: clamp(x, lo, hi) };
    }
    // which object is at room point (x, y)? (a generous box, the smallest one wins)
    function pick(L, S, x, y) {
      prep(L); let best = null, ba = 1e9, near = null, nd = .6;
      for (const d of L.objs) {
        const o = S.o[d.id]; if (o.hide || d.nt) continue;
        const x0 = o.x - d.w / 2, x1 = o.x + d.w / 2, y1 = o.y, y0 = o.y - d.h, p = .3;
        if (x >= x0 - p && x <= x1 + p && y >= y0 - p && y <= y1 + p) { const a = d.w * d.h; if (a < ba) { ba = a; best = d.id; } }
        else { const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1), dd = Math.hypot(dx, dy); if (dd < nd) { nd = dd; near = d.id; } }
      }
      return best || near;
    }
    function floorAt(L, x, y) {
      let best = null, bd = 1e9;
      for (const F of L.floors) {
        const dx = x < F.x0 ? F.x0 - x : x > F.x1 ? x - F.x1 : 0, dy = F.y - y;
        const d = (dy >= -.6 ? dy : 4 - dy * 2) + dx * 3;           // prefer the floor just below the tap
        if (d < bd) { bd = d; best = F.id; }
      }
      return best;
    }
    function cmd(L, S, c) {
      prep(L); if (!S.ev) S.ev = [];
      if (!c || S.done) return false;
      if (c.t === 'cuX') { S.cu = null; return true; }
      if (S.m.st !== 'ok') return false;
      if (c.t === 'pick') { if (S.cu !== c.id || !L.pick) return false; L.pick(S, api(L, S), c.id, c.v); S.acts++; return true; }
      if (c.t === 'comb') {
        if (!S.inv.includes(c.a) || !S.inv.includes(c.b) || c.a === c.b) return false;
        S.acts++; const A = api(L, S);
        if (!(L.comb && L.comb(S, A, c.a, c.b))) { ev(S, 'no', {}); A.say('w', 'Die twee passen niet bij elkaar.'); }
        return true;
      }
      if (c.t === 'tap') {
        if (!fin(c.x) || !fin(c.y)) return false;
        const id = pick(L, S, c.x, c.y);
        c = id ? { t: 'obj', id, item: c.item || null } : { t: 'walk', x: c.x, f: floorAt(L, c.x, c.y) };
      }
      if (c.t === 'obj') { const d = L._od[c.id]; if (!d || S.o[c.id].hide) return false; if (c.item && !S.inv.includes(c.item)) return false; }
      if (c.t === 'walk' && (!L._fl[c.f] || !fin(c.x))) return false;
      if (!['obj', 'walk', 'bark'].includes(c.t)) return false;
      S.cu = null;
      const W = S.w;
      if (['dizzy', 'climb', 'hop', 'act', 'bark'].includes(W.m)) { W.pend = c; return true; }
      return start(L, S, c);
    }
    function start(L, S, c) {
      const W = S.w; W.goal = null; W.q = []; W.pend = null;
      if (c.t === 'bark') { W.m = 'bark'; W.mt = 0; ev(S, 'bark', {}); return true; }
      if (c.t === 'walk') {
        const q = plan(L, S, c.f, c.x); if (!q) { W.m = 'idle'; return false; }
        W.q = q; W.goal = { t: 'walk' }; nextWp(L, S); return true;
      }
      const d = L._od[c.id], o = S.o[c.id];
      if (!c.item && d.far && !(d.push != null && !o.pushed)) {        // a remark from a distance
        if (Math.abs(o.x - W.x) > .2) W.face = Math.sign(o.x - W.x);
        W.m = 'idle'; W.mt = 0; exec(L, S, { t: 'tap', id: c.id }); return true;
      }
      if (!L._fl[d.sf || d.f]) { W.m = 'idle'; W.mt = 0; exec(L, S, { t: c.item ? 'use' : 'tap', id: c.id, item: c.item || null }); return true; }
      const sp = stand(L, S, d, o), q = plan(L, S, sp.f, sp.x);
      if (!q) { W.m = 'idle'; api(L, S).say('w', 'Daar kan ik niet bij.'); return false; }
      W.q = q; W.goal = { t: c.item ? 'use' : 'tap', id: c.id, item: c.item || null, push: d.push != null && !o.pushed && !c.item };
      nextWp(L, S); return true;
    }
    function nextWp(L, S) {
      const W = S.w; W.mt = 0;
      if (!W.q.length) {                                            // arrived
        const g = W.goal;
        if (!g || g.t === 'walk') { if (g) S.acts++; W.goal = null; W.m = 'idle'; return; }
        const o = S.o[g.id]; if (Math.abs(o.x - W.x) > .1) W.face = Math.sign(o.x - W.x);
        if (g.push) { W.m = 'push'; W.goal = null; W.pushId = g.id; ev(S, 'push', {}); }
        else { W.m = 'act'; ev(S, 'reach', { use: !!g.item }); }
        return;
      }
      const wp = W.q[0];
      if (wp.t === 'walk') W.m = 'walk';
      else if (wp.t === 'climb') { W.m = 'climb'; W.f = null; W.lf = wp.f; ev(S, 'climb', {}); }
      else { W.m = 'hop'; W.hx = W.x; W.hy = W.y; W.f = null; W.lf = wp.f; ev(S, 'hop', {}); }
    }
    function exec(L, S, g) {
      if (S.m.st !== 'ok') return;
      const A = api(L, S), d = L._od[g.id], o = S.o[g.id]; S.acts++;
      if (!d || o.hide) return;
      if (g.t === 'use') { if (!S.inv.includes(g.item)) return; if (!(L.use && L.use(S, A, g.item, g.id))) A.no(); return; }
      if (L.tap && L.tap(S, A, g.id)) return;
      if (d.take) { if (A.give(d.take)) { o.hide = 1; ev(S, 'got', { id: g.id }); } return; }
      if (d.cu) { A.cu(g.id); return; }
      A.say('w', d.say || 'Hmm...');
    }
    function setIdle(W) { W.m = 'idle'; W.mt = 0; }
    function woef(L, S, A) {
      const W = S.w; W.mt++;
      switch (W.m) {
        case 'idle': if (W.pend) { const c = W.pend; W.pend = null; start(L, S, c); } break;
        case 'walk': {
          const wp = W.q[0]; if (!wp) { nextWp(L, S); break; }
          const [lo, hi] = range(L, S, W.f, W.x), tx = clamp(wp.x, lo, hi), dx = tx - W.x;
          if (Math.abs(dx) > .01) W.face = Math.sign(dx);
          if (Math.abs(dx) <= WALK) {
            W.x = tx;
            if (Math.abs(tx - wp.x) > .05) { W.q = []; W.goal = null; setIdle(W); A.say('w', 'Daar kan ik niet langs.'); break; }
            W.q.shift(); nextWp(L, S);
          } else W.x += Math.sign(dx) * WALK;
          break;
        }
        case 'climb': {
          const wp = W.q[0], ty = L._fl[wp.f].y, dy = ty - W.y;
          if (Math.abs(dy) <= CLIMB) { W.y = ty; W.f = wp.f; W.q.shift(); nextWp(L, S); } else W.y += Math.sign(dy) * CLIMB;
          break;
        }
        case 'hop': {
          const wp = W.q[0], k = Math.min(1, W.mt / HOP), ty = L._fl[wp.f].y;
          W.x = W.hx + (wp.x - W.hx) * k; W.y = W.hy + (ty - W.hy) * k - Math.sin(Math.PI * k) * .8; W.face = Math.sign(wp.x - W.hx) || W.face;
          if (k >= 1) { W.x = wp.x; W.y = ty; W.f = wp.f; W.q.shift(); nextWp(L, S); }
          break;
        }
        case 'act':
          if (W.mt === ACTX && W.goal) { const g = W.goal; W.goal = null; exec(L, S, g); }
          if (W.m === 'act' && W.mt >= ACT) { setIdle(W); if (W.pend) { const c = W.pend; W.pend = null; start(L, S, c); } }
          break;
        case 'push': {
          const id = W.pushId, d = L._od[id], o = S.o[id]; if (!d) { setIdle(W); break; }
          const dir = Math.sign(d.push - o.x) || 1, off = d.w / 2 + .45;
          W.x += dir * PUSHV; o.x = W.x + dir * off; W.face = dir;
          if ((dir > 0 && o.x >= d.push) || (dir < 0 && o.x <= d.push)) {
            o.x = d.push; W.x = o.x - dir * off; o.pushed = 1; setIdle(W); S.acts++; ev(S, 'pushed', { id });
            if (L.pushed) L.pushed(S, A, id);
          }
          break;
        }
        case 'bark':
          if (W.mt === BARKX) { S.acts++; if (!(typeof L.bark === 'function' && L.bark(S, A))) ev(S, 'barknone', {}); }
          if (W.mt >= BARK) { setIdle(W); if (W.pend) { const c = W.pend; W.pend = null; start(L, S, c); } }
          break;
        case 'dizzy':
          if (W.kb) { const k = Math.min(1, W.mt / KBT), e = 1 - (1 - k) * (1 - k); W.x = W.kb.x0 + (W.kb.x1 - W.kb.x0) * e; if (k >= 1) W.kb = null; }
          if (W.mt >= DIZZY) { setIdle(W); W.inv = S.t + INVUL; }
          break;
      }
    }
    function zones(L, S) { if (S.m.st !== 'ok' || !L.hazard) return []; return L.hazard(S) || []; }
    function hit(L, S, z) {
      const W = S.w; S.hits++;
      const dir = W.x < z.cx ? -1 : 1, [lo, hi] = range(L, S, W.f, W.x, W.m === 'push' ? W.pushId : null);
      const tx = clamp(dir < 0 ? z.x0 - .7 : z.x1 + .7, lo, hi);
      W.kb = { x0: W.x, x1: tx }; W.m = 'dizzy'; W.mt = 0; W.q = []; W.goal = null; W.pend = null; W.face = -dir; S.cu = null;
      ev(S, 'hit', { kind: z.kind });
    }
    function step(L, S) {
      prep(L); S.ev = []; if (S.done) return;
      S.t++;
      const A = api(L, S), W = S.w, M = S.m;
      if (S.seq.length) {
        const due = S.seq.filter(e => e.at <= S.t);
        if (due.length) { S.seq = S.seq.filter(e => e.at > S.t); for (const e of due) if (L.ev && L.ev[e.n]) L.ev[e.n](S, A, e.a); }
      }
      if (L.tick) L.tick(S, A);
      if (M.st !== 'ok') {
        M.bt++;
        if (M.bt === 100) { M.st = 'gone'; ev(S, 'boom', {}); }
        if (M.bt === 125) { W.q = []; W.goal = null; W.pend = null; if (W.f) { W.m = 'cheer'; W.mt = 0; } ev(S, 'cheer', {}); }
        if (M.bt === 140) ev(S, L.final ? 'cage' : 'flee', {});
        if (L.final && M.bt === 260) ev(S, 'sorry', {});
        if (M.bt === (L.final ? 480 : 300)) { S.done = 1; ev(S, 'done', {}); }
        if (W.m === 'idle' && M.bt > 125 && W.f) { W.m = 'cheer'; W.mt = 0; }
      }
      woef(L, S, A);
      if (W.f && W.m !== 'dizzy' && W.m !== 'cheer' && S.t >= W.inv) {
        for (const z of zones(L, S)) if (z.ph === 2 && (z.f === W.f) && W.x > z.x0 && W.x < z.x1) { hit(L, S, z); break; }
      }
    }
    function hint(L, S) {
      const st = Math.max(0, Math.min(L.hints.length - 1, L.stage ? L.stage(S) : 0));
      const n = Math.min(3, (S.hl[st] || 0) + 1); S.hl[st] = n; S.hints++;
      const h = L.hints[st][n - 1], t = typeof h === 'string' ? h : h.t;
      if (n === 3) S.arrow = { st, at: h.at };
      return { st, n, t, at: n === 3 ? h.at : null };
    }
    function arrow(L, S) { if (!S.arrow || S.m.st !== 'ok') return null; const st = L.stage ? L.stage(S) : 0; return st === S.arrow.st ? S.arrow.at : null; }
    const stars = S => 1 + (S.hints <= 1 ? 1 : 0) + (S.hits <= 2 ? 1 : 0);
    // after loading a saved game: put Woef on solid ground and drop half-finished moves (the rest is the saved logic state)
    function sanitize(L, S) {
      prep(L);
      if (!S || S.v !== CORE_V || !S.w || !S.o || !S.m) return false;
      for (const d of L.objs) if (!S.o[d.id]) return false;
      const W = S.w; S.ev = []; S.cu = null;
      if (!W.f || !L._fl[W.f]) { const f = W.lf && L._fl[W.lf] ? W.lf : L.start.f; const wp = W.q && W.q[0]; W.f = f; if (wp && fin(wp.x) && wp.f === f) W.x = wp.x; }
      if (!fin(W.x)) W.x = L.start.x;
      const F = L._fl[W.f]; W.x = clamp(W.x, F.x0 + .25, F.x1 - .25); W.y = F.y;
      if (W.m === 'push' && W.pushId) { const d = L._od[W.pushId], o = S.o[W.pushId]; if (d && fin(o.x)) { o.x = clamp(o.x, Math.min(d.x, d.push), Math.max(d.x, d.push)); } }
      W.q = []; W.goal = null; W.kb = null; W.pend = null; W.mt = 0; W.m = S.m.st === 'ok' ? 'idle' : 'cheer'; if (!fin(W.inv)) W.inv = 0;
      if (!Array.isArray(S.inv)) S.inv = []; S.inv = S.inv.filter(i => ITEMS[i]).slice(0, MAXINV);
      if (!Array.isArray(S.seq)) S.seq = []; S.seq = S.seq.filter(e => e && fin(e.at) && L.ev && L.ev[e.n]);
      for (const k of ['t', 'hits', 'hints', 'acts']) if (!fin(S[k])) S[k] = 0;
      for (const id in S.o) { const o = S.o[id]; for (const k in o) if (typeof o[k] === 'number' && !fin(o[k])) o[k] = 0; }
      return true;
    }
    const finite = S => !!S && [S.t, S.w.x, S.w.y].every(fin) && Object.values(S.o).every(o => fin(o.x) && fin(o.y));
    return { newState, cmd, step, hint, arrow, stars, sanitize, pick, zones, range, prep, finite, floorAt, stand, C: { WALK, ACT, BARK, DIZZY, HOP, MAXINV } };
  })();

  /* ================= art.js: everything on the canvas, drawn with shapes (no images) =================
     Units: one room unit = R.s css pixels; y grows downwards. The static room (walls, floors, ladders, decoration) is
     pre-rendered into an offscreen canvas; Woef, Karel, the objects, the machine and the particles are drawn per frame. */
  const Art = (() => {
    const OUT = '#2a1f3d', LW = .055;
    let c = null;                                                   // the context the helpers draw into
    const P = {
      fur: '#e9a65a', fur2: '#c9843e', light: '#fbe6c4', ear: '#8a4f2c', ear2: '#6e3d22', nose: '#2a1f2a', scarf: '#e23b3b', scarf2: '#b52430',
      pack: '#2fb59a', pack2: '#1f8c76', kfur: '#9a9aaa', kfur2: '#77778a', kmask: '#3b3b4c', coat: '#f7f7f2', coat2: '#d9dbe2', gog: '#8a5a32', lens: '#bfe8ff',
    };
    const WORLDCOL = [
      { wall: '#f6c77e', wall2: '#e8ad62', low: '#d98a4e', floor: '#8d6e5a', floor2: '#a8846a', frame: '#3b2418', beam: '#a0683a' },
      { wall: '#a9cbe2', wall2: '#93b8d4', low: '#6f93b4', floor: '#56657a', floor2: '#7a8aa0', frame: '#16243a', beam: '#5b6b84' },
      { wall: '#cfe6ff', wall2: '#e8dcff', low: '#b8a8ec', floor: '#e4dcff', floor2: '#ffffff', frame: '#251a4a', beam: '#8f7fd8' },
    ];
    /* ---------- drawing helpers ---------- */
    function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    function el(x, y, rx, ry, a = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), a, 0, Math.PI * 2); }
    function circ(x, y, r) { c.beginPath(); c.arc(x, y, Math.abs(r), 0, Math.PI * 2); }
    function fs(fill, stroke = OUT, lw = LW) { if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); } }
    function ln(x0, y0, x1, y1, col = OUT, lw = LW) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); }
    function poly(pts) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
    // a picture cache for big static parts: fn draws in local units around (ox, oy); the result is drawn at (x, y)
    const PCX = new Map();
    function cached(key, w, h, ox, oy, fn, x, y) {
      const m = c.getTransform(), sc = Math.round(Math.max(.01, Math.hypot(m.a, m.b)) * 20) / 20, k = key + '|' + sc;
      let e = PCX.get(k);
      if (!e) {
        const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w * sc)); cv.height = Math.max(1, Math.ceil(h * sc));
        const x2 = cv.getContext('2d'); x2.setTransform(sc, 0, 0, sc, ox * sc, oy * sc); x2.lineJoin = x2.lineCap = 'round';
        const prev = c; c = x2; try { fn(); } finally { c = prev; }
        e = cv; PCX.set(k, e); if (PCX.size > 60) PCX.delete(PCX.keys().next().value);
      }
      c.drawImage(e, x - ox, y - oy, w, h);
    }
    // text is drawn from a cache of small pictures (drawing letters every frame is slow on simple phones)
    const TXC = new Map();
    function txt(t, x, y, size, col = OUT, weight = 900, align = 'center') {
      const m = c.getTransform(), sc = Math.max(.01, Math.hypot(m.a, m.b)), q = Math.round(sc * size * 4) / 4, key = t + '|' + q + '|' + col + '|' + weight;
      let e = TXC.get(key);
      if (!e) {
        const font = `${weight} ${q}px system-ui,'Segoe UI',Roboto,sans-serif`, cv = document.createElement('canvas'), x2 = cv.getContext('2d'); x2.font = font;
        const w = Math.ceil(x2.measureText(t).width) + 4, h = Math.ceil(q * 1.5) + 4; cv.width = w; cv.height = h;
        x2.font = font; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillStyle = col; x2.fillText(t, w / 2, h / 2);
        e = { cv, w: w / sc, h: h / sc }; TXC.set(key, e); if (TXC.size > 500) TXC.delete(TXC.keys().next().value);
      }
      const dx = align === 'left' ? 0 : align === 'right' ? -e.w : -e.w / 2;
      c.drawImage(e.cv, x + dx + (align === 'center' ? 0 : 2 / sc), y - e.h / 2, e.w, e.h);
    }
    function cap(x0, y0, x1, y1, w, col) { c.lineCap = 'round'; ln(x0, y0, x1, y1, OUT, w + LW * 2); ln(x0, y0, x1, y1, col, w); }
    function star(x, y, r, col) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); fs(col, OUT, LW * .8); }
    function bolt(x, y, s) { poly([[x - .12 * s, y - .3 * s], [x + .12 * s, y - .3 * s], [x, y - .05 * s], [x + .14 * s, y - .05 * s], [x - .1 * s, y + .3 * s], [x, y + .03 * s], [x - .14 * s, y + .03 * s]]); fs('#ffd23a', OUT, LW * .7); }
    function gear(x, y, r, n, rot, col, hole = '#00000000') {
      c.beginPath();
      for (let i = 0; i < n * 2; i++) { const a0 = rot + i * Math.PI / n, a1 = rot + (i + 1) * Math.PI / n, R = i % 2 ? r * .8 : r; c.arc(x, y, R, a0, a1); }
      c.closePath(); fs(col); circ(x, y, r * .28); fs('#5a5a6a');
    }
    function spring(x0, y0, x1, y1, n, w, col = '#c9ccd6') { c.beginPath(); for (let i = 0; i <= n * 2; i++) { const k = i / (n * 2), px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, s = (i % 2 ? 1 : -1) * w * (i && i < n * 2 ? 1 : 0); c.lineTo(px + nx / l * s, py + ny / l * s); } c.lineWidth = LW * 1.6; c.strokeStyle = OUT; c.stroke(); c.lineWidth = LW * .8; c.strokeStyle = col; c.stroke(); }
    function face(x, y, s, mood = 'grr', blink = 0) {        // the machines' faces: two eyes and a mouth
      for (const dx of [-.22, .22]) { el(x + dx * s, y, .14 * s, (blink ? .03 : .15) * s); fs('#fff'); if (!blink) { circ(x + (dx + .03) * s, y + .02 * s, .065 * s); fs(OUT, null); } }
      if (mood === 'grr') { ln(x - .38 * s, y - .25 * s, x - .1 * s, y - .16 * s, OUT, LW * 1.4); ln(x + .38 * s, y - .25 * s, x + .1 * s, y - .16 * s, OUT, LW * 1.4); }
      if (mood === 'sad') { ln(x - .36 * s, y - .16 * s, x - .1 * s, y - .25 * s, OUT, LW * 1.4); ln(x + .36 * s, y - .16 * s, x + .1 * s, y - .25 * s, OUT, LW * 1.4); }
      c.beginPath(); if (mood === 'grr') { c.moveTo(x - .2 * s, y + .32 * s); c.quadraticCurveTo(x, y + .22 * s, x + .2 * s, y + .32 * s); } else if (mood === 'ha') { c.moveTo(x - .22 * s, y + .22 * s); c.quadraticCurveTo(x, y + .5 * s, x + .22 * s, y + .22 * s); c.closePath(); c.fillStyle = '#7a2a3a'; c.fill(); } else if (mood === 'o') { el(x, y + .32 * s, .09 * s, .12 * s); c.fillStyle = '#7a2a3a'; c.fill(); } else { c.moveTo(x - .2 * s, y + .3 * s); c.quadraticCurveTo(x, y + .4 * s, x + .2 * s, y + .3 * s); }
      c.lineWidth = LW * 1.2; c.strokeStyle = OUT; c.stroke();
    }
    const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1); };

    /* ---------- Woef: a brave cartoon dog with a red scarf, a little backpack and big floppy ears ---------- */
    function leg(hx, hy, ang, len, col, paw) { const fx = hx + Math.sin(ang) * len, fy = hy + Math.cos(ang) * len; cap(hx, hy, fx, fy, .17, col); el(fx + .05, fy - .02, .12, .07); fs(paw || col); }
    function woef(x, y, face_, Q) {
      const t = Q.t || 0, up = Q.up || 0, sw = Q.sw || 0, sc = Q.sc || 1;
      c.save(); c.translate(x, y);
      if (Q.shadow !== false) { el(0, .02, .7 * sc, .1 * sc); c.fillStyle = 'rgba(40,20,40,.22)'; c.fill(); }
      c.scale(face_ * sc, sc); c.translate(0, Q.bob || 0); if (Q.rot) c.rotate(Q.rot);
      // tail (wagging)
      const tw = Math.sin(t * (Q.wag || .25)) * .35;
      c.save(); c.translate(-.55, -.85); c.rotate(-.9 + tw - up * .6); cap(0, 0, 0, -.42, .13, P.fur); circ(0, -.44, .08); fs(P.light, OUT, LW * .7); c.restore();
      // far legs (darker)
      const s1 = Math.sin(sw) * .5, s2 = -s1;
      leg(-.36, -.55, s2 * (1 - up), .55, P.fur2, P.fur2);
      // upper body (rotates around the hip when he stands up)
      c.save(); c.translate(-.36, -.55); c.rotate(-up * 1.15 + (Q.lean || 0)); c.translate(.36, .55);
      const arm = Q.arm != null ? Q.arm : s1 * (1 - up);
      leg(.32, -.6, (Q.arm2 != null ? Q.arm2 : -arm), .55, P.fur2, P.fur2);
      el(0, -.72, .62, .33); fs(P.fur);                                           // body
      el(.06, -.58, .42, .16); fs(P.light, null);
      // backpack
      rr(-.48, -1.13, .5, .38, .1); fs(P.pack); rr(-.46, -1.15, .46, .14, .07); fs(P.pack2); rr(-.27, -1.07, .09, .1, .02); fs('#ffd23a', OUT, LW * .6);
      leg(.32, -.6, arm, .55, P.fur, P.light);
      // head (stays upright)
      c.save(); c.translate(.48, -.92); c.rotate(up * 1.0 + (Q.head || 0)); c.scale(1.18, 1.18); c.translate(-.48, .92);
      // scarf: band + flapping ends
      const fl = Math.sin(t * .3) * .08;
      c.beginPath(); c.moveTo(.32, -.9); c.quadraticCurveTo(.1, -.86 + fl, -.06, -.7 + fl); c.lineTo(.04, -.66 + fl); c.quadraticCurveTo(.16, -.78, .3, -.8); c.closePath(); fs(P.scarf2);
      el(.47, -.88, .2, .13, .5); fs(P.scarf);
      // back ear (behind the head)
      el(.4, -1.42, .1, .2, -.5 - (Q.ear || 0) * .6); fs(P.ear2);
      circ(.62, -1.2, .34); fs(P.fur);
      el(.9, -1.07, .23, .16); fs(P.light);                                        // muzzle
      const mo = Q.mouth || 0;
      if (mo > .05) { c.beginPath(); c.moveTo(.76, -1.0); c.quadraticCurveTo(.92, -.86 - mo * .14, 1.08, -1.0); c.closePath(); fs('#8a2a3a', OUT, LW * .8); el(.95, -.95 - mo * .02, .07, .04); fs('#ff8a9a', null); }
      else { c.beginPath(); c.moveTo(.8, -1.0); c.quadraticCurveTo(.9, -.93, 1.0, -.99); c.lineWidth = LW; c.strokeStyle = OUT; c.stroke(); }
      el(1.08, -1.12, .075, .06); fs(P.nose);
      if (Q.cream) { el(.92, -1.1, .2, .15); fs('#fff8e8', '#e8d8c0'); circ(.98, -1.24, .07); fs('#e8453c', null); }
      // eye
      const ey = Q.eyes || 'o';
      if (ey === 'happy' || ey === 'laugh') { c.beginPath(); c.arc(.7, -1.24, .07, Math.PI * 1.1, Math.PI * 1.9); c.lineWidth = LW * 1.3; c.strokeStyle = OUT; c.stroke(); }
      else if (ey === 'dizzy') { c.beginPath(); for (let k = 0; k < 14; k++) { const a = k * .7 + t * .2, r = .015 + k * .006; c.lineTo(.7 + Math.cos(a) * r, -1.26 + Math.sin(a) * r); } c.lineWidth = LW * .8; c.strokeStyle = OUT; c.stroke(); }
      else if (ey === 'closed' || Q.blink) { ln(.63, -1.25, .77, -1.25, OUT, LW * 1.2); }
      else { el(.7, -1.26, .085, .1); fs('#fff', OUT, LW * .8); circ(.73, -1.25, .05); fs(OUT, null); circ(.745, -1.27, .018); fs('#fff', null); ln(.6, -1.42, .8, -1.4, OUT, LW * 1.1); }
      el(.62, -1.08, .06, .035); c.fillStyle = 'rgba(255,120,120,.45)'; c.fill();
      // front ear (big and floppy)
      c.save(); c.translate(.5, -1.42); c.rotate(-.35 + Math.sin(t * .2) * .05 - (Q.ear || 0)); el(-.05, .22, .13, .3); fs(P.ear); c.restore();
      if (Q.stamp) { c.save(); c.translate(.6, -1.45); c.rotate(-.2); rr(-.28, -.1, .56, .2, .04); fs('rgba(255,255,255,.0)', '#c0304a', LW * .9); txt('KAREL', 0, .01, .13, '#c0304a'); c.restore(); }
      if (Q.carry) { c.save(); c.translate(1.08, -.95); c.scale(.55, .55); item(Q.carry, 0, 0); c.restore(); }
      c.restore(); // head
      c.restore(); // upper body
      leg(-.36, -.55, s1 * (1 - up) * .9 + (Q.hind || 0), .55, P.fur, P.light);
      if (Q.wet) for (let k = 0; k < 4; k++) { const dx = -.4 + k * .3, dy = -1.5 + ((t * .06 + k * .3) % 1) * .9; el(dx, dy, .04, .07); c.fillStyle = 'rgba(80,160,255,.8)'; c.fill(); }
      c.restore();
      if (Q.stars) { for (let k = 0; k < 3; k++) { const a = t * .12 + k * 2.1; star(x + Math.cos(a) * .45 * sc, y - 1.75 * sc + Math.sin(a) * .12, .11, '#ffd23a'); } }
      if (Q.bubble) { circ(x, y - .8 * sc, 1.05 * sc); c.fillStyle = 'rgba(200,230,255,.25)'; c.fill(); c.lineWidth = LW; c.strokeStyle = 'rgba(120,170,255,.8)'; c.stroke(); el(x - .4 * sc, y - 1.3 * sc, .18, .1, -.6); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); }
    }
    // the pose from the logic state (and a little render memory: the last hit, what he just picked up)
    function woefPose(S, RS, sel) {
      const W = S.w, t = S.t, Q = { t, sw: 0, up: 0, carry: sel || null };
      Q.blink = (t % 220) < 6;
      switch (W.m) {
        case 'walk': Q.sw = W.x * 3.2; Q.bob = -Math.abs(Math.sin(W.x * 3.2)) * .05; Q.wag = .45; break;
        case 'push': Q.sw = W.x * 4; Q.lean = .18; Q.head = -.15; Q.arm = -.5; Q.arm2 = -.3; Q.eyes = 'closed'; break;
        case 'climb': Q.up = 1; Q.sw = 0; Q.arm = Math.sin(W.y * 5) * .6 - 1.2; Q.arm2 = -Math.sin(W.y * 5) * .6 - 1.2; Q.hind = Math.sin(W.y * 5) * .3; Q.shadow = false; break;
        case 'hop': Q.sw = 1; Q.arm = -.8; Q.hind = .8; Q.shadow = false; break;
        case 'act': { const k = Math.min(1, W.mt / 9); Q.up = .55 * Math.sin(Math.min(1, W.mt / 20) * Math.PI); Q.arm = -1.6 * k; break; }
        case 'bark': { const k = Math.sin(Math.min(1, W.mt / 42) * Math.PI); Q.mouth = k; Q.head = -.25 * k; Q.ear = .5 * k; Q.up = .15 * k; break; }
        case 'dizzy': {
          const kind = RS.hitKind; Q.eyes = 'dizzy'; Q.stars = 1; Q.rot = Math.sin(t * .3) * .08;
          if (kind === 'suck' && W.mt < 22) Q.rot = W.mt * .5;
          if (kind === 'mag' && W.mt < 30) Q.bob = -Math.sin(W.mt / 30 * Math.PI) * 1.2;
          if (kind === 'bubble' && W.mt < 40) { Q.bubble = 1; Q.bob = -Math.sin(W.mt / 40 * Math.PI) * 1.4; }
          if (kind === 'splash' || kind === 'drop' || kind === 'rain') Q.wet = 1;
          if (kind === 'pie') Q.cream = 1;
          if (kind === 'stamp') Q.stamp = 1;
          if (kind === 'zap') Q.sc = .6 + .4 * Math.min(1, W.mt / 80);
          if (kind === 'tickle') { Q.eyes = 'laugh'; Q.mouth = .6 + Math.sin(t * .8) * .3; Q.stars = 0; }
          if (kind === 'ring') { Q.ear = .9; Q.rot = Math.sin(t * 1.5) * .06; }
          if (kind === 'wind') Q.ear = .8;
          break;
        }
        case 'cheer': Q.up = .9 + Math.sin(t * .2) * .05; Q.arm = -2.6 + Math.sin(t * .3) * .3; Q.arm2 = -2.3 - Math.sin(t * .3) * .3; Q.eyes = 'happy'; Q.mouth = .7; Q.wag = .6; Q.bob = -Math.abs(Math.sin(t * .15)) * .25; break;
        default: Q.bob = Math.sin(t * .08) * .012;
      }
      if (RS.wetT > t && W.m !== 'dizzy') Q.wet = 1;
      if (RS.takeT > t && RS.takeIt) Q.carry = RS.takeIt;
      return Q;
    }

    /* ---------- Karel: a grumpy inventor raccoon with flying goggles and a lab coat ---------- */
    function karel(x, y, s, Q = {}) {
      const t = Q.t || 0, mood = Q.mood || 'taunt';
      c.save(); c.translate(x, y); c.scale(s * (Q.face || 1), s);
      // striped tail
      c.save(); c.translate(-.3, -.45); c.rotate(-.6 + Math.sin(t * .15) * .15);
      for (let i = 0; i < 5; i++) { el(-.05 - i * .13, -.08 - i * .1, .17 - i * .01, .14, .5); fs(i % 2 ? P.kmask : P.kfur, OUT, LW * .7); }
      c.restore();
      cap(-.14, -.4, -.16, -.03, .15, P.kmask); cap(.14, -.4, .16, -.03, .15, P.kmask);       // legs
      poly([[-.36, -1.05], [.36, -1.05], [.46, -.32], [-.46, -.32]]); fs(P.coat);                  // lab coat
      ln(0, -1.0, 0, -.34, P.coat2, LW * .9); rr(.12, -.78, .2, .18, .03); fs(P.coat2, OUT, LW * .6); ln(.17, -.86, .17, -.74, '#3a7ce8', LW * .9); ln(.24, -.88, .24, -.74, '#e8453c', LW * .9);
      // arms
      const ar = mood === 'taunt' ? [-.3 + Math.sin(t * .4) * .2, -2.4] : mood === 'angry' ? [-2.6 + Math.sin(t * .9) * .4, -2.6 - Math.sin(t * .9) * .4] : mood === 'flee' ? [-2.8 + Math.sin(t * .7), -2.9 - Math.sin(t * .7)] : mood === 'sulk' ? [.9, -.9] : [.3, -.3];
      c.save(); c.translate(-.32, -.95); c.rotate(-ar[0] * .6); cap(0, 0, -.05, .42, .14, P.coat); circ(-.05, .48, .08); fs(P.kmask); c.restore();
      c.save(); c.translate(.32, -.95); c.rotate(ar[1] * -.6 - (mood === 'taunt' ? 1.6 : 0)); cap(0, 0, .05, .42, .14, P.coat); circ(.05, .48, .08); fs(P.kmask); if (mood === 'taunt') { cap(.05, .5, .05, .64, .05, P.kmask); } c.restore();
      // head
      const hy = -1.42 + (mood === 'taunt' ? Math.sin(t * .5) * .03 : 0);
      for (const sx of [-1, 1]) { circ(sx * .3, hy - .3, .13); fs(P.kfur); circ(sx * .3, hy - .3, .06); fs('#d8a0b0', null); }
      el(0, hy, .4, .34); fs(P.kfur);
      el(0, hy + .14, .25, .17); fs('#f4f2f0', null);                                             // white snout
      c.beginPath(); c.moveTo(-.38, hy - .02); c.quadraticCurveTo(-.2, hy - .2, 0, hy - .06); c.quadraticCurveTo(.2, hy - .2, .38, hy - .02); c.quadraticCurveTo(.2, hy + .12, 0, hy + .02); c.quadraticCurveTo(-.2, hy + .12, -.38, hy - .02); fs(P.kmask, null); // the mask
      for (const sx of [-1, 1]) { circ(sx * .16, hy - .04, .075); fs('#fff', null); circ(sx * .16 + (mood === 'sulk' ? 0 : .015), hy - .03 + (mood === 'sulk' ? .02 : 0), .035); fs(OUT, null); }
      // eyebrows: grumpy
      const bA = mood === 'sulk' ? -.3 : mood === 'flee' ? -.2 : .35;
      for (const sx of [-1, 1]) { c.save(); c.translate(sx * .17, hy - .17); c.rotate(sx * bA); rr(-.1, -.025, .2, .05, .02); fs('#f4f2f0', OUT, LW * .5); c.restore(); }
      el(0, hy + .08, .07, .05); fs(OUT, null);                                                    // nose
      c.beginPath();
      if (mood === 'taunt') { c.moveTo(-.13, hy + .16); c.quadraticCurveTo(0, hy + .32, .13, hy + .16); c.closePath(); fs('#7a2a3a', OUT, LW * .6); rr(-.05, hy + .16, .045, .05, .01); fs('#fff', null); rr(.005, hy + .16, .045, .05, .01); fs('#fff', null); }
      else if (mood === 'angry' || mood === 'flee') { el(0, hy + .23, .08, .06 + Math.abs(Math.sin(t * .6)) * .03); fs('#7a2a3a', OUT, LW * .6); }
      else { c.moveTo(-.12, hy + .25); c.quadraticCurveTo(0, hy + .17, .12, hy + .25); c.lineWidth = LW; c.strokeStyle = OUT; c.stroke(); }
      // flying goggles on the forehead
      rr(-.4, hy - .3, .8, .09, .04); fs(P.gog, OUT, LW * .6);
      for (const sx of [-1, 1]) { circ(sx * .15, hy - .27, .1); fs('#c08040', OUT, LW * .6); circ(sx * .15, hy - .27, .065); fs(P.lens, null); }
      if (mood === 'angry') { for (const sx of [-1, 1]) { circ(sx * .5, hy - .45 - (t * .02 % .3), .06); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); } }
      c.restore();
    }
    // his flying contraption (one per world) with Karel in it
    function flyer(x, y, s, w, Q) {
      const t = Q.t || 0;
      c.save(); c.translate(x, y); c.scale(s, s);
      if (w === 0) {          // a propeller bathtub
        karel(0, .1, .62, Q);
        c.beginPath(); c.moveTo(-.8, -.25); c.lineTo(.8, -.25); c.quadraticCurveTo(.78, .32, .4, .36); c.lineTo(-.4, .36); c.quadraticCurveTo(-.78, .32, -.8, -.25); fs('#ffffff'); ln(-.82, -.25, .82, -.25, OUT, LW * 2);
        for (const sx of [-.45, .45]) { circ(sx, .44, .07); fs('#ffd23a'); }
        el(.55, -.33, .12, .09); fs('#ffd23a', OUT, LW * .6); circ(.62, -.38, .02); fs(OUT, null);
        ln(-.6, -.25, -.6, -1.15, '#888', LW * 1.4); const pa = t * .9; el(-.6, -1.17, .45 * Math.abs(Math.cos(pa)), .06); fs('#e8453c', OUT, LW * .6); circ(-.6, -1.17, .05); fs('#555', null);
      } else if (w === 1) {   // a teapot copter
        karel(0, -.05, .6, Q);
        c.beginPath(); c.ellipse(0, .1, .8, .42, 0, 0, Math.PI); c.lineTo(-.8, .1); fs('#7ac4f0'); rr(-.84, .02, 1.68, .12, .05); fs('#5aa4d8');
        c.beginPath(); c.moveTo(.75, .2); c.quadraticCurveTo(1.15, .1, 1.2, -.2); c.lineWidth = .1; c.strokeStyle = OUT; c.stroke(); c.lineWidth = .06; c.strokeStyle = '#7ac4f0'; c.stroke();
        c.beginPath(); c.arc(-.85, .25, .18, Math.PI * .5, Math.PI * 1.5); c.lineWidth = .08; c.strokeStyle = OUT; c.stroke();
        for (let k = 0; k < 2; k++) { const p = (t * .02 + k * .5) % 1; circ(1.25 + p * .3, -.3 - p * .6, .08 + p * .1); c.fillStyle = `rgba(255,255,255,${.7 - p * .7})`; c.fill(); }
        ln(.5, .02, .5, -1.2, '#888', LW * 1.4); const pa = t * .9; el(.5, -1.22, .5 * Math.abs(Math.cos(pa)), .06); fs('#ffd23a', OUT, LW * .6);
      } else {                // an umbrella chair with a tiny rocket
        c.beginPath(); c.arc(0, -.95, .95, Math.PI, 0); c.quadraticCurveTo(.7, -1.05, .48, -.95); c.quadraticCurveTo(.24, -1.05, 0, -.95); c.quadraticCurveTo(-.24, -1.05, -.48, -.95); c.quadraticCurveTo(-.7, -1.05, -.95, -.95); fs('#ff7ab0');
        ln(0, -1.9, 0, .1, '#555', LW * 1.4);
        karel(0, .05, .6, Q);
        rr(-.5, .05, 1.0, .14, .05); fs('#8a5a32');
        rr(-.18, .2, .36, .5, .12); fs('#e8453c'); poly([[-.18, .62], [0, .82], [.18, .62]]); fs('#ffd23a');
        for (let k = 0; k < 3; k++) { const p = (t * .03 + k / 3) % 1; circ(Math.sin(k * 3 + t * .1) * .1, .85 + p * .7, .07 + p * .14); c.fillStyle = `rgba(255,255,255,${.6 - p * .6})`; c.fill(); }
      }
      c.restore();
    }

    /* ---------- items (inventory icons and the things in the room) ---------- */
    function item(k, x, y) {
      c.save(); c.translate(x, y);
      switch (k) {
        case 'cactus': rr(-.24, .02, .48, .3, .06); fs('#d8703a'); rr(-.28, -.02, .56, .1, .04); fs('#e8885a'); c.beginPath(); c.moveTo(-.12, 0); c.lineTo(-.12, -.5); c.arc(0, -.5, .12, Math.PI, 0); c.lineTo(.12, 0); fs('#4cae4c'); cap(-.12, -.28, -.26, -.32, .08, '#4cae4c'); cap(-.26, -.32, -.26, -.46, .08, '#4cae4c'); cap(.12, -.2, .25, -.26, .08, '#4cae4c'); cap(.25, -.26, .25, -.38, .08, '#4cae4c'); for (const [a, b] of [[-.06, -.4], [.05, -.3], [-.05, -.15], [.06, -.55]]) ln(a, b, a + .06, b - .04, '#fff', .02); circ(0, -.64, .05); fs('#ff7ab0', null); break;
        case 'worst': c.save(); c.rotate(-.3); el(0, 0, .42, .13); fs('#c65a3a'); el(-.05, -.04, .3, .04); c.fillStyle = 'rgba(255,255,255,.3)'; c.fill(); ln(-.44, 0, -.52, -.05, OUT, .03); ln(.44, 0, .52, -.05, OUT, .03); c.restore(); break;
        case 'wiel': circ(0, 0, .36); fs(null, OUT, .14); circ(0, 0, .36); fs(null, '#e8453c', .09); for (let i = 0; i < 3; i++) { const a = i * 2.09; ln(0, 0, Math.cos(a) * .34, Math.sin(a) * .34, '#e8453c', .06); } circ(0, 0, .08); fs('#888'); break;
        case 'batt': rr(-.18, -.38, .36, .7, .06); fs('#3cb45a'); rr(-.18, -.38, .36, .22, .06); fs('#ffd23a'); rr(-.07, -.46, .14, .08, .02); fs('#bbb'); bolt(0, .08, .55); break;
        case 'recept': c.rotate(-.1); rr(-.3, -.36, .6, .72, .04); fs('#fffdf4'); txt('PEPER', 0, -.2, .13, '#c0304a'); for (let i = 0; i < 4; i++) ln(-.2, -.04 + i * .1, .2, -.04 + i * .1, '#bbb', .025); circ(.17, .25, .06); fs('#8a5a32', null); break;
        case 'peper': c.beginPath(); c.moveTo(-.28, -.3); c.lineTo(.28, -.3); c.lineTo(.34, .34); c.lineTo(-.34, .34); c.closePath(); fs('#e8d8b8'); ln(-.28, -.3, .28, -.3, OUT, .06); txt('PEPER', 0, .05, .14, '#5a3a2a'); break;
        case 'lijmpot': case 'lijm': rr(-.26, -.24, .52, .56, .08); fs('#f0f0f0'); rr(-.26, -.02, .52, .2, .02); fs('#ff9f2a', null); txt('LIJM', 0, .08, .13, '#5a2a1a'); if (k === 'lijmpot') { rr(-.3, -.34, .6, .14, .04); fs('#3a7ce8'); } else { el(0, -.25, .24, .06); fs('#ffe9a0'); c.beginPath(); c.moveTo(.1, -.26); c.quadraticCurveTo(.2, -.05, .14, .1); c.lineWidth = .05; c.strokeStyle = '#ffe9a0'; c.stroke(); } break;
        case 'schroef': c.rotate(-.7); rr(-.08, -.42, .16, .4, .06); fs('#e8453c'); ln(0, -.04, 0, .36, OUT, .1); ln(0, -.04, 0, .36, '#c9ccd6', .06); break;
        case 'magneet': c.beginPath(); c.arc(0, 0, .3, Math.PI, 0, true); c.lineWidth = .24; c.strokeStyle = OUT; c.stroke(); c.lineWidth = .17; c.strokeStyle = '#e8453c'; c.stroke(); rr(-.385, -.14, .17, .14, .02); fs('#d8dbe2'); rr(.215, -.14, .17, .14, .02); fs('#d8dbe2'); break;
        case 'stok': c.rotate(-.6); rr(-.05, -.5, .1, 1.0, .05); fs('#b07a42'); break;
        case 'hengel': c.rotate(-.5); rr(-.04, -.5, .08, .9, .04); fs('#b07a42'); ln(0, -.5, .25, -.2, '#888', .02); c.save(); c.translate(.28, -.1); c.scale(.4, .4); item('magneet', 0, 0); c.restore(); break;
        case 'sleutel': c.rotate(-.6); rr(-.05, -.3, .1, .6, .03); fs('#c9ccd6'); c.beginPath(); c.arc(0, -.34, .14, Math.PI * .25, Math.PI * 2.75); fs('#c9ccd6'); c.beginPath(); c.arc(0, .36, .12, Math.PI * 1.25, Math.PI * 3.75); fs('#c9ccd6'); break;
        case 'key': circ(-.18, 0, .14); fs('#ffcf3a'); circ(-.18, 0, .06); fs('#fff6c8', null); rr(-.06, -.04, .4, .08, .02); fs('#ffcf3a'); rr(.22, 0, .05, .1, .01); fs('#ffcf3a'); rr(.3, 0, .05, .08, .01); fs('#ffcf3a'); break;
        case 'plank': c.rotate(-.15); rr(-.5, -.08, 1.0, .16, .03); fs('#c98f52'); ln(-.3, -.02, .2, -.02, '#a06a32', .02); break;
        case 'bal': circ(0, 0, .26); fs('#e8453c'); c.beginPath(); c.arc(0, 0, .26, -.6, .9); c.lineWidth = .08; c.strokeStyle = '#ffd23a'; c.stroke(); circ(-.08, -.09, .06); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); break;
      }
      c.restore();
    }

    /* ---------- objects in the rooms ---------- */
    function obj(L, S, d, o, t) {
      if (o.hide || d.k === 'none') return;
      const x = o.x, y = o.y, w = d.w, h = d.h;
      switch (d.k) {
        case 'basket': {
          rr(x - w / 2, y - h, w, h, .12); fs('#f2d7a0'); for (let i = 1; i < 5; i++) ln(x - w / 2 + i * w / 5, y - h + .08, x - w / 2 + i * w / 5, y - .05, '#c9a060', .04); for (let i = 1; i < 3; i++) ln(x - w / 2 + .05, y - h + i * h / 3, x + w / 2 - .05, y - h + i * h / 3, '#c9a060', .04);
          const n = o.socks == null ? 5 : o.socks, col = ['#ff7ab0', '#3a7ce8', '#ffd23a', '#3cb45a', '#b48cf0'];
          for (let i = 0; i < n; i++) { const sx = x - .45 + i * .22, sy = y - h - .02; c.save(); c.translate(sx, sy); c.rotate(-.4 + i * .3); rr(-.07, -.28, .14, .32, .06); fs(col[i]); rr(-.07, -.28, .14, .07, .03); fs('#fff', null); c.restore(); }
          break; }
        case 'cactus': c.save(); c.translate(x, y - .32); c.scale(1.5, 1.5); item('cactus', 0, 0); c.restore(); break;
        case 'pump': rr(x - .3, y - .1, .6, .1, .03); fs('#555'); rr(x - .1, y - 1.0, .2, .9, .05); fs('#3a7ce8'); rr(x - .25, y - 1.1, .5, .1, .04); fs('#222'); break;
        case 'cheesebox': rr(x - w / 2, y - h, w, h, .05); fs('#ffd23a'); poly([[x - .25, y - .45], [x + .25, y - .45], [x, y - .65]]); fs('#ffe9a0', OUT, LW * .6); circ(x - .05, y - .52, .03); fs('#e8b020', null); break;
        case 'motor': {
          rr(x - w / 2, y - h, w, h, .12); fs(o.hit ? '#7a7a8a' : '#e8453c'); rr(x - w / 2 + .12, y - h + .14, w - .24, h - .5, .08); fs('#ffd23a', OUT, LW * .7); bolt(x, y - h + .5, .9);
          for (let i = 0; i < 3; i++) circ(x - .5 + i * .5, y - .14, .07); c.fillStyle = OUT; c.fill();
          c.beginPath(); c.moveTo(x + w / 2, y - h + .3); c.bezierCurveTo(x + 1.6, y - h, x + 1.2, 2.5, x + 1.6, .95); c.lineWidth = .1; c.strokeStyle = OUT; c.stroke(); c.lineWidth = .05; c.strokeStyle = '#3a3a4a'; c.stroke();
          if (o.hit) { rr(x - w / 2 - .1, y - h - .2, w + .2, .5, .06); fs('#5a5a6a'); for (let k = 0; k < 3; k++) { circ(x - .4 + k * .4, y - h - .5 - ((t * .02 + k * .3) % 1) * .8, .14 + ((t * .02 + k * .3) % 1) * .2); c.fillStyle = 'rgba(150,150,160,.45)'; c.fill(); } }
          break; }
        case 'panel': { rr(x - w / 2, y - h, w, h, .1); fs('#5a6a8a'); rr(x - w / 2 + .1, y - h + .1, w - .2, .5, .06); fs('#9fe8ff', OUT, LW * .6); for (let i = 0; i < 2; i++) { circ(x - .2 + i * .4, y - h + .95, .12); fs(i ? '#3cb45a' : '#ffd23a'); } circ(x, y - h + 1.35, .14); fs('#e8453c'); ln(x, y, x, y + .5, '#3a3a4a', .08); break; }
        case 'lever': {
          rr(x - .3, y - .5, .6, .9, .08); fs('#8a8a9a'); const a = o.pull && t - o.pull < 70 ? .9 : -.6;
          c.save(); c.translate(x, y - .05); c.rotate(a); cap(0, 0, 0, -.75, .1, '#c9ccd6'); circ(0, -.8, .13); fs('#e8453c'); c.restore(); circ(x, y - .05, .08); fs(OUT, null); break; }
        case 'fridge': {
          rr(x - w / 2, y - h, w, h, .16); fs('#f4f8ff'); ln(x - w / 2 + .05, y - h * .62, x + w / 2 - .05, y - h * .62, OUT, LW);
          rr(x + w / 2 - .25, y - h + .25, .08, .5, .04); fs('#aab'); rr(x + w / 2 - .25, y - h * .55, .08, .5, .04); fs('#aab');
          if (o.open && t - o.open < 50) { c.beginPath(); c.moveTo(x + w / 2, y - h * .62); c.lineTo(x + w / 2 + .5, y - h * .66); c.lineTo(x + w / 2 + .5, y - .06); c.lineTo(x + w / 2, y - .02); fs('#e4e8f0'); }
          circ(x - .3, y - h + .4, .1); fs('#ff7ab0', OUT, LW * .5); rr(x - .4, y - h + .7, .3, .2, .03); fs('#ffd23a', OUT, LW * .5);
          break; }
        case 'trap': {
          const op = o.open; rr(x - w / 2 - .12, y - .34, w + .24, .2, .04); fs('#ffcf3a'); for (let i = 0; i < 6; i++) ln(x - w / 2 - .05 + i * (w + .1) / 5.5, y - .33, x - w / 2 + .05 + i * (w + .1) / 5.5, y - .15, OUT, .05); rr(x - w / 2, y - .3, w, .14, .03); c.fillStyle = op ? '#1a1220' : '#8a5a3a'; c.fill(); c.lineWidth = LW; c.strokeStyle = OUT; c.stroke();
          if (!op) { for (let i = 1; i < 4; i++) ln(x - w / 2 + i * w / 4, y - .3, x - w / 2 + i * w / 4, y - .16, '#4a3020', .03); }
          else { c.save(); c.translate(x - w / 2, y - .3); c.rotate(1.3); rr(0, -.07, w / 2, .1, .02); fs('#6a4a3a'); c.restore(); c.save(); c.translate(x + w / 2, y - .3); c.rotate(-1.3); rr(-w / 2, -.07, w / 2, .1, .02); fs('#6a4a3a'); c.restore(); }
          if (o.worst && !S.o.mach.fall) { const left = S.o.mach.eat === 2 ? Math.max(.2, 1 - ((t % 100000) * .002) % 1) : 1; c.save(); c.translate(x, y - .42); c.scale(left, 1); item('worst', 0, 0); c.restore(); }
          break; }
        case 'toolbox': {
          rr(x - w / 2, y - h, w, h, .08); fs('#e8453c'); rr(x - w / 2, y - h, w, .22, .06); fs('#c0303a'); rr(x - .2, y - h - .18, .4, .2, .06); fs(null, OUT, .06);
          if (o.empty) { c.save(); c.translate(x - w / 2, y - h); c.rotate(-.5); rr(0, -.22, w, .22, .06); fs('#c0303a'); c.restore(); }
          break; }
        case 'valve': {
          const vy = y - h / 2; ln(0, vy, x - .25, vy, OUT, .44); ln(0, vy, x - .25, vy, '#a8b0c0', .32); rr(x - .25, vy - .25, .5, .5, .08); fs('#8a8a9a');
          // outlet 1: to the right and down into the water cannon; outlet 2: up, over and down onto the fuse box
          const pipe = pts => { for (const col of [[OUT, .34], ['#a8b0c0', .22]]) { c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.lineWidth = col[1]; c.strokeStyle = col[0]; c.stroke(); } };
          pipe([[x + .25, vy], [11.0, vy], [11.0, 5.9]]); pipe([[x, vy - .25], [x, 2.6], [11.9, 2.6], [11.9, 3.25]]); rr(11.7, 3.2, .4, .2, .05); fs('#666');
          if (o.wheel) { const a = o.dir ? Math.min(1, (t - o.rt) / 40) * Math.PI * 1.5 : 0; c.save(); c.translate(x, vy); c.rotate(a); item('wiel', 0, 0); c.restore(); }
          else { circ(x, vy, .08); fs('#555'); }
          // a little arrow on the valve that shows where the water goes
          poly(o.dir ? [[x - .12, vy - .45], [x + .12, vy - .45], [x, vy - .65]] : [[x + .62, vy], [x + .45, vy - .12], [x + .45, vy + .12]]); fs('#3a7ce8', null);
          break; }
        case 'cart': {
          rr(x - w / 2, y - .45, w, .3, .06); fs('#7a8aa0'); for (const sx of [-.4, .4]) { circ(x + sx, y - .14, .14); fs('#333'); }
          const fx = x - .1, fy = y - 1.05; ln(fx + .2, y - .45, fx + .2, fy, OUT, .14); circ(fx, fy, .5); fs('#e8e8f0'); circ(fx, fy, .5); fs(null, '#7a8aa0', .07);
          const sp = o.on ? (o.turbo ? 1.2 : .35) : 0, a = t * sp; for (let i = 0; i < 3; i++) { el(fx + Math.cos(a + i * 2.09) * .22, fy + Math.sin(a + i * 2.09) * .22, .2, .09, a + i * 2.09); fs('#3cb45a', OUT, LW * .6); } circ(fx, fy, .08); fs('#555');
          if (o.turbo) { rr(x + .35, y - .95, .2, .38, .04); fs('#3cb45a', OUT, LW * .6); bolt(x + .45, y - .76, .4); }
          if (o.on) { ln(x + .6, y - .3, x + 1, y - .02, '#333', .05); for (let k = 0; k < (o.turbo ? 5 : 2); k++) { const p = (t * (o.turbo ? .05 : .02) + k / 5) % 1, wx = fx - .6 - p * (o.turbo ? 2.4 : 1), wy = fy - .3 + k * .15; ln(wx, wy, wx - .4, wy, `rgba(255,255,255,${.8 - p * .7})`, .05); } }
          break; }
        case 'batt': c.save(); c.translate(x, y - .4); item('batt', 0, 0); c.restore(); break;
        case 'books': for (let i = 0; i < 5; i++) { const bx = x - .55 + i * .24, bh = .9 + (i % 3) * .1; rr(bx, y - bh, .2, bh, .03); fs(['#e8453c', '#3a7ce8', '#3cb45a', '#ffcf3a', '#b48cf0'][i]); } if (!o.empty) { c.save(); c.translate(x + .55, y - .55); c.scale(.6, .6); item('recept', 0, 0); c.restore(); } break;
        case 'cupboard': { rr(x - w / 2, y - h, w, h, .08); fs('#c98f52'); ln(x, y - h + .08, x, y - .08, OUT, LW); circ(x - .12, y - h / 2, .05); fs(OUT, null); circ(x + .12, y - h / 2, .05); fs(OUT, null); if (o.open && t - o.open < 50) { poly([[x + w / 2, y - h], [x + w / 2 + .4, y - h + .1], [x + w / 2 + .4, y - .1], [x + w / 2, y]]); fs('#b07a42'); } break; }
        case 'board': { rr(x - w / 2, y - h, w, h, .06); fs('#5a3a2a'); rr(x - w / 2 + .08, y - h + .08, w - .16, h - .16, .04); fs('#fffdf4', null); if (o.rec) { txt('PEPER', x, y - h + .3, .17, '#c0304a'); for (let i = 0; i < 3; i++) ln(x - .3, y - h + .55 + i * .16, x + .3, y - h + .55 + i * .16, '#bbb', .03); circ(x + .3, y - .3, .1); fs('#8a5a32', null); } else { el(x, y - h + .5, .3, .12); fs('#f0c060', OUT, LW * .6); el(x, y - h + .42, .3, .12); fs('#f6d080', OUT, LW * .6); for (let i = 0; i < 2; i++) ln(x - .3, y - .35 + i * .14, x + .3, y - .35 + i * .14, '#bbb', .03); } break; }
        case 'curtain': {
          rr(x - w / 2, y - h, w, h, .04); fs('#8a5a32');
          if (o.open) { rr(x - w / 2 + .12, y - h + .12, w - .24, h - .24, .03); fs('#fff8e8'); codeBalloons('brgy', x, y - h / 2 + .1, w - .5); }
          const op = o.open ? .78 : 0; for (const sd of [-1, 1]) { c.beginPath(); const x0 = x + sd * (w / 2 + .05), x1 = x + sd * (w / 2 + .05 - (w / 2 + .05) * (1 - op)); c.moveTo(x0, y - h - .1); c.lineTo(x1 - sd * .02, y - h - .1); for (let k = 0; k <= 6; k++) c.lineTo(x1 + Math.sin(k * 1.6) * .05, y - h + k * (h + .2) / 6); c.lineTo(x0, y + .1); c.closePath(); fs('#c0304a'); }
          rr(x - w / 2 - .15, y - h - .2, w + .3, .12, .05); fs('#ffcf3a');
          break; }
        case 'cpanel': {
          rr(x - w / 2, y - h, w, h, .1); fs('#4a5a7a'); const k = ['r', 'y', 'b', 'g']; k.forEach((v, i) => { circ(x - .38 + i * .25, y - h + .45, .1); fs(CODECOL[v][1], OUT, LW * .6); });
          const n = (o.code || '').length; for (let i = 0; i < 4; i++) { circ(x - .38 + i * .25, y - h + .9, .06); fs(o.ok || i < n ? '#9fff9f' : '#223'); }
          break; }
        case 'gluepot': c.save(); c.translate(x, y - .32); c.scale(1.2, 1.2); item('lijmpot', 0, 0); c.restore(); break;
        case 'bench': { rr(x - w / 2, y - h, w, .18, .04); fs('#c98f52'); for (const sx of [-1, 1]) rr(x + sx * (w / 2 - .15) - .07, y - h + .18, .14, h - .18, .03), fs('#a06a32'); rr(x - .5, y - h + .22, 1, .38, .05); fs('#b07a42'); circ(x, y - h + .41, .05); fs(OUT, null); if (o.open && t - o.open < 50) { rr(x - .5, y - h + .26, 1, .38, .05); fs('#c98f52'); } break; }
        case 'mirror': {
          const gy = y - 1.2; ln(x, y, x, gy, OUT, .14); ln(x, y, x, gy, '#c9ccd6', .08); rr(x - .3, y - .1, .6, .1, .03); fs('#8a8a9a');
          c.save(); c.translate(x, gy); c.rotate(-Math.PI / 4 + (o.r || 0) * Math.PI / 4); rr(-.5, -.09, 1.0, .18, .06); fs('#bfe8ff'); ln(-.4, -.03, .1, -.03, '#fff', .03); c.restore(); circ(x, gy, .07); fs('#555');
          break; }
        case 'magnet': c.save(); c.translate(x, y - .45); item('magneet', 0, 0); c.restore(); break;
        case 'drain': { rr(x - w / 2, y - .3, w, .16, .03); fs('#2a2230'); for (let i = 1; i < 6; i++) ln(x - w / 2 + i * w / 6, y - .3, x - w / 2 + i * w / 6, y - .14, '#8a8a9a', .05); if (!o.empty) { c.save(); c.translate(x, y - .2); c.scale(.4, .4); c.globalAlpha = .7; item('sleutel', 0, 0); c.restore(); } break; }
        case 'stick': c.save(); c.translate(x, y - .1); c.rotate(Math.PI / 2 - .05); rr(-.05, -.7, .1, 1.4, .05); fs('#b07a42'); c.restore(); break;
        case 'nest': {
          ln(x + .55, y + 1.2, x + .55, y - .1, OUT, .14); ln(x + .55, y + 1.2, x + .55, y - .1, '#a06a32', .08);
          c.beginPath(); c.ellipse(x, y - .2, .6, .28, 0, 0, Math.PI); fs('#a0683a'); for (let i = 0; i < 6; i++) ln(x - .55 + i * .2, y - .2, x - .45 + i * .2, y + .02, '#7a4a20', .03);
          if (!o.gone) { item('key', x + .1, y - .24); bird(x - .05, y - .45, 1, t, 0); }
          else if (t - o.gt < 120) { const p = (t - o.gt) / 120; bird(x + p * 5, y - .45 - p * 3 - Math.sin(p * 9) * .3, 1, t, 1); }
          break; }
        case 'key': item('key', x, y - .12); break;
        case 'case': {
          rr(x - w / 2, y - h, w, h, .08); fs('#c9ccd6'); rr(x - w / 2 + .1, y - h + .1, w - .2, h - .2, .05); fs('#f4f8ff', null);
          const wt = o.wt; circ(x, y - h / 2 - .1, .26); fs('#fff'); const a = [-1, 0, 1][wt] * .9; ln(x, y - h / 2 - .1, x + Math.sin(a) * .22, y - h / 2 - .1 - Math.cos(a) * .22, '#e8453c', .05);
          txt(['☀', '☂', '❄'][wt], x, y - .3, .22, '#3a5a8a');
          if (!o.open) { rr(x - w / 2 + .06, y - h + .06, w - .12, h - .12, .05); c.fillStyle = 'rgba(180,220,255,.45)'; c.fill(); ln(x - .2, y - h + .2, x - .3, y - h + .5, '#fff', .04); rr(x + w / 2 - .14, y - h / 2 - .1, .14, .2, .03); fs('#ffcf3a', OUT, LW * .5); }
          break; }
        case 'note': { c.save(); c.translate(x, y - h / 2); c.rotate(.06); rr(-w / 2, -h / 2, w, h, .03); fs('#fff8c0'); circ(0, -h / 2 + .08, .06); fs('#e8453c', null); txt('🌙', -.2, -.1, .3); clockFace(.2, .05, .22, 8, 0); c.restore(); break; }
        case 'knob': { rr(x - .14, y - .22, .28, .22, .04); fs('#8a8a9a'); circ(x, y - .45, .3); fs('#ffcf3a'); ln(x, y - .45, x + .18, y - .6, OUT, .06); txt(String(o.h || 3), x, y - .42, .2, OUT); break; }
        case 'wkey': { const a = o.out ? 0 : t * .05; c.save(); c.translate(x, y - h / 2); if (o.out) c.translate(-.6, .4); c.rotate(o.out ? 1.2 : 0); rr(-.05, -.08, .5, .16, .04); fs('#c9a040'); c.save(); c.scale(1, Math.cos(a)); el(-.2, 0, .14, .32); fs('#ffcf3a'); el(-.2, 0, .06, .16); fs('#c9a040', null); c.restore(); c.restore(); break; }
        case 'toybox': { rr(x - w / 2, y - h, w, h, .1); fs('#3a7ce8'); rr(x - w / 2, y - h, w, .25, .08); fs('#5a9cf8'); star(x, y - h / 2 + .1, .2, '#ffd23a'); if (!o.empty) { circ(x - .3, y - h - .1, .2); fs('#e8453c'); } el(x + .35, y - h - .12, .18, .14); fs('#c98f52'); circ(x + .3, y - h - .2, .05); fs(OUT, null); break; }
        case 'plank': c.save(); c.translate(x, y - .1); c.scale(1.5, 1.5); item('plank', 0, 0); c.restore(); break;
        case 'ramp': drawRamp(L, S, o, t); break;
      }
    }
    function bird(x, y, s, t, fly) { el(x, y, .2 * s, .16 * s); fs('#5ab4f0'); circ(x + .15 * s, y - .1 * s, .11 * s); fs('#5ab4f0'); poly([[x + .25 * s, y - .12 * s], [x + .36 * s, y - .08 * s], [x + .25 * s, y - .05 * s]]); fs('#ffb020', OUT, LW * .5); circ(x + .18 * s, y - .13 * s, .025); fs(OUT, null); const a = fly ? Math.sin(t * .8) * .8 : .2; c.save(); c.translate(x - .03, y - .05); c.rotate(-a); el(-.1, -.02, .14 * s, .07 * s); fs('#3a94d8'); c.restore(); }
    function clockFace(x, y, r, h, m) { circ(x, y, r); fs('#fff'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; circ(x + Math.sin(a) * r * .78, y - Math.cos(a) * r * .78, r * .05); c.fillStyle = OUT; c.fill(); } const ah = (h % 12) / 12 * Math.PI * 2; ln(x, y, x + Math.sin(ah) * r * .5, y - Math.cos(ah) * r * .5, OUT, r * .12); ln(x, y, x, y - r * .75, OUT, r * .08); }
    function codeBalloons(code, x, y, w) {
      const n = code.length; for (let i = 0; i < n; i++) {
        const v = code[i], bx = x - w / 2 + (i + .5) * w / n, col = CODECOL[v][1];
        ln(bx, y + .2, bx + Math.sin(i) * .05, y + .55, '#888', .025); el(bx, y, w / n * .36, w / n * .44); fs(col); txt(CODECOL[v][2], bx, y + .01, w / n * .38, 'rgba(255,255,255,.95)');
      }
    }
    function drawRamp(L, S, o, t) {
      // a slide from the top floor down towards the fence, then dominoes on a shelf and the OFF button
      const x0 = 4.7, y0 = 4.75, x1 = 8.7, y1 = 6.35, gx0 = 6.2, gx1 = 6.9, yy = x => y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      for (const sx of [5.4, 8.2]) ln(sx, yy(sx) + .1, sx, 8.2, '#8a8a9a', .1);
      const seg = (a, b) => { c.beginPath(); c.moveTo(a, yy(a)); c.lineTo(b, yy(b)); c.lineTo(b, yy(b) + .16); c.lineTo(a, yy(a) + .16); c.closePath(); fs('#ffcf3a'); };
      seg(x0, gx0); seg(gx1, x1);
      if (o.fix) { c.save(); c.translate((gx0 + gx1) / 2, yy((gx0 + gx1) / 2) + .02); c.rotate(Math.atan2(y1 - y0, x1 - x0)); rr(-.5, -.08, 1, .16, .03); fs('#c98f52'); c.restore(); }
      else { for (const gx of [gx0, gx1]) { ln(gx, yy(gx) - .1, gx, yy(gx) + .25, '#e8453c', .03); } }
      // shelf with dominoes behind the fence, the button on the machine
      rr(8.9, 6.38, 1.7, .12, .03); fs('#a06a32');
      const dt = o.go === 2 ? (t - o.dt) : -1;
      for (let i = 0; i < 4; i++) { const dx = 9.1 + i * .38, fall = dt < 0 ? 0 : Math.max(0, Math.min(1, (dt - i * 12) / 12)); c.save(); c.translate(dx + .08, 6.38); c.rotate(fall * 1.25); rr(-.08, -.6, .16, .6, .03); fs('#fff'); circ(0, -.42, .025); c.fillStyle = OUT; c.fill(); circ(0, -.18, .025); c.fill(); c.restore(); }
      // the rolling ball
      if (o.go) {
        const k = (t - o.gt) / (o.fix ? 70 : 40);
        let bx, by;
        if (o.fix) { bx = x0 + (x1 - x0) * Math.min(1, k); by = yy(bx) - .22; if (o.go === 2) { bx = 9.0; by = 6.15; } }
        else { bx = x0 + (gx0 + .3 - x0) * Math.min(1, k * 1.4); by = yy(bx) - .22; if (k > .7) { by += (k - .7) * 9; } }
        if (by < 8.1) item('bal', bx, by);
      }
    }

    /* ---------- the machines ---------- */
    function hz0(L, S) { const z = Core.zones(L, S); return z[0] || { ph: 0, p: 0 }; }
    const brk = S => S.m.st === 'break' ? S.m.bt : 0;
    function shake(S, amp = .06) { const b = brk(S); return b ? Math.sin(b * 1.7) * amp * Math.min(1, b / 30) : 0; }
    function junk(x, y, w, col) {                                     // the pile of parts that is left after a machine fell apart
      el(x, y - .12, w * .5, .2); fs(shade(col, -.25));
      for (let i = 0; i < 6; i++) { const px = x - w * .35 + i * w * .14, py = y - .25 - (i % 2) * .15; rr(px - .14, py - .1, .28, .2, .05); fs(i % 2 ? col : '#9aa0b0'); }
      gear(x + w * .2, y - .45, .2, 8, .3, '#c9ccd6'); spring(x - w * .3, y - .3, x - w * .2, y - .9, 4, .08); spring(x + w * .05, y - .3, x + w * .15, y - .8, 3, .07);
    }
    const MACH = {
      vac(L, S, o, t) {
        const z = hz0(L, S), x = o.x + shake(S), y = o.y, ph = S.o.mach.eat ? 0 : z.ph;
        const bag = S.o.mach.eat === 2 ? 1 + Math.min(1.2, S.o.mach.et / 70) : 1;
        el(x + .55, y - 1.1, .45 * bag, .5 * bag); fs('#d9c6a6'); ln(x + .55, y - 1.6 * bag, x + .55, y - 1.5, OUT, .03);           // dust bag
        cached('vacbody', 2.4, 1.8, 1.2, 1.6, () => { const x = 0, y = 0; rr(x - 1.05, y - 1.45, 2.0, 1.15, .5); fs('#e8553c'); }, x, y);
        rr(x - .95, y - .5, 1.85, .22, .08); fs('#c03a2a');
        for (const sx of [-.6, .5]) { circ(x + sx, y - .2, .2); fs('#333'); circ(x + sx, y - .2, .07); fs('#888', null); }
        face(x - .2, y - 1.0, .9, ph === 2 || S.o.mach.eat === 2 ? 'o' : 'grr');
        // the hose and nozzle on the left
        const wob = ph === 1 ? Math.sin(t * 1.4) * .05 : 0;
        c.beginPath(); c.moveTo(x - .9, y - .9); c.quadraticCurveTo(x - 1.4, y - .9, x - 1.5 + wob, y - .55); c.lineWidth = .3; c.strokeStyle = OUT; c.stroke(); c.lineWidth = .2; c.strokeStyle = '#ffcf3a'; c.stroke();
        poly([[x - 1.6 + wob, y - .7], [x - 1.4 + wob, y - .7], [x - 1.3 + wob, y - .32], [x - 1.85 + wob, y - .32]]); fs('#888');
        if (ph === 2 || S.o.mach.eat === 2) { for (let k = 0; k < 6; k++) { const p = (t * .045 + k / 6) % 1, sx = x - 1.6 - (1 - p) * 1.8, sy = y - .5 - Math.sin(p * 6 + k) * .25 * (1 - p); ln(sx, sy, sx + .25, sy, `rgba(255,255,255,${.3 + p * .5})`, .05); } }
        if (S.o.mach.eat === 2) { const p = (S.o.mach.et % 16) / 16, col = ['#ff7ab0', '#3a7ce8', '#ffd23a', '#3cb45a', '#b48cf0'][Math.floor(S.o.mach.et / 16) % 5]; c.save(); c.translate(S.o.basket.x + (x - 1.7 - S.o.basket.x) * p, y - 1.2 + Math.sin(p * Math.PI) * -.4); c.rotate(p * 6); rr(-.07, -.15, .14, .3, .06); fs(col); c.restore(); }
      },
      bal(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), b = brk(S), fallY = b ? Math.min(2.6, b * b * .0008) : 0, x = o.x, y = o.y + fallY;
        const np = m.np || 0, cols = ['#e8453c', '#ffcf3a', '#3a7ce8'];
        for (let i = 0; i < 3; i++) { if (i < np) continue; const bx = x - .7 + i * .7, by = y - 3.3 - (i === 1 ? .35 : 0) + Math.sin(t * .05 + i) * .06; ln(x - .3 + i * .3, y - 1.2, bx, by + .5, '#666', .025); el(bx, by, .42, .52); fs(cols[i]); el(bx - .13, by - .18, .08, .14, -.4); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); poly([[bx - .05, by + .5], [bx + .05, by + .5], [bx, by + .58]]); fs(cols[i], OUT, LW * .6); }
        rr(x - .8, y - 1.2, 1.6, 1.15, .25); fs('#4fc0b0'); face(x, y - .7, .8, b ? 'o' : 'grr');
        rr(x - .3, y - .1, .6, .15, .05); fs('#2a8a7a');
        if (!m.pop && z.ph >= 1) { const by = z.ph === 1 ? y + .1 : y + .1 + z.p * z.p * (8.2 - y - .4); if (z.ph === 1 || by < 7.9) { el(x, by, .2, .24); fs('#7ac4ff'); } else { for (let k = 0; k < 5; k++) { const a = -Math.PI * (k + .5) / 5; el(x + Math.cos(a) * .6 * z.p, 8.1 + Math.sin(a) * .4 * z.p, .08, .12); c.fillStyle = 'rgba(100,180,255,.8)'; c.fill(); } } }
      },
      tik(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), x = o.x + shake(S), y = o.y, rev = m.rev || 0;
        cached('tikbody', 3.6, 3.5, 1.8, 3.3, () => {
          rr(-1.6, -3.1, 3.2, 2.9, .3); fs('#9b5de5'); rr(-1.6, -.4, 3.2, .3, .1); fs('#7a3ac0');
          for (const sx of [-1.1, 1.1]) { circ(sx, -.12, .16); fs('#333'); }
          circ(.9, -1.2, .65); fs('#fff4d8');
        }, x, y);
        // the mouse in its wheel
        const wa = (rev >= 2 ? -t * .4 : t * .12);
        circ(x + .9, y - 1.2, .55); fs(null, '#c9a060', .07); for (let i = 0; i < 8; i++) { const a = wa + i * Math.PI / 4; ln(x + .9, y - 1.2, x + .9 + Math.cos(a) * .55, y - 1.2 + Math.sin(a) * .55, '#c9a060', .025); }
        const my = rev === 1 ? -.35 * Math.sin(Math.min(1, (t % 30) / 30) * Math.PI) : 0;
        el(x + .9, y - .82 + my, .2, .12); fs('#c0c0cc'); circ(x + 1.07, y - .88 + my, .08); fs('#c0c0cc'); circ(x + 1.05, y - .98 + my, .05); fs('#ffb0c0', OUT, LW * .5); circ(x + 1.11, y - .88 + my, .02); fs(OUT, null);
        c.beginPath(); c.moveTo(x + .72, y - .8 + my); c.quadraticCurveTo(x + .5, y - .7, x + .55, y - .9); c.lineWidth = .025; c.strokeStyle = '#ff9ab0'; c.stroke();
        if (rev === 1) txt('!', x + 1.15, y - 1.55, .4, '#e8453c');
        // the face
        face(x - .5, y - 2.3, 1.1, rev === 3 ? 'ha' : z.ph === 2 ? 'ha' : 'grr', 0);
        // two arms with feather dusters
        const swing = rev >= 2 ? Math.min(1, (t - (m.rt || t)) / 70) : 0;
        for (let k = 0; k < 2; k++) {
          const ay = y - 1.7 + k * .7, ext = rev ? 0 : z.ph === 2 ? 1 : z.ph === 1 ? .2 : 0, len = 1.0 + ext * 1.2;
          const ang = Math.PI + (rev >= 2 ? -swing * 2.4 : 0) + (z.ph === 2 && !rev ? Math.sin(t * .9 + k) * .2 : 0) + (rev === 3 ? Math.sin(t * .9 + k) * .2 : 0);
          const ex = x - 1.5 + Math.cos(ang) * len, ey = ay + Math.sin(ang) * len;
          cap(x - 1.5, ay, ex, ey, .1, '#c9ccd6');
          c.save(); c.translate(ex, ey); c.rotate(ang + Math.PI / 2 + Math.sin(t * .7 + k) * .3); for (let f = -2; f <= 2; f++) { el(f * .07, -.22, .07, .26, f * .2); fs(['#ff7ab0', '#ffd23a', '#7ae8ff'][(f + 2) % 3], OUT, LW * .5); } c.restore();
        }
        if (rev === 3) for (let k = 0; k < 3; k++) { const p = (t * .02 + k / 3) % 1; txt('HA', x - 1.2 + k * .6, y - 3.3 - p * .8, .3, `rgba(155,93,229,${1 - p})`); }
      },
      kraan(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), x = o.x;
        cached('rail', 11.2, .7, .2, .15, () => { rr(0, 0, 10.8, .32, .06); fs('#ffb020'); for (let i = 0; i < 18; i++) ln(.2 + i * .6, .02, .5 + i * .6, .3, '#c07a10', .05); }, 1.6, .7);
        rr(x - .5, .85, 1.0, .5, .1); fs('#5a6a8a'); for (const sx of [-.28, .28]) { circ(x + sx, .86, .1); fs('#333'); }
        const low = z.ph === 2 && m.slot < 0 ? Math.sin(z.p * Math.PI) * 1.4 : 0, gy = 4.35 + low;
        ln(x, 1.35, x, gy - .3, OUT, .05);
        // the magnet
        c.beginPath(); c.arc(x, gy - .05, .42, Math.PI, 0); c.lineWidth = .32; c.strokeStyle = OUT; c.stroke(); c.lineWidth = .24; c.strokeStyle = '#e8453c'; c.stroke();
        rr(x - .58, gy - .07, .32, .2, .03); fs('#d8dbe2'); rr(x + .26, gy - .07, .32, .2, .03); fs('#d8dbe2');
        if ((z.ph >= 1 && m.slot < 0) || (m.drop && m.dt < 32)) for (let k = 0; k < 3; k++) { const p = (t * .04 + k / 3) % 1; c.beginPath(); c.arc(x, gy + .2 + p * .8, .3 + p * .5, .2 * Math.PI, .8 * Math.PI); c.lineWidth = .04; c.strokeStyle = `rgba(90,160,255,${.9 - p * .8})`; c.stroke(); }
        // the weight
        let wy = gy + .15; if (m.drop) { const k = Math.min(1, m.dt / 32); wy = gy + .15 + k * k * (8.2 - .9 - gy - .15); }
        const wx = m.drop ? m.dx : x;
        if (!(m.drop && m.dt >= 32 && S.o.motor.hit)) { rr(wx - .55, wy, 1.1, .9, .12); fs('#4a4a5a'); txt('100', wx, wy + .38, .3, '#fff'); txt('kg', wx, wy + .66, .18, '#ccc'); }
        else { rr(S.o.motor.x - .7, S.o.motor.y - 1.6, 1.4, .5, .1); fs('#4a4a5a'); }
      },
      worst(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S); let x = o.x, y = o.y;
        let lunge = 0; if (!m.eat && z.ph === 2) lunge = Math.sin(z.p * Math.PI) * .25 * (S.w.x < x ? -1 : 1);
        x += lunge + shake(S);
        let fy = 0; if (m.fall) { const k = (t - m.ft) / 40; fy = Math.min(3, k * k * 3); }
        c.save(); if (m.fall) { c.beginPath(); c.rect(0, 0, 14, 8.2); c.clip(); } c.translate(0, fy);
        const walk = m.eat === 1 ? Math.sin(t * .3) : Math.sin(t * .12) * .4;
        for (const sx of [-1, 1]) cap(x + sx * .35, y - .7, x + sx * .35 + walk * sx * .1, y - .05, .16, '#a8b0c0');
        el(x, y - 1.45, .82, .9); fs('#ff8a5a');
        rr(x - .5, y - 1.3, 1.0, .5, .2); fs('#5a3a4a'); const ch = m.eat === 2 ? Math.abs(Math.sin(t * .4)) : z.ph === 2 ? 1 : .15; rr(x - .45, y - 1.25, .9, .4 * ch + .05, .15); fs('#2a1a2a', null); for (let i = 0; i < 4; i++) rr(x - .35 + i * .2, y - 1.3, .12, .12, .02), fs('#fff', null);
        face(x, y - 2.0, .8, m.eat === 2 ? 'ha' : 'grr', 0);
        el(x + (S.w.x < x ? -.55 : .55), y - 1.75, .18, .13); fs('#ff5a6a');
        ln(x, y - 2.3, x + .1, y - 2.65, OUT, .05); circ(x + .1, y - 2.7, .08); fs('#ffd23a');
        c.restore();
      },
      water(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), x = o.x + shake(S), y = o.y, v = S.o.valve;
        // fuse box on the wall above
        rr(11.3, 3.6, 1.2, 1.4, .1); fs('#c9ccd6'); bolt(11.9, 4.3, 1.3); if (m.wet) { for (let k = 0; k < 4; k++) { const p = (t * .05 + k / 4) % 1; circ(11.6 + k * .2, 3.6 - p * .8, .1 + p * .2); c.fillStyle = `rgba(160,160,170,${.5 - p * .5})`; c.fill(); } if (t % 20 < 10) bolt(11.3 + (t % 7) * .1, 3.5, .6); }
        // the spray from the pipe onto the fuse box when the valve is turned
        if (v.dir && t - v.rt > 40) { for (let k = 0; k < 8; k++) { const p = (t * .06 + k / 8) % 1; el(11.9 + Math.sin(k * 2.3) * .25 * p, 3.4 + p * 1.3, .06, .1); c.fillStyle = 'rgba(80,160,255,.85)'; c.fill(); } }
        cached('waterbody', 2.8, 2.4, 1.4, 2.2, () => { const x = 0, y = 0; rr(x - 1.2, y - 2.0, 2.4, 1.6, .4); fs('#3a7ce8'); rr(x - 1.2, y - 1.4, 2.4, .35, .05); fs('#2a5ca8', null); }, x, y);
        face(x + .2, y - 1.55, .8, z.ph === 2 ? 'o' : 'grr');
        for (const sx of [-.8, .8]) { circ(x + sx, y - .3, .3); fs('#333'); circ(x + sx, y - .3, .1); fs('#aaa', null); }
        const rec = z.ph === 2 ? -.1 : 0; rr(x - 2.0 + rec, y - 1.2, 1.0, .36, .1); fs('#8a8a9a'); rr(x - 2.15 + rec, y - 1.26, .2, .48, .05); fs('#666');
        if (!v.dir && z.ph >= 1) {
          if (z.ph === 1) { for (let k = 0; k < 3; k++) { el(x - 2.2, y - .9 + ((t * .03 + k / 3) % 1) * .6, .05, .08); c.fillStyle = 'rgba(80,160,255,.8)'; c.fill(); } }
          else { const len = Math.min(1, z.p * 3) * (x - 2.1 - 4.7); c.beginPath(); c.moveTo(x - 2.15, y - 1.15); for (let k = 0; k <= 12; k++) { const px = x - 2.15 - len * k / 12; c.lineTo(px, y - 1.05 + Math.sin(k * 1.3 + t * .5) * .06 - k * .01); } c.lineWidth = .3; c.strokeStyle = 'rgba(80,160,255,.75)'; c.stroke(); c.lineWidth = .12; c.strokeStyle = 'rgba(220,240,255,.9)'; c.stroke(); }
        }
      },
      fan(L, S, o, t) {
        const cart = S.o.cart, z = hz0(L, S), x = o.x + shake(S, .1), y = o.y, back = cart.on && cart.turbo;
        rr(x - .7, y - .3, 1.4, .3, .08); fs('#5a6a8a'); rr(x - .15, y - 1.8, .3, 1.5, .05); fs('#7a8aa0');
        const cy = y - 2.3; circ(x + .2, cy, 1.25); fs('#e8e8f0'); circ(x + .2, cy, 1.25); fs(null, '#5a6a8a', .1);
        const spd = back ? -1.1 : z.ph === 2 ? .9 : z.ph === 1 ? .5 : .2, a = t * spd;
        for (let i = 0; i < 4; i++) { const b = a + i * Math.PI / 2; el(x + .2 + Math.cos(b) * .6, cy + Math.sin(b) * .6, .55, .2, b); fs('#5ab4e8', OUT, LW * .7); }
        circ(x + .2, cy, .32); fs('#ffcf3a'); face(x + .2, cy - .02, .45, back ? 'o' : 'grr');
        for (let i = 0; i < 8; i++) { const b = i * Math.PI / 4; ln(x + .2 + Math.cos(b) * .4, cy + Math.sin(b) * .4, x + .2 + Math.cos(b) * 1.2, cy + Math.sin(b) * 1.2, 'rgba(90,106,138,.5)', .03); }
        if (!back && z.ph === 2) for (let k = 0; k < 8; k++) { const p = (t * .05 + k / 8) % 1, wx = x + 1.6 + p * (Math.min(9.2, cart.x - .5) - x - 1.6), wy = cy - .8 + (k % 4) * .5 + Math.sin(p * 8 + k) * .1; ln(wx, wy, wx + .6, wy, `rgba(255,255,255,${.9 - p * .6})`, .06); }
        if (back) for (let k = 0; k < 3; k++) { const p = (t * .03 + k / 3) % 1; circ(x - .3 - p * .4, cy - 1.2 - p * .6, .06); fs('#c9ccd6', OUT, LW * .5); }
      },
      kok(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), x = o.x + shake(S), y = o.y, sn = m.sneeze || 0;
        // stove with the big pot
        rr(9.6, y - 1.2, 1.4, 1.2, .08); fs('#5a5a6a'); for (const sx of [9.9, 10.6]) circ(sx, y - .5, .14), fs('#333');
        rr(9.75, y - 2.0, 1.1, .8, .12); fs('#8a8a9a'); el(10.3, y - 2.0, .55, .12); fs(S.o.pot.pep ? '#a06a3a' : '#e8c070');
        for (let k = 0; k < 2; k++) { const p = (t * .02 + k / 2) % 1; circ(10.1 + k * .4, y - 2.2 - p * .6, .08 + p * .12); c.fillStyle = `rgba(255,255,255,${.6 - p * .6})`; c.fill(); }
        // the robot chef
        rr(x - .45, y - 2.3, 1.3, 2.3, .4); fs('#d8dbe2'); rr(x - .3, y - 1.2, 1.0, .9, .1); fs('#fff', OUT, LW * .7);
        circ(x + .2, y - 2.6, .55); fs('#d8dbe2'); face(x + .15, y - 2.65, .7, sn === 2 ? 'o' : sn === 1 ? 'o' : 'grr', 0);
        c.beginPath(); c.moveTo(x - .05, y - 2.4); c.quadraticCurveTo(x + .15, y - 2.25, x + .35, y - 2.4); c.lineWidth = .08; c.strokeStyle = '#5a3a2a'; c.stroke();
        rr(x - .2, y - 3.4, .8, .35, .05); fs('#fff'); for (const sx of [-.1, .2, .5]) circ(x + sx, y - 3.5, .25), fs('#fff');
        // the arm with the pan
        const flip = !sn && z.ph >= 1 ? (z.ph === 1 ? z.p : 1) : 0;
        c.save(); c.translate(x - .4, y - 1.7); c.rotate(-.3 - flip * .6); cap(0, 0, -.9, 0, .14, '#c9ccd6'); rr(-1.5, -.06, .6, .12, .04); fs('#333'); c.restore();
        if (!sn && z.ph === 2) { const p = z.p, px = 9.4 + (7.0 - 9.4) * p, py = y - 2.6 - Math.sin(p * Math.PI) * 1.4 + p * 1.6; c.save(); c.translate(px, py); c.rotate(t * .3); el(0, 0, .3, .1); fs('#f0c060'); c.restore(); }
        if (sn === 1) { txt('h... ha...', x + .2, y - 3.9, .3, OUT); }
        if (sn === 2) for (let k = 0; k < 7; k++) { const p = Math.min(1, ((t % 1000) * .02 + k * .1) % 1); circ(x - .6 - p * 3, y - 2.6 + Math.sin(k * 2) * .6, .2 + p * .4); c.fillStyle = `rgba(160,120,90,${.5 - p * .45})`; c.fill(); }
      },
      stempel(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), x = o.x + shake(S), y = o.y;
        cached('stempelbody', 3.4, 4.1, 1.7, 3.9, () => { const x = 0, y = 0; rr(x - 1.5, y - 3.7, 3.0, .6, .12); fs('#ffb020'); for (const sx of [-1.4, 1.1]) { rr(x + sx, y - 3.2, .3, 3.2, .06); fs('#e08a10'); } }, x, y);
        face(x, y - 3.4, .55, m.self ? 'o' : 'grr');
        rr(x - 1.6, y - .3, 3.2, .3, .05); fs('#5a5a6a'); for (let i = 0; i < 8; i++) circ(x - 1.4 + i * .4, y - .15, .08), fs('#888', null);
        let d = 0; if (m.self || brk(S)) d = Math.abs(Math.sin(t * .25)) * 2.4; else if (z.ph === 1) d = -.3 * z.p; else if (z.ph === 2) d = Math.sin(z.p * Math.PI) * 2.6;
        const sy = y - 3.1 + Math.max(-.3, d);
        rr(x - .15, y - 3.1, .3, Math.max(.1, sy - (y - 3.1) + .3), .05); fs('#c9ccd6');
        rr(x - .9, sy + .3, 1.8, .6, .1); fs('#7a3ac0'); rr(x - .9, sy + .85, 1.8, .14, .04); fs('#c0304a'); txt('KAREL', x, sy + .6, .3, '#fff');
        if (z.ph === 2 && z.p > .4 && z.p < .6 && !m.self) for (let k = 0; k < 5; k++) { const a = Math.PI + k * Math.PI / 4; ln(x + Math.cos(a) * 1.1, y - .4 + Math.sin(a) * .3, x + Math.cos(a) * 1.5, y - .4 + Math.sin(a) * .45, '#fff', .05); }
      },
      bubbel(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), tk = S.o.tank; let lift = 0; if (m.bub) lift = -Math.min(3.2, Math.max(0, (t - m.bt - 40) * .025));
        const x = o.x + shake(S), y = o.y + lift;
        cached('bubbody', 3.0, 3.1, 1.5, 3.0, () => { const x = 0, y = 0; rr(x - 1.3, y - 2.9, 2.6, 2.7, .6); fs('#ff9ac0'); rr(x - 1.3, y - .5, 2.6, .3, .1); fs('#e070a0'); }, x, y);
        face(x + .2, y - 1.9, .9, m.bub ? 'o' : 'grr');
        // the soap tank on top
        rr(10.15, y - 4.1, .9, 1.25, .15); fs(tk.glue ? '#ffe090' : '#ffd0f0'); rr(10.15, y - 3.4, .9, .55, .1); fs(tk.glue ? '#f0b030' : '#ff7ab0', null); rr(10.1, y - 4.25, 1.0, .2, .06); fs('#888');
        // the bubble wand
        const dip = z.ph === 1 ? Math.sin(z.p * Math.PI) * .3 : 0; ln(x - 1.2, y - 1.4, x - 1.9, y - 1.6 + dip, OUT, .1); circ(x - 2.15, y - 1.7 + dip, .3); fs(null, '#ffcf3a', .08);
        if (!tk.glue && z.ph === 2) { const bx = x - 2.4 - z.p * (x - 2.4 - 4.4), by = y - 1.4 - Math.sin(z.p * 5) * .2; circ(bx, by, .8); c.fillStyle = 'rgba(210,235,255,.3)'; c.fill(); c.lineWidth = .05; c.strokeStyle = 'rgba(140,180,255,.85)'; c.stroke(); c.beginPath(); c.arc(bx, by, .62, 3.6, 4.6); c.strokeStyle = 'rgba(255,170,220,.8)'; c.stroke(); }
        if (m.bub) { const r = Math.min(2.4, (t - m.bt) * .04 + .3); circ(x, y - 1.6, r); c.fillStyle = 'rgba(255,230,140,.28)'; c.fill(); c.lineWidth = .07; c.strokeStyle = 'rgba(230,180,60,.9)'; c.stroke(); el(x - r * .4, y - 1.6 - r * .5, r * .2, r * .1, -.6); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); }
      },
      krimp(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), y = o.y;
        let sc = 1; if (m.shr) sc = Math.max(.22, 1 - (t - m.st0) / 90);
        c.save(); c.translate(o.x + shake(S), y); c.scale(sc, sc);
        for (const sx of [-.8, .8]) ln(0, -1.6, sx, 0, OUT, .12);
        rr(-1.2, -2.4, 2.4, 1.3, .4); fs('#26c2b4'); face(.25, -1.85, .75, m.shr ? 'o' : 'grr');
        rr(-2.0, -1.45, 1.0, .5, .12); fs('#1f8c84'); c.beginPath(); c.moveTo(-2.0, -1.35); c.lineTo(-2.4, -1.6); c.lineTo(-2.4, -.8); c.lineTo(-2.0, -1.05); c.closePath(); fs('#c9ccd6');
        ln(.2, -2.4, .2, -4.4, OUT, .08); poly([[.2, -4.95], [.45, -4.6], [.2, -4.25], [-.05, -4.6]]); fs(z.ph >= 1 ? '#ffe0ff' : '#e08aff');
        if (z.ph === 1) { circ(.2, -4.6, .35 * z.p + .1); c.fillStyle = 'rgba(255,150,255,.35)'; c.fill(); circ(-2.4, -1.2, .3 * z.p); c.fill(); }
        c.restore();
        if (m.shr && sc < 1) txt('piep!', o.x, y - 1.2, .3, '#7a3ac0');
        // the ray, along the mirrors
        if (z.ph === 2 || (m.shr && t - m.st0 < 60)) {
          const B = L.beam(S), pts = B.p; c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py));
          c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = .32; c.strokeStyle = 'rgba(230,120,255,.35)'; c.stroke(); c.lineWidth = .12; c.strokeStyle = 'rgba(255,220,255,.95)'; c.stroke();
          const last = pts[pts.length - 1]; for (let k = 0; k < 4; k++) { const a = t * .3 + k * 1.6; circ(last[0] + Math.cos(a) * .2, last[1] + Math.sin(a) * .2, .06); c.fillStyle = '#fff'; c.fill(); }
        }
      },
      tand(L, S, o, t) {
        const g = S.o.gears, z = hz0(L, S), x = o.x + shake(S), y = o.y, jam = g.jam;
        cached('tower', 3.3, 7.2, 1.65, 7.0, () => { const x = 0, y = 0; rr(x - 1.3, y - 6.6, 2.6, 6.6, .3); fs('#c99a5a'); rr(x - 1.45, y - 6.8, 2.9, .4, .12); fs('#a07a3a');
        for (let i = 0; i < 4; i++) { rr(x - .9 + (i % 2) * .9, y - 5.9 + i * 1.3, .7, .9, .1); fs('#b88a4a', null); } }, x, y);
        const a = jam ? Math.sin(t) * .03 : t * .03;
        gear(10.6, 3.6, .75, 10, a, '#e8b020'); gear(11.55, 2.65, .5, 8, -a * 1.5 + .2, '#c9ccd6'); gear(11.5, 4.5, .45, 8, -a * 1.6, '#e8453c');
        if (jam) { c.save(); c.translate(10.95, 3.2); c.rotate(.7); item('sleutel', 0, 0); c.restore(); }
        face(x + .3, y - 1.6, .9, jam ? 'o' : 'grr');
        // the pendulum hammer
        const sw = jam ? 0 : z.ph === 2 ? Math.sin(z.p * Math.PI) : z.ph === 1 ? -.2 * z.p : 0, ang = .1 + sw * .75, px = x - 1.3, py = y - 4.2;
        const hx = px - Math.sin(ang) * 3.4, hy = py + Math.cos(ang) * 3.4;
        cap(px, py, hx, hy, .1, '#8a8a9a'); circ(px, py, .14); fs('#555');
        rr(hx - .45, hy - .3, .9, .6, .12); fs('#e8453c'); txt('BONK', hx, hy, .18, '#fff');
      },
      weer(L, S, o, t) {
        const m = S.o.mach, cs = S.o.case, x = o.x + shake(S), y = o.y, z = hz0(L, S), ice = m.ice ? Math.min(1, (t - m.ice) / 100) : 0;
        rr(x - 1.5, y - 3.2, 3.0, 3.0, .35); fs(ice ? shade('#5ab4e8', ice * .6) : '#5ab4e8'); rr(x - 1.5, y - .45, 3.0, .3, .1); fs('#3a7ce8');
        for (let i = 0; i < 3; i++) { const py = y - 2.6 + i * .7; ln(x - 1.5, py, x - 2.2, py - .3, OUT, .2); ln(x - 1.5, py, x - 2.2, py - .3, ice ? '#e8f8ff' : '#a8b0c0', .12); }
        face(x + .3, y - 2.0, .9, ice ? 'o' : 'grr');
        circ(x + .3, y - .95, .3); fs('#fff'); txt(['☀', '☂', '❄'][cs.wt], x + .3, y - .93, .3, '#3a5a8a');
        if (ice) for (let i = 0; i < 6; i++) { const ix = x - 1.3 + i * .5; poly([[ix - .1, y - 3.2], [ix + .1, y - 3.2], [ix, y - 3.2 + .5 * ice]]); fs('#e8f8ff', '#9ad8f0', LW * .5); }
        // the cloud above the zone: rain, a rainbow (sun) or snow
        const cx = 8.1, cy = 3.2 + Math.sin(t * .04) * .1;
        if (cs.wt === 0) { for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(cx, 7.6, 1.6 - i * .2, Math.PI, 0); c.lineWidth = .18; c.strokeStyle = ['#e8453c', '#ffcf3a', '#3cb45a', '#3a7ce8'][i]; c.globalAlpha = .55; c.stroke(); c.globalAlpha = 1; } }
        else {
          for (const [dx, dy, r] of [[-.7, .1, .45], [0, -.15, .6], [.7, .1, .45]]) { circ(cx + dx, cy + dy, r); fs(z.ph >= 1 && cs.wt === 1 ? '#8a9ab0' : '#e8eef8', OUT, LW * .7); }
          if (cs.wt === 1 && z.ph === 2) for (let k = 0; k < 14; k++) { const p = (t * .04 + k * .37) % 1, rx = cx - 1.2 + (k * .19) % 2.4, ry = cy + .4 + p * (8.1 - cy - .4); ln(rx, ry, rx - .05, ry + .25, 'rgba(80,150,255,.8)', .05); }
          if (cs.wt === 2) for (let k = 0; k < 10; k++) { const p = (t * .01 + k * .37) % 1, rx = cx - 1.2 + (k * .29) % 2.4 + Math.sin(t * .05 + k) * .2, ry = cy + .4 + p * 4.4; txt('❄', rx, ry, .22, '#fff'); }
        }
      },
      wekker(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), sl = m.sleep, x = o.x + shake(S) + (!sl && z.ph === 2 ? Math.sin(t * 2) * .04 : 0), y = o.y;
        for (const sx of [-.9, .9]) cap(x + sx, y - .8, x + sx * 1.2, y - .05, .16, '#8a8a9a');
        const cy = y - 2.3; cached('clock', 3.3, 3.3, 1.65, 1.65, () => { circ(0, 0, 1.5); fs('#e8453c'); circ(0, 0, 1.2); fs('#fffdf4'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; txt(String(i || 12), Math.sin(a) * .98, -Math.cos(a) * .98, .2, OUT); } }, x, cy);
        const ah = ((S.o.knob.h || 3) % 12) / 12 * Math.PI * 2; ln(x, cy, x + Math.sin(ah) * .55, cy - Math.cos(ah) * .55, OUT, .1); ln(x, cy, x + Math.sin(t * .02) * .8, cy - Math.cos(t * .02) * .8, OUT, .05);
        face(x, cy + .35, .6, sl ? 'sad' : z.ph === 2 ? 'o' : 'grr', sl ? 1 : 0);
        for (const sx of [-1, 1]) { const rg = !sl && z.ph === 2 ? Math.sin(t * 2.4) * .1 : 0; c.beginPath(); c.arc(x + sx * .9 + rg, cy - 1.45, .45, Math.PI, 0); c.closePath(); fs('#ffcf3a'); }
        ln(x, cy - 1.5, x, cy - 1.9, OUT, .1);
        if (!sl && z.ph === 2) for (let k = 0; k < 3; k++) { const p = (t * .05 + k / 3) % 1; c.beginPath(); c.arc(x - 1.6, cy, .4 + p * 2.6, Math.PI * .75, Math.PI * 1.25); c.lineWidth = .1; c.strokeStyle = `rgba(255,207,58,${.9 - p * .8})`; c.stroke(); }
        if (sl) for (let k = 0; k < 3; k++) { const p = (t * .012 + k / 3) % 1; txt('Z', x + .8 + p * .8, cy - 1.8 - p * 1.2, .25 + p * .25, `rgba(90,90,140,${1 - p})`); }
        if (S.o.wkey.out && m) for (let k = 0; k < 3; k++) spring(x - 1.2 + k * .3, cy + .4, x - 1.5 + k * .45, cy - .5 - k * .2, 4, .08);
      },
      taart(L, S, o, t) {
        const m = S.o.mach, z = hz0(L, S), x = o.x + shake(S), y = o.y, off = m.off;
        cached('taartbody', 3.0, 3.2, 1.5, 3.1, () => { const x = 0, y = 0; rr(x - 1.3, y - 3.0, 2.6, 2.8, .4); fs('#f0a0d0'); rr(x - 1.3, y - .5, 2.6, .3, .1); fs('#d070a8'); }, x, y);
        for (const sx of [-.8, .8]) circ(x + sx, y - .15, .2), fs('#333');
        face(x + .3, y - 2.2, .8, off ? 'sad' : 'grr', off ? 1 : 0);
        // the OFF button on its side, facing the shelf with dominoes
        rr(x - 1.45, y - 2.1, .25, .6, .05); fs('#888'); circ(x - 1.48 + (off ? .08 : 0), y - 1.8, .2); fs('#e8453c'); txt('UIT', x - .9, y - 1.8, .17, '#fff');
        // the catapult arm with a cream pie
        const cock = off ? 0 : z.ph === 1 ? z.p : z.ph === 2 ? 1 - Math.min(1, z.p * 4) : 0, ang = -.4 - cock * 1.1;
        c.save(); c.translate(x + .5, y - 3.0); c.rotate(ang); cap(0, 0, -1.4, 0, .1, '#a06a32'); if (z.ph !== 2) { el(-1.5, -.1, .32, .14); fs('#fff8e8'); circ(-1.5, -.26, .07); fs('#e8453c', null); } c.restore();
        if (!off && z.ph === 2) { const p = z.p, px = x - 1 + (5.2 - (x - 1)) * p, py = y - 3.6 - Math.sin(p * Math.PI) * 2.2 + p * 3.3; el(px, py, .3, .14); fs('#fff8e8'); circ(px, py - .14, .06); fs('#e8453c', null); }
      },
      mega(L, S, o, t) {
        const s = S.m.stage, z = hz0(L, S), x = o.x + shake(S, .1), y = o.y, sh = S.o.shield, fa = S.o.fanarm;
        cached('megabody', 4.8, 7.3, 2.4, 7.0, () => {
          rr(-2.2, -5.6, 4.4, 5.4, .5); fs('#7a4ad0'); rr(-2.2, -.5, 4.4, .35, .1); fs('#5a2ab0');
          for (const sx of [-1.6, 0, 1.6]) circ(sx, -.2, .22), fs('#333');
          circ(.5, -3.2, .7); fs('#ffcf3a'); txt('K', .5, -3.18, .9, '#7a4ad0');
          rr(-.6, -6.9, 2.2, 1.4, .6); c.fillStyle = 'rgba(190,230,255,.6)'; c.fill(); c.lineWidth = LW; c.strokeStyle = OUT; c.stroke();
        }, x, y);
        // Karel in the cockpit
        if (S.m.st === 'ok' || S.m.bt < 100) karel(x + .5, y - 5.5, .7, { t, mood: s >= 2 ? 'angry' : 'taunt', face: -1 });
        if (fa.rev) { for (let k = 0; k < 5; k++) { const p = (t * .05 + k / 5) % 1, wx = x - 1.6 + p * 1.6, wy = y - 6.4 + (k % 3) * .3; ln(wx, wy, wx + .4, wy, `rgba(255,255,255,${.9 - p * .8})`, .05); } }
        // fan arm
        c.save(); c.translate(9.0, 2.75); if (fa.rev) c.scale(-1, 1); ln(0, 0, 1.4, 0, OUT, .2); circ(0, 0, .6); fs('#e8e8f0'); const a = t * (s === 1 ? .8 : .2) * (fa.rev ? -1 : 1); for (let i = 0; i < 3; i++) { const b = a + i * 2.09; el(Math.cos(b) * .3, Math.sin(b) * .3, .28, .1, b); fs('#5ab4e8', OUT, LW * .6); } circ(0, 0, .1); fs('#555'); c.restore();
        if (s === 1 && z.ph === 2) for (let k = 0; k < 7; k++) { const p = (t * .05 + k / 7) % 1, wx = 8.3 - p * 4.0, wy = 3.4 + p * 3.4 + (k % 4) * .35; ln(wx, wy, wx - .6, wy, `rgba(255,255,255,${.9 - p * .6})`, .06); }
        // the shield and its balloons
        if (!sh.hide) {
          rr(8.5, 4.7, 1.2, 3.1, .3); fs('#c9ccd6'); star(9.1, 6.2, .3, '#ffcf3a');
          const np = sh.np || 0, cols = ['#e8453c', '#ffcf3a', '#3a7ce8'];
          for (let i = 0; i < 3; i++) { if (i < np) continue; const bx = 8.5 + i * .6, by = 3.95 + Math.sin(t * .05 + i) * .06 - (i === 1 ? .2 : 0); ln(9.1, 4.7, bx, by + .4, '#666', .025); el(bx, by, .3, .38); fs(cols[i]); }
          if (s === 0 && z.ph >= 1) { const by = z.ph === 1 ? 4.6 : 4.6 + z.p * z.p * 3.6; if (by < 8.0) { el(7.6, by, .2, .24); fs('#7ac4ff'); } }
        }
        // the stamping fist (stage 2)
        if (s >= 2) { const d = s === 2 ? (z.ph === 2 ? Math.sin(z.p * Math.PI) : z.ph === 1 ? -.1 * z.p : 0) : 0, fx = 8.4 - d * 2.0; ln(x - 2.2, y - 1.5, fx, y - 1.5 + d * .9, OUT, .25); ln(x - 2.2, y - 1.5, fx, y - 1.5 + d * .9, '#c9ccd6', .15); circ(fx, y - 1.4 + d * .9, .35); fs('#e8453c'); }
        // the hatch with the code panel
        if (!S.o.panel.hide) { rr(8.45, 7.0, .9, 1.0, .08); fs('#4a5a7a'); ['r', 'y', 'b', 'g'].forEach((v, i) => { circ(8.65 + (i % 2) * .5, 7.3 + Math.floor(i / 2) * .4, .1); fs(CODECOL[v][1], OUT, LW * .5); }); }
      },
    };
    const MCOL = { vac: '#e8553c', bal: '#4fc0b0', tik: '#9b5de5', kraan: '#ffb020', worst: '#ff8a5a', water: '#3a7ce8', fan: '#5ab4e8', kok: '#d8dbe2', stempel: '#ffb020', bubbel: '#ff9ac0', krimp: '#26c2b4', tand: '#c99a5a', weer: '#5ab4e8', wekker: '#e8453c', taart: '#f0a0d0', mega: '#7a4ad0' };
    function machine(L, S, d, o, t) {
      if (S.m.st === 'gone') {
        const jx = d.k === 'kraan' ? S.o.motor.x : d.k === 'bal' ? o.x : d.k === 'worst' ? 8.1 : o.x;
        if (d.k === 'worst') return;                                  // it fell through the trapdoor
        if (d.k === 'kraan') { rr(1.6, .7, 10.8, .32, .06); fs('#ffb020'); junk(jx, 8.2, 1.8, MCOL[d.k]); return; }
        junk(jx, d.k === 'bal' ? 8.2 : o.y > 8.3 ? 8.2 : (d.f ? L._fl[d.f].y : 8.2), Math.min(3, d.w), MCOL[d.k]); return;
      }
      if (MACH[d.k]) MACH[d.k](L, S, o, t);
    }

    /* ---------- the room (pre-rendered) ---------- */
    function deco(dc, wc, wi) {
      const [k, a, b, e, f, g] = dc;
      switch (k) {
        case 'win': rr(a, b, e, f, .1); fs('#bfe8ff', wc.beam, .1); ln(a + e / 2, b, a + e / 2, b + f, wc.beam, .08); ln(a, b + f / 2, a + e, b + f / 2, wc.beam, .08); el(a + e * .3, b + f * .3, e * .12, f * .08); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); break;
        case 'peg': rr(a, b, e, f, .06); fs('#d9a86a', null); for (let i = 0; i < e * 3; i++) for (let j = 0; j < f * 3; j++) { circ(a + .17 + i / 3, b + .17 + j / 3, .025); c.fillStyle = 'rgba(80,50,30,.35)'; c.fill(); }
          c.globalAlpha = .7; ln(a + .4, b + .3, a + .4, b + 1.2, '#666', .08); rr(a + .25, b + .2, .3, .2, .03); fs('#888', null); ln(a + 1.0, b + .3, a + 1.2, b + 1.4, '#666', .06); circ(a + 1.0, b + .3, .12); fs(null, '#666', .05); ln(a + 1.8, b + .25, a + 1.8, b + 1.2, '#e8453c', .1); c.globalAlpha = 1; break;
        case 'shelf': rr(a - e / 2, b, e, .14, .03); fs(wc.beam, null); for (const sx of [-e / 2 + .2, e / 2 - .2]) poly([[a + sx - .05, b + .14], [a + sx + .05, b + .14], [a + sx, b + .45]]), fs(wc.beam, null);
          for (let i = 0; i < 3; i++) { const bx = a - e / 2 + .4 + i * (e - .8) / 2; if (f === 'cans') { rr(bx - .18, b - .5, .36, .5, .06); fs(['#e8453c', '#3a7ce8', '#3cb45a'][i], OUT, LW * .5); } else if (f === 'pots') { c.beginPath(); c.arc(bx, b - .2, .25, 0, Math.PI); c.closePath(); fs('#8a8a9a', OUT, LW * .5); } else { rr(bx - .25, b - .45, .5, .45, .03); fs('#c98f52', OUT, LW * .5); } } break;
        case 'sign': c.font = `900 .32px system-ui,sans-serif`; { const w = c.measureText(e).width + .4; rr(a - w / 2, b - .25, w, .5, .08); fs('#fff8e8', wc.beam, .06); txt(e, a, b + .01, .32, '#c0304a'); } break;
        case 'door': rr(a - e / 2, b - f, e, f, .06); fs('#c9ccd6', wc.beam, .08); for (let i = 1; i < 12; i++) ln(a - e / 2, b - f + i * f / 12, a + e / 2, b - f + i * f / 12, '#a8adb8', .04); break;
        case 'lamp': ln(a, 0, a, .6, '#444', .03); c.beginPath(); c.arc(a, .9, .35, Math.PI, 0); fs('#3cb45a', null); circ(a, .92, .12); fs('#fff8c0', null); break;
        case 'stain': el(a, b - .02, .6, .08); c.fillStyle = 'rgba(40,30,30,.25)'; c.fill(); break;
        case 'tiresd': for (let i = 0; i < 3; i++) { el(a, b - .2 - i * .38, .55, .2); fs('#333', '#111', .04); el(a, b - .2 - i * .38, .25, .08); fs('#555', null); } break;
        case 'crate': rr(a - e / 2, b - f, e, f, .04); fs('#c98f52', '#8a5a32', .05); ln(a - e / 2, b - f, a + e / 2, b, '#8a5a32', .05); ln(a + e / 2, b - f, a - e / 2, b, '#8a5a32', .05); break;
        case 'pipe': ln(a, b, e, f, OUT, g * 2 + .06); ln(a, b, e, f, '#a8b0c0', g * 2); ln(a, b - g * .4, e, f - g * .4, 'rgba(255,255,255,.35)', g * .5); break;
        case 'gearbg': c.globalAlpha = .35; gear(a, b, e, 10, .2, '#5a6a8a'); c.globalAlpha = 1; break;
        case 'stripe': for (let x = a; x < b - .2; x += .5) poly([[x, e + .02], [x + .25, e + .02], [x + .1, e + .14], [x - .15, e + .14]]), fs('#ffcf3a', null); break;
        case 'socket': rr(a - .2, b - .2, .4, .4, .06); fs('#fff', OUT, LW * .6); circ(a - .07, b, .03); fs(OUT, null); circ(a + .07, b, .03); fs(OUT, null); break;
        case 'tiles': for (let i = 0; i < e * 2; i++) for (let j = 0; j < f * 2; j++) { rr(a + i * .5, b + j * .5, .48, .48, .04); fs((i + j) % 2 ? '#ffffff' : '#e8f4ff', null); } break;
        case 'port': circ(a, b, e); fs('#bfe8ff', '#8a7ad0', .12); circ(a - e * .3, b - e * .3, e * .2); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); cloudShape(a + e * .1, b + e * .3, e * .4, '#fff'); break;
        case 'cloud': cloudShape(a, b, e, 'rgba(255,255,255,.8)'); break;
        case 'lab': rr(a - .8, b - .5, 1.6, .5, .06); fs('#fff', '#c7bdf0', .05); for (let i = 0; i < 3; i++) { rr(a - .6 + i * .45, b - 1.0, .22, .5, .08); fs(['#ff9ac0', '#9ad8ff', '#b8f0a0'][i], OUT, LW * .5); } break;
        case 'fence': for (let i = 0; i < 4; i++) { rr(a - .3 + i * .22, b - 2.6, .1, 2.6, .04); fs('#8a8a9a'); } rr(a - .4, b - 2.2, 1.0, .12, .03); fs('#8a8a9a'); rr(a - .4, b - .6, 1.0, .12, .03); fs('#8a8a9a'); break;
        case 'poster': rr(a - e / 2, b - f / 2, e, f, .05); fs('#fff8e8', wc.beam, .06); txt('GEHEIM!', a, b - f / 2 + .2, .16, '#c0304a'); codeBalloons('gybr', a, b + .15, e - .3); break;
      }
    }
    function cloudShape(x, y, s, col) { for (const [dx, dy, r] of [[-.5, .1, .35], [0, -.1, .5], [.5, .1, .35], [.2, .2, .35], [-.2, .2, .35]]) { circ(x + dx * s, y + dy * s, r * s); c.fillStyle = col; c.fill(); } }
    function room(L) {
      const wi = L.w, wc = WORLDCOL[wi];
      // wall
      if (wi === 2) { const g = c.createLinearGradient(0, 0, 0, 9); g.addColorStop(0, wc.wall); g.addColorStop(1, wc.wall2); c.fillStyle = g; c.fillRect(0, 0, 14, 9); for (let i = 0; i < 6; i++) cloudShape(1 + i * 2.6, 6.8 + (i % 2) * .5, 1.1, 'rgba(255,255,255,.75)'); }
      else {
        c.fillStyle = wc.wall; c.fillRect(0, 0, 14, 9);
        if (wi === 0) { for (let i = 0; i < 28; i++) ln(i * .5 + .25, 0, i * .5 + .25, 6.2, wc.wall2, .03); c.fillStyle = wc.low; c.fillRect(0, 6.2, 14, 3); ln(0, 6.2, 14, 6.2, wc.beam, .08); }
        else { for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { rr(i * 2 + .08, j * 2.1 + .1, 1.84, 1.9, .1); fs(wc.wall2, null); for (const [cx, cy] of [[.2, .2], [1.72, .2], [.2, 1.8], [1.72, 1.8]]) circ(i * 2 + cx, j * 2.1 + cy, .04), fs('#7a9ab4', null); } c.fillStyle = wc.low; c.fillRect(0, 6.4, 14, 3); }
      }
      for (const dc of (L.deco || [])) deco(dc, wc, wi);
      // floors: the ground (with gaps between hop floors) and the upper walkways
      const gaps = []; for (const e of L._edges) if (e.t === 'hop' && e.xa < e.xb) gaps.push([e.xa + .2, e.xb - .2]);
      const ground = L.floors.filter(f => Math.abs(f.y - 8.2) < .01);
      let segs = [[0, 14]]; for (const [a, b] of gaps) segs = segs.flatMap(([s0, s1]) => a > s0 && b < s1 ? [[s0, a], [b, s1]] : [[s0, s1]]);
      if (ground.length) for (const [s0, s1] of segs) {
        if (wi === 2) { rr(s0, 8.2, s1 - s0, .45, .12); fs(wc.floor, wc.beam, .08); c.fillStyle = '#fff'; c.fillRect(s0 + .15, 8.24, s1 - s0 - .3, .08); cloudShape((s0 + s1) / 2, 8.85, Math.min(1.6, (s1 - s0) / 3), '#ffffff'); }
        else { c.fillStyle = wc.floor; c.fillRect(s0, 8.2, s1 - s0, .8); c.fillStyle = wc.floor2; c.fillRect(s0, 8.2, s1 - s0, .12); if (wi === 0) for (let x = s0 + .7; x < s1; x += 1.4) ln(x, 8.35, x, 9, 'rgba(0,0,0,.12)', .03); }
      }
      for (const F of L.floors) {
        if (Math.abs(F.y - 8.2) < .01) continue;
        const x0 = F.x0 - .1, w = F.x1 - F.x0 + .2;
        if (wi === 2) { rr(x0, F.y, w, .3, .12); fs(wc.floor, wc.beam, .08); cloudShape(x0 + w / 2, F.y + .45, Math.min(1.2, w / 4), 'rgba(255,255,255,.9)'); }
        else { rr(x0, F.y, w, .3, .05); fs(wi === 0 ? '#c98f52' : '#7a8aa0', OUT, .05); for (let x = x0 + .4; x < x0 + w - .2; x += 1.2) poly([[x, F.y + .3], [x + .3, F.y + .3], [x + .15, F.y + .7]]), fs(wi === 0 ? '#a06a32' : '#5b6b84', null); if (wi === 1) for (let x = x0 + .3; x < x0 + w; x += .6) circ(x, F.y + .15, .04), fs('#c9d0dc', null); }
      }
      for (const Ld of L.ladders) {
        const ya = L._fl[Ld.a].y, yb = L._fl[Ld.b].y, top = Math.min(ya, yb) - .5, bot = Math.max(ya, yb), col = wi === 0 ? '#b07a42' : wi === 1 ? '#c9d0dc' : '#ffffff';
        for (const sx of [-.32, .32]) { ln(Ld.x + sx, top, Ld.x + sx, bot, OUT, .16); ln(Ld.x + sx, top, Ld.x + sx, bot, col, .1); }
        for (let y = top + .3; y < bot; y += .45) { ln(Ld.x - .3, y, Ld.x + .3, y, OUT, .12); ln(Ld.x - .3, y, Ld.x + .3, y, col, .07); }
      }
    }

    /* ---------- particles ---------- */
    let parts = [];
    function burst(x, y, n, kinds, sp = 1) { for (let i = 0; i < n; i++) { const a = -Math.PI * (.1 + Math.random() * .8), v = (2 + Math.random() * 4) * sp; parts.push({ k: kinds[i % kinds.length], x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, vr: (Math.random() - .5) * 10, life: 0, max: 1.4 + Math.random() * .8, s: .7 + Math.random() * .5, col: ['#c9ccd6', '#ffcf3a', '#e8453c', '#9aa0b0'][i % 4] }); } }
    function puffs(x, y, n, col = 'rgba(200,200,210,') { for (let i = 0; i < n; i++) parts.push({ k: 'puff', x: x + (Math.random() - .5) * 1.2, y: y + (Math.random() - .5) * .6, vx: (Math.random() - .5) * .8, vy: -.4 - Math.random() * .6, life: 0, max: 1.2 + Math.random() * .8, s: .25 + Math.random() * .3, col }); }
    function drops(x, y, n, col = '#6ab4ff') { for (let i = 0; i < n; i++) { const a = -Math.PI * Math.random(), v = 1.5 + Math.random() * 3; parts.push({ k: 'drop', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: .7, s: .08 + Math.random() * .06, col }); } }
    function confetti(x, y, n) { for (let i = 0; i < n; i++) { const a = -Math.PI * (.2 + Math.random() * .6), v = 3 + Math.random() * 4; parts.push({ k: 'conf', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, vr: (Math.random() - .5) * 12, life: 0, max: 2.2, s: .12, col: ['#e8453c', '#ffcf3a', '#3a7ce8', '#3cb45a', '#ff7ab0'][i % 5] }); } }
    function stepParts(dt) {
      const k = dt / 1000;
      for (const p of parts) {
        p.life += k;
        if (p.k === 'puff') { p.x += p.vx * k; p.y += p.vy * k; p.s += k * .5; }
        else { p.vy += (p.k === 'conf' ? 4 : 12) * k; if (p.k === 'conf') { p.vx *= .985; } p.x += p.vx * k; p.y += p.vy * k; if (p.r != null) p.r += p.vr * k; if (p.y > 8.15 && p.k !== 'conf' && p.vy > 0) { p.y = 8.15; p.vy *= -.35; p.vx *= .6; p.vr *= .5; } }
      }
      parts = parts.filter(p => p.life < p.max);
      if (parts.length > 160) parts.splice(0, parts.length - 160);
    }
    function drawParts() {
      for (const p of parts) {
        const a = Math.max(0, 1 - p.life / p.max);
        if (p.k === 'puff') { circ(p.x, p.y, p.s); c.fillStyle = p.col + (a * .55).toFixed(3) + ')'; c.fill(); continue; }
        c.globalAlpha = Math.min(1, a * 2);
        if (p.k === 'drop') { el(p.x, p.y, p.s * .7, p.s); c.fillStyle = p.col; c.fill(); }
        else if (p.k === 'star') star(p.x, p.y, .12 * p.s, '#ffd23a');
        else if (p.k === 'snow') txt('❄', p.x, p.y, .25, '#fff');
        else { c.save(); c.translate(p.x, p.y); c.rotate(p.r || 0);
          if (p.k === 'bolt') { poly([[-.12, -.07], [0, -.14], [.12, -.07], [.12, .07], [0, .14], [-.12, .07]]); fs(p.col, OUT, LW * .6); circ(0, 0, .05); fs(OUT, null); }
          else if (p.k === 'gear') gear(0, 0, .16 * p.s, 7, 0, p.col);
          else if (p.k === 'spring') spring(-.15, 0, .15, 0, 3, .07);
          else if (p.k === 'conf') { c.fillStyle = p.col; c.fillRect(-.06, -.03, .12, .06); }
          else if (p.k === 'sock') { rr(-.07, -.15, .14, .3, .06); fs(p.col); }
          c.restore(); }
        c.globalAlpha = 1;
      }
    }

    /* ---------- the renderer ---------- */
    function create(cv) {
      const ctx = cv.getContext('2d');
      const R = { W: 0, H: 0, dpr: 1, rx: 0, ry: 0, s: 40, L: null, bg: null, bgKey: '', RS: { hitKind: '', wetT: 0, takeT: 0, takeIt: null, flee: 0, boomT: 0, sayK: 0 } };
      R.resize = (w, h, dpr) => { R.W = w; R.H = h; R.dpr = dpr; const pw = Math.round(w * dpr), ph = Math.round(h * dpr); if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; } R.bgKey = ''; };
      R.setRoom = (x, y, s) => { if (x !== R.rx || y !== R.ry || s !== R.s) { R.rx = x; R.ry = y; R.s = s; R.bgKey = ''; } };
      R.setLevel = L => { R.L = L; R.bgKey = ''; parts = []; R.RS = { hitKind: '', wetT: 0, takeT: 0, takeIt: null, flee: 0, boomT: 0 }; };
      R.toRoom = (px, py) => [(px - R.rx) / R.s, (py - R.ry) / R.s];
      R.toScreen = (ux, uy) => [R.rx + ux * R.s, R.ry + uy * R.s];
      const unit = cx => cx.setTransform(R.dpr * R.s, 0, 0, R.dpr * R.s, R.dpr * R.rx, R.dpr * R.ry);
      function makeBg(L) {
        const key = [L.id, R.W, R.H, R.dpr, R.rx, R.ry, R.s].join('|'); if (key === R.bgKey) return;
        R.bgKey = key; const b = R.bg || document.createElement('canvas'); R.bg = b; b.width = cv.width; b.height = cv.height;
        const bx = b.getContext('2d'); const wc = WORLDCOL[L.w];
        bx.setTransform(1, 0, 0, 1, 0, 0); bx.fillStyle = wc.frame; bx.fillRect(0, 0, b.width, b.height);
        const prev = c; c = bx; unit(bx); c.save(); rr(0, 0, 14, 9, .25); c.clip(); room(L); c.restore(); rr(0, 0, 14, 9, .25); c.lineWidth = .08; c.strokeStyle = 'rgba(0,0,0,.35)'; c.stroke(); c = prev;
      }
      R.frame = (L, S, o = {}) => {
        if (!L || !S || !R.W) return;
        makeBg(L); c = ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(R.bg, 0, 0);
        unit(ctx); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.save();
        const t = S.t, RS = R.RS;
        if (o.dt) stepParts(o.dt);
        // behind: objects marked back, then the machine, then the other objects
        const mach = L._od.mach;
        for (const d of L.objs) if (d.id !== 'mach' && (d.k === 'motor' || d.k === 'valve' || d.k === 'curtain' || d.k === 'note' || d.k === 'ramp' || d.k === 'nest')) objC(L, S, d, S.o[d.id], t);
        machine(L, S, mach, S.o.mach, t);
        for (const d of L.objs) if (d.id !== 'mach' && !(d.k === 'motor' || d.k === 'valve' || d.k === 'curtain' || d.k === 'note' || d.k === 'ramp' || d.k === 'nest')) objC(L, S, d, S.o[d.id], t);
        // Woef
        const W = S.w; woef(W.x, W.y, W.face, woefPose(S, RS, o.sel));
        if (W.m === 'bark') { const k = W.mt / 42; for (let i = 0; i < 3; i++) { const r = .3 + ((k * 2 + i / 3) % 1) * 1.4; ctx.beginPath(); ctx.arc(W.x + W.face * 1.0, W.y - 1.1, r, W.face > 0 ? -.6 : Math.PI - .6, W.face > 0 ? .6 : Math.PI + .6); ctx.lineWidth = .07; ctx.strokeStyle = `rgba(255,255,255,${.9 - ((k * 2 + i / 3) % 1) * .8})`; ctx.stroke(); } if (W.mt > 8 && W.mt < 34) txt('WOEF!', W.x + W.face * .9, W.y - 2.1, .38, '#fff'); }
        // Karel in his flying machine
        karelFly(L, S, t);
        drawParts();
        // the hint arrow
        if (o.arrow) { const d = L._od[o.arrow]; if (d && !S.o[o.arrow].hide) { const so = S.o[o.arrow], ax = so.x, ay = so.y - d.h - .35 - Math.abs(Math.sin(t * .1)) * .35; poly([[ax, ay + .5], [ax - .35, ay], [ax - .14, ay], [ax - .14, ay - .5], [ax + .14, ay - .5], [ax + .14, ay], [ax + .35, ay]]); fs('#ffd23a', OUT, .07); } }
        // the wind-up of an attack: a small "!" above the machine so you can see it coming
        const zz = Core.zones(L, S); if (zz.length && zz[0].ph === 1) { const z0 = zz[0], ex = clamp((z0.x0 + z0.x1) / 2, .6, 13.4), ey = L._fl[z0.f].y - 2.5 - Math.abs(Math.sin(t * .25)) * .15; circ(ex, ey, .32); fs('#ffcf3a', OUT, .06); txt('!', ex, ey + .02, .42, OUT); }
        ctx.restore();
      };
      function karelFly(L, S, t) {
        if (L.final) {                                              // the finale: Karel is in the big machine, then in the cage
          const bt = S.m.bt;
          if (S.m.st !== 'ok' && bt >= 100) {
            const k = Math.min(1, (bt - 100) / 40), kx = 10.6, ky = 8.2 - Math.sin(k * Math.PI) * 2.5 * (1 - k) - (1 - k) * 3.4;
            karel(kx, Math.min(8.2, ky), .9, { t, mood: bt > 260 ? 'sulk' : bt > 150 ? 'angry' : 'flee', face: -1 });
            const ck = Math.min(1, Math.max(0, (bt - 140) / 25)), cy = -1 + ck * ck * 9.2;
            c.save(); c.translate(kx, cy); for (let i = 0; i < 7; i++) { ln(-.9 + i * .3, -2.0, -.9 + i * .3, 0, '#8a8a9a', .08); } rr(-1.0, -2.15, 2.0, .2, .06); fs('#5a5a6a'); rr(-1.0, -.1, 2.0, .14, .04); fs('#5a5a6a'); ln(0, -2.15, 0, -5, '#555', .04); c.restore();
            if (bt > 260) { c.save(); c.translate(kx - 1.1, 5.4); rr(-1.0, -.4, 2.2, .8, .2); fs('#fff', OUT, .05); txt('Sorry Woef...', .1, 0, .3, OUT); c.restore(); }
          }
          return;
        }
        const RS = R.RS, w = L.w, bt = S.m.st === 'ok' ? 0 : S.m.bt;
        let kx = L.kx || 12.2, ky = L.ky || 1.95, mood = 'taunt';
        if (RS.hitT > t) mood = 'taunt';
        if (bt) mood = bt > 140 ? 'flee' : 'angry';
        if (bt > 140) { const k = (bt - 140) / 80; kx += k * k * 9; ky -= k * 2; }
        ky += Math.sin(t * .05) * .12;
        if (kx < 16) {                                            // pre-rendered frames of Karel in his flying machine
          const fr = Math.floor(t / 4) % 12, key = 'f' + w + mood + fr;
          spr(key, 2.6, 3.2, 1.3, 2.3, () => flyer(0, 0, .85, w, { t: fr * 4, mood, face: -1 }), kx, ky);
        }
        if (bt > 140 && bt < 240 && t % 6 === 0) puffs(kx - .8, ky + .4, 1, 'rgba(255,255,255,');
      }
      // what happened in the logic -> particles and remembered poses
      R.event = (L, S, e) => {
        const a = e.a || {}, RS = R.RS, t = S.t, m = S.o.mach, W = S.w;
        switch (e.t) {
          case 'hit': RS.hitKind = a.kind; RS.hitT = t + 60; if (['splash', 'drop', 'rain'].includes(a.kind)) { RS.wetT = t + 240; drops(W.x, W.y - 1, 10); } if (a.kind === 'pie') drops(W.x + W.face * .9, W.y - 1.1, 8, '#fff8e8'); for (let i = 0; i < 4; i++) parts.push({ k: 'star', x: W.x, y: W.y - 1.4, vx: (Math.random() - .5) * 3, vy: -2 - Math.random() * 2, life: 0, max: .7, s: 1 }); break;
          case 'take': RS.takeIt = a.it; RS.takeT = t + 50; break;
          case 'break': puffs(m.x, (m.y || 8.2) - 1.5, 4); break;
          case 'boom': { const d = L._od.mach, bx = d.k === 'kraan' ? S.o.motor.x : d.k === 'worst' ? 8.1 : m.x, by = d.k === 'worst' ? 8.0 : d.k === 'kraan' ? 7 : (m.y || 8.2) - Math.min(2.5, d.h * .5); burst(bx, by, 26, ['bolt', 'spring', 'gear', 'bolt'], 1.1); puffs(bx, by, 10); RS.boomT = t; break; }
          case 'cheer': confetti(W.x, W.y - 2, 30); break;
          case 'fx': {
            const k = a.k;
            if (k === 'pop') { const bx = L.final ? 8.5 + a.n * .6 : m.x - .7 + a.n * .7, by = L.final ? 3.95 : m.y - 3.3; burst(bx, by, 6, ['conf'], .6); }
            else if (k === 'splashfuse' || k === 'freeze' || k === 'jam' || k === 'crash' || k === 'sneeze' || k === 'zapself') puffs(m.x - .5, (m.y || 8.2) - 2.5, 5);
            else if (k === 'crashbelow') burst(8.1, 8.0, 14, ['bolt', 'spring', 'gear'], .9);
            else if (k === 'bonk') puffs(m.dx || m.x, 8, 4);
            else if (k === 'keydrop') puffs(2.2, 4.4, 3, 'rgba(255,255,255,');
            else if (k === 'domino' || k === 'button') puffs(10.6, 6.2, 2);
            else if (k === 'bigbubble') drops(m.x, m.y - 2, 10, '#ffe090');
          }
        }
      };
      // a cache of small pre-rendered pictures (static objects, Karel's frames), cleared when the size changes
      let sprites = new Map(), sprKey = '';
      function spr(key, w, h, ox, oy, fn, x, y) {
        const scale = R.s * R.dpr, sk = scale.toFixed(3); if (sk !== sprKey) { sprites = new Map(); sprKey = sk; }
        let e = sprites.get(key);
        if (!e) {
          const cv2 = document.createElement('canvas'); cv2.width = Math.max(1, Math.ceil(w * scale)); cv2.height = Math.max(1, Math.ceil(h * scale));
          const x2 = cv2.getContext('2d'); x2.setTransform(scale, 0, 0, scale, ox * scale, oy * scale); x2.lineJoin = x2.lineCap = 'round';
          const prev = c; c = x2; try { fn(); } finally { c = prev; }
          e = cv2; sprites.set(key, e); if (sprites.size > 400) sprites.delete(sprites.keys().next().value);
        }
        ctx.drawImage(e, x - ox, y - oy, w, h);
      }
      const STATIC = new Set(['basket', 'cactus', 'pump', 'cheesebox', 'panel', 'toolbox', 'books', 'board', 'curtain', 'cpanel', 'gluepot', 'bench', 'mirror', 'magnet', 'drain', 'stick', 'key', 'case', 'note', 'knob', 'toybox', 'plank', 'batt', 'fridge', 'cupboard', 'lever', 'trap']);
      function objC(L, S, d, o, t) {
        if (o.hide || d.k === 'none') return;
        const busy = (o.open && t - o.open < 50) || (o.pull && t - o.pull < 70) || (d.k === 'trap' && (o.worst || o.open));
        if (!STATIC.has(d.k) || busy) { obj(L, S, d, o, t); return; }
        const pad = .7, w = d.w + pad * 2 + (d.k === 'fridge' || d.k === 'cupboard' ? .6 : 0), h = d.h + pad * 2, k = d.id + '|' + JSON.stringify(o, (kk, v) => kk === 'x' || kk === 'y' ? undefined : v);
        spr(k, w, h, w / 2, d.h + pad, () => obj(L, S, d, Object.assign({}, o, { x: 0, y: 0 }), t), o.x, o.y);
      }
      R.idle = () => parts.length === 0;
      R.clearParts = () => { parts = []; };
      return R;
    }

    /* ---------- small pictures for the HTML: item icons, faces, level thumbnails, close-ups ---------- */
    const cacheURL = {};
    function pic(key, w, h, fn) {
      if (cacheURL[key]) return cacheURL[key];
      const cv = document.createElement('canvas'), k = 2; cv.width = w * k; cv.height = h * k; const x = cv.getContext('2d'); x.scale(k, k); x.lineJoin = x.lineCap = 'round';
      const prev = c; c = x; try { fn(x); } finally { c = prev; }
      return (cacheURL[key] = cv.toDataURL());
    }
    const icon = it => pic('i' + it, 64, 64, x => { x.translate(32, 34); x.scale(46, 46); item(it, 0, 0); });
    const facePic = (who, mood = 'taunt') => pic('f' + who + mood, 96, 96, x => { if (who === 'w') { x.translate(18, 116); x.scale(62, 62); woef(0, 0, 1, { t: 0, up: .5, eyes: mood === 'happy' ? 'happy' : 'o', mouth: mood === 'happy' ? .6 : 0, shadow: false }); } else { x.translate(48, 140); x.scale(60, 60); karel(0, 0, 1, { t: 4, mood }); } });
    const fullPic = (who, mood, w = 160, h = 180) => pic('F' + who + mood + w, w, h, x => { if (who === 'w') { x.translate(w * .35, h * .92); x.scale(w * .42, w * .42); woef(0, 0, 1, { t: 6, up: mood === 'cheer' ? .9 : 0, arm: mood === 'cheer' ? -2.6 : null, arm2: mood === 'cheer' ? -2.3 : null, eyes: mood === 'cheer' ? 'happy' : 'o', mouth: mood === 'cheer' ? .7 : 0 }); } else { x.translate(w * .5, h * .95); x.scale(h * .5, h * .5); karel(0, 0, 1, { t: 4, mood }); } });
    function thumb(i) {
      const L = Core.prep(LEVELS[i]);
      return pic('t' + i, 112, 72, x => { x.scale(8, 8); room(L); const S = Core.newState(i); S.t = 40; x.save(); machine(L, S, L._od.mach, S.o.mach, 40); x.restore(); });
    }
    function look(kind, data) {
      return pic('l' + kind + (data || ''), 300, 200, x => {
        x.scale(50, 50);
        if (kind === 'code') { rr(.2, .2, 5.6, 3.6, .1); fs('#8a5a32'); rr(.45, .45, 5.1, 3.1, .06); fs('#fff8e8'); codeBalloons(data, 3, 1.8, 4.6); txt('→', 3, 3.25, .4, '#8a5a32'); }
        else if (kind === 'note') { rr(.4, .2, 5.2, 3.6, .1); fs('#fff8c0'); circ(3, .45, .12); fs('#e8453c', null); txt('Wekkerbot', 3, .95, .42, '#c0304a'); txt('slaapt om', 2.1, 2.2, .36, OUT); clockFace(4.3, 2.2, .85, 8, 0); txt('🌙', 1.4, 3.15, .45); txt('Karel', 4.6, 3.4, .3, '#7a3ac0', 700); }
      });
    }
    return { create, icon, facePic, fullPic, thumb, look, P, WORLDCOL };
  })();

  /* ================= ui.js: screens, tap input, the loop, HUD, close-ups, map, results, save/resume ================= */
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const STEP = 1000 / 60;
  const opt = Object.assign({ sound: true, world: 0 }, store.get('wk.settings', {}));
  Sfx.gate('wk', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('wk.settings', opt);
  const sfx = (n, a, pan) => { if (opt.sound) Sfx.play(n, a, pan); };
  let stats = Object.assign({ lv: {}, plays: 0, wins: 0, hints: 0, hits: 0, beaten: 0, stars: 0, nohint: 0, three: 0, caught: 0, w2: 0 }, store.get('wk.stats', {}));
  const doneLv = i => !!(stats.lv[i] && stats.lv[i].s);
  const starsTotal = () => { let s = 0; for (const k in stats.lv) s += stats.lv[k].s || 0; return s; };
  function saveStats() {
    let beaten = 0, nohint = 0, three = 0; for (const k in stats.lv) { const r = stats.lv[k]; if (r.s) beaten++; if (r.s && r.h === 0) nohint++; if (r.s >= 3) three++; }
    let w2 = 1; for (let i = PER; i < 2 * PER; i++) if (!doneLv(i)) w2 = 0;
    Object.assign(stats, { beaten, nohint, three, stars: starsTotal(), w2 }); store.set('wk.stats', stats);
  }
  const worldOf = i => Math.min(WORLDS.length - 1, Math.floor(i / PER));
  const worldLevels = w => { const a = []; for (let i = w * PER; i < (w === WORLDS.length - 1 ? NL : (w + 1) * PER); i++) a.push(i); return a; };
  const worldOpen = w => w === 0 || (starsTotal() >= WORLDS[w].need && doneLv(w * PER - 1));
  const levelOpen = i => { const w = worldOf(i); return worldOpen(w) && (i === w * PER || doneLv(i - 1)); };
  const TIPS = { 0: 'Tik op de vloer om te lopen. Tik op iets om het te gebruiken of te duwen.', 1: 'Pak iets op. Tik dan op het ding in je rugzak, en daarna waar je het wilt gebruiken.', 2: 'Nieuw: de Blaf!-knop 🐶. Daarmee kan Woef iemand laten schrikken.', 3: 'Sommige dingen hebben knoppen. Loop erheen en kies!', 9: 'Tik op twee dingen in je rugzak om ze samen te voegen.' };
  const TAUNT = ['Hihi! Raak!', 'Mwahaha!', 'Haha! Dat zag je niet aankomen!', 'Probeer het nog maar eens, Woef!', 'Hahaha! Mijn machine is de beste!'];

  const scr = $('#wk'), stageEl = $('#wkStage'), cv = $('#wkCv'), R = Art.create(cv);
  const H = { top: $('#wkTop'), title: $('#wkTitle'), stars: $('#wkStars'), side: $('#wkSide'), inv: $('#wkInv'), hint: $('#wkHintBtn'), bark: $('#wkBark'), msg: $('#wkMsg'), cu: $('#wkCu'), intro: $('#wkIntro'), map: $('#wkMap'), toast: $('#wkToast') };
  let GS = null, L = null, S = null, sel = null, raf = 0, lastT = 0, acc = 0, frames = [], quality = 0, lastPh = 0, saveT = 0;
  const now = () => performance.now();
  let run = store.get('wk.save', null);
  const saveRun = () => { if (GS && GS.view === 'play' && S && !S.done && GS.lv != null) { run = { lv: GS.lv, S }; try { store.set('wk.save', run); } catch (e) {} } };
  const clearRun = () => { run = null; store.del('wk.save'); };

  /* ---------- layout: the room is as big as possible, the controls beside it (landscape) or below it (portrait) ---------- */
  let port = false;
  function fit() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const W = r.width, Hh = r.height, big = document.documentElement.classList.contains('big-text');
    port = Hh > W * 1.05;
    const d = Math.min(window.__wkDpr || [2, 1.6, 1.25, 1, .85, .72][quality], devicePixelRatio || 1);
    R.resize(W, Hh, d);
    let s, rx, ry;
    if (port) {
      const topH = 54, botH = big ? 112 : 96, msgH = big ? 96 : 80;
      s = Math.min((W - 8) / 14, (Hh - topH - botH - msgH) / 9); rx = (W - 14 * s) / 2; ry = topH + Math.max(0, (Hh - topH - botH - msgH - 9 * s) / 3);
      scr.classList.add('port'); scr.classList.remove('land');
      Object.assign(H.msg.style, { left: '10px', right: '10px', top: (ry + 9 * s + 8) + 'px', width: 'auto', bottom: 'auto' });
    } else {
      const side = big ? 112 : 98;
      s = Math.min((W - side - 18) / 14, (Hh - 10) / 9); rx = 8 + (W - side - 8 - 14 * s) / 2; ry = (Hh - 9 * s) / 2;
      scr.classList.add('land'); scr.classList.remove('port');
      Object.assign(H.msg.style, { left: (rx + 14 * s * .25) + 'px', width: (14 * s * .55) + 'px', right: 'auto', top: (ry + 8) + 'px', bottom: 'auto' });
    }
    R.setRoom(rx, ry, s);
    scr.style.setProperty('--rx', rx + 'px'); scr.style.setProperty('--ry', ry + 'px'); scr.style.setProperty('--rw', 14 * s + 'px'); scr.style.setProperty('--rh', 9 * s + 'px');
    if (S && L) draw(0);
  }
  window.addEventListener('resize', () => { if (current === 'wk') setTimeout(fit, 60); });

  /* ---------- the loop: fixed 60 Hz logic, a frame per animation frame, stopped when nothing moves ---------- */
  const stopped = () => !GS || GS.view !== 'play' || !S || GS.intro || GS.manual || anyModal();
  function kick() { if (!raf && current === 'wk' && !stopped()) { lastT = now(); raf = requestAnimationFrame(loop); } }
  function loop(ts) {
    raf = 0;
    if (current !== 'wk' || stopped()) { if (S && L && GS && GS.view === 'play') draw(0); return; }
    frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    const dt = Math.min(100, Math.max(0, ts - lastT)); lastT = ts;
    if (!S.done) {
      acc += dt * (window.__wkSpeed || 1); let n = 0;
      while (acc >= STEP && n < 8) { acc -= STEP; n++; stepGame(); if (!S || GS.view !== 'play') return; }
      if (n >= 8) acc = 0;
      perfWatch(dt);
    }
    draw(dt);
    if (stopped()) return;
    if (S.done && R.idle()) return;
    raf = requestAnimationFrame(loop);
  }
  let pwT = 0, pwN = 0;
  function perfWatch(dt) { pwT += dt; pwN++; if (pwN < 60) return; const avg = pwT / pwN; pwT = 0; pwN = 0; if (avg > 18.2 && quality < 5) { quality++; fit(); } }
  function draw(dt) { if (!S || !L) return; R.frame(L, S, { dt, sel, arrow: Core.arrow(L, S) }); }

  /* ---------- one logic step and what it means for sound and HUD ---------- */
  const ATK = { suck: 'wkSuck', drop: 'wkDrip', tickle: 'wkGiggle', mag: 'wkMag', bump: 'wkBoing', splash: 'wkSplash', wind: 'wkWhoosh', pie: 'wkWhoosh', stamp: 'wkStamp', bubble: 'wkBubble', zap: 'wkZap', bonk: 'wkBoing', rain: 'wkRain', ring: 'wkRing' };
  function stepGame() {
    const acts = S.acts, hits = S.hits;
    Core.step(L, S);
    handle(S.ev);
    const z = Core.zones(L, S)[0], ph = z ? z.ph : 0;
    if (ph !== lastPh) { if (ph === 1) sfx('wkWarn'); if (ph === 2 && ATK[z.kind]) sfx(ATK[z.kind], 0, Math.max(-1, Math.min(1, ((z.x0 + z.x1) / 2 - 7) / 7)) * .5); lastPh = ph; }
    const W = S.w;
    if (W.m === 'walk' && W.mt % 17 === 1) sfx('wkStep', 0, (W.x - 7) / 14);
    if (W.m === 'climb' && W.mt % 18 === 1) sfx('wkClimb');
    if (W.m === 'push' && W.mt % 26 === 1) sfx('wkPush');
    if (S.acts !== acts || S.hits !== hits) { saveRun(); hudStars(); }
    if (++saveT >= 300) { saveT = 0; saveRun(); }
    if (S.done && !GS.resultsUp) results();
  }
  const FX = { pop: 'wkPop', throw: 'wkWhoosh', suck: 'wkSuck', sock: 'wkPlop', squeak: 'wkSqueak', giggle: 'wkGiggle', click: 'wkClick', clunk: 'wkClank', crash: 'wkCrash', bonk: 'wkThud', clank: 'wkClank', nom: 'wkNom', door: 'wkDoor', place: 'wkPlace', lever: 'wkLever', crashbelow: 'wkCrash', valve: 'wkValve', splashfuse: 'wkFizz', whirr: 'wkWhirr', cook: 'wkCook', sniff: 'wkSniff', sneeze: 'wkSneeze', buzz: 'wkNo', alarm: 'wkAlarm', curtain: 'wkWhoosh', pry: 'wkClick', pour: 'wkPour', bigbubble: 'wkBubble', zapself: 'wkZap', turn: 'wkClick', fish: 'wkPick', jam: 'wkCrash', flap: 'wkFlap', keydrop: 'wkTing', unlock: 'wkClick', freeze: 'wkFreeze', tick: 'wkTick', yawn: 'wkYawn', unwind: 'wkUnwind', roll: 'wkRoll', domino: 'wkDomino', button: 'wkClick' };
  let hitN = 0;
  function handle(evs) {
    for (const e of evs) {
      R.event(L, S, e); const a = e.a || {};
      switch (e.t) {
        case 'say': msg(a.who, a.text); if (a.who === 'k') sfx('wkKarel'); break;
        case 'take': sfx('wkPick'); hudInv(); break;
        case 'inv': hudInv(); break;
        case 'no': sfx('wkNo'); break;
        case 'bark': sfx('wkBark'); break;
        case 'hop': sfx('wkHop'); break;
        case 'reach': sfx('wkReach'); break;
        case 'push': sfx('wkPush'); break;
        case 'pushed': sfx('wkThud'); break;
        case 'hit': stats.hits++; sfx('wkDizzy'); vib(30); if (hitN++ % 2 === 0 && !msgBusy()) msg('k', TAUNT[(S.hits + S.t) % TAUNT.length]); break;
        case 'fx': if (FX[a.k]) sfx(FX[a.k]); if (a.k === 'beep') sfx('wkBeep', a.n); if (a.k === 'beep' || a.k === 'buzz') renderCu(); break;
        case 'cu': renderCu(); break;
        case 'stage': sfx('wkStage'); break;
        case 'break': sfx('wkRumble'); vib(40); hideCu(); sel = null; hudInv(); break;
        case 'boom': sfx('wkBreak'); vib(60); break;
        case 'cheer': sfx('wkWin'); break;
        case 'flee': sfx('wkFlee'); msg('k', L.lose, 'angry'); break;
        case 'cage': sfx('wkCage'); vib(40); msg('k', 'Hé! Mijn eigen kooi?! Laat me eruit!', 'angry'); break;
        case 'sorry': msg('k', L.lose, 'sulk'); break;
      }
    }
  }
  const vib = ms => { try { vibrate(ms); } catch (e) {} };

  /* ---------- commands from the touch input (the same path the tests use) ---------- */
  function doCmd(c) {
    if (!S || !L || S.done) return false;
    S.ev = []; const acts = S.acts, ok = Core.cmd(L, S, c); handle(S.ev); S.ev = [];
    if (S.acts !== acts) saveRun();
    if (!S.cu) hideCu(); else renderCu();
    hudInv(); kick(); return ok;
  }
  cv.addEventListener('pointerdown', e => {
    if (!GS || GS.view !== 'play' || !S || GS.intro || anyModal() || S.m.st !== 'ok') return;
    const r = stageEl.getBoundingClientRect(), [ux, uy] = R.toRoom(e.clientX - r.left, e.clientY - r.top);
    if (ux < -.3 || ux > 14.3 || uy < -.3 || uy > 9.3) { if (S.cu) doCmd({ t: 'cuX' }); return; }
    e.preventDefault(); Sfx.play('__warm');
    const item = sel; sel = null;
    doCmd({ t: 'tap', x: ux, y: uy, item });
    tapMark(e.clientX - r.left, e.clientY - r.top);
  });
  function tapMark(x, y) { const m = document.createElement('i'); m.className = 'wk-tap'; m.style.left = x + 'px'; m.style.top = y + 'px'; stageEl.appendChild(m); setTimeout(() => m.remove(), 450); }
  H.inv.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b || !S || GS.intro || S.m.st !== 'ok') return;
    const it = S.inv[+b.dataset.s]; if (!it) { if (sel) { sel = null; hudInv(); } return; }
    if (sel === it) { sel = null; sfx('wkSel'); }
    else if (sel) { const a = sel; sel = null; doCmd({ t: 'comb', a, b: it }); }
    else { sel = it; sfx('wkSel'); msg('w', `Waar wil je ${ITEMS[it]} gebruiken? Tik erop!`, 'o', 1); }
    hudInv(); draw(0);
  });
  H.bark.addEventListener('click', () => { if (!S || GS.intro || S.m.st !== 'ok') return; Sfx.play('__warm'); sel = null; hudInv(); doCmd({ t: 'bark' }); });
  H.hint.addEventListener('click', () => {
    if (!S || GS.intro || S.m.st !== 'ok') return;
    const h = Core.hint(L, S); stats.hints++; sfx('wkHint');
    msg('h', h.t, 'hint', 0, 1); hudStars(); saveRun(); hudInv(); kick(); draw(0);
  });

  /* ---------- HUD ---------- */
  function hudInv() {
    if (!S) return;
    const arrow = Core.arrow(L, S), pulse = arrow && arrow.startsWith('inv:') ? arrow.slice(4) : null;
    const k = S.inv.join(',') + '|' + sel + '|' + pulse;
    if (H.inv.dataset.k === k) return; H.inv.dataset.k = k;
    H.inv.innerHTML = [0, 1, 2].map(i => { const it = S.inv[i]; return `<button data-s="${i}" class="${it ? '' : 'empty'}${it && it === sel ? ' sel' : ''}${it && it === pulse ? ' pulse' : ''}" aria-label="${it ? esc(ITEMS[it]) : 'leeg'}">${it ? `<img src="${Art.icon(it)}" alt="">` : ''}</button>`; }).join('');
  }
  function hudStars() {
    if (!S) return;
    const k = Core.stars(S) + '|' + S.hints + '|' + S.hits; if (H.stars.dataset.k === k) return; H.stars.dataset.k = k;
    const a = S.hints <= 1, b = S.hits <= 2;
    H.stars.innerHTML = `<i class="on">★</i><i class="${a ? 'on' : ''}" title="hints">★</i><i class="${b ? 'on' : ''}" title="geraakt">★</i>`;
  }
  let msgT = 0, msgPri = 0;
  const msgBusy = () => msgPri > now();
  function msg(who, text, mood, quiet, pri) {
    if (!text) return;
    if (msgPri > now() && !pri && who !== 'h') { if (who === 'k') return; }
    const av = who === 'h' ? '<span class="wk-bulb">💡</span>' : `<img src="${Art.facePic(who === 'k' ? 'k' : 'w', who === 'k' ? (mood === 'sulk' ? 'sulk' : mood === 'angry' ? 'angry' : 'taunt') : 'o')}" alt="">`;
    H.msg.className = 'show ' + (who === 'k' ? 'k' : who === 'h' ? 'h' : 'w');
    H.msg.innerHTML = av + `<span>${esc(text)}</span>`;
    clearTimeout(msgT); msgT = setTimeout(() => { H.msg.classList.remove('show'); }, Math.min(7000, 2600 + text.length * 55) * (who === 'h' ? 1.5 : 1));
    if (pri || who === 'h') msgPri = now() + 2200;
  }
  function toast(t) { H.toast.textContent = t; H.toast.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => H.toast.classList.remove('show'), 2200); }

  /* ---------- close-ups: panels with big buttons, pictures to look at ---------- */
  function hideCu() { H.cu.classList.remove('show'); H.cu.dataset.id = ''; }
  function renderCu() {
    if (!S || !S.cu || !L.cu || !L.cu[S.cu]) { hideCu(); return; }
    const d = L.cu[S.cu](S);
    let h = `<div class="wk-cu-top"><b>${esc(d.title)}</b><button class="wk-cu-x" aria-label="Sluiten">✕</button></div>`;
    if (d.text) h += `<p>${esc(d.text)}</p>`;
    if (d.look) h += `<img class="wk-look" src="${Art.look(d.look, d.code || '')}" alt="">`;
    if (d.n) h += `<div class="wk-dots">${Array.from({ length: d.n }, (_, i) => `<i class="${i < (d.code || '').length ? 'on' : ''}"></i>`).join('')}</div>`;
    if (d.opts) h += `<div class="wk-opts${d.clock ? ' clock' : ''}">${d.opts.map((o, i) => `<button data-i="${i}" class="${d.sel === o.v ? 'sel' : ''}" style="${o.col ? `--c:${o.col}` : ''}"><b>${esc(o.lab)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('')}</div>`;
    H.cu.innerHTML = h; H.cu.dataset.id = S.cu; H.cu.classList.add('show');
  }
  H.cu.addEventListener('click', e => {
    if (!S) return;
    if (e.target.closest('.wk-cu-x')) { sfx('wkSel'); doCmd({ t: 'cuX' }); return; }
    const b = e.target.closest('[data-i]'); if (!b || !S.cu) return;
    const d = L.cu[S.cu](S), o = d.opts[+b.dataset.i]; if (!o) return;
    doCmd({ t: 'pick', id: S.cu, v: o.v });
  });

  /* ---------- starting a level ---------- */
  function startLevel(i, resume) {
    closeModals(); hideCu(); H.msg.classList.remove('show');
    L = Core.prep(LEVELS[i]); sel = null; lastPh = 0; hitN = 0;
    let fresh = true;
    if (resume && run && run.lv === i && run.S) { const S2 = JSON.parse(JSON.stringify(run.S)); if (Core.sanitize(L, S2)) { S = S2; fresh = false; } }
    if (fresh) S = Core.newState(i);
    GS = { view: 'play', lv: i, intro: fresh, resultsUp: false };
    R.setLevel(L); setView('play'); fit();
    H.title.innerHTML = `<b>${i + 1}. ${esc(L.n)}</b>`; H.bark.hidden = !L.bark; H.inv.dataset.k = ''; H.stars.dataset.k = '';
    hudInv(); hudStars();
    if (fresh) { stats.plays++; saveStats(); showIntro(); }
    else { msg('w', 'Daar ben ik weer! Waar was ik gebleven?'); }
    saveRun(); draw(0); kick();
  }
  function showIntro() {
    const tip = TIPS[GS.lv];
    H.intro.innerHTML = `<div class="wk-intro-card"><img src="${Art.fullPic('k', 'taunt')}" alt=""><div class="wk-bubble"><small>Karel</small>${L.intro.map(t => `<p>${esc(t)}</p>`).join('')}</div>
      <h3>${GS.lv + 1}. ${esc(L.n)}</h3>${tip ? `<div class="wk-tip">${esc(tip)}</div>` : ''}<button class="btn primary" id="wkGo">Aan de slag! ▶</button></div>`;
    H.intro.classList.add('show'); sfx('wkKarel');
  }
  function endIntro() { if (!GS || !GS.intro) return; GS.intro = false; H.intro.classList.remove('show'); sfx('wkOk'); kick(); if (GS.lv === 0) msg('w', 'Ik ben Woef! Ik ga die machine slim verslaan.'); }
  H.intro.addEventListener('click', e => { if (e.target.closest('#wkGo') || e.target === H.intro || e.target.closest('.wk-intro-card')) endIntro(); });

  /* ---------- the end of a level ---------- */
  function results() {
    GS.resultsUp = true; hideCu();
    const i = GS.lv, st = Core.stars(S), old = stats.lv[i] || {}, first = !old.s, before = starsTotal(), wOpen = WORLDS.map((_, w) => worldOpen(w));
    stats.lv[i] = { s: Math.max(old.s || 0, st), h: Math.min(old.h == null ? 99 : old.h, S.hints), k: Math.min(old.k == null ? 99 : old.k, S.hits) };
    stats.wins++; if (L.final) stats.caught = (stats.caught || 0) + 1;
    clearRun(); saveStats();
    const notes = []; WORLDS.forEach((W, w) => { if (!wOpen[w] && worldOpen(w)) notes.push(`${W.emo} Nieuwe wereld open: <b>${W.full}</b>!`); });
    if (i + 1 < NL && worldOf(i + 1) > worldOf(i) && !worldOpen(worldOf(i + 1))) notes.push(`🔒 Voor ${WORLDS[worldOf(i + 1)].full} heb je ${WORLDS[worldOf(i + 1)].need} ⭐ nodig. Je hebt er ${starsTotal()}.`);
    if (i === NL - 2 && first) notes.push('🏁 De grote finale is open!');
    const nextOpen = i + 1 < NL && levelOpen(i + 1);
    const crit = [['Machine verslagen', true], [`Weinig hints (${S.hints}× gebruikt, max 1)`, S.hints <= 1], [`Bijna niet geraakt (${S.hits}×, max 2)`, S.hits <= 2]];
    $('#wkEndPic').innerHTML = `<img src="${Art.fullPic('w', 'cheer')}" alt=""><div class="wk-bigstars">${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}" style="animation-delay:${.15 + k * .25}s">★</i>`).join('')}</div>`;
    $('#wkEndTitle').textContent = L.final ? 'Karel is gevangen!' : st === 3 ? 'Super gedaan!' : st === 2 ? 'Goed gedaan!' : 'Machine verslagen!';
    $('#wkEndText').innerHTML = (L.final ? `<p class="wk-endstory">Karel zit in zijn eigen kooi. Hij moppert nog even... en zegt dan sorry. Woef is de held van de stad!</p>` : '')
      + `<div class="wk-crit">${crit.map(([t, ok]) => `<div class="${ok ? 'ok' : ''}"><i>${ok ? '★' : '☆'}</i>${esc(t)}</div>`).join('')}</div>`
      + `<div class="wk-karel"><img src="${Art.facePic('k', L.final ? 'sulk' : 'angry')}" alt=""><span>${esc(L.lose)}</span></div>`
      + (notes.length ? `<div class="wk-notes">${notes.join('<br>')}</div>` : '');
    const btns = [['wkEMap', 'Kaart', 0], ['wkERetry', '↻ Opnieuw', 0]]; if (nextOpen) btns.push(['wkENext', 'Volgende ▶', 1]); else btns[0][2] = 1;
    $('#wkEndBtns').innerHTML = btns.map(([id, l, p]) => `<button class="btn${p ? ' primary' : ''}" id="${id}">${l}</button>`).join('');
    openModal('wkEndModal');
    for (let k = 1; k <= st; k++) setTimeout(() => sfx('wkStar', k), 250 + k * 250);
  }
  $('#wkEndModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('wkOk');
    if (b.id === 'wkENext') startLevel(GS.lv + 1); else if (b.id === 'wkERetry') startLevel(GS.lv); else if (b.id === 'wkEMap') openMap();
  });

  /* ---------- pause ---------- */
  const OPTS = { sound: 'Geluidseffecten', music: 'Achtergrondmuziek' };
  const optRows = keys => keys.map(k => `<div class="opt"><div class="opt-label">${OPTS[k]}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  function onOpt(e, again) { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = b.dataset.v === 'true'; saveOpt(); Sfx.refresh && Sfx.refresh(); sfx('wkSel'); again(); }
  function openPause() {
    if (!GS || GS.view !== 'play' || !S || GS.resultsUp) return;
    saveRun(); hideCu(); sfx('wkSel');
    $('#wkPInfo').innerHTML = `Level ${GS.lv + 1}: <b>${esc(L.n)}</b>`;
    $('#wkPOpts').innerHTML = optRows(['sound', 'music']);
    if (!$('#wkPauseModal').classList.contains('show')) closeModals();
    openModal('wkPauseModal');
  }
  $('#wkPause').addEventListener('click', e => { e.stopPropagation(); openPause(); });
  $('#wkPResume').addEventListener('click', () => { closeModals(); kick(); });
  $('#wkPRestart').addEventListener('click', () => { clearRun(); startLevel(GS.lv); });
  $('#wkPMap').addEventListener('click', () => { saveRun(); openMap(); });
  $('#wkPQuit').addEventListener('click', () => { saveRun(); openStart(); });
  $('#wkPOpts').addEventListener('click', e => onOpt(e, openPause));

  /* ---------- the level map ---------- */
  function setView(v) {
    if (GS) GS.view = v;
    scr.classList.toggle('play', v === 'play'); scr.classList.toggle('map', v === 'map');
    Sfx.track('wk', v === 'play' ? 'wk' : 'wkm');
  }
  function openMap() {
    closeModals(); hideCu(); H.msg.classList.remove('show'); H.intro.classList.remove('show');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    GS = { view: 'map' }; S = null; L = null;
    setView('map'); renderMap();
  }
  function renderMap() {
    const w = Math.min(opt.world || 0, WORLDS.length - 1), W = WORLDS[w], st = starsTotal();
    $('#wkMapSum').textContent = `⭐ ${st}/${NL * 3}`;
    $('#wkWorlds').innerHTML = WORLDS.map((X, k) => `<button data-w="${k}" class="${k === w ? 'on' : ''}${worldOpen(k) ? '' : ' lock'}">${X.emo} <span>${X.nm}</span>${worldOpen(k) ? '' : ' 🔒'}</button>`).join('');
    const box = $('#wkMapBox'); box.style.setProperty('--c1', W.col[0]); box.style.setProperty('--c2', W.col[1]);
    if (!worldOpen(w)) {
      const needLv = !doneLv(w * PER - 1), needSt = Math.max(0, W.need - st);
      box.innerHTML = `<div class="wk-wlock"><b>${W.emo} ${W.full}</b>${needLv ? `Versla eerst machine ${w * PER} in ${WORLDS[w - 1].full}.<br>` : ''}${needSt ? `Je hebt nog <b>${needSt}</b> ⭐ nodig. Haal meer sterren: gebruik weinig hints en laat je niet raken!` : ''}</div>`;
      return;
    }
    const lv = worldLevels(w), n = lv.length, pts = lv.map((_, k) => [8 + k * 84 / (n - 1), k % 2 ? 66 : 32]);
    let next = -1; for (const i of lv) if (levelOpen(i) && !doneLv(i)) { next = i; break; }
    box.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.2" stroke-dasharray="1 3.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`
      + lv.map((i, k) => { const r = stats.lv[i] || {}, open = levelOpen(i); return `<button class="wk-node${open ? '' : ' lock'}${i === next ? ' next' : ''}${LEVELS[i].final ? ' final' : ''}" data-i="${i}" style="left:${pts[k][0]}%;top:${pts[k][1]}%"><span class="wk-th"><img src="${Art.thumb(i)}" alt="">${open ? '' : '<em>🔒</em>'}</span><b>${LEVELS[i].final ? '🏁' : i + 1}</b><small>${esc(LEVELS[i].n.replace(/^(De|Het) /, ''))}</small><i>${[1, 2, 3].map(s => `<u class="${(r.s || 0) >= s ? 'on' : ''}">★</u>`).join('')}</i></button>`; }).join('');
  }
  $('#wkWorlds').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; opt.world = +b.dataset.w; saveOpt(); sfx('wkSel'); renderMap(); });
  $('#wkMapBox').addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i;
    if (!levelOpen(i)) { sfx('wkNo'); toast(i === NL - 1 ? 'Versla eerst alle andere machines.' : `Versla eerst machine ${i}.`); return; }
    sfx('wkOk'); if (run && run.lv === i) startLevel(i, true); else { clearRun(); startLevel(i); }
  });
  $('#wkMapBack').addEventListener('click', () => { sfx('wkSel'); openStart(); });

  /* ---------- the start dialog ---------- */
  function renderStart() {
    $('#wkContinue').hidden = !run;
    if (run && LEVELS[run.lv]) $('#wkContinue').innerHTML = `<img src="${Art.thumb(run.lv)}" alt=""><span><b>Verder met machine ${run.lv + 1}</b><small>${esc(LEVELS[run.lv].n)}</small></span><em>▶</em>`;
    $('#wkHero').innerHTML = `<img src="${Art.fullPic('w', 'o')}" alt=""><b>tegen</b><img src="${Art.fullPic('k', 'taunt')}" alt="">`;
    $('#wkOpts').innerHTML = optRows(['sound', 'music']);
    const beaten = Object.values(stats.lv).filter(r => r.s).length;
    $('#wkStats').innerHTML = [['Machines', `${beaten}/${NL}`], ['Sterren', `${starsTotal()}/${NL * 3}`], ['Karel', stats.caught ? 'gevangen!' : 'nog vrij']].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
  }
  function openStart() {
    closeModals(); hideCu(); H.msg.classList.remove('show'); H.intro.classList.remove('show');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    GS = { view: 'start' }; S = null; L = null; R.setLevel(null);
    setView('start'); renderStart(); openModal('wkStartModal'); drawBack();
  }
  function drawBack() { const c2 = cv.getContext('2d'); fit(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.fillStyle = '#3b2418'; c2.fillRect(0, 0, cv.width, cv.height); }
  $('#wkContinue').addEventListener('click', () => { if (!run) return; sfx('wkOk'); startLevel(run.lv, true); });
  $('#wkPlay').addEventListener('click', () => { sfx('wkOk'); if (run && run.lv != null) opt.world = worldOf(run.lv); else { let w = 0; for (let k = 0; k < WORLDS.length; k++) if (worldOpen(k)) w = k; opt.world = w; } openMap(); });
  $('#wkOpts').addEventListener('click', e => onOpt(e, renderStart));
  $('#wkStartBack').addEventListener('click', () => { closeModals(); quit(); });

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('wk'); requestAnimationFrame(() => fit());
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { setView('play'); fit(); draw(0); openPause(); return; }
    openStart();
  }
  function quit() { if (raf) cancelAnimationFrame(raf); raf = 0; saveRun(); closeModals(); hideCu(); GS = null; S = null; L = null; scr.classList.remove('play', 'map'); show('menu'); refreshMenu(); }
  // back: while playing it pauses; on the map it goes to the start dialog; after the results to the map
  function leave() {
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { if (S.cu) { doCmd({ t: 'cuX' }); return; } setTimeout(() => { if (current === 'wk' && !anyModal()) openPause(); }, 0); return; }
    if (GS && GS.view === 'map') { setTimeout(() => { if (current === 'wk') openStart(); }, 0); return; }
    if (GS && GS.view === 'play' && GS.resultsUp) { setTimeout(() => { if (current === 'wk') openMap(); }, 0); return; }
    quit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'wk' && GS && GS.view === 'play' && S && !GS.resultsUp) { saveRun(); if (!anyModal() && !GS.intro) openPause(); } });

  /* ---------- test hooks ---------- */
  window.__wk = {
    get S() { return S; }, get L() { return L; }, get G() { return GS; }, get sel() { return sel; }, R, Core, LEVELS, opt, stats: () => stats, run: () => run,
    frames: () => frames.slice(), running: () => raf > 0, startLevel, openMap, openStart, openPause, quit, endIntro, cur: () => current, doCmd,
    step(n) { for (let i = 0; i < n && S && !S.done; i++) stepGame(); draw(0); }, manual(v) { if (GS) GS.manual = !!v; if (!v) kick(); },
    finite: () => [acc, lastT].every(Number.isFinite) && (!S || Core.finite(S)),
    screenOf(id) { if (!L || !S) return null; const d = L._od[id], o = S.o[id]; if (!d || o.hide) return null; const r = stageEl.getBoundingClientRect(), [x, y] = R.toScreen(o.x, o.y - d.h / 2); return { x: r.left + x, y: r.top + y }; },
    pointFor(id) {                                             // a screen point where a tap really lands on this object
      if (!L || !S) return null; const d = L._od[id], o = S.o[id]; if (!d || o.hide) return null;
      const r = stageEl.getBoundingClientRect();
      for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) { const ux = o.x + (i - 3) / 7 * d.w, uy = o.y - d.h / 2 + (j - 3) / 7 * d.h; if (Core.pick(L, S, ux, uy) === id) { const [x, y] = R.toScreen(ux, uy); return { x: r.left + x, y: r.top + y }; } }
      const [x, y] = R.toScreen(o.x, o.y - d.h / 2); return { x: r.left + x, y: r.top + y };
    },
    screenAt(ux, uy) { const r = stageEl.getBoundingClientRect(), [x, y] = R.toScreen(ux, uy); return { x: r.left + x, y: r.top + y }; },
    quality: () => quality,
  };
  return { enter, leave, hasSave: () => !!store.get('wk.save', null) };

})();
$('#tileWk').addEventListener('click', () => WoefKarel.enter());
