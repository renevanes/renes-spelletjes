import base64, gzip, json, os
# Builds wq.js (the complete Wereldquiz module) from wqsrc/ and the package wq.json for addgame.py.
# Data (made by wqprep.sh): wqsrc/countries.json (country table), wqsrc/flags.json (optimised SVG flags),
# wqsrc/map.bin + wqsrc/mapinfo.json (packed Natural Earth outlines). Flags and map are stored gzip + base64 and
# unpacked (DecompressionStream) the first time the game is opened.
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open('wqsrc/' + f).read()
data = json.load(open('wqsrc/countries.json'))
mapinfo = json.load(open('wqsrc/mapinfo.json'))
flags = json.load(open('wqsrc/flags.json'))
gz = lambda b: base64.b64encode(gzip.compress(b, 9, mtime=0)).decode()
FLAGS = gz(json.dumps(flags, separators=(',', ':'), ensure_ascii=False).encode())
MAPBIN = gz(open('wqsrc/map.bin', 'rb').read())
NC = sum(1 for r in data['c'] if not r[8])

LICENCE = '''  /* Data sources and licences (see also the line in the start dialog)
     - Map: Natural Earth 1:10m admin-0 countries (public domain, naturalearthdata.com), via npm world-atlas
       (Copyright 2013-2019 Michael Bostock, ISC licence), simplified with mapshaper (MPL-2.0, only used to build).
       Crimea is drawn as part of Ukraine (UN General Assembly resolution 68/262).
     - Flags: npm flag-icons, Copyright (c) 2013 Panayiotis Lipiridis, MIT licence (the flag designs themselves are
       public domain); optimised with svgo.
     - Country names: npm i18n-iso-countries (Copyright (c) 2016 widdix GmbH, MIT licence), Dutch, corrected to common
       Dutch usage (Taalunie); capitals: npm countries-list (Copyright (c) 2014 Annexare Studio, MIT licence),
       converted to Dutch exonyms. Hand-checked.
     MIT licence (flag-icons, i18n-iso-countries, countries-list): Permission is hereby granted, free of charge, to any
     person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the
     Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
     distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
     furnished to do so, subject to the following conditions: The above copyright notice and this permission notice
     shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
     WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
     FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
     OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
     ISC licence (world-atlas): Permission to use, copy, modify, and/or distribute this software for any purpose with
     or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in
     all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES. */
'''

js = ('''/* ================================================================
   WERELDQUIZ – flags, capitals and countries on the map: ''' + str(NC) + ''' countries (193 UN members, Vatican City,
   Palestine, Kosovo) + a few territories in an optional extra set. Multiple choice or typing, a map to point at,
   an atlas, mastery per country and a daily quiz.
   ================================================================ */
const Wereldquiz = (() => {
''' + LICENCE + '''  const DATA = ''' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ''';
  const MAPINFO = ''' + json.dumps(mapinfo, separators=(',', ':'), ensure_ascii=False) + ''';
  const FLAGS = \'''' + FLAGS + '''\';
  const MAPBIN = \'''' + MAPBIN + '''\';
''' + src('core.js') + '\n' + src('map.js') + '\n' + src('ui.js') + '''})();
$('#tileWq').addEventListener('click', () => Wereldquiz.enter());
''')
open('wq.js', 'w').write(js)

