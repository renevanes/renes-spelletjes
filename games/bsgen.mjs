// Bellenschieter level generator: 60 hand-shaped levels (patterns + pictures made from shape functions on the hex grid),
// then every level is played by the bot (bssrc/core.js, the game's own rules) with 12 shot sequences to set the shot
// limit and the star thresholds; ceiling levels get a slower ceiling until the bot wins every run.
// Writes bssrc/levels.json.   Usage: node bsgen.mjs [onlyLevel]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { C } from './bscore.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const RH = Math.sqrt(3) / 2, CXM = 5.5;
const COL = { r: '0', y: '1', b: '2', g: '3', p: '4', o: '5' };
const hyp = Math.hypot;

// ---------- grid helpers ----------
let PIC = null;                                   // while building a picture: a ceiling band on top, shape squeezed to fit
function grid(nr, f) {
  const rows = [];
  if (PIC) nr = PIC.rows;
  for (let r = 0; r < nr; r++) { const n = r % 2 ? 10 : 11; let s = ''; for (let c = 0; c < n; c++) { const x = c + .5 + (r % 2 ? .5 : 0); let y = r * RH + .5; if (PIC) { if (r < PIC.band) { s += 'x'; continue; } y = (y - PIC.band * RH) / PIC.sy; } const ch = f(x, y, r, c); s += ch ? (COL[ch] || ch) : '.'; } rows.push(s); }
  while (rows.length && /^\.+$/.test(rows[rows.length - 1])) rows.pop();
  return rows;
}
const nbr = (r, c) => { const off = r % 2 === 1, o = [[r, c - 1], [r, c + 1]]; if (off) o.push([r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]); else o.push([r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]); return o; };
const inb = (rows, r, c) => r >= 0 && r < rows.length && c >= 0 && c < rows[r].length;
const xOf = (r, c) => c + .5 + (r % 2 ? .5 : 0);
function setCh(rows, r, c, ch) { while (rows.length <= r) rows.push((rows.length % 2 ? '.'.repeat(10) : '.'.repeat(11))); rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1); }
// every piece of a picture must hang on the ceiling: add a little chain of bubbles up from each loose piece
function anchor(rows, ch = 'x') {
  for (let guard = 0; guard < 40; guard++) {
    const seen = new Set(), q = [];
    for (let c = 0; c < (rows[0] || '').length; c++) if (rows[0][c] !== '.') { seen.add(c); q.push([0, c]); }
    for (let i = 0; i < q.length; i++) for (const [a, b] of nbr(...q[i])) { const k = a * 16 + b; if (inb(rows, a, b) && rows[a][b] !== '.' && !seen.has(k)) { seen.add(k); q.push([a, b]); } }
    let top = null;
    rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] !== '.' && !seen.has(r * 16 + c) && (!top || r < top[0] || (r === top[0] && Math.abs(xOf(r, c) - CXM) < Math.abs(xOf(...top) - CXM)))) top = [r, c]; });
    if (!top) return rows;
    let [r, c] = top;
    while (r > 0) {
      const up = nbr(r, c).filter(([a, b]) => a === r - 1 && inb(rows, a, b)).sort((p, q2) => Math.abs(xOf(...p) - CXM) - Math.abs(xOf(...q2) - CXM) + (Math.abs(xOf(...p) - xOf(r, c)) - Math.abs(xOf(...q2) - xOf(r, c))) * 3)[0];
      [r, c] = up; if (rows[r][c] !== '.') { if (seen.has(r * 16 + c)) break; continue; }
      setCh(rows, r, c, ch);
      if (nbr(r, c).some(([a, b]) => inb(rows, a, b) && seen.has(a * 16 + b))) break;
    }
  }
  return rows;
}
// strings of bubbles from the band down to the picture: it hangs on several threads instead of one
function strings(rows, band, step) {
  rows = rows.slice(); const r0 = band % 2 ? band : band;
  for (let c0 = 0; c0 < 11; c0 += step) {
    const path = []; let hit = false;
    for (let r = band; r < rows.length; r++) {
      const c = r % 2 ? Math.min(9, c0) : c0; if (!rows[r] || c >= rows[r].length) break;
      if (rows[r][c] !== '.') { hit = r > band; break; }
      path.push([r, c]);
    }
    if (hit && path.length) for (const [r, c] of path) setCh(rows, r, c, 'x');
  }
  void r0; return rows;
}
// break up big single-colour areas a little: some picture cells become a random colour
function speckle(rows, p, seed) { const R = rng(seed); return rows.map(row => row.replace(/[0-5]/g, ch => R() < p ? 'x' : ch)); }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
// put special bubbles (overlay) on n filled cells in a row range
const covered = rows => (r, c) => nbr(r, c).every(([a, b]) => a < 0 || (inb(rows, a, b) && rows[a][b] !== '.'));
function sprinkle(rows, sp, ch, n, r0, r1, seed, filter) {
  if (!filter) filter = ch === '*' ? covered(rows) : () => true;
  const R = rng(seed), cells = [];
  rows.forEach((row, r) => { if (r < r0 || r > r1) return; for (let c = 0; c < row.length; c++) if (row[c] !== '.' && (!sp[r] || sp[r][c] === '.' || !sp[r][c]) && filter(r, c, row[c])) cells.push([r, c]); });
  for (let i = 0; i < n && cells.length; i++) { const j = Math.floor(R() * cells.length), [r, c] = cells.splice(j, 1)[0]; while (sp.length <= r) sp.push(''); sp[r] = (sp[r] + '.'.repeat(11)).slice(0, Math.max(sp[r].length, c + 1)); sp[r] = sp[r].slice(0, c) + ch + sp[r].slice(c + 1); }
  return sp;
}
function spAt(sp, r, c, ch) { while (sp.length <= r) sp.push(''); sp[r] = (sp[r] + '.'.repeat(11)).slice(0, Math.max(sp[r].length, c + 1)); sp[r] = sp[r].slice(0, c) + ch + sp[r].slice(c + 1); }

