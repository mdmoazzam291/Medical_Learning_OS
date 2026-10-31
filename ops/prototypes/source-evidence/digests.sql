-- Restricted metadata-domain canonicalization, not a general RFC8785 implementation.
-- Call strict schema validation first. Only ASCII strings and integers 0..1e9 supported.
create function evidence_probe.domain_canonical(v jsonb) returns text language plpgsql immutable set search_path='' as $$
declare kind text:=jsonb_typeof(v);s text;out text;k text;n numeric;
begin
 if v is null then raise exception 'evidence_invalid';end if;
 case kind
 when 'null' then return 'null';
 when 'boolean' then return v::text;
 when 'number' then
  n:=(v::text)::numeric;
  if n<>trunc(n) or n<0 or n>1000000000 then raise exception 'evidence_invalid';end if;
  return trunc(n)::text;
 when 'string' then
  s:=v#>>'{}';
  if octet_length(s)<>length(s) or s !~ '^[ -~]*$' then raise exception 'evidence_invalid';end if;
  return to_jsonb(s)::text;
 when 'array' then
  select string_agg(evidence_probe.domain_canonical(value),',' order by ord) into out from jsonb_array_elements(v) with ordinality x(value,ord);
  return '['||coalesce(out,'')||']';
 when 'object' then
  for k in select key from jsonb_object_keys(v) key loop
   if octet_length(k)<>length(k) or k !~ '^[ -~]*$' then raise exception 'evidence_invalid';end if;
  end loop;
  select string_agg(to_jsonb(key)::text||':'||evidence_probe.domain_canonical(value),',' order by key collate "C") into out from jsonb_each(v);
  return '{'||coalesce(out,'')||'}';
 else raise exception 'evidence_invalid';
 end case;
end;$$;
create function evidence_probe.domain_hash(v jsonb) returns text language sql immutable set search_path='' as $$select encode(sha256(convert_to(evidence_probe.domain_canonical(v),'UTF8')),'hex')$$;
create function evidence_probe.ordered_package(c jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_set(c,'{cases}',(select jsonb_agg(value order by (value->>'caseId') collate "C") from jsonb_array_elements(c->'cases')))
$$;
create function evidence_probe.derived_manifest(c jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare q jsonb;refs jsonb:='[]'::jsonb;appearance text;cd text;
begin
 for q in select value from jsonb_array_elements(c->'cases') order by (value->>'caseId') collate "C" loop
  appearance:=evidence_probe.domain_hash(jsonb_build_object('contractId','source-row-appearance-evidence-v1','sourceSha256',q->'sourceSha256','sourceEdition',q->'sourceEdition','appearance',q->'appearance'));
  cd:=evidence_probe.domain_hash(jsonb_build_object('contractId','source-row-case-evidence-v1','claim',q));
  refs:=refs||jsonb_build_array(jsonb_build_object('caseId',q->'caseId','caseVersion',q->'caseVersion','sourceSha256',q->'sourceSha256','caseDigest',cd,'appearanceEvidenceDigest',appearance));
 end loop;
 return jsonb_build_object('contractId','source-row-package-evidence-v1','integrityProfile',jsonb_build_object('profileVersion',1,'canonicalizationAlgorithm','JCS-RFC8785','digestAlgorithm','SHA-256'),'packageId',c->'packageId','packageVersion',c->'packageVersion','cases',refs);
end;$$;
create function evidence_probe.validate_digests(p_candidate text,p_manifest text,b jsonb,p_receipt_payload text,p_receipt text)
returns void language plpgsql immutable set search_path='' as $$
declare c jsonb:=p_candidate::jsonb;r jsonb:=p_receipt::jsonb;rp jsonb:=p_receipt_payload::jsonb;m jsonb;fingerprint text;
begin
 if evidence_probe.domain_canonical(c) is distinct from p_candidate or evidence_probe.domain_canonical(rp) is distinct from p_receipt_payload or evidence_probe.domain_canonical(r) is distinct from p_receipt then raise exception 'evidence_invalid';end if;
 m:=evidence_probe.derived_manifest(c);
 if evidence_probe.domain_canonical(m) is distinct from p_manifest or evidence_probe.domain_hash(m) is distinct from b->>'packageDigest' then raise exception 'evidence_invalid';end if;
 fingerprint:=evidence_probe.domain_hash(jsonb_build_object('contractId','source-evidence-stage-request-v1','actorId',b->'actorId','requestId',b->'requestId','packageId',b->'packageId','packageVersion',b->'packageVersion','expectedPackageDigest',b->'packageDigest','claimsDigest',evidence_probe.domain_hash(evidence_probe.ordered_package(c)->'cases')));
 if fingerprint is distinct from b->>'requestFingerprint' or r-'receiptDigest' is distinct from rp or evidence_probe.domain_hash(rp) is distinct from r->>'receiptDigest' then raise exception 'evidence_invalid';end if;
end;$$;
revoke all on all functions in schema evidence_probe from public,anon,authenticated;
grant execute on function evidence_probe.domain_canonical(jsonb),evidence_probe.domain_hash(jsonb),evidence_probe.ordered_package(jsonb),evidence_probe.derived_manifest(jsonb),evidence_probe.validate_digests(text,text,jsonb,text,text) to service_role;
