create index if not exists study_transfer_pair_validations_validator
  on public.study_transfer_pair_validations (validator_id, validated_at desc);