// ---------- shapes ----------
const full = n => grid(n, () => 'x');
const invTri = (n, s = .55) => grid(n, (x, y, r) => Math.abs(x - CXM) <= 5.6 - r * s ? 'x' : 0);
const diamond = (ym, ry, rx = 5.6) => grid(Math.ceil((ym + ry) / RH) + 1, (x, y) => Math.abs(x - CXM) / rx + Math.abs(y - ym) / ry <= 1 ? 'x' : 0);
const hstripes = (n, cols, h = 1) => grid(n, (x, y, r) => cols[Math.floor(r / h) % cols.length]);
const vstripes = (n, cols, w = 2) => grid(n, x => cols[Math.floor(x / w) % cols.length]);
const dstripes = (n, cols, w = 2) => grid(n, (x, y) => cols[Math.floor((x + y * 1.1) / w) % cols.length]);
const checker = (n, cols, s = 2) => grid(n, (x, y) => cols[(Math.floor(x / s) + Math.floor(y / (s * .9))) % cols.length]);
const columns = (n, step, k = 1, top = 1) => grid(n, (x, y, r, c) => r < top || c % step === k ? 'x' : 0);
const rings = (yc, R, cols, w = 1.25) => grid(Math.ceil((yc + R) / RH) + 1, (x, y) => { const d = hyp(x - CXM, (y - yc) * 1.05); return d <= R ? cols[Math.floor(d / w) % cols.length] : 0; });
const zigzag = (base, amp, per = 4) => grid(Math.ceil((base + amp) / RH) + 1, (x, y) => y <= base + amp * Math.abs(((x / per) % 2) - 1) ? 'x' : 0);
const wave = (base, amp, per = 5.5) => grid(Math.ceil((base + amp) / RH) + 2, (x, y) => y <= base + amp * Math.sin(x / per * Math.PI * 2) ? 'x' : 0);
const spiral = (yc, R, cols) => grid(Math.ceil((yc + R) / RH) + 1, (x, y) => { const dx = x - CXM, dy = y - yc, d = hyp(dx, dy); if (d > R) return 0; const a = Math.atan2(dy, dx) + d * .75; return cols[((Math.floor(a / (Math.PI * 2 / cols.length)) % cols.length) + cols.length) % cols.length]; });
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const inCirc = (x, y, cx, cy, r) => hyp(x - cx, y - cy) <= r;
const inTri = (x, y, ax, ay, bx, by, cx2, cy2) => { const s = (p1x, p1y, p2x, p2y, p3x, p3y) => (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y); const d1 = s(x, y, ax, ay, bx, by), d2 = s(x, y, bx, by, cx2, cy2), d3 = s(x, y, cx2, cy2, ax, ay); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
const P = {
  fish: () => grid(9, (x, y) => { if (inCirc(x, y, 8.3, 3.5, .5)) return 'p'; if (inEll(x, y, 6.2, 4, 3.6, 2.5)) return (x > 4.6 && x < 5.5) || (x > 7 && x < 7.7) ? 'y' : 'o'; if (inTri(x, y, 2.9, 4, .3, 1.6, .3, 6.4)) return 'b'; if (inTri(x, y, 5, 1.7, 7.5, 1.5, 6.8, .4)) return 'b'; return 0; }),
  heart: () => grid(11, (x, y) => { const f = (s) => { const X = (x - CXM) / (4.9 * s), Y = -(y - 3.5) / (4.3 * s) + .25; return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0; }; return f(.62) ? 'r' : f(1) ? 'p' : 0; }),
  jelly: () => grid(11, (x, y) => { if (y < 4 && inEll(x, y, CXM, .3, 4.4, 3.7)) return inEll(x, y, CXM, .3, 2.6, 2.2) ? 'p' : 'b'; if (y >= 3.6) { for (const tx of [2, 4.3, 6.7, 9]) { const w = tx + Math.sin(y * 1.3 + tx) * .7; if (Math.abs(x - w) < .6 && y < 8.6 - Math.abs(tx - CXM) * .25) return tx < 5 ? 'r' : 'y'; } } return 0; }),
  tree: () => grid(11, (x, y) => { if (y > 7.4 && Math.abs(x - CXM) < 1.05) return 'o'; const tier = [[0, 3.2, 2.8], [2.2, 5.6, 4], [4.4, 7.6, 5.2]]; for (const [a, b, w] of tier) if (y >= a && y <= b && Math.abs(x - CXM) <= (y - a + .5) / (b - a + .5) * w) { return (Math.round(x * 1.7 + y * 2.3) % 7 === 0) ? (y > 4 ? 'r' : 'y') : 'g'; } return 0; }),
  mushroom: () => grid(10, (x, y) => { if (y < 4.6 && inEll(x, y, CXM, 4.6, 5.6, 4.4)) return inCirc(x, y, 3.3, 2.4, .9) || inCirc(x, y, 7.6, 2.2, .9) || inCirc(x, y, CXM, 1, .7) ? 'y' : 'r'; if (y >= 4.4 && Math.abs(x - CXM) < 1.7 + (y - 4.4) * .15 && y < 8.4) return 'o'; return 0; }),
  flower: () => grid(11, (x, y) => { const cy = 3.6; if (inCirc(x, y, CXM, cy, 1.15)) return 'y'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + .3; if (inCirc(x, y, CXM + Math.cos(a) * 2.3, cy + Math.sin(a) * 2.3, 1.3)) return i % 2 ? 'p' : 'r'; } if (y > cy + 2.4 && Math.abs(x - (CXM + Math.sin(y) * .4)) < .6) return 'g'; if (inEll(x, y, 7.4, 7.6, 1.4, .6)) return 'g'; return 0; }),
  smiley: () => grid(11, (x, y) => { if (!inCirc(x, y, CXM, 4.7, 4.6)) return 0; if (inCirc(x, y, 3.8, 3.4, .75) || inCirc(x, y, 7.2, 3.4, .75)) return 'b'; const d = hyp(x - CXM, y - 4.2); if (d > 2.2 && d < 3.3 && y > 5.3) return 'r'; return 'y'; }),
  owl: () => grid(11, (x, y) => { if (inTri(x, y, 1.2, 0, 2.6, 1.8, .8, 2.2) || inTri(x, y, 9.8, 0, 8.4, 1.8, 10.2, 2.2)) return 'o'; if (!inEll(x, y, CXM, 4.6, 4.8, 4.4)) return 0; if (inCirc(x, y, 3.7, 3.2, .7) || inCirc(x, y, 7.3, 3.2, .7)) return 'b'; if (inCirc(x, y, 3.7, 3.2, 1.6) || inCirc(x, y, 7.3, 3.2, 1.6)) return 'y'; if (inTri(x, y, 4.9, 4.3, 6.1, 4.3, CXM, 5.6)) return 'o'; if (y > 5.6 && Math.abs(x - CXM) < 2.6) return (Math.floor(x + y) % 3 === 0) ? 'g' : 'o'; return 'g'; }),
  icecream: () => grid(12, (x, y) => { if (inCirc(x, y, 3.9, 1.6, 2.1)) return 'r'; if (inCirc(x, y, 7.1, 1.6, 2.1)) return 'g'; if (inCirc(x, y, CXM, 3.3, 2.4)) return 'p'; if (inTri(x, y, 2.4, 4.6, 8.6, 4.6, CXM, 10)) return (Math.floor((x + y) / 1.4) % 2) ? 'o' : 'y'; return 0; }),
  lolly: () => grid(11, (x, y) => { if (inCirc(x, y, CXM, 6.2, 3.3)) { const d = hyp(x - CXM, y - 6.2), a = Math.atan2(y - 6.2, x - CXM); return ['r', 'y', 'b'][((Math.floor((a + d * 1.1) / (Math.PI / 1.5)) % 3) + 3) % 3]; } if (Math.abs(x - CXM) < .6 && y < 3.2) return 'p'; if (y < .9 && Math.abs(x - CXM) < 4.6) return Math.abs(x - CXM) < 1 ? 'p' : 'g'; return 0; }),
  cupcake: () => grid(10, (x, y) => { if (inCirc(x, y, CXM, .5, .8)) return 'r'; if (y < 4.2 && inEll(x, y, CXM, 4.2, 4.6, 3.6)) return Math.floor(y * 1.15 + Math.sin(x * 1.6) * .6) % 2 ? 'p' : 'y'; if (y >= 4 && y < 8.2 && Math.abs(x - CXM) < 4 - (y - 4) * .35) return Math.floor(x) % 2 ? 'b' : 'g'; return 0; }),
  candy: () => grid(9, (x, y) => { if (inEll(x, y, CXM, 3.4, 2.7, 2.3)) return Math.floor((x + y * .6) / 1.1) % 2 ? 'r' : 'y'; if (inTri(x, y, 3, 3.4, .4, 1.2, .4, 5.8) || inTri(x, y, 8, 3.4, 10.6, 1.2, 10.6, 5.8)) return 'p'; return 0; }),
  cactus: () => grid(11, (x, y) => { if (inCirc(x, y, CXM, .5, .8)) return 'r'; if (Math.abs(x - CXM) < 1.3 && y < 8.6) return 'g'; if ((Math.abs(x - 2.6) < .65 && y > 2.2 && y < 5) || (x > 2.6 && x < CXM && Math.abs(y - 5) < .55)) return 'g'; if ((Math.abs(x - 8.4) < .65 && y > 1.4 && y < 4.2) || (x > CXM && x < 8.4 && Math.abs(y - 4.2) < .55)) return 'g'; if (y > 8.2 && y < 9.6 && Math.abs(x - CXM) < 3) return 'o'; return 0; }),
  pyramid: () => grid(11, (x, y) => Math.abs(x - CXM) <= y * .62 + .3 ? (Math.floor(y / 1.75) % 2 ? 'y' : 'o') : 0),
  sun: () => grid(11, (x, y) => { const d = hyp(x - CXM, y - 4.6), a = Math.atan2(y - 4.6, x - CXM); if (d < 2.5) return d < 1.4 ? 'y' : 'o'; if (d < 4.8 && Math.abs(Math.sin(a * 4)) > .8) return 'r'; return 0; }),
  palm: () => grid(11, (x, y) => { for (const [cx, dir] of [[CXM, -1], [CXM, 1]]) { for (let k = 0; k < 3; k++) { const ex = cx + dir * (1.6 + k * 1.6), ey = .6 + k * .9 + (k === 2 ? .6 : 0); if (inCirc(x, y, ex, ey, 1.1)) return 'g'; } } if (inCirc(x, y, 4.8, 2.4, .7) || inCirc(x, y, 6.2, 2.4, .7)) return 'o'; if (Math.abs(x - (CXM + Math.sin(y * .5) * .8)) < .7 && y < 9) return y % 1.7 < .85 ? 'y' : 'o'; return 0; }),
  snake: () => grid(10, (x, y) => { const c = 3.6 + Math.sin(x * .9) * 2.2; if (Math.abs(y - c) < 1.1) { if (x > 9.6 && Math.abs(y - c) < .5) return 'r'; return Math.floor(x * 1.2) % 3 === 0 ? 'y' : 'g'; } return 0; }),
  snowman: () => grid(12, (x, y) => { if (inCirc(x, y, CXM, 1.9, 1.9)) return inCirc(x, y, 4.8, 1.6, .45) || inCirc(x, y, 6.2, 1.6, .45) ? 'p' : inTri(x, y, CXM - .2, 2.1, CXM + .5, 2.1, CXM + 1.6, 2.5) ? 'o' : 'b'; if (Math.abs(y - 4.1) < .55 && Math.abs(x - CXM) < 2.6) return 'r'; if (inCirc(x, y, CXM, 7.4, 3.2)) return Math.abs(x - CXM) < .6 && Math.floor(y * 1.3) % 2 === 0 ? 'p' : 'b'; return 0; }),
  flake: () => grid(11, (x, y) => { const cx = CXM, cy = 4.4; const dx = x - cx, dy = y - cy, d = hyp(dx, dy); if (d < 1) return 'p'; if (d > 4.6) return 0; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a); const along = dx * ux + dy * uy, perp = Math.abs(-dx * uy + dy * ux); if (along > 0 && perp < .55) return d > 3.6 ? 'p' : 'b'; if (along > 2 && along < 3.4 && perp < 1.2 && perp > .5) return 'g'; } return 0; }),
  penguin: () => grid(11, (x, y) => { if (!inEll(x, y, CXM, 4.6, 4, 4.4)) return 0; if (inCirc(x, y, 4.3, 2.4, .5) || inCirc(x, y, 6.7, 2.4, .5)) return 'y'; if (inTri(x, y, 4.8, 3.2, 6.2, 3.2, CXM, 4.2)) return 'o'; if (inEll(x, y, CXM, 6, 2.5, 3)) return 'b'; return 'p'; }),
  igloo: () => grid(10, (x, y) => { if (!inEll(x, y, CXM, 8, 5.6, 7.6)) return 0; if (inEll(x, y, CXM, 8.2, 1.6, 2.6)) return 'p'; return (Math.floor(y / 1.3) % 2 ? Math.floor(x / 1.5) % 2 : Math.floor((x + .75) / 1.5) % 2) ? 'b' : 'g'; }),
  icicles: () => grid(11, (x, y) => { if (y < 1.4) return 'b'; for (const [cx, len, w] of [[1.5, 7.6, 1.4], [4.2, 5.6, 1.5], [6.8, 8.4, 1.4], [9.5, 6, 1.4]]) if (y < len && Math.abs(x - cx) <= w * (1 - (y - 1) / (len - 1)) + .3) return y > len - 1.6 ? 'p' : y > len / 2 ? 'g' : 'b'; return 0; }),
  gem: () => grid(10, (x, y) => { const d = Math.abs(x - CXM); if (y < 2.4) { if (d <= 3.4 + y * .9) return Math.floor((x + 1) / 2.2) % 2 ? 'b' : 'g'; return 0; } if (d <= (8.4 - y) * .95) return x < CXM ? 'p' : 'b'; return 0; }),
  rocket: () => grid(12, (x, y) => { const d = Math.abs(x - CXM); if (y < 2.6) return d <= y * .7 + .2 ? 'r' : 0; if (y < 7.4 && d < 2.1) return inCirc(x, y, CXM, 4.2, 1) ? 'y' : 'b'; if (y >= 5.6 && y < 8 && d < 3.5 && d >= 1.6) return 'r'; if (y >= 7.4 && y < 9.6 && d < 1.6 - (y - 7.4) * .45) return y < 8.4 ? 'o' : 'y'; return 0; }),
  planet: () => grid(11, (x, y) => { const inR = Math.abs((y - 4.6) - (x - CXM) * .35) < .6 && Math.abs(x - CXM) < 5.6; if (inCirc(x, y, CXM, 4.6, 2.9)) return inR ? 'p' : (Math.floor(y) % 2 ? 'o' : 'y'); return inR ? 'p' : 0; }),
  alien: () => grid(11, (x, y) => { if (inCirc(x, y, 2.6, .6, .7) || inCirc(x, y, 8.4, .6, .7)) return 'y'; if ((Math.abs(x - (2.6 + (y - .6) * .7)) < .5 && y < 2.4) || (Math.abs(x - (8.4 - (y - .6) * .7)) < .5 && y < 2.4)) return 'g'; if (!inEll(x, y, CXM, 5, 4.2, 3.8)) return 0; if (inEll(x, y, 3.8, 4.2, 1.3, .8) || inEll(x, y, 7.2, 4.2, 1.3, .8)) return 'p'; if (Math.abs(y - 6.8) < .45 && Math.abs(x - CXM) < 1.5) return 'r'; return 'g'; }),
  star: () => { const V = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, R = i % 2 ? 2.1 : 5.1; V.push([CXM + Math.cos(a) * R, 5.2 + Math.sin(a) * R]); } const inP = (x, y) => { let o = false; for (let i = 0, j = V.length - 1; i < V.length; j = i++) { const [xi, yi] = V[i], [xj, yj] = V[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) o = !o; } return o; }; return grid(11, (x, y) => inP(x, y) ? (hyp(x - CXM, y - 5.2) < 1.8 ? 'o' : 'y') : 0); },
  ufo: () => grid(10, (x, y) => { if (inEll(x, y, CXM, 1.6, 2.3, 1.8)) return 'b'; if (inEll(x, y, CXM, 3.6, 5.4, 1.3)) return Math.abs(Math.sin(x * 1.3)) > .85 ? 'y' : 'p'; if (y > 4.6 && y < 8.4 && Math.abs(x - CXM) < (y - 4) * .55) return 'g'; return 0; }),
  moon: () => grid(11, (x, y) => { if (!inCirc(x, y, CXM, 4.8, 4.7)) return 0; if (inCirc(x, y, 3.9, 3.7, .7) || inCirc(x, y, 7.1, 3.7, .7)) return 'b'; const d = hyp(x - CXM, y - 4.6); if (d > 2.1 && d < 3.1 && y > 5.6) return 'r'; if (inCirc(x, y, 3, 1.8, .9) || inCirc(x, y, 8.4, 6.6, 1) || inCirc(x, y, 7.6, 1.4, .7)) return 'o'; return 'y'; }),
  house: () => grid(11, (x, y) => { const d = Math.abs(x - CXM); if (y < 3.8) return d <= y * 1.35 + .3 ? 'r' : 0; if (y < 8.6 && d < 4.3) { if (d < 1 && y > 5.8) return 'o'; if ((Math.abs(x - 3) < .9 || Math.abs(x - 8) < .9) && y > 4.4 && y < 6.4) return 'b'; return 'y'; } return 0; }),
  butterfly: () => grid(10, (x, y) => { if (Math.abs(x - CXM) < .55 && y > .4 && y < 7.6) return 'o'; if (inEll(x, y, 3, 2.8, 2.6, 2.4) || inEll(x, y, 8, 2.8, 2.6, 2.4)) return inCirc(x, y, 2.7, 2.6, .9) || inCirc(x, y, 8.3, 2.6, .9) ? 'y' : 'p'; if (inEll(x, y, 3.6, 6.2, 1.8, 1.5) || inEll(x, y, 7.4, 6.2, 1.8, 1.5)) return 'b'; return 0; }),
  galaxy: () => spiral(4.6, 4.8, ['p', 'b', 'y']),
  rings1: () => rings(4.4, 4.8, ['r', 'y', 'b', 'g', 'p'], 1.1),
  rings2: () => rings(4.4, 4.8, ['g', 'p', 'b', 'y', 'r'], 1.1),
};

