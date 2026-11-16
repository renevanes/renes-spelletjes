import json, os
# Builds wz.js (the complete Woordzoeker module) from wzsrc/ and the package wz.json for addgame.py.
#   wzsrc/words.js   the themes: curated, family-friendly Dutch word lists          } these two also run in Node
#   wzsrc/core.js    the seeded puzzle generator, checks, selection helpers         } (wzsrc/load.mjs, games/wzcore.test.mjs)
#   wzsrc/ui.js      screen, drawing, drag/tap input, hints, geheim woord, clock, save/resume, start/end dialogs
#   wzsrc/style.css, screen.html, modals.html, release-note.md
# Usage: python3 games/wzbuild.py   (then install into a test copy: see games/rebuild_wz.sh)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('wzsrc/' + f, encoding='utf-8').read()
body = ''.join(src(f) + '\n' for f in ['words.js', 'core.js', 'ui.js'])
js = ('''/* ================================================================
   WOORDZOEKER – Dutch word search puzzles. Find the words of a theme in a grid of letters: swipe from the first to the
   last letter (or tap both). Four levels (8x8 up to 14x14, from right/down only to all 8 directions with decoys),
   endless seeded puzzles over 30+ themes, a daily puzzle, hints, and a "geheim woord" spelled by the leftover letters.
   ================================================================ */
const Woordzoeker = (() => {
''' + body + '''})();
$('#tileWz').addEventListener('click', () => Woordzoeker.enter());
''')
open('wz.js', 'w', encoding='utf-8').write(js)

