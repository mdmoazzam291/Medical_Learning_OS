-- Security follow-up: internal SECURITY DEFINER trigger helpers are not RPCs.
-- Triggers continue to execute these functions internally; browser/service roles
-- require no direct EXECUTE privilege.

revoke all on function public.content_review_fill_target_identity()
  from public, anon, authenticated, service_role;

revoke all on function public.prevent_question_exam_evidence_mutation()
  from public, anon, authenticated, service_role;

revoke all on function public.prevent_exam_ledger_mutation()
  from public, anon, authenticated, service_role;

revoke all on function public.prevent_exam_rule_set_mutation()
  from public, anon, authenticated, service_role;
