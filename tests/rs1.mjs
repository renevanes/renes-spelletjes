import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const land = process.argv[2]==='land';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const p = await (await b.newContext(land?{...devices['Pixel 7 landscape']}:{...devices['Pixel 7']})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname));
if(!land) await p.screenshot({path:'rs_menu.png', fullPage:true});
await p.tap('#tileRs'); await p.waitForTimeout(400);
await p.screenshot({path:`rs_start${land?'L':''}.png`});
await p.click('#rsGo'); await p.waitForTimeout(1200);
await p.screenshot({path:`rs_intro${land?'L':''}.png`});
// autopilot: dodge by checking obstacles ahead in-page
await p.evaluate(()=>{ setInterval(()=>{ const P=__rs.P; if(__rs.state!=='run') return; const LW=2.6;
  const ahead = (lane, d0, d1) => __rs.objs.filter(o=>o.lane===lane && o.t!=='bridge' && o.zN - P.z > d0 && o.zN - P.z < d1);
  const lane=P.lane; const near = ahead(lane, 0, 9 + (P.jet>0?0:0));
  if (!near.length || P.jet>0) return;
  const o = near[0];
  if (o.t==='ramp' || (o.t==='train' && P.y>3)) return;
  if (o.t==='low' && P.ground && o.zN-P.z<4.5) { __rs.act('u'); return; }
  if (o.t==='high' && o.zN-P.z<4) { __rs.act('d'); return; }
  // train or pole: change lane to the safest neighbour
  const score=l=>{ const a=ahead(l,-3,14); if(!a.length) return 2; if(a.some(x=>x.t==='ramp')) return 1.5; if(a.every(x=>x.t==='low'||x.t==='high')) return 1; return 0; };
  const opts=[lane-1,lane+1].filter(l=>l>=0&&l<=2).sort((a,b)=>score(b)-score(a));
  if (opts.length && score(opts[0])>0) __rs.act(opts[0]<lane?'l':'r');
 }, 40); });
const t0=Date.now(); let shot=0;
while(Date.now()-t0<45000){ const s=await p.evaluate(()=>__rs.state); if(s==='over') break; if(Date.now()-t0>(shot+1)*6000 && shot<4){ shot++; await p.screenshot({path:`rs_run${shot}${land?'L':''}.png`}); } await p.waitForTimeout(250); }
console.log('state', await p.evaluate(()=>__rs.state), 'score', Math.round(await p.evaluate(()=>__rs.score)), Math.round((Date.now()-t0)/1000)+'s', errs);
await p.screenshot({path:`rs_end${land?'L':''}.png`});
await b.close();