# ---------- menu icon (512x512): a sheet of letters with two found words and a magnifying glass ----------
GRID = ['ZOEK', 'AWIT', 'POES', 'RDLM']
X = [126, 212, 298, 384]; Y = [128, 214, 300, 386]
letters = ''.join(f'<text x="{X[c]}" y="{Y[r] + 21}">{ch}</text>' for r, row in enumerate(GRID) for c, ch in enumerate(row))
cap = lambda x0, x1, y, fill, line: f'<rect x="{x0 - 36}" y="{y - 36}" width="{x1 - x0 + 72}" height="72" rx="36" fill="{fill}" fill-opacity=".6" stroke="{line}" stroke-width="6"/>'
icon_body = (
    '<ellipse cx="256" cy="452" rx="196" ry="24" fill="#000" opacity=".2"/>'
    '<g transform="rotate(-6 256 256)">'
    '<g filter="url(#sh)"><rect x="80" y="82" width="350" height="350" rx="38" fill="url(#wzPaper)"/></g>'
    '<rect x="80" y="82" width="350" height="350" rx="38" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4"/>'
    + cap(X[0], X[3], Y[0], '#ff8a7a', '#e2574a') + cap(X[0], X[3], Y[2], '#6fd6e8', '#2aa5c0')
    + '<g font-family="system-ui,Roboto,sans-serif" font-weight="900" font-size="60" text-anchor="middle" fill="#22313f">' + letters + '</g>'
    '</g>'
    '<g transform="translate(372 368) rotate(-42)" filter="url(#sh2)">'
    '<rect x="-17" y="62" width="34" height="112" rx="15" fill="url(#wzHandle)"/><rect x="-9" y="70" width="8" height="92" rx="4" fill="#fff" opacity=".35"/>'
    '<circle r="78" fill="#bfe9ff" fill-opacity=".38"/><circle r="78" fill="none" stroke="url(#wzRim)" stroke-width="20"/>'
    '<path d="M-48 -30A58 58 0 0 1 -6 -58" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" opacity=".85"/>'
    '</g>'
    "' + spark(452, 118, 1.1, '#fff6c8') + spark(64, 300, .8, '#fff') + spark(250, 40, .7, '#fff') + '"
)
icon = ("{ bg: ['#4fb6e0', '#163a5c'], defs: lg('wzPaper', '#fffdf6', '#efdfbd') + lg('wzRim', '#ffe08a', '#d08a18', 1, 1) + lg('wzHandle', '#8a5a30', '#4a2c16', 1, 0),\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds: sine tones and soft bells only, attacks of 2 ms or more; nothing harsh ----------
sfx = {
  'wzTap':    "[() => { const d = buf(.22); tone(d, 0, 1175, 1160, .01, .03, .3, .003); bell(d, 0, 2350, .04, .03); return d; }, .1, .2, 1]",
  'wzFound':  "[() => { const d = buf(1.3); [[0, 1046.5], [.075, 1318.5], [.15, 1568]].forEach(([t, f]) => bell(d, t, f, .22, .38)); tone(d, 0, 523.3, 523.3, 0, .28, .1, .006); return d; }, .3, .34, 1]",
  'wzDup':    "[() => { const d = buf(.7); bell(d, 0, 659.3, .16, .25); bell(d, .09, 587.3, .12, .25); return d; }, .25, .24, 1]",
  'wzNo':     "[() => { const d = buf(.5); tone(d, 0, 330, 300, .06, .06, .38, .004, .2); tone(d, .1, 262, 240, .06, .07, .32, .004, .2); return d; }, .06, .22, 1]",
  'wzHint':   "[() => { const d = buf(1); bell(d, 0, 1174.7, .2, .32); bell(d, .12, 1568, .18, .4); wash(d, 0, .6, 2600, 4200, .02, .08, .25, 2, 'bp'); return d; }, .3, .26, 1]",
  'wzSlot':   "[() => { const d = buf(.3); tone(d, 0, 740, 700, .015, .045, .36, .003, .3); bell(d, 0, 1480, .05, .05); return d; }, .1, .24, 1]",
  'wzAll':    ("[() => { const d = buf(3); [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => bell(d, i * .1, f, .24, .7)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .5, f, f, 0, 1, .1, .06, .3)); "
               "bell(d, .55, 1568, .18, 1.1); wash(d, .45, 1.6, 3000, 5200, .03, .2, .5, 2, 'bp'); return d; }, .45, .42, 1]"),
  'wzSecret': ("[() => { const d = buf(2.4); wash(d, 0, 1.2, 900, 4200, .06, .2, .4, 1.8, 'bp'); [1318.5, 1568, 1760, 2093, 2637].forEach((f, i) => bell(d, .05 + i * .08, f, .16, .6)); "
               "[392, 493.9, 587.3].forEach(f => tone(d, .45, f, f, 0, .9, .08, .08, .2)); return d; }, .45, .4, 1]"),
}
# the letter tick while dragging: a soft rising pentatonic step per letter
for i, f in enumerate([784, 880, 987.8, 1174.7, 1318.5, 1568, 1760, 1975.5]):
    sfx['wzTick%d' % (i + 1)] = "[() => { const d = buf(.25), f = %s; tone(d, 0, f, f * 1.005, .01, .032, .32, .003); bell(d, 0, f * 2, .035, .035); return d; }, .12, .2, 1]" % f

tracks = '''    // Woordzoeker: calm and thoughtful (soft pads, a slow marimba pattern, rhodes melody, sub bass, a whisper of shaker; original)
    wz: { bpm: 76, bars: 8, seed: 2468, swing: .06, rev: 3, revAmt: .4, fn(a) {
      const K = 57, ch = [[0, 'M7'], [5, 'M7'], [9, 'm7'], [7, 's4'], [0, 'add9'], [2, 'm7'], [5, 'M7'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 64);
        a.pad(a.at(b), cm, a.bar, .4, { cut: 1000, vol: .085, a: 1, r: 1.5 });
        a.bass(a.at(b), K - 12 + r, a.bar * .9, .36, 'sub');
        [0, 6, 8, 12].forEach((s, k) => a.marimba(a.at(b, s), cm[k % cm.length] + 12, k ? .07 : .1, k % 2 ? .3 : -.3));
        a.shaker(a.at(b, 8), .05, .3); if (b % 2) a.shaker(a.at(b, 14), .04, -.3);
      });
      melody(a, { chords: ch, root: K + 12, scale: 'major', lo: 69, hi: 84, rhythm: 'slow', rest: .2 }).forEach(n => a.rhodes(a.at(n.b, n.s), n.m, n.len * a.st, .2, .12));
    } },'''

g = {
 'id': 'wz', 'tile': 'Wz', 'mod': 'Woordzoeker', 'bar': '#173048', 'statsKey': 'wz.stats', 'music': 'wz',
 'tileHtml': '''    <button class="tile" id="tileWz">
      <div class="art"><img class="tile-img" id="artWz" alt=""></div>
      <div>
        <h2>Woordzoeker</h2>
        <p>Zoek de verstopte woorden in het letterrooster</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': src('screen.html'),
 'modalHtml': src('modals.html'),
 'css': src('style.css'),
 'js': js,
 'gamesEntry': "  { id: 'wz', label: 'Woordzoeker', emoji: '🔍', bg: ['#4fb6e0', '#163a5c'], enter: () => Woordzoeker.enter(), tile: 'tileWz' },\n",
 'statRow': "['wz', `${S.wz.solved || 0} opgelost · ${S.wz.words || 0} woorden${S.wz.secrets ? ' · ' + S.wz.secrets + ' geheime woorden' : ''}`]",
 'wipe': ['wz.stats', 'wz.save', 'wz.settings'],
 'trophies': ("    ['wz1', '🔍', 'Woordspeurder', 'Los je eerste Woordzoeker op', S => (S.wz.solved || 0) >= 1],\n"
              "    ['wz2', '📚', 'Woordenschat', 'Vind 500 woorden in Woordzoeker', S => (S.wz.words || 0) >= 500],\n"
              "    ['wz3', '🤫', 'Geheimhouder', 'Raad 10 geheime woorden in Woordzoeker', S => (S.wz.secrets || 0) >= 10],\n"
              "    ['wz4', '⚡', 'Snelle speurneus', 'Los een Woordzoeker van Normaal of moeilijker op binnen 3 minuten', S => (S.wz.fast || 0) >= 1],\n"
              "    ['wz5', '🧠', 'Zonder hulp', 'Los een Expert-woordzoeker op zonder hints', S => (S.wz.expNoHint || 0) >= 1],\n"
              "    ['wz6', '📅', 'Elke dag zoeken', 'Los 7 puzzels van de dag op in Woordzoeker', S => (S.wz.dailyWon || 0) >= 7],"),
 'track': tracks,
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('wz.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('wz.json'))
