import json, os
# Builds wk.js (the complete "Woef tegen Karel" module) from wksrc/ and the package wk.json for addgame.py.
#   wksrc/levels.js  worlds, items and the 16 machine rooms (their puzzle logic)    } these two also run in Node
#   wksrc/core.js    deterministic room logic: walking, ladders, items, hazards     } (wksrc/load.mjs: tests and the solver)
#   wksrc/art.js     everything on the canvas: Woef, Karel, the machines, the rooms, particles
#   wksrc/ui.js      screens, tap input, loop, HUD, close-ups, map, results, save/resume
#   wksrc/style.css, screen.html, modals.html, release-note.md
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('wksrc/' + f, encoding='utf-8').read()
body = ''.join(src(f) + '\n' for f in ['levels.js', 'core.js', 'art.js', 'ui.js'])
js = ('''/* ================================================================
   WOEF TEGEN KAREL – a puzzle adventure for young players: Woef the dog detective beats the machines of the
   grumpy inventor raccoon Karel by working out how each one breaks (push, pick up, combine, bark). 15 machines in
   three worlds plus a finale, hints in three steps, stars, save/resume of the exact room state.
   ================================================================ */
const WoefKarel = (() => {
''' + body + '''})();
$('#tileWk').addEventListener('click', () => WoefKarel.enter());
''')
open('wk.js', 'w', encoding='utf-8').write(js)
n_levels = src('levels.js').count(", mk: '")

# ---------- menu icon (512x512): Woef, brave and happy, with a bolt, a spring and a gear flying off a machine ----------
icon_body = (
    '<circle cx="390" cy="120" r="96" fill="#ffe6a0" opacity=".22"/>'
    '<g transform="translate(392 132) rotate(18)" filter="url(#sh2)"><path d="M0-62 13-60 16-44 28-39 40-48 50-40 42-28 47-16 63-13 63 0 47 3 42 15 50 27 40 35 28 26 16 31 13 47 0 49-13 47-16 31-28 26-40 35-50 27-42 15-47 3-63 0-63-13-47-16-42-28-50-40-40-48-28-39-16-44-13-60Z" fill="#c9ccd6"/><circle r="17" fill="#5a5a6a"/></g>'
    '<g transform="translate(442 268) rotate(-20)"><path d="M-22-10 0-22 22-10 22 10 0 22-22 10Z" fill="#ffcf3a" stroke="#2a1f3d" stroke-width="5"/><circle r="7" fill="#2a1f3d"/></g>'
    '<path d="M330 236q16-12 0-24t0-24 0-24 0-24" fill="none" stroke="#2a1f3d" stroke-width="12" stroke-linecap="round"/><path d="M330 236q16-12 0-24t0-24 0-24 0-24" fill="none" stroke="#e8e8f0" stroke-width="6" stroke-linecap="round"/>'
    '<g filter="url(#sh)">'
    '<path d="M150 470C120 410 150 350 220 340L300 340C370 350 395 410 370 470Z" fill="#e9a65a" stroke="#2a1f3d" stroke-width="8"/>'
    '<path d="M150 360C190 395 280 400 330 360L338 392C285 430 190 430 142 392Z" fill="#e23b3b" stroke="#2a1f3d" stroke-width="7"/>'
    '<path d="M178 396 150 470 196 452 206 404Z" fill="#b52430" stroke="#2a1f3d" stroke-width="6"/>'
    '<circle cx="246" cy="260" r="116" fill="#e9a65a" stroke="#2a1f3d" stroke-width="8"/>'
    '<ellipse cx="300" cy="312" rx="78" ry="56" fill="#fbe6c4" stroke="#2a1f3d" stroke-width="7"/>'
    '<ellipse cx="350" cy="286" rx="27" ry="21" fill="#2a1f2a"/>'
    '<path d="M270 330Q305 372 345 330" fill="#8a2a3a" stroke="#2a1f3d" stroke-width="6"/>'
    '<ellipse cx="262" cy="222" rx="27" ry="32" fill="#fff" stroke="#2a1f3d" stroke-width="6"/><circle cx="270" cy="226" r="15" fill="#2a1f3d"/><circle cx="275" cy="220" r="5" fill="#fff"/>'
    '<path d="M228 180 296 186" stroke="#2a1f3d" stroke-width="9" stroke-linecap="round"/>'
    '<ellipse cx="225" cy="296" rx="20" ry="11" fill="#ff8a8a" opacity=".55"/>'
    '<path d="M168 170C110 160 92 250 120 320 136 356 172 340 176 300 182 250 196 200 168 170Z" fill="#8a4f2c" stroke="#2a1f3d" stroke-width="8"/>'
    '</g>'
    "' + spark(96, 120, 1.3, '#fff6c8') + spark(452, 400, .9, '#fff') + spark(80, 300, .7, '#fff') + '"
)
icon = "{ bg: ['#ffb347', '#7a3ac0'], defs: '', body: '" + icon_body + "' }"

