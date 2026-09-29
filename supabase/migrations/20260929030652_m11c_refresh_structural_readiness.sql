
create or replace function public.study_retention_probe_readiness_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
with questions as (
  select
    q->>'questionId' as question_id,
    q->>'questionVersionId' as question_version_id,
    q->>'status' as status,
    (
      select link->>'conceptId'
      from pg_catalog.jsonb_array_elements(q->'conceptLinks') link
      where link->>'role' = 'primary'
      limit 1
    ) as concept_id
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id = 1
),
published_by_concept as (
  select
    concept_id,
    count(*)::integer as published_versions,
    count(distinct question_id)::integer as distinct_published_questions,
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'questionId', question_id,
        'questionVersionId', question_version_id
      )
      order by question_id, question_version_id
    ) as published_items
  from questions
  where status = 'published'
    and concept_id is not null
    and question_id is not null
    and question_version_id is not null
  group by concept_id
),
in_review_by_concept as (
  select
    concept_id,
    count(distinct question_id)::integer as distinct_in_review_questions,
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'questionId', question_id,
        'questionVersionId', question_version_id
      )
      order by question_id, question_version_id
    ) as in_review_items
  from questions
  where status = 'in_review'
    and concept_id is not null
    and question_id is not null
    and question_version_id is not null
  group by concept_id
),
joined as (
  select
    p.concept_id,
    p.published_versions,
    p.distinct_published_questions,
    p.published_items,
    coalesce(r.distinct_in_review_questions, 0)::integer as distinct_in_review_questions,
    coalesce(r.in_review_items, '[]'::jsonb) as in_review_items,
    greatest(
      0,
      (p.distinct_published_questions * (p.distinct_published_questions - 1)) / 2
    )::integer as published_alternate_pairs,
    p.distinct_published_questions >= 2 as has_published_alternate_pair,
    (
      p.distinct_published_questions >= 1
      and coalesce(r.distinct_in_review_questions, 0) >= 1
    ) as has_pending_alternate_candidate
  from published_by_concept p
  left join in_review_by_concept r on r.concept_id = p.concept_id
),
summary as (
  select
    coalesce((select count(*) from questions where status = 'published'), 0)::integer as published_versions,
    coalesce((select count(distinct question_id) from questions where status = 'published'), 0)::integer as published_distinct_questions,
    count(*)::integer as published_primary_concepts,
    count(*) filter (where has_published_alternate_pair)::integer as concepts_with_published_alternates,
    coalesce(sum(published_alternate_pairs), 0)::integer as published_alternate_pairs,
    count(*) filter (where has_pending_alternate_candidate)::integer as concepts_with_pending_alternates,
    coalesce(sum(distinct_in_review_questions) filter (where distinct_published_questions >= 1), 0)::integer as in_review_candidates_on_published_concepts
  from joined
)
select pg_catalog.jsonb_build_object(
  'contractId', 'study-retention-probe-readiness-v1',
  'scope', 'content-structure-readiness',
  'probeSchedulingEnabled', false,
  'activationAuthority', false,
  'sameItemEarlyProbeAllowed', false,
  'summary', pg_catalog.jsonb_build_object(
    'publishedQuestionVersions', s.published_versions,
    'publishedDistinctQuestions', s.published_distinct_questions,
    'publishedPrimaryConcepts', s.published_primary_concepts,
    'conceptsWithPublishedAlternateItems', s.concepts_with_published_alternates,
    'publishedAlternateItemPairs', s.published_alternate_pairs,
    'conceptsWithInReviewAlternateCandidates', s.concepts_with_pending_alternates,
    'inReviewAlternateCandidatesOnPublishedConcepts', s.in_review_candidates_on_published_concepts
  ),
  'readiness', pg_catalog.jsonb_build_object(
    'hasAnyPublishedAlternateItemPair', s.concepts_with_published_alternates > 0,
    'hasAnyPendingAlternateCandidate', s.concepts_with_pending_alternates > 0,
    'canActivateAlternateItemProbe', false,
    'blockingReasons',
      (case when s.concepts_with_published_alternates = 0
        then '["no-published-alternate-item-pair"]'::jsonb
        else '[]'::jsonb end)
      ||
      (case when s.concepts_with_published_alternates = 0 and s.concepts_with_pending_alternates = 0
        then '["no-in-review-alternate-candidate-for-published-concepts"]'::jsonb
        else '[]'::jsonb end)
  ),
  'concepts', coalesce((
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'conceptId', j.concept_id,
        'publishedDistinctQuestions', j.distinct_published_questions,
        'publishedAlternatePairs', j.published_alternate_pairs,
        'publishedItems', j.published_items,
        'inReviewDistinctQuestions', j.distinct_in_review_questions,
        'inReviewItems', j.in_review_items,
        'hasPublishedAlternatePair', j.has_published_alternate_pair,
        'hasPendingAlternateCandidate', j.has_pending_alternate_candidate
      )
      order by j.concept_id
    )
    from joined j
  ), '[]'::jsonb),
  'nextRequiredEvidence', pg_catalog.jsonb_build_array(
    'normal-medical-references-rights-review-for-any-new-probe-item',
    'pair-validity-is-evaluated-separately-by-m11c',
    'activation-is-evaluated-separately-by-study-retention-probe-activation-readiness-v1'
  ),
  'limitations', pg_catalog.jsonb_build_array(
    'structural-readiness-is-not-research-validity',
    'shared-primary-concept-does-not-by-itself-prove-item-equivalence-or-novelty',
    'published-version-count-does-not-measure-learner-outcome-coverage'
  )
)
from summary s;
$function$;

revoke all on function public.study_retention_probe_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_readiness_v1()
  to service_role;
