(function () {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) =>
    String(value).replace(
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
  const categories = {
    cards: ["patience", "klaverjas", "wb"],
    puzzles: ["sd", "ms", "mj", "ls", "bh", "sm", "kb", "wq"],
    action: ["td", "airhockey", "pf", "rs", "bs", "kp", "bv", "gg", "vd"],
    strategy: ["rk", "td", "zs", "klaverjas", "wb"],
    multiplayer: ["rk", "airhockey", "zs", "wb", "vd"],
  };
  function announce(text) {
    const live = $("#appAnnouncement");
    if (!live) return;
    live.textContent = "";
    setTimeout(() => {
      live.textContent = text;
    }, 30);
  }
  function saveFailure() {
    const warning = $("#saveWarning");
    if (warning) warning.hidden = false;
  }
  function saveRecovery() {
    const warning = $("#saveWarning");
    if (warning) warning.hidden = true;
  }
  function initAccessibility(games = []) {
    let current = null;
    const openers = new WeakMap(),
      remembered = new WeakMap();
    const visible = (el) =>
      el &&
      el.isConnected &&
      !el.closest("[hidden],[inert]") &&
      el.getClientRects().length > 0;
    const focusables = (el) =>
      [
        ...el.querySelectorAll(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ].filter(visible);
    function dialogs() {
      return [...document.querySelectorAll(".modal.show,.overlay.show")].filter(
        (el) => el.getClientRects().length,
      );
    }
    function sync() {
      const open = dialogs();
      const next = open.at(-1) || null;
      if (next !== current) {
        const previous = current;
        current = next;
        if (next) openers.set(next, document.activeElement);
        document.querySelectorAll(".screen").forEach((el) => {
          el.inert = !!next || !el.classList.contains("active");
        });
        document.querySelectorAll(".modal,.overlay").forEach((el) => {
          el.inert = el !== next;
        });
        if (next) {
          next.setAttribute("role", "dialog");
          next.setAttribute("aria-modal", "true");
          next.tabIndex = -1;
          const heading = next.querySelector("h3,h2");
          if (heading) {
            if (!heading.id) heading.id = `${next.id}Heading`;
            next.setAttribute("aria-labelledby", heading.id);
          } else next.setAttribute("aria-label", "Spelvenster");
          (focusables(next)[0] || next).focus({ preventScroll: true });
        } else if (previous) {
          const opener = openers.get(previous);
          if (visible(opener)) opener.focus({ preventScroll: true });
          else $(".screen.active button")?.focus({ preventScroll: true });
        }
      } else {
        document.querySelectorAll(".screen").forEach((el) => {
          el.inert = !!next || !el.classList.contains("active");
        });
        if (next && !next.contains(document.activeElement)) {
          const previous = remembered.get(next);
          const replacement = previous?.id
            ? document.getElementById(previous.id)
            : previous?.dataset.app
              ? [...next.querySelectorAll("[data-app]")].find(
                  (el) =>
                    el.dataset.app === previous.dataset.app &&
                    el.dataset.val === previous.dataset.val,
                )
              : null;
          (replacement || focusables(next)[0] || next).focus({
            preventScroll: true,
          });
        }
      }
    }
    document.querySelectorAll(".modal,.overlay").forEach((el) => {
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      const heading = el.querySelector("h3,h2");
      if (heading) {
        if (!heading.id) heading.id = `${el.id}Heading`;
        el.setAttribute("aria-labelledby", heading.id);
      }
    });
    const observer = new MutationObserver(sync);
    document.querySelectorAll(".modal,.overlay").forEach((el) =>
      observer.observe(el, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true,
      }),
    );
    document
      .querySelectorAll(".screen")
      .forEach((el) =>
        observer.observe(el, { attributes: true, attributeFilter: ["class"] }),
      );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && current) {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.appBack?.();
          sync();
        } else if (event.key === "Tab" && current) {
          const items = focusables(current),
            first = items[0],
            last = items.at(-1);
          if (!items.length) {
            event.preventDefault();
            current.focus();
          } else if (
            (event.shiftKey &&
              (document.activeElement === first ||
                !current.contains(document.activeElement))) ||
            (!event.shiftKey &&
              (document.activeElement === last ||
                !current.contains(document.activeElement)))
          ) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          }
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    document.addEventListener("focusin", (event) => {
      if (current?.contains(event.target))
        remembered.set(current, event.target);
      if (
        current &&
        !current.contains(event.target) &&
        !$("#saveWarning")?.contains(event.target)
      )
        (focusables(current)[0] || current).focus({ preventScroll: true });
    });
    document
      .querySelectorAll('[id$="Toast"],#toast,#menuToast')
      .forEach((el) => {
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        el.setAttribute("aria-atomic", "true");
      });
    document.querySelectorAll("canvas").forEach((el) => {
      const screen = el.closest(".screen");
      const name = games.find((game) => game.id === screen?.id)?.label;
      if (!el.getAttribute("aria-label"))
        el.setAttribute(
          "aria-label",
          `Spelbord${name ? " van " + name : ""}. Gebruik de spelknoppen om te spelen.`,
        );
    });
    $("#dismissSaveWarning")?.addEventListener("click", () => {
      $("#saveWarning").hidden = true;
    });
    sync();
  }
  function createDiscovery(api) {
    const games = api.games,
      config = api.config;
    let query = "",
      category = "all";
    const block = document.createElement("div");
    block.className = "discovery";
    block.innerHTML = `<div class="game-search"><span aria-hidden="true">⌕</span><label class="visually-hidden" for="gameSearch">Zoek een spel</label><input id="gameSearch" type="search" placeholder="Zoek een spel…" autocomplete="off"><button id="clearGameSearch" aria-label="Zoekopdracht wissen" hidden>×</button></div>
      <nav class="category-filters" aria-label="Soort spel">${[
        ["all", "Alle spellen"],
        ["cards", "Kaarten & woorden"],
        ["puzzles", "Puzzels"],
        ["action", "Actie"],
        ["strategy", "Strategie"],
        ["multiplayer", "Samen spelen"],
      ]
        .map(
          ([id, label]) =>
            `<button data-category="${id}" aria-pressed="${id === "all"}">${label}</button>`,
        )
        .join("")}</nav>
      <section id="favoritesSection" aria-labelledby="favoritesHeading"><div class="discovery-head"><h2 id="favoritesHeading">⭐ Favorieten</h2><button id="chooseFavorites">Kiezen</button></div><div id="favoritesRow" class="discovery-row"></div><p id="favoritesEmpty" class="favorites-empty">Zet je favoriete spellen hier vast met ‘Kiezen’.</p></section>
      <section id="dailySection" aria-labelledby="dailyHeading"><h2 id="dailyHeading">📅 Vandaag</h2><div id="dailyRow" class="discovery-row"></div></section>`;
    $("#menu .games").before(block);
    const count = document.createElement("div");
    count.className = "game-results";
    count.innerHTML =
      '<span id="gameCount" role="status" aria-live="polite"></span><button id="resetGameFilters" hidden>Alles tonen</button>';
    block.after(count);
    const empty = document.createElement("p");
    empty.className = "no-games";
    empty.id = "noGames";
    empty.hidden = true;
    empty.textContent =
      "Geen spellen gevonden. Probeer een andere zoekopdracht of categorie.";
    $("#menu .games").after(empty);
    const normal = (value) =>
      value
        .toLocaleLowerCase("nl-NL")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const card = (g, extra = "", daily = false) =>
      `<button class="discovery-card" data-${daily ? "daily" : "open"}="${g.id}"><img src="${api.icon(g)}" alt=""><span><b>${escape(g.label)}</b>${extra ? `<small>${escape(extra)}</small>` : ""}</span></button>`;
    function render() {
      const needle = normal(query.trim());
      let total = 0;
      for (const g of games) {
        const tile = $("#" + g.tile);
        const match =
          !config.hidden.includes(g.id) &&
          (category === "all" || categories[category].includes(g.id)) &&
          (!needle ||
            normal(`${g.label} ${tile.textContent}`).includes(needle));
        tile.hidden = !match;
        if (match) total++;
      }
      $("#gameCount").textContent =
        `${total} ${total === 1 ? "spel" : "spellen"}`;
      $("#noGames").hidden = total !== 0;
      $("#clearGameSearch").hidden = !query;
      $("#resetGameFilters").hidden = !query && category === "all";
      $("#favoritesRow").innerHTML = games
        .filter(
          (g) => config.pinned.includes(g.id) && !config.hidden.includes(g.id),
        )
        .map((g) => card(g))
        .join("");
      $("#favoritesEmpty").hidden = !!$("#favoritesRow").children.length;
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      $("#dailyRow").innerHTML = ["mj", "bh", "ls", "wq"]
        .filter((id) => !config.hidden.includes(id))
        .map((id) => {
          const g = games.find((g) => g.id === id),
            stats = api.storage.get(`${id}.stats`, {});
          const completed = stats.daily && stats.daily[date] != null;
          return card(
            g,
            completed
              ? "✓ Vandaag voltooid"
              : id === "mj"
                ? "Dezelfde puzzel voor iedereen"
                : id === "wq"
                  ? "Dagquiz · 10 vragen"
                  : id === "bh"
                    ? "Dagrit · vanaf level 9"
                    : "Dagpuzzel · vanaf level 11",
            true,
          );
        })
        .join("");
      $("#dailySection").hidden = !$("#dailyRow").children.length;
      block
        .querySelectorAll("[data-category]")
        .forEach((el) =>
          el.setAttribute(
            "aria-pressed",
            String(el.dataset.category === category),
          ),
        );
    }
    $("#gameSearch").addEventListener("input", (event) => {
      query = event.target.value;
      render();
    });
    $("#clearGameSearch").addEventListener("click", () => {
      query = "";
      $("#gameSearch").value = "";
      render();
      $("#gameSearch").focus();
    });
    $("#resetGameFilters").addEventListener("click", () => {
      query = "";
      category = "all";
      $("#gameSearch").value = "";
      render();
    });
    block.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.category) {
        category = button.dataset.category;
        render();
      } else if (button.dataset.open) api.open(button.dataset.open);
      else if (button.dataset.daily) {
        const id = button.dataset.daily;
        api.open(id);
        if ($("#" + id)?.classList.contains("active")) {
          // Use the existing game's daily entry: unlock rules and new-game confirmation stay intact.
          $("#" + id + "Daily")?.click();
        }
      }
    });
    function choices() {
      $("#favoriteChoices").innerHTML = games
        .filter((g) => !config.hidden.includes(g.id))
        .map(
          (g) =>
            `<button data-favorite="${g.id}" aria-pressed="${config.pinned.includes(g.id)}"><img src="${api.icon(g)}" alt=""><span>${escape(g.label)}</span><span aria-hidden="true">${config.pinned.includes(g.id) ? "★" : "☆"}</span></button>`,
        )
        .join("");
    }
    $("#chooseFavorites").addEventListener("click", () => {
      choices();
      api.modal("favoritesModal");
    });
    $("#favoriteChoices").addEventListener("click", (event) => {
      const button = event.target.closest("[data-favorite]");
      if (!button) return;
      const id = button.dataset.favorite;
      config.pinned = config.pinned.includes(id)
        ? config.pinned.filter((x) => x !== id)
        : [...config.pinned, id];
      api.saveConfig();
      api.refreshMenu();
      choices();
      $('#favoriteChoices [data-favorite="' + id + '"]').focus();
    });
    render();
    return { render };
  }
  function applyMotion(config) {
    const reduce =
      config.motion === "reduce" ||
      (config.motion !== "full" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches);
    document.documentElement.classList.toggle("reduced-motion", reduce);
  }
  window.ReneEnhancements = {
    announce,
    saveFailure,
    saveRecovery,
    initAccessibility,
    createDiscovery,
    applyMotion,
  };
})();
