import json, os
# Builds vd.js (the complete Vuistduel module) from vdsrc/ and the package vd.json for addgame.py.
#   vdsrc/data.js    the cast, moves (frame data) and stages list
#   vdsrc/core.js    deterministic 60 Hz fight simulation (no DOM)          } these three also run in Node
#   vdsrc/ai.js      the computer opponent                                  } (vdsrc/load.mjs, tests, balance)
#   vdsrc/rig.js     2D skeleton, looks, poses and animations
#   vdsrc/stages.js  eight painted arenas;  vdsrc/draw.js  camera, effects, HUD;  vdsrc/ui.js  screens, controls, modes
#   vdsrc/style.css, screen.html, modals.html
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('vdsrc/' + f, encoding='utf-8').read()
js = ('''/* ================================================================
   VUISTDUEL – an original 2D one-on-one fighting game: eight fighters, specials and supers, arcade ladder with a
   boss, versus on one phone, versus the computer and training. Cartoon fun: hits make stars, nobody gets hurt.
   ================================================================ */
const Vuistduel = (() => {
''' + ''.join(src(f) + '\n' for f in ['data.js', 'core.js', 'ai.js', 'rig.js', 'stages.js', 'draw.js', 'ui.js']) + '''})();
$('#tileVd').addEventListener('click', () => Vuistduel.enter());
''')
open('vd.js', 'w', encoding='utf-8').write(js)

# ---------- menu icon (512x512): two crossing boxing gloves with a burst behind them ----------
def glove(tr, g1, cuff):
    return (f'<g transform="{tr}" filter="url(#sh)">'
            f'<path d="M-62 40C-92 10-96-60-60-96C-30-126 30-128 60-104C92-78 96-20 76 22C70 34 62 44 52 52L-40 58C-50 54-56 48-62 40Z" fill="url(#{g1})" stroke="#2a1020" stroke-width="7"/>'
            f'<path d="M-64 0C-96-6-104 30-84 44C-72 52-56 48-46 40" fill="url(#{g1})" stroke="#2a1020" stroke-width="7"/>'
            f'<path d="M-30-80C0-96 40-92 58-70" stroke="#fff" stroke-opacity=".45" stroke-width="12" fill="none" stroke-linecap="round"/>'
            f'<rect x="-50" y="52" width="104" height="70" rx="16" fill="{cuff}" stroke="#2a1020" stroke-width="7"/>'
            f'<path d="M-46 76H50M-46 98H50" stroke="#2a1020" stroke-opacity=".25" stroke-width="5"/></g>')
burst = ''.join(f'<path transform="rotate({a} 256 230)" d="M256 230L246 40H266Z" fill="#fff6c8" opacity=".55"/>' for a in range(0, 360, 30))
icon_body = ('<circle cx="256" cy="230" r="150" fill="#ffd23a" opacity=".35"/>' + burst
             + '<path d="M256 120L284 196 364 190 300 240 330 316 256 272 182 316 212 240 148 190 228 196Z" fill="#fff3a0" stroke="#e8902a" stroke-width="6"/>'
             + glove('translate(178 300) rotate(-38) scale(1.05)', 'vdRed', '#f4f1ea') + glove('translate(334 300) scale(-1.05 1.05) rotate(-38)', 'vdBlue', '#f4f1ea')
             + "' + spark(84, 96, 1.2, '#fff6c8') + spark(436, 110, .9, '#fff') + spark(448, 420, .7, '#fff') + '")
