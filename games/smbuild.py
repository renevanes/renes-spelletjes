import json, math, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
js = open('sm.js').read()

# ---------- vector icon (512x512) ----------
def heart(cx, cy, R):
    P = lambda x, y: f'{cx + x * R:.1f} {cy + y * R:.1f}'
    return (f'M{P(0, .9)}C{P(-.38, .62)} {P(-1.02, .22)} {P(-.98, -.3)}C{P(-.94, -.84)} {P(-.28, -1.0)} {P(0, -.5)}'
            f'C{P(.28, -1.0)} {P(.94, -.84)} {P(.98, -.3)}C{P(1.02, .22)} {P(.38, .62)} {P(0, .9)}Z')
def star(cx, cy, R, rot=0):
    pts = []
    for j in range(10):
        a = -math.pi / 2 + j * math.pi / 5 + rot
        r = R * (.5 if j % 2 else 1.04)
        pts.append(f'{cx + math.cos(a) * r:.1f} {cy + math.sin(a) * r:.1f}')
    return 'M' + 'L'.join(pts) + 'Z'
def ring(cx, cy, R, r):
    return (f'M{cx - R} {cy}a{R} {R} 0 1 0 {2 * R} 0a{R} {R} 0 1 0 {-2 * R} 0Z'
            f'M{cx - r} {cy}a{r} {r} 0 1 1 {2 * r} 0a{r} {r} 0 1 1 {-2 * r} 0Z')
def gem(cx, cy, R):
    pts = [(-.55, -.74), (.55, -.74), (.98, -.2), (0, .94), (-.98, -.2)]
    return 'M' + 'L'.join(f'{cx + x * R:.1f} {cy + y * R:.1f}' for x, y in pts) + 'Z'

