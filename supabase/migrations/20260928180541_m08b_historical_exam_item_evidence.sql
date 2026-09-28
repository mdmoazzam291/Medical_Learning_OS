-- M08b: historical reconstructed-item evidence independent of learner-facing QBank content.
-- Recalled item wording is not stored. Evidence maps a nonverbatim reconstruction summary
-- directly to canonical concepts and a verified exam occurrence.

do $block$
begin
  if exists (
    select 1
    from public.exam_occurrences
    where exam_occurrence_id = 'ini-cet:2023-07'
      and (
        exam_id <> 'ini-cet'
        or session <> '2023-07'
        or label <> 'INI-CET July 2023'
        or authority <> 'All India Institute of Medical Sciences (AIIMS), New Delhi'
        or official_source_url <> 'https://docs.aiimsexams.ac.in/sites/INI-CET%20notice.pdf'
      )
  ) then
    raise exception using errcode = '23505', message = 'ini_cet_2023_07_occurrence_conflict';
  end if;

  insert into public.exam_occurrences (
    exam_occurrence_id, exam_id, session, label, authority,
    official_source_url, verification_status, verification_note
  ) values (
    'ini-cet:2023-07',
    'ini-cet',
    '2023-07',
    'INI-CET July 2023',
    'All India Institute of Medical Sciences (AIIMS), New Delhi',
    'https://docs.aiimsexams.ac.in/sites/INI-CET%20notice.pdf',
    'verified',
    'Official AIIMS notice for the July 2023 INI-CET session states that the written CBT was held on 07 May 2023. This verifies the exam occurrence only, not recalled item wording or answer keys.'
  )
  on conflict (exam_occurrence_id) do nothing;
end;
$block$;

create table if not exists public.historical_exam_item_events (
  id uuid primary key default gen_random_uuid(),
  historical_item_id text not null
    check (historical_item_id ~ '^[a-zA-Z0-9:_@.\-]{1,200}$'),
  exam_occurrence_id text not null
    references public.exam_occurrences(exam_occurrence_id) on delete restrict,
  action text not null check (action in ('asserted', 'retracted')),
  target_event_id uuid null
    references public.historical_exam_item_events(id) on delete restrict,
  reconstruction_summary text null,
  concept_ids text[] null,
  evidence_basis text null
    check (evidence_basis in ('single_recall', 'corroborated_recall')),
  source_lineage_status text null
    check (source_lineage_status in ('unknown', 'independent')),
  recall_sources jsonb null,
  evidence_note text not null
    check (char_length(btrim(evidence_note)) between 1 and 4000),
  recorded_by text not null
    check (char_length(btrim(recorded_by)) between 1 and 200),
  recorded_at timestamptz not null default now(),
  constraint historical_exam_item_action_shape check (
    (
      action = 'asserted'
      and target_event_id is null
      and reconstruction_summary is not null
      and concept_ids is not null
      and evidence_basis is not null
      and source_lineage_status is not null
      and recall_sources is not null
    )
    or
    (
      action = 'retracted'
      and target_event_id is not null
      and reconstruction_summary is null
      and concept_ids is null
      and evidence_basis is null
      and source_lineage_status is null
      and recall_sources is null
    )
  )
);

create unique index if not exists historical_exam_item_one_assertion
  on public.historical_exam_item_events (historical_item_id)
  where action = 'asserted';
create unique index if not exists historical_exam_item_one_retraction
  on public.historical_exam_item_events (target_event_id)
  where action = 'retracted';
create index if not exists historical_exam_item_occurrence_time
  on public.historical_exam_item_events (exam_occurrence_id, recorded_at, id);

alter table public.historical_exam_item_events enable row level security;
revoke all on table public.historical_exam_item_events
  from public, anon, authenticated, service_role;
grant select on table public.historical_exam_item_events to service_role;

create or replace function public.prevent_historical_exam_item_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'historical_exam_item_evidence_is_immutable';
end;
$function$;

revoke all on function public.prevent_historical_exam_item_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists historical_exam_item_no_update_delete
  on public.historical_exam_item_events;
create trigger historical_exam_item_no_update_delete
before update or delete on public.historical_exam_item_events
for each row execute function public.prevent_historical_exam_item_mutation();

