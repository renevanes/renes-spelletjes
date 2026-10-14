import json, os
# Builds bs.js (the complete Bellenschieter module) from bssrc/ (+ bssrc/levels.json from bsgen.mjs) and the package bs.json for addgame.py
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('bssrc/' + f).read()
levels = json.load(open('bssrc/levels.json'))

js = ('''/* ================================================================
   BELLENSCHIETER – an original bubble shooter. Aim with a finger, release to shoot; three or more bubbles of one colour
   pop and whatever no longer hangs on the ceiling falls. 60 levels in six worlds (each one played to the end by a bot
   with the game's own rules to set its shot limit) and an endless mode where new rows keep coming.
   ================================================================ */
const Bellenschieter = (() => {
  const LEVELS = ''' + json.dumps(levels, separators=(',', ':'), ensure_ascii=False) + ''';
''' + src('core.js') + '''
  const C_trace = trace, C_snap = snap, C_shoot = shoot, C_new = newState, C_newEnd = newEndless, C_ser = serialize, C_deser = deserialize, C_swap = swapShots, C_arm = armSpecial, C_clone = clone;
''' + src('art.js') + '\n' + src('ui.js') + '''})();
$('#tileBs').addEventListener('click', () => Bellenschieter.enter());
''')
open('bs.js', 'w').write(js)

# ---------- vector menu icon (512x512): a cluster of glossy bubbles, one flying up from a little bubble-blower ----------
def bub(x, y, r, g):
    return (f'<g filter="url(#sh2)"><circle cx="{x}" cy="{y}" r="{r}" fill="url(#{g})"/></g>'
            f'<ellipse cx="{x - r * .32:.0f}" cy="{y - r * .42:.0f}" rx="{r * .4:.0f}" ry="{r * .22:.0f}" transform="rotate(-30 {x - r * .32:.0f} {y - r * .42:.0f})" fill="#fff" opacity=".85"/>'
            f'<circle cx="{x - r * .62:.0f}" cy="{y:.0f}" r="{r * .08:.0f}" fill="#fff" opacity=".8"/>')
icon_body = (
    '<circle cx="256" cy="-40" r="300" fill="#fff" opacity=".08"/>'
    + bub(116, 112, 60, 'bsR') + bub(238, 112, 60, 'bsY') + bub(360, 112, 60, 'bsB') + bub(470, 112, 60, 'bsG')
    + bub(177, 218, 60, 'bsG') + bub(299, 218, 60, 'bsP') + bub(55, 218, 60, 'bsB')
    + ''.join(f'<circle cx="{256 + i * 21}" cy="{402 - i * 27}" r="{10 - i * .6:.1f}" fill="#fff" opacity="{.95 - i * .08:.2f}"/>' for i in range(5))
    + bub(400, 300, 50, 'bsR')
    + '<g filter="url(#sh)">'
    '<g transform="rotate(38 256 452)"><rect x="232" y="350" width="48" height="104" rx="12" fill="url(#bsBrass)"/><rect x="222" y="340" width="68" height="26" rx="10" fill="url(#bsBrass)"/></g>'
    '<ellipse cx="256" cy="476" rx="104" ry="82" fill="url(#bsBody)"/>'
    '<ellipse cx="256" cy="512" rx="62" ry="34" fill="#c8fff4" opacity=".7"/>'
    '<ellipse cx="222" cy="460" rx="22" ry="26" fill="#fff"/><ellipse cx="290" cy="460" rx="22" ry="26" fill="#fff"/>'
    '<circle cx="229" cy="456" r="11" fill="#18202e"/><circle cx="297" cy="456" r="11" fill="#18202e"/>'
    '<circle cx="225" cy="451" r="4" fill="#fff"/><circle cx="293" cy="451" r="4" fill="#fff"/>'
    '<path d="M240 492q16 13 32 0" fill="none" stroke="#0c4a55" stroke-width="6" stroke-linecap="round"/>'
    '</g>'
    "' + spark(470, 300, .9, '#fffbe0') + spark(60, 330, .7, '#fff') + '")
