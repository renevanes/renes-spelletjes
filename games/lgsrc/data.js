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
