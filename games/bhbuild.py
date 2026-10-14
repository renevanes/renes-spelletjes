import json, os
# Builds bh.js (the complete Bushalte module) from bhsrc/ (+ bhsrc/levels.json from bhgen.mjs) and the package bh.json for addgame.py
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('bhsrc/' + f).read()
levels = json.load(open('bhsrc/levels.json'))

js = ('''/* ================================================================
   BUSHALTE – a parking lot full of buses, a queue of passengers at the stop.
   Tap a bus to let it drive off to a bay; passengers board the bus of their colour in queue order.
   40 levels + a daily ride, all made by construction and checked by an exact solver (always solvable without help).
   ================================================================ */
const Bushalte = (() => {
  const LEVELS = ''' + json.dumps(levels, separators=(',', ':')) + ''';
''' + src('core.js') + '\n' + src('art.js') + '\n' + src('ui.js') + '''})();
$('#tileBh').addEventListener('click', () => Bushalte.enter());
''')
open('bh.js', 'w').write(js)

# ---------- vector menu icon (512x512): a friendly yellow bus at its stop ----------
icon_body = (
    '<ellipse cx="236" cy="452" rx="196" ry="26" fill="#000" opacity=".2"/>'
    # bus stop sign behind
    '<rect x="404" y="150" width="12" height="296" rx="5" fill="#8b97a6"/>'
    '<g filter="url(#sh2)"><circle cx="410" cy="146" r="50" fill="#fff"/><circle cx="410" cy="146" r="44" fill="none" stroke="#1d5fbf" stroke-width="9"/>'
    '<rect x="384" y="122" width="52" height="40" rx="9" fill="#1d5fbf"/><rect x="390" y="128" width="40" height="15" rx="3" fill="#fff"/>'
    '<circle cx="394" cy="166" r="7" fill="#1d5fbf"/><circle cx="426" cy="166" r="7" fill="#1d5fbf"/></g>'
    '<g filter="url(#sh)">'
    '<rect x="70" y="208" width="26" height="58" rx="12" fill="#3a3f47"/><rect x="376" y="208" width="26" height="58" rx="12" fill="#3a3f47"/>'
    '<path d="M96 222h22M354 222h22" stroke="#3a3f47" stroke-width="8"/>'
    '<rect x="128" y="396" width="52" height="50" rx="14" fill="#22262c"/><rect x="292" y="396" width="52" height="50" rx="14" fill="#22262c"/>'
    '<rect x="106" y="88" width="260" height="334" rx="50" fill="url(#bhBody)"/>'
    '<rect x="106" y="88" width="260" height="334" rx="50" fill="none" stroke="#c97a00" stroke-opacity=".5" stroke-width="5"/>'
    '<rect x="146" y="106" width="180" height="44" rx="11" fill="#2b2f36"/>'
    '<g fill="#ffb52e"><rect x="162" y="118" width="20" height="20" rx="4"/><rect x="190" y="118" width="20" height="20" rx="4"/><rect x="218" y="118" width="20" height="20" rx="4" fill="#7fe08a"/><rect x="246" y="118" width="20" height="20" rx="4"/><rect x="274" y="118" width="20" height="20" rx="4"/><rect x="302" y="118" width="12" height="20" rx="4"/></g>'
    '<rect x="128" y="166" width="216" height="128" rx="22" fill="url(#bhGlass)"/>'
    '<path d="M150 278 220 178h34l-70 100Z" fill="#fff" opacity=".28"/>'
    '<rect x="234" y="166" width="5" height="128" fill="#1e3a5c" opacity=".6"/>'
    # smiling passengers behind the windscreen
    '<circle cx="186" cy="262" r="20" fill="#f6d2b8"/><path d="M166 258a20 20 0 0 1 40 0q-20-12-40 0Z" fill="#3a2a1e"/><path d="M160 294q26-24 52 0Z" fill="#ff6fb3"/>'
    '<circle cx="292" cy="258" r="20" fill="#c88d62"/><path d="M272 254a20 20 0 0 1 40 0q-20-14-40 0Z" fill="#1f1f24"/><path d="M266 294q26-26 52 0Z" fill="#3a82f2"/>'
    '<rect x="186" y="326" width="100" height="28" rx="9" fill="#000" opacity=".14"/>'
    '<circle cx="152" cy="338" r="22" fill="#fff8d0"/><circle cx="152" cy="338" r="22" fill="none" stroke="#d98a00" stroke-width="5"/>'
    '<circle cx="320" cy="338" r="22" fill="#fff8d0"/><circle cx="320" cy="338" r="22" fill="none" stroke="#d98a00" stroke-width="5"/>'
    '<rect x="112" y="380" width="248" height="32" rx="15" fill="#3a3f47"/>'
    '</g>'
    "' + spark(468, 300, 1.1, '#fffbe0') + spark(64, 110, .9, '#fff') + spark(456, 54, .7, '#fff') + '")