// ---------- the 60 levels ----------
const W = ['oceaan', 'bos', 'snoep', 'woestijn', 'ijs', 'ruimte'];
const pal = n => [0, 1, 2, 3, 4, 5].slice(0, n);
const usedCols = rows => [...new Set(rows.join('').replace(/[^0-5]/g, '').split('').map(Number))].sort();
const DEFS = [];
const L = (o) => DEFS.push(o);
// world 1: ocean
L({ name: 'Eerste bellen', rows: full(4), pal: [0, 1, 2], cl: .6, tip: 'aim' });
L({ name: 'Wissel maar', rows: full(5), pal: [0, 1, 2], cl: .5, tip: 'swap' });
L({ name: 'Golfjes', rows: hstripes(6, ['r', 'y', 'b']), speck: .15, tip: 'bounce' });
L({ name: 'Trechter', rows: invTri(9), pal: pal(4), cl: .45 });
L({ name: 'Sterren in zee', rows: full(6), pal: pal(4), cl: .5, goal: 'stars', sp: o => sprinkle(o.rows, [], '*', 3, 3, 4, 51), tip: 'stars' });
L({ name: 'Visje', pic: 'fish' });
L({ name: 'Zeewier', rows: columns(10, 3, 1), pal: pal(4), cl: .55, goal: 'top', tip: 'top' });
L({ name: 'Ruit', rows: diamond(4, 4), pal: pal(4), cl: .45 });
L({ name: 'Diepzee', rows: vstripes(8, ['r', 'y', 'b', 'g'], 2), speck: .15, goal: 'stars', sp: o => sprinkle(o.rows, [], '*', 3, 3, 5, 91) });
L({ name: 'Kwal', pic: 'jelly' });
// world 2: forest (bombs, descending ceiling)
L({ name: 'Boem!', rows: full(7), pal: pal(4), cl: .45, sp: o => sprinkle(o.rows, [], '@', 3, 2, 5, 111), tip: 'bomb' });
L({ name: 'Dennenboom', pic: 'tree' });
L({ name: 'Het plafond zakt', rows: full(5), pal: pal(4), cl: .5, ceil: 7, tip: 'ceil' });
L({ name: 'Paddenstoel', pic: 'mushroom', goal: 'stars', sp: o => sprinkle(o.rows, [], '*', 3, 2, 5, 141) });
L({ name: 'Ruitjes', rows: checker(8, ['g', 'y', 'r', 'b']), speck: .15, sp: o => sprinkle(o.rows, [], '@', 3, 3, 7, 151) });
L({ name: 'Lianen', rows: columns(11, 3, 0), pal: pal(4), cl: .55, goal: 'top', ceil: 9 });
L({ name: 'Bergpad', rows: zigzag(3, 4), pal: pal(5), cl: .45, goal: 'stars', sp: o => sprinkle(o.rows, [], '*', 4, 1, 3, 171) });
L({ name: 'Bloem', pic: 'flower' });
L({ name: 'Bosbrand', rows: full(9), pal: pal(5), cl: .4, ceil: 9, sp: o => sprinkle(o.rows, [], '@', 2, 4, 8, 191) });
L({ name: 'Uil', pic: 'owl' });
// world 3: candy (rainbow)
L({ name: 'Regenboog', rows: full(7), pal: pal(5), cl: .45, sp: o => sprinkle(o.rows, [], '%', 3, 3, 6, 211), tip: 'rain' });
L({ name: 'IJsje', pic: 'icecream' });
L({ name: 'Zuurstok', rows: dstripes(9, ['r', 'y', 'p', 'b']), speck: .15 });
L({ name: 'Lolly', pic: 'lolly', goal: 'top' });
L({ name: 'Snoepregen', rows: full(6), pal: pal(5), cl: .45, ceil: 8, sp: o => sprinkle(o.rows, [], '%', 3, 2, 5, 251) });
L({ name: 'Cupcake', pic: 'cupcake', goal: 'stars', sp: o => sprinkle(o.rows, [], '*', 3, 2, 5, 261) });
L({ name: 'Toverringen', pic: 'rings1', sp: o => sprinkle(o.rows, [], '%', 2, 2, 7, 271) });
L({ name: 'Snoephart', pic: 'heart', sp: o => sprinkle(o.rows, [], '@', 2, 2, 8, 281) });
L({ name: 'Snoepdoos', rows: checker(9, ['r', 'p', 'y', 'g', 'b']), speck: .15, goal: 'stars', sp: o => sprinkle(o.rows, sprinkle(o.rows, sprinkle(o.rows, [], '*', 4, 5, 8, 291), '@', 2, 2, 6, 292), '%', 2, 2, 7, 293) });
L({ name: 'Grote snoepje', pic: 'candy', ceil: 9, sp: o => sprinkle(o.rows, [], '%', 2, 1, 6, 301) });
// world 4: desert (stone)
L({ name: 'Steenhard', rows: full(7), pal: pal(4), cl: .45, sp: o => sprinkle(o.rows, [], '#', 5, 2, 6, 311), tip: 'stone' });
L({ name: 'Cactus', pic: 'cactus', sp: o => sprinkle(o.rows, [], '#', 3, 5, 10, 321) });
L({ name: 'Piramide', pic: 'pyramid', goal: 'top' });
L({ name: 'Woestijnzon', pic: 'sun', sp: o => sprinkle(o.rows, [], '#', 4, 2, 9, 341) });
L({ name: 'Zandstorm', rows: full(6), pal: pal(5), cl: .45, ceil: 8, sp: o => sprinkle(o.rows, [], '#', 4, 2, 5, 351) });
L({ name: 'Palmboom', pic: 'palm' });
L({ name: 'Schatkist', rows: full(8), pal: pal(5), cl: .45, goal: 'stars', sp: o => { const sp = []; const st = [[6, 2], [6, 8], [7, 5]]; for (const [r, c] of st) { spAt(sp, r, c, '*'); for (const [a, b] of nbr(r, c)) if (inb(o.rows, a, b) && a < r) spAt(sp, a, b, '#'); } return sp; } });
L({ name: 'Woestijnruit', rows: diamond(4.4, 4.4), pal: pal(5), cl: .45, sp: o => { const sp = []; for (let r = 3; r <= 6; r++) for (let c = 0; c < 11; c++) if (o.rows[r] && o.rows[r][c] !== '.' && Math.abs(xOf(r, c) - CXM) < 1.2) spAt(sp, r, c, '#'); return sp; } });
L({ name: 'Duinen', rows: wave(3.4, 2.4), pal: pal(5), cl: .45, ceil: 10, sp: o => sprinkle(o.rows, sprinkle(o.rows, [], '#', 3, 2, 6, 391), '@', 3, 2, 6, 392) });
L({ name: 'Slang', pic: 'snake', goal: 'top' });
// world 5: ice
L({ name: 'Bevroren', rows: full(7), pal: pal(4), cl: .45, sp: o => sprinkle(o.rows, [], '~', 6, 2, 6, 411), tip: 'ice' });
L({ name: 'Sneeuwpop', pic: 'snowman' });
L({ name: 'Sneeuwvlok', pic: 'flake', sp: o => sprinkle(o.rows, [], '~', 6, 1, 9, 431) });
L({ name: 'Pinguïn', pic: 'penguin', goal: 'stars', sp: o => sprinkle(o.rows, [], '*', 3, 2, 5, 441) });
L({ name: 'IJstijd', rows: full(6), pal: pal(5), cl: .45, ceil: 8, sp: o => sprinkle(o.rows, [], '~', 6, 1, 5, 451) });
L({ name: 'Iglo', pic: 'igloo', goal: 'top', sp: o => sprinkle(o.rows, [], '~', 5, 2, 8, 461) });
L({ name: 'IJsschatten', rows: full(8), pal: pal(5), cl: .45, goal: 'stars', sp: o => { const sp = []; for (const [r, c] of [[6, 1], [6, 9], [7, 4], [7, 6]]) { spAt(sp, r, c, '*'); for (const [a, b] of nbr(r, c)) if (inb(o.rows, a, b)) spAt(sp, a, b, '~'); } return sp; } });
L({ name: 'IJspegels', pic: 'icicles', sp: o => sprinkle(o.rows, sprinkle(o.rows, [], '~', 5, 1, 8, 481), '#', 3, 2, 7, 482) });
L({ name: 'Noorderlicht', pic: 'rings2', sp: o => sprinkle(o.rows, sprinkle(o.rows, [], '~', 5, 1, 9, 491), '%', 2, 2, 8, 492) });
L({ name: 'Kristal', pic: 'gem', ceil: 10, sp: o => sprinkle(o.rows, [], '~', 6, 1, 8, 501) });
// world 6: space (colour changers)
L({ name: 'Kleurwissel', rows: full(7), pal: pal(5), cl: .45, sp: o => sprinkle(o.rows, [], '?', 4, 2, 6, 511), tip: 'chg' });
L({ name: 'Raket', pic: 'rocket' });
L({ name: 'Ringplaneet', pic: 'planet', sp: o => sprinkle(o.rows, [], '?', 3, 2, 8, 531) });
L({ name: 'Ruimtewezen', pic: 'alien', goal: 'stars', sp: o => sprinkle(o.rows, [], '*', 3, 2, 6, 541) });
L({ name: 'Meteorenregen', rows: full(6), pal: pal(6), cl: .5, ceil: 9, sp: o => sprinkle(o.rows, sprinkle(o.rows, [], '?', 3, 1, 5, 551), '@', 2, 1, 5, 552) });
L({ name: 'Vallende ster', pic: 'star', goal: 'stars', sp: o => sprinkle(o.rows, sprinkle(o.rows, [], '*', 4, 2, 6, 561), '#', 3, 2, 8, 562) });
L({ name: 'Vliegende schotel', pic: 'ufo', goal: 'top', sp: o => sprinkle(o.rows, [], '?', 2, 2, 5, 571) });
L({ name: 'Ruimtestation', rows: checker(9, ['r', 'y', 'b', 'g', 'p', 'o']), speck: .15, sp: o => sprinkle(o.rows, sprinkle(o.rows, sprinkle(o.rows, sprinkle(o.rows, [], '?', 2, 2, 8, 581), '#', 3, 2, 8, 582), '~', 3, 2, 8, 583), '@', 2, 2, 8, 584) });
L({ name: 'Melkweg', pic: 'galaxy', ceil: 10, sp: o => sprinkle(o.rows, sprinkle(o.rows, [], '?', 3, 2, 8, 591), '%', 2, 2, 8, 592) });
L({ name: 'Maangezicht', pic: 'moon', sp: o => sprinkle(o.rows, sprinkle(o.rows, sprinkle(o.rows, sprinkle(o.rows, [], '*', 4, 2, 6, 601), '~', 4, 2, 9, 602), '#', 3, 2, 9, 603), '@', 2, 2, 9, 604) });

