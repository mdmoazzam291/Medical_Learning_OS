-- M11f4 hardening: all referenced objects are fully qualified, so SECURITY DEFINER
-- functions need no caller-influenced schema resolution surface.

alter function public.study_open_retention_probe_session_v1(uuid,uuid,uuid,text)
  set search_path='';

alter function public.study_record_retention_probe_rendered_v1(uuid,uuid,text,text)
  set search_path='';

alter function public.study_answer_retention_probe_v1(uuid,uuid,text,text)
  set search_path='';
