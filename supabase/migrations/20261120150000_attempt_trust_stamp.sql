-- ADR-149: attempt trust stamp (owner strategy 2026-11-20 14:58 IST).
-- Every attempt is stamped, in the same transaction, with how far the answer key of the exact question version
-- was trusted at that moment. Attempts themselves are unchanged and stay immutable. Derived views (mistakes,
-- revision, Study Now, FSRS, mastery) will use only trusted levels before Series 1 reaches all learners.
-- Levels:  reviewed       — published through the full medical/reference/rights review (normal content)
--          verified       — answer key verified after publication
--          ai-checked     — key agreed by an independent AI check, not yet verified
--          key-unverified — from a collection whose keys are unverified (Medretica QBank · Series 1)
--          key-disputed   — key under dispute (reports or answer statistics)
--          unknown        — trust could not be computed (never blocks the learner's answer)

create table if not exists public.question_key_verification_events (
  id uuid primary key default gen_random_uuid(),
  question_version_id text not null check (char_length(question_version_id) between 1 and 200),
  level text not null check (level in ('ai-checked', 'verified', 'key-disputed')),
  actor_kind text not null check (actor_kind in ('ai', 'admin', 'answer-statistics', 'learner-reports')),
  evidence text not null check (char_length(btrim(evidence)) between 1 and 4000),
  recorded_at timestamptz not null default now()
);
create index if not exists question_key_verification_events_version_idx on public.question_key_verification_events (question_version_id, recorded_at desc);
alter table public.question_key_verification_events enable row level security;
revoke all on table public.question_key_verification_events from public, anon, authenticated;
grant select, insert on table public.question_key_verification_events to service_role;
comment on table public.question_key_verification_events is 'Append-only answer-key trust decisions per exact question version (ADR-149). Service role only.';

create table if not exists public.study_attempt_trust (
  attempt_id uuid primary key references public.study_attempts(id) on delete cascade,
  learner_id uuid not null,
  question_version_id text,
  trust_level text not null check (trust_level in ('reviewed', 'verified', 'ai-checked', 'key-unverified', 'key-disputed', 'unknown')),
  basis text not null,
  policy_id text not null default 'attempt-trust-v1',
  stamped_at timestamptz not null default now()
);
create index if not exists study_attempt_trust_learner_idx on public.study_attempt_trust (learner_id, trust_level);
alter table public.study_attempt_trust enable row level security;
revoke all on table public.study_attempt_trust from public, anon, authenticated;
grant select on table public.study_attempt_trust to service_role;
comment on table public.study_attempt_trust is 'Trust stamp per attempt (ADR-149); written only by the insert trigger; erased with the attempt.';

-- Collections whose answer keys start unverified. Must match COLLECTIONS in src/domain/content-library.js (tested).
create or replace function public.question_key_trust_v1(p_question_version_id text, out trust_level text, out basis text)
language plpgsql stable security definer set search_path = '' as $$
declare v_question jsonb; v_latest text; v_origins jsonb;
begin
  select e.level into v_latest from public.question_key_verification_events e
   where e.question_version_id = p_question_version_id order by e.recorded_at desc, e.id desc limit 1;
  if v_latest is not null then trust_level := v_latest; basis := 'key-verification-event'; return; end if;
  select q into v_question from public.study_catalog c cross join lateral jsonb_array_elements(c.body->'questions') q
   where c.id = 1 and q->>'questionVersionId' = p_question_version_id limit 1;
  if v_question is null then trust_level := 'unknown'; basis := 'question-not-in-catalog'; return; end if;
  select m.origins into v_origins from public.content_library_question_metadata m where m.question_id = v_question->>'questionId';
  if exists (select 1 from jsonb_array_elements(coalesce(v_origins, '[]'::jsonb)) o
             where o->>'kind' = 'platform' and o->>'platformId' in ('medretica-qbank-s1')) then
    trust_level := 'key-unverified'; basis := 'collection:medretica-qbank-s1'; return;
  end if;
  trust_level := 'reviewed'; basis := 'full-question-review';
end; $$;

create or replace function public.study_stamp_attempt_trust_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_level text; v_basis text;
begin
  begin
    select t.trust_level, t.basis into v_level, v_basis from public.question_key_trust_v1(new.event->>'questionVersionId') t;
  exception when others then
    -- Never block the learner's answer: record that trust could not be computed.
    v_level := 'unknown'; v_basis := 'error:' || left(sqlerrm, 200);
  end;
  insert into public.study_attempt_trust (attempt_id, learner_id, question_version_id, trust_level, basis)
  values (new.id, new.learner_id, new.event->>'questionVersionId', coalesce(v_level, 'unknown'), coalesce(v_basis, 'missing'))
  on conflict (attempt_id) do nothing;
  return null;
end; $$;

drop trigger if exists study_attempt_trust_stamp on public.study_attempts;
create trigger study_attempt_trust_stamp after insert on public.study_attempts
  for each row execute function public.study_stamp_attempt_trust_v1();

-- No backfill: study_attempts was empty when this was written (checked 2026-11-20); every attempt from now on is stamped.

revoke all on function public.question_key_trust_v1(text) from public, anon, authenticated;
revoke all on function public.study_stamp_attempt_trust_v1() from public, anon, authenticated;
grant execute on function public.question_key_trust_v1(text) to service_role;
