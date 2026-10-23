-- Fix JSONB operator grouping in the existing publication wrapper.
-- The legacy publisher still enforces actual Admin/reviewer/rights/attestation gates.
-- CREATE OR REPLACE retains the function identity; no content or review rows are written.
CREATE OR REPLACE FUNCTION public.content_library_review_publish_v1(p_import_id text, p_reviewer uuid, p_expected_digest text, p_rights_decisions jsonb, p_review_notes text, p_attested boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare r jsonb; m jsonb; x jsonb; q jsonb; old jsonb; v_id text; already boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 select manifest,status='published' into m,already from public.content_library_imports where import_id=p_import_id for update;
 r:=public.content_library_review_publish_legacy_v1(p_import_id,p_reviewer,p_expected_digest,p_rights_decisions,p_review_notes,p_attested);
 if already then return r; end if;
 for x in select value from jsonb_array_elements(m->'questions') loop
  if not (x ? 'intelligence') then continue; end if;
  v_id:=r->'questionMap'->>(x->>'questionId');
  select item into q from public.study_catalog c cross join lateral jsonb_array_elements(c.body->'questions') item where c.id=1 and item->>'questionId'=v_id and item->>'status'='published' order by (item->>'version')::integer desc limit 1;
  perform public.question_intelligence_validate_v1(q,x->'intelligence');
  select intelligence into old from public.content_library_question_metadata where question_id=v_id for update;
  if old is not null and ((old-'derivatives') is distinct from ((x->'intelligence')-'derivatives') or exists(select 1 from jsonb_array_elements(old->'derivatives') old_d where not exists(select 1 from jsonb_array_elements(x->'intelligence'->'derivatives') new_d where old_d=new_d))) then raise exception 'intelligence_version_conflict'; end if;
  update public.content_library_question_metadata set intelligence=x->'intelligence' where question_id=v_id;
 end loop;
 return r;
end; $function$;

revoke all on function public.content_library_review_publish_v1(text,uuid,text,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.content_library_review_publish_v1(text,uuid,text,jsonb,text,boolean) to service_role;