# ---------- sounds: smooth sines, soft bells and filtered pink noise; attacks of 3 ms or more; no clicks, no distortion ----------
sfx = {
  'wkStep': "[() => { const d = buf(.15); tone(d, 0, 170, 120, .02, .03, .3, .004); wash(d, 0, .07, 900, 500, .08, .004, .02, .8, 'lp'); return d; }, .02, .12, 4]",
  'wkClimb': "[() => { const d = buf(.18); tone(d, 0, 300, 360, .03, .03, .2, .004); wash(d, 0, .08, 1300, 900, .08, .005, .02, 1.2, 'bp'); return d; }, .03, .13, 3]",
  'wkHop': "[() => { const d = buf(.35); tone(d, 0, 260, 520, .1, .08, .35, .004, .15); return d; }, .05, .22, 2]",
  'wkReach': "[() => { const d = buf(.15); tone(d, 0, 700, 900, .04, .04, .15, .004); return d; }, .04, .14, 2]",
  'wkPush': "[() => { const d = buf(.45); wash(d, 0, .4, 500, 350, .25, .05, .12, 1.2, 'bp'); tone(d, 0, 110, 95, .2, .1, .15, .02); return d; }, .03, .17, 2]",
  'wkThud': "[() => { const d = buf(.45); tone(d, 0, 140, 70, .06, .08, .6, .004, .3); wash(d, 0, .25, 800, 250, .2, .004, .05, .8, 'lp'); return d; }, .06, .3, 2]",
  'wkPick': "[() => { const d = buf(.8); bell(d, 0, 880, .2, .25); bell(d, .07, 1318.5, .16, .35); return d; }, .25, .26, 1]",
  'wkNo': "[() => { const d = buf(.5); tone(d, 0, 392, 370, .08, .07, .2, .006, .2); tone(d, .12, 330, 300, .1, .09, .2, .006, .2); return d; }, .08, .2, 1]",
  'wkBark': "[() => { const d = buf(.45); tone(d, 0, 520, 300, .09, .08, .5, .006, .35); tone(d, 0, 260, 180, .1, .08, .35, .006); wash(d, 0, .18, 1400, 700, .25, .006, .05, 1.5, 'bp'); return d; }, .12, .42, 3]",
  'wkKarel': "[() => { const d = buf(.5); tone(d, 0, 220, 160, .15, .1, .3, .01, .5); tone(d, .12, 180, 140, .1, .08, .25, .01, .4); return d; }, .1, .2, 2]",
  'wkWarn': "[() => { const d = buf(.5); tone(d, 0, 440, 660, .25, .12, .15, .02); return d; }, .1, .16, 1]",
  'wkSuck': "[() => { const d = buf(1.3); wash(d, 0, 1.1, 400, 1600, .5, .2, .4, 1.4, 'bp'); tone(d, 0, 120, 240, 1, .4, .08, .05); return d; }, .1, .26, 1]",
  'wkDrip': "[() => { const d = buf(.3); tone(d, 0, 600, 1100, .05, .06, .3, .004); return d; }, .15, .2, 2]",
  'wkGiggle': "[() => { const d = buf(.8); for (let i = 0; i < 6; i++) tone(d, i * .09, 700 + (i % 2) * 150, 900 + (i % 2) * 150, .04, .04, .25, .004); return d; }, .15, .22, 2]",
  'wkMag': "[() => { const d = buf(.8); tone(d, 0, 160, 240, .4, .25, .3, .03, .3); tone(d, .05, 320, 480, .4, .2, .1, .03); return d; }, .12, .2, 1]",
  'wkBoing': "[() => { const d = buf(.6); tone(d, 0, 150, 500, .18, .18, .45, .004, .2); tone(d, .05, 300, 700, .15, .12, .15, .004); return d; }, .1, .3, 2]",
  'wkSplash': "[() => { const d = buf(.9); wash(d, 0, .6, 1200, 500, .6, .01, .18, 1, 'bp'); for (let i = 0; i < 6; i++) tone(d, .02 + i * .06, 700 + i * 90, 1200 + i * 90, .03, .03, .1, .004); return d; }, .2, .28, 2]",
  'wkWhoosh': "[() => { const d = buf(.6); wash(d, 0, .5, 500, 1800, .4, .06, .15, 1.3, 'bp'); return d; }, .1, .22, 3]",
  'wkStamp': "[() => { const d = buf(.6); tone(d, 0, 120, 60, .05, .1, .7, .004, .4); wash(d, 0, .25, 700, 250, .3, .004, .06, .8, 'lp'); return d; }, .08, .32, 2]",
  'wkBubble': "[() => { const d = buf(.6); tone(d, 0, 300, 900, .15, .1, .3, .01); tone(d, .06, 500, 1200, .12, .08, .2, .01); return d; }, .2, .22, 2]",
  'wkZap': "[() => { const d = buf(.9); tone(d, 0, 1600, 300, .5, .2, .22, .01); tone(d, 0, 1200, 250, .5, .2, .1, .01); return d; }, .25, .2, 1]",
  'wkRain': "[() => { const d = buf(1.4); wash(d, 0, 1.3, 1900, 1500, .2, .15, .5, .7, 'bp'); return d; }, .15, .16, 1]",
  'wkRing': "[() => { const d = buf(1); for (let i = 0; i < 8; i++) bell(d, i * .07, i % 2 ? 1568 : 1318.5, .16, .12); return d; }, .2, .2, 1]",
  'wkDizzy': "[() => { const d = buf(.8); bell(d, 0, 1568, .15, .15); bell(d, .08, 2093, .12, .15); bell(d, .16, 1760, .1, .2); return d; }, .25, .18, 1]",
  'wkPop': "[() => { const d = buf(.3); tone(d, 0, 900, 300, .04, .03, .4, .003); wash(d, 0, .06, 2000, 1200, .15, .003, .015, 1, 'bp'); return d; }, .1, .28, 3]",
  'wkPlop': "[() => { const d = buf(.25); tone(d, 0, 420, 200, .06, .04, .25, .004); return d; }, .08, .2, 3]",
  'wkSqueak': "[() => { const d = buf(.35); tone(d, 0, 1800, 2400, .08, .05, .2, .004); tone(d, .1, 2000, 2600, .06, .04, .15, .004); return d; }, .1, .18, 1]",
  'wkClick': "[() => { const d = buf(.2); tone(d, 0, 1200, 1000, .01, .015, .25, .003); tone(d, .04, 900, 800, .01, .015, .2, .003); return d; }, .05, .2, 2]",
  'wkClank': "[() => { const d = buf(.8); bell(d, 0, 523.3, .2, .15); bell(d, 0, 1444, .08, .08); tone(d, 0, 200, 150, .03, .06, .3, .003); return d; }, .2, .25, 2]",
  'wkCrash': "[() => { const d = buf(1.4); tone(d, 0, 160, 60, .2, .25, .7, .004, .4); wash(d, 0, .8, 1400, 250, .5, .005, .2, .8, 'lp'); bell(d, .02, 415, .15, .2); bell(d, .06, 622, .12, .18); return d; }, .25, .38, 1]",
  'wkNom': "[() => { const d = buf(.5); tone(d, 0, 250, 200, .03, .05, .3, .004, .3); tone(d, .18, 240, 190, .03, .05, .3, .004, .3); return d; }, .05, .2, 2]",
  'wkDoor': "[() => { const d = buf(.5); tone(d, 0, 300, 380, .2, .1, .15, .02, .3); wash(d, 0, .15, 600, 400, .1, .005, .04, .8, 'lp'); return d; }, .1, .16, 1]",
  'wkPlace': "[() => { const d = buf(.3); tone(d, 0, 330, 220, .03, .05, .35, .003, .3); return d; }, .08, .22, 2]",
  'wkLever': "[() => { const d = buf(.7); tone(d, 0, 250, 180, .05, .06, .35, .003, .4); bell(d, .04, 659.3, .12, .12); return d; }, .15, .26, 1]",
  'wkValve': "[() => { const d = buf(.7); tone(d, 0, 500, 700, .3, .15, .15, .02); wash(d, .2, .5, 900, 1800, .15, .05, .15, 1, 'bp'); return d; }, .12, .2, 1]",
  'wkFizz': "[() => { const d = buf(1.3); wash(d, 0, 1.1, 3500, 2000, .3, .02, .35, 1.2, 'bp'); tone(d, 0, 800, 400, .6, .2, .1, .01); return d; }, .15, .22, 1]",
  'wkWhirr': "[() => { const d = buf(1.3); tone(d, 0, 200, 600, .8, .4, .2, .05, .3); wash(d, 0, 1.1, 500, 1500, .2, .2, .4, 1.2, 'bp'); return d; }, .1, .2, 1]",
  'wkCook': "[() => { const d = buf(1); for (let i = 0; i < 7; i++) tone(d, i * .12, 300 + (i * 97) % 300, 500 + (i * 97) % 300, .04, .04, .15, .006); return d; }, .15, .16, 1]",
  'wkSniff': "[() => { const d = buf(.6); wash(d, 0, .15, 1500, 2500, .3, .02, .04, 1.5, 'bp'); wash(d, .22, .15, 1500, 2500, .3, .02, .04, 1.5, 'bp'); return d; }, .1, .2, 1]",
  'wkSneeze': "[() => { const d = buf(1); tone(d, 0, 300, 500, .3, .15, .2, .03); wash(d, .35, .35, 2500, 1200, .6, .004, .08, 1, 'bp'); tone(d, .35, 600, 250, .15, .1, .3, .004); return d; }, .2, .32, 1]",
  'wkBeep': "[() => { const d = buf(.3); tone(d, 0, 880, 880, 0, .08, .25, .004); return d; }, .1, .2, 1]",
  'wkAlarm': "[() => { const d = buf(1.3); for (let i = 0; i < 4; i++) { tone(d, i * .28, 660, 660, 0, .07, .18, .01); tone(d, i * .28 + .14, 880, 880, 0, .07, .18, .01); } return d; }, .15, .2, 1]",
  'wkPour': "[() => { const d = buf(.9); for (let i = 0; i < 6; i++) tone(d, i * .12, 280, 480, .05, .05, .2, .006); return d; }, .12, .2, 1]",
  'wkFlap': "[() => { const d = buf(.7); for (let i = 0; i < 6; i++) wash(d, i * .08, .06, 900, 600, .2, .01, .02, 1, 'bp'); return d; }, .1, .18, 1]",
  'wkTing': "[() => { const d = buf(.9); bell(d, 0, 2093, .2, .3); return d; }, .25, .22, 1]",
  'wkFreeze': "[() => { const d = buf(1.6); [2637, 2349, 2093, 1760, 1568].forEach((f, i) => bell(d, i * .1, f, .12, .4)); wash(d, 0, 1.2, 5000, 3000, .08, .1, .4, 1, 'bp'); return d; }, .3, .22, 1]",
  'wkTick': "[() => { const d = buf(.1); tone(d, 0, 2000, 1800, .005, .01, .15, .003); return d; }, .05, .16, 2]",
  'wkYawn': "[() => { const d = buf(1.2); tone(d, 0, 300, 450, .4, .3, .2, .08, .3); tone(d, .45, 420, 220, .5, .25, .18, .04, .3); return d; }, .1, .2, 1]",
  'wkUnwind': "[() => { const d = buf(1.2); for (let i = 0; i < 9; i++) tone(d, i * i * .012, 1400 - i * 90, 1300 - i * 90, .01, .015, .18, .003); tone(d, 0, 500, 150, 1, .3, .12, .02); return d; }, .12, .22, 1]",
  'wkRoll': "[() => { const d = buf(1.2); wash(d, 0, 1.0, 400, 700, .25, .1, .3, 1, 'lp'); tone(d, 0, 90, 110, 1, .4, .1, .05); return d; }, .08, .2, 1]",
  'wkDomino': "[() => { const d = buf(.9); for (let i = 0; i < 4; i++) tone(d, i * .2, 1000, 900, .01, .02, .25, .003); return d; }, .1, .22, 1]",
  'wkStage': "[() => { const d = buf(1.2); [659.3, 784, 1046.5].forEach((f, i) => bell(d, i * .08, f, .18, .4)); return d; }, .3, .26, 1]",
  'wkRumble': "[() => { const d = buf(1.6); wash(d, 0, 1.4, 300, 120, .5, .1, .5, .8, 'lp'); tone(d, 0, 60, 50, 1, .5, .4, .05); return d; }, .15, .3, 1]",
  'wkBreak': "[() => { const d = buf(2); bell(d, 0, 523.3, .2, .2); tone(d, 0, 150, 500, .18, .18, .4, .004, .2); bell(d, .1, 784, .15, .2); tone(d, .15, 200, 600, .15, .12, .3, .004); wash(d, 0, .9, 1200, 300, .4, .01, .3, .8, 'lp'); tone(d, .3, 250, 700, .2, .15, .25, .004); bell(d, .4, 1046.5, .12, .3); return d; }, .25, .42, 1]",
  'wkFlee': "[() => { const d = buf(1.5); wash(d, 0, 1.2, 400, 2200, .4, .1, .4, 1.3, 'bp'); tone(d, 0, 200, 500, 1, .4, .1, .05); return d; }, .15, .24, 1]",
  'wkWin': "[() => { const d = buf(2.4); [[0, 523.3], [.12, 659.3], [.24, 784], [.4, 1046.5]].forEach(([t, f]) => bell(d, t, f, .24, .7)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .42, f, f, 0, .9, .08, .05, .3)); return d; }, .4, .36, 1]",
  'wkCage': "[() => { const d = buf(1.4); tone(d, 0, 140, 70, .08, .15, .6, .004, .3); bell(d, .01, 392, .2, .3); bell(d, .05, 587, .15, .25); for (let i = 0; i < 5; i++) bell(d, .2 + i * .07, 880 + i * 40, .06, .08); return d; }, .25, .3, 1]",
  'wkStar': "[() => { const d = buf(1); bell(d, 0, 1318.5, .2, .35); bell(d, .06, 1760, .14, .45); return d; }, .3, .3, 1]",
  'wkHint': "[() => { const d = buf(1); bell(d, 0, 1318.5, .18, .3); bell(d, .08, 1760, .15, .4); return d; }, .3, .26, 1]",
  'wkSel': "[() => { const d = buf(.15); tone(d, 0, 1320, 1180, .03, .02, .12, .003); return d; }, .05, .16, 2]",
  'wkOk': "[() => { const d = buf(.4); tone(d, 0, 660, 660, 0, .05, .16, .004, .2); tone(d, .07, 990, 990, 0, .08, .16, .004, .2); return d; }, .12, .24, 1]",
}
tracks = '''    // Woef tegen Karel, playing: a sneaky, playful detective groove (upright bass, rim and brush kit, plucks, marimba; original)
    wk: { bpm: 108, bars: 8, seed: 4242, swing: .12, rev: 1.8, revAmt: .24, fn(a) {
      const K = 50, ch = [[0, 'm7'], [5, '7'], [0, 'm7'], [7, '7'], [3, 'M7'], [8, 'M7'], [2, 'm7'], [7, '7']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 64);
        a.kick(a.at(b), .38); a.kick(a.at(b, 10), .22); a.rim(a.at(b, 4), .28); a.rim(a.at(b, 12), .28);
        for (let s = 2; s < 16; s += 4) a.hat(a.at(b, s), .13, false, .3);
        [[0, 0], [4, 7], [8, 12], [12, 10]].forEach(([s, iv]) => a.bass(a.at(b, s), K - 12 + r + iv, a.beat * .8, .5, 'upright'));
        [3, 7, 11, 15].forEach(s => cm.forEach(m => a.pluck(a.at(b, s), m, a.st * .9, .045, .3)));
      });
      melody(a, { chords: ch, root: K + 12, scale: 'dorian', lo: 67, hi: 81, rhythm: 'syncop', rest: .15 }).forEach(n => a.marimba(a.at(n.b, n.s), n.m, .5, .2));
    } },
    // Woef tegen Karel, menus and map: sunny and cheerful (rhodes, upright bass, shaker, bells; original)
    wkm: { bpm: 96, bars: 8, seed: 777, swing: .08, rev: 2.2, revAmt: .3, fn(a) {
      const K = 55, ch = [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M'], [0, 'M'], [4, 'm'], [5, 'M'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 65);
        cm.forEach(m => a.rhodes(a.at(b), m, a.beat * 1.6, .3, -.1));
        a.bass(a.at(b), K - 12 + r, a.beat * 1.4, .45, 'upright'); a.bass(a.at(b, 8), K - 12 + r + 7, a.beat * .9, .35, 'upright');
        a.kick(a.at(b), .3); a.rim(a.at(b, 8), .22); for (let s = 2; s < 16; s += 4) a.shaker(a.at(b, s), .12);
        [6, 14].forEach(s => a.marimba(a.at(b, s), cm[2] + 12, .25, .3));
      });
      melody(a, { chords: ch, root: K + 12, scale: 'major', lo: 67, hi: 83, rhythm: 'even', rest: .18 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .14, .2, 1.2, 'wkb'));
    } },'''

