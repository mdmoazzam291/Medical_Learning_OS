-- Live RLS verification harness for M04b.
-- Requires at least one existing Supabase Auth learner. All inserted rows are rolled back.
-- Expected:
--   owner principal sees 1 session, 1 attempt, 1 bookmark
--   unrelated principal sees 0 session, 0 attempt, 0 bookmark

begin;

insert into public.study_sessions(id, learner_id, position, question_version_ids, question_started_at, closed)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, id, 0,
       '["rls-test-q1"]'::jsonb, now(), false
from auth.users order by created_at asc limit 1;

insert into public.study_attempts(
  id, learner_id, request_key, session_id, position, option_id, event, receipt
)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid, id, 'rls-test-req1',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 0, 'a',
       '{"type":"test"}'::jsonb, '{"ok":true}'::jsonb
from auth.users order by created_at asc limit 1;

insert into public.study_bookmarks(learner_id, question_version_id)
select id, 'rls-test-q1'
from auth.users order by created_at asc limit 1;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users order by created_at asc limit 1),
  true
);
set local role authenticated;

select
  'owner' as principal,
  (select count(*) from public.study_sessions
    where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')::int as visible_sessions,
  (select count(*) from public.study_attempts
    where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')::int as visible_attempts,
  (select count(*) from public.study_bookmarks
    where question_version_id='rls-test-q1')::int as visible_bookmarks;

reset role;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
set local role authenticated;

select
  'unrelated' as principal,
  (select count(*) from public.study_sessions
    where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')::int as visible_sessions,
  (select count(*) from public.study_attempts
    where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')::int as visible_attempts,
  (select count(*) from public.study_bookmarks
    where question_version_id='rls-test-q1')::int as visible_bookmarks;

rollback;
