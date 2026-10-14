#!/usr/bin/env python3
"""Builds the De Drie Kabouters (v2) package kb2.json from the sources in this folder.

  src/core.js  src/art.js  src/draw.js  src/ui.js   module body (inside the IIFE)
  levels.py                                         level maps + legend (validated here)
  style.css  screen.html  modals.html  sfx.js  icon.js
"""
import json, os, sys, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(HERE, f), encoding='utf-8').read()

def load_levels():
    spec = importlib.util.spec_from_file_location('kb2levels', os.path.join(HERE, 'levels.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m.LEVELS

BASE = set('.#X=H%&^~I<>$EMO123C*')
def validate(levels):
    for i, L in enumerate(levels):
        m, o = L['m'], L.get('o', {})
        w = len(m[0])
        for r, row in enumerate(m):
            assert len(row) == w, f'level {i + 1} row {r}: width {len(row)} != {w}'
            for c, ch in enumerate(row):
                assert ch in BASE or ch in o, f'level {i + 1} ({L["n"]}): unknown char {ch!r} at {c},{r}'
        s = ''.join(m)
        for ch in '123': assert s.count(ch) == 1, f'level {i + 1}: start {ch} x{s.count(ch)}'
        assert 'E' in s, f'level {i + 1}: no exit'
        for k in o:
            assert k not in BASE, f'level {i + 1}: legend char {k!r} clashes with a tile'
            assert k in s, f'level {i + 1}: legend char {k!r} unused'
        assert 0 <= L['w'] <= 4 and L.get('par', 0) > 0 and L.get('h'), f'level {i + 1}: meta'
    return levels

def build():
    levels = validate(load_levels())
    js_levels = json.dumps([{k: L[k] for k in ('n', 'w', 'h', 'par', 'm', 'o', 'bd') if k in L} for L in levels], ensure_ascii=False, separators=(',', ':'))
    body = rd('src/core.js').replace('/*LEVELS*/', js_levels, 1) + rd('src/art.js') + rd('src/draw.js') + rd('src/ui.js')
    js = ('/* ================================================================\n'
          '   DE DRIE KABOUTERS – original co-op puzzle platformer: switch between\n'
          '   Snel (jumps, head-butts), Sterk (hammer, slingshot, pushes crates) and\n'
          '   Schild (mushroom shield: blocks, glides, rides the wind, is a step),\n'
          '   share items and bring all three to the exit. 20 levels in 5 worlds.\n'
          '   ================================================================ */\n'
          'const Gnomes = (() => {\n' + body + '})();\n'
          "$('#tileKb').addEventListener('click', () => Gnomes.enter());\n")
    n = len(levels)
    pkg = {
        'css': rd('style.css').strip() + '\n',
        'screenHtml': rd('screen.html'),
        'modalHtml': rd('modals.html'),
        'js': js,
        'icon': rd('icon.js').strip(),
        'sfx': rd('sfx.js').rstrip('\n') + '\n',
        'trophies': (
            f"    ['kb1', '🍄', 'Samen sterk', 'Haal het eerste level van De Drie Kabouters', S => Object.keys(S.kb.best || {{}}).length >= 1 || (S.kb.legacy || 0) >= 1],\n"
            f"    ['kb8', '🏔️', 'De grote tocht', 'Haal alle {n} levels van De Drie Kabouters', S => Object.keys(S.kb.best || {{}}).length >= {n} || (S.kb.legacy || 0) >= 8],\n"
            f"    ['kb9', '💎', 'Schatzoeker', 'Verdien 30 sterren in De Drie Kabouters', S => Object.values(S.kb.stars || {{}}).reduce((a, b) => a + b, 0) >= 30],\n"
            f"    ['kb10', '🗿', 'Reuzenklus', 'Versla de Steenreus in De Drie Kabouters', S => (S.kb.best || {{}})[{n - 1}] != null],\n"),
        'statRow': f"      ['kb', `${{Object.keys(S.kb.best || {{}}).length}}/{n} levels · ${{Object.values(S.kb.stars || {{}}).reduce((a, b) => a + b, 0)}} ★`],\n",
        'tileText': '<p>Puzzel samen met Snel, Sterk en Schild</p>',
        'levels': n,
    }
    out = os.path.join(HERE, 'kb2.json')
    json.dump(pkg, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
    return pkg

if __name__ == '__main__':
    p = build()
    print('built kb2.json:', p['levels'], 'levels,', len(p['js']), 'bytes of JS')
