-- M06b: extend the existing content review ledger to canonical NeuralVault note versions.
-- Existing question review behavior is preserved. Notes reuse the same reviewer grants
-- and source-rights evidence.

alter table public.content_review_events
  add column if not exists target_type text,
  add column if not exists target_id text;

update public.content_review_events
set target_type='question_version',
    target_id=question_version_id
where target_type is null or target_id is null;

create or replace function public.content_review_fill_target_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.target_type is null then
    if new.question_version_id is not null then
      new.target_type := 'question_version';
    else
      raise exception using errcode='22023', message='review_target_type_required';
    end if;
  end if;

  if new.target_id is null then
    if new.target_type='question_version' and new.question_version_id is not null then
      new.target_id := new.question_version_id;
    else
      raise exception using errcode='22023', message='review_target_id_required';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists content_review_fill_target_identity
  on public.content_review_events;
create trigger content_review_fill_target_identity
before insert on public.content_review_events
for each row execute function public.content_review_fill_target_identity();

alter table public.content_review_events
  alter column question_version_id drop not null,
  alter column target_type set not null,
  alter column target_id set not null;

alter table public.content_review_events
  drop constraint if exists content_review_events_target_type_check;
alter table public.content_review_events
  add constraint content_review_events_target_type_check
  check (target_type in ('question_version','neural_note_version'));

alter table public.content_review_events
  drop constraint if exists content_review_events_target_identity_check;
