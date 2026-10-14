/* ================================================================
   VUISTDUEL – an original 2D one-on-one fighting game: eight fighters, specials and supers, arcade ladder with a
   boss, versus on one phone, versus the computer and training. Cartoon fun: hits make stars, nobody gets hurt.
   ================================================================ */
const Vuistduel = (() => {
  /* ================= data.js: the cast, their moves (frame data) and the stages =================
     Units: the world is 1200 wide, y goes up from the floor, a standard fighter is ~185 tall.
     Boxes are [x0, y0, x1, y1] relative to the fighter's feet, x pointing towards where the fighter faces.
     Frame data is in 60 Hz frames. lv: 'h' = blockable standing or crouching, 'l' = low (block crouching),
     'o' = overhead (block standing). Every name, move and line of text here is original. */
  const BASE_NORMALS = {
    sLP: { s: 4, a: 3, r: 7, d: 30, hs: 13, bs: 10, b: [16, 120, 62, 140], lv: 'h', cn: 'c', ch: 1, st: 7, pu: 6, nm: 'Stoot' },
    sHP: { s: 7, a: 4, r: 17, d: 80, hs: 20, bs: 15, b: [16, 112, 80, 142], lv: 'h', cn: 's', st: 11, pu: 9, nm: 'Zware stoot' },
    sLK: { s: 5, a: 3, r: 9, d: 34, hs: 13, bs: 10, b: [14, 40, 76, 72], lv: 'h', cn: 'c', ch: 1, st: 7, pu: 6, nm: 'Trap' },
    sHK: { s: 9, a: 4, r: 19, d: 88, hs: 20, bs: 15, b: [18, 96, 98, 130], lv: 'h', cn: 0, st: 12, pu: 10, nm: 'Zware trap' },
    cLP: { s: 4, a: 2, r: 7, d: 24, hs: 12, bs: 9, b: [16, 64, 64, 86], lv: 'h', cn: 'c', ch: 1, st: 7, pu: 6, nm: 'Gehurkte stoot' },
    cHP: { s: 6, a: 5, r: 19, d: 76, hs: 20, bs: 14, b: [6, 84, 52, 178], lv: 'h', cn: 's', st: 11, pu: 8, aa: 1, nm: 'Opstoot' },
    cLK: { s: 4, a: 3, r: 8, d: 24, hs: 12, bs: 9, b: [12, 0, 72, 24], lv: 'l', cn: 'c', ch: 1, st: 7, pu: 6, nm: 'Lage trap' },
    cHK: { s: 8, a: 4, r: 23, d: 72, hs: 0, bs: 14, b: [12, 0, 102, 24], lv: 'l', cn: 0, kd: 1, st: 11, pu: 8, la: [3, 7], nm: 'Veegtrap' },
    jLP: { s: 4, a: 9, d: 32, hs: 13, bs: 10, b: [10, 58, 58, 86], lv: 'o', st: 8, pu: 5, air: 1, nm: 'Sprongstoot' },
    jHP: { s: 6, a: 6, d: 80, hs: 19, bs: 14, b: [12, 30, 70, 76], lv: 'o', st: 11, pu: 7, air: 1, nm: 'Zware sprongstoot' },
    jLK: { s: 4, a: 10, d: 36, hs: 13, bs: 10, b: [6, 8, 60, 48], lv: 'o', st: 8, pu: 5, air: 1, nm: 'Sprongtrap' },
    jHK: { s: 7, a: 6, d: 84, hs: 19, bs: 14, b: [12, 0, 84, 40], lv: 'o', st: 11, pu: 7, air: 1, nm: 'Zware sprongtrap' },
  };
  // helpers to write moves compactly
  const HIT = (f, n, b, d, o = {}) => Object.assign({ f, n, b, d, hs: 20, bs: 14, lv: 'h', st: 10, pu: 8, ch: .25 }, o);
  const MULTI = (frames, n, b, d, last, o = {}) => frames.map((f, i) => HIT(f, n, b, i === frames.length - 1 ? last.d : d,
    i === frames.length - 1 ? Object.assign({ hs: 26, st: 12, pu: 9 }, o, last) : Object.assign({ hs: 26, bs: 12, st: 6, pu: 1.6 }, o)));

  const CAST = [
    { id: 'dex', nm: 'Dex', full: 'Dex Havenga', style: 'Kickboksen', from: 'Rotterdam', stage: 'haven',
      bio: 'Kickbokskampioen uit Rotterdam-Zuid. Traint elke ochtend op de kade, tussen de containers en de meeuwen.',
      intro: 'Kom maar op, ik heb de hele dag!', quote: 'Geen woorden, maar daden!',
      hp: 1000, walkF: 3.1, walkB: 2.5, jvx: 4.3, jvy: 15.5, W: 1, H: 1, pow: .9, reach: 1, spd: 0, stat: [4, 4, 4],
      sp: [
        { id: 'golf', nm: 'Golfslag', in: 'qcf', b: 'K', role: 'proj', desc: 'trapt een golf water weg',
          mk: h => ({ tot: 46, pj: { f: 13, k: 'golf', x: 58, y: 50, vx: h ? 7.4 : 5.6, w: 24, h: 26, d: 70, hs: 18, bs: 14, life: 150, st: 10 }, cn: 'u', an: 'pjK' }) },
        { id: 'kraan', nm: 'Kraanknie', in: 'dp', b: 'K', role: 'aa', desc: 'springende knie, goed tegen springers',
          mk: h => ({ air: 1, lr: 17, inv: [1, h ? 7 : 5], tinv: [1, 10], vel: [[3, 3, h ? 2.4 : 1.6, h ? 13.5 : 11.5]],
            hits: [HIT(3, 3, [10, 70, 62, 150], h ? 55 : 45, { hs: 22, st: 8, pu: 2, jg: 1, la: [1, 9] }), HIT(6, 8, [4, 90, 58, 196], h ? 60 : 50, { kd: 1, jg: 1, st: 11, la: [3, 10] })], an: 'riseK' }) },
        { id: 'stoom', nm: 'Stoomboot', in: 'qcb', b: 'P', role: 'rush', desc: 'stormt naar voren met een vuist',
          mk: h => ({ tot: 42, vel: [[7, 20, h ? 10 : 8, null]], hits: [HIT(9, 11, [10, 92, 70, 142], h ? 95 : 80, { kd: 1, la: [5, 8], st: 12, pu: 10, bs: 16 })], cn: 'u', an: 'rushP' }) },
      ],
      su: { id: 'storm', nm: 'Storm op de Maas', in: 'qcf2', b: 'P', role: 'rush', desc: 'een wervelstorm van trappen',
        mk: () => ({ cost: 100, fl: 40, tot: 74, inv: [1, 12], vel: [[1, 12, 10.5, null], [13, 50, 1.4, null]],
          hits: [HIT(3, 10, [8, 60, 72, 150], 50, { hs: 30, bs: 18, st: 6, pu: 1 }), ...MULTI([17, 24, 31, 38, 46], 3, [8, 50, 80, 160], 40, { d: 75, kd: 1, la: [6, 11] })], an: 'suDex' }) },
      easy: { n: 'golf', f: 'stoom', d: 'kraan' } },

    { id: 'truus', nm: 'Oma Truus', full: 'Oma Truus', style: 'Judo', from: 'Kinderdijk', stage: 'polder',
      bio: 'Zwarte band sinds 1972. Bakt de lekkerste stroopwafels van de polder én gooit je zo over haar heup.',
      intro: 'Kom maar hier, lieverd.', quote: 'Zo. En nu een kopje thee.',
      hp: 1050, walkF: 2.8, walkB: 2.2, jvx: 3.8, jvy: 14.5, W: .95, H: .84, pow: 1.08, reach: .95, spd: 0, stat: [4, 3, 3],
      nov: { cHK: { x: 14 }, sHP: { s: 5 } },
      sp: [
        { id: 'waf', nm: 'Stroopwafelworp', in: 'qcf', b: 'P', role: 'proj', desc: 'gooit een stroopwafel in een boog',
          mk: h => ({ tot: 44, pj: { f: 12, k: 'waf', x: 40, y: 96, vx: h ? 6.2 : 4.4, vy: h ? 6 : 7.5, g: .32, w: 18, h: 14, d: 65, hs: 18, bs: 14, life: 140 }, cn: 'u', an: 'pjP' }) },
        { id: 'heup', nm: 'Heupworp', in: 'qcb', b: 'P', role: 'grab', desc: 'pakt je dichtbij vast en gooit je over de heup',
          mk: h => ({ tot: 36, gr: { f: 3, rng: h ? 58 : 80, d: h ? 160 : 135, n: 36 }, an: 'grab' }) },
        { id: 'tegen', nm: 'Tegenzet', in: 'qcb', b: 'K', role: 'counter', desc: 'vangt een stoot of trap op en gooit terug',
          mk: h => ({ tot: h ? 44 : 38, ct: { f0: 2, f1: h ? 20 : 14, d: h ? 130 : 110 }, an: 'counter' }) },
      ],
      su: { id: 'zwier', nm: 'Zondagse Zwier', in: 'qcf2', b: 'P', role: 'grab', desc: 'een draaiende superworp van dichtbij',
        mk: () => ({ cost: 100, fl: 36, tot: 52, gr: { f: 3, rng: 105, d: 300, n: 64, su: 1 }, inv: [1, 4], an: 'grab' }) },
      easy: { n: 'waf', f: 'heup', d: 'tegen' } },

    { id: 'moer', nm: 'Moer', full: 'MR-8 Moer', style: 'Robotica', from: 'Eindhoven', stage: 'ruimte',
      bio: 'Gebouwd in een Eindhovens lab om fietsen te repareren. Vond vechten uiteindelijk toch leuker.',
      intro: 'Systemen online. Bliep.', quote: 'Missie voltooid. Bliep bloep!',
      hp: 1050, walkF: 2.7, walkB: 2.3, jvx: 4.0, jvy: 15, W: 1.05, H: 1.03, pow: 1, reach: 1.08, spd: 1, stat: [4, 3, 5], charge: 1,
      sp: [
        { id: 'vuist', nm: 'Raketvuist', in: 'cb', b: 'P', role: 'proj', desc: 'schiet zijn vuist weg als een raket',
          mk: h => ({ tot: 40, pj: { f: 11, k: 'vuist', x: 60, y: 118, vx: h ? 10 : 8, w: 26, h: 16, d: 75, hs: 18, bs: 14, life: 120 }, cn: 'u', an: 'pjFist' }) },
        { id: 'veer', nm: 'Springveer', in: 'cd', b: 'K', role: 'aa', desc: 'springt omhoog op een veer, goed tegen springers',
          mk: h => ({ air: 1, lr: 18, inv: [1, 9], tinv: [1, 10], vel: [[4, 4, 1.4, h ? 13.5 : 12]],
            hits: [HIT(4, 10, [0, 60, 60, 200], h ? 110 : 95, { kd: 1, jg: 1, la: [3, 10], st: 12, hs: 24, bs: 16 })], an: 'riseK' }) },
        { id: 'wiel', nm: 'Glijwiel', in: 'cb', b: 'K', role: 'rush', desc: 'glijdt laag over de grond (laag blokken)',
          mk: h => ({ tot: 46, lo: [6, 30], vel: [[7, 26, h ? 9.5 : 8, null]], hits: [HIT(8, 16, [10, 0, 76, 40], h ? 90 : 80, { lv: 'l', kd: 1, st: 11, la: [3, 6] })], cn: 'u', an: 'slide' }) },
      ],
      su: { id: 'laser', nm: 'Overdrive-laser', in: 'qcf2', b: 'P', role: 'proj', desc: 'een enorme laserstraal',
        mk: () => ({ cost: 100, fl: 40, tot: 56, pj: { f: 6, k: 'laser', x: 70, y: 112, vx: 13, w: 52, h: 34, d: 52, hits: 6, gap: 5, hs: 24, bs: 12, ch: .3, life: 80, st: 6, kd: 1 }, an: 'pjFist' }) },
      easy: { n: 'vuist', f: 'wiel', d: 'veer' } },

    { id: 'sol', nm: 'Sol', full: 'Sol Vidal', style: 'Capoeira', from: 'Amsterdam', stage: 'gracht',
      bio: 'Danst capoeira langs de grachten. Niemand weet ooit waar haar volgende trap vandaan komt.',
      intro: 'Zullen we dansen?', quote: 'Voel je het ritme?',
      hp: 950, walkF: 3.3, walkB: 2.8, jvx: 4.6, jvy: 15.5, W: .95, H: .98, pow: .97, reach: 1.12, spd: 0, stat: [3, 5, 4],
      sp: [
        { id: 'molen', nm: 'Molenwiek', in: 'qcb', b: 'K', role: 'rush', desc: 'draait als een molen naar voren',
          mk: h => ({ tot: 48, vel: [[6, 34, h ? 5.2 : 4, null]], hits: MULTI([8, 15, 22, 29], 3, [0, 40, 80, 122], h ? 32 : 27, { d: h ? 40 : 34, kd: 1, la: [4, 8] }), cn: 'u', an: 'spin' }) },
        { id: 'zon', nm: 'Zonnewiel', in: 'qcf', b: 'K', role: 'hop', desc: 'radslag met een trap van boven (staand blokken)',
          mk: h => ({ air: 1, lr: 10, vel: [[5, 5, h ? 6 : 4.8, 11.5]], hits: [HIT(16, 18, [-10, 0, 62, 62], h ? 85 : 75, { lv: 'o', st: 11, hs: 19, bs: 14 })], an: 'wheel' }) },
        { id: 'maan', nm: 'Maanboog', in: 'dp', b: 'K', role: 'aa', desc: 'salto met een trap omhoog',
          mk: h => ({ air: 1, lr: 18, inv: [1, h ? 8 : 6], tinv: [1, 10], vel: [[4, 4, .4, h ? 14 : 12]], hits: [HIT(4, 9, [0, 70, 64, 200], h ? 110 : 95, { kd: 1, jg: 1, la: [3, 10], st: 12 })], an: 'flip' }) },
      ],
      su: { id: 'carnaval', nm: 'Carnavalswervel', in: 'qcf2', b: 'K', role: 'rush', desc: 'een eindeloze draaidans vol trappen',
        mk: () => ({ cost: 100, fl: 40, tot: 80, inv: [1, 10], vel: [[1, 60, 4.6, null]], hits: MULTI([4, 11, 18, 25, 32, 39, 46, 54], 3, [0, 30, 86, 150], 34, { d: 66, kd: 1, la: [6, 11] }), an: 'spin' }) },
      easy: { n: 'zon', f: 'molen', d: 'maan' } },

    { id: 'bram', nm: 'Bram', full: 'Bram de Berg', style: 'Sumo', from: 'Scheveningen', stage: 'strand',
      bio: 'Ging naar Japan voor de sushi en kwam terug als sumokampioen. Eet zes ontbijtjes per dag.',
      intro: 'Ik sta hier als een berg.', quote: 'Tijd voor een haring!',
      hp: 1200, walkF: 2.3, walkB: 2.0, jvx: 3.6, jvy: 13.8, W: 1.4, H: 1.0, pow: 1.15, reach: .98, spd: 1, stat: [5, 2, 3],
      sp: [
        { id: 'klap', nm: 'Klapperregen', in: 'qcf', b: 'P', role: 'poke', desc: 'een regen van handpalmen',
          mk: h => ({ tot: 40, vel: [[5, 26, 1, null]], hits: MULTI(h ? [6, 10, 14, 18, 22] : [6, 11, 16, 21], 2, [10, 92, 88, 152], 22, { d: 30 }, { hs: 18 }), cn: 'u', an: 'slaps' }) },
        { id: 'buik', nm: 'Buikbots', in: 'qcb', b: 'P', role: 'rush', desc: 'duikt met zijn buik vooruit',
          mk: h => ({ tot: 48, vel: [[11, 28, h ? 10 : 8.5, null]], hits: [HIT(12, 16, [0, 40, 82, 132], h ? 115 : 100, { kd: 1, la: [5, 7], st: 12, pu: 10, bs: 16 })], an: 'belly' }) },
        { id: 'zout', nm: 'Zoutworp', in: 'qcf', b: 'K', role: 'proj', desc: 'gooit een wolk zout (korte afstand)',
          mk: h => ({ tot: 36, pj: { f: 10, k: 'zout', x: 54, y: 118, vx: h ? 8 : 6.5, w: 30, h: 30, d: 55, hs: 22, bs: 14, life: h ? 30 : 24 }, cn: 'u', an: 'pjP' }) },
      ],
      su: { id: 'berg', nm: 'Bergstorting', in: 'qcf2', b: 'P', role: 'rush', desc: 'rolt als een lawine over je heen',
        mk: () => ({ cost: 100, fl: 40, tot: 70, inv: [1, 8], vel: [[2, 34, 7, null]], hits: MULTI([6, 12, 18, 24, 31], 4, [0, 30, 92, 160], 45, { d: 110, kd: 1, la: [6, 10] }), an: 'belly' }) },
      easy: { n: 'zout', f: 'buik', d: 'klap' } },

    { id: 'kiki', nm: 'Kiki', full: 'Kiki Schaduw', style: 'Ninjutsu', from: 'Maastricht', stage: 'tempel',
      bio: 'Ninja in opleiding uit Maastricht. Zo snel dat haar sjaal nog wappert als zij allang weg is.',
      intro: 'Sssst...', quote: 'Je zag me niet eens!',
      hp: 1000, walkF: 3.6, walkB: 3.0, jvx: 4.8, jvy: 16, W: .9, H: .92, pow: 1, reach: 1, spd: -1, stat: [2, 5, 4],
      nov: { sHK: { s: 7 }, cHK: { x: 10 } },
      sp: [
        { id: 'ster', nm: 'Sterrenregen', in: 'qcf', b: 'P', role: 'proj', desc: 'gooit een snelle werpster',
          mk: h => ({ tot: 32, pj: { f: 9, k: 'ster', x: 50, y: 120, vx: h ? 11 : 9, w: 14, h: 14, d: 45, hs: 16, bs: 12, life: 100 }, cn: 'u', an: 'pjThrow' }) },
        { id: 'rook', nm: 'Rookwolk', in: 'qcb', b: 'P', role: 'tele', desc: 'verdwijnt en duikt voor (licht) of achter (zwaar) je op',
          mk: h => ({ tot: 34, inv: [1, 18], thru: [1, 18], hid: [6, 16], tp: { f: 12, mode: h ? 'behind' : 'front' }, an: 'tele' }) },
        { id: 'duik', nm: 'Zwaluwduik', in: 'qcf', b: 'K', role: 'hop', desc: 'springt op en duikt met een trap (staand blokken)',
          mk: h => ({ air: 1, lr: 8, vel: [[3, 3, h ? 3 : 2.4, 10], [12, 12, h ? 9 : 7.5, -7]], hits: [HIT(12, 30, [0, -10, 60, 42], h ? 75 : 65, { lv: 'o', st: 10, hs: 19, bs: 13 })], an: 'dive' }) },
      ],
      su: { id: 'schaduw', nm: 'Duizend Schaduwen', in: 'qcf2', b: 'P', role: 'rush', desc: 'flitst dwars door je heen',
        mk: () => ({ cost: 100, fl: 40, tot: 62, inv: [1, 40], thru: [1, 40], vel: [[2, 22, 13, null], [23, 62, 0, null]], hits: MULTI([4, 7, 10, 13, 16, 19, 22], 2, [-40, 20, 70, 160], 36, { d: 70, kd: 1, la: [-5, 10] }), an: 'dash' }) },
      easy: { n: 'ster', f: 'rook', d: 'duik' } },

    { id: 'sjaak', nm: 'Sjaak', full: 'Sterke Sjaak', style: 'Krachtsport', from: 'Tilburg', stage: 'kermis',
      bio: 'De sterkste man van de Tilburgse kermis. Tilt een draaimolen op met één hand, en zwaait dan naar het publiek.',
      intro: 'Dames en heren...!', quote: 'Applaus voor de sterkste man!',
      hp: 1100, walkF: 2.5, walkB: 2.1, jvx: 3.8, jvy: 14, W: 1.25, H: 1.08, pow: 1.1, reach: 1.04, spd: 1, stat: [5, 2, 3],
      sp: [
        { id: 'grond', nm: 'Grondklap', in: 'qcf', b: 'P', role: 'proj', desc: 'slaat op de grond: een schokgolf (laag blokken)',
          mk: h => ({ tot: 50, pj: { f: 16, k: 'klap', x: 60, y: 0, vx: h ? 7 : 5.5, w: 30, h: 24, d: 80, lv: 'l', hs: 20, bs: 14, life: 70 }, cn: 'u', an: 'pound' }) },
        { id: 'molen', nm: 'Molenarm', in: 'qcb', b: 'P', role: 'rush', desc: 'een gepantserde armzwaai (houdt één klap tegen)',
          mk: h => ({ tot: 52, arm: [4, 22, 1], vel: [[10, 26, h ? 7 : 5.5, null]], hits: [HIT(12, 12, [0, 100, 92, 162], h ? 120 : 105, { kd: 1, la: [5, 9], st: 13, pu: 10, bs: 18 })], an: 'lariat' }) },
        { id: 'hef', nm: 'Gewichtheffer', in: 'dp', b: 'P', role: 'aa', desc: 'vangt springers uit de lucht',
          mk: h => ({ tot: 40, inv: [1, 6], gr: { f: 5, air: 1, b: [0, 70, h ? 100 : 86, 250], d: h ? 150 : 130, n: 40 }, an: 'catch' }) },
      ],
      su: { id: 'finale', nm: 'Circusfinale', in: 'qcf2', b: 'P', role: 'rush', desc: 'gepantserde stormloop met een daverende slotklap',
        mk: () => ({ cost: 100, fl: 40, tot: 70, arm: [1, 30, 2], vel: [[2, 22, 6.5, null]], hits: MULTI([6, 13, 20, 27, 34], 4, [0, 60, 92, 170], 50, { d: 120, kd: 1, la: [6, 11] }), an: 'lariat' }) },
      easy: { n: 'grond', f: 'molen', d: 'hef' } },

    { id: 'nevel', nm: 'Graaf Nevel', full: 'Graaf Nevel', style: 'Schaduwkunst', from: 'Onbekend', stage: 'dak', boss: 1,
      bio: 'Niemand weet wie er achter het masker zit. Hij verschijnt alleen voor de allerbeste vechters.',
      intro: 'Eindelijk... een uitdaging.', quote: 'Het toernooi is van mij.',
      hp: 960, walkF: 2.9, walkB: 2.5, jvx: 4.3, jvy: 15, W: 1, H: 1.05, pow: 1, reach: 1.02, spd: 0, stat: [4, 4, 5],
      sp: [
        { id: 'bol', nm: 'Nevelbol', in: 'qcf', b: 'P', role: 'proj', desc: 'een trage bol paarse mist',
          mk: h => ({ tot: 50, pj: { f: 15, k: 'nevel', x: 56, y: 100, vx: h ? 6 : 4.5, w: 30, h: 30, d: 62, hs: 20, bs: 15, life: 180 }, cn: 'u', an: 'pjP' }) },
        { id: 'spiegel', nm: 'Spiegeltruc', in: 'qcb', b: 'K', role: 'tele', desc: 'verdwijnt en verschijnt voor (licht) of achter (zwaar) je',
          mk: h => ({ tot: 32, inv: [1, 18], thru: [1, 18], hid: [6, 16], tp: { f: 12, mode: h ? 'behind' : 'front' }, an: 'tele' }) },
        { id: 'sikkel', nm: 'Maansikkel', in: 'dp', b: 'K', role: 'aa', desc: 'een sikkeltrap omhoog',
          mk: h => ({ air: 1, lr: 18, inv: [1, 8], tinv: [1, 10], vel: [[3, 3, 1.5, h ? 13.5 : 12]], hits: [HIT(4, 10, [0, 60, 70, 200], h ? 96 : 86, { kd: 1, jg: 1, la: [3, 10], st: 12 })], an: 'flip' }) },
      ],
      su: { id: 'eclips', nm: 'Totale Eclips', in: 'qcf2', b: 'P', role: 'rush', desc: 'de wereld wordt donker...',
        mk: () => ({ cost: 100, fl: 44, tot: 66, inv: [1, 14], thru: [1, 12], hid: [2, 9], tp: { f: 8, mode: 'front' }, vel: [[10, 40, 2, null]],
          hits: MULTI([12, 18, 24, 30, 37], 4, [0, 40, 90, 170], 45, { d: 110, kd: 1, la: [6, 11] }), an: 'suDex' }) },
      easy: { n: 'bol', f: 'spiegel', d: 'sikkel' } },
  ];
  const CAST_BY = {}; CAST.forEach((c, i) => { c.ix = i; CAST_BY[c.id] = c; });

  const STAGES = [
    { id: 'haven', nm: 'Rotterdamse haven' }, { id: 'gracht', nm: 'Amsterdamse gracht' }, { id: 'polder', nm: 'Molen in de polder' },
    { id: 'tempel', nm: 'Bergtempel' }, { id: 'ruimte', nm: 'Ruimtestation' }, { id: 'kermis', nm: 'Kermis' },
    { id: 'strand', nm: 'Strand van Scheveningen' }, { id: 'dak', nm: 'Dak van de flat' },
  ];
  const INPUT_TXT = { qcf: '↓↘→', qcb: '↓↙←', dp: '→↓↘', cb: '← (vasthouden) →', cd: '↓ (vasthouden) ↑', qcf2: '↓↘→↓↘→' };

  /* ================= core.js: the deterministic 60 Hz fight simulation (no DOM, no randomness) =================
     step(M, [in0, in1]) advances one frame. Inputs are bit masks with ABSOLUTE directions; the core turns them into
     directions relative to the fighter (numpad notation: 6 = forward, 4 = back, 2 = down, 8 = up). Every press goes into
     a 64-frame history that the motion detector and the 7-frame input buffer read. */
  const Core = (() => {
    const SW = 1200, WALL = 34, MAXSEP = 540, GRAV = .78, BUF = 7, TIMER = 60 * 60;
    const U = 1, D = 2, L = 4, R = 8, LP = 16, HP = 32, LK = 64, HK = 128, SP = 256, SU = 512, BTN = LP | HP | LK | HK;
    const DB = (...ds) => ds.reduce((a, d) => a | (1 << d), 0);
    const BACKS = DB(1, 4, 7), DOWNS = DB(1, 2, 3), UPS = DB(7, 8, 9), FWDS = DB(3, 6, 9);
    const LIGHT = { sLP: 1, sLK: 1, cLP: 1, cLK: 1 };

    /* ---------- moves: normals generated from the base table, specials in two strengths, the super, the throw ---------- */
    function prep(C) {
      if (C.mv) return C;
      const mv = C.mv = {}, wo = (C.W - 1) * 22, H = C.H;
      const sb = (b, reach) => [b[0] * reach + wo, b[1] * H, b[2] * reach + wo, b[3] * H];
      for (const [k, n] of Object.entries(BASE_NORMALS)) {
        const heavy = !LIGHT[k] && k[2] !== 'L', s = Math.max(3, n.s + (heavy ? C.spd : 0)), r = n.r == null ? 0 : Math.max(5, n.r + C.spd * 2);
        const reach = 1 + (C.reach - 1) * (k.endsWith('K') ? 1.2 : .8);
        const m = { id: k, nm: n.nm, k: 'n', air: n.air || 0, tot: n.air ? 999 : s + n.a + r, ch: n.ch || 0, cn: n.cn || 0, aa: n.aa || 0, an: k, heavy,
          hits: [{ f: s, n: n.a, b: sb(n.b, reach), d: Math.round(n.d * C.pow), hs: n.hs, bs: n.bs, lv: n.lv, kd: n.kd || 0, st: n.st, pu: n.pu, la: n.la || null, ch: 0, jg: n.aa ? 1 : 0 }], vel: [] };
        if (k[0] === 'c') m.crouch = 1;
        if (C.nov && C.nov[k]) { const o = C.nov[k]; if (o.s) { m.hits[0].f = o.s; } if (o.d) m.hits[0].d = o.d; if (o.r != null || o.s) m.tot = m.hits[0].f + m.hits[0].n + (o.r != null ? o.r : r); if (o.x) { m.hits[0].b[2] += o.x; m.hits[0].b[0] += o.x * .5; } if (o.kd) { m.hits[0].kd = 1; m.hits[0].la = [3, 7]; } }
        mv[k] = m;
      }
      const fix = (m, id, kind, sp) => {
        Object.assign(m, { id, k: kind, nm: sp.nm, role: sp.role }); m.hits = m.hits || []; m.vel = m.vel || []; m.an = m.an || id; m.heavy = 1;
        m.hits.forEach(h => { h.b = [h.b[0] + wo, h.b[1] * H, h.b[2] + wo, h.b[3] * H]; });
        if (m.pj) { m.pj.y *= H; m.pj.x += wo; }
        if (m.gr && m.gr.b) m.gr.b = [m.gr.b[0] + wo, m.gr.b[1] * H, m.gr.b[2] + wo, m.gr.b[3] * H];
        if (m.air && !m.tot) m.tot = 999;
        return m;
      };
      C.sp.forEach(sp => { sp.v = [fix(sp.mk(0), sp.id, 's', sp), fix(sp.mk(1), sp.id, 's', sp)]; });
      C.su.v = fix(C.su.mk(), C.su.id, 'u', C.su);
      mv.thr = { id: 'thr', nm: 'Worp', k: 't', hits: [], vel: [], an: 'grab', tot: 30 };
      C.pw = 21 * C.W; C.stunMax = Math.round(560 * (C.hp / 1000));
      return C;
    }

    /* ---------- fighters and matches ---------- */
    function fighter(C, side) {
      prep(C);
      return { C, side, x: 0, y: 0, vx: 0, vy: 0, px: 0, face: side ? -1 : 1, hp: C.hp, mhp: C.hp, meter: 0, stun: 0, stunT: 0, dizzyLock: 0,
        st: 'stand', t: 0, mv: null, str: 0, mt: 0, mser: 0, hmask: 0, conn: 0, cnEnd: 0, chain: 0, hsT: 0, lr: 0, freeze: 0, shake: 0,
        inv: 0, tinv: 0, armLeft: 0, airAtk: 0, jug: 0, fallBy: 0, kd: 0, ko: 0, crouch: 0, guard: 0, walk: 0, jdir: 0,
        combo: 0, comboDmg: 0, calm: 0, maxCombo: 0, maxComboDmg: 0, dmgTaken: 0, roundDmg: 0,
        hist: new Int8Array(64), hbtn: new Int16Array(64), hn: 0, inb: 0, cb: 0, cd: 0, cbS: 0, cbT: 99, cdS: 0, cdT: 99,
        proj: null, grab: null, held: null, thr: null, easy: false, ser: 0, lastHit: null, hid: 0, rel: 0, suKO: 0 };
    }
    function newMatch(o) {
      const P = o.p.map((p, i) => { const F = fighter(CAST_BY[p.ch], i); F.easy = !!p.easy; F.pal = p.pal || 0;
        if (p.boost) { F.mhp = F.hp = Math.round(F.C.hp * p.boost.hp); F.dmgMul = p.boost.dmg; } return F; });
      const M = { f: 0, phase: o.noIntro ? 'ready' : 'intro', pt: 0, round: 1, wins: [0, 0], timer: TIMER, P, pj: [], ev: [], fl: null, slow: 0,
        winner: -1, over: 0, train: o.train || null, stage: o.stage, rounds: [], seq: 0, roundT: 0, noIntro: !!o.noIntro };
      resetRound(M);
      return M;
    }
    function resetRound(M) {
      M.P.forEach((F, i) => {
        Object.assign(F, { x: SW / 2 + (i ? 150 : -150), y: 0, vx: 0, vy: 0, px: 0, face: i ? -1 : 1, hp: F.mhp, st: M.phase === 'intro' ? 'intro' : 'stand', t: 0,
          mv: null, mt: 0, hmask: 0, conn: 0, chain: 0, hsT: 0, freeze: 0, inv: 0, tinv: 0, airAtk: 0, jug: 0, kd: 0, ko: 0, crouch: 0, guard: 0,
          combo: 0, comboDmg: 0, calm: 0, stun: 0, stunT: 0, dizzyLock: 0, proj: null, grab: null, held: null, thr: null, hid: 0, roundDmg: 0, suKO: 0, cb: 0, cd: 0 });
        if (M.train && M.train.meter) F.meter = 100;
      });
      M.pj.length = 0; M.timer = TIMER; M.fl = null; M.slow = 0; M.roundT = 0;
    }
    const other = (M, F) => M.P[1 - F.side];

    /* ---------- input history and motion detection ---------- */
    function relDir(bits, face) {
      const fw = face > 0 ? R : L, bk = face > 0 ? L : R;
      let h = (bits & fw) && !(bits & bk) ? 1 : (bits & bk) && !(bits & fw) ? -1 : 0, v = (bits & U) && !(bits & D) ? 1 : (bits & D) && !(bits & U) ? -1 : 0;
      return 5 + h + v * 3;
    }
    const dirAt = (F, i) => F.hist[(F.hn - 1 - i) & 63];
    const btnAt = (F, i) => F.hbtn[(F.hn - 1 - i) & 63];
    // during hit-stop / the super flash, time stands still for the history too: repeated directions are merged and presses
    // are added to the last entry, so motions and the input buffer made during the freeze still count afterwards
    function record(F, bits, frozen) {
      const d = relDir(bits, F.face), prev = F.inb, edge = bits & ~prev & (BTN | SP | SU), last = (F.hn - 1) & 63;
      if (frozen && F.hn && F.hist[last] === d) F.hbtn[last] |= edge;
      else { F.hist[F.hn & 63] = d; F.hbtn[F.hn & 63] = edge; F.hn++; }
      F.inb = bits;
      // charge (robot): frames held back / down, kept for 10 frames after letting go
      if ((1 << d) & BACKS) { F.cb++; F.cbT = 0; } else { if (F.cb) { F.cbS = F.cb; F.cb = 0; } F.cbT++; }
      if ((1 << d) & DOWNS) { F.cd++; F.cdT = 0; } else { if (F.cd) { F.cdS = F.cd; F.cd = 0; } F.cdT++; }
    }
    // pattern: list of direction masks matched in order, inside the last `win` frames
    function seq(F, pats, win) {
      let k = pats.length - 1;
      for (let i = 0; i < win && k >= 0; i++) if (pats[k] & (1 << dirAt(F, i))) k--;
      return k < 0;
    }
    const P_QCF = [DB(2), DB(3), DB(6)], P_QCB = [DB(2), DB(1), DB(4)], P_DP = [DB(6), DB(2, 1), DB(3)], P_SU = [DB(2), DB(3, 6), DB(2), DB(6)];
    function motion(F, kind) {
      switch (kind) {
        case 'qcf': return seq(F, P_QCF, 20) && ((1 << dirAt(F, 0)) & DB(6, 3, 9, 5) || (1 << dirAt(F, 1)) & DB(6));
        case 'qcb': return seq(F, P_QCB, 20);
        case 'dp': return seq(F, P_DP, 22) && dirAt(F, 0) !== 6;
        case 'qcf2': return seq(F, P_SU, 36);
        case 'cb': return (F.cb >= 40 || (F.cbS >= 40 && F.cbT <= 10)) && ((1 << dirAt(F, 0)) & FWDS);
        case 'cd': return (F.cd >= 40 || (F.cdS >= 40 && F.cdT <= 10)) && ((1 << dirAt(F, 0)) & UPS);
      }
      return false;
    }
    // most recent unused press (within the buffer) of any of `mask`; returns its age or -1
    function pressed(F, mask, win = BUF) { for (let i = 0; i < win; i++) if (btnAt(F, i) & mask) return i; return -1; }
    function consume(F) { for (let i = 0; i < BUF; i++) F.hbtn[(F.hn - 1 - i) & 63] = 0; }

    /* ---------- boxes ---------- */
    const box = (F, b, out) => { if (F.face > 0) { out[0] = F.x + b[0]; out[2] = F.x + b[2]; } else { out[0] = F.x - b[2]; out[2] = F.x - b[0]; } out[1] = F.y + b[1]; out[3] = F.y + b[3]; return out; };
    const ov = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    const HB = [new Float64Array(4), new Float64Array(4), new Float64Array(4)], TB = new Float64Array(4), TB2 = new Float64Array(4);
    function airborne(F) { return F.y > 0 || F.st === 'air' || F.st === 'fall' || (F.st === 'move' && F.mv.air); }
    function crouching(F) {
      if (F.st === 'stand' || F.st === 'block' || F.st === 'hit') return F.crouch;
      if (F.st === 'move') return F.mv.crouch || (F.mv.lo && F.mt >= F.mv.lo[0] && F.mt <= F.mv.lo[1]) ? 1 : 0;
      return 0;
    }
    function invuln(F) {
      if (F.inv > 0 || F.hid) return true;
      if (F.st === 'down' || F.st === 'rise' || F.st === 'held' || F.st === 'thrown' || F.st === 'throw' || F.st === 'ko' || F.st === 'win' || F.st === 'intro') return true;
      if (F.st === 'move' && F.mv.inv && F.mt >= F.mv.inv[0] && F.mt <= F.mv.inv[1]) return true;
      return false;
    }
    // hurtboxes into HB; returns how many
    function hurt(F, A, h) {
      if (invuln(F)) return 0;
      const C = F.C, W = C.W, H = C.H;
      if (F.st === 'fall') {
        if (!(F.fallBy === A.mser && A.st === 'move') && !(h && h.jg && F.jug > 0)) return 0;
        set(HB[0], F.x - 30 * W, F.y, F.x + 30 * W, F.y + 70 * H); return 1;
      }
      if (airborne(F)) { set(HB[0], F.x - 22 * W, F.y + 14, F.x + 22 * W, F.y + 140 * H); return addExt(F, 1); }
      if (crouching(F)) { set(HB[0], F.x - 26 * W, 0, F.x + 28 * W, 108 * H); return addExt(F, 1); }
      set(HB[0], F.x - 24 * W, 0, F.x + 24 * W, 148 * H);
      const hx = F.face > 0 ? 4 : -4; set(HB[1], F.x + hx - 15 * W, 146 * H, F.x + hx + 15 * W, 186 * H);
      return addExt(F, 2);
    }
    function set(b, a, c, d, e) { b[0] = a; b[1] = c; b[2] = d; b[3] = e; }
    function addExt(F, n) {                      // an attacking limb can be hit too (whiff punishes)
      if (F.st !== 'move' || F.mv.k !== 'n' || !F.mv.hits.length) return n;
      const h = F.mv.hits[0]; if (F.mt < h.f || F.mt > h.f + h.n + 8) return n;
      const b = box(F, h.b, HB[n]); if (F.face > 0) b[2] -= 10; else b[0] += 10; return n + 1;
    }

    /* ---------- starting moves ---------- */
    function startMove(M, F, m, str) {
      F.st = 'move'; F.mv = m; F.str = str || 0; F.mt = 0; F.hmask = 0; F.conn = 0; F.mser = ++M.seq; F.hid = 0; F.t = 0;
      F.armLeft = m.arm ? m.arm[2] : 0; F.ctr = 0;
      if (!m.air || F.y <= 0) F.vx = 0;
      if (m.k === 'u') { F.meter -= m.cost || 100; M.fl = { side: F.side, t: m.fl || 40, n: m.fl || 40, nm: m.nm }; push(M, 'super', F.side, m); }
      else if (m.k === 's') { push(M, 'special', F.side, m); F.meter = Math.min(100, F.meter + .5); }
      else push(M, 'swing', F.side, m);
      if (m.tinv) F.tinv = Math.max(F.tinv, m.tinv[1]);
    }
    const SPS = { P: LP | HP, K: LK | HK };
    function trySuper(M, F) {
      const su = F.C.su; if (F.meter < 100 || (su.v.pj && F.proj)) return false;
      const age = pressed(F, SPS[su.b], 4);
      if ((age >= 0 && motion(F, su.in)) || pressed(F, SU, 4) >= 0) { consume(F); startMove(M, F, su.v, 1); return true; }
      return false;
    }
    function trySpecial(M, F, O, ground) {
      const C = F.C;
      if (trySuper(M, F)) return true;
      // the "Makkelijke specials" button: Speciaal + direction
      if (F.easy && pressed(F, SP, 4) >= 0) {
        const d = dirAt(F, 0), key = (1 << d) & FWDS ? 'f' : (1 << d) & (DOWNS | UPS) ? 'd' : 'n';
        const sp = C.sp.find(s => s.id === C.easy[key]) || C.sp[0];
        if (!(sp.v[1].pj && F.proj)) { consume(F); startMove(M, F, sp.v[1], 1); return true; }
      }
      // motion specials (dragon-punch motion first, like the genre does)
      const order = ['dp', 'cd', 'cb', 'qcf', 'qcb'];
      for (const kind of order) for (const sp of C.sp) {
        if (sp.in !== kind) continue;
        const mask = SPS[sp.b], age = pressed(F, mask, 5); if (age < 0) continue;
        if (!motion(F, kind)) continue;
        const heavy = btnAt(F, age) & (HP | HK) ? 1 : 0, m = sp.v[heavy];
        if (m.pj && F.proj) continue;
        if (m.gr && m.gr.air && !ground) continue;
        consume(F); if (kind === 'cb') F.cbS = F.cb = 0; if (kind === 'cd') F.cdS = F.cd = 0;
        startMove(M, F, m, heavy); return true;
      }
      return false;
    }
    function canThrowTarget(F, O) {
      if (O.y > 0 || O.tinv > 0 || invuln(O) || O.hid) return false;
      if (!(O.st === 'stand' || O.st === 'land' || O.st === 'jumpsq' || O.st === 'dash' || (O.st === 'move' && !O.mv.air))) return false;
      return Math.abs(O.x - F.x) <= F.C.pw + O.C.pw + 24;
    }
    function tryNormal(M, F, O, air) {
      const age = pressed(F, BTN); if (age < 0) return false;
      const b = btnAt(F, age), d = dirAt(F, 0);
      if (air) {
        const k = b & HK ? 'jHK' : b & HP ? 'jHP' : b & LK ? 'jLK' : 'jLP';
        consume(F); F.airAtk = 1; startMove(M, F, F.C.mv[k], 0); return true;
      }
      // throw: Zware stoot + forward/back when close
      if ((b & HP) && (d === 6 || d === 4) && canThrowTarget(F, O)) { consume(F); startThrow(M, F, O, { d: Math.round(120 * F.C.pow), n: 34, sw: d === 4, tech: 1 }); return true; }
      const cr = (1 << d) & DOWNS;
      const k = (cr ? 'c' : 's') + (b & HK ? 'HK' : b & HP ? 'HP' : b & LK ? 'LK' : 'LP');
      consume(F); startMove(M, F, F.C.mv[k], 0); return true;
    }
    function tryCancel(M, F, O) {
      if (!F.conn || F.mt > F.cnEnd) return false;
      const m = F.mv;
      if (m.k === 's') return m.cn === 'u' && F.conn === 1 ? trySuper(M, F) : false;
      if (m.k !== 'n' || m.air) return false;
      if (m.cn === 'c' || m.cn === 's') { if (trySpecial(M, F, O, true)) return true; }
      if (m.cn === 'c' && F.chain < 3) {
        const age = pressed(F, BTN); if (age < 0) return false;
        const b = btnAt(F, age), cr = (1 << dirAt(F, 0)) & DOWNS, heavy = b & (HP | HK);
        if (heavy && F.conn !== 1) return false;
        const k = (cr ? 'c' : 's') + (b & HK ? 'HK' : b & HP ? 'HP' : b & LK ? 'LK' : 'LP');
        consume(F); const ch = F.chain + 1; startMove(M, F, F.C.mv[k], 0); F.chain = heavy ? 9 : ch; return true;
      }
      return false;
    }

    /* ---------- throws (normal, command grabs, the counter and the air catch all use this) ---------- */
    function startThrow(M, F, O, thr) {
      F.st = 'throw'; F.t = 0; F.thr = thr; F.grab = O; F.vx = 0; F.mv = null;
      O.st = 'held'; O.t = 0; O.held = F; O.vx = O.vy = 0; O.px = 0; O.mv = null; O.hid = 0;
      thr.y0 = O.y; thr.x0 = O.x;
      push(M, 'grab', F.side, thr);
    }
    function runThrow(M, F) {
      const O = F.grab, T = F.thr; F.t++;
      if (!O || O.st !== 'held') { toStand(F); return; }
      const rel = T.n - 12, u = Math.min(1, F.t / rel), dist = F.C.pw + O.C.pw + 6;
      if (T.tech && F.t <= 9 && O.t >= 1) {                     // escape: the held fighter presses the throw too
        const age = pressed(O, HP, 9);
        if (age >= 0) { const d = dirAt(O, 0); if (d === 4 || d === 6) { consume(O);
          toStand(F); toStand(O); F.px = -4 * F.face; O.px = 4 * F.face; O.tinv = 10; push(M, 'tech', O.side); return; } }
      }
      if (T.air) { O.x = F.x + F.face * dist; O.y = T.y0 * (1 - u) + 30 * Math.sin(Math.PI * u); }
      else if (T.sw) { const a = Math.PI * u; O.x = F.x + F.face * dist * Math.cos(a); O.y = Math.sin(a) * 90; }
      else { O.x = F.x + F.face * (dist + 14 * u); O.y = Math.sin(Math.PI * u) * (T.su ? 120 : 50); }
      if (T.su) { O.y = Math.abs(Math.sin(Math.PI * 2 * u)) * 110; O.x = F.x + F.face * dist * Math.cos(Math.PI * 2 * u); }
      clampX(M, O);
      const parts = T.su ? [Math.round(rel * .35), Math.round(rel * .7), rel] : [rel];
      for (let i = 0; i < parts.length; i++) if (F.t === parts[i]) {
        const d = Math.round(T.d / parts.length);
        damage(M, F, O, d, false, T.su ? 'u' : T.k || 't'); push(M, 'throwhit', O.side, { d, x: O.x, y: O.y + 80, last: i === parts.length - 1 });
        if (i < parts.length - 1) { F.freeze = O.freeze = 6; }
      }
      if (F.t === rel) {
        if (T.sw) { F.face = -F.face; O.x = F.x + F.face * dist; }
        O.held = null; O.st = 'fall'; O.t = 0; O.kd = 1; O.jug = 0; O.vx = F.face * 3.2; O.vy = 6; O.y = Math.max(O.y, 20); O.fallBy = -1;
        if (O.hp <= 0) koFall(M, O, F);
        F.freeze = O.freeze = 8;
      }
      if (F.t >= T.n) { F.grab = null; F.thr = null; toStand(F); }
    }

    /* ---------- hits ---------- */
    function push(M, t, side, a) { M.ev.push({ t, side, a }); }
    function damage(M, A, B, d, chipOnly, kind) {
      if (A.dmgMul) d = Math.round(d * A.dmgMul);
      if (M.train && M.train.inf) { B.hp = Math.max(1, B.hp - d); }
      else B.hp = Math.max(0, B.hp - d);
      B.roundDmg += d; B.dmgTaken += d;
      if (!chipOnly) { B.combo++; B.comboDmg += d; B.calm = 0; if (B.combo > A.maxCombo) A.maxCombo = B.combo; if (B.comboDmg > A.maxComboDmg) A.maxComboDmg = B.comboDmg; }
      if (B.hp <= 0 && kind === 'u') A.suKO = 1;
    }
    function blockOK(B, back, lv) {
      if (!(B.st === 'stand' || B.st === 'block' || (B.st === 'land' && B.t >= 1))) return false;
      if (!(B.inb & back)) return false;
      const cr = B.inb & D ? 1 : 0;
      if (lv === 'l' && !cr) return false;
      if (lv === 'o' && cr) return false;
      return true;
    }
    // A hits B with hit h (A may be a projectile: then src is the projectile object)
    function applyHit(M, A, B, h, idx, src, ak) {
      const back = (src ? src.vx > 0 : A.face > 0) ? R : L, away = src ? Math.sign(src.vx) || 1 : A.face;
      const kind = src ? 'p' : ak;
      if (!src) { A.hmask |= 1 << idx; A.conn = A.conn || 2; A.cnEnd = h.f + h.n + 9; }
      // counter stance (Oma Truus): melee high/mid strikes get caught
      if (!src && B.st === 'move' && B.mv.ct && B.mt >= B.mv.ct.f0 && B.mt <= B.mv.ct.f1 && h.lv !== 'l' && kind !== 'u') {
        push(M, 'counter', B.side, { x: (A.x + B.x) / 2, y: 120 });
        startThrow(M, B, A, { d: B.mv.ct.d, n: 34, sw: 0, k: 's' }); B.face = A.x > B.x ? 1 : -1; return;
      }
      // armour (Sterke Sjaak): absorbs a hit, takes half the damage
      if (B.st === 'move' && B.mv.arm && B.armLeft > 0 && B.mt >= B.mv.arm[0] && B.mt <= B.mv.arm[1]) {
        B.armLeft--; const d = Math.round(h.d * .5); damage(M, A, B, d, true, kind); push(M, 'armor', B.side, { x: B.x, y: B.y + 110 });
        if (!src) { A.freeze = h.st; } B.freeze = h.st; B.shake = h.st; if (B.hp <= 0) koFall(M, B, A); return;
      }
      if (blockOK(B, back, h.lv)) {
        B.st = 'block'; B.t = 0; B.hsT = h.bs; B.crouch = B.inb & D ? 1 : 0; B.mv = null;
        const chip = h.ch ? Math.max(1, Math.round(h.d * h.ch)) : 0;
        if (chip) { damage(M, A, B, chip, true, kind); if (B.hp <= 0) { koFall(M, B, A); } }
        pushback(M, A, B, h.pu * .8, away, src);
        const st = Math.max(5, h.st - 3);
        if (!src) A.freeze = st; B.freeze = st; B.shake = st;
        (src ? M.P[src.o] : A).meter = Math.min(100, (src ? M.P[src.o] : A).meter + 2); B.meter = Math.min(100, B.meter + 1);
        push(M, 'block', B.side, { x: B.x + away * -20, y: B.y + (B.crouch ? 70 : 110), heavy: h.d >= 60, src: kind });
        return;
      }
      // hit
      const owner = src ? M.P[src.o] : A;
      const counter = !src && B.st === 'move' && B.mv.hits.length && B.mt < B.mv.hits[0].f + B.mv.hits[0].n;
      const minS = kind === 'u' ? .6 : .3, sc = B.combo <= 1 ? 1 : Math.max(minS, 1 - .11 * (B.combo - 1));
      let d = Math.round(h.d * sc * (counter ? 1.2 : 1)); if (d < 1) d = 1;
      const wasAir = airborne(B) || B.st === 'fall', wasCr = crouching(B);
      B.mv = null; B.hid = 0;
      damage(M, owner, B, d, false, kind);
      owner.meter = Math.min(100, owner.meter + (kind === 'n' ? 4 : kind === 'u' ? 0 : 6)); B.meter = Math.min(100, B.meter + 3);
      if (B.dizzyLock <= 0 && B.st !== 'dizzy') { B.stun += d; B.stunT = 0; }
      const st = h.st || 10;
      if (!src) A.freeze = st; B.freeze = st; B.shake = st;
      const launch = h.kd || wasAir || B.hp <= 0 || (src && src.kd && src.hits <= 1);
      if (launch) {
        const la = h.la || (h.kd ? [3, 7] : [2.4, 5.5]);
        B.st = 'fall'; B.t = 0; B.kd = h.kd || h.jg || B.hp <= 0 || (src && src.kd) ? 1 : 0; if (wasAir && !h.kd && !h.jg) B.kd = 0;
        B.vx = away * la[0]; B.vy = la[1]; B.y = Math.max(B.y, 1);
        if (!(B.fallBy === (src ? -2 : A.mser) && wasAir)) B.jug = h.jg ? (wasAir ? Math.max(0, B.jug - 1) : 1) : 0;
        B.fallBy = src ? -2 : A.mser;
        if (B.hp <= 0) koFall(M, B, owner);
      } else {
        B.st = 'hit'; B.t = 0; B.hsT = h.hs + (counter ? 4 : 0); B.crouch = wasCr; B.vx = 0;
        pushback(M, A, B, h.pu, away, src);
      }
      push(M, 'hit', B.side, { id: src ? src.k : ak + ':' + (A.mvId || ''), x: B.x - away * 18, y: B.y + (wasCr ? 70 : h.b ? Math.min(150, (h.b[1] + h.b[3]) / 2) : 100), d, heavy: d >= 60 || kind === 'u', kind, counter, combo: B.combo, src: src ? src.k : null });
    }
    function pushback(M, A, B, pu, away, src) {
      const v = pu * .9;
      if (atWall(B, away) && !src) A.px = -away * v; else B.px = away * v;
    }
    const atWall = (F, dir) => dir > 0 ? F.x >= SW - WALL - F.C.pw - 1 : F.x <= WALL + F.C.pw + 1;
    function koFall(M, B, A) {
      B.hp = 0; B.ko = 1; B.st = 'fall'; B.kd = 1; B.t = 0; B.mv = null; B.held = null;
      if (B.y < 1) { B.y = 1; } B.vy = Math.max(B.vy, 8); B.vx = (A.x < B.x ? 1 : -1) * 3.6;
      if (M.phase === 'fight') { M.phase = 'ko'; M.pt = 0; M.slow = 70; push(M, 'ko', B.side, { x: B.x, y: B.y + 100, su: A.suKO }); }
    }

    /* ---------- the per-fighter update ---------- */
    function toStand(F) { F.st = 'stand'; F.t = 0; F.mv = null; F.chain = 0; F.hid = 0; F.vx = 0; F.ctr = 0; }
    function threat(M, F, O) {
      if (O.st === 'move' && O.mv.hits.length && Math.abs(O.x - F.x) < 280) return true;
      if (O.proj && Math.abs(O.proj.x - F.x) < 300 && Math.sign(O.proj.vx) === Math.sign(F.x - O.proj.x)) return true;
      return false;
    }
    function update(M, F, O, ctl) {
      const d = ctl ? dirAt(F, 0) : 5;
      if (F.inv > 0) F.inv--; if (F.tinv > 0) F.tinv--; if (F.dizzyLock > 0) F.dizzyLock--;
      if (F.stunT++ > 70 && F.stun > 0) F.stun = Math.max(0, F.stun - 3);
      F.guard = 0;
      switch (F.st) {
        case 'intro': case 'win': case 'lose': F.t++; F.vx = 0; break;
        case 'stand': {
          F.t++; F.airAtk = 0;
          if (F.combo && F.calm++ > 2) { F.combo = 0; F.comboDmg = 0; }
          if (ctl) {
            if (trySpecial(M, F, O, true) || tryNormal(M, F, O, false)) { if (F.st === 'move') runMove(M, F, O); break; }
            if ((1 << d) & UPS) { F.st = 'jumpsq'; F.t = 0; F.jdir = d === 9 ? 1 : d === 7 ? -1 : 0; F.vx = 0; break; }
            // dash: forward or back tapped twice
            if ((d === 6 || d === 4) && dirAt(F, 1) !== d) {
              for (let i = 2; i < 14; i++) { const e = dirAt(F, i); if (e === d) { let gap = false; for (let j = 1; j < i; j++) if (dirAt(F, j) !== d) gap = true; if (gap) { F.st = 'dash'; F.t = 0; F.jdir = d === 6 ? 1 : -1; push(M, 'dash', F.side); } break; } if (e !== 5) break; }
              if (F.st === 'dash') break;
            }
            F.crouch = (1 << d) & DOWNS ? 1 : 0;
            if (F.crouch) F.vx = 0;
            else if (d === 6) F.vx = F.C.walkF * F.face;
            else if (d === 4) { if (threat(M, F, O)) { F.guard = 1; F.vx = 0; } else F.vx = -F.C.walkB * F.face; }
            else F.vx = 0;
            if (F.crouch && ((1 << d) & BACKS) && threat(M, F, O)) F.guard = 1;
            F.walk = F.vx ? Math.sign(F.vx * F.face) : 0;
          } else { F.vx = 0; F.walk = 0; F.crouch = 0; }
          break;
        }
        case 'jumpsq':
          F.t++;
          if (ctl && trySpecial(M, F, O, true)) { if (F.st === 'move') runMove(M, F, O); break; }
          if (F.t >= 4) { F.st = 'air'; F.t = 0; F.vy = F.C.jvy; F.vx = F.jdir * F.C.jvx * F.face; F.y = .5; push(M, 'jump', F.side); }
          break;
        case 'air':
          F.t++;
          if (ctl && !F.airAtk && tryNormal(M, F, O, true)) { runMove(M, F, O); break; }
          airPhys(M, F);
          break;
        case 'land':
          F.t++; F.vx = 0;
          if (F.t >= F.lr) toStand(F);
          break;
        case 'dash': {
          F.t++; const n = F.jdir > 0 ? 16 : 20, sp = F.jdir > 0 ? 7.2 : 6.2;
          F.vx = F.jdir * F.face * sp * Math.max(0, 1 - F.t / n) * 1.6;
          if (F.jdir < 0 && F.t <= 7) F.inv = Math.max(F.inv, 1);
          if (F.t >= n) toStand(F);
          break;
        }
        case 'move':
          if (ctl && tryCancel(M, F, O)) { if (F.st === 'move') runMove(M, F, O); break; }
          runMove(M, F, O);
          break;
        case 'hit': case 'block':
          F.t++; F.vx = 0;
          if (F.t >= F.hsT) {
            if (F.st === 'hit' && F.stun >= F.C.stunMax && F.hp > 0) { F.st = 'dizzy'; F.t = 0; F.stun = 0; F.dizzyLock = 400; push(M, 'dizzy', F.side, { x: F.x, y: F.y + 190 }); }
            else { const cr = F.crouch; toStand(F); F.crouch = cr; F.tinv = Math.max(F.tinv, 3); if (ctl) { if ((trySpecial(M, F, O, true) || tryNormal(M, F, O, false)) && F.st === 'move') runMove(M, F, O); } }
          }
          break;
        case 'dizzy':
          F.t++; F.vx = 0; if (F.t >= 130) { toStand(F); F.combo = 0; F.comboDmg = 0; }
          break;
        case 'fall':
          F.t++; airPhys(M, F);
          break;
        case 'down':
          F.t++; F.vx = 0;
          if (F.ko) { if (F.t >= 40) { F.st = 'ko'; F.t = 0; } break; }
          if (F.t >= 32) { F.st = 'rise'; F.t = 0; push(M, 'rise', F.side); }
          break;
        case 'rise':
          F.t++; if (F.t >= 22) { toStand(F); F.inv = 3; F.tinv = 8; F.combo = 0; F.comboDmg = 0; F.jug = 0; }
          break;
        case 'ko': F.t++; F.vx = 0; break;
        case 'throw': runThrow(M, F); break;
        case 'held': F.t++; break;
      }
    }
    function airPhys(M, F) {
      F.vy -= GRAV; F.y += F.vy; F.x += F.vx;
      if (F.y <= 0) {
        F.y = 0; F.vy = 0;
        if (F.st === 'fall') {
          if (F.kd) { F.st = 'down'; F.t = 0; F.vx = 0; F.px = F.px * .5; push(M, 'down', F.side, { x: F.x }); }
          else { F.st = 'land'; F.t = 0; F.lr = 6; F.vx = 0; push(M, 'land', F.side); }
          F.jug = 0;
        } else if (F.st === 'move') { const lr = F.mv.lr || 4; F.mv = null; F.st = 'land'; F.t = 0; F.lr = lr; F.vx = 0; push(M, 'land', F.side); }
        else { F.st = 'land'; F.t = 0; F.lr = 3; F.vx = 0; push(M, 'land', F.side); }
      }
    }
    function runMove(M, F, O) {
      const m = F.mv; F.mt++; F.t++;
      for (let i = 0; i < m.vel.length; i++) {
        const v = m.vel[i];
        if (F.mt >= v[0] && F.mt <= v[1]) { if (v[2] !== null) F.vx = v[2] * F.face; if (F.mt === v[0] && v[3] !== null) { F.vy = v[3]; if (F.y <= 0) F.y = .5; } }
        else if (!m.air && F.mt === v[1] + 1) F.vx = 0;
      }
      if (m.pj && F.mt === m.pj.f && !F.proj) spawnProj(M, F, m.pj);
      if (m.gr && F.mt === m.gr.f) {
        const g = m.gr;
        if (g.air) {
          if (airborne(O) && O.st !== 'fall' && !invuln(O) && O.y > 20) {
            box(F, g.b, TB); set(TB2, O.x - 20, O.y, O.x + 20, O.y + 140);
            if (ov(TB, TB2)) { startThrow(M, F, O, { d: g.d, n: g.n, air: 1, k: 's' }); return; }
          }
        } else if (!airborne(O) && !invuln(O) && O.st !== 'hit' && O.st !== 'block' && Math.abs(O.x - F.x) <= F.C.pw + O.C.pw + g.rng) {
          startThrow(M, F, O, { d: g.d, n: g.n, sw: 0, su: g.su, k: m.k }); return;
        }
      }
      if (m.tp && F.mt === m.tp.f) teleport(M, F, O, m.tp.mode);
      F.hid = m.hid && F.mt >= m.hid[0] && F.mt <= m.hid[1] ? 1 : 0;
      if (m.air) { if (F.y > 0) airPhys(M, F); return; }
      if (F.mt >= m.tot) toStand(F);
    }
    function teleport(M, F, O, mode) {
      const s = O.x >= F.x ? 1 : -1, gap = F.C.pw + O.C.pw + (mode === 'behind' ? 26 : 46);
      let x = mode === 'behind' ? O.x + s * gap : O.x - s * gap;
      const lo = WALL + F.C.pw, hi = SW - WALL - F.C.pw;
      if (x < lo || x > hi) x = O.x - s * gap;
      F.x = Math.max(lo, Math.min(hi, x)); F.face = O.x >= F.x ? 1 : -1;
      push(M, 'tele', F.side, { x: F.x });
    }
    function spawnProj(M, F, pj) {
      const p = { o: F.side, k: pj.k, x: F.x + F.face * pj.x, y: F.y + pj.y, vx: pj.vx * F.face, vy: pj.vy || 0, g: pj.g || 0, w: pj.w, h: pj.h,
        d: pj.d, hs: pj.hs, bs: pj.bs, lv: pj.lv || 'h', ch: pj.ch == null ? .15 : pj.ch, life: pj.life, hits: pj.hits || 1, gap: pj.gap || 0, cool: 0,
        st: pj.st || 9, kd: pj.kd || 0, t: 0, dead: 0, pu: 7, b: null, f: 0, n: 1, ser: ++M.seq };
      F.proj = p; M.pj.push(p); push(M, 'proj', F.side, p);
    }
    const PB = new Float64Array(4);
    function updateProj(M) {
      for (const p of M.pj) {
        if (p.dead) continue;
        p.t++; p.x += p.vx; p.y += p.vy; p.vy -= p.g; p.life--;
        if (p.g && p.y <= 0) { p.dead = 1; push(M, 'pjgone', p.o, p); continue; }
        if (p.life <= 0 || p.x < -60 || p.x > SW + 60) { p.dead = 1; push(M, 'pjgone', p.o, p); continue; }
      }
      // clashes
      for (let i = 0; i < M.pj.length; i++) for (let j = i + 1; j < M.pj.length; j++) {
        const a = M.pj[i], b = M.pj[j]; if (a.dead || b.dead || a.o === b.o) continue;
        if (Math.abs(a.x - b.x) < a.w + b.w && Math.abs(a.y - b.y) < a.h + b.h) {
          const na = a.hits, nb = b.hits; a.hits -= nb; b.hits -= na;
          if (a.hits <= 0) a.dead = 1; if (b.hits <= 0) b.dead = 1;
          push(M, 'clash', a.o, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        }
      }
      for (const p of M.pj) {
        if (p.dead) continue;
        if (p.cool > 0) { p.cool--; continue; }
        const B = M.P[1 - p.o], A = M.P[p.o];
        const n = hurt(B, A, null); if (!n) continue;
        set(PB, p.x - p.w, p.y - p.h, p.x + p.w, p.y + p.h);
        let hit = false; for (let i = 0; i < n; i++) if (ov(PB, HB[i])) { hit = true; break; }
        if (!hit) continue;
        const h = { d: p.d, hs: p.hs, bs: p.bs, lv: p.lv, ch: p.ch, st: p.st, pu: p.pu, kd: p.kd && p.hits <= 1 ? 1 : 0, la: p.kd && p.hits <= 1 ? [3, 8] : null, b: null };
        applyHit(M, A, B, h, 0, p);
        p.hits--; if (p.hits <= 0) { p.dead = 1; push(M, 'pjgone', p.o, p); } else { p.cool = p.gap; p.vx *= .5; }
      }
      for (let i = M.pj.length - 1; i >= 0; i--) if (M.pj[i].dead) { const p = M.pj[i]; if (M.P[p.o].proj === p) M.P[p.o].proj = null; M.pj.splice(i, 1); }
    }
    function clampX(M, F) { const lo = WALL + F.C.pw, hi = SW - WALL - F.C.pw; if (F.x < lo) F.x = lo; if (F.x > hi) F.x = hi; }
    const solid = F => !(F.st === 'held' || F.hid || (F.st === 'move' && F.mv.thru && F.mt >= F.mv.thru[0] && F.mt <= F.mv.thru[1]));
    function physics(M) {
      const [A, B] = M.P;
      for (const F of M.P) {
        if (F.freeze > 0) continue;
        if (F.y <= 0 && F.st !== 'air' && F.st !== 'fall') F.x += F.vx;
        F.x += F.px; F.px *= .8; if (Math.abs(F.px) < .05) F.px = 0;
        clampX(M, F);
      }
      // push boxes
      if (solid(A) && solid(B)) {
        const ya0 = A.y, ya1 = A.y + (airborne(A) ? 120 : 150 * A.C.H), yb0 = B.y, yb1 = B.y + (airborne(B) ? 120 : 150 * B.C.H);
        const over = A.C.pw + B.C.pw - Math.abs(A.x - B.x);
        if (over > 0 && ya0 < yb1 && yb0 < ya1) {
          let s = A.x < B.x ? -1 : A.x > B.x ? 1 : (A.face > 0 ? -1 : 1);
          const aw = atWall(A, s), bw = atWall(B, -s);
          if (aw && !bw) B.x -= s * over; else if (bw && !aw) A.x += s * over; else { A.x += s * over / 2; B.x -= s * over / 2; }
          clampX(M, A); clampX(M, B);
        }
      }
      // the camera can't show them further apart than MAXSEP
      const sep = Math.abs(A.x - B.x) - MAXSEP;
      if (sep > 0) {
        const s = A.x < B.x ? 1 : -1, am = A.vx * -s > 0 || A.px * -s > 0, bm = B.vx * s > 0 || B.px * s > 0;
        if (am && !bm) A.x += s * sep; else if (bm && !am) B.x -= s * sep; else { A.x += s * sep / 2; B.x -= s * sep / 2; }
      }
      // facing
      for (const F of M.P) {
        const O = M.P[1 - F.side];
        if ((F.st === 'stand' || F.st === 'land' || F.st === 'jumpsq') && Math.abs(O.x - F.x) > 2) F.face = O.x > F.x ? 1 : -1;
      }
    }
    const HA = new Float64Array(4);
    function hits(M) {
      const pend = [];
      for (const A of M.P) {
        if (A.st !== 'move' || A.freeze > 0) continue;
        const B = M.P[1 - A.side], hs = A.mv.hits;
        for (let i = 0; i < hs.length; i++) {
          const h = hs[i]; if (A.hmask & (1 << i)) continue;
          if (A.mt < h.f || A.mt >= h.f + h.n) continue;
          const n = hurt(B, A, h); if (!n) break;
          box(A, h.b, HA); let hit = false;
          for (let k = 0; k < n; k++) if (ov(HA, HB[k])) { hit = true; break; }
          if (hit) { pend.push([A, B, h, i, A.mv.k, A.mv.id]); break; }
        }
      }
      for (const [A, B, h, i, k, id] of pend) { A.mvId = id; applyHit(M, A, B, h, i, null, k); }
    }

    /* ---------- the match ---------- */
    function step(M, inputs) {
      M.ev.length = 0; M.f++;
      const ctl = M.phase === 'fight';
      M.P.forEach((F, i) => record(F, ctl ? inputs[i] | 0 : 0, F.freeze > 0 || !!M.fl));
      if (M.fl) { if (--M.fl.t <= 0) M.fl = null; return; }
      if (M.slow > 0) M.slow--;
      const [A, B] = M.P;
      for (const F of M.P) {
        const O = M.P[1 - F.side];
        if (F.freeze > 0) { F.freeze--; if (F.shake > 0) F.shake--; continue; }
        update(M, F, O, ctl && F.hp > 0);
      }
      if (A.st === 'held' && A.held && A.held.grab !== A) toStand(A);
      if (B.st === 'held' && B.held && B.held.grab !== B) toStand(B);
      physics(M);
      if (M.phase === 'fight' || M.phase === 'ko') { hits(M); updateProj(M); }
      else if (M.pj.length) { M.pj.forEach(p => { p.dead = 1; }); updateProj(M); }
      phase(M);
    }
    function phase(M) {
      M.pt++;
      const [A, B] = M.P;
      switch (M.phase) {
        case 'intro':
          if (M.pt === 1) push(M, 'intro', 0);
          if (M.pt >= 120) { A.st = B.st = 'stand'; A.t = B.t = 0; M.phase = 'ready'; M.pt = 0; }
          break;
        case 'ready':
          if (M.pt === 1) push(M, 'round', M.round, { n: M.round, final: M.wins[0] === 1 && M.wins[1] === 1 });
          if (M.pt === 56) { push(M, 'fight', 0); M.phase = 'fight'; M.pt = 0; }
          break;
        case 'fight':
          M.roundT++;
          if (M.train) {
            for (const F of M.P) { if (F.st === 'stand' || F.st === 'air' || F.st === 'block') { if (F.calm > 50 || (F.combo === 0 && F.hp < F.mhp && F.st === 'stand' && F.t > 50)) { F.hp = F.mhp; } }
              if (M.train.meter) F.meter = 100; }
            break;
          }
          if (--M.timer <= 0) { M.timer = 0; M.phase = 'timeup'; M.pt = 0; push(M, 'timeup', 0); }
          break;
        case 'ko':
          if (M.pt === 1 && A.hp <= 0 && B.hp <= 0) push(M, 'doubleko', 0);
          if (M.pt === 110) for (const F of M.P) if (F.hp > 0) { F.st = 'win'; F.t = 0; F.mv = null; F.vx = 0; F.px = 0; F.y = 0; F.thr = null; F.grab = null; }
          if (M.pt >= 220) endRound(M);
          break;
        case 'timeup':
          if (M.pt === 60) { const w = winnerByHp(M); for (const F of M.P) { if (F.st === 'held' || F.st === 'throw') continue; if (w === F.side) { F.st = 'win'; F.t = 0; F.mv = null; } else if (w >= 0 && F.y <= 0 && F.st !== 'down') { F.st = 'lose'; F.t = 0; F.mv = null; } } }
          if (M.pt >= 190) endRound(M);
          break;
      }
    }
    const winnerByHp = M => { const [a, b] = M.P.map(F => F.hp / F.mhp); return Math.abs(a - b) < 1e-9 ? -1 : a > b ? 0 : 1; };
    function endRound(M) {
      const [A, B] = M.P;
      let w = A.hp <= 0 && B.hp <= 0 ? -1 : A.hp <= 0 ? 1 : B.hp <= 0 ? 0 : winnerByHp(M);
      const info = { w, perfect: w >= 0 && M.P[w].hp === M.P[w].mhp, superKO: w >= 0 && M.P[w].suKO && M.P[1 - w].hp <= 0, time: M.roundT, timeout: A.hp > 0 && B.hp > 0 };
      M.rounds.push(info);
      if (w >= 0) M.wins[w]++; else { M.wins[0]++; M.wins[1]++; }
      push(M, 'roundend', w, info);
      if (M.wins[0] >= 2 || M.wins[1] >= 2) {
        M.over = 1; M.phase = 'over'; M.pt = 0;
        M.winner = M.wins[0] >= 2 && M.wins[1] >= 2 ? -1 : M.wins[0] >= 2 ? 0 : 1;
        push(M, 'matchend', M.winner);
        return;
      }
      M.round++; M.phase = 'ready'; M.pt = 0; resetRound(M);
    }
    // a training dummy that blocks everything ("Blokken")
    function dummyBits(M, side, mode) {
      const F = M.P[side], O = M.P[1 - side], fw = O.x > F.x ? R : L, bk = fw === R ? L : R;
      if (mode === 'crouch') return D;
      if (mode === 'jump') return U;
      if (mode === 'block') {
        let low = false, any = false;
        if (O.st === 'move' && O.mv.hits.length) { any = true; low = O.mv.hits.some(h => h.lv === 'l'); }
        for (const p of M.pj) if (p.o !== side) { any = true; if (p.lv === 'l') low = true; }
        if (O.st === 'air' || (O.st === 'move' && O.mv.air)) return bk;
        return any || F.st === 'block' ? bk | (low ? D : 0) : 0;
      }
      return 0;
    }
    return { SW, WALL, MAXSEP, TIMER, U, D, L, R, LP, HP, LK, HK, SP, SU, BTN, prep, newMatch, step, relDir, motion, hurt, HB, box, airborne, crouching, invuln, dummyBits, seq, dirAt, other };
  })();

  /* ================= ai.js: the computer opponent =================
     It only sees the opponent as it was `react` frames ago (a ring of snapshots) and plays through the same pad
     bits a person would: motions are typed out frame by frame, charge moves need real charge. Difficulty changes
     reaction time, how often it blocks / anti-airs / punishes / combos, and how well it tells low from high. */
  const AI = (() => {
    const LV = {
      makkelijk: { react: 26, block: .3, lowGuess: .45, aa: .14, punish: .18, combo: .15, throw: .04, tech: .05, aggr: .42, proj: .22, jump: .1, superP: .3, reversal: .08, think: 11, mash: .15 },
      normaal: { react: 15, block: .6, lowGuess: .75, aa: .45, punish: .5, combo: .5, throw: .12, tech: .25, aggr: .55, proj: .38, jump: .1, superP: .6, reversal: .3, think: 6, mash: .06 },
      moeilijk: { react: 9, block: .82, lowGuess: .92, aa: .75, punish: .8, combo: .82, throw: .2, tech: .45, aggr: .62, proj: .45, jump: .08, superP: .85, reversal: .5, think: 4, mash: .02 },
    };
    const PREF = { dex: 170, truus: 90, moer: 260, sol: 140, bram: 100, kiki: 150, sjaak: 110, nevel: 230 };
    const { U, D, L, R, LP, HP, LK, HK, SU } = Core;
    function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
    const MOT = { qcf: [2, 3, 6], qcb: [2, 1, 4], dp: [6, 2, 3], qcf2: [2, 3, 6, 2, 3, 6] };

    function create(level, seed, side) {
      const P = LV[level] || LV.normaal, rnd = rng(seed || 1), ring = [];
      const A = { P, side, q: [], next: 0, pjCool: 0, seen: -1, cancelSer: -1, blockSer: -1, blocking: 0, blockLow: false, aaSer: -1, jumpAtk: 0, techAt: -1, techSer: -1,
        idleDir: 5, walkT: 0, lastHp: 0, holdCharge: 0 };
      const snap = (M, F, O) => {
        const m = O.st === 'move' ? O.mv : null, h0 = m && m.hits.length ? m.hits[0] : null;
        let ph = '';
        if (m && h0) { const end = m.hits[m.hits.length - 1]; ph = O.mt < h0.f ? 'startup' : O.mt < end.f + end.n ? 'active' : 'recovery'; }
        else if (m && (m.pj || m.gr || m.tp || m.ct)) ph = 'other';
        let pd = 9999, plv = 'h', pser = 0;
        for (const p of M.pj) if (p.o !== F.side) { const dx = (p.x - F.x) * -Math.sign(p.vx); if (dx > -20 && dx < pd) { pd = dx; plv = p.lv; pser = p.ser; } }
        return { x: O.x, y: O.y, vx: O.vx, vy: O.vy, st: O.st, t: O.t, mser: O.mser, ph, mv: m, low: !!(m && m.hits.some(h => h.lv === 'l')), air: Core.airborne(O),
          rec: m ? (m.air ? 99 : m.tot - O.mt) : O.st === 'land' ? O.lr - O.t : 0, pd, plv, pser, throwing: !!(m && m.pj), crouch: Core.crouching(O), hp: O.hp };
      };
      const sp = (F, role) => F.C.sp.find(s => s.role === role);
      const btnOf = (s, heavy) => s.b === 'P' ? (heavy ? HP : LP) : (heavy ? HK : LK);
      function queueMotion(F, s, heavy) {
        const b = btnOf(s, heavy);
        if (s.in === 'cb') { if (!(F.cb >= 40 || (F.cbS >= 40 && F.cbT <= 8))) return false; A.q.push({ d: 6, b }); return true; }
        if (s.in === 'cd') { if (!(F.cd >= 40 || (F.cdS >= 40 && F.cdT <= 8))) return false; A.q.push({ d: 9, b }); return true; }
        const seq = MOT[s.in]; seq.forEach((d, i) => A.q.push({ d, b: i === seq.length - 1 ? b : 0 })); return true;
      }
      function queueSuper(F) { const s = F.C.su; MOT.qcf2.forEach((d, i) => A.q.push({ d, b: i === 5 ? btnOf(s, 1) : 0 })); }
      const press = (d, b) => A.q.push({ d, b });
      const bits = (F, d, b) => {
        const fw = F.face > 0 ? R : L, bk = F.face > 0 ? L : R; let x = b || 0;
        if (d >= 7) x |= U; if (d <= 3) x |= D; if (d % 3 === 0) x |= fw; if (d % 3 === 1) x |= bk; return x;
      };
      A.input = (M) => {
        const F = M.P[side], O = M.P[1 - side];
        ring.push(snap(M, F, O)); if (ring.length > 40) ring.shift();
        if (M.phase !== 'fight') { A.q.length = 0; return 0; }
        const S = ring[Math.max(0, ring.length - 1 - P.react)], dist = Math.abs(S.x - F.x), now = M.f;
        // ---- held by a throw: try to escape ----
        if (F.st === 'held') {
          if (A.techSer !== F.held.mser + M.f - F.t) { A.techSer = F.held.mser + M.f - F.t; A.techAt = rnd() < P.tech ? 2 + Math.floor(rnd() * 6) : -1; }
          return F.t === A.techAt ? bits(F, 4, HP) : 0;
        }
        // ---- cancels and combos (we can see our own hits straight away) ----
        if (F.st === 'move' && F.conn && F.mser !== A.cancelSer && !A.q.length) {
          A.cancelSer = F.mser; const m = F.mv;
          if (m.k === 'n' && !m.air) {
            const hit = F.conn === 1;
            if (hit && rnd() < P.combo) {
              if (m.ch && F.chain < 2 && rnd() < .55) press(m.crouch ? 2 : 5, rnd() < .5 ? LK : LP);
              else if (m.cn) { const s = (F.meter >= 100 && rnd() < P.superP) ? null : (sp(F, 'rush') || sp(F, 'proj') || sp(F, 'poke'));
                if (!s) queueSuper(F); else if (!queueMotion(F, s, 1)) press(m.crouch ? 2 : 5, LK); }
            } else if (!hit && m.ch && F.chain < 2 && rnd() < P.combo * .5) press(2, LK);
          } else if (m.k === 's' && F.conn === 1 && m.cn === 'u' && F.meter >= 100 && rnd() < P.superP) queueSuper(F);
        }
        if (A.q.length) { const e = A.q.shift(); return bits(F, e.d, e.b); }
        // ---- defence: projectiles (block, jump over, or answer with our own) and strikes we see coming ----
        const canAct = F.st === 'stand' || F.st === 'land' || F.st === 'block' || F.st === 'hit' || F.st === 'rise' || F.st === 'down';
        if (S.pd < 290 && S.pd > -10 && canAct) {
          const key = 'p' + S.pser;
          if (key !== A.blockKey) {
            A.blockKey = key; const r = rnd(); A.pjMode = r < P.block + .22 ? 'block' : r < P.block + .4 ? 'jump' : 'none';
            A.blockLow = S.plv === 'l' ? rnd() < P.lowGuess + .1 : rnd() > P.lowGuess + .1;
            if (A.pjMode === 'jump' && S.pd > 100 && F.st === 'stand') { const t = sp(F, 'tele'); if (t && rnd() < .5) queueMotion(F, t, 1); else press(Math.abs(S.x - F.x) < 330 ? 9 : 8, 0); A.pjMode = 'none'; }
          }
          if (A.pjMode === 'block' && F.st !== 'hit') return bits(F, A.blockLow ? 1 : 4, 0);
        } else if (S.mv && S.mv.hits.length && (S.ph === 'startup' || S.ph === 'active') && dist < 230 && canAct) {
          const key = 'm' + S.mser;
          if (key !== A.blockKey) { A.blockKey = key; A.blocking = rnd() < P.block; const over = S.air || S.mv.hits.some(h => h.lv === 'o');
            A.blockLow = over ? rnd() > P.lowGuess : S.low ? rnd() < P.lowGuess : rnd() > P.lowGuess; }
          if (A.blocking && F.st !== 'hit') return bits(F, A.blockLow ? 1 : 4, 0);
        } else if (S.air && S.vy < 0 && dist < 200 && canAct && A.aaGo === false && A.blockKey !== 'j' + S.mser + S.t) {
          // a jump-in we decided not to anti-air: block it standing (most of the time)
          if (rnd() < P.block) return bits(F, 4, 0);
        }
        if (F.st === 'block') return bits(F, A.blockLow ? 1 : 4, 0);
        if (!(F.st === 'stand' || F.st === 'land' || F.st === 'air')) { // wake-up reversal
          if (F.st === 'rise' && F.t >= 19 && dist < 140 && rnd() < P.reversal) { const s = sp(F, 'aa'); if (s && !s.v[1].gr) queueMotion(F, s, 1); }
          return 0;
        }
        // ---- in the air: a jump-in attack on the way down ----
        if (F.st === 'air') { if (!F.airAtk && F.vy < 0 && F.y < 95 && Math.abs(O.x - F.x) < 150) return bits(F, 5, rnd() < .6 ? HK : HP); return 0; }
        const me = F.C, pref = PREF[me.id] || 160;
        // ---- anti-air ----
        if (S.air && S.st !== 'fall' && (S.x - F.x) * F.face > -40 && dist < 240) {
          if (A.aaSer !== S.mser + ':' + Math.floor(now / 50)) { A.aaSer = S.mser + ':' + Math.floor(now / 50); A.aaGo = rnd() < P.aa; }
          if (A.aaGo) {
            const s = sp(F, 'aa');
            if (s && dist < 160 && S.y < 170) {
              if (s.in === 'cd' && !(F.cd >= 40 || F.cdS >= 40 && F.cdT < 8)) { if (dist < 90) { press(2, HP); return 0; } }
              else if (queueMotion(F, s, 1)) { A.aaGo = false; const e = A.q.shift(); return bits(F, e.d, e.b); }
            }
            if (dist < 95 && S.y < 150) { A.aaGo = false; return bits(F, 2, HP); }
            return bits(F, 4, 0);
          }
        }
        // ---- punish what whiffed ----
        if ((S.ph === 'recovery' && S.rec > 8) || (S.st === 'land' && S.rec > 4) || S.st === 'dizzy') {
          if (A.punSer !== S.mser + S.st) { A.punSer = S.mser + S.st; A.punGo = rnd() < (S.st === 'dizzy' ? .9 : P.punish); }
          if (A.punGo) {
            if (F.meter >= 100 && dist < 170 && rnd() < P.superP) { queueSuper(F); A.punGo = false; }
            else if (dist < 90 * me.reach + 20) { press(5, HP); A.punGo = false; }
            else if (dist < 120 * me.reach) { press(2, HK); A.punGo = false; }
            else { const s = sp(F, 'rush'); if (s && dist < 260 && queueMotion(F, s, 1)) A.punGo = false; }
            if (A.q.length) { const e = A.q.shift(); return bits(F, e.d, e.b); }
          }
        }
        // ---- neutral game ----
        if (now < A.next) return bits(F, A.idleDir, 0);
        A.next = now + P.think + Math.floor(rnd() * P.think);
        const r = rnd(), close = F.C.pw + O.C.pw + 26, myProj = !!F.proj;
        const ps = sp(F, 'proj'), pjRange = ps ? (ps.v[0].pj.life * ps.v[0].pj.vx + 40) : 0;
        if (me.charge) A.idleDir = 1;                          // the robot keeps its charge: crouching back
        else A.idleDir = 5;
        // super when it's close and safe-ish
        if (F.meter >= 100 && dist < 150 && r < P.superP * .25) { queueSuper(F); return 0; }
        if (dist <= close && S.st !== 'hit' && S.st !== 'block' && !S.air) {
          const g = sp(F, 'grab');
          if (r < P.throw) { press(rnd() < .5 ? 6 : 4, HP); return 0; }
          if (g && r < P.throw + .2) { queueMotion(F, g, rnd() < .5 ? 1 : 0); return 0; }
          const ct = sp(F, 'counter');
          if (ct && S.mv && S.ph === 'startup' && r < .3) { queueMotion(F, ct, 1); return 0; }
        }
        // pokes: only buttons that actually reach the front of the opponent
        const front = dist - 24 * O.C.W, reach = k => me.mv[k].hits[0].b[2];
        if (front < reach('cLK') + 6) {                          // close: quick pokes and little strings
          if (r < P.aggr) {
            const k = rnd(); if (k < .32) press(2, LK); else if (k < .5) press(5, LP); else if (k < .64) press(2, LP); else if (k < .78) press(5, HP); else if (k < .88) press(2, HK);
            else { const h = sp(F, 'hop') || sp(F, 'poke'); if (h) queueMotion(F, h, rnd() < .5 ? 1 : 0); else press(5, LK); }
            return 0;
          }
          A.idleDir = rnd() < .5 ? (me.charge ? 1 : 4) : 5; return bits(F, A.idleDir, 0);
        }
        if (S.throwing && dist > 140 && dist < 300 && r < P.punish * .6) { press(9, 0); return 0; }
        if (ps && !myProj && now > A.pjCool && dist > 190 && dist < pjRange && r < P.proj) { if (queueMotion(F, ps, rnd() < .5 ? 1 : 0)) { A.pjCool = now + 50 + Math.floor(rnd() * 90); return 0; } }
        const mid = ['sHK', 'cHK', 'sHP', 'sLK'].filter(k => reach(k) >= front - 4 && reach(k) <= front + 34);
        if (mid.length && r < P.aggr * .7) { const k = mid[Math.floor(rnd() * mid.length)]; press(k[0] === 'c' ? 2 : 5, { sHK: HK, cHK: HK, sHP: HP, sLK: LK }[k]); return 0; }
        if (dist < 230 && r < P.aggr * .2) { const s = rnd() < .5 ? sp(F, 'rush') : (sp(F, 'hop') || sp(F, 'tele')); if (s && queueMotion(F, s, rnd() < .5 ? 1 : 0)) return 0; }
        if (dist > 150 && dist < 280 && r < P.jump + (me.id === 'sol' || me.id === 'kiki' ? .05 : 0)) { press(9, 0); return 0; }
        // walk towards the distance this fighter likes (with some wobble), sometimes dash
        const want = pref * (.8 + rnd() * .5);
        if (dist > want + 30) {
          if (dist > 300 && rnd() < .12 && !me.charge) { press(6, 0); press(5, 0); press(6, 0); A.idleDir = 5; return 0; }
          A.idleDir = me.charge && rnd() < .5 ? 1 : 6;
        } else if (dist < want - 30) A.idleDir = me.charge ? 1 : (rnd() < .7 ? 4 : 5);
        else A.idleDir = me.charge ? 1 : (rnd() < P.aggr ? 6 : rnd() < .5 ? 5 : 4);
        return bits(F, A.idleDir, 0);
      };
      return A;
    }
    return { create, LV };
  })();

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

  /* ================= draw.js: camera, stage layers, fighters, projectiles, effects, HUD and banners =================
     Everything is drawn into one canvas. The stage is pre-painted into three layer canvases; text (names, banners,
     the timer) comes from a small sprite cache; effects live in a fixed pool, so a frame allocates next to nothing. */
  const Draw = (() => {
    const TAU = Math.PI * 2, VIEW_H = 440, FLOOR_PAD = 52, TOP = 480, BOT = -100;
    const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
    /* ---------- text sprites ---------- */
    const TXT = new Map();
    function text(str, px, fill, o = {}) {
      const key = str + '|' + px + '|' + fill + '|' + (o.stroke || '') + '|' + (o.w || 900) + (o.italic ? 'i' : '');
      let s = TXT.get(key); if (s) return s;
      const c = document.createElement('canvas'), g = c.getContext('2d'), sw = o.stroke ? Math.max(2, px * (o.sw || .16)) : 0;
      const font = `${o.italic ? 'italic ' : ''}${o.w || 900} ${px}px ${FONT}`; g.font = font;
      const w = Math.ceil(g.measureText(str).width + sw * 2 + 6), h = Math.ceil(px * 1.3 + sw * 2);
      c.width = w; c.height = h; g.font = font; g.textBaseline = 'middle'; g.textAlign = 'center'; g.lineJoin = 'round';
      if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = sw * 2; g.strokeText(str, w / 2, h / 2); }
      if (Array.isArray(fill)) { const gr = g.createLinearGradient(0, h * .2, 0, h * .8); fill.forEach((f, i) => gr.addColorStop(i / (fill.length - 1), f)); g.fillStyle = gr; } else g.fillStyle = fill;
      g.fillText(str, w / 2, h / 2);
      s = { c, w, h }; if (TXT.size > 400) TXT.clear(); TXT.set(key, s); return s;
    }
    const POWS = ['POW!', 'BAM!', 'KNAL!', 'BOEM!', 'PATS!', 'TOK!', 'WHAM!'];
    /* ---------- projectile sprites (painted once) ---------- */
    const SPR = {};
    function sprite(key, w, h, fn) { if (SPR[key]) return SPR[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); return (SPR[key] = c); }
    function pjSprite(k) {
      switch (k) {
        case 'golf': return sprite(k, 128, 128, (g, w, h) => { g.translate(64, 64);
          const gr = g.createLinearGradient(-50, 0, 50, 0); gr.addColorStop(0, 'rgba(60,150,230,0)'); gr.addColorStop(.6, '#3fa3ee'); gr.addColorStop(1, '#bfe8ff');
          g.fillStyle = gr; g.beginPath(); g.moveTo(-56, 40); g.quadraticCurveTo(10, 50, 34, 10); g.quadraticCurveTo(48, -30, 14, -52); g.quadraticCurveTo(50, -40, 52, 0); g.quadraticCurveTo(50, 46, -56, 40); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(14, -50); g.quadraticCurveTo(48, -36, 46, 4); g.stroke();
          g.fillStyle = '#fff'; for (const [x, y, r] of [[30, -54, 6], [44, -44, 5], [52, -26, 4], [-20, 44, 4], [4, 46, 5]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } });
        case 'waf': return sprite(k, 64, 64, (g) => { g.translate(32, 32); g.fillStyle = '#c98a3a'; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); g.strokeStyle = '#7a4a1a'; g.lineWidth = 3; g.stroke();
          g.save(); g.clip(); g.strokeStyle = 'rgba(110,60,20,.6)'; g.lineWidth = 2.5; for (let x = -30; x < 30; x += 8) { g.beginPath(); g.moveTo(x, -30); g.lineTo(x + 30, 30); g.moveTo(x + 30, -30); g.lineTo(x, 30); g.stroke(); } g.restore();
          g.fillStyle = 'rgba(255,230,160,.4)'; g.beginPath(); g.ellipse(-8, -10, 10, 5, -.6, 0, TAU); g.fill(); });
        case 'vuist': return sprite(k, 140, 64, (g) => { const fl = g.createLinearGradient(0, 0, 80, 0); fl.addColorStop(0, 'rgba(255,90,20,0)'); fl.addColorStop(.6, '#ff8a2a'); fl.addColorStop(1, '#ffe66a');
          g.fillStyle = fl; g.beginPath(); g.moveTo(4, 32); g.quadraticCurveTo(50, 8, 84, 22); g.lineTo(84, 42); g.quadraticCurveTo(50, 56, 4, 32); g.fill();
          g.fillStyle = '#a9bccf'; g.strokeStyle = '#1d1424'; g.lineWidth = 3; g.beginPath(); g.roundRect(78, 14, 40, 36, 10); g.fill(); g.stroke(); g.fillStyle = '#ff8a2a'; g.fillRect(110, 18, 6, 28); g.fillStyle = '#7d90a6'; g.fillRect(70, 20, 10, 24); });
        case 'zout': return sprite(k, 96, 96, (g) => { g.translate(48, 48); for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 8 + (i * 7) % 30; g.fillStyle = `rgba(255,255,255,${.5 + (i % 3) * .2})`; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r * .8, 3 + (i % 4), 0, TAU); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill(); });
        case 'ster': return sprite(k, 48, 48, (g) => { g.translate(24, 24); g.fillStyle = '#c9d2e0'; g.strokeStyle = '#1d1424'; g.lineWidth = 2.4; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 20, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#3a3a4a'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); });
        case 'klap': return sprite(k, 120, 80, (g) => { const gr = g.createLinearGradient(0, 80, 0, 0); gr.addColorStop(0, '#ffcf3a'); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr;
          g.beginPath(); g.moveTo(0, 80); g.quadraticCurveTo(30, 10, 60, 0); g.quadraticCurveTo(90, 10, 120, 80); g.fill(); g.fillStyle = '#8a6a4a'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(14 + i * 13, 64 - (i % 3) * 14, 5, 0, TAU); g.fill(); } });
        case 'nevel': return sprite(k, 112, 112, (g) => { g.translate(56, 56); const gr = g.createRadialGradient(0, 0, 4, 0, 0, 54); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, '#e0a0ff'); gr.addColorStop(.6, 'rgba(150,60,220,.75)'); gr.addColorStop(1, 'rgba(90,30,160,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 54, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, 22 + i * 9, i * 2, i * 2 + 2); g.stroke(); } });
      }
      return null;
    }
    /* ---------- the renderer ----------
       Most of what moves is composited, not painted: the stage layers and their animated bits (sails, boats,
       lanterns...) are canvases painted once and moved with CSS transforms; each fighter has its own small canvas that
       gets a cached pose bitmap only when the pose changes; projectiles are images; the HUD, banners and texts are
       HTML. Only sparks, dust, afterimages and dizzy stars are drawn per frame, as small bitmaps on one canvas. */
    function create(cv, host) {
      const g = cv.getContext('2d');
      const css = 'position:absolute;left:0;top:0;pointer-events:none;transform-origin:0 0';
      const el = (tag, extra, cls) => { const e = document.createElement(tag); e.style.cssText = css + ';' + (extra || ''); if (cls) e.className = cls; return e; };
      const shadows = [0, 1].map(() => el('div', 'width:100px;height:24px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.42),rgba(0,0,0,.25) 60%,rgba(0,0,0,0));will-change:transform,opacity'));
      const dimEl = el('div', 'width:100%;height:100%;background:rgba(8,4,20,.58);opacity:0;transition:opacity .12s');
      const raysEl = el('div', 'width:200px;height:200px;border-radius:50%;opacity:0;background:repeating-conic-gradient(rgba(255,220,90,.28) 0deg 9deg,rgba(255,220,90,0) 9deg 30deg);will-change:transform;transform-origin:100px 100px');
      const fcs = [0, 1].map(() => el('div', ''));   // one holder per fighter; each cached pose is its own canvas in it
      const pjLayer = el('div', 'width:100%;height:100%;overflow:hidden');
      const fxLayer = el('div', 'width:100%;height:100%;overflow:hidden'), afterLayer = el('div', 'width:100%;height:100%;overflow:hidden');
      const flashEl = el('div', 'width:100%;height:100%;background:#fff;opacity:0');
      const hud = document.createElement('div'); hud.className = 'vdh';
      hud.innerHTML = [0, 1].map(i => `<div class="vdh-side ${i ? 'r' : 'l'}"><div class="vdh-bar"><b></b><i></i></div><div class="vdh-row"><span class="vdh-name"></span><span class="vdh-meter"><i></i><em>SUPER</em></span><span class="vdh-stars"><s></s><s></s></span></div></div>`).join('')
        + '<div class="vdh-timer"></div><div class="vdh-combo l"></div><div class="vdh-combo r"></div><div class="vdh-super"></div><div class="vdh-ban"></div><div class="vdh-ban"></div><div class="vdh-inputs"></div>';
      // order: stage layers, shadows, dim, rays, afterimages, fighters, projectiles, effects, (VS canvas), HUD, flash
      for (const e of [...shadows, dimEl, raysEl, afterLayer, ...fcs, pjLayer, fxLayer]) host.insertBefore(e, cv);
      cv.after(hud); hud.after(flashEl);
      const H$ = q => hud.querySelector(q), sides = [...hud.querySelectorAll('.vdh-side')].map(s => ({ s, bar: s.querySelector('.vdh-bar'), tr: s.querySelector('.vdh-bar b'), hp: s.querySelector('.vdh-bar i'), nm: s.querySelector('.vdh-name'),
        mt: s.querySelector('.vdh-meter'), mi: s.querySelector('.vdh-meter i'), st: [...s.querySelectorAll('.vdh-stars s')], k: {} }));
      const timerEl = H$('.vdh-timer'), comboEls = [...hud.querySelectorAll('.vdh-combo')], superEl = H$('.vdh-super'), banEls = [...hud.querySelectorAll('.vdh-ban')], inputsEl = H$('.vdh-inputs');
      // per fighter: the pose shown (s), the element showing it (el) and a 'fresh' canvas for poses whose image is not ready yet
      const fstate = fcs.map(c => { const fc = el('canvas', 'will-change:transform;visibility:hidden'); fc.width = fc.height = 2; c.appendChild(fc); return { c, fc, fg: fc.getContext('2d'), fresh: null, fw: 0, fh: 0, s: null, el: null, vis: '' }; });
      const unshow = f => { if (f.el) f.el.style.visibility = 'hidden'; f.el = null; f.s = null; };
      const R = { cv, g, fcs, hud, layerEls: {}, W: 1, H: 1, dpr: 1, cd: 1, hi: false, zb: 1, z: 1, camX: 600, shakeT: 0, shakeA: 0, stage: null, layers: null, fx: [], t: 0,
        after: [[], []], optShake: true, poseEvery: 2, level: 0, budget: 1, trail: [1, 1], cvDirty: true, order: '', sprites: [], tick: null, banI: 0, hk: {} };
      for (let i = 0; i < 160; i++) R.fx.push({ on: false });
      function sizeCv() { R.cd = R.hi ? R.dpr : Math.min(1, R.dpr); cv.width = Math.round(R.W * R.cd); cv.height = Math.round(R.H * R.cd); R.cvDirty = true; }
      R.resize = (W, H, dpr) => {
        R.W = W; R.H = H; R.dpr = dpr; sizeCv();
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        R.zb = H / VIEW_H; R.floorY = H - FLOOR_PAD * R.zb; R.layers = null; R.hk = {};
        hud.style.setProperty('--s', Math.min(1.25, Math.max(.7, H / 400)).toFixed(3));
        const S = R.zb * Math.min(dpr, 1.6) * (R.level >= 2 ? .72 : 1.02); if (Math.abs(S - (R.sprS || 0)) > 1e-3) { R.sprS = S; flushSprites(); } R.sprBudget = 10e6;
      };
      R.hiRes = on => { if (R.hi !== on) { R.hi = on; sizeCv(); } cv.style.visibility = on ? '' : 'hidden'; };   // only the VS screen draws on the canvas (full resolution)
      R.setStage = id => { R.stage = Stages.S[id] || Stages.S.haven; R.stageId = id; R.layers = null; };
      // A canvas layer is re-sent to the compositor on every frame, so everything painted once becomes an <img>
      // (blob URL) as soon as it is encoded and decoded; until then the canvas itself is shown.
      // (encoded off the main thread by toBlob; read back as a data URL, which costs less than a blob URL here)
      function blobImg(c, done) {
        if (!c.toBlob || typeof FileReader === 'undefined' || window.__vdNoImg) return;
        c.toBlob(b => { if (!b) return; const fr = new FileReader();
          fr.onload = () => { const im = new Image(); im.src = fr.result; (im.decode ? im.decode() : Promise.resolve()).then(() => done(im, null), () => {}); };
          fr.readAsDataURL(b); });
      }
      function toImg(c, apply) { blobImg(c, im => { if (!c.isConnected) return; im.style.cssText = c.style.cssText; c.replaceWith(im); apply(im, null); }); }
      const unuse = o => { o.c.remove(); };
      function buildLayers() {
        const zr = Math.min(R.zb * 1.1 * R.dpr, 1.6), half = R.W / (2 * R.zb) + 30, L = { zr };
        for (const s of R.sprites) unuse(s); R.sprites = [];
        for (const [name, p] of [['far', .25], ['mid', .55], ['floor', 1]]) {
          const u0 = Math.floor(half * p - half - 20), u1 = Math.ceil((Core.SW - half) * p + half + 20), c = document.createElement('canvas');
          c.width = Math.ceil((u1 - u0) * zr); c.height = Math.ceil((TOP - BOT) * zr);
          const lg = c.getContext('2d'); lg.setTransform(zr, 0, 0, -zr, -u0 * zr, TOP * zr);
          try { R.stage[name](lg, u0, u1); } catch (e) { console.error(e); }
          L[name] = { c, u0, u1, p, tf: '' };
          const old = R.layerEls[name]; if (old) old.remove();
          c.style.cssText = css + ';will-change:transform'; R.layerEls[name] = c;
          toImg(c, im => { L[name].c = im; if (R.layerEls[name] === c) R.layerEls[name] = im; });
          host.insertBefore(c, shadows[0]);
        }
        R.layers = L;
        // the stage's moving bits: little canvases painted once, placed every frame
        const before = { far: L.mid.c, mid: L.floor.c, floor: shadows[0] };
        const add = (layer, box, paint) => {
          const c = document.createElement('canvas'), w = Math.max(1, Math.ceil((box[2] - box[0]) * zr)), h = Math.max(1, Math.ceil((box[3] - box[1]) * zr));
          c.width = w; c.height = h; const sg = c.getContext('2d'); sg.setTransform(zr, 0, 0, -zr, -box[0] * zr, box[3] * zr);
          try { paint(sg); } catch (e) { console.error(e); }
          c.style.cssText = css + ';will-change:transform';
          host.insertBefore(c, before[layer]);
          const s = { c, l: L[layer], box, u: 0, y: 0, rot: 0, sx: 1, sy: 1, op: 1, tf: '', ops: '1', set(u, y, rot = 0, sx = 1, sy = 1, op = 1) { this.u = u; this.y = y; this.rot = rot; this.sx = sx; this.sy = sy; this.op = op; } };
          R.sprites.push(s); toImg(c, im => { s.c = im; }); return s;
        };
        R.tick = null; try { R.tick = R.stage.sprites ? R.stage.sprites(add, L) : null; } catch (e) { console.error(e); }
      }
      R.reset = () => { R.fx.forEach(fxFree); AFT.forEach(afterOff); STEL.forEach(e => { if (!e.style.visibility) e.style.visibility = 'hidden'; }); R.shakeT = 0; R.snap = true; R.trail = [1, 1]; R.hk = {};
        banEls.forEach(b => { b.className = 'vdh-ban'; }); comboEls.forEach(c => { c.className = c.className.replace(/ pop/, ''); }); superEl.className = 'vdh-super'; inputsEl.textContent = ''; flashEl.style.opacity = '0'; dimEl.style.opacity = '0'; raysEl.style.opacity = '0'; };
      R.clearHud = () => { hud.style.visibility = 'hidden'; };
      R.layersVisible = on => { const v = on ? '' : 'hidden'; for (const k in R.layerEls) R.layerEls[k].style.visibility = v; for (const s of R.sprites) s.c.style.visibility = v; for (const e of [hud, pjLayer, fxLayer, afterLayer, ...shadows, ...fcs, dimEl, raysEl]) e.style.visibility = v; if (on) fstate.forEach(f => { f.vis = ''; }); };
      // ---- effects ----
      // every effect is a small pooled DOM element (img or div) with its own compositor layer: only those little
      // rectangles change on screen, never a full-screen canvas
      function fx(type, x, y, o) { let f = null; for (const e of R.fx) if (!e.on) { f = e; break; } if (!f) { f = R.fx[(Math.random() * R.fx.length) | 0]; fxFree(f); }
        f.on = true; f.type = type; f.x = x; f.y = y; f.t = 0; f.life = o.life || 20; f.vx = o.vx || 0; f.vy = o.vy || 0; f.s = o.s || 1; f.c = o.c || '#fff'; f.a = o.a || 0; f.spr = o.spr || null; f.g = o.g || 0;
        const src = type === 'spark' ? sparkU(f.c) : type === 'ring' ? ringU(f.c | 0) : type === 'block' ? blockU() : type === 'pow' ? f.spr.url : type === 'streak' ? '#' + f.c
          : blobU(type === 'dust' ? '#d8d0c4' : type === 'smoke' ? (f.c !== '#fff' ? f.c : '#e6e2ee') : f.c);
        f.src = src; f.e = fxEl(src); f.bw = type === 'pow' ? f.spr.w : BASE[src] || 64; f.bh = type === 'pow' ? f.spr.h : f.bw; f.ts = ''; f.os = '';
        return f; }
      R.shake = (a, t) => { if (!R.optShake) return; R.shakeA = Math.max(R.shakeA, a); R.shakeT = Math.max(R.shakeT, t); };
      // banners and texts: HTML with CSS animations (the compositor animates them)
      function restart(e, cls) { e.className = cls; void e.offsetWidth; e.className = cls + ' on'; }
      for (const e of [...banEls, ...comboEls, superEl]) e.addEventListener('animationend', () => { e.classList.remove('on'); });   // hidden again: nothing left to composite
      R.banner = (str, o = {}) => { const e = banEls[R.banI++ % 2]; e.textContent = str; e.style.setProperty('--b', (o.big || 1).toFixed(2)); e.style.setProperty('--d', ((o.life || 70) / 60).toFixed(2) + 's'); restart(e, 'vdh-ban ' + (o.kind || 'gold')); };
      R.event = (M, e) => {
        const P = M.P;
        switch (e.t) {
          case 'hit': { const V = P[e.side], a = e.a, heavy = a.heavy;
            V.hl = a.y < 105 ? 'b' : 'h'; V.vflash = 3;
            fx('spark', a.x, a.y, { life: heavy ? 16 : 11, s: heavy ? 1.5 : 1, c: a.kind === 'u' ? 1 : 0 });
            for (let i = 0; i < (heavy ? 7 : 4); i++) { const an = Math.random() * TAU, sp = 3 + Math.random() * 5; fx('streak', a.x, a.y, { vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 10 + Math.random() * 6, c: i % 2 ? '#ffd23a' : '#fff' }); }
            if (heavy && R.t - (R.powT || -99) > 16) { R.powT = R.t; fx('pow', a.x + (Math.random() - .5) * 30, a.y + 40, { life: 34, spr: textBmp(POWS[(Math.random() * POWS.length) | 0]), a: (Math.random() - .5) * .4 }); }
            if (heavy) R.shake(a.kind === 'u' ? 7 : 5, 10);
            if (a.combo >= 2) { const c = comboEls[1 - e.side]; c.textContent = a.combo + ' treffers!'; restart(c, 'vdh-combo ' + (e.side ? 'l' : 'r')); }
            break; }
          case 'block': fx('block', e.a.x, e.a.y, { life: 12, s: e.a.heavy ? 1.3 : 1 }); break;
          case 'throwhit': fx('spark', e.a.x, e.a.y, { life: 16, s: 1.6 }); R.powT = R.t; fx('pow', e.a.x, e.a.y + 50, { life: 34, spr: textBmp(e.a.last ? 'WORP!' : 'HUP!'), a: -.1 }); R.shake(6, 12); break;
          case 'down': for (let i = 0; i < 6; i++) fx('dust', e.a.x + (Math.random() - .5) * 70, 6, { vx: (Math.random() - .5) * 3, vy: Math.random() * 1.5, life: 26, s: 1 + Math.random() }); R.shake(4, 8); break;
          case 'land': case 'dash': { const F = P[e.side]; for (let i = 0; i < 3; i++) fx('dust', F.x + (Math.random() - .5) * 40, 4, { vx: (Math.random() - .5) * 2, vy: Math.random(), life: 18, s: .7 }); break; }
          case 'clash': fx('ring', e.a.x, e.a.y, { life: 18, s: 1.2 }); fx('spark', e.a.x, e.a.y, { life: 14, s: 1.4 }); break;
          case 'super': { const F = P[e.side]; superEl.textContent = e.a.nm + '!'; restart(superEl, 'vdh-super ' + (e.side ? 'r' : 'l')); fx('ring', F.x, F.y + 110, { life: 40, s: 3, c: 1 }); break; }
          case 'ko': R.flashT = 12; R.shake(9, 22); R.banner('K.O.!', { life: 120, big: 1.5, kind: 'red' }); fx('ring', e.a.x, e.a.y, { life: 30, s: 3.5 }); break;
          case 'round': R.banner(e.a.final ? 'Laatste ronde' : 'Ronde ' + e.a.n, { life: 55 }); break;
          case 'fight': R.banner('Vecht!', { life: 50, big: 1.4 }); break;
          case 'timeup': R.banner('Tijd!', { life: 100, big: 1.3 }); break;
          case 'doubleko': R.banner('Dubbel K.O.!', { life: 100 }); break;
          case 'tech': fx('ring', P[e.side].x, 110, { life: 16, s: 1.2, c: 2 }); R.banner('Losgebroken!', { life: 40, big: .6, kind: 'blue' }); break;
          case 'counter': fx('ring', e.a.x, e.a.y, { life: 20, s: 1.6, c: 1 }); R.banner('Tegenzet!', { life: 40, big: .6 }); break;
          case 'armor': fx('ring', e.a.x, e.a.y, { life: 14, s: 1.1, c: 1 }); break;
          case 'tele': for (let i = 0; i < 10; i++) fx('smoke', e.a.x + (Math.random() - .5) * 50, 40 + Math.random() * 120, { vx: (Math.random() - .5) * 2, vy: Math.random() * 1.5, life: 26, s: 1 + Math.random() }); break;
          case 'dizzy': R.banner('Duizelig!', { life: 40, big: .6, kind: 'blue' }); break;
          case 'pjgone': if (e.a.k === 'waf' || e.a.k === 'klap') fx('dust', e.a.x, 4, { life: 18, s: 1 }); else fx('ring', e.a.x, e.a.y, { life: 10, s: .6 }); break;
          case 'roundend': if (e.a.perfect) R.banner('Perfect!', { life: 90, big: 1.2, kind: 'blue' }); break;
        }
      };
      // ---- camera ----
      function camera(M) {
        const [A, B] = M.P, sep = Math.abs(A.x - B.x);
        const zt = R.zb * (1 + Math.max(0, Math.min(1, (420 - sep) / 300)) * .07), mid = (A.x + B.x) / 2;
        R.z = R.snap ? zt : R.z + (zt - R.z) * .08;
        const half = R.W / (2 * R.z), ct = Math.max(half, Math.min(Core.SW - half, mid));
        R.camX = R.snap ? ct : R.camX + (ct - R.camX) * .18; R.camX = Math.max(half, Math.min(Core.SW - half, R.camX)); R.snap = false;
        R.sx = 0; R.sy = 0;
        if (R.shakeT > 0) { R.shakeT--; R.sx = (Math.random() - .5) * 2 * R.shakeA; R.sy = (Math.random() - .5) * 2 * R.shakeA * .6; R.shakeA *= .9; }
      }
      const W2 = [0, 0], W2S = (x, y) => { W2[0] = R.W / 2 + (x - R.camX) * R.z + R.sx; W2[1] = R.floorY - y * R.z + R.sy; return W2; };
      const f1 = v => Math.round(v * 10) / 10;
      // ---- the frame ----
      const BT = new Float64Array(6), PO = { alpha: 1, after: 0, stars: 0, time: 0, flash: false, vx: 0 };
      R.frame = (M, opt) => {
        R.t++; const t = R.t;
        if (!R.layers) buildLayers();
        camera(M);
        const L = R.layers;
        for (const name of ['far', 'mid', 'floor']) place(L[name]);
        if (R.tick) { try { R.tick(t); } catch (e) {} for (const s of R.sprites) placeSprite(s); }
        // super flash: dim the world, rays behind the one doing the super
        const fl = M.fl; dimEl.style.opacity = fl ? '1' : '0';
        if (fl) { const F = M.P[fl.side], [x, y] = W2S(F.x, F.y + 100), r = Math.max(R.W, R.H) * 1.2; raysEl.style.opacity = '1'; raysEl.style.transform = `translate3d(${f1(x - 100)}px,${f1(y - 100)}px,0) rotate(${(t * 2) % 360}deg) scale(${(r / 100).toFixed(3)})`; }
        else if (raysEl.style.opacity !== '0') raysEl.style.opacity = '0';
        // shadows
        for (let i = 0; i < 2; i++) { const F = M.P[i], [x, y] = W2S(F.x, 0), k = Math.max(.25, 1 - F.y / 260), w = .92 * F.C.W * R.z * k;
          const tf = `translate3d(${f1(x - 50 * w)}px,${f1(y - 10 * w)}px,0) scale(${w.toFixed(3)})`; if (shadows[i].tf !== tf) { shadows[i].tf = tf; shadows[i].style.transform = tf; shadows[i].style.opacity = (k * .95).toFixed(2); } }
        // fighters: the one attacking on top
        const order = M.P[0].st === 'move' || M.P[0].st === 'throw' ? '10' : '01';
        if (order !== R.order) { R.order = order; host.insertBefore(fcs[+order[1]], pjLayer); }
        R.budget = R.level >= 2 ? (t % 2 ? 0 : 1) : R.level >= 1 ? 1 : 2;
        drawFighters(M);
        projectiles(M);
        // effects canvas: only when there is something on it
        if (R.cvDirty && !R.hi) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); R.cvDirty = false; }
        domFx(); afterimages(); stars();
        if (R.flashT > 0) R.flashT--; const fo = R.flashT > 0 ? (R.flashT / 12 * .7).toFixed(2) : '0'; if (flashEl.style.opacity !== fo) flashEl.style.opacity = fo;
        if (!opt.noHud) { if (hud.style.visibility) hud.style.visibility = ''; hudUpdate(M, opt); } else if (!hud.style.visibility) hud.style.visibility = 'hidden';
      };
      function place(l) {                                        // move a layer canvas with a CSS transform
        const z = R.z, k = z / R.layers.zr, x = R.W / 2 + (l.u0 - R.camX * l.p) * z + R.sx, y = R.floorY - TOP * z + R.sy;
        const tf = `translate3d(${f1(x)}px,${f1(y)}px,0) scale(${k.toFixed(5)})`;
        if (tf !== l.tf) { l.tf = tf; l.c.style.transform = tf; }
      }
      function placeSprite(s) {
        const z = R.z, zr = R.layers.zr, k = z / zr, X = R.W / 2 + (s.u - R.camX * s.l.p) * z + R.sx, Y = R.floorY - s.y * z + R.sy;
        const tf = `translate3d(${f1(X)}px,${f1(Y)}px,0)${s.rot ? ` rotate(${(-s.rot).toFixed(1)}deg)` : ''} scale(${(k * s.sx).toFixed(4)},${(k * s.sy).toFixed(4)}) translate(${f1(s.box[0] * zr)}px,${f1(-s.box[3] * zr)}px)`;
        if (tf !== s.tf) { s.tf = tf; s.c.style.transform = tf; }
        const op = s.op >= 1 ? '1' : s.op.toFixed(2); if (op !== s.ops) { s.ops = op; s.c.style.opacity = op; s.c.style.visibility = s.op <= 0 ? 'hidden' : ''; }
      }
      // ---- fighter sprites: every (quantised) pose is painted once into a bitmap ----
      const SPRC = new Map(), BB = new Float64Array(4); let sprPx = 0;
      R.spriteStats = () => ({ n: SPRC.size, px: sprPx, hits: R.hits || 0, miss: R.miss || 0 });
      const PO2 = { alpha: 1, after: 0, stars: 0, time: 0, flash: false, vx: 0 };
      // New poses are painted here, at most a few per frame (R.budget); when the budget is used up the fighter keeps the
      // pose it had for a frame. (Web workers are not allowed by the app's content security policy.) A new pose is shown at
      // once on the fighter's 'fresh' canvas and encoded in the background into an <img>; cached poses are those images,
      // so showing one only flips visibility and nothing is re-uploaded to the compositor.
      function drop(e) { e.dead = true; if (e.c) unuse(e); e.tmp = null; sprPx -= e.px; }
      function trim() { for (const [k2, e] of SPRC) { if (sprPx <= R.sprBudget || SPRC.size <= 8) break; if (fstate[e.i].s === e) continue; SPRC.delete(k2); drop(e); } }
      function toFresh(f, s) {
        const c = f.fc; if (c.width < s.w || c.height < s.h) { c.width = Math.max(c.width, s.w + 40); c.height = Math.max(c.height, s.h + 40); } else f.fg.clearRect(0, 0, f.fw + 1, f.fh + 1);
        f.fg.drawImage(s.tmp, 0, 0); f.fw = s.w; f.fh = s.h; f.fresh = s; c.__tf = '';
      }
      function sprite(i, F, p, flash, force) {
        const C = F.C, f = fstate[i], q = Rig.quant(p), ph = Rig.cloth(C) ? (Math.floor(R.t / 12) % 8) : 0, mv = C.id === 'kiki' && Math.abs(F.vx) > 1 ? 'm' : '';
        const key = i + Rig.keyOf(C, F.pal, q, ph, mv + (flash ? 'F' : ''));
        let s = SPRC.get(key);
        if (s) { SPRC.delete(key); SPRC.set(key, s);
          if (s.c || f.fresh === s) { R.hits = (R.hits || 0) + 1; return s; }
          if (s.tmp && (force || R.budget > 0)) { R.budget--; toFresh(f, s); return s; }   // image still on its way: show the painted copy
          return null; }
        if (R.budget <= 0 && !force) return null;             // raster budget used up: keep the previous pose for a frame
        const S = R.sprS, b = Rig.bounds(C, F.pal, q, BB), w = Math.max(2, Math.ceil((b[2] - b[0]) * S)), h = Math.max(2, Math.ceil((b[3] - b[1]) * S));
        R.budget--; R.miss = (R.miss || 0) + 1;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        Rig.baseT(BT, S, -b[0] * S, b[3] * S, 1); PO2.time = ph * 12; PO2.vx = mv ? 6 : 0; PO2.flash = flash;
        Rig.draw(c.getContext('2d'), BT, C, F.pal, q, PO2);
        s = { c: null, tmp: c, i, ox: -b[0] * S, oy: b[3] * S, w, h, px: w * h, op: '' }; SPRC.set(key, s); sprPx += s.px;
        toFresh(f, s);
        const done = im => { im.style.cssText = css + ';will-change:transform;visibility:hidden'; fcs[i].appendChild(im); s.c = im; s.tmp = null; };
        blobImg(c, im => { if (!s.dead) done(im); });
        trim();
        return s;
      }
      function flushSprites() { fstate.forEach(unshow); for (const e of SPRC.values()) drop(e); SPRC.clear(); sprPx = 0; }
      R.flushSprites = flushSprites;
      const STARS = [null, null];
      function drawFighters(M) {
        for (let i = 0; i < 2; i++) {
          const F = M.P[i], f = fstate[i], o = PO; o.time = R.t; o.vx = F.vx; o.flash = F.vflash > 0; if (F.vflash > 0) F.vflash--;
          if (F.st === 'stand' && F.walk) F.wph = (F.wph || 0) + Math.abs(F.vx) * 3.6;
          const sk = F.st + (F.mv ? F.mv.id : '') + F.mser + F.face + o.flash;
          let p;
          if (R.t % R.poseEvery && f.p && f.sk === sk && !o.flash) { p = f.p; o.alpha = f.alpha; o.after = f.after; o.stars = f.stars; }   // poses animate at 30 fps, positions at 60
          else { p = Rig.poseOf(F, M, o); f.p = f.p || Rig.P({}); Rig.copy(f.p, p); p = f.p; f.sk = sk; f.alpha = o.alpha; f.after = o.after; f.stars = o.stars; }
          const vis = F.hid || o.alpha <= .02 ? 'hidden' : '';
          if (vis !== f.vis) { f.vis = vis; f.c.style.visibility = vis; }
          STARS[i] = o.stars ? { s: o.stars, h: Rig.headOf(F.C, p).slice(), F } : null;
          const A = AFT[i];
          if (!(o.after && !F.hid) && A.on) afterOff(A);
          if (vis) continue;
          let s = sprite(i, F, p, o.flash, !f.s) || f.s;
          if (!s.c && f.fresh !== s) { s = sprite(i, F, p, o.flash, true) || s; if (!s.c && f.fresh !== s) continue; }
          if (o.after && R.t % 3 === 0) afterPush(A, F, s);
          const e = s.c || f.fc, sh = F.shake > 0 && F.freeze > 0 ? (R.t % 2 ? 2.5 : -2.5) : 0, [x, y] = W2S(F.x + sh, F.y), k = R.z / R.sprS;
          const tf = `translate3d(${f1(x)}px,${f1(y)}px,0) scale(${(k * F.face).toFixed(4)},${k.toFixed(4)}) translate(${f1(-s.ox)}px,${f1(-s.oy)}px)`;
          if (tf !== e.__tf) { e.__tf = tf; e.style.transform = tf; }
          const op = o.alpha < 1 ? o.alpha.toFixed(2) : '';
          if (op !== (e.__op || '')) { e.__op = op; e.style.opacity = op; }
          if (e !== f.el) { if (f.el) f.el.style.visibility = 'hidden'; e.style.visibility = ''; f.el = e; }
          f.s = s;
        }
      }
      // afterimages: a few small canvases per fighter holding copies of recent pose bitmaps, faded out
      const AFT = [0, 1].map(() => ({ on: false, n: 0, c: [0, 1, 2, 3].map(() => { const c = el('canvas', 'will-change:transform,opacity;visibility:hidden'); afterLayer.appendChild(c); return { c, g: c.getContext('2d'), age: 99, x: 0, y: 0, face: 1, ox: 0, oy: 0, tf: '', op: '' }; }) }));
      function afterOff(A) { A.on = false; for (const a of A.c) { a.age = 99; if (!a.c.style.visibility) a.c.style.visibility = 'hidden'; } }
      function afterPush(A, F, s) {
        const a = A.c[A.n++ % A.c.length], c = a.c; A.on = true;
        if (c.width < s.w || c.height < s.h) { c.width = Math.max(c.width, s.w + 32); c.height = Math.max(c.height, s.h + 32); } else a.g.clearRect(0, 0, c.width, c.height);
        a.g.drawImage(s.c || s.tmp, 0, 0); a.age = 0; a.x = F.x; a.y = F.y; a.face = F.face; a.ox = s.ox; a.oy = s.oy;
        for (const b of A.c) if (b !== a) b.age++;
      }
      function afterimages() {
        const k = R.z / R.sprS;
        for (const A of AFT) { if (!A.on) continue;
          for (const a of A.c) { const vis = a.age < 4 ? '' : 'hidden'; if (a.c.style.visibility !== vis) a.c.style.visibility = vis; if (vis) continue;
            const [x, y] = W2S(a.x, a.y), tf = `translate3d(${f1(x)}px,${f1(y)}px,0) scale(${(k * a.face).toFixed(4)},${k.toFixed(4)}) translate(${f1(-a.ox)}px,${f1(-a.oy)}px)`;
            if (tf !== a.tf) { a.tf = tf; a.c.style.transform = tf; }
            const op = (.34 - a.age * .07).toFixed(2); if (op !== a.op) { a.op = op; a.c.style.opacity = op; } } }
      }
      // particle images (painted once, used as data URLs)
      const PU = {}, BASE = {}, POOLS = {};
      function durl(key, size, paint) { if (PU[key]) return PU[key]; const c = document.createElement('canvas'); c.width = c.height = size; paint(c.getContext('2d'), size / 2); const u = c.toDataURL(); BASE[u] = size; return (PU[key] = u); }
      const sparkU = k => durl('sp' + k, 128, (q, r) => { q.translate(r, r); q.fillStyle = k === 1 ? '#ffe36a' : '#fff6c0'; q.beginPath(); for (let i = 0; i < 16; i++) { const rr = i % 2 ? r * .38 : r * .96, a = i * Math.PI / 8; q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.closePath(); q.fill(); q.fillStyle = '#fff'; q.beginPath(); q.arc(0, 0, r * .3, 0, TAU); q.fill(); });
      const ringU = k => durl('rg' + k, 128, (q, r) => { q.strokeStyle = ['#ffffff', '#ffe36a', '#9ae0ff'][k] || '#fff'; q.lineWidth = r * .12; q.beginPath(); q.arc(r, r, r * .9, 0, TAU); q.stroke(); });
      const blockU = () => durl('bk', 128, (q, r) => { q.strokeStyle = '#9ae0ff'; q.lineCap = 'round'; q.lineWidth = r * .14; q.beginPath(); q.arc(r, r, r * .82, -1.1, 1.1); q.stroke(); q.strokeStyle = '#fff'; q.lineWidth = r * .05; q.beginPath(); q.arc(r, r, r * .82, -.9, .9); q.stroke(); });
      const blobU = c => durl('bl' + c, 64, (q, r) => { const gr = q.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, c); gr.addColorStop(.7, c); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.beginPath(); q.arc(r, r, r, 0, TAU); q.fill(); });
      const starU = c => durl('st' + c, 32, (q, r) => starShape(q, r, r, r * .92, c));
      function fxEl(src) {
        const pool = POOLS[src] || (POOLS[src] = []); let e = pool.pop();
        if (e) { e.style.visibility = ''; return e; }
        if (src[0] === '#') { e = el('div', `width:20px;height:4px;border-radius:2px;background:${src.slice(1)};will-change:transform,opacity`); }
        else { e = el('img', 'will-change:transform,opacity'); e.src = src; }
        fxLayer.appendChild(e); return e;
      }
      function fxFree(f) { if (f.e) { f.e.style.visibility = 'hidden'; (POOLS[f.src] || (POOLS[f.src] = [])).push(f.e); f.e = null; } f.on = false; }
      function domFx() {
        const z = R.z;
        for (const f of R.fx) {
          if (!f.on) continue;
          f.t++; if (f.t > f.life) { fxFree(f); continue; }
          const u = f.t / f.life;
          f.x += f.vx; f.y += f.vy; f.vy -= f.g;
          const [X, Y] = W2S(f.x, f.y); let tf, op = 1 - u, r = 0, rot = 0;
          switch (f.type) {
            case 'spark': r = (16 + 40 * Math.sqrt(u)) * f.s * z; rot = f.t * .05; break;
            case 'streak': { const dx = -f.vx * 3 * z, dy = f.vy * 3 * z, len = Math.max(4, Math.hypot(dx, dy) + 3 * z);
              tf = `translate3d(${f1(X)}px,${f1(Y)}px,0) rotate(${Math.atan2(dy, dx).toFixed(3)}rad) scale(${(len / 20).toFixed(3)},${(.75 * z).toFixed(3)}) translate(-2px,-2px)`; break; }
            case 'pow': { const sc = (u < .15 ? .4 + u / .15 * .8 : 1.2 - (u - .15) * .3) * z * .9; op = u > .7 ? (1 - u) / .3 : 1;
              tf = `translate3d(${f1(X)}px,${f1(Y - u * 20 * z)}px,0) rotate(${f.a.toFixed(3)}rad) scale(${sc.toFixed(3)}) translate(${f1(-f.bw / 2)}px,${f1(-f.bh / 2)}px)`; break; }
            case 'block': r = (22 + 20 * u) * f.s * z; break;
            case 'dust': r = (8 + 16 * u) * f.s * z; op = .5 * (1 - u); break;
            case 'smoke': r = (10 + 18 * u) * f.s * z; op = .55 * (1 - u); break;
            case 'ring': r = (10 + 60 * Math.sqrt(u)) * f.s * z; break;
            case 'drop': r = 3 * z; break;
          }
          if (!tf) tf = `translate3d(${f1(X)}px,${f1(Y)}px,0)${rot ? ` rotate(${rot.toFixed(2)}rad)` : ''} scale(${(2 * r / f.bw).toFixed(3)}) translate(${-f.bw / 2}px,${-f.bw / 2}px)`;
          if (tf !== f.ts) { f.ts = tf; f.e.style.transform = tf; }
          const os = op.toFixed(2); if (os !== f.os) { f.os = os; f.e.style.opacity = os; }
        }
      }
      // dizzy stars circling the head
      const STEL = [];
      function stars() {
        for (let i = 0; i < 2; i++) { const st = STARS[i];
          for (let j = 0; j < 4; j++) { const n = i * 4 + j;
            if (!st) { if (STEL[n] && !STEL[n].style.visibility) STEL[n].style.visibility = 'hidden'; continue; }
            let e = STEL[n]; if (!e) { e = STEL[n] = el('img', 'will-change:transform'); e.src = starU(j % 2 ? '#ffe36a' : '#fff'); fxLayer.appendChild(e); }
            if (e.style.visibility) e.style.visibility = '';
            const F = st.F, [X, Y] = W2S(F.x + st.h[0] * F.face, F.y + st.h[1] + 30), rs = 7 * R.z * st.s, a = R.t / 10 + j * TAU / 4;
            e.style.transform = `translate3d(${f1(X + Math.cos(a) * 26 * R.z - rs)}px,${f1(Y + Math.sin(a) * 7 * R.z - rs)}px,0) scale(${(rs / 16).toFixed(3)})`; } }
      }
      function starShape(g, x, y, r, c) { g.fillStyle = c; g.strokeStyle = '#3a2a10'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); }
      // projectiles as images in their own layer
      const PJ = new Map(), PJURL = {};
      function projectiles(M) {
        for (const e of PJ.values()) e.seen = false;
        for (const p of M.pj) {
          let e = PJ.get(p.ser);
          if (!e) {
            if (p.k === 'laser') e = { el: el('div', 'height:60px;border-radius:30px;background:linear-gradient(180deg,rgba(90,240,255,0),#5ff6ff 30%,#fff 50%,#5ff6ff 70%,rgba(90,240,255,0));transform-origin:0 50%;will-change:transform') };
            else { const s = pjSprite(p.k); if (!PJURL[p.k]) PJURL[p.k] = s.toDataURL(); const im = el('img', 'will-change:transform'); im.src = PJURL[p.k]; im.width = s.width; im.height = s.height; e = { el: im, w: s.width, h: s.height }; }
            pjLayer.appendChild(e.el); PJ.set(p.ser, e);
          }
          e.seen = true; const [x, y] = W2S(p.x, p.y), dir = p.vx >= 0 ? 1 : -1;
          if (p.k === 'laser') { const O = M.P[p.o], ox = W2S(O.x + O.face * 70, p.y)[0], tip = x + dir * 52 * R.z, x0 = Math.min(ox, tip), len = Math.abs(tip - ox), hh = .5 * R.z * (1 + Math.sin(R.t * .8) * .1);
            e.el.style.width = Math.max(1, len) + 'px'; e.el.style.transform = `translate3d(${f1(x0)}px,${f1(y - 30)}px,0) scaleY(${(hh * 2).toFixed(3)})`; continue; }
          const sc = R.z * (p.k === 'golf' ? .85 * (1 + Math.sin(R.t / 4) * .06) : p.k === 'nevel' ? 1.1 : p.k === 'klap' ? .7 : p.k === 'vuist' ? .7 : p.k === 'zout' ? 1 : .9);
          const rot = p.k === 'waf' || p.k === 'ster' ? R.t * (p.k === 'ster' ? .5 : .25) : p.k === 'nevel' ? R.t * .05 : 0, yo = p.k === 'klap' ? 26 * R.z : 0;
          e.el.style.transform = `translate3d(${f1(x)}px,${f1(y - yo)}px,0) scale(${(dir * sc).toFixed(3)},${sc.toFixed(3)}) rotate(${(rot * 57.3 % 360).toFixed(1)}deg) translate(${-e.w / 2}px,${-e.h / 2}px)`;
          if (p.k === 'golf' && R.t % 3 === 0) fx('drop', p.x - dir * 20, p.y + 10 + Math.random() * 30, { vx: -dir * 1.5, vy: 2 + Math.random() * 2, g: .3, life: 20, c: '#bfe8ff' });
          if (p.k === 'vuist' && R.t % 2 === 0) fx('smoke', p.x - dir * 50, p.y, { vx: -dir, vy: .4, life: 18, s: .7 });
          if (p.k === 'nevel' && R.t % 3 === 0) fx('smoke', p.x - dir * 20, p.y + (Math.random() - .5) * 30, { vx: -dir * .6, vy: .3, life: 24, s: .9, c: 'rgba(180,90,240,.6)' });
        }
        for (const [k, e] of PJ) if (!e.seen) { e.el.remove(); PJ.delete(k); }
      }
      // ---- the HUD (HTML): only what changed is touched ----
      const setTf = (e, k, v) => { if (R.hk[k] !== v) { R.hk[k] = v; e.style.transform = v; } };
      const setTx = (e, k, v) => { if (R.hk[k] !== v) { R.hk[k] = v; e.textContent = v; } };
      const setCl = (e, k, c, on) => { const kk = k + c; if (R.hk[kk] !== on) { R.hk[kk] = on; e.classList.toggle(c, on); } };
      function hudUpdate(M, opt) {
        for (let i = 0; i < 2; i++) {
          const F = M.P[i], S = sides[i], frac = Math.max(0, F.hp / F.mhp);
          if (R.trail[i] < frac) R.trail[i] = frac; else if (F.st !== 'hit' && F.st !== 'fall' && F.st !== 'block' || R.trail[i] - frac > .3) R.trail[i] = Math.max(frac, R.trail[i] - .006);
          setTf(S.hp, 'hp' + i, `scaleX(${frac.toFixed(4)})`); setTf(S.tr, 'tr' + i, `scaleX(${R.trail[i].toFixed(3)})`); setCl(S.bar, 'b' + i, 'low', frac < .25);
          setTx(S.nm, 'n' + i, F.C.nm);
          setTf(S.mi, 'm' + i, `scaleX(${Math.min(1, F.meter / 100).toFixed(3)})`); setCl(S.mt, 'm' + i, 'full', F.meter >= 100);
          S.st.forEach((st, k) => setCl(st, 's' + i + k, 'on', M.wins[i] > k));
        }
        setTx(timerEl, 'tm', M.train ? '∞' : String(Math.ceil(M.timer / 60)));
        setCl(timerEl, 'tm', 'blink', !M.train && M.timer < 600 && M.phase === 'fight');
        const inp = opt.inputs; if (inp) { const k = (inp.n || 0) + ':' + inp.length; if (R.hk.inp !== k) { R.hk.inp = k; const ARR = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 6: '→', 7: '↖', 8: '↑', 9: '↗', 5: '•' };
          inputsEl.innerHTML = inp.slice().reverse().map(e => `<div>${ARR[e.d] || ''}${e.b ? ' <b>' + e.b + '</b>' : ''}</div>`).join(''); } } else if (R.hk.inp) { R.hk.inp = ''; inputsEl.textContent = ''; }
      }
      const TB = {};
      function textBmp(str) { if (TB[str]) return TB[str]; const t = text(str, 42, ['#fffbe0', '#ffd23a', '#ff6a1a'], { stroke: '#2a0e3a', sw: .14 });
        return (TB[str] = { url: t.c.toDataURL(), w: t.w, h: t.h }); }
      // quality ladder (the game steps down when frames are slow): pixels, pose rate and pose detail
      R.setLevel = lv => { R.level = lv; R.poseEvery = lv >= 2 ? 3 : 2; Rig.QA.a = lv >= 2 ? 6 : 4; Rig.QA.x = lv >= 2 ? 2 : 1.5; Rig.QA.steps = lv >= 2 ? 4 : lv >= 1 ? 6 : 0; };
      R.idle = () => !R.fx.some(f => f.on) && R.shakeT <= 0 && R.flashT <= 0;
      return R;
    }
    // a still portrait of a fighter (for the character select and results): returns a canvas
    function portrait(C, pal, w, h, poseKey, flip) {
      const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1); c.width = Math.round(w * d); c.height = Math.round(h * d);
      const g = c.getContext('2d'), B = new Float64Array(6), sc = h / 120 * d;
      Core.prep(C); const k = Rig.kit(g, C, pal);
      Rig.baseT(B, sc, c.width * .5, c.height + 92 * sc, flip ? -1 : 1);
      const p = Rig.pose(poseKey || 'guard'); Rig.draw(g, B, C, pal, p, { time: 0 });
      return c;
    }
    // a full-body render (character select preview, VS screen)
    function body(g, C, pal, poseKey, x, y, sc, face, t) {
      const B = new Float64Array(6); Core.prep(C); Rig.baseT(B, sc, x, y, face);
      const p = typeof poseKey === 'string' ? Rig.pose(poseKey) : poseKey; Rig.draw(g, B, C, pal, p, { time: t || 0 });
    }
    return { create, text, portrait, body };
  })();

  /* ================= ui.js: screens, touch controls, the game loop, modes, stats ================= */
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STEP = 1000 / 60;
  const opt = Object.assign({ sound: true, easy: false, shake: true, vib: true, diff: 'normaal', inputs: true }, store.get('vd.settings', {}));
  Sfx.gate('vd', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('vd.settings', opt);
  const sfx = (n, a, pan) => { if (opt.sound) Sfx.play(n, a, pan); };
  let stats = Object.assign({ fights: 0, wins: 0, losses: 0, winsBy: {}, clears: 0, clearBy: {}, bestTime: 0, perfects: 0, superKO: 0, bossHard: 0, unlocked: 0, maxCombo: 0, conts: 0 }, store.get('vd.stats', {}));
  const saveStats = () => store.set('vd.stats', stats);
  let run = store.get('vd.run', null);                         // the arcade ladder in progress (resumable)
  const saveRun = () => { if (run) store.set('vd.run', run); else store.del('vd.run'); };
  const DIFF = [['makkelijk', 'Makkelijk'], ['normaal', 'Normaal'], ['moeilijk', 'Moeilijk']];
  const MODES = [['arcade', '🏆', 'Arcade', 'Versla alle vechters en de eindbaas'], ['vs2', '👥', 'Versus · 2 spelers', 'Samen op één telefoon, ieder een kant'],
    ['cpu', '🤖', 'Tegen de computer', 'Kies jezelf én je tegenstander'], ['train', '🎯', 'Training', 'Oefen je bewegingen op een pop']];
  const scr = $('#vd'), stageEl = $('#vdStage'), cv = $('#vdCv'), pad = $('#vdPad');
  const R = Draw.create(cv, stageEl);
  let G = null, M = null, AIs = [null, null], raf = 0, lastT = 0, acc = 0, tick = 0, frames = [], quality = 2, perfBad = 0, inputLog = [], lastBits = 0;
  const now = () => performance.now();
  // checked every frame of the loop, so kept cheap: the modal list is looked at every 6th frame (and every frame while one is
  // up), the orientation only on resize
  const SHOWN = document.getElementsByClassName('modal show'); let mUp = false, mT = 0;
  const modalUp = () => { if (mUp || ++mT % 6 === 0) mUp = SHOWN.length > 0; return mUp; };
  let portraitF = innerHeight > innerWidth * 1.05; const portraitNow = () => portraitF;
  addEventListener('resize', () => { portraitF = innerHeight > innerWidth * 1.05; });
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

  /* ---------- portraits (rendered from the rig once) ---------- */
  const PORT = {};
  function portrait(id, pal = 0) { const k = id + pal; if (!PORT[k]) { try { PORT[k] = Draw.portrait(CAST_BY[id], pal, 110, 110, 'guard').toDataURL(); } catch (e) { PORT[k] = ''; } } return PORT[k]; }

  /* ---------- view switching ---------- */
  function setView(v) {
    if (G) G.view = v;
    scr.classList.toggle('sel', v === 'sel'); scr.classList.toggle('fight', v === 'fight');
    scr.classList.toggle('land', v === 'sel' || v === 'fight' || v === 'vs');
    Sfx.track('vd', v === 'fight' || v === 'vs' ? 'vd' : 'vdm');
    if ((v === 'sel' || v === 'fight') && screen.orientation && screen.orientation.lock) { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }
    layoutPad(); kick();
  }
  function fit() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const d = Math.min(window.__vdDpr || quality, devicePixelRatio || 1);
    R.resize(r.width, r.height, d); layoutPad();
    if (G && G.view === 'sel') drawPreviews();
    if (G && G.view === 'start' && attractM) R.frame(attractM, { noHud: 1 });
    if (G && G.view === 'fight' && M && !raf) R.frame(M, hudOpt());
    kick();
  }
  window.addEventListener('resize', () => { if (current === 'vd') setTimeout(fit, 60); });

  /* ---------- the loop: fixed 60 Hz steps, rendering every animation frame, stopped when nothing moves ---------- */
  let rekick = false;
  function kick() { if (raf === -1) { rekick = true; return; } if (!raf && current === 'vd') { lastT = now(); raf = requestAnimationFrame(loop); } }   // raf: 0 idle, -1 inside the loop, else pending
  let pollT = 0;
  function pollResume() { clearTimeout(pollT); pollT = setTimeout(() => { if (current !== 'vd' || !G) return; if (G.view === 'fight' && (anyModal() || portraitNow())) { pollResume(); return; } kick(); }, 250); }
  function loop(ts) {
    raf = -1;                                                     // 'running': kick() inside the loop must not start a second chain
    rekick = false;
    try { loopBody(ts); } finally { if (raf === -1) { raf = 0; if (rekick && current === 'vd') raf = requestAnimationFrame(loop); } rekick = false; }
  }
  function loopBody(ts) {
    if (current !== 'vd' || !G) return;
    frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    const dt = Math.min(100, Math.max(0, ts - lastT)); lastT = ts;
    if (G.view === 'fight' && M) {
      const paused = modalUp() || portraitNow();
      if (!paused) {
        acc += dt * (window.__vdSpeed || 1); let n = 0;
        while (acc >= STEP && n < 8) { acc -= STEP; n++; tick++; if (M.slow > 0 && tick % 3 && !window.__vdSpeed) continue; stepGame(); if (!G || G.view !== 'fight') return; }
        if (n >= 8) acc = 0;
        perfWatch(dt);
      } else acc = 0;
      R.frame(M, hudOpt());
      updateSuperBtns();
      if (paused) { pollResume(); return; }
      if (G.done && R.idle() && M.pt > 400) return;           // the results are up and nothing moves any more
    } else if (G.view === 'vs') { vsFrame(); if (!G || G.view !== 'vs') return; }
    else if (G.view === 'sel') { if (G.anim > 0) { G.anim--; drawPreviews(); } else return; }
    else return;
    raf = requestAnimationFrame(loop);
  }
  // adaptive quality: when frames come too slowly, step down (fewer pixels, then lighter fighter bitmaps); never back up
  // during a session. Level 0: up to 2x pixels; 1: 1.5x; 2: 1x, and fighters at 30 -> 20 poses/s with a raster budget.
  let pwT = 0, pwN = 0;
  function perfWatch(dt) {
    pwT += dt; pwN++;
    if (pwN < 40) return;
    const avg = pwT / pwN; pwT = 0; pwN = 0;
    if (avg > 19 && level < 2) { level++; quality = [2, 1.5, 1][level]; R.setLevel(level); fit(); }
  }
  let level = 0;
  const hudOpt = () => ({ inputs: G && G.mode === 'train' && opt.inputs ? inputLog : null, safeTop: 0 });

  /* ---------- touch controls ---------- */
  const PADS = [{ dir: 0, held: 0, pend: 0, q: [], cur: 0 }, { dir: 0, held: 0, pend: 0, q: [], cur: 0 }];
  const BMAP = { LP: Core.LP, HP: Core.HP, LK: Core.LK, HK: Core.HK, SP: Core.SP, SU: Core.SU };
  const ICON_P = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M6 9c0-1.7 1.3-3 3-3h7c1.7 0 3 1.3 3 3v5c0 2.8-2.2 5-5 5h-3.5C8 19 6 17 6 14.5z"/><path d="M9.5 6.5v4M13 6.5v4M16.3 7v3.5M6.2 12.2h4.3" stroke="rgba(0,0,0,.35)" stroke-width="1.5" fill="none"/></svg>';
  const ICON_K = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M8 3h5l.6 9.5 5.6 2.2c1.4.6 2 2 1.6 3.3l-.3 1H6.5L7 13z"/><path d="M7 16.5h13.2" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>';
  const BTNS = [['LP', 'p', ICON_P, 'Stoot'], ['HP', 'p h', ICON_P, 'Zwaar'], ['LK', 'k', ICON_K, 'Trap'], ['HK', 'k h', ICON_K, 'Zwaar'], ['SP', 's', '<b style="font-size:20px">✦</b>', 'Speciaal'], ['SU', 'u', '<b style="font-size:13px">SUPER</b>', '']];
  let layout = null;
  const btnEls = [[], []];
  for (let p = 0; p < 2; p++) for (const [k, cls, ic, lbl] of BTNS) { const b = document.createElement('div'); b.className = 'vd-b ' + cls; b.dataset.b = k; b.dataset.p = p; b.innerHTML = ic + (lbl ? `<small>${lbl}</small>` : ''); pad.appendChild(b); btnEls[p].push(b); }
  const sticks = [...pad.querySelectorAll('.vd-stick')];
  function layoutPad() {
    const W = R.W, H = R.H; if (!W || !H) return;
    const two = G && G.mode === 'vs2', s = Math.max(.72, Math.min(1.3, H / 412)), L = { two, s, pl: [] };
    for (let p = 0; p < 2; p++) {
      const human = G && (p === 0 || two) && G.view === 'fight';
      const mir = p === 1, mx = x => mir ? W - x : x;
      const br = (two ? 27 : 33) * s, sr = (two ? 46 : 56) * s;
      const cx = two ? W * .33 : W - 150 * s, cy = H - (two ? 78 : 96) * s, dx = (two ? .82 : 1) * s, ox = two ? (mir ? -1 : 1) : 1;
      const pos = { LP: [cx - 56 * dx * ox, cy - 34 * dx], HP: [cx + 18 * dx * ox, cy - 56 * dx], LK: [cx - 40 * dx * ox, cy + 40 * dx], HK: [cx + 36 * dx * ox, cy + 18 * dx],
        SP: [cx - 122 * dx * ox, cy + 34 * dx], SU: [cx + 70 * dx * ox, cy - 118 * dx] };
      const P = { human, br, sr, b: {}, stick: two ? [W * .1 + 10, H - 82 * s] : [W * .14 + 16, H - 98 * s], zone: two ? (mir ? [W * .5, W] : [0, W * .5]) : [0, W * .5] };
      if (mir) P.stick[0] = W - P.stick[0];
      btnEls[p].forEach(el => {
        const k = el.dataset.b; let [x, y] = pos[k]; if (two && mir) x = W - x;
        const r = k === 'SP' || k === 'SU' ? br * .82 : (k[0] === 'H' ? br * 1.04 : br);
        const vis = human && (k !== 'SP' || opt.easy);
        P.b[k] = vis ? [x, y, r] : null;
        el.style.display = vis ? 'flex' : 'none';
        Object.assign(el.style, { left: (x - r) + 'px', top: (y - r) + 'px', width: r * 2 + 'px', height: r * 2 + 'px' });
        el.querySelector('small') && (el.querySelector('small').style.fontSize = Math.max(8, 10 * s * (two ? .85 : 1)) + 'px');
      });
      const st = sticks[p]; st.style.display = human ? 'block' : 'none'; Object.assign(st.style, { width: P.sr * 2 + 'px', height: P.sr * 2 + 'px', marginLeft: -P.sr + 'px', marginTop: -P.sr + 'px', left: P.stick[0] + 'px', top: P.stick[1] + 'px' });
      L.pl.push(P);
    }
    layout = L;
  }
  const ptrs = new Map();
  function whoAt(x) { return layout && layout.two ? (x < R.W / 2 ? 0 : 1) : 0; }
  function nearestBtn(p, x, y) { let best = null, bd = 1e9; for (const [k, b] of Object.entries(layout.pl[p].b)) { if (!b) continue; const d = Math.hypot(x - b[0], y - b[1]); if (d < b[2] * 1.28 && d < bd) { bd = d; best = k; } } return best; }
  function setStick(p, ptr, x, y) {
    const P = layout.pl[p], dx = x - ptr.ox, dy = y - ptr.oy, d = Math.hypot(dx, dy), r = P.sr;
    let bits = 0;
    if (d > r * .26) { const a = Math.atan2(-dy, dx), sec = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
      bits = [Core.R, Core.R | Core.U, Core.U, Core.U | Core.L, Core.L, Core.L | Core.D, Core.D, Core.D | Core.R][sec]; }
    setDir(p, bits);
    const k = Math.min(1, r * .62 / Math.max(1, d)); sticks[p].firstChild.style.transform = `translate(${dx * k}px,${dy * k}px)`;
  }
  function press(p, k, on) {
    const bit = BMAP[k], el = btnEls[p].find(e => e.dataset.b === k);
    if (on) { PADS[p].held |= bit; snap(p); el && el.classList.add('on'); Sfx.play('__warm'); }
    else { PADS[p].held &= ~bit; snap(p); el && el.classList.remove('on'); }
  }
  pad.addEventListener('pointerdown', e => {
    if (!G || G.view !== 'fight' || !layout) return; e.preventDefault();
    const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, p = whoAt(x), P = layout.pl[p];
    if (!P.human) return;
    const b = nearestBtn(p, x, y);
    if (b) { ptrs.set(e.pointerId, { kind: 'b', p, b }); press(p, b, true); }
    else if (x >= P.zone[0] && x <= P.zone[1] && (!layout.two || Math.abs(x - P.stick[0]) < R.W * .22)) {
      if ([...ptrs.values()].some(q => q.kind === 's' && q.p === p)) return;
      const ox = Math.max(P.zone[0] + P.sr, Math.min(P.zone[1] - P.sr, x)), oy = Math.max(R.H * .25, Math.min(R.H - P.sr * .7, y));
      const q = { kind: 's', p, ox, oy }; ptrs.set(e.pointerId, q);
      Object.assign(sticks[p].style, { left: ox + 'px', top: oy + 'px' }); sticks[p].classList.add('on'); setStick(p, q, x, y);
    } else return;
    try { pad.setPointerCapture(e.pointerId); } catch (er) {}
  });
  pad.addEventListener('pointermove', e => {
    const q = ptrs.get(e.pointerId); if (!q || !layout) return;
    const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (q.kind === 's') setStick(q.p, q, x, y);
    else { const b = nearestBtn(q.p, x, y); if (b && b !== q.b) { press(q.p, q.b, false); q.b = b; press(q.p, b, true); } }
  });
  const ptrUp = e => {
    const q = ptrs.get(e.pointerId); if (!q) return; ptrs.delete(e.pointerId);
    if (q.kind === 's') { setDir(q.p, 0); sticks[q.p].firstChild.style.transform = ''; sticks[q.p].classList.remove('on'); if (layout) Object.assign(sticks[q.p].style, { left: layout.pl[q.p].stick[0] + 'px', top: layout.pl[q.p].stick[1] + 'px' }); }
    else press(q.p, q.b, false);
  };
  pad.addEventListener('pointerup', ptrUp); pad.addEventListener('pointercancel', ptrUp);
  function releaseAll() { ptrs.clear(); for (let p = 0; p < 2; p++) { PADS[p].dir = PADS[p].held = PADS[p].pend = 0; PADS[p].q.length = 0; sticks[p].firstChild.style.transform = ''; sticks[p].classList.remove('on'); } btnEls.flat().forEach(b => b.classList.remove('on')); KEYS.clear(); }
  // keyboard (desktop testing): P1 WASD + J I K O (L = Speciaal, Space = Super); P2 arrows + numpad 4 5 1 2 (6 = Speciaal, 3 = Super)
  const KEYS = new Set();
  const KMAP = [{ KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R', KeyJ: 'LP', KeyI: 'HP', KeyK: 'LK', KeyO: 'HK', KeyL: 'SP', Space: 'SU' },
    { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', Numpad4: 'LP', Numpad5: 'HP', Numpad1: 'LK', Numpad2: 'HK', Numpad6: 'SP', Numpad3: 'SU' }];
  document.addEventListener('keydown', e => {
    if (current !== 'vd' || !G) return;
    if (e.code === 'Escape' && G.view === 'fight' && !anyModal()) { openPause(); return; }
    if (G.view === 'vs' && (e.code === 'Enter' || e.code === 'Space')) { G.vsT = 999; return; }
    if (G.view !== 'fight' || anyModal()) return;
    for (let p = 0; p < 2; p++) { const k = KMAP[p][e.code]; if (!k) continue; e.preventDefault(); if (KEYS.has(e.code)) return; KEYS.add(e.code);
      if (k.length === 1) setDir(p, PADS[p].dir | Core[k]); else press(p, k, true); }
  });
  document.addEventListener('keyup', e => {
    if (!KEYS.has(e.code)) return; KEYS.delete(e.code);
    for (let p = 0; p < 2; p++) { const k = KMAP[p][e.code]; if (!k) continue; if (k.length === 1) setDir(p, PADS[p].dir & ~Core[k]); else press(p, k, false); }
  });
  // stick changes are queued so a quick motion (↓↘→) survives a slow frame: every simulation step takes one change
  // (button presses go through the same queue, so their order relative to the stick is kept)
  function snap(p) { const P = PADS[p]; P.q.push(P.dir | P.held); if (P.q.length > 8) P.q.shift(); }
  function setDir(p, bits) { const P = PADS[p]; if (P.dir === bits) return; P.dir = bits; snap(p); }
  function padBits(p) { const P = PADS[p]; const b = (P.q.length ? P.q.shift() : P.dir | P.held) | P.pend; P.pend = 0; return b; }
  function updateSuperBtns() {
    if (!M) return;
    for (let p = 0; p < 2; p++) { const el = btnEls[p][5], ready = M.P[p].meter >= 100; if (el.classList.contains('ready') !== ready) el.classList.toggle('ready', ready); }
  }

  /* ---------- one simulation step ---------- */
  const NUM = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
  function stepGame() {
    const ins = [0, 0];
    for (let p = 0; p < 2; p++) {
      if (window.__vdFreeze && p === 1) ins[p] = 0;
      else if (AIs[p]) ins[p] = AIs[p].input(M);
      else if (G.dummy && p === 1) ins[p] = G.dummy === 'cpu' ? 0 : Core.dummyBits(M, 1, G.dummy);
      else ins[p] = padBits(p);
    }
    if (G.mode === 'train') {                                  // input display for player 1
      const F = M.P[0], b = ins[0];
      if (b !== lastBits && M.phase === 'fight') { const d = Core.relDir(b, F.face), bb = ['LP', 'HP', 'LK', 'HK', 'SP', 'SU'].filter(k => (b & BMAP[k]) && !(lastBits & BMAP[k])).map(k => ({ LP: 'S', HP: 'S+', LK: 'T', HK: 'T+', SP: '✦', SU: 'SUPER' })[k]).join(' ');
        if (d !== 5 || bb) { inputLog.push({ d, b: bb }); inputLog.n = (inputLog.n || 0) + 1; if (inputLog.length > 14) inputLog.shift(); } }
      lastBits = b;
    }
    Core.step(M, ins);
    for (const e of M.ev) { R.event(M, e); feedback(e); const c = EVC[e.t] || (EVC[e.t] = [0, 0]); c[e.side ? 1 : 0]++; }
    if (M.over && !G.endAt) G.endAt = M.f + 80;
    if (G.endAt && M.f === G.endAt) matchOver();
  }
  const panOf = x => Math.max(-1, Math.min(1, (x - R.camX) / 500)) * .5;
  const human = side => G && (G.mode === 'vs2' || (side === 0));
  function feedback(e) {
    const a = e.a || {};
    switch (e.t) {
      case 'hit': sfx(a.heavy ? 'vdHitH' : 'vdHitL', 0, panOf(a.x)); if (opt.vib && (human(e.side) || human(1 - e.side))) vibrate(a.heavy ? 28 : 12);
        if (a.kind === 'p' && a.src === 'waf') sfx('vdCrunch'); break;
      case 'block': sfx('vdBlock', 0, panOf(a.x)); break;
      case 'swing': sfx(a.heavy ? 'vdWhooshH' : 'vdWhoosh'); break;
      case 'special': sfx({ proj: 'vdCast', aa: 'vdRise', rush: 'vdRush', grab: 'vdWhooshH', counter: 'vdChime', tele: 'vdTele', hop: 'vdRise', poke: 'vdRush' }[a.role] || 'vdCast'); break;
      case 'proj': sfx(a.k === 'laser' ? 'vdLaser' : a.k === 'golf' ? 'vdSplash' : 'vdProj'); break;
      case 'super': sfx('vdSuper'); if (opt.vib && human(e.side)) vibrate(40); break;
      case 'ko': sfx('vdKO'); if (opt.vib) vibrate(60); break;
      case 'round': sfx('vdBell'); break;
      case 'fight': sfx('vdFight'); break;
      case 'jump': sfx('vdJump'); break;
      case 'land': sfx('vdLand'); break;
      case 'down': sfx('vdThud'); break;
      case 'grab': sfx('vdGrab'); break;
      case 'throwhit': sfx('vdHitH'); break;
      case 'tech': sfx('vdBlock'); break;
      case 'tele': sfx('vdTele'); break;
      case 'counter': sfx('vdChime'); break;
      case 'clash': sfx('vdClash'); break;
      case 'dizzy': sfx('vdDizzy'); break;
      case 'timeup': sfx('vdBell'); break;
      case 'roundend': if (a.perfect) sfx('vdPerfect'); break;
      case 'matchend': { const w = e.side; if (G.mode === 'vs2' || G.mode === 'train') sfx('vdWin'); else sfx(w === 0 ? 'vdWin' : 'vdLose'); break; }
    }
  }

  /* ---------- starting fights ---------- */
  let EVC = {};                                                  // event counts per fight (tests)
  function newFight() {
    EVC = {};
    const [a, b] = G.picks, diff = G.mode === 'arcade' ? run.diff : opt.diff;
    const boss = G.mode === 'arcade' && b === 'nevel' && diff !== 'makkelijk' ? { hp: diff === 'moeilijk' ? 1.2 : 1.12, dmg: diff === 'moeilijk' ? 1.12 : 1.06 } : null;
    const easy = !!opt.easy;
    M = Core.newMatch({ p: [{ ch: a, easy, pal: 0 }, { ch: b, easy: G.mode === 'vs2' ? easy : false, pal: a === b ? 1 : 0, boost: boss }], stage: G.stage, train: G.mode === 'train' ? { inf: 1, meter: G.meter } : null, noIntro: G.mode === 'train' });
    AIs = [null, G.mode === 'arcade' || G.mode === 'cpu' ? AI.create(diff, (Math.random() * 1e9) | 0, 1) : null];
    G.dummy = G.mode === 'train' ? (G.dummyMode || 'stand') : null;
    if (G.mode === 'train' && G.dummy === 'cpu') AIs[1] = AI.create('normaal', 7, 1);
    G.endAt = 0; G.done = false; inputLog = []; lastBits = 0; tick = 0; acc = 0;
    R.setStage(G.stage); R.reset(); releaseAll();
    window.__vdM = M;
  }
  function startVs() { closeModals(); newFight(); G.vsT = 0; R.clearHud(); R.layersVisible(false); R.hiRes(true); setView('vs'); sfx('vdVs'); }
  function startFight() { R.hiRes(false); R.layersVisible(true); setView('fight'); R.reset(); fit(); kick(); }
  function restartFight() { closeModals(); newFight(); R.hiRes(false); R.layersVisible(true); setView('fight'); fit(); }
  /* ---------- the VS screen ---------- */
  stageEl.addEventListener('pointerdown', () => { if (G && G.view === 'vs' && G.vsT > 20) G.vsT = 999; });
  const VSC = { dex: ['#ff7a1a', '#5a2a0e'], truus: ['#7a3fb0', '#2a1240'], moer: ['#2a8ad0', '#0e2a4a'], sol: ['#1f9a4a', '#0e3a1e'], bram: ['#26346a', '#0e1230'], kiki: ['#5e45a0', '#1e1236'], sjaak: ['#e2262f', '#4a0e10'], nevel: ['#5a2a8a', '#140a22'] };
  function vsFrame() {
    G.vsT++; const t = G.vsT, g = R.g, W = R.W, H = R.H, d = R.cd;
    if (t > 150) { startFight(); return; }
    g.setTransform(d, 0, 0, d, 0, 0);
    const [a, b] = G.picks, ca = VSC[a], cb = VSC[b], u = Math.min(1, t / 18), e = 1 - Math.pow(1 - u, 3);
    let gr = g.createLinearGradient(0, 0, W * .5, H); gr.addColorStop(0, ca[0]); gr.addColorStop(1, ca[1]); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * .58, 0); g.lineTo(W * .42, H); g.lineTo(0, H); g.fill();
    gr = g.createLinearGradient(W, 0, W * .5, H); gr.addColorStop(0, cb[0]); gr.addColorStop(1, cb[1]); g.fillStyle = gr; g.beginPath(); g.moveTo(W * .58, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W * .42, H); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.moveTo(W * .58, 0); g.lineTo(W * .42, H); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 14; i++) { const y = ((i * 53 + t * 6) % (H + 60)) - 30; g.fillRect(0, y, W, 3); }
    const sc = H / 230, A = CAST_BY[a], B = CAST_BY[b];
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    Draw.body(g, A, 0, t < 70 ? 'guard' : 'guard', (W * .22 - (1 - e) * W * .5) * d, (H * .98) * d, sc * d, 1, t);
    Draw.body(g, B, a === b ? 1 : 0, 'guard', (W * .78 + (1 - e) * W * .5) * d, (H * .98) * d, sc * d, -1, t);
    g.restore(); g.setTransform(d, 0, 0, d, 0, 0);
    const vs = Draw.text('VS', Math.round(H * .26), ['#fffbe0', '#ffd23a', '#ff6a1a'], { stroke: '#1e0a2e', sw: .1, italic: 1 }), vk = t < 24 ? 2.4 - (t / 24) * 1.4 : 1 + Math.sin(t / 6) * .03;
    g.drawImage(vs.c, W / 2 - vs.w * vk / 2, H * .42 - vs.h * vk / 2, vs.w * vk, vs.h * vk);
    const na = Draw.text(A.full, Math.round(H * .085), '#fff', { stroke: '#1e0a2e', sw: .18 }), nb = Draw.text(B.full, Math.round(H * .085), '#fff', { stroke: '#1e0a2e', sw: .18 });
    g.globalAlpha = e; g.drawImage(na.c, 16, H * .06); g.drawImage(nb.c, W - nb.w - 16, H * .06);
    if (t > 30) { const qa = Draw.text('“' + A.intro + '”', Math.round(H * .045), '#ffe9a8', { stroke: '#1e0a2e', sw: .2, w: 700, italic: 1 }), qb = Draw.text('“' + B.intro + '”', Math.round(H * .045), '#ffe9a8', { stroke: '#1e0a2e', sw: .2, w: 700, italic: 1 });
      g.globalAlpha = Math.min(1, (t - 30) / 12); g.drawImage(qa.c, 16, H * .06 + na.h); g.drawImage(qb.c, W - qb.w - 16, H * .06 + nb.h); }
    if (G.mode === 'arcade') { const st = Draw.text(`Gevecht ${run.idx + 1} van ${run.order.length}`, Math.round(H * .05), '#fff', { stroke: '#1e0a2e', sw: .2, w: 800 }); g.globalAlpha = .9; g.drawImage(st.c, W / 2 - st.w / 2, H * .86); }
    g.globalAlpha = 1;
  }

  /* ---------- character select ---------- */
  const gridEl = $('#vdGrid');
  function openSelect(mode) {
    G = Object.assign(G || {}, { mode, picks: [null, null], cur: 0, stage: null, stageSel: -1, anim: 40 });
    closeModals(); renderGrid(); setView('sel'); fit(); drawPreviews();
  }
  function selTitle() {
    const m = G.mode, c = G.cur;
    if (m === 'vs2') return c === 0 ? 'Speler 1: kies je vechter' : 'Speler 2: kies je vechter';
    if (m === 'cpu') return c === 0 ? 'Kies je vechter' : 'Kies je tegenstander';
    if (m === 'train') return c === 0 ? 'Kies je vechter' : 'Kies je oefenpop';
    return 'Kies je vechter';
  }
  function renderGrid() {
    gridEl.innerHTML = CAST.map(C => { const lock = C.boss && !stats.unlocked, a = G.picks[0] === C.id, b = G.picks[1] === C.id;
      return `<button class="vd-card${lock ? ' lock' : ''}${a ? ' p1' : ''}${b ? ' p2' : ''}" data-c="${C.id}"><img src="${portrait(C.id)}" alt=""><span>${lock ? '???' : esc(C.nm)}</span>${a ? '<i class="l">' + (G.mode === 'vs2' ? 'S1' : 'JIJ') + '</i>' : ''}${b ? '<i class="r">' + (G.mode === 'vs2' ? 'S2' : G.mode === 'train' ? 'POP' : 'CPU') + '</i>' : ''}</button>`; }).join('');
    $('#vdSelTitle').textContent = selTitle();
    const need2 = G.mode !== 'arcade', ready = G.picks[0] && (!need2 || G.picks[1]);
    $('#vdSelGo').disabled = !ready;
    $('#vdSelHint').textContent = !ready ? 'Tik op een vechter.' : G.mode === 'arcade' ? `Moeilijkheid: ${DIFF.find(d => d[0] === opt.diff)[1]}` : 'Klaar? Vecht!';
    const sb = $('#vdStageBtn'); sb.hidden = G.mode === 'arcade';
    sb.textContent = 'Arena: ' + (G.stageSel < 0 ? 'Willekeurig' : STAGES[G.stageSel].nm);
    sideInfo(0); sideInfo(1);
  }
  function sideInfo(i) {
    const el = i ? $('#vdSideR') : $('#vdSideL'), id = G.picks[i] || G.hover && G.cur === i && G.hover, info = el.querySelector('.vd-info');
    el.classList.toggle('p1', !i); el.classList.toggle('p2', !!i);
    el.style.visibility = (i === 1 && G.mode === 'arcade') ? 'hidden' : '';
    if (!id) { info.innerHTML = `<span class="vd-tag">${i ? (G.mode === 'vs2' ? 'Speler 2' : G.mode === 'train' ? 'Oefenpop' : 'Computer') : (G.mode === 'vs2' ? 'Speler 1' : 'Jij')}</span><b>?</b>`; return; }
    const C = CAST_BY[id], bars = ['Kracht', 'Snelheid', 'Techniek'].map((l, k) => `${l} ${'●'.repeat(C.stat[k])}${'○'.repeat(5 - C.stat[k])}`).join(' · ');
    info.innerHTML = `<span class="vd-tag">${i ? (G.mode === 'vs2' ? 'Speler 2' : G.mode === 'train' ? 'Oefenpop' : 'Computer') : (G.mode === 'vs2' ? 'Speler 1' : 'Jij')}</span><b>${esc(C.full)}</b><em>${esc(C.style)} · ${esc(C.from)}</em><small>${esc(C.bio)}</small><small style="color:#cfc6ef">${bars}</small>`;
  }
  function drawPreviews() {
    for (let i = 0; i < 2; i++) {
      const el = i ? $('#vdSideR') : $('#vdSideL'), c = el.querySelector('canvas'), id = G.picks[i] || (G.cur === i && G.hover);
      const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (r.width < 10 || r.height < 10) continue;
      if (c.width !== Math.round(r.width * d) || c.height !== Math.round(r.height * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
      const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
      if (!id || (i === 1 && G.mode === 'arcade')) continue;
      const C = CAST_BY[id], sc = c.height / 215, t = 40 - G.anim;
      const ph = G.picks[i] ? Math.min(1, t / 18) : 0;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(c.width / 2, c.height - 8 * sc, 50 * sc * C.W, 9 * sc, 0, 0, Math.PI * 2); g.fill();
      const pose = G.picks[i] ? Rig.lerpInto(Rig.P({}), Rig.pose(i ? 'guard' : 'guard'), Rig.pose('flex'), ph < 1 ? Math.sin(ph * Math.PI) : 0) : Rig.pose('guard');
      Draw.body(g, C, i && G.picks[0] === id ? 1 : 0, pose, c.width / 2, c.height - 8 * sc, sc, i ? -1 : 1, t);
    }
  }
  gridEl.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b || !G) return; const id = b.dataset.c, C = CAST_BY[id];
    if (C.boss && !stats.unlocked) { toast('Win eerst het Arcade-toernooi om deze vechter vrij te spelen.'); sfx('vdNo'); return; }
    const i = G.cur;
    G.picks[i] = id; sfx('vdOk'); G.anim = 40;
    if (G.mode !== 'arcade' && i === 0) G.cur = 1;
    renderGrid(); kick();
  });
  $('#vdSideL').addEventListener('click', () => { if (G && G.picks[0] && G.mode !== 'arcade' && !G.picks[1]) { G.picks[0] = null; G.cur = 0; renderGrid(); drawPreviews(); } });
  $('#vdSideR').addEventListener('click', () => { if (G && G.picks[1]) { G.picks[1] = null; G.cur = 1; renderGrid(); drawPreviews(); } });
  $('#vdStageBtn').addEventListener('click', () => { G.stageSel = G.stageSel + 1 >= STAGES.length ? -1 : G.stageSel + 1; sfx('vdSel'); renderGrid(); });
  $('#vdSelBack').addEventListener('click', () => { sfx('vdSel'); if (G && G.mode !== 'arcade' && G.picks[0] && G.cur === 1 && !G.picks[1]) { G.picks[0] = null; G.cur = 0; renderGrid(); drawPreviews(); return; } openStart(); });
  $('#vdSelGo').addEventListener('click', () => {
    if (!G || !G.picks[0]) return; sfx('vdOk');
    if (G.mode === 'arcade') { arcadeNew(G.picks[0]); return; }
    G.stage = G.stageSel >= 0 ? STAGES[G.stageSel].id : STAGES[(Math.random() * STAGES.length) | 0].id;
    if (G.mode === 'train') { G.meter = G.meter || 0; G.dummyMode = G.dummyMode || 'stand'; }
    startVs();
  });

  /* ---------- arcade ---------- */
  function ladder(me) {
    const others = CAST.filter(c => c.id !== me && !c.boss).map(c => c.id);
    for (let i = others.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [others[i], others[j]] = [others[j], others[i]]; }
    if (me === 'nevel') return others; return [...others, 'nevel'];
  }
  function arcadeNew(ch) { run = { ch, diff: opt.diff, order: ladder(ch), idx: 0, cont: 0, time: 0 }; saveRun(); arcadeNext(); }
  function arcadeNext() { const opp = run.order[run.idx]; G = Object.assign(G || {}, { mode: 'arcade', picks: [run.ch, opp], stage: CAST_BY[opp].stage }); startVs(); }

  /* ---------- the end of a match ---------- */
  function matchOver() {
    G.done = true; const w = M.winner, mode = G.mode, me = M.P[0];
    const roundsTxt = `${M.wins[0]} – ${M.wins[1]}`, mx = Math.max(M.P[0].maxCombo, M.P[1].maxCombo);
    if (mode !== 'train') {
      stats.fights++;
      const humans = mode === 'vs2' ? [0, 1] : [0];
      if (w >= 0 && humans.includes(w)) { stats.winsBy[M.P[w].C.id] = (stats.winsBy[M.P[w].C.id] || 0) + 1; }
      if (mode !== 'vs2') { if (w === 0) stats.wins++; else stats.losses++; }
      for (const r of M.rounds) if (r.w >= 0 && humans.includes(r.w)) { if (r.perfect) stats.perfects++; if (r.superKO) stats.superKO++; }
      stats.maxCombo = Math.max(stats.maxCombo, ...humans.map(i => M.P[i].maxCombo));
    }
    const secs = M.rounds.reduce((a, r) => a + r.time, 0) / 60;
    let title = '', text = '', btns = [], pic = w >= 0 ? portrait(M.P[w].C.id, w === 1 && M.P[0].C.id === M.P[1].C.id ? 1 : 0) : '';
    const quote = w >= 0 ? `<q>“${esc(M.P[w].C.quote)}”</q>` : '';
    const line = `Rondes <b>${roundsTxt}</b> · tijd <b>${fmtT(secs)}</b> · langste combo <b>${mx}</b>`;
    if (mode === 'arcade') {
      run.time += secs;
      if (w === 0) {
        run.idx++;
        if (run.idx >= run.order.length) {
          stats.clears++; stats.clearBy[run.ch] = 1; if (!stats.bestTime || run.time < stats.bestTime) stats.bestTime = Math.round(run.time);
          const newUnlock = !stats.unlocked; stats.unlocked = 1;
          if (run.diff === 'moeilijk') stats.bossHard = 1;
          title = '🏆 Kampioen!'; text = `${quote}<b>${esc(me.C.full)}</b> wint het toernooi! Totale tijd <b>${fmtT(run.time)}</b>${run.cont ? ` · ${run.cont}× doorgegaan` : ''}.${newUnlock ? '<br>🎩 <b>Graaf Nevel</b> is nu ook speelbaar!' : ''}`;
          run = null; btns = [['vdEMenu', 'Menu', 0], ['vdEAgain', 'Nog een toernooi ▶', 1]]; sfx('vdChamp');
        } else { title = `${esc(me.C.nm)} wint!`; text = `${quote}${line}${ladderHtml()}`; btns = [['vdEStop', 'Stoppen', 0], ['vdENext', 'Volgende tegenstander ▶', 1]]; }
      } else { title = w < 0 ? 'Gelijkspel!' : `${esc(M.P[1].C.nm)} wint...`; text = `${quote}${line}<br>Doorgaan? Je begint opnieuw tegen dezelfde tegenstander.${ladderHtml()}`; btns = [['vdEStop', 'Stoppen', 0], ['vdECont', 'Doorgaan ▶', 1]]; }
      saveRun();
    } else if (mode === 'train') { title = 'Training'; text = line; btns = [['vdEMenu', 'Menu', 0], ['vdERematch', 'Nog eens ▶', 1]]; }
    else {
      const who = w < 0 ? null : mode === 'vs2' ? (w ? 'Speler 2' : 'Speler 1') : (w ? 'De computer' : 'Jij');
      title = w < 0 ? 'Gelijkspel!' : `${esc(M.P[w].C.nm)} wint!`; text = `${quote}${who ? `<b>${who}</b> wint de wedstrijd. ` : ''}${line}`;
      btns = [['vdEMenu', 'Menu', 0], ['vdEPick', 'Andere vechters', 0], ['vdERematch', 'Revanche ▶', 1]];
    }
    saveStats();
    $('#vdEndPic').innerHTML = pic ? `<img src="${pic}" alt="">` : '';
    $('#vdEndTitle').innerHTML = title; $('#vdEndText').innerHTML = text;
    $('#vdEndBtns').innerHTML = btns.map(([id, l, p]) => `<button class="btn${p ? ' primary' : ''}" id="${id}">${l}</button>`).join('');
    releaseAll(); openModal('vdEndModal');
  }
  function ladderHtml() { if (!run) return ''; return `<div class="vd-ladder">${run.order.map((id, i) => `<img src="${portrait(id)}" class="${i < run.idx ? 'done' : i === run.idx ? 'now' : ''}" alt="">`).join('')}</div>`; }
  $('#vdEndModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('vdOk');
    switch (b.id) {
      case 'vdENext': arcadeNext(); break;
      case 'vdECont': run.cont++; stats.conts++; saveStats(); saveRun(); arcadeNext(); break;
      case 'vdEStop': run = null; saveRun(); openStart(); break;
      case 'vdEAgain': openSelect('arcade'); break;
      case 'vdERematch': startVs(); break;
      case 'vdEPick': openSelect(G.mode); break;
      case 'vdEMenu': openStart(); break;
    }
  });

  /* ---------- pause, move list ---------- */
  function openPause() {
    if (!G || G.view !== 'fight' || !M) return;
    releaseAll(); sfx('vdSel');
    const tr = G.mode === 'train';
    $('#vdPTrain').innerHTML = tr ? `<div class="opt"><div class="opt-label">Oefenpop</div><div class="seg" data-o="dummyMode">${[['stand', 'Staan'], ['crouch', 'Hurken'], ['jump', 'Springen'], ['block', 'Blokken'], ['cpu', 'Vecht terug']].map(([v, l]) => `<button data-v="${v}" class="${G.dummyMode === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="opt"><div class="opt-label">Supermeter</div><div class="seg" data-o="meter">${[[1, 'Altijd vol'], [0, 'Normaal']].map(([v, l]) => `<button data-v="${v}" class="${(G.meter ? 1 : 0) === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="opt"><div class="opt-label">Invoer tonen</div><div class="seg" data-o="inputs">${[[true, 'Aan'], [false, 'Uit']].map(([v, l]) => `<button data-v="${v}" class="${opt.inputs === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : '';
    $('#vdPOpts').innerHTML = optRows(['easy', 'shake', 'sound', 'music']);
    if (!$('#vdPauseModal').classList.contains('show')) closeModals();
    openModal('vdPauseModal');
  }
  $('#vdPause').addEventListener('click', e => { e.stopPropagation(); openPause(); });
  $('#vdPResume').addEventListener('click', () => { closeModals(); kick(); });
  $('#vdPRestart').addEventListener('click', () => { restartFight(); });
  $('#vdPQuit').addEventListener('click', async () => {
    const msg = G.mode === 'arcade' ? 'Je toernooi wordt bewaard: je kunt later verder bij dit gevecht.' : 'Het gevecht stopt.';
    if (!(await askConfirm('Stoppen?', msg, 'Stoppen'))) { openPause(); return; }
    openStart();
  });
  $('#vdPTrain').addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return; const k = b.parentElement.dataset.o, v = b.dataset.v;
    if (k === 'dummyMode') { G.dummyMode = v; G.dummy = v; AIs[1] = v === 'cpu' ? AI.create('normaal', 7, 1) : null; }
    if (k === 'meter') { G.meter = +v; M.train.meter = +v; }
    if (k === 'inputs') { opt.inputs = v === 'true'; saveOpt(); }
    openPause();
  });
  $('#vdPOpts').addEventListener('click', e => onOpt(e, openPause));
  $('#vdPMoves').addEventListener('click', () => openMoves(0));
  function moveRows(C) {
    Core.prep(C);
    const row = (nm, sub, inp, easy) => `<div class="vd-mv"><b>${esc(nm)}${sub ? `<small>${esc(sub)}</small>` : ''}</b>${easy && opt.easy ? `<kbd class="e">${esc(easy)}</kbd>` : ''}<kbd>${esc(inp)}</kbd></div>`;
    const ek = { n: 'Speciaal', f: '→ + Speciaal', d: '↓ + Speciaal' };
    let h = `<div class="vd-mvh">Speciale aanvallen</div>`;
    for (const s of C.sp) { const key = Object.keys(C.easy).find(k => C.easy[k] === s.id); h += row(s.nm, s.desc, `${INPUT_TXT[s.in]} + ${s.b === 'P' ? 'Stoot' : 'Trap'}`, key ? ek[key] : null); }
    h += `<div class="vd-mvh">Supertechniek (volle meter)</div>` + row(C.su.nm, C.su.desc, `${INPUT_TXT[C.su.in]} + ${C.su.b === 'P' ? 'Stoot' : 'Trap'}`, 'SUPER-knop');
    h += `<div class="vd-mvh">Basis</div>` + row('Worp', 'dichtbij, ook om los te breken', '→ of ← + Zware stoot') + row('Blokken', 'laag: hurkend blokken, sprongaanvallen: staand', '← (weg van de ander)')
      + row('Dash', 'snel vooruit of achteruit', '→→ of ←←') + row('Combo', 'lichte aanvallen achter elkaar, eindig met een special', 'Trap, Trap, ↓↘→ ...')
      + row('Veegtrap', 'gooit om, laag blokken', '↓ + Zware trap') + row('Opstoot', 'goed tegen springers', '↓ + Zware stoot');
    return h;
  }
  function openMoves(i) {
    G.movesI = i; const ids = M ? [M.P[0].C.id, M.P[1].C.id] : [G.picks[0]];
    $('#vdMovesTabs').innerHTML = ids.map((id, k) => `<button data-i="${k}" class="${k === i ? 'on' : ''}">${esc(CAST_BY[id].nm)}</button>`).join('');
    $('#vdMovesTitle').textContent = 'Bewegingen';
    $('#vdMovesList').innerHTML = moveRows(CAST_BY[ids[i]]);
    closeModals(); openModal('vdMovesModal');
  }
  $('#vdMovesTabs').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) openMoves(+b.dataset.i); });
  $('#vdMovesOk').addEventListener('click', () => { if (G && G.view === 'fight' && !G.done) openPause(); else closeModals(); });

  /* ---------- the start dialog ---------- */
  const OPTS = { easy: ['Makkelijke specials', 'met een Speciaal-knop'], shake: ['Schermschudden', ''], vib: ['Trillen bij treffers', ''], sound: ['Geluidseffecten', ''], music: ['Achtergrondmuziek', ''] };
  function optRows(keys) { return keys.map(k => `<div class="opt"><div class="opt-label">${OPTS[k][0]}${OPTS[k][1] ? ` <small>· ${OPTS[k][1]}</small>` : ''}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join(''); }
  function onOpt(e, again) {
    const b = e.target.closest('button[data-k]'); if (!b) return false;
    const k = b.dataset.k; opt[k] = b.dataset.v === 'true' || (b.dataset.v !== 'false' && b.dataset.v);
    if (k === 'diff') opt.diff = b.dataset.v;
    saveOpt(); R.optShake = opt.shake; Sfx.refresh && Sfx.refresh();
    if (k === 'easy' && M) { M.P[0].easy = opt.easy; if (G.mode === 'vs2') M.P[1].easy = opt.easy; layoutPad(); }
    sfx('vdSel'); again(); return true;
  }
  function renderStart() {
    const C = run && CAST_BY[run.ch];
    $('#vdContinue').hidden = !run;
    if (run) $('#vdContinue').innerHTML = `<img src="${portrait(run.ch)}" alt=""><span><b>Verder met je toernooi</b><small>${esc(C.nm)} · gevecht ${run.idx + 1} van ${run.order.length} · ${DIFF.find(d => d[0] === run.diff)[1]}</small></span><em>Verder ▶</em>`;
    $('#vdModes').innerHTML = MODES.map(([id, ic, nm, sub]) => `<button class="vd-mode" data-m="${id}"><span class="ic">${ic}</span><b>${nm}</b><small>${sub}</small></button>`).join('');
    $('#vdOpts').innerHTML = `<div class="opt"><div class="opt-label">Moeilijkheid computer</div><div class="seg">${DIFF.map(([v, l]) => `<button data-k="diff" data-v="${v}" class="${opt.diff === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>` + optRows(['easy', 'shake', 'vib', 'sound', 'music']);
    const all = CAST.every(c => stats.winsBy[c.id]);
    $('#vdStats').innerHTML = [['Gewonnen', `${stats.wins}/${stats.fights}`], ['Toernooien', stats.clears], ['Beste tijd', stats.bestTime ? fmtT(stats.bestTime) : '–']].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('')
      + `<div class="vd-trophy-line" style="grid-column:1/-1">Gewonnen met ${CAST.filter(c => stats.winsBy[c.id]).length}/${CAST.length} vechters${all ? ' 🎉' : ''} · ${stats.perfects} perfecte rondes · ${stats.superKO} superfinishes</div>`;
  }
  function openStart() {
    releaseAll(); closeModals();
    G = { view: 'start', mode: null, picks: [null, null] }; M = null; AIs = [null, null];
    setView('start'); fit(); attract();
    renderStart(); openModal('vdStartModal');
  }
  let attractM = null;
  function attract() {                                           // a still scene behind the dialog (drawn once, no loop)
    try {
      const st = STAGES[(Math.random() * STAGES.length) | 0].id, ids = CAST.filter(c => !c.boss || stats.unlocked).map(c => c.id), a = ids[(Math.random() * ids.length) | 0];
      let b = ids[(Math.random() * ids.length) | 0]; if (b === a) b = ids[(ids.indexOf(a) + 1) % ids.length];
      const Ma = Core.newMatch({ p: [{ ch: a }, { ch: b }], stage: st, noIntro: 1 }); Ma.phase = 'ready'; Ma.P[0].x = 520; Ma.P[1].x = 680;
      R.setStage(st); R.reset(); R.layersVisible(true); attractM = Ma; R.frame(Ma, { noHud: 1 });
    } catch (e) { console.error(e); }
  }
  $('#vdModes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; sfx('vdOk'); openSelect(b.dataset.m); });
  $('#vdContinue').addEventListener('click', () => { if (!run) return; sfx('vdOk'); G = { view: 'start', mode: 'arcade', picks: [null, null] }; arcadeNext(); });
  $('#vdOpts').addEventListener('click', e => onOpt(e, renderStart));
  $('#vdStartBack').addEventListener('click', () => { closeModals(); quit(); });
  $('#vdRotBack').addEventListener('click', () => { closeModals(); quit(); });
  let toastT = 0;
  function toast(t) { const el = $('#vdToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('vd'); R.optShake = opt.shake;
    requestAnimationFrame(() => fit());
    if (G && G.view === 'fight' && M && !G.done) { setView('fight'); fit(); R.frame(M, hudOpt()); openPause(); return; }
    openStart();
  }
  function quit() { attractM = null; if (raf > 0) cancelAnimationFrame(raf); raf = 0; clearTimeout(pollT); releaseAll(); closeModals(); G = null; M = null; AIs = [null, null]; scr.classList.remove('sel', 'fight', 'land'); show('menu'); refreshMenu(); }
  // back: during a fight it pauses; on the select screen it goes back to the start dialog
  function leave() {
    if (G && G.view === 'fight' && M && !G.done) { setTimeout(() => { if (current === 'vd' && !anyModal()) openPause(); }, 0); return; }
    if (G && G.view === 'sel') { setTimeout(() => { if (current === 'vd') openStart(); }, 0); return; }
    quit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'vd' && G && G.view === 'fight' && !G.done && !anyModal()) openPause(); });

  /* ---------- test hooks ---------- */
  window.__vd = {
    get M() { return M; }, get G() { return G; }, get R() { return R; }, opt, stats: () => stats, run: () => run, PADS, get layout() { return layout; },
    frames: () => frames.slice(), running: () => raf > 0 || raf === -1, openStart, openSelect, openPause, startVs, quit, step: n => { for (let i = 0; i < n && M; i++) stepGame(); },
    finite: () => [acc, lastT, tick].every(Number.isFinite) && (!M || [M.timer, M.P[0].x, M.P[1].x, M.P[0].hp, M.P[1].hp].every(Number.isFinite)),
    nearlyWin(side = 0) { if (!M) return; const V = M.P[1 - side]; V.hp = Math.min(V.hp, 1); },
    btnCenter(p, k) { const b = layout && layout.pl[p].b[k]; if (!b) return null; const r = stageEl.getBoundingClientRect(); return { x: r.left + b[0], y: r.top + b[1] }; },
    stickCenter(p) { const r = stageEl.getBoundingClientRect(); return { x: r.left + layout.pl[p].stick[0], y: r.top + layout.pl[p].stick[1], r: layout.pl[p].sr }; },
    quality: () => quality, level: () => level,
    inputs: () => inputLog.length,
    cur: () => current,
    evc: (t, side) => (EVC[t] || [0, 0])[side == null ? 0 : side] + (side == null ? (EVC[t] || [0, 0])[1] : 0),
    freezeCpu(v) { window.__vdFreeze = !!v; }, cpuBoth(lvl = 'normaal') { AIs = [AI.create(lvl, 11, 0), AI.create(lvl, 12, 1)]; }, meter(p, v) { if (M) M.P[p].meter = v; },
  };
  return { enter, leave, hasSave: () => !!store.get('vd.run', null) };

})();
$('#tileVd').addEventListener('click', () => Vuistduel.enter());
