import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

// ACL-only replay: real migration GRANT/REVOKE/RLS statements against data-free
// table shapes. This is separate from full DDL and Auth/platform replay.
const { PGlite } = await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../supabase/migrations/', import.meta.url);
const files = (await readdir(root)).filter(n => n.endsWith('.sql')).sort();
const sources = await Promise.all(files.map(n => readFile(new URL(n, root), 'utf8')));
const tables = new Set();
for (const sql of sources) {
  for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi)) tables.add(match[1]);
}
const audit = await readFile(new URL('../supabase/verification/data-api-grants.sql', import.meta.url), 'utf8');
const verify = () => db.exec(audit);
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec('grant usage on schema public to anon, authenticated, service_role;');
  for (const table of tables) await db.exec(`create table public.${table}(id int);`);
  let replayed = 0;
  const repairIndex = files.findIndex(n => n.endsWith('_explicit_service_read_grants.sql'));
  assert.notEqual(repairIndex, -1, 'forward read-grant migration must exist');
  const boundary = async () => (await db.query(`
    select c.relname, r.rolname,
      has_table_privilege(r.rolname,c.oid,'SELECT') as read,
      has_table_privilege(r.rolname,c.oid,'INSERT') as insert,
      has_table_privilege(r.rolname,c.oid,'UPDATE') as update,
      has_table_privilege(r.rolname,c.oid,'DELETE') as delete,
      c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join pg_roles r where n.nspname='public' and c.relkind in ('r','p')
      and r.rolname in ('anon','authenticated','service_role')
    order by c.relname,r.rolname
  `)).rows.map(row => row.rolname === 'service_role' ? { ...row, read: true } : row);
  for (const [index, source] of sources.entries()) {
    if (index === repairIndex) {
      await assert.rejects(verify(), /missing_service_read_grant/, 'legacy sources must reproduce missing automatic grants');
      const before = await boundary();
      await db.exec(source);
      await db.exec(source); // Execute full migration twice, in lexical order.
      assert.deepEqual(await boundary(), before, 'only service SELECT may change');
      continue;
    }
    const sql = source.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const pattern = /\b(?:grant|revoke)\s+(?:(?:all(?:\s+privileges)?|select|insert|update|delete|truncate|references|trigger|maintain)[\s,]*)+\s+on\s+(?:table\s+)?public\.[\w.,\s]+?\s+(?:to|from)\s+[\w,\s]+;|alter\s+table\s+public\.\w+\s+(?:enable|disable)\s+row\s+level\s+security\s*;/gi;
    for (const match of sql.matchAll(pattern)) {
      const names = [...match[0].matchAll(/public\.(\w+)/g)].map(m => m[1]);
      if (!names.every(n => tables.has(n))) continue; // Views are a separate contract.
      await db.exec(match[0]);
      replayed++;
    }
  }
  await verify();
  for (const [change, error, undo] of [
    ['revoke select on public.study_catalog from service_role', /missing_service_read_grant/, 'grant select on public.study_catalog to service_role'],
    ['grant select on public.study_catalog to anon', /unexpected_browser_table_grant/, 'revoke select on public.study_catalog from anon'],
    ['grant insert on public.study_sessions to authenticated', /unexpected_browser_table_grant/, 'revoke insert on public.study_sessions from authenticated'],
    ['alter table public.study_sessions disable row level security', /data_api_rls_required/, 'alter table public.study_sessions enable row level security']
  ]) {
    await db.exec(change);
    await assert.rejects(verify(), error);
    await db.exec(undo);
    await verify();
  }
  await db.exec('create table public.future_feature(id int); alter table public.future_feature enable row level security;');
  await assert.rejects(verify(), /missing_service_read_grant/);
  await db.exec('grant select on public.future_feature to service_role;');
  await verify();
  // Actual role requests: service reads work without defaults; browser denial
  // and RLS remain effective. No write permission is added by the repair.
  await db.exec('set role service_role; select * from public.study_catalog; reset role;');
  await db.exec('set role anon;');
  await assert.rejects(db.query('select * from public.study_catalog'), /permission denied/);
  await db.exec('reset role; set role authenticated;');
  await assert.rejects(db.query('insert into public.study_sessions values (1)'), /permission denied/);
  await db.exec('reset role;');
  const readOnly = (await db.query("select has_table_privilege('service_role','public.content_review_events','INSERT') as allowed")).rows[0];
  assert.equal(readOnly.allowed, false, 'read-only ledger must not gain direct writes');
  console.log(`Data API ACL replay passed: ${tables.size} tables, ${replayed} statements; missing grants, browser exposure, RLS and future-table negative controls passed. Not a full migration replay.`);
} finally {
  await db.close();
}
