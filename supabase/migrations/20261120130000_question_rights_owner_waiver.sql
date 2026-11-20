-- ADR-146: owner rights waiver for question publication (owner 2026-11-20 12:43 IST:
-- "There will be no rights for questions from now and in future; remove this bottleneck").
-- Adds the rights status 'owner_waived' (recorded as an immutable source_rights_events row like any other
-- decision; it is not a licence) and makes Review & publish record it automatically for question sources.
-- All four functions are patched in place from their live definitions; each edit must match exactly (else the migration fails).
-- Notes, media and AI-test reviews keep their existing rules.

alter table public.source_rights_events drop constraint source_rights_events_rights_status_check;
alter table public.source_rights_events add constraint source_rights_events_rights_status_check
  check (rights_status in ('owned', 'licensed', 'public_domain', 'citation_only', 'restricted', 'owner_waived'));

-- The three shared gate functions are patched in place from their live definitions: each must contain the accepted
-- list exactly once (else the migration fails), and only that list changes. Live layout differs from the 2026-09
-- migration files, so the bodies are not re-typed here.
do $patch$
declare
  v_fn text; v_def text; v_old text; v_new text;
begin
  foreach v_fn in array array[
    'public.resolve_source_rights(text,uuid,text,text)',
    'public.record_content_review(text,text,uuid,text,text)',
    'public.publish_verified_content(text)'
  ] loop
    v_def := pg_get_functiondef(v_fn::regprocedure);
    if v_fn like 'public.resolve_source_rights%' then
      v_old := $q$('owned', 'licensed', 'public_domain', 'citation_only', 'restricted')$q$;
      v_new := $q$('owned', 'licensed', 'public_domain', 'citation_only', 'restricted', 'owner_waived')$q$;
    else
      v_old := $q$('owned', 'licensed', 'public_domain', 'citation_only')$q$;
      v_new := $q$('owned', 'licensed', 'public_domain', 'citation_only', 'owner_waived')$q$;
    end if;
    if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then
      raise exception 'owner_waiver_patch_mismatch: %', v_fn;
    end if;
    execute replace(v_def, v_old, v_new);
  end loop;
end
$patch$;

-- Question publish path: accept owner_waived (three lists) and record the waiver automatically for question sources.
do $patch$
declare
  v_def text;
  v_old text := $q$('owned','licensed','public_domain','citation_only')$q$;
  v_new text := $q$('owned','licensed','public_domain','citation_only','owner_waived')$q$;
  v_anchor text := E' select body into v_body from public.study_catalog where id=1;\n if exists(select 1 from (\n';
  v_waiver text := E' -- ADR-146 (owner 2026-11-20): rights are not reviewed for questions. Any question source still without an accepted\n'
    || E' -- decision gets an explicit, audited owner_waived event. Note sources keep the existing rule.\n'
    || E' select body into v_body from public.study_catalog where id=1;\n'
    || E' for src in select distinct jsonb_array_elements_text(q->''sourceIds'') from jsonb_array_elements(v_m->''questions'') q loop\n'
    || E'   if not exists(select 1 from jsonb_array_elements(v_body->''sources'') s join public.source_rights_events e on e.source_id=s->>''sourceId''\n'
    || E'     where s->>''sourceId''=src and s->''rights''->>''status'' in (''owned'',''licensed'',''public_domain'',''citation_only'',''owner_waived'') and e.source_fingerprint_sha256=public.current_source_fingerprint_sha256(src)) then\n'
    || E'     perform public.resolve_source_rights(src,p_reviewer,''owner_waived'',''Owner decision 2026-11-20 (ADR-146): rights are not reviewed for questions. Not a licence or permission.'');\n'
    || E'   end if;\n'
    || E' end loop;\n';
begin
  v_def := pg_get_functiondef('public.content_library_review_publish_legacy_v1(text,uuid,text,jsonb,text,boolean)'::regprocedure);
  if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 3 then raise exception 'owner_waiver_patch_mismatch: publish lists'; end if;
  if (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor) <> 1 then raise exception 'owner_waiver_patch_mismatch: publish anchor'; end if;
  v_def := replace(replace(v_def, v_old, v_new), v_anchor, v_waiver || v_anchor);
  execute v_def;
end
$patch$;

revoke all on function public.content_library_review_publish_legacy_v1(text,uuid,text,jsonb,text,boolean) from public, anon, authenticated;
grant execute on function public.content_library_review_publish_legacy_v1(text,uuid,text,jsonb,text,boolean) to service_role;
