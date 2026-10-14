// Vuistduel balance: AI vs AI on one difficulty, every pairing, both sides.
// node vdbalance.mjs [matchesPerPairPerSide=20] [level=normaal] [only=dex,sol]   (env PART=i/n splits the pairings over processes)
import { load } from './vdsrc/load.mjs';
const { CAST, Core, AI } = load();
const N = +(process.argv[2] || 20), LVL = process.argv[3] || 'normaal', ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const ids = CAST.map(c => c.id).filter(id => !ONLY || ONLY.includes(id));
const [pi, pn] = (process.env.PART || '0/1').split('/').map(Number);
const wins = {}, games = {}, mat = {}, stat = { matches: 0, rounds: 0, timeouts: 0, frames: 0, maxCombo: 0, maxComboDmg: 0, longCombos: [], perfect: 0, supers: 0, superKO: 0, dizzy: 0, throws: 0, techs: 0, draws: 0, stuck: 0 };
ids.forEach(a => { wins[a] = 0; games[a] = 0; mat[a] = {}; ids.forEach(b => mat[a][b] = [0, 0]); });
let pairNo = 0; const t0 = Date.now();
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  if (pairNo++ % pn !== pi) continue;
  for (let k = 0; k < 2 * N; k++) {
    const a = ids[i], b = ids[j], swap = k % 2, p = swap ? [b, a] : [a, b];
    const M = Core.newMatch({ p: p.map(ch => ({ ch })), stage: 'haven' });
    const ai = [AI.create(LVL, 1000 + k * 7919 + i * 31 + j, 0), AI.create(LVL, 5000 + k * 104729 + j * 17 + i, 1)];
    let f = 0, lastHp = '', still = 0;
    while (!M.over && f++ < 16000) {
      Core.step(M, [ai[0].input(M), ai[1].input(M)]);
      for (const e of M.ev) {
        if (e.t === 'hit') { const V = M.P[e.side]; if (V.combo > stat.maxCombo) stat.maxCombo = V.combo; const pct = V.comboDmg / V.mhp; if (pct > stat.maxComboDmg) stat.maxComboDmg = pct;
          if ((V.combo > 12 || pct > .5) && stat.longCombos.length < 10) stat.longCombos.push(`${M.P[1 - e.side].C.id}>${V.C.id} ${V.combo} hits ${Math.round(pct * 100)}%`); }
        if (e.t === 'super') stat.supers++; if (e.t === 'dizzy') stat.dizzy++; if (e.t === 'grab') stat.throws++; if (e.t === 'tech') stat.techs++;
      }
      if (M.phase === 'fight') { const h = M.P.map(F => F.hp).join(); if (h === lastHp) still++; else still = 0; lastHp = h; }
    }
    if (!M.over) { stat.stuck++; continue; }
    stat.matches++; stat.frames += f; stat.rounds += M.rounds.length; stat.timeouts += M.rounds.filter(r => r.timeout).length;
    stat.perfect += M.rounds.filter(r => r.perfect).length; stat.superKO += M.rounds.filter(r => r.superKO).length;
    if (M.winner < 0) { stat.draws++; continue; }
    const w = p[M.winner], l = p[1 - M.winner];
    wins[w]++; games[w]++; games[l]++; mat[w][l][0]++; mat[w][l][1]++; mat[l][w][1]++;
  }
}
const pct = x => (x * 100).toFixed(0).padStart(3) + '%';
if (process.env.JSON) { console.log(JSON.stringify({ wins, games, mat, stat })); process.exit(0); }
console.log(`niveau ${LVL}, ${stat.matches} wedstrijden in ${((Date.now() - t0) / 1000).toFixed(1)} s, gem. ${(stat.frames / stat.matches / 60).toFixed(0)} s per wedstrijd`);
console.log('        ' + ids.map(x => x.padStart(6)).join('') + '   totaal');
for (const a of ids) console.log(a.padEnd(8) + ids.map(b => a === b ? '     -' : mat[a][b][1] ? pct(mat[a][b][0] / mat[a][b][1]).padStart(6) : '     ?').join('') + '   ' + pct(wins[a] / games[a]));
console.log(JSON.stringify({ ...stat, frames: undefined }));
