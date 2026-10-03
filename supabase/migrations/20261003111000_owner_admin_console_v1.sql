-- Singleton-owner operational visibility for the MLOS Admin Console.
-- Owner identity is permanent; Medical/References/Rights review grants remain separate and temporary.

create or replace function public.owner_admin_dashboard_v1()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  with
  catalog as (
    select version, body, updated_at
    from public.study_catalog
    where id = 1
    limit 1
  ),
  question_status as (
    select coalesce(q->>'status','unknown') as status, count(*)::bigint as n
    from catalog c,
      lateral pg_catalog.jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
    group by 1
  ),
  note_status as (
    select coalesce(status,'unknown') as status, count(*)::bigint as n
    from public.neural_canonical_note_versions
    group by 1
  ),
  admin_grants as (
    select g.review_kind, g.granted_at, g.expires_at,
      (g.expires_at is null or g.expires_at > pg_catalog.now()) as active
    from public.content_reviewer_grants g
    join public.content_admin_account a on a.singleton = true and a.admin_user_id = g.reviewer_id
    order by g.review_kind
  ),
  recent_users as (
    select u.id, u.email, u.created_at, u.last_sign_in_at,
      u.email_confirmed_at,
      coalesce(u.raw_app_meta_data->'providers','[]'::jsonb) as providers
    from auth.users u
    where u.deleted_at is null
    order by u.created_at desc
    limit 12
  ),
  open_reports as (
    select count(*)::bigint as n
    from public.learner_content_issue_reports r
    where not exists (
      select 1 from public.learner_content_issue_triage_events t where t.report_id = r.id
    )
  ),
  unresolved_rights as (
    select count(*)::bigint as n
    from catalog c,
      lateral pg_catalog.jsonb_array_elements(coalesce(c.body->'sources','[]'::jsonb)) s
    where not exists (
      select 1 from public.source_rights_events e where e.source_id = s->>'sourceId'
    )
  ),
  pending_review as (
    select kind, count(*)::bigint as n
    from (
      select q->>'questionVersionId' as question_version_id, k.kind
      from catalog c,
        lateral pg_catalog.jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
      cross join (values ('medical'::text),('references'::text),('rights'::text)) as k(kind)
      where q->>'status' = 'in_review'
        and not exists (
          select 1
          from public.content_review_events e
          where e.target_type = 'question_version'
            and e.target_id = q->>'questionVersionId'
            and e.review_kind = k.kind
        )
    ) x
    group by kind
  )
  select pg_catalog.jsonb_build_object(
    'contractId','owner-admin-dashboard-v1',
    'generatedAt',pg_catalog.now(),
    'users',pg_catalog.jsonb_build_object(
      'total',(select count(*) from auth.users where deleted_at is null),
      'new7d',(select count(*) from auth.users where deleted_at is null and created_at >= pg_catalog.now() - interval '7 days'),
      'signedIn7d',(select count(*) from auth.users where deleted_at is null and last_sign_in_at >= pg_catalog.now() - interval '7 days'),
      'signedIn30d',(select count(*) from auth.users where deleted_at is null and last_sign_in_at >= pg_catalog.now() - interval '30 days'),
      'recent',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id',id,'email',email,'createdAt',created_at,'lastSignInAt',last_sign_in_at,
        'emailConfirmedAt',email_confirmed_at,'providers',providers
      ) order by created_at desc) from recent_users),'[]'::jsonb)
    ),
    'learning',pg_catalog.jsonb_build_object(
      'attemptsTotal',(select count(*) from public.study_attempts),
      'attempts24h',(select count(*) from public.study_attempts where recorded_at >= pg_catalog.now() - interval '24 hours'),
      'attempts7d',(select count(*) from public.study_attempts where recorded_at >= pg_catalog.now() - interval '7 days'),
      'activeLearners7d',(select count(distinct learner_id) from public.study_attempts where recorded_at >= pg_catalog.now() - interval '7 days'),
      'sessionsTotal',(select count(*) from public.study_sessions),
      'sessions7d',(select count(*) from public.study_sessions where created_at >= pg_catalog.now() - interval '7 days'),
      'openSessions',(select count(*) from public.study_sessions where closed = false),
      'examRunsTotal',(select count(*) from public.exam_runs),
      'examRuns7d',(select count(*) from public.exam_runs where created_at >= pg_catalog.now() - interval '7 days'),
      'examCompletedTotal',(select count(*) from public.exam_runs where status = 'completed'),
      'latestAttemptAt',(select max(recorded_at) from public.study_attempts)
    ),
    'content',pg_catalog.jsonb_build_object(
      'catalogVersion',(select version from catalog),
      'catalogUpdatedAt',(select updated_at from catalog),
      'concepts',(select pg_catalog.jsonb_array_length(coalesce(body->'concepts','[]'::jsonb)) from catalog),
      'sources',(select pg_catalog.jsonb_array_length(coalesce(body->'sources','[]'::jsonb)) from catalog),
      'questions',(select pg_catalog.jsonb_array_length(coalesce(body->'questions','[]'::jsonb)) from catalog),
      'questionStatus',coalesce((select pg_catalog.jsonb_object_agg(status,n) from question_status),'{}'::jsonb),
      'canonicalNoteStatus',coalesce((select pg_catalog.jsonb_object_agg(status,n) from note_status),'{}'::jsonb),
      'reviewEvidence',(select count(*) from public.content_review_events),
      'pendingReview',coalesce((select pg_catalog.jsonb_object_agg(kind,n) from pending_review),'{}'::jsonb),
      'openLearnerReports',(select n from open_reports),
      'unresolvedRights',(select n from unresolved_rights)
    ),
    'reviewAuthority',pg_catalog.jsonb_build_object(
      'temporary',true,
      'grants',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'reviewKind',review_kind,'grantedAt',granted_at,'expiresAt',expires_at,'active',active
      ) order by review_kind) from admin_grants),'[]'::jsonb)
    ),
    'ai',pg_catalog.jsonb_build_object(
      'telemetryAvailable',
        pg_catalog.to_regclass('public.ai_runs') is not null
        and pg_catalog.to_regclass('public.ai_cost_ledger') is not null,
      'requiredTelemetry',pg_catalog.jsonb_build_array('ai_runs','ai_cost_ledger'),
      'message','AI usage/cost telemetry is shown only after the canonical AI run and cost ledgers exist.'
    ),
    'infrastructure',pg_catalog.jsonb_build_object(
      'database','healthy',
      'databaseBytes',pg_catalog.pg_database_size(pg_catalog.current_database()),
      'publicTableCount',(select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'),
      'catalogFreshnessAt',(select updated_at from catalog),
      'managementPlaneTelemetry','not_connected'
    )
  );
