-- Extends existing content and learner ledgers; no new learner table or erased material.
alter table public.content_library_question_metadata add column intelligence jsonb;
alter table public.study_sessions add column question_presentations jsonb not null default '{}'::jsonb;
alter table public.study_attempts add column presentation jsonb not null default '{"representation":"original"}'::jsonb;

create function public.question_intelligence_fields_v1(p_value jsonb,p_keys text[]) returns void language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(p_value) is distinct from 'object' or (select array_agg(k order by k) from jsonb_object_keys(p_value) k) is distinct from (select array_agg(k order by k) from unnest(p_keys) k) then raise exception 'intelligence_fields_invalid'; end if;
end; $$;
create function public.question_intelligence_validate_v1(p_q jsonb,p_m jsonb) returns void language plpgsql set search_path='' as $$
#variable_conflict use_column
declare d jsonb; f jsonb; k text; v text:=coalesce(p_q->>'questionVersionId',(p_q->>'questionId')||'@1');
begin
 perform public.question_intelligence_fields_v1(p_m,array['primaryTask','qualifiers','presentation','responseFormat','reasoningOperations','sourceQuestionVersionId','derivatives']);
 if coalesce(p_m->>'primaryTask','') <> all(array['recall','classification','mechanism','etiology','risk-factor','association','clinical-feature','diagnosis','differential','localization','investigation-selection','interpretation','next-best-step','treatment-selection','emergency-priority','treatment-sequence','complication','prognosis','prevention-screening','drug-safety','quantitative-reasoning','evidence-interpretation','ethics-communication-safety','longitudinal-management']) or p_m->>'responseFormat' is distinct from 'single-best-answer' then raise exception 'unsupported_task_or_response'; end if;
 foreach k in array array['qualifiers','presentation','reasoningOperations'] loop
  perform public.content_library_strings(p_m->k);
  if jsonb_array_length(p_m->k)>40 then raise exception 'intelligence_tags_invalid'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements_text(p_m->'qualifiers') x where x <> all(array['initial','confirmatory','most-accurate','reference-standard','definitive','first-line','drug-choice','treatment-failure','follow-up','special-population','adverse-effect','contraindication','interaction','discriminating-clue','except','most-common'])) or exists(select 1 from jsonb_array_elements_text(p_m->'presentation') x where x <> all(array['one-line','clinical-vignette','experimental-vignette','chart','lab-panel','graph','table','image','ecg-tracing','histology','audio','video','sequential-case'])) then raise exception 'intelligence_tags_invalid'; end if;
 if p_m->>'sourceQuestionVersionId' is distinct from v then raise exception 'stale_source_version'; end if;
 if jsonb_typeof(p_m->'derivatives') is distinct from 'array' or jsonb_array_length(p_m->'derivatives')>10 then raise exception 'derivatives_invalid'; end if;
 if jsonb_array_length(p_m->'derivatives')>0 and exists(select 1 from jsonb_array_elements_text(p_m->'presentation') x where x in ('image','ecg-tracing','histology','audio','video','sequential-case')) then raise exception 'media_derivative_requires_asset_contract'; end if;
 if (select count(*) from jsonb_array_elements(p_m->'derivatives'))<>(select count(distinct x->>'variantId') from jsonb_array_elements(p_m->'derivatives') x) then raise exception 'variant_identity_invalid'; end if;
 for d in select value from jsonb_array_elements(p_m->'derivatives') loop
  perform public.question_intelligence_fields_v1(d,array['variantId','version','representation','sourceQuestionVersionId','stem','options','answerOptionId','protectedFacts','removedFacts','validationChecks']);
  if coalesce(d->>'variantId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or jsonb_typeof(d->'version') is distinct from 'number' or coalesce(d->>'version','') !~ '^[0-9]+$' or (d->>'version')::numeric not between 1 and 9007199254740991 then raise exception 'variant_identity_invalid'; end if;
  if coalesce(d->>'representation','') not in ('concise-practice','revision-cue') or d->>'sourceQuestionVersionId' is distinct from v or jsonb_typeof(d->'stem') is distinct from 'string' or char_length(btrim(d->>'stem')) not between 1 and 100000 then raise exception 'variant_invalid'; end if;
  if d->'options' is distinct from p_q->'options' or d->>'answerOptionId' is distinct from p_q->>'answerOptionId' then raise exception 'variant_options_key_changed'; end if;
  perform public.content_library_strings(d->'protectedFacts');
  if jsonb_array_length(d->'protectedFacts') not between 1 and 40 or exists(select 1 from jsonb_array_elements_text(d->'protectedFacts') f where strpos(p_q->>'stem',f)=0 or strpos(d->>'stem',f)=0) then raise exception 'protected_fact_lost'; end if;
  if jsonb_typeof(d->'removedFacts') is distinct from 'array' or jsonb_array_length(d->'removedFacts')>100 then raise exception 'removal_evidence_invalid'; end if;
  for f in select value from jsonb_array_elements(d->'removedFacts') loop
   perform public.question_intelligence_fields_v1(f,array['text','reason']);
   if jsonb_typeof(f->'text') is distinct from 'string' or jsonb_typeof(f->'reason') is distinct from 'string' or char_length(btrim(f->>'text')) not between 1 and 4000 or char_length(btrim(f->>'reason')) not between 1 and 4000 or strpos(p_q->>'stem',f->>'text')=0 then raise exception 'removal_evidence_invalid'; end if;
  end loop;
  perform public.question_intelligence_fields_v1(d->'validationChecks',array['decision-facts','polarity-timing','options-key','media-units','task-qualifiers','distractor-logic','reasoning-demand','no-answer-leakage']);
  foreach k in array array['decision-facts','polarity-timing','options-key','media-units','task-qualifiers','distractor-logic','reasoning-demand','no-answer-leakage'] loop
   f:=d->'validationChecks'->k; perform public.question_intelligence_fields_v1(f,array['passed','evidence']);
   if f->'passed' is distinct from 'true'::jsonb or jsonb_typeof(f->'evidence') is distinct from 'string' or char_length(btrim(f->>'evidence')) not between 1 and 4000 then raise exception 'compression_gate_failed'; end if;
  end loop;
 end loop;
end; $$;

-- Reuse the established v1 checks/publication transaction without copying its implementation.
alter function public.content_library_validate_v1(jsonb) rename to content_library_validate_legacy_v1;
create function public.content_library_validate_v1(p_m jsonb) returns void language plpgsql set search_path='' as $$
#variable_conflict use_column
declare q jsonb; v_m jsonb;
begin
 if p_m->'schemaVersion'='1'::jsonb then perform public.content_library_validate_legacy_v1(p_m); return; end if;
 if p_m->'schemaVersion' is distinct from '2'::jsonb or octet_length(p_m::text)>1048576 then raise exception 'schema_version_invalid'; end if;
 for q in select value from jsonb_array_elements(p_m->'questions') loop
  if q ? 'intelligence' then
   perform public.question_intelligence_validate_v1(q,q->'intelligence');
   if exists(select 1 from jsonb_array_elements_text(q->'intelligence'->'presentation') x where x in ('image','ecg-tracing','histology','audio','video','sequential-case')) then raise exception 'media_import_requires_asset_contract'; end if;
  end if;
 end loop;
 v_m:=jsonb_set(p_m,'{schemaVersion}','1');
 v_m:=jsonb_set(v_m,'{questions}',(select coalesce(jsonb_agg(q-'intelligence'),'[]') from jsonb_array_elements(p_m->'questions') q));
 perform public.content_library_validate_legacy_v1(v_m);
end; $$;

alter function public.content_library_review_publish_v1(text,uuid,text,jsonb,text,boolean) rename to content_library_review_publish_legacy_v1;
create function public.content_library_review_publish_v1(p_import_id text,p_reviewer uuid,p_expected_digest text,p_rights_decisions jsonb,p_review_notes text,p_attested boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare r jsonb; m jsonb; x jsonb; q jsonb; old jsonb; v_id text; already boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 select manifest,status='published' into m,already from public.content_library_imports where import_id=p_import_id for update;
 r:=public.content_library_review_publish_legacy_v1(p_import_id,p_reviewer,p_expected_digest,p_rights_decisions,p_review_notes,p_attested);
 if already then return r; end if;
 for x in select value from jsonb_array_elements(m->'questions') loop
  if not (x ? 'intelligence') then continue; end if;
  v_id:=r->'questionMap'->>(x->>'questionId');
  select item into q from public.study_catalog c cross join lateral jsonb_array_elements(c.body->'questions') item where c.id=1 and item->>'questionId'=v_id and item->>'status'='published' order by (item->>'version')::integer desc limit 1;
  perform public.question_intelligence_validate_v1(q,x->'intelligence');
  select intelligence into old from public.content_library_question_metadata where question_id=v_id for update;
  if old is not null and ((old-'derivatives') is distinct from (x->'intelligence'-'derivatives') or exists(select 1 from jsonb_array_elements(old->'derivatives') old_d where not exists(select 1 from jsonb_array_elements(x->'intelligence'->'derivatives') new_d where old_d=new_d))) then raise exception 'intelligence_version_conflict'; end if;
  update public.content_library_question_metadata set intelligence=x->'intelligence' where question_id=v_id;
 end loop;
 return r;
end; $$;

create function public.study_start_library_session_v2(p_learner uuid,p_id uuid,p_ids jsonb,p_started timestamptz,p_variants jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare r jsonb; q jsonb; m jsonb; d jsonb; k text; snapshots jsonb:='{}';
begin
 if p_learner is null or jsonb_typeof(p_ids) is distinct from 'array' or jsonb_array_length(p_ids) not between 1 and 50 or jsonb_typeof(p_variants) is distinct from 'object' then raise exception 'question_selection_invalid'; end if;
 if (select count(*) from jsonb_array_elements_text(p_ids))<>(select count(distinct id) from jsonb_array_elements_text(p_ids) id) or exists(select 1 from jsonb_object_keys(p_variants) k where not p_ids ? k) then raise exception 'question_selection_invalid'; end if;
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 for k in select jsonb_array_elements_text(p_ids) loop
  select item into q from public.study_catalog c cross join lateral jsonb_array_elements(c.body->'questions') item where c.id=1 and item->>'questionVersionId'=k and item->>'status'='published';
  if q is null then raise exception 'question_selection_invalid'; end if;
  if p_variants ? k then
   select intelligence into m from public.content_library_question_metadata where question_id=q->>'questionId';
   if m is null then raise exception 'variant_unavailable'; end if;
   perform public.question_intelligence_validate_v1(q,m);
   select item into d from jsonb_array_elements(m->'derivatives') item where item->>'variantId'=p_variants->>k and item->>'representation'='concise-practice';
   if d is null then raise exception 'variant_unavailable'; end if;
   snapshots:=snapshots||jsonb_build_object(k,jsonb_build_object('representation','concise-practice','variantId',d->>'variantId','variantVersion',d->'version','sourceQuestionId',q->>'questionId','sourceQuestionVersionId',k,'stem',d->>'stem','options',d->'options','primaryTask',m->>'primaryTask','qualifiers',m->'qualifiers'));
  end if;
 end loop;
 r:=public.study_start_session(p_learner,p_id,p_ids,p_started);
 if r->>'id'=p_id::text then update public.study_sessions set question_presentations=snapshots where id=p_id and learner_id=p_learner; end if;
 return r;
end; $$;

create function public.study_bind_question_presentation_v1() returns trigger language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s public.study_sessions%rowtype; p jsonb; q jsonb;
begin
 select * into s from public.study_sessions where id=new.session_id and learner_id=new.learner_id for update;
 if not found then raise exception 'session_not_found'; end if;
 p:=s.question_presentations->(new.event->>'questionVersionId');
 select item into q from public.study_catalog c cross join lateral jsonb_array_elements(c.body->'questions') item where c.id=1 and item->>'questionVersionId'=new.event->>'questionVersionId';
 new.presentation:=coalesce(p,jsonb_build_object('representation','original','sourceQuestionId',q->>'questionId','sourceQuestionVersionId',new.event->>'questionVersionId'));
 select intelligence into p from public.content_library_question_metadata where question_id=q->>'questionId' and intelligence->>'sourceQuestionVersionId'=q->>'questionVersionId';
 if p is not null then new.presentation:=new.presentation||jsonb_build_object('primaryTask',p->>'primaryTask','qualifiers',p->'qualifiers','reasoningOperations',p->'reasoningOperations'); end if;
 new.receipt:=new.receipt||jsonb_build_object('presentation',new.presentation,'revisionCues',coalesce((select jsonb_agg(jsonb_build_object('variantId',d->>'variantId','version',d->'version','stem',d->>'stem')) from jsonb_array_elements(coalesce(p->'derivatives','[]')) d where d->>'representation'='revision-cue'),'[]'::jsonb));
 return new;
end; $$;
create trigger study_attempt_presentation before insert on public.study_attempts for each row execute function public.study_bind_question_presentation_v1();
create function public.study_protect_question_presentations_v1() returns trigger language plpgsql set search_path='' as $$
begin
 if new.question_presentations is distinct from old.question_presentations and (old.question_presentations<>'{}'::jsonb or exists(select 1 from public.study_attempts where session_id=old.id)) then raise exception 'immutable_session_presentation'; end if;
 return new;
end; $$;
create trigger study_session_presentation_immutable before update on public.study_sessions for each row execute function public.study_protect_question_presentations_v1();

create or replace function public.study_rebuild_revision_state(
  p_learner uuid,
  p_question_version_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_projected integer := 0;
begin
  if p_learner is null then
    raise exception using errcode = '22023', message = 'learner_required';
  end if;
  if p_question_version_id is not null
     and p_question_version_id !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode = '22023', message = 'invalid_question_version_id';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_learner::text, 0)
  );

  if exists (
    select 1
    from public.study_attempts a
    where a.learner_id = p_learner and a.presentation->>'representation' = 'original'
      and (p_question_version_id is null
        or a.event->>'questionVersionId' = p_question_version_id)
    group by a.event->>'questionVersionId'
    having pg_catalog.count(distinct a.event->>'conceptId') <> 1
  ) then
    raise exception using errcode = '22023', message = 'revision_evidence_concept_conflict';
  end if;

  if p_question_version_id is null then
    delete from public.study_revision_state
    where learner_id = p_learner;
  else
    delete from public.study_revision_state
    where learner_id = p_learner
      and question_version_id = p_question_version_id;
  end if;

  with evidence as (
    select
      a.id as event_id,
      a.event->>'questionVersionId' as question_version_id,
      a.event->>'conceptId' as concept_id,
      (a.event->>'occurredAt')::timestamptz as occurred_at,
      (a.event->>'correct')::boolean as correct,
      (a.event->>'durationMs')::bigint as duration_ms
    from public.study_attempts a
    where a.learner_id = p_learner and a.presentation->>'representation' = 'original'
      and (p_question_version_id is null
        or a.event->>'questionVersionId' = p_question_version_id)
  ),
  ordered as (
    select
      e.*,
      pg_catalog.row_number() over (
        partition by e.question_version_id
        order by e.occurred_at desc, e.event_id desc
      ) as reverse_position
    from evidence e
  ),
  aggregated as (
    select
      o.question_version_id,
      pg_catalog.min(o.concept_id) as concept_id,
      pg_catalog.count(*)::integer as attempts,
      pg_catalog.count(*) filter (where o.correct)::integer as correct_count,
      pg_catalog.count(*) filter (where not o.correct)::integer as incorrect_count,
      (pg_catalog.array_agg(o.correct order by o.occurred_at desc, o.event_id desc))[1] as latest_correct,
      pg_catalog.min(o.occurred_at) as first_attempt_at,
      pg_catalog.max(o.occurred_at) as last_attempt_at,
      (pg_catalog.array_agg(o.duration_ms order by o.occurred_at desc, o.event_id desc))[1] as last_duration_ms,
      (pg_catalog.array_agg(o.event_id order by o.occurred_at desc, o.event_id desc))[1] as evidence_last_event_id,
      pg_catalog.min(o.reverse_position) filter (where not o.correct) as first_recent_incorrect_position
    from ordered o
    group by o.question_version_id
  ),
  projected as (
    select
      a.*,
      case
        when not a.latest_correct then 0
        when a.first_recent_incorrect_position is null then a.attempts
        else (a.first_recent_incorrect_position - 1)::integer
      end as consecutive_correct
    from aggregated a
  )
  insert into public.study_revision_state (
    learner_id,
    question_version_id,
    concept_id,
    attempts,
    correct,
    incorrect,
    consecutive_correct,
    latest_correct,
    first_attempt_at,
    last_attempt_at,
    last_duration_ms,
    policy_id,
    policy_version,
    due_at,
    projection_version,
    evidence_event_count,
    evidence_last_event_id,
    projected_at
  )
  select
    p_learner,
    p.question_version_id,
    p.concept_id,
    p.attempts,
    p.correct_count,
    p.incorrect_count,
    p.consecutive_correct,
    p.latest_correct,
    p.first_attempt_at,
    p.last_attempt_at,
    p.last_duration_ms,
    'bootstrap-binary-v1',
    1,
    p.last_attempt_at +
      case
        when not p.latest_correct then interval '10 minutes'
        when p.consecutive_correct <= 1 then interval '1 day'
        when p.consecutive_correct = 2 then interval '3 days'
        when p.consecutive_correct = 3 then interval '7 days'
        when p.consecutive_correct = 4 then interval '14 days'
        else interval '30 days'
      end,
    1,
    p.attempts,
    p.evidence_last_event_id,
    pg_catalog.now()
  from projected p;

  get diagnostics v_projected = row_count;

  return pg_catalog.jsonb_build_object(
    'learnerId', p_learner,
    'questionVersionId', p_question_version_id,
    'projected', v_projected,
    'policyId', 'bootstrap-binary-v1',
    'policyVersion', 1,
    'projectionVersion', 1
  );
end;
$function$;

create or replace function public.content_library_observations_v1(p_learner uuid) returns jsonb language sql stable security definer set search_path='' as $$
with observations as (
 select q->>'questionId' question_id,(a.event->>'correct')::boolean correct,a.recorded_at,a.id,
 row_number() over(partition by q->>'questionId' order by a.recorded_at desc,a.id desc) rn
 from public.study_attempts a join public.study_catalog c on c.id=1
 cross join lateral jsonb_array_elements(c.body->'questions') q
 where a.learner_id=p_learner and a.presentation->>'representation' = 'original' and q->>'questionVersionId'=a.event->>'questionVersionId'
), summary as (
 select question_id,count(*) attempts,count(*) filter(where correct=false) wrong,bool_or(correct) filter(where rn=1) latest_correct from observations group by question_id
) select coalesce(jsonb_agg(to_jsonb(s) order by question_id),'[]') from summary s;
$$;

-- All public functions are backend-only, including internal validation helpers.

revoke all on function public.question_intelligence_fields_v1(jsonb,text[]) from public,anon,authenticated;
grant execute on function public.question_intelligence_fields_v1(jsonb,text[]) to service_role;

revoke all on function public.question_intelligence_validate_v1(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.question_intelligence_validate_v1(jsonb,jsonb) to service_role;

revoke all on function public.content_library_validate_v1(jsonb) from public,anon,authenticated;
grant execute on function public.content_library_validate_v1(jsonb) to service_role;

revoke all on function public.content_library_validate_legacy_v1(jsonb) from public,anon,authenticated;
grant execute on function public.content_library_validate_legacy_v1(jsonb) to service_role;

revoke all on function public.content_library_review_publish_v1(text,uuid,text,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.content_library_review_publish_v1(text,uuid,text,jsonb,text,boolean) to service_role;

revoke all on function public.content_library_review_publish_legacy_v1(text,uuid,text,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.content_library_review_publish_legacy_v1(text,uuid,text,jsonb,text,boolean) to service_role;

revoke all on function public.study_start_library_session_v2(uuid,uuid,jsonb,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.study_start_library_session_v2(uuid,uuid,jsonb,timestamptz,jsonb) to service_role;

revoke all on function public.study_bind_question_presentation_v1() from public,anon,authenticated;
grant execute on function public.study_bind_question_presentation_v1() to service_role;

revoke all on function public.study_protect_question_presentations_v1() from public,anon,authenticated;
grant execute on function public.study_protect_question_presentations_v1() to service_role;

-- Return the actual trigger-bound receipt on first attempt as well as retries.
alter function public.study_record_attempt(uuid,uuid,text,integer,text,jsonb,jsonb) rename to study_record_attempt_legacy_v1;
create function public.study_record_attempt(p_learner uuid,p_session uuid,p_request_key text,p_position integer,p_option text,p_event jsonb,p_receipt jsonb)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare r jsonb; stored jsonb;
begin
 r:=public.study_record_attempt_legacy_v1(p_learner,p_session,p_request_key,p_position,p_option,p_event,p_receipt);
 if r ? 'error' then return r; end if;
 select receipt into stored from public.study_attempts where learner_id=p_learner and request_key=p_request_key;
 return jsonb_build_object('receipt',stored);
end; $$;
revoke all on function public.study_record_attempt(uuid,uuid,text,integer,text,jsonb,jsonb),public.study_record_attempt_legacy_v1(uuid,uuid,text,integer,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.study_record_attempt(uuid,uuid,text,integer,text,jsonb,jsonb),public.study_record_attempt_legacy_v1(uuid,uuid,text,integer,text,jsonb,jsonb) to service_role;

create or replace function public.study_learning_event_stream_v2(
  p_learner uuid,
  p_limit integer default 500,
  p_after_recorded_at timestamptz default null,
  p_after_event_key text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_events jsonb;
  v_count integer;
  v_has_more boolean;
  v_last_recorded_at timestamptz;
  v_last_event_key text;
begin
  if p_learner is null then
    raise exception using errcode='22023', message='learning_event_stream_learner_required';
  end if;

  if p_limit is null or p_limit<1 or p_limit>5000 then
    raise exception using errcode='22023', message='learning_event_stream_limit_invalid';
  end if;

  if (p_after_recorded_at is null) <> (p_after_event_key is null) then
    raise exception using errcode='22023', message='learning_event_stream_cursor_invalid';
  end if;

  with all_events as (
    select
      'attempt:'||a.id::text as event_key,
      1::integer as schema_version,
      'question.answered'::text as family,
      'observation'::text as event_class,
      (a.event->>'occurredAt')::timestamptz as occurred_at,
      a.recorded_at,
      a.event->>'conceptId' as concept_id,
      a.event->>'questionVersionId' as question_version_id,
      a.session_id,
      'study_attempts'::text as source_table,
      a.id::text as source_id,
      a.event || jsonb_build_object('presentation',a.presentation) as payload
    from public.study_attempts a
    where a.learner_id=p_learner
      and a.event->>'type'='question.answered'
      and a.event->>'schemaVersion'='1'

    union all

    select
      'memory:'||m.id::text,
      1,
      'memory.rating',
      'self_report',
      m.recorded_at,
      m.recorded_at,
      a.event->>'conceptId',
      m.question_version_id,
      a.session_id,
      'study_memory_judgments',
      m.id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','memory.rating',
        'eventId',m.id,
        'attemptId',m.attempt_id,
        'questionVersionId',m.question_version_id,
        'conceptId',a.event->>'conceptId',
        'rating',m.rating,
        'ratingLabel',case m.rating when 1 then 'Again' when 2 then 'Hard' when 3 then 'Good' when 4 then 'Easy' end,
        'scaleId',m.scale_id,
        'promptId',m.prompt_id,
        'occurredAt',m.recorded_at
      )
    from public.study_memory_judgments m
    join public.study_attempts a
      on a.id=m.attempt_id and a.learner_id=m.learner_id
    where m.learner_id=p_learner

    union all

    select
      'recommendation:'||r.id::text,
      1,
      'study.recommendation_generated',
      'policy_decision',
      r.created_at,
      r.created_at,
      null::text,
      null::text,
      r.session_id,
      'study_recommendation_events',
      r.id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','study.recommendation_generated',
        'eventId',r.id,
        'sessionId',r.session_id,
        'strategy',r.strategy,
        'availableMinutes',r.available_minutes,
        'plan',r.plan,
        'occurredAt',r.created_at
      )
    from public.study_recommendation_events r
    where r.learner_id=p_learner

    union all

    select
      'retention-assignment:'||a.assignment_id::text,
      1,
      'research.retention_probe_assigned',
      'research_policy_decision',
      a.scheduled_at,
      a.scheduled_at,
      a.concept_id,
      a.target_question_version_id,
      null::uuid,
      'study_retention_probe_assignments',
      a.assignment_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_assigned',
        'assignmentId',a.assignment_id,
        'protocolId',a.protocol_id,
        'activationEventId',a.activation_event_id,
        'pairValidationId',a.pair_validation_id,
        'originAttemptId',a.origin_attempt_id,
        'originQuestionVersionId',a.origin_question_version_id,
        'targetQuestionVersionId',a.target_question_version_id,
        'windowOpenAt',a.window_open_at,
        'windowCloseAt',a.window_close_at,
        'occurredAt',a.scheduled_at
      )
    from public.study_retention_probe_assignments a
    where a.learner_id=p_learner

    union all

    select
      'retention-served:'||s.served_event_id::text,
      1,
      'research.retention_probe_server_served',
      'delivery_observation',
      s.served_at,
      s.recorded_at,
      a.concept_id,
      s.target_question_version_id,
      null::uuid,
      'study_retention_probe_served_events',
      s.served_event_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_server_served',
        'servedEventId',s.served_event_id,
        'assignmentId',s.assignment_id,
        'targetQuestionVersionId',s.target_question_version_id,
        'targetMedicalSha256',s.target_medical_sha256,
        'catalogVersion',s.catalog_version,
        'learnerQuestionSha256',s.learner_question_sha256,
        'serverServed',true,
        'learnerRenderedConfirmed',false,
        'learnerViewedConfirmed',false,
        'occurredAt',s.served_at
      )
    from public.study_retention_probe_served_events s
    join public.study_retention_probe_assignments a
      on a.assignment_id=s.assignment_id
    where s.learner_id=p_learner

    union all

    select
      'retention-response-binding:'||b.binding_id::text,
      1,
      'research.retention_probe_response_bound',
      'evidence_link',
      b.responded_at,
      b.bound_at,
      a.concept_id,
      b.target_question_version_id,
      at.session_id,
      'study_retention_probe_response_bindings',
      b.binding_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_response_bound',
        'bindingId',b.binding_id,
        'servedEventId',b.served_event_id,
        'assignmentId',b.assignment_id,
        'attemptId',b.attempt_id,
        'targetQuestionVersionId',b.target_question_version_id,
        'correct',b.correct,
        'responseDurationMs',b.response_duration_ms,
        'cleanForPrimaryAnalysis',b.clean_for_primary_analysis,
        'contaminationReasons',b.contamination_reasons,
        'occurredAt',b.responded_at
      )
    from public.study_retention_probe_response_bindings b
    join public.study_retention_probe_assignments a
      on a.assignment_id=b.assignment_id
    join public.study_attempts at
      on at.id=b.attempt_id
    where b.learner_id=p_learner
  ),
  after_cursor as (
    select *
    from all_events
    where p_after_recorded_at is null
       or (recorded_at,event_key)>(p_after_recorded_at,p_after_event_key)
  ),
  ranked as (
    select *
    from after_cursor
    order by recorded_at,event_key
    limit p_limit+1
  ),
  page as (
    select *
    from ranked
    order by recorded_at,event_key
    limit p_limit
  ),
  last_row as (
    select recorded_at,event_key
    from page
    order by recorded_at desc,event_key desc
    limit 1
  )
  select
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'eventKey',event_key,
          'schemaVersion',schema_version,
          'family',family,
          'eventClass',event_class,
          'occurredAt',occurred_at,
          'recordedAt',recorded_at,
          'conceptId',concept_id,
          'questionVersionId',question_version_id,
          'sessionId',session_id,
          'source',pg_catalog.jsonb_build_object(
            'table',source_table,
            'id',source_id
          ),
          'payload',payload
        )
        order by recorded_at,event_key
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    (select count(*)>p_limit from ranked),
    (select recorded_at from last_row),
    (select event_key from last_row)
  into
    v_events,
    v_count,
    v_has_more,
    v_last_recorded_at,
    v_last_event_key
  from page;

  return pg_catalog.jsonb_build_object(
    'contractId','study-learning-event-stream-v2',
    'learnerId',p_learner,
    'ordering','recordedAt,eventKey',
    'eventCount',v_count,
    'hasMore',coalesce(v_has_more,false),
    'nextCursor',case
      when coalesce(v_has_more,false) and v_last_recorded_at is not null then
        pg_catalog.jsonb_build_object(
          'recordedAt',v_last_recorded_at,
          'eventKey',v_last_event_key
        )
      else null
    end,
    'includedFamilies',pg_catalog.jsonb_build_array(
      'question.answered',
      'memory.rating',
      'study.recommendation_generated',
      'research.retention_probe_assigned',
      'research.retention_probe_server_served',
      'research.retention_probe_response_bound'
    ),
    'serverServedMeansLearnerSeen',false,
    'inferenceAuthority',false,
    'masteryInferenceEnabled',false,
    'events',v_events
  );
end;
$function$;
