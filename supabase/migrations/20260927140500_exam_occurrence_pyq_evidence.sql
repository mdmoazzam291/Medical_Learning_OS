-- M08b: stable exam occurrence identities + immutable PYQ evidence ledger.
-- Occurrence identity is separate from exam mechanics and from medical question content.

create table if not exists public.exam_occurrences (
  exam_occurrence_id text primary key,
  exam_id text not null,
  session text not null,
  label text not null,
  authority text not null,
  official_source_url text not null,
  verification_status text not null
    check (verification_status in ('draft', 'verified', 'retired')),
  verification_note text not null
    check (char_length(btrim(verification_note)) between 1 and 4000),
  created_at timestamptz not null default now(),
  unique (exam_id, session)
);

alter table public.exam_occurrences enable row level security;
revoke all on table public.exam_occurrences
  from public, anon, authenticated, service_role;
grant select on table public.exam_occurrences to service_role;

insert into public.exam_occurrences (
  exam_occurrence_id,
  exam_id,
  session,
  label,
  authority,
  official_source_url,
  verification_status,
  verification_note
) values (
  'neet-pg:2026',
  'neet-pg',
  '2026',
  'NEET-PG 2026',
  'National Board of Examinations in Medical Sciences (NBEMS)',
  'https://webdisk.natboard.edu.in/viewnbeexam?exam=neetpg',
  'verified',
  'Official NBEMS NEET-PG page lists the 2026 Information Bulletin. This verifies the exam occurrence identity only; it does not verify detailed simulator rule values.'
)
on conflict (exam_occurrence_id) do nothing;

create table if not exists public.question_exam_evidence_events (
  id uuid primary key default gen_random_uuid(),
  question_version_id text not null,
  exam_occurrence_id text not null
    references public.exam_occurrences(exam_occurrence_id) on delete restrict,
  action text not null check (action in ('asserted', 'retracted')),
  target_event_id uuid null
    references public.question_exam_evidence_events(id) on delete restrict,
  claim_scope text null
    check (claim_scope in ('reconstructed_item', 'exact_item')),
  provenance_kind text null
    check (provenance_kind in ('recalled_pyq', 'licensed_pyq')),
  evidence_basis text null
    check (evidence_basis in ('single_recall', 'corroborated_recall', 'licensed_primary_source')),
  source_ref text null,
  evidence_note text not null
    check (char_length(btrim(evidence_note)) between 1 and 4000),
  recorded_by text not null
    check (char_length(btrim(recorded_by)) between 1 and 200),
  recorded_at timestamptz not null default now(),
  constraint question_exam_evidence_action_shape check (
    (
      action = 'asserted'
      and target_event_id is null
      and claim_scope is not null
      and provenance_kind is not null
      and evidence_basis is not null
    )
    or
    (
      action = 'retracted'
      and target_event_id is not null
      and claim_scope is null
      and provenance_kind is null
      and evidence_basis is null
      and source_ref is null
    )
  ),
  constraint question_exam_evidence_semantics check (
    action = 'retracted'
    or (
      provenance_kind = 'recalled_pyq'
      and claim_scope = 'reconstructed_item'
      and evidence_basis in ('single_recall', 'corroborated_recall')
    )
    or (
      provenance_kind = 'licensed_pyq'
      and claim_scope = 'exact_item'
      and evidence_basis = 'licensed_primary_source'
      and source_ref is not null
    )
  )
);

create index if not exists question_exam_evidence_question_time
  on public.question_exam_evidence_events (question_version_id, recorded_at, id);
create index if not exists question_exam_evidence_exam_time
  on public.question_exam_evidence_events (exam_occurrence_id, recorded_at, id);
create unique index if not exists question_exam_evidence_one_retraction
  on public.question_exam_evidence_events (target_event_id)
  where action = 'retracted';

alter table public.question_exam_evidence_events enable row level security;
revoke all on table public.question_exam_evidence_events
  from public, anon, authenticated, service_role;
grant select on table public.question_exam_evidence_events to service_role;

create or replace function public.prevent_question_exam_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using
    errcode = '55000',
    message = 'question_exam_evidence_is_immutable';
end;
$function$;

revoke all on function public.prevent_question_exam_evidence_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists question_exam_evidence_no_update_delete
  on public.question_exam_evidence_events;
create trigger question_exam_evidence_no_update_delete
before update or delete on public.question_exam_evidence_events
for each row execute function public.prevent_question_exam_evidence_mutation();

