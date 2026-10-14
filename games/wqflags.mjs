// Wereldquiz – flag prep: the SVG flags of npm flag-icons (MIT; the flag designs themselves are public domain),
// optimised with svgo (fewer decimals, merged paths) -> wqsrc/flags.json { iso2: svg }.
// Square flags (Zwitserland, Vaticaanstad) come from the 1x1 set; all others from the 4x3 set (Nepal keeps its own shape there).
// Usage: node wqflags.mjs   (env WQDATA = folder with node_modules: flag-icons, svgo; default ../wqdata)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { COUNTRIES, EXTRA } from './wqcountries.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const D = process.env.WQDATA || path.resolve(here, '..', 'wqdata');
const require = createRequire(path.join(D, 'package.json'));
const { optimize } = require('svgo');
const FI = path.join(D, 'node_modules', 'flag-icons', 'flags');
const SQUARE = new Set(['CH', 'VA']);
// flags with a lot of fine detail in their coat of arms: one decimal less (invisible at the size we show them)
const HEAVY = new Set(['RS', 'BO', 'MX', 'ES', 'SV', 'ME', 'BZ', 'DO', 'TM', 'GT', 'HR', 'AD', 'EC', 'VA', 'BT', 'FJ', 'AF', 'NI', 'CR', 'HT', 'PT', 'MD', 'SM', 'PE', 'PY', 'KZ', 'EG', 'DM', 'KI', 'GQ', 'ZM', 'ZW', 'UG', 'SA', 'AL', 'LI', 'MT', 'CY', 'KH', 'IR', 'LK', 'BN', 'PG', 'VE', 'BR', 'MN']);
const out = {}; let raw = 0, opt = 0;
for (const r of [...COUNTRIES, ...EXTRA]) {
  const code = r[0], f = path.join(FI, SQUARE.has(code) ? '1x1' : '4x3', code.toLowerCase() + '.svg');
  const src = fs.readFileSync(f, 'utf8'); raw += src.length;
  const res = optimize(src, { multipass: true, floatPrecision: HEAVY.has(code) ? 0 : 1, plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: { minify: true } } } }, 'removeDimensions'] });
  let s = res.data;
  // Nepal: flag-icons draws it left-aligned in a 4:3 box; crop the box to the flag itself so it can be shown centred, in its own shape
  if (code === 'NP') s = s.replace('viewBox="0 0 640 480"', 'viewBox="0 0 377 481"');
  if (!/viewBox/.test(s)) throw new Error('no viewBox ' + code);
  out[code] = s; opt += s.length;
}
fs.writeFileSync(path.join(here, 'wqsrc', 'flags.json'), JSON.stringify(out));
console.log('flags', Object.keys(out).length, 'raw', raw, 'optimised', opt);
