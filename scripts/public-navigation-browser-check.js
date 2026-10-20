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
try {
  for (const width of [320,390,820,1180,1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/web/workspace.html?master=account&section=preferences');
    for (const palette of ['sage_precision','lavender_precision']) for (const appearance of ['light','dark']) {
      await page.getByLabel('Colour palette', {exact:true}).selectOption(palette);
      await page.getByLabel('Appearance', {exact:true}).selectOption(appearance);
      await page.goto(origin + '/');
      await page.locator('.mlos-public-header').waitFor();
      assert.equal(await page.locator('[data-workspace-menu], #mlos-global-search, #mlos-panel').count(),0);
      assert.ok(await page.locator('.mlos-signin').isVisible());
      assert.ok(await page.locator('.mlos-public-create').isVisible());
      assert.ok(await page.locator('[data-theme]').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), String(width));
      await page.getByLabel('Open public menu',{exact:true}).click();
      assert.ok(await page.getByRole('navigation',{name:'Public menu',exact:true}).getByRole('link',{name:'Preferences',exact:true}).isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'open menu overflows '+width);
      await page.keyboard.press('Escape');
      assert.ok(await page.getByLabel('Open public menu',{exact:true}).evaluate(node => node === document.activeElement));
      assert.equal(await page.locator('.mlos-public-menu').getAttribute('open'),null);
      for (const accountPath of ['/web/account.html','/web/account?mode=create']) {
        await page.goto(origin+accountPath);
        await page.locator('body.account-landing-active').waitFor();
        assert.equal(await page.locator('[data-master], [data-workspace-menu], #mlos-panel, #mlos-global-search, .mlos-signin, .mlos-public-create').count(),0);
        assert.equal(await page.locator('header:visible').count(),1);
        assert.ok(await page.locator('[data-theme]').isVisible());
        assert.equal(await page.locator('.account-product-story, .account-benefits, .account-device-stage').count(),3);
        assert.ok(await page.getByLabel('Keep me signed in',{exact:true}).isChecked());
        assert.equal(await page.locator('html').getAttribute('data-palette'),palette);
        assert.equal(await page.locator('html').getAttribute('data-appearance'),appearance);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if(accountPath.includes('create')) assert.ok(await page.locator('#signup-form').isVisible());
        else assert.ok(await page.locator('#signin-form').isVisible());
        checks++;
      }
      await page.goto(origin + '/web/workspace.html?master=account&section=preferences');
      checks++;
    }
    for (const destination of ['home:progress','home:recent','study:mistakes','study:revision','exams:dna','exams:past','exams:autopsy','exams:rules'].map(pair => { const [master,section]=pair.split(':'); return '/web/workspace.html?master='+master+'&section='+section; }).concat('/web/vault.html')) {
      await page.goto(origin+destination);
      await page.locator('.guest-card').waitFor();
      const href = await page.locator('.guest-card').getByRole('link',{name:'Sign in →',exact:true}).getAttribute('href');
      assert.equal(new URL(href,origin).searchParams.get('returnTo'),destination.replace('.html',''));
      checks++;
    }
    for (const anchor of ['explore','how-it-works','about']) {
      await page.goto(origin+'/web/services.html#'+anchor);
      await page.locator('.mlos-public-header').waitFor();
      assert.equal(await page.locator('header:visible').count(),1);
      assert.ok(await page.locator('#'+anchor).isVisible());
      // Enhanced policy pages keep one header for either authentication state.
      await page.evaluate(() => document.body.dataset.publicNavigation = 'false');
      assert.equal(await page.locator('header:visible').count(),1); checks++;
    }
    await page.goto(origin+'/web/account.html');
    await page.locator('#signin-form').waitFor();
    assert.equal(await page.locator('.mlos-public-header').count(),1);
    assert.equal(await page.locator('[data-master], [data-workspace-menu], #mlos-panel, #mlos-global-search, .mlos-signin, .mlos-public-create').count(),0);
    assert.equal(await page.locator('header:visible').count(),1);
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log(`Public navigation: ${checks} responsive/theme/destination checks passed.`);
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
  await rm(directory,{recursive:true,force:true});
}
