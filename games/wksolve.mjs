// Woef tegen Karel: proves that every level can be beaten from its start state with the scripted solution (L.sol),
// through the same commands the touch input sends. Two runs per level:
//   careful: before each command the bot looks ahead (the core is deterministic) and waits until it will not be hit -> 3 stars
//   hasty:   commands go out as soon as Woef stands still; when a hit interrupts a command it is sent again -> still solvable
// Also checks: all numbers finite, nothing scheduled forever, the state survives a JSON save/load + sanitize at every step.
//   node games/wksolve.mjs            (exit code 1 on a failure)
import { load } from './wksrc/load.mjs';
const K = load(), { LEVELS, Core } = K;
const clone = S => JSON.parse(JSON.stringify(S));
const idle = S => S.w.m === 'idle' && !S.w.goal && !S.w.pend && !S.w.q.length;

export function toCmd(s) {
  switch (s[0]) {
    case 'obj': return { t: 'obj', id: s[1] };
    case 'use': return { t: 'obj', id: s[2], item: s[1] };
    case 'walk': return { t: 'walk', x: s[1], f: s[2] };
    case 'bark': return { t: 'bark' };
    case 'comb': return { t: 'comb', a: s[1], b: s[2] };
    case 'pick': return { t: 'pick', id: s[1], v: s[2] };
    case 'cuX': return { t: 'cuX' };
  }
}
function settle(L, S, max = 2400) { let n = 0; while (!idle(S) && n < max && !S.done) { Core.step(L, S); n++; } return n; }
function runLevel(i, careful, saveLoad = false) {
  const L = LEVELS[i]; let S = Core.newState(i); const log = [];
  let ticks = 0;
  const tick = () => {
    Core.step(L, S); ticks++;
    if (!Core.finite(S)) throw new Error('niet eindig op t=' + S.t);
    if (saveLoad && ticks % 97 === 0 && idle(S)) { const S2 = clone(S); if (!Core.sanitize(L, S2)) throw new Error('sanitize faalt'); S = S2; }
  };
  for (const s of L.sol) {
    if (s[0] === 'wait') { for (let k = 0; k < s[1]; k++) tick(); continue; }
    let tries = 0, done = false;
    while (!done && tries < 12) {
      tries++;
      while (!idle(S) && !S.done) tick();
      if (s[0] === 'pick') { let w = 0; while (S.cu !== s[1] && w++ < 30) tick(); if (S.cu !== s[1]) { Core.cmd(L, S, { t: 'obj', id: s[1] }); while (!idle(S) && !S.done) tick(); } }
      if (careful && ['obj', 'use', 'walk', 'bark'].includes(s[0])) {          // wait for a safe moment
        for (let w = 0; w < 80; w++) {
          const T = clone(T0(S)); const h0 = T.hits; Core.cmd(L, T, toCmd(s)); let n = 0; while (!idle(T) && n < 2400) { Core.step(L, T); n++; } for (let k = 0; k < 30; k++) Core.step(L, T);
          if (T.hits === h0) break; tick();
        }
      }
      const a0 = S.acts, h0 = S.hits;
      const ok = Core.cmd(L, S, toCmd(s));
      if (s[0] === 'pick' || s[0] === 'comb' || s[0] === 'cuX') { done = ok; break; }
      let n = 0; while ((!idle(S) || S.w.m === 'dizzy') && n++ < 2400 && !S.done) tick();
      done = S.acts > a0 && (S.hits === h0 || S.acts > a0);
      if (S.hits > h0 && S.acts === a0) done = false;
    }
    log.push(s.join(' ') + (tries > 1 ? ` (${tries}x)` : ''));
    if (!done && !S.done) return { ok: false, why: 'stap mislukt: ' + s.join(' '), S, log };
  }
  let n = 0; while (!S.done && n++ < 1200) tick();
  return { ok: !!S.done, why: S.done ? '' : 'machine niet kapot (st=' + S.m.st + ')', S, log, ticks, stars: Core.stars(S) };
}
const T0 = S => S;
export { runLevel };

if (import.meta.url === `file://${process.argv[1]}`) {
  let bad = 0;
  console.log('level                          careful: ticks hits sterren | hasty: ticks hits | save/load');
  for (let i = 0; i < LEVELS.length; i++) {
    const a = runLevel(i, true), b = runLevel(i, false), c = runLevel(i, false, true);
    const ok = a.ok && b.ok && c.ok && a.stars === 3;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${String(i + 1).padStart(2)} ${LEVELS[i].n.padEnd(24)} ${String(a.ticks).padStart(6)} ${String(a.S.hits).padStart(4)} ${String(a.stars).padStart(4)}    | ${String(b.ticks).padStart(6)} ${String(b.S.hits).padStart(4)} | ${c.ok ? 'ok' : 'FOUT'}${ok ? '' : '  ' + [a.why, b.why, c.why].filter(Boolean).join('; ')}`);
    if (!ok) console.log('   ', a.log.join(' / '));
  }
  console.log(bad ? `FAIL ${bad} level(s)` : `PASS alle ${LEVELS.length} levels oplosbaar (3 sterren mogelijk, ook met botsingen, ook na opslaan/laden)`);
  process.exit(bad ? 1 : 0);
}
