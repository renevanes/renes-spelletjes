/* ================================================================
   ZANDRIJK – an original real-time strategy game in the desert: harvest glowing kristal, build a base on the rocks,
   train soldiers and vehicles and defeat the other factions (Zonnegilde, Stormclan, IJzerbond). A campaign of nine
   missions, free play against one or two computer opponents, the sand creeper, fog of war, save/resume.
   Family friendly: destroyed units become smoke and scrap.
   ================================================================ */
const Zandrijk = (() => {
  /* ================= data.js: factions, units, buildings, damage, tech tree, the campaign (no DOM) ================= */
  const TPS = 15;                                   // simulation ticks per second
  const CORE_V = 3;                                 // save format version
  const T_SAND = 0, T_ROCK = 1, T_DUNE = 2, T_CLIFF = 3;   // terrain; crystal lies on sand (S.cry), slabs on rock (S.slab)
  const FACTIONS = [
    { id: 'zon', nm: 'Zonnegilde', col: '#f29a1e', c2: '#ffd768', dk: '#8c4a06', emb: 'sun', sp: 'stral',
      txt: 'Handelaars van het licht. Hun Zonnestralers bundelen zonlicht tot een hete straal.' },
    { id: 'storm', nm: 'Stormclan', col: '#2f86e6', c2: '#9fd4ff', dk: '#123d78', emb: 'bolt', sp: 'bliks',
      txt: 'Snelle ruiters van de woestijnwind. Hun Bliksemwagens laten vonken overspringen.' },
    { id: 'ijzer', nm: 'IJzerbond', col: '#d23c3a', c2: '#b4b9c0', dk: '#5c1616', emb: 'gear', sp: 'kolos',
      txt: 'Taaie smeden uit de rotsen. Hun Kolos is traag maar bijna niet kapot te krijgen.' },
  ];
  // damage multipliers: weapon type -> armour class
  const MULT = {
    kogel:   { inf: 1, licht: .55, zwaar: .22, geb: .25 },
    kanon:   { inf: .45, licht: 1, zwaar: .9, geb: .75 },
    raket:   { inf: .3, licht: 1.05, zwaar: 1.3, geb: .85 },
    granaat: { inf: 1.25, licht: .8, zwaar: .45, geb: 1 },
    straal:  { inf: .7, licht: 1.2, zwaar: 1.25, geb: .7 },
    bliksem: { inf: 1.2, licht: 1, zwaar: .7, geb: .6 },
  };
  const WNAME = { kogel: 'kogels', kanon: 'granaten', raket: 'raketten', granaat: 'artillerie', straal: 'zonnestraal', bliksem: 'bliksem' };
  // units. spd tiles/s, rng/sight tiles, cd ticks, bt build time seconds, trn turn rate rad/tick
  const UT = {
    sol:   { nm: 'Soldaat', cat: 'inf', cost: 60, bt: 5, hp: 80, arm: 'inf', spd: 1.15, sight: 5, rng: 3.6, dmg: 7, cd: 9, wt: 'kogel', r: .2, req: ['kaz'], tip: 'goed tegen soldaten' },
    raks:  { nm: 'Raketsoldaat', cat: 'inf', cost: 110, bt: 6, hp: 70, arm: 'inf', spd: .95, sight: 5, rng: 5, dmg: 30, cd: 32, wt: 'raket', r: .2, req: ['kaz', 'radar'], tip: 'goed tegen voertuigen' },
    verk:  { nm: 'Verkenner', cat: 'veh', cost: 160, bt: 6, hp: 150, arm: 'licht', spd: 3.3, sight: 7, rng: 4, dmg: 7, cd: 6, wt: 'kogel', r: .34, trn: .5, req: ['fab'], tip: 'snel, ziet ver' },
    lt:    { nm: 'Lichte tank', cat: 'veh', cost: 300, bt: 9, hp: 320, arm: 'zwaar', spd: 1.95, sight: 5.5, rng: 4.6, dmg: 30, cd: 21, wt: 'kanon', r: .42, trn: .28, tur: 1, req: ['fab'], tip: 'alleskunner' },
    zt:    { nm: 'Zware tank', cat: 'veh', cost: 520, bt: 14, hp: 600, arm: 'zwaar', spd: 1.35, sight: 5.5, rng: 5, dmg: 52, cd: 30, wt: 'kanon', r: .5, trn: .18, tur: 1, req: ['fab', 'radar'], tip: 'sterk pantser' },
    rw:    { nm: 'Raketwerper', cat: 'veh', cost: 460, bt: 13, hp: 190, arm: 'licht', spd: 1.5, sight: 6, rng: 8.5, minr: 2.5, dmg: 62, cd: 54, wt: 'granaat', splash: 1.35, r: .42, trn: .25, tur: 1, req: ['fab', 'radar'], tip: 'ver weg, tegen groepen' },
    oog:   { nm: 'Oogster', cat: 'veh', cost: 550, bt: 13, hp: 700, arm: 'zwaar', spd: 1.3, sight: 4, r: .55, trn: .2, harv: 700, req: ['fab', 'raff'], tip: 'haalt kristal' },
    stral: { nm: 'Zonnestraler', fac: 'zon', cat: 'veh', cost: 720, bt: 18, hp: 420, arm: 'zwaar', spd: 1.55, sight: 6, rng: 6, dmg: 6.5, cd: 1, wt: 'straal', r: .48, trn: .22, tur: 1, req: ['fab', 'radar', 'rep'], tip: 'hete straal, smelt pantser' },
    bliks: { nm: 'Bliksemwagen', fac: 'storm', cat: 'veh', cost: 650, bt: 16, hp: 280, arm: 'licht', spd: 2.7, sight: 6, rng: 5.2, dmg: 46, cd: 26, wt: 'bliksem', chain: 3, r: .42, trn: .35, tur: 1, req: ['fab', 'radar', 'rep'], tip: 'vonken springen over' },
    kolos: { nm: 'Kolos', fac: 'ijzer', cat: 'veh', cost: 900, bt: 22, hp: 1250, arm: 'zwaar', spd: .95, sight: 6, rng: 5.5, dmg: 44, cd: 24, wt: 'kanon', twin: 1, regen: 1, r: .62, trn: .14, tur: 1, req: ['fab', 'radar', 'rep'], tip: 'dubbel kanon, herstelt zich' },
  };
  // buildings. pw = power (+ makes, - uses), cap = kristal storage
  const BT = {
    bouw:  { nm: 'Bouwplaats', w: 3, h: 3, hp: 1700, cost: 1500, bt: 0, pw: 10, cap: 1000, sight: 6, noBuild: 1 },
    plaat: { nm: 'Betonplaat', w: 2, h: 2, hp: 1, cost: 20, bt: 2, pw: 0, slab: 1, req: [], tip: 'gebouwen erop zijn steviger' },
    cent:  { nm: 'Energiecentrale', w: 2, h: 2, hp: 550, cost: 250, bt: 9, pw: 100, req: [], tip: '+100 energie' },
    raff:  { nm: 'Raffinaderij', w: 3, h: 2, hp: 950, cost: 450, bt: 13, pw: -30, cap: 1000, req: ['cent'], tip: 'met gratis oogster' },
    silo:  { nm: 'Opslagsilo', w: 2, h: 2, hp: 420, cost: 150, bt: 5, pw: -5, cap: 1500, req: ['raff'], tip: '+1500 opslag' },
    kaz:   { nm: 'Kazerne', w: 2, h: 2, hp: 550, cost: 250, bt: 9, pw: -15, req: ['cent'], tip: 'traint soldaten' },
    fab:   { nm: 'Voertuigfabriek', w: 3, h: 3, hp: 1100, cost: 600, bt: 16, pw: -30, req: ['raff', 'kaz'], tip: 'bouwt voertuigen' },
    radar: { nm: 'Radar', w: 2, h: 2, hp: 650, cost: 500, bt: 13, pw: -30, sight: 9, req: ['fab'], tip: 'kaartje en nieuwe techniek' },
    toren: { nm: 'Verdedigingstoren', w: 1, h: 1, hp: 520, cost: 250, bt: 8, pw: -15, rng: 5.2, sight: 6, dmg: 24, cd: 14, wt: 'kanon', req: ['kaz'], tip: 'kanon, alleen met energie' },
    rep:   { nm: 'Reparatieplaats', w: 3, h: 2, hp: 800, cost: 400, bt: 12, pw: -20, req: ['fab', 'radar'], tip: 'repareert voertuigen' },
    rpaal: { nm: 'Raketpaal', w: 1, h: 1, hp: 480, cost: 550, bt: 12, pw: -30, rng: 7.6, sight: 8, dmg: 38, cd: 30, wt: 'raket', twin: 1, req: ['radar'], tip: 'raketten, ver bereik' },
  };
  const TIER = { plaat: 1, cent: 1, raff: 1, silo: 1, kaz: 1, fab: 2, radar: 2, toren: 2, rep: 3, rpaal: 3, sol: 1, oog: 2, verk: 2, lt: 2, raks: 2, zt: 3, rw: 3, stral: 3, bliks: 3, kolos: 3 };
  const BUILD_LIST = ['cent', 'raff', 'kaz', 'silo', 'plaat', 'fab', 'toren', 'radar', 'rep', 'rpaal'];
  const INF_LIST = ['sol', 'raks'];
  const VEH_LIST = ['oog', 'verk', 'lt', 'zt', 'rw', 'stral', 'bliks', 'kolos'];
  const UNIT_CAP = 60;                               // per player (performance on phones)
  const DIFFS = [
    { nm: 'Makkelijk', think: 22, eco: .8, build: .8, wave0: 330, gap: 170, size0: 3, grow: 1, maxW: 10, harv: 1, mix: ['sol', 'sol', 'verk', 'lt', 'lt'], tow: 2 },
    { nm: 'Normaal', think: 14, eco: 1, build: 1, wave0: 230, gap: 125, size0: 4, grow: 2, maxW: 18, harv: 2, mix: ['sol', 'raks', 'verk', 'lt', 'lt', 'zt', 'rw', 'sp'], tow: 3 },
    { nm: 'Moeilijk', think: 8, eco: 1.4, build: 1.35, wave0: 165, gap: 95, size0: 5, grow: 2, maxW: 26, harv: 2, mix: ['sol', 'raks', 'raks', 'lt', 'zt', 'zt', 'rw', 'sp', 'sp'], tow: 4 },
  ];
  const SIZES = { klein: [48, 48], middel: [64, 64], groot: [84, 84] };

  /* ---------- the campaign: three short storylines, three missions each ---------- */
  // start kinds: 'mcv' bouwplaats + a few units; 'base' small base; 'army' units only; 'outpost' buildings without a bouwplaats
  const MISSIONS = [
    { fac: 0, nm: 'Zand in je schoenen', tier: 1, par: 7, map: { seed: 101, w: 44, h: 40, n: 2, rich: 1.3, rock: .3, cliffs: .3 }, kr: 1, cry: 900,
      start: 'mcvp', enemies: [], obj: [{ t: 'build', b: 'raff', n: 1 }, { t: 'collect', n: 1500 }],
      brief: 'Welkom in Zandrijk, gildemeester! Onder het zand groeit kristal dat gloeit als de zon. Bouw een raffinaderij op de rotsen en verzamel 1500 kristal.\n\nLet op: in het open zand woont de zandkruiper. Hij kan je oogster opslokken. Op rots ben je veilig.' },
    { fac: 0, nm: 'Kostbare lading', tier: 2, par: 10, map: { seed: 202, w: 52, h: 48, n: 2, rich: 1.1, rock: .32, cliffs: .4 }, kr: 1, cry: 1200,
      start: 'base', enemies: [{ fac: 1, diff: 0, start: 'outpost', raid: 1 }], obj: [{ t: 'collect', n: 4000 }, { t: 'protect', ut: 'oog' }],
      brief: 'De Stormclan stuurt verkenners op onze oogsters af. Verzamel 4000 kristal en zorg dat je altijd minstens één oogster over hebt.\n\nTip: een verdedigingstoren bij de kristalvelden helpt enorm.' },
    { fac: 0, nm: 'Zonsopgang', tier: 3, par: 16, map: { seed: 303, w: 60, h: 56, n: 2, rich: 1, rock: .34, cliffs: .45 }, kr: 1, cry: 2000,
      start: 'mcv', enemies: [{ fac: 2, diff: 0, start: 'mcv' }], obj: [{ t: 'destroy' }],
      brief: 'De IJzerbond heeft zich ingegraven in het oosten. Bouw een sterk leger, met je nieuwe Zonnestraler, en vernietig hun basis.' },
    { fac: 1, nm: 'Bliksemstart', tier: 2, par: 9, map: { seed: 404, w: 48, h: 44, n: 2, rich: 1.2, rock: .3, cliffs: .3 }, kr: 1, cry: 1500,
      start: 'mcv', enemies: [{ fac: 2, diff: 0, start: 'outpost' }], obj: [{ t: 'build', b: 'fab', n: 1 }, { t: 'army', n: 6 }, { t: 'destroy' }],
      brief: 'Stormruiter, de clan rekent op je! Bouw een voertuigfabriek, verzamel een leger van zes eenheden en jaag de IJzerbond van hun buitenpost.' },
    { fac: 1, nm: 'Storm over de duinen', tier: 2, par: 9, map: { seed: 505, w: 54, h: 50, n: 2, rich: 1.1, rock: .3, cliffs: .35, dunes: 1.4 }, kr: 1, cry: 1800,
      start: 'base', enemies: [{ fac: 0, diff: 1, start: 'base', aggro: 1 }], obj: [{ t: 'survive', min: 8 }],
      brief: 'De Zonnegilde valt aan met golf na golf. Houd het 8 minuten vol! Bouw torens en zet je tanks achter de rotsen.' },
    { fac: 1, nm: 'Het oog van de storm', tier: 3, par: 18, map: { seed: 606, w: 64, h: 60, n: 2, rich: 1, rock: .32, cliffs: .45 }, kr: 1, cry: 2500,
      start: 'mcv', enemies: [{ fac: 0, diff: 1, start: 'mcv' }], obj: [{ t: 'destroy' }],
      brief: 'Nu slaan wij terug. Gebruik je snelle Bliksemwagens en vernietig de basis van de Zonnegilde.' },
    { fac: 2, nm: 'IJzeren wil', tier: 2, par: 8, map: { seed: 707, w: 50, h: 46, n: 2, rich: 1, rock: .36, cliffs: .45 }, kr: 0, cry: 0,
      start: 'army', enemies: [{ fac: 1, diff: 0, start: 'outpost', cry: 400 }], obj: [{ t: 'destroy' }],
      brief: 'Geen bouwplaats deze keer, smid. Je hebt alleen dit leger. Vernietig de buitenpost van de Stormclan en verlies niet al je eenheden.\n\nTip: zet de raketwerpers achter je tanks.' },
    { fac: 2, nm: 'Kristalkoorts', tier: 3, par: 14, map: { seed: 808, w: 60, h: 56, n: 2, rich: .9, rock: .34, cliffs: .4 }, kr: 1, cry: 2000,
      start: 'base', enemies: [{ fac: 1, diff: 1, start: 'base' }], obj: [{ t: 'collect', n: 8000 }],
      brief: 'Kristal is kracht. Verzamel 8000 kristal voordat de Stormclan ons inhaalt. Bescherm je oogsters tegen hun aanvallen.' },
    { fac: 2, nm: 'De laatste vesting', tier: 3, par: 25, map: { seed: 909, w: 72, h: 68, n: 3, rich: 1, rock: .32, cliffs: .45 }, kr: 1, cry: 3000,
      start: 'mcv', enemies: [{ fac: 0, diff: 1, start: 'mcv' }, { fac: 1, diff: 0, start: 'mcv' }], obj: [{ t: 'destroy' }],
      brief: 'Zonnegilde en Stormclan hebben zich tegen ons verbonden. Bouw de sterkste basis van Zandrijk, met je Kolos voorop, en vernietig ze allebei.' },
  ];
  // what a building or unit is for (the info card when you select one, or hold a button in the build bar)
  const INFO = {
    bouw: 'Je hoofdgebouw. Hier worden al je andere gebouwen gemaakt. Raak je hem kwijt, dan kun je niets nieuws meer bouwen.',
    plaat: 'Een betonvloer op de rots. Gebouwen die erop staan, krijgen een kwart minder schade.',
    cent: 'Maakt energie. Heb je te weinig energie, dan werken je gebouwen langzaam, schieten torens niet en valt de radar uit.',
    raff: 'Hier brengen oogsters het kristal heen: zo verdien je geld. Je krijgt er een oogster bij.',
    silo: 'Extra opslag voor kristal. Is alles vol, dan kunnen je oogsters niet meer lossen.',
    kaz: 'Traint soldaten. Kies ze bij Soldaten in de bouwbalk.',
    fab: 'Bouwt voertuigen: oogsters, verkenners en tanks. Kies ze bij Voertuigen in de bouwbalk.',
    radar: 'Laat het kaartje zien (met genoeg energie) en geeft nieuwe techniek, zoals zware tanks en raketten.',
    toren: 'Schiet met een kanon op vijanden in de buurt. Werkt alleen met genoeg energie.',
    rep: 'Repareert voertuigen. Kies een voertuig en tik dan op de reparatieplaats.',
    rpaal: 'Schiet raketten tot ver weg, sterk tegen voertuigen. Werkt alleen met genoeg energie.',
    sol: 'Goedkope soldaat met een geweer. Sterk tegen soldaten, zwak tegen tanks.',
    raks: 'Soldaat met raketten. Sterk tegen tanks en voertuigen, maar herlaadt langzaam.',
    verk: 'Snelle wagen die ver kan kijken. Handig om de kaart te verkennen.',
    lt: 'Snelle tank die alles een beetje kan.',
    zt: 'Langzame tank met dik pantser en een groot kanon.',
    rw: 'Schiet van heel ver en raakt groepen tegelijk, maar niet van dichtbij. Zet hem achter je tanks.',
    oog: 'Haalt kristal uit het zand en brengt het naar de raffinaderij. Pas op voor de zandkruiper!',
    stral: 'Bundelt zonlicht tot een hete straal die zelfs dik pantser smelt.',
    bliks: 'Snelle wagen met bliksem die overspringt naar drie vijanden.',
    kolos: 'Enorme tank met twee kanonnen. Traag, maar herstelt zichzelf.',
    kruiper: 'De zandkruiper woont in het open zand en slokt soms een eenheid op. Op rots ben je veilig. Schiet erop, dan duikt hij weg.',
  };
  const ARM_NM = { inf: 'soldaten', licht: 'lichte voertuigen', zwaar: 'tanks', geb: 'gebouwen' };
  const OBJ_TXT = o => o.t === 'build' ? `Bouw ${o.n > 1 ? o.n + '× ' : 'een '}${BT[o.b].nm.toLowerCase()}` : o.t === 'collect' ? `Verzamel ${o.n} kristal` : o.t === 'protect' ? 'Houd minstens één oogster over'
    : o.t === 'survive' ? `Houd ${o.min} minuten stand` : o.t === 'army' ? `Verzamel een leger van ${o.n} eenheden` : o.t === 'destroy' ? 'Vernietig alle vijandelijke gebouwen' : '';
  // match configurations for a campaign mission (adj: campaign difficulty -1/0/+1; auto: let the computer play the player too)
  function missionCfg(i, adj = 0, auto = null) {
    const M = MISSIONS[i];
    return { map: M.map, players: [{ fac: M.fac, ai: auto, start: M.start, cry: M.cry }, ...M.enemies.map(e => ({ fac: e.fac, ai: Math.max(0, Math.min(2, e.diff + adj)), start: e.start, cry: e.cry ?? 2000, raid: e.raid, aggro: e.aggro }))],
      kr: !!M.kr, obj: M.obj, tier: M.tier, human: 0, mission: i, seed: M.map.seed * 977 + 3 };
  }
  // skirmish (Vrij spel): o = { fac, opp (1|2), diff (0..2), size, cry, kr, seed }
  function skirmishCfg(o) {
    const [w, h] = SIZES[o.size] || SIZES.middel, n = 1 + (o.opp === 2 ? 2 : 1), others = [0, 1, 2].filter(f => f !== o.fac);
    const players = [{ fac: o.fac, ai: null, start: 'mcv', cry: o.cry }];
    for (let k = 0; k < n - 1; k++) players.push({ fac: n === 2 ? others[o.seed % 2] : others[k], ai: o.diff, start: 'mcv', cry: o.cry });
    return { map: { seed: o.seed, w, h, n }, players, kr: o.kr !== false, obj: null, tier: 3, human: 0, seed: (o.seed * 31 + 5) >>> 0 };
  }

  /* ================= map.js: seeded desert map generator (no DOM) ================= */
  // xorshift32: returns a function giving [0, 1); its state can be read with .s and restored
  function rng(seed) { let s = (seed >>> 0) || 0x9e3779b9; const f = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; f.get = () => s; f.set = v => { s = v >>> 0 || 1; }; return f; }
  const hash2 = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2246822519)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  function vnoise(x, y, s) {                       // smooth value noise in [0, 1)
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  const fbm = (x, y, s) => (vnoise(x, y, s) * .55 + vnoise(x * 2.1, y * 2.1, s + 17) * .3 + vnoise(x * 4.3, y * 4.3, s + 31) * .15);

  function genMap(p) {
    const W = p.w, H = p.h, N = W * H, R = rng(p.seed * 7919 + 13), sd = p.seed | 0;
    const ter = new Uint8Array(N), cry = new Uint8Array(N), cmax = new Uint8Array(N);
    const n = p.n || 2, m = Math.max(7, Math.round(Math.min(W, H) * .16));
    // base positions (start plateaus)
    let bases;
    if (n === 2) { const flip = R() < .5; bases = flip ? [[m + 1, H - m - 1], [W - m - 2, m]] : [[m + 1, m + 1], [W - m - 2, H - m - 2]]; }
    else { bases = [[m + 1, m + 1], [W - m - 1, Math.round(m + H * .12)], [Math.round(W * .42), H - m - 1]]; }
    bases = bases.slice(0, n).map(([x, y]) => ({ x, y }));
    const baseR = Math.max(6.5, Math.min(8.5, Math.min(W, H) * .13));
    const dBase = (x, y) => { let b = 1e9; for (const B of bases) b = Math.min(b, Math.hypot(x - B.x, y - B.y)); return b; };
    // rock patches
    const rockAmt = p.rock ?? .3, thr = .62 - rockAmt * .35;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, v = fbm(x / 9, y / 9, sd + 3);
      if (v > thr) ter[i] = T_ROCK;
    }
    // base plateaus: rock with a wobbly edge
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      for (const B of bases) { const d = Math.hypot(x - B.x, y - B.y), ang = Math.atan2(y - B.y, x - B.x); if (d < baseR + Math.sin(ang * 3 + sd) * 1.2 + vnoise(x / 3, y / 3, sd + 9) * 1.5) ter[y * W + x] = T_ROCK; }
    }
    // cliffs inside the rock patches, away from the bases
    const cl = p.cliffs ?? .4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (ter[i] !== T_ROCK || dBase(x, y) < baseR + 3) continue;
      const v = vnoise(x / 4.2, y / 4.2, sd + 21);
      if (v > 1 - cl * .55) ter[i] = T_CLIFF;
    }
    // dune ridges in the open sand
    const du = p.dunes ?? 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (ter[i] !== T_SAND || dBase(x, y) < baseR + 2.5) continue;
      const v = fbm(x / 7 + y / 19, y / 5.5, sd + 41), w = vnoise(x / 6, y / 6, sd + 47);
      if (Math.abs(v - .5) < .028 * du && w > .45) ter[i] = T_DUNE;
    }
    // crystal fields: two near every base (fair), a few in the middle
    const fields = [];
    const cx = W / 2, cy = H / 2;
    for (const B of bases) {
      const a0 = Math.atan2(cy - B.y, cx - B.x);
      for (const da of [-.75, .75]) {
        const a = a0 + da + (R() - .5) * .3, d = baseR + 4.5 + R() * 3;
        fields.push({ x: B.x + Math.cos(a) * d, y: B.y + Math.sin(a) * d, r: 2.6 + R() * .8 });
      }
    }
    const nMid = Math.max(1, Math.round(W * H / 1100));
    for (let k = 0; k < nMid; k++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = 5 + R() * (W - 10), y = 5 + R() * (H - 10);
        if (dBase(x, y) < baseR + 7 || fields.some(f => Math.hypot(f.x - x, f.y - y) < 8)) continue;
        fields.push({ x, y, r: 3 + R() * 1.6 }); break;
      }
    }
    const rich = p.rich ?? 1;
    for (const f of fields) {
      const r = f.r, x0 = Math.floor(f.x - r - 1), x1 = Math.ceil(f.x + r + 1), y0 = Math.floor(f.y - r - 1), y1 = Math.ceil(f.y + r + 1);
      for (let y = Math.max(1, y0); y <= Math.min(H - 2, y1); y++) for (let x = Math.max(1, x0); x <= Math.min(W - 2, x1); x++) {
        const i = y * W + x, d = Math.hypot(x + .5 - f.x, y + .5 - f.y) / (r * (.8 + vnoise(x / 2, y / 2, sd + 61) * .45));
        if (d >= 1) continue;
        if (ter[i] === T_ROCK && dBase(x, y) < baseR + 1.5) continue;     // never on the start plateau
        ter[i] = T_SAND;
        const v = Math.min(250, Math.round((70 + 180 * (1 - d)) * rich));
        cry[i] = Math.max(cry[i], v); cmax[i] = cry[i];
      }
    }
    // two players: point-symmetric map (same distances, same crystal) so the start is fair
    const sym = n === 2;
    if (sym) {
      for (let i = N - 1; i > (N - 1) / 2; i--) { ter[i] = ter[N - 1 - i]; cry[i] = cry[N - 1 - i]; cmax[i] = cmax[N - 1 - i]; }
      const half = fields.filter(f => Math.floor(f.y) * W + Math.floor(f.x) <= (N - 1) / 2);
      fields.length = 0; for (const f of half) fields.push(f, { x: W - f.x, y: H - f.y, r: f.r });
    }
    // keep a sand ring of 1 tile around the map edge passable-ish (no cliffs on the border)
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (ter[y * W + x] >= T_DUNE) ter[y * W + x] = T_SAND;
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (ter[y * W + x] >= T_DUNE) ter[y * W + x] = T_SAND;
    // connectivity: everything that matters must be reachable from base 0
    const pass = i => ter[i] <= T_ROCK;
    const reach = new Uint8Array(N);
    const flood = () => {
      reach.fill(0); const q = new Int32Array(N); let h = 0, t = 0; const s0 = bases[0].y * W + bases[0].x; reach[s0] = 1; q[t++] = s0;
      while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!reach[j] && pass(j)) { reach[j] = 1; q[t++] = j; } } }
    };
    const carve = (x, y) => {               // dig a 2-wide corridor from (x, y) to the nearest reachable tile
      let best = -1, bd = 1e9;
      for (let j = 0; j < N; j++) if (reach[j]) { const d = Math.hypot(j % W - x, ((j / W) | 0) - y); if (d < bd) { bd = d; best = j; } }
      if (best < 0) return;
      const tx = best % W, ty = (best / W) | 0, steps = Math.ceil(bd * 2) + 1;
      for (let s = 0; s <= steps; s++) {
        const px = Math.round(x + (tx - x) * s / steps), py = Math.round(y + (ty - y) * s / steps);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; for (const j of sym ? [qy * W + qx, N - 1 - (qy * W + qx)] : [qy * W + qx]) { if (ter[j] === T_CLIFF) ter[j] = T_ROCK; else if (ter[j] === T_DUNE) ter[j] = T_SAND; } }
      }
    };
    for (let pass2 = 0; pass2 < 6; pass2++) {
      flood(); let fixed = false;
      for (const B of bases) if (!reach[B.y * W + B.x]) { carve(B.x, B.y); fixed = true; }
      for (const f of fields) { const i = Math.floor(f.y) * W + Math.floor(f.x); if (!reach[i]) { carve(Math.floor(f.x), Math.floor(f.y)); fixed = true; } }
      if (!fixed) break;
    }
    // isolated pockets of open ground become dunes/cliffs so nothing can be built or spawned out of reach
    flood();
    for (let i = 0; i < N; i++) if (!reach[i] && pass(i)) { ter[i] = ter[i] === T_ROCK ? T_CLIFF : T_DUNE; cry[i] = 0; cmax[i] = 0; }
    let sand = 0; for (let i = 0; i < N; i++) if (ter[i] === T_SAND) sand++;
    return { w: W, h: H, ter, cry, cmax, bases, fields, sandFrac: sand / N };
  }

  /* ================= core.js: deterministic real-time strategy simulation at 15 Hz (no DOM) ================= */
  const DT = 1 / TPS, PI2 = Math.PI * 2, CELL = 4;
  const wrapA = a => { a %= PI2; if (a > Math.PI) a -= PI2; else if (a < -Math.PI) a += PI2; return a; };
  const turnTo = (a, b, r) => { const d = wrapA(b - a); return Math.abs(d) <= r ? b : wrapA(a + Math.sign(d) * r); };
  function rnd(S) { let s = S.rs; s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; S.rs = s; return s / 4294967296; }
  const isB = e => e && e.k === 'b';
  const COMBAT = t => !!UT[t].wt;

  /* ---------- creating a match ---------- */
  // cfg: { map: {seed,w,h,n,rich,rock,cliffs,dunes}, players: [{fac, ai (difficulty index or null), start, cry, raid, aggro}],
  //        kr (sand creeper), obj (mission objectives or null), tier (1..3), mission (index or null), human (player index or -1) }
  function newGame(cfg) {
    const M = genMap(cfg.map);
    const S = { v: CORE_V, t: 0, rs: ((cfg.seed ?? cfg.map.seed * 2654435761) >>> 0) || 7, cfg, nid: 1, U: [], B: [], PJ: [], pq: [], res: null, tier: cfg.tier || 3,
      human: cfg.human ?? 0, fogV: 0, obj: cfg.obj ? cfg.obj.map(o => Object.assign({}, o, { done: false })) : null };
    attachMap(S, M); S.cry = M.cry.slice(); S.slab = new Uint8Array(S.N); S.exp = new Uint8Array(S.N);
    S.P = cfg.players.map((p, i) => ({ i, fac: p.fac, ai: p.ai ?? null, cry: p.cry ?? 2500, q: { b: [], i: [], v: [] }, ready: null, out: false, nb: p.start === 'army',
      st: { harv: 0, built: 0, made: 0, kills: 0, lost: 0, blost: 0 }, bc: {}, ever: {}, pw: 0, pu: 0, cap: 0, low: false, raid: !!p.raid, aggro: !!p.aggro, A: null, base: M.bases[i] }));
    S.kr = cfg.kr && M.sandFrac > .2 ? { st: 'gone', t: Math.round(TPS * (25 + rnd(S) * 25)), x: 0, y: 0, d: 0, px: 0, py: 0, hurt: 0, tg: 0, wx: 0, wy: 0, eat: 0 } : null;
    S.P.forEach((P, i) => setupStart(S, P, cfg.players[i].start || 'mcv'));
    recalc(S);
    if (typeof AI !== 'undefined') for (const P of S.P) if (P.ai != null) AI.init(S, P);
    updateFog(S);
    return S;
  }
  function attachMap(S, M) {
    S.W = M.w; S.H = M.h; S.N = M.w * M.h; S.ter = M.ter; S.cmax = M.cmax; S.bases = M.bases; S.sandFrac = M.sandFrac;
    S.occ = new Int32Array(S.N); S.E = Object.create(null); S.ev = []; S.cd = [];
    S.ft = []; for (let i = 0; i < S.N; i++) if (M.cmax[i]) S.ft.push(i);
    S.hc = Math.ceil(S.W / CELL); S.hr = Math.ceil(S.H / CELL); S.hash = Array.from({ length: S.hc * S.hr }, () => []);
    S.vis = new Uint8Array(S.N); S.mark = new Uint32Array(S.N); S.gen = 1;
    AS.init(S.N);
  }
  function setupStart(S, P, kind) {
    const B = P.base, o = P.i;
    const put = t => { const s = findSpot(S, o, t, B.x, B.y, true, t === 'raff' ? raffAim(S, B.x, B.y) : null); if (s) placeBuilding(S, o, t, s.x, s.y, true); };
    if (kind !== 'army' && kind !== 'outpost') { placeBuilding(S, o, 'bouw', B.x - 1, B.y - 1, true); }
    if (kind === 'mcvp') put('cent');
    if (kind === 'base') { put('cent'); put('raff'); put('kaz'); }
    if (kind === 'outpost') { put('cent'); put('kaz'); put('cent'); put('raff'); put('fab'); put('toren'); put('toren'); }
    const units = kind === 'army' ? ['lt', 'lt', 'lt', 'lt', 'zt', 'rw', 'rw', 'sol', 'sol', 'sol', 'sol', 'raks', 'raks'] : kind === 'outpost' ? ['sol', 'sol', 'sol', 'lt', 'lt'] : kind === 'base' ? ['sol', 'sol', 'lt'] : ['sol', 'sol', 'verk'];
    for (const t of units) { const p = freeNear(S, B.x + .5, B.y + 2.5, 8); if (p) addUnit(S, o, t, p.x, p.y, Math.PI / 2); }
  }

  /* ---------- entities ---------- */
  function addUnit(S, o, t, x, y, d = Math.PI / 2) {
    const T = UT[t];
    const u = { id: S.nid++, k: 'u', t, o, x, y, px: x, py: y, d, pd: d, tu: d, pt: d, hp: T.hp, st: T.harv ? 'harv' : 'idle', gx: x, gy: y, tg: 0, am: 0, cd: 0,
      path: null, pi: 0, wait: 0, goal: -1, sn: 0, ld: 1e9, stk: 0, v: 0, car: 0, hs: 'seek', ht: -1, hx: -1, rf: 0, fl: 0, hit: -99, mv: 0, ch: 0,
      inq: 0, sx: 0, sy: 0, gh: 0, r: T.r, lx: -99, ly: -99, rt: 0, rp: 0, prf: 0, qw: 0, mt: 0, mining: 0, bm: 0, bx: 0, by: 0, rpg: 0, home: 0, dead: 0, ax: 0, ay: 0 };
    S.U.push(u); S.E[u.id] = u; S.P[o].st.made++;
    return u;
  }
  function placeBuilding(S, o, t, x, y, instant) {
    const T = BT[t], P = S.P[o];
    if (T.slab) { for (let j = y; j < y + T.h; j++) for (let i = x; i < x + T.w; i++) { const k = j * S.W + i; if (S.ter[k] === T_ROCK && !S.occ[k]) S.slab[k] = 1; } S.sv = (S.sv || 0) + 1; return null; }
    let sl = 0;
    for (let j = y; j < y + T.h; j++) for (let i = x; i < x + T.w; i++) { const k = j * S.W + i; S.occ[k] = S.nid; if (S.slab[k]) sl++; }
    const b = { id: S.nid++, k: 'b', t, o, x, y, w: T.w, h: T.h, hp: T.hp, mhp: T.hp, bp: instant ? 1 : 0, rep: 0, rally: null, tu: Math.PI / 2, pt: Math.PI / 2, cd: 0, fl: 0, tg: 0, dk: 0, cl: 0, hit: -99, sl: sl / (T.w * T.h) >= .5 ? 1 : 0, ax: 0, ay: 0, dead: 0, prim: 0 };
    S.B.push(b); S.E[b.id] = b; S.rc = 1;
    P.ever[t] = (P.ever[t] || 0) + 1; if (!instant) P.st.built++;
    // own units standing on the footprint step aside
    for (const u of S.U) if (u.x >= x - .3 && u.x < x + T.w + .3 && u.y >= y - .3 && u.y < y + T.h + .3) { const p = freeNear(S, u.x, u.y, 6); if (p) { u.x = u.px = p.x; u.y = u.py = p.y; u.path = null; } }
    if (t === 'raff') { const d = dockOf(b), p = freeNear(S, d.x, d.y, 6); if (p) addUnit(S, o, 'oog', p.x, p.y, Math.PI / 2); }
    return b;
  }
  const center = e => e.k === 'b' ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : e;
  const dockOf = b => ({ x: b.x + Math.floor(b.w / 2) + .5, y: b.y + b.h + .5 });
  function distTo(u, e) {                                   // from a point to a unit, or to the edge of a building
    if (e.k !== 'b') return Math.hypot(e.x - u.x, e.y - u.y);
    const dx = Math.max(e.x - u.x, 0, u.x - (e.x + e.w)), dy = Math.max(e.y - u.y, 0, u.y - (e.y + e.h));
    return Math.hypot(dx, dy);
  }
  const tileOf = (S, x, y) => Math.min(S.H - 1, Math.max(0, Math.floor(y))) * S.W + Math.min(S.W - 1, Math.max(0, Math.floor(x)));
  const passT = (S, i) => S.ter[i] <= T_ROCK && !S.occ[i];
  function freeAt(S, x, y, r) {
    if (x < .05 || y < .05 || x > S.W - .05 || y > S.H - .05) return false;
    if (!passT(S, tileOf(S, x, y))) return false;
    const q = Math.min(r, .34) * .75;
    return passT(S, tileOf(S, x + q, y)) && passT(S, tileOf(S, x - q, y)) && passT(S, tileOf(S, x, y + q)) && passT(S, tileOf(S, x, y - q));
  }
  function unitAt(S, x, y, rad) { for (const u of S.U) if (!u.dead && Math.abs(u.x - x) < rad && Math.abs(u.y - y) < rad) return u; return null; }
  function freeNear(S, x, y, R) {                             // nearest free tile centre (no wall, no unit) in a spiral
    const cx = Math.floor(x), cy = Math.floor(y);
    for (let r = 0; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = cx + dx, ty = cy + dy; if (tx < 0 || ty < 0 || tx >= S.W || ty >= S.H) continue;
      if (!passT(S, ty * S.W + tx)) continue;
      if (unitAt(S, tx + .5, ty + .5, .55)) continue;
      return { x: tx + .5, y: ty + .5 };
    }
    return null;
  }

  /* ---------- power, storage, tech ---------- */
  function recalc(S) {
    for (const P of S.P) { P.pw = 0; P.pu = 0; P.cap = 0; P.bc = {}; }
    for (const b of S.B) { if (b.dead) continue; const P = S.P[b.o], T = BT[b.t]; if (T.pw > 0) P.pw += T.pw; else P.pu -= T.pw; P.cap += T.cap || 0; P.bc[b.t] = (P.bc[b.t] || 0) + 1; }
    for (const P of S.P) P.low = P.pu > P.pw;
    S.rc = 0;
  }
  function techOk(S, o, t) {                                  // can this player build t right now?
    const P = S.P[o], T = UT[t] || BT[t]; if (!T || T.noBuild) return false;
    if ((TIER[t] || 1) > S.tier) return false;
    if (T.fac && FACTIONS[P.fac].id !== T.fac) return false;
    for (const r of T.req || []) if (!P.bc[r]) return false;
    return true;
  }
  const catOf = t => BT[t] ? 'b' : UT[t].cat === 'inf' ? 'i' : 'v';
  const prodOf = { b: 'bouw', i: 'kaz', v: 'fab' };
  const unitCount = (S, o) => { let n = 0; for (const u of S.U) if (u.o === o && !u.dead) n++; return n; };

  /* ---------- placement ---------- */
  function placeTiles(S, o, t, x, y) {                        // per footprint tile: ok?  (+ overall ok incl. the distance rule)
    const T = BT[t], res = []; let ok = true, near = false;
    for (let j = y; j < y + T.h; j++) for (let i = x; i < x + T.w; i++) {
      let good = i >= 0 && j >= 0 && i < S.W && j < S.H;
      if (good) { const k = j * S.W + i; good = S.ter[k] === T_ROCK && !S.occ[k] && (o !== S.human || S.exp[k]); if (good && T.slab && S.slab[k]) good = false; }
      res.push(good); if (!good) ok = false;
    }
    if (!T.slab) for (const u of S.U) { if (u.o === o || u.dead) continue; const i = Math.floor(u.x) - x, j = Math.floor(u.y) - y; if (i >= 0 && j >= 0 && i < T.w && j < T.h) { res[j * T.w + i] = false; ok = false; } }
    if (T.slab && res.some(v => v)) ok = true;
    for (const b of S.B) { if (b.o !== o || b.dead) continue; const gx = Math.max(b.x - (x + T.w), x - (b.x + b.w), 0), gy = Math.max(b.y - (y + T.h), y - (b.y + b.h), 0); if (gx <= 3 && gy <= 3) { near = true; break; } }
    return { tiles: res, ok: ok && near, near };
  }
  // a spot for t near (cx, cy): a ring of free ground around it so the base keeps its roads (used by the computer and the start setup)
  function findSpot(S, o, t, cx, cy, ignoreNear, towards) {
    const T = BT[t], R = 16; let best = null, bs = 1e9;
    for (let r = 0; r <= R; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = Math.round(cx - T.w / 2) + dx, y = Math.round(cy - T.h / 2) + dy;
        if (x < 1 || y < 1 || x + T.w > S.W - 1 || y + T.h > S.H - 1) continue;
        let ok = true;
        for (let j = y - 1; j <= y + T.h && ok; j++) for (let i = x - 1; i <= x + T.w; i++) {
          const k = j * S.W + i, inner = i >= x && i < x + T.w && j >= y && j < y + T.h;
          if (inner) { if (S.ter[k] !== T_ROCK || S.occ[k]) { ok = false; break; } }
          else if (S.occ[k] || S.ter[k] > T_ROCK) { if (T.w > 1 || S.occ[k]) { ok = false; break; } }
        }
        if (!ok) continue;
        // keep the factory and refinery exits open
        const ex = x + Math.floor(T.w / 2), ey = y + T.h; if (ey < S.H && (S.occ[ey * S.W + ex] || S.ter[ey * S.W + ex] > T_ROCK)) continue;
        let blocksExit = false; for (const b of S.B) if (!b.dead && (b.t === 'raff' || b.t === 'fab' || b.t === 'rep' || b.t === 'bouw')) { const d = dockOf(b); if (d.x >= x - .5 && d.x <= x + T.w + .5 && d.y >= y - .5 && d.y <= y + T.h + 1.5) blocksExit = true; }
        if (blocksExit) continue;
        if (!ignoreNear && !placeTiles(S, o, t, x, y).ok) continue;
        const sc = towards ? Math.hypot(x + T.w / 2 - towards.x, y + T.h / 2 - towards.y) + r * .4 : r;
        if (sc < bs) { bs = sc; best = { x, y }; }
      }
      if (best && !towards) return best;
      if (best && towards && r > 9) return best;
    }
    return best;
  }

  function nearField(S, x, y) { let best = -1, bd = 1e9; for (const i of S.ft) { if (S.cry[i] < 30) continue; const d = Math.hypot(i % S.W + .5 - x, ((i / S.W) | 0) + .5 - y); if (d < bd) { bd = d; best = i; } } return best < 0 ? null : { x: best % S.W + .5, y: ((best / S.W) | 0) + .5, d: bd }; }
  function raffAim(S, x, y) { const f = nearField(S, x, y); if (!f) return null; const a = Math.atan2(f.y - y, f.x - x), r = Math.min(5, f.d * .5); return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r - 1.5 }; }
  /* ---------- the spatial hash ---------- */
  function buildHash(S) {
    for (const c of S.hash) c.length = 0;
    for (const u of S.U) { if (u.dead) continue; const cx = Math.min(S.hc - 1, Math.max(0, (u.x / CELL) | 0)), cy = Math.min(S.hr - 1, Math.max(0, (u.y / CELL) | 0)); S.hash[cy * S.hc + cx].push(u); }
  }
  function forNear(S, x, y, r, fn) {
    const x0 = Math.max(0, ((x - r) / CELL) | 0), x1 = Math.min(S.hc - 1, ((x + r) / CELL) | 0), y0 = Math.max(0, ((y - r) / CELL) | 0), y1 = Math.min(S.hr - 1, ((y + r) / CELL) | 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const c = S.hash[cy * S.hc + cx]; for (let k = 0; k < c.length; k++) fn(c[k]); }
  }

  /* ---------- pathfinding: A* on the tile grid (8 directions, no corner cutting), requests spread over ticks ---------- */
  const AS = {
    n: 0, g: null, par: null, stamp: null, closed: null, gen: 0, heap: null, hf: null, hn: 0,
    init(n) { if (this.n === n) return; this.n = n; this.g = new Float32Array(n); this.par = new Int32Array(n); this.stamp = new Uint32Array(n); this.closed = new Uint32Array(n); const hn = Math.max(n * 8, 40000); this.heap = new Int32Array(hn); this.hf = new Float32Array(hn); },
    push(i, f) { let k = this.hn++; const H = this.heap, F = this.hf; while (k > 0) { const p = (k - 1) >> 1; if (F[p] <= f) break; H[k] = H[p]; F[k] = F[p]; k = p; } H[k] = i; F[k] = f; },
    pop() { const H = this.heap, F = this.hf, top = H[0], n = --this.hn; if (n > 0) { const li = H[n], lf = F[n]; let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && F[c + 1] < F[c]) c++; if (F[c] >= lf) break; H[k] = H[c]; F[k] = F[c]; k = c; } H[k] = li; F[k] = lf; } return top; },
  };
  const DIR8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  function nearestPass(S, i, R = 8) {
    if (passT(S, i)) return i;
    const x = i % S.W, y = (i / S.W) | 0;
    for (let r = 1; r <= R; r++) { let best = -1, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const tx = x + dx, ty = y + dy; if (tx < 0 || ty < 0 || tx >= S.W || ty >= S.H) continue; const k = ty * S.W + tx; if (passT(S, k)) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } } } if (best >= 0) return best; }
    return -1;
  }
  function findPath(S, s, g, avoid) {
    const W = S.W, H = S.H; g = nearestPass(S, g); if (g < 0) return null;
    if (s === g) return [g];
    const A = AS; A.gen++; A.hn = 0; const gen = A.gen, gx = g % W, gy = (g / W) | 0;
    const h = i => { const dx = Math.abs(i % W - gx), dy = Math.abs(((i / W) | 0) - gy); return Math.max(dx, dy) + .4142 * Math.min(dx, dy); };
    A.g[s] = 0; A.par[s] = -1; A.stamp[s] = gen; A.push(s, h(s));
    let best = s, bh = h(s), n = 0;
    while (A.hn > 0) {
      const i = A.pop(); if (A.closed[i] === gen) continue; A.closed[i] = gen;
      if (i === g) { best = g; break; }
      const hi = h(i); if (hi < bh) { bh = hi; best = i; }
      if (++n > 4200) break;
      const x = i % W, y = (i / W) | 0, gi = A.g[i];
      for (let d = 0; d < 8; d++) {
        const D = DIR8[d], nx = x + D[0], ny = y + D[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (!passT(S, j) || A.closed[j] === gen) continue;
        if (d >= 4 && (!passT(S, y * W + nx) || !passT(S, ny * W + x))) continue;
        let c = gi + D[2]; if (avoid && avoid[j] === S.gen) c += 2.5;
        if (A.stamp[j] !== gen || c < A.g[j]) { A.stamp[j] = gen; A.g[j] = c; A.par[j] = i; A.push(j, c + h(j)); }
      }
    }
    const out = []; let i = best; while (i !== s && i >= 0) { out.push(i); i = A.par[i]; if (out.length > S.N) break; }
    out.reverse(); return out.length ? smooth(S, s, out) : null;
  }
  function los(S, a, b) {                                     // straight walkable line between two tile centres (a little wide)
    const W = S.W, ax = a % W + .5, ay = ((a / W) | 0) + .5, bx = b % W + .5, by = ((b / W) | 0) + .5, d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / .25);
    const nx = -(by - ay) / (d || 1) * .38, ny = (bx - ax) / (d || 1) * .38;
    for (let k = 1; k < n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; if (!passT(S, tileOf(S, x, y)) || !passT(S, tileOf(S, x + nx, y + ny)) || !passT(S, tileOf(S, x - nx, y - ny))) return false; }
    return true;
  }
  function smooth(S, s, p) {
    const out = []; let from = s, k = 0;
    while (k < p.length) { let far = k; for (let j = Math.min(p.length - 1, k + 10); j > k; j--) if (los(S, from, p[j])) { far = j; break; } out.push(p[far]); from = p[far]; k = far + 1; }
    return out;
  }
  function requestPath(S, u, goal) {
    u.goal = goal; u.path = null; u.pi = 0; u.wait = 1; u.sn = 0; u.ld = 1e9;
    if (!u.inq) { u.inq = 1; S.pq.push(u.id); }
  }
  function runPaths(S) {
    let budget = 7;
    while (budget > 0 && S.pq.length) {
      const id = S.pq.shift(), u = S.E[id]; if (!u || u.dead) continue; u.inq = 0; if (!u.wait) continue;
      let avoid = null;
      if (u.stk > 0) {                                        // stuck before: steer around units that stand still
        S.gen++; avoid = S.mark; forNear(S, u.x, u.y, 6, v => { if (v !== u && !v.path) avoid[tileOf(S, v.x, v.y)] = S.gen; });
      }
      const p = findPath(S, tileOf(S, u.x, u.y), u.goal, avoid);
      u.wait = 0; u.path = p; u.pi = 0; u.ld = 1e9; budget--;
      if (!p) arrive(S, u);
    }
  }
  function stopMove(u) { u.path = null; u.wait = 0; u.pi = 0; }
  function arrive(S, u) {
    u.path = null; u.wait = 0; u.stk = 0;
    if (u.st === 'move' || u.st === 'amove') { u.st = 'idle'; u.gx = u.x; u.gy = u.y; u.am = 0; }
    if (u.ch) { u.ch = 0; }
  }

  /* ---------- commands (the player's taps and the computer use the same ones) ---------- */
  function spreadGoals(S, x, y, n) {
    const W = S.W; let s = nearestPass(S, tileOf(S, x, y)); if (s < 0) return [];
    S.gen++; const mk = S.mark, out = [], q = [s]; mk[s] = S.gen;
    for (let h = 0; h < q.length && out.length < n; h++) {
      const i = q[h]; out.push(i);
      const ix = i % W, iy = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const nx = ix + dx, ny = iy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= S.H) continue; const j = ny * W + nx; if (mk[j] === S.gen || !passT(S, j)) continue; mk[j] = S.gen; q.push(j); }
    }
    return out;
  }
  const enemyOf = (S, o, e) => e && !e.dead && e.o !== o;
  function cmd(S, o, c) {
    const P = S.P[o]; if (!P || P.out || S.res) return false;
    const own = () => (c.ids || []).map(id => S.E[id]).filter(u => u && !u.dead && u.k === 'u' && u.o === o);
    switch (c.c) {
      case 'move': case 'amove': {
        const us = own(); if (!us.length) return false;
        const ti = tileOf(S, c.x, c.y);
        const harv = us.filter(u => UT[u.t].harv), rest = us.filter(u => !UT[u.t].harv);
        for (const u of harv) { if (S.cry[ti] > 0 && c.c === 'move') { u.st = 'harv'; u.hs = 'seek'; u.hx = ti; stopMove(u); } else { u.st = 'move'; u.hs = 'seek'; if (u.rf) relDock(S, u); requestPath(S, u, ti); } }
        rest.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
        const goals = spreadGoals(S, c.x, c.y, rest.length);
        rest.forEach((u, k) => { const g = goals[Math.min(k, goals.length - 1)]; if (g == null) return; u.st = c.c; u.am = c.c === 'amove' ? 1 : 0; u.tg = 0; u.ch = 0; u.stk = 0; if (u.rp) relRep(S, u); u.gx = g % S.W + .5; u.gy = ((g / S.W) | 0) + .5; requestPath(S, u, g); });
        return true;
      }
      case 'attack': {
        const t = c.tg === -1 ? (S.kr && S.kr.st !== 'gone' ? S.kr : null) : S.E[c.tg]; if (!t || (t !== S.kr && !enemyOf(S, o, t))) return false;
        for (const u of own()) { if (!UT[u.t].wt) continue; if (u.rp) relRep(S, u); u.st = 'atk'; u.tg = c.tg; u.am = 0; u.ch = 0; u.stk = 0; stopMove(u); u.rt = -99; }
        return true;
      }
      case 'stop': for (const u of own()) { stopMove(u); if (u.rp) relRep(S, u); if (UT[u.t].harv) { u.st = 'idle'; if (u.rf) relDock(S, u); } else { u.st = 'idle'; u.tg = 0; u.am = 0; } u.gx = u.x; u.gy = u.y; } return true;
      case 'harvest': for (const u of own()) if (UT[u.t].harv) { if (u.rf) relDock(S, u); u.st = 'harv'; u.hs = c.x != null ? 'seek' : u.car >= UT.oog.harv * .5 ? 'ret' : 'seek'; if (c.x != null) u.hx = tileOf(S, c.x, c.y); stopMove(u); } return true;
      case 'unload': for (const u of own()) if (UT[u.t].harv) { u.st = 'harv'; u.hs = 'ret'; u.prf = c.b || 0; stopMove(u); } return true;
      case 'repair': {
        const pad = c.b ? S.E[c.b] : null;
        for (const u of own()) { if (UT[u.t].cat !== 'veh') continue; const r = pad && pad.o === o && pad.t === 'rep' ? pad : nearestB(S, o, 'rep', u.x, u.y); if (!r) return false; if (u.rf) relDock(S, u); u.st = 'rep'; u.rp = r.id; u.tg = 0; requestPath(S, u, tileOf(S, dockOf(r).x, dockOf(r).y)); }
        return true;
      }
      case 'build': {
        const t = c.t; if (!techOk(S, o, t)) return false;
        const cat = catOf(t), q = P.q[cat]; if (q.length >= 5) return false;
        if (cat !== 'b') { let n = unitCount(S, o); for (const k of ['i', 'v']) n += P.q[k].length; if (n >= UNIT_CAP) return false; }
        q.push({ t, p: 0, paid: 0, hold: 0 }); return true;
      }
      case 'cancel': {
        const q = P.q[c.cat]; if (!q) return false;
        if (c.cat === 'b' && c.ready && P.ready) { P.cry += (BT[P.ready].cost); P.ready = null; return true; }
        const k = c.i ?? q.length - 1; const it = q[k]; if (!it) return false; P.cry += it.paid; q.splice(k, 1); return true;
      }
      case 'place': {
        if (!P.ready) return false; const t = P.ready;
        if (!placeTiles(S, o, t, c.x, c.y).ok) return false;
        placeBuilding(S, o, t, c.x, c.y, false); P.ready = null; S.ev.push({ t: 'placed', o, b: t, x: c.x + BT[t].w / 2, y: c.y + BT[t].h / 2 }); recalc(S); return true;
      }
      case 'brep': { const b = S.E[c.b]; if (!b || b.o !== o || b.k !== 'b') return false; b.rep = b.hp < b.mhp ? (b.rep ? 0 : 1) : 0; return true; }
      case 'sell': {
        const b = S.E[c.b]; if (!b || b.o !== o || b.k !== 'b' || b.dead) return false;
        P.cry += Math.round(BT[b.t].cost * .5 * b.hp / b.mhp); removeB(S, b); S.ev.push({ t: 'sold', o, x: b.x + b.w / 2, y: b.y + b.h / 2, b: b.t, w: b.w, h: b.h }); return true;
      }
      case 'rally': { const b = S.E[c.b]; if (!b || b.o !== o || b.k !== 'b') return false; b.rally = c.x == null ? null : { x: c.x, y: c.y }; return true; }
    }
    return false;
  }
  function nearestB(S, o, t, x, y) { let best = null, bd = 1e9; for (const b of S.B) if (!b.dead && b.o === o && b.t === t) { const d = Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y); if (d < bd) { bd = d; best = b; } } return best; }
  function relDock(S, u) { const r = S.E[u.rf]; if (r && r.dk === u.id) r.dk = 0; u.rf = 0; }
  function relRep(S, u) { const r = S.E[u.rp]; if (r && r.cl === u.id) r.cl = 0; u.rp = 0; }
  function removeB(S, b) {
    b.dead = 1; b.hp = 0; for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) { const k = j * S.W + i; if (S.occ[k] === b.id) S.occ[k] = 0; }
    S.rc = 1; S.bv = (S.bv || 0) + 1;
  }

  /* ---------- production ---------- */
  function production(S) {
    for (const P of S.P) {
      if (P.out) continue;
      const mult = (P.low ? .5 : 1) * (P.ai != null ? DIFFS[P.ai].build : 1);
      for (const cat of ['b', 'i', 'v']) {
        const q = P.q[cat]; if (!q.length) continue; const it = q[0];
        if (cat === 'b' && P.ready) { it.hold = 4; continue; }
        const np = P.bc[prodOf[cat]] || 0; if (!np) { it.hold = 1; continue; }
        if (cat !== 'b' && unitCount(S, P.i) >= UNIT_CAP) { it.hold = 3; continue; }
        const T = UT[it.t] || BT[it.t], spd = mult * (1 + .4 * Math.min(2, np - 1));
        let dp = Math.min(spd / (T.bt * TPS), 1 - it.p);
        const need = T.cost * dp;
        if (P.cry < need) { if (P.cry > .01) { const f = P.cry / T.cost; dp = f; it.p += f; it.paid += P.cry; P.cry = 0; } it.hold = 2; continue; }
        P.cry -= need; it.paid += need; it.p += dp; it.hold = 0;
        if (it.p >= 1 - 1e-9) {
          if (cat === 'b') { P.ready = it.t; q.shift(); S.ev.push({ t: 'bready', o: P.i, b: it.t }); }
          else { const u = spawn(S, P.i, it.t); if (u) { q.shift(); S.ev.push({ t: 'uready', o: P.i, u: it.t, x: u.x, y: u.y }); } else { it.p = 1; it.hold = 5; } }
        }
      }
    }
  }
  function spawn(S, o, t) {
    const cat = UT[t].cat === 'inf' ? 'kaz' : 'fab'; let src = null;
    for (const b of S.B) if (!b.dead && b.o === o && b.t === cat) { src = b; if (b.prim) break; }
    if (!src) return null;
    const d = dockOf(src), p = freeNear(S, d.x, d.y, 6); if (!p) return null;
    const u = addUnit(S, o, t, p.x, p.y, Math.PI / 2);
    if (src.rally && !UT[t].harv) { const g = nearestPass(S, tileOf(S, src.rally.x, src.rally.y)); if (g >= 0) { u.st = 'move'; u.gx = g % S.W + .5; u.gy = ((g / S.W) | 0) + .5; requestPath(S, u, g); } }
    return u;
  }

  /* ---------- units ---------- */
  function unitTick(S, u) {
    const T = UT[u.t];
    if (u.cd > 0) u.cd--; if (u.fl > 0) u.fl--;
    if (T.regen && u.hp < T.hp && S.t - u.hit > 45) u.hp = Math.min(T.hp, u.hp + .45);
    if (T.harv) harvTick(S, u, T);
    else if (u.st === 'rep') repTick(S, u, T);
    else combat(S, u, T);
    moveTick(S, u, T);
  }
  function acquire(S, u, r, wt, x = u.x, y = u.y) {
    let best = null, bs = r * r * 4; const o = u.o, r2 = r * r, HS = S.hash, hc = S.hc, M = MULT[wt];
    const x0 = Math.max(0, ((x - r) / CELL) | 0), x1 = Math.min(hc - 1, ((x + r) / CELL) | 0), y0 = Math.max(0, ((y - r) / CELL) | 0), y1 = Math.min(S.hr - 1, ((y + r) / CELL) | 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = HS[cy * hc + cx];
      for (let k = 0; k < c.length; k++) {
        const v = c[k]; if (v.o === o || v.dead) continue; const dx = v.x - x, dy = v.y - y, d2 = dx * dx + dy * dy; if (d2 > r2) continue;
        const T = UT[v.t], sc = d2 * (M[T.arm] < .4 ? 2.2 : 1) * (T.wt ? 1 : 1.6);
        if (sc < bs) { bs = sc; best = v; }
      }
    }
    if (best) return best;
    for (const b of S.B) {
      if (b.o === o || b.dead) continue; const d = distTo({ x, y }, b); if (d > r) continue;
      const sc = d * d * (BT[b.t].wt ? 1 : 1.5) + 1; if (sc < bs) { bs = sc; best = b; }
    }
    return best;
  }
  function getTarget(S, u) {
    if (!u.tg) return null;
    if (u.tg === -1) return S.kr && S.kr.st !== 'gone' ? S.kr : null;
    const t = S.E[u.tg]; return t && !t.dead ? t : null;
  }
  function combat(S, u, T) {
    if (!T.wt) { if (u.st === 'atk') u.st = 'idle'; return; }
    let tg = getTarget(S, u);
    if (!tg && u.tg) { u.tg = 0; if (u.st === 'atk') { u.st = 'idle'; u.gx = u.x; u.gy = u.y; stopMove(u); } }
    const auto = u.st === 'idle' || u.st === 'amove' || (u.st === 'move' && T.tur);
    if (auto && (S.t + u.id) % 5 === 0) {
      const r = u.st === 'move' ? T.rng : T.sight + (u.st === 'amove' ? 1.5 : 0);
      const n = acquire(S, u, r, T.wt);
      if (n) { tg = n; u.tg = n.id; } else if (u.st !== 'idle' || !u.ch) { if (tg && tg !== S.kr) { tg = null; u.tg = 0; } }
    }
    if (!tg) {
      if (u.st === 'idle' && u.ch) { u.ch = 0; requestPath(S, u, tileOf(S, u.gx, u.gy)); }
      else if (u.st === 'amove' && (u.ch || (!u.path && !u.wait))) { u.ch = 0; if (Math.hypot(u.x - u.gx, u.y - u.gy) < 1.2) arrive(S, u); else requestPath(S, u, tileOf(S, u.gx, u.gy)); }
      if (T.tur) u.tu = turnTo(u.tu, u.d, .12);
      return;
    }
    const c = center(tg), d = tg === S.kr ? Math.hypot(tg.x - u.x, tg.y - u.y) : distTo(u, tg);
    if (u.st === 'idle' && Math.hypot(u.x - u.gx, u.y - u.gy) > 8) { u.tg = 0; u.ch = 0; requestPath(S, u, tileOf(S, u.gx, u.gy)); return; }
    const inR = d <= T.rng + (isB(tg) ? .15 : 0) && (!T.minr || d >= T.minr);
    if (inR) {
      if (u.st !== 'move' && (u.path || u.wait)) { stopMove(u); u.ch = 0; }
      const a = Math.atan2(c.y - u.y, c.x - u.x);
      if (T.tur) u.tu = turnTo(u.tu, a, .3); else { u.d = turnTo(u.d, a, T.trn || 1); u.tu = u.d; }
      if (Math.abs(wrapA(u.tu - a)) < .25 && u.cd <= 0 && (u.st !== 'move' || T.tur)) fire(S, u, tg, T, c);
    } else if (u.st !== 'move') {
      if (T.tur) u.tu = turnTo(u.tu, Math.atan2(c.y - u.y, c.x - u.x), .2);
      if (T.minr && d < T.minr) {                            // artillery too close: back off a little
        if (!u.path && !u.wait) { const a = Math.atan2(u.y - c.y, u.x - c.x); requestPath(S, u, tileOf(S, u.x + Math.cos(a) * 3, u.y + Math.sin(a) * 3)); u.ch = u.st === 'idle' ? 1 : 0; }
        return;
      }
      const moved = Math.hypot(c.x - (u.lx ?? -99), c.y - (u.ly ?? -99));
      if ((!u.path && !u.wait) || (moved > 1.8 && S.t - (u.rt || 0) > 12)) { u.lx = c.x; u.ly = c.y; u.rt = S.t; requestPath(S, u, tileOf(S, c.x, c.y)); if (u.st === 'idle' || u.st === 'amove') u.ch = 1; }
    }
  }
  const proj = (x, y, tx, ty, tid, sp, wt, dmg, o, n, sr) => ({ x, y, px: x, py: y, sx: x, sy: y, tx, ty, tid, sp, wt, dmg, o, a: 0, n, sr, z: 0, pz: 0, ang: 0 });
  function muzzle(u, T, side = 0) { const r = (T.r || .3) * 1.15, a = u.tu; return { x: u.x + Math.cos(a) * r - Math.sin(a) * side, y: u.y + Math.sin(a) * r + Math.cos(a) * side }; }
  function fire(S, u, tg, T, c) {
    u.cd = T.cd; u.fl = 3;
    const id = tg === S.kr ? -1 : tg.id;
    if (T.wt === 'kogel') {
      const m = muzzle(u, T); hurt(S, tg, T.dmg, 'kogel', u.o, u);
      S.ev.push({ t: 'fire', wt: 'kogel', x: m.x, y: m.y, tx: c.x + (rnd(S) - .5) * .3, ty: c.y + (rnd(S) - .5) * .3, o: u.o, u: u.t, inf: T.cat === 'inf' });
    } else if (T.wt === 'kanon' || T.wt === 'raket') {
      const sides = T.twin ? [-.16, .16] : [0];
      for (const sd of sides) { const m = muzzle(u, T, sd); S.PJ.push(proj(m.x, m.y, c.x, c.y, id, (T.wt === 'raket' ? 9 : 13) * DT, T.wt, T.dmg, u.o, 0, 0)); }
      S.ev.push({ t: 'fire', wt: T.wt, x: u.x, y: u.y, a: u.tu, r: T.r, o: u.o, u: u.t, inf: T.cat === 'inf' });
    } else if (T.wt === 'granaat') {
      const d = Math.hypot(c.x - u.x, c.y - u.y), sx = c.x + (rnd(S) - .5) * .8, sy = c.y + (rnd(S) - .5) * .8, m = muzzle(u, T);
      S.PJ.push(proj(m.x, m.y, sx, sy, 0, 0, 'granaat', T.dmg, u.o, Math.round(10 + d * 1.6), T.splash));
      S.ev.push({ t: 'fire', wt: 'granaat', x: u.x, y: u.y, a: u.tu, r: T.r, o: u.o, u: u.t });
    } else if (T.wt === 'straal') {
      hurt(S, tg, T.dmg, 'straal', u.o, u); u.bm = 4; u.bx = c.x; u.by = c.y;
      if (S.t % 4 === 0) S.ev.push({ t: 'beam', x: u.x, y: u.y, tx: c.x, ty: c.y, o: u.o });
    } else if (T.wt === 'bliksem') {
      const pts = [{ x: u.x, y: u.y }, { x: c.x, y: c.y }], hitIds = new Set([id]); let last = tg, dmg = T.dmg;
      hurt(S, tg, dmg, 'bliksem', u.o, u);
      for (let k = 1; k < (T.chain || 1); k++) {
        dmg *= .6; const lc = center(last); let nx = null, nd = 2.8 * 2.8;
        forNear(S, lc.x, lc.y, 2.8, v => { if (v.o === u.o || v.dead || hitIds.has(v.id)) return; const d2 = (v.x - lc.x) ** 2 + (v.y - lc.y) ** 2; if (d2 < nd) { nd = d2; nx = v; } });
        if (!nx) break; hitIds.add(nx.id); pts.push({ x: nx.x, y: nx.y }); hurt(S, nx, dmg, 'bliksem', u.o, u); last = nx;
      }
      S.ev.push({ t: 'zap', pts, o: u.o });
    }
  }
  function hurt(S, e, dmg, wt, o, src) {
    if (e === S.kr) { if (e.st === 'gone') return; e.hurt += dmg; if (e.hurt > 260) { krDive(S, 'flee'); S.ev.push({ t: 'krflee', o, x: e.x, y: e.y }); } return; }
    if (e.dead) return;
    const arm = e.k === 'b' ? 'geb' : UT[e.t].arm;
    let d = dmg * MULT[wt][arm]; if (e.k === 'b' && e.sl) d *= .75;
    e.hp -= d; e.hit = S.t;
    if (src) { e.ax = src.x; e.ay = src.y; }
    const P = S.P[e.o];
    if (o !== e.o && S.t - (P.attEv || -9999) > TPS * 12 && (e.k === 'b' || UT[e.t].harv || P.i !== S.human)) { P.attEv = S.t; S.ev.push({ t: 'attacked', o: e.o, x: center(e).x, y: center(e).y, b: e.k === 'b', harv: e.k === 'u' && !!UT[e.t].harv }); }
    if (e.hp <= 0) kill(S, e, o);
  }
  function kill(S, e, by) {
    if (e.dead) return;
    if (e.k === 'u') {
      e.dead = 1; e.hp = 0; if (e.rf) relDock(S, e); if (e.rp) relRep(S, e);
      S.P[e.o].st.lost++; if (by != null && by >= 0 && by !== e.o) S.P[by].st.kills++;
      S.ev.push({ t: 'die', x: e.x, y: e.y, u: e.t, o: e.o, d: e.d, inf: UT[e.t].cat === 'inf', by });
    } else {
      removeB(S, e); S.P[e.o].st.blost++; if (by != null && by >= 0 && by !== e.o) S.P[by].st.kills++;
      S.ev.push({ t: 'bdie', x: e.x + e.w / 2, y: e.y + e.h / 2, w: e.w, h: e.h, b: e.t, o: e.o, by });
      if (e.dk) { const h = S.E[e.dk]; if (h) h.rf = 0; }
    }
  }
  function moveTick(S, u, T) {
    u.mv = 0;
    if (u.bm > 0) u.bm--;
    if (!u.path || u.wait) { u.v *= .5; return; }
    if (u.pi >= u.path.length) { arrive(S, u); return; }
    const w = u.path[u.pi]; if (!passT(S, w)) { requestPath(S, u, u.goal); return; }
    const wx = w % S.W + .5, wy = ((w / S.W) | 0) + .5, dx = wx - u.x, dy = wy - u.y, dist = Math.hypot(dx, dy), last = u.pi === u.path.length - 1;
    if (dist < (last ? .14 : .42)) { u.pi++; u.ld = 1e9; u.sn = 0; if (u.pi >= u.path.length) arrive(S, u); return; }
    const a = Math.atan2(dy, dx), inf = T.cat === 'inf';
    let f = 1;
    if (inf) { u.d = turnTo(u.d, a, .6); if (!T.tur) u.tu = u.d; }
    else { const df = Math.abs(wrapA(a - u.d)); u.d = turnTo(u.d, a, T.trn || .3); f = Math.max(0, 1 - df / 1.05); if (!T.tur) u.tu = u.d; }
    const vt = T.spd * DT * f * (S.ter[tileOf(S, u.x, u.y)] === T_ROCK ? 1.08 : 1);
    u.v += (vt - u.v) * (inf ? .6 : .35);
    const st = Math.min(u.v, dist);
    const mx = inf ? dx / dist : Math.cos(u.d), my = inf ? dy / dist : Math.sin(u.d);
    tryMove(S, u, u.x + mx * st, u.y + my * st);
    u.mv = st > .004 ? 1 : 0;
    if (u.ld > 1e8) { u.ld = dist; u.sn = 0; }
    else if (++u.sn >= 20) {                                   // progress check every 20 ticks
      const slow = u.ld - dist < T.spd * DT * 20 * .3; u.sn = 0; u.ld = dist;
      if (!slow) { if (u.stk > 0) u.stk--; }
      else {
        u.stk++; if (u.stk >= 2) u.gh = S.t + 45;                // stuck: may pass through friends for a moment
        const gx = u.goal % S.W + .5, gy = ((u.goal / S.W) | 0) + .5, dg = Math.hypot(gx - u.x, gy - u.y);
        if ((u.stk > 2 && dg < 2.2) || u.stk > 12) { arrive(S, u); if (u.st === 'atk' || u.ch) u.rt = S.t; }
        else if (u.stk % 2) requestPath(S, u, u.goal);
      }
    }
  }
  function tryMove(S, u, nx, ny) {
    const r = UT[u.t].r;
    if (!freeAt(S, u.x, u.y, r * .5)) { if (passT(S, tileOf(S, nx, ny)) || !passT(S, tileOf(S, u.x, u.y))) { u.x = nx; u.y = ny; } return; }
    if (freeAt(S, nx, ny, r)) { u.x = nx; u.y = ny; }
    else if (freeAt(S, nx, u.y, r)) u.x = nx;
    else if (freeAt(S, u.x, ny, r)) u.y = ny;
    else { const cx = Math.floor(u.x) + .5, cy = Math.floor(u.y) + .5; u.x += (cx - u.x) * .2; u.y += (cy - u.y) * .2; }   // blocked: slide to the middle of the tile
  }
  function separate(S) {
    const U = S.U, hc = S.hc, hr = S.hr, HS = S.hash, t = S.t;
    for (let i = 0; i < U.length; i++) { U[i].sx = 0; U[i].sy = 0; }
    for (let cy = 0; cy < hr; cy++) for (let cx = 0; cx < hc; cx++) {
      const c = HS[cy * hc + cx]; if (!c.length) continue;
      const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < hr - 1 ? cy + 1 : cy, x0 = cx > 0 ? cx - 1 : 0, x1 = cx < hc - 1 ? cx + 1 : cx;
      for (let a = 0; a < c.length; a++) {
        const u = c[a]; if (u.dead) continue; const ru = u.r, ug = u.gh > t;
        for (let ny = y0; ny <= y1; ny++) for (let nx = x0; nx <= x1; nx++) {
          const c2 = HS[ny * hc + nx];
          for (let b = 0; b < c2.length; b++) {
            const v = c2[b]; if (v.id <= u.id) continue;
            const dx = v.x - u.x; if (dx > 1.2 || dx < -1.2) continue; const dy = v.y - u.y; if (dy > 1.2 || dy < -1.2 || v.dead) continue;
            const md = (ru + v.r) * .92;
            const d2 = dx * dx + dy * dy; if (d2 >= md * md) continue;
            if (u.o === v.o && (ug || v.gh > t)) continue;
            let d = Math.sqrt(d2), nx2, ny2;
            if (d < 1e-4) { const an = ((u.id * 7 + v.id * 13) % 628) / 100; nx2 = Math.cos(an); ny2 = Math.sin(an); d = 0; } else { nx2 = dx / d; ny2 = dy / d; }
            const ov = (md - d) * .5, wu = u.path ? .35 : 1, wv = v.path ? .35 : 1, s = 2 / (wu + wv);
            u.sx -= nx2 * ov * wu * s; u.sy -= ny2 * ov * wu * s; v.sx += nx2 * ov * wv * s; v.sy += ny2 * ov * wv * s;
            if (u.path && v.path && Math.cos(u.d) * Math.cos(v.d) + Math.sin(u.d) * Math.sin(v.d) < .5) {   // meeting head-on: both keep right
              const k = Math.max(ov, .04) * .9; u.sx -= Math.sin(u.d) * k; u.sy += Math.cos(u.d) * k; v.sx -= Math.sin(v.d) * k; v.sy += Math.cos(v.d) * k;
            }
          }
        }
      }
    }
    for (let i = 0; i < U.length; i++) {
      const u = U[i]; if (u.dead || (!u.sx && !u.sy) || u.hs === 'unload' || u.cl) continue;
      const m = Math.hypot(u.sx, u.sy), k = m > .09 ? .09 / m : 1;
      tryMove(S, u, u.x + u.sx * k, u.y + u.sy * k);
    }
  }

  /* ---------- harvesters ---------- */
  function findCrystal(S, from, R, u) {
    const W = S.W; S.gen++; const mk = S.mark; let q = [from], h = 0; mk[from] = S.gen;
    const claimed = new Set(); for (const v of S.U) if (v !== u && !v.dead && v.ht >= 0 && UT[v.t].harv && v.hs !== 'ret' && v.hs !== 'toraf' && v.hs !== 'unload') claimed.add(v.ht);
    const fx = from % W, fy = (from / W) | 0;
    while (h < q.length) {
      const i = q[h++]; if (S.cry[i] > 8 && !claimed.has(i)) return i;
      const x = i % W, y = (i / W) | 0; if (Math.max(Math.abs(x - fx), Math.abs(y - fy)) >= R) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= S.H) continue; const j = ny * W + nx; if (mk[j] === S.gen) continue; mk[j] = S.gen; if (S.ter[j] <= T_ROCK && !S.occ[j]) q.push(j); }
    }
    return -1;
  }
  function harvTick(S, u, T) {
    if (u.st !== 'harv') return;
    const P = S.P[u.o];
    switch (u.hs) {
      case 'seek': {
        if (u.path || u.wait) return;
        if ((S.t + u.id) % 6) return;
        const from = u.hx >= 0 ? u.hx : tileOf(S, u.x, u.y);
        let i = findCrystal(S, from, 18, u); if (i < 0 && u.hx >= 0) i = findCrystal(S, tileOf(S, u.x, u.y), 40, u);
        if (i < 0) { if (u.car > 0) u.hs = 'ret'; else u.hs = 'none'; return; }
        u.ht = i; u.hs = 'go'; requestPath(S, u, i); return;
      }
      case 'none': if ((S.t + u.id) % 60 === 0) u.hs = 'seek'; return;
      case 'go': {
        if (u.path || u.wait) return;
        const ti = tileOf(S, u.x, u.y);
        if (ti === u.ht || (Math.abs(u.x - (u.ht % S.W + .5)) < .8 && Math.abs(u.y - (((u.ht / S.W) | 0) + .5)) < .8)) { u.hs = 'mine'; u.mt = 0; }
        else { u.hs = 'seek'; u.hx = -1; }
        return;
      }
      case 'mine': {
        if (S.t % 2) return;
        let i = tileOf(S, u.x, u.y); if (S.cry[i] <= 0 && S.cry[u.ht] > 0 && Math.hypot(u.x - (u.ht % S.W + .5), u.y - (((u.ht / S.W) | 0) + .5)) < 1.1) i = u.ht;
        if (S.cry[i] <= 0) { const j = findCrystal(S, i, 4, u); if (j >= 0 && u.car < T.harv) { u.ht = j; u.hs = 'go'; requestPath(S, u, j); } else u.hs = u.car > 0 ? 'ret' : 'seek'; return; }
        const take = Math.min(S.cry[i], 5); S.cry[i] -= take; S.cd.push(i); u.mining = 4;
        u.car = Math.min(T.harv, u.car + take * (P.ai != null ? DIFFS[P.ai].eco : 1)); u.hx = i;
        u.d = turnTo(u.d, u.d + .05, .05);
        if (u.car >= T.harv) u.hs = 'ret';
        return;
      }
      case 'ret': {
        let r = u.prf ? S.E[u.prf] : null; u.prf = 0; if (!r || r.dead || r.o !== u.o || r.t !== 'raff') r = nearestB(S, u.o, 'raff', u.x, u.y);
        if (!r) { u.hs = 'noraf'; return; }
        u.rf = r.id; const d = dockOf(r); u.hs = 'toraf'; requestPath(S, u, tileOf(S, d.x, d.y)); return;
      }
      case 'noraf': if ((S.t + u.id) % 45 === 0) u.hs = 'ret'; return;
      case 'toraf': case 'qwait': {
        const r = S.E[u.rf]; if (!r || r.dead) { u.rf = 0; u.hs = 'ret'; return; }
        if (u.path || u.wait) return;
        if (u.hs === 'qwait' && --u.qw > 0) return;
        const d = dockOf(r), dd = Math.hypot(u.x - d.x, u.y - d.y);
        const occ = r.dk && r.dk !== u.id && S.E[r.dk] && !S.E[r.dk].dead;
        if (dd < 2.3 && !occ) { r.dk = u.id; u.hs = 'unload'; S.ev.push({ t: 'unload', o: u.o, x: d.x, y: d.y }); return; }
        if (occ) { u.hs = 'qwait'; u.qw = 12; if (dd > 3.5) requestPath(S, u, tileOf(S, d.x, d.y + 2)); return; }
        u.hs = 'qwait'; u.qw = 3; requestPath(S, u, tileOf(S, d.x, d.y)); return;
      }
      case 'unload': {
        const r = S.E[u.rf]; if (!r || r.dead) { u.rf = 0; u.hs = 'ret'; return; }
        const d = dockOf(r); u.x += (d.x - u.x) * .25; u.y += (d.y - u.y) * .25; u.d = turnTo(u.d, -Math.PI / 2, .15);
        const space = P.cap - P.cry;
        if (space < 1) { if (S.t - (P.fullEv || -9999) > TPS * 15) { P.fullEv = S.t; S.ev.push({ t: 'full', o: u.o }); } return; }
        const amt = Math.min(u.car, 35, space); P.cry += amt; u.car -= amt; P.st.harv += amt;
        if (u.car <= .01) { u.car = 0; r.dk = 0; u.rf = 0; u.hs = 'seek'; const p = freeNear(S, d.x, d.y + 1.5, 3); if (p && u.hx < 0) requestPath(S, u, tileOf(S, p.x, p.y)); }
        return;
      }
    }
  }
  function repTick(S, u, T) {
    const r = S.E[u.rp]; if (!r || r.dead) { u.rp = 0; u.st = 'idle'; stopMove(u); return; }
    if (u.path || u.wait) return;
    const d = dockOf(r), dd = Math.hypot(u.x - d.x, u.y - d.y);
    if (dd > 1.3) { if ((S.t + u.id) % 20 === 0) requestPath(S, u, tileOf(S, d.x, d.y)); return; }
    if (r.cl && r.cl !== u.id && S.E[r.cl] && !S.E[r.cl].dead) return;
    r.cl = u.id; u.x += (d.x - u.x) * .25; u.y += (d.y - u.y) * .25;
    const P = S.P[u.o], amt = Math.min(T.hp - u.hp, T.hp * .012), cost = T.cost * .25 * amt / T.hp;
    if (amt <= 0) { r.cl = 0; u.rp = 0; u.st = 'idle'; const p = freeNear(S, d.x, d.y + 2, 4); if (p) { u.st = 'move'; requestPath(S, u, tileOf(S, p.x, p.y)); } return; }
    if (P.cry < cost || P.low && S.t % 2) return;
    P.cry -= cost; u.hp += amt; u.rpg = 3;
  }

  /* ---------- buildings ---------- */
  function buildingTick(S, b) {
    const T = BT[b.t], P = S.P[b.o];
    if (b.bp < 1) b.bp = Math.min(1, b.bp + 1 / (1.8 * TPS));
    if (b.cd > 0) b.cd--; if (b.fl > 0) b.fl--;
    if (b.rep) {
      const amt = Math.min(b.mhp - b.hp, b.mhp * .006), cost = T.cost * .3 * amt / b.mhp;
      if (amt <= 0) b.rep = 0; else if (P.cry >= cost) { P.cry -= cost; b.hp += amt; }
    }
    if (T.wt && b.bp >= 1) {
      let tg = b.tg ? S.E[b.tg] : null; if (tg && (tg.dead || distTo(center(b), tg) > T.rng + .3)) { tg = null; b.tg = 0; }
      if (!tg && (S.t + b.id) % 5 === 0) { const c = center(b), n = acquire(S, { x: c.x, y: c.y, o: b.o }, T.rng, T.wt); if (n && n.k === 'u') { tg = n; b.tg = n.id; } }
      if (!tg || P.low) return;
      const c = center(b), tc = center(tg), a = Math.atan2(tc.y - c.y, tc.x - c.x);
      b.tu = turnTo(b.tu, a, .22);
      if (Math.abs(wrapA(b.tu - a)) < .2 && b.cd <= 0) {
        b.cd = T.cd; b.fl = 3;
        for (const sd of T.twin ? [-.15, .15] : [0]) { const mx = c.x + Math.cos(b.tu) * .45 - Math.sin(b.tu) * sd, my = c.y + Math.sin(b.tu) * .45 + Math.cos(b.tu) * sd; S.PJ.push(proj(mx, my, tc.x, tc.y, tg.id, (T.wt === 'raket' ? 9 : 13) * DT, T.wt, T.dmg, b.o, 0, 0)); }
        S.ev.push({ t: 'fire', wt: T.wt, x: c.x, y: c.y, a: b.tu, r: .45, o: b.o, b: b.t });
      }
    }
  }

  /* ---------- projectiles ---------- */
  function projectiles(S) {
    let n = 0;
    for (const p of S.PJ) {
      p.px = p.x; p.py = p.y; p.a++;
      if (p.wt === 'granaat') {
        const f = p.a / p.n; p.pz = p.z; p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f; p.z = Math.sin(Math.PI * Math.min(1, f)) * (1 + p.n * .06);
        if (p.a >= p.n) { splash(S, p); continue; }
      } else {
        if (p.tid) { const t = p.tid === -1 ? (S.kr && S.kr.st !== 'gone' ? S.kr : null) : S.E[p.tid]; if (t && !t.dead) { const c = center(t); p.tx = c.x; p.ty = c.y; } else p.tid = 0; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (d <= p.sp || p.a > 120) {
          const t = p.tid === -1 ? S.kr : p.tid ? S.E[p.tid] : null;
          if (t && !t.dead) hurt(S, t, p.dmg, p.wt, p.o, { x: p.sx, y: p.sy });
          S.ev.push({ t: 'imp', x: p.tx, y: p.ty, wt: p.wt, hit: !!t }); continue;
        }
        p.x += dx / d * p.sp; p.y += dy / d * p.sp; p.ang = Math.atan2(dy, dx);
      }
      S.PJ[n++] = p;
    }
    S.PJ.length = n;
  }
  function splash(S, p) {
    const r = p.sr || 1.2;
    forNear(S, p.tx, p.ty, r + .5, v => { if (v.o === p.o || v.dead) return; const d = Math.hypot(v.x - p.tx, v.y - p.ty); if (d < r + UT[v.t].r * .5) hurt(S, v, p.dmg * (1 - .5 * Math.min(1, d / r)), 'granaat', p.o, { x: p.sx, y: p.sy }); });
    for (const b of S.B) { if (b.o === p.o || b.dead) continue; if (distTo({ x: p.tx, y: p.ty }, b) < r * .6) hurt(S, b, p.dmg * .8, 'granaat', p.o, { x: p.sx, y: p.sy }); }
    S.ev.push({ t: 'imp', x: p.tx, y: p.ty, wt: 'granaat', hit: true });
  }

  /* ---------- the sand creeper (zandkruiper): roams open sand, now and then swallows a unit; never goes onto rock ---------- */
  const krOk = (S, x, y) => { if (x < 1 || y < 1 || x >= S.W - 1 || y >= S.H - 1) return false; const t = S.ter[tileOf(S, x, y)]; return (t === T_SAND || t === T_DUNE) && !S.slab[tileOf(S, x, y)]; };
  function krDive(S, why) { const K = S.kr; K.st = 'gone'; K.t = Math.round(TPS * (why === 'eat' ? 70 + rnd(S) * 40 : 55 + rnd(S) * 30)); K.tg = 0; K.hurt = 0; }
  function krRise(S) {
    const K = S.kr;
    for (let tries = 0; tries < 60; tries++) {
      const x = 2 + rnd(S) * (S.W - 4), y = 2 + rnd(S) * (S.H - 4); if (!krOk(S, x, y)) continue;
      let ok = true; for (const b of S.B) if (!b.dead && Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y) < 9) { ok = false; break; }
      for (let r = 1; r <= 2 && ok; r++) for (let a = 0; a < 6; a++) if (!krOk(S, x + Math.cos(a) * r, y + Math.sin(a) * r)) ok = false;
      if (!ok) continue;
      K.x = K.px = x; K.y = K.py = y; K.st = 'roam'; K.t = Math.round(TPS * (18 + rnd(S) * 22)); K.life = Math.round(TPS * (70 + rnd(S) * 40)); K.wx = x; K.wy = y; K.d = rnd(S) * PI2; S.ev.push({ t: 'krrise', x, y }); return;
    }
    K.t = TPS * 10;
  }
  function krTick(S) {
    const K = S.kr; if (!K) return;
    K.px = K.x; K.py = K.y;
    if (K.st === 'gone') { if (--K.t <= 0) krRise(S); return; }
    let tx = K.wx, ty = K.wy, sp = .85 * DT;
    if (K.st === 'roam' && --K.life <= 0) { krDive(S, 'bored'); S.ev.push({ t: 'krdive', x: K.x, y: K.y }); return; }
    if (K.st === 'roam') {
      if (Math.hypot(K.wx - K.x, K.wy - K.y) < .8 || (S.t % 90 === 0)) { for (let k = 0; k < 12; k++) { const a = rnd(S) * PI2, r = 4 + rnd(S) * 9, x = K.x + Math.cos(a) * r, y = K.y + Math.sin(a) * r; if (krOk(S, x, y)) { K.wx = x; K.wy = y; break; } } }
      if (--K.t <= 0) {
        let best = null, bs = 1e9;
        for (const u of S.U) { if (u.dead) continue; const d = Math.hypot(u.x - K.x, u.y - K.y); if (d > 15 || !krOk(S, u.x, u.y)) continue; const sc = d * (UT[u.t].harv ? .55 : UT[u.t].cat === 'inf' ? 1.6 : 1); if (sc < bs) { bs = sc; best = u; } }
        if (best) { K.st = 'hunt'; K.tg = best.id; K.t = TPS * 32; S.ev.push({ t: 'krhunt', o: best.o, x: best.x, y: best.y, u: best.t }); }
        else K.t = TPS * 8;
      }
    } else if (K.st === 'hunt') {
      const u = S.E[K.tg];
      if (!u || u.dead || !krOk(S, u.x, u.y) || --K.t <= 0) { K.st = 'roam'; K.t = TPS * (12 + rnd(S) * 10); K.tg = 0; }
      else {
        tx = u.x; ty = u.y; sp = 1.42 * DT;
        if (Math.hypot(u.x - K.x, u.y - K.y) < .55) {
          S.ev.push({ t: 'swallow', x: u.x, y: u.y, o: u.o, u: u.t }); K.eat++;
          u.hp = 0; kill(S, u, -1); krDive(S, 'eat'); return;
        }
      }
    }
    const want = Math.atan2(ty - K.y, tx - K.x); K.d = turnTo(K.d, want, .12);
    for (const off of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4, -2.4]) {
      const a = K.d + off, nx = K.x + Math.cos(a) * sp, ny = K.y + Math.sin(a) * sp;
      if (krOk(S, nx, ny) && krOk(S, nx + Math.cos(a) * .9, ny + Math.sin(a) * .9)) { K.x = nx; K.y = ny; if (off) K.d = turnTo(K.d, a, .25); return; }
    }
    if (K.st === 'roam') { K.wx = K.x - Math.cos(K.d) * 4; K.wy = K.y - Math.sin(K.d) * 4; }
  }

  /* ---------- crystal regrowth, fog, the end of the match ---------- */
  function regrow(S) {
    const n = Math.max(3, Math.round(S.ft.length / 45));
    for (let k = 0; k < n; k++) {
      const i = S.ft[Math.floor(rnd(S) * S.ft.length)]; if (i == null || S.cry[i] >= S.cmax[i]) continue;
      const W = S.W, nb = S.cry[i] > 0 || S.cry[i - 1] > 0 || S.cry[i + 1] > 0 || S.cry[i - W] > 0 || S.cry[i + W] > 0;
      if (nb || rnd(S) < .08) { S.cry[i] = Math.min(S.cmax[i], S.cry[i] + 9); S.cd.push(i); }
    }
  }
  const CIRC = []; for (let r = 0; r <= 12; r++) { const L = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) L.push([dx, dy]); CIRC.push(L); }
  function updateFog(S) {
    const h = S.human; if (h < 0 || !S.P[h]) return;
    const vis = S.vis, exp = S.exp, W = S.W, H = S.H; vis.fill(0);
    const stamp = (x, y, r) => { const cx = Math.floor(x), cy = Math.floor(y), L = CIRC[Math.min(12, Math.round(r))]; for (let k = 0; k < L.length; k++) { const tx = cx + L[k][0], ty = cy + L[k][1]; if (tx >= 0 && ty >= 0 && tx < W && ty < H) vis[ty * W + tx] = 1; } };
    for (const u of S.U) if (u.o === h && !u.dead) stamp(u.x, u.y, UT[u.t].sight);
    for (const b of S.B) if (b.o === h && !b.dead) stamp(b.x + b.w / 2, b.y + b.h / 2, BT[b.t].sight || 3 + Math.max(b.w, b.h) / 2);
    let ch = 0; for (let i = 0; i < S.N; i++) if (vis[i] && !exp[i]) { exp[i] = 1; ch = 1; }
    S.fogV++;
  }
  const realB = (S, o) => S.B.some(b => !b.dead && b.o === o);
  function checkEnd(S) {
    for (const P of S.P) {
      if (P.out) continue;
      const alive = P.nb ? S.U.some(u => !u.dead && u.o === P.i) : realB(S, P.i);
      if (!alive) { P.out = true; S.ev.push({ t: 'out', o: P.i }); for (const u of S.U) if (u.o === P.i && !u.dead) kill(S, u, -1); P.q = { b: [], i: [], v: [] }; P.ready = null; }
    }
    const h = S.human, H = S.P[h];
    if (S.obj && H) {
      for (const o of S.obj) {
        if (o.done || o.fail) continue;
        if (o.t === 'build') o.done = (H.ever[o.b] || 0) >= o.n;
        else if (o.t === 'collect') o.done = H.st.harv >= o.n;
        else if (o.t === 'survive') o.done = S.t >= o.min * 60 * TPS;
        else if (o.t === 'army') o.done = S.U.filter(u => !u.dead && u.o === h && UT[u.t].wt).length >= o.n;
        else if (o.t === 'destroy') o.done = S.P.every(P => P.i === h || P.out || !realB(S, P.i));
        else if (o.t === 'protect') { if (!S.U.some(u => !u.dead && u.o === h && u.t === o.ut) && !H.q.v.some(q => q.t === o.ut && q.p > .6)) o.fail = true; }
      }
      const need = S.obj.filter(o => o.t !== 'protect');
      if (S.obj.some(o => o.fail) || H.out) S.res = { win: false, t: S.t, why: S.obj.some(o => o.fail) ? 'protect' : 'out' };
      else if (need.every(o => o.done)) S.res = { win: true, t: S.t };
    } else {
      const alive = S.P.filter(P => !P.out);
      if (H && H.out) S.res = { win: false, t: S.t, winner: alive.length === 1 ? alive[0].i : -1, why: 'out' };
      else if (alive.length <= 1) S.res = { win: !!H && alive[0] === H, t: S.t, winner: alive.length ? alive[0].i : -1 };
    }
    if (S.res) S.ev.push({ t: 'end', win: S.res.win });
  }

  /* ---------- one tick ---------- */
  function step(S) {
    S.ev.length = 0; if (S.cd.length > 4000) { S.cd.length = 0; S.cdAll = 1; }
    if (S.res) return;
    S.t++;
    for (const u of S.U) { u.px = u.x; u.py = u.y; u.pd = u.d; u.pt = u.tu; }
    for (const b of S.B) b.pt = b.tu;
    buildHash(S);
    if (typeof AI !== 'undefined') for (const P of S.P) if (P.ai != null && !P.out) AI.think(S, P);
    production(S);
    runPaths(S);
    for (const u of S.U) if (!u.dead) unitTick(S, u);
    separate(S);
    for (const b of S.B) if (!b.dead) buildingTick(S, b);
    projectiles(S);
    krTick(S);
    if (S.t % 20 === 0) regrow(S);
    let n = 0; for (const u of S.U) { if (u.dead) { delete S.E[u.id]; continue; } S.U[n++] = u; } S.U.length = n;
    if (S.B.some(b => b.dead)) { S.B = S.B.filter(b => { if (b.dead) delete S.E[b.id]; return !b.dead; }); }
    if (S.rc) recalc(S);
    if (S.t % 3 === 0) updateFog(S);
    if (S.t % 15 === 0) { recalc(S); checkEnd(S); }
  }

  /* ---------- saving: the map is regenerated from its seed; the rest is plain JSON ---------- */
  const b64e = a => { let s = ''; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); };
  const b64d = (s, n) => { const t = atob(s), a = new Uint8Array(n); for (let i = 0; i < n && i < t.length; i++) a[i] = t.charCodeAt(i); return a; };
  const SKIP = new Set(['ter', 'cmax', 'occ', 'E', 'ev', 'cd', 'ft', 'hash', 'vis', 'mark', 'gen', 'cry', 'slab', 'exp', 'bases', 'N', 'hc', 'hr']);
  function serialize(S) {
    const o = {}; for (const k in S) if (!SKIP.has(k)) o[k] = S[k];
    o.cry = b64e(S.cry); o.slab = b64e(S.slab); o.exp = b64e(S.exp);
    return JSON.stringify(o, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e4) / 1e4 : v);
  }
  function deserialize(str) {
    const o = typeof str === 'string' ? JSON.parse(str) : str; if (!o || o.v !== CORE_V) return null;
    const M = genMap(o.cfg.map), S = Object.assign({}, o);
    attachMap(S, M); S.cry = b64d(o.cry, S.N); S.slab = b64d(o.slab, S.N); S.exp = b64d(o.exp, S.N);
    for (const u of S.U) { S.E[u.id] = u; u.inq = 0; u.r = UT[u.t].r; }
    for (const b of S.B) { S.E[b.id] = b; for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) S.occ[j * S.W + i] = b.id; }
    S.pq = S.pq.filter(id => S.E[id]); for (const id of S.pq) S.E[id].inq = 1;
    for (const u of S.U) if (u.wait && !u.inq) { u.inq = 1; S.pq.push(u.id); }
    recalc(S); updateFog(S);
    return S;
  }
  const finite = S => S.U.every(u => [u.x, u.y, u.d, u.tu, u.hp, u.v, u.car].every(Number.isFinite)) && S.P.every(P => Number.isFinite(P.cry)) && S.PJ.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    && (!S.kr || (Number.isFinite(S.kr.x) && Number.isFinite(S.kr.y) && Number.isFinite(S.kr.t)));
  const Core = { addUnit, placeBuilding, raffAim, nearField, newGame, step, cmd, serialize, deserialize, techOk, placeTiles, findSpot, catOf, center, dockOf, distTo, tileOf, passT, findPath, unitCount, recalc, finite, krOk, freeNear, wrapA };

  /* ================= ai.js: the computer opponent (deterministic; uses the same commands as the player) ================= */
  const AI = (() => {
    // build order: the base grows step by step; later entries need the earlier tech
    const ORDER = ['cent', 'raff', 'kaz', 'cent', 'fab', 'toren', 'raff', 'radar', 'cent', 'silo', 'toren', 'rep', 'cent', 'rpaal', 'toren', 'rpaal', 'cent', 'fab'];
    function init(S, P) {
      const D = DIFFS[P.ai], by = S.B.find(b => b.o === P.i && b.t === 'bouw') || S.B.find(b => b.o === P.i);
      const bx = by ? by.x + by.w / 2 : P.base.x, byy = by ? by.y + by.h / 2 : P.base.y;
      const outpost = !S.B.some(b => b.o === P.i && b.t === 'bouw');
      P.A = { bo: 0, nt: P.i * 3, wave: 0, outpost, cap: outpost ? 6 + P.ai * 4 : 99, next: Math.round((P.aggro ? 75 : P.raid ? 120 : D.wave0) * TPS), size: P.raid ? 2 : D.size0, bx, by: byy, def: 0, hunt: 0, fails: 0 };
    }
    const enemies = (S, P) => S.P.filter(Q => Q !== P && !Q.out);
    function targetPlayer(S, P) {
      let best = null, bd = 1e9;
      for (const Q of enemies(S, P)) { const d = Math.hypot(Q.base.x - P.A.bx, Q.base.y - P.A.by) * (Q.i === S.human ? .9 : 1); if (d < bd) { bd = d; best = Q; } }
      return best;
    }
    function targetFor(S, P, Q, from) {                          // the nearest enemy building (or unit) of Q
      let best = null, bd = 1e9;
      for (const b of S.B) if (!b.dead && b.o === Q.i) { const d = Math.hypot(b.x - from.x, b.y - from.y) + (BT[b.t].wt ? 4 : 0); if (d < bd) { bd = d; best = b; } }
      if (!best) for (const u of S.U) if (!u.dead && u.o === Q.i) { const d = Math.hypot(u.x - from.x, u.y - from.y); if (d < bd) { bd = d; best = u; } }
      return best;
    }
    const have = (P, t) => (P.bc[t] || 0) + (P.ready === t ? 1 : 0) + P.q.b.filter(q => q.t === t).length;
    function pickBuilding(S, P) {
      const D = DIFFS[P.ai], A = P.A;
      if (!P.bc.bouw) return null;
      const spare = P.pw - P.pu;
      if (spare < 25 && have(P, 'cent') <= (P.bc.cent || 0)) return 'cent';
      if (!have(P, 'raff') && techOk(S, P.i, 'raff')) return 'raff';
      if (!have(P, 'kaz') && techOk(S, P.i, 'kaz')) return 'kaz';
      if (!have(P, 'fab') && techOk(S, P.i, 'fab')) return 'fab';
      if (P.cry > P.cap * .85 && have(P, 'silo') < 3 && techOk(S, P.i, 'silo')) return 'silo';
      // the build order: how many of each type should exist after step k
      while (A.bo < ORDER.length) {
        const t = ORDER[A.bo], want = ORDER.slice(0, A.bo + 1).filter(x => x === t).length;
        if (have(P, t) >= want) { A.bo++; continue; }
        if ((t === 'toren' || t === 'rpaal') && ORDER.slice(0, A.bo + 1).filter(x => x === 'toren' || x === 'rpaal').length > D.tow + 1) { A.bo++; continue; }
        if (!techOk(S, P.i, t)) { if ((TIER[t] || 1) > S.tier) { A.bo++; continue; } return null; }
        return t;
      }
      // after the order: more defence and power now and then
      const tw = have(P, 'toren') + have(P, 'rpaal');
      if (tw < D.tow * 2 && P.cry > 900) return techOk(S, P.i, 'rpaal') && tw % 2 ? 'rpaal' : 'toren';
      return null;
    }
    function placeReady(S, P) {
      const t = P.ready, A = P.A; let towards = t === 'raff' || t === 'silo' ? raffAim(S, A.bx, A.by) : null;
      if (t === 'toren' || t === 'rpaal') {
        const Q = targetPlayer(S, P); const ang = Q ? Math.atan2(Q.base.y - A.by, Q.base.x - A.bx) : 0, k = (S.t / 97 | 0) % 3 - 1;
        towards = { x: A.bx + Math.cos(ang + k * .7) * 6.5, y: A.by + Math.sin(ang + k * .7) * 6.5 };
      }
      const s = findSpot(S, P.i, t, A.bx, A.by, false, towards);
      if (s && cmd(S, P.i, { c: 'place', x: s.x, y: s.y })) { A.fails = 0; return; }
      if (++A.fails > 3) { cmd(S, P.i, { c: 'cancel', cat: 'b', ready: 1 }); A.fails = 0; A.bo++; }
    }
    function pickUnit(S, P, cat) {
      const D = DIFFS[P.ai], mix = D.mix.filter(t => t === 'sp' || (UT[t].cat === 'inf') === (cat === 'i'));
      const opts = mix.map(t => t === 'sp' ? FACTIONS[P.fac].sp : t).filter(t => techOk(S, P.i, t));
      if (!opts.length) { const f = cat === 'i' ? 'sol' : 'lt'; return techOk(S, P.i, f) ? f : null; }
      // counter the enemy a little: many vehicles -> more rockets
      const Q = targetPlayer(S, P); let veh = 0, inf = 0;
      if (Q) for (const u of S.U) if (u.o === Q.i && !u.dead) { if (UT[u.t].cat === 'veh') veh++; else inf++; }
      if (cat === 'i' && veh > inf * 1.5 && techOk(S, P.i, 'raks') && rnd(S) < .6) return 'raks';
      return opts[Math.floor(rnd(S) * opts.length)];
    }
    function think(S, P) {
      const A = P.A; if (!A) { init(S, P); return; }
      if (S.t < A.nt) return;
      const D = DIFFS[P.ai]; A.nt = S.t + D.think; const late = S.t > TPS * 60 * 20;
      if (P.ready) placeReady(S, P);
      // buildings
      if (!P.q.b.length && !P.ready) { const t = pickBuilding(S, P); if (t && (!late || t === 'cent' || !P.bc[t])) cmd(S, P.i, { c: 'build', t }); }
      // harvesters
      const harv = S.U.filter(u => !u.dead && u.o === P.i && UT[u.t].harv).length + P.q.v.filter(q => q.t === 'oog').length;
      const wantH = Math.min(P.ai === 2 ? 5 : 4, (P.bc.raff || 0) * D.harv + (P.ai === 2 && P.bc.raff ? 1 : 0) + (late ? 1 : 0));
      const building = P.q.b.length && P.cry < 500;
      if (harv < wantH && P.bc.fab && P.cry > 300 && techOk(S, P.i, 'oog') && !P.q.v.some(q => q.t === 'oog')) { cmd(S, P.i, { c: 'build', t: 'oog' }); if (P.q.v.length > 1) { const it = P.q.v.pop(); P.q.v.splice(1, 0, it); } }
      // units
      const army = S.U.filter(u => !u.dead && u.o === P.i && UT[u.t].wt);
      const nInf = army.filter(u => UT[u.t].cat === 'inf').length, nVeh = army.length - nInf;
      if (!building && army.length < A.cap + A.wave * (A.outpost ? 1 : 0)) {
        if (P.bc.kaz && P.q.i.length < 1 && P.cry > 120 && (nInf < nVeh * 1.3 + 3 || !P.bc.fab)) { const t = pickUnit(S, P, 'i'); if (t) cmd(S, P.i, { c: 'build', t }); }
        if (P.bc.fab && P.q.v.length < 1 && P.cry > 250) { const t = pickUnit(S, P, 'v'); if (t) cmd(S, P.i, { c: 'build', t }); }
      }
      for (const b of S.B) if (b.o === P.i && !b.dead && b.hp < b.mhp * .55 && !b.rep && P.cry > (late ? 900 : 300) && S.t - b.hit > TPS * 4) cmd(S, P.i, { c: 'brep', b: b.id });
      // defence: something of ours is under fire -> idle units near home go there
      let alarm = null;
      for (const b of S.B) if (b.o === P.i && !b.dead && S.t - b.hit < TPS * 3) { alarm = { x: b.ax, y: b.ay }; break; }
      if (!alarm) for (const u of S.U) if (u.o === P.i && !u.dead && UT[u.t].harv && S.t - u.hit < TPS * 3) { alarm = { x: u.ax, y: u.ay }; break; }
      if (alarm && S.t - A.def > TPS * 3) {
        A.def = S.t;
        const ids = army.filter(u => (u.st === 'idle' || (u.st === 'amove' && u.home)) && Math.hypot(u.x - A.bx, u.y - A.by) < 24).map(u => u.id);
        if (ids.length) { cmd(S, P.i, { c: 'amove', ids, x: alarm.x, y: alarm.y }); for (const id of ids) S.E[id].home = 1; }
      }
      // attack waves that grow
      const idle = army.filter(u => u.st === 'idle' && !u.rp);
      const Q = targetPlayer(S, P);
      if (Q && S.t >= A.next && (idle.length >= A.size || (S.t > A.next + TPS * 45 && idle.length >= Math.min(A.size, 3)))) {
        const from = { x: A.bx, y: A.by }, full = idle.length >= A.size;
        let tg = P.raid ? S.U.filter(u => !u.dead && u.o === Q.i && UT[u.t].harv).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0] : null;
        if (!tg && (late || A.wave % 3 === 2)) tg = S.B.filter(b => !b.dead && b.o === Q.i && (b.t === 'bouw' || b.t === 'raff' || b.t === 'fab')).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
        if (!tg) tg = targetFor(S, P, Q, from);
        if (tg) {
          const c = center(tg), ids = idle.slice(0, Math.max(A.size, idle.length - 2)).map(u => u.id);
          cmd(S, P.i, { c: 'amove', ids, x: c.x, y: c.y }); for (const id of ids) S.E[id].home = 0;
          A.wave++; A.next = S.t + Math.round((P.aggro ? 60 : P.raid ? 75 : late ? Math.min(D.gap, 60) : D.gap) * TPS); if (full) A.size = Math.min(P.raid ? 4 : D.maxW, A.size + (P.raid ? 1 : D.grow));
        }
      }
      // defenders go home again; units that finished a wave far from home keep pushing to the next target
      if ((S.t / D.think | 0) % 4 === 1) { const back = idle.filter(u => u.home && Math.hypot(u.x - A.bx, u.y - A.by) > 12); if (back.length) cmd(S, P.i, { c: 'move', ids: back.map(u => u.id), x: A.bx, y: A.by + 4 }); }
      if (Q && (S.t / D.think | 0) % 4 === 0) {
        const far = idle.filter(u => !u.home && Math.hypot(u.x - A.bx, u.y - A.by) > 16);
        if (far.length) { const tg = targetFor(S, P, Q, far[0]); if (tg) { const c = center(tg); cmd(S, P.i, { c: 'amove', ids: far.map(u => u.id), x: c.x, y: c.y }); } }
      }
      // no bouwplaats left: everything attacks
      if (!P.bc.bouw && !P.bc.fab && !P.bc.kaz && Q && idle.length && (S.t / D.think | 0) % 3 === 0) { const tg = targetFor(S, P, Q, idle[0]); if (tg) { const c = center(tg); cmd(S, P.i, { c: 'amove', ids: idle.map(u => u.id), x: c.x, y: c.y }); } }
      // idle harvesters go back to work
      for (const u of S.U) if (u.o === P.i && !u.dead && UT[u.t].harv && u.st === 'idle') cmd(S, P.i, { c: 'harvest', ids: [u.id] });
    }
    return { init, think };
  })();

  /* ================= art.js: everything drawn procedurally: terrain chunks, sprites per faction colour and direction, emblems ================= */
  const Art = (() => {
    const PX = 48, DIRS = 16, CH = 16, PXT = 32;                 // sprite px per tile, directions, terrain chunk size (tiles), terrain px per tile
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
    const hex = (h, a = 1) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    const mix = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const c = k => Math.round(((A >> k) & 255) * (1 - t) + ((B >> k) & 255) * t); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
    function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    /* ---------- tileable noise texture for the terrain ---------- */
    const NS = 256, NOISE = new Float32Array(NS * NS);
    (() => {
      const R = rng(4242);
      for (const [cell, amp] of [[32, .5], [16, .25], [8, .14], [4, .08], [2, .03]]) {
        const n = NS / cell, L = new Float32Array(n * n); for (let i = 0; i < L.length; i++) L[i] = R();
        for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
          const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, ux = tx * tx * (3 - 2 * tx), uy = ty * ty * (3 - 2 * ty);
          const a = L[(iy % n) * n + ix % n], b = L[(iy % n) * n + (ix + 1) % n], c = L[((iy + 1) % n) * n + ix % n], d = L[((iy + 1) % n) * n + (ix + 1) % n];
          NOISE[y * NS + x] += (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * amp;
        }
      }
    })();
    const nz = (x, y) => NOISE[((y & 255) << 8) | (x & 255)];

    /* ---------- terrain: a height field shaded by a light from the top left ---------- */
    const SAND = [236, 200, 134], SAND2 = [222, 176, 110], ROCK = [158, 134, 112], ROCK2 = [128, 106, 90], CLIFF = [112, 86, 70], SLAB = [176, 172, 160];
    function chunk(S, cx, cy) {
      const W = S.W, H = S.H, x0 = cx * CH, y0 = cy * CH, cw = Math.min(CH, W - x0), chh = Math.min(CH, H - y0);
      const pw = cw * PXT, ph = chh * PXT, c = mk(pw, ph), g = c.getContext('2d'), img = g.createImageData(pw, ph), D = img.data;
      const field = (k, tx, ty) => { tx = Math.max(0, Math.min(W - 1, tx)); ty = Math.max(0, Math.min(H - 1, ty)); const t = S.ter[ty * W + tx]; return k === 0 ? (t === T_ROCK || t === T_CLIFF ? 1 : 0) : k === 1 ? (t === T_CLIFF ? 1 : 0) : k === 2 ? (t === T_DUNE ? 1 : 0) : S.slab[ty * W + tx]; };
      // per tile corner samples, then bilinear per pixel
      const gw = cw + 3, gh = chh + 3, F = [0, 1, 2, 3].map(() => new Float32Array(gw * gh));
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) for (let k = 0; k < 4; k++) F[k][j * gw + i] = field(k, x0 + i - 1, y0 + j - 1);
      const hw = pw + 2, hh = ph + 2, Hm = new Float32Array(hw * hh), Mat = new Float32Array(hw * hh * 4);
      for (let py = -1; py <= ph; py++) for (let px = -1; px <= pw; px++) {
        const u = (px + .5) / PXT - .5 + 1, v = (py + .5) / PXT - .5 + 1, iu = Math.max(0, Math.min(gw - 2, Math.floor(u))), iv = Math.max(0, Math.min(gh - 2, Math.floor(v))), fu = u - iu, fv = v - iv;
        const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
        const bl = k => { const f = F[k]; const a = f[iv * gw + iu], b = f[iv * gw + iu + 1], cc = f[(iv + 1) * gw + iu], d = f[(iv + 1) * gw + iu + 1]; return a + (b - a) * su + (cc - a) * sv + (a - b - cc + d) * su * sv; };
        const wx = x0 * PXT + px, wy = y0 * PXT + py, n1 = nz(wx, wy), n2 = nz((wx >> 2) + 97, (wy >> 2) + 31), n3 = nz(wx * 3 + 11, wy * 3 + 7);
        const rk = bl(0), cl = bl(1), du = bl(2), sl = bl(3);
        const rm = Math.min(1, Math.max(0, (rk + (n1 - .5) * .55 - .42) / .14)), cm = Math.min(1, Math.max(0, (cl + (n1 - .5) * .4 - .38) / .2));
        const dm = du * du * (3 - 2 * du);
        const ripple = Math.sin(wx * .19 + wy * .06 + n2 * 9) * .012 * (1 - rm);
        const h = dm * .95 + rm * .32 + cm * .9 + n1 * .05 + n3 * rm * .05 + ripple;
        const k = (py + 1) * hw + px + 1; Hm[k] = h; Mat[k * 4] = rm; Mat[k * 4 + 1] = cm; Mat[k * 4 + 2] = dm; Mat[k * 4 + 3] = sl > .5 ? 1 : 0;
      }
      for (let py = 0; py < ph; py++) for (let px = 0; px < pw; px++) {
        const k = (py + 1) * hw + px + 1, dx = Hm[k + 1] - Hm[k - 1], dy = Hm[k + hw] - Hm[k - hw];
        let li = 1 - (dx + dy) * 9; li = Math.max(.55, Math.min(1.35, li));
        const rm = Mat[k * 4], cm = Mat[k * 4 + 1], dm = Mat[k * 4 + 2], sl = Mat[k * 4 + 3], wx = x0 * PXT + px, wy = y0 * PXT + py, n1 = nz(wx, wy), n4 = nz(wx * 2 + 50, wy * 2 + 3);
        let r = SAND[0] + (SAND2[0] - SAND[0]) * (n1 * .9 + dm * .4), gg = SAND[1] + (SAND2[1] - SAND[1]) * (n1 * .9 + dm * .4), b = SAND[2] + (SAND2[2] - SAND[2]) * (n1 * .9 + dm * .4);
        if (rm > 0) { const t = n4 * .8; const R0 = ROCK[0] + (ROCK2[0] - ROCK[0]) * t, G0 = ROCK[1] + (ROCK2[1] - ROCK[1]) * t, B0 = ROCK[2] + (ROCK2[2] - ROCK[2]) * t; r += (R0 - r) * rm; gg += (G0 - gg) * rm; b += (B0 - b) * rm; }
        if (cm > 0) { r += (CLIFF[0] - r) * cm; gg += (CLIFF[1] - gg) * cm; b += (CLIFF[2] - b) * cm; }
        if (sl) { const lx = (wx % (PXT * 2)), ly = (wy % (PXT * 2)), seam = lx < 2 || ly < 2 ? .78 : 1; r = SLAB[0] * seam + n4 * 10; gg = SLAB[1] * seam + n4 * 10; b = SLAB[2] * seam + n4 * 8; li = 1; }
        const o = (py * pw + px) * 4; D[o] = Math.min(255, r * li); D[o + 1] = Math.min(255, gg * li); D[o + 2] = Math.min(255, b * li); D[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      // pebbles on rock, a few dark specks in the sand
      const R = rng((cx * 73856093) ^ (cy * 19349663) ^ 77);
      for (let n = 0; n < cw * chh * .9; n++) {
        const tx = Math.floor(R() * cw), ty = Math.floor(R() * chh), t = S.ter[(y0 + ty) * W + x0 + tx];
        const px = (tx + R()) * PXT, py = (ty + R()) * PXT;
        if (t === T_ROCK && !S.slab[(y0 + ty) * W + x0 + tx]) { const s = 1.5 + R() * 2.5; g.fillStyle = 'rgba(70,52,40,.35)'; g.beginPath(); g.ellipse(px + 1, py + 1.2, s, s * .7, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(214,196,176,.55)'; g.beginPath(); g.ellipse(px, py, s, s * .7, 0, 0, 7); g.fill(); }
        else if (t === T_SAND && R() < .3) { g.fillStyle = 'rgba(150,110,60,.18)'; g.fillRect(px, py, 1.5, 1.5); }
      }
      return c;
    }
    // fine sand grain, laid over the terrain at screen resolution so the ground stays crisp when zoomed in
    function grain() {
      const N = 256, c = mk(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), D = img.data, R = rng(9091);
      for (let i = 0; i < N * N; i++) {
        const r = R(), o = i * 4;
        if (r < .07) { D[o] = 255; D[o + 1] = 244; D[o + 2] = 214; D[o + 3] = 26 + R() * 34; }
        else if (r < .15) { D[o] = 70; D[o + 1] = 48; D[o + 2] = 26; D[o + 3] = 20 + R() * 30; }
      }
      g.putImageData(img, 0, 0);
      for (let k = 0; k < 260; k++) { const x = R() * N, y = R() * N, s = .8 + R() * 1.2; g.fillStyle = R() < .5 ? 'rgba(255,240,205,.22)' : 'rgba(80,56,30,.2)'; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
      return c;
    }
    // stamp onto a chunk: track marks, scorch marks
    function stamp(c, kind, px, py, a, s = 1) {
      const g = c.getContext('2d');
      if (kind === 'track') { g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = 'rgba(110,78,40,.13)'; g.fillRect(-2, -PXT * .32 * s, 4, PXT * .14 * s); g.fillRect(-2, PXT * .18 * s, 4, PXT * .14 * s); g.restore(); }
      else if (kind === 'foot') { g.fillStyle = 'rgba(110,78,40,.12)'; g.beginPath(); g.arc(px, py, 1.6, 0, 7); g.fill(); }
      else if (kind === 'scorch') { const gr = g.createRadialGradient(px, py, 0, px, py, PXT * s); gr.addColorStop(0, 'rgba(40,28,20,.55)'); gr.addColorStop(.6, 'rgba(60,40,24,.25)'); gr.addColorStop(1, 'rgba(60,40,24,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px, py, PXT * s, 0, 7); g.fill(); }
    }

    /* ---------- emblems ---------- */
    function emblem(g, kind, x, y, r, fill, line) {
      g.save(); g.translate(x, y); g.fillStyle = fill; g.strokeStyle = line || 'rgba(0,0,0,.35)'; g.lineWidth = r * .12;
      if (kind === 'sun') {
        g.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, a2 = a + Math.PI / 12; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a2) * r * .62, Math.sin(a2) * r * .62); } g.closePath(); g.fill(); g.stroke();
        g.fillStyle = line || '#fff'; g.globalAlpha = .9; g.beginPath(); g.arc(0, 0, r * .42, 0, 7); g.fill(); g.globalAlpha = 1; g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r * .3, 0, 7); g.fill();
      } else if (kind === 'bolt') {
        g.beginPath(); g.moveTo(r * .2, -r); g.lineTo(-r * .55, r * .12); g.lineTo(-r * .02, r * .12); g.lineTo(-r * .3, r); g.lineTo(r * .6, -r * .2); g.lineTo(r * .05, -r * .2); g.lineTo(r * .35, -r); g.closePath(); g.fill(); g.stroke();
      } else {
        g.beginPath(); const n = 8; for (let k = 0; k < n * 2; k++) { const a = (k + .5) / (n * 2) * Math.PI * 2, rr2 = k % 2 ? r * .72 : r; g.lineTo(Math.cos(a - .12) * rr2, Math.sin(a - .12) * rr2); g.lineTo(Math.cos(a + .12) * rr2, Math.sin(a + .12) * rr2); } g.closePath(); g.fill(); g.stroke();
        g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, r * .32, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
        g.strokeStyle = line || 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(0, 0, r * .32, 0, 7); g.stroke();
      }
      g.restore();
    }
    function emblemCanvas(fi, size) { const F = FACTIONS[fi], c = mk(size, size), g = c.getContext('2d'); emblem(g, F.emb, size / 2, size / 2, size * .42, F.col, F.dk); return c; }

    /* ---------- unit drawings (local frame: facing +x, 1 = one tile) ---------- */
    function tracks(g, L, y, w, col = '#3a3530') { g.fillStyle = col; rr(g, -L / 2, y - w / 2, L, w, w * .4); g.fill(); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-L / 2 + .03, y - w / 2 + .015, L - .06, w * .22); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .02; for (let x = -L / 2 + .06; x < L / 2; x += .085) { g.beginPath(); g.moveTo(x, y - w / 2 + .01); g.lineTo(x, y + w / 2 - .01); g.stroke(); } }
    function wheel(g, x, y, l = .2, w = .11) { g.fillStyle = '#2b2622'; rr(g, x - l / 2, y - w / 2, l, w, .04); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x - l / 2 + .02, y - w / 2 + .015, l - .04, .02); }
    const BODY = {
      sol: (g, F, f) => infantry(g, F, f, false), raks: (g, F, f) => infantry(g, F, f, true),
      verk: (g, F) => {
        for (const [x, y] of [[.22, -.2], [.22, .2], [-.2, -.21], [-.2, .21]]) wheel(g, x, y, .2, .11);
        g.fillStyle = F.col; rr(g, -.3, -.15, .62, .3, .08); g.fill();
        g.fillStyle = F.c2; rr(g, .12, -.12, .18, .24, .05); g.fill();
        g.strokeStyle = '#3c3a38'; g.lineWidth = .035; g.beginPath(); g.moveTo(-.12, -.15); g.lineTo(.02, -.06); g.lineTo(.02, .06); g.lineTo(-.12, .15); g.stroke();
        g.fillStyle = '#4a4744'; g.fillRect(-.06, -.03, .32, .06); g.fillStyle = '#2b2826'; g.fillRect(.2, -.02, .14, .04);
      },
      lt: (g, F) => { tracks(g, .86, -.25, .17); tracks(g, .86, .25, .17); g.fillStyle = F.col; rr(g, -.36, -.2, .74, .4, .07); g.fill(); g.fillStyle = F.dk; g.fillRect(.26, -.18, .1, .36); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-.3, -.17, .5, .05); grille(g, -.34, -.12, .1, .24); g.fillStyle = '#fff6c8'; for (const y of [-.14, .14]) { g.beginPath(); g.arc(.37, y, .025, 0, 7); g.fill(); } },
      zt: (g, F) => { tracks(g, 1, -.31, .2); tracks(g, 1, .31, .2); g.fillStyle = F.col; rr(g, -.42, -.24, .86, .48, .08); g.fill(); g.fillStyle = F.dk; g.fillRect(.3, -.22, .12, .44); g.fillStyle = F.dk; g.fillRect(-.42, -.1, .08, .2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-.36, -.21, .6, .05); grille(g, -.38, -.16, .12, .32); g.fillStyle = '#fff6c8'; for (const y of [-.18, .18]) { g.beginPath(); g.arc(.43, y, .028, 0, 7); g.fill(); } },
      rw: (g, F) => { for (const x of [.25, 0, -.25]) { wheel(g, x, -.22, .17, .1); wheel(g, x, .22, .17, .1); } g.fillStyle = F.col; rr(g, -.38, -.18, .76, .36, .06); g.fill(); g.fillStyle = F.c2; rr(g, .2, -.16, .18, .32, .05); g.fill(); g.fillStyle = 'rgba(30,40,60,.6)'; g.fillRect(.31, -.12, .05, .24); },
      oog: (g, F) => {
        tracks(g, 1.1, -.36, .2, '#3d3730'); tracks(g, 1.1, .36, .2, '#3d3730');
        g.fillStyle = '#8f8a80'; g.beginPath(); g.moveTo(.5, -.4); g.lineTo(.66, -.32); g.lineTo(.66, .32); g.lineTo(.5, .4); g.closePath(); g.fill();
        g.strokeStyle = '#5c5850'; g.lineWidth = .03; for (let y = -.3; y <= .31; y += .1) { g.beginPath(); g.moveTo(.6, y); g.lineTo(.7, y); g.stroke(); }
        g.fillStyle = F.col; rr(g, -.52, -.3, 1.04, .6, .08); g.fill();
        g.fillStyle = '#5a5248'; rr(g, -.44, -.22, .58, .44, .05); g.fill();
        g.fillStyle = '#3a342e'; rr(g, -.4, -.18, .5, .36, .04); g.fill();
        g.fillStyle = F.c2; rr(g, .22, -.24, .24, .48, .06); g.fill(); g.fillStyle = 'rgba(30,40,60,.65)'; g.fillRect(.36, -.18, .06, .36);
        g.fillStyle = '#f0c040'; for (let k = 0; k < 4; k++) g.fillRect(-.5 + k * .1, .26, .05, .03);
      },
      stral: (g, F) => { tracks(g, .9, -.27, .18); tracks(g, .9, .27, .18); g.fillStyle = F.col; rr(g, -.38, -.21, .78, .42, .09); g.fill(); g.fillStyle = F.c2; g.fillRect(-.34, -.05, .2, .1); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-.3, -.18, .5, .05); },
      bliks: (g, F) => { for (const [x, y] of [[.24, -.22], [.24, .22], [-.22, -.23], [-.22, .23]]) wheel(g, x, y, .22, .12); g.fillStyle = F.col; rr(g, -.36, -.18, .74, .36, .1); g.fill(); g.fillStyle = F.c2; rr(g, .14, -.14, .2, .28, .06); g.fill(); g.strokeStyle = '#d8f0ff'; g.lineWidth = .025; g.beginPath(); g.moveTo(-.34, 0); g.lineTo(-.18, 0); g.stroke(); },
      kolos: (g, F) => {
        tracks(g, 1.26, -.42, .26); tracks(g, 1.26, .42, .26); g.fillStyle = F.col; rr(g, -.55, -.32, 1.1, .64, .1); g.fill();
        g.fillStyle = F.dk; g.fillRect(.4, -.3, .15, .6); g.fillStyle = '#9aa0a8'; for (const [x, y] of [[-.45, -.24], [-.45, .24], [.32, -.24], [.32, .24], [-.05, -.27], [-.05, .27]]) { g.beginPath(); g.arc(x, y, .03, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-.48, -.29, .8, .05);
      },
    };
    function grille(g, x, y, w, h) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = .012; for (let k = y + .03; k < y + h; k += .04) { g.beginPath(); g.moveTo(x + .01, k); g.lineTo(x + w - .01, k); g.stroke(); } }
    const TURRET = {
      lt: (g, F) => { g.fillStyle = '#4b4743'; g.fillRect(.05, -.04, .46, .08); g.fillStyle = '#2e2b28'; g.fillRect(.46, -.055, .07, .11); g.fillStyle = F.col; g.beginPath(); g.arc(0, 0, .2, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .02; g.stroke(); g.fillStyle = F.dk; g.beginPath(); g.arc(-.05, 0, .07, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-.07, -.02, .025, 0, 7); g.fill(); },
      zt: (g, F) => { g.fillStyle = '#45413d'; g.fillRect(.08, -.055, .58, .11); g.fillRect(.58, -.075, .1, .15); g.fillStyle = F.col; rr(g, -.24, -.23, .46, .46, .1); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .02; g.stroke(); g.fillStyle = F.dk; g.fillRect(-.2, -.06, .14, .12); g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(.06, .1, .05, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-.2, -.2, .36, .04); },
      rw: (g, F) => { g.fillStyle = '#5a5650'; rr(g, -.24, -.17, .44, .34, .05); g.fill(); g.fillStyle = '#2c2a28'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(.1 + j * .07, -.1 + i * .1, .035, 0, 7); g.fill(); } g.fillStyle = F.col; g.fillRect(-.24, -.17, .12, .34); },
      stral: (g, F) => { g.fillStyle = '#5a554c'; g.fillRect(-.05, -.04, .2, .08); const gr = g.createRadialGradient(.12, 0, .02, .1, 0, .28); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.5, '#ffd24a'); gr.addColorStop(1, '#b07010'); g.fillStyle = gr; g.beginPath(); g.ellipse(.1, 0, .12, .27, 0, 0, 7); g.fill(); g.strokeStyle = '#8a5a10'; g.lineWidth = .025; g.stroke(); g.strokeStyle = '#6a6458'; g.lineWidth = .03; g.beginPath(); g.moveTo(.12, -.2); g.lineTo(.42, 0); g.lineTo(.12, .2); g.stroke(); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(.42, 0, .04, 0, 7); g.fill(); },
      bliks: (g, F) => { g.fillStyle = '#4e5660'; g.beginPath(); g.arc(0, 0, .16, 0, 7); g.fill(); g.strokeStyle = '#c7d6e4'; g.lineWidth = .035; for (const r of [.13, .09]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); } const gr = g.createRadialGradient(0, 0, 0, 0, 0, .08); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#5ab8ff'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .065, 0, 7); g.fill(); g.fillStyle = '#9fb4c8'; g.fillRect(.12, -.025, .2, .05); },
      kolos: (g, F) => { g.fillStyle = '#403c38'; g.fillRect(.1, -.15, .62, .1); g.fillRect(.1, .05, .62, .1); g.fillStyle = F.col; rr(g, -.3, -.28, .56, .56, .14); g.fill(); emblem(g, 'gear', -.04, 0, .14, F.c2, F.dk); },
    };
    function infantry(g, F, f, rocket) {
      const st = f === 0 ? 0 : f === 1 ? .1 : -.1;
      g.fillStyle = '#4a3e30'; g.beginPath(); g.ellipse(st, -.07, .06, .04, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(-st, .07, .06, .04, 0, 0, 7); g.fill();
      g.fillStyle = F.col; g.beginPath(); g.ellipse(0, 0, .1, .15, 0, 0, 7); g.fill();
      g.fillStyle = '#6a5a44'; rr(g, -.13, -.07, .07, .14, .02); g.fill();
      if (rocket) { g.fillStyle = '#5c6a58'; g.fillRect(-.16, -.13, .42, .07); g.fillStyle = '#2f342e'; g.fillRect(.24, -.135, .04, .08); }
      else { g.strokeStyle = '#2e2b28'; g.lineWidth = .04; g.beginPath(); g.moveTo(.02, .06); g.lineTo(.28, .03); g.stroke(); g.fillStyle = '#e6b88c'; g.beginPath(); g.arc(.12, .07, .03, 0, 7); g.fill(); }
      g.fillStyle = '#f0c49a'; g.beginPath(); g.arc(.03, 0, .065, 0, 7); g.fill();
      g.fillStyle = F.dk; g.beginPath(); g.arc(.01, 0, .07, Math.PI * .55, Math.PI * 1.45 + Math.PI); g.fill(); g.beginPath(); g.arc(.0, 0, .062, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-.02, -.025, .022, 0, 7); g.fill();
    }
    // shading: light from the top left in world space, shadow down-right
    function shadeOn(g, cx, cy, s) { g.save(); g.globalCompositeOperation = 'source-atop'; const gr = g.createLinearGradient(cx - s, cy - s, cx + s, cy + s); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = gr; g.fillRect(cx - s, cy - s, s * 2, s * 2); g.restore(); }
    // a thin dark outline around a sprite, so units stand out against the sand
    function outlined(src) {
      const c = mk(src.width, src.height), g = c.getContext('2d');
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(src, dx, dy);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(28,20,12,.72)'; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over'; g.drawImage(src, 0, 0); return c;
    }
    // one sprite sheet (atlas) per faction: [type][part][dir][frame]
    const BOX = { sol: .7, raks: .8, verk: 1, lt: 1.2, zt: 1.5, rw: 1.15, oog: 1.6, stral: 1.25, bliks: 1.1, kolos: 1.9 };
    function sheet(fi) {
      const F = FACTIONS[fi], parts = [];
      for (const t in UT) {
        if (UT[t].fac && UT[t].fac !== F.id) continue;
        const box = Math.ceil(BOX[t] * PX), frames = UT[t].cat === 'inf' ? 3 : 1;
        parts.push({ t, p: 'b', box, frames, fn: BODY[t] });
        if (TURRET[t]) { parts.push({ t, p: 't', box, frames: 1, fn: TURRET[t] }); parts.push({ t, p: 'k', box, frames: 1, fn: (g, F, f) => { BODY[t](g, F, f); TURRET[t](g, F); } }); }
        if (t === 'oog') parts.push({ t, p: 'c', box, frames: 1, fn: g => { g.fillStyle = '#ff9a2a'; for (const [x, y, s] of [[-.32, -.1, .09], [-.18, .06, .1], [-.05, -.08, .08], [-.28, .1, .07], [-.08, .1, .07]]) { g.save(); g.translate(x, y); g.rotate(.6); g.fillRect(-s / 2, -s / 2, s, s); g.restore(); } g.fillStyle = '#7ad0ff'; for (const [x, y] of [[-.22, -.04], [-.1, .02], [-.35, .02]]) { g.beginPath(); g.arc(x, y, .035, 0, 7); g.fill(); } } });
      }
      let W = 0, Hh = 0; for (const p of parts) { W = Math.max(W, p.box * DIRS); Hh += p.box * p.frames; }
      const c = mk(W, Hh), g = c.getContext('2d'), map = {}; let y = 0;
      for (const p of parts) {
        for (let f = 0; f < p.frames; f++) {
          for (let d = 0; d < DIRS; d++) {
            const a = d / DIRS * Math.PI * 2, cx = d * p.box + p.box / 2, cy = y + p.box / 2;
            const draw = (gg, sh) => { gg.save(); gg.translate(cx + sh, cy + sh); gg.scale(PX, PX); gg.rotate(a); p.fn(gg, F, f); gg.restore(); };
            if (p.p !== 'c') { g.save(); g.beginPath(); g.rect(d * p.box, y, p.box, p.box); g.clip(); g.filter = 'blur(1.5px)'; g.globalAlpha = .3; g.globalCompositeOperation = 'source-over';
              const tmp = mk(p.box, p.box), tg = tmp.getContext('2d'); tg.save(); tg.translate(p.box / 2, p.box / 2); tg.scale(PX, PX); tg.rotate(a); p.fn(tg, F, f); tg.restore(); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#000'; tg.fillRect(0, 0, p.box, p.box);
              g.drawImage(tmp, d * p.box + PX * .06, y + PX * .08); g.restore(); }
            const tmp = mk(p.box, p.box), tg = tmp.getContext('2d'); tg.save(); tg.translate(p.box / 2, p.box / 2); tg.scale(PX, PX); tg.rotate(a); p.fn(tg, F, f); tg.restore();
            if (p.p !== 'c') { shadeOn(tg, p.box / 2, p.box / 2, p.box * .45); g.drawImage(outlined(tmp), d * p.box, y); }
            else g.drawImage(tmp, d * p.box, y);
          }
          map[p.t + p.p + f] = { y, box: p.box }; y += p.box;
        }
      }
      return { c, map };
    }
    // a still picture of a unit for the build buttons
    function unitIcon(fi, t, size) {
      const F = FACTIONS[fi], c = mk(size, size), g = c.getContext('2d'), s = size / (BOX[t] * .95);
      g.translate(size / 2, size / 2); g.scale(s, s); g.rotate(Math.PI * .75);
      g.save(); g.translate(.04, .05); g.globalAlpha = .3; g.filter = 'blur(1px)'; BODY[t](g, Object.assign({}, F, { col: '#000', c2: '#000', dk: '#000' }), 0); g.restore();
      BODY[t](g, F, 0); if (TURRET[t]) TURRET[t](g, F);
      return c;
    }

    /* ---------- buildings: a concrete pad, blocks with a lit roof and a front wall, drawn at BPX per tile (sharper when zoomed in) ---------- */
    const BPX = PX * 2;
    const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
    function pad(g, x, y, w, h, seed) {                     // concrete foundation with seams, specks and a bevelled edge
      const gr = g.createLinearGradient(x, y, x + w * .5, y + h); gr.addColorStop(0, '#c9c3b6'); gr.addColorStop(1, '#a39d90');
      g.fillStyle = gr; rr(g, x, y, w, h, .12); g.fill();
      g.save(); rr(g, x, y, w, h, .12); g.clip();
      g.strokeStyle = 'rgba(70,62,52,.16)'; g.lineWidth = .018;
      for (let i = 1; i < w; i++) line(g, [x + i, y, x + i, y + h]); for (let j = 1; j < h; j++) line(g, [x, y + j, x + w, y + j]);
      const R = rng(seed); for (let k = 0; k < w * h * 30; k++) { g.fillStyle = R() < .5 ? 'rgba(255,255,255,.12)' : 'rgba(60,50,40,.1)'; g.fillRect(x + R() * w, y + R() * h, .02 + R() * .02, .02 + R() * .02); }
      g.fillStyle = 'rgba(90,70,40,.08)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x + R() * w, y + R() * h, .2 + R() * .3, .12 + R() * .2, R() * 3, 0, 7); g.fill(); }
      g.restore();
      g.lineWidth = .04; g.strokeStyle = 'rgba(255,255,255,.4)'; line(g, [x + .1, y + .03, x + w - .1, y + .03]); line(g, [x + .03, y + .1, x + .03, y + h - .1]);
      g.strokeStyle = 'rgba(40,30,20,.35)'; line(g, [x + .1, y + h - .03, x + w - .1, y + h - .03]); line(g, [x + w - .03, y + .1, x + w - .03, y + h - .1]);
      g.strokeStyle = 'rgba(40,32,24,.6)'; g.lineWidth = .022; rr(g, x, y, w, h, .12); g.stroke();
    }
    function hazard(g, x, y, w, h, a = 1) {                 // yellow and black stripes
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = `rgba(240,192,52,${a})`; g.fillRect(x, y, w, h); g.fillStyle = `rgba(40,34,28,${a})`;
      for (let k = -h; k < w + h; k += .16) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + .08, y + h); g.lineTo(x + k + .08 + h, y); g.lineTo(x + k + h, y); g.fill(); }
      g.restore();
    }
    function lamp(g, x, y, col, r = .045) { const gr = g.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, col); gr.addColorStop(.3, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 3, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * .25, y - r * .25, r * .45, 0, 7); g.fill(); }
    // a block on footprint (x, y, w, h): the roof covers the top, the front wall (height z) shows at the bottom
    function block(g, x, y, w, h, z, F, o = {}) {
      const roof = o.roof || mix(F.col, '#e8e0d0', .12), wall = o.wall || mix(F.dk, '#3a3028', .35), rh = h - z;
      g.fillStyle = 'rgba(20,14,8,.3)'; g.fillRect(x - .02, y + h - .03, w + .04, .07);
      const wg = g.createLinearGradient(0, y + rh, 0, y + h); wg.addColorStop(0, mix(wall, '#ffffff', .1)); wg.addColorStop(1, mix(wall, '#000000', .3));
      g.fillStyle = wg; g.fillRect(x, y + rh, w, z);
      g.fillStyle = 'rgba(255,255,255,.08)'; for (let k = x + .2; k < x + w - .05; k += .3) g.fillRect(k, y + rh + .02, .015, z - .04);
      if (o.pitch) {                                            // a pitched roof: lit left half, shaded right half
        g.fillStyle = mix(roof, '#ffffff', .2); g.beginPath(); g.moveTo(x, y + rh); g.lineTo(x, y + rh * .35); g.lineTo(x + w / 2, y); g.lineTo(x + w / 2, y + rh); g.closePath(); g.fill();
        g.fillStyle = mix(roof, '#000000', .16); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w, y + rh * .35); g.lineTo(x + w, y + rh); g.lineTo(x + w / 2, y + rh); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = .02; for (let k = .12; k < 1; k += .12) { line(g, [x, y + rh * (.35 + .65 * k), x + w / 2, y + rh * k]); line(g, [x + w / 2, y + rh * k, x + w, y + rh * (.35 + .65 * k)]); }
        g.strokeStyle = mix(roof, '#ffffff', .5); g.lineWidth = .04; line(g, [x + w / 2, y + .01, x + w / 2, y + rh]);
        g.strokeStyle = 'rgba(30,20,12,.6)'; g.lineWidth = .025; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + rh * .35); g.lineTo(x + w / 2, y); g.lineTo(x + w, y + rh * .35); g.lineTo(x + w, y + h); g.closePath(); g.stroke();
      } else {
        const rg = g.createLinearGradient(x, y, x + w * .35, y + rh); rg.addColorStop(0, mix(roof, '#ffffff', .25)); rg.addColorStop(1, mix(roof, '#000000', .1));
        g.fillStyle = rg; g.fillRect(x, y, w, rh);
        if (o.ribs) { g.save(); g.beginPath(); g.rect(x, y, w, rh); g.clip(); for (let k = x + o.ribs * .3; k < x + w; k += o.ribs) { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(k, y, o.ribs * .3, rh); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(k + o.ribs * .3, y, o.ribs * .1, rh); } g.restore(); }
        if (o.saw) { g.save(); g.beginPath(); g.rect(x, y, w, rh); g.clip(); for (let j = y + .12; j < y + rh - .1; j += o.saw) { const sg = g.createLinearGradient(0, j, 0, j + o.saw * .45); sg.addColorStop(0, '#d8ecff'); sg.addColorStop(1, '#5a86b8'); g.fillStyle = sg; g.fillRect(x + .1, j, w - .2, o.saw * .4); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + .1, j + o.saw * .4, w - .2, o.saw * .12); g.strokeStyle = 'rgba(40,60,90,.5)'; g.lineWidth = .015; for (let k = x + .3; k < x + w - .1; k += .3) line(g, [k, j, k, j + o.saw * .4]); } g.restore(); }
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .035; line(g, [x + .02, y + .02, x + w - .02, y + .02]); line(g, [x + .02, y + .02, x + .02, y + rh - .02]);
        g.strokeStyle = 'rgba(30,20,12,.6)'; g.lineWidth = .025; g.strokeRect(x, y, w, h);
      }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y + rh, w, .035);
      return y + rh;                                            // top of the wall
    }
    function windows(g, x, y, w, h, n, R) { const s = w / n; for (let k = 0; k < n; k++) { const lit = R ? R() < .6 : k % 2 === 0, wx = x + k * s + s * .2; g.fillStyle = '#1e2430'; g.fillRect(wx, y, s * .6, h); if (lit) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff2b8'); gr.addColorStop(1, '#f0a040'); g.fillStyle = gr; g.fillRect(wx + .015, y + .015, s * .6 - .03, h - .03); } else { g.fillStyle = 'rgba(140,180,230,.35)'; g.fillRect(wx + .015, y + .015, s * .25, h * .35); } } }
    function cyl(g, cx, cy, r, z, col) {                        // an upright cylinder: (cx, cy) is the centre of its top
      const ry = r * .82, bg = g.createLinearGradient(cx - r, 0, cx + r, 0); bg.addColorStop(0, mix(col, '#ffffff', .3)); bg.addColorStop(.45, col); bg.addColorStop(1, mix(col, '#000000', .4));
      g.fillStyle = 'rgba(20,14,8,.28)'; g.beginPath(); g.ellipse(cx + .05, cy + z + .04, r * 1.02, ry, 0, 0, 7); g.fill();
      g.fillStyle = bg; g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx - r, cy + z); g.ellipse(cx, cy + z, r, ry, 0, Math.PI, 0, true); g.lineTo(cx + r, cy); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(30,20,12,.55)'; g.lineWidth = .022; g.stroke();
    }
    function cap(g, cx, cy, r, c1, c2) { const ry = r * .82, gr = g.createRadialGradient(cx - r * .35, cy - ry * .4, r * .05, cx, cy, r); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, r, ry, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(30,20,12,.5)'; g.lineWidth = .022; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .03; g.beginPath(); g.ellipse(cx, cy, r * .9, ry * .88, 0, 3.4, 4.8); g.stroke(); }
    function pipe(g, pts, w = .08, col = '#8e8a82') { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(20,14,8,.3)'; g.lineWidth = w; g.save(); g.translate(.03, .04); line(g, pts); g.restore(); g.strokeStyle = mix(col, '#000000', .3); g.lineWidth = w; line(g, pts); g.strokeStyle = col; g.lineWidth = w * .7; line(g, pts); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = w * .22; g.save(); g.translate(-w * .15, -w * .15); line(g, pts); g.restore(); g.lineCap = 'butt'; g.lineJoin = 'miter'; }
    function plate(g, F, x, y, r) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + .02, y + .03, r * 1.12, 0, 7); g.fill(); const gr = g.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r * 1.1); gr.addColorStop(0, mix(F.dk, '#ffffff', .25)); gr.addColorStop(1, F.dk); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 1.08, 0, 7); g.fill(); emblem(g, F.emb, x, y, r * .82, F.c2, F.dk); }
    function lattice(g, a, b, w) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L * w / 2, ny = dx / L * w / 2;
      g.strokeStyle = 'rgba(20,14,8,.3)'; g.lineWidth = w * .9; g.save(); g.translate(.05, .06); line(g, [a[0], a[1], b[0], b[1]]); g.restore();
      g.strokeStyle = '#a07818'; g.lineWidth = .03; line(g, [a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny]); line(g, [a[0] - nx, a[1] - ny, b[0] - nx, b[1] - ny]);
      g.strokeStyle = '#f0c040'; g.lineWidth = .022; const n = Math.max(2, Math.round(L / (w * 1.1))); g.beginPath(); for (let k = 0; k <= n; k++) { const t = k / n, s = k % 2 ? 1 : -1; g.lineTo(a[0] + dx * t + nx * s, a[1] + dy * t + ny * s); } g.stroke();
      g.strokeStyle = '#ffe27a'; g.lineWidth = .018; line(g, [a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny]); }
    const BDRAW = {
      bouw: (g, F) => {
        pad(g, .08, .1, 2.84, 2.8, 11);
        g.fillStyle = '#6e6a62'; rr(g, .2, 2.28, 2.6, .52, .06); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(.2, 2.28, 2.6, .05);
        g.fillStyle = '#f0c040'; for (let k = 0; k < 7; k++) g.fillRect(.32 + k * .36, 2.5, .18, .08);
        const wy = block(g, .22, .24, 2.06, 1.95, .44, F, { ribs: .34 });
        plate(g, F, 1.2, .82, .4);
        g.fillStyle = '#2a2622'; g.fillRect(.84, wy + .05, .8, .39); hazard(g, .84, wy + .05, .8, .06); g.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 1; k < 5; k++) g.fillRect(.84, wy + .1 + k * .065, .8, .015);
        windows(g, .3, wy + .12, .46, .16, 2); windows(g, 1.72, wy + .12, .5, .16, 2);
        cyl(g, 2.58, 2.0, .18, .1, '#8a857c'); cap(g, 2.58, 2.0, .18, '#c8c2b6', '#7a756c');
        lattice(g, [2.58, 1.98], [2.58, .42], .16); lattice(g, [2.58, .42], [1.5, .2], .14);
        g.strokeStyle = '#3c3a38'; g.lineWidth = .02; line(g, [1.62, .23, 1.62, .62]); g.fillStyle = '#3c3a38'; g.fillRect(1.56, .6, .12, .08);
        lamp(g, 2.58, .4, 'rgba(255,80,60,.9)'); lamp(g, .34, .34, 'rgba(120,255,140,.8)', .035);
      },
      cent: (g, F) => {
        pad(g, .06, .08, 1.88, 1.86, 22);
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
          const x = .14 + i * .42, y = .16 + j * .5;
          g.fillStyle = 'rgba(20,14,8,.3)'; g.fillRect(x + .04, y + .05, .38, .44);
          g.fillStyle = '#4a4e56'; g.fillRect(x, y, .38, .44);
          const gr = g.createLinearGradient(x, y, x + .3, y + .44); gr.addColorStop(0, '#4a7cc8'); gr.addColorStop(.5, '#1e3d78'); gr.addColorStop(1, '#16305e'); g.fillStyle = gr; g.fillRect(x + .025, y + .025, .33, .39);
          g.strokeStyle = 'rgba(170,210,255,.35)'; g.lineWidth = .012; for (let k = 1; k < 3; k++) line(g, [x + .025 + k * .11, y + .025, x + .025 + k * .11, y + .415]); for (let k = 1; k < 4; k++) line(g, [x + .025, y + .025 + k * .0975, x + .355, y + .025 + k * .0975]);
          g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(x + .03, y + .03); g.lineTo(x + .16, y + .03); g.lineTo(x + .03, y + .2); g.fill();
        }
        cyl(g, 1.42, .98, .45, .3, mix(F.col, '#a09a90', .25));
        g.fillStyle = F.c2; g.fillRect(.97, 1.02, .9, .07);
        cap(g, 1.42, .98, .45, mix(F.col, '#ffffff', .35), F.col);
        const gr = g.createRadialGradient(1.42, .98, .05, 1.42, .98, .36); gr.addColorStop(0, '#151412'); gr.addColorStop(1, '#3e3a36'); g.fillStyle = gr; g.beginPath(); g.ellipse(1.42, .98, .35, .3, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(200,196,188,.35)'; g.lineWidth = .015; for (const r of [.2, .28]) { g.beginPath(); g.ellipse(1.42, .98, r, r * .86, 0, 0, 7); g.stroke(); }
        block(g, 1.06, 1.46, .74, .4, .14, F, { roof: '#9a958c', wall: '#5a5650' });
        g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(1.45, 1.5); g.lineTo(1.37, 1.62); g.lineTo(1.43, 1.62); g.lineTo(1.39, 1.71); g.lineTo(1.49, 1.58); g.lineTo(1.43, 1.58); g.closePath(); g.fill();
        lamp(g, 1.72, 1.55, 'rgba(120,255,140,.9)', .03);
        pipe(g, [.98, 1.7, 1.06, 1.7], .05, '#6a665e');
      },
      raff: (g, F) => {
        pad(g, .06, .08, 2.88, 1.84, 33);
        pipe(g, [1.62, .95, 1.9, .95], .1); pipe(g, [1.62, .6, 1.85, .6], .07, '#a09a8e');
        const wy = block(g, .14, .16, 1.5, 1.3, .34, F, { ribs: .26 });
        plate(g, F, .55, .62, .22);
        windows(g, .22, wy + .1, .6, .14, 3); g.fillStyle = '#2a2622'; g.fillRect(1.0, wy + .04, .5, .3);
        cyl(g, 2.3, .86, .56, .22, '#8a847a'); cap(g, 2.3, .86, .56, '#c4beb2', '#7e786e');
        const cg = g.createRadialGradient(2.2, .66, .04, 2.3, .8, .48); cg.addColorStop(0, '#fff3c0'); cg.addColorStop(.35, '#ffa040'); cg.addColorStop(.72, '#4ab0ff'); cg.addColorStop(1, '#1e4a7a'); g.fillStyle = cg; g.beginPath(); g.arc(2.3, .8, .45, 0, 7); g.fill();
        g.strokeStyle = 'rgba(40,30,20,.6)'; g.lineWidth = .03; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(2.14, .62, .14, .07, -.6, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .02; for (const a of [0, 1.05, 2.1]) { g.beginPath(); g.ellipse(2.3, .8, .45, .45 * Math.abs(Math.cos(a)) + .02, Math.PI / 2, 0, 7); g.stroke(); }
        g.fillStyle = '#3a3530'; rr(g, 1.0, 1.5, 1.0, .4, .04); g.fill(); hazard(g, 1.0, 1.5, 1.0, .05); hazard(g, 1.0, 1.85, 1.0, .05);
        g.fillStyle = '#f0c040'; for (let k = 0; k < 3; k++) { const x = 1.14 + k * .28; g.beginPath(); g.moveTo(x, 1.58); g.lineTo(x + .13, 1.7); g.lineTo(x, 1.82); g.lineTo(x + .07, 1.82); g.lineTo(x + .2, 1.7); g.lineTo(x + .07, 1.58); g.fill(); }
        lamp(g, 2.82, 1.78, 'rgba(255,200,80,.9)', .035); lamp(g, .2, 1.78, 'rgba(255,200,80,.9)', .035);
      },
      silo: (g, F) => {
        pad(g, .06, .08, 1.88, 1.86, 44);
        pipe(g, [.55, .62, 1.45, .62], .07); pipe(g, [.55, 1.42, 1.45, 1.42], .07); pipe(g, [1, .62, 1, 1.42], .07);
        for (const [x, y] of [[.55, .48], [1.45, .48], [.55, 1.28], [1.45, 1.28]]) {
          cyl(g, x, y, .34, .2, '#b4aea2'); g.fillStyle = F.col; g.fillRect(x - .34, y + .1, .68, .07); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - .34, y + .16, .68, .015);
          cap(g, x, y, .34, '#f6f3ec', '#a8a296'); g.fillStyle = '#7a756c'; g.beginPath(); g.ellipse(x + .06, y - .02, .08, .065, 0, 0, 7); g.fill(); g.fillStyle = F.dk; g.beginPath(); g.ellipse(x + .06, y - .03, .05, .04, 0, 0, 7); g.fill();
        }
      },
      kaz: (g, F) => {
        pad(g, .06, .08, 1.88, 1.86, 55);
        const wy = block(g, .16, .18, 1.68, 1.22, .32, F, { pitch: 1 });
        g.fillStyle = '#2c2420'; rr(g, .82, wy + .06, .36, .26, .03); g.fill(); g.fillStyle = 'rgba(255,220,150,.25)'; g.fillRect(.86, wy + .1, .12, .2);
        windows(g, .26, wy + .08, .5, .13, 2); windows(g, 1.24, wy + .08, .5, .13, 2);
        for (const [x0, n] of [[.18, 5], [1.24, 5]]) for (let k = 0; k < n; k++) { const x = x0 + k * .12; g.fillStyle = 'rgba(20,14,8,.25)'; g.beginPath(); g.ellipse(x + .02, 1.72, .075, .055, 0, 0, 7); g.fill(); const gr = g.createLinearGradient(0, 1.62, 0, 1.74); gr.addColorStop(0, '#e2cfa2'); gr.addColorStop(1, '#a8925e'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, 1.68, .075, .055, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(80,60,30,.5)'; g.lineWidth = .012; g.stroke(); }
        g.strokeStyle = '#5a554e'; g.lineWidth = .035; line(g, [1.0, 1.56, 1.0, 1.84]); g.fillStyle = F.col; g.beginPath(); g.moveTo(1.02, 1.56); g.lineTo(1.3, 1.6); g.lineTo(1.02, 1.68); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = .012; g.stroke();
        plate(g, F, 1.0, .62, .17);
      },
      fab: (g, F) => {
        pad(g, .06, .08, 2.88, 2.86, 66);
        g.fillStyle = '#7a756c'; g.fillRect(.86, 2.15, 1.28, .76); hazard(g, .86, 2.15, .07, .76); hazard(g, 2.07, 2.15, .07, .76);
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 5; k++) g.fillRect(.95, 2.24 + k * .14, 1.1, .03);
        const wy = block(g, .14, .2, 2.72, 1.95, .45, F, { saw: .42 });
        g.fillStyle = '#26221e'; g.fillRect(.92, wy + .04, 1.16, .41);
        g.fillStyle = 'rgba(255,255,255,.1)'; for (let k = 0; k < 6; k++) g.fillRect(.92, wy + .07 + k * .065, 1.16, .02);
        hazard(g, .92, wy + .04, 1.16, .05);
        windows(g, .22, wy + .13, .6, .15, 2); windows(g, 2.16, wy + .13, .6, .15, 2);
        plate(g, F, 2.42, .52, .24);
        for (const x of [.42, .76]) { cyl(g, x, .44, .1, .06, '#77726a'); cap(g, x, .44, .1, '#b4aea4', '#5e5a54'); }
        lamp(g, .9, 2.12, 'rgba(255,190,60,.95)', .035); lamp(g, 2.1, 2.12, 'rgba(255,190,60,.95)', .035);
      },
      radar: (g, F) => {
        pad(g, .06, .08, 1.88, 1.86, 77);
        const wy = block(g, .3, .52, 1.4, 1.24, .3, F, { ribs: .23 });
        windows(g, .4, wy + .08, 1.2, .14, 4);
        cyl(g, 1, .9, .2, .12, '#6a665e'); cap(g, 1, .9, .2, '#a6a198', '#5a5650');
        g.strokeStyle = '#4a4744'; g.lineWidth = .03; line(g, [.42, .62, .42, .28]); line(g, [.34, .36, .5, .36]); lamp(g, .42, .26, 'rgba(255,80,60,.9)', .035);
        block(g, 1.5, .2, .34, .3, .1, F, { roof: '#9a958c', wall: '#5a5650' });
      },
      rep: (g, F) => {
        pad(g, .06, .08, 2.88, 1.84, 88);
        g.fillStyle = '#5c5850'; g.fillRect(.95, .26, 1.1, 1.64);
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = .02; for (let k = 0; k < 11; k++) line(g, [.95, .32 + k * .145, 2.05, .32 + k * .145]);
        g.strokeStyle = '#f0c040'; g.lineWidth = .06; g.strokeRect(1.04, .36, .92, 1.44);
        g.save(); g.translate(1.5, 1.1); g.rotate(-.7); g.globalAlpha = .7; g.fillStyle = '#dcd8d0'; g.fillRect(-.06, -.32, .12, .52); g.beginPath(); g.arc(0, -.36, .16, 0, 7); g.fill(); g.fillStyle = '#5c5850'; g.fillRect(-.05, -.58, .1, .2); g.restore();
        const w1 = block(g, .12, .28, .76, 1.3, .32, F, { ribs: .25 }), w2 = block(g, 2.12, .28, .76, 1.3, .32, F, { ribs: .25 });
        windows(g, .16, w1 + .09, .68, .13, 2); windows(g, 2.16, w2 + .09, .68, .13, 2);
        lattice(g, [.5, .3], [2.5, .3], .14);
        g.fillStyle = '#3c3a38'; g.fillRect(1.44, .34, .12, .1); g.strokeStyle = '#3c3a38'; g.lineWidth = .02; line(g, [1.5, .44, 1.5, .7]);
        pipe(g, [.88, 1.7, .98, 1.7, .98, 1.86], .05, '#4a8a4a'); lamp(g, 1.0, 1.84, 'rgba(120,255,140,.9)', .03);
      },
      toren: (g, F) => {
        g.fillStyle = 'rgba(20,14,8,.3)'; oct(g, .55, .6, .47); g.fill();
        const gr = g.createLinearGradient(.1, .1, .8, .9); gr.addColorStop(0, '#c4beb2'); gr.addColorStop(1, '#8a847a'); g.fillStyle = gr; oct(g, .5, .52, .46); g.fill(); g.strokeStyle = 'rgba(40,30,20,.6)'; g.lineWidth = .022; g.stroke();
        g.fillStyle = '#6a655c'; oct(g, .5, .6, .36); g.fill(); g.fillStyle = mix(F.col, '#808080', .2); oct(g, .5, .5, .35); g.fill();
        g.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; g.beginPath(); g.arc(.5 + Math.cos(a) * .4, .52 + Math.sin(a) * .4, .025, 0, 7); g.fill(); }
      },
      rpaal: (g, F) => {
        g.fillStyle = 'rgba(20,14,8,.3)'; rr(g, .14, .18, .82, .82, .12); g.fill();
        const wy = block(g, .1, .1, .8, .82, .16, F, { roof: '#aaa498', wall: '#6a665e' });
        g.fillStyle = F.col; g.fillRect(.1, wy - .1, .8, .08); hazard(g, .12, wy + .03, .76, .05, .8);
      },
    };
    function oct(g, cx, cy, r) { g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }
    const BHEAD = {                                         // rotating heads of towers (facing +x)
      toren: (g, F) => {
        g.fillStyle = '#2e2b28'; g.fillRect(.08, -.06, .46, .12); g.fillStyle = '#56524c'; g.fillRect(.08, -.04, .46, .04); g.fillStyle = '#1e1c1a'; g.fillRect(.5, -.075, .08, .15);
        const gr = g.createRadialGradient(-.07, -.07, .02, 0, 0, .25); gr.addColorStop(0, mix(F.col, '#ffffff', .45)); gr.addColorStop(1, F.dk); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .23, 0, 7); g.fill(); g.strokeStyle = 'rgba(20,14,8,.6)'; g.lineWidth = .022; g.stroke();
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(-.06, 0, .07, 0, 7); g.fill();
      },
      rpaal: (g, F) => {
        const gr = g.createLinearGradient(-.2, -.24, .2, .24); gr.addColorStop(0, '#8a857c'); gr.addColorStop(1, '#45413c'); g.fillStyle = gr; rr(g, -.22, -.25, .46, .5, .06); g.fill(); g.strokeStyle = 'rgba(20,14,8,.6)'; g.lineWidth = .022; g.stroke();
        for (const y of [-.12, .12]) { g.fillStyle = '#26241f'; g.beginPath(); g.arc(.15, y, .08, 0, 7); g.fill(); g.fillStyle = '#e8e4dc'; g.beginPath(); g.arc(.16, y, .045, 0, 7); g.fill(); g.fillStyle = '#c03a2a'; g.beginPath(); g.arc(.17, y, .02, 0, 7); g.fill(); }
        g.fillStyle = F.col; g.fillRect(-.22, -.25, .1, .5);
      },
    };
    function buildings(fi) {
      const F = FACTIONS[fi], out = {}, K = BPX;
      for (const t in BDRAW) {
        const T = BT[t], c = mk(T.w * K + K * .2, T.h * K + K * .2), g = c.getContext('2d'); c.res = K / PX;
        g.save(); g.translate(K * .1, K * .1); g.scale(K, K);
        g.save(); g.translate(.07, .09); g.filter = `blur(${K * .05}px)`; g.globalAlpha = .4; g.fillStyle = '#000'; rr(g, .04, .04, T.w - .06, T.h - .04, .15); g.fill(); g.restore();
        BDRAW[t](g, F); g.restore();
        out[t] = c;
      }
      for (const t in BHEAD) {
        const box = Math.ceil(K * 1.1), c = mk(box * DIRS, box), g = c.getContext('2d'); c.res = K / PX;
        for (let d = 0; d < DIRS; d++) {
          g.save(); g.translate(d * box + box / 2 + K * .04, box / 2 + K * .05); g.scale(K, K); g.rotate(d / DIRS * Math.PI * 2); g.globalAlpha = .3; BHEAD[t](g, Object.assign({}, F, { col: '#000', dk: '#000' })); g.restore();
          g.save(); g.translate(d * box + box / 2, box / 2); g.scale(K, K); g.rotate(d / DIRS * Math.PI * 2); BHEAD[t](g, F); g.restore();
        }
        out[t + 'H'] = { c, box };
      }
      // radar dish (drawn rotating)
      { const box = Math.ceil(K * 1.2), c = mk(box, box), g = c.getContext('2d'); c.res = K / PX; g.translate(box / 2, box / 2); g.scale(K, K);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(.04, .05, .17, .47, 0, 0, 7); g.fill();
        const gr = g.createLinearGradient(-.16, 0, .16, 0); gr.addColorStop(0, '#fbf8f0'); gr.addColorStop(1, '#a8a296'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, .16, .46, 0, 0, 7); g.fill(); g.strokeStyle = '#6a655c'; g.lineWidth = .025; g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = .015; for (const r of [.15, .3]) { g.beginPath(); g.ellipse(0, 0, r * .33, r, 0, 0, 7); g.stroke(); }
        g.strokeStyle = '#5a5650'; g.lineWidth = .025; line(g, [0, -.4, .28, 0, 0, .4]); g.fillStyle = F.col; g.fillRect(-.04, -.04, .3, .08); g.beginPath(); g.arc(.28, 0, .055, 0, 7); g.fill(); out.dish = c; }
      // power plant fan
      { const box = Math.ceil(K * .8), c = mk(box, box), g = c.getContext('2d'); c.res = K / PX; g.translate(box / 2, box / 2); g.scale(K, K);
        for (let k = 0; k < 5; k++) { g.rotate(Math.PI * 2 / 5); const gr = g.createLinearGradient(0, -.06, 0, .06); gr.addColorStop(0, '#e4e0d8'); gr.addColorStop(1, '#8e8a82'); g.fillStyle = gr; g.beginPath(); g.ellipse(.15, 0, .15, .055, .35, 0, 7); g.fill(); }
        g.fillStyle = '#4a4640'; g.beginPath(); g.arc(0, 0, .065, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(-.02, -.02, .025, 0, 7); g.fill(); out.fan = c; }
      return out;
    }
    function buildingIcon(blds, t, size) {
      const c = mk(size, size), g = c.getContext('2d');
      if (t === 'plaat') { const s = size * .72, x = size * .14; g.save(); g.translate(x, x); g.scale(s / 2, s / 2); pad(g, 0, 0, 2, 2, 5); g.restore(); return c; }
      const src = blds[t]; const s = Math.min(size / src.width, size / src.height) * .96; g.imageSmoothingQuality = 'high'; g.drawImage(src, (size - src.width * s) / 2, (size - src.height * s) / 2, src.width * s, src.height * s);
      const K = src.res ? BPX : PX, ox = (size - src.width * s) / 2, oy = (size - src.height * s) / 2, at = (x, y) => [ox + (x + .1) * K * s, oy + (y + .1) * K * s];
      if (BHEAD[t]) { const H = blds[t + 'H'], [x, y] = at(.5, .45); g.drawImage(H.c, 2 * H.box, 0, H.box, H.box, x - H.box * s / 2, y - H.box * s / 2, H.box * s, H.box * s); }
      if (t === 'radar') { const d = blds.dish, q = d.width * s, [x, y] = at(1, .9); g.drawImage(d, x - q / 2, y - q / 2, q, q); }
      if (t === 'cent') { const d = blds.fan, q = d.width * s, [x, y] = at(1.42, .98); g.drawImage(d, x - q / 2, y - q / 2, q, q); }
      return c;
    }

    /* ---------- crystal fields: glowing orange-blue clusters, four sizes, a few variants ---------- */
    function crystals() {
      const out = [], S1 = Math.ceil(PX * 1.3);
      for (let lv = 1; lv <= 4; lv++) for (let v = 0; v < 4; v++) {
        const c = mk(S1, S1), g = c.getContext('2d'), R = rng(lv * 31 + v * 7 + 3), n = [0, 3, 5, 7, 9][lv];
        g.translate(S1 / 2, S1 / 2);
        const gl = g.createRadialGradient(0, 0, 0, 0, 0, S1 * .5); gl.addColorStop(0, `rgba(255,160,60,${.2 + lv * .08})`); gl.addColorStop(.55, `rgba(90,170,255,${.08 + lv * .05})`); gl.addColorStop(1, 'rgba(90,170,255,0)'); g.fillStyle = gl; g.fillRect(-S1 / 2, -S1 / 2, S1, S1);
        const items = []; for (let k = 0; k < n; k++) items.push({ x: (R() - .5) * PX * .8, y: (R() - .5) * PX * .7 + PX * .12, h: PX * (.2 + R() * .2 + lv * .05), w: PX * (.08 + R() * .06 + lv * .01), a: (R() - .5) * .9 });
        items.sort((a, b) => a.y - b.y);
        for (const it of items) {
          g.save(); g.translate(it.x, it.y); g.rotate(it.a);
          g.fillStyle = 'rgba(60,40,20,.3)'; g.beginPath(); g.ellipse(it.w * .4, it.w * .5, it.w * 1.1, it.w * .5, 0, 0, 7); g.fill();
          const gr = g.createLinearGradient(0, -it.h, 0, 0); gr.addColorStop(0, '#d8f2ff'); gr.addColorStop(.3, '#58b4ff'); gr.addColorStop(.65, '#ff9a3a'); gr.addColorStop(1, '#c8561a');
          g.fillStyle = gr; g.beginPath(); g.moveTo(-it.w, 0); g.lineTo(-it.w, -it.h * .75); g.lineTo(0, -it.h); g.lineTo(it.w, -it.h * .75); g.lineTo(it.w, 0); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(-it.w * .6, -it.h * .1); g.lineTo(-it.w * .6, -it.h * .72); g.lineTo(-it.w * .1, -it.h * .9); g.lineTo(-it.w * .1, -it.h * .2); g.closePath(); g.fill();
          g.restore();
        }
        out.push(c);
      }
      return { list: out, size: S1 };
    }

    /* ---------- effect sprites ---------- */
    function glow(size, inner, outer) { const c = mk(size, size), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gr.addColorStop(0, inner); gr.addColorStop(.35, outer); gr.addColorStop(1, outer.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; }
    function puff(size, col) { const c = mk(size, size), g = c.getContext('2d'), R = rng(size * 13 + 1); for (let k = 0; k < 7; k++) { const x = size / 2 + (R() - .5) * size * .35, y = size / 2 + (R() - .5) * size * .35, r = size * (.18 + R() * .14); const gr = g.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } return c; }
    function wreck(fi, big) {
      const s = Math.ceil(PX * (big ? 1.5 : 1.1)), c = mk(s, s), g = c.getContext('2d'), R = rng(fi * 7 + (big ? 3 : 1));
      g.translate(s / 2, s / 2); const gr = g.createRadialGradient(0, 0, 0, 0, 0, s / 2); gr.addColorStop(0, 'rgba(40,30,24,.5)'); gr.addColorStop(1, 'rgba(40,30,24,0)'); g.fillStyle = gr; g.fillRect(-s / 2, -s / 2, s, s);
      for (let k = 0; k < (big ? 9 : 6); k++) { g.save(); g.translate((R() - .5) * s * .45, (R() - .5) * s * .45); g.rotate(R() * 6); g.fillStyle = k % 3 ? '#4a4540' : mix(FACTIONS[fi].dk, '#303030', .4); g.fillRect(-s * .08, -s * .04, s * (.1 + R() * .12), s * (.05 + R() * .06)); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-s * .08, -s * .04, s * .1, s * .015); g.restore(); }
      return c;
    }
    function fx() {
      return {
        flash: glow(48, 'rgba(255,250,220,1)', 'rgba(255,190,80,.55)'),
        fire: glow(64, 'rgba(255,240,180,1)', 'rgba(255,120,30,.6)'),
        blue: glow(48, 'rgba(240,250,255,1)', 'rgba(90,170,255,.55)'),
        gold: glow(48, 'rgba(255,255,230,1)', 'rgba(255,200,60,.55)'),
        smoke: puff(64, ['rgba(120,112,104,.75)', 'rgba(90,84,78,0)']),
        dark: puff(64, ['rgba(70,64,60,.8)', 'rgba(50,46,44,0)']),
        dust: puff(48, ['rgba(226,192,140,.8)', 'rgba(210,170,120,0)']),
        spark: glow(16, 'rgba(255,255,255,1)', 'rgba(255,220,120,.8)'),
        rocket: (() => { const c = mk(24, 10), g = c.getContext('2d'); g.fillStyle = '#e8e4da'; rr(g, 2, 3, 18, 4, 2); g.fill(); g.fillStyle = '#c03a2a'; g.fillRect(16, 3, 5, 4); g.fillStyle = '#6a665e'; g.fillRect(2, 1, 4, 8); return c; })(),
        shell: glow(16, 'rgba(255,255,230,1)', 'rgba(255,200,90,.8)'),
      };
    }
    return { PX, DIRS, CH, PXT, mk, hex, mix, rr, chunk, grain, stamp, emblem, emblemCanvas, sheet, unitIcon, buildings, buildingIcon, crystals, wreck, fx, BOX };
  })();

  /* ================= draw.js: camera, terrain layer, sprites, effects, fog of war, the minimap ================= */
  // Two canvases: the terrain layer (redrawn only when needed; panned and zoomed with a CSS transform in between) and the
  // main layer (units, buildings, effects, fog, overlays) drawn every frame in device pixels with sprites pre-scaled to the zoom.
  const Draw = (() => {
    const PX = Art.PX, PXT = Art.PXT, CH = Art.CH, DIRS = Art.DIRS, STEP_A = Math.PI * 2 / DIRS, BGM = 180;
    const lerpA = (a, b, t) => a + wrapA(b - a) * t;
    function create(cv, bgCv, fogCv, ovCv) {
      const g0 = cv.getContext('2d'), ov = ovCv.getContext('2d'), bgc = bgCv.getContext('2d', { alpha: false }); let g = g0, ovDrawn = false;
      const R = { dbg: {}, W: 0, H: 0, dpr: 1, cam: { x: 0, y: 0, z: 36 }, q: 0, S: null, chunks: [], cx: 0, cy: 0, sheets: {}, blds: {}, wrecks: {}, P: [], D: [], Z: [], stampQ: [], bgDirty: true, lastStamp: 0, fogV: -1, t: 0, zoomT: 0, lastZ: 0, bgT: 0 };
      const FX = Art.fx(), CRY = Art.crystals(), BGV = { x0: 0, y0: 0, z: 0, ok: false, tf: '' }, GRP = { p: null };
      let fog = null, fogc = null, fogImg = null;
      R.resize = (w, h, dpr) => { R.W = w; R.H = h; R.dpr = dpr; cv.width = ovCv.width = Math.round(w * dpr); cv.height = ovCv.height = Math.round(h * dpr); BGV.ok = false; ovDrawn = true; clamp(); };
      R.setQuality = q => { R.q = q; BGV.ok = false; };
      /* ----- a new match: chunks, sprites for the factions in it, fog ----- */
      R.setGame = (S, prepare) => {
        R.S = S; R.P.length = 0; R.D.length = 0; R.Z.length = 0; R.stampQ.length = 0;
        R.cx = Math.ceil(S.W / CH); R.cy = Math.ceil(S.H / CH); R.chunks = new Array(R.cx * R.cy).fill(null); R.sv = S.sv || 0; cryShadow = null;
        for (const P of S.P) { if (!R.sheets[P.fac]) R.sheets[P.fac] = Art.sheet(P.fac); if (!R.blds[P.fac]) { R.blds[P.fac] = Art.buildings(P.fac); R.blds[P.fac].wreck0 = Art.wreck(P.fac, 0); R.blds[P.fac].wreck1 = Art.wreck(P.fac, 1); } }
        fog = fogCv; fog.width = S.W + 2; fog.height = S.H + 2; fog.style.width = (S.W + 2) + 'px'; fog.style.height = (S.H + 2) + 'px'; fog.style.display = S.human >= 0 ? '' : 'none'; fogc = fog.getContext('2d'); fogImg = fogc.createImageData(S.W + 2, S.H + 2); R.fogV = -1; R.fogTf = '';
        mini0 = null; BGV.ok = false; SC.k = 0;
        if (prepare) for (let i = 0; i < R.chunks.length; i++) R.chunks[i] = Art.chunk(S, i % R.cx, (i / R.cx) | 0);
      };
      const chunkAt = i => R.chunks[i] || (R.chunks[i] = Art.chunk(R.S, i % R.cx, (i / R.cx) | 0));
      function redoSlabs() {                                  // slabs changed: redraw the affected chunks
        const S = R.S; if ((S.sv || 0) === R.sv) return; R.sv = S.sv || 0;
        for (let i = 0; i < R.chunks.length; i++) { const cx = i % R.cx, cy = (i / R.cx) | 0; let has = false; for (let y = cy * CH; y < Math.min(S.H, cy * CH + CH) && !has; y++) for (let x = cx * CH; x < Math.min(S.W, cx * CH + CH); x++) if (S.slab[y * S.W + x]) { has = true; break; } if (has) R.chunks[i] = null; }
        BGV.ok = false;
      }
      /* ----- camera ----- */
      function clamp() {
        const S = R.S; if (!S) return; const c = R.cam, vw = R.W / c.z, vh = R.H / c.z, m = 1.5;
        c.x = vw > S.W + m * 2 ? (S.W - vw) / 2 : Math.max(-m, Math.min(S.W + m - vw, c.x));
        c.y = vh > S.H + m * 2 ? (S.H - vh) / 2 : Math.max(-m, Math.min(S.H + m - vh, c.y));
      }
      R.clamp = clamp;
      R.zoomLimits = () => { const S = R.S, mn = S ? Math.max(14, Math.min(R.W / (S.W + 3), R.H / (S.H + 3))) : 14; return [mn, 72]; };
      R.center = (x, y) => { R.cam.x = x - R.W / R.cam.z / 2; R.cam.y = y - R.H / R.cam.z / 2; clamp(); };
      R.toWorld = (sx, sy) => ({ x: R.cam.x + sx / R.cam.z, y: R.cam.y + sy / R.cam.z });
      R.toScreen = (x, y) => ({ x: (x - R.cam.x) * R.cam.z, y: (y - R.cam.y) * R.cam.z });
      R.view = () => ({ x0: R.cam.x, y0: R.cam.y, x1: R.cam.x + R.W / R.cam.z, y1: R.cam.y + R.H / R.cam.z });
      /* ----- the terrain layer: chunks + crystal fields with a margin around the view ----- */
      function renderBg() {
        const S = R.S, c = R.cam, z = c.z, d = R.dpr, mt = BGM / z;
        const W = R.W + BGM * 2, H = R.H + BGM * 2, dw = Math.round(W * d), dh = Math.round(H * d);
        if (bgCv.width !== dw || bgCv.height !== dh) { bgCv.width = dw; bgCv.height = dh; bgCv.style.width = W + 'px'; bgCv.style.height = H + 'px'; }
        BGV.x0 = c.x - mt; BGV.y0 = c.y - mt; BGV.z = z; BGV.ok = true; BGV.tf = ''; R.bgT = performance.now(); R.bgDirty = false;
        bgc.setTransform(1, 0, 0, 1, 0, 0); bgc.fillStyle = '#1a120a'; bgc.fillRect(0, 0, dw, dh); bgc.imageSmoothingEnabled = true;
        const zz = z * d, x0w = BGV.x0, y0w = BGV.y0, x1w = x0w + W / z, y1w = y0w + H / z;
        const cx0 = Math.max(0, Math.floor(x0w / CH)), cx1 = Math.min(R.cx - 1, Math.floor(x1w / CH)), cy0 = Math.max(0, Math.floor(y0w / CH)), cy1 = Math.min(R.cy - 1, Math.floor(y1w / CH));
        for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const ch = chunkAt(cy * R.cx + cx), px = Math.floor((cx * CH - x0w) * zz), py = Math.floor((cy * CH - y0w) * zz); bgc.drawImage(ch, px, py, Math.ceil((cx * CH + ch.width / PXT - x0w) * zz) - px, Math.ceil((cy * CH + ch.height / PXT - y0w) * zz) - py); }
        if (R.q < 3 && zz > PXT * 1.15) { if (!GRP.p) GRP.p = bgc.createPattern(Art.grain(), 'repeat'); const m = v => ((Math.round(-v * zz) % 256) + 256) % 256; GRP.p.setTransform(new DOMMatrix([1, 0, 0, 1, m(x0w), m(y0w)])); bgc.globalAlpha = Math.min(1, (zz / PXT - 1.15) * 1.6); bgc.fillStyle = GRP.p; bgc.fillRect(0, 0, dw, dh); bgc.globalAlpha = 1; }
        const tx0 = Math.max(0, Math.floor(x0w - 1)), tx1 = Math.min(S.W - 1, Math.ceil(x1w)), ty0 = Math.max(0, Math.floor(y0w - 1)), ty1 = Math.min(S.H - 1, Math.ceil(y1w)), cs = CRY.size / PX * zz;
        for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
          const k = S.cry[y * S.W + x]; if (!k) continue;
          const lv = k > 180 ? 3 : k > 110 ? 2 : k > 50 ? 1 : 0, vv = (x * 7 + y * 13) & 3;
          bgc.drawImage(CRY.list[lv * 4 + vv], (x + .5 - x0w) * zz - cs / 2, (y + .5 - y0w) * zz - cs / 2, cs, cs);
        }
      }
      function placeBg() {                                    // CSS transform of the terrain layer for the current camera
        const c = R.cam, s = c.z / BGV.z, tx = (BGV.x0 - c.x) * c.z, ty = (BGV.y0 - c.y) * c.z;
        const tf = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`;
        if (tf !== BGV.tf) { BGV.tf = tf; bgCv.style.transform = tf; }
      }
      function needBg() {
        if (!BGV.ok) return true;
        const c = R.cam, now = performance.now(), s = c.z / BGV.z;
        if (Math.abs(s - 1) > .004 && (now - R.zoomT > 160 || Math.abs(s - 1) > .45)) return true;
        const v = R.view(), x1 = BGV.x0 + (R.W + BGM * 2) / BGV.z, y1 = BGV.y0 + (R.H + BGM * 2) / BGV.z;
        if (v.x0 < BGV.x0 || v.y0 < BGV.y0 || v.x1 > x1 || v.y1 > y1) return true;
        return R.bgDirty && now - R.bgT > 1200;
      }
      // crystal changes: only redraw when a tile in view changed its size class
      const lvOf = k => !k ? -1 : k > 180 ? 3 : k > 110 ? 2 : k > 50 ? 1 : 0;
      let cryShadow = null;
      function checkCrystals(S) {
        if (!cryShadow || cryShadow.length !== S.N) { cryShadow = new Int8Array(S.N); for (let i = 0; i < S.N; i++) cryShadow[i] = lvOf(S.cry[i]); }
        if (S.cdAll) { S.cdAll = 0; for (let i = 0; i < S.N; i++) cryShadow[i] = lvOf(S.cry[i]); R.bgDirty = true; mini0 = null; S.cd.length = 0; return; }
        if (!S.cd.length) return;
        const v = R.view();
        for (const i of S.cd) { const l = lvOf(S.cry[i]); if (l !== cryShadow[i]) { cryShadow[i] = l; const x = i % S.W, y = (i / S.W) | 0; if (x >= v.x0 - 3 && x <= v.x1 + 3 && y >= v.y0 - 3 && y <= v.y1 + 3) R.bgDirty = true; } }
        S.cd.length = 0;
      }
      /* ----- sprites pre-scaled to the zoom: every draw is a 1:1 copy at whole pixels ----- */
      const SC = { k: 0, sheets: {}, blds: {} };
      function scaleSprites(k) {
        SC.k = k; SC.sheets = {}; SC.blds = {};
        for (const f in R.sheets) {
          const sh = R.sheets[f], rows = Object.entries(sh.map); let W = 0, Hh = 0;
          const lay = rows.map(([key, m]) => { const sb = Math.max(2, Math.round(m.box * k)); const r = { key, m, sb, y: Hh }; Hh += sb; W = Math.max(W, sb * DIRS); return r; });
          const c = Art.mk(W, Hh), cg = c.getContext('2d'), map = {}; cg.imageSmoothingQuality = 'high';
          for (const r of lay) { cg.drawImage(sh.c, 0, r.m.y, r.m.box * DIRS, r.m.box, 0, r.y, r.sb * DIRS, r.sb); map[r.key] = { y: r.y, box: r.sb }; }
          SC.sheets[f] = { c, map };
          const B = R.blds[f], o = {};
          for (const t in B) {
            const s = B[t];
            if (s.c) { const kk = k / (s.c.res || 1), sb = Math.max(2, Math.round(s.box * kk)), c2 = Art.mk(sb * DIRS, sb), g2 = c2.getContext('2d'); g2.imageSmoothingQuality = 'high'; g2.drawImage(s.c, 0, 0, s.box * DIRS, s.box, 0, 0, sb * DIRS, sb); o[t] = { c: c2, box: sb }; }
            else { const kk = k / (s.res || 1), c2 = Art.mk(Math.max(2, Math.round(s.width * kk)), Math.max(2, Math.round(s.height * kk))); const g2 = c2.getContext('2d'); g2.imageSmoothingQuality = 'high'; g2.drawImage(s, 0, 0, c2.width, c2.height); o[t] = c2; }
          }
          SC.blds[f] = o;
        }
      }
      function ensureScaled() {
        const k = R.cam.z * R.dpr / PX;
        if (SC.k && Math.abs(k / SC.k - 1) < .02) return;
        if (SC.k && performance.now() - R.zoomT < 160) return;
        scaleSprites(k);
      }
      /* ----- fog of war: one pixel per tile, smoothed when drawn ----- */
      function updateFog(S) {
        if (S.fogV === R.fogV) return; R.fogV = S.fogV;
        const W2 = S.W + 2, D = fogImg.data;
        for (let y = 0; y < S.H + 2; y++) for (let x = 0; x < W2; x++) {
          const o = (y * W2 + x) * 4; let a = 255;
          if (x > 0 && y > 0 && x <= S.W && y <= S.H) { const i = (y - 1) * S.W + x - 1; a = S.vis[i] ? 0 : S.exp[i] ? 120 : 255; }
          D[o] = 24; D[o + 1] = 20; D[o + 2] = 30; D[o + 3] = a;
        }
        fogc.putImageData(fogImg, 0, 0);
      }
      const visAt = (S, x, y) => { if (S.human < 0) return true; const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < S.W && ty < S.H && S.vis[ty * S.W + tx] === 1; };
      const expAt = (S, x, y, w, h) => { if (S.human < 0) return true; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (S.exp[j * S.W + i]) return true; return false; };
      R.visAt = (x, y) => R.S && visAt(R.S, x, y);
      /* ----- particles ----- */
      const CAP = [400, 300, 200, 100, 60];
      function add(p) { if (R.P.length >= CAP[R.q]) { if (p.low) return; R.P.shift(); } p.t = 0; R.P.push(p); }
      const rnd2 = () => Math.random();
      function boom(x, y, s, dark) {
        add({ k: 'fire', x, y, s: s * 1.4, s1: s * 2.4, a: 1, life: .35, add: 1 });
        if (R.q < 3) add({ k: 'flash', x, y, s: s * 2.4, s1: s * 3, a: .6, life: .16, add: 1 });
        const n = Math.max(R.q > 3 ? 1 : 2, Math.round((R.q > 2 ? 2 : 5) * s));
        for (let k = 0; k < n; k++) { const a = rnd2() * 6.28, v = (.4 + rnd2() * .9) * s; add({ k: dark ? 'dark' : 'smoke', x: x + Math.cos(a) * .15 * s, y: y + Math.sin(a) * .15 * s, vx: Math.cos(a) * v * .6, vy: Math.sin(a) * v * .6 - .25, s: s * (.5 + rnd2() * .4), s1: s * (1.4 + rnd2()), a: .8, life: 1.1 + rnd2() * 1.1, drag: 1.8, low: 1 }); }
        for (let k = 0; k < (R.q > 2 ? 0 : 5); k++) { const a = rnd2() * 6.28, v = 1.5 + rnd2() * 2.5; add({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: .12, s1: .05, a: 1, life: .3 + rnd2() * .3, add: 1, drag: 2, low: 1 }); }
      }
      function dust(x, y, s, n = 4) { if (R.q > 2) n = Math.ceil(n / 2); for (let k = 0; k < n; k++) { const a = rnd2() * 6.28, v = (.3 + rnd2() * .7) * s; add({ k: 'dust', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: s * .5, s1: s * 1.3, a: .7, life: .7 + rnd2() * .6, drag: 2.5, low: 1 }); } }
      R.event = (e, S) => {
        const v = R.view(), near = (x, y, m = 3) => x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m;
        switch (e.t) {
          case 'fire': {
            if (!near(e.x, e.y) || !visAt(S, e.x, e.y)) return;
            if (e.wt === 'kogel') { R.Z.push({ k: 'tr', x: e.x, y: e.y, tx: e.tx, ty: e.ty, t: 0, life: .09 }); if (R.q < 3) add({ k: 'flash', x: e.x, y: e.y, s: e.inf ? .28 : .36, s1: .2, a: .9, life: .07, add: 1, low: 1 }); }
            else { const m = { x: e.x + Math.cos(e.a) * (e.r || .4) * 1.5, y: e.y + Math.sin(e.a) * (e.r || .4) * 1.5 }; add({ k: e.wt === 'raket' ? 'fire' : 'flash', x: m.x, y: m.y, s: e.wt === 'granaat' ? .7 : .55, s1: .3, a: 1, life: .1, add: 1 }); if (R.q < 3) add({ k: 'smoke', x: m.x, y: m.y, vx: Math.cos(e.a) * .5, vy: Math.sin(e.a) * .5 - .1, s: .25, s1: .7, a: .5, life: .8, drag: 2, low: 1 }); }
            return;
          }
          case 'imp': if (!near(e.x, e.y)) return; if (e.wt === 'granaat') { boom(e.x, e.y, .9); dust(e.x, e.y, 1.1, 6); } else if (e.wt === 'raket') boom(e.x, e.y, .55); else boom(e.x, e.y, .38); return;
          case 'die': if (!near(e.x, e.y)) return; if (e.inf) { dust(e.x, e.y, .6, 5); add({ k: 'smoke', x: e.x, y: e.y, vy: -.3, s: .3, s1: .9, a: .7, life: 1.1 }); } else { boom(e.x, e.y, UT[e.u].r * 2.2, true); R.D.push({ f: S.P[e.o].fac, big: UT[e.u].r > .5 ? 1 : 0, x: e.x, y: e.y, t: 0, life: R.q > 2 ? 8 : 16, smoke: R.q > 2 ? 0 : 5 }); if (R.D.length > 26) R.D.splice(0, R.D.length - 26); } return;
          case 'bdie': {
            if (!near(e.x, e.y, 6)) return; const n = Math.round(e.w * e.h / 2) + 2;
            for (let k = 0; k < n; k++) { const x = e.x + (rnd2() - .5) * e.w * .8, y = e.y + (rnd2() - .5) * e.h * .8; setTimeout(() => boom(x, y, 1 + rnd2() * .6, true), k * 90); }
            for (let k = 0; k < Math.min(4, n); k++) R.D.push({ f: S.P[e.o].fac, big: 1, x: e.x + (rnd2() - .5) * e.w * .6, y: e.y + (rnd2() - .5) * e.h * .6, t: 0, life: 50, smoke: 10 });
            stampScorch(e.x, e.y, Math.max(e.w, e.h) * .8); return;
          }
          case 'sold': case 'placed': if (near(e.x, e.y)) dust(e.x, e.y, 1.4, 10); return;
          case 'zap': R.Z.push({ k: 'zap', pts: e.pts, t: 0, life: .22 }); for (const p of e.pts.slice(1)) add({ k: 'blue', x: p.x, y: p.y, s: .7, s1: .3, a: 1, life: .2, add: 1 }); return;
          case 'swallow': case 'krrise': case 'krdive': {
            if (!near(e.x, e.y, 4)) return; const big = e.t === 'swallow', n = big ? 18 : 10;
            for (let k = 0; k < n; k++) { const a = k / n * 6.28, v2 = big ? 2.2 : 1.4; add({ k: 'dust', x: e.x, y: e.y, vx: Math.cos(a) * v2, vy: Math.sin(a) * v2, s: .6, s1: 1.6, a: .85, life: 1.3, drag: 2 }); }
            if (big) R.Z.push({ k: 'ring', x: e.x, y: e.y, t: 0, life: .9 });
            return;
          }
          case 'unload': if (near(e.x, e.y)) for (let k = 0; k < 6; k++) add({ k: k % 2 ? 'gold' : 'blue', x: e.x + (rnd2() - .5), y: e.y - .3 + (rnd2() - .5) * .6, vy: -.6, s: .25, s1: .1, a: 1, life: .7, add: 1, low: 1 }); return;
        }
      };
      function stampScorch(x, y, s) { const ci = Math.floor(y / CH) * R.cx + Math.floor(x / CH), ch = R.chunks[ci]; if (!ch) return; Art.stamp(ch, 'scorch', (x - (ci % R.cx) * CH) * PXT, (y - Math.floor(ci / R.cx) * CH) * PXT, 0, s); R.bgDirty = true; R.bgT = 0; }
      function stampTrack(u) {
        const ci = Math.floor(u.y / CH) * R.cx + Math.floor(u.x / CH), ch = R.chunks[ci]; if (!ch) return;
        R.stampQ.push([ch, UT[u.t].cat === 'inf' ? 'foot' : 'track', (u.x - (ci % R.cx) * CH) * PXT, (u.y - Math.floor(ci / R.cx) * CH) * PXT, u.d, UT[u.t].r * 2]);
      }
      /* ----- drawing helpers (device pixels) ----- */
      const d2r = (img, x, y, w, h) => g.drawImage(img, x - w / 2, y - h / 2, w, h);
      let KK = 1;                                             // extra scale while zooming (sprites not re-scaled yet)
      function sprite(sh, key, dirA, sx, sy, rot) {
        const m = sh.map[key]; if (!m) return;
        let a = dirA % (Math.PI * 2); if (a < 0) a += Math.PI * 2;
        const di = Math.round(a / STEP_A) % DIRS, box = m.box;
        if (rot && R.q === 0) { const res = a - di * STEP_A, c = Math.cos(res) * KK, sn = Math.sin(res) * KK; g.setTransform(c, sn, -sn, c, sx, sy); g.drawImage(sh.c, di * box, m.y, box, box, -box / 2, -box / 2, box, box); g.setTransform(1, 0, 0, 1, 0, 0); }
        else if (KK === 1) g.drawImage(sh.c, di * box, m.y, box, box, Math.round(sx - box / 2), Math.round(sy - box / 2), box, box);
        else { const s = box * KK; g.drawImage(sh.c, di * box, m.y, box, box, sx - s / 2, sy - s / 2, s, s); }
      }
      const BARS = [], BCOL = ['#5ee06a', '#f2c14e', '#ff5a4a', '#ff6a5a'];
      const bar = (x, y, w, f, enemy) => BARS.push(x, y, w, Math.max(0, f), enemy ? 3 : f > .6 ? 0 : f > .3 ? 1 : 2);
      function flushBars(d) {
        if (!BARS.length) return;
        g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); for (let i = 0; i < BARS.length; i += 5) g.rect(Math.round(BARS[i] - BARS[i + 2] / 2 - d), Math.round(BARS[i + 1] - d), Math.round(BARS[i + 2] + 2 * d), Math.round(5 * d)); g.fill();
        for (let c = 0; c < 4; c++) { let any = false; g.beginPath(); for (let i = 0; i < BARS.length; i += 5) if (BARS[i + 4] === c) { any = true; g.rect(Math.round(BARS[i] - BARS[i + 2] / 2), Math.round(BARS[i + 1]), Math.max(1, Math.round(BARS[i + 2] * BARS[i + 3])), Math.round(3 * d)); } if (any) { g.fillStyle = BCOL[c]; g.fill(); } }
        BARS.length = 0;
      }
      /* ----- one frame ----- */
      R.frame = (S, al, o) => {
        if (!S || !R.W) return;
        const now = performance.now(), dt = Math.min(.1, R.lt ? (now - R.lt) / 1000 : 0) * (o.speed || 1); R.lt = now; if (!o.still) R.t += dt;
        if (R.cam.z !== R.lastZ) { R.lastZ = R.cam.z; R.zoomT = now; }
        const c = R.cam, d = R.dpr, z = c.z, zz = z * d, A = al, h = S.human;
        redoSlabs(); checkCrystals(S);
        // tracks in the sand: batched into the chunks every second
        if (!o.still && R.q < 3 && S.t % 2 === 0 && R.lastTr !== S.t) { R.lastTr = S.t; for (const u of S.U) if (u.mv && (UT[u.t].cat === 'veh' || (S.t % 4 === 0 && R.q < 2)) && S.ter[tileOf(S, u.x, u.y)] === T_SAND && (h < 0 || u.o === h || visAt(S, u.x, u.y))) stampTrack(u); }
        if (R.stampQ.length && now - R.lastStamp > 1000) { R.lastStamp = now; for (const s of R.stampQ) Art.stamp(s[0], s[1], s[2], s[3], s[4], s[5]); R.stampQ.length = 0; R.bgDirty = true; }
        if (!R.dbg.bg && needBg()) renderBg();
        placeBg();
        ensureScaled(); KK = SC.k ? zz / PX / SC.k : 1; if (Math.abs(KK - 1) < .02) KK = 1;
        g = g0; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        const v = R.view(), inV = (x, y, m = 1.5) => x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m, X = x => (x - c.x) * zz, Y = y => (y - c.y) * zz;
        // wrecks
        for (let i = R.D.length - 1; i >= 0; i--) {
          const w = R.D[i]; if (!o.still) w.t += dt; if (w.t > w.life) { R.D.splice(i, 1); continue; } if (!inV(w.x, w.y)) continue;
          const img = SC.blds[w.f] && SC.blds[w.f]['wreck' + w.big]; if (!img) continue; const s = img.width * KK;
          g.globalAlpha = Math.min(1, (w.life - w.t) / 4); g.drawImage(img, Math.round(X(w.x) - s / 2), Math.round(Y(w.y) - s / 2), s, s); g.globalAlpha = 1;
          if (!o.still && w.t < w.smoke && Math.random() < dt * 3 && R.q < 3) add({ k: 'dark', x: w.x + (Math.random() - .5) * .3, y: w.y, vy: -.5, vx: .15, s: .3, s1: 1.1, a: .45, life: 1.6, low: 1 });
        }
        // the sand creeper: a moving ripple in the sand
        const K = S.kr;
        if (K && K.st !== 'gone' && inV(K.x, K.y, 3) && visAt(S, K.x, K.y)) {
          const kx = X(K.px + (K.x - K.px) * A), ky = Y(K.py + (K.y - K.py) * A), hunt = K.st === 'hunt', tt = R.t;
          g.save(); g.translate(kx, ky); g.rotate(K.d);
          const L = zz * (hunt ? 1.5 : 1.25), Wd = zz * (hunt ? .85 : .7), wob = Math.sin(tt * 6) * .04;
          // the wake: V-shaped ripples behind it
          for (let r = 0; r < 5; r++) { const ph = (tt * (hunt ? 1.8 : 1.1) + r * .2) % 1, bx = -L * (.6 + ph * 2.2), sp = Wd * (.7 + ph * 1.6); g.strokeStyle = `rgba(110,72,36,${.42 * (1 - ph)})`; g.lineWidth = Math.max(1.5 * d, zz * .07); g.beginPath(); g.moveTo(bx - L * .5, -sp); g.quadraticCurveTo(bx + L * .3, 0, bx - L * .5, sp); g.stroke(); }
          // the mound: shadow, body, light
          g.fillStyle = 'rgba(80,50,24,.35)'; g.beginPath(); g.ellipse(zz * .1, zz * .14, L, Wd, 0, 0, 7); g.fill();
          const gr = g.createRadialGradient(-L * .25, -Wd * .35, 0, 0, 0, L); gr.addColorStop(0, '#fbe2b0'); gr.addColorStop(.55, '#e2b874'); gr.addColorStop(1, '#b88446'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, L * (1 + wob), Wd * (1 - wob), 0, 0, 7); g.fill();
          g.strokeStyle = 'rgba(120,80,40,.45)'; g.lineWidth = Math.max(1, zz * .04); for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(-L * .15 * k, 0, L * (.75 - k * .18), Wd * (.7 - k * .16), 0, -1.3, 1.3); g.stroke(); }
          g.fillStyle = 'rgba(250,230,190,.75)'; for (let s2 = 0; s2 < 6; s2++) { const a = s2 * 1.05 + tt * 2.5; g.beginPath(); g.arc(Math.cos(a) * L * .55, Math.sin(a) * Wd * .55, zz * .045, 0, 7); g.fill(); }
          if (hunt) { g.fillStyle = '#5a3a20'; for (const sd of [-1, 1]) { g.save(); g.translate(L * .92, sd * Wd * .32); g.rotate(sd * (.45 + Math.sin(tt * 9) * .3)); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(zz * .38, sd * zz * .05, zz * .48, -sd * zz * .12); g.quadraticCurveTo(zz * .3, sd * zz * .1, 0, sd * zz * .12); g.fill(); g.restore(); } }
          g.restore();
          if (!o.still && Math.random() < dt * (hunt ? 14 : 5) && R.q < 3) add({ k: 'dust', x: K.x - Math.cos(K.d) * .6 + (Math.random() - .5) * .8, y: K.y - Math.sin(K.d) * .6 + (Math.random() - .5) * .8, vx: -Math.cos(K.d) * .4, vy: -Math.sin(K.d) * .4 - .2, s: .4, s1: 1.1, a: .55, life: .9, low: 1 });
        }
        // buildings
        const sel = o.sel || new Set(), tt = R.t;
        for (const b of R.dbg.b ? [] : S.B) {
          if (!inV(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
          if (b.o !== h && h >= 0 && !expAt(S, b.x, b.y, b.w, b.h)) continue;
          const F = S.P[b.o].fac, SB = SC.blds[F], img = SB[b.t], x0 = Math.round(X(b.x - .1)), y0 = Math.round(Y(b.y - .1)), sw = img.width * KK, shh = img.height * KK;
          if (b.bp < 1) {                                   // rising out of its scaffolding
            const f = b.bp, hh = img.height * f; g.drawImage(img, 0, img.height - hh, img.width, hh, x0, y0 + shh - hh * KK, sw, hh * KK);
            g.strokeStyle = 'rgba(240,192,64,.9)'; g.lineWidth = Math.max(d, zz * .04); g.strokeRect(X(b.x) + 2 * d, Y(b.y) + 2 * d, b.w * zz - 4 * d, b.h * zz - 4 * d);
            g.beginPath(); for (let i = 1; i < b.w * 2; i++) { g.moveTo(X(b.x + i / 2), Y(b.y + b.h)); g.lineTo(X(b.x + i / 2), Y(b.y + b.h * (1 - f))); } g.stroke();
            if (!o.still && Math.random() < dt * 8) add({ k: 'spark', x: b.x + Math.random() * b.w, y: b.y + b.h * (1 - f), vy: -1, vx: (Math.random() - .5) * 2, s: .12, s1: .04, a: 1, life: .35, add: 1, low: 1 });
          } else g.drawImage(img, x0, y0, sw, shh);
          const P = S.P[b.o], on = !P.low || BT[b.t].pw > 0;
          if (b.t === 'cent' && b.bp >= 1 && R.q < 4) { const f = SB.fan, s = f.width * KK; g.save(); g.translate(X(b.x + 1.42), Y(b.y + .98)); g.rotate(tt * 6); g.drawImage(f, -s / 2, -s / 2, s, s); g.restore(); }
          if (b.t === 'radar' && b.bp >= 1) { const f = SB.dish, s = f.width * KK; g.save(); g.translate(X(b.x + 1), Y(b.y + .9)); g.rotate(on ? tt * 1.4 : .6); g.drawImage(f, -s / 2, -s / 2, s, s); g.restore(); }
          if ((b.t === 'toren' || b.t === 'rpaal') && b.bp >= 1) { const Hd = SB[b.t + 'H'], a = lerpA(b.pt ?? b.tu, b.tu, A); let aa = a % 6.2832; if (aa < 0) aa += 6.2832; const di = Math.round(aa / STEP_A) % DIRS, s = Hd.box * KK; g.drawImage(Hd.c, di * Hd.box, 0, Hd.box, Hd.box, Math.round(X(b.x + .5) - s / 2), Math.round(Y(b.y + .45) - s / 2), s, s); if (b.fl === 3) add({ k: 'flash', x: b.x + .5 + Math.cos(a) * .55, y: b.y + .45 + Math.sin(a) * .55, s: .5, s1: .2, a: 1, life: .07, add: 1 }); }
          if (b.t === 'raff' && b.bp >= 1 && R.q < 3) { g.globalAlpha = .25 + .2 * Math.sin(tt * 2.2 + b.id); d2r(FX.blue, X(b.x + 2.3), Y(b.y + .8), zz * 1.1, zz * 1.1); g.globalAlpha = 1; }
          if (b.hp < b.mhp * .5 && !o.still && Math.random() < dt * (b.hp < b.mhp * .25 ? 6 : 2.5) && R.q < 4) add({ k: 'dark', x: b.x + .3 + Math.random() * (b.w - .6), y: b.y + .3 + Math.random() * (b.h - .6), vy: -.6, vx: .2, s: .4, s1: 1.4, a: .55, life: 1.8, low: 1 });
          if (b.hp < b.mhp * .25) { g.globalAlpha = .5 + .3 * Math.sin(tt * 13 + b.id); d2r(FX.fire, X(b.x + b.w * .4), Y(b.y + b.h * .45), zz * .9, zz * .9); g.globalAlpha = 1; }
          if (b.id === o.selB) {
            g.strokeStyle = '#fff'; g.lineWidth = 2 * d; g.setLineDash([6 * d, 4 * d]); g.strokeRect(X(b.x) + d, Y(b.y) + d, b.w * zz - 2 * d, b.h * zz - 2 * d); g.setLineDash([]);
            if (b.rally) { const rx = X(b.rally.x), ry = Y(b.rally.y); g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([4 * d, 5 * d]); g.beginPath(); g.moveTo(X(b.x + b.w / 2), Y(b.y + b.h)); g.lineTo(rx, ry); g.stroke(); g.setLineDash([]); g.fillStyle = FACTIONS[F].col; g.beginPath(); g.moveTo(rx, ry - zz * .75); g.lineTo(rx + zz * .45, ry - zz * .58); g.lineTo(rx, ry - zz * .4); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx, ry - zz * .78); g.stroke(); }
          }
          if (b.id === o.selB || (b.hp < b.mhp && S.t - b.hit < TPS * 4) || (b.o === h && b.hp < b.mhp * .5)) bar(X(b.x + b.w / 2), Y(b.y) - 6 * d, Math.min(b.w * zz * .9, 90 * d), b.hp / b.mhp, false);
          if (b.rep) { const s = zz * .55, cx = X(b.x + b.w / 2), cy = Y(b.y + b.h / 2); g.fillStyle = 'rgba(40,160,80,.85)'; g.beginPath(); g.arc(cx, cy, s * .6, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(cx - s * .3, cy); g.lineTo(cx + s * .3, cy); g.moveTo(cx, cy - s * .3); g.lineTo(cx, cy + s * .3); g.stroke(); }
          if (b.o === h && P.low && BT[b.t].pw < 0 && Math.sin(tt * 5) > 0) { const cx = X(b.x + b.w - .3), cy = Y(b.y + .3), s = Math.max(5 * d, zz * .22); g.fillStyle = '#ffd23a'; g.strokeStyle = '#a03020'; g.lineWidth = 1.5 * d; g.beginPath(); g.moveTo(cx + s * .2, cy - s); g.lineTo(cx - s * .5, cy + s * .1); g.lineTo(cx, cy + s * .1); g.lineTo(cx - s * .2, cy + s); g.lineTo(cx + s * .5, cy - s * .1); g.lineTo(cx, cy - s * .1); g.closePath(); g.fill(); g.stroke(); }
        }
        // units: infantry first, vehicles on top
        const selPath = [];
        for (let pass = 0; pass < 2; pass++) for (const u of R.dbg.u ? [] : S.U) {
          const T = UT[u.t]; if ((T.cat === 'inf') !== (pass === 0)) continue;
          const x = u.px + (u.x - u.px) * A, y = u.py + (u.y - u.py) * A; if (!inV(x, y)) continue;
          if (u.o !== h && h >= 0 && !visAt(S, x, y)) continue;
          const sh = SC.sheets[S.P[u.o].fac], sx = X(x), sy = Y(y), dA = lerpA(u.pd, u.d, A);
          if (T.cat === 'inf') { const f = u.mv ? 1 + (((S.t >> 1) + u.id) & 1) : 0; sprite(sh, u.t + 'b' + f, dA, sx, sy, false); }
          else {
            const tA = T.tur ? lerpA(u.pt, u.tu, A) : 0, same = T.tur && R.q > 0 && Math.round(((dA % 6.2832) + 6.2832) % 6.2832 / STEP_A) % DIRS === Math.round(((tA % 6.2832) + 6.2832) % 6.2832 / STEP_A) % DIRS;
            sprite(sh, u.t + (same ? 'k0' : 'b0'), dA, sx, sy, true);
            if (T.harv && u.car > 30) { g.globalAlpha = Math.min(1, u.car / 700); sprite(sh, 'oogc0', dA, sx, sy, true); g.globalAlpha = 1; if (u.mining > 0 && !o.still && Math.random() < dt * 10 && R.q < 4) add({ k: 'dust', x: x + Math.cos(u.d) * .6, y: y + Math.sin(u.d) * .6, vy: -.3, s: .35, s1: .9, a: .6, life: .7, low: 1 }); }
            if (T.tur && !same) sprite(sh, u.t + 't0', tA, sx, sy, true);
            if (u.mv && !o.still && R.q < 3 && S.ter[tileOf(S, x, y)] === T_SAND && Math.random() < dt * T.spd * 2) add({ k: 'dust', x: x - Math.cos(u.d) * T.r, y: y - Math.sin(u.d) * T.r, vx: -Math.cos(u.d) * .3, vy: -Math.sin(u.d) * .3 - .1, s: T.r * .7, s1: T.r * 1.8, a: .45, life: .8, low: 1 });
          }
          if (T.wt === 'straal' && u.bm > 0) {
            const m = { x: x + Math.cos(u.tu) * .45, y: y + Math.sin(u.tu) * .45 };
            g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,190,60,.5)'; g.lineWidth = Math.max(3 * d, zz * .22); g.beginPath(); g.moveTo(X(m.x), Y(m.y)); g.lineTo(X(u.bx), Y(u.by)); g.stroke();
            g.strokeStyle = 'rgba(255,250,220,.95)'; g.lineWidth = Math.max(1.5 * d, zz * .06); g.stroke(); g.globalCompositeOperation = 'source-over';
            d2r(FX.gold, X(u.bx), Y(u.by), zz * .8, zz * .8); d2r(FX.gold, X(m.x), Y(m.y), zz * .5, zz * .5);
          }
          if (u.rpg > 0) { u.rpg--; if (!o.still && Math.random() < .3) add({ k: 'spark', x: x + (Math.random() - .5) * .6, y: y + (Math.random() - .5) * .6, vy: -.8, s: .1, s1: .05, a: 1, life: .3, add: 1, low: 1 }); }
          if (sel.has(u.id)) selPath.push(sx, sy, T.r * zz * 1.25, u.hp / T.hp);
          else if (u.hp < T.hp && (S.t - u.hit < TPS * 4 || u.hp < T.hp * .5) && (u.o === h || visAt(S, x, y))) bar(sx, sy - T.r * zz - 7 * d, Math.max(16 * d, T.r * zz * 1.7), u.hp / T.hp, u.o !== h);
        }
        if (selPath.length) {
          g.strokeStyle = 'rgba(140,255,150,.95)'; g.lineWidth = 2 * d; g.beginPath();
          for (let i = 0; i < selPath.length; i += 4) { const x = selPath[i], y = selPath[i + 1], r = selPath[i + 2], q = r * .45; for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(x + dx * r, y + dy * (r - q)); g.lineTo(x + dx * r, y + dy * r); g.lineTo(x + dx * (r - q), y + dy * r); } }
          g.stroke(); for (let i = 0; i < selPath.length; i += 4) bar(selPath[i], selPath[i + 1] - selPath[i + 2] - 7 * d, Math.max(16 * d, selPath[i + 2] * 1.4), selPath[i + 3], false);
        }
        flushBars(d);
        // projectiles
        for (const p of S.PJ) {
          const x = p.px + (p.x - p.px) * A, y = p.py + (p.y - p.py) * A; if (!inV(x, y)) continue; if (h >= 0 && !visAt(S, x, y) && !visAt(S, p.tx, p.ty)) continue;
          if (p.wt === 'granaat') { const hz = (p.pz + (p.z - p.pz) * A) * zz * .9; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X(x), Y(y), zz * .12, zz * .07, 0, 0, 7); g.fill(); d2r(FX.shell, X(x), Y(y) - hz, zz * .45, zz * .45); if (!o.still && R.q < 3 && Math.random() < .5) add({ k: 'smoke', x, y: y - hz / zz, vy: -.1, s: .12, s1: .4, a: .4, life: .6, low: 1 }); }
          else if (p.wt === 'raket' && R.q > 2) d2r(FX.fire, X(x), Y(y), zz * .45, zz * .45);
          else if (p.wt === 'raket') { const a = p.ang || 0, s = zz * .55; g.setTransform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), X(x), Y(y)); g.drawImage(FX.rocket, -s / 2, -s * .21, s, s * .42); g.setTransform(1, 0, 0, 1, 0, 0); d2r(FX.fire, X(x - Math.cos(a) * .25), Y(y - Math.sin(a) * .25), zz * .4, zz * .4); if (!o.still && R.q < 4) add({ k: 'smoke', x: x - Math.cos(a) * .3, y: y - Math.sin(a) * .3, s: .16, s1: .55, a: .5, life: .7, low: 1 }); }
          else d2r(FX.shell, X(x), Y(y), zz * .32, zz * .32);
        }
        // particles and short lines
        if (!R.dbg.p) stepParticles(o.still ? 0 : dt, zz);
        let trN = 0; g.beginPath();
        for (let i = R.Z.length - 1; i >= 0; i--) {
          const L = R.Z[i]; if (!o.still) L.t += dt; if (L.t > L.life) { R.Z.splice(i, 1); continue; }
          if (L.k === 'tr') { g.moveTo(X(L.x), Y(L.y)); g.lineTo(X(L.tx), Y(L.ty)); trN++; }
        }
        if (trN) { g.strokeStyle = 'rgba(255,236,170,.85)'; g.lineWidth = Math.max(d, zz * .035); g.stroke(); }
        for (const L of R.Z) {
          const f = 1 - L.t / L.life;
          if (L.k === 'zap') { g.globalCompositeOperation = 'lighter'; for (const [w, col] of [[Math.max(4 * d, zz * .2), 'rgba(90,170,255,.35)'], [Math.max(1.5 * d, zz * .05), 'rgba(235,248,255,.95)']]) { g.strokeStyle = col; g.lineWidth = w; g.globalAlpha = f; g.beginPath(); for (let j = 0; j < L.pts.length - 1; j++) { const a = L.pts[j], b = L.pts[j + 1]; g.moveTo(X(a.x), Y(a.y)); for (let s = 1; s <= 5; s++) { const t2 = s / 5, jx = s < 5 ? Math.sin(L.t * 90 + s * 7 + j) * .2 : 0; g.lineTo(X(a.x + (b.x - a.x) * t2 + jx), Y(a.y + (b.y - a.y) * t2 - jx)); } } g.stroke(); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          else if (L.k === 'ring') { g.strokeStyle = `rgba(120,80,40,${f * .7})`; g.lineWidth = Math.max(2 * d, zz * .12); g.beginPath(); g.ellipse(X(L.x), Y(L.y), zz * (.5 + (1 - f) * 2), zz * (.35 + (1 - f) * 1.4), 0, 0, 7); g.stroke(); }
        }
        // fog of war: its own tiny canvas, scaled up smoothly by the compositor
        if (h >= 0) { updateFog(S); const tf = `translate3d(${((-1 - c.x) * z).toFixed(2)}px,${((-1 - c.y) * z).toFixed(2)}px,0) scale(${z.toFixed(4)})`; if (tf !== R.fogTf) { R.fogTf = tf; fog.style.transform = tf; } }
        // overlays above the fog: move markers, selection box, building ghost (a separate layer, only touched when needed)
        const anyOv = (o.marks && o.marks.length) || o.box || o.ghost;
        if (anyOv || ovDrawn) { ov.setTransform(1, 0, 0, 1, 0, 0); ov.clearRect(0, 0, ovCv.width, ovCv.height); ovDrawn = !!anyOv; }
        g = ov;
        for (const m of o.marks || []) { const f = 1 - m.t / .7; if (f <= 0) continue; g.strokeStyle = m.atk ? `rgba(255,90,70,${f})` : `rgba(140,255,150,${f})`; g.lineWidth = 2.5 * d; g.beginPath(); g.ellipse(X(m.x), Y(m.y), zz * (.25 + (1 - f) * .4), zz * (.16 + (1 - f) * .26), 0, 0, 7); g.stroke(); }
        if (o.box) { const b = o.box; g.fillStyle = 'rgba(140,255,150,.12)'; g.strokeStyle = 'rgba(140,255,150,.9)'; g.lineWidth = 1.5 * d; const x = Math.min(b.x0, b.x1) * d, y = Math.min(b.y0, b.y1) * d, w = Math.abs(b.x1 - b.x0) * d, hh = Math.abs(b.y1 - b.y0) * d; g.fillRect(x, y, w, hh); g.strokeRect(x, y, w, hh); }
        if (o.ghost) {
          const G = o.ghost, T = BT[G.t]; let i = 0;
          for (let j = 0; j < T.h; j++) for (let ii = 0; ii < T.w; ii++) { const okT = G.tiles[i++]; g.fillStyle = okT && G.near ? 'rgba(90,230,110,.42)' : 'rgba(255,80,60,.45)'; g.fillRect(X(G.x + ii) + d, Y(G.y + j) + d, zz - 2 * d, zz - 2 * d); }
          if (!T.slab) { const img = SC.blds[S.P[h].fac][G.t]; if (img) { g.globalAlpha = .55; g.drawImage(img, X(G.x - .1), Y(G.y - .1), img.width * KK, img.height * KK); g.globalAlpha = 1; } }
          g.strokeStyle = G.ok ? '#8cff96' : '#ff6a5a'; g.lineWidth = 2 * d; g.strokeRect(X(G.x), Y(G.y), T.w * zz, T.h * zz);
        }
        g = g0;
      };
      function stepParticles(dt, zz) {
        const c = R.cam, v = R.view(), P = R.P; let n = 0;
        for (let i = 0; i < P.length; i++) {
          const p = P[i]; p.t += dt; if (p.t >= p.life) continue; P[n++] = p;
          if (dt) { const dr = p.drag ? Math.exp(-p.drag * dt) : 1; if (p.vx) { p.x += p.vx * dt; p.vx *= dr; } if (p.vy) { p.y += p.vy * dt; p.vy *= dr; } }
        }
        P.length = n;
        for (let pass = 0; pass < 2; pass++) {               // normal blending first, then the glowing ones in one go
          if (pass) g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < n; i++) {
            const p = P[i]; if (!p.add !== !pass) continue;
            if (p.x < v.x0 - 2 || p.x > v.x1 + 2 || p.y < v.y0 - 2 || p.y > v.y1 + 2) continue;
            const f = p.t / p.life, s = (p.s + (p.s1 - p.s) * f) * zz, a = p.a * (p.add ? 1 - f : f < .15 ? f / .15 : (1 - f) / .85);
            g.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a; g.drawImage(FX[p.k], (p.x - c.x) * zz - s / 2, (p.y - c.y) * zz - s / 2, s, s);
          }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      R.idle = () => R.P.length === 0 && R.Z.length === 0;
      // a snapshot of both layers (for the menu backdrop)
      R.snapshot = () => { const c = Art.mk(cv.width, cv.height), sg = c.getContext('2d'), s = R.cam.z / BGV.z * R.dpr / R.dpr; sg.drawImage(bgCv, (BGV.x0 - R.cam.x) * R.cam.z * R.dpr, (BGV.y0 - R.cam.y) * R.cam.z * R.dpr, bgCv.width * s, bgCv.height * s); sg.drawImage(cv, 0, 0); return c; };
      /* ----- the minimap ----- */
      let mini0 = null;
      R.mini = (mc, S, on, sel) => {
        const mg = mc.getContext('2d'), W = S.W, H = S.H, w = mc.width, hh = mc.height;
        if (!mini0) {
          mini0 = Art.mk(W, H); const mx = mini0.getContext('2d'), im = mx.createImageData(W, H), D = im.data;
          for (let i = 0; i < W * H; i++) { const t = S.ter[i], col = S.cry[i] ? [240, 140, 50] : t === T_ROCK ? (S.slab[i] ? [176, 172, 160] : [150, 128, 108]) : t === T_CLIFF ? [96, 74, 60] : t === T_DUNE ? [204, 160, 100] : [228, 192, 128]; D[i * 4] = col[0]; D[i * 4 + 1] = col[1]; D[i * 4 + 2] = col[2]; D[i * 4 + 3] = 255; }
          mx.putImageData(im, 0, 0); R.miniT = 0;
        }
        if (++R.miniT % 20 === 0) { const mx = mini0.getContext('2d'); for (const i of S.ft) { mx.fillStyle = S.cry[i] ? '#f08c32' : '#e4c080'; mx.fillRect(i % W, (i / W) | 0, 1, 1); } }
        mg.imageSmoothingEnabled = false; mg.fillStyle = '#1a120a'; mg.fillRect(0, 0, w, hh);
        if (!on) return;
        const s = Math.min(w / W, hh / H), ox = (w - W * s) / 2, oy = (hh - H * s) / 2; R.miniS = { s, ox, oy };
        mg.drawImage(mini0, ox, oy, W * s, H * s);
        if (S.human >= 0) { updateFog(S); mg.imageSmoothingEnabled = true; mg.drawImage(fog, ox - s, oy - s, (W + 2) * s, (H + 2) * s); }
        const h = S.human;
        for (const b of S.B) { if (b.o !== h && h >= 0 && !expAt(S, b.x, b.y, b.w, b.h)) continue; mg.fillStyle = b.o === h ? '#7dff8a' : FACTIONS[S.P[b.o].fac].col; mg.fillRect(ox + b.x * s, oy + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s)); }
        const q = Math.max(2, s * 1.2);
        for (const u of S.U) { if (u.o !== h && h >= 0 && !visAt(S, u.x, u.y)) continue; mg.fillStyle = u.o === h ? (sel && sel.has(u.id) ? '#ffffff' : '#c8ffd0') : FACTIONS[S.P[u.o].fac].c2; mg.fillRect(ox + u.x * s - q / 2, oy + u.y * s - q / 2, q, q); }
        if (S.kr && S.kr.st !== 'gone' && visAt(S, S.kr.x, S.kr.y)) { mg.fillStyle = '#8a5a2a'; mg.beginPath(); mg.arc(ox + S.kr.x * s, oy + S.kr.y * s, Math.max(2.5, s * 1.5), 0, 7); mg.fill(); }
        const V = R.view(); mg.strokeStyle = '#fff'; mg.lineWidth = 1.5; mg.strokeRect(ox + V.x0 * s, oy + V.y0 * s, (V.x1 - V.x0) * s, (V.y1 - V.y0) * s);
      };
      R.miniWorld = (mx, my) => { const m = R.miniS; if (!m) return null; return { x: (mx - m.ox) / m.s, y: (my - m.oy) / m.s }; };
      R.resetMini = () => { mini0 = null; };
      return R;
    }
    return { create };
  })();

  /* ================= ui.js: screens, touch controls, build bar, HUD, feedback, the loop, save/resume ================= */
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STEP = 1000 / TPS, SPEEDS = [[.7, 'Langzaam'], [1, 'Normaal'], [1.5, 'Snel']];
  const opt = Object.assign({ sound: true, speed: 1, big: false, vib: true, adj: 0, fac: 0, opp: 1, diff: 1, size: 'middel', cry: 2500, kr: true, cf: 0 }, store.get('zr.settings', {}));
  Sfx.gate('zr', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('zr.settings', opt);
  let stats = Object.assign({ games: 0, wins: 0, losses: 0, skWins: 0, sk2Hard: 0, kills: 0, harv: 0, built: 0, made: 0, flee: 0, swallowed: 0, camp: {}, stars: 0, missions: 0, best: 0 }, store.get('zr.stats', {}));
  const saveStats = () => { let st = 0, ms = 0; for (const k in stats.camp) { st += stats.camp[k].s || 0; ms++; } stats.stars = st; stats.missions = ms; store.set('zr.stats', stats); };
  const scr = $('#zr'), stageEl = $('#zrStage'), cv = $('#zrCv'), miniCv = $('#zrMini');
  const RD = Draw.create(cv, $('#zrBg'), $('#zrFog'), $('#zrOv'));
  let GS = null, S = null, raf = 0, lastT = 0, acc = 0, quality = 0, frames = [];
  const now = () => performance.now();
  const SHOWN = document.getElementsByClassName('modal show');
  const modalUp = () => SHOWN.length > 0;
  const H = () => S ? S.P[S.human] : null;
  const FAC = i => FACTIONS[i];
  const vib = ms => { if (opt.vib) vibrate(ms); };

  /* ---------- sounds: only for things on screen, never too many at once ---------- */
  const lastS = {}, GAP = { zrGun: .07, zrGunS: .06, zrCannon: .08, zrRocket: .1, zrArty: .15, zrHit: .06, zrBoom: .09, zrPoof: .08, zrBeam: .35, zrZap: .12, zrCash: .5, zrSel: .05, zrAck: .12, zrKruip: 2, zrBoomBig: .25 };
  function sfx(n, x, y) {
    if (!opt.sound) return;
    let pan = 0;
    if (x != null && S) { const v = RD.view(); if (x < v.x0 - 3 || x > v.x1 + 3 || y < v.y0 - 3 || y > v.y1 + 3) return; pan = Math.max(-.8, Math.min(.8, ((x - v.x0) / (v.x1 - v.x0) - .5) * 1.4)); }
    const t = now() / 1000; if (GAP[n] && t - (lastS[n] || 0) < GAP[n]) return; lastS[n] = t;
    Sfx.play(n, undefined, pan);
  }

  /* ---------- sizing ---------- */
  function fit() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const d = Math.min(window.__zrDpr || [1.75, 1.4, 1.1, .9, .75][quality], devicePixelRatio || 1);
    const z0 = RD.W ? RD.cam.z : 0, cx = RD.W ? RD.cam.x + RD.W / RD.cam.z / 2 : null, cy = RD.W ? RD.cam.y + RD.H / RD.cam.z / 2 : null;
    RD.resize(r.width, r.height, d);
    if (S && cx != null) { const [mn, mx] = RD.zoomLimits(); RD.cam.z = Math.max(mn, Math.min(mx, z0 || 36)); RD.center(cx, cy); }
    const mr = miniCv.getBoundingClientRect(); if (mr.width > 10) { miniCv.width = Math.round(mr.width * Math.min(2, devicePixelRatio || 1)); miniCv.height = Math.round(mr.height * Math.min(2, devicePixelRatio || 1)); }
    if (S && !raf) drawStill();
  }
  addEventListener('resize', () => { if (current === 'zr') setTimeout(() => { fit(); placeInfo(); }, 60); });
  function drawStill() { if (S) { RD.frame(S, 1, frameOpts(true)); miniTick(true); } else if (GS && GS.demo) drawDemo(); }
  const frameOpts = still => ({ sel: GS && GS.sel, selB: GS && GS.selB, ghost: GS && GS.placing ? ghostInfo() : null, box: GS && GS.box, marks: GS && GS.marks, speed: opt.speed, still });

  /* ---------- the loop: fixed 15 Hz steps, a frame for every animation frame, stopped in menus and in the pause ---------- */
  let rekick = false;
  function kick() { if (raf === -1) { rekick = true; return; } if (!raf && current === 'zr' && GS && GS.view === 'play' && S) { lastT = now(); raf = requestAnimationFrame(loop); } }
  let pollT = 0;
  function pollResume() { clearTimeout(pollT); pollT = setTimeout(() => { if (current !== 'zr' || !GS || GS.view !== 'play') return; if (modalUp() || document.hidden) { pollResume(); return; } kick(); }, 250); }
  function loop(ts) { raf = -1; rekick = false; try { loopBody(ts); } finally { if (raf === -1) { raf = 0; if (rekick && current === 'zr') raf = requestAnimationFrame(loop); } rekick = false; } }
  function loopBody(ts) {
    if (current !== 'zr' || !GS || GS.view !== 'play' || !S) return;
    frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    const dt = Math.min(120, Math.max(0, ts - lastT)); lastT = ts;
    const paused = modalUp() || GS.manual;
    if (!paused) {
      acc += dt * (window.__zrSpeed || opt.speed); let n = 0;
      while (acc >= STEP && n < 4) { acc -= STEP; n++; stepGame(); if (!GS || GS.view !== 'play') return; }
      if (n >= 4) acc = 0;
      perfWatch(dt);
    } else acc = 0;
    for (const m of GS.marks) m.t += dt / 1000; while (GS.marks.length && GS.marks[0].t > .8) GS.marks.shift();
    RD.frame(S, Math.min(1, acc / STEP), frameOpts(paused));
    hud(); miniTick();
    if (paused && !GS.manual) { pollResume(); return; }
    if (GS.manual) return;
    if (GS.resultsUp) return;
    raf = requestAnimationFrame(loop);
  }
  let pwT = 0, pwN = 0;
  function perfWatch(dt) { pwT += dt; pwN++; if (pwN < 50) return; const avg = pwT / pwN; pwT = 0; pwN = 0; if (avg > 18.6 && quality < 4 && !window.__zrDpr) { quality++; RD.setQuality(quality); fit(); } }

  /* ---------- one simulation step ---------- */
  function stepGame() {
    if (S.res) { if (!GS.endAt) GS.endAt = now() + 2200; if (now() >= GS.endAt && !GS.resultsUp) finish(); return; }
    Core.step(S);
    for (const e of S.ev) { RD.event(e, S); feedback(e); }
    if (GS.sel.size) for (const id of GS.sel) { const u = S.E[id]; if (!u || u.dead) GS.sel.delete(id); }
    if (GS.selB && !S.E[GS.selB]) { GS.selB = 0; GS.rally = false; }
    for (const g of GS.groups) for (let i = g.length - 1; i >= 0; i--) if (!S.E[g[i]]) g.splice(i, 1);
    if (S.t % (20 * TPS) === 0) saveGame();
    const P = H(); if (P && P.low !== GS.low) { GS.low = P.low; if (P.low) { toast('Te weinig energie! Bouw een energiecentrale.', 'bad'); sfx('zrAlarm'); } }
    if (S.res && !GS.endAt) GS.endAt = now() + 2200;
  }
  function feedback(e) {
    const h = S.human, mine = e.o === h;
    switch (e.t) {
      case 'fire': if (!RD.visAt(e.x, e.y)) return; sfx(e.wt === 'kogel' ? (e.inf ? 'zrGunS' : 'zrGun') : e.wt === 'kanon' ? 'zrCannon' : e.wt === 'raket' ? 'zrRocket' : 'zrArty', e.x, e.y); return;
      case 'imp': if (RD.visAt(e.x, e.y)) sfx(e.wt === 'granaat' ? 'zrBoom' : 'zrHit', e.x, e.y); return;
      case 'beam': if (RD.visAt(e.x, e.y)) sfx('zrBeam', e.x, e.y); return;
      case 'zap': if (RD.visAt(e.pts[0].x, e.pts[0].y)) sfx('zrZap', e.pts[0].x, e.pts[0].y); return;
      case 'die':
        if (e.by === h && !mine) stats.kills++;
        if (RD.visAt(e.x, e.y) || mine) sfx(e.inf ? 'zrPoof' : 'zrBoom', e.x, e.y);
        if (mine && UT[e.u].harv && e.by !== -1) toast('Oogster verloren!', 'bad');
        return;
      case 'bdie': sfx('zrBoomBig', e.x, e.y); if (mine) { toast(`${BT[e.b].nm} verloren!`, 'bad'); vib(40); } else if (e.by === h) { toast(`Vijandelijke ${BT[e.b].nm.toLowerCase()} vernietigd!`, 'good'); stats.kills++; } return;
      case 'bready': if (mine) { toast('Bouw voltooid', 'good'); sfx('zrDone'); vib(15); renderBuild(true); } return;
      case 'uready': if (mine) { if (now() - (GS.lastReady || 0) > 2500) { toast('Eenheid klaar', 'good'); GS.lastReady = now(); } sfx('zrReady'); } return;
      case 'placed': if (mine) { sfx('zrBuild', e.x, e.y); stats.built++; if (e.b === 'raff') toast('Raffinaderij klaar, oogster onderweg', 'good'); } return;
      case 'attacked': if (mine) { toast(e.harv ? 'Onze oogster wordt aangevallen!' : 'Onze basis wordt aangevallen!', 'bad'); sfx('zrAlarm'); vib(30); GS.ping = { x: e.x, y: e.y, t: now() }; } return;
      case 'full': if (mine) { toast('Kristalopslag vol: bouw een opslagsilo', 'info'); } return;
      case 'unload': if (mine) sfx('zrCash', e.x, e.y); return;
      case 'krhunt': if (mine) { toast('Zandkruiper gesignaleerd! Rijd naar de rotsen!', 'bad'); sfx('zrKruip'); GS.ping = { x: e.x, y: e.y, t: now() }; } return;
      case 'krrise': if (RD.visAt(e.x, e.y)) sfx('zrKruip', e.x, e.y); return;
      case 'swallow': sfx('zrGulp', e.x, e.y); if (mine) { toast(`De zandkruiper heeft een ${UT[e.u].nm.toLowerCase()} opgeslokt!`, 'bad'); stats.swallowed++; vib(50); } return;
      case 'krflee': if (e.o === h) { toast('De zandkruiper duikt weg!', 'good'); stats.flee++; saveStats(); } return;
      case 'sold': if (mine) sfx('zrSell'); return;
      case 'out': if (e.o !== h) toast(`${FAC(S.P[e.o].fac).nm} is verslagen!`, 'good'); return;
    }
  }

  /* ---------- toasts (the "voice" of the base) ---------- */
  const toastBox = $('#zrToasts'), lastToast = {};
  function toast(t, cls = '') {
    if (lastToast[t] && now() - lastToast[t] < 4000) return; lastToast[t] = now();
    const el = document.createElement('div'); el.className = 'zr-t ' + cls; el.textContent = t; toastBox.appendChild(el);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => el.remove(), 2800);
  }

  /* ---------- HUD (HTML, only touched when a value changes) ---------- */
  const E = { cry: $('#zrCry'), pow: $('#zrPow'), obj: $('#zrObj'), info: $('#zrInfo'), cmd: $('#zrCmd'), place: $('#zrPlaceTxt'), placeOk: $('#zrPlaceOk'), sell: $('#zrSell'), rep: $('#zrRep'), box: $('#zrBox') };
  let hudK = '', objK = '', selK = '', buildT = 0;
  function hud() {
    const P = H(); if (!P) return;
    const k = Math.floor(P.cry) + '|' + P.cap + '|' + P.pw + '|' + P.pu;
    if (k !== hudK) {
      hudK = k; E.cry.querySelector('b').innerHTML = Math.floor(P.cry) + `<small>/${P.cap}</small>`; E.cry.classList.toggle('full', P.cry >= P.cap - 1);
      E.pow.querySelector('b').textContent = P.pu + ' / ' + P.pw; E.pow.classList.toggle('low', P.low);
      E.pow.querySelector('em').style.setProperty('--p', P.pu ? Math.min(100, Math.round(P.pu / Math.max(1, P.pw) * 100)) : 0);
    }
    if (S.obj && S.t % 8 === 0) {
      const ok = objText(); if (ok !== objK) { objK = ok; E.obj.innerHTML = ok; E.obj.classList.toggle('on', !!ok); const r = E.obj.getBoundingClientRect(); scr.style.setProperty('--toastY', ok ? Math.max(56, r.bottom - stageEl.getBoundingClientRect().top + 8) + 'px' : '56px'); }
    } else if (!S.obj && objK !== '-') { objK = '-'; E.obj.classList.remove('on'); scr.style.setProperty('--toastY', '56px'); }
    const sk = selKey(); if (sk !== selK) { selK = sk; renderSel(); placeInfo(); }
    updInfo();
    if (now() - buildT > 160) { buildT = now(); renderBuild(); }
    scr.classList.toggle('radar', radarOn());
  }
  const radarOn = () => { const P = H(); return !!(P && P.bc.radar && !P.low); };
  function objText() {
    const P = H(); return S.obj.filter(o => o.t !== 'protect' || o.fail).map(o => {
      let t = OBJ_TXT(o);
      if (o.t === 'collect') t += ` (${Math.min(o.n, Math.floor(P.st.harv))})`;
      if (o.t === 'survive') { const left = Math.max(0, o.min * 60 - S.t / TPS); t += ` (${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')})`; }
      if (o.t === 'army') t += ` (${Math.min(o.n, S.U.filter(u => u.o === S.human && UT[u.t].wt).length)})`;
      return o.done ? `<s>✓ ${esc(t)}</s>` : '🎯 ' + esc(t);
    }).join('<br>');
  }
  const selKey = () => GS.selB ? 'b' + GS.selB + ':' + (S.E[GS.selB] ? Math.round(S.E[GS.selB].hp / S.E[GS.selB].mhp * 20) + ':' + S.E[GS.selB].rep : '') + GS.sellSure : 'u' + [...GS.sel].join(',') + '|' + GS.groups.map(g => g.length).join(',');
  function renderSel() {
    const hasU = GS.sel.size > 0, b = GS.selB ? S.E[GS.selB] : null;
    E.cmd.classList.toggle('hasU', hasU); E.cmd.classList.toggle('hasB', !!b); E.cmd.classList.toggle('hasS', hasU || !!b);
    E.cmd.classList.toggle('noRally', !b || !(b.t === 'kaz' || b.t === 'fab'));
    E.sell.classList.toggle('sure', !!GS.sellSure); E.sell.querySelector('small').textContent = GS.sellSure ? 'Zeker?' : 'Verkoop';
    E.rep.classList.toggle('on', !!(b && b.rep));
    document.querySelectorAll('#zrCmd .zr-g').forEach((el, i) => { const em = el.querySelector('em'), n = GS.groups[i].length; em.textContent = n; em.classList.toggle('on', n > 0); });
  }

  /* ---------- the info card: what is this, what does it do, how is it doing ---------- */
  const SPD_NM = s => s >= 2.6 ? 'snel' : s >= 1.5 ? 'gemiddeld' : 'traag';
  const ARMOUR_NM = { inf: 'geen pantser', licht: 'licht pantser', zwaar: 'zwaar pantser' };
  const HS_NM = { seek: 'Zoekt kristal', go: 'Rijdt naar kristal', mine: 'Oogst kristal', ret: 'Naar de raffinaderij', toraf: 'Naar de raffinaderij', qwait: 'Wacht bij de raffinaderij', unload: 'Lost kristal', noraf: 'Geen raffinaderij! Bouw er een.', none: 'Geen kristal meer in de buurt' };
  const facOk = (t, fid) => !UT[t] || !UT[t].fac || UT[t].fac === fid;
  const names = ts => ts.map(t => (BT[t] || UT[t]).nm).join(', ');
  function strongVs(wt) { const m = MULT[wt]; let best = Object.keys(ARM_NM).filter(a => m[a] >= 1); if (!best.length) { const mx = Math.max(...Object.values(m)); best = Object.keys(m).filter(a => m[a] === mx); } return best.map(a => ARM_NM[a]).join(' en '); }
  function makesOf(t, fid) { const cat = t === 'kaz' ? 'inf' : t === 'fab' ? 'veh' : null; return cat ? Object.keys(UT).filter(u => UT[u].cat === cat && facOk(u, fid) && (TIER[u] || 1) <= S.tier) : []; }
  function unlocksOf(t, fid) { const mk = makesOf(t, fid); return [...Object.keys(BT), ...Object.keys(UT)].filter(x => x !== t && !mk.includes(x) && ((BT[x] || UT[x]).req || []).includes(t) && facOk(x, fid) && (TIER[x] || 1) <= S.tier); }
  function factsOf(t, fid, type) {
    const T = BT[t] || UT[t], f = [];
    if (type) { f.push(`💎 ${T.cost}`); if (T.bt) f.push(`⏱ ${T.bt} s`); }
    if (BT[t]) {
      if (T.pw > 0) f.push(`⚡ +${T.pw} energie`); else if (T.pw < 0) f.push(`⚡ −${-T.pw} energie`);
      if (T.cap) f.push(`📦 ${T.cap} opslag`);
      if (T.wt) f.push(`🎯 ${WNAME[T.wt]}, sterk tegen ${strongVs(T.wt)}`);
    } else {
      if (T.wt) f.push(`🎯 ${WNAME[T.wt]}, sterk tegen ${strongVs(T.wt)}`);
      if (T.harv) f.push(`💎 laadt ${T.harv}`);
      f.push(`🛡 ${ARMOUR_NM[T.arm]}`, `🏃 ${SPD_NM(T.spd)}`);
      if (T.regen) f.push('✚ herstelt zich');
    }
    return f;
  }
  function infoTarget() {
    if (!GS || !S) return null;
    if (GS.infoT) return { k: 'type', t: GS.infoT };
    if (GS.selB && S.E[GS.selB]) return { k: 'b', e: S.E[GS.selB] };
    if (GS.sel.size === 1) { const u = S.E[[...GS.sel][0]]; if (u) return { k: 'u', e: u }; }
    if (GS.sel.size > 1) return { k: 'multi' };
    if (GS.info === -1 && S.kr && S.kr.st !== 'gone') return { k: 'kr' };
    if (GS.info > 0) { const e = S.E[GS.info]; if (e && !e.dead && (e.k === 'b' ? S.exp[Core.tileOf(S, e.x, e.y)] : RD.visAt(e.x, e.y))) return { k: e.k, e }; }
    return null;
  }
  const iconKr = (() => { let c = null; return () => { if (c) return c; const k = Art.mk(96, 96), g = k.getContext('2d'), gr = g.createRadialGradient(40, 40, 6, 48, 52, 44); gr.addColorStop(0, '#f6d898'); gr.addColorStop(1, '#a8743a'); g.fillStyle = gr; g.beginPath(); g.ellipse(48, 54, 40, 26, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(110,70,30,.6)'; g.lineWidth = 3; for (const r of [14, 24, 34]) { g.beginPath(); g.ellipse(48, 54, r, r * .62, 0, 3.6, 5.8); g.stroke(); } g.fillStyle = '#5a3a20'; g.beginPath(); g.ellipse(48, 46, 9, 6, 0, 0, 7); g.fill(); return (c = k.toDataURL()); }; })();
  function infoKey(I) {
    if (!I) return '';
    const P = H(), lvl = x => Math.round(x * 20);
    if (I.k === 'type') return 't' + I.t + Core.techOk(S, S.human, I.t) + opt.infoMin;
    if (I.k === 'kr') return 'kr' + opt.infoMin;
    if (I.k === 'multi') { let hp = 0, mh = 0; for (const id of GS.sel) { const u = S.E[id]; if (u) { hp += u.hp; mh += u.mhp || UT[u.t].hp; } } return 'm' + [...GS.sel].join(',') + ':' + lvl(hp / Math.max(1, mh)) + opt.infoMin; }
    const e = I.e, mh = e.mhp || UT[e.t].hp; let k = I.k + e.id + ':' + Math.round(e.hp / mh * 50) + ':' + opt.infoMin;
    if (e.o === S.human) {
      if (I.k === 'b') { const q = e.t === 'kaz' ? P.q.i : e.t === 'fab' ? P.q.v : e.t === 'bouw' ? P.q.b : null; k += ':' + lvl(e.bp) + e.rep + P.low + P.ready + (q && q[0] ? q[0].t + lvl(q[0].p) + q.length : ''); }
      else k += ':' + (e.hs || '') + Math.round((e.car || 0) / 25);
    }
    return k;
  }
  function renderInfo(I) {
    const el = E.info;
    if (!I) { el.classList.remove('on'); el.innerHTML = ''; return; }
    const P = H(), mine = !I.e || I.e.o === S.human, fac = I.e ? S.P[I.e.o].fac : P.fac, fid = FAC(fac).id;
    let icon, nm, desc, facts = [], stat = [], hp = null, tag = '', chips = '';
    if (I.k === 'kr') { icon = iconKr(); nm = 'Zandkruiper'; desc = INFO.kruiper; tag = '<span class="zr-itag bad">Gevaar</span>'; }
    else if (I.k === 'multi') {
      const c = {}; let h2 = 0, m2 = 0; for (const id of GS.sel) { const u = S.E[id]; if (!u) continue; c[u.t] = (c[u.t] || 0) + 1; h2 += u.hp; m2 += u.mhp || UT[u.t].hp; }
      icon = iconFor(Object.keys(c)[0] || 'sol'); nm = `${GS.sel.size} eenheden`; hp = h2 / Math.max(1, m2);
      chips = Object.entries(c).map(([t, n]) => `<button class="zr-ichip" data-t="${t}"><img src="${iconFor(t)}" alt="">${n}× ${esc(UT[t].nm)}</button>`).join('');
      desc = 'Tik op een soort om alleen die te kiezen.';
    } else {
      const t = I.k === 'type' ? I.t : I.e.t, T = BT[t] || UT[t];
      icon = iconFor(t, fac); nm = T.nm; desc = INFO[t] || T.tip || ''; facts = factsOf(t, fid, I.k === 'type');
      if (BT[t]) { const mk = makesOf(t, fid), un = unlocksOf(t, fid); if (mk.length) stat.push('<span class="zr-imk">Maakt: ' + esc(names(mk)) + '</span>'); if (un.length) stat.push('<span class="zr-imk">Nodig voor: ' + esc(names(un)) + '</span>'); }
      if (I.k === 'type') { const r = Core.techOk(S, S.human, t) ? '' : reqText(t); if (r) stat.unshift(`<span class="zr-iwarn">🔒 ${esc(r)}</span>`); }
      else {
        const e = I.e; hp = e.hp / (e.mhp || T.hp);
        if (!mine) tag = `<span class="zr-itag" style="--fc:${FAC(fac).col}">Vijand · ${esc(FAC(fac).nm)}</span>`;
        else if (I.k === 'b') {
          if (e.bp < 1) stat.unshift(`<span>🏗️ Wordt gebouwd: ${Math.round(e.bp * 100)}%</span>`);
          if (e.rep) stat.unshift('<span class="zr-igood">🔧 Wordt gerepareerd</span>');
          if (P.low && T.pw < 0) stat.unshift(`<span class="zr-iwarn">⚠ Te weinig energie: ${T.wt ? 'schiet niet' : t === 'radar' ? 'radar uit' : 'werkt langzaam'}</span>`);
          if (e.sl) facts.push('🧱 op beton');
          const q = t === 'kaz' ? P.q.i : t === 'fab' ? P.q.v : t === 'bouw' ? P.q.b : null;
          if (t === 'bouw' && P.ready) stat.unshift(`<span class="zr-igood">✓ ${esc(BT[P.ready].nm)} is klaar: tik hem aan in de bouwbalk om te plaatsen</span>`);
          else if (q && q[0]) stat.unshift(`<span>${t === 'kaz' ? 'Traint' : 'Bouwt'}: ${esc((BT[q[0].t] || UT[q[0].t]).nm)} ${Math.round(q[0].p * 100)}%${q.length > 1 ? ` (+${q.length - 1})` : ''}</span>`);
        } else if (T.harv) { stat.unshift(`<span>${esc(HS_NM[e.hs] || 'Wacht')} · lading ${Math.floor(e.car || 0)}/${T.harv}</span>`); }
      }
    }
    const hpCls = hp == null ? '' : hp > .6 ? 'ok' : hp > .3 ? 'mid' : 'low';
    el.innerHTML = `<img class="zr-iimg" src="${icon}" alt=""><div class="zr-ibody"><div class="zr-ihead"><b>${esc(nm)}</b><button class="zr-imin" aria-label="${opt.infoMin ? 'Meer uitleg' : 'Minder uitleg'}">${opt.infoMin ? '▸' : '▾'}</button>${I.k === 'type' || (!mine && I.k !== 'multi') || I.k === 'kr' ? '<button class="zr-iclose" aria-label="Sluiten">✕</button>' : ''}</div>${tag}`
      + (hp != null ? `<div class="zr-ihp ${hpCls}"><i style="width:${Math.max(2, Math.round(hp * 100))}%"></i><span>${Math.round(hp * 100)}%</span></div>` : '')
      + (opt.infoMin ? '' : `<p class="zr-idesc">${esc(desc)}</p>` + (facts.length ? `<div class="zr-ifacts">${facts.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : '') + (chips ? `<div class="zr-ichips">${chips}</div>` : ''))
      + (stat.length ? `<div class="zr-istat">${(opt.infoMin ? stat.slice(0, 1) : stat).join('')}</div>` : '') + '</div>';
    el.classList.add('on'); el.classList.toggle('min', !!opt.infoMin); placeInfo();
  }
  // keep the card just above the command buttons (they wrap to two rows on narrow screens)
  function placeInfo() { if (!E.info.classList.contains('on')) return; const st = stageEl.getBoundingClientRect(), c = E.cmd.getBoundingClientRect(); E.info.style.bottom = Math.round(c.height > 0 ? st.bottom - c.top + 6 : 8) + 'px'; }
  let infoK = '';
  function updInfo(force) {
    if (GS && GS.infoT && GS.infoTU && now() > GS.infoTU) { GS.infoT = null; GS.infoTU = 0; } const I = GS && GS.placing ? null : infoTarget(), k = infoKey(I); if (force || k !== infoK) { infoK = k; renderInfo(I); } }
  const clearInfo = () => { if (GS) { GS.info = 0; GS.infoT = null; } };

  /* ---------- the build bar ---------- */
  const buildEl = $('#zrBuild'), tabsEl = $('#zrTabs'), icons = {}, bldIcons = {};
  function iconFor(t, fac) {
    const f = fac ?? H().fac, key = f + t; if (icons[key]) return icons[key];
    const c = BT[t] ? Art.buildingIcon(RD.blds[f] || bldIcons[f] || (bldIcons[f] = Art.buildings(f)), t, 96) : Art.unitIcon(f, t, 96);
    return (icons[key] = c.toDataURL());
  }
  // soft hyphens so long names break nicely on two lines in the narrow build buttons
  const SHY = ['Energie|centrale', 'Raffina|derij', 'Opslag|silo', 'Beton|plaat', 'Voertuig|fabriek', 'Verdedigings|toren', 'Reparatie|plaats', 'Raket|paal', 'Raket|soldaat', 'Raket|werper', 'Zonne|straler', 'Bliksem|wagen', 'Verken|ner'];
  const shy = nm => { let h = esc(nm); for (const w of SHY) h = h.replace(w.replace('|', ''), w.replace('|', '&shy;')); return h; };
  const listFor = tab => (tab === 'b' ? BUILD_LIST : tab === 'i' ? INF_LIST : VEH_LIST).filter(t => (TIER[t] || 1) <= S.tier && (!UT[t] || !UT[t].fac || UT[t].fac === FAC(H().fac).id));
  let buildKey = '';
  function renderBuild(force) {
    const P = H(); if (!P) return;
    const tab = GS.tab, list = listFor(tab), q = P.q[tab];
    const k = tab + '|' + list.map(t => t + (Core.techOk(S, S.human, t) ? 1 : 0)).join(',') + '|' + P.ready + '|' + S.tier + '|' + P.fac;
    if (force || k !== buildKey) {
      buildKey = k;
      buildEl.innerHTML = list.map(t => { const T = BT[t] || UT[t]; return `<button class="zr-bi" data-t="${t}"><img src="${iconFor(t)}" alt=""><i class="zr-prog"></i><b>${shy(T.nm)}</b><small>${T.cost}</small><em></em></button>`; }).join('');
    }
    for (const el of buildEl.children) {
      const t = el.dataset.t, ok = Core.techOk(S, S.human, t), n = q.filter(x => x.t === t).length, head = q[0] && q[0].t === t ? q[0] : null;
      el.classList.toggle('lock', !ok); el.classList.toggle('ready', P.ready === t);
      el.classList.toggle('busy', !!head); el.classList.toggle('hold', !!(head && head.hold));
      if (head) el.querySelector('.zr-prog').style.setProperty('--p', Math.round(head.p * 100));
      const em = el.querySelector('em'); em.textContent = n; em.classList.toggle('on', n > (head ? 1 : 0) || (n && !head));
      const sm = el.querySelector('small'), want = P.ready === t ? 'Plaats!' : head && head.hold === 2 ? 'kristal…' : head && head.hold === 1 ? 'geen fabriek' : String((BT[t] || UT[t]).cost);
      if (sm.textContent !== want) sm.textContent = want;
    }
    tabsEl.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); const em = b.querySelector('em'), c = b.dataset.tab, busy = P.q[c].length, rd = c === 'b' && P.ready; em.textContent = rd ? '!' : busy || ''; em.classList.toggle('on', !!(rd || busy)); });
  }
  tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b || !GS) return; GS.tab = b.dataset.tab; sfx('zrClick'); renderBuild(true); });
  const reqText = t => { const T = BT[t] || UT[t], P = H(); if ((TIER[t] || 1) > S.tier) return 'nog niet in deze missie'; const miss = (T.req || []).filter(r => !P.bc[r]).map(r => BT[r].nm.toLowerCase()); return miss.length ? 'Nodig: ' + miss.join(' en ') : ''; };
  let bpT = 0, bpEl = null, bpLong = false;
  buildEl.addEventListener('pointerdown', e => { const b = e.target.closest('.zr-bi'); if (!b) return; bpEl = b; bpLong = false; clearTimeout(bpT); bpT = setTimeout(() => { bpLong = true; holdItem(b.dataset.t); }, 550); Sfx.play('__warm'); });
  const bpUp = () => { clearTimeout(bpT); };
  buildEl.addEventListener('pointerup', bpUp); buildEl.addEventListener('pointercancel', bpUp); buildEl.addEventListener('pointerleave', bpUp);
  buildEl.addEventListener('scroll', () => clearTimeout(bpT), { passive: true });
  buildEl.addEventListener('click', e => { const b = e.target.closest('.zr-bi'); if (!b || !S || bpLong) return; buildTap(b.dataset.t); });
  // hold a button: cancel what is queued, otherwise explain what it is
  function holdItem(t) {
    const P = H(), cat = Core.catOf(t);
    if ((cat === 'b' && P.ready === t) || P.q[cat].some(x => x.t === t)) { cancelItem(t); return; }
    GS.infoT = t; GS.infoTU = 0; GS.seenT[t] = 1; updInfo(true); sfx('zrClick'); vib(10);
  }
  function buildTap(t) {
    const P = H();
    if (!GS.seenT[t]) { GS.seenT[t] = 1; GS.infoT = t; GS.infoTU = now() + 7000; }
    if (!Core.techOk(S, S.human, t)) { GS.infoT = t; GS.infoTU = 0; updInfo(true); sfx('zrNo'); toast(reqText(t) || 'Nog niet beschikbaar', 'info'); return; }
    if (BT[t]) {
      if (P.ready === t) { startPlacing(t); return; }
      if (P.ready) { sfx('zrNo'); toast(`Plaats eerst de ${BT[P.ready].nm.toLowerCase()}`, 'info'); GS.tab = 'b'; renderBuild(true); return; }
    }
    if (!Core.cmd(S, S.human, { c: 'build', t })) { sfx('zrNo'); toast(Core.unitCount(S, S.human) >= UNIT_CAP - 1 ? `Maximaal ${UNIT_CAP} eenheden` : 'Wachtrij vol', 'info'); return; }
    sfx('zrClick'); renderBuild();
  }
  function cancelItem(t) {
    const P = H(), cat = Core.catOf(t);
    if (cat === 'b' && P.ready === t) { if (GS.placing) stopPlacing(); Core.cmd(S, S.human, { c: 'cancel', cat, ready: 1 }); }
    else { const q = P.q[cat]; let k = -1; for (let i = q.length - 1; i >= 0; i--) if (q[i].t === t) { k = i; break; } if (k < 0) return; Core.cmd(S, S.human, { c: 'cancel', cat, i: k }); }
    sfx('zrSell'); toast('Geannuleerd', 'info'); renderBuild(true);
  }

  /* ---------- placing a building: ghost (green / red) and a confirm button ---------- */
  function startPlacing(t) {
    const P = H(), T = BT[t], v = RD.view();
    let s = Core.findSpot(S, S.human, t, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, false) || Core.findSpot(S, S.human, t, P.base.x, P.base.y, false);
    if (!s) { const b = S.B.find(b => b.o === S.human) || P.base; s = { x: Math.round((b.x || P.base.x)), y: Math.round((b.y || P.base.y) + 3) }; }
    GS.placing = t; GS.ghost = { x: s.x, y: s.y }; GS.sel.clear(); GS.selB = 0; clearInfo();
    const c = { x: s.x + T.w / 2, y: s.y + T.h / 2 }; if (c.x < v.x0 + 1 || c.x > v.x1 - 1 || c.y < v.y0 + 1 || c.y > v.y1 - 1) RD.center(c.x, c.y);
    scr.classList.add('placing'); E.place.textContent = T.nm; updGhost(); sfx('zrClick');
  }
  function stopPlacing() { GS.placing = null; scr.classList.remove('placing'); }
  function ghostInfo() { const pt = Core.placeTiles(S, S.human, GS.placing, GS.ghost.x, GS.ghost.y); return { t: GS.placing, x: GS.ghost.x, y: GS.ghost.y, tiles: pt.tiles, ok: pt.ok, near: pt.near }; }
  function updGhost() { const g = ghostInfo(); E.placeOk.classList.toggle('no', !g.ok); }
  function moveGhost(w) { const T = BT[GS.placing]; GS.ghost.x = Math.round(w.x - T.w / 2); GS.ghost.y = Math.round(w.y - T.h / 2); updGhost(); }
  $('#zrPlaceOk').addEventListener('click', () => {
    if (!GS || !GS.placing) return; const g = ghostInfo();
    if (!g.ok) { sfx('zrNo'); toast(!g.near ? 'Te ver van je basis' : 'Alleen op vrije rots bouwen', 'info'); return; }
    if (Core.cmd(S, S.human, { c: 'place', x: g.x, y: g.y })) { stopPlacing(); renderBuild(true); vib(20); }
  });
  $('#zrPlaceNo').addEventListener('click', () => { if (GS && GS.placing) { stopPlacing(); sfx('zrClick'); } });

  /* ---------- touch on the map: tap, double tap, one-finger pan, two-finger pan + pinch, selection box ---------- */
  const ptrs = new Map(); let gest = null, lastTap = null;
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => {
    if (!GS || GS.view !== 'play' || !S) return; e.preventDefault(); Sfx.play('__warm');
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    const p = local(e); ptrs.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: now(), moved: false });
    if (ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()]; for (const q of ptrs.values()) q.moved = true;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; gest = { k: 'pinch', d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), z0: RD.cam.z, w: RD.toWorld(mx, my) }; GS.box = null; return;
    }
    if (GS.placing) { const w = RD.toWorld(p.x, p.y), T = BT[GS.placing]; if (w.x >= GS.ghost.x - .5 && w.x <= GS.ghost.x + T.w + .5 && w.y >= GS.ghost.y - .5 && w.y <= GS.ghost.y + T.h + .5) { gest = { k: 'ghost', dx: w.x - GS.ghost.x - T.w / 2, dy: w.y - GS.ghost.y - T.h / 2 }; return; } }
    if (GS.boxMode) { gest = { k: 'box' }; GS.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; return; }
    gest = { k: 'pan', cx: RD.cam.x, cy: RD.cam.y, sx: p.x, sy: p.y };
  });
  cv.addEventListener('pointermove', e => {
    const q = ptrs.get(e.pointerId); if (!q || !gest) return; const p = local(e); q.x = p.x; q.y = p.y;
    if (!q.moved && Math.hypot(p.x - q.x0, p.y - q.y0) > 9) q.moved = true;
    if (gest.k === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), [mn, mx] = RD.zoomLimits();
      RD.cam.z = Math.max(mn, Math.min(mx, gest.z0 * d / gest.d0)); const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      RD.cam.x = gest.w.x - cx / RD.cam.z; RD.cam.y = gest.w.y - cy / RD.cam.z; RD.clamp(); if (!raf) drawStill(); return;
    }
    if (!q.moved) return;
    if (gest.k === 'pan') { RD.cam.x = gest.cx - (p.x - gest.sx) / RD.cam.z; RD.cam.y = gest.cy - (p.y - gest.sy) / RD.cam.z; RD.clamp(); if (!raf) drawStill(); }
    else if (gest.k === 'box') { GS.box.x1 = p.x; GS.box.y1 = p.y; }
    else if (gest.k === 'ghost') { const w = RD.toWorld(p.x, p.y); moveGhost({ x: w.x - gest.dx, y: w.y - gest.dy }); if (!raf) drawStill(); }
  });
  const ptrEnd = e => {
    const q = ptrs.get(e.pointerId); if (!q) return; ptrs.delete(e.pointerId);
    if (!gest) return;
    if (gest.k === 'pinch') { if (ptrs.size === 1) { const r = [...ptrs.values()][0]; r.moved = true; gest = { k: 'pan', cx: RD.cam.x, cy: RD.cam.y, sx: r.x, sy: r.y }; } else if (!ptrs.size) gest = null; return; }
    if (ptrs.size) return;
    if (gest.k === 'box') { if (q.moved) finishBox(); else { GS.box = null; tap(q.x, q.y); } GS.boxMode = false; E.box.classList.remove('on'); GS.box = null; }
    else if (gest.k === 'ghost') { if (!q.moved) tap(q.x, q.y); }
    else if (!q.moved && e.type === 'pointerup') tap(q.x, q.y);
    gest = null;
  };
  cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
  cv.addEventListener('wheel', e => { if (!GS || GS.view !== 'play') return; e.preventDefault(); const p = local(e), w = RD.toWorld(p.x, p.y), [mn, mx] = RD.zoomLimits(); RD.cam.z = Math.max(mn, Math.min(mx, RD.cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); RD.cam.x = w.x - p.x / RD.cam.z; RD.cam.y = w.y - p.y / RD.cam.z; RD.clamp(); if (!raf) drawStill(); }, { passive: false });
  // what is under a tap?
  function pick(sx, sy) {
    const w = RD.toWorld(sx, sy), h = S.human, z = RD.cam.z; let best = null, bd = 1e9;
    for (const u of S.U) {
      if (u.o !== h && !RD.visAt(u.x, u.y)) continue;
      const d = Math.hypot(u.x - w.x, u.y - w.y) * z, lim = Math.max(22, UT[u.t].r * z * 1.35);
      if (d < lim && d < bd) { bd = d; best = u; }
    }
    if (best) return best;
    for (const b of S.B) if (w.x >= b.x && w.x < b.x + b.w && w.y >= b.y && w.y < b.y + b.h && (b.o === h || S.exp[Core.tileOf(S, w.x, w.y)])) return b;
    const K = S.kr; if (K && K.st !== 'gone' && RD.visAt(K.x, K.y) && Math.hypot(K.x - w.x, K.y - w.y) < 1.4) return K;
    return null;
  }
  function tap(sx, sy) {
    const w = RD.toWorld(sx, sy), h = S.human;
    if (GS.placing) { moveGhost(w); sfx('zrClick'); return; }
    if (GS.rally) { const b = S.E[GS.selB]; GS.rally = false; if (b) { Core.cmd(S, h, { c: 'rally', b: b.id, x: w.x, y: w.y }); toast('Verzamelpunt gezet', 'good'); mark(w, false); sfx('zrAck'); } return; }
    GS.sellSure = 0; GS.infoT = null;
    const e = pick(sx, sy), t = now();
    if (!(e && !GS.sel.size && (e === S.kr || (e.k && e.o !== h)))) GS.info = 0;
    if (e && e.k === 'u' && e.o === h) {
      if (GS.selB) GS.selB = 0;
      if (lastTap && lastTap.id === e.id && t - lastTap.t < 380) { selectType(e); lastTap = null; return; }
      lastTap = { id: e.id, t };
      if (GS.sel.has(e.id)) GS.sel.delete(e.id); else GS.sel.add(e.id);
      sfx('zrSel'); return;
    }
    lastTap = null;
    const ids = [...GS.sel];
    if (e && e.k === 'b' && e.o === h) {
      if (ids.length && e.t === 'rep' && ids.some(id => UT[S.E[id].t].cat === 'veh')) { Core.cmd(S, h, { c: 'repair', ids, b: e.id }); mark(Core.dockOf(e), false); sfx('zrAck'); toast('Naar de reparatieplaats', 'info'); return; }
      if (ids.length && e.t === 'raff' && ids.some(id => UT[S.E[id].t].harv)) { Core.cmd(S, h, { c: 'unload', ids, b: e.id }); mark(Core.dockOf(e), false); sfx('zrAck'); return; }
      GS.sel.clear(); GS.selB = e.id; sfx('zrSel'); return;
    }
    if (e && (e === S.kr || e.o !== h) && ids.length) {
      Core.cmd(S, h, { c: 'attack', ids, tg: e === S.kr ? -1 : e.id }); mark(e === S.kr ? e : Core.center(e), true); sfx('zrAck2'); return;
    }
    if (e && e.k && e.o !== h && !ids.length) { GS.info = GS.info === e.id ? 0 : e.id; GS.selB = 0; sfx('zrSel'); return; }
    if (e === S.kr && e) { GS.info = GS.info === -1 ? 0 : -1; GS.selB = 0; sfx('zrSel'); return; }
    if (ids.length) { Core.cmd(S, h, { c: 'move', ids, x: w.x, y: w.y }); mark(w, false); sfx('zrAck'); return; }
    if (GS.selB) { GS.selB = 0; }
  }
  function mark(p, atk) { GS.marks.push({ x: p.x, y: p.y, t: 0, atk }); }
  function selectType(u) {
    const v = RD.view(); GS.sel.clear();
    for (const x of S.U) if (x.o === S.human && x.t === u.t && x.x >= v.x0 && x.x <= v.x1 && x.y >= v.y0 && x.y <= v.y1) GS.sel.add(x.id);
    sfx('zrSel'); toast(`${GS.sel.size}× ${UT[u.t].nm}`, 'info');
  }
  function finishBox() {
    const b = GS.box, a = RD.toWorld(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1)), c = RD.toWorld(Math.max(b.x0, b.x1), Math.max(b.y0, b.y1));
    GS.sel.clear(); GS.selB = 0;
    const inBox = S.U.filter(u => u.o === S.human && u.x >= a.x && u.x <= c.x && u.y >= a.y && u.y <= c.y), army = inBox.filter(u => !UT[u.t].harv);
    for (const u of (army.length ? army : inBox)) GS.sel.add(u.id);
    if (GS.sel.size) { sfx('zrSel'); toast(`${GS.sel.size} geselecteerd`, 'info'); }
  }

  /* ---------- command buttons ---------- */
  E.box.addEventListener('click', () => { if (!GS) return; GS.boxMode = !GS.boxMode; E.box.classList.toggle('on', GS.boxMode); sfx('zrClick'); if (GS.boxMode) toast('Sleep een kader over je eenheden', 'info'); });
  $('#zrStop').addEventListener('click', () => { if (!GS || !GS.sel.size) return; Core.cmd(S, S.human, { c: 'stop', ids: [...GS.sel] }); sfx('zrAck'); });
  $('#zrDesel').addEventListener('click', () => { if (!GS) return; GS.sel.clear(); GS.selB = 0; GS.rally = false; clearInfo(); sfx('zrClick'); });
  E.info.addEventListener('click', e => {
    if (!GS || !S) return; const b = e.target.closest('button');
    if (b && b.classList.contains('zr-iclose')) { clearInfo(); sfx('zrClick'); updInfo(true); return; }
    if (b && b.classList.contains('zr-ichip')) { const t = b.dataset.t; for (const id of [...GS.sel]) if (!S.E[id] || S.E[id].t !== t) GS.sel.delete(id); sfx('zrSel'); selK = ''; updInfo(true); return; }
    if (b && b.classList.contains('zr-imin')) { opt.infoMin = !opt.infoMin; saveOpt(); sfx('zrClick'); updInfo(true); }
  });
  E.rep.addEventListener('click', () => { const b = GS && S.E[GS.selB]; if (!b) return; if (b.hp >= b.mhp) { toast('Dit gebouw is heel', 'info'); return; } Core.cmd(S, S.human, { c: 'brep', b: b.id }); sfx('zrClick'); selK = ''; });
  E.sell.addEventListener('click', () => {
    const b = GS && S.E[GS.selB]; if (!b) return;
    if (!GS.sellSure) { GS.sellSure = 1; selK = ''; sfx('zrClick'); setTimeout(() => { if (GS && GS.sellSure) { GS.sellSure = 0; selK = ''; } }, 2500); return; }
    GS.sellSure = 0; Core.cmd(S, S.human, { c: 'sell', b: b.id }); GS.selB = 0; selK = '';
  });
  $('#zrRally').addEventListener('click', () => { if (!GS || !GS.selB) return; GS.rally = true; toast('Tik waar nieuwe eenheden heen gaan', 'info'); sfx('zrClick'); });
  $('#zrAll').addEventListener('click', () => {
    if (!GS || !S) return; const h = S.human, army = S.U.filter(u => u.o === h && UT[u.t].wt);
    if (!army.length) { toast('Je hebt nog geen leger', 'info'); sfx('zrNo'); return; }
    const cx = army.reduce((a, u) => a + u.x, 0) / army.length, cy = army.reduce((a, u) => a + u.y, 0) / army.length;
    let tg = null, bd = 1e9;
    for (const b of S.B) if (b.o !== h && S.exp[b.y * S.W + b.x]) { const d = Math.hypot(b.x - cx, b.y - cy); if (d < bd) { bd = d; tg = Core.center(b); } }
    if (!tg) for (const u of S.U) if (u.o !== h && RD.visAt(u.x, u.y)) { const d = Math.hypot(u.x - cx, u.y - cy); if (d < bd) { bd = d; tg = u; } }
    if (!tg) { toast('Nog geen vijand gevonden. Verken eerst de kaart!', 'info'); sfx('zrNo'); return; }
    Core.cmd(S, h, { c: 'amove', ids: army.map(u => u.id), x: tg.x, y: tg.y }); mark(tg, true); sfx('zrAck2'); toast('Allemaal: aanvallen!', 'bad'); vib(25);
  });
  // control groups: tap = select (tap again: camera there); hold = save the current selection
  document.querySelectorAll('#zrCmd .zr-g').forEach(el => {
    let t = 0, long = false;
    el.addEventListener('pointerdown', () => { long = false; clearTimeout(t); t = setTimeout(() => { long = true; saveGroup(+el.dataset.g); }, 550); });
    const up = () => clearTimeout(t); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    el.addEventListener('click', () => { if (long || !GS) return; const g = +el.dataset.g, L = GS.groups[g];
      if (!L.length) { if (GS.sel.size) saveGroup(g); else toast('Kies eenheden en houd de knop vast om een groep te maken', 'info'); return; }
      const same = L.length === GS.sel.size && L.every(id => GS.sel.has(id));
      GS.sel = new Set(L); GS.selB = 0; sfx('zrSel');
      if (same) { const us = L.map(id => S.E[id]).filter(Boolean); if (us.length) RD.center(us.reduce((a, u) => a + u.x, 0) / us.length, us.reduce((a, u) => a + u.y, 0) / us.length); }
    });
  });
  function saveGroup(g) { if (!GS || !GS.sel.size) { toast('Kies eerst eenheden', 'info'); return; } GS.groups[g] = [...GS.sel]; toast(`Groep ${g + 1}: ${GS.sel.size} eenheden`, 'good'); sfx('zrDone'); vib(15); selK = ''; }
  // the minimap: tap or drag to move the camera
  const miniBox = $('#zrMiniBox');
  const miniGo = e => { if (!S || !radarOn()) return; const r = miniCv.getBoundingClientRect(), k = miniCv.width / r.width, w = RD.miniWorld((e.clientX - r.left) * k, (e.clientY - r.top) * k); if (!w) return; RD.center(w.x, w.y); if (!raf) drawStill(); miniTick(true); };
  let miniDrag = false;
  miniBox.addEventListener('pointerdown', e => { e.preventDefault(); miniDrag = true; try { miniBox.setPointerCapture(e.pointerId); } catch (er) {} miniGo(e); if (!radarOn()) toast('Bouw een radar voor het kaartje', 'info'); });
  miniBox.addEventListener('pointermove', e => { if (miniDrag) miniGo(e); });
  miniBox.addEventListener('pointerup', () => { miniDrag = false; }); miniBox.addEventListener('pointercancel', () => { miniDrag = false; });
  let miniT = 0;
  function miniTick(force) { if (!S) return; if (!force && now() - miniT < 250) return; miniT = now(); RD.mini(miniCv, S, radarOn(), GS && GS.sel); }
  // keyboard (desktop): space = pause, arrows pan, +/- zoom
  document.addEventListener('keydown', e => {
    if (current !== 'zr' || !GS || GS.view !== 'play' || anyModal()) return;
    if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Space') { e.preventDefault(); openPause(); return; }
    const d = 3; if (e.code === 'ArrowLeft') RD.cam.x -= d; else if (e.code === 'ArrowRight') RD.cam.x += d; else if (e.code === 'ArrowUp') RD.cam.y -= d; else if (e.code === 'ArrowDown') RD.cam.y += d;
    else if (e.key === '+' || e.key === '=') RD.cam.z = Math.min(72, RD.cam.z * 1.15); else if (e.key === '-') RD.cam.z = Math.max(RD.zoomLimits()[0], RD.cam.z / 1.15); else return;
    RD.clamp();
  });

  /* ---------- starting a match ---------- */
  function begin(cfg, meta, restored) {
    closeModals(); releaseInput();
    S = restored || Core.newGame(cfg);
    GS = { view: 'play', meta, sel: new Set(), selB: 0, info: 0, infoT: null, seenT: {}, groups: [[], [], []], tab: 'b', placing: null, ghost: null, box: null, boxMode: false, marks: [], endAt: 0, resultsUp: false, low: false, rally: false, sellSure: 0, t0: Date.now() };
    if (restored && restored._ui) { GS.groups = restored._ui.groups || GS.groups; delete restored._ui; }
    RD.setGame(S, true); hudK = objK = selK = buildKey = ''; GS.low = H().low;
    scr.classList.add('play'); scr.classList.remove('placing'); E.box.classList.remove('on');
    Sfx.track('zr', 'zr');
    fit();
    const P = H(), b = S.B.find(x => x.o === S.human && x.t === 'bouw') || S.B.find(x => x.o === S.human), u = S.U.find(x => x.o === S.human);
    RD.cam.z = 38; const c = b ? Core.center(b) : u || P.base; RD.center(c.x, c.y + (b ? 1.5 : 0));
    if (restored && meta.cam) { RD.cam.x = meta.cam.x; RD.cam.y = meta.cam.y; RD.cam.z = meta.cam.z; RD.clamp(); }
    renderBuild(true); renderSel(); hud(); miniTick(true);
    if (!restored) { stats.games++; saveStats(); toast(meta.mode === 'camp' ? MISSIONS[meta.mi].nm : `Vrij spel tegen ${S.P.length - 1} ${S.P.length > 2 ? 'facties' : 'factie'}`, 'info'); saveGame(); }
    kick();
  }
  function releaseInput() { ptrs.clear(); gest = null; }
  function startMission(i, adj = opt.adj) { begin(missionCfg(i, adj), { mode: 'camp', mi: i, adj }); }
  function startSkirmish(o) { const sk = Object.assign({ fac: opt.fac, opp: opt.opp, diff: opt.diff, size: opt.size, cry: opt.cry, kr: opt.kr }, o || {}); sk.seed = sk.seed ?? ((Math.random() * 1e9) >>> 0); begin(skirmishCfg(sk), { mode: 'skirm', sk }); }
  function restart() { if (!GS) return; const m = GS.meta; store.del('zr.save'); if (m.mode === 'camp') startMission(m.mi, m.adj); else startSkirmish(Object.assign({}, m.sk, { seed: m.sk.seed })); }

  /* ---------- saving: every 20 s of play, when pausing and when leaving ---------- */
  function saveGame() {
    if (!GS || GS.view !== 'play' || !S || S.res || window.__noSave) return;
    try { GS.meta.cam = { x: RD.cam.x, y: RD.cam.y, z: RD.cam.z }; store.set('zr.save', { v: CORE_V, meta: GS.meta, core: Core.serialize(S), groups: GS.groups, at: Date.now() }); } catch (e) {}
  }
  function loadSave() {
    const sv = store.get('zr.save', null); if (!sv || sv.v !== CORE_V) return null;
    try { const st = Core.deserialize(sv.core); if (!st) return null; st._ui = { groups: sv.groups }; return { st, meta: sv.meta }; } catch (e) { return null; }
  }
  function resume() {
    const L = loadSave(); if (!L) { store.del('zr.save'); toast('Dit potje kon niet worden geladen', 'bad'); renderStart(); return; }
    begin(null, L.meta, L.st); openPause();
  }

  /* ---------- the end ---------- */
  function finish() {
    GS.resultsUp = true; releaseInput(); stopPlacing();
    const r = S.res, P = H(), m = GS.meta, mins = S.t / TPS / 60;
    stats.harv += Math.floor(P.st.harv); stats.made += P.st.made; if (r.win) stats.wins++; else stats.losses++;
    let stars = 0, notes = [];
    if (m.mode === 'camp' && r.win) {
      const M = MISSIONS[m.mi]; stars = 1 + (mins <= M.par ? 1 : 0) + (P.st.blost === 0 ? 1 : 0);
      const old = stats.camp[m.mi] || {}; stats.camp[m.mi] = { s: Math.max(old.s || 0, stars), t: Math.min(old.t || 1e9, S.t) };
      if (!old.s && m.mi % 3 < 2) notes.push(`Nieuwe missie open: <b>${esc(MISSIONS[m.mi + 1].nm)}</b>`);
      if (!old.s && m.mi % 3 === 2) notes.push(`De veldtocht van de <b>${FAC(M.fac).nm}</b> is uitgespeeld!`);
    }
    if (m.mode === 'skirm' && r.win) { stats.skWins++; if (m.sk.opp === 2 && m.sk.diff === 2) stats.sk2Hard++; }
    saveStats(); store.del('zr.save');
    const pe = $('#zrEndPic'); pe.innerHTML = `<img src="${Art.emblemCanvas(r.win ? P.fac : (S.P.find(Q => Q.i === r.winner) || S.P[1] || P).fac, 128).toDataURL()}" alt="">`; pe.classList.remove('pop'); void pe.offsetWidth; pe.classList.add('pop');
    $('#zrEndTitle').textContent = r.win ? 'Overwinning!' : r.why === 'protect' ? 'Alle oogsters verloren' : 'Verloren';
    $('#zrEndStars').innerHTML = m.mode === 'camp' && r.win ? [1, 2, 3].map(k => `<span class="${stars >= k ? 'on' : ''}">⭐</span>`).join('') : '';
    const M = m.mode === 'camp' ? MISSIONS[m.mi] : null;
    $('#zrEndText').innerHTML = `<div class="zr-res"><div><b>${Math.floor(mins)}:${String(Math.floor(S.t / TPS % 60)).padStart(2, '0')}</b><small>tijd</small></div><div><b>${Math.floor(P.st.harv)}</b><small>kristal</small></div><div><b>${P.st.kills}</b><small>vernietigd</small></div><div><b>${P.st.lost + P.st.blost}</b><small>verloren</small></div></div>`
      + (M && r.win ? `<div>⭐ gewonnen · ${mins <= M.par ? '⭐' : '☆'} binnen ${M.par} min · ${P.st.blost === 0 ? '⭐' : '☆'} geen gebouw verloren</div>` : '')
      + (!r.win ? `<div>${r.why === 'protect' ? 'Je had geen oogster meer over.' : 'Je basis is verloren. Probeer het nog eens!'}</div>` : '')
      + (notes.length ? `<div style="margin-top:6px">${notes.join('<br>')}</div>` : '');
    const btns = m.mode === 'camp' ? [['zrEMissions', 'Missies', 0], ['zrERetry', '↻ Opnieuw', !r.win]].concat(r.win && m.mi % 3 < 2 ? [['zrENext', 'Volgende ▶', 1]] : []) : [['zrEMenu', 'Menu', 0], ['zrERetry', 'Nog een keer ▶', 1]];
    $('#zrEndBtns').innerHTML = btns.map(([id, l, p]) => `<button class="btn${p ? ' primary' : ''}" id="${id}">${l}</button>`).join('');
    setTimeout(() => sfx(r.win ? 'zrWin' : 'zrLose'), 200);
    openModal('zrEndModal');
  }
  $('#zrEndModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('zrClick'); const m = GS.meta;
    if (b.id === 'zrENext') startMission(m.mi + 1, m.adj); else if (b.id === 'zrERetry') restart(); else if (b.id === 'zrEMissions') { toMenus(); openCamp(MISSIONS[m.mi].fac); } else if (b.id === 'zrEMenu') openStart();
  });

  /* ---------- pause ---------- */
  const OPTS = { sound: ['Geluidseffecten', ''], music: ['Achtergrondmuziek', ''], big: ['Grote knoppen', ''], vib: ['Trillen', ''] };
  function optRows(keys) {
    return keys.map(k => k === 'speed' ? `<div class="opt"><div class="opt-label">Spelsnelheid</div><div class="seg">${SPEEDS.map(([v, t]) => `<button data-k="speed" data-v="${v}" class="${opt.speed === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`
      : `<div class="opt"><div class="opt-label">${OPTS[k][0]}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  }
  function onOpt(e, again) {
    const b = e.target.closest('button[data-k]'); if (!b) return false;
    const k = b.dataset.k; opt[k] = k === 'speed' ? +b.dataset.v : b.dataset.v === 'true';
    saveOpt(); Sfx.refresh && Sfx.refresh(); scr.classList.toggle('big', !!opt.big); if (k === 'big') setTimeout(fit, 30);
    sfx('zrClick'); again(); return true;
  }
  function openPause() {
    if (!GS || GS.view !== 'play' || !S || GS.resultsUp) return;
    releaseInput(); saveGame();
    const m = GS.meta, mins = Math.floor(S.t / TPS / 60);
    $('#zrPInfo').innerHTML = (m.mode === 'camp' ? `Missie ${m.mi + 1}: <b>${esc(MISSIONS[m.mi].nm)}</b>` : `Vrij spel · ${esc(FAC(H().fac).nm)} tegen ${S.P.slice(1).map(P => esc(FAC(P.fac).nm)).join(' en ')} · ${DIFFS[m.sk.diff].nm.toLowerCase()}`) + ` · ${mins}:${String(Math.floor(S.t / TPS % 60)).padStart(2, '0')}`;
    const ob = $('#zrPObj'); if (S.obj) { ob.style.display = ''; ob.innerHTML = S.obj.filter(o => o.t !== 'protect' || true).map(o => `<div class="${o.done ? 'done' : o.fail ? 'fail' : ''}">${esc(OBJ_TXT(o))}</div>`).join(''); } else ob.style.display = 'none';
    $('#zrPOpts').innerHTML = optRows(['speed', 'sound', 'music', 'big']);
    if (!$('#zrPauseModal').classList.contains('show')) closeModals();
    openModal('zrPauseModal'); sfx('zrClick');
  }
  $('#zrPause').addEventListener('click', e => { e.stopPropagation(); openPause(); });
  $('#zrPResume').addEventListener('click', () => { closeModals(); kick(); });
  $('#zrPRestart').addEventListener('click', () => { askConfirm('Opnieuw beginnen?', 'Dit potje begint dan helemaal opnieuw.', 'Opnieuw').then(y => { if (y) restart(); else if (GS && GS.view === 'play') openPause(); }); });
  $('#zrPQuit').addEventListener('click', () => { saveGame(); openStart(); });
  $('#zrPOpts').addEventListener('click', e => onOpt(e, openPause));

  /* ---------- menus: start, campaign, briefing, skirmish ---------- */
  function toMenus() {
    if (raf > 0) cancelAnimationFrame(raf); raf = 0; clearTimeout(pollT); releaseInput();
    if (GS && GS.view === 'play' && S && !S.res && !GS.resultsUp) saveGame();
    GS = { view: 'start', demo: true }; S = null; scr.classList.remove('play', 'placing');
    Sfx.track('zr', 'zrm'); drawDemo();
  }
  let demoImg = null, demoKey = '';
  function drawDemo() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20) return;
    const k = Math.round(r.width) + 'x' + Math.round(r.height);
    if (!demoImg || demoKey !== k) {
      try {
        const D = Core.newGame(skirmishCfg({ fac: 0, opp: 2, diff: 1, size: 'klein', cry: 2500, kr: true, seed: 5 })); D.human = -1; D.P.forEach(P => { P.ai = 1; AI.init(D, P); P.A.next = 1e9; });
        for (let i = 0; i < 150 * TPS; i++) Core.step(D);
        RD.setGame(D, false); RD.resize(r.width, r.height, Math.min(1.5, devicePixelRatio || 1)); RD.cam.z = 34; const b = D.B.find(b => b.o === 0 && b.t === 'bouw') || D.B[0]; RD.center(b ? b.x + 4 : 20, b ? b.y + 2 : 20);
        RD.frame(D, 1, { still: true }); demoImg = RD.snapshot(); demoKey = k; const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(demoImg, 0, 0);
      } catch (e) { console.error(e); return; }
    } else { const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(demoImg, 0, 0, cv.width, cv.height); }
  }
  function heroArt() {
    const c = $('#zrHeroCv'), g = c.getContext('2d'), W = c.width, Hh = c.height;
    const sky = g.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, '#3a1e5a'); sky.addColorStop(.45, '#e0623a'); sky.addColorStop(.75, '#f6b25a'); g.fillStyle = sky; g.fillRect(0, 0, W, Hh);
    g.fillStyle = 'rgba(255,240,190,.9)'; g.beginPath(); g.arc(W * .78, Hh * .5, 26, 0, 7); g.fill();
    for (const [y, col, amp] of [[.62, '#c8803a', 10], [.74, '#e0a050', 14], [.86, '#f0c070', 9]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, Hh); for (let x = 0; x <= W; x += 8) g.lineTo(x, Hh * y + Math.sin(x / 47 + y * 9) * amp); g.lineTo(W, Hh); g.fill(); }
    const cr = Art.crystals(); for (const [x, y, s] of [[.12, .8, 64], [.2, .86, 50], [.88, .86, 58]]) g.drawImage(cr.list[12 + Math.floor(x * 10) % 4], W * x - s / 2, Hh * y - s / 2, s, s);
    for (const [f, t, x, y, s] of [[0, 'zt', .42, .82, 70], [1, 'bliks', .6, .86, 56], [2, 'kolos', .3, .9, 64]]) g.drawImage(Art.unitIcon(f, t, s), W * x - s / 2, Hh * y - s / 2);
  }
  function renderStart() {
    const sv = store.get('zr.save', null), cont = $('#zrContinue');
    cont.hidden = !sv;
    if (sv) { const m = sv.meta; cont.innerHTML = `<span><b>Verder spelen</b><small>${m.mode === 'camp' ? `Missie ${m.mi + 1}: ${esc(MISSIONS[m.mi].nm)}` : `Vrij spel · ${esc(FAC(m.sk.fac).nm)}`}</small></span><em>Verder ▶</em>`; }
    const done = Object.keys(stats.camp).length;
    $('#zrCampSum').textContent = `${done}/${MISSIONS.length} missies · ⭐ ${stats.stars || 0}/${MISSIONS.length * 3}`;
    $('#zrOpts').innerHTML = optRows(['speed', 'sound', 'music', 'big', 'vib']);
    $('#zrStats').innerHTML = [['Potjes', stats.games], ['Gewonnen', stats.wins], ['Missies', `${done}/9`], ['Sterren', stats.stars || 0]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('')
      + `<div class="dr-line" style="grid-column:1/-1;font-size:12.5px;color:var(--muted);text-align:center">${stats.harv} kristal verzameld · ${stats.kills} vijanden vernietigd${stats.swallowed ? ` · ${stats.swallowed}× opgeslokt` : ''}</div>`;
  }
  function openStart() { closeModals(); toMenus(); heroArt(); renderStart(); openModal('zrStartModal'); }
  $('#zrContinue').addEventListener('click', () => { sfx('zrClick'); resume(); });
  $('#zrModes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; sfx('zrClick'); if (b.dataset.m === 'camp') openCamp(); else openSkirm(); });
  $('#zrOpts').addEventListener('click', e => onOpt(e, renderStart));
  $('#zrStartBack').addEventListener('click', () => { closeModals(); quit(); });
  const embUrl = {}; const emb = f => embUrl[f] || (embUrl[f] = Art.emblemCanvas(f, 96).toDataURL());
  const missionOpen = i => i % 3 === 0 || !!stats.camp[i - 1];
  // campaign map: three regions with a winding trail of nodes
  const NODES = [[.12, .7], [.22, .45], [.33, .25], [.48, .2], [.6, .38], [.72, .2], [.62, .7], [.77, .62], [.88, .82]];
  function campMap() {
    const c = $('#zrCampCv'), g = c.getContext('2d'), W = c.width, Hh = c.height;
    const bg = g.createLinearGradient(0, 0, W, Hh); bg.addColorStop(0, '#e8c27e'); bg.addColorStop(1, '#d09a58'); g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
    const R = rng(77); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${R() < .5 ? '255,240,200' : '150,100,50'},.12)`; g.fillRect(R() * W, R() * Hh, 2, 2); }
    for (let k = 0; k < 14; k++) { const y = R() * Hh; g.strokeStyle = 'rgba(160,110,60,.25)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= W; x += 10) g.lineTo(x, y + Math.sin(x / 40 + k) * 8); g.stroke(); }
    for (const [x, y, r, f] of [[.2, .48, .2, 0], [.6, .27, .2, 1], [.76, .72, .18, 2]]) {
      g.fillStyle = 'rgba(150,126,104,.75)'; g.beginPath(); for (let a = 0; a < 6.3; a += .3) g.lineTo(W * x + Math.cos(a) * W * r * (.8 + .25 * Math.sin(a * 3 + f)), Hh * y + Math.sin(a) * Hh * r * 1.5 * (.8 + .2 * Math.cos(a * 2 + f))); g.fill();
      g.globalAlpha = .18; Art.emblem(g, FAC(f).emb, W * x, Hh * y, Hh * .22, FAC(f).col, FAC(f).dk); g.globalAlpha = 1;
    }
    for (let k = 0; k < 7; k++) g.drawImage(Art.crystals().list[8 + (k % 8)], W * (.05 + R() * .9) - 16, Hh * (.1 + R() * .8) - 16, 32, 32);
    g.strokeStyle = 'rgba(90,60,30,.7)'; g.setLineDash([6, 7]); g.lineWidth = 3; g.beginPath(); NODES.forEach(([x, y], i) => i ? g.lineTo(W * x, Hh * y) : g.moveTo(W * x, Hh * y)); g.stroke(); g.setLineDash([]);
    let next = -1; for (let i = 0; i < 9; i++) if (missionOpen(i) && !stats.camp[i] && (MISSIONS[i].fac === opt.cf)) { next = i; break; }
    $('#zrNodes').innerHTML = NODES.map(([x, y], i) => { const M = MISSIONS[i], F = FAC(M.fac), st = stats.camp[i], open = missionOpen(i); return `<button class="zr-node${open ? '' : ' lock'}${i === next ? ' next' : ''}" data-i="${i}" style="left:${x * 100}%;top:${y * 100}%;background:${F.col}">${i + 1}<i>${st ? '⭐'.repeat(st.s) : open ? '' : '🔒'}</i></button>`; }).join('');
  }
  function openCamp(f) {
    if (f != null) { opt.cf = f; saveOpt(); }
    closeModals(); campMap();
    $('#zrCampFacs').innerHTML = FACTIONS.map((F, i) => `<button data-f="${i}" class="${opt.cf === i ? 'on' : ''}" style="--fc:${F.col}"><img src="${emb(i)}" alt="">${F.nm}</button>`).join('');
    $('#zrCampList').innerHTML = MISSIONS.map((M, i) => M.fac !== opt.cf ? '' : (() => { const st = stats.camp[i], open = missionOpen(i); return `<button class="zr-mcard${open ? '' : ' lock'}" data-i="${i}" style="--fc:${FAC(M.fac).col}"><span class="n">${i % 3 + 1}</span><span><b>${esc(M.nm)}</b><small>${M.obj.filter(o => o.t !== 'protect').map(OBJ_TXT).join(' · ')}</small></span><span class="st">${open ? [1, 2, 3].map(k => st && st.s >= k ? '⭐' : '☆').join('') : '🔒'}</span></button>`; })()).join('');
    openModal('zrCampModal');
  }
  $('#zrCampFacs').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; sfx('zrClick'); openCamp(+b.dataset.f); });
  const pickMission = e => { const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i; if (!missionOpen(i)) { sfx('zrNo'); toastMenu(`Haal eerst missie ${i}: ${MISSIONS[i - 1].nm}`); return; } sfx('zrClick'); openBrief(i); };
  $('#zrNodes').addEventListener('click', pickMission); $('#zrCampList').addEventListener('click', pickMission);
  $('#zrCampBack').addEventListener('click', () => { sfx('zrClick'); openStart(); });
  const toastMenu = t => menuToast ? menuToast(t, 1800) : null;
  let briefI = 0;
  function openBrief(i) {
    briefI = i; const M = MISSIONS[i], F = FAC(M.fac);
    $('#zrBriefEmb').src = emb(M.fac); $('#zrBriefSub').textContent = `${F.nm} · missie ${i % 3 + 1} van 3`; $('#zrBriefTitle').textContent = M.nm;
    $('#zrBriefText').innerHTML = M.brief.split('\n\n').map(p => `<p>${esc(p)}</p>`).join('') + `<p style="color:var(--muted);font-size:13px">${M.enemies.length ? 'Tegenstander: ' + M.enemies.map(e => FAC(e.fac).nm).join(' en ') + ' · ' : 'Geen tegenstander · '}techniek niveau ${M.tier}${M.kr ? ' · zandkruiper in de buurt' : ''} · richttijd ${M.par} min</p>`;
    $('#zrBriefObj').innerHTML = M.obj.map(o => `<div>${esc(OBJ_TXT(o))}</div>`).join('');
    $('#zrBriefDiff').innerHTML = [[-1, 'Makkelijk'], [0, 'Normaal'], [1, 'Moeilijk']].map(([v, t]) => `<button data-v="${v}" class="${opt.adj === v ? 'on' : ''}">${t}</button>`).join('');
    closeModals(); openModal('zrBriefModal');
  }
  $('#zrBriefDiff').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; opt.adj = +b.dataset.v; saveOpt(); sfx('zrClick'); openBrief(briefI); });
  $('#zrBriefBack').addEventListener('click', () => { sfx('zrClick'); openCamp(MISSIONS[briefI].fac); });
  $('#zrBriefGo').addEventListener('click', () => { sfx('zrClick'); store.del('zr.save'); startMission(briefI, opt.adj); });
  function openSkirm() {
    closeModals();
    $('#zrFCards').innerHTML = FACTIONS.map((F, i) => `<button data-f="${i}" class="${opt.fac === i ? 'on' : ''}" style="--fc:${F.col}"><img src="${emb(i)}" alt=""><b>${F.nm}</b><small>${esc(UT[F.sp].nm)}</small></button>`).join('');
    const seg = (k, list) => `<div class="opt"><div class="opt-label">${{ opp: 'Tegenstanders', diff: 'Moeilijkheid', size: 'Kaart', cry: 'Startkristal', kr: 'Zandkruiper' }[k]}</div><div class="seg">${list.map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${String(opt[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
    $('#zrSkOpts').innerHTML = seg('opp', [[1, '1'], [2, '2']]) + seg('diff', DIFFS.map((D, i) => [i, D.nm])) + seg('size', [['klein', 'Klein'], ['middel', 'Middel'], ['groot', 'Groot']]) + seg('cry', [[1000, '1000'], [2500, '2500'], [5000, '5000']]) + seg('kr', [[true, 'Aan'], [false, 'Uit']]);
    openModal('zrSkirmModal');
  }
  $('#zrFCards').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; opt.fac = +b.dataset.f; saveOpt(); sfx('zrClick'); openSkirm(); });
  $('#zrSkOpts').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, v = b.dataset.v; opt[k] = k === 'size' ? v : k === 'kr' ? v === 'true' : +v; saveOpt(); sfx('zrClick'); openSkirm(); });
  $('#zrSkBack').addEventListener('click', () => { sfx('zrClick'); openStart(); });
  $('#zrSkGo').addEventListener('click', () => { sfx('zrClick'); store.del('zr.save'); startSkirmish(); });
  // back from a non-game dialog (campaign, briefing, skirmish) lands on the start dialog again
  new MutationObserver(() => { if (current === 'zr' && GS && GS.view !== 'play' && !anyModal()) setTimeout(() => { if (current === 'zr' && GS && GS.view !== 'play' && !anyModal()) openStart(); }, 0); })
    .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('zr'); scr.classList.toggle('big', !!opt.big);
    requestAnimationFrame(() => fit());
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { scr.classList.add('play'); Sfx.track('zr', 'zr'); fit(); drawStill(); openPause(); return; }
    setTimeout(() => { if (current === 'zr') { fit(); openStart(); } }, 0);
  }
  function quit() { if (raf > 0) cancelAnimationFrame(raf); raf = 0; clearTimeout(pollT); saveGame(); releaseInput(); closeModals(); GS = null; S = null; scr.classList.remove('play', 'placing'); show('menu'); refreshMenu(); }
  // back: in a match it pauses; placing or a selection is cancelled first
  function leave() {
    if (GS && GS.view === 'play' && S && !GS.resultsUp) {
      if (GS.placing) { stopPlacing(); return; }
      if (GS.rally || GS.boxMode) { GS.rally = false; GS.boxMode = false; E.box.classList.remove('on'); return; }
      setTimeout(() => { if (current === 'zr' && !anyModal()) openPause(); }, 0); return;
    }
    if (GS && GS.view === 'play' && GS.resultsUp) { setTimeout(() => { if (current === 'zr') openStart(); }, 0); return; }
    quit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'zr' && GS && GS.view === 'play' && S && !GS.resultsUp) { saveGame(); if (!anyModal()) openPause(); } });
  addEventListener('pagehide', () => { if (current === 'zr') saveGame(); });

  /* ---------- test hooks ---------- */
  window.__zr = {
    get S() { return S; }, get G() { return GS; }, R: RD, Art, opt, stats: () => stats, Core, AI, UT, BT, MISSIONS, FACTIONS, TPS,
    startMission, startSkirmish, openStart, openPause, openCamp, openSkirm, quit, saveGame, cur: () => current, frames: () => frames.slice(), quality: () => quality,
    running: () => raf > 0 || raf === -1, manual(v) { if (GS) GS.manual = !!v; if (!v) kick(); }, step(n) { for (let i = 0; i < n && S && !S.res; i++) stepGame(); },
    cmd: c => Core.cmd(S, S.human, c), toClient(x, y) { const r = cv.getBoundingClientRect(), p = RD.toScreen(x, y); return { x: r.left + p.x, y: r.top + p.y }; },
    finite: () => [acc, lastT].every(Number.isFinite) && (!S || Core.finite(S)) && [RD.cam.x, RD.cam.y, RD.cam.z].every(Number.isFinite),
    ptrs: () => ({ n: ptrs.size, g: gest && gest.k }), sel: () => GS && GS.sel ? [...GS.sel] : [],
 miniRect: () => miniCv.getBoundingClientRect(), radarOn,
  };
  return { enter, leave, hasSave: () => !!store.get('zr.save', null) };

})();
$('#tileZr').addEventListener('click', () => Zandrijk.enter());
