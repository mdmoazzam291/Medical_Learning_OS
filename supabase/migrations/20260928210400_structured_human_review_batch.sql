create or replace function public.record_structured_review_batch(
  p_target_type text,
  p_target_ids text[],
  p_review_kind text,
  p_reviewer uuid,
  p_decision text,
  p_reason_code text,
  p_attestation_version text,
  p_attested boolean
)
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_temp'
as $function$
declare
  v_target_id text;
  v_count integer;
  v_receipt record;
  v_receipts jsonb := '[]'::jsonb;
  v_note text;
begin
  if p_target_type not in ('question_version','neural_note_version') then
    raise exception using errcode='22023', message='structured_review_target_type_invalid';
  end if;
  if p_review_kind not in ('medical','references','rights') then
    raise exception using errcode='22023', message='invalid_review_kind';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception using errcode='22023', message='invalid_review_decision';
  end if;
  if p_reviewer is null then
    raise exception using errcode='22023', message='structured_review_identity_required';
  end if;
  if p_attestation_version <> 'structured-human-review-v1' or p_attested is distinct from true then
    raise exception using errcode='22023', message='structured_review_attestation_required';
  end if;
  if p_reason_code not in (
    'human_reviewed_no_issue',
    'needs_medical_correction',
    'reference_support_insufficient',
    'rights_or_provenance_problem',
    'duplicate_or_scope_problem',
    'other_review_problem'
  ) then
    raise exception using errcode='22023', message='structured_review_reason_invalid';
  end if;
  if p_decision='approved' and p_reason_code <> 'human_reviewed_no_issue' then
    raise exception using errcode='22023', message='structured_review_reason_decision_mismatch';
  end if;
  if p_decision='rejected' and p_reason_code='human_reviewed_no_issue' then
    raise exception using errcode='22023', message='structured_review_reason_decision_mismatch';
  end if;
  if not public.has_active_reviewer_grant(p_reviewer,p_review_kind) then
    raise exception using errcode='42501', message='reviewer_not_authorized';
  end if;

  v_count := coalesce(cardinality(p_target_ids),0);
  if v_count < 1 or v_count > 500 then
    raise exception using errcode='22023', message='structured_review_batch_size_invalid';
  end if;
  if (select count(distinct x) from unnest(p_target_ids) x) <> v_count then
    raise exception using errcode='22023', message='structured_review_duplicate_target';
  end if;

  v_note := case
    when p_decision='approved'
      then 'Structured human review: reviewer inspected the exact target for the selected gate and found no blocking issue. No free-text note was required. Reason code: ' || p_reason_code || '.'
    else 'Structured human review: reviewer rejected the exact target for the selected gate. No free-text note was required. Reason code: ' || p_reason_code || '.'
  end;

  foreach v_target_id in array p_target_ids loop
    if v_target_id is null or v_target_id !~ '^[a-zA-Z0-9:_@.\-]{1,180}$' then
      raise exception using errcode='22023', message='structured_review_target_invalid';
    end if;

    if p_target_type='question_version' then
      select * into strict v_receipt
      from public.record_content_review(
        v_target_id,p_review_kind,p_reviewer,p_decision,v_note
      );
      v_receipts := v_receipts || jsonb_build_array(jsonb_build_object(
        'targetType','question_version',
        'targetId',v_target_id,
        'reviewId',v_receipt.review_id,
        'reviewKind',p_review_kind,
        'decision',p_decision,
        'reasonCode',p_reason_code,
        'targetSha256',v_receipt.target_sha256,
        'reviewedAt',v_receipt.reviewed_at
      ));
    else
      select * into strict v_receipt
      from public.record_neural_note_review(
        v_target_id::uuid,p_review_kind,p_reviewer,p_decision,v_note
      );
      v_receipts := v_receipts || jsonb_build_array(jsonb_build_object(
        'targetType','neural_note_version',
        'targetId',v_target_id,
        'reviewId',v_receipt.review_id,
        'reviewKind',p_review_kind,
        'decision',p_decision,
        'reasonCode',p_reason_code,
        'targetSha256',v_receipt.target_sha256,
        'reviewedAt',v_receipt.reviewed_at,
        'targetStatus',v_receipt.note_status
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'contractId','structured-review-batch-receipt-v1',
    'targetType',p_target_type,
    'reviewKind',p_review_kind,
    'decision',p_decision,
    'reasonCode',p_reason_code,
    'decisionCount',v_count,
    'reviews',v_receipts,
    'publicationAuthority',false
  );
end;
$function$;

revoke all on function public.record_structured_review_batch(
  text,text[],text,uuid,text,text,text,boolean
) from public, anon, authenticated;
grant execute on function public.record_structured_review_batch(
  text,text[],text,uuid,text,text,text,boolean
) to service_role;
