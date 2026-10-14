const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../tools/lib/persistence.js");
globalThis.ReneRiskEngine = require("../games/rksrc/core.js");
class Storage {
  constructor(data = {}) {
    this.data = { ...data };
    this.fail = null;
  }
  get length() {
    return Object.keys(this.data).length;
  }
  key(i) {
    return Object.keys(this.data)[i];
  }
  getItem(k) {
    return this.data[k] ?? null;
  }
  setItem(k, v) {
    if (this.fail?.(k, v)) throw new Error("QuotaExceededError");
    this.data[k] = String(v);
  }
  removeItem(k) {
    delete this.data[k];
  }
}
const backup = (data) =>
  JSON.stringify({
    format: "renes-spelletjes-backup",
    version: "1.53",
    date: "2026-10-13T12:00:00Z",
    data,
  });
test("null, empty, future and malformed backups are rejected before touching storage", () => {
  for (const raw of [
    "null",
    "{}",
    "bad JSON",
    backup(null),
    backup([]),
    backup({}),
    backup({ "app.cfg": "not JSON" }),
    backup({ unrelated: "{}" }),
    backup({ "app.cfg": '{"order":null}' }),
  ])
    assert.throws(() => P.validateBackup(raw, "1.54"));
  const future = JSON.parse(backup({ "app.cfg": "{}" }));
  future.version = "1.55";
  assert.throws(
    () => P.validateBackup(JSON.stringify(future), "1.54"),
    /nieuwere/,
  );
  future.version = "1.53";
  future.schemaVersion = 9;
  assert.throws(
    () => P.validateBackup(JSON.stringify(future), "1.54"),
    /versie/,
  );
});
test("old backups retain profile-specific data and reject invalid active profiles and prototype keys", () => {
  const data = {
    "app.cfg": "{}",
    "app.profile": '"pabc"',
    "app.profiles": '[{"id":"pabc","name":"Rene","avatar":"🦊"}]',
    "p_pabc.sd.stats": '{"won":2}',
  };
  assert.deepEqual(P.validateBackup(backup(data), "1.54").data, data);
  assert.throws(
    () =>
      P.validateBackup(
        backup({ ...data, "app.profile": '"pmissing"' }),
        "1.54",
      ),
    /actieve/,
  );
  assert.throws(
    () =>
      P.validateBackup(
        backup({ "app.cfg": '{"__proto__":{"bad":true}}' }),
        "1.54",
      ),
    /ongeldig/,
  );
});
test("backup export includes app data and excludes unrelated origin storage", () => {
  const s = new Storage({
    "app.cfg": "{}",
    "sd.stats": '{"won":2}',
    unrelated: "keep",
  });
  const data = JSON.parse(P.createBackup(s, "1.54"));
  assert.equal(data.schemaVersion, 1);
  assert.deepEqual(data.data, { "app.cfg": "{}", "sd.stats": '{"won":2}' });
  P.validateBackup(JSON.stringify(data), "1.54");
});
test("failed writes warn, remain visible across other writes, and recover when the key is saved", () => {
  const s = new Storage();
  let warnings = 0,
    recovered = 0;
  s.fail = (k) => k === "sd.stats";
  const store = P.createStore(
    s,
    () => warnings++,
    () => recovered++,
  );
  assert.equal(store.set("sd.stats", { won: 1 }), false);
  assert.equal(warnings, 1);
  assert.equal(recovered, 0);
  store.set("app.cfg", {});
  assert.equal(recovered, 0);
  s.fail = null;
  assert.equal(store.set("sd.stats", { won: 1 }), true);
  assert.equal(recovered, 1);
});
test("profile storage preserves global preferences and separates game saves", () => {
  const s = new Storage({ "app.profile": '"pabc"' }),
    store = P.createStore(s);
  store.set("rk.stats", { won: 1 });
  store.set("app.cfg", { motion: "reduce" });
  assert.equal(s.getItem("p_pabc.rk.stats"), '{"won":1}');
  assert.equal(s.getItem("app.cfg"), '{"motion":"reduce"}');
});
test("restore replaces only app data and preserves unrelated origin entries", () => {
  const s = new Storage({
    "app.cfg": '{"theme":"donker"}',
    "sd.stats": '{"won":1}',
    unrelated: "keep",
  });
  P.restore(s, { "app.cfg": '{"theme":"licht"}' });
  assert.equal(s.getItem("sd.stats"), null);
  assert.equal(s.getItem("unrelated"), "keep");
  assert.equal(s.getItem("app.cfg"), '{"theme":"licht"}');
});
test("partial restore failure rolls back changed values without clearing the whole origin", () => {
  const initial = {
      "app.cfg": '{"theme":"donker"}',
      "sd.stats": '{"won":1}',
      unrelated: "keep",
    },
    s = new Storage(initial);
  s.fail = (k, v) => k === "sd.stats" && v === '{"won":2}';
  assert.throws(
    () =>
      P.restore(s, { "app.cfg": '{"theme":"licht"}', "sd.stats": '{"won":2}' }),
    (e) => e.rolledBack === true,
  );
  assert.deepEqual(s.data, initial);
});
test("Wereldmacht backups validate the complete saved game", () => {
  const e = globalThis.ReneRiskEngine,
    s = e.newGame(
      [
        { name: "Rene", ai: false },
        { name: "Computer", ai: true },
      ],
      12,
    );
  const data = { "rk.save": JSON.stringify(s) };
  P.validateBackup(backup(data), "1.54");
  s.territories[0].owner = 100;
  assert.throws(
    () => P.validateBackup(backup({ "rk.save": JSON.stringify(s) }), "1.54"),
    /rk.save/,
  );
});
test("existing game saves are accepted, and invalid board shapes are rejected", () => {
  const saves = require("./fixtures/legacy-saves.json");
  const data = Object.fromEntries(
    Object.entries(saves).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  P.validateBackup(backup(data), "1.54");
  for (const name of Object.keys(saves))
    assert.throws(() =>
      P.validateBackup(backup({ [name]: '{"bad":true}' }), "1.54"),
    );
  const sudoku = structuredClone(saves["sd.save"]);
  sudoku.puz = [1];
  assert.throws(() =>
    P.validateBackup(backup({ "sd.save": JSON.stringify(sudoku) }), "1.54"),
  );
});
test("new Worldquiz saves and Vuistduel profile data remain compatible", () => {
  const fixture = require("./fixtures/new-games.json");
  const data = Object.fromEntries(Object.entries(fixture).map(([key, value]) => [key, JSON.stringify(value)]));
  data["p_pabc.vd.run"] = '{"fighter":"vos","round":2}';
  P.validateBackup(backup(data), "1.58");
  assert.throws(() => P.validateBackup(backup({ "wq.save": '{"bad":true}' }), "1.58"));
});
test("shared colorblind settings preserve each profile’s other preferences", () => {
  const s = new Storage({
      "app.profiles": '[{"id":"p0"},{"id":"pabc"}]',
      "p_pabc.bs.settings": '{"aim":false,"cb":false}',
    }),
    store = P.createStore(s);
  store.setColorblind(true);
  assert.deepEqual(JSON.parse(s.getItem("p_pabc.bs.settings")), {
    aim: false,
    cb: true,
  });
  assert.equal(JSON.parse(s.getItem("ls.settings")).cb, true);
  store.set("app.cfg", { colorblind: true });
  s.setItem("app.profile", '"pnew"');
  assert.equal(P.createStore(s).get("bs.settings", {}).cb, true);
});
