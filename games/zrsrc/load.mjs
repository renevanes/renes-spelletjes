// Node loader for the deterministic parts (data + map + core + ai):  import { load } from './zrsrc/load.mjs'; const Z = load();
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function load() {
  const src = ['data.js', 'map.js', 'core.js', 'ai.js'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
  return new Function(src + '\nreturn { TPS, CORE_V, T_SAND, T_ROCK, T_DUNE, T_CLIFF, FACTIONS, MULT, UT, BT, TIER, DIFFS, SIZES, MISSIONS, OBJ_TXT, UNIT_CAP, missionCfg, skirmishCfg, genMap, rng, Core, AI };')();
}
