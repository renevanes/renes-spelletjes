import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const p = await (await b.newContext({...devices['Pixel 7']})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>localStorage.setItem('kj.settings', JSON.stringify({speed:'turbo', rounds:16})));
await p.addInitScript(()=>localStorage.setItem('app.cfg','{"seen":"9.99"}'));
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname));
// ---- rule unit tests
const unit = await p.evaluate(()=>{
  const K=window.__kj, id=(s,r)=>s*13+r-1, out=[];
  const base = (over)=>Object.assign({trump:1, hands:[[],[],[],[]], trick:[], played:[], chooser:0}, over);
  // 1 must follow suit
  K.G = base({hands:[[id(0,7),id(0,1),id(2,8)],[],[],[]], trick:[{p:3,c:id(0,10)}]});
  out.push(['follow', JSON.stringify(K.legal(0).sort())===JSON.stringify([id(0,7),id(0,1)].sort())]);
  // 2 cannot follow -> must trump (rotterdams), overtrump
  K.G = base({hands:[[id(1,7),id(1,11),id(2,8)],[],[],[]], trick:[{p:3,c:id(0,10)},{p:2,c:id(1,9)}]}); // partner trumped with 9
  out.push(['overtrump over partner (rotterdams)', JSON.stringify(K.legal(0))===JSON.stringify([id(1,11)])]);
  // 3 cannot overtrump -> no undertrump if other cards
  K.G = base({hands:[[id(1,7),id(2,8)],[],[],[]], trick:[{p:3,c:id(0,10)},{p:2,c:id(1,9)}]});
  out.push(['no undertrump', JSON.stringify(K.legal(0))===JSON.stringify([id(2,8)])]);
  // 4 trump led must overtrump
  K.G = base({hands:[[id(1,7),id(1,1),id(1,11)],[],[],[]], trick:[{p:3,c:id(1,9)}]});
  out.push(['trump led overtrump', JSON.stringify(K.legal(0))===JSON.stringify([id(1,11)])]);
  // 5 roem: 3-seq 20, stuk 20, 4 jacks 200
  K.G = base({});
  out.push(['seq3', K.roemOf([{c:id(0,7)},{c:id(0,8)},{c:id(0,9)},{c:id(2,1)}])===20]);
  out.push(['seq4', K.roemOf([{c:id(0,10)},{c:id(0,11)},{c:id(0,12)},{c:id(0,13)}])===50]);
  out.push(['stuk+seq', K.roemOf([{c:id(1,12)},{c:id(1,13)},{c:id(1,1)},{c:id(0,7)}])===40]);
  out.push(['4 jacks', K.roemOf([{c:id(0,11)},{c:id(1,11)},{c:id(2,11)},{c:id(3,11)}])===200]);
  out.push(['4 aces', K.roemOf([{c:id(0,1)},{c:id(1,1)},{c:id(2,1)},{c:id(3,1)}])===100]);
  // 6 winner: trump 7 beats non-trump ace
  out.push(['winner', K.winnerOf([{p:0,c:id(0,1)},{p:1,c:id(1,7)},{p:2,c:id(0,10)},{p:3,c:id(2,1)}]).p===1]);
  // 7 non-trump order: 10 beats K
  out.push(['10>K', K.winnerOf([{p:0,c:id(0,13)},{p:1,c:id(0,10)}]).p===1]);
  K.G = null; return out;
});
console.log(unit.filter(x=>!x[1]).length ? 'FAIL '+JSON.stringify(unit.filter(x=>!x[1])) : 'all '+unit.length+' rule tests passed');
// ---- full simulated game, human seat auto-played
await p.tap('#tileKj'); await p.waitForTimeout(300);
await p.screenshot({path:'k_start.png'});
let deals=0, sums=[];
for (let i=0;i<4000;i++){
  const st = await p.evaluate(()=>{ const G=__kj.G; if(!G) return {phase:'none'};
    return {phase:G.phase, bid:G.bidTurn, turn:G.turn, n:G.log.length, res:document.querySelector('#kjResModal').classList.contains('show'), end:document.querySelector('#kjEndModal').classList.contains('show')}; });
  if (st.end) break;
  if (st.res) {
    const l = await p.evaluate(()=>{const G=__kj.G; const l=G.log[G.log.length-1]; return {pts:l.pts, roem:l.roem, score:l.score}});
    sums.push(l.pts[0]+l.pts[1]); deals++;
    if (deals===2) await p.screenshot({path:'k_res.png'});
    await p.tap('#kjResNext'); await p.waitForTimeout(50); continue;
  }
  if (st.phase==='bid' && st.bid===0 && await p.isVisible('#kjBid')) {
    if (deals===0 && i<40) await p.screenshot({path:'k_bid.png'});
    const forced = !(await p.isVisible('#kjBid button[data-s="-1"]'));
    await p.tap(forced ? '#kjBid button[data-s="1"]' : '#kjBid button[data-s="-1"]'); await p.waitForTimeout(30); continue;
  }
  if (st.phase==='play' && st.turn===0) {
    const c = await p.evaluate(()=>__kj.G.hands[0].length && __kj.G.trick.length<4 ? __kj.aiPlay(0) : null);
    if (c==null) { await p.waitForTimeout(100); continue; }
    if (deals===1) await p.screenshot({path:'k_play.png'});
    await p.locator(`.card.kj[data-id="${c}"]`).click({force:true}); await p.waitForTimeout(30); continue;
  }
  await p.waitForTimeout(120);
}
await p.screenshot({path:'k_end.png'});
console.log('deals', deals, 'card-point sums all 162:', sums.every(x=>x===162), sums.slice(0,5), 'errors', errs);
console.log(await p.evaluate(()=>JSON.stringify(__kj.G && {total:__kj.G.total, log:__kj.G.log.map(l=>l.score.join('-')+(l.note?' '+l.note:''))})));
await b.close();
