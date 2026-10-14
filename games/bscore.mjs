// loads bssrc/core.js (the same code the game runs) as a Node module
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, 'bssrc/core.js'), 'utf8');
const names = ['NC','LIMIT','ROWS','RH','FW','LX','LY','DEAD','FH','AMIN','K_N','K_STAR','K_BOMB','K_RAIN','K_STONE','K_ICE','K_CHG','newState','newEndless','shoot','trace','snap','botMove','clone','swapShots','armSpecial','count','lowest','row0','present','serialize','deserialize','gridKey','each','nbrs','cxOf','cyOf','rowLen','starsFor','mkR','pushRow'];
export const C = new Function(src + '\nreturn {' + names.join(',') + '};')();
