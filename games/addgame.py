import json, sys, re
import os
F=os.environ.get('INDEX',os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'src', 'main', 'assets', 'index.html'))
def add(g):
    s=open(F).read()
    def rep(old,new,cnt=1):
        nonlocal s
        assert s.count(old)==cnt, (g['id'], s.count(old), old[:80]); s=s.replace(old,new)
    assert ("id=\"tile%s\"" % g['tile']) not in s, 'already added'
    # menu tile (before the closing of games grid: after the Zeeslag tile block)
    rep('  </div>\n  <div class="menu-links">', g['tileHtml'] + '  </div>\n  <div class="menu-links">')
    rep('<!-- ============ MODALS ============ -->', g['screenHtml'] + '\n<!-- ============ MODALS ============ -->')
    rep('<div class="modal" id="zsStartModal">', g['modalHtml'] + '\n<div class="modal" id="zsStartModal">')
    rep('</style>', g['css'] + '\n</style>', 1) if s.count('</style>')==1 else None
    if s.count('</style>')!=1:
        i = s.index('</style>'); s = s[:i] + g['css'] + '\n' + s[i:]
    rep("$('#tileZs').addEventListener('click', () => Zeeslag.enter());", "$('#tileZs').addEventListener('click', () => Zeeslag.enter());\n" + g['js'])
    rep("  { id: 'zs', label: 'Zeeslag', emoji: '⚓', bg: ['#2a6fb5', '#123d6b'], enter: () => Zeeslag.enter(), tile: 'tileZs' },",
        "  { id: 'zs', label: 'Zeeslag', emoji: '⚓', bg: ['#2a6fb5', '#123d6b'], enter: () => Zeeslag.enter(), tile: 'tileZs' },\n" + g['gamesEntry'])
    rep("const SCREEN_GAME = {", "const SCREEN_GAME = { %s: '%s'," % (g['id'], g['id']))
    rep("id === 'zs' ? '#0b2238' :", "id === 'zs' ? '#0b2238' : id === '%s' ? '%s' :" % (g['id'], g['bar']))
    # back button / leaving: register the game's leave() and its dialog prefix
    rep("ms: () => Mines.leave()", "ms: () => Mines.leave(), %s: () => %s.leave()" % (g["id"], g["mod"]))
    rep("const MODAL_GAME = { ", "const MODAL_GAME = { %s: '%s', " % (g['id'], g['id']))
    rep("const m = id.match(/^(", "const m = id.match(/^(%s|" % g['id'])
    # stats
    rep("zs = g('zs.stats')", "zs = g('zs.stats'), %s = g('%s')" % (g['id'], g['statsKey']))
    rep("    return { ps, ks, as, ts, pp, rd, zs,", "    return { ps, ks, as, ts, pp, rd, zs, %s," % g['id'])
    if '/*STATROWS*/' not in s:
        rep("% raak`]];", "% raak`],\n      /*STATROWS*/];")
    rep("/*STATROWS*/", g['statRow'] + ",\n      /*STATROWS*/")
    rep("zs: ['zs.stats', 'zs.save']", "zs: ['zs.stats', 'zs.save'], %s: %s" % (g['id'], json.dumps(g['wipe']).replace('"', "'")))
    rep("    ['all', '🎮', 'Alleskunner',", g['trophies'] + "\n    ['all', '🎮', 'Alleskunner',")
    s = s.replace("'Speel alle 7 spellen'", "`Speel alle ${GAMES.length} spellen`")
    rep("function refreshMenu() {", "function refreshMenu() { $('#tile%s').classList.toggle('has-save', %s.hasSave());" % (g['tile'], g['mod']))
    rep("const DEF = {", "const DEF = { %s: '%s'," % (g['id'], g['music']))
    rep("    // Card games: relaxed lounge jazz", g['track'] + "\n    // Card games: relaxed lounge jazz")
    if g.get('icon'):              # vector menu icon: JS object { bg: [c1, c2], defs: '...', body: '...' }
        rep("    app: { bg:", "    %s: %s,\n    app: { bg:" % (g['id'], g['icon']))
    for name, code in g.get('sfx', {}).items():
        rep("    // airhockey\n", "    %s: %s,\n    // airhockey\n" % (name, code))
    open(F,'w').write(s)
    print('added', g['id'])
if __name__ == '__main__':
    add(json.load(open(sys.argv[1])))
