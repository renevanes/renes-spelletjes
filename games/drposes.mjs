// dev helper: a sheet of the runner's poses (build/gfx/dr_poses.png)
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
const ROOT = new URL('..', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const p = await (await b.newContext({ viewport: { width: 1400, height: 700 } })).newPage();
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); });
await p.goto('file://' + ROOT + 'build/work/drtest/index.html'); await p.waitForTimeout(300);
await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1400; c.height = 700; c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#8ac8f0'; document.body.appendChild(c);
  const g = c.getContext('2d'), { Rig, OUTFITS } = __dr;
  const st = (o) => Object.assign({ st: 0, gs: 0, vx: 0, vy: 0, rv: 0, rot: 0, ga: 0, wallT: 0, stT: 5, om: 0, face: 1 }, o);
  const list = [['idle', st({}), 0], ['run1', st({ gs: 9.5 }), 0], ['run2', st({ gs: 9.5 }), 1.5], ['sprint', st({ gs: 14 }), .8], ['jump', st({ st: 1, vy: -8, vx: 9 }), 0], ['fall', st({ st: 1, vy: 8, vx: 9 }), 0],
    ['tuck', st({ st: 1, vy: -2, rv: 14, rot: 1.2 }), 0], ['slide', st({ st: 2, gs: 9 }), 0], ['crawl', st({ st: 2, gs: 2 }), 0], ['wallrun', st({ st: 3, wallT: 10 }), 0], ['wall', st({ st: 3 }), 0], ['hang', st({ st: 4 }), 0],
    ['climb', st({ st: 5, stT: 7 }), 0], ['vault', st({ st: 6, stT: 5 }), 0], ['zip', st({ st: 7 }), 0], ['bar', st({ st: 8, om: 4, rot: -.6 }), 0], ['win', st({ st: 11 }), 0]];
  list.forEach(([nm, S, ph], i) => {
    const col = i % 9, row = Math.floor(i / 9), s = 120, x0 = 80 + col * 150, y0 = 280 + row * 330;
    g.setTransform(s, 0, 0, s, x0, y0);
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(-.7, 0, 1.4, .05);
    const P = Rig.pose(S, { ph: ph * 2, land: 0 }, 0), J = Rig.joints(P, 0, 0, 1, S.rot, {});
    Rig.draw(g, J, OUTFITS[i % 6], 1, false);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#123'; g.font = 'bold 16px sans-serif'; g.fillText(nm, x0 - 30, y0 + 30);
  });
});
await p.waitForTimeout(100); await p.screenshot({ path: ROOT + 'build/gfx/dr_poses.png' }); await b.close();
