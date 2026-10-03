-- Keep the asynchronous pg_net caller alive longer than the longest provider probe.
-- The Render free-tier preview may need more than 9 seconds to cold-start, while
-- infrastructure-monitor now allows up to 30 seconds for that probe.
do $$
declare
  v_job_id bigint;
  v_command text;
begin
  select jobid, command
    into v_job_id, v_command
  from cron.job
  where jobname = 'mlos-owner-infrastructure-monitor-v1';

  if v_job_id is null then
    raise exception 'infrastructure_monitor_cron_missing';
  end if;

  if position('timeout_milliseconds:=45000' in v_command) > 0 then
    null;
  elsif position('timeout_milliseconds:=12000' in v_command) > 0 then
    perform cron.alter_job(
      job_id := v_job_id,
      command := replace(
        v_command,
        'timeout_milliseconds:=12000',
        'timeout_milliseconds:=45000'
      )
    );
  else
    raise exception 'infrastructure_monitor_cron_timeout_anchor_missing';
  end if;
end
$$;