# ---------- vector menu icon (512x512): a glossy globe with a little flag on a pin ----------
icon_body = (
    '<ellipse cx="250" cy="462" rx="170" ry="22" fill="#000" opacity=".22"/>'
    '<g filter="url(#sh)"><circle cx="246" cy="282" r="172" fill="url(#wqSea)"/></g>'
    '<clipPath id="wqClip"><circle cx="246" cy="282" r="172"/></clipPath>'
    '<g clip-path="url(#wqClip)">'
    '<g fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="4"><ellipse cx="246" cy="282" rx="80" ry="172"/><ellipse cx="246" cy="282" rx="150" ry="172"/><path d="M246 110V454M74 282H418M90 200H402M90 364H402"/></g>'
    # Europe, Africa, Asia, the Americas (stylised)
    '<g fill="url(#wqLand)" stroke="#2f7a3a" stroke-opacity=".35" stroke-width="3">'
    '<path d="M196 168C222 150 262 154 284 168C298 178 290 196 270 200C252 204 240 214 222 212C204 210 186 196 186 184C186 176 190 172 196 168Z"/>'
    '<path d="M206 236C236 224 280 232 296 262C310 290 296 312 288 338C280 368 262 400 246 404C234 404 228 380 222 356C216 334 196 318 188 296C180 272 184 246 206 236Z"/>'
    '<path d="M298 168C336 148 400 156 428 186C440 204 426 224 404 232C384 240 360 236 344 246C326 254 308 240 302 222C296 206 286 182 298 168Z"/>'
    '<path d="M360 300C378 292 404 298 410 318C414 336 398 350 380 348C364 346 350 330 352 316C353 308 355 303 360 300Z"/>'
    '<path d="M60 180C88 168 120 178 132 204C142 228 128 252 110 262C96 270 98 296 108 318C118 342 112 372 96 392C80 380 66 340 62 300C58 262 46 210 60 180Z"/>'
    '</g>'
    '<ellipse cx="190" cy="196" rx="120" ry="80" fill="url(#wqGloss)" transform="rotate(-28 190 196)"/>'
    '</g>'
    '<circle cx="246" cy="282" r="172" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="6"/>'
    # the flag on its pin, stuck into the globe
    '<g filter="url(#sh2)">'
    '<path d="M346 236L372 50" stroke="#7a5230" stroke-width="10" stroke-linecap="round"/>'
    '<clipPath id="wqFlg"><path d="M370 60C398 44 428 72 462 56L452 140C420 156 394 126 360 142Z"/></clipPath>'
    '<g clip-path="url(#wqFlg)"><rect x="350" y="30" width="130" height="58" fill="#e8343f"/><rect x="350" y="86" width="130" height="28" fill="#fff"/><rect x="350" y="112" width="130" height="60" fill="#2a5db8"/>'
    '<path d="M370 60C398 44 428 72 462 56L460 74C428 90 398 62 368 78Z" fill="#fff" opacity=".25"/></g>'
    '<circle cx="373" cy="46" r="11" fill="url(#wqKnob)"/>'
    '<circle cx="343" cy="246" r="13" fill="#ff4d3a" stroke="#fff" stroke-width="4"/>'
    '</g>'
    "' + spark(96, 104, 1.1, '#fff6c8') + spark(452, 400, .8, '#fff') + spark(66, 420, .6, '#fff') + '"
)
icon = ("{ bg: ['#3fa9e8', '#0f2f57'], defs: '<radialGradient id=\"wqSea\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#6fd0ff\"/><stop offset=\".55\" stop-color=\"#2a8fdb\"/><stop offset=\"1\" stop-color=\"#155aa8\"/></radialGradient>'"
        " + lg('wqLand', '#9ee37a', '#47b04f') + rg('wqKnob', '#fff2b0', '#d8961a') + '<radialGradient id=\"wqGloss\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".45\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/></radialGradient>',\n"
        "      body: '" + icon_body + "' }")

# ---------- sounds: sine chimes, soft sine tones, filtered pink noise; gentle attacks ----------
OK = [(523.3, 659.3), (587.3, 740.0), (659.3, 830.6), (784.0, 987.8), (880.0, 1108.7)]
sfx = {}
for i, (a, b) in enumerate(OK):
    sfx['wqOk%d' % (i + 1)] = "[() => { const d = buf(1); bell(d, 0, %s, .2, .28); bell(d, .085, %s, .25, .42); tone(d, 0, %s, %s, 0, .1, .05, .004); return d; }, .26, .3, 1]" % (a, b, a / 2, a / 2)
sfx.update({
  'wqBad': "[() => { const d = buf(.7); tone(d, 0, 311.1, 277.2, .16, .15, .24, .008, .2); tone(d, .13, 246.9, 220, .2, .2, .2, .01, .2); return d; }, .12, .3, 1]",
  'wqSel': "[() => { const d = buf(.2); tone(d, 0, 1318.5, 1174.7, .03, .022, .11, .002); return d; }, .06, .16, 2]",
  'wqTap': "[() => { const d = buf(.35); tone(d, 0, 520, 780, .05, .05, .2, .002, .2); wash(d, 0, .09, 1500, 900, .05, .002, .02, .8, 'bp'); return d; }, .08, .22, 2]",
  'wqCombo': "[() => { const d = buf(1.4); [784, 987.8, 1174.7, 1568].forEach((f, i) => bell(d, i * .06, f, .2, .45)); wash(d, .05, .7, 3000, 6000, .03, .1, .25, 1.5, 'bp'); return d; }, .35, .3, 1]",
  'wqEnd': "[() => { const d = buf(2.8); [[0, 523.3], [.14, 659.3], [.28, 784], [.42, 1046.5]].forEach(([t, f]) => bell(d, t, f, .24, .8)); [261.6, 329.6, 392, 523.3].forEach(f => tone(d, .55, f, f, 0, 1.1, .1, .05, .3)); bell(d, .6, 1568, .14, 1); return d; }, .45, .42, 1]",
  'wqTick': "[() => { const d = buf(.15); tone(d, 0, 1760, 1700, .01, .018, .14, .0015); return d; }, .02, .2, 1]",
  'wqTime': "[() => { const d = buf(1.4); tone(d, 0, 659.3, 659.3, 0, .3, .2, .006, .25); tone(d, .22, 523.3, 523.3, 0, .45, .2, .006, .25); return d; }, .25, .34, 1]",
})

