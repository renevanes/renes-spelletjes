// Node loader for the pure logic (themes + generator):  import { load } from './wzsrc/load.mjs'; const W = load();
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function load() {
  const src = ['words.js', 'core.js'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
  return new Function(src + '\nreturn { THEMES, CORE_V, DIRS, LEVELS, BLOCK, BLOCK_FWD, GENERIC, rng, hashStr, wordsOf, revBad, related, rev, pal, linesOf, lineStrs, countIn, blocked, verify, cellsOf, freeCells, generate, dailySeed, wordAt, snapLine };')();
}
