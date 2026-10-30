// Woef tegen Karel: unit tests of the deterministic core (no browser).   node --test games/wkcore.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './wksrc/load.mjs';
const K = load(), { LEVELS, Core, ITEMS, WORLDS } = K;
const L = i => Core.prep(LEVELS[i]);
const run = (Lv, S, n) => { for (let i = 0; i < n; i++) Core.step(Lv, S); };
const settle = (Lv, S, max = 3000) => { let n = 0; while (n++ < max && !(S.w.m === 'idle' && !S.w.goal && !S.w.pend && !S.w.q.length)) Core.step(Lv, S); return n; };
const quiet = Lv => { const h = Lv.hazard; Lv.hazard = null; return () => { Lv.hazard = h; }; };   // switch the machine's attacks off for a test

test('16 levels in 3 worlds, every level has a machine, hints with an arrow, and a solution', () => {
  assert.equal(LEVELS.length, 16); assert.equal(WORLDS.length, 3);
  assert.equal(new Set(LEVELS.map(l => l.mk)).size, 16, 'every machine is different');
  for (const l of LEVELS) {
    Core.prep(l);
    assert.ok(l._od.mach, l.n + ': machine'); assert.ok(l.intro.length >= 1 && l.lose, l.n + ': Karel speaks');
    for (const h of l.hints) { assert.equal(h.length, 3, l.n); assert.ok(typeof h[0] === 'string' && typeof h[1] === 'string' && h[2].at, l.n + ': vague, clearer, arrow'); }
    assert.ok(l.sol.length >= 1);
    for (const f of l.floors) assert.ok(f.x0 < f.x1 && f.y > 0 && f.y < 9);
    for (const o of l.objs) { assert.ok(o.f || o.y != null, o.id); if (o.take) assert.ok(ITEMS[o.take], o.take); }
  }
});
test('teaching curve: early levels need 1 action, later ones 2 to 4 steps or more', () => {
  const steps = LEVELS.map(l => l.sol.filter((s, i, a) => !['wait', 'cuX', 'walk'].includes(s[0]) && !(s[0] === 'pick' && a[i - 1] && a[i - 1][0] === 'pick')).length);   // a row of button presses on one panel = 1 step
  assert.equal(steps[0], 1); assert.ok(steps.slice(0, 5).every(n => n <= 4));
  assert.ok(steps.slice(10, 15).every(n => n >= 3), JSON.stringify(steps));
  const avg = w => steps.slice(w * 5, w * 5 + 5).reduce((a, b) => a + b, 0) / 5; assert.ok(avg(0) < avg(1) && avg(1) < avg(2), 'harder per world');
  assert.ok(steps[15] >= Math.max(...steps.slice(0, 15)) + 2, 'the finale is the longest');
});
test('walking: to a point on the floor, up a ladder, over a gap (hop)', () => {
  const Lv = L(11), S = Core.newState(11), back = quiet(Lv);
  Core.cmd(Lv, S, { t: 'walk', x: 8.0, f: 'g2' }); settle(Lv, S);
  assert.equal(S.w.f, 'g2'); assert.ok(Math.abs(S.w.x - 8.0) < .05);
  Core.cmd(Lv, S, { t: 'walk', x: 9.5, f: 'up' }); let climbed = false; for (let i = 0; i < 3000 && (S.w.m !== 'idle' || S.w.q.length); i++) { Core.step(Lv, S); if (S.w.m === 'climb') climbed = true; }
  assert.ok(climbed); assert.equal(S.w.f, 'up'); assert.equal(S.w.y, 4.7);
  Core.cmd(Lv, S, { t: 'walk', x: 1.5, f: 'g1' }); let hopped = false; for (let i = 0; i < 3000 && (S.w.m !== 'idle' || S.w.q.length); i++) { Core.step(Lv, S); if (S.w.m === 'hop') hopped = true; }
  assert.ok(hopped); assert.equal(S.w.f, 'g1'); back();
});
test('a tap picks the object under the finger, an empty spot walks to the floor below', () => {
  const Lv = L(0), S = Core.newState(0);
  assert.equal(Core.pick(Lv, S, 3.4, 7.6), 'basket'); assert.equal(Core.pick(Lv, S, 11, 7.5), 'mach'); assert.equal(Core.pick(Lv, S, 6, 3), null);
  assert.equal(Core.floorAt(Lv, 6, 5), 'g');
  const L2 = L(1); assert.equal(Core.floorAt(L2, 1.5, 4.2), 'up'); assert.equal(Core.floorAt(L2, 1.5, 6.5), 'g');
});
test('blocking objects: Woef cannot walk through the basket, he pushes it', () => {
  const Lv = L(0), S = Core.newState(0), back = quiet(Lv);
  Core.cmd(Lv, S, { t: 'walk', x: 6, f: 'g' }); settle(Lv, S);
  assert.ok(S.w.x < 2.5, 'stops at the basket: ' + S.w.x);
  Core.cmd(Lv, S, { t: 'obj', id: 'basket' }); settle(Lv, S);
  assert.equal(S.o.basket.x, 7.3); assert.equal(S.o.basket.pushed, 1); back();
});
test('items: pick up, the backpack holds 3, a wrong use keeps the item, combine two items', () => {
  const Lv = L(9), S = Core.newState(9), back = quiet(Lv);
  Core.cmd(Lv, S, { t: 'obj', id: 'glue' }); settle(Lv, S); assert.deepEqual(S.inv, ['lijmpot']); assert.equal(S.o.glue.hide, 1);
  Core.cmd(Lv, S, { t: 'obj', id: 'tank', item: 'lijmpot' }); settle(Lv, S);
  assert.deepEqual(S.inv, ['lijmpot'], 'the closed pot cannot be used yet, and stays');
  Core.cmd(Lv, S, { t: 'obj', id: 'bench' }); settle(Lv, S); assert.deepEqual(S.inv, ['lijmpot', 'schroef']);
  S.ev = []; assert.equal(Core.cmd(Lv, S, { t: 'comb', a: 'schroef', b: 'lijmpot' }), true); assert.deepEqual(S.inv, ['lijm']);
  S.ev = []; Core.cmd(Lv, S, { t: 'comb', a: 'lijm', b: 'lijm' }); assert.deepEqual(S.inv, ['lijm']);
  S.inv = ['lijm', 'cactus', 'bal']; const L0 = L(1), S2 = Core.newState(1); S2.inv = ['worst', 'bal', 'plank'];
  const back2 = quiet(L0); Core.cmd(L0, S2, { t: 'obj', id: 'cactus' }); settle(L0, S2); assert.equal(S2.inv.length, 3); assert.equal(S2.o.cactus.hide, 0, 'full backpack: the cactus stays'); back2(); back();
});
test('hints: vague, clearer, then an arrow; stars: fewer hints and fewer hits = more stars', () => {
  const Lv = L(4), S = Core.newState(4);
  const h1 = Core.hint(Lv, S), h2 = Core.hint(Lv, S), h3 = Core.hint(Lv, S), h4 = Core.hint(Lv, S);
  assert.equal(h1.n, 1); assert.equal(h1.at, null); assert.equal(h2.n, 2); assert.equal(h3.n, 3); assert.equal(h3.at, 'fridge'); assert.equal(h4.n, 3);
  assert.equal(Core.arrow(Lv, S), 'fridge'); S.inv = ['worst']; assert.equal(Core.arrow(Lv, S), null, 'the arrow disappears in the next stage');
  assert.equal(Core.hint(Lv, S).n, 1, 'a new stage starts with a vague hint again');
  const T = { hints: 0, hits: 0 }; assert.equal(Core.stars(T), 3); T.hints = 1; assert.equal(Core.stars(T), 3); T.hints = 2; assert.equal(Core.stars(T), 2); T.hits = 3; assert.equal(Core.stars(T), 1); T.hints = 0; assert.equal(Core.stars(T), 2);
});
test('a machine attack pushes Woef back with stars, cancels his action, nothing is lost; a tap during the dizzy spell is kept', () => {
  const Lv = L(0), S = Core.newState(0);
  S.o.basket.x = 7.3; S.o.basket.pushed = 1;                       // out of the way
  S.w.x = 8.2; S.inv = ['bal'];
  let t = 0; while (S.hits === 0 && t++ < 400) Core.step(Lv, S);
  assert.equal(S.hits, 1); assert.equal(S.w.m, 'dizzy'); assert.deepEqual(S.inv, ['bal']);
  S.ev = []; Core.cmd(Lv, S, { t: 'walk', x: 1, f: 'g' }); assert.ok(S.w.pend, 'kept for later');
  run(Lv, S, 100); assert.ok(S.w.x < 7.3 && S.w.m === 'walk' || S.w.x <= 1.1, 'pushed back and walking on: ' + S.w.x + ' ' + S.w.m);
  const x = S.w.x; assert.ok(Number.isFinite(x));
});
test('close-ups: choices only while open; the crane drops its weight on its own motor', () => {
  const Lv = L(3), S = Core.newState(3), back = quiet(Lv);
  assert.equal(Core.cmd(Lv, S, { t: 'pick', id: 'panel', v: 'L' }), false);
  Core.cmd(Lv, S, { t: 'obj', id: 'panel' }); settle(Lv, S); assert.equal(S.cu, 'panel');
  for (const v of ['L', 'L', 'L']) Core.cmd(Lv, S, { t: 'pick', id: 'panel', v });
  run(Lv, S, 160); Core.cmd(Lv, S, { t: 'pick', id: 'panel', v: 'flip' }); run(Lv, S, 80);
  assert.equal(S.o.motor.hit, 1); assert.notEqual(S.m.st, 'ok'); back();
});
test('a miss is not a fail: the crane picks its weight up again', () => {
  const Lv = L(3), S = Core.newState(3), back = quiet(Lv);
  Core.cmd(Lv, S, { t: 'obj', id: 'panel' }); settle(Lv, S); run(Lv, S, 150);
  Core.cmd(Lv, S, { t: 'pick', id: 'panel', v: 'flip' }); run(Lv, S, 200);
  assert.equal(S.m.st, 'ok'); assert.equal(S.o.mach.drop, 0); assert.ok(!S.o.motor.hit); back();
});
test('the colour code: a wrong button starts again (no penalty), the right order wins', () => {
  const Lv = L(8), S = Core.newState(8); S.cu = 'panel';
  Core.cmd(Lv, S, { t: 'pick', id: 'panel', v: 'b' }); Core.cmd(Lv, S, { t: 'pick', id: 'panel', v: 'y' });
  assert.equal(S.o.panel.code, ''); assert.equal(S.hits, 0); S.cu = 'panel';
  for (const v of 'brgy') Core.cmd(Lv, S, { t: 'pick', id: 'panel', v });
  assert.equal(S.o.panel.ok, 1); run(Lv, S, 120); assert.notEqual(S.m.st, 'ok');
});
test('mirrors: the ray follows them and only the right setting hits the machine itself', () => {
  const Lv = L(10), S = Core.newState(10);
  assert.equal(Lv.beam(S).hit, 0); for (const r of [1, 3]) { S.o.mA.r = r; assert.equal(Lv.beam(S).p.length, 2, 'blocked'); }
  S.o.mA.r = 2; assert.equal(Lv.beam(S).hit, 0); S.o.mB.r = 1; assert.equal(Lv.beam(S).hit, 0); S.o.mB.r = 0; assert.equal(Lv.beam(S).hit, 1);
  const p = Lv.beam(S).p; assert.equal(p[p.length - 1][1], p[p.length - 2][1], 'the last part is horizontal');
});
test('bark: only works close by', () => {
  const Lv = L(2), S = Core.newState(2), back = quiet(Lv);
  Core.cmd(Lv, S, { t: 'bark' }); settle(Lv, S); assert.ok(!S.o.mach.rev);
  Core.cmd(Lv, S, { t: 'walk', x: 9.8, f: 'up' }); settle(Lv, S); Core.cmd(Lv, S, { t: 'bark' }); settle(Lv, S); assert.ok(S.o.mach.rev >= 1); back();
});
test('after the machine breaks: no more commands, Woef cheers, the level ends (finale later, with the cage)', () => {
  for (const i of [0, 15]) {
    const Lv = L(i), S = Core.newState(i); const A = { ev: [] };
    S.ev = []; S.m.st = 'break'; S.m.bt = 0;
    assert.equal(Core.cmd(Lv, S, { t: 'walk', x: 3, f: 'g' }), false);
    const evs = []; let n = 0; while (!S.done && n++ < 1000) { Core.step(Lv, S); evs.push(...S.ev.map(e => e.t)); }
    assert.equal(S.done, 1); assert.ok(evs.includes('boom') && evs.includes('cheer') && evs.includes(i === 15 ? 'cage' : 'flee'));
    assert.equal(n, i === 15 ? 480 : 300);
  }
});
test('deterministic: the same commands give the same state', () => {
  const play = () => { const Lv = L(6), S = Core.newState(6); for (const c of [{ t: 'obj', id: 'cart' }, { t: 'obj', id: 'batt' }, { t: 'obj', id: 'cart', item: 'batt' }]) { Core.cmd(Lv, S, c); run(Lv, S, 400); } run(Lv, S, 50); return JSON.stringify(S); };
  assert.equal(play(), play());
});
test('save/load: a JSON copy of the state continues exactly like the original', () => {
  const Lv = L(12), A = Core.newState(12); Core.cmd(Lv, A, { t: 'walk', x: 2.4, f: 'up' }); settle(Lv, A); Core.cmd(Lv, A, { t: 'bark' }); run(Lv, A, 90);
  const B = JSON.parse(JSON.stringify(A)); assert.ok(Core.sanitize(Lv, B));
  for (const S of [A, B]) { Core.cmd(Lv, S, { t: 'obj', id: 'key' }); run(Lv, S, 600); }
  assert.deepEqual(A.inv, B.inv); assert.equal(A.o.nest.gone, B.o.nest.gone); assert.equal(A.t, B.t);
});
test('sanitize repairs a half-finished or broken save', () => {
  const Lv = L(1), S = Core.newState(1);
  Core.cmd(Lv, S, { t: 'obj', id: 'cactus' }); let n = 0; while (S.w.m !== 'climb' && n++ < 500) Core.step(Lv, S);
  const C = JSON.parse(JSON.stringify(S)); assert.ok(Core.sanitize(Lv, C)); assert.ok(C.w.f && C.w.m === 'idle' && C.w.y === Lv._fl[C.w.f].y);
  const D = JSON.parse(JSON.stringify(S)); D.w.x = NaN; D.inv = ['cactus', 'bogus']; D.o.mach.x = Infinity; D.seq.push({ at: 5, n: 'nope' });
  assert.ok(Core.sanitize(Lv, D)); assert.ok(Number.isFinite(D.w.x)); assert.deepEqual(D.inv, ['cactus']); assert.ok(Number.isFinite(D.o.mach.x)); assert.equal(D.seq.length, 0);
  assert.equal(Core.sanitize(Lv, { v: 99 }), false); assert.equal(Core.sanitize(Lv, null), false);
});
test('robust: random commands for every level never give NaN, stuck timers or an exception', () => {
  let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < LEVELS.length; i++) {
    const Lv = L(i), S = Core.newState(i), ids = Lv.objs.map(o => o.id), items = Object.keys(ITEMS);
    for (let k = 0; k < 300; k++) {
      const r = rnd();
      if (r < .4) Core.cmd(Lv, S, { t: 'tap', x: rnd() * 14, y: rnd() * 9, item: rnd() < .3 ? S.inv[0] : null });
      else if (r < .6) Core.cmd(Lv, S, { t: 'obj', id: ids[Math.floor(rnd() * ids.length)], item: rnd() < .5 ? S.inv[Math.floor(rnd() * 3)] : null });
      else if (r < .7) Core.cmd(Lv, S, { t: 'bark' });
      else if (r < .8) Core.cmd(Lv, S, { t: 'comb', a: S.inv[0], b: S.inv[1] });
      else if (r < .9 && S.cu) { const d = Lv.cu[S.cu](S); if (d.opts) Core.cmd(Lv, S, { t: 'pick', id: S.cu, v: d.opts[Math.floor(rnd() * d.opts.length)].v }); }
      else Core.cmd(Lv, S, { t: 'tap', x: NaN, y: 3 });
      run(Lv, S, 1 + Math.floor(rnd() * 90));
      assert.ok(Core.finite(S), Lv.n + ' finite');
      assert.ok(S.seq.every(e => Number.isFinite(e.at) && e.at - S.t < 2000), Lv.n + ' timers');
      assert.ok(S.inv.length <= 3);
      if (S.done) break;
    }
  }
});
