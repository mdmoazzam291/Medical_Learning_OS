-- M11f4 performance hardening: cover the assignment FK used by retention client evidence.
-- The existing unique served-event index and session/event index already cover the other
-- high-value parent lookups for this table.

create index if not exists study_retention_probe_client_events_assignment_idx
  on public.study_retention_probe_client_events (assignment_id);
