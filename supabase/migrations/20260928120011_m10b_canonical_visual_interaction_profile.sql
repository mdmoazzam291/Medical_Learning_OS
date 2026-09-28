create table public.content_visual_interaction_profiles (
  question_version_id text primary key
    check (question_version_id ~ '^[a-zA-Z0-9:_@.\-]{1,180}$'),
  media_asset_version_id text not null
    references public.content_media_assets(media_asset_version_id) on delete restrict,
  schema_version integer not null default 1
    check (schema_version = 1),
  task_type text not null
    check (task_type in ('detection','localization','description','interpretation','discrimination')),
  created_at timestamptz not null default pg_catalog.now()
);

create index content_visual_interaction_profiles_media_idx
  on public.content_visual_interaction_profiles(media_asset_version_id);

alter table public.content_visual_interaction_profiles enable row level security;

revoke all on table public.content_visual_interaction_profiles
  from public, anon, authenticated, service_role;
grant select on table public.content_visual_interaction_profiles
  to service_role;

create trigger content_visual_interaction_profiles_immutable
before update or delete on public.content_visual_interaction_profiles
for each row execute function public.block_content_media_mutation();

create or replace function public.content_register_visual_interaction_v1(
  p_question_version_id text,
  p_media_asset_version_id text,
  p_task_type text
)
returns jsonb
language plpgsql
security definer
set search_path = 'public','pg_temp'
as $function$
declare
  v_question jsonb;
begin
  if coalesce(p_question_version_id,'') !~ '^[a-zA-Z0-9:_@.\-]{1,180}$'
     or coalesce(p_media_asset_version_id,'') !~ '^[a-zA-Z0-9:_@.\-]{1,220}$'
     or p_task_type not in ('detection','localization','description','interpretation','discrimination')
  then
    raise exception using errcode='22023', message='visual_interaction_profile_invalid';
  end if;

  select q into v_question
  from public.study_catalog c
  cross join lateral jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
  where c.id=1 and q->>'questionVersionId'=p_question_version_id
  limit 1;

  if v_question is null then
    raise exception using errcode='22023', message='visual_interaction_question_unknown';
  end if;

  if v_question->>'status' <> 'in_review' then
    raise exception using errcode='22023', message='visual_interaction_requires_in_review';
  end if;

  if not exists (
    select 1
    from public.content_question_media_links l
    where l.question_version_id=p_question_version_id
      and l.media_asset_version_id=p_media_asset_version_id
      and l.role='prompt'
  ) then
    raise exception using errcode='22023', message='visual_interaction_prompt_media_mismatch';
  end if;

  insert into public.content_visual_interaction_profiles(
    question_version_id,media_asset_version_id,schema_version,task_type
  ) values (
    p_question_version_id,p_media_asset_version_id,1,p_task_type
  );

  return jsonb_build_object(
    'contractId','content-visual-interaction-profile-v1',
    'questionVersionId',p_question_version_id,
    'mediaAssetVersionId',p_media_asset_version_id,
    'schemaVersion',1,
    'taskType',p_task_type,
    'publicationAuthority',false
  );
end;
$function$;

revoke all on function public.content_register_visual_interaction_v1(text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.content_register_visual_interaction_v1(text,text,text)
  to service_role;

create or replace function public.content_media_prompt(p_question_version_id text)
returns jsonb
language sql
stable
set search_path to ''
as $function$
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
    ) order by l.display_order,a.media_asset_version_id) filter (where a.media_asset_version_id is not null),'[]'::jsonb),
    'visualInteraction',(
      select pg_catalog.jsonb_build_object(
        'schemaVersion',v.schema_version,
        'taskType',v.task_type,
        'mediaAssetVersionId',v.media_asset_version_id
      )
      from public.content_visual_interaction_profiles v
      where v.question_version_id=p_question_version_id
      limit 1
    )
  )
  from public.content_question_media_links l
  join public.content_media_assets a on a.media_asset_version_id=l.media_asset_version_id
  where l.question_version_id=p_question_version_id and l.role='prompt'
$function$;

create or replace function public.content_media_review_target(
  p_question_version_id text,
  p_review_kind text
)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','extensions','pg_temp'
as $function$
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
            'annotationVersionIds',to_jsonb(l.annotation_version_ids),
            'visualInteraction',case when v.question_version_id is null then null else jsonb_build_object(
              'schemaVersion',v.schema_version,'taskType',v.task_type,
              'mediaAssetVersionId',v.media_asset_version_id
            ) end
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
            'annotationVersionIds',to_jsonb(l.annotation_version_ids),
            'visualInteraction',case when v.question_version_id is null then null else jsonb_build_object(
              'schemaVersion',v.schema_version,'taskType',v.task_type,
              'mediaAssetVersionId',v.media_asset_version_id
            ) end
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
            'displayOrder',l.display_order,'annotationVersionIds',to_jsonb(l.annotation_version_ids),
            'visualInteraction',case when v.question_version_id is null then null else jsonb_build_object(
              'schemaVersion',v.schema_version,'taskType',v.task_type,
              'mediaAssetVersionId',v.media_asset_version_id
            ) end
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
    left join public.content_visual_interaction_profiles v
      on v.question_version_id=l.question_version_id
     and v.media_asset_version_id=l.media_asset_version_id
    where l.question_version_id=p_question_version_id
  ) s;

  return v_result;
end;
$function$;

select public.content_register_visual_interaction_v1(
  'visual:pathology:clear-cell-rcc@1',
  'media:pathology:clear-cell-rcc-grade1@1',
  'detection'
);
