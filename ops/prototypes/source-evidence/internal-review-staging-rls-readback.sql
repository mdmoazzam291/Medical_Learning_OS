-- ADR-134 / PR #372. EXECUTE ONLY against staging vwtdwafjrraptrgeshzt.
-- ISOLATED SQL-EDITOR ROLE/CLAIM SIMULATION, NOT signed GoTrue authentication.
-- Entire test is a single PostgreSQL BEGIN/ROLLBACK; no persistent DDL.
BEGIN;
SET LOCAL statement_timeout='8s';
CREATE TEMP TABLE mlos_staging_rls_sessions (
 reviewer_id uuid not null, session_id uuid not null, active boolean not null,
 primary key(reviewer_id,session_id)
) ON COMMIT DROP;
CREATE TEMP TABLE mlos_staging_rls_grants (
 reviewer_id uuid not null, grant_id uuid primary key, active boolean not null
) ON COMMIT DROP;
CREATE TEMP TABLE mlos_staging_rls_receipts (
 request_id uuid primary key, reviewer_id uuid not null,
 session_id uuid not null, grant_id uuid not null,
 source_digest text not null check(length(source_digest)=64),
 disposition text not null check(disposition='retain-unresolved')
) ON COMMIT DROP;
INSERT INTO mlos_staging_rls_sessions VALUES
 ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',true),
 ('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888',true);
INSERT INTO mlos_staging_rls_grants VALUES
 ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',true),
 ('99999999-9999-4999-8999-999999999999','77777777-7777-4777-8777-777777777777',true);
INSERT INTO mlos_staging_rls_receipts VALUES
 ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',repeat('a',64),'retain-unresolved'),
 ('66666666-6666-4666-8666-666666666666','99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777',repeat('b',64),'retain-unresolved');
ALTER TABLE mlos_staging_rls_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlos_staging_rls_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlos_staging_rls_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY mlos_session_reader ON mlos_staging_rls_sessions
 FOR SELECT TO authenticated USING (reviewer_id=(select auth.uid()));
CREATE POLICY mlos_grant_reader ON mlos_staging_rls_grants
 FOR SELECT TO authenticated USING (reviewer_id=(select auth.uid()));
CREATE POLICY mlos_receipt_reader ON mlos_staging_rls_receipts
 FOR SELECT TO authenticated USING (
 reviewer_id=(select auth.uid())
 AND EXISTS (SELECT 1 FROM mlos_staging_rls_sessions s
  WHERE s.reviewer_id=mlos_staging_rls_receipts.reviewer_id
   AND s.session_id=mlos_staging_rls_receipts.session_id AND s.active)
 AND EXISTS (SELECT 1 FROM mlos_staging_rls_grants g
  WHERE g.reviewer_id=mlos_staging_rls_receipts.reviewer_id
   AND g.grant_id=mlos_staging_rls_receipts.grant_id AND g.active)
 AND (auth.jwt()->>'session_id')::uuid=session_id
);
GRANT SELECT ON mlos_staging_rls_sessions,mlos_staging_rls_grants,mlos_staging_rls_receipts TO authenticated;
DO $test_acl$ BEGIN
 IF has_table_privilege('anon','mlos_staging_rls_receipts','SELECT') OR
    has_table_privilege('authenticated','mlos_staging_rls_receipts','UPDATE') OR
    has_table_privilege('authenticated','mlos_staging_rls_receipts','INSERT') OR
    has_table_privilege('authenticated','mlos_staging_rls_receipts','DELETE')
 THEN RAISE EXCEPTION 'synthetic_acl_excess'; END IF;
END $test_acl$;
SET LOCAL ROLE authenticated;
DO $test_no_claims$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM mlos_staging_rls_receipts;
 IF n<>0 THEN RAISE EXCEPTION 'synthetic_no_claims_leak'; END IF;
END $test_no_claims$;
RESET ROLE;
SELECT pg_catalog.set_config('request.jwt.claims',
 '{"sub":"11111111-1111-4111-8111-111111111111","session_id":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test_a$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM mlos_staging_rls_receipts;
 IF n<>1 THEN RAISE EXCEPTION 'synthetic_a_scope_failed:%',n; END IF;
END $test_a$;
RESET ROLE;
SELECT pg_catalog.set_config('request.jwt.claims',
 '{"sub":"11111111-1111-4111-8111-111111111111","session_id":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test_wrong_session$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM mlos_staging_rls_receipts;
 IF n<>0 THEN RAISE EXCEPTION 'synthetic_wrong_session_visible'; END IF;
END $test_wrong_session$;
RESET ROLE;
SELECT pg_catalog.set_config('request.jwt.claims',
 '{"sub":"99999999-9999-4999-8999-999999999999","session_id":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test_b$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM mlos_staging_rls_receipts;
 IF n<>1 THEN RAISE EXCEPTION 'synthetic_b_scope_failed:%',n; END IF;
END $test_b$;
RESET ROLE;
UPDATE mlos_staging_rls_sessions SET active=false
 WHERE reviewer_id='11111111-1111-4111-8111-111111111111';
SELECT pg_catalog.set_config('request.jwt.claims',
 '{"sub":"11111111-1111-4111-8111-111111111111","session_id":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test_revoke_session$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM mlos_staging_rls_receipts;
 IF n<>0 THEN RAISE EXCEPTION 'synthetic_revoked_session_visible'; END IF;
END $test_revoke_session$;
RESET ROLE;
UPDATE mlos_staging_rls_grants SET active=false
 WHERE reviewer_id='99999999-9999-4999-8999-999999999999';
SELECT pg_catalog.set_config('request.jwt.claims',
 '{"sub":"99999999-9999-4999-8999-999999999999","session_id":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test_revoke_grant$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM mlos_staging_rls_receipts;
 IF n<>0 THEN RAISE EXCEPTION 'synthetic_revoked_grant_visible'; END IF;
END $test_revoke_grant$;
RESET ROLE;
SELECT 'synthetic staging RLS test passed' as result,
 (SELECT count(*)::integer FROM mlos_staging_rls_receipts) as synthetic_receipts,
 (SELECT count(*)::integer FROM mlos_staging_rls_sessions WHERE active) as active_synthetic_sessions,
 (SELECT count(*)::integer FROM mlos_staging_rls_grants WHERE active) as active_synthetic_grants,
 has_table_privilege('authenticated','mlos_staging_rls_receipts','SELECT') as authenticated_select_only,
 has_table_privilege('authenticated','mlos_staging_rls_receipts','UPDATE') as authenticated_update_forbidden;
ROLLBACK;
