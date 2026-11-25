/* ================================================================
   LOGIGRAM – logic grid puzzles: a hidden solution links people to pets, towns, sports, ages, bedtimes ...
   Deduce it from Dutch clues and mark ✓ / ✗ in the classic staircase grid. Endless puzzles from a generator that
   checks every puzzle with a solver that only uses logical steps; four levels and a puzzle of the day; hints that
   show the next step and why.
   ================================================================ */
const Logigram = (() => {
  /* ================= data.js: theme sets (all original, family friendly) ================= */
  // Every category describes one fact about a person. Phrases are built from small templates:
  //   v  finite verb (3rd person singular)      o  object/complement with placeholders     p  particle / tail
  //   no negative complement                     ref noun phrase for "the person with this item"
  // Placeholders: {n} the word, {ind} indefinite NP (een kat / druiven), {def} definite NP (de kat), {adj} inflected adjective.
  // Ordered categories have values (ascending) and comparison phrases [before the other person, after it].
  const DAYS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  const DAYS_SH = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  const RANK = ['eerste', 'tweede', 'derde', 'vierde', 'vijfde', 'zesde'];
  const NUMW = ['nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'];
  const clock = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  // a duration in minutes as Dutch words: een kwartier, een half uur, anderhalf uur, twee uur en een kwartier ...
  function dur(m) {
    const h = Math.floor(m / 60), r = m % 60, q = { 0: '', 15: 'een kwartier', 30: 'een half uur', 45: 'drie kwartier' }[r];
    if (!h) return q;
    if (h === 1 && r === 30) return 'anderhalf uur';
    const hs = h === 1 ? 'een uur' : `${NUMW[h]} uur`;
    if (r === 30) return `${NUMW[h]}ënhalf uur`;
    return r ? `${hs} en ${q}` : hs;
  }
  const dagen = d => d === 1 ? 'een dag' : `${NUMW[d]} dagen`;
  const plaatsen = d => d === 1 ? 'één plaats' : `${NUMW[d]} plaatsen`;
  // pick n distinct values from a list (sorted ascending afterwards)
  const pickVals = (R, list, n) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n).sort((x, y) => x - y); };
  const range = (a, b, s = 1) => { const r = []; for (let v = a; v <= b; v += s) r.push(v); return r; };
  const consec = (R, n) => { const s = Math.floor(R() * (7 - n + 1)); return range(s, s + n - 1); };

  const NAMES = {
    c: ['Anna', 'Bram', 'Cas', 'Daan', 'Eva', 'Fleur', 'Gijs', 'Hanna', 'Isa', 'Jop', 'Lotte', 'Mees', 'Noor', 'Pim', 'Roos', 'Sem', 'Tess', 'Vera', 'Wout', 'Yara', 'Zoë', 'Lars', 'Mila', 'Ruben'],
    a: ['Ans', 'Bert', 'Carla', 'Dirk', 'Els', 'Frank', 'Gerda', 'Henk', 'Ingrid', 'Jan', 'Karin', 'Leo', 'Marja', 'Niels', 'Petra', 'Rob', 'Saskia', 'Ton', 'Wim', 'Yvonne', 'Hans', 'Lies'],
  };
  const GROUP = { c: { pl: 'kinderen', sg: 'kind', label: 'Kind' }, a: { pl: 'vrienden', sg: 'vriend', label: 'Naam' } };

  const CATS = [
    { id: 'dier', g: 'ca', label: 'Huisdier', pl: 'huisdieren', v: 'heeft', o: '{ind}', no: 'geen {n}', ref: { c: 'het baasje van {def}', a: 'de eigenaar van {def}' },
      items: [['kat', 'de', '🐱'], ['hond', 'de', '🐶'], ['konijn', 'het', '🐰'], ['hamster', 'de', '🐹'], ['parkiet', 'de', '🦜'], ['schildpad', 'de', '🐢'], ['goudvis', 'de', '🐠'], ['kip', 'de', '🐔'], ['muis', 'de', '🐭']] },
    { id: 'stad', g: 'ca', label: 'Woonplaats', pl: 'woonplaatsen', v: 'woont', o: 'in {n}', no: 'niet in {n}', ref: 'degene uit {n}', noEm: true, ex: ['huis'],
      items: [['Delft'], ['Gouda'], ['Zwolle'], ['Breda'], ['Assen'], ['Leiden'], ['Hoorn'], ['Venlo'], ['Ede'], ['Sneek'], ['Tiel'], ['Lisse'], ['Weert'], ['Emmen']] },
    { id: 'sport', g: 'ca', label: 'Sport', pl: 'sporten', v: 'speelt', o: '{n}', no: 'geen {n}', ref: 'degene die {n} speelt',
      items: [['voetbal', '', '⚽'], ['hockey', '', '🏑'], ['tennis', '', '🎾'], ['volleybal', '', '🏐'], ['basketbal', '', '🏀'], ['handbal', '', '🤾'], ['badminton', '', '🏸'], ['honkbal', '', '⚾']] },
    { id: 'trui', g: 'c', label: 'Trui', pl: 'kleuren', v: 'draagt', o: 'een {adj} trui', no: 'geen {adj} trui', ref: 'degene met de {adj} trui', color: true,
      or: (a, b) => `een ${a.adj} of een ${b.adj} trui`, nor: (a, b) => `noch een ${a.adj}, noch een ${b.adj} trui`,
      items: [['rood', 'rode', '#e2433b'], ['blauw', 'blauwe', '#2f6fdc'], ['groen', 'groene', '#2fa84f'], ['geel', 'gele', '#f2c51f'], ['paars', 'paarse', '#8b4fd1'], ['oranje', 'oranje', '#f28a1f'], ['roze', 'roze', '#f27fb4'], ['wit', 'witte', '#ffffff'], ['zwart', 'zwarte', '#2b2b2b'], ['bruin', 'bruine', '#8a5a33']] },
    { id: 'auto', g: 'a', label: 'Auto', pl: 'kleuren', v: 'rijdt', o: 'in een {adj} auto', no: 'niet in een {adj} auto', ref: 'degene met de {adj} auto', color: true, ex: ['reis'],
      or: (a, b) => `in een ${a.adj} of een ${b.adj} auto`, nor: (a, b) => `noch in een ${a.adj}, noch in een ${b.adj} auto`,
      items: [['rood', 'rode', '#e2433b'], ['blauw', 'blauwe', '#2f6fdc'], ['groen', 'groene', '#2fa84f'], ['geel', 'gele', '#f2c51f'], ['grijs', 'grijze', '#8d949c'], ['wit', 'witte', '#ffffff'], ['zwart', 'zwarte', '#2b2b2b'], ['oranje', 'oranje', '#f28a1f']] },
    { id: 'fruit', g: 'c', label: 'Fruit', pl: 'fruitsoorten', v: 'neemt', o: '{ind}', no: 'geen {n}', p: 'mee', ref: 'degene met {def}',
      items: [['appel', 'de', '🍎'], ['peer', 'de', '🍐'], ['banaan', 'de', '🍌'], ['sinaasappel', 'de', '🍊'], ['kiwi', 'de', '🥝'], ['druiven', 'pl', '🍇'], ['aardbeien', 'pl', '🍓'], ['ananas', 'de', '🍍'], ['mango', 'de', '🥭'], ['kersen', 'pl', '🍒']] },
    { id: 'les', g: 'c', label: 'Les', pl: 'lessen', v: 'zit', o: 'op {n}', no: 'niet op {n}', ref: 'degene op {n}',
      items: [['tekenles', '', '🎨', 'tekenen'], ['zangles', '', '🎤', 'zingen'], ['dansles', '', '💃', 'dansen'], ['pianoles', '', '🎹', 'piano'], ['gitaarles', '', '🎸', 'gitaar'], ['zwemles', '', '🏊', 'zwemmen'], ['toneelles', '', '🎭', 'toneel'], ['judoles', '', '🥋', 'judo']] },
    { id: 'reis', g: 'ca', label: 'Vervoer', pl: 'vervoermiddelen', v: 'komt', o: 'met {def}', no: 'niet met {def}', ref: 'degene die met {def} komt', ex: ['auto'],
      items: [['fiets', 'de', '🚲'], ['step', 'de', '🛴'], ['bus', 'de', '🚌'], ['tram', 'de', '🚋'], ['trein', 'de', '🚆'], ['boot', 'de', '⛴️'], ['metro', 'de', '🚇'], ['scooter', 'de', '🛵']] },
    { id: 'knuf', g: 'c', label: 'Knuffel', pl: 'knuffels', v: 'heeft', o: '{ind}', no: 'geen {n}', ref: 'degene met {def}',
      items: [['knuffelbeer', 'de', '🧸', 'beer'], ['knuffelolifant', 'de', '🐘', 'olifant'], ['knuffelaap', 'de', '🐵', 'aap'], ['knuffeluil', 'de', '🦉', 'uil'], ['knuffelgiraf', 'de', '🦒', 'giraf'], ['knuffelleeuw', 'de', '🦁', 'leeuw'], ['knuffeleenhoorn', 'de', '🦄', 'eenhoorn'], ['knuffelpinguïn', 'de', '🐧', 'pinguïn']] },
    { id: 'baan', g: 'a', label: 'Beroep', pl: 'beroepen', v: 'is', o: '{n}', no: 'geen {n}', ref: 'de {n}',
      items: [['bakker', '', '🥖'], ['dokter', '', '🩺'], ['kapper', '', '💈'], ['piloot', '', '✈️'], ['schilder', '', '🖌️'], ['tuinier', '', '🌻'], ['visser', '', '🎣'], ['postbode', '', '📮'], ['imker', '', '🐝'], ['kok', '', '🍲']] },
    { id: 'muziek', g: 'a', label: 'Instrument', pl: 'instrumenten', v: 'speelt', o: '{n}', no: 'geen {n}', ref: 'degene die {n} speelt',
      items: [['viool', '', '🎻'], ['trompet', '', '🎺'], ['piano', '', '🎹'], ['gitaar', '', '🎸'], ['drums', '', '🥁'], ['saxofoon', '', '🎷'], ['banjo', '', '🪕']] },
    { id: 'drank', g: 'a', label: 'Drankje', pl: 'drankjes', v: 'drinkt', o: '{n}', no: 'geen {n}', ref: 'degene die {n} drinkt',
      items: [['koffie', '', '☕'], ['thee', '', '🍵'], ['melk', '', '🥛'], ['sap', '', '🧃'], ['water', '', '💧'], ['limonade', '', '🍋'], ['chocomelk', '', '🍫', 'chocomelk']] },
    // ---------- ordered categories ----------
    { id: 'jaar', g: 'ca', label: 'Leeftijd', pl: 'leeftijden', v: 'is', o: '{n}', no: 'niet {n}', p: 'jaar', pRep: true, ref: 'de {n}-jarige', noEm: true,
      ord: { vals: { c: (R, n) => pickVals(R, range(6, 12), n), a: (R, n) => pickVals(R, range(25, 70, 5), n) }, n: v => String(v), lab: v => `${v} jaar`, sh: v => `${v} jr`,
        lt: ['is jonger dan'], gt: ['is ouder dan'], dlt: d => [`is precies ${d} jaar jonger dan`], dgt: d => [`is precies ${d} jaar ouder dan`], min: 'is de jongste', max: 'is de oudste' } },
    { id: 'lang', g: 'ca', label: 'Lengte', pl: 'lengtes', v: 'is', o: '{n} cm', no: 'niet {n} cm', p: 'lang', ref: 'degene van {n} cm', noEm: true,
      ord: { vals: { c: (R, n) => pickVals(R, range(115, 160, 5), n), a: (R, n) => pickVals(R, range(155, 195, 5), n) }, n: v => String(v), lab: v => `${v} cm`, sh: v => `${v}`,
        lt: ['is kleiner dan'], gt: ['is langer dan'], dlt: d => [`is precies ${d} cm kleiner dan`], dgt: d => [`is precies ${d} cm langer dan`], min: 'is het kleinst', max: 'is het langst' } },
    { id: 'geld', g: 'c', label: 'Spaarpot', pl: 'bedragen', v: 'heeft', o: '€{n}', no: 'niet €{n}', p: 'gespaard', ref: 'degene met €{n}', noEm: true,
      ord: { vals: { c: (R, n) => pickVals(R, range(3, 20), n) }, n: v => String(v), lab: v => `€${v}`, sh: v => `€${v}`,
        lt: ['heeft minder gespaard dan'], gt: ['heeft meer gespaard dan'], dlt: d => [`heeft precies €${d} minder gespaard dan`], dgt: d => [`heeft precies €${d} meer gespaard dan`], min: 'heeft het minst gespaard', max: 'heeft het meest gespaard' } },
    { id: 'bed', g: 'c', label: 'Bedtijd', pl: 'bedtijden', v: 'gaat', o: 'om {n}', no: 'niet om {n}', p: 'naar bed', ref: 'degene die om {n} naar bed gaat', noEm: true,
      ord: { vals: { c: (R, n) => pickVals(R, range(18 * 60 + 30, 21 * 60, 15), n) }, n: clock, lab: clock, sh: clock,
        lt: ['gaat eerder naar bed dan'], gt: ['gaat later naar bed dan'], dlt: d => [`gaat precies ${dur(d)} eerder naar bed dan`], dgt: d => [`gaat precies ${dur(d)} later naar bed dan`], min: 'gaat het vroegst naar bed', max: 'gaat het laatst naar bed' } },
    { id: 'dag', g: 'c', label: 'Speeldag', pl: 'dagen', v: 'komt', o: 'op {n}', no: 'niet op {n}', p: 'spelen', ref: 'degene die op {n} komt spelen', noEm: true,
      ord: { vals: { c: consec }, n: v => DAYS[v], lab: v => DAYS[v], sh: v => DAYS_SH[v],
        lt: ['komt eerder in de week spelen dan'], gt: ['komt later in de week spelen dan'], dlt: d => [`komt ${dagen(d)} vóór`, 'spelen'], dgt: d => [`komt ${dagen(d)} na`, 'spelen'], min: 'komt het vroegst in de week spelen', max: 'komt het laatst in de week spelen' } },
    { id: 'vrij', g: 'a', label: 'Vrije dag', pl: 'dagen', v: 'is', o: 'op {n}', no: 'niet op {n}', p: 'vrij', ref: 'degene die op {n} vrij is', noEm: true,
      ord: { vals: { a: consec }, n: v => DAYS[v], lab: v => DAYS[v], sh: v => DAYS_SH[v],
        lt: ['is eerder in de week vrij dan'], gt: ['is later in de week vrij dan'], dlt: d => [`is ${dagen(d)} vóór`, 'vrij'], dgt: d => [`is ${dagen(d)} na`, 'vrij'], min: 'is het vroegst in de week vrij', max: 'is het laatst in de week vrij' } },
    // rank 1 is the best: "eerder" in the race is a lower number
    { id: 'race', g: 'ca', label: 'Finish', pl: 'plaatsen', v: 'werd', o: '{n}', no: 'niet {n}', ref: 'degene die {n} werd', noEm: true,
      ord: { vals: { c: (R, n) => range(1, n), a: (R, n) => range(1, n) }, n: v => RANK[v - 1], lab: v => `${v}e plaats`, sh: v => `${v}e`, refFirst: 'de winnaar van de race',
        lt: ['finishte vóór'], gt: ['finishte na'], dlt: d => [d === 1 ? 'finishte direct vóór' : `finishte ${plaatsen(d)} vóór`], dgt: d => [d === 1 ? 'finishte direct na' : `finishte ${plaatsen(d)} na`], min: 'won de race', max: 'werd laatste' } },
    { id: 'huis', g: 'ca', label: 'Huisnummer', pl: 'huisnummers', v: 'woont', o: 'op nummer {n}', no: 'niet op nummer {n}', ref: { c: 'degene van nummer {n}', a: 'de bewoner van nummer {n}' }, noEm: true, ex: ['stad'],
      ord: { vals: { c: (R, n) => pickVals(R, range(1, 24), n), a: (R, n) => pickVals(R, range(1, 24), n) }, n: v => String(v), lab: v => `nummer ${v}`, sh: v => `${v}`,
        lt: ['woont op een lager nummer dan'], gt: ['woont op een hoger nummer dan'], dlt: d => [`woont precies ${d} nummers lager dan`], dgt: d => [`woont precies ${d} nummers hoger dan`], min: 'woont op het laagste nummer', max: 'woont op het hoogste nummer' } },
    { id: 'op', g: 'a', label: 'Opstaan', pl: 'tijden', v: 'staat', o: 'om {n}', no: 'niet om {n}', p: 'op', ref: 'degene die om {n} opstaat', noEm: true,
      ord: { vals: { a: (R, n) => pickVals(R, range(5 * 60 + 30, 8 * 60 + 30, 15), n) }, n: clock, lab: clock, sh: clock,
        lt: ['staat eerder op dan'], gt: ['staat later op dan'], dlt: d => [`staat precies ${dur(d)} eerder op dan`], dgt: d => [`staat precies ${dur(d)} later op dan`], min: 'staat het vroegst op', max: 'staat het laatst op' } },
    { id: 'uit', g: 'a', label: 'Boodschappen', pl: 'bedragen', v: 'gaf', o: '€{n}', no: 'niet €{n}', p: 'uit', ref: 'degene die €{n} uitgaf', noEm: true,
      ord: { vals: { a: (R, n) => pickVals(R, range(4, 40), n) }, n: v => String(v), lab: v => `€${v}`, sh: v => `€${v}`,
        lt: ['gaf minder uit dan'], gt: ['gaf meer uit dan'], dlt: d => [`gaf precies €${d} minder uit dan`], dgt: d => [`gaf precies €${d} meer uit dan`], min: 'gaf het minst uit', max: 'gaf het meest uit' } },
  ];
  const CAT = {}; for (const c of CATS) CAT[c.id] = c;

  /* ================= core.js: puzzle model, logical solver, generator, Dutch clue text, hints, marks (no DOM) ================= */
  const NO = 1, YES = 2, AUTO = 3;          // marks: 0 empty, 1 ✗, 2 ✓, 3 ✗ set automatically
  const LEVELS = {
    makkelijk: { name: 'Makkelijk', K: 3, N: 4, max: 1, ord: [0, 1], w: { is: 3, not: 5, nor: 2, ext: 1.2 } },
    normaal: { name: 'Normaal', K: 4, N: 4, max: 2, ord: [1, 1], w: { is: 1.5, not: 3, nor: 2, or: 3, cmp: 3, ext: .8, list: 1 }, need: [2, 0] },
    moeilijk: { name: 'Moeilijk', K: 4, N: 5, max: 3, ord: [1, 2], w: { is: .8, not: 2, nor: 2, or: 3, cmp: 3, dif: 2.2, list: 1.2, pair: 1.6, ext: .5 }, need: [2, 1] },
    expert: { name: 'Expert', K: 5, N: 5, max: 3, ord: [2, 2], w: { is: .3, not: 1.4, nor: 2, or: 3, cmp: 3, dif: 3, list: 1.6, pair: 2, ext: .4 }, need: [3, 3], maxIs: 1 },
  };
  const LVL_KEYS = Object.keys(LEVELS);
  const CLUE_LVL = { is: 1, not: 1, nor: 1, ext: 1, or: 2, cmp: 2, list: 2, dif: 3, pair: 3 };
  // removal order when minimising: simple clues go first, so the harder ones stay
  const SIMPLE = { is: 0, ext: 1, not: 2, nor: 3, list: 4, or: 5, cmp: 6, pair: 7, dif: 8 };

  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const shuffle = (R, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const joinOr = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' of ' + a[a.length - 1];
  const joinEn = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1];
  // the daily puzzle: a seed from the date and a level per weekday (Sunday = 0)
  const DAILY_LVL = ['moeilijk', 'makkelijk', 'normaal', 'normaal', 'moeilijk', 'normaal', 'expert'];
  const dailyFor = date => ({ seed: hashStr('logigram:' + date), lvl: DAILY_LVL[new Date(date + 'T12:00:00').getDay()] });

  /* ---------- building a puzzle: categories, items, a hidden solution ---------- */
  function makeItem(cat, raw, grp) {
    if (cat.ord) return null;
    if (cat.color) return { n: raw[0], adj: raw[1], sw: raw[2], lab: raw[0], sh: raw[0] };
    const [n, g, em, sh] = raw, it = { n, g: g || '', em: em || '', lab: sh || n, sh: sh || n };
    return it;
  }
  function pickCats(R, grp, L) {
    const pool = CATS.filter(c => c.g.includes(grp));
    for (let t = 0; t < 50; t++) {
      const nOrd = L.ord[0] + Math.floor(R() * (L.ord[1] - L.ord[0] + 1));
      const ord = shuffle(R, pool.filter(c => c.ord)), plain = shuffle(R, pool.filter(c => !c.ord));
      const out = [];
      const ok = c => !out.some(o => (o.ex || []).includes(c.id) || (c.ex || []).includes(o.id));
      for (const c of ord) if (out.length < nOrd && ok(c)) out.push(c);
      for (const c of plain) if (out.length < L.K - 1 && ok(c)) out.push(c);
      if (out.length === L.K - 1) return shuffle(R, out);
    }
    throw new Error('geen categorieën');
  }
  function buildBase(R, lvl) {
    const L = LEVELS[lvl], K = L.K, N = L.N, grp = R() < .62 ? 'c' : 'a';
    const names = shuffle(R, NAMES[grp].slice()).slice(0, N).sort((a, b) => a.localeCompare(b, 'nl'));
    const cats = [{ id: 'naam', anchor: true, label: GROUP[grp].label, pl: GROUP[grp].pl, items: names.map(n => ({ n, lab: n, sh: n })) }];
    for (const C of pickCats(R, grp, L)) {
      let items;
      if (C.ord) {
        const vals = C.ord.vals[grp](R, N);
        items = vals.map(v => ({ n: C.ord.n(v), val: v, lab: C.ord.lab(v), sh: C.ord.sh(v) }));
      } else {
        items = shuffle(R, C.items.slice()).slice(0, N).map(r => makeItem(C, r, grp));
        if (!C.color) items.sort((a, b) => a.lab.localeCompare(b.lab, 'nl'));
        else items.sort((a, b) => C.items.findIndex(r => r[0] === a.n) - C.items.findIndex(r => r[0] === b.n));
      }
      cats.push({ id: C.id, ord: !!C.ord, label: C.label, pl: C.pl, items });
    }
    // the hidden solution: ent[g] = the person (index in category 0) that item g belongs to
    const ent = [];
    for (let c = 0; c < K; c++) { const p = c ? shuffle(R, [...Array(N).keys()]) : [...Array(N).keys()]; for (let i = 0; i < N; i++) ent.push(p[i]); }
    return { v: 1, lvl, K, N, grp, cats, ent, clues: [] };
  }
  const catOf = (P, g) => Math.floor(g / P.N);
  const itemOf = (P, g) => P.cats[catOf(P, g)].items[g % P.N];
  const inv = P => { const r = []; for (let c = 0; c < P.K; c++) { r.push([]); for (let i = 0; i < P.N; i++) r[c][P.ent[c * P.N + i]] = c * P.N + i; } return r; };
  const ordCats = P => P.cats.map((c, i) => c.ord ? i : -1).filter(i => i >= 0);

  /* ---------- Dutch phrases ---------- */
  function fill(t, it) {
    const g = it.g, def = g === 'pl' ? 'de ' + it.n : g ? g + ' ' + it.n : it.n, ind = g === 'pl' ? it.n : g ? 'een ' + it.n : it.n;
    return t.replace(/\{n\}/g, it.n).replace(/\{def\}/g, def).replace(/\{ind\}/g, ind).replace(/\{adj\}/g, it.adj || '');
  }
  const tpl = (P, x) => typeof x === 'object' && x ? x[P.grp] : x;
  // predicate [verb, complement, tail] about the person who has item g
  function pred(P, g, yes = true) {
    const c = P.cats[catOf(P, g)], it = itemOf(P, g);
    if (c.anchor) return ['is', yes ? it.n : 'niet ' + it.n, ''];
    const C = CAT[c.id];
    return [C.v, fill(yes ? C.o : C.no, it), C.p || ''];
  }
  const sent = a => a.filter(Boolean).join(' ');
  function ref(P, g) {
    const c = P.cats[catOf(P, g)], it = itemOf(P, g);
    if (c.anchor) return it.n;
    const C = CAT[c.id];
    if (C.ord && C.ord.refFirst && it.val === 1) return C.ord.refFirst;
    return fill(tpl(P, C.ref), it);
  }
  // short name of an item, for hints and the summary: Anna, de kat, Delft, rood, 8 jaar
  function nm(P, g) {
    const c = P.cats[catOf(P, g)], it = itemOf(P, g);
    if (c.anchor || c.ord) return it.lab;
    if (it.g === 'de' || it.g === 'het') return it.g + ' ' + it.n;
    if (it.g === 'pl') return 'de ' + it.n;
    return it.n;
  }
  // "Anna heeft een kat" / "degene uit Delft woont niet op nummer 4" (the person's name is the subject when it can be)
  function stmt(P, x, y, yes, capital = true) {
    if (catOf(P, y) === 0 && catOf(P, x) !== 0) [x, y] = [y, x];
    const s = ref(P, x) + ' ' + sent(pred(P, y, yes));
    return capital ? cap(s) : s;
  }
  // "heeft een kat of een hond", "woont noch in Delft, noch in Gouda"
  function twoOf(P, b1, b2, kind) {
    const c = P.cats[catOf(P, b1)], C = CAT[c.id], i1 = itemOf(P, b1), i2 = itemOf(P, b2);
    if (C[kind]) return sent([C.v, C[kind](i1, i2), C.p]);
    const o1 = fill(C.o, i1), o2 = fill(C.o, i2);
    return sent([C.v, kind === 'or' ? `${o1} of ${o2}` : `noch ${o1}, noch ${o2}`, C.p]);
  }
  function clueText(P, k) {
    const t = k.t, R = ref.bind(null, P);
    switch (t) {
      case 'is': return stmt(P, k.a, k.b, true) + '.';
      case 'not': return stmt(P, k.a, k.b, false) + '.';
      case 'nor': {
        const [b1, b2] = k.bs.slice().sort((x, y) => x - y);
        if (catOf(P, b1) === 0) return `Noch ${R(b1)}, noch ${R(b2)} ${sent(pred(P, k.a))}.`;
        return cap(R(k.a)) + ' ' + twoOf(P, b1, b2, 'nor') + '.';
      }
      case 'or': {
        const [b1, b2] = catOf(P, k.bs[0]) === catOf(P, k.bs[1]) ? k.bs.slice().sort((x, y) => x - y) : k.bs;
        if (catOf(P, b1) === catOf(P, b2)) {
          if (catOf(P, b1) === 0) return `${cap(R(k.a))} is ${R(b1)} of ${R(b2)}.`;
          return cap(R(k.a)) + ' ' + twoOf(P, b1, b2, 'or') + '.';
        }
        return `${cap(R(k.a))} ${sent(pred(P, b1))} of ${sent(pred(P, b2))}, maar niet allebei.`;
      }
      case 'ext': { const O = CAT[P.cats[catOf(P, k.b)].id].ord; return `${cap(R(k.a))} ${k.b % P.N === 0 ? O.min : O.max}.`; }
      case 'cmp': {
        const O = CAT[P.cats[k.o].id].ord, [x, y, ph] = k.f ? [k.b, k.a, O.gt] : [k.a, k.b, O.lt];
        return `${cap(R(x))} ${ph[0]} ${R(y)}${ph[1] ? ' ' + ph[1] : ''}.`;
      }
      case 'dif': {
        const O = CAT[P.cats[k.o].id].ord, [x, y, ph] = k.f ? [k.b, k.a, O.dlt(k.d)] : [k.a, k.b, O.dgt(k.d)];
        return `${cap(R(x))} ${ph[0]} ${R(y)}${ph[1] ? ' ' + ph[1] : ''}.`;
      }
      case 'list': {
        const G = GROUP[P.grp], refs = k.xs.map(R), n = k.xs.length;
        if (n === P.N) return `De ${NUMW[n]} ${G.pl} zijn ${joinEn(refs)}.`;
        return `${cap(joinEn(refs))} zijn ${NUMW[n]} verschillende ${G.pl}.`;
      }
      case 'pair': {
        const [x1, x2] = k.xs, [y1, y2] = k.ys, C = CAT[P.cats[catOf(P, y1)].id];
        const o1 = fill(C.o, itemOf(P, y1)), o2 = fill(C.o, itemOf(P, y2));
        return `Van ${R(x1)} en ${R(x2)} ${C.v} de een ${sent([o1, C.p])} en de ander ${C.pRep ? sent([o2, C.p]) : o2}.`;
      }
    }
    return '';
  }

  /* ---------- the truth of a clue for a complete assignment (ent: item -> person) ---------- */
  function holds(P, k, ent) {
    const N = P.N, valOf = (g, o) => { const e = ent[g]; for (let i = 0; i < N; i++) if (ent[o * N + i] === e) return P.cats[o].items[i].val; return NaN; };
    switch (k.t) {
      case 'is': case 'ext': return ent[k.a] === ent[k.b];
      case 'not': return ent[k.a] !== ent[k.b];
      case 'nor': return ent[k.a] !== ent[k.bs[0]] && ent[k.a] !== ent[k.bs[1]];
      case 'or': return catOf(P, k.bs[0]) === catOf(P, k.bs[1]) ? (ent[k.a] === ent[k.bs[0]] || ent[k.a] === ent[k.bs[1]]) : ((ent[k.a] === ent[k.bs[0]]) !== (ent[k.a] === ent[k.bs[1]]));
      case 'cmp': return valOf(k.a, k.o) < valOf(k.b, k.o);
      case 'dif': return valOf(k.a, k.o) - valOf(k.b, k.o) === k.d;
      case 'list': return new Set(k.xs.map(g => ent[g])).size === k.xs.length;
      case 'pair': { const e1 = ent[k.xs[0]], e2 = ent[k.xs[1]], f1 = ent[k.ys[0]], f2 = ent[k.ys[1]]; return e1 !== e2 && ((e1 === f1 && e2 === f2) || (e1 === f2 && e2 === f1)); }
    }
    return false;
  }

  /* ---------- the logical solver ----------
     State M (T x T, T = K·N, symmetric): 0 unknown, NO, YES for "item a and item b belong to the same person".
     Techniques, always the simplest one that makes progress first (level = difficulty):
       1  direct clues (is / is niet / noch / de eerste-laatste), elimination inside a block, transfer through a ✓ to other blocks
       2  of-clues, ouder/jonger, lists (all different), "no common option" across a third category
       3  exact differences (precies N, direct voor/na), pairs (de een … de ander), lists that name everybody
     No guessing: every deduction follows from one clue or from the grid. Options:
       max   highest technique level         M     start state (copied)          clues  [[index, clue], …] (default all)
       first stop at the first new deduction and return it as {a, b, v, why, lvl}      trace  keep every step */
  function solve(P, o = {}) {
    const K = P.K, N = P.N, T = K * N, max = o.max ?? 3, M = o.M ? Int8Array.from(o.M) : new Int8Array(T * T);
    const clues = o.clues || P.clues.map((c, i) => [i, c]);
    const need = K * (K - 1) / 2 * N, used = [0, 0, 0, 0], steps = o.trace ? [] : null;
    let yes = 0, contra = false, stop = false, step = null, lvl = 1;
    for (let a = 0; a < T; a++) for (let b = a + 1; b < T; b++) if (M[a * T + b] === YES && ((a / N) | 0) !== ((b / N) | 0)) yes++;
    const C = g => (g / N) | 0;
    function ded(a, b, v, why) {
      if (stop) return false;
      const m = M[a * T + b];
      if (m === v) return false;
      if (m) { contra = true; stop = true; return false; }
      M[a * T + b] = M[b * T + a] = v; if (v === YES) yes++;
      used[lvl]++;
      if (steps) steps.push({ a, b, v, why, lvl });
      if (o.first) { step = { a, b, v, why, lvl }; stop = true; }
      return true;
    }
    const bad = () => { contra = true; stop = true; return false; };
    function elim() {
      let any = false;
      for (let ca = 0; ca < K; ca++) for (let cb = 0; cb < K; cb++) {
        if (ca === cb) continue;
        for (let i = 0; i < N; i++) {
          const x = ca * N + i; let nYes = 0, y1 = -1, nUnk = 0, unk = -1;
          for (let j = 0; j < N; j++) { const m = M[x * T + cb * N + j]; if (m === YES) { nYes++; y1 = cb * N + j; } else if (!m) { nUnk++; unk = cb * N + j; } }
          if (nYes > 1 || (!nYes && !nUnk)) return bad();
          if (nYes === 1 && nUnk) { for (let j = 0; j < N; j++) if (!M[x * T + cb * N + j]) any = ded(x, cb * N + j, NO, ['ey', x, y1]) || any; }
          else if (!nYes && nUnk === 1) any = ded(x, unk, YES, ['el', x, cb]) || any;
          if (stop) return any;
        }
      }
      return any;
    }
    function trans() {
      let any = false;
      for (let x = 0; x < T; x++) for (let y = (C(x) + 1) * N; y < T; y++) {
        if (M[x * T + y] !== YES) continue;
        const cx = C(x), cy = C(y);
        for (let z = 0; z < T; z++) {
          const cz = C(z); if (cz === cx || cz === cy) continue;
          const mx = M[x * T + z], my = M[y * T + z];
          if (mx && !my) any = ded(y, z, mx, ['tr', y, x, z]) || any;
          else if (my && !mx) any = ded(x, z, my, ['tr', x, y, z]) || any;
          else if (mx && my && mx !== my) return bad();
          if (stop) return any;
        }
      }
      return any;
    }
    function cross() {
      let any = false;
      for (let x = 0; x < T; x++) for (let y = (C(x) + 1) * N; y < T; y++) {
        if (M[x * T + y]) continue;
        const cx = C(x), cy = C(y);
        for (let cz = 0; cz < K; cz++) {
          if (cz === cx || cz === cy) continue;
          let okz = false;
          for (let j = 0; j < N; j++) { const z = cz * N + j; if (M[x * T + z] !== NO && M[y * T + z] !== NO) { okz = true; break; } }
          if (!okz) { any = ded(x, y, NO, ['cr', x, y, cz]) || any; break; }
        }
        if (stop) return any;
      }
      return any;
    }
    const opts = (g, oc) => { if (C(g) === oc) return [g % N]; const r = []; for (let k = 0; k < N; k++) if (M[g * T + oc * N + k] !== NO) r.push(k); return r; };
    function prop(ci, k, lv) {
      let any = false;
      const d = (a, b, v, why = ['c', ci]) => { any = ded(a, b, v, why) || any; };
      switch (k.t) {
        case 'is': case 'ext': if (lv === 1) d(k.a, k.b, YES); break;
        case 'not': if (lv === 1) d(k.a, k.b, NO); break;
        case 'nor': if (lv === 1) { d(k.a, k.bs[0], NO); d(k.a, k.bs[1], NO); } break;
        case 'or': {
          if (lv !== 2) break;
          const [b1, b2] = k.bs, cb = C(b1);
          if (cb === C(b2)) { for (let j = 0; j < N; j++) { const w = cb * N + j; if (w !== b1 && w !== b2) d(k.a, w, NO); } }
          else {
            d(b1, b2, NO);
            const m1 = M[k.a * T + b1], m2 = M[k.a * T + b2];
            if (m1) d(k.a, b2, m1 === YES ? NO : YES, ['cw', ci, k.a, b1, m1]);
            if (m2) d(k.a, b1, m2 === YES ? NO : YES, ['cw', ci, k.a, b2, m2]);
          }
          break;
        }
        case 'cmp': case 'dif': {
          if (lv !== CLUE_LVL[k.t]) break;
          if (C(k.a) !== C(k.b)) d(k.a, k.b, NO);
          const oc = k.o, V = P.cats[oc].items.map(it => it.val);
          const okA = (ka, pb) => k.t === 'cmp' ? pb.some(m => ka < m) : pb.some(m => V[ka] - V[m] === k.d);
          const okB = (kb, pa) => k.t === 'cmp' ? pa.some(m => m < kb) : pa.some(m => V[m] - V[kb] === k.d);
          const pa = opts(k.a, oc), pb = opts(k.b, oc);
          if (!pa.length || !pb.length) return bad();
          for (const ka of pa) if (!okA(ka, pb)) d(k.a, oc * N + ka, NO, ['co', ci, k.b]);
          const pa2 = opts(k.a, oc);
          for (const kb of pb) if (!okB(kb, pa2)) d(k.b, oc * N + kb, NO, ['co', ci, k.a]);
          break;
        }
        case 'list': {
          if (lv === 2) { for (let i = 0; i < k.xs.length; i++) for (let j = i + 1; j < k.xs.length; j++) if (C(k.xs[i]) !== C(k.xs[j])) d(k.xs[i], k.xs[j], NO); }
          else if (lv === 3 && k.xs.length === N) {
            for (let z = 0; z < T; z++) {
              if (k.xs.includes(z)) continue;
              let n = 0, last = -1;
              for (const L of k.xs) if (C(L) !== C(z) && M[z * T + L] !== NO) { n++; last = L; }
              if (!n) return bad();
              if (n === 1) d(z, last, YES, ['lc', ci, z]);
              if (stop) break;
            }
          }
          break;
        }
        case 'pair': {
          if (lv !== 3) break;
          const [x1, x2] = k.xs, [y1, y2] = k.ys, A = C(x1), B = C(y1);
          for (let j = 0; j < N; j++) { const w = B * N + j; if (w !== y1 && w !== y2) { d(x1, w, NO); d(x2, w, NO); } }
          for (let j = 0; j < N; j++) { const w = A * N + j; if (w !== x1 && w !== x2) { d(w, y1, NO); d(w, y2, NO); } }
          const m = (p, q) => M[p * T + q];
          let ev = null, cs = 0;
          for (const [p, q, v, c] of [[x1, y1, YES, 1], [x2, y2, YES, 1], [x1, y2, NO, 1], [x2, y1, NO, 1], [x1, y2, YES, 2], [x2, y1, YES, 2], [x1, y1, NO, 2], [x2, y2, NO, 2]]) if (m(p, q) === v) { ev = [p, q, v]; cs = c; break; }
          if (cs) {
            const why = ['cw', ci, ev[0], ev[1], ev[2]];
            if (cs === 1) { d(x1, y1, YES, why); d(x2, y2, YES, why); d(x1, y2, NO, why); d(x2, y1, NO, why); }
            else { d(x1, y2, YES, why); d(x2, y1, YES, why); d(x1, y1, NO, why); d(x2, y2, NO, why); }
          }
          break;
        }
      }
      return any;
    }
    const clueTech = lv => () => { let any = false; for (const [ci, k] of clues) { if (CLUE_LVL[k.t] > lv && !(k.t === 'list' && lv === 3)) continue; any = prop(ci, k, lv) || any; if (stop) break; } return any; };
    const TECH = [[1, clueTech(1)], [1, elim], [1, trans], [2, clueTech(2)], [2, cross], [3, clueTech(3)]];
    while (!stop && (yes < need || o.full)) {
      let prog = false;
      for (const [lv, fn] of TECH) { if (lv > max) break; lvl = lv; if (fn()) { prog = true; break; } if (stop) break; }
      if (!prog) break;
    }
    return { M, solved: !contra && yes >= need, contra, step, steps, used, yes };
  }
  const known = M => { let n = 0; for (let i = 0; i < M.length; i++) if (M[i]) n++; return n; };

  /* ---------- random true clues ---------- */
  function randClue(P, R, t, I) {
    const K = P.K, N = P.N, ent = P.ent, ords = ordCats(P);
    const it = (c, e) => I[c][e], rc = (ex = []) => { const l = [...Array(K).keys()].filter(c => !ex.includes(c)); return l.length ? pick(R, l) : -1; };
    const re = (ex = []) => { const l = [...Array(N).keys()].filter(e => !ex.includes(e)); return pick(R, l); };
    const anchorFirst = () => R() < .55 ? 0 : rc();
    switch (t) {
      case 'is': { const e = re(), a = anchorFirst(), b = rc([a]); return { t, a: it(a, e), b: it(b, e) }; }
      case 'not': { const e1 = re(), e2 = re([e1]), a = anchorFirst(), b = rc([a]); return { t, a: it(a, e1), b: it(b, e2) }; }
      case 'nor': { const e = re(), a = rc(), b = R() < .35 && a !== 0 ? 0 : rc([a, 0]); if (b < 0) return null; const e1 = re([e]), e2 = re([e, e1]); return { t, a: it(a, e), bs: shuffle(R, [it(b, e1), it(b, e2)]) }; }
      case 'or': {
        const e = re(), a = anchorFirst();
        if (R() < .5) { const b = R() < .3 && a !== 0 ? 0 : rc([a, 0]); if (b < 0) return null; return { t, a: it(a, e), bs: shuffle(R, [it(b, e), it(b, re([e]))]) }; }
        const b = rc([a]), c = rc([a, b]); if (c < 0) return null;
        const bs = R() < .5 ? [it(b, e), it(c, re([e]))] : [it(b, re([e])), it(c, e)];
        return { t, a: it(a, e), bs: R() < .5 ? bs : bs.reverse() };
      }
      case 'ext': { if (!ords.length) return null; const o = pick(R, ords), k = R() < .5 ? 0 : N - 1, b = o * N + k, a = rc([o]); return { t, a: it(a, ent[b]), b }; }
      case 'cmp': case 'dif': {
        if (!ords.length) return null;
        const o = pick(R, ords), e1 = re(), e2 = re([e1]), ca = R() < .5 ? 0 : rc([o]), cb = R() < .5 ? ca : rc([o]);
        let a = it(ca, e1), b = it(cb, e2);
        const va = P.cats[o].items[it(o, e1) % N].val, vb = P.cats[o].items[it(o, e2) % N].val;
        let d = va - vb; if (d < 0) { [a, b] = [b, a]; d = -d; }
        return t === 'cmp' ? { t, a: b, b: a, o, f: R() < .5 ? 1 : 0 } : { t, a, b, o, d, f: R() < .5 ? 1 : 0 };
      }
      case 'list': {
        const n = LEVELS[P.lvl].max >= 3 && R() < .65 ? N : Math.max(3, N - 1);
        const es = shuffle(R, [...Array(N).keys()]).slice(0, n), used = {};
        const xs = es.map(e => { let c, tries = 0; do { c = Math.floor(R() * K); tries++; } while ((used[c] || 0) >= (c === 0 ? 1 : 1) && tries < 20); used[c] = (used[c] || 0) + 1; return it(c, e); });
        return { t, xs: shuffle(R, xs) };
      }
      case 'pair': {
        const A = R() < .85 ? 0 : rc(), B = rc([A, 0]); if (B < 0) return null;
        const e1 = re(), e2 = re([e1]);
        return { t, xs: [it(A, e1), it(A, e2)], ys: shuffle(R, [it(B, e1), it(B, e2)]) };
      }
    }
    return null;
  }
  const clueKey = k => k.t + ':' + [k.a, k.b, ...(k.bs || []).slice().sort(), ...(k.xs || []).slice().sort(), ...(k.ys || []).slice().sort(), k.d].join(',');

  /* ---------- the generator: add clues until the logic solver finishes, then drop every clue that is not needed ----------
     A generator function, so the app can run it in small slices (the screen never freezes) and Node can run it at once. */
  function* genIter(lvl, seed) {
    const L = LEVELS[lvl];
    let best = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const R = rng((seed + attempt * 0x9E3779B1) >>> 0);
      const P = buildBase(R, lvl), I = inv(P), T = P.K * P.N;
      const types = Object.keys(L.w).filter(t => ordCats(P).length || !['ext', 'cmp', 'dif'].includes(t)), wsum = types.reduce((s, t) => s + L.w[t], 0);
      const wpick = () => { let r = R() * wsum; for (const t of types) { r -= L.w[t]; if (r <= 0) return t; } return types[types.length - 1]; };
      let M = new Int8Array(T * T), chosen = [], keys = new Set(), fails = 0, solved = false;
      while (chosen.length < 70) {
        const k = randClue(P, R, wpick(), I); if (!k) continue;
        const key = clueKey(k); if (keys.has(key)) continue;
        if (!holds(P, k, P.ent)) throw new Error('onware aanwijzing ' + JSON.stringify(k));
        const r = solve(P, { M, clues: [...chosen.map((c, i) => [i, c]), [chosen.length, k]], max: L.max });
        if (r.contra) throw new Error('tegenspraak in de oplosser');
        if (known(r.M) === known(M) && fails++ < 300) continue;
        keys.add(key); chosen.push(k); M = r.M;
        if (r.solved) { solved = true; break; }
        if (chosen.length % 3 === 0) yield;
      }
      if (!solved) continue;
      yield;
      // minimise: try to drop each clue, simplest first
      let cur = chosen.map((c, i) => i);
      const order = cur.slice().sort((a, b) => (SIMPLE[chosen[a].t] - SIMPLE[chosen[b].t]) || (R() - .5));
      for (const i of order) {
        const trial = cur.filter(j => j !== i);
        if (solve(P, { clues: trial.map(j => [j, chosen[j]]), max: L.max }).solved) cur = trial;
        yield;
      }
      const clues = shuffle(R, cur.map(j => chosen[j]));
      P.clues = clues;
      const tr = solve(P, { max: L.max });
      const need = L.need || [0, 0], nIs = clues.filter(c => c.t === 'is').length;
      P.grade = { l1: tr.used[1], l2: tr.used[2], l3: tr.used[3], n: clues.length, attempt };
      const fits = tr.solved && tr.used[2] + tr.used[3] >= need[0] && tr.used[3] >= need[1] && (L.maxIs == null || nIs <= L.maxIs);
      const score = (tr.used[2] + 2 * tr.used[3]) - (L.maxIs != null ? Math.max(0, nIs - L.maxIs) * 5 : 0);
      if (tr.solved && (!best || score > best.score)) best = { P, score };
      if (fits) { best = { P }; break; }
    }
    if (!best) throw new Error('geen puzzel gevonden');
    const P = best.P;
    P.seed = seed >>> 0;
    for (const k of P.clues) k.txt = clueText(P, k);
    return P;
  }
  function generate(lvl, seed) { const it = genIter(lvl, seed); let r; while (!(r = it.next()).done); return r.value; }

  /* ---------- marks (the player's grid) ---------- */
  const T_ = P => P.K * P.N;
  const newMarks = P => new Array(T_(P) * T_(P)).fill(0);
  // the next mark for a tap: 'xv' empty → ✗ → ✓ → empty, 'vx' empty → ✓ → ✗ → empty, 'kies' the chosen pen (tap again to clear)
  function nextMark(cur, mode, pen) {
    if (mode === 'vx') return cur === 0 ? YES : cur === YES ? NO : 0;
    if (mode === 'kies') return (cur === pen || (pen === NO && cur === AUTO)) ? 0 : pen;
    return cur === 0 ? NO : cur === YES ? 0 : YES;
  }
  // set one cell; with auto, a ✓ crosses out the rest of its row and column inside the block (and takes those back when it goes)
  function setMark(P, mk, a, b, v, auto) {
    const T = T_(P), N = P.N, A = catOf(P, a), B = catOf(P, b), ch = [];
    const put = (x, y, nv) => { const o = mk[x * T + y]; if (o === nv) return; mk[x * T + y] = mk[y * T + x] = nv; ch.push([x, y, o, nv]); };
    const old = mk[a * T + b];
    put(a, b, v);
    if (auto && v === YES) {
      for (let j = 0; j < N; j++) { const y = B * N + j; if (y !== b && !mk[a * T + y]) put(a, y, AUTO); }
      for (let i = 0; i < N; i++) { const x = A * N + i; if (x !== a && !mk[x * T + b]) put(x, b, AUTO); }
    }
    if (old === YES && v !== YES) {
      const just = (x, y) => { for (let i = 0; i < N; i++) if (mk[(A * N + i) * T + y] === YES || mk[x * T + B * N + i] === YES) return true; return false; };
      for (let j = 0; j < N; j++) { const y = B * N + j; if (y !== b && mk[a * T + y] === AUTO && !just(a, y)) put(a, y, 0); }
      for (let i = 0; i < N; i++) { const x = A * N + i; if (x !== a && mk[x * T + b] === AUTO && !just(x, b)) put(x, b, 0); }
    }
    return ch;
  }
  const undoChanges = (P, mk, ch) => { const T = T_(P); for (let i = ch.length - 1; i >= 0; i--) { const [x, y, o] = ch[i]; mk[x * T + y] = mk[y * T + x] = o; } };
  const redoChanges = (P, mk, ch) => { const T = T_(P); for (const [x, y, , n] of ch) mk[x * T + y] = mk[y * T + x] = n; };
  const wrongMark = (P, mk, a, b) => { const m = mk[a * T_(P) + b], same = P.ent[a] === P.ent[b]; return (m === YES && !same) || ((m === NO || m === AUTO) && same); };
  // solved: every block with the names holds exactly the right ✓ marks
  function isSolved(P, mk) {
    const T = T_(P), N = P.N;
    for (let c = 1; c < P.K; c++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const g = c * N + j; if ((mk[i * T + g] === YES) !== (P.ent[g] === i)) return false; }
    return true;
  }
  // all pairs of items in different categories, block by block (for drawing, saving and checks)
  function pairs(P) { const r = [], T = T_(P); for (let a = 0; a < T; a++) for (let b = (catOf(P, a) + 1) * P.N; b < T; b++) r.push([a, b]); return r; }
  const packMarks = (P, mk) => pairs(P).map(([a, b]) => mk[a * T_(P) + b]).join('');
  function unpackMarks(P, s) { const mk = newMarks(P), T = T_(P); pairs(P).forEach(([a, b], i) => { const v = +(s || '')[i] || 0; mk[a * T + b] = mk[b * T + a] = v > 3 ? 0 : v; }); return mk; }
  // what the player's ✓ marks already link together (directly or through other ✓): per person, per category, the item or -1
  function summary(P, mk) {
    const T = T_(P), N = P.N, par = [...Array(T).keys()], f = x => par[x] === x ? x : (par[x] = f(par[x]));
    for (const [a, b] of pairs(P)) if (mk[a * T + b] === YES) par[f(a)] = f(b);
    return [...Array(N).keys()].map(i => P.cats.map((c, ci) => { if (!ci) return i; const l = []; for (let j = 0; j < N; j++) if (f(ci * N + j) === f(i)) l.push(ci * N + j); return l.length === 1 ? l[0] : -1; }));
  }

  /* ---------- hints: the next logical step from what the player already has, with the reason in words ---------- */
  function hint(P, mk) {
    const T = T_(P);
    for (const pass of [0, 1]) for (const [a, b] of pairs(P)) if ((mk[a * T + b] === AUTO) === !!pass && wrongMark(P, mk, a, b)) return { k: 'err', a, b, v: mk[a * T + b] === YES ? YES : NO, text: mk[a * T + b] === YES ? 'Dit ✓ klopt niet. Haal het weg en kijk nog eens naar de aanwijzingen.' : 'Dit ✗ klopt niet. Haal het weg en kijk nog eens naar de aanwijzingen.', refs: [], clue: -1 };
    const M = new Int8Array(T * T); for (let i = 0; i < T * T; i++) M[i] = mk[i] === YES ? YES : mk[i] ? NO : 0;
    const r = solve(P, { M, first: true, max: 3, full: true });
    if (!r.step) return null;
    return Object.assign({ k: 'step' }, r.step, explain(P, r.step, r.M, mk));
  }
  /* every hint has three parts: a name (the technique), a tip (where to look, without the answer) and the full reasoning */
  function explain(P, s, M, mk) {
    const T = T_(P), N = P.N, w = s.why, st = (x, y, v, c = true) => stmt(P, x, y, v === YES, c), conclusion = st(s.a, s.b, s.v, false);
    const okOpts = (g, oc) => { const r = []; for (let k = 0; k < N; k++) if (M[g * T + oc * N + k] !== NO) r.push(oc * N + k); return r; };
    const G = GROUP[P.grp], q = ci => `„${P.clues[ci].txt.replace(/\.$/, '')}”`, A = n => `aanwijzing ${n + 1}`;
    const plOf = c => c === 0 ? 'namen' : P.cats[c].pl, sgOf = c => c === 0 ? 'naam' : P.cats[c].label.toLowerCase();
    const inRoster = (x, y) => mk && mk[x * T + y] ? 'dat staat al in je rooster' : 'dat volgt al uit de aanwijzingen';
    switch (w[0]) {
      case 'c': {
        const k = P.clues[w[1]];
        const why = k.t === 'or' && catOf(P, k.bs[0]) === catOf(P, k.bs[1]) ? ` De aanwijzing laat voor ${ref(P, k.a)} maar twee ${plOf(catOf(P, k.bs[0]))} over, dus alle andere vallen af.`
          : k.t === 'or' ? ` Precies één van de twee is waar, dus het gaat om twee verschillende personen.`
          : k.t === 'cmp' || k.t === 'dif' ? ` Een vergelijking gaat altijd over twee verschillende personen.`
          : k.t === 'list' ? ` De genoemden zijn allemaal verschillende personen.`
          : k.t === 'pair' ? ` ${cap(joinEn(k.xs.map(x => ref(P, x))))} hebben samen ${joinEn(k.ys.map(y => nm(P, y)))}. Zij hebben dus geen andere ${plOf(catOf(P, k.ys[0]))}, en niemand anders heeft ${joinOr(k.ys.map(y => nm(P, y)))}.` : '';
        const tip = k.t === 'cmp' || k.t === 'dif' || k.t === 'list' || (k.t === 'or' && catOf(P, k.bs[0]) !== catOf(P, k.bs[1])) ? `Lees ${A(w[1])}: welke twee kunnen daardoor niet dezelfde persoon zijn?`
          : k.t === 'pair' ? `Lees ${A(w[1])}: wat betekent dat voor de anderen, en voor wat die twee verder hebben?`
          : k.t === 'or' ? `Lees ${A(w[1])}: welke ${plOf(catOf(P, k.bs[0]))} vallen daardoor af?`
          : `Lees ${A(w[1])} nog eens goed: daar staat iets in dat je direct in het rooster kunt zetten.`;
        return { name: 'Rechtstreeks uit een aanwijzing', tip,
          text: `${cap(A(w[1]))}: ${q(w[1])}.${why} Daaruit volgt: ${conclusion}. Tip: zet zulke aanwijzingen meteen in het rooster en streep ze dan door.`, refs: [], clue: w[1] };
      }
      case 'cw': return { name: 'Aanwijzing + wat je al weet', tip: `Combineer ${A(w[1])} met wat je al weet over ${ref(P, w[2])}.`,
        text: `${st(w[2], w[3], w[4])} (${inRoster(w[2], w[3])}). ${cap(A(w[1]))} zegt ${q(w[1])}. Samen volgt daaruit: ${conclusion}. Tip: kijk bij een "of"-aanwijzing steeds of je één van de twee kanten al weet.`, refs: [[w[2], w[3]]], clue: w[1] };
      case 'co': {
        const k = P.clues[w[1]], other = w[2], oc = k.o, l = []; for (let j = 0; j < N; j++) if (M[other * T + oc * N + j] !== NO) l.push(oc * N + j);
        const tip = `${cap(A(w[1]))} vergelijkt ${ref(P, k.a)} en ${ref(P, k.b)}. Kijk welke ${P.cats[oc].pl} voor elk van de twee nog kunnen, en welke daardoor onmogelijk worden.`;
        if (catOf(P, other) === oc || l.length === N) return { name: 'Vergelijken', tip, text: `${cap(A(w[1]))} zegt ${q(w[1])}. Daardoor kan dit niet: ${conclusion}. Tip: bij "ouder/jonger" of "meer/minder" vallen de uiterste waarden vaak als eerste af.`, refs: [], clue: w[1] };
        return { name: 'Vergelijken', tip,
          text: `Bij ${ref(P, other)} kan nog alleen ${joinOr(l.map(g => nm(P, g)))}. ${cap(A(w[1]))} zegt ${q(w[1])}. Dan past het niet meer: ${conclusion}. Tip: schrijf bij een vergelijking voor beide personen op wat nog kan en schuif ze tegen elkaar.`, refs: l.map(g => [other, g]), clue: w[1] };
      }
      case 'lc': {
        // a list clue that names everybody: z must be one of the named; all but one are ruled out
        const k = P.clues[w[1]], z = w[2], y = z === s.a ? s.b : s.a, zc = catOf(P, z);
        const why = L => {
          if (catOf(P, L) === zc) return `${ref(P, L)} (${zc === 0 ? 'dat is iemand anders' : `niemand heeft twee ${P.cats[zc].pl}`})`;
          return `${ref(P, L)} (${mk && mk[z * T + L] ? '✗ in je rooster' : 'dat volgt al uit de aanwijzingen'})`;
        };
        const others = k.xs.filter(L => L !== y), refs = others.filter(L => catOf(P, L) !== zc).map(L => [z, L]);
        return { name: 'Lijst met iedereen', tip: `${cap(A(w[1]))} noemt alle ${NUMW[k.xs.length]} ${G.pl}. Ieder van hen is dus één van de genoemden. Ga de ${plOf(zc)} langs die er niet in staan: bij welke kan nog maar één van de genoemden?`,
          text: `${cap(A(w[1]))} noemt alle ${NUMW[k.xs.length]} ${G.pl}: ${joinEn(k.xs.map(L => ref(P, L)))}. ${P.grp === 'c' ? 'Elk kind' : 'Elke vriend'} is dus precies één van deze ${NUMW[k.xs.length]}, ook ${ref(P, z)}. Maar ${ref(P, z)} is ${joinEn(others.map(L => 'niet ' + why(L)))}. Dan blijft er maar één over: ${ref(P, y)}. Daarom geldt: ${conclusion}. Tip: zie zo'n lijst als alle ${G.pl} op een rij. Tel bij elk ding dat er niet in staat, hoeveel genoemden nog kunnen; blijft er één over, dan heb je een ✓.`, refs, clue: w[1] };
      }
      case 'ey': {
        const c = P.cats[catOf(P, w[2])];
        return { name: 'Eén ✓ per rij', tip: `Kijk bij ${ref(P, w[1])} naar de ${c.pl}: daar staat al een ✓.`,
          text: `${st(w[1], w[2], YES)}. Iedereen heeft maar één van de ${c.pl}, dus alle andere ${c.pl} vallen af: ${conclusion}. Tip: zet je een ✓, streep dan meteen de rest van die rij en kolom in het blokje weg.`, refs: [[w[1], w[2]]], clue: -1 };
      }
      case 'el': {
        const x = w[1], y = x === s.a ? s.b : s.a, c = P.cats[w[2]];
        return { name: 'Laatste vakje', tip: `Kijk bij ${ref(P, x)} naar de ${c.pl}: hoeveel zijn er nog over?`,
          text: `Bij ${ref(P, x)} zijn alle ${c.pl} behalve ${nm(P, y)} al weggestreept. In elke rij van een blokje hoort precies één ✓, dus die moet hier: ${conclusion}.`, refs: [], clue: -1 };
      }
      case 'tr': return { name: '✓ overnemen', tip: `${cap(ref(P, w[1]))} en ${ref(P, w[2])} zijn dezelfde persoon (✓). Wat weet je al over de één dat ook voor de ander geldt?`,
        text: `${st(w[1], w[2], YES)} en ${st(w[2], w[3], M[w[2] * T + w[3]], false)}. Een ✓ betekent: dezelfde persoon. Alles wat je van de één weet, geldt dus ook voor de ander: ${conclusion}. Tip: kijk na elke ✓ in de andere blokjes wat je kunt overnemen.`, refs: [[w[1], w[2]], [w[2], w[3]]], clue: -1 };
      case 'cr': {
        const [x, y, cz] = w.slice(1), ox = okOpts(x, cz), oy = okOpts(y, cz);
        return { name: 'Niets gemeenschappelijk', tip: `Vergelijk wat bij de ${P.cats[cz].pl} nog mogelijk is voor ${ref(P, x)} en voor ${ref(P, y)}.`,
          text: `Bij de ${P.cats[cz].pl} kan voor ${ref(P, x)} alleen nog ${joinOr(ox.map(g => nm(P, g)))}, en voor ${ref(P, y)} alleen nog ${joinOr(oy.map(g => nm(P, g)))}. Daar zit niets hetzelfde tussen, dus het kunnen geen dezelfde persoon zijn: ${conclusion}.`, refs: [...ox.map(g => [x, g]), ...oy.map(g => [y, g])], clue: -1 };
      }
    }
    return { name: 'Volgende stap', tip: 'Kijk nog eens naar de aanwijzingen en je rooster.', text: conclusion + '.', refs: [], clue: -1 };
  }

  const Core = { NO, YES, AUTO, LEVELS, LVL_KEYS, CLUE_LVL, rng, hashStr, dailyFor, buildBase, generate, genIter, solve, holds, clueText, stmt, ref, nm, pred, catOf, itemOf, inv,
    newMarks, nextMark, setMark, undoChanges, redoChanges, wrongMark, isSolved, pairs, packMarks, unpackMarks, summary, hint, explain, randClue, known };

  /* ================= ui.js: screens, the grid (canvas with pan and pinch-zoom), clues, hints, timer, save/resume ================= */
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LV = LEVELS;
  const opt = Object.assign({ sound: true, tap: 'xv', auto: true, err: false, lvl: 'makkelijk', pen: YES, lines: false }, store.get('lg.settings', {}));
  Sfx.gate('lg', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('lg.settings', opt);
  let stats = Object.assign({ played: 0, won: 0, wonBy: {}, best: {}, hints: 0, noHint: 0, hardNoHint: 0, expert: 0, dailyWon: 0, daily: {}, time: 0 }, store.get('lg.stats', {}));
  const saveStats = () => store.set('lg.stats', stats);
  const sfx = n => { if (opt.sound) Sfx.play(n); };
  const scr = $('#lg'), box = $('#lgBox'), cv = $('#lgCv'), pulse = $('#lgPulse');
  let g = cv.getContext('2d');
  const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Color Emoji",sans-serif';
  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmt = s => { s = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
  const big = () => document.documentElement.classList.contains('big-text');
  const LDESC = { makkelijk: 'Is en is niet', normaal: 'Ouder, jonger en of', moeilijk: 'Precies, paren en lijsten', expert: 'Alles door elkaar' };
  // paper and ink
  const C = { paper: '#fffaf0', paper2: '#f8efdc', line: '#dccfb3', block: '#4d4134', ink: '#2c2620', head: '#6b5a45', sel: 'rgba(255,205,70,.28)', selH: '#ffe7a3', hint: '#ffd75e', ref: 'rgba(80,190,150,.25)', yes: '#2a9d6f', no: '#55626e', auto: '#aab4bd', bad: '#e04848', badBg: '#fde1e1', chk: '#d63a3a' };

  /* ---------- game state ----------
     S = { P (the puzzle), mk (marks), t (seconds), hints, undo [[changes]], redo, struck [clue -> bool], daily (date or null), lvl, done } */
  let S = null, busy = false, hintS = null, sel = null, tab = 'c', raf = 0, animEnd = 0, lastGen = 0, timer = 0, lastTick = 0, saveT = 0, toastT = 0;
  const anim = new Map();                       // cell key -> [start, delay]
  const V = { W: 0, H: 0, dpr: 1, cs: 36, ox: 0, oy: 0, fit: false, ready: false };
  let Lay = null;

  /* ---------- layout: header sizes from the labels, cell size from the room, pan limits ---------- */
  const labText = it => (it.em ? it.em + ' ' : '') + it.sh;
  function labW(it, fs) { g.font = `600 ${fs}px ${FONT}`; return g.measureText(labText(it)).width + (it.sw ? fs + 4 : 0); }
  function layout(keep) {
    const r = box.getBoundingClientRect(); if (r.width < 40 || r.height < 40 || !S) return false;
    const P = S.P, K = P.K, N = P.N, B = big(), land = innerWidth > innerHeight;
    V.W = r.width; V.H = r.height; V.dpr = Math.min(devicePixelRatio || 1, 2.5);
    cv.width = Math.round(V.W * V.dpr); cv.height = Math.round(V.H * V.dpr); cv.style.width = V.W + 'px'; cv.style.height = V.H + 'px';
    const fs = B ? 15 : 13, cat = B ? 21 : 18, gap = 5, rows = [0], cols = [];
    for (let c = K - 1; c >= 2; c--) rows.push(c); for (let c = 1; c < K; c++) cols.push(c);
    const maxLab = cs => Math.max(...cs.map(c => Math.max(...P.cats[c].items.map(it => labW(it, fs)))));
    const leftW = cat + Math.min(B ? 118 : 100, maxLab(rows) + 12), topH = cat + Math.min(land ? (B ? 100 : 88) : (B ? 112 : 100), maxLab(cols) + 12);
    const ncell = (K - 1) * N, aw = V.W - leftW - 10, ah = V.H - topH - 10;
    const fitAll = Math.max(10, Math.min((aw - (K - 2) * gap) / ncell, (ah - (K - 2) * gap) / ncell));
    const minCs = B ? 40 : 34, cs0 = Math.min(60, Math.max(minCs, fitAll));
    Lay = { K, N, fs, cat, gap, rows, cols, leftW, topH, ncell, fitAll, cs0, minZ: Math.min(fitAll, cs0), maxZ: 80 };
    if (!keep || !V.ready) { V.cs = V.fit ? fitAll : cs0; V.ox = 0; V.oy = 0; }
    V.cs = clamp(V.cs, Lay.minZ, Lay.maxZ); clampPan(); V.ready = true; spr.clear();
    $('#lgFit').classList.toggle('on', V.cs <= fitAll + .5 && fitAll < cs0 - .5);
    return true;
  }
  const contentW = () => Lay.ncell * V.cs + (Lay.K - 2) * Lay.gap;
  const step = () => Lay.N * V.cs + Lay.gap;
  function base() { const cw = contentW(); return { x: Math.max(4, Math.round((V.W - Lay.leftW - cw - 2) / 2)), y: Math.max(4, Math.round((V.H - Lay.topH - cw - 2) / 2)) }; }
  function clampPan() {
    if (!Lay) return; const cw = contentW(), b = base(), aw = V.W - b.x - Lay.leftW - 4, ah = V.H - b.y - Lay.topH - 4;
    V.ox = clamp(V.ox, Math.min(0, aw - cw), 0); V.oy = clamp(V.oy, Math.min(0, ah - cw), 0);
  }
  // rows: names first, then the categories from the last one down; columns: categories 1..K-1
  function blockOf(a, b) {
    const N = Lay.N, A = Math.floor(a / N), B = Math.floor(b / N);
    const rc = A === 0 || B === 0 ? 0 : Math.max(A, B), x = rc === A ? a : b, y = rc === A ? b : a;
    return { ri: Lay.rows.indexOf(rc), ci: Lay.cols.indexOf(Math.floor(y / N)), r: x % N, c: y % N, a: x, b: y };
  }
  function cellRect(a, b) { const q = blockOf(a, b), B = base(); return { x: B.x + Lay.leftW + V.ox + q.ci * step() + q.c * V.cs, y: B.y + Lay.topH + V.oy + q.ri * step() + q.r * V.cs, s: V.cs }; }
  function hit(px, py) {
    if (!Lay) return null;
    const B = base(), x0 = B.x + Lay.leftW, y0 = B.y + Lay.topH, st = step(), N = Lay.N;
    const at = (u, n) => { if (u < 0) return null; const i = Math.floor(u / st), w = u - i * st; return i < n && w < N * V.cs ? [i, Math.floor(w / V.cs)] : null; };
    const C = at(px - x0 - V.ox, Lay.cols.length), R = at(py - y0 - V.oy, Lay.rows.length);
    if (px >= x0 && py >= y0) return C && R && R[0] + C[0] <= Lay.K - 2 ? { k: 'cell', a: Lay.rows[R[0]] * N + R[1], b: Lay.cols[C[0]] * N + C[1] } : null;
    if (py < y0 && py >= B.y && px >= x0 && C) return { k: 'col', g: Lay.cols[C[0]] * N + C[1] };
    if (px < x0 && px >= B.x && py >= y0 && R) return { k: 'row', g: Lay.rows[R[0]] * N + R[1] };
    return null;
  }
  // pan so a cell is in view (for hints)
  function reveal(a, b) {
    if (!Lay) return; const r = cellRect(a, b), B = base(), x0 = B.x + Lay.leftW, y0 = B.y + Lay.topH;
    if (r.x < x0 + 2 || r.x + r.s > V.W - 4) V.ox += (x0 + (V.W - x0) / 2) - (r.x + r.s / 2);
    if (r.y < y0 + 2 || r.y + r.s > V.H - 4) V.oy += (y0 + (V.H - y0) / 2) - (r.y + r.s / 2);
    clampPan(); need();
  }
  function setZoom(cs, px, py) {
    const B0 = base(), cw0 = contentW(), rx = (px - B0.x - Lay.leftW - V.ox) / cw0, ry = (py - B0.y - Lay.topH - V.oy) / cw0;
    V.cs = clamp(cs, Lay.minZ, Lay.maxZ);
    const B1 = base(), cw1 = contentW();
    V.ox = px - B1.x - Lay.leftW - rx * cw1; V.oy = py - B1.y - Lay.topH - ry * cw1;
    clampPan(); $('#lgFit').classList.toggle('on', V.cs <= Lay.fitAll + .5 && Lay.fitAll < Lay.cs0 - .5); need();
  }

  /* ---------- drawing (only when something changed; a short loop only while a mark pops) ---------- */
  const need = () => { if (!raf) raf = requestAnimationFrame(draw); };
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // sprites: header labels and marks are drawn once into small canvases and then only copied (fast on slow phones)
  const spr = new Map();
  function sprite(key, w, h, paint) {
    let c = spr.get(key); if (c) return c;
    if (spr.size > 600) spr.clear();
    c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * V.dpr)); c.height = Math.max(1, Math.ceil(h * V.dpr));
    const keep = g; g = c.getContext('2d'); g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    try { paint(); } finally { g = keep; }
    spr.set(key, c); return c;
  }
  const mw = new Map();
  const measure = t => { const k = g.font + '|' + t; let w = mw.get(k); if (w == null) { w = g.measureText(t).width; if (mw.size > 2000) mw.clear(); mw.set(k, w); } return w; };
  function rowLab(it, x, y, maxW, fs, bold) {
    const h = Math.ceil(fs * 1.7), c = sprite(`r${bold ? 1 : 0}${fs}|${maxW}|${it.em || it.sw || ''}${it.sh}`, maxW, h, () => label(it, maxW, h / 2, maxW, fs, 'right', bold));
    g.drawImage(c, x - maxW, y - h / 2, maxW, h);
  }
  function colLab(it, cx, yb, maxH, fs, bold) {
    const w = Math.ceil(fs * 1.9), c = sprite(`c${bold ? 1 : 0}${fs}|${maxH}|${it.em || it.sw || ''}${it.sh}`, w, maxH, () => colLabel(it, w / 2, maxH, maxH, fs, bold));
    g.drawImage(c, cx - w / 2, yb - maxH, w, maxH);
  }
  // marks: one sprite per kind and size step (4 px), scaled to the exact cell size, so zooming does not repaint them all
  function markSpr(m, s, bad) {
    const q = Math.max(8, Math.ceil(s / 4) * 4);
    return sprite(`m${m}${bad ? 1 : 0}|${q}`, q, q, () => mark(0, 0, q, m, 1, bad));
  }
  // a wrong mark found by "Controleer": red diagonal stripes and a red frame
  function hatchSpr(s) {
    const q = Math.max(8, Math.ceil(s / 4) * 4);
    return sprite(`h|${q}`, q, q, () => {
      g.save(); g.beginPath(); g.rect(1, 1, q - 2, q - 2); g.clip();
      g.fillStyle = 'rgba(224,72,72,.16)'; g.fillRect(0, 0, q, q);
      g.strokeStyle = 'rgba(214,58,58,.7)'; g.lineWidth = Math.max(1.5, q * .085); g.beginPath();
      for (let k = -q; k < q * 2; k += q / 4.5) { g.moveTo(k, q); g.lineTo(k + q, 0); }
      g.stroke(); g.restore();
      g.strokeStyle = C.chk; g.lineWidth = Math.max(2, q * .08); g.strokeRect(2, 2, q - 4, q - 4);
    });
  }
  function fitText(t, w) { if (measure(t) <= w) return t; while (t.length > 1 && measure(t + '…') > w) t = t.slice(0, -1); return t + '…'; }
  function label(it, x, y, maxW, fs, align, bold) {
    g.font = `${bold ? 800 : 600} ${fs}px ${FONT}`; g.textBaseline = 'middle';
    let sw = it.sw ? fs + 4 : 0, txt = fitText(labText(it), maxW - sw), w = measure(txt) + sw, sx = align === 'right' ? x - w : x;
    if (it.sw) { g.fillStyle = it.sw; g.beginPath(); g.arc(sx + fs * .45, y, fs * .42, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); }
    g.fillStyle = bold ? '#1a140e' : C.ink; g.textAlign = 'left'; g.fillText(txt, sx + sw, y + .5);
  }
  // a column label: the emoji (or colour) upright just above the grid, the word rotated above it
  function colLabel(it, cx, yb, maxH, fs, bold) {
    let y = yb;
    if (it.em || it.sw) {
      const s = fs + 3;
      if (it.sw) { g.fillStyle = it.sw; g.beginPath(); g.arc(cx, y - s / 2, fs * .42, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); }
      else { g.font = `${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink; g.fillText(it.em, cx, y - s / 2 + 1); }
      y -= s + 3;
    }
    g.save(); g.translate(cx, y); g.rotate(-Math.PI / 2); g.font = `${bold ? 800 : 600} ${fs}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = bold ? '#1a140e' : C.ink;
    g.fillText(fitText(it.sh, maxH - (yb - y)), 0, .5); g.restore();
  }
  const ease = t => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  function mark(x, y, s, m, k, bad) {
    const cx = x + s / 2, cy = y + s / 2;
    if (bad) { g.fillStyle = C.badBg; g.fillRect(x + 1, y + 1, s - 2, s - 2); }
    if (!m) return;
    g.save(); g.translate(cx, cy); g.scale(k, k);
    if (m === YES) {
      g.fillStyle = bad ? C.bad : C.yes; g.beginPath(); g.arc(0, 0, s * .32, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, s * .085); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-s * .14, s * .01); g.lineTo(-s * .04, s * .11); g.lineTo(s * .15, -s * .1); g.stroke();
    } else {
      const d = s * (m === AUTO ? .16 : .2); g.strokeStyle = bad ? C.bad : m === AUTO ? C.auto : C.no; g.lineWidth = Math.max(1.5, s * (m === AUTO ? .055 : .075)); g.lineCap = 'round';
      g.beginPath(); g.moveTo(-d, -d); g.lineTo(d, d); g.moveTo(d, -d); g.lineTo(-d, d); g.stroke();
    }
    g.restore();
  }
  /* Lijnen: connect the ✓'s that belong together. ✓'s of the same name (row) are joined sideways, ✓'s of the same item (column)
     up and down; every group of things that are already tied together gets its own colour and a ring around its ✓'s */
  const PAL = ['#e4572e', '#2e7dd7', '#8e44ad', '#12a07f', '#d48a00', '#c2185b'];
  let LN = { segs: 0, groups: 0 };
  function drawLines() {
    const P = S.P, T = P.K * P.N, mk = S.mk, par = new Map(), root = x => { while (par.get(x) !== x) x = par.get(x); return x; };
    const yes = [];
    for (const [a, b] of Core.pairs(P)) if (mk[a * T + b] === YES) {
      yes.push([a, b]); for (const x of [a, b]) if (!par.has(x)) par.set(x, x);
      const ra = root(a), rb = root(b); if (ra !== rb) par.set(ra, rb);
    }
    LN = { segs: 0, groups: 0 };
    if (yes.length < 2) return;
    const rows = new Map(), cols = new Map(), size = new Map();
    for (const [a] of yes) size.set(root(a), (size.get(root(a)) || 0) + 1);
    for (const [a, b] of yes) {
      const q = blockOf(a, b), r = cellRect(a, b), c = { x: r.x + r.s / 2, y: r.y + r.s / 2, g: root(a) };
      if (!rows.has(q.a)) rows.set(q.a, []); rows.get(q.a).push(c);
      if (!cols.has(q.b)) cols.set(q.b, []); cols.get(q.b).push(c);
    }
    const groups = [...size.keys()].filter(k => size.get(k) > 1).sort((x, y) => x - y), colr = k => PAL[groups.indexOf(k) % PAL.length];
    const rad = V.cs * .36;
    g.save(); g.lineCap = 'round'; g.lineWidth = Math.max(2.5, V.cs * .1); g.globalAlpha = .8;
    const seg = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy); if (L < rad * 2.2) return; const ux = dx / L, uy = dy / L; g.beginPath(); g.moveTo(p.x + ux * rad, p.y + uy * rad); g.lineTo(q.x - ux * rad, q.y - uy * rad); g.stroke(); LN.segs++; };
    for (const [list, key] of [[rows, 'x'], [cols, 'y']]) for (const L of list.values()) {
      if (L.length < 2) continue;
      L.sort((p, q) => p[key] - q[key]); g.strokeStyle = colr(L[0].g);
      for (let k = 1; k < L.length; k++) seg(L[k - 1], L[k]);
    }
    g.globalAlpha = 1; g.lineWidth = Math.max(2, V.cs * .07);
    for (const [a, b] of yes) { const k = root(a); if (size.get(k) < 2) continue; const r = cellRect(a, b); g.strokeStyle = colr(k); g.beginPath(); g.arc(r.x + r.s / 2, r.y + r.s / 2, rad, 0, 7); g.stroke(); }
    g.restore(); LN.groups = groups.length;
  }
  const DS = { n: 0, ms: 0, max: 0 };
  function draw() {
    raf = 0;
    if (!S || !Lay || current !== 'lg') return;
    const t0 = now();
    const t = now(), P = S.P, N = P.N, T = P.K * N, cs = V.cs, B = base(), st = step(), mk = S.mk;
    const x0 = B.x + Lay.leftW, y0 = B.y + Lay.topH, cw = contentW();
    const cardW = Math.min(V.W - B.x - 4, Lay.leftW + cw + 2), cardH = Math.min(V.H - B.y - 4, Lay.topH + cw + 2);
    g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); g.clearRect(0, 0, V.W, V.H);
    g.fillStyle = 'rgba(0,0,0,.16)'; rr(B.x - 2, B.y + 1, cardW + 4, cardH + 6, 14); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; rr(B.x, B.y + 2, cardW, cardH + 2, 12); g.fill();
    g.fillStyle = C.paper; rr(B.x, B.y, cardW, cardH, 12); g.fill();
    const hs2 = hintS && hintS.stage === 2 ? hintS : null, selRow = sel ? blockOf(sel.a, sel.b) : null, hb = hs2 ? blockOf(hs2.a, hs2.b) : null;
    const refSet = new Set((hs2 && hs2.refs || []).map(([p, q]) => { const z = blockOf(p, q); return z.a * T + z.b; }));
    let animating = false;
    // ---- cells ----
    g.save(); g.beginPath(); g.rect(x0, y0, cardW - Lay.leftW, cardH - Lay.topH); g.clip();
    for (let ri = 0; ri < Lay.rows.length; ri++) for (let ci = 0; ci + ri <= Lay.K - 2; ci++) {
      const bx = x0 + V.ox + ci * st, by = y0 + V.oy + ri * st, RC = Lay.rows[ri], CC = Lay.cols[ci];
      if (bx > V.W || by > V.H || bx + N * cs < x0 || by + N * cs < y0) continue;
      g.fillStyle = (ri + ci) % 2 ? C.paper2 : C.paper; g.fillRect(bx, by, N * cs, N * cs);
      if (selRow) {
        g.fillStyle = C.sel;
        if (RC === Lay.rows[selRow.ri] && sel.only !== 'col') g.fillRect(bx, by + selRow.r * cs, N * cs, cs);
        if (CC === Lay.cols[selRow.ci] && sel.only !== 'row') g.fillRect(bx + selRow.c * cs, by, cs, N * cs);
      }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const a = RC * N + r, b = CC * N + c, x = bx + c * cs, y = by + r * cs, key = a * T + b;
        if (refSet.has(key)) { g.fillStyle = C.ref; g.fillRect(x, y, cs, cs); }
        if (hb && hb.a === a && hb.b === b) { g.fillStyle = C.hint; g.fillRect(x, y, cs, cs); }
        let k = 1; const an = anim.get(key);
        if (an) { const p = (t - an[0] - an[1]) / 170; if (p >= 1) anim.delete(key); else { animating = true; k = p < 0 ? (an[2] ? 0 : 1) : ease(p); } }
        const m = mk[key], wrong = m && (opt.err || (S.chk && S.chk.has(key))) && Core.wrongMark(P, mk, a, b), bad = opt.err && wrong, hatch = wrong && S.chk && S.chk.has(key);
        if (bad) { g.fillStyle = C.badBg; g.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
        if (hatch) g.drawImage(hatchSpr(cs), x, y, cs, cs);
        if (m && k > .01) { const sp = markSpr(m, cs, bad); if (k === 1) g.drawImage(sp, x, y, cs, cs); else { const d = cs * k; g.drawImage(sp, x + (cs - d) / 2, y + (cs - d) / 2, d, d); } }
      }
      g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath();
      for (let i = 1; i < N; i++) { g.moveTo(bx + i * cs + .5, by); g.lineTo(bx + i * cs + .5, by + N * cs); g.moveTo(bx, by + i * cs + .5); g.lineTo(bx + N * cs, by + i * cs + .5); }
      g.stroke(); g.strokeStyle = C.block; g.lineWidth = 2; g.strokeRect(bx, by, N * cs, N * cs);
    }
    if (opt.lines) drawLines();
    g.restore();
    // ---- column headers (they follow the grid sideways and stay on top) ----
    const lf = Math.round(Math.min(Lay.fs, Math.max(8, cs * .58)));
    g.save(); g.beginPath(); g.rect(x0 - 1, B.y, cardW - Lay.leftW + 1, Lay.topH); g.clip();
    for (let ci = 0; ci < Lay.cols.length; ci++) {
      const bx = x0 + V.ox + ci * st, cat = P.cats[Lay.cols[ci]];
      g.fillStyle = 'rgba(77,65,52,.08)'; g.fillRect(bx, B.y + 3, N * cs, Lay.cat - 4);
      g.font = `800 ${Lay.fs - 2}px ${FONT}`; g.fillStyle = C.head; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fitText(cat.label.toUpperCase(), N * cs - 6), bx + N * cs / 2, B.y + Lay.cat / 2 + 1.5);
      for (let c = 0; c < N; c++) {
        const on = selRow && sel.only !== 'row' && selRow.ci === ci && selRow.c === c, hh = hb && hb.ci === ci && hb.c === c;
        if (on || hh) { g.fillStyle = hh ? C.hint : C.selH; g.fillRect(bx + c * cs + 1, B.y + Lay.cat, cs - 2, Lay.topH - Lay.cat - 2); }
        colLab(cat.items[c], bx + (c + .5) * cs, y0 - 5, Lay.topH - Lay.cat - 9, lf, on || hh);
        if (c) { g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + c * cs + .5, B.y + Lay.cat + 4); g.lineTo(bx + c * cs + .5, y0); g.stroke(); }
      }
    }
    g.restore();
    // ---- row headers ----
    g.save(); g.beginPath(); g.rect(B.x, y0 - 1, Lay.leftW, cardH - Lay.topH + 1); g.clip();
    for (let ri = 0; ri < Lay.rows.length; ri++) {
      const by = y0 + V.oy + ri * st, cat = P.cats[Lay.rows[ri]];
      g.fillStyle = 'rgba(77,65,52,.08)'; g.fillRect(B.x + 3, by, Lay.cat - 4, N * cs);
      g.save(); g.translate(B.x + Lay.cat / 2 + 1.5, by + N * cs / 2); g.rotate(-Math.PI / 2); g.font = `800 ${Lay.fs - 2}px ${FONT}`; g.fillStyle = C.head; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fitText(cat.label.toUpperCase(), N * cs - 6), 0, 0); g.restore();
      for (let r = 0; r < N; r++) {
        const on = selRow && sel.only !== 'col' && selRow.ri === ri && selRow.r === r, hh = hb && hb.ri === ri && hb.r === r;
        if (on || hh) { g.fillStyle = hh ? C.hint : C.selH; g.fillRect(B.x + Lay.cat, by + r * cs + 1, Lay.leftW - Lay.cat - 2, cs - 2); }
        rowLab(cat.items[r], x0 - 6, by + (r + .5) * cs, Lay.leftW - Lay.cat - 10, lf, on || hh);
        if (r) { g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(B.x + Lay.cat + 4, by + r * cs + .5); g.lineTo(x0, by + r * cs + .5); g.stroke(); }
      }
    }
    g.restore();
    // ---- frame lines and the corner ----
    g.strokeStyle = C.block; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, B.y + 6); g.lineTo(x0, B.y + cardH - 6); g.moveTo(B.x + 6, y0); g.lineTo(B.x + cardW - 6, y0); g.stroke();
    g.font = `${Math.min(Lay.leftW, Lay.topH) * .38}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = .55; g.fillText('🔎', B.x + Lay.leftW / 2, B.y + Lay.topH / 2); g.globalAlpha = 1;
    // hint pulse ring (a CSS animation on top: no canvas loop needed)
    if (hs2) { const r = cellRect(hs2.a, hs2.b); pulse.style.cssText = `display:block;left:${r.x - 3}px;top:${r.y - 3}px;width:${r.s + 6}px;height:${r.s + 6}px`; pulse.classList.toggle('off', r.x < x0 - 1 || r.y < y0 - 1 || r.x > V.W || r.y > V.H); }
    else pulse.style.display = 'none';
    if (animating || t < animEnd) raf = requestAnimationFrame(draw);
    const dt = now() - t0; DS.n++; DS.ms += dt; DS.max = Math.max(DS.max, dt);
  }
  const popCell = (a, b, delay = 0, grow = false) => { const z = blockOf(a, b), T = S.P.K * S.P.N; anim.set(z.a * T + z.b, [now(), delay, grow]); animEnd = Math.max(animEnd, now() + delay + 200); };

  /* ---------- touch: tap (cycle the mark), long press (✓), drag (pan), pinch (zoom) ---------- */
  const ptrs = new Map(); let gest = null, lpT = 0;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => {
    if (!S || busy) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = pos(e); ptrs.set(e.pointerId, p); clearTimeout(lpT);
    if (ptrs.size === 1) {
      gest = { k: 'tap', x0: p.x, y0: p.y, ox: V.ox, oy: V.oy };
      const h = hit(p.x, p.y);
      if (h && h.k === 'cell' && !S.done) lpT = setTimeout(() => { if (gest && gest.k === 'tap') { gest.k = 'lp'; const cur = S.mk[h.a * S.P.K * S.P.N + h.b]; doMark(h.a, h.b, cur === YES ? 0 : YES); vibrate(20); } }, 480);
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()]; gest = { k: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, cs0: V.cs, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, ox: V.ox, oy: V.oy };
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !gest) return;
    const p = pos(e); ptrs.set(e.pointerId, p);
    if (gest.k === 'tap' && Math.hypot(p.x - gest.x0, p.y - gest.y0) > 9) { gest.k = 'pan'; clearTimeout(lpT); }
    if (gest.k === 'pan') { V.ox = gest.ox + p.x - gest.x0; V.oy = gest.oy + p.y - gest.y0; clampPan(); need(); }
    else if (gest.k === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      V.ox = gest.ox + mx - gest.mx; V.oy = gest.oy + my - gest.my; clampPan();
      setZoom(gest.cs0 * d / gest.d0, mx, my); gest.ox = V.ox - (mx - gest.mx); gest.oy = V.oy - (my - gest.my); gest.cs0 = V.cs; gest.d0 = d;
    }
  });
  const up = (e, cancel) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId); clearTimeout(lpT);
    if (gest && gest.k === 'tap' && !cancel && !ptrs.size) onTap(gest.x0, gest.y0);
    if (!ptrs.size) gest = null; else if (gest && gest.k === 'pinch') gest = { k: 'done' };
  };
  cv.addEventListener('pointerup', e => up(e)); cv.addEventListener('pointercancel', e => up(e, true));
  cv.addEventListener('wheel', e => { if (!S || !Lay) return; e.preventDefault(); const p = pos(e); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) setZoom(V.cs * Math.exp(-e.deltaY / 400), p.x, p.y); }, { passive: false });
  function onTap(x, y) {
    const h = hit(x, y); if (!h) return;
    if (h.k === 'cell') {
      if (S.done) return;
      const cur = S.mk[h.a * S.P.K * S.P.N + h.b];
      doMark(h.a, h.b, Core.nextMark(cur, opt.tap, opt.pen));
    } else {
      const P = S.P, c = Core.catOf(P, h.g), it = Core.itemOf(P, h.g);
      toast(`${esc(P.cats[c].label)}: <b>${esc(it.em ? it.em + ' ' : '')}${esc(Core.nm(P, h.g))}</b>`);
      sel = h.k === 'row' ? { a: h.g, b: Lay.cols[0] * P.N, only: 'row' } : { a: 0, b: h.g, only: 'col' };
      sfx('lgTap'); need();
    }
  }
  function toast(html, ms = 1600) { const t = $('#lgToast'); t.innerHTML = html; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

  /* ---------- playing ---------- */
  function doMark(a, b, v) {
    if (!S || S.done || busy) return;
    const ch = Core.setMark(S.P, S.mk, a, b, v, opt.auto);
    sel = { a, b };
    if (!ch.length) { need(); return; }
    S.undo.push(ch); if (S.undo.length > 400) { S.undo.shift(); S.trimmed = true; } S.redo = [];
    for (const [x, y, , n] of ch) popCell(x, y, x === a && y === b ? 0 : 40, !!n);
    sfx(v === YES ? 'lgV' : v ? 'lgX' : 'lgClr'); if (v === YES) vibrate(12);
    hideHint();
    changed();
  }
  function changed() { renderSide(); need(); saveSoon(); if (Core.isSolved(S.P, S.mk)) win(); }
  function undo() { if (!S || S.done || !S.undo.length) return; const ch = S.undo.pop(); Core.undoChanges(S.P, S.mk, ch); S.redo.push(ch); for (const [x, y] of ch) popCell(x, y); sfx('lgUndo'); hideHint(); changed(); }
  function redo() { if (!S || S.done || !S.redo.length) return; const ch = S.redo.pop(); Core.redoChanges(S.P, S.mk, ch); S.undo.push(ch); for (const [x, y] of ch) popCell(x, y); sfx('lgUndo'); hideHint(); changed(); }
  function restart() { if (!S || S.done) return; S.mk = Core.newMarks(S.P); S.undo = []; S.redo = []; S.struck = []; S.trimmed = false; sel = null; hideHint(); anim.clear(); renderAll(); save(); }
  function doHint() {
    if (!S || S.done || busy) return;
    const h = Core.hint(S.P, S.mk); if (!h) return;
    const same = hintS && hintS.a === h.a && hintS.b === h.b && hintS.k === h.k;
    if (!same) { S.hints++; stats.hints++; saveStats(); }
    // two steps: first a tip (where to look, without the answer), then on "Leg uit" (or Hint again) the full reasoning
    h.stage = h.k === 'err' || !h.tip ? 2 : same && hintS.stage >= 1 ? 2 : 1;
    hintS = h; sel = null; showTip();
  }
  function showTip() {
    const h = hintS; if (!h) return;
    $('#lgTipText').innerHTML = h.k === 'err' ? '⚠️ ' + esc(h.text) : h.stage === 1 ? `<b class="lg-tipname">🔎 ${esc(h.name)}</b>${esc(h.tip)}` : `<b class="lg-tipname">💡 ${esc(h.name)}</b>${esc(h.text)}`;
    $('#lgTipGo').textContent = h.k === 'err' ? 'Weghalen' : h.stage === 1 ? 'Leg uit' : h.v === YES ? 'Zet ✓' : 'Zet ✗';
    $('#lgTip').classList.add('show'); scr.classList.add('tipping'); if (scr.classList.contains('lg-col')) { scr.classList.remove('lg-col'); setTimeout(() => { layout(true); need(); }, 30); }
    if (h.clue >= 0 && tab !== 'c') setTab('c');
    if (h.stage === 2) reveal(h.a, h.b); renderSide();
    if (h.clue >= 0) { const li = $(`#lgClues li[data-i="${h.clue}"]`); if (li) { const pn = $('#lgPanel'); pn.scrollTop = Math.max(0, li.offsetTop - pn.offsetTop - 4); } }
    sfx('lgHint'); need(); saveSoon();
  }
  // Controleer: compare every mark with the solution and hatch the wrong ones (they stay hatched until fixed)
  function doCheck() {
    if (!S || S.done || busy) return;
    hideHint(); sel = null;
    const P = S.P, T = P.K * P.N, bad = []; let filled = 0;
    for (const [a, b] of Core.pairs(P)) { if (!S.mk[a * T + b]) continue; filled++; if (Core.wrongMark(P, S.mk, a, b)) bad.push([a, b]); }
    S.chk = new Set(); for (const [a, b] of bad) { S.chk.add(a * T + b); S.chk.add(b * T + a); }
    if (filled) { S.checks = (S.checks || 0) + 1; stats.checks = (stats.checks || 0) + 1; saveStats(); }
    if (!filled) { toast('Je hebt nog niets ingevuld.'); sfx('lgTap'); }
    else if (!bad.length) { toast(`✓ Alles klopt! ${filled} ${filled === 1 ? 'vakje' : 'vakjes'} ingevuld, geen fouten.`, 2200); sfx('lgOk'); }
    else {
      bad.forEach(([a, b], i) => popCell(a, b, i * 40, true));
      const vis = bad.some(([a, b]) => { const r = cellRect(a, b), B = base(); return r.x >= B.x + Lay.leftW && r.y >= B.y + Lay.topH && r.x + r.s <= V.W && r.y + r.s <= V.H; });
      if (!vis) reveal(bad[0][0], bad[0][1]);
      toast(`⚠️ ${bad.length} ${bad.length === 1 ? 'fout' : 'fouten'} gevonden: ${bad.length === 1 ? 'het vakje is' : 'de vakjes zijn'} rood gearceerd.`, 2600); sfx('lgBad'); vibrate(20);
    }
    need(); saveSoon();
  }
  function applyHint() { const h = hintS; if (!h) return; hideHint(); doMark(h.a, h.b, h.k === 'err' ? 0 : h.v); }
  function hideHint() { if (!hintS) return; hintS = null; $('#lgTip').classList.remove('show'); scr.classList.remove('tipping'); renderSide(); need(); }
  function win() {
    const P = S.P, T = P.K * P.N; S.done = true; hideHint(); sel = null;
    let k = 0;
    for (const [a, b] of Core.pairs(P)) {
      const want = P.ent[a] === P.ent[b] ? YES : (S.mk[a * T + b] === NO ? NO : AUTO);
      if (S.mk[a * T + b] !== want) { S.mk[a * T + b] = S.mk[b * T + a] = want; popCell(a, b, 30 + (k++ % 40) * 18, true); }
    }
    const lvl = S.lvl, t = Math.floor(S.t), best = stats.best[lvl];
    S.newBest = best == null || t < best; if (S.newBest) stats.best[lvl] = t;
    stats.won++; stats.wonBy[lvl] = (stats.wonBy[lvl] || 0) + 1; stats.time += t;
    if (!S.hints && !S.checks) { stats.noHint++; if (lvl === 'moeilijk' || lvl === 'expert') stats.hardNoHint++; }
    if (lvl === 'expert') stats.expert++;
    if (S.daily) { if (!stats.daily[S.daily]) stats.dailyWon++; stats.daily[S.daily] = Math.min(stats.daily[S.daily] || 1e9, t); const ks = Object.keys(stats.daily).sort(); while (ks.length > 60) delete stats.daily[ks.shift()]; }
    saveStats(); store.del('lg.save'); renderAll(); sfx('lgWin'); vibrate(30);
    clearTimeout(winT); winT = setTimeout(() => { if (current === 'lg' && S && S.done) openEnd(); }, 1400);
  }
  let winT = 0;

  /* ---------- side panel: tools, clues, summary ---------- */
  function renderSide() {
    if (!S) return;
    const P = S.P, n = P.clues.length, left = P.clues.filter((k, i) => !S.struck[i]).length;
    $('#lgTabC').innerHTML = `Aanwijzingen <small>${left === n ? n : left + '/' + n}</small>`;
    const ol = $('#lgClues');
    if (ol.children.length !== n || ol._p !== P) { ol.innerHTML = P.clues.map((k, i) => `<li data-i="${i}"><b>${i + 1}</b><span>${esc(k.txt)}</span></li>`).join(''); ol._p = P; }
    [...ol.children].forEach((li, i) => { li.classList.toggle('done', !!S.struck[i]); li.classList.toggle('hint', !!hintS && hintS.clue === i); });
    if (tab === 's') renderSum();
    $('#lgUndo').disabled = !S.undo.length || S.done; $('#lgRedo').disabled = !S.redo.length || S.done;
    const pen = $('#lgPen'); pen.hidden = opt.tap !== 'kies'; pen.innerHTML = `<b>${opt.pen === YES ? '✓' : '✗'}</b><small>Teken</small>`; pen.classList.toggle('yes', opt.pen === YES);
    $('#lgHintB').disabled = !!S.done; $('#lgCheck').disabled = !!S.done; $('#lgLines').classList.toggle('on', !!opt.lines);
  }
  function itemHtml(P, gi) { const it = Core.itemOf(P, gi); return (it.sw ? `<i class="lg-sw" style="background:${it.sw}"></i>` : it.em ? `<span class="lg-em">${it.em}</span>` : '') + esc(it.sh); }
  function renderSum() {
    const P = S.P, sm = Core.summary(P, S.mk);
    const found = sm.reduce((n, r) => n + r.slice(1).filter(v => v >= 0).length, 0), all = P.N * (P.K - 1);
    $('#lgSum').innerHTML = `<p class="lg-sumtop">${found === all ? '✓ Alles gevonden!' : `${found} van de ${all} gevonden`}</p><table><thead><tr>${P.cats.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>`
      + sm.map(r => `<tr>${r.map((gi, ci) => ci ? `<td class="${gi < 0 ? 'q' : ''}">${gi < 0 ? '?' : itemHtml(P, gi)}</td>` : `<th>${esc(P.cats[0].items[gi].n)}</th>`).join('')}</tr>`).join('') + '</tbody></table>';
  }
  function setTab(t, user) {
    if (user && t === tab && innerWidth <= innerHeight) { scr.classList.toggle('lg-col'); setTimeout(() => { layout(true); need(); }, 30); return; }
    tab = t; scr.classList.remove('lg-col');
    $('#lgTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    $('#lgClues').hidden = t !== 'c'; $('#lgSum').hidden = t !== 's';
    renderSide(); setTimeout(() => { layout(true); need(); }, 30);
  }
  function renderHud() { if (!S) return; $('#lgTitle').textContent = LV[S.lvl].name + (S.daily ? ' · dagpuzzel' : ''); $('#lgTime').textContent = fmt(S.t); }
  function renderAll() { renderHud(); renderSide(); layout(true); need(); }
  $('#lgClues').addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (!li || !S) return; const i = +li.dataset.i; S.struck[i] = !S.struck[i]; sfx('lgStrike'); renderSide(); saveSoon(); });
  $('#lgTabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) { sfx('lgTap'); setTab(b.dataset.t, true); } });
  $('#lgTools').addEventListener('click', e => {
    const b = e.target.closest('button[data-b]'); if (!b || !S) return;
    const k = b.dataset.b;
    if (k === 'undo') undo(); else if (k === 'redo') redo(); else if (k === 'hint') doHint(); else if (k === 'check') doCheck();
    else if (k === 'pen') { opt.pen = opt.pen === YES ? NO : YES; saveOpt(); sfx('lgTap'); renderSide(); }
    else if (k === 'lines') { opt.lines = !opt.lines; saveOpt(); sfx('lgTap'); renderSide(); need(); toast(opt.lines ? 'Lijnen aan: ✓\'s die bij elkaar horen, zijn verbonden' : 'Lijnen uit', 1600); }
    else if (k === 'fit') { const toFit = !(V.cs <= Lay.fitAll + .5); V.fit = toFit; V.cs = toFit ? Lay.fitAll : Lay.cs0; V.ox = 0; V.oy = 0; clampPan(); $('#lgFit').classList.toggle('on', toFit && Lay.fitAll < Lay.cs0 - .5); sfx('lgTap'); need(); }
  });
  $('#lgTipGo').addEventListener('click', () => { if (hintS && hintS.stage === 1) { hintS.stage = 2; sfx('lgTap'); showTip(); saveSoon(); } else applyHint(); });
  $('#lgTipX').addEventListener('click', () => { sfx('lgTap'); hideHint(); });

  /* ---------- the clock: only while you are really playing ---------- */
  function tick() {
    const t = now(), dt = clamp((t - lastTick) / 1000, 0, 1); lastTick = t;
    if (current !== 'lg' || !S || S.done || busy || anyModal() || document.hidden || !Number.isFinite(dt)) return;
    const s0 = Math.floor(S.t); S.t = (Number.isFinite(S.t) ? S.t : 0) + dt;
    if (Math.floor(S.t) !== s0) { $('#lgTime').textContent = fmt(S.t); if (Math.floor(S.t) % 10 === 0) save(); }
  }

  /* ---------- new puzzles: made in small slices so the screen keeps moving ---------- */
  function startNew(lvl, daily, fixedSeed) {
    closeModals(); hideHint(); clearTimeout(winT);
    busy = true; scr.classList.add('busy'); $('#lgBusy').classList.add('show');
    const d = daily ? Core.dailyFor(daily) : null, L = d ? d.lvl : lvl, seed = d ? d.seed : fixedSeed != null ? fixedSeed >>> 0 : (Math.random() * 4294967296) >>> 0;
    const it = Core.genIter(L, seed), t0 = now(); let spent = 0;
    const run = () => {
      if (!busy) return;
      let r; const end = now() + 10;
      try { do { r = it.next(); } while (!r.done && now() < end); } catch (e) { console.error(e); busy = false; scr.classList.remove('busy'); $('#lgBusy').classList.remove('show'); return; }
      spent += now() - (end - 10);
      if (!r.done) { setTimeout(run, 0); return; }
      lastGen = Math.round(spent); window.__lgGenWall = Math.round(now() - t0);
      S = { P: r.value, mk: Core.newMarks(r.value), t: 0, hints: 0, checks: 0, chk: new Set(), undo: [], redo: [], struck: [], daily: daily || null, lvl: L, done: false };
      stats.played++; saveStats();
      busy = false; scr.classList.remove('busy'); $('#lgBusy').classList.remove('show');
      sel = null; anim.clear(); V.ready = false; V.fit = false; tab = 'c'; setTab('c');
      renderAll(); save(); sfx('lgNew');
    };
    setTimeout(run, 40);
  }

  /* ---------- save / resume ---------- */
  function save() {
    clearTimeout(saveT); saveT = 0;
    if (!S || S.done) return;
    try { store.set('lg.save', { v: 1, P: S.P, mk: Core.packMarks(S.P, S.mk), t: Math.floor(S.t * 10) / 10, hints: S.hints, checks: S.checks || 0, chk: S.chk ? [...S.chk] : [], undo: S.undo.slice(-150), redo: S.redo.slice(-150), struck: S.struck, daily: S.daily, lvl: S.lvl, trimmed: S.trimmed || S.undo.length > 150 }); } catch (e) {}
  }
  const saveSoon = () => { if (!saveT) saveT = setTimeout(save, 500); };
  function load() {
    const d = store.get('lg.save', null);
    try {
      if (!d || d.v !== 1 || !d.P || !d.P.clues || !LV[d.lvl]) return null;
      const P = d.P, T = P.K * P.N;
      if (P.ent.length !== T || P.cats.length !== P.K || P.cats.some(c => c.items.length !== P.N)) return null;
      const ok = ch => Array.isArray(ch) && ch.every(c => Array.isArray(c) && c.length === 4 && c.every(v => Number.isInteger(v)) && c[0] < T && c[1] < T);
      return { P, mk: Core.unpackMarks(P, d.mk), t: Number.isFinite(d.t) ? d.t : 0, hints: d.hints | 0, checks: d.checks | 0, chk: new Set((Array.isArray(d.chk) ? d.chk : []).filter(k => Number.isInteger(k) && k >= 0 && k < T * T)), undo: (d.undo || []).filter(ok), redo: (d.redo || []).filter(ok), struck: Array.isArray(d.struck) ? d.struck : [], daily: d.daily || null, lvl: d.lvl, done: false, trimmed: !!d.trimmed };
    } catch (e) { return null; }
  }

  /* ---------- dialogs: start, menu, solved ---------- */
  const OPTS = [['tap', 'Tikken op een vakje', [['xv', '✗ → ✓ → leeg'], ['vx', '✓ → ✗ → leeg'], ['kies', 'Zelf kiezen']]], ['auto', 'Automatisch wegstrepen bij ✓'], ['err', 'Fouten meteen tonen'], ['sound', 'Geluidseffecten'], ['music', 'Achtergrondmuziek']];
  const optRows = () => OPTS.map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${(ch || [[true, 'Aan'], [false, 'Uit']]).map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  function onOpt(e, again) { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); Sfx.refresh && Sfx.refresh(); sfx('lgTap'); again(); renderSide(); need(); }
  const HELP = `<details class="lg-help"><summary>Hoe speel je?</summary><ul>
    <li>Bij elke persoon hoort precies één ding van elke soort, en niemand heeft hetzelfde. Zoek uit wat bij wie hoort.</li>
    <li>Elk blokje van het rooster koppelt twee soorten, bijvoorbeeld namen en huisdieren. <b>✓</b> = hoort bij elkaar, <b>✗</b> = hoort niet bij elkaar.</li>
    <li>Tik op een vakje om ✗, ✓ of leeg te zetten. <b>Lang drukken</b> zet meteen een ✓. Bij een ✓ worden de andere vakjes in die rij en kolom van het blokje vanzelf weggestreept.</li>
    <li>Lees de aanwijzingen goed en tik op een aanwijzing om hem door te strepen als je hem gebruikt hebt. Weet je iets via een ✓ in een ander blokje? Neem het over!</li>
    <li>Elke puzzel heeft precies één oplossing. Je hoeft nooit te gokken: goed nadenken is genoeg.</li>
    <li><b>🔗 Lijnen</b> verbindt de ✓'s die bij elkaar horen: zijwaarts bij dezelfde naam, op en neer bij hetzelfde ding. Elke groep die al vastligt, krijgt een eigen kleur.</li>
    <li>Twijfel je of alles klopt? <b>☑ Controleer</b> vergelijkt wat je hebt ingevuld met de oplossing en arceert foute ✓ en ✗ in rood. Verbeter je het vakje, dan verdwijnt de arcering.</li>
    <li>Vast? <b>💡 Hint</b> laat de volgende stap zien en vertelt waarom. Bij <b>Overzicht</b> zie je wat je al gevonden hebt.</li>
    <li>Schuif met één vinger over het rooster en knijp met twee vingers om in of uit te zoomen. Tik op een naam boven of naast het rooster om hem helemaal te lezen.</li></ul></details>`;
  function openStart() {
    closeModals(); hideHint();
    const has = S && !S.done, d = today(), dl = Core.dailyFor(d), dd = stats.daily[d];
    const cont = $('#lgCont'); cont.hidden = !has;
    if (has) cont.innerHTML = `<span><b>Verder spelen</b><small>${LV[S.lvl].name}${S.daily ? ' · dagpuzzel' : ''} · ⏱ ${fmt(S.t)}</small></span><em>Verder ▶</em>`;
    const dn = new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#lgDaily').className = dd != null ? 'done' : '';
    $('#lgDaily').innerHTML = `<span class="lg-dico">📅</span><span class="lg-dtx"><b>Puzzel van de dag</b><small>${dn} · ${LV[dl.lvl].name}</small></span><em>${dd != null ? '✓ ' + fmt(dd) : 'Spelen'}</em>`;
    $('#lgLevels').innerHTML = Core.LVL_KEYS.map(k => { const L = LV[k], b = stats.best[k]; return `<button data-l="${k}" class="${opt.lvl === k ? 'on' : ''}"><b>${L.name}</b><small>${L.K} soorten × ${L.N}</small><small>${LDESC[k]}</small><span>${b != null ? '⏱ ' + fmt(b) : '–'}</span></button>`; }).join('');
    $('#lgOpts').innerHTML = optRows(); $('#lgHelpS').innerHTML = HELP;
    $('#lgStats').innerHTML = [['Opgelost', stats.won], ['Zonder hint', stats.noHint], ['Dagpuzzels', stats.dailyWon]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    openModal('lgStartModal');
  }
  function openMenu() {
    if (!S) { openStart(); return; }
    hideHint(); $('#lgMOpts').innerHTML = optRows(); $('#lgHelpM').innerHTML = HELP; $('#lgMRestart').disabled = !!S.done;
    $('#lgMInfo').textContent = `${LV[S.lvl].name}${S.daily ? ' · puzzel van de dag' : ''} · ${S.P.K} soorten × ${S.P.N} · ⏱ ${fmt(S.t)} · ${S.hints} ${S.hints === 1 ? 'hint' : 'hints'}${S.checks ? ` · ${S.checks}× gecontroleerd` : ''}`;
    openModal('lgMenuModal'); sfx('lgTap');
  }
  function openEnd() {
    const L = LV[S.lvl], t = Math.floor(S.t), b = stats.best[S.lvl];
    $('#lgEndTitle').textContent = S.daily ? 'Puzzel van de dag opgelost!' : 'Logigram opgelost!';
    $('#lgEndText').innerHTML = `${L.name} in <b>${fmt(t)}</b>${S.newBest ? ' · 🎉 nieuwe beste tijd!' : b != null ? ` · beste tijd ${fmt(b)}` : ''}<br><small>${S.hints || S.checks ? [S.hints ? `${S.hints} ${S.hints === 1 ? 'hint' : 'hints'}` : '', S.checks ? `${S.checks}× gecontroleerd` : ''].filter(Boolean).join(' en ') + ' gebruikt' : 'Helemaal zonder hulp!'} · ${stats.won} ${stats.won === 1 ? 'logigram' : 'logigrammen'} opgelost</small>`;
    openModal('lgEndModal');
  }
  const newOrAsk = (fn) => {
    if (S && !S.done && S.undo.length) { askConfirm('Nieuwe puzzel?', 'Je puzzel van nu stopt dan en wordt niet bewaard.', 'Nieuwe puzzel').then(y => { if (y) fn(); else openStart(); }); }
    else fn();
  };
  $('#lgLevels').addEventListener('click', e => { const b = e.target.closest('button[data-l]'); if (!b) return; opt.lvl = b.dataset.l; saveOpt(); sfx('lgTap'); $('#lgLevels').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#lgOpts').addEventListener('click', e => onOpt(e, openStart));
  $('#lgMOpts').addEventListener('click', e => onOpt(e, openMenu));
  $('#lgGo').addEventListener('click', () => { sfx('lgTap'); newOrAsk(() => startNew(opt.lvl)); });
  $('#lgDaily').addEventListener('click', () => {
    sfx('lgTap'); const d = today();
    if (S && !S.done && S.daily === d) { closeModals(); renderAll(); return; }
    newOrAsk(() => startNew(null, d));
  });
  $('#lgCont').addEventListener('click', () => { sfx('lgTap'); closeModals(); renderAll(); });
  $('#lgStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#lgMResume').addEventListener('click', () => { sfx('lgTap'); closeModals(); need(); });
  $('#lgMRestart').addEventListener('click', () => { askConfirm('Opnieuw beginnen?', 'Alle ✓ en ✗ worden gewist. De klok loopt door.', 'Opnieuw').then(y => { if (y) restart(); else openMenu(); }); });
  $('#lgMNew').addEventListener('click', () => { sfx('lgTap'); openStart(); });
  $('#lgMQuit').addEventListener('click', () => { closeModals(); leave(); });
  $('#lgEndMenu').addEventListener('click', () => { sfx('lgTap'); openStart(); });
  $('#lgEndNew').addEventListener('click', () => { sfx('lgTap'); startNew(S && !S.daily ? S.lvl : opt.lvl); });
  $('#lgBack').addEventListener('click', () => leave());
  $('#lgMenu').addEventListener('click', () => openMenu());

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('lg'); scr.classList.toggle('land', innerWidth > innerHeight);
    if (!S) S = load();
    clearInterval(timer); lastTick = now(); timer = setInterval(tick, 250);
    if (S && !S.done) { tab = 'c'; setTab('c'); V.ready = false; requestAnimationFrame(() => { renderAll(); }); renderHud(); renderSide(); }
    else { requestAnimationFrame(() => { if (S) renderAll(); }); setTimeout(() => { if (current === 'lg') openStart(); }, 0); }
  }
  // back: a hint closes first; otherwise save and go to the menu (the tile shows "Doorgaan")
  function leave() {
    if (hintS && current === 'lg' && !anyModal()) { hideHint(); return; }
    clearInterval(timer); timer = 0; clearTimeout(winT); save(); closeModals(); hideHint();
    busy = false; scr.classList.remove('busy'); $('#lgBusy').classList.remove('show');
    if (S && S.done) S = null;
    show('menu'); refreshMenu();
  }
  addEventListener('resize', () => { if (current === 'lg') { scr.classList.toggle('land', innerWidth > innerHeight); setTimeout(() => { if (current === 'lg' && S) { layout(true); need(); } }, 80); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'lg') save(); else if (current === 'lg') lastTick = now(); });
  addEventListener('pagehide', () => { if (current === 'lg') save(); });
  new MutationObserver(() => { if (current === 'lg') { const b = big(); if (b !== V.big) { V.big = b; if (S) { V.ready = false; layout(); need(); } } } }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ---------- test hooks ---------- */
  function check() {
    if (!S) return 'geen spel';
    const P = S.P, T = P.K * P.N, mk = S.mk;
    if (mk.length !== T * T) return 'lengte';
    for (const [a, b] of Core.pairs(P)) { const v = mk[a * T + b]; if (v !== mk[b * T + a]) return 'niet symmetrisch'; if (![0, 1, 2, 3].includes(v)) return 'waarde ' + v; }
    if (!S.done && !S.trimmed) { const m = Core.newMarks(P); for (const ch of S.undo) Core.redoChanges(P, m, ch); if (m.some((v, i) => v !== mk[i])) return 'terug-lijst klopt niet met het rooster'; }
    if (!Number.isFinite(S.t) || S.t < 0) return 'tijd';
    if (![V.cs, V.ox, V.oy].every(Number.isFinite)) return 'beeld';
    if (S.done && !Core.isSolved(P, mk)) return 'klaar maar niet opgelost';
    return '';
  }
  window.__lg = {
    get S() { return S; }, get V() { return V; }, get Lay() { return Lay; }, get hint() { return hintS; }, opt, stats: () => stats, Core,
    startNew, openStart, openMenu, leave, save, load, doMark, doHint, doCheck, applyHint, undo, redo, restart, reveal, hit, setZoom, check,
    lines: () => LN, cellXY(a, b) { const r = cellRect(a, b), q = cv.getBoundingClientRect(); return { x: q.left + r.x + r.s / 2, y: q.top + r.y + r.s / 2, s: r.s, vis: r.x >= base().x + Lay.leftW - 1 && r.y >= base().y + Lay.topH - 1 && r.x + r.s <= V.W + 1 && r.y + r.s <= V.H + 1 }; },
    running: () => raf !== 0, drawStats: reset => { const r = { n: DS.n, avg: DS.n ? DS.ms / DS.n : 0, max: DS.max }; if (reset) { DS.n = 0; DS.ms = 0; DS.max = 0; } return r; }, busy: () => busy, genMs: () => lastGen, timerOn: () => !!timer,
  };
  return { enter, leave, hasSave: () => !!store.get('lg.save', null) };

})();
$('#tileLg').addEventListener('click', () => Logigram.enter());