credit = 'Kaart: Natural Earth (publiek domein) · Vlaggen: flag-icons (MIT) · Landnamen: i18n-iso-countries (MIT) · Hoofdsteden: countries-list (MIT), aangepast naar het Nederlands'

g = {
 'id': 'wq', 'tile': 'Wq', 'mod': 'Wereldquiz', 'bar': '#0f3556', 'statsKey': 'wq.stats', 'music': 'wq',
 'tileHtml': '''    <button class="tile" id="tileWq">
      <div class="art"><img class="tile-img" id="artWq" alt=""></div>
      <div>
        <h2>Wereldquiz</h2>
        <p>Vlaggen, hoofdsteden en landen op de kaart</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ WERELDQUIZ ============ -->
<section id="wq" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="wqBack" aria-label="Terug">‹</button>
    <div class="wq-head"><span id="wqTitle">Wereldquiz</span><span class="wq-pill" id="wqProg" hidden></span><span class="wq-pill" id="wqClock" hidden></span><span class="wq-pill" id="wqStreak" hidden></span><span class="wq-pill" id="wqScore" hidden></span></div>
    <button class="iconbtn" id="wqMenu" aria-label="Menu">☰</button>
  </div>
  <div id="wqBar"><i></i></div>
  <div id="wqMain">
    <div id="wqQ"></div>
    <div id="wqMapBox"><div class="wq-mapw" id="wqMapW"></div><div id="wqMapAsk"></div><div class="wq-zoom" id="wqZoom"><button data-z="in" aria-label="Inzoomen">+</button><button data-z="out" aria-label="Uitzoomen">−</button><button data-z="home" aria-label="Hele kaart">⌂</button></div></div>
    <div id="wqA"></div>
  </div>
  <div id="wqFb"></div>
  <div id="wqAtlas" class="wq-view">
    <div class="wq-chips" id="wqAtlasCont"></div>
    <input id="wqAtlasFind" type="search" placeholder="Zoek een land of hoofdstad…" autocomplete="off" spellcheck="false">
    <div class="wq-hostmap" id="wqAtlasMap"></div>
    <div id="wqAtlasCard"></div>
    <div id="wqAtlasList"></div>
  </div>
  <div id="wqProgV" class="wq-view">
    <div class="wq-chips" id="wqProgSkill"></div>
    <div class="wq-chips" id="wqProgCont"></div>
    <div class="wq-hostmap" id="wqProgMap"><div class="wq-legend"><span><i style="background:#d3dbe1"></i>nog niet</span><span><i style="background:#ff9a7a"></i>oefenen</span><span><i style="background:#c6e79c"></i>gekend</span><span><i style="background:#2fae62"></i>meester</span></div></div>
    <div id="wqProgHead"></div>
    <div class="wq-prest"><div class="wq-sec">Werelddelen</div><div id="wqProgBars"></div><div class="wq-sec">Bekers</div><div id="wqProgTro"></div></div>
  </div>
  <div id="wqIdle">🌍</div>
  <div id="wqLoad"><div><div class="wq-spin"></div><b>Laden…</b></div></div>
  <div id="wqConf"></div>
  <div id="wqToast"></div>
</section>
''',
 'modalHtml': '''<div class="modal" id="wqStartModal">
  <div class="sheet">
    <h3>🌍 Wereldquiz</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Hoe goed ken jij de wereld? Raad vlaggen en hoofdsteden, zoek landen op de kaart en word een echte wereldreiziger. Wat je fout hebt, komt later terug.</p>
    <div class="wq-cont" id="wqCont"></div>
    <div class="wq-modes" id="wqModes"></div>
    <button id="wqDaily"></button>
    <div class="wq-links"><button id="wqAtlasBtn">📖 Atlas</button><button id="wqProgBtn">📊 Voortgang</button></div>
    <div id="wqOpts"></div>
    <div id="wqSum"></div>
    <div class="stats" id="wqStats"></div>
    <p class="wq-credit">''' + credit + '''</p>
    <div class="row sticky-actions"><button class="btn" id="wqStartBack">Menu</button><button class="btn" id="wqResume" hidden>Verder</button><button class="btn primary" id="wqGo">Start ▶</button></div>
  </div>
</div>
<div class="modal center" id="wqEndModal">
  <div class="sheet">
    <div class="wq-stars" id="wqEndStars"></div>
    <h3 id="wqEndTitle"></h3>
    <div id="wqEndText"></div>
    <div class="row"><button class="btn" id="wqEndMenu">Menu</button><button class="btn" id="wqEndPractice">🔁 Oefen fouten</button><button class="btn primary" id="wqEndAgain">Nog een ▶</button></div>
  </div>
</div>''',
 'css': src('style.css'),
 'js': js,
 'gamesEntry': "  { id: 'wq', label: 'Wereldquiz', emoji: '🌍', bg: ['#3fa9e8', '#0f2f57'], enter: () => Wereldquiz.enter(), tile: 'tileWq' },\n",
 'statRow': "['wq', `${S.wq.played || 0} quizzen · ${S.wq.flags || 0} vlaggen, ${S.wq.caps || 0} hoofdsteden en ${S.wq.maps || 0} landen op de kaart gekend`]",
 'wipe': ['wq.stats', 'wq.save', 'wq.settings'],
 'trophies': ("    ['wq1', '🌍', 'Wereldreiziger', 'Speel een Wereldquiz helemaal uit', S => (S.wq.played || 0) >= 1],\n"
              "    ['wq2', '🏳️', 'Vlaggen van Europa', 'Ken in de Wereldquiz alle vlaggen van Europa', S => !!(S.wq.tr && S.wq.tr.fEU)],\n"
              "    ['wq3', '🔥', 'Twintig op rij', 'Geef in de Wereldquiz 20 goede antwoorden achter elkaar', S => (S.wq.bestStreak || 0) >= 20],\n"
              "    ['wq4', '🏛️', 'Hoofdstedenkenner', 'Ken alle hoofdsteden van een werelddeel', S => !!(S.wq.tr && S.wq.tr.cap)],\n"
              "    ['wq5', '🗺️', 'Kaartmeester', 'Ken 100 landen op de kaart', S => !!(S.wq.tr && S.wq.tr.map100)],\n"
              "    ['wq6', '📅', 'Dagelijkse reiziger', 'Speel 7 Dagquizzen in de Wereldquiz', S => (S.wq.dailyN || 0) >= 7],\n"
              "    ['wq7', '🌐', 'Vlaggenmeester', 'Ken alle " + str(NC) + " vlaggen van de wereld', S => !!(S.wq.tr && S.wq.tr.fAll)],"),
 'track': '''    // Wereldquiz: a calm journey (marimba, soft pad, upright bass, bell melody; original)
    wq: { bpm: 86, bars: 8, seed: 517, swing: .06, rev: 2.8, revAmt: .36, fn(a) {
      const K = 62, ch = [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M'], [0, 'M'], [4, 'm'], [5, 'M'], [7, 's4']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + r, q, 64);
        a.pad(a.at(b), cm, a.bar, .4, { cut: 1300, vol: .08, a: .8, r: 1.4 });
        a.bass(a.at(b), K - 24 + r, a.beat * 1.6, .45, 'upright'); a.bass(a.at(b, 8), K - 24 + r + 7, a.beat * 1.2, .35, 'upright');
        [0, 3, 6, 10, 12].forEach((s, k) => a.marimba(a.at(b, s), cm[k % cm.length] + 12, s ? .15 : .21, k % 2 ? .35 : -.35));
        a.shaker(a.at(b, 4), .09, .3); a.shaker(a.at(b, 12), .09, .3);
      });
      melody(a, { chords: ch, root: K + 12, scale: 'major', lo: 74, hi: 86, rhythm: 'even', rest: .25 }).forEach(n => a.bell(a.at(n.b, n.s), n.m, .16, n.m % 2 ? .25 : -.25, 1.5, 'wqb'));
    } },''',
 'sfx': sfx,
 'icon': icon,
}
json.dump(g, open('wq.json', 'w'), ensure_ascii=False)
print('ok js', len(js), 'json', os.path.getsize('wq.json'), 'flags b64', len(FLAGS), 'map b64', len(MAPBIN))
