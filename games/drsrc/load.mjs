// Node loader for the deterministic parts (build + levels + core):  import { load } from './drsrc/load.mjs'; const D = load();
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function load(medals = null) {
  let src = ['build.js', 'levels.js', 'core.js'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
  src = src.replace('/*MEDALS*/null', JSON.stringify(medals));
  return new Function(src + '\nreturn { TH, T, MAT, WORLDS, LEVELS, buildLevel, genEndless, rng, KB, ST, CORE_V, Core, DSL: { R, G, U, D, Ug, Dg, box, wall, blk, low, coin, cp, fin, spring, spikes, crum, plank, belt, saw, laser, vent, crate, bar, zip, plat, hint, wp } };')();
}
