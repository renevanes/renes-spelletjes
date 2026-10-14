import json, os, urllib.parse
# Builds mj.js (the complete Mahjong solitaire module) from mjsrc/ and the package mj.json for addgame.py
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('mjsrc/' + f).read()

js = ('''/* ================================================================
   MAHJONG – solitaire with the 144 traditional tiles: tap two free, matching
   tiles to take them away. Eight layouts, deals made by reverse construction
   (always solvable), shuffle that stays solvable, hints, undo, daily puzzle.
   ================================================================ */
const Mahjong = (() => {
''' + src('core.js') + '\n' + src('art.js') + '\n' + src('ui.js') + '''})();
$('#tileMj').addEventListener('click', () => Mahjong.enter());
''')
open('mj.js', 'w').write(js)

# ---------- vector icon (512x512): three stacked mahjong tiles ----------
def tile(x, y, rot, inner):
    return (f'<g transform="translate({x} {y}) rotate({rot})"><g filter="url(#sh)">'
            '<rect x="-91" y="-82" width="150" height="196" rx="22" fill="url(#mjBk)"/>'
            '<rect x="-83" y="-90" width="150" height="196" rx="22" fill="#d9c9a2"/></g>'
            '<rect x="-75" y="-98" width="150" height="196" rx="22" fill="url(#mjFc)"/>'
            '<rect x="-72" y="-95" width="144" height="190" rx="20" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="4"/>'
            f'{inner}</g>')
zhong = ('<rect x="-44" y="-30" width="88" height="60" rx="9" fill="none" stroke="#c42630" stroke-width="16"/>'
         '<path d="M0-70V72" stroke="#c42630" stroke-width="17" stroke-linecap="round"/>')
ticks = ''.join(f'<path transform="rotate({k * 30})" d="M0-33V-43" stroke="#1f4f9e" stroke-width="6" stroke-linecap="round"/>' for k in range(12))
onedot = ('<circle r="58" fill="#18804a"/><circle r="49" fill="#fbf6ea"/>' + ticks +
          '<circle r="28" fill="#c42630"/><circle r="19" fill="#fbf6ea"/><circle r="13" fill="#c42630"/><circle cx="-5" cy="-5" r="4" fill="#fff" opacity=".8"/>')
def stk(x, y, col):
    return (f'<g transform="translate({x} {y})"><rect x="-11" y="-36" width="22" height="72" rx="11" fill="{col}"/>'
            '<rect x="-14" y="-4" width="28" height="8" rx="3" fill="#0d4a2a"/><rect x="-14" y="-31" width="28" height="7" rx="3" fill="#0d4a2a"/><rect x="-14" y="24" width="28" height="7" rx="3" fill="#0d4a2a"/>'
            '<rect x="-3" y="-26" width="4" height="52" fill="#fff" opacity=".5"/></g>')
bams = stk(-26, -40, 'url(#mjBm)') + stk(26, -40, 'url(#mjBm)') + stk(-26, 42, 'url(#mjBm)') + stk(26, 42, 'url(#mjBm)')
icon_body = ('<ellipse cx="256" cy="440" rx="200" ry="34" fill="#000" opacity=".18"/><g transform="translate(256 270) scale(1.14) translate(-256 -270)">'
             + tile(168, 222, -15, onedot) + tile(344, 214, 13, bams) + tile(258, 300, -2, zhong) + '</g>'
             + "' + spark(420, 110, 1.3, '#fffbe0') + spark(96, 120, .9, '#fff') + spark(448, 380, .7, '#fff') + '")
