import json
js = open('sd.js').read()
g = {
 'id': 'sd', 'tile': 'Sd', 'mod': 'Sudoku', 'bar': '#1c2c3c', 'statsKey': 'sd.stats', 'music': 'sd',
 'tileHtml': '''    <button class="tile" id="tileSd">
      <div class="art"><img class="tile-img" id="artSd" alt=""></div>
      <div>
        <h2>Sudoku</h2>
        <p>Vul het raster met 1 tot en met 9</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ SUDOKU ============ -->
<section id="sd" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="sdBack" aria-label="Terug">‹</button>
    <div class="sd-hud"><span id="sdLvl">Makkelijk</span><span>⏱ <b id="sdTime">0:00</b></span><span id="sdMistW">✗ <b id="sdMist">0</b></span></div>
    <button class="iconbtn" id="sdNew" aria-label="Nieuw spel">☰</button>
  </div>
  <div id="sdWrap">
    <div id="sdBoard"></div>
    <div id="sdSide">
      <div id="sdTools"><button data-t="undo"><b>↶</b><small>Terug</small></button><button data-t="erase"><b>⌫</b><small>Wissen</small></button><button data-t="pencil" id="sdPencil"><b>✎</b><small>Potlood</small></button><button data-t="hint"><b>💡</b><small>Hint</small></button></div>
      <div id="sdHint" aria-live="polite"></div>
      <div id="sdPad"></div>
    </div>
  </div>
</section>
''',
 'modalHtml': '''<div class="modal" id="sdStartModal">
  <div class="sheet">
    <h3>🔢 Sudoku</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Vul elk vakje zo dat in elke rij, elke kolom en elk blok van 3×3 de cijfers 1 tot en met 9 precies één keer staan. Tik een vakje aan en kies een cijfer. Met ✎ zet je kleine potloodnotities. Elke puzzel heeft precies één oplossing.</p>
    <div class="ms-levels" id="sdLevels"></div>
    <details class="sd-tech"><summary>Uitleg: zo los je het op</summary>
      <p>Een vakje heet bijvoorbeeld <b>R4K7</b>: rij 4 (van boven), kolom 7 (van links). Een <b>blok</b> is een vierkant van 3×3. Vraag je een hint, dan zie je stap voor stap waarom het klopt.</p>
      <ul>
        <li><b>Laatste vakje</b> – in een rij, kolom of blok is nog maar één vakje leeg: daar komt het cijfer dat nog ontbreekt.</li>
        <li><b>Enige plek</b> – kijk per cijfer: in een blok (of rij, of kolom) kan het cijfer maar op één plek, omdat de andere plekken al een rij, kolom of blok met dat cijfer hebben.</li>
        <li><b>Enige cijfer dat past</b> – in één vakje vallen alle cijfers af behalve één.</li>
        <li><b>Vast in één rij of kolom</b> – kan een cijfer in een blok alleen in één rij staan, dan kan het in de rest van die rij niet meer.</li>
        <li><b>Vast in één blok</b> – kan een cijfer in een rij alleen in één blok staan, dan kan het in de rest van dat blok niet meer.</li>
        <li><b>Tweetal / drietal</b> – twee vakjes in een rij, kolom of blok die allebei alleen 3 of 8 kunnen worden: dan krijgen die twee de 3 en de 8, en de andere vakjes niet.</li>
        <li><b>Verborgen tweetal</b> – twee cijfers die maar op dezelfde twee plekken kunnen: die vakjes zijn voor die cijfers, andere cijfers vallen daar af.</li>
        <li><b>X-vleugel</b> – kan een cijfer in twee rijen alleen in dezelfde twee kolommen, dan staan de twee in die kolommen al vast: in de rest van die kolommen kan het niet meer. Met drie rijen heet dat een <b>zwaardvis</b>.</li>
        <li><b>Y-vleugel</b> – een vakje met 2 mogelijkheden (A of B) en twee “vleugels” met A of C en B of C: één van de vleugels wordt zeker C, dus een vakje dat beide vleugels ziet kan geen C zijn.</li>
      </ul>
      <p><b>Voor Meesters</b> – hier denk je in koppelingen: kan een cijfer in een rij, kolom of blok maar op twee plekken, dan is precies één van die twee het cijfer.</p>
      <ul>
        <li><b>Wolkenkrabber en vlieger</b> – twee van zulke koppelingen waarvan twee uiteinden elkaar zien: dan is één van de twee andere uiteinden zeker het cijfer.</li>
        <li><b>Kleurketen</b> – volg alle koppelingen van één cijfer en kleur de vakjes om en om blauw en groen. Óf alle blauwe zijn het cijfer, óf alle groene. Een vakje dat blauw én groen ziet, valt af.</li>
        <li><b>W-vleugel</b> – twee vakjes die allebei alleen A of B kunnen, verbonden door een koppeling op A: één van beide is dan B.</li>
        <li><b>XYZ-vleugel</b> – zoals de Y-vleugel, maar het middelste vakje kan zelf ook C zijn.</li>
        <li><b>XY-ketting</b> – een rij vakjes met elk twee mogelijkheden die elkaar doorgeven: één van de uiteinden is zeker hetzelfde cijfer.</li>
      </ul>
      <p>Tip: zet met ✎ potloodnotities. Bij moeilijke stappen laat de hint alle mogelijke cijfers zien, met de cijfers die afvallen in het rood.</p>
    </details>
    <div id="sdOptList"></div>
    <div class="stats" id="sdStats"></div>
    <div class="row sticky-actions"><button class="btn" id="sdStartBack">Menu</button><button class="btn" id="sdResume" hidden>Verder</button><button class="btn primary" id="sdGo">Nieuw spel ▶</button></div>
  </div>
</div>
<div class="modal center" id="sdEndModal">
  <div class="sheet">
    <div class="big-emoji">🔢</div>
    <h3 id="sdEndTitle"></h3>
    <p id="sdEndText"></p>
    <div class="row"><button class="btn" id="sdEndMenu">Niveau kiezen</button><button class="btn primary" id="sdEndNew">Nog een ▶</button></div>
  </div>
</div>''',
 'css': '''#sd{background:radial-gradient(120% 80% at 50% 20%,#2b4560 0%,#16263a 70%)}
#sd .topbar{background:#1c2c3c;gap:4px}
.sd-hud{flex:1;display:flex;justify-content:center;align-items:center;gap:16px;font-size:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
#sdLvl{color:var(--muted);font-size:14px}
#sdMistW b{color:#ff8a8a}
#sdWrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:10px 8px 14px;overflow:hidden;user-select:none;-webkit-user-select:none}
#sdBoard{--s:min(calc(100vw - 16px),calc(100vh - 330px),560px);width:var(--s);height:var(--s);display:grid;grid-template-columns:repeat(9,1fr);grid-template-rows:repeat(9,1fr);background:#fbf7ec;border:3px solid #2e2a22;border-radius:10px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4);touch-action:manipulation;transition:opacity .2s}
#sdBoard.busy{opacity:.35}
.sd-c{position:relative;display:flex;align-items:center;justify-content:center;border-right:1px solid #d6cdb6;border-bottom:1px solid #d6cdb6;font-size:calc(var(--s) / 15);font-weight:500;color:#2a5bd7;cursor:pointer;-webkit-tap-highlight-color:transparent}
.sd-c:nth-child(9n){border-right:0} .sd-c:nth-child(n+73){border-bottom:0}
.sd-c.br{border-right:2.5px solid #2e2a22} .sd-c.bb{border-bottom:2.5px solid #2e2a22}
.sd-c.given{color:#231f18;font-weight:700}
.sd-c.peer{background:#ece6d4} .sd-c.same{background:#f6dd8f} .sd-c.sel{background:#ffd75e}
.sd-c.bad{color:#d3263a} .sd-c.bad.user{background:#fde1e1} .sd-c.bad.sel{background:#ffc9c0}
.sd-c.flash{animation:sdFlash .55s ease-out both}
@keyframes sdFlash{0%{background:#fff3b0;transform:scale(1)}40%{background:#bff0c4;transform:scale(1.08)}100%{transform:scale(1)}}
.sd-n{position:absolute;inset:6%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);font-size:calc(var(--s) / 34);font-weight:600;color:#7a7364;line-height:1}
.sd-n i{font-style:normal;display:flex;align-items:center;justify-content:center;border-radius:3px} .sd-n i.hl{background:#ffd75e;color:#3a2f10}
#sdSide{display:flex;flex-direction:column;gap:10px;width:min(calc(100vw - 16px),560px)}
#sdTools{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
#sdTools button{background:rgba(255,255,255,.1);border:2px solid transparent;border-radius:14px;color:var(--ink);padding:6px 0 4px;display:flex;flex-direction:column;align-items:center;gap:1px;-webkit-tap-highlight-color:transparent}
#sdTools button b{font-size:20px;line-height:1.1} #sdTools button small{font-size:11px;color:var(--muted)}
#sdTools button.on{border-color:var(--accent);background:rgba(242,193,78,.2)}
#sdHint{display:none;background:#fbf7ec;color:#2b2418;border-radius:14px;padding:10px 12px 10px;box-shadow:0 4px 14px rgba(0,0,0,.35);font-size:14.5px;line-height:1.4}
#sd.hinting #sdHint{display:block} #sd.hinting #sdPad{display:none}
#sdHint p{margin:6px 0 8px} .sd-hh{display:flex;align-items:center;gap:8px;flex-wrap:wrap} .sd-hh b{font-size:16px;color:#1d3a6e}
.sd-hstep{font-size:11.5px;font-weight:700;background:#1d3a6e;color:#fff;border-radius:9px;padding:1px 8px}
.sd-hb{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap} .sd-hb button{border:0;border-radius:11px;padding:8px 14px;font-weight:700;font-size:14px;background:#e6dfcc;color:#2b2418} .sd-hb button.go{background:#2a9d6f;color:#fff}
.sd-c.hx-unit{background:#dfeaf8} .sd-c.hx-ray{background:#f6e1dc} .sd-c.hx-src{background:#ffd9b0;box-shadow:inset 0 0 0 3px #f08a24}
.sd-c.hx-pat{background:#ffe68a;box-shadow:inset 0 0 0 2px #e0b520} .sd-c.hx-blue{background:#bcd7ff;box-shadow:inset 0 0 0 2px #3a74d8} .sd-c.hx-green{background:#bdeec4;box-shadow:inset 0 0 0 2px #2a9d6f} .sd-c.hx-el{background:#fde8e8} .sd-c.hx-tgt{background:#c8f2cc;box-shadow:inset 0 0 0 3px #2a9d6f}
.sd-c.hx-no::after{content:'✕';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(211,38,58,.55);font-size:calc(var(--s) / 16);font-weight:700;pointer-events:none}
.sd-n.hx{color:#5e6878} .sd-n i.del{color:#d3263a;background:#ffd0d0;text-decoration:line-through;font-weight:800} .sd-n i.key{color:#1d3a6e;font-weight:800} .sd-n i.ok{background:#2a9d6f;color:#fff;font-weight:800}
.sd-ghost{color:#2a9d6f;font-weight:800;opacity:.85}
.sd-tech{background:rgba(255,255,255,.06);border-radius:12px;padding:8px 12px;margin:8px 0;font-size:14px;line-height:1.45} .sd-tech summary{font-weight:700;cursor:pointer} .sd-tech ul{padding-left:18px;margin:6px 0} .sd-tech li{margin:4px 0}
html.big-text #sdHint{font-size:16.5px} html.big-text .sd-hh b{font-size:18px}
#sdPad{display:grid;grid-template-columns:repeat(9,1fr);gap:5px}
#sdPad button{background:#f4efe1;color:#24324a;border:0;border-radius:12px;padding:8px 0 4px;display:flex;flex-direction:column;align-items:center;box-shadow:0 3px 0 #b9ae93;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#sdPad button:active{transform:translateY(2px);box-shadow:0 1px 0 #b9ae93}
#sdPad button b{font-size:26px;line-height:1;font-weight:600} #sdPad button small{font-size:10px;color:#8a8170;min-height:12px}
#sdPad button.hl{background:#ffd75e} #sdPad button.done{opacity:.35}
@media (orientation:landscape) and (max-height:600px){
  #sdWrap{flex-direction:row;gap:14px;padding:8px 12px}
  #sdBoard{--s:min(calc(100vh - 80px),calc(100vw - 340px))}
  #sdSide{width:300px} #sdPad{grid-template-columns:repeat(3,1fr)} #sdPad button{padding:6px 0 2px}
  #sdHint{padding:8px 10px;font-size:13.5px} #sdHint p{max-height:calc(100vh - 210px);overflow-y:auto;margin:4px 0 6px}
}''',
 'js': js,
 'gamesEntry': "  { id: 'sd', label: 'Sudoku', emoji: '🔢', bg: ['#4a78a8', '#1c2c3c'], enter: () => Sudoku.enter(), tile: 'tileSd' },\n",
 'statRow': "['sd', `${S.sd.won || 0} opgelost${S.sd.best && S.sd.best.moeilijk != null ? ' · moeilijk in ' + Math.floor(S.sd.best.moeilijk / 60) + ':' + String(S.sd.best.moeilijk % 60).padStart(2, '0') : ''}`]",
 'wipe': ['sd.stats', 'sd.save'],
 'trophies': "    ['s1', '🔢', 'Cijferpuzzelaar', 'Los een sudoku op', S => (S.sd.won || 0) >= 1],\n    ['s3', '🧠', 'Sudokumeester', 'Los een moeilijke sudoku op', S => S.sd.best && S.sd.best.moeilijk != null],",
 'track': '''    // Sudoku: calm thinking music
    sd: { bpm: 84, bars: 8, seed: 191, fn(a) {
      const K = 57, ch = [[0, 'M7'], [5, 'M7'], [2, 'm7'], [7, 's4'], [0, 'M7'], [9, 'm7'], [5, 'M7'], [7, '7']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 60), bm = K - 24 + r;
        a.bass(a.at(b), bm, a.bar * .9, .6, 'sub'); a.pad(a.at(b), cm, a.bar, .5, { cut: 1400, vol: .1 });
        [0, 6, 8, 12].forEach((s, i) => a.marimba(a.at(b, s), cm[i % cm.length] + 12, .35, -.2));
        a.shaker(a.at(b, 4), .25); a.shaker(a.at(b, 12), .25); a.brush(a.at(b, 8), .3);
      });
      melody(a, { chords: ch, root: K, scale: 'major', lo: 72, hi: 84, rhythm: 'sparse', rest: .25 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .4, .2, 1.4, 'mbell'));
    } },''',
 'sfx': {
   'sdPlace': "[() => { const d = buf(.25); thud(d, 0, 260, .5, .03); chip(d, 0, 1200, 1500, .04, .08, 'tri', 4000); return d; }, .08, .3, 3]",
   'sdNote': "[() => { const d = buf(.15); chip(d, 0, 1800, 2200, .03, .1, 'tri', 5000); return d; }, .05, .22, 3]",
   'sdError': "[() => { const d = buf(.35); chip(d, 0, 220, 170, .22, .25, 'sq', 1200); thud(d, 0, 120, .4, .05); return d; }, .05, .32, 1]",
   'sdLine': "[() => { const d = buf(1.2); [880, 1109, 1319, 1760].forEach((f, i) => bell(d, i * .06, f, .25, .7)); return d; }, .35, .32, 1]",
 },
}
json.dump(g, open('sd.json', 'w'), ensure_ascii=False)
print('ok', len(js))
