import json
levels = json.load(open('kblevels.json'))
js = open('kb.js').read().replace('/*LEVELS*/', '  const LEVELS = ' + json.dumps(levels, ensure_ascii=False) + ';')
por = ''.join(f'<button class="kb-por" data-g="{i}" aria-label="{n}"><img alt=""><span class="kb-h"></span></button>' for i, n in enumerate(['Snel', 'Sterk', 'Schild']))
g = {
 'id': 'kb', 'tile': 'Kb', 'mod': 'Gnomes', 'bar': '#1d3324', 'statsKey': 'kb.progress', 'music': 'kb',
 'tileHtml': '''    <button class="tile" id="tileKb">
      <div class="art"><img class="tile-img" id="artKb" alt=""></div>
      <div>
        <h2>De Drie Kabouters</h2>
        <p>Werk samen met Snel, Sterk en Schild</p>
      </div>
    </button>
''',
 'screenHtml': f'''<!-- ============ DE DRIE KABOUTERS ============ -->
<section id="kb" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="kbBack" aria-label="Terug">‹</button>
    <div class="kb-hud" id="kbHud">{por}<span class="kb-key" id="kbKey" hidden>🗝</span></div>
    <button class="iconbtn" id="kbRetry" aria-label="Opnieuw">↻</button>
    <button class="iconbtn" id="kbLevelsBtn" aria-label="Levels">☰</button>
  </div>
  <div id="kbWrap"><canvas id="kbCanvas"></canvas><div id="kbBanner"></div>
    <div id="kbCtl"><div class="kb-pad"><button data-act="u" class="u" aria-label="Omhoog">▲</button><button data-act="l" class="l" aria-label="Links">◀</button><button data-act="r" class="r" aria-label="Rechts">▶</button><button data-act="d" class="d" aria-label="Omlaag">▼</button></div>
      <div class="kb-btns"><button data-act="s" class="sw" aria-label="Wissel">⇄</button><button data-act="a" class="ac" id="kbAct" aria-label="Actie">✋</button><button data-act="j" class="jp" id="kbJump" aria-label="Springen">⤒</button></div></div>
  </div>
</section>
''',
 'modalHtml': '''<div class="modal" id="kbStartModal">
  <div class="sheet">
    <h3>🍄 De Drie Kabouters</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Breng alle drie de kabouters naar de uitgang. Wissel met ⇄ (of tik op een gezichtje). <b>Snel</b> is vlug en kan springen. <b>Sterk</b> slaat met 🔨 rotsen en monsters weg en duwt kisten. <b>Schild</b> houdt pijlen en spinnen tegen met haar paddenstoel; houdt ze hem omhoog, dan zweeft ze en kan een ander erop staan. Iedereen kan klimmen en met de actieknop hendels overhalen.</p>
    <div class="pf-levels" id="kbLevels"></div>
    <div id="kbOptList"></div>
    <div class="row sticky-actions"><button class="btn" id="kbStartBack">Menu</button></div>
  </div>
</div>
<div class="modal center" id="kbEndModal">
  <div class="sheet">
    <div class="big-emoji">🍄</div>
    <h3 id="kbEndTitle"></h3>
    <p id="kbEndText"></p>
    <div class="row"><button class="btn" id="kbEndMenu">Levels</button><button class="btn" id="kbEndRetry">Opnieuw</button><button class="btn primary" id="kbEndNext">Volgende ▶</button></div>
  </div>
</div>''',
 'css': '''#kb{background:#10180f}
#kb .topbar{background:#1d3324;gap:4px}
.kb-hud{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;min-width:0}
.kb-por{display:flex;flex-direction:column;align-items:center;padding:2px 5px 1px;border-radius:12px;background:rgba(255,255,255,.07);border:2px solid transparent;color:#fff;position:relative;-webkit-tap-highlight-color:transparent}
.kb-por img{width:30px;height:30px;display:block}
.kb-por.on{border-color:var(--accent);background:rgba(242,193,78,.18)}
.kb-por.home::after{content:'✓';position:absolute;top:-2px;right:-2px;background:#3fae4a;color:#fff;border-radius:50%;width:15px;height:15px;font-size:10px;line-height:15px;text-align:center}
.kb-h{font-size:10px;letter-spacing:1px;line-height:1}
.kb-h i{font-style:normal;color:rgba(255,255,255,.25)} .kb-h i.f{color:#ff5a6a}
.kb-key{font-size:18px}
#kbWrap{position:relative;flex:1;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
#kbCanvas{position:absolute;left:0;top:0;display:block}
#kbBanner{position:absolute;left:50%;top:10px;transform:translate(-50%,-8px);background:rgba(10,20,10,.78);padding:7px 14px;border-radius:14px;font-size:13px;line-height:1.35;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;text-align:center;max-width:88%;width:max-content}
#kbBanner.show{opacity:1;transform:translate(-50%,0)}
#kbCtl{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:flex-end;padding:0 12px 12px;pointer-events:none}
.kb-pad{display:grid;grid-template-columns:repeat(3,54px);grid-template-rows:repeat(3,50px);gap:3px;pointer-events:none}
.kb-pad .u{grid-column:2;grid-row:1} .kb-pad .l{grid-column:1;grid-row:2} .kb-pad .r{grid-column:3;grid-row:2} .kb-pad .d{grid-column:2;grid-row:3}
#kbCtl button{pointer-events:auto;touch-action:none;border-radius:14px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.28);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;padding:0}
#kbCtl button.on{background:rgba(242,193,78,.45);border-color:var(--accent)}
.kb-btns{display:grid;grid-template-columns:62px 78px;grid-template-rows:54px 78px;gap:8px;pointer-events:none;margin-bottom:6px}
#kbCtl .kb-btns .sw{grid-column:1;grid-row:1;border-radius:50%;width:54px;height:54px;justify-self:center;font-size:22px;background:rgba(120,170,255,.2);border-color:rgba(140,190,255,.55)}
#kbCtl .kb-btns .ac{grid-column:1;grid-row:2;border-radius:50%;width:62px;height:62px;align-self:end;font-size:26px;background:rgba(229,120,52,.25);border-color:rgba(229,140,60,.6)}
#kbCtl .kb-btns .jp{grid-column:2;grid-row:1 / span 2;border-radius:50%;width:78px;height:78px;align-self:end;font-size:30px;background:rgba(90,200,110,.25);border-color:rgba(110,220,130,.6)}
#kbCtl .kb-btns .jp.off{opacity:.3}
#kb.big-ctl .kb-pad{grid-template-columns:repeat(3,64px);grid-template-rows:repeat(3,60px)} #kb.big-ctl .kb-btns{grid-template-columns:72px 92px;grid-template-rows:62px 92px} #kb.big-ctl #kbCtl .kb-btns .jp{width:92px;height:92px} #kb.big-ctl #kbCtl .kb-btns .ac{width:72px;height:72px}
#kbWrap.land #kbCtl{padding:0 8px 8px}
#kbWrap.land .kb-pad{grid-template-columns:repeat(3,44px);grid-template-rows:repeat(3,44px)}
#kbWrap.land .kb-btns{grid-template-columns:52px 64px;grid-template-rows:46px 64px;gap:6px} #kbWrap.land #kbCtl .kb-btns .jp{width:64px;height:64px} #kbWrap.land #kbCtl .kb-btns .ac{width:52px;height:52px} #kbWrap.land #kbCtl .kb-btns .sw{width:46px;height:46px}
#kbWrap.land #kbCtl button{background:rgba(0,0,0,.28);border-color:rgba(255,255,255,.35)}
@media (max-width:370px){.kb-por img{width:24px;height:24px}.kb-por{padding:2px 3px 1px}}''',
 'js': js,
 'gamesEntry': "  { id: 'kb', label: 'De Drie Kabouters', emoji: '🍄', bg: ['#3fae4a', '#1d5a2a'], enter: () => Gnomes.enter(), tile: 'tileKb' },\n",
 'statRow': "['kb', `${Object.keys(S.kb.best || {}).length}/8 levels`]",
 'wipe': ['kb.progress'],
 'trophies': "    ['k1', '🍄', 'Samen sterk', 'Haal het eerste level van De Drie Kabouters', S => Object.keys(S.kb.best || {}).length >= 1],\n    ['k8', '🏔️', 'De grote tocht', 'Haal alle 8 levels van De Drie Kabouters', S => Object.keys(S.kb.best || {}).length >= 8],",
 'track': '''    // De Drie Kabouters: playful forest folk
    kb: { bpm: 126, bars: 8, seed: 171, swing: .25, fn(a) {
      const K = 62, ch = [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M'], [0, 'M'], [5, 'M'], [2, 'm7'], [7, '7']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 62), bm = K - 24 + r;
        a.kick(a.at(b), .55); a.kick(a.at(b, 8), .4); a.rim(a.at(b, 4), .45); a.rim(a.at(b, 12), .45);
        for (let s = 0; s < 16; s += 2) a.shaker(a.at(b, s), s % 4 ? .55 : .3);
        [[0, 0], [6, 7], [8, 12], [12, 7]].forEach(([s, iv]) => a.bass(a.at(b, s), bm + iv, a.st * 2.5, .8, 'upright'));
        [0, 3, 6, 8, 11, 14].forEach((s, i) => a.pluck(a.at(b, s), cm[i % cm.length] + 12, a.st * 2, .35, .3));
        a.marimba(a.at(b, 4), cm[1] + 12, .35, -.35); a.marimba(a.at(b, 12), cm[2 % cm.length] + 12, .35, -.35);
      });
      melody(a, { chords: ch, root: K, scale: 'major', lo: 72, hi: 88, rhythm: 'even', rest: .1 }).forEach(n => a.lead(a.at(n.b, n.s), n.m, n.len * a.st, .7, { wave: 'triangle', cut: 4200, vol: .26, vib: 14, breath: .2 }));
    } },''',
 'sfx': {
   'kbSwing': "[() => { const d = buf(.3); sweep(d, 0, .2, 'bp', 500, 2200, 1.4, .35, .03); return d; }, .05, .3, 3]",
   'kbHit': "[() => { const d = buf(.6); thud(d, 0, 120, .9, .07); metal(d, 0, 900, .3, .07, [1, 2.3, 3.7]); grains(d, .01, .15, 12, 300, 1500, .2, .005, .02); return d; }, .15, .45, 3]",
   'kbLever': "[() => { const d = buf(.4); metal(d, 0, 1100, .3, .04, [1, 2.7]); thud(d, .05, 170, .45, .03); chip(d, .07, 520, 780, .07, .12, 'tri', 3000); return d; }, .12, .4, 1]",
   'kbShield': "[() => { const d = buf(.35); thud(d, 0, 230, .55, .05); chip(d, 0, 640, 960, .08, .12, 'tri', 2500); return d; }, .1, .35, 2]",
   'kbBlock': "[() => { const d = buf(.5); metal(d, 0, 1700, .35, .08, [1, 2.2, 3.4]); thud(d, 0, 190, .5, .04); return d; }, .15, .35, 3]",
   'kbSwitch': "[() => { const d = buf(.6); bell(d, 0, 988, .25, .35); bell(d, .06, 1480, .2, .35); return d; }, .2, .3, 1]",
   'kbDoor': "[() => { const d = buf(1.2); thud(d, 0, 90, .8, .12); metal(d, .04, 520, .3, .2, [1, 1.9, 3.1]); sweep(d, .12, .6, 'bp', 280, 520, 6, .18, .1); return d; }, .25, .45, 1]",
   'kbGate': "[() => { const d = buf(.9); grains(d, 0, .45, 22, 400, 1800, .14, .005, .02); metal(d, 0, 700, .25, .15, [1, 2.1, 3.3]); thud(d, .4, 120, .5, .06); return d; }, .2, .4, 1]",
   'kbHome': "[() => { const d = buf(1.2); [1047, 1319, 1568].forEach((f, i) => bell(d, i * .07, f, .25, .6)); return d; }, .35, .32, 1]",
 },
}
json.dump(g, open('kb.json', 'w'), ensure_ascii=False)
print('ok', len(js))
