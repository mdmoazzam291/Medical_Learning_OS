-- Make owner learner-administration audit evidence append-only at the database layer.

create or replace function public.prevent_owner_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  raise exception 'owner_admin_audit_immutable';
end;
$function$;

drop trigger if exists owner_admin_audit_immutable_trigger on public.owner_admin_audit_events;
create trigger owner_admin_audit_immutable_trigger
before update or delete on public.owner_admin_audit_events
for each row execute function public.prevent_owner_admin_audit_mutation();

revoke all on function public.prevent_owner_admin_audit_mutation() from public, anon, authenticated;

comment on function public.prevent_owner_admin_audit_mutation()
is 'Rejects UPDATE/DELETE on owner learner-administration audit history.';
