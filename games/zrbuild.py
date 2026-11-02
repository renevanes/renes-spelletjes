import json, os
# Builds zr.js (the complete Zandrijk module) from zrsrc/ and the package zr.json for addgame.py.
#   zrsrc/data.js    factions, units, buildings, damage table, tech tree, the campaign      } these four also run in Node
#   zrsrc/map.js     seeded desert map generator                                           } (zrsrc/load.mjs: core tests,
#   zrsrc/core.js    deterministic 15 Hz simulation: economy, production, combat, A*, fog  }  headless AI-vs-AI matches,
#   zrsrc/ai.js      the computer opponent (build order, waves, defence)                   }  the campaign played by the AI)
#   zrsrc/art.js     terrain chunks, faction sprites in 16 directions, emblems, crystals
#   zrsrc/draw.js    camera, cached background, effects, fog of war, minimap
#   zrsrc/ui.js      screens, touch controls, build bar, HUD, feedback, the loop, save/resume
#   zrsrc/style.css, screen.html, modals.html, release-note.md
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('zrsrc/' + f, encoding='utf-8').read()
body = ''.join(src(f) + '\n' for f in ['data.js', 'map.js', 'core.js', 'ai.js', 'art.js', 'draw.js', 'ui.js'])
js = ('''/* ================================================================
   ZANDRIJK – an original real-time strategy game in the desert: harvest glowing kristal, build a base on the rocks,
   train soldiers and vehicles and defeat the other factions (Zonnegilde, Stormclan, IJzerbond). A campaign of nine
   missions, free play against one or two computer opponents, the sand creeper, fog of war, save/resume.
   Family friendly: destroyed units become smoke and scrap.
   ================================================================ */
const Zandrijk = (() => {
''' + body + '''})();
$('#tileZr').addEventListener('click', () => Zandrijk.enter());
''')
open('zr.js', 'w', encoding='utf-8').write(js)

# ---------- menu icon (512x512): a desert at sunset, glowing crystals, a tank and the sand creeper's ripple ----------
icon_body = (
    '<circle cx="372" cy="136" r="74" fill="#fff0c4" opacity=".9"/><circle cx="372" cy="136" r="110" fill="#fff0c4" opacity=".16"/>'
    '<path d="M0 292Q130 246 270 292T512 280V512H0Z" fill="#eab060"/>'
    '<path d="M0 352Q150 312 310 362T512 344V512H0Z" fill="#d48a40"/>'
    '<path d="M0 428Q170 396 350 436T512 424V512H0Z" fill="#b8692c"/>'
    '<g fill="none" stroke="#7a4a20" stroke-width="7" stroke-linecap="round" opacity=".55"><path d="M318 474Q370 444 424 474"/><path d="M296 494Q370 452 448 494"/><path d="M344 456Q370 440 398 456"/></g>'
    '<g filter="url(#sh)">'
    '<path d="M64 404V292L92 258L120 292V404Z" fill="url(#zrC)"/><path d="M74 400V296L92 272V398Z" fill="#fff" opacity=".4"/>'
    '<path d="M116 410V320L138 294L160 320V410Z" fill="url(#zrC)"/><path d="M124 406V324L138 306V404Z" fill="#fff" opacity=".4"/>'
    '<path d="M28 414V340L46 318L64 340V414Z" fill="url(#zrC)"/>'
    '<path d="M160 420V364L176 346L192 364V420Z" fill="url(#zrC)"/>'
    '</g>'
    '<g transform="translate(316 330) rotate(-28)" filter="url(#sh2)">'
    '<rect x="-92" y="-66" width="184" height="36" rx="12" fill="#3a3530"/><rect x="-92" y="30" width="184" height="36" rx="12" fill="#3a3530"/>'
    '<rect x="-78" y="-48" width="156" height="96" rx="16" fill="#f29a1e"/><rect x="50" y="-44" width="26" height="88" fill="#8c4a06"/>'
    '<rect x="10" y="-9" width="118" height="18" rx="5" fill="#4b4743"/><circle cx="0" cy="0" r="40" fill="#ffd768"/><circle cx="-6" cy="-8" r="14" fill="#fff" opacity=".45"/>'
    '</g>'
    "' + spark(440, 250, 1.1, '#fff6c8') + spark(210, 200, .8, '#cfeaff') + spark(60, 240, .7, '#fff') + '"
)
icon = ("{ bg: ['#ffb05a', '#7a2e5a'], defs: '<linearGradient id=\"zrC\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#e0f4ff\"/><stop offset=\".3\" stop-color=\"#58b4ff\"/><stop offset=\".68\" stop-color=\"#ff9a3a\"/><stop offset=\"1\" stop-color=\"#c8561a\"/></linearGradient>', body: '"
        + icon_body + "' }")

