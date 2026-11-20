-- ADR-147: Admin-only audience for published questions (owner 2026-11-20 12:43 IST: "Admin + me first").
-- Questions published with audience 'admin-preview' get catalog status 'admin_preview' (not 'published') in the
-- same transaction as publication. Every learner path already requires status 'published', so they stay hidden by
-- default; only the Admin account can list, start and answer them. One Admin action widens an import to all learners.

create table if not exists public.content_library_audience_events (
  id uuid primary key default gen_random_uuid(),
  import_id text not null,
  question_version_id text not null,
  audience text not null check (audience in ('admin-preview', 'all-learners')),
  actor_id uuid not null,
  recorded_at timestamptz not null default now()
);
create index if not exists content_library_audience_events_import_idx on public.content_library_audience_events (import_id, recorded_at desc);
alter table public.content_library_audience_events enable row level security;
revoke all on table public.content_library_audience_events from public, anon, authenticated;
grant select, insert on table public.content_library_audience_events to service_role;
comment on table public.content_library_audience_events is 'Append-only audience decisions for published questions (ADR-147). Service role only.';

-- Question versions created by one import (the publisher stamps authorId = 'import-source:<importId>').
create or replace function public.content_library_import_question_versions_v1(p_import_id text, p_status text)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(q->>'questionVersionId' order by q->>'questionVersionId'), '{}')
  from public.study_catalog c cross join lateral jsonb_array_elements(c.body->'questions') q
  where c.id = 1 and q->>'authorId' = 'import-source:' || p_import_id and q->>'status' = p_status;
$$;

create or replace function public.content_library_set_question_status_v1(p_ids text[], p_from text, p_to text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if cardinality(p_ids) = 0 then return; end if;
  update public.study_catalog c
  set body = jsonb_set(c.body, '{questions}', (
        select jsonb_agg(case when q->>'questionVersionId' = any(p_ids) and q->>'status' = p_from
                              then q || jsonb_build_object('status', p_to) else q end order by ord)
        from jsonb_array_elements(c.body->'questions') with ordinality as items(q, ord)), false),
      version = c.version + 1,
      updated_at = now()
  where c.id = 1;
end; $$;

create or replace function public.content_library_review_publish_v2(
  p_import_id text, p_reviewer uuid, p_expected_digest text, p_rights_decisions jsonb,
  p_review_notes text, p_attested boolean, p_audience text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; v_ids text[]; v_already boolean; v_current text;
begin
  if p_audience is null or p_audience not in ('admin-preview', 'all-learners') then raise exception 'audience_invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended('content-library-publication', 0));
  select status = 'published' into v_already from public.content_library_imports where import_id = p_import_id;
  r := public.content_library_review_publish_v1(p_import_id, p_reviewer, p_expected_digest, p_rights_decisions, p_review_notes, p_attested);
  if coalesce(v_already, false) then
    -- Identical retry: report the import's current audience; never change it here.
    select audience into v_current from public.content_library_audience_events where import_id = p_import_id order by recorded_at desc, id desc limit 1;
    return r || jsonb_build_object('audience', coalesce(v_current, 'all-learners'));
  end if;
  v_ids := public.content_library_import_question_versions_v1(p_import_id, 'published');
  if p_audience = 'admin-preview' then
    perform public.content_library_set_question_status_v1(v_ids, 'published', 'admin_preview');
  end if;
  insert into public.content_library_audience_events (import_id, question_version_id, audience, actor_id)
  select p_import_id, id, p_audience, p_reviewer from unnest(v_ids) id;
  return r || jsonb_build_object('audience', p_audience, 'audienceQuestionCount', cardinality(v_ids));
end; $$;

create or replace function public.content_library_widen_audience_v1(p_import_id text, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ids text[];
begin
  if p_actor is null or public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('content-library-publication', 0));
  if not exists (select 1 from public.content_library_imports where import_id = p_import_id and status = 'published') then raise exception 'import_not_found'; end if;
  v_ids := public.content_library_import_question_versions_v1(p_import_id, 'admin_preview');
  perform public.content_library_set_question_status_v1(v_ids, 'admin_preview', 'published');
  insert into public.content_library_audience_events (import_id, question_version_id, audience, actor_id)
  select p_import_id, id, 'all-learners', p_actor from unnest(v_ids) id;
  return jsonb_build_object('importId', p_import_id, 'audience', 'all-learners', 'widenedQuestionCount', cardinality(v_ids));
end; $$;

-- Library study sessions: the Admin account may also start sessions on its admin_preview questions.
do $patch$
declare
  v_def text;
  v_old text := $q$and item->>'questionVersionId'=k and item->>'status'='published';$q$;
  v_new text := $q$and item->>'questionVersionId'=k and (item->>'status'='published' or (item->>'status'='admin_preview' and public.is_content_admin(p_learner)));$q$;
begin
  v_def := pg_get_functiondef('public.study_start_library_session_v2(uuid,uuid,jsonb,timestamptz,jsonb)'::regprocedure);
  if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then raise exception 'admin_preview_patch_mismatch: library session'; end if;
  execute replace(v_def, v_old, v_new);
end
$patch$;

revoke all on function public.content_library_import_question_versions_v1(text, text) from public, anon, authenticated;
revoke all on function public.content_library_set_question_status_v1(text[], text, text) from public, anon, authenticated;
revoke all on function public.content_library_review_publish_v2(text, uuid, text, jsonb, text, boolean, text) from public, anon, authenticated;
revoke all on function public.content_library_widen_audience_v1(text, uuid) from public, anon, authenticated;
grant execute on function public.content_library_review_publish_v2(text, uuid, text, jsonb, text, boolean, text) to service_role;
grant execute on function public.content_library_widen_audience_v1(text, uuid) to service_role;
