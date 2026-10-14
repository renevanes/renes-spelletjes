#!/usr/bin/env python3
"""Replace the game "De Drie Kabouters" (id kb) in the app's index.html with version 2.

Usage:  INDEX=/path/to/index.html python3 newgames/kb2install.py

Builds the package from newgames/kb2/ (see kb2/build.py) and swaps, in place:
  - the #kb CSS block (up to the Sudoku CSS)
  - the screen HTML (DE DRIE KABOUTERS section) and the kbStartModal / kbEndModal dialogs
  - the Gnomes module JS (+ its tile click handler)
  - the kb* sound effects in Sfx, the kb menu icon in GameIcons
  - the kb trophies (kb1/kb8 kept meaning-compatible, kb9/kb10 added) and the kb stats row
The game id (kb), tile (tileKb), storage keys (kb.settings / kb.progress), music track (kb),
LEAVE / MODAL_GAME / SCREEN_GAME entries are unchanged. Every anchor must be found exactly once,
otherwise nothing is written. Running it again on an already upgraded file re-installs v2 (same result).
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'kb2'))
import build as kb2build

F = os.environ.get('INDEX')
if not F:
    sys.exit('set INDEX=/path/to/index.html')

def once(s, needle, what):
    n = s.count(needle)
    if n != 1:
        raise SystemExit(f'ANCHOR ERROR [{what}]: {needle[:70]!r} found {n}x (expected exactly 1) - nothing written')
    return s.index(needle)

def swap_between(s, start, end, new, what, include_end=False):
    i = once(s, start, what + ' start'); j = once(s, end, what + ' end')
    if j <= i: raise SystemExit(f'ANCHOR ERROR [{what}]: end before start - nothing written')
    if include_end: j += len(end)
    return s[:i] + new + s[j:]

def main():
    pkg = kb2build.build()
    s = open(F, encoding='utf-8').read()
    orig = s
    # 1) CSS
    s = swap_between(s, '#kb{background:', '#sd{background:', pkg['css'], 'css')
    # 2) screen + 3) modals
    s = swap_between(s, '<!-- ============ DE DRIE KABOUTERS ============ -->', '<!-- ============ SUDOKU ============ -->', pkg['screenHtml'], 'screen')
    s = swap_between(s, '<div class="modal" id="kbStartModal">', '<div class="modal" id="sdStartModal">', pkg['modalHtml'], 'modals')
    # 4) module JS: from its header comment up to and including the tile handler
    js_end = "$('#tileKb').addEventListener('click', () => Gnomes.enter());\n"
    once(s, 'const Gnomes = (() => {', 'module')
    i = once(s, js_end, 'module end')
    k = s.rindex('/* ================================================================\n   DE DRIE KABOUTERS', 0, i)
    if s.count('/* ================================================================\n   DE DRIE KABOUTERS') != 1: raise SystemExit('ANCHOR ERROR [module header] - nothing written')
    s = s[:k] + pkg['js'] + s[i + len(js_end):]
    # 5) sound effects: the contiguous block of "    kbXxx: [" lines inside Sfx's table
    lines = s.split('\n')
    idx = [n for n, l in enumerate(lines) if re.match(r'^    kb[A-Z]\w*: \[', l)]
    if not idx or idx != list(range(idx[0], idx[-1] + 1)):
        raise SystemExit(f'ANCHOR ERROR [sfx]: kb sound lines not found as one block ({len(idx)} lines) - nothing written')
    lines[idx[0]:idx[-1] + 1] = pkg['sfx'].rstrip('\n').split('\n')
    s = '\n'.join(lines)
    # duck the music under the two big jingles
    if "'kbWin'" not in s.split('DUCK = new Set([', 1)[1].split(']);', 1)[0]:
        once(s, "'natLose']);", 'duck')
        s = s.replace("'natLose']);", "'natLose', 'kbWin', 'kbBossDie']);")
    # 6) icon
    s = swap_between(s, '    kb: { bg:', '    sd: { bg:', '    kb: ' + pkg['icon'] + ',\n', 'icon')
    # 7) trophies: contiguous "    ['kb..." lines
    lines = s.split('\n')
    idx = [n for n, l in enumerate(lines) if l.startswith("    ['kb")]
    if not idx or idx != list(range(idx[0], idx[-1] + 1)):
        raise SystemExit(f'ANCHOR ERROR [trophies]: ({len(idx)} lines) - nothing written')
    lines[idx[0]:idx[-1] + 1] = pkg['trophies'].rstrip('\n').split('\n')
    s = '\n'.join(lines)
    # 8) stats row
    lines = s.split('\n')
    idx = [n for n, l in enumerate(lines) if l.startswith("      ['kb', `")]
    if len(idx) != 1: raise SystemExit(f'ANCHOR ERROR [stats row]: {len(idx)} - nothing written')
    lines[idx[0]] = pkg['statRow'].rstrip('\n')
    s = '\n'.join(lines)
    # 9) menu tile subtitle
    i = once(s, '<button class="tile" id="tileKb">', 'tile')
    j = s.index('</button>', i)
    tile = re.sub(r'<p>[^<]*</p>', pkg['tileText'], s[i:j], count=1)
    s = s[:i] + tile + s[j:]
    # sanity: integration points that must still be there
    for needle in ["kb: () => Gnomes.leave()", "{ id: 'kb', label: 'De Drie Kabouters'", "kb: 'kb'", "kb: ['kb.progress']", "Gnomes.hasSave()"]:
        if needle not in s: raise SystemExit(f'SANITY ERROR: {needle!r} missing - nothing written')
    if s == orig: print('no changes')
    open(F, 'w', encoding='utf-8').write(s)
    print(f'installed De Drie Kabouters v2 ({pkg["levels"]} levels) into {F}')

main()
