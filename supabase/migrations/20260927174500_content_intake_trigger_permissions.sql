-- Production follow-up for the content intake pipeline.
-- Trigger helpers enforce table invariants but are not application RPCs.
-- Triggers continue to invoke their functions internally; no browser/service role
-- needs direct EXECUTE authority on these helpers.

revoke all on function public.guard_content_intake_batch_mutation()
  from public, anon, authenticated, service_role;

revoke all on function public.prevent_content_intake_event_mutation()
  from public, anon, authenticated, service_role;
