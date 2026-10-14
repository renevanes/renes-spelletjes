/* RK_JS_BEGIN */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ReneRiskEngine = api;
})(globalThis, function () {
  "use strict";
  const continents = [
    { id: "na", name: "Noord-Amerika", bonus: 5, color: "#d9b56a" },
    { id: "sa", name: "Zuid-Amerika", bonus: 2, color: "#b5c980" },
    { id: "eu", name: "Europa", bonus: 5, color: "#9cbad0" },
    { id: "af", name: "Afrika", bonus: 3, color: "#dfad86" },
    { id: "as", name: "Azië", bonus: 7, color: "#c6b1d7" },
    { id: "au", name: "Oceanië", bonus: 2, color: "#c5cfa5" },
  ];
  const entries = [
    ["alaska", "Alaska", "na", 70, 135, "ALA"],
    ["nw", "Noordwestterritoria", "na", 180, 110, "NWT"],
    ["greenland", "Groenland", "na", 365, 70, "GRL"],
    ["alberta", "Alberta", "na", 145, 210, "ALB"],
    ["ontario", "Ontario", "na", 250, 185, "ONT"],
    ["quebec", "Quebec", "na", 350, 165, "QUE"],
    ["westus", "Westelijke VS", "na", 160, 305, "WVS"],
    ["eastus", "Oostelijke VS", "na", 280, 280, "OVS"],
    ["central", "Midden-Amerika", "na", 225, 385, "MAM"],
    ["venezuela", "Venezuela", "sa", 340, 390, "VEN"],
    ["peru", "Peru", "sa", 315, 475, "PER"],
    ["brazil", "Brazilië", "sa", 420, 470, "BRA"],
    ["argentina", "Argentinië", "sa", 350, 565, "ARG"],
    ["iceland", "IJsland", "eu", 485, 105, "IJS"],
    ["scandinavia", "Scandinavië", "eu", 610, 100, "SCA"],
    ["ukraine", "Oekraïne", "eu", 720, 165, "OEK"],
    ["britain", "Groot-Brittannië", "eu", 505, 200, "GBR"],
    ["northeu", "Noord-Europa", "eu", 605, 195, "NEU"],
    ["westeu", "West-Europa", "eu", 515, 285, "WEU"],
    ["southeu", "Zuid-Europa", "eu", 635, 290, "ZEU"],
    ["northaf", "Noord-Afrika", "af", 525, 390, "NAF"],
    ["egypt", "Egypte", "af", 650, 385, "EGY"],
    ["eastaf", "Oost-Afrika", "af", 685, 470, "OAF"],
    ["congo", "Congo", "af", 575, 480, "CON"],
    ["southaf", "Zuid-Afrika", "af", 590, 575, "ZAF"],
    ["madagascar", "Madagaskar", "af", 710, 570, "MAD"],
    ["ural", "Oeral", "as", 805, 125, "OER"],
    ["siberia", "Siberië", "as", 880, 75, "SIB"],
    ["yakutsk", "Jakoetsk", "as", 980, 60, "JAK"],
    ["kamchatka", "Kamtsjatka", "as", 1080, 120, "KAM"],
    ["irkutsk", "Irkoetsk", "as", 940, 165, "IRK"],
    ["mongolia", "Mongolië", "as", 935, 260, "MON"],
    ["japan", "Japan", "as", 1090, 290, "JAP"],
    ["afghan", "Afghanistan", "as", 775, 245, "AFG"],
    ["middleeast", "Midden-Oosten", "as", 730, 345, "MOO"],
    ["india", "India", "as", 845, 350, "IND"],
    ["china", "China", "as", 930, 350, "CHI"],
    ["siam", "Siam", "as", 935, 440, "SIA"],
    ["indonesia", "Indonesië", "au", 930, 530, "INO"],
    ["newguinea", "Nieuw-Guinea", "au", 1085, 490, "NGU"],
    ["westaus", "West-Australië", "au", 965, 620, "WAU"],
    ["eastaus", "Oost-Australië", "au", 1090, 605, "OAU"],
  ];
  const edges = [
    "alaska nw",
    "alaska alberta",
    "alaska kamchatka",
    "nw alberta",
    "nw ontario",
    "nw greenland",
    "greenland ontario",
    "greenland quebec",
    "greenland iceland",
    "alberta ontario",
    "alberta westus",
    "ontario quebec",
    "ontario westus",
    "ontario eastus",
    "quebec eastus",
    "westus eastus",
    "westus central",
    "eastus central",
    "central venezuela",
    "venezuela peru",
    "venezuela brazil",
    "peru brazil",
    "peru argentina",
    "brazil argentina",
    "brazil northaf",
    "iceland britain",
    "iceland scandinavia",
    "scandinavia britain",
    "scandinavia northeu",
    "scandinavia ukraine",
    "britain northeu",
    "britain westeu",
    "northeu westeu",
    "northeu southeu",
    "northeu ukraine",
    "westeu southeu",
    "westeu northaf",
    "southeu ukraine",
    "southeu northaf",
    "southeu egypt",
    "southeu middleeast",
    "northaf egypt",
    "northaf eastaf",
    "northaf congo",
    "egypt eastaf",
    "egypt middleeast",
    "eastaf middleeast",
    "eastaf congo",
    "eastaf southaf",
    "eastaf madagascar",
    "congo southaf",
    "southaf madagascar",
    "ukraine ural",
    "ukraine afghan",
    "ukraine middleeast",
    "ural siberia",
    "ural china",
    "ural afghan",
    "siberia yakutsk",
    "siberia irkutsk",
    "siberia mongolia",
    "siberia china",
    "yakutsk irkutsk",
    "yakutsk kamchatka",
    "kamchatka irkutsk",
    "kamchatka mongolia",
    "kamchatka japan",
    "irkutsk mongolia",
    "mongolia japan",
    "mongolia china",
    "afghan china",
    "afghan india",
    "afghan middleeast",
    "middleeast india",
    "india china",
    "india siam",
    "china siam",
    "siam indonesia",
    "indonesia newguinea",
    "indonesia westaus",
    "newguinea westaus",
    "newguinea eastaus",
    "westaus eastaus",
  ].map((pair) => pair.split(" "));
  const territories = entries.map(([id, name, continent, x, y, short]) => ({
    id,
    name,
    continent,
    x,
    y,
    short,
    neighbors: [],
  }));
  const byId = Object.fromEntries(territories.map((t, i) => [t.id, i]));
  for (const [a, b] of edges) {
    territories[byId[a]].neighbors.push(byId[b]);
    territories[byId[b]].neighbors.push(byId[a]);
  }
  const COLORS = [
    "#b63838",
    "#2766b0",
    "#947000",
    "#207653",
    "#7d47a0",
    "#ad5523",
  ];
  const integer = (n, min, max = Number.MAX_SAFE_INTEGER) =>
    Number.isSafeInteger(n) && n >= min && n <= max;
  const clone = (s) => JSON.parse(JSON.stringify(s));
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function random(s) {
    let seed = s.rng >>> 0;
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    s.rng = seed >>> 0;
    return s.rng / 4294967296;
  }
  function shuffle(s, array) {
    array = array.slice();
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random(s) * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  function owned(s, player = s.current) {
    return s.territories
      .map((t, i) => (t.owner === player ? i : -1))
      .filter((i) => i >= 0);
  }
  function bonus(s, player = s.current) {
    const countries = owned(s, player);
    return continents.filter((c) =>
      territories
        .filter((t) => t.continent === c.id)
        .every((t) => s.territories[byId[t.id]].owner === player),
    );
  }
  function reinforcements(s, player = s.current) {
    return (
      Math.max(3, Math.floor(owned(s, player).length / 3)) +
      bonus(s, player).reduce((n, c) => n + c.bonus, 0)
    );
  }
  function addLog(s, message) {
    s.log.unshift(message);
    s.log = s.log.slice(0, 80);
  }
  function cardSymbol(card) {
    return card >= 42 ? 3 : card % 3;
  }
  function validSet(cards) {
    if (cards.length !== 3 || new Set(cards).size !== 3) return false;
    const symbols = cards.map(cardSymbol).filter((n) => n !== 3);
    return (
      new Set(symbols).size === 1 ||
      new Set(symbols).size === symbols.length ||
      !symbols.length
    );
  }
  function findSet(s, player = s.current) {
    const cards = s.players[player].cards;
    let best = null,
      bestScore = -1;
    for (let a = 0; a < cards.length; a++)
      for (let b = a + 1; b < cards.length; b++)
        for (let c = b + 1; c < cards.length; c++) {
          const set = [cards[a], cards[b], cards[c]];
          if (validSet(set)) {
            const score = set.some(
              (id) => id < 42 && s.territories[id].owner === player,
            )
              ? 1
              : 0;
            if (score > bestScore) {
              best = set;
              bestScore = score;
            }
          }
        }
    return best;
  }
  function connected(s, from, to, player = s.current) {
    if (
      !integer(from, 0, 41) ||
      !integer(to, 0, 41) ||
      s.territories[from].owner !== player ||
      s.territories[to].owner !== player
    )
      return false;
    const seen = new Set([from]),
      queue = [from];
    for (let k = 0; k < queue.length; k++) {
      const current = queue[k];
      if (current === to) return true;
      for (const next of territories[current].neighbors)
        if (!seen.has(next) && s.territories[next].owner === player) {
          seen.add(next);
          queue.push(next);
        }
    }
    return false;
  }
  function newGame(players, seed = Date.now()) {
    assert(
      Array.isArray(players) && players.length >= 2 && players.length <= 6,
      "Kies 2 tot en met 6 spelers.",
    );
    const s = {
      version: 1,
      rng: seed >>> 0 || 1,
      players: players.map((p, i) => ({
        name:
          String(p.name || `Speler ${i + 1}`)
            .trim()
            .slice(0, 24) || `Speler ${i + 1}`,
        ai: !!p.ai,
        color: COLORS[i],
        cards: [],
      })),
      territories: [],
      current: 0,
      phase: "reinforce",
      pool: 0,
      round: 1,
      turn: 1,
      conquered: false,
      fortified: false,
      pending: null,
      winner: null,
      sets: 0,
      deck: [],
      discard: [],
      log: [],
      lastBattle: null,
      resumeAttack: false,
    };
    const order = shuffle(
      s,
      territories.map((_, i) => i),
    );
    for (let i = 0; i < 42; i++)
      s.territories[order[i]] = { owner: i % players.length, armies: 1 };
    const initial = [0, 0, 40, 35, 30, 25, 20][players.length];
    for (let player = 0; player < players.length; player++) {
      const countries = owned(s, player);
      for (let n = countries.length; n < initial; n++)
        s.territories[countries[Math.floor(random(s) * countries.length)]]
          .armies++;
    }
    s.deck = shuffle(
      s,
      Array.from({ length: 44 }, (_, i) => i),
    );
    s.pool = reinforcements(s);
    addLog(
      s,
      `${s.players[0].name} begint met ${s.pool} versterkingen. De startlegers zijn automatisch verdeeld.`,
    );
    return s;
  }
  function finishCapture(s) {
    const previous = s.pending.defender;
    s.pending = null;
    if (!owned(s, previous).length) {
      s.players[s.current].cards.push(...s.players[previous].cards);
      s.players[previous].cards = [];
      addLog(
        s,
        `${s.players[previous].name} is uitgeschakeld. De kaarten gaan naar ${s.players[s.current].name}.`,
      );
    }
    if (owned(s).length === 42) {
      s.winner = s.current;
      s.phase = "won";
      s.pool = 0;
      s.resumeAttack = false;
      addLog(s, `${s.players[s.current].name} heeft de wereld veroverd!`);
    } else if (s.players[s.current].cards.length >= 6) {
      s.phase = "reinforce";
      s.resumeAttack = true;
      s.pool = 0;
      addLog(
        s,
        "Ruil eerst een set kaarten en plaats de extra legers, daarna kun je verder aanvallen.",
      );
    }
  }
  function nextTurn(s) {
    if (s.conquered) {
      if (!s.deck.length) {
        s.deck = shuffle(s, s.discard);
        s.discard = [];
      }
      if (s.deck.length) {
        s.players[s.current].cards.push(s.deck.pop());
        addLog(
          s,
          `${s.players[s.current].name} krijgt een kaart voor het veroveren van een land.`,
        );
      }
    }
    const old = s.current;
    do {
      s.current = (s.current + 1) % s.players.length;
    } while (!owned(s).length);
    if (s.current <= old) s.round++;
    s.turn++;
    s.phase = "reinforce";
    s.pool = reinforcements(s);
    s.conquered = false;
    s.fortified = false;
    s.lastBattle = null;
    s.resumeAttack = false;
    addLog(
      s,
      `${s.players[s.current].name} is aan de beurt: ${s.pool} versterkingen.`,
    );
  }
  function apply(state, action) {
    assert(validState(state), "De opgeslagen Wereldmacht-gegevens zijn ongeldig.");
    const s = clone(state),
      player = s.players[s.current],
      name = player.name;
    assert(s.phase !== "won", "Dit spel is al afgelopen.");
    if (s.pending)
      assert(
        action.type === "occupy",
        "Kies eerst hoeveel legers het veroverde land bezetten.",
      );
    const territory = (id) => {
      assert(integer(id, 0, 41), "Kies een geldig land.");
      return s.territories[id];
    };
    if (action.type === "reinforce") {
      assert(
        s.phase === "reinforce",
        "Je kunt nu geen versterkingen plaatsen.",
      );
      const target = territory(action.to);
      assert(
        target.owner === s.current,
        "Plaats versterkingen in een eigen land.",
      );
      assert(
        integer(action.amount, 1, s.pool),
        "Kies een geldig aantal versterkingen.",
      );
      target.armies += action.amount;
      s.pool -= action.amount;
      addLog(
        s,
        `${name} plaatst ${action.amount} ${action.amount === 1 ? "leger" : "legers"} in ${territories[action.to].name}.`,
      );
    } else if (action.type === "trade") {
      assert(
        s.phase === "reinforce",
        "Ruil je kaarten tijdens het versterken.",
      );
      assert(
        Array.isArray(action.cards) &&
          action.cards.every((c) => player.cards.includes(c)) &&
          validSet(action.cards),
        "Kies drie gelijke symbolen of drie verschillende; jokers mogen meedoen.",
      );
      const value = [4, 6, 8, 10, 12, 15][s.sets] || 15 + (s.sets - 5) * 5;
      s.sets++;
      s.pool += value;
      player.cards = player.cards.filter((c) => !action.cards.includes(c));
      s.discard.push(...action.cards);
      const extra = action.cards.find(
        (id) => id < 42 && s.territories[id].owner === s.current,
      );
      if (extra != null) s.territories[extra].armies += 2;
      addLog(
        s,
        `${name} ruilt kaarten voor ${value} versterkingen${extra != null ? ` en 2 legers in ${territories[extra].name}` : ""}.`,
      );
    } else if (action.type === "advance") {
      if (s.phase === "reinforce") {
        assert(s.pool === 0, "Plaats eerst al je versterkingen.");
        assert(
          player.cards.length < (s.resumeAttack ? 6 : 5),
          "Ruil eerst een set kaarten.",
        );
        s.phase = "attack";
        s.resumeAttack = false;
      } else if (s.phase === "attack") s.phase = "fortify";
      else throw new Error("Sluit je beurt af met ‘Beurt beëindigen’.");
    } else if (action.type === "attack") {
      assert(
        s.phase === "attack",
        "Je kunt alleen aanvallen in de aanvalsfase.",
      );
      const from = territory(action.from),
        to = territory(action.to);
      assert(
        from.owner === s.current && to.owner !== s.current,
        "Val vanuit een eigen land een tegenstander aan.",
      );
      assert(
        territories[action.from].neighbors.includes(action.to),
        "Deze landen grenzen niet aan elkaar.",
      );
      assert(
        integer(action.dice, 1, Math.min(3, from.armies - 1)),
        "Laat minimaal één leger achter en kies maximaal 3 dobbelstenen.",
      );
      const defender = to.owner,
        attack = Array.from(
          { length: action.dice },
          () => 1 + Math.floor(random(s) * 6),
        ).sort((a, b) => b - a),
        defend = Array.from(
          { length: Math.min(2, to.armies) },
          () => 1 + Math.floor(random(s) * 6),
        ).sort((a, b) => b - a);
      let attackLoss = 0,
        defendLoss = 0;
      for (let i = 0; i < Math.min(attack.length, defend.length); i++) {
        if (attack[i] > defend[i]) defendLoss++;
        else attackLoss++;
      }
      from.armies -= attackLoss;
      to.armies -= defendLoss;
      s.lastBattle = {
        from: action.from,
        to: action.to,
        attack,
        defend,
        attackLoss,
        defendLoss,
      };
      addLog(
        s,
        `${territories[action.from].name} → ${territories[action.to].name}: aanvaller −${attackLoss}, verdediger −${defendLoss}.`,
      );
      if (to.armies === 0) {
        to.owner = s.current;
        to.armies = action.dice;
        from.armies -= action.dice;
        s.conquered = true;
        s.pending = {
          from: action.from,
          to: action.to,
          min: action.dice,
          max: from.armies + action.dice - 1,
          defender,
        };
        addLog(
          s,
          `${name} verovert ${territories[action.to].name}. Kies de bezetting.`,
        );
      }
    } else if (action.type === "occupy") {
      assert(s.pending, "Er is geen veroverd land om te bezetten.");
      assert(
        integer(action.amount, s.pending.min, s.pending.max),
        "Kies een geldig aantal legers voor de bezetting.",
      );
      const extra = action.amount - s.pending.min;
      s.territories[s.pending.from].armies -= extra;
      s.territories[s.pending.to].armies += extra;
      finishCapture(s);
    } else if (action.type === "fortify") {
      assert(
        s.phase === "fortify" && !s.fortified,
        "Je mag één verplaatsing doen aan het einde van je beurt.",
      );
      const from = territory(action.from),
        to = territory(action.to);
      assert(
        action.from !== action.to && connected(s, action.from, action.to),
        "Verplaats tussen eigen landen via een aaneengesloten route.",
      );
      assert(
        integer(action.amount, 1, from.armies - 1),
        "Laat minimaal één leger achter.",
      );
      from.armies -= action.amount;
      to.armies += action.amount;
      s.fortified = true;
      addLog(
        s,
        `${name} verplaatst ${action.amount} legers van ${territories[action.from].name} naar ${territories[action.to].name}.`,
      );
    } else if (action.type === "endTurn") {
      assert(
        s.phase === "fortify",
        "Rond eerst het versterken en aanvallen af.",
      );
      nextTurn(s);
    } else throw new Error("Onbekende spelactie.");
    assert(validState(s), "De spelactie leverde ongeldige gegevens op.");
    return s;
  }
  function validState(s) {
    if (
      !s ||
      s.version !== 1 ||
      !Array.isArray(s.players) ||
      s.players.length < 2 ||
      s.players.length > 6 ||
      !Array.isArray(s.territories) ||
      s.territories.length !== 42
    )
      return false;
    const count = s.players.length;
    if (
      !s.players.every(
        (p) =>
          p &&
          typeof p.name === "string" &&
          p.name.length > 0 &&
          p.name.length <= 24 &&
          typeof p.ai === "boolean" &&
          typeof p.color === "string" &&
          COLORS.includes(p.color) &&
          Array.isArray(p.cards),
      )
    )
      return false;
    if (
      !s.territories.every(
        (t) =>
          t && integer(t.owner, 0, count - 1) && integer(t.armies, 1, 100000),
      )
    )
      return false;
    if (
      !integer(s.current, 0, count - 1) ||
      !["reinforce", "attack", "fortify", "won"].includes(s.phase) ||
      !integer(s.pool, 0, 100000) ||
      !integer(s.rng, 1, 4294967295) ||
      !integer(s.round, 1) ||
      !integer(s.turn, 1) ||
      !integer(s.sets, 0) ||
      !Array.isArray(s.deck) ||
      !Array.isArray(s.discard) ||
      !Array.isArray(s.log) ||
      !s.log.every((x) => typeof x === "string") ||
      typeof s.conquered !== "boolean" ||
      typeof s.fortified !== "boolean" ||
      typeof s.resumeAttack !== "boolean"
    )
      return false;
    if (
      s.winner !== null &&
      (!integer(s.winner, 0, count - 1) ||
        s.phase !== "won" ||
        owned(s, s.winner).length !== 42)
    )
      return false;
    if (s.phase === "won" && s.winner === null) return false;
    if (!owned(s).length) return false;
    if (s.phase !== "reinforce" && s.pool !== 0) return false;
    const cards = [
      ...s.deck,
      ...s.discard,
      ...s.players.flatMap((p) => p.cards),
    ];
    if (
      cards.length !== 44 ||
      new Set(cards).size !== 44 ||
      !cards.every((c) => integer(c, 0, 43))
    )
      return false;
    if (s.pending) {
      const p = s.pending;
      if (
        s.phase !== "attack" ||
        !integer(p.from, 0, 41) ||
        !integer(p.to, 0, 41) ||
        p.from === p.to ||
        !territories[p.from].neighbors.includes(p.to) ||
        !integer(p.defender, 0, count - 1) ||
        p.defender === s.current ||
        !integer(p.min, 1, 3) ||
        !integer(p.max, p.min, 100000) ||
        s.territories[p.from].owner !== s.current ||
        s.territories[p.to].owner !== s.current ||
        s.territories[p.to].armies !== p.min ||
        s.territories[p.from].armies + s.territories[p.to].armies - 1 !== p.max
      )
        return false;
    }
    if (
      s.lastBattle &&
      (!integer(s.lastBattle.from, 0, 41) ||
        !integer(s.lastBattle.to, 0, 41) ||
        !Array.isArray(s.lastBattle.attack) ||
        !Array.isArray(s.lastBattle.defend) ||
        !s.lastBattle.attack.every((n) => integer(n, 1, 6)) ||
        !s.lastBattle.defend.every((n) => integer(n, 1, 6)))
    )
      return false;
    return true;
  }
  function frontier(s, player = s.current) {
    return owned(s, player).filter((i) =>
      territories[i].neighbors.some((n) => s.territories[n].owner !== player),
    );
  }
  function chooseAction(s, difficulty = "normal") {
    if (s.phase === "won") return null;
    if (s.pending) {
      const threat = (i) =>
        territories[i].neighbors
          .filter((n) => s.territories[n].owner !== s.current)
          .reduce((sum, n) => sum + s.territories[n].armies, 0);
      const behind = threat(s.pending.from),
        ahead = threat(s.pending.to);
      // Keep a border guard instead of marching the whole army away from an enemy stack.
      const share =
        behind === 0
          ? s.pending.max
          : ahead === 0
            ? s.pending.min
            : Math.round((s.pending.max * ahead) / (behind + ahead));
      return {
        type: "occupy",
        amount: Math.max(s.pending.min, Math.min(s.pending.max, share)),
      };
    }
    if (s.phase === "reinforce") {
      const set = findSet(s);
      if (set) return { type: "trade", cards: set };
      if (s.pool) {
        const border = frontier(s),
          candidates = border.length ? border : owned(s);
        const strength = (i) => {
          const enemies = territories[i].neighbors.filter(
            (n) => s.territories[n].owner !== s.current,
          );
          const weakest = enemies.length
            ? Math.min(...enemies.map((n) => s.territories[n].armies))
            : 0;
          const continent = territories.filter(
            (t) => t.continent === territories[i].continent,
          );
          const fraction =
            continent.filter(
              (t) => s.territories[byId[t.id]].owner === s.current,
            ).length / continent.length;
          return s.territories[i].armies - weakest + fraction * 6;
        };
        const to =
          difficulty === "easy"
            ? candidates[s.rng % candidates.length]
            : candidates.reduce((a, b) => (strength(a) >= strength(b) ? a : b));
        return { type: "reinforce", to, amount: s.pool };
      }
      return { type: "advance" };
    }
    if (s.phase === "attack") {
      const candidates = [];
      for (const from of frontier(s))
        for (const to of territories[from].neighbors) {
          const a = s.territories[from],
            d = s.territories[to];
          if (d.owner === s.current) continue;
          const ratio =
            difficulty === "easy" ? 1.05 : difficulty === "strong" ? 1.35 : 1.6;
          if (a.armies >= 4 && a.armies - 1 >= d.armies * ratio) {
            const region = territories.filter(
                (t) => t.continent === territories[to].continent,
              ),
              remaining = region.filter(
                (t) => s.territories[byId[t.id]].owner !== s.current,
              ).length;
            const elimination = owned(s, d.owner).length === 1 ? 10 : 0;
            candidates.push({
              from,
              to,
              score: a.armies - d.armies + 6 / remaining + elimination,
            });
          }
        }
      if (candidates.length) {
        candidates.sort((a, b) => b.score - a.score);
        return {
          type: "attack",
          from: candidates[0].from,
          to: candidates[0].to,
          dice: Math.min(3, s.territories[candidates[0].from].armies - 1),
        };
      }
      return { type: "advance" };
    }
    if (s.phase === "fortify" && !s.fortified) {
      const borders = frontier(s);
      for (const from of owned(s)
        .filter((i) => !borders.includes(i) && s.territories[i].armies > 1)
        .sort((a, b) => s.territories[b].armies - s.territories[a].armies)) {
        const targets = borders.filter((to) => connected(s, from, to));
        if (targets.length) {
          const to = targets.reduce((a, b) =>
            s.territories[a].armies >= s.territories[b].armies ? a : b,
          );
          return {
            type: "fortify",
            from,
            to,
            amount: s.territories[from].armies - 1,
          };
        }
      }
    }
    return { type: "endTurn" };
  }
  return {
    territories,
    continents,
    edges,
    byId,
    COLORS,
    newGame,
    apply,
    validState,
    owned,
    bonus,
    reinforcements,
    connected,
    validSet,
    findSet,
    cardSymbol,
    chooseAction,
  };
});

(function () {
  "use strict";
  const E = window.ReneRiskEngine,
    $ = (id) => document.getElementById(id),
    esc = (x) =>
      String(x).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const phases = {
    reinforce: "Versterken",
    attack: "Aanvallen",
    fortify: "Verplaatsen",
    won: "Gewonnen",
  };
  const symbols = ["♟", "♞", "♜", "★"];
  function create(api) {
    let state = api.storage.get("rk.save", null),
      active = false,
      selected = null,
      target = null,
      cards = [],
      handoff = false,
      botTimer = null,
      battleTimer = null,
      autoBattle = null,
      zoom = 1,
      lastTurn = 0,
      diceChoice = null;
    const storedInvalid = state !== null && !E.validState(state);
    if (storedInvalid) state = null;
    let settings = Object.assign(
      { players: 3, humans: 1, difficulty: "normal", tempo: "normal", sound: true, music: true },
      api.storage.get("rk.settings", {}),
    );
    api.music?.(() => settings.music !== false);
    function sound(name) { if (settings.sound !== false) api.sfx?.(name); }
    const isHuman = () => state && !state.players[state.current].ai;
    const blocked = () =>
      !state || !isHuman() || handoff || state.phase === "won";
    const modalOpen = () =>
      !!document.querySelector(".modal.show,.overlay.show");
    function stop() {
      clearTimeout(botTimer);
      clearTimeout(battleTimer);
      botTimer = null;
      battleTimer = null;
      autoBattle = null;
    }
    function save() {
      if (active && state && !window.__noSave)
        api.storage.set("rk.save", state);
    }
    function apply(action) {
      try {
        const previousTurn = state.turn;
        state = E.apply(state, action);
        if (state.winner !== null && !state.statsRecorded) {
          const stats = api.storage.get("rk.stats", { played: 0, won: 0 });
          stats.finished = (stats.finished || 0) + 1;
          if (!state.players[state.winner].ai) stats.won = (stats.won || 0) + 1;
          api.storage.set("rk.stats", stats);
          state.statsRecorded = true;
        }
        save();
        if (action.type === "attack") sound(state.pending ? "rkCapture" : "rkDice");
        else if (action.type === "trade") sound("rkTrade");
        else if (action.type === "reinforce" || action.type === "fortify") sound("rkPlace");
        if (state.winner !== null) sound("rkWin");
        if (state.turn !== previousTurn) {
          selected = null;
          target = null;
          cards = [];
          diceChoice = null;
          checkHandoff();
        }
        if (state.pending) {
          selected = state.pending.from;
          target = state.pending.to;
        }
        if (state.winner !== null) stop();
        render();
        if (isHuman() && !handoff)
          window.ReneEnhancements.announce(state.log[0]);
        schedule();
        return true;
      } catch (error) {
        stop();
        api.toast(error.message, 3500);
        return false;
      }
    }
    function checkHandoff() {
      if (!state) return;
      handoff = state.players.filter((p) => !p.ai).length > 1 && isHuman();
      if (handoff) {
        $("rkHandoffTitle").textContent =
          `Beurt van ${state.players[state.current].name}`;
        api.modal("rkHandoffModal");
      }
    }
    function schedule() {
      if (
        botTimer ||
        !active ||
        document.hidden ||
        modalOpen() ||
        !state ||
        state.phase === "won" ||
        isHuman()
      )
        return;
      botTimer = setTimeout(
        () => {
          botTimer = null;
          if (!active || document.hidden || modalOpen()) return;
          const action = E.chooseAction(state, settings.difficulty);
          if (action) apply(action);
        },
        settings.tempo === "fast" ? 65 : 280,
      );
    }
    function choose(id) {
      if (!state || blocked() || state.pending) return;
      const t = state.territories[id];
      if (
        state.phase === "attack" &&
        t.owner !== state.current &&
        selected !== null &&
        state.territories[selected].owner === state.current
      ) {
        if (!E.territories[selected].neighbors.includes(id)) {
          api.toast("Deze landen grenzen niet aan elkaar.");
          return;
        }
        target = id;
      } else if (
        state.phase === "fortify" &&
        t.owner === state.current &&
        selected !== null &&
        selected !== id &&
        state.territories[selected].owner === state.current
      ) {
        if (!E.connected(state, selected, id)) {
          api.toast("Verplaatsen kan alleen via eigen landen.");
          return;
        }
        target = id;
      } else {
        selected = id;
        target = null;
        diceChoice = null;
      }
      stop();
      render();
    }
    const hulls = [
      [
        "na",
        "M28 102 165 35 285 75 422 28 443 138 388 242 325 333 267 433 183 405 108 314 78 229 22 171Z",
        170,
        50,
      ],
      [
        "sa",
        "M266 358 373 333 463 422 468 506 386 647 312 610 279 499Z",
        350,
        650,
      ],
      ["eu", "M445 68 640 32 752 90 763 245 682 343 511 334 458 250Z", 553, 42],
      [
        "af",
        "M481 342 642 327 726 405 741 574 651 648 550 632 511 522Z",
        600,
        654,
      ],
      [
        "as",
        "M751 65 908 16 1122 35 1143 177 1118 359 1000 482 878 469 791 399 690 342 747 244Z",
        909,
        20,
      ],
      ["au", "M868 486 1098 453 1140 574 1127 662 925 660 879 580Z", 1029, 665],
    ];
    function drawMap() {
      $("rkMap").innerHTML =
        `<defs><pattern id="rkSea" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="1" fill="#708b9917"/></pattern></defs><rect width="1160" height="680" fill="#dce8eb"/><rect width="1160" height="680" fill="url(#rkSea)"/>` +
        hulls
          .map(([id, path, x, y]) => {
            const c = E.continents.find((c) => c.id === id);
            return `<path d="${path}" fill="${c.color}" fill-opacity=".35" stroke="#fff" stroke-opacity=".8" stroke-width="3"/><text x="${x}" y="${y}" fill="#344d5b" font-family="system-ui" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="1">${c.name.toUpperCase()} +${c.bonus}</text>`;
          })
          .join("") +
        E.edges
          .map(([a, b]) => {
            const from = E.territories[E.byId[a]],
              to = E.territories[E.byId[b]],
              sea = from.continent !== to.continent;
            if (
              (a === "alaska" && b === "kamchatka") ||
              (b === "alaska" && a === "kamchatka")
            )
              return '<path d="M70 135H0M1080 120H1160" stroke="#567786" stroke-width="2" stroke-dasharray="5 5"/><text x="14" y="120" fill="#567786" font-size="13">↔</text><text x="1140" y="105" fill="#567786" font-size="13">↔</text>';
            return `<path class="rk-route" data-route="${E.byId[a]}-${E.byId[b]}" d="M${from.x} ${from.y}L${to.x} ${to.y}" stroke="#345766" stroke-opacity="${sea ? 0.55 : 0.17}" stroke-width="${sea ? 2 : 1.5}" ${sea ? 'stroke-dasharray="5 5"' : ""}/>`;
          })
          .join("") +
        E.territories
          .map(
            (t, i) =>
              `<g class="rk-country" data-country="${i}" role="button" tabindex="0" transform="translate(${t.x} ${t.y})"><title>${t.name}</title><path class="rk-country-shape" d="M-31-22 0-35 31-22 31 21 0 35-31 21Z"/><text class="rk-abbr" y="-16">${t.short}</text><text class="rk-armies" y="6"></text><text class="rk-owner" y="23"></text></g>`,
          )
          .join("");
    }
    function updateMap() {
      const focusedCountry = $("rkCountryList").contains(
        document.activeElement,
      )
        ? document.activeElement.dataset.country
        : null;
      $("rkMap")
        .querySelectorAll("[data-country]")
        .forEach((node) => {
          const i = Number(node.dataset.country),
            t = state.territories[i],
            p = state.players[t.owner];
          node.querySelector("path").setAttribute("fill", p.color);
          node.querySelector(".rk-armies").textContent = t.armies;
          node.querySelector(".rk-owner").textContent =
            `SPELER ${t.owner + 1}`;
          node.setAttribute(
            "aria-label",
            `${E.territories[i].name}, speler ${t.owner + 1}, ${p.name}, ${t.armies} legers`,
          );
          node.setAttribute(
            "aria-pressed",
            String(i === selected || i === target),
          );
          node.classList.toggle("selected", i === selected);
          node.classList.toggle("target", i === target);
          node.classList.toggle(
            "neighbor",
            selected !== null && E.territories[selected].neighbors.includes(i),
          );
        });
      $("rkCountryList").innerHTML = E.continents
        .map(
          (c) =>
            `<h3>${c.name} · +${c.bonus}</h3><div>${E.territories
              .map((t, i) => {
                if (t.continent !== c.id) return "";
                const country = state.territories[i],
                  p = state.players[country.owner];
                return `<button data-country="${i}" class="${i === selected ? "selected" : i === target ? "target" : ""}" aria-pressed="${i === selected || i === target}"><i style="background:${p.color}">${country.owner + 1}</i><span>${t.name}<small>${esc(p.name)}</small></span><b>${country.armies}</b><span class="visually-hidden">legers</span></button>`;
              })
              .join("")}</div>`,
        )
        .join("");
      if (focusedCountry != null)
        $("rkCountryList")
          .querySelector(`[data-country="${focusedCountry}"]`)
          ?.focus({ preventScroll: true });
      const ownedBonuses = E.bonus(state).map((c) => c.id);
      $("rkContinentBonuses").innerHTML = E.continents
        .map(
          (c) =>
            `<span class="${ownedBonuses.includes(c.id) ? "owned" : ""}">${c.name} +${c.bonus}${ownedBonuses.includes(c.id) ? " ✓" : ""}</span>`,
        )
        .join("");
    }
    function options(indices, value) {
      return (
        '<option value="">Kies een land</option>' +
        indices
          .map(
            (i) =>
              `<option value="${i}" ${i === value ? "selected" : ""}>${E.territories[i].name} (${state.territories[i].armies})</option>`,
          )
          .join("")
      );
    }
    function amount(max, value = 1, min = 1) {
      return `<label>Aantal legers<div class="rk-amount"><input id="rkAmount" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}"><button data-action="all" data-max="${max}">Alle ${max}</button></div></label>`;
    }
    function button(label, action, disabled = false, secondary = false) {
      return `<button id="rkAction${action}" class="rk-action ${secondary ? "rk-secondary" : ""}" data-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
    }
    function renderControls() {
      const focused = document.activeElement?.id,
        wasInControls = $("rkControls").contains(document.activeElement),
        selection = selected !== null ? state.territories[selected] : null;
      const own = selection && selection.owner === state.current,
        canAct = !blocked();
      let html = "";
      if (state.phase === "won")
        html = `<h3>🏆 ${esc(state.players[state.winner].name)} wint!</h3><p class="rk-muted">Alle 42 landen zijn veroverd in ${state.round} rondes.</p>${button("Nieuw spel", "new")}${button("Naar menu", "menu", false, true)}`;
      else if (handoff)
        html = `<h3>Geef het toestel door</h3><p class="rk-muted">De kaarten en acties van ${esc(state.players[state.current].name)} blijven verborgen.</p>${button("Mijn beurt bekijken", "handoff")}`;
      else if (!isHuman())
        html = `<h3>${esc(state.players[state.current].name)} speelt</h3><p class="rk-muted">De computer ${state.phase === "reinforce" ? "plaatst versterkingen" : state.phase === "attack" ? "bekijkt de grenzen" : "rondt de beurt af"}. Je kunt op elk moment pauzeren of naar het menu gaan.</p>${button("Pauze", "pause", false, true)}`;
      else if (state.pending)
        html = `<h3>Land veroverd!</h3><p class="rk-muted">${E.territories[state.pending.to].name} is van jou. Er moeten minstens ${state.pending.min} legers heen; één leger blijft achter in ${E.territories[state.pending.from].name}.</p>${amount(state.pending.max, state.pending.min, state.pending.min)}${button("Bezetting bevestigen", "occupy")}`;
      else {
        html = `<h3>${selection ? E.territories[selected].name : "Kies een eigen land"}</h3><p class="rk-muted">${selection ? `${esc(state.players[selection.owner].name)} · ${selection.armies} legers` : "Tik op de kaart of kies hieronder een land."}</p><label>${state.phase === "reinforce" ? "Land voor versterkingen" : "Vanuit"}<select id="rkFrom">${options(E.owned(state), own ? selected : null)}</select></label>`;
        if (state.phase === "reinforce") {
          html += `<p class="rk-muted"><b>${state.pool}</b> versterkingen over${E.bonus(state).length ? " · inclusief continentbonus" : ""}.</p>`;
          if (state.pool)
            html +=
              amount(state.pool, Math.min(state.pool, 3)) +
              button("Legers plaatsen", "reinforce", !own);
          const hand = state.players[state.current].cards,
            required = hand.length >= (state.resumeAttack ? 6 : 5);
          if (hand.length) {
            if (!cards.length) cards = E.findSet(state) || [];
            html += `<h4>Kaarten (${hand.length})${required ? " · ruilen verplicht" : ""}</h4><div class="rk-cards">${hand.map((id) => `<button id="rkCard${id}" data-card="${id}" aria-pressed="${cards.includes(id)}" aria-label="${id < 42 ? E.territories[id].name : "Joker"}, ${["infanterie", "cavalerie", "artillerie", "joker"][E.cardSymbol(id)]}${cards.includes(id) ? ", geselecteerd" : ""}">${symbols[E.cardSymbol(id)]}<small>${id < 42 ? E.territories[id].name : "Joker"}</small></button>`).join("")}</div>${button("Geselecteerde set ruilen", "trade", !E.validSet(cards))}`;
          }
          html += button(
            state.resumeAttack ? "Verder aanvallen" : "Naar aanvallen",
            "advance",
            state.pool > 0 || required,
            true,
          );
        } else if (state.phase === "attack") {
          const enemies = own
            ? E.territories[selected].neighbors.filter(
                (i) => state.territories[i].owner !== state.current,
              )
            : [];
          if (target !== null && !enemies.includes(target)) target = null;
          html += `<label>Aangrenzend vijandelijk land<select id="rkTarget">${options(enemies, target)}</select></label><label>Dobbelstenen<select id="rkDice">${[
            1, 2, 3,
          ]
            .filter((n) => own && n < selection.armies)
            .map(
              (n) =>
                `<option value="${n}" ${n === Math.min(diceChoice || 3, selection.armies - 1) ? "selected" : ""}>${n} ${n === 1 ? "dobbelsteen" : "dobbelstenen"}</option>`,
            )
            .join("")}</select></label>`;
          const invalid = !own || selection.armies < 2 || target === null;
          html += `<div class="rk-buttons">${button("Eén worp", "attack", invalid)}${button(autoBattle ? "Stop" : "Doorvechten", autoBattle ? "stop" : "blitz", invalid, true)}</div>${button("Aanvallen afronden", "advance", false, true)}`;
        } else if (state.phase === "fortify") {
          if (!state.fortified) {
            const targets = own
              ? E.owned(state).filter(
                  (i) => i !== selected && E.connected(state, selected, i),
                )
              : [];
            if (target !== null && !targets.includes(target)) target = null;
            html += `<label>Naar verbonden eigen land<select id="rkTarget">${options(targets, target)}</select></label>`;
            if (own && selection.armies > 1)
              html += amount(selection.armies - 1, 1);
            html += button(
              "Legers verplaatsen",
              "fortify",
              !own || selection.armies < 2 || target === null,
            );
          } else
            html += '<p class="rk-muted">Je hebt je verplaatsing gedaan.</p>';
          html += button("Beurt beëindigen", "endTurn");
        }
      }
      $("rkControls").innerHTML = html;
      if (focused && $(focused) && $("rkControls").contains($(focused)))
        $(focused).focus({ preventScroll: true });
      else if (wasInControls)
        $("rkControls")
          .querySelector("button:not(:disabled),select,input")
          ?.focus({ preventScroll: true });
      $("rkControls")
        .querySelectorAll("button[data-card]")
        .forEach((b) => {
          b.disabled = !canAct;
        });
    }
    function render() {
      if (!state) return;
      const p = state.players[state.current];
      $("rkRound").textContent =
        `Ronde ${state.round} · ${state.players.length} spelers`;
      $("rkPlayerName").textContent =
        state.phase === "won"
          ? `${state.players[state.winner].name} heeft gewonnen`
          : p.name;
      $("rkPlayerBadge").style.background = p.color;
      $("rkPlayerBadge").textContent = state.current + 1;
      $("rkPhase").textContent = phases[state.phase];
      $("rkInstruction").textContent = state.pending
        ? "Kies hoeveel legers het veroverde land bezetten."
        : state.phase === "reinforce"
          ? `Plaats ${state.pool} versterkingen in je eigen landen.`
          : state.phase === "attack"
            ? "Kies een eigen land en een vijandelijke buur. Eén leger blijft achter."
            : state.phase === "fortify"
              ? "Verplaats één keer via eigen landen, of beëindig je beurt."
              : "De wereld is veroverd.";
      $("rkScoreboard").innerHTML = state.players
        .map(
          (p, i) =>
            `<div class="rk-score ${i === state.current ? "active" : ""} ${E.owned(state, i).length ? "" : "out"}"><span style="background:${p.color}">${i + 1}</span><div><b>${esc(p.name)}${p.ai ? " 🤖" : ""}</b><small>${E.owned(state, i).length} landen · ${p.cards.length} kaarten${E.owned(state, i).length ? "" : " · uitgeschakeld"}</small></div></div>`,
        )
        .join("");
      updateMap();
      renderControls();
      const b = state.lastBattle;
      $("rkBattle").innerHTML = b
        ? `<h4>${E.territories[b.from].name} → ${E.territories[b.to].name}</h4><div class="rk-dice-row"><span>Aanval</span>${b.attack.map((n) => `<span class="rk-die">${n}</span>`).join("")}</div><div class="rk-dice-row"><span>Verdediging</span>${b.defend.map((n) => `<span class="rk-die defense">${n}</span>`).join("")}</div><p>Aanvaller verliest ${b.attackLoss}, verdediger ${b.defendLoss}. Bij gelijke worpen wint de verdediger.</p>`
        : "";
      $("rkHistory").innerHTML = state.log
        .map((text) => `<li>${esc(text)}</li>`)
        .join("");
      if (state.turn !== lastTurn) {
        lastTurn = state.turn;
        window.ReneEnhancements.announce(
          `Beurt van ${p.name}. ${phases[state.phase]}. ${state.pool} versterkingen.`,
        );
      }
    }
    function startBlitz() {
      autoBattle = { from: selected, to: target, turn: state.turn };
      const tick = () => {
        battleTimer = null;
        if (
          !autoBattle ||
          !active ||
          document.hidden ||
          modalOpen() ||
          state.turn !== autoBattle.turn ||
          state.phase !== "attack" ||
          state.pending ||
          state.territories[autoBattle.from].armies < 2 ||
          state.territories[autoBattle.to].owner === state.current
        ) {
          stop();
          renderControls();
          return;
        }
        const pair = autoBattle;
        if (
          apply({
            type: "attack",
            from: pair.from,
            to: pair.to,
            dice: Math.min(
              diceChoice || 3,
              state.territories[pair.from].armies - 1,
            ),
          }) &&
          autoBattle
        )
          battleTimer = setTimeout(tick, 220);
      };
      tick();
    }
    function leave() {
      stop();
      save();
      active = false;
      api.close();
      api.menu();
    }
    function setupNames() {
      const total = Number($("rkPlayerCount").value),
        previous = Number($("rkHumanCount").value) || 1;
      $("rkHumanCount").innerHTML = Array.from(
        { length: total },
        (_, i) =>
          `<option value="${i + 1}">${i + 1} ${i ? "mensen" : "mens"}</option>`,
      ).join("");
      $("rkHumanCount").value = Math.min(previous, total);
      const saved = [...$("rkNames").querySelectorAll("input")].map(
        (i) => i.value,
      );
      const profile = (api.storage.get("app.profiles", []) || []).find(
        (p) => p.id === api.storage.get("app.profile", "p0"),
      );
      $("rkNames").innerHTML = Array.from(
        { length: Number($("rkHumanCount").value) },
        (_, i) =>
          `<label>Naam speler ${i + 1}<input id="rkName${i}" maxlength="24" value="${esc(saved[i] || (!i && profile?.name) || `Speler ${i + 1}`)}"></label>`,
      ).join("");
    }
    function showStart() {
      stop();
      $("rkResume").hidden = !state;
      $("rkPlayerCount").value = settings.players;
      setupNames();
      $("rkHumanCount").value = Math.min(
        settings.humans,
        Number($("rkPlayerCount").value),
      );
      setupNames();
      $("rkDifficulty").value = settings.difficulty;
      $("rkTempo").value = settings.tempo;
      $("rkSound").checked = settings.sound !== false;
      $("rkMusic").checked = settings.music !== false;
      api.modal("rkStartModal");
    }
    function enter() {
      api.close();
      api.enter();
      if (!api.isActive()) return;
      active = true;
      fitMap();
      if (state) {
        render();
        if (isHuman() && state.players.filter((p) => !p.ai).length > 1)
          checkHandoff();
        schedule();
      } else {
        showStart();
        if (storedInvalid)
          api.toast(
            "Het opgeslagen Wereldmacht-spel is beschadigd. Je gegevens blijven bewaard totdat je een nieuw spel start.",
            4500,
          );
      }
    }
    drawMap();
    $("rkBack").addEventListener("click", leave);
    $("rkStartMenu").addEventListener("click", leave);
    $("rkPauseMenu").addEventListener("click", leave);
    $("rkPause").addEventListener("click", () => {
      stop();
      save();
      api.modal("rkPauseModal");
    });
    $("rkContinue").addEventListener("click", () => {
      api.close();
      schedule();
    });
    $("rkHelp").addEventListener("click", () => {
      stop();
      api.modal("rkHelpModal");
    });
    $("rkNew").addEventListener("click", showStart);
    $("rkResume").addEventListener("click", () => {
      api.close();
      render();
      checkHandoff();
      schedule();
    });
    $("rkPlayerCount").addEventListener("change", setupNames);
    $("rkHumanCount").addEventListener("change", setupNames);
    for (const [id,key] of [["rkSound","sound"],["rkMusic","music"]]) $(id).addEventListener("change", () => {
      settings[key] = $(id).checked;
      api.storage.set("rk.settings", settings);
      api.refreshSound?.();
    });
    $("rkStart").addEventListener("click", async () => {
      if (
        state &&
        state.phase !== "won" &&
        !(await api.confirm(
          "Nieuw Wereldmacht-spel?",
          "Je huidige Wereldmacht-spel wordt vervangen.",
          "Nieuw spel",
        ))
      ) {
        api.modal("rkStartModal");
        return;
      }
      settings = {
        players: Number($("rkPlayerCount").value),
        humans: Number($("rkHumanCount").value),
        difficulty: $("rkDifficulty").value,
        tempo: $("rkTempo").value,
        sound: $("rkSound").checked,
        music: $("rkMusic").checked,
      };
      const players = Array.from({ length: settings.players }, (_, i) => ({
        name:
          i < settings.humans
            ? $("rkName" + i).value
            : `Computer ${i - settings.humans + 1}`,
        ai: i >= settings.humans,
      }));
      state = E.newGame(players);
      selected = null;
      target = null;
      cards = [];
      lastTurn = 0;
      handoff = false;
      api.storage.set("rk.settings", settings);
      const stats = api.storage.get("rk.stats", { played: 0, won: 0 });
      stats.played = (stats.played || 0) + 1;
      api.storage.set("rk.stats", stats);
      save();
      api.close();
      render();
      checkHandoff();
      schedule();
    });
    function beginTurn() {
      handoff = false;
      api.close();
      render();
      schedule();
    }
    $("rkBeginTurn").addEventListener("click", beginTurn);
    function changeView(list) {
      $("rkCountryList").hidden = !list;
      $("rkMapViewport").hidden = list;
      $("rkZoomTools").hidden = list;
      $("rkMapTip").hidden = list;
      $("rkMapTab").setAttribute("aria-pressed", String(!list));
      $("rkListTab").setAttribute("aria-pressed", String(list));
    }
    $("rkMapTab").addEventListener("click", () => changeView(false));
    $("rkListTab").addEventListener("click", () => changeView(true));
    const resizeMap = () => {
      $("rkMap").style.width = `${1160 * zoom}px`;
      $("rkMap").style.height = `${680 * zoom}px`;
    };
    function fitMap() {
      const width = $("rkMapViewport").clientWidth;
      if (width >= 700) {
        zoom = Math.min(1, width / 1160);
        resizeMap();
        $("rkMapViewport").style.height = `${680 * zoom}px`;
      } else {
        $("rkMapViewport").style.height = "";
        zoom = 1;
        resizeMap();
      }
    }
    $("rkZoomIn").addEventListener("click", () => {
      zoom = Math.min(1.7, zoom + 0.15);
      resizeMap();
    });
    $("rkZoomOut").addEventListener("click", () => {
      zoom = Math.max(0.8, zoom - 0.15);
      resizeMap();
    });
    $("rk").addEventListener("click", (event) => {
      const country = event.target.closest("[data-country]");
      if (country) {
        choose(Number(country.dataset.country));
        return;
      }
      const card = event.target.closest("[data-card]");
      if (card) {
        const id = Number(card.dataset.card);
        cards = cards.includes(id)
          ? cards.filter((c) => c !== id)
          : cards.length < 3
            ? [...cards, id]
            : [id];
        renderControls();
        return;
      }
      const b = event.target.closest("[data-action]");
      if (!b || b.disabled) return;
      const type = b.dataset.action,
        amount = Number($("rkAmount")?.value);
      if (type === "all") {
        $("rkAmount").value = b.dataset.max;
        return;
      }
      if (type === "new") {
        showStart();
        return;
      }
      if (type === "menu") {
        leave();
        return;
      }
      if (type === "handoff") {
        beginTurn();
        return;
      }
      if (type === "pause") {
        stop();
        save();
        api.modal("rkPauseModal");
        return;
      }
      if (blocked()) return;
      if (type === "blitz") {
        startBlitz();
        return;
      }
      if (type === "stop") {
        stop();
        renderControls();
        return;
      }
      stop();
      if (type === "attack")
        apply({
          type,
          from: selected,
          to: target,
          dice: Number($("rkDice")?.value),
        });
      else if (type === "reinforce") apply({ type, to: selected, amount });
      else if (type === "fortify")
        apply({ type, from: selected, to: target, amount });
      else if (type === "occupy") apply({ type, amount });
      else if (type === "trade") {
        const selection = cards.slice();
        cards = [];
        apply({ type, cards: selection });
      } else apply({ type });
    });
    $("rk").addEventListener("change", (event) => {
      if (event.target.id === "rkFrom") {
        selected =
          event.target.value === "" ? null : Number(event.target.value);
        target = null;
        stop();
        render();
      }
      if (event.target.id === "rkTarget") {
        target = event.target.value === "" ? null : Number(event.target.value);
        stop();
        updateMap();
        renderControls();
      }
      if (event.target.id === "rkDice")
        diceChoice = Number(event.target.value);
    });
    $("rkMap").addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        const node = event.target.closest("[data-country]");
        if (node) {
          event.preventDefault();
          choose(Number(node.dataset.country));
        }
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stop();
        save();
      } else schedule();
    });
    window.addEventListener("pagehide", () => {
      stop();
      save();
    });
    const watcher = new MutationObserver(() => {
      if (modalOpen()) {
        clearTimeout(botTimer);
        clearTimeout(battleTimer);
        botTimer = null;
        battleTimer = null;
        autoBattle = null;
      } else schedule();
    });
    document
      .querySelectorAll(".modal,.overlay")
      .forEach((el) =>
        watcher.observe(el, { attributes: true, attributeFilter: ["class"] }),
      );
    return {
      enter,
      leave,
      hasSave: () => E.validState(api.storage.get("rk.save", null)),
      save,
    };
  }
  window.ReneRisk = { create };
})();

const Wereldmacht = window.ReneRisk.create({
  storage: store, config: appCfg, enter: () => show('rk'), isActive: () => current === 'rk',
  menu: () => { show('menu'); refreshMenu(); }, close: closeModals, modal: openModal,
  confirm: askConfirm, toast: menuToast, sfx: name => Sfx.play(name),
  music: predicate => Sfx.gate('rk', predicate), refreshSound: () => Sfx.refresh(),
});
$('#tileRk').addEventListener('click', () => window.openGame('rk'));
/* RK_JS_END */
