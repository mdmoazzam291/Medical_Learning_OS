create table if not exists public.learner_content_issue_triage_events (
  triage_event_id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.learner_content_issue_reports(id) on delete cascade,
  reviewer_id uuid not null,
  review_kind text not null check (review_kind in ('medical','references','rights')),
  decision text not null check (decision in ('no_canonical_issue','correction_required')),
  reason_code text not null check (reason_code in (
    'canonical_content_current',
    'report_not_reproducible',
    'target_superseded',
    'medical_correction_required',
    'reference_update_required',
    'rights_or_provenance_review_required',
    'ambiguous_scope_requires_revision',
    'other_correction_required'
  )),
  target_type text not null check (target_type in ('canonical_note','question_version')),
  target_id text not null check (target_id ~ '^[a-zA-Z0-9:_@.\-]{1,180}$'),
  target_sha256 text not null check (target_sha256 ~ '^[0-9a-f]{64}$'),
  triaged_at timestamptz not null default now(),
  contract_id text not null default 'learner-content-issue-triage-v1'
    check (contract_id='learner-content-issue-triage-v1'),
  unique(report_id)
);

create index if not exists learner_content_issue_triage_target
  on public.learner_content_issue_triage_events(
    target_type,target_id,target_sha256,triaged_at,triage_event_id
  );

alter table public.learner_content_issue_triage_events enable row level security;

revoke all on table public.learner_content_issue_triage_events
  from public,anon,authenticated,service_role;
grant select on table public.learner_content_issue_triage_events
  to service_role;

create or replace function public.block_learner_content_issue_triage_mutation()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  if tg_op='DELETE'
     and coalesce(
       pg_catalog.current_setting('mlos.privacy_erasure',true),
       ''
     )='learner-erasure-v1' then
    return old;
  end if;

  raise exception using
    errcode='55000',
    message='learner_content_issue_triage_append_only';
end;
$function$;

revoke all on function public.block_learner_content_issue_triage_mutation()
  from public,anon,authenticated,service_role;

drop trigger if exists learner_content_issue_triage_immutable
  on public.learner_content_issue_triage_events;

create trigger learner_content_issue_triage_immutable
before update or delete on public.learner_content_issue_triage_events
for each row execute function public.block_learner_content_issue_triage_mutation();

create or replace function public.triage_learner_content_issue_reports(
  p_report_ids uuid[],
  p_reviewer uuid,
  p_review_kind text,
  p_decision text,
  p_reason_code text,
  p_attestation_version text,
  p_attested boolean
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_count integer;
  v_target_type text;
  v_target_id text;
  v_target_sha256 text;
  v_receipts jsonb;
begin
  if p_reviewer is null then
    raise exception using errcode='22023',message='content_issue_triage_identity_required';
  end if;
  if p_review_kind not in ('medical','references','rights') then
    raise exception using errcode='22023',message='content_issue_triage_review_kind_invalid';
  end if;
  if p_decision not in ('no_canonical_issue','correction_required') then
    raise exception using errcode='22023',message='content_issue_triage_decision_invalid';
  end if;
  if p_attestation_version <> 'learner-content-issue-triage-attestation-v1'
     or p_attested is distinct from true then
    raise exception using errcode='22023',message='content_issue_triage_attestation_required';
  end if;

  if p_decision='no_canonical_issue'
     and p_reason_code not in (
       'canonical_content_current',
       'report_not_reproducible',
       'target_superseded'
     ) then
    raise exception using errcode='22023',message='content_issue_triage_reason_mismatch';
  end if;

  if p_decision='correction_required'
     and p_reason_code not in (
       'medical_correction_required',
       'reference_update_required',
       'rights_or_provenance_review_required',
       'ambiguous_scope_requires_revision',
       'other_correction_required'
     ) then
    raise exception using errcode='22023',message='content_issue_triage_reason_mismatch';
  end if;

  if not public.has_active_reviewer_grant(p_reviewer,p_review_kind) then
    raise exception using errcode='42501',message='reviewer_not_authorized';
  end if;

  v_count:=coalesce(cardinality(p_report_ids),0);
  if v_count < 1 or v_count > 100 then
    raise exception using errcode='22023',message='content_issue_triage_batch_size_invalid';
  end if;

  if (select count(distinct x) from unnest(p_report_ids) x) <> v_count then
    raise exception using errcode='22023',message='content_issue_triage_duplicate_report';
  end if;

  perform 1
  from public.learner_content_issue_reports r
  where r.id=any(p_report_ids)
  for update;

  if (
    select count(*)
    from public.learner_content_issue_reports r
    where r.id=any(p_report_ids)
  ) <> v_count then
    raise exception using errcode='22023',message='content_issue_triage_report_missing';
  end if;

  if exists(
    select 1
    from public.learner_content_issue_reports r
    where r.id=any(p_report_ids)
      and r.learner_id=p_reviewer
  ) then
    raise exception using errcode='42501',message='content_issue_triage_self_review_blocked';
  end if;

  if exists(
    select 1
    from public.learner_content_issue_triage_events t
    where t.report_id=any(p_report_ids)
  ) then
    raise exception using errcode='23505',message='content_issue_triage_already_recorded';
  end if;

  select r.target_type,r.target_id,r.target_sha256
  into v_target_type,v_target_id,v_target_sha256
  from public.learner_content_issue_reports r
  where r.id=p_report_ids[1];

  if exists(
    select 1
    from public.learner_content_issue_reports r
    where r.id=any(p_report_ids)
      and (
        r.target_type is distinct from v_target_type
        or r.target_id is distinct from v_target_id
        or r.target_sha256 is distinct from v_target_sha256
      )
  ) then
    raise exception using errcode='22023',message='content_issue_triage_target_mismatch';
  end if;

  with inserted as (
    insert into public.learner_content_issue_triage_events(
      report_id,
      reviewer_id,
      review_kind,
      decision,
      reason_code,
      target_type,
      target_id,
      target_sha256
    )
    select
      r.id,
      p_reviewer,
      p_review_kind,
      p_decision,
      p_reason_code,
      r.target_type,
      r.target_id,
      r.target_sha256
    from public.learner_content_issue_reports r
    where r.id=any(p_report_ids)
    order by r.created_at,r.id
    returning
      triage_event_id,
      report_id,
      review_kind,
      decision,
      reason_code,
      target_type,
      target_id,
      target_sha256,
      triaged_at
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'triageEventId',triage_event_id,
        'reportId',report_id,
        'reviewKind',review_kind,
        'decision',decision,
        'reasonCode',reason_code,
        'targetType',target_type,
        'targetId',target_id,
        'targetSha256',target_sha256,
        'triagedAt',triaged_at
      )
      order by triaged_at,triage_event_id
    ),
    '[]'::jsonb
  )
  into v_receipts
  from inserted;

  return jsonb_build_object(
    'contractId','learner-content-issue-triage-receipt-v1',
    'targetType',v_target_type,
    'targetId',v_target_id,
    'targetSha256',v_target_sha256,
    'reviewKind',p_review_kind,
    'decision',p_decision,
    'reasonCode',p_reason_code,
    'decisionCount',v_count,
    'triageEvents',v_receipts,
    'canonicalMutation',false,
    'publicationAuthority',false,
    'learnerModelAuthority',false
  );
end;
$function$;

revoke all on function public.triage_learner_content_issue_reports(
  uuid[],uuid,text,text,text,text,boolean
) from public,anon,authenticated;

grant execute on function public.triage_learner_content_issue_reports(
  uuid[],uuid,text,text,text,text,boolean
) to service_role;
