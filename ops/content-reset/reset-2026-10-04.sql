-- Owner authorized permanent shared-content + dependent-history reset, 2026-10-04.
-- Run once by a trusted database operator; no browser/API execution authority.
-- Do not replay during migration/deployment. No CASCADE and no disabled guards.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.study_catalog in access exclusive mode;
do $$ begin
 if (select count(*) from public.study_catalog)<>1 or
    (select encode(extensions.digest(body::text,'sha256'),'hex') from public.study_catalog)<>'0c93eecb6f5930b09f9a970dc9a440013717d7080e7d887060d0629d95898249'
 then raise exception 'catalog_changed_reinventory_required'; end if;
end $$;
truncate table
 public.content_ai_test_review_events, public.content_ai_test_source_rights,
 public.content_candidate_retirement_events, public.content_intake_batches, public.content_intake_events,
 public.content_library_concept_metadata, public.content_library_imports,
 public.content_library_note_question_links, public.content_library_question_metadata,
 public.content_media_annotations, public.content_media_assets, public.content_question_media_links,
 public.content_review_events, public.content_review_workflow_batch_measurements,
 public.content_review_workflow_measurements, public.content_visual_interaction_profiles,
 public.exam_occurrences, public.exam_run_events, public.exam_run_receipts, public.exam_runs,
 public.historical_exam_item_events, public.question_exam_evidence_events,
 public.learner_content_issue_reports, public.learner_content_issue_triage_events,
 public.neural_canonical_note_versions, public.neural_personal_annotations,
 public.study_answer_confidence_events, public.study_attempts, public.study_bookmarks,
 public.study_memory_judgments, public.study_policy_experiment_assignments,
 public.study_recommendation_events, public.study_recommendation_transport_events,
 public.study_retention_probe_activation_events, public.study_retention_probe_assignments,
 public.study_retention_probe_client_events, public.study_retention_probe_consent_events,
 public.study_retention_probe_protocols, public.study_retention_probe_response_bindings,
 public.study_retention_probe_served_events, public.study_revision_state,
 public.study_schedule_decision_events, public.study_sessions,
 public.study_transfer_pair_validations, public.study_visual_interaction_events;
update public.study_catalog set body=jsonb_build_object('schemaVersion',1,'concepts','[]'::jsonb,'sources','[]'::jsonb,'questions','[]'::jsonb), version=version+1, updated_at=now();
select jsonb_build_object('questions',(select jsonb_array_length(body->'questions') from public.study_catalog),'concepts',(select jsonb_array_length(body->'concepts') from public.study_catalog),'notes',(select count(*) from public.neural_canonical_note_versions),'attempts',(select count(*) from public.study_attempts),'accounts',(select count(*) from auth.users),'admin',(select count(*) from public.content_admin_account),'catalogVersion',(select version from public.study_catalog)) reset_result;
commit;
