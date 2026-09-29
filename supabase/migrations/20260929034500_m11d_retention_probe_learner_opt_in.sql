-- M11d: explicit learner opt-in/withdrawal path for the preregistered
-- retention-probe feasibility protocol. This creates consent evidence only.
-- It does not schedule probes or grant activation, Study Now or mastery authority.

create table if not exists public.study_retention_probe_consent_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  protocol_id text not null references public.study_retention_probe_protocols(protocol_id) on delete restrict,
  protocol_sha256 text not null check (protocol_sha256 ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('opt_in','withdraw')),
  attestation_version text not null check (attestation_version='retention-probe-learner-consent-v1'),
  recorded_at timestamptz not null default now()
);

create index if not exists study_retention_probe_consent_events_learner_protocol_idx
  on public.study_retention_probe_consent_events (learner_id, protocol_id, recorded_at desc, id desc);

alter table public.study_retention_probe_consent_events enable row level security;
revoke all on table public.study_retention_probe_consent_events
  from public, anon, authenticated, service_role;
grant select, insert on table public.study_retention_probe_consent_events
  to service_role;

drop trigger if exists study_retention_probe_consent_events_append_only
  on public.study_retention_probe_consent_events;
create trigger study_retention_probe_consent_events_append_only
before update or delete on public.study_retention_probe_consent_events
for each row execute function public.prevent_learner_evidence_mutation();

create or replace function public.study_retention_probe_learner_consent_v1(
  p_learner uuid
)
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
with protocol as (
  select
    p.protocol_id,
    p.protocol_version,
    p.protocol_sha256,
    p.preregistered_at,
    p.protocol_body
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1
),
latest as (
  select e.id, e.decision, e.recorded_at, e.protocol_sha256
  from public.study_retention_probe_consent_events e
  join protocol p
    on p.protocol_id=e.protocol_id
   and p.protocol_sha256=e.protocol_sha256
  where e.learner_id=p_learner
  order by e.recorded_at desc, e.id desc
  limit 1
)
select pg_catalog.jsonb_build_object(
  'contractId','retention-probe-learner-consent-v1',
  'protocol',pg_catalog.jsonb_build_object(
    'protocolId',p.protocol_id,
    'protocolVersion',p.protocol_version,
    'protocolSha256',p.protocol_sha256,
    'preregisteredAt',p.preregistered_at,
    'targetDays',p.protocol_body->'primaryHorizon'->'targetDays',
    'windowStartDays',p.protocol_body->'primaryHorizon'->'windowStartDays',
    'windowEndDays',p.protocol_body->'primaryHorizon'->'windowEndDays',
    'maxProbeAssignmentsPerLearnerPer7Days',
      p.protocol_body->'assignment'->'maxProbeAssignmentsPerLearnerPer7Days',
    'maxTotalAssignments',p.protocol_body->'assignment'->'maxTotalAssignments',
    'mayDisplaceDueOrMistakeRepairWork',
      p.protocol_body->'assignment'->'mayDisplaceDueOrMistakeRepairWork'
  ),
  'decision',coalesce((select l.decision from latest l),'not_decided'),
  'optedIn',coalesce((select l.decision='opt_in' from latest l),false),
  'lastDecisionAt',(select l.recorded_at from latest l),
  'consentEventId',(select l.id from latest l),
  'activationAuthority',false,
  'probeSchedulingEnabled',false,
  'masteryInferenceAuthority',false
)
from protocol p;
$function$;

revoke all on function public.study_retention_probe_learner_consent_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_learner_consent_v1(uuid)
  to service_role;

create or replace function public.record_retention_probe_learner_consent_v1(
  p_learner uuid,
  p_decision text,
  p_protocol_sha256 text,
  p_attestation_version text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_protocol public.study_retention_probe_protocols%rowtype;
  v_latest public.study_retention_probe_consent_events%rowtype;
  v_event public.study_retention_probe_consent_events%rowtype;
begin
  if p_decision not in ('opt_in','withdraw') then
    raise exception using errcode='22023', message='invalid_retention_probe_consent_decision';
  end if;

  if p_attestation_version <> 'retention-probe-learner-consent-v1' then
    raise exception using errcode='22023', message='invalid_retention_probe_consent_attestation';
  end if;

  select *
  into v_protocol
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1;

  if v_protocol.protocol_id is null then
    raise exception using errcode='55000', message='retention_probe_protocol_unavailable';
  end if;

  if p_protocol_sha256 <> v_protocol.protocol_sha256 then
    raise exception using errcode='55000', message='retention_probe_protocol_changed';
  end if;

  select e.*
  into v_latest
  from public.study_retention_probe_consent_events e
  where e.learner_id=p_learner
    and e.protocol_id=v_protocol.protocol_id
    and e.protocol_sha256=v_protocol.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  if v_latest.id is not null and v_latest.decision=p_decision then
    v_event := v_latest;
  else
    insert into public.study_retention_probe_consent_events (
      learner_id,
      protocol_id,
      protocol_sha256,
      decision,
      attestation_version
    )
    values (
      p_learner,
      v_protocol.protocol_id,
      v_protocol.protocol_sha256,
      p_decision,
      p_attestation_version
    )
    returning * into v_event;
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-learner-consent-receipt-v1',
    'consentEventId',v_event.id,
    'protocolId',v_protocol.protocol_id,
    'protocolVersion',v_protocol.protocol_version,
    'protocolSha256',v_protocol.protocol_sha256,
    'decision',v_event.decision,
    'optedIn',v_event.decision='opt_in',
    'recordedAt',v_event.recorded_at,
    'activationAuthority',false,
    'probeSchedulingEnabled',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.record_retention_probe_learner_consent_v1(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.record_retention_probe_learner_consent_v1(uuid,text,text,text)
  to service_role;

create or replace function public.study_retention_probe_activation_readiness_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_content jsonb;
  v_protocol jsonb;
  v_pairs jsonb;
  v_has_pair boolean;
  v_has_protocol boolean;
  v_has_validated_pair boolean;
begin
  v_content := public.study_retention_probe_readiness_v1();
  v_protocol := public.study_retention_probe_protocol_v1();
  v_pairs := public.study_transfer_pair_validation_readiness_v1();
  v_has_pair := coalesce((v_content->'readiness'->>'hasAnyPublishedAlternateItemPair')::boolean,false);
  v_has_protocol := v_protocol is not null;
  v_has_validated_pair := coalesce(
    (v_pairs->'readiness'->>'validatedRetentionProbePairMetadataAvailable')::boolean,
    false
  );

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-readiness-v1',
    'contentReadiness',v_content,
    'protocol',v_protocol,
    'pairValidationReadiness',v_pairs,
    'readiness',pg_catalog.jsonb_build_object(
      'hasPublishedAlternateItemPair',v_has_pair,
      'protocolPreregistered',v_has_protocol,
      'validatedPairMetadataAvailable',v_has_validated_pair,
      'learnerOptInPathAvailable',true,
      'canActivate',false,
      'blockingReasons',
        (case when not v_has_pair
          then '["no-published-alternate-item-pair"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_has_protocol
          then '["retention-probe-protocol-not-preregistered"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_has_validated_pair
          then '["validated-alternate-pair-metadata-not-yet-available"]'::jsonb
          else '[]'::jsonb end)
        ||
        '["separate-activation-authorization-required"]'::jsonb
    ),
    'activationAuthority',false,
    'probeSchedulingEnabled',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_activation_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_activation_readiness_v1()
  to service_role;
