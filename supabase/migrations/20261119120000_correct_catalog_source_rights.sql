-- Correct over-permissive rights labels on catalogue sources (UX/data audit, 2026-11-19).
-- Three sources were labelled public_domain although their own evidence says rights are unknown or they are
-- copyrighted third-party works. Only the more cautious direction is applied; US federal works (NLM MeSH,
-- MedlinePlus, CDC, DailyMed) keep public_domain. Idempotent: rows already corrected are left as they are.
do $$
declare
  v_body jsonb;
  v_sources jsonb;
  v_changed int;
begin
  select body into strict v_body from public.study_catalog where id = 1 for update;
  select jsonb_agg(
           case
             when s->>'sourceId' = 'SRC-be6ce72162b7a18d92bf' and s->'rights'->>'status' = 'public_domain'
               then jsonb_set(jsonb_set(s, '{rights,status}', '"unknown"'), '{rights,evidence}',
                    to_jsonb((s->'rights'->>'evidence') || ' Relabelled unknown on 2026-11-19: commercial recall screenshots; rights not established.'))
             when s->>'sourceId' in ('REF-AHA-AORTA-2022', 'REF-GR-OTC-NBK154378') and s->'rights'->>'status' = 'public_domain'
               then jsonb_set(jsonb_set(s, '{rights,status}', '"citation_only"'), '{rights,evidence}',
                    to_jsonb((s->'rights'->>'evidence') || ' Relabelled citation_only on 2026-11-19: copyrighted third-party work; cite, do not reproduce.'))
             else s
           end order by ord)
    into v_sources
    from jsonb_array_elements(v_body->'sources') with ordinality as t(s, ord);
  select count(*) into v_changed
    from jsonb_array_elements(v_body->'sources') s
   where (s->>'sourceId' = 'SRC-be6ce72162b7a18d92bf' or s->>'sourceId' in ('REF-AHA-AORTA-2022', 'REF-GR-OTC-NBK154378'))
     and s->'rights'->>'status' = 'public_domain';
  if v_changed > 0 then
    update public.study_catalog
       set body = jsonb_set(v_body, '{sources}', coalesce(v_sources, '[]'::jsonb)), version = version + 1, updated_at = now()
     where id = 1;
  end if;
end $$;
