// Node loader for the deterministic parts (data + core + ai): import { load } from './load.mjs'; const { CAST, Core, AI } = load();
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function load() {
  const src = ['data.js', 'core.js', 'ai.js'].filter(f => fs.existsSync(path.join(here, f))).map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
  return new Function(src + '\nreturn { CAST, CAST_BY, STAGES, BASE_NORMALS, INPUT_TXT, Core, AI: typeof AI === "undefined" ? null : AI };')();
}
