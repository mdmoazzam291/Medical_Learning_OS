-- Fix tokenization used by the advisory content overlap preflight.
-- The prior whitespace regex was interpreted literally, producing one whole-stem token.

create or replace function public.content_intake_token_set(
  p_value text
)
returns text[]
language sql
immutable
strict
set search_path = ''
as $function$
  select coalesce(
    pg_catalog.array_agg(token order by token),
    array[]::text[]
  )
  from (
    select distinct token
    from pg_catalog.regexp_split_to_table(
      pg_catalog.lower(
        pg_catalog.regexp_replace(p_value, '[^a-zA-Z0-9]+', ' ', 'g')
      ),
      '[[:space:]]+'
    ) as token
    where pg_catalog.char_length(token) >= 3
      and token <> all (array[
        'the','and','for','with','which','what','when','where','who','why','how',
        'this','that','from','into','under','according','following','person',
        'patient','patients','adult','child','children','recommended'
      ]::text[])
  ) distinct_tokens
$function$;

revoke all on function public.content_intake_token_set(text)
  from public, anon, authenticated, service_role;
