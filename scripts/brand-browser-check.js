import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from './build-pages.js';
import { publicFileSet } from './public-surface.js';
const engines = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const directory = await mkdtemp(join(tmpdir(), 'medretica-brand-browser-'));
await buildPages({ outputDirectory: directory });
const headers = Object.fromEntries((await readFile(join(directory, '_headers'), 'utf8')).split('\n').filter(l => /^\s+[^:]+:/.test(l)).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost'), path = url.pathname;
  // Cloudflare static assets redirect HTML page links to canonical clean URLs.
  if (path.endsWith('.html') && publicFileSet.has(path.slice(1))) {
    res.writeHead(308, { Location: path.slice(0, -5) + url.search }); return res.end();
  }
  const cleanFile = path.replace(/\/$/, '').slice(1) + '.html';
  const file = path === '/' ? 'web/index.html' : publicFileSet.has(path.slice(1)) ? path.slice(1) : publicFileSet.has(cleanFile) ? cleanFile : path.slice(1);
  if (!publicFileSet.has(file)) { res.writeHead(404); return res.end(); }
  try { res.writeHead(200, { ...headers, 'Content-Type': file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : 'text/javascript' }); res.end(await readFile(join(directory, file))); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;

const browser = await engines[process.env.BROWSER_ENGINE || 'chromium'].launch({ headless: true });
let checks = 0;
// Resolve colour-mix through canvas, then measure actual rendered colour contrast.
function brandPaint() {
  const mark = document.querySelector('.mlos-header .mlos-brand-mark');
  const base = getComputedStyle(mark, '::before'), fold = getComputedStyle(mark, '::after');
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const rgb = value => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
  const luminance = value => rgb(value).slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const root = getComputedStyle(document.documentElement), accent = root.getPropertyValue('--accent'), surface = root.getPropertyValue('--surface'), bg = root.getPropertyValue('--bg');
  return { main: rgb(base.backgroundColor), accent: rgb(accent), fold: rgb(fold.backgroundColor), baseMask: base.maskImage || base.webkitMaskImage, foldMask: fold.maskImage || fold.webkitMaskImage,
    contrast: Math.min(contrast(base.backgroundColor, surface), contrast(fold.backgroundColor, surface), contrast(base.backgroundColor, bg), contrast(fold.backgroundColor, bg)),
    grid: base.gridArea === fold.gridArea, width: mark.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth };
}
try {
  for (const width of [390, 820, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    // No real service calls or learner data; these are public local preferences.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
    for (const file of ['medretica-mark.svg', 'medretica-fold.svg', 'favicon.svg', 'apple-touch-icon.png']) {
      const response = await page.request.get(origin + '/web/' + file);
      assert.equal(response.status(), 200, file + ' must ship in the production bundle');
    }
    await page.goto(origin + '/web/workspace.html?master=account&section=preferences');
    for (const palette of ['sage_precision', 'lavender_precision']) for (const appearance of ['light', 'dark']) {
      await page.getByLabel('Colour palette', { exact: true }).selectOption(palette);
      await page.getByLabel('Appearance', { exact: true }).selectOption(appearance);
      for (const path of ['/web/account.html', '/', '/web/workspace.html?master=account&section=preferences']) {
        await page.goto(origin + path);
        await page.locator('.mlos-header .mlos-brand-mark').waitFor();
        const paint = await page.evaluate(brandPaint);
        assert.deepEqual(paint.main, paint.accent);
        assert.match(paint.baseMask, /medretica-mark\.svg/); assert.match(paint.foldMask, /medretica-fold\.svg/);
        assert.ok(paint.contrast >= 3, `${palette}/${appearance}/${width}: contrast ${paint.contrast}`);
        assert.ok(paint.grid && paint.width >= 26 && !paint.overflow);
        assert.equal(await page.locator('html').getAttribute('data-palette'), palette);
        assert.equal(await page.locator('html').getAttribute('data-appearance'), appearance);
        checks++;
      }
      if (process.env.SCREENSHOT_DIR) {
        await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/brand-${palette}-${appearance}-${width}.png` });
      }
    }
    // Both authenticated roles render the same theme-aware component; service auth is not exercised here.
    for (const isAdmin of [false, true]) {
      await page.evaluate(async admin => {
        const { navigationMarkup } = await import('/web/navigation-view.js');
        const prefs = JSON.parse(localStorage.getItem('mlos-navigation-v1'));
        document.getElementById('mlos-navigation').innerHTML = navigationMarkup({ master: admin ? 'admin' : 'home', section: '', prefs, isAdmin: admin, signedIn: true, phone: innerWidth <= 700 });
      }, isAdmin);
      const paint = await page.evaluate(brandPaint);
      assert.deepEqual(paint.main, paint.accent); assert.ok(paint.contrast >= 3); checks++;
    }
    assert.deepEqual(pageErrors, []);
    // A third palette is test-only: no new palette is exposed to users.
    await page.evaluate(() => {
      const root = document.documentElement; root.dataset.palette = 'future-fixture';
      root.style.setProperty('--accent', '#184D79'); root.style.setProperty('--surface', '#FFFFFF'); root.style.setProperty('--bg', '#F5F9FC');
    });
    const future = await page.evaluate(brandPaint);
    assert.deepEqual(future.main, [24, 77, 121, 255]); assert.ok(future.contrast >= 3); checks++;
    await page.emulateMedia({ forcedColors: 'active' });
    assert.equal(await page.locator('.mlos-brand-mark').first().evaluate(el => getComputedStyle(el, '::after').display), 'none'); checks++;
    await context.close();
  }
  console.log(`Brand checks passed: ${checks} palette/appearance/viewport/future/forced-colour cases`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
