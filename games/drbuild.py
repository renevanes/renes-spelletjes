import json, os
# Builds dr.js (the complete Dakrenner module) from drsrc/ and the package dr.json for addgame.py.
#   drsrc/build.js   worlds, the level language and the level builder        } these three also run in Node
#   drsrc/levels.js  the 32 handmade levels and the endless-run generator    } (drsrc/load.mjs: core tests,
#   drsrc/core.js    deterministic 60 Hz parkour simulation (no DOM)         }  the test bot, solvability)
#   drsrc/rig.js     the runner: 2D skeleton, poses, outfits, cartoon ragdoll
#   drsrc/draw.js    camera, parallax city, pre-rendered level chunks, objects, effects
#   drsrc/ui.js      screens, touch controls, loop, progress, ghosts, save/resume
#   drsrc/solutions.json  the test bot's input scripts (drsolve.mjs); the medal times are taken from them
#   drsrc/style.css, screen.html, modals.html
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('drsrc/' + f, encoding='utf-8').read()
sol = json.load(open('drsrc/solutions.json', encoding='utf-8')) if os.path.exists('drsrc/solutions.json') else {}
n_levels = src('levels.js').count("{ n: '") - 1          # minus the endless template
medals = [sol[str(i + 1)]['medals'] if str(i + 1) in sol else None for i in range(n_levels)]
body = ''.join(src(f) + '\n' for f in ['build.js', 'levels.js', 'core.js', 'rig.js', 'draw.js', 'ui.js'])
assert '/*MEDALS*/null' in body
body = body.replace('/*MEDALS*/null', json.dumps(medals, separators=(',', ':')))
js = ('''/* ================================================================
   DAKRENNER – an original 2D parkour platformer over the roofs of the city: run with momentum, jump, slide,
   vault, run up walls, grab ledges, swing on bars, ride cables and land your flips on your feet. 32 levels in
   four worlds with medals, golden shoes, a ghost of your best run and an endless run. Crashes are cartoons.
   ================================================================ */
const Dakrenner = (() => {
''' + body + '''})();
$('#tileDr').addEventListener('click', () => Dakrenner.enter());
''')
open('dr.js', 'w', encoding='utf-8').write(js)

# ---------- menu icon (512x512): a runner mid-flip over the rooftops at sunset ----------
win = ''.join(f'<rect x="{x}" y="{y}" width="9" height="12" fill="#ffd86a" opacity=".8"/>' for x, y in [(40, 360), (58, 360), (40, 384), (128, 330), (146, 354), (128, 378), (330, 344), (348, 344), (330, 368), (420, 316), (438, 340), (420, 364), (456, 316)])
icon_body = (
    '<circle cx="372" cy="150" r="78" fill="#ffe6a0" opacity=".9"/><circle cx="372" cy="150" r="110" fill="#ffe6a0" opacity=".18"/>'
    '<path d="M0 340H30V300H90V340H112V280H170V330H200V320H310V300H370V330H400V270H480V310H512V512H0Z" fill="#3a1d66" opacity=".85"/>' + win +
    '<path d="M0 420H210L236 400H300L320 420H512V512H0Z" fill="#1c0f36"/><path d="M0 420H210L236 400H300L320 420H512" fill="none" stroke="#ff9a6a" stroke-width="6" opacity=".7"/>'
    '<path d="M86 404C120 250 300 170 420 300" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-dasharray="2 22" opacity=".85"/>'
    '<g transform="translate(262 236) rotate(-38)" filter="url(#sh)">'
    '<path d="M-6 30L36-8" stroke="#2b3556" stroke-width="30" stroke-linecap="round"/><path d="M36-8L30 40" stroke="#2b3556" stroke-width="27" stroke-linecap="round"/>'
    '<ellipse cx="42" cy="48" rx="24" ry="12" fill="#ff7a2a"/><ellipse cx="40" cy="43" rx="21" ry="12" fill="#fff"/>'
    '<rect x="-34" y="-44" width="64" height="86" rx="30" fill="#26c2b4"/><path d="M-20-12H18" stroke="#e9fffb" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M10 4L-14 26" stroke="#2b3556" stroke-width="28" stroke-linecap="round"/><path d="M-14 26L20 40" stroke="#2b3556" stroke-width="25" stroke-linecap="round"/>'
    '<ellipse cx="28" cy="46" rx="22" ry="11" fill="#ff7a2a"/><ellipse cx="26" cy="41" rx="19" ry="11" fill="#fff"/>'
    '<path d="M-2-28L34 4" stroke="#1fa598" stroke-width="20" stroke-linecap="round"/><circle cx="38" cy="8" r="11" fill="#d9a07a"/>'
    '<circle cx="2" cy="-82" r="36" fill="#d9a07a"/><ellipse cx="36" cy="-78" rx="7" ry="8" fill="#d9a07a"/>'
    '<circle cx="18" cy="-86" r="5" fill="#2a1a14"/><path d="M12-66Q20-60 27-68" stroke="#7a3a2a" stroke-width="4" fill="none" stroke-linecap="round"/>'
    '<path d="M-36-88A38 38 0 0 1 38-88Z" fill="#f4b43a"/><rect x="-40" y="-96" width="80" height="16" rx="7" fill="#c98418"/><circle cx="-6" cy="-132" r="12" fill="#fff3d6"/>'
    '<path d="M-38-86A40 40 0 0 1 36-104" fill="none" stroke="#e8453c" stroke-width="8"/><ellipse cx="-12" cy="-78" rx="14" ry="17" fill="#b8322a"/><ellipse cx="-10" cy="-78" rx="10" ry="13" fill="#e8453c"/>'
    '</g>'
    "' + spark(120, 120, 1.2, '#fff6c8') + spark(452, 236, .8, '#fff') + spark(70, 230, .7, '#fff') + '"
)
icon = "{ bg: ['#ff9a4a', '#4a1a8a'], defs: '', body: '" + icon_body + "' }"

