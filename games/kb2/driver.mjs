// In-page solution driver for De Drie Kabouters v2. It only uses the game's own input path
// (__kb.keys = held buttons, __kb.press = button presses, __kb.use/give = inventory buttons)
// and advances the game with the fixed-timestep __kb.step(n).
export function kbRun(cmd) {
  const K = window.__kb, k = K.keys, E = () => K.gn[K.cur];
  const st = s => K.step(Math.max(1, Math.round(s / K.STEP)));
  const rel = () => { k.l = k.r = k.u = k.d = k.j = false; };
  const play = () => K.state === 'play';
  const c = cmd[0];
  if (c === 'sel') { K.select(cmd[1]); st(.02); }
  else if (c === 'A') { K.press('a'); st(cmd[1] || .06); }
  else if (c === 'B') { K.press('b'); st(cmd[1] || .06); }
  else if (c === 'act') { K.press('x'); st(.06); }
  else if (c === 'wait') st(cmd[1]);
  else if (c === 'hold') { for (const ch of cmd[1]) k[ch] = true; st(cmd[2]); rel(); st(.04); }
  else if (c === 'face') { k[cmd[1]] = true; st(1 / 120); rel(); st(.03); }
  else if (c === 'go') {
    const tx = cmd[1], tol = cmd[2] || .1; let t = 0, stuck = 0, lastX = 1e9;
    while (t < 30 && play()) {
      const e = E(), cx = e.x + e.w / 2, dx = tx - cx, v = e.vx;
      rel();
      if (Math.abs(dx) < tol && Math.abs(v) < .9) break;
      const ice = K.tile(Math.floor(cx), Math.floor(e.y + e.h + .05)) === 9, a = ice ? 6.5 : 50;
      if (Math.sign(v) === Math.sign(dx) && Math.abs(dx) < v * v / (2 * (ice ? a : 58)) + .02) { if (ice) k[dx > 0 ? 'l' : 'r'] = true; }
      else if (Math.abs(dx) >= tol) k[dx > 0 ? 'r' : 'l'] = true;
      st(1 / 120); t += 1 / 120;
      if (Math.abs(e.x - lastX) < 1e-5 && e.onGround && Math.abs(dx) >= tol) { if (++stuck > 150) break; } else stuck = 0;
      lastX = e.x;
    }
    rel(); st(.04);
  } else if (c === 'jump') {
    const [, dir, hold, stopX, pre] = cmd; if (dir) k[dir] = true;
    if (pre) st(pre);
    K.press('a'); k.j = true; st(Math.max(.02, hold)); k.j = false;
    for (let i = 0; i < 600 && play(); i++) {
      const e = E(); if (e.onGround && i > 2) break;
      if (stopX != null && dir && ((dir === 'r' && e.x + e.w / 2 >= stopX) || (dir === 'l' && e.x + e.w / 2 <= stopX))) k[dir] = false;
      st(1 / 120);
    }
    rel(); st(.05);
  } else if (c === 'runjump') {         // run in a direction and jump when passing atX: runjump dir atX hold [stopX]
    const [, dir, atX, hold, stopX] = cmd; k[dir] = true;
    for (let i = 0; i < 2400 && play(); i++) { const e = E(), x = e.x + e.w / 2; if (dir === 'r' ? x >= atX : x <= atX) break; st(1 / 240); }
    return kbRun(['jump', dir, hold, stopX]);
  } else if (c === 'climb') {
    k[cmd[1]] = true; st(.08);
    for (let i = 0; i < 2400 && E().climb && play(); i++) st(1 / 120);
    rel(); st(.06);
  } else if (c === 'use' || c === 'give') {
    const e = E(), i = e.inv.indexOf(cmd[1]);
    if (i < 0) return { err: `no ${cmd[1]} in inventory of ${K.cur}: ${e.inv}` };
    K.slot(i); const ok = c === 'use' ? K.use() : K.give(); st(.05);
    if (!ok) return { err: `${c} ${cmd[1]} failed` };
  } else if (c === 'hunt') {
    for (let t = 0; t < 15 && play(); t += 1 / 60) {
      const e = E(), fs = K.foes.filter(f => !f.dead && (f.t === 'walker' || f.t === 'knight') && Math.abs(f.y + f.h - e.y - e.h) < .6 && Math.abs(f.x - e.x) < (cmd[1] || 20)); if (!fs.length) break;
      const f = fs.reduce((a, b) => Math.abs(a.x - e.x) < Math.abs(b.x - e.x) ? a : b), dx = f.x + f.w / 2 - e.x - e.w / 2;
      rel();
      if (Math.abs(dx) < 1.25 && e.hamT <= 0) { k[dx > 0 ? 'r' : 'l'] = true; st(1 / 120); rel(); K.press('a'); st(.4); }
      else { k[dx > 0 ? 'r' : 'l'] = true; st(1 / 60); }
    }
    rel(); st(.1);
  } else if (c === 'shoot') {           // Sterk: keep firing the slingshot at the foes in front until they are gone
    for (let t = 0; t < (cmd[1] || 12) && play(); t += 1 / 60) {
      const e = E(), fs = K.foes.filter(f => !f.dead && (f.x + f.w / 2 - e.x - e.w / 2) * e.face > 0 && Math.abs(f.x - e.x) < 14 && f.y < e.y + e.h && f.y + f.h > e.y); if (!fs.length) break;
      if (e.throwCd <= 0) K.press('b'); st(1 / 60);
    }
    st(.1);
  } else if (c === 'cross') {           // wait until the fire jet in column cmd[1] has just gone out, then walk to cmd[2]
    const o = K.objs.find(o => o.t === 'fire' && o.c === cmd[1]); let t = 0;
    while (t < 8) { const p = (K.time + o.ph) % o.per; if (!o.on && p >= o.dur + .02 && p < o.dur + .2) break; st(1 / 120); t += 1 / 120; }
    return kbRun(['go', cmd[2]]);
  } else if (c === 'dashkill') {        // Snel: wait for foes in front and ram them (walks up to standing foes)
    for (let t = 0; t < (cmd[1] || 10) && play(); t += 1 / 60) {
      const e = E(), fs = K.foes.filter(f => !f.dead && (f.x + f.w / 2 - e.x - e.w / 2) * e.face > 0 && Math.abs(f.x - e.x) < 9 && f.y < e.y + e.h && f.y + f.h > e.y); if (!fs.length) break;
      const f = fs.reduce((a, b) => Math.abs(a.x - e.x) < Math.abs(b.x - e.x) ? a : b), d = Math.abs(f.x + f.w / 2 - e.x - e.w / 2);
      rel();
      if (d < 2.6 && e.dashCd <= 0 && e.onGround && e.stun <= 0) K.press('b');
      else if (d > 2.6 && (f.t === 'archer' || cmd[2])) k[e.face > 0 ? 'r' : 'l'] = true;
      st(1 / 60);
    }
    rel(); st(.3);
  } else if (c === 'until') {
    const f = new Function('K', 'return (' + cmd[1] + ')'); let t = 0;
    while (!f(K) && t < (cmd[2] || 10) && play()) { st(1 / 60); t += 1 / 60; }
    if (!f(K)) return { err: `until timeout: ${cmd[1]}` };
  }
  const e = E();
  return { state: K.state, cur: K.cur, t: +K.time.toFixed(2), g: K.gn.map(g => `${(g.x + g.w / 2).toFixed(2)},${(g.y + g.h).toFixed(2)}♥${g.hearts}${g.home ? '✓' : ''}${g.dead ? '✗' : ''}[${g.inv}]`).join(' | '), gems: `${K.gemGot}/${K.gemTotal}`, foes: K.foes.filter(f => !f.dead).length };
}
