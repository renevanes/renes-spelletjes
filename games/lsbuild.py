import json, os
# Builds ls.js (the complete Kleurbuisjes module) from lssrc/ (+ lssrc/levels.json from lsgen.mjs) and the package ls.json for addgame.py
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('lssrc/' + f).read()
levels = json.load(open('lssrc/levels.json'))
NL = len(levels['levels'])

js = ('''/* ================================================================
   KLEURBUISJES – glass tubes with layers of coloured liquid. Tap a tube, tap another: the top colour pours over
   (onto the same colour or into an empty tube, as much as fits). Sort every colour into a tube of its own.
   ''' + str(NL) + ''' levels + a daily puzzle, all checked by an exact solver (always solvable without help).
   ================================================================ */
const Kleurbuisjes = (() => {
  const LEVELS = ''' + json.dumps(levels, separators=(',', ':')) + ''';
''' + src('core.js') + '\n' + src('art.js') + '\n' + src('ui.js') + '''})();
$('#tileLs').addEventListener('click', () => Kleurbuisjes.enter());
''')
open('ls.js', 'w').write(js)

# ---------- vector menu icon (512x512): three glass tubes, one pouring into another ----------
TP = 'M-46 0V140a46 46 0 0 0 92 0V0Z'            # an upright tube, mouth centre at (0, 0)
def glass(clip, tf, liquid):
    return (f'<clipPath id="{clip}"><path transform="{tf}" d="{TP}"/></clipPath>'
            f'<path transform="{tf}" d="{TP}" fill="#fff" fill-opacity=".14"/>'
            f'<g clip-path="url(#{clip})">{liquid}</g>'
            f'<g transform="{tf}"><path d="{TP}" fill="url(#lsShine)"/><path d="{TP}" fill="none" stroke="#eef6ff" stroke-opacity=".92" stroke-width="7"/>'
            f'<rect x="-28" y="24" width="13" height="120" rx="6.5" fill="#fff" opacity=".55"/><rect x="-55" y="-10" width="110" height="20" rx="10" fill="#f4faff" opacity=".92"/></g>')
def layers(x0, y0, cols, lh=50):
    return ''.join(f'<rect x="{x0 - 60}" y="{y0 - (k + 1) * lh}" width="120" height="{lh + (60 if k == 0 else 1)}" fill="{c}"/>' for k, c in enumerate(cols))
icon_body = (
    '<ellipse cx="256" cy="458" rx="210" ry="26" fill="#000" opacity=".22"/><g transform="translate(256 296) scale(1.1) translate(-262 -300)">'
    # left: a mixed tube
    + '<g filter="url(#sh)">' + glass('lsI1', 'translate(116 214) scale(1 1.12)', layers(116, 420, ['#2f7bff', '#ff5fae', '#ffd02e', '#ff5fae'], 52)) + '</g>'
    # right: the tube that is being filled
    + '<g filter="url(#sh)">' + glass('lsI2', 'translate(370 262) scale(1 .98)', layers(370, 432, ['#b04de6', '#16a35f', '#16a35f'], 48)
       + '<circle cx="360" cy="352" r="7" fill="#fff" opacity=".65"/><circle cx="378" cy="372" r="5" fill="#fff" opacity=".5"/><circle cx="352" cy="392" r="4" fill="#fff" opacity=".45"/>') + '</g>'
    # the stream, then the tilted tube pouring it (its liquid stays level)
    + '<path d="M354 232V290" stroke="#16a35f" stroke-width="15" stroke-linecap="round"/><path d="M351 236V284" stroke="#5fd99a" stroke-width="4" stroke-linecap="round" opacity=".8"/>'
    + '<g filter="url(#sh2)">' + glass('lsI3', 'translate(376 192) rotate(118)', '<rect x="200" y="172" width="220" height="110" fill="#16a35f"/><rect x="200" y="172" width="220" height="5" fill="#5fd99a"/>') + '</g></g>'
    + "' + spark(236, 330, 1.1, '#fffbe0') + spark(470, 300, .85, '#fff') + spark(44, 120, .75, '#fff') + '")
