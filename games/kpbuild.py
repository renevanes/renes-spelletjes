import json, math, os
# Builds kp.js (the complete module) from kpsrc/ and the game package kp.json for addgame.py
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('kpsrc/' + f).read()

planck = src('planck.min.js').strip()
planck = planck.replace('/*!\n * Planck.js v1.4.2', '/*!\n * Planck.js v1.4.2 (trimmed build for Katapult: no joints, serializer or testbed)', 1)
js = ('''/* ================================================================
   KATAPULT – slingshot physics puzzle: launch de Bollen (round fluffy
   critters) at towers of wood, ice and stone to win back the picnic
   basket from the greedy raccoons. Box2D physics via planck.js (MIT).
   20 levels in three themes, five critter types with tap abilities.
   ================================================================ */
const Katapult = (() => {
''' + planck + '\n' + src('core.js') + '\n' + src('art.js') + '\n' + src('game.js') + '''})();
$('#tileKp').addEventListener('click', () => Katapult.enter());
''')
open('kp.js', 'w').write(js)

# ---------- vector icon (512x512) ----------
def fluffy(cx, cy, R, n=16, amp=.08, rot=.1):
    pts = []
    for i in range(n):
        a0 = rot + i / n * 2 * math.pi; a1 = rot + (i + 1) / n * 2 * math.pi; am = (a0 + a1) / 2
        if i == 0: pts.append(f'M{cx + math.cos(a0) * R:.1f} {cy + math.sin(a0) * R:.1f}')
        pts.append(f'Q{cx + math.cos(am) * R * (1 + amp):.1f} {cy + math.sin(am) * R * (1 + amp):.1f} {cx + math.cos(a1) * R:.1f} {cy + math.sin(a1) * R:.1f}')
    return ''.join(pts) + 'Z'

