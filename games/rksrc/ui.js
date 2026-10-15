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
      commitChoice = null,
      overviewView = null,
      amountKey = '',
      handKey = '',
      countryFilter = 'available',
      lastPlacement = null,
      contextView = null;
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
      !!document.querySelector(".modal.show,.overlay.show") || !$('rkInspector').hidden;
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
        const previousTurn = state.turn, previousCapture = state.pending, previousState = state, view = contextView || overviewView;
        state = E.apply(state, action);
        lastPlacement = action.type === 'reinforce' && !previousState.players[previousState.current].ai && state.phase !== 'won'
          ? {before:previousState, after:state, amount:action.amount, country:action.to, view} : null;
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
          selected = previousCapture.to; target = null; commitChoice = null;
          feedback(`${E.territories[selected].name} veroverd`, "Tik op de volgende vijandelijke buur om verder aan te vallen.");
        }
        if (action.type === "advance" && state.phase === "fortify") { selected = null; target = null; }
        if (action.type === "reinforce") { feedback(`+${action.amount} legers`, E.territories[action.to].name); board.effect(action.to, `+${action.amount}`); }
        if (["attack", "blitz"].includes(action.type)) board.effect(action.to, state.pending ? "Veroverd!" : `−${state.lastBattle.defendLoss}`);
        if (action.type === "fortify") { feedback("Legers verplaatst", `${action.amount} naar ${E.territories[action.to].name}. Je kunt je beurt beëindigen.`); }
        if (action.type === "endTurn") $("rkFeedback").hidden = true;
        const finishedSelection = ["reinforce","fortify","capital","advance","endTurn","occupy"].includes(action.type);
        if (finishedSelection) {
          if (action.type !== "occupy") selected = null;
          target = null; contextView = null; overviewView = null;
          commitChoice = null;
        }
        if (['advance','endTurn'].includes(action.type)) changeView(false);
        if (action.type === "trade") showInspector(false);
        if (state.pending) {
          selected = state.pending.from;
          target = state.pending.to;
        }
        if (state.winner !== null) stop();
        render();
        if (finishedSelection && view) board.restore(view);
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
      if (!state || blocked() || state.pending || id===null) return;
      const t=state.territories[id], phase=state.phase, before=board.snapshot();
      if (phase==='fortify' && state.fortified) { feedback('Je verplaatsing is gedaan','Kies Beurt klaar om verder te spelen.'); return; }
      if (phase==='attack' && t.owner!==state.current) {
        if (selected===null) { feedback('Kies eerst jouw leger','Tik op een eigen land met minstens twee legers.'); return; }
        if (!E.territories[selected].neighbors.includes(id)) { feedback('Geen aangrenzend land','Kies een gemarkeerde vijandelijke buur.'); return; }
        if (!contextView) contextView=before;
        target=id;
      } else if (phase==='fortify' && selected!==null && id!==selected && t.owner===state.current) {
        if (!E.connected(state,selected,id)) { feedback('Niet verbonden','Verplaats via je eigen gebieden.'); return; }
        if (!contextView) contextView=before;
        target=id;
      } else if (t.owner===state.current) {
        if (['attack','fortify'].includes(phase) && t.armies<2) { feedback('Eén leger blijft achter','Kies een eigen land met minstens twee legers.'); return; }
        if (!overviewView) overviewView=before;
        if (['reinforce','deploy','capital'].includes(phase) && !contextView) contextView=before;
        selected=id;target=null;commitChoice=null;
      } else { feedback(E.territories[id].name,`${state.players[t.owner].name} · ${t.armies} legers`); return; }
      clearTimeout(feedbackTimer); $('rkFeedback').hidden=true;
      showInspector(false); $('rkViewMenu').open=false; stop(); render();
      if (target!==null) board.focusPair(selected,target);
      else if (['reinforce','deploy','capital'].includes(phase)) board.focusCountry(selected);
      else if (phase==='attack' && before.zoom<=1.01) board.focusCountry(selected,true);
    }
    const board = window.ReneWereldBoard.create({
      engine: E, data: window.ReneWereldMap, onSelect: id=>{if(!modalOpen())choose(id);},
      onMove: (from,to) => { if (blocked() || state.pending || modalOpen()) return; selected=from; choose(to); },
      onActions: () => {
        showInspector(true,true);
      },
    });
    function updateMap() {
      const focusedCountry = $("rkCountryResults").contains(
        document.activeElement,
      )
        ? document.activeElement.dataset.country
        : null;
      board.update(state, { selected, target, handoff });
      renderCountryList();
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
    function availableCountries() {
      if (blocked() || state.pending) return [];
      const own = E.owned(state), phase = state.phase;
      if (phase === 'capital') return own;
      if (phase === 'deploy' || phase === 'reinforce') {
        const mustTrade = phase === 'reinforce' && state.players[state.current].cards.length >= (state.resumeAttack ? 6 : 5);
        return state.pool && !mustTrade ? own : [];
      }
      if (phase === 'attack') return selected !== null
        ? E.territories[selected].neighbors.filter(i=>state.territories[i].owner!==state.current && state.territories[selected].armies>1)
        : own.filter(i=>state.territories[i].armies>1 && E.territories[i].neighbors.some(j=>state.territories[j].owner!==state.current));
      if (phase === 'fortify' && !state.fortified) return selected !== null
        ? own.filter(i=>i!==selected && E.connected(state,selected,i))
        : own.filter(i=>state.territories[i].armies>1 && own.some(j=>j!==i && E.connected(state,i,j)));
      return [];
    }
    function canChooseCountry(id, available = new Set(availableCountries())) {
      if (blocked() || state.pending) return false;
      if (available.has(id)) return true;
      // The own-country filter also allows switching to another source army.
      return ['attack','fortify'].includes(state.phase) && !state.fortified && state.territories[id].owner===state.current && state.territories[id].armies>1;
    }
    function renderCountryList() {
      const normalize = text=>text.normalize('NFD').replace(/[\u0300-\u036f\s-]/g,'').toLowerCase();
      const query = normalize($('rkCountrySearch').value), available = new Set(availableCountries());
      const visible = E.territories.map((t,i)=>i).filter(i=>
        (countryFilter==='all' || (countryFilter==='own' ? state.territories[i].owner===state.current : available.has(i))) &&
        normalize(E.territories[i].name).includes(query));
      $('rkCountryFilters').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.countryFilter===countryFilter)));
      $('rkCountryCount').textContent = `${visible.length} ${visible.length===1?'land':'landen'}${countryFilter==='available' ? ' beschikbaar' : ''}`;
      $('rkCountryResults').innerHTML = visible.length ? E.continents.map(c=>{
        const ids = visible.filter(i=>E.territories[i].continent===c.id);
        if (!ids.length) return '';
        return `<h3>${c.name} <small>continentbonus +${c.bonus}</small></h3><div>${ids.map(i=>{
          const t=state.territories[i], p=state.players[t.owner], usable=canChooseCountry(i,available);
          return `<button data-country="${i}" class="${i===selected?'selected':i===target?'target':''}" aria-pressed="${i===selected||i===target}" ${usable?'':'disabled'}><i style="background:${p.color}">${t.owner+1}</i><span>${E.territories[i].name}${state.capitals?.includes(i)?' ♛':''}<small>${esc(p.name)}${!usable?' · nu niet beschikbaar':''}</small></span><b>${t.armies}</b><span class="visually-hidden">legers</span></button>`;
        }).join('')}</div>`;
      }).join('') : '<p class="rk-no-countries">Geen landen gevonden. Probeer een andere naam of een ander filter.</p>';
    }
    function measureLayout() {
      const root=$('rk');
      for (const [name,value] of [['--rk-turn-height',root.querySelector('.rk-turn').offsetHeight],['--rk-guide-height',$('rkGuide').offsetHeight]]) {
        if (root.style.getPropertyValue(name)!==`${value}px`) root.style.setProperty(name,`${value}px`);
      }
    }
    function renderGuide() {
      const guide=$('rkGuide'), phase=state.phase, available=availableCountries();
      guide.hidden=!active || blocked() || $('rk').classList.contains('rk-focus-mode') || !$('rkCountryList').hidden;
      let title='',detail='';
      const required=phase==='reinforce' && state.players[state.current].cards.length>=(state.resumeAttack?6:5);
      if (required) { title='Ruil eerst een kaartenset'; detail='Je krijgt extra legers om deze beurt te plaatsen.'; }
      else if (['reinforce','deploy'].includes(phase)) {
        title=state.pool ? `${state.pool} ${state.pool===1?'leger':'legers'} plaatsen` : 'Alle legers staan';
        detail=state.pool ? 'Tik op jouw kleur, kies uit de lijst of sleep je reserve.' : phase==='deploy' ? 'Geef de beurt door aan de volgende speler.' : 'Klaar om aan te vallen. Ga door wanneer jij wilt.';
      } else if (phase==='capital') { title='Kies je hoofdstad'; detail='Tik op een eigen land of kies het op naam.'; }
      else if (phase==='attack') {
        title=selected!==null ? `${E.territories[selected].name} · ${state.territories[selected].armies-1} beschikbaar` : available.length ? 'Kies je aanvallende leger' : 'Geen aanval mogelijk';
        detail=selected!==null ? available.length ? 'Kies een buur op de kaart of hieronder.' : 'Dit leger kan geen vijandelijke buur aanvallen. Kies een ander leger.' : available.length ? 'Gemarkeerde legers kunnen aanvallen. Je mag ook verdergaan.' : 'Je kunt naar verplaatsen gaan of je beurt afronden.';
      } else if (phase==='fortify') {
        title=state.fortified ? 'Je verplaatsing is gedaan' : selected!==null ? `Vanuit ${E.territories[selected].name}` : available.length ? 'Verplaats je legers' : 'Geen verplaatsing mogelijk';
        detail=state.fortified ? 'Rond je beurt af. Volgende beurt kun je weer verplaatsen.' : selected!==null ? 'Kies een verbonden eigen land op de kaart of hieronder.' : available.length ? 'Eén verplaatsing via eigen landen. Overslaan mag.' : 'Rond je beurt af om verder te spelen.';
      }
      $('rkGuideTitle').textContent=title; $('rkGuideDetail').textContent=detail;
      const targets=!guide.hidden && selected!==null && ['attack','fortify'].includes(phase) ? available : [];
      const rail=$('rkTargetChoices'), scroll=rail.scrollLeft;
      rail.hidden=!targets.length;
      rail.innerHTML=targets.map(i=>`<button data-quick-country="${i}" style="--player:${state.players[state.territories[i].owner].color}" title="${E.territories[i].name}" aria-label="${E.territories[i].name}, ${state.territories[i].armies} legers, kiezen"><span>${esc(window.ReneWereldMap.regions[i].label.replace(/-/g,' '))}</span><b>${state.territories[i].armies}</b></button>`).join('');
      rail.scrollLeft=scroll;
      const list=!$('rkCountryList').hidden, pick=$('rkPickCountry');
      pick.textContent=required?'Kaarten ruilen':list?'Kaart tonen':selected!==null?'Doel zoeken':'Land kiezen';
      pick.hidden=!list && !required && !available.length;
      $('rkUndoPlacement').hidden=guide.hidden || !lastPlacement || lastPlacement.after!==state;
      $('rkUndoPlacement').setAttribute('aria-label',lastPlacement?`Laatste plaatsing van ${lastPlacement.amount} ${lastPlacement.amount===1?'leger':'legers'} in ${E.territories[lastPlacement.country].name} ongedaan maken`:'Laatste plaatsing ongedaan maken');
      measureLayout();
    }
    function undoPlacement() {
      if (blocked() || state.pending || !lastPlacement || lastPlacement.after!==state) return;
      const previous=lastPlacement;
      state=previous.before; lastPlacement=null;
      selected=null;target=null;contextView=null;overviewView=null;
      board.clearEffects();
      save(); render();
      if (previous.view) board.restore(previous.view);
      feedback('Plaatsing ongedaan gemaakt',`${previous.amount} ${previous.amount===1?'leger is':'legers zijn'} terug in je reserve.`);
      $('rkPickCountry').focus({preventScroll:true});
    }
    function amount(max, value = 1, min = 1) {
      return `<div class="rk-troops"><div class="rk-amount"><button data-action="less" aria-label="Eén leger minder">−</button><input id="rkAmount" aria-label="Aantal legers" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}" style="${value>99999?'font-size:12px':value>999?'font-size:18px':''}"><button data-action="more" aria-label="Eén leger meer">+</button></div><div class="rk-amount-slider"><span>${min}</span><input id="rkAmountRange" aria-label="Aantal legers met schuifregelaar" type="range" min="${min}" max="${max}" value="${value}"><button data-action="all" data-max="${max}">Alles</button></div></div>`;
    }
    function button(label, action, disabled = false, secondary = false) {
      return `<button id="rkAction${action}" class="rk-action ${secondary ? "rk-secondary" : ""}" data-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
    }
    function die(n, defense = false) {
      const spots = [[5,5],[15,5],[5,10],[15,10],[5,15],[15,15],[10,10]];
      const faces = { 1:[6], 2:[0,5], 3:[0,5,6], 4:[0,1,4,5], 5:[0,1,4,5,6], 6:[0,1,2,3,4,5] };
      return `<span class="rk-die ${defense ? "defense" : ""}" role="img" aria-label="${n} ogen"><svg viewBox="0 0 20 20" aria-hidden="true">${faces[n].map(i => `<circle cx="${spots[i][0]}" cy="${spots[i][1]}" r="1.7"/>`).join("")}</svg></span>`;
    }
    function showInspector(value = true, focus = false) {
      $('rkInspector').hidden = !value;
      $('rkDockToggle').setAttribute('aria-expanded', String(value));
      $('rk').querySelectorAll('.rk-topbar,.rk-turn,.rk-scoreboard').forEach(el=>el.inert=value || $('rk').classList.contains('rk-expanded'));
      $('rkBoardPanel').querySelectorAll(':scope > :not(#rkInspector)').forEach(el=>el.inert=value);
      if (value) stop();
      if (focus && value) $('rkCloseInspector').focus({preventScroll:true});
    }
    function actor(id, side, caption) {
      const t = state.territories[id], p = state.players[t.owner];
      return `<div class="rk-actor ${side}" style="--player:${p.color}"><span class="rk-avatar">${portrait(t.owner)}</span><b>${window.ReneWereldMap.regions[id].label}</b><strong id="rk${side === 'from' ? 'From' : 'To'}Count">${t.armies}</strong><small id="rk${side === 'from' ? 'From' : 'To'}Caption">${caption}</small></div>`;
    }
    function cancelSelection(all = false) {
      if (state?.pending) return;
      if (!all && state?.phase === 'attack' && target !== null) {
        target = null;
        const view = contextView; contextView = null;
        render(); if (view) board.restore(view);
      } else {
        selected = null; target = null; commitChoice = null;
        const view = overviewView || contextView; overviewView = null; contextView = null;
        render(); if (view) board.restore(view);
      }
      $('rkMapViewport').focus({preventScroll:true});
    }
    function renderControls() {
      const focused = document.activeElement?.id, wasInControls = $('rkControls').contains(document.activeElement);
      const nextAmountKey=`${state.current}/${state.phase}/${selected}/${target}/${state.pool}/${state.pending?.min||0}`;
      const previousAmount=amountKey===nextAmountKey?$('rkAmount')?.value:null;
      amountKey=nextAmountKey;
      if (state.pending && isHuman() && !handoff) { selected = state.pending.from; target = state.pending.to; }
      const t = selected === null ? null : state.territories[selected], own = t?.owner === state.current;
      const canAct = !blocked(), phase = state.phase, hand = state.players[state.current].cards;
      const required = phase === 'reinforce' && hand.length >= (state.resumeAttack ? 6 : 5);
      const pair = canAct && own && target !== null && (phase === 'attack' || phase === 'fortify');
      const placing = canAct && own && state.pool > 0 && ['reinforce','deploy'].includes(phase) && !required;
      const capital = canAct && own && phase === 'capital';
      const occupied = canAct && !!state.pending;
      const mode = occupied ? 'occupy' : pair ? phase : placing ? 'deploy' : capital ? 'capital' : '';
      if (mode && !$('rk').classList.contains('rk-focus-mode') && !contextView) contextView=board.snapshot();
      $('rk').classList.toggle('rk-focus-mode', !!mode);
      $('rk').dataset.interaction = mode;
      $('rkClearSelection').hidden = !canAct || selected === null || !!mode;
      $('rkPool').classList.toggle('rk-selected-pool', !!mode);
      let html = '', title = '', subtitle = '', actors = '';
      const cancel = '<button id="rkActioncancel" class="rk-round rk-cancel" data-action="cancel" aria-label="Annuleren en terug naar de kaart"><span>×</span><small>Terug</small></button>';
      const confirm = (label, action) => button(`<span aria-hidden="true">✓</span><small>${label}</small>`,action);
      if (mode === 'deploy') {
        title = phase === 'deploy' ? 'Startlegers plaatsen' : 'Legers plaatsen';
        subtitle = E.territories[selected].name;
        html = `${cancel}${amount(state.pool,state.pool)}${confirm('Plaatsen','reinforce')}<p id="rkDraftPreview" class="rk-transfer-caption"></p>`;
      } else if (mode === 'capital') {
        title = 'Kies je hoofdstad'; subtitle = E.territories[selected].name;
        html = `${cancel}<p class="rk-capital-choice">♛<small>+2 legers per beurt · 3 verdedigingsdobbelstenen</small></p>${confirm('Kiezen','capital')}`;
      } else if (mode === 'occupy' || mode === 'fortify') {
        title = mode === 'occupy' ? 'Veroverd! Verplaats je legers' : 'Legers verplaatsen';
        subtitle = mode === 'occupy' && state.lastBattle ? `Jij −${state.lastBattle.attackLoss} · Tegenstander −${state.lastBattle.defendLoss}` : 'Verplaats één keer via je eigen gebieden';
        actors = actor(selected,'from','blijven achter')+actor(target,'to','na verplaatsing');
        const min = mode === 'occupy' ? state.pending.min : 1, max = mode === 'occupy' ? state.pending.max : t.armies-1;
        const value = mode === 'occupy' ? state.pending.suggested ?? max : max;
        html = `${mode === 'occupy' ? '<button class="rk-round rk-minimum" data-action="minimum" aria-label="Minimaal aantal legers verplaatsen"><span>Min</span><small>Minimaal</small></button>' : cancel}${amount(max,value,min)}${confirm('Verplaatsen',mode === 'occupy' ? 'occupy' : 'fortify')}`;
      } else if (mode === 'attack') {
        title = 'Winstkans bij blitz';
        const max = Math.max(0,t.armies-1), value = Math.min(commitChoice ?? max,max);
        const dice = Math.min(diceChoice ?? 0,Math.min(3,max));
        if (dice) title='Losse worp';
        actors = actor(selected,'from','vallen aan')+actor(target,'to','verdedigen');
        const diceOptions = [0,...[1,2,3].filter(n=>n<=max)];
        const roll = `<div class="rk-roll-choice"><button data-action="previousDice" aria-label="Vorige dobbelsteenkeuze">‹</button>${button(`<span class="rk-dice-cluster" aria-hidden="true">${[0,1,2].slice(0,dice||3).map((_,i)=>die(dice ? i+2 : 6)).join('')}</span><small>${dice ? dice+' '+(dice===1?'dobbelsteen':'dobbelstenen') : 'Blitz'}</small>`,dice?'attack':'blitz',max<1)}<button data-action="nextDice" aria-label="Volgende dobbelsteenkeuze">›</button><label class="visually-hidden">Dobbelsteenkeuze<select id="rkDice">${diceOptions.map(n=>`<option value="${n}" ${n===dice?'selected':''}>${n ? n+' dobbelstenen' : 'Blitz'}</option>`).join('')}</select></label></div>`;
        html = `${cancel}${roll}<div class="rk-attack-limit">${dice ? `<b>${dice} ${dice===1?'dobbelsteen':'dobbelstenen'}</b><span>tegen ${Math.min(E.defenseDice(state,target),state.territories[target].armies)}</span>` : `<label for="rkCommitRange">Inzet <output id="rkCommitCount">${value}</output><span>/${max}</span></label><input id="rkCommitRange" type="range" min="1" max="${Math.max(1,max)}" value="${Math.max(1,value)}" ${max?'':'disabled'}>`}<p id="rkReserve"></p><small id="rkOdds"></small></div>`;
        if (encounter?.from === selected && encounter?.to === target && encounter.turn === state.turn) html += `<div class="rk-result"><b>Jij −${encounter.attackLoss} · Tegenstander −${encounter.defendLoss}</b>${encounter.attack.length ? encounter.attack.map(n=>die(n)).join('')+'<i>tegen</i>'+encounter.defend.map(n=>die(n,true)).join('') : ''}</div>`;
      } else if (phase === 'won') {
        html = `<div class="rk-victory"><h3>🏆 ${esc(state.players[state.winner].name)} wint!</h3><p>${state.round} rondes · ${E.owned(state,state.winner).length} gebieden</p>${button('Nieuw spel','new')}${button('Naar menu','menu',false,true)}</div>`;
      }
      $('rkContextHeading').hidden = !mode;
      $('rkContextHeading').innerHTML = mode ? `<h3>${title}</h3>${mode === 'attack' ? '<strong id="rkChance"></strong>' : `<p>${esc(subtitle)}</p>`}` : '';
      $('rkActors').hidden = !actors; $('rkActors').innerHTML = actors;
      $('rkControls').hidden = !html; $('rkControls').innerHTML = html;
      if (previousAmount!==null && previousAmount!==undefined && $('rkAmount')) { $('rkAmount').value=previousAmount; $('rkAmountRange').value=previousAmount; }
      board.clearPreview();
      if (mode === 'deploy') previewAmount();
      else if (occupied || mode === 'fortify') previewTransfer();
      updateOdds();
      // Cards and alternative country selectors are separate from the map action.
      const handOpen = $('rkPrivateInfo').querySelector('.rk-card-hand')?.open;
      const missionOpen = $('rkPrivateInfo').querySelector('.rk-mission')?.open;
      let privateInfo = '';
      if (canAct && state.rules?.goal === 'mission') privateInfo += `<details class="rk-mission" ${missionOpen?'open':''}><summary>✉ Mijn geheime missie</summary><p>${esc(E.mission(state).text)}</p></details>`;
      if (canAct) {
        const currentHandKey=`${state.current}/${state.turn}/${hand.join(',')}`;
        if (phase==='reinforce' && handKey!==currentHandKey) {cards=E.findSet(state)||[];handKey=currentHandKey;}
        privateInfo += `<details class="rk-card-hand" ${required||handOpen?'open':''}><summary>▱ Mijn ${hand.length} kaarten${required?' · ruilen verplicht':''}</summary>${hand.length ? `<div class="rk-cards">${hand.map(id=>`<button id="rkCard${id}" data-card="${id}" aria-pressed="${cards.includes(id)}" ${phase!=='reinforce'?'disabled':''} aria-label="${id<42?E.territories[id].name:'Joker'}, ${['infanterie','cavalerie','artillerie','joker'][E.cardSymbol(id)]}">${symbols[E.cardSymbol(id)]}<small>${id<42?E.territories[id].name:'Joker'}</small></button>`).join('')}</div>` : '<p>Verover deze beurt een gebied om een kaart te verdienen.</p>'}${phase==='reinforce'&&hand.length ? button(`Ruil set · +${E.tradeValue(state,cards)} legers`,'trade',!E.validSet(cards)) : '<p>Kaarten ruil je tijdens het versterken.</p>'}</details>`;
      }
      $('rkPrivateInfo').innerHTML = privateInfo;
      let fields = `<label>${phase==='capital'?'Hoofdstad':'Vanuit'}<select id="rkFrom" ${!canAct||occupied?'disabled':''}>${options(E.owned(state),own?selected:null)}</select></label>`;
      if (phase==='attack'||phase==='fortify') {
        const targets = own ? (phase==='attack' ? E.territories[selected].neighbors.filter(i=>state.territories[i].owner!==state.current) : E.owned(state).filter(i=>i!==selected&&E.connected(state,selected,i))) : [];
        fields += `<label>${phase==='attack'?'Vijandelijk buurland':'Naar eigen gebied'}<select id="rkTarget" ${!canAct||occupied?'disabled':''}>${options(targets,target)}</select></label>`;
      }
      $('rkSelectors').innerHTML = fields;
      if (required && canAct) showInspector(true);
      renderGuide();
      if (focused && $(focused) && $(focused).getClientRects().length) $(focused).focus({preventScroll:true});
      else if (wasInControls && !mode) $('rkNext').focus({preventScroll:true});
    }
    function previewAmount() {
      if (!$('rkDraftPreview') || selected === null || !$('rkAmount')) return;
      const input=$('rkAmount'), n=Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)||1));
      $('rkDraftPreview').textContent = `${state.territories[selected].armies} → ${state.territories[selected].armies+n} legers · ${state.pool-n} over`;
      board.previewDraft(selected,n);
    }
    function render() {
      if (!state) return;
      if (state.pending && isHuman() && !handoff) {selected=state.pending.from;target=state.pending.to;}
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
      const phaseOrder=['reinforce','attack','fortify'];
      $("rkPhaseSteps").querySelectorAll("[data-phase]").forEach(el => {
        el.classList.toggle("active", el.dataset.phase === state.phase);
        el.classList.toggle('complete',phaseOrder.indexOf(el.dataset.phase)<phaseOrder.indexOf(state.phase));
        el.setAttribute("aria-current", el.dataset.phase === state.phase ? "step" : "false");
      });
      $("rkInstruction").textContent = state.phase === "deploy" ? "Plaats je startlegers; geef daarna de beurt door." : state.phase === "capital" ? "Kies een eigen gebied als hoofdstad." : state.pending
        ? "Kies hoeveel legers het veroverde land bezetten."
        : state.phase === "reinforce"
          ? `Plaats ${state.pool} versterkingen in je eigen landen.`
          : state.phase === "attack"
            ? "Kies een eigen land en een vijandelijke buur. Eén leger blijft achter."
            : state.phase === "fortify"
              ? "Verplaats één keer via eigen landen, of beëindig je beurt."
              : "Het spel is beslist.";
      if (!isHuman() && state.phase !== 'won') $('rkInstruction').textContent = `${p.name} speelt · ${phases[state.phase].toLowerCase()}`;
      else if (state.phase==='reinforce' && !state.pool) $('rkInstruction').textContent='Alle legers staan. Je kunt gaan aanvallen.';
      else if (state.phase==='deploy' && !state.pool) $('rkInstruction').textContent='Je startlegers staan. Geef de beurt door.';
      else if (!state.pending && selected !== null && ['attack','fortify'].includes(state.phase)) $('rkInstruction').textContent = `${E.territories[selected].name} · ${state.phase==='attack'?'kies een gemarkeerde vijand of sleep je leger':'kies een verbonden eigen land'}`;
      if (isHuman() && !handoff && state.phase!=='won') {
        const owned=E.owned(state), armies=owned.reduce((sum,i)=>sum+state.territories[i].armies,0);
        $('rkInstruction').textContent=`${owned.length} landen · ${armies} legers${state.conquered?' · kaart verdiend':''}`;
      }
      const required = p.cards.length >= (state.resumeAttack ? 6 : 5), next = $("rkNext");
      next.dataset.action = state.phase === "fortify" ? "endTurn" : "advance";
      next.disabled = !isHuman() || handoff || !!state.pending || !["reinforce","attack","fortify","deploy"].includes(state.phase) || ((state.phase === "reinforce" || state.phase === "deploy") && (state.pool > 0 || (state.phase === "reinforce" && required)));
      next.textContent = state.phase === "fortify" ? "Beurt klaar ✓" : state.phase === "attack" ? "Verplaatsen →" : state.phase === "deploy" ? "Volgende speler →" : "Aanvallen →";
      $('rkMapNext').disabled=next.disabled; $('rkMapNext').textContent=next.textContent; $('rkMapNext').dataset.action=next.dataset.action;
      $('rkBack').setAttribute('aria-label',selected!==null && !state.pending?'Selectie annuleren':'Wereldmacht opslaan en naar het menu');
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
      selected=null;target=null;overviewView=null;contextView=null;
      $('rk').classList.remove('rk-focus-mode');
      active = false;
      lastPlacement=null;
      showInspector(false);
      api.close();
      api.menu();
    }
    function dismiss() {
      if (!active) return false;
      if (!$('rkInspector').hidden) {
        showInspector(false);
        ($('rkActioncancel') || $('rkActionoccupy') || $('rkDockToggle')).focus({preventScroll:true});
        return true;
      }
      if (!$('rkCountryList').hidden) {changeView(false);$('rkPickCountry').focus({preventScroll:true});return true;}
      if (!state?.pending && selected!==null) { cancelSelection(target===null); return true; }
      if (!state?.pending && $('rk').classList.contains('rk-expanded')) { board.close(); return true; }
      return false;
    }
    function back() { if (!dismiss()) leave(); }
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
      countryFilter='available';$('rkCountrySearch').value='';changeView(false);
      showInspector(false);
      board.fit();
      if (state) {
        checkHandoff();
        render();
        if (state.pending && isHuman() && !handoff) board.focusPair(state.pending.from,state.pending.to);
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
      showInspector($('rkInspector').hidden,true);
    });
    $('rkCloseInspector').addEventListener('click',()=>{showInspector(false);$('rkDockToggle').focus({preventScroll:true});});
    $('rkClearSelection').addEventListener('click',()=>cancelSelection(true));
    $("rkBack").addEventListener("click", back);
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
      const id = board.pickCountry(event.clientX,event.clientY);
      if (draggedPool && id!==null && !blocked() && !modalOpen()) {
        if (state.territories[id].owner === state.current) {
          choose(id);
        } else feedback("Kies een eigen land", "Versterkingen plaats je op jouw eigen kleur.");
      }
      cancelPoolDrag();
    });
    $("rkPool").addEventListener("pointercancel", cancelPoolDrag);
    $("rkPool").addEventListener("lostpointercapture", cancelPoolDrag);
    $("rkPool").addEventListener("click", () => {
      if (draggedPool) { draggedPool = false; return; }
      if (blocked()) return;
      openCountryPicker();
    });
    $("rkHand").addEventListener("click", () => {
      if (blocked()) return;
      showInspector(true);
      const hand = $("rkPrivateInfo").querySelector(".rk-card-hand");
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
      lastPlacement = null;
      handoff = false;
      commitChoice = null;
      encounter = null;
      diceChoice = null;
      $("rkFeedback").hidden = true;
      overviewView=null;contextView=null;showInspector(false);
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
      if (state.pending) board.focusPair(state.pending.from,state.pending.to);
      schedule();
    }
    $('rk').addEventListener('keydown',event=>{
      if (!$('rkInspector').hidden && event.key==='Tab') {
        const items=[...$('rkInspector').querySelectorAll('button:not(:disabled),select:not(:disabled),summary')].filter(el=>el.getClientRects().length);
        if (event.shiftKey && document.activeElement===items[0] || !event.shiftKey && document.activeElement===items.at(-1)) {event.preventDefault();(event.shiftKey?items.at(-1):items[0])?.focus();} return;
      }
      if (event.key!=='Escape' || document.querySelector('.modal.show,.overlay.show')) return;
      if (!$('rkInspector').hidden) {event.preventDefault();event.stopImmediatePropagation();showInspector(false);$('rkDockToggle').focus({preventScroll:true});}
      else if (!$('rkCountryList').hidden) {event.preventDefault();event.stopImmediatePropagation();changeView(false);$('rkPickCountry').focus({preventScroll:true});}
      else if (selected!==null && !state?.pending) {event.preventDefault();event.stopImmediatePropagation();cancelSelection(target===null);}
    });
    $("rkBeginTurn").addEventListener("click", beginTurn);
    function changeView(list) {
      if (list) {clearTimeout(feedbackTimer);$('rkFeedback').hidden=true;}
      $("rkViewMenu").open = false;
      $("rkCountryList").hidden = !list;
      $("rkMapViewport").hidden = list;
      $("rkZoomTools").hidden = list;
      $("rkMapTip").hidden = list;
      $("rkMapTab").setAttribute("aria-pressed", String(!list));
      $("rkListTab").setAttribute("aria-pressed", String(list));
      if (state) {renderCountryList();renderGuide();}
    }
    function openCountryPicker() {
      if (blocked() || state.pending) return;
      countryFilter='available';$('rkCountrySearch').value='';
      changeView(true);
      $('rkCloseCountries').focus({preventScroll:true});
    }
    $('rkPickCountry').addEventListener('click',()=>{
      const required=state?.phase==='reinforce' && state.players[state.current].cards.length>=(state.resumeAttack?6:5);
      if (required) {$('rkHand').click();return;}
      if (!$('rkCountryList').hidden) {changeView(false);$('rkMapViewport').focus({preventScroll:true});}
      else openCountryPicker();
    });
    $('rkCloseCountries').addEventListener('click',()=>{changeView(false);$('rkPickCountry').focus({preventScroll:true});});
    $('rkCountrySearch').addEventListener('input',renderCountryList);
    $('rkCountryFilters').addEventListener('click',event=>{
      const b=event.target.closest('[data-country-filter]');if(!b)return;
      countryFilter=b.dataset.countryFilter;renderCountryList();
    });
    $('rkUndoPlacement').addEventListener('click',undoPlacement);
    let layoutFrame=0;
    const guideLayout=new ResizeObserver(()=>{
      if (!layoutFrame) layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;measureLayout();});
    });
    guideLayout.observe($('rkGuide'));guideLayout.observe($('rk').querySelector('.rk-turn'));
    $("rkMapTab").addEventListener("click", () => changeView(false));
    $("rkListTab").addEventListener("click", () => changeView(true));
    $("rk").addEventListener("click", (event) => {
      const continent = event.target.closest("[data-continent]");
      if (continent) { changeView(false); board.focusContinent(continent.dataset.continent); return; }
      const country = event.target.closest("[data-country]");
      if (country) {
        if (country.disabled) return;
        const fromList=!!country.closest('#rkCountryResults');
        if (fromList) changeView(false);
        choose(Number(country.dataset.country));
        if (fromList) ($('rkActionreinforce') || $('rkActionblitz') || $('rkActioncapital') || $('rkTargetChoices').querySelector('button') || $('rkMapViewport')).focus({preventScroll:true});
        return;
      }
      const destination=event.target.closest('[data-quick-country]');
      if (destination) {choose(Number(destination.dataset.quickCountry));return;}
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
        previewAmount();
        return;
      }
      if (type==='cancel') { cancelSelection(); return; }
      if (type==='minimum') { $('rkAmount').value=$('rkAmount').min; $('rkAmountRange').value=$('rkAmount').value; previewTransfer(); return; }
      if (type==='previousDice'||type==='nextDice') {
        const values=[0,...[1,2,3].filter(n=>n<state.territories[selected].armies)];
        const index=values.indexOf(diceChoice||0);
        diceChoice=values[(index+(type==='nextDice'?1:values.length-1))%values.length];
        renderControls(); return;
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
      const maximum=state.territories[selected].armies-1, actualDice=Number($('rkDice')?.value)||0, manual=actualDice>0;
      const value=manual?maximum:Math.min(Number($('rkCommitRange').value),maximum), odds=manual?null:value?E.battleOdds(value,state.territories[target].armies,E.defenseDice(state,target),state.rules?.dice):0;
      if ($('rkCommitCount')) $('rkCommitCount').textContent=value;
      $("rkChance").textContent = manual?`${actualDice} tegen ${Math.min(E.defenseDice(state,target),state.territories[target].armies)}`:odds === null ? "—" : `${odds===1 ? "100" : odds===0 ? "0" : odds > .99 ? ">99" : odds < .01 ? "<1" : Math.round(odds*100)}%`;
      const reserve = state.territories[selected].armies-value;
      $("rkReserve").textContent = manual?'Eén leger blijft achter.':`${reserve} ${reserve===1 ? "blijft" : "blijven"} achter · ${value} ${value===1 ? "valt" : "vallen"} aan`;
      $("rkFromCount").textContent = value;
      $("rkFromCaption").textContent = manual?'beschikbaar':"vallen aan";
      const mode=state.rules?.dice === "balanced" ? "gebalanceerde blitz" : "willekeurige blitz";
      $("rkOdds").textContent = manual?'Bij gelijkspel wint de verdediger.':`${mode}${E.defenseDice(state,target)===3 ? " · hoofdstad: 3 verdedigingsdobbelstenen" : ""}`;
    }
    $("rk").addEventListener("input", event => {
      if (event.target.id === "rkAmountRange") $("rkAmount").value = event.target.value;
      if (event.target.id === "rkAmount") $("rkAmountRange").value = event.target.value;
      if (["rkAmountRange","rkAmount"].includes(event.target.id)) previewTransfer();
      if (["rkAmountRange","rkAmount"].includes(event.target.id)) previewAmount();
      if (event.target.id === "rkCommitRange") { commitChoice = Number(event.target.value); updateOdds(); }
    });
    $("rk").addEventListener("change", (event) => {
      if (event.target.id==='rkAmount') {
        const input=event.target;input.value=Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)||Number(input.min)));
        $('rkAmountRange').value=input.value;previewAmount();previewTransfer();
      }
      if (event.target.id === "rkFrom") {
        if (event.target.value==='') cancelSelection(true);
        else { choose(Number(event.target.value)); if (['attack','fortify'].includes(state.phase)) { showInspector(true); $('rkInspector').querySelector('.rk-accessible').open=true; $('rkTarget')?.focus({preventScroll:true}); } }
      }
      if (event.target.id === "rkTarget") {
        if (event.target.value!=='') choose(Number(event.target.value));
      }
      if (event.target.id === "rkDice") { diceChoice=Number(event.target.value); renderControls(); }
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
    watcher.observe($('rkInspector'),{attributes:true,attributeFilter:['hidden']});
    return {
      enter,
      leave,
      dismiss,
      hasSave: () => E.validState(api.storage.get("rk.save", null)),
      save,
    };
  }
  window.ReneRisk = { create };
})();
