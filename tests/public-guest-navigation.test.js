import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { navigationMarkup } from '../web/navigation-view.js';
import { safeLearnerDestination, accountEntryHref, createLearnerReturn } from '../web/auth-return.js';
import * as guest from '../web/guest-view.js';

test('signed-out visitors get public destinations instead of private workspace tools', () => {
  for(const phone of [false,true])for(const currentHref of ['/','/web/library.html?view=notes','/web/workspace?master=home&section=progress','/web/vault']){
    const html=navigationMarkup({signedIn:false,phone,currentHref});
    assert.match(html,/Explore Medretica/); assert.match(html,/How it works/); assert.match(html,/About/);
    assert.match(html,/Create account/); assert.match(html,/Preferences/); assert.match(html,/data-theme/);
    assert.doesNotMatch(html,/data-master=|data-workspace-menu=|data-pin=|role="search"|Past Runs|Mistake Review|Plans/);
  }
});

test('default sign-in navigation remains byte-for-byte identical across appearances and layouts', async () => {
  const cases=JSON.parse(await readFile(new URL('./fixtures/signin-navigation-baseline.json',import.meta.url),'utf8'));
  for(const row of cases)assert.equal(createHash('sha256').update(navigationMarkup(row.options)).digest('hex'),row.sha256);
});

test('signed-in learners and administrators retain workspace navigation',()=>{
  assert.match(navigationMarkup({signedIn:true,currentHref:'/'}),/data-master="study"/);
  assert.match(navigationMarkup({signedIn:true,isAdmin:true,currentHref:'/web/admin'}),/data-master="admin"/);
  assert.doesNotMatch(navigationMarkup({signedIn:false,isAdmin:true,currentHref:'/'}),/data-master="admin"/);
});

test('approved personal destinations survive sign-in and same-tab callback',()=>{
  const storage=new Map();
  const intent=createLearnerReturn({storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  for(const path of ['/web/vault.html?concept=fixture-concept','/web/vault','/web/workspace?master=home&section=progress','/web/workspace.html?master=study&section=mistakes','/web/workspace?master=exams&section=past']){
    assert.equal(safeLearnerDestination(path),path);
    const href=accountEntryHref(path);
    intent.capture(new URL(href,'https://test.invalid').search,false);intent.capture('',true);
    assert.equal(intent.destination(''),path);
  }
});

test('workspace returns reject unknown, duplicate, privileged and injected route parameters',()=>{
  for(const path of ['/web/workspace?master=admin&section=overview','/web/workspace?master=study&section=admin','/web/workspace?master=home&section=progress&master=admin','/web/workspace?master=home&section=progress&redirect=https://evil.invalid','/web/workspace?master=account&section=security','/web/vault?access_token=secret','//evil.invalid/web/vault'])assert.equal(safeLearnerDestination(path),null,path);
});

test('personal guest gates explain the selected tool and preserve sign-in and creation destinations',()=>{
  assert.equal(typeof guest.guestToolContent,'function');
  const html=guest.guestToolContent('progress','/web/workspace?master=home&section=progress');
  assert.match(html,/Continue to Progress/);assert.match(html,/Create account/);assert.match(html,/returnTo=/);
  const vault=guest.guestPage('vault','/web/vault?concept=fixture');
  assert.match(vault,/private notes/i);assert.doesNotMatch(vault,/Cloud account|learner-scoped|M06/);
});