bx, by, br = 292, 218, 112
U = lambda x, y: f'{bx + x * br:.1f} {by + y * br:.1f}'
bolle = (
  # speed streaks
  '<g stroke="#fff" stroke-linecap="round" opacity=".75"><path d="M60 196H148" stroke-width="14"/><path d="M84 244H160" stroke-width="11"/><path d="M50 150H130" stroke-width="9"/></g>'
  # tuft
  f'<g fill="none" stroke="#e48f00" stroke-width="13" stroke-linecap="round"><path d="M{U(-.18, -.86)}C{U(-.3, -1.25)} {U(-.6, -1.32)} {U(-.52, -1.1)}"/><path d="M{U(.04, -.9)}C{U(.04, -1.3)} {U(.2, -1.4)} {U(.28, -1.18)}"/><path d="M{U(.24, -.86)}C{U(.36, -1.22)} {U(.7, -1.3)} {U(.6, -1.06)}"/></g>'
  # feet
  f'<g fill="#ff9d3a" stroke="#b8560e" stroke-width="5"><ellipse cx="{bx - .36 * br:.0f}" cy="{by + .96 * br:.0f}" rx="{.24 * br:.0f}" ry="{.13 * br:.0f}" transform="rotate(-18 {bx - .36 * br:.0f} {by + .96 * br:.0f})"/><ellipse cx="{bx + .28 * br:.0f}" cy="{by + 1.0 * br:.0f}" rx="{.24 * br:.0f}" ry="{.13 * br:.0f}" transform="rotate(-10 {bx + .28 * br:.0f} {by + 1.0 * br:.0f})"/></g>'
  f'<path d="{fluffy(bx, by, br)}" fill="url(#kpBol)" stroke="#a85d00" stroke-width="7"/>'
  f'<clipPath id="kpBc"><path d="{fluffy(bx, by, br)}"/></clipPath><g clip-path="url(#kpBc)"><ellipse cx="{bx + .22 * br:.0f}" cy="{by + .5 * br:.0f}" rx="{.62 * br:.0f}" ry="{.48 * br:.0f}" fill="#fff8d6" opacity=".85"/></g>'
  # eyes (wide, flying)
  + ''.join(f'<ellipse cx="{bx + ex * br:.0f}" cy="{by + ey * br:.0f}" rx="{.24 * br:.0f}" ry="{.31 * br:.0f}" fill="#fff" stroke="#8a5a20" stroke-opacity=".4" stroke-width="4"/>'
            f'<ellipse cx="{bx + (ex + .07) * br:.0f}" cy="{by + (ey + .03) * br:.0f}" rx="{.15 * br:.0f}" ry="{.18 * br:.0f}" fill="#2b1a10"/>'
            f'<circle cx="{bx + (ex + .01) * br:.0f}" cy="{by + (ey - .06) * br:.0f}" r="{.06 * br:.0f}" fill="#fff"/>' for ex, ey in ((.2, -.14), (.62, -.12)))
  + f'<ellipse cx="{bx - .02 * br:.0f}" cy="{by + .22 * br:.0f}" rx="{.15 * br:.0f}" ry="{.09 * br:.0f}" fill="#ff6e78" opacity=".5"/><ellipse cx="{bx + .87 * br:.0f}" cy="{by + .2 * br:.0f}" rx="{.11 * br:.0f}" ry="{.08 * br:.0f}" fill="#ff6e78" opacity=".5"/>'
  + f'<ellipse cx="{bx + .44 * br:.0f}" cy="{by + .3 * br:.0f}" rx="{.11 * br:.0f}" ry="{.13 * br:.0f}" fill="#7a1c22"/><ellipse cx="{bx + .44 * br:.0f}" cy="{by + .37 * br:.0f}" rx="{.07 * br:.0f}" ry="{.045 * br:.0f}" fill="#ff7b8a"/>'
  + f'<ellipse cx="{bx - .45 * br:.0f}" cy="{by - .5 * br:.0f}" rx="{.25 * br:.0f}" ry="{.13 * br:.0f}" fill="#fff" opacity=".55" transform="rotate(-35 {bx - .45 * br:.0f} {by - .5 * br:.0f})"/>'
)
icon_body = (
  '<circle cx="410" cy="96" r="44" fill="#fff6c0" opacity=".9"/>'
  '<path d="M0 418C110 386 250 398 512 372V512H0Z" fill="url(#kpGr)"/><path d="M0 418C110 386 250 398 512 372" fill="none" stroke="#9be07a" stroke-width="8" opacity=".8"/>'
  # crate tower with a raccoon peeking
  '<g filter="url(#sh2)"><rect x="390" y="300" width="92" height="92" rx="8" fill="url(#kpWd)" stroke="#7a4a1e" stroke-width="5"/><path d="M402 380L470 312" stroke="#8a5428" stroke-width="10"/><rect x="398" y="308" width="76" height="76" fill="none" stroke="#7a4a1e" stroke-width="5"/>'
  '<circle cx="436" cy="268" r="40" fill="url(#kpRc)" stroke="#4a4e57" stroke-width="4"/><ellipse cx="410" cy="236" rx="13" ry="15" fill="#6d727c"/><ellipse cx="460" cy="234" rx="13" ry="15" fill="#6d727c"/>'
  '<path d="M398 262C404 250 420 252 428 258 436 252 456 250 470 260 466 272 446 272 434 268 422 274 404 274 398 262Z" fill="#2b2e35"/><circle cx="414" cy="262" r="5" fill="#fff"/><circle cx="444" cy="261" r="5" fill="#fff"/><circle cx="412" cy="263" r="2.6" fill="#111"/><circle cx="442" cy="262" r="2.6" fill="#111"/>'
  '<ellipse cx="410" cy="282" rx="16" ry="11" fill="#f4f0ea"/><ellipse cx="400" cy="278" rx="5" ry="4" fill="#1d1d22"/></g>'
  # slingshot
  '<g filter="url(#sh)" stroke-linecap="round" fill="none"><path d="M118 470V372Q116 336 92 300M118 372Q122 336 146 302" stroke="#4a2c12" stroke-width="34"/><path d="M118 470V372Q116 336 92 300M118 372Q122 336 146 302" stroke="url(#kpSl)" stroke-width="22"/>'
  '<path d="M92 304Q120 330 146 306" stroke="#6a2a1a" stroke-width="8"/><rect x="104" y="366" width="28" height="12" rx="3" fill="#5a2e1a"/></g>'
  f'<g filter="url(#sh)">{bolle}</g>'
  "' + spark(470, 186, 1.1, '#fff') + spark(60, 330, .8, '#fff') + '"
)
icon = ("{ bg: ['#8fdcff', '#2a7fd0'], defs: rg('kpBol', '#fff6b8', '#e48f00', .32, .28, .85) + rg('kpRc', '#d9dce2', '#6c717b', .35, .3, .8) + lg('kpGr', '#7fd35c', '#2f8a2a') + lg('kpWd', '#f2c48a', '#a8682f', 1, 1) + lg('kpSl', '#8a5a2e', '#d49a5a', 1, 0),\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds ----------
sfx = {
  'kpStretch': "[() => { const d = buf(.35); sweep(d, 0, .3, 'bp', 260, 900, 7, .9, .1); chip(d, 0, 130, 210, .3, .14, 'sq', 800); return d; }, .04, .13, 2]",
  'kpLaunch': "[() => { const d = buf(.75); chip(d, 0, 190, 80, .16, .55, 'sq', 1400); thud(d, 0, 120, .5, .04); sweep(d, .02, .55, 'bp', 600, 2800, 1.3, 1.1, .08); return d; }, .12, .42, 3]",
  'kpWood': "[() => { const d = buf(.35); thud(d, 0, 170 + Math.random() * 60, .8, .045); grains(d, 0, .06, 6, 500, 1400, .25, .004, .015); metal(d, 0, 640 + Math.random() * 120, .14, .04, [1, 2.3, 3.9]); return d; }, .1, .34, 4]",
  'kpWoodBreak': "[() => { const d = buf(.9); thud(d, 0, 115, .9, .06); grains(d, 0, .4, 46, 280, 2200, .3, .003, .02); sweep(d, 0, .3, 'bp', 1900, 600, 1.5, .6, .005); return d; }, .18, .46, 3]",
  'kpGlass': "[() => { const d = buf(.55); metal(d, 0, 2500 + Math.random() * 600, .32, .12, [1, 1.47, 2.09, 2.56]); grains(d, 0, .05, 4, 3000, 7000, .1, .003, .01); return d; }, .22, .24, 4]",
  'kpGlassBreak': "[() => { const d = buf(1.1); grains(d, 0, .55, 80, 2500, 9500, .22, .004, .05); sweep(d, 0, .2, 'hp', 8000, 3000, .8, .9, .002); metal(d, 0, 3100, .25, .2, [1, 1.51, 2.2, 3.3]); return d; }, .3, .42, 3]",
  'kpStone': "[() => { const d = buf(.55); thud(d, 0, 70 + Math.random() * 20, 1, .09); grains(d, 0, .1, 10, 200, 900, .25, .004, .02); return d; }, .15, .46, 3]",
  'kpStoneBreak': "[() => { const d = buf(1.2); thud(d, 0, 58, 1, .14); grains(d, 0, .55, 50, 150, 1600, .3, .005, .03); sweep(d, 0, .6, 'lp', 2600, 200, .8, .9, .005); return d; }, .25, .54, 2]",
  'kpRacHit': "[() => { const d = buf(.4); const f = 850 + Math.random() * 250; chip(d, 0, f, f * 1.45, .09, .35, 'tri', 3500); chip(d, .09, f * 1.4, f * .9, .12, .3, 'tri', 3000); thud(d, 0, 150, .4, .03); return d; }, .1, .28, 3]",
  'kpRacKo': "[() => { const d = buf(1.1); sweep(d, 0, .5, 'bp', 1400, 300, 1.2, 1, .01); chip(d, .02, 1400, 480, .45, .32, 'tri', 3000); grains(d, .05, .4, 14, 1500, 5000, .08, .004, .02); bell(d, .2, 1568, .16, .3); bell(d, .28, 2093, .12, .3); return d; }, .3, .44, 2]",
  'kpSplit': "[() => { const d = buf(.65); chip(d, 0, 700, 1400, .12, .3, 'tri', 4000); [0, .06, .12].forEach((t, i) => bell(d, t, 1200 + i * 300, .22, .2)); sweep(d, 0, .25, 'bp', 1500, 4000, 2, .5, .01); return d; }, .2, .34, 1]",
  'kpBoost': "[() => { const d = buf(.95); sweep(d, 0, .75, 'bp', 500, 5200, 1.8, 1.2, .04); chip(d, 0, 300, 1300, .3, .25, 'sq', 2500); return d; }, .25, .42, 1]",
  'kpDive': "[() => { const d = buf(.95); chip(d, 0, 1700, 190, .6, .3, 'tri', 2500); sweep(d, 0, .75, 'bp', 3000, 380, 1.4, 1, .05); return d; }, .2, .42, 1]",
  'kpBoom': "[() => { const d = buf(1.7); explosion(d, 1.1, 40, 1); grains(d, .02, .5, 24, 1500, 6000, .06, .004, .02); return d; }, .35, .62, 2]",
  'kpThump': "[() => { const d = buf(.35); thud(d, 0, 90 + Math.random() * 30, .9, .06); sweep(d, 0, .12, 'lp', 900, 200, .8, .5, .005); return d; }, .08, .32, 3]",
  'kpPoof': "[() => { const d = buf(.4); sweep(d, 0, .3, 'bp', 900, 2600, 1.4, .8, .02); chip(d, 0, 600, 900, .08, .12, 'tri', 3000); return d; }, .15, .2, 2]",
  'kpHop': "[() => { const d = buf(.3); const f = 650 + Math.random() * 200; chip(d, 0, f, f * 2, .1, .3, 'tri', 4500); chip(d, .1, f * 1.4, f * 2.3, .08, .22, 'tri', 4500); return d; }, .1, .22, 3]",
  'kpBonus': "[() => { const d = buf(.9); [1319, 1760, 2093].forEach((f, i) => bell(d, i * .05, f, .25, .35)); chip(d, 0, 900, 1800, .1, .15, 'tri', 5000); return d; }, .35, .32, 1]",
  'kpLaugh': "[() => { const d = buf(1.3); [0, .17, .34, .51, .68].forEach((t, i) => { chip(d, t, 560 - i * 25, 430 - i * 25, .12, .32, 'sq', 1600); chip(d, t + .005, 1120 - i * 50, 860 - i * 50, .1, .08, 'tri', 3000); }); return d; }, .2, .3, 1]",
  'kpStar': "[() => { const d = buf(.9); bell(d, 0, 1568, .35, .45); bell(d, .02, 2349, .18, .35); grains(d, 0, .2, 8, 4000, 9000, .05, .004, .02); return d; }, .35, .3, 1]",
  'kpWin': "[() => { const d = buf(3.2); [[0, 523.3], [.13, 659.3], [.26, 784], [.42, 1046.5]].forEach(([t, f]) => { brass(d, t, f, .22, .4, 1.1); bell(d, t, f * 2, .12, .4); }); [523.3, 659.3, 784, 1046.5].forEach(f => brass(d, .62, f, 1.3, .22, .9)); drum(d, .62, 62, .8, .45); grains(d, .62, 1.2, 40, 3000, 9000, .04, .01, .05); return d; }, .45, .56, 1]",
  'kpFail': "[() => { const d = buf(2.4); [[0, 392], [.25, 370], [.5, 349.2], [.8, 261.6]].forEach(([t, f], i) => brass(d, t, f, i === 3 ? .9 : .22, .35, .5)); drum(d, .8, 55, .6, .4); return d; }, .4, .46, 1]",
}

g = {
 'id': 'kp', 'tile': 'Kp', 'mod': 'Katapult', 'bar': '#1f4f7a', 'statsKey': 'kp.progress', 'music': 'kp',
 'tileHtml': '''    <button class="tile" id="tileKp">
      <div class="art"><img class="tile-img" id="artKp" alt=""></div>
      <div>
        <h2>Katapult</h2>
        <p>Schiet de Bollen op de torens van de wasberen</p>
      </div>
    </button>
''',
 'screenHtml': '''<!-- ============ KATAPULT ============ -->
<section id="kp" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="kpBack" aria-label="Terug">‹</button>
    <div class="kp-hud"><span class="kp-lvl" id="kpLvl">1</span><div class="kp-sc"><b id="kpScore">0</b><small id="kpBest"></small></div><span class="kp-rac"><img id="kpRacIco" alt=""><b id="kpRac">0</b></span></div>
    <button class="iconbtn" id="kpRetry" aria-label="Opnieuw">↻</button>
    <button class="iconbtn" id="kpMenu" aria-label="Levels">☰</button>
  </div>
  <div id="kpWrap"><canvas id="kpCanvas"></canvas><div id="kpBanner"></div></div>
</section>
''',
 'modalHtml': '''<div class="modal" id="kpStartModal">
  <div class="sheet">
    <h3>🎯 Katapult</h3>
    <p class="note" style="color:var(--muted);margin-top:0">De gulzige wasberen hebben de picknickmand van de Bollen gestolen en verschansen zich in wankele bouwsels van hout, ijs en steen. Trek de katapult naar achteren, mik en laat los. Tik tijdens de vlucht voor het kunstje van de Bol. Versla alle wasberen: elke Bol die je overhoudt levert 10.000 bonuspunten op. Sleep of knijp om rond te kijken.</p>
    <div class="kp-crits" id="kpCrits"></div>
    <div class="kp-lvhead"><b>Levels</b><span id="kpStarSum"></span></div>
    <div class="kp-levels" id="kpLevels"></div>
    <div id="kpOptList"></div>
    <div class="row sticky-actions"><button class="btn" id="kpStartBack">Menu</button><button class="btn primary" id="kpResume" hidden>Verder ▶</button></div>
  </div>
</div>
<div class="modal center" id="kpEndModal">
  <div class="sheet">
    <div class="kp-stars" id="kpEndStars"></div>
    <h3 id="kpEndTitle"></h3>
    <p id="kpEndText"></p>
    <div class="row"><button class="btn" id="kpEndMenu">Levels</button><button class="btn" id="kpEndRetry">Opnieuw</button><button class="btn primary" id="kpEndNext">Volgende ▶</button></div>
  </div>
</div>''',
 'css': '''#kp{background:#4fb8ff}
#kp .topbar{background:linear-gradient(180deg,rgba(10,36,66,.78),rgba(10,36,66,.55));gap:6px}
.kp-hud{flex:1;display:flex;align-items:center;justify-content:center;gap:12px;min-width:0}
.kp-lvl{background:linear-gradient(160deg,#ffd75a,#f08a1a);color:#4a2400;font-weight:800;font-size:16px;border-radius:11px;min-width:32px;height:32px;padding:0 6px;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -3px 0 rgba(120,50,0,.25),0 2px 6px rgba(0,0,0,.25)}
.kp-sc{display:flex;flex-direction:column;align-items:center;line-height:1.1;min-width:0}
.kp-sc b{font-size:21px;font-weight:800;font-variant-numeric:tabular-nums;text-shadow:0 1px 2px rgba(0,0,0,.45)}
.kp-sc small{font-size:11px;color:rgba(255,255,255,.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:38vw}
.kp-rac{display:flex;align-items:center;gap:2px;font-weight:800;font-size:18px;font-variant-numeric:tabular-nums}.kp-rac img{width:30px;height:30px;margin:-4px 0}
#kpWrap{flex:1;position:relative;min-height:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
#kpCanvas{position:absolute;left:0;top:0;display:block;touch-action:none}
#kpBanner{position:absolute;left:50%;top:54px;transform:translate(-50%,-8px);background:rgba(16,30,54,.76);color:#fff;padding:9px 16px;border-radius:14px;font-weight:700;font-size:15px;line-height:1.3;opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;max-width:88%;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.25)}
#kpBanner.show{opacity:1;transform:translate(-50%,0)}
#kpStartModal .sheet,#kpEndModal .sheet{background:linear-gradient(180deg,#25496f,#15293f)}
#kpStartModal .sticky-actions{background:#15293f}
.kp-crits{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:2px 0 12px}
.kp-crits div{display:flex;flex-direction:column;align-items:center;text-align:center;background:rgba(255,255,255,.07);border-radius:14px;padding:7px 3px 8px;gap:1px}
.kp-crits img{width:44px;height:44px;margin-bottom:2px}.kp-crits b{font-size:12.5px}.kp-crits small{font-size:10.5px;color:var(--muted);line-height:1.25}
.kp-crits .unseen img{filter:brightness(0) opacity(.3)}
.kp-lvhead{display:flex;justify-content:space-between;align-items:baseline;margin:4px 0 0}.kp-lvhead span{color:#ffe14d;font-weight:800}
.kp-levels{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:4px 0 14px}
.kp-th{grid-column:1/-1;font-weight:800;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:8px 0 0}
.kp-levels button{position:relative;aspect-ratio:1/1;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#fff;-webkit-tap-highlight-color:transparent}
.kp-levels button.t0{background:linear-gradient(160deg,#8fe07a,#3a9a3e);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,60,0,.2),0 3px 0 #1f5a22}
.kp-levels button.t1{background:linear-gradient(160deg,#7fd2ff,#2a7fc8);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,30,80,.2),0 3px 0 #17466e}
.kp-levels button.t2{background:linear-gradient(160deg,#c49af0,#6a44a8);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(40,0,80,.2),0 3px 0 #3a2266}
.kp-levels button:active{transform:translateY(2px)}
.kp-levels button b{font-size:20px;font-weight:800;line-height:1.1;text-shadow:0 2px 0 rgba(0,0,0,.22)}
.kp-levels button span{font-size:12px;letter-spacing:-1px;line-height:1}.kp-levels button i{font-style:normal;color:rgba(0,0,0,.28)}.kp-levels button i.on{color:#ffe14d;text-shadow:0 0 4px rgba(255,200,0,.7),0 1px 0 rgba(120,60,0,.6)}
.kp-levels button.lock{background:rgba(255,255,255,.07);box-shadow:none;opacity:.55}.kp-levels button.lock b{font-size:16px}
.kp-levels button.next{animation:kpGlow 1.4s ease-in-out infinite}
@keyframes kpGlow{50%{box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 3px 0 rgba(0,0,0,.3),0 0 0 4px rgba(255,225,77,.85)}}
#kpEndModal .row .btn{padding:14px 6px;white-space:nowrap;font-size:15px}
.kp-stars{display:flex;justify-content:center;align-items:flex-end;gap:4px;margin:-6px 0 8px;min-height:64px}
.kp-stars span{font-size:48px;color:rgba(255,255,255,.14);line-height:1}
.kp-stars span:nth-child(2){font-size:62px;margin-bottom:8px}
.kp-stars span.on{color:#ffd84a;text-shadow:0 0 16px rgba(255,200,40,.7),0 3px 0 #b8780a;animation:kpStar .55s cubic-bezier(.3,1.7,.5,1) both}
.kp-stars .kp-endico{width:72px;height:72px;animation:kpWob 1s ease-in-out infinite}
@keyframes kpStar{0%{transform:scale(0) rotate(-40deg);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes kpWob{50%{transform:rotate(-8deg) translateY(-4px)}}
#kp.land .topbar{min-height:44px;padding:4px 10px}#kp.land .kp-sc b{font-size:18px}
@media (max-width:360px){.kp-crits small{display:none}.kp-hud{gap:8px}}''',
 'js': js,
 'gamesEntry': "  { id: 'kp', label: 'Katapult', emoji: '🎯', bg: ['#8fdcff', '#2a7fd0'], enter: () => Katapult.enter(), tile: 'tileKp' },\n",
 'statRow': "['kp', `${Object.keys(S.kp.stars || {}).length}/20 levels · ${Object.values(S.kp.stars || {}).reduce((a, b) => a + b, 0)} ★ · ${S.kp.ko || 0} wasberen verslagen`]",
 'wipe': ['kp.progress', 'kp.settings'],
 'trophies': "    ['kp1', '🎯', 'Raak geschoten', 'Haal het eerste level van Katapult', S => Object.keys(S.kp.stars || {}).length >= 1],\n    ['kp2', '🧺', 'Picknick gered', 'Haal alle 20 levels van Katapult', S => Object.keys(S.kp.stars || {}).length >= 20],",
 'track': '''    // Katapult: playful adventure march
    kp: { bpm: 132, bars: 8, seed: 241, swing: .12, fn(a) {
      const K = 60, ch = [[0, 'M'], [5, 'M'], [9, 'm'], [7, 'M'], [0, 'M'], [2, 'm7'], [5, 'M'], [7, '7']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 62), bm = K - 24 + r;
        a.kick(a.at(b), .6); a.kick(a.at(b, 8), .45); a.snare(a.at(b, 4), .42); a.snare(a.at(b, 12), .42); if (b % 2) a.snare(a.at(b, 14), .18);
        for (let s = 0; s < 16; s += 2) a.hat(a.at(b, s), s % 4 ? .4 : .22);
        [[0, 0], [4, 7], [8, 12], [12, 7]].forEach(([s, iv]) => a.bass(a.at(b, s), bm + iv, a.st * 2.6, .75, 'upright'));
        [2, 6, 10, 14].forEach(s => cm.forEach(m => a.pluck(a.at(b, s), m + 12, a.st * .9, .2, .3)));
        a.brass(a.at(b), cm, a.beat * 1.4, .5, { vol: .1, cut: 2200 });
        a.marimba(a.at(b, 6), cm[2 % cm.length] + 12, .35, -.35); a.marimba(a.at(b, 14), cm[1] + 12, .3, -.35);
      });
      melody(a, { chords: ch, root: K, scale: 'major', lo: 72, hi: 88, rhythm: 'even', rest: .08 }).forEach(n => a.lead(a.at(n.b, n.s), n.m, n.len * a.st, .7, { wave: 'triangle', cut: 4000, vol: .24, vib: 16, breath: .15 }));
      [0, 4].forEach(b => a.timp(a.at(b), K - 24, .5));
    } },''',
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('kp.json', 'w'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('kp.json'))
