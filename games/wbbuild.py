import json, os, subprocess, sys
# Builds wb.js (the complete Woordbord module) from wbsrc/ + the packed word list, and the package wb.json for addgame.py
os.chdir(os.path.dirname(os.path.abspath(__file__)))
if not os.path.exists('wbdict.b64'):
    subprocess.check_call([sys.executable, 'wbwords.py'])
src = lambda f: open('wbsrc/' + f).read()
dict_b64 = open('wbdict.b64').read().strip()

js = ('''/* ================================================================
   WOORDBORD – Dutch crossword tile game: 15×15 board, 7-letter racks,
   own letter set and bonus squares, against the computer (three levels,
   Appel–Jacobson move generator on a trie) or with two players.
   ================================================================ */
const Woordbord = (() => {
  // Woordenlijst: OpenTaal (https://github.com/OpenTaal/opentaal-wordlist), BSD / CC BY 3.0.
  // Front-coded sorted list of the playable words, gzip + base64 (built by wbwords.py); unpacked when the game opens.
  const DICT = \'''' + dict_b64 + '''\';
''' + src('core.js') + '\n' + src('ui.js') + '''})();
$('#tileWb').addEventListener('click', () => Woordbord.enter());
''')
open('wb.js', 'w').write(js)

# ---------- vector icon (512x512): a corner of the board with letter tiles ----------
def tile(x, y, L, v, rot=0, s=1):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-40" y="-40" width="80" height="80" rx="13" fill="url(#wbTl)"/>'
            f'<path d="M-27-40H27A13 13 0 0 1 40-27V-22H-40V-27A13 13 0 0 1-27-40Z" fill="#fff" opacity=".55"/>'
            f'<rect x="-40" y="-40" width="80" height="80" rx="13" fill="none" stroke="#a87a3c" stroke-opacity=".55" stroke-width="3"/>'
            f'<text x="-3" y="18" text-anchor="middle" font-family="system-ui,Roboto,sans-serif" font-weight="800" font-size="52" fill="#3b2814">{L}</text>'
            f'<text x="28" y="31" text-anchor="middle" font-family="system-ui,Roboto,sans-serif" font-weight="700" font-size="18" fill="#6a4e2c">{v}</text></g>')
cells = ''
C0, CS = 96, 84
colors = {(0, 0): '#c8654a', (0, 3): '#3a82b5', (1, 2): '#4fa385', (3, 0): '#4fa385', (3, 3): '#d8a84a', (1, 4): '#4fa385'}
lbl = {(0, 0): '3W', (0, 3): '3L', (1, 2): '2L', (3, 0): '2L', (3, 3): '2W'}
for r in range(4):
    for c in range(4):
        x, y = C0 + c * CS, C0 + r * CS
        col = colors.get((r, c), '#465865')
        cells += f'<rect x="{x + 3}" y="{y + 3}" width="{CS - 6}" height="{CS - 6}" rx="8" fill="{col}"/>'
        if (r, c) in lbl:
            cells += f'<text x="{x + CS / 2}" y="{y + CS / 2 + 10}" text-anchor="middle" font-family="system-ui,Roboto,sans-serif" font-weight="800" font-size="28" fill="#fff" opacity=".92">{lbl[(r, c)]}</text>'
