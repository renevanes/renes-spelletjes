import json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
js = open('bv.js').read()

SVG = {
    'L': '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    'R': '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    'D': '<svg viewBox="0 0 24 24"><path d="M5 9l7 7 7-7"/></svg>',
    'X': '<svg viewBox="0 0 24 24"><path d="M6 4l6 6 6-6M6 10.5l6 6 6-6"/><path d="M5 20.5h14"/></svg>',
    'CW': '<svg viewBox="0 0 24 24"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 3.8v5.4h-5.4"/></svg>',
    'CCW': '<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.2 3.8v5.4h5.4"/></svg>',
    'H': '<svg viewBox="0 0 24 24"><path d="M5 8h13l-3.5-3.5M19 16H6l3.5 3.5"/></svg>',
}

icon = r'''(() => {
      const C = [['#ff8fa6', '#e3335c'], ['#9edcff', '#2b88dd'], ['#86f2d2', '#12a37b'], ['#ffd88a', '#ef8c10'], ['#c8b5ff', '#6a46e8'], ['#cdf28a', '#56a524'], ['#ffa6f1', '#c1389f']];
      const s = 66, ox = 58, oy = 58;
      const defs = C.map(([a, b], i) => lg('bvb' + i, a, b, 1, 1) + lg('bvf' + i, a, b)).join('')
        + '<linearGradient id="bvgl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        + '<linearGradient id="bvtr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".75"/></linearGradient>' + lg('bvpanel', '#1b1450', '#0b0828') + '<filter id="bvglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>';
      const blk = (c, r, k) => { const x = ox + c * s, y = oy + r * s; return `<g transform="translate(${x} ${y})"><rect x="2" y="2" width="${s - 4}" height="${s - 4}" rx="13" fill="url(#bvb${k})"/><path d="M2 15A13 13 0 0 1 15 2H51A13 13 0 0 1 64 15L54 12H12Z" fill="#fff" opacity=".35"/><rect x="11" y="11" width="${s - 22}" height="${s - 22}" rx="8" fill="url(#bvf${k})"/><rect x="11" y="11" width="${s - 22}" height="${(s - 22) / 2}" rx="8" fill="url(#bvgl)" opacity=".8"/><circle cx="19" cy="19" r="3.5" fill="#fff" opacity=".9"/><rect x="2" y="2" width="${s - 4}" height="${s - 4}" rx="13" fill="none" stroke="#120830" stroke-opacity=".45" stroke-width="2.5"/></g>`; };
      const ghost = (c, r) => `<rect x="${ox + c * s + 5}" y="${oy + r * s + 5}" width="${s - 10}" height="${s - 10}" rx="11" fill="#86f2d2" fill-opacity=".2" stroke="#b4ffe9" stroke-opacity="1" stroke-width="4.5" stroke-dasharray="10 7"/>`;
      const stack = [[0, 3, 6], [1, 3, 6], [5, 3, 3], [0, 4, 1], [1, 4, 1], [2, 4, 0], [4, 4, 5], [5, 4, 3], [0, 5, 4], [2, 5, 0], [3, 5, 0], [4, 5, 5], [5, 5, 5]];
      const fall = [[2, 0], [3, 0], [4, 0], [3, 1]];
      const body = `<rect x="${ox - 14}" y="${oy - 14}" width="${s * 6 + 28}" height="${s * 6 + 28}" rx="30" fill="url(#bvpanel)" opacity=".55"/>`
        + [2, 3, 4].map(c => `<rect x="${ox + c * s + s / 2 - (c === 3 ? 4 : 3)}" y="${oy - 52}" width="${c === 3 ? 8 : 6}" height="44" rx="3" fill="url(#bvtr)"/>`).join('')
        + [[2, 3], [3, 3], [4, 3], [3, 4]].map(([c, r]) => ghost(c, r)).join('')
        + `<g filter="url(#sh)">${stack.map(([c, r, k]) => blk(c, r, k)).join('')}</g>`
        + `<g opacity=".6" filter="url(#bvglow)">${fall.map(([c, r]) => `<rect x="${ox + c * s}" y="${oy + r * s}" width="${s}" height="${s}" rx="14" fill="#5ff0c8"/>`).join('')}</g>`
        + `<g filter="url(#sh)">${fall.map(([c, r]) => blk(c, r, 2)).join('')}</g>`
        + spark(410, 150, 1.5) + spark(96, 200, 1) + spark(440, 238, .8);
      return { bg: ['#7a5cff', '#1a0f52'], defs, body };
    })()'''