icon = ("{ bg: ['#6fd8ff', '#3149c9'], defs: rg('bsR', '#ffb3ba', '#d81f35') + rg('bsY', '#fff6b0', '#f2a800') + rg('bsB', '#b9dcff', '#1f5fd6') + rg('bsG', '#c4f7b8', '#1c9a3a') + rg('bsP', '#e6ccff', '#7a32d6') + rg('bsBody', '#9af2e6', '#0e6d7d') + lg('bsBrass', '#ffe08a', '#b07418', 1, 0),\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds: sine tones with soft attacks, sine bells and filtered pink noise; nothing clicky ----------
POP_NOTES = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5]
sfx = {
  'bsAim': "[() => { const d = buf(.12); tone(d, 0, 1650, 1600, .005, .012, .3, .0015); return d; }, .02, .06, 1]",
  'bsShoot': "[() => { const d = buf(.4); wash(d, 0, .26, 700, 2300, .55, .012, .07, 1.2, 'bp'); tone(d, 0, 250, 430, .06, .05, .35, .004, .3); return d; }, .06, .26, 3]",
  'bsWall': "[() => { const d = buf(.2); tone(d, 0, 640, 520, .02, .03, .5, .002, .25); wash(d, 0, .06, 1800, 1500, .08, .002, .015, 2, 'bp'); return d; }, .05, .2, 2]",
  'bsStick': "[() => { const d = buf(.35); tone(d, 0, 300, 205, .03, .06, .6, .002, .45); tone(d, 0, 900, 820, .01, .02, .12, .002); return d; }, .06, .22, 2]",
  'bsLand': "[() => { const d = buf(.3); tone(d, 0, 420, 260, .04, .05, .4, .003, .3); wash(d, 0, .12, 1200, 700, .06, .004, .03, 1.4, 'bp'); return d; }, .08, .16, 2]",
  'bsFall': "[() => { const d = buf(1); [1568, 1760, 2093, 2349, 2637].forEach((f, i) => bell(d, i * .05, f, .17, .32)); wash(d, 0, .5, 3000, 5000, .03, .02, .15, 2, 'bp'); return d; }, .3, .26, 2]",
  'bsBomb': "[() => { const d = buf(1.3); tone(d, 0, 120, 42, .18, .22, 1, .004, .7); wash(d, 0, .9, 2400, 180, .9, .004, .2); wash(d, .01, .8, 500, 220, .4, .03, .3); return d; }, .3, .5, 2]",
  'bsRain': "[() => { const d = buf(1); [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => bell(d, i * .04, f, .18, .35)); wash(d, 0, .6, 4000, 7000, .04, .03, .2, 2, 'bp'); return d; }, .35, .28, 1]",
  'bsIce': "[() => { const d = buf(.4); [2637, 3136, 2349, 3520].forEach((f, i) => tone(d, i * .018, f, f * .97, .01, .025, .25, .003)); wash(d, 0, .14, 5000, 7000, .12, .003, .03, 2, 'bp'); return d; }, .25, .2, 2]",
  'bsStone': "[() => { const d = buf(.4); tone(d, 0, 190, 120, .04, .07, .7, .002, .6); wash(d, 0, .16, 900, 500, .3, .003, .04, 1.2, 'bp'); return d; }, .08, .3, 2]",
  'bsChg': "[() => { const d = buf(.5); tone(d, 0, 600, 900, .15, .08, .35, .006, .2); tone(d, .06, 900, 1200, .12, .07, .25, .006, .2); return d; }, .2, .18, 1]",
  'bsStar': "[() => { const d = buf(1.2); bell(d, 0, 1568, .3, .5); bell(d, .08, 2093, .28, .6); bell(d, .16, 2637, .22, .7); return d; }, .35, .3, 1]",
  'bsFireOn': "[() => { const d = buf(1); [784, 988, 1175, 1568].forEach((f, i) => bell(d, i * .06, f, .22, .4)); wash(d, 0, .5, 400, 2400, .2, .05, .15, 1.4, 'bp'); return d; }, .3, .3, 1]",
  'bsFire': "[() => { const d = buf(1.1); wash(d, 0, 1, 300, 2600, .7, .03, .3, 1.1, 'bp'); tone(d, 0, 90, 140, .3, .25, .4, .02, .6); return d; }, .25, .4, 1]",
  'bsPush': "[() => { const d = buf(.6); tone(d, 0, 110, 80, .2, .12, .6, .006, .5); wash(d, 0, .4, 500, 250, .3, .02, .12); return d; }, .1, .3, 1]",
  'bsSwap': "[() => { const d = buf(.25); tone(d, 0, 880, 1100, .03, .03, .4, .002, .1); tone(d, .06, 1100, 880, .03, .035, .4, .002, .1); return d; }, .06, .2, 1]",
  'bsBoost': "[() => { const d = buf(1.1); wash(d, 0, .7, 500, 3200, .22, .08, .2, 1.5, 'bp'); [988, 1319, 1760].forEach((f, i) => bell(d, .05 + i * .07, f, .22, .45)); return d; }, .35, .3, 1]",
  'bsCombo': "[() => { const d = buf(.8); bell(d, 0, 1318.5, .25, .35); bell(d, .07, 1760, .25, .45); return d; }, .3, .24, 1]",
  'bsWin': ("[() => { const d = buf(3); [587.3, 740, 880, 1174.7, 1480].forEach((f, i) => bell(d, i * .1, f, .24, .7)); [293.7, 370, 440, 587.3].forEach(f => tone(d, .5, f, f, 0, 1, .11, .06, .3)); "
            "bell(d, .55, 1760, .2, 1.2); bell(d, .62, 2349, .14, 1); wash(d, .45, 1.6, 3000, 5200, .03, .2, .5, 2, 'bp'); return d; }, .45, .44, 1]"),
  'bsLose': "[() => { const d = buf(1.8); [[0, 523.3], [.2, 466.2], [.4, 392], [.65, 311.1]].forEach(([t, f], i) => tone(d, t, f * 1.01, f, .05, i === 3 ? .45 : .16, .4, .01, .35)); return d; }, .3, .36, 1]",
}
for i, f in enumerate(POP_NOTES):
    sfx['bsPop%d' % (i + 1)] = ("[() => { const d = buf(.25); tone(d, 0, %.1f, %.1f, .035, .045, .6, .0015, .15); tone(d, .004, %.1f, %.1f, .02, .02, .16, .002); "
                                "wash(d, 0, .07, %.0f, %.0f, .05, .003, .018, 1.5, 'bp'); return d; }, .12, .3, 2]") % (f * .7, f * 1.25, f * 2.1, f * 2.6, f * 2.5, f * 3.5)