icon = ("{ bg: ['#62d0ff', '#1b5c9c'], defs: lg('bhBody', '#ffe066', '#f5a414') + lg('bhGlass', '#b4e4ff', '#2f6fb0'),\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds: smooth sine tones, harmonics of sines and pink-noise washes; soft attacks, nothing harsh ----------
ENGINE = ("const eng = (t0, dur, f0, f1, amp) => { const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr); let ph = 0; "
          "for (let k = 0; k < n && i0 + k < d.length; k++) { const t = k / sr, f = f0 + (f1 - f0) * (1 - Math.exp(-t / .28)), env = Math.min(1, t / .05) * Math.min(1, (dur - t) / .25); ph += TAU * f / sr; "
          "d[i0 + k] += (Math.sin(ph) + .55 * Math.sin(2 * ph) + .3 * Math.sin(3 * ph) + .12 * Math.sin(4 * ph)) * (1 + .22 * Math.sin(ph * .5)) * env * amp; } };")
seat_notes = [784, 880, 988, 1175, 1319, 1568]
sfx = {
  'bhTap': "[() => { const d = buf(.2); tone(d, 0, 1250, 1050, .006, .014, .28, .002, .1); tone(d, 0, 430, 370, .02, .03, .3, .002, .2); return d; }, .04, .22, 2]",
  'bhGo': "[() => { const d = buf(1); " + ENGINE + " eng(0, .95, 58, 104, .42); wash(d, 0, .9, 320, 820, .3, .06, .3, 1.2, 'bp'); return d; }, .06, .34, 3]",
  'bhBump': ("[() => { const d = buf(.7); tone(d, 0, 170, 105, .04, .06, .7, .002, .5); wash(d, 0, .14, 900, 450, .25, .003, .035, 1, 'bp'); "
             "const horn = (t0, dur) => { const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr); let p1 = 0, p2 = 0; for (let k = 0; k < n && i0 + k < d.length; k++) { const t = k / sr, env = Math.min(1, t / .012) * Math.min(1, (dur - t) / .03); p1 += TAU * 415 / sr; p2 += TAU * 523 / sr; "
             "d[i0 + k] += (Math.sin(p1) + .45 * Math.sin(2 * p1) + .2 * Math.sin(3 * p1) + .8 * Math.sin(p2) + .35 * Math.sin(2 * p2) + .15 * Math.sin(3 * p2)) * env * .2; } }; "
             "horn(.07, .11); horn(.24, .15); return d; }, .08, .36, 2]"),
  'bhLock': "[() => { const d = buf(.45); tone(d, 0, 330, 300, .02, .05, .5, .003, .3); tone(d, .09, 280, 255, .02, .07, .45, .003, .3); tone(d, 0, 1400, 1300, .005, .012, .08, .002); return d; }, .05, .28, 1]",
  'bhPark': "[() => { const d = buf(.65); tone(d, 0, 140, 95, .05, .05, .42, .003, .4); wash(d, .04, .5, 3000, 2100, .22, .025, .13, 1.1, 'bp'); return d; }, .08, .26, 2]",
  'bhFull': "[() => { const d = buf(1.4); bell(d, 0, 1319, .28, .32); bell(d, .13, 1568, .28, .42); " + ENGINE + " eng(.18, 1.1, 60, 110, .3); wash(d, .2, 1, 300, 800, .2, .08, .35, 1.2, 'bp'); return d; }, .12, .34, 2]",
  'bhReveal': "[() => { const d = buf(.8); [1568, 2093].forEach((f, i) => bell(d, i * .06, f, .22, .3)); wash(d, 0, .4, 4000, 6000, .03, .02, .1, 2, 'bp'); return d; }, .3, .24, 1]",
  'bhBoost': "[() => { const d = buf(1.1); wash(d, 0, .7, 500, 3200, .22, .08, .2, 1.5, 'bp'); [988, 1319, 1760].forEach((f, i) => bell(d, .05 + i * .07, f, .22, .45)); return d; }, .35, .3, 1]",
  'bhShuffle': "[() => { const d = buf(.9); for (let k = 0; k < 10; k++) { const t = .02 + k * .05, f = 700 + Math.random() * 700; tone(d, t, f, f * 1.12, .02, .028, .24, .003, .1); } wash(d, 0, .75, 600, 1800, .14, .12, .22, 1.2, 'bp'); bell(d, .55, 1568, .18, .4); return d; }, .2, .3, 2]",
  'bhCrane': ("[() => { const d = buf(1.4); const i0 = 0, n = Math.floor(1.05 * sr); let ph = 0; for (let k = 0; k < n; k++) { const t = k / sr, f = 150 + 70 * Math.min(1, t / .6), env = Math.min(1, t / .08) * Math.min(1, (1.05 - t) / .2); ph += TAU * f / sr; "
              "d[i0 + k] += (Math.sin(ph) + .4 * Math.sin(2 * ph) + .15 * Math.sin(3 * ph)) * (1 + .3 * Math.sin(TAU * 9 * t)) * env * .3; } tone(d, 1.08, 200, 120, .05, .06, .5, .003, .4); wash(d, 1.08, .3, 2600, 1800, .12, .01, .08, 1.1, 'bp'); return d; }, .1, .3, 1]"),
  'bhUndo': "[() => { const d = buf(.5); tone(d, 0, 900, 600, .12, .08, .35, .004, .2); wash(d, 0, .3, 2500, 900, .08, .02, .1, 1.2, 'bp'); return d; }, .1, .28, 1]",
  'bhOpen': "[() => { const d = buf(.9); tone(d, 0, 520, 780, .15, .08, .32, .004, .2); bell(d, .12, 1175, .2, .4); bell(d, .2, 1568, .16, .4); return d; }, .25, .28, 1]",
  'bhWin': ("[() => { const d = buf(3); [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => bell(d, i * .1, f, .24, .7)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .5, f, f, 0, 1, .11, .06, .3)); "
            "bell(d, .55, 1568, .2, 1.2); bell(d, .62, 2093, .14, 1); wash(d, .45, 1.6, 3000, 5200, .03, .2, .5, 2, 'bp'); return d; }, .45, .44, 1]"),
  'bhLose': "[() => { const d = buf(1.8); [[0, 392], [.22, 349.2], [.44, 311.1], [.7, 261.6]].forEach(([t, f], i) => tone(d, t, f * 1.01, f, .05, i === 3 ? .45 : .16, .4, .01, .35)); return d; }, .3, .36, 1]",
}
for i, f in enumerate(seat_notes):
    sfx['bhSeat%d' % (i + 1)] = "[() => { const d = buf(.3); tone(d, 0, %d, %d, .012, .05, .5, .003, .15); tone(d, 0, %d, %d, 0, .02, .07, .003); return d; }, .12, .24, 2]" % (round(f * 1.05), f, f * 2, f * 2)

css = '''#bh{background:#2b6e4a}
#bh .topbar{background:#1d5a78;gap:4px;padding:6px 6px}
#bh .topbar .iconbtn{width:40px;flex:0 0 40px}#bhBack{font-size:28px!important}
.bh-head{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:8px}
#bhTitle{font-weight:800;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bh-pill{display:flex;align-items:center;gap:4px;background:rgba(255,255,255,.13);border-radius:99px;padding:3px 10px;font-weight:800;font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap}
#bhMain{flex:1;display:flex;flex-direction:column;min-height:0}
#bhStage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;background:#74c25c}
#bhStage canvas,#bhBgImg{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none;pointer-events:none}#bhStage #bhCv{pointer-events:auto}
#bhStage #bhQ{width:auto;height:auto}
#bhWorld{position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict}
#bhWorld>*{position:absolute;left:0;top:0}
#bhWorld [hidden]{display:none!important}
.bh-v{will-change:transform}
.bh-v{transform-origin:50% 50%}.bh-v>*{position:absolute;display:block;max-width:none}
.bh-v .seat{border-radius:50%;box-sizing:border-box;transform:scale(.78);border:1.5px solid rgba(255,255,255,.8);background:rgba(0,0,0,.12)}
.bh-v .seat.on{transform:none;border:0;background:linear-gradient(165deg,var(--hr) 0 50%,var(--sk) 51%);box-shadow:1px 1.5px 0 rgba(0,0,0,.3)}
.bh-p{max-width:none;transition:transform .32s cubic-bezier(.3,.7,.4,1)}.bh-p.walk{transition:none;z-index:900}
.bh-fx{position:absolute;display:block;transform:translate(-50%,-50%);animation-fill-mode:both;animation-timing-function:ease-out;pointer-events:none;z-index:950;font-style:normal}
.bh-fx.puff{border-radius:50%;background:radial-gradient(closest-side,rgba(236,239,243,.8),rgba(236,239,243,.45) 60%,rgba(236,239,243,0));animation-name:bhPuff;z-index:5}
@keyframes bhPuff{from{transform:translate(-50%,-50%) scale(.6);opacity:.85}to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(2.4);opacity:0}}
.bh-fx.spark{background:currentColor;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);animation-name:bhSpark}
@keyframes bhSpark{from{transform:translate(-50%,-50%) scale(1);opacity:1}to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.4);opacity:0}}
.bh-fx.bang{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='98.0,50.0 74.9,60.3 83.9,83.9 60.3,74.9 50.0,98.0 39.7,74.9 16.1,83.9 25.1,60.3 2.0,50.0 25.1,39.7 16.1,16.1 39.7,25.1 50.0,2.0 60.3,25.1 83.9,16.1 74.9,39.7' fill='#ffe14d' stroke='#e07b00' stroke-width='4' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat;color:#c0392b;font-weight:900;display:flex;align-items:center;justify-content:center;animation-name:bhBang}
@keyframes bhBang{0%{transform:translate(-50%,-50%) scale(.5);opacity:1}35%{transform:translate(-50%,-50%) scale(1.1);opacity:1}70%{opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}
.bh-cable{width:3px;height:100%;margin-left:-1.5px;background:linear-gradient(90deg,#333,#777,#333);z-index:60}
.bh-cable i{position:absolute;left:50%;bottom:-6px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#ffb000;border:2px solid #9a6a00;box-sizing:border-box}
.bh-xbay{background:#525a65;border:3px dashed #ffd34d;box-sizing:border-box;border-radius:3px;display:flex;align-items:flex-end;justify-content:center;color:#ffd34d;font-weight:900;z-index:1;animation:bhXIn .5s ease-out both}
.bh-xbay b{margin-bottom:12%}
@keyframes bhXIn{from{opacity:0;filter:brightness(2)}to{opacity:1}}
.bh-boom{border-radius:6px;background:repeating-linear-gradient(90deg,#e23b2e 0 14%,#fff 14% 28%);box-shadow:0 2px 3px rgba(0,0,0,.35),inset 0 0 0 1px rgba(0,0,0,.25);transform-origin:0 50%;transition:transform .6s cubic-bezier(.3,1.4,.5,1);z-index:30}
.bh-lbc{border-radius:50%;background:#2b3038;border:2px solid #ffd34d;box-sizing:border-box;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;font-weight:800;z-index:2;transition:opacity .5s}
.bh-lbc small{font-size:.36em;color:#ffd34d;margin-top:1px;font-weight:700;letter-spacing:-.02em}.bh-lbc.open{opacity:0}
.bh-glow{border-radius:50%;background:radial-gradient(closest-side,rgba(255,240,150,.85),rgba(255,240,150,.5) 60%,rgba(255,240,150,0));z-index:100}
.bh-more{position:absolute;left:0;top:0;background:rgba(30,40,55,.88);color:#fff;font-weight:800;font-size:13px;line-height:1;padding:5px 9px;border-radius:99px;z-index:850;box-shadow:0 2px 5px rgba(0,0,0,.3)}
#bh.intro #bhStage>canvas,#bh.intro #bhBgImg,#bh.intro #bhWorld{animation:bhIn .45s ease-out}
@keyframes bhIn{from{opacity:.25;transform:scale(1.03)}to{opacity:1;transform:none}}
#bh.crane #bhCv{cursor:crosshair}
#bhTools{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 10px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#1d5a78,#164a63)}
#bhTools button{position:relative;background:rgba(255,255,255,.12);border-radius:16px;color:#fff;padding:7px 0 5px;display:flex;flex-direction:column;align-items:center;gap:1px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 0 rgba(0,0,0,.25)}
#bhTools button:active{transform:translateY(1px);background:rgba(255,255,255,.2)}
#bhTools button.on{background:#ffcf3a;color:#2b2100;box-shadow:0 0 0 3px rgba(255,220,90,.5)}
#bhTools button b{font-size:22px;line-height:1.15;font-weight:600}#bhTools button small{font-size:11.5px;color:rgba(255,255,255,.82)}
#bhTools button.on small{color:#2b2100}
#bhTools button i{position:absolute;top:-5px;right:4px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#ffcf3a;color:#2b2100;font-style:normal;font-weight:800;font-size:12px;line-height:20px;box-shadow:0 1px 3px rgba(0,0,0,.35)}
#bhTools button i.buy{background:#fff;color:#7a5600;font-size:10.5px}
html.big-text #bhTools button small{font-size:13px}html.big-text #bhTools button b{font-size:25px}
#bh.land #bhMain{flex-direction:row}
#bh.land #bhTools{grid-template-columns:1fr;grid-auto-rows:minmax(0,1fr);width:86px;padding:10px 8px calc(8px + env(safe-area-inset-bottom));background:linear-gradient(90deg,#1d5a78,#164a63)}
#bh.land .topbar{min-height:44px;padding:3px 6px}
#bhTip{position:absolute;left:10px;right:10px;top:10px;z-index:5;display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.96);color:#1f2a33;border-radius:16px;padding:10px 14px;font-size:14.5px;line-height:1.38;box-shadow:0 8px 22px rgba(0,0,0,.3);transform:translateY(-14px);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}
#bhTip.show{opacity:1;transform:none;pointer-events:auto}
#bhTip b{font-size:20px;line-height:1.1}
html.big-text #bhTip{font-size:16.5px}
#bh.land #bhTip{left:auto;right:12px;max-width:420px}
#bhConf{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:3}
#bhConf i{position:absolute;top:-16px;border-radius:2px;animation:bhFall linear both;will-change:transform}
@keyframes bhFall{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(var(--dx),calc(100vh + 30px)) rotate(var(--r));opacity:.85}}
#bhHand{position:absolute;z-index:4;width:0;height:0;pointer-events:none;display:none}
#bhHand.show{display:block}
#bhHand::before{content:'👆';position:absolute;left:-6px;top:4px;font-size:40px;filter:drop-shadow(0 3px 3px rgba(0,0,0,.45));animation:bhPoke 1s ease-in-out infinite}
#bhHand::after{content:'';position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.9);animation:bhRing 1s ease-out infinite}
@keyframes bhPoke{0%,100%{transform:translate(0,10px)}50%{transform:translate(0,0)}}
@keyframes bhRing{0%{transform:scale(.4);opacity:0}40%{opacity:1}100%{transform:scale(1.25);opacity:0}}
#bhToast{position:absolute;left:50%;bottom:14px;z-index:6;transform:translate(-50%,10px);opacity:0;pointer-events:none;background:rgba(18,32,44,.95);color:#fff;padding:10px 16px;border-radius:14px;font-size:14.5px;line-height:1.35;max-width:88%;width:max-content;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);transition:opacity .2s,transform .2s}
#bhToast.show{opacity:1;transform:translate(-50%,0)}
#bhStartModal .sheet,#bhEndModal .sheet,#bhLoseEndModal .sheet{background:linear-gradient(180deg,#235f7d,#173f55)}
#bhStartModal .sticky-actions{background:#173f55}
.bh-levels{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:10px 0 12px}
.bh-levels button{position:relative;aspect-ratio:1/1.12;border-radius:12px;padding:0;background:linear-gradient(160deg,#ffd75a,#f2a516 75%,#e08e0a);box-shadow:inset 0 2px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(120,60,0,.18),0 3px 0 #9a5a00;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#3a2200;-webkit-tap-highlight-color:transparent}
.bh-levels button:active{transform:translateY(2px);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 1px 0 #9a5a00}
.bh-levels button b{font-size:17px;font-weight:900;line-height:1.1}
.bh-levels button span{font-size:10px;letter-spacing:-1px;line-height:1}.bh-levels button i{font-style:normal;color:rgba(90,45,0,.3)}.bh-levels button i.on{color:#fff;text-shadow:0 0 4px rgba(255,255,255,.8),0 1px 0 rgba(140,70,0,.7)}
.bh-levels button.lock{background:rgba(255,255,255,.08);box-shadow:none;color:#fff;opacity:.6}
.bh-levels button.lock b{font-size:13px}
.bh-levels button.next{animation:bhGlow 1.4s ease-in-out infinite}
@keyframes bhGlow{0%,100%{box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 3px 0 #9a5a00,0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 3px 0 #9a5a00,0 0 0 4px rgba(255,255,255,.85)}}
@media (orientation:landscape){.bh-levels{grid-template-columns:repeat(10,1fr)}}
#bhDaily{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:10px 12px;border-radius:16px;margin:4px 0 10px;background:linear-gradient(115deg,rgba(98,208,255,.32),rgba(98,208,255,.1));border:1px solid rgba(140,220,255,.55);color:var(--ink)}
#bhDaily .bh-dico{font-size:30px;line-height:1}
#bhDaily .bh-dtx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}#bhDaily b{font-size:16px}#bhDaily small{color:var(--muted);font-size:12.5px}
#bhDaily em{font-style:normal;font-weight:800;background:var(--accent);color:#2b2100;border-radius:99px;padding:6px 11px;font-size:14px;white-space:nowrap}
#bhDaily.lock{opacity:.55}#bhDaily.lock em{background:rgba(255,255,255,.14);color:var(--ink)}
#bhDaily.done em{background:rgba(255,255,255,.14);color:#ffe27a}
#bhShop{display:grid;grid-template-columns:auto repeat(4,minmax(0,1fr));gap:6px;align-items:stretch;margin:0 0 12px}
.bh-purse{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 8px;border-radius:14px;background:rgba(255,207,58,.16);border:1px solid rgba(255,207,58,.5);font-size:15px}
.bh-purse b{font-size:19px;line-height:1.1}.bh-purse small{color:var(--muted);font-size:11px}
#bhShop button{display:flex;flex-direction:column;align-items:center;gap:0;padding:6px 2px;border-radius:14px;background:rgba(0,0,0,.22);color:var(--ink);min-width:0}
#bhShop button b{font-size:20px;line-height:1.2}#bhShop button span{font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#bhShop button small{font-size:11px;color:var(--muted)}#bhShop button em{font-style:normal;font-size:10.5px;color:#ffe27a;white-space:nowrap}
#bhShop button.no{animation:bhNo .4s}
@keyframes bhNo{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.bh-stars{display:flex;justify-content:center;align-items:flex-end;gap:4px;margin:-4px 0 8px;min-height:62px}
.bh-stars span{font-size:46px;color:rgba(255,255,255,.16);line-height:1}
.bh-stars span:nth-child(2){font-size:60px;margin-bottom:8px}
.bh-stars span.on{color:#ffd84a;text-shadow:0 0 16px rgba(255,200,40,.7),0 3px 0 #b8780a;animation:bhStar .55s cubic-bezier(.3,1.7,.5,1) both}
@keyframes bhStar{0%{transform:scale(0) rotate(-40deg);opacity:0}100%{transform:scale(1);opacity:1}}
#bhEndText{margin:4px 0 16px;line-height:1.55}#bhEndText b{color:var(--ink)}#bhEndText small{color:var(--muted)}
.bh-coin{display:inline-block;margin-top:6px;background:rgba(255,207,58,.2);border:1px solid rgba(255,207,58,.55);border-radius:99px;padding:2px 12px;font-weight:800;color:#ffe27a}
#bhEndModal .row .btn,#bhLoseEndModal .row .btn{padding:14px 6px;white-space:nowrap;font-size:15px}
#bhLoseEndModal .bh-lrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
#bhLoseEndModal .bh-lrow .btn{font-size:14.5px;padding:12px 4px}
#bhLoseEndModal .btn:disabled{opacity:.45}
html.big-text .bh-coins{display:none}
@media (max-width:370px){.bh-pill{padding:3px 7px;font-size:14px}#bhTitle{font-size:15px}#bhShop{grid-template-columns:repeat(4,minmax(0,1fr))}.bh-purse{grid-column:1/-1;flex-direction:row;gap:6px}}'''

pause_unused = ''
g = {
 'id': 'bh', 'tile': 'Bh', 'mod': 'Bushalte', 'bar': '#1d5a78', 'statsKey': 'bh.stats', 'music': 'bh',
 'tileHtml': '''    <button class="tile" id="tileBh">
      <div class="art"><img class="tile-img" id="artBh" alt=""></div>
      <div>
        <h2>Bushalte</h2>
        <p>Laat de bussen wegrijden en breng iedereen naar huis</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ BUSHALTE ============ -->
<section id="bh" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="bhBack" aria-label="Terug">‹</button>
    <div class="bh-head"><span id="bhTitle">Level 1</span><span class="bh-pill" title="Wachtende passagiers">🧍 <b id="bhLeft">0</b></span><span class="bh-pill bh-coins" title="Munten">🪙 <b id="bhCoins">0</b></span></div>
    <button class="iconbtn" id="bhRetry" aria-label="Opnieuw">↻</button>
    <button class="iconbtn" id="bhMenu" aria-label="Levels">☰</button>
  </div>
  <div id="bhMain">
    <div id="bhStage"><canvas id="bhBg"></canvas><img id="bhBgImg" alt=""><canvas id="bhQ"></canvas><div id="bhWorld"></div><canvas id="bhCv"></canvas><div id="bhConf"></div><div id="bhHand"></div><div id="bhTip"></div><div id="bhToast"></div></div>
    <div id="bhTools"><button data-b="undo"><b>↶</b><small>Terug</small><i></i></button><button data-b="bay"><b>🅿️</b><small>Extra vak</small><i></i></button><button data-b="shuf"><b>🔀</b><small>Schudden</small><i></i></button><button data-b="crane"><b>🏗️</b><small>Kraan</small><i></i></button></div>
  </div>
</section>
''',
 'modalHtml': '''<div class="modal" id="bhStartModal">
  <div class="sheet">
    <h3>🚌 Bushalte</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Tik op een bus: hij rijdt rechtuit weg, de kant op van de pijl, en parkeert bij de halte. De passagiers stappen in de volgorde van de rij in de bus met hun kleur; een volle bus vertrekt. Kies slim welke bus je eerst laat gaan, want er zijn maar een paar vakken! Elk level is zonder hulpjes op te lossen.</p>
    <button id="bhDaily"></button>
    <div class="bh-levels" id="bhLevels"></div>
    <div id="bhShop"></div>
    <div id="bhOptList"></div>
    <div class="stats" id="bhStats"></div>
    <div class="row sticky-actions"><button class="btn" id="bhStartBack">Menu</button><button class="btn" id="bhResume" hidden>Verder</button><button class="btn primary" id="bhGo">Spelen ▶</button></div>
  </div>
</div>
<div class="modal center" id="bhEndModal">
  <div class="sheet">
    <div class="bh-stars" id="bhEndStars"></div>
    <h3 id="bhEndTitle"></h3>
    <p id="bhEndText"></p>
    <div class="row"><button class="btn" id="bhEndMenu">Levels</button><button class="btn" id="bhEndRetry">Opnieuw</button><button class="btn primary" id="bhEndNext">Volgende ▶</button></div>
  </div>
</div>
<div class="modal center" id="bhLoseEndModal">
  <div class="sheet">
    <div class="big-emoji">🚏</div>
    <h3>Vastgelopen!</h3>
    <p>Alle vakken zijn bezet en de voorste passagier past in geen enkele bus. Zet een zet terug, open een extra vak of probeer het opnieuw. <small style="color:var(--muted)">(🪙 <span id="bhLoseCoins">0</span>)</small></p>
    <div class="bh-lrow"><button class="btn" id="bhLoseUndo">↶ Terug</button><button class="btn" id="bhLoseBay">🅿️ Extra vak</button></div>
    <div class="row"><button class="btn" id="bhLoseMenu">Levels</button><button class="btn primary" id="bhLoseRetry">↻ Opnieuw</button></div>
  </div>
</div>''',
 'css': css,
 'js': js,
 'gamesEntry': "  { id: 'bh', label: 'Bushalte', emoji: '🚌', bg: ['#62d0ff', '#1b5c9c'], enter: () => Bushalte.enter(), tile: 'tileBh' },\n",
 'statRow': "['bh', `${Object.keys(S.bh.stars || {}).length}/40 levels · ${Object.values(S.bh.stars || {}).reduce((a, b) => a + b, 0)} ★${S.bh.dailyWon ? ' · ' + S.bh.dailyWon + ' dagritten' : ''}`]",
 'wipe': ['bh.stats', 'bh.save', 'bh.settings'],
 'trophies': ("    ['bh1', '🚌', 'Eerste rit', 'Haal het eerste level van Bushalte', S => Object.keys(S.bh.stars || {}).length >= 1],\n"
              "    ['bh2', '⭐', 'Sterrenchauffeur', 'Verdien 60 sterren in Bushalte', S => Object.values(S.bh.stars || {}).reduce((a, b) => a + b, 0) >= 60],\n"
              "    ['bh3', '🧠', 'Zonder hulpjes', 'Haal 10 levels van Bushalte met drie sterren', S => (S.bh.three || 0) >= 10],\n"
              "    ['bh4', '🏁', 'Eindhalte', 'Haal alle 40 levels van Bushalte', S => Object.keys(S.bh.stars || {}).length >= 40],\n"
              "    ['bh5', '📅', 'Vaste reiziger', 'Haal 7 dagritten in Bushalte', S => (S.bh.dailyWon || 0) >= 7],"),
 'track': '''    // Bushalte: sunny and relaxed, a little ride through town (marimba tune, rhodes chords, upright bass, light shuffle; original)
    bh: { bpm: 104, bars: 8, seed: 523, swing: .1, rev: 2.6, revAmt: .3, fn(a) {
      const K = 65, ch = [[0, 'M7'], [9, 'm7'], [2, 'm7'], [7, '7'], [0, 'M7'], [5, 'M7'], [2, 'm7'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 62), bm = K - 24 + r;
        a.kick(a.at(b), .38); a.kick(a.at(b, 10), .22);
        a.rim(a.at(b, 4), .26); a.rim(a.at(b, 12), .26);
        for (let s = 0; s < 16; s += 2) a.shaker(a.at(b, s), s % 4 ? .32 : .18);
        [[0, 0], [6, 7], [8, 12], [14, 7]].forEach(([s, iv]) => a.bass(a.at(b, s), bm + iv, a.st * 2, .55, 'upright'));
        cm.forEach((m, i) => a.rhodes(a.at(b), m, a.bar * .45, i ? .14 : .2, i % 2 ? .25 : -.25));
        cm.forEach((m, i) => { if (i) a.rhodes(a.at(b, 10), m, a.st * 3, .08, .2); });
      });
      melody(a, { chords: ch, root: K, scale: 'major', lo: 72, hi: 86, rhythm: 'even', rest: .14 }).forEach(n => a.marimba(a.at(n.b, n.s), n.m, .4, .2));
      [0, 4].forEach(b => a.bell(a.at(b), 89, .16, .35, 1.2));
    } },''',
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('bh.json', 'w'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('bh.json'))
