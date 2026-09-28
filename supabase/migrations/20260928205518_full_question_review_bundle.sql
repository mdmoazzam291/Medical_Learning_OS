create or replace function public.record_full_question_review_bundle(
  p_question_version_id text,
  p_reviewer uuid,
  p_medical_notes text,
  p_references_notes text,
  p_rights_notes text,
  p_attestation_version text,
  p_attested boolean
)
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_temp'
as $function$
declare
  v_question jsonb;
  v_receipt record;
  v_receipts jsonb := '[]'::jsonb;
  v_kind text;
  v_notes text;
begin
  if p_reviewer is null then
    raise exception using errcode='22023', message='full_review_identity_required';
  end if;
  if p_attestation_version <> 'full-question-review-attestation-v1' or p_attested is distinct from true then
    raise exception using errcode='22023', message='full_review_attestation_required';
  end if;
  if char_length(btrim(coalesce(p_medical_notes,''))) not between 1 and 4000
     or char_length(btrim(coalesce(p_references_notes,''))) not between 1 and 4000
     or char_length(btrim(coalesce(p_rights_notes,''))) not between 1 and 4000 then
    raise exception using errcode='22023', message='invalid_review_notes';
  end if;
  if not public.has_active_reviewer_grant(p_reviewer,'medical')
     or not public.has_active_reviewer_grant(p_reviewer,'references')
     or not public.has_active_reviewer_grant(p_reviewer,'rights') then
    raise exception using errcode='42501', message='reviewer_not_authorized';
  end if;

  select q into v_question
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'questions') q
  where c.id=1 and q->>'questionVersionId'=p_question_version_id
  limit 1;

  if v_question is null then
    raise exception using errcode='22023', message='unknown_question_version';
  end if;
  if v_question->>'status' <> 'in_review' then
    raise exception using errcode='22023', message='question_not_in_review';
  end if;
  if exists (
    select 1 from public.content_review_events e
    where e.question_version_id=p_question_version_id
  ) then
    raise exception using errcode='22023', message='full_review_requires_unreviewed_version';
  end if;

  for v_kind in select unnest(array['medical','references','rights']::text[]) loop
    v_notes := case v_kind
      when 'medical' then p_medical_notes
      when 'references' then p_references_notes
      else p_rights_notes
    end;
    select * into strict v_receipt
    from public.record_content_review(
      p_question_version_id,
      v_kind,
      p_reviewer,
      'approved',
      v_notes
    );
    v_receipts := v_receipts || jsonb_build_array(jsonb_build_object(
      'reviewId',v_receipt.review_id,
      'reviewKind',v_kind,
      'targetSha256',v_receipt.target_sha256,
      'reviewedAt',v_receipt.reviewed_at
    ));
  end loop;

  return jsonb_build_object(
    'contractId','full-question-review-bundle-receipt-v1',
    'questionVersionId',p_question_version_id,
    'decision','approved',
    'reviews',v_receipts,
    'reviewCount',3,
    'publicationAuthority',false
  );
end;
$function$;

revoke all on function public.record_full_question_review_bundle(
  text,uuid,text,text,text,text,boolean
) from public, anon, authenticated;
grant execute on function public.record_full_question_review_bundle(
  text,uuid,text,text,text,text,boolean
) to service_role;
