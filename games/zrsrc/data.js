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
