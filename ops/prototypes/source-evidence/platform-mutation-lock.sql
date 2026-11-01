-- Synthetic tables only. This coarse lock protocol is NOT a production Auth migration.
create function evidence_probe.platform_mutation_lock() returns trigger language plpgsql security invoker set search_path='' as $$begin
 perform pg_catalog.pg_advisory_xact_lock(730031);
 if TG_OP='DELETE' then return OLD;else return NEW;end if;
end;$$;
revoke all on function evidence_probe.platform_mutation_lock() from public,anon,authenticated,evidence_gateway;
create trigger platform_users_lock before insert or update or delete on auth.users for each row execute function evidence_probe.platform_mutation_lock();
create trigger platform_sessions_lock before insert or update or delete on auth.sessions for each row execute function evidence_probe.platform_mutation_lock();
create trigger platform_admin_lock before insert or update or delete on public.content_admin_account for each row execute function evidence_probe.platform_mutation_lock();
create trigger platform_feature_lock before insert or update or delete on evidence_probe.platform_feature for each row execute function evidence_probe.platform_mutation_lock();