hp, sp, rp, gp = heart(206, 300, 138), star(358, 158, 88, .2), ring(372, 372, 76, 27), gem(112, 142, 54)
stripes = ''.join(f'<rect x="60" y="{y}" width="300" height="22" fill="#fff" opacity=".9"/>' for y in (236, 290, 344))
icon_body = (
  '<circle cx="256" cy="256" r="230" fill="url(#smGlow)"/>'
  f'<g filter="url(#sh2)"><path d="{gp}" fill="url(#smB)" stroke="#0c3fa6" stroke-width="5" stroke-linejoin="round"/>'
  f'<path d="M112 102L82 142H142Z" fill="#fff" opacity=".35"/><ellipse cx="100" cy="112" rx="16" ry="8" fill="#fff" opacity=".7" transform="rotate(-20 100 112)"/></g>'
  f'<g filter="url(#sh)"><path d="{sp}" fill="url(#smY)" stroke="#b87d00" stroke-width="16" stroke-linejoin="round"/><path d="{sp}" fill="url(#smY)"/>'
  '<ellipse cx="336" cy="128" rx="30" ry="14" fill="#fff" opacity=".75" transform="rotate(-25 336 128)"/></g>'
  f'<g filter="url(#sh)"><path d="{rp}" fill="url(#smO)" fill-rule="evenodd" stroke="#a84800" stroke-width="5"/>'
  '<path d="M322 340A62 62 0 0 1 380 304" stroke="#fff" stroke-width="12" stroke-linecap="round" fill="none" opacity=".7"/>'
  + ''.join(f'<ellipse cx="{372 + math.cos(a) * 52:.0f}" cy="{372 + math.sin(a) * 52:.0f}" rx="6" ry="3" fill="#fff" opacity=".8" transform="rotate({a * 57:.0f} {372 + math.cos(a) * 52:.0f} {372 + math.sin(a) * 52:.0f})"/>' for a in (.6, 1.9, 2.9, 4.1, 5.3)) + '</g>'
  f'<g filter="url(#sh)"><path d="{hp}" fill="url(#smH)" stroke="#9e0b37" stroke-width="6"/>'
  f'<clipPath id="smHc"><path d="{hp}"/></clipPath><g clip-path="url(#smHc)">{stripes}<ellipse cx="180" cy="230" rx="62" ry="30" fill="#fff" opacity=".55" transform="rotate(-25 180 230)"/></g>'
  '<circle cx="136" cy="250" r="9" fill="#fff"/></g>'
  "' + spark(452, 252, 1.3, '#fff') + spark(62, 400, 1, '#fff') + spark(250, 96, .8, '#fff8d0') + '"
)
icon = ("{ bg: ['#ff9fd2', '#6a1f9a'], defs: rg('smH', '#ffd0dc', '#e0123f', .32, .26, .8) + rg('smY', '#fffad0', '#f0a400', .34, .28, .8) + rg('smO', '#ffe3b0', '#e86400', .34, .28, .8) + rg('smB', '#d2e9ff', '#1f68e0', .34, .28, .8)"
        " + '<radialGradient id=\"smGlow\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".35\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/></radialGradient>',\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds ----------
sfx = {
  'smSwap': "[() => { const d = buf(.25); sweep(d, 0, .2, 'bp', 600, 2200, 1.4, .9, .03); chip(d, 0, 520, 780, .07, .1, 'tri', 3000); return d; }, .05, .22, 3]",
  'smBad': "[() => { const d = buf(.45); chip(d, 0, 420, 300, .12, .3, 'tri', 2000); chip(d, .15, 380, 260, .14, .26, 'tri', 1800); thud(d, 0, 140, .25, .03); return d; }, .05, .26, 1]",
  'smStripeMake': "[() => { const d = buf(.9); sweep(d, 0, .45, 'bp', 700, 5000, 5, 1.1, .05); [1319, 1760, 2093].forEach((f, i) => bell(d, .05 + i * .06, f, .2, .35)); return d; }, .3, .3, 1]",
  'smWrapMake': "[() => { const d = buf(.9); grains(d, 0, .3, 40, 2500, 9000, .12, .002, .01); [988, 1319, 1661].forEach((f, i) => bell(d, .08 + i * .07, f, .22, .35)); return d; }, .3, .3, 1]",
  'smOrbMake': "[() => { const d = buf(1.5); [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => bell(d, i * .05, f, .2, .6)); sweep(d, 0, .8, 'bp', 1200, 7000, 4, .5, .2); return d; }, .45, .34, 1]",
  'smBeam': "[() => { const d = buf(.6); chip(d, 0, 2600, 260, .35, .3, 'sq', 5000); sweep(d, 0, .45, 'hp', 6000, 1500, .8, .9, .005); sweep(d, 0, .3, 'bp', 3000, 800, 2, .6, .005); return d; }, .2, .3, 2]",
  'smBoom': "[() => { const d = buf(1); thud(d, 0, 75, 1, .12); sweep(d, 0, .6, 'lp', 3500, 250, .8, 1.3, .004); grains(d, .02, .35, 18, 800, 4000, .12, .004, .02); bell(d, .02, 523, .15, .3); return d; }, .3, .46, 2]",
  'smZap': "[() => { const d = buf(1.3); sweep(d, 0, .9, 'bp', 400, 7000, 6, 1.2, .1); grains(d, 0, .8, 50, 2000, 9000, .1, .003, .02); [1047, 1568, 2093].forEach((f, i) => bell(d, .05 + i * .08, f, .18, .5)); return d; }, .4, .38, 1]",
  'smJelly': "[() => { const d = buf(.35); chip(d, 0, 600, 240, .16, .3, 'tri', 1400); sweep(d, 0, .15, 'bp', 1200, 500, 3, .4, .005); return d; }, .1, .2, 3]",
  'smIce': "[() => { const d = buf(.6); grains(d, 0, .15, 26, 2200, 9000, .3, .003, .03); thud(d, 0, 260, .35, .025); metal(d, 0, 2400, .15, .08, [1, 2.3, 3.7]); return d; }, .2, .3, 3]",
  'smIng': "[() => { const d = buf(1.3); [1047, 1319, 1568, 2093].forEach((f, i) => bell(d, i * .07, f, .26, .5)); chip(d, 0, 520, 1040, .12, .15, 'tri', 4000); return d; }, .4, .36, 1]",
  'smWin': "[() => { const d = buf(2.8); [[0, 523.3], [.12, 659.3], [.24, 784], [.36, 1046.5], [.5, 1318.5]].forEach(([t, f]) => { chip(d, t, f, f, .14, .26, 'tri', 6000); bell(d, t, f * 2, .12, .4); }); [1046.5, 1318.5, 1568].forEach(f => bell(d, .7, f, .25, 1.2)); drum(d, .7, 70, .4, .3); return d; }, .45, .46, 1]",
  'smFail': "[() => { const d = buf(1.8); [[0, 659.3], [.22, 587.3], [.44, 523.3], [.7, 392]].forEach(([t, f], i) => chip(d, t, f, i === 3 ? f * .94 : f, i === 3 ? .6 : .2, .28, 'tri', 2500)); return d; }, .35, .38, 1]",
  'smCombo': "[() => { const d = buf(1.4); sweep(d, 0, .7, 'bp', 300, 6000, 3, 1.3, .15); thud(d, .05, 70, .8, .12); [784, 1175, 1568, 2349].forEach((f, i) => bell(d, .1 + i * .06, f, .2, .6)); return d; }, .45, .42, 1]",
  'smShuffle': "[() => { const d = buf(.9); for (let k = 0; k < 14; k++) chip(d, k * .045, 900 + Math.random() * 900, 600 + Math.random() * 600, .05, .14, 'tri', 4000); sweep(d, 0, .7, 'bp', 800, 2400, 2, .4, .2); return d; }, .2, .28, 1]",
  'smBonus': "[() => { const d = buf(1.2); [1568, 2093, 2637].forEach((f, i) => bell(d, i * .09, f, .25, .5)); grains(d, 0, .4, 16, 3000, 8000, .08, .003, .02); return d; }, .4, .34, 1]",
  'smTick': "[() => { const d = buf(.25); bell(d, 0, 1760, .3, .12); chip(d, 0, 2200, 2600, .03, .08, 'tri', 7000); return d; }, .15, .2, 2]",
  'smCheer': "[() => { const d = buf(1); [1319, 1661, 1976].forEach((f, i) => bell(d, i * .05, f, .22, .45)); sweep(d, 0, .5, 'bp', 2000, 6000, 3, .3, .1); return d; }, .4, .3, 1]",
}
# match pop: one sound per cascade level, rising in pitch (major pentatonic steps)
for n, semi in enumerate([0, 2, 4, 7, 9, 12, 14, 16], 1):
    f = round(660 * 2 ** (semi / 12), 1)
    sfx['smPop%d' % n] = ("[() => { const d = buf(.45); thud(d, 0, 200, .35, .02); chip(d, 0, %s, %s, .045, .35, 'tri', 7000); bell(d, .012, %s, .32, .14); bell(d, .012, %s, .1, .08); grains(d, .01, .08, 5, 2500, 6000, .05, .004, .015); return d; }, .18, .3, 2]"
                          % (round(f * 1.6, 1), f, f, round(f * 2, 1)))

g = {
 'id': 'sm', 'tile': 'Sm', 'mod': 'Snoepmix', 'bar': '#3a1752', 'statsKey': 'sm.progress', 'music': 'sm',
 'tileHtml': '''    <button class="tile" id="tileSm">
      <div class="art"><img class="tile-img" id="artSm" alt=""></div>
      <div>
        <h2>Snoepmix</h2>
        <p>Wissel snoepjes en maak rijtjes van drie</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ SNOEPMIX ============ -->
<section id="sm" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="smBack" aria-label="Terug">‹</button>
    <div class="sm-title" id="smTitle">Snoepmix</div>
    <button class="iconbtn" id="smRetry" aria-label="Opnieuw">↻</button>
    <button class="iconbtn" id="smMenu" aria-label="Levels">☰</button>
  </div>
  <div id="smWrap">
    <div id="smHud">
      <div class="sm-box sm-moves" id="smMovesW"><small>Zetten</small><b id="smMoves">0</b></div>
      <div class="sm-box sm-score"><small>Score</small><b id="smScore">0</b><div class="sm-bar" id="smBar"><i id="smBarFill"></i><em>★</em><em>★</em><em>★</em></div></div>
      <div class="sm-box sm-goals" id="smGoals"></div>
    </div>
    <div id="smStage"><canvas id="smCanvas"></canvas></div>
  </div>
</section>
''',
 'modalHtml': '''<div class="modal" id="smStartModal">
  <div class="sheet">
    <h3>🍬 Snoepmix</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Wissel twee snoepjes die naast elkaar liggen (vegen, of twee keer tikken) en maak rijtjes van drie of meer. Vier op een rij geeft een <b>streepsnoepje</b> dat een hele rij of kolom wegveegt, een hoek of T geeft een <b>snoeppakje</b> dat twee keer ontploft, en vijf op een rij een <b>regenboogbol</b> die alle snoepjes van één kleur weghaalt. Wissel twee speciale snoepjes met elkaar voor een extra grote knal!</p>
    <div class="sm-levels" id="smLevels"></div>
    <button class="sm-endless" id="smEndless"></button>
    <div id="smOptList"></div>
    <div class="stats" id="smStats"></div>
    <div class="row sticky-actions"><button class="btn" id="smStartBack">Menu</button><button class="btn primary" id="smResume" hidden>Verder ▶</button></div>
  </div>
</div>
<div class="modal center" id="smLevelModal">
  <div class="sheet">
    <div class="sm-lvnum" id="smLvNum"></div>
    <h3 id="smLvName"></h3>
    <div class="sm-lvgoals" id="smLvGoals"></div>
    <p id="smLvText"></p>
    <div class="row"><button class="btn" id="smLvBack">Levels</button><button class="btn primary" id="smLvGo">Spelen ▶</button></div>
  </div>
</div>
<div class="modal center" id="smEndModal">
  <div class="sheet">
    <div class="sm-stars" id="smEndStars"></div>
    <h3 id="smEndTitle"></h3>
    <p id="smEndText"></p>
    <div class="row"><button class="btn" id="smEndMenu">Levels</button><button class="btn" id="smEndRetry">Opnieuw</button><button class="btn primary" id="smEndNext">Volgende ▶</button></div>
  </div>
</div>''',
 'css': '''#sm{background:radial-gradient(circle,rgba(255,255,255,.1) 0 2px,transparent 2.6px) 0 0/44px 44px,radial-gradient(circle,rgba(255,220,250,.07) 0 3px,transparent 3.6px) 22px 22px/44px 44px,radial-gradient(130% 80% at 50% -8%,#ff9fd2 0%,#c75cb8 30%,#5e2a88 66%,#2a1146 100%);background-color:#2a1146}
#sm .topbar{background:rgba(40,10,62,.55);gap:4px}
.sm-title{flex:1;min-width:0;text-align:center;font-weight:800;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.35)}
#smWrap{flex:1;display:flex;flex-direction:column;min-height:0;user-select:none;-webkit-user-select:none}
#smHud{display:flex;gap:8px;padding:8px 10px 0;align-items:stretch}
.sm-box{background:rgba(36,8,58,.5);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:6px 10px;display:flex;flex-direction:column;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 4px 12px rgba(30,0,50,.25);min-width:0}
.sm-box small{font-size:10px;color:#f6d3ec;text-transform:uppercase;letter-spacing:.08em;font-weight:700;line-height:1.2}
.sm-moves{align-items:center;min-width:66px}
.sm-moves b{font-size:30px;line-height:1.05;font-weight:800;font-variant-numeric:tabular-nums}
.sm-moves.low b{color:#ffbf5e;animation:smPulse .9s ease-in-out infinite}
@keyframes smPulse{50%{transform:scale(1.12)}}
.sm-score{flex:1 1 0}
.sm-score b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.15}
.sm-bar{position:relative;height:9px;border-radius:5px;background:rgba(0,0,0,.35);margin:6px 4px 2px 0;box-shadow:inset 0 1px 2px rgba(0,0,0,.4)}
.sm-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:linear-gradient(90deg,#ff6fb9,#ffd84a);width:0;transition:width .3s;box-shadow:0 0 8px rgba(255,180,90,.6)}
.sm-bar em{position:absolute;top:50%;transform:translate(-50%,-52%);font-style:normal;font-size:15px;color:rgba(255,255,255,.4);line-height:1;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.sm-bar em.on{color:#ffdd4a;text-shadow:0 0 6px rgba(255,210,60,.9),0 1px 1px rgba(120,60,0,.8)}
.sm-goals{flex:1.5 1 0;flex-direction:row;align-items:center;gap:4px;justify-content:space-around;flex-wrap:nowrap;padding:4px 4px}
.sm-goals.many .sm-goal{min-width:28px} .sm-goals.many .sm-goal img{width:26px;height:26px}
.sm-goal{display:flex;flex-direction:column;align-items:center;min-width:32px}
.sm-goal img{width:30px;height:30px;display:block}
.sm-goal b{font-size:15px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
.sm-goal.sc b{font-size:17px}
.sm-goal.done b{color:#8dffa6}
.sm-gsc{display:flex;align-items:center;justify-content:center}
#smStage{flex:1;position:relative;min-height:0;touch-action:none}
#smCanvas{position:absolute;left:0;top:0;display:block;touch-action:none}
#sm.land #smWrap{flex-direction:row}
#sm.land #smHud{flex-direction:column;width:196px;padding:10px 0 10px 12px;justify-content:center}
#sm.land .sm-box{flex:0 0 auto}
#sm.land .sm-moves{flex-direction:row;gap:12px;justify-content:center}
#sm.land .sm-goals{padding:8px 6px}
#smStartModal .sheet,#smLevelModal .sheet,#smEndModal .sheet{background:linear-gradient(180deg,#3d1a56,#2a1140)}
#smStartModal .sticky-actions{background:#2a1140}
.sm-levels{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}
.sm-levels button{position:relative;aspect-ratio:1/1.02;border-radius:16px;background:linear-gradient(160deg,#ff93cb,#c0449e 70%,#a2358a);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(90,0,70,.25),0 3px 0 #5e1a55;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#fff;-webkit-tap-highlight-color:transparent}
.sm-levels button:active{transform:translateY(2px);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 1px 0 #5e1a55}
.sm-levels button b{font-size:20px;font-weight:800;line-height:1.1;text-shadow:0 2px 0 rgba(90,0,60,.35)}
.sm-levels button span{font-size:12px;letter-spacing:-1px;line-height:1} .sm-levels button i{font-style:normal;color:rgba(70,0,50,.35)} .sm-levels button i.on{color:#ffe14d;text-shadow:0 0 4px rgba(255,200,0,.7),0 1px 0 rgba(120,60,0,.6)}
.sm-levels button.lock{background:rgba(255,255,255,.07);box-shadow:none;opacity:.55}
.sm-levels button.lock b{font-size:16px}
.sm-levels button.next{animation:smGlow 1.4s ease-in-out infinite}
@keyframes smGlow{0%,100%{box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 3px 0 #5e1a55,0 0 0 0 rgba(255,225,77,.0)}50%{box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 3px 0 #5e1a55,0 0 0 4px rgba(255,225,77,.85)}}
.sm-endless{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:linear-gradient(115deg,#5b33d6,#b040b0 60%,#e0558f);margin:2px 0 14px;text-align:left;box-shadow:inset 0 2px 0 rgba(255,255,255,.28),0 3px 0 #2c1268;color:#fff}
.sm-endless:active{transform:translateY(2px)}
.sm-endless span{font-size:30px;line-height:1} .sm-endless b{display:block;font-size:16px} .sm-endless small{color:rgba(255,255,255,.82);font-size:12px}
.sm-lvnum{display:inline-block;background:linear-gradient(160deg,#ff93cb,#c0449e);border-radius:99px;padding:4px 14px;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;box-shadow:0 2px 0 #5e1a55}
.sm-lvgoals{display:flex;justify-content:center;gap:16px;margin:4px 0 10px;flex-wrap:wrap}
.sm-lvgoals div{display:flex;flex-direction:column;align-items:center;min-width:64px}
.sm-lvgoals b{font-size:22px;font-weight:800;line-height:1.1} .sm-lvgoals small{color:var(--muted);font-size:12px}
#smEndModal .row .btn{padding:14px 6px;white-space:nowrap;font-size:15px}
.sm-stars{display:flex;justify-content:center;align-items:flex-end;gap:4px;margin:-6px 0 8px;min-height:62px}
.sm-stars span{font-size:46px;color:rgba(255,255,255,.14);line-height:1}
.sm-stars span:nth-child(2){font-size:60px;margin-bottom:8px}
.sm-stars span.on{color:#ffd84a;text-shadow:0 0 16px rgba(255,200,40,.7),0 3px 0 #b8780a;animation:smStar .55s cubic-bezier(.3,1.7,.5,1) both}
.sm-stars .sm-endico{font-size:54px;color:inherit}
@keyframes smStar{0%{transform:scale(0) rotate(-40deg);opacity:0}100%{transform:scale(1);opacity:1}}
@media (max-width:360px){.sm-moves{min-width:56px}.sm-moves b{font-size:26px}.sm-score b{font-size:17px}.sm-goal img{width:26px;height:26px}}''',
 'js': js,
 'gamesEntry': "  { id: 'sm', label: 'Snoepmix', emoji: '🍬', bg: ['#ff8cc6', '#6a1f9a'], enter: () => Snoepmix.enter(), tile: 'tileSm' },\n",
 'statRow': "['sm', `${Object.keys(S.sm.stars || {}).length}/20 levels · ${Object.values(S.sm.stars || {}).reduce((a, b) => a + b, 0)} ★${S.sm.endless ? ' · record ' + S.sm.endless : ''}`]",
 'wipe': ['sm.progress', 'sm.save', 'sm.settings'],
 'trophies': "    ['sm1', '🍬', 'Snoepproever', 'Haal het eerste level van Snoepmix', S => Object.keys(S.sm.stars || {}).length >= 1],\n    ['sm2', '🍭', 'Suikerkoning', 'Verdien 45 sterren in Snoepmix', S => Object.values(S.sm.stars || {}).reduce((a, b) => a + b, 0) >= 45],",
 'track': '''    // Snoepmix: sunny candy pop
    sm: { bpm: 116, bars: 8, seed: 211, fn(a) {
      const K = 60, ch = [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M'], [0, 'M'], [4, 'm'], [5, 'M'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 64), bm = K - 24 + r;
        a.kick(a.at(b), .55); a.kick(a.at(b, 8), .4); a.clap(a.at(b, 4), .3); a.clap(a.at(b, 12), .3);
        for (let s = 2; s < 16; s += 4) a.hat(a.at(b, s), .35);
        for (let s = 0; s < 16; s += 2) a.shaker(a.at(b, s), s % 4 ? .45 : .25);
        [[0, 0], [3, 7], [6, 12], [8, 0], [11, 7], [14, 12]].forEach(([s, iv]) => a.bass(a.at(b, s), bm + iv, a.st * 1.8, .7, 'upright'));
        [0, 2, 4, 6, 8, 10, 12, 14].forEach((s, i) => a.marimba(a.at(b, s), cm[[0, 1, 2, 1][i % 4]] + 12, s % 4 ? .32 : .48, -.3));
        a.pad(a.at(b), cm, a.bar, .35, { cut: 1600, vol: .08 });
      });
      melody(a, { chords: ch, root: K, scale: 'major', lo: 74, hi: 88, rhythm: 'syncop', rest: .1 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .5, .15, 1.0, 'mbell'));
      [0, 4].forEach(b => a.bell(a.at(b), 96, .3, .4));
    } },''',
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('sm.json', 'w'), ensure_ascii=False)
print('ok', len(js))
