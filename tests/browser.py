"""Browser regression checks. Run against `npm run preview` after `npm run build`.

Requires Python Playwright and its Chromium browser. No external requests or submissions.
"""
import json
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('GAMES_PREVIEW_URL', 'http://127.0.0.1:8765')


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL)
        page.wait_for_timeout(850)
        assert page.locator('#menu .tile:visible').count() == 20
        assert 'maximum-scale' not in page.locator('meta[name=viewport]').get_attribute('content')
        assert page.locator('#menu img').evaluate_all('(els)=>els.every(el=>el.complete&&el.naturalWidth>0)')
        page.locator('#gameSearch').fill('risk')
        assert page.locator('#menu .tile:visible').count() == 1
        page.locator('#clearGameSearch').click()
        page.locator('[data-category="multiplayer"]').click()
        assert page.locator('#menu .tile:visible').count() == 4
        page.locator('#resetGameFilters').click()
        page.locator('#chooseFavorites').click()
        page.locator('[data-favorite="risk"]').click()
        page.keyboard.press('Escape')
        page.wait_for_timeout(50)
        assert 'Risk' in page.locator('#favoritesRow').inner_text()
        assert page.evaluate('document.activeElement.id') == 'chooseFavorites'

        page.locator('#setBtn').click()
        page.wait_for_timeout(30)
        assert page.evaluate('document.activeElement.closest(".modal")?.id') == 'setModal'
        page.keyboard.press('Shift+Tab')
        assert page.evaluate('document.activeElement.closest(".modal")?.id') == 'setModal'
        page.locator('#setModal [data-app="motion"]').get_by_text('Minder', exact=True).click()
        page.wait_for_timeout(30)
        assert 'reduced-motion' in page.locator('html').get_attribute('class')
        assert page.evaluate('document.activeElement.closest(".modal")?.id') == 'setModal'
        page.keyboard.press('Escape')
        page.wait_for_timeout(30)
        assert page.evaluate('document.activeElement.id') == 'setBtn'

        before = page.evaluate('JSON.stringify(localStorage)')
        page.evaluate('async()=>{await window.onBackupLoaded(JSON.stringify({format:"renes-spelletjes-backup",data:null}));}')
        assert page.evaluate('JSON.stringify(localStorage)') == before
        assert page.locator('#menuToast').inner_text()
        page.evaluate('()=>{window.backupResult=window.onBackupLoaded(RenePersistence.createBackup(localStorage,"1.54"));}')
        page.wait_for_timeout(30)
        assert page.locator('#askModal.show').count() == 1
        page.locator('#askNo').click()
        page.evaluate('async()=>{await window.backupResult;}')
        assert page.evaluate('JSON.stringify(localStorage)') == before

        # Seed a valid saved game, then drive a human reinforcement, battle and occupation.
        fixture = page.evaluate('''()=>{
          const E=ReneRiskEngine,s=E.newGame([{name:"Rene",ai:false},{name:"Computer 1",ai:true},{name:"Computer 2",ai:true}],7);
          s.territories=s.territories.map(()=>({owner:0,armies:3}));
          s.territories[E.byId.nw]={owner:1,armies:1};
          s.territories[E.byId.eastaus]={owner:2,armies:1};
          s.territories[E.byId.alaska].armies=40;s.pool=3;
          localStorage.setItem("risk.save",JSON.stringify(s));return s;
        }''')
        page.reload()
        page.locator('#tileRisk').click()
        assert page.locator('#riskMap [data-country]').count() == 42
        page.locator('#riskFrom').select_option('0')
        page.locator('#riskAmount').fill('3')
        page.locator('#riskActionreinforce').click()
        page.locator('#riskActionadvance').click()
        page.locator('#riskTarget').select_option('1')
        for _ in range(20):
            if page.locator('#riskActionoccupy').count():
                break
            page.locator('#riskActionattack').click()
        assert page.locator('#riskActionoccupy').count() == 1
        page.locator('#riskActionoccupy').click()
        saved = page.evaluate('JSON.parse(localStorage.getItem("risk.save"))')
        assert saved['territories'][1]['owner'] == 0
        assert saved['territories'][0]['armies'] >= 1
        assert page.evaluate('ReneRiskEngine.validState(JSON.parse(localStorage.getItem("risk.save")))')
        page.locator('#riskHelp').click()
        page.wait_for_timeout(30)
        assert page.evaluate('document.activeElement.closest(".modal")?.id') == 'riskHelpModal'
        page.keyboard.press('Escape')
        page.wait_for_timeout(30)
        assert page.evaluate('document.activeElement.id') == 'riskHelp'
        page.locator('#riskBack').click()
        page.reload()
        page.locator('#tileRisk').click()
        assert page.evaluate('JSON.parse(localStorage.getItem("risk.save"))') == saved
        page.locator('#riskListTab').click()
        country = page.locator('#riskCountryList [data-country="0"]')
        country.focus()
        page.keyboard.press('Enter')
        assert page.evaluate('document.activeElement.dataset.country') == '0'

        # All old games still launch; the fixtures test covers their save schemas separately.
        page.locator('#riskBack').click()
        ids = page.locator('#menu .tile').evaluate_all('(els)=>els.map(el=>el.id)')
        for tile in ids:
            page.goto(URL)
            page.wait_for_timeout(100)
            page.locator('#'+tile).click()
            page.wait_for_timeout(60)
            assert page.locator('.screen.active').get_attribute('id') != 'menu', tile

        # Handoff hides local-player cards until the next person opens their turn.
        page.goto(URL)
        page.evaluate('''()=>{
          const s=ReneRiskEngine.newGame([{name:"Rene",ai:false},{name:"Alex",ai:false}],12);
          localStorage.setItem("risk.save",JSON.stringify(s));
        }''')
        page.reload()
        page.locator('#tileRisk').click()
        assert page.locator('#riskHandoffModal.show').count() == 1
        assert page.locator('#riskControls [data-card]').count() == 0
        page.locator('#riskBeginTurn').click()
        assert page.locator('#riskFrom').count() == 1

        # Small and large screens must not create horizontal document overflow.
        page.locator('#riskBack').click()
        for width in [320, 390, 768, 1280]:
            page.set_viewport_size({'width': width, 'height': 844})
            assert page.locator('#menu').evaluate('(el)=>el.scrollWidth<=el.clientWidth'), width
        assert not errors, errors
        context.close()

        # Failed persistence produces a visible warning instead of claiming successful storage.
        failure = browser.new_context()
        failure.add_init_script('''{
          const original=Storage.prototype.setItem;
          Storage.prototype.setItem=function(key,value){
            if(key==='risk.save')throw new DOMException('Storage full','QuotaExceededError');
            return original.call(this,key,value);
          };
        }''')
        page = failure.new_page()
        page.goto(URL)
        page.locator('#tileRisk').click()
        page.locator('#riskStart').click()
        assert page.locator('#saveWarning').is_visible()
        assert page.evaluate('localStorage.getItem("risk.save")') is None
        failure.close()
        browser.close()
        print('Browser checks passed: discovery, dialogs, backups, Risk combat/resume/local play, 20 launches, responsive menu and quota warnings.')


if __name__ == '__main__':
    run()
