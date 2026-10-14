#!/usr/bin/env python3
"""Install/update the small shared helpers in the canonical single-file app.

The helpers are readable and independently testable under tools/lib/. This script
updates only its marked copies; the normal app build still uses index.html.
"""
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = Path(os.environ.get('INDEX', ROOT / 'app/src/main/assets/index.html'))
html = TARGET.read_text()


def replace(old, new):
    global html
    assert html.count(old) == 1, f'Expected one shared-shell anchor: {old[:70]!r}'
    html = html.replace(old, new, 1)


def embed(name, content, anchor, before=True):
    global html
    start, end = f'/* {name}_BEGIN */', f'/* {name}_END */'
    if name == 'APP_SUPPORT_HTML':
        start, end = f'<!-- {name}_BEGIN -->', f'<!-- {name}_END -->'
    block = f'{start}\n{content.rstrip()}\n{end}\n'
    if start in html:
        html = re.sub(re.escape(start) + r'.*?' + re.escape(end) + r'\n?', lambda _: block, html, count=1, flags=re.S)
    else:
        replace(anchor, block + anchor if before else anchor + '\n' + block)


lib = ROOT / 'tools/lib'
embed('APP_SUPPORT_CSS', (lib / 'enhancements.css').read_text(), '</style>')
embed('APP_SUPPORT_HTML', (lib / 'enhancements.html').read_text(), '<script>\n')
embed('APP_SUPPORT_JS', (lib / 'persistence.js').read_text() + '\n' + (lib / 'enhancements.js').read_text(), '<script>\n', before=False)

if "  const K = k => k.startsWith('app.')" in html:
    start = html.index('const store = (() => {')
    end = html.index('const APP_DEFAULTS', start)
    html = html[:start] + '''const store = (() => {
  // Accessing localStorage itself can throw when storage is disabled.
  let storage;
  try { storage = localStorage; }
  catch (_) { storage = { getItem() { return null; }, setItem() { throw new Error('Opslag is niet beschikbaar'); }, removeItem() {} }; }
  return RenePersistence.createStore(storage, ReneEnhancements.saveFailure, ReneEnhancements.saveRecovery);
})();
''' + html[end:]
    replace('maximum-scale=1, user-scalable=no, ', '')
    replace("theme: 'auto', text: 'normaal',", "theme: 'auto', motion: 'auto', colorblind: false, text: 'normaal',")
    replace("const Shell = (() => {", "const Shell = (() => {\n  let discovery = null;")
    replace("    document.documentElement.classList.toggle('big-text', appCfg.text === 'groot');", "    document.documentElement.classList.toggle('big-text', appCfg.text === 'groot');\n    ReneEnhancements.applyMotion(appCfg);")
    replace("    const p = currentProfile(); $('#profBtn').innerHTML = `<span>${esc(p.avatar)}</span>${esc(p.name)}`;", "    const p = currentProfile(); $('#profBtn').innerHTML = `<span>${esc(p.avatar)}</span>${esc(p.name)}`;\n    discovery?.render();")
    anchor = '      <div class="opt"><div class="opt-label">Menu</div>${seg(\'layout\''
    replace(anchor, '''      <div class="opt"><div class="opt-label">Beweging</div>${seg('motion', [['auto', 'Volg toestel'], ['reduce', 'Minder'], ['full', 'Normaal']])}<div class="hint">Minder menu-, venster- en kaartanimaties.</div></div>
      <div class="opt"><div class="opt-label">Kleurenhulp in alle kleurpuzzels</div>${seg('colorblind', [[false, 'Uit'], [true, 'Aan']])}<div class="hint">Symbolen in Bushalte, Kleurbuisjes en Bellenschieter. Na wijzigen wordt het menu opnieuw geopend.</div></div>
''' + anchor)
    replace("      if (k === 'update') native('setUpdateMode', appCfg.update);", "      if (k === 'colorblind') { store.setColorblind(appCfg.colorblind); reloadApp(350); }\n      if (k === 'update') native('setUpdateMode', appCfg.update);")
    start = html.index('  function backup() {')
    end = html.index('  window.onBackupSaved', start)
    html = html[:start] + '''  function backup() {
    let json;
    try { json = RenePersistence.createBackup(localStorage, APP_VERSION); }
    catch (_) { menuToast('Back-up maken is niet mogelijk: opslag is niet beschikbaar.', 3500); return; }
    const name = `renes-spelletjes-${today()}.json`;
    if (native('saveFile', name, json)) return;
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    menuToast('💾 Back-up gedownload', 1500);
  }
''' + html[end:]
    start = html.index('  window.onBackupLoaded = async text => {')
    end = html.index('\n  /* ---------- feedback', start)
    html = html[:start] + '''  window.onBackupLoaded = async text => {
    if (text == null) return;
    let backup;
    try { backup = RenePersistence.validateBackup(text, APP_VERSION); }
    catch (error) { menuToast(error.message, 3500); return; }
    if (!(await askConfirm('Back-up terugzetten?', `Back-up van ${new Date(backup.date).toLocaleString('nl-NL')} terugzetten? Alle huidige voortgang wordt vervangen.`, 'Terugzetten'))) return;
    window.__noSave = true;
    try { RenePersistence.restore(localStorage, backup.data); }
    catch (error) { window.__noSave = false; menuToast(error.message, 5000); return; }
    menuToast('✅ Back-up teruggezet', 1500); reloadApp(800);
  };
''' + html[end:]
    replace("    native('setUpdateMode', appCfg.update);\n    applyLook(); checkTrophies();", """    native('setUpdateMode', appCfg.update);
    discovery = ReneEnhancements.createDiscovery({games: GAMES, config: appCfg, storage: store, icon: gameIcon, open: window.openGame, modal: openModal, saveConfig: saveApp, refreshMenu: applyMenu});
    ReneEnhancements.initAccessibility(GAMES);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => ReneEnhancements.applyMotion(appCfg));
    applyLook(); checkTrophies();""")

TARGET.write_text(html)
print('Installed shared save, accessibility and menu helpers')