g = {
 'id': 'bv', 'tile': 'Bv', 'mod': 'Blokval', 'bar': '#141133', 'statsKey': 'bv.stats', 'music': 'bv',
 'tileHtml': '''    <button class="tile" id="tileBv">
      <div class="art"><img class="tile-img" id="artBv" alt=""></div>
      <div>
        <h2>Blokval</h2>
        <p>Laat de blokjes vallen en maak volle rijen</p>
      </div>
      <span class="badge">Doorgaan</span>
    </button>
''',
 'screenHtml': '''<!-- ============ BLOKVAL ============ -->
<section id="bv" class="screen">
  <div class="topbar">
    <button class="iconbtn" id="bvBack" aria-label="Terug">‹</button>
    <div class="bv-title"><b id="bvMode">Klassiek</b><small id="bvBest"></small></div>
    <button class="iconbtn" id="bvPause" aria-label="Pauze"><svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.3"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.3"/></svg></button>
    <button class="iconbtn" id="bvMenu" aria-label="Spelmenu">☰</button>
  </div>
  <div id="bvWrap"><canvas id="bvCanvas"></canvas>
    <div id="bvPad">
      <div class="bv-grp bv-l"><button data-a="L" aria-label="Links">%(L)s</button><button data-a="R" aria-label="Rechts">%(R)s</button><button data-a="D" class="w" aria-label="Sneller vallen">%(D)s</button></div>
      <button data-a="H" class="bv-hold" aria-label="Bewaren">%(H)s<small>Bewaar</small></button>
      <div class="bv-grp bv-r"><button data-a="CCW" aria-label="Linksom draaien">%(CCW)s</button><button data-a="CW" aria-label="Rechtsom draaien">%(CW)s</button><button data-a="X" class="w" aria-label="Laten vallen">%(X)s</button></div>
    </div>
  </div>
</section>
''' % SVG,
 'modalHtml': '''<div class="modal" id="bvStartModal">
  <div class="sheet">
    <h3>🧱 Blokval</h3>
    <p class="note" style="color:var(--muted);margin-top:0">Laat de vallende blokjes passend in elkaar zakken. Een volle rij verdwijnt en levert punten op; vier rijen tegelijk is het mooist. Elke 10 regels gaat het een niveau sneller.</p>
    <div class="bv-help" id="bvHelp"></div>
    <div class="ms-levels" id="bvModes"></div>
    <div id="bvOptList"></div>
    <div class="stats" id="bvStats"></div>
    <div class="row sticky-actions"><button class="btn" id="bvStartBack">Menu</button><button class="btn" id="bvResume" hidden>Verder</button><button class="btn primary" id="bvGo">Nieuw spel ▶</button></div>
  </div>
</div>
<div class="modal center" id="bvPauseModal">
  <div class="sheet">
    <h3>Pauze</h3>
    <p id="bvPauseInfo"></p>
    <div id="bvPauseOpts" style="text-align:left"></div>
    <div class="row"><button class="btn" id="bvPauseMenu">Menu</button><button class="btn" id="bvPauseRestart">Opnieuw</button><button class="btn primary" id="bvPauseGo">Verder</button></div>
  </div>
</div>
<div class="modal center" id="bvEndModal">
  <div class="sheet">
    <div class="big-emoji" id="bvEndEmoji">🧱</div>
    <h3 id="bvEndTitle"></h3>
    <p id="bvEndText"></p>
    <div class="row"><button class="btn" id="bvEndMenu">Andere modus</button><button class="btn primary" id="bvEndNew">Nog een ▶</button></div>
  </div>
</div>''',
 'css': '''#bv{background:#0b0a22}
#bv .topbar{background:#141133;gap:4px}
.bv-title{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;line-height:1.2;white-space:nowrap}
.bv-title b{font-size:16px} .bv-title small{font-size:12px;color:#a9a3e0;font-variant-numeric:tabular-nums}
#bvPause svg{width:20px;height:20px;fill:currentColor}
#bvWrap{position:relative;flex:1;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
#bvCanvas{position:absolute;left:0;top:0;display:block;touch-action:none}
#bvPad{--b:min(64px,16.5vw);position:absolute;left:0;right:0;bottom:0;display:none;align-items:flex-end;justify-content:space-between;gap:8px;padding:6px 12px 12px;pointer-events:none}
#bv.btns #bvPad{display:flex}
.bv-grp{display:grid;grid-template-columns:repeat(2,var(--b));grid-auto-rows:calc(var(--b) * .86);gap:8px}
.bv-grp .w{grid-column:span 2}
#bvPad button{pointer-events:auto;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.17),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.16);box-shadow:0 4px 12px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.15);color:#fff;display:flex;align-items:center;justify-content:center;touch-action:none;-webkit-tap-highlight-color:transparent;transition:transform .06s}
#bvPad button svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
#bvPad button.on{background:linear-gradient(180deg,rgba(170,150,255,.6),rgba(120,95,255,.4));transform:scale(.95)}
#bvPad .bv-hold{width:var(--b);height:var(--b);border-radius:50%;flex-direction:column;gap:1px;font-size:10px;font-weight:700;color:#d8d2ff;align-self:center;margin-bottom:calc(var(--b) * .3)}
#bvPad .bv-hold svg{width:22px;height:22px}
#bvWrap.land #bvPad{top:0;align-items:center;padding:10px 14px}
#bvWrap.land #bvPad .bv-hold{position:absolute;left:14px;top:12px;margin:0}
.bv-help{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 4px}
.bv-help span{background:rgba(255,255,255,.08);border-radius:99px;padding:5px 10px;font-size:12px;color:var(--ink)}''',
 'js': js,
 'gamesEntry': "  { id: 'bv', label: 'Blokval', emoji: '🧱', bg: ['#7a5cff', '#1a0f52'], enter: () => Blokval.enter(), tile: 'tileBv' },\n",
 'statRow': "['bv', `${S.bv.played || 0} gespeeld · ${S.bv.lines || 0} regels${S.bv.best && S.bv.best.klassiek ? ' · record ' + S.bv.best.klassiek : ''}${S.bv.best && S.bv.best.sprint != null ? ' · 40 regels in ' + Math.floor(S.bv.best.sprint / 60) + ':' + String(Math.floor(S.bv.best.sprint % 60)).padStart(2, '0') : ''}`]",
 'wipe': ['bv.stats', 'bv.save'],
 'trophies': "    ['bv1', '🧱', 'Vierdubbel', 'Wis vier regels tegelijk in Blokval', S => (S.bv.quads || 0) >= 1],\n    ['bv2', '🚀', 'Hogesnelheidsbouwer', 'Haal niveau 10 in Blokval', S => (S.bv.maxLevel || 0) >= 10],",
 'track': '''    // Blokval: driving but friendly synth-pop
    bv: { bpm: 128, bars: 8, seed: 223, fn(a) {
      const K = 57, ch = [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M'], [0, 'm'], [5, 'm'], [8, 'M'], [7, 'M']];
      ch.forEach(([r, q], b) => {
        const cm = a.chord(K + 12 + r, q, 64), bm = K - 24 + r;
        for (let s = 0; s < 16; s += 4) a.kick(a.at(b, s), s ? .8 : 1);
        a.clap(a.at(b, 4), .55); a.clap(a.at(b, 12), .55);
        for (let s = 2; s < 16; s += 4) a.hat(a.at(b, s), .45, b % 2 === 1 && s === 14);
        for (let s = 0; s < 16; s += 2) a.bass(a.at(b, s), bm + (s % 4 === 2 ? 12 : 0), a.st * 1.5, s % 4 ? .75 : .95);
        for (let s = 0; s < 16; s++) a.pluck(a.at(b, s), cm[[0, 1, 2, 1][s % 4]] + (s >= 8 ? 12 : 0), a.st, s % 4 ? .26 : .4, s % 2 ? .4 : -.4, 'arp');
        a.pad(a.at(b), cm, a.bar, .5, { cut: 1500, vol: .08 });
      });
      melody(a, { chords: ch, root: K, scale: 'harm', lo: 69, hi: 84, rhythm: 'syncop', rest: .18 }).forEach(n => a.lead(a.at(n.b, n.s), n.m, n.len * a.st, .6, { wave: 'triangle', cut: 3000, vol: .2, vib: 10 }));
    } },''',
 'sfx': {
   'bvMove': "[() => { const d = buf(.05); chip(d, 0, 2300, 2100, .022, .1, 'tri', 6000); return d; }, 0, .1, 2]",
   'bvRotate': "[() => { const d = buf(.09); chip(d, 0, 1250, 1850, .045, .12, 'tri', 5000); sweep(d, 0, .05, 'bp', 2200, 4200, 2, .18, .004); return d; }, .02, .13, 2]",
   'bvLock': "[() => { const d = buf(.22); thud(d, 0, 190, .65, .03); chip(d, 0, 760, 620, .03, .07, 'tri', 2500); return d; }, .05, .26, 3]",
   'bvHard': "[() => { const d = buf(.45); sweep(d, 0, .07, 'bp', 3200, 900, 1.2, .45, .004); thud(d, .04, 105, 1, .06); grains(d, .05, .08, 6, 300, 1200, .14, .004, .015); return d; }, .1, .4, 2]",
   'bvHold': "[() => { const d = buf(.25); sweep(d, 0, .14, 'bp', 1400, 3200, 2, .45, .01); chip(d, .02, 880, 1320, .08, .12, 'tri', 4000); return d; }, .08, .24, 1]",
   'bvLine1': "[() => { const d = buf(.9); sweep(d, 0, .3, 'bp', 900, 4000, 1.5, .4, .02); [784, 1175].forEach((f, i) => bell(d, i * .05, f, .25, .45)); return d; }, .25, .32, 2]",
   'bvLine2': "[() => { const d = buf(1); sweep(d, 0, .35, 'bp', 800, 4500, 1.5, .45, .02); [784, 988, 1319].forEach((f, i) => bell(d, i * .05, f, .25, .5)); return d; }, .28, .34, 2]",
   'bvLine3': "[() => { const d = buf(1.2); sweep(d, 0, .4, 'bp', 700, 5000, 1.4, .5, .02); [659, 880, 1109, 1319].forEach((f, i) => bell(d, i * .05, f, .25, .55)); return d; }, .3, .36, 1]",
   'bvQuad': "[() => { const d = buf(2.2); drum(d, 0, 55, .9, .4, .4); sweep(d, 0, .8, 'bp', 400, 6500, 1.2, .55, .02); [523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => bell(d, .03 + i * .055, f, .22, .9)); brass(d, .02, 130.8, .55, .28, .7); brass(d, .02, 196, .55, .24, .7); brass(d, .02, 261.6, .55, .2, .7); return d; }, .4, .5, 1]",
   'bvSpin': "[() => { const d = buf(.9); sweep(d, 0, .3, 'bp', 600, 2600, 3, .45, .02); chip(d, .04, 880, 1760, .18, .18, 'tri', 5000); bell(d, .18, 1760, .2, .5); bell(d, .24, 2217, .15, .45); return d; }, .25, .34, 1]",
   'bvLevel': "[() => { const d = buf(1.2); [[0, 659.3], [.08, 784], [.16, 987.8], [.24, 1318.5]].forEach(([t, f]) => chip(d, t, f, f, .12, .28, 'tri', 5000)); bell(d, .32, 1975.5, .2, .6); return d; }, .3, .36, 1]",
   'bvOver': "[() => { const d = buf(1.8); chip(d, 0, 520, 130, 1.1, .38, 'sq', 1300); thud(d, 0, 70, .6, .3); sweep(d, 0, 1.2, 'lp', 2000, 150, .8, .45, .02); return d; }, .3, .4, 1]",
   'bvCount': "[() => { const d = buf(.2); chip(d, 0, 880, 880, .09, .25, 'tri', 4000); return d; }, .1, .22, 1]",
   'bvGo': "[() => { const d = buf(.45); chip(d, 0, 1318.5, 1318.5, .2, .25, 'tri', 5000); chip(d, 0, 1760, 1760, .2, .12, 'tri', 5000); return d; }, .2, .26, 1]",
 },
 'icon': icon,
}
json.dump(g, open('bv.json', 'w'), ensure_ascii=False)
print('ok', len(js))
