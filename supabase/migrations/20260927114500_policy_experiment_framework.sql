-- M05d/M11 foundation: inert, pre-registered scheduler experiment framework.
-- Nothing in this migration changes learner scheduling authority.

create table if not exists public.study_policy_experiment_specs (
  experiment_id text not null,
  version integer not null check (version > 0),
  title text not null,
  randomization_unit text not null check (randomization_unit = 'learner'),
  control_policy_id text not null,
  control_policy_version integer not null check (control_policy_version > 0),
  control_config_version text not null,
  treatment_policy_id text not null,
  treatment_policy_version integer not null check (treatment_policy_version > 0),
  treatment_config_version text not null,
  control_allocation_bps integer not null check (control_allocation_bps between 1 and 9999),
  eligibility_contract_id text not null,
  metric_contract jsonb not null check (jsonb_typeof(metric_contract) = 'object'),
  guardrails jsonb not null check (jsonb_typeof(guardrails) = 'object'),
  minimum_eligible_learners integer null check (minimum_eligible_learners > 0),
  assignment_salt text not null,
  spec_sha256 text not null check (spec_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (experiment_id, version),
  check (control_policy_id <> treatment_policy_id or control_config_version <> treatment_config_version)
);

create table if not exists public.study_policy_experiment_state_events (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity unique,
  experiment_id text not null,
  version integer not null,
  state text not null check (state in ('armed','running','paused','completed','cancelled')),
  expected_spec_sha256 text not null check (expected_spec_sha256 ~ '^[0-9a-f]{64}$'),
  reason text not null,
  created_at timestamptz not null default now(),
  constraint study_policy_experiment_state_spec_fkey
    foreign key (experiment_id, version)
    references public.study_policy_experiment_specs(experiment_id, version)
);

create index if not exists study_policy_experiment_state_time
  on public.study_policy_experiment_state_events (experiment_id, version, sequence);

create table if not exists public.study_policy_experiment_assignments (
  experiment_id text not null,
  version integer not null,
  learner_id uuid not null,
  arm text not null check (arm in ('control','treatment')),
  assignment_bucket integer not null check (assignment_bucket between 0 and 9999),
  assignment_hash text not null check (assignment_hash ~ '^[0-9a-f]{64}$'),
  assigned_at timestamptz not null default now(),
  primary key (experiment_id, version, learner_id),
  constraint study_policy_experiment_assignment_spec_fkey
    foreign key (experiment_id, version)
    references public.study_policy_experiment_specs(experiment_id, version)
);

create index if not exists study_policy_experiment_assignment_arm
  on public.study_policy_experiment_assignments (experiment_id, version, arm, assigned_at);

alter table public.study_policy_experiment_specs enable row level security;
alter table public.study_policy_experiment_state_events enable row level security;
alter table public.study_policy_experiment_assignments enable row level security;

revoke all on table public.study_policy_experiment_specs from public, anon, authenticated;
revoke all on table public.study_policy_experiment_state_events from public, anon, authenticated;
revoke all on table public.study_policy_experiment_assignments from public, anon, authenticated;

create or replace function public.study_policy_experiment_spec_hash(
  p_spec jsonb
)
returns text
language sql
immutable
security definer
set search_path = ''
as $function$
select encode(extensions.digest(p_spec::text, 'sha256'), 'hex');
$function$;

revoke all on function public.study_policy_experiment_spec_hash(jsonb)
  from public, anon, authenticated;
grant execute on function public.study_policy_experiment_spec_hash(jsonb)
  to service_role;

create or replace function public.study_register_policy_experiment(
  p_spec jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_hash text;
  v_experiment_id text := p_spec->>'experimentId';
  v_version integer;
  v_control_bps integer;
  v_minimum integer;
begin
  if p_spec is null or jsonb_typeof(p_spec) <> 'object' then
    raise exception using errcode='22023', message='experiment_spec_required';
  end if;

  begin
    v_version := (p_spec->>'version')::integer;
    v_control_bps := (p_spec->>'controlAllocationBps')::integer;
    v_minimum := nullif(p_spec->>'minimumEligibleLearners','')::integer;
  exception when others then
    raise exception using errcode='22023', message='experiment_spec_numeric_invalid';
  end;

  if v_experiment_id is null
     or v_experiment_id !~ '^[a-zA-Z0-9:_@.\-]{1,120}$'
     or v_version is null or v_version <= 0
     or coalesce(p_spec->>'title','') = ''
     or p_spec->>'randomizationUnit' <> 'learner'
     or coalesce(p_spec->>'controlPolicyId','') = ''
     or coalesce(p_spec->>'controlConfigVersion','') = ''
     or coalesce(p_spec->>'treatmentPolicyId','') = ''
     or coalesce(p_spec->>'treatmentConfigVersion','') = ''
     or v_control_bps not between 1 and 9999
     or coalesce(p_spec->>'eligibilityContractId','') = ''
     or jsonb_typeof(p_spec->'metricContract') <> 'object'
     or jsonb_typeof(p_spec->'guardrails') <> 'object'
     or coalesce(p_spec->>'assignmentSalt','') = '' then
    raise exception using errcode='22023', message='experiment_spec_invalid';
  end if;

  if v_minimum is not null and v_minimum <= 0 then
    raise exception using errcode='22023', message='experiment_minimum_invalid';
  end if;

  v_hash := public.study_policy_experiment_spec_hash(
    p_spec - 'specSha256' - 'createdAt'
  );

  insert into public.study_policy_experiment_specs (
    experiment_id,
    version,
    title,
    randomization_unit,
    control_policy_id,
    control_policy_version,
    control_config_version,
    treatment_policy_id,
    treatment_policy_version,
    treatment_config_version,
    control_allocation_bps,
    eligibility_contract_id,
    metric_contract,
    guardrails,
    minimum_eligible_learners,
    assignment_salt,
    spec_sha256
  ) values (
    v_experiment_id,
    v_version,
    p_spec->>'title',
    p_spec->>'randomizationUnit',
    p_spec->>'controlPolicyId',
    (p_spec->>'controlPolicyVersion')::integer,
    p_spec->>'controlConfigVersion',
    p_spec->>'treatmentPolicyId',
    (p_spec->>'treatmentPolicyVersion')::integer,
    p_spec->>'treatmentConfigVersion',
    v_control_bps,
    p_spec->>'eligibilityContractId',
    p_spec->'metricContract',
    p_spec->'guardrails',
    v_minimum,
    p_spec->>'assignmentSalt',
    v_hash
  );

  return jsonb_build_object(
    'experimentId', v_experiment_id,
    'version', v_version,
    'specSha256', v_hash,
    'minimumEligibleLearners', v_minimum,
    'armable', v_minimum is not null
  );
exception
  when unique_violation then
    raise exception using errcode='23505', message='experiment_spec_immutable';
end;
$function$;

revoke all on function public.study_register_policy_experiment(jsonb)
  from public, anon, authenticated;
grant execute on function public.study_register_policy_experiment(jsonb)
  to service_role;

create or replace function public.study_policy_experiment_current_state(
  p_experiment_id text,
  p_version integer
)
returns text
language sql
stable
security definer
set search_path = ''
as $function$
select coalesce(
  (
    select e.state
    from public.study_policy_experiment_state_events e
    where e.experiment_id = p_experiment_id
      and e.version = p_version
    order by e.sequence desc
    limit 1
  ),
  'draft'
);
$function$;

revoke all on function public.study_policy_experiment_current_state(text, integer)
  from public, anon, authenticated;
grant execute on function public.study_policy_experiment_current_state(text, integer)
  to service_role;

create or replace function public.study_policy_experiment_readiness(
  p_experiment_id text,
  p_version integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_spec public.study_policy_experiment_specs%rowtype;
  v_state text;
  v_eligible integer := 0;
begin
  select * into v_spec
  from public.study_policy_experiment_specs
  where experiment_id = p_experiment_id
    and version = p_version;

  if not found then
    raise exception using errcode='22023', message='experiment_spec_not_found';
  end if;

  if v_spec.eligibility_contract_id <> 'paired-scheduler-evidence-v1' then
    raise exception using errcode='22023', message='experiment_eligibility_contract_unsupported';
  end if;

  with paired as (
    select
      d.learner_id,
      d.attempt_id
    from public.study_schedule_decision_events d
    where (
      d.role = 'authoritative'
      and d.policy_id = v_spec.control_policy_id
      and d.policy_version = v_spec.control_policy_version
      and d.config_version = v_spec.control_config_version
    ) or (
      d.role = 'shadow'
      and d.policy_id = v_spec.treatment_policy_id
      and d.policy_version = v_spec.treatment_policy_version
      and d.config_version = v_spec.treatment_config_version
    )
    group by d.learner_id, d.attempt_id
    having count(*) filter (
      where d.role='authoritative'
        and d.policy_id=v_spec.control_policy_id
        and d.policy_version=v_spec.control_policy_version
        and d.config_version=v_spec.control_config_version
    ) > 0
    and count(*) filter (
      where d.role='shadow'
        and d.policy_id=v_spec.treatment_policy_id
        and d.policy_version=v_spec.treatment_policy_version
        and d.config_version=v_spec.treatment_config_version
    ) > 0
  )
  select count(distinct learner_id)::integer
    into v_eligible
  from paired;

  v_state := public.study_policy_experiment_current_state(p_experiment_id, p_version);

  return jsonb_build_object(
    'experimentId', p_experiment_id,
    'version', p_version,
    'state', v_state,
    'eligibilityContractId', v_spec.eligibility_contract_id,
    'eligibleLearners', v_eligible,
    'minimumEligibleLearners', v_spec.minimum_eligible_learners,
    'populationThresholdConfigured', v_spec.minimum_eligible_learners is not null,
    'populationThresholdMet', case
      when v_spec.minimum_eligible_learners is null then false
      else v_eligible >= v_spec.minimum_eligible_learners
    end,
    'canArm', v_state='draft'
      and v_spec.minimum_eligible_learners is not null
      and v_eligible >= v_spec.minimum_eligible_learners,
    'assignmentsEnabled', v_state='running',
    'specSha256', v_spec.spec_sha256
  );
end;
$function$;

revoke all on function public.study_policy_experiment_readiness(text, integer)
  from public, anon, authenticated;
grant execute on function public.study_policy_experiment_readiness(text, integer)
  to service_role;

create or replace function public.study_set_policy_experiment_state(
  p_experiment_id text,
  p_version integer,
  p_new_state text,
  p_expected_spec_sha256 text,
  p_confirmation text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_spec public.study_policy_experiment_specs%rowtype;
  v_current text;
  v_readiness jsonb;
begin
  select * into v_spec
  from public.study_policy_experiment_specs
  where experiment_id = p_experiment_id
    and version = p_version;

  if not found then
    raise exception using errcode='22023', message='experiment_spec_not_found';
  end if;
  if p_expected_spec_sha256 is distinct from v_spec.spec_sha256 then
    raise exception using errcode='22023', message='experiment_spec_hash_mismatch';
  end if;
  if coalesce(p_reason,'') = '' then
    raise exception using errcode='22023', message='experiment_state_reason_required';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_experiment_id || ':' || p_version::text, 0)
  );

  v_current := public.study_policy_experiment_current_state(p_experiment_id, p_version);

  if p_new_state='armed' then
    if v_current <> 'draft' or p_confirmation <> p_experiment_id || ':ARM' then
      raise exception using errcode='22023', message='experiment_arm_confirmation_required';
    end if;
    v_readiness := public.study_policy_experiment_readiness(p_experiment_id, p_version);
    if coalesce((v_readiness->>'canArm')::boolean, false) is not true then
      raise exception using errcode='22023', message='experiment_not_ready_to_arm';
    end if;
  elsif p_new_state='running' then
    if v_current <> 'armed' or p_confirmation <> p_experiment_id || ':RUN' then
      raise exception using errcode='22023', message='experiment_run_confirmation_required';
    end if;
  elsif p_new_state='paused' then
    if v_current <> 'running' then
      raise exception using errcode='22023', message='experiment_transition_invalid';
    end if;
  elsif p_new_state='completed' then
    if v_current not in ('running','paused') then
      raise exception using errcode='22023', message='experiment_transition_invalid';
    end if;
  elsif p_new_state='cancelled' then
    if v_current not in ('draft','armed','running','paused') then
      raise exception using errcode='22023', message='experiment_transition_invalid';
    end if;
  else
    raise exception using errcode='22023', message='experiment_state_invalid';
  end if;

  insert into public.study_policy_experiment_state_events (
    experiment_id, version, state, expected_spec_sha256, reason
  ) values (
    p_experiment_id, p_version, p_new_state, p_expected_spec_sha256, p_reason
  );

  return jsonb_build_object(
    'experimentId', p_experiment_id,
    'version', p_version,
    'previousState', v_current,
    'state', p_new_state,
    'specSha256', v_spec.spec_sha256
  );
end;
$function$;

revoke all on function public.study_set_policy_experiment_state(
  text, integer, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.study_set_policy_experiment_state(
  text, integer, text, text, text, text
) to service_role;

create or replace function public.study_assign_policy_experiment(
  p_experiment_id text,
  p_version integer,
  p_learner uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_spec public.study_policy_experiment_specs%rowtype;
  v_existing public.study_policy_experiment_assignments%rowtype;
  v_state text;
  v_hex text;
  v_bucket integer;
  v_arm text;
begin
  if p_learner is null then
    raise exception using errcode='22023', message='experiment_learner_required';
  end if;

  select * into v_spec
  from public.study_policy_experiment_specs
  where experiment_id = p_experiment_id
    and version = p_version;

  if not found then
    raise exception using errcode='22023', message='experiment_spec_not_found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_experiment_id || ':' || p_version::text || ':' || p_learner::text, 0)
  );

  select * into v_existing
  from public.study_policy_experiment_assignments
  where experiment_id=p_experiment_id
    and version=p_version
    and learner_id=p_learner;

  if found then
    return jsonb_build_object(
      'experimentId', v_existing.experiment_id,
      'version', v_existing.version,
      'learnerId', v_existing.learner_id,
      'arm', v_existing.arm,
      'assignmentBucket', v_existing.assignment_bucket,
      'assignmentHash', v_existing.assignment_hash,
      'assignedAt', v_existing.assigned_at
    );
  end if;

  v_state := public.study_policy_experiment_current_state(p_experiment_id, p_version);
  if v_state <> 'running' then
    raise exception using errcode='22023', message='experiment_not_running';
  end if;

  if not exists (
    select 1
    from public.study_schedule_decision_events a
    join public.study_schedule_decision_events s
      on s.learner_id=a.learner_id
     and s.attempt_id=a.attempt_id
    where a.learner_id=p_learner
      and a.role='authoritative'
      and a.policy_id=v_spec.control_policy_id
      and a.policy_version=v_spec.control_policy_version
      and a.config_version=v_spec.control_config_version
      and s.role='shadow'
      and s.policy_id=v_spec.treatment_policy_id
      and s.policy_version=v_spec.treatment_policy_version
      and s.config_version=v_spec.treatment_config_version
  ) then
    raise exception using errcode='22023', message='experiment_learner_not_eligible';
  end if;

  v_hex := encode(
    extensions.digest(
      p_experiment_id || ':' || p_version::text || ':' || p_learner::text || ':' || v_spec.assignment_salt,
      'sha256'
    ),
    'hex'
  );
  v_bucket := (('x' || substr(v_hex, 1, 8))::bit(32)::bigint % 10000)::integer;
  v_arm := case
    when v_bucket < v_spec.control_allocation_bps then 'control'
    else 'treatment'
  end;

  insert into public.study_policy_experiment_assignments (
    experiment_id, version, learner_id, arm, assignment_bucket, assignment_hash
  ) values (
    p_experiment_id, p_version, p_learner, v_arm, v_bucket, v_hex
  )
  returning * into v_existing;

  return jsonb_build_object(
    'experimentId', v_existing.experiment_id,
    'version', v_existing.version,
    'learnerId', v_existing.learner_id,
    'arm', v_existing.arm,
    'assignmentBucket', v_existing.assignment_bucket,
    'assignmentHash', v_existing.assignment_hash,
    'assignedAt', v_existing.assigned_at
  );
end;
$function$;

revoke all on function public.study_assign_policy_experiment(text, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.study_assign_policy_experiment(text, integer, uuid)
  to service_role;

-- Draft v1 is deliberately non-armable because minimumEligibleLearners is null.
-- A future evidence-based threshold requires registering a NEW immutable version.
select public.study_register_policy_experiment(
  jsonb_build_object(
    'experimentId','scheduler-bootstrap-vs-fsrs-v1',
    'version',1,
    'title','Bootstrap binary vs FSRS scheduler policy experiment',
    'randomizationUnit','learner',
    'controlPolicyId','bootstrap-binary-v1',
    'controlPolicyVersion',1,
    'controlConfigVersion','bootstrap-binary-v1@1',
    'treatmentPolicyId','fsrs-shadow',
    'treatmentPolicyVersion',1,
    'treatmentConfigVersion','fsrs-shadow-default-v1',
    'controlAllocationBps',5000,
    'eligibilityContractId','paired-scheduler-evidence-v1',
    'metricContract',jsonb_build_object(
      'contractId','scheduler-retention-efficiency-v1-draft',
      'status','draft',
      'primaryEndpoint','delayed-retrieval-correctness',
      'secondaryEndpoints',jsonb_build_array(
        'observed-answer-duration-ms',
        'retrieval-offset-ms',
        'review-burden-per-learner-time'
      ),
      'analysisPopulation','intention-to-treat',
      'causalClaimRequiresRunningRandomization',true
    ),
    'guardrails',jsonb_build_object(
      'autoStart',false,
      'schedulerAuthorityChange',false,
      'retrospectiveReassignment',false,
      'requireCompleteRatedHistory',true,
      'requireExplicitArmConfirmation',true,
      'requireExplicitRunConfirmation',true
    ),
    'minimumEligibleLearners',null,
    'assignmentSalt','scheduler-bootstrap-vs-fsrs-v1:seed:v1'
  )
);
