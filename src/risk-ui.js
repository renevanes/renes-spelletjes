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
    let state = api.storage.get("risk.save", null),
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
      { players: 3, humans: 1, difficulty: "normal", tempo: "normal" },
      api.storage.get("risk.settings", {}),
    );
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
        api.storage.set("risk.save", state);
    }
    function apply(action) {
      try {
        const previousTurn = state.turn;
        state = E.apply(state, action);
        if (state.winner !== null && !state.statsRecorded) {
          const stats = api.storage.get("risk.stats", { played: 0, won: 0 });
          stats.finished = (stats.finished || 0) + 1;
          if (!state.players[state.winner].ai) stats.won = (stats.won || 0) + 1;
          api.storage.set("risk.stats", stats);
          state.statsRecorded = true;
        }
        save();
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
        $("riskHandoffTitle").textContent =
          `Beurt van ${state.players[state.current].name}`;
        api.modal("riskHandoffModal");
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
      $("riskMap").innerHTML =
        `<defs><pattern id="riskSea" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="1" fill="#708b9917"/></pattern></defs><rect width="1160" height="680" fill="#dce8eb"/><rect width="1160" height="680" fill="url(#riskSea)"/>` +
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
            return `<path class="risk-route" data-route="${E.byId[a]}-${E.byId[b]}" d="M${from.x} ${from.y}L${to.x} ${to.y}" stroke="#345766" stroke-opacity="${sea ? 0.55 : 0.17}" stroke-width="${sea ? 2 : 1.5}" ${sea ? 'stroke-dasharray="5 5"' : ""}/>`;
          })
          .join("") +
        E.territories
          .map(
            (t, i) =>
              `<g class="risk-country" data-country="${i}" role="button" tabindex="0" transform="translate(${t.x} ${t.y})"><title>${t.name}</title><path class="risk-country-shape" d="M-31-22 0-35 31-22 31 21 0 35-31 21Z"/><text class="risk-abbr" y="-16">${t.short}</text><text class="risk-armies" y="6"></text><text class="risk-owner" y="23"></text></g>`,
          )
          .join("");
    }
    function updateMap() {
      const focusedCountry = $("riskCountryList").contains(
        document.activeElement,
      )
        ? document.activeElement.dataset.country
        : null;
      $("riskMap")
        .querySelectorAll("[data-country]")
        .forEach((node) => {
          const i = Number(node.dataset.country),
            t = state.territories[i],
            p = state.players[t.owner];
          node.querySelector("path").setAttribute("fill", p.color);
          node.querySelector(".risk-armies").textContent = t.armies;
          node.querySelector(".risk-owner").textContent =
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
      $("riskCountryList").innerHTML = E.continents
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
        $("riskCountryList")
          .querySelector(`[data-country="${focusedCountry}"]`)
          ?.focus({ preventScroll: true });
      const ownedBonuses = E.bonus(state).map((c) => c.id);
      $("riskContinentBonuses").innerHTML = E.continents
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
      return `<label>Aantal legers<div class="risk-amount"><input id="riskAmount" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}"><button data-action="all" data-max="${max}">Alle ${max}</button></div></label>`;
    }
    function button(label, action, disabled = false, secondary = false) {
      return `<button id="riskAction${action}" class="risk-action ${secondary ? "risk-secondary" : ""}" data-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
    }
    function renderControls() {
      const focused = document.activeElement?.id,
        wasInControls = $("riskControls").contains(document.activeElement),
        selection = selected !== null ? state.territories[selected] : null;
      const own = selection && selection.owner === state.current,
        canAct = !blocked();
      let html = "";
      if (state.phase === "won")
        html = `<h3>🏆 ${esc(state.players[state.winner].name)} wint!</h3><p class="risk-muted">Alle 42 landen zijn veroverd in ${state.round} rondes.</p>${button("Nieuw spel", "new")}${button("Naar menu", "menu", false, true)}`;
      else if (handoff)
        html = `<h3>Geef het toestel door</h3><p class="risk-muted">De kaarten en acties van ${esc(state.players[state.current].name)} blijven verborgen.</p>${button("Mijn beurt bekijken", "handoff")}`;
      else if (!isHuman())
        html = `<h3>${esc(state.players[state.current].name)} speelt</h3><p class="risk-muted">De computer ${state.phase === "reinforce" ? "plaatst versterkingen" : state.phase === "attack" ? "bekijkt de grenzen" : "rondt de beurt af"}. Je kunt op elk moment pauzeren of naar het menu gaan.</p>${button("Pauze", "pause", false, true)}`;
      else if (state.pending)
        html = `<h3>Land veroverd!</h3><p class="risk-muted">${E.territories[state.pending.to].name} is van jou. Er moeten minstens ${state.pending.min} legers heen; één leger blijft achter in ${E.territories[state.pending.from].name}.</p>${amount(state.pending.max, state.pending.min, state.pending.min)}${button("Bezetting bevestigen", "occupy")}`;
      else {
        html = `<h3>${selection ? E.territories[selected].name : "Kies een eigen land"}</h3><p class="risk-muted">${selection ? `${esc(state.players[selection.owner].name)} · ${selection.armies} legers` : "Tik op de kaart of kies hieronder een land."}</p><label>${state.phase === "reinforce" ? "Land voor versterkingen" : "Vanuit"}<select id="riskFrom">${options(E.owned(state), own ? selected : null)}</select></label>`;
        if (state.phase === "reinforce") {
          html += `<p class="risk-muted"><b>${state.pool}</b> versterkingen over${E.bonus(state).length ? " · inclusief continentbonus" : ""}.</p>`;
          if (state.pool)
            html +=
              amount(state.pool, Math.min(state.pool, 3)) +
              button("Legers plaatsen", "reinforce", !own);
          const hand = state.players[state.current].cards,
            required = hand.length >= (state.resumeAttack ? 6 : 5);
          if (hand.length) {
            if (!cards.length) cards = E.findSet(state) || [];
            html += `<h4>Kaarten (${hand.length})${required ? " · ruilen verplicht" : ""}</h4><div class="risk-cards">${hand.map((id) => `<button id="riskCard${id}" data-card="${id}" aria-pressed="${cards.includes(id)}" aria-label="${id < 42 ? E.territories[id].name : "Joker"}, ${["infanterie", "cavalerie", "artillerie", "joker"][E.cardSymbol(id)]}${cards.includes(id) ? ", geselecteerd" : ""}">${symbols[E.cardSymbol(id)]}<small>${id < 42 ? E.territories[id].name : "Joker"}</small></button>`).join("")}</div>${button("Geselecteerde set ruilen", "trade", !E.validSet(cards))}`;
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
          html += `<label>Aangrenzend vijandelijk land<select id="riskTarget">${options(enemies, target)}</select></label><label>Dobbelstenen<select id="riskDice">${[
            1, 2, 3,
          ]
            .filter((n) => own && n < selection.armies)
            .map(
              (n) =>
                `<option value="${n}" ${n === Math.min(diceChoice || 3, selection.armies - 1) ? "selected" : ""}>${n} ${n === 1 ? "dobbelsteen" : "dobbelstenen"}</option>`,
            )
            .join("")}</select></label>`;
          const invalid = !own || selection.armies < 2 || target === null;
          html += `<div class="risk-buttons">${button("Eén worp", "attack", invalid)}${button(autoBattle ? "Stop" : "Doorvechten", autoBattle ? "stop" : "blitz", invalid, true)}</div>${button("Aanvallen afronden", "advance", false, true)}`;
        } else if (state.phase === "fortify") {
          if (!state.fortified) {
            const targets = own
              ? E.owned(state).filter(
                  (i) => i !== selected && E.connected(state, selected, i),
                )
              : [];
            if (target !== null && !targets.includes(target)) target = null;
            html += `<label>Naar verbonden eigen land<select id="riskTarget">${options(targets, target)}</select></label>`;
            if (own && selection.armies > 1)
              html += amount(selection.armies - 1, 1);
            html += button(
              "Legers verplaatsen",
              "fortify",
              !own || selection.armies < 2 || target === null,
            );
          } else
            html += '<p class="risk-muted">Je hebt je verplaatsing gedaan.</p>';
          html += button("Beurt beëindigen", "endTurn");
        }
      }
      $("riskControls").innerHTML = html;
      if (focused && $(focused) && $("riskControls").contains($(focused)))
        $(focused).focus({ preventScroll: true });
      else if (wasInControls)
        $("riskControls")
          .querySelector("button:not(:disabled),select,input")
          ?.focus({ preventScroll: true });
      $("riskControls")
        .querySelectorAll("button[data-card]")
        .forEach((b) => {
          b.disabled = !canAct;
        });
    }
    function render() {
      if (!state) return;
      const p = state.players[state.current];
      $("riskRound").textContent =
        `Ronde ${state.round} · ${state.players.length} spelers`;
      $("riskPlayerName").textContent =
        state.phase === "won"
          ? `${state.players[state.winner].name} heeft gewonnen`
          : p.name;
      $("riskPlayerBadge").style.background = p.color;
      $("riskPlayerBadge").textContent = state.current + 1;
      $("riskPhase").textContent = phases[state.phase];
      $("riskInstruction").textContent = state.pending
        ? "Kies hoeveel legers het veroverde land bezetten."
        : state.phase === "reinforce"
          ? `Plaats ${state.pool} versterkingen in je eigen landen.`
          : state.phase === "attack"
            ? "Kies een eigen land en een vijandelijke buur. Eén leger blijft achter."
            : state.phase === "fortify"
              ? "Verplaats één keer via eigen landen, of beëindig je beurt."
              : "De wereld is veroverd.";
      $("riskScoreboard").innerHTML = state.players
        .map(
          (p, i) =>
            `<div class="risk-score ${i === state.current ? "active" : ""} ${E.owned(state, i).length ? "" : "out"}"><span style="background:${p.color}">${i + 1}</span><div><b>${esc(p.name)}${p.ai ? " 🤖" : ""}</b><small>${E.owned(state, i).length} landen · ${p.cards.length} kaarten${E.owned(state, i).length ? "" : " · uitgeschakeld"}</small></div></div>`,
        )
        .join("");
      updateMap();
      renderControls();
      const b = state.lastBattle;
      $("riskBattle").innerHTML = b
        ? `<h4>${E.territories[b.from].name} → ${E.territories[b.to].name}</h4><div class="risk-dice-row"><span>Aanval</span>${b.attack.map((n) => `<span class="risk-die">${n}</span>`).join("")}</div><div class="risk-dice-row"><span>Verdediging</span>${b.defend.map((n) => `<span class="risk-die defense">${n}</span>`).join("")}</div><p>Aanvaller verliest ${b.attackLoss}, verdediger ${b.defendLoss}. Bij gelijke worpen wint de verdediger.</p>`
        : "";
      $("riskHistory").innerHTML = state.log
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
      const total = Number($("riskPlayerCount").value),
        previous = Number($("riskHumanCount").value) || 1;
      $("riskHumanCount").innerHTML = Array.from(
        { length: total },
        (_, i) =>
          `<option value="${i + 1}">${i + 1} ${i ? "mensen" : "mens"}</option>`,
      ).join("");
      $("riskHumanCount").value = Math.min(previous, total);
      const saved = [...$("riskNames").querySelectorAll("input")].map(
        (i) => i.value,
      );
      const profile = (api.storage.get("app.profiles", []) || []).find(
        (p) => p.id === api.storage.get("app.profile", "p0"),
      );
      $("riskNames").innerHTML = Array.from(
        { length: Number($("riskHumanCount").value) },
        (_, i) =>
          `<label>Naam speler ${i + 1}<input id="riskName${i}" maxlength="24" value="${esc(saved[i] || (!i && profile?.name) || `Speler ${i + 1}`)}"></label>`,
      ).join("");
    }
    function showStart() {
      stop();
      $("riskResume").hidden = !state;
      $("riskPlayerCount").value = settings.players;
      setupNames();
      $("riskHumanCount").value = Math.min(
        settings.humans,
        Number($("riskPlayerCount").value),
      );
      setupNames();
      $("riskDifficulty").value = settings.difficulty;
      $("riskTempo").value = settings.tempo;
      api.modal("riskStartModal");
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
            "Het opgeslagen Risk-spel is beschadigd. Je gegevens blijven bewaard totdat je een nieuw spel start.",
            4500,
          );
      }
    }
    drawMap();
    $("riskBack").addEventListener("click", leave);
    $("riskStartMenu").addEventListener("click", leave);
    $("riskPauseMenu").addEventListener("click", leave);
    $("riskPause").addEventListener("click", () => {
      stop();
      save();
      api.modal("riskPauseModal");
    });
    $("riskContinue").addEventListener("click", () => {
      api.close();
      schedule();
    });
    $("riskHelp").addEventListener("click", () => {
      stop();
      api.modal("riskHelpModal");
    });
    $("riskNew").addEventListener("click", showStart);
    $("riskResume").addEventListener("click", () => {
      api.close();
      render();
      checkHandoff();
      schedule();
    });
    $("riskPlayerCount").addEventListener("change", setupNames);
    $("riskHumanCount").addEventListener("change", setupNames);
    $("riskStart").addEventListener("click", async () => {
      if (
        state &&
        state.phase !== "won" &&
        !(await api.confirm(
          "Nieuw Risk-spel?",
          "Je huidige Risk-spel wordt vervangen.",
          "Nieuw spel",
        ))
      ) {
        api.modal("riskStartModal");
        return;
      }
      settings = {
        players: Number($("riskPlayerCount").value),
        humans: Number($("riskHumanCount").value),
        difficulty: $("riskDifficulty").value,
        tempo: $("riskTempo").value,
      };
      const players = Array.from({ length: settings.players }, (_, i) => ({
        name:
          i < settings.humans
            ? $("riskName" + i).value
            : `Computer ${i - settings.humans + 1}`,
        ai: i >= settings.humans,
      }));
      state = E.newGame(players);
      selected = null;
      target = null;
      cards = [];
      lastTurn = 0;
      handoff = false;
      api.storage.set("risk.settings", settings);
      const stats = api.storage.get("risk.stats", { played: 0, won: 0 });
      stats.played = (stats.played || 0) + 1;
      api.storage.set("risk.stats", stats);
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
    $("riskBeginTurn").addEventListener("click", beginTurn);
    function changeView(list) {
      $("riskCountryList").hidden = !list;
      $("riskMapViewport").hidden = list;
      $("riskZoomTools").hidden = list;
      $("riskMapTip").hidden = list;
      $("riskMapTab").setAttribute("aria-pressed", String(!list));
      $("riskListTab").setAttribute("aria-pressed", String(list));
    }
    $("riskMapTab").addEventListener("click", () => changeView(false));
    $("riskListTab").addEventListener("click", () => changeView(true));
    const resizeMap = () => {
      $("riskMap").style.width = `${1160 * zoom}px`;
      $("riskMap").style.height = `${680 * zoom}px`;
    };
    function fitMap() {
      const width = $("riskMapViewport").clientWidth;
      if (width >= 700) {
        zoom = Math.min(1, width / 1160);
        resizeMap();
        $("riskMapViewport").style.height = `${680 * zoom}px`;
      } else {
        $("riskMapViewport").style.height = "";
        zoom = 1;
        resizeMap();
      }
    }
    $("riskZoomIn").addEventListener("click", () => {
      zoom = Math.min(1.7, zoom + 0.15);
      resizeMap();
    });
    $("riskZoomOut").addEventListener("click", () => {
      zoom = Math.max(0.8, zoom - 0.15);
      resizeMap();
    });
    $("risk").addEventListener("click", (event) => {
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
        amount = Number($("riskAmount")?.value);
      if (type === "all") {
        $("riskAmount").value = b.dataset.max;
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
        api.modal("riskPauseModal");
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
          dice: Number($("riskDice")?.value),
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
    $("risk").addEventListener("change", (event) => {
      if (event.target.id === "riskFrom") {
        selected =
          event.target.value === "" ? null : Number(event.target.value);
        target = null;
        stop();
        render();
      }
      if (event.target.id === "riskTarget") {
        target = event.target.value === "" ? null : Number(event.target.value);
        stop();
        updateMap();
        renderControls();
      }
      if (event.target.id === "riskDice")
        diceChoice = Number(event.target.value);
    });
    $("riskMap").addEventListener("keydown", (event) => {
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
      hasSave: () => E.validState(api.storage.get("risk.save", null)),
      save,
    };
  }
  window.ReneRisk = { create };
})();
