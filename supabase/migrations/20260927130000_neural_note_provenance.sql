-- M06b: canonical NeuralVault note provenance.
-- Every canonical note version must declare how it was produced before review.

alter table public.neural_canonical_note_versions
  add column if not exists provenance jsonb;

alter table public.neural_canonical_note_versions
  add constraint neural_canonical_note_versions_provenance_check
  check (
    provenance is not null
    and jsonb_typeof(provenance)='object'
    and provenance->>'kind' in (
      'ai_generated_original',
      'human_authored_original',
      'licensed_adaptation'
    )
    and char_length(btrim(coalesce(provenance->>'evidence',''))) between 1 and 2000
  );

alter table public.neural_canonical_note_versions
  alter column provenance set not null;

drop function if exists public.neural_create_canonical_note_draft(text,text,text,jsonb,uuid);

create function public.neural_create_canonical_note_draft(
  p_concept_id text,
  p_title text,
  p_body_markdown text,
  p_source_ids jsonb,
  p_provenance jsonb,
  p_author uuid
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
  if p_author is null
     or p_concept_id is null
     or p_concept_id !~ '^[a-zA-Z0-9:_@.\-]{1,160}$'
     or length(btrim(coalesce(p_title,''))) not between 1 and 300
     or length(btrim(coalesce(p_body_markdown,''))) not between 1 and 100000
     or jsonb_typeof(p_source_ids) <> 'array'
     or jsonb_array_length(p_source_ids) < 1
     or jsonb_typeof(p_provenance) <> 'object'
     or p_provenance->>'kind' not in (
       'ai_generated_original',
       'human_authored_original',
       'licensed_adaptation'
     )
     or char_length(btrim(coalesce(p_provenance->>'evidence',''))) not between 1 and 2000 then
    raise exception using errcode='22023', message='neural_note_invalid';
  end if;

  if not exists (select 1 from auth.users where id=p_author) then
    raise exception using errcode='22023', message='neural_note_author_unknown';
  end if;

  select * into v_catalog
  from public.study_catalog
  order by version desc
  limit 1;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_catalog.body->'concepts','[]'::jsonb)) c(value)
    where c.value->>'conceptId'=p_concept_id
  ) then
    raise exception using errcode='22023', message='neural_concept_unknown';
  end if;

  for v_source in select jsonb_array_elements_text(p_source_ids)
  loop
    if not exists (
      select 1
      from jsonb_array_elements(coalesce(v_catalog.body->'sources','[]'::jsonb)) s(value)
      where s.value->>'sourceId'=v_source
    ) then
      raise exception using errcode='22023', message='neural_source_unknown';
    end if;
  end loop;

  select * into v_prior
  from public.neural_canonical_note_versions
  where concept_id=p_concept_id
  order by version desc
  limit 1;

  v_version := coalesce(v_prior.version,0)+1;
  v_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'conceptId',p_concept_id,
          'version',v_version,
          'supersedesNoteVersionId',v_prior.id,
          'title',btrim(p_title),
          'bodyMarkdown',p_body_markdown,
          'sourceIds',p_source_ids,
          'provenance',p_provenance,
          'authorId',p_author
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.neural_canonical_note_versions(
    id,concept_id,version,supersedes_id,title,body_markdown,
    source_ids,provenance,status,content_sha256,author_id
  ) values (
    v_id,p_concept_id,v_version,v_prior.id,btrim(p_title),p_body_markdown,
    p_source_ids,p_provenance,'draft',v_hash,p_author
  );

  return jsonb_build_object(
    'noteVersionId',v_id,
    'conceptId',p_concept_id,
    'version',v_version,
    'supersedesNoteVersionId',v_prior.id,
    'status','draft',
    'contentSha256',v_hash,
    'provenance',p_provenance,
    'authorId',p_author
  );
end;
$function$;

revoke all on function public.neural_create_canonical_note_draft(text,text,text,jsonb,jsonb,uuid)
  from public,anon,authenticated;
grant execute on function public.neural_create_canonical_note_draft(text,text,text,jsonb,jsonb,uuid)
  to service_role;

create or replace function public.current_neural_note_review_target_sha256(
  p_note_version_id uuid,
  p_review_kind text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_note public.neural_canonical_note_versions%rowtype;
  v_catalog public.study_catalog%rowtype;
  v_sources jsonb;
  v_target jsonb;
begin
  if p_review_kind not in ('medical','references','rights') then
    raise exception using errcode='22023', message='invalid_review_kind';
  end if;

  select * into v_note
  from public.neural_canonical_note_versions
  where id=p_note_version_id;

  if not found then
    raise exception using errcode='22023', message='neural_note_unknown';
  end if;

  select * into v_catalog
  from public.study_catalog
  order by version desc
  limit 1;

  select coalesce(jsonb_agg(s.value order by s.value->>'sourceId'),'[]'::jsonb)
  into v_sources
  from jsonb_array_elements(coalesce(v_catalog.body->'sources','[]'::jsonb)) s(value)
  where s.value->>'sourceId' in (
    select jsonb_array_elements_text(v_note.source_ids)
  );

  if jsonb_array_length(v_sources) <> jsonb_array_length(v_note.source_ids) then
    raise exception using errcode='22023', message='review_target_sources_missing';
  end if;

  if p_review_kind='medical' then
    v_target := jsonb_build_object(
      'note',jsonb_build_object(
        'noteVersionId',v_note.id,
        'conceptId',v_note.concept_id,
        'version',v_note.version,
        'supersedesNoteVersionId',v_note.supersedes_id,
        'title',v_note.title,
        'bodyMarkdown',v_note.body_markdown,
        'provenance',v_note.provenance
      )
    );
  elsif p_review_kind='references' then
    v_target := jsonb_build_object(
      'note',jsonb_build_object(
        'noteVersionId',v_note.id,
        'conceptId',v_note.concept_id,
        'version',v_note.version,
        'title',v_note.title,
        'bodyMarkdown',v_note.body_markdown,
        'sourceIds',v_note.source_ids,
        'provenance',v_note.provenance
      ),
      'sources',(
        select coalesce(jsonb_agg(value-'rights' order by value->>'sourceId'),'[]'::jsonb)
        from jsonb_array_elements(v_sources)
      )
    );
  else
    v_target := jsonb_build_object(
      'note',jsonb_build_object(
        'noteVersionId',v_note.id,
        'conceptId',v_note.concept_id,
        'version',v_note.version,
        'sourceIds',v_note.source_ids,
        'provenance',v_note.provenance
      ),
      'sources',v_sources
    );
  end if;

  return encode(
    extensions.digest(convert_to(v_target::text,'UTF8'),'sha256'),
    'hex'
  );
end;
$function$;

revoke all on function public.current_neural_note_review_target_sha256(uuid,text)
  from public,anon,authenticated;
grant execute on function public.current_neural_note_review_target_sha256(uuid,text)
  to service_role;
