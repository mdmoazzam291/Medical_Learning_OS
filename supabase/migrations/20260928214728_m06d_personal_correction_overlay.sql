alter table public.neural_personal_annotations
  add column if not exists annotation_kind text not null default 'note',
  add column if not exists correction_target_type text null,
  add column if not exists correction_target_id text null,
  add column if not exists correction_target_sha256 text null;

alter table public.neural_personal_annotations
  drop constraint if exists neural_personal_annotation_kind_check;
alter table public.neural_personal_annotations
  add constraint neural_personal_annotation_kind_check check (
    (
      annotation_kind='note'
      and correction_target_type is null
      and correction_target_id is null
      and correction_target_sha256 is null
    )
    or
    (
      annotation_kind='correction'
      and correction_target_type in ('canonical_note','question_version')
      and correction_target_id is not null
      and correction_target_id ~ '^[a-zA-Z0-9:_@.\-]{1,180}$'
      and correction_target_sha256 ~ '^[0-9a-f]{64}$'
    )
  );

create unique index if not exists neural_one_personal_correction_per_target
  on public.neural_personal_annotations (
    learner_id, correction_target_type, correction_target_id
  )
  where annotation_kind='correction';

create table if not exists public.learner_content_issue_reports (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null,
  concept_id text not null check (concept_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  target_type text not null check (target_type in ('canonical_note','question_version')),
  target_id text not null check (target_id ~ '^[a-zA-Z0-9:_@.\-]{1,180}$'),
  target_sha256 text not null check (target_sha256 ~ '^[0-9a-f]{64}$'),
  report_kind text not null check (
    report_kind in ('incorrect','outdated','ambiguous','missing_context','other')
  ),
  details text null check (details is null or length(details) between 1 and 4000),
  suggested_correction text null check (
    suggested_correction is null or length(suggested_correction) between 1 and 20000
  ),
  created_at timestamptz not null default now(),
  contract_id text not null default 'learner-content-issue-report-v1'
    check (contract_id='learner-content-issue-report-v1'),
  unique (learner_id,target_type,target_id,target_sha256,report_kind)
);

create index if not exists learner_content_issue_reports_target
  on public.learner_content_issue_reports (
    target_type,target_id,target_sha256,created_at,id
  );

alter table public.learner_content_issue_reports enable row level security;
revoke all on table public.learner_content_issue_reports
  from public, anon, authenticated, service_role;
grant select on table public.learner_content_issue_reports to service_role;

create or replace function public.block_learner_content_issue_report_mutation()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  raise exception using errcode='55000', message='learner_content_issue_report_append_only';
end;
$function$;

revoke all on function public.block_learner_content_issue_report_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists learner_content_issue_reports_immutable
  on public.learner_content_issue_reports;
create trigger learner_content_issue_reports_immutable
before update or delete on public.learner_content_issue_reports
for each row execute function public.block_learner_content_issue_report_mutation();

create or replace function public.neural_correction_target_snapshot(
  p_concept_id text,
  p_target_type text,
  p_target_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_note public.neural_canonical_note_versions%rowtype;
  v_question jsonb;
  v_sha text;
begin
  if p_concept_id is null or p_concept_id !~ '^[a-zA-Z0-9:_@.\-]{1,160}$'
     or p_target_type not in ('canonical_note','question_version')
     or p_target_id is null
     or p_target_id !~ '^[a-zA-Z0-9:_@.\-]{1,180}$' then
    raise exception using errcode='22023', message='neural_correction_target_invalid';
  end if;

  if p_target_type='canonical_note' then
    select * into v_note
    from public.neural_canonical_note_versions
    where id::text=p_target_id
      and concept_id=p_concept_id
      and status='published'
    limit 1;

    if not found then
      raise exception using errcode='22023', message='neural_correction_target_unavailable';
    end if;

    return jsonb_build_object(
      'targetType','canonical_note',
      'targetId',v_note.id::text,
      'conceptId',v_note.concept_id,
      'targetSha256',v_note.content_sha256,
      'label',v_note.title
    );
  end if;

  select q.value into v_question
  from (
    select body
    from public.study_catalog
    order by version desc
    limit 1
  ) c
  cross join lateral jsonb_array_elements(
    coalesce(c.body->'questions','[]'::jsonb)
  ) q(value)
  where q.value->>'questionVersionId'=p_target_id
    and q.value->>'status'='published'
    and exists (
      select 1
      from jsonb_array_elements(
        coalesce(q.value->'conceptLinks','[]'::jsonb)
      ) link(value)
      where link.value->>'role'='primary'
        and link.value->>'conceptId'=p_concept_id
    )
  limit 1;

  if v_question is null then
    raise exception using errcode='22023', message='neural_correction_target_unavailable';
  end if;

  v_sha := encode(
    extensions.digest(v_question::text,'sha256'),
    'hex'
  );

  return jsonb_build_object(
    'targetType','question_version',
    'targetId',p_target_id,
    'conceptId',p_concept_id,
    'targetSha256',v_sha,
    'label',v_question->>'stem'
  );
end;
$function$;

revoke all on function public.neural_correction_target_snapshot(text,text,text)
  from public, anon, authenticated;
grant execute on function public.neural_correction_target_snapshot(text,text,text)
  to service_role;

create or replace function public.neural_create_personal_correction(
  p_learner uuid,
  p_concept_id text,
  p_target_type text,
  p_target_id text,
  p_body_markdown text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_target jsonb;
  v_id uuid := gen_random_uuid();
  v_anchor uuid := null;
begin
  if p_learner is null
     or length(btrim(coalesce(p_body_markdown,''))) not between 1 and 20000 then
    raise exception using errcode='22023', message='neural_correction_invalid';
  end if;

  v_target := public.neural_correction_target_snapshot(
    p_concept_id,p_target_type,p_target_id
  );

  if p_target_type='canonical_note' then
    v_anchor := p_target_id::uuid;
  end if;

  begin
    insert into public.neural_personal_annotations (
      id,learner_id,concept_id,body_markdown,anchor_note_version_id,
      annotation_kind,correction_target_type,correction_target_id,
      correction_target_sha256
    ) values (
      v_id,p_learner,p_concept_id,p_body_markdown,v_anchor,
      'correction',p_target_type,p_target_id,v_target->>'targetSha256'
    );
  exception
    when unique_violation then
      return jsonb_build_object('error','neural_correction_already_exists');
  end;

  return jsonb_build_object(
    'annotationId',v_id,
    'annotationKind','correction',
    'conceptId',p_concept_id,
    'bodyMarkdown',p_body_markdown,
    'targetType',p_target_type,
    'targetId',p_target_id,
    'targetSha256',v_target->>'targetSha256',
    'anchorNoteVersionId',v_anchor,
    'revision',1,
    'canonicalAuthority',false
  );
end;
$function$;

revoke all on function public.neural_create_personal_correction(
  uuid,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.neural_create_personal_correction(
  uuid,text,text,text,text
) to service_role;

create or replace function public.neural_report_content_issue(
  p_learner uuid,
  p_concept_id text,
  p_target_type text,
  p_target_id text,
  p_report_kind text,
  p_details text default null,
  p_correction_annotation_id uuid default null,
  p_share_correction boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_target jsonb;
  v_correction public.neural_personal_annotations%rowtype;
  v_suggestion text := null;
  v_id uuid := gen_random_uuid();
begin
  if p_learner is null
     or p_report_kind not in ('incorrect','outdated','ambiguous','missing_context','other')
     or (p_details is not null and length(btrim(p_details)) not between 1 and 4000) then
    raise exception using errcode='22023', message='learner_content_report_invalid';
  end if;

  v_target := public.neural_correction_target_snapshot(
    p_concept_id,p_target_type,p_target_id
  );

  if p_share_correction then
    if p_correction_annotation_id is null then
      raise exception using errcode='22023', message='learner_content_report_correction_required';
    end if;

    select * into v_correction
    from public.neural_personal_annotations
    where id=p_correction_annotation_id
      and learner_id=p_learner
      and annotation_kind='correction'
      and concept_id=p_concept_id
      and correction_target_type=p_target_type
      and correction_target_id=p_target_id
    limit 1;

    if not found then
      raise exception using errcode='22023', message='learner_content_report_correction_invalid';
    end if;
    v_suggestion := v_correction.body_markdown;
  elsif p_correction_annotation_id is not null then
    raise exception using errcode='22023', message='learner_content_report_share_mismatch';
  end if;

  begin
    insert into public.learner_content_issue_reports (
      id,learner_id,concept_id,target_type,target_id,target_sha256,
      report_kind,details,suggested_correction
    ) values (
      v_id,p_learner,p_concept_id,p_target_type,p_target_id,
      v_target->>'targetSha256',p_report_kind,nullif(btrim(p_details),''),
      v_suggestion
    );
  exception
    when unique_violation then
      return jsonb_build_object('error','learner_content_report_already_submitted');
  end;

  return jsonb_build_object(
    'reportId',v_id,
    'contractId','learner-content-issue-report-v1',
    'conceptId',p_concept_id,
    'targetType',p_target_type,
    'targetId',p_target_id,
    'targetSha256',v_target->>'targetSha256',
    'reportKind',p_report_kind,
    'sharedCorrection',p_share_correction,
    'canonicalAuthority',false,
    'learnerModelAuthority',false
  );
end;
$function$;

revoke all on function public.neural_report_content_issue(
  uuid,text,text,text,text,text,uuid,boolean
) from public, anon, authenticated;
grant execute on function public.neural_report_content_issue(
  uuid,text,text,text,text,text,uuid,boolean
) to service_role;
