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
    deploy: "Startlegers",
    capital: "Hoofdstad kiezen",
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
      feedbackTimer = null,
      encounter = null,
      poolDrag = null,
      draggedPool = false,
      lastTurn = 0,
      diceChoice = null,
      commitChoice = null;
    const storedInvalid = state !== null && !E.validState(state);
    if (storedInvalid) state = null;
    let settings = Object.assign(
      { players: 3, humans: 1, difficulty: "normal", tempo: "normal", sound: true, music: true, goal: "world", cardMode: "progressive", dice: "balanced", setup: "auto" },
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
      botTimer = null;
    }
    function cancelPoolDrag() { poolDrag = null; $("rkPoolGhost").hidden = true; }
    function feedback(title, detail = "") {
      clearTimeout(feedbackTimer);
      $("rkFeedback").innerHTML = `<b>${esc(title)}</b><span>${esc(detail)}</span>`;
      $("rkFeedback").hidden = false;
      feedbackTimer = setTimeout(() => { $("rkFeedback").hidden = true; feedbackTimer = null; }, 4200);
    }
    // Small original vector commanders keep every profile recognisable offline.
    function portrait(i) {
      const skin = ["#d9a776","#a86f4d","#e5b593","#bc895f","#eac5a0","#b87955"][i],
        hair = ["#583b29","#252c39","#8e5032","#32302b","#e5d0a3","#4f3228"][i];
      return `<svg class="rk-portrait" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="${E.COLORS[i]}"/><path d="M6 64Q6 44 22 43H42Q58 44 58 64" fill="#172d40"/><path d="M21 45L32 56L43 45M15 52L22 55M49 52L42 55" fill="none" stroke="#e8c97c" stroke-width="3"/><path d="M27 38H37V48L32 53L27 48" fill="${skin}"/><ellipse cx="32" cy="28" rx="14" ry="18" fill="${skin}"/><path d="M17 27V18Q18 5 32 5Q47 5 47 22L44 28L41 16Q30 20 22 15L20 28Z" fill="${hair}"/>${i%3===0 ? '<path d="M14 18Q17 4 32 4Q47 4 50 18L46 23H18Z" fill="#263b46"/><path d="M19 18H45" stroke="#edcd7b" stroke-width="3"/><path d="M29 9L32 6L35 9L32 13Z" fill="#edcd7b"/>' : i%3===1 ? '<path d="M17 17Q30 8 46 17L44 10Q31 0 20 9Z" fill="#e2c984"/>' : '<path d="M20 14Q31 20 44 12" fill="none" stroke="#edcd7b" stroke-width="4"/>'}<path d="M23 27H28M36 27H41" stroke="${hair}" stroke-width="2"/><circle cx="26" cy="30" r="1.5" fill="#202733"/><circle cx="38" cy="30" r="1.5" fill="#202733"/><path d="M32 30L30 36H33" stroke="#875e46" fill="none" stroke-width="1.2"/>${i%2 ? '<path d="M25 39Q32 43 39 39" fill="none" stroke="#784d36" stroke-width="1.5"/>' : `<path d="M23 39Q28 34 32 38Q36 34 41 39L36 41L32 39L28 41Z" fill="${hair}"/>`}<circle cx="32" cy="60" r="2" fill="#e8c97c"/></svg><em>${i+1}</em>`;
    }
    function matchup(from, to, kind) {
      const a = state.territories[from], b = state.territories[to];
      return `<div class="rk-encounter"><div class="rk-country-card" style="--player:${state.players[a.owner].color}"><small>${kind === "attack" ? "AANVALLER" : "VANUIT"}</small><b>${E.territories[from].name}</b><span class="rk-force" id="rkFromCount">${a.armies}</span><small id="rkFromCaption">legers</small></div><button data-action="focus" class="rk-versus" aria-label="Inzoomen op deze twee landen">${kind === "attack" ? "⚔" : "→"}<small>Kaart</small></button><div class="rk-country-card" style="--player:${state.players[b.owner].color}"><small>${kind === "attack" ? "VERDEDIGER" : "NAAR"}</small><b>${E.territories[to].name}</b><span class="rk-force" id="rkToCount">${b.armies}</span><small id="rkToCaption">legers</small></div></div>`;
    }
    function previewTransfer() {
      if (!state || !$("rkFromCount") || !$("rkAmount")) return;
      const from = state.pending?.from ?? selected, to = state.pending?.to ?? target;
      if (from === null || to === null) return;
      const input = $("rkAmount"), n = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value) || Number(input.min)));
      const extra = n - (state.pending?.min || 0);
      $("rkFromCount").textContent = state.territories[from].armies - extra;
      $("rkToCount").textContent = state.territories[to].armies + extra;
      $("rkFromCaption").textContent = "blijven achter";
      $("rkToCaption").textContent = "na verplaatsing";
      board.preview(from, to, extra);
    }
    function save() {
      if (active && state && !window.__noSave)
        api.storage.set("rk.save", state);
    }
    function apply(action) {
      try {
        const previousTurn = state.turn, previousCapture = state.pending;
        state = E.apply(state, action);
        if (["attack", "blitz"].includes(action.type)) encounter = { ...state.lastBattle, turn: state.turn };
        if (state.winner !== null && !state.statsRecorded) {
          const stats = api.storage.get("rk.stats", { played: 0, won: 0 });
          stats.finished = (stats.finished || 0) + 1;
          if (!state.players[state.winner].ai) stats.won = (stats.won || 0) + 1;
          api.storage.set("rk.stats", stats);
          state.statsRecorded = true;
        }
        save();
        if (["attack","blitz"].includes(action.type)) sound(state.pending ? "rkCapture" : "rkDice");
        else if (action.type === "trade") sound("rkTrade");
        else if (action.type === "reinforce" || action.type === "fortify") sound("rkPlace");
        if (state.winner !== null) sound("rkWin");
        if (state.turn !== previousTurn) {
          selected = null;
          target = null;
          cards = [];
          diceChoice = null;
          commitChoice = null;
          encounter = null;
          checkHandoff();
        }
        if (action.type === "occupy" && previousCapture) {
          selected = previousCapture.to; target = null; diceChoice = null; commitChoice = null;
          feedback(`${E.territories[selected].name} veroverd`, "Tik op de volgende vijandelijke buur om verder aan te vallen.");
        }
        if (action.type === "advance" && state.phase === "fortify") { selected = null; target = null; }
        if ((action.type === "advance" && ["attack","fortify"].includes(state.phase)) || action.type === "occupy") $("rk").classList.add("rk-dock-collapsed");
        if (action.type === "reinforce") { feedback(`+${action.amount} legers`, E.territories[action.to].name); board.effect(action.to, `+${action.amount}`); }
        if (["attack", "blitz"].includes(action.type)) board.effect(action.to, state.pending ? "Veroverd!" : `−${state.lastBattle.defendLoss}`);
        if (action.type === "fortify") { feedback("Legers verplaatst", `${action.amount} naar ${E.territories[action.to].name}. Je kunt je beurt beëindigen.`); selected = null; target = null; $("rk").classList.add("rk-dock-collapsed"); }
        if (action.type === "endTurn") $("rkFeedback").hidden = true;
        if (state.pending || state.winner !== null) {
          $("rk").classList.remove("rk-dock-collapsed");
          $("rkDockToggle").setAttribute("aria-expanded", "true");
        }
        if (state.pending) {
          selected = state.pending.from;
          target = state.pending.to;
        }
        if (state.winner !== null) stop();
        render();
        if (state.pending && !previousCapture) $("rkControls").parentElement.scrollTop = 0;
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
      if (state.territories[id].owner !== state.current && (state.phase !== "attack" || selected === null || state.territories[selected].owner !== state.current)) {
        feedback(E.territories[id].name, `${state.players[state.territories[id].owner].name} · ${state.territories[id].armies} legers. Kies eerst een eigen leger.`);
        return;
      }
      $("rk").classList.remove("rk-dock-collapsed");
      $("rkDockToggle").setAttribute("aria-expanded", "true");
      $("rkViewMenu").open = false;
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
        commitChoice = null;
      }
      if (["attack","fortify"].includes(state.phase) && target === null) $("rk").classList.add("rk-dock-collapsed");
      stop();
      render();
      $("rkControls").parentElement.scrollTop = 0;
    }
    const board = window.ReneWereldBoard.create({
      engine: E, data: window.ReneWereldMap, onSelect: choose,
      onActions: () => {
        $("rk").classList.remove("rk-dock-collapsed");
        $("rkDockToggle").setAttribute("aria-expanded", "true");
        $("rkControls").scrollIntoView({ block: "start", behavior: "auto" });
        $("rkControls").querySelector("button:not(:disabled),select,input")?.focus({ preventScroll: true });
      },
    });
    function updateMap() {
      const focusedCountry = $("rkCountryList").contains(
        document.activeElement,
      )
        ? document.activeElement.dataset.country
        : null;
      board.update(state, { selected, target, handoff });
      $("rkCountryList").innerHTML = E.continents
        .map(
          (c) =>
            `<h3>${c.name} · +${c.bonus}</h3><div>${E.territories
              .map((t, i) => {
                if (t.continent !== c.id) return "";
                const country = state.territories[i],
                  p = state.players[country.owner];
                return `<button data-country="${i}" class="${i === selected ? "selected" : i === target ? "target" : ""}" aria-pressed="${i === selected || i === target}"><i style="background:${p.color}">${country.owner + 1}</i><span>${t.name}${state.capitals?.includes(i) ? " ♛" : ""}<small>${esc(p.name)}</small></span><b>${country.armies}</b><span class="visually-hidden">legers</span></button>`;
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
            `<button data-continent="${c.id}" class="${ownedBonuses.includes(c.id) ? "owned" : ""}" style="--continent:${window.ReneWereldBoard.palette[c.id]}" aria-label="Inzoomen op ${c.name}, continentbonus ${c.bonus}">${c.name} +${c.bonus}${ownedBonuses.includes(c.id) ? " ✓" : ""}</button>`,
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
      return `<div class="rk-troops"><label for="rkAmount">Aantal legers</label><div class="rk-amount"><button data-action="less" aria-label="Eén leger minder">−</button><input id="rkAmount" aria-label="Aantal legers" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}"><button data-action="more" aria-label="Eén leger meer">+</button><button data-action="all" data-max="${max}">Max</button></div><input id="rkAmountRange" aria-label="Aantal legers met schuifregelaar" type="range" min="${min}" max="${max}" value="${value}"></div>`;
    }
    function button(label, action, disabled = false, secondary = false) {
      return `<button id="rkAction${action}" class="rk-action ${secondary ? "rk-secondary" : ""}" data-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
    }
    function die(n, defense = false) {
      const spots = [[5,5],[15,5],[5,10],[15,10],[5,15],[15,15],[10,10]];
      const faces = { 1:[6], 2:[0,5], 3:[0,5,6], 4:[0,1,4,5], 5:[0,1,4,5,6], 6:[0,1,2,3,4,5] };
      return `<span class="rk-die ${defense ? "defense" : ""}" role="img" aria-label="${n} ogen"><svg viewBox="0 0 20 20" aria-hidden="true">${faces[n].map(i => `<circle cx="${spots[i][0]}" cy="${spots[i][1]}" r="1.7"/>`).join("")}</svg></span>`;
    }
    function renderControls() {
      const focused = document.activeElement?.id,
        wasInControls = $("rkControls").contains(document.activeElement),
        selection = selected !== null ? state.territories[selected] : null;
      const own = selection && selection.owner === state.current,
        canAct = !blocked();
      const handOpen = $("rkControls").querySelector(".rk-card-hand")?.open,
        accessibleOpen = $("rkControls").querySelector(".rk-accessible")?.open;
      const mustTrade = !handoff && isHuman() && state.phase === "reinforce" && state.players[state.current].cards.length >= (state.resumeAttack ? 6 : 5);
      if (state.pending || state.winner !== null || mustTrade || ["deploy","capital"].includes(state.phase)) {
        $("rk").classList.remove("rk-dock-collapsed");
        $("rkDockToggle").setAttribute("aria-expanded", "true");
      }
      let html = "";
      if (state.phase === "won")
        html = `<h3>🏆 ${esc(state.players[state.winner].name)} wint!</h3><p class="rk-muted">${state.rules?.goal === "capital" ? "Alle hoofdsteden zijn in handen van de winnaar." : state.rules?.goal === "mission" ? esc(E.mission(state,state.winner).text) : E.owned(state, state.winner).length+" gebieden veroverd."} · ${state.round} rondes.</p>${button("Nieuw spel", "new")}${button("Naar menu", "menu", false, true)}`;
      else if (handoff)
        html = `<h3>Geef het toestel door</h3><p class="rk-muted">De kaarten en acties van ${esc(state.players[state.current].name)} blijven verborgen.</p>${button("Mijn beurt bekijken", "handoff")}`;
      else if (!isHuman())
        html = `<h3>${esc(state.players[state.current].name)} speelt</h3><p class="rk-muted">De computer ${state.phase === "reinforce" ? "plaatst versterkingen" : state.phase === "attack" ? "bekijkt de grenzen" : "rondt de beurt af"}. Je kunt op elk moment pauzeren of naar het menu gaan.</p>${button("Pauze", "pause", false, true)}`;
      else if (state.phase === "capital")
        html = `<h3>Kies je hoofdstad</h3><p class="rk-muted">Een hoofdstad geeft elke beurt 2 extra legers en verdedigt met maximaal 3 dobbelstenen. Verover alle hoofdsteden om te winnen.</p><label>Hoofdstad<select id="rkFrom">${options(E.owned(state),own?selected:null)}</select></label>${button(own ? E.territories[selected].name+" als hoofdstad" : "Kies een eigen gebied", "capital", !own)}`;
      else if (state.phase === "deploy")
        html = `<h3>Startlegers plaatsen</h3><p class="rk-muted">Je hebt nog ${state.setupRemaining[state.current]} startlegers. Plaats er deze keer maximaal ${state.pool}; daarna is de volgende speler aan de beurt.</p><label>Eigen gebied<select id="rkFrom">${options(E.owned(state),own?selected:null)}</select></label>${state.pool && own ? amount(state.pool,state.pool)+button("Startlegers plaatsen","reinforce") : ""}${button("Volgende speler →","advance",state.pool>0,true)}`;
      else if (state.pending)
        html = `<h3 class="rk-capture-title">✓ Land veroverd!</h3>${state.lastBattle ? `<div class="rk-conquest-result">Jij −${state.lastBattle.attackLoss} · Tegenstander −${state.lastBattle.defendLoss}</div>` : ""}${matchup(state.pending.from, state.pending.to, "transfer")}<p class="rk-muted">Kies je bezetting. Minimaal ${state.pending.min} legers gaan mee.</p>${amount(state.pending.max, state.pending.suggested ?? state.pending.max, state.pending.min)}${button("Bezetting bevestigen →", "occupy")}`;
      else {
        const hand = state.players[state.current].cards,
          required = hand.length >= (state.resumeAttack ? 6 : 5);
        html = `<div class="rk-command-title"><h3>${selection ? E.territories[selected].name : phases[state.phase]}</h3><span>${selection ? `${selection.armies} legers` : `${state.pool || E.owned(state).length} ${state.pool ? "versterkingen" : "gebieden"}`}</span></div>`;
        if (!own) html += `<p class="rk-muted">${selection ? `${esc(state.players[selection.owner].name)} bezit dit gebied. Kies eerst een eigen land.` : state.phase === "reinforce" ? "Tik op een eigen gebied om legers te plaatsen." : state.phase === "attack" ? "Tik op jouw leger, daarna op een vijandelijke buur." : "Tik op twee verbonden eigen gebieden."}</p>`;
        let accessible = `<label>Vanuit<select id="rkFrom">${options(E.owned(state), own ? selected : null)}</select></label>`;
        if (state.phase === "reinforce") {
          if (state.pool && own) html += amount(state.pool, state.pool) + button(`Plaats legers · ${state.pool} beschikbaar`, "reinforce");
          if (hand.length) {
            if (!cards.length) cards = E.findSet(state) || [];
            html += `<details class="rk-card-hand" ${required || handOpen ? "open" : ""}><summary>▱ ${hand.length} kaarten${required ? " · ruilen verplicht" : " · bekijk en ruil"}</summary><div class="rk-cards">${hand.map(id => `<button id="rkCard${id}" data-card="${id}" aria-pressed="${cards.includes(id)}" aria-label="${id < 42 ? E.territories[id].name : "Joker"}, ${["infanterie", "cavalerie", "artillerie", "joker"][E.cardSymbol(id)]}">${symbols[E.cardSymbol(id)]}<small>${id < 42 ? E.territories[id].name : "Joker"}</small></button>`).join("")}</div>${button(`Ruil set · +${E.tradeValue(state, cards)} legers`, "trade", !E.validSet(cards))}</details>`;
          }
          html += button(state.resumeAttack ? "Verder aanvallen →" : "Aanvallen →", "advance", state.pool > 0 || required, true);
        } else if (state.phase === "attack") {
          const enemies = own ? E.territories[selected].neighbors.filter(i => state.territories[i].owner !== state.current) : [];
          if (target !== null && !enemies.includes(target)) target = null;
          accessible += `<label>Vijandelijk buurland<select id="rkTarget">${options(enemies, target)}</select></label><label>Dobbelstenen<select id="rkDice">${[1,2,3].filter(n=>own && n<selection.armies).map(n=>`<option value="${n}" ${n===Math.min(diceChoice||3,selection.armies-1)?"selected":""}>${n} ${n===1?"dobbelsteen":"dobbelstenen"}</option>`).join("")}</select></label>`;
          const invalid = !own || selection.armies < 2 || target === null;
          if (own && target !== null) {
            const maximum = Math.max(1, selection.armies-1), value = Math.min(commitChoice || maximum, maximum);
            html = `<h3>Aanvallen</h3>${matchup(selected,target,"attack")}`;
            if (encounter?.from === selected && encounter?.to === target && encounter.turn === state.turn) html += `<div class="rk-result"><b>${encounter.defendLoss ? "Gevechtsuitslag" : "Aanval afgeslagen"}</b><span>Jij −${encounter.attackLoss} · Tegenstander −${encounter.defendLoss}</span>${encounter.attack.length ? `<div class="rk-rolls">${encounter.attack.map(n=>die(n)).join("")}<i>tegen</i>${encounter.defend.map(n=>die(n,true)).join("")}</div>` : ""}</div>`;
            html += `<div class="rk-chance"><b id="rkChance"></b><span>kans op verovering</span><div><i id="rkChanceBar"></i></div></div><label class="rk-commit-label" for="rkCommitRange">Legers voor blitz <output id="rkCommitCount">${value}</output></label><input id="rkCommitRange" type="range" min="1" max="${maximum}" value="${value}" ${invalid ? "disabled" : ""}><p id="rkReserve" class="rk-reserve"></p><p id="rkOdds" class="rk-odds"></p>`;
          } else if (own) html += `<p class="rk-muted">${selection.armies > 1 ? "Tik op een vijandelijk buurland om aan te vallen." : "Er blijft altijd één leger achter. Dit gebied kan niet aanvallen."}</p>`;
          html += `<div class="rk-buttons">${button("⚡ Blitz", "blitz", invalid)}${button("⚄ Eén worp", "attack", invalid, true)}</div>${button("Verplaatsen →", "advance", false, true)}`;
        } else if (state.phase === "fortify") {
          if (!state.fortified) {
            const targets = own ? E.owned(state).filter(i=>i!==selected && E.connected(state,selected,i)) : [];
            if (target !== null && !targets.includes(target)) target = null;
            accessible += `<label>Naar verbonden eigen land<select id="rkTarget">${options(targets,target)}</select></label>`;
            if (own && target !== null && selection.armies > 1) html = `<h3>Legers verplaatsen</h3>${matchup(selected,target,"transfer")}${amount(selection.armies-1,selection.armies-1)}${button("Legers verplaatsen", "fortify")}`;
            else if (own) html += '<p class="rk-muted">Kies een verbonden eigen gebied als bestemming.</p>';
          } else html += '<p class="rk-muted">Je legers zijn verplaatst.</p>';
          html += button("Beurt beëindigen ✓", "endTurn");
        }
        html += `<details class="rk-accessible" ${accessibleOpen ? "open" : ""}><summary>Kiezen via landenlijst</summary>${accessible}</details>`;
      }
      if (isHuman() && !handoff && state.rules?.goal === "mission" && state.phase !== "won") {
        html = `<details class="rk-mission"><summary>✉ Mijn geheime missie</summary><p>${esc(E.mission(state).text)}</p></details>`+html;
      }
      if (!handoff && isHuman() && ["attack","fortify"].includes(state.phase) && !state.pending && state.players[state.current].cards.length) {
        html += `<details class="rk-card-hand" ${handOpen ? "open" : ""}><summary>▱ Mijn ${state.players[state.current].cards.length} kaarten</summary><div class="rk-cards">${state.players[state.current].cards.map(id=>`<button disabled aria-label="${id<42?E.territories[id].name:"Joker"}">${symbols[E.cardSymbol(id)]}<small>${id<42?E.territories[id].name:"Joker"}</small></button>`).join("")}</div><p class="rk-muted">Ruil sets tijdens het versterken. Verover deze beurt een gebied om een kaart te verdienen.</p></details>`;
      }
      $("rkControls").innerHTML = html;
      board.clearPreview();
      if (state.pending || (state.phase === "fortify" && target !== null)) previewTransfer();
      updateOdds();
      $("rk").classList.toggle("rk-encounter-open", !!state.pending || (canAct && target !== null && ["attack","fortify"].includes(state.phase)));
      $("rkDockToggle").setAttribute("aria-expanded", String(!$("rk").classList.contains("rk-dock-collapsed")));
      $("rk").classList.toggle("rk-has-selection", selected !== null && isHuman() && !handoff);
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
        `Ronde ${state.round} · ${state.players.length} spelers · ${({world:"Wereldverovering",domination:"70% veroveren",capital:"Hoofdsteden",mission:"Geheime missies"})[state.rules?.goal||"world"]}`;
      $("rkPlayerName").textContent =
        state.phase === "won"
          ? `${state.players[state.winner].name} heeft gewonnen`
          : p.name;
      $("rkPlayerBadge").style.background = p.color;
      $("rkPlayerBadge").innerHTML = portrait(state.current);
      $("rkPhase").textContent = state.pending ? "Bezetten" : phases[state.phase];
      $("rkPhaseSteps").querySelectorAll("[data-phase]").forEach(el => { el.classList.toggle("active", el.dataset.phase === state.phase); el.setAttribute("aria-current", el.dataset.phase === state.phase ? "step" : "false"); });
      $("rkInstruction").textContent = state.phase === "deploy" ? "Plaats je startlegers; geef daarna de beurt door." : state.phase === "capital" ? "Kies een eigen gebied als hoofdstad." : state.pending
        ? "Kies hoeveel legers het veroverde land bezetten."
        : state.phase === "reinforce"
          ? `Plaats ${state.pool} versterkingen in je eigen landen.`
          : state.phase === "attack"
            ? "Kies een eigen land en een vijandelijke buur. Eén leger blijft achter."
            : state.phase === "fortify"
              ? "Verplaats één keer via eigen landen, of beëindig je beurt."
              : "Het spel is beslist.";
      const required = p.cards.length >= (state.resumeAttack ? 6 : 5), next = $("rkNext");
      next.dataset.action = state.phase === "fortify" ? "endTurn" : "advance";
      next.disabled = !isHuman() || handoff || !!state.pending || !["reinforce","attack","fortify","deploy"].includes(state.phase) || ((state.phase === "reinforce" || state.phase === "deploy") && (state.pool > 0 || (state.phase === "reinforce" && required)));
      next.textContent = state.phase === "fortify" ? "Beurt klaar ✓" : state.phase === "attack" ? "Verplaatsen →" : state.phase === "deploy" ? "Volgende speler →" : "Aanvallen →";
      $("rkHand").disabled = !isHuman() || handoff || state.phase === "won";
      $("rkHandCount").textContent = handoff || !isHuman() ? "—" : p.cards.length;
      $("rkHand").classList.toggle("rk-card-earned", !!state.conquered && !handoff && isHuman());
      $("rkHand").classList.toggle("rk-trade-required", state.phase === "reinforce" && required && !handoff && isHuman());
      $("rkHand").setAttribute("aria-label", handoff || !isHuman() ? "Kaarten verborgen" : `${p.cards.length} kaarten bekijken${state.conquered ? ". Je verdient deze beurt een kaart." : ""}`);
      $("rkPool").hidden = !isHuman() || handoff || !["reinforce","deploy"].includes(state.phase) || !state.pool || (state.phase === "reinforce" && required);
      $("rkPoolCount").textContent = state.pool;
      $("rkPool").style.setProperty("--player", p.color);
      $("rkPool").setAttribute("aria-label", `${state.pool} versterkingen. Sleep naar een eigen land, of tik om te kiezen.`);
      const scoreScroll = $("rkScoreboard").scrollTop, scoreLeft = $("rkScoreboard").scrollLeft;
      $("rkScoreboard").innerHTML = state.players
        .map(
          (p, i) =>
            `<div style="--player:${p.color}" class="rk-score ${i === state.current ? "active" : ""} ${E.owned(state, i).length ? "" : "out"}"><span class="rk-avatar">${portrait(i)}</span><div><b>${esc(p.name)}</b><small><span title="Legers">♟ ${state.territories.filter(t=>t.owner===i).reduce((n,t)=>n+t.armies,0)}<span class="visually-hidden"> legers</span></span><span title="Gebieden">⚑ ${E.owned(state, i).length}<span class="visually-hidden"> gebieden</span></span><span title="Kaarten">▱ ${p.cards.length}<span class="visually-hidden"> kaarten</span></span>${state.capitals ? "<span>♛ "+state.capitals.filter(id=>id!==null && state.territories[id].owner===i).length+"</span>" : ""}${E.owned(state, i).length ? "" : " · uitgeschakeld"}</small></div></div>`,
        )
        .join("");
      const rail = $("rkScoreboard"), currentScore = rail.querySelector(".rk-score.active");
      rail.scrollTop = scoreScroll; rail.scrollLeft = scoreLeft;
      if (currentScore && state.turn !== lastTurn) {
        if (rail.scrollHeight > rail.clientHeight) rail.scrollTop = Math.max(0, currentScore.offsetTop + currentScore.offsetHeight - rail.clientHeight);
        if (rail.scrollWidth > rail.clientWidth) rail.scrollLeft = Math.max(0, currentScore.offsetLeft + currentScore.offsetWidth - rail.clientWidth);
      }
      updateMap();
      renderControls();
      const b = state.lastBattle;
      $("rkBattle").innerHTML = b
        ? `<h4>${E.territories[b.from].name} → ${E.territories[b.to].name}</h4>${b.attack.length ? `<div class="rk-dice-row"><span>Aanval</span>${b.attack.map(n => die(n)).join("")}</div><div class="rk-dice-row"><span>Verdediging</span>${b.defend.map(n => die(n, true)).join("")}</div>` : ""}<p>${b.blitz ? `Blitz · ${b.balanced ? "gebalanceerd · " : ""}${b.rounds ? b.rounds+" worpen · " : ""}` : ""}Aanvaller verliest ${b.attackLoss}, verdediger ${b.defendLoss}.</p>`
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
      const committed = Number($("rkCommitRange")?.value) || state.territories[selected].armies-1;
      stop();
      apply({type:"blitz",from:selected,to:target,amount:committed});
    }
    function leave() {
      stop();
      cancelPoolDrag();
      clearTimeout(feedbackTimer); feedbackTimer = null; $("rkFeedback").hidden = true;
      board.close();
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
      $("rkGoal").value = settings.goal;
      $("rkStartModal").querySelectorAll("[data-preset]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.preset===settings.goal)));
      $("rkCardMode").value = settings.cardMode;
      $("rkDiceMode").value = settings.dice;
      $("rkSetupMode").value = settings.setup;
      $("rkSound").checked = settings.sound !== false;
      $("rkMusic").checked = settings.music !== false;
      api.close();
      api.modal("rkStartModal");
    }
    function enter() {
      api.close();
      api.enter();
      if (!api.isActive()) return;
      active = true;
      $("rk").classList.add("rk-dock-collapsed");
      $("rkDockToggle").setAttribute("aria-expanded", "false");
      board.fit();
      if (state) {
        checkHandoff();
        render();
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
    $("rkDockToggle").addEventListener("click", () => {
      const collapsed = $("rk").classList.toggle("rk-dock-collapsed");
      $("rkDockToggle").setAttribute("aria-expanded", String(!collapsed));
      $("rkDockToggle").setAttribute("aria-label", collapsed ? "Spelacties uitklappen" : "Spelacties inklappen");
    });
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
    $("rkPool").addEventListener("pointerdown", event => {
      if (event.button !== 0 || blocked() || modalOpen()) return;
      draggedPool = false;
      poolDrag = {x:event.clientX,y:event.clientY,id:event.pointerId};
      $("rkPool").setPointerCapture(event.pointerId);
    });
    $("rkPool").addEventListener("pointermove", event => {
      if (!poolDrag || poolDrag.id !== event.pointerId) return;
      if (Math.hypot(event.clientX-poolDrag.x,event.clientY-poolDrag.y)>8) draggedPool = true;
      if (!draggedPool) return;
      const ghost = $("rkPoolGhost");
      ghost.hidden = false; ghost.querySelector("b").textContent = state.pool;
      ghost.style.transform = `translate(${event.clientX-26}px,${event.clientY-26}px)`;
    });
    $("rkPool").addEventListener("pointerup", event => {
      if (!poolDrag || poolDrag.id !== event.pointerId) return;
      const hit = document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-country],[data-country-marker]");
      if (draggedPool && hit && $("rkMap").contains(hit) && !blocked() && !modalOpen()) {
        const id = Number(hit.dataset.country ?? hit.dataset.countryMarker);
        if (state.territories[id].owner === state.current) {
          selected = id; target = null;
          apply({type:"reinforce",to:id,amount:state.pool});
        } else feedback("Kies een eigen land", "Versterkingen plaats je op jouw eigen kleur.");
      }
      cancelPoolDrag();
    });
    $("rkPool").addEventListener("pointercancel", cancelPoolDrag);
    $("rkPool").addEventListener("lostpointercapture", cancelPoolDrag);
    $("rkPool").addEventListener("click", () => {
      if (draggedPool) { draggedPool = false; return; }
      if (blocked()) return;
      $("rk").classList.remove("rk-dock-collapsed");
      $("rkDockToggle").setAttribute("aria-expanded","true");
      const accessible = $("rkControls").querySelector(".rk-accessible");
      if (selected === null && accessible) accessible.open = true;
      $(selected === null ? "rkFrom" : "rkAmount")?.focus({preventScroll:true});
    });
    $("rkHand").addEventListener("click", () => {
      if (blocked()) return;
      $("rk").classList.remove("rk-dock-collapsed");
      $("rkDockToggle").setAttribute("aria-expanded", "true");
      const hand = $("rkControls").querySelector(".rk-card-hand");
      if (hand) { hand.open = true; hand.scrollIntoView({block:"nearest"}); hand.querySelector("summary").focus({preventScroll:true}); }
      else feedback("Je kaarten", state.players[state.current].cards.length ? "Kaarten ruilen kan tijdens het versterken." : "Verover deze beurt een gebied om een kaart te verdienen.");
    });
    $("rkStartModal").addEventListener("click", event => {
      const preset = event.target.closest("[data-preset]");
      if (!preset) return;
      $("rkGoal").value = preset.dataset.preset;
      $("rkStartModal").querySelectorAll("[data-preset]").forEach(b=>b.setAttribute("aria-pressed",String(b===preset)));
    });
    $("rkGoal").addEventListener("change", () => $("rkStartModal").querySelectorAll("[data-preset]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.preset===$("rkGoal").value))));
    $("rkResume").addEventListener("click", () => {
      api.close();
      checkHandoff();
      render();
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
        goal: $("rkGoal").value,
        cardMode: $("rkCardMode").value,
        dice: $("rkDiceMode").value,
        setup: $("rkSetupMode").value,
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
      state = E.newGame(players, Date.now(), {goal:settings.goal,cards:settings.cardMode,dice:settings.dice,setup:settings.setup});
      selected = null;
      target = null;
      cards = [];
      lastTurn = 0;
      handoff = false;
      commitChoice = null;
      encounter = null;
      $("rkFeedback").hidden = true;
      $("rk").classList.add("rk-dock-collapsed");
      $("rkDockToggle").setAttribute("aria-expanded", "false");
      api.storage.set("rk.settings", settings);
      const stats = api.storage.get("rk.stats", { played: 0, won: 0 });
      stats.played = (stats.played || 0) + 1;
      api.storage.set("rk.stats", stats);
      save();
      api.close();
      checkHandoff();
      render();
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
      $("rkViewMenu").open = false;
      $("rkCountryList").hidden = !list;
      $("rkMapViewport").hidden = list;
      $("rkZoomTools").hidden = list;
      $("rkMapTip").hidden = list;
      $("rkMapTab").setAttribute("aria-pressed", String(!list));
      $("rkListTab").setAttribute("aria-pressed", String(list));
    }
    $("rkMapTab").addEventListener("click", () => changeView(false));
    $("rkListTab").addEventListener("click", () => changeView(true));
    $("rk").addEventListener("click", (event) => {
      const continent = event.target.closest("[data-continent]");
      if (continent) { changeView(false); board.focusContinent(continent.dataset.continent); return; }
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
      if (["all", "less", "more"].includes(type)) {
        const input = $("rkAmount");
        input.value = type === "all" ? b.dataset.max : Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)+(type === "more" ? 1 : -1)));
        $("rkAmountRange").value = input.value;
        previewTransfer();
        return;
      }
      if (type === "focus") { if (selected !== null && target !== null) board.focusPair(selected,target); return; }
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
      else if (type === "capital") apply({type,to:selected});
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
    function updateOdds() {
      if (!$("rkOdds") || !state || target === null) return;
      const value = Math.min(Number($("rkCommitRange").value),state.territories[selected].armies-1), odds = value ? E.battleOdds(value, state.territories[target].armies, E.defenseDice(state,target), state.rules?.dice) : 0;
      $("rkCommitCount").textContent = value;
      $("rkChance").textContent = odds === null ? "—" : `${odds===1 ? "100" : odds===0 ? "0" : odds > .99 ? ">99" : odds < .01 ? "<1" : Math.round(odds*100)}%`;
      $("rkChanceBar").style.width = `${odds === null ? 0 : odds*100}%`;
      const reserve = state.territories[selected].armies-value;
      $("rkReserve").textContent = `${reserve} ${reserve===1 ? "blijft" : "blijven"} achter · ${value} ${value===1 ? "valt" : "vallen"} aan`;
      $("rkFromCount").textContent = value;
      $("rkFromCaption").textContent = "vallen aan";
      const mode=state.rules?.dice === "balanced" ? "gebalanceerde blitz" : "willekeurige blitz";
      $("rkOdds").textContent = `${mode}${E.defenseDice(state,target)===3 ? " · hoofdstad: 3 verdedigingsdobbelstenen" : ""}`;
    }
    $("rk").addEventListener("toggle", event => {
      if (event.target.classList?.contains("rk-mission") && event.target.open) {
        $("rk").classList.remove("rk-dock-collapsed");
        $("rkDockToggle").setAttribute("aria-expanded","true");
      }
    },true);
    $("rk").addEventListener("input", event => {
      if (event.target.id === "rkAmountRange") $("rkAmount").value = event.target.value;
      if (event.target.id === "rkAmount") $("rkAmountRange").value = event.target.value;
      if (["rkAmountRange","rkAmount"].includes(event.target.id)) previewTransfer();
      if (event.target.id === "rkCommitRange") { commitChoice = Number(event.target.value); updateOdds(); }
    });
    $("rk").addEventListener("change", (event) => {
      if (event.target.id === "rkFrom") {
        commitChoice = null;
        selected =
          event.target.value === "" ? null : Number(event.target.value);
        target = null;
        $("rk").classList.remove("rk-dock-collapsed");
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
        cancelPoolDrag();
        save();
      } else schedule();
    });
    window.addEventListener("pagehide", () => {
      stop();
      save();
    });
    const watcher = new MutationObserver(() => {
      if (modalOpen()) {
        cancelPoolDrag();
        clearTimeout(botTimer);
        botTimer = null;
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
