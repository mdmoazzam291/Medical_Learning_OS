-- Column-only isolated test schema, inspected 2026-10-04. No clinical or learner data.
create table if not exists public."content_admin_account" (
"singleton" bool,
"admin_user_id" uuid,
"assigned_at" timestamptz,
"bootstrap_source" text
);
create table if not exists public."content_ai_test_review_events" (
"id" uuid,
"question_version_id" text,
"review_kind" text,
"decision" text,
"reviewer_principal" text,
"policy_id" text,
"model_label" text,
"notes" text,
"target_sha256" text,
"reviewed_at" timestamptz
);
create table if not exists public."content_ai_test_source_rights" (
"id" uuid,
"source_id" text,
"decision" text,
"recommended_use" text,
"reviewer_principal" text,
"policy_id" text,
"model_label" text,
"notes" text,
"source_fingerprint_sha256" text,
"reviewed_at" timestamptz
);
create table if not exists public."content_candidate_retirement_events" (
"question_version_id" text,
"prior_sha256" text,
"retired_sha256" text,
"reason" text,
"catalog_version_before" int8,
"catalog_version_after" int8,
"recorded_at" timestamptz
);
create table if not exists public."content_intake_batches" (
"id" uuid,
"batch_key" text,
"label" text,
"manifest" jsonb,
"manifest_sha256" text,
"concept_count" int4,
"source_count" int4,
"question_count" int4,
"status" text,
"catalog_version_before" int8,
"catalog_version_after" int8,
"created_at" timestamptz,
"promoted_at" timestamptz,
"abandoned_at" timestamptz,
"abandon_reason" text
);
create table if not exists public."content_intake_events" (
"id" uuid,
"batch_id" uuid,
"event_type" text,
"event" jsonb,
"recorded_at" timestamptz
);
create table if not exists public."content_library_concept_metadata" (
"concept_id" text,
"classification" jsonb
);
create table if not exists public."content_library_note_question_links" (
"note_version_id" uuid,
"question_id" text,
"relation" text,
"section" text
);
create table if not exists public."content_media_annotations" (
"annotation_version_id" text,
"annotation_id" text,
"version" int4,
"supersedes" text,
"media_asset_version_id" text,
"kind" text,
"geometry" jsonb,
"label" text,
"concept_id" text,
"author_id" text,
"review" jsonb,
"created_at" timestamptz
);
create table if not exists public."content_media_assets" (
"media_asset_version_id" text,
"media_asset_id" text,
"version" int4,
"supersedes" text,
"modality" text,
"mime_type" text,
"content_sha256" text,
"width" int4,
"height" int4,
"delivery_ref" text,
"source" jsonb,
"diagnosis_evidence" text,
"review" jsonb,
"created_at" timestamptz
);
create table if not exists public."content_question_media_links" (
"question_version_id" text,
"media_asset_version_id" text,
"role" text,
"display_order" int4,
"blind_first_look" bool,
"annotation_version_ids" text[],
"created_at" timestamptz
);
create table if not exists public."content_review_events" (
"id" uuid,
"question_version_id" text,
"review_kind" text,
"reviewer_id" uuid,
"decision" text,
"notes" text,
"target_sha256" text,
"reviewed_at" timestamptz,
"target_type" text,
"target_id" text
);
create table if not exists public."content_review_workflow_batch_measurements" (
"id" uuid,
"reviewer_id" uuid,
"review_kind" text,
"experiment_id" text,
"workflow_mode" text,
"source_id" text,
"client_session_id" uuid,
"review_ids" uuid[],
"question_version_ids" text[],
"decisions" text[],
"foreground_active_ms" int8,
"elapsed_wall_ms" int8,
"queue_size" int4,
"attestation_version" text,
"recorded_at" timestamptz,
"contract_id" text
);
create table if not exists public."content_review_workflow_measurements" (
"id" uuid,
"review_id" uuid,
"reviewer_id" uuid,
"question_version_id" text,
"review_kind" text,
"review_target_sha256" text,
"workflow_mode" text,
"experiment_id" text,
"client_session_id" uuid,
"foreground_active_ms" int8,
"elapsed_wall_ms" int8,
"queue_size" int4,
"source_ids" text[],
"recorded_at" timestamptz,
"contract_id" text
);
create table if not exists public."content_reviewer_grant_events" (
"id" uuid,
"reviewer_id" uuid,
"review_kind" text,
"action" text,
"actor_id" uuid,
"reason" text,
"expires_at" timestamptz,
"recorded_at" timestamptz
);
create table if not exists public."content_reviewer_grants" (
"reviewer_id" uuid,
"review_kind" text,
"granted_at" timestamptz,
"granted_by" uuid,
"reason" text,
"expires_at" timestamptz
);
create table if not exists public."content_visual_interaction_profiles" (
"question_version_id" text,
"media_asset_version_id" text,
"schema_version" int4,
"task_type" text,
"created_at" timestamptz
);
create table if not exists public."exam_occurrences" (
"exam_occurrence_id" text,
"exam_id" text,
"session" text,
"label" text,
"authority" text,
"official_source_url" text,
"verification_status" text,
"verification_note" text,
"created_at" timestamptz
);
create table if not exists public."exam_rule_sets" (
"rule_set_id" text,
"exam_id" text,
"version" int4,
"verification_status" text,
"total_questions" int4,
"total_duration_seconds" int4,
"rule_set" jsonb,
"rule_set_sha256" text,
"source_repo_path" text,
"recorded_at" timestamptz
);
create table if not exists public."exam_run_events" (
"id" uuid,
"run_id" uuid,
"learner_id" uuid,
"request_key" text,
"revision_after" int4,
"event_type" text,
"event" jsonb,
"transition_sha256" text,
"occurred_at" timestamptz,
"recorded_at" timestamptz
);
create table if not exists public."exam_run_receipts" (
"run_id" uuid,
"learner_id" uuid,
"rule_set_id" text,
"receipt" jsonb,
"completed_at" timestamptz,
"recorded_at" timestamptz
);
create table if not exists public."exam_runs" (
"id" uuid,
"learner_id" uuid,
"exam_id" text,
"rule_set_id" text,
"engine_id" text,
"status" text,
"state_revision" int4,
"state" jsonb,
"started_at" timestamptz,
"scheduled_end_at" timestamptz,
"completed_at" timestamptz,
"created_at" timestamptz,
"updated_at" timestamptz
);
create table if not exists public."historical_exam_item_events" (
"id" uuid,
"historical_item_id" text,
"exam_occurrence_id" text,
"action" text,
"target_event_id" uuid,
"reconstruction_summary" text,
"concept_ids" text[],
"evidence_basis" text,
"source_lineage_status" text,
"recall_sources" jsonb,
"evidence_note" text,
"recorded_by" text,
"recorded_at" timestamptz
);
create table if not exists public."learner_content_issue_reports" (
"id" uuid,
"learner_id" uuid,
"concept_id" text,
"target_type" text,
"target_id" text,
"target_sha256" text,
"report_kind" text,
"details" text,
"suggested_correction" text,
"created_at" timestamptz,
"contract_id" text
);
create table if not exists public."learner_content_issue_triage_events" (
"triage_event_id" uuid,
"report_id" uuid,
"reviewer_id" uuid,
"review_kind" text,
"decision" text,
"reason_code" text,
"target_type" text,
"target_id" text,
"target_sha256" text,
"triaged_at" timestamptz,
"contract_id" text
);
create table if not exists public."learner_privacy_erasure_receipts" (
"erasure_id" uuid,
"contract_id" text,
"scope_version" int4,
"reason_class" text,
"rows_deleted" int4,
"completed_at" timestamptz
);
create table if not exists public."neural_canonical_note_versions" (
"id" uuid,
"concept_id" text,
"version" int4,
"supersedes_id" uuid,
"title" text,
"body_markdown" text,
"source_ids" jsonb,
"status" text,
"content_sha256" text,
"created_at" timestamptz,
"published_at" timestamptz,
"author_id" uuid,
"provenance" jsonb
);
create table if not exists public."neural_personal_annotations" (
"id" uuid,
"learner_id" uuid,
"concept_id" text,
"body_markdown" text,
"anchor_note_version_id" uuid,
"revision" int4,
"created_at" timestamptz,
"updated_at" timestamptz,
"annotation_kind" text,
"correction_target_type" text,
"correction_target_id" text,
"correction_target_sha256" text
);
create table if not exists public."owner_admin_audit_events" (
"id" uuid,
"request_id" uuid,
"admin_user_id" uuid,
"learner_id" uuid,
"action" text,
"reason" text,
"before_state" jsonb,
"after_state" jsonb,
"created_at" timestamptz
);
create table if not exists public."owner_feature_flag_audit_events" (
"id" uuid,
"request_id" uuid,
"admin_user_id" uuid,
"feature_key" text,
"before_audience" text,
"after_audience" text,
"reason" text,
"created_at" timestamptz
);
create table if not exists public."owner_feature_flags" (
"feature_key" text,
"audience" text,
"description" text,
"mapped_surface" text,
"updated_at" timestamptz,
"updated_by" uuid
);
create table if not exists public."owner_infrastructure_alerts" (
"id" uuid,
"provider" text,
"state" text,
"severity" text,
"status" text,
"evidence" jsonb,
"first_seen_at" timestamptz,
"last_seen_at" timestamptz,
"resolved_at" timestamptz
);
create table if not exists public."owner_infrastructure_notification_delivery_events" (
"id" uuid,
"idempotency_key" text,
"outcome" text,
"provider_message_id" text,
"error_code" text,
"recorded_at" timestamptz
);
create table if not exists public."owner_infrastructure_notification_intents" (
"idempotency_key" text,
"alert_id" uuid,
"provider" text,
"notification_kind" text,
"severity" text,
"provider_status" text,
"payload" jsonb,
"delivery_state" text,
"attempt_count" int4,
"created_at" timestamptz,
"last_attempt_at" timestamptz,
"sent_at" timestamptz
);
create table if not exists public."owner_infrastructure_provider_state" (
"provider" text,
"last_status" text,
"consecutive_unhealthy" int4,
"consecutive_healthy" int4,
"current_alert_id" uuid,
"last_notification_at" timestamptz,
"last_notification_severity" text,
"last_notification_kind" text,
"updated_at" timestamptz
);
create table if not exists public."owner_infrastructure_snapshots" (
"provider" text,
"observed_at" timestamptz,
"status" text,
"source" text,
"metrics" jsonb,
"refreshed_at" timestamptz
);
create table if not exists public."owner_learner_access_state" (
"learner_id" uuid,
"beta_access_until" timestamptz,
"updated_at" timestamptz,
"updated_by" uuid
);
create table if not exists public."question_exam_evidence_events" (
"id" uuid,
"question_version_id" text,
"exam_occurrence_id" text,
"action" text,
"target_event_id" uuid,
"claim_scope" text,
"provenance_kind" text,
"evidence_basis" text,
"source_ref" text,
"evidence_note" text,
"recorded_by" text,
"recorded_at" timestamptz
);
create table if not exists public."source_rights_events" (
"id" uuid,
"source_id" text,
"reviewer_id" uuid,
"rights_status" text,
"evidence" text,
"source_fingerprint_sha256" text,
"reviewed_at" timestamptz
);
create table if not exists public."study_answer_confidence_events" (
"id" uuid,
"learner_id" uuid,
"attempt_id" uuid,
"question_version_id" text,
"confidence" text,
"scale_id" text,
"prompt_id" text,
"recorded_at" timestamptz
);
create table if not exists public."study_bookmarks" (
"learner_id" uuid,
"question_version_id" text,
"created_at" timestamptz
);
create table if not exists public."study_memory_judgments" (
"id" uuid,
"learner_id" uuid,
"attempt_id" uuid,
"question_version_id" text,
"rating" int2,
"scale_id" text,
"prompt_id" text,
"recorded_at" timestamptz
);
create table if not exists public."study_policy_experiment_assignments" (
"experiment_id" text,
"version" int4,
"learner_id" uuid,
"arm" text,
"assignment_bucket" int4,
"assignment_hash" text,
"assigned_at" timestamptz
);
create table if not exists public."study_policy_experiment_specs" (
"experiment_id" text,
"version" int4,
"title" text,
"randomization_unit" text,
"control_policy_id" text,
"control_policy_version" int4,
"control_config_version" text,
"treatment_policy_id" text,
"treatment_policy_version" int4,
"treatment_config_version" text,
"control_allocation_bps" int4,
"eligibility_contract_id" text,
"metric_contract" jsonb,
"guardrails" jsonb,
"minimum_eligible_learners" int4,
"assignment_salt" text,
"spec_sha256" text,
"created_at" timestamptz
);
create table if not exists public."study_policy_experiment_state_events" (
"id" uuid,
"sequence" int8,
"experiment_id" text,
"version" int4,
"state" text,
"expected_spec_sha256" text,
"reason" text,
"created_at" timestamptz
);
create table if not exists public."study_recommendation_events" (
"id" uuid,
"learner_id" uuid,
"session_id" uuid,
"strategy" text,
"available_minutes" int4,
"plan" jsonb,
"created_at" timestamptz
);
create table if not exists public."study_recommendation_transport_events" (
"id" uuid,
"learner_id" uuid,
"recommendation_id" uuid,
"session_id" uuid,
"attempt_id" uuid,
"event_kind" text,
"transport_kind" text,
"recorded_at" timestamptz
);
create table if not exists public."study_retention_probe_activation_events" (
"id" uuid,
"protocol_id" text,
"protocol_sha256" text,
"pair_validation_id" uuid,
"pair_validation_sha256" text,
"decision" text,
"authorizer_id" uuid,
"max_total_assignments" int4,
"max_assignments_per_learner_per_7_days" int4,
"authorization_valid_until" timestamptz,
"rationale" text,
"attestation_version" text,
"event_sha256" text,
"recorded_at" timestamptz
);
create table if not exists public."study_retention_probe_assignments" (
"assignment_id" uuid,
"learner_id" uuid,
"protocol_id" text,
"protocol_sha256" text,
"activation_event_id" uuid,
"pair_validation_id" uuid,
"pair_validation_sha256" text,
"concept_id" text,
"origin_attempt_id" uuid,
"origin_question_version_id" text,
"target_question_version_id" text,
"origin_attempted_at" timestamptz,
"window_open_at" timestamptz,
"window_close_at" timestamptz,
"scheduled_at" timestamptz,
"assignment_sha256" text
);
create table if not exists public."study_retention_probe_client_events" (
"client_event_id" uuid,
"learner_id" uuid,
"served_event_id" uuid,
"assignment_id" uuid,
"session_id" uuid,
"event_type" text,
"learner_question_sha256" text,
"request_key" text,
"occurred_at" timestamptz,
"event_sha256" text,
"recorded_at" timestamptz
);
create table if not exists public."study_retention_probe_consent_events" (
"id" uuid,
"learner_id" uuid,
"protocol_id" text,
"protocol_sha256" text,
"decision" text,
"attestation_version" text,
"recorded_at" timestamptz
);
create table if not exists public."study_retention_probe_protocols" (
"protocol_id" text,
"protocol_version" int4,
"status" text,
"protocol_body" jsonb,
"protocol_sha256" text,
"preregistered_at" timestamptz
);
create table if not exists public."study_retention_probe_response_bindings" (
"binding_id" uuid,
"learner_id" uuid,
"served_event_id" uuid,
"assignment_id" uuid,
"attempt_id" uuid,
"target_question_version_id" text,
"responded_at" timestamptz,
"correct" bool,
"response_duration_ms" int8,
"clean_for_primary_analysis" bool,
"contamination_reasons" jsonb,
"binding_sha256" text,
"bound_at" timestamptz
);
create table if not exists public."study_retention_probe_served_events" (
"served_event_id" uuid,
"learner_id" uuid,
"assignment_id" uuid,
"protocol_id" text,
"protocol_sha256" text,
"activation_event_id" uuid,
"pair_validation_id" uuid,
"target_question_version_id" text,
"target_medical_sha256" text,
"catalog_version" int8,
"learner_question" jsonb,
"learner_question_sha256" text,
"request_key" text,
"served_at" timestamptz,
"served_sha256" text,
"recorded_at" timestamptz
);
create table if not exists public."study_schedule_decision_events" (
"id" uuid,
"learner_id" uuid,
"attempt_id" uuid,
"question_version_id" text,
"policy_id" text,
"policy_version" int4,
"role" text,
"config_version" text,
"evidence_cutoff_at" timestamptz,
"proposed_due_at" timestamptz,
"decision" jsonb,
"created_at" timestamptz
);
create table if not exists public."study_transfer_pair_validations" (
"id" uuid,
"contract_version" int4,
"primary_concept_id" text,
"question_a_id" text,
"question_a_version_id" text,
"question_a_medical_sha256" text,
"question_b_id" text,
"question_b_version_id" text,
"question_b_medical_sha256" text,
"decision" text,
"surface_novelty" text,
"construct_alignment" text,
"reasoning_alignment" text,
"difficulty_comparability" text,
"cue_overlap_risk" text,
"transfer_evidence_valid" bool,
"retention_probe_comparable" bool,
"validator_id" uuid,
"notes" text,
"validation_sha256" text,
"validated_at" timestamptz
);
create table if not exists public."study_visual_interaction_events" (
"id" uuid,
"learner_id" uuid,
"session_id" uuid,
"interaction_attempt_id" text,
"question_version_id" text,
"concept_id" text,
"media_asset_version_id" text,
"task_type" text,
"occurred_at" timestamptz,
"event" jsonb,
"recorded_at" timestamptz
);

