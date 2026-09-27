-- M10a Phase-1 multimodal persistence and review binding.
-- Media remains service-only canonical content metadata; browser roles have no direct table/RPC mutation access.
-- Existing text-only review fingerprints are preserved exactly because media is added to the target only when links exist.

create table public.content_media_assets (
  media_asset_version_id text primary key
    check (media_asset_version_id ~ '^[a-zA-Z0-9:_@.\\-]{1,220}$'),
  media_asset_id text not null
    check (media_asset_id ~ '^[a-zA-Z0-9:_.\\-]{1,200}$'),
  version integer not null check (version >= 1),
  supersedes text references public.content_media_assets(media_asset_version_id) on delete restrict,
  modality text not null check (modality in ('radiology','pathology','dermatology','ophthalmology','anatomy','ecg')),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  delivery_ref text not null check (char_length(btrim(delivery_ref)) between 1 and 2000),
  source jsonb not null check (jsonb_typeof(source)='object'),
  diagnosis_evidence text not null check (char_length(btrim(diagnosis_evidence)) between 1 and 8000),
  review jsonb not null check (jsonb_typeof(review)='object'),
  created_at timestamptz not null default now(),
  unique (media_asset_id, version),
  check (media_asset_version_id = media_asset_id || '@' || version::text),
  check (
    (version=1 and supersedes is null)
    or (version>1 and supersedes = media_asset_id || '@' || (version-1)::text)
  )
);

create table public.content_media_annotations (
  annotation_version_id text primary key
    check (annotation_version_id ~ '^[a-zA-Z0-9:_@.\\-]{1,240}$'),
  annotation_id text not null
    check (annotation_id ~ '^[a-zA-Z0-9:_.\\-]{1,220}$'),
  version integer not null check (version >= 1),
  supersedes text references public.content_media_annotations(annotation_version_id) on delete restrict,
  media_asset_version_id text not null references public.content_media_assets(media_asset_version_id) on delete restrict,
  kind text not null check (kind in ('hotspot','bbox','polygon')),
  geometry jsonb not null check (jsonb_typeof(geometry)='object'),
  label text not null check (char_length(btrim(label)) between 1 and 500),
  concept_id text not null check (concept_id ~ '^[a-zA-Z0-9:_@.\\-]{1,160}$'),
  author_id text not null check (char_length(btrim(author_id)) between 1 and 200),
  review jsonb not null check (jsonb_typeof(review)='object'),
  created_at timestamptz not null default now(),
  unique (annotation_id, version),
  check (annotation_version_id = annotation_id || '@' || version::text),
  check (
    (version=1 and supersedes is null)
    or (version>1 and supersedes = annotation_id || '@' || (version-1)::text)
  )
);

create table public.content_question_media_links (
  question_version_id text not null
    check (question_version_id ~ '^[a-zA-Z0-9:_@.\\-]{1,180}$'),
  media_asset_version_id text not null references public.content_media_assets(media_asset_version_id) on delete restrict,
  role text not null check (role in ('prompt','explanation','comparison')),
  display_order integer not null check (display_order >= 0),
  blind_first_look boolean not null,
  annotation_version_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (question_version_id, media_asset_version_id, role, display_order)
);

create index content_question_media_links_question
  on public.content_question_media_links(question_version_id, role, display_order);

alter table public.content_media_assets enable row level security;
alter table public.content_media_annotations enable row level security;
alter table public.content_question_media_links enable row level security;

revoke all on table public.content_media_assets from public, anon, authenticated, service_role;
revoke all on table public.content_media_annotations from public, anon, authenticated, service_role;
revoke all on table public.content_question_media_links from public, anon, authenticated, service_role;
grant select on table public.content_media_assets to service_role;
grant select on table public.content_media_annotations to service_role;
grant select on table public.content_question_media_links to service_role;

create or replace function public.block_content_media_mutation()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  raise exception using errcode='55000', message='content_media_immutable';
end;
$$;
revoke all on function public.block_content_media_mutation() from public, anon, authenticated, service_role;