icon = ("{ bg: ['#ff6a4a', '#3a1260'], defs: rg('vdRed', '#ff8a7a', '#c8161e') + rg('vdBlue', '#8ac4ff', '#1d4fc0'),\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds: soft sine thumps with filtered pink noise; attacks of 2 ms or more; no clicks, no distortion ----------
sfx = {
  'vdHitL': "[() => { const d = buf(.35); tone(d, 0, 210, 92, .05, .055, .9, .002, .35); wash(d, 0, .14, 1400, 450, .45, .002, .03, .8, 'lp'); return d; }, .08, .5, 3]",
  'vdHitH': "[() => { const d = buf(.6); tone(d, 0, 165, 58, .08, .1, 1, .002, .5); wash(d, 0, .3, 1700, 260, .62, .002, .06, .8, 'lp'); tone(d, .004, 400, 170, .04, .03, .18, .002); return d; }, .12, .62, 3]",
  'vdBlock': "[() => { const d = buf(.25); tone(d, 0, 330, 250, .03, .03, .5, .002, .25); wash(d, 0, .1, 900, 650, .28, .002, .02, 1.2, 'bp'); return d; }, .05, .36, 3]",
  'vdWhoosh': "[() => { const d = buf(.25); wash(d, 0, .2, 650, 1900, .5, .03, .06, 1.4, 'bp'); return d; }, .04, .2, 3]",
  'vdWhooshH': "[() => { const d = buf(.35); wash(d, 0, .3, 420, 1500, .6, .05, .09, 1.2, 'bp'); return d; }, .05, .26, 3]",
  'vdRush': "[() => { const d = buf(.6); wash(d, 0, .5, 300, 1200, .6, .06, .16, 1, 'bp'); tone(d, 0, 110, 150, .3, .15, .3, .02); return d; }, .1, .3, 2]",
  'vdCast': "[() => { const d = buf(.6); wash(d, 0, .45, 500, 2600, .28, .05, .15, 2, 'bp'); tone(d, 0, 440, 880, .25, .12, .26, .01); return d; }, .25, .32, 2]",
  'vdRise': "[() => { const d = buf(.6); tone(d, 0, 300, 900, .3, .12, .3, .006, .2); wash(d, 0, .4, 600, 3000, .35, .03, .1, 1.6, 'bp'); return d; }, .2, .3, 2]",
  'vdProj': "[() => { const d = buf(.8); tone(d, 0, 880, 330, .3, .14, .3, .006, .2); bell(d, .02, 1568, .12, .25); wash(d, 0, .5, 3000, 900, .2, .02, .15, 1.5, 'bp'); return d; }, .25, .3, 2]",
  'vdSplash': "[() => { const d = buf(.8); wash(d, 0, .6, 900, 500, .7, .01, .18, 1, 'bp'); wash(d, 0, .4, 3800, 2200, .18, .02, .1, .8, 'bp'); tone(d, 0, 500, 180, .08, .05, .35, .003, .2); return d; }, .25, .4, 2]",
  'vdLaser': "[() => { const d = buf(1.3); for (let k = 0; k < 3; k++) tone(d, k * .02, 980 - k * 120, 560 - k * 60, 1, .5, .14, .02, .3); wash(d, 0, 1.2, 2400, 1200, .22, .05, .5, 2, 'bp'); return d; }, .3, .36, 1]",
  'vdSuper': "[() => { const d = buf(1.6); [220, 277.2, 329.6, 440].forEach((f, i) => tone(d, i * .05, f, f * 2, 1.0, .5, .16, .08, .3)); wash(d, 0, 1.3, 300, 4200, .35, .5, .4, 1.2, 'bp'); bell(d, .9, 1760, .2, .7); return d; }, .4, .5, 1]",
  'vdKO': "[() => { const d = buf(2.6); tone(d, 0, 95, 38, .5, .5, 1, .004, .6); wash(d, 0, 1.2, 900, 120, .6, .004, .35); bell(d, .25, 523.3, .32, 1.2); bell(d, .25, 784, .2, 1); bell(d, .25, 1046.5, .12, .8); return d; }, .4, .7, 1]",
  'vdBell': "[() => { const d = buf(2); for (const t of [0, .16]) { bell(d, t, 1046.5, .35, .9); bell(d, t, 1567, .16, .6); bell(d, t, 2093, .08, .4); } return d; }, .35, .42, 1]",
  'vdFight': "[() => { const d = buf(1.2); tone(d, 0, 140, 70, .1, .16, .7, .003, .5); [523.3, 659.3, 784].forEach((f, i) => bell(d, .04 + i * .05, f, .22, .5)); wash(d, 0, .5, 600, 3000, .2, .05, .15, 1.4, 'bp'); return d; }, .3, .46, 1]",
  'vdJump': "[() => { const d = buf(.25); tone(d, 0, 260, 480, .1, .05, .25, .006, .2); wash(d, 0, .15, 800, 1600, .18, .02, .04, 1.4, 'bp'); return d; }, .05, .2, 2]",
  'vdLand': "[() => { const d = buf(.25); tone(d, 0, 140, 80, .04, .05, .5, .003, .3); wash(d, 0, .12, 700, 300, .25, .003, .03, .8, 'lp'); return d; }, .05, .28, 2]",
  'vdThud': "[() => { const d = buf(.6); tone(d, 0, 120, 52, .1, .12, .9, .003, .5); wash(d, 0, .45, 900, 200, .5, .004, .12, .8, 'lp'); return d; }, .12, .5, 2]",
  'vdGrab': "[() => { const d = buf(.4); wash(d, 0, .3, 1200, 700, .4, .01, .08, 1.2, 'bp'); tone(d, 0, 200, 150, .05, .06, .4, .003, .3); return d; }, .08, .36, 2]",
  'vdTele': "[() => { const d = buf(.9); [1174.7, 1568, 1760, 2093].forEach((f, i) => bell(d, i * .045, f, .1, .32)); wash(d, 0, .6, 2600, 900, .16, .05, .2, 2, 'bp'); return d; }, .35, .3, 2]",
  'vdChime': "[() => { const d = buf(1); bell(d, 0, 1318.5, .25, .4); bell(d, .06, 1760, .22, .5); return d; }, .3, .34, 1]",
  'vdClash': "[() => { const d = buf(.8); bell(d, 0, 987.8, .2, .3); bell(d, 0, 1480, .12, .25); tone(d, 0, 300, 140, .06, .08, .5, .003, .4); wash(d, 0, .3, 2500, 800, .25, .005, .07, 1.4, 'bp'); return d; }, .25, .42, 1]",
  'vdDizzy': "[() => { const d = buf(1.2); for (let i = 0; i < 5; i++) tone(d, i * .16, 1400 + (i % 2) * 250, 1700 + (i % 2) * 200, .06, .045, .12, .006); return d; }, .25, .26, 1]",
  'vdPerfect': "[() => { const d = buf(1.6); [784, 987.8, 1174.7, 1568, 1975.5].forEach((f, i) => bell(d, i * .07, f, .2, .6)); return d; }, .4, .34, 1]",
  'vdWin': "[() => { const d = buf(2.6); [[0, 523.3], [.13, 659.3], [.26, 784], [.42, 1046.5]].forEach(([t, f]) => bell(d, t, f, .24, .7)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .5, f, f, 0, .9, .1, .05, .3)); return d; }, .45, .42, 1]",
  'vdChamp': "[() => { const d = buf(3.4); [[0, 392], [.12, 523.3], [.24, 659.3], [.36, 784], [.6, 1046.5], [.72, 1318.5]].forEach(([t, f]) => bell(d, t, f, .24, .8)); [196, 261.6, 329.6, 392, 523.3].forEach(f => tone(d, .62, f, f, 0, 1.4, .09, .06, .3)); wash(d, .5, 2, 3000, 6000, .04, .3, .6, 2, 'bp'); return d; }, .5, .46, 1]",
  'vdLose': "[() => { const d = buf(1.8); [[0, 523.3], [.22, 466.2], [.44, 392], [.7, 311.1]].forEach(([t, f], i) => tone(d, t, f * 1.01, f, .05, i === 3 ? .45 : .16, .38, .01, .35)); return d; }, .3, .34, 1]",
  'vdSel': "[() => { const d = buf(.15); tone(d, 0, 1320, 1180, .03, .02, .12, .002); return d; }, .05, .16, 2]",
  'vdOk': "[() => { const d = buf(.4); tone(d, 0, 660, 660, 0, .05, .16, .003, .2); tone(d, .07, 990, 990, 0, .08, .16, .003, .2); return d; }, .12, .24, 1]",
  'vdNo': "[() => { const d = buf(.4); tone(d, 0, 311, 277, .1, .1, .2, .006, .2); return d; }, .1, .24, 1]",
  'vdVs': "[() => { const d = buf(1.4); wash(d, 0, .5, 300, 2400, .45, .2, .1, 1.2, 'bp'); tone(d, .45, 110, 45, .3, .3, .9, .004, .6); bell(d, .46, 784, .14, .8); return d; }, .35, .5, 1]",
  'vdCrunch': "[() => { const d = buf(.3); wash(d, 0, .18, 2400, 1400, .3, .004, .04, 2, 'bp'); tone(d, 0, 520, 300, .03, .03, .2, .003); return d; }, .05, .3, 2]",
}
tracks = '''    // Vuistduel fight: driving and bright, not harsh (kick/clap/hats, synth bass, brass stabs, triangle-square lead; original)
    vd: { bpm: 132, bars: 8, seed: 7731, swing: 0, rev: 1.8, revAmt: .24, bassCut: 1500, fn(a) {
      const K = 57, ch = [[0, 'm'], [0, 'm'], [8, 'M'], [10, 'M'], [5, 'm'], [3, 'M'], [8, 'M'], [7, 'M']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 64), bm = K - 24 + r;
        a.kick(a.at(b), .62); a.kick(a.at(b, 8), .55); if (b % 2) a.kick(a.at(b, 10), .3); a.kick(a.at(b, 14), .2);
        a.clap(a.at(b, 4), .32); a.clap(a.at(b, 12), .32); if (b === 7) [13, 14, 15].forEach(s => a.snare(a.at(b, s), .22));
        for (let s = 0; s < 16; s += 2) a.hat(a.at(b, s), s % 4 ? .32 : .18, s === 14, .3);
        [[0, 0], [3, 0], [6, 12], [8, 0], [10, 7], [12, 0], [14, 12]].forEach(([s, iv]) => a.bass(a.at(b, s), bm + iv, a.st * 1.6, .5, 'synth'));
        a.brass(a.at(b), cm, a.st * 2.2, .55, { vol: .12, cut: 2200 }); if (b % 2) a.brass(a.at(b, 10), cm, a.st * 1.8, .45, { vol: .1, cut: 2000 });
        a.pad(a.at(b), cm, a.bar, .35, { cut: 1100, vol: .06 });
      });
      melody(a, { chords: ch, root: K + 12, scale: 'minor', lo: 69, hi: 84, rhythm: 'busy', rest: .1 }).forEach(n => a.lead(a.at(n.b, n.s), n.m, n.len * a.st, .7, { wave: 'triangle', cut: 3000, vol: .22, vib: 10 }));
    } },
    // Vuistduel menus: calmer, a little mysterious (rhodes, plucks, soft kit, sub bass; original)
    vdm: { bpm: 96, bars: 8, seed: 4411, swing: .12, rev: 2.6, revAmt: .32, fn(a) {
      const K = 50, ch = [[0, 'm7'], [5, 'm7'], [10, '7'], [3, 'M7'], [8, 'M7'], [1, 'M7'], [7, 's4'], [7, '7']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 62);
        cm.forEach(m => a.rhodes(a.at(b), m, a.beat * 1.6, .38, -.2));
        a.bass(a.at(b), K - 12 + r, a.beat * 1.5, .5, 'sub'); a.bass(a.at(b, 10), K - 12 + r + 7, a.beat * .8, .35, 'sub');
        a.kick(a.at(b), .4); a.kick(a.at(b, 10), .25); a.rim(a.at(b, 4), .3); a.rim(a.at(b, 12), .3);
        for (let s = 2; s < 16; s += 4) a.hat(a.at(b, s), .18, false, .3);
        [6, 14].forEach(s => a.pluck(a.at(b, s), cm[1] + 12, a.st * 1.5, .1, .3));
      });
      melody(a, { chords: ch, root: K + 12, scale: 'dorian', lo: 66, hi: 81, rhythm: 'sparse', rest: .2 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .14, n.m % 2 ? .25 : -.25, 1.4, 'vdb'));
    } },'''

g = {
 'id': 'vd', 'tile': 'Vd', 'mod': 'Vuistduel', 'bar': '#120c1e', 'statsKey': 'vd.stats', 'music': 'vdm',
 'tileHtml': '''    <button class="tile" id="tileVd">
      <div class="art"><img class="tile-img" id="artVd" alt=""></div>
      <div>
        <h2>Vuistduel</h2>
        <p>Kies je vechter en win het toernooi</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': src('screen.html'),
 'modalHtml': src('modals.html'),
 'css': src('style.css'),
 'js': js,
 'gamesEntry': "  { id: 'vd', label: 'Vuistduel', emoji: '🥊', bg: ['#ff6a4a', '#3a1260'], enter: () => Vuistduel.enter(), tile: 'tileVd' },\n",
 'statRow': "['vd', `${S.vd.wins || 0} van ${S.vd.fights || 0} gevechten gewonnen · ${S.vd.clears || 0}× toernooi gewonnen${S.vd.bestTime ? ' · beste tijd ' + Math.floor(S.vd.bestTime / 60) + ':' + String(S.vd.bestTime % 60).padStart(2, '0') : ''}`]",
 'wipe': ['vd.stats', 'vd.run', 'vd.settings'],
 'trophies': ("    ['vd1', '🏆', 'Toernooiwinnaar', 'Win het Arcade-toernooi in Vuistduel', S => (S.vd.clears || 0) >= 1],\n"
              "    ['vd2', '✨', 'Perfect!', 'Win in Vuistduel een ronde zonder één keer geraakt te worden', S => (S.vd.perfects || 0) >= 1],\n"
              "    ['vd3', '💥', 'Superfinale', 'Win in Vuistduel een ronde met een supertechniek', S => (S.vd.superKO || 0) >= 1],\n"
              "    ['vd4', '🥊', 'Alleskunner van de ring', 'Win in Vuistduel met elke vechter', S => ['dex', 'truus', 'moer', 'sol', 'bram', 'kiki', 'sjaak', 'nevel'].every(k => (S.vd.winsBy || {})[k])],\n"
              "    ['vd5', '🎩', 'Nevel verdreven', 'Versla Graaf Nevel in het Arcade-toernooi op Moeilijk', S => !!S.vd.bossHard],"),
 'track': tracks,
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('vd.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('vd.json'))