alter table public.content_review_events
  add constraint content_review_events_target_identity_check
  check (
    (target_type='question_version'
      and question_version_id is not null
      and target_id=question_version_id)
    or
    (target_type='neural_note_version'
      and question_version_id is null
      and target_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  );

create unique index if not exists content_review_events_target_kind_key
  on public.content_review_events(target_type,target_id,review_kind);

alter table public.neural_canonical_note_versions
  add column if not exists author_id uuid references auth.users(id) on delete restrict;

alter table public.neural_canonical_note_versions
  alter column author_id set not null;

alter table public.neural_canonical_note_versions
  drop constraint if exists neural_canonical_note_versions_status_check;
alter table public.neural_canonical_note_versions
  drop constraint if exists neural_canonical_note_versions_check;

alter table public.neural_canonical_note_versions
  add constraint neural_canonical_note_versions_status_check
  check (status in ('draft','in_review','verified','published','retired','rejected'));

alter table public.neural_canonical_note_versions
  add constraint neural_canonical_note_versions_publication_check
  check (
    (status in ('published','retired') and published_at is not null)
    or
    (status in ('draft','in_review','verified','rejected') and published_at is null)
  );

drop function if exists public.neural_create_canonical_note_draft(text,text,text,jsonb);

create function public.neural_create_canonical_note_draft(
  p_concept_id text,
  p_title text,
  p_body_markdown text,
  p_source_ids jsonb,
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
     or jsonb_array_length(p_source_ids) < 1 then
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
    source_ids,status,content_sha256,author_id
  ) values (
    v_id,p_concept_id,v_version,v_prior.id,btrim(p_title),p_body_markdown,
    p_source_ids,'draft',v_hash,p_author
  );

  return jsonb_build_object(
    'noteVersionId',v_id,
    'conceptId',p_concept_id,
    'version',v_version,
    'supersedesNoteVersionId',v_prior.id,
    'status','draft',
    'contentSha256',v_hash,
    'authorId',p_author
  );
end;
$function$;

revoke all on function public.neural_create_canonical_note_draft(text,text,text,jsonb,uuid)
  from public,anon,authenticated;
grant execute on function public.neural_create_canonical_note_draft(text,text,text,jsonb,uuid)
  to service_role;

create or replace function public.neural_submit_canonical_note_for_review(
  p_note_version_id uuid,
  p_author uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_note public.neural_canonical_note_versions%rowtype;
begin
  select * into v_note
  from public.neural_canonical_note_versions
  where id=p_note_version_id
  for update;

  if not found then
    raise exception using errcode='22023', message='neural_note_unknown';
  end if;
  if v_note.author_id <> p_author then
    raise exception using errcode='42501', message='neural_note_author_mismatch';
  end if;
  if v_note.status <> 'draft' then
    raise exception using errcode='22023', message='neural_note_not_draft';
  end if;

  update public.neural_canonical_note_versions
  set status='in_review'
  where id=p_note_version_id;

  return jsonb_build_object(
    'noteVersionId',p_note_version_id,
    'conceptId',v_note.concept_id,
    'version',v_note.version,
    'status','in_review'
  );
end;
$function$;

revoke all on function public.neural_submit_canonical_note_for_review(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.neural_submit_canonical_note_for_review(uuid,uuid)
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
        'bodyMarkdown',v_note.body_markdown
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
        'sourceIds',v_note.source_ids
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
        'sourceIds',v_note.source_ids
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

create or replace function public.record_neural_note_review(
  p_note_version_id uuid,
  p_review_kind text,
  p_reviewer uuid,
  p_decision text,
  p_notes text
)
returns table(
  review_id uuid,
  target_sha256 text,
  reviewed_at timestamptz,
  note_status text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_note public.neural_canonical_note_versions%rowtype;
  v_catalog public.study_catalog%rowtype;
  v_hash text;
  v_review_id uuid := gen_random_uuid();
  v_reviewed_at timestamptz := now();
  v_review_count integer;
  v_approved_count integer;
  v_next_status text;
begin
  if p_review_kind not in ('medical','references','rights') then
    raise exception using errcode='22023', message='invalid_review_kind';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception using errcode='22023', message='invalid_review_decision';
  end if;
  if char_length(btrim(coalesce(p_notes,''))) not between 1 and 4000 then
    raise exception using errcode='22023', message='invalid_review_notes';
  end if;
  if not public.has_active_reviewer_grant(p_reviewer,p_review_kind) then
    raise exception using errcode='42501', message='reviewer_not_authorized';
  end if;

  select * into v_note
  from public.neural_canonical_note_versions
  where id=p_note_version_id
  for update;

  if not found then
    raise exception using errcode='22023', message='neural_note_unknown';
  end if;
  if v_note.status <> 'in_review' then
    raise exception using errcode='22023', message='neural_note_not_in_review';
  end if;
  if v_note.author_id=p_reviewer then
    raise exception using errcode='42501', message='author_cannot_self_review';
  end if;

  if exists(
    select 1
    from public.content_review_events e
    where e.target_type='neural_note_version'
      and e.target_id=p_note_version_id::text
      and e.decision='rejected'
  ) then
    raise exception using errcode='22023', message='neural_note_review_rejected';
  end if;

  select * into v_catalog
  from public.study_catalog
  order by version desc
  limit 1;

  if p_review_kind='rights' and p_decision='approved' and exists(
    select 1
    from jsonb_array_elements(coalesce(v_catalog.body->'sources','[]'::jsonb)) s(value)
    left join public.source_rights_events e
      on e.source_id=s.value->>'sourceId'
    where s.value->>'sourceId' in (
      select jsonb_array_elements_text(v_note.source_ids)
    )
      and (
        coalesce(s.value->'rights'->>'status','unknown')
          not in ('owned','licensed','public_domain','citation_only')
        or e.id is null
        or e.source_fingerprint_sha256 <>
          public.current_source_fingerprint_sha256(s.value->>'sourceId')
      )
  ) then
    raise exception using errcode='22023', message='rights_not_resolved';
  end if;

  v_hash := public.current_neural_note_review_target_sha256(
    p_note_version_id,p_review_kind
  );

  insert into public.content_review_events(
    id,question_version_id,target_type,target_id,review_kind,
    reviewer_id,decision,notes,target_sha256,reviewed_at
  ) values (
    v_review_id,null,'neural_note_version',p_note_version_id::text,p_review_kind,
    p_reviewer,p_decision,btrim(p_notes),v_hash,v_reviewed_at
  );

  select
    count(*)::integer,
    count(*) filter(where decision='approved')::integer
  into v_review_count,v_approved_count
  from public.content_review_events
  where target_type='neural_note_version'
    and target_id=p_note_version_id::text;

  if p_decision='rejected' then
    v_next_status := 'rejected';
  elsif v_review_count=3 and v_approved_count=3 then
    v_next_status := 'verified';
  else
    v_next_status := 'in_review';
  end if;

  update public.neural_canonical_note_versions
  set status=v_next_status
  where id=p_note_version_id;

  return query
  select v_review_id,v_hash,v_reviewed_at,v_next_status;
end;
$function$;

revoke all on function public.record_neural_note_review(uuid,text,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.record_neural_note_review(uuid,text,uuid,text,text)
  to service_role;

create or replace function public.publish_verified_neural_note(
  p_note_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_note public.neural_canonical_note_versions%rowtype;
  v_catalog public.study_catalog%rowtype;
  v_kind text;
  v_event public.content_review_events%rowtype;
  v_published_at timestamptz := now();
begin
  select * into v_note
  from public.neural_canonical_note_versions
  where id=p_note_version_id
  for update;

  if not found then
    raise exception using errcode='22023', message='neural_note_unknown';
  end if;
  if v_note.status <> 'verified' then
    raise exception using errcode='22023', message='neural_note_not_verified';
  end if;

  if exists(
    select 1
    from public.neural_canonical_note_versions n
    where n.concept_id=v_note.concept_id
      and n.version>v_note.version
      and n.status='published'
  ) then
    raise exception using errcode='22023', message='newer_note_version_already_published';
  end if;

  select * into v_catalog
  from public.study_catalog
  order by version desc
  limit 1;

  if exists(
    select 1
    from jsonb_array_elements(coalesce(v_catalog.body->'sources','[]'::jsonb)) s(value)
    left join public.source_rights_events e
      on e.source_id=s.value->>'sourceId'
    where s.value->>'sourceId' in (
      select jsonb_array_elements_text(v_note.source_ids)
    )
      and (
        coalesce(s.value->'rights'->>'status','unknown')
          not in ('owned','licensed','public_domain','citation_only')
        or e.id is null
        or e.source_fingerprint_sha256 <>
          public.current_source_fingerprint_sha256(s.value->>'sourceId')
      )
  ) then
    raise exception using errcode='22023', message='publication_rights_unresolved';
  end if;

  foreach v_kind in array array['medical','references','rights']
  loop
    select * into v_event
    from public.content_review_events
    where target_type='neural_note_version'
      and target_id=p_note_version_id::text
      and review_kind=v_kind;

    if not found
       or v_event.decision <> 'approved'
       or v_event.target_sha256 <>
          public.current_neural_note_review_target_sha256(p_note_version_id,v_kind) then
      raise exception using errcode='22023', message='publication_review_evidence_invalid';
    end if;
  end loop;

  update public.neural_canonical_note_versions
  set status='retired'
  where concept_id=v_note.concept_id
    and status='published'
    and id<>p_note_version_id;

  update public.neural_canonical_note_versions
  set status='published',
      published_at=v_published_at
  where id=p_note_version_id;

  return jsonb_build_object(
    'noteVersionId',p_note_version_id,
    'conceptId',v_note.concept_id,
    'version',v_note.version,
    'status','published',
    'publishedAt',v_published_at,
    'contentSha256',v_note.content_sha256
  );
end;
$function$;

revoke all on function public.publish_verified_neural_note(uuid)
  from public,anon,authenticated;
grant execute on function public.publish_verified_neural_note(uuid)
  to service_role;
