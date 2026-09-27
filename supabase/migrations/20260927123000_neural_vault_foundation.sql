-- M06a NeuralVault foundation.
-- Canonical note versions are immutable content. Learner annotations are mutable
-- personal data linked to stable catalog concept IDs.

create table if not exists public.neural_canonical_note_versions (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null check (concept_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  version integer not null check (version > 0),
  supersedes_id uuid null,
  title text not null check (length(btrim(title)) between 1 and 300),
  body_markdown text not null check (length(btrim(body_markdown)) between 1 and 100000),
  source_ids jsonb not null check (
    jsonb_typeof(source_ids) = 'array'
    and jsonb_array_length(source_ids) > 0
  ),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  published_at timestamptz null,
  unique (concept_id, version),
  constraint neural_note_supersedes_fkey
    foreign key (supersedes_id) references public.neural_canonical_note_versions(id),
  check (
    (status='published' and published_at is not null)
    or (status in ('draft','retired'))
  )
);

create unique index if not exists neural_one_published_note_per_concept
  on public.neural_canonical_note_versions (concept_id)
  where status='published';

create index if not exists neural_canonical_note_concept_version
  on public.neural_canonical_note_versions (concept_id, version desc);

create table if not exists public.neural_personal_annotations (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null,
  concept_id text not null check (concept_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  body_markdown text not null check (
    length(btrim(body_markdown)) between 1 and 20000
  ),
  anchor_note_version_id uuid null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint neural_annotation_anchor_fkey
    foreign key (anchor_note_version_id) references public.neural_canonical_note_versions(id)
);

create index if not exists neural_annotation_learner_concept
  on public.neural_personal_annotations (learner_id, concept_id, updated_at desc, id);

alter table public.neural_canonical_note_versions enable row level security;
alter table public.neural_personal_annotations enable row level security;

revoke all on table public.neural_canonical_note_versions from public, anon, authenticated;
revoke all on table public.neural_personal_annotations from public, anon, authenticated;

create or replace function public.neural_catalog_concept(
  p_concept_id text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
select c.value
from public.study_catalog sc
cross join lateral jsonb_array_elements(coalesce(sc.body->'concepts','[]'::jsonb)) c(value)
where c.value->>'conceptId' = p_concept_id
order by sc.version desc
limit 1;
$function$;

revoke all on function public.neural_catalog_concept(text) from public, anon, authenticated;
grant execute on function public.neural_catalog_concept(text) to service_role;

create or replace function public.neural_create_canonical_note_draft(
  p_concept_id text,
  p_title text,
  p_body_markdown text,
  p_source_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_catalog public.study_catalog%rowtype;
  v_prior public.neural_canonical_note_versions%rowtype;
  v_id uuid := gen_random_uuid();
  v_version integer;
  v_hash text;
  v_source text;
begin
  if p_concept_id is null or p_concept_id !~ '^[a-zA-Z0-9:_@.\-]{1,160}$'
     or length(btrim(coalesce(p_title,''))) not between 1 and 300
     or length(btrim(coalesce(p_body_markdown,''))) not between 1 and 100000
     or jsonb_typeof(p_source_ids) <> 'array'
     or jsonb_array_length(p_source_ids) < 1 then
    raise exception using errcode='22023', message='neural_note_invalid';
  end if;

  select * into v_catalog from public.study_catalog order by version desc limit 1;
  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_catalog.body->'concepts','[]'::jsonb)) c(value)
    where c.value->>'conceptId' = p_concept_id
  ) then
    raise exception using errcode='22023', message='neural_concept_unknown';
  end if;

  for v_source in select jsonb_array_elements_text(p_source_ids)
  loop
    if not exists (
      select 1
      from jsonb_array_elements(coalesce(v_catalog.body->'sources','[]'::jsonb)) s(value)
      where s.value->>'sourceId' = v_source
    ) then
      raise exception using errcode='22023', message='neural_source_unknown';
    end if;
  end loop;

  select * into v_prior
  from public.neural_canonical_note_versions
  where concept_id=p_concept_id
  order by version desc
  limit 1;

  v_version := coalesce(v_prior.version,0) + 1;
  v_hash := encode(
    extensions.digest(
      jsonb_build_object(
        'conceptId',p_concept_id,
        'version',v_version,
        'title',p_title,
        'bodyMarkdown',p_body_markdown,
        'sourceIds',p_source_ids
      )::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.neural_canonical_note_versions (
    id, concept_id, version, supersedes_id, title, body_markdown,
    source_ids, status, content_sha256
  ) values (
    v_id, p_concept_id, v_version, v_prior.id, p_title, p_body_markdown,
    p_source_ids, 'draft', v_hash
  );

  return jsonb_build_object(
    'noteVersionId',v_id,
    'conceptId',p_concept_id,
    'version',v_version,
    'supersedesNoteVersionId',v_prior.id,
    'status','draft',
    'contentSha256',v_hash
  );
end;
$function$;

revoke all on function public.neural_create_canonical_note_draft(text,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.neural_create_canonical_note_draft(text,text,text,jsonb)
  to service_role;

create or replace function public.neural_create_annotation(
  p_learner uuid,
  p_concept_id text,
  p_body_markdown text,
  p_anchor_note_version_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid := gen_random_uuid();
  v_anchor public.neural_canonical_note_versions%rowtype;
begin
  if p_learner is null
     or p_concept_id is null
     or length(btrim(coalesce(p_body_markdown,''))) not between 1 and 20000 then
    raise exception using errcode='22023', message='neural_annotation_invalid';
  end if;

  if public.neural_catalog_concept(p_concept_id) is null then
    raise exception using errcode='22023', message='neural_concept_unknown';
  end if;

  if p_anchor_note_version_id is not null then
    select * into v_anchor
    from public.neural_canonical_note_versions
    where id=p_anchor_note_version_id;
    if not found or v_anchor.concept_id <> p_concept_id or v_anchor.status <> 'published' then
      raise exception using errcode='22023', message='neural_anchor_invalid';
    end if;
  end if;

  insert into public.neural_personal_annotations (
    id, learner_id, concept_id, body_markdown, anchor_note_version_id
  ) values (
    v_id, p_learner, p_concept_id, p_body_markdown, p_anchor_note_version_id
  );

  return jsonb_build_object(
    'annotationId',v_id,
    'conceptId',p_concept_id,
    'bodyMarkdown',p_body_markdown,
    'anchorNoteVersionId',p_anchor_note_version_id,
    'revision',1
  );
end;
$function$;

create or replace function public.neural_update_annotation(
  p_learner uuid,
  p_annotation_id uuid,
  p_expected_revision integer,
  p_body_markdown text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row public.neural_personal_annotations%rowtype;
begin
  if p_learner is null or p_annotation_id is null
     or p_expected_revision is null or p_expected_revision < 1
     or length(btrim(coalesce(p_body_markdown,''))) not between 1 and 20000 then
    raise exception using errcode='22023', message='neural_annotation_invalid';
  end if;

  update public.neural_personal_annotations
  set body_markdown=p_body_markdown,
      revision=revision+1,
      updated_at=now()
  where id=p_annotation_id
    and learner_id=p_learner
    and revision=p_expected_revision
  returning * into v_row;

  if not found then
    if exists (
      select 1 from public.neural_personal_annotations
      where id=p_annotation_id and learner_id=p_learner
    ) then
      return jsonb_build_object('error','neural_annotation_revision_conflict');
    end if;
    return jsonb_build_object('error','neural_annotation_not_found');
  end if;

  return jsonb_build_object(
    'annotationId',v_row.id,
    'conceptId',v_row.concept_id,
    'bodyMarkdown',v_row.body_markdown,
    'anchorNoteVersionId',v_row.anchor_note_version_id,
    'revision',v_row.revision
  );
end;
$function$;

create or replace function public.neural_delete_annotation(
  p_learner uuid,
  p_annotation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted uuid;
begin
  delete from public.neural_personal_annotations
  where id=p_annotation_id and learner_id=p_learner
  returning id into v_deleted;

  if v_deleted is null then
    return jsonb_build_object('error','neural_annotation_not_found');
  end if;

  return jsonb_build_object('annotationId',v_deleted,'deleted',true);
end;
$function$;

revoke all on function public.neural_create_annotation(uuid,text,text,uuid)
  from public, anon, authenticated;
revoke all on function public.neural_update_annotation(uuid,uuid,integer,text)
  from public, anon, authenticated;
revoke all on function public.neural_delete_annotation(uuid,uuid)
  from public, anon, authenticated;

grant execute on function public.neural_create_annotation(uuid,text,text,uuid) to service_role;
grant execute on function public.neural_update_annotation(uuid,uuid,integer,text) to service_role;
grant execute on function public.neural_delete_annotation(uuid,uuid) to service_role;
