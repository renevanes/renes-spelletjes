// Node loader for the deterministic parts (levels + core):  import { load } from './wksrc/load.mjs'; const K = load();
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function load() {
  const src = ['levels.js', 'core.js'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
  return new Function(src + '\nreturn { LEVELS, WORLDS, ITEMS, CODECOL, PER, NL, Core, CORE_V, cyc, TPS };')();
}
