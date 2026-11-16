import json, os
# Builds lg.js (the complete Logigram module) from lgsrc/ and the package lg.json for addgame.py.
#   lgsrc/data.js    theme sets: names, categories with Dutch phrase templates, ordered categories (ages, times, ...)
#   lgsrc/core.js    puzzle model, logical solver (no guessing), generator, clue sentences, hints, marks     } also run in Node
#   lgsrc/ui.js      the grid on a canvas (pan, pinch-zoom), clue list, summary, hints, timer, save/resume      (lgsrc/load.mjs)
#   lgsrc/style.css, screen.html, modals.html, release-note.md
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('lgsrc/' + f, encoding='utf-8').read()
js = ('''/* ================================================================
   LOGIGRAM – logic grid puzzles: a hidden solution links people to pets, towns, sports, ages, bedtimes ...
   Deduce it from Dutch clues and mark ✓ / ✗ in the classic staircase grid. Endless puzzles from a generator that
   checks every puzzle with a solver that only uses logical steps; four levels and a puzzle of the day; hints that
   show the next step and why.
   ================================================================ */
const Logigram = (() => {
''' + ''.join(src(f) + '\n' for f in ['data.js', 'core.js', 'ui.js']) + '''})();
$('#tileLg').addEventListener('click', () => Logigram.enter());
''')
open('lg.js', 'w', encoding='utf-8').write(js)

# ---------- menu icon (512x512): a paper logic grid with ✓ and ✗, and a magnifying glass ----------
X0, Y0, CS = 150, 168, 44          # grid origin and cell size: blocks of 3x3, staircase of three blocks
def cell(bx, by, r, c): return X0 + bx * 3 * CS + (c + .5) * CS, Y0 + by * 3 * CS + (r + .5) * CS
def yes(x, y): return (f'<circle cx="{x:.0f}" cy="{y:.0f}" r="15" fill="#2a9d6f"/>'
                       f'<path d="M{x - 7:.0f} {y + 1:.0f}l5 5 9-10" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>')
def no(x, y): return f'<path d="M{x - 8:.0f} {y - 8:.0f}l16 16m0-16l-16 16" stroke="#6a7682" stroke-width="5" stroke-linecap="round"/>'
blocks = [(0, 0, [(0, 1), (1, 2), (2, 0)]), (1, 0, [(0, 0), (1, 1), (2, 2)]), (0, 1, [(0, 2), (1, 0), (2, 1)])]
grid = ''
for bx, by, sol in blocks:
    x, y = X0 + bx * 3 * CS, Y0 + by * 3 * CS
    grid += f'<rect x="{x}" y="{y}" width="{3 * CS}" height="{3 * CS}" fill="{"#f8efdc" if (bx + by) % 2 else "#fffaf0"}"/>'
    grid += ''.join(f'<path d="M{x + i * CS} {y}v{3 * CS}M{x} {y + i * CS}h{3 * CS}" stroke="#dccfb3" stroke-width="3"/>' for i in (1, 2))
    for r in range(3):
        for c in range(3):
            cx, cy = cell(bx, by, r, c)
            if (r, c) in sol: grid += yes(cx, cy)
            elif (bx, by, r) != (1, 0, 2) and not (bx == 0 and by == 1 and r == 2): grid += no(cx, cy)
    grid += f'<rect x="{x}" y="{y}" width="{3 * CS}" height="{3 * CS}" fill="none" stroke="#4d4134" stroke-width="5"/>'
dots = ['#e2433b', '#2f6fdc', '#f2c51f', '#8b4fd1', '#2fa84f', '#f28a1f']
heads = ''.join(f'<circle cx="{X0 + (i + .5) * CS}" cy="{Y0 - 26}" r="10" fill="{dots[i]}"/>' for i in range(6))
heads += ''.join(f'<rect x="{X0 - 42}" y="{Y0 + (i + .5) * CS - 5}" width="28" height="10" rx="5" fill="#b9a88f"/>' for i in range(6))
icon_body = (
    '<ellipse cx="262" cy="462" rx="190" ry="22" fill="#000" opacity=".22"/>'
    '<g transform="rotate(-5 256 270)"><g filter="url(#sh)"><rect x="92" y="118" width="356" height="356" rx="30" fill="#fffaf0"/></g>'
    + heads + grid + '</g>'
    '<g transform="translate(372 368) rotate(-38)" filter="url(#sh2)">'
    '<rect x="-15" y="60" width="30" height="96" rx="13" fill="#8a5a2e"/><rect x="-15" y="60" width="11" height="96" rx="5" fill="#b07a46"/>'
    '<circle r="70" fill="#dff4ff" opacity=".35"/><circle r="70" fill="none" stroke="#f2c14e" stroke-width="20"/>'
    '<path d="M-38-30A52 52 0 0 1 10-52" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".75"/></g>'
    "' + spark(440, 96, 1.1, '#fff6c8') + spark(66, 92, .8, '#fff') + spark(470, 250, .65, '#fff') + '"
)
icon = "{ bg: ['#4fc3b0', '#1d3c6e'], defs: '', body: '" + icon_body + "' }"

