-- Metadata-only review evidence observation. Never approves or releases material.
create function public.owner_approved_collection_preflight_v1(p_actor uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 v_catalog public.study_catalog%rowtype; v_item record; v_kind text;
 v_hash text; v_gate text; v_gates jsonb; v_rows jsonb:='[]'; v_sources jsonb;
 v_rights boolean; v_source_count int; v_issues int; v_event record;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 select * into strict v_catalog from public.study_catalog where id=1;
 if jsonb_typeof(v_catalog.body->'questions') is distinct from 'array'
    or jsonb_typeof(v_catalog.body->'sources') is distinct from 'array'
    or jsonb_array_length(v_catalog.body->'questions')+(select count(*) from public.neural_canonical_note_versions)>2000
    or pg_column_size(v_catalog.body)>8000000 then raise exception 'approved_collection_unavailable'; end if;
 for v_item in
  select 'question'::text kind,q->>'questionId' canonical_id,q->>'questionVersionId' version_id,
   (q->>'version')::int version,q->>'status' status,q->'sourceIds' source_ids
  from jsonb_array_elements(v_catalog.body->'questions') q
  union all
  select 'note',n.concept_id,n.id::text,n.version,n.status,n.source_ids from public.neural_canonical_note_versions n
 loop
  if jsonb_typeof(v_item.source_ids) is distinct from 'array' then raise exception 'approved_collection_unavailable'; end if;
  v_source_count:=jsonb_array_length(v_item.source_ids);
  select coalesce(jsonb_agg(s),'[]') into v_sources from jsonb_array_elements(v_catalog.body->'sources') s
    where s->>'sourceId' in(select jsonb_array_elements_text(v_item.source_ids));
  v_rights:=v_source_count>0 and jsonb_array_length(v_sources)=v_source_count;
  if v_rights then
   select not exists(select 1 from jsonb_array_elements(v_sources) s
    left join public.source_rights_events e on e.source_id=s->>'sourceId'
    where coalesce(s->'rights'->>'status','unknown') not in ('owned','licensed','public_domain','citation_only')
     or e.source_id is null or e.source_fingerprint_sha256 is distinct from public.current_source_fingerprint_sha256(s->>'sourceId')) into v_rights;
  end if;
  v_gates:='{}';
  foreach v_kind in array array['medical','references','rights'] loop
   select e.decision,e.target_sha256 into v_event from public.content_review_events e
    where e.target_type=case when v_item.kind='question' then 'question_version' else 'neural_note_version' end
      and e.target_id=v_item.version_id and e.review_kind=v_kind;
   if not found then v_gate:='missing';
   elsif v_event.decision<>'approved' then v_gate:='rejected';
   else
    begin
     v_hash:=case when v_item.kind='question' then public.current_review_target_sha256(v_item.version_id,v_kind)
      else public.current_neural_note_review_target_sha256(v_item.version_id::uuid,v_kind) end;
     v_gate:=case when v_hash is null then 'unavailable' when v_event.target_sha256=v_hash then 'current' else 'stale' end;
    exception when others then v_gate:='unavailable'; end;
   end if;
   v_gates:=v_gates||jsonb_build_object(v_kind,v_gate);
  end loop;
  select count(*)::int into v_issues from public.learner_content_issue_reports r
   left join public.learner_content_issue_triage_events t on t.report_id=r.id
   where ((v_item.kind='question' and r.target_type='question_version' and r.target_id=v_item.version_id)
    or (v_item.kind='note' and r.target_type='canonical_note' and r.target_id=v_item.version_id))
    and (t.report_id is null or t.decision='correction_required');
  v_rows:=v_rows||jsonb_build_array(jsonb_build_object('kind',v_item.kind,'canonicalId',v_item.canonical_id,
   'versionId',v_item.version_id,'version',v_item.version,'status',v_item.status,
   'sourceCount',v_source_count,'rightsCurrent',v_rights,'openIssues',v_issues,'gates',v_gates));
 end loop;
 if pg_column_size(v_rows)>8000000 then raise exception 'approved_collection_unavailable'; end if;
 return jsonb_build_object('contractId','approved-collection-snapshot-v1','catalogVersion',v_catalog.version,
  'asOf',statement_timestamp(),'rows',v_rows);
end; $$;
revoke all on function public.owner_approved_collection_preflight_v1(uuid) from public,anon,authenticated;
grant execute on function public.owner_approved_collection_preflight_v1(uuid) to service_role;
