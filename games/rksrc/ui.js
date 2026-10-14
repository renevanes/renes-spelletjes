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
    const board = window.ReneWereldBoard.create({
      engine: E, data: window.ReneWereldMap, onSelect: choose,
      onActions: () => {
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
      return `<label>Aantal legers<div class="rk-amount"><input id="rkAmount" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}"><button data-action="all" data-max="${max}">Alle ${max}</button></div></label>`;
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
        ? `<h4>${E.territories[b.from].name} → ${E.territories[b.to].name}</h4><div class="rk-dice-row"><span>Aanval</span>${b.attack.map(n => die(n)).join("")}</div><div class="rk-dice-row"><span>Verdediging</span>${b.defend.map(n => die(n, true)).join("")}</div><p>Aanvaller verliest ${b.attackLoss}, verdediger ${b.defendLoss}. Bij gelijke worpen wint de verdediger.</p>`
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
      $("rkSound").checked = settings.sound !== false;
      $("rkMusic").checked = settings.music !== false;
      api.modal("rkStartModal");
    }
    function enter() {
      api.close();
      api.enter();
      if (!api.isActive()) return;
      active = true;
      board.fit();
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
