// Node loader for the logic part (data + core):  import { load } from './lgsrc/load.mjs'; const L = load();
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function load() {
  const src = ['data.js', 'core.js'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
  return new Function(src + '\nreturn { Core, CATS, CAT, NAMES, GROUP, DAYS, NUMW, dur };')();
}
