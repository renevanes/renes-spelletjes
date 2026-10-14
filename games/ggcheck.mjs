// Goudgraver level checker: can the player reach every gold piece and then the top row (ignoring moles)?
import fs from 'fs';
const COLS = 28, ROWS = 16;
export function check(map, name) {
  const errs = [];
  if (map.length !== ROWS) errs.push(`rows ${map.length}`);
  map.forEach((l, i) => { if (l.length !== COLS) errs.push(`row ${i} len ${l.length}`); });
  if (errs.length) return { name, errs };
  const g = map.map(l => l.split(''));
  let start = null; const gold = [], moles = [];
  g.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'P') { start = [c, r]; g[r][c] = ' '; } if (ch === '$') gold.push([c, r]); if (ch === 'M') { moles.push([c, r]); g[r][c] = ' '; } }));
  const run = (reveal, from = start) => {
    const at = (c, r) => (c < 0 || c >= COLS || r < 0) ? '@' : r >= ROWS ? '@' : (g[r][c] === 'S' ? (reveal ? 'H' : ' ') : g[r][c]);
    const solid = ch => ch === '#' || ch === '@';
    const pass = (c, r, hole) => { if (hole && hole[0] === c && hole[1] === r) return true; return !solid(at(c, r)); };
    const sup = (c, r, hole) => { if (r >= ROWS - 1) return true; const ch = at(c, r), b = (hole && hole[0] === c && hole[1] === r + 1) ? ' ' : at(c, r + 1); return ch === 'H' || ch === '-' || b === '#' || b === '@' || b === 'H'; };
    const key = (c, r) => c + ',' + r, seen = new Set([key(...from)]), q = [from];
    const fall = (c, r, hole) => { const path = [[c, r]]; while (!sup(c, r, hole) && r < ROWS - 1) { r++; path.push([c, r]); if (at(c, r) === '-') break; } return path; };
    while (q.length) {
      const [c, r] = q.shift(); const nexts = [];
      if (!sup(c, r)) nexts.push(...fall(c, r).slice(1));
      else {
        for (const d of [-1, 1]) if (pass(c + d, r)) nexts.push(...fall(c + d, r));
        if (at(c, r) === 'H' && pass(c, r - 1)) nexts.push([c, r - 1]);
        if ((at(c, r) === 'H' || at(c, r + 1) === 'H' || at(c, r) === '-') && pass(c, r + 1)) nexts.push(...fall(c, r + 1));
        // dig left/right then drop through the hole
        for (const d of [-1, 1]) { const tc = c + d; if (at(tc, r + 1) === '#' && at(tc, r) === ' ' && at(c, r) !== '-') { const hole = [tc, r + 1]; nexts.push(...fall(tc, r, hole).slice(1)); } }
      }
      for (const [nc, nr] of nexts) { const k = key(nc, nr); if (!seen.has(k)) { seen.add(k); q.push([nc, nr]); } }
    }
    return seen;
  };
  const s1 = run(false), s2 = run(true);
  const missing = gold.filter(([c, r]) => !s1.has(c + ',' + r));
  const top = [...s2].some(k => k.endsWith(',0'));
  const traps = gold.filter(([c, r]) => { const back = run(false, [c, r]), out = run(true, [c, r]); return !back.has(start.join(',')) && ![...out].some(k => k.endsWith(',0')); });
  return { name, gold: gold.length, moles: moles.length, missing, exit: top, traps, start: !!start };
}
if (process.argv[2]) {
  const levels = JSON.parse(fs.readFileSync(process.argv[2]));
  for (const L of levels) { const r = check(L.map, L.name); console.log(JSON.stringify(r)); }
}
