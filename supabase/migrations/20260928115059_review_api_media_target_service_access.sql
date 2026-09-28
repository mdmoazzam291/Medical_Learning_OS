revoke all on function public.content_media_review_target(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.content_media_review_target(text, text)
  to service_role;