function build(def, i) {
  const id = i + 1, w = Math.floor(i / 10);
  let rows = def.rows;
  if (def.pic) {                                   // measure, then squeeze into rows 1..10 under a band of random bubbles
    PIC = { band: 0, sy: 1, rows: 16 }; const h = P[def.pic]().length;
    const band = def.band == null ? 1 : def.band, maxR = 11 - band;
    PIC = { band, sy: Math.min(1, (maxR - .3) / h), rows: 11 }; rows = P[def.pic](); PIC = null;
    rows = speckle(rows, def.speck == null ? .32 : def.speck, 7 + i * 13);
    if (band && def.strings !== false) rows = strings(rows, band, def.step || 2);
  } else if (def.speck) rows = speckle(rows, def.speck, 7 + i * 13);
  rows = anchor(rows.slice());
  const lv = { id, w, name: def.name, goal: def.goal || 'clear', rows, seed: 1000 + id * 7, cl: def.cl == null ? (def.pic ? .2 : .45) : def.cl };
  const uc = usedCols(rows);
  lv.pal = [...new Set([...(def.pal || []), ...uc])].sort();
  for (let c = 0; lv.pal.length < (def.pic ? (i >= 20 ? 5 : 4) : 3) && c < 6; c++) if (!lv.pal.includes(c)) lv.pal.push(c);
  lv.pal.sort();
  if (def.sp) { const sp = def.sp({ rows }); if (sp.length) lv.sp = sp.map(s => s.replace(/ /g, '.')); }
  if (def.ceil) lv.ceil = def.ceil;
  if (def.tip) lv.tip = def.tip;
  return lv;
}
function play(lv, seed, cap = 400) {
  const S = C.newState(Object.assign({}, lv, { lim: 0 }), seed);
  while (!S.won && !S.lost && S.shots < cap) { const m = C.botMove(S); if (m.swap) C.swapShots(S); C.shoot(S, m.ang); }
  return { won: S.won, shots: S.shots, score: S.score };
}
const only = +process.argv[2] || 0, SEEDS = +process.env.SEEDS || 40;
const prev = fs.existsSync(path.join(here, 'bssrc/levels.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'bssrc/levels.json'), 'utf8')) : null;
const out = [];
for (let i = 0; i < DEFS.length; i++) {
  if (only && i + 1 !== only) { if (prev && prev[i]) out.push(prev[i]); continue; }
  const lv = build(DEFS[i], i), t0 = Date.now();
  let runs;
  for (let tries = 0; tries < 6; tries++) {
    runs = []; for (let s = 1; s <= SEEDS; s++) runs.push(play(lv, s * 7919 + i));
    if (runs.every(r => r.won)) break;
    if (lv.ceil) { lv.ceil++; continue; }
    break;
  }
  const sh = runs.map(r => r.shots).sort((a, b) => a - b), q = p => sh[Math.min(sh.length - 1, Math.floor(p * sh.length))];
  const lost = runs.filter(r => !r.won).length;
  const max = sh[sh.length - 1];
  if (!lv.ceil) lv.lim = max + Math.max(5, Math.ceil(max * .35));
  lv.st = [q(.5) + 1, Math.max(q(.5) + 3, q(.9) + 3)];             // bot median + 1 for 3 stars: the bot plays better than most people
  out.push(lv);
  console.log(String(lv.id).padStart(2), lv.name.padEnd(18), lv.goal.padEnd(5), 'pal', lv.pal.join(''), 'rows', lv.rows.length, lv.ceil ? 'ceil ' + lv.ceil : 'lim ' + lv.lim, 'st', lv.st.join('/'), 'shots', sh.join(','), lost ? 'LOST ' + lost : '', (Date.now() - t0) + 'ms');
}
fs.writeFileSync(path.join(here, 'bssrc/levels.json'), JSON.stringify(out));
console.log('levels', out.length);