# ---------- sounds: sine tones, soft chimes and filtered pink noise; attacks of 3 ms or more, nothing harsh ----------
sfx = {
  'lgX':      "[() => { const d = buf(.2); tone(d, 0, 560, 470, .03, .025, .32, .003); wash(d, 0, .07, 1800, 1200, .08, .004, .02, 1.2, 'bp'); return d; }, .05, .22, 2]",
  'lgV':      "[() => { const d = buf(.55); tone(d, 0, 784, 784, 0, .05, .2, .003); bell(d, .035, 1174.7, .16, .22); return d; }, .15, .22, 1]",
  'lgClr':    "[() => { const d = buf(.22); tone(d, 0, 520, 380, .05, .03, .24, .003); return d; }, .04, .16, 1]",
  'lgTap':    "[() => { const d = buf(.1); tone(d, 0, 1150, 1000, .012, .015, .22, .003); return d; }, .02, .11, 1]",
  'lgStrike': "[() => { const d = buf(.36); wash(d, 0, .24, 900, 2600, .45, .03, .06, 1.4, 'bp'); tone(d, 0, 330, 300, .05, .04, .12, .004); return d; }, .05, .18, 2]",
  'lgHint':   "[() => { const d = buf(.9); bell(d, 0, 1174.7, .22, .35); bell(d, .12, 1568, .2, .4); return d; }, .3, .24, 1]",
  'lgUndo':   "[() => { const d = buf(.36); tone(d, 0, 820, 560, .1, .06, .26, .004, .15); return d; }, .08, .2, 1]",
  'lgNew':    "[() => { const d = buf(1.1); [523.3, 659.3, 784].forEach((f, i) => bell(d, i * .07, f, .2, .4)); wash(d, 0, .5, 600, 2400, .05, .1, .15, 1.2, 'bp'); return d; }, .3, .24, 1]",
  'lgWin':    ("[() => { const d = buf(3); [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => bell(d, i * .1, f, .24, .7)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .5, f, f, 0, 1, .11, .06, .3)); "
               "bell(d, .55, 1568, .2, 1.2); bell(d, .62, 2093, .14, 1); wash(d, .45, 1.6, 3000, 5200, .03, .2, .5, 2, 'bp'); return d; }, .45, .44, 1]"),
}
track = '''    // Logigram: calm and thoughtful (triangle pad, rhodes, a bell melody, deep sub bass, a whisper of shaker; original)
    lg: { bpm: 74, bars: 8, seed: 2718, swing: .06, rev: 3, revAmt: .4, fn(a) {
      const K = 60, ch = [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, 's4'], [0, 'add9'], [4, 'm7'], [2, 'm7'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 62);
        a.pad(a.at(b), cm, a.bar, .38, { cut: 950, vol: .08, a: 1, r: 1.6, wave: 'triangle' });
        a.bass(a.at(b), K - 24 + r, a.bar * .9, .36, 'sub');
        [[0, 0], [4, 1], [8, 2], [12, 1]].forEach(([s, k]) => a.rhodes(a.at(b, s), cm[k % cm.length], a.st * 3.5, s ? .08 : .12, s % 8 ? .3 : -.3));
        if (b % 2) a.shaker(a.at(b, 10), .05, .3);
      });
      melody(a, { chords: ch, root: K + 12, scale: 'major', lo: 72, hi: 86, rhythm: 'slow', rest: .22 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .13, n.m % 2 ? .25 : -.25, 2, 'lgb'));
    } },'''

g = {
 'id': 'lg', 'tile': 'Lg', 'mod': 'Logigram', 'bar': '#142335', 'statsKey': 'lg.stats', 'music': 'lg',
 'tileHtml': '''    <button class="tile" id="tileLg">
      <div class="art"><img class="tile-img" id="artLg" alt=""></div>
      <div>
        <h2>Logigram</h2>
        <p>Puzzel met aanwijzingen uit wat bij wie hoort</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': src('screen.html'),
 'modalHtml': src('modals.html'),
 'css': src('style.css'),
 'js': js,
 'gamesEntry': "  { id: 'lg', label: 'Logigram', emoji: '🔎', bg: ['#4fc3b0', '#1d3c6e'], enter: () => Logigram.enter(), tile: 'tileLg' },\n",
 'statRow': "['lg', `${S.lg.won || 0} logigrammen opgelost · ${S.lg.noHint || 0} zonder hint${S.lg.dailyWon ? ' · ' + S.lg.dailyWon + ' dagpuzzels' : ''}${S.lg.best && S.lg.best.expert != null ? ' · expert in ' + Math.floor(S.lg.best.expert / 60) + ':' + String(S.lg.best.expert % 60).padStart(2, '0') : ''}`]",
 'wipe': ['lg.stats', 'lg.save', 'lg.settings'],
 'trophies': ("    ['lg1', '🔎', 'Speurneus', 'Los je eerste logigram op', S => (S.lg.won || 0) >= 1],\n"
              "    ['lg2', '🧠', 'Zonder spieken', 'Los een moeilijk logigram op zonder hints', S => (S.lg.hardNoHint || 0) >= 1],\n"
              "    ['lg3', '🎓', 'Meesterbrein', 'Los een logigram op Expert op', S => (S.lg.expert || 0) >= 1],\n"
              "    ['lg4', '📅', 'Dagelijkse denker', 'Los 7 puzzels van de dag op in Logigram', S => (S.lg.dailyWon || 0) >= 7],\n"
              "    ['lg5', '⚡', 'Bliksemdenker', 'Los een normaal logigram op binnen 3 minuten', S => !!(S.lg.best && S.lg.best.normaal != null && S.lg.best.normaal <= 180)],\n"
              "    ['lg6', '🏅', 'Logicus', 'Los 50 logigrammen op', S => (S.lg.won || 0) >= 50],"),
 'track': track,
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('lg.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('lg.json'))
