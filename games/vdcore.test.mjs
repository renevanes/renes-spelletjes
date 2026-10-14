// Vuistduel deterministic core tests (Node, no DOM): node vdcore.test.mjs
import { load } from './vdsrc/load.mjs';
const { CAST, CAST_BY, Core } = load();
const { U, D, L, R, LP, HP, LK, HK, SP, SU } = Core;
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) pass++; else fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); };

// numpad direction relative to fighter F -> absolute bits
const dirBits = (F, n) => { const fw = F.face > 0 ? R : L, bk = F.face > 0 ? L : R; let b = 0;
  if ([7, 8, 9].includes(n)) b |= U; if ([1, 2, 3].includes(n)) b |= D; if ([3, 6, 9].includes(n)) b |= fw; if ([1, 4, 7].includes(n)) b |= bk; return b; };
// fight-ready match, optionally mirrored (P0 starts on the right)
function match(c0, c1, o = {}) {
  const M = Core.newMatch({ p: [{ ch: c0, easy: o.easy0 }, { ch: c1, easy: o.easy1 }], stage: 'haven', noIntro: 1, train: o.train || null });
  let n = 0; while (M.phase !== 'fight' && n++ < 300) Core.step(M, [0, 0]);
  if (o.mirror) { const [A, B] = M.P; [A.x, B.x] = [B.x, A.x]; A.face = -1; B.face = 1; }
  if (o.gap != null) { const [A, B] = M.P, c = 600, s = A.x < B.x ? 1 : -1; A.x = c - s * o.gap / 2; B.x = c + s * o.gap / 2; }
  return M;
}
// run a script: array of [p0 numpad + buttons, p1 ...] per frame, entries like '6', '2+LP', '5'
function parse(F, s) { if (!s) return 0; const [d, ...bs] = String(s).split('+'); let b = dirBits(F, +d || 5); for (const x of bs) b |= { LP, HP, LK, HK, SP, SU }[x]; return b; }
function run(M, script0, script1, extra = 0) {
  const n = Math.max(script0.length, script1.length) + extra, evs = [];
  for (let i = 0; i < n; i++) { Core.step(M, [parse(M.P[0], script0[i]), parse(M.P[1], script1[i])]); evs.push(...M.ev.map(e => ({ ...e, f: i }))); }
  return evs;
}
const rep = (s, n) => Array(n).fill(s);
const idle = (M, n) => run(M, rep('5', n), rep('5', n));

