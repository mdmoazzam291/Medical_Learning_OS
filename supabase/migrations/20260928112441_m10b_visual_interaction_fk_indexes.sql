create index if not exists study_visual_interaction_events_session_owner_idx
  on public.study_visual_interaction_events(session_id, learner_id);

create index if not exists study_visual_interaction_events_media_idx
  on public.study_visual_interaction_events(media_asset_version_id);
