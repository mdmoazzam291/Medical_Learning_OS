-- M05d: optional immutable learner memory judgments.
-- Correctness/timing remain separate attempt evidence. This table captures only
-- explicit learner self-report on the FSRS-compatible four-grade scale.

create table if not exists public.study_memory_judgments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null,
  attempt_id uuid not null unique,
  question_version_id text not null,
  rating smallint not null check (rating between 1 and 4),
  scale_id text not null default 'fsrs-4-v1'
    check (scale_id = 'fsrs-4-v1'),
  prompt_id text not null default 'post-answer-recall-v1'
    check (prompt_id = 'post-answer-recall-v1'),
  recorded_at timestamptz not null default now(),
  constraint study_memory_judgments_attempt_fkey
    foreign key (attempt_id) references public.study_attempts(id)
);

create index if not exists study_memory_judgments_learner_recorded
  on public.study_memory_judgments (learner_id, recorded_at, id);

alter table public.study_memory_judgments enable row level security;

drop policy if exists study_memory_judgments_read_own
  on public.study_memory_judgments;
create policy study_memory_judgments_read_own
  on public.study_memory_judgments
  for select
  to authenticated
  using ((select auth.uid()) = learner_id);

revoke all on table public.study_memory_judgments
  from public, anon, authenticated;
grant select on table public.study_memory_judgments
  to authenticated;

create or replace function public.study_record_memory_judgment(
  p_learner uuid,
  p_attempt uuid,
  p_rating integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.study_attempts%rowtype;
  v_existing public.study_memory_judgments%rowtype;
  v_row public.study_memory_judgments%rowtype;
  v_label text;
begin
  if p_learner is null or p_attempt is null then
    raise exception using errcode = '22023', message = 'memory_judgment_identity_required';
  end if;
  if p_rating not between 1 and 4 then
    raise exception using errcode = '22023', message = 'memory_judgment_invalid_rating';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_learner::text, 0)
  );

  select * into v_attempt
  from public.study_attempts
  where id = p_attempt
    and learner_id = p_learner;

  if not found then
    return jsonb_build_object('error', 'attempt_not_found');
  end if;

  select * into v_existing
  from public.study_memory_judgments
  where attempt_id = p_attempt;

  if found then
    if v_existing.learner_id <> p_learner or v_existing.rating <> p_rating then
      return jsonb_build_object('error', 'conflicting_memory_judgment');
    end if;
    v_row := v_existing;
  else
    insert into public.study_memory_judgments (
      learner_id,
      attempt_id,
      question_version_id,
      rating
    ) values (
      p_learner,
      p_attempt,
      v_attempt.event->>'questionVersionId',
      p_rating
    )
    returning * into v_row;
  end if;

  v_label := case v_row.rating
    when 1 then 'Again'
    when 2 then 'Hard'
    when 3 then 'Good'
    when 4 then 'Easy'
  end;

  return jsonb_build_object(
    'schemaVersion', 1,
    'type', 'memory.rating',
    'id', v_row.id,
    'attemptId', v_row.attempt_id,
    'questionVersionId', v_row.question_version_id,
    'rating', v_row.rating,
    'ratingLabel', v_label,
    'scaleId', v_row.scale_id,
    'promptId', v_row.prompt_id,
    'recordedAt', v_row.recorded_at
  );
end;
$function$;

revoke all on function public.study_record_memory_judgment(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.study_record_memory_judgment(uuid, uuid, integer)
  to service_role;
