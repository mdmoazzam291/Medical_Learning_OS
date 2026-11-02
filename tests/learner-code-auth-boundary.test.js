import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const handler = readFileSync(new URL('../supabase/functions/learner-identity-api/index.ts',import.meta.url),'utf8');
const schema = readFileSync(new URL('../supabase/migrations/20261102084000_learner_reference_codes.sql',import.meta.url),'utf8');
const publicSurface = readFileSync(new URL('../scripts/public-surface.js',import.meta.url),'utf8');
const ci = readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');

test('runtime API only accepts self GET or POST ensure after validated Auth and runtime session',()=>{
  assert.match(handler,/req.method === "GET" && path === "\/me"/);
  assert.match(handler,/req.method === "POST" && path === "\/ensure"/);
  assert.match(handler,/auth\.getUser\(token\)/);
  assert.match(handler,/checkRuntimeAccess\(admin, token, authUserId\)/);
  assert.match(handler,/runtime\?\.reason === "runtime_access_unavailable"/);
  assert.match(handler,/fail\(503, "identity_session_check_unavailable"\)/);
  assert.match(handler,/runtime\?\.allowed !== true/);
  assert.match(handler,/origin_not_allowed/);
  assert.match(handler,/url\.search\) fail\(400, "query_not_supported"\)/);
  assert.match(handler,/req\.body !== null/);
  assert.doesNotMatch(handler,/await req\.text\(\)/);
  assert.match(handler,/\.eq\("auth_user_id", id\)/);
  assert.match(handler,/allocateLearnerCode\(\{ authUserId, storage \}\)/);
  assert.match(handler,/Cache-Control": "no-store, private"/);
  assert.doesNotMatch(handler,/req\.headers\.get\("x-user-id"\)|url\.searchParams\.get\("user"\)|authData\.user\.user_metadata/);
  assert.doesNotMatch(handler,/path === "\/all"|path === "\/lookup"|path === "\/search"/);
});

test('explicit service-only mapping access and immutable canonical Auth UUID in schema',()=>{
  assert.match(schema,/auth_user_id uuid primary key references auth\.users\(id\) on delete cascade/i);
  assert.match(schema,/learner_code text not null unique/i);
  assert.match(schema,/enable row level security/i);
  assert.match(schema,/revoke all on table public\.learner_reference_codes from public, anon, authenticated, service_role/i);
  assert.match(schema,/grant select, insert on table public\.learner_reference_codes to service_role/i);
  assert.doesNotMatch(schema,/security definer|create trigger|grant (update|delete).*service_role|grant .* authenticated/i);
  assert.doesNotMatch(schema,/create policy/i);
});

test('identity API and offline secret key do not join public static surface',()=>{
  assert.ok(!publicSurface.includes('learner-identity-api'));
  assert.ok(!publicSurface.includes('ops/prototypes/learner-identity/learner-code.js'));
  assert.match(ci,/Verify private learner-code mapping on isolated PostgreSQL/);
  assert.match(ci,/scripts\/learner-reference-code-db-check\.js/);
});
