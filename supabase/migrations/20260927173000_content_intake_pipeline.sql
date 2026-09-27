-- Scalable content intake before review/publication.
-- Intake is service-only staging. Promotion can only append structurally valid v1 questions
-- in status=in_review; existing Medical/References/Rights gates remain authoritative.

create table public.content_intake_batches (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null unique
    check (batch_key ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  label text not null check (char_length(btrim(label)) between 1 and 240),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  manifest_sha256 text not null unique
    check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  concept_count integer not null check (concept_count >= 0),
  source_count integer not null check (source_count >= 0),
  question_count integer not null check (question_count between 1 and 100),
  status text not null default 'staged'
    check (status in ('staged', 'promoted', 'abandoned')),
  catalog_version_before bigint,
  catalog_version_after bigint,
  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  abandoned_at timestamptz,
  abandon_reason text,
  check (
    (status = 'staged'
      and catalog_version_before is null
      and catalog_version_after is null
      and promoted_at is null
      and abandoned_at is null
      and abandon_reason is null)
    or
    (status = 'promoted'
      and catalog_version_before is not null
      and catalog_version_after is not null
      and catalog_version_after = catalog_version_before + 1
      and promoted_at is not null
      and abandoned_at is null
      and abandon_reason is null)
    or
    (status = 'abandoned'
      and catalog_version_before is null
      and catalog_version_after is null
      and promoted_at is null
      and abandoned_at is not null
      and char_length(btrim(abandon_reason)) between 1 and 1000)
  )
);

create index content_intake_batches_status_created
  on public.content_intake_batches (status, created_at, id);

create table public.content_intake_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.content_intake_batches(id) on delete restrict,
  event_type text not null check (event_type in ('staged', 'promoted', 'abandoned')),
  event jsonb not null check (jsonb_typeof(event) = 'object'),
  recorded_at timestamptz not null default now(),
  unique (batch_id, event_type)
);

alter table public.content_intake_batches enable row level security;
alter table public.content_intake_events enable row level security;

revoke all on table public.content_intake_batches
  from public, anon, authenticated, service_role;
revoke all on table public.content_intake_events
  from public, anon, authenticated, service_role;
grant select on table public.content_intake_batches to service_role;
grant select on table public.content_intake_events to service_role;

create or replace function public.content_intake_normalize_text(
  p_value text
)
returns text
language sql
immutable
strict
set search_path = ''
as $function$
  select pg_catalog.lower(
    pg_catalog.regexp_replace(pg_catalog.btrim(p_value), '\s+', ' ', 'g')
  )
$function$;

revoke all on function public.content_intake_normalize_text(text)
  from public, anon, authenticated;

