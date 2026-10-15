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
      bonus(s, player).reduce((n, c) => n + c.bonus, 0) +
      (s.capitals || []).filter(i => i !== null && s.territories[i].owner === player).length * 2
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
            const score = tradeValue(s, set) * 10 + (set.some(
              (id) => id < 42 && s.territories[id].owner === player,
            )
              ? 2
              : 0);
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
  function newGame(players, seed = Date.now(), options = {}) {
    assert(
      Array.isArray(players) && players.length >= 2 && players.length <= 6,
      "Kies 2 tot en met 6 spelers.",
    );
    const s = {
      version: 1,
      rules: {
        goal: ["world", "domination", "capital", "mission"].includes(options.goal) ? options.goal : "world",
        cards: options.cards === "fixed" ? "fixed" : "progressive",
        dice: options.dice === "balanced" ? "balanced" : "random",
        setup: options.setup === "manual" ? "manual" : "auto",
      },
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
    if (s.rules.setup !== "manual") for (let player = 0; player < players.length; player++) {
      const countries = owned(s, player);
      for (let n = countries.length; n < initial; n++)
        s.territories[countries[Math.floor(random(s) * countries.length)]]
          .armies++;
    }
    s.deck = shuffle(
      s,
      Array.from({ length: 44 }, (_, i) => i),
    );
    if (s.rules.goal === "capital") s.capitals = players.map(() => null);
    if (s.rules.goal === "mission") s.missions = shuffle(s, missions.map(m => m.id)).slice(0,players.length);
    if (s.rules.setup === "manual") {
      s.setupRemaining = players.map((_,i) => initial - owned(s,i).length);
      s.phase = "deploy"; s.pool = Math.min(3,s.setupRemaining[0]);
      addLog(s,"De landen zijn verdeeld. Plaats om de beurt maximaal drie startlegers.");
    } else beginPlay(s);
    return s;
  }
  function beginPlay(s) {
    s.current = 0;
    if (s.capitals?.some(i => i === null)) {
      s.phase = "capital"; s.pool = 0;
      addLog(s,"Kies om de beurt een eigen gebied als hoofdstad.");
    } else {
      s.phase = "reinforce"; s.pool = reinforcements(s);
      addLog(s,`${s.players[0].name} begint met ${s.pool} versterkingen.`);
    }
  }
  function nextDeployment(s) {
    if (s.setupRemaining.every(n => n === 0)) beginPlay(s);
    else {
      do { s.current = (s.current+1)%s.players.length; } while (!s.setupRemaining[s.current]);
      s.pool = Math.min(3,s.setupRemaining[s.current]);
    }
    s.turn++;
  }
  const missions = [
    {id:"territories",text:"Verover 24 gebieden.",count:24},
    {id:"garrisons",text:"Bezet 18 gebieden met minstens twee legers per gebied.",count:18,armies:2},
    {id:"asia-africa",text:"Verover Azië en Afrika.",continents:["as","af"]},
    {id:"asia-south",text:"Verover Azië en Zuid-Amerika.",continents:["as","sa"]},
    {id:"north-africa",text:"Verover Noord-Amerika en Afrika.",continents:["na","af"]},
    {id:"north-oceania",text:"Verover Noord-Amerika en Oceanië.",continents:["na","au"]},
    {id:"europe-oceania",text:"Verover Europa, Oceanië en nog een continent.",continents:["eu","au"],extra:true},
    {id:"europe-south",text:"Verover Europa, Zuid-Amerika en nog een continent.",continents:["eu","sa"],extra:true},
  ];
  function mission(s,player=s.current) { return missions.find(m=>m.id===s.missions?.[player]); }
  function hasWon(s,player=s.current) {
    if (s.rules?.goal === "capital") return s.capitals.every(i=>i!==null && s.territories[i].owner===player);
    if (s.rules?.goal === "mission") {
      const m=mission(s,player); if (!m) return false;
      if (m.count) return owned(s,player).filter(i=>s.territories[i].armies >= (m.armies||1)).length >= m.count;
      const ids=bonus(s,player).map(c=>c.id);
      return m.continents.every(id=>ids.includes(id)) && (!m.extra || ids.length>=3);
    }
    return owned(s,player).length >= victoryTarget(s);
  }
  function checkVictory(s) {
    if (s.pending || ["deploy","capital"].includes(s.phase)) return;
    const winner=[s.current,...s.players.map((_,i)=>i).filter(i=>i!==s.current)].find(i=>hasWon(s,i));
    if (winner === undefined) return;
    s.winner=winner; s.phase="won"; s.pool=0; s.resumeAttack=false;
    addLog(s,`${s.players[winner].name} wint${s.rules?.goal === "mission" ? ": "+mission(s,winner).text : s.rules?.goal === "capital" ? " met alle hoofdsteden!" : " met "+owned(s,winner).length+" gebieden!"}`);
  }
  function defenseDice(s,id) { return s.capitals?.includes(id) ? 3 : 2; }
  function rollBattle(s,a,d,maxDefense,once=false,dice=3) {
    const initialA=a,initialD=d; let attack=[],defend=[],rounds=0;
    do {
      attack=Array.from({length:Math.min(dice,a)},()=>1+Math.floor(random(s)*6)).sort((x,y)=>y-x);
      defend=Array.from({length:Math.min(maxDefense,d)},()=>1+Math.floor(random(s)*6)).sort((x,y)=>y-x);
      for (let i=0;i<Math.min(attack.length,defend.length);i++) { if (attack[i]>defend[i]) d--; else a--; }
      rounds++;
    } while (!once && a>0 && d>0);
    return {a,d,attack,defend,attackLoss:initialA-a,defendLoss:initialD-d,rounds};
  }
  const battleDistributions = new Map();
  function balancedBattle(s,a,d,maxDefense) {
    // Exact terminal probabilities, with bounded memory. Cache only the small result vector.
    if (a*d>1000000) {
      const trials=Array.from({length:3},()=>rollBattle(s,a,d,maxDefense));
      trials.sort((x,y)=>(x.d===0?x.a:-x.d)-(y.d===0?y.a:-y.d));
      return trials[1];
    }
    const key=`${a},${d},${maxDefense}`;
    let outcomes=battleDistributions.get(key);
    if (!outcomes) {
      const columns=d+1, grid=new Float64Array((a+1)*columns);
      grid[a*columns+d]=1;
      for (let x=a;x>0;x--) for (let y=d;y>0;y--) {
        const probability=grid[x*columns+y]; if (!probability) continue;
        for (const [al,dl,p] of rollOutcomes[`${Math.min(3,x)},${Math.min(maxDefense,y)}`]) grid[(x-al)*columns+y-dl] += probability*p;
      }
      outcomes=[];
      for (let y=d;y>0;y--) if (grid[y]) outcomes.push({a:0,d:y,p:grid[y]});
      for (let x=1;x<=a;x++) if (grid[x*columns]) outcomes.push({a:x,d:0,p:grid[x*columns]});
      if (battleDistributions.size>=16) battleDistributions.delete(battleDistributions.keys().next().value);
      battleDistributions.set(key,outcomes);
    }
    // Remove the outer deciles, then concentrate on likely outcomes. This is our own
    // balancing implementation; ordinary rolls retain the unmodified dice probabilities.
    const draws=[random(s),random(s),random(s)].sort((x,y)=>x-y);
    let q=.1+.8*draws[1],chosen=outcomes.at(-1);
    for (const outcome of outcomes) { q-=outcome.p; if(q<=0) {chosen=outcome;break;} }
    return {a:chosen.a,d:chosen.d,attack:[],defend:[],attackLoss:a-chosen.a,defendLoss:d-chosen.d,rounds:null};
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
    checkVictory(s);
    if (s.winner !== null) return;
    if (s.players[s.current].cards.length >= 6) {
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
        ["reinforce","deploy"].includes(s.phase),
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
      if (s.phase === "deploy") s.setupRemaining[s.current] -= action.amount;
      addLog(
        s,
        `${name} plaatst ${action.amount} ${action.amount === 1 ? "leger" : "legers"} in ${territories[action.to].name}.`,
      );
    } else if (action.type === "capital") {
      assert(s.phase === "capital" && s.capitals[s.current] === null,"Kies alleen tijdens de start een hoofdstad.");
      assert(territory(action.to).owner === s.current,"Kies een eigen gebied als hoofdstad.");
      s.capitals[s.current] = action.to;
      addLog(s,`${name} kiest ${territories[action.to].name} als hoofdstad.`);
      if (s.capitals.every(i=>i!==null)) beginPlay(s);
      else do { s.current=(s.current+1)%s.players.length; } while (s.capitals[s.current]!==null);
      s.turn++;
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
      const value = tradeValue(s, action.cards);
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
      if (s.phase === "deploy") {
        assert(s.pool === 0,"Plaats eerst je startlegers.");
        nextDeployment(s);
      } else if (s.phase === "reinforce") {
        assert(s.pool === 0, "Plaats eerst al je versterkingen.");
        assert(
          player.cards.length < (s.resumeAttack ? 6 : 5),
          "Ruil eerst een set kaarten.",
        );
        s.phase = "attack";
        s.resumeAttack = false;
      } else if (s.phase === "attack") s.phase = "fortify";
      else throw new Error("Sluit je beurt af met ‘Beurt beëindigen’.");
    } else if (action.type === "attack" || action.type === "blitz") {
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
      const blitz=action.type === "blitz";
      assert(blitz ? integer(action.amount,1,from.armies-1) : integer(action.dice,1,Math.min(3,from.armies-1)),"Laat minimaal één leger achter en kies een geldig aantal aanvalslegers.");
      const defender=to.owner, committed=blitz ? action.amount : from.armies-1;
      const balanced=blitz && s.rules?.dice === "balanced";
      const result=balanced ? balancedBattle(s,committed,to.armies,defenseDice(s,action.to)) : rollBattle(s,committed,to.armies,defenseDice(s,action.to),!blitz,blitz?3:action.dice);
      const {attack,defend,attackLoss,defendLoss}=result;
      from.armies -= attackLoss;
      to.armies -= defendLoss;
      s.lastBattle = {
        from: action.from,
        to: action.to,
        attack,
        defend,
        attackLoss,
        defendLoss,
        ...(blitz ? {blitz:true,balanced,rounds:result.rounds} : {}),
      };
      addLog(
        s,
        `${territories[action.from].name} → ${territories[action.to].name}: aanvaller −${attackLoss}, verdediger −${defendLoss}.`,
      );
      if (to.armies === 0) {
        to.owner = s.current;
        const move = Math.min(blitz ? 3 : attack.length,committed,result.a,from.armies-1);
        to.armies = move;
        from.armies -= move;
        s.conquered = true;
        s.pending = {
          from: action.from,
          to: action.to,
          min: move,
          max: from.armies + move - 1,
          suggested: Math.max(move,Math.min(from.armies + move - 1,result.a)),
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
    checkVictory(s);
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
    if (s.rules !== undefined && (!s.rules || typeof s.rules !== "object" || Array.isArray(s.rules) ||
      !["world", "domination", "capital", "mission"].includes(s.rules.goal) ||
      !["progressive", "fixed"].includes(s.rules.cards) ||
      (s.rules.dice !== undefined && !["random","balanced"].includes(s.rules.dice)) ||
      (s.rules.setup !== undefined && !["auto","manual"].includes(s.rules.setup)))) return false;
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
      !["deploy", "capital", "reinforce", "attack", "fortify", "won"].includes(s.phase) ||
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
    if (s.rules?.goal === "capital") {
      if (!Array.isArray(s.capitals) || s.capitals.length!==count ||
        !s.capitals.every(i=>i===null || integer(i,0,41)) ||
        new Set(s.capitals.filter(i=>i!==null)).size!==s.capitals.filter(i=>i!==null).length ||
        (!["deploy","capital"].includes(s.phase) && s.capitals.includes(null)) ||
        (s.phase==="capital" && s.capitals[s.current]!==null)) return false;
    } else if (s.phase==="capital" || s.capitals!==undefined) return false;
    if (s.rules?.goal === "mission" && (!Array.isArray(s.missions) || s.missions.length!==count ||
      new Set(s.missions).size!==count || !s.missions.every(id=>missions.some(m=>m.id===id)))) return false;
    if (s.setupRemaining!==undefined && (!Array.isArray(s.setupRemaining) || s.setupRemaining.length!==count ||
      !s.setupRemaining.every(n=>integer(n,0,40)) || (s.phase!=="deploy" && s.setupRemaining.some(n=>n!==0)))) return false;
    if (s.phase==="deploy" && (s.rules?.setup!=="manual" || !s.setupRemaining ||
      s.pool>s.setupRemaining[s.current] || s.pool>3)) return false;
    if (
      s.winner !== null &&
      (!integer(s.winner, 0, count - 1) ||
        s.phase !== "won" ||
        !hasWon(s, s.winner))
    )
      return false;
    if (s.phase === "won" && s.winner === null) return false;
    if (!owned(s).length) return false;
    if (!["reinforce","deploy"].includes(s.phase) && s.pool !== 0) return false;
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
        (p.suggested!==undefined && !integer(p.suggested,p.min,p.max)) ||
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
  function victoryTarget(s) { return s.rules?.goal === "domination" ? 30 : 42; }
  function tradeValue(s, cards) {
    if (s.rules?.cards !== "fixed") return [4, 6, 8, 10, 12, 15][s.sets] || 15 + (s.sets - 5) * 5;
    const symbols = cards.map(cardSymbol).filter(n => n !== 3);
    // A joker takes the most valuable valid place in the selected set.
    if (new Set(symbols).size > 1) return 10;
    if (symbols.length < 2) return 10;
    return [4, 6, 8][symbols[0]];
  }
  const rollCounts = {
    "1,1":[[0,1,15],[1,0,21]], "1,2":[[0,1,55],[1,0,161]], "1,3":[[0,1,225],[1,0,1071]],
    "2,1":[[0,1,125],[1,0,91]], "2,2":[[0,2,295],[1,1,420],[2,0,581]], "2,3":[[0,2,979],[1,1,1981],[2,0,4816]],
    "3,1":[[0,1,855],[1,0,441]], "3,2":[[0,2,2890],[1,1,2611],[2,0,2275]], "3,3":[[0,3,6420],[1,2,10017],[2,1,12348],[3,0,17871]],
  };
  const rollOutcomes=Object.fromEntries(Object.entries(rollCounts).map(([key,rows])=>[key,rows.map(([a,d,n])=>[a,d,n/6**key.split(",").map(Number).reduce((x,y)=>x+y,0)])]));
  function battleOdds(attackers, defenders, maxDefense=2, mode="random") {
    if (!integer(attackers, 0, 200) || !integer(defenders, 0, 200) || ![2,3].includes(maxDefense)) return null;
    const table = Array.from({length:attackers+1},()=>new Float64Array(defenders+1));
    for (let a=0;a<=attackers;a++) table[a][0]=1;
    for (let a=1;a<=attackers;a++) for (let d=1;d<=defenders;d++)
      for (const [al,dl,p] of rollOutcomes[`${Math.min(3,a)},${Math.min(maxDefense,d)}`]) table[a][d] += p*table[a-al][d-dl];
    const p=table[attackers][defenders];
    const q=Math.max(0,Math.min(1,(p-.1)/.8));
    return mode==="balanced" ? q*q*(3-2*q) : p;
  }
  function frontier(s, player = s.current) {
    return owned(s, player).filter((i) =>
      territories[i].neighbors.some((n) => s.territories[n].owner !== player),
    );
  }
  function chooseAction(s, difficulty = "normal") {
    if (s.phase === "won") return null;
    if (s.phase === "capital") {
      const choices=owned(s), score=i=>s.territories[i].armies*2-territories[i].neighbors.length;
      return {type:"capital",to:choices.reduce((a,b)=>score(a)>score(b)?a:b)};
    }
    if (s.phase === "deploy") {
      if (!s.pool) return {type:"advance"};
      const choices=frontier(s), candidates=choices.length?choices:owned(s);
      const to=candidates.reduce((a,b)=>s.territories[a].armies>s.territories[b].armies?a:b);
      return {type:"reinforce",to,amount:s.pool};
    }
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
      const required=s.players[s.current].cards.length >= (s.resumeAttack?6:5);
      if (set && (s.rules?.cards==="fixed" || required || frontier(s).some(i=>territories[i].neighbors.some(n=>s.territories[n].owner!==s.current && s.territories[n].armies>s.territories[i].armies*2)))) return { type: "trade", cards: set };
      if (s.pool) {
        const m=mission(s);
        if (m?.armies && owned(s).filter(i=>s.territories[i].armies>=m.armies).length<m.count) {
          const to=owned(s).find(i=>s.territories[i].armies<m.armies);
          if (to!==undefined) return {type:"reinforce",to,amount:Math.min(s.pool,m.armies-s.territories[to].armies)};
        }
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
          const capGuard=s.capitals?.includes(i)?Math.max(0,weakest-s.territories[i].armies+6):0;
          return s.territories[i].armies - weakest + fraction * 6 + capGuard;
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
          if (a.armies >= 4 && a.armies - 1 >= d.armies * (defenseDice(s,to)===3 ? ratio*1.4 : ratio)) {
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
              score: a.armies - d.armies + 6 / remaining + elimination + (s.capitals?.includes(to)?12:0) + (mission(s)?.continents?.includes(territories[to].continent)?8:0),
            });
          }
        }
      if (candidates.length) {
        candidates.sort((a, b) => b.score - a.score);
        return {
          type: s.rules?.dice === "balanced" ? "blitz" : "attack",
          amount: s.territories[candidates[0].from].armies-1,
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
    victoryTarget,
    hasWon,
    mission,
    defenseDice,
    tradeValue,
    battleOdds,
  };
});
