-- Preserve existing service reads without automatic Data API grants.
-- Forward-only: historical applied migration bodies remain unchanged.
-- No browser grants, direct writes, RLS changes, defaults or content changes.

grant select on table public.consumer_billing_grants to service_role;
grant select on table public.consumer_billing_offers to service_role;
grant select on table public.consumer_billing_payments to service_role;
grant select on table public.consumer_billing_subscriptions to service_role;
grant select on table public.consumer_billing_webhook_inbox to service_role;
grant select on table public.neural_canonical_note_versions to service_role;
grant select on table public.neural_personal_annotations to service_role;
grant select on table public.study_attempts to service_role;
grant select on table public.study_bookmarks to service_role;
grant select on table public.study_catalog to service_role;
grant select on table public.study_memory_judgments to service_role;
grant select on table public.study_policy_experiment_assignments to service_role;
grant select on table public.study_policy_experiment_specs to service_role;
grant select on table public.study_policy_experiment_state_events to service_role;
grant select on table public.study_recommendation_events to service_role;
grant select on table public.study_revision_state to service_role;
grant select on table public.study_schedule_decision_events to service_role;
grant select on table public.study_sessions to service_role;
