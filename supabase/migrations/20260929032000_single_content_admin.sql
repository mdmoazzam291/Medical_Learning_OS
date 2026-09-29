-- Beta governance: one authenticated content admin owns human review authority.
-- Existing learner identities remain learners; reviewer grants only authorize the singleton admin.

create table if not exists public.content_admin_account (
  singleton boolean primary key default true check (singleton),
  admin_user_id uuid not null unique references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  bootstrap_source text not null check (char_length(btrim(bootstrap_source)) between 1 and 500)
);

alter table public.content_admin_account enable row level security;
revoke all on table public.content_admin_account from public, anon, authenticated, service_role;
grant select on table public.content_admin_account to service_role;

with candidates as (
  select reviewer_id
  from public.content_reviewer_grants
  where expires_at is null or expires_at > now()
    and review_kind in ('medical','references','rights')
  group by reviewer_id
  having count(distinct review_kind) = 3
),
singleton_candidate as (
  select reviewer_id
  from candidates
  where (select count(*) from candidates) = 1
  limit 1
)
insert into public.content_admin_account (
  singleton,
  admin_user_id,
  bootstrap_source
)
select
  true,
  reviewer_id,
  'Bootstrapped from the single existing reviewer account holding all three active Medical, References and Rights grants.'
from singleton_candidate
where reviewer_id is not null
on conflict (singleton) do nothing;

create or replace function public.is_content_admin(p_user uuid)
returns boolean
language sql
stable
security invoker
set search_path=''
as $function$
  select exists (
    select 1
    from public.content_admin_account a
    where a.singleton=true
      and a.admin_user_id=p_user
  );
$function$;

revoke all on function public.is_content_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.is_content_admin(uuid)
  to service_role;

create or replace function public.get_active_reviewer_grants(p_reviewer uuid)
returns table (review_kind text)
language sql
security definer
stable
set search_path=''
as $function$
  select g.review_kind
  from public.content_reviewer_grants g
  join public.content_admin_account a
    on a.singleton=true
   and a.admin_user_id=g.reviewer_id
  where g.reviewer_id=p_reviewer
    and (g.expires_at is null or g.expires_at > pg_catalog.now())
  order by g.review_kind;
$function$;

revoke all on function public.get_active_reviewer_grants(uuid)
  from public, anon, authenticated;
grant execute on function public.get_active_reviewer_grants(uuid)
  to service_role;

create or replace function public.has_active_reviewer_grant(
  p_reviewer uuid,
  p_review_kind text
)
returns boolean
language sql
security definer
stable
set search_path=''
as $function$
  select exists (
    select 1
    from public.content_admin_account a
    join public.content_reviewer_grants g
      on g.reviewer_id=a.admin_user_id
    where a.singleton=true
      and a.admin_user_id=p_reviewer
      and g.review_kind=p_review_kind
      and (g.expires_at is null or g.expires_at > pg_catalog.now())
  );
$function$;

revoke all on function public.has_active_reviewer_grant(uuid,text)
  from public, anon, authenticated;
grant execute on function public.has_active_reviewer_grant(uuid,text)
  to service_role;

create or replace function public.content_admin_status_v1(p_user uuid)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
  select pg_catalog.jsonb_build_object(
    'contractId','content-admin-status-v1',
    'isAdmin',public.is_content_admin(p_user),
    'reviewKinds',coalesce((
      select pg_catalog.jsonb_agg(g.review_kind order by g.review_kind)
      from public.get_active_reviewer_grants(p_user) g
    ),'[]'::jsonb)
  );
$function$;

revoke all on function public.content_admin_status_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.content_admin_status_v1(uuid)
  to service_role;

create or replace function public.require_content_admin_transfer_validation()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  if not public.is_content_admin(new.validator_id) then
    raise exception using errcode='42501', message='content_admin_required';
  end if;
  return new;
end;
$function$;

revoke all on function public.require_content_admin_transfer_validation()
  from public, anon, authenticated, service_role;

drop trigger if exists study_transfer_pair_validations_admin_only
  on public.study_transfer_pair_validations;
create trigger study_transfer_pair_validations_admin_only
before insert on public.study_transfer_pair_validations
for each row execute function public.require_content_admin_transfer_validation();
