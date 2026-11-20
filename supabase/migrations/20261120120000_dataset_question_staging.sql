-- Private staging for external question datasets (MedMCQA pilot, owner 2026-11-20). ADR-145.
-- Holds raw rows exactly as downloaded, for mapping and review. Never read by learner APIs; no browser grants.
-- Publication still goes through the content-library import (manifest → Review & publish).
create table if not exists public.dataset_question_staging (
  dataset_id text not null check (dataset_id ~ '^[a-z0-9-]{2,40}$'),
  dataset_version text not null check (char_length(dataset_version) between 1 and 120),
  split text not null check (split in ('train','validation','test')),
  row_id text not null check (char_length(row_id) between 1 and 120),
  subject_label text,
  topic_label text,
  choice_type text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  loaded_at timestamptz not null default now(),
  primary key (dataset_id, row_id)
);
create index if not exists dataset_question_staging_subject_idx on public.dataset_question_staging (dataset_id, subject_label);
alter table public.dataset_question_staging enable row level security;
revoke all on table public.dataset_question_staging from public, anon, authenticated;
grant select, insert, update, delete on table public.dataset_question_staging to service_role;
comment on table public.dataset_question_staging is 'Private raw external question rows (ADR-145). Service role only; not learner-visible; not published content.';