# ---------- sounds: sine / polyBLEP tones and filtered pink noise only; attacks of 3 ms or more; no clicks, no distortion ----------
sfx = {
  'zrGun':     "[() => { const d = buf(.32); for (let k = 0; k < 3; k++) { tone(d, k * .065, 250, 150, .02, .028, .55, .003, .3); wash(d, k * .065, .09, 2000, 800, .32, .003, .022, 1, 'bp'); } return d; }, .06, .2, 3]",
  'zrGunS':    "[() => { const d = buf(.22); for (let k = 0; k < 2; k++) { tone(d, k * .07, 320, 200, .015, .022, .45, .003, .25); wash(d, k * .07, .07, 2600, 1200, .26, .003, .018, 1.2, 'bp'); } return d; }, .05, .16, 3]",
  'zrCannon':  "[() => { const d = buf(.9); tone(d, 0, 140, 58, .12, .12, 1, .003, .55); wash(d, 0, .5, 1800, 240, .75, .003, .08); wash(d, .02, .8, 420, 180, .32, .03, .22); return d; }, .14, .3, 3]",
  'zrRocket':  "[() => { const d = buf(.8); wash(d, 0, .7, 500, 2300, .6, .04, .16, 1.2, 'bp'); tone(d, 0, 170, 110, .1, .08, .3, .004, .3); wash(d, .05, .6, 300, 160, .2, .05, .2); return d; }, .12, .24, 3]",
  'zrArty':    "[() => { const d = buf(1.1); tone(d, 0, 105, 52, .16, .18, 1, .004, .5); wash(d, 0, .9, 900, 200, .6, .004, .16); echoes(d, [[.16, .18, 700]]); return d; }, .2, .3, 2]",
  'zrHit':     "[() => { const d = buf(.45); tone(d, 0, 175, 85, .05, .05, .6, .003, .4); wash(d, 0, .35, 1400, 300, .5, .003, .06); return d; }, .1, .2, 3]",
  'zrBoom':    "[() => { const d = buf(1.6); tone(d, 0, 92, 40, .3, .28, 1, .004, .7); wash(d, 0, 1.3, 2000, 160, 1, .004, .24); wash(d, .05, 1.5, 520, 170, .45, .06, .45); return d; }, .25, .42, 3]",
  'zrBoomBig': "[() => { const d = buf(2.6); tone(d, 0, 80, 34, .5, .45, 1, .005, .8); wash(d, 0, 2.2, 1800, 120, 1.1, .005, .45); wash(d, .1, 2.4, 420, 140, .6, .2, .8); echoes(d, [[.2, .22, 600], [.45, .12, 400]]); return d; }, .32, .5, 2]",
  'zrPoof':    "[() => { const d = buf(.6); wash(d, 0, .45, 1300, 450, .6, .006, .09, 1, 'bp'); tone(d, 0, 430, 210, .09, .05, .22, .004); return d; }, .1, .22, 3]",
  'zrSel':     "[() => { const d = buf(.25); tone(d, 0, 880, 990, .02, .04, .4, .003); tone(d, .045, 1320, 1320, 0, .05, .25, .003); return d; }, .05, .18, 2]",
  'zrAck':     "[() => { const d = buf(.35); chip(d, 0, 660, 660, .07, .28, 'tri', 3000); chip(d, .085, 880, 880, .09, .26, 'tri', 3000); return d; }, .06, .2, 2]",
  'zrAck2':    "[() => { const d = buf(.4); chip(d, 0, 523, 523, .06, .28, 'tri', 2800); chip(d, .07, 659, 659, .06, .28, 'tri', 2800); chip(d, .14, 784, 784, .1, .3, 'tri', 2800); return d; }, .06, .22, 2]",
  'zrClick':   "[() => { const d = buf(.1); tone(d, 0, 1200, 1000, .01, .02, .35, .003); return d; }, .02, .13, 1]",
  'zrNo':      "[() => { const d = buf(.4); tone(d, 0, 300, 260, .1, .07, .5, .005, .2); tone(d, .12, 240, 210, .1, .08, .45, .005, .2); return d; }, .08, .22, 1]",
  'zrDone':    "[() => { const d = buf(1.4); bell(d, 0, 784, .3, .5); bell(d, .1, 1046.5, .25, .6); bell(d, .2, 1318.5, .2, .7); return d; }, .3, .3, 1]",
  'zrReady':   "[() => { const d = buf(1); bell(d, 0, 659.3, .25, .4); bell(d, .09, 987.8, .22, .5); return d; }, .25, .24, 1]",
  'zrBuild':   "[() => { const d = buf(1); tone(d, 0, 150, 78, .06, .08, .8, .003, .5); wash(d, 0, .4, 900, 300, .5, .004, .08); bell(d, .12, 1046.5, .14, .5); return d; }, .2, .32, 1]",
  'zrAlarm':   "[() => { const d = buf(1); for (const [t, f] of [[0, 740], [.2, 587], [.42, 740], [.62, 587]]) tone(d, t, f, f, 0, .09, .45, .01, .15); return d; }, .2, .26, 1]",
  'zrCash':    "[() => { const d = buf(1.1); for (let i = 0; i < 6; i++) bell(d, i * .05, 1500 + i * 220, .1, .3); tone(d, 0, 330, 440, .1, .12, .15, .006); return d; }, .3, .22, 2]",
  'zrBeam':    "[() => { const d = buf(.6); const i0 = 0, n = Math.floor(.55 * sr); let ph = 0, ph2 = 0; for (let k = 0; k < n; k++) { const t = k / sr, f = 220 * (1 + .01 * Math.sin(TAU * 7 * t)); ph += TAU * f / sr; ph2 += TAU * f * 1.5 / sr; d[k] += (Math.sin(ph) * .5 + Math.sin(ph2) * .25 + Math.sin(ph * 4) * .06) * Math.min(1, t / .06) * Math.min(1, (.55 - t) / .12); } wash(d, 0, .55, 1800, 2400, .12, .06, .3, 2, 'bp'); return d; }, .2, .18, 2]",
  'zrZap':     "[() => { const d = buf(.5); wash(d, 0, .3, 3000, 1300, .5, .003, .06, 2, 'bp'); tone(d, 0, 1600, 420, .14, .07, .25, .003); tone(d, .05, 1200, 320, .12, .06, .2, .003); return d; }, .15, .22, 3]",
  'zrKruip':   "[() => { const d = buf(2.2); tone(d, 0, 58, 46, 1, .7, 1, .1, .6); wash(d, 0, 2, 320, 140, .8, .25, .55, .7); wash(d, .2, 1.6, 900, 500, .18, .3, .4, 1.5, 'bp'); return d; }, .2, .38, 1]",
  'zrGulp':    "[() => { const d = buf(1.4); wash(d, 0, 1, 1300, 170, 1, .01, .26); tone(d, 0, 190, 62, .3, .24, .9, .006, .4); tone(d, .28, 95, 50, .2, .2, .5, .01, .3); return d; }, .25, .4, 1]",
  'zrSell':    "[() => { const d = buf(.9); bell(d, 0, 1318.5, .25, .3); bell(d, .07, 1760, .2, .4); return d; }, .25, .24, 1]",
  'zrWin':     "[() => { const d = buf(2.6); [[0, 523.3], [.13, 659.3], [.26, 784], [.42, 1046.5]].forEach(([t, f]) => bell(d, t, f, .24, .7)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .44, f, f, 0, .9, .08, .05, .3)); return d; }, .4, .4, 1]",
  'zrLose':    "[() => { const d = buf(2); [[0, 523.3], [.25, 440], [.5, 392], [.8, 329.6]].forEach(([t, f]) => tone(d, t, f, f * .98, .2, .25, .3, .01, .25)); return d; }, .35, .32, 1]",
}
tracks = '''    // Zandrijk in game: a slow desert groove (hand drums, sub bass, soft marimba ostinato, sine lead; original)
    zr: { bpm: 92, bars: 8, seed: 1717, swing: .08, rev: 2.6, revAmt: .32, fn(a) {
      const K = 50, ch = [[0, 'm'], [0, 'm'], [8, 'M'], [7, 'M'], [0, 'm'], [5, 'm'], [8, 'M'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 62);
        a.pad(a.at(b), cm, a.bar, .4, { cut: 900, vol: .07, a: .8, r: 1.2, wave: 'triangle' });
        a.bass(a.at(b), K - 12 + r, a.beat * 1.6, .42, 'sub'); a.bass(a.at(b, 10), K - 12 + r + 7, a.beat * .8, .28, 'sub');
        a.kick(a.at(b), .28); a.tom(a.at(b, 6), 48, .22, .2); a.tom(a.at(b, 10), 45, .26, -.15); a.tom(a.at(b, 14), 43, .16, .1);
        for (let s = 2; s < 16; s += 4) a.shaker(a.at(b, s), .07);
        [0, 3, 6, 8, 11, 14].forEach((s, i) => a.marimba(a.at(b, s), cm[i % 3] + 12, .14, .3));
      });
      melody(a, { chords: ch, root: K + 12, scale: 'harm', lo: 64, hi: 79, rhythm: 'sparse', rest: .25 }).forEach(n => a.lead(a.at(n.b, n.s), n.m, n.len * a.st, .5, { wave: 'sine', cut: 2200, vol: .14, vib: 12, rev: .6, del: .4, a: .05 }));
    } },
    // Zandrijk menus: wide and calm (triangle pads, bells, rhodes melody, a distant drum; original)
    zrm: { bpm: 76, bars: 8, seed: 3131, rev: 3.2, revAmt: .4, fn(a) {
      const K = 52, ch = [[0, 'm9'], [8, 'M7'], [3, 'M7'], [10, 's4'], [0, 'm9'], [5, 'm7'], [8, 'M7'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 62);
        a.pad(a.at(b), cm, a.bar, .5, { cut: 1000, vol: .09, a: 1, r: 1.6, wave: 'triangle' });
        a.bass(a.at(b), K - 12 + r, a.bar * .9, .32, 'sub');
        [0, 6, 10].forEach((s, k) => a.bell(a.at(b, s), cm[k % cm.length] + 12, .1, k === 1 ? .3 : -.3, 1.6, 'zrb'));
        a.tom(a.at(b, 8), 43, .16, 0);
      });
      melody(a, { chords: ch, root: K + 12, scale: 'dorian', lo: 66, hi: 81, rhythm: 'slow', rest: .2 }).forEach(n => a.rhodes(a.at(n.b, n.s), n.m, n.len * a.st, .22, .15));
    } },'''