g = {
 'id': 'wk', 'tile': 'Wk', 'mod': 'WoefKarel', 'bar': '#3b2418', 'statsKey': 'wk.stats', 'music': 'wkm',
 'tileHtml': '''    <button class="tile" id="tileWk">
      <div class="art"><img class="tile-img" id="artWk" alt=""></div>
      <div>
        <h2>Woef tegen Karel</h2>
        <p>Versla Karels gekke machines met slimme ideeën</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': src('screen.html'),
 'modalHtml': src('modals.html'),
 'css': src('style.css'),
 'js': js,
 'gamesEntry': "  { id: 'wk', label: 'Woef tegen Karel', emoji: '🐶', bg: ['#ffb347', '#7a3ac0'], enter: () => WoefKarel.enter(), tile: 'tileWk' },\n",
 'statRow': "['wk', `${S.wk.beaten || 0}/%d machines · ${S.wk.stars || 0} ★${S.wk.caught ? ' · Karel gevangen!' : ''}`]" % n_levels,
 'wipe': ['wk.stats', 'wk.save', 'wk.settings'],
 'trophies': ("    ['wk1', '🐶', 'Woef de held', 'Versla je eerste machine in Woef tegen Karel', S => (S.wk.beaten || 0) >= 1],\n"
              "    ['wk2', '🏭', 'Fabrieksbaas', 'Versla alle machines in de fabriek van Karel', S => (S.wk.w2 || 0) >= 1],\n"
              "    ['wk3', '🧠', 'Slimme speurneus', 'Versla 5 machines zonder hint in Woef tegen Karel', S => (S.wk.nohint || 0) >= 5],\n"
              "    ['wk4', '⭐', 'Sterrenhond', 'Haal 3 sterren bij 10 machines in Woef tegen Karel', S => (S.wk.three || 0) >= 10],\n"
              "    ['wk5', '🔒', 'Karel gevangen!', 'Vang Karel in de grote finale van Woef tegen Karel', S => (S.wk.caught || 0) >= 1],\n"
              "    ['wk6', '🌟', 'Alle sterren', 'Haal alle %d sterren in Woef tegen Karel', S => (S.wk.stars || 0) >= %d]," % (n_levels * 3, n_levels * 3)),
 'track': tracks,
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('wk.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('wk.json'), 'levels', n_levels)
