-- Read-only, Admin-scoped scope review preflight. This does not accept, activate or publish a syllabus.
create function public.syllabus_baseline_review_preflight_v1(
 p_actor uuid,p_baseline_id uuid,p_revision integer
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_draft public.content_syllabus_baseline_draft_versions;
 v_body jsonb;v_catalog_version bigint;v_latest int;v_canonical_labels jsonb;v_members jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required';end if;
 if p_baseline_id is null or p_revision is null or p_revision not between 1 and 10000
 then raise exception 'syllabus_review_preflight_invalid';end if;
 select * into v_draft from public.content_syllabus_baseline_draft_versions
  where baseline_id=p_baseline_id and revision=p_revision;
 if not found then raise exception 'syllabus_baseline_not_found';end if;
 select max(revision) into v_latest from public.content_syllabus_baseline_draft_versions
  where baseline_id=p_baseline_id;
 select body,version into v_body,v_catalog_version from public.study_catalog where id=1;
 if v_body is null or jsonb_typeof(v_body->'concepts') is distinct from 'array'
   or jsonb_array_length(v_body->'concepts')>5000
 then raise exception 'syllabus_baseline_catalog_unavailable';end if;
 select coalesce(jsonb_object_agg(c->>'conceptId',c->>'label'),'{}'::jsonb)
  into v_canonical_labels from jsonb_array_elements(v_body->'concepts') c;
 select coalesce(jsonb_agg(jsonb_build_object('conceptId',m.concept_id,
   'label',coalesce(v_canonical_labels->>m.concept_id,'Not in current canonical catalog'),
   'exists',v_canonical_labels ? m.concept_id) order by m.position),'[]'::jsonb)
  into v_members
  from jsonb_array_elements_text(v_draft.document->'conceptIds') with ordinality m(concept_id,position);
 return jsonb_build_object(
  'contractId','admin-syllabus-review-preflight-v1','baselineId',v_draft.baseline_id,
  'revision',v_draft.revision,'digest',v_draft.digest,
  'authoredCatalogVersion',v_draft.catalog_version,'currentCatalogVersion',v_catalog_version,
  'registryVersion',v_draft.registry_version,'pathwayVersionId',v_draft.pathway_version_id,
  'scopeDeclaration',v_draft.document->>'scopeDeclaration','sourceKind',v_draft.document->>'sourceKind',
  'sourceLocator',v_draft.document->>'sourceLocator','sourceVersion',v_draft.document->>'sourceVersion',
  'isLatest',v_latest=v_draft.revision,'members',v_members
 );
end; $$;
revoke all on function public.syllabus_baseline_review_preflight_v1(uuid,uuid,integer)
 from public,anon,authenticated;
grant execute on function public.syllabus_baseline_review_preflight_v1(uuid,uuid,integer) to service_role;
