-- M08d: immutable runtime rules mirror plus content-capacity and assembly gate.
-- Repository registry remains the deployment source; the DB row is the immutable runtime mirror.

create table if not exists public.exam_rule_sets (
  rule_set_id text primary key,
  exam_id text not null,
  version integer not null check (version >= 1),
  verification_status text not null check (verification_status in ('verified', 'retired')),
  total_questions integer not null check (total_questions >= 1),
  total_duration_seconds integer not null check (total_duration_seconds >= 1),
  rule_set jsonb not null check (jsonb_typeof(rule_set) = 'object'),
  rule_set_sha256 text not null check (rule_set_sha256 ~ '^[0-9a-f]{64}$'),
  source_repo_path text not null,
  recorded_at timestamptz not null default now(),
  unique (exam_id, version),
  check (rule_set->>'ruleSetId' = rule_set_id),
  check (rule_set->>'examId' = exam_id),
  check ((rule_set->>'version')::integer = version),
  check (rule_set->'verification'->>'status' = verification_status),
  check ((rule_set->'rules'->>'totalQuestions')::integer = total_questions),
  check ((rule_set->'rules'->>'totalDurationSeconds')::integer = total_duration_seconds)
);

alter table public.exam_rule_sets enable row level security;
revoke all on table public.exam_rule_sets from public, anon, authenticated, service_role;
grant select, insert on table public.exam_rule_sets to service_role;

create or replace function public.prevent_exam_rule_set_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'exam_rule_set_is_immutable';
end;
$function$;

drop trigger if exists exam_rule_sets_no_update_delete on public.exam_rule_sets;
create trigger exam_rule_sets_no_update_delete
before update or delete on public.exam_rule_sets
for each row execute function public.prevent_exam_rule_set_mutation();

insert into public.exam_rule_sets (
  rule_set_id,
  exam_id,
  version,
  verification_status,
  total_questions,
  total_duration_seconds,
  rule_set,
  rule_set_sha256,
  source_repo_path
)
select
  'neet-pg:2026@1',
  'neet-pg',
  1,
  'verified',
  180,
  12600,
  r.rule_set,
  pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(r.rule_set::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  ),
  'data/exam-rules.json'
from (
  select $ruleset$
{
  "examId": "neet-pg",
  "ruleSetId": "neet-pg:2026@1",
  "version": 1,
  "supersedes": null,
  "label": "NEET-PG 2026 published examination scheme",
  "session": "2026",
  "effectiveFrom": "2026-07-01",
  "effectiveUntil": null,
  "verification": {
    "status": "verified",
    "verifiedBy": "medical-learning-os-maintainer",
    "verifiedDate": "2026-09-27",
    "notes": "Verified against the NBEMS NEET-PG 2026 Information Bulletin, Scheme of NEET-PG 2026, clauses 5.1-5.7 (pages 32-34). The simulator preset represents the published examination scheme. The bulletin itself preserves an operational caveat that the actual number of time-restricted sections may vary based on total question count and operational feasibility. timeCarryForwardAllowed=false is derived from the explicit requirements that candidates cannot proceed before the prior section's allotted time is complete and that the next section starts automatically when that time completes."
  },
  "caveats": [
    "The NBEMS bulletin states that the actual number of time-restricted sections may vary based on the total number of questions and operational feasibility; this preset represents the published five-section scheme.",
    "timeCarryForwardAllowed=false is derived from the fixed section timer, prohibition on early section advance, and automatic start of the next section after the prior section's allotted time ends."
  ],
  "sources": [
    {
      "sourceId": "nbems:neet-pg:2026:information-bulletin-v2.1",
      "title": "NEET-PG 2026 Information Bulletin 01-07-2026 v2.1",
      "authority": "National Board of Examinations in Medical Sciences (NBEMS)",
      "url": "https://drive.google.com/file/d/1WmFcaFZhEAaRFrBBgTGUENX81cQwQkVT/view?usp=sharing",
      "publishedDate": "2026-07-01",
      "kind": "official"
    },
    {
      "sourceId": "nbems:neet-pg:official-exam-page:2026",
      "title": "NBEMS NEET-PG official examination page",
      "authority": "National Board of Examinations in Medical Sciences (NBEMS)",
      "url": "https://www.natboard.edu.in/viewnbeexam?exam=neetpg",
      "publishedDate": "2026-07-01",
      "kind": "official"
    }
  ],
  "rules": {
    "deliveryMode": "computer_based",
    "itemType": "single_best_answer",
    "totalQuestions": 180,
    "totalDurationSeconds": 12600,
    "sections": [
      {
        "sectionId": "A",
        "label": "Group A",
        "questionCount": 36,
        "durationSeconds": 2520
      },
      {
        "sectionId": "B",
        "label": "Group B",
        "questionCount": 36,
        "durationSeconds": 2520
      },
      {
        "sectionId": "C",
        "label": "Group C",
        "questionCount": 36,
        "durationSeconds": 2520
      },
      {
        "sectionId": "D",
        "label": "Group D",
        "questionCount": 36,
        "durationSeconds": 2520
      },
      {
        "sectionId": "E",
        "label": "Group E",
        "questionCount": 36,
        "durationSeconds": 2520
      }
    ],
    "scoring": {
      "correct": 4,
      "incorrect": -1,
      "unanswered": 0,
      "markedForReviewScored": true
    },
    "navigation": {
      "earlySectionAdvanceAllowed": false,
      "revisitClosedSectionsAllowed": false,
      "timeCarryForwardAllowed": false,
      "reviewWithinOpenSectionAllowed": true
    }
  }
}
$ruleset$::jsonb as rule_set
) r;

