import { existsSync } from 'node:fs';
import { chromium, devices } from 'playwright';

export async function appBrowser() {
  return chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
}
export const appURL = 'file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname);
export const phone = devices['Pixel 7'];
export async function appPage(browser, options = {}) {
  const context = await browser.newContext({ ...phone, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    if (!localStorage.getItem('app.cfg')) localStorage.setItem('app.cfg', JSON.stringify({ seen: '9.99', mute: true }));
  });
  await page.goto(appURL);
  return { context, page, errors };
}