css = '''#bs{background:#1f3f8a}
#bs .topbar{background:#1f3f8a;gap:4px;padding:6px 6px}
#bs .topbar .iconbtn{width:40px;flex:0 0 40px}#bsBack{font-size:28px!important}
.bs-head{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:8px}
#bsTitle{font-weight:800;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bs-pill{display:flex;align-items:center;gap:4px;background:rgba(255,255,255,.13);border-radius:99px;padding:3px 10px;font-weight:800;font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap}
#bsMain{flex:1;display:flex;flex-direction:column;min-height:0}
#bsStage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;background:#0d5d99}
#bsBg,#bsBgImg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
#bsField{position:absolute;overflow:hidden;border-radius:10px;pointer-events:none}
#bsField canvas{position:absolute;left:0;top:0;pointer-events:none}
#bsGrid{will-change:transform}
#bsField.bs-shake{animation:bsShake .32s linear}#bsField.bs-shake2{animation:bsShake2 .42s linear}
@keyframes bsShake{0%,100%{transform:none}20%{transform:translate(-3px,2px)}40%{transform:translate(3px,-2px)}60%{transform:translate(-2px,-1px)}80%{transform:translate(2px,1px)}}
@keyframes bsShake2{0%,100%{transform:none}15%{transform:translate(-6px,3px)}30%{transform:translate(6px,-4px)}45%{transform:translate(-5px,-2px)}60%{transform:translate(4px,3px)}80%{transform:translate(-2px,1px)}}
#bsHud{position:absolute;left:8px;right:8px;top:6px;display:flex;gap:6px;z-index:2;pointer-events:none}
.bs-chip{display:flex;align-items:center;gap:8px;background:rgba(14,22,48,.62);border:1px solid rgba(255,255,255,.18);color:#fff;border-radius:16px;padding:5px 12px 5px 9px;box-shadow:0 3px 10px rgba(0,0,0,.2);backdrop-filter:blur(2px)}
#bsGoal{flex:1;min-width:0}
.bs-chip>b{font-size:21px;line-height:1}.bs-chip span{display:flex;flex-direction:column;min-width:0;line-height:1.2}
.bs-chip em{font-style:normal;font-weight:800;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bs-chip small{font-size:12.5px;color:rgba(255,255,255,.8);font-weight:700;font-variant-numeric:tabular-nums}
.bs-chip2{flex-direction:column;gap:0;padding:4px 12px;justify-content:center}.bs-chip2>b{font-size:17px}.bs-chip2 small{font-size:11px}
.bs-st i{font-style:normal;color:rgba(255,255,255,.25)}.bs-st i.on{color:#ffd84a;text-shadow:0 0 6px rgba(255,200,40,.6)}
html.big-text .bs-chip em{font-size:15.5px}html.big-text .bs-chip small{font-size:14px}
#bs.land #bsHud{flex-direction:column;right:auto;top:10px;align-items:stretch}
#bs.land #bsGoal{flex:none}
#bsCombo{position:absolute;left:0;right:0;top:34%;text-align:center;z-index:4;pointer-events:none;font-weight:900;font-size:34px;color:#fff;opacity:0;-webkit-text-stroke:1.5px rgba(40,10,70,.6);text-shadow:0 3px 0 rgba(40,10,70,.55),0 0 18px rgba(255,220,120,.6)}
#bsCombo.show{animation:bsCombo 1.15s cubic-bezier(.2,1.4,.4,1) both}
#bsCombo.l3{color:#ffe35a}#bsCombo.l4{color:#ffb13a;font-size:38px}#bsCombo.l5{color:#ff7ad1;font-size:40px}
@keyframes bsCombo{0%{opacity:0;transform:scale(.4)}18%{opacity:1;transform:scale(1.08)}30%{transform:scale(1)}75%{opacity:1;transform:translateY(-8px)}100%{opacity:0;transform:translateY(-26px)}}
#bsTools{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;padding:8px 10px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#1f3f8a,#182f6a)}
#bsTools button{position:relative;background:rgba(255,255,255,.12);border-radius:16px;color:#fff;padding:7px 0 5px;display:flex;flex-direction:column;align-items:center;gap:1px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 0 rgba(0,0,0,.25);overflow:visible}
#bsTools button:active{transform:translateY(1px);background:rgba(255,255,255,.2)}
#bsTools button.on{background:#ffcf3a;color:#2b2100;box-shadow:0 0 0 3px rgba(255,220,90,.5)}
#bsTools button b{font-size:22px;line-height:1.15;font-weight:600}#bsTools button small{font-size:11.5px;color:rgba(255,255,255,.82);white-space:nowrap}
#bsTools button.on small{color:#2b2100}
#bsTools button i{position:absolute;top:-5px;right:2px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#ffcf3a;color:#2b2100;font-style:normal;font-weight:800;font-size:12px;line-height:20px;box-shadow:0 1px 3px rgba(0,0,0,.35)}
#bsTools button i.buy{background:#fff;color:#7a5600;font-size:10.5px}
#bsTools .bs-fire::after{content:'';position:absolute;left:10px;right:10px;bottom:3px;height:4px;border-radius:2px;background:linear-gradient(90deg,#ff7a1a calc(var(--p,0)*100%),rgba(255,255,255,.18) 0)}
#bsTools .bs-fire i{background:rgba(0,0,0,.35);color:#fff}
#bsTools .bs-fire.ready{background:linear-gradient(180deg,#ff9a3a,#e8521c)}
#bsTools .bs-fire::before{content:'';position:absolute;inset:-4px;border-radius:19px;border:3px solid rgba(255,170,60,.85);opacity:0;pointer-events:none}
#bsTools .bs-fire.ready::before{animation:bsGlow 1.2s ease-in-out infinite}
#bsTools .bs-fire.ready i{background:#fff;color:#c43a00}
@keyframes bsGlow{0%,100%{opacity:0}50%{opacity:1}}
html.big-text #bsTools button small{font-size:13px}html.big-text #bsTools button b{font-size:25px}
#bs.land #bsMain{flex-direction:row}
#bs.land #bsTools{grid-template-columns:1fr;grid-auto-rows:minmax(0,1fr);width:86px;padding:8px 8px calc(8px + env(safe-area-inset-bottom));background:linear-gradient(90deg,#1f3f8a,#182f6a)}
#bs.land #bsTools button{padding:3px 0}#bs.land #bsTools button b{font-size:19px}
#bs.land .topbar{min-height:44px;padding:3px 6px}
#bsTip{position:absolute;left:10px;right:10px;top:10px;z-index:5;display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.96);color:#1f2a33;border-radius:16px;padding:10px 14px;font-size:14.5px;line-height:1.38;box-shadow:0 8px 22px rgba(0,0,0,.3);transform:translateY(-14px);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}
#bsTip.show{opacity:1;transform:none;pointer-events:auto}
#bsTip b{font-size:20px;line-height:1.1}
html.big-text #bsTip{font-size:16.5px}
#bs.land #bsTip{left:auto;right:12px;max-width:380px}
#bsConf{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:3}
#bsConf i{position:absolute;top:-16px;border-radius:2px;animation:bsFall linear both;will-change:transform}
@keyframes bsFall{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(var(--dx),calc(100vh + 30px)) rotate(var(--r));opacity:.85}}
#bsToast{position:absolute;left:50%;bottom:14px;z-index:6;transform:translate(-50%,10px);opacity:0;pointer-events:none;background:rgba(18,26,52,.95);color:#fff;padding:10px 16px;border-radius:14px;font-size:14.5px;line-height:1.35;max-width:88%;width:max-content;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);transition:opacity .2s,transform .2s}
#bsToast.show{opacity:1;transform:translate(-50%,0)}
#bsStartModal .sheet,#bsEndModal .sheet,#bsLoseEndModal .sheet{background:linear-gradient(180deg,#2a4fa8,#182f6a)}
#bsStartModal .sticky-actions{background:#182f6a}
.bs-levels{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;margin:6px 0 12px}
.bs-world{grid-column:1/-1;font-weight:800;font-size:13.5px;color:rgba(255,255,255,.85);margin:6px 0 0}
.bs-levels button{position:relative;aspect-ratio:1/1.15;border-radius:11px;padding:0;background:radial-gradient(circle at 35% 30%,#bfe6ff,#4fa3ff 55%,#2a62d6);box-shadow:inset 0 2px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(0,30,100,.2),0 3px 0 #173f8a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#0d2050;-webkit-tap-highlight-color:transparent;min-width:0}
.bs-levels button:active{transform:translateY(2px);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 1px 0 #173f8a}
.bs-levels button b{font-size:15px;font-weight:900;line-height:1.1}
.bs-levels button span{font-size:8.5px;letter-spacing:-1px;line-height:1}.bs-levels button i{font-style:normal;color:rgba(10,30,80,.3)}.bs-levels button i.on{color:#ffe35a;text-shadow:0 0 3px rgba(120,80,0,.8)}
.bs-levels button.lock{background:rgba(255,255,255,.08);box-shadow:none;color:#fff;opacity:.6}
.bs-levels button.lock b{font-size:12px}
.bs-levels button.next::after{content:'';position:absolute;inset:-3px;border-radius:13px;border:3px solid #fff;opacity:0;animation:bsNext 1.4s ease-in-out infinite;pointer-events:none}
@keyframes bsNext{0%,100%{opacity:0}50%{opacity:.9}}
html.big-text .bs-levels button b{font-size:16px}
#bsEndless{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:10px 12px;border-radius:16px;margin:4px 0 6px;background:linear-gradient(115deg,rgba(111,216,255,.32),rgba(111,216,255,.1));border:1px solid rgba(160,225,255,.55);color:var(--ink)}
#bsEndless .bs-eico{font-size:30px;line-height:1}
#bsEndless .bs-etx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}#bsEndless b{font-size:16px}#bsEndless small{color:var(--muted);font-size:12.5px}
#bsEndless em{font-style:normal;font-weight:800;background:var(--accent);color:#2b2100;border-radius:99px;padding:6px 11px;font-size:14px;white-space:nowrap}
#bsShop{display:grid;grid-template-columns:auto repeat(4,minmax(0,1fr));gap:6px;align-items:stretch;margin:0 0 12px}
.bs-purse{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 8px;border-radius:14px;background:rgba(255,207,58,.16);border:1px solid rgba(255,207,58,.5);font-size:15px}
.bs-purse b{font-size:19px;line-height:1.1}.bs-purse small{color:var(--muted);font-size:11px}
#bsShop button{display:flex;flex-direction:column;align-items:center;gap:0;padding:6px 2px;border-radius:14px;background:rgba(0,0,0,.22);color:var(--ink);min-width:0}
#bsShop button b{font-size:20px;line-height:1.2}#bsShop button span{font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#bsShop button small{font-size:11px;color:var(--muted)}#bsShop button em{font-style:normal;font-size:10.5px;color:#ffe27a;white-space:nowrap}
#bsShop button.no{animation:bsNo .4s}
@keyframes bsNo{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.bs-stars{display:flex;justify-content:center;align-items:flex-end;gap:4px;margin:-4px 0 8px;min-height:62px}
.bs-stars span{font-size:46px;color:rgba(255,255,255,.16);line-height:1}
.bs-stars span:nth-child(2){font-size:60px;margin-bottom:8px}
.bs-stars span.on{color:#ffd84a;text-shadow:0 0 16px rgba(255,200,40,.7),0 3px 0 #b8780a;animation:bsStar .55s cubic-bezier(.3,1.7,.5,1) both}
.bs-trophy{font-size:56px;line-height:1;animation:bsStar .55s cubic-bezier(.3,1.7,.5,1) both}
@keyframes bsStar{0%{transform:scale(0) rotate(-40deg);opacity:0}100%{transform:scale(1);opacity:1}}
#bsEndText,#bsLoseText{margin:4px 0 16px;line-height:1.55}#bsEndText b{color:var(--ink)}#bsEndText small,#bsLoseText small{color:var(--muted)}
.bs-coin{display:inline-block;margin-top:6px;background:rgba(255,207,58,.2);border:1px solid rgba(255,207,58,.55);border-radius:99px;padding:2px 12px;font-weight:800;color:#ffe27a}
#bsEndModal .row .btn,#bsLoseEndModal .row .btn{padding:14px 6px;white-space:nowrap;font-size:15px}
#bsLosePlus{width:100%;margin-bottom:8px}#bsLosePlus:disabled{opacity:.45}
html.big-text .bs-coins{display:none}
@media (max-width:370px){.bs-pill{padding:3px 7px;font-size:14px}#bsTitle{font-size:15px}#bsShop{grid-template-columns:repeat(4,minmax(0,1fr))}.bs-purse{grid-column:1/-1;flex-direction:row;gap:6px}}'''

