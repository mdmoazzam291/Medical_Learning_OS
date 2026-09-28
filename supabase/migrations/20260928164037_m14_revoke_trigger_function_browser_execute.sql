revoke all on function public.block_content_review_measurement_mutation()
  from public, anon, authenticated, service_role;
grant execute on function public.block_content_review_measurement_mutation()
  to service_role;
