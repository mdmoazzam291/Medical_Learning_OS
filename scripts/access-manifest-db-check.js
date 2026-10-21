import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const path = new URL('../supabase/verification/export-access.sql', import.meta.url);
assert.ok(existsSync(path), 'exact database access exporter is missing');
const { PGlite } = await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
const source = new PGlite(), target = new PGlite();
const fixture = `create role anon;create role authenticated;create role service_role;create role app_owner;
create table public.private_data(id int,secret text);create table public.own_data(id int);create sequence public.item_seq;
create function public.private_fn() returns int language sql security definer as 'select 7';
alter function public.private_fn() owner to app_owner;`;
try {
 for (const db of [source,target]) await db.exec(fixture);
 await source.exec(`revoke all on schema public from public;grant usage on schema public to anon,authenticated,service_role;
 revoke all on public.private_data,public.own_data from public,anon,authenticated,service_role;
 grant select on public.own_data to authenticated;grant select,insert on public.private_data to service_role;
 grant select(id) on public.private_data to anon;
 revoke all on function public.private_fn() from public;grant execute on function public.private_fn() to service_role;
 grant usage on sequence public.item_seq to service_role;
 alter default privileges in schema public grant select on tables to service_role;`);
 await target.exec(`grant all on public.private_data,public.own_data to anon,authenticated;
 grant execute on function public.private_fn() to anon,authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated;
 alter default privileges revoke execute on functions from public;`);
 const sql = await readFile(path,'utf8');
 const result = await source.exec(sql);
 const manifest = result.at(-1).rows[0].access_sql;
 assert.ok(manifest.startsWith('-- mlos-public-access-v1'));
 await target.exec(manifest);
 const state = async db => (await db.query(`select
 has_table_privilege('anon','public.private_data','SELECT') as anon_read,
 has_column_privilege('anon','public.private_data','id','SELECT') as anon_column,
 has_column_privilege('anon','public.private_data','secret','SELECT') as anon_secret,
 has_table_privilege('authenticated','public.own_data','SELECT') as learner_read,
 has_table_privilege('authenticated','public.own_data','INSERT') as learner_write,
 has_table_privilege('service_role','public.private_data','INSERT') as service_write,
 has_function_privilege('anon','public.private_fn()','EXECUTE') as anon_rpc,
 has_function_privilege('service_role','public.private_fn()','EXECUTE') as service_rpc,
 has_sequence_privilege('service_role','public.item_seq','USAGE') as service_sequence,
 (select r.rolname from pg_proc p join pg_roles r on r.oid=p.proowner where p.oid='public.private_fn()'::regprocedure) as fn_owner`)).rows;
 assert.deepEqual(await state(target),await state(source));
 for (const db of [source,target]) await db.exec("create table public.future_data(id int);create function public.future_fn() returns int language sql as 'select 1'");
 assert.deepEqual((await target.query("select has_function_privilege('anon','public.future_fn()','EXECUTE') as allowed")).rows,(await source.query("select has_function_privilege('anon','public.future_fn()','EXECUTE') as allowed")).rows);
 assert.deepEqual((await target.query("select has_table_privilege('anon','public.future_data','SELECT') as a,has_table_privilege('authenticated','public.future_data','INSERT') as b,has_table_privilege('service_role','public.future_data','SELECT') as c")).rows,(await source.query("select has_table_privilege('anon','public.future_data','SELECT') as a,has_table_privilege('authenticated','public.future_data','INSERT') as b,has_table_privilege('service_role','public.future_data','SELECT') as c")).rows);
 await target.exec(manifest); // Idempotent access restoration.
 assert.deepEqual(await state(target),await state(source));
 console.log('Access manifest PostgreSQL check passed: unsafe target grants removed; table/column/RPC/sequence/owner/default privileges preserved. Synthetic only.');
} finally { await source.close();await target.close(); }
