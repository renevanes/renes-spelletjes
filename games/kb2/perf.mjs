import { existsSync as require_exists } from 'node:fs';
import { chromium } from 'playwright';
const S = new URL('../../build/work', import.meta.url).pathname;
const lvs = (process.argv[2] || '12').split(',').map(Number), rate = +(process.argv[3] || 6), land = process.argv.includes('land');
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext(land ? { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true } : { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('kb.progress', JSON.stringify({ v: 2, unlocked: 20, best: {}, stars: {}, gems: {} })); window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
await p.goto('file://' + S + '/kbtest/index.html'); await p.waitForTimeout(500);
await p.tap('#tileKb'); await p.waitForTimeout(+(process.env.WAIT||500));
const cdp = await ctx.newCDPSession(p);
for (const lv of lvs) {
  await p.evaluate(l => { __kb.load(l - 1); }, lv);
  await p.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    window.__lt.length = 0; __kb.keys.r = true; let n = 0, t0 = performance.now(), worst = 0, last = t0;
    await new Promise(res => { const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 4000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    __kb.keys.r = false;
    return { fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), worstFrame: Math.round(worst), longTasks: window.__lt.slice(), q: __kb.qScale };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log('level', lv, JSON.stringify(r));
}
await b.close();
