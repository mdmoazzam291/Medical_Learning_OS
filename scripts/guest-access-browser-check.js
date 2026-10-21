import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid', email_confirmed_at: '2026-10-19T00:00:00Z', app_metadata: { providers: ['email'] } };
const token = { access_token:'synthetic-access', refresh_token:'synthetic-refresh', expires_at:2100000000, user };
const emptyLibrary = {contractId:'canonical-content-library-v1',concepts:[],notes:[],questions:[],links:[],masteryInference:false};
const errors=[];
let cases=0;
async function fixture(context, counters={}) {
  await context.route('**/*', async route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin) return route.continue();
    if(url.hostname!=='iyapppmeieqhflnzslao.supabase.co') return route.abort();
    const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/auth/v1/token')return reply(token);
    if(url.pathname==='/auth/v1/user')return reply(user);
    if(url.pathname==='/auth/v1/signup')return reply({user,session:null});
    if(url.pathname.endsWith('/content-library-api/library')){counters.libraryReads=(counters.libraryReads||0)+1;return reply(emptyLibrary);}
    if(url.pathname.endsWith('/me'))return reply({isAdmin:false,reviewKinds:[]});
    if(url.pathname.endsWith('/vault/concepts'))return reply({concepts:[],catalogVersion:null});
    if(url.pathname.endsWith('/progress'))return reply({attempts:0,correct:0});
    if(url.pathname.endsWith('/questions'))return reply({questions:[]});
    if(url.pathname.endsWith('/revision/due'))return reply({dueCount:0,unseenCount:0,items:[]});
    if(url.pathname.includes('/exam-simulator/'))return reply({ready:false,eligibleUniqueQuestions:0,requiredUniqueQuestions:180,shortage:180});
    return reply({error:'fixture_not_found'},404);
  });
}
async function emailSignIn(page){
 await page.locator('#signin-form input[name="email"]').fill(user.email);
 await page.locator('#signin-form input[name="password"]').fill('synthetic-password-123');
 await page.locator('#signin-form button').click();
}
try {
  for(const width of [320,390,820,1180,1440]){
    const context=await browser.newContext({viewport:{width,height:1000}});const counters={};await fixture(context,counters);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    for(const path of ['/web/medical.html','/web/library.html?view=notes&subject=anatomy','/web/exam.html']){
      await page.goto(origin+path);
      await page.locator('.guest-card').waitFor();
      assert.equal(await page.locator('main h1:visible').count(),1,path);
      assert.equal(await page.locator('.mlos-signin').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${path} overflows ${width}`);
      assert.equal(await page.getByRole('button',{name:'Retry library',exact:true}).count(),0);
      assert.doesNotMatch(await page.locator('main').innerText(),/server-authoritative|server-side scoring|Cloud account/);
      assert.equal(await page.locator('[data-public-policies] a[href="/web/privacy.html"]').count(),1);
      await page.getByLabel('Open public menu',{exact:true}).click();
      const menu=page.getByRole('navigation',{name:'Public menu',exact:true});
      assert.equal(await menu.getByRole('link',{name:'Profile',exact:true}).count(),0);
      assert.equal(await menu.getByRole('link',{name:'Preferences',exact:true}).isVisible(),true);
      await page.getByLabel('Open public menu',{exact:true}).click();
      if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/guest-${width}-${path.includes('library')?'library':path.includes('exam')?'exam':'study'}.png`,fullPage:true});}
      cases++;
    }
    assert.equal(counters.libraryReads||0,0,'guests must not request the private library API');
    await page.goto(origin+'/');
    await page.locator('.public-home').waitFor();
    if(width===820){const columns=await page.locator('.public-home .hero').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(columns,2,'tablet Home should use two columns');}
    await page.getByLabel('Open public menu',{exact:true}).click();
    await page.getByRole('navigation',{name:'Public menu',exact:true}).getByRole('link',{name:'Preferences',exact:true}).click();
    await page.getByRole('heading',{name:'Appearance and navigation',exact:true}).waitFor({timeout:3000});
    await page.getByLabel('Colour palette',{exact:true}).selectOption('lavender_precision');
    await page.getByLabel('Appearance',{exact:true}).selectOption('dark');
    assert.equal(await page.locator('html').getAttribute('data-palette'),'lavender_precision');
    assert.equal(await page.locator('html').getAttribute('data-appearance'),'dark');
    await page.reload();
    await page.getByRole('heading',{name:'Appearance and navigation',exact:true}).waitFor();
    assert.equal(await page.getByLabel('Appearance',{exact:true}).inputValue(),'dark');
    if(process.env.SCREENSHOT_DIR) await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/preferences-${width}-dark.png`,fullPage:true});
    await context.close();
  }
  for(const [path,callback] of [['/web/medical.html?studyNow=20',false],['/web/library.html?view=notes&subject=anatomy',false],['/web/exam.html',false],['/web/library.html?view=graph&subject=anatomy',true],['/web/workspace.html?master=home&section=progress',false],['/web/vault.html',true]]){
    const context=await browser.newContext({viewport:{width:390,height:844}});await fixture(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+path);await page.locator('.guest-card').waitFor();
    await page.locator('.guest-card').getByRole('link',{name:'Sign in',exact:false}).click();
    await page.waitForSelector('body.account-landing-active');
    assert.equal(new URL(page.url()).searchParams.get('returnTo'),path);
    if(callback)await page.goto(origin+'/web/account.html#access_token=synthetic-access&refresh_token=synthetic-refresh&expires_at=2100000000&type=signup');
    else await emailSignIn(page);
    await page.waitForURL(origin+path);
    if(path.includes('library')){await page.getByText('Search & filters',{exact:true}).click();await page.locator('.library-filters').waitFor();}
    assert.equal(await page.locator('.guest-card').count(),0);
    assert.equal(await page.locator('.mlos-public-header').count(),0);
    assert.ok(await page.locator('[data-master="study"]').count()>0);
    await context.close();cases++;
  }
  const context=await browser.newContext({viewport:{width:390,height:844}});await fixture(context);const page=await context.newPage();
  await page.goto(origin+'/web/exam.html');await page.locator('.guest-card').getByRole('link',{name:'Create account',exact:true}).click();
  await page.waitForSelector('body.account-landing-active');assert.equal(await page.locator('#signup-form').isVisible(),true);
  await page.locator('#signup-form input[name="email"]').fill(user.email);await page.locator('#signup-form input[name="password"]').fill('synthetic-password-123');await page.locator('#signup-form button').click();
  await page.getByRole('alert').filter({hasText:'check your inbox'}).waitFor();
  await context.close();
  assert.deepEqual(errors,[]);console.log(`Guest access checks passed: ${cases} viewport/return cases and direct registration; no real provider writes.`);
}finally{await browser.close();}
