const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../src/risk-engine.js");
const players = (n) =>
  Array.from({ length: n }, (_, i) => ({ name: `Speler ${i + 1}`, ai: i > 0 }));
function fixture() {
  const s = E.newGame(players(3), 7);
  s.territories = s.territories.map(() => ({ owner: 0, armies: 3 }));
  s.territories[E.byId.nw] = { owner: 1, armies: 1 };
  s.territories[E.byId.eastaus] = { owner: 2, armies: 1 };
  s.territories[E.byId.alaska].armies = 40;
  s.phase = "attack";
  s.pool = 0;
  return s;
}
function hand(s, player, cards) {
  for (const id of cards) {
    s.deck = s.deck.filter((c) => c !== id);
    s.discard = s.discard.filter((c) => c !== id);
    for (const p of s.players) p.cards = p.cards.filter((c) => c !== id);
  }
  s.players[player].cards.push(...cards);
}
test("classic board has 42 countries, correct bonuses, reciprocal borders and sea routes", () => {
  assert.equal(E.territories.length, 42);
  assert.equal(new Set(E.territories.map((t) => t.id)).size, 42);
  assert.deepEqual(
    E.continents.map((c) => c.bonus),
    [5, 2, 5, 3, 7, 2],
  );
  for (const t of E.territories)
    for (const n of t.neighbors)
      assert.ok(E.territories[n].neighbors.includes(E.byId[t.id]));
  for (const [a, b] of [
    ["alaska", "kamchatka"],
    ["greenland", "iceland"],
    ["brazil", "northaf"],
    ["siam", "indonesia"],
  ])
    assert.ok(E.territories[E.byId[a]].neighbors.includes(E.byId[b]));
});
test("2–6 players receive balanced countries and classic starting armies", () => {
  for (let n = 2; n <= 6; n++) {
    const s = E.newGame(players(n), 42),
      counts = s.players.map((_, i) => E.owned(s, i).length);
    assert.ok(E.validState(s));
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
    for (let i = 0; i < n; i++)
      assert.equal(
        E.owned(s, i).reduce((a, t) => a + s.territories[t].armies, 0),
        [0, 0, 40, 35, 30, 25, 20][n],
      );
  }
});
test("reinforcements include only completely owned continents", () => {
  const s = fixture();
  assert.equal(E.reinforcements(s), Math.floor(40 / 3) + 2 + 5 + 3 + 7);
  s.phase = "reinforce";
  s.pool = 5;
  const before = JSON.stringify(s),
    next = E.apply(s, { type: "reinforce", to: E.byId.alaska, amount: 2 });
  assert.equal(JSON.stringify(s), before);
  assert.equal(next.pool, 3);
  assert.throws(
    () => E.apply(s, { type: "reinforce", to: E.byId.nw, amount: 2 }),
    /eigen land/,
  );
  assert.throws(() => E.apply(s, { type: "advance" }), /versterkingen/);
});
test("dice compare in descending order and ties favor the defender", () => {
  const s = fixture();
  s.rng = 1;
  s.territories[E.byId.nw].armies = 5;
  const next = E.apply(s, {
    type: "attack",
    from: E.byId.alaska,
    to: E.byId.nw,
    dice: 3,
  });
  assert.deepEqual(next.lastBattle.attack, [4, 1, 1]);
  assert.deepEqual(next.lastBattle.defend, [4, 1]);
  assert.equal(next.lastBattle.attackLoss, 2);
  assert.equal(next.lastBattle.defendLoss, 0);
  assert.throws(
    () =>
      E.apply(s, {
        type: "attack",
        from: E.byId.alaska,
        to: E.byId.eastaus,
        dice: 3,
      }),
    /grenzen/,
  );
  s.territories[E.byId.alaska].armies = 1;
  assert.throws(
    () =>
      E.apply(s, {
        type: "attack",
        from: E.byId.alaska,
        to: E.byId.nw,
        dice: 1,
      }),
    /achter/,
  );
});
test("occupation is mandatory and elimination transfers cards before attacks resume", () => {
  let s = fixture();
  hand(s, 1, [0, 1, 2, 3, 4, 5]);
  while (!s.pending)
    s = E.apply(s, {
      type: "attack",
      from: E.byId.alaska,
      to: E.byId.nw,
      dice: 3,
    });
  assert.equal(s.pending.min, 3);
  assert.throws(() => E.apply(s, { type: "advance" }), /bezetten/);
  assert.throws(
    () => E.apply(s, { type: "occupy", amount: s.pending.min - 1 }),
    /aantal/,
  );
  s = E.apply(s, { type: "occupy", amount: s.pending.min });
  assert.equal(E.owned(s, 1).length, 0);
  assert.equal(s.players[1].cards.length, 0);
  assert.equal(s.players[0].cards.length, 6);
  assert.equal(s.phase, "reinforce");
  assert.equal(s.resumeAttack, true);
  assert.throws(() => E.apply(s, { type: "advance" }), /kaarten/);
  s = E.apply(s, { type: "trade", cards: E.findSet(s) });
  assert.ok(s.pool > 0);
  s = E.apply(s, { type: "reinforce", to: E.byId.alaska, amount: s.pool });
  s = E.apply(s, { type: "advance" });
  assert.equal(s.phase, "attack");
});
test("cards accept sets and jokers, award an owned-country bonus, and cannot be reused", () => {
  assert.ok(E.validSet([0, 3, 6]));
  assert.ok(E.validSet([0, 1, 2]));
  assert.ok(E.validSet([0, 1, 42]));
  assert.ok(!E.validSet([0, 3, 1]));
  assert.ok(!E.validSet([0, 0, 42]));
  let s = fixture();
  s.phase = "reinforce";
  hand(s, 0, [0, 3, 6]);
  const armies = s.territories[0].armies;
  s = E.apply(s, { type: "trade", cards: [0, 3, 6] });
  assert.equal(s.pool, 4);
  assert.equal(s.territories[0].armies, armies + 2);
  assert.equal(s.players[0].cards.length, 0);
  assert.throws(
    () => E.apply(s, { type: "trade", cards: [0, 3, 6] }),
    /symbolen/,
  );
});
test("fortification uses an owned route, keeps a garrison, and can happen only once", () => {
  let s = fixture();
  s.phase = "fortify";
  assert.ok(E.connected(s, E.byId.alaska, E.byId.ontario));
  s = E.apply(s, {
    type: "fortify",
    from: E.byId.alaska,
    to: E.byId.ontario,
    amount: 10,
  });
  assert.equal(s.territories[E.byId.ontario].armies, 13);
  assert.throws(
    () =>
      E.apply(s, {
        type: "fortify",
        from: E.byId.alaska,
        to: E.byId.ontario,
        amount: 1,
      }),
    /één/,
  );
  s.fortified = false;
  s.territories[E.byId.nw].owner = 1;
  s.territories[E.byId.alberta].owner = 1;
  s.territories[E.byId.kamchatka].owner = 1;
  assert.ok(!E.connected(s, E.byId.alaska, E.byId.ontario));
  assert.throws(
    () =>
      E.apply(s, {
        type: "fortify",
        from: E.byId.alaska,
        to: E.byId.ontario,
        amount: 1,
      }),
    /route/,
  );
});
test("a conquest earns one card at turn end and eliminated players are skipped", () => {
  let s = fixture();
  s.phase = "fortify";
  s.conquered = true;
  s.territories[E.byId.nw].owner = 0;
  const count = s.players[0].cards.length;
  s = E.apply(s, { type: "endTurn" });
  assert.equal(s.players[0].cards.length, count + 1);
  assert.equal(s.current, 2);
  assert.equal(s.phase, "reinforce");
});
test("saved-game validation rejects corrupt cards, ownership, pools and occupations", () => {
  const s = fixture();
  assert.ok(E.validState(JSON.parse(JSON.stringify(s))));
  for (const mutate of [
    (x) => x.deck.push(0),
    (x) => (x.territories[0].owner = 9),
    (x) => (x.pool = -1),
    (x) => (x.phase = "unknown"),
    (x) => (x.pending = { from: 0, to: 1, min: 3, max: 999, defender: 1 }),
  ]) {
    const invalid = JSON.parse(JSON.stringify(s));
    mutate(invalid);
    assert.ok(!E.validState(invalid));
  }
});
test("complete deterministic AI games reach victory and preserve invariants", () => {
  for (let seed = 1; seed <= 15; seed++) {
    let s = E.newGame(players((seed % 5) + 2), seed),
      moves = 0;
    while (s.phase !== "won" && moves < 12000) {
      s = E.apply(
        s,
        E.chooseAction(
          s,
          seed % 3 === 0 ? "strong" : seed % 3 === 1 ? "normal" : "easy",
        ),
      );
      moves++;
    }
    assert.equal(s.phase, "won", `seed ${seed} should finish`);
    assert.equal(E.owned(s, s.winner).length, 42);
    assert.ok(E.validState(s));
  }
});
