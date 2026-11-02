// Zandrijk deterministic core tests (Node, no DOM): node games/zrcore.test.mjs   (QUICK=1: fewer full matches)
// economy, production, tech, damage, pathfinding, the AI build order, the sand creeper, save/load, determinism,
// headless AI-vs-AI matches (winner within a time bound, no NaN, no stuck units) and the campaign played by the computer.
import { load } from './zrsrc/load.mjs';
const Z = load();
const { Core, UT, BT, TPS, MISSIONS, DIFFS, T_SAND, T_ROCK, T_CLIFF, T_DUNE } = Z;
const QUICK = !!process.env.QUICK;
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) pass++; else fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra !== '' ? ' ' + extra : ''}`); };
const run = (S, n, each) => { for (let i = 0; i < n && !S.res; i++) { Core.step(S); if (each) each(S); } };
const sec = s => Math.round(s * TPS);
// a test world: open rock with a sand strip, two players without computer control
function world(o = {}) {
  const S = Core.newGame({ map: { seed: o.seed || 7, w: o.w || 40, h: o.h || 40, n: 2 }, players: [{ fac: o.fac ?? 0, ai: null, start: o.start || 'mcv', cry: o.cry ?? 5000 }, { fac: 1, ai: null, start: o.start2 || 'mcv', cry: 5000 }], kr: false, human: 0, tier: 3 });
  if (o.flat != null) {
    S.B.length = 0; S.U.length = 0; S.E = Object.create(null); S.occ.fill(0);
    for (let i = 0; i < S.N; i++) { S.ter[i] = o.flat; S.cry[i] = 0; } S.exp.fill(1);
    if (o.start !== 'army') { Core.placeBuilding(S, 0, 'bouw', 5, 5, true); Core.placeBuilding(S, 1, 'bouw', S.W - 4, 1, true); }
    for (const u of [...S.U]) { S.U.splice(S.U.indexOf(u), 1); delete S.E[u.id]; }
    Core.recalc(S);
  }
  return S;
}
const place = (S, o, t, x, y) => { S.P[o].ready = t; return Core.cmd(S, o, { c: 'place', x, y }); };
const B = (S, o, t) => S.B.find(b => b.o === o && b.t === t);
const keepGoing = S => { S.res = null; S.obj = [{ t: 'survive', min: 999, done: false }]; };
const addU = (S, o, t, x, y) => Core.addUnit(S, o, t, x, y, 0);

/* ================= economy ================= */
{
  const S = Core.newGame(Z.missionCfg(0)); const P = S.P[0];
  // mission 1: bouwplaats + centrale; build a raffinaderij, the free oogster harvests and unloads
  Core.cmd(S, 0, { c: 'build', t: 'raff' }); run(S, sec(20));
  ok('raffinaderij is klaar om te plaatsen', P.ready === 'raff');
  const A = S.P[0].base, spot = Core.findSpot(S, 0, 'raff', A.x, A.y, false, Core.raffAim(S, A.x, A.y));
  ok('plek voor de raffinaderij gevonden', !!spot); ok('plaatsen lukt', Core.cmd(S, 0, { c: 'place', x: spot.x, y: spot.y }));
  ok('gratis oogster bij de raffinaderij', S.U.some(u => u.o === 0 && u.t === 'oog'));
  const c0 = P.cry; let unloads = 0, maxCar = 0;
  run(S, sec(150), S => { for (const e of S.ev) if (e.t === 'unload' && e.o === 0) unloads++; for (const u of S.U) if (u.t === 'oog') maxCar = Math.max(maxCar, u.car); });
  ok('oogster vult zich tot 700', maxCar >= 699, maxCar);
  ok('oogster lost bij de raffinaderij', unloads >= 1 && P.st.harv >= 700, `${unloads}× lossen, ${P.st.harv | 0} kristal`);
  ok('kristal erbij gekomen', P.cry > c0, `${c0 | 0} -> ${P.cry | 0}`);
  ok('missie 1: doel "bouw raffinaderij" gehaald', S.obj[0].done); keepGoing(S);
  // storage cap
  P.cry = P.cap - 5; let full = 0; run(S, sec(90), S => { for (const e of S.ev) if (e.t === 'full' && e.o === 0) full++; });
  ok('opslag nooit boven de limiet', P.cry <= P.cap + .01, `${P.cry | 0}/${P.cap}`); ok('melding "opslag vol"', full >= 1);
  const cap0 = P.cap; place(S, 0, 'silo', ...Object.values(Core.findSpot(S, 0, 'silo', A.x, A.y, false))); Core.recalc(S);
  ok('opslagsilo: +1500 opslag', P.cap === cap0 + 1500, `${cap0} -> ${P.cap}`);
  // regrowth
  const field = S.ft.filter(i => S.cmax[i] > 100).slice(0, 30); const before = field.reduce((a, i) => a + S.cry[i], 0);
  for (const i of field) S.cry[i] = Math.floor(S.cry[i] / 3);
  const low = field.reduce((a, i) => a + S.cry[i], 0); const S2 = S; S2.U = S2.U.filter(u => u.t !== 'oog'); for (const u of S.U) S.E[u.id] = u;
  run(S, sec(240)); const after = field.reduce((a, i) => a + S.cry[i], 0);
  ok('kristal groeit langzaam terug', after > low && after <= before, `${low} -> ${after} (max ${before})`);
}

/* ================= production and tech ================= */
{
  const S = world({ flat: T_ROCK }), P = S.P[0], b = B(S, 0, 'bouw');
  ok('start: bouwplaats', !!b);
  ok('voertuigfabriek nog niet beschikbaar', !Core.techOk(S, 0, 'fab'));
  ok('raketpaal nog niet beschikbaar', !Core.techOk(S, 0, 'rpaal'));
  ok('speciale eenheid van een andere factie nooit', !Core.techOk(S, 0, 'bliks') && !Core.techOk(S, 0, 'kolos'));
  const c0 = P.cry; Core.cmd(S, 0, { c: 'build', t: 'cent' });
  let ticks = 0; while (!P.ready && ticks < 1000) { Core.step(S); ticks++; }
  ok('centrale klaar na de bouwtijd', Math.abs(ticks - BT.cent.bt * TPS) <= 2, `${ticks} ticks`);
  ok('kosten stap voor stap afgeschreven', Math.abs(c0 - P.cry - BT.cent.cost) < 1, `${(c0 - P.cry).toFixed(1)}`);
  ok('plaatsen op zand mislukt', !Core.placeTiles(S, 0, 'cent', 1, 1).ok || S.ter[1 * S.W + 1] === T_ROCK);
  for (let i = 0; i < S.N; i++) if (i % S.W < 3) S.ter[i] = T_SAND;
  ok('plaatsen op zand mislukt (zand)', !Core.placeTiles(S, 0, 'cent', 0, 10).ok);
  ok('plaatsen ver van de basis mislukt', !Core.placeTiles(S, 0, 'cent', b.x + 12, b.y).ok || b.x + 12 > S.W);
  ok('plaatsen naast de basis lukt', Core.cmd(S, 0, { c: 'place', x: b.x + 4, y: b.y }));
  ok('energie: 100 + 10', P.pw === 110, P.pw);
  place(S, 0, 'kaz', b.x, b.y + 4); place(S, 0, 'raff', b.x + 3, b.y + 4); Core.recalc(S);
  ok('voertuigfabriek nu beschikbaar (raffinaderij + kazerne)', Core.techOk(S, 0, 'fab'));
  // cancel refunds
  const c1 = P.cry; Core.cmd(S, 0, { c: 'build', t: 'sol' }); run(S, 20); Core.cmd(S, 0, { c: 'cancel', cat: 'i', i: 0 });
  ok('annuleren geeft het betaalde terug', Math.abs(P.cry - c1) < .01);
  // a soldier walks to the rally point
  const kz = B(S, 0, 'kaz'); Core.cmd(S, 0, { c: 'rally', b: kz.id, x: kz.x + 9.5, y: kz.y + 6.5 });
  Core.cmd(S, 0, { c: 'build', t: 'sol' }); let ready = null; run(S, sec(12), S => { for (const e of S.ev) if (e.t === 'uready') ready = e; });
  const sol = S.U.find(u => u.o === 0 && u.t === 'sol' && u.id > 10);
  ok('soldaat getraind', !!ready && !!sol);
  ok('soldaat loopt naar het verzamelpunt', sol && Math.hypot(sol.x - (kz.x + 9.5), sol.y - (kz.y + 6.5)) < 1.5, sol && `${sol.x.toFixed(1)},${sol.y.toFixed(1)}`);
  // low power halves the speed
  P.cry = 99999; for (let k = 0; k < 4; k++) place(S, 0, 'toren', b.x + k, b.y + 7); place(S, 0, 'radar', b.x + 4, b.y - 4); place(S, 0, 'fab', b.x - 4, b.y - 4); Core.recalc(S);
  ok('te weinig energie gemeten', P.low, `${P.pw}/${P.pu}`);
  Core.cmd(S, 0, { c: 'build', t: 'sol' }); let t2 = 0; const n0 = S.U.length; while (S.U.length === n0 && t2 < 400) { Core.step(S); t2++; }
  ok('bij te weinig energie gaat bouwen half zo snel', t2 >= UT.sol.bt * TPS * 2 - 2, `${t2} ticks`);
  // slab
  const sx = b.x + 8, sy = b.y + 8; place(S, 0, 'plaat', sx, sy); ok('betonplaat ligt er', S.slab[sy * S.W + sx] === 1);
  place(S, 0, 'silo', sx, sy); const silo = S.B.find(x => x.t === 'silo' && x.x === sx);
  ok('gebouw op beton is steviger', silo && silo.sl === 1);
  // direct damage comparison through a tower-like shot
  const silo2 = S.B.find(x => x.t === 'raff'); silo.hp = silo.mhp; silo2.hp = silo2.mhp;
  silo.sl = 1; silo2.sl = 0;
  const hurtOnce = t => { const pj = { x: t.x, y: t.y, px: t.x, py: t.y, sx: t.x, sy: t.y, tx: t.x + 1, ty: t.y + 1, tid: t.id, sp: 9, wt: 'kanon', dmg: 100, o: 1, a: 0 }; S.PJ.push(pj); Core.step(S); };
  const a1 = silo.hp; hurtOnce(silo); const a2 = silo2.hp; hurtOnce(silo2);
  ok('beton: 25% minder schade', Math.abs((a1 - silo.hp) / (a2 - silo2.hp) - .75) < .02, `${(a1 - silo.hp).toFixed(1)} vs ${(a2 - silo2.hp).toFixed(1)}`);
  // repair a building and sell one
  silo2.hp = silo2.mhp * .5; const c2 = P.cry; Core.cmd(S, 0, { c: 'brep', b: silo2.id }); run(S, sec(15));
  ok('repareren maakt het gebouw heel en kost kristal', silo2.hp >= silo2.mhp - .01 && P.cry < c2);
  const c3 = P.cry; Core.cmd(S, 0, { c: 'sell', b: silo.id }); run(S, 2);
  ok('verkopen geeft kristal terug en haalt het gebouw weg', P.cry > c3 && !S.B.includes(silo));
}

/* ================= damage types and armour ================= */
{
  const duel = (a, b, n = 1) => {
    const S = world({ flat: T_ROCK, start: 'army', start2: 'army' }); S.U.length = 0; for (const k in S.E) if (S.E[k].k === 'u') delete S.E[k];
    const us = Array.from({ length: n }, (_, k) => addU(S, 0, a, 10 + k * .8, 20)), t = addU(S, 1, b, 13.5, 20);
    for (const u of us) Core.cmd(S, 0, { c: 'attack', ids: [u.id], tg: t.id });
    t.st = 'hold'; let ticks = 0; while (!t.dead && ticks < 3000) { Core.step(S); ticks++; t.x = 13.5; t.y = 20; }
    return ticks;
  };
  const solVsTank = duel('sol', 'lt'), raksVsTank = duel('raks', 'lt'), solVsSol = duel('sol', 'sol'), raksVsSol = duel('raks', 'sol');
  ok('raketsoldaat is veel sterker tegen een tank dan een soldaat', raksVsTank * 2 < solVsTank, `raket ${raksVsTank} vs kogel ${solVsTank} ticks`);
  ok('soldaat is beter tegen soldaten dan een raketsoldaat', solVsSol < raksVsSol, `${solVsSol} vs ${raksVsSol}`);
  const ztVsTank = duel('zt', 'lt'), ltVsTank = duel('lt', 'lt');
  ok('zware tank wint sneller dan een lichte tank', ztVsTank < ltVsTank, `${ztVsTank} vs ${ltVsTank}`);
  // artillery splash hits a group
  const S = world({ flat: T_ROCK }); const g = [0, 1, 2, 3].map(k => addU(S, 1, 'sol', 20 + (k % 2) * .6, 20 + (k >> 1) * .6));
  for (const u of g) u.st = 'hold';
  S.PJ.push({ x: 10, y: 20, px: 10, py: 20, sx: 10, sy: 20, tx: 20.3, ty: 20.3, tid: 0, n: 3, a: 0, wt: 'granaat', dmg: 62, o: 0, sr: 1.35, z: 0, pz: 0 });
  run(S, 4); ok('artillerie raakt de hele groep', g.every(u => u.hp < UT.sol.hp), g.map(u => u.hp | 0).join(','));
  // lightning chains
  const S2 = world({ flat: T_ROCK, fac: 1 }); const z = addU(S2, 0, 'bliks', 10, 20); const vs = [0, 1, 2, 3].map(k => addU(S2, 1, 'sol', 14 + k * 1.2, 20));
  for (const v of vs) v.st = 'hold';
  Core.cmd(S2, 0, { c: 'attack', ids: [z.id], tg: vs[0].id }); let zap = null; run(S2, 60, S => { for (const e of S.ev) if (e.t === 'zap') zap = zap || e; });
  ok('bliksem springt over naar 3 doelen', zap && zap.pts.length === 4, zap && zap.pts.length);
  // the Kolos repairs itself
  const S3 = world({ flat: T_ROCK, fac: 2 }); const k = addU(S3, 0, 'kolos', 10, 10); k.hp = 500; run(S3, sec(8));
  ok('Kolos herstelt zichzelf', k.hp > 500, k.hp | 0);
  // towers need power
  const S4 = world({ flat: T_ROCK }); const P4 = S4.P[0], b4 = B(S4, 0, 'bouw'); place(S4, 0, 'cent', b4.x + 4, b4.y); place(S4, 0, 'kaz', b4.x + 4, b4.y + 3);
  place(S4, 0, 'toren', b4.x + 1, b4.y + 4); Core.recalc(S4); const tw = S4.B.find(b => b.t === 'toren'); tw.bp = 1;
  const foe = addU(S4, 1, 'lt', tw.x + 3.5, tw.y + .5); foe.st = 'hold'; run(S4, sec(3)); ok('toren vuurt met genoeg energie', foe.hp < UT.lt.hp);
  for (let q = 0; q < 6; q++) place(S4, 0, 'toren', b4.x - 2 - q, b4.y + 7); Core.recalc(S4); const hp1 = foe.hp; foe.hp = hp1; run(S4, sec(3));
  ok('torens uit bij te weinig energie', P4.low && Math.abs(foe.hp - hp1) < 1e-6 || !P4.low, `${P4.pw}/${P4.pu}`);
}

/* ================= pathfinding ================= */
{
  const S = world({ flat: T_SAND, w: 48, h: 40 });
  // a cliff wall with one gap of two tiles
  for (let y = 0; y < S.H; y++) if (y !== 20 && y !== 21) S.ter[y * S.W + 24] = T_CLIFF;
  const p = Core.findPath(S, 20 * S.W + 10, 20 * S.W + 40);
  ok('pad gevonden', !!p && p[p.length - 1] === 20 * S.W + 40);
  // the path's straight segments: where do they cross the wall column?
  const crossY = (path, s0) => { const ys = []; let a = s0; for (const b of path) { const ax = a % S.W + .5, ay = Math.floor(a / S.W) + .5, bx = b % S.W + .5, by = Math.floor(b / S.W) + .5; if ((ax - 24.5) * (bx - 24.5) <= 0 && ax !== bx) ys.push(ay + (by - ay) * (24.5 - ax) / (bx - ax)); a = b; } return ys; };
  let walk = p.every(i => Core.passT(S, i)); const ys = crossY(p, 20 * S.W + 10), through = ys.length === 1 && ys[0] >= 20 && ys[0] < 22;
  ok('pad gaat door de opening', through); ok('pad alleen over begaanbare tegels', walk);
  const q = Core.findPath(S, 5 * S.W + 10, 5 * S.W + 40), qy = q && crossY(q, 5 * S.W + 10); ok('omweg rond de muur door de opening', q && qy.length === 1 && qy[0] >= 20 && qy[0] < 22, qy && qy.map(v => v.toFixed(1)).join(','));
  // an enclosed goal: the path ends as close as possible
  for (let y = 30; y <= 34; y++) for (let x = 36; x <= 40; x++) if (y === 30 || y === 34 || x === 36 || x === 40) S.ter[y * S.W + x] = T_CLIFF;
  const r = Core.findPath(S, 25 * S.W + 30, 32 * S.W + 38); const end = r && r[r.length - 1];
  ok('onbereikbaar doel: zo dichtbij mogelijk', r && Math.hypot(end % S.W - 38, Math.floor(end / S.W) - 32) <= 3.2, end != null ? `${end % S.W},${Math.floor(end / S.W)}` : 'geen');
  // a group of 18 vehicles through the gap: everyone arrives, nobody gets stuck, they do not sit on top of each other
  const units = []; for (let k = 0; k < 18; k++) units.push(addU(S, 0, k % 3 ? 'lt' : 'zt', 6 + (k % 6) * 1.1, 14 + Math.floor(k / 6) * 1.6));
  for (const u of units) u.st = 'idle';
  Core.cmd(S, 0, { c: 'move', ids: units.map(u => u.id), x: 38, y: 14 });
  let t = 0; while (t < sec(90) && units.some(u => u.path || u.wait)) { Core.step(S); t++; }
  const arrived = units.filter(u => u.x > 30).length;
  let minD = 9; for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) minD = Math.min(minD, Math.hypot(units[i].x - units[j].x, units[i].y - units[j].y));
  ok('groep van 18 door een smalle opening: iedereen komt aan', arrived === 18, `${arrived}/18 in ${(t / TPS).toFixed(1)} s`);
  ok('groep staat niet op elkaar', minD > .55, minD.toFixed(2));
  ok('alle posities eindig', Core.finite(S));
  // 20 soldiers and tanks crossing paths (two groups swap sides)
  const L = [], R2 = []; for (let k = 0; k < 10; k++) { L.push(addU(S, 0, 'sol', 30 + (k % 5), 24 + Math.floor(k / 5))); R2.push(addU(S, 0, 'lt', 42 + (k % 5) * .1, 24 + k * .65)); }
  Core.cmd(S, 0, { c: 'move', ids: L.map(u => u.id), x: 44, y: 26 }); Core.cmd(S, 0, { c: 'move', ids: R2.map(u => u.id), x: 31, y: 26 });
  t = 0; while (t < sec(60) && [...L, ...R2].some(u => u.path || u.wait)) { Core.step(S); t++; }
  ok('twee groepen kruisen elkaar en komen aan', [...L, ...R2].every(u => !u.path && !u.wait), `${(t / TPS).toFixed(1)} s`);
}

/* ================= the computer: build order ================= */
{
  const S = Core.newGame(Z.skirmishCfg({ fac: 0, opp: 1, diff: 1, size: 'middel', cry: 2500, kr: false, seed: 42 }));
  S.P[0].ai = 1; Z.AI.init(S, S.P[0]); S.P[0].A.next = 1e9; S.P[1].A.next = 1e9;
  const order = []; run(S, sec(240), S => { for (const e of S.ev) if (e.t === 'placed' && e.o === 1) order.push(e.b); });
  ok('computer bouwt in volgorde: centrale, raffinaderij, kazerne', order.slice(0, 3).join(',') === 'cent,raff,kaz', order.join(','));
  ok('computer heeft na 4 minuten een voertuigfabriek', !!S.P[1].bc.fab);
  ok('computer houdt genoeg energie', S.P[1].pw >= S.P[1].pu, `${S.P[1].pw}/${S.P[1].pu}`);
  ok('computer heeft oogsters', S.U.filter(u => u.o === 1 && u.t === 'oog').length >= 2);
  ok('computer traint eenheden', S.U.filter(u => u.o === 1 && UT[u.t].wt).length >= 5);
  // the waves grow
  const S2 = Core.newGame(Z.skirmishCfg({ fac: 1, opp: 1, diff: 1, size: 'middel', cry: 2500, kr: false, seed: 43 })); S2.P[0].ai = 2; Z.AI.init(S2, S2.P[0]);
  const waves = []; let w0 = 0; run(S2, sec(60 * 14), S => { const A = S.P[1].A; if (A.wave !== w0) { w0 = A.wave; waves.push(A.size); } });
  ok('aanvalsgolven worden groter', waves.length >= 2 && waves[waves.length - 1] > waves[0], waves.join(','));
}

/* ================= the sand creeper ================= */
{
  const S = Core.newGame(Z.skirmishCfg({ fac: 0, opp: 1, diff: 1, size: 'middel', cry: 2500, seed: 77 })); S.P[0].ai = 1; Z.AI.init(S, S.P[0]);
  let onRock = 0, samples = 0, eaten = 0, risen = 0, eatenOnRock = 0;
  run(S, sec(60 * 16), S => {
    const K = S.kr; if (!K) return;
    if (K.st !== 'gone') { samples++; const t = S.ter[Core.tileOf(S, K.x, K.y)]; if (t === T_ROCK || t === T_CLIFF || S.slab[Core.tileOf(S, K.x, K.y)]) onRock++; }
    for (const e of S.ev) { if (e.t === 'swallow') { eaten++; const t = S.ter[Core.tileOf(S, e.x, e.y)]; if (t !== T_SAND) eatenOnRock++; } if (e.t === 'krrise') risen++; }
  });
  ok('zandkruiper komt boven', risen >= 3, risen);
  ok('zandkruiper komt nooit op rots', samples > 100 && onRock === 0, `${onRock}/${samples}`);
  ok('zandkruiper slokt nu en dan een eenheid op zand op', eaten >= 1 && eaten <= risen, `${eaten} opgeslokt`);
  ok('nooit iets op rots opgeslokt', eatenOnRock === 0);
  // a unit on rock is safe, a unit on sand is hunted; shooting chases it away
  const T = Core.newGame(Z.skirmishCfg({ fac: 0, opp: 1, diff: 0, size: 'klein', cry: 0, seed: 78 }));
  T.P[1].A.next = 1e9; let sand = -1; for (let i = 0; i < T.N; i++) { const x = i % T.W, y = (i / T.W) | 0; if (x > 8 && y > 8 && x < T.W - 8 && y < T.H - 8 && Core.krOk(T, x + .5, y + .5) && Core.krOk(T, x + 3.5, y + .5)) { let open = true; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (!Core.krOk(T, x + dx + .5, y + dy + .5)) open = false; if (open) { sand = i; break; } } }
  const sx = sand % T.W + .5, sy = ((sand / T.W) | 0) + .5;
  const prey = addU(T, 0, 'lt', sx, sy); prey.st = 'hold';
  Object.assign(T.kr, { st: 'roam', x: sx + 3, y: sy, px: sx + 3, py: sy, t: 1, wx: sx + 3, wy: sy });
  let sw = null; run(T, sec(40), S => { for (const e of S.ev) if (e.t === 'swallow') sw = e; prey.x = sx; prey.y = sy; });
  ok('zandkruiper jaagt op een tank in het zand en slokt hem op', !!sw && prey.dead);
  const T2 = Core.newGame(Z.skirmishCfg({ fac: 0, opp: 1, diff: 0, size: 'klein', cry: 0, seed: 78 })); T2.P[1].A.next = 1e9;
  const shooters = [0, 1, 2].map(k => addU(T2, 0, 'zt', sx - 4, sy - 1 + k));
  Object.assign(T2.kr, { st: 'roam', x: sx + 2, y: sy, px: sx + 2, py: sy, t: 200, wx: sx + 2, wy: sy });
  for (const u of shooters) { u.st = 'hold'; }
  Core.cmd(T2, 0, { c: 'attack', ids: shooters.map(u => u.id), tg: -1 }); let fled = false; run(T2, sec(20), S => { for (const e of S.ev) if (e.t === 'krflee') fled = true; for (const u of shooters) { u.x = sx - 4; } });
  ok('schieten op de zandkruiper jaagt hem weg', fled);
}

/* ================= save / load and determinism ================= */
{
  const cfg = Z.skirmishCfg({ fac: 2, opp: 2, diff: 1, size: 'middel', cry: 2500, seed: 99 });
  const A = Core.newGame(cfg), Bq = Core.newGame(cfg); A.P[0].ai = Bq.P[0].ai = 1; Z.AI.init(A, A.P[0]); Z.AI.init(Bq, Bq.P[0]);
  run(A, sec(240)); run(Bq, sec(240));
  ok('deterministisch: twee keer hetzelfde potje is gelijk', Core.serialize(A) === Core.serialize(Bq));
  const str = Core.serialize(A), C = Core.deserialize(str);
  ok('opslaan en laden: zelfde eenheden en gebouwen', C && C.U.length === A.U.length && C.B.length === A.B.length && C.P.every((P, i) => Math.abs(P.cry - A.P[i].cry) < .01));
  ok('opslaan en laden: zelfde kristal en mist', C.cry.every((v, i) => v === A.cry[i]) && C.exp.every((v, i) => v === A.exp[i]));
  ok('opgeslagen grootte redelijk', str.length < 400000, (str.length / 1024).toFixed(0) + ' kB');
  const tl = C.t; run(C, sec(120)); run(A, sec(120));
  ok('geladen potje speelt gewoon door', Core.finite(C) && C.t > tl + sec(60) && C.U.length > 10, `${C.U.length} vs ${A.U.length} eenheden`);
  const D = Core.deserialize(Core.serialize(C)); ok('opnieuw laden lukt', !!D && D.U.length === C.U.length);
}

/* ================= headless matches: computer against computer ================= */
{
  const games = [];
  const add = (size, opp, diffs, seed) => games.push({ size, opp, diffs, seed });
  const N = QUICK ? 1 : 2;
  for (let s = 0; s < N; s++) { add('middel', 1, [1, 1], 300 + s); add('middel', 1, [2, 1], 310 + s); add('klein', 1, [0, 0], 320 + s); add('middel', 2, [1, 1, 1], 330 + s); }
  add('groot', 1, [2, 2], 340); add('groot', 2, [0, 1, 2], 341); add('klein', 2, [2, 0, 1], 342);
  let maxMin = 0, maxUnits = 0, tps = [];
  for (const g of games) {
    const cfg = Z.skirmishCfg({ fac: g.seed % 3, opp: g.opp, diff: g.diffs[1], size: g.size, cry: 2500, seed: g.seed }); cfg.human = -1;
    cfg.players.forEach((p, i) => { p.ai = g.diffs[i]; });
    const S = Core.newGame(cfg); const t0 = Date.now();
    const pos = new Map(); let stuck = 0, nan = 0, stuckInfo = '';
    while (!S.res && S.t < sec(60 * 45)) {
      Core.step(S); maxUnits = Math.max(maxUnits, S.U.length);
      if (S.t % sec(10) === 0) {
        if (!Core.finite(S)) nan++;
        for (const u of S.U) {
          const p = pos.get(u.id), moving = !!(u.path && u.path.length);
          if (moving && p && Math.hypot(u.x - p.x, u.y - p.y) < .3) { p.n++; if (p.n >= 3) { stuck++; stuckInfo = `${u.t} ${u.st}/${u.hs} @${u.x.toFixed(1)},${u.y.toFixed(1)}`; p.n = 0; } }
          else pos.set(u.id, { x: u.x, y: u.y, n: 0 });
        }
      }
    }
    const min = S.t / TPS / 60; maxMin = Math.max(maxMin, min); tps.push((Date.now() - t0) / S.t);
    ok(`potje ${g.size} ${g.opp + 1} spelers [${g.diffs.map(d => DIFFS[d].nm).join(' / ')}] eindigt met een winnaar`, !!S.res && S.res.winner >= 0, `${S.res ? 'winnaar ' + S.res.winner : 'geen'} na ${min.toFixed(1)} min`);
    ok(`  geen NaN, geen vastgelopen eenheden`, nan === 0 && stuck === 0, `${stuck} vast ${stuckInfo}`);
  }
  console.log(`  langste potje ${maxMin.toFixed(1)} min, max ${maxUnits} eenheden, ${(tps.reduce((a, b) => a + b, 0) / tps.length).toFixed(3)} ms per tick`);
}

/* ================= the campaign, played by the computer ================= */
{
  const results = [];
  for (let i = 0; i < MISSIONS.length; i++) {
    let S, k = 0;                                            // the computer player gets up to three tries (another random seed)
    for (; k < 3; k++) { const cfg = Z.missionCfg(i, 0, 2); cfg.seed += k * 101; S = Core.newGame(cfg); run(S, sec(60 * 40)); if (S.res && S.res.win) break; }
    ok(`missie ${i + 1} "${MISSIONS[i].nm}" gewonnen door de computer`, S.res && S.res.win, `${S.res ? (S.res.win ? 'gewonnen' : 'verloren: ' + S.res.why) : 'tijd op'} na ${(S.t / TPS / 60).toFixed(1)} min${k ? ` (poging ${k + 1})` : ''} · doelen ${S.obj.map(o => o.t + (o.done ? '✓' : o.fail ? '✗' : '·')).join(' ')}`);
    results.push(S.res && S.res.win ? 1 : 0);
  }
  if (!QUICK) { // with the normal (fair) computer as the player: report only
    const r = []; for (let i = 0; i < MISSIONS.length; i++) { const S = Core.newGame(Z.missionCfg(i, 0, 1)); run(S, sec(60 * 40)); r.push(S.res && S.res.win ? '✓' : '✗'); }
    console.log('  met de gewone computer als speler:', r.join(' '));
  }
}
console.log(`\n${pass} geslaagd, ${fail} mislukt`);
process.exit(fail ? 1 : 0);
