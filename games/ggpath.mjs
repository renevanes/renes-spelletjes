import fs from 'fs';
const L = JSON.parse(fs.readFileSync('gglevels.json'))[+process.argv[2]], target = process.argv[3].split(',').map(Number), nodig = process.argv[4] === 'nodig';
const COLS = 28, ROWS = 16, g = L.map.map(l => l.split('')); let start;
g.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'P') { start = [c, r]; g[r][c] = ' '; } if (ch === 'M') g[r][c] = ' '; }));
const at = (c, r) => (c < 0 || c >= COLS || r < 0) ? '@' : r >= ROWS ? '@' : (g[r][c] === 'S' ? ' ' : g[r][c]);
const solid = ch => ch === '#' || ch === '@';
const pass = (c, r, hole) => (hole && hole[0] === c && hole[1] === r) || !solid(at(c, r));
const sup = (c, r, hole) => { if (r >= ROWS - 1) return true; const ch = at(c, r), b = (hole && hole[0] === c && hole[1] === r + 1) ? ' ' : at(c, r + 1); return ch === 'H' || ch === '-' || b === '#' || b === '@' || b === 'H'; };
const fall = (c, r, hole) => { const p = [[c, r]]; while (!sup(c, r, hole) && r < ROWS - 1) { r++; p.push([c, r]); if (at(c, r) === '-') break; } return p; };
const prev = new Map([[start.join(), null]]), q = [start];
while (q.length) { const [c, r] = q.shift(); const n = [];
  if (!sup(c, r)) n.push([fall(c, r).slice(1), 'fall']);
  else { for (const d of [-1, 1]) if (pass(c + d, r)) n.push([fall(c + d, r), d < 0 ? 'L' : 'R']);
    if (at(c, r) === 'H' && pass(c, r - 1)) n.push([[[c, r - 1]], 'U']);
    if ((at(c, r) === 'H' || at(c, r + 1) === 'H' || at(c, r) === '-') && pass(c, r + 1)) n.push([fall(c, r + 1), 'D']);
    if (!nodig) for (const d of [-1, 1]) { const tc = c + d; if (at(tc, r + 1) === '#' && at(tc, r) === ' ' && at(c, r) !== '-') n.push([fall(tc, r, [tc, r + 1]).slice(1), 'DIG' + d]); } }
  for (const [cells, a] of n) for (const cell of cells) { const k = cell.join(); if (!prev.has(k)) { prev.set(k, [[c, r], a]); q.push(cell); } }
}
let k = target.join(), out = []; if (!prev.has(k)) { console.log('unreachable'); process.exit(); }
while (prev.get(k)) { const [p, a] = prev.get(k); out.unshift(a + '>' + k); k = p.join(); }
console.log(out.join('  '));
