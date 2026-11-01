-- DRAFT #371 / ADR-134: manually targeted disposable STAGING ONLY.
-- Target MUST be medical_learning_os_staging (vwtdwafjrraptrgeshzt);
-- never run against production or the inactive legacy project.
-- A single call is deliberately wrapped in BEGIN/ROLLBACK.
-- No provider Auth rows, real medical source, identities or reviewer grants.
-- This tests managed PostgreSQL behavior, NOT provider signout,
-- cross-transaction concurrency, qualified authorization or release safety.
BEGIN;
SET LOCAL statement_timeout='8s';
CREATE TEMP TABLE mlos_test_session_20261101 (
 reviewer uuid NOT NULL,
 session uuid NOT NULL,
 active boolean NOT NULL,
 PRIMARY KEY(reviewer,session)
) ON COMMIT DROP;
CREATE TEMP TABLE mlos_test_grant_20261101 (
 grant_id uuid PRIMARY KEY,
 reviewer uuid NOT NULL,
 active boolean NOT NULL
) ON COMMIT DROP;
CREATE TEMP TABLE mlos_test_receipt_20261101 (
 request_id uuid PRIMARY KEY,
 grant_id uuid NOT NULL,
 reviewer uuid NOT NULL,
 source_digest text NOT NULL CHECK(length(source_digest)=64),
 disposition text NOT NULL CHECK(disposition='retain-unresolved')
) ON COMMIT DROP;
INSERT INTO mlos_test_session_20261101 VALUES
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',true);
INSERT INTO mlos_test_grant_20261101 VALUES
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',true);
DO $mlos_test$
DECLARE a uuid:='11111111-1111-4111-8111-111111111111';
        s uuid:='22222222-2222-4222-8222-222222222222';
        g uuid:='33333333-3333-4333-8333-333333333333';
        q uuid:='44444444-4444-4444-8444-444444444444';
        n integer;
BEGIN
 PERFORM 1 FROM mlos_test_session_20261101
 WHERE reviewer=a AND session=s AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'synthetic_session_missing'; END IF;
 PERFORM 1 FROM mlos_test_grant_20261101
 WHERE grant_id=g AND reviewer=a AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'synthetic_grant_missing'; END IF;
 INSERT INTO mlos_test_receipt_20261101 VALUES(q,g,a,repeat('a',64),'retain-unresolved');
 INSERT INTO mlos_test_receipt_20261101 VALUES(q,g,a,repeat('a',64),'retain-unresolved')
 ON CONFLICT (request_id) DO NOTHING;
 SELECT count(*) INTO n FROM mlos_test_receipt_20261101 WHERE request_id=q;
 IF n<>1 THEN RAISE EXCEPTION 'synthetic_idempotency_failed'; END IF;
 IF EXISTS(SELECT 1 FROM mlos_test_grant_20261101
  WHERE grant_id=g AND reviewer='99999999-9999-4999-8999-999999999999' AND active)
 THEN RAISE EXCEPTION 'synthetic_foreign_grant_failed'; END IF;
 UPDATE mlos_test_session_20261101 SET active=false WHERE reviewer=a AND session=s;
 UPDATE mlos_test_grant_20261101 SET active=false WHERE grant_id=g;
 IF EXISTS(
  SELECT 1 FROM mlos_test_session_20261101 ss
  JOIN mlos_test_grant_20261101 gg ON ss.reviewer=gg.reviewer
  WHERE ss.reviewer=a AND ss.session=s AND ss.active AND gg.grant_id=g AND gg.active
 ) THEN RAISE EXCEPTION 'synthetic_revocation_failed'; END IF;
END $mlos_test$;
SELECT
 (SELECT count(*)::integer FROM mlos_test_receipt_20261101) AS synthetic_receipt_count,
 (SELECT bool_and(NOT active) FROM mlos_test_session_20261101) AS owned_session_revoked,
 (SELECT bool_and(NOT active) FROM mlos_test_grant_20261101) AS owned_grant_revoked,
 (SELECT count(*)::integer FROM mlos_test_receipt_20261101
  WHERE reviewer='99999999-9999-4999-8999-999999999999') AS foreign_review_receipts,
 (to_regclass('auth.sessions') IS NOT NULL) AS provider_sessions_present;
ROLLBACK;
