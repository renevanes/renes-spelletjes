#!/usr/bin/env python3
"""Build the original Wereldmacht package for games/addgame.py."""
import json
import os
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
src=ROOT/'rksrc'
read=lambda name:(src/name).read_text()
markup=read('markup.html')
cut=markup.index('<div id="rkStartModal"')
js=read('core.js')+'\nwindow.ReneWereldMap = '+read('map.json').strip()+';\n'+read('map.js')+'\n'+read('ui.js')+'''\nconst Wereldmacht = window.ReneRisk.create({
  storage: store, config: appCfg, enter: () => show('rk'), isActive: () => current === 'rk',
  menu: () => { show('menu'); refreshMenu(); }, close: closeModals, modal: openModal,
  confirm: askConfirm, toast: menuToast, sfx: name => Sfx.play(name),
  music: predicate => Sfx.gate('rk', predicate), refreshSound: () => Sfx.refresh(),
});
$('#tileRk').addEventListener('click', () => window.openGame('rk'));
const rkPreviousBack = window.appBack;
window.appBack = () => {
  if (current === 'rk' && !document.querySelector('.modal.show,.overlay.show,#limitOverlay.show,#errOverlay.show') && Wereldmacht.dismiss()) return true;
  return rkPreviousBack();
};
'''
icon="{bg:['#79b7c9','#224a62'],defs:'<radialGradient id=\"rkglobe\"><stop stop-color=\"#9ed4d8\"/><stop offset=\"1\" stop-color=\"#468a9c\"/></radialGradient>',body:'<circle cx=\"256\" cy=\"265\" r=\"173\" fill=\"url(#rkglobe)\" stroke=\"#ffffffaa\" stroke-width=\"10\"/><g fill=\"none\" stroke=\"#fff6\" stroke-width=\"7\"><ellipse cx=\"256\" cy=\"265\" rx=\"84\" ry=\"173\"/><path d=\"M85 265H427M112 177H400M112 353H400\"/></g><g fill=\"#235866\" stroke=\"#def2d599\" stroke-width=\"4\"><path d=\"M114 183 160 133 209 146 213 189 178 210 165 261 143 246Z\"/><path d=\"M184 280 233 294 248 327 211 399 179 358Z\"/><path d=\"M267 194 305 168 351 198 394 185 422 264 376 280 343 242 314 282 277 265Z\"/><path d=\"M290 293 326 305 339 350 303 397 280 350Z\"/></g><path d=\"M139 97V175M367 317V402\" stroke=\"#fff\" stroke-width=\"5\"/><path d=\"M141 98 210 117 141 139ZM369 319 430 338 369 362Z\" fill=\"#f2c14e\"/>'}"
track='''    // Wereldmacht: original quiet strategy score, warm pads and slow bell phrases.
    rk: {bpm:62,bars:8,seed:1459,rev:3,revAmt:.35,fn(a){
      const roots=[50,55,57,53,50,58,55,50];
      roots.forEach((root,b)=>{
        const chord=a.chord(root+12,b===5?'M7':'m7',62);
        a.pad(a.at(b),chord,a.bar,.35,{cut:850,vol:.07,a:1,r:1.5});
        a.bass(a.at(b),root-12,a.bar*.9,.3,'sub');
        [0,6,12].forEach((step,k)=>a.bell(a.at(b,step),chord[k%chord.length]+12,.12,k===1?.2:-.2,1.5,'rk'));
      });
    }},'''
sfx={}
for name,notes in [('rkPlace',[660]),('rkDice',[392,440]),('rkCapture',[523,659,784]),('rkTrade',[587,740]),('rkWin',[523,659,784,1046])]:
 sfx[name]="[() => { const d=buf(1.5); "+json.dumps(notes)+".forEach((f,i)=>{tone(d,i*.075,f,f,0,.2,.17,.006,.1);bell(d,i*.075,f*2,.045,.28);});return d;},.22,.24,1]"
package={
 'id':'rk','tile':'Rk','mod':'Wereldmacht','bar':'#233544','statsKey':'rk.stats','music':'rk',
 'tileHtml':'    <button class="tile" id="tileRk"><div class="art"></div><div><h2>Wereldmacht</h2><p>Verover de wereld · tegen de computer of samen</p></div><span class="badge">Doorgaan</span></button>\n',
 'screenHtml':markup[:cut], 'modalHtml':markup[cut:], 'css':read('style.css'),'js':js,
 'gamesEntry':"  {id:'rk',label:'Wereldmacht',emoji:'🌍',bg:['#5e91a0','#203d50'],enter:()=>Wereldmacht.enter(),tile:'tileRk'},",
 'statRow':"      ['rk',`${S.rk.won||0} van ${S.rk.played||0} gewonnen` ]",
 'wipe':['rk.save','rk.stats','rk.settings'],
 'trophies':"    ['rk1','🌍','Wereldveroveraar','Win een spel Wereldmacht',S=>(S.rk.won||0)>=1],\n    ['rk2','🏆','Groot strateeg','Win vijf spellen Wereldmacht',S=>(S.rk.won||0)>=5],",
 'icon':icon,'track':track,'sfx':sfx,
}
# Keep only this game's marked blocks in sync when it is already installed.
target=Path(os.environ.get('INDEX', ROOT.parent/'app/src/main/assets/index.html'))
html=target.read_text() if target.exists() else ''
for field, tag, is_html in [('css','CSS',False),('js','JS',False),('screenHtml','SCREEN',True),('modalHtml','MODALS',True)]:
    start=f'<!-- RK_{tag}_BEGIN -->' if is_html else f'/* RK_{tag}_BEGIN */'
    end=f'<!-- RK_{tag}_END -->' if is_html else f'/* RK_{tag}_END */'
    content=package[field]
    block=f'{start}\n{content.rstrip()}\n{end}\n'
    if 'id="tileRk"' in html:
        if start in html:
            html=re.sub(re.escape(start)+r'.*?'+re.escape(end)+r'\n?',lambda _:block,html,count=1,flags=re.S)
        else:
            assert html.count(content)==1, f'Missing Wereldmacht block {field}'
            html=html.replace(content,block,1)
    package[field]=block
if 'id="tileRk"' in html:
    target.write_text(html)
(ROOT/'rk.js').write_text(package['js'])
(ROOT/'rk.json').write_text(json.dumps(package,ensure_ascii=False))
print('Built Wereldmacht package')
