// "Beginnersfouten": hand-made Klaverjas positions with the card (or bid) a strong club player chooses.
// Shared by tests/kjai.mjs (browser, the shipped build) and the Node comparison with the old computer players.
// Cards: suit s=schoppen h=harten d=ruiten c=klaveren, rank 7 8 9 T(10) J(boer) Q(vrouw) K(heer) A(aas); e.g. hT = harten 10.
// Seats: 0 = Jij, 1 = Links, 2 = Maat, 3 = Rechts (0+2 = wij, 1+3 = zij). The leader of the first trick is dealer+1.
export const POSITIONS = [
  // ---- spelen ----
  { id: 'smeren-bekennen', note: 'Maat wint met de harten heer en jij bent laatste: smeer je harten tien erbij (de aas zit nog buiten).',
    trump: 's', chooser: 1, dealer: 3, trick: '0: h7 hK h8', hand: 'hT hQ d7 d8 c7 cK s7 s8', expect: { oneOf: 'hT' } },
  { id: 'smeren-renonce-amsterdams', note: 'Amsterdams: maat heeft de slag zeker en jij hebt geen ruiten: gooi je kale klaveren tien erbij, niet troeven.',
    trump: 's', chooser: 1, dealer: 3, variant: 'amsterdams', trick: '0: d7 dA d8', hand: 'cT hK hQ h7 h8 h9 s7 s9', expect: { oneOf: 'cT' } },
  { id: 'geen-tien-onder-aas', note: 'De tegenstander komt uit met de aas: gooi niet je tien eronder maar een kleintje.',
    trump: 's', chooser: 0, dealer: 0, trick: '1: hA', hand: 'hT h7 dA d8 c9 cJ s8 sQ', expect: { oneOf: 'h7' } },
  { id: 'geen-punten-weg', note: 'De tegenpartij heeft getroefd en jij kunt niets: gooi niet je aas of tien weg.',
    trump: 's', chooser: 3, dealer: 2, trick: '3: c7 cK s9', hand: 'hA hT h8 h9 d7 d8 dQ dK', expect: { not: 'hA hT' } },
  { id: 'troef-trekken', note: 'Jij speelt, Links heeft al op harten getroefd: trek eerst troef met de boer voordat je harten speelt.',
    trump: 's', chooser: 0, dealer: 3, hist: ['0: hA s7 h8 h9', '1: c7 cK c8 cA'], hand: 'sJ s9 sA hK hQ dA', expect: { suit: 's' } },
  { id: 'geen-kale-tien', note: 'Kom niet uit met een kale tien (tien zonder aas), en als tegenpartij niet met troef.',
    trump: 's', chooser: 0, dealer: 0, hand: 'hT d7 d8 dK c8 c9 cQ s7', expect: { suit: 'dc' } },
  { id: 'maat-laten-troeven', note: 'Maat heeft op harten getroefd: speel harten zodat maat kan troeven, niet van je ruiten tien en heer (aas zit buiten) of troef.',
    trump: 's', chooser: 0, dealer: 3, hist: ['0: hA h8 h9 s7', '3: c7 c8 cA c9'], hand: 'h7 hQ dT dK sQ s8', expect: { suit: 'h' } },
  { id: 'niet-over-maat-troeven', note: 'Amsterdams: maat heeft de slag met de aas, je hoeft niet te troeven: gooi een bijkaart.',
    trump: 's', chooser: 1, dealer: 3, variant: 'amsterdams', trick: '0: c7 cA c8', hand: 's7 sQ hQ h7 h8 d7 d9 dQ', expect: { suit: 'hdc' } },
  { id: 'geen-roem-weggeven', note: 'Geef geen roem weg: de troefheer bij vrouw en boer van de tegenpartij is 40 roem voor hen. Speel de zeven.',
    trump: 'h', chooser: 0, dealer: 2, trick: '3: hQ h8 hJ', hand: 'hK h7 sA s8 d7 dT c8 c9', expect: { oneOf: 'h7' } },
  { id: 'roem-pakken', note: 'Maat wint met de aas en jij bent laatste: de heer bij vrouw en aas is 20 roem voor ons.',
    trump: 's', chooser: 0, dealer: 0, trick: '1: dQ dA d7', hand: 'dK d8 cA c7 hT h8 s9 sJ', expect: { oneOf: 'dK' } },
  { id: 'tien-pakken-met-aas', note: 'De tegenstander speelt een tien en jij bent laatste met de aas: pak hem.',
    trump: 's', chooser: 1, dealer: 1, trick: '2: hT h8 h9', hand: 'hA h7 c8 c9 d7 dK sQ s8', expect: { oneOf: 'hA' } },
  { id: 'niet-met-boer-troeven', note: 'Een slag zonder punten moet je troeven: doe dat met de kleine troef, niet met de boer.',
    trump: 's', chooser: 0, dealer: 0, trick: '1: c7 c8 c9', hand: 'sJ s8 hA h7 d7 d8 dQ hQ', expect: { oneOf: 's8' } },
  { id: 'nel-bewaren', note: 'De tegenpartij trekt troef met de boer: gooi je nel er niet onder, die is nu de hoogste troef.',
    trump: 's', chooser: 1, dealer: 0, trick: '1: sJ', hand: 's9 s7 hA h8 c7 c8 dJ d9', expect: { oneOf: 's7' } },
  { id: 'tien-gedekt-houden', note: 'Je kunt niet bekennen: gooi een kleine klaveren, houd de kleine harten bij je tien (anders is hij kaal).',
    trump: 's', chooser: 1, dealer: 0, trick: '1: dA d8 d7', hand: 'hT h7 c7 c8 c9 cQ cK cJ', expect: { oneOf: 'c7 c8 c9' } },
  { id: 'tegenpartij-geen-troef', note: 'Als tegenpartij kom je niet uit met troef: dat helpt de spelers.',
    trump: 'h', chooser: 2, dealer: 2, hand: 'hT h7 sK s8 dQ d9 c7 c8', expect: { suit: 'sdc' } },
  { id: 'troef-terug', note: 'Maat (de speler) heeft troef getrokken; jij komt aan slag: speel troef terug.',
    trump: 's', chooser: 0, dealer: 3, hist: ['0: sJ s7 s8 sQ', '0: h7 h8 hA h9'], hand: 's9 sK d7 d8 c7 cQ', expect: { suit: 's' } },
  { id: 'smeren-op-troef-maat', note: 'Maat troeft met de boer (zeker), jij bekent als laatste: smeer de tien.',
    trump: 's', chooser: 0, dealer: 0, trick: '1: d8 sJ d9', hand: 'dT d7 hA h8 c7 c9 sQ s7', expect: { oneOf: 'dT' } },
  { id: 'niet-smeren-onzeker', note: 'Maat ligt met de heer maar de aas zit nog achter je: smeer je tien niet, speel klein.',
    trump: 's', chooser: 0, dealer: 3, trick: '0: cK c7', hand: 'cT c8 hA h8 d7 d9 sK s7', expect: { oneOf: 'c8' } },
  // ---- bieden ----
  { id: 'bod-boer-nel-azen', note: 'Boer, nel en een kleine troef met twee azen ernaast: spelen.',
    bid: true, bidding: 'vrij', dealer: 0, hand: 'sJ s9 s7 hA dA c8 c7 h8', expect: { bid: 0 } },
  { id: 'bod-zwak-passen', note: 'Zwakke hand zonder boer of nel: passen.',
    bid: true, bidding: 'vrij', dealer: 0, hand: 's7 s8 hQ h9 d8 dK c7 cT', expect: { bid: -1 } },
  { id: 'bod-kale-boer-passen', note: 'Alleen een kale boer en verder niets: passen.',
    bid: true, bidding: 'vrij', dealer: 0, hand: 'sJ s8 hK h8 d7 d9 c8 cQ', expect: { bid: -1 } },
  { id: 'bod-verplicht', note: 'Verplicht kiezen: kies de kleur met de boer, de minst slechte.',
    bid: true, bidding: 'verplicht', dealer: 0, hand: 'hJ h7 sA d8 d9 c7 c8 cQ', expect: { bid: 1 } },
  { id: 'bod-gedraaid-spelen', note: 'Gedraaide ruiten en je hebt boer, nel en aas van ruiten: spelen.',
    bid: true, bidding: 'gedraaid', proposed: 'd', dealer: 0, hand: 'dJ d9 dA d7 sK s8 h7 c8', expect: { bid: 2 } },
  { id: 'bod-gedraaid-passen', note: 'Gedraaide klaveren met maar één kleine klaver: passen (ook al is je schoppen sterk).',
    bid: true, bidding: 'gedraaid', proposed: 'c', dealer: 0, hand: 'c7 hA hT h9 sJ s9 sA d8', expect: { bid: -1 } },
  { id: 'bod-iedereen-past', note: 'Iedereen heeft gepast en jij moet kiezen: neem de kleur met de boer.',
    bid: true, bidding: 'vrij', dealer: 0, passes: [1, 2, 3, 0], hand: 'cJ c8 dA d7 h7 h8 s8 sQ', expect: { bid: 3 } },
  { id: 'bod-vierde-hand-sterk', note: 'Drie spelers passen, jij hebt boer, nel, aas en tien van harten: spelen.',
    bid: true, bidding: 'vrij', dealer: 0, passes: [1, 2, 3], hand: 'hJ h9 hA hT h7 sA d7 c8', expect: { bid: 1 } },
];

