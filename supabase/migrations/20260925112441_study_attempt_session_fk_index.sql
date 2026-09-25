-- Cover the composite session/learner FK for session deletion and ownership joins.
create index study_attempts_session_owner_idx
  on public.study_attempts (session_id, learner_id);