g = {
 'id': 'bs', 'tile': 'Bs', 'mod': 'Bellenschieter', 'bar': '#1f3f8a', 'statsKey': 'bs.stats', 'music': 'bs',
 'tileHtml': '''    <button class="tile" id="tileBs">
      <div class="art"><img class="tile-img" id="artBs" alt=""></div>
      <div>
        <h2>Bellenschieter</h2>
        <p>Schiet en knal drie of meer bellen van dezelfde kleur</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ BELLENSCHIETER ============ -->
<section id="bs" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="bsBack" aria-label="Terug">‹</button>
    <div class="bs-head"><span id="bsTitle">Level 1</span><span class="bs-pill" title="Score">🎯 <b id="bsScore">0</b></span><span class="bs-pill bs-coins" title="Munten">🪙 <b id="bsCoins">0</b></span></div>
    <button class="iconbtn" id="bsRetry" aria-label="Opnieuw">↻</button>
    <button class="iconbtn" id="bsMenu" aria-label="Menu">☰</button>
  </div>
  <div id="bsMain">
    <div id="bsStage"><canvas id="bsBg"></canvas><img id="bsBgImg" alt="">
      <div id="bsHud"><div class="bs-chip" id="bsGoal"></div><div class="bs-chip bs-chip2" id="bsStarHud"></div></div>
      <div id="bsField"><canvas id="bsGrid"></canvas><canvas id="bsLaunch"></canvas><canvas id="bsFx"></canvas></div>
      <div id="bsCombo"></div><div id="bsConf"></div><div id="bsTip"></div><div id="bsToast"></div></div>
    <div id="bsTools"><button data-b="bomb"><b>💣</b><small>Bom</small><i></i></button><button data-b="rain"><b>🌈</b><small>Regenboog</small><i></i></button><button data-b="aim"><b>🎯</b><small>Mikken</small><i></i></button><button data-b="plus"><b>➕</b><small>+5</small><i></i></button><button data-b="fire" class="bs-fire"><b>🔥</b><small>Vuurbal</small><i></i></button></div>
  </div>
</section>
''',
 'modalHtml': '''<div class="modal" id="bsStartModal">
  <div class="sheet">
    <h3>🫧 Bellenschieter</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Sleep je vinger om te mikken en laat los om te schieten. Drie of meer bellen van dezelfde kleur knallen, en alles wat nergens meer aan hangt, valt naar beneden. Tik op de bellenblazer om je bel te wisselen.</p>
    <button id="bsEndless"></button>
    <div class="bs-levels" id="bsLevels"></div>
    <div id="bsShop"></div>
    <div id="bsOptList"></div>
    <div class="stats" id="bsStats"></div>
    <div class="row sticky-actions"><button class="btn" id="bsStartBack">Menu</button><button class="btn" id="bsResume" hidden>Verder</button><button class="btn primary" id="bsGo">Spelen ▶</button></div>
  </div>
</div>
<div class="modal center" id="bsEndModal">
  <div class="sheet">
    <div class="bs-stars" id="bsEndStars"></div>
    <h3 id="bsEndTitle"></h3>
    <p id="bsEndText"></p>
    <div class="row"><button class="btn" id="bsEndMenu">Levels</button><button class="btn" id="bsEndRetry">Opnieuw</button><button class="btn primary" id="bsEndNext">Volgende ▶</button></div>
  </div>
</div>
<div class="modal center" id="bsLoseEndModal">
  <div class="sheet">
    <div class="big-emoji">🫧</div>
    <h3 id="bsLoseTitle">Helaas!</h3>
    <p id="bsLoseText"></p>
    <button class="btn" id="bsLosePlus">➕ +5 schoten</button>
    <div class="row"><button class="btn" id="bsLoseMenu">Levels</button><button class="btn primary" id="bsLoseRetry">↻ Opnieuw</button></div>
  </div>
</div>''',
 'css': css,
 'js': js,
 'gamesEntry': "  { id: 'bs', label: 'Bellenschieter', emoji: '🫧', bg: ['#6fd8ff', '#3149c9'], enter: () => Bellenschieter.enter(), tile: 'tileBs' },\n",
 'statRow': "['bs', `${Object.keys(S.bs.stars || {}).length}/60 levels · ${Object.values(S.bs.stars || {}).reduce((a, b) => a + b, 0)} ★${S.bs.endBest ? ' · record ' + Number(S.bs.endBest).toLocaleString('nl-NL') : ''}`]",
 'wipe': ['bs.stats', 'bs.save', 'bs.settings', 'bs.tips'],
 'trophies': ("    ['bs1', '🫧', 'Eerste knal', 'Haal het eerste level van Bellenschieter', S => Object.keys(S.bs.stars || {}).length >= 1],\n"
              "    ['bs2', '⭐', 'Bellenster', 'Verdien 90 sterren in Bellenschieter', S => Object.values(S.bs.stars || {}).reduce((a, b) => a + b, 0) >= 90],\n"
              "    ['bs3', '🏁', 'Bellenkoning', 'Haal alle 60 levels van Bellenschieter', S => Object.keys(S.bs.stars || {}).length >= 60],\n"
              "    ['bs4', '♾️', 'Doorzetter', 'Haal 20.000 punten in Bellenschieter Eindeloos', S => (S.bs.endBest || 0) >= 20000],\n"
              "    ['bs5', '🌊', 'Lawine', 'Laat in Bellenschieter 15 bellen tegelijk vallen', S => (S.bs.bigDrop || 0) >= 15],"),
 'track': '''    // Bellenschieter: bright and bouncy, not hurried (marimba tune, plucked chords, synth bass, light kit; original)
    bs: { bpm: 116, bars: 8, seed: 919, swing: .06, rev: 2.2, revAmt: .26, fn(a) {
      const K = 67, ch = [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M'], [0, 'M'], [4, 'm'], [5, 'M'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 64), bm = K - 24 + r;
        a.kick(a.at(b), .48); a.kick(a.at(b, 8), .4); if (b % 2) a.kick(a.at(b, 14), .18);
        a.clap(a.at(b, 4), .24); a.clap(a.at(b, 12), .24);
        for (let s = 0; s < 16; s += 2) a.hat(a.at(b, s), s % 4 ? .3 : .15, false, .3);
        [[0, 0], [3, 12], [6, 7], [8, 0], [11, 12], [14, 7]].forEach(([s, iv]) => a.bass(a.at(b, s), bm + iv, a.st * 2, .48, 'synth'));
        [2, 6, 10, 14].forEach(s => cm.forEach((m, i) => a.pluck(a.at(b, s), m, a.st * 1.5, i ? .09 : .13, i % 2 ? .3 : -.3)));
      });
      melody(a, { chords: ch, root: K, scale: 'major', lo: 74, hi: 88, rhythm: 'syncop', rest: .1 }).forEach(n => a.marimba(a.at(n.b, n.s), n.m, .42, .15));
      [0, 4].forEach(b => a.bell(a.at(b), 91, .13, .3, 1));
    } },''',
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('bs.json', 'w'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('bs.json'))
