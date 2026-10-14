(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RenePersistence = api;
})(globalThis, function () {
  "use strict";
  const FORMAT = "renes-spelletjes-backup";
  const MAX_BYTES = 8 * 1024 * 1024;
  const games = [
    "air",
    "bh",
    "bs",
    "bv",
    "gg",
    "kb",
    "kj",
    "kp",
    "ls",
    "mj",
    "ms",
    "patience",
    "pf",
    "rk",
    "rs",
    "sd",
    "sm",
    "td",
    "wb",
    "wq",
    "vd",
    "zs",
  ];
  const allowed = new Set(
    games
      .flatMap((g) =>
        ["save", "settings", "stats", "progress"].map((k) => `${g}.${k}`),
      )
      .concat([
        "app.cfg",
        "app.errors",
        "app.fbQueue",
        "app.profile",
        "app.profiles",
        "app.today",
        "app.updatedTo",
        "bs.tips",
        "patience.v14",
        "playtime",
        "recent",
        "rs.data",
        "trophies.seen",
        "vd.run",
      ]),
  );
  const object = (x) =>
    x !== null &&
    typeof x === "object" &&
    !Array.isArray(x) &&
    Object.getPrototypeOf(x) === Object.prototype;
  const profileId = (x) =>
    typeof x === "string" && /^p[a-z0-9]+$/i.test(x) && x.length <= 40;
  const numbers = (v, length, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    Array.isArray(v) &&
    (length == null || v.length === length) &&
    v.every((n) => Number.isFinite(n) && n >= min && n <= max);
  function validLegacySave(name, v) {
    const array = (x, length) =>
      Array.isArray(x) && (length == null || x.length === length);
    const num = (x) => Number.isFinite(x) && x >= 0;
    switch (name) {
      case "wq.save":
        return (
          v.v === 1 &&
          object(v.cfg) &&
          Array.isArray(v.qs) &&
          v.qs.length > 0 &&
          v.qs.length <= 1000 &&
          v.qs.every(
            (q) =>
              object(q) &&
              typeof q.c === "string" &&
              /^[A-Z]{2}$/.test(q.c) &&
              typeof q.t === "string" &&
              q.t.length < 30 &&
              (!q.o ||
                (Array.isArray(q.o) &&
                  q.o.every(
                    (c) => typeof c === "string" && /^[A-Z]{2}$/.test(c),
                  ))),
          )
        );
      case "patience.save":
        return (
          object(v.S) &&
          array(v.S.stock) &&
          array(v.S.waste) &&
          array(v.S.f, 4) &&
          v.S.f.every(Array.isArray) &&
          array(v.S.t, 7) &&
          v.S.t.every(Array.isArray) &&
          array(v.S.up) &&
          num(v.moves) &&
          num(v.elapsed) &&
          array(v.history)
        );
      case "kj.save":
        return (
          array(v.hands, 4) &&
          v.hands.every(Array.isArray) &&
          array(v.trick) &&
          numbers(v.pts, 2) &&
          numbers(v.roem, 2) &&
          array(v.log) &&
          typeof v.phase === "string" &&
          num(v.round)
        );
      case "td.save":
        return (
          ["weide", "woestijn", "sneeuw", "vulkaan"].includes(v.map) &&
          array(v.towers) &&
          num(v.wave) &&
          num(v.gold) &&
          num(v.lives) &&
          object(v.cd)
        );
      case "zs.save":
        return (
          array(v.boards, 2) &&
          v.boards.every(
            (b) =>
              object(b) &&
              array(b.ships) &&
              array(b.shots, 10) &&
              b.shots.every((row) => numbers(row, 10, 0, 3)),
          ) &&
          numbers(v.shots, 2) &&
          numbers(v.hits, 2) &&
          typeof v.phase === "string"
        );
      case "bs.save":
        return (
          object(v.S) &&
          typeof v.S.g === "string" &&
          v.S.g.length < 20000 &&
          array(v.S.pal) &&
          num(v.S.shots) &&
          object(v.G) &&
          ["lvl", "end"].includes(v.G.mode)
        );
      case "ls.save":
        return (
          object(v.G) &&
          array(v.G.undo) &&
          object(v.C) &&
          array(v.C.T) &&
          v.C.T.every(Array.isArray) &&
          array(v.C.hid, v.C.T.length) &&
          num(v.G.moves)
        );
      case "bh.save":
        return (
          object(v.G) &&
          array(v.G.undo) &&
          object(v.C) &&
          array(v.C.gone) &&
          array(v.C.bays) &&
          array(v.C.cols, v.C.gone.length) &&
          num(v.G.moves)
        );
      case "mj.save":
        return (
          typeof v.lay === "string" &&
          numbers(v.faces, null, -1, 200) &&
          array(v.undo) &&
          num(v.time) &&
          num(v.hints) &&
          num(v.shuffles)
        );
      case "wb.save":
        return (
          array(v.board, 225) &&
          array(v.racks, 2) &&
          v.racks.every(Array.isArray) &&
          array(v.bag) &&
          numbers(v.scores, 2) &&
          typeof v.bonus === "string" &&
          v.bonus.length === 225 &&
          array(v.hist)
        );
      case "sm.save":
        return (
          v.v === 1 &&
          array(v.p) &&
          v.p.length >= 16 &&
          array(v.hole) &&
          array(v.jelly) &&
          array(v.ice) &&
          num(v.score) &&
          num(v.moves)
        );
      case "bv.save":
        return (
          numbers(v.grid, 220, 0, 7) &&
          array(v.queue) &&
          num(v.score) &&
          num(v.lines) &&
          object(v.cur)
        );
      case "sd.save":
        return (
          numbers(v.puz, 81, 0, 9) &&
          numbers(v.sol, 81, 1, 9) &&
          numbers(v.val, 81, 0, 9) &&
          numbers(v.notes, 81, 0, 1023) &&
          num(v.time)
        );
      case "ms.save":
        return (
          Number.isInteger(v.rows) &&
          v.rows >= 1 &&
          v.rows <= 40 &&
          Number.isInteger(v.cols) &&
          v.cols >= 1 &&
          v.cols <= 40 &&
          numbers(v.mine, v.rows * v.cols, 0, 1) &&
          numbers(v.adj, v.rows * v.cols, 0, 8) &&
          numbers(v.st, v.rows * v.cols, 0, 3) &&
          num(v.mines) &&
          v.mines < v.rows * v.cols &&
          num(v.time)
        );
      default:
        return false;
    }
  }
  const keyInfo = (key) => {
    const match = /^p_(p[a-z0-9]+)\.(.+)$/i.exec(key);
    const name = match ? match[2] : key;
    return {
      name,
      valid:
        key.length < 100 &&
        allowed.has(name) &&
        !(match && name.startsWith("app.")),
    };
  };
  function safeTree(value, depth = 0) {
    if (depth > 40) return false;
    if (value === null || ["string", "boolean"].includes(typeof value))
      return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value))
      return (
        value.length < 100000 && value.every((v) => safeTree(v, depth + 1))
      );
    return (
      object(value) &&
      Object.entries(value).every(
        ([k, v]) =>
          !["__proto__", "prototype", "constructor"].includes(k) &&
          safeTree(v, depth + 1),
      )
    );
  }
  function validValue(name, value) {
    if (!safeTree(value)) return false;
    if (value === null)
      return name.endsWith(".save") || name === "app.updatedTo";
    if (name === "app.profile") return profileId(value);
    if (name === "patience.v14") return typeof value === "boolean";
    if (["recent", "trophies.seen"].includes(name))
      return (
        Array.isArray(value) &&
        value.every((x) => typeof x === "string" && x.length < 100)
      );
    if (["app.errors", "app.fbQueue"].includes(name))
      return Array.isArray(value) && value.every(object);
    if (name === "app.profiles")
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 100 &&
        value.every(
          (p) =>
            object(p) &&
            profileId(p.id) &&
            typeof p.name === "string" &&
            p.name.length > 0 &&
            p.name.length <= 40 &&
            typeof p.avatar === "string" &&
            p.avatar.length < 100,
        ) &&
        new Set(value.map((p) => p.id)).size === value.length
      );
    if (!object(value)) return false;
    if (name === "app.cfg") {
      for (const k of ["order", "hidden", "pinned"])
        if (
          k in value &&
          (!Array.isArray(value[k]) ||
            !value[k].every((x) => typeof x === "string"))
        )
          return false;
      if ("pin" in value && value.pin !== null && typeof value.pin !== "string")
        return false;
      for (const k of ["mute", "vibrate", "awake", "colorblind"])
        if (k in value && typeof value[k] !== "boolean") return false;
      for (const [k, values] of Object.entries({
        theme: ["auto", "donker", "licht"],
        text: ["normaal", "groot"],
        layout: ["raster", "lijst"],
        motion: ["auto", "reduce", "full"],
        update: ["auto", "wifi", "manual"],
        music: ["uit", "zacht", "normaal"],
        sfxVol: ["uit", "zacht", "normaal", "hard"],
      }))
        if (k in value && !values.includes(value[k])) return false;
      if (
        "limit" in value &&
        (!Number.isFinite(value.limit) || value.limit < 0)
      )
        return false;
    }
    if (name === "playtime")
      return Object.values(value).every((v) => Number.isFinite(v) && v >= 0);
    if (name === "app.today")
      return (
        typeof value.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
        Number.isFinite(value.sec) &&
        value.sec >= 0
      );
    if (name === "rk.settings")
      return (
        (!("players" in value) ||
          (Number.isInteger(value.players) &&
            value.players >= 2 &&
            value.players <= 6)) &&
        (!("humans" in value) ||
          (Number.isInteger(value.humans) &&
            value.humans >= 1 &&
            value.humans <= (value.players || 6))) &&
        (!("difficulty" in value) ||
          ["easy", "normal", "strong"].includes(value.difficulty)) &&
        (!("tempo" in value) || ["normal", "fast"].includes(value.tempo)) &&
        (!("goal" in value) || ["world", "domination"].includes(value.goal)) &&
        (!("cardMode" in value) || ["progressive", "fixed"].includes(value.cardMode)) &&
        (!("sound" in value) || typeof value.sound === "boolean") &&
        (!("music" in value) || typeof value.music === "boolean")
      );
    if (name === "rk.save")
      return (
        typeof globalThis.ReneRiskEngine === "object" &&
        globalThis.ReneRiskEngine.validState(value)
      );
    if (name.endsWith(".save")) {
      return validLegacySave(name, value);
    }
    return true;
  }
  function validateBackup(raw, currentVersion) {
    if (
      typeof raw !== "string" ||
      new TextEncoder().encode(raw).length > MAX_BYTES
    )
      throw new Error("Het back-upbestand is te groot of ongeldig.");
    let backup;
    try {
      backup = JSON.parse(raw);
    } catch {
      throw new Error("Dit bestand bevat geen geldige back-up.");
    }
    if (
      !object(backup) ||
      backup.format !== FORMAT ||
      !object(backup.data) ||
      !Object.keys(backup.data).length
    )
      throw new Error("Dit is geen geldige back-up van Rene’s spelletjes.");
    if (
      typeof backup.version !== "string" ||
      !/^\d+\.\d+(?:\.\d+)?$/.test(backup.version) ||
      (backup.schemaVersion != null && backup.schemaVersion !== 1)
    )
      throw new Error("Deze back-upversie wordt niet ondersteund.");
    const version = (v) => v.split(".").map(Number);
    const incoming = version(backup.version),
      current = version(currentVersion);
    for (let i = 0; i < 3; i++) {
      if ((incoming[i] || 0) > (current[i] || 0))
        throw new Error(
          "Deze back-up komt uit een nieuwere app. Werk de app eerst bij.",
        );
      if ((incoming[i] || 0) < (current[i] || 0)) break;
    }
    if (
      typeof backup.date !== "string" ||
      !Number.isFinite(Date.parse(backup.date))
    )
      throw new Error("De datum in deze back-up is ongeldig.");
    for (const [key, rawValue] of Object.entries(backup.data)) {
      const info = keyInfo(key);
      if (!info.valid || typeof rawValue !== "string")
        throw new Error("De back-up bevat onbekende of ongeldige gegevens.");
      let value;
      try {
        value = JSON.parse(rawValue);
      } catch {
        throw new Error(`De gegevens voor ${info.name} zijn beschadigd.`);
      }
      if (!validValue(info.name, value))
        throw new Error(`De gegevens voor ${info.name} zijn ongeldig.`);
    }
    if (backup.data["app.profile"] && backup.data["app.profiles"]) {
      const active = JSON.parse(backup.data["app.profile"]);
      if (!JSON.parse(backup.data["app.profiles"]).some((p) => p.id === active))
        throw new Error("De actieve speler ontbreekt in deze back-up.");
    }
    return backup;
  }
  function snapshot(storage) {
    const result = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (keyInfo(key).valid) result[key] = storage.getItem(key);
    }
    return result;
  }
  function createBackup(storage, version) {
    return JSON.stringify({
      format: FORMAT,
      schemaVersion: 1,
      version,
      date: new Date().toISOString(),
      data: snapshot(storage),
    });
  }
  function restore(storage, data) {
    const before = snapshot(storage);
    try {
      // Write before deleting: if a write fails, old entries are still available for rollback.
      for (const [key, value] of Object.entries(data))
        storage.setItem(key, value);
      for (const key of Object.keys(before))
        if (!(key in data)) storage.removeItem(key);
    } catch (cause) {
      let rolledBack = true;
      for (const key of Object.keys(data))
        if (!(key in before))
          try {
            storage.removeItem(key);
          } catch {
            rolledBack = false;
          }
      for (const [key, value] of Object.entries(before))
        try {
          storage.setItem(key, value);
        } catch {
          rolledBack = false;
        }
      const error = new Error(
        rolledBack
          ? "Terugzetten mislukt. Je eerdere voortgang is behouden."
          : "Terugzetten mislukt. Niet alle eerdere gegevens konden worden hersteld. Bewaar je back-up en sluit de app nog niet.",
      );
      error.cause = cause;
      error.rolledBack = rolledBack;
      throw error;
    }
  }
  function createStore(storage, onFailure = () => {}, onRecovery = () => {}) {
    let prefix = "";
    try {
      const id = JSON.parse(storage.getItem("app.profile"));
      if (profileId(id) && id !== "p0") prefix = `p_${id}.`;
    } catch {}
    const failed = new Set();
    const fullKey = (key) => (key.startsWith("app.") ? key : prefix + key);
    function write(key, value, deleting, explicit = false) {
      key = explicit ? key : fullKey(key);
      try {
        if (deleting) storage.removeItem(key);
        else storage.setItem(key, JSON.stringify(value));
        failed.delete(key);
        if (!failed.size) onRecovery();
        return true;
      } catch (error) {
        failed.add(key);
        onFailure({ key, error });
        return false;
      }
    }
    return {
      get(key, fallback) {
        try {
          const raw = storage.getItem(fullKey(key));
          if (
            raw == null &&
            /^(bs|ls|bh)\.settings$/.test(key) &&
            JSON.parse(storage.getItem("app.cfg") || "{}").colorblind
          )
            return { ...fallback, cb: true };
          return raw == null ? fallback : JSON.parse(raw);
        } catch {
          return fallback;
        }
      },
      set: (key, value) => write(key, value, false),
      del: (key) => write(key, null, true),
      prefix: () => prefix,
      setColorblind(enabled) {
        let profiles = [];
        try {
          profiles = JSON.parse(storage.getItem("app.profiles")) || [];
        } catch {}
        if (!Array.isArray(profiles)) profiles = [];
        const ids = new Set(["p0", ...profiles.map((p) => p.id)]);
        for (const id of ids)
          for (const game of ["bs", "ls", "bh"]) {
            const key = (id === "p0" ? "" : `p_${id}.`) + game + ".settings";
            let options = {};
            try {
              options = JSON.parse(storage.getItem(key)) || {};
            } catch {}
            write(key, { ...options, cb: enabled }, false, true);
          }
      },
    };
  }
  return {
    validateBackup,
    createBackup,
    restore,
    snapshot,
    createStore,
    validValue,
    keyInfo,
    MAX_BYTES,
  };
});