create or replace function public.record_historical_exam_item_evidence(
  p_historical_item_id text,
  p_exam_occurrence_id text,
  p_reconstruction_summary text,
  p_concept_ids text[],
  p_evidence_basis text,
  p_source_lineage_status text,
  p_recall_sources jsonb,
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
  v_source_count integer;
begin
  if coalesce(p_historical_item_id, '') !~ '^[a-zA-Z0-9:_@.\-]{1,200}$' then
    raise exception using errcode = '22023', message = 'historical_item_id_invalid';
  end if;
  if char_length(btrim(coalesce(p_exam_occurrence_id, ''))) < 1 then
    raise exception using errcode = '22023', message = 'exam_occurrence_required';
  end if;
  if char_length(btrim(coalesce(p_reconstruction_summary, ''))) not between 1 and 1200 then
    raise exception using errcode = '22023', message = 'reconstruction_summary_invalid';
  end if;
  if coalesce(pg_catalog.cardinality(p_concept_ids), 0) not between 1 and 12 then
    raise exception using errcode = '22023', message = 'historical_concepts_invalid';
  end if;
  if exists (
    select 1 from pg_catalog.unnest(p_concept_ids) c
    where char_length(pg_catalog.btrim(coalesce(c, ''))) < 1
  ) or (
    select count(*) from pg_catalog.unnest(p_concept_ids) c
  ) <> (
    select count(distinct c) from pg_catalog.unnest(p_concept_ids) c
  ) then
    raise exception using errcode = '22023', message = 'historical_concepts_invalid';
  end if;
  if p_evidence_basis not in ('single_recall', 'corroborated_recall') then
    raise exception using errcode = '22023', message = 'historical_evidence_basis_invalid';
  end if;
  if p_source_lineage_status not in ('unknown', 'independent') then
    raise exception using errcode = '22023', message = 'historical_source_lineage_invalid';
  end if;
  if pg_catalog.jsonb_typeof(p_recall_sources) <> 'array' then
    raise exception using errcode = '22023', message = 'historical_recall_sources_invalid';
  end if;
  v_source_count := pg_catalog.jsonb_array_length(p_recall_sources);
  if v_source_count not between 1 and 10 then
    raise exception using errcode = '22023', message = 'historical_recall_sources_invalid';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_recall_sources) s
    where pg_catalog.jsonb_typeof(s) <> 'object'
      or (
        select pg_catalog.array_agg(k order by k)
        from pg_catalog.jsonb_object_keys(s) k
      ) is distinct from array['accessedAt','publisher','url']::text[]
      or char_length(pg_catalog.btrim(coalesce(s->>'publisher',''))) not between 1 and 200
      or coalesce(s->>'url','') !~ '^https://'
      or coalesce(s->>'accessedAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ) then
    raise exception using errcode = '22023', message = 'historical_recall_sources_invalid';
  end if;
  if p_evidence_basis = 'corroborated_recall'
     and (p_source_lineage_status <> 'independent' or v_source_count < 2) then
    raise exception using errcode = '22023', message = 'historical_corroboration_not_established';
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

  if exists (
    select 1
    from pg_catalog.unnest(p_concept_ids) requested(concept_id)
    where not exists (
      select 1
      from public.study_catalog c
      cross join lateral pg_catalog.jsonb_array_elements(c.body->'concepts') concept
      where c.id = 1
        and concept->>'conceptId' = requested.concept_id
    )
  ) then
    raise exception using errcode = '22023', message = 'unknown_canonical_concept';
  end if;

  insert into public.historical_exam_item_events (
    id, historical_item_id, exam_occurrence_id, action, target_event_id,
    reconstruction_summary, concept_ids, evidence_basis, source_lineage_status,
    recall_sources, evidence_note, recorded_by
  ) values (
    v_event_id, p_historical_item_id, p_exam_occurrence_id, 'asserted', null,
    btrim(p_reconstruction_summary), p_concept_ids, p_evidence_basis,
    p_source_lineage_status, p_recall_sources, btrim(p_evidence_note), btrim(p_recorded_by)
  );

  return v_event_id;
end;
$function$;

revoke all on function public.record_historical_exam_item_evidence(
  text, text, text, text[], text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.record_historical_exam_item_evidence(
  text, text, text, text[], text, text, jsonb, text, text
) to service_role;

create or replace function public.retract_historical_exam_item_evidence(
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
  v_target public.historical_exam_item_events%rowtype;
  v_event_id uuid := gen_random_uuid();
begin
  if char_length(btrim(coalesce(p_evidence_note, ''))) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'evidence_note_required';
  end if;
  if char_length(btrim(coalesce(p_recorded_by, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'recorded_by_required';
  end if;

  select * into v_target
  from public.historical_exam_item_events
  where id = p_target_event_id and action = 'asserted';

  if v_target.id is null then
    raise exception using errcode = '22023', message = 'historical_assertion_not_found';
  end if;
  if exists (
    select 1 from public.historical_exam_item_events
    where action = 'retracted' and target_event_id = p_target_event_id
  ) then
    raise exception using errcode = '23505', message = 'historical_evidence_already_retracted';
  end if;

  insert into public.historical_exam_item_events (
    id, historical_item_id, exam_occurrence_id, action, target_event_id,
    reconstruction_summary, concept_ids, evidence_basis, source_lineage_status,
    recall_sources, evidence_note, recorded_by
  ) values (
    v_event_id, v_target.historical_item_id, v_target.exam_occurrence_id, 'retracted',
    v_target.id, null, null, null, null, null, btrim(p_evidence_note), btrim(p_recorded_by)
  );
  return v_event_id;
end;
$function$;

revoke all on function public.retract_historical_exam_item_evidence(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.retract_historical_exam_item_evidence(uuid, text, text)
  to service_role;

create or replace function public.current_historical_exam_item_evidence(
  p_exam_id text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'evidenceEventId', e.id,
        'historicalItemId', e.historical_item_id,
        'examOccurrenceId', e.exam_occurrence_id,
        'examId', o.exam_id,
        'session', o.session,
        'examLabel', o.label,
        'reconstructionSummary', e.reconstruction_summary,
        'conceptIds', e.concept_ids,
        'evidenceBasis', e.evidence_basis,
        'sourceLineageStatus', e.source_lineage_status,
        'recallSources', e.recall_sources,
        'evidenceNote', e.evidence_note,
        'recordedBy', e.recorded_by,
        'recordedAt', e.recorded_at
      )
      order by e.recorded_at, e.id
    ),
    '[]'::jsonb
  )
  from public.historical_exam_item_events e
  join public.exam_occurrences o on o.exam_occurrence_id = e.exam_occurrence_id
  where e.action = 'asserted'
    and o.verification_status = 'verified'
    and (p_exam_id is null or o.exam_id = p_exam_id)
    and not exists (
      select 1 from public.historical_exam_item_events r
      where r.action = 'retracted' and r.target_event_id = e.id
    );
$function$;

revoke all on function public.current_historical_exam_item_evidence(text)
  from public, anon, authenticated;
grant execute on function public.current_historical_exam_item_evidence(text)
  to service_role;

create or replace function public.exam_dna_observations(
  p_exam_id text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
with active_question_evidence as (
  select
    ('question:' || e.id::text) as evidence_key,
    e.question_version_id as evidence_item_key,
    e.question_version_id,
    null::text as historical_item_id,
    e.exam_occurrence_id,
    e.provenance_kind,
    e.evidence_basis,
    null::text as source_lineage_status,
    e.recorded_at,
    o.exam_id,
    o.session,
    o.label as exam_label
  from public.question_exam_evidence_events e
  join public.exam_occurrences o on o.exam_occurrence_id = e.exam_occurrence_id
  where e.action = 'asserted'
    and o.verification_status = 'verified'
    and (p_exam_id is null or o.exam_id = p_exam_id)
    and not exists (
      select 1 from public.question_exam_evidence_events r
      where r.action = 'retracted' and r.target_event_id = e.id
    )
),
catalog_questions as (
  select q
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id = 1
),
catalog_concepts as (
  select concept
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'concepts') concept
  where c.id = 1
),
question_contextualized as (
  select a.*, primary_link.link->>'conceptId' as concept_id
  from active_question_evidence a
  left join catalog_questions q on q.q->>'questionVersionId' = a.question_version_id
  left join lateral (
    select link
    from pg_catalog.jsonb_array_elements(q.q->'conceptLinks') link
    where link->>'role' = 'primary'
    limit 1
  ) primary_link on q.q is not null
),
historical_contextualized as (
  select
    ('historical:' || e.id::text) as evidence_key,
    e.historical_item_id as evidence_item_key,
    null::text as question_version_id,
    e.historical_item_id,
    e.exam_occurrence_id,
    'recalled_pyq'::text as provenance_kind,
    e.evidence_basis,
    e.source_lineage_status,
    e.recorded_at,
    o.exam_id,
    o.session,
    o.label as exam_label,
    concepts.concept_id
  from public.historical_exam_item_events e
  join public.exam_occurrences o on o.exam_occurrence_id = e.exam_occurrence_id
  cross join lateral pg_catalog.unnest(e.concept_ids) as concepts(concept_id)
  where e.action = 'asserted'
    and o.verification_status = 'verified'
    and (p_exam_id is null or o.exam_id = p_exam_id)
    and not exists (
      select 1 from public.historical_exam_item_events r
      where r.action = 'retracted' and r.target_event_id = e.id
    )
),
contextualized as (
  select * from question_contextualized
  union all
  select * from historical_contextualized
),
concept_summary as (
  select
    c.concept_id,
    count(distinct c.evidence_key)::integer as active_assertions,
    count(distinct c.evidence_item_key)::integer as distinct_evidence_items,
    count(distinct c.question_version_id)::integer as distinct_question_versions,
    count(distinct c.historical_item_id)::integer as distinct_historical_items,
    count(distinct c.exam_occurrence_id)::integer as distinct_exam_occurrences,
    count(distinct c.evidence_item_key) filter (
      where c.provenance_kind = 'licensed_pyq'
        and c.evidence_basis = 'licensed_primary_source'
    )::integer as licensed_exact_items,
    count(distinct c.evidence_item_key) filter (
      where c.provenance_kind = 'recalled_pyq'
        and c.evidence_basis = 'corroborated_recall'
    )::integer as corroborated_recall_items,
    count(distinct c.evidence_item_key) filter (
      where c.provenance_kind = 'recalled_pyq'
        and c.evidence_basis = 'single_recall'
    )::integer as single_recall_items,
    count(distinct c.evidence_item_key) filter (
      where c.provenance_kind = 'recalled_pyq'
        and c.source_lineage_status = 'unknown'
    )::integer as source_lineage_unknown_items,
    min(c.recorded_at) as first_evidence_at,
    max(c.recorded_at) as last_evidence_at
  from contextualized c
  where c.concept_id is not null
  group by c.concept_id
),
concept_rows as (
  select
    s.concept_id,
    pg_catalog.jsonb_build_object(
      'conceptId', s.concept_id,
      'label', coalesce(cc.concept->>'label', s.concept_id),
      'subjectTags', coalesce(cc.concept->'subjectTags', '[]'::jsonb),
      'observed', pg_catalog.jsonb_build_object(
        'activeAssertions', s.active_assertions,
        'distinctEvidenceItems', s.distinct_evidence_items,
        'distinctQuestionVersions', s.distinct_question_versions,
        'distinctHistoricalItems', s.distinct_historical_items,
        'distinctExamOccurrences', s.distinct_exam_occurrences,
        'firstEvidenceAt', s.first_evidence_at,
        'lastEvidenceAt', s.last_evidence_at,
        'evidenceClasses', pg_catalog.jsonb_build_object(
          'licensedExactItems', s.licensed_exact_items,
          'corroboratedRecallItems', s.corroborated_recall_items,
          'singleRecallItems', s.single_recall_items
        ),
        'occurrences', (
          select coalesce(
            pg_catalog.jsonb_agg(
              pg_catalog.jsonb_build_object(
                'examOccurrenceId', x.exam_occurrence_id,
                'examId', x.exam_id,
                'session', x.session,
                'label', x.exam_label,
                'distinctEvidenceItems', x.evidence_items,
                'distinctQuestionVersions', x.question_versions,
                'distinctHistoricalItems', x.historical_items
              )
              order by x.session, x.exam_occurrence_id
            ),
            '[]'::jsonb
          )
          from (
            select
              c2.exam_occurrence_id,
              min(c2.exam_id) as exam_id,
              min(c2.session) as session,
              min(c2.exam_label) as exam_label,
              count(distinct c2.evidence_item_key)::integer as evidence_items,
              count(distinct c2.question_version_id)::integer as question_versions,
              count(distinct c2.historical_item_id)::integer as historical_items
            from contextualized c2
            where c2.concept_id = s.concept_id
            group by c2.exam_occurrence_id
          ) x
        )
      ),
      'interpretation', pg_catalog.jsonb_build_object(
        'status', 'descriptive-only',
        'predictiveInferenceEnabled', false
      ),
      'uncertainty', pg_catalog.jsonb_build_object(
        'reasons',
          (case when s.distinct_exam_occurrences < 2 then '["single-occurrence-only"]'::jsonb else '[]'::jsonb end)
          ||
          (case when s.licensed_exact_items = 0 and (s.corroborated_recall_items + s.single_recall_items) > 0
             then '["recalled-evidence-only"]'::jsonb else '[]'::jsonb end)
          ||
          (case when s.source_lineage_unknown_items > 0
             then '["recall-source-lineage-unverified"]'::jsonb else '[]'::jsonb end)
          ||
          (case when s.distinct_evidence_items < 5
             then '["sparse-concept-sample"]'::jsonb else '[]'::jsonb end)
      )
    ) as row
  from concept_summary s
  left join catalog_concepts cc on cc.concept->>'conceptId' = s.concept_id
),
global_summary as (
  select
    count(distinct evidence_key)::integer as active_assertions,
    count(distinct evidence_item_key)::integer as distinct_evidence_items,
    count(distinct question_version_id)::integer as distinct_question_versions,
    count(distinct historical_item_id)::integer as distinct_historical_items,
    count(distinct exam_occurrence_id)::integer as distinct_exam_occurrences,
    count(distinct evidence_item_key) filter (where provenance_kind = 'licensed_pyq')::integer as licensed_exact_items,
    count(distinct evidence_item_key) filter (
      where provenance_kind = 'recalled_pyq' and evidence_basis = 'corroborated_recall'
    )::integer as corroborated_recall_items,
    count(distinct evidence_item_key) filter (
      where provenance_kind = 'recalled_pyq' and evidence_basis = 'single_recall'
    )::integer as single_recall_items,
    count(distinct evidence_item_key) filter (
      where provenance_kind = 'recalled_pyq' and source_lineage_status = 'unknown'
    )::integer as source_lineage_unknown_items,
    count(distinct question_version_id) filter (where concept_id is null)::integer as unresolved_question_versions
  from contextualized
)
select pg_catalog.jsonb_build_object(
  'contractId', 'exam-dna-observation-v2',
  'scope', 'descriptive-historical-pyq-evidence',
  'examFilter', p_exam_id,
  'predictiveInferenceEnabled', false,
  'summary', pg_catalog.jsonb_build_object(
    'activeAssertions', g.active_assertions,
    'distinctEvidenceItems', g.distinct_evidence_items,
    'distinctQuestionVersions', g.distinct_question_versions,
    'distinctHistoricalItems', g.distinct_historical_items,
    'distinctExamOccurrences', g.distinct_exam_occurrences,
    'evidenceClasses', pg_catalog.jsonb_build_object(
      'licensedExactItems', g.licensed_exact_items,
      'corroboratedRecallItems', g.corroborated_recall_items,
      'singleRecallItems', g.single_recall_items
    ),
    'sourceLineageUnknownItems', g.source_lineage_unknown_items,
    'unresolvedQuestionVersions', g.unresolved_question_versions
  ),
  'concepts', coalesce(
    (select pg_catalog.jsonb_agg(row order by concept_id) from concept_rows),
    '[]'::jsonb
  ),
  'uncertainty', pg_catalog.jsonb_build_object(
    'reasons',
      (case when g.active_assertions = 0 then '["no-pyq-evidence"]'::jsonb else '[]'::jsonb end)
      ||
      (case when g.source_lineage_unknown_items > 0
         then '["recall-source-lineage-unverified"]'::jsonb else '[]'::jsonb end)
  ),
  'limitations', pg_catalog.jsonb_build_array(
    'historical-evidence-is-not-a-future-exam-probability',
    'recalled-and-licensed-evidence-remain-separate',
    'recall-source-count-does-not-prove-independent-corroboration',
    'historical-reconstructions-do-not-store-or-claim-official-item-wording',
    'absence-of-evidence-is-not-evidence-of-absence'
  )
)
from global_summary g;
$function$;

revoke all on function public.exam_dna_observations(text)
  from public, anon, authenticated;
grant execute on function public.exam_dna_observations(text)
  to service_role;
