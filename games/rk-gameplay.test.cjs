const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('./rksrc/core.js');
const players=n=>Array.from({length:n},(_,i)=>({name:`Speler ${i+1}`,ai:true}));
function battle(dice='random',capital=false){
 const s=E.newGame(players(3),7,{dice,goal:capital?'capital':'world'});
 s.phase='attack';s.pool=0;s.territories[0]={owner:0,armies:60};s.territories[1]={owner:1,armies:2};
 if(capital)s.capitals=[0,1,41];
 return s;
}
test('instant blitz uses committed troops, retains reserves and resolves the complete battle',()=>{
 for(const dice of ['random','balanced']) for(let seed=1;seed<=100;seed++){
  const s=battle(dice);s.rng=seed;const before=JSON.stringify(s),next=E.apply(s,{type:'blitz',from:0,to:1,amount:8});
  assert.equal(JSON.stringify(s),before);assert.ok(E.validState(next));assert.ok(next.pending||next.territories[0].armies===52);
  assert.ok(next.lastBattle.blitz);assert.equal(next.lastBattle.balanced,dice==='balanced');
  assert.ok(next.lastBattle.attackLoss<=8);assert.ok(next.territories[0].armies>=51);
  if(next.pending)assert.equal(E.apply(next,{type:'occupy',amount:next.pending.suggested}).territories[0].armies,52); // Three moving troops may include the surviving committed troops.
  assert.equal(JSON.stringify(E.apply(s,{type:'blitz',from:0,to:1,amount:8})),JSON.stringify(next));
 }
 assert.throws(()=>E.apply(battle(),{type:'blitz',from:0,to:1,amount:60}));
});
test('balanced blitz trims unlikely outcomes while manual dice remain fair',()=>{
 const p=(E.battleOdds(1,1)-.1)/.8;assert.ok(Math.abs(E.battleOdds(1,1,2,'balanced')-p*p*(3-2*p))<1e-12);
 assert.equal(E.battleOdds(10,5,2,'balanced'),1);
 for(let seed=1;seed<=100;seed++){const s=battle('balanced');s.rng=seed;s.territories[0].armies=101;s.territories[1].armies=1;assert.ok(E.apply(s,{type:'blitz',from:0,to:1,amount:100}).lastBattle.attackLoss<=2);}
 const a=battle('random'),b=battle('balanced');
 assert.deepEqual(E.apply(a,{type:'attack',from:0,to:1,dice:3}).lastBattle,E.apply(b,{type:'attack',from:0,to:1,dice:3}).lastBattle);
 let wins=0;for(let seed=1;seed<=5000;seed++){const s=battle('balanced');s.rng=seed*104729>>>0||1;s.territories[1].armies=1;
  if(E.apply(s,{type:'blitz',from:0,to:1,amount:1}).pending)wins++;
 }
 assert.ok(Math.abs(wins/5000-E.battleOdds(1,1,2,'balanced'))<.025);
});
test('manual initial deployment alternates batches and conserves starting armies for 2–6 players',()=>{
 for(let n=2;n<=6;n++){
  let s=E.newGame(players(n),n,{setup:'manual'}),steps=0;
  assert.equal(s.phase,'deploy');assert.ok(E.validState(s));
  assert.throws(()=>E.apply(s,{type:'advance'}),/startlegers/);
  while(s.phase==='deploy' && steps++<150){const previous=s.current;s=E.apply(s,E.chooseAction(s));if(s.pool===0){s=E.apply(s,{type:'advance'});if(s.phase==='deploy')assert.notEqual(s.current,previous);}
   assert.ok(E.validState(JSON.parse(JSON.stringify(s))));}
  assert.equal(s.phase,'reinforce');assert.equal(s.current,0);assert.equal(s.round,1);
  for(let i=0;i<n;i++)assert.equal(E.owned(s,i).reduce((sum,id)=>sum+s.territories[id].armies,0),[0,0,40,35,30,25,20][n]);
 }
});
test('capitals grant two reinforcements, defend with three dice and victory requires every capital',()=>{
 let s=E.newGame(players(3),9,{goal:'capital'});assert.equal(s.phase,'capital');
 const first=E.owned(s,0)[0];s=E.apply(s,{type:'capital',to:first});assert.equal(s.current,1);
 assert.throws(()=>E.apply(s,{type:'capital',to:first}),/eigen/);
 while(s.phase==='capital')s=E.apply(s,E.chooseAction(s));
 const cap=s.capitals[0];assert.equal(E.defenseDice(s,cap),3);assert.equal(E.defenseDice(s,s.territories.findIndex((_,i)=>!s.capitals.includes(i))),2);
 assert.equal(E.reinforcements(s),Math.max(3,Math.floor(E.owned(s).length/3))+E.bonus(s).reduce((n,c)=>n+c.bonus,0)+2);
 assert.ok(E.battleOdds(10,10,3)<E.battleOdds(10,10,2));
 s=battle('random',true);s.territories[0].armies=999;s.territories[41].owner=0;
 s=E.apply(s,{type:'blitz',from:0,to:1,amount:900});assert.equal(s.lastBattle.defendLoss,2); assert.ok(s.lastBattle.defend.length<=2); // Final rolls can have fewer defenders.
 assert.equal(s.winner,null);assert.ok(s.pending);
 s=E.apply(s,{type:'occupy',amount:s.pending.min});assert.equal(s.winner,0);assert.ok(E.owned(s).length<42);assert.ok(E.hasWon(s));
 const t=battle('random',true);t.territories[1].armies=5;assert.equal(E.apply(t,{type:'attack',from:0,to:1,dice:3}).lastBattle.defend.length,3);
});
test('secret missions are distinct, saved, checked after reinforcement and validated',()=>{
 let s=E.newGame(players(6),12,{goal:'mission'});assert.equal(new Set(s.missions).size,6);assert.ok(E.mission(s).text);
 s.missions[0]='garrisons'; // Keep this deterministic fixture unique.
 s.missions=s.missions.map((id,i)=>i>0&&id==='garrisons'?'territories':id);
 if(new Set(s.missions).size!==6)s.missions=['garrisons','territories','asia-africa','asia-south','north-africa','north-oceania'];
 s.territories=s.territories.map((t,i)=>({owner:i<18?0:1+(i%5),armies:i<17?2:1}));s.pool=1;
 assert.equal(E.hasWon(s),false);s=E.apply(s,{type:'reinforce',to:17,amount:1});assert.equal(s.winner,0);assert.ok(E.validState(s));
 const bad=JSON.parse(JSON.stringify(s));bad.missions[1]=bad.missions[0];assert.equal(E.validState(bad),false);
});
test('AI completes new goals with both blitz modes, auto/manual setup and save/resume',()=>{
 for(const goal of ['capital','mission'])for(const dice of ['random','balanced'])for(let seed=1;seed<=6;seed++){
  let s=E.newGame(players(2+seed%5),seed+30,{goal,dice,setup:seed%2?'manual':'auto'}),steps=0;
  while(s.phase!=='won'&&steps++<15000){s=E.apply(s,E.chooseAction(s,'strong'));if(steps%43===0)s=JSON.parse(JSON.stringify(s));}
  assert.equal(s.phase,'won',`${goal} ${dice} seed ${seed}`);assert.ok(E.hasWon(s,s.winner));assert.ok(E.validState(s));
 }
});