create trigger content_media_assets_immutable
before update or delete on public.content_media_assets
for each row execute function public.block_content_media_mutation();
create trigger content_media_annotations_immutable
before update or delete on public.content_media_annotations
for each row execute function public.block_content_media_mutation();
create trigger content_question_media_links_immutable
before update or delete on public.content_question_media_links
for each row execute function public.block_content_media_mutation();

create or replace function public.content_register_media_bundle_v1(p_bundle jsonb)
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_temp'
as $$
declare
  v_asset jsonb;
  v_annotation jsonb;
  v_link jsonb;
  v_source jsonb;
  v_review jsonb;
  v_geometry jsonb;
  v_annotation_ids text[];
begin
  if p_bundle is null or jsonb_typeof(p_bundle) <> 'object'
     or coalesce((p_bundle->>'schemaVersion')::integer,0) <> 1
     or jsonb_typeof(p_bundle->'assets') <> 'array'
     or jsonb_typeof(p_bundle->'annotations') <> 'array'
     or jsonb_typeof(p_bundle->'questionLinks') <> 'array'
     or (select count(*) from jsonb_object_keys(p_bundle)) <> 4
  then raise exception using errcode='22023', message='media_bundle_invalid';
  end if;

  if jsonb_array_length(p_bundle->'assets') < 1
     or jsonb_array_length(p_bundle->'assets') > 100
     or jsonb_array_length(p_bundle->'annotations') > 500
     or jsonb_array_length(p_bundle->'questionLinks') > 500
  then raise exception using errcode='22023', message='media_bundle_size_invalid';
  end if;

  for v_asset in select value from jsonb_array_elements(p_bundle->'assets') loop
    if jsonb_typeof(v_asset) <> 'object'
       or (select count(*) from jsonb_object_keys(v_asset)) <> 13
       or not (v_asset ?& array['mediaAssetId','mediaAssetVersionId','version','supersedes','modality','mimeType','contentSha256','width','height','deliveryRef','source','diagnosisEvidence','review'])
       or coalesce((v_asset->>'version')::integer,0) <> 1
       or v_asset->'supersedes' <> 'null'::jsonb
    then raise exception using errcode='22023', message='media_asset_invalid';
    end if;

    v_source := v_asset->'source';
    v_review := v_asset->'review';
    if jsonb_typeof(v_source) <> 'object'
       or (select count(*) from jsonb_object_keys(v_source)) <> 8
       or not (v_source ?& array['sourceId','provider','originalIdentifier','url','copyright','license','rightsStatus','rightsEvidence'])
       or coalesce(v_source->>'rightsStatus','') not in ('unknown','owned','licensed','public_domain')
       or coalesce(v_source->>'url','') !~ '^https://'
       or char_length(btrim(coalesce(v_source->>'rightsEvidence',''))) < 1
       or jsonb_typeof(v_review) <> 'object'
       or (select count(*) from jsonb_object_keys(v_review)) <> 3
       or not (v_review ?& array['status','reviewerId','reviewedAt'])
       or v_review->>'status' <> 'unverified'
       or v_review->'reviewerId' <> 'null'::jsonb
       or v_review->'reviewedAt' <> 'null'::jsonb
    then raise exception using errcode='22023', message='media_asset_metadata_invalid';
    end if;

    insert into public.content_media_assets(
      media_asset_version_id,media_asset_id,version,supersedes,modality,mime_type,
      content_sha256,width,height,delivery_ref,source,diagnosis_evidence,review
    ) values (
      v_asset->>'mediaAssetVersionId',v_asset->>'mediaAssetId',1,null,
      v_asset->>'modality',v_asset->>'mimeType',v_asset->>'contentSha256',
      (v_asset->>'width')::integer,(v_asset->>'height')::integer,
      v_asset->>'deliveryRef',v_source,v_asset->>'diagnosisEvidence',v_review
    );
  end loop;

  for v_annotation in select value from jsonb_array_elements(p_bundle->'annotations') loop
    if jsonb_typeof(v_annotation) <> 'object'
       or (select count(*) from jsonb_object_keys(v_annotation)) <> 11
       or not (v_annotation ?& array['annotationId','annotationVersionId','version','supersedes','mediaAssetVersionId','kind','geometry','label','conceptId','authorId','review'])
       or coalesce((v_annotation->>'version')::integer,0) <> 1
       or v_annotation->'supersedes' <> 'null'::jsonb
       or not exists(select 1 from public.content_media_assets a where a.media_asset_version_id=v_annotation->>'mediaAssetVersionId')
       or not exists(
         select 1 from public.study_catalog c
         cross join lateral jsonb_array_elements(coalesce(c.body->'concepts','[]'::jsonb)) concept
         where c.id=1 and concept->>'conceptId'=v_annotation->>'conceptId'
       )
    then raise exception using errcode='22023', message='media_annotation_invalid';
    end if;

    v_review := v_annotation->'review';
    v_geometry := v_annotation->'geometry';
    if jsonb_typeof(v_review) <> 'object'
       or v_review->>'status' <> 'unverified'
       or v_review->'reviewerId' <> 'null'::jsonb
       or v_review->'reviewedAt' <> 'null'::jsonb
       or jsonb_typeof(v_geometry) <> 'object'
    then raise exception using errcode='22023', message='media_annotation_metadata_invalid';
    end if;

    insert into public.content_media_annotations(
      annotation_version_id,annotation_id,version,supersedes,media_asset_version_id,
      kind,geometry,label,concept_id,author_id,review
    ) values (
      v_annotation->>'annotationVersionId',v_annotation->>'annotationId',1,null,
      v_annotation->>'mediaAssetVersionId',v_annotation->>'kind',v_geometry,
      v_annotation->>'label',v_annotation->>'conceptId',v_annotation->>'authorId',v_review
    );
  end loop;

  for v_link in select value from jsonb_array_elements(p_bundle->'questionLinks') loop
    if jsonb_typeof(v_link) <> 'object'
       or (select count(*) from jsonb_object_keys(v_link)) <> 6
       or not (v_link ?& array['questionVersionId','mediaAssetVersionId','role','displayOrder','blindFirstLook','annotationVersionIds'])
       or jsonb_typeof(v_link->'annotationVersionIds') <> 'array'
       or not exists(select 1 from public.content_media_assets a where a.media_asset_version_id=v_link->>'mediaAssetVersionId')
       or not exists(
         select 1 from public.study_catalog c
         cross join lateral jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
         where c.id=1 and q->>'questionVersionId'=v_link->>'questionVersionId'
       )
    then raise exception using errcode='22023', message='question_media_link_invalid';
    end if;

    select coalesce(array_agg(value#>>'{}' order by value#>>'{}'),'{}'::text[])
      into v_annotation_ids
    from jsonb_array_elements(v_link->'annotationVersionIds');

    if cardinality(v_annotation_ids) <> (select count(distinct x) from unnest(v_annotation_ids) x)
       or exists(
         select 1 from unnest(v_annotation_ids) id
         where not exists(
           select 1 from public.content_media_annotations a
           where a.annotation_version_id=id
             and a.media_asset_version_id=v_link->>'mediaAssetVersionId'
         )
       )
    then raise exception using errcode='22023', message='question_media_annotation_invalid';
    end if;

    insert into public.content_question_media_links(
      question_version_id,media_asset_version_id,role,display_order,blind_first_look,annotation_version_ids
    ) values (
      v_link->>'questionVersionId',v_link->>'mediaAssetVersionId',v_link->>'role',
      (v_link->>'displayOrder')::integer,(v_link->>'blindFirstLook')::boolean,v_annotation_ids
    );
  end loop;

  return jsonb_build_object(
    'contractId','content-media-bundle-v1',
    'assetCount',jsonb_array_length(p_bundle->'assets'),
    'annotationCount',jsonb_array_length(p_bundle->'annotations'),
    'questionLinkCount',jsonb_array_length(p_bundle->'questionLinks'),
    'publicationAuthority',false
  );
end;
$$;
revoke all on function public.content_register_media_bundle_v1(jsonb) from public, anon, authenticated;
grant execute on function public.content_register_media_bundle_v1(jsonb) to service_role;

create or replace function public.content_media_review_target(
  p_question_version_id text,
  p_review_kind text
)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','extensions','pg_temp'
as $$
declare
  v_result jsonb;
begin
  if p_review_kind not in ('medical','references','rights') then
    raise exception using errcode='22023', message='invalid_review_kind';
  end if;

  select coalesce(jsonb_agg(item order by role_order,display_order,media_id),'[]'::jsonb)
  into v_result
  from (
    select
      case l.role when 'prompt' then 1 when 'comparison' then 2 else 3 end role_order,
      l.display_order,
      l.media_asset_version_id media_id,
      case p_review_kind
        when 'medical' then jsonb_build_object(
          'link',jsonb_build_object(
            'mediaAssetVersionId',l.media_asset_version_id,'role',l.role,
            'displayOrder',l.display_order,'blindFirstLook',l.blind_first_look,
            'annotationVersionIds',to_jsonb(l.annotation_version_ids)
          ),
          'asset',jsonb_build_object(
            'mediaAssetVersionId',a.media_asset_version_id,'modality',a.modality,'mimeType',a.mime_type,
            'contentSha256',a.content_sha256,'width',a.width,'height',a.height,
            'diagnosisEvidence',a.diagnosis_evidence
          ),
          'annotations',coalesce((
            select jsonb_agg(jsonb_build_object(
              'annotationVersionId',an.annotation_version_id,'kind',an.kind,'geometry',an.geometry,
              'label',an.label,'conceptId',an.concept_id
            ) order by an.annotation_version_id)
            from public.content_media_annotations an
            where an.annotation_version_id=any(l.annotation_version_ids)
          ),'[]'::jsonb)
        )
        when 'references' then jsonb_build_object(
          'link',jsonb_build_object(
            'mediaAssetVersionId',l.media_asset_version_id,'role',l.role,
            'displayOrder',l.display_order,'blindFirstLook',l.blind_first_look,
            'annotationVersionIds',to_jsonb(l.annotation_version_ids)
          ),
          'asset',jsonb_build_object(
            'mediaAssetVersionId',a.media_asset_version_id,'contentSha256',a.content_sha256,
            'diagnosisEvidence',a.diagnosis_evidence,
            'source',jsonb_build_object(
              'sourceId',a.source->'sourceId','provider',a.source->'provider',
              'originalIdentifier',a.source->'originalIdentifier','url',a.source->'url'
            )
          ),
          'annotations',coalesce((
            select jsonb_agg(jsonb_build_object(
              'annotationVersionId',an.annotation_version_id,'kind',an.kind,'geometry',an.geometry,
              'label',an.label,'conceptId',an.concept_id
            ) order by an.annotation_version_id)
            from public.content_media_annotations an
            where an.annotation_version_id=any(l.annotation_version_ids)
          ),'[]'::jsonb)
        )
        else jsonb_build_object(
          'link',jsonb_build_object(
            'mediaAssetVersionId',l.media_asset_version_id,'role',l.role,
            'displayOrder',l.display_order,'annotationVersionIds',to_jsonb(l.annotation_version_ids)
          ),
          'asset',jsonb_build_object(
            'mediaAssetVersionId',a.media_asset_version_id,'contentSha256',a.content_sha256,
            'source',a.source
          ),
          'annotations',coalesce((
            select jsonb_agg(jsonb_build_object(
              'annotationVersionId',an.annotation_version_id,'authorId',an.author_id,
              'kind',an.kind,'geometry',an.geometry,'label',an.label,'conceptId',an.concept_id
            ) order by an.annotation_version_id)
            from public.content_media_annotations an
            where an.annotation_version_id=any(l.annotation_version_ids)
          ),'[]'::jsonb)
        )
      end item
    from public.content_question_media_links l
    join public.content_media_assets a on a.media_asset_version_id=l.media_asset_version_id
    where l.question_version_id=p_question_version_id
  ) s;

  return v_result;
end;
$$;
revoke all on function public.content_media_review_target(text,text) from public, anon, authenticated, service_role;

create or replace function public.current_review_target_sha256(
  p_question_version_id text,
  p_review_kind text
)
returns text
language plpgsql
security definer
set search_path='public','extensions','pg_temp'
as $$
declare
  v_question jsonb;
  v_sources jsonb;
  v_question_core jsonb;
  v_target jsonb;
  v_media jsonb;
begin
  if p_review_kind not in ('medical','references','rights') then
    raise exception using errcode='22023', message='invalid_review_kind';
  end if;

  select q into v_question
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'questions') q
  where c.id=1 and q->>'questionVersionId'=p_question_version_id
  limit 1;
  if v_question is null then
    raise exception using errcode='22023', message='unknown_question_version';
  end if;

  select coalesce(jsonb_agg(s order by s->>'sourceId'),'[]'::jsonb) into v_sources
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'sources') s
  where c.id=1 and s->>'sourceId' in (
    select jsonb_array_elements_text(v_question->'sourceIds')
  );
  if jsonb_array_length(v_sources) <> jsonb_array_length(v_question->'sourceIds') then
    raise exception using errcode='22023', message='review_target_sources_missing';
  end if;

  v_media := public.content_media_review_target(p_question_version_id,p_review_kind);

  if p_review_kind='medical' then
    v_question_core := jsonb_build_object(
      'questionId',v_question->'questionId','questionVersionId',v_question->'questionVersionId',
      'version',v_question->'version','supersedes',v_question->'supersedes',
      'stem',v_question->'stem','options',v_question->'options',
      'answerOptionId',v_question->'answerOptionId','explanation',v_question->'explanation',
      'conceptLinks',v_question->'conceptLinks'
    );
    v_target := jsonb_build_object('medical',v_question_core);
  elsif p_review_kind='references' then
    v_question_core := v_question-'status'-'reviews'-'publishedAt'-'authorId'-'changeReason'-'provenance';
    v_target := jsonb_build_object(
      'question',v_question_core,
      'sources',(
        select coalesce(jsonb_agg(source_without_rights order by source_without_rights->>'sourceId'),'[]'::jsonb)
        from (select s-'rights' source_without_rights from jsonb_array_elements(v_sources) s) stripped
      )
    );
  else
    v_target := jsonb_build_object(
      'question',jsonb_build_object(
        'questionId',v_question->'questionId','questionVersionId',v_question->'questionVersionId',
        'sourceIds',v_question->'sourceIds','provenance',v_question->'provenance'
      ),
      'sources',v_sources
    );
  end if;

  if jsonb_array_length(v_media)>0 then
    v_target := v_target || jsonb_build_object('media',v_media);
  end if;

  return encode(extensions.digest(convert_to(v_target::text,'UTF8'),'sha256'),'hex');
