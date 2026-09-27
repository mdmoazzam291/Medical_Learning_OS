-- M10a: service-only linking of already registered immutable media to a current question version.

create or replace function public.content_link_question_media_v1(
  p_question_version_id text,
  p_media_asset_version_id text,
  p_role text,
  p_display_order integer,
  p_blind_first_look boolean,
  p_annotation_version_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_question jsonb;
  v_status text;
begin
  if coalesce(p_question_version_id,'') !~ '^[a-zA-Z0-9:_@.\-]{1,180}$'
     or coalesce(p_media_asset_version_id,'') !~ '^[a-zA-Z0-9:_@.\-]{1,220}$'
     or p_role not in ('prompt','explanation','comparison')
     or p_display_order is null or p_display_order < 0
     or p_blind_first_look is null
     or p_annotation_version_ids is null
  then raise exception using errcode='22023', message='question_media_link_invalid';
  end if;

  select q into v_question
  from public.study_catalog c
  cross join lateral jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
  where c.id=1 and q->>'questionVersionId'=p_question_version_id
  limit 1;

  if v_question is null then
    raise exception using errcode='22023', message='question_media_question_unknown';
  end if;

  v_status := v_question->>'status';
  if v_status not in ('in_review','verified','published') then
    raise exception using errcode='22023', message='question_media_question_not_eligible';
  end if;

  if not exists(
    select 1 from public.content_media_assets a
    where a.media_asset_version_id=p_media_asset_version_id
  ) then
    raise exception using errcode='22023', message='question_media_asset_unknown';
  end if;

  if cardinality(p_annotation_version_ids) <> (
      select count(distinct id) from unnest(p_annotation_version_ids) id
     )
     or exists(
       select 1 from unnest(p_annotation_version_ids) id
       where not exists(
         select 1 from public.content_media_annotations a
         where a.annotation_version_id=id
           and a.media_asset_version_id=p_media_asset_version_id
       )
     )
  then raise exception using errcode='22023', message='question_media_annotation_invalid';
  end if;

  insert into public.content_question_media_links(
    question_version_id,media_asset_version_id,role,display_order,blind_first_look,annotation_version_ids
  ) values (
    p_question_version_id,p_media_asset_version_id,p_role,p_display_order,p_blind_first_look,p_annotation_version_ids
  );

  return jsonb_build_object(
    'contractId','content-question-media-link-v1',
    'questionVersionId',p_question_version_id,
    'mediaAssetVersionId',p_media_asset_version_id,
    'role',p_role,
    'displayOrder',p_display_order,
    'blindFirstLook',p_blind_first_look,
    'annotationVersionIds',to_jsonb(p_annotation_version_ids),
    'publicationAuthority',false
  );
end;
$$;

revoke all on function public.content_link_question_media_v1(text,text,text,integer,boolean,text[])
  from public, anon, authenticated;
grant execute on function public.content_link_question_media_v1(text,text,text,integer,boolean,text[])
  to service_role;