const SU = { s: 0, h: 1, d: 2, c: 3 }, RK = { 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13, A: 1 };
export const card = t => SU[t[0]] * 13 + RK[t[1]] - 1;
export const cards = t => t.trim() ? t.trim().split(/\s+/).map(card) : [];
export const cardName = c => 'shdc'[Math.floor(c / 13)] + { 7: '7', 8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 1: 'A' }[(c % 13) + 1];

// Builds the game state G for a position. The cards of the other players are only placeholders (the computer
// players never look at them); they respect the suits a player showed not to have.
export function buildG(pos, rnd = Math.random) {
  const TO = { 7: 0, 8: 1, 12: 2, 13: 3, 10: 4, 1: 5, 9: 6, 11: 7 }, NO = { 7: 0, 8: 1, 9: 2, 11: 3, 12: 4, 13: 5, 10: 6, 1: 7 };
  const TP = { 11: 20, 9: 14, 1: 11, 10: 10, 13: 4, 12: 3, 8: 0, 7: 0 }, NP = { 1: 11, 10: 10, 13: 4, 12: 3, 11: 2, 9: 0, 8: 0, 7: 0 };
  const trump = pos.bid ? null : SU[pos.trump], su = c => Math.floor(c / 13), rk = c => (c % 13) + 1;
  const pw = (c, led) => su(c) === trump ? 100 + TO[rk(c)] : su(c) === led ? NO[rk(c)] : -1;
  const pts = c => su(c) === trump ? TP[rk(c)] : NP[rk(c)];
  const dealer = pos.dealer, leader0 = (dealer + 1) % 4;
  const G = { round: 1, rounds: 16, dealer, total: [0, 0], log: [], variant: pos.variant || 'rotterdams', trump, chooser: pos.bid ? null : pos.chooser,
    bidding: pos.bidding || 'vrij', proposed: pos.proposed ? SU[pos.proposed] : null, verzaakt: null, trick: [], played: [], lastTrick: null,
    pts: [0, 0], roem: [0, 0], tricks: [0, 0], tricksLog: [], prevTricks: [], leader: leader0, turn: leader0, bids: [], passes: 0 };
  const playedBy = [[], [], [], []], voidOf = [new Set(), new Set(), new Set(), new Set()];
  const parse = line => { const [l, cs] = line.split(':'); return { l: +l, cs: cards(cs) }; };
  let lead = leader0;
  for (const line of pos.hist || []) {
    const { l, cs } = parse(line);
    if (l !== lead) throw new Error(`${pos.id}: trick led by ${l}, expected ${lead}`);
    const t = cs.map((c, i) => ({ p: (l + i) % 4, c })), led = su(cs[0]);
    let w = t[0]; for (const x of t) if (pw(x.c, led) > pw(w.c, led)) w = x;
    t.forEach(x => { playedBy[x.p].push(x.c); if (su(x.c) !== led) voidOf[x.p].add(led); G.played.push(x.c); });
    const pt = cs.reduce((a, c) => a + pts(c), 0);
    G.pts[w.p % 2] += pt; G.tricks[w.p % 2]++;
    G.tricksLog.push({ t, w: w.p, pts: pt, roem: 0 }); lead = w.p;
  }
  G.leader = lead; G.turn = lead;
  if (pos.trick) {
    const { l, cs } = parse(pos.trick);
    if (l !== lead) throw new Error(`${pos.id}: current trick led by ${l}, expected ${lead}`);
    G.trick = cs.map((c, i) => ({ p: (l + i) % 4, c }));
    G.trick.forEach(x => { playedBy[x.p].push(x.c); if (su(x.c) !== su(cs[0])) voidOf[x.p].add(su(cs[0])); G.played.push(x.c); });
    G.turn = (l + cs.length) % 4;
  }
  const me = pos.bid ? null : G.turn, hand = cards(pos.hand);
  if (pos.bid) {
    G.phase = 'bid'; G.trump = null; G.chooser = null;
    for (const q of pos.passes || []) { G.bids.push({ p: q, s: -1 }); G.passes++; }
    G.bidTurn = (leader0 + G.passes) % 4;
  } else {
    G.phase = 'play';
    // the bidding that led here: everybody before the chooser passed
    for (let q = leader0; q !== pos.chooser; q = (q + 1) % 4) { G.bids.push({ p: q, s: -1 }); G.passes++; }
    G.bids.push({ p: pos.chooser, s: trump });
  }
  const mover = pos.bid ? G.bidTurn : me;
  const used = new Set([...G.played, ...hand]);
  if (used.size !== G.played.length + hand.length) throw new Error(`${pos.id}: a card appears twice`);
  if (hand.length !== 8 - playedBy[mover].length) throw new Error(`${pos.id}: hand has ${hand.length} cards, expected ${8 - playedBy[mover].length}`);
  const rest = []; for (let s = 0; s < 4; s++) for (const r of [7, 8, 9, 10, 11, 12, 13, 1]) { const c = s * 13 + r - 1; if (!used.has(c)) rest.push(c); }
  for (let attempt = 0; ; attempt++) {
    const r = rest.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    const hands = [0, 1, 2, 3].map(q => q === mover ? hand.slice() : []);
    let ok = true;
    for (const c of r) {
      const q = [0, 1, 2, 3].find(q => q !== mover && hands[q].length < 8 - playedBy[q].length && (attempt > 50 || !voidOf[q].has(su(c))));
      if (q == null) { ok = false; break; } hands[q].push(c);
    }
    if (ok) { G.hands = hands; break; }
  }
  G.dealt = G.hands.map((h, q) => h.concat(playedBy[q]));
  return { G, mover, forced: G.bidding === 'verplicht' || G.passes >= 4, only: G.bidding === 'gedraaid' ? G.proposed : null };
}

export function judge(pos, got) {
  const e = pos.expect;
  if ('bid' in e) return got === e.bid;
  if (e.oneOf) return cards(e.oneOf).includes(got);
  if (e.suit) return e.suit.includes('shdc'[Math.floor(got / 13)]);
  if (e.not) return !cards(e.not).includes(got);
  return false;
}
export const shown = (pos, got) => pos.bid ? (got < 0 ? 'pas' : 'shdc'[got]) : cardName(got);