for (const mirror of [false, true]) {
  const tag = mirror ? ' [gespiegeld]' : '';
  // ---- movement ----
  { const M = match('dex', 'sol', { mirror, gap: 400 }); const x0 = M.P[0].x; run(M, rep('6', 30), []); ok('lopen vooruit' + tag, (M.P[0].x - x0) * M.P[0].face > 60, (M.P[0].x - x0).toFixed(1)); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); const x0 = M.P[0].x; run(M, rep('4', 30), []); ok('lopen achteruit' + tag, (M.P[0].x - x0) * M.P[0].face < -40); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); let maxY = 0, sts = new Set(); for (let i = 0; i < 60; i++) { Core.step(M, [i < 3 ? dirBits(M.P[0], 9) : 0, 0]); maxY = Math.max(maxY, M.P[0].y); sts.add(M.P[0].st); }
    ok('springen (vooruit) en landen' + tag, maxY > 120 && sts.has('air') && M.P[0].st === 'stand' && M.P[0].y === 0, 'maxY ' + maxY.toFixed(0)); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); run(M, ['2', '2'], []); ok('hurken' + tag, M.P[0].crouch === 1 && Core.crouching(M.P[0])); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); const x0 = M.P[0].x; const ev = run(M, ['6', '5', '6', '6'], [], 18); ok('dash vooruit (dubbel tikken)' + tag, ev.some(e => e.t === 'dash') && (M.P[0].x - x0) * M.P[0].face > 60, ((M.P[0].x - x0) * M.P[0].face).toFixed(0)); }
  // ---- normals connect, buffer and latency ----
  { const M = match('dex', 'sol', { mirror, gap: 70 }); const hp = M.P[1].hp; const ev = run(M, ['5+LP'], [], 20); const h = ev.find(e => e.t === 'hit');
    ok('lichte stoot raakt' + tag, h && M.P[1].hp < hp, h ? 'frame ' + h.f : ''); }
  { const M = match('dex', 'sol', { mirror, gap: 70 }); Core.step(M, [LP, 0]); ok('latentie: aanval start in hetzelfde frame' + tag, M.P[0].st === 'move' && M.P[0].mt === 1); }
  { const M = match('dex', 'sol', { mirror, gap: 300 }); run(M, ['5+HK', ...rep('5', 27)], []); const ev = run(M, ['5+LP'], [], 30); // pressed during recovery -> buffered
    ok('invoerbuffer: stoot tijdens herstel komt toch' + tag, ev.some(e => e.t === 'swing' && e.a.id === 'sLP')); }
  // ---- blocking high / low / overhead ----
  { const M = match('dex', 'sol', { mirror, gap: 70 }); const ev = run(M, ['5+HP'], rep('4', 25)); ok('staand blokken van een stoot' + tag, ev.some(e => e.t === 'block') && !ev.some(e => e.t === 'hit')); }
  { const M = match('dex', 'sol', { mirror, gap: 80 }); const ev = run(M, ['2+LK'], rep('4', 20)); ok('lage trap raakt wie staand blokt' + tag, ev.some(e => e.t === 'hit')); }
  { const M = match('dex', 'sol', { mirror, gap: 80 }); const ev = run(M, ['2+LK'], rep('1', 20)); ok('lage trap: gehurkt blokken werkt' + tag, ev.some(e => e.t === 'block') && !ev.some(e => e.t === 'hit')); }
  { // overhead: jumping heavy kick against a crouch-blocker hits, against a stand-blocker is blocked
    for (const [def, want] of [['1', 'hit'], ['4', 'block']]) {
      const M = match('dex', 'sol', { mirror, gap: 200 });
      const s0 = ['9', '9', '9', '9', ...rep('5', 24), '5+HK', ...rep('5', 30)];
      const ev = run(M, s0, [...rep('5', 26), ...rep(def, s0.length)]); const got = ev.find(e => e.t === 'hit' || e.t === 'block');
      ok(`sprongaanval tegen ${def === '1' ? 'gehurkt' : 'staand'} blokken: ${want}` + tag, got && got.t === want, got ? got.t : 'niets');
    }
  }
  // ---- throws and tech ----
  { const M = match('dex', 'sol', { mirror, gap: 46 }); const hp = M.P[1].hp; const ev = run(M, ['6+HP'], [], 60);
    ok('worp van dichtbij' + tag, ev.some(e => e.t === 'grab') && M.P[1].hp < hp && ['down', 'rise', 'stand'].includes(M.P[1].st), M.P[1].st); }
  { const M = match('dex', 'sol', { mirror, gap: 46 }); const hp = M.P[1].hp; const ev = run(M, ['6+HP'], ['5', '5', '5', '4+HP'], 40);
    ok('worp ontsnappen (tech)' + tag, ev.some(e => e.t === 'tech') && M.P[1].hp === hp); }
  { const M = match('dex', 'sol', { mirror, gap: 46 }); const x0 = M.P[1].x - M.P[0].x; run(M, ['4+HP'], [], 60);
    ok('worp naar achteren wisselt van kant' + tag, Math.sign(M.P[1].x - M.P[0].x) === -Math.sign(x0)); }
  // ---- specials via motion inputs ----
  { const M = match('dex', 'sol', { mirror, gap: 400 }); const ev = run(M, ['2', '3', '6+LK'], [], 20); ok('Golfslag via ↓↘→ + Trap' + tag, ev.some(e => e.t === 'proj') && M.pj.length === 1); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); run(M, ['2', '3', '6+LK'], [], 40); const ev = run(M, ['2', '3', '6+HK'], [], 10); ok('maar één projectiel tegelijk' + tag, M.pj.length === 1 && !ev.some(e => e.t === 'proj')); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); const ev = run(M, ['6', '2', '3+HK'], [], 4); ok('Kraanknie via →↓↘ + Trap (onkwetsbaar opstijgen)' + tag, ev.some(e => e.t === 'special' && e.a.id === 'kraan') && Core.invuln(M.P[0])); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); const ev = run(M, ['2', '1', '4+LP'], [], 4); ok('Stoomboot via ↓↙← + Stoot' + tag, ev.some(e => e.t === 'special' && e.a.id === 'stoom')); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); const ev = run(M, ['2', '3', '6+LP'], [], 4); ok('verkeerde knop: geen special' + tag, !ev.some(e => e.t === 'special')); }
  { const M = match('moer', 'sol', { mirror, gap: 400 }); const ev = run(M, [...rep('4', 45), '6+LP'], [], 20); ok('ladingsaanval Raketvuist [←] → + Stoot' + tag, ev.some(e => e.t === 'proj' && e.a.k === 'vuist')); }
  { const M = match('moer', 'sol', { mirror, gap: 400 }); const ev = run(M, [...rep('4', 10), '6+LP'], [], 20); ok('te kort geladen: geen Raketvuist' + tag, !ev.some(e => e.t === 'proj')); }
  // ---- easy specials button ----
  { const M = match('dex', 'sol', { mirror, gap: 400, easy0: 1 }); const ev = run(M, ['5+SP'], [], 20); ok('Makkelijke specials: Speciaal = projectiel' + tag, ev.some(e => e.t === 'proj')); }
  { const M = match('dex', 'sol', { mirror, gap: 400, easy0: 1 }); const ev = run(M, ['6+SP'], [], 4); ok('Makkelijke specials: Speciaal + vooruit = stormloop' + tag, ev.some(e => e.t === 'special' && e.a.id === 'stoom')); }
  { const M = match('dex', 'sol', { mirror, gap: 400, easy0: 1 }); const ev = run(M, ['2+SP'], [], 4); ok('Makkelijke specials: Speciaal + omlaag = anti-lucht' + tag, ev.some(e => e.t === 'special' && e.a.id === 'kraan')); }
  { const M = match('dex', 'sol', { mirror, gap: 400 }); const ev = run(M, ['5+SP'], [], 4); ok('Speciaal-knop doet niets als de optie uit staat' + tag, !ev.some(e => e.t === 'special')); }
  // ---- super ----
  { const M = match('dex', 'sol', { mirror, gap: 120 }); M.P[0].meter = 100; const hp = M.P[1].hp; const ev = run(M, ['2', '3', '6', '2', '3', '6+LP'], [], 140);
    ok('super via ↓↘→↓↘→ + Stoot (flits, meter leeg, schade)' + tag, ev.some(e => e.t === 'super') && M.P[0].meter < 20 && hp - M.P[1].hp > 150, 'schade ' + (hp - M.P[1].hp)); }
  { const M = match('dex', 'sol', { mirror, gap: 120 }); M.P[0].meter = 100; const ev = run(M, ['5+SU'], [], 10); ok('Super-knop bij volle meter' + tag, ev.some(e => e.t === 'super') && M.fl); }
  { const M = match('dex', 'sol', { mirror, gap: 120 }); M.P[0].meter = 60; const ev = run(M, ['5+SU', '2', '3', '6', '2', '3', '6+LP'], [], 10); ok('geen super zonder volle meter' + tag, !ev.some(e => e.t === 'super')); }
  // ---- meter and chip ----
  { const M = match('dex', 'sol', { mirror, gap: 70 }); run(M, ['5+HP'], [], 30); ok('meter loopt op bij raken (beiden)' + tag, M.P[0].meter > 0 && M.P[1].meter > 0, M.P[0].meter + '/' + M.P[1].meter); }
  { const M = match('dex', 'sol', { mirror, gap: 100 }); const hp = M.P[1].hp; const ev = run(M, ['2', '1', '4+HP'], rep('4', 40));
    ok('chipschade: geblokte special doet een beetje pijn' + tag, ev.some(e => e.t === 'block') && M.P[1].hp < hp && hp - M.P[1].hp < 40, 'chip ' + (hp - M.P[1].hp)); }
  { const M = match('dex', 'sol', { mirror, gap: 70 }); const hp = M.P[1].hp; run(M, ['5+HP'], rep('4', 30)); ok('normale stoot geblokt: geen chip' + tag, M.P[1].hp === hp); }
  // ---- knockdown and wake-up invulnerability ----
  { const M = match('dex', 'sol', { mirror, gap: 90 }); const sts = []; for (let i = 0; i < 100; i++) { Core.step(M, [i === 0 ? dirBits(M.P[0], 2) | HK : 0, 0]); sts.push(M.P[1].st); }
    const downAt = sts.indexOf('down'), riseAt = sts.indexOf('rise');
    ok('veegtrap: neer en weer op' + tag, downAt > 0 && riseAt > downAt && sts[sts.length - 1] === 'stand', `neer ${downAt} op ${riseAt}`); }
  { const M = match('dex', 'sol', { mirror, gap: 90 }); let invOk = true, seenRise = false;
    for (let i = 0; i < 80; i++) { Core.step(M, [i === 0 ? dirBits(M.P[0], 2) | HK : 0, 0]); const B = M.P[1]; if (B.st === 'down' || B.st === 'rise') { seenRise = seenRise || B.st === 'rise'; if (Core.hurt(B, M.P[0], null)) invOk = false; } }
    ok('onkwetsbaar tijdens liggen en opstaan' + tag, invOk && seenRise); }
  // ---- combos, cancels ----
  { const M = match('dex', 'sol', { mirror, gap: 64 }); const s = ['2+LK', ...rep('2', 8), '2+LK', ...rep('2', 8), '3', '6+HK', ...rep('5', 60)];
    const ev = run(M, s, []); const hits = ev.filter(e => e.t === 'hit'); ok('combo: lage trap, lage trap, gecanceld in Golfslag' + tag, hits.length >= 3 && Math.max(...hits.map(h => h.a.combo)) >= 3, 'treffers ' + hits.length); }
  // ---- counter (Oma Truus) and armour (Sjaak) ----
  { const M = match('truus', 'dex', { mirror, gap: 80 }); const hp = M.P[1].hp; const ev = run(M, ['2', '1', '4+HK', '5', '5'], ['5', '5', '5', '5+HP'], 50);
    ok('Tegenzet vangt een stoot op' + tag, ev.some(e => e.t === 'counter') && M.P[1].hp < hp); }
  { const M = match('sjaak', 'dex', { mirror, gap: 170 }); const ev = run(M, ['2', '1', '4+HP'], [...rep('5', 9), '5+HK'], 50);
    ok('Molenarm pantsert een klap' + tag, ev.some(e => e.t === 'armor')); }
  { const M = match('truus', 'dex', { mirror, gap: 80 }); const hp = M.P[1].hp; const ev = run(M, ['2', '1', '4+LP'], [], 50); ok('Heupworp (commandogreep)' + tag, ev.some(e => e.t === 'grab') && M.P[1].hp < hp); }
  { const M = match('kiki', 'dex', { mirror, gap: 300 }); const side0 = Math.sign(M.P[1].x - M.P[0].x); run(M, ['2', '1', '4+HP'], [], 30); ok('Rookwolk (zwaar) teleporteert achter de tegenstander' + tag, Math.sign(M.P[1].x - M.P[0].x) === -side0); }
  { const M = match('sjaak', 'dex', { mirror, gap: 90 }); const s1 = ['8', ...rep('5', 30)]; const ev = run(M, [...rep('5', 9), '6', '2', '3+HP'], s1, 40); ok('Gewichtheffer vangt een springer' + tag, ev.some(e => e.t === 'grab')); }
  // ---- projectile clash ----
  { const M = match('dex', 'dex', { mirror, gap: 450 }); const ev = run(M, ['2', '3', '6+LK'], ['2', '3', '6+LK'], 60); ok('projectielen botsen' + tag, ev.some(e => e.t === 'clash') && M.pj.length === 0); }
}
// ---- round, timer and KO logic ----
{ const M = match('dex', 'sol', { gap: 70 }); M.P[1].hp = 20; const ev = run(M, ['5+HP'], [], 240);
  ok('K.O. -> ronde voorbij, punt voor de winnaar', ev.some(e => e.t === 'ko') && ev.some(e => e.t === 'roundend') && M.wins[0] === 1 && M.round === 2, `wins ${M.wins}`); }
{ const M = match('dex', 'sol', { gap: 300 }); M.timer = 30; M.P[1].hp = 500; const ev = run(M, [], [], 260); ok('tijd op: winnaar op levenspunten', ev.some(e => e.t === 'timeup') && M.wins[0] === 1, `wins ${M.wins}`); }
{ const M = match('dex', 'sol', { gap: 300 }); M.timer = 30; const ev = run(M, [], [], 260); ok('tijd op bij gelijke stand: beiden een punt', M.wins[0] === 1 && M.wins[1] === 1); }
{ const M = match('dex', 'sol', { gap: 70 }); let n = 0; while (!M.over && n++ < 3000) { if (M.phase === 'fight') M.P[1].hp = Math.min(M.P[1].hp, 20); Core.step(M, [(M.P[0].face > 0 ? R : L) | (M.f % 20 === 0 ? HP : 0), 0]); }
  const r = M.rounds; ok('twee gewonnen rondes = wedstrijd gewonnen, Perfect geteld', M.over && M.winner === 0 && M.wins[0] === 2 && r.every(x => x.perfect), JSON.stringify(r.map(x => x.perfect))); }
{ const M = match('dex', 'sol', { gap: 120 }); M.P[0].meter = 100; M.P[1].hp = 60; const ev = run(M, ['2', '3', '6', '2', '3', '6+LP'], [], 400); ok('super-finish wordt herkend', M.rounds[0] && M.rounds[0].superKO); }
{ const M = match('dex', 'sol', { gap: 70, train: { inf: 1, meter: 1 } }); M.P[1].hp = 10; run(M, ['5+HP'], [], 120); ok('training: oneindige levenspunten', M.P[1].hp === M.P[1].mhp && M.phase === 'fight' && M.P[0].meter === 100); }
{ const M = match('dex', 'sol', { gap: 300 }); const t0 = M.timer; idle(M, 120); ok('rondetimer loopt (60 s)', t0 - M.timer === 120 && Core.TIMER === 3600); }
// ---- determinism ----
{ const play = () => { const M = match('kiki', 'bram', { gap: 200 }); let h = 0; for (let i = 0; i < 1500; i++) { Core.step(M, [((i * 7919) % 1024) & 1023, ((i * 104729) % 1024) & 1023]); h = (h * 31 + Math.round(M.P[0].x * 10) + M.P[1].hp) % 1e9; } return h + ':' + M.P.map(F => F.hp).join(','); };
  const a = play(), b = play(); ok('deterministisch (zelfde invoer = zelfde uitkomst)', a === b, a); }
// ---- every move of every fighter can be started and finishes ----
for (const C of CAST) {
  const M0 = match(C.id, 'dex', { gap: 120 }); Core.prep(C);
  let bad = [];
  for (const sp of [...C.sp.flatMap(s => s.v), C.su.v]) {
    const M = match(C.id, 'dex', { gap: 90 }); const F = M.P[0]; F.meter = 100;
    // start the move directly and make sure the fighter returns to a neutral state
    const startMoveDirect = () => { F.st = 'move'; F.mv = sp; F.mt = 0; F.hmask = 0; F.conn = 0; F.mser = 999; F.armLeft = sp.arm ? sp.arm[2] : 0; };
    startMoveDirect(); let n = 0; while (n++ < 400 && !(F.st === 'stand' && M.P[1].st !== 'held')) Core.step(M, [0, 0]);
    if (F.st !== 'stand') bad.push(sp.id + ':' + F.st);
  }
  ok(`alle specials van ${C.nm} eindigen netjes`, !bad.length, bad.join(' '));
}
console.log(`\n${pass} geslaagd, ${fail} mislukt`);
process.exit(fail ? 1 : 0);