icon = ("{ bg: ['#3fb58a', '#0e3b2b'], defs: lg('mjFc', '#fffdf6', '#efe2c4', 1, 1) + lg('mjBk', '#2f9a74', '#135840') + lg('mjBm', '#3aa86a', '#167a42', 1, 0),\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds: smooth stone "tok"s and soft chimes (sine tones, pink-noise washes, attacks >= 1.5 ms) ----------
sfx = {
  'mjSel': "[() => { const d = buf(.25); const f = 1450 + Math.random() * 200; tone(d, 0, f * 1.18, f, .006, .018, .42, .002, .12); tone(d, 0, f * 2.4, f * 2.35, .004, .007, .05, .002); tone(d, 0, 520, 440, .02, .034, .48, .002, .25); wash(d, 0, .05, 2500, 1700, .06, .002, .009, 1.4, 'bp'); return d; }, .07, .36, 4]",
  'mjDesel': "[() => { const d = buf(.22); const f = 1100 + Math.random() * 120; tone(d, 0, f * 1.12, f, .006, .016, .36, .002, .1); tone(d, 0, 420, 370, .02, .03, .38, .002, .25); return d; }, .05, .26, 2]",
  'mjMatch': "[() => { const d = buf(1.4); const P = [[880, 1175], [988, 1480], [740, 1175], [659, 988]][Math.floor(Math.random() * 4)]; tone(d, 0, 1850, 1580, .006, .017, .3, .002, .12); tone(d, .05, 1700, 1450, .006, .017, .27, .002, .12); tone(d, 0, 560, 470, .02, .036, .34, .002, .25); tone(d, .05, 520, 440, .02, .036, .3, .002, .25); bell(d, .07, P[0], .3, .42); bell(d, .17, P[1], .26, .6); wash(d, .07, .5, 3500, 5000, .02, .02, .12, 2, 'bp'); return d; }, .3, .36, 4]",
  'mjNo': "[() => { const d = buf(.5); tone(d, 0, 310, 290, .05, .07, .45, .003, .35); tone(d, .1, 247, 233, .05, .09, .4, .003, .35); return d; }, .05, .3, 1]",
  'mjBlock': "[() => { const d = buf(.2); tone(d, 0, 430, 380, .02, .024, .5, .002, .4); tone(d, 0, 1100, 1000, .01, .008, .08, .002); return d; }, .03, .24, 2]",
  'mjHint': "[() => { const d = buf(1.4); [1175, 1480, 1760].forEach((f, i) => bell(d, i * .08, f, .17, .42)); wash(d, 0, .9, 3200, 5000, .025, .12, .25, 2, 'bp'); return d; }, .4, .26, 1]",
  'mjShuffle': "[() => { const d = buf(1); for (let k = 0; k < 12; k++) { const t = .02 + k * .05 + Math.random() * .025, f = 1300 + Math.random() * 450; tone(d, t, f * 1.15, f, .006, .014, .24, .002, .1); tone(d, t, 470 + Math.random() * 120, 410, .02, .024, .2, .002, .25); } wash(d, 0, .85, 450, 1100, .2, .14, .25, 1.1, 'bp'); return d; }, .08, .32, 2]",
  'mjUndo': "[() => { const d = buf(.45); tone(d, 0, 560, 830, .07, .06, .33, .004, .2); tone(d, .06, 1500, 1350, .006, .018, .24, .002, .12); tone(d, .06, 500, 430, .02, .03, .26, .002, .25); return d; }, .1, .3, 2]",
  'mjWin': "[() => { const d = buf(3.4); [587.3, 659.3, 740, 880, 987.8, 1174.7, 1480, 1760].forEach((f, i) => bell(d, i * .085, f, .22, .9)); [293.7, 440, 587.3, 740].forEach(f => tone(d, .72, f, f, 0, .9, .13, .08, .3)); bell(d, .72, 1174.7, .2, 1.4); wash(d, .6, 1.9, 3000, 5000, .03, .25, .6, 2, 'bp'); return d; }, .5, .46, 1]",
}

felt = ("<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>"
        "<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>")
grain = ("<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='w'><feTurbulence type='fractalNoise' baseFrequency='.006 .16' numOctaves='3' seed='4' stitchTiles='stitch'/>"
         "<feColorMatrix values='0 0 0 0 .2  0 0 0 0 .1  0 0 0 0 .03  0 0 0 1.4 -.3'/></filter><rect width='100%' height='100%' filter='url(#w)'/></svg>")
wave = ("<svg xmlns='http://www.w3.org/2000/svg' width='48' height='24'><g fill='none' stroke='#9fb4ff' stroke-opacity='.07' stroke-width='1.5'>"
        "<path d='M0 24a24 24 0 0 1 48 0M8 24a16 16 0 0 1 32 0M16 24a8 8 0 0 1 16 0'/><path d='M-24 12a24 24 0 0 1 48 0M24 12a24 24 0 0 1 48 0'/></g></svg>")
u = lambda s: 'url("data:image/svg+xml,' + urllib.parse.quote(s, safe="/:=' .,-") + '")'

css = '''#mj{background:#0f2a1f}
#mj .topbar{background:#13261d;gap:4px;padding:6px 6px}
#mj .topbar .iconbtn{width:40px;flex:0 0 40px}#mjBack{font-size:28px!important}
#mjPauseBtn svg{width:20px;height:20px;fill:currentColor}
.mj-hud{flex:1;display:flex;justify-content:center;align-items:stretch;gap:6px;min-width:0}
.mj-h{display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.12;min-width:52px;padding:3px 8px;border-radius:11px;background:rgba(255,255,255,.07)}
.mj-h.w{min-width:0;flex:0 1 auto}
.mj-h small{font-size:11px;color:var(--muted);white-space:nowrap;max-width:92px;overflow:hidden;text-overflow:ellipsis}
.mj-h b{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}
.mj-h.none{background:rgba(255,120,90,.2)}.mj-h.none b{color:#ffb09a}
#mjMain{flex:1;display:flex;flex-direction:column;min-height:0}
#mjStage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:inset 0 0 60px rgba(0,0,0,.45)}
#mjStage canvas{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none}
#mjCv{transition:opacity .25s;transform-origin:0 0}
#mjCv.shuf{animation:mjShuf .55s ease-out}
@keyframes mjShuf{0%{opacity:.15;transform:scale(.97)}100%{opacity:1;transform:none}}
#mjCv.deal{animation:mjDeal .65s cubic-bezier(.2,.8,.3,1)}
@keyframes mjDeal{0%{opacity:0;transform:translateY(-18px) scale(1.04)}60%{opacity:1}100%{opacity:1;transform:none}}
#mjStage.t-groen{background:''' + u(felt) + ''',radial-gradient(130% 95% at 50% 38%,#2f8c60 0%,#1d6343 50%,#0f3a27 100%)}
#mjStage.t-hout{background:''' + u(grain) + ''',repeating-linear-gradient(180deg,transparent 0 118px,rgba(40,18,6,.35) 119px,rgba(255,220,170,.10) 121px,transparent 122px),repeating-linear-gradient(179.3deg,rgba(70,35,12,0) 0 5px,rgba(70,35,12,.10) 6px,rgba(70,35,12,0) 9px),linear-gradient(100deg,#7b4a26 0%,#94603a 22%,#80502c 45%,#9a6640 68%,#7a4826 100%)}
#mjStage.t-nacht{background:''' + u(wave) + ''',radial-gradient(130% 95% at 50% 38%,#2c3d7a 0%,#1a2554 55%,#0c1230 100%)}
#mjTools{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 10px calc(10px + env(safe-area-inset-bottom));background:#13261d}
#mjTools button{background:rgba(255,255,255,.09);border-radius:14px;color:var(--ink);padding:7px 0 5px;display:flex;flex-direction:column;align-items:center;gap:1px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#mjTools button:active{background:rgba(255,255,255,.18)}
#mjTools button b{font-size:21px;line-height:1.15;font-weight:600}#mjTools button small{font-size:11.5px;color:var(--muted)}
html.big-text #mjTools button small{font-size:13px}html.big-text #mjTools button b{font-size:24px}
#mj.land #mjMain{flex-direction:row}
#mj.land #mjTools{grid-template-columns:1fr;grid-auto-rows:minmax(0,1fr);width:86px;padding:8px 8px calc(8px + env(safe-area-inset-bottom))}
#mj.land .topbar{min-height:44px;padding:3px 6px}
#mj.land .mj-h{flex-direction:row;gap:6px;align-items:baseline}
#mjPause{position:absolute;inset:0;z-index:5;display:none;align-items:center;justify-content:center;text-align:center;background:rgba(6,18,12,.86);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);cursor:pointer}
#mjPause.show{display:flex}#mjPause b{display:block;font-size:24px;margin:8px 0 4px}#mjPause small{color:var(--muted);font-size:14px}
#mjPause i{font-style:normal;font-size:46px}
#mjToast{position:absolute;left:50%;bottom:14px;z-index:6;transform:translate(-50%,10px);opacity:0;pointer-events:none;background:rgba(14,26,20,.95);color:#fff;padding:10px 16px;border-radius:14px;font-size:14.5px;line-height:1.35;max-width:88%;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);transition:opacity .2s,transform .2s}
#mjToast.show{opacity:1;transform:translate(-50%,0)}
#mjStartModal .sheet,#mjEndModal .sheet,#mjStuckModal .sheet{background:linear-gradient(180deg,#1d3a2f,#13281f)}
#mjStartModal .sticky-actions{background:#13281f}
#mjDaily{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:10px 12px;border-radius:16px;margin:4px 0 12px;background:linear-gradient(135deg,rgba(242,193,78,.26),rgba(242,193,78,.08));border:1px solid rgba(242,193,78,.55);color:var(--ink)}
#mjDaily img{width:76px;height:50px;object-fit:contain;flex:0 0 76px}
#mjDaily span{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}#mjDaily b{font-size:16px}#mjDaily small{color:var(--muted);font-size:12.5px}
#mjDaily em{font-style:normal;font-weight:800;background:var(--accent);color:#2b2100;border-radius:99px;padding:6px 11px;font-size:14px;white-space:nowrap}
#mjDaily.done em{background:rgba(255,255,255,.12);color:#bff0c4}
#mjLays{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 12px}
#mjLays button{display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto auto;text-align:left;background:rgba(0,0,0,.24);border:2px solid transparent;border-radius:14px;padding:8px 10px;color:var(--ink);gap:0 6px}
#mjLays button img{grid-column:1/3;width:100%;height:58px;object-fit:contain;margin-bottom:5px}
#mjLays button b{font-size:15px}#mjLays button small{color:var(--muted);font-size:12px;grid-column:1}
#mjLays button span{grid-column:2;grid-row:2/4;align-self:center;font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}
#mjLays button.on{border-color:var(--accent);background:rgba(242,193,78,.14)}
@media (orientation:landscape){#mjLays{grid-template-columns:repeat(4,minmax(0,1fr))}}
.mj-endt{margin:2px 0 8px}.mj-endt b{display:block;font-size:42px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1.1}.mj-endt small{color:var(--muted);font-size:14px}
#mjEndText p{margin:6px 0 16px}#mjEndText p b{color:var(--ink)}
#mjEndModal .row .btn,#mjStuckModal .row .btn{padding:14px 6px;white-space:nowrap}
@media (max-width:370px){.mj-h{min-width:44px;padding:3px 5px}.mj-h b{font-size:16px}}'''

pause_svg = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.3"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.3"/></svg>'
g = {
 'id': 'mj', 'tile': 'Mj', 'mod': 'Mahjong', 'bar': '#13261d', 'statsKey': 'mj.stats', 'music': 'mj',
 'tileHtml': '''    <button class="tile" id="tileMj">
      <div class="art"><img class="tile-img" id="artMj" alt=""></div>
      <div>
        <h2>Mahjong</h2>
        <p>Speel paren van gelijke stenen weg</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ MAHJONG ============ -->
<section id="mj" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="mjBack" aria-label="Terug">‹</button>
    <div class="mj-hud"><div class="mj-h w"><small id="mjLay">Schildpad</small><b id="mjTime">0:00</b></div><div class="mj-h"><small>stenen</small><b id="mjLeft">0</b></div><div class="mj-h" id="mjPairsW"><small>paren vrij</small><b id="mjPairs">0</b></div></div>
    <button class="iconbtn" id="mjPauseBtn" aria-label="Pauze">''' + pause_svg + '''</button>
    <button class="iconbtn" id="mjMenu" aria-label="Spelmenu">☰</button>
  </div>
  <div id="mjMain">
    <div id="mjStage" class="t-groen"><canvas id="mjCv"></canvas><canvas id="mjFx"></canvas>
      <div id="mjPause"><div><i>⏸</i><b>Pauze</b><small>Tik om verder te spelen</small></div></div>
      <div id="mjToast"></div>
    </div>
    <div id="mjTools"><button data-t="undo"><b>↶</b><small>Terug</small></button><button data-t="hint"><b>💡</b><small>Hint</small></button><button data-t="shuffle"><b>🔀</b><small>Schudden</small></button><button data-t="zoom" id="mjZoomBtn"><b>🔍</b><small>Inzoomen</small></button></div>
  </div>
</section>
''',
 'modalHtml': '''<div class="modal" id="mjStartModal">
  <div class="sheet">
    <h3>🀄 Mahjong</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Haal alle stenen van het bord door telkens twee gelijke stenen aan te tikken. Een steen is <b>vrij</b> als er niets bovenop ligt en hij links of rechts niet tegen een andere steen aan ligt. Alle bloemen passen bij elkaar, en alle seizoenen ook. Elk spel is op te lossen.</p>
    <button id="mjDaily"></button>
    <div id="mjLays"></div>
    <div id="mjOptList"></div>
    <div class="stats" id="mjStats"></div>
    <div class="row sticky-actions"><button class="btn" id="mjStartBack">Menu</button><button class="btn" id="mjResume" hidden>Verder</button><button class="btn primary" id="mjGo">Nieuw spel ▶</button></div>
  </div>
</div>
<div class="modal center" id="mjEndModal">
  <div class="sheet">
    <div class="big-emoji">🀄</div>
    <h3 id="mjEndTitle"></h3>
    <div id="mjEndText"></div>
    <div class="row"><button class="btn" id="mjEndMenu">Vorm kiezen</button><button class="btn primary" id="mjEndNew">Nog een ▶</button></div>
  </div>
</div>
<div class="modal center" id="mjStuckModal">
  <div class="sheet">
    <div class="big-emoji">🤔</div>
    <h3>Geen paren meer</h3>
    <p>Er liggen geen twee gelijke vrije stenen meer. Schud de stenen die er nog liggen (het spel blijft op te lossen) of neem een zet terug.</p>
    <div class="row"><button class="btn" id="mjStuckUndo">↶ Zet terug</button><button class="btn primary" id="mjStuckShuffle">🔀 Schudden</button></div>
  </div>
</div>''',
 'css': css,
 'js': js,
 'gamesEntry': "  { id: 'mj', label: 'Mahjong', emoji: '🀄', bg: ['#3fb58a', '#0e3b2b'], enter: () => Mahjong.enter(), tile: 'tileMj' },\n",
 'statRow': "['mj', `${S.mj.won || 0} van ${S.mj.played || 0} gewonnen${S.mj.best && S.mj.best.schildpad != null ? ' · Schildpad in ' + Math.floor(S.mj.best.schildpad / 60) + ':' + String(S.mj.best.schildpad % 60).padStart(2, '0') : ''}${S.mj.dailyWon ? ' · ' + S.mj.dailyWon + ' dagpuzzels' : ''}`]",
 'wipe': ['mj.stats', 'mj.save', 'mj.settings'],
 'trophies': ("    ['mj1', '🀄', 'Stenenspeler', 'Win een potje Mahjong', S => (S.mj.won || 0) >= 1],\n"
              "    ['mj2', '🧘', 'Zonder hulp', 'Win Mahjong zonder hints en zonder schudden', S => (S.mj.noHelp || 0) >= 1],\n"
              "    ['mj3', '🐢', 'Snelle schildpad', 'Win de Mahjong-Schildpad binnen 8 minuten', S => S.mj.best && S.mj.best.schildpad != null && S.mj.best.schildpad < 480],\n"
              "    ['mj4', '🏯', 'Alle vormen', 'Win elke Mahjong-vorm minstens één keer', S => ['schildpad', 'piramide', 'burcht', 'draak', 'vlinder', 'bloem', 'brug', 'ruit'].every(k => S.mj.best && S.mj.best[k] != null)],\n"
              "    ['mj5', '📅', 'Dagpuzzelaar', 'Los 7 Mahjong-dagpuzzels op', S => (S.mj.dailyWon || 0) >= 7],"),
 'track': '''    // Mahjong: calm and spacious, pentatonic zither figures and a breathy flute (original)
    mj: { bpm: 66, bars: 8, seed: 307, rev: 3.6, revAmt: .46, fn(a) {
      const K = 50, P = [0, 2, 4, 7, 9], pm = d => K + 12 * Math.floor(d / 5) + P[((d % 5) + 5) % 5];
      const ch = [[0, 'add9'], [9, 'm7'], [7, 's4'], [0, 'add9'], [4, 'm7'], [9, 'm7'], [5, 'add9'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 62);
        a.pad(a.at(b), cm, a.bar, .38, { cut: 900, vol: .08, a: .9, r: 1.4 });
        a.bass(a.at(b), K - 12 + r, a.bar * .95, .45, 'sub');
        [0, 3, 6, 10].forEach((s, i) => a.marimba(a.at(b, s), cm[[0, 1, 2, 1][i] % cm.length] + 12, i ? .24 : .34, -.25));
        a.tom(a.at(b), 38, .22, -.15); if (b % 2) a.tom(a.at(b, 12), 45, .14, .2);
        a.shaker(a.at(b, 8), .1, .3);
      });
      [0, 4].forEach(b => { for (let k = 0; k < 7; k++) a.bell(a.at(b) + k * .07, pm(10 + k), .14 + k * .02, (k - 3) * .12, 1.2, 'gl'); });
      const r = a.rnd, rh = [[[4, 4], [8, 8]], [[0, 6], [6, 2], [8, 8]], [[0, 4], [4, 4], [8, 4], [12, 4]], [[0, 8], [10, 6]], [[2, 6], [8, 3], [11, 5]]];
      let d = 10;
      for (let b = 0; b < 8; b++) {
        const cad = b % 4 === 3, pat = cad ? [[0, 12]] : b % 4 === 0 ? rh[0] : rh[1 + Math.floor(r() * 4)];
        for (const [s, len] of pat) {
          d = cad ? (b === 7 ? 10 : [9, 11][Math.floor(r() * 2)]) : Math.max(6, Math.min(14, d + [-2, -1, -1, 1, 1, 2, 0][Math.floor(r() * 7)]));
          a.lead(a.at(b, s), pm(d), len * a.st, .55, { wave: 'sine', cut: 2600, vol: .19, vib: 9, breath: .3, a: .05, r: .25, rev: .6, del: .45, s: 'flute' });
        }
      }
    } },''',
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('mj.json', 'w'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('mj.json'))
