import { existsSync as require_exists } from 'node:fs';
// screenshots of every fighter on every stage: node vdshots.mjs [index.html]  -> ../gfx/vd_f_<id>_*.png
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'vdtest', 'index.html'));
const GFX = path.join(here, '..', 'gfx');
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); localStorage.setItem('vd.stats', '{"unlocked":1}'); });
const ids = ['dex', 'truus', 'moer', 'sol', 'bram', 'kiki', 'sjaak', 'nevel'];
const W = ms => p.waitForTimeout(ms), ev = (f, a) => p.evaluate(f, a), shot = n => p.screenshot({ path: path.join(GFX, `vd_f_${n}.png`) });
for (let i = 0; i < 8; i++) {
  const a = ids[i], o = ids[(i + 3) % 8];
  await p.goto(target); await W(400); await ev(() => document.querySelector('#tileVd').scrollIntoView({ block: 'center' })); await p.tap('#tileVd'); await W(500);
  await p.tap('[data-m="cpu"]'); await W(250); await p.tap(`[data-c="${a}"]`); await W(120); await p.tap(`[data-c="${o}"]`); await W(120);
  await ev(i => { __vd.G.stageSel = i; __vd.opt.easy = true; }, i); await p.tap('#vdSelGo'); await W(300); await ev(() => { __vd.G.vsT = 999; });
  for (let k = 0; k < 60 && (await ev(() => __vd.M && __vd.M.phase)) !== 'fight'; k++) await W(100);
  await ev(() => __vd.freezeCpu(true));
  const place = () => ev(() => { const M = __vd.M; M.P[0].x = 520; M.P[1].x = 700; M.P[0].hp = M.P[0].mhp; M.P[1].hp = M.P[1].mhp; });
  await place(); await W(700); await shot(`${a}_idle`);
  await ev(() => { __vd.PADS[0].pend |= 32; }); await W(110); await shot(`${a}_heavy`); await W(600);
  await place(); await W(300); await ev(() => { __vd.PADS[0].pend |= 256; }); await W(280); await shot(`${a}_special`); await W(1200);
  await place(); await W(300); await ev(() => { __vd.meter(0, 100); __vd.PADS[0].pend |= 512; }); await W(160); await shot(`${a}_superflash`); await W(650); await shot(`${a}_super`); await W(1500);
}
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
