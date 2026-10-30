// Dakrenner: deterministic core tests in Node (no browser).   node games/drcore.test.mjs
// Movement, coyote time and the jump buffer, slide, vault, wall run / wall jump, ledge grab, flips and landing angles
// (perfect / ok / crash), checkpoints and respawn, hazards, crumbling tiles, springs, cables, bars, platforms, determinism.
import { load } from './drsrc/load.mjs';
const { Core, KB, ST, buildLevel, LEVELS, genEndless, DSL } = load();
const { R, G, U, D, box, low, blk, coin, cp, fin, spring, spikes, crum, saw, laser, crate, bar, zip, plat, vent, belt } = DSL;
let pass = 0, fail = 0;
const ok = (name, c, extra = '') => { if (c) pass++; else fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const mk = p => buildLevel({ n: 't', w: 0, p }, 0);
function sim(L, script, o = {}) {           // script: [[bits, frames], ...]; returns state + all events
  const S = Core.newState(L, o), evs = []; let f = 0;
  for (const [bits, n] of script) for (let k = 0; k < n; k++) { Core.step(L, S, bits); f++; for (const e of S.ev) evs.push({ f, t: e.t, a: e.a }); }
  S.evs = evs; S.has = t => evs.some(e => e.t === t); S.first = t => (evs.find(e => e.t === t) || {}).f; return S;
}
const flat = mk([R(60, 6)]);

/* ---------- running ---------- */
{ const S = sim(flat, [[KB.R, 60]]); ok('rennen: versnelt naar topsnelheid', Math.abs(S.gs - Core.C.RUN_MAX) < .01 && S.x > 10, `gs ${S.gs.toFixed(2)} x ${S.x.toFixed(1)}`); }
{ const S = sim(flat, [[KB.R, 60], [0, 30]]); ok('loslaten: remt af tot stilstand', S.gs === 0 && S.st === ST.RUN); }
{ const S = sim(flat, [[KB.R, 60], [KB.L, 40]]); ok('omkeren: andere kant op', S.gs < 0 && S.face === -1); }
/* ---------- jumping: height, variable height, coyote, buffer ---------- */
{ const S = Core.newState(flat); let top = S.y; Core.step(flat, S, KB.J); for (let i = 0; i < 60; i++) { Core.step(flat, S, KB.J); top = Math.min(top, S.y); } const h = S.y - top;
  const T = Core.newState(flat); let top2 = T.y; Core.step(flat, T, KB.J); for (let i = 0; i < 60; i++) { Core.step(flat, T, i < 4 ? KB.J : 0); top2 = Math.min(top2, T.y); }
  ok('sprong: ~2,2 hoog bij vasthouden, lager bij kort tikken', h > 2 && h < 2.5 && T.y - top2 < h * .7, `${h.toFixed(2)} / ${(T.y - top2).toFixed(2)}`); }
{ const L = mk([R(10, 6), G(8), R(20, 6)]);   // run off the edge, press jump 4 frames late: coyote time still jumps
  const S = Core.newState(L); let off = -1;
  for (let i = 0; i < 200 && off < 0; i++) { Core.step(L, S, KB.R); if (S.st === ST.AIR) off = i; }
  for (let i = 0; i < 4; i++) Core.step(L, S, KB.R); const vy0 = S.vy; Core.step(L, S, KB.R | KB.J);
  ok('coyote time: springen vlak na de rand werkt nog', S.vy < -10 && vy0 >= 0, `vy ${S.vy.toFixed(1)}`); }
{ const S = Core.newState(flat); Core.step(flat, S, KB.J); let n = 0;
  while (!(S.st === ST.AIR && S.vy > 0 && flat.start.y - S.y < .45) && n++ < 120) Core.step(flat, S, 0);
  const before = S.st === ST.AIR; let again = false, landed = false;
  for (let i = 0; i < 12; i++) { Core.step(flat, S, KB.J); if (S.ev.some(e => e.t === 'land')) landed = true; if (S.ev.some(e => e.t === 'jump')) again = true; }
  ok('sprongbuffer: vlak voor de landing drukken = meteen weer springen', before && landed && again); }
{ const L = mk([R(10, 6), G(9), R(20, 6)]); const S = sim(L, [[KB.R, 200]]); ok('in een gat vallen = terug naar de start', S.has('fall') && S.has('respawn') && S.x < 12); }
/* ---------- slide, vault ---------- */
{ const L = mk([R(40, 6, low(14, 4))]);
  const S = sim(L, [[KB.R, 40], [KB.R | KB.S, 60], [KB.R, 70]]);
  const T = sim(L, [[KB.R, 100]]);
  ok('glijden onder een buis door (en een trucje)', S.x > 22 && S.evs.some(e => e.t === 'trick' && /Eronder/.test(e.a.name)) && S.st === ST.RUN, `x ${S.x.toFixed(1)}`);
  ok('zonder glijden: tegen de buis aan', T.x < 16.5, `x ${T.x.toFixed(1)}`); }
{ const L = mk([R(40, 6, low(8, 3))]); const S = sim(L, [[KB.R, 30], [KB.R | KB.S, 25], [KB.R, 2]]); ok('glijden: blijft laag onder de buis, staat pas op als er ruimte is', S.st === ST.SLIDE && S.h < 1); }
{ const L = mk([R(40, 6, box(14))]); const S = sim(L, [[KB.R, 110]]); ok('vault: met vaart over een laag blok', S.has('vault') && S.x > 17, `x ${S.x.toFixed(1)}`);
  const T = sim(L, [[KB.R, 8], [0, 20], [KB.R, 2], [0, 6]]); const s = Core.newState(L); s.x = 15.25; s.gs = 0; for (let i = 0; i < 60; i++) Core.step(L, s, KB.R);
  ok('langzaam tegen het blok: geen vault', !s.ev.some(e => e.t === 'vault') && s.x < 16, `x ${s.x.toFixed(2)}`); }
/* ---------- wall run, ledge grab, wall jump ---------- */
{ const L = mk([R(14, 6), R(20, 12)]); const S = sim(L, [[KB.R, 62], [KB.R | KB.J, 25], [KB.R, 70]]);
  ok('muurloop + rand grijpen + klimmen naar een 6 hoge muur', S.has('wallrun') && S.has('grab') && S.has('climb') && Math.abs(S.y - (L.H - 12)) < .01, `y ${S.y}`); }
{ const L = mk([R(14, 6), R(20, 10)]); const S = sim(L, [[KB.R, 62], [KB.R | KB.J, 25], [KB.R, 60]]); ok('rand grijpen bij een 4 hoge muur', S.has('grab') && S.y === L.H - 10); }
{ const L = mk([R(14, 6), R(20, 18)]);                     // too high: run up, slide down, jump off the wall
  const S = Core.newState(L); for (let i = 0; i < 62; i++) Core.step(L, S, KB.R); for (let i = 0; i < 40 && S.st !== ST.WALL; i++) Core.step(L, S, KB.R | KB.J);
  const onWall = S.st === ST.WALL; for (let i = 0; i < 12; i++) Core.step(L, S, KB.R); Core.step(L, S, KB.L); Core.step(L, S, KB.L | KB.J);
  ok('muursprong: afzetten van de muur, weg van de muur', onWall && S.st === ST.AIR && S.vx < -5 && S.vy < -8 && S.face === -1, `vx ${S.vx.toFixed(1)} vy ${S.vy.toFixed(1)}`); }
{ const L = mk([R(16, 6, blk(12, 3, 1, 10, 1)), R(10, 14)]);   // chimney: up by alternating wall jumps
  const S = Core.newState(L); let dir = KB.R, wj = 0;            // a little controller: hold towards a wall, jump away from it when on it
  for (let i = 0; i < 600 && S.y > L.H - 14 + .01; i++) {
    let b = dir;
    if ((S.st === ST.RUN && S.x > 16.4) || (S.st === ST.AIR && S.vy < 0)) b |= KB.J;
    if (S.st === ST.WALL && S.stT > 2) { dir = S.wallS > 0 ? KB.L : KB.R; b = dir | KB.J; wj++; }
    Core.step(L, S, b);
  }
  for (let i = 0; i < 60; i++) Core.step(L, S, KB.R);
  ok('schoorsteen: met muursprongen omhoog', S.y <= L.H - 14 + .01 && wj >= 2, `y ${S.y.toFixed(2)} (top ${L.H - 14}), ${wj} muursprongen`); }
/* ---------- flips and landings ---------- */
const flipRun = (bits, n, extra = 30) => sim(flat, [[KB.R, 40], [KB.R | KB.J | bits, n], [KB.R | KB.J, 8], [KB.R, extra]]);
{ const S = flipRun(KB.CW, 28); const e = S.evs.find(e => e.t === 'flipland'); ok('salto voorover: geland, telt als salto', e && e.a.flips === 1 && !S.has('crash')); }
{ const S = flipRun(KB.CCW, 28); const t = S.evs.find(e => e.t === 'trick'); ok('salto achterover: naam "Achterwaartse salto"', t && /Achterwaartse/.test(t.a.name)); }
{ const S = flipRun(KB.CW, 28); const e = S.evs.find(e => e.t === 'flipland'); const g = S.evs.find(e => e.t === 'land'); ok('perfecte landing geeft vaart', e && e.a.perfect && S.perfects === 1 && S.gs > Core.C.RUN_MAX - .5); }
{ const S = flipRun(KB.CW, 16); ok('halve salto: op je hoofd = crash', S.has('crash') && (S.evs.find(e => e.t === 'crash').a.why === 'land')); }
{ const S = flipRun(KB.CW, 16, 120); ok('na een crash: terug bij de start (of vlag), weer staand', S.has('respawn') && S.st === ST.RUN && S.rot === 0); }
{ const L = mk([R(14, 16), G(2), R(30, 4)]); const S = Core.newState(L), evs = []; let t0 = -1;
  for (let i = 0; i < 260; i++) { if (t0 < 0 && S.x > 15.2) t0 = i; const b = t0 < 0 ? KB.R : i - t0 < 55 ? KB.R | KB.J | KB.CW : KB.R; Core.step(L, S, b); for (const e of S.ev) evs.push({ t: e.t, a: e.a }); }
  S.evs = evs;
  const e = S.evs.find(e => e.t === 'flipland'); ok('dubbele salto van een hoog dak', e && e.a.flips === 2, JSON.stringify(e && e.a)); }
{ const S = flipRun(KB.CW, 24); const e = S.evs.find(e => e.t === 'land'); ok('bijna rond: de lichaamshoek zakt vanzelf terug (assist)', !S.has('crash')); }
/* ---------- checkpoints, hazards ---------- */
{ const L = mk([R(20, 6, cp(4), spikes(12, 2)), R(20, 6)]); const S = sim(L, [[KB.R, 90], [0, 100]]);
  ok('vlag gepakt, dan stekels: crash en terug bij de vlag', S.cp === 1 && S.has('crash') && Math.abs(S.x - L.cps[0].x) < 1.5, `x ${S.x.toFixed(2)} cp ${S.cp}`); }
{ const L = mk([R(40, 6, saw(14, .7, .7))]); const S = sim(L, [[KB.R, 100]]); ok('zaagblad: crash', S.evs.some(e => e.t === 'crash' && e.a.why === 'saw')); }
{ const L = mk([R(40, 6, laser(14, 4, 120, 1))]); const S = sim(L, [[KB.R, 100]]); ok('laser aan: crash', S.evs.some(e => e.t === 'crash' && e.a.why === 'laser')); }
{ const L = mk([R(40, 6, laser(14, 4, 1000, .001))]); const S = sim(L, [[KB.R, 100]]); ok('laser uit: gewoon erdoor', !S.has('crash') && S.x > 16); }
{ const L = mk([R(40, 6, crate(16))]); const T = sim(L, [[KB.R, 120]]); const S = Core.newState(L); S.x = L.crates[0].x; for (let i = 0; i < 60; i++) Core.step(L, S, 0);
  ok('vallende kist: doorrennen = erlangs, eronder blijven staan = bonk', !T.has('crash') && T.has('crate') && S.crashes === 1, `${T.has('crash')} ${S.crashes}`); }
{ const L = mk([R(10, 6), G(8, crum(0, 8)), R(20, 6)]); const S = sim(L, [[KB.R, 150]]); const T = sim(L, [[KB.R, 58], [0, 90]]);
  ok('brokkelpannen: overrennen lukt, blijven staan = vallen', S.x > 22 && !S.has('fall') && T.has('crack') && T.has('fall')); }
{ const L = mk([R(30, 6, spring(10))]); const S = sim(L, [[KB.R, 70]]); ok('springveer: hoog de lucht in', S.has('spring')); }
{ const L = mk([R(10, 6), G(14, zip(-2, 4, 12, 1)), R(10, 4)]); const S = sim(L, [[KB.R, 45], [KB.R | KB.J, 15], [KB.R, 100]]); ok('kabelbaan: vastpakken, glijden, loslaten', S.has('zip') && S.evs.some(e => e.t === 'trick' && /Kabel/.test(e.a.name)) && S.x > 24); }
{ const L = mk([R(14, 6), G(7, bar(3, 3.3)), R(10, 6)]); const S = Core.newState(L); let got = false, rel = false;
  for (let i = 0; i < 300; i++) { const b = S.st === ST.BAR ? (S.th > .35 && S.om > 0 ? KB.R | KB.J : KB.R) : (!got && S.x > 14.6 && S.x < 16.5 ? KB.R | KB.J : KB.R); Core.step(L, S, b); if (S.st === ST.BAR) got = true; if (S.ev.some(e => e.t === 'barjump')) rel = true; }
  ok('rekstok: grijpen, zwaaien en wegspringen', got && rel && S.x > 23 && !S.crashes, `x ${S.x.toFixed(1)} crashes ${S.crashes}`); }
{ const L = mk([R(10, 6), G(10, plat(1, 0, 4, 0, 0, 240, 0)), R(10, 6)]); const S = sim(L, [[KB.R, 30], [KB.R | KB.J, 10], [KB.R, 6], [0, 60]]); ok('platform: erop landen', S.ride === 0 && S.st === ST.RUN); }
{ const L = mk([R(10, 6), G(10, plat(1, 0, 4, 5, 0, 240, 0)), R(10, 6)]); const S = Core.newState(L); S.x = 13.5; S.y = L.plats[0].y - .01; S.st = ST.AIR; S.vy = 1;
  for (let i = 0; i < 3; i++) Core.step(L, S, 0); const x0 = S.x; for (let i = 0; i < 30; i++) Core.step(L, S, 0); ok('bewegend platform neemt je mee', S.ride === 0 && Math.abs(S.x - x0) > .3, `${x0.toFixed(2)} -> ${S.x.toFixed(2)}`); }
{ const L = mk([R(10, 6), G(6, vent(1, 4, 6, -4)), R(10, 8)]); const S = sim(L, [[KB.R, 50], [KB.R | KB.J, 10], [KB.R, 60]]); ok('luchtstroom tilt je op het hogere dak', !S.has('fall') && S.y === L.H - 8); }
{ const L = mk([R(30, 6, belt(4, 20, 1))]); const S = sim(L, [[KB.R, 60]]); const T = sim(mk([R(30, 6)]), [[KB.R, 60]]); ok('lopende band maakt sneller', S.x > T.x + 1, `${S.x.toFixed(1)} > ${T.x.toFixed(1)}`); }
{ const L = mk([R(12, 12), D(6), R(20, null)]); const S = Core.newState(L); let mx = 0; for (let i = 0; i < 150; i++) { Core.step(L, S, i < 30 ? KB.R : KB.R | KB.S); mx = Math.max(mx, Math.abs(S.gs)); }
  ok('glijden van een schuin dak: sneller dan rennen', mx > 12, `max ${mx.toFixed(1)}`); }
/* ---------- the finish, pickups, determinism, endless ---------- */
{ const L = mk([R(20, 6, coin(6, 1.2), fin(14))]); const S = sim(L, [[KB.R, 120]]); ok('schoentje en finish', S.coins === 1 && S.done === 1 && S.fin > 0 && S.st === ST.FIN); }
{ const L = buildLevel(LEVELS[7], 7); const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42); const bits = Array.from({ length: 2400 }, () => [KB.R, KB.R | KB.J, KB.R | KB.S, KB.L, KB.CW, KB.CCW | KB.J, 0][Math.floor(rnd() * 7)]);
  const a = Core.newState(L), b = Core.newState(L); for (const x of bits) Core.step(L, a, x); const c = Core.clone(Core.newState(L)); for (const x of bits) Core.step(L, b, x);
  ok('deterministisch: dezelfde invoer = precies dezelfde run', a.x === b.x && a.y === b.y && a.f === b.f && a.crashes === b.crashes, `${a.x} ${b.x}`);
  ok('willekeurige invoer: alles blijft eindig', [a.x, a.y, a.vx, a.vy, a.gs, a.rot].every(Number.isFinite)); }
{ const L = buildLevel(genEndless(1234), 99); const S = Core.newState(L, { endless: true, lives: 3 }); for (let i = 0; i < 4000 && !S.done; i++) Core.step(L, S, KB.R);
  ok('eindeloze run: drie levens, daarna klaar', S.done === 2 && S.lives <= 0 && S.best > 10, `best ${S.best.toFixed(1)}`); }
{ const t0 = performance.now(); const L = buildLevel(LEVELS[31], 31), S = Core.newState(L, { noEv: true }); for (let i = 0; i < 60000; i++) Core.step(L, S, i % 50 < 40 ? KB.R : KB.R | KB.J); const ms = performance.now() - t0;
  ok('snel: 60 000 stappen < 400 ms', ms < 400, `${ms.toFixed(0)} ms`); }
console.log(`\n${pass} geslaagd, ${fail} mislukt`); process.exit(fail ? 1 : 0);
