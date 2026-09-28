-- Read-only, service/operator verification. Never creates learner evidence.
-- Draft definitions in git are not live publication state.
select jsonb_build_object(
  'readiness', public.study_retention_probe_readiness_v1(),
  'notes', (
    select jsonb_agg(jsonb_build_object(
      'noteVersionId', n.id,
      'conceptId', n.concept_id,
      'version', n.version,
      'status', n.status,
      'sourceIds', n.source_ids,
      'contentSha256', n.content_sha256
    ) order by n.concept_id, n.version)
    from public.neural_canonical_note_versions n
    where n.concept_id in (
      'emergency:anaphylaxis:first-line-treatment',
      'infectious:rabies:pep-wound-washing',
      'infectious:rabies:category-iii-rig'
    )
  ),
  'pilot', (
    select jsonb_build_object(
      'batchKey', batch_key, 'status', status,
      'manifestSha256', manifest_sha256,
      'questionCount', question_count,
      'catalogVersionAfter', catalog_version_after
    ) from public.content_intake_batches where batch_key = 'connected-learning-08'
  )
) as connected_learning_verification;
