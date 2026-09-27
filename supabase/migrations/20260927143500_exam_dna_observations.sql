-- M08c: descriptive Exam DNA observation projection.
-- Historical PYQ evidence is summarized as evidence strata, never as a forecast.

create or replace function public.exam_dna_observations(
  p_exam_id text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
with active_evidence as (
  select
    e.id as evidence_event_id,
    e.question_version_id,
    e.exam_occurrence_id,
    e.claim_scope,
    e.provenance_kind,
    e.evidence_basis,
    e.recorded_at,
    o.exam_id,
    o.session,
    o.label as exam_label
  from public.question_exam_evidence_events e
  join public.exam_occurrences o
    on o.exam_occurrence_id = e.exam_occurrence_id
  where e.action = 'asserted'
    and o.verification_status = 'verified'
    and (p_exam_id is null or o.exam_id = p_exam_id)
    and not exists (
      select 1
      from public.question_exam_evidence_events r
      where r.action = 'retracted'
        and r.target_event_id = e.id
    )
),
catalog_questions as (
  select q
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'questions') q
  where c.id = 1
),
catalog_concepts as (
  select concept
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'concepts') concept
  where c.id = 1
),
contextualized as (
  select
    a.*,
    q.q as question,
    primary_link.link->>'conceptId' as concept_id
  from active_evidence a
  left join catalog_questions q
    on q.q->>'questionVersionId' = a.question_version_id
  left join lateral (
    select link
    from jsonb_array_elements(q.q->'conceptLinks') link
    where link->>'role' = 'primary'
    limit 1
  ) primary_link on q.q is not null
),
concept_summary as (
  select
    c.concept_id,
    count(*)::integer as active_assertions,
    count(distinct c.question_version_id)::integer as distinct_question_versions,
    count(distinct c.exam_occurrence_id)::integer as distinct_exam_occurrences,
    count(distinct c.question_version_id) filter (
      where c.provenance_kind = 'licensed_pyq'
        and c.claim_scope = 'exact_item'
        and c.evidence_basis = 'licensed_primary_source'
    )::integer as licensed_exact_items,
    count(distinct c.question_version_id) filter (
      where c.provenance_kind = 'recalled_pyq'
        and c.evidence_basis = 'corroborated_recall'
    )::integer as corroborated_recall_items,
    count(distinct c.question_version_id) filter (
      where c.provenance_kind = 'recalled_pyq'
        and c.evidence_basis = 'single_recall'
    )::integer as single_recall_items,
    min(c.recorded_at) as first_evidence_at,
    max(c.recorded_at) as last_evidence_at
  from contextualized c
  where c.concept_id is not null
  group by c.concept_id
),
concept_rows as (
  select
    s.concept_id,
    jsonb_build_object(
      'conceptId', s.concept_id,
      'label', coalesce(cc.concept->>'label', s.concept_id),
      'subjectTags', coalesce(cc.concept->'subjectTags', '[]'::jsonb),
      'observed', jsonb_build_object(
        'activeAssertions', s.active_assertions,
        'distinctQuestionVersions', s.distinct_question_versions,
        'distinctExamOccurrences', s.distinct_exam_occurrences,
        'firstEvidenceAt', s.first_evidence_at,
        'lastEvidenceAt', s.last_evidence_at,
        'evidenceClasses', jsonb_build_object(
          'licensedExactItems', s.licensed_exact_items,
          'corroboratedRecallItems', s.corroborated_recall_items,
          'singleRecallItems', s.single_recall_items
        ),
        'occurrences', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'examOccurrenceId', x.exam_occurrence_id,
                'examId', x.exam_id,
                'session', x.session,
                'label', x.exam_label,
                'distinctQuestionVersions', x.question_versions
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
              count(distinct c2.question_version_id)::integer as question_versions
            from contextualized c2
            where c2.concept_id = s.concept_id
            group by c2.exam_occurrence_id
          ) x
        )
      ),
      'interpretation', jsonb_build_object(
        'status', 'descriptive-only',
        'predictiveInferenceEnabled', false
      ),
      'uncertainty', jsonb_build_object(
        'reasons',
          (case
             when s.distinct_exam_occurrences < 2
               then '["single-occurrence-only"]'::jsonb
             else '[]'::jsonb
           end)
          ||
          (case
             when s.licensed_exact_items = 0
                  and (s.corroborated_recall_items + s.single_recall_items) > 0
               then '["recalled-evidence-only"]'::jsonb
             else '[]'::jsonb
           end)
          ||
          (case
             when s.distinct_question_versions < 5
               then '["sparse-concept-sample"]'::jsonb
             else '[]'::jsonb
           end)
      )
    ) as row
  from concept_summary s
  left join catalog_concepts cc
    on cc.concept->>'conceptId' = s.concept_id
),
global_summary as (
  select
    count(*)::integer as active_assertions,
    count(distinct question_version_id)::integer as distinct_question_versions,
    count(distinct exam_occurrence_id)::integer as distinct_exam_occurrences,
    count(distinct question_version_id) filter (
      where provenance_kind = 'licensed_pyq'
    )::integer as licensed_exact_items,
    count(distinct question_version_id) filter (
      where provenance_kind = 'recalled_pyq'
        and evidence_basis = 'corroborated_recall'
    )::integer as corroborated_recall_items,
    count(distinct question_version_id) filter (
      where provenance_kind = 'recalled_pyq'
        and evidence_basis = 'single_recall'
    )::integer as single_recall_items,
    count(distinct question_version_id) filter (
      where concept_id is null
    )::integer as unresolved_question_versions
  from contextualized
)
select jsonb_build_object(
  'contractId', 'exam-dna-observation-v1',
  'scope', 'descriptive-historical-pyq-evidence',
  'examFilter', p_exam_id,
  'predictiveInferenceEnabled', false,
  'summary', jsonb_build_object(
    'activeAssertions', g.active_assertions,
    'distinctQuestionVersions', g.distinct_question_versions,
    'distinctExamOccurrences', g.distinct_exam_occurrences,
    'evidenceClasses', jsonb_build_object(
      'licensedExactItems', g.licensed_exact_items,
      'corroboratedRecallItems', g.corroborated_recall_items,
      'singleRecallItems', g.single_recall_items
    ),
    'unresolvedQuestionVersions', g.unresolved_question_versions
  ),
  'concepts', coalesce(
    (select jsonb_agg(row order by concept_id) from concept_rows),
    '[]'::jsonb
  ),
  'uncertainty', jsonb_build_object(
    'reasons',
      case
        when g.active_assertions = 0
          then '["no-pyq-evidence"]'::jsonb
        else '[]'::jsonb
      end
  ),
  'limitations', jsonb_build_array(
    'historical-evidence-is-not-a-future-exam-probability',
    'recalled-and-licensed-evidence-remain-separate',
    'absence-of-evidence-is-not-evidence-of-absence'
  )
)
from global_summary g;
$function$;

revoke all on function public.exam_dna_observations(text)
  from public, anon, authenticated;
grant execute on function public.exam_dna_observations(text)
  to service_role;