create or replace function public.record_question_exam_evidence(
  p_question_version_id text,
  p_exam_occurrence_id text,
  p_claim_scope text,
  p_provenance_kind text,
  p_evidence_basis text,
  p_source_ref text,
  p_evidence_note text,
  p_recorded_by text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_event_id uuid := gen_random_uuid();
  v_question jsonb;
begin
  if char_length(btrim(coalesce(p_question_version_id, ''))) < 1 then
    raise exception using errcode = '22023', message = 'question_version_required';
  end if;
  if char_length(btrim(coalesce(p_exam_occurrence_id, ''))) < 1 then
    raise exception using errcode = '22023', message = 'exam_occurrence_required';
  end if;
  if char_length(btrim(coalesce(p_evidence_note, ''))) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'evidence_note_required';
  end if;
  if char_length(btrim(coalesce(p_recorded_by, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'recorded_by_required';
  end if;

  if not exists (
    select 1
    from public.exam_occurrences e
    where e.exam_occurrence_id = p_exam_occurrence_id
      and e.verification_status = 'verified'
  ) then
    raise exception using errcode = '22023', message = 'exam_occurrence_not_verified';
  end if;

  select q
    into v_question
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'questions') q
  where c.id = 1
    and q->>'questionVersionId' = p_question_version_id
  limit 1;

  if v_question is null then
    raise exception using errcode = '22023', message = 'unknown_question_version';
  end if;

  if p_provenance_kind = 'recalled_pyq' then
    if p_claim_scope <> 'reconstructed_item'
       or p_evidence_basis not in ('single_recall', 'corroborated_recall')
       or p_source_ref is not null then
      raise exception using errcode = '22023', message = 'invalid_recalled_pyq_evidence';
    end if;
  elsif p_provenance_kind = 'licensed_pyq' then
    if p_claim_scope <> 'exact_item'
       or p_evidence_basis <> 'licensed_primary_source'
       or char_length(btrim(coalesce(p_source_ref, ''))) < 1 then
      raise exception using errcode = '22023', message = 'invalid_licensed_pyq_evidence';
    end if;
  else
    raise exception using errcode = '22023', message = 'invalid_pyq_provenance_kind';
  end if;

  insert into public.question_exam_evidence_events (
    id,
    question_version_id,
    exam_occurrence_id,
    action,
    target_event_id,
    claim_scope,
    provenance_kind,
    evidence_basis,
    source_ref,
    evidence_note,
    recorded_by
  ) values (
    v_event_id,
    btrim(p_question_version_id),
    btrim(p_exam_occurrence_id),
    'asserted',
    null,
    p_claim_scope,
    p_provenance_kind,
    p_evidence_basis,
    nullif(btrim(coalesce(p_source_ref, '')), ''),
    btrim(p_evidence_note),
    btrim(p_recorded_by)
  );

  return v_event_id;
end;
$function$;

revoke all on function public.record_question_exam_evidence(
  text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_question_exam_evidence(
  text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.retract_question_exam_evidence(
  p_target_event_id uuid,
  p_evidence_note text,
  p_recorded_by text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_target public.question_exam_evidence_events%rowtype;
  v_event_id uuid := gen_random_uuid();
begin
  if char_length(btrim(coalesce(p_evidence_note, ''))) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'evidence_note_required';
  end if;
  if char_length(btrim(coalesce(p_recorded_by, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'recorded_by_required';
  end if;

  select *
    into v_target
  from public.question_exam_evidence_events
  where id = p_target_event_id
    and action = 'asserted';

  if v_target.id is null then
    raise exception using errcode = '22023', message = 'asserted_evidence_not_found';
  end if;

  if exists (
    select 1
    from public.question_exam_evidence_events
    where action = 'retracted'
      and target_event_id = p_target_event_id
  ) then
    raise exception using errcode = '23505', message = 'evidence_already_retracted';
  end if;

  insert into public.question_exam_evidence_events (
    id,
    question_version_id,
    exam_occurrence_id,
    action,
    target_event_id,
    claim_scope,
    provenance_kind,
    evidence_basis,
    source_ref,
    evidence_note,
    recorded_by
  ) values (
    v_event_id,
    v_target.question_version_id,
    v_target.exam_occurrence_id,
    'retracted',
    v_target.id,
    null,
    null,
    null,
    null,
    btrim(p_evidence_note),
    btrim(p_recorded_by)
  );

  return v_event_id;
end;
$function$;

revoke all on function public.retract_question_exam_evidence(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.retract_question_exam_evidence(uuid, text, text)
  to service_role;

create or replace function public.current_question_exam_evidence(
  p_question_version_id text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'evidenceEventId', a.id,
        'questionVersionId', a.question_version_id,
        'examOccurrenceId', a.exam_occurrence_id,
        'examId', o.exam_id,
        'session', o.session,
        'examLabel', o.label,
        'claimScope', a.claim_scope,
        'provenanceKind', a.provenance_kind,
        'evidenceBasis', a.evidence_basis,
        'sourceRef', a.source_ref,
        'evidenceNote', a.evidence_note,
        'recordedBy', a.recorded_by,
        'recordedAt', a.recorded_at
      )
      order by a.recorded_at, a.id
    ),
    '[]'::jsonb
  )
  from public.question_exam_evidence_events a
  join public.exam_occurrences o
    on o.exam_occurrence_id = a.exam_occurrence_id
  where a.action = 'asserted'
    and (p_question_version_id is null or a.question_version_id = p_question_version_id)
    and not exists (
      select 1
      from public.question_exam_evidence_events r
      where r.action = 'retracted'
        and r.target_event_id = a.id
    );
$function$;

revoke all on function public.current_question_exam_evidence(text)
  from public, anon, authenticated;
grant execute on function public.current_question_exam_evidence(text)
  to service_role;
