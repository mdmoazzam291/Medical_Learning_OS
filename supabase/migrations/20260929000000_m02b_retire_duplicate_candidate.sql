-- Audited, one-time withdrawal of an unreviewed near-duplicate candidate.
-- No question prose, source or historical intake manifest is rewritten.
create table public.content_candidate_retirement_events (
  question_version_id text primary key,
  prior_sha256 text not null check (prior_sha256 ~ '^[0-9a-f]{64}$'),
  retired_sha256 text not null check (retired_sha256 ~ '^[0-9a-f]{64}$'),
  reason text not null,
  catalog_version_before bigint not null,
  catalog_version_after bigint not null,
  recorded_at timestamptz not null default now(),
  check (catalog_version_after = catalog_version_before + 1)
);
alter table public.content_candidate_retirement_events enable row level security;
revoke all on table public.content_candidate_retirement_events from public, anon, authenticated, service_role;
grant select on table public.content_candidate_retirement_events to service_role;

-- Serialize review inserts against catalog retirement. A reviewer who started
-- from a stale queue cannot insert a decision for an already-retired target.
create function public.content_review_current_status_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_status text;
begin
  select q->>'status' into v_status
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id = 1 and q->>'questionVersionId' = new.question_version_id
  for update of c;
  if v_status is distinct from 'in_review' then
    raise exception using errcode = '22023', message = 'question_not_in_review';
  end if;
  return new;
end;
$function$;
revoke all on function public.content_review_current_status_guard() from public, anon, authenticated, service_role;
create trigger content_review_current_status_guard
before insert on public.content_review_events
for each row execute function public.content_review_current_status_guard();

do $correction$
declare
  v_body jsonb;
  v_version bigint;
  v_old jsonb;
  v_new jsonb;
  v_questions jsonb;
  v_id constant text := 'infectious:rabies:washing-before-referral@1';
begin
  select version, body into v_version, v_body
  from public.study_catalog where id = 1 for update;
  if v_body is null then
    raise exception 'correction_catalog_missing';
  end if;
  select q into v_old from pg_catalog.jsonb_array_elements(v_body->'questions') q
  where q->>'questionVersionId' = v_id;
  if v_old is null or v_old->>'status' <> 'in_review'
     or v_old->>'stem' <> 'An unvaccinated adult has a transdermal dog bite. While urgent referral for rabies prophylaxis is arranged, which local first-aid measure should begin immediately?'
     or pg_catalog.jsonb_array_length(v_old->'reviews') <> 0
     or exists (select 1 from public.content_review_events where question_version_id = v_id)
     or exists (select 1 from public.content_candidate_retirement_events where question_version_id = v_id)
  then
    raise exception 'correction_target_changed_or_reviewed';
  end if;
  v_new := pg_catalog.jsonb_set(v_old, '{status}', '"retired"'::jsonb);
  select pg_catalog.jsonb_agg(case when q->>'questionVersionId' = v_id then v_new else q end order by ord)
  into v_questions
  from pg_catalog.jsonb_array_elements(v_body->'questions') with ordinality as entries(q, ord);
  update public.study_catalog
  set body = pg_catalog.jsonb_set(v_body, '{questions}', v_questions),
      version = v_version + 1, updated_at = now()
  where id = 1;
  insert into public.content_candidate_retirement_events
    (question_version_id, prior_sha256, retired_sha256, reason, catalog_version_before, catalog_version_after)
  values (
    v_id,
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_old::text, 'UTF8'), 'sha256'), 'hex'),
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_new::text, 'UTF8'), 'sha256'), 'hex'),
    'Unreviewed referral item restates the published 15-minute washing answer; replaced by a resource-limited water-only candidate.',
    v_version, v_version + 1
  );
end;
$correction$;
