// Wereldquiz – writes the country table (wqcountries.mjs) as compact JSON for the builder: wqsrc/countries.json
// Row: [iso2, name, alt names, capitals, capital alternatives, continents, tier, note, extra(0/1)]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { COUNTRIES, EXTRA, SIMILAR } from './wqcountries.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const row = (r, x) => [r[0], r[2], r[3], r[4], r[5], r[6], r[7], r[8], x];
const out = { c: [...COUNTRIES.map(r => row(r, 0)), ...EXTRA.map(r => row(r, 1))], sim: SIMILAR };
fs.writeFileSync(path.join(here, 'wqsrc', 'countries.json'), JSON.stringify(out));
console.log('countries', COUNTRIES.length, '+ extra', EXTRA.length);
