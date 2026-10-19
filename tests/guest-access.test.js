import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLearnerDestination, accountEntryHref, createLearnerReturn } from '../web/auth-return.js';
import { guestContent } from '../web/guest-view.js';
import { accountMarkup } from '../web/navigation-view.js';

test('learner destinations preserve section filters and reject external or privileged routes', () => {
  for (const path of ['/', '/web/medical.html?studyNow=20', '/web/library?view=notes&subject=anatomy', '/web/exam.html', '/web/medical.html#question-browser']) assert.equal(safeLearnerDestination(path), path);
  for (const path of ['https://evil.invalid/', '//evil.invalid', '/\\evil.invalid', '/web/admin.html', '/web/account.html', '/oauth/consent', '/web/library.html?access_token=secret', '/web/library/../admin.html', '/web/library.html#access_token=secret']) assert.equal(safeLearnerDestination(path), null, path);
  assert.equal(new URL(accountEntryHref('/web/library.html?view=notes&subject=anatomy'), 'https://test.invalid').searchParams.get('returnTo'), '/web/library.html?view=notes&subject=anatomy');
});

test('same-tab auth return survives provider callback, expires, and is cleared by plain account visits', () => {
  const map = new Map(); const storage = { getItem: k => map.get(k), setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) };
  let now = 10000000; const intent = createLearnerReturn({storage, now:()=>now});
  intent.capture('?returnTo=%2Fweb%2Flibrary.html%3Fview%3Dnotes', false);
  intent.capture('', true);
  assert.equal(intent.destination(''), '/web/library.html?view=notes');
  intent.clear(); assert.equal(intent.destination(''), '/');
  intent.capture('?returnTo=%2Fweb%2Fexam.html', false); now += 31*60*1000;
  assert.equal(intent.destination(''), '/');
  intent.capture('?returnTo=%2Fweb%2Fexam.html', false); intent.capture('', false);
  assert.equal(intent.destination(''), '/');
  intent.capture('?returnTo=https%3A%2F%2Fevil.invalid', false); assert.equal(intent.destination(''), '/');
});

test('storage denial preserves explicit safe return and never blocks sign-in', () => {
  const storage={getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){throw Error('denied');}};
  const intent=createLearnerReturn({storage});
  assert.doesNotThrow(()=>intent.capture('?returnTo=%2Fweb%2Fexam.html',false));
  assert.equal(intent.destination('?returnTo=%2Fweb%2Fexam.html'), '/web/exam.html');
  assert.equal(intent.destination(''), '/');
});

test('guest sections provide clear sign-in and creation actions without error or technical copy', () => {
  for(const section of ['study','library','exams']) {
    const html=guestContent(section,'/web/library.html?view=notes');
    assert.match(html,/Sign in/);assert.match(html,/Create account/);assert.match(html,/reviewed and published/);
    assert.doesNotMatch(html,/Retry library|library-error|server-authoritative|server-side|Cloud account/);
  }
  const menu=accountMarkup({signedIn:false,currentHref:'/web/library.html?view=notes'});
  assert.match(menu,/class="mlos-signin"/);assert.match(menu,/Preferences/);
  assert.doesNotMatch(menu,/>Profile<|Account &amp; Security|data-signout/);
  assert.match(accountMarkup({signedIn:true}),/>Profile</);
});
