create or replace function public.prevent_ai_test_review_mutation()
returns trigger
language plpgsql
security invoker
set search_path = 'public', 'pg_temp'
as $$
begin
  raise exception using errcode = '55000', message = 'ai_test_review_evidence_immutable';
end;
$$;

revoke all on function public.prevent_ai_test_review_mutation() from public, anon, authenticated;