# ---------- sounds: soft sine tones and filtered pink noise; attacks of 2 ms or more; no clicks, no distortion ----------
sfx = {
  'drStep': "[() => { const d = buf(.18); tone(d, 0, 150, 95, .025, .025, .4, .003, .2); wash(d, 0, .08, 900, 450, .14, .004, .018, .8, 'lp'); return d; }, .02, .16, 4]",
  'drJump': "[() => { const d = buf(.3); tone(d, 0, 230, 420, .09, .05, .22, .005, .2); wash(d, 0, .16, 700, 1500, .16, .02, .04, 1.2, 'bp'); return d; }, .05, .22, 3]",
  'drLand': "[() => { const d = buf(.3); tone(d, 0, 130, 72, .05, .06, .5, .003, .3); wash(d, 0, .14, 800, 300, .22, .004, .035, .8, 'lp'); return d; }, .05, .3, 3]",
  'drLandH': "[() => { const d = buf(.5); tone(d, 0, 115, 55, .08, .1, .8, .003, .45); wash(d, 0, .3, 900, 220, .4, .004, .08, .8, 'lp'); return d; }, .08, .4, 2]",
  'drSlide': "[() => { const d = buf(.6); wash(d, 0, .5, 1900, 700, .42, .03, .2, 1, 'bp'); wash(d, 0, .4, 600, 300, .15, .02, .15, .7, 'lp'); return d; }, .05, .26, 2]",
  'drWall': "[() => { const d = buf(.35); tone(d, 0, 210, 120, .03, .045, .45, .003, .3); wash(d, 0, .12, 1300, 600, .22, .003, .025, 1, 'bp'); wash(d, .02, .2, 700, 1800, .15, .03, .05, 1.4, 'bp'); return d; }, .05, .3, 2]",
  'drVault': "[() => { const d = buf(.4); wash(d, 0, .3, 600, 1900, .32, .04, .07, 1.3, 'bp'); tone(d, .02, 180, 270, .06, .05, .22, .004); return d; }, .05, .24, 2]",
  'drGrab': "[() => { const d = buf(.25); tone(d, 0, 330, 250, .03, .03, .3, .003, .2); wash(d, 0, .09, 2000, 1200, .14, .003, .02, 1.5, 'bp'); return d; }, .04, .24, 2]",
  'drClimb': "[() => { const d = buf(.4); wash(d, 0, .32, 500, 1300, .22, .05, .08, 1.2, 'bp'); tone(d, .05, 200, 260, .1, .05, .15, .005); return d; }, .04, .2, 1]",
  'drFlip': "[() => { const d = buf(.4); wash(d, 0, .32, 450, 2300, .42, .06, .08, 1.6, 'bp'); return d; }, .05, .2, 3]",
  'drPerfect': "[() => { const d = buf(1.2); [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(d, i * .06, f, i === 3 ? .1 : .15, .45)); return d; }, .3, .34, 1]",
  'drCrash': "[() => { const d = buf(1.4); tone(d, 0, 560, 300, .05, .09, .45, .003, .25); tone(d, .03, 120, 60, .08, .1, .5, .003, .4); tone(d, .14, 1500, 260, .75, .3, .2, .03); wash(d, 0, .2, 900, 300, .2, .004, .05, .8, 'lp'); return d; }, .2, .42, 1]",
  'drFall': "[() => { const d = buf(1.1); tone(d, 0, 1250, 230, .8, .28, .22, .03); return d; }, .25, .34, 1]",
  'drSplash': "[() => { const d = buf(1); wash(d, 0, .7, 900, 450, .6, .01, .2, 1, 'bp'); wash(d, 0, .45, 3800, 2200, .16, .02, .1, .8, 'bp'); tone(d, 0, 480, 170, .08, .05, .3, .003, .2); return d; }, .25, .42, 1]",
  'drRespawn': "[() => { const d = buf(.9); [784, 1046.5, 1318.5].forEach((f, i) => bell(d, i * .06, f, .16, .35)); wash(d, 0, .4, 2400, 900, .1, .05, .12, 2, 'bp'); return d; }, .3, .26, 1]",
  'drSpring': "[() => { const d = buf(.6); tone(d, 0, 190, 560, .16, .14, .4, .004, .15); tone(d, .06, 380, 760, .18, .1, .14, .004); return d; }, .1, .32, 2]",
  'drCoin': "[() => { const d = buf(.9); bell(d, 0, 1318.5, .2, .3); bell(d, .07, 1760, .16, .5); return d; }, .25, .34, 1]",
  'drCheck': "[() => { const d = buf(1.3); [[0, 659.3], [.09, 880], [.18, 1174.7], [.3, 1318.5]].forEach(([t, f]) => bell(d, t, f, .2, .5)); return d; }, .3, .32, 1]",
  'drZip': "[() => { const d = buf(1.2); wash(d, 0, 1.1, 2200, 900, .26, .08, .45, 3, 'bp'); tone(d, 0, 300, 200, 1, .5, .06, .05); return d; }, .1, .22, 1]",
  'drCrack': "[() => { const d = buf(.25); wash(d, 0, .14, 2500, 1500, .14, .003, .03, 2, 'bp'); tone(d, 0, 700, 480, .02, .02, .1, .002); return d; }, .05, .2, 2]",
  'drCrumble': "[() => { const d = buf(.7); wash(d, 0, .55, 1200, 280, .38, .01, .16, .8, 'lp'); tone(d, 0, 120, 60, .1, .1, .35, .004, .3); return d; }, .1, .32, 2]",
  'drCreak': "[() => { const d = buf(.6); tone(d, 0, 300, 230, .35, .18, .14, .03, .4); tone(d, .02, 450, 350, .3, .12, .05, .03); return d; }, .1, .2, 1]",
  'drThud': "[() => { const d = buf(.6); tone(d, 0, 110, 50, .08, .12, .8, .003, .5); wash(d, 0, .4, 800, 200, .4, .004, .1, .8, 'lp'); return d; }, .1, .4, 2]",
  'drBump': "[() => { const d = buf(.25); tone(d, 0, 170, 95, .03, .04, .45, .003, .3); wash(d, 0, .08, 700, 350, .12, .003, .02, .8, 'lp'); return d; }, .04, .26, 2]",
  'drFinish': "[() => { const d = buf(2.4); [[0, 523.3], [.12, 659.3], [.24, 784], [.4, 1046.5]].forEach(([t, f]) => bell(d, t, f, .24, .7)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .42, f, f, 0, .9, .08, .05, .3)); return d; }, .4, .42, 1]",
  'drMedal': "[() => { const d = buf(1.8); [784, 987.8, 1174.7, 1568, 1975.5].forEach((f, i) => bell(d, i * .07, f, .2, .6)); return d; }, .4, .36, 1]",
  'drSel': "[() => { const d = buf(.15); tone(d, 0, 1320, 1180, .03, .02, .12, .002); return d; }, .05, .16, 2]",
  'drOk': "[() => { const d = buf(.4); tone(d, 0, 660, 660, 0, .05, .16, .003, .2); tone(d, .07, 990, 990, 0, .08, .16, .003, .2); return d; }, .12, .24, 1]",
  'drNo': "[() => { const d = buf(.4); tone(d, 0, 311, 277, .1, .1, .2, .006, .2); return d; }, .1, .24, 1]",
}
tracks = '''    // Dakrenner run: bouncy and bright, not harsh (four-on-the-floor kick, offbeat hats, plucky bass, chord stabs, triangle lead; original)
    dr: { bpm: 126, bars: 8, seed: 5150, swing: 0, rev: 1.6, revAmt: .22, bassCut: 1500, fn(a) {
      const K = 50, ch = [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M'], [0, 'm'], [8, 'M'], [5, 'm'], [7, 'M']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 66), bm = K - 24 + r;
        for (let s = 0; s < 16; s += 4) a.kick(a.at(b, s), .55);
        a.clap(a.at(b, 4), .26); a.clap(a.at(b, 12), .26); if (b === 7) [13, 14, 15].forEach(s => a.clap(a.at(b, s), .16));
        for (let s = 2; s < 16; s += 4) a.hat(a.at(b, s), .3, false, .3);
        for (let s = 1; s < 16; s += 2) a.shaker(a.at(b, s), .14);
        [[0, 0], [2, 12], [3, 0], [6, 7], [8, 0], [10, 12], [11, 0], [14, 7]].forEach(([s, iv]) => a.bass(a.at(b, s), bm + iv, a.st * 1.4, .42, 'synth'));
        [2, 6, 10, 14].forEach(s => cm.forEach(m => a.pluck(a.at(b, s), m + 12, a.st * 1.1, .06, .25)));
        a.pad(a.at(b), cm, a.bar, .3, { cut: 1100, vol: .05 });
      });
      melody(a, { chords: ch, root: K + 12, scale: 'minor', lo: 69, hi: 84, rhythm: 'syncop', rest: .12 }).forEach(n => a.lead(a.at(n.b, n.s), n.m, n.len * a.st, .62, { wave: 'triangle', cut: 3200, vol: .2, vib: 8 }));
    } },
    // Dakrenner menus: easy-going rooftop evening (rhodes, marimba, soft kit, sub bass; original)
    drm: { bpm: 100, bars: 8, seed: 2718, swing: .1, rev: 2.4, revAmt: .3, fn(a) {
      const K = 53, ch = [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, '7'], [0, 'M7'], [4, 'm7'], [2, 'm7'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 64);
        cm.forEach(m => a.rhodes(a.at(b), m, a.beat * 1.8, .34, -.15));
        a.bass(a.at(b), K - 12 + r, a.beat * 1.5, .5, 'sub'); a.bass(a.at(b, 10), K - 12 + r + 7, a.beat * .8, .32, 'sub');
        a.kick(a.at(b), .38); a.kick(a.at(b, 10), .24); a.rim(a.at(b, 4), .26); a.rim(a.at(b, 12), .26);
        for (let s = 2; s < 16; s += 4) a.hat(a.at(b, s), .16, false, .3);
        [6, 14].forEach(s => a.marimba(a.at(b, s), cm[1] + 12, .22, .3));
      });
      melody(a, { chords: ch, root: K + 12, scale: 'major', lo: 67, hi: 81, rhythm: 'sparse', rest: .2 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .13, n.m % 2 ? .25 : -.25, 1.3, 'drb'));
    } },'''