create or replace function public.exam_mock_readiness(
  p_rule_set_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_rule public.exam_rule_sets%rowtype;
  v_catalog_version integer;
  v_required integer;
  v_eligible integer;
  v_shortage integer;
begin
  if char_length(btrim(coalesce(p_rule_set_id, ''))) < 1 then
    raise exception using errcode = '22023', message = 'exam_rule_set_required';
  end if;

  select * into v_rule
  from public.exam_rule_sets
  where rule_set_id = btrim(p_rule_set_id)
    and verification_status = 'verified';

  if v_rule.rule_set_id is null then
    raise exception using errcode = '22023', message = 'exam_rule_set_not_available';
  end if;

  select c.version into v_catalog_version
  from public.study_catalog c
  where c.id = 1;

  if v_catalog_version is null then
    raise exception using errcode = '55000', message = 'study_catalog_unavailable';
  end if;

  with published as (
    select q
    from public.study_catalog c
    cross join lateral jsonb_array_elements(coalesce(c.body->'questions', '[]'::jsonb)) q
    where c.id = 1
      and q->>'status' = 'published'
      and nullif(q->>'publishedAt', '') is not null
      and nullif(q->>'questionId', '') is not null
      and nullif(q->>'questionVersionId', '') is not null
      and nullif(q->>'answerOptionId', '') is not null
      and jsonb_typeof(q->'options') = 'array'
      and jsonb_array_length(q->'options') >= 2
      and exists (
        select 1
        from jsonb_array_elements(coalesce(q->'conceptLinks', '[]'::jsonb)) link
        where link->>'role' = 'primary'
          and nullif(link->>'conceptId', '') is not null
      )
  ),
  ranked as (
    select
      q,
      row_number() over (
        partition by q->>'questionId'
        order by
          case when (q->>'version') ~ '^[0-9]+$'
            then (q->>'version')::integer
            else 0
          end desc,
          q->>'questionVersionId' desc
      ) as rn
    from published
  )
  select count(*)::integer into v_eligible
  from ranked
  where rn = 1;

  v_required := v_rule.total_questions;
  v_shortage := greatest(0, v_required - v_eligible);

  return jsonb_build_object(
    'contractId', 'exam-mock-readiness-v1',
    'ruleSetId', v_rule.rule_set_id,
    'examId', v_rule.exam_id,
    'ruleSetSha256', v_rule.rule_set_sha256,
    'catalogVersion', v_catalog_version,
    'requiredUniqueQuestions', v_required,
    'eligibleUniqueQuestions', v_eligible,
    'shortage', v_shortage,
    'ready', v_shortage = 0,
    'blockers',
      case
        when v_shortage > 0
          then jsonb_build_array('insufficient-unique-published-questions')
        else '[]'::jsonb
      end,
    'eligibility', jsonb_build_object(
      'policyId', 'published-distinct-question-v1',
      'publishedOnly', true,
      'publicationGateCarriesReviewAssurance', true,
      'distinctStableQuestionIdsRequired', true,
      'multiplePublishedVersionsCountOnce', true
    ),
    'assembly', jsonb_build_object(
      'policyId', 'distinct-published-randomized-v1',
      'contentMixFidelity', 'unstratified-reviewed-pool',
      'examBlueprintFidelity', false,
      'note', 'Timing and navigation can be rule-faithful even when content-mix blueprint fidelity is not established.'
    )
  );
end;
$function$;

revoke all on function public.exam_mock_readiness(text)
  from public, anon, authenticated;
grant execute on function public.exam_mock_readiness(text)
  to service_role;

create or replace function public.exam_assemble_mock(
  p_rule_set_id text,
  p_seed text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_rule public.exam_rule_sets%rowtype;
  v_catalog_version integer;
  v_required integer;
  v_ids jsonb;
  v_count integer;
begin
  if char_length(btrim(coalesce(p_rule_set_id, ''))) < 1 then
    raise exception using errcode = '22023', message = 'exam_rule_set_required';
  end if;
  if char_length(btrim(coalesce(p_seed, ''))) < 8 or char_length(p_seed) > 200 then
    raise exception using errcode = '22023', message = 'invalid_exam_assembly_seed';
  end if;

  select * into v_rule
  from public.exam_rule_sets
  where rule_set_id = btrim(p_rule_set_id)
    and verification_status = 'verified';

  if v_rule.rule_set_id is null then
    raise exception using errcode = '22023', message = 'exam_rule_set_not_available';
  end if;

  select c.version into v_catalog_version
  from public.study_catalog c
  where c.id = 1;

  if v_catalog_version is null then
    raise exception using errcode = '55000', message = 'study_catalog_unavailable';
  end if;

  v_required := v_rule.total_questions;

  with published as (
    select q
    from public.study_catalog c
    cross join lateral jsonb_array_elements(coalesce(c.body->'questions', '[]'::jsonb)) q
    where c.id = 1
      and q->>'status' = 'published'
      and nullif(q->>'publishedAt', '') is not null
      and nullif(q->>'questionId', '') is not null
      and nullif(q->>'questionVersionId', '') is not null
      and nullif(q->>'answerOptionId', '') is not null
      and jsonb_typeof(q->'options') = 'array'
      and jsonb_array_length(q->'options') >= 2
      and exists (
        select 1
        from jsonb_array_elements(coalesce(q->'conceptLinks', '[]'::jsonb)) link
        where link->>'role' = 'primary'
          and nullif(link->>'conceptId', '') is not null
      )
  ),
  ranked as (
    select
      q,
      row_number() over (
        partition by q->>'questionId'
        order by
          case when (q->>'version') ~ '^[0-9]+$'
            then (q->>'version')::integer
            else 0
          end desc,
          q->>'questionVersionId' desc
      ) as rn
    from published
  ),
  eligible as (
    select q->>'questionVersionId' as question_version_id
    from ranked
    where rn = 1
  ),
  chosen as (
    select question_version_id
    from eligible
    order by
      pg_catalog.encode(
        extensions.digest(
          pg_catalog.convert_to(
            btrim(p_seed) || ':' || question_version_id,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      ),
      question_version_id
    limit v_required
  )
  select
    count(*)::integer,
    coalesce(jsonb_agg(question_version_id order by question_version_id), '[]'::jsonb)
  into v_count, v_ids
  from chosen;

  if v_count < v_required then
    return jsonb_build_object(
      'contractId', 'exam-mock-assembly-v1',
      'ruleSetId', v_rule.rule_set_id,
      'examId', v_rule.exam_id,
      'catalogVersion', v_catalog_version,
      'policyId', 'distinct-published-randomized-v1',
      'ready', false,
      'requiredUniqueQuestions', v_required,
      'assembledQuestions', v_count,
      'shortage', v_required - v_count,
      'questionVersionIds', '[]'::jsonb,
      'blockers', jsonb_build_array('insufficient-unique-published-questions'),
      'examBlueprintFidelity', false
    );
  end if;

  return jsonb_build_object(
    'contractId', 'exam-mock-assembly-v1',
    'ruleSetId', v_rule.rule_set_id,
    'examId', v_rule.exam_id,
    'ruleSetSha256', v_rule.rule_set_sha256,
    'catalogVersion', v_catalog_version,
    'policyId', 'distinct-published-randomized-v1',
    'ready', true,
    'requiredUniqueQuestions', v_required,
    'assembledQuestions', v_count,
    'shortage', 0,
    'questionVersionIds', v_ids,
    'examBlueprintFidelity', false,
    'contentMixFidelity', 'unstratified-reviewed-pool'
  );
end;
$function$;

revoke all on function public.exam_assemble_mock(text, text)
  from public, anon, authenticated;
grant execute on function public.exam_assemble_mock(text, text)
  to service_role;