icon = ("{ bg: ['#8a6cff', '#2a1a6e'], defs: lg('lsCork', '#d9a066', '#8a5524') + '<linearGradient id=\"lsShine\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#000\" stop-opacity=\".25\"/><stop offset=\".25\" stop-color=\"#fff\" stop-opacity=\".28\"/><stop offset=\".5\" stop-color=\"#fff\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#000\" stop-opacity=\".28\"/></linearGradient>',\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds: sine tones, sine partials and filtered pink noise; soft attacks, nothing harsh ----------
sfx = {
  # glass clink: two clean sine partials, very short
  'lsPick': "[() => { const d = buf(.45); bell(d, 0, 2217, .2, .1); bell(d, .001, 3322, .08, .06); tone(d, 0, 880, 860, .02, .03, .1, .002); return d; }, .2, .26, 3]",
  'lsPut': "[() => { const d = buf(.35); bell(d, 0, 1661, .16, .07); tone(d, 0, 520, 500, .02, .03, .12, .003); return d; }, .15, .2, 2]",
  'lsLift': "[() => { const d = buf(.3); wash(d, 0, .26, 700, 1500, .18, .06, .08, 1.4, 'bp'); return d; }, .05, .1, 1]",
  'lsNo': "[() => { const d = buf(.35); tone(d, 0, 230, 190, .04, .05, .55, .003, .35); wash(d, 0, .12, 600, 300, .18, .003, .03); return d; }, .04, .3, 2]",
  'lsDone': "[() => { const d = buf(1.4); [1568, 2093, 2637].forEach((f, i) => bell(d, i * .07, f, .26, .5)); bell(d, .24, 3136, .1, .5); wash(d, .05, .9, 3500, 5500, .025, .1, .3, 2, 'bp'); return d; }, .38, .32, 1]",
  'lsReveal': "[() => { const d = buf(.8); [1319, 1760].forEach((f, i) => bell(d, i * .06, f, .2, .3)); return d; }, .3, .22, 1]",
  'lsThaw': "[() => { const d = buf(1.2); wash(d, 0, 1, 2800, 6000, .08, .05, .35, 1.6, 'bp'); [2637, 2349, 3136, 2794].forEach((f, i) => bell(d, .04 + i * .09, f, .1, .25)); return d; }, .4, .26, 1]",
  'lsUndo': "[() => { const d = buf(.5); tone(d, 0, 900, 600, .12, .08, .32, .004, .2); wash(d, 0, .3, 2500, 900, .07, .02, .1, 1.2, 'bp'); return d; }, .1, .26, 1]",
  'lsBoost': "[() => { const d = buf(1.1); wash(d, 0, .7, 500, 3200, .2, .08, .2, 1.5, 'bp'); [988, 1319, 1760].forEach((f, i) => bell(d, .05 + i * .07, f, .22, .45)); return d; }, .35, .3, 1]",
  'lsHint': "[() => { const d = buf(.9); bell(d, 0, 1175, .22, .35); bell(d, .12, 1568, .2, .4); return d; }, .3, .26, 1]",
  'lsStuck': "[() => { const d = buf(1.4); [[0, 523.3], [.18, 440], [.36, 392]].forEach(([t, f]) => { tone(d, t, f, f, 0, .16, .32, .008, .25); bell(d, t, f * 2, .06, .2); }); return d; }, .25, .34, 1]",
  'lsWin': ("[() => { const d = buf(3); [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => bell(d, i * .1, f, .24, .7)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .5, f, f, 0, 1, .11, .06, .3)); "
            "bell(d, .55, 1568, .2, 1.2); bell(d, .62, 2093, .14, 1); wash(d, .45, 1.6, 3000, 5200, .03, .2, .5, 2, 'bp'); return d; }, .45, .44, 1]"),
}
# pouring: a soft liquid gurgle (resonant pink-noise wash + little upward 'glug' tones); higher as the tube fills up
for i, f in enumerate([260, 310, 370, 440, 520]):
    sfx['lsPour%d' % (i + 1)] = ("[() => { const d = buf(.8), f = %d; wash(d, 0, .72, f * 1.5, f * 2.3, .55, .05, .32, 2.4, 'bp'); wash(d, 0, .6, 1800, 2600, .05, .04, .2, 1, 'bp'); "
                                 "for (let k = 0; k < 8; k++) { const t = .02 + k * .07 + Math.random() * .02, g = f * (1 + k * .05) * (.92 + Math.random() * .16); tone(d, t, g, g * 1.45, .035, .03, .2 * (1 - k * .06), .003, .15); } return d; }, .14, .3, 2]") % f

css = '''#ls{background:#1c1540}
#ls .topbar{background:#231a4f;gap:4px;padding:6px 6px}
#ls .topbar .iconbtn{width:40px;flex:0 0 40px}#lsBack{font-size:28px!important}
.ls-head{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px}
#lsTitle{font-weight:800;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;min-width:0}
.ls-pill{flex:0 0 auto;display:flex;align-items:center;gap:3px;background:rgba(255,255,255,.13);border-radius:99px;padding:3px 8px;font-weight:800;font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}
.ls-pill small{font-weight:700;color:rgba(255,255,255,.7);font-size:11px}
#lsMain{flex:1;display:flex;flex-direction:column;min-height:0}
#lsStage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;background:#2a1f5c}
#lsBg,#lsBgImg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
#lsWorld{position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict}
#lsWorld>*{position:absolute;left:0;top:0}
.ls-t{transform-origin:0 0;will-change:transform}
.ls-t canvas{position:absolute;left:0;top:0;width:100%;height:100%}
.ls-t.pop{animation:lsPop .5s cubic-bezier(.3,1.6,.5,1) both}
@keyframes lsPop{from{opacity:0;filter:brightness(2)}to{opacity:1}}
.ls-cork{position:absolute;display:none;border-radius:4px 4px 6px 6px;background:linear-gradient(90deg,#7a4a1e,#c98d52 30%,#e0aa70 45%,#a86a32 75%,#6e3f17);box-shadow:inset 0 3px 0 rgba(255,255,255,.25),inset 0 -2px 0 rgba(0,0,0,.25),0 2px 3px rgba(0,0,0,.35)}
.ls-cork::after{content:'';position:absolute;left:12%;right:12%;top:30%;height:12%;border-radius:2px;background:rgba(80,40,10,.35);box-shadow:0 3px 0 rgba(80,40,10,.22)}
.ls-cork.on{display:block;animation:lsCork .45s cubic-bezier(.35,1.5,.55,1) both}.ls-cork.on.still{animation:none}
@keyframes lsCork{from{transform:translateY(-140%);opacity:0}to{transform:none;opacity:1}}
.ls-ice{position:absolute;display:none;border-radius:6px 6px 999px 999px;background:linear-gradient(160deg,rgba(235,250,255,.72),rgba(170,220,255,.5) 40%,rgba(210,240,255,.66) 60%,rgba(150,205,250,.55));box-shadow:inset 0 0 0 2px rgba(255,255,255,.7),inset 0 0 14px rgba(255,255,255,.6);align-items:flex-start;justify-content:center;font-style:normal;overflow:hidden}
.ls-ice::before{content:'❄';position:absolute;left:0;right:0;top:44%;text-align:center;font-size:1.3em;color:#fff;text-shadow:0 0 6px rgba(80,160,255,.9)}
.ls-ice b{margin-top:22%;min-width:1.4em;height:1.4em;line-height:1.4em;border-radius:99px;background:#2b6fd6;color:#fff;font-size:.8em;text-align:center;font-weight:900;box-shadow:0 2px 3px rgba(0,0,0,.3)}
.ls-ice.on{display:flex}.ls-ice.thaw{display:flex;animation:lsThaw .7s ease-in both}
@keyframes lsThaw{to{opacity:0;transform:scale(1.15);filter:brightness(1.6)}}
.ls-s{transform-origin:0 0;height:100px;border-radius:99px;z-index:25;will-change:transform;box-shadow:0 0 4px rgba(255,255,255,.25)}
.ls-hint{z-index:40;width:34px;height:34px;margin:-34px 0 0 -17px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#ffd84a;color:#3a2a00;font-style:normal;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.4);animation:lsHintB 1s ease-in-out infinite}
.ls-hint.to{background:#7fe0ff;color:#06324a}
@keyframes lsHintB{0%,100%{translate:0 0}50%{translate:0 -8px}}
.ls-fx{position:absolute;display:block;transform:translate(-50%,-50%);animation-fill-mode:both;animation-timing-function:ease-out;pointer-events:none;z-index:45;font-style:normal}
.ls-fx.spark{background:currentColor;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);animation-name:lsSpark}
@keyframes lsSpark{from{transform:translate(-50%,-50%) scale(1);opacity:1}to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.3);opacity:0}}
#ls.intro #lsWorld{animation:lsIn .45s ease-out}
@keyframes lsIn{from{opacity:.2;transform:translateY(10px)}to{opacity:1;transform:none}}
#lsTools{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 10px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#231a4f,#1a1340)}
#lsTools button{position:relative;background:rgba(255,255,255,.12);border-radius:16px;color:#fff;padding:7px 0 5px;display:flex;flex-direction:column;align-items:center;gap:1px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 0 rgba(0,0,0,.25)}
#lsTools button:active{transform:translateY(1px);background:rgba(255,255,255,.2)}
#lsTools button b{font-size:22px;line-height:1.15;font-weight:600}#lsTools button small{font-size:11.5px;color:rgba(255,255,255,.82)}
#lsTools button i{position:absolute;top:-5px;right:6px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#ffd84a;color:#2b2100;font-style:normal;font-weight:800;font-size:12px;line-height:20px;box-shadow:0 1px 3px rgba(0,0,0,.35)}
#lsTools button.out{opacity:.55}#lsTools button.out i{background:rgba(255,255,255,.25);color:#fff}
html.big-text #lsTools button small{font-size:13px}html.big-text #lsTools button b{font-size:25px}
#ls.land #lsMain{flex-direction:row}
#ls.land #lsTools{grid-template-columns:1fr;grid-auto-rows:minmax(0,1fr);width:86px;padding:10px 8px calc(8px + env(safe-area-inset-bottom));background:linear-gradient(90deg,#231a4f,#1a1340)}
#ls.land .topbar{min-height:44px;padding:3px 6px}#ls.land #lsTools button{justify-content:center}
#lsTip{position:absolute;left:10px;right:10px;top:10px;z-index:60;display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.96);color:#1f2a33;border-radius:16px;padding:10px 14px;font-size:14.5px;line-height:1.38;box-shadow:0 8px 22px rgba(0,0,0,.3);transform:translateY(-14px);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}
#lsTip.show{opacity:1;transform:none;pointer-events:auto}
#lsTip b{font-size:20px;line-height:1.1}
html.big-text #lsTip{font-size:16.5px}
#ls.land #lsTip{left:auto;right:12px;max-width:440px}
#lsConf{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:55}
#lsConf i{position:absolute;top:-16px;border-radius:2px;animation:lsFall linear both;will-change:transform}
@keyframes lsFall{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(var(--dx),calc(100vh + 30px)) rotate(var(--r));opacity:.85}}
#lsHand{position:absolute;z-index:58;width:0;height:0;pointer-events:none;display:none}
#lsHand.show{display:block}
#lsHand::before{content:'👆';position:absolute;left:-6px;top:4px;font-size:40px;filter:drop-shadow(0 3px 3px rgba(0,0,0,.45));animation:lsPoke 1s ease-in-out infinite}
#lsHand::after{content:'';position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.9);animation:lsRing 1s ease-out infinite}
@keyframes lsPoke{0%,100%{transform:translate(0,10px)}50%{transform:translate(0,0)}}
@keyframes lsRing{0%{transform:scale(.4);opacity:0}40%{opacity:1}100%{transform:scale(1.25);opacity:0}}
#lsToast{position:absolute;left:50%;bottom:14px;z-index:62;transform:translate(-50%,10px);opacity:0;pointer-events:none;background:rgba(20,14,48,.95);color:#fff;padding:10px 16px;border-radius:14px;font-size:14.5px;line-height:1.35;max-width:88%;width:max-content;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);transition:opacity .2s,transform .2s}
#lsToast.show{opacity:1;transform:translate(-50%,0)}
#lsStartModal .sheet,#lsEndModal .sheet,#lsStuckModal .sheet{background:linear-gradient(180deg,#33276e,#1e1648)}
#lsStartModal .sticky-actions{background:#1e1648}
.ls-levels{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:10px 0 12px}
.ls-levels button{position:relative;aspect-ratio:1/1.12;border-radius:12px;padding:0;background:linear-gradient(160deg,#b7a4ff,#7a5cf0 70%,#6447d8);box-shadow:inset 0 2px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(30,10,90,.2),0 3px 0 #3d2a99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#fff;-webkit-tap-highlight-color:transparent}
.ls-levels button:active{transform:translateY(2px);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 1px 0 #3d2a99}
.ls-levels button b{font-size:17px;font-weight:900;line-height:1.1;text-shadow:0 1px 0 rgba(40,20,110,.5)}
.ls-levels button span{font-size:10px;letter-spacing:-1px;line-height:1}.ls-levels button i{font-style:normal;color:rgba(40,20,110,.4)}.ls-levels button i.on{color:#ffe066;text-shadow:0 0 4px rgba(255,220,90,.8),0 1px 0 rgba(90,50,0,.6)}
.ls-levels button.lock{background:rgba(255,255,255,.08);box-shadow:none;color:#fff;opacity:.6}
.ls-levels button.lock b{font-size:13px}
.ls-levels button.next{animation:lsGlow 1.4s ease-in-out infinite}
@keyframes lsGlow{0%,100%{box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 3px 0 #3d2a99,0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 3px 0 #3d2a99,0 0 0 4px rgba(255,255,255,.85)}}
@media (orientation:landscape){.ls-levels{grid-template-columns:repeat(10,1fr)}}
#lsDaily{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:10px 12px;border-radius:16px;margin:4px 0 10px;background:linear-gradient(115deg,rgba(170,140,255,.34),rgba(170,140,255,.1));border:1px solid rgba(200,180,255,.55);color:var(--ink)}
#lsDaily .ls-dico{font-size:30px;line-height:1}
#lsDaily .ls-dtx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}#lsDaily b{font-size:16px}#lsDaily small{color:var(--muted);font-size:12.5px}
#lsDaily em{font-style:normal;font-weight:800;background:var(--accent);color:#2b2100;border-radius:99px;padding:6px 11px;font-size:14px;white-space:nowrap}
#lsDaily.lock{opacity:.55}#lsDaily.lock em{background:rgba(255,255,255,.14);color:var(--ink)}
#lsDaily.done em{background:rgba(255,255,255,.14);color:#ffe27a}
#lsInv{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;margin:0 0 12px;padding:8px 10px;border-radius:14px;background:rgba(0,0,0,.2);font-size:14px}
#lsInv b{color:#ffe27a}#lsInv small{flex-basis:100%;text-align:center;color:var(--muted);font-size:12px}
.ls-stars{display:flex;justify-content:center;align-items:flex-end;gap:4px;margin:-4px 0 8px;min-height:62px}
.ls-stars span{font-size:46px;color:rgba(255,255,255,.16);line-height:1}
.ls-stars span:nth-child(2){font-size:60px;margin-bottom:8px}
.ls-stars span.on{color:#ffd84a;text-shadow:0 0 16px rgba(255,200,40,.7),0 3px 0 #b8780a;animation:lsStar .55s cubic-bezier(.3,1.7,.5,1) both}
@keyframes lsStar{0%{transform:scale(0) rotate(-40deg);opacity:0}100%{transform:scale(1);opacity:1}}
#lsEndText{margin:4px 0 16px;line-height:1.55}#lsEndText b{color:var(--ink)}#lsEndText small{color:var(--muted)}
.ls-gift{display:inline-block;margin-top:6px;background:rgba(255,216,74,.18);border:1px solid rgba(255,216,74,.55);border-radius:99px;padding:2px 12px;font-weight:800;color:#ffe27a}
#lsEndModal .row .btn,#lsStuckModal .row .btn{padding:14px 6px;white-space:nowrap;font-size:15px}
#lsStuckModal .ls-lrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
#lsStuckModal .ls-lrow .btn{font-size:14.5px;padding:12px 4px}#lsStuckModal .btn small{color:var(--muted);font-weight:600}
#lsStuckModal .btn:disabled{opacity:.45}
html.big-text .ls-pill small{display:none}html.big-text #lsTitle{font-size:16px}html.big-text .ls-pill{font-size:14px;padding:3px 7px}
@media (max-width:370px){.ls-pill{padding:3px 7px;font-size:13px}#lsTitle{font-size:15px}}'''

g = {
 'id': 'ls', 'tile': 'Ls', 'mod': 'Kleurbuisjes', 'bar': '#231a4f', 'statsKey': 'ls.stats', 'music': 'ls',
 'tileHtml': '''    <button class="tile" id="tileLs">
      <div class="art"><img class="tile-img" id="artLs" alt=""></div>
      <div>
        <h2>Kleurbuisjes</h2>
        <p>Giet de kleuren netjes in hun eigen buisje</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ KLEURBUISJES ============ -->
<section id="ls" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="lsBack" aria-label="Terug">‹</button>
    <div class="ls-head"><span id="lsTitle">Level 1</span><span class="ls-pill" title="Zetten"><small>zetten</small> <b id="lsMoves">0</b></span><span class="ls-pill" title="Drie sterren bij zoveel zetten of minder">★★★ <small>≤</small><b id="lsPar">0</b></span></div>
    <button class="iconbtn" id="lsRetry" aria-label="Opnieuw">↻</button>
    <button class="iconbtn" id="lsMenu" aria-label="Levels">☰</button>
  </div>
  <div id="lsMain">
    <div id="lsStage"><canvas id="lsBg"></canvas><img id="lsBgImg" alt=""><div id="lsWorld"></div><div id="lsConf"></div><div id="lsHand"></div><div id="lsTip"></div><div id="lsToast"></div></div>
    <div id="lsTools"><button data-b="undo"><b>↶</b><small>Terug</small><i></i></button><button data-b="tube"><b>🧪</b><small>Extra buisje</small><i></i></button><button data-b="hint"><b>💡</b><small>Tip</small><i></i></button></div>
  </div>
</section>
''',
 'modalHtml': '''<div class="modal" id="lsStartModal">
  <div class="sheet">
    <h3>🧪 Kleurbuisjes</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Tik op een buisje en daarna op een ander buisje: de bovenste kleur wordt overgegoten, maar alleen in een leeg buisje of bovenop dezelfde kleur, en nooit meer dan er past. Zorg dat elke kleur een eigen buisje krijgt. Neem je tijd: er is geen klok, en elk level is zonder hulp op te lossen.</p>
    <button id="lsDaily"></button>
    <div class="ls-levels" id="lsLevels"></div>
    <div id="lsInv"></div>
    <div id="lsOptList"></div>
    <div class="stats" id="lsStats"></div>
    <div class="row sticky-actions"><button class="btn" id="lsStartBack">Menu</button><button class="btn" id="lsResume" hidden>Verder</button><button class="btn primary" id="lsGo">Spelen ▶</button></div>
  </div>
</div>
<div class="modal center" id="lsEndModal">
  <div class="sheet">
    <div class="ls-stars" id="lsEndStars"></div>
    <h3 id="lsEndTitle"></h3>
    <p id="lsEndText"></p>
    <div class="row"><button class="btn" id="lsEndMenu">Levels</button><button class="btn" id="lsEndRetry">Opnieuw</button><button class="btn primary" id="lsEndNext">Volgende ▶</button></div>
  </div>
</div>
<div class="modal center" id="lsStuckModal">
  <div class="sheet">
    <div class="big-emoji">🧪</div>
    <h3>Geen zetten meer</h3>
    <p>Er kan niets meer gegoten worden. Zet een zet terug, neem een extra buisje of begin opnieuw.</p>
    <div class="ls-lrow"><button class="btn" id="lsStuckUndo">↶ Terug</button><button class="btn" id="lsStuckTube">🧪 Extra buisje</button></div>
    <div class="row"><button class="btn" id="lsStuckMenu">Levels</button><button class="btn primary" id="lsStuckRetry">↻ Opnieuw</button></div>
  </div>
</div>''',
 'css': css,
 'js': js,
 'gamesEntry': "  { id: 'ls', label: 'Kleurbuisjes', emoji: '🧪', bg: ['#8a6cff', '#2a1a6e'], enter: () => Kleurbuisjes.enter(), tile: 'tileLs' },\n",
 'statRow': "['ls', `${Object.keys(S.ls.stars || {}).length}/" + str(NL) + " levels · ${Object.values(S.ls.stars || {}).reduce((a, b) => a + b, 0)} ★${S.ls.dailyWon ? ' · ' + S.ls.dailyWon + ' dagpuzzels' : ''}`]",
 'wipe': ['ls.stats', 'ls.save', 'ls.settings'],
 'trophies': ("    ['ls1', '🧪', 'Eerste druppel', 'Haal het eerste level van Kleurbuisjes', S => Object.keys(S.ls.stars || {}).length >= 1],\n"
              "    ['ls2', '⭐', 'Kleurenkenner', 'Verdien 150 sterren in Kleurbuisjes', S => Object.values(S.ls.stars || {}).reduce((a, b) => a + b, 0) >= 150],\n"
              "    ['ls3', '🎯', 'Precies goed', 'Haal 25 levels van Kleurbuisjes met drie sterren', S => (S.ls.three || 0) >= 25],\n"
              "    ['ls4', '🏆', 'Meestermenger', 'Haal alle " + str(NL) + " levels van Kleurbuisjes', S => Object.keys(S.ls.stars || {}).length >= " + str(NL) + "],\n"
              "    ['ls5', '📅', 'Dagelijkse druppel', 'Haal 7 dagpuzzels in Kleurbuisjes', S => (S.ls.dailyWon || 0) >= 7],"),
 'track': '''    // Kleurbuisjes: calm and glassy, slow and spacious (soft pads, rhodes, bell melody, deep sub bass, a whisper of shaker; original)
    ls: { bpm: 72, bars: 8, seed: 811, swing: .05, rev: 3.4, revAmt: .44, fn(a) {
      const K = 62, ch = [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, 's4'], [0, 'add9'], [4, 'm7'], [5, 'M7'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 64);
        a.pad(a.at(b), cm, a.bar, .42, { cut: 1100, vol: .09, a: 1, r: 1.6 });
        a.bass(a.at(b), K - 24 + r, a.bar * .95, .4, 'sub');
        [[0, 0], [6, 2], [10, 1], [14, 3]].forEach(([s, k]) => a.rhodes(a.at(b, s), cm[k % cm.length] + 12, a.st * 5, s ? .09 : .13, s % 4 ? .3 : -.3));
        a.shaker(a.at(b, 8), .08, .3); if (b % 2) a.shaker(a.at(b, 14), .05, -.3);
      });
      melody(a, { chords: ch, root: K, scale: 'major', lo: 74, hi: 88, rhythm: 'slow', rest: .18 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .17, n.m % 2 ? .25 : -.25, 2.2, 'lsb'));
      [0, 4].forEach(b => { for (let k = 0; k < 5; k++) a.bell(a.at(b, 12) + k * .09, K + 26 + [0, 2, 4, 7, 9][k], .06 + k * .012, (k - 2) * .15, 1.4, 'lsg'); });
    } },''',
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('ls.json', 'w'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('ls.json'))
