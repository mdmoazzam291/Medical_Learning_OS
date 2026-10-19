import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserAuthStorage, createSupabaseAuth } from '../src/adapters/supabase-auth.js';
const key='mlos-supabase-auth-v1';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const provider=async url=>String(url).includes('/logout')?Response.json({}):Response.json({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_at:2100000000,user:{id:'fixture-user'}});
const authFor=storage=>createSupabaseAuth({projectUrl:'https://example-ref.supabase.co',publishableKey:'sb_publishable_test',storage,fetchFn:provider});

test('unchecked login stays in this tab across reload and refresh; a fresh tab is signed out', async()=>{
 const local=memory(),tab=memory();const storage=createBrowserAuthStorage({local:()=>local,session:()=>tab});const auth=authFor(storage);
 auth.setSessionPersistence(false);await auth.signIn('fixture@example.invalid','synthetic-password');
 assert.equal(local.getItem(key),null);assert.ok(tab.getItem(key));
 const reload=authFor(createBrowserAuthStorage({local:()=>local,session:()=>tab}));
 assert.equal(reload.currentUser().id,'fixture-user');await reload.getSession({forceRefresh:true});assert.equal(local.getItem(key),null);
 assert.equal(authFor(createBrowserAuthStorage({local:()=>local,session:()=>memory()})).currentUser(),null);
 await reload.signOut();assert.equal(tab.getItem(key),null);assert.equal(local.getItem(key),null);
});

test('checked login persists across fresh tabs and replacing a tab-only login clears the tab token', async()=>{
 const local=memory(),tab=memory(),storage=createBrowserAuthStorage({local:()=>local,session:()=>tab}),auth=authFor(storage);
 auth.setSessionPersistence(false);await auth.signIn('fixture@example.invalid','synthetic-password');
 auth.setSessionPersistence(true);await auth.signIn('fixture@example.invalid','synthetic-password');
 assert.ok(local.getItem(key));assert.equal(tab.getItem(key),null);
 assert.equal(authFor(createBrowserAuthStorage({local:()=>local,session:()=>memory()})).currentUser().id,'fixture-user');
 await auth.signOut();assert.equal(local.getItem(key),null);assert.equal(tab.getItem(key),null);
});

test('tab-only callback replaces persistent credentials and is shared by independent auth clients in this tab', async()=>{
 const local=memory(),tab=memory(),auth=authFor(createBrowserAuthStorage({local:()=>local,session:()=>tab}));
 await auth.signIn('fixture@example.invalid','synthetic-password');
 auth.setSessionPersistence(false);
 const callback=authFor(createBrowserAuthStorage({local:()=>local,session:()=>tab}));
 await callback.consumeImplicitRedirect('https://medretica.com/web/account.html#access_token=callback&refresh_token=refresh&expires_at=2100000000');
 assert.equal(local.getItem(key),null);assert.ok(tab.getItem(key));
 assert.equal(auth.currentUser().id,'fixture-user');
});

test('blocked tab storage fails tab-only selection without preventing ordinary persistent login', async()=>{
 const local=memory(),storage=createBrowserAuthStorage({local:()=>local,session:()=>{throw Error('blocked');}}),auth=authFor(storage);
 assert.throws(()=>auth.setSessionPersistence(false),e=>e.code==='auth_storage_unavailable');
 auth.setSessionPersistence(true);await auth.signIn('fixture@example.invalid','synthetic-password');assert.ok(local.getItem(key));
});

test('tab-only selection fails before authentication if a durable token cannot be removed', async()=>{
 const local=memory(),tab=memory();local.setItem(key,'old-token');
 const storage=createBrowserAuthStorage({local:()=>({...local,removeItem:()=>{throw Error('blocked');}}),session:()=>tab}),auth=authFor(storage);
 assert.throws(()=>auth.setSessionPersistence(false),e=>e.code==='auth_storage_unavailable');
 assert.equal(tab.getItem(key),null);
});

test('tab-only sign-in cannot become durable if tab storage fails while the provider request is pending', async()=>{
 const local=memory(),tab=memory();let blocked=false;
 const storage=createBrowserAuthStorage({local:()=>local,session:()=>{if(blocked)throw Error('blocked');return tab;}});
 const auth=createSupabaseAuth({projectUrl:'https://example-ref.supabase.co',publishableKey:'sb_publishable_test',storage,fetchFn:async()=>{blocked=true;return provider('/token');}});
 auth.setSessionPersistence(false);
 await assert.rejects(auth.signIn('fixture@example.invalid','synthetic-password'),e=>e.code==='auth_storage_unavailable');
 assert.equal(local.getItem(key),null);
});

test('fresh callback fails closed if persistence preference cannot be read, without writing durable tokens', async()=>{
 const local=memory();const auth=authFor(createBrowserAuthStorage({local:()=>local,session:()=>{throw Error('blocked');}}));
 await assert.rejects(auth.consumeImplicitRedirect('https://medretica.com/web/account.html#access_token=callback&refresh_token=refresh&expires_at=2100000000'),e=>e.code==='auth_storage_unavailable');
 assert.equal(local.getItem(key),null);
});

test('legacy durable session can refresh when tab preference storage is unavailable', async()=>{
 const local=memory();local.setItem(key,JSON.stringify({accessToken:'old',refreshToken:'refresh',expiresAt:1,user:{id:'fixture-user'}}));
 const auth=authFor(createBrowserAuthStorage({local:()=>local,session:()=>{throw Error('blocked');}}));
 assert.equal((await auth.getSession()).accessToken,'fixture-access');assert.ok(local.getItem(key));
});


test('tab-only selection removes old durable credentials before a fresh callback with unreadable tab metadata', async()=>{
 const local=memory(),tab=memory();
 const auth=authFor(createBrowserAuthStorage({local:()=>local,session:()=>tab}));
 await auth.signIn('fixture@example.invalid','synthetic-password');
 assert.ok(local.getItem(key));
 auth.setSessionPersistence(false);
 assert.equal(local.getItem(key),null,'remove old durable credentials before leaving for provider');
 const fresh=await import('../src/adapters/supabase-auth.js?fresh-callback-document');
 const callback=fresh.createSupabaseAuth({projectUrl:'https://example-ref.supabase.co',publishableKey:'sb_publishable_test',storage:fresh.createBrowserAuthStorage({local:()=>local,session:()=>{throw Error('blocked');}}),fetchFn:provider});
 assert.equal(callback.currentUser(),null);
 await assert.rejects(callback.consumeImplicitRedirect('https://medretica.com/web/account.html#access_token=new-callback&refresh_token=refresh&expires_at=2100000000'),e=>e.code==='auth_storage_unavailable');
 assert.equal(local.getItem(key),null);
});
