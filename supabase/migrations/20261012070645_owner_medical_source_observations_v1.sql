-- Immutable owner-entered signals; NOT clinical verification.
create table if not exists public.owner_medical_source_observations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  source_id text not null check (length(source_id) between 1 and 160),
  catalog_version bigint not null check (catalog_version >= 0),
  cited_version text not null check (length(cited_version) between 1 and 300),
  kind text not null check (kind in ('version_seen','source_retired')),
  observed_version text check (observed_version is null or length(observed_version) between 1 and 300),
  evidence_url text not null check (length(evidence_url) between 9 and 2000 and evidence_url ~ '^https://'),
  evidence_note text not null check (length(evidence_note) between 20 and 2000),
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  constraint owner_source_sighting_kind_version_check check (
    (kind = 'version_seen' and observed_version is not null and btrim(observed_version) <> btrim(cited_version))
    or (kind = 'source_retired' and observed_version is null)
  )
);
create index if not exists owner_medical_source_observations_source_time_idx
  on public.owner_medical_source_observations(source_id, recorded_at desc);
alter table public.owner_medical_source_observations enable row level security;
revoke all on public.owner_medical_source_observations from public, anon, authenticated;
grant select, insert on public.owner_medical_source_observations to service_role;
comment on table public.owner_medical_source_observations is
  'Owner-entered possible medical reference updates. Never constitutes independent source verification, human clinical approval, or content publication.';
