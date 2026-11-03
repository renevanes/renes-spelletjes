"""Update a game that addgame.py already installed: replace each part of the old package with the new one.

Usage: python3 games/updategame.py OLD.json NEW.json      (INDEX=path/to/copy.html to update a copy)
OLD.json is the package as it was installed, e.g. `git show HEAD:games/zr.json > /tmp/zr-old.json`.
Every changed part (screen, dialogs, css, js, trophies, music, sounds, icon …) must occur exactly once in index.html.
"""
import json, os, sys

F = os.environ.get('INDEX', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'src', 'main', 'assets', 'index.html'))
SKIP = {'id', 'tile', 'mod', 'bar', 'statsKey', 'music', 'wipe'}   # identity fields: never change these in an update


def update(old, new):
    s = open(F, encoding='utf-8').read()
    assert old['id'] == new['id'], 'different games'
    n = 0

    def rep(a, b, what):
        nonlocal s, n
        if a == b:
            return
        c = s.count(a)
        assert c == 1, (what, c, a[:80])
        s = s.replace(a, b)
        n += 1

    for k, v in new.items():
        if k in SKIP:
            assert old.get(k) == v, 'identity field changed: ' + k
            continue
        if k == 'sfx':
            for name, code in v.items():
                if name in old['sfx']:
                    rep('    %s: %s,\n' % (name, old['sfx'][name]), '    %s: %s,\n' % (name, code), 'sfx ' + name)
                else:
                    rep("    // airhockey\n", "    %s: %s,\n    // airhockey\n" % (name, code), 'new sfx ' + name)
            continue
        assert k in old, 'new part (install it by hand): ' + k
        rep(old[k], v, k)
    open(F, 'w', encoding='utf-8').write(s)
    print('updated', new['id'], '(%d parts)' % n)


if __name__ == '__main__':
    update(json.load(open(sys.argv[1], encoding='utf-8')), json.load(open(sys.argv[2], encoding='utf-8')))
