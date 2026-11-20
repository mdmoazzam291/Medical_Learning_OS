-- ADR-150: private NMC concept matches for staged dataset questions (Medretica QBank · Series 1 pilot).
-- One row per staged question per batch. Service role only; nothing here is published or learner-visible.
create table if not exists public.dataset_question_concept_matches (
  dataset_id text not null,
  row_id text not null,
  batch_id text not null check (batch_id ~ '^[a-z0-9-]{1,40}$'),
  subject_id text,
  status text not null check (status in ('matched', 'needs-review', 'excluded')),
  concept_id text,
  confidence numeric check (confidence is null or (confidence > 0 and confidence <= 1)),
  reason text,
  candidates jsonb not null default '[]'::jsonb check (jsonb_typeof(candidates) = 'array'),
  matcher_version text not null,
  review_decision text check (review_decision in ('confirmed', 'corrected', 'rejected')),
  reviewed_concept_id text,
  matched_at timestamptz not null default now(),
  primary key (dataset_id, row_id, batch_id),
  foreign key (dataset_id, row_id) references public.dataset_question_staging (dataset_id, row_id) on delete cascade,
  check ((status = 'matched') = (concept_id is not null))
);
create index if not exists dataset_question_concept_matches_batch_idx on public.dataset_question_concept_matches (batch_id, status);
alter table public.dataset_question_concept_matches enable row level security;
revoke all on table public.dataset_question_concept_matches from public, anon, authenticated;
grant select, insert, update, delete on table public.dataset_question_concept_matches to service_role;
comment on table public.dataset_question_concept_matches is 'Private concept matches for staged questions (ADR-150). Service role only; not published.';