n = n_levels
g = {
 'id': 'dr', 'tile': 'Dr', 'mod': 'Dakrenner', 'bar': '#151a2e', 'statsKey': 'dr.stats', 'music': 'drm',
 'tileHtml': '''    <button class="tile" id="tileDr">
      <div class="art"><img class="tile-img" id="artDr" alt=""></div>
      <div>
        <h2>Dakrenner</h2>
        <p>Ren, spring en flip over de daken van de stad</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': src('screen.html'),
 'modalHtml': src('modals.html'),
 'css': src('style.css'),
 'js': js,
 'gamesEntry': "  { id: 'dr', label: 'Dakrenner', emoji: '🏃', bg: ['#ff9a4a', '#4a1a8a'], enter: () => Dakrenner.enter(), tile: 'tileDr' },\n",
 'statRow': "['dr', `${S.dr.levels || 0}/%d levels · ${S.dr.gold || 0}× goud · ${S.dr.shoes || 0} gouden schoentjes${S.dr.endless ? ' · eindeloos ' + S.dr.endless + ' m' : ''}`]" % n,
 'wipe': ['dr.stats', 'dr.run', 'dr.settings', 'dr.ghost'],
 'trophies': ("    ['dr1', '🏁', 'Dakrenner', 'Haal het eerste level van Dakrenner', S => (S.dr.levels || 0) >= 1],\n"
              "    ['dr2', '🤸', 'Dubbele salto', 'Land een dubbele salto op je voeten in Dakrenner', S => (S.dr.maxFlip || 0) >= 2],\n"
              "    ['dr3', '🥇', 'Goudrenner', 'Haal 10 gouden medailles in Dakrenner', S => (S.dr.gold || 0) >= 10],\n"
              "    ['dr4', '👟', 'Schoenenverzamelaar', 'Verzamel alle gouden schoentjes van één wereld in Dakrenner', S => (S.dr.worldShoes || 0) >= 1],\n"
              "    ['dr5', '🌃', 'Koning van de daken', 'Haal alle %d levels van Dakrenner', S => (S.dr.levels || 0) >= %d],\n"
              "    ['dr6', '♾️', 'Eindeloos', 'Ren 1000 meter in de eindeloze run van Dakrenner', S => (S.dr.endless || 0) >= 1000]," % (n, n)),
 'track': tracks,
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('dr.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('dr.json'), 'levels', n, 'medals', sum(1 for m in medals if m))