create or replace function public.content_validate_intake_manifest(
  p_manifest jsonb,
  p_ignore_batch uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_concept_count integer;
  v_source_count integer;
  v_question_count integer;
  v_keys text[];
begin
  if p_manifest is null or pg_catalog.jsonb_typeof(p_manifest) <> 'object' then
    raise exception using errcode = '22023', message = 'intake_manifest_invalid';
  end if;

  select pg_catalog.array_agg(k order by k)
    into v_keys
  from pg_catalog.jsonb_object_keys(p_manifest) k;

  if v_keys is distinct from array['concepts','questions','schemaVersion','sources']::text[] then
    raise exception using errcode = '22023', message = 'intake_manifest_fields_invalid';
  end if;

  if coalesce(p_manifest->>'schemaVersion', '') !~ '^[0-9]+$'
     or (p_manifest->>'schemaVersion')::integer <> 1 then
    raise exception using errcode = '22023', message = 'intake_schema_version_invalid';
  end if;

  if pg_catalog.jsonb_typeof(p_manifest->'concepts') <> 'array'
     or pg_catalog.jsonb_typeof(p_manifest->'sources') <> 'array'
     or pg_catalog.jsonb_typeof(p_manifest->'questions') <> 'array' then
    raise exception using errcode = '22023', message = 'intake_manifest_arrays_invalid';
  end if;

  v_concept_count := pg_catalog.jsonb_array_length(p_manifest->'concepts');
  v_source_count := pg_catalog.jsonb_array_length(p_manifest->'sources');
  v_question_count := pg_catalog.jsonb_array_length(p_manifest->'questions');

  if v_concept_count > 200 or v_source_count > 200
     or v_question_count < 1 or v_question_count > 100 then
    raise exception using errcode = '22023', message = 'intake_batch_size_invalid';
  end if;

  -- New concept declarations are structurally narrow. Questions may also link to
  -- canonical concepts already present in the live catalog.
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'concepts') c
    where pg_catalog.jsonb_typeof(c) <> 'object'
       or (
         select pg_catalog.array_agg(k order by k)
         from pg_catalog.jsonb_object_keys(c) k
       ) is distinct from array['aliases','conceptId','label','subjectTags']::text[]
       or coalesce(c->>'conceptId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$'
       or char_length(pg_catalog.btrim(coalesce(c->>'label',''))) not between 1 and 240
       or pg_catalog.jsonb_typeof(c->'aliases') <> 'array'
       or pg_catalog.jsonb_typeof(c->'subjectTags') <> 'array'
  ) then
    raise exception using errcode = '22023', message = 'intake_concept_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'concepts') c
    cross join lateral pg_catalog.jsonb_array_elements(c->'aliases') a
    where pg_catalog.jsonb_typeof(a) <> 'string'
       or char_length(pg_catalog.btrim(a#>>'{}')) < 1
  ) or exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'concepts') c
    cross join lateral pg_catalog.jsonb_array_elements(c->'subjectTags') t
    where pg_catalog.jsonb_typeof(t) <> 'string'
       or char_length(pg_catalog.btrim(t#>>'{}')) < 1
  ) then
    raise exception using errcode = '22023', message = 'intake_concept_list_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'concepts') c
    group by c->>'conceptId'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'intake_concept_duplicate';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'concepts') c
    join public.study_catalog catalog on catalog.id = 1
    cross join lateral pg_catalog.jsonb_array_elements(
      coalesce(catalog.body->'concepts','[]'::jsonb)
    ) existing
    on existing->>'conceptId' = c->>'conceptId'
  ) then
    raise exception using errcode = '23505', message = 'intake_concept_exists';
  end if;

  -- Every new source begins with unresolved rights. Rights evidence is resolved
  -- only by the existing immutable rights-review flow after promotion.
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'sources') s
    where pg_catalog.jsonb_typeof(s) <> 'object'
       or (
         select pg_catalog.array_agg(k order by k)
         from pg_catalog.jsonb_object_keys(s) k
       ) is distinct from array['rights','sourceId','title','url','version']::text[]
       or coalesce(s->>'sourceId','') !~ '^[a-zA-Z0-9:_@.\-]{1,200}$'
       or char_length(pg_catalog.btrim(coalesce(s->>'title',''))) not between 1 and 500
       or char_length(pg_catalog.btrim(coalesce(s->>'version',''))) not between 1 and 160
       or (
         s->'url' <> 'null'::jsonb
         and (
           pg_catalog.jsonb_typeof(s->'url') <> 'string'
           or (s->>'url') !~ '^https?://'
         )
       )
       or pg_catalog.jsonb_typeof(s->'rights') <> 'object'
       or (
         select pg_catalog.array_agg(k order by k)
         from pg_catalog.jsonb_object_keys(s->'rights') k
       ) is distinct from array['evidence','status']::text[]
       or s->'rights'->>'status' <> 'unknown'
       or char_length(pg_catalog.btrim(coalesce(s->'rights'->>'evidence',''))) not between 1 and 4000
  ) then
    raise exception using errcode = '22023', message = 'intake_source_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'sources') s
    group by s->>'sourceId'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'intake_source_duplicate';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'sources') s
    join public.study_catalog catalog on catalog.id = 1
    cross join lateral pg_catalog.jsonb_array_elements(
      coalesce(catalog.body->'sources','[]'::jsonb)
    ) existing
    on existing->>'sourceId' = s->>'sourceId'
  ) then
    raise exception using errcode = '23505', message = 'intake_source_exists';
  end if;

  -- Intake v1 deliberately accepts only new stable v1 original/AI-generated items.
  -- PYQ identity/evidence stays in the separate immutable exam-evidence subsystem.
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    where pg_catalog.jsonb_typeof(q) <> 'object'
       or (
         select pg_catalog.array_agg(k order by k)
         from pg_catalog.jsonb_object_keys(q) k
       ) is distinct from array[
         'answerOptionId','authorId','changeReason','conceptLinks','explanation',
         'options','provenance','publishedAt','questionId','questionVersionId',
         'reviews','sourceIds','status','stem','supersedes','version'
       ]::text[]
       or coalesce(q->>'questionId','') !~ '^[a-zA-Z0-9:_@.\-]{1,150}$'
       or q->>'questionVersionId' <> (q->>'questionId') || '@1'
       or coalesce(q->>'version','') <> '1'
       or q->'supersedes' <> 'null'::jsonb
       or char_length(pg_catalog.btrim(coalesce(q->>'authorId',''))) not between 1 and 160
       or char_length(pg_catalog.btrim(coalesce(q->>'changeReason',''))) not between 1 and 500
       or char_length(pg_catalog.btrim(coalesce(q->>'stem',''))) not between 1 and 4000
       or char_length(pg_catalog.btrim(coalesce(q->>'explanation',''))) not between 1 and 12000
       or pg_catalog.jsonb_typeof(q->'options') <> 'array'
       or pg_catalog.jsonb_array_length(q->'options') < 2
       or pg_catalog.jsonb_typeof(q->'conceptLinks') <> 'array'
       or pg_catalog.jsonb_array_length(q->'conceptLinks') < 1
       or pg_catalog.jsonb_typeof(q->'sourceIds') <> 'array'
       or pg_catalog.jsonb_array_length(q->'sourceIds') < 1
       or q->>'status' <> 'in_review'
       or pg_catalog.jsonb_typeof(q->'reviews') <> 'array'
       or pg_catalog.jsonb_array_length(q->'reviews') <> 0
       or q->'publishedAt' <> 'null'::jsonb
       or pg_catalog.jsonb_typeof(q->'provenance') <> 'object'
       or (
         select pg_catalog.array_agg(k order by k)
         from pg_catalog.jsonb_object_keys(q->'provenance') k
       ) is distinct from array['evidence','exam','kind','year']::text[]
       or q->'provenance'->>'kind' not in ('original','ai_generated')
       or q->'provenance'->'exam' <> 'null'::jsonb
       or q->'provenance'->'year' <> 'null'::jsonb
       or char_length(pg_catalog.btrim(coalesce(q->'provenance'->>'evidence',''))) not between 1 and 4000
  ) then
    raise exception using errcode = '22023', message = 'intake_question_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    cross join lateral pg_catalog.jsonb_array_elements(q->'options') o
    where pg_catalog.jsonb_typeof(o) <> 'object'
       or (
         select pg_catalog.array_agg(k order by k)
         from pg_catalog.jsonb_object_keys(o) k
       ) is distinct from array['optionId','text']::text[]
       or coalesce(o->>'optionId','') !~ '^[a-zA-Z0-9:_@.\-]{1,120}$'
       or char_length(pg_catalog.btrim(coalesce(o->>'text',''))) not between 1 and 2000
  ) then
    raise exception using errcode = '22023', message = 'intake_option_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    where exists (
      select 1
      from pg_catalog.jsonb_array_elements(q->'options') o
      group by o->>'optionId'
      having count(*) > 1
    )
    or not exists (
      select 1
      from pg_catalog.jsonb_array_elements(q->'options') o
      where o->>'optionId' = q->>'answerOptionId'
    )
  ) then
    raise exception using errcode = '22023', message = 'intake_answer_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    cross join lateral pg_catalog.jsonb_array_elements(q->'conceptLinks') link
    where pg_catalog.jsonb_typeof(link) <> 'object'
       or (
         select pg_catalog.array_agg(k order by k)
         from pg_catalog.jsonb_object_keys(link) k
       ) is distinct from array['conceptId','role']::text[]
       or coalesce(link->>'conceptId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$'
       or link->>'role' not in ('primary','secondary','prerequisite','distractor')
  ) then
    raise exception using errcode = '22023', message = 'intake_concept_link_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    where (
      select count(*)
      from pg_catalog.jsonb_array_elements(q->'conceptLinks') link
      where link->>'role' = 'primary'
    ) <> 1
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(q->'conceptLinks') link
      group by link->>'conceptId', link->>'role'
      having count(*) > 1
    )
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(q->'conceptLinks') link
      where not exists (
        select 1
        from public.study_catalog catalog
        cross join lateral pg_catalog.jsonb_array_elements(
          coalesce(catalog.body->'concepts','[]'::jsonb)
        ) existing
        where catalog.id = 1
          and existing->>'conceptId' = link->>'conceptId'
      )
      and not exists (
        select 1
        from pg_catalog.jsonb_array_elements(p_manifest->'concepts') staged
        where staged->>'conceptId' = link->>'conceptId'
      )
    )
  ) then
    raise exception using errcode = '22023', message = 'intake_concept_reference_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    cross join lateral pg_catalog.jsonb_array_elements(q->'sourceIds') sid
    where pg_catalog.jsonb_typeof(sid) <> 'string'
       or coalesce(sid#>>'{}','') !~ '^[a-zA-Z0-9:_@.\-]{1,200}$'
  ) then
    raise exception using errcode = '22023', message = 'intake_source_reference_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    where exists (
      select 1
      from pg_catalog.jsonb_array_elements_text(q->'sourceIds') sid
      group by sid
      having count(*) > 1
    )
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements_text(q->'sourceIds') sid
      where not exists (
        select 1
        from public.study_catalog catalog
        cross join lateral pg_catalog.jsonb_array_elements(
          coalesce(catalog.body->'sources','[]'::jsonb)
        ) existing
        where catalog.id = 1
          and existing->>'sourceId' = sid
      )
      and not exists (
        select 1
        from pg_catalog.jsonb_array_elements(p_manifest->'sources') staged
        where staged->>'sourceId' = sid
      )
    )
  ) then
    raise exception using errcode = '22023', message = 'intake_source_reference_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    group by q->>'questionId'
    having count(*) > 1
  ) or exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    group by q->>'questionVersionId'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'intake_question_duplicate';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    join public.study_catalog catalog on catalog.id = 1
    cross join lateral pg_catalog.jsonb_array_elements(
      coalesce(catalog.body->'questions','[]'::jsonb)
    ) existing
    on existing->>'questionId' = q->>'questionId'
       or existing->>'questionVersionId' = q->>'questionVersionId'
  ) then
    raise exception using errcode = '23505', message = 'intake_question_exists';
  end if;

  -- Exact normalized-stem duplicates are blocked. Semantic near-duplicate
  -- detection remains a later content-quality layer.
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    group by public.content_intake_normalize_text(q->>'stem')
    having count(*) > 1
  ) then
    raise exception using errcode = '23505', message = 'intake_stem_duplicate';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
    join public.study_catalog catalog on catalog.id = 1
    cross join lateral pg_catalog.jsonb_array_elements(
      coalesce(catalog.body->'questions','[]'::jsonb)
    ) existing
    on public.content_intake_normalize_text(existing->>'stem')
       = public.content_intake_normalize_text(q->>'stem')
  ) then
    raise exception using errcode = '23505', message = 'intake_stem_exists';
  end if;

  -- Prevent ordinary parallel staged batches from silently claiming the same
  -- canonical IDs or exact stems. A collision can be resolved by abandoning one batch.
  if exists (
    select 1
    from public.content_intake_batches b
    cross join lateral pg_catalog.jsonb_array_elements(b.manifest->'questions') other_q
    join lateral pg_catalog.jsonb_array_elements(p_manifest->'questions') q on true
    where b.status = 'staged'
      and (p_ignore_batch is null or b.id <> p_ignore_batch)
      and (
        other_q->>'questionId' = q->>'questionId'
        or other_q->>'questionVersionId' = q->>'questionVersionId'
        or public.content_intake_normalize_text(other_q->>'stem')
           = public.content_intake_normalize_text(q->>'stem')
      )
  ) then
    raise exception using errcode = '23505', message = 'intake_staged_question_conflict';
  end if;

  if exists (
    select 1
    from public.content_intake_batches b
    cross join lateral pg_catalog.jsonb_array_elements(b.manifest->'concepts') other_c
    join lateral pg_catalog.jsonb_array_elements(p_manifest->'concepts') c on true
    where b.status = 'staged'
      and (p_ignore_batch is null or b.id <> p_ignore_batch)
      and other_c->>'conceptId' = c->>'conceptId'
  ) then
    raise exception using errcode = '23505', message = 'intake_staged_concept_conflict';
  end if;

  if exists (
    select 1
    from public.content_intake_batches b
    cross join lateral pg_catalog.jsonb_array_elements(b.manifest->'sources') other_s
    join lateral pg_catalog.jsonb_array_elements(p_manifest->'sources') s on true
    where b.status = 'staged'
      and (p_ignore_batch is null or b.id <> p_ignore_batch)
      and other_s->>'sourceId' = s->>'sourceId'
  ) then
    raise exception using errcode = '23505', message = 'intake_staged_source_conflict';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId', 'content-intake-validation-v1',
    'valid', true,
    'conceptCount', v_concept_count,
    'sourceCount', v_source_count,
    'questionCount', v_question_count,
    'scope', 'new-v1-original-or-ai-generated-questions',
    'semanticDuplicateDetection', false,
    'publicationAuthority', false
  );