g = {
 'id': 'zr', 'tile': 'Zr', 'mod': 'Zandrijk', 'bar': '#1a120a', 'statsKey': 'zr.stats', 'music': 'zrm',
 'tileHtml': '''    <button class="tile" id="tileZr">
      <div class="art"><img class="tile-img" id="artZr" alt=""></div>
      <div>
        <h2>Zandrijk</h2>
        <p>Oogst kristal, bouw een basis en verover de woestijn</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': src('screen.html'),
 'modalHtml': src('modals.html'),
 'css': src('style.css'),
 'js': js,
 'gamesEntry': "  { id: 'zr', label: 'Zandrijk', emoji: '🏜️', bg: ['#ffb05a', '#7a2e5a'], enter: () => Zandrijk.enter(), tile: 'tileZr' },\n",
 'statRow': "['zr', `${S.zr.missions || 0}/9 missies · ${S.zr.stars || 0} ⭐ · ${S.zr.wins || 0}× gewonnen`]",
 'wipe': ['zr.stats', 'zr.save', 'zr.settings'],
 'trophies': ("    ['zr1', '🏜️', 'Woestijnvorst', 'Win je eerste potje Zandrijk', S => (S.zr.wins || 0) >= 1],\n"
              "    ['zr2', '💎', 'Kristalbaron', 'Verzamel 25.000 kristal in Zandrijk', S => (S.zr.harv || 0) >= 25000],\n"
              "    ['zr3', '🗺️', 'Veldheer', 'Speel alle 9 missies van Zandrijk uit', S => (S.zr.missions || 0) >= 9],\n"
              "    ['zr4', '🪲', 'Kruiperschrik', 'Jaag de zandkruiper weg in Zandrijk', S => (S.zr.flee || 0) >= 1],\n"
              "    ['zr5', '⚔️', 'Overmacht', 'Win Vrij spel van Zandrijk tegen 2 moeilijke tegenstanders', S => (S.zr.sk2Hard || 0) >= 1],\n"
              "    ['zr6', '⭐', 'Sterrenregen', 'Haal alle 27 sterren in Zandrijk', S => (S.zr.stars || 0) >= 27],"),
 'track': tracks,
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('zr.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('zr.json'))
