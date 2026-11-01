-- SOURCE REVIEW MANAGED-AUTH CAPABILITY INVENTORY (READ-ONLY).
-- Run only with an authorized administrator in a designated environment.
-- Do not grant roles, lock provider-owned rows, SELECT auth data, or migrate.
-- This query reports role PRIVILEGES, not live-session validity.
select
  current_setting('server_version') as postgres_version,
  (to_regclass('auth.sessions') is not null) as auth_sessions_present,
  has_schema_privilege('authenticated','auth','USAGE') as authenticated_auth_schema_usage,
  has_table_privilege('authenticated','auth.sessions','SELECT') as authenticated_sessions_select,
  has_table_privilege('authenticated','auth.sessions','UPDATE') as authenticated_sessions_update,
  has_schema_privilege('service_role','auth','USAGE') as service_role_auth_schema_usage,
  has_table_privilege('service_role','auth.sessions','SELECT') as service_role_sessions_select,
  has_table_privilege('service_role','auth.sessions','UPDATE') as service_role_sessions_update;