end;
$$;

create or replace function public.enforce_content_media_rights_on_review()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.review_kind='rights' and new.decision='approved' and exists(
    select 1
    from public.content_question_media_links l
    join public.content_media_assets a on a.media_asset_version_id=l.media_asset_version_id
    where l.question_version_id=new.question_version_id
      and coalesce(a.source->>'rightsStatus','unknown') not in ('owned','licensed','public_domain')
  ) then
    raise exception using errcode='22023', message='media_rights_not_resolved';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_content_media_rights_on_review() from public, anon, authenticated, service_role;

create trigger content_review_media_rights_guard
before insert on public.content_review_events
for each row execute function public.enforce_content_media_rights_on_review();
create trigger content_ai_test_review_media_rights_guard
before insert on public.content_ai_test_review_events
for each row execute function public.enforce_content_media_rights_on_review();

create or replace function public.content_media_prompt(p_question_version_id text)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select pg_catalog.jsonb_build_object(
    'contractId','content-media-prompt-v1',
    'questionVersionId',p_question_version_id,
    'media',coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'mediaAssetVersionId',a.media_asset_version_id,
      'modality',a.modality,
      'mimeType',a.mime_type,
      'width',a.width,
      'height',a.height,
      'deliveryRef',a.delivery_ref,
      'blindFirstLook',l.blind_first_look
    ) order by l.display_order,a.media_asset_version_id) filter (where a.media_asset_version_id is not null),'[]'::jsonb)
  )
  from public.content_question_media_links l
  join public.content_media_assets a on a.media_asset_version_id=l.media_asset_version_id
  where l.question_version_id=p_question_version_id and l.role='prompt'
$$;
revoke all on function public.content_media_prompt(text) from public, anon, authenticated;
grant execute on function public.content_media_prompt(text) to service_role;