row = 2
tiles = ''.join(tile(C0 + c * CS + CS / 2, C0 + row * CS + CS / 2, L, v) for c, (L, v) in enumerate([('B', 4), ('O', 1), ('R', 2), ('D', 2)]))
icon_body = (
  '<g transform="rotate(-7 256 280)">'
  '<g filter="url(#sh)"><rect x="70" y="70" width="400" height="400" rx="40" fill="url(#wbWd)"/></g>'
  '<rect x="70" y="70" width="400" height="400" rx="40" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="4"/>'
  '<rect x="92" y="92" width="344" height="344" rx="14" fill="#1a2228"/>' + cells +
  '<g filter="url(#sh2)">' + tiles + '</g></g>'
  '<g filter="url(#sh)">' + tile(380, 138, 'W', 5, 12, 1.22) + '</g>'
  "' + spark(470, 214, .9, '#fff6c8') + spark(330, 470, .7, '#fff') + '"
)
icon = ("{ bg: ['#5aa7c9', '#173445'], defs: lg('wbTl', '#fffaf0', '#e8cf9c') + lg('wbWd', '#8a5a30', '#4a2c16', 1, 1),\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds ----------
sfx = {
  'wbTile': "[() => { const d = buf(.25); thud(d, 0, 380 + Math.random() * 90, .6, .022); chip(d, 0, 2600, 2200, .012, .14, 'tri', 6000); grains(d, .002, .025, 3, 1500, 3800, .12, .003, .01); return d; }, .06, .36, 4]",
  'wbBad': "[() => { const d = buf(.5); chip(d, 0, 233, 196, .13, .2, 'sq', 1000); chip(d, .15, 196, 165, .2, .22, 'sq', 900); thud(d, 0, 110, .35, .04); return d; }, .06, .3, 1]",
  'wbWord1': "[() => { const d = buf(1); [1047, 1319].forEach((f, i) => bell(d, i * .07, f, .26, .45)); grains(d, .06, .3, 5, 4000, 8000, .04, .005, .02); return d; }, .32, .3, 1]",
  'wbWord2': "[() => { const d = buf(1.3); [988, 1245, 1480].forEach((f, i) => bell(d, i * .07, f, .26, .55)); grains(d, .08, .5, 12, 3500, 9000, .05, .005, .03); return d; }, .38, .32, 1]",
  'wbWord3': "[() => { const d = buf(1.8); [880, 1109, 1319, 1760, 2217].forEach((f, i) => bell(d, i * .065, f, .25, .7)); sweep(d, .05, 1, 'bp', 2500, 9000, 2, .22, .3); grains(d, .1, .9, 30, 3500, 10000, .05, .006, .04); return d; }, .45, .34, 1]",
  'wbBingo': "[() => { const d = buf(3); [[0, 523.3], [.12, 659.3], [.24, 784], [.4, 1046.5]].forEach(([t, f]) => { brass(d, t, f, .2, .32, 1); bell(d, t, f * 2, .14, .4); }); [523.3, 659.3, 784, 1046.5].forEach(f => brass(d, .58, f, 1.1, .18, .8)); drum(d, .58, 62, .6, .4); [1568, 2093, 2637, 3136].forEach((f, i) => bell(d, .62 + i * .07, f, .12, .8)); grains(d, .6, 1.4, 50, 3000, 10000, .04, .01, .05); return d; }, .45, .5, 1]",
  'wbSwap': "[() => { const d = buf(.9); for (let k = 0; k < 9; k++) { const t = .02 + k * .055 + Math.random() * .03; thud(d, t, 300 + Math.random() * 200, .3, .015); chip(d, t, 1900 + Math.random() * 900, 1700, .01, .08, 'tri', 6000); } sweep(d, .1, .5, 'bp', 700, 1600, 1.2, .35, .1); return d; }, .1, .34, 2]",
  'wbShuffle': "[() => { const d = buf(.45); for (let k = 0; k < 6; k++) { const t = k * .045 + Math.random() * .015; thud(d, t, 420 + Math.random() * 160, .25, .012); chip(d, t, 2400 + Math.random() * 700, 2100, .01, .07, 'tri', 6000); } return d; }, .05, .3, 2]",
  'wbEnd': "[() => { const d = buf(3); [[0, 392], [.18, 523.3], [.36, 659.3], [.54, 784]].forEach(([t, f]) => bell(d, t, f, .3, 1)); [261.6, 392, 523.3, 659.3].forEach(f => brass(d, .7, f, 1.4, .14, .5)); grains(d, .7, 1.4, 30, 3000, 9000, .035, .01, .05); return d; }, .5, .46, 1]",
}

g = {
 'id': 'wb', 'tile': 'Wb', 'mod': 'Woordbord', 'bar': '#18222a', 'statsKey': 'wb.stats', 'music': 'wb',
 'tileHtml': '''    <button class="tile" id="tileWb">
      <div class="art"><img class="tile-img" id="artWb" alt=""></div>
      <div>
        <h2>Woordbord</h2>
        <p>Leg woorden op het bord en scoor met de bonusvakjes</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ WOORDBORD ============ -->
<section id="wb" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="wbBack" aria-label="Terug">‹</button>
    <div class="wb-bar">
      <div class="wb-pl" id="wbP0"><span class="av">🙂</span><span class="nm"><small>Jij</small><b>0</b></span></div>
      <div class="wb-bag" id="wbBag"><b>0</b><small>in zak</small></div>
      <div class="wb-pl r" id="wbP1"><span class="nm"><small>Computer</small><b>0</b></span><span class="av">🤖</span></div>
    </div>
    <button class="iconbtn" id="wbHistBtn" aria-label="Zetten">📜</button>
    <button class="iconbtn" id="wbMenu" aria-label="Menu">☰</button>
  </div>
  <div id="wbMain">
    <div id="wbStatus"></div>
    <div id="wbStage"><div id="wbBoardWrap"><div id="wbBoard"><div id="wbGrid"></div><div id="wbPrev"></div></div></div></div>
    <div id="wbLog"></div>
    <div id="wbDock">
      <div id="wbRackBar"><div id="wbRack"></div></div>
      <div id="wbActs"><button data-a="tip"><b>💡</b><small>Tip</small></button><button data-a="swap"><b>♻</b><small>Ruilen</small></button><button data-a="pass"><b>⏭</b><small>Passen</small></button><button data-a="mix" id="wbMix"><b>⇆</b><small>Schudden</small></button><button data-a="play" id="wbPlay"><b>Spelen</b><small></small></button></div>
    </div>
  </div>
  <div id="wbCover"><div><div class="big-emoji">🔤</div><h3 id="wbCoverTitle"></h3><p id="wbCoverSub"></p><button class="btn primary">Toon mijn letters</button></div></div>
  <div id="wbLoad"><div><div class="wb-spin"></div><b>Woordenlijst laden…</b></div></div>
  <div id="wbToast"></div>
</section>
''',
 'modalHtml': '''<div class="modal" id="wbStartModal">
  <div class="sheet">
    <h3>🔤 Woordbord</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Leg om de beurt woorden op het bord, als in een kruiswoordpuzzel. Het eerste woord gaat over de ★ in het midden; daarna moet elk woord aansluiten op wat er al ligt. Sleep letters uit je rek naar het bord, of tik een letter en dan een vakje. <b>2L</b>/<b>3L</b> tellen de letter dubbel of driedubbel, <b>2W</b>/<b>3W</b> het hele woord. Gebruik je alle 7 letters in één zet, dan krijg je 40 bonuspunten.</p>
    <div id="wbStartList"></div>
    <div class="row sticky-actions"><button class="btn" id="wbStartBack">Menu</button><button class="btn" id="wbResume" hidden>Verder</button><button class="btn primary" id="wbGo">Nieuw spel ▶</button></div>
  </div>
</div>
<div class="modal center" id="wbEndModal">
  <div class="sheet">
    <div class="big-emoji" id="wbEndEmoji">🏆</div>
    <h3 id="wbEndTitle"></h3>
    <div id="wbEndText"></div>
    <div class="row"><button class="btn" id="wbEndMenu">Opties</button><button class="btn" id="wbEndView">Bord</button><button class="btn primary" id="wbEndNew">Nog een ▶</button></div>
  </div>
</div>
<div class="modal" id="wbSwapModal">
  <div class="sheet">
    <h3>♻ Letters ruilen</h3>
    <p class="note" id="wbSwapNote" style="color:var(--muted)"></p>
    <div id="wbSwapRack"></div>
    <div class="row"><button class="btn" id="wbSwapCancel">Annuleren</button><button class="btn" id="wbSwapAll">Alles</button><button class="btn primary" id="wbSwapGo">Ruilen</button></div>
  </div>
</div>
<div class="modal center" id="wbBlankModal">
  <div class="sheet">
    <h3>Blanco steen</h3>
    <p class="note" style="color:var(--muted)">Welke letter moet deze steen worden? (telt 0 punten)</p>
    <div id="wbBlankGrid"></div>
    <div class="row"><button class="btn" id="wbBlankCancel">Annuleren</button></div>
  </div>
</div>
<div class="modal" id="wbHistModal">
  <div class="sheet">
    <h3>📜 Zetten</h3>
    <p class="note" id="wbHistSum" style="color:var(--muted)"></p>
    <ul id="wbHistList"></ul>
    <div class="row sticky-actions"><button class="btn primary" id="wbHistClose">Sluiten</button></div>
  </div>
</div>''',
 'css': '''#wb{background:radial-gradient(130% 90% at 50% 0%,#2f3e49 0%,#161d23 72%)}
#wb .topbar{background:#18222a;gap:4px;padding:6px 6px;min-height:50px}
#wb .topbar .iconbtn{width:38px;flex:0 0 38px;font-size:20px}#wbBack{font-size:28px!important}
.wb-bar{flex:1;display:flex;align-items:center;gap:6px;min-width:0}
.wb-pl{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.06);border:2px solid transparent;border-radius:14px;padding:3px 8px;transition:border-color .25s,background .25s}
.wb-pl.r{justify-content:flex-end;text-align:right}
.wb-pl .av{font-size:19px;line-height:1}
.wb-pl .nm{display:flex;flex-direction:column;min-width:0;line-height:1.1}
.wb-pl small{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-pl b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums}
.wb-pl.on{border-color:#e9b949;background:rgba(233,185,73,.13)}
.wb-pl.think .av{animation:wbBob .9s ease-in-out infinite}
@keyframes wbBob{50%{transform:translateY(-3px) rotate(-8deg)}}
.wb-bag{display:flex;flex-direction:column;align-items:center;line-height:1.05;min-width:38px}
.wb-bag b{font-size:16px;font-variant-numeric:tabular-nums}.wb-bag small{font-size:10px;color:var(--muted);white-space:nowrap}
#wbMain{flex:1;display:flex;flex-direction:column;min-height:0;padding:2px 6px 8px;gap:6px;position:relative}
#wbStatus{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;color:#c5d0d6;padding:2px 6px;min-height:22px;white-space:nowrap}
#wbStatus .ls{overflow:hidden;text-overflow:ellipsis;min-width:0}#wbStatus .ls b{color:#fff;letter-spacing:.03em}#wbStatus em{color:#ffd877;font-style:normal;font-weight:800}#wbStatus .tr{color:#e9b949;font-weight:700}
.wb-dots::after{content:'';display:inline-block;width:1.2em;text-align:left;animation:wbDots 1.2s steps(4) infinite}
@keyframes wbDots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}
#wbStage{flex:0 0 auto;min-height:0;display:flex;align-items:center;justify-content:center}
#wbLog{flex:1;min-height:0;overflow:hidden;padding:2px 8px;-webkit-mask-image:linear-gradient(#000 70%,transparent);mask-image:linear-gradient(#000 70%,transparent)}
#wbLog ul{list-style:none;margin:0;padding:0}#wbLog li{display:flex;align-items:center;gap:8px;padding:4px 2px;font-size:13px;color:#c5d0d6;border-bottom:1px solid rgba(255,255,255,.05)}
#wbLog li i{width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:#e9b949}#wbLog li.p1 i{background:#6fb3e0}#wbLog li span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.02em}#wbLog li span b{color:#fff;font-weight:700;letter-spacing:0;margin-right:3px}
#wbLog li>em{font-style:normal;font-weight:800;color:#ffd877;font-variant-numeric:tabular-nums}#wbLog .bg{font-style:normal;color:#ff9a6a;font-size:11px;font-weight:800}#wbLog p{margin:6px 4px;font-size:13px;color:var(--muted);line-height:1.45;text-align:center}
#wbBoardWrap{position:relative;overflow:hidden;border-radius:12px;touch-action:none;box-shadow:0 14px 34px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.4)}
#wbBoard{position:absolute;left:0;top:0;transform-origin:0 0;border-radius:12px;background:linear-gradient(135deg,#8a5a30 0%,#5e3a1c 38%,#7a4e2a 62%,#4a2c16 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -2px 0 rgba(0,0,0,.35)}
#wbBoard.zanim{transition:transform .3s cubic-bezier(.2,.8,.3,1)}
#wbGrid{position:absolute;inset:var(--fr);display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);gap:1px;background:#161d22;border-radius:5px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.55),0 1px 0 1px rgba(255,255,255,.12)}
.wb-c{position:relative;background:linear-gradient(160deg,#3c4c57,#33414b)}
.wb-c::after{content:attr(data-l);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:calc(var(--cs) * .34);font-weight:800;letter-spacing:-.03em;color:rgba(255,255,255,.93);pointer-events:none;text-shadow:0 1px 1px rgba(0,0,0,.25)}
.wb-c.b-dl{background:linear-gradient(160deg,#55aa8b,#3b8a6e)}
.wb-c.b-tl{background:linear-gradient(160deg,#4189bd,#2b6795)}
.wb-c.b-dw{background:linear-gradient(160deg,#dcae50,#b98b2d)}
.wb-c.b-tw{background:linear-gradient(160deg,#cf6a4e,#a64b34)}
.wb-c.b-st::after{color:#e9b949;font-size:calc(var(--cs) * .7);text-shadow:0 0 6px rgba(233,185,73,.45)}
.wb-c.hov{background:#6a8796;box-shadow:inset 0 0 0 2px #ffe08a}
.wb-c.badw::before{content:'';position:absolute;inset:-1px;z-index:3;border-radius:2px;box-shadow:inset 0 0 0 2px #ff5a4a;animation:wbBadW 1.4s ease-out both;pointer-events:none}
@keyframes wbBadW{0%,60%{opacity:1}100%{opacity:0}}
.wb-t{position:absolute;inset:4%;z-index:1;border-radius:15%;display:flex;align-items:center;justify-content:center;color:#3b2814;
  background:linear-gradient(165deg,#fffbf2 0%,#f7e9c9 52%,#ebd3a1 100%);box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(150,105,45,.42),0 1px 1.5px rgba(0,0,0,.55)}
.wb-t span{font-weight:800;font-size:calc(var(--cs) * .6);line-height:1;margin:-8% 6% 0 0;font-family:system-ui,Roboto,"Segoe UI",sans-serif}
.wb-t sub{position:absolute;right:9%;bottom:6%;font-size:calc(var(--cs) * .25);font-weight:700;line-height:1;color:#7a5a32}
.wb-t.bl span{color:#b4513a;margin-right:0}
.wb-t.last{background:linear-gradient(165deg,#fff4c9 0%,#ffe08e 55%,#f0c35a 100%)}
.wb-t.pend{inset:2%;z-index:2;background:linear-gradient(165deg,#ffffff,#fdf4de 58%,#f4e2b6);box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(150,105,45,.4),0 0 0 2px #e9b949,0 3px 6px rgba(0,0,0,.45);cursor:grab}
.wb-t.pend.bad{background:linear-gradient(165deg,#ffe3dc,#ffc0b2);box-shadow:0 0 0 2px #ff5a4a,0 3px 6px rgba(0,0,0,.45);animation:wbShake .42s}
@keyframes wbShake{20%,60%{transform:translateX(-9%)}40%,80%{transform:translateX(9%)}}
.wb-t.drop{animation:wbDrop .36s cubic-bezier(.3,1.4,.5,1) both}
@keyframes wbDrop{0%{transform:translateY(-70%) scale(1.45);opacity:0}60%{opacity:1}100%{transform:none}}
.wb-t.lifted{opacity:.2}
#wbPrev{position:absolute;z-index:4;pointer-events:none;transform:translate(-50%,-50%) scale(0);opacity:0;background:#2a7a4f;color:#fff;font-weight:800;font-size:max(10px,calc(var(--cs) * .4));line-height:1;padding:.22em .4em;border-radius:99px;box-shadow:0 2px 6px rgba(0,0,0,.45),0 0 0 2px rgba(255,255,255,.85);transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .15s;white-space:nowrap}
#wbPrev.show{transform:translate(-50%,-50%) scale(1);opacity:1}#wbPrev.bingo{background:#c25a2e}
.wb-float{position:absolute;z-index:6;pointer-events:none;transform:translate(-50%,-50%);color:#fff;font-weight:900;font-size:max(18px,calc(var(--cs) * 1.1));text-shadow:0 2px 0 #7a4a10,0 0 12px rgba(255,200,60,.9);animation:wbFloat 1.4s ease-out both}
.wb-float.bingo{color:#fff3b0;font-size:max(24px,calc(var(--cs) * 1.5))}
@keyframes wbFloat{0%{opacity:0;transform:translate(-50%,-10%) scale(.5)}15%{opacity:1;transform:translate(-50%,-60%) scale(1.15)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-180%) scale(1)}}
.wb-bingo{position:absolute;left:50%;top:42%;z-index:40;transform:translate(-50%,-50%);text-align:center;pointer-events:none;animation:wbBingo 1.9s cubic-bezier(.3,1.3,.5,1) both}
.wb-bingo b{display:block;font-size:44px;font-weight:900;color:#ffe08a;text-shadow:0 3px 0 #8a4a10,0 0 24px rgba(255,190,60,.9)}.wb-bingo small{font-size:18px;font-weight:800;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.6)}
@keyframes wbBingo{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}30%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-70%) scale(1)}}
#wbDock{display:flex;flex-direction:column;gap:8px;flex:0 0 auto}
#wbRackBar{background:linear-gradient(180deg,#7a4e2a,#4f3019);border-radius:14px;padding:7px 6px 8px;box-shadow:inset 0 2px 0 rgba(255,255,255,.18),inset 0 -3px 0 rgba(0,0,0,.3),0 5px 12px rgba(0,0,0,.4)}
#wbRack{--rs:min(calc((100vw - 44px) / 7.25),60px);display:flex;justify-content:center;gap:5px;min-height:var(--rs);touch-action:none}
#wbRack.off .wb-t{filter:saturate(.7) brightness(.9)}
.wb-t.rk{position:relative;inset:auto;flex:0 0 auto;width:var(--rs);height:var(--rs);--cs:var(--rs);border-radius:14%;cursor:grab;transition:transform .15s;box-shadow:inset 0 1px 0 #fff,inset 0 -3px 0 rgba(150,105,45,.45),0 3px 5px rgba(0,0,0,.45)}
.wb-t.rk.sel{transform:translateY(-7px);box-shadow:inset 0 1px 0 #fff,inset 0 -3px 0 rgba(150,105,45,.45),0 0 0 3px #ffe08a,0 8px 12px rgba(0,0,0,.45)}
.wb-ghost{position:fixed;left:0;top:0;z-index:6000;pointer-events:none}
.wb-ghost .wb-t{position:absolute;inset:0;width:100%;height:100%;box-shadow:inset 0 1px 0 #fff,inset 0 -3px 0 rgba(150,105,45,.45),0 14px 22px rgba(0,0,0,.5)}
#wbActs{display:grid;grid-template-columns:repeat(4,1fr) 1.7fr;gap:6px}
#wbActs button{background:rgba(255,255,255,.08);border-radius:13px;padding:6px 0 5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:var(--ink);-webkit-tap-highlight-color:transparent;transition:opacity .2s,background .2s}
#wbActs button b{font-size:18px;line-height:1.2;font-weight:600}#wbActs button small{font-size:11px;color:var(--muted)}
#wbActs button:active{background:rgba(255,255,255,.16)}
#wbActs button:disabled{opacity:.38}
#wbActs #wbPlay{background:rgba(233,185,73,.32);color:#2b2100;flex-direction:row;gap:6px}
#wbActs #wbPlay b{font-size:17px;font-weight:800;color:#fff3cf}#wbActs #wbPlay small{font-size:15px;font-weight:900;color:#2b2100}
#wbActs #wbPlay.ready{background:linear-gradient(180deg,#f3c95a,#dca634);box-shadow:0 3px 0 #9a6e14}#wbActs #wbPlay.ready b{color:#2b2100}
#wbCover{position:absolute;inset:0;z-index:40;background:linear-gradient(#26333d,#11181d);display:none;align-items:center;justify-content:center;text-align:center;padding:24px}
#wbCover.show{display:flex}#wbCover h3{font-size:22px;margin:8px 0}#wbCover p{color:var(--muted);margin:0 0 18px;line-height:1.5}#wbCover p b{color:#fff}#wbCover p em{color:#ffd877;font-style:normal;font-weight:800}
#wbLoad{position:absolute;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(14,20,24,.6);text-align:center}
#wbLoad.show{display:flex}#wbLoad b{display:block;margin-top:12px;font-size:16px}
.wb-spin{width:42px;height:42px;margin:0 auto;border-radius:50%;border:4px solid rgba(255,255,255,.18);border-top-color:#e9b949;animation:wbSpin .8s linear infinite}
@keyframes wbSpin{to{transform:rotate(360deg)}}
#wbToast{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom));z-index:35;transform:translate(-50%,12px);opacity:0;pointer-events:none;background:rgba(20,28,34,.94);color:#fff;padding:10px 16px;border-radius:14px;font-size:14.5px;line-height:1.35;max-width:88%;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.45);transition:opacity .2s,transform .2s;border:1px solid rgba(255,255,255,.1)}
#wbToast.show{opacity:1;transform:translate(-50%,0)}#wbToast.err{background:rgba(120,30,24,.95);border-color:rgba(255,120,100,.4)}#wbToast b{letter-spacing:.04em}
#wbStartModal .sheet,#wbEndModal .sheet,#wbSwapModal .sheet,#wbBlankModal .sheet,#wbHistModal .sheet{background:linear-gradient(180deg,#26333d,#18212a)}
#wbStartModal .sticky-actions,#wbHistModal .sticky-actions{background:#18212a}
.wb-credit{font-size:11.5px;color:var(--muted);text-align:center;margin:4px 0 0;opacity:.85}
.wb-endsc{display:flex;align-items:center;justify-content:center;gap:16px;margin:4px 0 10px}.wb-endsc div{display:flex;flex-direction:column;align-items:center;min-width:90px}.wb-endsc small{color:var(--muted);font-size:13px}.wb-endsc b{font-size:34px;font-weight:900;font-variant-numeric:tabular-nums}.wb-endsc span{color:var(--muted);font-size:24px}
#wbEndText>small{display:block;color:var(--muted);line-height:1.5;margin-bottom:14px}
#wbEndModal .row .btn{padding:14px 6px;white-space:nowrap}
#wbSwapRack{display:flex;justify-content:center;gap:6px;margin:6px 0 16px;--rs:min(calc((100vw - 90px) / 7),54px)}
#wbSwapRack .wb-t.rk.sel{transform:translateY(-8px);box-shadow:0 0 0 3px #ff8a5a,0 8px 12px rgba(0,0,0,.45);filter:brightness(.92)}
#wbBlankGrid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:6px 0 14px}
#wbBlankGrid button{aspect-ratio:1/1;border-radius:9px;background:linear-gradient(165deg,#fffbf2,#ebd3a1);color:#b4513a;font-weight:800;font-size:20px;box-shadow:inset 0 -2px 0 rgba(150,105,45,.4),0 2px 3px rgba(0,0,0,.4)}
#wbBlankGrid button:active{transform:scale(.92)}
#wbHistList{list-style:none;margin:0;padding:0}
#wbHistList li{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.07);font-size:14.5px}
#wbHistList li i{width:10px;height:10px;border-radius:50%;flex:0 0 10px;background:#e9b949}#wbHistList li.p1 i{background:#6fb3e0}
#wbHistList li span{flex:1;min-width:0;letter-spacing:.02em}#wbHistList li span b{font-weight:700;letter-spacing:0;margin-right:4px}
#wbHistList li>em{font-style:normal;font-weight:800;color:#ffd877;font-variant-numeric:tabular-nums}#wbHistList .bg{font-style:normal;color:#ff9a6a;font-size:12px;font-weight:800}
#wbHistList li.none{color:var(--muted);justify-content:center}
#wb.land #wbMain{display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,40%);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"stage status" "stage log" "stage dock";column-gap:12px;padding:4px 10px 8px}
#wb.land #wbStage{grid-area:stage;height:auto!important}#wb.land #wbLog{grid-area:log;padding-top:6px}#wb.land .wb-bar{justify-content:center}#wb.land .wb-pl{max-width:240px}#wb.land #wbStatus{grid-area:status;white-space:normal;flex-direction:column;align-items:flex-start;gap:2px}#wb.land #wbDock{grid-area:dock}
#wb.land #wbRack{--rs:min(calc((40vw - 60px) / 7.3),54px)}
#wb.land .topbar{min-height:44px;padding:3px 6px}
#wb.land #wbToast{bottom:auto;top:70px;left:30%}
@media (max-width:360px){.wb-pl .av{display:none}#wbActs button small{font-size:10px}}''',
 'js': js,
 'gamesEntry': "  { id: 'wb', label: 'Woordbord', emoji: '🔤', bg: ['#5aa7c9', '#173445'], enter: () => Woordbord.enter(), tile: 'tileWb' },\n",
 'statRow': "['wb', `${S.wb.won || 0} van ${S.wb.played || 0} gewonnen · beste zet ${S.wb.bestWord || 0} punten`]",
 'wipe': ['wb.stats', 'wb.save', 'wb.settings'],
 'trophies': "    ['wb1', '🔤', 'Woordwinnaar', 'Win een potje Woordbord van de computer', S => (S.wb.won || 0) >= 1],\n    ['wb2', '💎', 'Woordkunstenaar', 'Scoor in Woordbord 50 punten of meer met één zet', S => (S.wb.bestWord || 0) >= 50],",
 'track': '''    // Woordbord: calm, thoughtful
    wb: { bpm: 74, bars: 8, seed: 263, rev: 3, revAmt: .38, fn(a) {
      const K = 55, ch = [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, 's4'], [4, 'm7'], [9, 'm7'], [2, 'm7'], [7, '7']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 62), bm = K - 12 + r;
        a.pad(a.at(b), cm, a.bar, .42, { cut: 1100, vol: .08 });
        a.bass(a.at(b), bm, a.beat * 2.6, .55, 'upright'); a.bass(a.at(b, 10), bm + 7, a.beat * 1.4, .4, 'upright');
        cm.forEach((m, i) => a.rhodes(a.at(b, i * 2), m, a.beat * 2.4, .28, -.2));
        if (b % 2) a.rhodes(a.at(b, 12), cm[cm.length - 1] + 12, a.beat, .2, .25);
        a.brush(a.at(b, 4), .22); a.brush(a.at(b, 12), .22); a.shaker(a.at(b, 6), .14); a.shaker(a.at(b, 14), .14);
      });
      melody(a, { chords: ch, root: K + 12, scale: 'major', lo: 74, hi: 86, rhythm: 'sparse', rest: .32 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .32, .2, 1.6, 'mbell'));
    } },''',
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('wb.json', 'w'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('wb.json'))
