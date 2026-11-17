-- Syllabus checklist save and preflight read current private identities (latest subject
-- revision, else the original acceptance) instead of original acceptances only.
-- Function bodies are otherwise unchanged from 20261028223000 and 20261029000100.

create or replace function public.syllabus_baseline_draft_save_v1(p_actor uuid,p_registry_version text,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_request uuid;v_id uuid;v_expected text;v_doc jsonb;v_digest text;
 v_fingerprint text;v_keys text[];v_revision integer;v_latest public.content_syllabus_baseline_draft_versions;
 v_saved public.content_syllabus_baseline_draft_versions;v_catalog jsonb;v_catalog_version bigint;
 v_private_bindings jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required';end if;
 if p_registry_version is null or char_length(p_registry_version)>160 or p_registry_version !~ '^[a-zA-Z0-9:_.@-]+$'
    or jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>200000
 then raise exception 'syllabus_baseline_invalid';end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['baselineId','document','expectedDigest','requestId','schemaVersion']
    or p_input->'schemaVersion' is distinct from '1'::jsonb
    or jsonb_typeof(p_input->'requestId') is distinct from 'string'
    or jsonb_typeof(p_input->'baselineId') not in ('string','null')
    or jsonb_typeof(p_input->'expectedDigest') not in ('string','null')
 then raise exception 'syllabus_baseline_invalid';end if;
 begin v_request:=(p_input->>'requestId')::uuid;v_id:=(p_input->>'baselineId')::uuid;
 exception when others then raise exception 'syllabus_baseline_invalid';end;
 v_expected:=p_input->>'expectedDigest';v_doc:=p_input->'document';
 if (v_id is null)<>(v_expected is null) or (v_expected is not null and v_expected !~ '^[0-9a-f]{64}$')
    or jsonb_typeof(v_doc) is distinct from 'object'
 then raise exception 'syllabus_baseline_invalid';end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(v_doc) k;
 if v_keys is distinct from array['changeReason','conceptIds','label','pathwayVersionId','scopeDeclaration','sourceKind','sourceLocator','sourceVersion']
    or jsonb_typeof(v_doc->'label') is distinct from 'string'
    or char_length(btrim(v_doc->>'label')) not between 1 and 240
    or jsonb_typeof(v_doc->'pathwayVersionId') is distinct from 'string'
    or (v_doc->>'pathwayVersionId') !~ '^[a-zA-Z0-9:_.@-]{1,160}$'
    or jsonb_typeof(v_doc->'sourceKind') is distinct from 'string'
    or v_doc->>'sourceKind' not in ('official','expert','historical')
    or jsonb_typeof(v_doc->'scopeDeclaration') is distinct from 'string'
    or v_doc->>'scopeDeclaration' not in ('partial','complete-proposed')
    or jsonb_typeof(v_doc->'sourceLocator') is distinct from 'string'
    or char_length(btrim(v_doc->>'sourceLocator')) not between 8 and 2000
    or jsonb_typeof(v_doc->'sourceVersion') is distinct from 'string'
    or char_length(btrim(v_doc->>'sourceVersion')) not between 1 and 240
    or jsonb_typeof(v_doc->'changeReason') is distinct from 'string'
    or char_length(btrim(v_doc->>'changeReason')) not between 8 and 2000
    or jsonb_typeof(v_doc->'conceptIds') is distinct from 'array'
    or jsonb_array_length(v_doc->'conceptIds')>2000
    or exists(select 1 from jsonb_array_elements(v_doc->'conceptIds') c where jsonb_typeof(c.value)<>'string' or c.value#>>'{}' !~ '^[a-zA-Z0-9:_.@-]{1,160}$')
    or exists(select 1 from jsonb_array_elements_text(v_doc->'conceptIds') cid group by cid having count(*)>1)
 then raise exception 'syllabus_baseline_invalid';end if;
 v_fingerprint:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('syllabus-baseline-request:'||v_request::text,0));
 select * into v_saved from public.content_syllabus_baseline_draft_versions where request_id=v_request;
 if found then
  if v_saved.submitted_by<>p_actor or v_saved.request_fingerprint<>v_fingerprint
     or v_saved.registry_version<>p_registry_version then raise exception 'syllabus_baseline_request_conflict';end if;
 else
  if v_id is null then v_id:=gen_random_uuid();v_revision:=1;
  else
   perform pg_advisory_xact_lock(hashtextextended('syllabus-baseline:'||v_id::text,0));
   select * into v_latest from public.content_syllabus_baseline_draft_versions where baseline_id=v_id order by revision desc limit 1;
   if not found then raise exception 'syllabus_baseline_not_found';end if;
   if v_latest.digest is distinct from v_expected or v_latest.pathway_version_id is distinct from v_doc->>'pathwayVersionId'
      or v_latest.registry_version is distinct from p_registry_version
   then raise exception 'syllabus_baseline_stale';end if;
   v_revision:=v_latest.revision+1;
   if v_revision>10000 then raise exception 'syllabus_baseline_invalid';end if;
  end if;
  -- Serialize with Admin concept acceptance and catalog publication. The accepted
  -- identity registry remains private and is never copied into learner catalog.
  perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
  select body,version into v_catalog,v_catalog_version from public.study_catalog where id=1;
  if v_catalog is null or jsonb_typeof(v_catalog->'concepts') is distinct from 'array'
   or jsonb_array_length(v_catalog->'concepts')>50000 then raise exception 'syllabus_baseline_catalog_unavailable';end if;
  if exists(
   select 1 from jsonb_array_elements_text(v_doc->'conceptIds') as requested(value)
    where not exists(select 1 from jsonb_array_elements(v_catalog->'concepts') c where c->>'conceptId'=requested.value)
      and not exists(select 1 from public.content_concept_current_identities accepted
                     where accepted.concept_id=requested.value)
  ) then raise exception 'syllabus_baseline_unknown_concept';end if;
  -- Pin exact immutable private identities beside the proposed membership. Do not
  -- infer an approved syllabus or learner publication from this binding.
  select coalesce(jsonb_agg(jsonb_build_object('conceptId',a.concept_id,
    'identityDigest',a.identity_digest) order by a.concept_id),'[]'::jsonb)
    into v_private_bindings
  from public.content_concept_current_identities a
  where exists(select 1 from jsonb_array_elements_text(v_doc->'conceptIds') requested(value)
               where requested.value=a.concept_id)
    and not exists(select 1 from jsonb_array_elements(v_catalog->'concepts') c
                   where c->>'conceptId'=a.concept_id);
  v_digest:=encode(extensions.digest(convert_to(jsonb_build_object('baselineId',v_id,'revision',v_revision,
   'previous',v_expected,'catalogVersion',v_catalog_version,'registryVersion',p_registry_version,
   'document',v_doc,'privateIdentityBindings',v_private_bindings)::text,'UTF8'),'sha256'),'hex');
  insert into public.content_syllabus_baseline_draft_versions(baseline_id,revision,pathway_version_id,catalog_version,
   registry_version,previous_digest,document,private_identity_bindings,digest,submitted_by,request_id,request_fingerprint)
  values(v_id,v_revision,v_doc->>'pathwayVersionId',v_catalog_version,p_registry_version,
   v_expected,v_doc,v_private_bindings,v_digest,p_actor,v_request,v_fingerprint) returning * into v_saved;
 end if;
 return jsonb_build_object('baselineId',v_saved.baseline_id,'revision',v_saved.revision,'digest',v_saved.digest,
  'catalogVersion',v_saved.catalog_version,'registryVersion',v_saved.registry_version,
  'privateIdentityBindings',v_saved.private_identity_bindings,'recordedAt',v_saved.recorded_at,
  'status','draft');
end; $$;

create or replace function public.syllabus_baseline_review_preflight_v1(
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
 -- The Admin-only private acceptance registry is intentionally separate from the
 -- learner-shared canonical catalog. Check frozen private bindings per exact draft.
 select coalesce(jsonb_agg(jsonb_build_object(
   'conceptId',m.concept_id,
   'label',case when v_canonical_labels ? m.concept_id
     then v_canonical_labels->>m.concept_id
     when a.concept_id is not null and pinned.identity_digest=a.identity_digest
     then a.accepted_document->>'label'
     else 'Identity unavailable' end,
   'kind',case when v_canonical_labels ? m.concept_id then 'canonical'
     when a.concept_id is not null then 'accepted-private' else 'missing' end,
   'identityDigest',case when a.concept_id is not null and not (v_canonical_labels ? m.concept_id)
     then a.identity_digest else null end,
   'bindingMatches',case when v_canonical_labels ? m.concept_id
     then pinned.identity_digest is null
     when a.concept_id is not null
     then pinned.identity_digest is not null and pinned.identity_digest=a.identity_digest
     else false end
   ) order by m.position),'[]'::jsonb) into v_members
 from jsonb_array_elements_text(v_draft.document->'conceptIds')
   with ordinality m(concept_id,position)
 left join public.content_concept_current_identities a
   on a.concept_id=m.concept_id
 left join lateral (
   select entry.value->>'identityDigest' as identity_digest
   from jsonb_array_elements(coalesce(v_draft.private_identity_bindings,'[]'::jsonb))
     as entry(value)
   where entry.value->>'conceptId'=m.concept_id
   limit 1
 ) pinned on true;
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
