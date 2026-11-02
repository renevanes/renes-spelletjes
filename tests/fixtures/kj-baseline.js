// Baseline ("old") Klaverjas computer players: the rules + AI part of the Klaverjas module as it was on main
// (version 1.74, before "Klaverjas sterker"). Used only by tests/kjtourney.mjs as the opponent for the new AI.
// Loaded by tests/kjload.mjs; do not edit.
const Klaverjas = (() => {
  const KD = { variant: 'rotterdams', rounds: 16, speed: 'normaal', bidding: 'vrij', roem: true, level: 'moeilijk',
    anim: 'normaal', tap2: false, protect: true, mark: true, tips: false, collect: 'auto', sort: 'troefLinks', sortDir: 'laag', scoreBig: 'potje', under: 'nee',
    names: ['Jij', 'Links', 'Maat', 'Rechts'], sound: true };
  const opt = Object.assign({}, KD, store.get('kj.settings', {}));
  if (!opt.lv2) { if (opt.level === 'normaal') opt.level = 'moeilijk'; opt.lv2 = true; store.set('kj.settings', opt); }   // one-time switch to the new strong computer players
  Sfx.gate('klaverjas', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const ksfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  const saveOpt = () => store.set('kj.settings', opt);
  let stats = Object.assign({ played: 0, won: 0 }, store.get('kj.stats', {}));
  const DELAY = { rustig: 850, normaal: 500, snel: 260, turbo: 120 };
  const BID_DELAY = { rustig: 1500, normaal: 1050, snel: 650, turbo: 120 };   // bidding a little slower, so you can follow who passes
  const ANIM = { rustig: 0.45, normaal: 0.26, snel: 0.15 };

  const SUITN = ['Schoppen', 'Harten', 'Ruiten', 'Klaveren'];
  const SUITS = ['♠︎', '♥︎', '♦︎', '♣︎'];
  const suitH = s => s === 1 || s === 2 ? `<span class="kj-red">${SUITS[s]}</span>` : SUITS[s];   // hearts and diamonds in red
  const NAMES = ['Jij', 'Links', 'Maat', 'Rechts'];
  const RANKS = [7, 8, 9, 10, 11, 12, 13, 1];
  const nm = p => (opt.names && opt.names[p] && opt.names[p].trim()) || NAMES[p];
  const suit = c => Math.floor(c / 13), rank = c => (c % 13) + 1;
  const team = p => p % 2;                                    // 0 = wij (jij + maat), 1 = zij
  const TORDER = { 7: 0, 8: 1, 12: 2, 13: 3, 10: 4, 1: 5, 9: 6, 11: 7 };
  const NORDER = { 7: 0, 8: 1, 9: 2, 11: 3, 12: 4, 13: 5, 10: 6, 1: 7 };
  const TPTS = { 11: 20, 9: 14, 1: 11, 10: 10, 13: 4, 12: 3, 8: 0, 7: 0 };
  const NPTS = { 1: 11, 10: 10, 13: 4, 12: 3, 11: 2, 9: 0, 8: 0, 7: 0 };
  const SEQ = { 7: 0, 8: 1, 9: 2, 10: 3, 11: 4, 12: 5, 13: 6, 1: 7 };
  const DECK = []; for (let s = 0; s < 4; s++) for (const r of RANKS) DECK.push(s * 13 + r - 1);

  let G = null;                 // game state (saved)
  let timer = null, busy = false, sel = null, waitTap = false, gen = 0;
  const later = (fn, ms) => { const g0 = gen; return setTimeout(() => { if (g0 === gen && current === 'klaverjas') fn(); }, ms); };   // dropped after a new game or leaving

  const isTrump = c => suit(c) === G.trump;
  const points = c => isTrump(c) ? TPTS[rank(c)] : NPTS[rank(c)];
  const order = c => isTrump(c) ? TORDER[rank(c)] : NORDER[rank(c)];
  function power(c, led) { if (isTrump(c)) return 100 + order(c); if (suit(c) === led) return order(c); return -1; }
  function winnerOf(trick) {
    const led = suit(trick[0].c); let best = trick[0];
    for (const t of trick) if (power(t.c, led) > power(best.c, led)) best = t;
    return best;
  }

  /* ---------- rules ---------- */
  function legal(p) {
    const hand = G.hands[p], trick = G.trick;
    if (!trick.length) return hand.slice();
    const led = suit(trick[0].c);
    const follow = hand.filter(c => suit(c) === led);
    const trumpsOnTable = trick.filter(t => isTrump(t.c));
    const highTrump = trumpsOnTable.length ? Math.max(...trumpsOnTable.map(t => order(t.c))) : -1;
    const myTrumps = hand.filter(isTrump);
    if (follow.length) {
      if (led === G.trump) {                          // trump led: must go over if possible
        const higher = follow.filter(c => order(c) > highTrump);
        return higher.length ? higher : follow;
      }
      return follow;
    }
    // cannot follow suit
    if ((G.variant || opt.variant) === 'amsterdams') {
      const w = winnerOf(trick);
      if (team(w.p) === team(p)) return hand.slice(); // partner wins: free choice
    }
    if (!myTrumps.length) return hand.slice();
    const over = myTrumps.filter(c => order(c) > highTrump);
    if (over.length) return over;                     // must (over)trump
    const others = hand.filter(c => !isTrump(c));
    if (opt.under === 'mag') return hand.slice();     // house rule: undertrumping allowed
    if (opt.under === 'moet') return myTrumps;        // house rule: you must trump, even under
    return others.length ? others : myTrumps;         // official: no undertrumping unless only trumps left
  }

  function roemOf(trick) {
    const cs = trick.map(t => t.c); let r = 0;
    for (let s = 0; s < 4; s++) {
      const q = cs.filter(c => suit(c) === s).map(c => SEQ[rank(c)]).sort((a, b) => a - b);
      let run = 1, best = 1;
      for (let i = 1; i < q.length; i++) { run = q[i] === q[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
      if (best === 3) r += 20; else if (best >= 4) r += 50;
    }
    if (cs.every(c => rank(c) === rank(cs[0])) && [1, 10, 11, 12, 13].includes(rank(cs[0]))) r += rank(cs[0]) === 11 ? 200 : 100;
    if (cs.some(c => isTrump(c) && rank(c) === 13) && cs.some(c => isTrump(c) && rank(c) === 12)) r += 20;
    return r;
  }

  /* ---------- computer players ---------- */
  function suitStrength(hand, s) {
    let v = 0, n = 0;
    for (const c of hand) {
      if (suit(c) === s) { v += TPTS[rank(c)] + 4; n++; }
      else if (rank(c) === 1) v += 9;
      else if (rank(c) === 10) v += 3;
    }
    return v + (n >= 4 ? 10 : 0) + (hand.some(c => suit(c) === s && rank(c) === 11) ? 8 : 0);
  }
  function aiBid(p, forced, only) {
    const need = opt.level === 'makkelijk' ? 55 + Math.random() * 25 : 62;
    if (only != null && !forced) return suitStrength(G.hands[p], only) >= need - 4 ? only : -1;
    let best = 0, bv = -1;
    for (let s = 0; s < 4; s++) { const v = suitStrength(G.hands[p], s); if (v > bv) { bv = v; best = s; } }
    return forced || bv >= need ? best : -1;
  }
  const seen = c => G.played.includes(c);
  function isMaster(c, hand) {  // no unseen card of the same kind can beat it
    const s = suit(c);
    return DECK.every(x => suit(x) !== s || x === c || seen(x) || hand.includes(x) || (isTrump(c) ? TORDER[rank(x)] < order(c) : NORDER[rank(x)] < order(c)));
  }
  const cheap = (a, b) => ((isTrump(a) ? 1 : 0) - (isTrump(b) ? 1 : 0)) || (points(a) - points(b)) || (order(a) - order(b));
  function aiHeur(p) {                              // quick rule-of-thumb player (also used inside the simulations)
    const hand = G.hands[p], L = legal(p);
    if (L.length === 1) return L[0];
    const trick = G.trick;
    const trumpsOut = DECK.filter(c => isTrump(c) && !seen(c) && !hand.includes(c)).length;
    if (!trick.length) {                              // leading
      const weArePlaying = team(G.chooser) === team(p);
      const myTrumps = L.filter(isTrump).sort((a, b) => order(b) - order(a));
      if (weArePlaying && trumpsOut > 0 && myTrumps.length && isMaster(myTrumps[0], hand)) return myTrumps[0];
      const masters = L.filter(c => !isTrump(c) && isMaster(c, hand)).sort((a, b) => points(b) - points(a));
      if (masters.length && (trumpsOut === 0 || !weArePlaying || masters[0] && rank(masters[0]) === 1)) return masters[0];
      const side = L.filter(c => !isTrump(c));
      const pool = side.length ? side : L;
      // avoid leading away from an unguarded ten
      const safe = pool.filter(c => !(rank(c) === 10 && !hand.some(x => suit(x) === suit(c) && rank(x) === 1)));
      return (safe.length ? safe : pool).sort(cheap)[0];
    }
    const led = suit(trick[0].c), w = winnerOf(trick);
    const partnerWins = team(w.p) === team(p), last = trick.length === 3;
    const onTable = trick.reduce((a, t) => a + points(t.c), 0);
    const beats = c => power(c, led) > power(w.c, led);
    if (partnerWins) {
      const safeWin = last || (isMaster(w.c, []) && (isTrump(w.c) || trick.length === 2 || !hand.length));
      if (safeWin || last) {
        const smear = L.filter(c => !isTrump(c)).sort((a, b) => points(b) - points(a));
        if (smear.length && points(smear[0]) >= 3) return smear[0];
      }
      return L.slice().sort(cheap)[0];
    }
    const winners = L.filter(beats).sort((a, b) => power(a, led) - power(b, led));
    if (winners.length) {
      if (last) return winners.slice().sort(cheap)[0];
      const masters = winners.filter(c => isMaster(c, hand));
      if (masters.length) return masters.sort(cheap)[0];
      if (onTable >= 10) return winners[0];
      const duck = L.filter(c => !beats(c));
      if (duck.length) return duck.sort(cheap)[0];
      return winners[0];
    }
    return L.slice().sort(cheap)[0];
  }

  /* ---------- strong computer player ("Moeilijk") ----------
     For every card it may play, it imagines many possible deals of the cards it cannot see (respecting what the
     others have shown: suits they could not follow, trumps they could not top) and plays each one out to the end.
     The card with the best average result for its own team (points, roem, going "nat") is chosen. It never peeks. */
  function knowledge() {
    const voids = [0, 1, 2, 3].map(() => [false, false, false, false]), maxT = [99, 99, 99, 99];
    const all = (G.tricksLog || []).map(x => x.t).concat(G.trick.length ? [G.trick] : []);
    const ams = (G.variant || opt.variant) === 'amsterdams';
    for (const t of all) {
      const led = suit(t[0].c);
      for (let k = 1; k < t.length; k++) {
        const { p, c } = t[k], before = t.slice(0, k), hi = Math.max(-1, ...before.filter(x => isTrump(x.c)).map(x => order(x.c)));
        if (suit(c) !== led) {
          voids[p][led] = true;
          if (!isTrump(c)) {
            const free = ams && team(winnerOf(before).p) === team(p);
            if (!free) { if (hi < 0) voids[p][G.trump] = true; else maxT[p] = Math.min(maxT[p], hi); }
          } else if (order(c) < hi) maxT[p] = Math.min(maxT[p], hi);             // had to undertrump: no higher trump
        } else if (led === G.trump && order(c) < hi) maxT[p] = Math.min(maxT[p], hi);   // trump led and could not go over
      }
    }
    return { voids, maxT };
  }
  function sampleHands(p, K) {                         // a random deal of the unseen cards that fits what is known
    const mine = G.hands[p], unseen = DECK.filter(c => !mine.includes(c) && !G.played.includes(c));
    const need = [0, 1, 2, 3].map(q => q === p ? 0 : G.hands[q].length);
    const ok = (q, c) => !K.voids[q][suit(c)] && !(isTrump(c) && order(c) >= K.maxT[q]);
    for (let attempt = 0; attempt < 30; attempt++) {
      const hands = [[], [], [], []]; hands[p] = mine.slice();
      const cards = unseen.slice().sort(() => Math.random() - .5).map(c => ({ c, el: [0, 1, 2, 3].filter(q => q !== p && (attempt > 25 || ok(q, c))) })).sort((a, b) => a.el.length - b.el.length);
      let fail = false;
      for (const { c, el } of cards) {
        const room = el.filter(q => hands[q].length < need[q]);
        if (!room.length) { fail = true; break; }
        hands[room[Math.floor(Math.random() * room.length)]].push(c);
      }
      if (!fail) return hands;
    }
    return null;
  }
  function simPlay(c) {                                // play a card in the (simulated) state G, no screen updates
    const p = G.turn; G.hands[p].splice(G.hands[p].indexOf(c), 1); G.trick.push({ p, c }); G.played.push(c);
    if (G.trick.length < 4) { G.turn = (p + 1) % 4; return; }
    const w = winnerOf(G.trick), tm = team(w.p);
    G.pts[tm] += G.trick.reduce((a, t) => a + points(t.c), 0); if (opt.roem) G.roem[tm] += roemOf(G.trick); G.tricks[tm]++;
    if (G.hands.every(h => !h.length)) G.pts[tm] += 10;
    G.trick = []; G.leader = w.p; G.turn = w.p;
  }
  function simValue(myTeam) {                          // final score difference for my team, with pit and nat
    const pl = team(G.chooser), op = 1 - pl, roem = G.roem.slice(), pts = G.pts;
    if (G.tricks[pl] === 8) roem[pl] += 100; if (G.tricks[op] === 8) roem[op] += 100;
    const sc = [pts[0] + roem[0], pts[1] + roem[1]];
    if (sc[pl] <= sc[op]) { sc[op] = 162 + roem[0] + roem[1]; sc[pl] = 0; }
    return sc[myTeam] - sc[1 - myTeam];
  }
  function rollout(hands, first, myTeam) {
    const real = G;
    G = Object.assign({}, real, { hands: hands.map(h => h.slice()), trick: real.trick.map(t => ({ p: t.p, c: t.c })), played: real.played.slice(), pts: real.pts.slice(), roem: real.roem.slice(), tricks: real.tricks.slice(), tricksLog: [] });
    try {
      if (first != null) simPlay(first);
      while (G.hands.some(h => h.length)) simPlay(aiHeur(G.turn));
      return simValue(myTeam);
    } finally { G = real; }
  }
  function aiStrong(p) {
    const L = legal(p); if (L.length === 1) return L[0];
    const K = knowledge(), sum = new Map(L.map(c => [c, 0])), t0 = performance.now();
    let n = 0;
    while (n < 300 && (n < 10 || performance.now() - t0 < 260)) {
      const hands = sampleHands(p, K); if (!hands) break;
      for (const c of L) sum.set(c, sum.get(c) + rollout(hands, c, team(p)));
      n++;
    }
    if (!n) return aiHeur(p);
    return L.reduce((a, b) => sum.get(b) > sum.get(a) + 1e-9 ? b : a);
  }
  function aiPlay(p) {
    const L = legal(p);
    if (opt.level === 'makkelijk' && Math.random() < 0.3) return L[Math.floor(Math.random() * L.length)];
    if (opt.level === 'moeilijk') return aiStrong(p);
    return aiHeur(p);
  }
  // strong bidding: play out imagined deals with each suit as trump
  function bidValue(p, s) {
    const real = G, K = { voids: [0, 1, 2, 3].map(() => [false, false, false, false]), maxT: [99, 99, 99, 99] };
    let tot = 0, n = 0; const t0 = performance.now();
    G = Object.assign({}, real, { trump: s, chooser: p, trick: [], played: [], pts: [0, 0], roem: [0, 0], tricks: [0, 0], turn: real.leader, phase: 'play' });
    try {
      while (n < 60 && (n < 8 || performance.now() - t0 < 90)) { const h = sampleHands(p, K); if (!h) break; tot += rollout(h, null, team(p)); n++; }
    } finally { G = real; }
    return n ? tot / n : -999;
  }
  function aiBidStrong(p, forced, only) {
    const suits = only != null && !forced ? [only] : [0, 1, 2, 3];
    let best = -1, bv = -Infinity;
    for (const s of suits) { const v = bidValue(p, s); if (v > bv) { bv = v; best = s; } }
    return forced || bv > 8 ? best : -1;
  }

  /* ---------- game flow ---------- */
  function newGame() {
    gen++; clearTimeout(timer); busy = false; waitTap = false; sel = null;
    G = { round: 0, rounds: opt.rounds, dealer: 3, total: [0, 0], log: [], variant: opt.variant };
    stats.played++; store.set('kj.stats', stats);
    G.counted = true;
    newDeal();
  }
  function newDeal() {
    busy = false; waitTap = false; sel = null;
    const d = shuffleArr(DECK.slice());
    G.round++; G.dealer = (G.dealer + 1) % 4;
    G.hands = [0, 1, 2, 3].map(i => d.slice(i * 8, i * 8 + 8));
    G.dealt = G.hands.map(h => h.slice());
    G.prevTricks = G.tricksLog && G.tricksLog.length ? G.tricksLog : (G.prevTricks || []); G.tricksLog = [];
    G.trump = null; G.hands.forEach(h => sortHand(h));
    G.bidding = opt.bidding; G.proposed = G.bidding === 'gedraaid' ? Math.floor(Math.random() * 4) : null; G.verzaakt = null;
    G.trump = null; G.chooser = null; G.trick = []; G.played = []; G.lastTrick = null;
    G.pts = [0, 0]; G.roem = [0, 0]; G.tricks = [0, 0];
    G.phase = 'bid'; G.bidTurn = (G.dealer + 1) % 4; G.passes = 0; G.bids = [];
    G.leader = (G.dealer + 1) % 4; G.turn = G.leader;
    save(); dealAnim(); ksfx('shuffle'); setTimeout(() => ksfx('deal'), 900);
    step();
  }
  function shuffleArr(a) {
    const r = new Uint32Array(a.length); crypto.getRandomValues(r);
    for (let i = a.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function step() {                                   // drives the computer players
    clearTimeout(timer);
    if (!G || current !== 'klaverjas' || anyModal()) return;
    render();
    if (G.phase === 'done') { showDealResult(); return; }
    if (G.phase === 'bid') {
      const forced = G.bidding === 'verplicht' || G.passes >= 4;
      if (G.bidTurn === 0) { showBid(forced); return; }
      hideBid();
      timer = setTimeout(() => {
        const s = (opt.level === 'moeilijk' ? aiBidStrong : aiBid)(G.bidTurn, forced, G.bidding === 'gedraaid' ? G.proposed : null);
        if (s >= 0) chooseTrump(G.bidTurn, s); else { (G.bids || (G.bids = [])).push({ p: G.bidTurn, s: -1 }); ksfx('cardSlide'); G.passes++; G.bidTurn = (G.bidTurn + 1) % 4; save(); step(); }
      }, BID_DELAY[opt.speed]);
      return;
    }
    hideBid();
    if (G.phase === 'play' && G.turn !== 0) timer = setTimeout(() => {
      const L = legal(G.turn);
      play(G.turn, aiPlay(G.turn));
    }, DELAY[opt.speed]);
  }

  function chooseTrump(p, s) {
    (G.bids || (G.bids = [])).push({ p, s });
    G.trump = s; G.chooser = p; G.phase = 'play'; ksfx('trump');
    G.hands.forEach(h => sortHand(h));
    toast(`${p === 0 ? 'Jij speelt' : nm(p) + ' speelt'} ${SUITN[s].toLowerCase()} ${SUITS[s]}` + (G.leader === p ? ` en ${p === 0 ? 'komt' : 'komt'} zelf uit` : ` · ${G.leader === 0 ? 'jij komt' : nm(G.leader) + ' komt'} uit`), 2200);
    save(); render(); later(step, 600);
  }

  function play(p, c) {
    if (G.phase !== 'play' || G.turn !== p || busy) return;
    let verzaakt = null;
    if (!legal(p).includes(c)) { if (p !== 0 || opt.protect) return; verzaakt = ruleHint(); }
    sel = null;
    G.hands[p].splice(G.hands[p].indexOf(c), 1);
    G.trick.push({ p, c });
    G.played.push(c); ksfx('cardPlay');
    if (p === 0) vibrate(8);
    if (verzaakt) {
      G.verzaakt = team(p); busy = true; save(); render(); vibrate(80);
      toast(`Verzaakt! ${verzaakt.replace('Je moet', 'Je moest')}. Deze ronde gaat naar de tegenpartij.`, 3200);
      later(() => { busy = false; endDeal(); }, 2600);
      return;
    }
    if (G.trick.length < 4) { G.turn = (p + 1) % 4; save(); render(); step(); return; }
    // trick complete
    const w = winnerOf(G.trick), tm = team(w.p);
    const r = opt.roem ? roemOf(G.trick) : 0;
    G.pts[tm] += G.trick.reduce((a, t) => a + points(t.c), 0);
    G.roem[tm] += r; G.tricks[tm]++;
    const lastTrick = G.hands.every(h => !h.length);
    if (lastTrick) G.pts[tm] += 10;
    (G.tricksLog = G.tricksLog || []).push({ t: G.trick.slice(), w: w.p, pts: G.trick.reduce((a, x) => a + points(x.c), 0) + (lastTrick ? 10 : 0), roem: r });
    busy = true; save(); render(w.p);
    if (r) { toast(`${r} roem voor ${tm === 0 ? 'wij' : 'zij'}!`, 1400); setTimeout(() => ksfx('roem'), 250); }
    if (opt.collect === 'tik') later(() => { waitTap = true; toast('Tik op de tafel om verder te spelen', 2500); }, 350);
    else later(finishTrick, DELAY[opt.speed] + 450);
  }
  function finishTrick() {
    if (!G || G.trick.length < 4) return;
    const w = winnerOf(G.trick);
    G.lastTrick = G.trick; G.trick = []; G.leader = w.p; G.turn = w.p; busy = false; waitTap = false;
    collectAnim(w.p); ksfx('cardSlide');
    if (G.hands.every(h => !h.length)) endDeal(); else { save(); step(); }
  }

  function endDeal() {
    const pl = team(G.chooser), op = 1 - pl;
    let pts = G.pts.slice(), roem = G.roem.slice();
    let note = '';
    if (G.tricks[pl] === 8) { roem[pl] += 100; note = `Pit voor ${pl === 0 ? 'wij' : 'zij'}! (+100)`; }
    if (G.tricks[op] === 8) { roem[op] += 100; note = `Pit voor ${op === 0 ? 'wij' : 'zij'}! (+100)`; }
    const tot = t => pts[t] + roem[t];
    let score = [tot(0), tot(1)];
    if (G.verzaakt != null) {
      const v = G.verzaakt;
      score[1 - v] = 162 + roem[0] + roem[1]; score[v] = 0;
      note = `${v === 0 ? 'Wij hebben' : 'Zij hebben'} verzaakt: alle punten naar ${v === 0 ? 'zij' : 'wij'}.`;
    } else if (tot(pl) <= tot(op)) {                          // nat: all points go to the other team
      score[op] = 162 + roem[0] + roem[1]; score[pl] = 0;
      note = (pl === 0 ? 'Wij' : 'Zij') + ' gaan nat!' + (note ? ' ' + note : '');
    }
    G.total[0] += score[0]; G.total[1] += score[1];
    G.log.push({ trump: G.trump, chooser: G.chooser, score, pts, roem, note, tricks: (G.tricksLog || []).slice(), verzaakt: G.verzaakt });
    G.phase = 'done';
    save(); render();
    setTimeout(() => ksfx(score[0] > score[1] ? 'roem' : 'natLose'), 300);
    later(showDealResult, 500);
  }