end;
$function$;

revoke all on function public.content_validate_intake_manifest(jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.content_validate_intake_manifest(jsonb, uuid)
  to service_role;

create or replace function public.content_stage_intake_batch(
  p_batch_key text,
  p_label text,
  p_manifest jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_validation jsonb;
  v_hash text;
  v_batch_id uuid := gen_random_uuid();
  v_recorded_at timestamptz := now();
begin
  if coalesce(p_batch_key,'') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode = '22023', message = 'intake_batch_key_invalid';
  end if;
  if char_length(pg_catalog.btrim(coalesce(p_label,''))) not between 1 and 240 then
    raise exception using errcode = '22023', message = 'intake_batch_label_invalid';
  end if;

  v_validation := public.content_validate_intake_manifest(p_manifest, null);
  v_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(p_manifest::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.content_intake_batches (
    id,
    batch_key,
    label,
    manifest,
    manifest_sha256,
    concept_count,
    source_count,
    question_count,
    status,
    created_at
  ) values (
    v_batch_id,
    p_batch_key,
    pg_catalog.btrim(p_label),
    p_manifest,
    v_hash,
    (v_validation->>'conceptCount')::integer,
    (v_validation->>'sourceCount')::integer,
    (v_validation->>'questionCount')::integer,
    'staged',
    v_recorded_at
  );

  insert into public.content_intake_events (
    batch_id,
    event_type,
    event,
    recorded_at
  ) values (
    v_batch_id,
    'staged',
    pg_catalog.jsonb_build_object(
      'batchKey', p_batch_key,
      'manifestSha256', v_hash,
      'validation', v_validation
    ),
    v_recorded_at
  );

  return pg_catalog.jsonb_build_object(
    'contractId', 'content-intake-batch-v1',
    'batchId', v_batch_id,
    'batchKey', p_batch_key,
    'status', 'staged',
    'manifestSha256', v_hash,
    'validation', v_validation,
    'createdAt', v_recorded_at
  );
end;
$function$;

revoke all on function public.content_stage_intake_batch(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.content_stage_intake_batch(text, text, jsonb)
  to service_role;

create or replace function public.content_promote_intake_batch(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_batch public.content_intake_batches%rowtype;
  v_catalog_version bigint;
  v_catalog_body jsonb;
  v_new_body jsonb;
  v_validation jsonb;
  v_promoted_at timestamptz := now();
begin
  select *
    into v_batch
  from public.content_intake_batches
  where id = p_batch_id
  for update;

  if v_batch.id is null then
    raise exception using errcode = '22023', message = 'intake_batch_not_found';
  end if;
  if v_batch.status <> 'staged' then
    raise exception using errcode = '22023', message = 'intake_batch_not_staged';
  end if;

  select c.version, c.body
    into v_catalog_version, v_catalog_body
  from public.study_catalog c
  where c.id = 1
  for update;

  if v_catalog_version is null or v_catalog_body is null then
    raise exception using errcode = '55000', message = 'study_catalog_unavailable';
  end if;

  -- Revalidate after locking the catalog so stale staged assumptions cannot
  -- overwrite newer catalog state.
  v_validation := public.content_validate_intake_manifest(v_batch.manifest, v_batch.id);

  v_new_body := pg_catalog.jsonb_set(
    v_catalog_body,
    '{concepts}',
    coalesce(v_catalog_body->'concepts','[]'::jsonb) || (v_batch.manifest->'concepts'),
    false
  );
  v_new_body := pg_catalog.jsonb_set(
    v_new_body,
    '{sources}',
    coalesce(v_new_body->'sources','[]'::jsonb) || (v_batch.manifest->'sources'),
    false
  );
  v_new_body := pg_catalog.jsonb_set(
    v_new_body,
    '{questions}',
    coalesce(v_new_body->'questions','[]'::jsonb) || (v_batch.manifest->'questions'),
    false
  );

  update public.study_catalog
  set body = v_new_body,
      version = v_catalog_version + 1,
      updated_at = v_promoted_at
  where id = 1;

  update public.content_intake_batches
  set status = 'promoted',
      catalog_version_before = v_catalog_version,
      catalog_version_after = v_catalog_version + 1,
      promoted_at = v_promoted_at
  where id = v_batch.id;

  insert into public.content_intake_events (
    batch_id,
    event_type,
    event,
    recorded_at
  ) values (
    v_batch.id,
    'promoted',
    pg_catalog.jsonb_build_object(
      'catalogVersionBefore', v_catalog_version,
      'catalogVersionAfter', v_catalog_version + 1,
      'manifestSha256', v_batch.manifest_sha256,
      'validation', v_validation,
      'publicationAuthority', false
    ),
    v_promoted_at
  );

  return pg_catalog.jsonb_build_object(
    'contractId', 'content-intake-promotion-v1',
    'batchId', v_batch.id,
    'batchKey', v_batch.batch_key,
    'status', 'promoted',
    'catalogVersionBefore', v_catalog_version,
    'catalogVersionAfter', v_catalog_version + 1,
    'questionCount', v_batch.question_count,
    'publicationAuthority', false,
    'promotedAt', v_promoted_at
  );
end;
$function$;

revoke all on function public.content_promote_intake_batch(uuid)
  from public, anon, authenticated;
grant execute on function public.content_promote_intake_batch(uuid)
  to service_role;

create or replace function public.content_abandon_intake_batch(
  p_batch_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_batch public.content_intake_batches%rowtype;
  v_abandoned_at timestamptz := now();
begin
  if char_length(pg_catalog.btrim(coalesce(p_reason,''))) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'intake_abandon_reason_invalid';
  end if;

  select *
    into v_batch
  from public.content_intake_batches
  where id = p_batch_id
  for update;

  if v_batch.id is null then
    raise exception using errcode = '22023', message = 'intake_batch_not_found';
  end if;
  if v_batch.status <> 'staged' then
    raise exception using errcode = '22023', message = 'intake_batch_not_staged';
  end if;

  update public.content_intake_batches
  set status = 'abandoned',
      abandoned_at = v_abandoned_at,
      abandon_reason = pg_catalog.btrim(p_reason)
  where id = v_batch.id;

  insert into public.content_intake_events (
    batch_id,
    event_type,
    event,
    recorded_at
  ) values (
    v_batch.id,
    'abandoned',
    pg_catalog.jsonb_build_object(
      'reason', pg_catalog.btrim(p_reason),
      'manifestSha256', v_batch.manifest_sha256
    ),
    v_abandoned_at
  );

  return pg_catalog.jsonb_build_object(
    'contractId', 'content-intake-abandon-v1',
    'batchId', v_batch.id,
    'status', 'abandoned',
    'abandonedAt', v_abandoned_at
  );
end;
$function$;

revoke all on function public.content_abandon_intake_batch(uuid, text)
  from public, anon, authenticated;
grant execute on function public.content_abandon_intake_batch(uuid, text)
  to service_role;

create or replace function public.content_intake_pipeline_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_staged_batches integer;
  v_staged_questions integer;
  v_promoted_batches integer;
  v_abandoned_batches integer;
  v_in_review integer;
  v_verified integer;
  v_published integer;
  v_published_stable integer;
  v_medical_outstanding integer;
  v_references_outstanding integer;
  v_rights_outstanding integer;
begin
  select
    count(*) filter (where status = 'staged')::integer,
    coalesce(sum(question_count) filter (where status = 'staged'),0)::integer,
    count(*) filter (where status = 'promoted')::integer,
    count(*) filter (where status = 'abandoned')::integer
  into
    v_staged_batches,
    v_staged_questions,
    v_promoted_batches,
    v_abandoned_batches
  from public.content_intake_batches;

  with questions as (
    select q
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(
      coalesce(c.body->'questions','[]'::jsonb)
    ) q
    where c.id = 1
  )
  select
    count(*) filter (where q->>'status' = 'in_review')::integer,
    count(*) filter (where q->>'status' = 'verified')::integer,
    count(*) filter (where q->>'status' = 'published')::integer,
    count(distinct q->>'questionId') filter (where q->>'status' = 'published')::integer
  into v_in_review, v_verified, v_published, v_published_stable
  from questions;

  with in_review as (
    select q->>'questionVersionId' as question_version_id
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(
      coalesce(c.body->'questions','[]'::jsonb)
    ) q
    where c.id = 1 and q->>'status' = 'in_review'
  )
  select
    count(*) filter (
      where not exists (
        select 1 from public.content_review_events e
        where e.question_version_id = i.question_version_id
          and e.review_kind = 'medical'
      )
    )::integer,
    count(*) filter (
      where not exists (
        select 1 from public.content_review_events e
        where e.question_version_id = i.question_version_id
          and e.review_kind = 'references'
      )
    )::integer,
    count(*) filter (
      where not exists (
        select 1 from public.content_review_events e
        where e.question_version_id = i.question_version_id
          and e.review_kind = 'rights'
      )
    )::integer
  into v_medical_outstanding, v_references_outstanding, v_rights_outstanding
  from in_review i;

  return pg_catalog.jsonb_build_object(
    'contractId', 'content-intake-status-v1',
    'generatedAt', now(),
    'intake', pg_catalog.jsonb_build_object(
      'stagedBatches', v_staged_batches,
      'stagedQuestions', v_staged_questions,
      'promotedBatches', v_promoted_batches,
      'abandonedBatches', v_abandoned_batches
    ),
    'catalog', pg_catalog.jsonb_build_object(
      'inReviewQuestions', v_in_review,
      'verifiedQuestions', v_verified,
      'publishedQuestionVersions', v_published,
      'publishedStableQuestions', v_published_stable
    ),
    'reviewOutstanding', pg_catalog.jsonb_build_object(
      'medical', v_medical_outstanding,
      'references', v_references_outstanding,
      'rights', v_rights_outstanding
    ),
    'semanticDuplicateDetection', false,
    'publicationAuthority', false
  );
end;
$function$;

revoke all on function public.content_intake_pipeline_status()
  from public, anon, authenticated;
grant execute on function public.content_intake_pipeline_status()
  to service_role;

create or replace function public.guard_content_intake_batch_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'content_intake_batch_delete_forbidden';
  end if;

  if new.batch_key is distinct from old.batch_key
     or new.label is distinct from old.label
     or new.manifest is distinct from old.manifest
     or new.manifest_sha256 is distinct from old.manifest_sha256
     or new.concept_count is distinct from old.concept_count
     or new.source_count is distinct from old.source_count
     or new.question_count is distinct from old.question_count
     or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'content_intake_batch_payload_immutable';
  end if;

  if old.status <> 'staged'
     or new.status not in ('promoted','abandoned') then
    raise exception using errcode = '55000', message = 'content_intake_batch_transition_forbidden';
  end if;

  return new;
end;
$function$;

drop trigger if exists content_intake_batches_guard on public.content_intake_batches;
create trigger content_intake_batches_guard
before update or delete on public.content_intake_batches
for each row execute function public.guard_content_intake_batch_mutation();

create or replace function public.prevent_content_intake_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'content_intake_event_immutable';
end;
$function$;

drop trigger if exists content_intake_events_no_update_delete on public.content_intake_events;
create trigger content_intake_events_no_update_delete
before update or delete on public.content_intake_events
for each row execute function public.prevent_content_intake_event_mutation();
