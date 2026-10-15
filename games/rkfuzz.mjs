import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./rksrc/core.js');
let checked = 0;
for (let seed = 1; seed <= 100; seed++) {
  const n = 2 + seed % 5;
  let s = E.newGame(Array.from({ length: n }, (_, i) => ({ name: `Speler ${i + 1}`, ai: true })), seed);
  let moves = 0;
  while (s.phase !== 'won' && moves < 12000) {
    const before = JSON.stringify(s);
    assert.throws(() => E.apply(s, { type: 'reinforce', to: 99, amount: -1 }));
    assert.equal(JSON.stringify(s), before, 'Rejected actions must not mutate the state');
    s = E.apply(s, E.chooseAction(s, ['easy', 'normal', 'strong'][seed % 3]));
    assert.ok(E.validState(s), `Invalid state after seed ${seed}, move ${moves}`);
    if (moves % 41 === 0) s = JSON.parse(JSON.stringify(s)); // Resume at arbitrary phases, including occupation/trading.
    moves++;
    checked++;
  }
  assert.equal(s.phase, 'won', `Seed ${seed} did not finish`);
  assert.equal(E.owned(s, s.winner).length, 42);
}
console.log(`PASS: 100 complete seeded games; ${checked} valid actions, rejected actions and save/resume checks`);

let variants=0;
for(const goal of ['world','domination','capital','mission'])for(const dice of ['random','balanced'])for(const setup of ['auto','manual'])for(let sample=1;sample<=3;sample++){
 const seed=++variants+200,n=2+seed%5;
 let s=E.newGame(Array.from({length:n},(_,i)=>({name:`Speler ${i+1}`,ai:true})),seed,{goal,dice,setup}),moves=0;
 while(s.phase!=='won' && moves++<15000){
  const before=JSON.stringify(s);assert.throws(()=>E.apply(s,{type:'blitz',from:99,to:-1,amount:0}));assert.equal(JSON.stringify(s),before);
  s=E.apply(s,E.chooseAction(s,['easy','normal','strong'][sample-1]));
  assert.ok(E.validState(s),`${goal} ${dice} ${setup} move ${moves}`);
  if(moves%37===0)s=JSON.parse(JSON.stringify(s));
 }
 assert.equal(s.phase,'won',`${goal} ${dice} ${setup} sample ${sample}`);assert.ok(E.hasWon(s,s.winner));
}
console.log(`PASS: ${variants} additional full games across all goals, both blitz modes, both setup types and all AI difficulties`);