$function$;

revoke all on function public.owner_admin_dashboard_v1() from public, anon, authenticated;
grant execute on function public.owner_admin_dashboard_v1() to service_role;
comment on function public.owner_admin_dashboard_v1() is
  'Singleton-owner operational dashboard. Human review grants remain separate, temporary authority and are only reported here.';

create or replace function public.owner_admin_learner_search_v1(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  q text := pg_catalog.btrim(coalesce(p_query,''));
  result jsonb;
begin
  if pg_catalog.char_length(q) < 2 or pg_catalog.char_length(q) > 160 then
    raise exception using errcode='22023', message='owner_learner_search_query_invalid';
  end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id',x.id,
    'email',x.email,
    'createdAt',x.created_at,
    'lastSignInAt',x.last_sign_in_at,
    'emailConfirmedAt',x.email_confirmed_at,
    'providers',x.providers,
    'isAdmin',x.is_admin
  ) order by x.last_sign_in_at desc nulls last, x.created_at desc),'[]'::jsonb)
  into result
  from (
    select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
      coalesce(u.raw_app_meta_data->'providers','[]'::jsonb) as providers,
      coalesce(a.admin_user_id = u.id,false) as is_admin
    from auth.users u
    left join public.content_admin_account a on a.singleton = true and a.admin_user_id = u.id
    where u.deleted_at is null
      and (u.email ilike '%' || q || '%' or u.id::text = q)
    order by u.last_sign_in_at desc nulls last, u.created_at desc
    limit 25
  ) x;

  return pg_catalog.jsonb_build_object(
    'contractId','owner-admin-learner-search-v1',
    'query',q,
    'learners',result
  );
end;
$function$;

revoke all on function public.owner_admin_learner_search_v1(text) from public, anon, authenticated;
grant execute on function public.owner_admin_learner_search_v1(text) to service_role;
comment on function public.owner_admin_learner_search_v1(text) is
  'Admin-only learner identity search for the singleton MLOS owner console; no learner mutation authority.';

comment on table public.content_reviewer_grants is
  'Temporary human-review authority. Singleton owner status does not make Medical, References, or Rights grants permanent.';
