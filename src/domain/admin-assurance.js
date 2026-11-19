// Admin two-factor (MFA) assurance policy.
//
// Shared by the browser admin console and every edge function that grants
// content-admin authority. Pure: no provider SDK, no I/O.
//
// Rule (ADR-141):
// - An admin with at least one verified TOTP factor must present an aal2 token.
// - An admin with no verified factor is allowed (rollout safety: the owner must
//   be able to sign in to enrol) unless strict mode is on, which servers enable
//   with MLOS_ADMIN_MFA_STRICT=true once every admin has enrolled.

function base64UrlDecode(segment) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded); // Browser, Deno and Node >= 16 all provide atob.
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

// Reads the authenticator assurance level from a JWT the caller has ALREADY
// verified (server: auth.getUser(token); browser: token issued to this session).
// Never use this as the verification step itself.
export function tokenAssuranceLevel(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(parts[1]));
    return claims?.aal === 'aal2' ? 'aal2' : claims?.aal === 'aal1' ? 'aal1' : null;
  } catch {
    return null;
  }
}

export function verifiedTotpFactors(factors) {
  return (Array.isArray(factors) ? factors : []).filter(factor =>
    factor && typeof factor.id === 'string' &&
    factor.status === 'verified' &&
    (factor.factor_type ?? factor.factorType ?? 'totp') === 'totp');
}

export function adminAssuranceDecision({ aal, factors, strict = false }) {
  const verified = verifiedTotpFactors(factors).length;
  if (verified > 0 && aal !== 'aal2') {
    return { allowed: false, code: 'admin_mfa_required', status: 403, verifiedFactors: verified, aal: aal || null };
  }
  if (verified === 0 && strict === true) {
    return { allowed: false, code: 'admin_mfa_enrollment_required', status: 403, verifiedFactors: 0, aal: aal || null };
  }
  return { allowed: true, code: null, status: 200, verifiedFactors: verified, aal: aal || null, enrollmentRecommended: verified === 0 };
}

// Server helper: `user` is the object returned by auth.getUser(token) for the
// same token, so its `factors` and the token's `aal` claim describe one session.
export function adminAssuranceForToken({ token, user, strict = false }) {
  return adminAssuranceDecision({ aal: tokenAssuranceLevel(token), factors: user?.factors, strict });
}

export function strictModeFromEnv(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}
